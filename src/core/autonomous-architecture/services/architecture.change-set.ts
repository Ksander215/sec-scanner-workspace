/**
 * Autonomous Architecture Runtime — Architecture Graph Change Set Foundation
 * TASK-AIS-012A.012
 *
 * Immutable domain object representing an architectural change between two states.
 * No Runtime. No EventBus. No persistence. No evolution logic.
 */

import type { ArchitectureGraphDiffResult } from './architecture.graph-diff.js';

export class ArchitectureChangeSet {
  private readonly diff: ArchitectureGraphDiffResult;

  constructor(diff: ArchitectureGraphDiffResult) {
    this.diff = diff;
  }

  getChanges(): ArchitectureGraphDiffResult {
    return this.diff;
  }
}
