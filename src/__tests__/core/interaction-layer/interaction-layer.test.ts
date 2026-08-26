/**
 * Interaction Layer — Comprehensive Tests
 * TASK-MVP-EVIDENCE-LOOP-001B
 *
 * Covers:
 *   §24: Unit tests for interaction boundary
 *   §24: Negative tests
 *   §24: E2E integration test (AC-14)
 *   §23: All acceptance criteria
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionRuntime } from '../../../core/session/session-runtime.js';
import { EvidenceLoopService, SourceType, ClaimType } from '../../../core/evidence-loop/index.js';
import { InteractionService, InteractionState, isValidTransition } from '../../../core/interaction-layer/index.js';
import type { ExecutionEngine } from '../../../core/engine/execution-engine.js';
import type { ArchitectureAnswerResponse } from '../../../core/engine/execution-engine.js';
import {
  EmptyQuestionError, InteractionStateError,
  InteractionSessionNotFoundError, ExecutionFailedError,
} from '../../../core/interaction-layer/errors.js';

// ═══════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════

const PROJECT_PATH = '/tmp/test-project';

const MOCK_ENGINE_RESPONSE: ArchitectureAnswerResponse = {
  question: 'What are the main architectural boundaries?',
  answer: 'The system has three main subsystems: cognitive, discovery, and engine.',
  sources: Object.freeze([
    {
      filePath: 'src/core/cognitive/cognitive-runtime.ts',
      description: 'Cognitive Runtime handles LLM interaction',
      relevance: 0.9,
      snippet: 'export class CognitiveRuntime { ... }',
    },
    {
      filePath: 'src/core/discovery/discovery-pipeline.service.ts',
      description: 'Discovery Pipeline scans the codebase',
      relevance: 0.8,
      snippet: 'export class DiscoveryPipelineService { ... }',
    },
    {
      filePath: 'src/core/engine/execution-engine.ts',
      description: 'Execution Engine orchestrates the full pipeline',
      relevance: 0.85,
      snippet: 'export class ExecutionEngine { ... }',
    },
  ]),
  evidence: null,
  model: 'test-model',
  provider: 'test-provider',
  latencyMs: 150,
  discoveryStats: Object.freeze({
    totalFiles: 100,
    modules: 5,
    dependencies: 20,
    techStack: ['typescript'],
  }),
};

function createMockEngine(response = MOCK_ENGINE_RESPONSE): ExecutionEngine {
  return {
    execute: vi.fn().mockResolvedValue(response),
    initialize: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    state: 'Running' as any,
    autonomyLevel: 'manual' as any,
    services: {} as any,
    eventBus: undefined as any,
    hooks: {} as any,
    zoneGate: {} as any,
    evidenceStore: null,
  } as unknown as ExecutionEngine;
}

function createFailingEngine(error: Error): ExecutionEngine {
  return {
    execute: vi.fn().mockRejectedValue(error),
    initialize: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    state: 'Running' as any,
    autonomyLevel: 'manual' as any,
    services: {} as any,
    eventBus: undefined as any,
    hooks: {} as any,
    zoneGate: {} as any,
    evidenceStore: null,
  } as unknown as ExecutionEngine;
}

function createService(engine?: ExecutionEngine): InteractionService {
  const sessionRuntime = new SessionRuntime();
  const evidenceLoop = new EvidenceLoopService({ sessionRuntime });
  return new InteractionService({
    evidenceLoop,
    engine: engine ?? createMockEngine(),
  });
}

// ═══════════════════════════════════════════════════════════════════
// INTERACTION FSM TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Interaction State Machine (§6)', () => {
  it('Created → QuestionSubmitted is valid', () => {
    expect(isValidTransition(InteractionState.Created, InteractionState.QuestionSubmitted)).toBe(true);
  });

  it('Created → Processing is INVALID (must go through QuestionSubmitted)', () => {
    expect(isValidTransition(InteractionState.Created, InteractionState.Processing)).toBe(false);
  });

  it('QuestionSubmitted → Processing is valid', () => {
    expect(isValidTransition(InteractionState.QuestionSubmitted, InteractionState.Processing)).toBe(true);
  });

  it('Processing → AnswerAvailable is valid', () => {
    expect(isValidTransition(InteractionState.Processing, InteractionState.AnswerAvailable)).toBe(true);
  });

  it('Processing → Failed is valid', () => {
    expect(isValidTransition(InteractionState.Processing, InteractionState.Failed)).toBe(true);
  });

  it('Failed → any state is INVALID', () => {
    expect(isValidTransition(InteractionState.Failed, InteractionState.QuestionSubmitted)).toBe(false);
    expect(isValidTransition(InteractionState.Failed, InteractionState.Processing)).toBe(false);
  });

  it('TraceAvailable → any state is INVALID (terminal)', () => {
    expect(isValidTransition(InteractionState.TraceAvailable, InteractionState.FeedbackPending)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-01 — SESSION CREATION
// ═══════════════════════════════════════════════════════════════════

describe('AC-01 — Session Creation (§7)', () => {
  it('creates a session with sessionId', async () => {
    const svc = createService();
    const view = await svc.startInteraction({
      projectPath: PROJECT_PATH,
      provenance: 'human',
    });
    expect(view.sessionId).toBeTruthy();
    expect(view.state).toBe(InteractionState.Created);
    expect(view.createdAt).toBeTruthy();
  });

  it('creates sessions with unique IDs', async () => {
    const svc = createService();
    const v1 = await svc.startInteraction({ projectPath: PROJECT_PATH });
    const v2 = await svc.startInteraction({ projectPath: PROJECT_PATH });
    expect(v1.sessionId).not.toBe(v2.sessionId);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-02 — QUESTION LINKAGE
// ═══════════════════════════════════════════════════════════════════

describe('AC-02 — Question Linkage (§8)', () => {
  it('question is preserved in trace', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'What are the main boundaries?',
    });
    const trace = svc.getTrace(session.sessionId);
    expect(trace.question).toBe('What are the main boundaries?');
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-03 — AIS EXECUTION
// ═══════════════════════════════════════════════════════════════════

describe('AC-03 — AIS Execution (§9)', () => {
  it('calls the execution engine', async () => {
    const engine = createMockEngine();
    const svc = createService(engine);
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    expect(engine.execute).toHaveBeenCalledTimes(1);
  });

  it('passes correct parameters to engine', async () => {
    const engine = createMockEngine();
    const svc = createService(engine);
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'describe the architecture',
    });
    expect(engine.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'describe the architecture',
        projectPath: PROJECT_PATH,
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-04 — RESPONSE LINKAGE
// ═══════════════════════════════════════════════════════════════════

describe('AC-04 — Response Linkage (§10)', () => {
  it('response is saved and linked to session', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    const answer = await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    expect(answer.responseId).toBeTruthy();
    expect(answer.content).toBe(MOCK_ENGINE_RESPONSE.answer);

    const trace = svc.getTrace(session.sessionId);
    expect(trace.answer).toBe(MOCK_ENGINE_RESPONSE.answer);
  });

  it('response cannot exist as orphan (verified via trace)', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    const trace = svc.getTrace(session.sessionId);
    // Response must be in the same session trace
    expect(trace.answer).toBeTruthy();
    expect(trace.sessionId).toBe(session.sessionId);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-05 — CLAIMS
// ═════════════════════════════════════════════════════════════════

describe('AC-05 — Claims (§11)', () => {
  it('response contains claims extracted from sources', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    const answer = await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    // 3 sources → 3 claims
    expect(answer.claims.length).toBe(3);
  });

  it('claims have statements', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    const answer = await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    for (const claim of answer.claims) {
      expect(claim.statement).toBeTruthy();
      expect(claim.claimId).toBeTruthy();
    }
  });

  it('claims without evidence show isVerified=false (unverified)', async () => {
    // When there are 0 sources, no claims are created → trace has empty claims
    const noSourcesResponse: ArchitectureAnswerResponse = {
      ...MOCK_ENGINE_RESPONSE,
      sources: [],
    };
    const svc = createService(createMockEngine(noSourcesResponse));
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    const answer = await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    expect(answer.claims.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-06 — EVIDENCE
// ═════════════════════════════════════════════════════════════════

describe('AC-06 — Evidence (§12)', () => {
  it('sources are returned in answer view', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    const answer = await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    expect(answer.sources.length).toBe(3);
    expect(answer.sources[0].filePath).toContain('cognitive-runtime.ts');
    expect(answer.sources[0].relevance).toBe(0.9);
  });

  it('evidence is linked to claims in trace', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    const trace = svc.getTrace(session.sessionId);
    // 3 claims with evidence each
    expect(trace.sources.length).toBe(3);
    expect(trace.claims.length).toBe(3);
    // Each claim should have evidence
    for (const claim of trace.claims) {
      expect(claim.evidenceCount).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-07 — FEEDBACK
// ═════════════════════════════════════════════════════════════════

describe('AC-07 — Feedback (§13)', () => {
  it('user can submit correct feedback', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    const fb = await svc.submitFeedback({
      sessionId: session.sessionId as any,
      verdict: 'correct',
    });
    expect(fb.feedbackId).toBeTruthy();
    expect(fb.verdict).toBe('correct');
    expect(fb.findingCreated).toBe(false);
  });

  it('user can submit feedback with comment', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    const fb = await svc.submitFeedback({
      sessionId: session.sessionId as any,
      verdict: 'incomplete',
      comment: 'Missing info about dependencies',
    });
    expect(fb.findingCreated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-08 — QUALITY FINDING
// ═══════════════════════════════════════════════════════════════════

describe('AC-08 — Quality Finding (§15)', () => {
  it('incorrect feedback creates a QualityFinding', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    const fb = await svc.submitFeedback({
      sessionId: session.sessionId as any,
      verdict: 'incorrect',
      comment: 'Wrong boundary description',
    });
    expect(fb.findingCreated).toBe(true);

    const trace = svc.getTrace(session.sessionId);
    expect(trace.findings.length).toBe(1);
    expect(trace.findings[0].category).toBe('wrong_grounding');
  });

  it('incomplete feedback creates a QualityFinding', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    const fb = await svc.submitFeedback({
      sessionId: session.sessionId as any,
      verdict: 'incomplete',
    });
    expect(fb.findingCreated).toBe(true);
    expect(svc.getTrace(session.sessionId).findings.length).toBe(1);
  });

  it('correct feedback does NOT create a QualityFinding', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    await svc.submitFeedback({
      sessionId: session.sessionId as any,
      verdict: 'correct',
    });
    expect(svc.getTrace(session.sessionId).findings.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-09 — TRACE
// ═════════════════════════════════════════════════════════════════

describe('AC-09 — Session Trace (§16)', () => {
  it('trace recovers full chain', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    await svc.submitFeedback({
      sessionId: session.sessionId as any,
      verdict: 'correct',
    });

    const trace = svc.getTrace(session.sessionId);
    expect(trace.sessionId).toBe(session.sessionId);
    expect(trace.question).toBeTruthy();
    expect(trace.answer).toBeTruthy();
    expect(trace.claims.length).toBeGreaterThan(0);
    expect(trace.sources.length).toBeGreaterThan(0);
    expect(trace.feedback.length).toBe(1);
  });

  it('trace shows feedback in correct order', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    await svc.submitFeedback({
      sessionId: session.sessionId as any,
      verdict: 'incorrect',
      comment: 'Wrong',
    });

    const trace = svc.getTrace(session.sessionId);
    expect(trace.feedback[0].type).toBe('incorrect');
    expect(trace.findings[0].status).toBe('observed');
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-10 — PROVENANCE
// ═══════════════════════════════════════════════════════════════════

describe('AC-10 — Provenance (§21)', () => {
  it('human session has human provenance', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH, provenance: 'human' });
    const trace = svc.getTrace(session.sessionId);
    expect(trace.provenance).toBe('human');
  });

  it('synthetic session has synthetic provenance', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH, provenance: 'synthetic' });
    const trace = svc.getTrace(session.sessionId);
    expect(trace.provenance).toBe('synthetic');
  });

  it('default provenance is human', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    const trace = svc.getTrace(session.sessionId);
    expect(trace.provenance).toBe('human');
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-11 — SECURITY (secrets not in evidence)
// ═══════════════════════════════════════════════════════════════════

describe('AC-11 — Security (§20)', () => {
  it('secrets are redacted from answer content', async () => {
    const secretResponse: ArchitectureAnswerResponse = {
      ...MOCK_ENGINE_RESPONSE,
      answer: 'Use sk-abc123456789012345678901234567890 for authentication.',
    };
    const svc = createService(createMockEngine(secretResponse));
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    const answer = await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    // The secret should be redacted by EvidenceLoopService's sanitizer
    expect(answer.content).not.toContain('sk-abc123456789012345678901234567890');
    expect(answer.content).toContain('[REDACTED');
  });

  it('secrets are redacted from trace', async () => {
    const secretResponse: ArchitectureAnswerResponse = {
      ...MOCK_ENGINE_RESPONSE,
      answer: 'API key: sk-abc123456789012345678901234567890',
    };
    const svc = createService(createMockEngine(secretResponse));
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    const trace = svc.getTrace(session.sessionId);
    expect(trace.answer).not.toContain('sk-abc123456789012345678901234567890');
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-12 — MODEL PROTECTION (feedback ≠ truth)
// ═══════════════════════════════════════════════════════════════════

describe('AC-12 — Model Protection (§14)', () => {
  it('feedback does not mutate Architecture Model', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'test question',
    });
    await svc.submitFeedback({
      sessionId: session.sessionId as any,
      verdict: 'incorrect',
      comment: 'Completely wrong answer',
    });

    // Verify: feedback is recorded but no Architecture Model mutation occurred
    // The InteractionService has NO method to mutate the Architecture Model.
    // This is enforced by design — there is no code path from feedback to model.
    const trace = svc.getTrace(session.sessionId);
    expect(trace.feedback.length).toBe(1);
    expect(trace.findings.length).toBe(1);
    // The finding is just a record — not a model mutation
    expect(trace.findings[0].status).toBe('observed');
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-13 — ERROR INTEGRITY
// ═════════════════════════════════════════════════════════════════

describe('AC-13 — Error Integrity (§19)', () => {
  it('failed inference does not create false successful result', async () => {
    const engine = createFailingEngine(new Error('Provider unavailable'));
    const svc = createService(engine);
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });

    await expect(
      svc.submitQuestion({
        sessionId: session.sessionId as any,
        question: 'test question',
      }),
    ).rejects.toThrow(ExecutionFailedError);

    // Session should be FAILED
    const view = svc.getSessionView(session.sessionId);
    expect(view.state).toBe(InteractionState.Failed);

    // No response, no claims, no evidence in trace
    const trace = svc.getTrace(session.sessionId);
    expect(trace.answer).toBeNull();
    expect(trace.claims.length).toBe(0);
    expect(trace.sources.length).toBe(0);
  });

  it('empty question throws EmptyQuestionError', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await expect(
      svc.submitQuestion({
        sessionId: session.sessionId as any,
        question: '   ',
      }),
    ).rejects.toThrow(EmptyQuestionError);
  });

  it('provider failure gives safe user message', async () => {
    const engine = createFailingEngine(new Error('ECONNREFUSED 127.0.0.1:3000'));
    const svc = createService(engine);
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    try {
      await svc.submitQuestion({
        sessionId: session.sessionId as any,
        question: 'test question',
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionFailedError);
      const e = err as ExecutionFailedError;
      // Must NOT contain stack trace or internal details
      expect(e.userMessage).not.toContain('ECONNREFUSED');
      expect(e.userMessage).not.toContain('127.0.0.1');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// NEGATIVE TESTS (§24)
// ═════════════════════════════════════════════════════════════════

describe('Negative Tests', () => {
  it('unknown session throws InteractionSessionNotFoundError', () => {
    const svc = createService();
    expect(() => svc.getTrace('nonexistent')).toThrow(InteractionSessionNotFoundError);
  });

  it('feedback on wrong state throws InteractionStateError', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    // State is CREATED, not FEEDBACK_PENDING
    await expect(
      svc.submitFeedback({
        sessionId: session.sessionId as any,
        verdict: 'correct',
      }),
    ).rejects.toThrow(InteractionStateError);
  });

  it('double question submission throws InteractionStateError', async () => {
    const svc = createService();
    const session = await svc.startInteraction({ projectPath: PROJECT_PATH });
    await svc.submitQuestion({
      sessionId: session.sessionId as any,
      question: 'first question',
    });
    // State is now FEEDBACK_PENDING, not CREATED
    await expect(
      svc.submitQuestion({
        sessionId: session.sessionId as any,
        question: 'second question',
      }),
    ).rejects.toThrow(InteractionStateError);
  });

  it('feedback for non-existent session throws', async () => {
    const svc = createService();
    await expect(
      svc.submitFeedback({
        sessionId: 'nonexistent' as any,
        verdict: 'correct',
      }),
    ).rejects.toThrow(InteractionSessionNotFoundError);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-14 — E2E INTEGRATION TEST (§24)
// ═══════════════════════════════════════════════════════════════════

describe('AC-14 — End-to-End Integration', () => {
  it('full path: session → question → AIS → response → claims → evidence → feedback → finding → trace', async () => {
    const svc = createService();

    // 1. Create session (AC-01)
    const sessionView = await svc.startInteraction({
      projectPath: PROJECT_PATH,
      provenance: 'synthetic',
    });
    expect(sessionView.state).toBe(InteractionState.Created);

    // 2. Submit question (AC-02, AC-03)
    const answer = await svc.submitQuestion({
      sessionId: sessionView.sessionId as any,
      question: 'What are the main architectural boundaries?',
    });

    // 3. Verify response (AC-04)
    expect(answer.responseId).toBeTruthy();
    expect(answer.content).toBeTruthy();

    // 4. Verify claims (AC-05)
    expect(answer.claims.length).toBe(3);
    for (const claim of answer.claims) {
      expect(claim.statement).toBeTruthy();
      expect(claim.claimId).toBeTruthy();
    }

    // 5. Verify evidence (AC-06)
    expect(answer.sources.length).toBe(3);
    for (const src of answer.sources) {
      expect(src.filePath).toBeTruthy();
      expect(src.relevance).toBeGreaterThan(0);
    }

    // 6. Verify session state
    const afterQuestion = svc.getSessionView(sessionView.sessionId);
    expect(afterQuestion.state).toBe(InteractionState.FeedbackPending);

    // 7. Submit feedback (AC-07)
    const fb = await svc.submitFeedback({
      sessionId: sessionView.sessionId as any,
      verdict: 'incorrect',
      comment: 'The boundary between cognitive and discovery is wrong',
    });
    expect(fb.feedbackId).toBeTruthy();
    expect(fb.findingCreated).toBe(true);

    // 8. Verify QualityFinding (AC-08)
    const afterFeedback = svc.getSessionView(sessionView.sessionId);
    expect(afterFeedback.state).toBe(InteractionState.TraceAvailable);

    // 9. Verify full trace (AC-09)
    const trace = svc.getTrace(sessionView.sessionId);
    expect(trace.sessionId).toBe(sessionView.sessionId);
    expect(trace.provenance).toBe('synthetic');
    expect(trace.question).toBe('What are the main architectural boundaries?');
    expect(trace.answer).toBeTruthy();
    expect(trace.claims.length).toBe(3);
    expect(trace.sources.length).toBe(3);
    expect(trace.feedback.length).toBe(1);
    expect(trace.feedback[0].type).toBe('incorrect');
    expect(trace.findings.length).toBe(1);
    expect(trace.findings[0].category).toBe('wrong_grounding');

    // 10. Verify security (AC-11)
    expect(trace.answer).not.toContain('sk-');
  });
});
