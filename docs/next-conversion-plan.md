# ck2 → Next.js Conversion Plan

## Overview

Convert ck2 from Vite frontend to standalone Next.js app with chatkit-lite backend.

**Purpose:** Lightweight widget builder app using OpenAI hosted workflows, deployable to Vercel.

## Current State

```
ck2/
├── src/
│   ├── components/     # ChatKit UI components
│   ├── hooks/          # useChatKit hook
│   ├── api/            # ChatKitAPI client
│   ├── types/          # TypeScript types
│   ├── utils/          # Helpers (widgetShare, etc.)
│   ├── routes/         # WidgetEmbed.tsx
│   └── App.tsx         # Demo app (will be removed)
├── chatkit-lite/       # Minimal hosted workflow backend
├── vite.config.ts      # Vite config (will be removed)
└── ...
```

## Target State

```
ck2/
├── app/
│   ├── page.tsx                    # WidgetEmbed (main route)
│   ├── layout.tsx                  # Root layout
│   └── api/
│       └── chat/
│           └── route.ts            # chatkit-lite API
├── lib/
│   ├── chatkit/                    # Moved from src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   ├── types/
│   │   └── utils/
│   └── chatkit-lite/               # Backend server code
│       ├── server.ts
│       ├── thread-store.ts
│       ├── streaming.ts
│       ├── store.ts
│       └── types.ts
├── tailwind.config.ts
├── next.config.ts
└── ...
```

## Migration Steps

### 1. Initialize Next.js

```bash
# In ck2 directory, create Next.js structure alongside existing files
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

Or manual setup:
- Add `next`, `react`, `react-dom` to package.json
- Create `next.config.ts`
- Create `app/` directory

### 2. Move Frontend Code

| From | To |
|------|-----|
| `src/components/` | `lib/chatkit/components/` |
| `src/hooks/` | `lib/chatkit/hooks/` |
| `src/api/` | `lib/chatkit/api/` |
| `src/types/` | `lib/chatkit/types/` |
| `src/utils/` | `lib/chatkit/utils/` |

### 3. Create Main Page

**`app/page.tsx`** (from WidgetEmbed):
```tsx
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
            composer: { attachments: { enabled: false } },
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
```

### 4. Create API Route

**`app/api/chat/route.ts`** (from chatkit-lite/example-route.ts):
- Copy example-route.ts
- Update imports to `@/lib/chatkit-lite/...`
- Set WORKFLOW_ID from env

### 5. Move chatkit-lite

| From | To |
|------|-----|
| `chatkit-lite/server.ts` | `lib/chatkit-lite/server.ts` |
| `chatkit-lite/thread-store.ts` | `lib/chatkit-lite/thread-store.ts` |
| `chatkit-lite/streaming.ts` | `lib/chatkit-lite/streaming.ts` |
| `chatkit-lite/store.ts` | `lib/chatkit-lite/store.ts` |
| `chatkit-lite/types.ts` | `lib/chatkit-lite/types.ts` |
| `chatkit-lite/index.ts` | `lib/chatkit-lite/index.ts` |

### 6. Environment Variables

**`.env.local`:**
```
OPENAI_API_KEY=sk-...
POSTGRES_URL=postgres://...
NEXT_PUBLIC_WORKFLOW_ID=wf_69c369b94cec8190aa28c8918ea389490c2f4865c660087c
```

### 7. Cleanup

Remove:
- `vite.config.ts`
- `src/` directory
- `src/App.tsx`
- `src/main.tsx`
- `index.html`
- `postcss.config.js` (Next.js has its own)
- `chatkit-lite/` root directory (moved to lib/)

Update:
- `package.json` scripts
- `tsconfig.json` for Next.js paths
- `.gitignore` for `.next/`

### 8. Dependencies

**Add:**
```
next
@vercel/postgres
```

**Remove:**
```
vite
@vitejs/plugin-react
react-router-dom
```

**Keep:**
```
react
react-dom
tailwindcss
typescript
```

## Database Setup

Run `chatkit-lite/schema.sql` in your Postgres database before deploying.

## Verification

1. `npm run dev`
2. Visit `http://localhost:3000`
3. Widget builder loads
4. Send message → hosted workflow responds
5. Share button downloads HTML file

## Deployment

```bash
vercel --prod
```

Set environment variables in Vercel dashboard:
- `OPENAI_API_KEY`
- `POSTGRES_URL` (Vercel Postgres)
- `NEXT_PUBLIC_WORKFLOW_ID`
