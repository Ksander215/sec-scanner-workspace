/**
 * Tool Execution Context — Dependencies injected into every Tool.
 *
 * CON-001.000 AL-012: Tools receive only what they need.
 * No globals. No `new Logger()`. No `new Config()`.
 *
 * All context objects are created by the ToolRuntime and passed to tools.
 */
import type { ToolExecutionContext, ToolLogger, ToolClock, ToolMemoryHandle } from './types.js';
import type { CancellationToken } from '../pipeline/types.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { TrustZone } from '../types/common.js';

// ─── Default Logger ─────────────────────────────────────────
export class DefaultToolLogger implements ToolLogger {
  readonly toolName: string;
  private readonly entries: Array<{
    level: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
  }> = [];

  constructor(toolName: string) {
    this.toolName = toolName;
  }

  info(message: string, data?: Readonly<Record<string, unknown>>): void {
    this.entries.push({ level: 'info', message, data, timestamp: new Date().toISOString() });
  }

  warn(message: string, data?: Readonly<Record<string, unknown>>): void {
    this.entries.push({ level: 'warn', message, data, timestamp: new Date().toISOString() });
  }

  error(message: string, data?: Readonly<Record<string, unknown>>): void {
    this.entries.push({ level: 'error', message, data, timestamp: new Date().toISOString() });
  }

  debug(message: string, data?: Readonly<Record<string, unknown>>): void {
    this.entries.push({ level: 'debug', message, data, timestamp: new Date().toISOString() });
  }

  /** Get all logged entries (for testing and audit). */
  getEntries(): ReadonlyArray<{ level: string; message: string; data?: Record<string, unknown>; timestamp: string }> {
    return this.entries;
  }

  /** Get count of entries at a given level. */
  countByLevel(level: string): number {
    return this.entries.filter(e => e.level === level).length;
  }

  /** Clear all entries. */
  clear(): void {
    this.entries.length = 0;
  }
}

// ─── Default Clock ──────────────────────────────────────────
export class DefaultToolClock implements ToolClock {
  get now(): string {
    return new Date().toISOString();
  }

  get epochMs(): number {
    return Date.now();
  }
}

// ─── Test Clock (fixed time) ──────────────────────────────────
export class FixedToolClock implements ToolClock {
  private readonly _now: string;
  private readonly _epochMs: number;

  constructor(now: string, epochMs?: number) {
    this._now = now;
    this._epochMs = epochMs ?? new Date(now).getTime();
  }

  get now(): string { return this._now; }
  get epochMs(): number { return this._epochMs; }
}

// ─── In-Memory Memory Handle ────────────────────────────────
export class InMemoryToolMemory implements ToolMemoryHandle {
  readonly toolName: string;
  readonly scope: 'execution' | 'session' | 'persistent';
  private readonly store = new Map<string, unknown>();

  constructor(toolName: string, scope: 'execution' | 'session' | 'persistent' = 'execution') {
    this.toolName = toolName;
    this.scope = scope;
  }

  get(key: string): unknown {
    return this.store.get(key);
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /** Get all keys. */
  keys(): readonly string[] {
    return Array.from(this.store.keys());
  }

  /** Clear all entries. */
  clear(): void {
    this.store.clear();
  }
}

// ─── Context Factory ────────────────────────────────────────
export interface ToolContextFactoryOptions {
  readonly executionId: string;
  readonly toolName: string;
  readonly cancellationToken: CancellationToken;
  readonly eventPublisher: EventPublisher;
  readonly configuration?: Readonly<Record<string, unknown>>;
  readonly clock?: ToolClock;
  readonly memory?: ToolMemoryHandle;
  readonly trustZone: TrustZone;
}

/**
 * Create a ToolExecutionContext with all injected dependencies.
 */
export function createToolContext(options: ToolContextFactoryOptions): ToolExecutionContext {
  return {
    executionId: options.executionId,
    toolName: options.toolName,
    cancellationToken: options.cancellationToken,
    logger: new DefaultToolLogger(options.toolName),
    eventPublisher: options.eventPublisher,
    configuration: options.configuration ?? {},
    clock: options.clock ?? new DefaultToolClock(),
    memory: options.memory ?? new InMemoryToolMemory(options.toolName),
    trustZone: options.trustZone,
  };
}
