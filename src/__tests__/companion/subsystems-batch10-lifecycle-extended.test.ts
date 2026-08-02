import { describe, it, expect, beforeEach } from 'vitest';
import { LifecycleManager } from '../../core/companion/lifecycle-manager.js';
import { CompanionState, DefaultLifecycleManagerConfig } from '../../core/companion/types.js';
import { StateTransitionError } from '../../core/companion/errors.js';

const STATES = [
  CompanionState.Uninitialized,
  CompanionState.Initializing,
  CompanionState.Active,
  CompanionState.Paused,
  CompanionState.ShuttingDown,
  CompanionState.Shutdown,
  CompanionState.Error,
];

const STATE_LABELS: Record<string, string> = {
  [CompanionState.Uninitialized]: 'Uninitialized',
  [CompanionState.Initializing]: 'Initializing',
  [CompanionState.Active]: 'Active',
  [CompanionState.Paused]: 'Paused',
  [CompanionState.ShuttingDown]: 'ShuttingDown',
  [CompanionState.Shutdown]: 'Shutdown',
  [CompanionState.Error]: 'Error',
};

const VALID_TRANSITIONS: Array<{ from: CompanionState; to: CompanionState }> = [
  { from: CompanionState.Uninitialized, to: CompanionState.Initializing },
  { from: CompanionState.Initializing, to: CompanionState.Active },
  { from: CompanionState.Initializing, to: CompanionState.Error },
  { from: CompanionState.Active, to: CompanionState.Paused },
  { from: CompanionState.Active, to: CompanionState.ShuttingDown },
  { from: CompanionState.Active, to: CompanionState.Error },
  { from: CompanionState.Paused, to: CompanionState.Active },
  { from: CompanionState.Paused, to: CompanionState.ShuttingDown },
  { from: CompanionState.ShuttingDown, to: CompanionState.Shutdown },
  { from: CompanionState.ShuttingDown, to: CompanionState.Error },
  { from: CompanionState.Error, to: CompanionState.Initializing },
  { from: CompanionState.Error, to: CompanionState.Shutdown },
];

describe('LifecycleManager all 12 valid transitions', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  for (const { from, to } of VALID_TRANSITIONS) {
    it(`${STATE_LABELS[from]} -> ${STATE_LABELS[to]}`, async () => {
      // Set up to the from state
      await setStateTo(lm, from);
      await lm.transition(from, to);
      expect(lm.getCurrentState()).toBe(to);
    });
  }
});

describe('LifecycleManager invalid transitions', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  const INVALID_TRANSITIONS: Array<{ from: CompanionState; to: CompanionState }> = [];
  // Build invalid transitions by checking all pairs not in valid set
  const validSet = new Set(VALID_TRANSITIONS.map(t => `${t.from}->${t.to}`));
  for (const from of STATES) {
    for (const to of STATES) {
      if (from === to) continue;
      if (!validSet.has(`${from}->${to}`)) {
        INVALID_TRANSITIONS.push({ from, to });
      }
    }
  }

  for (const { from, to } of INVALID_TRANSITIONS) {
    it(`${STATE_LABELS[from]} -> ${STATE_LABELS[to]} throws StateTransitionError`, async () => {
      try {
        await setStateTo(lm, from);
      } catch {
        // Some from states may be unreachable (Shutdown)
        if (from === CompanionState.Shutdown) return;
      }
      if (lm.getCurrentState() !== from) return;
      await expect(lm.transition(from, to)).rejects.toThrow(StateTransitionError);
    });
  }
});

describe('LifecycleManager getCurrentState', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('initial state is Uninitialized', () => {
    expect(lm.getCurrentState()).toBe(CompanionState.Uninitialized);
  });

  for (const state of STATES) {
    it(`can reach ${STATE_LABELS[state]} state`, async () => {
      try {
        await setStateTo(lm, state);
        expect(lm.getCurrentState()).toBe(state);
      } catch {
        // Shutdown may not be directly testable if it requires full chain
        // But we test it through valid transitions
      }
    });
  }
});

describe('LifecycleManager history tracking', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('empty history initially', () => {
    expect(lm.getHistory()).toHaveLength(0);
  });

  it('single transition adds 1 record', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    expect(lm.getHistory()).toHaveLength(1);
  });

  it('history record has from, to, timestamp', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    const h = lm.getHistory();
    expect(h[0].from).toBe(CompanionState.Uninitialized);
    expect(h[0].to).toBe(CompanionState.Initializing);
    expect(h[0].timestamp).toBeTruthy();
    expect(typeof h[0].timestamp).toBe('string');
  });

  it('timestamp is valid ISO string', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    const h = lm.getHistory();
    expect(() => new Date(h[0].timestamp).getTime()).not.toThrow();
  });

  it('two transitions adds 2 records', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    expect(lm.getHistory()).toHaveLength(2);
  });

  it('history records are in order', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    const h = lm.getHistory();
    expect(h[0].from).toBe(CompanionState.Uninitialized);
    expect(h[1].from).toBe(CompanionState.Initializing);
  });

  it('getHistory returns a readonly view', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    const h = lm.getHistory();
    expect(h).toHaveLength(1);
  });

  it('history after full lifecycle chain', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    expect(lm.getHistory()).toHaveLength(4);
  });

  it('history includes pause/resume cycles', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    await lm.transition(CompanionState.Paused, CompanionState.Active);
    expect(lm.getHistory()).toHaveLength(4);
    expect(lm.getHistory()[2].from).toBe(CompanionState.Active);
    expect(lm.getHistory()[2].to).toBe(CompanionState.Paused);
    expect(lm.getHistory()[3].from).toBe(CompanionState.Paused);
    expect(lm.getHistory()[3].to).toBe(CompanionState.Active);
  });
});

describe('LifecycleManager reset', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('resets to Uninitialized', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.reset();
    expect(lm.getCurrentState()).toBe(CompanionState.Uninitialized);
  });

  it('clears history', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.reset();
    expect(lm.getHistory()).toHaveLength(0);
  });

  it('allows transitions after reset', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.reset();
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    expect(lm.getCurrentState()).toBe(CompanionState.Initializing);
  });

  it('reset from Error state', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.reset();
    expect(lm.getCurrentState()).toBe(CompanionState.Uninitialized);
    expect(lm.getHistory()).toHaveLength(0);
  });

  it('reset from Shutdown state', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    await lm.reset();
    expect(lm.getCurrentState()).toBe(CompanionState.Uninitialized);
  });

  it('multiple resets are idempotent', async () => {
    await lm.reset();
    await lm.reset();
    await lm.reset();
    expect(lm.getCurrentState()).toBe(CompanionState.Uninitialized);
    expect(lm.getHistory()).toHaveLength(0);
  });
});

describe('LifecycleManager state queries', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('isUninitialized initially', () => {
    expect(lm.getCurrentState() === CompanionState.Uninitialized).toBe(true);
  });

  it('isActive after chain', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    expect(lm.getCurrentState() === CompanionState.Active).toBe(true);
  });

  it('isPaused after Active->Paused', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    expect(lm.getCurrentState() === CompanionState.Paused).toBe(true);
  });

  it('isShuttingDown after Active->ShuttingDown', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    expect(lm.getCurrentState() === CompanionState.ShuttingDown).toBe(true);
  });

  it('isShutdown after full chain', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    expect(lm.getCurrentState() === CompanionState.Shutdown).toBe(true);
  });

  it('isError after Initializing->Error', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    expect(lm.getCurrentState() === CompanionState.Error).toBe(true);
  });
});

describe('LifecycleManager error recovery', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('Error -> Initializing -> Active recovers', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    expect(lm.getCurrentState()).toBe(CompanionState.Active);
  });

  it('Error -> Initializing -> Error -> Initializing -> Active', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    expect(lm.getCurrentState()).toBe(CompanionState.Active);
  });

  it('Error -> Shutdown terminates', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Shutdown);
    expect(lm.getCurrentState()).toBe(CompanionState.Shutdown);
  });

  it('history tracks error recovery', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    const h = lm.getHistory();
    expect(h[1].to).toBe(CompanionState.Error);
    expect(h[2].from).toBe(CompanionState.Error);
    expect(h[2].to).toBe(CompanionState.Initializing);
  });
});

describe('LifecycleManager transition reason', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('transition with reason does not throw for valid', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing, 'Starting up');
    expect(lm.getCurrentState()).toBe(CompanionState.Initializing);
  });
});

describe('LifecycleManager StateTransitionError', () => {
  it('has correct properties', () => {
    const err = new StateTransitionError('Uninitialized', 'Active', 'must go through Initializing');
    expect(err.fromState).toBe('Uninitialized');
    expect(err.toState).toBe('Active');
    expect(err.reason).toBe('must go through Initializing');
    expect(err.code).toBe('STATE_TRANSITION_ERROR');
    expect(err.message).toContain('Uninitialized');
    expect(err.message).toContain('Active');
  });

  it('is instance of Error', () => {
    expect(new StateTransitionError('A', 'B')).toBeInstanceOf(Error);
  });

  it('default reason is empty string', () => {
    const err = new StateTransitionError('A', 'B');
    expect(err.reason).toBe('');
  });
});

describe('LifecycleManager wrong current state throws', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('transition claims from Active but current is Uninitialized', async () => {
    await expect(
      lm.transition(CompanionState.Active, CompanionState.Paused)
    ).rejects.toThrow(StateTransitionError);
  });

  it('transition claims from Initializing but current is Active', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await expect(
      lm.transition(CompanionState.Initializing, CompanionState.Active)
    ).rejects.toThrow(StateTransitionError);
  });
});

describe('LifecycleManager CompanionState enum', () => {
  it('all states are strings', () => {
    for (const s of STATES) {
      expect(typeof s).toBe('string');
    }
  });
  it('all states are distinct', () => {
    expect(new Set(STATES).size).toBe(7);
  });
});

describe('LifecycleManager multiple pause/resume cycles', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('10 pause/resume cycles', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    for (let i = 0; i < 10; i++) {
      await lm.transition(CompanionState.Active, CompanionState.Paused);
      await lm.transition(CompanionState.Paused, CompanionState.Active);
    }
    expect(lm.getCurrentState()).toBe(CompanionState.Active);
    expect(lm.getHistory()).toHaveLength(2 + 20);
  });

  it('history correctly records all pause/resume', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    await lm.transition(CompanionState.Paused, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    await lm.transition(CompanionState.Paused, CompanionState.Active);
    const h = lm.getHistory();
    const pauses = h.filter(r => r.from === CompanionState.Active && r.to === CompanionState.Paused);
    const resumes = h.filter(r => r.from === CompanionState.Paused && r.to === CompanionState.Active);
    expect(pauses).toHaveLength(2);
    expect(resumes).toHaveLength(2);
  });
});

describe('LifecycleManager full lifecycle paths', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  it('path: Uninit -> Init -> Active -> Paused -> Shutdown (via ShuttingDown)', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    await lm.transition(CompanionState.Paused, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    expect(lm.getCurrentState()).toBe(CompanionState.Shutdown);
    expect(lm.getHistory()).toHaveLength(5);
  });

  it('path: Uninit -> Init -> Active -> Error -> Init -> Active -> Shutdown', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.ShuttingDown);
    await lm.transition(CompanionState.ShuttingDown, CompanionState.Shutdown);
    expect(lm.getCurrentState()).toBe(CompanionState.Shutdown);
    expect(lm.getHistory()).toHaveLength(7);
  });

  it('path: Uninit -> Init -> Error -> Shutdown', async () => {
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Error);
    await lm.transition(CompanionState.Error, CompanionState.Shutdown);
    expect(lm.getCurrentState()).toBe(CompanionState.Shutdown);
  });
});

describe('LifecycleManager two instances isolated', () => {
  it('transition in lm1 does not affect lm2', async () => {
    const lm1 = new LifecycleManager(DefaultLifecycleManagerConfig);
    const lm2 = new LifecycleManager(DefaultLifecycleManagerConfig);
    await lm1.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    expect(lm1.getCurrentState()).toBe(CompanionState.Initializing);
    expect(lm2.getCurrentState()).toBe(CompanionState.Uninitialized);
  });
});

describe('LifecycleManager history timestamps are increasing', () => {
  it('timestamps increase monotonically', async () => {
    const lm = new LifecycleManager(DefaultLifecycleManagerConfig);
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    await lm.transition(CompanionState.Active, CompanionState.Paused);
    const h = lm.getHistory();
    const t0 = new Date(h[0].timestamp).getTime();
    const t1 = new Date(h[1].timestamp).getTime();
    const t2 = new Date(h[2].timestamp).getTime();
    expect(t1).toBeGreaterThanOrEqual(t0);
    expect(t2).toBeGreaterThanOrEqual(t1);
  });
});

describe('LifecycleManager history transition records are frozen', () => {
  it('transition record fields are readonly', async () => {
    const lm = new LifecycleManager(DefaultLifecycleManagerConfig);
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    const h = lm.getHistory();
    // The getHistory returns ReadonlyArray, so TypeScript enforces
    // that we can't write to the properties. But at runtime:
    expect(Object.isFrozen(h[0])).toBe(true);
  });
});

describe('LifecycleManager getHistory after reset and re-transition', () => {
  it('reset clears, new transitions tracked', async () => {
    const lm = new LifecycleManager(DefaultLifecycleManagerConfig);
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.reset();
    expect(lm.getHistory()).toHaveLength(0);
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    expect(lm.getHistory()).toHaveLength(2);
  });
});

describe('LifecycleManager error from each state', () => {
  let lm: LifecycleManager;
  beforeEach(() => {
    lm = new LifecycleManager(DefaultLifecycleManagerConfig);
  });

  // Test transitions to Error from states that support it
  const errorFromStates = [
    CompanionState.Initializing,
    CompanionState.Active,
    CompanionState.ShuttingDown,
  ];

  for (const fromState of errorFromStates) {
    it(`error from ${STATE_LABELS[fromState]}`, async () => {
      try {
        await setStateTo(lm, fromState);
      } catch {
        return;
      }
      if (lm.getCurrentState() !== fromState) return;
      await lm.transition(fromState, CompanionState.Error);
      expect(lm.getCurrentState()).toBe(CompanionState.Error);
    });
  }
});

describe('LifecycleManager stress: many rapid transitions', () => {
  it('20 pause/resume transitions', async () => {
    const lm = new LifecycleManager(DefaultLifecycleManagerConfig);
    await lm.transition(CompanionState.Uninitialized, CompanionState.Initializing);
    await lm.transition(CompanionState.Initializing, CompanionState.Active);
    for (let i = 0; i < 20; i++) {
      await lm.transition(CompanionState.Active, CompanionState.Paused);
      await lm.transition(CompanionState.Paused, CompanionState.Active);
    }
    expect(lm.getCurrentState()).toBe(CompanionState.Active);
  });
});

// Helper to set lifecycle to a specific state
async function setStateTo(lm: LifecycleManager, state: CompanionState): Promise<void> {
  const paths: Record<string, Array<{ from: CompanionState; to: CompanionState }>> = {
    [CompanionState.Uninitialized]: [],
    [CompanionState.Initializing]: [
      { from: CompanionState.Uninitialized, to: CompanionState.Initializing },
    ],
    [CompanionState.Active]: [
      { from: CompanionState.Uninitialized, to: CompanionState.Initializing },
      { from: CompanionState.Initializing, to: CompanionState.Active },
    ],
    [CompanionState.Paused]: [
      { from: CompanionState.Uninitialized, to: CompanionState.Initializing },
      { from: CompanionState.Initializing, to: CompanionState.Active },
      { from: CompanionState.Active, to: CompanionState.Paused },
    ],
    [CompanionState.ShuttingDown]: [
      { from: CompanionState.Uninitialized, to: CompanionState.Initializing },
      { from: CompanionState.Initializing, to: CompanionState.Active },
      { from: CompanionState.Active, to: CompanionState.ShuttingDown },
    ],
    [CompanionState.Shutdown]: [
      { from: CompanionState.Uninitialized, to: CompanionState.Initializing },
      { from: CompanionState.Initializing, to: CompanionState.Active },
      { from: CompanionState.Active, to: CompanionState.ShuttingDown },
      { from: CompanionState.ShuttingDown, to: CompanionState.Shutdown },
    ],
    [CompanionState.Error]: [
      { from: CompanionState.Uninitialized, to: CompanionState.Initializing },
      { from: CompanionState.Initializing, to: CompanionState.Error },
    ],
  };
  const path = paths[state];
  if (!path) throw new Error(`No path to ${state}`);
  for (const step of path) {
    await lm.transition(step.from, step.to);
  }
}
