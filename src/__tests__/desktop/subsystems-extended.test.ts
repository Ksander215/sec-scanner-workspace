import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRuntime } from '../../desktop/local-storage-runtime/local-storage-runtime.js';
import { NotificationRuntime } from '../../desktop/notification-runtime/notification-runtime.js';
import { SearchRuntime } from '../../desktop/search-runtime/search-runtime.js';
import { SettingsRuntime } from '../../desktop/settings-runtime/settings-runtime.js';
import { CommandPaletteRuntime } from '../../desktop/command-palette/command-palette.js';
import { CrashRecoveryRuntime } from '../../desktop/crash-recovery-runtime/crash-recovery-runtime.js';
import { DiagnosticsRuntime } from '../../desktop/diagnostics-runtime/diagnostics-runtime.js';
import { StartupRuntime } from '../../desktop/startup-runtime/startup-runtime.js';
import { WorkspaceRuntime } from '../../desktop/workspace-runtime/workspace-runtime.js';
import { ProjectRuntime } from '../../desktop/project-runtime/project-runtime.js';
import { SessionRuntime } from '../../desktop/session-runtime/session-runtime.js';
import { ThemeRuntime } from '../../desktop/theme-runtime/theme-runtime.js';
import { WorkspaceState } from '../../desktop/workspace-runtime/types.js';


describe('LocalStorageRuntime — Extended', () => {
  let ls: LocalStorageRuntime;
  beforeEach(async () => { ls = new LocalStorageRuntime(); await ls.initialize(); });

  it('should store and retrieve 1000 entries', () => { for (let i = 0; i < 1000; i++) ls.set(`k${i}`, `v${i}`); expect(ls.size).toBe(1000); for (let i = 0; i < 1000; i++) expect(ls.get(`k${i}`)).toBe(`v${i}`); });
  it('should handle large values', () => { const big = 'x'.repeat(10000); ls.set('big', big); expect(ls.get('big')).toBe(big); });
  it('should handle overwrite cycles', () => { for (let i = 0; i < 100; i++) ls.set('k', i); expect(ls.get('k')).toBe(99); });
  it('should handle delete all entries one by one', () => { for (let i = 0; i < 50; i++) ls.set(`k${i}`, i); for (let i = 0; i < 50; i++) ls.delete(`k${i}`); expect(ls.size).toBe(0); });
  it('should handle clear after many operations', () => { for (let i = 0; i < 100; i++) ls.set(`k${i}`, i); ls.clear(); expect(ls.size).toBe(0); expect(ls.keys().length).toBe(0); });
  it('should handle entries with numeric keys', () => { ls.set('1', 'one'); ls.set('2', 'two'); expect(ls.get('1')).toBe('one'); });
  it('should handle entries with empty string key', () => { ls.set('', 'empty'); expect(ls.get('')).toBe('empty'); });
  it('should preserve value types through get', () => { ls.set('str', 'hello'); ls.set('num', 42); ls.set('bool', true); ls.set('arr', [1, 2, 3]); ls.set('obj', { a: 1 }); expect(ls.get('str')).toBe('hello'); expect(ls.get('num')).toBe(42); expect(ls.get('bool')).toBe(true); expect(ls.get('arr')).toEqual([1, 2, 3]); expect(ls.get('obj').a).toBe(1); });
});

describe('NotificationRuntime — Extended', () => {
  let n: NotificationRuntime;
  beforeEach(async () => { n = new NotificationRuntime(); await n.initialize(); });

  it('should create 200 notifications', () => { for (let i = 0; i < 200; i++) n.create(`T${i}`, `B${i}`); expect(n.getAll().length).toBe(200); });
  it('should track unread count through lifecycle', () => { const ids: string[] = []; for (let i = 0; i < 10; i++) ids.push(n.create(`T${i}`, `B${i}`)); expect(n.getUnreadCount()).toBe(10); n.markRead(ids[0]); expect(n.getUnreadCount()).toBe(9); n.markRead(ids[2]); n.markRead(ids[4]); expect(n.getUnreadCount()).toBe(7); });
  it('should handle markAllRead with many notifications', () => { for (let i = 0; i < 50; i++) n.create(`T${i}`, `B${i}`); n.markAllRead(); expect(n.getUnreadCount()).toBe(0); });
  it('should handle mixed read/unread state', () => { const ids: string[] = []; for (let i = 0; i < 10; i++) ids.push(n.create(`T${i}`, `B${i}`)); for (let i = 0; i < 5; i++) n.markRead(ids[i]); expect(n.getUnreadCount()).toBe(5); n.markAllRead(); expect(n.getUnreadCount()).toBe(0); });
  it('should handle delete from middle of list', () => { const ids: string[] = []; for (let i = 0; i < 5; i++) ids.push(n.create(`T${i}`, `B${i}`)); n.delete(ids[2]); expect(n.getAll().length).toBe(4); });
  it('should create with all types', () => { const types = ['info', 'success', 'warning', 'error', 'debug']; for (const t of types) n.create('T', 'B', t); const all = n.getAll(); expect(all.map(n => n.type)).toEqual(types); });
  it('should create with various priorities', () => { n.create('Low', 'B', 'info', 1); n.create('High', 'B', 'error', 10); expect(n.getById(n.getAll()[0]!.id)!.priority).toBe(1); expect(n.getById(n.getAll()[1]!.id)!.priority).toBe(10); });
});

describe('SearchRuntime — Extended', () => {
  let s: SearchRuntime;
  beforeEach(async () => { s = new SearchRuntime(); await s.initialize(); });

  it('should index and search 500 documents', () => { for (let i = 0; i < 500; i++) s.indexDocument('big', `d${i}`, { title: `Document ${i}`, content: `Content for document ${i}` }); expect(s.getCollectionSize('big')).toBe(500); const r = s.search('big', 'Document 999'); expect(r.length).toBe(0); const r2 = s.search('big', 'Content for'); expect(r2.length).toBe(500); });
  it('should search across multiple collections', () => { s.indexDocument('c1', 'd1', { t: 'hello' }); s.indexDocument('c2', 'd2', { t: 'hello' }); s.indexDocument('c3', 'd3', { t: 'hello' }); expect(s.search('c1', 'hello').length).toBe(1); expect(s.search('c2', 'hello').length).toBe(1); expect(s.search('c3', 'hello').length).toBe(1); });
  it('should handle document removal during search', () => { s.indexDocument('c', 'd1', { t: 'test' }); s.indexDocument('c', 'd2', { t: 'test' }); s.removeFromIndex('c', 'd1'); expect(s.search('c', 'test').length).toBe(1); });
  it('should handle clear and reindex', () => { s.indexDocument('c', 'd1', { t: 'a' }); s.clearCollection('c'); expect(s.getCollectionSize('c')).toBe(0); s.indexDocument('c', 'd2', { t: 'b' }); expect(s.search('c', 'b').length).toBe(1); });
  it('should handle search with no results', () => { s.indexDocument('c', 'd1', { t: 'hello' }); expect(s.search('c', 'xyznonexistent').length).toBe(0); });
  it('should handle multiple collections with same ids', () => { s.indexDocument('c1', 'same', { t: 'first' }); s.indexDocument('c2', 'same', { t: 'second' }); expect(s.search('c1', 'first').length).toBe(1); expect(s.search('c2', 'second').length).toBe(1); });
});

describe('SettingsRuntime — Extended', () => {
  let st: SettingsRuntime;
  beforeEach(async () => { st = new SettingsRuntime(); await st.initialize(); });

  it('should handle 100 settings', () => { for (let i = 0; i < 100; i++) st.set(`k${i}`, i); expect(st.getAll().size).toBe(100); });
  it('should handle complex nested settings', () => { st.set('ui', { theme: { dark: { bg: '#000', fg: '#fff' } }, font: { size: 14, family: 'sans' } }); const ui = st.get<any>('ui'); expect(ui.theme.dark.bg).toBe('#000'); });
  it('should handle export with many settings', () => { for (let i = 0; i < 50; i++) st.set(`k${i}`, `v${i}`); const data = st.exportSettings(); expect(Object.keys(data).length).toBe(50); });
  it('should handle import with many settings', () => { const data: Record<string, unknown> = {}; for (let i = 0; i < 50; i++) data[`k${i}`] = `v${i}`; st.importSettings(data); expect(st.getAll().size).toBe(50); });
  it('should handle defaults with user overrides', () => { st.registerDefault('a', 1); st.registerDefault('b', 2); st.registerDefault('c', 3); st.set('a', 10); expect(st.get('a')).toBe(10); expect(st.get('b')).toBe(2); expect(st.get('c')).toBe(3); });
  it('should handle delete and fall back to default', () => { st.registerDefault('k', 'default'); st.set('k', 'user'); st.delete('k'); expect(st.get('k')).toBe('default'); });
  it('should round-trip with null and undefined values', () => { st.set('null', null); st.set('undef', undefined); const data = st.exportSettings(); st.clear(); st.importSettings(data); expect(st.get('null')).toBeNull(); });
});

describe('CommandPaletteRuntime — Extended', () => {
  let cp: CommandPaletteRuntime;
  beforeEach(async () => { cp = new CommandPaletteRuntime(); await cp.initialize(); });

  it('should register and search 100 commands', () => { for (let i = 0; i < 100; i++) cp.register(`cmd-${i}`, `Command ${i}`, () => {}, { description: `Description ${i}`, category: `Cat${i % 5}` }); expect(cp.getCount()).toBe(100); const r = cp.search('Command 42'); expect(r.length).toBe(1); });
  it('should execute commands in sequence', async () => { const order: number[] = []; for (let i = 0; i < 10; i++) cp.register(`cmd-${i}`, `C${i}`, async () => { order.push(i); }); for (let i = 0; i < 10; i++) await cp.execute(`cmd-${i}`); expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); });
  it('should search across categories', () => { cp.register('a', 'Save File', () => {}, { category: 'File' }); cp.register('b', 'Save Project', () => {}, { category: 'Project' }); cp.register('c', 'Open File', () => {}, { category: 'File' }); expect(cp.search('save').length).toBe(2); });
  it('should handle enable/disable toggle cycles', () => { cp.register('cmd', 'Test', () => {}); for (let i = 0; i < 10; i++) { cp.setEnabled('cmd', i % 2 === 0); expect(cp.getAll()[0]!.enabled).toBe(i % 2 === 0); } });
  it('should accumulate execution history', async () => { for (let i = 0; i < 20; i++) { cp.register(`cmd-${i}`, `C${i}`, () => {}); await cp.execute(`cmd-${i}`); } expect(cp.getHistory().length).toBe(20); });
  it('should unregister and re-register', () => { cp.register('cmd', 'Test', () => {}); cp.unregister('cmd'); expect(cp.getCount()).toBe(0); cp.register('cmd', 'Test New', () => {}); expect(cp.getCount()).toBe(1); expect(cp.search('Test')[0]!.label).toBe('Test New'); });
});

describe('CrashRecoveryRuntime — Extended', () => {
  let cr: CrashRecoveryRuntime;
  beforeEach(async () => { cr = new CrashRecoveryRuntime(); await cr.initialize(); });

  it('should handle 100 snapshots', () => { for (let i = 0; i < 100; i++) cr.saveSnapshot(`s${i}`, { idx: i }); expect(cr.getSnapshotIds().length).toBe(100); });
  it('should handle complex state objects', () => { cr.saveSnapshot('complex', { workspaces: [{ id: 'w1', name: 'Main' }], activeWindow: '/conversation', settings: { theme: 'dark' } }); const s = cr.getSnapshot('complex'); expect(s!.workspaces[0].name).toBe('Main'); });
  it('should handle multiple crash records', () => { for (let i = 0; i < 20; i++) cr.recordCrash(`Error ${i}`, { i }); expect(cr.getCrashCount()).toBe(20); expect(cr.getLastCrash()!.reason).toBe('Error 19'); });
  it('should handle delete during iteration', () => { for (let i = 0; i < 10; i++) cr.saveSnapshot(`s${i}`, { i }); for (let i = 0; i < 5; i++) cr.deleteSnapshot(`s${i}`); expect(cr.getSnapshotIds().length).toBe(5); });
  it('should handle clear and reuse', () => { cr.saveSnapshot('s1', { a: 1 }); cr.clearSnapshots(); expect(cr.getSnapshotIds().length).toBe(0); cr.saveSnapshot('s2', { b: 2 }); expect(cr.hasSnapshot('s2')).toBe(true); });
});

describe('DiagnosticsRuntime — Extended', () => {
  let rt: DiagnosticsRuntime;
  beforeEach(async () => { rt = new DiagnosticsRuntime(); await rt.initialize(); });

  it('should handle 50 health checks', async () => { for (let i = 0; i < 50; i++) rt.registerHealthCheck(`check-${i}`, async () => ({ healthy: i % 10 !== 0 })); const r = await rt.runHealthChecks(); expect(Object.keys(r).length).toBe(50); expect(r['check-0'].healthy).toBe(false); expect(r['check-1'].healthy).toBe(true); });
  it('should record 1000 log entries', () => { for (let i = 0; i < 1000; i++) rt.log('info', `Entry ${i}`); expect(rt.getLogs().length).toBe(1000); });
  it('should handle 100 metrics', () => { for (let i = 0; i < 100; i++) rt.recordMetric(`m${i}`, i); expect(rt.getAllMetrics().size).toBe(100); for (let i = 0; i < 100; i++) expect(rt.getMetric(`m${i}`)).toBe(i); });
  it('should handle clear and re-register', async () => { rt.registerHealthCheck('a', async () => ({ healthy: true })); rt.recordMetric('x', 1); rt.log('info', 't'); await rt.shutdown(); await rt.initialize(); expect(rt.getHealthCheckCount()).toBe(0); expect(rt.getAllMetrics().size).toBe(0); expect(rt.getLogs().length).toBe(0); });
});

describe('StartupRuntime — Extended', () => {
  let rt: StartupRuntime;
  beforeEach(async () => { rt = new StartupRuntime(); await rt.initialize(); });

  it('should handle 20 startup steps', async () => { const order: string[] = []; for (let i = 0; i < 20; i++) rt.registerStep(`step-${i}`, async () => { order.push(`step-${i}`); }); await rt.runStartupSequence(); expect(rt.getCompletedSteps().length).toBe(20); expect(order).toEqual(Array.from({ length: 20 }, (_, i) => `step-${i}`)); });
  it('should handle multiple sequential runs', async () => { let runs = 0; rt.registerStep('inc', async () => { runs++; }); await rt.runStartupSequence(); await rt.runStartupSequence(); await rt.runStartupSequence(); expect(runs).toBe(3); });
  it('should track duration across runs', async () => { rt.registerStep('s1', async () => {}); rt.registerStep('s2', async () => {}); await rt.runStartupSequence(); const d1 = rt.getStartupDuration(); await rt.runStartupSequence(); const d2 = rt.getStartupDuration(); expect(d1).toBeGreaterThanOrEqual(0); expect(d2).toBeGreaterThanOrEqual(0); });
});

describe('WorkspaceRuntime — Extended', () => {
  let ws: WorkspaceRuntime;
  beforeEach(async () => { ws = new WorkspaceRuntime(); await ws.initialize(); });

  it('should handle 30 workspaces', () => { for (let i = 0; i < 30; i++) ws.create({ name: `WS${i}` }); expect(ws.count).toBe(30); });
  it('should handle rapid switching', () => { const ids: any[] = []; for (let i = 0; i < 10; i++) ids.push(ws.create({ name: `WS${i}` }).id); for (let i = 0; i < 100; i++) ws.switch(ids[i % 10]); expect(ws.getActive()?.id).toBe(ids[9]); });
  it('should handle layout updates across workspaces', () => { const w1 = ws.create({ name: 'W1' }); const w2 = ws.create({ name: 'W2' }); ws.updateLayout(w1.id, { panel: 'left' }); ws.updateLayout(w2.id, { panel: 'right' }); expect(ws.getById(w1.id).layout.panel).toBe('left'); expect(ws.getById(w2.id).layout.panel).toBe('right'); });
  it('should handle archive and delete of active workspace', () => { const w1 = ws.create({ name: 'W1' }); const w2 = ws.create({ name: 'W2' }); ws.switch(w1.id); ws.archive(w1.id); expect(ws.getActive()?.id).toBe(w2.id); });
  it('should handle delete all workspaces', () => { const ids = [ws.create({ name: 'A' }).id, ws.create({ name: 'B' }).id, ws.create({ name: 'C' }).id]; for (const id of ids) ws.delete(id); expect(ws.count).toBe(0); expect(ws.getActive()).toBeNull(); });
  it('should handle workspace with project link', () => { const w = ws.create({ name: 'WS', projectId: 'proj-1' as any }); expect(ws.getById(w.id).projectId).toBe('proj-1'); });
});

describe('ProjectRuntime — Extended', () => {
  let pr: ProjectRuntime;
  beforeEach(async () => { pr = new ProjectRuntime(); await pr.initialize(); });

  it('should handle 50 projects', () => { for (let i = 0; i < 50; i++) pr.create({ name: `P${i}` }); expect(pr.count).toBe(50); });
  it('should handle projects with complex settings', () => { const p = pr.create({ name: 'P', settings: { ai: { model: 'gpt-4', temperature: 0.7 }, ui: { theme: 'dark' } } }); expect(pr.getById(p.id).settings.ai.model).toBe('gpt-4'); });
  it('should handle projects with many tags', () => { const tags = Array.from({ length: 20 }, (_, i) => `tag-${i}`); const p = pr.create({ name: 'P', tags }); expect(pr.getById(p.id).tags.length).toBe(20); });
  it('should handle delete and re-create', () => { const p = pr.create({ name: 'P' }); pr.delete(p.id); const p2 = pr.create({ name: 'P' }); expect(pr.count).toBe(1); expect(p2.id).not.toBe(p.id); });
});

describe('SessionRuntime — Extended', () => {
  let sr: SessionRuntime;
  beforeEach(async () => { sr = new SessionRuntime(); await sr.initialize(); });

  it('should handle 50 sessions', () => { for (let i = 0; i < 50; i++) sr.create({ userId: `user-${i}` }); expect(sr.count).toBe(50); });
  it('should handle sessions with complex identity', () => { const s = sr.create({ userId: 'u1', identitySnapshot: { id: 'id-1', name: 'Alice', email: 'alice@test.com', roles: ['admin', 'user'], preferences: { theme: 'dark', lang: 'en' } } }); expect(sr.getById(s.id).identitySnapshot.roles.length).toBe(2); });
  it('should handle multiple sessions per user', () => { for (let i = 0; i < 5; i++) sr.create({ userId: 'u1' }); expect(sr.count).toBe(5); expect(sr.getAll().every(s => s.userId === 'u1')).toBe(true); });
});

describe('ThemeRuntime — Extended', () => {
  let tr: ThemeRuntime;
  beforeEach(async () => { tr = new ThemeRuntime(); await tr.initialize(); });

  it('should handle 30 themes', () => { for (let i = 0; i < 30; i++) tr.create({ name: `Theme${i}`, isDark: i % 2 === 0 }); expect(tr.count).toBe(30); });
  it('should handle theme with full color palette', () => { const colors = { primary: '#000', secondary: '#fff', background: '#f5f5f5', foreground: '#333', accent: '#00f', muted: '#999', error: '#f00', warning: '#ff0', success: '#0f0', info: '#00f' }; const t = tr.create({ name: 'Full', colors }); expect(Object.keys(tr.getById(t.id).colors).length).toBe(10); });
  it('should handle various font configurations', () => { const t1 = tr.create({ name: 'Mono', fontFamily: 'Fira Code', fontSize: 13 }); const t2 = tr.create({ name: 'Serif', fontFamily: 'Georgia', fontSize: 16 }); expect(tr.getById(t1.id).fontFamily).toBe('Fira Code'); expect(tr.getById(t2.id).fontSize).toBe(16); });
  it('should handle delete and re-create', () => { const t = tr.create({ name: 'T' }); tr.delete(t.id); const t2 = tr.create({ name: 'T' }); expect(tr.count).toBe(1); });
});
