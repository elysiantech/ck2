# ChatKit Lite

Minimal ChatKit protocol implementation for OpenAI hosted workflows. Self-contained, portable, ~1400 lines.

## Quick Start

```typescript
import { HostedWorkflowServer, createSSEResponse } from './index';
import { PostgresThreadStore } from './thread-store';

const store = new PostgresThreadStore(userId);
const server = new HostedWorkflowServer(store, workflowId);
const events = server.process(request);
return createSSEResponse(events);
```

## Setup

1. Copy `chatkit-lite/` directory to your project
2. Run `schema.sql` in your Postgres database
3. Set environment variables:
   - `OPENAI_API_KEY` (required)
   - `POSTGRES_URL` (for @vercel/postgres)
   - `WIDGET_API_KEY` (optional, for auth)
4. Copy `example-route.ts` to `app/api/chat/route.ts`
5. Update the `WORKFLOW_ID` constant with your hosted workflow ID

## Files

| File | Description |
|------|-------------|
| `index.ts` | Main exports |
| `server.ts` | HostedWorkflowServer - core protocol logic |
| `types.ts` | TypeScript type definitions |
| `store.ts` | Store interface (implement for custom backends) |
| `thread-store.ts` | Postgres implementation using @vercel/postgres |
| `streaming.ts` | SSE streaming utilities with cancellation support |
| `example-route.ts` | Complete Next.js API route handler |
| `schema.sql` | Database schema for threads and items |

## Supported Operations

**Streaming (via HostedWorkflowServer):**
- `threads.create` - Create thread and run workflow
- `threads.add_user_message` - Add message and continue workflow
- `threads.add_client_tool_output` - Submit tool results and continue

**Non-streaming (handle in route):**
- `threads.list` - List user's threads
- `threads.get_by_id` - Get thread with items
- `threads.update` - Update thread title/status/metadata
- `threads.delete` - Delete thread and items
- `items.list` - Paginate thread items

## Custom Store

To use a different database, implement the `Store` interface:

```typescript
import type { Store } from './store';

class MyCustomStore implements Store {
  generateThreadId(): string { ... }
  generateItemId(type: string): string { ... }
  loadThread(threadId: string): Promise<ThreadMetadata | null> { ... }
  saveThread(thread: ThreadMetadata): Promise<void> { ... }
  deleteThread(threadId: string): Promise<void> { ... }
  loadThreads(limit, after, order): Promise<Page<ThreadMetadata>> { ... }
  loadThreadItems(threadId, after, limit, order): Promise<Page<ThreadItem>> { ... }
  addThreadItem(threadId: string, item: ThreadItem): Promise<void> { ... }
  updateThreadItem(threadId, itemId, updates): Promise<void> { ... }
  deleteThreadItem(threadId: string, itemId: string): Promise<void> { ... }
  completeToolCall(threadId, itemId, result): Promise<ThreadItem | null> { ... }
}
```

## Features

- Thread persistence with pagination
- Hosted workflow streaming via SSE
- Client tool call support (pending → completed)
- Conversation compaction for long threads
- Workflow item (reasoning) persistence
- Cancellation support via AbortSignal
- No external dependencies beyond @vercel/postgres

## Dependencies

```json
{
  "@vercel/postgres": "^0.10.0"
}
```

For non-Vercel deployments, implement a custom store using your preferred database client.
