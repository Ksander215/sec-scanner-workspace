import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopRuntime } from '../../desktop/desktop-runtime/desktop-runtime.js';
import { DesktopState } from '../../desktop/desktop-runtime/types.js';
import { ScreenName } from '../../desktop/navigation-runtime/types.js';
import { WorkspaceState } from '../../desktop/workspace-runtime/types.js';
import type { Service } from '../../core/services/service.js';

describe('DesktopRuntime — Extended Orchestrator', () => {
  let dr: DesktopRuntime;
  beforeEach(async () => { dr = new DesktopRuntime(); await dr.initialize(); });

  describe('navigation through orchestrator', () => {
    it('should access all 12 screens via navigation', () => { expect(dr.navigation.getAllScreens().length).toBe(12); });
    it('should navigate to conversation', () => { dr.navigation.navigate('/conversation'); expect(dr.navigation.currentPath).toBe('/conversation'); });
    it('should navigate to all default screens', () => {
      const paths = dr.navigation.getAllScreens().map(s => s.path);
      for (const p of paths) { dr.navigation.navigate(p); expect(dr.navigation.currentPath).toBe(p); }
    });
    it('should support full navigation history', () => { dr.navigation.start(); dr.navigation.navigate('/projects'); dr.navigation.navigate('/settings'); dr.navigation.goBack(); expect(dr.navigation.currentPath).toBe('/projects'); });
    it('should register custom screen through navigation', () => { dr.navigation.registerScreen({ id: 'custom' as any, name: ScreenName.Home, path: '/custom', title: 'Custom', order: 100 }); expect(dr.navigation.getAllScreens().length).toBe(13); });
  });

  describe('workspace through orchestrator', () => {
    it('should create workspace', () => { const ws = dr.workspace.create({ name: 'Main' }); expect(ws.name).toBe('Main'); });
    it('should create multiple workspaces and switch', () => { const w1 = dr.workspace.create({ name: 'W1' }); const w2 = dr.workspace.create({ name: 'W2' }); dr.workspace.switch(w2.id); expect(dr.workspace.getActive()?.name).toBe('W2'); });
    it('should archive workspace', () => { const ws = dr.workspace.create({ name: 'W' }); dr.workspace.archive(ws.id); expect(dr.workspace.getById(ws.id).state).toBe(WorkspaceState.Archived); });
    it('should update workspace layout', () => { const ws = dr.workspace.create({ name: 'W' }); dr.workspace.updateLayout(ws.id, { panel: 'left' }); expect(dr.workspace.getById(ws.id).layout.panel).toBe('left'); });
    it('should handle workspace lifecycle', () => { const ws = dr.workspace.create({ name: 'W', description: 'Test workspace' }); expect(ws.description).toBe('Test workspace'); expect(ws.state).toBe(WorkspaceState.Active); dr.workspace.delete(ws.id); expect(dr.workspace.count).toBe(0); });
  });

  describe('project through orchestrator', () => {
    it('should create project', () => { const p = dr.project.create({ name: 'AI Project' }); expect(p.name).toBe('AI Project'); });
    it('should create projects with tags', () => { const p = dr.project.create({ name: 'P', tags: ['ai', 'ml'] }); expect(p.tags).toEqual(['ai', 'ml']); });
    it('should list projects', () => { dr.project.create({ name: 'P1' }); dr.project.create({ name: 'P2' }); expect(dr.project.getAll().length).toBe(2); });
    it('should delete project', () => { const p = dr.project.create({ name: 'P' }); dr.project.delete(p.id); expect(dr.project.count).toBe(0); });
  });

  describe('session through orchestrator', () => {
    it('should create session', () => { const s = dr.session.create({ userId: 'u1' }); expect(s.userId).toBe('u1'); });
    it('should create multiple sessions', () => { dr.session.create({ userId: 'u1' }); dr.session.create({ userId: 'u2' }); expect(dr.session.count).toBe(2); });
    it('should delete session', () => { const s = dr.session.create({ userId: 'u1' }); dr.session.delete(s.id); expect(dr.session.count).toBe(0); });
  });

  describe('theme through orchestrator', () => {
    it('should create theme', () => { const t = dr.theme.create({ name: 'Dark', isDark: true }); expect(t.isDark).toBe(true); });
    it('should list themes', () => { dr.theme.create({ name: 'Dark' }); dr.theme.create({ name: 'Light' }); expect(dr.theme.getAll().length).toBe(2); });
    it('should delete theme', () => { const t = dr.theme.create({ name: 'T' }); dr.theme.delete(t.id); expect(dr.theme.count).toBe(0); });
  });

  describe('settings through orchestrator', () => {
    it('should set and get settings', () => { dr.settings.set('theme', 'dark'); expect(dr.settings.get('theme')).toBe('dark'); });
    it('should use defaults', () => { dr.settings.registerDefault('lang', 'en'); expect(dr.settings.get('lang')).toBe('en'); });
    it('should export and import', () => { dr.settings.set('a', 1); const data = dr.settings.exportSettings(); dr.settings.clear(); dr.settings.importSettings(data); expect(dr.settings.get('a')).toBe(1); });
  });

  describe('localStorage through orchestrator', () => {
    it('should store and retrieve', () => { dr.localStorage.set('k', 'v'); expect(dr.localStorage.get('k')).toBe('v'); });
    it('should handle complex objects', () => { dr.localStorage.set('cfg', { a: 1, b: { c: 2 } }); expect(dr.localStorage.get('cfg').b.c).toBe(2); });
    it('should clear storage', () => { dr.localStorage.set('k', 'v'); dr.localStorage.clear(); expect(dr.localStorage.size).toBe(0); });
  });

  describe('notification through orchestrator', () => {
    it('should create notification', () => { const id = dr.notification.create('T', 'B'); expect(dr.notification.getById(id)).toBeDefined(); });
    it('should track unread', () => { dr.notification.create('T1', 'B1'); dr.notification.create('T2', 'B2'); expect(dr.notification.getUnreadCount()).toBe(2); dr.notification.markAllRead(); expect(dr.notification.getUnreadCount()).toBe(0); });
  });

  describe('command palette through orchestrator', () => {
    it('should register and execute', async () => { let ran = false; dr.commandPalette.register('cmd', 'Test', () => { ran = true; }); await dr.commandPalette.execute('cmd'); expect(ran).toBe(true); });
    it('should search commands', () => { dr.commandPalette.register('save', 'Save File', () => {}); expect(dr.commandPalette.search('save').length).toBe(1); });
  });

  describe('search through orchestrator', () => {
    it('should index and search', () => { dr.search.indexDocument('c', 'd1', { title: 'Hello' }); expect(dr.search.search('c', 'hello').length).toBe(1); });
    it('should handle multiple collections', () => { dr.search.indexDocument('a', 'd1', { t: 'x' }); dr.search.indexDocument('b', 'd1', { t: 'y' }); expect(dr.search.getCollectionNames().length).toBe(2); });
  });

  describe('diagnostics through orchestrator', () => {
    it('should register health checks', async () => { dr.diagnostics.registerHealthCheck('test', async () => ({ healthy: true })); const r = await dr.diagnostics.runHealthChecks(); expect(r.test.healthy).toBe(true); });
    it('should record metrics and logs', () => { dr.diagnostics.recordMetric('cpu', 50); dr.diagnostics.log('info', 'test'); expect(dr.diagnostics.getMetric('cpu')).toBe(50); expect(dr.diagnostics.getLogs().length).toBe(1); });
  });

  describe('crash recovery through orchestrator', () => {
    it('should save and retrieve snapshots', () => { dr.crashRecovery.saveSnapshot('s1', { x: 1 }); expect(dr.crashRecovery.getSnapshot('s1')!.x).toBe(1); });
    it('should record and clear crashes', () => { dr.crashRecovery.recordCrash('err', {}); expect(dr.crashRecovery.getCrashCount()).toBe(1); dr.crashRecovery.clearCrashLog(); expect(dr.crashRecovery.getCrashCount()).toBe(0); });
  });

  describe('startup through orchestrator', () => {
    it('should run startup sequence', async () => { let ran = false; dr.startup.registerStep('boot', async () => { ran = true; }); await dr.startup.runStartupSequence(); expect(ran).toBe(true); });
    it('should track completed steps', async () => { dr.startup.registerStep('a', async () => {}); dr.startup.registerStep('b', async () => {}); await dr.startup.runStartupSequence(); expect(dr.startup.getCompletedSteps().length).toBe(2); });
  });

  describe('full orchestrator lifecycle', () => {
    it('should start and stop cleanly', async () => { await dr.start(); expect(dr.state).toBe(DesktopState.Running); await dr.stop(); expect(dr.state).toBe(DesktopState.Stopped); });
    it('should initialize all subsystems before start', () => { for (const name of dr.subsystemNames) { expect(dr.getSubsystem<Service>(name).initialized).toBe(true); } });
    it('should handle multiple create operations across subsystems', () => {
      dr.workspace.create({ name: 'W1' }); dr.project.create({ name: 'P1' }); dr.session.create({ userId: 'u1' }); dr.theme.create({ name: 'T1' });
      expect(dr.workspace.count).toBe(1); expect(dr.project.count).toBe(1); expect(dr.session.count).toBe(1); expect(dr.theme.count).toBe(1);
    });
  });
});
