/**
 * Personal Intelligence Pack — Goal Planner
 * TASK-AIS-007A.000
 *
 * Manages the Vision → Goals → Projects → Milestones → Tasks → Actions
 * hierarchy. Creates, updates, and tracks goal progress.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { PackGoal, PackGoalId, GoalCreateInput, GoalLevel, GoalStatus } from './types.js';
import { GoalStatus as GS } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { GoalNotFoundError, GoalValidationError, GoalHierarchyError } from './errors.js';

export class GoalPlanner {
  private contracts: PersonalIntelligenceContracts;
  private goals = new Map<string, PackGoal>();
  private readonly maxGoals: number;

  constructor(contracts: PersonalIntelligenceContracts, maxGoals = 500) {
    this.contracts = contracts;
    this.maxGoals = maxGoals;
  }

  createGoal(input: GoalCreateInput): PackGoal {
    this.validateInput(input);
    if (input.parentId && this.wouldCreateCycle(input.parentId, null)) {
      throw new GoalHierarchyError('new', input.parentId as unknown as string);
    }
    if (this.goals.size >= this.maxGoals) {
      throw new GoalValidationError(['Maximum goal count reached']);
    }

    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackGoalId;
    const parentId = input.parentId ?? null;

    const goal: PackGoal = Object.freeze({
      id, title: input.title.trim(),
      description: input.description?.trim() ?? '',
      level: input.level, status: GS.Draft,
      parentId, childrenIds: Object.freeze([]),
      priority: input.priority ?? 0, progress: 0,
      deadline: input.deadline ?? null,
      tags: Object.freeze(input.tags ?? []),
      constraintIds: Object.freeze([]),
      createdAt: now, updatedAt: now, completedAt: null,
    });

    this.goals.set(id as unknown as string, goal);
    this.updateParentChildren(parentId, id);

    const base = createPackEventBase('PackGoalCreated', EventClassification.StateChange, id as unknown as string);
    void this.contracts.platform.publishEvent('PackGoalCreated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { goalId: id, title: goal.title, level: input.level, parentId, createdAt: now },
    });

    return goal;
  }

  updateGoal(id: string, updates: Partial<Pick<GoalCreateInput, 'title' | 'description' | 'priority' | 'deadline' | 'tags'>>): PackGoal {
    const existing = this.getGoalOrThrow(id);
    const now = new Date().toISOString() as Timestamp;
    const changed: string[] = [];

    if (updates.title !== undefined && updates.title.trim() !== existing.title) { changed.push('title'); }
    if (updates.description !== undefined) { changed.push('description'); }
    if (updates.priority !== undefined) { changed.push('priority'); }
    if (updates.deadline !== undefined) { changed.push('deadline'); }
    if (updates.tags !== undefined) { changed.push('tags'); }

    const updated: PackGoal = Object.freeze({
      ...existing,
      title: updates.title?.trim() ?? existing.title,
      description: updates.description?.trim() ?? existing.description,
      priority: updates.priority ?? existing.priority,
      deadline: updates.deadline !== undefined ? updates.deadline : existing.deadline,
      tags: updates.tags ? Object.freeze(updates.tags) : existing.tags,
      updatedAt: now,
    });

    this.goals.set(id, updated);

    const base = createPackEventBase('PackGoalUpdated', EventClassification.StateChange, id);
    void this.contracts.platform.publishEvent('PackGoalUpdated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { goalId: id, changedAttributes: changed, updatedAt: now },
    });

    return updated;
  }

  setStatus(id: string, newStatus: GoalStatus): PackGoal {
    const existing = this.getGoalOrThrow(id);
    this.validateTransition(existing.status, newStatus);
    const now = new Date().toISOString() as Timestamp;
    const completedAt = newStatus === GS.Completed ? now : existing.completedAt;
    const progress = newStatus === GS.Completed ? 100 : existing.progress;

    const updated: PackGoal = Object.freeze({
      ...existing, status: newStatus, completedAt, progress, updatedAt: now,
    });

    this.goals.set(id, updated);

    if (newStatus === GS.Completed) {
      const base = createPackEventBase('PackGoalCompleted', EventClassification.Result, id);
      void this.contracts.platform.publishEvent('PackGoalCompleted', {
        ...base, sequence: 0, version: '1.0.0',
        payload: { goalId: id, title: updated.title, completedAt: now },
      });
    } else {
      const base = createPackEventBase('PackGoalStatusChanged', EventClassification.StateChange, id);
      void this.contracts.platform.publishEvent('PackGoalStatusChanged', {
        ...base, sequence: 0, version: '1.0.0',
        payload: { goalId: id, oldStatus: existing.status, newStatus, changedAt: now },
      });
    }

    return updated;
  }

  getGoal(id: string): PackGoal { return this.getGoalOrThrow(id); }

  getGoalsByLevel(level: GoalLevel): readonly PackGoal[] {
    return Object.freeze(Array.from(this.goals.values()).filter(g => g.level === level));
  }

  getGoalsByStatus(status: GoalStatus): readonly PackGoal[] {
    return Object.freeze(Array.from(this.goals.values()).filter(g => g.status === status));
  }

  getChildren(parentId: string): readonly PackGoal[] {
    const parent = this.getGoalOrThrow(parentId);
    return Object.freeze(
      parent.childrenIds.map(cid => this.goals.get(cid as unknown as string)).filter((g): g is PackGoal => g !== undefined),
    );
  }

  getRootGoals(): readonly PackGoal[] {
    return Object.freeze(Array.from(this.goals.values()).filter(g => g.parentId === null));
  }

  getGoalHierarchy(goalId: string): readonly PackGoal[] {
    const result: PackGoal[] = [];
    let current: PackGoal | null = this.getGoalOrThrow(goalId);
    while (current) {
      result.push(current);
      current = current.parentId ? this.goals.get(current.parentId as unknown as string) ?? null : null;
    }
    return Object.freeze(result.reverse());
  }

  getDescendants(goalId: string): readonly PackGoal[] {
    const result: PackGoal[] = [];
    const goal = this.getGoalOrThrow(goalId);
    for (const childId of goal.childrenIds) {
      const child = this.goals.get(childId as unknown as string);
      if (child) {
        result.push(child);
        const descendants = this.getDescendants(childId as unknown as string);
        for (const d of descendants) result.push(d);
      }
    }
    return Object.freeze(result);
  }

  getAllGoals(): readonly PackGoal[] { return Object.freeze(Array.from(this.goals.values())); }
  getGoalCount(): number { return this.goals.size; }

  dispose(): void { this.goals.clear(); }

  // ── Private helpers ──────────────────────────────────────

  private getGoalOrThrow(id: string): PackGoal {
    const g = this.goals.get(id);
    if (!g) throw new GoalNotFoundError(id);
    return g;
  }

  private validateInput(input: GoalCreateInput): void {
    const violations: string[] = [];
    if (!input.title?.trim()) violations.push('title is required');
    if (violations.length > 0) throw new GoalValidationError(violations);
  }

  private validateTransition(from: GoalStatus, to: GoalStatus): void {
    const valid: Record<string, readonly GoalStatus[]> = {
      [GS.Draft]: Object.freeze([GS.Active, GS.Cancelled]),
      [GS.Active]: Object.freeze([GS.InProgress, GS.Paused, GS.Cancelled, GS.Completed]),
      [GS.InProgress]: Object.freeze([GS.Active, GS.Paused, GS.Completed, GS.Cancelled]),
      [GS.Paused]: Object.freeze([GS.Active, GS.Cancelled]),
      [GS.Completed]: Object.freeze([]),
      [GS.Cancelled]: Object.freeze([]),
    };
    const allowed = valid[from];
    if (!allowed || !allowed.includes(to)) {
      throw new GoalValidationError([`Invalid transition: ${from} -> ${to}`]);
    }
  }

  private wouldCreateCycle(parentId: PackGoalId, childId: PackGoalId | null): boolean {
    const visited = new Set<string>();
    let current: PackGoal | undefined = this.goals.get(parentId as unknown as string);
    while (current) {
      const key = current.id as unknown as string;
      if (childId && key === childId as unknown as string) return true;
      if (visited.has(key)) return true;
      visited.add(key);
      current = current.parentId ? this.goals.get(current.parentId as unknown as string) : undefined;
    }
    return false;
  }

  private updateParentChildren(parentId: PackGoalId | null, childId: PackGoalId): void {
    if (!parentId) return;
    const parent = this.goals.get(parentId as unknown as string);
    if (!parent) return;
    const updatedChildren = [...parent.childrenIds, childId];
    const now = new Date().toISOString() as Timestamp;
    const updated: PackGoal = Object.freeze({
      ...parent, childrenIds: Object.freeze(updatedChildren), updatedAt: now,
    });
    this.goals.set(parentId as unknown as string, updated);
  }
}
