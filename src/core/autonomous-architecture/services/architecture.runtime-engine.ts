/**
 * Autonomous Architecture Runtime — Architecture Runtime Engine
 * TASK-AIS-012A.027
 *
 * Top-level entry point for Runtime execution.
 * No behavior at this stage. Only holds Controller reference.
 */

import { ArchitectureRuntimeController } from './architecture.runtime-controller.js';

export class ArchitectureRuntimeEngine {
  private readonly controller: ArchitectureRuntimeController;

  constructor(controller: ArchitectureRuntimeController) {
    this.controller = controller;
  }

  getController(): ArchitectureRuntimeController {
    return this.controller;
  }
}
