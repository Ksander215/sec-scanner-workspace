/**
 * Pipeline Executor Core — Event Bus
 *
 * In-process pub/sub for pipeline events.
 * Zero dependencies. Supports wildcard subscriptions.
 * Observer errors never break the bus.
 */

import type { ID, Timestamp } from '../types/index.ts';
import type { PipelineEvent, PipelineEventType, PipelineEventBus, PipelineEventBusReadonly, PipelineEventBusWriteable } from './types.ts';

// ─── Event Bus ──────────────────────────────────────────────

/**
 * Internal event bus for the Pipeline.
 *
 * Design:
 * - Synchronous dispatch (handlers run in order).
 * - Wildcard support: subscribe to '*' to receive ALL events.
 * - Handler errors are caught and never propagate.
 * - Unsubscribe returns a cleanup function.
 */
export class PipelineEventBusImpl implements PipelineEventBus {
  private readonly handlers = new Map<PipelineEventType | '*', Array<(event: PipelineEvent) => void>>();

  on(type: PipelineEventType | '*', handler: (event: PipelineEvent) => void): () => void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
    return () => {
      const current = this.handlers.get(type);
      if (current) {
        const idx = current.indexOf(handler);
        if (idx >= 0) current.splice(idx, 1);
      }
    };
  }

  emit(event: PipelineEvent): void {
    // Specific handlers
    const specific = this.handlers.get(event.type);
    if (specific) {
      for (const handler of specific) {
        try { handler(event); } catch { /* observer errors don't break the bus */ }
      }
    }
    // Wildcard handlers
    const wildcard = this.handlers.get('*');
    if (wildcard) {
      for (const handler of wildcard) {
        try { handler(event); } catch { /* observer errors don't break the bus */ }
      }
    }
  }

  /** Remove all handlers. Used during shutdown. */
  clear(): void {
    this.handlers.clear();
  }
}

/** Create a new EventBus instance. */
export function createEventBus(pipelineId: ID): { bus: PipelineEventBus; emit: PipelineEventBusWriteable['emit'] } {
  const bus = new PipelineEventBusImpl();
  return {
    bus,
    emit: (event: PipelineEvent) => bus.emit(event),
  };
}