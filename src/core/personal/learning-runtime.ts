/**
 * Personal Intelligence Runtime — Learning Subsystem
 *
 * Manages a directed graph of learning items (topics/skills) and
 * their relationships.  Tracks mastery progress through spaced
 * repetition-inspired status transitions.  Owns all learning data.
 */
import { LearningStatus } from './types.js';
import type { LearningItem, LearningEdge, LearningGraph } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { LearningGraphError } from './errors.js';

// ── Config ──────────────────────────────────────────────────────

export interface LearningRuntimeConfig {
  readonly maxItems?: number;
  readonly confidenceDecayRate?: number;
  readonly practiceConfidenceBoost?: number;
}

// ── Valid status transitions ────────────────────────────────────

const VALID_TRANSITIONS: ReadonlyMap<LearningStatus, ReadonlySet<LearningStatus>> = new Map<LearningStatus, ReadonlySet<LearningStatus>>([
  [LearningStatus.New, new Set<LearningStatus>([LearningStatus.Learning, LearningStatus.Forgotten])],
  [LearningStatus.Learning, new Set<LearningStatus>([LearningStatus.Practicing, LearningStatus.Forgotten, LearningStatus.Declining])],
  [LearningStatus.Practicing, new Set<LearningStatus>([LearningStatus.Mastered, LearningStatus.Declining, LearningStatus.Forgotten])],
  [LearningStatus.Mastered, new Set<LearningStatus>([LearningStatus.Declining, LearningStatus.Forgotten])],
  [LearningStatus.Declining, new Set<LearningStatus>([LearningStatus.Learning, LearningStatus.Practicing, LearningStatus.Forgotten])],
  [LearningStatus.Forgotten, new Set<LearningStatus>([LearningStatus.Learning, LearningStatus.New])],
]);

export class LearningRuntime {
  private contracts: PersonalRuntimeContracts;
  private items = new Map<string, LearningItem>();
  private edges = new Map<string, LearningEdge>();
  private readonly maxItems: number;
  private readonly confidenceDecayRate: number;
  private readonly practiceConfidenceBoost: number;

  constructor(contracts: PersonalRuntimeContracts, config?: LearningRuntimeConfig) {
    this.contracts = contracts;
    this.maxItems = config?.maxItems ?? 500;
    this.confidenceDecayRate = config?.confidenceDecayRate ?? 0.05;
    this.practiceConfidenceBoost = config?.practiceConfidenceBoost ?? 0.15;
  }

  // ── Add item ──────────────────────────────────────────────────

  addLearningItem(
    topic: string,
    metadata?: Readonly<Record<string, unknown>>,
    relatedGoals?: readonly string[],
  ): LearningItem {
    if (!topic.trim()) {
      throw new LearningGraphError('invalid', 'Topic must be non-empty');
    }

    // Check for duplicate topic
    const normalized = topic.trim().toLowerCase();
    for (const item of this.items.values()) {
      if (item.topic.toLowerCase() === normalized) {
        return item;
      }
    }

    if (this.items.size >= this.maxItems) {
      throw new LearningGraphError('capacity', 'Maximum learning item count reached');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const item: LearningItem = Object.freeze({
      id,
      topic: topic.trim(),
      status: LearningStatus.New,
      confidence: 0.1,
      practiceCount: 0,
      lastPracticedAt: null,
      firstSeenAt: now,
      relatedGoals: Object.freeze(relatedGoals ? [...relatedGoals] : []),
      metadata: Object.freeze(metadata ? { ...metadata } : {}),
    });

    this.items.set(id, item);
    this.emitGraphUpdated();

    return item;
  }

  // ── Practice ──────────────────────────────────────────────────

  practice(itemId: string): LearningItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new LearningGraphError(itemId, 'Learning item not found');
    }

    const now = new Date().toISOString();
    const newPracticeCount = item.practiceCount + 1;
    const newConfidence = Math.min(1, item.confidence + this.practiceConfidenceBoost);

    // Auto-advance status based on practice count and confidence
    let newStatus = item.status;
    if (newStatus === LearningStatus.New && newPracticeCount >= 1) {
      newStatus = LearningStatus.Learning;
    }
    if (newStatus === LearningStatus.Learning && newPracticeCount >= 3) {
      newStatus = LearningStatus.Practicing;
    }
    if (newStatus === LearningStatus.Practicing && newConfidence >= 0.9) {
      newStatus = LearningStatus.Mastered;
    }

    const oldStatus = item.status;
    const updated: LearningItem = Object.freeze({
      ...item,
      status: newStatus,
      confidence: Math.round(newConfidence * 1000) / 1000,
      practiceCount: newPracticeCount,
      lastPracticedAt: now,
    });

    this.items.set(itemId, updated);

    // Emit LearningItemUpdated
    const base = createPersonalEventBase('LearningItemUpdated', EventClassification.StateChange, itemId);
    void this.contracts.platform.publishEvent('LearningItemUpdated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        itemId,
        topic: updated.topic,
        oldStatus,
        newStatus,
        confidence: updated.confidence,
        updatedAt: now,
      },
    });

    return updated;
  }

  // ── Status transition ─────────────────────────────────────────

  updateStatus(itemId: string, newStatus: LearningStatus): LearningItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new LearningGraphError(itemId, 'Learning item not found');
    }

    const allowed = VALID_TRANSITIONS.get(item.status);
    if (!allowed || !allowed.has(newStatus)) {
      throw new LearningGraphError(itemId, `Invalid transition from ${item.status} to ${newStatus}`);
    }

    const now = new Date().toISOString();
    const oldStatus = item.status;

    // Adjust confidence based on transition direction
    let confidence = item.confidence;
    if (newStatus === LearningStatus.Forgotten || newStatus === LearningStatus.Declining) {
      confidence = Math.max(0, confidence - this.confidenceDecayRate * 4);
    } else if (newStatus === LearningStatus.Learning) {
      confidence = Math.max(confidence, 0.2);
    } else if (newStatus === LearningStatus.Practicing) {
      confidence = Math.max(confidence, 0.5);
    } else if (newStatus === LearningStatus.Mastered) {
      confidence = 1.0;
    } else if (newStatus === LearningStatus.New) {
      confidence = 0.1;
    }

    const updated: LearningItem = Object.freeze({
      ...item,
      status: newStatus,
      confidence: Math.round(confidence * 1000) / 1000,
      updatedAt: now,
    });

    this.items.set(itemId, updated);

    const base = createPersonalEventBase('LearningItemUpdated', EventClassification.StateChange, itemId);
    void this.contracts.platform.publishEvent('LearningItemUpdated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        itemId,
        topic: updated.topic,
        oldStatus,
        newStatus,
        confidence: updated.confidence,
        updatedAt: now,
      },
    });

    return updated;
  }

  // ── Edges ─────────────────────────────────────────────────────

  addEdge(
    fromId: string,
    toId: string,
    relationType: 'prerequisite' | 'related' | 'applies_to',
  ): LearningEdge {
    if (!this.items.has(fromId)) {
      throw new LearningGraphError(fromId, 'Source learning item not found');
    }
    if (!this.items.has(toId)) {
      throw new LearningGraphError(toId, 'Target learning item not found');
    }
    if (fromId === toId) {
      throw new LearningGraphError(fromId, 'Cannot create self-referencing edge');
    }

    const edgeKey = `${fromId}->${toId}`;
    if (this.edges.has(edgeKey)) {
      return this.edges.get(edgeKey)!;
    }

    // Check for reverse prerequisite cycles
    if (relationType === 'prerequisite') {
      if (this.hasPath(toId, fromId)) {
        throw new LearningGraphError(fromId, 'Adding this prerequisite would create a cycle');
      }
    }

    const edge: LearningEdge = Object.freeze({ from: fromId, to: toId, relationType });
    this.edges.set(edgeKey, edge);
    this.emitGraphUpdated();

    return edge;
  }

  removeEdge(fromId: string, toId: string): void {
    const edgeKey = `${fromId}->${toId}`;
    if (!this.edges.has(edgeKey)) {
      throw new LearningGraphError(fromId, `Edge from ${fromId} to ${toId} not found`);
    }
    this.edges.delete(edgeKey);
    this.emitGraphUpdated();
  }

  // ── Queries ───────────────────────────────────────────────────

  getGraph(): LearningGraph {
    return Object.freeze({
      nodes: Object.freeze(Array.from(this.items.values())),
      edges: Object.freeze(Array.from(this.edges.values())),
      updatedAt: new Date().toISOString(),
    });
  }

  getItem(itemId: string): LearningItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new LearningGraphError(itemId, 'Learning item not found');
    }
    return item;
  }

  getItemsByStatus(status: LearningStatus): readonly LearningItem[] {
    return Object.freeze(
      Array.from(this.items.values()).filter(i => i.status === status),
    );
  }

  getPrerequisites(itemId: string): readonly LearningItem[] {
    const result: LearningItem[] = [];
    for (const edge of this.edges.values()) {
      if (edge.to === itemId && edge.relationType === 'prerequisite') {
        const item = this.items.get(edge.from);
        if (item) result.push(item);
      }
    }
    return Object.freeze(result);
  }

  getDependents(itemId: string): readonly LearningItem[] {
    const result: LearningItem[] = [];
    for (const edge of this.edges.values()) {
      if (edge.from === itemId && edge.relationType === 'prerequisite') {
        const item = this.items.get(edge.to);
        if (item) result.push(item);
      }
    }
    return Object.freeze(result);
  }

  getRelatedItems(itemId: string): readonly LearningItem[] {
    const result: LearningItem[] = [];
    for (const edge of this.edges.values()) {
      if (edge.relationType !== 'related') continue;
      let relatedId: string | undefined;
      if (edge.from === itemId) {
        relatedId = edge.to;
      } else if (edge.to === itemId) {
        relatedId = edge.from;
      }
      if (relatedId) {
        const item = this.items.get(relatedId);
        if (item) result.push(item);
      }
    }
    return Object.freeze(result);
  }

  getLearningPath(targetItemId: string): readonly LearningItem[] {
    if (!this.items.has(targetItemId)) {
      throw new LearningGraphError(targetItemId, 'Learning item not found');
    }

    const path: LearningItem[] = [];
    const visited = new Set<string>();
    const queue = [targetItemId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const item = this.items.get(currentId);
      if (!item) continue;

      path.unshift(item);

      // Walk prerequisites backwards
      for (const edge of this.edges.values()) {
        if (edge.to === currentId && edge.relationType === 'prerequisite') {
          if (!visited.has(edge.from)) {
            queue.push(edge.from);
          }
        }
      }
    }

    return Object.freeze(path);
  }

  getAllItems(): readonly LearningItem[] {
    return Object.freeze(Array.from(this.items.values()));
  }

  getItemCount(): number {
    return this.items.size;
  }

  getEdgeCount(): number {
    return this.edges.size;
  }

  // ── Confidence decay ──────────────────────────────────────────

  decayStaleItems(maxStaleDays: number): readonly LearningItem[] {
    const now = Date.now();
    const staleThresholdMs = maxStaleDays * 24 * 60 * 60 * 1000;
    const decayed: LearningItem[] = [];

    for (const [id, item] of this.items) {
      if (item.status === LearningStatus.Mastered || item.status === LearningStatus.New) continue;
      if (!item.lastPracticedAt) continue;

      const lastPracticedMs = new Date(item.lastPracticedAt).getTime();
      const staleMs = now - lastPracticedMs;

      if (staleMs > staleThresholdMs) {
        const newConfidence = Math.max(0, item.confidence - this.confidenceDecayRate);

        let newStatus = item.status;
        if (newConfidence < 0.2 && item.status !== LearningStatus.Forgotten) {
          newStatus = LearningStatus.Forgotten;
        } else if (newConfidence < 0.4 && item.status === LearningStatus.Practicing) {
          newStatus = LearningStatus.Declining;
        }

        if (newStatus !== item.status) {
          const oldStatus = item.status;
          const updated: LearningItem = Object.freeze({
            ...item,
            status: newStatus,
            confidence: Math.round(newConfidence * 1000) / 1000,
          });
          this.items.set(id, updated);
          decayed.push(updated);

          const base = createPersonalEventBase('LearningItemUpdated', EventClassification.StateChange, id);
          void this.contracts.platform.publishEvent('LearningItemUpdated', {
            ...base,
            sequence: 0,
            version: '1.0.0',
            payload: {
              itemId: id,
              topic: updated.topic,
              oldStatus,
              newStatus,
              confidence: updated.confidence,
              updatedAt: new Date().toISOString(),
            },
          });
        }
      }
    }

    return Object.freeze(decayed);
  }

  // ── Private helpers ───────────────────────────────────────────

  private hasPath(fromId: string, toId: string): boolean {
    const visited = new Set<string>();
    const queue = [fromId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === toId) return true;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      for (const edge of this.edges.values()) {
        if (edge.from === currentId && !visited.has(edge.to)) {
          queue.push(edge.to);
        }
      }
    }

    return false;
  }

  private emitGraphUpdated(): void {
    const now = new Date().toISOString();
    const base = createPersonalEventBase('LearningGraphUpdated', EventClassification.StateChange, 'learning-graph');
    void this.contracts.platform.publishEvent('LearningGraphUpdated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        nodeCount: this.items.size,
        edgeCount: this.edges.size,
        updatedAt: now,
      },
    });
  }
}
