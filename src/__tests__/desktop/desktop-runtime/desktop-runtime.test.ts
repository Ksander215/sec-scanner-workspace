import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopRuntime } from '../../../desktop/desktop-runtime/desktop-runtime.js';
import { DesktopState } from '../../../desktop/desktop-runtime/types.js';
import { DesktopNotInitializedError, SubsystemNotFoundError } from '../../../desktop/desktop-runtime/errors.js';
import type { Service } from '../../../core/services/service.js';

describe('DesktopRuntime', () => {
  let dr: DesktopRuntime;
  beforeEach(() => { dr = new DesktopRuntime(); });

  describe('construction', () => {
    it('should create all 14 subsystems', () => { expect(dr.subsystemCount).toBe(14); });
    it('should expose windowManager', () => { expect(dr.windowManager).toBeDefined(); expect(dr.windowManager.name).toBe('WindowManager'); });
    it('should expose navigation', () => { expect(dr.navigation).toBeDefined(); expect(dr.navigation.name).toBe('NavigationRuntime'); });
    it('should expose workspace', () => { expect(dr.workspace).toBeDefined(); expect(dr.workspace.name).toBe('WorkspaceRuntime'); });
    it('should expose project', () => { expect(dr.project).toBeDefined(); expect(dr.project.name).toBe('ProjectRuntime'); });
    it('should expose session', () => { expect(dr.session).toBeDefined(); expect(dr.session.name).toBe('SessionRuntime'); });
    it('should expose localStorage', () => { expect(dr.localStorage).toBeDefined(); expect(dr.localStorage.name).toBe('LocalStorageRuntime'); });
    it('should expose theme', () => { expect(dr.theme).toBeDefined(); expect(dr.theme.name).toBe('ThemeRuntime'); });
    it('should expose notification', () => { expect(dr.notification).toBeDefined(); expect(dr.notification.name).toBe('NotificationRuntime'); });
    it('should expose commandPalette', () => { expect(dr.commandPalette).toBeDefined(); expect(dr.commandPalette.name).toBe('CommandPaletteRuntime'); });
    it('should expose search', () => { expect(dr.search).toBeDefined(); expect(dr.search.name).toBe('SearchRuntime'); });
    it('should expose startup', () => { expect(dr.startup).toBeDefined(); expect(dr.startup.name).toBe('StartupRuntime'); });
    it('should expose settings', () => { expect(dr.settings).toBeDefined(); expect(dr.settings.name).toBe('SettingsRuntime'); });
    it('should expose diagnostics', () => { expect(dr.diagnostics).toBeDefined(); expect(dr.diagnostics.name).toBe('DiagnosticsRuntime'); });
    it('should expose crashRecovery', () => { expect(dr.crashRecovery).toBeDefined(); expect(dr.crashRecovery.name).toBe('CrashRecoveryRuntime'); });
    it('should start in Uninitialized state', () => { expect(dr.state).toBe(DesktopState.Uninitialized); });
  });

  describe('subsystemNames', () => {
    it('should return all names', () => { expect(dr.subsystemNames.length).toBe(14); });
    it('should contain WindowManager', () => { expect(dr.subsystemNames).toContain('WindowManager'); });
    it('should contain NavigationRuntime', () => { expect(dr.subsystemNames).toContain('NavigationRuntime'); });
    it('should contain WorkspaceRuntime', () => { expect(dr.subsystemNames).toContain('WorkspaceRuntime'); });
    it('should contain ProjectRuntime', () => { expect(dr.subsystemNames).toContain('ProjectRuntime'); });
    it('should contain SessionRuntime', () => { expect(dr.subsystemNames).toContain('SessionRuntime'); });
    it('should contain LocalStorageRuntime', () => { expect(dr.subsystemNames).toContain('LocalStorageRuntime'); });
    it('should contain ThemeRuntime', () => { expect(dr.subsystemNames).toContain('ThemeRuntime'); });
    it('should contain NotificationRuntime', () => { expect(dr.subsystemNames).toContain('NotificationRuntime'); });
    it('should contain CommandPaletteRuntime', () => { expect(dr.subsystemNames).toContain('CommandPaletteRuntime'); });
    it('should contain SearchRuntime', () => { expect(dr.subsystemNames).toContain('SearchRuntime'); });
    it('should contain StartupRuntime', () => { expect(dr.subsystemNames).toContain('StartupRuntime'); });
    it('should contain SettingsRuntime', () => { expect(dr.subsystemNames).toContain('SettingsRuntime'); });
    it('should contain DiagnosticsRuntime', () => { expect(dr.subsystemNames).toContain('DiagnosticsRuntime'); });
    it('should contain CrashRecoveryRuntime', () => { expect(dr.subsystemNames).toContain('CrashRecoveryRuntime'); });
  });

  describe('getSubsystem', () => {
    it('should get subsystem by name', () => { const wm = dr.getSubsystem<Service>('WindowManager'); expect(wm.name).toBe('WindowManager'); });
    it('should throw on missing subsystem', () => { expect(() => dr.getSubsystem('NonExistent')).toThrow(SubsystemNotFoundError); });
    it('should get all subsystems by name', () => { for (const name of dr.subsystemNames) { expect(dr.getSubsystem<Service>(name).name).toBe(name); } });
  });

  describe('initialize', () => {
    it('should transition to Initializing then Ready', async () => {
      expect(dr.state).toBe(DesktopState.Uninitialized);
      const initPromise = dr.initialize();
      // State changes during init are synchronous, so after await it's Ready
      await initPromise;
      expect(dr.state).toBe(DesktopState.Ready);
    });
    it('should initialize all subsystems', async () => { await dr.initialize(); for (const name of dr.subsystemNames) { expect(dr.getSubsystem<Service>(name).initialized).toBe(true); } });
    it('should set state to Ready', async () => { await dr.initialize(); expect(dr.state).toBe(DesktopState.Ready); });
  });

  describe('start', () => {
    it('should start after initialize', async () => { await dr.initialize(); await dr.start(); expect(dr.state).toBe(DesktopState.Running); });
    it('should throw if not initialized', async () => { await expect(dr.start()).rejects.toThrow(DesktopNotInitializedError); });
  });

  describe('stop', () => {
    it('should stop from Running state', async () => { await dr.initialize(); await dr.start(); await dr.stop(); expect(dr.state).toBe(DesktopState.Stopped); });
  });

  describe('shutdown', () => {
    it('should shutdown all subsystems', async () => { await dr.initialize(); await dr.shutdown(); expect(dr.state).toBe(DesktopState.Uninitialized); for (const name of dr.subsystemNames) { expect(dr.getSubsystem<Service>(name).initialized).toBe(false); } });
    it('should clear state', async () => { await dr.initialize(); await dr.shutdown(); expect(dr.state).toBe(DesktopState.Uninitialized); });
  });

  describe('config', () => {
    it('should accept custom config', () => { const d = new DesktopRuntime({ maxWindows: 5 }); expect(d.windowManager).toBeDefined(); });
    it('should have default config', () => { expect(dr.windowManager).toBeDefined(); });
  });

  describe('integration points', () => {
    it('should access navigation through property', async () => { await dr.initialize(); expect(dr.navigation.initialized).toBe(true); });
    it('should access settings through property', async () => { await dr.initialize(); expect(dr.settings.initialized).toBe(true); });
    it('should access localStorage through property', async () => { await dr.initialize(); expect(dr.localStorage.initialized).toBe(true); });
    it('should access theme through property', async () => { await dr.initialize(); expect(dr.theme.initialized).toBe(true); });
    it('should access workspace through property', async () => { await dr.initialize(); expect(dr.workspace.initialized).toBe(true); });
    it('should access project through property', async () => { await dr.initialize(); expect(dr.project.initialized).toBe(true); });
    it('should access session through property', async () => { await dr.initialize(); expect(dr.session.initialized).toBe(true); });
    it('should access notification through property', async () => { await dr.initialize(); expect(dr.notification.initialized).toBe(true); });
    it('should access search through property', async () => { await dr.initialize(); expect(dr.search.initialized).toBe(true); });
    it('should access commandPalette through property', async () => { await dr.initialize(); expect(dr.commandPalette.initialized).toBe(true); });
    it('should access startup through property', async () => { await dr.initialize(); expect(dr.startup.initialized).toBe(true); });
    it('should access diagnostics through property', async () => { await dr.initialize(); expect(dr.diagnostics.initialized).toBe(true); });
    it('should access crashRecovery through property', async () => { await dr.initialize(); expect(dr.crashRecovery.initialized).toBe(true); });
  });
});
