#!/usr/bin/env python3
"""Generate complete test files for the 8 truncated desktop test files."""
import os

BASE = "/home/z/my-project/src/__tests__/desktop"

# ============ COMMAND PALETTE ============
with open(os.path.join(BASE, "command-palette/command-palette.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
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
""")

# ============ CRASH RECOVERY ============
with open(os.path.join(BASE, "crash-recovery/crash-recovery.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { CrashRecoveryRuntime } from '../../../desktop/crash-recovery-runtime/crash-recovery-runtime.js';

describe('CrashRecoveryRuntime', () => {
  let cr: CrashRecoveryRuntime;
  beforeEach(async () => { cr = new CrashRecoveryRuntime(); await cr.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(cr.name).toBe('CrashRecoveryRuntime'); });
    it('should initialize', () => { expect(cr.initialized).toBe(true); });
    it('should start', async () => { await cr.start(); });
    it('should stop', async () => { await cr.stop(); });
    it('should shutdown', async () => { await cr.shutdown(); expect(cr.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof cr.initialize).toBe('function'); });
  });

  describe('snapshots', () => {
    it('should save snapshot', () => { cr.saveSnapshot('s1', { key: 'val' }); expect(cr.hasSnapshot('s1')).toBe(true); });
    it('should get snapshot', () => { cr.saveSnapshot('s1', { key: 'val' }); expect(cr.getSnapshot('s1')!.key).toBe('val'); });
    it('should return undefined for missing', () => { expect(cr.getSnapshot('nope')).toBeUndefined(); });
    it('should clone state', () => { const state = { a: 1 }; cr.saveSnapshot('s1', state); state.a = 2; expect(cr.getSnapshot('s1')!.a).toBe(1); });
    it('should inject savedAt', () => { cr.saveSnapshot('s1', {}); expect(cr.getSnapshot('s1')!.savedAt).toBeTruthy(); });
    it('should delete snapshot', () => { cr.saveSnapshot('s1', {}); expect(cr.deleteSnapshot('s1')).toBe(true); expect(cr.hasSnapshot('s1')).toBe(false); });
    it('should return false on delete non-existent', () => { expect(cr.deleteSnapshot('nope')).toBe(false); });
    it('should list snapshot ids', () => { cr.saveSnapshot('s1', {}); cr.saveSnapshot('s2', {}); expect(cr.getSnapshotIds().length).toBe(2); });
    it('should clear snapshots', () => { cr.saveSnapshot('s1', {}); cr.saveSnapshot('s2', {}); cr.clearSnapshots(); expect(cr.getSnapshotIds().length).toBe(0); });
    it('should overwrite existing snapshot', () => { cr.saveSnapshot('s1', { v: 1 }); cr.saveSnapshot('s1', { v: 2 }); expect(cr.getSnapshot('s1')!.v).toBe(2); });
  });

  describe('crash log', () => {
    it('should record crash', () => { cr.recordCrash('OOM', { mem: 'full' }); expect(cr.getCrashCount()).toBe(1); });
    it('should get last crash', () => { cr.recordCrash('err1', {}); cr.recordCrash('err2', {}); expect(cr.getLastCrash()!.reason).toBe('err2'); });
    it('should return undefined when no crashes', () => { expect(cr.getLastCrash()).toBeUndefined(); });
    it('should have timestamp', () => { cr.recordCrash('e', {}); expect(cr.getLastCrash()!.timestamp).toBeTruthy(); });
    it('should have state', () => { cr.recordCrash('e', { x: 1 }); expect(cr.getLastCrash()!.state.x).toBe(1); });
    it('should clear crash log', () => { cr.recordCrash('e', {}); cr.clearCrashLog(); expect(cr.getCrashCount()).toBe(0); });
  });

  describe('recovery flag', () => {
    it('should default to false', () => { expect(cr.lastCrashRecovered).toBe(false); });
    it('should set recovered', () => { cr.setCrashRecovered(true); expect(cr.lastCrashRecovered).toBe(true); });
    it('should unset recovered', () => { cr.setCrashRecovered(true); cr.setCrashRecovered(false); expect(cr.lastCrashRecovered).toBe(false); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await cr.shutdown(); await cr.initialize(); expect(cr.initialized).toBe(true); });
    it('should handle double init', async () => { await cr.initialize(); expect(cr.initialized).toBe(true); });
    it('should track multiple snapshots', () => { for (let i = 0; i < 50; i++) cr.saveSnapshot(`s${i}`, { i }); expect(cr.getSnapshotIds().length).toBe(50); });
  });
});
""")

# ============ LOCAL STORAGE ============
with open(os.path.join(BASE, "local-storage/local-storage.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRuntime } from '../../../desktop/local-storage-runtime/local-storage-runtime.js';

describe('LocalStorageRuntime', () => {
  let ls: LocalStorageRuntime;
  beforeEach(async () => { ls = new LocalStorageRuntime(); await ls.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(ls.name).toBe('LocalStorageRuntime'); });
    it('should initialize', () => { expect(ls.initialized).toBe(true); });
    it('should start', async () => { await ls.start(); });
    it('should stop', async () => { await ls.stop(); });
    it('should shutdown', async () => { await ls.shutdown(); expect(ls.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof ls.initialize).toBe('function'); });
  });

  describe('get/set', () => {
    it('should set and get string', () => { ls.set('k1', 'hello'); expect(ls.get('k1')).toBe('hello'); });
    it('should set and get number', () => { ls.set('k2', 42); expect(ls.get('k2')).toBe(42); });
    it('should set and get object', () => { ls.set('k3', { a: 1 }); expect(ls.get('k3').a).toBe(1); });
    it('should set and get array', () => { ls.set('k4', [1, 2, 3]); expect(ls.get('k4').length).toBe(3); });
    it('should return undefined for missing key', () => { expect(ls.get('nope')).toBeUndefined(); });
    it('should overwrite value', () => { ls.set('k1', 'a'); ls.set('k1', 'b'); expect(ls.get('k1')).toBe('b'); });
    it('should get with generic type', () => { ls.set('k', 100); const v: number = ls.get<number>('k')!; expect(v).toBe(100); });
  });

  describe('has', () => {
    it('should return true for existing key', () => { ls.set('k1', 'v'); expect(ls.has('k1')).toBe(true); });
    it('should return false for missing key', () => { expect(ls.has('nope')).toBe(false); });
  });

  describe('delete', () => {
    it('should delete existing key', () => { ls.set('k1', 'v'); expect(ls.delete('k1')).toBe(true); expect(ls.has('k1')).toBe(false); });
    it('should return false for missing key', () => { expect(ls.delete('nope')).toBe(false); });
  });

  describe('clear', () => {
    it('should clear all entries', () => { ls.set('a', 1); ls.set('b', 2); ls.clear(); expect(ls.size).toBe(0); });
    it('should handle empty store', () => { ls.clear(); expect(ls.size).toBe(0); });
  });

  describe('keys', () => {
    it('should return all keys', () => { ls.set('a', 1); ls.set('b', 2); ls.set('c', 3); expect(ls.keys().length).toBe(3); });
    it('should return empty array initially', () => { expect(ls.keys().length).toBe(0); });
  });

  describe('entries', () => {
    it('should return all entries', () => { ls.set('a', 1); ls.set('b', 2); expect(ls.entries().length).toBe(2); });
    it('should return key-value pairs', () => { ls.set('k', 'v'); expect(ls.entries()[0]![0]).toBe('k'); expect(ls.entries()[0]![1]).toBe('v'); });
  });

  describe('size', () => {
    it('should return 0 initially', () => { expect(ls.size).toBe(0); });
    it('should increment on set', () => { ls.set('a', 1); expect(ls.size).toBe(1); });
    it('should decrement on delete', () => { ls.set('a', 1); ls.delete('a'); expect(ls.size).toBe(0); });
    it('should reset on clear', () => { ls.set('a', 1); ls.set('b', 2); ls.clear(); expect(ls.size).toBe(0); });
  });

  describe('edge cases', () => {
    it('should handle null value', () => { ls.set('k', null); expect(ls.get('k')).toBeNull(); });
    it('should handle boolean value', () => { ls.set('k', true); expect(ls.get('k')).toBe(true); });
    it('should store many entries', () => { for (let i = 0; i < 100; i++) ls.set(`k${i}`, i); expect(ls.size).toBe(100); });
    it('should handle shutdown and reinit', async () => { await ls.shutdown(); await ls.initialize(); expect(ls.initialized).toBe(true); });
    it('should handle double init', async () => { await ls.initialize(); expect(ls.initialized).toBe(true); });
  });
});
""")

# ============ NOTIFICATION ============
with open(os.path.join(BASE, "notification/notification.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationRuntime } from '../../../desktop/notification-runtime/notification-runtime.js';

describe('NotificationRuntime', () => {
  let n: NotificationRuntime;
  beforeEach(async () => { n = new NotificationRuntime(); await n.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(n.name).toBe('NotificationRuntime'); });
    it('should initialize', () => { expect(n.initialized).toBe(true); });
    it('should start', async () => { await n.start(); });
    it('should stop', async () => { await n.stop(); });
    it('should shutdown', async () => { await n.shutdown(); expect(n.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof n.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create notification', () => { const id = n.create('Title', 'Body'); expect(id).toBeTruthy(); });
    it('should return unique ids', () => { const id1 = n.create('T', 'B'); const id2 = n.create('T', 'B'); expect(id1).not.toBe(id2); });
    it('should default type to info', () => { n.create('T', 'B'); expect(n.getAll()[0]!.type).toBe('info'); });
    it('should default priority to 0', () => { n.create('T', 'B'); expect(n.getAll()[0]!.priority).toBe(0); });
    it('should default read to false', () => { n.create('T', 'B'); expect(n.getAll()[0]!.read).toBe(false); });
    it('should accept custom type', () => { n.create('T', 'B', 'error'); expect(n.getAll()[0]!.type).toBe('error'); });
    it('should accept custom priority', () => { n.create('T', 'B', 'info', 5); expect(n.getAll()[0]!.priority).toBe(5); });
    it('should set createdAt', () => { n.create('T', 'B'); expect(n.getAll()[0]!.createdAt).toBeTruthy(); });
    it('should set expiresAt to null', () => { n.create('T', 'B'); expect(n.getAll()[0]!.expiresAt).toBeNull(); });
  });

  describe('markRead', () => {
    it('should mark single as read', () => { const id = n.create('T', 'B'); n.markRead(id); expect(n.getById(id)!.read).toBe(true); });
    it('should decrement unread count', () => { const id = n.create('T', 'B'); n.markRead(id); expect(n.getUnreadCount()).toBe(0); });
    it('should no-op if already read', () => { const id = n.create('T', 'B'); n.markRead(id); n.markRead(id); expect(n.getUnreadCount()).toBe(0); });
  });

  describe('markAllRead', () => {
    it('should mark all as read', () => { n.create('T1', 'B1'); n.create('T2', 'B2'); n.markAllRead(); expect(n.getUnreadCount()).toBe(0); });
    it('should handle empty list', () => { n.markAllRead(); expect(n.getUnreadCount()).toBe(0); });
  });

  describe('getUnreadCount', () => {
    it('should return 0 initially', () => { expect(n.getUnreadCount()).toBe(0); });
    it('should increment on create', () => { n.create('T', 'B'); expect(n.getUnreadCount()).toBe(1); });
    it('should track multiple', () => { n.create('T', 'B'); n.create('T', 'B'); expect(n.getUnreadCount()).toBe(2); });
  });

  describe('getAll', () => {
    it('should return all notifications', () => { n.create('T1', 'B1'); n.create('T2', 'B2'); expect(n.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(n.getAll().length).toBe(0); });
  });

  describe('getById', () => {
    it('should return notification', () => { const id = n.create('T', 'B'); expect(n.getById(id)!.title).toBe('T'); });
    it('should return undefined for missing', () => { expect(n.getById('nope')).toBeUndefined(); });
  });

  describe('delete', () => {
    it('should delete notification', () => { const id = n.create('T', 'B'); n.delete(id); expect(n.getById(id)).toBeUndefined(); });
    it('should decrement unread count', () => { const id = n.create('T', 'B'); n.delete(id); expect(n.getUnreadCount()).toBe(0); });
    it('should not decrement if already read', () => { const id = n.create('T', 'B'); n.markRead(id); const before = n.getUnreadCount(); n.delete(id); expect(n.getUnreadCount()).toBe(before); });
  });

  describe('clear', () => {
    it('should clear all notifications', () => { n.create('T1', 'B1'); n.create('T2', 'B2'); n.clear(); expect(n.getAll().length).toBe(0); });
    it('should reset unread count', () => { n.create('T', 'B'); n.clear(); expect(n.getUnreadCount()).toBe(0); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await n.shutdown(); await n.initialize(); expect(n.initialized).toBe(true); });
    it('should handle double init', async () => { await n.initialize(); expect(n.initialized).toBe(true); });
    it('should handle many notifications', () => { for (let i = 0; i < 100; i++) n.create(`T${i}`, `B${i}`); expect(n.getAll().length).toBe(100); });
  });
});
""")

# ============ SEARCH ============
with open(os.path.join(BASE, "search/search.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { SearchRuntime } from '../../../desktop/search-runtime/search-runtime.js';

describe('SearchRuntime', () => {
  let s: SearchRuntime;
  beforeEach(async () => { s = new SearchRuntime(); await s.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(s.name).toBe('SearchRuntime'); });
    it('should initialize', () => { expect(s.initialized).toBe(true); });
    it('should start', async () => { await s.start(); });
    it('should stop', async () => { await s.stop(); });
    it('should shutdown', async () => { await s.shutdown(); expect(s.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof s.initialize).toBe('function'); });
  });

  describe('indexDocument', () => {
    it('should index a document', () => { s.indexDocument('col1', 'doc1', { title: 'Hello World' }); expect(s.getCollectionSize('col1')).toBe(1); });
    it('should auto-create collection', () => { s.indexDocument('new-col', 'd1', {}); expect(s.getCollectionNames()).toContain('new-col'); });
    it('should overwrite existing document', () => { s.indexDocument('c', 'd1', { v: 1 }); s.indexDocument('c', 'd1', { v: 2 }); expect(s.getCollectionSize('c')).toBe(1); });
    it('should index multiple documents', () => { s.indexDocument('c', 'd1', {}); s.indexDocument('c', 'd2', {}); expect(s.getCollectionSize('c')).toBe(2); });
    it('should index into multiple collections', () => { s.indexDocument('c1', 'd1', {}); s.indexDocument('c2', 'd1', {}); expect(s.getCollectionNames().length).toBe(2); });
  });

  describe('search', () => {
    it('should find matching document', () => { s.indexDocument('c', 'd1', { title: 'Hello World' }); const r = s.search('c', 'hello'); expect(r.length).toBe(1); });
    it('should be case-insensitive', () => { s.indexDocument('c', 'd1', { title: 'Hello' }); const r = s.search('c', 'HELLO'); expect(r.length).toBe(1); });
    it('should search across all fields', () => { s.indexDocument('c', 'd1', { title: 'Foo', body: 'Bar' }); const r = s.search('c', 'bar'); expect(r.length).toBe(1); });
    it('should return empty for no match', () => { s.indexDocument('c', 'd1', { title: 'Foo' }); expect(s.search('c', 'xyz').length).toBe(0); });
    it('should return empty for non-existent collection', () => { expect(s.search('nope', 'q').length).toBe(0); });
    it('should find multiple matches', () => { s.indexDocument('c', 'd1', { t: 'hello' }); s.indexDocument('c', 'd2', { t: 'hello' }); expect(s.search('c', 'hello').length).toBe(2); });
    it('should match partial strings', () => { s.indexDocument('c', 'd1', { t: 'foobar' }); expect(s.search('c', 'bar').length).toBe(1); });
    it('should search numbers as strings', () => { s.indexDocument('c', 'd1', { count: 42 }); const r = s.search('c', '42'); expect(r.length).toBe(1); });
  });

  describe('removeFromIndex', () => {
    it('should remove document', () => { s.indexDocument('c', 'd1', {}); s.removeFromIndex('c', 'd1'); expect(s.getCollectionSize('c')).toBe(0); });
    it('should no-op for missing document', () => { s.removeFromIndex('c', 'nope'); });
    it('should no-op for missing collection', () => { s.removeFromIndex('nope', 'd1'); });
  });

  describe('collections', () => {
    it('should list collection names', () => { s.indexDocument('c1', 'd1', {}); s.indexDocument('c2', 'd1', {}); expect(s.getCollectionNames().length).toBe(2); });
    it('should return 0 size for non-existent collection', () => { expect(s.getCollectionSize('nope')).toBe(0); });
    it('should clear collection', () => { s.indexDocument('c', 'd1', {}); s.indexDocument('c', 'd2', {}); s.clearCollection('c'); expect(s.getCollectionSize('c')).toBe(0); });
    it('should clear all collections', () => { s.indexDocument('c1', 'd1', {}); s.indexDocument('c2', 'd1', {}); s.clearAll(); expect(s.getCollectionNames().length).toBe(0); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await s.shutdown(); await s.initialize(); expect(s.initialized).toBe(true); });
    it('should handle double init', async () => { await s.initialize(); expect(s.initialized).toBe(true); });
    it('should index many documents', () => { for (let i = 0; i < 100; i++) s.indexDocument('c', `d${i}`, { v: i }); expect(s.getCollectionSize('c')).toBe(100); });
    it('should search with nested values', () => { s.indexDocument('c', 'd1', { nested: { a: 'hello' } }); const r = s.search('c', 'hello'); expect(r.length).toBe(1); });
  });
});
""")

# ============ SETTINGS ============
with open(os.path.join(BASE, "settings/settings.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRuntime } from '../../../desktop/settings-runtime/settings-runtime.js';

describe('SettingsRuntime', () => {
  let st: SettingsRuntime;
  beforeEach(async () => { st = new SettingsRuntime(); await st.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(st.name).toBe('SettingsRuntime'); });
    it('should initialize', () => { expect(st.initialized).toBe(true); });
    it('should start', async () => { await st.start(); });
    it('should stop', async () => { await st.stop(); });
    it('should shutdown', async () => { await st.shutdown(); expect(st.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof st.initialize).toBe('function'); });
  });

  describe('defaults', () => {
    it('should register default', () => { st.registerDefault('theme', 'dark'); expect(st.getDefaults().get('theme')).toBe('dark'); });
    it('should return default when no user value', () => { st.registerDefault('theme', 'dark'); expect(st.get('theme')).toBe('dark'); });
    it('should return undefined for unknown key', () => { expect(st.get('nope')).toBeUndefined(); });
    it('should register multiple defaults', () => { st.registerDefault('a', 1); st.registerDefault('b', 2); expect(st.getDefaults().size).toBe(2); });
  });

  describe('get/set', () => {
    it('should set and get value', () => { st.set('k', 'v'); expect(st.get('k')).toBe('v'); });
    it('should override default', () => { st.registerDefault('theme', 'dark'); st.set('theme', 'light'); expect(st.get('theme')).toBe('light'); });
    it('should get generic type', () => { st.set('k', 42); const v: number = st.get<number>('k')!; expect(v).toBe(42); });
    it('should set object', () => { st.set('cfg', { a: 1 }); expect(st.get('cfg').a).toBe(1); });
  });

  describe('has', () => {
    it('should return true for user-set value', () => { st.set('k', 'v'); expect(st.has('k')).toBe(true); });
    it('should return false for default-only', () => { st.registerDefault('k', 'v'); expect(st.has('k')).toBe(false); });
    it('should return false for unknown', () => { expect(st.has('nope')).toBe(false); });
  });

  describe('delete', () => {
    it('should delete user value', () => { st.set('k', 'v'); expect(st.delete('k')).toBe(true); expect(st.has('k')).toBe(false); });
    it('should return false for missing', () => { expect(st.delete('nope')).toBe(false); });
    it('should fall back to default after delete', () => { st.registerDefault('k', 'default'); st.set('k', 'user'); st.delete('k'); expect(st.get('k')).toBe('default'); });
  });

  describe('getAll', () => {
    it('should return user settings', () => { st.set('a', 1); st.set('b', 2); expect(st.getAll().size).toBe(2); });
    it('should not include defaults', () => { st.registerDefault('d', 1); st.set('a', 2); expect(st.getAll().size).toBe(1); });
  });

  describe('clear', () => {
    it('should clear user settings', () => { st.set('a', 1); st.set('b', 2); st.clear(); expect(st.getAll().size).toBe(0); });
    it('should not clear defaults', () => { st.registerDefault('d', 1); st.set('a', 2); st.clear(); expect(st.get('d')).toBe(1); });
  });

  describe('export/import', () => {
    it('should export settings', () => { st.set('a', 1); st.set('b', 'two'); const data = st.exportSettings(); expect(data.a).toBe(1); expect(data.b).toBe('two'); });
    it('should import settings', () => { st.importSettings({ a: 1, b: 2 }); expect(st.get('a')).toBe(1); expect(st.get('b')).toBe(2); });
    it('should round-trip export/import', () => { st.set('a', 1); st.set('b', 'x'); const data = st.exportSettings(); st.clear(); st.importSettings(data); expect(st.get('a')).toBe(1); expect(st.get('b')).toBe('x'); });
    it('should import into existing', () => { st.set('a', 1); st.importSettings({ b: 2 }); expect(st.get('a')).toBe(1); expect(st.get('b')).toBe(2); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await st.shutdown(); await st.initialize(); expect(st.initialized).toBe(true); });
    it('should handle double init', async () => { await st.initialize(); expect(st.initialized).toBe(true); });
    it('should handle many settings', () => { for (let i = 0; i < 100; i++) st.set(`k${i}`, i); expect(st.getAll().size).toBe(100); });
  });
});
""")

# ============ STARTUP (subdirectory) ============
with open(os.path.join(BASE, "startup/startup.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { StartupRuntime } from '../../../desktop/startup-runtime/startup-runtime.js';

describe('StartupRuntime', () => {
  let rt: StartupRuntime;
  beforeEach(async () => { rt = new StartupRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(rt.name).toBe('StartupRuntime'); });
    it('should initialize', () => { expect(rt.initialized).toBe(true); });
    it('should start', async () => { await rt.start(); });
    it('should stop', async () => { await rt.stop(); });
    it('should shutdown', async () => { await rt.shutdown(); expect(rt.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof rt.initialize).toBe('function'); });
  });

  describe('registerStep', () => {
    it('should register a step', () => { rt.registerStep('s1', async () => {}); expect(rt.getStepCount()).toBe(1); });
    it('should register multiple steps', () => { rt.registerStep('s1', async () => {}); rt.registerStep('s2', async () => {}); expect(rt.getStepCount()).toBe(2); });
    it('should overwrite existing step', () => { rt.registerStep('s1', async () => {}); rt.registerStep('s1', async () => {}); expect(rt.getStepCount()).toBe(1); });
  });

  describe('runStartupSequence', () => {
    it('should run all steps', async () => { const o: string[] = []; rt.registerStep('a', async () => { o.push('a'); }); rt.registerStep('b', async () => { o.push('b'); }); await rt.runStartupSequence(); expect(o).toEqual(['a', 'b']); });
    it('should track completed steps', async () => { rt.registerStep('s1', async () => {}); rt.registerStep('s2', async () => {}); await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(2); });
    it('should handle empty sequence', async () => { await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(0); });
    it('should record duration', async () => { await rt.runStartupSequence(); expect(rt.getStartupDuration()).toBeGreaterThanOrEqual(0); });
  });

  describe('isStepCompleted', () => {
    it('should return false before run', () => { rt.registerStep('s1', async () => {}); expect(rt.isStepCompleted('s1')).toBe(false); });
    it('should return true after run', async () => { rt.registerStep('s1', async () => {}); await rt.runStartupSequence(); expect(rt.isStepCompleted('s1')).toBe(true); });
    it('should return false for non-existent', () => { expect(rt.isStepCompleted('nope')).toBe(false); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle step that throws', async () => { rt.registerStep('fail', async () => { throw new Error('fail'); }); await expect(rt.runStartupSequence()).rejects.toThrow('fail'); });
    it('should reset on new sequence', async () => { rt.registerStep('s1', async () => {}); await rt.runStartupSequence(); await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(1); });
  });
});
""")

# ============ DIAGNOSTICS (subdirectory) ============
with open(os.path.join(BASE, "diagnostics/diagnostics.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticsRuntime } from '../../../desktop/diagnostics-runtime/diagnostics-runtime.js';

describe('DiagnosticsRuntime', () => {
  let rt: DiagnosticsRuntime;
  beforeEach(async () => { rt = new DiagnosticsRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(rt.name).toBe('DiagnosticsRuntime'); });
    it('should initialize', () => { expect(rt.initialized).toBe(true); });
    it('should start', async () => { await rt.start(); });
    it('should stop', async () => { await rt.stop(); });
    it('should shutdown', async () => { await rt.shutdown(); expect(rt.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof rt.initialize).toBe('function'); });
  });

  describe('health checks', () => {
    it('should register health check', () => { rt.registerHealthCheck('db', async () => ({ healthy: true })); expect(rt.getHealthCheckCount()).toBe(1); });
    it('should register multiple', () => { rt.registerHealthCheck('a', async () => ({ healthy: true })); rt.registerHealthCheck('b', async () => ({ healthy: true })); expect(rt.getHealthCheckCount()).toBe(2); });
    it('should run healthy check', async () => { rt.registerHealthCheck('db', async () => ({ healthy: true })); const r = await rt.runHealthChecks(); expect(r.db.healthy).toBe(true); });
    it('should run unhealthy check', async () => { rt.registerHealthCheck('f', async () => ({ healthy: false, message: 'err' })); const r = await rt.runHealthChecks(); expect(r.f.healthy).toBe(false); expect(r.f.message).toBe('err'); });
    it('should run empty checks', async () => { const r = await rt.runHealthChecks(); expect(Object.keys(r).length).toBe(0); });
  });

  describe('metrics', () => {
    it('should record metric', () => { rt.recordMetric('cpu', 75.5); expect(rt.getMetric('cpu')).toBe(75.5); });
    it('should return undefined for missing', () => { expect(rt.getMetric('nope')).toBeUndefined(); });
    it('should get all metrics', () => { rt.recordMetric('a', 1); rt.recordMetric('b', 2); expect(rt.getAllMetrics().size).toBe(2); });
    it('should overwrite metric', () => { rt.recordMetric('a', 1); rt.recordMetric('a', 2); expect(rt.getMetric('a')).toBe(2); });
  });

  describe('logs', () => {
    it('should log message', () => { rt.log('info', 'test'); expect(rt.getLogs().length).toBe(1); });
    it('should clear logs', () => { rt.log('info', 'a'); rt.clearLogs(); expect(rt.getLogs().length).toBe(0); });
    it('should have timestamp', () => { rt.log('info', 't'); expect(rt.getLogs()[0]!.timestamp).toBeTruthy(); });
    it('should log multiple', () => { rt.log('info', 'a'); rt.log('error', 'b'); expect(rt.getLogs().length).toBe(2); });
    it('should preserve log levels', () => { rt.log('warn', 'w'); rt.log('debug', 'd'); expect(rt.getLogs()[0]!.level).toBe('warn'); });
    it('should preserve log messages', () => { rt.log('info', 'hello'); expect(rt.getLogs()[0]!.message).toBe('hello'); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
  });
});
""")

print("All 8 test files generated.")
