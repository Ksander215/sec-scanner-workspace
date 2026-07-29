/**
 * Workflow Runtime — Variables Runtime
 * TASK-AIS-003H.000
 *
 * Manages workflow variables across multiple scopes:
 *   - Global: shared across entire workflow
 *   - Stage: scoped to a specific stage
 *   - Execution: scoped to a single execution attempt
 *   - Temporary: ephemeral, cleared after stage
 *   - Output: final output of workflow
 *
 * All variable maps are immutable (ReadonlyMap). Mutations create new maps.
 */

import type {
  VariableScopeId,
  StageId,
  ExecutionId,
  WorkflowVariables,
  VariableScope,
  Timestamp,
} from './types.js';
import { VariableScope as VS } from './types.js';
import { brandVariableScopeId } from './types.js';

export class VariablesRuntime {
  private readonly globalVariables = new Map<string, unknown>();
  private readonly stageVariables = new Map<StageId, Map<string, unknown>>();
  private readonly executionVariables = new Map<ExecutionId, Map<string, unknown>>();
  private readonly temporaryVariables = new Map<string, unknown>();
  private readonly outputVariables = new Map<string, unknown>();
  private readonly scopeIds = new Map<string, VariableScopeId>();

  private createScopeId(scope: VariableScope, stageId?: StageId | null, executionId?: ExecutionId | null): VariableScopeId {
    const key = `${scope}-${stageId ?? 'none'}-${executionId ?? 'none'}`;
    if (!this.scopeIds.has(key)) {
      this.scopeIds.set(key, brandVariableScopeId(crypto.randomUUID()));
    }
    return this.scopeIds.get(key)!;
  }

  // ─── Global Scope ────────────────────────────────────────────

  setGlobal(key: string, value: unknown): void {
    this.globalVariables.set(key, value);
  }

  getGlobal(key: string): unknown {
    return this.globalVariables.get(key);
  }

  getAllGlobal(): ReadonlyMap<string, unknown> {
    return new Map(this.globalVariables);
  }

  // ─── Stage Scope ──────────────────────────────────────────────

  setStage(stageId: StageId, key: string, value: unknown): void {
    if (!this.stageVariables.has(stageId)) {
      this.stageVariables.set(stageId, new Map());
    }
    this.stageVariables.get(stageId)!.set(key, value);
  }

  getStage(stageId: StageId, key: string): unknown {
    return this.stageVariables.get(stageId)?.get(key);
  }

  getAllStage(stageId: StageId): ReadonlyMap<string, unknown> {
    return new Map(this.stageVariables.get(stageId) ?? []);
  }

  // ─── Execution Scope ──────────────────────────────────────────

  setExecution(executionId: ExecutionId, key: string, value: unknown): void {
    if (!this.executionVariables.has(executionId)) {
      this.executionVariables.set(executionId, new Map());
    }
    this.executionVariables.get(executionId)!.set(key, value);
  }

  getExecution(executionId: ExecutionId, key: string): unknown {
    return this.executionVariables.get(executionId)?.get(key);
  }

  getAllExecution(executionId: ExecutionId): ReadonlyMap<string, unknown> {
    return new Map(this.executionVariables.get(executionId) ?? []);
  }

  // ─── Temporary Scope ────────────────────────────────────────

  setTemporary(key: string, value: unknown): void {
    this.temporaryVariables.set(key, value);
  }

  getTemporary(key: string): unknown {
    return this.temporaryVariables.get(key);
  }

  getAllTemporary(): ReadonlyMap<string, unknown> {
    return new Map(this.temporaryVariables);
  }

  clearTemporary(): void {
    this.temporaryVariables.clear();
  }

  // ─── Output Scope ────────────────────────────────────────────

  setOutput(key: string, value: unknown): void {
    this.outputVariables.set(key, value);
  }

  getOutput(key: string): unknown {
    return this.outputVariables.get(key);
  }

  getAllOutput(): ReadonlyMap<string, unknown> {
    return new Map(this.outputVariables);
  }

  // ─── Scoped Access ────────────────────────────────────────────

  getVariablesForScope(
    scope: VariableScope,
    stageId?: StageId | null,
    executionId?: ExecutionId | null,
  ): ReadonlyMap<string, unknown> {
    switch (scope) {
      case VS.Global:
        return this.getAllGlobal();
      case VS.Stage:
        if (stageId) return this.getAllStage(stageId);
        return new Map();
      case VS.Execution:
        if (executionId) return this.getAllExecution(executionId);
        return new Map();
      case VS.Temporary:
        return this.getAllTemporary();
      case VS.Output:
        return this.getAllOutput();
      default:
        return new Map();
    }
  }

  // ─── Serialization ───────────────────────────────────────────

  toWorkflowVariablesList(): readonly WorkflowVariables[] {
    const now = new Date().toISOString() as Timestamp;
    const result: WorkflowVariables[] = [];

    // Global
    const scopeId = this.createScopeId(VS.Global);
    result.push(Object.freeze({
      id: scopeId,
      scope: VS.Global,
      stageId: null,
      executionId: null,
      variables: this.getAllGlobal(),
      createdAt: now,
      updatedAt: now,
    }));

    // Stage
    for (const [stageId, vars] of this.stageVariables) {
      const sId = this.createScopeId(VS.Stage, stageId);
      result.push(Object.freeze({
        id: sId,
        scope: VS.Stage,
        stageId,
        executionId: null,
        variables: new Map(vars),
        createdAt: now,
        updatedAt: now,
      }));
    }

    // Execution
    for (const [execId, vars] of this.executionVariables) {
      const eId = this.createScopeId(VS.Execution, null, execId);
      result.push(Object.freeze({
        id: eId,
        scope: VS.Execution,
        stageId: null,
        executionId: execId,
        variables: new Map(vars),
        createdAt: now,
        updatedAt: now,
      }));
    }

    // Output
    const outId = this.createScopeId(VS.Output);
    result.push(Object.freeze({
      id: outId,
      scope: VS.Output,
      stageId: null,
      executionId: null,
      variables: this.getAllOutput(),
      createdAt: now,
      updatedAt: now,
    }));

    return result;
  }

  // ─── Reset ────────────────────────────────────────────────────

  reset(): void {
    this.globalVariables.clear();
    this.stageVariables.clear();
    this.executionVariables.clear();
    this.temporaryVariables.clear();
    this.outputVariables.clear();
    this.scopeIds.clear();
  }
}
