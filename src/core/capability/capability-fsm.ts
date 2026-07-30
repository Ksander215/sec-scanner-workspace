/**
 * Capability FSM — State Machine Definition
 * TASK-AIS-003G.000
 *
 * Lifecycle states for Capability Packs:
 *   Registered → Validated → Loaded → Initialized → Active
 *                                                   ↕
 *                                               Suspended
 *   Any non-Active/Initialized → Disabled
 *   Disabled/Active → Removed
 *
 * Invalid transitions are rejected by the FSM framework.
 */
import type { FSMDefinition, StateMachine } from '../fsm/state-machine.js';
import { TypedStateMachine } from '../fsm/state-machine.js';
import { CapabilityState } from './types.js';

export const CAPABILITY_FSM_DEFINITION: FSMDefinition<CapabilityState> = {
  initialState: CapabilityState.Registered,
  terminalStates: [
    CapabilityState.Removed,
  ],
  transitions: [
    // Installation flow
    { from: CapabilityState.Registered, to: CapabilityState.Validated },
    { from: CapabilityState.Registered, to: CapabilityState.Disabled },
    { from: CapabilityState.Registered, to: CapabilityState.Removed },
    // Validation flow
    { from: CapabilityState.Validated, to: CapabilityState.Loaded },
    { from: CapabilityState.Validated, to: CapabilityState.Disabled },
    { from: CapabilityState.Validated, to: CapabilityState.Removed },
    // Loading flow
    { from: CapabilityState.Loaded, to: CapabilityState.Initialized },
    { from: CapabilityState.Loaded, to: CapabilityState.Disabled },
    { from: CapabilityState.Loaded, to: CapabilityState.Removed },
    // Initialization flow
    { from: CapabilityState.Initialized, to: CapabilityState.Active },
    { from: CapabilityState.Initialized, to: CapabilityState.Disabled },
    { from: CapabilityState.Initialized, to: CapabilityState.Removed },
    // Active flow
    { from: CapabilityState.Active, to: CapabilityState.Suspended },
    { from: CapabilityState.Active, to: CapabilityState.Disabled },
    { from: CapabilityState.Active, to: CapabilityState.Removed },
    // Suspension flow
    { from: CapabilityState.Suspended, to: CapabilityState.Active },
    { from: CapabilityState.Suspended, to: CapabilityState.Disabled },
    { from: CapabilityState.Suspended, to: CapabilityState.Removed },
  ],
};

/**
 * Create a new Capability FSM starting at Registered state.
 */
export function createCapabilityFSM(): StateMachine<CapabilityState> {
  return new TypedStateMachine(CAPABILITY_FSM_DEFINITION);
}

/**
 * Get the FSM definition for testing/validation.
 */
export function getCapabilityFSMDefinition(): FSMDefinition<CapabilityState> {
  return CAPABILITY_FSM_DEFINITION;
}
