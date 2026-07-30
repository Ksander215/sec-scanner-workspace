/**
 * Cognitive Runtime — Public API Barrel Export
 * TASK-AIS-003I.000 — Cognitive Runtime & Conversation Orchestrator
 *
 * Conforms to: CON-001.000, ARC-001.001, DOM-002.000, ADR-001..014
 */

// ─── Main Runtime ──────────────────────────────────────────────
export { CognitiveRuntime } from './cognitive-runtime.js';
export type { CognitiveRuntimeConfig } from './cognitive-runtime.js';

// ─── Types ─────────────────────────────────────────────────────
export {
  CognitiveState,
  IntentType,
  IntentComplexity,
  ResponseDecision,
  MessageRole,
  MessageStatus,
  ConversationState,
  StreamingStatus,
  RoutingPolicyType,
  CognitivePolicyType,
  CompressionStrategy,
  ProviderAdapterType,
  CognitiveTraceLevel,
  DefaultCognitiveRuntimeConfig,
} from './types.js';

export type {
  CognitiveSessionId,
  ConversationId,
  MessageId,
  TurnId,
  ThreadId,
  IntentId,
  PromptId,
  ProviderAdapterId,
  ModelId,
  CognitiveTraceId,
  ResponsePlanId,
  SummaryId,
  Intent,
  IntentClassification,
  Message,
  Attachment,
  Turn,
  Thread,
  Conversation,
  TokenUsage,
  PromptContext,
  PromptIdentity,
  PromptPreferences,
  PromptMemory,
  PromptKnowledge,
  PromptCapabilities,
  PromptPolicies,
  PromptConstraints,
  PromptEnvironment,
  PromptConversation,
  MemoryRelevantEntry,
  KnowledgeRelevantItem,
  PromptMessageEntry,
  MemoryEntry,
  ResponsePlan,
  ProviderConfig,
  ModelDescriptor,
  CompletionResult,
  StreamingChunk,
  EmbeddingResult,
  TokenEstimation,
  ProviderHealth,
  ProviderMetadata,
  CognitiveContext,
  CognitiveIdentityContext,
  CognitiveMemoryContext,
  CognitiveKnowledgeContext,
  CognitiveCapabilitiesContext,
  CognitivePoliciesContext,
  CognitiveEnvironmentContext,
  CognitiveConversationHistory,
  CognitiveTraceEntry,
  Summary,
  CognitiveMetrics,
  CognitivePolicyDefinition,
  CognitivePolicyResult,
  RoutingRule,
  ProviderAdapter,
  AdapterSandbox,
  MemoryRuntimeContract,
  KnowledgeRuntimeContract,
  IdentityRuntimeContract,
  WorkflowRuntimeContract,
  ToolRuntimeContract,
  CapabilityRuntimeContract,
  CognitiveSession,
} from './types.js';

// ─── Branded ID helpers ────────────────────────────────────────
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
} from './types.js';

// ─── Intent Runtime ────────────────────────────────────────────
export { IntentRuntime, DefaultIntentRuntimeConfig } from './intent-runtime.js';
export type { IntentRuntimeConfig, IntentRule } from './intent-runtime.js';

// ─── Context Builder ───────────────────────────────────────────
export { ContextBuilder, DefaultContextBuilderConfig } from './context-builder.js';
export type { ContextBuilderConfig } from './context-builder.js';

// ─── Conversation Runtime ─────────────────────────────────────
export { ConversationRuntime, ConversationStore, DefaultConversationRuntimeConfig } from './conversation-runtime.js';
export type { ConversationRuntimeConfig } from './conversation-runtime.js';

// ─── Prompt Composer ────────────────────────────────────────────
export { PromptComposer, DefaultPromptComposerConfig } from './prompt-composer.js';
export type { PromptComposerConfig } from './prompt-composer.js';

// ─── Provider Runtime ──────────────────────────────────────────
export { ProviderRuntime, InMemoryAdapterSandbox } from './provider-runtime.js';

// ─── Model Router ──────────────────────────────────────────────
export { ModelRouter, DefaultModelRouterConfig } from './model-router.js';
export type { ModelRouterConfig } from './model-router.js';

// ─── Response Planner ────────────────────────────────────────
export { ResponsePlanner, DefaultResponsePlannerConfig } from './response-planner.js';
export type { ResponsePlannerConfig } from './response-planner.js';

// ─── Context Compression ──────────────────────────────────────
export { ContextCompressionRuntime, DefaultCompressionConfig } from './context-compression.js';
export type { CompressionConfig } from './context-compression.js';

// ─── Memory Bridge ────────────────────────────────────────────
export { ConversationMemoryBridge, DefaultMemoryBridgeConfig } from './memory-bridge.js';
export type { MemoryBridgeConfig, MemoryBridgeResult } from './memory-bridge.js';

// ─── Cognitive Policies ────────────────────────────────────────
export { CognitivePolicyEngine } from './cognitive-policies.js';
export type { PolicyEvaluator } from './cognitive-policies.js';

// ─── Cognitive Metrics ─────────────────────────────────────────
export { CognitiveMetricsCollector } from './cognitive-metrics.js';

// ─── Cognitive Trace ───────────────────────────────────────────
export { CognitiveTrace } from './cognitive-trace.js';

// ─── FSM ───────────────────────────────────────────────────────
export { createCognitiveFSM } from './cognitive-fsm.js';

// ─── Errors ────────────────────────────────────────────────────
export {
  CognitiveError,
  IntentResolutionError,
  IntentClassificationError,
  IntentConfidenceError,
  ContextBuildError,
  ContextCompressionError,
  ContextOverflowError,
  ConversationNotFoundError,
  ConversationClosedError,
  TurnLimitError,
  ProviderError,
  ProviderUnavailableError,
  ProviderTimeoutError,
  ProviderAdapterError,
  ModelRoutingError,
  NoAvailableModelError,
  PromptBuildError,
  PromptValidationError,
  CognitivePolicyViolationError,
  CognitivePolicyEvalError,
  ResponsePlanningError,
  MemoryBridgeError,
  CognitiveRuntimeError,
  CognitiveStateError,
  CognitiveNotInitializedError,
  StreamingError,
  StreamingCancelledError,
} from './cognitive-errors.js';

// ─── Events ───────────────────────────────────────────────────
export {
  createCognitiveEventBase,
} from './cognitive-events.js';

export type {
  CognitiveEvent,
  ConversationStarted,
  ConversationEnded,
  PromptBuilt,
  ContextBuilt,
  ProviderSelected,
  ModelSelected,
  CompletionStarted,
  CompletionFinished,
  StreamStarted,
  StreamFinished,
  ToolRequested,
  WorkflowRequested,
  MemoryUpdated,
  KnowledgeUpdated,
  SummaryCreated,
  IntentDetected,
  ResponsePlanned,
  CognitiveErrorEvent,
} from './cognitive-events.js';

// ─── Provider Adapters ────────────────────────────────────────
export {
  BaseStubAdapter,
  OpenAIStubAdapter,
  AnthropicStubAdapter,
  GoogleStubAdapter,
  OllamaStubAdapter,
  LmStudioStubAdapter,
  VLLMStubAdapter,
} from './provider-adapters.js';
