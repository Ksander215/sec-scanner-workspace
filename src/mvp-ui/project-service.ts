/**
 * Project Service — Session persistence + continuity
 * TASK-AIS-EVIDENCE-PERSISTENCE-001 + TASK-AIS-INSIGHT-LIFECYCLE-001
 *
 * Captures session answers, feedback, and provides history.
 * Uses ProjectStore for persistence and sanitizes secrets.
 */

import { randomUUID } from 'node:crypto';
import { sanitizeSecrets } from '../core/evidence-loop/secret-sanitizer.js';
import {
  type Project,
  type PersistedSession,
  type PersistedClaim,
  type PersistedEvidence,
  type PersistedFeedback,
  type PersistedFinding,
  type ProjectContinuityView,
  type ContinuityLastActivity,
  type ContinuitySessionView,
  type ContinuityInsightView,
  type ContinuityDecisionView,
  type ContinuityUnresolvedView,
  type ContinuityRevisitableView,
  type ContinuityContinuationView,
  InsightStatus,
  MAX_PERSISTED_ANSWER_LENGTH,
  MAX_PERSISTED_EXCERPT_LENGTH,
} from './project-types.js';
import { getAllDemoConfigs } from './demo-config.js';
import type { ProjectStore } from './project-store.js';

// ═══════════════════════════════════════════════════════════════════
// CONTINUITY CONSTANTS (TASK-AIS-CONTINUITY-RECONSTRUCTION-001)
// ═══════════════════════════════════════════════════════════════════

/** Display cap for lastActivity summaries (deterministic truncation, §20). */
const MAX_CONTINUITY_SUMMARY_LENGTH = 200;

/**
 * Persisted insight statuses that still await closure (S-4.10). Only these
 * existing lifecycle values — never inferred from Q&A content.
 */
const UNRESOLVED_INSIGHT_STATUSES: ReadonlySet<InsightStatus> = new Set([
  InsightStatus.NEW,
  InsightStatus.DEFERRED,
  InsightStatus.REVISITABLE,
]);

/** Truncate a summary deterministically: fixed cap, fixed ellipsis. */
function continuitySummary(text: string): string {
  const single = text.replace(/\s+/g, ' ').trim();
  if (single.length <= MAX_CONTINUITY_SUMMARY_LENGTH) return single;
  return single.substring(0, MAX_CONTINUITY_SUMMARY_LENGTH) + '…';
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT SERVICE
// ═══════════════════════════════════════════════════════════════════

export class ProjectService {
  constructor(private readonly store: ProjectStore) {}

  /** Ensure a project exists, get or create it. */
  ensureProject(projectPath: string, name?: string): Project {
    return this.store.getOrCreate(projectPath, name);
  }

  /** Find project by ID. */
  findById(id: string): Project | undefined {
    return this.store.findById(id);
  }

  /** Capture session answer for persistence.
   *
   * TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-2): the caller MUST pass the
   * evidence-loop responseId as `sessionId` (keying invariant §5:
   * PersistedSession.sessionId === responseId). `interactionSessionId` is an
   * optional back-reference. Sanitization and length caps are applied here —
   * callers must not duplicate them.
   */
  captureSessionAnswer(params: {
    projectPath: string;
    sessionId: string;
    interactionSessionId?: string;
    question: string;
    answer: string;
    claims: readonly { claimId: string; statement: string; isVerified: boolean; evidenceCount: number }[];
    sources: readonly { filePath: string; type: string; excerpt: string; relevance: number }[];
  }): Project {
    const project = this.store.getOrCreate(params.projectPath);

    const sanitizedQuestion = sanitizeSecrets(params.question.trim()).substring(0, 5000);
    const sanitizedAnswer = sanitizeSecrets(params.answer).substring(0, MAX_PERSISTED_ANSWER_LENGTH);

    const claims: PersistedClaim[] = (params.claims ?? []).map(c => ({
      claimId: c.claimId,
      statement: sanitizeSecrets(c.statement).substring(0, 1000),
      isVerified: c.isVerified,
      evidenceCount: c.evidenceCount,
    }));

    const sources: PersistedEvidence[] = (params.sources ?? []).map(s => ({
      filePath: s.filePath,
      type: s.type,
      excerpt: sanitizeSecrets(s.excerpt).substring(0, MAX_PERSISTED_EXCERPT_LENGTH),
      relevance: s.relevance,
    }));

    const session: PersistedSession = {
      sessionId: params.sessionId,
      interactionSessionId: params.interactionSessionId,
      projectPath: params.projectPath,
      createdAt: new Date().toISOString(),
      question: sanitizedQuestion,
      answer: sanitizedAnswer,
      claims,
      sources,
      findings: [],
    };

    return this.store.addSession(project.id, session);
  }

  /** Capture feedback for a session. */
  captureSessionFeedback(params: {
    projectPath: string;
    sessionId: string;
    verdict: string;
    comment?: string;
    findings?: readonly { findingId: string; category: string; severity: string; description: string }[];
  }): Project | undefined {
    const project = this.store.findByPath(params.projectPath);
    if (!project) return undefined;

    const feedback: PersistedFeedback = {
      feedbackId: randomUUID(),
      verdict: params.verdict,
      comment: params.comment ? sanitizeSecrets(params.comment).substring(0, 1000) : undefined,
    };

    const findings: PersistedFinding[] = (params.findings ?? []).map(f => ({
      findingId: f.findingId,
      category: f.category,
      severity: f.severity,
      description: sanitizeSecrets(f.description).substring(0, 2000),
    }));

    return this.store.updateSessionFeedback(project.id, params.sessionId, feedback, findings);
  }

  /** Get session history for a project. */
  getSessionHistory(projectId: string, limit?: number): PersistedSession[] {
    return this.store.getSessionHistory(projectId, limit);
  }

  /** Get recent sessions across all projects. */
  getRecentSessions(limit?: number): PersistedSession[] {
    return this.store.getRecentSessions(limit);
  }

  /** Get project by path. */
  findByPath(projectPath: string): Project | undefined {
    return this.store.findByPath(projectPath);
  }

  /** Get all projects. */
  getAllProjects(): Project[] {
    return this.store.getAll();
  }

  // ─────────────────────────────────────────────────────────────
  // CONTINUITY RECONSTRUCTION (TASK-AIS-CONTINUITY-RECONSTRUCTION-001, S-4)
  // ─────────────────────────────────────────────────────────────

  /**
   * Build the deterministic read-only ProjectContinuityView for a project.
   *
   * S-4 contract:
   *  - Reads ONLY existing durable state (ProjectStore → Project aggregate).
   *    No ensureProject, no addInsight/updateInsight, no capture*, no save,
   *    no timestamp touching (§18 GET MUST BE READ-ONLY).
   *  - Revisitable insights come from the read-only status filter — the exact
   *    equivalent of ProjectStore.getRevisitableInsights() / InsightService
   *    .getRevisitable(). The MUTATING InsightService.checkRevisitability()
   *    (status transition + history append) is deliberately NOT used here.
   *  - lastActivity is the most recent REALLY persisted session/insight
   *    record (§8). Date.now() never fabricates activity; the current HTTP
   *    request is never activity; Project.updatedAt alone never creates
   *    activity. null when no activity records exist.
   *  - Decisions are ONLY explicit user decisions (IMPLEMENT_NOW/DEFER/REJECT)
   *    read from persisted userDecision fields (S-4.8, refusal-to-fabricate).
   *  - goal is always null (S-4.9): no goal runtime exists in this slice.
   *  - suggestedQuestions reuse the existing demo-config mechanism (S-4.11.C);
   *    [] for non-demo projects. No new recommendation engine.
   *  - Returns undefined when the project does not exist → HTTP 404 at the
   *    adapter layer (S-4.12). Never creates a project.
   *
   * Determinism (§20): ordering is newest-first (existing history convention
   * of getSessionHistory/getInsights) with lexicographic tie-breaks, so an
   * identical durable state always yields an identical response.
   */
  getProjectContinuity(projectId: string): ProjectContinuityView | undefined {
    const project = this.store.findById(projectId);
    if (!project) return undefined;

    // ── Sessions: newest-first (getSessionHistory convention), §S-4.4..S-4.6 ──
    const sessions: ContinuitySessionView[] = [...project.sessions]
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.sessionId.localeCompare(b.sessionId))
      .map(s => ({
        responseId: s.sessionId,
        interactionSessionId: s.interactionSessionId,
        question: s.question,
        answer: s.answer,
        claims: s.claims,
        sources: s.sources,
        feedback: s.feedback,
        findings: s.findings,
        timestamp: s.createdAt,
      }));

    // ── Insights: newest-first (getInsights convention), §S-4.7 ──
    const insights = [...project.insights]
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));

    const insightViews: ContinuityInsightView[] = insights.map(i => ({
      id: i.id,
      text: i.text,
      status: i.status,
      createdAt: i.createdAt,
      userDecision: i.userDecision,
      decisionAt: i.decisionAt,
      revisitCondition: i.revisitCondition,
      history: i.history,
    }));

    // ── Decisions: explicit persisted user decisions only, §S-4.8 ──
    const decisions: ContinuityDecisionView[] = insights
      .filter(i => i.userDecision !== undefined)
      .map(i => ({
        insightId: i.id,
        decision: i.userDecision!,
        timestamp: i.decisionAt ?? i.createdAt,
      }))
      .sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp) || a.insightId.localeCompare(b.insightId));

    // ── Unresolved: existing persisted statuses only, §S-4.10 ──
    const unresolved: ContinuityUnresolvedView[] = insights
      .filter(i => UNRESOLVED_INSIGHT_STATUSES.has(i.status))
      .map(i => ({
        insightId: i.id,
        status: i.status,
        text: i.text,
        revisitCondition: i.revisitCondition,
      }));

    // ── Revisitable: READ-ONLY status filter (S-4.11.A), §18-safe ──
    const revisitableInsights: ContinuityRevisitableView[] = insights
      .filter(i => i.status === InsightStatus.REVISITABLE)
      .map(i => ({
        insightId: i.id,
        text: i.text,
        revisitCondition: i.revisitCondition,
      }));

    // ── lastActivity: most recent REAL record, §S-4.3 ──
    const lastActivity = this.computeContinuityLastActivity(sessions, insightViews);

    // ── Continuation points: existing data only, §S-4.11 ──
    const continuation: ContinuityContinuationView = {
      revisitableInsights,
      suggestedQuestions: this.getExistingSuggestedQuestions(project.projectPath),
      lastActivity,
    };

    return {
      project: {
        id: project.id,
        name: project.name,
        path: project.projectPath,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      goal: null, // S-4.9: no goal runtime — never fabricated
      lastActivity,
      sessions,
      insights: insightViews,
      decisions,
      unresolved,
      continuation,
    };
  }

  /**
   * Most recent activity from REAL persisted records (§8). Candidates are
   * Q&A sessions and insights only; ordering is timestamp DESC with a
   * deterministic type/summary tie-break. No candidate → null.
   */
  private computeContinuityLastActivity(
    sessions: readonly ContinuitySessionView[],
    insights: readonly ContinuityInsightView[],
  ): ContinuityLastActivity | null {
    const candidates: ContinuityLastActivity[] = [
      ...sessions.map(s => ({ timestamp: s.timestamp, type: 'qa' as const, summary: continuitySummary(s.question) })),
      ...insights.map(i => ({ timestamp: i.createdAt, type: 'insight' as const, summary: continuitySummary(i.text) })),
    ];
    if (candidates.length === 0) return null;
    candidates.sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
      || b.type.localeCompare(a.type)
      || a.summary.localeCompare(b.summary));
    return candidates[0];
  }

  /**
   * S-4.11.C: reuse the EXISTING demo suggested-questions mechanism. A
   * project whose path matches a registered demo inherits that demo's
   * questions; every other project gets [] — nothing is generated.
   */
  private getExistingSuggestedQuestions(projectPath: string): readonly string[] {
    for (const demo of getAllDemoConfigs()) {
      if (demo.projectPath === projectPath) {
        return [...demo.suggestedQuestions];
      }
    }
    return [];
  }
}
