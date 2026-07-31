/**
 * Personal Intelligence Runtime — Assistant Subsystem
 *
 * Manages the personal assistant's active state, integrating
 * context from other subsystems.  Owns the AssistantState snapshot.
 */
import type { AssistantState, PersonalContext, GoalRef } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { AssistantError } from './errors.js';

// ── Config ──────────────────────────────────────────────────────

export interface AssistantRuntimeConfig {
  readonly maxSummaryLength?: number;
}

// ── State update input ──────────────────────────────────────────

interface StateUpdate {
  readonly currentActivity?: string | null;
  readonly yesterdaySummary?: string | null;
  readonly todayPlan?: string | null;
  readonly nextSuggestedAction?: string | null;
  readonly context?: PersonalContext | null;
}

export class AssistantRuntime {
  private contracts: PersonalRuntimeContracts;
  private state: AssistantState | null = null;
  private readonly maxSummaryLength: number;

  constructor(contracts: PersonalRuntimeContracts, config?: AssistantRuntimeConfig) {
    this.contracts = contracts;
    this.maxSummaryLength = config?.maxSummaryLength ?? 2000;
  }

  // ── Activate ──────────────────────────────────────────────────

  activate(userId?: string): AssistantState {
    const resolvedUserId = userId ?? this.contracts.identity.getCurrentUserId();
    if (!resolvedUserId) {
      throw new AssistantError('Cannot activate assistant without a user identity');
    }

    const wasActive = this.state?.active ?? false;
    const now = new Date().toISOString();

    this.state = Object.freeze({
      active: true,
      userId: resolvedUserId,
      currentActivity: this.state?.currentActivity ?? null,
      yesterdaySummary: this.state?.yesterdaySummary ?? null,
      todayPlan: this.state?.todayPlan ?? null,
      nextSuggestedAction: this.state?.nextSuggestedAction ?? null,
      context: this.state?.context ?? null,
      updatedAt: now,
    });

    if (!wasActive) {
      const base = createPersonalEventBase('AssistantStateChanged', EventClassification.StateChange, resolvedUserId);
      void this.contracts.platform.publishEvent('AssistantStateChanged', {
        ...base,
        sequence: 0,
        version: '1.0.0',
        payload: {
          active: true,
          userId: resolvedUserId,
          changedAt: now,
        },
      });
    }

    return this.state;
  }

  // ── Deactivate ────────────────────────────────────────────────

  deactivate(): AssistantState {
    if (!this.state) {
      throw new AssistantError('Assistant is not active');
    }

    const userId = this.state.userId;
    const now = new Date().toISOString();

    this.state = Object.freeze({
      ...this.state,
      active: false,
      updatedAt: now,
    });

    const base = createPersonalEventBase('AssistantStateChanged', EventClassification.StateChange, userId ?? 'unknown');
    void this.contracts.platform.publishEvent('AssistantStateChanged', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        active: false,
        userId,
        changedAt: now,
      },
    });

    return this.state;
  }

  // ── Update state ──────────────────────────────────────────────

  updateState(updates: StateUpdate): AssistantState {
    if (!this.state) {
      throw new AssistantError('Assistant is not initialized; call activate() first');
    }

    const now = new Date().toISOString();

    let summary = updates.yesterdaySummary !== undefined ? updates.yesterdaySummary : this.state.yesterdaySummary;
    if (summary !== null && summary.length > this.maxSummaryLength) {
      summary = summary.slice(0, this.maxSummaryLength);
    }

    this.state = Object.freeze({
      ...this.state,
      currentActivity: updates.currentActivity !== undefined ? updates.currentActivity : this.state.currentActivity,
      yesterdaySummary: summary,
      todayPlan: updates.todayPlan !== undefined ? updates.todayPlan : this.state.todayPlan,
      nextSuggestedAction: updates.nextSuggestedAction !== undefined ? updates.nextSuggestedAction : this.state.nextSuggestedAction,
      context: updates.context !== undefined ? updates.context : this.state.context,
      updatedAt: now,
    });

    return this.state;
  }

  // ── Set next action ───────────────────────────────────────────

  setNextAction(action: string): AssistantState {
    if (!this.state) {
      throw new AssistantError('Assistant is not initialized; call activate() first');
    }
    if (!action.trim()) {
      throw new AssistantError('Next action must be non-empty');
    }

    const now = new Date().toISOString();
    this.state = Object.freeze({
      ...this.state,
      nextSuggestedAction: action.trim(),
      updatedAt: now,
    });

    return this.state;
  }

  // ── Build summary from context ────────────────────────────────

  buildYesterdaySummary(goalRefs: readonly GoalRef[], completedCount: number): AssistantState {
    if (!this.state) {
      throw new AssistantError('Assistant is not initialized; call activate() first');
    }

    const parts: string[] = [];

    if (completedCount > 0) {
      parts.push(`Completed ${completedCount} goal${completedCount === 1 ? '' : 's'}.`);
    } else {
      parts.push('No goals were completed yesterday.');
    }

    const activeGoals = goalRefs.filter(g => g.status === 'Active');
    if (activeGoals.length > 0) {
      const names = activeGoals.map(g => g.title).join(', ');
      parts.push(`Active goals: ${names}.`);
    }

    const approaching = goalRefs.filter(g => {
      if (!g.deadline) return false;
      const daysLeft = (new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 3 && daysLeft > 0;
    });
    if (approaching.length > 0) {
      const names = approaching.map(g => g.title).join(', ');
      parts.push(`Approaching deadlines: ${names}.`);
    }

    const summary = parts.join(' ');
    return this.updateState({ yesterdaySummary: summary });
  }

  buildTodayPlan(goalRefs: readonly GoalRef[]): AssistantState {
    if (!this.state) {
      throw new AssistantError('Assistant is not initialized; call activate() first');
    }

    const parts: string[] = [];

    // Sort by progress ascending (least progress first) then by deadline
    const sorted = [...goalRefs].sort((a, b) => {
      if (a.deadline && b.deadline) {
        return a.deadline.localeCompare(b.deadline);
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return a.progress - b.progress;
    });

    const topGoals = sorted.slice(0, 5);
    if (topGoals.length > 0) {
      const items = topGoals.map((g, i) => {
        const deadlineNote = g.deadline ? ` (due ${new Date(g.deadline).toLocaleDateString()})` : '';
        return `${i + 1}. ${g.title} — ${g.progress}% complete${deadlineNote}`;
      });
      parts.push(`Today's focus:`);
      parts.push(...items);
    } else {
      parts.push('No active goals for today.');
    }

    const plan = parts.join('\n');
    return this.updateState({ todayPlan: plan });
  }

  // ── Queries ───────────────────────────────────────────────────

  getState(): AssistantState | null {
    return this.state;
  }

  isActive(): boolean {
    return this.state?.active ?? false;
  }

  getUserId(): string | null {
    return this.state?.userId ?? null;
  }

  getSummary(): string {
    if (!this.state || !this.state.active) {
      return 'Assistant is not active';
    }

    const s = this.state;
    const lines: string[] = [`Assistant for: ${s.userId ?? 'unknown'}`];

    if (s.currentActivity) {
      lines.push(`Activity: ${s.currentActivity}`);
    }
    if (s.nextSuggestedAction) {
      lines.push(`Next action: ${s.nextSuggestedAction}`);
    }
    if (s.yesterdaySummary) {
      lines.push(`Yesterday: ${s.yesterdaySummary}`);
    }
    if (s.todayPlan) {
      lines.push(`Today: ${s.todayPlan}`);
    }
    if (s.context) {
      lines.push(`Environment: ${s.context.environment ?? 'unknown'}`);
    }

    lines.push(`Last updated: ${s.updatedAt}`);
    return lines.join('\n');
  }
}
