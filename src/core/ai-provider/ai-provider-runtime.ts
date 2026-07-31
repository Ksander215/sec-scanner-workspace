/**
 * Universal AI Provider Runtime — Main Orchestrator
 * TASK-AIS-006A.000
 *
 * Unified entry point for all AI model interactions.
 * AIS never knows which model answers — it works with the abstraction "AI Model".
 */

import type { InProcessEventBus } from '../events/event-bus.js';
import type { AIProviderRuntimeContracts } from './types.js';
import type {
  AIProviderRuntimeConfig, AIProviderRuntimeState, ExecutionRequest, ExecutionResult,
  StreamChunk, ModelId, ProviderId, ProviderSDK,
} from './types.js';
import { AIProviderRuntimeState as State } from './types.js';
import { ConfigurationError } from './errors.js';

import { ProviderRegistry } from './provider-registry.js';
import { ModelRegistry } from './model-registry.js';
import { ExecutionEngine } from './execution-engine.js';
import { StreamingEngine } from './streaming-engine.js';
import { ContextManager } from './context-manager.js';
import { TokenManager } from './token-manager.js';
import { CostEngine } from './cost-engine.js';
import { RetryEngine } from './retry-engine.js';
import { FailoverEngine } from './failover-engine.js';
import { ParallelEngine } from './parallel-engine.js';
import { CacheEngine } from './cache-engine.js';
import { ToolRuntime } from './tool-runtime.js';
import { PrivacyRuntime } from './privacy-runtime.js';
import { MetricsRuntime } from './metrics-runtime.js';
import { TraceRuntime } from './trace-runtime.js';
import { ProviderRouter } from './provider-router.js';
import { ModelRouter } from './model-router.js';
import { Metrics } from './metrics.js';
import type { MetricsSnapshot } from './metrics.js';

export type { AIProviderRuntimeConfig } from './types.js';

export class AIProviderRuntime {
  private readonly eventBus: InProcessEventBus | null;
  private state: AIProviderRuntimeState = State.Created;

  readonly providerRegistry: ProviderRegistry;
  readonly modelRegistry: ModelRegistry;
  readonly executionEngine: ExecutionEngine;
  readonly streamingEngine: StreamingEngine;
  readonly contextManager: ContextManager;
  readonly tokenManager: TokenManager;
  readonly costEngine: CostEngine;
  readonly retryEngine: RetryEngine;
  readonly failoverEngine: FailoverEngine;
  readonly parallelEngine: ParallelEngine;
  readonly cacheEngine: CacheEngine;
  readonly toolRuntime: ToolRuntime;
  readonly privacyRuntime: PrivacyRuntime;
  readonly metricsRuntime: MetricsRuntime;
  readonly traceRuntime: TraceRuntime;
  readonly providerRouter: ProviderRouter;
  readonly modelRouter: ModelRouter;
  private readonly metrics: Metrics;

  constructor(config: AIProviderRuntimeConfig, deps?: { eventBus?: InProcessEventBus | null; runtimeContracts?: AIProviderRuntimeContracts }) {
    this.eventBus = deps?.eventBus ?? null;
    void deps?.runtimeContracts;

    this.providerRegistry = new ProviderRegistry(config.providerRegistry, this.eventBus);
    this.modelRegistry = new ModelRegistry(config.modelRegistry, this.eventBus);
    this.traceRuntime = new TraceRuntime(config.traceRuntime);
    this.metricsRuntime = new MetricsRuntime();
    this.retryEngine = new RetryEngine(config.retryEngine);
    this.failoverEngine = new FailoverEngine(config.failoverEngine);
    this.cacheEngine = new CacheEngine(config.cacheEngine, this.eventBus);
    this.toolRuntime = new ToolRuntime(this.eventBus);
    this.privacyRuntime = new PrivacyRuntime(config.privacyRuntime, this.eventBus);
    this.tokenManager = new TokenManager(config.tokenManager, this.eventBus);
    this.costEngine = new CostEngine(config.costEngine, {
      getModel: (id: ModelId) => this.modelRegistry.get(id),
    });
    this.contextManager = new ContextManager(config.contextManager, {
      getModel: (id: ModelId) => this.modelRegistry.get(id),
    });
    this.providerRouter = new ProviderRouter(config.defaultProviderId, config.defaultModelId);
    this.modelRouter = new ModelRouter((pid: ProviderId) => this.modelRegistry.listByProvider(pid));

    this.executionEngine = new ExecutionEngine(config.executionEngine, {
      eventBus: this.eventBus,
      getProviderSDK: (pid: ProviderId) => this.providerRegistry.getSDK(pid) as Promise<ProviderSDK | null>,
      getModel: (mid: ModelId) => this.modelRegistry.get(mid),
      recordTokens: (u) => this.tokenManager.record(u),
      recordCost: (c) => this.costEngine.record(c),
      shouldRetry: (err, attempt) => this.retryEngine.shouldRetry(err, attempt),
      getRetryDelay: (attempt) => this.retryEngine.getDelay(attempt),
      recordRetryAttempt: (a) => this.retryEngine.recordAttempt(a),
      getNextProvider: (eid, current) => this.failoverEngine.getNextProvider(eid, current),
      recordFailover: (e) => this.failoverEngine.recordFailover(e),
      startTrace: (tid, eid, pid, mid) => this.traceRuntime.startTrace(tid, eid, pid, mid),
      endTrace: (tid, st, ms, cost) => this.traceRuntime.endTrace(tid, st, ms, cost),
      metricsRecord: (r) => this.metricsRuntime.recordExecution(r),
    });

    this.streamingEngine = new StreamingEngine(config.streamingEngine, {
      getProviderSDK: (pid: string) => this.providerRegistry.getSDK(pid as ProviderId) as Promise<ProviderSDK | null>,
    });

    this.parallelEngine = new ParallelEngine((req) => this.executionEngine.execute(req));

    this.metrics = new Metrics(() => this.metricsRuntime.getSnapshot());
  }

  async initialize(): Promise<void> {
    if (this.state !== State.Created) {
      throw new ConfigurationError('Runtime already initialized');
    }
    this.state = State.Initializing;
    this.state = State.Ready;
  }

  async shutdown(): Promise<void> {
    this.state = State.ShuttingDown;
    this.traceRuntime.clear();
    this.metricsRuntime.reset();
    void this.cacheEngine.clear();
    this.state = State.Shutdown;
  }

  getState(): AIProviderRuntimeState {
    return this.state;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    this.ensureReady();
    return this.executionEngine.execute(request);
  }

  async *stream(request: ExecutionRequest): AsyncIterable<StreamChunk> {
    this.ensureReady();
    yield* this.streamingEngine.stream(request);
  }

  async health(): Promise<{ status: AIProviderRuntimeState; providers: number; models: number }> {
    const providers = await this.providerRegistry.count();
    const models = await this.modelRegistry.count();
    return { status: this.state, providers, models };
  }

  getMetricsSnapshot(): MetricsSnapshot {
    return this.metrics.getSnapshot(
      this.state, 0, 0, 0, 0,
    );
  }

  private ensureReady(): void {
    if (this.state !== State.Ready && this.state !== State.Running) {
      throw new ConfigurationError('Runtime not ready. Current state: ' + this.state);
    }
  }
}
