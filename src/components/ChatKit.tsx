import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatKitControl } from '../hooks/useChatKit';
import type { ChatKitOptions, WidgetItem, WidgetNode, Entity, SkillMetadata, Workflow, Attachment } from '../types';

// ============================================================================
// Helper Functions (defined before component for hoisting)
// ============================================================================

// Render user message content (handles input_text and input_tag types)
function renderUserMessageContent(
  content: Array<{ type: string; text?: string; id?: string; data?: any }>,
  entityCallbacks?: {
    onClick?: (entity: Entity) => void;
    onRequestPreview?: (entity: Entity) => Promise<{ title: string; content: string }>;
  }
): JSX.Element[] {
  if (!content || !Array.isArray(content)) return [];
  return content.map((c, i) => {
    if (c.type === 'input_tag') {
      // Entity tag - render in blue
      const displayText = c.data?.briefName || c.data?.title || c.text || c.id;
      const entity: Entity = {
        id: c.id || '',
        title: c.data?.title || c.text || c.id || '',
        type: c.data?.type,
        subtitle: c.data?.subtitle,
        icon: c.data?.icon,
      };
      const handleClick = entityCallbacks?.onClick ? () => entityCallbacks.onClick!(entity) : undefined;
      return (
        <span
          key={i}
          className={`text-blue-600 ${handleClick ? 'cursor-pointer hover:underline' : ''}`}
          onClick={handleClick}
          onMouseEnter={() => entityCallbacks?.onRequestPreview?.(entity)}
        >
          @{displayText}
        </span>
      );
    }
    // Regular text
    if ((c.type === 'input_text' || c.type === 'text') && c.text) {
      return <span key={i}>{c.text}</span>;
    }
    return <span key={i}></span>;
  });
}

// Extract text from assistant message content (handles output_text type)
function extractAssistantMessageText(content: Array<{ type: string; text?: string }>): string {
  if (!content || !Array.isArray(content)) return '';
  return content
    .map((c) => {
      if (c.type === 'output_text' && c.text) return c.text;
      if (c.type === 'text' && c.text) return c.text; // fallback
      return '';
    })
    .join('');
}

// Markdown components for proper styling
const markdownComponents = {
  h1: ({ children }: any) => <h1 className="text-2xl font-medium mt-6 mb-3">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xl font-medium mt-5 mb-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
  p: ({ children }: any) => <p className="mb-3 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border border-gray-200 rounded-lg">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }: any) => <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b border-gray-200">{children}</th>,
  td: ({ children }: any) => <td className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">{children}</td>,
  // In react-markdown v9+, code blocks are <pre><code>...</code></pre>
  // Inline code is just <code>...</code>
  // We use a wrapper component to detect if we're inside a pre
  pre: ({ children }: any) => (
    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto my-3 text-sm font-mono [&>code]:bg-transparent [&>code]:p-0 [&>code]:rounded-none">
      {children}
    </pre>
  ),
  code: ({ children }: any) => (
    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
  ),
  blockquote: ({ children }: any) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">{children}</blockquote>,
  a: ({ href, children }: any) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
  img: ({ src, alt }: any) => <img src={src} alt={alt || ''} className="max-w-full rounded-lg my-2" />,
  hr: () => <hr className="my-4 border-gray-200" />,
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
};

function groupThreadsByTime(threads: Array<{ id: string; title?: string; updated_at: string }>): Array<{ label: string; threads: typeof threads }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  const todayThreads: typeof threads = [];
  const last7: typeof threads = [];
  const last30: typeof threads = [];
  const last90: typeof threads = [];
  const last6Months: typeof threads = [];
  const aYearAgo: typeof threads = [];
  const yearsAgo: typeof threads = [];

  for (const thread of threads) {
    const date = new Date(thread.updated_at);
    // Handle invalid dates - default to today
    if (isNaN(date.getTime()) || date >= today) {
      todayThreads.push(thread);
    } else if (date >= sevenDaysAgo) {
      last7.push(thread);
    } else if (date >= thirtyDaysAgo) {
      last30.push(thread);
    } else if (date >= ninetyDaysAgo) {
      last90.push(thread);
    } else if (date >= sixMonthsAgo) {
      last6Months.push(thread);
    } else if (date >= oneYearAgo) {
      aYearAgo.push(thread);
    } else {
      yearsAgo.push(thread);
    }
  }

  const groups: Array<{ label: string; threads: typeof threads }> = [];
  if (todayThreads.length > 0) groups.push({ label: 'Today', threads: todayThreads });
  if (last7.length > 0) groups.push({ label: 'Last 7 days', threads: last7 });
  if (last30.length > 0) groups.push({ label: 'Last 30 days', threads: last30 });
  if (last90.length > 0) groups.push({ label: 'Last 90 days', threads: last90 });
  if (last6Months.length > 0) groups.push({ label: 'Last 6 months', threads: last6Months });
  if (aYearAgo.length > 0) groups.push({ label: 'A year ago', threads: aYearAgo });
  if (yearsAgo.length > 0) groups.push({ label: 'Years ago', threads: yearsAgo });

  return groups;
}

// Widget renderer component - handles all ChatKit widget types
interface WidgetRendererProps {
  widget: any;
  itemId?: string;
  onAction?: (action: { type: string; payload?: unknown }) => void;
}

function WidgetRenderer({ widget, itemId, onAction }: WidgetRendererProps): JSX.Element | null {
  if (!widget) return null;

  switch (widget.type) {
    case 'Card':
      return (
        <div className="inline-block border border-gray-200 rounded-lg p-5 bg-white space-y-4 max-w-sm">
          {widget.children?.map((child: any, i: number) => (
            <WidgetRenderer key={i} widget={child} itemId={itemId} onAction={onAction} />
          ))}
        </div>
      );

    case 'Form': {
      const isSubmitted = widget.children?.some((child: any) =>
        (child.type === 'RadioGroup' && child.value !== undefined) ||
        (child.type === 'Checkbox' && child.checked !== undefined)
      );
      return (
        <form
          className={`flex ${widget.direction === 'col' ? 'flex-col' : 'flex-row'} gap-4`}
          onSubmit={(e) => {
            e.preventDefault();
            if (isSubmitted) return;
            if (widget.onSubmitAction && onAction) {
              const formData = new FormData(e.currentTarget);
              const payload: Record<string, string> = {};
              formData.forEach((value, key) => {
                payload[key] = value.toString();
              });
              onAction({
                type: widget.onSubmitAction.type,
                payload,
              });
            }
          }}
        >
          {widget.children?.map((child: any, i: number) => (
            <WidgetRenderer key={i} widget={child} itemId={itemId} onAction={onAction} />
          ))}
        </form>
      );
    }

    case 'Text':
      const textClasses = [
        'text-gray-700',
        widget.weight === 'bold' ? 'font-medium' : '',
        widget.size === 'sm' ? 'text-sm' : widget.size === 'lg' ? 'text-lg' : '',
      ].filter(Boolean).join(' ');
      return <span className={textClasses}>{widget.value}</span>;

    case 'Markdown':
      return (
        <div className="text-gray-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {widget.value || ''}
          </ReactMarkdown>
        </div>
      );

    case 'Title':
      const TitleTag = `h${widget.level || 2}` as keyof JSX.IntrinsicElements;
      return <TitleTag className="font-medium text-gray-700">{widget.value}</TitleTag>;

    case 'RadioGroup': {
      const hasValue = widget.value !== undefined;
      return (
        <div className={`flex ${widget.direction === 'col' ? 'flex-col' : 'flex-row'} gap-3`}>
          {widget.options?.map((opt: { label: string; value: string }, i: number) => (
            <label key={i} className={`flex items-start gap-3 ${hasValue ? 'cursor-default' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name={widget.name}
                value={opt.value}
                defaultChecked={widget.value === opt.value}
                disabled={hasValue}
                className="mt-0.5 w-4 h-4 accent-black"
              />
              <span className="text-gray-700 leading-snug">{opt.label}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'Checkbox': {
      const isLocked = widget.checked !== undefined;
      return (
        <label className={`flex items-center gap-3 ${isLocked ? 'cursor-default' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            name={widget.name}
            defaultChecked={widget.checked}
            disabled={isLocked}
            className="w-4 h-4 accent-black"
          />
          <span className="text-gray-700">{widget.label}</span>
        </label>
      );
    }

    case 'Button':
      const btnVariant = widget.variant || 'primary';
      const btnClasses = btnVariant === 'outline'
        ? 'px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
        : btnVariant === 'ghost'
        ? 'px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg'
        : 'px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700';
      return (
        <button type={widget.submit ? 'submit' : 'button'} className={btnClasses}>
          {widget.label}
        </button>
      );

    case 'Image':
      return <img src={widget.src} alt={widget.alt || ''} className="max-w-full rounded-lg" />;

    case 'Stack':
      const gapClass = widget.gap ? `gap-${widget.gap}` : 'gap-3';
      return (
        <div className={`flex ${widget.direction === 'col' ? 'flex-col' : 'flex-row'} ${gapClass}`}>
          {widget.children?.map((child: any, i: number) => (
            <WidgetRenderer key={i} widget={child} itemId={itemId} onAction={onAction} />
          ))}
        </div>
      );

    case 'Divider':
      return <hr className="my-3 border-gray-200" />;

    case 'CodeBlock':
      return (
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border border-gray-200">
          <code>{widget.code}</code>
        </pre>
      );

    case 'Link':
      return (
        <a href={widget.href} target={widget.target || '_blank'} className="text-gray-900 underline hover:text-gray-600">
          {widget.text}
        </a>
      );

    case 'Badge':
      const badgeColors: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-700',
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
        yellow: 'bg-yellow-100 text-yellow-700',
        red: 'bg-red-100 text-red-700',
        purple: 'bg-purple-100 text-purple-700',
      };
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColors[widget.color || 'gray']}`}>
          {widget.text}
        </span>
      );

    case 'Select':
      return (
        <select
          name={widget.name}
          defaultValue={widget.value}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          {widget.placeholder && <option value="">{widget.placeholder}</option>}
          {widget.options?.map((opt: { label: string; value: string }, i: number) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    default:
      // For unknown types, try to render children if they exist
      if (widget.children && Array.isArray(widget.children)) {
        return (
          <div>
            {widget.children.map((child: any, i: number) => (
              <WidgetRenderer key={i} widget={child} itemId={itemId} onAction={onAction} />
            ))}
          </div>
        );
      }
      return null;
  }
}

// Workflow display component with collapsible behavior
interface WorkflowDisplayProps {
  workflow: Workflow;
  expanded?: boolean;
}

function WorkflowDisplay({ workflow, expanded: initialExpanded }: WorkflowDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded ?? false);
  const hasTasks = workflow.tasks && workflow.tasks.length > 0;

  return (
    <div className="py-2">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors"
      >
        <span>{workflow.summary || 'Thought for a while'}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <path d="M7.52925 3.7793C7.75652 3.55203 8.10803 3.52383 8.36616 3.69434L8.47065 3.7793L14.2207 9.5293C14.4804 9.789 14.4804 10.211 14.2207 10.4707L8.47065 16.2207C8.21095 16.4804 7.78895 16.4804 7.52925 16.2207C7.26955 15.961 7.26955 15.539 7.52925 15.2793L12.8085 10L7.52925 4.7207L7.44429 4.61621C7.27378 4.35808 7.30198 4.00657 7.52925 3.7793Z"/>
        </svg>
      </button>

      {/* Expandable content */}
      {isExpanded && hasTasks && (
        <div className="mt-3">
          {workflow.tasks.map((task, idx) => {
            // Never "last" since Done is always shown below
            const isLast = false;
            return (
              <div key={idx} className="flex">
                {/* Timeline column with icon and vertical line */}
                <div className="flex flex-col items-center mr-3">
                  <div className="flex-shrink-0">
                    {task.status_indicator === 'in_progress' ? (
                      <svg className="animate-spin text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1a7 7 0 1 0 7 7h-1A6 6 0 1 1 8 2V1z"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="text-gray-400">
                        <path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM3 8a5 5 0 1 1 10 0A5 5 0 0 1 3 8Zm7.038-2.034a.5.5 0 0 1 .12.697l-2.374 3.375a.5.5 0 0 1-.779.048l-1.25-1.375a.5.5 0 0 1 .74-.672l.83.913 2.016-2.865a.5.5 0 0 1 .697-.12Z"/>
                      </svg>
                    )}
                  </div>
                  {/* Vertical connecting line */}
                  {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
                </div>
                {/* Task content */}
                <div className="min-w-0 flex-1 pb-4">
                  {task.title && (
                    <div className="text-sm workflow-task-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.title}</ReactMarkdown>
                    </div>
                  )}
                  {task.content && (
                    <div className="text-sm text-gray-600 mt-1 workflow-task-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.content}</ReactMarkdown>
                    </div>
                  )}
                  {task.sources && task.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {task.sources.map((source, sidx) => (
                        <div key={sidx} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-md border border-gray-200">
                          {source.type === 'url' ? (
                            /* URL/citation icon */
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-gray-400">
                              <path d="M12.823 4.164a6.5 6.5 0 0 1 8.354 9.932l-2.121 2.121a1 1 0 0 1-1.414-1.414l2.12-2.121a4.5 4.5 0 1 0-6.363-6.364l-2.122 2.121a1 1 0 0 1-1.414-1.414l2.122-2.121a6.5 6.5 0 0 1 .838-.74Zm-1.646 16.672a6.5 6.5 0 0 1-8.354-9.932l2.121-2.121a1 1 0 0 1 1.414 1.414l-2.12 2.121a4.5 4.5 0 1 0 6.363 6.364l2.122-2.121a1 1 0 1 1 1.414 1.414l-2.122 2.121a6.5 6.5 0 0 1-.838.74ZM8.464 15.536a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 0 1 1.414 1.414l-5.657 5.657a1 1 0 0 1-1.414 0Z"/>
                            </svg>
                          ) : (
                            /* File icon */
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-gray-400">
                              <path fillRule="evenodd" d="M7 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8.828a3 3 0 0 0-.879-2.12l-3.828-3.83A3 3 0 0 0 13.172 2H7Zm5 2H7a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9h-3a3 3 0 0 1-3-3V4Zm5.586 4H15a1 1 0 0 1-1-1V4.414L17.586 8Z" clipRule="evenodd"/>
                            </svg>
                          )}
                          <span className="line-clamp-1">{source.filename || source.title || source.url}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Done indicator - always shown */}
          <div className="flex">
            <div className="flex flex-col items-center mr-3">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="text-gray-400">
                <path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM3 8a5 5 0 1 1 10 0A5 5 0 0 1 3 8Zm7.038-2.034a.5.5 0 0 1 .12.697l-2.374 3.375a.5.5 0 0 1-.779.048l-1.25-1.375a.5.5 0 0 1 .74-.672l.83.913 2.016-2.865a.5.5 0 0 1 .697-.12Z"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1 text-sm">Done</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface ChatKitProps {
  control: ChatKitControl;
  options?: Partial<ChatKitOptions>;
}

export function ChatKit({ control, options }: ChatKitProps) {
  const { state, sendMessage, createThread, stopStreaming, deleteThread, listSkills, retryAfterItem, sendFeedback, sendCustomAction, refreshThreads, uploadAttachment, deleteAttachment } = control;
  const [inputValue, setInputValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [threadMenuOpen, setThreadMenuOpen] = useState<string | null>(null);
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);

  // Delete confirmation dialog state
  const [deleteConfirmThread, setDeleteConfirmThread] = useState<{id: string, title: string} | null>(null);

  // Rename dialog state
  const [renameThreadData, setRenameThreadData] = useState<{id: string, title: string} | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Entity mention state (@)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<Entity[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Command/skill state (/)
  const [commandQuery, setCommandQuery] = useState<string | null>(null);
  const [commandIndex, setCommandIndex] = useState(0);
  const [commandStartPos, setCommandStartPos] = useState<number>(0);

  // Skills panel state
  const [showSkillsPanel, setShowSkillsPanel] = useState(false);
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsFetched, setSkillsFetched] = useState(false);

  // Copy feedback state
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  // Attachment state
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = useCallback((itemId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(itemId);
    setTimeout(() => setCopiedItemId(null), 1000);
  }, []);

  // Handle file selection and upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Copy files to array BEFORE resetting input (FileList is live)
    const files = Array.from(fileList);

    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    for (const file of files) {
      setUploadingCount(prev => prev + 1);
      try {
        const attachment = await uploadAttachment(file);
        setPendingAttachments(prev => [...prev, attachment]);
      } catch (err) {
        console.error('Failed to upload file:', err);
      } finally {
        setUploadingCount(prev => prev - 1);
      }
    }
  }, [uploadAttachment]);

  // Remove a pending attachment
  const removeAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    // Also delete from server
    deleteAttachment(attachmentId).catch(err => {
      console.error('[ChatKit] Failed to delete attachment from server:', err);
    });
  }, [deleteAttachment]);

  // Fetch skills when needed (panel opened or / typed)
  const fetchSkills = useCallback(async () => {
    if (skillsFetched || skillsLoading) return;
    setSkillsLoading(true);
    try {
      const fetchedSkills = await listSkills();
      setSkills(fetchedSkills);
      setSkillsFetched(true);
    } catch (e) {
      console.error('Failed to fetch skills:', e);
    } finally {
      setSkillsLoading(false);
    }
  }, [listSkills, skillsFetched, skillsLoading]);

  // Open skills panel and fetch skills
  const toggleSkillsPanel = useCallback(() => {
    if (!showSkillsPanel) {
      fetchSkills();
    }
    setShowSkillsPanel(!showSkillsPanel);
  }, [showSkillsPanel, fetchSkills]);

  // Use a skill - pre-fill composer
  const useSkill = useCallback((skill: SkillMetadata) => {
    setInputValue(`Use the ${skill.name} skill`);
    setShowSkillsPanel(false);
    textareaRef.current?.focus();
  }, []);

  // Find the user message before a given assistant message for retry
  const findPrecedingUserMessage = useCallback((assistantItemId: string): string | null => {
    const items = state.items;
    const idx = items.findIndex(i => i.id === assistantItemId);
    if (idx <= 0) return null;
    // Walk backwards to find the user message
    for (let i = idx - 1; i >= 0; i--) {
      if (items[i].type === 'user_message') {
        return items[i].id;
      }
    }
    return null;
  }, [state.items]);

  // Convert skills to command format for / menu
  const skillCommands = skills.map((skill) => ({
    id: skill.name,
    label: skill.name,
    description: skill.description,
    isSkill: true,
  }));

  // Filter commands based on query (use skills if available, otherwise fallback)
  const filteredCommands = commandQuery !== null
    ? (skills.length > 0 ? skillCommands : []).filter((cmd) =>
        cmd.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(commandQuery.toLowerCase())
      )
    : [];

  // Search for entities when mention query changes
  useEffect(() => {
    if (mentionQuery !== null && options?.entities?.onTagSearch) {
      options.entities.onTagSearch(mentionQuery).then((results) => {
        setMentionResults(results);
        setMentionIndex(0);
      });
    } else {
      setMentionResults([]);
    }
  }, [mentionQuery, options?.entities?.onTagSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputValue(value);

    const textBeforeCursor = value.slice(0, cursorPos);

    // Check for / command (at start of line or after space)
    const slashMatch = textBeforeCursor.match(/(?:^|\s)\/([^\s]*)$/);
    if (slashMatch) {
      setCommandQuery(slashMatch[1]);
      setCommandStartPos(cursorPos - slashMatch[1].length - 1);
      setMentionQuery(null); // Close mention menu if open
      // Fetch skills when / is typed
      fetchSkills();
      return;
    } else {
      setCommandQuery(null);
    }

    // Check for @ mention
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStartPos(cursorPos - atMatch[1].length - 1);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (entity: Entity) => {
    const before = inputValue.slice(0, mentionStartPos);
    const after = inputValue.slice(mentionStartPos + (mentionQuery?.length || 0) + 1);
    // Insert a placeholder that we'll convert to input_tag when sending
    const newValue = `${before}@[${entity.title}](entity:${entity.id})${after}`;
    setInputValue(newValue);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const insertCommand = (command: { id: string; label: string; isSkill?: boolean }) => {
    if (command.isSkill) {
      // For skills, pre-fill with "Use the X skill" instruction
      setInputValue(`Use the ${command.label} skill`);
    } else {
      // For regular commands, insert /command
      const before = inputValue.slice(0, commandStartPos);
      const after = inputValue.slice(commandStartPos + (commandQuery?.length || 0) + 1);
      const newValue = `${before}/${command.label} ${after}`.trim();
      setInputValue(newValue);
    }
    setCommandQuery(null);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    const hasContent = inputValue.trim() || pendingAttachments.length > 0;
    if (!hasContent || state.isStreaming) return;
    sendMessage(inputValue, { attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined });
    setInputValue('');
    setPendingAttachments([]);
    setMentionQuery(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle command navigation
    if (commandQuery !== null && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCommandIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertCommand(filteredCommands[commandIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setCommandQuery(null);
        return;
      }
    }

    // Handle mention navigation
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    createThread();
    setShowHistory(false);
  };

  // Show all items - don't filter out widgets, workflows, etc.
  const visibleItems = Array.isArray(state.items) ? state.items : [];

  return (
    <div className="relative h-full w-full flex justify-center">
      <div className="relative h-full w-full max-w-2xl min-w-[320px] overflow-hidden bg-white border-x border-gray-200">
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center px-3 py-2 relative">
          {/* Thread title - shown when a thread is selected */}
          <div className="flex-1 truncate">
            {state.currentThread?.title && state.currentThread.title !== 'Untitled' && (
              <span className="text-sm text-gray-600">{state.currentThread.title}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="New chat"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.6729 3.91275C16.8918 2.6938 18.8682 2.6938 20.0871 3.91275C21.3061 5.1317 21.3061 7.10801 20.0871 8.32696L14.1499 14.2642C13.3849 15.0291 12.3925 15.5254 11.3215 15.6784L9.14142 15.9898C8.82983 16.0343 8.51546 15.9295 8.29289 15.707C8.07033 15.4844 7.96554 15.17 8.01005 14.8584L8.32149 12.6784C8.47449 11.6074 8.97072 10.6149 9.7357 9.84994L15.6729 3.91275ZM18.6729 5.32696C18.235 4.88906 17.525 4.88906 17.0871 5.32696L11.1499 11.2642C10.6909 11.7231 10.3932 12.3186 10.3014 12.9612L10.1785 13.8213L11.0386 13.6985C11.6812 13.6067 12.2767 13.3089 12.7357 12.8499L18.6729 6.91275C19.1108 6.47485 19.1108 5.76486 18.6729 5.32696ZM11 3.99916C11.0004 4.55145 10.5531 4.99951 10.0008 4.99994C9.00227 5.00072 8.29769 5.00815 7.74651 5.06052C7.20685 5.11179 6.88488 5.20104 6.63803 5.32682C6.07354 5.61444 5.6146 6.07339 5.32698 6.63787C5.19279 6.90123 5.10062 7.24891 5.05118 7.85408C5.00078 8.47092 5 9.26324 5 10.3998V13.5998C5 14.7364 5.00078 15.5288 5.05118 16.1456C5.10062 16.7508 5.19279 17.0985 5.32698 17.3618C5.6146 17.9263 6.07354 18.3852 6.63803 18.6729C6.90138 18.807 7.24907 18.8992 7.85424 18.9487C8.47108 18.9991 9.26339 18.9998 10.4 18.9998H13.6C14.7366 18.9998 15.5289 18.9991 16.1458 18.9487C16.7509 18.8992 17.0986 18.807 17.362 18.6729C17.9265 18.3852 18.3854 17.9263 18.673 17.3618C18.7988 17.115 18.8881 16.793 18.9393 16.2533C18.9917 15.7021 18.9991 14.9976 18.9999 13.9991C19.0003 13.4468 19.4484 12.9994 20.0007 12.9998C20.553 13.0003 21.0003 13.4483 20.9999 14.0006C20.9991 14.9788 20.9932 15.7807 20.9304 16.4425C20.8664 17.1159 20.7385 17.7135 20.455 18.2698C19.9757 19.2106 19.2108 19.9755 18.27 20.4549C17.6777 20.7567 17.0375 20.8825 16.3086 20.942C15.6008 20.9999 14.7266 20.9999 13.6428 20.9998H10.3572C9.27339 20.9999 8.39925 20.9999 7.69138 20.942C6.96253 20.8825 6.32234 20.7567 5.73005 20.4549C4.78924 19.9755 4.02433 19.2106 3.54497 18.2698C3.24318 17.6775 3.11737 17.0373 3.05782 16.3085C2.99998 15.6006 2.99999 14.7264 3 13.6426V10.357C2.99999 9.27325 2.99998 8.3991 3.05782 7.69122C3.11737 6.96237 3.24318 6.32218 3.54497 5.72989C4.02433 4.78908 4.78924 4.02418 5.73005 3.54481C6.28633 3.26137 6.88399 3.13346 7.55735 3.06948C8.21919 3.0066 9.02103 3.00071 9.99922 2.99994C10.5515 2.99951 10.9996 3.44688 11 3.99916Z"/>
              </svg>
            </button>
            <button
              onClick={() => {
                if (!showHistory) refreshThreads();
                setShowHistory(!showHistory);
              }}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="History"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M2.954 7.807A1 1 0 0 0 3.968 9c.064.002.13-.003.196-.014l3-.5a1 1 0 0 0-.328-1.972l-.778.13a8 8 0 1 1-2.009 6.247 1 1 0 0 0-1.988.219C2.614 18.11 6.852 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2a9.975 9.975 0 0 0-7.434 3.312l-.08-.476a1 1 0 0 0-1.972.328l.44 2.643ZM12 7a1 1 0 0 1 1 1v3.586l2.207 2.207a1 1 0 0 1-1.414 1.414l-2.5-2.5A1 1 0 0 1 11 12V8a1 1 0 0 1 1-1Z" clipRule="evenodd"/>
              </svg>
            </button>
            <button
              onClick={toggleSkillsPanel}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="Skills"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </button>
          </div>

          {/* Skills Panel Dropdown */}
          {showSkillsPanel && (
            <div className="absolute top-12 right-2 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="px-4 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Skills</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {skillsLoading ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                ) : skills.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No skills available</div>
                ) : (
                  skills.map((skill) => (
                    <button
                      key={skill.name}
                      onClick={() => useSkill(skill)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 font-mono">/</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800">{skill.name}</div>
                          <div className="text-sm text-gray-500 line-clamp-2">{skill.description}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </header>

        {/* History Panel - Full Page */}
        {showHistory && (
          <div className="absolute inset-0 bg-white z-20 flex flex-col">
            {/* Header */}
            <header className="flex items-center px-4 py-3 border-b border-gray-100">
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 mr-3"
                aria-label="Close history"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <span>Chat history</span>
            </header>

            {/* Back link */}
            <button
              onClick={() => setShowHistory(false)}
              className="flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              <span>Back</span>
            </button>

            {/* New chat entry - only shown when a thread is currently selected */}
            {state.currentThread && (
              <button
                onClick={() => {
                  createThread();
                  setShowHistory(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-left bg-gray-100 hover:bg-gray-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.6729 3.91275C16.8918 2.6938 18.8682 2.6938 20.0871 3.91275C21.3061 5.1317 21.3061 7.10801 20.0871 8.32696L14.1499 14.2642C13.3849 15.0291 12.3925 15.5254 11.3215 15.6784L9.14142 15.9898C8.82983 16.0343 8.51546 15.9295 8.29289 15.707C8.07033 15.4844 7.96554 15.17 8.01005 14.8584L8.32149 12.6784C8.47449 11.6074 8.97072 10.6149 9.7357 9.84994L15.6729 3.91275ZM18.6729 5.32696C18.235 4.88906 17.525 4.88906 17.0871 5.32696L11.1499 11.2642C10.6909 11.7231 10.3932 12.3186 10.3014 12.9612L10.1785 13.8213L11.0386 13.6985C11.6812 13.6067 12.2767 13.3089 12.7357 12.8499L18.6729 6.91275C19.1108 6.47485 19.1108 5.76486 18.6729 5.32696ZM11 3.99916C11.0004 4.55145 10.5531 4.99951 10.0008 4.99994C9.00227 5.00072 8.29769 5.00815 7.74651 5.06052C7.20685 5.11179 6.88488 5.20104 6.63803 5.32682C6.07354 5.61444 5.6146 6.07339 5.32698 6.63787C5.19279 6.90123 5.10062 7.24891 5.05118 7.85408C5.00078 8.47092 5 9.26324 5 10.3998V13.5998C5 14.7364 5.00078 15.5288 5.05118 16.1456C5.10062 16.7508 5.19279 17.0985 5.32698 17.3618C5.6146 17.9263 6.07354 18.3852 6.63803 18.6729C6.90138 18.807 7.24907 18.8992 7.85424 18.9487C8.47108 18.9991 9.26339 18.9998 10.4 18.9998H13.6C14.7366 18.9998 15.5289 18.9991 16.1458 18.9487C16.7509 18.8992 17.0986 18.807 17.362 18.6729C17.9265 18.3852 18.3854 17.9263 18.673 17.3618C18.7988 17.115 18.8881 16.793 18.9393 16.2533C18.9917 15.7021 18.9991 14.9976 18.9999 13.9991C19.0003 13.4468 19.4484 12.9994 20.0007 12.9998C20.553 13.0003 21.0003 13.4483 20.9999 14.0006C20.9991 14.9788 20.9932 15.7807 20.9304 16.4425C20.8664 17.1159 20.7385 17.7135 20.455 18.2698C19.9757 19.2106 19.2108 19.9755 18.27 20.4549C17.6777 20.7567 17.0375 20.8825 16.3086 20.942C15.6008 20.9999 14.7266 20.9999 13.6428 20.9998H10.3572C9.27339 20.9999 8.39925 20.9999 7.69138 20.942C6.96253 20.8825 6.32234 20.7567 5.73005 20.4549C4.78924 19.9755 4.02433 19.2106 3.54497 18.2698C3.24318 17.6775 3.11737 17.0373 3.05782 16.3085C2.99998 15.6006 2.99999 14.7264 3 13.6426V10.357C2.99999 9.27325 2.99998 8.3991 3.05782 7.69122C3.11737 6.96237 3.24318 6.32218 3.54497 5.72989C4.02433 4.78908 4.78924 4.02418 5.73005 3.54481C6.28633 3.26137 6.88399 3.13346 7.55735 3.06948C8.21919 3.0066 9.02103 3.00071 9.99922 2.99994C10.5515 2.99951 10.9996 3.44688 11 3.99916Z"/>
                </svg>
                <span>New chat</span>
              </button>
            )}

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
              {state.threads.length === 0 ? (
                <div className="px-4 py-8 text-gray-500 text-sm">No conversations yet</div>
              ) : (
                <>
                  {groupThreadsByTime(state.threads).map((group) => (
                    <div key={group.label}>
                      <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">
                        {group.label}
                      </div>
                      {group.threads.map((thread) => (
                        <div
                          key={thread.id}
                          className="relative flex items-center hover:bg-gray-50 group"
                          onMouseEnter={() => setHoveredThread(thread.id)}
                          onMouseLeave={() => {
                            setHoveredThread(null);
                            if (threadMenuOpen === thread.id) setThreadMenuOpen(null);
                          }}
                        >
                          <button
                            onClick={() => {
                              control.selectThread(thread.id);
                              setShowHistory(false);
                            }}
                            className="flex-1 text-left px-4 py-3"
                          >
                            <span className="text-base">{thread.title || 'Untitled'}</span>
                          </button>

                          {/* Kebab menu button - visible on hover */}
                          {(hoveredThread === thread.id || threadMenuOpen === thread.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setThreadMenuOpen(threadMenuOpen === thread.id ? null : thread.id);
                              }}
                              className="absolute right-2 p-2 hover:bg-gray-200 rounded"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2"/>
                                <circle cx="12" cy="12" r="2"/>
                                <circle cx="19" cy="12" r="2"/>
                              </svg>
                            </button>
                          )}

                          {/* Dropdown menu */}
                          {threadMenuOpen === thread.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 min-w-[140px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameThreadData({ id: thread.id, title: thread.title || '' });
                                  setRenameValue(thread.title || '');
                                  setThreadMenuOpen(null);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M15.6729 3.91275C16.8918 2.6938 18.8682 2.6938 20.0871 3.91275C21.3061 5.1317 21.3061 7.10801 20.0871 8.32696L8.68662 19.7175C8.28391 20.1202 7.78437 20.4089 7.23535 20.5545L3.29879 21.5998C2.93862 21.6953 2.55544 21.5903 2.29289 21.3278C2.03035 21.0652 1.92526 20.682 2.02076 20.3219L3.06604 16.3853C3.21168 15.8363 3.50041 15.3367 3.90312 14.934L15.6729 3.91275Z"/>
                                </svg>
                                <span>Rename</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmThread({ id: thread.id, title: thread.title || 'Untitled' });
                                  setThreadMenuOpen(null);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M7 4V2h10v2h5v2h-2v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6H2V4h5ZM6 6v14h12V6H6Zm3 3h2v8H9V9Zm4 0h2v8h-2V9Z"/>
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {/* Top fade gradient - absolute so it doesn't affect scroll height */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
          {visibleItems.length === 0 && !state.isStreaming ? (
            <div className="h-full flex items-center justify-center">
              <h1 className="text-2xl font-semibold text-gray-900">
                {options?.startScreen?.greeting || 'What are you working on?'}
              </h1>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
              {visibleItems.map((item, index) => {
                // Check if this is the last item in an assistant turn
                // (next item is user_message or we're at the end)
                const nextItem = visibleItems[index + 1];
                const isLastInAssistantTurn = !nextItem || nextItem.type === 'user_message';

                return (
                <article key={item.id}>
                  {item.type === 'user_message' && (
                    <div className="flex flex-col items-end gap-2">
                      {/* Attachments */}
                      {item.attachments && item.attachments.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2 max-w-[85%]">
                          {item.attachments.map((attachment, idx) => {
                            const isPdf = attachment.mime_type === 'application/pdf';
                            const isImage = attachment.type === 'image' || attachment.mime_type?.startsWith('image/');
                            const fileExt = attachment.name?.split('.').pop()?.toUpperCase() || 'FILE';

                            if (isImage && attachment.preview_url) {
                              return (
                                <div key={idx} className="overflow-hidden rounded-xl">
                                  <div className="w-[120px] h-[120px]">
                                    <img
                                      src={attachment.preview_url}
                                      alt={attachment.name || 'Attachment'}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-xl min-w-[180px] max-w-[280px]">
                                {/* File type icon */}
                                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
                                  {isPdf ? (
                                    <svg width="22" height="16" viewBox="0 0 21 8" fill="currentColor" className="text-red-500">
                                      <path d="M1.82923 5.25V8H-0.00776558V0.101999H3.32523C5.18423 0.101999 6.33923 0.982 6.33923 2.676C6.33923 4.359 5.18423 5.25 3.32523 5.25H1.82923ZM1.82923 3.71H3.22623C4.09523 3.71 4.53523 3.325 4.53523 2.676C4.53523 2.027 4.09523 1.653 3.22623 1.653H1.82923V3.71ZM7.10356 8V0.101999H9.90856C12.4166 0.101999 13.9456 1.642 13.9456 4.051C13.9456 6.46 12.4166 8 9.90856 8H7.10356ZM8.89656 6.449H9.90856C11.3276 6.449 12.1306 5.503 12.1306 4.051C12.1306 2.599 11.3276 1.653 9.89756 1.653H8.89656V6.449ZM16.6419 8H14.8379V0.101999H20.3709V1.675H16.6419V3.468H19.7439V5.008H16.6419V8Z"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500">
                                      <path fillRule="evenodd" d="M7 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8.828a3 3 0 0 0-.879-2.12l-3.828-3.83A3 3 0 0 0 13.172 2H7Zm5 2H7a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9h-3a3 3 0 0 1-3-3V4Zm5.586 4H15a1 1 0 0 1-1-1V4.414L17.586 8Z" clipRule="evenodd"/>
                                    </svg>
                                  )}
                                </div>
                                {/* File info */}
                                <div className="overflow-hidden">
                                  <div className="text-sm text-gray-700 truncate" title={attachment.name}>
                                    {attachment.name}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {isPdf ? 'PDF' : fileExt}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Message text */}
                      <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[85%]">
                        <span className="text-gray-700">{renderUserMessageContent(item.content, {
                          onClick: options?.entities?.onClick,
                          onRequestPreview: options?.entities?.onRequestPreview,
                        })}</span>
                      </div>
                    </div>
                  )}
                  {item.type === 'assistant_message' && (
                    <div>
                      <div className={`${state.isStreaming && item.status === 'in_progress' ? 'streaming-cursor' : ''}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {extractAssistantMessageText(item.content)}
                        </ReactMarkdown>
                      </div>
                      {/* Action icons - only show at end of assistant turn */}
                      {item.status !== 'in_progress' && isLastInAssistantTurn && (
                        <div className="flex items-center gap-1 mt-2">
                          <button
                            onClick={() => handleCopy(item.id, extractAssistantMessageText(item.content))}
                            className="p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded"
                            aria-label="Copy"
                          >
                            {copiedItemId === item.id ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 animate-in fade-in duration-200">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.7587 2H16.2413C17.0463 1.99999 17.7106 1.99998 18.2518 2.04419C18.8139 2.09012 19.3306 2.18868 19.816 2.43597C20.5686 2.81947 21.1805 3.43139 21.564 4.18404C21.8113 4.66937 21.9099 5.18608 21.9558 5.74817C22 6.28936 22 6.95372 22 7.75868V11.2413C22 12.0463 22 12.7106 21.9558 13.2518C21.9099 13.8139 21.8113 14.3306 21.564 14.816C21.1805 15.5686 20.5686 16.1805 19.816 16.564C19.3306 16.8113 18.8139 16.9099 18.2518 16.9558C17.8906 16.9853 17.4745 16.9951 16.9984 16.9984C16.9951 17.4745 16.9853 17.8906 16.9558 18.2518C16.9099 18.8139 16.8113 19.3306 16.564 19.816C16.1805 20.5686 15.5686 21.1805 14.816 21.564C14.3306 21.8113 13.8139 21.9099 13.2518 21.9558C12.7106 22 12.0463 22 11.2413 22H7.75868C6.95372 22 6.28936 22 5.74818 21.9558C5.18608 21.9099 4.66937 21.8113 4.18404 21.564C3.43139 21.1805 2.81947 20.5686 2.43597 19.816C2.18868 19.3306 2.09012 18.8139 2.04419 18.2518C1.99998 17.7106 1.99999 17.0463 2 16.2413V12.7587C1.99999 11.9537 1.99998 11.2894 2.04419 10.7482C2.09012 10.1861 2.18868 9.66937 2.43597 9.18404C2.81947 8.43139 3.43139 7.81947 4.18404 7.43598C4.66937 7.18868 5.18608 7.09012 5.74817 7.04419C6.10939 7.01468 6.52548 7.00487 7.00162 7.00162C7.00487 6.52548 7.01468 6.10939 7.04419 5.74817C7.09012 5.18608 7.18868 4.66937 7.43598 4.18404C7.81947 3.43139 8.43139 2.81947 9.18404 2.43597C9.66937 2.18868 10.1861 2.09012 10.7482 2.04419C11.2894 1.99998 11.9537 1.99999 12.7587 2ZM9.00176 7L11.2413 7C12.0463 6.99999 12.7106 6.99998 13.2518 7.04419C13.8139 7.09012 14.3306 7.18868 14.816 7.43598C15.5686 7.81947 16.1805 8.43139 16.564 9.18404C16.8113 9.66937 16.9099 10.1861 16.9558 10.7482C17 11.2894 17 11.9537 17 12.7587V14.9982C17.4455 14.9951 17.7954 14.9864 18.089 14.9624C18.5274 14.9266 18.7516 14.8617 18.908 14.782C19.2843 14.5903 19.5903 14.2843 19.782 13.908C19.8617 13.7516 19.9266 13.5274 19.9624 13.089C19.9992 12.6389 20 12.0566 20 11.2V7.8C20 6.94342 19.9992 6.36113 19.9624 5.91104C19.9266 5.47262 19.8617 5.24842 19.782 5.09202C19.5903 4.7157 19.2843 4.40973 18.908 4.21799C18.7516 4.1383 18.5274 4.07337 18.089 4.03755C17.6389 4.00078 17.0566 4 16.2 4H12.8C11.9434 4 11.3611 4.00078 10.911 4.03755C10.4726 4.07337 10.2484 4.1383 10.092 4.21799C9.7157 4.40973 9.40973 4.7157 9.21799 5.09202C9.1383 5.24842 9.07337 5.47262 9.03755 5.91104C9.01357 6.20463 9.00489 6.55447 9.00176 7ZM5.91104 9.03755C5.47262 9.07337 5.24842 9.1383 5.09202 9.21799C4.7157 9.40973 4.40973 9.7157 4.21799 10.092C4.1383 10.2484 4.07337 10.4726 4.03755 10.911C4.00078 11.3611 4 11.9434 4 12.8V16.2C4 17.0566 4.00078 17.6389 4.03755 18.089C4.07337 18.5274 4.1383 18.7516 4.21799 18.908C4.40973 19.2843 4.7157 19.5903 5.09202 19.782C5.24842 19.8617 5.47262 19.9266 5.91104 19.9624C6.36113 19.9992 6.94342 20 7.8 20H11.2C12.0566 20 12.6389 19.9992 13.089 19.9624C13.5274 19.9266 13.7516 19.8617 13.908 19.782C14.2843 19.5903 14.5903 19.2843 14.782 18.908C14.8617 18.7516 14.9266 18.5274 14.9624 18.089C14.9992 17.6389 15 17.0566 15 16.2V12.8C15 11.9434 14.9992 11.3611 14.9624 10.911C14.9266 10.4726 14.8617 10.2484 14.782 10.092C14.5903 9.7157 14.2843 9.40973 13.908 9.21799C13.7516 9.1383 13.5274 9.07337 13.089 9.03755C12.6389 9.00078 12.0566 9 11.2 9H7.8C6.94342 9 6.36113 9.00078 5.91104 9.03755Z"/>
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => sendFeedback([item.id], 'positive')}
                            className="p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded"
                            aria-label="Thumbs up"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.1318 2.50389C12.3321 2.15338 12.7235 1.95768 13.1241 2.00775L13.5779 2.06447C16.045 2.37286 17.636 4.83353 16.9048 7.20993L16.3519 9.00709C16.6909 9.01325 16.9965 9.02475 17.2705 9.04623C17.8749 9.09359 18.4313 9.19498 18.9358 9.46056C19.976 10.0082 20.7227 10.9858 20.9774 12.1335C21.1009 12.6901 21.0523 13.2536 20.9389 13.8491C20.8283 14.4307 20.6346 15.1409 20.397 16.0119L19.9295 17.7261C19.9127 17.7876 19.8962 17.8484 19.8799 17.9083C19.5842 18.996 19.3618 19.8139 18.8745 20.4449C18.4468 20.9987 17.8813 21.4306 17.2345 21.6976C16.4975 22.0017 15.6499 22.001 14.5227 22.0001C12.6014 21.9986 10.6801 22 8.75877 22C7.95381 22 7.28946 22 6.74827 21.9558C6.18617 21.9099 5.66947 21.8113 5.18413 21.564C4.43149 21.1805 3.81956 20.5686 3.43607 19.816C3.18878 19.3306 3.09022 18.8139 3.04429 18.2518C3.00007 17.7106 3.00008 17.0463 3.0001 16.2413L3.0001 14C3.0001 13.9535 3.00007 13.9076 3.00005 13.8624C2.99962 13.067 2.9993 12.4764 3.13639 11.9647C3.50626 10.5844 4.58445 9.50616 5.96483 9.13629C6.47647 8.99919 7.06713 8.99951 7.86251 8.99994C7.9077 8.99997 7.95355 8.99999 8.00009 8.99999C8.25961 8.99999 8.49923 8.86094 8.62799 8.63561L12.1318 2.50389ZM7.53112 19.9917C7.36082 19.6951 7.22724 19.3743 7.13639 19.0353C6.99929 18.5236 6.99961 17.933 7.00004 17.1376C7.00007 17.0924 7.00009 17.0465 7.00009 17V11.0099C6.74252 11.019 6.60125 11.0363 6.48246 11.0681C5.79227 11.2531 5.25318 11.7922 5.06824 12.4824C5.00869 12.7046 5.0001 13.0056 5.0001 14V16.2C5.0001 17.0566 5.00087 17.6389 5.03765 18.089C5.07347 18.5274 5.13839 18.7516 5.21808 18.908C5.40983 19.2843 5.71579 19.5903 6.09212 19.782C6.24852 19.8617 6.47272 19.9266 6.91113 19.9624C7.09307 19.9773 7.2966 19.9863 7.53112 19.9917ZM9.00009 10.8098V17C9.00009 17.9944 9.00868 18.2954 9.06824 18.5176C9.25317 19.2078 9.79227 19.7469 10.4825 19.9319C10.7047 19.9914 11.0057 20 12.0001 20H14.3339C15.7376 20 16.1498 19.9816 16.4716 19.8488C16.795 19.7153 17.0778 19.4994 17.2916 19.2225C17.5044 18.9469 17.6306 18.5541 18 17.1998L18.4566 15.5255C18.7077 14.605 18.8799 13.9706 18.9742 13.4752C19.0675 12.9849 19.062 12.7341 19.0249 12.5668C18.8975 11.9929 18.5242 11.5041 18.0041 11.2303C17.8524 11.1504 17.6118 11.0791 17.1143 11.0401C16.6115 11.0007 15.9542 11 15.0001 11C14.6828 11 14.3842 10.8494 14.1957 10.5941C14.0072 10.3388 13.951 10.0092 14.0443 9.70591L14.9933 6.62176C15.3385 5.49984 14.6485 4.34036 13.532 4.08468L10.3645 9.62789C10.0523 10.1742 9.567 10.5859 9.00009 10.8098Z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => sendFeedback([item.id], 'negative')}
                            className="p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded"
                            aria-label="Thumbs down"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.8682 21.4963C11.6679 21.8468 11.2765 22.0425 10.876 21.9924L10.4222 21.9357C7.95506 21.6273 6.36403 19.1667 7.09523 16.7903L7.6482 14.9931C7.30914 14.9869 7.00362 14.9754 6.72955 14.954C6.12518 14.9066 5.56874 14.8052 5.06429 14.5396C4.02404 13.992 3.27737 13.0144 3.02271 11.8667C2.89921 11.3101 2.94781 10.7466 3.06113 10.1511C3.17181 9.56949 3.3655 8.85933 3.60307 7.98827L4.07057 6.27411C4.08736 6.21255 4.10387 6.15182 4.12016 6.09191C4.41586 5.00424 4.63825 4.18627 5.12556 3.55527C5.55326 3.00147 6.11875 2.56955 6.76557 2.30264C7.50256 1.99852 8.35021 1.9992 9.47737 2.0001C11.3987 2.00163 13.32 2.0002 15.2413 2.0002C16.0463 2.00018 16.7106 2.00017 17.2518 2.04439C17.8139 2.09031 18.3306 2.18888 18.8159 2.43617C19.5686 2.81966 20.1805 3.43158 20.564 4.18423C20.8113 4.66957 20.9099 5.18627 20.9558 5.74837C21 6.28957 21 6.95393 21 7.7589V10.0002C21 10.0467 21 10.0926 21 10.1378C21.0005 10.9332 21.0008 11.5238 20.8637 12.0355C20.4938 13.4158 19.4156 14.494 18.0352 14.8639C17.5236 15.001 16.9329 15.0007 16.1376 15.0002C16.0924 15.0002 16.0465 15.0002 16 15.0002C15.7405 15.0002 15.5008 15.1393 15.3721 15.3646L11.8682 21.4963ZM16.469 4.00847C16.6393 4.30504 16.7728 4.62587 16.8637 4.96492C17.0008 5.47657 17.0005 6.06723 17 6.86262C17 6.90781 17 6.95366 17 7.0002V12.9903C17.2576 12.9812 17.3988 12.9639 17.5176 12.9321C18.2078 12.7471 18.7469 12.208 18.9318 11.5178C18.9914 11.2956 19 10.9946 19 10.0002V7.8002C19 6.94362 18.9992 6.36132 18.9624 5.91123C18.9266 5.47282 18.8617 5.24861 18.782 5.09222C18.5902 4.71589 18.2843 4.40993 17.908 4.21818C17.7516 4.13849 17.5274 4.07357 17.0889 4.03775C16.907 4.02288 16.7035 4.0139 16.469 4.00847ZM15 13.1904V7.0002C15 6.00584 14.9914 5.70484 14.9318 5.48256C14.7469 4.79237 14.2078 4.25328 13.5176 4.06834C13.2953 4.00878 12.9943 4.0002 12 4.0002H9.6662C8.26249 4.0002 7.85028 4.01862 7.52847 4.15141C7.20506 4.28487 6.92231 4.50083 6.70847 4.77773C6.49568 5.05326 6.36944 5.4461 6.0001 6.80035L5.54345 8.47473C5.29241 9.39521 5.12015 10.0296 5.02588 10.525C4.93258 11.0153 4.93809 11.2661 4.97522 11.4334C5.10255 12.0073 5.47588 12.4961 5.99601 12.7699C6.14767 12.8498 6.38823 12.9211 6.8858 12.9601C7.38855 12.9995 8.04588 13.0002 8.99998 13.0002C9.31733 13.0002 9.61583 13.1508 9.80437 13.4061C9.99291 13.6614 10.0491 13.991 9.95576 14.2943L9.00679 17.3784C8.66159 18.5003 9.35156 19.6598 10.468 19.9155L13.6356 14.3723C13.9478 13.826 14.4331 13.4143 15 13.1904Z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              const userMsgId = findPrecedingUserMessage(item.id);
                              if (userMsgId) retryAfterItem(userMsgId);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded"
                            aria-label="Regenerate"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3.06956 10.8763C3.6233 6.43564 7.40965 3 12 3C14.2823 3 16.4028 3.85067 18.0118 5.25439V4C18.0118 3.44772 18.4595 3 19.0118 3C19.5641 3 20.0118 3.44772 20.0118 4V8C20.0118 8.55228 19.5641 9 19.0118 9H15C14.4477 9 14 8.55228 14 8C14 7.44772 14.4477 7 15 7H16.9571C15.6756 5.76379 13.9101 5 12 5C8.43107 5 5.48465 7.67174 5.05419 11.1237C4.98585 11.6718 4.48617 12.0607 3.93813 11.9923C3.39009 11.924 3.00122 11.4243 3.06956 10.8763ZM20.0618 12.0077C20.6099 12.076 20.9987 12.5757 20.9304 13.1237C20.3767 17.5644 16.5903 21 12 21C9.72321 21 7.6076 20.1535 5.99998 18.7559V20C5.99998 20.5523 5.55226 21 4.99998 21C4.44769 21 3.99998 20.5523 3.99998 20V16C3.99998 15.4477 4.44769 15 4.99998 15H8.99998C9.55226 15 9.99998 15.4477 9.99998 16C9.99998 16.5523 9.55226 17 8.99998 17H7.04283C8.32432 18.2362 10.0899 19 12 19C15.5689 19 18.5153 16.3283 18.9458 12.8763C19.0141 12.3282 19.5138 11.9393 20.0618 12.0077Z"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {item.type === 'workflow' && item.workflow && (
                    <WorkflowDisplay workflow={item.workflow} expanded={item.workflow.expanded} />
                  )}
                  {item.type === 'widget' && item.widget && (
                    <div className="my-3">
                      <WidgetRenderer
                        widget={item.widget}
                        itemId={item.id}
                        onAction={(action) => {
                          // Call widgets.onAction callback if provided
                          if (options?.widgets?.onAction) {
                            options.widgets.onAction(action, item);
                          } else {
                            // Default: send to server
                            sendCustomAction(item.id, action);
                          }
                        }}
                      />
                    </div>
                  )}
                </article>
                );
              })}

              {state.isStreaming && state.progressText && (
                <div className="text-sm text-gray-500">{state.progressText}</div>
              )}
            </div>
          )}
        </main>

        {/* Composer */}
        <footer className="px-4 py-4 relative">
            {/* Command/skill dropdown */}
            {commandQuery !== null && filteredCommands.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-30">
                <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  {skills.length > 0 ? 'Skills' : 'Commands'}
                </div>
                {filteredCommands.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => insertCommand(cmd)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 ${
                      i === commandIndex ? 'bg-gray-100' : ''
                    }`}
                  >
                    <span className="text-gray-400 font-mono">/</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-sm text-gray-500">{cmd.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state for commands/skills */}
            {commandQuery !== null && commandQuery.length > 0 && filteredCommands.length === 0 && !skillsLoading && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 z-30">
                No {skills.length > 0 ? 'skills' : 'commands'} matching "/{commandQuery}"
              </div>
            )}

            {/* Loading state for skills */}
            {commandQuery !== null && skillsLoading && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 z-30">
                Loading skills...
              </div>
            )}

            {/* Entity mention dropdown */}
            {mentionQuery !== null && mentionResults.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-30">
                <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  Mentions
                </div>
                {mentionResults.map((entity, i) => (
                  <button
                    key={entity.id}
                    onClick={() => insertMention(entity)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 ${
                      i === mentionIndex ? 'bg-gray-100' : ''
                    }`}
                  >
                    {entity.icon && <span className="text-lg">{entity.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{entity.title}</div>
                      {entity.subtitle && (
                        <div className="text-sm text-gray-500 truncate">{entity.subtitle}</div>
                      )}
                    </div>
                    {entity.type && (
                      <span className="text-xs text-gray-400 uppercase">{entity.type}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Empty state when searching but no results */}
            {mentionQuery !== null && mentionQuery.length > 0 && mentionResults.length === 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 z-30">
                No results for "@{mentionQuery}"
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />

            {/* Pending attachments display */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingAttachments.map((attachment) => {
                  const isPdf = attachment.mime_type === 'application/pdf';
                  const isImage = attachment.type === 'image' || attachment.mime_type?.startsWith('image/');
                  const ext = attachment.name?.split('.').pop()?.toLowerCase() || '';
                  const isCode = ['md', 'markdown', 'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'json', 'yaml', 'yml', 'toml', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'sql', 'graphql', 'vue', 'svelte', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'pl', 'pm', 'ex', 'exs', 'erl', 'hs', 'ml', 'clj', 'lisp', 'el', 'vim', 'conf', 'ini', 'env', 'gitignore', 'dockerfile', 'makefile'].includes(ext) ||
                    attachment.mime_type?.includes('text/') ||
                    attachment.mime_type?.includes('application/json') ||
                    attachment.mime_type?.includes('application/javascript') ||
                    attachment.mime_type?.includes('application/xml');
                  const isDocument = ['doc', 'docx', 'odt', 'rtf', 'txt', 'pages'].includes(ext) ||
                    attachment.mime_type?.includes('wordprocessingml') ||
                    attachment.mime_type?.includes('msword') ||
                    attachment.mime_type?.includes('opendocument.text');

                  // Determine category and icon type
                  let category = ext.toUpperCase() || 'File';
                  let iconType: 'pdf' | 'document' | 'code' | 'file' = 'file';
                  if (isPdf) {
                    category = 'PDF';
                    iconType = 'pdf';
                  } else if (isCode) {
                    category = 'Code';
                    iconType = 'code';
                  } else if (isDocument) {
                    category = 'Document';
                    iconType = 'document';
                  } else if (isImage) {
                    category = 'Image';
                  }

                  // For images, show thumbnail preview
                  if (isImage && attachment.preview_url) {
                    return (
                      <div key={attachment.id} className="relative">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                          <img
                            src={attachment.preview_url}
                            alt={attachment.name}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </div>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 z-10"
                          aria-label="Remove attachment"
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4l8 8M12 4l-8 8"/>
                          </svg>
                        </button>
                      </div>
                    );
                  }

                  // For non-images, show icon + file info
                  return (
                    <div key={attachment.id} className="relative flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-xl min-w-[180px] max-w-[280px]">
                      {/* File type icon */}
                      {iconType === 'code' ? (
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700 text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 18 22 12 16 6"/>
                            <polyline points="8 6 2 12 8 18"/>
                          </svg>
                        </div>
                      ) : iconType === 'pdf' ? (
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-red-500">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M7 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8.828a3 3 0 0 0-.879-2.12l-3.828-3.83A3 3 0 0 0 13.172 2H7Zm5 2H7a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9h-3a3 3 0 0 1-3-3V4Zm5.586 4H15a1 1 0 0 1-1-1V4.414L17.586 8ZM8 12a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H9Z"/>
                          </svg>
                        </div>
                      ) : iconType === 'document' ? (
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-blue-500">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <g fillRule="evenodd" clipRule="evenodd">
                              <path d="M8 10a1 1 0 0 1 1-1h6a1 1 0 0 1 0 2H9a1 1 0 0 1-1-1Zm0 4a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Z"/>
                              <path d="M14.724 4.055c-.203-.049-.43-.055-1.212-.055H9.3c-.857 0-1.439 0-1.889.038-.438.035-.663.1-.819.18a2 2 0 0 0-.874.874c-.08.156-.145.38-.18.82C5.5 6.361 5.5 6.942 5.5 7.8v8.4c0 .857 0 1.439.038 1.889.035.438.1.663.18.819a2 2 0 0 0 .874.874c.156.08.38.145.819.18C7.861 20 8.443 20 9.3 20h5.4c.857 0 1.439 0 1.889-.038.438-.035.663-.1.819-.18a2 2 0 0 0 .874-.874c.08-.156.145-.38.18-.819.037-.45.038-1.032.038-1.889V8.988c0-.781-.006-1.009-.055-1.212-.05-.204-.13-.4-.24-.578-.109-.179-.265-.344-.818-.897l-1.188-1.188c-.553-.552-.718-.709-.897-.818a2.002 2.002 0 0 0-.578-.24ZM13.614 2c.635 0 1.114 0 1.577.11a4 4 0 0 1 1.156.48c.406.248.745.588 1.194 1.037l.072.072 1.188 1.188.072.072c.45.449.789.788 1.038 1.194a4 4 0 0 1 .479 1.156c.11.463.11.942.11 1.577v7.355c0 .805 0 1.47-.044 2.01-.046.563-.145 1.08-.392 1.565a4 4 0 0 1-1.748 1.748c-.485.247-1.002.346-1.564.392-.541.044-1.206.044-2.01.044H9.258c-.805 0-1.47 0-2.01-.044-.563-.046-1.08-.145-1.565-.392a4 4 0 0 1-1.748-1.748c-.247-.485-.346-1.002-.392-1.564-.044-.541-.044-1.206-.044-2.01V7.758c0-.805 0-1.47.044-2.01.046-.563.145-1.08.392-1.565a4 4 0 0 1 1.748-1.748c.485-.247 1.002-.346 1.564-.392C7.79 2 8.454 2 9.258 2h4.356Z"/>
                            </g>
                          </svg>
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-gray-500">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M7 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8.828a3 3 0 0 0-.879-2.12l-3.828-3.83A3 3 0 0 0 13.172 2H7Zm5 2H7a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9h-3a3 3 0 0 1-3-3V4Zm5.586 4H15a1 1 0 0 1-1-1V4.414L17.586 8Z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      )}
                      {/* File info */}
                      <div className="overflow-hidden flex-1">
                        <div className="text-sm text-gray-700 truncate" title={attachment.name}>
                          {attachment.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {category}
                        </div>
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700"
                        aria-label="Remove attachment"
                      >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4l8 8M12 4l-8 8"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {uploadingCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Uploading...
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-gray-200 rounded-full"
                aria-label="Add attachment"
              >
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.335 16.5v-5.835H3.5a.665.665 0 1 1 0-1.33h5.835V3.5a.665.665 0 0 1 1.33 0v5.835H16.5l.134.014a.665.665 0 0 1 0 1.302l-.134.014h-5.835V16.5a.665.665 0 1 1-1.33 0Z"/>
                </svg>
              </button>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={options?.composer?.placeholder || 'Describe what you want to do'}
                rows={1}
                className="flex-1 bg-transparent border-none resize-none focus:outline-none text-gray-900 placeholder-gray-400 py-1.5 text-sm"
                style={{ minHeight: '24px', maxHeight: '120px' }}
              />

              {state.isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="p-1.5 bg-black text-white rounded-lg"
                  aria-label="Stop"
                >
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="5" y="5" width="10" height="10" rx="1"/>
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() && pendingAttachments.length === 0}
                  className="p-1.5 bg-black text-white rounded-lg disabled:opacity-30"
                  aria-label="Send"
                >
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 16V6.414L5.707 9.707a1 1 0 1 1-1.414-1.414l5-5 .076-.069a1 1 0 0 1 1.338.069l5 5 .068.076a1 1 0 0 1-1.406 1.406l-.076-.068L11 6.414V16a1 1 0 1 1-2 0Z"/>
                  </svg>
                </button>
              )}
            </div>
        </footer>
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmThread && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-2">Delete chat?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deleteConfirmThread.title}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmThread(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteThread(deleteConfirmThread.id);
                  setDeleteConfirmThread(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Chat Modal */}
      {renameThreadData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Rename chat</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-gray-200"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  control.renameThread(renameThreadData.id, renameValue);
                  setRenameThreadData(null);
                } else if (e.key === 'Escape') {
                  setRenameThreadData(null);
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenameThreadData(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  control.renameThread(renameThreadData.id, renameValue);
                  setRenameThreadData(null);
                }}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
}

export default ChatKit;
