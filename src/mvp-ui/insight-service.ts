/**
 * Insight Service — Lifecycle management for user insights
 * TASK-AIS-INSIGHT-LIFECYCLE-001
 *
 * Insight is a self-contained entity: NOT Goal, NOT Decision, NOT Task, NOT Fact.
 * Can exist WITHOUT a Goal (goalAlignment = NOT_APPLICABLE).
 *
 * Lifecycle: NEW -> EVALUATING -> ACTIVE -> DEFERRED/REJECTED/TESTING
 *            TESTING -> VALIDATED -> IMPLEMENTED
 *            DEFERRED -> REVISITABLE (when context changes)
 *            Any non-terminal -> INVALIDATED
 *
 * User decides: IMPLEMENT_NOW / DEFER / REJECT (not AIS).
 * Insight NEVER auto-changes Goal (Goal Integrity).
 */

import { randomUUID } from 'node:crypto';
import { sanitizeSecrets } from '../core/evidence-loop/secret-sanitizer.js';
import {
  type PersistedInsight,
  type InsightSummary,
  type InsightHistoryEvent,
  InsightStatus,
  GoalAlignment,
} from './project-types.js';
import type { ProjectStore } from './project-store.js';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CreateInsightParams {
  readonly projectId: string;
  readonly text: string;
  readonly sessionId?: string;
}

export interface EvaluateInsightParams {
  readonly projectId: string;
  readonly insightId: string;
  readonly relevance: number;
  readonly feasibility: number;
  readonly goalAlignment: GoalAlignment;
  readonly rationale: string;
}

export interface DecideInsightParams {
  readonly projectId: string;
  readonly insightId: string;
  readonly decision: 'IMPLEMENT_NOW' | 'DEFER' | 'REJECT';
  readonly revisitCondition?: string;
}

export interface UpdateInsightStatusParams {
  readonly projectId: string;
  readonly insightId: string;
  readonly newStatus: InsightStatus;
  readonly detail?: string;
}

// ═══════════════════════════════════════════════════════════════════
// VALID TRANSITIONS
// ═══════════════════════════════════════════════════════════════════

const VALID_TRANSITIONS: Readonly<Record<string, readonly InsightStatus[]>> = {
  [InsightStatus.NEW]: [InsightStatus.EVALUATING, InsightStatus.REJECTED, InsightStatus.INVALIDATED],
  [InsightStatus.EVALUATING]: [InsightStatus.ACTIVE, InsightStatus.REJECTED, InsightStatus.INVALIDATED],
  [InsightStatus.ACTIVE]: [InsightStatus.DEFERRED, InsightStatus.REJECTED, InsightStatus.TESTING, InsightStatus.INVALIDATED],
  [InsightStatus.DEFERRED]: [InsightStatus.REVISITABLE, InsightStatus.ACTIVE, InsightStatus.REJECTED, InsightStatus.INVALIDATED],
  [InsightStatus.REJECTED]: [InsightStatus.REVISITABLE, InsightStatus.INVALIDATED],
  [InsightStatus.TESTING]: [InsightStatus.VALIDATED, InsightStatus.INVALIDATED],
  [InsightStatus.VALIDATED]: [InsightStatus.IMPLEMENTED, InsightStatus.INVALIDATED],
  [InsightStatus.IMPLEMENTED]: [InsightStatus.INVALIDATED],
  [InsightStatus.INVALIDATED]: [],
  [InsightStatus.REVISITABLE]: [InsightStatus.ACTIVE, InsightStatus.REJECTED, InsightStatus.INVALIDATED],
};

// ═══════════════════════════════════════════════════════════════════
// CONTEXT SNAPSHOT
// ═══════════════════════════════════════════════════════════════════

function buildContextSnapshot(store: ProjectStore, projectId: string): Record<string, unknown> {
  const project = store.findById(projectId);
  if (!project) return {};
  return {
    sessionCount: project.sessions.length,
    insightCount: project.insights.length,
    updatedAt: project.updatedAt,
  };
}

function hasContextChanged(snapshot: Record<string, unknown>, current: Record<string, unknown>): boolean {
  const k1 = Object.keys(snapshot).sort();
  const k2 = Object.keys(current).sort();
  if (k1.join(',') !== k2.join(',')) return true;
  for (const key of k1) {
    if (JSON.stringify(snapshot[key]) !== JSON.stringify(current[key])) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// INSIGHT SERVICE
// ═══════════════════════════════════════════════════════════════════

export class InsightService {
  constructor(private readonly store: ProjectStore) {}

  /** Create a new insight. Text is sanitized for secrets. */
  createInsight(params: CreateInsightParams): PersistedInsight {
    const text = sanitizeSecrets(params.text.trim()).substring(0, 5000);
    if (text.length === 0) throw new Error('Insight text must not be empty');

    const now = new Date().toISOString();
    const historyEvent: InsightHistoryEvent = {
      timestamp: now,
      action: 'CREATED',
    };

    const insight: PersistedInsight = {
      id: randomUUID(),
      projectId: params.projectId,
      sessionId: params.sessionId,
      text,
      createdAt: now,
      status: InsightStatus.NEW,
      contextSnapshot: buildContextSnapshot(this.store, params.projectId),
      history: [historyEvent],
    };

    this.store.addInsight(params.projectId, insight);
    return insight;
  }

  /** Evaluate an insight (relevance, feasibility, goal alignment). */
  evaluateInsight(params: EvaluateInsightParams): PersistedInsight {
    const insight = this.store.getInsight(params.projectId, params.insightId);
    if (!insight) throw new Error('Insight not found');
    this.validateTransition(insight.status, InsightStatus.EVALUATING);

    const now = new Date().toISOString();
    const newHistory: InsightHistoryEvent = {
      timestamp: now,
      action: 'EVALUATED',
      detail: `relevance=${params.relevance} feasibility=${params.feasibility} alignment=${params.goalAlignment}`,
    };

    const updated: PersistedInsight = {
      ...insight,
      status: InsightStatus.EVALUATING,
      relevance: params.relevance,
      feasibility: params.feasibility,
      goalAlignment: params.goalAlignment,
      rationale: sanitizeSecrets(params.rationale.substring(0, 2000)),
      history: [...insight.history, newHistory],
    };

    this.store.updateInsight(params.projectId, params.insightId, updated);
    return updated;
  }

  /** User decides on an insight. */
  decideInsight(params: DecideInsightParams): PersistedInsight {
    const insight = this.store.getInsight(params.projectId, params.insightId);
    if (!insight) throw new Error('Insight not found');

    let targetStatus: InsightStatus;
    switch (params.decision) {
      case 'IMPLEMENT_NOW': targetStatus = InsightStatus.ACTIVE; break;
      case 'DEFER': targetStatus = InsightStatus.DEFERRED; break;
      case 'REJECT': targetStatus = InsightStatus.REJECTED; break;
    }
    this.validateTransition(insight.status, targetStatus);

    const now = new Date().toISOString();
    const newHistory: InsightHistoryEvent = {
      timestamp: now,
      action: `USER_DECIDED: ${params.decision}`,
      detail: params.revisitCondition,
    };

    const updated: PersistedInsight = {
      ...insight,
      status: targetStatus,
      userDecision: params.decision,
      decisionAt: now,
      revisitCondition: params.revisitCondition ? sanitizeSecrets(params.revisitCondition.substring(0, 1000)) : undefined,
      history: [...insight.history, newHistory],
    };

    this.store.updateInsight(params.projectId, params.insightId, updated);
    return updated;
  }

  /** Generic status transition (for TESTING, VALIDATED, IMPLEMENTED, etc.). */
  updateStatus(params: UpdateInsightStatusParams): PersistedInsight {
    const insight = this.store.getInsight(params.projectId, params.insightId);
    if (!insight) throw new Error('Insight not found');
    this.validateTransition(insight.status, params.newStatus);

    const now = new Date().toISOString();
    const newHistory: InsightHistoryEvent = {
      timestamp: now,
      action: `STATUS_CHANGE: ${insight.status} -> ${params.newStatus}`,
      detail: params.detail,
    };

    const updated: PersistedInsight = {
      ...insight,
      status: params.newStatus,
      history: [...insight.history, newHistory],
    };

    this.store.updateInsight(params.projectId, params.insightId, updated);
    return updated;
  }

  /** Check for revisitable insights (context changed since deferral). */
  checkRevisitability(projectId: string): PersistedInsight[] {
    const project = this.store.findById(projectId);
    if (!project) return [];
    const currentSnapshot = buildContextSnapshot(this.store, projectId);
    const revisitable: PersistedInsight[] = [];

    for (const insight of project.insights) {
      if (insight.status !== InsightStatus.DEFERRED && insight.status !== InsightStatus.REJECTED) continue;
      if (!insight.contextSnapshot) continue;
      if (hasContextChanged(insight.contextSnapshot, currentSnapshot)) {
        const now = new Date().toISOString();
        const event: InsightHistoryEvent = {
          timestamp: now,
          action: 'CONTEXT_CHANGED -> REVISITABLE',
          detail: 'Project context changed since this insight was deferred/rejected',
        };
        const updated: PersistedInsight = {
          ...insight,
          status: InsightStatus.REVISITABLE,
          history: [...insight.history, event],
        };
        this.store.updateInsight(projectId, insight.id, updated);
        revisitable.push(updated);
      }
    }

    return revisitable;
  }

  /** Get insight by ID. */
  getInsight(projectId: string, insightId: string): PersistedInsight | undefined {
    return this.store.getInsight(projectId, insightId);
  }

  /** List insights for a project (newest first). */
  listInsights(projectId: string): InsightSummary[] {
    const insights = this.store.getInsights(projectId);
    return insights.map(i => ({
      id: i.id,
      text: i.text,
      status: i.status,
      createdAt: i.createdAt,
      userDecision: i.userDecision,
    }));
  }

  /** Get revisitable insights for a project. */
  getRevisitable(projectId: string): InsightSummary[] {
    const insights = this.store.getRevisitableInsights(projectId);
    return insights.map(i => ({
      id: i.id,
      text: i.text,
      status: i.status,
      createdAt: i.createdAt,
      userDecision: i.userDecision,
    }));
  }

  /** Get insight counts by status for dashboard. */
  getInsightCounts(projectId: string): Record<string, number> {
 const project = this.store.findById(projectId);
    if (!project) return {};
    const counts: Record<string, number> = {};
    for (const insight of project.insights) {
      counts[insight.status] = (counts[insight.status] ?? 0) + 1;
    }
    return counts;
  }

  /** Goal Discovery: return active/new insights as potential directions (not forcing). */
  getGoalSuggestions(projectId: string): InsightSummary[] {
    const project = this.store.findById(projectId);
    if (!project) return [];
    return project.insights
      .filter(i => i.status === InsightStatus.ACTIVE || i.status === InsightStatus.NEW)
      .map(i => ({
        id: i.id,
        text: i.text,
        status: i.status,
        createdAt: i.createdAt,
        userDecision: i.userDecision,
      }));
  }

  private validateTransition(from: InsightStatus, to: InsightStatus): void {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new Error(`Invalid insight transition: ${from} -> ${to}`);
    }
  }
}
