/**
 * Evidence Loop — Types & Enums
 * TASK-MVP-EVIDENCE-LOOP-001A
 *
 * Defines all types for the Evidence Loop subsystem.
 * This is the single source of truth for:
 *   - Claim model (new)
 *   - QualityFinding model (new)
 *   - Evidence-loop Feedback (new — separate from evolution FeedbackEntry)
 *   - Intent & Response records (new)
 *   - Source classification enums
 *   - Verification & Finding lifecycle
 *
 * Design principles:
 *   - All entities are immutable (readonly, Object.freeze)
 *   - Branded IDs for type safety
 *   - Every entity is traceable to Session (I-10)
 *   - Evidence is never overwritten (I-08)
 *   - Feedback ≠ Truth (I-05)
 *   - Human/Synthetic never mixed (I-07)
 *   - Evidence Loop ≠ Architecture Model (I-11, I-12)
 *   - Evidence Loop is not an autonomous agent (I-13)
 */

import type { Timestamp } from '../types/common.js';
import type { SessionId } from '../session/types.js';

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type IntentId = string & { readonly __brand: 'EvidenceLoopIntentId' };
export type ResponseId = string & { readonly __brand: 'EvidenceLoopResponseId' };
export type ClaimId = string & { readonly __brand: 'EvidenceLoopClaimId' };
export type ClaimEvidenceId = string & { readonly __brand: 'EvidenceLoopClaimEvidenceId' };
export type EvidenceFeedbackId = string & { readonly __brand: 'EvidenceLoopFeedbackId' };
export type FindingId = string & { readonly __brand: 'EvidenceLoopFindingId' };

export function brandIntentId(id: string): IntentId { return id as IntentId; }
export function brandResponseId(id: string): ResponseId { return id as ResponseId; }
export function brandClaimId(id: string): ClaimId { return id as ClaimId; }
export function brandClaimEvidenceId(id: string): ClaimEvidenceId { return id as ClaimEvidenceId; }
export function brandEvidenceFeedbackId(id: string): EvidenceFeedbackId { return id as EvidenceFeedbackId; }
export function brandFindingId(id: string): FindingId { return id as FindingId; }

// ═══════════════════════════════════════════════════════════════════
// ENUMS — Source Classification
// ═══════════════════════════════════════════════════════════════════

/** Where a session or evidence originated. NEVER mix synthetic with human (I-07). */
export enum SourceType {
  Synthetic = 'synthetic',
  Human = 'human',
  System = 'system',
}

/** The type of source an evidence item references. */
export enum EvidenceSourceType {
  Code = 'code',
  Document = 'document',
  ArchitectureModel = 'architecture_model',
  Runtime = 'runtime',
  UserFeedback = 'user_feedback',
  UserStatement = 'user_statement',
  SyntheticObservation = 'synthetic_observation',
}

// ═══════════════════════════════════════════════════════════════════
// ENUMS — Claim
// ═══════════════════════════════════════════════════════════════════

/** What kind of architectural assertion a claim makes. */
export enum ClaimType {
  Structural = 'structural',
  Dependency = 'dependency',
  Behavioral = 'behavioral',
  Impact = 'impact',
  Risk = 'risk',
  ArchitecturalRationale = 'architectural_rationale',
}

/** Whether and how a claim has been verified. */
export enum VerificationStatus {
  Unverified = 'unverified',
  Supported = 'supported',
  PartiallySupported = 'partially_supported',
  Contradicted = 'contradicted',
  Uncertain = 'uncertain',
}

// ═══════════════════════════════════════════════════════════════════
// ENUMS — Feedback (Evidence Loop)
// ═══════════════════════════════════════════════════════════════════

/** Per-response/claim feedback types from §19. */
export enum EvidenceFeedbackType {
  Correct = 'correct',
  Incorrect = 'incorrect',
  Incomplete = 'incomplete',
  Unclear = 'unclear',
  Useful = 'useful',
  NotUseful = 'not_useful',
}

// ═══════════════════════════════════════════════════════════════════
// ENUMS — Quality Finding
// ═══════════════════════════════════════════════════════════════════

/** Categories of quality issues found in AIS responses. */
export enum FindingCategory {
  Hallucination = 'hallucination',
  MissingContext = 'missing_context',
  WrongGrounding = 'wrong_grounding',
  IncompleteUnderstanding = 'incomplete_understanding',
  IncorrectDependency = 'incorrect_dependency',
  IncorrectImpact = 'incorrect_impact',
  IrrelevantInformation = 'irrelevant_information',
  Other = 'other',
}

/** Finding lifecycle status from §22. */
export enum FindingStatus {
  Observed = 'observed',
  Triaged = 'triaged',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Resolved = 'resolved',
  RegressionVerified = 'regression_verified',
}

/** Finding severity. */
export enum FindingSeverity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

// ═══════════════════════════════════════════════════════════════════
// VERIFICATION HISTORY (Evidence Versioning §29)
// ═══════════════════════════════════════════════════════════════════

/** Immutable record of a verification status change on a claim. */
export interface VerificationEvent {
  readonly oldStatus: VerificationStatus;
  readonly newStatus: VerificationStatus;
  readonly changedAt: Timestamp;
  readonly reason: string;
  readonly source: string;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Intent — what the user was trying to find out.
 * rawInput is ALWAYS preserved verbatim (§8).
 */
export interface Intent {
  readonly intentId: IntentId;
  readonly sessionId: SessionId;
  readonly rawInput: string;
  readonly normalizedIntent: string | null;
  readonly createdAt: Timestamp;
}

/**
 * EvidenceLoopResponse — the AIS response linked to a session and intent.
 * Mirrors the data already in ArchitectureAnswerResponse but adds session linkage.
 */
export interface EvidenceLoopResponse {
  readonly responseId: ResponseId;
  readonly sessionId: SessionId;
  readonly intentId: IntentId;
  readonly content: string;
  readonly provider: string;
  readonly model: string;
  readonly createdAt: Timestamp;
  readonly latencyMs: number;
  readonly status: 'success' | 'error';
}

/**
 * Claim — a single verifiable architectural assertion from an AIS response.
 * Claims must be atomic (§11): one assertion per claim.
 * Each claim belongs to a Response (I-03) and is traceable to Session (I-10).
 */
export interface Claim {
  readonly claimId: ClaimId;
  readonly responseId: ResponseId;
  readonly sessionId: SessionId;
  readonly statement: string;
  readonly claimType: ClaimType;
  readonly confidence: number;
  readonly verificationStatus: VerificationStatus;
  readonly createdAt: Timestamp;
  readonly verificationHistory: readonly VerificationEvent[];
}

/**
 * ClaimEvidence — a piece of evidence grounding a specific claim.
 * Links claim → evidence source (I-04: every evidence has provenance).
 */
export interface ClaimEvidence {
  readonly evidenceId: ClaimEvidenceId;
  readonly claimId: ClaimId;
  readonly sessionId: SessionId;
  readonly sourceType: EvidenceSourceType;
  readonly sourceReference: string;
  readonly excerpt: string;
  readonly relevance: number;
  readonly createdAt: Timestamp;
}

/**
 * EvidenceFeedback — user feedback linked to session/response/claim.
 * This is SEPARATE from evolution FeedbackEntry (which links to Bottleneck/Improvement).
 * This feedback links to the evidence loop: Session → Response → Claim (§18).
 */
export interface EvidenceFeedback {
  readonly feedbackId: EvidenceFeedbackId;
  readonly sessionId: SessionId;
  readonly responseId: ResponseId;
  readonly claimId: ClaimId | null;
  readonly type: EvidenceFeedbackType;
  readonly content: string;
  readonly sourceType: SourceType;
  readonly createdAt: Timestamp;
}

/**
 * QualityFinding — a structured quality issue confirmed by evidence.
 * A Finding is NOT created automatically from feedback (§32).
 * It requires explicit creation with evidence basis (I-09).
 */
export interface QualityFinding {
  readonly findingId: FindingId;
  readonly sourceSessionId: SessionId;
  readonly relatedClaimId: ClaimId | null;
  readonly category: FindingCategory;
  readonly severity: FindingSeverity;
  readonly description: string;
  readonly evidenceIds: readonly string[];
  readonly status: FindingStatus;
  readonly createdAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// SESSION TRACE (§26)
// ═══════════════════════════════════════════════════════════════════

/**
 * Complete trace of an evidence-loop session.
 * Must be recoverable for any completed session (§26, §45).
 */
export interface SessionTrace {
  readonly session: {
    readonly sessionId: string;
    readonly sourceType: SourceType;
    readonly startedAt: string;
    readonly completedAt: string | undefined;
    readonly projectScope: string | undefined;
  };
  readonly intent: Intent | null;
  readonly response: EvidenceLoopResponse | null;
  readonly claims: readonly Claim[];
  readonly evidence: readonly ClaimEvidence[];
  readonly feedback: readonly EvidenceFeedback[];
  readonly findings: readonly QualityFinding[];
}

// ═══════════════════════════════════════════════════════════════════
// PARAM INTERFACES (for service operations)
// ═══════════════════════════════════════════════════════════════════

export interface RecordIntentParams {
  readonly sessionId: SessionId;
  readonly rawInput: string;
  readonly normalizedIntent?: string | null;
}

export interface RecordResponseParams {
  readonly sessionId: SessionId;
  readonly intentId: IntentId;
  readonly content: string;
  readonly provider: string;
  readonly model: string;
  readonly latencyMs: number;
  readonly status?: 'success' | 'error';
}

export interface CreateClaimParams {
  readonly responseId: ResponseId;
  readonly sessionId: SessionId;
  readonly statement: string;
  readonly claimType: ClaimType;
  readonly confidence?: number;
}

export interface AttachEvidenceParams {
  readonly claimId: ClaimId;
  readonly sessionId: SessionId;
  readonly sourceType: EvidenceSourceType;
  readonly sourceReference: string;
  readonly excerpt: string;
  readonly relevance?: number;
}

export interface RecordFeedbackParams {
  readonly sessionId: SessionId;
  readonly responseId: ResponseId;
  readonly claimId?: ClaimId | null;
  readonly type: EvidenceFeedbackType;
  readonly content: string;
  readonly sourceType: SourceType;
}

export interface CreateFindingParams {
  readonly sourceSessionId: SessionId;
  readonly relatedClaimId?: ClaimId | null;
  readonly category: FindingCategory;
  readonly severity: FindingSeverity;
  readonly description: string;
  readonly evidenceIds?: readonly string[];
}

export interface UpdateClaimVerificationParams {
  readonly claimId: ClaimId;
  readonly newStatus: VerificationStatus;
  readonly reason: string;
  readonly source: string;
}

export interface UpdateFindingStatusParams {
  readonly findingId: FindingId;
  readonly newStatus: FindingStatus;
}

export interface StartSessionParams {
  readonly sourceType: SourceType;
  readonly projectScope?: string;
  readonly metadata?: Record<string, unknown>;
}
