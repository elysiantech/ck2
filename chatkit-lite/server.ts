/**
 * ChatKit Lite - Minimal server for hosted workflows
 *
 * ~500 lines vs ~2400 in the full version.
 * Supports: threads, hosted workflows, compaction, workflow persistence.
 */

import OpenAI from 'openai';
import type { Store } from './store';
import type {
  ThreadMetadata,
  ThreadItem,
  ThreadStreamEvent,
  UserMessageItem,
  WorkflowItem,
  WorkflowInputItem,
  WorkflowEvent,
  WorkflowTask,
  CompactionItem,
} from './types';

const COMPACTION_TOKEN_THRESHOLD = 80000;
const MAX_ITEMS = 1000; // Increased from 100

export class HostedWorkflowServer {
  constructor(
    private store: Store,
    private workflowId: string
  ) {}

  /**
   * Main entry point - process a ChatKit protocol request
   */
  async *process(
    request: { type: string; params?: Record<string, unknown> },
    abortSignal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent> {
    switch (request.type) {
      case 'threads.create': {
        const thread: ThreadMetadata = {
          id: this.store.generateThreadId(),
          created_at: new Date(),
          status: 'active',
          metadata: {},
        };
        await this.store.saveThread(thread);

        yield {
          type: 'thread.created',
          thread: { ...thread, status: { type: 'active' } as any, items: { data: [], has_more: false, after: null } },
        };

        const userMessage = this.buildUserMessage(
          request.params?.input as { content?: unknown[] },
          thread.id
        );
        await this.store.addThreadItem(thread.id, userMessage);
        yield { type: 'thread.item.done', item: userMessage };

        yield { type: 'stream_options', stream_options: { allow_cancel: true } };
        yield* this.runWorkflow(thread, userMessage, abortSignal);
        break;
      }

      case 'threads.add_user_message': {
        const thread = await this.store.loadThread(request.params?.thread_id as string);
        if (!thread) throw new Error('Thread not found');

        const userMessage = this.buildUserMessage(
          request.params?.input as { content?: unknown[] },
          thread.id
        );
        await this.store.addThreadItem(thread.id, userMessage);
        yield { type: 'thread.item.done', item: userMessage };

        yield { type: 'stream_options', stream_options: { allow_cancel: true } };
        yield* this.runWorkflow(thread, userMessage, abortSignal);
        break;
      }

      case 'threads.add_client_tool_output': {
        const thread = await this.store.loadThread(request.params?.thread_id as string);
        if (!thread) throw new Error('Thread not found');

        const callId = request.params?.call_id as string;
        const items = await this.store.loadThreadItems(thread.id, null, MAX_ITEMS, 'desc');
        const pendingTool = items.data.find(
          (i) => i.type === 'client_tool_call' && (i as any).status === 'pending' &&
            (!callId || (i as any).call_id === callId)
        );

        if (!pendingTool) {
          // Emit error instead of silent no-op
          yield {
            type: 'error',
            error: { message: 'No pending tool call found', code: 'no_pending_tool' },
          };
          break;
        }

        if (!this.store.completeToolCall) {
          yield {
            type: 'error',
            error: { message: 'Store does not support tool completion', code: 'not_implemented' },
          };
          break;
        }

        const completed = await this.store.completeToolCall(
          thread.id,
          pendingTool.id,
          request.params?.result
        );

        if (!completed) {
          yield {
            type: 'error',
            error: { message: 'Tool call already completed', code: 'already_completed' },
          };
          break;
        }

        yield { type: 'stream_options', stream_options: { allow_cancel: true } };
        yield* this.runWorkflow(thread, null, abortSignal);
        break;
      }
    }
  }

  /**
   * Run workflow and stream events
   */
  private async *runWorkflow(
    thread: ThreadMetadata,
    input: UserMessageItem | null,
    abortSignal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent> {
    const messageId = `msg_${Date.now()}`;
    const now = new Date();
    let items = await this.store.loadThreadItems(thread.id, null, MAX_ITEMS, 'asc');

    // Check for compaction
    const storedResponseId = thread.metadata?.last_response_id as string | undefined;
    if (storedResponseId && this.shouldCompact(thread, items.data)) {
      yield { type: 'progress_update', text: 'Compacting conversation...' };
      const compacted = await this.triggerCompaction(thread.id, storedResponseId);
      if (compacted) {
        items = await this.store.loadThreadItems(thread.id, null, MAX_ITEMS, 'asc');
        thread.metadata = { ...thread.metadata, last_response_id: undefined, last_input_tokens: 0 };
        await this.store.saveThread(thread);
      }
    }

    // Check for tool continuation
    const completedTool = [...items.data].reverse().find(
      (i) => i.type === 'client_tool_call' && (i as any).status === 'completed'
    );

    if (!input && completedTool) {
      yield* this.handleContinuation(thread, items.data, messageId, now, abortSignal);
      return;
    }

    if (!input) return;

    // Build conversation history
    const history = this.buildHistory(items.data);
    const userContent = (input.content || []).map((c) => {
      if (c.type === 'input_text' || c.type === 'text') {
        return { type: 'input_text', text: (c as any).text || '' };
      }
      return c;
    });
    const messages: WorkflowInputItem[] = [
      ...history,
      { type: 'message', role: 'user', content: userContent as any },
    ];

    // Track state
    let fullText = '';
    let messageStarted = false;
    let currentWorkflow: WorkflowItem | null = null;
    let pendingToolCall: { name: string; arguments: Record<string, unknown>; call_id: string; responseId?: string } | null = null;
    let lastResponseId: string | null = null;

    try {
      for await (const event of this.callWorkflow(messages, abortSignal)) {
        if (event.type === 'workflow_started') {
          currentWorkflow = {
            type: 'workflow',
            id: event.id,
            thread_id: thread.id,
            created_at: new Date().toISOString(),
            workflow: { type: 'reasoning', tasks: [], expanded: true, summary: null },
          };
          yield { type: 'thread.item.added', item: currentWorkflow };

        } else if (event.type === 'workflow_task_added' && currentWorkflow) {
          currentWorkflow.workflow.tasks.push(event.task);
          yield {
            type: 'thread.item.updated',
            item_id: currentWorkflow.id,
            update: { type: 'workflow.task.added', task_index: event.task_index, task: event.task },
          };

        } else if (event.type === 'workflow_task_updated' && currentWorkflow) {
          currentWorkflow.workflow.tasks[event.task_index] = event.task;
          yield {
            type: 'thread.item.updated',
            item_id: currentWorkflow.id,
            update: { type: 'workflow.task.updated', task_index: event.task_index, task: event.task },
          };

        } else if (event.type === 'workflow_done' && currentWorkflow) {
          if (event.response_id) lastResponseId = event.response_id;
          if (event.input_tokens) {
            thread.metadata = { ...thread.metadata, last_input_tokens: event.input_tokens };
          }
          currentWorkflow.workflow.expanded = false;
          // Persist workflow item
          await this.store.addThreadItem(thread.id, currentWorkflow);
          yield { type: 'thread.item.done', item: currentWorkflow };
          currentWorkflow = null;
          yield { type: 'progress_update', text: '' };

        } else if (event.type === 'text_delta') {
          if (!messageStarted) {
            yield* this.emitMessageStart(messageId, thread.id, now);
            messageStarted = true;
          }
          fullText += event.delta;
          yield this.emitTextDelta(messageId, event.delta);

        } else if (event.type === 'tool_call') {
          pendingToolCall = event;
          break;
        }
      }
    } catch (err) {
      if (!messageStarted) {
        yield* this.emitMessageStart(messageId, thread.id, now);
        messageStarted = true;
      }
      fullText = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }

    // Handle tool call
    if (pendingToolCall) {
      if (messageStarted && fullText) {
        yield* this.emitMessageEnd(messageId, thread.id, fullText, now);
        await this.store.addThreadItem(thread.id, {
          type: 'assistant_message',
          id: messageId,
          thread_id: thread.id,
          content: [{ type: 'output_text', text: fullText, annotations: [] }],
          created_at: now,
        });
      }

      const toolItem = {
        id: `tool_${Date.now()}`,
        thread_id: thread.id,
        type: 'client_tool_call' as const,
        status: 'pending' as const,
        call_id: pendingToolCall.call_id,
        name: pendingToolCall.name,
        arguments: pendingToolCall.arguments,
        created_at: new Date().toISOString(),
        response_id: pendingToolCall.responseId,
      };
      await this.store.addThreadItem(thread.id, toolItem as any);
      yield { type: 'thread.item.done', item: toolItem as any };
      return;
    }

    // Finalize message
    if (messageStarted) {
      yield* this.emitMessageEnd(messageId, thread.id, fullText, now);
      await this.store.addThreadItem(thread.id, {
        type: 'assistant_message',
        id: messageId,
        thread_id: thread.id,
        content: [{ type: 'output_text', text: fullText, annotations: [] }],
        created_at: now,
      });
    }

    // Save response_id for compaction
    if (lastResponseId) {
      thread.metadata = { ...thread.metadata, last_response_id: lastResponseId };
      await this.store.saveThread(thread);
    }
  }

  /**
   * Handle continuation after tool call
   */
  private async *handleContinuation(
    thread: ThreadMetadata,
    items: ThreadItem[],
    messageId: string,
    now: Date,
    abortSignal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent> {
    const history = this.buildHistory(items);
    let fullText = '';
    let messageStarted = false;
    let currentWorkflow: WorkflowItem | null = null;
    let pendingToolCall: { name: string; arguments: Record<string, unknown>; call_id: string; responseId?: string } | null = null;
    let lastResponseId: string | null = null;

    try {
      for await (const event of this.callWorkflow(history, abortSignal)) {
        // Handle workflow events in continuation too
        if (event.type === 'workflow_started') {
          currentWorkflow = {
            type: 'workflow',
            id: event.id,
            thread_id: thread.id,
            created_at: new Date().toISOString(),
            workflow: { type: 'reasoning', tasks: [], expanded: true, summary: null },
          };
          yield { type: 'thread.item.added', item: currentWorkflow };

        } else if (event.type === 'workflow_task_added' && currentWorkflow) {
          currentWorkflow.workflow.tasks.push(event.task);
          yield {
            type: 'thread.item.updated',
            item_id: currentWorkflow.id,
            update: { type: 'workflow.task.added', task_index: event.task_index, task: event.task },
          };

        } else if (event.type === 'workflow_task_updated' && currentWorkflow) {
          currentWorkflow.workflow.tasks[event.task_index] = event.task;
          yield {
            type: 'thread.item.updated',
            item_id: currentWorkflow.id,
            update: { type: 'workflow.task.updated', task_index: event.task_index, task: event.task },
          };

        } else if (event.type === 'workflow_done') {
          if (event.response_id) lastResponseId = event.response_id;
          if (currentWorkflow) {
            currentWorkflow.workflow.expanded = false;
            await this.store.addThreadItem(thread.id, currentWorkflow);
            yield { type: 'thread.item.done', item: currentWorkflow };
            currentWorkflow = null;
          }
          yield { type: 'progress_update', text: '' };

        } else if (event.type === 'text_delta') {
          if (!messageStarted) {
            yield* this.emitMessageStart(messageId, thread.id, now);
            messageStarted = true;
          }
          fullText += event.delta;
          yield this.emitTextDelta(messageId, event.delta);

        } else if (event.type === 'tool_call') {
          pendingToolCall = event;
          break;
        }
      }
    } catch (err) {
      if (!messageStarted) {
        yield* this.emitMessageStart(messageId, thread.id, now);
        messageStarted = true;
      }
      fullText = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (pendingToolCall) {
      if (messageStarted && fullText) {
        yield* this.emitMessageEnd(messageId, thread.id, fullText, now);
        await this.store.addThreadItem(thread.id, {
          type: 'assistant_message',
          id: messageId,
          thread_id: thread.id,
          content: [{ type: 'output_text', text: fullText, annotations: [] }],
          created_at: now,
        });
      }

      const toolItem = {
        id: `tool_${Date.now()}`,
        thread_id: thread.id,
        type: 'client_tool_call' as const,
        status: 'pending' as const,
        call_id: pendingToolCall.call_id,
        name: pendingToolCall.name,
        arguments: pendingToolCall.arguments,
        created_at: new Date().toISOString(),
        response_id: pendingToolCall.responseId,
      };
      await this.store.addThreadItem(thread.id, toolItem as any);
      yield { type: 'thread.item.done', item: toolItem as any };
      return;
    }

    if (messageStarted) {
      yield* this.emitMessageEnd(messageId, thread.id, fullText, now);
      await this.store.addThreadItem(thread.id, {
        type: 'assistant_message',
        id: messageId,
        thread_id: thread.id,
        content: [{ type: 'output_text', text: fullText, annotations: [] }],
        created_at: now,
      });
    }

    if (lastResponseId) {
      thread.metadata = { ...thread.metadata, last_response_id: lastResponseId };
      await this.store.saveThread(thread);
    }
  }

  /**
   * Call OpenAI Workflows API
   */
  private async *callWorkflow(
    input: WorkflowInputItem[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<WorkflowEvent> {
    const response = await fetch(
      `https://api.openai.com/v1/workflows/${this.workflowId}/run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input_data: { input },
          state_values: [],
          session: true,
          tracing: { enabled: true },
          stream: true,
        }),
        signal: abortSignal,
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Workflow API error: ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let currentWorkflowId: string | null = null;
    const tasks: WorkflowTask[] = [];

    try {
      while (true) {
        if (abortSignal?.aborted) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);
            yield* this.parseWorkflowEvent(event, currentWorkflowId, tasks, (id) => {
              currentWorkflowId = id;
            });
          } catch {
            // Skip malformed events
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse SSE events from workflow
   */
  private *parseWorkflowEvent(
    event: any,
    currentWorkflowId: string | null,
    tasks: WorkflowTask[],
    setWorkflowId: (id: string) => void
  ): Generator<WorkflowEvent> {
    const eventType = event.type;

    if (eventType === 'response.output_text.delta') {
      yield { type: 'text_delta', delta: event.delta || '' };

    } else if (eventType === 'response.reasoning_summary_part.added') {
      const id = `wf_${Date.now()}`;
      setWorkflowId(id);
      yield { type: 'workflow_started', id, created_at: Date.now() };

    } else if (eventType === 'response.reasoning_summary_text.delta' && currentWorkflowId) {
      const text = event.delta || '';
      if (tasks.length === 0) {
        tasks.push({ type: 'thought', content: text });
        yield { type: 'workflow_task_added', task_index: 0, task: tasks[0] };
      } else {
        const last = tasks[tasks.length - 1];
        last.content = (last.content || '') + text;
        yield { type: 'workflow_task_updated', task_index: tasks.length - 1, task: last };
      }

    } else if (eventType === 'response.reasoning_summary_part.done' && currentWorkflowId) {
      yield {
        type: 'workflow_done',
        id: currentWorkflowId,
        tasks: [...tasks],
        response_id: event.response_id,
        input_tokens: event.usage?.input_tokens,
      };
      tasks.length = 0;

    } else if (eventType === 'response.output_item.done' && event.item?.type === 'function_call') {
      const fn = event.item;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(fn.arguments || '{}');
      } catch {
        args = {};
      }
      yield {
        type: 'tool_call',
        name: fn.name,
        arguments: args,
        call_id: fn.call_id,
        responseId: event.response_id,
      };

    } else if (eventType === 'response.completed') {
      // Emit workflow_done if we have an active workflow
      if (currentWorkflowId && tasks.length > 0) {
        yield {
          type: 'workflow_done',
          id: currentWorkflowId,
          tasks: [...tasks],
          response_id: event.response?.id,
          input_tokens: event.response?.usage?.input_tokens,
        };
        tasks.length = 0;
      }
    }
  }

  /**
   * Build conversation history for workflow
   * Skips items before compaction marker
   */
  private buildHistory(items: ThreadItem[]): WorkflowInputItem[] {
    const history: WorkflowInputItem[] = [];
    let skipUntilCompaction = items.some((i) => i.type === 'compaction');

    for (const item of items) {
      // Found compaction - include it and start including items after
      if (item.type === 'compaction') {
        skipUntilCompaction = false;
        history.push({ type: 'compaction', encrypted_content: (item as CompactionItem).encrypted_content });
        continue;
      }

      // Skip items before compaction
      if (skipUntilCompaction) continue;

      // Skip workflow items (not part of conversation history)
      if (item.type === 'workflow') continue;

      if (item.type === 'user_message') {
        const content = ((item as UserMessageItem).content || []).map((c) => {
          if (c.type === 'input_text' || c.type === 'text') {
            return { type: 'input_text', text: (c as any).text || '' };
          }
          return c;
        });
        history.push({ type: 'message', role: 'user', content: content as any });

      } else if (item.type === 'assistant_message') {
        const content = ((item as any).content || []).map((c: any) => ({
          type: 'output_text',
          text: c.text || '',
        }));
        history.push({ type: 'message', role: 'assistant', content });

      } else if (item.type === 'client_tool_call') {
        const toolCall = item as any;
        history.push({
          type: 'function_call',
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.arguments || {}),
          call_id: toolCall.call_id,
        });
        if (toolCall.status === 'completed' && toolCall.output !== undefined) {
          history.push({
            type: 'function_call_output',
            call_id: toolCall.call_id,
            output: JSON.stringify(toolCall.output),
          });
        }
      }
    }

    return history;
  }

  /**
   * Build user message item
   */
  private buildUserMessage(
    input: { content?: unknown[] } | undefined,
    threadId: string
  ): UserMessageItem {
    return {
      type: 'user_message',
      id: this.store.generateItemId('message'),
      thread_id: threadId,
      content: (input?.content || []) as any,
      attachments: [],
      quoted_text: null,
      inference_options: {},
      created_at: new Date(),
    };
  }

  // Message emission helpers
  private *emitMessageStart(id: string, threadId: string, now: Date): Generator<ThreadStreamEvent> {
    yield {
      type: 'thread.item.added',
      item: { id, thread_id: threadId, type: 'assistant_message', content: [], created_at: now } as any,
    };
    yield {
      type: 'thread.item.updated',
      item_id: id,
      update: { type: 'assistant_message.content_part.added', content_index: 0, content: { type: 'output_text', text: '', annotations: [] } },
    };
  }

  private emitTextDelta(id: string, delta: string): ThreadStreamEvent {
    return {
      type: 'thread.item.updated',
      item_id: id,
      update: { type: 'assistant_message.content_part.text_delta', content_index: 0, delta },
    };
  }

  private *emitMessageEnd(id: string, threadId: string, text: string, now: Date): Generator<ThreadStreamEvent> {
    yield {
      type: 'thread.item.updated',
      item_id: id,
      update: { type: 'assistant_message.content_part.done', content_index: 0, content: { type: 'output_text', text, annotations: [] } },
    };
    yield {
      type: 'thread.item.done',
      item: { id, thread_id: threadId, type: 'assistant_message', content: [{ type: 'output_text', text, annotations: [] }], created_at: now } as any,
    };
  }

  // Compaction
  private shouldCompact(thread: ThreadMetadata, items: ThreadItem[]): boolean {
    const lastTokens = thread.metadata?.last_input_tokens as number | undefined;
    if (lastTokens && lastTokens > COMPACTION_TOKEN_THRESHOLD) return true;
    const hasCompaction = items.some((i) => i.type === 'compaction');
    return !hasCompaction && items.length > 50;
  }

  private async triggerCompaction(threadId: string, responseId: string): Promise<boolean> {
    try {
      const client = new OpenAI();
      const result = await client.responses.compact({
        previous_response_id: responseId,
        model: 'gpt-4.1',
      });

      const compactionOutput = result.output?.find((item: any) => item.type === 'compaction') as
        | { encrypted_content?: string }
        | undefined;

      if (compactionOutput?.encrypted_content) {
        const compactionItem: CompactionItem = {
          type: 'compaction',
          id: `compact_${Date.now()}`,
          thread_id: threadId,
          created_at: new Date(),
          encrypted_content: compactionOutput.encrypted_content,
        };
        await this.store.addThreadItem(threadId, compactionItem);
        return true;
      }
    } catch (err) {
      console.error('[ChatKit Lite] Compaction failed:', err);
    }
    return false;
  }
}
