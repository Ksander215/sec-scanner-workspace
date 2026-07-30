/**
 * Window Manager — Implementation
 * Manages window lifecycle, state, positioning, and z-ordering.
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';
import type { DesktopConfig } from '../desktop-types.js';
import { WindowState, WindowType } from './types.js';
import type { WindowId, WindowInfo, WindowBounds, CreateWindowOptions, WindowLayout } from './types.js';
import { WindowNotFoundError, WindowLimitExceededError, InvalidWindowTransitionError } from './errors.js';

function brand(id: string): WindowId { return id as WindowId; }

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  [WindowState.Creating]: [WindowState.Active, WindowState.Hidden],
  [WindowState.Active]: [WindowState.Minimized, WindowState.Maximized, WindowState.Hidden, WindowState.Closed],
  [WindowState.Minimized]: [WindowState.Active, WindowState.Maximized, WindowState.Closed],
  [WindowState.Maximized]: [WindowState.Active, WindowState.Minimized, WindowState.Closed],
  [WindowState.Hidden]: [WindowState.Active, WindowState.Closed],
  [WindowState.Closed]: [],
};

const DEFAULT_BOUNDS: WindowBounds = { x: 0, y: 0, width: 1024, height: 768 };

export class WindowManager implements Service {
  readonly name = 'WindowManager';
  private windows = new Map<WindowId, WindowInfo>();
  private zCounter = 0;
  private focusedId: WindowId | null = null;
  private readonly config: DesktopConfig;
  private _initialized = false;

  constructor(config?: Partial<DesktopConfig>) {
    this.config = { appVersion: '1.0.0', environment: 'development', dataDir: './data', maxWindows: 20, crashRecoveryEnabled: true, ...config };
  }

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> { this.windows.clear(); this.focusedId = null; }
  async shutdown(): Promise<void> { this.windows.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  get count(): number { return this.windows.size; }
  get focusedWindow(): WindowInfo | null {
    if (!this.focusedId) return null;
    return this.windows.get(this.focusedId) ?? null;
  }

  getAll(): readonly WindowInfo[] { return [...this.windows.values()]; }
  getById(id: WindowId): WindowInfo {
    const w = this.windows.get(id);
    if (!w) throw new WindowNotFoundError(id);
    return w;
  }
  getByType(type: WindowType): readonly WindowInfo[] {
    return [...this.windows.values()].filter(w => w.type === type);
  }

  create(opts: CreateWindowOptions): WindowInfo {
    if (this.windows.size >= this.config.maxWindows) {
      throw new WindowLimitExceededError(this.config.maxWindows);
    }
    const id = brand(crypto.randomUUID());
    const now = new Date().toISOString() as Timestamp;
    const bounds: WindowBounds = { ...DEFAULT_BOUNDS, ...opts.bounds };
    const info: WindowInfo = {
      id, type: opts.type, title: opts.title ?? `Window ${id.slice(0, 8)}`,
      state: WindowState.Active, bounds, focused: false, zIndex: ++this.zCounter,
      createdAt: now, updatedAt: now,
    };
    this.windows.set(id, info);
    this.focus(id);
    return info;
  }

  close(id: WindowId): void {
    this.setState(id, WindowState.Closed);
    this.windows.delete(id);
    if (this.focusedId === id) {
      this.focusedId = null;
      const remaining = [...this.windows.values()].sort((a, b) => b.zIndex - a.zIndex);
      if (remaining.length > 0) this.focus(remaining[0]!.id);
    }
  }

  focus(id: WindowId): void {
    const w = this.windows.get(id);
    if (!w) throw new WindowNotFoundError(id);
    for (const win of this.windows.values()) {
      (win as { focused: boolean }).focused = false;
    }
    (w as { focused: boolean }).focused = true;
    (w as { zIndex: number }).zIndex = ++this.zCounter;
    this.focusedId = id;
  }

  setState(id: WindowId, newState: WindowState): void {
    const w = this.windows.get(id);
    if (!w) throw new WindowNotFoundError(id);
    const valid = VALID_TRANSITIONS[w.state];
    if (valid && !valid.includes(newState)) {
      throw new InvalidWindowTransitionError(w.state, newState, id);
    }
    (w as { state: WindowState }).state = newState;
    (w as { updatedAt: Timestamp }).updatedAt = new Date().toISOString() as Timestamp;
  }

  updateBounds(id: WindowId, bounds: Partial<WindowBounds>): void {
    const w = this.windows.get(id);
    if (!w) throw new WindowNotFoundError(id);
    (w as { bounds: WindowBounds }).bounds = { ...w.bounds, ...bounds };
    (w as { updatedAt: Timestamp }).updatedAt = new Date().toISOString() as Timestamp;
  }

  getLayout(): readonly WindowLayout[] {
    return [...this.windows.values()].map(w => ({ windowId: w.id, bounds: w.bounds, state: w.state }));
  }

  restoreLayout(layout: readonly WindowLayout[]): void {
    for (const l of layout) {
      const w = this.windows.get(l.windowId);
      if (w) {
        (w as { bounds: WindowBounds }).bounds = l.bounds;
        (w as { state: WindowState }).state = l.state;
      }
    }
  }
}
