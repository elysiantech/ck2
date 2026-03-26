/**
 * Parser to split assistant text into markdown and widget segments.
 * Matches ```widget ... ``` fenced code blocks.
 */

export type ContentSegment =
  | { type: 'markdown'; content: string }
  | { type: 'widget'; code: string };

/**
 * Parse text containing widget blocks into an array of segments.
 * Widget blocks are fenced with ```widget ... ```
 */
export function parseWidgetBlocks(text: string): ContentSegment[] {
  const regex = /```widget\n([\s\S]*?)```/g;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add markdown content before this widget block
    if (match.index > lastIndex) {
      const markdownContent = text.slice(lastIndex, match.index);
      if (markdownContent.trim()) {
        segments.push({ type: 'markdown', content: markdownContent });
      }
    }

    // Add the widget block
    const widgetCode = match[1].trim();
    if (widgetCode) {
      segments.push({ type: 'widget', code: widgetCode });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining markdown content after the last widget block
  if (lastIndex < text.length) {
    const remainingContent = text.slice(lastIndex);
    if (remainingContent.trim()) {
      segments.push({ type: 'markdown', content: remainingContent });
    }
  }

  // If no widget blocks found, return the entire text as markdown
  if (segments.length === 0 && text.trim()) {
    segments.push({ type: 'markdown', content: text });
  }

  return segments;
}

/**
 * Check if text contains any widget blocks.
 * Useful for quick check before full parsing.
 */
export function hasWidgetBlocks(text: string): boolean {
  return /```widget\n[\s\S]*?```/.test(text);
}
