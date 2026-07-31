/**
 * Personal Intelligence Runtime — Goal Subsystem
 *
 * Manages the full lifecycle of goals with a Vision → Strategy → Goal →
 * Objective → Task hierarchy.  Owns all goal data; other subsystems
 * reference goals through GoalRef lookups.
 */
import type { Goal, GoalCreateInput, GoalRef } from './types.js';
import { GoalStatus, GoalLevel } from './types.js';
import type { PersonalRuntimeContracts as Contracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { GoalNotFoundError, GoalValidationError, GoalHierarchyError } from './errors.js';

// ── Valid status transitions ───────────────────────────────────

const VALID_TRANSITIONS: ReadonlyMap<GoalStatus, ReadonlySet<GoalStatus>> = new Map<GoalStatus, ReadonlySet<GoalStatus>>([
  [GoalStatus.Draft, new Set<GoalStatus>([GoalStatus.Active, GoalStatus.Cancelled])],
  [GoalStatus.Active, new Set<GoalStatus>([GoalStatus.Paused, GoalStatus.Completed, GoalStatus.Archived, GoalStatus.Cancelled])],
  [GoalStatus.Paused, new Set<GoalStatus>([GoalStatus.Active, GoalStatus.Archived, GoalStatus.Cancelled])],
  [GoalStatus.Completed, new Set<GoalStatus>([GoalStatus.Archived])],
  [GoalStatus.Archived, new Set<GoalStatus>([GoalStatus.Active])],
  [GoalStatus.Cancelled, new Set<GoalStatus>([GoalStatus.Draft])],
]);

/** Ordered from highest to lowest in the hierarchy. */
const LEVEL_ORDER: readonly GoalLevel[] = Object.freeze([
  GoalLevel.Vision,
  GoalLevel.Strategy,
  GoalLevel.Goal,
  GoalLevel.Objective,
  GoalLevel.Task,
]);

// ── Goal update input ──────────────────────────────────────────

interface GoalUpdateInput {
  readonly title?: string;
  readonly description?: string;
  readonly level?: GoalLevel;
  readonly priority?: number;
  readonly deadline?: string | null;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly parentId?: string | null;
}

export class GoalRuntime {
  private contracts: Contracts;
  private goals = new Map<string, Goal>();
  private readonly maxGoals: number;

  constructor(contracts: Contracts, maxGoals = 1000) {
    this.contracts = contracts;
    this.maxGoals = maxGoals;
  }

  // ── Create ───────────────────────────────────────────────────

  createGoal(input: GoalCreateInput): Goal {
    const violations: string[] = [];
    if (!input.title.trim()) {
      violations.push('title must be non-empty');
    }
    if (violations.length > 0) {
      throw new GoalValidationError(violations);
    }
    if (this.goals.size >= this.maxGoals) {
      throw new GoalValidationError(['Maximum goal count reached']);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const parentId = input.parentId ?? null;

    // Validate parent existence and hierarchy
    if (parentId !== null) {
      if (!this.goals.has(parentId)) {
        throw new GoalNotFoundError(parentId);
      }
      this.validateHierarchy(id, parentId);
    }

    const goal: Goal = Object.freeze({
      id,
      title: input.title.trim(),
      description: input.description ?? '',
      level: input.level,
      status: GoalStatus.Draft,
      parentId,
      childrenIds: Object.freeze([]),
      priority: input.priority ?? 0,
      progress: 0,
      deadline: input.deadline ?? null,
      tags: Object.freeze(input.tags ? [...input.tags] : []),
      metadata: Object.freeze(input.metadata ? { ...input.metadata } : {}),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });

    this.goals.set(id, goal);

    // Add this goal to parent's childrenIds
    if (parentId !== null) {
      this.appendChild(parentId, id, now);
    }

    // Emit GoalCreated
    const base = createPersonalEventBase('GoalCreated', EventClassification.StateChange, id);
    void this.contracts.platform.publishEvent('GoalCreated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        goalId: id,
        title: goal.title,
        level: goal.level,
        parentId: goal.parentId,
        createdAt: now,
      },
    });

    return goal;
  }

  // ── Status transitions ───────────────────────────────────────

  activateGoal(id: string): Goal {
    return this.transitionStatus(id, GoalStatus.Active);
  }

  pauseGoal(id: string): Goal {
    return this.transitionStatus(id, GoalStatus.Paused);
  }

  resumeGoal(id: string): Goal {
    return this.transitionStatus(id, GoalStatus.Active);
  }

  completeGoal(id: string): Goal {
    const goal = this.transitionStatus(id, GoalStatus.Completed);
    // Recalculate parent progress upwards
    if (goal.parentId !== null) {
      this.updateParentProgress(goal.parentId);
    }
    return goal;
  }

  archiveGoal(id: string): Goal {
    return this.transitionStatus(id, GoalStatus.Archived);
  }

  cancelGoal(id: string): Goal {
    return this.transitionStatus(id, GoalStatus.Cancelled);
  }

  // ── Update ───────────────────────────────────────────────────

  updateGoal(id: string, updates: GoalUpdateInput): Goal {
    const existing = this.goals.get(id);
    if (!existing) {
      throw new GoalNotFoundError(id);
    }

    // Title validation
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new GoalValidationError(['title must be non-empty']);
    }

    const now = new Date().toISOString();

    // Handle parent change
    let newParentId = existing.parentId;
    if (updates.parentId !== undefined && updates.parentId !== existing.parentId) {
      newParentId = updates.parentId;
      // Remove from old parent
      if (existing.parentId !== null) {
        this.removeChild(existing.parentId, id, now);
      }
      // Validate and add to new parent
      if (newParentId !== null) {
        if (!this.goals.has(newParentId)) {
          // Revert: re-add to old parent
          if (existing.parentId !== null) {
            this.appendChild(existing.parentId, id, now);
          }
          throw new GoalNotFoundError(newParentId);
        }
        this.validateHierarchy(id, newParentId);
        this.appendChild(newParentId, id, now);
      }
    }

    // Validate level transition consistency
    if (updates.level !== undefined && updates.level !== existing.level) {
      const newLevelIdx = LEVEL_ORDER.indexOf(updates.level);
      // Children must be at a strictly lower level
      for (const childId of existing.childrenIds) {
        const child = this.goals.get(childId);
        if (child && LEVEL_ORDER.indexOf(child.level) <= newLevelIdx) {
          throw new GoalValidationError([
            `Cannot set level to ${updates.level}: child "${child.id}" has level ${child.level}`,
          ]);
        }
      }
      // Parent must be at a strictly higher level
      if (newParentId !== null) {
        const parent = this.goals.get(newParentId);
        if (parent && LEVEL_ORDER.indexOf(parent.level) >= newLevelIdx) {
          throw new GoalValidationError([
            `Cannot set level to ${updates.level}: parent "${parent.id}" has level ${parent.level}`,
          ]);
        }
      }
    }

    const updated: Goal = Object.freeze({
      ...existing,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
      description: updates.description !== undefined ? updates.description : existing.description,
      level: updates.level !== undefined ? updates.level : existing.level,
      priority: updates.priority !== undefined ? updates.priority : existing.priority,
      deadline: updates.deadline !== undefined ? updates.deadline : existing.deadline,
      tags: updates.tags !== undefined ? Object.freeze([...updates.tags]) : existing.tags,
      metadata: updates.metadata !== undefined ? Object.freeze({ ...updates.metadata }) : existing.metadata,
      parentId: newParentId,
      updatedAt: now,
    });

    this.goals.set(id, updated);

    // Emit GoalUpdated
    const changedAttributes = this.collectChangedAttributes(existing, updates);
    const base = createPersonalEventBase('GoalUpdated', EventClassification.StateChange, id);
    void this.contracts.platform.publishEvent('GoalUpdated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        goalId: id,
        changedAttributes: Object.freeze(changedAttributes),
        updatedAt: now,
      },
    });

    return updated;
  }

  // ── Queries ──────────────────────────────────────────────────

  getGoal(id: string): Goal {
    const goal = this.goals.get(id);
    if (!goal) {
      throw new GoalNotFoundError(id);
    }
    return goal;
  }

  getGoalsByStatus(status: GoalStatus): readonly Goal[] {
    return Object.freeze(
      Array.from(this.goals.values()).filter(g => g.status === status),
    );
  }

  getGoalsByLevel(level: GoalLevel): readonly Goal[] {
    return Object.freeze(
      Array.from(this.goals.values()).filter(g => g.level === level),
    );
  }

  getChildren(parentId: string): readonly Goal[] {
    const parent = this.goals.get(parentId);
    if (!parent) {
      throw new GoalNotFoundError(parentId);
    }
    return Object.freeze(
      parent.childrenIds
        .map(cid => this.goals.get(cid))
        .filter((g): g is Goal => g !== undefined),
    );
  }

  getRootGoals(): readonly Goal[] {
    return Object.freeze(
      Array.from(this.goals.values()).filter(g => g.parentId === null),
    );
  }

  getPath(goalId: string): readonly Goal[] {
    const path: Goal[] = [];
    let currentId: string | null = goalId;
    const visited = new Set<string>();
    while (currentId !== null) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const goal = this.goals.get(currentId);
      if (!goal) break;
      path.unshift(goal);
      currentId = goal.parentId;
    }
    return Object.freeze(path);
  }

  getActiveGoals(): readonly Goal[] {
    return this.getGoalsByStatus(GoalStatus.Active);
  }

  getAllGoals(): readonly Goal[] {
    return Object.freeze(Array.from(this.goals.values()));
  }

  getGoalCount(): number {
    return this.goals.size;
  }

  getGoalRefs(): readonly GoalRef[] {
    return Object.freeze(
      Array.from(this.goals.values())
        .filter(g => g.status === GoalStatus.Active)
        .map(g => ({
          id: g.id,
          title: g.title,
          status: g.status,
          progress: g.progress,
          deadline: g.deadline,
        })),
    );
  }

  // ── Private helpers ──────────────────────────────────────────

  private transitionStatus(id: string, newStatus: GoalStatus): Goal {
    const goal = this.goals.get(id);
    if (!goal) {
      throw new GoalNotFoundError(id);
    }

    this.validateTransition(goal.status, newStatus);

    const now = new Date().toISOString();
    const isCompleting = newStatus === GoalStatus.Completed;
    const updated: Goal = Object.freeze({
      ...goal,
      status: newStatus,
      progress: isCompleting ? 100 : goal.progress,
      completedAt: isCompleting ? now : goal.completedAt,
      updatedAt: now,
    });

    this.goals.set(id, updated);

    // Emit GoalStatusChanged
    const statusBase = createPersonalEventBase('GoalStatusChanged', EventClassification.StateChange, id);
    void this.contracts.platform.publishEvent('GoalStatusChanged', {
      ...statusBase,
      sequence: 0,
      version: '1.0.0',
      payload: {
        goalId: id,
        oldStatus: goal.status,
        newStatus,
        changedAt: now,
      },
    });

    if (isCompleting) {
      const completedBase = createPersonalEventBase('GoalCompleted', EventClassification.Result, id);
      void this.contracts.platform.publishEvent('GoalCompleted', {
        ...completedBase,
        sequence: 0,
        version: '1.0.0',
        payload: {
          goalId: id,
          title: goal.title,
          completedAt: now,
        },
      });
    }

    if (newStatus === GoalStatus.Archived) {
      const archivedBase = createPersonalEventBase('GoalArchived', EventClassification.StateChange, id);
      void this.contracts.platform.publishEvent('GoalArchived', {
        ...archivedBase,
        sequence: 0,
        version: '1.0.0',
        payload: {
          goalId: id,
          archivedAt: now,
        },
      });
    }

    return updated;
  }

  private validateTransition(current: GoalStatus, next: GoalStatus): void {
    const allowed = VALID_TRANSITIONS.get(current);
    if (!allowed || !allowed.has(next)) {
      throw new GoalValidationError([
        `Invalid status transition from ${current} to ${next}`,
      ]);
    }
  }

  private validateHierarchy(goalId: string, newParentId: string): void {
 let currentId: string | null = newParentId;
    const visited = new Set<string>();
    while (currentId !== null) {
      if (currentId === goalId) {
        throw new GoalHierarchyError(goalId, newParentId);
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const ancestor = this.goals.get(currentId);
      if (!ancestor) break;
      currentId = ancestor.parentId;
    }
  }

  private updateParentProgress(parentId: string): void {
    const parent = this.goals.get(parentId);
    if (!parent) return;

    const children = parent.childrenIds
      .map(cid => this.goals.get(cid))
      .filter((g): g is Goal => g !== undefined);

    if (children.length === 0) return;

    const totalProgress = children.reduce((sum, child) => sum + child.progress, 0);
    const avgProgress = Math.round(totalProgress / children.length);

    const now = new Date().toISOString();
    const updated: Goal = Object.freeze({
      ...parent,
      progress: avgProgress,
      updatedAt: now,
    });

    this.goals.set(parentId, updated);

    // Propagate upwards
    if (parent.parentId !== null) {
      this.updateParentProgress(parent.parentId);
    }
  }

  private appendChild(parentId: string, childId: string, now: string): void {
    const parent = this.goals.get(parentId);
    if (!parent) return;
    const updated: Goal = Object.freeze({
      ...parent,
      childrenIds: Object.freeze([...parent.childrenIds, childId]),
      updatedAt: now,
    });
    this.goals.set(parentId, updated);
  }

  private removeChild(parentId: string, childId: string, now: string): void {
    const parent = this.goals.get(parentId);
    if (!parent) return;
    const updated: Goal = Object.freeze({
      ...parent,
      childrenIds: Object.freeze(parent.childrenIds.filter(cid => cid !== childId)),
      updatedAt: now,
    });
    this.goals.set(parentId, updated);
  }

  private collectChangedAttributes(existing: Goal, updates: GoalUpdateInput): string[] {
    const attrs: string[] = [];
    if (updates.title !== undefined && updates.title !== existing.title) attrs.push('title');
    if (updates.description !== undefined && updates.description !== existing.description) attrs.push('description');
    if (updates.level !== undefined && updates.level !== existing.level) attrs.push('level');
    if (updates.priority !== undefined && updates.priority !== existing.priority) attrs.push('priority');
    if (updates.deadline !== undefined && updates.deadline !== existing.deadline) attrs.push('deadline');
    if (updates.tags !== undefined) attrs.push('tags');
    if (updates.metadata !== undefined) attrs.push('metadata');
    if (updates.parentId !== undefined && updates.parentId !== existing.parentId) attrs.push('parentId');
    return attrs;
  }
}
