import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatKitAPI, createChatKitAPI } from '../api/chatkit';
import type {
  ThreadMetadata,
  ThreadItem,
  Attachment,
  ThreadStreamEvent,
  ChatKitOptions,
  AssistantMessageItem,
  WidgetItem,
  WidgetNode,
  WorkflowItem,
  InferenceOptions,
  ContentPart,
  SkillMetadata,
  ClientEffectEvent,
  Entity,
  InputTagContent,
} from '../types/chatkit';

// ============================================================================
// State Types
// ============================================================================

export interface ChatKitState {
  threads: ThreadMetadata[];
  currentThread: ThreadMetadata | null;
  items: ThreadItem[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  progressText: string | null;
}

export interface ChatKitControl {
  state: ChatKitState;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  selectThread: (threadId: string | null) => Promise<void>;
  createThread: () => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  refreshThreads: () => Promise<void>;
  uploadAttachment: (file: File) => Promise<Attachment>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  listSkills: (workflowId?: string) => Promise<SkillMetadata[]>;
  retryAfterItem: (itemId: string) => Promise<void>;
  sendFeedback: (itemIds: string[], kind: 'positive' | 'negative') => Promise<void>;
  sendCustomAction: (itemId: string, action: { type: string; payload?: unknown }) => Promise<void>;
  addClientToolOutput: (callId: string, result: unknown) => Promise<void>;
  stopStreaming: () => void;
  clearError: () => void;
}

export interface SendMessageOptions {
  attachments?: Attachment[];
  additionalContent?: string[];  // Additional input_text items (e.g., pasted text)
  quotedText?: string;
  inferenceOptions?: InferenceOptions;
  context?: Record<string, unknown>;
  entities?: Map<string, Entity>;  // Tracked entities to convert to input_tag
}

// ============================================================================
// useChatKit Hook
// ============================================================================

export function useChatKit(options: ChatKitOptions): { control: ChatKitControl } {
  const apiRef = useRef<ChatKitAPI | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize API
  if (!apiRef.current) {
    apiRef.current = createChatKitAPI(options.api);
  }

  const [state, setState] = useState<ChatKitState>({
    threads: [],
    currentThread: null,
    items: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    progressText: null,
  });

  // --------------------------------------------------------------------------
  // Thread Management
  // --------------------------------------------------------------------------

  const refreshThreads = useCallback(async () => {
    if (!apiRef.current) return;

    try {
      const page = await apiRef.current.listThreads({ limit: 50, order: 'desc' });
      setState((prev) => ({ ...prev, threads: page.data }));
    } catch (e) {
      console.error('Failed to refresh threads:', e);
    }
  }, []);

  const selectThread = useCallback(async (threadId: string | null) => {
    if (!apiRef.current) return;

    if (!threadId) {
      setState((prev) => ({
        ...prev,
        currentThread: null,
        items: [],
      }));
      // Call onThreadChange callback
      options.onThreadChange?.({ threadId: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // getThread returns { id, created_at, status, items: { data: [...] } }
      const result = await apiRef.current.getThread(threadId);

      // Items are nested in { data: [...] }
      const items = result.items?.data || [];

      setState((prev) => {
        // Get title from threads list (get_by_id doesn't return title)
        const existingThread = prev.threads.find((t) => t.id === threadId);

        // Extract thread metadata and items from response
        const thread: ThreadMetadata = {
          id: result.id,
          title: existingThread?.title || result.title || 'Untitled',
          status: result.status?.type || 'active',
          created_at: result.created_at,
          updated_at: result.updated_at || result.created_at,
        };

        return {
          ...prev,
          currentThread: thread,
          items,
          isLoading: false,
        };
      });

      // Call onThreadChange callback
      options.onThreadChange?.({ threadId });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load thread',
      }));
      options.onError?.({ error: e instanceof Error ? e : new Error('Failed to load thread') });
    }
  }, [options.onThreadChange, options.onError]);

  const createThread = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      currentThread: null,
      items: [],
    }));
    // Call onThreadChange callback (null = new thread)
    options.onThreadChange?.({ threadId: null });
  }, [options.onThreadChange]);

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!apiRef.current) return;

      try {
        await apiRef.current.deleteThread(threadId);
        const wasCurrentThread = state.currentThread?.id === threadId;
        setState((prev) => ({
          ...prev,
          threads: prev.threads.filter((t) => t.id !== threadId),
          currentThread: prev.currentThread?.id === threadId ? null : prev.currentThread,
          items: prev.currentThread?.id === threadId ? [] : prev.items,
        }));

        // Call onThreadChange if deleted thread was current
        if (wasCurrentThread) {
          options.onThreadChange?.({ threadId: null });
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Failed to delete thread');
        setState((prev) => ({
          ...prev,
          error: error.message,
        }));
        options.onError?.({ error });
      }
    },
    [state.currentThread?.id, options.onThreadChange, options.onError]
  );

  const renameThread = useCallback(async (threadId: string, title: string) => {
    if (!apiRef.current) return;

    try {
      await apiRef.current.updateThread(threadId, { title });
      setState((prev) => ({
        ...prev,
        threads: prev.threads.map((t) => (t.id === threadId ? { ...t, title } : t)),
        currentThread:
          prev.currentThread?.id === threadId
            ? { ...prev.currentThread, title }
            : prev.currentThread,
      }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to rename thread');
      setState((prev) => ({
        ...prev,
        error: error.message,
      }));
      options.onError?.({ error });
    }
  }, [options.onError]);

  // --------------------------------------------------------------------------
  // Message Handling
  // --------------------------------------------------------------------------

  const processStreamEvent = useCallback(
    (event: ThreadStreamEvent) => {
      setState((prev) => {
        switch (event.type) {
          case 'thread.created': {
            const thread = {
              ...event.thread,
              updated_at: event.thread.updated_at || event.thread.created_at,
            };
            return {
              ...prev,
              currentThread: thread,
              threads: [thread, ...prev.threads.filter((t) => t.id !== thread.id)],
            };
          }

          case 'thread.updated':
            return {
              ...prev,
              currentThread:
                prev.currentThread?.id === event.thread.id ? event.thread : prev.currentThread,
              threads: prev.threads.map((t) => (t.id === event.thread.id ? event.thread : t)),
            };

          case 'thread.item.created':
          case 'thread.item.added':
            if (!event.item) return prev;
            return {
              ...prev,
              items: [...prev.items.filter((i) => i.id !== event.item.id), event.item],
            };

          case 'thread.item.updated': {
            // Handle new format: { item_id, update: { type, delta, ... } }
            if (event.item_id && event.update) {
              const itemIndex = prev.items.findIndex((i) => i.id === event.item_id);
              if (itemIndex === -1) {
                return prev;
              }

              const item = prev.items[itemIndex];
              const update = event.update;

              // Handle assistant_message updates
              if (item.type === 'assistant_message') {
                let updatedItem = item;

                if (update.type === 'assistant_message.content_part.added') {
                  // Initialize content part
                  updatedItem = {
                    ...item,
                    content: [...item.content, update.content],
                  } as AssistantMessageItem;
                } else if (update.type === 'assistant_message.content_part.text_delta') {
                  // Append text delta
                  const contentIdx = update.content_index ?? 0;
                  updatedItem = {
                    ...item,
                    content: item.content.map((c, idx) =>
                      idx === contentIdx && c.type === 'output_text'
                        ? { ...c, text: (c.text || '') + update.delta }
                        : c
                    ),
                  } as AssistantMessageItem;
                } else if (update.type === 'assistant_message.content_part.done') {
                  // Finalize content part
                  const contentIdx = update.content_index ?? 0;
                  updatedItem = {
                    ...item,
                    content: item.content.map((c, idx) =>
                      idx === contentIdx ? update.content : c
                    ),
                  } as AssistantMessageItem;
                }

                const newItems = [...prev.items];
                newItems[itemIndex] = updatedItem;
                return { ...prev, items: newItems };
              }

              // Handle workflow updates
              if (item.type === 'workflow') {
                if (update.type === 'workflow.task.added') {
                  const task = update.task;
                  const taskIndex = update.task_index ?? (item.workflow.tasks?.length || 0);
                  const newTasks = [...(item.workflow.tasks || [])];
                  newTasks[taskIndex] = task;

                  const updatedItem: WorkflowItem = {
                    ...item,
                    workflow: { ...item.workflow, tasks: newTasks },
                  };
                  const newItems = [...prev.items];
                  newItems[itemIndex] = updatedItem;
                  return { ...prev, items: newItems };
                }

                if (update.type === 'workflow.summary') {
                  const updatedItem: WorkflowItem = {
                    ...item,
                    workflow: { ...item.workflow, summary: update.summary },
                  };
                  const newItems = [...prev.items];
                  newItems[itemIndex] = updatedItem;
                  return { ...prev, items: newItems };
                }

                if (update.type === 'workflow.task.updated') {
                  const task = update.task;
                  const taskIndex = update.task_index ?? 0;
                  const newTasks = [...(item.workflow.tasks || [])];
                  if (taskIndex < newTasks.length) {
                    newTasks[taskIndex] = { ...newTasks[taskIndex], ...task };
                  }

                  const updatedItem: WorkflowItem = {
                    ...item,
                    workflow: { ...item.workflow, tasks: newTasks },
                  };
                  const newItems = [...prev.items];
                  newItems[itemIndex] = updatedItem;
                  return { ...prev, items: newItems };
                }
              }

              return prev;
            }
            // Fallback: old format with item
            if (!event.item) return prev;
            const eventItem = event.item;
            return {
              ...prev,
              items: prev.items.map((i) => (i.id === eventItem.id ? eventItem : i)),
            };
          }

          case 'thread.item.done':
            if (!event.item) return prev;
            return {
              ...prev,
              items: prev.items.map((i) => (i.id === event.item.id ? event.item : i)),
            };

          case 'thread.item.removed': {
            const itemId = event.item_id;
            if (!itemId) return prev;
            return {
              ...prev,
              items: prev.items.filter((i) => i.id !== itemId),
            };
          }

          case 'thread.item.replaced': {
            if (!event.item) return prev;
            return {
              ...prev,
              items: prev.items.map((i) => (i.id === event.item.id ? event.item : i)),
            };
          }

          case 'message.delta': {
            const itemIndex = prev.items.findIndex((i) => i.id === event.item_id);
            if (itemIndex === -1) return prev;

            const item = prev.items[itemIndex];
            if (item.type !== 'assistant_message') return prev;

            const updatedItem: AssistantMessageItem = {
              ...item,
              content: item.content.map((c, idx) =>
                idx === 0 && c.type === 'output_text'
                  ? { ...c, text: c.text + event.delta.text }
                  : c
              ),
            };

            const newItems = [...prev.items];
            newItems[itemIndex] = updatedItem;
            return { ...prev, items: newItems };
          }

          case 'widget.delta': {
            const itemIndex = prev.items.findIndex((i) => i.id === event.item_id);
            if (itemIndex === -1) return prev;

            const item = prev.items[itemIndex];
            if (item.type !== 'widget') return prev;

            const updatedWidget = updateWidgetText(item.widget, event.widget_id, event.delta.text);
            const updatedItem: WidgetItem = { ...item, widget: updatedWidget };

            const newItems = [...prev.items];
            newItems[itemIndex] = updatedItem;
            return { ...prev, items: newItems };
          }

          case 'widget.streaming_text.value_delta': {
            const itemIndex = prev.items.findIndex((i) => i.id === event.item_id);
            if (itemIndex === -1) return prev;

            const item = prev.items[itemIndex];
            if (item.type !== 'widget') return prev;

            const updatedWidget = updateWidgetText(item.widget, event.component_id, event.delta);
            const updatedItem: WidgetItem = { ...item, widget: updatedWidget };

            const newItems = [...prev.items];
            newItems[itemIndex] = updatedItem;
            return { ...prev, items: newItems };
          }

          case 'widget.root.updated': {
            // Find the widget item and update its root
            const itemIndex = prev.items.findIndex((i) => i.id === event.item_id);
            if (itemIndex === -1) return prev;

            const item = prev.items[itemIndex];
            if (item.type !== 'widget') return prev;

            const updatedItem: WidgetItem = { ...item, widget: event.widget };
            const newItems = [...prev.items];
            newItems[itemIndex] = updatedItem;
            return { ...prev, items: newItems };
          }

          case 'progress_update':
            return { ...prev, progressText: event.text };

          case 'error':
            return { ...prev, error: event.error.message, isStreaming: false };

          case 'done':
            return { ...prev, isStreaming: false, progressText: null };

          case 'client_effect':
            // Effects are handled externally, state unchanged
            return prev;

          default:
            return prev;
        }
      });
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, messageOptions?: SendMessageOptions) => {
      if (!apiRef.current) return;

      // Cancel any existing stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Build content array, converting tracked entities to input_tag
      const messageContent: ContentPart[] = [];
      const entities = messageOptions?.entities;

      if (entities && entities.size > 0) {
        // Parse content to find @Title patterns and convert to input_tag
        let remaining = content;

        while (remaining.length > 0) {
          // Find the earliest @Title match
          let earliestMatch: { index: number; title: string; entity: Entity } | null = null;

          for (const [title, entity] of entities) {
            const pattern = `@${title}`;
            const index = remaining.indexOf(pattern);
            if (index !== -1 && (earliestMatch === null || index < earliestMatch.index)) {
              earliestMatch = { index, title, entity };
            }
          }

          if (earliestMatch) {
            // Add text before the entity
            if (earliestMatch.index > 0) {
              messageContent.push({ type: 'input_text', text: remaining.slice(0, earliestMatch.index) });
            }

            // Add the entity as input_tag
            const inputTag: InputTagContent = {
              type: 'input_tag',
              id: earliestMatch.entity.id,
              text: earliestMatch.entity.title,
            };
            if (earliestMatch.entity.group) {
              inputTag.group = earliestMatch.entity.group;
            }
            if (earliestMatch.entity.interactive !== undefined) {
              inputTag.interactive = earliestMatch.entity.interactive;
            }
            if (earliestMatch.entity.data) {
              inputTag.data = earliestMatch.entity.data;
            }
            messageContent.push(inputTag);

            // Continue with the rest
            remaining = remaining.slice(earliestMatch.index + earliestMatch.title.length + 1);
          } else {
            // No more entities found, add remaining text
            if (remaining.length > 0) {
              messageContent.push({ type: 'input_text', text: remaining });
            }
            break;
          }
        }
      } else {
        // No entities, just add as input_text
        messageContent.push({ type: 'input_text', text: content });
      }

      // Append additional content items (e.g., pasted text)
      if (messageOptions?.additionalContent) {
        for (const text of messageOptions.additionalContent) {
          messageContent.push({ type: 'input_text', text });
        }
      }

      // Add user message optimistically
      const tempUserMessage: ThreadItem = {
        type: 'user_message',
        id: `temp_${Date.now()}`,
        thread_id: state.currentThread?.id || '',
        created_at: new Date().toISOString(),
        content: messageContent,
      };

      setState((prev) => ({
        ...prev,
        items: [...prev.items, tempUserMessage],
        isStreaming: true,
        error: null,
      }));

      // Call onResponseStart callback
      options.onResponseStart?.();

      try {
        const stream = apiRef.current.sendMessage(
          {
            thread_id: state.currentThread?.id,
            content: messageContent,
            context: messageOptions?.context,
          },
          abortControllerRef.current.signal
        );

        for await (const event of stream) {
          processStreamEvent(event);

          // Handle client effects (fire-and-forget)
          if (event.type === 'client_effect') {
            const effectEvent = event as ClientEffectEvent;
            console.log('[ChatKit] Client Effect:', effectEvent.name, effectEvent.data);
            if (options.onEffect) {
              options.onEffect({
                name: effectEvent.name,
                data: effectEvent.data,
              });
            }
          }

          // Handle client tool calls
          if (
            event.type === 'thread.item.done' &&
            event.item?.type === 'client_tool_call'
          ) {
            const { name, arguments: args, call_id, thread_id } = event.item;
            console.log('[ChatKit] Client Tool Call:', name, args, 'call_id:', call_id);

            let result: unknown = { error: `No handler for client tool: ${name}` };
            if (options.onClientTool) {
              try {
                result = await options.onClientTool({ name, arguments: args, call_id });
              } catch (err) {
                result = { error: err instanceof Error ? err.message : 'Tool execution failed' };
              }
            }

            // Send result back to server
            if (apiRef.current && thread_id) {
              try {
                const toolStream = apiRef.current.respondToClientTool(
                  thread_id,
                  call_id,
                  result,
                  abortControllerRef.current?.signal
                );
                for await (const toolEvent of toolStream) {
                  processStreamEvent(toolEvent);
                }
              } catch (toolError) {
                console.error('Client tool error:', toolError);
              }
            }
          }
        }

        // Ensure streaming stops after stream completes
        setState((prev) => ({ ...prev, isStreaming: false }));

        // Call onResponseEnd callback
        options.onResponseEnd?.();
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          setState((prev) => ({ ...prev, isStreaming: false }));
          options.onResponseEnd?.();
          return; // Cancelled, ignore
        }

        const error = e instanceof Error ? e : new Error('Failed to send message');
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: error.message,
        }));

        // Call error and response end callbacks
        options.onError?.({ error });
        options.onResponseEnd?.();
      }
    },
    [state.currentThread, options.onClientTool, options.onEffect, options.onResponseStart, options.onResponseEnd, options.onError, processStreamEvent]
  );

  // --------------------------------------------------------------------------
  // Attachment Handling
  // --------------------------------------------------------------------------

  const uploadAttachment = useCallback(async (file: File): Promise<Attachment> => {
    if (!apiRef.current) {
      throw new Error('API not initialized');
    }
    return apiRef.current.uploadAttachment(file);
  }, []);

  const deleteAttachment = useCallback(async (attachmentId: string): Promise<void> => {
    if (!apiRef.current) return;
    await apiRef.current.deleteAttachment(attachmentId);
  }, []);

  const listSkills = useCallback(async (workflowId?: string): Promise<SkillMetadata[]> => {
    if (!apiRef.current) {
      return [];
    }
    return apiRef.current.listSkills(workflowId);
  }, []);

  const retryAfterItem = useCallback(async (userMessageId: string): Promise<void> => {
    if (!apiRef.current || !state.currentThread) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Clear items after the user message locally (server removes them but doesn't send events)
    setState((prev) => {
      const userMsgIndex = prev.items.findIndex(i => i.id === userMessageId);
      if (userMsgIndex === -1) return { ...prev, isStreaming: true, error: null };
      return {
        ...prev,
        items: prev.items.slice(0, userMsgIndex + 1), // Keep user message, remove everything after
        isStreaming: true,
        error: null,
      };
    });

    // Call onResponseStart callback
    options.onResponseStart?.();

    try {
      const stream = apiRef.current.retryAfterItem(
        state.currentThread.id,
        userMessageId,
        abortControllerRef.current.signal
      );

      for await (const event of stream) {
        processStreamEvent(event);

        // Handle client effects (fire-and-forget)
        if (event.type === 'client_effect') {
          const effectEvent = event as ClientEffectEvent;
          console.log('[ChatKit] Client Effect (retry):', effectEvent.name, effectEvent.data);
          if (options.onEffect) {
            options.onEffect({
              name: effectEvent.name,
              data: effectEvent.data,
            });
          }
        }
      }

      // Ensure streaming stops after stream completes
      setState((prev) => ({ ...prev, isStreaming: false }));
      options.onResponseEnd?.();
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        options.onResponseEnd?.();
        return;
      }

      const error = e instanceof Error ? e : new Error('Failed to retry');
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: error.message,
      }));
      options.onError?.({ error });
      options.onResponseEnd?.();
    }
  }, [state.currentThread, processStreamEvent, options.onResponseStart, options.onResponseEnd, options.onEffect, options.onError]);

  const sendFeedback = useCallback(async (itemIds: string[], kind: 'positive' | 'negative'): Promise<void> => {
    if (!apiRef.current || !state.currentThread) return;
    try {
      await apiRef.current.sendFeedback(state.currentThread.id, itemIds, kind);
    } catch (e) {
      console.error('Failed to send feedback:', e);
    }
  }, [state.currentThread]);

  const sendCustomAction = useCallback(async (
    itemId: string,
    action: { type: string; payload?: unknown }
  ): Promise<void> => {
    if (!apiRef.current || !state.currentThread) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, isStreaming: true, error: null }));

    // Call onResponseStart callback
    options.onResponseStart?.();

    try {
      const stream = apiRef.current.sendCustomAction(
        state.currentThread.id,
        itemId,
        action,
        abortControllerRef.current.signal
      );

      for await (const event of stream) {
        processStreamEvent(event);

        // Handle client effects (fire-and-forget)
        if (event.type === 'client_effect') {
          const effectEvent = event as ClientEffectEvent;
          console.log('[ChatKit] Client Effect (action):', effectEvent.name, effectEvent.data);
          if (options.onEffect) {
            options.onEffect({
              name: effectEvent.name,
              data: effectEvent.data,
            });
          }
        }
      }

      setState((prev) => ({ ...prev, isStreaming: false }));
      options.onResponseEnd?.();
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setState((prev) => ({ ...prev, isStreaming: false }));
        options.onResponseEnd?.();
        return;
      }

      const error = e instanceof Error ? e : new Error('Failed to send action');
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: error.message,
      }));
      options.onError?.({ error });
      options.onResponseEnd?.();
    }
  }, [state.currentThread, processStreamEvent, options.onResponseStart, options.onResponseEnd, options.onEffect, options.onError]);

  const addClientToolOutput = useCallback(async (callId: string, result: unknown): Promise<void> => {
    if (!apiRef.current || !state.currentThread) return;

    try {
      const stream = apiRef.current.respondToClientTool(
        state.currentThread.id,
        callId,
        result,
        abortControllerRef.current?.signal
      );

      for await (const event of stream) {
        processStreamEvent(event);
      }
    } catch (e) {
      console.error('Failed to add client tool output:', e);
      options.onError?.({ error: e instanceof Error ? e : new Error('Failed to add client tool output') });
    }
  }, [state.currentThread, processStreamEvent, options.onError]);

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // --------------------------------------------------------------------------
  // Initial Load
  // --------------------------------------------------------------------------

  useEffect(() => {
    refreshThreads();
  }, []);

  // --------------------------------------------------------------------------
  // Return Control Object
  // --------------------------------------------------------------------------

  return {
    control: {
      state,
      sendMessage,
      selectThread,
      createThread,
      deleteThread,
      renameThread,
      refreshThreads,
      uploadAttachment,
      deleteAttachment,
      listSkills,
      retryAfterItem,
      sendFeedback,
      sendCustomAction,
      addClientToolOutput,
      stopStreaming,
      clearError,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function updateWidgetText(widget: WidgetNode, widgetId: string, deltaText: string): WidgetNode {
  if (!widget) return widget;

  if (widget.id === widgetId && 'value' in widget) {
    return {
      ...widget,
      value: ((widget as { value: string }).value || '') + deltaText,
    } as WidgetNode;
  }

  if ('children' in widget && Array.isArray(widget.children)) {
    return {
      ...widget,
      children: widget.children.map((child: WidgetNode) => updateWidgetText(child, widgetId, deltaText)),
    } as WidgetNode;
  }

  return widget;
}
