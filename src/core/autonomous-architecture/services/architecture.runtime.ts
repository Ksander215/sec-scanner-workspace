/**
 * Autonomous Architecture Runtime — Architecture Runtime
 * TASK-AIS-012A.021
 *
 * Minimal dependency container. No behavior. No lifecycle.
 * No analysis. No validation. No mutation. No async.
 */

import { ArchitectureWorkspace } from './architecture.workspace.js';
import { ArchitectureHistory } from './architecture.history.js';
import { ArchitectureEventBus } from './architecture.event-bus.js';

export class ArchitectureRuntime {
  private readonly workspace: ArchitectureWorkspace;
  private readonly history: ArchitectureHistory;
  private readonly eventBus: ArchitectureEventBus;

  constructor(
    workspace: ArchitectureWorkspace,
    history: ArchitectureHistory,
    eventBus: ArchitectureEventBus,
  ) {
    this.workspace = workspace;
    this.history = history;
    this.eventBus = eventBus;
  }

  getWorkspace(): ArchitectureWorkspace {
    return this.workspace;
  }

  getHistory(): ArchitectureHistory {
    return this.history;
  }

  getEventBus(): ArchitectureEventBus {
    return this.eventBus;
  }
}
