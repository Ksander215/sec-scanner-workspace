/**
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
