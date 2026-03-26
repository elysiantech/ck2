/**
 * ChatKit Lite - Postgres thread store
 *
 * Uses @neondatabase/serverless. Set DATABASE_URL in .env.
 */

import { neon } from '@neondatabase/serverless';
import type { Store } from './store';
import { generateId } from './store';
import type { ThreadMetadata, ThreadItem, Page } from './types';

const sql = neon(process.env.DATABASE_URL!);

export class PostgresThreadStore implements Store {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  generateThreadId(): string {
    return generateId('thr');
  }

  generateItemId(type: string): string {
    const prefix = type === 'message' ? 'msg' : type === 'tool' ? 'tool' : 'item';
    return generateId(prefix);
  }

  async loadThread(threadId: string): Promise<ThreadMetadata | null> {
    const rows = await sql`
      SELECT id, created_at, status, title, metadata
      FROM threads
      WHERE id = ${threadId} AND user_id = ${this.userId}
    `;
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      created_at: new Date(row.created_at),
      status: row.status || 'active',
      title: row.title,
      metadata: row.metadata || {},
    };
  }

  async saveThread(thread: ThreadMetadata): Promise<void> {
    await sql`
      INSERT INTO threads (id, user_id, created_at, status, title, metadata)
      VALUES (
        ${thread.id},
        ${this.userId},
        ${thread.created_at.toISOString()},
        ${thread.status},
        ${thread.title || null},
        ${JSON.stringify(thread.metadata || {})}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        title = EXCLUDED.title,
        metadata = EXCLUDED.metadata
    `;
  }

  async deleteThread(threadId: string): Promise<void> {
    const check = await sql`
      SELECT id FROM threads WHERE id = ${threadId} AND user_id = ${this.userId}
    `;
    if (check.length === 0) return;

    await sql`DELETE FROM thread_items WHERE thread_id = ${threadId}`;
    await sql`DELETE FROM threads WHERE id = ${threadId} AND user_id = ${this.userId}`;
  }

  async loadThreads(
    limit: number,
    after: string | null,
    order: 'asc' | 'desc'
  ): Promise<Page<ThreadMetadata>> {
    let rows;
    if (after) {
      if (order === 'desc') {
        rows = await sql`
          SELECT id, created_at, status, title, metadata
          FROM threads
          WHERE user_id = ${this.userId} AND created_at < (
            SELECT created_at FROM threads WHERE id = ${after}
          )
          ORDER BY created_at DESC
          LIMIT ${limit + 1}
        `;
      } else {
        rows = await sql`
          SELECT id, created_at, status, title, metadata
          FROM threads
          WHERE user_id = ${this.userId} AND created_at > (
            SELECT created_at FROM threads WHERE id = ${after}
          )
          ORDER BY created_at ASC
          LIMIT ${limit + 1}
        `;
      }
    } else {
      if (order === 'desc') {
        rows = await sql`
          SELECT id, created_at, status, title, metadata
          FROM threads
          WHERE user_id = ${this.userId}
          ORDER BY created_at DESC
          LIMIT ${limit + 1}
        `;
      } else {
        rows = await sql`
          SELECT id, created_at, status, title, metadata
          FROM threads
          WHERE user_id = ${this.userId}
          ORDER BY created_at ASC
          LIMIT ${limit + 1}
        `;
      }
    }

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).map((row) => ({
      id: row.id,
      created_at: new Date(row.created_at),
      status: row.status || 'active',
      title: row.title,
      metadata: row.metadata || {},
    }));

    return {
      data,
      has_more: hasMore,
      after: hasMore ? data[data.length - 1]?.id : null,
    };
  }

  async loadThreadItems(
    threadId: string,
    after: string | null,
    limit: number,
    order: 'asc' | 'desc'
  ): Promise<Page<ThreadItem>> {
    const check = await sql`
      SELECT id FROM threads WHERE id = ${threadId} AND user_id = ${this.userId}
    `;
    if (check.length === 0) {
      return { data: [], has_more: false, after: null };
    }

    let rows;
    if (after) {
      if (order === 'asc') {
        rows = await sql`
          SELECT data FROM thread_items
          WHERE thread_id = ${threadId} AND created_at > (
            SELECT created_at FROM thread_items WHERE thread_id = ${threadId} AND (data->>'id') = ${after}
          )
          ORDER BY created_at ASC
          LIMIT ${limit + 1}
        `;
      } else {
        rows = await sql`
          SELECT data FROM thread_items
          WHERE thread_id = ${threadId} AND created_at < (
            SELECT created_at FROM thread_items WHERE thread_id = ${threadId} AND (data->>'id') = ${after}
          )
          ORDER BY created_at DESC
          LIMIT ${limit + 1}
        `;
      }
    } else {
      if (order === 'asc') {
        rows = await sql`
          SELECT data FROM thread_items
          WHERE thread_id = ${threadId}
          ORDER BY created_at ASC
          LIMIT ${limit + 1}
        `;
      } else {
        rows = await sql`
          SELECT data FROM thread_items
          WHERE thread_id = ${threadId}
          ORDER BY created_at DESC
          LIMIT ${limit + 1}
        `;
      }
    }

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).map((row) => row.data as ThreadItem);

    return {
      data,
      has_more: hasMore,
      after: hasMore ? data[data.length - 1]?.id : null,
    };
  }

  async addThreadItem(threadId: string, item: ThreadItem): Promise<void> {
    const createdAt = typeof item.created_at === 'string'
      ? item.created_at
      : item.created_at.toISOString();

    await sql`
      INSERT INTO thread_items (thread_id, item_id, data, created_at)
      VALUES (${threadId}, ${item.id}, ${JSON.stringify(item)}, ${createdAt})
      ON CONFLICT (thread_id, item_id) DO UPDATE SET data = EXCLUDED.data
    `;
  }

  async updateThreadItem(threadId: string, itemId: string, updates: Partial<ThreadItem>): Promise<void> {
    const rows = await sql`
      SELECT data FROM thread_items
      WHERE thread_id = ${threadId} AND item_id = ${itemId}
    `;
    if (rows.length === 0) return;

    const current = rows[0].data as ThreadItem;
    const updated = { ...current, ...updates };

    await sql`
      UPDATE thread_items
      SET data = ${JSON.stringify(updated)}
      WHERE thread_id = ${threadId} AND item_id = ${itemId}
    `;
  }

  async deleteThreadItem(threadId: string, itemId: string): Promise<void> {
    await sql`
      DELETE FROM thread_items
      WHERE thread_id = ${threadId} AND item_id = ${itemId}
    `;
  }

  async completeToolCall(
    threadId: string,
    itemId: string,
    result: unknown
  ): Promise<ThreadItem | null> {
    const rows = await sql`
      UPDATE thread_items
      SET data = jsonb_set(
        jsonb_set(data, '{status}', '"completed"'),
        '{output}',
        ${JSON.stringify(result)}::jsonb
      )
      WHERE thread_id = ${threadId}
        AND item_id = ${itemId}
        AND data->>'status' = 'pending'
      RETURNING data
    `;

    if (rows.length === 0) return null;
    return rows[0].data as ThreadItem;
  }
}
