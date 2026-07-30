/**
 * Navigation Runtime — Implementation
 * Manages screen registration, routing, and history.
 */
import type { Service } from '../../core/services/service.js';
import { ScreenName } from './types.js';
import type { ScreenId, ScreenDefinition, NavigationEntry, NavigationState } from './types.js';
import { ScreenNotFoundError, NavigationHistoryError, DuplicateScreenError } from './errors.js';

function brandScreen(id: string): ScreenId { return id as ScreenId; }

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
