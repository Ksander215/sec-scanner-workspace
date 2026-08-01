/*
 * Personal Intelligence Pack — Trace Runtime
 * TASK-AIS-007A.000
 *
 * In-process distributed tracing for all pack operations.
 */
import type { Timestamp } from '../types/common.js';
import { PackError } from './errors.js';
import type { PackTraceSpanId, PackTraceSpan, TraceEvent } from './types.js';
import { TraceStatus as TS } from './types.js';

export class PackTraceRuntime {
  private spans = new Map<string, PackTraceSpan>();
  private activeSpans = new Map<string, string>();

  startSpan(operation: string, subsystem: string, parentId?: string, attributes?: Readonly<Record<string, unknown>>): PackTraceSpan {
    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackTraceSpanId;
    const parent = parentId ?? null;
    const span: PackTraceSpan = Object.freeze({
      id, parentId: parent as unknown as PackTraceSpanId | null, operation, subsystem,
      status: TS.Started, startTime: now, endTime: null,
      durationMs: null, attributes: attributes ?? Object.freeze({}),
      events: Object.freeze([]),
    });
    this.spans.set(id as unknown as string, span);
    this.activeSpans.set(id as unknown as string, id as unknown as string);
    return span;
  }

  activateSpan(id: string): PackTraceSpan {
    const existing = this.getOrThrow(id);
    if (existing.status !== TS.Started) return existing;
    const updated: PackTraceSpan = Object.freeze({ ...existing, status: TS.Active });
    this.spans.set(id, updated);
    return updated;
  }

  completeSpan(id: string): PackTraceSpan {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString() as Timestamp;
    const start = new Date(existing.startTime).getTime();
    const end = new Date(now).getTime();
    const updated: PackTraceSpan = Object.freeze({
      ...existing, status: TS.Completed, endTime: now, durationMs: end - start,
    });
    this.spans.set(id, updated);
    this.activeSpans.delete(id);
    return updated;
  }

  failSpan(id: string): PackTraceSpan {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString() as Timestamp;
    const start = new Date(existing.startTime).getTime();
    const end = new Date(now).getTime();
    const updated: PackTraceSpan = Object.freeze({
      ...existing, status: TS.Failed, endTime: now, durationMs: end - start,
    });
    this.spans.set(id, updated);
    this.activeSpans.delete(id);
    return updated;
  }

  addSpanEvent(spanId: string, name: string, attributes?: Readonly<Record<string, unknown>>): PackTraceSpan {
    const existing = this.getOrThrow(spanId);
    const event: TraceEvent = Object.freeze({
      name, timestamp: new Date().toISOString() as Timestamp,
      attributes: attributes ?? Object.freeze({}),
    });
    const updated: PackTraceSpan = Object.freeze({
      ...existing, events: [...existing.events, event],
    });
    this.spans.set(spanId, updated);
    return updated;
  }

  getSpan(id: string): PackTraceSpan { return this.getOrThrow(id); }

  getSpansBySubsystem(subsystem: string): readonly PackTraceSpan[] {
    return Object.freeze(Array.from(this.spans.values()).filter(s => s.subsystem === subsystem));
  }

  getSpansByOperation(operation: string): readonly PackTraceSpan[] {
    return Object.freeze(Array.from(this.spans.values()).filter(s => s.operation === operation));
  }

  getChildSpans(parentId: string): readonly PackTraceSpan[] {
    return Object.freeze(
      Array.from(this.spans.values()).filter(s => s.parentId === parentId as unknown as PackTraceSpanId),
    );
  }

  getActiveSpans(): readonly PackTraceSpan[] {
    return Object.freeze(
      Array.from(this.activeSpans.values()).map(id => this.spans.get(id)).filter((s): s is PackTraceSpan => s !== undefined),
    );
  }

  getAllSpans(): readonly PackTraceSpan[] { return Object.freeze(Array.from(this.spans.values())); }
  getSpanCount(): number { return this.spans.size; }
  getAverageDurationMs(subsystem?: string): number {
    const completed = subsystem
      ? Array.from(this.spans.values()).filter(s => s.subsystem === subsystem && s.durationMs !== null)
      : Array.from(this.spans.values()).filter(s => s.durationMs !== null);
    if (completed.length === 0) return 0;
    return Math.round(completed.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) / completed.length);
  }

  dispose(): void { this.spans.clear(); this.activeSpans.clear(); }

  // ── Private ───────────────────────────────────────────────

  private getOrThrow(id: string): PackTraceSpan {
    const s = this.spans.get(id);
    if (!s) throw new PackError(`Trace span not found: ${id}`, 'TRACE_SPAN_NOT_FOUND');
    return s;
  }
}
