/**
 * Recovery Runtime — Orchestrates crash recovery for AIS.
 *
 * Manages the full recovery lifecycle:
 *   1. Load session (from SessionRuntime)
 *   2. Restore memory (from MemoryRuntime)
 *   3. Restore pipeline state (from CheckpointEngine)
 *   4. Continue execution (return recovery result with restored state)
 *
 * Conforms to:
 * - ADR-002 (Event-Driven Architecture)
 * - ARC-001.001 §5 (Module Architecture)
 * - INV-012 (Events carry classification)
 */
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { CheckpointEngine } from '../checkpoint/checkpoint-engine.js';
import type { SessionRuntime } from '../session/session-runtime.js';
import type { MemoryRuntime } from '../memory/memory-runtime.js';
import type { Checkpoint } from '../checkpoint/types.js';

import type { RecoveryId, RecoveryPlan, RecoveryStep, SerializableRecoveryPlan, RestoredState } from './types.js';
import { RecoveryStatus } from './types.js';
import type { RecoveryStrategy } from './recovery-strategy.js';
import { FullRecoveryStrategy } from './recovery-strategy.js';
import { MemoryOnlyRecoveryStrategy } from './recovery-strategy.js';
import {
  RecoveryError,
  SessionRecoveryError,
  MemoryRecoveryError,
  PipelineRecoveryError,
} from './errors.js';

import type {
  RecoveryStarted,
  RecoveryStepCompleted,
  RecoveryStepFailed,
  RecoveryCompleted,
  RecoveryFailed,
} from './events.js';

// ─── Configuration ──────────────────────────────────────────

export interface RecoveryRuntimeConfig {
  readonly eventBus?: EventBus;
  readonly checkpointEngine?: CheckpointEngine;
  readonly sessionRuntime?: SessionRuntime;
  readonly memoryRuntime?: MemoryRuntime;
  readonly strategy?: RecoveryStrategy;
}

// ─── Constants ───────────────────────────────────────────────
const CURRENT_VERSION = '1.0.0';

/** Brand a plain string as a RecoveryId */
function brandRecoveryId(id: string): RecoveryId {
  return id as unknown as RecoveryId;
}

/** Unbrand a RecoveryId back to a plain string */
function unbrandRecoveryId(id: RecoveryId): string {
  return id as unknown as string;
}

// ─── RecoveryRuntime ────────────────────────────────────────

export class RecoveryRuntime {
  private readonly eventBus?: EventBus;
  private readonly checkpointEngine?: CheckpointEngine;
  private readonly sessionRuntime?: SessionRuntime;
  private readonly memoryRuntime?: MemoryRuntime;
  private readonly strategy: RecoveryStrategy;
  private readonly recoveries = new Map<string, RecoveryPlan>();

  constructor(config: RecoveryRuntimeConfig = {}) {
    this.eventBus = config.eventBus;
    this.checkpointEngine = config.checkpointEngine;
    this.sessionRuntime = config.sessionRuntime;
    this.memoryRuntime = config.memoryRuntime;
    this.strategy = config.strategy ?? new FullRecoveryStrategy();
  }

  // ─── Main Recovery Entry Point ─────────────────────────────

  /**
   * Initiate recovery for the given execution.
   *
   * Creates a RecoveryPlan, executes each step sequentially, and
   * returns the final plan with status Ready (success) or Failed (error).
   */
  async recover(
    executionId: string,
    options?: { checkpointId?: string; sessionId?: string },
  ): Promise<RecoveryPlan> {
    const recoveryId = brandRecoveryId(crypto.randomUUID());
    const now = new Date().toISOString();

    // Load checkpoint if checkpointId is provided
    let checkpoint: Checkpoint | undefined;
    if (options?.checkpointId !== undefined && this.checkpointEngine !== undefined) {
      checkpoint = await this.checkpointEngine.load(options.checkpointId) ?? undefined;
    }

    // Select an appropriate strategy if the default cannot handle this scenario
    const activeStrategy = this.selectStrategy(checkpoint);
    const steps = activeStrategy.createSteps(checkpoint);

    // Build the initial plan
    let plan: RecoveryPlan = {
      recoveryId,
      executionId,
      sessionId: options?.sessionId,
      checkpointId: options?.checkpointId,
      status: RecoveryStatus.Pending,
      createdAt: now,
      steps: Object.freeze([...steps]),
      currentStepIndex: 0,
    };

    this.recoveries.set(unbrandRecoveryId(recoveryId), plan);

    // Publish RecoveryStarted
    await this.publishEvent<RecoveryStarted>({
      eventType: 'RecoveryStarted',
      classification: 'action' as RecoveryStarted['classification'],
      payload: {
        recoveryId: unbrandRecoveryId(recoveryId),
        executionId,
        checkpointId: options?.checkpointId,
      },
    });

    // Transition to running
    plan = this.updatePlan(plan, {
      status: RecoveryStatus.RestoringSession,
      startedAt: new Date().toISOString(),
    });
    this.recoveries.set(unbrandRecoveryId(recoveryId), plan);

    // Execute steps sequentially
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]!;
      const stepIndex = i;

      // Mark step as running
      const runningStep = this.updateStep(step, {
        status: 'running',
        startedAt: new Date().toISOString(),
      });
      const updatedSteps = this.replaceStep(plan.steps, stepIndex, runningStep);
      plan = this.updatePlan(plan, {
        steps: updatedSteps,
        currentStepIndex: stepIndex,
        status: this.mapStepNameToStatus(step.name),
      });
      this.recoveries.set(unbrandRecoveryId(recoveryId), plan);

      try {
        await this.executeStep(plan, runningStep);

        // Mark step as completed
        const completedStep = this.updateStep(runningStep, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
        const completedSteps = this.replaceStep(plan.steps, stepIndex, completedStep);
        plan = this.updatePlan(plan, { steps: completedSteps });
        this.recoveries.set(unbrandRecoveryId(recoveryId), plan);

        // Publish step completed
        await this.publishEvent<RecoveryStepCompleted>({
          eventType: 'RecoveryStepCompleted',
          classification: 'result' as RecoveryStepCompleted['classification'],
          payload: {
            recoveryId: unbrandRecoveryId(recoveryId),
            stepName: step.name,
            stepIndex,
          },
        });
      } catch (err) {
        const errorInfo = {
          code: err instanceof RecoveryError ? err.code : 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : String(err),
        };

        // Mark step as failed
        const failedStep = this.updateStep(runningStep, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: errorInfo,
        });
        const failedSteps = this.replaceStep(plan.steps, stepIndex, failedStep);
        const now2 = new Date().toISOString();
        plan = this.updatePlan(plan, {
          steps: failedSteps,
          status: RecoveryStatus.Failed,
          failedAt: now2,
          error: errorInfo,
        });
        this.recoveries.set(unbrandRecoveryId(recoveryId), plan);

        // Publish step failed
        await this.publishEvent<RecoveryStepFailed>({
          eventType: 'RecoveryStepFailed',
          classification: 'error' as RecoveryStepFailed['classification'],
          payload: {
            recoveryId: unbrandRecoveryId(recoveryId),
            stepName: step.name,
            stepIndex,
            error: errorInfo,
          },
        });

        // Publish recovery failed
        await this.publishEvent<RecoveryFailed>({
          eventType: 'RecoveryFailed',
          classification: 'error' as RecoveryFailed['classification'],
          payload: {
            recoveryId: unbrandRecoveryId(recoveryId),
            executionId,
            error: errorInfo,
          },
        });

        return plan;
      }
    }

    // All steps completed — build the restored state
    const restoredState = this.buildRestoredState(plan, checkpoint);
    const now3 = new Date().toISOString();
    plan = this.updatePlan(plan, {
      status: RecoveryStatus.Ready,
      completedAt: now3,
      restoredState,
    });
    this.recoveries.set(unbrandRecoveryId(recoveryId), plan);

    // Publish RecoveryCompleted
    await this.publishEvent<RecoveryCompleted>({
      eventType: 'RecoveryCompleted',
      classification: 'result' as RecoveryCompleted['classification'],
      payload: {
        recoveryId: unbrandRecoveryId(recoveryId),
        executionId,
        restoredState,
      },
    });

    return plan;
  }

  // ─── Step Execution ────────────────────────────────────────

  /**
   * Route a step to the appropriate handler by name.
   */
  private async executeStep(plan: RecoveryPlan, step: RecoveryStep): Promise<void> {
    switch (step.name) {
      case 'load-session':
        await this.executeLoadSession(plan);
        break;
      case 'restore-memory':
        await this.executeRestoreMemory(plan);
        break;
      case 'restore-pipeline':
        await this.executeRestorePipeline(plan);
        break;
      case 'prepare-continuation':
        await this.executePrepareContinuation(plan);
        break;
      default:
        throw new RecoveryError(
          `Unknown recovery step: ${step.name}`,
          'UNKNOWN_RECOVERY_STEP',
          unbrandRecoveryId(plan.recoveryId),
        );
    }
  }

  /**
   * Load session state from SessionRuntime.
   */
  private async executeLoadSession(plan: RecoveryPlan): Promise<void> {
    if (this.sessionRuntime === undefined) {
      return;
    }

    if (plan.sessionId === undefined) {
      return;
    }

    try {
      const session = this.sessionRuntime.getSession(plan.sessionId);
      if (session === null) {
        await this.sessionRuntime.loadSession(plan.sessionId);
      }
    } catch (err) {
      throw new SessionRecoveryError(
        `Failed to load session ${plan.sessionId}: ${err instanceof Error ? err.message : String(err)}`,
        unbrandRecoveryId(plan.recoveryId),
      );
    }
  }

  /**
   * Restore memory layers from MemoryRuntime.
   */
  private async executeRestoreMemory(plan: RecoveryPlan): Promise<void> {
    if (this.memoryRuntime === undefined) {
      return;
    }

    try {
      this.memoryRuntime.getWorkingMemory(plan.executionId);

      if (plan.sessionId !== undefined) {
        this.memoryRuntime.getSessionMemory(plan.sessionId);
      }
    } catch (err) {
      throw new MemoryRecoveryError(
        `Failed to restore memory for execution ${plan.executionId}: ${err instanceof Error ? err.message : String(err)}`,
        unbrandRecoveryId(plan.recoveryId),
      );
    }
  }

  /**
   * Restore pipeline state from CheckpointEngine.
   */
  private async executeRestorePipeline(plan: RecoveryPlan): Promise<void> {
    if (this.checkpointEngine === undefined) {
      return;
    }

    if (plan.checkpointId === undefined) {
      return;
    }

    try {
      await this.checkpointEngine.load(plan.checkpointId);
    } catch (err) {
      throw new PipelineRecoveryError(
        `Failed to restore pipeline from checkpoint ${plan.checkpointId}: ${err instanceof Error ? err.message : String(err)}`,
        unbrandRecoveryId(plan.recoveryId),
      );
    }
  }

  /**
   * Prepare the execution context for continuation.
   * Verifies all restored components are in a consistent state.
   */
  private async executePrepareContinuation(plan: RecoveryPlan): Promise<void> {
    if (plan.sessionId !== undefined && this.sessionRuntime !== undefined) {
      const session = this.sessionRuntime.getSession(plan.sessionId);
      if (session === null) {
        throw new RecoveryError(
          `Session ${plan.sessionId} not available after recovery`,
          'CONTINUATION_SESSION_MISSING',
          unbrandRecoveryId(plan.recoveryId),
        );
      }
    }

    if (plan.checkpointId !== undefined && this.checkpointEngine !== undefined) {
      const checkpoint = await this.checkpointEngine.load(plan.checkpointId);
      if (checkpoint === null) {
        throw new RecoveryError(
          `Checkpoint ${plan.checkpointId} not available after recovery`,
          'CONTINUATION_CHECKPOINT_MISSING',
          unbrandRecoveryId(plan.recoveryId),
        );
      }
    }
  }

  // ─── Strategy Selection ────────────────────────────────────

  /**
   * Select the appropriate strategy based on what is available.
   */
  private selectStrategy(checkpoint?: Checkpoint): RecoveryStrategy {
    if (this.strategy.canRecover(checkpoint)) {
      return this.strategy;
    }

    const fallbackStrategies: RecoveryStrategy[] = [
      new FullRecoveryStrategy(),
      new MemoryOnlyRecoveryStrategy(),
    ];

    for (const strategy of fallbackStrategies) {
      if (strategy.canRecover(checkpoint)) {
        return strategy;
      }
    }

    return new MemoryOnlyRecoveryStrategy();
  }

  // ─── Restored State Builder ────────────────────────────────

  /**
   * Build the RestoredState from the recovery context.
   */
  private buildRestoredState(plan: RecoveryPlan, checkpoint?: Checkpoint): RestoredState {
    const completedSteps = plan.steps
      .filter((s) => s.status === 'completed')
      .map((s) => s.name);

    const pendingSteps = plan.steps
      .filter((s) => s.status === 'pending' || s.status === 'skipped')
      .map((s) => s.name);

    return Object.freeze({
      executionId: plan.executionId,
      goalId: checkpoint?.goalId ?? '',
      executionState: RecoveryStatus.Ready,
      variables: Object.freeze({}),
      completedSteps: Object.freeze(completedSteps),
      pendingSteps: Object.freeze(pendingSteps),
      sessionId: plan.sessionId,
    });
  }

  // ─── State Update Helpers ──────────────────────────────────

  private updatePlan(plan: RecoveryPlan, updates: Partial<RecoveryPlan>): RecoveryPlan {
    return Object.freeze({
      ...plan,
      ...updates,
      steps: updates.steps ?? plan.steps,
    });
  }

  private updateStep(step: RecoveryStep, updates: Partial<RecoveryStep>): RecoveryStep {
    return Object.freeze({
      ...step,
      ...updates,
    });
  }

  private replaceStep(
    steps: readonly RecoveryStep[],
    index: number,
    replacement: RecoveryStep,
  ): readonly RecoveryStep[] {
    const copy = [...steps];
    copy[index] = replacement;
    return Object.freeze(copy);
  }

  private mapStepNameToStatus(stepName: string): RecoveryStatus {
    switch (stepName) {
      case 'load-session':
        return RecoveryStatus.RestoringSession;
      case 'restore-memory':
        return RecoveryStatus.RestoringMemory;
      case 'restore-pipeline':
        return RecoveryStatus.RestoringPipeline;
      case 'prepare-continuation':
        return RecoveryStatus.RestoringPipeline;
      default:
        return RecoveryStatus.Pending;
    }
  }

  // ─── Querying ──────────────────────────────────────────────

  /** Get a recovery plan by ID, or null if not found. */
  getRecovery(recoveryId: string): RecoveryPlan | null {
    return this.recoveries.get(recoveryId) ?? null;
  }

  /** List all in-memory recovery plans. */
  getRecoveries(): readonly RecoveryPlan[] {
    return Array.from(this.recoveries.values());
  }

  // ─── Serialization ─────────────────────────────────────────

  /** Convert a branded RecoveryPlan to a plain SerializableRecoveryPlan. */
  serializePlan(plan: RecoveryPlan): SerializableRecoveryPlan {
    return {
      recoveryId: unbrandRecoveryId(plan.recoveryId),
      executionId: plan.executionId,
      sessionId: plan.sessionId,
      checkpointId: plan.checkpointId,
      status: plan.status,
      createdAt: plan.createdAt,
      startedAt: plan.startedAt,
      completedAt: plan.completedAt,
      failedAt: plan.failedAt,
      error: plan.error,
      steps: plan.steps,
      currentStepIndex: plan.currentStepIndex,
      restoredState: plan.restoredState,
    };
  }

  /** Convert a plain SerializableRecoveryPlan back to a branded RecoveryPlan. */
  deserializePlan(data: SerializableRecoveryPlan): RecoveryPlan {
    return {
      recoveryId: brandRecoveryId(data.recoveryId),
      executionId: data.executionId,
      sessionId: data.sessionId,
      checkpointId: data.checkpointId,
      status: data.status,
      createdAt: data.createdAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      failedAt: data.failedAt,
      error: data.error,
      steps: data.steps,
      currentStepIndex: data.currentStepIndex,
      restoredState: data.restoredState,
    };
  }

  // ─── Event Publishing ──────────────────────────────────────

  /**
   * Publish a domain event through the event bus (fire-and-forget).
   * Non-throwing — errors from event publishing are silently swallowed
   * to avoid disrupting recovery operations.
   */
  private async publishEvent<T extends { eventType: string }>(
    eventBase: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (this.eventBus === undefined) {
      return;
    }

    try {
      const payload = (eventBase as unknown as { payload: { recoveryId: string } }).payload;
      const aggregateId = payload.recoveryId;

      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId,
        aggregateType: 'Recovery',
        version: CURRENT_VERSION,
        ...eventBase,
      } as unknown as DomainEventBase;

      await this.eventBus.publish(event);
    } catch {
      // ADR-002: Event publishing failure must not disrupt recovery operations
    }
  }
}
