/**
 * Autonomous Architecture Runtime — Architecture Runtime State
 * TASK-AIS-012A.023
 *
 * Immutable value object holding runtime status.
 * No transitions. No FSM. No lifecycle. No behavior.
 */

export enum ArchitectureRuntimeStatus {
  Created,
  Ready,
  Running,
  Stopped,
}

export class ArchitectureRuntimeState {
  private readonly status: ArchitectureRuntimeStatus;

  constructor(status: ArchitectureRuntimeStatus) {
    this.status = status;
  }

  getStatus(): ArchitectureRuntimeStatus {
    return this.status;
  }
}
