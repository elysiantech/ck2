import { useEffect } from 'react';
import { ChatKit, ResizablePanel } from './components';
import { useChatKit } from './hooks';
import type { Entity } from './types';
import { buildShareableHtml } from './utils/widgetShare';
import './index.css';

function App() {
  const entityOptions = {
    onTagSearch: async (query: string) => {
      console.log('[App] Entity search:', query);
      const entities: Entity[] = [
        {
          id: 'workbook:workbook_1772868632198',
          title: 'Robot PO Demo',
          group: 'Sheets',
          interactive: true,
          data: {
            _entityType: 'sheet',
            workbookId: 'workbook_1772868632198',
            workbookName: 'Robot PO Demo',
            updatedAt: '2026-03-17T05:43:41.988Z',
          },
        },
      ];
      if (!query) return entities.slice(0, 5);
      return entities.filter(e =>
        e.title.toLowerCase().includes(query.toLowerCase())
      );
    },
  };

  const { control } = useChatKit({
    api: {
      url: '/api/chatkit/chat',
    },

    onClientTool: async ({ name, arguments: args, call_id }) => {
      console.log('[App] Client tool called:', name, args, call_id);
      // Stub for now
      return "I can't do this right now.";
    },

    onThreadChange: ({ threadId }) => {
      console.log('[App] Thread changed:', threadId);
      if (threadId) {
        localStorage.setItem('ck2_last_thread', threadId);
      } else {
        localStorage.removeItem('ck2_last_thread');
      }
    },

    onEffect: ({ name, data }) => {
      console.log('[App] Effect received:', name, data);
      // Handle fire-and-forget effects
    },

    entities: entityOptions,

    widgets: {
      onAction: async (action, item) => {
        console.log('[App] Widget action:', action, item);
        // Handle widget button clicks
      },
    },
  });

  // Load saved thread on mount
  useEffect(() => {
    const savedThreadId = localStorage.getItem('ck2_last_thread');
    if (savedThreadId) {
      control.selectThread(savedThreadId);
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-100 flex items-center justify-center p-4">
      <ResizablePanel>
        <ChatKit
          control={control}
          options={{
            entities: entityOptions,
            widgets: {
              onShare: async ({ widgetCode, cssVars, widgetId }) => {
                const html = buildShareableHtml(widgetCode, cssVars);
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `widget-${widgetId}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                return null;
              },
            },
          }}
        />
      </ResizablePanel>
    </div>
  );
}

export default App;
