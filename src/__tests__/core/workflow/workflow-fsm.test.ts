/**
 * Workflow Runtime — FSM Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWorkflowFSM,
  createStageFSM,
  getWorkflowFSMDefinition,
  getStageFSMDefinition,
} from '../../../core/workflow/workflow-fsm.js';

describe('WorkflowFSM', () => {
  it('should start in Draft state', () => {
    const fsm = createWorkflowFSM();
    expect(fsm.currentState).toBe('Draft');
  });

  it('should allow Draft → Ready', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    expect(fsm.currentState).toBe('Ready');
  });

  it('should allow Ready → Running', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    expect(fsm.currentState).toBe('Running');
  });

  it('should allow Running → Paused', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    expect(fsm.currentState).toBe('Paused');
  });

  it('should allow Paused → Running', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    fsm.transition('Running');
    expect(fsm.currentState).toBe('Running');
  });

  it('should allow Running → Completed', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.currentState).toBe('Completed');
  });

  it('should allow Running → Failed', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Failed');
    expect(fsm.currentState).toBe('Failed');
  });

  it('should allow Running → Cancelled', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Cancelled');
    expect(fsm.currentState).toBe('Cancelled');
  });

  it('should allow Paused → Cancelled', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    fsm.transition('Cancelled');
    expect(fsm.currentState).toBe('Cancelled');
  });

  it('should allow Paused → Failed', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    fsm.transition('Failed');
    expect(fsm.currentState).toBe('Failed');
  });

  it('should allow Ready → Failed', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Failed');
    expect(fsm.currentState).toBe('Failed');
  });

  it('should allow Paused → Ready (recovery)', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    fsm.transition('Ready');
    expect(fsm.currentState).toBe('Ready');
  });

  it('should allow Failed → Running (recovery)', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Failed');
    fsm.transition('Running');
    expect(fsm.currentState).toBe('Running');
  });

  // Invalid transitions
  it('should NOT allow Draft → Running', () => {
    const fsm = createWorkflowFSM();
    expect(() => fsm.transition('Running')).toThrow();
  });

  it('should NOT allow Draft → Completed', () => {
    const fsm = createWorkflowFSM();
    expect(() => fsm.transition('Completed')).toThrow();
  });

  it('should NOT allow Ready → Paused', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    expect(() => fsm.transition('Paused')).toThrow();
  });

  it('should NOT allow Ready → Completed', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    expect(() => fsm.transition('Completed')).toThrow();
  });

  it('should NOT allow Completed → Running', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(() => fsm.transition('Running')).toThrow();
  });

  it('should NOT allow Cancelled → Running', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Cancelled');
    expect(() => fsm.transition('Running')).toThrow();
  });

  // Terminal states
  it('Completed is terminal', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.isTerminal).toBe(true);
  });

  it('Cancelled is terminal', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Cancelled');
    expect(fsm.isTerminal).toBe(true);
  });

  it('Draft is not terminal', () => {
    const fsm = createWorkflowFSM();
    expect(fsm.isTerminal).toBe(false);
  });

  it('Running is not terminal', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    expect(fsm.isTerminal).toBe(false);
  });

  it('Paused is not terminal', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    expect(fsm.isTerminal).toBe(false);
  });

  // canTransition checks
  it('canTransition returns true for valid transition', () => {
    const fsm = createWorkflowFSM();
    expect(fsm.canTransition('Ready')).toBe(true);
  });

  it('canTransition returns false for invalid transition', () => {
    const fsm = createWorkflowFSM();
    expect(fsm.canTransition('Running')).toBe(false);
  });

  it('canTransition returns false from terminal state', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.canTransition('Running')).toBe(false);
  });

  // History
  it('records initial state in history', () => {
    const fsm = createWorkflowFSM();
    const history = fsm.getHistory();
    expect(history.length).toBe(1);
    expect(history[0]!.state).toBe('Draft');
  });

  it('records transitions in history', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    const history = fsm.getHistory();
    expect(history.length).toBe(3);
    expect(history[1]!.state).toBe('Ready');
    expect(history[2]!.state).toBe('Running');
  });

  it('history entries have timestamps', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    const history = fsm.getHistory();
    for (const entry of history) {
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe('string');
    }
  });

  // Hooks
  it('calls before hooks on transition', () => {
    const fsm = createWorkflowFSM();
    const hook = vi.fn();
    fsm.onBeforeTransition(hook);
    fsm.transition('Ready');
    expect(hook).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledWith('Draft', 'Ready');
  });

  it('calls after hooks on transition', () => {
    const fsm = createWorkflowFSM();
    const hook = vi.fn();
    fsm.onAfterTransition(hook);
    fsm.transition('Ready');
    expect(hook).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledWith('Draft', 'Ready');
  });

  it('does not break FSM when before hook throws', () => {
    const fsm = createWorkflowFSM();
    fsm.onBeforeTransition(() => { throw new Error('hook error'); });
    fsm.transition('Ready');
    expect(fsm.currentState).toBe('Ready');
  });

  it('does not break FSM when after hook throws', () => {
    const fsm = createWorkflowFSM();
    fsm.onAfterTransition(() => { throw new Error('hook error'); });
    fsm.transition('Ready');
    expect(fsm.currentState).toBe('Ready');
  });

  it('supports multiple before hooks', () => {
    const fsm = createWorkflowFSM();
    const hook1 = vi.fn();
    const hook2 = vi.fn();
    fsm.onBeforeTransition(hook1);
    fsm.onBeforeTransition(hook2);
    fsm.transition('Ready');
    expect(hook1).toHaveBeenCalledTimes(1);
    expect(hook2).toHaveBeenCalledTimes(1);
  });

  it('supports multiple after hooks', () => {
    const fsm = createWorkflowFSM();
    const hook1 = vi.fn();
    const hook2 = vi.fn();
    fsm.onAfterTransition(hook1);
    fsm.onAfterTransition(hook2);
    fsm.transition('Ready');
    expect(hook1).toHaveBeenCalledTimes(1);
    expect(hook2).toHaveBeenCalledTimes(1);
  });

  // Definition
  it('getWorkflowFSMDefinition returns correct initialState', () => {
    const def = getWorkflowFSMDefinition();
    expect(def.initialState).toBe('Draft');
  });

  it('getWorkflowFSMDefinition includes terminal states', () => {
    const def = getWorkflowFSMDefinition();
    expect(def.terminalStates).toContain('Completed');
    expect(def.terminalStates).toContain('Cancelled');
  });

  it('getWorkflowFSMDefinition has all transitions', () => {
    const def = getWorkflowFSMDefinition();
    expect(def.transitions.length).toBe(12);
  });

  // Full lifecycle
  it('supports full Draft → Ready → Running → Paused → Running → Completed', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.currentState).toBe('Completed');
    expect(fsm.isTerminal).toBe(true);
    expect(fsm.getHistory().length).toBe(6);
  });

  it('supports Failed → Running → Completed', () => {
    const fsm = createWorkflowFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Failed');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.currentState).toBe('Completed');
  });
});

describe('StageFSM', () => {
  it('should start in Pending state', () => {
    const fsm = createStageFSM();
    expect(fsm.currentState).toBe('Pending');
  });

  it('should allow Pending → Ready', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    expect(fsm.currentState).toBe('Ready');
  });

  it('should allow Ready → Running', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    expect(fsm.currentState).toBe('Running');
  });

  it('should allow Running → Paused', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    expect(fsm.currentState).toBe('Paused');
  });

  it('should allow Paused → Running', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    fsm.transition('Running');
    expect(fsm.currentState).toBe('Running');
  });

  it('should allow Running → Completed', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.currentState).toBe('Completed');
  });

  it('should allow Running → Failed', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Failed');
    expect(fsm.currentState).toBe('Failed');
  });

  it('should allow Running → Cancelled', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Cancelled');
    expect(fsm.currentState).toBe('Cancelled');
  });

  it('should allow Paused → Cancelled', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    fsm.transition('Cancelled');
    expect(fsm.currentState).toBe('Cancelled');
  });

  it('should allow Paused → Failed', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Paused');
    fsm.transition('Failed');
    expect(fsm.currentState).toBe('Failed');
  });

  it('should allow Ready → Skipped', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Skipped');
    expect(fsm.currentState).toBe('Skipped');
  });

  it('should allow Pending → Skipped', () => {
    const fsm = createStageFSM();
    fsm.transition('Skipped');
    expect(fsm.currentState).toBe('Skipped');
  });

  it('should allow Failed → Running (retry)', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Failed');
    fsm.transition('Running');
    expect(fsm.currentState).toBe('Running');
  });

  // Invalid stage transitions
  it('should NOT allow Pending → Running', () => {
    const fsm = createStageFSM();
    expect(() => fsm.transition('Running')).toThrow();
  });

  it('should NOT allow Pending → Completed', () => {
    const fsm = createStageFSM();
    expect(() => fsm.transition('Completed')).toThrow();
  });

  it('should NOT allow Ready → Completed', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    expect(() => fsm.transition('Completed')).toThrow();
  });

  it('should NOT allow Completed → Running', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(() => fsm.transition('Running')).toThrow();
  });

  it('should NOT allow Skipped → Running', () => {
    const fsm = createStageFSM();
    fsm.transition('Skipped');
    expect(() => fsm.transition('Running')).toThrow();
  });

  // Terminal states
  it('Completed is terminal', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.isTerminal).toBe(true);
  });

  it('Failed is not terminal (supports retry via Failed → Running)', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Failed');
    expect(fsm.isTerminal).toBe(false);
    expect(fsm.canTransition('Running')).toBe(true);
  });

  it('Skipped is terminal', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Skipped');
    expect(fsm.isTerminal).toBe(true);
  });

  it('Cancelled is terminal', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Cancelled');
    expect(fsm.isTerminal).toBe(true);
  });

  it('Pending is not terminal', () => {
    const fsm = createStageFSM();
    expect(fsm.isTerminal).toBe(false);
  });

  // canTransition
  it('canTransition returns true for Pending → Ready', () => {
    const fsm = createStageFSM();
    expect(fsm.canTransition('Ready')).toBe(true);
  });

  it('canTransition returns true for Pending → Skipped', () => {
    const fsm = createStageFSM();
    expect(fsm.canTransition('Skipped')).toBe(true);
  });

  it('canTransition returns false for Pending → Running', () => {
    const fsm = createStageFSM();
    expect(fsm.canTransition('Running')).toBe(false);
  });

  // History
  it('records stage state transitions in history', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Completed');
    const history = fsm.getHistory();
    expect(history.length).toBe(4);
    expect(history[0]!.state).toBe('Pending');
    expect(history[1]!.state).toBe('Ready');
    expect(history[2]!.state).toBe('Running');
    expect(history[3]!.state).toBe('Completed');
  });

  // Hooks
  it('calls before hooks on stage transition', () => {
    const fsm = createStageFSM();
    const hook = vi.fn();
    fsm.onBeforeTransition(hook);
    fsm.transition('Ready');
    expect(hook).toHaveBeenCalledWith('Pending', 'Ready');
  });

  it('calls after hooks on stage transition', () => {
    const fsm = createStageFSM();
    const hook = vi.fn();
    fsm.onAfterTransition(hook);
    fsm.transition('Ready');
    expect(hook).toHaveBeenCalledWith('Pending', 'Ready');
  });

  // Definition
  it('getStageFSMDefinition returns correct initialState', () => {
    const def = getStageFSMDefinition();
    expect(def.initialState).toBe('Pending');
  });

  it('getStageFSMDefinition includes 3 terminal states (Failed allows retry)', () => {
    const def = getStageFSMDefinition();
    expect(def.terminalStates).toHaveLength(3);
    expect(def.terminalStates).toContain('Completed');
    expect(def.terminalStates).toContain('Skipped');
    expect(def.terminalStates).toContain('Cancelled');
    // Failed is NOT terminal — supports Failed → Running retry transition
  });

  it('getStageFSMDefinition has all transitions', () => {
    const def = getStageFSMDefinition();
    expect(def.transitions.length).toBe(12);
  });

  // Retry lifecycle
  it('supports retry: Running → Failed → Running → Completed', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Failed');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.currentState).toBe('Completed');
    expect(fsm.getHistory().length).toBe(6);
  });

  // Multiple retries
  it('supports multiple retries', () => {
    const fsm = createStageFSM();
    fsm.transition('Ready');
    fsm.transition('Running');
    fsm.transition('Failed');
    fsm.transition('Running');
    fsm.transition('Failed');
    fsm.transition('Running');
    fsm.transition('Completed');
    expect(fsm.currentState).toBe('Completed');
    expect(fsm.getHistory().length).toBe(8);
  });
});
