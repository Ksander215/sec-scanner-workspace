/**
 * Session FSM Definition — Creates a TypedStateMachine for Session lifecycle.
 *
 * Allowed transitions:
 *   Created → Running
 *   Running → Paused
 *   Paused → Running (resume)
 *   Running → Completed
 *   Completed → Archived
 *
 * Resumed is a transient event-level state, not an FSM state.
 * The actual FSM transition is Paused → Running.
 */
import { TypedStateMachine } from '../fsm/state-machine.js';
import type { FSMDefinition } from '../fsm/state-machine.js';
import { SessionState } from './types.js';

const SESSION_FSM_DEFINITION: FSMDefinition<SessionState> = {
  initialState: SessionState.Created,
  terminalStates: [SessionState.Archived],
  transitions: [
    { from: SessionState.Created, to: SessionState.Running },
    { from: SessionState.Running, to: SessionState.Paused },
    { from: SessionState.Paused, to: SessionState.Running },
    { from: SessionState.Running, to: SessionState.Completed },
    { from: SessionState.Completed, to: SessionState.Archived },
  ],
};

/**
 * Create a new Session FSM instance.
 * Each session gets its own FSM for independent state tracking.
 */
export function createSessionFSM(): TypedStateMachine<SessionState> {
  return new TypedStateMachine(SESSION_FSM_DEFINITION);
}
