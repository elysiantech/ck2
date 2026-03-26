import React from 'react';
import type { Entity, EntityPreview, EntityTagData } from '../types';

// Render user message content (handles input_text and input_tag types)
export function renderUserMessageContent(
  content: Array<{ type: string; text?: string; id?: string; data?: EntityTagData }>,
  entityCallbacks?: {
    onClick?: (entity: Entity) => void;
    onRequestPreview?: (entity: Entity) => Promise<EntityPreview>;
  }
): React.ReactElement[] {
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

// Truncate text to a maximum number of lines for long message preview
export const MAX_PREVIEW_LINES = 5;

export function truncateText(text: string, maxLines: number): { truncated: string; isTruncated: boolean } {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return { truncated: text, isTruncated: false };
  }
  return { truncated: lines.slice(0, maxLines).join('\n'), isTruncated: true };
}

// Extract full text from user message content array
export function extractUserMessageText(content: Array<{ type: string; text?: string }>): string {
  if (!content || !Array.isArray(content)) return '';
  return content.map(c => c.text || '').join('');
}

// Extract text from assistant message content (handles output_text type)
export function extractAssistantMessageText(content: Array<{ type: string; text?: string }>): string {
  if (!content || !Array.isArray(content)) return '';
  return content
    .map((c) => {
      if (c.type === 'output_text' && c.text) return c.text;
      if (c.type === 'text' && c.text) return c.text; // fallback
      return '';
    })
    .join('');
}

// Markdown component prop types
interface ChildrenProps {
  children?: React.ReactNode;
}

interface AnchorProps extends ChildrenProps {
  href?: string;
}

interface ImageProps {
  src?: string | Blob;
  alt?: string;
}

// Markdown components for proper styling
export const markdownComponents = {
  h1: ({ children }: ChildrenProps) => <h1 className="text-2xl font-medium mt-6 mb-3">{children}</h1>,
  h2: ({ children }: ChildrenProps) => <h2 className="text-xl font-medium mt-5 mb-2">{children}</h2>,
  h3: ({ children }: ChildrenProps) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
  p: ({ children }: ChildrenProps) => <p className="mb-3 leading-relaxed">{children}</p>,
  ul: ({ children }: ChildrenProps) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: ChildrenProps) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li: ({ children }: ChildrenProps) => <li className="leading-relaxed">{children}</li>,
  table: ({ children }: ChildrenProps) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border border-gray-200 rounded-lg">{children}</table>
    </div>
  ),
  thead: ({ children }: ChildrenProps) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }: ChildrenProps) => <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b border-gray-200">{children}</th>,
  td: ({ children }: ChildrenProps) => <td className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">{children}</td>,
  // In react-markdown v9+, code blocks are <pre><code>...</code></pre>
  // Inline code is just <code>...</code>
  // We use a wrapper component to detect if we're inside a pre
  pre: ({ children }: ChildrenProps) => (
    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto my-3 text-sm font-mono [&>code]:bg-transparent [&>code]:p-0 [&>code]:rounded-none">
      {children}
    </pre>
  ),
  code: ({ children }: ChildrenProps) => (
    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
  ),
  blockquote: ({ children }: ChildrenProps) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">{children}</blockquote>,
  a: ({ href, children }: AnchorProps) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
  img: ({ src, alt }: ImageProps) => <img src={typeof src === 'string' ? src : undefined} alt={alt || ''} className="max-w-full rounded-lg my-2" />,
  hr: () => <hr className="my-4 border-gray-200" />,
  strong: ({ children }: ChildrenProps) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: ChildrenProps) => <em className="italic">{children}</em>,
};

// Render assistant content with widget support
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseWidgetBlocks } from './parseWidgetBlocks';
import { IframeWidget } from '../components/IframeWidget';

export function renderAssistantContent(
  text: string,
  onSendPrompt: (text: string) => void,
  isStreaming: boolean,
  mdComponents: typeof markdownComponents,
  onShare?: (data: { widgetCode: string; cssVars: Record<string, string> }) => Promise<string | null>
): React.ReactElement | React.ReactElement[] {
  // Don't parse while streaming (wait for closing ```)
  if (isStreaming) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    );
  }

  const segments = parseWidgetBlocks(text);
  return segments.map((seg, i) => {
    if (seg.type === 'markdown') {
      return (
        <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
          {seg.content}
        </ReactMarkdown>
      );
    }
    return <IframeWidget key={i} code={seg.code} onSendPrompt={onSendPrompt} onShare={onShare} />;
  });
}

export function groupThreadsByTime(threads: Array<{ id: string; title?: string | null; updated_at: string }>): Array<{ label: string; threads: typeof threads }> {
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
