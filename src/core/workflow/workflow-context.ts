/**
 * Workflow Runtime — Workflow Context
 * TASK-AIS-003H.000
 *
 * Isolated context for a workflow execution.
 * Provides access to variables, input/output, and event emission.
 * Integrates with Memory, Knowledge, Execution, Identity runtimes via interfaces.
 */

import type {
  WorkflowContext as WorkflowContextInterface,
  WorkflowInstanceId,
  WorkflowId,
  StageId,
} from './types.js';

export class WorkflowContextImpl implements WorkflowContextInterface {
  readonly variables = new Map<string, unknown>();
  private readonly inputRecord: Readonly<Record<string, unknown>>;
  private readonly metadataRecord: Readonly<Record<string, unknown>>;
  private readonly _emit: (eventType: string, payload: unknown) => Promise<void>;

  readonly workflowInstanceId: WorkflowInstanceId;
  readonly workflowId: WorkflowId;
  readonly stageId: StageId | null;

  constructor(
    params: {
      workflowInstanceId: WorkflowInstanceId;
      workflowId: WorkflowId;
      stageId: StageId | null;
      input: Readonly<Record<string, unknown>>;
      metadata?: Readonly<Record<string, unknown>>;
      emit?: (eventType: string, payload: unknown) => Promise<void>;
    },
  ) {
    this.workflowInstanceId = params.workflowInstanceId;
    this.workflowId = params.workflowId;
    this.stageId = params.stageId;
    this.inputRecord = Object.freeze({ ...params.input });
    this.metadataRecord = Object.freeze({ ...params.metadata ?? {} });
    this._emit = params.emit ?? (async () => undefined);
  }

  get input(): Readonly<Record<string, unknown>> {
    return this.inputRecord;
  }

  get metadata(): Readonly<Record<string, unknown>> {
    return this.metadataRecord;
  }

  getVariable(key: string): unknown {
    return this.variables.get(key);
  }

  setVariable(key: string, value: unknown): void {
    this.variables.set(key, value);
  }

  async emit(eventType: string, payload: unknown): Promise<void> {
    await this._emit(eventType, payload);
  }

  /**
   * Create a child context for a specific stage.
   */
  createStageContext(stageId: StageId): WorkflowContextImpl {
    return new WorkflowContextImpl({
      workflowInstanceId: this.workflowInstanceId,
      workflowId: this.workflowId,
      stageId,
      input: this.inputRecord,
      metadata: this.metadataRecord,
      emit: this._emit,
    });
  }
}
