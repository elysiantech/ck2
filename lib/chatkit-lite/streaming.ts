/**
 * ChatKit Lite - SSE streaming utilities
 */

import type { ThreadStreamEvent } from './types';

/**
 * Create SSE Response from event generator with cancellation support
 */
export function createSSEResponse(
  events: AsyncGenerator<ThreadStreamEvent>,
  abortSignal?: AbortSignal
): Response {
  const stream = createEventStream(events, abortSignal);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Create ReadableStream from event generator with cancellation support
 */
export function createEventStream(
  events: AsyncGenerator<ThreadStreamEvent>,
  abortSignal?: AbortSignal
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;

  // Listen for abort signal
  abortSignal?.addEventListener('abort', () => {
    cancelled = true;
    events.return?.(undefined);
  });

  return new ReadableStream({
    async pull(controller) {
      if (cancelled) {
        controller.close();
        return;
      }

      try {
        const { done, value } = await events.next();
        if (done || cancelled) {
          controller.close();
          return;
        }
        const data = JSON.stringify(value, dateReplacer);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      } catch (err) {
        // Don't emit error if cancelled
        if (cancelled) {
          controller.close();
          return;
        }
        const errorEvent = {
          type: 'error',
          error: { message: err instanceof Error ? err.message : 'Unknown error' },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
      events.return?.(undefined);
    },
  });
}

/**
 * JSON replacer for Date objects
 */
function dateReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString().replace('Z', '');
  }
  return value;
}
