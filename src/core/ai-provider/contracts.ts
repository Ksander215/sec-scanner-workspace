/**
 * Universal AI Provider Runtime — Public Contracts
 * TASK-AIS-006A.000
 *
 * Public-facing interfaces for every subsystem.
 * These are the ONLY APIs other Runtimes may depend on.
 */

import type { Timestamp } from '../types/common.js';
import type {
  ProviderId, ModelId, ExecutionId, StreamId, TraceId, PolicyId, CacheKeyId, TokenAccountId,
  ProviderDescriptor, ModelDescriptor, ModelFilter, ProviderHealthCheck,
  ExecutionRequest, ExecutionResult, StreamChunk,
  ContextManagementRequest, ContextManagementResult, ContextWindow,
  TokenCountResult, TokenAccount, TokenType, CostReport, CostDetail, CostLimitPolicy,
  RetryConfig, RetryAttempt, FailoverChain, FailoverEvent,
  ParallelExecutionRequest, ParallelExecutionResult,
  CacheEntry, CacheStats, CacheType,
  ToolInvocation, ToolDefinition,
  PrivacyPolicy, PrivacyEvaluation, PrivacyLevel,
  ExecutionTrace, AIProviderMetrics,
  ExecutionStatus, StreamState, ContextStrategy,
  AggregationMethod,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════
// PROVIDER REGISTRY CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IProviderRegistry {
  register(descriptor: ProviderDescriptor, sdk: unknown): Promise<void>;
  unregister(providerId: ProviderId): Promise<void>;
  get(providerId: ProviderId): Promise<ProviderDescriptor | null>;
  getByName(name: string): Promise<ProviderDescriptor | null>;
  list(): Promise<readonly ProviderDescriptor[]>;
  getByType(type: string): Promise<readonly ProviderDescriptor[]>;
  healthCheck(providerId: ProviderId): Promise<ProviderHealthCheck>;
  healthCheckAll(): Promise<ReadonlyMap<string, ProviderHealthCheck>>;
  getSDK(providerId: ProviderId): Promise<unknown | null>;
  count(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// MODEL REGISTRY CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IModelRegistry {
  register(descriptor: ModelDescriptor): Promise<void>;
  unregister(modelId: ModelId): Promise<void>;
  get(modelId: ModelId): Promise<ModelDescriptor | null>;
  getByName(name: string): Promise<ModelDescriptor | null>;
  list(filter?: ModelFilter): Promise<readonly ModelDescriptor[]>;
  listByProvider(providerId: ProviderId): Promise<readonly ModelDescriptor[]>;
  getByCapability(capability: string): Promise<readonly ModelDescriptor[]>;
  getDefaultModel(): Promise<ModelDescriptor | null>;
  setDefaultModel(modelId: ModelId): Promise<void>;
  setModelAvailability(modelId: ModelId, available: boolean): Promise<void>;
  count(filter?: ModelFilter): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IExecutionEngine {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  cancel(executionId: ExecutionId): Promise<void>;
  getStatus(executionId: ExecutionId): Promise<ExecutionStatus | null>;
  listActive(): Promise<readonly ExecutionId[]>;
  count(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// STREAMING ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IStreamingEngine {
  stream(request: ExecutionRequest): AsyncIterable<StreamChunk>;
  cancel(streamId: StreamId): Promise<void>;
  pause(streamId: StreamId): Promise<void>;
  resume(streamId: StreamId): Promise<void>;
  getBuffer(streamId: StreamId): Promise<string>;
  merge(chunks: readonly StreamChunk[]): string;
  getStatus(streamId: StreamId): Promise<StreamState | null>;
  listActive(): Promise<readonly StreamId[]>;
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT MANAGER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IContextManager {
  manage(request: ContextManagementRequest): Promise<ContextManagementResult>;
  getWindow(modelId: ModelId): Promise<ContextWindow | null>;
  setStrategy(strategy: ContextStrategy): void;
  getStrategy(): ContextStrategy;
  estimateTokens(messages: ExecutionRequest['messages']): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// TOKEN MANAGER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ITokenManager {
  count(text: string, modelId: ModelId): Promise<TokenCountResult>;
  record(usage: TokenCountResult): Promise<void>;
  getAccount(id?: TokenAccountId): Promise<TokenAccount>;
  reset(): Promise<void>;
  getByType(type: TokenType): Promise<number>;
  getByProvider(providerId: string): Promise<number>;
  getByModel(modelId: string): Promise<number>;
  getBudget(): Promise<number>;
  getUsed(): Promise<number>;
  getRemaining(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// COST ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ICostEngine {
  calculate(inputTokens: number, outputTokens: number, modelId: ModelId): Promise<CostDetail>;
  record(cost: CostDetail): Promise<void>;
  getReport(periodStart?: Timestamp, periodEnd?: Timestamp): Promise<CostReport>;
  getByProvider(providerId: string): Promise<number>;
  getByModel(modelId: string): Promise<number>;
  getTotal(): Promise<number>;
  setLimit(policy: CostLimitPolicy): Promise<void>;
  removeLimit(id: string): Promise<void>;
  checkLimit(): Promise<{ withinLimit: boolean; usage: number; limit: number }>;
}

// ═══════════════════════════════════════════════════════════════════
// RETRY ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IRetryEngine {
  getConfig(): RetryConfig;
  setConfig(config: Partial<RetryConfig>): void;
  shouldRetry(error: Error, attempt: number): boolean;
  getDelay(attempt: number): number;
  recordAttempt(attempt: RetryAttempt): void;
  getAttempts(executionId: string): readonly RetryAttempt[];
  reset(executionId: string): void;
}

// ═══════════════════════════════════════════════════════════════════
// FAILOVER ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IFailoverEngine {
  defineChain(chain: FailoverChain): Promise<void>;
  removeChain(chainId: string): Promise<void>;
  getNextProvider(executionId: ExecutionId, currentProviderId: ProviderId): Promise<{ providerId: ProviderId; modelId: ModelId } | null>;
  recordFailover(event: FailoverEvent): void;
  getFailovers(executionId: string): readonly FailoverEvent[];
  getDefaultChain(): FailoverChain | null;
}

// ═══════════════════════════════════════════════════════════════════
// PARALLEL ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IParallelEngine {
  execute(request: ParallelExecutionRequest): Promise<ParallelExecutionResult>;
  aggregate(results: readonly ExecutionResult[], method: AggregationMethod): Promise<{ content: string; confidence: number }>;
}

// ═══════════════════════════════════════════════════════════════════
// CACHE ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ICacheEngine {
  get(key: CacheKeyId): Promise<CacheEntry | null>;
  set(entry: Omit<CacheEntry, 'hitCount' | 'lastAccessedAt'>): Promise<void>;
  invalidate(key: CacheKeyId): Promise<void>;
  invalidateByType(type: CacheType): Promise<void>;
  invalidateByModel(modelId: ModelId): Promise<void>;
  clear(): Promise<void>;
  getStats(): CacheStats;
  lookup(messages: ExecutionRequest['messages'], modelId: ModelId): Promise<CacheEntry | null>;
}

// ═══════════════════════════════════════════════════════════════════
// TOOL RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IToolRuntime {
  invoke(executionId: ExecutionId, toolCallId: string, toolName: string, args: string): Promise<string>;
  getInvocation(executionId: ExecutionId): Promise<readonly ToolInvocation[]>;
  registerTool(definition: ToolDefinition, handler: (args: string) => Promise<string>): void;
  unregisterTool(name: string): void;
  listTools(): readonly ToolDefinition[];
}

// ═══════════════════════════════════════════════════════════════════
// PRIVACY RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IPrivacyRuntime {
  evaluate(providerId: ProviderId, dataTypes: readonly string[]): Promise<PrivacyEvaluation>;
  addPolicy(policy: PrivacyPolicy): Promise<void>;
  removePolicy(policyId: PolicyId): Promise<void>;
  getPolicy(policyId: PolicyId): Promise<PrivacyPolicy | null>;
  listPolicies(): Promise<readonly PrivacyPolicy[]>;
  setDefaultLevel(level: PrivacyLevel): void;
  getDefaultLevel(): PrivacyLevel;
}

// ═══════════════════════════════════════════════════════════════════
// METRICS RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IMetricsRuntime {
  recordExecution(result: ExecutionResult): void;
  recordStreamChunk(chunk: StreamChunk): void;
  recordRetry(): void;
  recordFailover(): void;
  recordCacheHit(): void;
  recordCacheMiss(): void;
  recordHallucination(): void;
  recordToolCall(): void;
  getSnapshot(): AIProviderMetrics;
  reset(): void;
}

// ═══════════════════════════════════════════════════════════════════
// TRACE RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ITraceRuntime {
  startTrace(traceId: TraceId, executionId: ExecutionId, providerId: ProviderId, modelId: ModelId): void;
  endTrace(traceId: TraceId, status: ExecutionStatus, durationMs: number, cost: number): void;
  addPhase(traceId: TraceId, phase: TracePhase): void;
  addRetry(traceId: TraceId, attempt: RetryAttempt): void;
  addFailover(traceId: TraceId, event: FailoverEvent): void;
  addToolInvocation(traceId: TraceId, invocation: ToolInvocation): void;
  getTrace(traceId: TraceId): ExecutionTrace | null;
  listTraces(filter?: Partial<{ executionId: string; providerId: string; modelId: string }>): readonly ExecutionTrace[];
  clear(): void;
}

/** Trace phase for adding to trace */
interface TracePhase {
  readonly name: string;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly durationMs: number;
  readonly status: ExecutionStatus;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER ROUTER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IProviderRouter {
  route(request: ExecutionRequest): Promise<{ providerId: ProviderId; modelId: ModelId }>;
  addRule(rule: RoutingRule): void;
  removeRule(ruleId: string): void;
  listRules(): readonly RoutingRule[];
}

/** Routing rule for provider selection */
interface RoutingRule {
  readonly id: string;
  readonly name: string;
  readonly condition: (request: ExecutionRequest) => boolean;
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly priority: number;
}

// ═══════════════════════════════════════════════════════════════════
// MODEL ROUTER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IModelRouter {
  selectModel(providerId: ProviderId, requirements: Readonly<Record<string, unknown>>): Promise<ModelDescriptor | null>;
  addPreference(preference: ModelPreference): void;
  removePreference(modelId: ModelId): void;
  getPreferences(): readonly ModelPreference[];
}

/** Model preference for routing */
interface ModelPreference {
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly weight: number;
  readonly capabilities: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME CONTRACTS BUNDLE
// ═══════════════════════════════════════════════════════════════════

/** Public contract bundle — the complete API surface of AI Provider Runtime */
export interface AIProviderRuntimePublicContracts {
  readonly providerRegistry: IProviderRegistry;
  readonly modelRegistry: IModelRegistry;
  readonly executionEngine: IExecutionEngine;
  readonly streamingEngine: IStreamingEngine;
  readonly contextManager: IContextManager;
  readonly tokenManager: ITokenManager;
  readonly costEngine: ICostEngine;
  readonly retryEngine: IRetryEngine;
  readonly failoverEngine: IFailoverEngine;
  readonly parallelEngine: IParallelEngine;
  readonly cacheEngine: ICacheEngine;
  readonly toolRuntime: IToolRuntime;
  readonly privacyRuntime: IPrivacyRuntime;
  readonly metricsRuntime: IMetricsRuntime;
  readonly traceRuntime: ITraceRuntime;
  readonly providerRouter: IProviderRouter;
  readonly modelRouter: IModelRouter;
}
