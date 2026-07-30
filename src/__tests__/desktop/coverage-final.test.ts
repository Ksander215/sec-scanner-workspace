import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopRuntime } from '../../desktop/desktop-runtime/desktop-runtime.js';
import { DesktopState } from '../../desktop/desktop-runtime/types.js';
import { NavigationRuntime } from '../../desktop/navigation-runtime/navigation-runtime.js';
import { WindowManager } from '../../desktop/window-manager/window-manager.js';
import { WindowType, WindowState } from '../../desktop/window-manager/types.js';
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
import { ScreenName } from '../../desktop/navigation-runtime/types.js';
import { WorkspaceState } from '../../desktop/workspace-runtime/types.js';


describe('Coverage — Application Lifecycle', () => {
  it('should boot full desktop and perform operations', async () => {
    const dr = new DesktopRuntime();
    await dr.initialize();
    await dr.start();
    dr.workspace.create({ name: 'Main' });
    dr.project.create({ name: 'AI' });
    dr.session.create({ userId: 'u1' });
    dr.settings.set('theme', 'dark');
    dr.localStorage.set('key', 'value');
    dr.notification.create('Welcome', 'App started');
    dr.search.indexDocument('items', 'i1', { name: 'test' });
    dr.crashRecovery.saveSnapshot('state', {});
    dr.diagnostics.recordMetric('bootTime', 100);
    dr.diagnostics.log('info', 'Desktop started');
    let cmdRan = false;
    dr.commandPalette.register('about', 'About', () => { cmdRan = true; });
    await dr.commandPalette.execute('about');
    expect(cmdRan).toBe(true);
    await dr.stop();
    await dr.shutdown();
    expect(dr.state).toBe(DesktopState.Uninitialized);
  });
});

describe('Coverage — Window + Navigation IPC Simulation', () => {
  it('should create window and navigate independently', async () => {
    const wm = new WindowManager({ maxWindows: 5 });
    const nav = new NavigationRuntime();
    await wm.initialize();
    await nav.initialize();
    const w = wm.create({ type: WindowType.Main, title: 'Main' });
    nav.start();
    nav.navigate('/projects');
    expect(wm.focusedWindow?.id).toBe(w.id);
    expect(nav.currentPath).toBe('/projects');
    wm.close(w.id);
    expect(wm.count).toBe(0);
  });
  it('should handle window focus changes during navigation', async () => {
    const wm = new WindowManager({ maxWindows: 5 });
    const nav = new NavigationRuntime();
    await wm.initialize();
    await nav.initialize();
    nav.start();
    const w1 = wm.create({ type: WindowType.Main });
    const w2 = wm.create({ type: WindowType.Conversation });
    nav.navigate('/conversation');
    wm.focus(w1.id);
    expect(wm.focusedWindow?.id).toBe(w1.id);
    expect(nav.currentPath).toBe('/conversation');
  });
});

describe('Coverage — Workspace + Project + Session Coordination', () => {
  it('should create project, workspace linked to project, and session', async () => {
    const ws = new WorkspaceRuntime();
    const pr = new ProjectRuntime();
    const sr = new SessionRuntime();
    await ws.initialize();
    await pr.initialize();
    await sr.initialize();
    const proj = pr.create({ name: 'AI Assistant' });
    const ws1 = ws.create({ name: 'Development', projectId: proj.id });
    const ws2 = ws.create({ name: 'Testing' });
    const sess = sr.create({ userId: 'dev-1' });
    expect(ws.count).toBe(2);
    expect(pr.count).toBe(1);
    expect(sr.count).toBe(1);
    ws.switch(ws2.id);
    expect(ws.getActive()?.name).toBe('Testing');
    ws.archive(ws1.id);
    expect(ws.getById(ws1.id).state).toBe(WorkspaceState.Archived);
  });
});

describe('Coverage — Settings + Theme + LocalStorage Coordination', () => {
  it('should save theme preference in settings and persist to localStorage', async () => {
    const settings = new SettingsRuntime();
    const theme = new ThemeRuntime();
    const storage = new LocalStorageRuntime();
    await settings.initialize();
    await theme.initialize();
    await storage.initialize();
    const darkTheme = theme.create({ name: 'Dark', isDark: true, colors: { primary: '#000' } });
    settings.set('activeThemeId', darkTheme.id);
    settings.set('fontSize', 14);
    const exported = settings.exportSettings();
    storage.set('app-settings', exported);
    const loaded = storage.get<Record<string, unknown>>('app-settings');
    expect(loaded).toBeDefined();
    expect(loaded!.activeThemeId).toBe(darkTheme.id);
    expect(loaded!.fontSize).toBe(14);
  });
});

describe('Coverage — Notification + Command Palette Coordination', () => {
  it('should execute command that creates notification', async () => {
    const notif = new NotificationRuntime();
    const cp = new CommandPaletteRuntime();
    await notif.initialize();
    await cp.initialize();
    cp.register('notify', 'Send Notification', () => { notif.create('Command', 'Executed via command palette'); });
    await cp.execute('notify');
    expect(notif.getUnreadCount()).toBe(1);
    expect(notif.getAll()[0]!.title).toBe('Command');
  });
});

describe('Coverage — Crash Recovery + Diagnostics + Startup Coordination', () => {
  it('should save diagnostic state in crash snapshot before startup', async () => {
    const crash = new CrashRecoveryRuntime();
    const diag = new DiagnosticsRuntime();
    const startup = new StartupRuntime();
    await crash.initialize();
    await diag.initialize();
    await startup.initialize();
    diag.recordMetric('preBootMemory', 1024);
    diag.log('info', 'Pre-boot diagnostic complete');
    crash.saveSnapshot('pre-boot', { metrics: diag.getAllMetrics(), logCount: diag.getLogs().length });
    let booted = false;
    startup.registerStep('boot', async () => {
      booted = true;
      diag.log('info', 'Boot complete');
    });
    await startup.runStartupSequence();
    expect(booted).toBe(true);
    expect(crash.getSnapshot('pre-boot')).toBeDefined();
    expect(diag.getLogs().length).toBe(2);
  });
});

describe('Coverage — Search + All Data Types Coordination', () => {
  it('should index and search across different entity types', async () => {
    const search = new SearchRuntime();
    const pr = new ProjectRuntime();
    const ws = new WorkspaceRuntime();
    await search.initialize();
    await pr.initialize();
    await ws.initialize();
    const p1 = pr.create({ name: 'Machine Learning' });
    const p2 = pr.create({ name: 'Web Development' });
    const w1 = ws.create({ name: 'ML Workspace' });
    const w2 = ws.create({ name: 'Web Workspace' });
    search.indexDocument('projects', p1.id, { name: p1.name, tags: p1.tags });
    search.indexDocument('projects', p2.id, { name: p2.name, tags: p2.tags });
    search.indexDocument('workspaces', w1.id, { name: w1.name });
    search.indexDocument('workspaces', w2.id, { name: w2.name });
    expect(search.search('projects', 'Machine').length).toBe(1);
    expect(search.search('workspaces', 'ML').length).toBe(1);
    expect(search.search('projects', 'xyz').length).toBe(0);
    expect(search.getCollectionNames().length).toBe(2);
  });
});

describe('Coverage — Full Desktop Restore Scenario', () => {
  it('should simulate save state, shutdown, restore state', async () => {
    const dr = new DesktopRuntime();
    await dr.initialize();
    await dr.start();
    // Simulate user activity
    dr.workspace.create({ name: 'Main', layout: { panel: 'left' } });
    dr.project.create({ name: 'AI Project', tags: ['active'] });
    dr.settings.set('theme', 'dark');
    dr.settings.set('language', 'en');
    dr.localStorage.set('draft', 'Hello world');
    dr.theme.create({ name: 'Dark', isDark: true });
    dr.notification.create('Auto-save', 'State saved');
    // Save crash snapshot
    dr.crashRecovery.saveSnapshot('desktop-state', {
      workspaces: dr.workspace.getAll(),
      projects: dr.project.getAll(),
      settings: dr.settings.exportSettings(),
    });
    // Verify snapshot before shutdown
    const snapshot = dr.crashRecovery.getSnapshot('desktop-state');
    expect(snapshot).toBeDefined();
    // Shutdown
    await dr.stop();
    await dr.shutdown();
    expect(Array.isArray(snapshot!.workspaces)).toBe(true);
  });
});
