/**
 * ChatKit Lite - Store interface
 *
 * Implement this interface to use any storage backend.
 */

import type { ThreadMetadata, ThreadItem, Page } from './types';

export interface Store {
  // Thread operations
  generateThreadId(): string;
  generateItemId(type: string): string;
  loadThread(threadId: string): Promise<ThreadMetadata | null>;
  saveThread(thread: ThreadMetadata): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  loadThreads(limit: number, after: string | null, order: 'asc' | 'desc'): Promise<Page<ThreadMetadata>>;

  // Item operations
  loadThreadItems(
    threadId: string,
    after: string | null,
    limit: number,
    order: 'asc' | 'desc'
  ): Promise<Page<ThreadItem>>;
  addThreadItem(threadId: string, item: ThreadItem): Promise<void>;
  updateThreadItem(threadId: string, itemId: string, updates: Partial<ThreadItem>): Promise<void>;
  deleteThreadItem(threadId: string, itemId: string): Promise<void>;

  // Tool call completion (atomic)
  completeToolCall?(
    threadId: string,
    itemId: string,
    result: unknown
  ): Promise<ThreadItem | null>;
}

/**
 * Generate a random ID with prefix
 */
export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${rand}`;
}
