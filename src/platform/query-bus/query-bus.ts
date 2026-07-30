/**
 * Query Bus — Unified Query Mechanism (CQRS Ready)
 * TASK-AIS-005A.000 — Platform Integration Foundation
 */
import type { QueryEnvelope, QueryResult, QueryBus } from '../types.js';

export class PlatformQueryBus implements QueryBus {
  private handlers = new Map<string, (query: QueryEnvelope) => Promise<unknown>>();
  private readonly queryLog: QueryEnvelope[] = [];

  registerHandler<TPayload, TResult>(
    queryType: string,
    handler: (query: QueryEnvelope<TPayload>) => Promise<TResult>,
  ): void {
    this.handlers.set(queryType, handler as (query: QueryEnvelope) => Promise<unknown>);
  }

  async execute<TPayload, TResult>(
    queryType: string,
    payload: TPayload,
  ): Promise<QueryResult<TResult>> {
    const envelope: QueryEnvelope<TPayload> = Object.freeze({
      queryId: crypto.randomUUID(),
      queryType,
      payload,
      timestamp: new Date().toISOString(),
    });

    this.queryLog.push(envelope);

    const handler = this.handlers.get(queryType);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for query: ${queryType}`,
        timestamp: new Date().toISOString(),
        processingTimeMs: 0,
      };
    }

    const start = performance.now();
    try {
      const result = await handler(envelope);
      return {
        success: true,
        data: result as TResult,
        timestamp: new Date().toISOString(),
        processingTimeMs: performance.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
        processingTimeMs: performance.now() - start,
      };
    }
  }

  getQueryLog(): readonly QueryEnvelope[] {
    return this.queryLog;
  }

  clearLog(): void {
    this.queryLog.length = 0;
  }
}
