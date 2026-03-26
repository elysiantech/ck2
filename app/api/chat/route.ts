import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { HostedWorkflowServer, createSSEResponse } from '@/lib/chatkit-lite';
import { MemoryThreadStore } from '@/lib/chatkit-lite/memory-store';
import { PostgresThreadStore } from '@/lib/chatkit-lite/thread-store';

const WORKFLOW_ID = process.env.NEXT_PUBLIC_WORKFLOW_ID || 'wf_69c369b94cec8190aa28c8918ea389490c2f4865c660087c';
const USER_COOKIE = 'fexel_uid';

function getUserId(request: NextRequest): { userId: string; isNew: boolean } {
  const existing = request.cookies.get(USER_COOKIE)?.value;
  if (existing) return { userId: existing, isNew: false };
  return { userId: `usr_${randomUUID().replace(/-/g, '').slice(0, 16)}`, isNew: true };
}

const STREAMING_TYPES = [
  'threads.create',
  'threads.add_user_message',
  'threads.add_client_tool_output',
];

export async function POST(request: NextRequest) {
  try {
    const { userId, isNew } = getUserId(request);
    const body = await request.json();
    const { type, params } = body;

    const store = process.env.DATABASE_URL
      ? new PostgresThreadStore(userId)
      : new MemoryThreadStore(userId);

    // Set cookie on new users
    const cookieHeader = isNew
      ? `${USER_COOKIE}=${userId}; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365 * 2}; Path=/`
      : null;

    function withCookie<T extends Response>(response: T): T {
      if (cookieHeader) response.headers.append('Set-Cookie', cookieHeader);
      return response;
    }

    if (STREAMING_TYPES.includes(type)) {
      const server = new HostedWorkflowServer(store, WORKFLOW_ID);
      const events = server.process(body);
      return withCookie(createSSEResponse(events));
    }

    switch (type) {
      case 'threads.list': {
        const { limit = 50, after = null, order = 'desc' } = params || {};
        const result = await store.loadThreads(limit, after, order);
        return withCookie(NextResponse.json({
          ...result,
          data: result.data.map((t) => ({
            ...t,
            status: { type: t.status },
          })),
        }));
      }

      case 'threads.get_by_id': {
        const thread = await store.loadThread(params.thread_id);
        if (!thread) {
          return withCookie(NextResponse.json({ error: 'Thread not found' }, { status: 404 }));
        }
        const items = await store.loadThreadItems(params.thread_id, null, 1000, 'asc');
        return withCookie(NextResponse.json({
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
        }));
      }

      case 'threads.update': {
        const thread = await store.loadThread(params.thread_id);
        if (!thread) {
          return withCookie(NextResponse.json({ error: 'Thread not found' }, { status: 404 }));
        }
        if (params.title !== undefined) thread.title = params.title;
        if (params.status !== undefined) thread.status = params.status;
        if (params.metadata) {
          thread.metadata = { ...thread.metadata, ...params.metadata };
        }
        await store.saveThread(thread);
        return withCookie(NextResponse.json({ success: true }));
      }

      case 'threads.delete': {
        await store.deleteThread(params.thread_id);
        return withCookie(NextResponse.json({ success: true }));
      }

      case 'items.list': {
        const { limit = 100, after = null, order = 'asc' } = params || {};
        const items = await store.loadThreadItems(params.thread_id, after, limit, order);
        return withCookie(NextResponse.json({
          data: items.data,
          has_more: items.has_more,
          after: items.after,
        }));
      }

      case 'items.feedback': {
        return withCookie(NextResponse.json({}));
      }

      default:
        return withCookie(NextResponse.json(
          { error: `Unknown request type: ${type}` },
          { status: 400 }
        ));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
