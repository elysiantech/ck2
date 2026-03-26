/**
 * ChatKit Lite
 *
 * Minimal ChatKit implementation for hosted workflows.
 * Self-contained, portable, ~500 lines core.
 *
 * Usage:
 *   import { HostedWorkflowServer, createSSEResponse } from 'chatkit-lite';
 *   import { PostgresThreadStore } from 'chatkit-lite/thread-store';
 *
 *   const store = new PostgresThreadStore(userId);
 *   const server = new HostedWorkflowServer(store, workflowId);
 *   const events = server.process(request);
 *   return createSSEResponse(events);
 *
 * For custom stores, implement the Store interface and pass to HostedWorkflowServer.
 */

// Server
export { HostedWorkflowServer } from './server';

// Store interface (implement this for custom backends)
export type { Store } from './store';
export { generateId } from './store';

// Streaming utilities
export { createSSEResponse, createEventStream } from './streaming';

// Types
export type {
  Thread,
  ThreadMetadata,
  ThreadItem,
  UserMessageItem,
  AssistantMessageItem,
  ClientToolCallItem,
  WorkflowItem,
  CompactionItem,
  ThreadStreamEvent,
  WorkflowEvent,
  WorkflowTask,
  Page,
} from './types';

// NOTE: PostgresThreadStore is NOT exported here to avoid @vercel/postgres dependency.
// Import directly: import { PostgresThreadStore } from 'chatkit-lite/thread-store';
