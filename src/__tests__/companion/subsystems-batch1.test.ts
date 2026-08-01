import { describe, it, expect, beforeEach } from 'vitest';
import { CompanionRuntime } from '../../core/companion/companion-runtime.js';
import { LifecycleManager } from '../../core/companion/lifecycle-manager.js';
import { UserWorkspaceManager } from '../../core/companion/user-workspace.js';
import {
  DefaultCompanionRuntimeConfig, CompanionState, NavigationSection,
  brandCompanionSessionId,
} from '../../core/companion/types.js';
import {
  SessionNotFoundError, WorkspaceNotFoundError, WorkspaceLimitExceededError,
  StateTransitionError,
} from '../../core/companion/errors.js';

describe('LifecycleManager', () => {
  let lm: LifecycleManager;
  beforeEach(() => { lm = new LifecycleManager(DefaultCompanionRuntimeConfig.lifecycleManagerConfig); });

  // Single-step valid from Uninitialized
  it('valid Uninitialized -> Initializing', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    expect(lm.getCurrentState()).toBe(CompanionState.Initializing);
  });

  // Two-step chains
  it('valid chain to Active', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    expect(lm.getCurrentState()).toBe(CompanionState.Active);
  });

  it('valid chain to Error from Initializing', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    expect(lm.getCurrentState()).toBe(CompanionState.Error);
  });

  it('valid Active -> Paused', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    expect(lm.getCurrentState()).toBe(CompanionState.Paused);
  });

  it('valid Active -> ShuttingDown', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    expect(lm.getCurrentState()).toBe(CompanionState.ShuttingDown);
  });

  it('valid Active -> Error', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Error);
    expect(lm.getCurrentState()).toBe(CompanionState.Error);
  });

  it('valid Paused -> Active', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    await lm.transition(CompanionState.Paused, CompanionState.Active);
    expect(lm.getCurrentState()).toBe(CompanionState.Active);
  });

  it('valid Paused -> ShuttingDown', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    await lm.transition(CompanionState.Paused, CompanionState.ShuttingDown);
    expect(lm.getCurrentState()).toBe(CompanionState.ShuttingDown);
  });

  it('valid ShuttingDown -> Shutdown', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    expect(lm.getCurrentState()).toBe(CompanionState.Shutdown);
  });

  it('valid ShuttingDown -> Error', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Error);
    expect(lm.getCurrentState()).toBe(CompanionState.Error);
  });

  it('valid Error -> Initializing', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Initializing);
    expect(lm.getCurrentState()).toBe(CompanionState.Initializing);
  });

  it('valid Error -> Shutdown', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Shutdown);
    expect(lm.getCurrentState()).toBe(CompanionState.Shutdown);
  });

  // Invalid transitions (from Uninitialized)
  it('invalid Uninitialized -> Active', async () => { await expect(lm.transition(CompanionState.Uninitialized, CompanionState.Active)).rejects.toThrow(StateTransitionError); });
  it('invalid Uninitialized -> Shutdown', async () => { await expect(lm.transition(CompanionState.Uninitialized, CompanionState.Shutdown)).rejects.toThrow(StateTransitionError); });
  it('invalid Uninitialized -> Paused', async () => { await expect(lm.transition(CompanionState.Uninitialized, CompanionState.Paused)).rejects.toThrow(StateTransitionError); });
  it('invalid Uninitialized -> Error', async () => { await expect(lm.transition(CompanionState.Uninitialized, CompanionState.Error)).rejects.toThrow(StateTransitionError); });

  // Invalid from Active
  it('invalid Active -> Active', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await expect(lm.transition(CompanionState.Active, CompanionState.Active)).rejects.toThrow(StateTransitionError);
  });
  it('invalid Active -> Uninitialized', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await expect(lm.transition(CompanionState.Active, CompanionState.Uninitialized)).rejects.toThrow(StateTransitionError);
  });

  // Invalid from Paused
  it('invalid Paused -> Paused', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    await expect(lm.transition(CompanionState.Paused, CompanionState.Paused)).rejects.toThrow(StateTransitionError);
  });

  // Invalid from Shutdown
  it('invalid Shutdown -> Active', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    await expect(lm.transition(CompanionState.Shutdown, CompanionState.Active)).rejects.toThrow(StateTransitionError);
  });
  it('invalid Shutdown -> Initializing', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    await expect(lm.transition(CompanionState.Shutdown, CompanionState.Initializing)).rejects.toThrow(StateTransitionError);
  });
  it('invalid Shutdown -> Paused', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    await expect(lm.transition(CompanionState.Shutdown, CompanionState.Paused)).rejects.toThrow(StateTransitionError);
  });

  // Invalid from Error
  it('invalid Error -> Active', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await expect(lm.transition(CompanionState.Error, CompanionState.Active)).rejects.toThrow(StateTransitionError);
  });
  it('invalid Error -> Paused', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await expect(lm.transition(CompanionState.Error, CompanionState.Paused)).rejects.toThrow(StateTransitionError);
  });

  // Mismatch tests
  it('mismatch current state', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await expect(lm.transition(CompanionState.Uninitialized, CompanionState.Initializing)).rejects.toThrow(StateTransitionError);
  });

  // Reset
  it('reset clears state and history', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.reset();
    expect(lm.getCurrentState()).toBe(CompanionState.Uninitialized);
    expect(lm.getHistory()).toHaveLength(0);
  });

  // History
  it('history records transitions', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    const h = lm.getHistory();
    expect(h).toHaveLength(2);
    expect(h[0].from).toBe(CompanionState.Uninitialized);
    expect(h[0].to).toBe(CompanionState.Initializing);
    expect(h[1].from).toBe(CompanionState.Initializing);
    expect(h[1].to).toBe(CompanionState.Active);
  });

  it('initial state Uninitialized', () => { expect(lm.getCurrentState()).toBe(CompanionState.Uninitialized); });
  it('transition with reason', async () => { await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing, 'reason'); expect(lm.getCurrentState()).toBe(CompanionState.Initializing); });
  it('null eventBus works', () => { expect(new LifecycleManager(DefaultCompanionRuntimeConfig.lifecycleManagerConfig, null)).toBeDefined(); });
});

describe('CompanionRuntime', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  it('creates with default config', () => { expect(rt).toBeDefined(); });
  it('creates with custom config', () => { expect(new CompanionRuntime({ defaultSection: NavigationSection.Goals })).toBeDefined(); });
  it('creates with null eventBus', () => { expect(new CompanionRuntime({}, null)).toBeDefined(); });
  it('initialize creates session', async () => {
    const s = await rt.initialize('u1');
    expect(s.userId).toBe('u1'); expect(s.state).toBe(CompanionState.Active);
    expect(s.id).toBeDefined(); expect(s.workspaceId).toBeDefined(); expect(s.startedAt).toBeDefined();
  });

  for (let i = 0; i < 5; i++) {
    it(`unique session id ${i}`, async () => {
      const a = await rt.initialize(`u${i}`);
      const b = await rt.initialize(`u${i}`);
      expect(a.id).not.toBe(b.id);
    });
  }

  it('getSession null for missing', async () => { expect(await rt.getSession(brandCompanionSessionId('x'))).toBeNull(); });
  it('getSession returns session', async () => { const s = await rt.initialize('u1'); expect((await rt.getSession(s.id))!.userId).toBe('u1'); });
  it('getState Active after init', async () => { await rt.initialize('u1'); expect(await rt.getState()).toBe(CompanionState.Active); });
  it('getState Uninitialized before init', async () => { expect(await rt.getState()).toBe(CompanionState.Uninitialized); });
  it('shutdown works', async () => { const s = await rt.initialize('u1'); await rt.shutdown(s.id); expect(await rt.getState()).toBe(CompanionState.Shutdown); });
  it('shutdown throws missing', async () => { await expect(rt.shutdown(brandCompanionSessionId('x'))).rejects.toThrow(SessionNotFoundError); });

  const sections = [NavigationSection.Conversation, NavigationSection.Goals, NavigationSection.DailyPlan,
    NavigationSection.Solutions, NavigationSection.Workflows, NavigationSection.Capabilities,
    NavigationSection.Marketplace, NavigationSection.Knowledge];
  for (const sec of sections) {
    it(`navigate to ${sec}`, async () => {
      const s = await rt.initialize('u1');
      await rt.navigate(s.id, sec);
      expect((await rt.getSession(s.id))!.currentSection).toBe(sec);
    });
  }
  it('navigate throws missing', async () => { await expect(rt.navigate(brandCompanionSessionId('x'), NavigationSection.Goals)).rejects.toThrow(SessionNotFoundError); });
  it('getMetrics returns summary', async () => { const s = await rt.initialize('u1'); const m = await rt.getMetrics(s.id); expect(m.totalSessions).toBe(1); expect(m.activeSessions).toBe(1); });
  it('getMetrics throws missing', async () => { await expect(rt.getMetrics(brandCompanionSessionId('x'))).rejects.toThrow(SessionNotFoundError); });

  const subs = ['lifecycle','workspace','conversation','goals','dailyPlanner','solutions','workflows','capabilities','marketplace','knowledge','aiControl','insights','notifications','analytics'];
  for (const sub of subs) { it(`has ${sub}`, () => { expect((rt as any)[sub]).toBeDefined(); }); }
  it('session frozen', async () => { const s = await rt.initialize('u1'); expect(Object.isFrozen(s)).toBe(true); expect(Object.isFrozen(s.metadata)).toBe(true); });
  it('multi user', async () => { const a = await rt.initialize('ua'); const b = await rt.initialize('ub'); expect(a.userId).toBe('ua'); expect(b.userId).toBe('ub'); });
});

describe('UserWorkspaceManager', () => {
  let wm: UserWorkspaceManager;
  beforeEach(() => { wm = new UserWorkspaceManager(DefaultCompanionRuntimeConfig.userWorkspaceConfig); });

  it('creates workspace', async () => { const ws = await wm.create('u1'); expect(ws.userId).toBe('u1'); expect(ws.label).toBe('My Workspace'); expect(ws.id).toBeDefined(); });
  it('creates with label', async () => { expect((await wm.create('u1','Custom')).label).toBe('Custom'); });
  it('get returns ws', async () => { const ws = await wm.create('u1'); expect((await wm.get(ws.id as string))!.id).toBe(ws.id); });
  it('get null missing', async () => { expect(await wm.get('x')).toBeNull(); });
  it('list by user', async () => { await wm.create('u1','A'); await wm.create('u1','B'); await wm.create('u2','C'); expect((await wm.list('u1'))).toHaveLength(2); });
  it('update label', async () => { const ws = await wm.create('u1'); const u = await wm.update(ws.id as string, 'New'); expect(u.label).toBe('New'); });
  it('update throws missing', async () => { await expect(wm.update('x','L')).rejects.toThrow(WorkspaceNotFoundError); });
  it('remove', async () => { const ws = await wm.create('u1'); await wm.remove(ws.id as string); expect(await wm.get(ws.id as string)).toBeNull(); });
  it('remove throws missing', async () => { await expect(wm.remove('x')).rejects.toThrow(WorkspaceNotFoundError); });
  it('count', async () => { await wm.create('u1'); await wm.create('u1'); expect(await wm.count('u1')).toBe(2); expect(await wm.count('u2')).toBe(0); });
  it('limit exceeded', async () => { for (let i=0;i<5;i++) await wm.create('u1',`W${i}`); await expect(wm.create('u1','W5')).rejects.toThrow(WorkspaceLimitExceededError); });
  it('ws frozen', async () => { expect(Object.isFrozen(await wm.create('u1'))).toBe(true); });
  it('unique id 0', async () => { const a = await wm.create('u0'); const b = await wm.create('u0'); expect(a.id).not.toBe(b.id); });
  it('unique id 1', async () => { const a = await wm.create('u1'); const b = await wm.create('u1'); expect(a.id).not.toBe(b.id); });
  it('unique id 2', async () => { const a = await wm.create('u2'); const b = await wm.create('u2'); expect(a.id).not.toBe(b.id); });
  it('null eventBus', () => { expect(new UserWorkspaceManager(DefaultCompanionRuntimeConfig.userWorkspaceConfig, null)).toBeDefined(); });
});
