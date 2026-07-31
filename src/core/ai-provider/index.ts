/**
 * Universal AI Provider Runtime — Public API
 * TASK-AIS-006A.000
 *
 * Provider-agnostic AI execution layer.
 * AIS never knows which model answers.
 */

// Main Runtime
export { AIProviderRuntime } from './ai-provider-runtime.js';
export type { AIProviderRuntimeConfig } from './ai-provider-runtime.js';

// Subsystems (value exports)
export { ProviderRegistry } from './provider-registry.js';
export { ModelRegistry } from './model-registry.js';
export { ExecutionEngine } from './execution-engine.js';
export { StreamingEngine } from './streaming-engine.js';
export { ContextManager } from './context-manager.js';
export { TokenManager } from './token-manager.js';
export { CostEngine } from './cost-engine.js';
export { RetryEngine } from './retry-engine.js';
export { FailoverEngine } from './failover-engine.js';
export { ParallelEngine } from './parallel-engine.js';
export { CacheEngine } from './cache-engine.js';
export { ToolRuntime } from './tool-runtime.js';
export { PrivacyRuntime } from './privacy-runtime.js';
export { MetricsRuntime } from './metrics-runtime.js';
export { TraceRuntime } from './trace-runtime.js';
export { ProviderRouter } from './provider-router.js';
export { ModelRouter } from './model-router.js';

// Provider SDK
export { BaseProviderSDK, MockProviderSDK } from './provider-sdk.js';

// Metrics
export { Metrics } from './metrics.js';
export type { MetricsSnapshot } from './metrics.js';

// Contracts (type-only)
export type {
  IProviderRegistry, IModelRegistry, IExecutionEngine, IStreamingEngine,
  IContextManager, ITokenManager, ICostEngine, IRetryEngine,
  IFailoverEngine, IParallelEngine, ICacheEngine, IToolRuntime,
  IPrivacyRuntime, IMetricsRuntime, ITraceRuntime,
  IProviderRouter, IModelRouter,
  AIProviderRuntimePublicContracts,
} from './contracts.js';

// Types (type-only)
export type {
  // Branded IDs
  ProviderId, ModelId, ExecutionId, StreamId, TraceId, PolicyId,
  CacheKeyId, TokenAccountId, CostReportId, AdapterId, ProviderSDKId,
  // Enums
  ProviderState, ModelCapability, PrivacyLevel, ExecutionStatus,
  StreamState, ContextStrategy, CacheType, BackoffStrategy,
  FailoverStrategy, AggregationMethod, TokenType, ProviderPolicyType,
  TraceLevel, AIProviderType, AIProviderRuntimeState,
  // Domain entities
  ProviderDescriptor, ProviderHealthCheck, ModelDescriptor,
  ModelCostProfile, ModelLatencyProfile, ModelFilter,
  ExecutionRequest, ExecutionResult, ExecutionMessage,
  ToolDefinition, ToolCall, ResponseFormat,
  TokenUsageDetail, CostDetail,
  StreamChunk, StreamSession, StreamControl,
  ContextWindow, ContextManagementRequest, ContextManagementResult,
  TokenCountResult, TokenAccount,
  CostReport, CostLimitPolicy,
  RetryConfig, RetryAttempt,
  FailoverChain, FailoverProviderEntry, FailoverEvent,
  ParallelExecutionRequest, ParallelExecutionResult,
  CacheEntry, CacheStats,
  ToolInvocation,
  PrivacyPolicy, PrivacyRule, PrivacyEvaluation,
  ProviderPolicy, PolicyEvaluationResult,
  ExecutionTrace, TracePhase,
  AIProviderMetrics,
  // SDK
  ProviderSDK,
  // Runtime contracts
  CognitiveRuntimeContract, WorkflowRuntimeContract,
  CapabilityRuntimeContract, MemoryRuntimeContract,
  KnowledgeRuntimeContract, IdentityRuntimeContract,
  PersonalRuntimeContract, PlatformRuntimeContract,
  AIProviderRuntimeContracts,
  // Configuration
  ProviderRegistryConfig, ModelRegistryConfig, ExecutionEngineConfig,
  StreamingEngineConfig, ContextManagerConfig, TokenManagerConfig,
  CostEngineConfig, RetryEngineConfig, FailoverEngineConfig,
  CacheEngineConfig, PrivacyRuntimeConfig, MetricsRuntimeConfig,
  TraceRuntimeConfig,
} from './types.js';

export { DefaultAIProviderRuntimeConfig } from './types.js';

// Events (type-only)
export type { AIProviderEvent } from './events.js';

// Errors (value exports)
export {
  AIProviderError,
  ProviderNotFoundError, ProviderAlreadyRegisteredError, ProviderNotReadyError,
  ProviderHealthCheckError, ProviderLimitExceededError,
  ModelNotFoundError, ModelAlreadyRegisteredError, ModelNotAvailableError,
  ModelCapabilityMismatchError,
  ExecutionError, ExecutionTimeoutError, ExecutionCancelledError,
  ExecutionQueueFullError, ConcurrentExecutionLimitError,
  StreamError, StreamNotFoundError, StreamAlreadyCompletedError,
  ContextWindowExceededError, TokenBudgetExceededError, CostBudgetExceededError,
  RetryExhaustedError, FailoverExhaustedError, NoFailoverChainError,
  CacheError, PrivacyViolationError, PolicyViolationError,
  ToolInvocationError, ToolNotFoundError,
  NoSuitableModelError, NoSuitableProviderError,
  ConfigurationError, ParallelExecutionError,
} from './errors.js';
