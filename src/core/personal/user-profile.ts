/**
 * Personal Intelligence Runtime — User Profile Subsystem
 *
 * Orchestrates identity, knowledge, workflow, desktop, and experience
 * contracts to build a unified PersonalContext snapshot.
 */
import type { PersonalContext, CurrentActivity } from './types.js';
import type { PersonalRuntimeContracts as Contracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';

export class UserProfileRuntime {
  private contracts: Contracts;
  private currentContext: PersonalContext | null = null;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  async buildProfile(): Promise<PersonalContext> {
    const userId = this.contracts.identity.getCurrentUserId() ?? 'anonymous';
    const roles = this.contracts.identity.getUserRoles(userId);
    const preferences = this.contracts.identity.getUserPreferences(userId);

    // ── Skills & interests from recent knowledge items ──────────
    const skills: string[] = [];
    const interests: string[] = [];
    try {
      const recentItems = await this.contracts.knowledge.getRecentItems(20);
      for (const item of recentItems) {
        if (typeof item !== 'object' || item === null) continue;
        const record = item as Record<string, unknown>;
        const label =
          typeof record.name === 'string' ? record.name :
          typeof record.title === 'string' ? record.title :
          null;
        if (!label) continue;
        if (typeof record.type === 'string' && record.type === 'skill') {
          skills.push(label);
        } else {
          interests.push(label);
        }
      }
    } catch {
      // Knowledge contract may be unavailable; use empty defaults
    }

    // ── Current activity from running workflows / desktop ───────
    const activity = this.buildCurrentActivity();

    // ── Environment from desktop state ─────────────────────────
    const desktopState = this.contracts.desktop.getDesktopState();
    const environment = desktopState ? 'office' : null;

    // ── Focus from roles or preferences ────────────────────────
    const focus = roles.length > 0 ? roles[0] : null;

    // ── Assemble context ───────────────────────────────────────
    const now = new Date().toISOString();
    const context: PersonalContext = Object.freeze({
      userId,
      focus,
      skills: Object.freeze([...skills]),
      goals: Object.freeze([]),
      interests: Object.freeze([...interests]),
      activity: Object.freeze(activity),
      environment,
      preferences: Object.freeze({ ...preferences }),
      updatedAt: now,
    });

    this.currentContext = context;

    // ── Publish ProfileUpdated event ───────────────────────────
    const base = createPersonalEventBase('ProfileUpdated', EventClassification.StateChange, userId);
    await this.contracts.platform.publishEvent('ProfileUpdated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        userId,
        changedAttributes: Object.freeze([
          'focus', 'skills', 'interests', 'activity', 'environment', 'preferences',
        ] as const),
        updatedAt: now,
      },
    });

    return context;
  }

  getContext(): PersonalContext | null {
    return this.currentContext;
  }

  async refreshContext(): Promise<PersonalContext> {
    return this.buildProfile();
  }

  getSummary(): string {
    if (!this.currentContext) return 'No profile loaded';
    const c = this.currentContext;
    const parts: string[] = [`User: ${c.userId}`];
    if (c.focus) parts.push(`Focus: ${c.focus}`);
    if (c.skills.length > 0) parts.push(`Skills: ${c.skills.join(', ')}`);
    if (c.interests.length > 0) parts.push(`Interests: ${c.interests.join(', ')}`);
    parts.push(`Activity: ${c.activity.type} \u2014 ${c.activity.description}`);
    if (c.environment) parts.push(`Environment: ${c.environment}`);
    if (c.goals.length > 0) parts.push(`Active Goals: ${c.goals.length}`);
    return parts.join('\n');
  }

  // ── Private helpers ──────────────────────────────────────────

  private buildCurrentActivity(): CurrentActivity {
    const now = new Date().toISOString();
    const runningInstances = this.contracts.workflow.getRunningInstances();
    const activeWindow = this.contracts.desktop.getActiveWindow();

    if (runningInstances.length > 0) {
      const instance = runningInstances[0] as Record<string, unknown>;
      const name =
        typeof instance.name === 'string' ? instance.name :
        typeof instance.title === 'string' ? instance.title :
        'Unknown workflow';
      return Object.freeze({
        type: 'working',
        description: `Executing: ${name}`,
        startedAt: now,
        relatedGoalId: typeof instance.goalId === 'string' ? instance.goalId : null,
        relatedWorkflowId: typeof instance.id === 'string' ? instance.id : null,
      });
    }

    if (activeWindow) {
      return Object.freeze({
        type: 'working',
        description: `Active window: ${activeWindow}`,
        startedAt: now,
        relatedGoalId: null,
        relatedWorkflowId: null,
      });
    }

    return Object.freeze({
      type: 'idle',
      description: 'No active activity detected',
      startedAt: now,
      relatedGoalId: null,
      relatedWorkflowId: null,
    });
  }
}
