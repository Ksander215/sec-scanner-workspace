#!/usr/bin/env python3
"""Fix all desktop source files."""
import os

BASE = '/home/z/my-project/src/desktop'

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

simple = ['local-storage-runtime', 'search-runtime', 'startup-runtime', 'settings-runtime', 'diagnostics-runtime', 'crash-recovery-runtime']
for sub in simple:
    w(f'{BASE}/{sub}/types.ts', f'/**
 * {sub.split("-")[0].title()} Runtime — Types
 */
// Types are defined inline in the runtime implementation
')

w(f'{BASE}/notification-runtime/types.ts', '/**
 * Notification Runtime — Types
 */
// Notification types are managed internally
')

w(f'{BASE}/command-palette/types.ts', '/**
 * Command Palette Runtime — Types
 */
// Command palette types are managed internally
')

w(f'{BASE}/local-storage-runtime/local-storage-runtime.ts', '''/**
 * Local Storage Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';

export class LocalStorageRuntime implements Service {
  readonly name = 'LocalStorageRuntime';
  private store = new Map<string, unknown>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> { this.store.clear(); }
  async shutdown(): Promise<void> { this.store.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  get<T>(key: string): T | undefined { return this.store.get(key) as T | undefined; }
  set<T>(key: string, value: T): void { this.store.set(key, value); }
  has(key: string): boolean { return this.store.has(key); }
  delete(key: string): boolean { return this.store.delete(key); }
  clear(): void { this.store.clear(); }
  get size(): number { return this.store.size; }
  keys(): readonly string[] { return [...this.store.keys()]; }
  entries(): readonly [string, unknown][] { return [...this.store.entries()]; }
}
''')

w(f'{BASE}/search-runtime/search-runtime.ts', '''/**
 * Search Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';

export class SearchRuntime implements Service {
  readonly name = 'SearchRuntime';
  private index = new Map<string, Map<string, unknown>>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.index.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }

  indexDocument(collection: string, id: string, data: Record<string, unknown>): void {
    if (!this.index.has(collection)) this.index.set(collection, new Map());
    this.index.get(collection)!.set(id, data);
  }
  removeFromIndex(collection: string, id: string): void { this.index.get(collection)?.delete(id); }
  search(collection: string, query: string): readonly Record<string, unknown>[] {
    const col = this.index.get(collection);
    if (!col) return [];
    const q = query.toLowerCase();
    return [...col.values()].filter(doc => Object.values(doc).some(v => String(v).toLowerCase().includes(q)));
  }
  getCollectionNames(): readonly string[] { return [...this.index.keys()]; }
  getCollectionSize(collection: string): number { return this.index.get(collection)?.size ?? 0; }
  clearCollection(collection: string): void { this.index.delete(collection); }
  clearAll(): void { this.index.clear(); }
}
''')

w(f'{BASE}/startup-runtime/startup-runtime.ts', '''/**
 * Startup Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';

export class StartupRuntime implements Service {
  readonly name = 'StartupRuntime';
  private steps: Array<{name: string; fn: () => Promise<void>}> = [];
  private completedSteps = new Set<string>();
  private startTime = 0;
  private endTime = 0;
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.steps = []; this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  registerStep(name: string, fn: () => Promise<void>): void { this.steps.push({ name, fn }); }
  async runStartupSequence(): Promise<void> {
    this.startTime = Date.now(); this.completedSteps.clear();
    for (const step of this.steps) { await step.fn(); this.completedSteps.add(step.name); }
    this.endTime = Date.now();
  }
  getStartupDuration(): number { return this.endTime - this.startTime; }
  getCompletedSteps(): readonly string[] { return [...this.completedSteps]; }
  getStepCount(): number { return this.steps.length; }
  isStepCompleted(name: string): boolean { return this.completedSteps.has(name); }
}
''')

w(f'{BASE}/settings-runtime/settings-runtime.ts', '''/**
 * Settings Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';

export class SettingsRuntime implements Service {
  readonly name = 'SettingsRuntime';
  private settings = new Map<string, unknown>();
  private defaults = new Map<string, unknown>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.settings.clear(); this.defaults.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  registerDefault(key: string, value: unknown): void { this.defaults.set(key, value); }
  get<T>(key: string): T | undefined {
    if (this.settings.has(key)) return this.settings.get(key) as T | undefined;
    return this.defaults.get(key) as T | undefined;
  }
  set<T>(key: string, value: T): void { this.settings.set(key, value); }
  has(key: string): boolean { return this.settings.has(key); }
  delete(key: string): boolean { return this.settings.delete(key); }
  getAll(): ReadonlyMap<string, unknown> { return this.settings; }
  getDefaults(): ReadonlyMap<string, unknown> { return this.defaults; }
  clear(): void { this.settings.clear(); }
  exportSettings(): Record<string, unknown> { return Object.fromEntries(this.settings); }
  importSettings(data: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(data)) this.settings.set(k, v);
  }
}
''')

w(f'{BASE}/diagnostics-runtime/diagnostics-runtime.ts', '''/**
 * Diagnostics Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';

export class DiagnosticsRuntime implements Service {
  readonly name = 'DiagnosticsRuntime';
  private healthChecks = new Map<string, () => Promise<{healthy: boolean; message?: string}>>();
  private metrics = new Map<string, number>();
  private logs: Array<{level: string; message: string; timestamp: Timestamp}> = [];
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.healthChecks.clear(); this.metrics.clear(); this.logs = []; this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  registerHealthCheck(name: string, check: () => Promise<{healthy: boolean; message?: string}>): void { this.healthChecks.set(name, check); }
  async runHealthChecks(): Promise<Record<string, {healthy: boolean; message?: string}>> {
    const results: Record<string, {healthy: boolean; message?: string}> = {};
    for (const [name, check] of this.healthChecks) { results[name] = await check(); }
    return results;
  }
  recordMetric(name: string, value: number): void { this.metrics.set(name, value); }
  getMetric(name: string): number | undefined { return this.metrics.get(name); }
  getAllMetrics(): ReadonlyMap<string, number> { return this.metrics; }
  log(level: string, message: string): void { this.logs.push({ level, message, timestamp: new Date().toISOString() as Timestamp }); }
  getLogs(): Array<{level: string; message: string; timestamp: Timestamp}> { return this.logs; }
  clearLogs(): void { this.logs = []; }
  getHealthCheckCount(): number { return this.healthChecks.size; }
}
''')

w(f'{BASE}/crash-recovery-runtime/crash-recovery-runtime.ts', '''/**
 * Crash Recovery Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';

export class CrashRecoveryRuntime implements Service {
  readonly name = 'CrashRecoveryRuntime';
  private snapshots = new Map<string, Record<string, unknown>>();
  private crashLog: Array<{timestamp: Timestamp; reason: string; state: Record<string, unknown>}> = [];
  private _lastCrashRecovered = false;
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.snapshots.clear(); this.crashLog = []; this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  saveSnapshot(id: string, state: Record<string, unknown>): void { this.snapshots.set(id, { ...state, savedAt: new Date().toISOString() }); }
  getSnapshot(id: string): Record<string, unknown> | undefined { return this.snapshots.get(id); }
  hasSnapshot(id: string): boolean { return this.snapshots.has(id); }
  deleteSnapshot(id: string): boolean { return this.snapshots.delete(id); }
  getSnapshotIds(): readonly string[] { return [...this.snapshots.keys()]; }
  recordCrash(reason: string, state: Record<string, unknown>): void {
    this.crashLog.push({ timestamp: new Date().toISOString() as Timestamp, reason, state });
  }
  getLastCrash(): {timestamp: Timestamp; reason: string; state: Record<string, unknown>} | undefined {
    return this.crashLog[this.crashLog.length - 1];
  }
  getCrashCount(): number { return this.crashLog.length; }
  get lastCrashRecovered(): boolean { return this._lastCrashRecovered; }
  setCrashRecovered(v: boolean): void { this._lastCrashRecovered = v; }
  clearCrashLog(): void { this.crashLog = []; }
  clearSnapshots(): void { this.snapshots.clear(); }
}
''')

w(f'{BASE}/command-palette/command-palette.ts', '''/**
 * Command Palette Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';
import { CommandPaletteNotFoundError } from './errors.js';

export class CommandPaletteRuntime implements Service {
  readonly name = 'CommandPaletteRuntime';
  private commands = new Map<string, {id: string; label: string; description: string; category: string; keybinding: string | null; enabled: boolean; handler: () => void | Promise<void>}>();
  private history: Array<{query: string; timestamp: number}> = [];
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.commands.clear(); this.history = []; this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  register(id: string, label: string, handler: () => void | Promise<void>, opts?: {description?: string; category?: string; keybinding?: string | null}): void {
    this.commands.set(id, { id, label, description: opts?.description ?? '', category: opts?.category ?? 'General', keybinding: opts?.keybinding ?? null, enabled: true, handler });
  }
  unregister(id: string): boolean { return this.commands.delete(id); }
  async execute(id: string): Promise<void> {
    const cmd = this.commands.get(id);
    if (!cmd) throw new CommandPaletteNotFoundError(id);
    if (!cmd.enabled) throw new CommandPaletteNotFoundError(id);
    await cmd.handler();
    this.history.push({ query: cmd.label, timestamp: Date.now() });
  }
  search(query: string): readonly Array<{id: string; label: string; description: string; category: string; keybinding: string | null}> {
    const q = query.toLowerCase();
    return [...this.commands.values()].filter(c => c.enabled && (c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))).map(c => ({ id: c.id, label: c.label, description: c.description, category: c.category, keybinding: c.keybinding }));
  }
  getAll(): readonly Array<{id: string; label: string; description: string; category: string; keybinding: string | null; enabled: boolean}> { return [...this.commands.values()]; }
  getHistory(): readonly Array<{query: string; timestamp: number}> { return this.history; }
  setEnabled(id: string, enabled: boolean): void { const cmd = this.commands.get(id); if (cmd) cmd.enabled = enabled; }
  getCount(): number { return this.commands.size; }
}
''')

w(f'{BASE}/command-palette/index.ts', 'export { CommandPaletteRuntime } from \x27./command-palette.js\x27;\nexport { CommandPaletteError, CommandPaletteNotFoundError } from \x27./errors.js\x27;\n')

w(f'{BASE}/notification-runtime/notification-runtime.ts', '''/**
 * Notification Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';

export class NotificationRuntime implements Service {
  readonly name = 'NotificationRuntime';
  private notifications: Array<{id: string; title: string; body: string; type: string; priority: number; read: boolean; createdAt: Timestamp; expiresAt: string | null}> = [];
  private _unreadCount = 0;
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.notifications = []; this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  create(title: string, body: string, type?: string, priority?: number): string {
    const id = crypto.randomUUID(); const now = new Date().toISOString() as Timestamp;
    this.notifications.push({ id, title, body, type: type ?? 'info', priority: priority ?? 0, read: false, createdAt: now, expiresAt: null });
    this._unreadCount++; return id;
  }
  markRead(id: string): void { const n = this.notifications.find(n => n.id === id); if (n && !n.read) { n.read = true; this._unreadCount--; } }
  markAllRead(): void { for (const n of this.notifications) { if (!n.read) { n.read = true; } } this._unreadCount = 0; }
  getUnreadCount(): number { return this._unreadCount; }
  getAll(): Array<{id: string; title: string; body: string; type: string; priority: number; read: boolean; createdAt: Timestamp; expiresAt: string | null}> { return this.notifications; }
  getById(id: string): {id: string; title: string; body: string; type: string; priority: number; read: boolean; createdAt: Timestamp; expiresAt: string | null} | undefined { return this.notifications.find(n => n.id === id); }
  delete(id: string): void { const idx = this.notifications.findIndex(n => n.id === id); if (idx >= 0) { if (!this.notifications[idx]!.read) this._unreadCount--; this.notifications.splice(idx, 1); } }
  clear(): void { this.notifications = []; this._unreadCount = 0; }
}
''')

w(f'{BASE}/notification-runtime/index.ts', 'export { NotificationRuntime } from \x27./notification-runtime.js\x27;\nexport { NotificationError, NotificationNotFoundError } from \x27./errors.js\x27;\n')

w(f'{BASE}/session-runtime/index.ts', 'export { SessionRuntime } from \x27./session-runtime.js\x27;\nexport { SessionError, SessionNotFoundError } from \x27./errors.js\x27;\nexport type { SessionId, SessionEntity, CreateSessionOptions } from \x27./types.js\x27;\n')

w(f'{BASE}/theme-runtime/index.ts', 'export { ThemeRuntime } from \x27./theme-runtime.js\x27;\nexport { ThemePreset } from \x27./types.js\x27;\nexport type { ThemeId, ThemeEntity, CreateThemeOptions } from \x27./types.js\x27;\nexport { ThemeError, ThemeNotFoundError } from \x27./errors.js\x27;\n')

w(f'{BASE}/project-runtime/index.ts', 'export { ProjectRuntime } from \x27./project-runtime.js\x27;\nexport type { ProjectId, ProjectEntity, CreateProjectOptions } from \x27./types.js\x27;\nexport { ProjectError, ProjectNotFoundError } from \x27./errors.js\x27;\n')

print('All fixes applied')
