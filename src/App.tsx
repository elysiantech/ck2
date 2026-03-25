import { ChatKit } from './components';
import { useChatKit } from './hooks';
import type { Entity } from './types';
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
      // Persist to localStorage, etc.
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

  return (
    <div className="h-screen w-screen">
      <ChatKit control={control} options={{ entities: entityOptions }} />
    </div>
  );
}

export default App;
