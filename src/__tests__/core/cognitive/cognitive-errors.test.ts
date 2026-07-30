/**
 * Cognitive Errors Tests — TASK-AIS-003I.000
 *
 * Tests the full Cognitive Error hierarchy:
 *   - Base CognitiveError (code, retryable, toTaskError, details, occurredAt)
 *   - Intent errors (IntentResolutionError, IntentClassificationError, IntentConfidenceError)
 *   - Context errors (ContextBuildError, ContextCompressionError, ContextOverflowError)
 *   - Conversation errors (ConversationNotFoundError, ConversationClosedError, TurnLimitError)
 *   - Provider errors (ProviderError, ProviderUnavailableError, ProviderTimeoutError, ProviderAdapterError)
 *   - Router errors (ModelRoutingError, NoAvailableModelError)
 *   - Prompt errors (PromptBuildError, PromptValidationError)
 *   - Policy errors (CognitivePolicyViolationError, CognitivePolicyEvalError)
 *   - Response planner errors (ResponsePlanningError)
 *   - Memory bridge errors (MemoryBridgeError)
 *   - Runtime lifecycle errors (CognitiveRuntimeError, CognitiveStateError, CognitiveNotInitializedError)
 *   - Streaming errors (StreamingError, StreamingCancelledError)
 */

import {
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
} from '../../../core/cognitive/cognitive-errors.js';

// ─── Base CognitiveError ─────────────────────────────────────────

describe('CognitiveError', () => {
  it('has code, message, name, retryable, details, occurredAt', () => {
    const err = new CognitiveError('TEST_001', 'test message', {
      retryable: true,
      details: ['detail-1', 'detail-2'],
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CognitiveError);
    expect(err.name).toBe('CognitiveError');
    expect(err.code).toBe('TEST_001');
    expect(err.message).toBe('test message');
    expect(err.retryable).toBe(true);
    expect(err.details).toEqual(['detail-1', 'detail-2']);
    expect(err.occurredAt).toBeTruthy();
    expect(typeof err.occurredAt).toBe('string');
  });

  it('defaults retryable to false', () => {
    const err = new CognitiveError('TEST_002', 'msg');
    expect(err.retryable).toBe(false);
  });

  it('defaults details to empty array', () => {
    const err = new CognitiveError('TEST_003', 'msg');
    expect(err.details).toEqual([]);
  });

  it('sets occurredAt to a valid ISO timestamp', () => {
    const before = new Date().toISOString();
    const err = new CognitiveError('TEST_004', 'msg');
    const after = new Date().toISOString();
    expect(err.occurredAt >= before && err.occurredAt <= after).toBe(true);
  });

  it('toTaskError returns correct structure', () => {
    const err = new CognitiveError('CODE_X', 'some error', { retryable: true });
    const taskError = err.toTaskError();

    expect(taskError).toEqual({
      code: 'CODE_X',
      message: 'some error',
      retryable: true,
    });
  });

  it('supports cause via Error cause option', () => {
    const cause = new Error('root cause');
    const err = new CognitiveError('TEST_005', 'wrapper', { cause });
    expect(err.cause).toBe(cause);
  });
});

// ─── Intent Errors ───────────────────────────────────────────────

describe('IntentResolutionError', () => {
  it('is a CognitiveError', () => {
    const err = new IntentResolutionError('cannot resolve intent');
    expect(err).toBeInstanceOf(CognitiveError);
    expect(err).toBeInstanceOf(IntentResolutionError);
  });

  it('has code COGNITIVE_INTENT_001', () => {
    const err = new IntentResolutionError('fail');
    expect(err.code).toBe('COGNITIVE_INTENT_001');
  });

  it('is retryable', () => {
    const err = new IntentResolutionError('fail');
    expect(err.retryable).toBe(true);
  });

  it('has name IntentResolutionError', () => {
    const err = new IntentResolutionError('fail');
    expect(err.name).toBe('IntentResolutionError');
  });

  it('supports details and cause', () => {
    const cause = new Error('root');
    const err = new IntentResolutionError('fail', {
      details: ['det-1'],
      cause,
    });
    expect(err.details).toEqual(['det-1']);
    expect(err.cause).toBe(cause);
  });

  it('toTaskError works', () => {
    const err = new IntentResolutionError('fail');
    const t = err.toTaskError();
    expect(t.code).toBe('COGNITIVE_INTENT_001');
    expect(t.retryable).toBe(true);
  });
});

describe('IntentClassificationError', () => {
  it('has code COGNITIVE_INTENT_002 and is retryable', () => {
    const err = new IntentClassificationError('class fail');
    expect(err.code).toBe('COGNITIVE_INTENT_002');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('IntentClassificationError');
    expect(err).toBeInstanceOf(CognitiveError);
  });
});

describe('IntentConfidenceError', () => {
  it('has code COGNITIVE_INTENT_003 and is retryable', () => {
    const err = new IntentConfidenceError('low confidence');
    expect(err.code).toBe('COGNITIVE_INTENT_003');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('IntentConfidenceError');
    expect(err).toBeInstanceOf(CognitiveError);
  });
});

// ─── Context Errors ───────────────────────────────────────────────

describe('ContextBuildError', () => {
  it('has code COGNITIVE_CTX_001 and is retryable', () => {
    const err = new ContextBuildError('build fail');
    expect(err.code).toBe('COGNITIVE_CTX_001');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ContextBuildError');
    expect(err).toBeInstanceOf(CognitiveError);
  });
});

describe('ContextCompressionError', () => {
  it('has code COGNITIVE_CTX_002 and is retryable', () => {
    const err = new ContextCompressionError('compression fail');
    expect(err.code).toBe('COGNITIVE_CTX_002');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ContextCompressionError');
    expect(err).toBeInstanceOf(CognitiveError);
  });
});

describe('ContextOverflowError', () => {
  it('has code COGNITIVE_CTX_003 and is NOT retryable', () => {
    const err = new ContextOverflowError(5000, 4096);
    expect(err.code).toBe('COGNITIVE_CTX_003');
    expect(err.retryable).toBe(false);
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores currentTokens and maxTokens', () => {
    const err = new ContextOverflowError(5000, 4096);
    expect(err.currentTokens).toBe(5000);
    expect(err.maxTokens).toBe(4096);
  });

  it('message formats with token values', () => {
    const err = new ContextOverflowError(8000, 4096);
    expect(err.message).toContain('8000');
    expect(err.message).toContain('4096');
  });

  it('has details with current and max', () => {
    const err = new ContextOverflowError(8000, 4096);
    expect(err.details).toContain('current=8000');
    expect(err.details).toContain('max=4096');
  });
});

// ─── Conversation Errors ───────────────────────────────────────────

describe('ConversationNotFoundError', () => {
  it('has code COGNITIVE_CONV_001 and is NOT retryable', () => {
    const err = new ConversationNotFoundError('conv-123');
    expect(err.code).toBe('COGNITIVE_CONV_001');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('ConversationNotFoundError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores conversationId', () => {
    const err = new ConversationNotFoundError('conv-abc');
    expect(err.conversationId).toBe('conv-abc');
  });

  it('message includes conversationId', () => {
    const err = new ConversationNotFoundError('conv-xyz');
    expect(err.message).toContain('conv-xyz');
  });
});

describe('ConversationClosedError', () => {
  it('has code COGNITIVE_CONV_002 and is NOT retryable', () => {
    const err = new ConversationClosedError('conv-123');
    expect(err.code).toBe('COGNITIVE_CONV_002');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('ConversationClosedError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores conversationId', () => {
    const err = new ConversationClosedError('conv-456');
    expect(err.conversationId).toBe('conv-456');
  });
});

describe('TurnLimitError', () => {
  it('has code COGNITIVE_CONV_003 and is NOT retryable', () => {
    const err = new TurnLimitError(100, 100);
    expect(err.code).toBe('COGNITIVE_CONV_003');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('TurnLimitError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores currentTurns and maxTurns', () => {
    const err = new TurnLimitError(99, 100);
    expect(err.currentTurns).toBe(99);
    expect(err.maxTurns).toBe(100);
  });

  it('message formats turn values', () => {
    const err = new TurnLimitError(50, 100);
    expect(err.message).toContain('50/100');
  });
});

// ─── Provider Errors ──────────────────────────────────────────────

describe('ProviderError', () => {
  it('has code COGNITIVE_PROVIDER_001', () => {
    const err = new ProviderError('openai', 'API down');
    expect(err.code).toBe('COGNITIVE_PROVIDER_001');
    expect(err.name).toBe('ProviderError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores providerName', () => {
    const err = new ProviderError('anthropic', 'fail');
    expect(err.providerName).toBe('anthropic');
  });

  it('defaults retryable to true', () => {
    const err = new ProviderError('openai', 'fail');
    expect(err.retryable).toBe(true);
  });

  it('allows overriding retryable', () => {
    const err = new ProviderError('openai', 'auth fail', { retryable: false });
    expect(err.retryable).toBe(false);
  });

  it('message includes provider name', () => {
    const err = new ProviderError('openai', 'API down');
    expect(err.message).toContain('openai');
    expect(err.message).toContain('API down');
  });

  it('supports cause', () => {
    const cause = new Error('network');
    const err = new ProviderError('openai', 'timeout', { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('ProviderUnavailableError', () => {
  it('has code COGNITIVE_PROVIDER_002 and is retryable', () => {
    const err = new ProviderUnavailableError('openai');
    expect(err.code).toBe('COGNITIVE_PROVIDER_002');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ProviderUnavailableError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores providerName', () => {
    const err = new ProviderUnavailableError('anthropic');
    expect(err.providerName).toBe('anthropic');
  });

  it('message includes provider name', () => {
    const err = new ProviderUnavailableError('ollama');
    expect(err.message).toContain('ollama');
  });
});

describe('ProviderTimeoutError', () => {
  it('has code COGNITIVE_PROVIDER_003 and is retryable', () => {
    const err = new ProviderTimeoutError('openai', 5000);
    expect(err.code).toBe('COGNITIVE_PROVIDER_003');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ProviderTimeoutError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores providerName and timeoutMs', () => {
    const err = new ProviderTimeoutError('anthropic', 10000);
    expect(err.providerName).toBe('anthropic');
    expect(err.timeoutMs).toBe(10000);
  });

  it('message includes timeout value', () => {
    const err = new ProviderTimeoutError('openai', 3000);
    expect(err.message).toContain('3000ms');
  });
});

describe('ProviderAdapterError', () => {
  it('has code COGNITIVE_PROVIDER_004 and is retryable', () => {
    const err = new ProviderAdapterError('OpenAI', 'bad response');
    expect(err.code).toBe('COGNITIVE_PROVIDER_004');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ProviderAdapterError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores adapterType', () => {
    const err = new ProviderAdapterError('Anthropic', 'parse fail');
    expect(err.adapterType).toBe('Anthropic');
  });

  it('message includes adapter type', () => {
    const err = new ProviderAdapterError('Google', 'error');
    expect(err.message).toContain('Google');
  });

  it('supports cause', () => {
    const cause = new Error('json parse');
    const err = new ProviderAdapterError('OpenAI', 'fail', { cause });
    expect(err.cause).toBe(cause);
  });
});

// ─── Model Router Errors ─────────────────────────────────────────

describe('ModelRoutingError', () => {
  it('has code COGNITIVE_ROUTER_001 and is retryable', () => {
    const err = new ModelRoutingError('routing failed');
    expect(err.code).toBe('COGNITIVE_ROUTER_001');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ModelRoutingError');
    expect(err).toBeInstanceOf(CognitiveError);
  });
});

describe('NoAvailableModelError', () => {
  it('has code COGNITIVE_ROUTER_002 and is retryable', () => {
    const err = new NoAvailableModelError('cost < 0.01');
    expect(err.code).toBe('COGNITIVE_ROUTER_002');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('NoAvailableModelError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('message includes criteria string', () => {
    const err = new NoAvailableModelError('privacyLevel >= 5');
    expect(err.message).toContain('privacyLevel >= 5');
  });
});

// ─── Prompt Errors ────────────────────────────────────────────────

describe('PromptBuildError', () => {
  it('has code COGNITIVE_PROMPT_001 and is retryable', () => {
    const err = new PromptBuildError('build failed');
    expect(err.code).toBe('COGNITIVE_PROMPT_001');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('PromptBuildError');
    expect(err).toBeInstanceOf(CognitiveError);
  });
});

describe('PromptValidationError', () => {
  it('has code COGNITIVE_PROMPT_002 and is NOT retryable', () => {
    const err = new PromptValidationError('empty message');
    expect(err.code).toBe('COGNITIVE_PROMPT_002');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('PromptValidationError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('supports details', () => {
    const err = new PromptValidationError('invalid', {
      details: ['maxTokens is 0'],
    });
    expect(err.details).toEqual(['maxTokens is 0']);
  });
});

// ─── Policy Errors ────────────────────────────────────────────────

describe('CognitivePolicyViolationError', () => {
  it('has code COGNITIVE_POLICY_001 and is NOT retryable', () => {
    const err = new CognitivePolicyViolationError('pol-1', 'Privacy', 'data leak');
    expect(err.code).toBe('COGNITIVE_POLICY_001');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('CognitivePolicyViolationError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores policyId and policyType', () => {
    const err = new CognitivePolicyViolationError('pol-2', 'Cost', 'budget exceeded');
    expect(err.policyId).toBe('pol-2');
    expect(err.policyType).toBe('Cost');
  });

  it('message includes policy type and reason', () => {
    const err = new CognitivePolicyViolationError('pol-3', 'Trust', 'low trust');
    expect(err.message).toContain('Trust');
    expect(err.message).toContain('low trust');
  });

  it('details include policyId', () => {
    const err = new CognitivePolicyViolationError('pol-4', 'Token', 'over limit');
    expect(err.details).toContain('policyId=pol-4');
  });
});

describe('CognitivePolicyEvalError', () => {
  it('has code COGNITIVE_POLICY_002 and is retryable', () => {
    const err = new CognitivePolicyEvalError('eval failed');
    expect(err.code).toBe('COGNITIVE_POLICY_002');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('CognitivePolicyEvalError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('supports cause', () => {
    const cause = new Error('script error');
    const err = new CognitivePolicyEvalError('fail', { cause });
    expect(err.cause).toBe(cause);
  });
});

// ─── Response Planning Errors ─────────────────────────────────────

describe('ResponsePlanningError', () => {
  it('has code COGNITIVE_PLAN_001 and is retryable', () => {
    const err = new ResponsePlanningError('plan fail');
    expect(err.code).toBe('COGNITIVE_PLAN_001');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ResponsePlanningError');
    expect(err).toBeInstanceOf(CognitiveError);
  });
});

// ─── Memory Bridge Errors ─────────────────────────────────────────

describe('MemoryBridgeError', () => {
  it('has code COGNITIVE_BRIDGE_001', () => {
    const err = new MemoryBridgeError('bridge fail');
    expect(err.code).toBe('COGNITIVE_BRIDGE_001');
    expect(err.name).toBe('MemoryBridgeError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('defaults retryable to true', () => {
    const err = new MemoryBridgeError('fail');
    expect(err.retryable).toBe(true);
  });

  it('allows overriding retryable to false', () => {
    const err = new MemoryBridgeError('perm denied', { retryable: false });
    expect(err.retryable).toBe(false);
  });
});

// ─── Runtime Lifecycle Errors ───────────────────────────────────

describe('CognitiveRuntimeError', () => {
  it('has code COGNITIVE_RUNTIME_001 and is NOT retryable', () => {
    const err = new CognitiveRuntimeError('runtime crash');
    expect(err.code).toBe('COGNITIVE_RUNTIME_001');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('CognitiveRuntimeError');
    expect(err).toBeInstanceOf(CognitiveError);
  });
});

describe('CognitiveStateError', () => {
  it('has code COGNITIVE_RUNTIME_002 and is NOT retryable', () => {
    const err = new CognitiveStateError('Ready', 'Disposed');
    expect(err.code).toBe('COGNITIVE_RUNTIME_002');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('CognitiveStateError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('stores currentState and requestedState', () => {
    const err = new CognitiveStateError('Processing', 'Created');
    expect(err.currentState).toBe('Processing');
    expect(err.requestedState).toBe('Created');
  });

  it('message formats state transition', () => {
    const err = new CognitiveStateError('Ready', 'Processing');
    expect(err.message).toContain('Ready');
    expect(err.message).toContain('Processing');
  });

  it('details include from and to', () => {
    const err = new CognitiveStateError('Ready', 'Disposed');
    expect(err.details).toContain('from=Ready');
    expect(err.details).toContain('to=Disposed');
  });
});

describe('CognitiveNotInitializedError', () => {
  it('has code COGNITIVE_RUNTIME_003 and is NOT retryable', () => {
    const err = new CognitiveNotInitializedError();
    expect(err.code).toBe('COGNITIVE_RUNTIME_003');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('CognitiveNotInitializedError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('has a fixed message', () => {
    const err = new CognitiveNotInitializedError();
    expect(err.message).toContain('not initialized');
  });
});

// ─── Streaming Errors ─────────────────────────────────────────────

describe('StreamingError', () => {
  it('has code COGNITIVE_STREAM_001', () => {
    const err = new StreamingError('connection lost');
    expect(err.code).toBe('COGNITIVE_STREAM_001');
    expect(err.name).toBe('StreamingError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('defaults retryable to true', () => {
    const err = new StreamingError('fail');
    expect(err.retryable).toBe(true);
  });

  it('allows overriding retryable', () => {
    const err = new StreamingError('cancelled', { retryable: false });
    expect(err.retryable).toBe(false);
  });
});

describe('StreamingCancelledError', () => {
  it('has code COGNITIVE_STREAM_002 and is NOT retryable', () => {
    const err = new StreamingCancelledError();
    expect(err.code).toBe('COGNITIVE_STREAM_002');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('StreamingCancelledError');
    expect(err).toBeInstanceOf(CognitiveError);
  });

  it('has a fixed message', () => {
    const err = new StreamingCancelledError();
    expect(err.message).toContain('cancelled');
  });
});

// ─── Cross-cutting: toTaskError on all subtypes ───────────────────

describe('toTaskError on all error subtypes', () => {
  const testCases: Array<[new () => CognitiveError, string, boolean]> = [
    [IntentResolutionError as any, 'COGNITIVE_INTENT_001', true],
    [IntentClassificationError as any, 'COGNITIVE_INTENT_002', true],
    [IntentConfidenceError as any, 'COGNITIVE_INTENT_003', true],
    [ContextBuildError as any, 'COGNITIVE_CTX_001', true],
    [ContextCompressionError as any, 'COGNITIVE_CTX_002', true],
    [ContextOverflowError as any, 'COGNITIVE_CTX_003', false],
    [ConversationNotFoundError as any, 'COGNITIVE_CONV_001', false],
    [ConversationClosedError as any, 'COGNITIVE_CONV_002', false],
    [TurnLimitError as any, 'COGNITIVE_CONV_003', false],
    [ModelRoutingError as any, 'COGNITIVE_ROUTER_001', true],
    [NoAvailableModelError as any, 'COGNITIVE_ROUTER_002', true],
    [PromptBuildError as any, 'COGNITIVE_PROMPT_001', true],
    [PromptValidationError as any, 'COGNITIVE_PROMPT_002', false],
    [CognitivePolicyViolationError as any, 'COGNITIVE_POLICY_001', false],
    [CognitivePolicyEvalError as any, 'COGNITIVE_POLICY_002', true],
    [ResponsePlanningError as any, 'COGNITIVE_PLAN_001', true],
    [MemoryBridgeError as any, 'COGNITIVE_BRIDGE_001', true],
    [CognitiveRuntimeError as any, 'COGNITIVE_RUNTIME_001', false],
    [CognitiveStateError as any, 'COGNITIVE_RUNTIME_002', false],
    [CognitiveNotInitializedError as any, 'COGNITIVE_RUNTIME_003', false],
    [StreamingCancelledError as any, 'COGNITIVE_STREAM_002', false],
  ];

  it.each(testCases)('toTaskError returns code=%s retryable=%s', (Ctor, expectedCode, expectedRetryable) => {
    // Construct with minimal args — some need args, some don't
    let err: CognitiveError;
    try {
      err = new (Ctor as any)();
    } catch {
      err = new (Ctor as any)('test');
    }
    const taskError = err.toTaskError();
    expect(taskError.code).toBe(expectedCode);
    expect(taskError.retryable).toBe(expectedRetryable);
    expect(taskError).toHaveProperty('message');
  });
});
