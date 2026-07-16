/** INT-011C: Distributed Pipeline — Engine */
import type {
  PipelineService, PipelineContext, StageResult, ServiceHealth,
  DistributedPipelineConfig, DistributedPipelineResult, CircuitBreakerConfig,
} from './types.js';

export class DistributedPipeline {
  private services: Map<string, PipelineService> = new Map();
  private stageOrder: string[] = [];
  private config: DistributedPipelineConfig;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor(config: Partial<DistributedPipelineConfig> & { services?: PipelineService[] } = {}) {
    this.config = {
      services: [],
      retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      timeoutMs: 300000,
      parallelStages: false,
      circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30000, halfOpenRequests: 1 },
      ...config,
    };

    if (config.services) {
      for (const svc of config.services) {
        this.registerService(svc);
      }
    }
  }

  /** Register a pipeline service */
  registerService(service: PipelineService, stage?: string): void {
    const stageName = stage ?? service.stage;
    this.services.set(stageName, service);
    if (!this.stageOrder.includes(stageName)) {
      this.stageOrder.push(stageName);
    }
    this.circuitBreakers.set(stageName, {
      state: 'closed',
      failureCount: 0,
      lastFailureAt: 0,
      halfOpenCount: 0,
    });
  }

  /** Execute the full distributed pipeline */
  async execute<T = unknown>(input: unknown, options?: { tenantId?: string; correlationId?: string }): Promise<DistributedPipelineResult> {
    const pipelineId = crypto.randomUUID();
    const correlationId = options?.correlationId ?? crypto.randomUUID();
    const startedAt = new Date();
    const stageResults: StageResult[] = [];

    const context: PipelineContext = {
      pipelineId,
      correlationId,
      tenantId: options?.tenantId,
      startedAt,
      metadata: {},
      previousStages: stageResults,
    };

    let currentInput = input;
    let overallStatus: 'completed' | 'partial' | 'failed' = 'completed';

    for (const stage of this.stageOrder) {
      const service = this.services.get(stage);
      if (!service) continue;

      // Check circuit breaker
      const cb = this.circuitBreakers.get(stage)!;
      if (cb.state === 'open') {
        if (Date.now() - cb.lastFailureAt > this.config.circuitBreaker.resetTimeoutMs) {
          cb.state = 'half-open';
          cb.halfOpenCount = 0;
        } else {
          stageResults.push({
            stage,
            service: service.name,
            status: 'skipped',
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 0,
            error: 'Circuit breaker open',
          });
          overallStatus = 'partial';
          continue;
        }
      }

      const stageStart = new Date();
      try {
        const result = await this.executeWithTimeout(
          service.process(currentInput, context),
          this.config.timeoutMs,
        );

        const stageEnd = new Date();
        stageResults.push({
          stage,
          service: service.name,
          status: 'success',
          startedAt: stageStart,
          completedAt: stageEnd,
          durationMs: stageEnd.getTime() - stageStart.getTime(),
          output: result,
        });

        currentInput = result;

        // Reset circuit breaker on success
        cb.failureCount = 0;
        cb.state = 'closed';
      } catch (err) {
        const stageEnd = new Date();
        stageResults.push({
          stage,
          service: service.name,
          status: 'error',
          startedAt: stageStart,
          completedAt: stageEnd,
          durationMs: stageEnd.getTime() - stageStart.getTime(),
          error: (err as Error).message,
        });

        // Update circuit breaker
        cb.failureCount++;
        cb.lastFailureAt = Date.now();
        if (cb.failureCount >= this.config.circuitBreaker.failureThreshold) {
          cb.state = 'open';
        }

        overallStatus = 'failed';
        break;
      }
    }

    const completedAt = new Date();
    return {
      pipelineId,
      correlationId,
      status: overallStatus,
      stages: stageResults,
      startedAt,
      completedAt,
      totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }

  /** Start all services */
  async startAll(): Promise<void> {
    for (const service of this.services.values()) {
      await service.start();
    }
  }

  /** Stop all services */
  async stopAll(): Promise<void> {
    for (const service of this.services.values()) {
      await service.stop();
    }
  }

  /** Get health of all services */
  async getHealth(): Promise<Record<string, ServiceHealth>> {
    const health: Record<string, ServiceHealth> = {};
    for (const [stage, service] of this.services) {
      health[stage] = await service.healthCheck();
    }
    return health;
  }

  /** Get pipeline topology */
  getTopology(): { stages: string[]; services: string[] } {
    return {
      stages: [...this.stageOrder],
      services: [...this.services.values()].map(s => s.name),
    };
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureAt: number;
  halfOpenCount: number;
}
