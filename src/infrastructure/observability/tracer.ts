import { randomUUID } from 'node:crypto';
import type { TraceSpan, SpanEvent } from './types.js';

export class Tracer {
  private spans: Map<string, TraceSpan> = new Map();
  private enabled: boolean;
  private sampleRate: number;
  private exporterEndpoint?: string;

  constructor(config: { enabled: boolean; provider: string; endpoint: string; sampleRate: number }) {
    this.enabled = config.enabled;
    this.sampleRate = config.sampleRate;
    if (config.provider !== 'none') {
      this.exporterEndpoint = config.endpoint;
    }
  }

  startSpan(operationName: string, parentSpan?: TraceSpan, attributes?: Record<string, string | number | boolean>): TraceSpan {
    if (!this.enabled || Math.random() > this.sampleRate) {
      return this.createNoopSpan();
    }

    const span: TraceSpan = {
      traceId: parentSpan?.traceId ?? randomUUID().replace(/-/g, ''),
      spanId: randomUUID().replace(/-/g, '').slice(0, 16),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: new Date(),
      status: 'ok',
      attributes: attributes ?? {},
      events: [],
    };

    this.spans.set(span.spanId, span);
    return span;
  }

  endSpan(span: TraceSpan): void {
    if (!this.enabled || !span.spanId) return;
    span.endTime = new Date();
    span.durationMs = span.endTime.getTime() - span.startTime.getTime();
    this.spans.delete(span.spanId);

    // Export span (in production, send to OTLP/Jaeger)
    if (this.exporterEndpoint) {
      this.exportSpan(span);
    }
  }

  addEvent(span: TraceSpan, name: string, attributes?: Record<string, string | number | boolean>): void {
    if (!span.spanId) return;
    span.events.push({ name, timestamp: new Date(), attributes: attributes ?? {} });
  }

  setError(span: TraceSpan, error: Error): void {
    span.status = 'error';
    span.attributes['error.type'] = error.name;
    span.attributes['error.message'] = error.message;
    this.addEvent(span, 'exception', { 'exception.message': error.message, 'exception.type': error.name });
  }

  private createNoopSpan(): TraceSpan {
    return {
      traceId: '',
      spanId: '',
      operationName: '',
      startTime: new Date(),
      status: 'ok',
      attributes: {},
      events: [],
    };
  }

  private async exportSpan(span: TraceSpan): Promise<void> {
    // In production: POST to OTLP/Jaeger endpoint
    try {
      // Simplified: just log it
      if (process.env.SI_TRACE_DEBUG) {
        console.log(JSON.stringify(span));
      }
    } catch { /* ignore export errors */ }
  }
}
