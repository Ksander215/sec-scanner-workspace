/** INT-011D: Saga — Types */

export type SagaStatus = 'pending' | 'running' | 'completed' | 'compensating' | 'compensated' | 'failed';

export interface SagaStep<TInput = unknown, TOutput = unknown> {
  /** Step name */
  name: string;
  /** Execute the step */
  execute(input: TInput, context: SagaContext): Promise<TOutput>;
  /** Compensate (rollback) the step */
  compensate(output: TOutput, context: SagaContext): Promise<void>;
  /** Timeout for this step */
  timeoutMs?: number;
  /** Retry policy */
  retryPolicy?: SagaRetryPolicy;
}

export interface SagaRetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffStrategy: 'fixed' | 'exponential';
}

export interface SagaContext {
  sagaId: string;
  correlationId: string;
  tenantId?: string;
  startedAt: Date;
  metadata: Record<string, unknown>;
}

export interface SagaStepResult {
  stepName: string;
  status: 'completed' | 'compensated' | 'failed';
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  output?: unknown;
  error?: string;
  compensatedAt?: Date;
}

export interface SagaDefinition {
  name: string;
  steps: SagaStep[];
  timeoutMs: number;
  retryPolicy: SagaRetryPolicy;
}

export interface SagaResult {
  sagaId: string;
  name: string;
  status: SagaStatus;
  steps: SagaStepResult[];
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs: number;
  error?: string;
}

export interface SagaConfig {
  maxConcurrent: number;
  defaultTimeoutMs: number;
  defaultRetryPolicy: SagaRetryPolicy;
  persistence: boolean;
}
