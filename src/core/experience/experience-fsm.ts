/**
 * Experience Runtime — FSM Definition
 * TASK-AIS-004A.000, Subsystem 12
 *
 * State machine for Experience Runtime lifecycle.
 * States: Created → Learning → Observing → Adapting → Stable → Relearning → Archived
 */

import { TypedStateMachine } from '../fsm/state-machine.js';
import type { FSMDefinition } from '../fsm/state-machine.js';
import { ExperienceState } from './types.js';

/** Experience Runtime FSM transition definition */
export const ExperienceFSMDefinition: FSMDefinition<ExperienceState> = {
  initialState: ExperienceState.Created,
  transitions: [
    // Initial learning phase
    { from: ExperienceState.Created, to: ExperienceState.Learning },
    { from: ExperienceState.Learning, to: ExperienceState.Observing },

    // Normal progression
    { from: ExperienceState.Observing, to: ExperienceState.Adapting },
    { from: ExperienceState.Adapting, to: ExperienceState.Stable },

    // Relearning from stable or adapting
    { from: ExperienceState.Stable, to: ExperienceState.Relearning },
    { from: ExperienceState.Stable, to: ExperienceState.Adapting },
    { from: ExperienceState.Adapting, to: ExperienceState.Relearning },

    // Relearning paths
    { from: ExperienceState.Relearning, to: ExperienceState.Learning },
    { from: ExperienceState.Relearning, to: ExperienceState.Observing },

    // Archival paths
    { from: ExperienceState.Stable, to: ExperienceState.Archived },
    { from: ExperienceState.Relearning, to: ExperienceState.Archived },
  ],
  terminalStates: [ExperienceState.Archived],
};

/** Factory: creates a new Experience Runtime state machine */
export function createExperienceFSM(): TypedStateMachine<ExperienceState> {
  return new TypedStateMachine(ExperienceFSMDefinition);
}
