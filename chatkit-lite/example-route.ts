/**
 * ChatKit Lite - API Route
 *
 * Complete route handler for ChatKit protocol.
 *
 * SETUP REQUIRED:
 * 1. Copy chatkit-lite/ directory to your project
 * 2. Run schema.sql in your Postgres database
 * 3. Set environment variables:
 *    - OPENAI_API_KEY (required)
 *    - POSTGRES_URL (for @vercel/postgres)
 *    - WIDGET_API_KEY (optional, for auth)
 * 4. Update WORKFLOW_ID below with your hosted workflow ID
 * 5. Copy this file to: app/api/chat/route.ts
 * 6. Update imports to match your project structure
 */

import { NextRequest, NextResponse } from 'next/server';

// Update these imports to match where you placed chatkit-lite/
import { HostedWorkflowServer, createSSEResponse } from './index';
import { PostgresThreadStore } from './thread-store';

// =============================================================================
// CONFIGURATION - Update these values
// =============================================================================

// Your hosted workflow ID from OpenAI Agent Builder
const WORKFLOW_ID = process.env.WORKFLOW_ID || 'wf_your_workflow_id_here';

// =============================================================================
// AUTH - Replace with your own authentication
// =============================================================================

function getUserId(request: NextRequest): string {
  // API key auth for widgets
  const apiKey = request.headers.get('x-api-key');
  if (process.env.WIDGET_API_KEY && apiKey === process.env.WIDGET_API_KEY) {
    return 'widget_user';
  }

  // No auth configured - allow all (dev mode only!)
  if (!process.env.WIDGET_API_KEY) {
    console.warn('[ChatKit Lite] No WIDGET_API_KEY set - running in dev mode');
    return 'demo_user';
  }

  throw new Error('Unauthorized');
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

// Streaming request types
const STREAMING_TYPES = [
  'threads.create',
  'threads.add_user_message',
  'threads.add_client_tool_output',
];

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { type, params } = body;

    const store = new PostgresThreadStore(userId);

    // Streaming requests - delegate to server
    if (STREAMING_TYPES.includes(type)) {
      const server = new HostedWorkflowServer(store, WORKFLOW_ID);
      const events = server.process(body);
      return createSSEResponse(events);
    }

    // Non-streaming requests - handle directly
    switch (type) {
      case 'threads.list': {
        const { limit = 50, after = null, order = 'desc' } = params || {};
        const result = await store.loadThreads(limit, after, order);
        // Normalize status shape to match SDK expectations
        return NextResponse.json({
          ...result,
          data: result.data.map((t) => ({
            ...t,
            status: { type: t.status },
          })),
        });
      }

      case 'threads.get_by_id': {
        const thread = await store.loadThread(params.thread_id);
        if (!thread) {
          return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }
        const items = await store.loadThreadItems(params.thread_id, null, 1000, 'asc');
        return NextResponse.json({
          id: thread.id,
          created_at: thread.created_at,
          status: { type: thread.status },
          title: thread.title,
          metadata: thread.metadata,
          items: {
            data: items.data,
            has_more: items.has_more,
            after: items.after,
          },
        });
      }

      case 'threads.update': {
        const thread = await store.loadThread(params.thread_id);
        if (!thread) {
          return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }
        if (params.title !== undefined) thread.title = params.title;
        if (params.status !== undefined) thread.status = params.status;
        if (params.metadata) {
          thread.metadata = { ...thread.metadata, ...params.metadata };
        }
        await store.saveThread(thread);
        return NextResponse.json({ success: true });
      }

      case 'threads.delete': {
        await store.deleteThread(params.thread_id);
        return NextResponse.json({ success: true });
      }

      case 'items.list': {
        const { limit = 100, after = null, order = 'asc' } = params || {};
        const items = await store.loadThreadItems(params.thread_id, after, limit, order);
        return NextResponse.json({
          data: items.data,
          has_more: items.has_more,
          after: items.after,
        });
      }

      case 'items.feedback': {
        // No-op - feedback not implemented
        return NextResponse.json({});
      }

      default:
        return NextResponse.json(
          { error: `Unknown request type: ${type}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
