/**
 * Workflow Runtime — Main Orchestrator
 * TASK-AIS-003H.000 — Workflow Runtime & Process Orchestration
 *
 * The central runtime for managing workflow definitions and instances.
 * Responsibilities:
 *   - Create, validate, and register workflow definitions
 *   - Start, pause, resume, cancel, and recover workflow instances
 *   - Execute stages with sequential, parallel, conditional, and event-driven strategies
 *   - Manage transitions between stages
 *   - Handle compensation (rollback) on failure
 *   - Collect metrics and tracing
 *   - Enforce policies
 *   - Persist state via pluggable storage
 *   - Integrate with Capability Runtime for Pack-registered workflows
 *   - Publish domain events via EventBus
 *
 * Conforms to: ARC-001.001, ADR-002, DOM-002.000
 */

import type { Timestamp } from '../types/common.js';
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';

import type {
  WorkflowId,
  WorkflowInstanceId,
  StageId,
  StageDefinition,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowMetrics,
  WorkflowStorageAdapter,
  WorkflowCheckpoint,
  WorkflowRegistration,
  StageHandler,
  StageHandlerRegistry,
  SchedulePlan,
} from './types.js';
import {
  WorkflowState as WS,
  StageState as SS,
  ExecutionStatus as ES,
} from './types.js';

import { TransitionEngine } from './transition-engine.js';
import { WorkflowScheduler } from './scheduler.js';
import { VariablesRuntime } from './variables.js';
import { InMemoryWorkflowStorage } from './workflow-storage.js';
import { WorkflowVersionManager } from './workflow-versioning.js';
import { WorkflowTrace } from './workflow-trace.js';
import { WorkflowMetricsCollector } from './workflow-metrics.js';
import { WorkflowPolicyEngine } from './workflow-policies.js';
import { WorkflowContextImpl } from './workflow-context.js';

import { validateDefinition } from './workflow-definition.js';
import {
  createWorkflowInstance,
  cloneMutable,
  freezeInstance,
  updateStageState,
  createExecutionRecord,
  completeExecutionRecord,
} from './workflow-instance.js';

import { createWorkflowFSM } from './workflow-fsm.js';
import type { TypedStateMachine } from '../fsm/state-machine.js';

import {
  WorkflowNotFoundError,
  WorkflowInstanceNotFoundError,
  WorkflowDuplicateError,
  WorkflowStateError,
  WorkflowDisposedError,
  WorkflowValidationError,
  WorkflowHandlerNotFoundError,
  WorkflowRecoveryError,
} from './workflow-errors.js';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowRuntimeConfig {
  readonly eventBus?: EventBus;
  readonly storage?: WorkflowStorageAdapter;
  readonly maxConcurrentWorkflows?: number;
  readonly defaultTimeout?: number;
  readonly checkpointInterval?: number;
  readonly enableTracing?: boolean;
  readonly enableMetrics?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// STAGE HANDLER REGISTRY
// ═══════════════════════════════════════════════════════════════════

class DefaultStageHandlerRegistry implements StageHandlerRegistry {
  private readonly handlers = new Map<string, StageHandler>();

  register(name: string, handler: StageHandler): void {
    this.handlers.set(name, handler);
  }

  get(name: string): StageHandler | undefined {
    return this.handlers.get(name);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  getAll(): ReadonlyMap<string, StageHandler> {
    return new Map(this.handlers);
  }
}

// ═══════════════════════════════════════════════════════════════════
// WORKFLOW RUNTIME
// ═══════════════════════════════════════════════════════════════════

export class WorkflowRuntime {
  readonly name = 'WorkflowRuntime';

  // ─── Internal components ──────────────────────────────────────
  private readonly storage: WorkflowStorageAdapter;
  private readonly scheduler: WorkflowScheduler;
  private readonly transitionEngine: TransitionEngine;
  private readonly variablesRuntime: VariablesRuntime;
  private readonly versionManager: WorkflowVersionManager;
  private readonly trace: WorkflowTrace;
  private readonly metrics: WorkflowMetricsCollector;
  private readonly policyEngine: WorkflowPolicyEngine;
  private readonly handlerRegistry: StageHandlerRegistry;
  private readonly eventBus: EventBus | undefined;

  // ─── State ────────────────────────────────────────────────────
  private readonly definitions = new Map<WorkflowId, WorkflowDefinition>();
  private readonly instances = new Map<WorkflowInstanceId, WorkflowInstance>();
  private readonly stageFSMs = new Map<string, TypedStateMachine<string>>();
  private readonly registrations = new Map<string, WorkflowRegistration>();
  private _disposed = false;

  constructor(config?: WorkflowRuntimeConfig) {
    this.eventBus = config?.eventBus;
    this.storage = config?.storage ?? new InMemoryWorkflowStorage();
    this.scheduler = new WorkflowScheduler();
    this.transitionEngine = new TransitionEngine();
    this.variablesRuntime = new VariablesRuntime();
    this.versionManager = new WorkflowVersionManager();
    this.trace = new WorkflowTrace();
    this.metrics = new WorkflowMetricsCollector();
    this.policyEngine = new WorkflowPolicyEngine();
    this.policyEngine.registerDefaults();
    this.handlerRegistry = new DefaultStageHandlerRegistry();
  }

  // ═════════════════════════════════════════════════════════════
  // WORKFLOW DEFINITION MANAGEMENT
  // ═════════════════════════════════════════════════════════════

  async registerDefinition(definition: WorkflowDefinition): Promise<void> {
    this.assertNotDisposed();
    const issues = validateDefinition(definition);
    if (issues.length > 0) {
      throw new WorkflowValidationError(issues);
    }
    if (this.definitions.has(definition.id)) {
      throw new WorkflowDuplicateError(definition.name);
    }

    this.definitions.set(definition.id, definition);
    this.versionManager.registerVersion(definition);
    await this.storage.saveDefinition(definition);

    this.metrics.incrementTotalWorkflows();
    await this.publishEvent({
      eventType: 'WorkflowCreated',
      classification: EventClassification.StateChange,
      workflowId: definition.id,
      name: definition.name,
      version: definition.version,
      stageCount: definition.stages.length,
      createdAt: definition.createdAt,
    });
  }

  async registerDefinitions(definitions: readonly WorkflowDefinition[]): Promise<void> {
    for (const def of definitions) {
      await this.registerDefinition(def);
    }
  }

  getDefinition(workflowId: WorkflowId): WorkflowDefinition | undefined {
    return this.definitions.get(workflowId);
  }

  listDefinitions(): readonly WorkflowDefinition[] {
    return Array.from(this.definitions.values());
  }

  // ═════════════════════════════════════════════════════════════
  // WORKFLOW INSTANCE LIFECYCLE
  // ═════════════════════════════════════════════════════════════

  async createInstance(
    workflowId: WorkflowId,
    input?: Readonly<Record<string, unknown>>,
  ): Promise<WorkflowInstanceId> {
    this.assertNotDisposed();

    const definition = this.definitions.get(workflowId);
    if (!definition) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const instance = createWorkflowInstance(definition, {
      workflowId,
      definitionVersion: definition.version,
      input,
    });

    this.instances.set(instance.id, instance);
    await this.storage.saveWorkflowInstance(instance);

    return instance.id;
  }

  async startInstance(instanceId: WorkflowInstanceId): Promise<void> {
    this.assertNotDisposed();

    const instance = this.getInstance(instanceId);
    const fsm = createWorkflowFSM();
    if (!fsm.canTransition('Ready')) {
      throw new WorkflowStateError(instance.state, 'Ready', instanceId);
    }
    fsm.transition('Ready');

    const mutable = cloneMutable(instance);
    mutable.state = WS.Ready;
    mutable.startedAt = new Date().toISOString() as Timestamp;
    const updated = freezeInstance(instance, mutable);

    this.instances.set(instanceId, updated);
    await this.storage.saveWorkflowInstance(updated);

    this.metrics.incrementRunning();
    await this.publishEvent({
      eventType: 'WorkflowStarted',
      classification: EventClassification.Action,
      workflowInstanceId: instanceId,
      workflowId: updated.workflowId,
      name: this.definitions.get(updated.workflowId)?.name ?? '',
      startedAt: updated.startedAt!,
    });

    // Transition to Running and start executing stages
    const runFSM = createWorkflowFSM();
    runFSM.transition('Ready');
    runFSM.transition('Running');

    const runningMutable = cloneMutable(updated);
    runningMutable.state = WS.Running;
    const running = freezeInstance(updated, runningMutable);
    this.instances.set(instanceId, running);

    await this.executeWorkflow(instanceId);
  }

  async pauseInstance(instanceId: WorkflowInstanceId): Promise<void> {
    this.assertNotDisposed();

    const instance = this.getInstance(instanceId);
    if (instance.state !== WS.Running) {
      throw new WorkflowStateError(instance.state, 'Paused', instanceId);
    }

    const mutable = cloneMutable(instance);
    mutable.state = WS.Paused;
    const updated = freezeInstance(instance, mutable);
    this.instances.set(instanceId, updated);

    this.metrics.incrementPaused();
    this.metrics.decrementRunning();
    await this.storage.saveWorkflowInstance(updated);
    await this.publishEvent({
      eventType: 'WorkflowPaused',
      classification: EventClassification.StateChange,
      workflowInstanceId: instanceId,
      workflowId: updated.workflowId,
      currentStageId: updated.currentStageId,
      pausedAt: updated.updatedAt,
    });
  }

  async resumeInstance(instanceId: WorkflowInstanceId): Promise<void> {
    this.assertNotDisposed();

    const instance = this.getInstance(instanceId);
    if (instance.state !== WS.Paused) {
      throw new WorkflowStateError(instance.state, 'Running', instanceId);
    }

    const mutable = cloneMutable(instance);
    mutable.state = WS.Running;
    const updated = freezeInstance(instance, mutable);
    this.instances.set(instanceId, updated);

    this.metrics.decrementPaused();
    this.metrics.incrementRunning();
    await this.storage.saveWorkflowInstance(updated);
    await this.publishEvent({
      eventType: 'WorkflowResumed',
      classification: EventClassification.Action,
      workflowInstanceId: instanceId,
      workflowId: updated.workflowId,
      resumedStageId: updated.currentStageId,
      resumedAt: updated.updatedAt,
    });

    await this.executeWorkflow(instanceId);
  }

  async cancelInstance(instanceId: WorkflowInstanceId, reason?: string): Promise<void> {
    this.assertNotDisposed();

    const instance = this.getInstance(instanceId);
    if (instance.state === WS.Completed || instance.state === WS.Cancelled) {
      throw new WorkflowStateError(instance.state, 'Cancelled', instanceId);
    }

    const mutable = cloneMutable(instance);
    mutable.state = WS.Cancelled;
    mutable.completedAt = new Date().toISOString() as Timestamp;
    const updated = freezeInstance(instance, mutable);
    this.instances.set(instanceId, updated);

    if (instance.state === WS.Running) {
      this.metrics.decrementRunning();
    } else if (instance.state === WS.Paused) {
      this.metrics.decrementPaused();
    }
    this.metrics.incrementCancelled();
    await this.storage.saveWorkflowInstance(updated);
    await this.publishEvent({
      eventType: 'WorkflowCancelled',
      classification: EventClassification.StateChange,
      workflowInstanceId: instanceId,
      workflowId: updated.workflowId,
      reason: reason ?? 'User cancelled',
      cancelledAt: updated.completedAt!,
    });
  }

  async recoverInstance(instanceId: WorkflowInstanceId): Promise<void> {
    this.assertNotDisposed();

    const instance = this.getInstance(instanceId);
    if (instance.state !== WS.Failed && instance.state !== WS.Paused) {
      throw new WorkflowRecoveryError(instanceId, `Cannot recover from state "${instance.state}"`);
    }

    const previousState = instance.state;

    const mutable = cloneMutable(instance);
    mutable.state = WS.Running;
    mutable.error = null;
    const updated = freezeInstance(instance, mutable);
    this.instances.set(instanceId, updated);

    this.metrics.incrementRecoveryCount();
    this.metrics.incrementRunning();
    if (previousState === WS.Paused) {
      this.metrics.decrementPaused();
    }
    await this.storage.saveWorkflowInstance(updated);
    await this.publishEvent({
      eventType: 'WorkflowRecovered',
      classification: EventClassification.Info,
      workflowInstanceId: instanceId,
      workflowId: updated.workflowId,
      recoveredFromState: previousState,
      recoveredToState: WS.Running,
      recoveredAt: updated.updatedAt,
    });

    await this.executeWorkflow(instanceId);
  }

  // ═════════════════════════════════════════════════════════════
  // WORKFLOW EXECUTION
  // ═════════════════════════════════════════════════════════════

  private async executeWorkflow(instanceId: WorkflowInstanceId): Promise<void> {
    const instance = this.getInstance(instanceId);
    const definition = this.definitions.get(instance.workflowId);
    if (!definition) throw new WorkflowNotFoundError(instance.workflowId);

    const plans = this.scheduler.schedule(definition.stages);
    const completedStages = new Set<StageId>();
    const skippedStages = new Set<StageId>();

    for (const plan of plans) {
      // Check if instance is still running
      const current = this.instances.get(instanceId);
      if (!current || current.state !== WS.Running) break;

      const stageDef = definition.stages.find(s => s.id === plan.stageId);
      if (!stageDef) continue;

      // Check dependencies
      if (!this.transitionEngine.checkDependencies(stageDef, completedStages, skippedStages)) {
        continue;
      }

      // Execute stage
      try {
        await this.executeStage(instanceId, stageDef, plan);
        completedStages.add(plan.stageId);
      } catch (e) {
        // Stage failed — check if retryable
        const stage = this.instances.get(instanceId)?.stages.get(plan.stageId);
        if (stage && this.transitionEngine.checkRetry(stageDef, stage.attempts, (e as any).code ?? 'UNKNOWN')) {
          const delay = this.transitionEngine.calculateRetryDelay(stageDef, stage.attempts);
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, 100)));
          try {
            await this.executeStage(instanceId, stageDef, plan);
            completedStages.add(plan.stageId);
            continue;
          } catch {
            // Retry also failed
          }
        }

        // Mark workflow as failed
        await this.failInstance(instanceId, plan.stageId, e instanceof Error ? e : new Error(String(e)));
        return;
      }
    }

    // Check if all stages are completed
    const current = this.instances.get(instanceId);
    if (current && current.state === WS.Running) {
      await this.completeInstance(instanceId);
    }
  }

  private async executeStage(
    instanceId: WorkflowInstanceId,
    stageDef: StageDefinition,
    _plan: SchedulePlan,
  ): Promise<void> {
    const instance = this.getInstance(instanceId);
    const handler = this.handlerRegistry.get(stageDef.handler);
    if (!handler) {
      throw new WorkflowHandlerNotFoundError(stageDef.handler);
    }

    void Date.now(); // timestamp marker for potential future duration tracking
    const execution = createExecutionRecord(stageDef.id, 1, {});

    // Update stage to Running
    const mutable = cloneMutable(instance);
    const stage = mutable.stages.get(stageDef.id)!;
    const updatedStage = updateStageState(stage, SS.Running, {
      input: {},
      startedAt: execution.startedAt,
      attempts: (stage.attempts ?? 0) + 1,
    });
    mutable.stages.set(stageDef.id, updatedStage);
    mutable.currentStageId = stageDef.id;
    const updated = freezeInstance(instance, mutable);
    this.instances.set(instanceId, updated);

    this.metrics.incrementTotalStages();
    await this.publishEvent({
      eventType: 'StageStarted',
      classification: EventClassification.Action,
      workflowInstanceId: instanceId,
      stageId: stageDef.id,
      stageName: stageDef.name,
      attempt: updatedStage.attempts,
      startedAt: execution.startedAt,
    });

    // Execute handler
    const context = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId: updated.workflowId,
      stageId: stageDef.id,
      input: updated.input,
      emit: (eventType, payload) => this.publishEvent({
        eventType,
        classification: EventClassification.Info,
        ...payload as Record<string, unknown>,
      } as any),
    });

    let output: Readonly<Record<string, unknown>>;
    try {
      output = await handler.execute(context);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      const completedExec = completeExecutionRecord(
        execution,
        ES.Failed,
        {},
        {
          code: 'STAGE_EXECUTION_ERROR',
          message: error.message,
          details: [],
          occurredAt: new Date().toISOString() as any,
          attempt: 1,
          retryable: true,
        },
      );

      const failMutable = cloneMutable(this.getInstance(instanceId));
      const failStage = failMutable.stages.get(stageDef.id)!;
      failMutable.stages.set(stageDef.id, updateStageState(failStage, SS.Failed, {
        error: completedExec.error!,
        completedAt: completedExec.completedAt!,
      }));
      this.instances.set(instanceId, freezeInstance(updated, failMutable));

      this.metrics.incrementFailedStages();
      await this.publishEvent({
        eventType: 'StageFailed',
        classification: EventClassification.Error,
        workflowInstanceId: instanceId,
        stageId: stageDef.id,
        stageName: stageDef.name,
        errorCode: (completedExec.error as any)?.code ?? 'UNKNOWN',
        errorMessage: error.message,
        attempt: 1,
        retryable: true,
        failedAt: completedExec.completedAt!,
      });

      throw error;
    }

    const completedExec = completeExecutionRecord(execution, ES.Completed, output);
    const durationMs = completedExec.durationMs ?? 0;

    // Update stage to Completed
    const doneMutable = cloneMutable(this.getInstance(instanceId));
    const doneStage = doneMutable.stages.get(stageDef.id)!;
    doneMutable.stages.set(stageDef.id, updateStageState(doneStage, SS.Completed, {
      output,
      completedAt: completedExec.completedAt!,
    }));
    doneMutable.output = { ...doneMutable.output, ...output };
    const done = freezeInstance(updated, doneMutable);
    this.instances.set(instanceId, done);

    this.metrics.incrementCompletedStages();
    this.metrics.recordExecutionTime(durationMs);
    await this.storage.saveWorkflowInstance(done);
    await this.publishEvent({
      eventType: 'StageCompleted',
      classification: EventClassification.Result,
      workflowInstanceId: instanceId,
      stageId: stageDef.id,
      stageName: stageDef.name,
      durationMs,
      attempt: 1,
      completedAt: completedExec.completedAt!,
    });
  }

  private async completeInstance(instanceId: WorkflowInstanceId): Promise<void> {
    const instance = this.getInstance(instanceId);
    const mutable = cloneMutable(instance);
    mutable.state = WS.Completed;
    mutable.completedAt = new Date().toISOString() as Timestamp;
    const updated = freezeInstance(instance, mutable);
    this.instances.set(instanceId, updated);

    this.metrics.incrementCompleted();
    this.metrics.decrementRunning();
    await this.storage.saveWorkflowInstance(updated);

    const definition = this.definitions.get(updated.workflowId);
    const startTime = updated.startedAt ? new Date(updated.startedAt).getTime() : Date.now();
    const durationMs = Date.now() - startTime;

    await this.publishEvent({
      eventType: 'WorkflowCompleted',
      classification: EventClassification.Result,
      workflowInstanceId: instanceId,
      workflowId: updated.workflowId,
      name: definition?.name ?? '',
      durationMs,
      totalStages: definition?.stages.length ?? 0,
      completedStages: updated.stages.size,
      completedAt: updated.completedAt!,
    });
  }

  private async failInstance(
    instanceId: WorkflowInstanceId,
    stageId: StageId,
    error: Error,
  ): Promise<void> {
    const instance = this.getInstance(instanceId);
    const mutable = cloneMutable(instance);
    mutable.state = WS.Failed;
    mutable.completedAt = new Date().toISOString() as Timestamp;
    mutable.error = Object.freeze({
      code: 'WORKFLOW_EXECUTION_ERROR',
      message: error.message,
      details: [],
      occurredAt: mutable.completedAt,
      stageId,
      recoverable: true,
    });
    const updated = freezeInstance(instance, mutable);
    this.instances.set(instanceId, updated);

    this.metrics.incrementFailed();
    this.metrics.decrementRunning();
    await this.storage.saveWorkflowInstance(updated);
    await this.publishEvent({
      eventType: 'WorkflowError',
      classification: EventClassification.Error,
      workflowInstanceId: instanceId,
      workflowId: updated.workflowId,
      errorCode: 'WORKFLOW_EXECUTION_ERROR',
      errorMessage: error.message,
      stageId,
      recoverable: true,
      occurredAt: mutable.completedAt,
    });
  }

  // ═════════════════════════════════════════════════════════════
  // CAPABILITY PACK REGISTRATION
  // ═════════════════════════════════════════════════════════════

  async registerCapabilityWorkflows(registration: WorkflowRegistration): Promise<void> {
    this.assertNotDisposed();

    for (const template of registration.workflowTemplates) {
      await this.registerDefinition(template);
    }

    for (const policy of registration.policies) {
      this.policyEngine.registerPolicy(policy);
    }

    for (const _stageType of registration.stageTypes) {
      // Register custom stage type handlers
    }

    this.registrations.set(registration.packId, registration);
  }

  getRegistrations(): readonly WorkflowRegistration[] {
    return Array.from(this.registrations.values());
  }

  // ═════════════════════════════════════════════════════════════
  // STAGE HANDLERS
  // ═════════════════════════════════════════════════════════════

  registerHandler(name: string, handler: StageHandler): void {
    this.handlerRegistry.register(name, handler);
  }

  getHandler(name: string): StageHandler | undefined {
    return this.handlerRegistry.get(name);
  }

  // ═════════════════════════════════════════════════════════════
  // CHECKPOINTS
  // ═════════════════════════════════════════════════════════════

  async createCheckpoint(instanceId: WorkflowInstanceId): Promise<void> {
    this.assertNotDisposed();
    const instance = this.getInstance(instanceId);

    const stageStates = new Map<StageId, SS>();
    for (const [id, stage] of instance.stages) {
      stageStates.set(id, stage.state);
    }

    const checkpoint: WorkflowCheckpoint = Object.freeze({
      id: crypto.randomUUID() as any,
      workflowInstanceId: instanceId,
      state: instance.state,
      currentStageId: instance.currentStageId,
      stageStates,
      variables: new Map(),
      createdAt: new Date().toISOString() as Timestamp,
      metadata: Object.freeze({}),
    });

    await this.storage.saveCheckpoint(checkpoint);
    this.metrics.incrementCheckpointCount();

    await this.publishEvent({
      eventType: 'CheckpointCreated',
      classification: EventClassification.Info,
      workflowInstanceId: instanceId,
      checkpointId: checkpoint.id,
      state: instance.state,
      currentStageId: instance.currentStageId,
      createdAt: checkpoint.createdAt,
    });
  }

  // ═════════════════════════════════════════════════════════════
  // QUERIES
  // ═════════════════════════════════════════════════════════════

  getInstance(instanceId: WorkflowInstanceId): WorkflowInstance {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new WorkflowInstanceNotFoundError(instanceId);
    }
    return instance;
  }

  listInstances(): readonly WorkflowInstance[] {
    return Array.from(this.instances.values());
  }

  getMetrics(): WorkflowMetrics {
    return this.metrics.getMetrics();
  }

  getTrace(instanceId: WorkflowInstanceId) {
    return this.trace.getByInstance(instanceId);
  }

  // ═════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ═════════════════════════════════════════════════════════════

  private assertNotDisposed(): void {
    if (this._disposed) throw new WorkflowDisposedError();
  }

  private async publishEvent(
    eventBase: { eventType: string; classification: EventClassification; [key: string]: unknown },
  ): Promise<void> {
    if (!this.eventBus) return;

    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'workflow-runtime',
        aggregateType: 'Workflow',
        version: '1.0.0',
        ...eventBase,
      } as unknown as DomainEventBase;
      await this.eventBus.publish(event);
      this.metrics.incrementEventsPublished();
    } catch {
      // ADR-002: Event publishing failure must not disrupt operations
    }
  }

  dispose(): void {
    this._disposed = true;
    this.instances.clear();
    this.definitions.clear();
    this.stageFSMs.clear();
    this.variablesRuntime.reset();
    this.trace.clear();
  }

  get disposed(): boolean {
    return this._disposed;
  }
}
