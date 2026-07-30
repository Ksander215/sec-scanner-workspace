/**
 * Cognitive FSM Tests — TASK-AIS-003I.000
 *
 * Comprehensive tests for the Cognitive Runtime FSM definition and
 * the TypedStateMachine wired to it.
 *
 * FSM: Created → Initialized → Ready → Processing ↔ Streaming
 *                                          → WaitingTool
 *                                          → WaitingWorkflow
 *                                          → Completed → Disposed
 *         Ready → Disposed (direct disposal)
 */

import { createCognitiveFSM } from '../../../core/cognitive/cognitive-fsm.js';
import { TypedStateMachine } from '../../../core/fsm/state-machine.js';
import { CognitiveState } from '../../../core/cognitive/types.js';

// ─── FSM Definition Tests ───────────────────────────────────────

describe('createCognitiveFSM', () => {
  it('returns an FSMDefinition with initialState Created', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.initialState).toBe(CognitiveState.Created);
  });

  it('has terminal states containing Disposed', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.terminalStates).toContain(CognitiveState.Disposed);
  });

  it('has exactly 1 terminal state', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.terminalStates).toHaveLength(1);
  });

  it('has a non-empty transitions array', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toBeDefined();
    expect(fsm.transitions.length).toBeGreaterThan(0);
  });

  // ─── All declared transitions ────────────────────────────────

  it('has Created → Initialized transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Created, to: CognitiveState.Initialized });
  });

  it('has Initialized → Ready transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Initialized, to: CognitiveState.Ready });
  });

  it('has Ready → Processing transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Ready, to: CognitiveState.Processing });
  });

  it('has Processing → Streaming transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Processing, to: CognitiveState.Streaming });
  });

  it('has Streaming → Processing transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Streaming, to: CognitiveState.Processing });
  });

  it('has Processing → WaitingTool transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Processing, to: CognitiveState.WaitingTool });
  });

  it('has WaitingTool → Processing transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.WaitingTool, to: CognitiveState.Processing });
  });

  it('has Processing → WaitingWorkflow transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Processing, to: CognitiveState.WaitingWorkflow });
  });

  it('has WaitingWorkflow → Processing transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.WaitingWorkflow, to: CognitiveState.Processing });
  });

  it('has Processing → Completed transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Processing, to: CognitiveState.Completed });
  });

  it('has Streaming → Completed transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Streaming, to: CognitiveState.Completed });
  });

  it('has Completed → Ready transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Completed, to: CognitiveState.Ready });
  });

  it('has Completed → Disposed transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Completed, to: CognitiveState.Disposed });
  });

  it('has Ready → Disposed transition', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toContainEqual({ from: CognitiveState.Ready, to: CognitiveState.Disposed });
  });

  it('has exactly 14 transitions', () => {
    const fsm = createCognitiveFSM();
    expect(fsm.transitions).toHaveLength(14);
  });
});

// ─── TypedStateMachine wired to CognitiveFSM ───────────────────

describe('TypedStateMachine with CognitiveFSM', () => {
  let fsm: InstanceType<typeof TypedStateMachine<CognitiveState>>;

  beforeEach(() => {
    fsm = new TypedStateMachine(createCognitiveFSM());
  });

  // ─── Initial state ──────────────────────────────────────────

  it('starts in Created state', () => {
    expect(fsm.currentState).toBe(CognitiveState.Created);
  });

  it('isTerminal is false when not disposed', () => {
    expect(fsm.isTerminal).toBe(false);
  });

  it('history has initial entry', () => {
    expect(fsm.getHistory().length).toBe(1);
    expect(fsm.getHistory()[0]!.state).toBe(CognitiveState.Created);
  });

  // ─── Happy path: Created → Initialized → Ready → Processing → Streaming → Completed → Disposed ──

  it('transitions Created → Initialized', () => {
    fsm.transition(CognitiveState.Initialized);
    expect(fsm.currentState).toBe(CognitiveState.Initialized);
  });

  it('transitions Initialized → Ready', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    expect(fsm.currentState).toBe(CognitiveState.Ready);
  });

  it('transitions Ready → Processing', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    expect(fsm.currentState).toBe(CognitiveState.Processing);
  });

  it('transitions Processing → Streaming', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.Streaming);
    expect(fsm.currentState).toBe(CognitiveState.Streaming);
  });

  it('transitions Streaming → Completed', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.Streaming);
    fsm.transition(CognitiveState.Completed);
    expect(fsm.currentState).toBe(CognitiveState.Completed);
  });

  it('transitions Completed → Disposed', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.Completed);
    fsm.transition(CognitiveState.Disposed);
    expect(fsm.currentState).toBe(CognitiveState.Disposed);
    expect(fsm.isTerminal).toBe(true);
  });

  // ─── Full lifecycle path ────────────────────────────────────

  it('completes full lifecycle Created → Initialized → Ready → Processing → Streaming → Completed → Disposed', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.Streaming);
    fsm.transition(CognitiveState.Completed);
    fsm.transition(CognitiveState.Disposed);

    expect(fsm.isTerminal).toBe(true);
    expect(fsm.getHistory().length).toBe(7); // initial + 6 transitions
  });

  // ─── Processing → WaitingTool → Processing ──────────────────

  it('transitions Processing → WaitingTool → Processing', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.WaitingTool);
    expect(fsm.currentState).toBe(CognitiveState.WaitingTool);
    fsm.transition(CognitiveState.Processing);
    expect(fsm.currentState).toBe(CognitiveState.Processing);
  });

  // ─── Processing → WaitingWorkflow → Processing ───────────────

  it('transitions Processing → WaitingWorkflow → Processing', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.WaitingWorkflow);
    expect(fsm.currentState).toBe(CognitiveState.WaitingWorkflow);
    fsm.transition(CognitiveState.Processing);
    expect(fsm.currentState).toBe(CognitiveState.Processing);
  });

  // ─── Streaming → Processing (cycle back) ──────────────────────

  it('transitions Processing → Streaming → Processing (cycle)', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.Streaming);
    expect(fsm.currentState).toBe(CognitiveState.Streaming);
    fsm.transition(CognitiveState.Processing);
    expect(fsm.currentState).toBe(CognitiveState.Processing);
  });

  // ─── Completed → Ready (re-enter ready) ───────────────────────

  it('transitions Processing → Completed → Ready', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.Completed);
    fsm.transition(CognitiveState.Ready);
    expect(fsm.currentState).toBe(CognitiveState.Ready);
  });

  // ─── Direct disposal from Ready ──────────────────────────────

  it('transitions Ready → Disposed (direct disposal)', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Disposed);
    expect(fsm.currentState).toBe(CognitiveState.Disposed);
    expect(fsm.isTerminal).toBe(true);
  });

  // ─── canTransition checks ────────────────────────────────────

  it('canTransition returns true for valid transitions from Created', () => {
    expect(fsm.canTransition(CognitiveState.Initialized)).toBe(true);
  });

  it('canTransition returns false for invalid transitions from Created', () => {
    expect(fsm.canTransition(CognitiveState.Processing)).toBe(false);
    expect(fsm.canTransition(CognitiveState.Ready)).toBe(false);
    expect(fsm.canTransition(CognitiveState.Disposed)).toBe(false);
  });

  it('canTransition returns false from terminal state Disposed', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.Completed);
    fsm.transition(CognitiveState.Disposed);
    expect(fsm.canTransition(CognitiveState.Ready)).toBe(false);
    expect(fsm.canTransition(CognitiveState.Created)).toBe(false);
  });

  it('canTransition Ready → Disposed returns true', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    expect(fsm.canTransition(CognitiveState.Disposed)).toBe(true);
  });

  // ─── Invalid transitions throw ────────────────────────────────

  it('throws on invalid transition Created → Processing', () => {
    expect(() => fsm.transition(CognitiveState.Processing)).toThrow();
  });

  it('throws on invalid transition Ready → Created', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    expect(() => fsm.transition(CognitiveState.Created)).toThrow();
  });

  it('throws on invalid transition Processing → Ready', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    expect(() => fsm.transition(CognitiveState.Ready)).toThrow();
  });

  it('throws on invalid transition WaitingTool → WaitingWorkflow', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.WaitingTool);
    expect(() => fsm.transition(CognitiveState.WaitingWorkflow)).toThrow();
  });

  it('throws on invalid transition WaitingWorkflow → Streaming', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.WaitingWorkflow);
    expect(() => fsm.transition(CognitiveState.Streaming)).toThrow();
  });

  // ─── Terminal state blocks transitions ───────────────────────

  it('throws on any transition from Disposed', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    fsm.transition(CognitiveState.Processing);
    fsm.transition(CognitiveState.Completed);
    fsm.transition(CognitiveState.Disposed);

    expect(() => fsm.transition(CognitiveState.Ready)).toThrow('Cannot transition from terminal state');
    expect(() => fsm.transition(CognitiveState.Created)).toThrow('Cannot transition from terminal state');
    expect(() => fsm.transition(CognitiveState.Processing)).toThrow('Cannot transition from terminal state');
  });

  // ─── History recording ───────────────────────────────────────

  it('records history for each transition', () => {
    fsm.transition(CognitiveState.Initialized);
    fsm.transition(CognitiveState.Ready);
    const history = fsm.getHistory();
    expect(history.length).toBe(3); // initial + 2 transitions
    expect(history[0]!.state).toBe(CognitiveState.Created);
    expect(history[1]!.state).toBe(CognitiveState.Initialized);
    expect(history[2]!.state).toBe(CognitiveState.Ready);
  });

  it('history entries have timestamps', () => {
    fsm.transition(CognitiveState.Initialized);
    const history = fsm.getHistory();
    for (const entry of history) {
      expect(entry.timestamp).toBeTruthy();
      expect(typeof entry.timestamp).toBe('string');
    }
  });

  // ─── Transition hooks ────────────────────────────────────────

  it('fires before and after transition hooks', () => {
    const beforeCalls: string[] = [];
    const afterCalls: string[] = [];

    fsm.onBeforeTransition((from, to) => {
      beforeCalls.push(`${from}→${to}`);
    });
    fsm.onAfterTransition((from, to) => {
      afterCalls.push(`${from}→${to}`);
    });

    fsm.transition(CognitiveState.Initialized);

    expect(beforeCalls).toEqual([`Created→Initialized`]);
    expect(afterCalls).toEqual([`Created→Initialized`]);
  });

  it('does not break FSM when hook throws', () => {
    fsm.onBeforeTransition(() => {
      throw new Error('hook error');
    });

    expect(() => fsm.transition(CognitiveState.Initialized)).not.toThrow();
    expect(fsm.currentState).toBe(CognitiveState.Initialized);
  });
});
