import { createCapabilityFSM, getCapabilityFSMDefinition, CAPABILITY_FSM_DEFINITION } from '../../../core/capability/capability-fsm.js';
import type { StateMachine, FSMDefinition } from '../../../core/fsm/state-machine.js';
import { CapabilityState } from '../../../core/capability/types.js';

// ─── Helpers ─────────────────────────────────────────────────────

function freshFSM(): StateMachine<CapabilityState> {
  return createCapabilityFSM();
}

function fsmTo(fsm: StateMachine<CapabilityState>, state: CapabilityState): void {
  fsm.transition(state);
}

function fsmToActive(fsm: StateMachine<CapabilityState>): void {
  fsm.transition(CapabilityState.Validated);
  fsm.transition(CapabilityState.Loaded);
  fsm.transition(CapabilityState.Initialized);
  fsm.transition(CapabilityState.Active);
}

// ═════════════════════════════════════════════════════════════════
// 1. FSM Factory
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — Factory', () => {
  it('creates a StateMachine instance', () => {
    const fsm = createCapabilityFSM();
    expect(fsm).toBeDefined();
    expect(fsm).not.toBeNull();
  });

  it('returns an object with expected interface', () => {
    const fsm = createCapabilityFSM();
    expect(typeof fsm.transition).toBe('function');
    expect(typeof fsm.canTransition).toBe('function');
    expect(typeof fsm.onBeforeTransition).toBe('function');
    expect(typeof fsm.onAfterTransition).toBe('function');
    expect(typeof fsm.getHistory).toBe('function');
  });

  it('initial state is Registered', () => {
    const fsm = createCapabilityFSM();
    expect(fsm.currentState).toBe(CapabilityState.Registered);
  });

  it('each call to createCapabilityFSM returns an independent instance', () => {
    const a = createCapabilityFSM();
    const b = createCapabilityFSM();
    a.transition(CapabilityState.Validated);
    expect(a.currentState).toBe(CapabilityState.Validated);
    expect(b.currentState).toBe(CapabilityState.Registered);
  });

  it('isTerminal is false at initial state', () => {
    const fsm = createCapabilityFSM();
    expect(fsm.isTerminal).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════
// 2. Valid Transitions — Happy Path (full lifecycle)
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — Valid Transitions (Happy Path)', () => {
  it('Registered → Validated', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    expect(fsm.currentState).toBe(CapabilityState.Validated);
  });

  it('Validated → Loaded', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    expect(fsm.currentState).toBe(CapabilityState.Loaded);
  });

  it('Loaded → Initialized', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    fsm.transition(CapabilityState.Initialized);
    expect(fsm.currentState).toBe(CapabilityState.Initialized);
  });

  it('Initialized → Active', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    fsm.transition(CapabilityState.Initialized);
    fsm.transition(CapabilityState.Active);
    expect(fsm.currentState).toBe(CapabilityState.Active);
  });

  it('full lifecycle in one chain: Registered → Validated → Loaded → Initialized → Active', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    expect(fsm.currentState).toBe(CapabilityState.Active);
  });

  it('full lifecycle with no errors', () => {
    const fsm = freshFSM();
    expect(() => {
      fsm.transition(CapabilityState.Validated);
      fsm.transition(CapabilityState.Loaded);
      fsm.transition(CapabilityState.Initialized);
      fsm.transition(CapabilityState.Active);
    }).not.toThrow();
  });

  it('isTerminal remains false after reaching Active', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    expect(fsm.isTerminal).toBe(false);
  });

  it('history records every step of the happy path', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    const history = fsm.getHistory();
    expect(history).toHaveLength(5);
    expect(history[0].state).toBe(CapabilityState.Registered);
    expect(history[1].state).toBe(CapabilityState.Validated);
    expect(history[2].state).toBe(CapabilityState.Loaded);
    expect(history[3].state).toBe(CapabilityState.Initialized);
    expect(history[4].state).toBe(CapabilityState.Active);
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. Valid Transitions — Suspension round-trip
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — Suspension Round-Trip', () => {
  it('Active → Suspended', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Suspended);
    expect(fsm.currentState).toBe(CapabilityState.Suspended);
  });

  it('Suspended → Active', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Suspended);
    fsm.transition(CapabilityState.Active);
    expect(fsm.currentState).toBe(CapabilityState.Active);
  });

  it('multiple suspend/resume cycles', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    for (let i = 0; i < 3; i++) {
      fsm.transition(CapabilityState.Suspended);
      expect(fsm.currentState).toBe(CapabilityState.Suspended);
      fsm.transition(CapabilityState.Active);
      expect(fsm.currentState).toBe(CapabilityState.Active);
    }
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. Valid Transitions — Disable from any state
// ═════════════════════════════════════════════════════

describe('Capability FSM — Disable from Any State', () => {
  it('Registered → Disabled', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Disabled);
    expect(fsm.currentState).toBe(CapabilityState.Disabled);
  });

  it('Validated → Disabled', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Disabled);
    expect(fsm.currentState).toBe(CapabilityState.Disabled);
  });

  it('Loaded → Disabled', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    fsm.transition(CapabilityState.Disabled);
    expect(fsm.currentState).toBe(CapabilityState.Disabled);
  });

  it('Initialized → Disabled', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    fsm.transition(CapabilityState.Initialized);
    fsm.transition(CapabilityState.Disabled);
    expect(fsm.currentState).toBe(CapabilityState.Disabled);
  });

  it('Active → Disabled', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Disabled);
    expect(fsm.currentState).toBe(CapabilityState.Disabled);
  });

  it('Suspended → Disabled', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Suspended);
    fsm.transition(CapabilityState.Disabled);
    expect(fsm.currentState).toBe(CapabilityState.Disabled);
  });
});

// ═════════════════════════════════════════════════════════════════
// 5. Valid Transitions — Remove from any state
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — Remove from Any State', () => {
  it('Registered → Removed', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Removed);
    expect(fsm.currentState).toBe(CapabilityState.Removed);
  });

  it('Validated → Removed', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Removed);
    expect(fsm.currentState).toBe(CapabilityState.Removed);
  });

  it('Loaded → Removed', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    fsm.transition(CapabilityState.Removed);
    expect(fsm.currentState).toBe(CapabilityState.Removed);
  });

  it('Initialized → Removed', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    fsm.transition(CapabilityState.Initialized);
    fsm.transition(CapabilityState.Removed);
    expect(fsm.currentState).toBe(CapabilityState.Removed);
  });

  it('Active → Removed', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Removed);
    expect(fsm.currentState).toBe(CapabilityState.Removed);
  });

  it('Suspended → Removed', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Suspended);
    fsm.transition(CapabilityState.Removed);
    expect(fsm.currentState).toBe(CapabilityState.Removed);
  });
});

// ═════════════════════════════════════════════════════════════════
// 6. Invalid Transitions
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — Invalid Transitions', () => {
  it('Active → Registered throws', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    expect(() => fsm.transition(CapabilityState.Registered)).toThrow('not allowed');
  });

  it('Removed → any state throws (terminal)', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Removed);
    expect(() => fsm.transition(CapabilityState.Registered)).toThrow('terminal state');
    expect(() => fsm.transition(CapabilityState.Active)).toThrow('terminal state');
    expect(() => fsm.transition(CapabilityState.Disabled)).toThrow('terminal state');
  });

  it('Validated → Active throws', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    expect(() => fsm.transition(CapabilityState.Active)).toThrow('not allowed');
  });

  it('Loaded → Active throws', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    expect(() => fsm.transition(CapabilityState.Active)).toThrow('not allowed');
  });

  it('Registered → Active throws', () => {
    const fsm = freshFSM();
    expect(() => fsm.transition(CapabilityState.Active)).toThrow('not allowed');
  });

  it('Registered → Loaded throws (skipping Validated)', () => {
    const fsm = freshFSM();
    expect(() => fsm.transition(CapabilityState.Loaded)).toThrow('not allowed');
  });

  it('Suspended → Registered throws', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Suspended);
    expect(() => fsm.transition(CapabilityState.Registered)).toThrow('not allowed');
  });

  it('Disabled → any state throws (Disabled is not terminal but has no outgoing transitions)', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Disabled);
    expect(() => fsm.transition(CapabilityState.Active)).toThrow('not allowed');
    expect(() => fsm.transition(CapabilityState.Registered)).toThrow('not allowed');
  });
});

// ═════════════════════════════════════════════════════════════════
// 7. canTransition
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — canTransition', () => {
  it('Registered can transition to Validated, Disabled, Removed', () => {
    const fsm = freshFSM();
    expect(fsm.canTransition(CapabilityState.Validated)).toBe(true);
    expect(fsm.canTransition(CapabilityState.Disabled)).toBe(true);
    expect(fsm.canTransition(CapabilityState.Removed)).toBe(true);
  });

  it('Registered cannot transition to Loaded, Initialized, Active, Suspended', () => {
    const fsm = freshFSM();
    expect(fsm.canTransition(CapabilityState.Loaded)).toBe(false);
    expect(fsm.canTransition(CapabilityState.Initialized)).toBe(false);
    expect(fsm.canTransition(CapabilityState.Active)).toBe(false);
    expect(fsm.canTransition(CapabilityState.Suspended)).toBe(false);
  });

  it('Active can transition to Suspended, Disabled, Removed', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    expect(fsm.canTransition(CapabilityState.Suspended)).toBe(true);
    expect(fsm.canTransition(CapabilityState.Disabled)).toBe(true);
    expect(fsm.canTransition(CapabilityState.Removed)).toBe(true);
  });

  it('Active cannot transition to Registered, Validated, Loaded, Initialized', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    expect(fsm.canTransition(CapabilityState.Registered)).toBe(false);
    expect(fsm.canTransition(CapabilityState.Validated)).toBe(false);
    expect(fsm.canTransition(CapabilityState.Loaded)).toBe(false);
    expect(fsm.canTransition(CapabilityState.Initialized)).toBe(false);
  });

  it('Suspended can transition to Active, Disabled, Removed', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Suspended);
    expect(fsm.canTransition(CapabilityState.Active)).toBe(true);
    expect(fsm.canTransition(CapabilityState.Disabled)).toBe(true);
    expect(fsm.canTransition(CapabilityState.Removed)).toBe(true);
  });

  it('Removed cannot transition to anything', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Removed);
    for (const state of Object.values(CapabilityState)) {
      expect(fsm.canTransition(state)).toBe(false);
    }
  });

  it('Disabled cannot transition to anything', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Disabled);
    for (const state of Object.values(CapabilityState)) {
      expect(fsm.canTransition(state)).toBe(false);
    }
  });

  it('canTransition does not mutate state', () => {
    const fsm = freshFSM();
    fsm.canTransition(CapabilityState.Validated);
    fsm.canTransition(CapabilityState.Active);
    fsm.canTransition(CapabilityState.Removed);
    expect(fsm.currentState).toBe(CapabilityState.Registered);
  });
});

// ═════════════════════════════════════════════════════════════════
// 8. Terminal State
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — Terminal State', () => {
  it('isTerminal is true only for Removed', () => {
    const fsm = freshFSM();
    expect(fsm.isTerminal).toBe(false);
    fsm.transition(CapabilityState.Validated);
    expect(fsm.isTerminal).toBe(false);
    fsm.transition(CapabilityState.Loaded);
    expect(fsm.isTerminal).toBe(false);
    fsm.transition(CapabilityState.Initialized);
    expect(fsm.isTerminal).toBe(false);
    fsm.transition(CapabilityState.Active);
    expect(fsm.isTerminal).toBe(false);
    fsm.transition(CapabilityState.Suspended);
    expect(fsm.isTerminal).toBe(false);
    fsm.transition(CapabilityState.Active);
    expect(fsm.isTerminal).toBe(false);
    fsm.transition(CapabilityState.Disabled);
    expect(fsm.isTerminal).toBe(false);
  });

  it('transitioning to Removed makes isTerminal true', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Removed);
    expect(fsm.isTerminal).toBe(true);
  });

  it('transition from Removed throws for every target', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Removed);
    const targets = [
      CapabilityState.Registered,
      CapabilityState.Validated,
      CapabilityState.Loaded,
      CapabilityState.Initialized,
      CapabilityState.Active,
      CapabilityState.Suspended,
      CapabilityState.Disabled,
    ];
    for (const target of targets) {
      expect(() => fsm.transition(target)).toThrow('terminal state');
    }
    // State should still be Removed after failed attempts
    expect(fsm.currentState).toBe(CapabilityState.Removed);
  });
});

// ═════════════════════════════════════════════════════════════════
// 9. History
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — History', () => {
  it('getHistory returns entries with state and timestamp in order', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    const history = fsm.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].state).toBe(CapabilityState.Registered);
    expect(history[0].timestamp).toBeTruthy();
    expect(history[1].state).toBe(CapabilityState.Validated);
    expect(history[1].timestamp).toBeTruthy();
    expect(history[2].state).toBe(CapabilityState.Loaded);
    expect(history[2].timestamp).toBeTruthy();
  });

  it('timestamps are valid ISO strings in chronological order', () => {
    const fsm = freshFSM();
    fsm.transition(CapabilityState.Validated);
    fsm.transition(CapabilityState.Loaded);
    fsm.transition(CapabilityState.Initialized);
    const history = fsm.getHistory();
    for (const entry of history) {
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(() => new Date(entry.timestamp)).not.toThrow();
    }
    const timestamps = history.map((e) => new Date(e.timestamp).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it('history includes suspension round-trip entries', () => {
    const fsm = freshFSM();
    fsmToActive(fsm);
    fsm.transition(CapabilityState.Suspended);
    fsm.transition(CapabilityState.Active);
    fsm.transition(CapabilityState.Suspended);
    fsm.transition(CapabilityState.Removed);
    const history = fsm.getHistory();
    const states = history.map((e) => e.state);
    expect(states).toEqual([
      CapabilityState.Registered,
      CapabilityState.Validated,
      CapabilityState.Loaded,
      CapabilityState.Initialized,
      CapabilityState.Active,
      CapabilityState.Suspended,
      CapabilityState.Active,
      CapabilityState.Suspended,
      CapabilityState.Removed,
    ]);
  });
});

// ═════════════════════════════════════════════════════════════════
// 10. Hooks
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — Hooks', () => {
  it('onBeforeTransition fires with correct from/to', () => {
    const fsm = freshFSM();
    const calls: Array<{ from: CapabilityState; to: CapabilityState }> = [];
    fsm.onBeforeTransition((from, to) => calls.push({ from, to }));
    fsm.transition(CapabilityState.Validated);
    expect(calls).toHaveLength(1);
    expect(calls[0].from).toBe(CapabilityState.Registered);
    expect(calls[0].to).toBe(CapabilityState.Validated);
  });

  it('onAfterTransition fires with correct from/to', () => {
    const fsm = freshFSM();
    const calls: Array<{ from: CapabilityState; to: CapabilityState }> = [];
    fsm.onAfterTransition((from, to) => calls.push({ from, to }));
    fsm.transition(CapabilityState.Validated);
    expect(calls).toHaveLength(1);
    expect(calls[0].from).toBe(CapabilityState.Registered);
    expect(calls[0].to).toBe(CapabilityState.Validated);
  });

  it('hooks do not break FSM when they throw', () => {
    const fsm = freshFSM();
    fsm.onBeforeTransition(() => { throw new Error('before hook boom'); });
    fsm.onAfterTransition(() => { throw new Error('after hook boom'); });
    expect(() => fsm.transition(CapabilityState.Validated)).not.toThrow();
    expect(fsm.currentState).toBe(CapabilityState.Validated);
  });

  it('multiple hooks all fire in registration order', () => {
    const fsm = freshFSM();
    const order: string[] = [];
    fsm.onBeforeTransition((from, to) => order.push(`before-1:${from}→${to}`));
    fsm.onBeforeTransition((from, to) => order.push(`before-2:${from}→${to}`));
    fsm.onAfterTransition((from, to) => order.push(`after-1:${from}→${to}`));
    fsm.onAfterTransition((from, to) => order.push(`after-2:${from}→${to}`));
    fsm.transition(CapabilityState.Validated);
    expect(order).toEqual([
      'before-1:Registered→Validated',
      'before-2:Registered→Validated',
      'after-1:Registered→Validated',
      'after-2:Registered→Validated',
    ]);
  });
});

// ═════════════════════════════════════════════════════════════════
// 11. FSM Definition
// ═════════════════════════════════════════════════════════════════

describe('Capability FSM — Definition', () => {
  it('getCapabilityFSMDefinition returns the same definition as CAPABILITY_FSM_DEFINITION', () => {
    const def = getCapabilityFSMDefinition();
    expect(def).toBe(CAPABILITY_FSM_DEFINITION);
  });

  it('initial state is Registered', () => {
    const def = getCapabilityFSMDefinition();
    expect(def.initialState).toBe(CapabilityState.Registered);
  });

  it('terminal states contain only Removed', () => {
    const def = getCapabilityFSMDefinition();
    expect(def.terminalStates).toHaveLength(1);
    expect(def.terminalStates).toContain(CapabilityState.Removed);
  });

  it('definition has exactly 18 transitions', () => {
    const def = getCapabilityFSMDefinition();
    // 6 states × 3 transitions each (forward + Disabled + Removed) = 18
    expect(def.transitions).toHaveLength(18);
  });

  it('every transition has valid from/to states from CapabilityState enum', () => {
    const validStates = new Set(Object.values(CapabilityState));
    const def = getCapabilityFSMDefinition();
    for (const t of def.transitions) {
      expect(validStates.has(t.from)).toBe(true);
      expect(validStates.has(t.to)).toBe(true);
    }
  });

  it('definition is frozen/readonly (transitions array is the same reference)', () => {
    const def = getCapabilityFSMDefinition();
    // The exported constant should be the same object each time
    expect(getCapabilityFSMDefinition()).toBe(def);
  });
});
