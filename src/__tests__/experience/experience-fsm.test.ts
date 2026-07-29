/**
 * Tests for Experience FSM (Subsystem 12)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createExperienceFSM,
  ExperienceFSMDefinition,
} from '../../core/experience/experience-fsm.js';
import { ExperienceState } from '../../core/experience/types.js';

describe('ExperienceFSMDefinition', () => {
  it('has Created as initial state', () => {
    expect(ExperienceFSMDefinition.initialState).toBe(ExperienceState.Created);
  });

  it('defines transition Created → Learning', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Created, to: ExperienceState.Learning });
  });

  it('defines transition Learning → Observing', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Learning, to: ExperienceState.Observing });
  });

  it('defines transition Observing → Adapting', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Observing, to: ExperienceState.Adapting });
  });

  it('defines transition Adapting → Stable', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Adapting, to: ExperienceState.Stable });
  });

  it('defines transition Stable → Relearning', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Stable, to: ExperienceState.Relearning });
  });

  it('defines transition Stable → Adapting', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Stable, to: ExperienceState.Adapting });
  });

  it('defines transition Adapting → Relearning', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Adapting, to: ExperienceState.Relearning });
  });

  it('defines transition Relearning → Learning', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Relearning, to: ExperienceState.Learning });
  });

  it('defines transition Relearning → Observing', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Relearning, to: ExperienceState.Observing });
  });

  it('defines transition Stable → Archived', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Stable, to: ExperienceState.Archived });
  });

  it('defines transition Relearning → Archived', () => {
    const t = ExperienceFSMDefinition.transitions;
    expect(t).toContainEqual({ from: ExperienceState.Relearning, to: ExperienceState.Archived });
  });

  it('has Archived as terminal state', () => {
    expect(ExperienceFSMDefinition.terminalStates).toContain(ExperienceState.Archived);
  });

  it('has exactly one terminal state', () => {
    expect(ExperienceFSMDefinition.terminalStates).toHaveLength(1);
  });

  it('defines exactly 11 transitions', () => {
    expect(ExperienceFSMDefinition.transitions).toHaveLength(11);
  });
});

describe('createExperienceFSM', () => {
  let fsm: ReturnType<typeof createExperienceFSM>;

  beforeEach(() => {
    fsm = createExperienceFSM();
  });

  // ─── Initial State ──────────────────────────────────────────

  describe('initial state', () => {
    it('returns FSM in Created state', () => {
      expect(fsm.currentState).toBe(ExperienceState.Created);
    });

    it('is not terminal in Created state', () => {
      expect(fsm.isTerminal).toBe(false);
    });

    it('history contains initial Created entry', () => {
      const history = fsm.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].state).toBe(ExperienceState.Created);
      expect(history[0].timestamp).toBeTruthy();
    });
  });

  // ─── Valid Transitions ─────────────────────────────────────

  describe('valid transitions', () => {
    it('Created → Learning', () => {
      fsm.transition(ExperienceState.Learning);
      expect(fsm.currentState).toBe(ExperienceState.Learning);
    });

    it('Learning → Observing', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      expect(fsm.currentState).toBe(ExperienceState.Observing);
    });

    it('Observing → Adapting', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      expect(fsm.currentState).toBe(ExperienceState.Adapting);
    });

    it('Adapting → Stable', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      expect(fsm.currentState).toBe(ExperienceState.Stable);
    });

    it('Stable → Relearning', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Relearning);
      expect(fsm.currentState).toBe(ExperienceState.Relearning);
    });

    it('Stable → Adapting', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Adapting);
      expect(fsm.currentState).toBe(ExperienceState.Adapting);
    });

    it('Adapting → Relearning', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Relearning);
      expect(fsm.currentState).toBe(ExperienceState.Relearning);
    });

    it('Relearning → Learning', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Relearning);
      fsm.transition(ExperienceState.Learning);
      expect(fsm.currentState).toBe(ExperienceState.Learning);
    });

    it('Relearning → Observing', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Relearning);
      fsm.transition(ExperienceState.Observing);
      expect(fsm.currentState).toBe(ExperienceState.Observing);
    });

    it('Stable → Archived', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Archived);
      expect(fsm.currentState).toBe(ExperienceState.Archived);
    });

    it('Relearning → Archived', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Relearning);
      fsm.transition(ExperienceState.Archived);
      expect(fsm.currentState).toBe(ExperienceState.Archived);
    });
  });

  // ─── Invalid Transitions ───────────────────────────────────

  describe('invalid transitions', () => {
    it('rejects Created → Observing', () => {
      expect(() => fsm.transition(ExperienceState.Observing)).toThrow('not allowed');
    });

    it('rejects Created → Adapting', () => {
      expect(() => fsm.transition(ExperienceState.Adapting)).toThrow('not allowed');
    });

    it('rejects Created → Stable', () => {
      expect(() => fsm.transition(ExperienceState.Stable)).toThrow('not allowed');
    });

    it('rejects Created → Relearning', () => {
      expect(() => fsm.transition(ExperienceState.Relearning)).toThrow('not allowed');
    });

    it('rejects Created → Archived', () => {
      expect(() => fsm.transition(ExperienceState.Archived)).toThrow('not allowed');
    });

    it('rejects Learning → Created', () => {
      fsm.transition(ExperienceState.Learning);
      expect(() => fsm.transition(ExperienceState.Created)).toThrow('not allowed');
    });

    it('rejects Learning → Stable', () => {
      fsm.transition(ExperienceState.Learning);
      expect(() => fsm.transition(ExperienceState.Stable)).toThrow('not allowed');
    });

    it('rejects Learning → Archived', () => {
      fsm.transition(ExperienceState.Learning);
      expect(() => fsm.transition(ExperienceState.Archived)).toThrow('not allowed');
    });

    it('rejects Observing → Created', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      expect(() => fsm.transition(ExperienceState.Created)).toThrow('not allowed');
    });

    it('rejects Observing → Stable', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      expect(() => fsm.transition(ExperienceState.Stable)).toThrow('not allowed');
    });

    it('rejects Adapting → Created', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      expect(() => fsm.transition(ExperienceState.Created)).toThrow('not allowed');
    });

    it('rejects Adapting → Archived', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      expect(() => fsm.transition(ExperienceState.Archived)).toThrow('not allowed');
    });

    it('rejects Relearning → Stable', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Relearning);
      expect(() => fsm.transition(ExperienceState.Stable)).toThrow('not allowed');
    });

    it('rejects Relearning → Adapting', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Relearning);
      expect(() => fsm.transition(ExperienceState.Adapting)).toThrow('not allowed');
    });
  });

  // ─── Terminal State ────────────────────────────────────────

  describe('Archived terminal state', () => {
    it('isTerminal is true in Archived state', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Archived);
      expect(fsm.isTerminal).toBe(true);
    });

    it('rejects all transitions from Archived', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Archived);

      expect(() => fsm.transition(ExperienceState.Created)).toThrow('terminal state');
      expect(() => fsm.transition(ExperienceState.Learning)).toThrow('terminal state');
      expect(() => fsm.transition(ExperienceState.Observing)).toThrow('terminal state');
      expect(() => fsm.transition(ExperienceState.Adapting)).toThrow('terminal state');
      expect(() => fsm.transition(ExperienceState.Stable)).toThrow('terminal state');
      expect(() => fsm.transition(ExperienceState.Relearning)).toThrow('terminal state');
    });

    it('canTransition returns false for all targets from Archived', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Archived);

      for (const state of Object.values(ExperienceState)) {
        if (state !== ExperienceState.Archived) {
          expect(fsm.canTransition(state)).toBe(false);
        }
      }
    });

    it('Archived from Relearning path is also terminal', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Relearning);
      fsm.transition(ExperienceState.Archived);
      expect(fsm.isTerminal).toBe(true);
    });
  });

  // ─── State History ─────────────────────────────────────────

  describe('state history', () => {
    it('records state history for transitions', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      const history = fsm.getHistory();
      expect(history).toHaveLength(3); // Created + Learning + Observing
    });

    it('history entries have timestamps', () => {
      fsm.transition(ExperienceState.Learning);
      const history = fsm.getHistory();
      for (const entry of history) {
        expect(entry.timestamp).toBeTruthy();
      }
    });

    it('history is ordered chronologically', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      const history = fsm.getHistory();
      expect(history[0].state).toBe(ExperienceState.Created);
      expect(history[1].state).toBe(ExperienceState.Learning);
      expect(history[2].state).toBe(ExperienceState.Observing);
      expect(history[3].state).toBe(ExperienceState.Adapting);
      expect(history[4].state).toBe(ExperienceState.Stable);
    });

    it('records history for relearning cycle', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Relearning);
      fsm.transition(ExperienceState.Learning);
      const history = fsm.getHistory();
      expect(history[0].state).toBe(ExperienceState.Created);
      expect(history[history.length - 1].state).toBe(ExperienceState.Learning);
    });

    it('includes Archived in history when reached', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Archived);
      const history = fsm.getHistory();
      expect(history[history.length - 1].state).toBe(ExperienceState.Archived);
    });
  });

  // ─── canTransition ─────────────────────────────────────────

  describe('canTransition', () => {
    it('returns true for Created → Learning', () => {
      expect(fsm.canTransition(ExperienceState.Learning)).toBe(true);
    });

    it('returns false for Created → Observing', () => {
      expect(fsm.canTransition(ExperienceState.Observing)).toBe(false);
    });

    it('returns false for same-state transition', () => {
      expect(fsm.canTransition(ExperienceState.Created)).toBe(false);
    });

    it('updates canTransition after state change', () => {
      expect(fsm.canTransition(ExperienceState.Learning)).toBe(true);
      fsm.transition(ExperienceState.Learning);
      expect(fsm.canTransition(ExperienceState.Learning)).toBe(false);
      expect(fsm.canTransition(ExperienceState.Observing)).toBe(true);
    });
  });

  // ─── Transition Hooks ─────────────────────────────────────

  describe('transition hooks', () => {
    it('calls before hook on transition', () => {
      const calls: string[] = [];
      fsm.onBeforeTransition((from, to) => {
        calls.push(`before:${from}→${to}`);
      });
      fsm.transition(ExperienceState.Learning);
      expect(calls).toContain('before:Created→Learning');
    });

    it('calls after hook on transition', () => {
      const calls: string[] = [];
      fsm.onAfterTransition((from, to) => {
        calls.push(`after:${from}→${to}`);
      });
      fsm.transition(ExperienceState.Learning);
      expect(calls).toContain('after:Created→Learning');
    });

    it('calls hooks in order: before then after', () => {
      const order: string[] = [];
      fsm.onBeforeTransition(() => order.push('before'));
      fsm.onAfterTransition(() => order.push('after'));
      fsm.transition(ExperienceState.Learning);
      expect(order).toEqual(['before', 'after']);
    });

    it('supports multiple before hooks', () => {
      const calls: number[] = [];
      fsm.onBeforeTransition(() => calls.push(1));
      fsm.onBeforeTransition(() => calls.push(2));
      fsm.transition(ExperienceState.Learning);
      expect(calls).toEqual([1, 2]);
    });

    it('supports multiple after hooks', () => {
      const calls: number[] = [];
      fsm.onAfterTransition(() => calls.push(1));
      fsm.onAfterTransition(() => calls.push(2));
      fsm.transition(ExperienceState.Learning);
      expect(calls).toEqual([1, 2]);
    });
  });

  // ─── Full Transition Paths ────────────────────────────────

  describe('full transition paths', () => {
    it('path: Created → Learning → Observing → Adapting → Stable → Archived', () => {
      fsm.transition(ExperienceState.Learning);
      expect(fsm.currentState).toBe(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      expect(fsm.currentState).toBe(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      expect(fsm.currentState).toBe(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      expect(fsm.currentState).toBe(ExperienceState.Stable);
      fsm.transition(ExperienceState.Archived);
      expect(fsm.currentState).toBe(ExperienceState.Archived);
      expect(fsm.isTerminal).toBe(true);
    });

    it('path: Created → Learning → Observing → Adapting → Relearning → Learning', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Relearning);
      fsm.transition(ExperienceState.Learning);
      expect(fsm.currentState).toBe(ExperienceState.Learning);
    });

    it('path: Created → Learning → Observing → Adapting → Relearning → Observing', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Relearning);
      fsm.transition(ExperienceState.Observing);
      expect(fsm.currentState).toBe(ExperienceState.Observing);
    });

    it('path: Stable → Adapting → Relearning → Archived', () => {
      fsm.transition(ExperienceState.Learning);
      fsm.transition(ExperienceState.Observing);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Stable);
      fsm.transition(ExperienceState.Adapting);
      fsm.transition(ExperienceState.Relearning);
      fsm.transition(ExperienceState.Archived);
      expect(fsm.currentState).toBe(ExperienceState.Archived);
      expect(fsm.isTerminal).toBe(true);
    });

    it('full relearning loop: Created → Learning → Observing → Adapting → Stable → Relearning → Learning → Observing → Adapting → Stable', () => {
      const states: ExperienceState[] = [
        ExperienceState.Learning,
        ExperienceState.Observing,
        ExperienceState.Adapting,
        ExperienceState.Stable,
        ExperienceState.Relearning,
        ExperienceState.Learning,
        ExperienceState.Observing,
        ExperienceState.Adapting,
        ExperienceState.Stable,
      ];
      for (const s of states) {
        fsm.transition(s);
      }
      expect(fsm.currentState).toBe(ExperienceState.Stable);
      expect(fsm.getHistory()).toHaveLength(10); // 1 initial + 9 transitions
    });
  });
});
