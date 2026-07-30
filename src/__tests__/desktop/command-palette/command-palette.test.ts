import { describe, it, expect, beforeEach } from 'vitest';
import { CommandPaletteRuntime } from '../../../desktop/command-palette/command-palette.js';
import { CommandPaletteNotFoundError } from '../../../desktop/command-palette/errors.js';

describe('CommandPaletteRuntime', () => {
  let cp: CommandPaletteRuntime;
  beforeEach(async () => { cp = new CommandPaletteRuntime(); await cp.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(cp.name).toBe('CommandPaletteRuntime'); });
    it('should initialize', () => { expect(cp.initialized).toBe(true); });
    it('should start', async () => { await cp.start(); });
    it('should stop', async () => { await cp.stop(); });
    it('should shutdown', async () => { await cp.shutdown(); expect(cp.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof cp.initialize).toBe('function'); });
  });

  describe('register', () => {
    it('should register a command', () => { cp.register('cmd1', 'Test Command', () => {}); expect(cp.getCount()).toBe(1); });
    it('should register with options', () => { cp.register('cmd2', 'Cmd', () => {}, { description: 'desc', category: 'File', keybinding: 'Ctrl+K' }); expect(cp.getCount()).toBe(1); });
    it('should register multiple commands', () => { cp.register('a', 'A', () => {}); cp.register('b', 'B', () => {}); expect(cp.getCount()).toBe(2); });
    it('should default category to General', () => { cp.register('c', 'C', () => {}); const all = cp.getAll(); expect(all[0]!.category).toBe('General'); });
    it('should default keybinding to null', () => { cp.register('c', 'C', () => {}); const all = cp.getAll(); expect(all[0]!.keybinding).toBeNull(); });
  });

  describe('unregister', () => {
    it('should unregister existing command', () => { cp.register('cmd1', 'Cmd', () => {}); expect(cp.unregister('cmd1')).toBe(true); expect(cp.getCount()).toBe(0); });
    it('should return false for non-existent', () => { expect(cp.unregister('nope')).toBe(false); });
  });

  describe('execute', () => {
    it('should execute a command', async () => { let ran = false; cp.register('cmd1', 'Cmd', () => { ran = true; }); await cp.execute('cmd1'); expect(ran).toBe(true); });
    it('should push to history', async () => { cp.register('cmd1', 'Cmd', () => {}); await cp.execute('cmd1'); expect(cp.getHistory().length).toBe(1); });
    it('should throw on non-existent', async () => { await expect(cp.execute('nope')).rejects.toThrow(CommandPaletteNotFoundError); });
    it('should throw on disabled command', async () => { cp.register('cmd1', 'Cmd', () => {}); cp.setEnabled('cmd1', false); await expect(cp.execute('cmd1')).rejects.toThrow(CommandPaletteNotFoundError); });
    it('should execute async handler', async () => { let ran = false; cp.register('cmd1', 'Cmd', async () => { ran = true; }); await cp.execute('cmd1'); expect(ran).toBe(true); });
  });

  describe('search', () => {
    it('should find by label', () => { cp.register('cmd1', 'Save File', () => {}); cp.register('cmd2', 'Open File', () => {}); const r = cp.search('save'); expect(r.length).toBe(1); expect(r[0]!.id).toBe('cmd1'); });
    it('should find by description', () => { cp.register('cmd1', 'Cmd', () => {}, { description: 'save current work' }); const r = cp.search('save'); expect(r.length).toBe(1); });
    it('should be case-insensitive', () => { cp.register('cmd1', 'Save File', () => {}); const r = cp.search('SAVE'); expect(r.length).toBe(1); });
    it('should not return disabled commands', () => { cp.register('cmd1', 'Test', () => {}); cp.setEnabled('cmd1', false); const r = cp.search('test'); expect(r.length).toBe(0); });
    it('should return empty for no match', () => { cp.register('cmd1', 'Test', () => {}); expect(cp.search('xyz').length).toBe(0); });
    it('should not include enabled in results', () => { cp.register('cmd1', 'Test', () => {}); const r = cp.search('test'); expect('enabled' in r[0]!).toBe(false); });
  });

  describe('getAll', () => {
    it('should return all including disabled', () => { cp.register('cmd1', 'A', () => {}); cp.setEnabled('cmd1', false); expect(cp.getAll().length).toBe(1); });
    it('should include enabled flag', () => { cp.register('cmd1', 'A', () => {}); expect(cp.getAll()[0]!.enabled).toBe(true); });
  });

  describe('setEnabled', () => {
    it('should disable command', () => { cp.register('cmd1', 'A', () => {}); cp.setEnabled('cmd1', false); expect(cp.getAll()[0]!.enabled).toBe(false); });
    it('should re-enable command', () => { cp.register('cmd1', 'A', () => {}); cp.setEnabled('cmd1', false); cp.setEnabled('cmd1', true); expect(cp.getAll()[0]!.enabled).toBe(true); });
    it('should no-op for non-existent', () => { cp.setEnabled('nope', false); });
  });

  describe('getHistory', () => {
    it('should return empty initially', () => { expect(cp.getHistory().length).toBe(0); });
    it('should record query', async () => { cp.register('cmd1', 'Test', () => {}); await cp.execute('cmd1'); expect(cp.getHistory()[0]!.query).toBeTruthy(); });
    it('should record timestamp', async () => { cp.register('cmd1', 'Test', () => {}); await cp.execute('cmd1'); expect(cp.getHistory()[0]!.timestamp).toBeGreaterThan(0); });
    it('should accumulate history', async () => { cp.register('cmd1', 'A', () => {}); cp.register('cmd2', 'B', () => {}); await cp.execute('cmd1'); await cp.execute('cmd2'); expect(cp.getHistory().length).toBe(2); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await cp.shutdown(); await cp.initialize(); expect(cp.initialized).toBe(true); });
    it('should handle double init', async () => { await cp.initialize(); expect(cp.initialized).toBe(true); });
  });
});
