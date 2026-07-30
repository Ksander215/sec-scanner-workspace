import { describe, it, expect } from 'vitest';
import { DesktopRuntime } from '../../desktop/desktop-runtime/desktop-runtime.js';
import { NavigationRuntime } from '../../desktop/navigation-runtime/navigation-runtime.js';
import { WindowManager } from '../../desktop/window-manager/window-manager.js';
import { WindowType } from '../../desktop/window-manager/types.js';
import { WorkspaceRuntime } from '../../desktop/workspace-runtime/workspace-runtime.js';
import { ProjectRuntime } from '../../desktop/project-runtime/project-runtime.js';
import { SessionRuntime } from '../../desktop/session-runtime/session-runtime.js';
import { LocalStorageRuntime } from '../../desktop/local-storage-runtime/local-storage-runtime.js';
import { ThemeRuntime } from '../../desktop/theme-runtime/theme-runtime.js';
import { NotificationRuntime } from '../../desktop/notification-runtime/notification-runtime.js';
import { CommandPaletteRuntime } from '../../desktop/command-palette/command-palette.js';
import { SearchRuntime } from '../../desktop/search-runtime/search-runtime.js';
import { SettingsRuntime } from '../../desktop/settings-runtime/settings-runtime.js';
import { DiagnosticsRuntime } from '../../desktop/diagnostics-runtime/diagnostics-runtime.js';
import { CrashRecoveryRuntime } from '../../desktop/crash-recovery-runtime/crash-recovery-runtime.js';
import { StartupRuntime } from '../../desktop/startup-runtime/startup-runtime.js';

describe('Performance — Startup Time', () => {
  it('should initialize DesktopRuntime in under 500ms', async () => {
    const start = Date.now();
    const dr = new DesktopRuntime();
    await dr.initialize();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
    await dr.shutdown();
  });

  it('should start DesktopRuntime in under 500ms', async () => {
    const dr = new DesktopRuntime();
    await dr.initialize();
    const start = Date.now();
    await dr.start();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
    await dr.shutdown();
  });

  it('should shutdown DesktopRuntime in under 500ms', async () => {
    const dr = new DesktopRuntime();
    await dr.initialize();
    await dr.start();
    const start = Date.now();
    await dr.stop();
    await dr.shutdown();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});

describe('Performance — Memory Stress', () => {
  it('should handle 1000 localStorage entries without degradation', async () => {
    const ls = new LocalStorageRuntime();
    await ls.initialize();
    for (let i = 0; i < 1000; i++) ls.set(`k${i}`, `value-${i}-data`);
    expect(ls.size).toBe(1000);
    const start = Date.now();
    for (let i = 0; i < 1000; i++) ls.get(`k${i}`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  it('should handle 1000 notifications without degradation', async () => {
    const n = new NotificationRuntime();
    await n.initialize();
    for (let i = 0; i < 1000; i++) n.create(`T${i}`, `B${i}`);
    expect(n.getAll().length).toBe(1000);
    expect(n.getUnreadCount()).toBe(1000);
    const start = Date.now();
    n.markAllRead();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
    expect(n.getUnreadCount()).toBe(0);
  });

  it('should handle 500 search documents', async () => {
    const s = new SearchRuntime();
    await s.initialize();
    for (let i = 0; i < 500; i++) s.indexDocument('c', `d${i}`, { title: `Doc ${i}`, body: `Body ${i}` });
    const start = Date.now();
    const r = s.search('c', 'Doc 250');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle 200 workspaces', async () => {
    const ws = new WorkspaceRuntime();
    await ws.initialize();
    for (let i = 0; i < 200; i++) ws.create({ name: `WS${i}` });
    expect(ws.count).toBe(200);
    const start = Date.now();
    ws.getAll();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should handle 200 projects', async () => {
    const pr = new ProjectRuntime();
    await pr.initialize();
    for (let i = 0; i < 200; i++) pr.create({ name: `P${i}` });
    expect(pr.count).toBe(200);
  });

  it('should handle 200 sessions', async () => {
    const sr = new SessionRuntime();
    await sr.initialize();
    for (let i = 0; i < 200; i++) sr.create({ userId: `u${i}` });
    expect(sr.count).toBe(200);
  });

  it('should handle 200 themes', async () => {
    const tr = new ThemeRuntime();
    await tr.initialize();
    for (let i = 0; i < 200; i++) tr.create({ name: `T${i}`, isDark: i % 2 === 0 });
    expect(tr.count).toBe(200);
  });

  it('should handle 500 command palette entries', async () => {
    const cp = new CommandPaletteRuntime();
    await cp.initialize();
    for (let i = 0; i < 500; i++) cp.register(`cmd-${i}`, `Command ${i}`, () => {});
    expect(cp.getCount()).toBe(500);
    const start = Date.now();
    cp.search('Command 250');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should handle 500 settings entries', async () => {
    const st = new SettingsRuntime();
    await st.initialize();
    for (let i = 0; i < 500; i++) st.set(`k${i}`, `v${i}`);
    expect(st.getAll().size).toBe(500);
    const start = Date.now();
    st.exportSettings();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should handle 100 crash snapshots', async () => {
    const cr = new CrashRecoveryRuntime();
    await cr.initialize();
    for (let i = 0; i < 100; i++) cr.saveSnapshot(`s${i}`, { idx: i, data: `x`.repeat(100) });
    expect(cr.getSnapshotIds().length).toBe(100);
  });

  it('should handle 50 diagnostics health checks', async () => {
    const diag = new DiagnosticsRuntime();
    await diag.initialize();
    for (let i = 0; i < 50; i++) diag.registerHealthCheck(`hc-${i}`, async () => ({ healthy: true }));
    const start = Date.now();
    await diag.runHealthChecks();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  it('should handle 50 startup steps', async () => {
    const su = new StartupRuntime();
    await su.initialize();
    for (let i = 0; i < 50; i++) su.registerStep(`s${i}`, async () => {});
    const start = Date.now();
    await su.runStartupSequence();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
    expect(su.getCompletedSteps().length).toBe(50);
  });
});

describe('Performance — Window Manager Stress', () => {
  it('should handle creating and closing 20 windows', async () => {
    const wm = new WindowManager({ maxWindows: 20 });
    await wm.initialize();
    const ids: any[] = [];
    for (let i = 0; i < 20; i++) ids.push(wm.create({ type: WindowType.Main }).id);
    expect(wm.count).toBe(20);
    for (const id of ids) wm.close(id);
    expect(wm.count).toBe(0);
  });

  it('should handle 100 focus switches', async () => {
    const wm = new WindowManager({ maxWindows: 5 });
    await wm.initialize();
    const ids: any[] = [];
    for (let i = 0; i < 5; i++) ids.push(wm.create({ type: WindowType.Main }).id);
    for (let i = 0; i < 100; i++) wm.focus(ids[i % 5]);
    expect(wm.focusedWindow?.id).toBe(ids[4]);
  });
});

describe('Performance — Navigation Stress', () => {
  it('should handle 200 navigations', async () => {
    const nav = new NavigationRuntime();
    await nav.initialize();
    nav.start();
    const paths = ['/conversation', '/projects', '/memory', '/knowledge', '/workflows', '/marketplace', '/settings', '/diagnostics'];
    for (let i = 0; i < 200; i++) nav.navigate(paths[i % paths.length]);
    expect(nav.historyCount).toBe(201);
  });

  it('should handle 100 back navigations', async () => {
    const nav = new NavigationRuntime();
    await nav.initialize();
    nav.start();
    const paths = ['/conversation', '/projects', '/memory', '/knowledge', '/workflows'];
    for (const p of paths) nav.navigate(p);
    for (let i = 0; i < 100; i++) { if (nav.getState().canGoBack) nav.goBack(); else nav.navigate(paths[i % paths.length]); }
    expect(nav.historyCount).toBeGreaterThan(0);
  });
});
