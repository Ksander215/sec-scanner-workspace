/**
 * Interaction Layer — Types & Enums
 * TASK-MVP-EVIDENCE-LOOP-001B
 *
 * Minimal interaction boundary types.
 * This layer does NOT introduce new domain entities —
 * it only defines the interaction state machine (§6)
 * and request/response DTOs for the user-facing boundary.
 *
 * All domain entities (Session, Intent, Response, Claim, Evidence,
 * Feedback, QualityFinding, SessionTrace) remain defined in evidence-loop/types.ts.
 */

import type { SessionId } from '../session/types.js';
import type { EvidenceFeedbackType } from '../evidence-loop/types.js';

// ═══════════════════════════════════════════════════════════════════
// INTERACTION STATE MACHINE (§6)
// ═══════════════════════════════════════════════════════════════════

/**
 * Interaction-level session states (§6).
 * These track the user-facing progress through one question session.
 * They are separate from SessionRuntime's FSM which tracks the
 * underlying session lifecycle (Created→Running→Completed→Archived).
 */
export enum InteractionState {
  Created = 'CREATED',
  QuestionSubmitted = 'QUESTION_SUBMITTED',
  Processing = 'PROCESSING',
  AnswerAvailable = 'ANSWER_AVAILABLE',
  EvidenceAvailable = 'EVIDENCE_AVAILABLE',
  FeedbackPending = 'FEEDBACK_PENDING',
  FeedbackRecorded = 'FEEDBACK_RECORDED',
  TraceAvailable = 'TRACE_AVAILABLE',
  Failed = 'FAILED',
}

/** Valid state transitions for the interaction FSM. */
const VALID_TRANSITIONS: Readonly<Record<InteractionState, readonly InteractionState[]>> = {
  [InteractionState.Created]: [InteractionState.QuestionSubmitted],
  [InteractionState.QuestionSubmitted]: [InteractionState.Processing, InteractionState.Failed],
  [InteractionState.Processing]: [InteractionState.AnswerAvailable, InteractionState.Failed],
  [InteractionState.AnswerAvailable]: [InteractionState.EvidenceAvailable],
  [InteractionState.EvidenceAvailable]: [InteractionState.FeedbackPending],
  [InteractionState.FeedbackPending]: [InteractionState.FeedbackRecorded],
  [InteractionState.FeedbackRecorded]: [InteractionState.TraceAvailable],
  [InteractionState.TraceAvailable]: [],
  [InteractionState.Failed]: [],
};

/** Check if a transition is valid. */
export function isValidTransition(from: InteractionState, to: InteractionState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ═══════════════════════════════════════════════════════════════════
// REQUEST / RESPONSE DTOs
// ═══════════════════════════════════════════════════════════════════

/** Input for starting a new interaction session. */
export interface StartInteractionParams {
  readonly projectPath: string;
  readonly projectId?: string;
  readonly provenance?: 'human' | 'synthetic';
}

/** Input for submitting a question. */
export interface SubmitQuestionParams {
  readonly sessionId: SessionId;
  readonly question: string;
}

/** Input for recording user feedback. */
export interface SubmitFeedbackParams {
  readonly sessionId: SessionId;
  readonly verdict: 'correct' | 'incorrect' | 'incomplete';
  readonly comment?: string;
}

// ═══════════════════════════════════════════════════════════════════
// VIEW MODELS — what the user sees (§5, §17)
// ═══════════════════════════════════════════════════════════════════

/** Minimal session info returned to user. */
export interface SessionView {
  readonly sessionId: string;
  readonly state: InteractionState;
  readonly createdAt: string;
}

/** The answer presented to the user (§17 State 3). */
export interface AnswerView {
  readonly responseId: string;
  readonly content: string;
  readonly sources: readonly EvidenceSourceView[];
  readonly claims: readonly ClaimView[];
}

/** A single evidence source shown to the user (§12). */
export interface EvidenceSourceView {
  readonly filePath: string;
  readonly type: string;
  readonly excerpt: string;
  readonly relevance: number;
}

/** A single claim shown to the user (§11). */
export interface ClaimView {
  readonly claimId: string;
  readonly statement: string;
  readonly evidenceCount: number;
  readonly isVerified: boolean;
}

/** Feedback confirmation returned to user. */
export interface FeedbackView {
  readonly feedbackId: string;
  readonly verdict: string;
  readonly findingCreated: boolean;
}

/** Full trace view (§16) — wraps SessionTrace from 001A. */
export interface TraceView {
  readonly sessionId: string;
  readonly provenance: string;
  readonly question: string | null;
  readonly answer: string | null;
  readonly claims: readonly ClaimView[];
  readonly sources: readonly EvidenceSourceView[];
  readonly feedback: readonly FeedbackSummary[];
  readonly findings: readonly FindingSummary[];
}

/** Minimal feedback summary for trace view. */
export interface FeedbackSummary {
  readonly feedbackId: string;
  readonly type: string;
  readonly content: string;
}

/** Minimal finding summary for trace view. */
export interface FindingSummary {
  readonly findingId: string;
  readonly category: string;
  readonly severity: string;
  readonly description: string;
  readonly status: string;
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL — Interaction Session Record
// ═══════════════════════════════════════════════════════════════════

/** Internal tracking of an interaction session. */
export interface InteractionSession {
  readonly sessionId: string;
  readonly projectPath: string;
  readonly projectId: string;
  readonly state: InteractionState;
  readonly createdAt: string;
  readonly lastResponseId: string | null;
  readonly lastIntentId: string | null;
}
