#!/usr/bin/env python3
"""Generate all Desktop Foundation source files."""
import os

BASE = "/home/z/my-project/src/desktop"
UI_BASE = "/home/z/my-project/src/ui"

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

# ═══════════════════════════════════════════════════════════════════
# SHARED DESKTOP TYPES
# ═══════════════════════════════════════════════════════════════════
w(f"{BASE}/desktop-types.ts", '''/**
 * Desktop Foundation — Shared Types
 */
import type { Identifier, Timestamp } from '../core/types/common.js';
import type { DomainEventBase } from '../core/domain/events/domain-event.js';
import { EventClassification } from '../core/types/common.js';
import type { Service } from '../core/services/service.js';
import type { EventBus } from '../core/events/event-bus.js';

export type { Identifier, Timestamp, Service, EventBus, DomainEventBase };
export { EventClassification };

export type DesktopService = Service;

export interface DesktopConfig {
  readonly appVersion: string;
  readonly environment: 'development' | 'staging' | 'production';
  readonly dataDir: string;
  readonly maxWindows: number;
  readonly crashRecoveryEnabled: boolean;
}

export const DefaultDesktopConfig: DesktopConfig = {
  appVersion: '1.0.0',
  environment: 'development',
  dataDir: './data',
  maxWindows: 20,
  crashRecoveryEnabled: true,
};

export function createDesktopEvent(
  eventType: string,
  classification: EventClassification,
  aggregateId: Identifier,
  aggregateType: string,
  payload: Record<string, unknown>,
  sequence: number,
): DomainEventBase {
  return {
    eventId: crypto.randomUUID() as Identifier,
    eventType,
    classification,
    timestamp: new Date().toISOString() as Timestamp,
    sequence,
    aggregateId,
    aggregateType,
    version: '1.0.0',
    payload,
  };
}
''')

# ═══════════════════════════════════════════════════════════════════
# 1. WINDOW MANAGER
# ═══════════════════════════════════════════════════════════════════
w(f"{BASE}/window-manager/types.ts", '''/**
 * Window Manager — Types
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';

export type WindowId = Identifier & { readonly __brand: 'WindowId' };

export enum WindowState {
  Creating = 'Creating',
  Active = 'Active',
  Minimized = 'Minimized',
  Maximized = 'Maximized',
  Hidden = 'Hidden',
  Closed = 'Closed',
}

export enum WindowType {
  Main = 'Main',
  Conversation = 'Conversation',
  Project = 'Project',
  Settings = 'Settings',
  Diagnostics = 'Diagnostics',
  Floating = 'Floating',
}

export interface WindowBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WindowInfo {
  readonly id: WindowId;
  readonly type: WindowType;
  readonly title: string;
  readonly state: WindowState;
  readonly bounds: WindowBounds;
  readonly focused: boolean;
  readonly zIndex: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface CreateWindowOptions {
  readonly type: WindowType;
  readonly title?: string;
  readonly bounds?: Partial<WindowBounds>;
  readonly parentId?: WindowId;
}

export interface WindowLayout {
  readonly windowId: WindowId;
  readonly bounds: WindowBounds;
  readonly state: WindowState;
}
''')

w(f"{BASE}/window-manager/errors.ts", '''/**
 * Window Manager — Errors
 */
export class WindowManagerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly windowId?: string,
  ) {
    super(message);
    this.name = 'WindowManagerError';
  }
}

export class WindowNotFoundError extends WindowManagerError {
  constructor(windowId: string) {
    super(`Window not found: ${windowId}`, 'WINDOW_NOT_FOUND', windowId);
    this.name = 'WindowNotFoundError';
  }
}

export class WindowLimitExceededError extends WindowManagerError {
  constructor(limit: number) {
    super(`Window limit exceeded: max ${limit}`, 'WINDOW_LIMIT_EXCEEDED');
    this.name = 'WindowLimitExceededError';
  }
}

export class InvalidWindowTransitionError extends WindowManagerError {
  constructor(from: string, to: string, windowId?: string) {
    super(`Invalid window transition: ${from} -> ${to}`, 'INVALID_WINDOW_TRANSITION', windowId);
    this.name = 'InvalidWindowTransitionError';
  }
}

export class DuplicateWindowError extends WindowManagerError {
  constructor(windowId: string) {
    super(`Duplicate window: ${windowId}`, 'DUPLICATE_WINDOW', windowId);
    this.name = 'DuplicateWindowError';
  }
}
''')

w(f"{BASE}/window-manager/window-manager.ts", '''/**
 * Window Manager — Implementation
 * Manages window lifecycle, state, positioning, and z-ordering.
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';
import type { EventBus } from '../../core/events/event-bus.js';
import type { Service } from '../../core/services/service.js';
import type { DesktopConfig } from '../desktop-types.js';
import { WindowState, WindowType } from './types.js';
import type { WindowId, WindowInfo, WindowBounds, CreateWindowOptions, WindowLayout } from './types.js';
import { WindowNotFoundError, WindowLimitExceededError, InvalidWindowTransitionError, DuplicateWindowError } from './errors.js';

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
  private readonly eventBus: EventBus | null = null;
  private _initialized = false;

  constructor(config?: Partial<DesktopConfig>, eventBus?: EventBus) {
    this.config = { appVersion: '1.0.0', environment: 'development', dataDir: './data', maxWindows: 20, crashRecoveryEnabled: true, ...config };
    this.eventBus = eventBus ?? null;
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
''')

w(f"{BASE}/window-manager/index.ts", '''export { WindowManager } from './window-manager.js';
export { WindowState, WindowType } from './types.js';
export type { WindowId, WindowInfo, WindowBounds, CreateWindowOptions, WindowLayout } from './types.js';
export { WindowManagerError, WindowNotFoundError, WindowLimitExceededError, InvalidWindowTransitionError, DuplicateWindowError } from './errors.js';
''')
print("window-manager: OK")

# ═══════════════════════════════════════════════════════════════════
# 2. NAVIGATION RUNTIME
# ═══════════════════════════════════════════════════════════════════
w(f"{BASE}/navigation-runtime/types.ts", '''/**
 * Navigation Runtime — Types
 */
import type { Identifier } from '../../core/types/common.js';

export type ScreenId = Identifier & { readonly __brand: 'ScreenId' };
export type RouteId = Identifier & { readonly __brand: 'RouteId' };

export enum ScreenName {
  Home = 'Home',
  Conversation = 'Conversation',
  Projects = 'Projects',
  Memory = 'Memory',
  Knowledge = 'Knowledge',
  Workflows = 'Workflows',
  Marketplace = 'Marketplace',
  Settings = 'Settings',
  Diagnostics = 'Diagnostics',
}

export interface ScreenDefinition {
  readonly id: ScreenId;
  readonly name: ScreenName;
  readonly path: string;
  readonly title: string;
  readonly icon?: string;
  readonly order: number;
}

export interface NavigationEntry {
  readonly screenId: ScreenId;
  readonly path: string;
  readonly timestamp: number;
  readonly params?: Record<string, string>;
}

export interface NavigationState {
  readonly current: ScreenDefinition | null;
  readonly history: readonly NavigationEntry[];
  readonly historyIndex: number;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}
''')

w(f"{BASE}/navigation-runtime/errors.ts", '''/**
 * Navigation Runtime — Errors
 */
export class NavigationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'NavigationError';
  }
}

export class ScreenNotFoundError extends NavigationError {
  constructor(path: string) {
    super(`Screen not found: ${path}`, 'SCREEN_NOT_FOUND');
    this.name = 'ScreenNotFoundError';
  }
}

export class NavigationHistoryError extends NavigationError {
  constructor(message: string) {
    super(message, 'NAVIGATION_HISTORY_ERROR');
    this.name = 'NavigationHistoryError';
  }
}

export class DuplicateScreenError extends NavigationError {
  constructor(path: string) {
    super(`Duplicate screen path: ${path}`, 'DUPLICATE_SCREEN');
    this.name = 'DuplicateScreenError';
  }
}
''')

w(f"{BASE}/navigation-runtime/navigation-runtime.ts", '''/**
 * Navigation Runtime — Implementation
 * Manages screen registration, routing, and history.
 */
import type { Identifier } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';
import { ScreenName } from './types.js';
import type { ScreenId, RouteId, ScreenDefinition, NavigationEntry, NavigationState } from './types.js';
import { ScreenNotFoundError, NavigationHistoryError, DuplicateScreenError } from './errors.js';

function brandScreen(id: string): ScreenId { return id as ScreenId; }
function brandRoute(id: string): RouteId { return id as RouteId; }

const DEFAULT_SCREENS: readonly ScreenDefinition[] = [
  { id: brandScreen('screen-home'), name: ScreenName.Home, path: '/', title: 'Home', icon: 'home', order: 0 },
  { id: brandScreen('screen-conversation'), name: ScreenName.Conversation, path: '/conversation', title: 'Conversation', icon: 'message', order: 1 },
  { id: brandScreen('screen-projects'), name: ScreenName.Projects, path: '/projects', title: 'Projects', icon: 'folder', order: 2 },
  { id: brandScreen('screen-memory'), name: ScreenName.Memory, path: '/memory', title: 'Memory', icon: 'brain', order: 3 },
  { id: brandScreen('screen-knowledge'), name: ScreenName.Knowledge, path: '/knowledge', title: 'Knowledge', icon: 'book', order: 4 },
  { id: brandScreen('screen-workflows'), name: ScreenName.Workflows, path: '/workflows', title: 'Workflows', icon: 'workflow', order: 5 },
  { id: brandScreen('screen-marketplace'), name: ScreenName.Marketplace, path: '/marketplace', title: 'Marketplace', icon: 'store', order: 6 },
  { id: brandScreen('screen-settings'), name: ScreenName.Settings, path: '/settings', title: 'Settings', icon: 'settings', order: 7 },
  { id: brandScreen('screen-diagnostics'), name: ScreenName.Diagnostics, path: '/diagnostics', title: 'Diagnostics', icon: 'activity', order: 8 },
];

export class NavigationRuntime implements Service {
  readonly name = 'NavigationRuntime';
  private screens = new Map<string, ScreenDefinition>();
  private history: NavigationEntry[] = [];
  private historyIndex = -1;
  private _initialized = false;

  async initialize(): Promise<void> {
    for (const s of DEFAULT_SCREENS) this.registerScreen(s);
    this._initialized = true;
  }
  async start(): Promise<void> { this.navigate('/'); }
  async stop(): Promise<void> { this.history = []; this.historyIndex = -1; }
  async shutdown(): Promise<void> { this.screens.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }

  registerScreen(screen: ScreenDefinition): void {
    if (this.screens.has(screen.path)) throw new DuplicateScreenError(screen.path);
    this.screens.set(screen.path, screen);
  }

  unregisterScreen(path: string): void { this.screens.delete(path); }

  getScreen(path: string): ScreenDefinition {
    const s = this.screens.get(path);
    if (!s) throw new ScreenNotFoundError(path);
    return s;
  }

  getAllScreens(): readonly ScreenDefinition[] {
    return [...this.screens.values()].sort((a, b) => a.order - b.order);
  }

  getScreenByName(name: ScreenName): ScreenDefinition | null {
    return [...this.screens.values()].find(s => s.name === name) ?? null;
  }

  navigate(path: string, params?: Record<string, string>): void {
    const screen = this.getScreen(path);
    const entry: NavigationEntry = { screenId: screen.id, path, timestamp: Date.now(), params };
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(entry);
    this.historyIndex = this.history.length - 1;
  }

  goBack(): void {
    if (this.historyIndex <= 0) throw new NavigationHistoryError('Cannot go back');
    this.historyIndex--;
  }

  goForward(): void {
    if (this.historyIndex >= this.history.length - 1) throw new NavigationHistoryError('Cannot go forward');
    this.historyIndex++;
  }

  getState(): NavigationState {
    const currentEntry = this.history[this.historyIndex] as NavigationEntry | undefined;
    const current = currentEntry ? this.screens.get(currentEntry.path) ?? null : null;
    return {
      current,
      history: this.history,
      historyIndex: this.historyIndex,
      canGoBack: this.historyIndex > 0,
      canGoForward: this.historyIndex < this.history.length - 1,
    };
  }

  get currentPath(): string {
    const entry = this.history[this.historyIndex];
    return entry?.path ?? '/';
  }

  get historyCount(): number { return this.history.length; }
}
''')

w(f"{BASE}/navigation-runtime/index.ts", '''export { NavigationRuntime } from './navigation-runtime.js';
export { ScreenName } from './types.js';
export type { ScreenId, RouteId, ScreenDefinition, NavigationEntry, NavigationState } from './types.js';
export { NavigationError, ScreenNotFoundError, NavigationHistoryError, DuplicateScreenError } from './errors.js';
''')
print("navigation-runtime: OK")

# ═══════════════════════════════════════════════════════════════════
# 3. WORKSPACE RUNTIME
# ═══════════════════════════════════════════════════════════════════
w(f"{BASE}/workspace-runtime/types.ts", '''/**
 * Workspace Runtime — Types
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';

export type WorkspaceId = Identifier & { readonly __brand: 'WorkspaceId' };

export enum WorkspaceState {
  Active = 'Active',
  Inactive = 'Inactive',
  Archived = 'Archived',
}

export interface Workspace {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly description: string;
  readonly state: WorkspaceState;
  readonly projectId?: Identifier;
  readonly layout: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface CreateWorkspaceOptions {
  readonly name: string;
  readonly description?: string;
  readonly projectId?: Identifier;
  readonly layout?: Record<string, unknown>;
}
''')

w(f"{BASE}/workspace-runtime/errors.ts", '''/**
 * Workspace Runtime — Errors
 */
export class WorkspaceError extends Error {
  constructor(message: string, public readonly code: string, public readonly workspaceId?: string) {
    super(message);
    this.name = 'WorkspaceError';
  }
}

export class WorkspaceNotFoundError extends WorkspaceError {
  constructor(id: string) {
    super(`Workspace not found: ${id}`, 'WORKSPACE_NOT_FOUND', id);
    this.name = 'WorkspaceNotFoundError';
  }
}

export class DuplicateWorkspaceError extends WorkspaceError {
  constructor(name: string) {
    super(`Duplicate workspace name: ${name}`, 'DUPLICATE_WORKSPACE');
    this.name = 'DuplicateWorkspaceError';
  }
}
''')

w(f"{BASE}/workspace-runtime/workspace-runtime.ts", '''/**
 * Workspace Runtime — Implementation
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';
import { WorkspaceState } from './types.js';
import type { WorkspaceId, Workspace, CreateWorkspaceOptions } from './types.js';
import { WorkspaceNotFoundError, DuplicateWorkspaceError, WorkspaceError } from './errors.js';

function brand(id: string): WorkspaceId { return id as WorkspaceId; }

export class WorkspaceRuntime implements Service {
  readonly name = 'WorkspaceRuntime';
  private workspaces = new Map<WorkspaceId, Workspace>();
  private activeId: WorkspaceId | null = null;
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> { this.activeId = null; }
  async shutdown(): Promise<void> { this.workspaces.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  get activeWorkspace(): Workspace | null {
    if (!this.activeId) return null;
    return this.workspaces.get(this.activeId) ?? null;
  }
  get count(): number { return this.workspaces.size; }

  create(opts: CreateWorkspaceOptions): Workspace {
    const existing = [...this.workspaces.values()].find(w => w.name === opts.name);
    if (existing) throw new DuplicateWorkspaceError(opts.name);
    const now = new Date().toISOString() as Timestamp;
    const ws: Workspace = {
      id: brand(crypto.randomUUID()), name: opts.name,
      description: opts.description ?? '', state: WorkspaceState.Active,
      projectId: opts.projectId, layout: opts.layout ?? {}, createdAt: now, updatedAt: now,
    };
    this.workspaces.set(ws.id, ws);
    if (!this.activeId) this.activeId = ws.id;
    return ws;
  }

  getById(id: WorkspaceId): Workspace {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    return ws;
  }

  getAll(): readonly Workspace[] { return [...this.workspaces.values()]; }

  getActive(): Workspace | null {
    if (!this.activeId) return null;
    return this.workspaces.get(this.activeId) ?? null;
  }

  switch(id: WorkspaceId): void {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    this.activeId = id;
  }

  updateLayout(id: WorkspaceId, layout: Record<string, unknown>): void {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    const updated: Workspace = { ...ws, layout, updatedAt: new Date().toISOString() as Timestamp };
    this.workspaces.set(id, updated);
  }

  archive(id: WorkspaceId): void {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    const updated: Workspace = { ...ws, state: WorkspaceState.Archived, updatedAt: new Date().toISOString() as Timestamp };
    this.workspaces.set(id, updated);
    if (this.activeId === id) {
      const next = [...this.workspaces.values()].find(w => w.state === WorkspaceState.Active);
      this.activeId = next?.id ?? null;
    }
  }

  delete(id: WorkspaceId): void {
    if (!this.workspaces.has(id)) throw new WorkspaceNotFoundError(id);
    this.workspaces.delete(id);
    if (this.activeId === id) {
      const next = [...this.workspaces.values()].find(w => w.state === WorkspaceState.Active);
      this.activeId = next?.id ?? null;
    }
  }
}
''')

w(f"{BASE}/workspace-runtime/index.ts", '''export { WorkspaceRuntime } from './workspace-runtime.js';
export { WorkspaceState } from './types.js';
export type { WorkspaceId, Workspace, CreateWorkspaceOptions } from './types.js';
export { WorkspaceError, WorkspaceNotFoundError, DuplicateWorkspaceError } from './errors.js';
''')
print("workspace-runtime: OK")

# ═══════════════════════════════════════════════════════════════════
# GENERATE REMAINING 12 SUBSYSTEMS VIA TEMPLATE
# ═══════════════════════════════════════════════════════════════════

SUBSYSTEMS = [
  ("project-runtime", "Project", [
    ("ProjectId", "project"),
  ], {
    "fields": "name: string; description: string; settings: Record<string, unknown>; tags: readonly string[]",
    "create_fields": "name: string; description?: string; settings?: Record<string, unknown>; tags?: readonly string[]",
  }),
  ("session-runtime", "Session", [
    ("SessionId", "session"),
  ], {
    "fields": "userId: string; identitySnapshot: Record<string, unknown>; metadata: Record<string, unknown>",
    "create_fields": "userId: string; identitySnapshot?: Record<string, unknown>",
  }),
  ("local-storage-runtime", "LocalStorage", [
    ("StorageKey", "storage"),
  ], {
    "fields": "",
    "simple": True,
  }),
  ("theme-runtime", "Theme", [
    ("ThemeId", "theme"),
  ], {
    "fields": "name: string; colors: Record<string, string>; fontFamily: string; fontSize: number; isDark: boolean",
    "create_fields": "name: string; colors?: Record<string, string>; fontFamily?: string; fontSize?: number; isDark?: boolean",
    "enum_values": "Light, Dark, System, Custom",
  }),
  ("notification-runtime", "Notification", [
    ("NotificationId", "notification"),
  ], {
    "fields": "title: string; body: string; type: string; priority: number; read: boolean; expiresAt: string | null",
    "create_fields": "title: string; body: string; type?: string; priority?: number",
    "simple": False,
  }),
  ("command-palette", "CommandPalette", [
    ("CommandId", "command"),
  ], {
    "fields": "label: string; description: string; category: string; keybinding: string | null; enabled: boolean",
    "create_fields": "label: string; description: string; category?: string; keybinding?: string | null",
    "simple": False,
  }),
  ("search-runtime", "Search", [
  ], {
    "fields": "",
    "simple": True,
  }),
  ("startup-runtime", "Startup", [
  ], {
    "fields": "",
    "simple": True,
  }),
  ("settings-runtime", "Settings", [
  ], {
    "fields": "",
    "simple": True,
  }),
  ("diagnostics-runtime", "Diagnostics", [
  ], {
    "fields": "",
    "simple": True,
  }),
  ("crash-recovery-runtime", "CrashRecovery", [
  ], {
    "fields": "",
    "simple": True,
  }),
]

for subdir, name, branded_ids, opts in SUBSYSTEMS:
    snake = name.lower()
    camel = name
    has_entity = bool(opts.get("fields", "")) and not opts.get("simple", False)
    
    # Types
    types_content = f'''/**
 * {name} Runtime — Types
 */
import type {{ Identifier, Timestamp }} from '../../core/types/common.js';
'''
    
    for bid, _ in branded_ids:
        types_content += f'export type {bid} = Identifier & {{ readonly __brand: \u2019{bid}\u2019 }};\n'
    
    if has_entity and "enum_values" in opts:
        enum_name = f"{name}Preset"
        values = opts["enum_values"]
        types_content += f'\nexport enum {enum_name} {{\n'
        for v in values.split(", "):
            types_content += f'  {v.strip()} = \'{v.strip()}\',\n'
        types_content += '}\n'
    
    if has_entity:
        eid = branded_ids[0][0] if branded_ids else "Identifier"
        fields = opts["fields"]
        types_content += f'''\nexport interface {name}Entity {{
  readonly id: {eid};
  {fields.replace(", ", ";\n  ")};
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}}\n'''
        cf = opts.get("create_fields", "")
        if cf:
            types_content += f'\nexport interface Create{camel}Options {{\n  {cf.replace(", ", ";\n  ")};\n}}\n'
    
    w(f"{BASE}/{subdir}/types.ts", types_content)
    
    # Errors
    errors_content = f'''/**
 * {name} Runtime — Errors
 */
export class {name}Error extends Error {{
  constructor(message: string, public readonly code: string, public readonly {snake}Id?: string) {{
    super(message);
    this.name = '{name}Error';
  }}
}}

export class {name}NotFoundError extends {name}Error {{
  constructor(id: string) {{
    super('{name} not found: ' + id, '{snake.upper()}_NOT_FOUND', id);
    this.name = '{name}NotFoundError';
  }}
}}
'''
    w(f"{BASE}/{subdir}/errors.ts", errors_content)
    
    # Implementation
    impl = f'''/**
 * {name} Runtime — Implementation
 */
import type {{ Identifier, Timestamp }} from '../../core/types/common.js';
import type {{ Service }} from '../../core/services/service.js';
'''
    if has_entity:
        impl += f"import type {{ {branded_ids[0][0] if branded_ids else 'Identifier'}, {name}Entity }} from './types.js';\n"
        if "create_fields" in opts:
            impl += f"import type {{ Create{camel}Options }} from './types.js';\n"
    impl += f"import {{ {name}NotFoundError, {name}Error }} from './errors.js';\n\n"
    
    if branded_ids:
        for bid, _ in branded_ids:
            impl += f'function brand(id: string): {bid} {{ return id as {bid}; }}\n'
        impl += '\n'
    
    impl += f'export class {camel}Runtime implements Service {{\n  readonly name = \u2019{camel}Runtime\u2019;\n  private _initialized = false;\n'
    
    if has_entity:
        eid = branded_ids[0][0] if branded_ids else 'Identifier'
        impl += f'  private items = new Map<{eid}, {name}Entity>();\n'
    elif subdir == 'local-storage-runtime':
        impl += '  private store = new Map<string, unknown>();\n'
    elif subdir == 'search-runtime':
        impl += '  private index = new Map<string, Map<string, unknown>>();\n'
    elif subdir == 'startup-runtime':
        impl += '  private steps: Array<{name: string; fn: () => Promise<void>}> = [];\n  private completedSteps = new Set<string>();\n  private startTime = 0;\n  private endTime = 0;\n'
    elif subdir == 'settings-runtime':
        impl += '  private settings = new Map<string, unknown>();\n  private defaults = new Map<string, unknown>();\n'
    elif subdir == 'diagnostics-runtime':
        impl += '  private healthChecks = new Map<string, () => Promise<{healthy: boolean; message?: string}>>();\n  private metrics = new Map<string, number>();\n  private logs: Array<{level: string; message: string; timestamp: Timestamp}> = [];\n'
    elif subdir == 'crash-recovery-runtime':
        impl += '  private snapshots = new Map<string, Record<string, unknown>>();\n  private crashLog: Array<{timestamp: Timestamp; reason: string; state: Record<string, unknown>}> = [];\n  private _lastCrashRecovered = false;\n'
    elif subdir == 'command-palette':
        impl += '  private commands = new Map<string, {id: string; label: string; description: string; category: string; keybinding: string | null; enabled: boolean; handler: () => void | Promise<void>}>();\n  private history: Array<{query: string; timestamp: number}> = [];\n'
    elif subdir == 'notification-runtime':
        impl += '  private notifications: Array<{id: string; title: string; body: string; type: string; priority: number; read: boolean; createdAt: Timestamp; expiresAt: string | null}> = [];\n  private _unreadCount = 0;\n'
    
    impl += '\n  async initialize(): Promise<void> { this._initialized = true; }\n'
    impl += '  async start(): Promise<void> {}\n'
    impl += '  async stop(): Promise<void> {}\n'
    impl += '  async shutdown(): Promise<void> { this._initialized = false; }\n\n'
    impl += '  get initialized(): boolean { return this._initialized; }\n'
    
    # Add specific methods per subsystem
    if has_entity:
        eid = branded_ids[0][0] if branded_ids else 'Identifier'
        impl += f'  get count(): number {{ return this.items.size; }}\n\n'
        impl += f'  create(opts: Create{camel}Options): {name}Entity {{\n'
        impl += f'    const now = new Date().toISOString() as Timestamp;\n'
        if "tags" in opts.get("create_fields", ""):
            impl += f'    const entity: {name}Entity = {{\n'
            impl += f'      id: brand(crypto.randomUUID()), name: opts.name, description: opts.description ?? \'\',\n'
            impl += f'      settings: opts.settings ?? {{}}, tags: opts.tags ?? [],\n'
            impl += f'      createdAt: now, updatedAt: now,\n'
            impl += f'    }};\n'
        elif "colors" in opts.get("create_fields", ""):
            impl += f'    const entity: {name}Entity = {{\n'
            impl += f'      id: brand(crypto.randomUUID()), name: opts.name,\n'
            impl += f'      colors: opts.colors ?? {{}}, fontFamily: opts.fontFamily ?? \'sans-serif\',\n'
            impl += f'      fontSize: opts.fontSize ?? 14, isDark: opts.isDark ?? false,\n'
            impl += f'      createdAt: now, updatedAt: now,\n'
            impl += f'    }};\n'
        elif "identitySnapshot" in opts.get("create_fields", ""):
            impl += f'    const entity: {name}Entity = {{\n'
            impl += f'      id: brand(crypto.randomUUID()), userId: opts.userId,\n'
            impl += f'      identitySnapshot: opts.identitySnapshot ?? {{}}, metadata: {{}},\n'
            impl += f'      createdAt: now, updatedAt: now,\n'
            impl += f'    }};\n'
        else:
            impl += f'    const entity: {name}Entity = {{\n'
            impl += f'      id: brand(crypto.randomUUID()), name: opts.name, description: opts.description ?? \'\',\n'
            impl += f'      settings: opts.settings ?? {{}}, tags: opts.tags ?? [],\n'
            impl += f'      createdAt: now, updatedAt: now,\n'
            impl += f'    }};\n'
        impl += f'    this.items.set(entity.id, entity);\n'
        impl += f'    return entity;\n'
        impl += f'  }}\n\n'
        impl += f'  getById(id: {eid}): {name}Entity {{\n'
        impl += f'    const item = this.items.get(id);\n'
        impl += f'    if (!item) throw new {name}NotFoundError(id);\n'
        impl += f'    return item;\n'
        impl += f'  }}\n\n'
        impl += f'  getAll(): readonly {name}Entity[] {{ return [...this.items.values()]; }}\n\n'
        impl += f'  delete(id: {eid}): void {{\n'
        impl += f'    if (!this.items.has(id)) throw new {name}NotFoundError(id);\n'
        impl += f'    this.items.delete(id);\n'
        impl += f'  }}\n'
    
    elif subdir == 'local-storage-runtime':
        impl += '''  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  has(key: string): boolean { return this.store.has(key); }
  delete(key: string): boolean { return this.store.delete(key); }
  clear(): void { this.store.clear(); }
  get size(): number { return this.store.size; }
  keys(): readonly string[] { return [...this.store.keys()]; }
  entries(): readonly [string, unknown][] { return [...this.store.entries()]; }
'''
    elif subdir == 'search-runtime':
        impl += '''  indexDocument(collection: string, id: string, data: Record<string, unknown>): void {
    if (!this.index.has(collection)) this.index.set(collection, new Map());
    this.index.get(collection)!.set(id, data);
  }

  removeFromIndex(collection: string, id: string): void {
    this.index.get(collection)?.delete(id);
  }

  search(collection: string, query: string): readonly Record<string, unknown>[] {
    const col = this.index.get(collection);
    if (!col) return [];
    const q = query.toLowerCase();
    return [...col.values()].filter(doc =>
      Object.values(doc).some(v => String(v).toLowerCase().includes(q))
    );
  }

  getCollectionNames(): readonly string[] { return [...this.index.keys()]; }
  getCollectionSize(collection: string): number { return this.index.get(collection)?.size ?? 0; }
  clearCollection(collection: string): void { this.index.delete(collection); }
  clearAll(): void { this.index.clear(); }
'''
    elif subdir == 'startup-runtime':
        impl += '''  registerStep(name: string, fn: () => Promise<void>): void {
    this.steps.push({ name, fn });
  }

  async runStartupSequence(): Promise<void> {
    this.startTime = Date.now();
    this.completedSteps.clear();
    for (const step of this.steps) {
      await step.fn();
      this.completedSteps.add(step.name);
    }
    this.endTime = Date.now();
  }

  getStartupDuration(): number { return this.endTime - this.startTime; }
  getCompletedSteps(): readonly string[] { return [...this.completedSteps]; }
  getStepCount(): number { return this.steps.length; }
  isStepCompleted(name: string): boolean { return this.completedSteps.has(name); }
'''
    elif subdir == 'settings-runtime':
        impl += '''  registerDefault(key: string, value: unknown): void {
    this.defaults.set(key, value);
  }

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
'''
    elif subdir == 'diagnostics-runtime':
        impl += '''  registerHealthCheck(name: string, check: () => Promise<{healthy: boolean; message?: string}>): void {
    this.healthChecks.set(name, check);
  }

  async runHealthChecks(): Promise<Record<string, {healthy: boolean; message?: string}>> {
    const results: Record<string, {healthy: boolean; message?: string}> = {};
    for (const [name, check] of this.healthChecks) {
      results[name] = await check();
    }
    return results;
  }

  recordMetric(name: string, value: number): void { this.metrics.set(name, value); }
  getMetric(name: string): number | undefined { return this.metrics.get(name); }
  getAllMetrics(): ReadonlyMap<string, number> { return this.metrics; }

  log(level: string, message: string): void {
    this.logs.push({ level, message, timestamp: new Date().toISOString() as Timestamp });
  }
  getLogs(): readonly Array<{level: string; message: string; timestamp: Timestamp}> { return this.logs; }
  clearLogs(): void { this.logs = []; }
  getHealthCheckCount(): number { return this.healthChecks.size; }
'''
    elif subdir == 'crash-recovery-runtime':
        impl += '''  saveSnapshot(id: string, state: Record<string, unknown>): void {
    this.snapshots.set(id, { ...state, savedAt: new Date().toISOString() });
  }

  getSnapshot(id: string): Record<string, unknown> | undefined {
    return this.snapshots.get(id);
  }

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
'''
    elif subdir == 'command-palette':
        impl += '''  register(id: string, label: string, handler: () => void | Promise<void>, opts?: {description?: string; category?: string; keybinding?: string | null}): void {
    this.commands.set(id, {
      id, label, description: opts?.description ?? '',
      category: opts?.category ?? 'General', keybinding: opts?.keybinding ?? null,
      enabled: true, handler,
    });
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
    return [...this.commands.values()]
      .filter(c => c.enabled && (c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)))
      .map(c => ({ id: c.id, label: c.label, description: c.description, category: c.category, keybinding: c.keybinding }));
  }

  getAll(): readonly Array<{id: string; label: string; description: string; category: string; keybinding: string | null; enabled: boolean}> {
    return [...this.commands.values()];
  }

  getHistory(): readonly Array<{query: string; timestamp: number}> { return this.history; }
  setEnabled(id: string, enabled: boolean): void {
    const cmd = this.commands.get(id);
    if (cmd) cmd.enabled = enabled;
  }
  getCount(): number { return this.commands.size; }
'''
    elif subdir == 'notification-runtime':
        impl += '''  create(title: string, body: string, type?: string, priority?: number): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString() as Timestamp;
    this.notifications.push({ id, title, body, type: type ?? 'info', priority: priority ?? 0, read: false, createdAt: now, expiresAt: null });
    this._unreadCount++;
    return id;
  }

  markRead(id: string): void {
    const n = this.notifications.find(n => n.id === id);
    if (n && !n.read) { n.read = true; this._unreadCount--; }
  }

  markAllRead(): void {
    for (const n of this.notifications) { if (!n.read) { n.read = true; } }
    this._unreadCount = 0;
  }

  getUnreadCount(): number { return this._unreadCount; }
  getAll(): readonly typeof this.notifications { return this.notifications; }
  getById(id: string): typeof this.notifications[number] | undefined {
    return this.notifications.find(n => n.id === id);
  }
  delete(id: string): void {
    const idx = this.notifications.findIndex(n => n.id === id);
    if (idx >= 0) {
      if (!this.notifications[idx]!.read) this._unreadCount--;
      this.notifications.splice(idx, 1);
    }
  }
  clear(): void { this.notifications = []; this._unreadCount = 0; }
'''
    
    impl += '}\n'
    w(f"{BASE}/{subdir}/{subdir}.ts", impl)
    
    # Index
    idx_content = f'export {{ {camel}Runtime }} from \'./{subdir}.js\';\n'
    idx_content += f'export {{ {name}Error, {name}NotFoundError }} from \'./errors.js\';\n'
    if has_entity:
        for bid, _ in branded_ids:
            idx_content += f'export type {{ {bid} }} from \'./types.js\';\n'
        idx_content += f'export type {{ {name}Entity, Create{camel}Options }} from \'./types.js\';\n'
    if "enum_values" in opts:
        idx_content += f'export {{ {name}Preset }} from \'./types.js\';\n'
    w(f"{BASE}/{subdir}/index.ts", idx_content)
    print(f"{subdir}: OK")

# Fix command-palette errors to add CommandPaletteNotFoundError
with open(f"{BASE}/command-palette/errors.ts") as f:
    content = f.read()
if "CommandPaletteNotFoundError" not in content:
    content += f'''\nexport class CommandPaletteNotFoundError extends CommandPaletteError {{\n  constructor(id: string) {{\n    super('Command not found: ' + id, 'COMMAND_NOT_FOUND', id);\n    this.name = 'CommandPaletteNotFoundError';\n  }}\n}}\n'''
    w(f"{BASE}/command-palette/errors.ts", content)

print("\nAll 12 template subsystems: OK")

# ═══════════════════════════════════════════════════════════════════
# DESKTOP RUNTIME (ORCHESTRATOR)
# ═══════════════════════════════════════════════════════════════════
w(f"{BASE}/desktop-runtime/types.ts", '''/**
 * Desktop Runtime — Types
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';
import type { DesktopConfig } from '../desktop-types.js';

export type DesktopRuntimeId = Identifier & { readonly __brand: 'DesktopRuntimeId' };

export enum DesktopState {
  Uninitialized = 'Uninitialized',
  Initializing = 'Initializing',
  Ready = 'Ready',
  Running = 'Running',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Error = 'Error',
}

export interface DesktopRuntimeConfig extends DesktopConfig {
  readonly autoStart: boolean;
  readonly enableCrashRecovery: boolean;
}

export const DefaultDesktopRuntimeConfig: DesktopRuntimeConfig = {
  appVersion: '1.0.0',
  environment: 'development',
  dataDir: './data',
  maxWindows: 20,
  crashRecoveryEnabled: true,
  autoStart: true,
  enableCrashRecovery: true,
};
''')

w(f"{BASE}/desktop-runtime/errors.ts", '''/**
 * Desktop Runtime — Errors
 */
export class DesktopRuntimeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DesktopRuntimeError';
  }
}

export class DesktopNotInitializedError extends DesktopRuntimeError {
  constructor() {
    super('Desktop Runtime is not initialized', 'DESKTOP_NOT_INITIALIZED');
    this.name = 'DesktopNotInitializedError';
  }
}

export class SubsystemNotFoundError extends DesktopRuntimeError {
  constructor(name: string) {
    super(`Subsystem not found: ${name}`, 'SUBSYSTEM_NOT_FOUND');
    this.name = 'SubsystemNotFoundError';
  }
}
''')

w(f"{BASE}/desktop-runtime/desktop-runtime.ts", '''/**
 * Desktop Runtime — Main Orchestrator
 * TASK-AIS-004B.000 — Desktop Application Foundation
 *
 * Coordinates all 14 Desktop subsystems.
 * Conforms to: ARC-001.001, ADR-002
 */
import type { Service } from '../../core/services/service.js';
import { DesktopState } from './types.js';
import type { DesktopRuntimeConfig } from './types.js';
import { DefaultDesktopRuntimeConfig } from './types.js';
import { WindowManager } from '../window-manager/window-manager.js';
import { NavigationRuntime } from '../navigation-runtime/navigation-runtime.js';
import { WorkspaceRuntime } from '../workspace-runtime/workspace-runtime.js';
import { ProjectRuntime } from '../project-runtime/project-runtime.js';
import { SessionRuntime } from '../session-runtime/session-runtime.js';
import { LocalStorageRuntime } from '../local-storage-runtime/local-storage-runtime.js';
import { ThemeRuntime } from '../theme-runtime/theme-runtime.js';
import { NotificationRuntime } from '../notification-runtime/notification-runtime.js';
import { CommandPaletteRuntime } from '../command-palette/command-palette.js';
import { SearchRuntime } from '../search-runtime/search-runtime.js';
import { StartupRuntime } from '../startup-runtime/startup-runtime.js';
import { SettingsRuntime } from '../settings-runtime/settings-runtime.js';
import { DiagnosticsRuntime } from '../diagnostics-runtime/diagnostics-runtime.js';
import { CrashRecoveryRuntime } from '../crash-recovery-runtime/crash-recovery-runtime.js';
import { DesktopNotInitializedError, SubsystemNotFoundError } from './errors.js';

export class DesktopRuntime {
  private config: DesktopRuntimeConfig;
  private _state = DesktopState.Uninitialized;
  private subsystems = new Map<string, Service>();

  readonly windowManager: WindowManager;
  readonly navigation: NavigationRuntime;
  readonly workspace: WorkspaceRuntime;
  readonly project: ProjectRuntime;
  readonly session: SessionRuntime;
  readonly localStorage: LocalStorageRuntime;
  readonly theme: ThemeRuntime;
  readonly notification: NotificationRuntime;
  readonly commandPalette: CommandPaletteRuntime;
  readonly search: SearchRuntime;
  readonly startup: StartupRuntime;
  readonly settings: SettingsRuntime;
  readonly diagnostics: DiagnosticsRuntime;
  readonly crashRecovery: CrashRecoveryRuntime;

  constructor(config?: Partial<DesktopRuntimeConfig>) {
    this.config = { ...DefaultDesktopRuntimeConfig, ...config };
    this.windowManager = new WindowManager(this.config);
    this.navigation = new NavigationRuntime();
    this.workspace = new WorkspaceRuntime();
    this.project = new ProjectRuntime();
    this.session = new SessionRuntime();
    this.localStorage = new LocalStorageRuntime();
    this.theme = new ThemeRuntime();
    this.notification = new NotificationRuntime();
    this.commandPalette = new CommandPaletteRuntime();
    this.search = new SearchRuntime();
    this.startup = new StartupRuntime();
    this.settings = new SettingsRuntime();
    this.diagnostics = new DiagnosticsRuntime();
    this.crashRecovery = new CrashRecoveryRuntime();
    this.registerSubsystem(this.windowManager);
    this.registerSubsystem(this.navigation);
    this.registerSubsystem(this.workspace);
    this.registerSubsystem(this.project);
    this.registerSubsystem(this.session);
    this.registerSubsystem(this.localStorage);
    this.registerSubsystem(this.theme);
    this.registerSubsystem(this.notification);
    this.registerSubsystem(this.commandPalette);
    this.registerSubsystem(this.search);
    this.registerSubsystem(this.startup);
    this.registerSubsystem(this.settings);
    this.registerSubsystem(this.diagnostics);
    this.registerSubsystem(this.crashRecovery);
  }

  get state(): DesktopState { return this._state; }
  get subsystemNames(): readonly string[] { return [...this.subsystems.keys()]; }
  get subsystemCount(): number { return this.subsystems.size; }

  private registerSubsystem(svc: Service): void {
    this.subsystems.set(svc.name, svc);
  }

  getSubsystem<T extends Service>(name: string): T {
    const svc = this.subsystems.get(name);
    if (!svc) throw new SubsystemNotFoundError(name);
    return svc as T;
  }

  async initialize(): Promise<void> {
    this._state = DesktopState.Initializing;
    for (const svc of this.subsystems.values()) {
      await svc.initialize();
    }
    this._state = DesktopState.Ready;
  }

  async start(): Promise<void> {
    if (this._state !== DesktopState.Ready) throw new DesktopNotInitializedError();
    this._state = DesktopState.Running;
    for (const svc of this.subsystems.values()) {
      await svc.start();
    }
  }

  async stop(): Promise<void> {
    this._state = DesktopState.Stopping;
    const svcs = [...this.subsystems.values()].reverse();
    for (const svc of svcs) {
      await svc.stop();
    }
    this._state = DesktopState.Stopped;
  }

  async shutdown(): Promise<void> {
    const svcs = [...this.subsystems.values()].reverse();
    for (const svc of svcs) {
      await svc.shutdown();
    }
    this._state = DesktopState.Uninitialized;
  }
}
''')

w(f"{BASE}/desktop-runtime/index.ts", '''export { DesktopRuntime } from './desktop-runtime.js';
export { DesktopState, DefaultDesktopRuntimeConfig } from './types.js';
export type { DesktopRuntimeConfig, DesktopRuntimeId } from './types.js';
export { DesktopRuntimeError, DesktopNotInitializedError, SubsystemNotFoundError } from './errors.js';
''')
print("desktop-runtime: OK")

# ═══════════════════════════════════════════════════════════════════
# UI SCREENS
# ═══════════════════════════════════════════════════════════════════
screens = ["Home", "Conversation", "Projects", "Memory", "Knowledge", "Workflows", "Marketplace", "Settings", "Diagnostics"]
for screen in screens:
    snake = screen.lower()
    w(f"{UI_BASE}/screens/{snake}.ts", f'''/**
 * {screen} Screen — Desktop UI
 * Implements the {screen} screen of the Desktop Application.
 */

export interface {screen}ScreenProps {{
  readonly screenId: string;
  readonly isActive: boolean;
}}

export class {screen}Screen {{
  readonly screenId: string;
  private _isActive = false;

  constructor(screenId: string) {{
    this.screenId = screenId;
  }}

  get isActive(): boolean {{ return this._isActive; }}

  activate(): void {{ this._isActive = true; }}
  deactivate(): void {{ this._isActive = false; }}

  render(): string {{ return \'{snake}-screen\'; }}

  getState(): {{ screenId: string; isActive: boolean; rendered: string }} {{
    return {{ screenId: this.screenId, isActive: this._isActive, rendered: this.render() }};
  }}
}}
''')

ui_idx = ""
for s in screens:
    snake = s.lower()
    ui_idx += f"export {{ {s}Screen }} from './{snake}.js';\n"
    ui_idx += f"export type {{ {s}ScreenProps }} from './{snake}.js';\n"
w(f"{UI_BASE}/screens/index.ts", ui_idx)

w(f"{UI_BASE}/components/layout.ts", '''/**
 * Layout Component — Desktop UI
 * Manages screen layout and navigation container.
 */
export class LayoutManager {
  private screens = new Map<string, {render: () => string}>();
  private activeScreen: string | null = null;

  registerScreen(id: string, screen: {render: () => string}): void {
    this.screens.set(id, screen);
  }

  setActiveScreen(id: string): void {
    if (!this.screens.has(id)) throw new Error(`Screen not found: ${id}`);
    this.activeScreen = id;
  }

  getActiveScreen(): string | null { return this.activeScreen; }
  render(): string {
    if (!this.activeScreen) return 'no-active-screen';
    return this.screens.get(this.activeScreen)?.render() ?? 'empty';
  }
  getRegisteredScreens(): readonly string[] { return [...this.screens.keys()]; }
}
''')

w(f"{UI_BASE}/components/index.ts", '''export { LayoutManager } from './layout.js';
''')

w(f"{UI_BASE}/index.ts", '''export * from './screens/index.js';
export * from './components/index.js';
''')

print("UI screens: OK")
print("\n=== SOURCE GENERATION COMPLETE ===")
