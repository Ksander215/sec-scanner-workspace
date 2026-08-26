/**
 * Evidence Loop — Comprehensive Tests
 * TASK-MVP-EVIDENCE-LOOP-001A
 *
 * Covers:
 *   §37: Unit tests for all entities
 *   §38: Happy-path integration test
 *   §39: Negative tests
 *   §35: Security (secrets not in evidence)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionRuntime } from '../../../core/session/session-runtime.js';
import {
  EvidenceLoopService,
  SourceType, ClaimType, VerificationStatus, EvidenceFeedbackType,
  FindingCategory, FindingSeverity, FindingStatus, EvidenceSourceType,
  SessionNotFoundError, ClaimNotFoundError, LinkageError,
  sanitizeSecrets,
} from '../../../core/evidence-loop/index.js';

// ═══════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════

function createService(): EvidenceLoopService {
  return new EvidenceLoopService({
    sessionRuntime: new SessionRuntime(),
  });
}

const SYNTHETIC_PARAMS = {
  sourceType: SourceType.Synthetic,
  projectScope: 'src/core/',
};

const HUMAN_PARAMS = {
  sourceType: SourceType.Human,
  projectScope: 'src/core/',
};

const SAMPLE_QUESTION = 'What are the main architectural boundaries inside src/core?';

const SAMPLE_RESPONSE_CONTENT =
  'The cognitive subsystem handles LLM interaction via CognitiveRuntime. ' +
  'The discovery subsystem scans the codebase via DiscoveryPipelineService. ' +
  'The engine subsystem orchestrates the full pipeline via ExecutionEngine.';

// ═══════════════════════════════════════════════════════════════════
// §37 — SESSION TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Session', () => {
  it('creates a session with sourceType', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    expect(session.id).toBeTruthy();
    expect(session.state).toBe('Running');
  });

  it('creates sessions with unique IDs', async () => {
    const svc = createService();
    const s1 = await svc.startSession(SYNTHETIC_PARAMS);
    const s2 = await svc.startSession(HUMAN_PARAMS);
    expect(s1.id).not.toBe(s2.id);
  });

  it('completes a session', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const completed = await svc.completeSession(session.id as string);
    expect(completed.state).toBe('Completed');
    expect(completed.completedAt).toBeTruthy();
  });

  it('throws SessionNotFoundError for unknown session', async () => {
    const svc = createService();
    expect(() => svc.getSessionTrace('nonexistent')).toThrow(SessionNotFoundError);
  });

  it('trace is recoverable after creation', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const trace = svc.getSessionTrace(session.id as string);
    expect(trace.session.sessionId).toBe(session.id);
    expect(trace.session.sourceType).toBe(SourceType.Synthetic);
  });
});

// ═══════════════════════════════════════════════════════════════════
// §37 — INTENT TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Intent', () => {
  it('records intent with rawInput preserved', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({
      sessionId: session.id,
      rawInput: SAMPLE_QUESTION,
    });
    expect(intent.intentId).toBeTruthy();
    expect(intent.rawInput).toBe(SAMPLE_QUESTION);
    expect(intent.sessionId).toBe(session.id);
  });

  it('stores normalizedIntent when provided', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({
      sessionId: session.id,
      rawInput: SAMPLE_QUESTION,
      normalizedIntent: 'architectural-boundaries',
    });
    expect(intent.normalizedIntent).toBe('architectural-boundaries');
  });

  it('throws for nonexistent session', async () => {
    const svc = createService();
    await expect(
      svc.recordIntent({ sessionId: 'nonexistent' as any, rawInput: 'test' }),
    ).rejects.toThrow(SessionNotFoundError);
  });

  it('appears in session trace', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({
      sessionId: session.id,
      rawInput: SAMPLE_QUESTION,
    });
    const trace = svc.getSessionTrace(session.id as string);
    expect(trace.intent?.intentId).toBe(intent.intentId as string);
  });
});

// ═══════════════════════════════════════════════════════════════════
// §37 — RESPONSE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Response', () => {
  it('records response linked to session and intent', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({
      sessionId: session.id,
      rawInput: SAMPLE_QUESTION,
    });
    const response = await svc.recordResponse({
      sessionId: session.id,
      intentId: intent.intentId,
      content: SAMPLE_RESPONSE_CONTENT,
      provider: 'test-provider',
      model: 'test-model',
      latencyMs: 1234,
    });
    expect(response.responseId).toBeTruthy();
    expect(response.sessionId).toBe(session.id);
    expect(response.intentId).toBe(intent.intentId);
    expect(response.content).toBe(SAMPLE_RESPONSE_CONTENT);
    expect(response.latencyMs).toBe(1234);
  });

  it('throws if intent belongs to different session (I-01)', async () => {
    const svc = createService();
    const s1 = await svc.startSession(SYNTHETIC_PARAMS);
    const s2 = await svc.startSession(HUMAN_PARAMS);
    const intent1 = await svc.recordIntent({
      sessionId: s1.id,
      rawInput: SAMPLE_QUESTION,
    });
    await expect(
      svc.recordResponse({
        sessionId: s2.id,
        intentId: intent1.intentId,
        content: 'test',
        provider: 'p',
        model: 'm',
        latencyMs: 100,
      }),
    ).rejects.toThrow(LinkageError);
  });
});

// ═══════════════════════════════════════════════════════════════════
// §37 — CLAIM TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Claim', () => {
  let svc: EvidenceLoopService;
  let sessionId: string;
  let responseId: string;

  beforeEach(async () => {
    svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    sessionId = session.id as string;
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'test response', provider: 'p', model: 'm', latencyMs: 100,
    });
    responseId = resp.responseId as string;
  });

  it('creates a claim linked to response and session', () => {
    const claim = svc.createClaim({
      responseId: responseId as any, sessionId: sessionId as any,
      statement: 'CognitiveRuntime handles LLM calls.',
      claimType: ClaimType.Behavioral,
      confidence: 0.8,
    });
    expect(claim.claimId).toBeTruthy();
    expect(claim.verificationStatus).toBe(VerificationStatus.Unverified);
    expect(claim.statement).toBe('CognitiveRuntime handles LLM calls.');
    expect(claim.claimType).toBe(ClaimType.Behavioral);
  });

  it('initializes with empty verification history', () => {
    const claim = svc.createClaim({
      responseId: responseId as any, sessionId: sessionId as any,
      statement: 'Test claim', claimType: ClaimType.Structural,
    });
    expect(claim.verificationHistory).toHaveLength(0);
  });

  it('updates verification status with history (§29)', () => {
    const claim = svc.createClaim({
      responseId: responseId as any, sessionId: sessionId as any,
      statement: 'Test claim', claimType: ClaimType.Structural,
    });
    const updated = svc.updateClaimVerification({
      claimId: claim.claimId,
      newStatus: VerificationStatus.Supported,
      reason: 'Verified against src/core/cognitive/cognitive-runtime.ts',
      source: 'human-verification',
    });
    expect(updated.verificationStatus).toBe(VerificationStatus.Supported);
    expect(updated.verificationHistory).toHaveLength(1);
    expect(updated.verificationHistory[0].oldStatus).toBe(VerificationStatus.Unverified);
    expect(updated.verificationHistory[0].newStatus).toBe(VerificationStatus.Supported);
  });

  it('claims appear in session trace', () => {
    svc.createClaim({
      responseId: responseId as any, sessionId: sessionId as any,
      statement: 'Traceable claim', claimType: ClaimType.Structural,
    });
    const trace = svc.getSessionTrace(sessionId);
    expect(trace.claims).toHaveLength(1);
    expect(trace.claims[0].statement).toBe('Traceable claim');
  });
});

// ═══════════════════════════════════════════════════════════════════
// §37 — EVIDENCE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Evidence', () => {
  let svc: EvidenceLoopService;
  let sessionId: string;
  let claimId: string;

  beforeEach(async () => {
    svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    sessionId = session.id as string;
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'test response', provider: 'p', model: 'm', latencyMs: 100,
    });
    const claim = svc.createClaim({
      responseId: resp.responseId, sessionId: session.id,
      statement: 'Test claim', claimType: ClaimType.Structural,
    });
    claimId = claim.claimId as string;
  });

  it('attaches evidence to a claim with provenance (I-04)', () => {
    const evidence = svc.attachEvidence({
      claimId: claimId as any,
      sessionId: sessionId as any,
      sourceType: EvidenceSourceType.Code,
      sourceReference: 'src/core/cognitive/cognitive-runtime.ts:45',
      excerpt: 'export class CognitiveRuntime {',
      relevance: 0.9,
    });
    expect(evidence.evidenceId).toBeTruthy();
    expect(evidence.sourceType).toBe(EvidenceSourceType.Code);
    expect(evidence.sourceReference).toContain('cognitive-runtime.ts');
  });

  it('evidence appears in trace', () => {
    svc.attachEvidence({
      claimId: claimId as any, sessionId: sessionId as any,
      sourceType: EvidenceSourceType.Code,
      sourceReference: 'test.ts', excerpt: 'code',
    });
    const trace = svc.getSessionTrace(sessionId);
    expect(trace.evidence).toHaveLength(1);
  });

  it('multiple evidence items per claim', () => {
    svc.attachEvidence({
      claimId: claimId as any, sessionId: sessionId as any,
      sourceType: EvidenceSourceType.Code, sourceReference: 'a.ts', excerpt: 'a',
    });
    svc.attachEvidence({
      claimId: claimId as any, sessionId: sessionId as any,
      sourceType: EvidenceSourceType.Document, sourceReference: 'doc.md', excerpt: 'doc',
    });
    const items = svc.getEvidenceForClaim(claimId);
    expect(items).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// §37 — FEEDBACK TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Feedback', () => {
  let svc: EvidenceLoopService;
  let sessionId: string;
  let responseId: string;
  let claimId: string;

  beforeEach(async () => {
    svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    sessionId = session.id as string;
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'test response', provider: 'p', model: 'm', latencyMs: 100,
    });
    responseId = resp.responseId as string;
    const claim = svc.createClaim({
      responseId: resp.responseId, sessionId: session.id,
      statement: 'Test claim', claimType: ClaimType.Structural,
    });
    claimId = claim.claimId as string;
  });

  it('records feedback linked to response (§18)', () => {
    const fb = svc.recordFeedback({
      sessionId: sessionId as any,
      responseId: responseId as any,
      type: EvidenceFeedbackType.Correct,
      content: 'This is correct.',
      sourceType: SourceType.Human,
    });
    expect(fb.feedbackId).toBeTruthy();
    expect(fb.type).toBe(EvidenceFeedbackType.Correct);
  });

  it('records feedback linked to specific claim', () => {
    const fb = svc.recordFeedback({
      sessionId: sessionId as any,
      responseId: responseId as any,
      claimId: claimId as any,
      type: EvidenceFeedbackType.Incorrect,
      content: 'The claim about X is wrong.',
      sourceType: SourceType.Human,
    });
    expect(fb.claimId).toBe(claimId);
  });

  it('feedback appears in trace', () => {
    svc.recordFeedback({
      sessionId: sessionId as any, responseId: responseId as any,
      type: EvidenceFeedbackType.Useful, content: 'Helpful', sourceType: SourceType.Human,
    });
    const trace = svc.getSessionTrace(sessionId);
    expect(trace.feedback).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// §37 — QUALITY FINDING TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Quality Finding', () => {
  let svc: EvidenceLoopService;
  let sessionId: string;
  let claimId: string;

  beforeEach(async () => {
    svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    sessionId = session.id as string;
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'test response', provider: 'p', model: 'm', latencyMs: 100,
    });
    const claim = svc.createClaim({
      responseId: resp.responseId, sessionId: session.id,
      statement: 'Nonexistent module exists.', claimType: ClaimType.Structural,
    });
    claimId = claim.claimId as string;
  });

  it('creates a finding with evidence basis (I-09)', () => {
    const finding = svc.createFinding({
      sourceSessionId: sessionId as any,
      relatedClaimId: claimId as any,
      category: FindingCategory.Hallucination,
      severity: FindingSeverity.High,
      description: 'AIS claims module X exists but it does not.',
      evidenceIds: ['ev-1', 'ev-2'],
    });
    expect(finding.findingId).toBeTruthy();
    expect(finding.status).toBe(FindingStatus.Observed);
    expect(finding.evidenceIds).toHaveLength(2);
  });

  it('updates finding lifecycle status', () => {
    const finding = svc.createFinding({
      sourceSessionId: sessionId as any,
      category: FindingCategory.Hallucination,
      severity: FindingSeverity.High,
      description: 'Test finding',
    });
    const updated = svc.updateFindingStatus({
      findingId: finding.findingId,
      newStatus: FindingStatus.Accepted,
    });
    expect(updated.status).toBe(FindingStatus.Accepted);
  });

  it('finding appears in trace', () => {
    svc.createFinding({
      sourceSessionId: sessionId as any,
      category: FindingCategory.MissingContext,
      severity: FindingSeverity.Medium,
      description: 'Missing context about X',
    });
    const trace = svc.getSessionTrace(sessionId);
    expect(trace.findings).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// §38 — HAPPY-PATH INTEGRATION TEST
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Happy Path (§38, §45)', () => {
  it('complete trace: session → intent → response → claims → evidence → feedback → finding', async () => {
    const svc = createService();

    // 1. Start session
    const session = await svc.startSession({
      sourceType: SourceType.Synthetic,
      projectScope: 'src/core/',
    });

    // 2. Record intent
    const intent = await svc.recordIntent({
      sessionId: session.id,
      rawInput: 'How do cognitive and discovery subsystems interact?',
    });

    // 3. Record response
    const response = await svc.recordResponse({
      sessionId: session.id,
      intentId: intent.intentId,
      content: 'CognitiveRuntime calls DiscoveryPipelineService for code analysis.',
      provider: 'openai', model: 'gpt-4o', latencyMs: 2500,
    });

    // 4. Create claims (atomic, §11)
    const claim1 = svc.createClaim({
      responseId: response.responseId, sessionId: session.id,
      statement: 'CognitiveRuntime orchestrates LLM interactions.',
      claimType: ClaimType.Behavioral, confidence: 0.9,
    });
    const claim2 = svc.createClaim({
      responseId: response.responseId, sessionId: session.id,
      statement: 'DiscoveryPipelineService scans the codebase.',
      claimType: ClaimType.Behavioral, confidence: 0.85,
    });
    const claim3 = svc.createClaim({
      responseId: response.responseId, sessionId: session.id,
      statement: 'ExecutionEngine depends on both CognitiveRuntime and DiscoveryPipelineService.',
      claimType: ClaimType.Dependency, confidence: 0.95,
    });

    // 5. Attach evidence
    svc.attachEvidence({
      claimId: claim1.claimId, sessionId: session.id,
      sourceType: EvidenceSourceType.Code,
      sourceReference: 'src/core/cognitive/cognitive-runtime.ts:1',
      excerpt: 'export class CognitiveRuntime {',
      relevance: 0.95,
    });
    svc.attachEvidence({
      claimId: claim2.claimId, sessionId: session.id,
      sourceType: EvidenceSourceType.Code,
      sourceReference: 'src/core/discovery/discovery-pipeline.service.ts:1',
      excerpt: 'export class DiscoveryPipelineService {',
      relevance: 0.9,
    });
    svc.attachEvidence({
      claimId: claim3.claimId, sessionId: session.id,
      sourceType: EvidenceSourceType.Code,
      sourceReference: 'src/core/engine/execution-engine.ts:30',
      excerpt: 'import { DiscoveryPipelineService }',
      relevance: 0.9,
    });

    // 6. Record feedback
    const fb1 = svc.recordFeedback({
      sessionId: session.id, responseId: response.responseId,
      claimId: claim1.claimId, type: EvidenceFeedbackType.Correct,
      content: 'Verified this claim.', sourceType: SourceType.Human,
    });
    const fb2 = svc.recordFeedback({
      sessionId: session.id, responseId: response.responseId,
      claimId: claim2.claimId, type: EvidenceFeedbackType.Incomplete,
      content: 'Claim is correct but misses that it also builds an ArchitectureGraph.',
      sourceType: SourceType.Human,
    });

    // 7. Verify claims
    svc.updateClaimVerification({
      claimId: claim1.claimId, newStatus: VerificationStatus.Supported,
      reason: 'User verified against source code.', source: 'human-P001',
    });
    svc.updateClaimVerification({
      claimId: claim2.claimId, newStatus: VerificationStatus.PartiallySupported,
      reason: 'Correct but incomplete.', source: 'human-P001',
    });

    // 8. Create quality finding
    const finding = svc.createFinding({
      sourceSessionId: session.id,
      relatedClaimId: claim2.claimId,
      category: FindingCategory.IncompleteUnderstanding,
      severity: FindingSeverity.Medium,
      description: 'AIS correctly identified DiscoveryPipelineService but missed ArchitectureGraph building step.',
      evidenceIds: [fb2.feedbackId as string],
    });

    // 9. Complete session
    await svc.completeSession(session.id as string);

    // ═══ VERIFICATION (§45 Acceptance Test) ═══
    const trace = svc.getSessionTrace(session.id as string);

    // What was asked?
    expect(trace.intent?.rawInput).toContain('cognitive and discovery');

    // What did AIS answer?
    expect(trace.response?.content).toContain('CognitiveRuntime');
    expect(trace.response?.content).toContain('DiscoveryPipelineService');

    // What claims were made?
    expect(trace.claims).toHaveLength(3);
    expect(trace.claims.map(c => c.statement)).toEqual(
      expect.arrayContaining([
        'CognitiveRuntime orchestrates LLM interactions.',
        'DiscoveryPipelineService scans the codebase.',
        'ExecutionEngine depends on both CognitiveRuntime and DiscoveryPipelineService.',
      ]),
    );

    // What evidence grounds each claim?
    expect(trace.evidence).toHaveLength(3);
    expect(trace.evidence.map(e => e.sourceReference)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('cognitive-runtime.ts'),
        expect.stringContaining('discovery-pipeline.service.ts'),
        expect.stringContaining('execution-engine.ts'),
      ]),
    );

    // What did the user confirm/reject?
    expect(trace.feedback).toHaveLength(2);

    // What quality problem was found?
    expect(trace.findings).toHaveLength(1);
    expect(trace.findings[0].category).toBe(FindingCategory.IncompleteUnderstanding);

    // NO ORPHAN ENTITIES
    for (const claim of trace.claims) {
      expect(claim.sessionId).toBe(session.id);
      expect(claim.responseId).toBe(trace.response?.responseId);
    }
    for (const ev of trace.evidence) {
      expect(ev.sessionId).toBe(session.id);
      const claimIds = new Set(trace.claims.map(c => c.claimId as string));
      expect(claimIds.has(ev.claimId as string)).toBe(true);
    }
    for (const fb of trace.feedback) {
      expect(fb.sessionId).toBe(session.id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// §39 — NEGATIVE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Negative Tests (§39)', () => {
  it('rejects claim without response (ClaimWithoutResponse)', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    expect(() => svc.createClaim({
      responseId: 'nonexistent' as any, sessionId: session.id,
      statement: 'orphan claim', claimType: ClaimType.Structural,
    })).toThrow(ClaimNotFoundError);
  });

  it('rejects feedback with unknown claim', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'test', provider: 'p', model: 'm', latencyMs: 100,
    });
    expect(() => svc.recordFeedback({
      sessionId: session.id, responseId: resp.responseId,
      claimId: 'nonexistent' as any,
      type: EvidenceFeedbackType.Incorrect, content: 'wrong',
      sourceType: SourceType.Human,
    })).toThrow(ClaimNotFoundError);
  });

  it('rejects claim linked to wrong session', async () => {
    const svc = createService();
    const s1 = await svc.startSession(SYNTHETIC_PARAMS);
    const s2 = await svc.startSession(HUMAN_PARAMS);
    const intent = await svc.recordIntent({ sessionId: s2.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: s2.id, intentId: intent.intentId,
      content: 'test', provider: 'p', model: 'm', latencyMs: 100,
    });
    expect(() => svc.createClaim({
      responseId: resp.responseId, sessionId: s1.id, // wrong session!
      statement: 'cross-session claim', claimType: ClaimType.Structural,
    })).toThrow(LinkageError);
  });

  it('rejects response with intent from different session', async () => {
    const svc = createService();
    const s1 = await svc.startSession(SYNTHETIC_PARAMS);
    const s2 = await svc.startSession(HUMAN_PARAMS);
    const intent1 = await svc.recordIntent({ sessionId: s1.id, rawInput: 'test' });
    await expect(
      svc.recordResponse({
        sessionId: s2.id, intentId: intent1.intentId,
        content: 'test', provider: 'p', model: 'm', latencyMs: 100,
      }),
    ).rejects.toThrow(LinkageError);
  });

  it('rejects finding with unknown claim', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    expect(() => svc.createFinding({
      sourceSessionId: session.id,
      relatedClaimId: 'nonexistent' as any,
      category: FindingCategory.Hallucination,
      severity: FindingSeverity.High,
      description: 'test',
    })).toThrow(ClaimNotFoundError);
  });

  it('evidence without claim is rejected via claimId check', () => {
    const svc = createService();
    expect(() => svc.attachEvidence({
      claimId: 'nonexistent' as any, sessionId: 'any' as any,
      sourceType: EvidenceSourceType.Code,
      sourceReference: 'test.ts', excerpt: 'code',
    })).toThrow(ClaimNotFoundError);
  });
});

// ═══════════════════════════════════════════════════════════════════
// §35 — SECURITY TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Security (§35)', () => {
  it('sanitizes API keys from intent rawInput', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({
      sessionId: session.id,
      rawInput: 'Analyze this code. Key: sk-or-v1-TESTKEYNOTREAL0000000000000000000000000000000000000',
    });
    expect(intent.rawInput).not.toContain('sk-or-v1-');
    expect(intent.rawInput).toContain('[REDACTED:secret]');
  });

  it('sanitizes API keys from response content', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const response = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'Use this API key: sk-or-v1-TESTKEYNOTREAL0000000000000000000000000000000000000',
      provider: 'p', model: 'm', latencyMs: 100,
    });
    expect(response.content).not.toContain('sk-or-v1-');
    expect(response.content).toContain('[REDACTED:secret]');
  });

  it('sanitizes secrets from claim statements', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'test', provider: 'p', model: 'm', latencyMs: 100,
    });
    const claim = svc.createClaim({
      responseId: resp.responseId, sessionId: session.id,
      statement: 'Config uses key AKIAIOSFODNN7EXAMPLE for AWS access.',
      claimType: ClaimType.Structural,
    });
    expect(claim.statement).not.toContain('AKIAIOSFODNN7');
    expect(claim.statement).toContain('[REDACTED:secret]');
  });

  it('sanitizes secrets from evidence excerpts', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'test', provider: 'p', model: 'm', latencyMs: 100,
    });
    const claim = svc.createClaim({
      responseId: resp.responseId, sessionId: session.id,
      statement: 'Test claim', claimType: ClaimType.Structural,
    });
    const evidence = svc.attachEvidence({
      claimId: claim.claimId, sessionId: session.id,
      sourceType: EvidenceSourceType.Code,
      sourceReference: 'config.ts',
      excerpt: 'api_key = "ghp_abc123def456ghi789jkl012mno345pqr678stu901"',
    });
    expect(evidence.excerpt).not.toContain('ghp_');
    expect(evidence.excerpt).toContain('[REDACTED:secret]');
  });

  it('sanitizes Bearer tokens', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longtokenhere';
    const result = sanitizeSecrets(input);
    expect(result).not.toContain('Bearer eyJ');
  });
});

// ═══════════════════════════════════════════════════════════════════
// SOURCE TYPE SEPARATION (I-07)
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Source Type Separation (I-07)', () => {
  it('synthetic session tracks sourceType correctly', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const trace = svc.getSessionTrace(session.id as string);
    expect(trace.session.sourceType).toBe(SourceType.Synthetic);
  });

  it('human session tracks sourceType correctly', async () => {
    const svc = createService();
    const session = await svc.startSession(HUMAN_PARAMS);
    const trace = svc.getSessionTrace(session.id as string);
    expect(trace.session.sourceType).toBe(SourceType.Human);
  });

  it('feedback records its own sourceType', async () => {
    const svc = createService();
    const session = await svc.startSession(SYNTHETIC_PARAMS);
    const intent = await svc.recordIntent({ sessionId: session.id, rawInput: 'test' });
    const resp = await svc.recordResponse({
      sessionId: session.id, intentId: intent.intentId,
      content: 'test', provider: 'p', model: 'm', latencyMs: 100,
    });
    const fb = svc.recordFeedback({
      sessionId: session.id, responseId: resp.responseId,
      type: EvidenceFeedbackType.Useful, content: 'OK', sourceType: SourceType.Human,
    });
    // Human feedback on a synthetic session is valid (the feedback itself is human)
    expect(fb.sourceType).toBe(SourceType.Human);
    expect(svc.getSessionTrace(session.id as string).session.sourceType).toBe(SourceType.Synthetic);
  });
});

// ═══════════════════════════════════════════════════════════════════
// IMMUTABILITY (I-08)
// ═══════════════════════════════════════════════════════════════════

describe('Evidence Loop — Immutability (I-08)', () => {
  it('claim verification creates new object, does not mutate original', () => {
    const svc = createService();
    // Inline session setup
    svc.startSession(SYNTHETIC_PARAMS).then(session => {
      return svc.recordIntent({ sessionId: session.id, rawInput: 'test' }).then(intent => {
        return svc.recordResponse({
          sessionId: session.id, intentId: intent.intentId,
          content: 'test', provider: 'p', model: 'm', latencyMs: 100,
        }).then(resp => {
          const claim = svc.createClaim({
            responseId: resp.responseId, sessionId: session.id,
            statement: 'Test', claimType: ClaimType.Structural,
          });
          const originalStatus = claim.verificationStatus;
          const originalHistory = claim.verificationHistory;

          svc.updateClaimVerification({
            claimId: claim.claimId, newStatus: VerificationStatus.Supported,
            reason: 'test', source: 'test',
          });

          // Original reference should be unchanged (frozen)
          expect(claim.verificationStatus).toBe(originalStatus);
          expect(claim.verificationHistory).toBe(originalHistory);
        });
      });
    });
  });

  it('finding status update creates new object', () => {
    const svc = createService();
    svc.startSession(SYNTHETIC_PARAMS).then(session => {
      const finding = svc.createFinding({
        sourceSessionId: session.id,
        category: FindingCategory.Hallucination,
        severity: FindingSeverity.High,
        description: 'Test',
      });
      const originalStatus = finding.status;

      svc.updateFindingStatus({
        findingId: finding.findingId, newStatus: FindingStatus.Accepted,
      });

      // Original reference unchanged
      expect(finding.status).toBe(originalStatus);
    });
  });
});
