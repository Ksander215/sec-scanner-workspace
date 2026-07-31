/**
 * Personal Intelligence Runtime — Planning Subsystem
 *
 * Creates and manages action plans scoped to time periods and goals.
 * Owns all plan and plan-item data.
 */
import { PlanPeriod, type Plan, type PlanItem } from './types.js';
import type { PersonalRuntimeContracts as Contracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { PlanValidationError } from './errors.js';

// ── Input types ────────────────────────────────────────────────

interface PlanItemInput {
  readonly title: string;
  readonly description?: string;
  readonly estimatedMinutes?: number;
  readonly priority?: number;
  readonly goalId?: string | null;
}

interface PlanUpdateInput {
  readonly period?: PlanPeriod;
  readonly goalId?: string | null;
}

export class PlanningRuntime {
  private contracts: Contracts;
  private plans = new Map<string, Plan>();
  private readonly maxPlans: number;

  constructor(contracts: Contracts, maxPlans = 100) {
    this.contracts = contracts;
    this.maxPlans = maxPlans;
  }

  // ── Create ───────────────────────────────────────────────────

  createPlan(
    period: PlanPeriod,
    goalId?: string,
    items?: readonly PlanItemInput[],
  ): Plan {
    if (this.plans.size >= this.maxPlans) {
      throw new PlanValidationError(['Maximum plan count reached']);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const planItems = this.buildPlanItems(items ?? [], goalId ?? null);

    const plan: Plan = Object.freeze({
      id,
      period,
      goalId: goalId ?? null,
      items: Object.freeze(planItems),
      createdAt: now,
      updatedAt: now,
    });

    this.plans.set(id, plan);

    // Emit PlanCreated
    const base = createPersonalEventBase('PlanCreated', EventClassification.StateChange, id);
    void this.contracts.platform.publishEvent('PlanCreated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        planId: id,
        period,
        goalId: goalId ?? null,
        itemCount: planItems.length,
        createdAt: now,
      },
    });

    return plan;
  }

  // ── Update ───────────────────────────────────────────────────

  updatePlan(planId: string, updates: PlanUpdateInput): Plan {
    const existing = this.plans.get(planId);
    if (!existing) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }

    const now = new Date().toISOString();
    const changedAttributes: string[] = [];

    const newPeriod = updates.period ?? existing.period;
    const newGoalId = updates.goalId !== undefined ? updates.goalId : existing.goalId;

    if (updates.period !== undefined && updates.period !== existing.period) {
      changedAttributes.push('period');
    }
    if (updates.goalId !== undefined && updates.goalId !== existing.goalId) {
      changedAttributes.push('goalId');
    }

    const updated: Plan = Object.freeze({
      ...existing,
      period: newPeriod,
      goalId: newGoalId,
      updatedAt: now,
    });

    this.plans.set(planId, updated);

    if (changedAttributes.length > 0) {
      const base = createPersonalEventBase('PlanUpdated', EventClassification.StateChange, planId);
      void this.contracts.platform.publishEvent('PlanUpdated', {
        ...base,
        sequence: 0,
        version: '1.0.0',
        payload: {
          planId,
          changedAttributes: Object.freeze(changedAttributes),
          updatedAt: now,
        },
      });
    }

    return updated;
  }

  // ── Item operations ──────────────────────────────────────────

  addItem(planId: string, item: PlanItemInput): Plan {
    const existing = this.plans.get(planId);
    if (!existing) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }
    if (!item.title.trim()) {
      throw new PlanValidationError(['Item title must be non-empty']);
    }

    const now = new Date().toISOString();
    const newItem: PlanItem = Object.freeze({
      id: crypto.randomUUID(),
      title: item.title.trim(),
      description: item.description ?? '',
      estimatedMinutes: item.estimatedMinutes ?? 30,
      priority: item.priority ?? 5,
      status: 'pending',
      goalId: item.goalId ?? null,
      order: existing.items.length,
    });

    const updated: Plan = Object.freeze({
      ...existing,
      items: Object.freeze([...existing.items, newItem]),
      updatedAt: now,
    });

    this.plans.set(planId, updated);
    return updated;
  }

  completeItem(planId: string, itemId: string): Plan {
    const existing = this.plans.get(planId);
    if (!existing) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }

    const itemIndex = existing.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      throw new PlanValidationError([`Item not found: ${itemId}`]);
    }

    const now = new Date().toISOString();
    const item = existing.items[itemIndex];
    const completedItem: PlanItem = Object.freeze({
      ...item,
      status: 'done',
    });

    const newItems = [...existing.items];
    newItems[itemIndex] = completedItem;

    const updated: Plan = Object.freeze({
      ...existing,
      items: Object.freeze(newItems),
      updatedAt: now,
    });

    this.plans.set(planId, updated);

    // Emit PlanItemCompleted
    const base = createPersonalEventBase('PlanItemCompleted', EventClassification.Result, planId);
    void this.contracts.platform.publishEvent('PlanItemCompleted', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        planId,
        planItemId: itemId,
        title: item.title,
        completedAt: now,
      },
    });

    return updated;
  }

  reorderItems(planId: string, itemIds: readonly string[]): Plan {
    const existing = this.plans.get(planId);
    if (!existing) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }

    const itemMap = new Map(existing.items.map(i => [i.id, i]));

    // Validate all itemIds exist in the plan
    const missing = itemIds.filter(id => !itemMap.has(id));
    if (missing.length > 0) {
      throw new PlanValidationError([
        `Items not found in plan: ${missing.join(', ')}`,
      ]);
    }

    const reordered = itemIds
      .map((id, index) => {
        const item = itemMap.get(id)!;
        return Object.freeze({ ...item, order: index });
      });

    // Keep any items not in the reorder list at the end
    const reorderedIds = new Set(itemIds);
    const remaining = existing.items
      .filter(i => !reorderedIds.has(i.id))
      .map((item, index) =>
        Object.freeze({ ...item, order: reordered.length + index }),
      );

    const now = new Date().toISOString();
    const updated: Plan = Object.freeze({
      ...existing,
      items: Object.freeze([...reordered, ...remaining]),
      updatedAt: now,
    });

    this.plans.set(planId, updated);
    return updated;
  }

  // ── Merge / Split ────────────────────────────────────────────

  mergePlans(planId1: string, planId2: string): Plan {
    const plan1 = this.plans.get(planId1);
    if (!plan1) {
      throw new PlanValidationError([`Plan not found: ${planId1}`]);
    }
    const plan2 = this.plans.get(planId2);
    if (!plan2) {
      throw new PlanValidationError([`Plan not found: ${planId2}`]);
    }

    const now = new Date().toISOString();
    const mergedItems = [...plan1.items, ...plan2.items].map((item, index) =>
      Object.freeze({ ...item, order: index }),
    );

    const updated: Plan = Object.freeze({
      ...plan1,
      items: Object.freeze(mergedItems),
      updatedAt: now,
    });

    this.plans.set(planId1, updated);
    this.plans.delete(planId2);

    return updated;
  }

  splitPlan(planId: string, itemIds: readonly string[]): { original: Plan; split: Plan } {
    const existing = this.plans.get(planId);
    if (!existing) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }

    const splitSet = new Set(itemIds);
    const splitItems = existing.items.filter(i => splitSet.has(i.id));
    const remainingItems = existing.items.filter(i => !splitSet.has(i.id));

    if (splitItems.length === 0) {
      throw new PlanValidationError(['No matching items to split']);
    }

    const now = new Date().toISOString();

    const reorderedSplit = splitItems.map((item, index) =>
      Object.freeze({ ...item, order: index }),
    );

    const reorderedRemaining = remainingItems.map((item, index) =>
      Object.freeze({ ...item, order: index }),
    );

    const splitPlan: Plan = Object.freeze({
      id: crypto.randomUUID(),
      period: existing.period,
      goalId: existing.goalId,
      items: Object.freeze(reorderedSplit),
      createdAt: now,
      updatedAt: now,
    });

    const updatedOriginal: Plan = Object.freeze({
      ...existing,
      items: Object.freeze(reorderedRemaining),
      updatedAt: now,
    });

    this.plans.set(planId, updatedOriginal);
    this.plans.set(splitPlan.id, splitPlan);

    return { original: updatedOriginal, split: splitPlan };
  }

  // ── Optimize / Re-plan ───────────────────────────────────────

  optimizePlan(planId: string): Plan {
    const existing = this.plans.get(planId);
    if (!existing) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }

    const sorted = [...existing.items].sort((a, b) => b.priority - a.priority);
    const reordered = sorted.map((item, index) =>
      Object.freeze({ ...item, order: index }),
    );

    const now = new Date().toISOString();
    const updated: Plan = Object.freeze({
      ...existing,
      items: Object.freeze(reordered),
      updatedAt: now,
    });

    this.plans.set(planId, updated);
    return updated;
  }

  rePlan(
    planId: string,
    constraints: Readonly<Record<string, unknown>>,
  ): Plan {
    const existing = this.plans.get(planId);
    if (!existing) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }

    let filtered = [...existing.items];

    // Filter by priority threshold
    if (typeof constraints.priorityThreshold === 'number') {
      const threshold: number = constraints.priorityThreshold;
      filtered = filtered.filter(i => i.priority >= threshold);
    }

    // Filter by max total estimated minutes
    if (typeof constraints.maxMinutes === 'number') {
      const maxMin: number = constraints.maxMinutes;
      let total = 0;
      const limited: PlanItem[] = [];
      // Keep items sorted by priority (descending) until budget exhausted
      const byPriority = [...filtered].sort((a, b) => b.priority - a.priority);
      for (const item of byPriority) {
        if (total + item.estimatedMinutes <= maxMin) {
          limited.push(item);
          total += item.estimatedMinutes;
        }
      }
      filtered = limited;
    }

    // Limit item count
    if (typeof constraints.maxItems === 'number') {
      const maxItems: number = constraints.maxItems;
      if (filtered.length > maxItems) {
        // Keep highest-priority items
        filtered.sort((a, b) => b.priority - a.priority);
        filtered = filtered.slice(0, maxItems);
      }
    }

    // Final reorder by priority
    filtered.sort((a, b) => b.priority - a.priority);
    const reordered = filtered.map((item, index) =>
      Object.freeze({ ...item, order: index }),
    );

    const now = new Date().toISOString();
    const updated: Plan = Object.freeze({
      ...existing,
      items: Object.freeze(reordered),
      updatedAt: now,
    });

    this.plans.set(planId, updated);
    return updated;
  }

  // ── Queries ──────────────────────────────────────────────────

  getPlan(planId: string): Plan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }
    return plan;
  }

  getPlansByPeriod(period: PlanPeriod): readonly Plan[] {
    return Object.freeze(
      Array.from(this.plans.values()).filter(p => p.period === period),
    );
  }

  getAllPlans(): readonly Plan[] {
    return Object.freeze(Array.from(this.plans.values()));
  }

  deletePlan(planId: string): void {
    if (!this.plans.has(planId)) {
      throw new PlanValidationError([`Plan not found: ${planId}`]);
    }
    this.plans.delete(planId);
  }

  // ── Private helpers ──────────────────────────────────────────

  private buildPlanItems(inputs: readonly PlanItemInput[], defaultGoalId: string | null): PlanItem[] {
    return inputs.map((input, index) =>
      Object.freeze({
        id: crypto.randomUUID(),
        title: input.title.trim(),
        description: input.description ?? '',
        estimatedMinutes: input.estimatedMinutes ?? 30,
        priority: input.priority ?? 5,
        status: 'pending' as const,
        goalId: input.goalId ?? defaultGoalId,
        order: index,
      }),
    );
  }
}
