/**
 * Cognitive Runtime — Error Hierarchy
 * TASK-AIS-003I.000
 *
 * Custom error types for the Cognitive Runtime.
 * All errors carry: code, retryable flag, and toTaskError() conversion.
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

/**
 * Base error for all Cognitive Runtime errors.
 */
export class CognitiveError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly details: readonly string[];
  readonly occurredAt: string;

  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      details?: readonly string[];
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'CognitiveError';
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details ?? [];
    this.occurredAt = new Date().toISOString();
  }

  toTaskError(): { code: string; message: string; retryable: boolean } {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

// ─── Intent Errors ───────────────────────────────────────────────

export class IntentResolutionError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_INTENT_001', message, { retryable: true, ...options });
    this.name = 'IntentResolutionError';
  }
}

export class IntentClassificationError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_INTENT_002', message, { retryable: true, ...options });
    this.name = 'IntentClassificationError';
  }
}

export class IntentConfidenceError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_INTENT_003', message, { retryable: true, ...options });
    this.name = 'IntentConfidenceError';
  }
}

// ─── Context Errors ────────────────────────────────────────────

export class ContextBuildError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_CTX_001', message, { retryable: true, ...options });
    this.name = 'ContextBuildError';
  }
}

export class ContextCompressionError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_CTX_002', message, { retryable: true, ...options });
    this.name = 'ContextCompressionError';
  }
}

export class ContextOverflowError extends CognitiveError {
  readonly currentTokens: number;
  readonly maxTokens: number;

  constructor(currentTokens: number, maxTokens: number) {
    super(
      'COGNITIVE_CTX_003',
      `Context overflow: ${currentTokens} tokens exceeds limit of ${maxTokens}`,
      { retryable: false, details: [`current=${currentTokens}`, `max=${maxTokens}`] },
    );
    this.name = 'ContextOverflowError';
    this.currentTokens = currentTokens;
    this.maxTokens = maxTokens;
  }
}

// ─── Conversation Errors ────────────────────────────────────────

export class ConversationNotFoundError extends CognitiveError {
  readonly conversationId: string;

  constructor(conversationId: string) {
    super(
      'COGNITIVE_CONV_001',
      `Conversation not found: ${conversationId}`,
      { retryable: false },
    );
    this.name = 'ConversationNotFoundError';
    this.conversationId = conversationId;
  }
}

export class ConversationClosedError extends CognitiveError {
  readonly conversationId: string;

  constructor(conversationId: string) {
    super(
      'COGNITIVE_CONV_002',
      `Conversation is closed: ${conversationId}`,
      { retryable: false },
    );
    this.name = 'ConversationClosedError';
    this.conversationId = conversationId;
  }
}

export class TurnLimitError extends CognitiveError {
  readonly currentTurns: number;
  readonly maxTurns: number;

  constructor(currentTurns: number, maxTurns: number) {
    super(
      'COGNITIVE_CONV_003',
      `Turn limit reached: ${currentTurns}/${maxTurns}`,
      { retryable: false },
    );
    this.name = 'TurnLimitError';
    this.currentTurns = currentTurns;
    this.maxTurns = maxTurns;
  }
}

// ─── Provider Errors ────────────────────────────────────────────

export class ProviderError extends CognitiveError {
  readonly providerName: string;

  constructor(providerName: string, message: string, options?: { retryable?: boolean; cause?: Error }) {
    super(
      'COGNITIVE_PROVIDER_001',
      `Provider '${providerName}': ${message}`,
      { retryable: options?.retryable ?? true, cause: options?.cause },
    );
    this.name = 'ProviderError';
    this.providerName = providerName;
  }
}

export class ProviderUnavailableError extends CognitiveError {
  readonly providerName: string;

  constructor(providerName: string) {
    super(
      'COGNITIVE_PROVIDER_002',
      `Provider '${providerName}' is unavailable`,
      { retryable: true },
    );
    this.name = 'ProviderUnavailableError';
    this.providerName = providerName;
  }
}

export class ProviderTimeoutError extends CognitiveError {
  readonly providerName: string;
  readonly timeoutMs: number;

  constructor(providerName: string, timeoutMs: number) {
    super(
      'COGNITIVE_PROVIDER_003',
      `Provider '${providerName}' timed out after ${timeoutMs}ms`,
      { retryable: true },
    );
    this.name = 'ProviderTimeoutError';
    this.providerName = providerName;
    this.timeoutMs = timeoutMs;
  }
}

export class ProviderAdapterError extends CognitiveError {
  readonly adapterType: string;

  constructor(adapterType: string, message: string, options?: { cause?: Error }) {
    super(
      'COGNITIVE_PROVIDER_004',
      `Adapter '${adapterType}': ${message}`,
      { retryable: true, ...options },
    );
    this.name = 'ProviderAdapterError';
    this.adapterType = adapterType;
  }
}

// ─── Model Router Errors ───────────────────────────────────────

export class ModelRoutingError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_ROUTER_001', message, { retryable: true, ...options });
    this.name = 'ModelRoutingError';
  }
}

export class NoAvailableModelError extends CognitiveError {
  constructor(criteria: string) {
    super(
      'COGNITIVE_ROUTER_002',
      `No available model matching criteria: ${criteria}`,
      { retryable: true },
    );
    this.name = 'NoAvailableModelError';
  }
}

// ─── Prompt Errors ──────────────────────────────────────────────

export class PromptBuildError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_PROMPT_001', message, { retryable: true, ...options });
    this.name = 'PromptBuildError';
  }
}

export class PromptValidationError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[] }) {
    super('COGNITIVE_PROMPT_002', message, { retryable: false, details: options?.details });
    this.name = 'PromptValidationError';
  }
}

// ─── Policy Errors ──────────────────────────────────────────────

export class CognitivePolicyViolationError extends CognitiveError {
  readonly policyId: string;
  readonly policyType: string;

  constructor(policyId: string, policyType: string, reason: string) {
    super(
      'COGNITIVE_POLICY_001',
      `Policy violation [${policyType}]: ${reason}`,
      { retryable: false, details: [`policyId=${policyId}`] },
    );
    this.name = 'CognitivePolicyViolationError';
    this.policyId = policyId;
    this.policyType = policyType;
  }
}

export class CognitivePolicyEvalError extends CognitiveError {
  constructor(message: string, options?: { cause?: Error }) {
    super('COGNITIVE_POLICY_002', message, { retryable: true, ...options });
    this.name = 'CognitivePolicyEvalError';
  }
}

// ─── Response Planner Errors ─────────────────────────────────────

export class ResponsePlanningError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_PLAN_001', message, { retryable: true, ...options });
    this.name = 'ResponsePlanningError';
  }
}

// ─── Memory Bridge Errors ───────────────────────────────────────

export class MemoryBridgeError extends CognitiveError {
  constructor(message: string, options?: { retryable?: boolean; cause?: Error }) {
    super('COGNITIVE_BRIDGE_001', message, { retryable: options?.retryable ?? true, ...options });
    this.name = 'MemoryBridgeError';
  }
}

// ─── Runtime Lifecycle Errors ──────────────────────────────────

export class CognitiveRuntimeError extends CognitiveError {
  constructor(message: string, options?: { details?: readonly string[]; cause?: Error }) {
    super('COGNITIVE_RUNTIME_001', message, { retryable: false, ...options });
    this.name = 'CognitiveRuntimeError';
  }
}

export class CognitiveStateError extends CognitiveError {
  readonly currentState: string;
  readonly requestedState: string;

  constructor(currentState: string, requestedState: string) {
    super(
      'COGNITIVE_RUNTIME_002',
      `Invalid state transition: ${currentState} → ${requestedState}`,
      { retryable: false, details: [`from=${currentState}`, `to=${requestedState}`] },
    );
    this.name = 'CognitiveStateError';
    this.currentState = currentState;
    this.requestedState = requestedState;
  }
}

export class CognitiveNotInitializedError extends CognitiveError {
  constructor() {
    super(
      'COGNITIVE_RUNTIME_003',
      'Cognitive Runtime is not initialized',
      { retryable: false },
    );
    this.name = 'CognitiveNotInitializedError';
  }
}

// ─── Streaming Errors ──────────────────────────────────────────

export class StreamingError extends CognitiveError {
  constructor(message: string, options?: { retryable?: boolean; cause?: Error }) {
    super('COGNITIVE_STREAM_001', message, { retryable: options?.retryable ?? true, ...options });
    this.name = 'StreamingError';
  }
}

export class StreamingCancelledError extends CognitiveError {
  constructor() {
    super('COGNITIVE_STREAM_002', 'Stream was cancelled', { retryable: false });
    this.name = 'StreamingCancelledError';
  }
}
