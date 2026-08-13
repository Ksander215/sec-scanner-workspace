/**
 * Autonomous Architecture Runtime — Architecture History
 * TASK-AIS-012A.018
 *
 * Immutable container of architectural operations.
 * No execution. No Runtime. No EventBus. No mutation.
 */

import { ArchitectureOperation } from './architecture.operation.js';

export class ArchitectureHistory {
  private readonly operations: readonly ArchitectureOperation[];

  constructor(operations: readonly ArchitectureOperation[]) {
    this.operations = operations;
  }

  getOperations(): readonly ArchitectureOperation[] {
    return this.operations;
  }

  getOperationCount(): number {
    return this.operations.length;
  }

  isEmpty(): boolean {
    return this.operations.length === 0;
  }
}
