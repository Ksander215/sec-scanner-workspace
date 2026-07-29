/**
 * Execution FSM — State Machine for the AIS Execution Pipeline.
 *
 * Conforms to: AIS-003B.000 Requirement #6
 *   Idle → Planning → Ready → Running → Completed / Failed / Cancelled
 *
 * Valid transitions:
 *   Idle        → Planning
 *   Planning    → Ready | Failed | Cancelled
 *   Ready       → Running | Cancelled
 *   Running     → Completed | Failed | Cancelled
 *   Completed   → (terminal)
 *   Failed      → (terminal)
 *   Cancelled   → (terminal)
 */
import { TypedStateMachine, type StateMachine, type FSMDefinition } from './state-machine.js';
import { ExecutionStatus } from '../pipeline/types.js';

const EXECUTION_FSM_DEFINITION: FSMDefinition<ExecutionStatus> = {
  initialState: ExecutionStatus.Idle,
  terminalStates: [
    ExecutionStatus.Completed,
    ExecutionStatus.Failed,
    ExecutionStatus.Cancelled,
  ],
  transitions: [
    { from: ExecutionStatus.Idle, to: ExecutionStatus.Planning },
    { from: ExecutionStatus.Planning, to: ExecutionStatus.Ready },
    { from: ExecutionStatus.Planning, to: ExecutionStatus.Failed },
    { from: ExecutionStatus.Planning, to: ExecutionStatus.Cancelled },
    { from: ExecutionStatus.Ready, to: ExecutionStatus.Running },
    { from: ExecutionStatus.Ready, to: ExecutionStatus.Cancelled },
    { from: ExecutionStatus.Running, to: ExecutionStatus.Completed },
    { from: ExecutionStatus.Running, to: ExecutionStatus.Failed },
    { from: ExecutionStatus.Running, to: ExecutionStatus.Cancelled },
  ],
};

export function createExecutionFSM(): StateMachine<ExecutionStatus> {
  return new TypedStateMachine(EXECUTION_FSM_DEFINITION);
}

export { ExecutionStatus };
