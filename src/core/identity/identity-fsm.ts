/**
 * Identity FSM — State Machine Definition
 * TASK-AIS-003F.000
 *
 * Conforms to: ADR-001 (Modular Monolith)
 *
 * States:
 *   Created → Configured → Active
 *                              ↘ Suspended ↔ Active
 *   Any non-terminal → Archived
 *
 * Invalid transitions are rejected by the FSM framework.
 */
import type { FSMDefinition, StateMachine } from '../fsm/state-machine.js';
import { TypedStateMachine } from '../fsm/state-machine.js';
import { IdentityState } from './identity-runtime.js';

export const IDENTITY_FSM_DEFINITION: FSMDefinition<IdentityState> = {
  initialState: IdentityState.Created,
  terminalStates: [
    IdentityState.Archived,
  ],
  transitions: [
    // Creation flow
    { from: IdentityState.Created, to: IdentityState.Configured },
    { from: IdentityState.Created, to: IdentityState.Archived },
    // Configuration flow
    { from: IdentityState.Configured, to: IdentityState.Active },
    { from: IdentityState.Configured, to: IdentityState.Suspended },
    { from: IdentityState.Configured, to: IdentityState.Archived },
    // Active flow
    { from: IdentityState.Active, to: IdentityState.Suspended },
    { from: IdentityState.Active, to: IdentityState.Archived },
    // Suspension flow (can reactivate)
    { from: IdentityState.Suspended, to: IdentityState.Active },
    { from: IdentityState.Suspended, to: IdentityState.Archived },
  ],
};

/**
 * Create a new Identity FSM starting at Created state.
 */
export function createIdentityFSM(): StateMachine<IdentityState> {
  return new TypedStateMachine(IDENTITY_FSM_DEFINITION);
}

/**
 * Get the FSM definition for testing/validation.
 */
export function getIdentityFSMDefinition(): FSMDefinition<IdentityState> {
  return IDENTITY_FSM_DEFINITION;
}
