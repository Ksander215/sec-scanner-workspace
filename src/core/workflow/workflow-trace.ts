/**
 * Workflow Runtime — Trace
 * TASK-AIS-003H.000
 *
 * Collects full execution tracing for workflows:
 *   - Workflow → Stage → Execution → Events → Artifacts
 */

import type {
  TraceEntry,
  TraceLevel,
  WorkflowInstanceId,
  StageId,
  ExecutionId,
  Timestamp,
} from './types.js';
import { TraceLevel as TL } from './types.js';
import { brandTraceEntryId } from './types.js';

export class WorkflowTrace {
  private readonly entries: TraceEntry[] = [];
  private readonly entriesByInstance = new Map<WorkflowInstanceId, TraceEntry[]>();

  /**
   * Add a trace entry.
   */
  add(
    workflowInstanceId: WorkflowInstanceId,
    level: TraceLevel,
    action: string,
    message: string,
    options?: {
      stageId?: StageId | null;
      executionId?: ExecutionId | null;
      artifacts?: readonly string[];
      metadata?: Readonly<Record<string, unknown>>;
    },
  ): TraceEntry {
    const entry: TraceEntry = Object.freeze({
      id: brandTraceEntryId(crypto.randomUUID()),
      workflowInstanceId,
      stageId: options?.stageId ?? null,
      executionId: options?.executionId ?? null,
      level,
      action,
      message,
      timestamp: new Date().toISOString() as Timestamp,
      metadata: options?.metadata ?? Object.freeze({}),
      artifacts: options?.artifacts ?? [],
    });

    this.entries.push(entry);

    if (!this.entriesByInstance.has(workflowInstanceId)) {
      this.entriesByInstance.set(workflowInstanceId, []);
    }
    this.entriesByInstance.get(workflowInstanceId)!.push(entry);

    return entry;
  }

  /**
   * Debug-level trace.
   */
  debug(
    workflowInstanceId: WorkflowInstanceId,
    action: string,
    message: string,
    options?: Parameters<typeof this.add>[4],
  ): TraceEntry {
    return this.add(workflowInstanceId, TL.Debug, action, message, options);
  }

  /**
   * Info-level trace.
   */
  info(
    workflowInstanceId: WorkflowInstanceId,
    action: string,
    message: string,
    options?: Parameters<typeof this.add>[4],
  ): TraceEntry {
    return this.add(workflowInstanceId, TL.Info, action, message, options);
  }

  /**
   * Warn-level trace.
   */
  warn(
    workflowInstanceId: WorkflowInstanceId,
    action: string,
    message: string,
    options?: Parameters<typeof this.add>[4],
  ): TraceEntry {
    return this.add(workflowInstanceId, TL.Warn, action, message, options);
  }

  /**
   * Error-level trace.
   */
  error(
    workflowInstanceId: WorkflowInstanceId,
    action: string,
    message: string,
    options?: Parameters<typeof this.add>[4],
  ): TraceEntry {
    return this.add(workflowInstanceId, TL.Error, action, message, options);
  }

  /**
   * Get all trace entries for a workflow instance.
   */
  getByInstance(workflowInstanceId: WorkflowInstanceId): readonly TraceEntry[] {
    return this.entriesByInstance.get(workflowInstanceId) ?? [];
  }

  /**
   * Get all trace entries.
   */
  getAll(): readonly TraceEntry[] {
    return this.entries;
  }

  /**
   * Get trace entries filtered by level.
   */
  getByLevel(workflowInstanceId: WorkflowInstanceId, level: TraceLevel): readonly TraceEntry[] {
    const instanceEntries = this.entriesByInstance.get(workflowInstanceId) ?? [];
    return instanceEntries.filter(e => e.level === level);
  }

  /**
   * Get trace entries for a specific stage.
   */
  getByStage(workflowInstanceId: WorkflowInstanceId, stageId: StageId): readonly TraceEntry[] {
    const instanceEntries = this.entriesByInstance.get(workflowInstanceId) ?? [];
    return instanceEntries.filter(e => e.stageId === stageId);
  }

  /**
   * Get the count of entries for an instance.
   */
  getCount(workflowInstanceId: WorkflowInstanceId): number {
    return this.entriesByInstance.get(workflowInstanceId)?.length ?? 0;
  }

  /**
   * Clear all traces.
   */
  clear(): void {
    this.entries.length = 0;
    this.entriesByInstance.clear();
  }
}
