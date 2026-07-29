import { describe, it, expect, beforeEach } from 'vitest';
import {
  TypedStateMachine,
  type StateMachine,
  type FSMDefinition,
} from '../core/fsm/state-machine.js';
import { createExecutionFSM } from '../core/fsm/execution-fsm.js';
import { ExecutionStatus } from '../core/pipeline/types.js';

describe('TypedStateMachine', () => {
  const simpleDef: FSMDefinition<string> = {
    initialState: 'A',
    transitions: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ],
    terminalStates: ['C'],
  };

  it('starts in initial state', () => {
    const fsm = new TypedStateMachine(simpleDef);
    expect(fsm.currentState).toBe('A');
  });

  it('transitions through valid path A → B → C', () => {
    const fsm = new TypedStateMachine(simpleDef);
    fsm.transition('B');
    expect(fsm.currentState).toBe('B');
    fsm.transition('C');
    expect(fsm.currentState).toBe('C');
  });

  it('rejects invalid transition A → C', () => {
    const fsm = new TypedStateMachine(simpleDef);
    expect(() => fsm.transition('C')).toThrow('not allowed');
  });

  it('rejects transition from terminal state C', () => {
    const fsm = new TypedStateMachine(simpleDef);
    fsm.transition('B');
    fsm.transition('C');
    expect(() => fsm.transition('A')).toThrow('terminal state');
    expect(fsm.isTerminal).toBe(true);
  });

  it('canTransition returns true for valid, false for invalid', () => {
    const fsm = new TypedStateMachine(simpleDef);
    expect(fsm.canTransition('B')).toBe(true);
    expect(fsm.canTransition('C')).toBe(false);
  });

  it('records history of all transitions', () => {
    const fsm = new TypedStateMachine(simpleDef);
    fsm.transition('B');
    fsm.transition('C');
    const history = fsm.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].state).toBe('A');
    expect(history[1].state).toBe('B');
    expect(history[2].state).toBe('C');
  });

  it('calls before/after hooks on transition', () => {
    const fsm = new TypedStateMachine(simpleDef);
    const beforeCalls: string[] = [];
    const afterCalls: string[] = [];
    fsm.onBeforeTransition((from, to) => beforeCalls.push(`${from}→${to}`));
    fsm.onAfterTransition((from, to) => afterCalls.push(`${from}→${to}`));
    fsm.transition('B');
    expect(beforeCalls).toEqual(['A→B']);
    expect(afterCalls).toEqual(['A→B']);
  });

  it('hooks do not break FSM when they throw', () => {
    const fsm = new TypedStateMachine(simpleDef);
    fsm.onBeforeTransition(() => { throw new Error('hook error'); });
    expect(() => fsm.transition('B')).not.toThrow();
    expect(fsm.currentState).toBe('B');
  });

  it('handles definition with no terminal states', () => {
    const def: FSMDefinition<string> = {
      initialState: 'X',
      transitions: [{ from: 'X', to: 'Y' }],
    };
    const fsm = new TypedStateMachine(def);
    expect(fsm.isTerminal).toBe(false);
    fsm.transition('Y');
    expect(fsm.isTerminal).toBe(false);
  });
});

describe('ExecutionFSM (createExecutionFSM)', () => {
  let fsm: StateMachine<ExecutionStatus>;

  beforeEach(() => {
    fsm = createExecutionFSM();
  });

  it('starts in Idle', () => {
    expect(fsm.currentState).toBe(ExecutionStatus.Idle);
    expect(fsm.isTerminal).toBe(false);
  });

  it('validates full happy path: Idle → Planning → Ready → Running → Completed', () => {
    fsm.transition(ExecutionStatus.Planning);
    expect(fsm.currentState).toBe(ExecutionStatus.Planning);

    fsm.transition(ExecutionStatus.Ready);
    expect(fsm.currentState).toBe(ExecutionStatus.Ready);

    fsm.transition(ExecutionStatus.Running);
    expect(fsm.currentState).toBe(ExecutionStatus.Running);

    fsm.transition(ExecutionStatus.Completed);
    expect(fsm.currentState).toBe(ExecutionStatus.Completed);
    expect(fsm.isTerminal).toBe(true);
  });

  it('validates failure path: Idle → Planning → Ready → Running → Failed', () => {
    fsm.transition(ExecutionStatus.Planning);
    fsm.transition(ExecutionStatus.Ready);
    fsm.transition(ExecutionStatus.Running);
    fsm.transition(ExecutionStatus.Failed);
    expect(fsm.currentState).toBe(ExecutionStatus.Failed);
    expect(fsm.isTerminal).toBe(true);
  });

  it('validates cancellation from Planning', () => {
    fsm.transition(ExecutionStatus.Planning);
    fsm.transition(ExecutionStatus.Cancelled);
    expect(fsm.currentState).toBe(ExecutionStatus.Cancelled);
    expect(fsm.isTerminal).toBe(true);
  });

  it('validates cancellation from Ready', () => {
    fsm.transition(ExecutionStatus.Planning);
    fsm.transition(ExecutionStatus.Ready);
    fsm.transition(ExecutionStatus.Cancelled);
    expect(fsm.currentState).toBe(ExecutionStatus.Cancelled);
    expect(fsm.isTerminal).toBe(true);
  });

  it('validates cancellation from Running', () => {
    fsm.transition(ExecutionStatus.Planning);
    fsm.transition(ExecutionStatus.Ready);
    fsm.transition(ExecutionStatus.Running);
    fsm.transition(ExecutionStatus.Cancelled);
    expect(fsm.currentState).toBe(ExecutionStatus.Cancelled);
    expect(fsm.isTerminal).toBe(true);
  });

  it('validates failure from Planning', () => {
    fsm.transition(ExecutionStatus.Planning);
    fsm.transition(ExecutionStatus.Failed);
    expect(fsm.currentState).toBe(ExecutionStatus.Failed);
    expect(fsm.isTerminal).toBe(true);
  });

  it('rejects Idle → Ready (skip Planning)', () => {
    expect(() => fsm.transition(ExecutionStatus.Ready)).toThrow('not allowed');
  });

  it('rejects Idle → Running (skip Planning + Ready)', () => {
    expect(() => fsm.transition(ExecutionStatus.Running)).toThrow('not allowed');
  });

  it('rejects Idle → Completed (skip everything)', () => {
    expect(() => fsm.transition(ExecutionStatus.Completed)).toThrow('not allowed');
  });

  it('rejects Planning → Completed (skip Ready + Running)', () => {
    fsm.transition(ExecutionStatus.Planning);
    expect(() => fsm.transition(ExecutionStatus.Completed)).toThrow('not allowed');
  });

  it('rejects transition from Completed (terminal)', () => {
    fsm.transition(ExecutionStatus.Planning);
    fsm.transition(ExecutionStatus.Ready);
    fsm.transition(ExecutionStatus.Running);
    fsm.transition(ExecutionStatus.Completed);
    expect(() => fsm.transition(ExecutionStatus.Idle)).toThrow('terminal state');
  });

  it('records full state history', () => {
    fsm.transition(ExecutionStatus.Planning);
    fsm.transition(ExecutionStatus.Ready);
    fsm.transition(ExecutionStatus.Running);
    fsm.transition(ExecutionStatus.Completed);
    const history = fsm.getHistory();
    expect(history).toHaveLength(5);
    expect(history.map(h => h.state)).toEqual([
      ExecutionStatus.Idle,
      ExecutionStatus.Planning,
      ExecutionStatus.Ready,
      ExecutionStatus.Running,
      ExecutionStatus.Completed,
    ]);
  });

  it('canTransition correctly identifies allowed transitions from each state', () => {
    expect(fsm.canTransition(ExecutionStatus.Planning)).toBe(true);
    expect(fsm.canTransition(ExecutionStatus.Ready)).toBe(false);
    expect(fsm.canTransition(ExecutionStatus.Running)).toBe(false);
    expect(fsm.canTransition(ExecutionStatus.Completed)).toBe(false);
    expect(fsm.canTransition(ExecutionStatus.Failed)).toBe(false);
    expect(fsm.canTransition(ExecutionStatus.Cancelled)).toBe(false);

    fsm.transition(ExecutionStatus.Planning);
    expect(fsm.canTransition(ExecutionStatus.Ready)).toBe(true);
    expect(fsm.canTransition(ExecutionStatus.Failed)).toBe(true);
    expect(fsm.canTransition(ExecutionStatus.Cancelled)).toBe(true);
    expect(fsm.canTransition(ExecutionStatus.Running)).toBe(false);

    fsm.transition(ExecutionStatus.Ready);
    expect(fsm.canTransition(ExecutionStatus.Running)).toBe(true);
    expect(fsm.canTransition(ExecutionStatus.Cancelled)).toBe(true);
    expect(fsm.canTransition(ExecutionStatus.Completed)).toBe(false);
  });
});
