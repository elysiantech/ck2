import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Workflow } from '../types';

// Workflow display component with collapsible behavior
interface WorkflowDisplayProps {
  workflow: Workflow;
  expanded?: boolean;
}

export function WorkflowDisplay({ workflow, expanded: initialExpanded }: WorkflowDisplayProps) {
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
