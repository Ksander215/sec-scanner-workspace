/**
 * Cancellation Token — cooperative cancellation for execution pipeline.
 *
 * Once cancel() is called, no new tasks are dispatched.
 * Already-running tasks receive cancellation but are not forcefully terminated.
 *
 * Conforms to: AIS-003B.000 Requirement #10 (Cancellation)
 */
import type { CancellationToken as ICancellationToken } from './types.js';

export class CancellationTokenImpl implements ICancellationToken {
  private _cancelled = false;
  private _reason?: string;
  private readonly callbacks: Array<() => void> = [];

  get cancelled(): boolean { return this._cancelled; }
  get reason(): string | undefined { return this._reason; }

  cancel(reason?: string): void {
    if (this._cancelled) return;
    this._cancelled = true;
    this._reason = reason;
    for (const cb of this.callbacks) {
      try { cb(); } catch { /* best-effort notification */ }
    }
    this.callbacks.length = 0;
  }

  onCancel(callback: () => void): void {
    if (this._cancelled) {
      try { callback(); } catch { /* best-effort notification */ }
      return;
    }
    this.callbacks.push(callback);
  }

  /** Throws if cancelled (guard for task dispatch). */
  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new Error(`Execution cancelled: ${this._reason ?? 'no reason provided'}`);
    }
  }
}
