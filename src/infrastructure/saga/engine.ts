/** INT-011D: Saga — Orchestration Engine */
import type { SagaStep, SagaContext, SagaStepResult, SagaResult, SagaConfig, SagaStatus } from './types.js';

const DEFAULT_CONFIG: SagaConfig = {
  maxConcurrent: 10,
  defaultTimeoutMs: 300000,
  defaultRetryPolicy: { maxRetries: 3, backoffMs: 1000, backoffStrategy: 'exponential' },
  persistence: true,
};

export class SagaOrchestrator {
  private config: SagaConfig;
  private activeSagas: Map<string, SagaResult> = new Map();
  private completedSagas: SagaResult[] = [];

  constructor(config?: Partial<SagaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Execute a saga with compensation support */
  async execute<TInput = unknown>(
    name: string,
    steps: SagaStep[],
    input: TInput,
    options?: { correlationId?: string; tenantId?: string; metadata?: Record<string, unknown> },
  ): Promise<SagaResult> {
    const sagaId = crypto.randomUUID();
    const context: SagaContext = {
      sagaId,
      correlationId: options?.correlationId ?? crypto.randomUUID(),
      tenantId: options?.tenantId,
      startedAt: new Date(),
      metadata: options?.metadata ?? {},
    };

    const result: SagaResult = {
      sagaId,
      name,
      status: 'running',
      steps: [],
      startedAt: new Date(),
      totalDurationMs: 0,
    };

    this.activeSagas.set(sagaId, result);
    let currentInput: unknown = input;
    const completedSteps: Array<{ step: SagaStep; output: unknown }> = [];

    try {
      // Execute steps sequentially
      for (const step of steps) {
        const stepResult = await this.executeStep(step, currentInput, context);
        result.steps.push(stepResult);

        if (stepResult.status === 'failed') {
          // Start compensation
          result.status = 'compensating';
          await this.compensate(completedSteps, context, result);
          result.status = 'compensated';
          result.error = stepResult.error;
          break;
        }

        completedSteps.push({ step, output: stepResult.output });
        currentInput = stepResult.output;
      }

      if (result.status === 'running') {
        result.status = 'completed';
      }
    } catch (err) {
      result.status = 'compensating';
      await this.compensate(completedSteps, context, result);
      result.status = 'failed';
      result.error = (err as Error).message;
    }

    result.completedAt = new Date();
    result.totalDurationMs = result.completedAt.getTime() - result.startedAt.getTime();

    this.activeSagas.delete(sagaId);
    if (this.config.persistence) {
      this.completedSagas.push(result);
    }

    return result;
  }

  /** Get saga by ID */
  getSaga(sagaId: string): SagaResult | undefined {
    return this.activeSagas.get(sagaId) ?? this.completedSagas.find(s => s.sagaId === sagaId);
  }

  /** Get all active sagas */
  getActiveSagas(): SagaResult[] {
    return [...this.activeSagas.values()];
  }

  /** Get completed sagas */
  getCompletedSagas(limit?: number): SagaResult[] {
    const results = [...this.completedSagas];
    return limit ? results.slice(-limit) : results;
  }

  /** Get saga statistics */
  getStatistics(): { active: number; completed: number; byStatus: Record<SagaStatus, number> } {
    const byStatus: Record<SagaStatus, number> = {
      pending: 0, running: 0, completed: 0, compensating: 0, compensated: 0, failed: 0,
    };
    for (const saga of [...this.activeSagas.values(), ...this.completedSagas]) {
      byStatus[saga.status]++;
    }
    return { active: this.activeSagas.size, completed: this.completedSagas.length, byStatus };
  }

  private async executeStep(step: SagaStep, input: unknown, context: SagaContext): Promise<SagaStepResult> {
    const startedAt = new Date();
    const retryPolicy = step.retryPolicy ?? this.config.defaultRetryPolicy;
    let lastError: string | undefined;
    let attempts = 0;

    while (attempts <= retryPolicy.maxRetries) {
      try {
        const timeoutMs = step.timeoutMs ?? this.config.defaultTimeoutMs;
        const output = await this.withTimeout(
          step.execute(input as never, context),
          timeoutMs,
        );

        const completedAt = new Date();
        return {
          stepName: step.name,
          status: 'completed',
          startedAt,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          output,
        };
      } catch (err) {
        lastError = (err as Error).message;
        attempts++;
        if (attempts <= retryPolicy.maxRetries) {
          const delay = this.calculateDelay(attempts, retryPolicy);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    const completedAt = new Date();
    return {
      stepName: step.name,
      status: 'failed',
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      error: lastError,
    };
  }

  private async compensate(
    completedSteps: Array<{ step: SagaStep; output: unknown }>,
    context: SagaContext,
    result: SagaResult,
  ): Promise<void> {
    // Compensate in reverse order
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const { step, output } = completedSteps[i];
      try {
        await step.compensate(output as never, context);
        const stepResult = result.steps.find(s => s.stepName === step.name);
        if (stepResult) {
          stepResult.compensatedAt = new Date();
          stepResult.status = 'compensated';
        }
      } catch (err) {
        const stepResult = result.steps.find(s => s.stepName === step.name);
        if (stepResult) {
          stepResult.status = 'failed';
          stepResult.error = `Compensation failed: ${(err as Error).message}`;
        }
      }
    }
  }

  private calculateDelay(attempt: number, policy: { backoffMs: number; backoffStrategy: 'fixed' | 'exponential' }): number {
    if (policy.backoffStrategy === 'exponential') {
      return policy.backoffMs * Math.pow(2, attempt - 1);
    }
    return policy.backoffMs;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Step timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }
}
