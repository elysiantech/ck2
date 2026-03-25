import type {
  ThreadMetadata,
  ThreadItem,
  Page,
  ThreadStreamEvent,
  Attachment,
  ApiOptions,
  ContentPart,
  SkillMetadata,
} from '../types/chatkit';

// ============================================================================
// ChatKit API Client
// Single endpoint: POST /api/chatkit/chat with `type` field
// ============================================================================

export class ChatKitAPI {
  private baseUrl: string;
  private customFetch: (url: string, options: RequestInit) => Promise<Response>;
  private uploadUrl: string;
  private customHeaders: Record<string, string>;

  constructor(options: ApiOptions) {
    // baseUrl should be like "http://localhost:3000/api/chatkit/chat"
    this.baseUrl = options.url.replace(/\/$/, '');
    this.customFetch = options.fetch || ((url, opts) => fetch(url, opts));
    this.customHeaders = options.headers || {};

    // Upload URL from uploadStrategy, or derive from baseUrl
    // Default: /api/chatkit/upload (replace /chat with /upload)
    if (options.uploadStrategy?.uploadUrl) {
      this.uploadUrl = options.uploadStrategy.uploadUrl;
    } else {
      this.uploadUrl = this.baseUrl.replace(/\/chat$/, '/upload');
    }
  }

  // --------------------------------------------------------------------------
  // Core request method - all requests go to same endpoint with type field
  // --------------------------------------------------------------------------

  private async request<T>(type: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await this.customFetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.customHeaders,
      },
      body: JSON.stringify({ type, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // --------------------------------------------------------------------------
  // Thread Operations
  // --------------------------------------------------------------------------

  async listThreads(params: {
    limit?: number;
    after?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<Page<ThreadMetadata>> {
    return this.request('threads.list', params);
  }

  async getThread(threadId: string): Promise<{
    id: string;
    title?: string;
    status?: { type: string };
    created_at: string;
    updated_at?: string;
    items?: { data: ThreadItem[]; has_more: boolean; after: string | null };
  }> {
    return this.request('threads.get_by_id', { thread_id: threadId });
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.request('threads.delete', { thread_id: threadId });
  }

  async updateThread(threadId: string, updates: { title?: string }): Promise<void> {
    await this.request('threads.update', { thread_id: threadId, ...updates });
  }

  // --------------------------------------------------------------------------
  // Message Streaming
  // --------------------------------------------------------------------------

  async *sendMessage(
    params: {
      thread_id?: string;
      content: ContentPart[];
      context?: Record<string, unknown>;
    },
    signal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent, void, unknown> {
    // Build the correct request format with input wrapper
    const requestParams: Record<string, unknown> = {
      input: {
        content: params.content,
        attachments: [],
        quoted_text: null,
      },
    };

    // Determine action type based on whether we have a thread
    // threads.create - for new conversations
    // threads.add_user_message - for existing threads
    const hasThread = params.thread_id && params.thread_id.length > 0;
    const actionType = hasThread ? 'threads.add_user_message' : 'threads.create';

    if (hasThread) {
      requestParams.thread_id = params.thread_id;
    }

    if (params.context) {
      requestParams.context = params.context;
    }

    const response = await this.customFetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.customHeaders,
      },
      body: JSON.stringify({
        type: actionType,
        params: requestParams,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send message: ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');

    // Handle SSE streaming response
    if (contentType?.includes('text/event-stream')) {
      yield* this.parseSSEStream(response, signal);
    } else {
      // Handle JSON response (non-streaming)
      const data = await response.json();
      if (data.thread) {
        yield { type: 'thread.created', thread: data.thread };
      }
      if (data.items) {
        for (const item of data.items) {
          yield { type: 'thread.item.created', item };
        }
      }
      yield { type: 'done' };
    }
  }

  // --------------------------------------------------------------------------
  // Create Thread (without sending message)
  // --------------------------------------------------------------------------

  async *createThread(
    params: {
      context?: Record<string, unknown>;
    } = {},
    signal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent, void, unknown> {
    const response = await this.customFetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.customHeaders,
      },
      body: JSON.stringify({
        type: 'threads.create',
        params,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create thread: ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('text/event-stream')) {
      yield* this.parseSSEStream(response, signal);
    } else {
      const data = await response.json();
      if (data.thread) {
        yield { type: 'thread.created', thread: data.thread };
      }
      yield { type: 'done' };
    }
  }

  // --------------------------------------------------------------------------
  // Client Tool Response
  // --------------------------------------------------------------------------

  async *respondToClientTool(
    threadId: string,
    callId: string,
    output: unknown,
    signal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent, void, unknown> {
    const response = await this.customFetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.customHeaders,
      },
      body: JSON.stringify({
        type: 'threads.add_client_tool_output',
        params: {
          thread_id: threadId,
          call_id: callId,
          output,
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to respond to client tool: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('text/event-stream')) {
      yield* this.parseSSEStream(response, signal);
    } else {
      yield { type: 'done' };
    }
  }

  // --------------------------------------------------------------------------
  // Attachment Operations
  // --------------------------------------------------------------------------

  async uploadAttachment(file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    console.log('[ChatKit] Uploading attachment to:', this.uploadUrl);
    const response = await this.customFetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ChatKit] Upload failed:', response.status, errorText);
      throw new Error(`Failed to upload attachment: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[ChatKit] Upload result:', result);
    return result;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    console.log('[ChatKit] Deleting attachment:', attachmentId);
    const response = await this.customFetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.customHeaders,
      },
      body: JSON.stringify({
        type: 'attachments.delete',
        params: { attachment_id: attachmentId },
      }),
    });

    if (!response.ok) {
      console.error('[ChatKit] Delete attachment failed:', response.status);
      // Don't throw - deletion failure shouldn't block UI
    }
  }

  // --------------------------------------------------------------------------
  // Retry / Regenerate
  // --------------------------------------------------------------------------

  async *retryAfterItem(
    threadId: string,
    itemId: string,
    signal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent, void, unknown> {
    const response = await this.customFetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.customHeaders,
      },
      body: JSON.stringify({
        type: 'threads.retry_after_item',
        params: {
          thread_id: threadId,
          item_id: itemId,
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to retry: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      yield* this.parseSSEStream(response, signal);
    } else {
      yield { type: 'done' };
    }
  }

  // --------------------------------------------------------------------------
  // Feedback
  // --------------------------------------------------------------------------

  async sendFeedback(
    threadId: string,
    itemIds: string[],
    kind: 'positive' | 'negative'
  ): Promise<void> {
    await this.customFetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.customHeaders,
      },
      body: JSON.stringify({
        type: 'items.feedback',
        params: {
          thread_id: threadId,
          item_ids: itemIds,
          kind,
        },
      }),
    });
  }

  // --------------------------------------------------------------------------
  // Custom Actions (Widget interactions)
  // --------------------------------------------------------------------------

  async *sendCustomAction(
    threadId: string,
    itemId: string,
    action: { type: string; payload?: unknown },
    signal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent, void, unknown> {
    const response = await this.customFetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.customHeaders,
      },
      body: JSON.stringify({
        type: 'threads.custom_action',
        params: {
          thread_id: threadId,
          item_id: itemId,
          action,
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to send action: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      yield* this.parseSSEStream(response, signal);
    } else {
      yield { type: 'done' };
    }
  }

  // --------------------------------------------------------------------------
  // Skills Operations
  // --------------------------------------------------------------------------

  async listSkills(workflowId?: string): Promise<SkillMetadata[]> {
    // Replace only the trailing /chat with /skills (not /chat in /chatkit)
    const skillsUrl = this.baseUrl.replace(/\/chat$/, '/skills');
    const url = workflowId
      ? `${skillsUrl}?workflow=${encodeURIComponent(workflowId)}`
      : skillsUrl;

    try {
      const response = await this.customFetch(url, {
        method: 'GET',
        headers: this.customHeaders,
      });
      if (!response.ok) {
        return [];
      }
      return response.json();
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // SSE Parser
  // --------------------------------------------------------------------------

  private async *parseSSEStream(
    response: Response,
    signal?: AbortSignal
  ): AsyncGenerator<ThreadStreamEvent, void, unknown> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (signal?.aborted) {
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining data in buffer
          if (buffer.trim()) {
            const events = this.extractSSEEvents(buffer);
            for (const event of events) {
              yield event;
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Split on double newlines which separate SSE events
        const parts = buffer.split('\n\n');
        // Keep the last part (might be incomplete)
        buffer = parts.pop() || '';

        for (const part of parts) {
          const events = this.extractSSEEvents(part);
          for (const event of events) {
            yield event;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private extractSSEEvents(chunk: string): ThreadStreamEvent[] {
    const events: ThreadStreamEvent[] = [];
    const lines = chunk.split('\n');

    let eventType = '';
    let eventData = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        // Handle "data: {...}" format
        const dataContent = line.slice(5).trim();
        if (dataContent) {
          eventData = dataContent;
        }
      } else if (line.startsWith('data: ')) {
        // Handle "data: {...}" with explicit space
        eventData = line.slice(6);
      }
    }

    // If we have data, try to parse it
    if (eventData) {
      try {
        const parsed = JSON.parse(eventData);
        // Add event type if not present in data
        if (eventType && !parsed.type) {
          parsed.type = eventType;
        }
        events.push(parsed as ThreadStreamEvent);
      } catch (e) {
        console.warn('Failed to parse SSE event:', eventData, e);
      }
    }

    return events;
  }
}

// ============================================================================
// Create API Instance
// ============================================================================

export function createChatKitAPI(options: ApiOptions): ChatKitAPI {
  return new ChatKitAPI(options);
}
