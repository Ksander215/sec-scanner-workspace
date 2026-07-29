/**
 * Tool Lifecycle FSM Tests
 */
import { describe, it, expect } from 'vitest';
import { createToolLifecycleFSM, getToolLifecycleDefinition } from '../core/tool/tool-lifecycle.js';
import { ToolLifecycleState } from '../core/tool/types.js';

describe('Tool Lifecycle FSM', () => {
  it('should start in Registered state', () => {
    const fsm = createToolLifecycleFSM();
    expect(fsm.currentState).toBe(ToolLifecycleState.Registered);
  });

  it('should transition Registered → Validated', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    expect(fsm.currentState).toBe(ToolLifecycleState.Validated);
  });

  it('should transition Validated → Loaded', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    expect(fsm.currentState).toBe(ToolLifecycleState.Loaded);
  });

  it('should transition Loaded → Ready', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    fsm.transition(ToolLifecycleState.Ready);
    expect(fsm.currentState).toBe(ToolLifecycleState.Ready);
  });

  it('should transition Ready → Executing', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    fsm.transition(ToolLifecycleState.Ready);
    fsm.transition(ToolLifecycleState.Executing);
    expect(fsm.currentState).toBe(ToolLifecycleState.Executing);
  });

  it('should transition Executing → Completed', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    fsm.transition(ToolLifecycleState.Ready);
    fsm.transition(ToolLifecycleState.Executing);
    fsm.transition(ToolLifecycleState.Completed);
    expect(fsm.currentState).toBe(ToolLifecycleState.Completed);
  });

  it('should transition Completed → Ready (re-execute)', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    fsm.transition(ToolLifecycleState.Ready);
    fsm.transition(ToolLifecycleState.Executing);
    fsm.transition(ToolLifecycleState.Completed);
    fsm.transition(ToolLifecycleState.Ready);
    expect(fsm.currentState).toBe(ToolLifecycleState.Ready);
  });

  it('should transition Completed → Disposed', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    fsm.transition(ToolLifecycleState.Ready);
    fsm.transition(ToolLifecycleState.Executing);
    fsm.transition(ToolLifecycleState.Completed);
    fsm.transition(ToolLifecycleState.Disposed);
    expect(fsm.isTerminal).toBe(true);
  });

  it('should transition to Failed from any non-terminal state', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Failed);
    expect(fsm.isTerminal).toBe(true);
  });

  it('should reject invalid transition Registered → Ready', () => {
    const fsm = createToolLifecycleFSM();
    expect(() => fsm.transition(ToolLifecycleState.Ready)).toThrow();
  });

  it('should reject transition from terminal state', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Failed);
    expect(() => fsm.transition(ToolLifecycleState.Ready)).toThrow();
  });

  it('should reject transition from terminal Disposed state', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    fsm.transition(ToolLifecycleState.Ready);
    fsm.transition(ToolLifecycleState.Disposed);
    expect(() => fsm.transition(ToolLifecycleState.Ready)).toThrow();
  });

  it('canTransition should return correct values', () => {
    const fsm = createToolLifecycleFSM();
    expect(fsm.canTransition(ToolLifecycleState.Validated)).toBe(true);
    expect(fsm.canTransition(ToolLifecycleState.Executing)).toBe(false);
  });

  it('should record history', () => {
    const fsm = createToolLifecycleFSM();
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    const history = fsm.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].state).toBe(ToolLifecycleState.Registered);
    expect(history[1].state).toBe(ToolLifecycleState.Validated);
    expect(history[2].state).toBe(ToolLifecycleState.Loaded);
  });

  it('should have correct terminal states', () => {
    const def = getToolLifecycleDefinition();
    expect(def.terminalStates).toContain(ToolLifecycleState.Disposed);
    expect(def.terminalStates).toContain(ToolLifecycleState.Failed);
  });

  it('should support transition hooks', () => {
    const fsm = createToolLifecycleFSM();
    const transitions: string[] = [];
    fsm.onAfterTransition((from, to) => {
      transitions.push(`${from}→${to}`);
    });
    fsm.transition(ToolLifecycleState.Validated);
    fsm.transition(ToolLifecycleState.Loaded);
    expect(transitions).toEqual(['registered→validated', 'validated→loaded']);
  });
});
