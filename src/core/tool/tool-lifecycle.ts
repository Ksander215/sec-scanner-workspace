/**
 * Tool Lifecycle FSM — State machine for tool lifecycle management.
 *
 * Conforms to: AIS-003C.000 Requirement #8 (Tool Lifecycle)
 *
 * States:
 *   Registered → Validated → Loaded → Ready → Executing → Completed → Disposed
 *                                                              ↘ Failed
 *
 * Invalid transitions are rejected.
 */
import { ToolLifecycleState } from './types.js';
import type { StateMachine, FSMDefinition } from '../fsm/state-machine.js';
import { TypedStateMachine } from '../fsm/state-machine.js';

const TOOL_LIFECYCLE_FSM_DEFINITION: FSMDefinition<ToolLifecycleState> = {
  initialState: ToolLifecycleState.Registered,
  terminalStates: [
    ToolLifecycleState.Disposed,
    ToolLifecycleState.Failed,
  ],
  transitions: [
    // Registration flow
    { from: ToolLifecycleState.Registered, to: ToolLifecycleState.Validated },
    { from: ToolLifecycleState.Registered, to: ToolLifecycleState.Failed },
    // Validation flow
    { from: ToolLifecycleState.Validated, to: ToolLifecycleState.Loaded },
    { from: ToolLifecycleState.Validated, to: ToolLifecycleState.Failed },
    // Loading flow
    { from: ToolLifecycleState.Loaded, to: ToolLifecycleState.Ready },
    { from: ToolLifecycleState.Loaded, to: ToolLifecycleState.Failed },
    // Execution flow
    { from: ToolLifecycleState.Ready, to: ToolLifecycleState.Executing },
    { from: ToolLifecycleState.Ready, to: ToolLifecycleState.Disposed },
    // Post-execution flow
    { from: ToolLifecycleState.Executing, to: ToolLifecycleState.Completed },
    { from: ToolLifecycleState.Executing, to: ToolLifecycleState.Failed },
    { from: ToolLifecycleState.Executing, to: ToolLifecycleState.Ready },
    // Post-completion flow
    { from: ToolLifecycleState.Completed, to: ToolLifecycleState.Ready },
    { from: ToolLifecycleState.Completed, to: ToolLifecycleState.Disposed },
  ],
};

/**
 * Create a new Tool Lifecycle FSM starting at Registered state.
 */
export function createToolLifecycleFSM(): StateMachine<ToolLifecycleState> {
  return new TypedStateMachine(TOOL_LIFECYCLE_FSM_DEFINITION);
}

/**
 * Get the FSM definition for testing/validation.
 */
export function getToolLifecycleDefinition(): FSMDefinition<ToolLifecycleState> {
  return TOOL_LIFECYCLE_FSM_DEFINITION;
}
