import type { Store } from './store';
import { generateId } from './store';
import type { ThreadMetadata, ThreadItem, Page } from './types';

const threads = new Map<string, ThreadMetadata>();
const items = new Map<string, ThreadItem[]>();

export class MemoryThreadStore implements Store {
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
    return threads.get(threadId) || null;
  }

  async saveThread(thread: ThreadMetadata): Promise<void> {
    threads.set(thread.id, { ...thread });
  }

  async deleteThread(threadId: string): Promise<void> {
    threads.delete(threadId);
    items.delete(threadId);
  }

  async loadThreads(limit: number, _after: string | null, order: 'asc' | 'desc'): Promise<Page<ThreadMetadata>> {
    const all = [...threads.values()]
      .sort((a, b) => order === 'desc'
        ? b.created_at.getTime() - a.created_at.getTime()
        : a.created_at.getTime() - b.created_at.getTime()
      );
    const data = all.slice(0, limit);
    return { data, has_more: all.length > limit, after: null };
  }

  async loadThreadItems(threadId: string, _after: string | null, limit: number, order: 'asc' | 'desc'): Promise<Page<ThreadItem>> {
    const all = items.get(threadId) || [];
    const sorted = order === 'desc' ? [...all].reverse() : all;
    const data = sorted.slice(0, limit);
    return { data, has_more: sorted.length > limit, after: null };
  }

  async addThreadItem(threadId: string, item: ThreadItem): Promise<void> {
    if (!items.has(threadId)) items.set(threadId, []);
    const list = items.get(threadId)!;
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
  }

  async updateThreadItem(threadId: string, itemId: string, updates: Partial<ThreadItem>): Promise<void> {
    const list = items.get(threadId);
    if (!list) return;
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates } as ThreadItem;
    }
  }

  async deleteThreadItem(threadId: string, itemId: string): Promise<void> {
    const list = items.get(threadId);
    if (!list) return;
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx >= 0) list.splice(idx, 1);
  }

  async completeToolCall(threadId: string, itemId: string, result: unknown): Promise<ThreadItem | null> {
    const list = items.get(threadId);
    if (!list) return null;
    const idx = list.findIndex((i) => i.id === itemId && (i as any).status === 'pending');
    if (idx < 0) return null;
    const updated = { ...list[idx], status: 'completed', output: result } as ThreadItem;
    list[idx] = updated;
    return updated;
  }
}
