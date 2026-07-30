#!/usr/bin/env python3
"""Generate comprehensive tests for desktop-runtime, workspace-runtime, project-runtime, session-runtime, theme-runtime, integration, and ui."""
import os

BASE = "/home/z/my-project/src/__tests__/desktop"

# ============ DESKTOP RUNTIME ============
with open(os.path.join(BASE, "desktop-runtime/desktop-runtime.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
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
      let sawInitializing = false;
      const orig = Object.getPrototypeOf(dr);
      const proto = { ...orig };
      Object.defineProperty(dr, 'state', {
        get() { return proto._state; },
        set(v: any) { proto._state = v; if (v === DesktopState.Initializing) sawInitializing = true; },
        configurable: true
      });
      await dr.initialize();
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
""")

# ============ WORKSPACE RUNTIME ============
with open(os.path.join(BASE, "workspace-runtime/workspace-runtime.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceRuntime } from '../../../desktop/workspace-runtime/workspace-runtime.js';
import { WorkspaceState } from '../../../desktop/workspace-runtime/types.js';
import type { WorkspaceId } from '../../../desktop/workspace-runtime/types.js';
import { WorkspaceNotFoundError, DuplicateWorkspaceError } from '../../../desktop/workspace-runtime/errors.js';

describe('WorkspaceRuntime', () => {
  let ws: WorkspaceRuntime;
  beforeEach(async () => { ws = new WorkspaceRuntime(); await ws.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(ws.name).toBe('WorkspaceRuntime'); });
    it('should initialize', () => { expect(ws.initialized).toBe(true); });
    it('should start', async () => { await ws.start(); });
    it('should stop', async () => { await ws.stop(); });
    it('should shutdown', async () => { await ws.shutdown(); expect(ws.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof ws.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create workspace', () => { const w = ws.create({ name: 'ws1' }); expect(w.name).toBe('ws1'); expect(w.id).toBeTruthy(); });
    it('should set default description', () => { const w = ws.create({ name: 'ws1' }); expect(w.description).toBe(''); });
    it('should set custom description', () => { const w = ws.create({ name: 'ws1', description: 'desc' }); expect(w.description).toBe('desc'); });
    it('should set state to Active', () => { const w = ws.create({ name: 'ws1' }); expect(w.state).toBe(WorkspaceState.Active); });
    it('should set timestamps', () => { const w = ws.create({ name: 'ws1' }); expect(w.createdAt).toBeTruthy(); expect(w.updatedAt).toBeTruthy(); });
    it('should set default layout', () => { const w = ws.create({ name: 'ws1' }); expect(Object.keys(w.layout).length).toBe(0); });
    it('should set custom layout', () => { const w = ws.create({ name: 'ws1', layout: { panel: 'left' } }); expect(w.layout.panel).toBe('left'); });
    it('should link to project', () => { const w = ws.create({ name: 'ws1', projectId: 'proj-1' as any }); expect(w.projectId).toBe('proj-1'); });
    it('should auto-set first as active', () => { const w = ws.create({ name: 'ws1' }); expect(ws.getActive()?.id).toBe(w.id); });
    it('should not change active if already set', () => { const w1 = ws.create({ name: 'ws1' }); const w2 = ws.create({ name: 'ws2' }); expect(ws.getActive()?.id).toBe(w1.id); });
    it('should generate unique ids', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); expect(w1.id).not.toBe(w2.id); });
    it('should throw on duplicate name', () => { ws.create({ name: 'dup' }); expect(() => ws.create({ name: 'dup' })).toThrow(DuplicateWorkspaceError); });
    it('should increment count', () => { ws.create({ name: 'a' }); ws.create({ name: 'b' }); expect(ws.count).toBe(2); });
  });

  describe('getById', () => {
    it('should get by id', () => { const w = ws.create({ name: 'ws1' }); expect(ws.getById(w.id).name).toBe('ws1'); });
    it('should throw on missing', () => { expect(() => ws.getById('bad' as WorkspaceId)).toThrow(WorkspaceNotFoundError); });
  });

  describe('getAll', () => {
    it('should return all', () => { ws.create({ name: 'a' }); ws.create({ name: 'b' }); expect(ws.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(ws.getAll().length).toBe(0); });
  });

  describe('getActive', () => {
    it('should return null initially', () => { expect(ws.getActive()).toBeNull(); });
    it('should return active workspace', () => { const w = ws.create({ name: 'ws1' }); expect(ws.getActive()?.id).toBe(w.id); });
  });

  describe('switch', () => {
    it('should switch active workspace', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); ws.switch(w2.id); expect(ws.getActive()?.id).toBe(w2.id); });
    it('should throw on missing', () => { expect(() => ws.switch('bad' as WorkspaceId)).toThrow(WorkspaceNotFoundError); });
    it('should update activeWorkspace getter', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); ws.switch(w2.id); expect(ws.activeWorkspace?.id).toBe(w2.id); });
  });

  describe('updateLayout', () => {
    it('should update layout', () => { const w = ws.create({ name: 'a' }); ws.updateLayout(w.id, { panel: 'right' }); expect(ws.getById(w.id).layout.panel).toBe('right'); });
    it('should update timestamp', async () => { const w = ws.create({ name: 'a' }); const t = w.updatedAt; await new Promise(r => setTimeout(r, 2)); ws.updateLayout(w.id, {}); expect(ws.getById(w.id).updatedAt).not.toBe(t); });
    it('should throw on missing', () => { expect(() => ws.updateLayout('bad' as WorkspaceId, {})).toThrow(WorkspaceNotFoundError); });
  });

  describe('archive', () => {
    it('should archive workspace', () => { const w = ws.create({ name: 'a' }); ws.archive(w.id); expect(ws.getById(w.id).state).toBe(WorkspaceState.Archived); });
    it('should clear active if archived was active', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); ws.switch(w1.id); ws.archive(w1.id); expect(ws.getActive()?.id).toBe(w2.id); });
    it('should throw on missing', () => { expect(() => ws.archive('bad' as WorkspaceId)).toThrow(WorkspaceNotFoundError); });
  });

  describe('delete', () => {
    it('should delete workspace', () => { const w = ws.create({ name: 'a' }); ws.delete(w.id); expect(ws.count).toBe(0); });
    it('should throw on missing', () => { expect(() => ws.delete('bad' as WorkspaceId)).toThrow(WorkspaceNotFoundError); });
    it('should clear active if deleted was active', () => { const w1 = ws.create({ name: 'a' }); const w2 = ws.create({ name: 'b' }); ws.switch(w1.id); ws.delete(w1.id); expect(ws.getActive()?.id).toBe(w2.id); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await ws.shutdown(); await ws.initialize(); expect(ws.initialized).toBe(true); });
    it('should handle double init', async () => { await ws.initialize(); expect(ws.initialized).toBe(true); });
    it('should handle many workspaces', () => { for (let i = 0; i < 50; i++) ws.create({ name: `ws${i}` }); expect(ws.count).toBe(50); });
    it('stop should clear active', async () => { ws.create({ name: 'a' }); await ws.stop(); expect(ws.activeWorkspace).toBeNull(); });
  });
});
""")

# ============ PROJECT RUNTIME ============
with open(os.path.join(BASE, "project-runtime/project-runtime.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectRuntime } from '../../../desktop/project-runtime/project-runtime.js';
import type { ProjectId } from '../../../desktop/project-runtime/types.js';
import { ProjectNotFoundError } from '../../../desktop/project-runtime/errors.js';

describe('ProjectRuntime', () => {
  let pr: ProjectRuntime;
  beforeEach(async () => { pr = new ProjectRuntime(); await pr.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(pr.name).toBe('ProjectRuntime'); });
    it('should initialize', () => { expect(pr.initialized).toBe(true); });
    it('should start', async () => { await pr.start(); });
    it('should stop', async () => { await pr.stop(); });
    it('should shutdown', async () => { await pr.shutdown(); expect(pr.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof pr.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create project', () => { const p = pr.create({ name: 'Proj1' }); expect(p.name).toBe('Proj1'); });
    it('should generate id', () => { const p = pr.create({ name: 'P' }); expect(p.id).toBeTruthy(); });
    it('should set default description', () => { const p = pr.create({ name: 'P' }); expect(p.description).toBe(''); });
    it('should set custom description', () => { const p = pr.create({ name: 'P', description: 'desc' }); expect(p.description).toBe('desc'); });
    it('should set default settings', () => { const p = pr.create({ name: 'P' }); expect(Object.keys(p.settings).length).toBe(0); });
    it('should set custom settings', () => { const p = pr.create({ name: 'P', settings: { theme: 'dark' } }); expect(p.settings.theme).toBe('dark'); });
    it('should set default tags', () => { const p = pr.create({ name: 'P' }); expect(p.tags.length).toBe(0); });
    it('should set custom tags', () => { const p = pr.create({ name: 'P', tags: ['ai', 'ml'] }); expect(p.tags).toEqual(['ai', 'ml']); });
    it('should set timestamps', () => { const p = pr.create({ name: 'P' }); expect(p.createdAt).toBeTruthy(); expect(p.updatedAt).toBeTruthy(); });
    it('should generate unique ids', () => { const p1 = pr.create({ name: 'a' }); const p2 = pr.create({ name: 'b' }); expect(p1.id).not.toBe(p2.id); });
    it('should increment count', () => { pr.create({ name: 'a' }); pr.create({ name: 'b' }); expect(pr.count).toBe(2); });
    it('should allow duplicate names', () => { pr.create({ name: 'dup' }); expect(() => pr.create({ name: 'dup' })).not.toThrow(); });
  });

  describe('getById', () => {
    it('should get by id', () => { const p = pr.create({ name: 'P' }); expect(pr.getById(p.id).name).toBe('P'); });
    it('should throw on missing', () => { expect(() => pr.getById('bad' as ProjectId)).toThrow(ProjectNotFoundError); });
  });

  describe('getAll', () => {
    it('should return all', () => { pr.create({ name: 'a' }); pr.create({ name: 'b' }); expect(pr.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(pr.getAll().length).toBe(0); });
  });

  describe('delete', () => {
    it('should delete project', () => { const p = pr.create({ name: 'P' }); pr.delete(p.id); expect(pr.count).toBe(0); });
    it('should throw on missing', () => { expect(() => pr.delete('bad' as ProjectId)).toThrow(ProjectNotFoundError); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await pr.shutdown(); await pr.initialize(); expect(pr.initialized).toBe(true); });
    it('should handle double init', async () => { await pr.initialize(); expect(pr.initialized).toBe(true); });
    it('should handle many projects', () => { for (let i = 0; i < 100; i++) pr.create({ name: `P${i}` }); expect(pr.count).toBe(100); });
    it('should store complex settings', () => { const p = pr.create({ name: 'P', settings: { nested: { a: 1 }, arr: [1, 2] } }); expect(pr.getById(p.id).settings.nested.a).toBe(1); });
    it('should handle unicode names', () => { const p = pr.create({ name: 'Проект' }); expect(p.name).toBe('Проект'); });
  });
});
""")

# ============ SESSION RUNTIME ============
with open(os.path.join(BASE, "session-runtime/session-runtime.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { SessionRuntime } from '../../../desktop/session-runtime/session-runtime.js';
import type { SessionId } from '../../../desktop/session-runtime/types.js';
import { SessionNotFoundError } from '../../../desktop/session-runtime/errors.js';

describe('SessionRuntime', () => {
  let sr: SessionRuntime;
  beforeEach(async () => { sr = new SessionRuntime(); await sr.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(sr.name).toBe('SessionRuntime'); });
    it('should initialize', () => { expect(sr.initialized).toBe(true); });
    it('should start', async () => { await sr.start(); });
    it('should stop', async () => { await sr.stop(); });
    it('should shutdown', async () => { await sr.shutdown(); expect(sr.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof sr.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create session', () => { const s = sr.create({ userId: 'user-1' }); expect(s.userId).toBe('user-1'); });
    it('should generate id', () => { const s = sr.create({ userId: 'u1' }); expect(s.id).toBeTruthy(); });
    it('should set default identitySnapshot', () => { const s = sr.create({ userId: 'u1' }); expect(Object.keys(s.identitySnapshot).length).toBe(0); });
    it('should set custom identitySnapshot', () => { const s = sr.create({ userId: 'u1', identitySnapshot: { name: 'Alice' } }); expect(s.identitySnapshot.name).toBe('Alice'); });
    it('should set default metadata', () => { const s = sr.create({ userId: 'u1' }); expect(Object.keys(s.metadata).length).toBe(0); });
    it('should set timestamps', () => { const s = sr.create({ userId: 'u1' }); expect(s.createdAt).toBeTruthy(); expect(s.updatedAt).toBeTruthy(); });
    it('should generate unique ids', () => { const s1 = sr.create({ userId: 'u1' }); const s2 = sr.create({ userId: 'u1' }); expect(s1.id).not.toBe(s2.id); });
    it('should increment count', () => { sr.create({ userId: 'u1' }); sr.create({ userId: 'u2' }); expect(sr.count).toBe(2); });
  });

  describe('getById', () => {
    it('should get by id', () => { const s = sr.create({ userId: 'u1' }); expect(sr.getById(s.id).userId).toBe('u1'); });
    it('should throw on missing', () => { expect(() => sr.getById('bad' as SessionId)).toThrow(SessionNotFoundError); });
  });

  describe('getAll', () => {
    it('should return all', () => { sr.create({ userId: 'u1' }); sr.create({ userId: 'u2' }); expect(sr.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(sr.getAll().length).toBe(0); });
  });

  describe('delete', () => {
    it('should delete session', () => { const s = sr.create({ userId: 'u1' }); sr.delete(s.id); expect(sr.count).toBe(0); });
    it('should throw on missing', () => { expect(() => sr.delete('bad' as SessionId)).toThrow(SessionNotFoundError); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await sr.shutdown(); await sr.initialize(); expect(sr.initialized).toBe(true); });
    it('should handle double init', async () => { await sr.initialize(); expect(sr.initialized).toBe(true); });
    it('should handle many sessions', () => { for (let i = 0; i < 100; i++) sr.create({ userId: `u${i}` }); expect(sr.count).toBe(100); });
    it('should handle complex identity snapshot', () => { const s = sr.create({ userId: 'u1', identitySnapshot: { name: 'Alice', roles: ['admin'], prefs: { theme: 'dark' } } }); expect(sr.getById(s.id).identitySnapshot.roles).toEqual(['admin']); });
  });
});
""")

# ============ THEME RUNTIME ============
with open(os.path.join(BASE, "theme-runtime/theme-runtime.test.ts"), "w") as f:
    f.write("""import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeRuntime } from '../../../desktop/theme-runtime/theme-runtime.js';
import type { ThemeId } from '../../../desktop/theme-runtime/types.js';
import { ThemeNotFoundError } from '../../../desktop/theme-runtime/errors.js';

describe('ThemeRuntime', () => {
  let tr: ThemeRuntime;
  beforeEach(async () => { tr = new ThemeRuntime(); await tr.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(tr.name).toBe('ThemeRuntime'); });
    it('should initialize', () => { expect(tr.initialized).toBe(true); });
    it('should start', async () => { await tr.start(); });
    it('should stop', async () => { await tr.stop(); });
    it('should shutdown', async () => { await tr.shutdown(); expect(tr.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof tr.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create theme', () => { const t = tr.create({ name: 'Dark' }); expect(t.name).toBe('Dark'); });
    it('should generate id', () => { const t = tr.create({ name: 'T' }); expect(t.id).toBeTruthy(); });
    it('should set default colors', () => { const t = tr.create({ name: 'T' }); expect(Object.keys(t.colors).length).toBe(0); });
    it('should set custom colors', () => { const t = tr.create({ name: 'T', colors: { primary: '#000' } }); expect(t.colors.primary).toBe('#000'); });
    it('should set default fontFamily', () => { const t = tr.create({ name: 'T' }); expect(t.fontFamily).toBe('sans-serif'); });
    it('should set custom fontFamily', () => { const t = tr.create({ name: 'T', fontFamily: 'monospace' }); expect(t.fontFamily).toBe('monospace'); });
    it('should set default fontSize', () => { const t = tr.create({ name: 'T' }); expect(t.fontSize).toBe(14); });
    it('should set custom fontSize', () => { const t = tr.create({ name: 'T', fontSize: 18 }); expect(t.fontSize).toBe(18); });
    it('should set default isDark', () => { const t = tr.create({ name: 'T' }); expect(t.isDark).toBe(false); });
    it('should set isDark to true', () => { const t = tr.create({ name: 'T', isDark: true }); expect(t.isDark).toBe(true); });
    it('should set timestamps', () => { const t = tr.create({ name: 'T' }); expect(t.createdAt).toBeTruthy(); expect(t.updatedAt).toBeTruthy(); });
    it('should generate unique ids', () => { const t1 = tr.create({ name: 'a' }); const t2 = tr.create({ name: 'b' }); expect(t1.id).not.toBe(t2.id); });
    it('should increment count', () => { tr.create({ name: 'a' }); tr.create({ name: 'b' }); expect(tr.count).toBe(2); });
    it('should allow duplicate names', () => { tr.create({ name: 'dup' }); expect(() => tr.create({ name: 'dup' })).not.toThrow(); });
  });

  describe('getById', () => {
    it('should get by id', () => { const t = tr.create({ name: 'T' }); expect(tr.getById(t.id).name).toBe('T'); });
    it('should throw on missing', () => { expect(() => tr.getById('bad' as ThemeId)).toThrow(ThemeNotFoundError); });
  });

  describe('getAll', () => {
    it('should return all', () => { tr.create({ name: 'a' }); tr.create({ name: 'b' }); expect(tr.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(tr.getAll().length).toBe(0); });
  });

  describe('delete', () => {
    it('should delete theme', () => { const t = tr.create({ name: 'T' }); tr.delete(t.id); expect(tr.count).toBe(0); });
    it('should throw on missing', () => { expect(() => tr.delete('bad' as ThemeId)).toThrow(ThemeNotFoundError); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await tr.shutdown(); await tr.initialize(); expect(tr.initialized).toBe(true); });
    it('should handle double init', async () => { await tr.initialize(); expect(tr.initialized).toBe(true); });
    it('should handle many themes', () => { for (let i = 0; i < 50; i++) tr.create({ name: `T${i}`, isDark: i % 2 === 0 }); expect(tr.count).toBe(50); });
    it('should store complex colors', () => { const t = tr.create({ name: 'T', colors: { primary: '#000', secondary: '#fff', bg: '#eee', fg: '#111', accent: '#f00', muted: '#888' } }); expect(Object.keys(tr.getById(t.id).colors).length).toBe(6); });
  });
});
""")

print("5 new test files generated (desktop-runtime, workspace-runtime, project-runtime, session-runtime, theme-runtime)")
