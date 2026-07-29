/**
 * Cognitive Runtime — FSM
 * TASK-AIS-003I.000
 *
 * Lifecycle state machine for the Cognitive Runtime.
 *
 * FSM: Created → Initialized → Ready → Processing ↔ Streaming
 *                                          → WaitingTool
 *                                          → WaitingWorkflow
 *                                          → Completed
 *                                          → Disposed
 *
 * Conforms to: DOM-002.000 §4 (FSM Definitions), ARC-001.001
 */

import type { FSMDefinition } from '../fsm/state-machine.js';
import { CognitiveState } from './types.js';

/**
 * Create the Cognitive Runtime FSM definition.
 */
export function createCognitiveFSM(): FSMDefinition<CognitiveState> {
  return {
    initialState: CognitiveState.Created,
    terminalStates: [CognitiveState.Disposed],
    transitions: [
      // Initialization
      { from: CognitiveState.Created, to: CognitiveState.Initialized },
      { from: CognitiveState.Initialized, to: CognitiveState.Ready },

      // Processing cycle
      { from: CognitiveState.Ready, to: CognitiveState.Processing },
      { from: CognitiveState.Processing, to: CognitiveState.Streaming },
      { from: CognitiveState.Streaming, to: CognitiveState.Processing },
      { from: CognitiveState.Processing, to: CognitiveState.WaitingTool },
      { from: CognitiveState.WaitingTool, to: CognitiveState.Processing },
      { from: CognitiveState.Processing, to: CognitiveState.WaitingWorkflow },
      { from: CognitiveState.WaitingWorkflow, to: CognitiveState.Processing },

      // Completion
      { from: CognitiveState.Processing, to: CognitiveState.Completed },
      { from: CognitiveState.Streaming, to: CognitiveState.Completed },
      { from: CognitiveState.Completed, to: CognitiveState.Ready },
      { from: CognitiveState.Completed, to: CognitiveState.Disposed },

      // Direct paths from Ready
      { from: CognitiveState.Ready, to: CognitiveState.Disposed },
    ],
  };
}
