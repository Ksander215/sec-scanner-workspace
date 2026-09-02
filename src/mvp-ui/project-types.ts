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
