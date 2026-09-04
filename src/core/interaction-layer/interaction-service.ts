/**
 * Interaction Service — Orchestrator
 * TASK-MVP-EVIDENCE-LOOP-001B
 *
 * Thin orchestration layer that connects:
 *   User Question → EvidenceLoopService → ExecutionEngine → Claims → Evidence → Feedback
 *
 * This service does NOT duplicate any domain logic.
 * All invariant enforcement remains in EvidenceLoopService (001A).
 *
 * Invariants preserved:
 *   I-01..I-13: Delegated to EvidenceLoopService
 *   §14: Feedback ≠ Truth (never mutates Architecture Model)
 *   §19: User-safe error messages only
 *   §20: All data sanitized via EvidenceLoopService
 *   §21: Provenance enforced per session
 *   §29: No NewSessionService/NewEvidenceService — only wraps existing
 */

import type { SessionId, Session } from '../session/types.js';
import type { EvidenceLoopService } from '../evidence-loop/evidence-loop-service.js';
import type { ExecutionEngine } from '../engine/execution-engine.js';
import type { ArchitectureAnswerResponse } from '../engine/execution-engine.js';
import type { SubmissionResolution, ResolveSubmissionInput } from '../task-resolution/index.js';

import { SourceType, ClaimType, EvidenceFeedbackType,
  FindingCategory, FindingSeverity, EvidenceSourceType,
} from '../evidence-loop/types.js';
import type { SessionTrace } from '../evidence-loop/types.js';

import {
  InteractionState, isValidTransition,
  type StartInteractionParams, type SubmitQuestionParams, type SubmitFeedbackParams,
  type SessionView, type AnswerView, type EvidenceSourceView, type ClaimView,
  type FeedbackView, type TraceView, type FeedbackSummary, type FindingSummary,
  type InteractionSession,
} from './types.js';
import {
  InteractionError, EmptyQuestionError, InteractionStateError,
  InteractionSessionNotFoundError, ExecutionFailedError,
} from './errors.js';

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

export interface InteractionServiceConfig {
  readonly evidenceLoop: EvidenceLoopService;
  readonly engine: ExecutionEngine;
  /**
   * TASK-AIS-TASK-RESOLUTION-SLICE-001 (§12): optional Task Resolution.
   * Wired in the real runtime (mvp-ui/index.ts); OPTIONAL so existing
   * constructions keep their exact behavior (additive, CONNECT > CREATE).
   * The engine decides WHAT preparation the task needs and HOW it binds to
   * EXISTING mechanisms — the user never configures it (task §3/§11).
   */
  readonly taskResolver?: {
    resolveForSubmission(input: ResolveSubmissionInput): SubmissionResolution;
  };
}

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

export class InteractionService {
  private readonly evidenceLoop: EvidenceLoopService;
  private readonly engine: ExecutionEngine;
  private readonly taskResolver: InteractionServiceConfig['taskResolver'];

  /** Interaction-level session tracking. */
  private readonly interactions = new Map<string, InteractionSession>();

  constructor(config: InteractionServiceConfig) {
    this.evidenceLoop = config.evidenceLoop;
    this.engine = config.engine;
    this.taskResolver = config.taskResolver;
  }

  // ─────────────────────────────────────────────────────────────
  // START INTERACTION (§7, AC-01)
  // ─────────────────────────────────────────────────────────────

  /**
   * Create a new interaction session.
   * Delegates to EvidenceLoopService.startSession() — no duplicate session model.
   */
  async startInteraction(params: StartInteractionParams): Promise<SessionView> {
    const sourceType = params.provenance === 'synthetic'
      ? SourceType.Synthetic
      : SourceType.Human;

    const session = await this.evidenceLoop.startSession({
      sourceType,
      projectScope: params.projectPath,
    });

    const interaction: InteractionSession = {
      sessionId: session.id as string,
      projectPath: params.projectPath,
      projectId: params.projectId ?? 'interaction-session',
      state: InteractionState.Created,
      createdAt: session.createdAt,
      lastResponseId: null,
      lastIntentId: null,
    };

    this.interactions.set(interaction.sessionId, interaction);

    return this.toSessionView(session, interaction.state);
  }

  // ─────────────────────────────────────────────────────────────
  // SUBMIT QUESTION (§8, AC-02, AC-03)
  // ─────────────────────────────────────────────────────────────

  /**
   * Submit a question and run the full AIS pipeline.
   * Orchestrates: recordIntent → execute → recordResponse → createClaims → attachEvidence
   *
   * On failure: marks interaction as FAILED, does NOT create false evidence (§19).
   */
  async submitQuestion(params: SubmitQuestionParams): Promise<AnswerView> {
    const interaction = this.getInteractionOrThrow(params.sessionId as string);
    this.transitionOrThrow(
      interaction,
      InteractionState.QuestionSubmitted,
      `submitQuestion requires state CREATED, got ${interaction.state}`,
    );

    // Validate question (§19: empty question)
    if (!params.question.trim()) {
      throw new EmptyQuestionError();
    }

    // Transition: Created → QuestionSubmitted → Processing
    let current = interaction;
    current = this.advanceState(current, InteractionState.QuestionSubmitted);
    current = this.advanceState(current, InteractionState.Processing);

    try {
      // Step 1: Record intent via EvidenceLoopService (I-02)
      const intent = await this.evidenceLoop.recordIntent({
        sessionId: params.sessionId,
        rawInput: params.question,
      });

      this.interactions.set(interaction.sessionId, {
        ...current,
        lastIntentId: intent.intentId as string,
      });
      current = this.interactions.get(interaction.sessionId)!;

      // Step 1.5: TASK-AIS-TASK-RESOLUTION-SLICE-001 (§12) — Task Resolution
      // sits between intent recording and execution. The engine decides WHAT
      // preparation is needed and produces the Execution Plan binding it to
      // EXISTING mechanisms (§5.4). No second pipeline: the only execution
      // input is the plan's optional persisted-context digest, consumed by
      // the existing ExecutionEngine through one additive seam. The resolver
      // never throws into the question path (§18 safe degradation inside).
      let resolved: SubmissionResolution | undefined;
      if (this.taskResolver) {
        try {
          resolved = this.taskResolver.resolveForSubmission({
            sessionId: interaction.sessionId,
            projectPath: interaction.projectPath,
            question: params.question.trim(),
            preference: params.explanationPreference,
          });
        } catch {
          resolved = undefined; // resolver bug must not fail the question
        }
      }

      // Step 2: Execute via existing ExecutionEngine (§9 — no second runtime)
      const engineResponse = await this.engine.execute<ArchitectureAnswerResponse>({
        projectId: interaction.projectId,
        projectPath: interaction.projectPath,
        question: params.question,
        taskId: `INTERACTION-${interaction.sessionId}`,
        // Task Resolution output (slice-001): the plan's persisted-context
        // digest for history-grounded tasks; undefined otherwise → execution
        // byte-identical to the pre-slice pipeline.
        ...(resolved?.plan.additionalContext
          ? { additionalContext: resolved.plan.additionalContext }
          : {}),
      });

      // Step 3: Record response via EvidenceLoopService (I-01)
      const response = await this.evidenceLoop.recordResponse({
        sessionId: params.sessionId,
        intentId: intent.intentId,
        content: engineResponse.answer,
        provider: engineResponse.provider,
        model: engineResponse.model,
        latencyMs: engineResponse.latencyMs,
      });

      this.interactions.set(current.sessionId, {
        ...current,
        lastResponseId: response.responseId as string,
      });
      current = this.interactions.get(current.sessionId)!;

      // Step 4: Create claims from response (§11, AC-05)
      const claims = this.extractClaimsFromResponse(
        response.responseId,
        params.sessionId,
        engineResponse,
      );

      // Step 5: Attach evidence from engine sources (§12, AC-06)
      const evidenceViews = this.attachEvidenceFromSources(
        claims,
        params.sessionId,
        engineResponse,
      );

      // Transition through answer states
      current = this.advanceState(current, InteractionState.AnswerAvailable);
      current = this.advanceState(current, InteractionState.EvidenceAvailable);
      current = this.advanceState(current, InteractionState.FeedbackPending);

      return {
        responseId: response.responseId as string,
        content: response.content,
        sources: evidenceViews,
        claims: claims.map(c => this.toClaimView(c, params.sessionId as string)),
        // Task Resolution (slice-001): ADDITIVE human-facing preparation view.
        ...(resolved ? { preparation: resolved.preparation } : {}),
      };
    } catch (err) {
      // §19: On failure, mark as FAILED — do NOT create false evidence
      this.updateState(current ?? interaction, InteractionState.Failed);

      // Re-throw as safe ExecutionFailedError (no stack trace to user)
      if (err instanceof InteractionError) throw err;
      throw new ExecutionFailedError();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUBMIT FEEDBACK (§13, AC-07, AC-08)
  // ─────────────────────────────────────────────────────────────

  /**
   * Record user feedback and optionally create a QualityFinding.
   * §14: Feedback ≠ Truth — never mutates Architecture Model.
   */
  async submitFeedback(params: SubmitFeedbackParams): Promise<FeedbackView> {
    const interaction = this.getInteractionOrThrow(params.sessionId as string);
    if (interaction.state !== InteractionState.FeedbackPending) {
      throw new InteractionStateError(
        interaction.state, InteractionState.FeedbackPending, interaction.sessionId,
      );
    }

    if (!interaction.lastResponseId) {
      throw new InteractionStateError(
        interaction.state, 'FEEDBACK_PENDING with response', params.sessionId as string,
      );
    }

    // Map verdict to EvidenceFeedbackType
    const feedbackType = this.verdictToFeedbackType(params.verdict);

    // Record feedback via EvidenceLoopService (I-05: Feedback ≠ Truth)
    const feedback = this.evidenceLoop.recordFeedback({
      sessionId: params.sessionId,
      responseId: interaction.lastResponseId as any,
      type: feedbackType,
      content: params.comment ?? '',
      sourceType: SourceType.Human,
    });

    // §15: Create QualityFinding for negative/partial feedback (AC-08)
    let findingCreated = false;
    if (params.verdict === 'incorrect' || params.verdict === 'incomplete') {
      const category = params.verdict === 'incorrect'
        ? FindingCategory.WrongGrounding
        : FindingCategory.IncompleteUnderstanding;

      this.evidenceLoop.createFinding({
        sourceSessionId: params.sessionId,
        category,
        severity: FindingSeverity.Medium,
        description: params.comment ?? `User reported: ${params.verdict}`,
      });
      findingCreated = true;
    }

    let current = interaction;
    current = this.advanceState(current, InteractionState.FeedbackRecorded);
    current = this.advanceState(current, InteractionState.TraceAvailable);

    return {
      feedbackId: feedback.feedbackId as string,
      verdict: params.verdict,
      findingCreated,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // GET TRACE (§16, AC-09)
  // ─────────────────────────────────────────────────────────────

  /**
   * Get the full session trace via EvidenceLoopService (§16).
   * This is the primary technical result of 001B.
   */
  getTrace(sessionId: string): TraceView {
    // TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-0): bare validation call — preserves
    // InteractionSessionNotFoundError (404) semantics without an unused binding (TS6133).
    this.getInteractionOrThrow(sessionId);

    const trace: SessionTrace = this.evidenceLoop.getSessionTrace(sessionId);

    // Build view models from trace
    const claims = trace.claims.map(c => this.toClaimView(c, sessionId));

    const evidenceViews: EvidenceSourceView[] = [];
    for (const ev of trace.evidence) {
      evidenceViews.push({
        filePath: ev.sourceReference,
        type: ev.sourceType,
        excerpt: ev.excerpt,
        relevance: ev.relevance,
      });
    }

    const feedback: FeedbackSummary[] = trace.feedback.map(f => ({
      feedbackId: f.feedbackId as string,
      type: f.type,
      content: f.content,
    }));

    const findings: FindingSummary[] = trace.findings.map(f => ({
      findingId: f.findingId as string,
      category: f.category,
      severity: f.severity,
      description: f.description,
      status: f.status,
    }));

    return {
      sessionId,
      provenance: trace.session.sourceType,
      question: trace.intent?.rawInput ?? null,
      answer: trace.response?.content ?? null,
      claims,
      sources: evidenceViews,
      feedback,
      findings,
    };
  }

  /** Get current session state. */
  getSessionView(sessionId: string): SessionView {
    const interaction = this.getInteractionOrThrow(sessionId);
    const session = this.evidenceLoop['sessionRuntime'].getSession(sessionId);
    if (!session) throw new InteractionSessionNotFoundError(sessionId);
    return this.toSessionView(session, interaction.state);
  }

  /**
   * TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-2/S-3 support):
   * Read-only exposure of the interaction facts required for durable project
   * capture — the validated projectPath (§7 preferred source) and the exact
   * responseId that feedback targets. Introduces NO new state: it reads the
   * existing InteractionSession record.
   */
  getCaptureContext(sessionId: string): { projectPath: string; lastResponseId: string | null } | undefined {
    const interaction = this.interactions.get(sessionId);
    if (!interaction) return undefined;
    return {
      projectPath: interaction.projectPath,
      lastResponseId: interaction.lastResponseId,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CLAIM EXTRACTION (§11)
  // ─────────────────────────────────────────────────────────────

  /**
   * Extract claims from the AIS response and engine sources.
   * Uses a simple heuristic: each source with high relevance becomes a claim.
   * Claims without evidence are marked Unverified (§11 invariant).
   */
  private extractClaimsFromResponse(
    responseId: any,
    sessionId: SessionId,
    engineResponse: ArchitectureAnswerResponse,
  ) {
    const claims: any[] = [];

    // Create a claim for each significant source
    for (const source of engineResponse.sources) {
      const statement = source.description || `AIS references ${source.filePath}`;
      const claim = this.evidenceLoop.createClaim({
        responseId,
        sessionId,
        statement,
        claimType: ClaimType.Structural,
        confidence: source.relevance,
      });
      claims.push(claim);
    }

    return claims;
  }

  /**
   * Attach evidence from engine sources to claims.
   */
  private attachEvidenceFromSources(
    claims: any[],
    sessionId: SessionId,
    engineResponse: ArchitectureAnswerResponse,
  ): EvidenceSourceView[] {
    const views: EvidenceSourceView[] = [];

    for (let i = 0; i < Math.min(claims.length, engineResponse.sources.length); i++) {
      const source = engineResponse.sources[i];
      const claim = claims[i];

      this.evidenceLoop.attachEvidence({
        claimId: claim.claimId,
        sessionId,
        sourceType: EvidenceSourceType.Code,
        sourceReference: source.filePath,
        excerpt: source.snippet || '',
        relevance: source.relevance,
      });

      views.push({
        filePath: source.filePath,
        type: 'code',
        excerpt: source.snippet || '',
        relevance: source.relevance,
      });
    }

    return views;
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  private getInteractionOrThrow(sessionId: string): InteractionSession {
    const interaction = this.interactions.get(sessionId);
    if (!interaction) throw new InteractionSessionNotFoundError(sessionId);
    return interaction;
  }

  private transitionOrThrow(
    interaction: InteractionSession,
    target: InteractionState,
    _message: string, // TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-0): unused param (TS6133)
  ): void {
    if (!isValidTransition(interaction.state, target)) {
      throw new InteractionStateError(interaction.state, target, interaction.sessionId);
    }
  }

  /** Validate transition and update state atomically. Returns updated InteractionSession. */
  private advanceState(interaction: InteractionSession, target: InteractionState): InteractionSession {
    if (!isValidTransition(interaction.state, target)) {
      throw new InteractionStateError(interaction.state, target, interaction.sessionId);
    }
    const updated: InteractionSession = {
      ...interaction,
      state: target,
    };
    this.interactions.set(updated.sessionId, updated);
    return updated;
  }

  /** Force-set state without validation (for error paths only). */
  private updateState(interaction: InteractionSession, newState: InteractionState): void {
    const updated: InteractionSession = {
      ...interaction,
      state: newState,
    };
    this.interactions.set(interaction.sessionId, updated);
  }

  private verdictToFeedbackType(verdict: string): EvidenceFeedbackType {
    switch (verdict) {
      case 'correct': return EvidenceFeedbackType.Correct;
      case 'incorrect': return EvidenceFeedbackType.Incorrect;
      case 'incomplete': return EvidenceFeedbackType.Incomplete;
      default: return EvidenceFeedbackType.NotUseful;
    }
  }

  private toSessionView(session: Session, state: InteractionState): SessionView {
    return {
      sessionId: session.id as string,
      state,
      createdAt: session.createdAt,
    };
  }

  private toClaimView(claim: any, _sessionId: string): ClaimView {
    const evidence = this.evidenceLoop.getEvidenceForClaim(claim.claimId as string);
    return {
      claimId: claim.claimId as string,
      statement: claim.statement,
      evidenceCount: evidence.length,
      isVerified: claim.verificationStatus !== 'unverified',
    };
  }
}
