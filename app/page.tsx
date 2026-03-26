'use client';

import { ChatKit, ResizablePanel } from '@/lib/chatkit/components';
import { useChatKit } from '@/lib/chatkit/hooks';
import { buildShareableHtml } from '@/lib/chatkit/utils/widgetShare';

const WORKFLOW_ID = process.env.NEXT_PUBLIC_WORKFLOW_ID!;

export default function Home() {
  const { control } = useChatKit({
    api: {
      url: '/api/chat',
      headers: {
        'x-page-context': JSON.stringify({ workflowId: WORKFLOW_ID }),
      },
    },
  });

  return (
    <main className="h-screen w-screen bg-gray-100 flex items-center justify-center p-4">
      <ResizablePanel>
        <ChatKit
          control={control}
          options={{
            history: { enabled: false },
            header: { enabled: false },
            composer: {
              attachments: { enabled: false },
            },
            startScreen: {
              greeting: "What process are you looking to automate?",
            },
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
    </main>
  );
}
