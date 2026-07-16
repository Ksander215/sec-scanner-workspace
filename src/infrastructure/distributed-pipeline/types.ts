/** INT-011C: Distributed Pipeline — Types */

export type ServiceStatus = 'starting' | 'ready' | 'processing' | 'error' | 'stopping' | 'stopped';

export interface PipelineService<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly version: string;
  readonly stage: string;
  status: ServiceStatus;
  process(input: TInput, context: PipelineContext): Promise<TOutput>;
  healthCheck(): Promise<ServiceHealth>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface PipelineContext {
  pipelineId: string;
  correlationId: string;
  tenantId?: string;
  traceId?: string;
  startedAt: Date;
  metadata: Record<string, unknown>;
  previousStages: StageResult[];
}

export interface StageResult {
  stage: string;
  service: string;
  status: 'success' | 'error' | 'skipped';
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  output?: unknown;
  error?: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeMs: number;
  lastProcessedAt?: Date;
  processedCount: number;
  errorCount: number;
  avgProcessingMs: number;
  details?: Record<string, unknown>;
}

export interface DistributedPipelineConfig {
  services: ServiceRegistration[];
  retryPolicy: { maxRetries: number; backoffMs: number };
  timeoutMs: number;
  parallelStages: boolean;
  circuitBreaker: CircuitBreakerConfig;
}

export interface ServiceRegistration {
  stage: string;
  service: PipelineService;
  required: boolean;
  timeoutMs?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

export interface DistributedPipelineResult {
  pipelineId: string;
  correlationId: string;
  status: 'completed' | 'partial' | 'failed';
  stages: StageResult[];
  startedAt: Date;
  completedAt: Date;
  totalDurationMs: number;
}
