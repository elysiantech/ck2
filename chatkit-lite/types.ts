/**
 * ChatKit Lite - Minimal types for hosted workflows
 */

// Thread types
export interface ThreadMetadata {
  id: string;
  created_at: Date;
  status: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface Thread extends ThreadMetadata {
  items: Page<ThreadItem>;
}

export interface Page<T> {
  data: T[];
  has_more: boolean;
  after: string | null;
}

// Thread items
export interface ThreadItemBase {
  id: string;
  thread_id: string;
  created_at: Date | string;
}

export interface UserMessageItem extends ThreadItemBase {
  type: 'user_message';
  content: UserMessageContent[];
  attachments?: unknown[];
  quoted_text?: string | null;
  inference_options?: Record<string, unknown>;
}

export interface AssistantMessageItem extends ThreadItemBase {
  type: 'assistant_message';
  content: AssistantMessageContent[];
}

export interface ClientToolCallItem extends ThreadItemBase {
  type: 'client_tool_call';
  name: string;
  arguments: Record<string, unknown>;
  call_id: string;
  status: 'pending' | 'completed';
  output?: unknown;
  response_id?: string;
}

export interface WorkflowItem extends ThreadItemBase {
  type: 'workflow';
  workflow: {
    type: 'reasoning';
    tasks: WorkflowTask[];
    expanded: boolean;
    summary: string | null;
  };
}

export interface CompactionItem extends ThreadItemBase {
  type: 'compaction';
  encrypted_content: string;
}

export type ThreadItem =
  | UserMessageItem
  | AssistantMessageItem
  | ClientToolCallItem
  | WorkflowItem
  | CompactionItem;

// Content types
export type UserMessageContent =
  | { type: 'input_text' | 'text'; text: string }
  | { type: 'input_image'; image_url: string }
  | { type: 'input_file'; file_id: string };

export interface AssistantMessageContent {
  type: 'output_text';
  text: string;
  annotations?: unknown[];
}

// Workflow tasks
export interface WorkflowTask {
  type: 'thought' | 'custom';
  content?: string;
  title?: string | null;
  icon?: string | null;
}

// Stream events
export type ThreadStreamEvent =
  | { type: 'thread.created'; thread: Thread }
  | { type: 'thread.item.added'; item: ThreadItem }
  | { type: 'thread.item.updated'; item_id: string; update: ThreadItemUpdate }
  | { type: 'thread.item.done'; item: ThreadItem }
  | { type: 'progress_update'; text: string; icon?: string | null }
  | { type: 'stream_options'; stream_options: { allow_cancel: boolean } }
  | { type: 'error'; error: { message: string; code?: string } };

export type ThreadItemUpdate =
  | { type: 'assistant_message.content_part.added'; content_index: number; content: AssistantMessageContent }
  | { type: 'assistant_message.content_part.text_delta'; content_index: number; delta: string }
  | { type: 'assistant_message.content_part.done'; content_index: number; content: AssistantMessageContent }
  | { type: 'workflow.task.added'; task_index: number; task: WorkflowTask }
  | { type: 'workflow.task.updated'; task_index: number; task: WorkflowTask };

// Input for workflow API
export type WorkflowInputItem =
  | { type: 'message'; role: 'user' | 'assistant'; content: Array<{ type: string; text?: string; image_url?: string }> }
  | { type: 'function_call'; name: string; arguments: string; call_id: string }
  | { type: 'function_call_output'; call_id: string; output: string }
  | { type: 'compaction'; encrypted_content: string };

// Workflow events from OpenAI
export type WorkflowEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_call'; name: string; arguments: Record<string, unknown>; call_id: string; responseId?: string }
  | { type: 'workflow_started'; id: string; created_at: number }
  | { type: 'workflow_task_added'; task_index: number; task: WorkflowTask }
  | { type: 'workflow_task_updated'; task_index: number; task: WorkflowTask }
  | { type: 'workflow_done'; id: string; tasks: WorkflowTask[]; response_id?: string; input_tokens?: number }
  | { type: 'response_completed'; response_id: string | null };
