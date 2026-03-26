# ChatKit Patches

Changes made in ck2 that need to be ported back to chatkit/.

---

## 1. Pulsating dots during streaming wait

**File:** `lib/chatkit/components/ChatKit.tsx`

Show bouncing dots when `state.isStreaming` is true and the last item is a `user_message` (no assistant content has arrived yet). Dots disappear as soon as a `workflow` or `assistant_message` item appears.

## 2. Single workflow block per turn

**File:** `lib/chatkit-lite/server.ts` (server-side — equivalent change needed in `lib/chatkit/server.ts`)

The hosted workflow sends multiple `reasoning_summary_part` events per response. Previously each one created a separate workflow item. Fix: reuse existing workflow on `workflow_started`, defer closing until first `text_delta`. Applied to both `runWorkflow` and `handleContinuation`.

## 3. Auto-collapse workflow on completion

**File:** `lib/chatkit/components/WorkflowDisplay.tsx`

Added `useEffect` to sync `isExpanded` with the `expanded` prop so the workflow auto-collapses when `thread.item.done` sets `expanded: false`.

## 4. Gate skills menu on options

**File:** `lib/chatkit/components/ChatKit.tsx`, `lib/chatkit/types/chatkit.ts`

Added `skills?: { enabled?: boolean }` to `ChatKitOptions`. The `/` command handler and skills panel button only activate when `options.skills.enabled` is true. Prevents "No skills available" popup when no skills endpoint exists.

## 5. react-markdown v10 img type fix

**File:** `lib/chatkit/utils/messageHelpers.tsx`

`ImageProps.src` widened to `string | Blob` to match react-markdown v10's type. The `<img>` render filters to `typeof src === 'string'`.

## 6. Widget action bridge (structured dispatch)

**Files:** `lib/chatkit/components/IframeWidget.tsx`, `lib/chatkit/utils/messageHelpers.tsx`, `lib/chatkit/types/chatkit.ts`

Added `onAction` prop to `IframeWidget` and `onWidgetAction` to `WidgetsOptions`. Widgets can trigger parent actions via `window.parent.postMessage({ type: 'action', name: 'print' }, '*')` without going through the chat. Parent handles via a switch on `name` — no eval, explicit allowlist.

## 7. Reasoning display modes

**Files:** `lib/chatkit/components/ChatKit.tsx`, `lib/chatkit/components/WorkflowDisplay.tsx`, `lib/chatkit/types/chatkit.ts`

Added `reasoning?: 'none' | 'titles' | 'full'` to `ChatKitOptions`. Controls workflow/reasoning visibility:
- `none` — workflow blocks don't render at all
- `titles` — collapsible header + task titles, content hidden
- `full` — current behavior, everything visible

Driven by `NEXT_PUBLIC_REASONING_DISPLAY` env var. Default is `none` (production), set to `full` in dev `.env`.

## 8. Pulsating dots persist through workflow

**File:** `lib/chatkit/components/ChatKit.tsx`

Updated dots condition: show when streaming and no `assistant_message` has appeared after the last `user_message`. Dots now stay visible during workflow reasoning (not just before it), disappearing only when text output starts.
