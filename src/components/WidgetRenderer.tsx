import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '../utils/messageHelpers';
import type { ActionConfig } from '../types';

// Widget renderer component - handles all ChatKit widget types
interface WidgetRendererProps {
  widget: any;
  itemId?: string;
  onAction?: (action: ActionConfig) => void;
}

export function WidgetRenderer({ widget, itemId, onAction }: WidgetRendererProps): React.ReactElement | null {
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

    case 'Text': {
      const textClasses = [
        'text-gray-700',
        widget.weight === 'bold' ? 'font-medium' : '',
        widget.size === 'sm' ? 'text-sm' : widget.size === 'lg' ? 'text-lg' : '',
      ].filter(Boolean).join(' ');
      return <span className={textClasses}>{widget.value}</span>;
    }

    case 'Markdown':
      return (
        <div className="text-gray-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {widget.value || ''}
          </ReactMarkdown>
        </div>
      );

    case 'Title': {
      const level = widget.level || 2;
      const titleClass = "font-medium text-gray-700";
      if (level === 1) return <h1 className={titleClass}>{widget.value}</h1>;
      if (level === 2) return <h2 className={titleClass}>{widget.value}</h2>;
      if (level === 3) return <h3 className={titleClass}>{widget.value}</h3>;
      if (level === 4) return <h4 className={titleClass}>{widget.value}</h4>;
      if (level === 5) return <h5 className={titleClass}>{widget.value}</h5>;
      return <h6 className={titleClass}>{widget.value}</h6>;
    }

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

    case 'Button': {
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
    }

    case 'Image':
      return <img src={widget.src} alt={widget.alt || ''} className="max-w-full rounded-lg" />;

    case 'Stack': {
      const gapClass = widget.gap ? `gap-${widget.gap}` : 'gap-3';
      return (
        <div className={`flex ${widget.direction === 'col' ? 'flex-col' : 'flex-row'} ${gapClass}`}>
          {widget.children?.map((child: any, i: number) => (
            <WidgetRenderer key={i} widget={child} itemId={itemId} onAction={onAction} />
          ))}
        </div>
      );
    }

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

    case 'Badge': {
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
    }

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
