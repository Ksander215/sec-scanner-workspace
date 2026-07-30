/**
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
  search(query: string): Array<{id: string; label: string; description: string; category: string; keybinding: string | null}> {
    const q = query.toLowerCase();
    return [...this.commands.values()].filter(c => c.enabled && (c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))).map(c => ({ id: c.id, label: c.label, description: c.description, category: c.category, keybinding: c.keybinding }));
  }
  getAll(): Array<{id: string; label: string; description: string; category: string; keybinding: string | null; enabled: boolean}> { return [...this.commands.values()]; }
  getHistory(): Array<{query: string; timestamp: number}> { return this.history; }
  setEnabled(id: string, enabled: boolean): void { const cmd = this.commands.get(id); if (cmd) cmd.enabled = enabled; }
  getCount(): number { return this.commands.size; }
}
