import { ChatKit } from './components';
import { useChatKit } from './hooks';
import './index.css';

function App() {
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

    entities: {
      onTagSearch: async (query) => {
        console.log('[App] Entity search:', query);
        // Return matching entities
        return [];
      },
    },

    widgets: {
      onAction: async (action, item) => {
        console.log('[App] Widget action:', action, item);
        // Handle widget button clicks
      },
    },
  });

  return (
    <div className="h-screen w-screen">
      <ChatKit control={control} />
    </div>
  );
}

export default App;
