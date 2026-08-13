/**
 * Autonomous Architecture Runtime — Architecture Runtime Lifecycle
 * TASK-AIS-012A.025
 *
 * Immutable container of lifecycle transitions.
 * No execution. No validation. No FSM. No state management.
 */

import { ArchitectureRuntimeTransition } from './architecture.runtime-transition.js';

export class ArchitectureRuntimeLifecycle {
  private readonly transitions: readonly ArchitectureRuntimeTransition[];

  constructor(transitions: readonly ArchitectureRuntimeTransition[]) {
    this.transitions = transitions;
  }

  getTransitions(): readonly ArchitectureRuntimeTransition[] {
    return this.transitions;
  }

  getTransitionCount(): number {
    return this.transitions.length;
  }

  isEmpty(): boolean {
    return this.transitions.length === 0;
  }
}
