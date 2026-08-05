/**
 * Autonomous Architecture Runtime — Architecture Runtime Transition
 * TASK-AIS-012A.024
 *
 * Immutable value object describing a single runtime state transition.
 * No execution. No validation. No FSM. No lifecycle.
 */

import { ArchitectureRuntimeStatus } from './architecture.runtime-state.js';

export class ArchitectureRuntimeTransition {
  private readonly from: ArchitectureRuntimeStatus;
  private readonly to: ArchitectureRuntimeStatus;

  constructor(
    from: ArchitectureRuntimeStatus,
    to: ArchitectureRuntimeStatus,
  ) {
    this.from = from;
    this.to = to;
  }

  getFrom(): ArchitectureRuntimeStatus {
    return this.from;
  }

  getTo(): ArchitectureRuntimeStatus {
    return this.to;
  }
}
