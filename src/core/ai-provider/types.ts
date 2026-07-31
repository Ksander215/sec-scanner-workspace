/**
 * Universal AI Provider Runtime — Types, Enums, Interfaces
 * TASK-AIS-006A.000 — Universal AI Provider Runtime & Execution Layer
 *
 * Core type definitions:
 *   - Branded identifiers (ProviderId, ModelId, ExecutionId, etc.)
 *   - Enums (ProviderState, ModelCapability, PrivacyLevel, etc.)
 *   - Domain entities (Provider, Model, ExecutionRequest, ExecutionResult, etc.)
 *   - Configuration (AIProviderRuntimeConfig, subsystem configs)
 *
 * Architecture: Provider-agnostic, SOLID, DDD, Event-Driven
 * Conforms to: CON-001.000, ARC-001.001
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';

export type { Timestamp, SemVer };

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type ProviderId = Identifier & { readonly __brand: 'ProviderId' };
export type ModelId = Identifier & { readonly __brand: 'AIProviderModelId' };
export type ExecutionId = Identifier & { readonly __brand: 'AIProviderExecutionId' };
export type StreamId = Identifier & { readonly __brand: 'StreamId' };
export type TraceId = Identifier & { readonly __brand: 'AIProviderTraceId' };
export type PolicyId = Identifier & { readonly __brand: 'PolicyId' };
export type CacheKeyId = Identifier & { readonly __brand: 'CacheKeyId' };
export type TokenAccountId = Identifier & { readonly __brand: 'TokenAccountId' };
export type CostReportId = Identifier & { readonly __brand: 'CostReportId' };
export type AdapterId = Identifier & { readonly __brand: 'AdapterId' };
export type ProviderSDKId = Identifier & { readonly __brand: 'ProviderSDKId' };

function brandProviderId(id: string): ProviderId { return id as ProviderId; }
function brandModelId(id: string): ModelId { return id as ModelId; }
function brandExecutionId(id: string): ExecutionId { return id as ExecutionId; }
function brandStreamId(id: string): StreamId { return id as StreamId; }
function brandTraceId(id: string): TraceId { return id as TraceId; }
function brandPolicyId(id: string): PolicyId { return id as PolicyId; }
function brandCacheKeyId(id: string): CacheKeyId { return id as CacheKeyId; }
function brandTokenAccountId(id: string): TokenAccountId { return id as TokenAccountId; }
function brandCostReportId(id: string): CostReportId { return id as CostReportId; }
function brandAdapterId(id: string): AdapterId { return id as AdapterId; }
function brandProviderSDKId(id: string): ProviderSDKId { return id as ProviderSDKId; }

export {
  brandProviderId, brandModelId, brandExecutionId, brandStreamId,
  brandTraceId, brandPolicyId, brandCacheKeyId, brandTokenAccountId,
  brandCostReportId, brandAdapterId, brandProviderSDKId,
};

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

/** Provider lifecycle state */
export enum ProviderState {
  Registered = 'Registered',
  Initializing = 'Initializing',
  Ready = 'Ready',
  Degraded = 'Degraded',
  Unhealthy = 'Unhealthy',
  Draining = 'Draining',
  Shutdown = 'Shutdown',
  Error = 'Error',
}

/** Model capabilities flags */
export enum ModelCapability {
  TextGeneration = 'TextGeneration',
  Vision = 'Vision',
  Tools = 'Tools',
  JSON = 'JSON',
  Streaming = 'Streaming',
  Audio = 'Audio',
  Reasoning = 'Reasoning',
  Embeddings = 'Embeddings',
  FunctionCalling = 'FunctionCalling',
  SystemPrompt = 'SystemPrompt',
  Multimodal = 'Multimodal',
  ContextCaching = 'ContextCaching',
}

/** Privacy levels for model execution */
export enum PrivacyLevel {
  Public = 'Public',
  LocalOnly = 'LocalOnly',
  CloudAllowed = 'CloudAllowed',
  EnterpriseOnly = 'EnterpriseOnly',
  OfflineOnly = 'OfflineOnly',
  EncryptedOnly = 'EncryptedOnly',
}

/** Execution status lifecycle */
export enum ExecutionStatus {
  Queued = 'Queued',
  Routing = 'Routing',
  Tokenizing = 'Tokenizing',
  ContextBuilding = 'ContextBuilding',
  Executing = 'Executing',
  Streaming = 'Streaming',
  ToolCalling = 'ToolCalling',
  Retrying = 'Retrying',
  FailingOver = 'FailingOver',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
  TimedOut = 'TimedOut',
}

/** Stream states */
export enum StreamState {
  Idle = 'Idle',
  Active = 'Active',
  Paused = 'Paused',
  Resumed = 'Resumed',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Errored = 'Errored',
}

/** Context window management strategies */
export enum ContextStrategy {
  SlidingWindow = 'SlidingWindow',
  SemanticCompression = 'SemanticCompression',
  Summarization = 'Summarization',
  ContextSplitting = 'ContextSplitting',
  ContextMerge = 'ContextMerge',
  LongConversation = 'LongConversation',
}

/** Cache types */
export enum CacheType {
  Memory = 'Memory',
  Disk = 'Disk',
  Semantic = 'Semantic',
  Prompt = 'Prompt',
}

/** Retry backoff strategies */
export enum BackoffStrategy {
  Fixed = 'Fixed',
  Linear = 'Linear',
  Exponential = 'Exponential',
  ExponentialJitter = 'ExponentialJitter',
}

/** Failover strategies */
export enum FailoverStrategy {
  Sequential = 'Sequential',
  Priority = 'Priority',
  CostOptimized = 'CostOptimized',
  LatencyOptimized = 'LatencyOptimized',
  Random = 'Random',
}

/** Parallel execution aggregation methods */
export enum AggregationMethod {
  First = 'First',
  Voting = 'Voting',
  Consensus = 'Consensus',
  Average = 'Average',
  BestConfidence = 'BestConfidence',
  Merge = 'Merge',
}

/** Token types for granular counting */
export enum TokenType {
  Input = 'Input',
  Output = 'Output',
  Cached = 'Cached',
  Reasoning = 'Reasoning',
  Image = 'Image',
  Audio = 'Audio',
}

/** Provider policy types */
export enum ProviderPolicyType {
  CostLimit = 'CostLimit',
  Privacy = 'Privacy',
  RateLimit = 'RateLimit',
  ModelAccess = 'ModelAccess',
  ProviderAccess = 'ProviderAccess',
  TokenBudget = 'TokenBudget',
  Timeout = 'Timeout',
  RetryPolicy = 'RetryPolicy',
}

/** Trace levels */
export enum TraceLevel {
  Debug = 'Debug',
  Info = 'Info',
  Warn = 'Warn',
  Error = 'Error',
  Critical = 'Critical',
}

/** Provider type categories */
export enum AIProviderType {
  OpenAI = 'OpenAI',
  Anthropic = 'Anthropic',
  Google = 'Google',
  Ollama = 'Ollama',
  LmStudio = 'LmStudio',
  VLLM = 'VLLM',
  LlamaCpp = 'LlamaCpp',
  AzureOpenAI = 'AzureOpenAI',
  OpenRouter = 'OpenRouter',
  Mistral = 'Mistral',
  DeepSeek = 'DeepSeek',
  Groq = 'Groq',
  XAI = 'XAI',
  Custom = 'Custom',
}

/** Runtime lifecycle states */
export enum AIProviderRuntimeState {
  Created = 'Created',
  Initializing = 'Initializing',
  Ready = 'Ready',
  Running = 'Running',
  Degraded = 'Degraded',
  ShuttingDown = 'ShuttingDown',
  Shutdown = 'Shutdown',
  Error = 'Error',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — PROVIDER
// ═══════════════════════════════════════════════════════════════════

/** Provider descriptor — registered in Provider Registry */
export interface ProviderDescriptor {
  readonly id: ProviderId;
  readonly name: string;
  readonly type: AIProviderType;
  readonly version: SemVer;
  readonly description: string;
  readonly state: ProviderState;
  readonly endpoint?: string;
  readonly supportedRegions: readonly string[];
  readonly capabilities: readonly string[];
  readonly privacyLevel: PrivacyLevel;
  readonly maxConcurrentRequests: number;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly registeredAt: Timestamp;
  readonly lastHealthCheckAt: Timestamp | null;
}

/** Provider health check result */
export interface ProviderHealthCheck {
  readonly providerId: ProviderId;
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly errorRate: number;
  readonly lastCheckAt: Timestamp;
  readonly details?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — MODEL
// ═══════════════════════════════════════════════════════════════════

/** Model descriptor — registered in Model Registry */
export interface ModelDescriptor {
  readonly id: ModelId;
  readonly providerId: ProviderId;
  readonly name: string;
  readonly family: string;
  readonly version: string;
  readonly capabilities: readonly ModelCapability[];
  readonly tokenLimit: number;
  readonly supportsVision: boolean;
  readonly supportsTools: boolean;
  readonly supportsJSON: boolean;
  readonly supportsStreaming: boolean;
  readonly supportsAudio: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsEmbeddings: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly privacyLevel: PrivacyLevel;
  readonly costProfile: ModelCostProfile;
  readonly latencyProfile: ModelLatencyProfile;
  readonly available: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly registeredAt: Timestamp;
}

/** Cost profile for a model */
export interface ModelCostProfile {
  readonly inputCostPer1kTokens: number;
  readonly outputCostPer1kTokens: number;
  readonly cachedInputCostPer1kTokens: number;
  readonly reasoningCostPer1kTokens: number;
  readonly imageCostPerUnit: number;
  readonly audioCostPerMinute: number;
  readonly currency: string;
}

/** Latency profile for a model */
export interface ModelLatencyProfile {
  readonly averageMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  readonly timeoutMs: number;
}

/** Model filter for querying models */
export interface ModelFilter {
  readonly providerId?: ProviderId;
  readonly capability?: ModelCapability;
  readonly privacyLevel?: PrivacyLevel;
  readonly minTokenLimit?: number;
  readonly availableOnly?: boolean;
  readonly family?: string;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — EXECUTION
// ═══════════════════════════════════════════════════════════════════

/** Execution request — input to the Execution Engine */
export interface ExecutionRequest {
  readonly id: ExecutionId;
  readonly modelId?: ModelId;
  readonly providerId?: ProviderId;
  readonly messages: readonly ExecutionMessage[];
  readonly systemPrompt?: string;
  readonly tools?: readonly ToolDefinition[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly topP?: number;
  readonly frequencyPenalty?: number;
  readonly presencePenalty?: number;
  readonly stopSequences?: readonly string[];
  readonly responseFormat?: ResponseFormat;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
}

/** A message within an execution request */
export interface ExecutionMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly name?: string;
  readonly toolCallId?: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Tool definition for function calling */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

/** Tool call from LLM response */
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: string;
}

/** Response format specification */
export interface ResponseFormat {
  readonly type: 'text' | 'json' | 'json_schema';
  readonly schema?: Readonly<Record<string, unknown>>;
}

/** Execution result — output from the Execution Engine */
export interface ExecutionResult {
  readonly id: ExecutionId;
  readonly status: ExecutionStatus;
  readonly content: string;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly messages: readonly ExecutionMessage[];
  readonly toolCalls: readonly ToolCall[];
  readonly tokenUsage: TokenUsageDetail;
  readonly cost: CostDetail;
  readonly latencyMs: number;
  readonly traceId: TraceId;
  readonly finishReason: string;
  readonly createdAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Detailed token usage */
export interface TokenUsageDetail {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly reasoningTokens: number;
  readonly imageTokens: number;
  readonly audioTokens: number;
  readonly totalTokens: number;
}

/** Cost detail for a single execution */
export interface CostDetail {
  readonly inputCost: number;
  readonly outputCost: number;
  readonly cachedCost: number;
  readonly reasoningCost: number;
  readonly imageCost: number;
  readonly audioCost: number;
  readonly totalCost: number;
  readonly currency: string;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — STREAMING
// ═══════════════════════════════════════════════════════════════════

/** Streaming chunk */
export interface StreamChunk {
  readonly id: string;
  readonly streamId: StreamId;
  readonly content: string;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly finishReason: string | null;
  readonly tokenCount: number;
  readonly latencyMs: number;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Stream session */
export interface StreamSession {
  readonly id: StreamId;
  readonly executionId: ExecutionId;
  readonly state: StreamState;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly chunks: readonly StreamChunk[];
  readonly bufferedContent: string;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Stream control commands */
export interface StreamControl {
  readonly streamId: StreamId;
  readonly action: 'pause' | 'resume' | 'cancel';
  readonly reason?: string;
  readonly createdAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — CONTEXT WINDOW
// ═══════════════════════════════════════════════════════════════════

/** Context window */
export interface ContextWindow {
  readonly modelId: ModelId;
  readonly totalCapacity: number;
  readonly usedTokens: number;
  readonly availableTokens: number;
  readonly messages: readonly ExecutionMessage[];
  readonly strategy: ContextStrategy;
  readonly compressionRatio: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Context management request */
export interface ContextManagementRequest {
  readonly modelId: ModelId;
  readonly messages: readonly ExecutionMessage[];
  readonly systemPrompt?: string;
  readonly strategy?: ContextStrategy;
  readonly maxTokens?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Context management result */
export interface ContextManagementResult {
  readonly messages: readonly ExecutionMessage[];
  readonly systemPrompt: string | null;
  readonly originalTokenCount: number;
  readonly resultingTokenCount: number;
  readonly compressionRatio: number;
  readonly strategy: ContextStrategy;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — TOKENS
// ═══════════════════════════════════════════════════════════════════

/** Token account for tracking usage */
export interface TokenAccount {
  readonly id: TokenAccountId;
  readonly name: string;
  readonly budget: number;
  readonly used: number;
  readonly remaining: number;
  readonly byType: Readonly<Record<TokenType, number>>;
  readonly byProvider: Readonly<Record<string, number>>;
  readonly byModel: Readonly<Record<string, number>>;
  readonly periodStart: Timestamp;
  readonly periodEnd: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Token count result */
export interface TokenCountResult {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly reasoningTokens: number;
  readonly imageTokens: number;
  readonly audioTokens: number;
  readonly totalTokens: number;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — COST
// ═══════════════════════════════════════════════════════════════════

/** Cost report */
export interface CostReport {
  readonly id: CostReportId;
  readonly periodStart: Timestamp;
  readonly periodEnd: Timestamp;
  readonly totalCost: number;
  readonly byProvider: Readonly<Record<string, number>>;
  readonly byModel: Readonly<Record<string, number>>;
  readonly byType: Readonly<Record<string, number>>;
  readonly currency: string;
  readonly budgetUsed: number;
  readonly budgetRemaining: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Cost limit policy */
export interface CostLimitPolicy {
  readonly id: string;
  readonly name: string;
  readonly limit: number;
  readonly period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  readonly action: 'warn' | 'block' | 'fallback';
  readonly scope: 'global' | 'provider' | 'model' | 'user';
  readonly scopeId?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — RETRY
// ═══════════════════════════════════════════════════════════════════

/** Retry configuration */
export interface RetryConfig {
  readonly maxRetries: number;
  readonly backoffStrategy: BackoffStrategy;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitter: boolean;
  readonly retryableErrors: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Retry attempt record */
export interface RetryAttempt {
  readonly attempt: number;
  readonly delayMs: number;
  readonly error: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — FAILOVER
// ═══════════════════════════════════════════════════════════════════

/** Failover chain definition */
export interface FailoverChain {
  readonly id: string;
  readonly name: string;
  readonly strategy: FailoverStrategy;
  readonly providers: readonly FailoverProviderEntry[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Entry in a failover chain */
export interface FailoverProviderEntry {
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly priority: number;
  readonly weight: number;
  readonly enabled: boolean;
}

/** Failover event record */
export interface FailoverEvent {
  readonly id: string;
  readonly executionId: ExecutionId;
  readonly fromProviderId: ProviderId;
  readonly fromModelId: ModelId;
  readonly toProviderId: ProviderId;
  readonly toModelId: ModelId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — PARALLEL EXECUTION
// ═══════════════════════════════════════════════════════════════════

/** Parallel execution request */
export interface ParallelExecutionRequest {
  readonly id: ExecutionId;
  readonly requests: readonly ExecutionRequest[];
  readonly aggregation: AggregationMethod;
  readonly timeoutMs: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Parallel execution result */
export interface ParallelExecutionResult {
  readonly id: ExecutionId;
  readonly results: readonly ExecutionResult[];
  readonly aggregated: string;
  readonly aggregation: AggregationMethod;
  readonly confidence: number;
  readonly totalLatencyMs: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — CACHE
// ═══════════════════════════════════════════════════════════════════

/** Cache entry */
export interface CacheEntry {
  readonly key: CacheKeyId;
  readonly type: CacheType;
  readonly value: string;
  readonly tokenCount: number;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly hitCount: number;
  readonly lastAccessedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Cache statistics */
export interface CacheStats {
  readonly totalEntries: number;
  readonly byType: Readonly<Record<CacheType, number>>;
  readonly hitRate: number;
  readonly missRate: number;
  readonly totalHits: number;
  readonly totalMisses: number;
  readonly evictionCount: number;
  readonly totalSavedTokens: number;
  readonly totalSavedCost: number;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — TOOL INVOCATION
// ═══════════════════════════════════════════════════════════════════

/** Tool invocation record */
export interface ToolInvocation {
  readonly id: string;
  readonly executionId: ExecutionId;
  readonly toolCallId: string;
  readonly toolName: string;
  readonly arguments: string;
  readonly result: string;
  readonly status: 'completed' | 'failed' | 'timeout';
  readonly latencyMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — PRIVACY
// ═══════════════════════════════════════════════════════════════════

/** Privacy policy */
export interface PrivacyPolicy {
  readonly id: PolicyId;
  readonly name: string;
  readonly level: PrivacyLevel;
  readonly rules: readonly PrivacyRule[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Single privacy rule */
export interface PrivacyRule {
  readonly id: string;
  readonly description: string;
  readonly dataType: string;
  readonly allowedProviders: readonly ProviderId[];
  readonly deniedProviders: readonly ProviderId[];
  readonly requireEncryption: boolean;
  readonly requireLocalOnly: boolean;
}

/** Privacy evaluation result */
export interface PrivacyEvaluation {
  readonly allowed: boolean;
  readonly policyId: PolicyId;
  readonly reason: string;
  readonly requiredLevel: PrivacyLevel;
  readonly actualLevel: PrivacyLevel;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — PROVIDER POLICIES
// ═══════════════════════════════════════════════════════════════════

/** Provider policy definition */
export interface ProviderPolicy {
  readonly id: PolicyId;
  readonly name: string;
  readonly type: ProviderPolicyType;
  readonly rules: Readonly<Record<string, unknown>>;
  readonly priority: number;
  readonly description: string;
  readonly enabled: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Policy evaluation result */
export interface PolicyEvaluationResult {
  readonly allowed: boolean;
  readonly policyId: PolicyId;
  readonly policyType: ProviderPolicyType;
  readonly reason: string;
  readonly constraints: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — TRACE
// ═══════════════════════════════════════════════════════════════════

/** Full trace record for an execution */
export interface ExecutionTrace {
  readonly traceId: TraceId;
  readonly executionId: ExecutionId;
  readonly conversationId?: string;
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly promptVersion?: string;
  readonly policyVersion?: string;
  readonly workflowId?: string;
  readonly identityId?: string;
  readonly durationMs: number;
  readonly cost: number;
  readonly tokenUsage: TokenUsageDetail;
  readonly status: ExecutionStatus;
  readonly phases: readonly TracePhase[];
  readonly retries: readonly RetryAttempt[];
  readonly failovers: readonly FailoverEvent[];
  readonly toolInvocations: readonly ToolInvocation[];
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A phase within a trace */
export interface TracePhase {
  readonly name: string;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly durationMs: number;
  readonly status: ExecutionStatus;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — METRICS
// ═══════════════════════════════════════════════════════════════════

/** Comprehensive AI Provider metrics snapshot */
export interface AIProviderMetrics {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly cancelledExecutions: number;
  readonly totalLatencyMs: number;
  readonly averageLatencyMs: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly totalCost: number;
  readonly averageCostPerExecution: number;
  readonly totalTokens: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCachedTokens: number;
  readonly totalReasoningTokens: number;
  readonly totalRetries: number;
  readonly totalFailovers: number;
  readonly totalToolCalls: number;
  readonly cacheHitRate: number;
  readonly cacheMissRate: number;
  readonly contextCompressionRatio: number;
  readonly hallucinationReports: number;
  readonly providerUsage: Readonly<Record<string, number>>;
  readonly modelUsage: Readonly<Record<string, number>>;
  readonly streamingSpeed: number;
  readonly contextSize: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER SDK CONTRACT
// ═══════════════════════════════════════════════════════════════════

/** Provider SDK interface — what every provider adapter must implement */
export interface ProviderSDK {
  readonly id: ProviderSDKId;
  readonly providerType: AIProviderType;
  readonly name: string;
  readonly version: SemVer;
  readonly initialize: (config: Readonly<Record<string, unknown>>) => Promise<void>;
  readonly shutdown: () => Promise<void>;
  readonly execute: (request: ExecutionRequest) => Promise<ExecutionResult>;
  readonly stream: (request: ExecutionRequest) => AsyncIterable<StreamChunk>;
  readonly cancel: (executionId: ExecutionId) => Promise<void>;
  readonly health: () => Promise<ProviderHealthCheck>;
  readonly models: () => Promise<readonly ModelDescriptor[]>;
  readonly embeddings: (text: string, modelId?: ModelId) => Promise<readonly number[]>;
  readonly tokenize: (text: string, modelId?: ModelId) => Promise<TokenCountResult>;
  readonly detokenize: (tokens: readonly number[], modelId?: ModelId) => Promise<string>;
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME INTEGRATION CONTRACTS
// ═══════════════════════════════════════════════════════════════════

/** Contract for Cognitive Runtime integration */
export interface CognitiveRuntimeContract {
  readonly getCurrentIntent: () => Promise<{ type: string; confidence: number } | null>;
  readonly getConversationTurnCount: () => Promise<number>;
  readonly getCurrentSessionId: () => Promise<string | null>;
  readonly getConversationSummary: () => Promise<string | null>;
}

/** Contract for Workflow Runtime integration */
export interface WorkflowRuntimeContract {
  readonly invoke: (workflowId: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly available: () => Promise<readonly string[]>;
}

/** Contract for Capability Runtime integration */
export interface CapabilityRuntimeContract {
  readonly available: () => Promise<readonly string[]>;
  readonly isAllowed: (capability: string, identityId: string) => Promise<boolean>;
}

/** Contract for Memory Runtime integration */
export interface MemoryRuntimeContract {
  readonly retrieve: (query: string, limit?: number) => Promise<readonly { key: string; value: string; relevance: number }[]>;
  readonly store: (key: string, value: unknown) => Promise<void>;
}

/** Contract for Knowledge Runtime integration */
export interface KnowledgeRuntimeContract {
  readonly retrieve: (query: string, limit?: number) => Promise<readonly { id: string; content: string; relevance: number }[]>;
  readonly getNamespaces: () => Promise<readonly string[]>;
}

/** Contract for Identity Runtime integration */
export interface IdentityRuntimeContract {
  readonly resolve: (sessionId: string) => Promise<{ identityId: string; roles: readonly string[] } | null>;
  readonly getPreferences: (identityId: string) => Promise<Readonly<Record<string, unknown>>>;
}

/** Contract for Personal Intelligence Runtime integration */
export interface PersonalRuntimeContract {
  readonly getCurrentUserId: () => Promise<string | null>;
  readonly getUserPreferences: () => Promise<Readonly<Record<string, unknown>>>;
}

/** Contract for Platform Runtime integration */
export interface PlatformRuntimeContract {
  readonly publishEvent: (type: string, data: unknown) => Promise<void>;
  readonly getConfiguration: () => Promise<Readonly<Record<string, unknown>>>;
  readonly getHealth: () => Promise<{ status: string; details: Readonly<Record<string, unknown>> }>;
}

/** Bundle of all runtime integration contracts */
export interface AIProviderRuntimeContracts {
  readonly cognitive?: CognitiveRuntimeContract;
  readonly workflow?: WorkflowRuntimeContract;
  readonly capability?: CapabilityRuntimeContract;
  readonly memory?: MemoryRuntimeContract;
  readonly knowledge?: KnowledgeRuntimeContract;
  readonly identity?: IdentityRuntimeContract;
  readonly personal?: PersonalRuntimeContract;
  readonly platform?: PlatformRuntimeContract;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/** Configuration for Provider Registry subsystem */
export interface ProviderRegistryConfig {
  readonly maxProviders: number;
  readonly healthCheckIntervalMs: number;
  readonly healthCheckTimeoutMs: number;
  readonly autoEnableOnHealthy: boolean;
  readonly autoDisableOnUnhealthy: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Model Registry subsystem */
export interface ModelRegistryConfig {
  readonly maxModelsPerProvider: number;
  readonly cacheModelDescriptors: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Execution Engine subsystem */
export interface ExecutionEngineConfig {
  readonly defaultTimeoutMs: number;
  readonly maxConcurrentExecutions: number;
  readonly queueSize: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Streaming Engine subsystem */
export interface StreamingEngineConfig {
  readonly maxConcurrentStreams: number;
  readonly chunkBufferSize: number;
  readonly defaultTimeoutMs: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Context Manager subsystem */
export interface ContextManagerConfig {
  readonly defaultStrategy: ContextStrategy;
  readonly compressionThreshold: number;
  readonly maxContextRatio: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Token Manager subsystem */
export interface TokenManagerConfig {
  readonly defaultBudget: number;
  readonly warnThreshold: number;
  readonly blockThreshold: number;
  readonly period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Cost Engine subsystem */
export interface CostEngineConfig {
  readonly defaultCurrency: string;
  readonly enableTracking: boolean;
  readonly budgetAlertThreshold: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Retry Engine subsystem */
export interface RetryEngineConfig {
  readonly defaultMaxRetries: number;
  readonly defaultBackoff: BackoffStrategy;
  readonly defaultInitialDelayMs: number;
  readonly defaultMaxDelayMs: number;
  readonly defaultJitter: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Failover Engine subsystem */
export interface FailoverEngineConfig {
  readonly defaultStrategy: FailoverStrategy;
  readonly maxFailovers: number;
  readonly enableAutoFailover: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Cache Engine subsystem */
export interface CacheEngineConfig {
  readonly defaultType: CacheType;
  readonly maxMemoryEntries: number;
  readonly defaultTTLMs: number;
  readonly enableSemanticCache: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Privacy Runtime subsystem */
export interface PrivacyRuntimeConfig {
  readonly defaultLevel: PrivacyLevel;
  readonly enforcePolicies: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Metrics Runtime subsystem */
export interface MetricsRuntimeConfig {
  readonly retentionMs: number;
  readonly aggregationIntervalMs: number;
  readonly enableDetailedMetrics: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration for Trace Runtime subsystem */
export interface TraceRuntimeConfig {
  readonly enableTracing: boolean;
  readonly retentionMs: number;
  readonly maxTraces: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Main AI Provider Runtime configuration */
export interface AIProviderRuntimeConfig {
  readonly version: SemVer;
  readonly defaultProviderId?: string;
  readonly defaultModelId?: string;
  readonly providerRegistry: ProviderRegistryConfig;
  readonly modelRegistry: ModelRegistryConfig;
  readonly executionEngine: ExecutionEngineConfig;
  readonly streamingEngine: StreamingEngineConfig;
  readonly contextManager: ContextManagerConfig;
  readonly tokenManager: TokenManagerConfig;
  readonly costEngine: CostEngineConfig;
  readonly retryEngine: RetryEngineConfig;
  readonly failoverEngine: FailoverEngineConfig;
  readonly cacheEngine: CacheEngineConfig;
  readonly privacyRuntime: PrivacyRuntimeConfig;
  readonly metricsRuntime: MetricsRuntimeConfig;
  readonly traceRuntime: TraceRuntimeConfig;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Default AI Provider Runtime configuration */
export const DefaultAIProviderRuntimeConfig: AIProviderRuntimeConfig = {
  version: '1.0.0',
  providerRegistry: {
    maxProviders: 50,
    healthCheckIntervalMs: 30000,
    healthCheckTimeoutMs: 5000,
    autoEnableOnHealthy: true,
    autoDisableOnUnhealthy: true,
    metadata: {},
  },
  modelRegistry: {
    maxModelsPerProvider: 100,
    cacheModelDescriptors: true,
    metadata: {},
  },
  executionEngine: {
    defaultTimeoutMs: 60000,
    maxConcurrentExecutions: 10,
    queueSize: 100,
    metadata: {},
  },
  streamingEngine: {
    maxConcurrentStreams: 5,
    chunkBufferSize: 100,
    defaultTimeoutMs: 120000,
    metadata: {},
  },
  contextManager: {
    defaultStrategy: ContextStrategy.SlidingWindow,
    compressionThreshold: 0.8,
    maxContextRatio: 0.9,
    metadata: {},
  },
  tokenManager: {
    defaultBudget: 1000000,
    warnThreshold: 0.8,
    blockThreshold: 0.95,
    period: 'monthly',
    metadata: {},
  },
  costEngine: {
    defaultCurrency: 'USD',
    enableTracking: true,
    budgetAlertThreshold: 0.8,
    metadata: {},
  },
  retryEngine: {
    defaultMaxRetries: 3,
    defaultBackoff: BackoffStrategy.ExponentialJitter,
    defaultInitialDelayMs: 1000,
    defaultMaxDelayMs: 30000,
    defaultJitter: true,
    metadata: {},
  },
  failoverEngine: {
    defaultStrategy: FailoverStrategy.Sequential,
    maxFailovers: 3,
    enableAutoFailover: true,
    metadata: {},
  },
  cacheEngine: {
    defaultType: CacheType.Memory,
    maxMemoryEntries: 1000,
    defaultTTLMs: 3600000,
    enableSemanticCache: false,
    metadata: {},
  },
  privacyRuntime: {
    defaultLevel: PrivacyLevel.CloudAllowed,
    enforcePolicies: true,
    metadata: {},
  },
  metricsRuntime: {
    retentionMs: 86400000,
    aggregationIntervalMs: 60000,
    enableDetailedMetrics: true,
    metadata: {},
  },
  traceRuntime: {
    enableTracing: true,
    retentionMs: 86400000,
    maxTraces: 10000,
    metadata: {},
  },
  metadata: {},
};
