// ============================================================================
// ChatKit Types - Based on OpenAI ChatKit Protocol
// ============================================================================

// ----------------------------------------------------------------------------
// Thread Types
// ----------------------------------------------------------------------------

export interface ThreadMetadata {
  id: string;
  title: string | null;
  status?: string | { type: string };
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface Page<T> {
  data: T[];
  has_more: boolean;
  first_id: string | null;
  last_id: string | null;
}

// ----------------------------------------------------------------------------
// Message Types
// ----------------------------------------------------------------------------

export type ThreadItem =
  | UserMessageItem
  | AssistantMessageItem
  | WidgetItem
  | HiddenContextItem
  | ClientToolCallItem
  | TaskItem
  | WorkflowItem;

export interface UserMessageItem {
  type: 'user_message';
  id: string;
  thread_id: string;
  created_at: string;
  content: UserMessageContent[];
  attachments?: Attachment[];
  quoted_text?: string;
  inference_options?: InferenceOptions;
}

// Content types - what goes IN (user) vs OUT (assistant)
export type InputTextContent = { type: 'input_text'; text: string };
export type InputTagContent = {
  type: 'input_tag';
  id: string;
  text: string;
  group?: string;
  interactive?: boolean;
  data?: Record<string, unknown>;
};
export type OutputTextContent = { type: 'output_text'; text: string; annotations?: Annotation[] };

// UserMessageContent can be input_text or input_tag
export type UserMessageContent = InputTextContent | InputTagContent;

// ContentPart is used for API requests (can be input types)
export type ContentPart = InputTextContent | InputTagContent;

// Legacy type alias for backwards compatibility
export interface LegacyUserMessageContent {
  type: 'text' | 'tag';
  text?: string;
  data?: EntityTagData;
}

export interface EntityTagData {
  id: string;
  title: string;
  type?: string;
  group?: string;
  interactive?: boolean;
  briefName?: string;
  subtitle?: string;
  icon?: string;
}

export interface AssistantMessageItem {
  type: 'assistant_message';
  id: string;
  thread_id: string;
  created_at: string;
  content: AssistantMessageContent[];
  status: 'in_progress' | 'completed' | 'failed';
  annotations?: Annotation[];
}

export interface AssistantMessageContent {
  type: 'output_text';
  text: string;
  annotations?: Annotation[];
}

export interface Annotation {
  type: 'url_citation' | 'file_citation';
  text: string;
  start_index: number;
  end_index: number;
  url?: string;
  file_id?: string;
  title?: string;
}

export interface HiddenContextItem {
  type: 'hidden_context';
  id: string;
  thread_id: string;
  created_at: string;
  content: string;
}

export interface ClientToolCallItem {
  type: 'client_tool_call';
  id: string;
  thread_id: string;
  created_at: string;
  call_id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'completed' | 'failed';
  output?: unknown;
}

export interface TaskItem {
  type: 'task';
  id: string;
  thread_id: string;
  created_at: string;
  task: Task;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface WorkflowItem {
  type: 'workflow';
  id: string;
  thread_id: string;
  created_at: string;
  workflow: Workflow;
}

export interface Workflow {
  type: 'reasoning' | string;
  tasks: WorkflowTask[];
  expanded: boolean;
  summary: string | null;
}

export interface WorkflowTask {
  type: 'file' | 'web' | 'thought' | string;
  title?: string;  // optional for thought tasks
  content?: string;  // for thought tasks
  sources?: WorkflowSource[];
  status_indicator?: 'in_progress' | 'complete' | 'failed';
}

export interface WorkflowSource {
  type: 'file' | 'url';
  filename?: string;
  title?: string;
  description?: string | null;
  url?: string;
}

// ----------------------------------------------------------------------------
// Attachment Types
// ----------------------------------------------------------------------------

export type Attachment = FileAttachment | ImageAttachment | TextAttachment;

export interface FileAttachment {
  type: 'file';
  id: string;
  name: string;
  mime_type: string;
  size: number;
  upload_url?: string;
  preview_url?: string;
}

export interface ImageAttachment {
  type: 'image';
  id: string;
  name: string;
  mime_type: string;
  size: number;
  width?: number;
  height?: number;
  upload_url?: string;
  preview_url?: string;
}

export interface TextAttachment {
  type: 'text';
  id: string;
  name: string;
  content: string;
}

export interface InferenceOptions {
  model?: string;
  tool_choice?: { id: string } | null;
}

// Skill metadata from /api/chatkit/skills endpoint
export interface SkillMetadata {
  name: string;
  description: string;
  workflows?: string[];
  tools?: string[];
  requires?: string[];
}

// ----------------------------------------------------------------------------
// Widget Types
// ----------------------------------------------------------------------------

export interface WidgetItem {
  type: 'widget';
  id: string;
  thread_id: string;
  created_at: string;
  widget: WidgetRoot;
  copy_text?: string;
}

export type WidgetRoot = WidgetNode;

export type WidgetNode =
  | CardWidget
  | TextWidget
  | MarkdownWidget
  | TitleWidget
  | ButtonWidget
  | ImageWidget
  | FormWidget
  | SelectWidget
  | DividerWidget
  | StackWidget
  | LinkWidget
  | BadgeWidget
  | ProgressWidget
  | CodeBlockWidget
  | RadioGroupWidget
  | CheckboxWidget;

export interface BaseWidget {
  id?: string;
}

export interface CardWidget extends BaseWidget {
  type: 'Card';
  children: WidgetNode[];
  confirm?: ActionConfig;
  asForm?: boolean;
}

export interface TextWidget extends BaseWidget {
  type: 'Text';
  value: string;
  size?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'bold';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  streaming?: boolean;
  editable?: EditableProps;
}

export interface MarkdownWidget extends BaseWidget {
  type: 'Markdown';
  value: string;
  streaming?: boolean;
}

export interface TitleWidget extends BaseWidget {
  type: 'Title';
  value: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ButtonWidget extends BaseWidget {
  type: 'Button';
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  submit?: boolean;
  onClickAction?: ActionConfig;
}

export interface ImageWidget extends BaseWidget {
  type: 'Image';
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface FormWidget extends BaseWidget {
  type: 'Form';
  children: WidgetNode[];
  direction?: 'row' | 'col';
  onSubmitAction?: ActionConfig;
}

export interface SelectWidget extends BaseWidget {
  type: 'Select';
  name: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChangeAction?: ActionConfig;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface DividerWidget extends BaseWidget {
  type: 'Divider';
}

export interface StackWidget extends BaseWidget {
  type: 'Stack';
  children: WidgetNode[];
  direction?: 'row' | 'col';
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

export interface LinkWidget extends BaseWidget {
  type: 'Link';
  href: string;
  text: string;
  target?: '_blank' | '_self';
}

export interface BadgeWidget extends BaseWidget {
  type: 'Badge';
  text: string;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export interface ProgressWidget extends BaseWidget {
  type: 'Progress';
  value: number;
  max?: number;
  label?: string;
}

export interface CodeBlockWidget extends BaseWidget {
  type: 'CodeBlock';
  code: string;
  language?: string;
}

export interface RadioGroupWidget extends BaseWidget {
  type: 'RadioGroup';
  name: string;
  options: SelectOption[];
  value?: string;
  direction?: 'row' | 'col';
  onChangeAction?: ActionConfig;
}

export interface CheckboxWidget extends BaseWidget {
  type: 'Checkbox';
  name: string;
  label: string;
  checked?: boolean;
  onChangeAction?: ActionConfig;
}

export interface EditableProps {
  name: string;
  required?: boolean;
  pattern?: string;
}

export interface ActionConfig {
  type: string;
  payload?: Record<string, unknown>;
  handler?: 'server' | 'client';
  loadingBehavior?: 'auto' | 'self' | 'container' | 'none';
}

// ----------------------------------------------------------------------------
// Event Types (SSE)
// ----------------------------------------------------------------------------

export type ThreadStreamEvent =
  | ThreadCreatedEvent
  | ThreadUpdatedEvent
  | ThreadItemCreatedEvent
  | ThreadItemAddedEvent
  | ThreadItemUpdatedEvent
  | ThreadItemDoneEvent
  | ThreadItemRemovedEvent
  | ThreadItemReplacedEvent
  | MessageDeltaEvent
  | WidgetDeltaEvent
  | WidgetStreamingTextValueDeltaEvent
  | WidgetRootUpdatedEvent
  | ProgressUpdateEvent
  | ClientEffectEvent
  | ErrorEvent
  | DoneEvent;

export interface WidgetStreamingTextValueDeltaEvent {
  type: 'widget.streaming_text.value_delta';
  item_id: string;
  component_id: string;
  delta: string;
  done: boolean;
}

export interface WidgetRootUpdatedEvent {
  type: 'widget.root.updated';
  item_id: string;
  widget: WidgetRoot;
}

export interface ThreadCreatedEvent {
  type: 'thread.created';
  thread: ThreadMetadata;
}

export interface ThreadUpdatedEvent {
  type: 'thread.updated';
  thread: ThreadMetadata;
}

export interface ThreadItemCreatedEvent {
  type: 'thread.item.created';
  item: ThreadItem;
}

export interface ThreadItemAddedEvent {
  type: 'thread.item.added';
  item: ThreadItem;
}

export interface ThreadItemUpdatedEvent {
  type: 'thread.item.updated';
  item_id: string;
  update: ThreadItemUpdate;
  // Legacy format support
  item?: ThreadItem;
}

export interface ThreadItemDoneEvent {
  type: 'thread.item.done';
  item: ThreadItem;
}

export interface ThreadItemRemovedEvent {
  type: 'thread.item.removed';
  item_id: string;
}

export interface ThreadItemReplacedEvent {
  type: 'thread.item.replaced';
  item: ThreadItem;
}

export interface MessageDeltaEvent {
  type: 'message.delta';
  item_id: string;
  delta: {
    type: 'text_delta';
    text: string;
  };
}

export interface WidgetDeltaEvent {
  type: 'widget.delta';
  item_id: string;
  widget_id: string;
  delta: {
    type: 'text_delta';
    text: string;
  };
}

export interface ProgressUpdateEvent {
  type: 'progress_update';
  text: string;
}

export interface ClientEffectEvent {
  type: 'client_effect';
  name: string;
  data: Record<string, unknown>;
}

export interface ErrorEvent {
  type: 'error';
  error: {
    message: string;
    code?: string;
  };
}

export interface DoneEvent {
  type: 'done';
}

// Thread Item Update Types
export interface WidgetStreamingTextValueDelta {
  type: 'widget.streaming_text.value_delta';
  component_id: string;
  delta: string;
  done: boolean;
}

export interface WidgetRootUpdated {
  type: 'widget.root.updated';
  widget: WidgetRoot;
}

export interface WidgetComponentUpdated {
  type: 'widget.component.updated';
  component_id: string;
  component: unknown;
}

export interface AssistantMessageContentPartTextDelta {
  type: 'assistant_message.content_part.text_delta';
  content_index: number;
  delta: string;
}

export interface AssistantMessageContentPartAdded {
  type: 'assistant_message.content_part.added';
  content_index: number;
  content: AssistantMessageContent;
}

export interface AssistantMessageContentPartDone {
  type: 'assistant_message.content_part.done';
  content_index: number;
  content: AssistantMessageContent;
}

export interface WorkflowTaskAdded {
  type: 'workflow.task.added';
  task_index: number;
  task: WorkflowTask;
}

export interface WorkflowTaskUpdated {
  type: 'workflow.task.updated';
  task_index: number;
  task: Partial<WorkflowTask>;
}

export interface WorkflowSummaryUpdate {
  type: 'workflow.summary';
  summary: string;
}

export type ThreadItemUpdate =
  | AssistantMessageContentPartTextDelta
  | AssistantMessageContentPartAdded
  | AssistantMessageContentPartDone
  | WorkflowTaskAdded
  | WorkflowTaskUpdated
  | WorkflowSummaryUpdate
  | WidgetStreamingTextValueDelta
  | WidgetComponentUpdated
  | WidgetRootUpdated;

// ----------------------------------------------------------------------------
// API Request/Response Types
// ----------------------------------------------------------------------------

export interface SendMessageRequest {
  thread_id?: string;
  content: UserMessageContent[];
  attachments?: Attachment[];
  quoted_text?: string;
  inference_options?: InferenceOptions;
}

export interface SendActionRequest {
  thread_id: string;
  action: ActionConfig;
  widget_id?: string;
}

export interface ListThreadsRequest {
  limit?: number;
  after?: string;
  order?: 'asc' | 'desc';
}

export interface ListThreadItemsRequest {
  thread_id: string;
  limit?: number;
  after?: string;
  order?: 'asc' | 'desc';
}

// ----------------------------------------------------------------------------
// Entity Types (for @mentions)
// ----------------------------------------------------------------------------

export interface Entity {
  id: string;
  title: string;
  type?: string;
  group?: string;
  interactive?: boolean;
  icon?: string;
  subtitle?: string;
  data?: Record<string, string>;
}

export interface EntityPreview {
  preview: WidgetRoot;
}

// ----------------------------------------------------------------------------
// ChatKit Options
// ----------------------------------------------------------------------------

export interface ChatKitOptions {
  api: ApiOptions;
  locale?: string;
  header?: HeaderOptions;
  composer?: ComposerOptions;
  startScreen?: StartScreenOptions;
  history?: HistoryOptions;
  entities?: EntitiesOptions;
  widgets?: WidgetsOptions;
  skills?: SkillsOptions;

  // Client tool execution (server requests client-side tool execution)
  onClientTool?: (params: {
    name: string;
    arguments: Record<string, unknown>;
    call_id: string;
  }) => Promise<unknown>;

  // Fire-and-forget effects (not persisted, for UI side effects)
  onEffect?: (event: { name: string; data: Record<string, unknown> }) => void;

  // Response lifecycle callbacks
  onResponseStart?: () => void;
  onResponseEnd?: () => void;

  // Error handling
  onError?: (params: { error: Error }) => void;

  // Thread change notifications
  onThreadChange?: (params: { threadId: string | null }) => void;
}

export interface ApiOptions {
  url: string;
  fetch?: (url: string, options: RequestInit) => Promise<Response>;
  clientToken?: string;
  uploadStrategy?: UploadStrategy;
  headers?: Record<string, string>;
}

export interface UploadStrategy {
  type: 'direct' | 'hosted';
  uploadUrl?: string;
}

export interface HeaderOptions {
  enabled?: boolean;
  title?: string;
  leftAction?: CustomButton;
  rightAction?: CustomButton;
}

export interface CustomButton {
  onClick: () => void;
  label?: string;
}

export interface ComposerOptions {
  placeholder?: string;
  tools?: ComposerTool[];
  attachments?: AttachmentsOptions;
}

export interface ComposerTool {
  id: string;
  label: string;
  icon?: string;
  pinned?: boolean;
}

export interface AttachmentsOptions {
  enabled?: boolean;  // default: true
  uploadStrategy?: UploadStrategy;
  maxSize?: number;
  maxCount?: number;
  accept?: Record<string, string[]>;
}

export interface StartScreenOptions {
  greeting?: string;
  prompts?: StartScreenPrompt[];
}

export interface StartScreenPrompt {
  name: string;
  prompt: string;
  icon?: string;
}

export interface HistoryOptions {
  enabled?: boolean;
}

export interface SkillsOptions {
  enabled?: boolean;
}

export interface EntitiesOptions {
  onTagSearch?: (query: string) => Promise<Entity[]>;
  onRequestPreview?: (entity: Entity) => Promise<EntityPreview>;
  onClick?: (entity: Entity) => void;
}

export interface WidgetShareData {
  widgetCode: string;  // the widget HTML string
  cssVars: Record<string, string>;  // snapshotted at render time
  widgetId: string;
  threadId?: string;
}

export interface WidgetsOptions {
  onAction?: (action: ActionConfig, item: WidgetItem) => Promise<void>;
  onShare?: (data: WidgetShareData) => Promise<string | null>;
  // If onShare provided → Share button shows
}
