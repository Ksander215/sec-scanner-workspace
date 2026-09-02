/**
 * Project Types — MVP UI Persistence Layer
 * TASK-AIS-EVIDENCE-PERSISTENCE-001 + TASK-AIS-INSIGHT-LIFECYCLE-001
 *
 * Defines the Project aggregate root and its nested entities.
 * Project is the aggregate root: sessions and insights are nested within.
 *
 * Persistence model:
 *   .ais-data/projects/<project-id>.json — one JSON file per project
 *
 * Design principles:
 *   - Project as aggregate root (one file per project)
 *   - Atomic writes (writeSync + fsyncSync + renameSync)
 *   - Corruption handling (validation, .tmp skip, empty skip)
 *   - Secret sanitization on all user-provided text
 *   - Invariants: id + name required, sessions[] + insights[] always exist
 */

// ═══════════════════════════════════════════════════════════════════
// PERSISTED SESSION (Evidence Loop history)
// ═══════════════════════════════════════════════════════════════════

export const MAX_PERSISTED_ANSWER_LENGTH = 2000;
export const MAX_PERSISTED_EXCERPT_LENGTH = 500;

export interface PersistedClaim {
  readonly claimId: string;
  readonly statement: string;
  readonly isVerified: boolean;
  readonly evidenceCount: number;
}

export interface PersistedEvidence {
  readonly filePath: string;
  readonly type: string;
  readonly excerpt: string;
  readonly relevance: number;
}

export interface PersistedFeedback {
  readonly feedbackId: string;
  readonly verdict: string;
  readonly comment?: string;
}

export interface PersistedFinding {
  readonly findingId: string;
  readonly category: string;
  readonly severity: string;
  readonly description: string;
}

/** A persisted interaction session record, nested in Project. */
export interface PersistedSession {
  /**
   * TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (§5 keying invariant):
   * sessionId === the evidence-loop responseId. One record per answered
   * question, so updateSessionFeedback can only ever address that record.
   */
  readonly sessionId: string;
  /** Optional back-reference to the interaction session that produced this record. */
  readonly interactionSessionId?: string;
  readonly projectPath: string;
  readonly createdAt: string;
  readonly question: string;
  readonly answer: string;
  readonly claims: readonly PersistedClaim[];
  readonly sources: readonly PersistedEvidence[];
  readonly feedback?: PersistedFeedback;
  readonly findings: readonly PersistedFinding[];
}

// ═══════════════════════════════════════════════════════════════════
// INSIGHT (TASK-AIS-INSIGHT-LIFECYCLE-001)
// ═══════════════════════════════════════════════════════════════════

/** 10 Insight statuses — full lifecycle. */
export enum InsightStatus {
  NEW = 'NEW',
  EVALUATING = 'EVALUATING',
  ACTIVE = 'ACTIVE',
  DEFERRED = 'DEFERRED',
  REJECTED = 'REJECTED',
  TESTING = 'TESTING',
  VALIDATED = 'VALIDATED',
  IMPLEMENTED = 'IMPLEMENTED',
  INVALIDATED = 'INVALIDATED',
  REVISITABLE = 'REVISITABLE',
}

/** User decision on an insight (§7). */
export type InsightUserDecision = 'IMPLEMENT_NOW' | 'DEFER' | 'REJECT';

/** Goal alignment assessment (§5). */
export enum GoalAlignment {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

/** A single event in the Insight's history (§8). */
export interface InsightHistoryEvent {
  readonly timestamp: string;
  readonly action: string;
  readonly detail?: string;
}

/**
 * Insight — a user thought, idea, or hypothesis (§3).
 * Self-contained entity: NOT a Goal, NOT a Decision, NOT a Task, NOT a Fact.
 * Can exist WITHOUT a Goal (goalAlignment = NOT_APPLICABLE).
 */
export interface PersistedInsight {
  readonly id: string;
  readonly projectId: string;
  readonly sessionId?: string;
  readonly text: string;
  readonly createdAt: string;
  readonly status: InsightStatus;

  // Evaluation fields (set during EVALUATING → ACTIVE transition)
  readonly relevance?: number;
  readonly feasibility?: number;
  readonly goalAlignment?: GoalAlignment;
  readonly rationale?: string;

  // User decision (set when user chooses IMPLEMENT_NOW / DEFER / REJECT)
  readonly userDecision?: InsightUserDecision;
  readonly decisionAt?: string;
  readonly revisitCondition?: string;

  // Context snapshot for re-evaluation (§10)
  readonly contextSnapshot?: Record<string, unknown>;

  // Immutable history (§8)
  readonly history: readonly InsightHistoryEvent[];
}

/** Minimal insight view for list endpoints. */
export interface InsightSummary {
  readonly id: string;
  readonly text: string;
  readonly status: InsightStatus;
  readonly createdAt: string;
  readonly userDecision?: InsightUserDecision;
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT (Aggregate Root)
// ═══════════════════════════════════════════════════════════════════

/** Project — the aggregate root for persistence. One JSON file per project. */
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly projectPath: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sessions: readonly PersistedSession[];
  readonly insights: readonly PersistedInsight[];
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT CONTINUITY VIEW (TASK-AIS-CONTINUITY-RECONSTRUCTION-001, S-4)
// ═══════════════════════════════════════════════════════════════════
//
// Read-only reconstruction contract: a DETERMINISTIC projection of the
// existing durable Project aggregate. This is a view model only — it adds
// no storage, no lifecycle, and no new domain semantics. Every field is
// derived from a really persisted record; absent data is rendered as
// null / [] / undefined (refusal-to-fabricate, baseline Goal Integrity).

/** Persisted project identity, taken verbatim from the Project aggregate. */
export interface ContinuityProjectIdentity {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Most recent REAL persisted record (§8). Candidates are session/insight
 * records only — the current HTTP request and Project.updatedAt alone never
 * create activity. null when no activity records exist.
 */
export interface ContinuityLastActivity {
  readonly timestamp: string;
  readonly type: 'qa' | 'insight';
  readonly summary: string;
}

/** One persisted Q&A record, keyed by responseId (S-4.4/S-4.5/S-4.6). */
export interface ContinuitySessionView {
  /** PersistedSession.sessionId === evidence-loop responseId (keying invariant). */
  readonly responseId: string;
  readonly interactionSessionId?: string;
  readonly question: string;
  readonly answer: string;
  readonly claims: readonly PersistedClaim[];
  readonly sources: readonly PersistedEvidence[];
  readonly feedback?: PersistedFeedback;
  readonly findings: readonly PersistedFinding[];
  readonly timestamp: string;
}

/** One persisted insight (S-4.7). Fields absent from the model are omitted. */
export interface ContinuityInsightView {
  readonly id: string;
  readonly text: string;
  readonly status: InsightStatus;
  readonly createdAt: string;
  readonly userDecision?: InsightUserDecision;
  readonly decisionAt?: string;
  readonly revisitCondition?: string;
  readonly history: readonly InsightHistoryEvent[];
}

/** One explicit user decision (S-4.8). Never inferred, never heuristic. */
export interface ContinuityDecisionView {
  readonly insightId: string;
  readonly decision: InsightUserDecision;
  readonly timestamp: string;
}

/** Persisted insight states that still await closure (S-4.10). */
export interface ContinuityUnresolvedView {
  readonly insightId: string;
  readonly status: InsightStatus;
  readonly text: string;
  readonly revisitCondition?: string;
}

/** A revisitable insight as a continuation point (S-4.11.A). */
export interface ContinuityRevisitableView {
  readonly insightId: string;
  readonly text: string;
  readonly revisitCondition?: string;
}

/** Natural continuation points derived ONLY from existing data (S-4.11). */
export interface ContinuityContinuationView {
  readonly revisitableInsights: readonly ContinuityRevisitableView[];
  /** Reuse of the existing demo suggested-questions mechanism; [] otherwise. */
  readonly suggestedQuestions: readonly string[];
  readonly lastActivity: ContinuityLastActivity | null;
}

/**
 * GET /api/project/:id/continuity response (S-4.1..S-4.12).
 *
 * Determinism (§20): for identical durable state the response is identical —
 * no Date.now(), no Math.random(), no LLM, no discovery; ordering is
 * newest-first (existing history convention) with lexicographic tie-breaks.
 *
 * Goal (S-4.9): no goal runtime exists in this slice. The field is always
 * explicitly null — a goal is shown only if it was explicitly captured,
 * which is impossible today.
 */
export interface ProjectContinuityView {
  readonly project: ContinuityProjectIdentity;
  readonly goal: null;
  readonly lastActivity: ContinuityLastActivity | null;
  readonly sessions: readonly ContinuitySessionView[];
  readonly insights: readonly ContinuityInsightView[];
  readonly decisions: readonly ContinuityDecisionView[];
  readonly unresolved: readonly ContinuityUnresolvedView[];
  readonly continuation: ContinuityContinuationView;
}
