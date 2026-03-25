import { ChatKit, ResizablePanel } from '../components';
import { useChatKit } from '../hooks';
import { buildShareableHtml } from '../utils/widgetShare';

export function WidgetEmbed() {
  const { control } = useChatKit({
    api: { url: '/api/chatkit/chat' },
  });

  return (
    <div className="h-screen w-screen bg-gray-100 flex items-center justify-center p-4">
      <ResizablePanel>
        <ChatKit
          control={control}
          options={{
            history: { enabled: false },
            header: { enabled: false },
            composer: {
              attachments: { enabled: false },
            },
            // No entities.onTagSearch -> @ mentions won't show
            // No skills -> / commands won't show
            startScreen: {
              greeting: "What process are you looking to automate?",
            },
            widgets: {
              onShare: async ({ widgetCode, cssVars, widgetId, threadId }) => {
                // TODO: Email capture modal
                // TODO: Upload to Vercel Blob
                // TODO: Log lead
                console.log('[WidgetEmbed] Share:', { widgetId, threadId });
                const html = buildShareableHtml(widgetCode, cssVars);
                console.log('[WidgetEmbed] Generated HTML length:', html.length);
                return null; // stub for now
              },
            },
          }}
        />
      </ResizablePanel>
    </div>
  );
}
