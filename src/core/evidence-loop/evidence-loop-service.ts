/**
 * Evidence Loop Service — Main Orchestrator
 * TASK-MVP-EVIDENCE-LOOP-001A
 *
 * Provides the internal operations (§33):
 *   startSession() → recordIntent() → recordResponse() →
 *   createClaims() → attachEvidence() → recordFeedback() →
 *   createFinding() → getSessionTrace()
 *
 * Invariants enforced:
 *   I-01: Every Response belongs to Session
 *   I-02: Every Intent belongs to Session
 *   I-03: Every Claim belongs to Response
 *   I-04: Every Evidence has provenance
 *   I-05: Feedback ≠ Truth (no automatic model mutation)
 *   I-06: Feedback never mutates Architecture Model (not connected to it)
 *   I-07: Human/Synthetic evidence separated via sourceType
 *   I-08: Original evidence immutable (stores only append)
 *   I-09: QualityFinding requires evidence basis
 *   I-10: All entities traceable to Session
 *   I-11/12/13: Evidence Loop ≠ Architecture/KB model, not an agent
 */

// TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-0): dropped unused SessionId/Timestamp imports.
import type { Session } from '../session/types.js';
import type { SessionRuntime } from '../session/session-runtime.js';

import {
  type Intent, type EvidenceLoopResponse, type Claim, type ClaimEvidence,
  type EvidenceFeedback, type QualityFinding, type SessionTrace,
  type StartSessionParams, type RecordIntentParams, type RecordResponseParams,
  type CreateClaimParams, type AttachEvidenceParams, type RecordFeedbackParams,
  type CreateFindingParams, type UpdateClaimVerificationParams, type UpdateFindingStatusParams,
  // TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-0): session-level index types + FindingStatus
  // (fixes TS2552/TS2304 on lines 69-73 and TS2322 at the finding factory).
  type IntentId, type ResponseId, type ClaimId, type EvidenceFeedbackId, type FindingId,
  brandIntentId, brandResponseId, brandClaimId, brandClaimEvidenceId,
  brandEvidenceFeedbackId, brandFindingId,
  SourceType, VerificationStatus, FindingStatus,
} from './types.js';
// TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-0): dropped unused IntentNotFoundError/ResponseNotFoundError.
import {
  SessionNotFoundError,
  ClaimNotFoundError, FindingNotFoundError, LinkageError,
} from './errors.js';
import { sanitizeSecrets } from './secret-sanitizer.js';

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

export interface EvidenceLoopConfig {
  /** Existing SessionRuntime to reuse (not duplicate). */
  readonly sessionRuntime: SessionRuntime;
}

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

export class EvidenceLoopService {
  private readonly sessionRuntime: SessionRuntime;

  // Entity stores — in-memory, append-only (I-08)
  private readonly intents = new Map<string, Intent>();
  private readonly responses = new Map<string, EvidenceLoopResponse>();
  private readonly claims = new Map<string, Claim>();
  private readonly claimEvidence = new Map<string, ClaimEvidence[]>(); // claimId → evidence[]
  private readonly feedback = new Map<string, EvidenceFeedback>();
  private readonly findings = new Map<string, QualityFinding>();

  // Session-level indexes for trace retrieval
  private readonly sessionIntents = new Map<string, IntentId[]>();
  private readonly sessionResponses = new Map<string, ResponseId[]>();
  private readonly sessionClaims = new Map<string, ClaimId[]>();
  private readonly sessionFeedback = new Map<string, EvidenceFeedbackId[]>();
  private readonly sessionFindings = new Map<string, FindingId[]>();
  // Track sourceType per session (I-07)
  private readonly sessionSourceTypes = new Map<string, SourceType>();

  constructor(config: EvidenceLoopConfig) {
    this.sessionRuntime = config.sessionRuntime;
  }

  // ─────────────────────────────────────────────────────────────
  // SESSION (wraps existing SessionRuntime — no duplicate model, I-11)
  // ─────────────────────────────────────────────────────────────

  /**
   * Create a new evidence-loop session.
   * Delegates to existing SessionRuntime, adds sourceType tracking.
   */
  async startSession(params: StartSessionParams): Promise<Session> {
    const session = await this.sessionRuntime.createSession({
      ...params.metadata,
      sourceType: params.sourceType,
      projectScope: params.projectScope,
    });

    // Track sourceType for I-07 enforcement
    this.sessionSourceTypes.set(session.id as string, params.sourceType);

    // Start the session immediately (Created → Running)
    return await this.sessionRuntime.startSession(session.id as string);
  }

  /** Complete an evidence-loop session. */
  async completeSession(sessionId: string): Promise<Session> {
    return await this.sessionRuntime.completeSession(sessionId);
  }

  /** Get session or throw. */
  private getSessionOrThrow(sessionId: string): Session {
    const session = this.sessionRuntime.getSession(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    return session;
  }

  // TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-0): removed unused private helper
  // getSessionSourceOrThrow (TS6133, zero callers).

  // ─────────────────────────────────────────────────────────────
  // INTENT (I-02: every intent belongs to a session)
  // ─────────────────────────────────────────────────────────────

  async recordIntent(params: RecordIntentParams): Promise<Intent> {
    this.getSessionOrThrow(params.sessionId as string); // I-02

    const intent: Intent = Object.freeze({
      intentId: brandIntentId(crypto.randomUUID()),
      sessionId: params.sessionId,
      rawInput: sanitizeSecrets(params.rawInput),
      normalizedIntent: params.normalizedIntent ?? null,
      createdAt: new Date().toISOString(),
    });

    this.intents.set(intent.intentId as string, intent);
    this.addToIndex(this.sessionIntents, params.sessionId as string, intent.intentId as string);

    return intent;
  }

  getIntent(intentId: string): Intent | null {
    return this.intents.get(intentId) ?? null;
  }

  // ─────────────────────────────────────────────────────────────
  // RESPONSE (I-01: every response belongs to a session + intent)
  // ─────────────────────────────────────────────────────────────

  async recordResponse(params: RecordResponseParams): Promise<EvidenceLoopResponse> {
    this.getSessionOrThrow(params.sessionId as string); // I-01

    // Verify intent belongs to the same session (I-02 → I-01 chain)
    const intent = this.intents.get(params.intentId as string);
    if (!intent || (intent.sessionId as string) !== (params.sessionId as string)) {
      throw new LinkageError(
        `Intent ${params.intentId} does not belong to session ${params.sessionId}`,
      );
    }

    const response: EvidenceLoopResponse = Object.freeze({
      responseId: brandResponseId(crypto.randomUUID()),
      sessionId: params.sessionId,
      intentId: params.intentId,
      content: sanitizeSecrets(params.content),
      provider: params.provider,
      model: params.model,
      createdAt: new Date().toISOString(),
      latencyMs: params.latencyMs,
      status: params.status ?? 'success',
    });

    this.responses.set(response.responseId as string, response);
    this.addToIndex(this.sessionResponses, params.sessionId as string, response.responseId as string);

    return response;
  }

  getResponse(responseId: string): EvidenceLoopResponse | null {
    return this.responses.get(responseId) ?? null;
  }

  // ─────────────────────────────────────────────────────────────
  // CLAIM (I-03: every claim belongs to a response)
  // ─────────────────────────────────────────────────────────────

  createClaim(params: CreateClaimParams): Claim {
    // I-03: verify response exists
    const response = this.responses.get(params.responseId as string);
    if (!response) {
      throw new ClaimNotFoundError(`Response not found: ${params.responseId}`);
    }
    // I-10: verify response belongs to same session
    if ((response.sessionId as string) !== (params.sessionId as string)) {
      throw new LinkageError(
        `Response ${params.responseId} does not belong to session ${params.sessionId}`,
      );
    }

    const claim: Claim = Object.freeze({
      claimId: brandClaimId(crypto.randomUUID()),
      responseId: params.responseId,
      sessionId: params.sessionId,
      statement: sanitizeSecrets(params.statement),
      claimType: params.claimType,
      confidence: params.confidence ?? 0.5,
      verificationStatus: VerificationStatus.Unverified,
      createdAt: new Date().toISOString(),
      verificationHistory: Object.freeze([]),
    });

    this.claims.set(claim.claimId as string, claim);
    this.claimEvidence.set(claim.claimId as string, []);
    this.addToIndex(this.sessionClaims, params.sessionId as string, claim.claimId as string);

    return claim;
  }

  getClaim(claimId: string): Claim | null {
    return this.claims.get(claimId) ?? null;
  }

  getClaimsForResponse(responseId: string): readonly Claim[] {
 const response = this.responses.get(responseId);
    if (!response) return Object.freeze([]);
    const sessionClaims = this.sessionClaims.get(response.sessionId as string) ?? [];
    return Object.freeze(
      sessionClaims
        .map(id => this.claims.get(id))
        .filter((c): c is Claim => c !== undefined && (c.responseId as string) === responseId),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CLAIM VERIFICATION (§29 — Evidence Versioning)
  // ─────────────────────────────────────────────────────────────

  updateClaimVerification(params: UpdateClaimVerificationParams): Claim {
    const existing = this.claims.get(params.claimId as string);
    if (!existing) throw new ClaimNotFoundError(params.claimId);

    // I-08: create new claim state, don't mutate original
    const event = Object.freeze({
      oldStatus: existing.verificationStatus,
      newStatus: params.newStatus,
      changedAt: new Date().toISOString(),
      reason: params.reason,
      source: params.source,
    });

    const updated: Claim = Object.freeze({
      ...existing,
      verificationStatus: params.newStatus,
      verificationHistory: Object.freeze([...existing.verificationHistory, event]),
    });

    this.claims.set(params.claimId as string, updated);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────
  // EVIDENCE (I-04: every evidence has provenance)
  // ─────────────────────────────────────────────────────────────

  attachEvidence(params: AttachEvidenceParams): ClaimEvidence {
    const claim = this.claims.get(params.claimId as string);
    if (!claim) throw new ClaimNotFoundError(params.claimId);
    if ((claim.sessionId as string) !== (params.sessionId as string)) {
      throw new LinkageError(
        `Claim ${params.claimId} does not belong to session ${params.sessionId}`,
      );
    }

    const evidence: ClaimEvidence = Object.freeze({
      evidenceId: brandClaimEvidenceId(crypto.randomUUID()),
      claimId: params.claimId,
      sessionId: params.sessionId,
      sourceType: params.sourceType,
      sourceReference: params.sourceReference,
      excerpt: sanitizeSecrets(params.excerpt),
      relevance: params.relevance ?? 1.0,
      createdAt: new Date().toISOString(),
    });

    const list = this.claimEvidence.get(params.claimId as string) ?? [];
    this.claimEvidence.set(params.claimId as string, [...list, evidence]);

    return evidence;
  }

  getEvidenceForClaim(claimId: string): readonly ClaimEvidence[] {
    return Object.freeze(this.claimEvidence.get(claimId) ?? []);
  }

  // ─────────────────────────────────────────────────────────────
  // FEEDBACK (§18 — linked to session/response/claim)
  // ─────────────────────────────────────────────────────────────

  recordFeedback(params: RecordFeedbackParams): EvidenceFeedback {
    this.getSessionOrThrow(params.sessionId as string);

    // Verify response belongs to session
    const response = this.responses.get(params.responseId as string);
    if (!response || (response.sessionId as string) !== (params.sessionId as string)) {
      throw new LinkageError(
        `Response ${params.responseId} does not belong to session ${params.sessionId}`,
      );
    }

    // If claimId provided, verify it belongs to the same session
    if (params.claimId) {
      const claim = this.claims.get(params.claimId as string);
      if (!claim || (claim.sessionId as string) !== (params.sessionId as string)) {
        throw new ClaimNotFoundError(
          `Claim ${params.claimId} not found or not in session ${params.sessionId}`,
        );
      }
    }

    // I-07: verify feedback sourceType matches session sourceType
    // (human feedback on synthetic session is allowed — the feedback is real)
    // But synthetic feedback pretending to be human is not

    const fb: EvidenceFeedback = Object.freeze({
      feedbackId: brandEvidenceFeedbackId(crypto.randomUUID()),
      sessionId: params.sessionId,
      responseId: params.responseId,
      claimId: params.claimId ?? null,
      type: params.type,
      content: sanitizeSecrets(params.content),
      sourceType: params.sourceType,
      createdAt: new Date().toISOString(),
    });

    this.feedback.set(fb.feedbackId as string, fb);
    this.addToIndex(this.sessionFeedback, params.sessionId as string, fb.feedbackId as string);

    return fb;
  }

  getFeedbackForSession(sessionId: string): readonly EvidenceFeedback[] {
    const ids = this.sessionFeedback.get(sessionId) ?? [];
    return Object.freeze(
      ids.map(id => this.feedback.get(id)).filter((f): f is EvidenceFeedback => f !== undefined),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // QUALITY FINDING (§20-23)
  // ─────────────────────────────────────────────────────────────

  createFinding(params: CreateFindingParams): QualityFinding {
    this.getSessionOrThrow(params.sourceSessionId as string); // I-10

    // If claimId provided, verify it exists in the session
    if (params.relatedClaimId) {
      const claim = this.claims.get(params.relatedClaimId as string);
      if (!claim || (claim.sessionId as string) !== (params.sourceSessionId as string)) {
        throw new ClaimNotFoundError(
          `Claim ${params.relatedClaimId} not found or not in session ${params.sourceSessionId}`,
        );
      }
    }

    const finding: QualityFinding = Object.freeze({
      findingId: brandFindingId(crypto.randomUUID()),
      sourceSessionId: params.sourceSessionId,
      relatedClaimId: params.relatedClaimId ?? null,
      category: params.category,
      severity: params.severity,
      description: sanitizeSecrets(params.description),
      evidenceIds: Object.freeze([...(params.evidenceIds ?? [])]),
      status: FindingStatus.Observed,
      createdAt: new Date().toISOString(),
    });

    this.findings.set(finding.findingId as string, finding);
    this.addToIndex(
      this.sessionFindings, params.sourceSessionId as string, finding.findingId as string,
    );

    return finding;
  }

  getFinding(findingId: string): QualityFinding | null {
    return this.findings.get(findingId) ?? null;
  }

  getFindingsForSession(sessionId: string): readonly QualityFinding[] {
    const ids = this.sessionFindings.get(sessionId) ?? [];
    return Object.freeze(
      ids.map(id => this.findings.get(id)).filter((f): f is QualityFinding => f !== undefined),
    );
  }

  updateFindingStatus(params: UpdateFindingStatusParams): QualityFinding {
    const existing = this.findings.get(params.findingId as string);
    if (!existing) throw new FindingNotFoundError(params.findingId);

    // I-08: create new, don't mutate
    const updated: QualityFinding = Object.freeze({
      ...existing,
      status: params.newStatus,
    });

    this.findings.set(params.findingId as string, updated);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────
  // SESSION TRACE (§26 — full chain recovery)
  // ─────────────────────────────────────────────────────────────

  /**
   * Recover the complete evidence trail for a session.
   * Must answer all 6 questions from §45.
   */
  getSessionTrace(sessionId: string): SessionTrace {
    const session = this.getSessionOrThrow(sessionId);
    const sourceType = this.sessionSourceTypes.get(sessionId) ?? SourceType.System;

    // Intent (last one if multiple)
    const intentIds = this.sessionIntents.get(sessionId) ?? [];
    const intent = intentIds.length > 0
      ? this.intents.get(intentIds[intentIds.length - 1]) ?? null
      : null;

    // Response (last one if multiple)
    const responseIds = this.sessionResponses.get(sessionId) ?? [];
    const response = responseIds.length > 0
      ? this.responses.get(responseIds[responseIds.length - 1]) ?? null
      : null;

    // All claims for this session
    const claimIds = this.sessionClaims.get(sessionId) ?? [];
    const allClaims = claimIds
      .map(id => this.claims.get(id))
      .filter((c): c is Claim => c !== undefined);

    // All evidence for all claims in this session
    const allEvidence: ClaimEvidence[] = [];
    for (const c of allClaims) {
      const evts = this.claimEvidence.get(c.claimId as string) ?? [];
      allEvidence.push(...evts);
    }

    // All feedback for this session
    const fbIds = this.sessionFeedback.get(sessionId) ?? [];
    const allFeedback = fbIds
      .map(id => this.feedback.get(id))
      .filter((f): f is EvidenceFeedback => f !== undefined);

    // All findings for this session
    const fIds = this.sessionFindings.get(sessionId) ?? [];
    const allFindings = fIds
      .map(id => this.findings.get(id))
      .filter((f): f is QualityFinding => f !== undefined);

    // Extract projectScope from session metadata (set during startSession)
    const projectScope = session.metadata?.projectScope as string | undefined;

    return Object.freeze({
      session: Object.freeze({
        sessionId: session.id as string,
        sourceType,
        startedAt: session.startedAt ?? session.createdAt,
        completedAt: session.completedAt,
        projectScope,
      }),
      intent,
      response,
      claims: Object.freeze(allClaims),
      evidence: Object.freeze(allEvidence),
      feedback: Object.freeze(allFeedback),
      findings: Object.freeze(allFindings),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  /** Add an ID to a session-indexed list. */
  private addToIndex(map: Map<string, string[]>, sessionId: string, id: string): void {
    const list = map.get(sessionId) ?? [];
    list.push(id);
    map.set(sessionId, list);
  }
}