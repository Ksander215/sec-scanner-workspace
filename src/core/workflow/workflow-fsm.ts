/**
 * Workflow Runtime — FSM Definitions
 * TASK-AIS-003H.000
 *
 * State machine definitions for:
 *   - Workflow lifecycle FSM
 *   - Stage lifecycle FSM
 *
 * Uses the generic TypedStateMachine from src/core/fsm/state-machine.ts
 *
 * Conforms to: DOM-002.000 §4 (FSM Definitions)
 */

import type { FSMDefinition } from '../fsm/state-machine.js';
import type { TypedStateMachine } from '../fsm/state-machine.js';
import { TypedStateMachine as FSM } from '../fsm/state-machine.js';

// ═══════════════════════════════════════════════════════════════════
// WORKFLOW FSM
// ═══════════════════════════════════════════════════════════════════
// States: Draft → Ready → Running ↔ Paused → Completed | Failed | Cancelled
// Terminal: Completed, Failed, Cancelled

const WORKFLOW_FSM_DEFINITION: FSMDefinition<WorkflowFSMState> = {
  initialState: 'Draft',
  terminalStates: ['Completed', 'Cancelled'],
  transitions: [
    // Draft → Ready (validation/initialization)
    { from: 'Draft', to: 'Ready' },
    // Ready → Running (start execution)
    { from: 'Ready', to: 'Running' },
    // Running → Paused (pause)
    { from: 'Running', to: 'Paused' },
    // Paused → Running (resume)
    { from: 'Paused', to: 'Running' },
    // Running → Completed (success)
    { from: 'Running', to: 'Completed' },
    // Running → Failed (error)
    { from: 'Running', to: 'Failed' },
    // Running → Cancelled (cancellation)
    { from: 'Running', to: 'Cancelled' },
    // Paused → Cancelled (cancellation while paused)
    { from: 'Paused', to: 'Cancelled' },
    // Paused → Failed (failure while paused / recovery failed)
    { from: 'Paused', to: 'Failed' },
    // Ready → Failed (failure during initialization)
    { from: 'Ready', to: 'Failed' },
    // Recovery transitions
    { from: 'Failed', to: 'Running' },
    { from: 'Paused', to: 'Ready' },
  ],
};

export type WorkflowFSMState =
  | 'Draft'
  | 'Ready'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

/**
 * Get the workflow FSM definition.
 */
export function getWorkflowFSMDefinition(): FSMDefinition<WorkflowFSMState> {
  return WORKFLOW_FSM_DEFINITION;
}

/**
 * Create a new Workflow FSM instance.
 */
export function createWorkflowFSM(): TypedStateMachine<WorkflowFSMState> {
  return new FSM(WORKFLOW_FSM_DEFINITION);
}

// ═══════════════════════════════════════════════════════════════════
// STAGE FSM
// ═══════════════════════════════════════════════════════════════════
// States: Pending → Ready → Running ↔ Paused → Completed | Failed | Skipped | Cancelled
// Terminal: Completed, Failed, Skipped, Cancelled

const STAGE_FSM_DEFINITION: FSMDefinition<StageFSMState> = {
  initialState: 'Pending',
  terminalStates: ['Completed', 'Skipped', 'Cancelled'],
  transitions: [
    // Pending → Ready
    { from: 'Pending', to: 'Ready' },
    // Ready → Running
    { from: 'Ready', to: 'Running' },
    // Running → Paused
    { from: 'Running', to: 'Paused' },
    // Paused → Running
    { from: 'Paused', to: 'Running' },
    // Running → Completed
    { from: 'Running', to: 'Completed' },
    // Running → Failed
    { from: 'Running', to: 'Failed' },
    // Running → Cancelled
    { from: 'Running', to: 'Cancelled' },
    // Paused → Cancelled
    { from: 'Paused', to: 'Cancelled' },
    // Paused → Failed
    { from: 'Paused', to: 'Failed' },
    // Ready → Skipped (condition not met)
    { from: 'Ready', to: 'Skipped' },
    // Pending → Skipped (dependency failed)
    { from: 'Pending', to: 'Skipped' },
    // Failed → Running (retry)
    { from: 'Failed', to: 'Running' },
  ],
};

export type StageFSMState =
  | 'Pending'
  | 'Ready'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Failed'
  | 'Skipped'
  | 'Cancelled';

/**
 * Get the stage FSM definition.
 */
export function getStageFSMDefinition(): FSMDefinition<StageFSMState> {
  return STAGE_FSM_DEFINITION;
}

/**
 * Create a new Stage FSM instance.
 */
export function createStageFSM(): TypedStateMachine<StageFSMState> {
  return new FSM(STAGE_FSM_DEFINITION);
}
