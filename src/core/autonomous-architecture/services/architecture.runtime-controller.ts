/**
 * Autonomous Architecture Runtime — Architecture Runtime Controller
 * TASK-AIS-012A.026
 *
 * Immutable composition of Runtime and RuntimeLifecycle.
 * No execution. No state management. No event handling.
 */

import { ArchitectureRuntime } from './architecture.runtime.js';
import { ArchitectureRuntimeLifecycle } from './architecture.runtime-lifecycle.js';

export class ArchitectureRuntimeController {
  private readonly runtime: ArchitectureRuntime;
  private readonly lifecycle: ArchitectureRuntimeLifecycle;

  constructor(
    runtime: ArchitectureRuntime,
    lifecycle: ArchitectureRuntimeLifecycle,
  ) {
    this.runtime = runtime;
    this.lifecycle = lifecycle;
  }

  getRuntime(): ArchitectureRuntime {
    return this.runtime;
  }

  getLifecycle(): ArchitectureRuntimeLifecycle {
    return this.lifecycle;
  }
}
