/**
 * Cognitive Runtime — Types, Enums, Interfaces
 * TASK-AIS-003I.000 — Cognitive Runtime & Conversation Orchestrator
 *
 * Core type definitions for the Cognitive Runtime:
 *   - Branded identifiers
 *   - Enums (CognitiveState, IntentType, etc.)
 *   - Domain entities (Intent, Conversation, Message, PromptContext)
 *   - Interfaces (provider contracts, model routing, policies)
 *
 * Conforms to: CON-001.000, ARC-001.001, DOM-002.000, ADR-001..014
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';

export type { Timestamp, SemVer };

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type CognitiveSessionId = Identifier & { readonly __brand: 'CognitiveSessionId' };
export type ConversationId = Identifier & { readonly __brand: 'ConversationId' };
export type MessageId = Identifier & { readonly __brand: 'MessageId' };
export type TurnId = Identifier & { readonly __brand: 'TurnId' };
export type ThreadId = Identifier & { readonly __brand: 'ThreadId' };
export type IntentId = Identifier & { readonly __brand: 'IntentId' };
export type PromptId = Identifier & { readonly __brand: 'PromptId' };
export type ProviderAdapterId = Identifier & { readonly __brand: 'ProviderAdapterId' };
export type ModelId = Identifier & { readonly __brand: 'ModelId' };
export type CognitiveTraceId = Identifier & { readonly __brand: 'CognitiveTraceId' };
export type ResponsePlanId = Identifier & { readonly __brand: 'ResponsePlanId' };
export type SummaryId = Identifier & { readonly __brand: 'SummaryId' };

function brandCognitiveSessionId(id: string): CognitiveSessionId { return id as CognitiveSessionId; }
function brandConversationId(id: string): ConversationId { return id as ConversationId; }
function brandMessageId(id: string): MessageId { return id as MessageId; }
function brandTurnId(id: string): TurnId { return id as TurnId; }
function brandThreadId(id: string): ThreadId { return id as ThreadId; }
function brandIntentId(id: string): IntentId { return id as IntentId; }
function brandPromptId(id: string): PromptId { return id as PromptId; }
function brandProviderAdapterId(id: string): ProviderAdapterId { return id as ProviderAdapterId; }
function brandModelId(id: string): ModelId { return id as ModelId; }
function brandCognitiveTraceId(id: string): CognitiveTraceId { return id as CognitiveTraceId; }
function brandResponsePlanId(id: string): ResponsePlanId { return id as ResponsePlanId; }
function brandSummaryId(id: string): SummaryId { return id as SummaryId; }

export {
  brandCognitiveSessionId,
  brandConversationId,
  brandMessageId,
  brandTurnId,
  brandThreadId,
  brandIntentId,
  brandPromptId,
  brandProviderAdapterId,
  brandModelId,
  brandCognitiveTraceId,
  brandResponsePlanId,
  brandSummaryId,
};

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

/**
 * Cognitive Runtime lifecycle states.
 * FSM: Created → Initialized → Ready → Processing ↔ Streaming → WaitingTool → WaitingWorkflow → Completed → Disposed
 */
export enum CognitiveState {
  Created = 'Created',
  Initialized = 'Initialized',
  Ready = 'Ready',
  Processing = 'Processing',
  Streaming = 'Streaming',
  WaitingTool = 'WaitingTool',
  WaitingWorkflow = 'WaitingWorkflow',
  Completed = 'Completed',
  Disposed = 'Disposed',
}

/**
 * Intent classification types.
 */
export enum IntentType {
  Question = 'Question',
  Command = 'Command',
  Workflow = 'Workflow',
  ToolInvocation = 'ToolInvocation',
  Search = 'Search',
  MemoryRecall = 'MemoryRecall',
  Planning = 'Planning',
  Conversation = 'Conversation',
  System = 'System',
}

/**
 * Intent complexity levels.
 */
export enum IntentComplexity {
  Simple = 'Simple',
  Moderate = 'Moderate',
  Complex = 'Complex',
  Critical = 'Critical',
}

/**
 * Response plan decision types.
 * What the cognitive runtime decides to do next.
 */
export enum ResponseDecision {
  Answer = 'Answer',
  Workflow = 'Workflow',
  Tool = 'Tool',
  Memory = 'Memory',
  Clarification = 'Clarification',
  Escalation = 'Escalation',
}

/**
 * Message role in a conversation.
 */
export enum MessageRole {
  User = 'User',
  Assistant = 'Assistant',
  System = 'System',
  Tool = 'Tool',
}

/**
 * Message status.
 */
export enum MessageStatus {
  Pending = 'Pending',
  Sent = 'Sent',
  Delivered = 'Delivered',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
}

/**
 * Conversation state.
 */
export enum ConversationState {
  Active = 'Active',
  Paused = 'Paused',
  Archived = 'Archived',
  Closed = 'Closed',
}

/**
 * Streaming status for provider completion.
 */
export enum StreamingStatus {
  Idle = 'Idle',
  Started = 'Started',
  InProgress = 'InProgress',
  Finished = 'Finished',
  Error = 'Error',
  Cancelled = 'Cancelled',
}

/**
 * Model routing policy types.
 */
export enum RoutingPolicyType {
  Cost = 'Cost',
  Latency = 'Latency',
  Privacy = 'Privacy',
  Accuracy = 'Accuracy',
}

/**
 * Cognitive policy types.
 */
export enum CognitivePolicyType {
  Privacy = 'Privacy',
  Cost = 'Cost',
  Token = 'Token',
  Trust = 'Trust',
  Capability = 'Capability',
  Conversation = 'Conversation',
}

/**
 * Compression strategy types.
 */
export enum CompressionStrategy {
  Summary = 'Summary',
  Truncation = 'Truncation',
  SlidingWindow = 'SlidingWindow',
  Semantic = 'Semantic',
}

/**
 * Provider adapter types.
 */
export enum ProviderAdapterType {
  OpenAI = 'OpenAI',
  Anthropic = 'Anthropic',
  Google = 'Google',
  Ollama = 'Ollama',
  LmStudio = 'LmStudio',
  VLLM = 'VLLM',
}

/**
 * Trace severity levels.
 */
export enum CognitiveTraceLevel {
  Debug = 'Debug',
  Info = 'Info',
  Warn = 'Warn',
  Error = 'Error',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — INTENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Intent — the classified intention behind a user input.
 * Determined by Intent Runtime after analysis.
 */
export interface Intent {
  readonly id: IntentId;
  readonly type: IntentType;
  readonly goal: string;
  readonly priority: number;
  readonly complexity: IntentComplexity;
  readonly confidence: number;
  readonly requiredCapabilities: readonly string[];
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly detectedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Intent classification result before final Intent creation.
 */
export interface IntentClassification {
  readonly type: IntentType;
  readonly confidence: number;
  readonly complexity: IntentComplexity;
  readonly requiredCapabilities: readonly string[];
  readonly parameters: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — CONVERSATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Message — a single message within a conversation turn.
 * Immutable once created.
 */
export interface Message {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly turnId: TurnId;
  readonly threadId: ThreadId | null;
  readonly role: MessageRole;
  readonly content: string;
  readonly attachments: readonly Attachment[];
  readonly status: MessageStatus;
  readonly tokens: TokenUsage;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Attachment — a file or resource attached to a message.
 */
export interface Attachment {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly url?: string;
  readonly content?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Turn — a single exchange in a conversation (user message + response).
 */
export interface Turn {
  readonly id: TurnId;
  readonly conversationId: ConversationId;
  readonly number: number;
  readonly messages: readonly Message[];
  readonly intent: Intent | null;
  readonly responsePlan: ResponsePlan | null;
  readonly summary: string | null;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly durationMs: number | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Thread — a sub-conversation within a conversation.
 */
export interface Thread {
  readonly id: ThreadId;
  readonly conversationId: ConversationId;
  readonly parentId: TurnId | null;
  readonly title: string;
  readonly turns: readonly Turn[];
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Conversation — the full conversation container.
 */
export interface Conversation {
  readonly id: ConversationId;
  readonly sessionId: CognitiveSessionId;
  readonly state: ConversationState;
  readonly title: string;
  readonly turns: readonly Turn[];
  readonly threads: readonly Thread[];
  readonly summary: string | null;
  readonly tokenCount: number;
  readonly messageCount: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly lastActivityAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Token usage for a single message or completion.
 */
export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — PROMPT CONTEXT
// ═══════════════════════════════════════════════════════════════════

/**
 * PromptContext — the structured prompt object sent to providers.
 * NOT a string — an object. Conversion to text happens only inside Provider Adapters.
 */
export interface PromptContext {
  readonly id: PromptId;
  readonly identity: PromptIdentity;
  readonly preferences: PromptPreferences;
  readonly intent: Intent | null;
  readonly memory: PromptMemory;
  readonly knowledge: PromptKnowledge;
  readonly capabilities: PromptCapabilities;
  readonly policies: PromptPolicies;
  readonly constraints: PromptConstraints;
  readonly environment: PromptEnvironment;
  readonly conversation: PromptConversation;
  readonly systemInstructions: string;
  readonly userMessage: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Identity context within a prompt.
 */
export interface PromptIdentity {
  readonly identityId: string;
  readonly name: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly preferences: Readonly<Record<string, unknown>>;
}

/**
 * Preference context within a prompt.
 */
export interface PromptPreferences {
  readonly language: string;
  readonly timezone: string;
  readonly verbosity: string;
  readonly explanationLevel: string;
  readonly answerStyle: string;
  readonly creativity: number;
  readonly custom: Readonly<Record<string, unknown>>;
}

/**
 * Memory context within a prompt.
 */
export interface PromptMemory {
  readonly workingEntries: readonly MemoryEntry[];
  readonly sessionEntries: readonly MemoryEntry[];
  readonly relevantMemories: readonly MemoryRelevantEntry[];
  readonly summary: string | null;
}

/**
 * A memory entry relevant to the current context.
 */
export interface MemoryRelevantEntry {
  readonly key: string;
  readonly value: string;
  readonly relevance: number;
  readonly source: string;
}

/**
 * Knowledge context within a prompt.
 */
export interface PromptKnowledge {
  readonly relevantItems: readonly KnowledgeRelevantItem[];
  readonly namespaces: readonly string[];
  readonly confidence: number;
}

/**
 * A knowledge item relevant to the current context.
 */
export interface KnowledgeRelevantItem {
  readonly id: string;
  readonly name: string;
  readonly content: string;
  readonly relevance: number;
  readonly source: string;
}

/**
 * Capability context within a prompt.
 */
export interface PromptCapabilities {
  readonly available: readonly string[];
  readonly required: readonly string[];
  readonly denied: readonly string[];
}

/**
 * Policy context within a prompt.
 */
export interface PromptPolicies {
  readonly maxTokens: number;
  readonly temperature: number;
  readonly topP: number;
  readonly frequencyPenalty: number;
  readonly presencePenalty: number;
  readonly stopSequences: readonly string[];
  readonly custom: Readonly<Record<string, unknown>>;
}

/**
 * Constraint context within a prompt.
 */
export interface PromptConstraints {
  readonly maxOutputTokens: number;
  readonly forbiddenTopics: readonly string[];
  readonly requiredTopics: readonly string[];
  readonly formatHints: readonly string[];
}

/**
 * Environment context within a prompt.
 */
export interface PromptEnvironment {
  readonly runtimeVersion: SemVer;
  readonly sessionId: string;
  readonly conversationId: string;
  readonly timestamp: Timestamp;
  readonly timezone: string;
}

/**
 * Conversation history within a prompt.
 */
export interface PromptConversation {
  readonly turnCount: number;
  readonly recentMessages: readonly PromptMessageEntry[];
  readonly summary: string | null;
  readonly threadContext: string | null;
}

/**
 * A single message entry in conversation history for prompt assembly.
 */
export interface PromptMessageEntry {
  readonly role: MessageRole;
  readonly content: string;
  readonly tokens: number;
  readonly turn: number;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — RESPONSE PLAN
// ═══════════════════════════════════════════════════════════════════

/**
 * ResponsePlan — the decision made by the Response Planner
 * before generating an answer.
 */
export interface ResponsePlan {
  readonly id: ResponsePlanId;
  readonly decision: ResponseDecision;
  readonly confidence: number;
  readonly reasoning: string;
  readonly targetTool?: string;
  readonly targetWorkflow?: string;
  readonly targetMemory?: string;
  readonly clarificationQuestions?: readonly string[];
  readonly escalationReason?: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — PROVIDER
// ═══════════════════════════════════════════════════════════════════

/**
 * Provider configuration for an adapter instance.
 */
export interface ProviderConfig {
  readonly adapterType: ProviderAdapterType;
  readonly name: string;
  readonly endpoint?: string;
  readonly apiKey?: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly timeoutMs: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Model descriptor for routing decisions.
 */
export interface ModelDescriptor {
  readonly id: ModelId;
  readonly name: string;
  readonly provider: string;
  readonly capabilities: readonly string[];
  readonly maxContextTokens: number;
  readonly maxOutputTokens: number;
  readonly costPer1kInputTokens: number;
  readonly costPer1kOutputTokens: number;
  readonly averageLatencyMs: number;
  readonly privacyLevel: number;
  readonly accuracyScore: number;
  readonly supportsStreaming: boolean;
  readonly supportsEmbedding: boolean;
  readonly tags: readonly string[];
  readonly available: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Result of a provider completion call.
 */
export interface CompletionResult {
  readonly id: string;
  readonly content: string;
  readonly tokens: TokenUsage;
  readonly model: string;
  readonly provider: string;
  readonly finishReason: string;
  readonly latencyMs: number;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Streaming chunk from a provider.
 */
export interface StreamingChunk {
  readonly id: string;
  readonly content: string;
  readonly model: string;
  readonly provider: string;
  readonly finishReason: string | null;
  readonly tokenCount: number;
  readonly latencyMs: number;
  readonly createdAt: Timestamp;
}

/**
 * Embedding result from a provider.
 */
export interface EmbeddingResult {
  readonly id: string;
  readonly embedding: readonly number[];
  readonly model: string;
  readonly provider: string;
  readonly tokens: number;
  readonly latencyMs: number;
  readonly createdAt: Timestamp;
}

/**
 * Token count estimation result.
 */
export interface TokenEstimation {
  readonly inputTokens: number;
  readonly outputTokensEstimate: number;
  readonly totalTokens: number;
}

/**
 * Provider health status.
 */
export interface ProviderHealth {
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly errorRate: number;
  readonly lastCheckAt: Timestamp;
  readonly details?: string;
}

/**
 * Provider metadata information.
 */
export interface ProviderMetadata {
  readonly name: string;
  readonly version: SemVer;
  readonly adapterType: ProviderAdapterType;
  readonly supportedModels: readonly string[];
  readonly capabilities: readonly string[];
  readonly maxContextTokens: number;
  readonly supportsStreaming: boolean;
  readonly supportsEmbedding: boolean;
  readonly supportsVision: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — COGNITIVE CONTEXT
// ═══════════════════════════════════════════════════════════════════

/**
 * CognitiveContext — the unified, immutable context assembled by Context Builder.
 * Contains all data needed for a single cognitive cycle.
 */
export interface CognitiveContext {
  readonly sessionId: CognitiveSessionId;
  readonly conversationId: ConversationId | null;
  readonly turnId: TurnId | null;
  readonly intent: Intent | null;
  readonly identity: CognitiveIdentityContext | null;
  readonly memory: CognitiveMemoryContext;
  readonly knowledge: CognitiveKnowledgeContext;
  readonly capabilities: CognitiveCapabilitiesContext;
  readonly policies: CognitivePoliciesContext;
  readonly environment: CognitiveEnvironmentContext;
  readonly conversationHistory: CognitiveConversationHistory;
  readonly assembledAt: Timestamp;
  readonly tokenEstimate: number;
}

/**
 * Identity context within cognitive context.
 */
export interface CognitiveIdentityContext {
  readonly identityId: string;
  readonly name: string;
  readonly roles: readonly string[];
  readonly preferences: Readonly<Record<string, unknown>>;
  readonly profile: Readonly<Record<string, unknown>>;
}

/**
 * Memory context within cognitive context.
 */
export interface CognitiveMemoryContext {
  readonly workingEntries: readonly MemoryEntry[];
  readonly sessionEntries: readonly MemoryEntry[];
  readonly relevantEntries: readonly MemoryRelevantEntry[];
  readonly summary: string | null;
}

/**
 * Knowledge context within cognitive context.
 */
export interface CognitiveKnowledgeContext {
  readonly relevantItems: readonly KnowledgeRelevantItem[];
  readonly namespaces: readonly string[];
  readonly totalItems: number;
}

/**
 * Capabilities context within cognitive context.
 */
export interface CognitiveCapabilitiesContext {
  readonly available: readonly string[];
  readonly required: readonly string[];
  readonly denied: readonly string[];
  readonly activePacks: readonly string[];
}

/**
 * Policies context within cognitive context.
 */
export interface CognitivePoliciesContext {
  readonly maxTokens: number;
  readonly allowedProviders: readonly string[];
  readonly privacyLevel: number;
  readonly trustLevel: number;
  readonly costBudget: number;
  readonly activePolicies: readonly string[];
}

/**
 * Environment context within cognitive context.
 */
export interface CognitiveEnvironmentContext {
  readonly runtimeVersion: SemVer;
  readonly sessionId: string;
  readonly timezone: string;
  readonly timestamp: Timestamp;
}

/**
 * Conversation history within cognitive context.
 */
export interface CognitiveConversationHistory {
  readonly turnCount: number;
  readonly recentMessages: readonly PromptMessageEntry[];
  readonly summary: string | null;
}

/**
 * Reusable MemoryEntry reference for context assembly.
 */
export interface MemoryEntry {
  readonly key: string;
  readonly value: unknown;
  readonly layer: string;
  readonly relevance?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — TRACE
// ═══════════════════════════════════════════════════════════════════

/**
 * CognitiveTraceEntry — audit trail entry for cognitive processing.
 */
export interface CognitiveTraceEntry {
  readonly id: CognitiveTraceId;
  readonly sessionId: CognitiveSessionId;
  readonly conversationId: ConversationId | null;
  readonly turnId: TurnId | null;
  readonly level: CognitiveTraceLevel;
  readonly phase: string;
  readonly action: string;
  readonly message: string;
  readonly timestamp: Timestamp;
  readonly durationMs: number | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — SUMMARY (Context Compression)
// ═══════════════════════════════════════════════════════════════════

/**
 * Summary — result of context compression.
 */
export interface Summary {
  readonly id: SummaryId;
  readonly conversationId: ConversationId;
  readonly turnRangeStart: number;
  readonly turnRangeEnd: number;
  readonly originalTokens: number;
  readonly compressedTokens: number;
  readonly compressionRatio: number;
  readonly strategy: CompressionStrategy;
  readonly content: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — COGNITIVE METRICS
// ═══════════════════════════════════════════════════════════════════

/**
 * Aggregate cognitive metrics snapshot.
 */
export interface CognitiveMetrics {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly totalConversations: number;
  readonly activeConversations: number;
  readonly totalTurns: number;
  readonly totalMessages: number;
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly totalLatencyMs: number;
  readonly averageLatencyMs: number;
  readonly providerUsage: ReadonlyMap<string, number>;
  readonly modelUsage: ReadonlyMap<string, number>;
  readonly totalRetries: number;
  readonly totalFailures: number;
  readonly toolInvocations: number;
  readonly workflowInvocations: number;
  readonly memoryHits: number;
  readonly knowledgeHits: number;
  readonly cacheHits: number;
  readonly totalCompletions: number;
  readonly totalStreams: number;
  readonly totalCompressions: number;
  readonly eventsPublished: number;
}

// ═══════════════════════════════════════════════════════════════════
// POLICIES
// ═══════════════════════════════════════════════════════════════════

/**
 * A cognitive policy definition.
 */
export interface CognitivePolicyDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: CognitivePolicyType;
  readonly rules: Readonly<Record<string, unknown>>;
  readonly priority: number;
  readonly description: string;
}

/**
 * Result of a policy evaluation.
 */
export interface CognitivePolicyResult {
  readonly allowed: boolean;
  readonly policyId: string;
  readonly policyType: CognitivePolicyType;
  readonly reason: string;
  readonly constraints: Readonly<Record<string, unknown>>;
}

/**
 * Routing rule for model selection.
 */
export interface RoutingRule {
  readonly id: string;
  readonly name: string;
  readonly condition: string;
  readonly modelId: ModelId;
  readonly priority: number;
  readonly policyTypes: readonly RoutingPolicyType[];
  readonly fallbackModelId: ModelId | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Configuration for the Cognitive Runtime.
 */
export interface CognitiveRuntimeConfig {
  readonly maxTokensPerTurn: number;
  readonly maxTurnsPerConversation: number;
  readonly maxConversationsPerSession: number;
  readonly defaultTemperature: number;
  readonly defaultTopP: number;
  readonly defaultMaxOutputTokens: number;
  readonly compressionThreshold: number;
  readonly compressionStrategy: CompressionStrategy;
  readonly summaryRetentionTurns: number;
  readonly defaultProvider: string;
  readonly enableStreaming: boolean;
  readonly enableMemoryBridge: boolean;
  readonly enableKnowledgeRetrieval: boolean;
  readonly enableWorkflowInvocation: boolean;
  readonly enableToolInvocation: boolean;
  readonly traceEnabled: boolean;
  readonly metricsEnabled: boolean;
  readonly policies: readonly CognitivePolicyDefinition[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Default configuration values.
 */
export const DefaultCognitiveRuntimeConfig: CognitiveRuntimeConfig = {
  maxTokensPerTurn: 4096,
  maxTurnsPerConversation: 100,
  maxConversationsPerSession: 10,
  defaultTemperature: 0.7,
  defaultTopP: 1.0,
  defaultMaxOutputTokens: 2048,
  compressionThreshold: 0.8,
  compressionStrategy: CompressionStrategy.Summary,
  summaryRetentionTurns: 20,
  defaultProvider: 'openai',
  enableStreaming: true,
  enableMemoryBridge: true,
  enableKnowledgeRetrieval: true,
  enableWorkflowInvocation: true,
  enableToolInvocation: true,
  traceEnabled: true,
  metricsEnabled: true,
  policies: [],
  metadata: {},
};

// ═══════════════════════════════════════════════════════════════════
// ADAPTER INTERFACES (Provider Sandbox Contracts)
// ═══════════════════════════════════════════════════════════════════

/**
 * ProviderAdapter — the interface every LLM provider MUST implement.
 * Core never knows specific SDKs — only this interface.
 */
export interface ProviderAdapter {
  readonly id: ProviderAdapterId;
  readonly type: ProviderAdapterType;
  readonly name: string;
  readonly metadata: () => Promise<ProviderMetadata>;
  readonly health: () => Promise<ProviderHealth>;
  readonly generate: (context: PromptContext) => Promise<CompletionResult>;
  readonly stream: (context: PromptContext) => AsyncIterable<StreamingChunk>;
  readonly embed: (text: string) => Promise<EmbeddingResult>;
  readonly tokenize: (text: string) => Promise<TokenEstimation>;
  readonly estimate: (promptTokens: number, outputTokens: number) => Promise<number>;
  readonly initialize: (config: ProviderConfig) => Promise<void>;
  readonly shutdown: () => Promise<void>;
}

/**
 * Adapter sandbox — isolates each provider adapter.
 */
export interface AdapterSandbox {
  readonly register: (adapter: ProviderAdapter) => void;
  readonly unregister: (adapterId: ProviderAdapterId) => void;
  readonly get: (adapterId: ProviderAdapterId) => ProviderAdapter | undefined;
  readonly getByName: (name: string) => ProviderAdapter | undefined;
  readonly list: () => readonly ProviderAdapter[];
  readonly healthCheck: () => Promise<ReadonlyMap<string, ProviderHealth>>;
  readonly shutdownAll: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME INTEGRATION CONTRACTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Contract for Memory Runtime integration.
 */
export interface MemoryRuntimeContract {
  readonly retrieve: (query: string, limit?: number) => Promise<readonly MemoryRelevantEntry[]>;
  readonly store: (key: string, value: unknown, scope?: Record<string, unknown>) => Promise<void>;
  readonly getSessionEntries: (sessionId: string) => Promise<readonly MemoryEntry[]>;
  readonly getWorkingEntries: (executionId: string) => Promise<readonly MemoryEntry[]>;
}

/**
 * Contract for Knowledge Runtime integration.
 */
export interface KnowledgeRuntimeContract {
  readonly retrieve: (query: string, limit?: number) => Promise<readonly KnowledgeRelevantItem[]>;
  readonly getNamespaces: () => Promise<readonly string[]>;
  readonly itemCount: (namespaceId?: string) => Promise<number>;
}

/**
 * Contract for Identity Runtime integration.
 */
export interface IdentityRuntimeContract {
  readonly resolve: (sessionId: string) => Promise<CognitiveIdentityContext | null>;
  readonly getRoles: (identityId: string) => Promise<readonly string[]>;
  readonly getPreferences: (identityId: string) => Promise<Readonly<Record<string, unknown>>>;
}

/**
 * Contract for Workflow Runtime integration.
 */
export interface WorkflowRuntimeContract {
  readonly invoke: (workflowId: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly available: () => Promise<readonly string[]>;
  readonly canInvoke: (workflowId: string, identityId: string) => Promise<boolean>;
}

/**
 * Contract for Tool Runtime integration.
 */
export interface ToolRuntimeContract {
  readonly invoke: (toolName: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly available: () => Promise<readonly string[]>;
  readonly canInvoke: (toolName: string, identityId: string) => Promise<boolean>;
}

/**
 * Contract for Capability Runtime integration.
 */
export interface CapabilityRuntimeContract {
  readonly available: () => Promise<readonly string[]>;
  readonly activePacks: () => Promise<readonly string[]>;
  readonly isAllowed: (capability: string, identityId: string) => Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════
// COGNITIVE SESSION
// ═══════════════════════════════════════════════════════════════════

/**
 * A cognitive session — the top-level container for all cognitive activity.
 */
export interface CognitiveSession {
  readonly id: CognitiveSessionId;
  readonly identityId: string | null;
  readonly conversations: readonly Conversation[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}
