/**
 * Autonomous Architecture Runtime — Architecture Operation
 * TASK-AIS-012A.017
 *
 * Immutable value object describing one completed architecture change.
 * No execution. No Runtime. No EventBus. No AI.
 */

import { ArchitectureGraphSnapshot } from './architecture.graph-snapshot.js';
import { ArchitectureChangeSet } from './architecture.change-set.js';

export class ArchitectureOperation {
  private readonly before: ArchitectureGraphSnapshot;
  private readonly after: ArchitectureGraphSnapshot;
  private readonly changes: ArchitectureChangeSet;

  constructor(
    before: ArchitectureGraphSnapshot,
    after: ArchitectureGraphSnapshot,
    changes: ArchitectureChangeSet,
  ) {
    this.before = before;
    this.after = after;
    this.changes = changes;
  }

  getBeforeSnapshot(): ArchitectureGraphSnapshot {
    return this.before;
  }

  getAfterSnapshot(): ArchitectureGraphSnapshot {
    return this.after;
  }

  getChangeSet(): ArchitectureChangeSet {
    return this.changes;
  }
}
