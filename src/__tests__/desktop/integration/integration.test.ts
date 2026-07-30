import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopRuntime } from '../../../desktop/desktop-runtime/desktop-runtime.js';
import { DesktopState } from '../../../desktop/desktop-runtime/types.js';
import { NavigationRuntime } from '../../../desktop/navigation-runtime/navigation-runtime.js';
import { ScreenName } from '../../../desktop/navigation-runtime/types.js';
import { WorkspaceRuntime } from '../../../desktop/workspace-runtime/workspace-runtime.js';
import { WorkspaceState } from '../../../desktop/workspace-runtime/types.js';
import { ProjectRuntime } from '../../../desktop/project-runtime/project-runtime.js';
import { SessionRuntime } from '../../../desktop/session-runtime/session-runtime.js';
import { LocalStorageRuntime } from '../../../desktop/local-storage-runtime/local-storage-runtime.js';
import { ThemeRuntime } from '../../../desktop/theme-runtime/theme-runtime.js';
import { NotificationRuntime } from '../../../desktop/notification-runtime/notification-runtime.js';
import { CommandPaletteRuntime } from '../../../desktop/command-palette/command-palette.js';
import { SearchRuntime } from '../../../desktop/search-runtime/search-runtime.js';
import { StartupRuntime } from '../../../desktop/startup-runtime/startup-runtime.js';
import { SettingsRuntime } from '../../../desktop/settings-runtime/settings-runtime.js';
import { DiagnosticsRuntime } from '../../../desktop/diagnostics-runtime/diagnostics-runtime.js';
import { CrashRecoveryRuntime } from '../../../desktop/crash-recovery-runtime/crash-recovery-runtime.js';

describe('Desktop Integration — Full Lifecycle', () => {
  let dr: DesktopRuntime;
  beforeEach(async () => { dr = new DesktopRuntime(); await dr.initialize(); });

  describe('initialization order', () => {
    it('should initialize all 14 subsystems', () => { expect(dr.subsystemCount).toBe(14); for (const name of dr.subsystemNames) { expect(dr.getSubsystem<any>(name).initialized).toBe(true); } });
    it('should be in Ready state after init', () => { expect(dr.state).toBe(DesktopState.Ready); });
  });

  describe('start/stop cycle', () => {
    it('should start and enter Running state', async () => { await dr.start(); expect(dr.state).toBe(DesktopState.Running); });
    it('should stop and enter Stopped state', async () => { await dr.start(); await dr.stop(); expect(dr.state).toBe(DesktopState.Stopped); });
    it('should reinitialize after stop', async () => { await dr.stop(); await dr.shutdown(); await dr.initialize(); await dr.start(); expect(dr.state).toBe(DesktopState.Running); });
  });

  describe('shutdown', () => {
    it('should shutdown all subsystems', async () => { await dr.shutdown(); for (const name of dr.subsystemNames) { expect(dr.getSubsystem<any>(name).initialized).toBe(false); } });
    it('should return to Uninitialized', async () => { await dr.shutdown(); expect(dr.state).toBe(DesktopState.Uninitialized); });
  });
});

describe('Navigation + Workspace Integration', () => {
  let nav: NavigationRuntime;
  let ws: WorkspaceRuntime;
  beforeEach(async () => { nav = new NavigationRuntime(); ws = new WorkspaceRuntime(); await nav.initialize(); await ws.initialize(); });

  it('should navigate independently of workspace', () => { nav.start(); ws.create({ name: 'w1' }); expect(nav.currentPath).toBe('/'); expect(ws.count).toBe(1); });
  it('should support workspace switching during navigation', () => { nav.start(); nav.navigate('/projects'); const w = ws.create({ name: 'w1' }); const w2 = ws.create({ name: 'w2' }); ws.switch(w2.id); expect(nav.currentPath).toBe('/projects'); expect(ws.getActive()?.id).toBe(w2.id); });
  it('should maintain navigation state across workspace switches', () => { nav.start(); nav.navigate('/settings'); nav.navigate('/memory'); ws.create({ name: 'w1' }); ws.create({ name: 'w2' }); ws.switch(ws.getAll()[1]!.id); expect(nav.historyCount).toBe(3); });
});

describe('Navigation + Window Manager Integration', () => {
  let nav: NavigationRuntime;
  let wm: import('../../../desktop/window-manager/window-manager.js').WindowManager;
  beforeEach(async () => {
    nav = new NavigationRuntime(); await nav.initialize();
    wm = new (await import('../../../desktop/window-manager/window-manager.js')).WindowManager({ maxWindows: 5 });
    await wm.initialize();
  });

  it('should manage windows independently of navigation', () => { const w = wm.create({ type: 'Main' as any }); nav.navigate('/projects'); expect(wm.count).toBe(1); expect(nav.currentPath).toBe('/projects'); });
  it('should support multi-window with shared navigation', () => { wm.create({ type: 'Main' as any }); wm.create({ type: 'Conversation' as any }); nav.navigate('/conversation'); expect(wm.count).toBe(2); expect(nav.currentPath).toBe('/conversation'); });
});

describe('Session + Project Integration', () => {
  let sess: SessionRuntime;
  let proj: ProjectRuntime;
  beforeEach(async () => { sess = new SessionRuntime(); proj = new ProjectRuntime(); await sess.initialize(); await proj.initialize(); });

  it('should create sessions and projects independently', () => { sess.create({ userId: 'u1' }); proj.create({ name: 'P1' }); expect(sess.count).toBe(1); expect(proj.count).toBe(1); });
  it('should support multiple sessions per project', () => { proj.create({ name: 'P1' }); sess.create({ userId: 'u1' }); sess.create({ userId: 'u2' }); expect(sess.count).toBe(2); expect(proj.count).toBe(1); });
  it('should survive project deletion independently', () => { const s = sess.create({ userId: 'u1' }); const p = proj.create({ name: 'P1' }); proj.delete(p.id); expect(sess.getById(s.id).userId).toBe('u1'); });
});

describe('Settings + LocalStorage Integration', () => {
  let settings: SettingsRuntime;
  let storage: LocalStorageRuntime;
  beforeEach(async () => { settings = new SettingsRuntime(); storage = new LocalStorageRuntime(); await settings.initialize(); await storage.initialize(); });

  it('should export settings and store in localStorage', () => { settings.set('theme', 'dark'); settings.set('fontSize', 16); const exported = settings.exportSettings(); storage.set('user-settings', exported); expect(storage.get('user-settings')).toEqual(exported); });
  it('should import settings from localStorage', () => { storage.set('saved', { theme: 'light', lang: 'en' }); const data = storage.get<Record<string, unknown>>('saved')!; settings.importSettings(data); expect(settings.get('theme')).toBe('light'); });
  it('should round-trip settings through localStorage', () => { settings.set('a', 1); settings.set('b', 'x'); const data = settings.exportSettings(); settings.clear(); storage.set('backup', data); settings.importSettings(storage.get<Record<string, unknown>>('backup')!); expect(settings.get('a')).toBe(1); expect(settings.get('b')).toBe('x'); });
});

describe('Notification + Settings Integration', () => {
  let notif: NotificationRuntime;
  let settings: SettingsRuntime;
  beforeEach(async () => { notif = new NotificationRuntime(); settings = new SettingsRuntime(); await notif.initialize(); await settings.initialize(); });

  it('should create notifications with settings context', () => { settings.set('notifyEnabled', true); notif.create('Test', 'Body'); expect(notif.getUnreadCount()).toBe(1); });
  it('should respect notification settings', () => { settings.registerDefault('maxNotifications', 50); for (let i = 0; i < 10; i++) notif.create(`T${i}`, `B${i}`); expect(notif.getAll().length).toBe(10); });
});

describe('Theme + Settings Integration', () => {
  let theme: ThemeRuntime;
  let settings: SettingsRuntime;
  beforeEach(async () => { theme = new ThemeRuntime(); settings = new SettingsRuntime(); await theme.initialize(); await settings.initialize(); });

  it('should create theme and save preference in settings', () => { const t = theme.create({ name: 'Dark', isDark: true, colors: { primary: '#000' } }); settings.set('activeThemeId', t.id); expect(settings.get('activeThemeId')).toBe(t.id); });
  it('should apply theme based on settings', () => { const t = theme.create({ name: 'Dark', isDark: true }); settings.set('activeThemeId', t.id); const tid = settings.get<string>('activeThemeId')!; const loaded = theme.getById(tid as any); expect(loaded.isDark).toBe(true); });
});

describe('Search + Command Palette Integration', () => {
  let search: SearchRuntime;
  let cp: CommandPaletteRuntime;
  beforeEach(async () => { search = new SearchRuntime(); cp = new CommandPaletteRuntime(); await search.initialize(); await cp.initialize(); });

  it('should index commands and search them', () => { cp.register('cmd-save', 'Save', () => {}); cp.register('cmd-open', 'Open', () => {}); search.indexDocument('commands', 'cmd-save', { label: 'Save', desc: 'Save file' }); search.indexDocument('commands', 'cmd-open', { label: 'Open', desc: 'Open file' }); const results = search.search('commands', 'save'); expect(results.length).toBe(1); });
  it('should search commands via palette and index', () => { cp.register('search-project', 'Search Project', () => {}); const paletteResults = cp.search('project'); expect(paletteResults.length).toBe(1); search.indexDocument('commands', 'search-project', { label: 'Search Project' }); const searchResults = search.search('commands', 'project'); expect(searchResults.length).toBe(1); });
});

describe('Crash Recovery + Startup Integration', () => {
  let crash: CrashRecoveryRuntime;
  let startup: StartupRuntime;
  beforeEach(async () => { crash = new CrashRecoveryRuntime(); startup = new StartupRuntime(); await crash.initialize(); await startup.initialize(); });

  it('should save state before startup and recover', async () => { crash.saveSnapshot('pre-startup', { step: 'init' }); startup.registerStep('init', async () => {}); await startup.runStartupSequence(); expect(crash.getSnapshot('pre-startup')).toBeDefined(); expect(startup.getCompletedSteps().length).toBe(1); });
  it('should record crash and detect on startup', () => { crash.recordCrash('OOM', { mem: 'full' }); expect(crash.getCrashCount()).toBe(1); expect(crash.getLastCrash()?.reason).toBe('OOM'); });
  it('should track recovery state through startup', async () => { crash.saveSnapshot('s1', { ws: 'main' }); startup.registerStep('recover', async () => { crash.setCrashRecovered(true); }); await startup.runStartupSequence(); expect(crash.lastCrashRecovered).toBe(true); });
});

describe('Diagnostics + All Subsystems Integration', () => {
  let diag: DiagnosticsRuntime;
  let nav: NavigationRuntime;
  let storage: LocalStorageRuntime;
  beforeEach(async () => { diag = new DiagnosticsRuntime(); nav = new NavigationRuntime(); storage = new LocalStorageRuntime(); await diag.initialize(); await nav.initialize(); await storage.initialize(); });

  it('should register health checks for subsystems', async () => { diag.registerHealthCheck('navigation', async () => ({ healthy: nav.initialized })); diag.registerHealthCheck('storage', async () => ({ healthy: storage.initialized })); const r = await diag.runHealthChecks(); expect(r.navigation.healthy).toBe(true); expect(r.storage.healthy).toBe(true); });
  it('should record metrics for subsystems', () => { diag.recordMetric('navScreens', nav.getAllScreens().length); diag.recordMetric('storageSize', storage.size); expect(diag.getMetric('navScreens')).toBe(9); expect(diag.getMetric('storageSize')).toBe(0); });
  it('should log subsystem events', () => { diag.log('info', 'Navigation initialized'); diag.log('info', 'Storage initialized'); expect(diag.getLogs().length).toBe(2); });
});

describe('Full Desktop Runtime Integration', () => {
  let dr: DesktopRuntime;
  beforeEach(async () => { dr = new DesktopRuntime(); await dr.initialize(); await dr.start(); });

  it('should support full workflow: navigate, create workspace, create project', () => {
    dr.navigation.navigate('/projects');
    const ws = dr.workspace.create({ name: 'Main Workspace' });
    const proj = dr.project.create({ name: 'AI Project' });
    expect(dr.navigation.currentPath).toBe('/projects');
    expect(dr.workspace.count).toBe(1);
    expect(dr.project.count).toBe(1);
  });
  it('should use localStorage for persistence', () => {
    dr.localStorage.set('key', 'value');
    expect(dr.localStorage.get('key')).toBe('value');
  });
  it('should manage notifications', () => {
    dr.notification.create('Info', 'Message');
    expect(dr.notification.getUnreadCount()).toBe(1);
  });
  it('should use command palette', async () => {
    let executed = false;
    dr.commandPalette.register('test-cmd', 'Test', () => { executed = true; });
    await dr.commandPalette.execute('test-cmd');
    expect(executed).toBe(true);
  });
  it('should search across data', () => {
    dr.search.indexDocument('items', 'item1', { name: 'Test Document' });
    const results = dr.search.search('items', 'test');
    expect(results.length).toBe(1);
  });
  it('should manage themes', () => {
    const t = dr.theme.create({ name: 'Dark', isDark: true });
    expect(dr.theme.count).toBe(1);
    expect(t.isDark).toBe(true);
  });
  it('should manage sessions', () => {
    const s = dr.session.create({ userId: 'user-1' });
    expect(dr.session.count).toBe(1);
    expect(s.userId).toBe('user-1');
  });
  it('should manage settings', () => {
    dr.settings.set('theme', 'dark');
    dr.settings.registerDefault('lang', 'en');
    expect(dr.settings.get('theme')).toBe('dark');
    expect(dr.settings.get('lang')).toBe('en');
  });
  it('should run diagnostics', async () => {
    dr.diagnostics.registerHealthCheck('all-systems', async () => ({ healthy: true }));
    const r = await dr.diagnostics.runHealthChecks();
    expect(r['all-systems'].healthy).toBe(true);
  });
  it('should handle crash recovery', () => {
    dr.crashRecovery.saveSnapshot('state', { x: 1 });
    expect(dr.crashRecovery.hasSnapshot('state')).toBe(true);
  });
  it('should handle startup sequence', async () => {
    let ran = false;
    dr.startup.registerStep('boot', async () => { ran = true; });
    await dr.startup.runStartupSequence();
    expect(ran).toBe(true);
  });
  it('should survive full lifecycle', async () => {
    dr.workspace.create({ name: 'w1' });
    dr.project.create({ name: 'p1' });
    dr.localStorage.set('k', 'v');
    dr.settings.set('s', 'v');
    await dr.stop();
    expect(dr.state).toBe(DesktopState.Stopped);
    await dr.shutdown();
    expect(dr.state).toBe(DesktopState.Uninitialized);
  });
});
