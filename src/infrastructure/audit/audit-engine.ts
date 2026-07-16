import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuditEvent, AuditAction, AuditResult, AuditQuery, AuditStatistics } from './types.js';

export class AuditEngine {
  private events: AuditEvent[] = [];
  private directory: string;
  private retention: number;
  private flushInterval: NodeJS.Timeout | null = null;
  private dirty = false;

  constructor(directory: string, retention = 90) {
    this.directory = directory;
    this.retention = retention;
  }

  async initialize(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await this.loadToday();
    // Flush every 10 seconds if dirty
    this.flushInterval = setInterval(() => {
      if (this.dirty) this.flush();
    }, 10000);
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) clearInterval(this.flushInterval);
    await this.flush();
  }

  record(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const full: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
    };
    this.events.push(full);
    this.dirty = true;
    return full;
  }

  /** Convenience: record an API action */
  recordApiAction(params: {
    actor: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    ip: string;
    requestId: string;
    result: AuditResult;
    duration: number;
    details?: Record<string, unknown>;
  }): AuditEvent {
    return this.record(params);
  }

  query(query: AuditQuery): AuditEvent[] {
    let results = [...this.events];

    if (query.actor) results = results.filter(e => e.actor === query.actor);
    if (query.action) results = results.filter(e => e.action === query.action);
    if (query.resource) results = results.filter(e => e.resource === query.resource);
    if (query.result) results = results.filter(e => e.result === query.result);
    if (query.from) results = results.filter(e => e.timestamp >= query.from!);
    if (query.to) results = results.filter(e => e.timestamp <= query.to!);

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  getStatistics(from?: Date, to?: Date): AuditStatistics {
    let events = this.events;
    if (from) events = events.filter(e => e.timestamp >= from);
    if (to) events = events.filter(e => e.timestamp <= to);

    const byAction: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    const byActor: Record<string, number> = {};
    let errorCount = 0;
    let totalDuration = 0;

    for (const e of events) {
      byAction[e.action] = (byAction[e.action] ?? 0) + 1;
      byResult[e.result] = (byResult[e.result] ?? 0) + 1;
      byActor[e.actor] = (byActor[e.actor] ?? 0) + 1;
      if (e.result === 'error') errorCount++;
      totalDuration += e.duration;
    }

    return {
      totalEvents: events.length,
      byAction,
      byResult,
      byActor,
      errorCount,
      avgDurationMs: events.length > 0 ? totalDuration / events.length : 0,
    };
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const filePath = join(this.directory, `audit-${today}.jsonl`);
    const lines = this.events.map(e => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(filePath, lines, { flag: 'a' });
    this.dirty = false;
  }

  private async loadToday(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const filePath = join(this.directory, `audit-${today}.jsonl`);
    try {
      const content = await readFile(filePath, 'utf-8');
      this.events = content.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    } catch {
      this.events = [];
    }
  }
}
