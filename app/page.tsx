'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChatKit, ResizablePanel } from '@/lib/chatkit/components';
import { useChatKit } from '@/lib/chatkit/hooks';
import { buildShareableHtml } from '@/lib/chatkit/utils/widgetShare';

const WORKFLOW_ID = process.env.NEXT_PUBLIC_WORKFLOW_ID!;

function AdvisorPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || undefined;

  const startScreenUrl = mode
    ? `/start-screen-${mode}.html`
    : '/start-screen.html';

  const headers: Record<string, string> = {
    'x-page-context': JSON.stringify({ workflowId: WORKFLOW_ID }),
  };
  if (mode) {
    headers['x-workflow-mode'] = mode;
  }

  const { control } = useChatKit({
    api: {
      url: '/api/chat',
      headers,
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
            reasoning: (process.env.NEXT_PUBLIC_REASONING_DISPLAY as 'none' | 'titles' | 'full') || 'none',
            composer: {
              attachments: { enabled: false },
            },
            startScreen: {
              htmlUrl: startScreenUrl,
            },
            widgets: {
              onWidgetAction: (name, args) => {
                switch (name) {
                  case 'print':
                    window.print();
                    break;
                  case 'downloadPDF': {
                    const id = (args as { id?: string })?.id || 'document';
                    console.log('[downloadPDF]', id);
                    break;
                  }
                  case 'openDocument': {
                    const id = (args as { id?: string })?.id || 'document';
                    console.log('[openDocument]', id);
                    break;
                  }
                  default:
                    console.warn('Unknown widget action:', name, args);
                }
              },
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

export default function Home() {
  return (
    <Suspense>
      <AdvisorPage />
    </Suspense>
  );
}
