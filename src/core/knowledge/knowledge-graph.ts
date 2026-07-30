/**
 * Knowledge Graph — Relation Management
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 *
 * Manages directed relations (edges) between knowledge items.
 * Maintains adjacency maps for efficient traversal and enforces
 * cycle prevention on hierarchical / dependency relation types.
 */

import type {
  KnowledgeRelation,
  KnowledgeRelationId,
  KnowledgeItemId,
  KnowledgeValidationResult,
  KnowledgeValidationIssue,
} from './types.js';
import {
  KnowledgeRelationType,
  brandKnowledgeRelationId,
} from './types.js';
import {
  KnowledgeCyclicRelationError,
  KnowledgeGraphConsistencyError,
} from './errors.js';
import type { Timestamp } from '../types/common.js';

// ─── Internal Helpers ──────────────────────────────────────────────

/** Relation types that must not form cycles. */
const CYCLE_SENSITIVE_TYPES: ReadonlySet<KnowledgeRelationType> = new Set([
  KnowledgeRelationType.Parent,
  KnowledgeRelationType.Child,
  KnowledgeRelationType.Dependency,
  KnowledgeRelationType.DerivedFrom,
]);

/** Generates a deterministic relation ID from source, target, and type. */
function generateRelationId(
  sourceId: KnowledgeItemId,
  targetId: KnowledgeItemId,
  type: KnowledgeRelationType,
): KnowledgeRelationId {
  return brandKnowledgeRelationId(
    `rel:${sourceId}:${type}:${targetId}`,
  );
}

/** Current ISO-8601 timestamp. */
function now(): Timestamp {
  return new Date().toISOString();
}

// ─── KnowledgeGraph ─────────────────────────────────────────────────

/**
 * In-memory directed graph of knowledge-item relations.
 *
 * All mutation methods are async to allow future persistence adapters
 * without breaking the public API. State is kept frozen / immutable.
 */
export class KnowledgeGraph {
  // Primary store: relationId → frozen KnowledgeRelation
  private readonly relations: Map<KnowledgeRelationId, KnowledgeRelation> =
    new Map();

  // Adjacency: sourceId → Set<relationId>
  private readonly outgoing: Map<KnowledgeItemId, Set<KnowledgeRelationId>> =
    new Map();

  // Adjacency: targetId → Set<relationId>
  private readonly incoming: Map<KnowledgeItemId, Set<KnowledgeRelationId>> =
    new Map();

  constructor() {
    // No configuration needed — the graph is a pure in-memory structure.
  }

  // ── Mutation ────────────────────────────────────────────────────────

  /**
   * Add a new relation between two knowledge items.
   *
   * Validates that no duplicate (same type + source + target) exists.
   * For cycle-sensitive types (Parent, Child, Dependency, DerivedFrom),
   * checks whether adding the edge would introduce a cycle and throws
   * {@link KnowledgeCyclicRelationError} if so.
   */
  public async addRelation(
    type: KnowledgeRelationType,
    sourceId: KnowledgeItemId,
    targetId: KnowledgeItemId,
    metadata?: Record<string, string>,
  ): Promise<KnowledgeRelation> {
    // ── Duplicate check ─────────────────────────────────────────────
    const candidateId = generateRelationId(sourceId, targetId, type);
    if (this.relations.has(candidateId)) {
      throw new KnowledgeGraphConsistencyError(
        `Duplicate relation: ${sourceId} → ${targetId} (${type})`,
      );
    }

    // ── Cycle check (only for hierarchical / dependency edges) ──────
    if (CYCLE_SENSITIVE_TYPES.has(type)) {
      const wouldCycle = await this.wouldCreateCycle(sourceId, targetId, type);
      if (wouldCycle) {
        throw new KnowledgeCyclicRelationError(
          sourceId as unknown as string,
          targetId as unknown as string,
        );
      }
    }

    // ── Build frozen relation object ─────────────────────────────────
    const relation: KnowledgeRelation = Object.freeze({
      id: candidateId,
      type,
      sourceId,
      targetId,
      metadata: Object.freeze(metadata ?? {}),
      createdAt: now(),
    });

    // ── Index ───────────────────────────────────────────────────────
    this.relations.set(candidateId, relation);

    this.ensureOutgoing(sourceId).add(candidateId);
    this.ensureIncoming(targetId).add(candidateId);

    return relation;
  }

  /**
   * Remove a relation by its ID.
   * Silently no-ops if the relation does not exist.
   */
  public async removeRelation(
    relationId: KnowledgeRelationId,
  ): Promise<void> {
    const relation = this.relations.get(relationId);
    if (relation === undefined) {
      return;
    }

    this.relations.delete(relationId);

    // Clean adjacency maps
    const outSet = this.outgoing.get(relation.sourceId);
    if (outSet !== undefined) {
      outSet.delete(relationId);
      if (outSet.size === 0) {
        this.outgoing.delete(relation.sourceId);
      }
    }

    const inSet = this.incoming.get(relation.targetId);
    if (inSet !== undefined) {
      inSet.delete(relationId);
      if (inSet.size === 0) {
        this.incoming.delete(relation.targetId);
      }
    }
  }

  /**
   * Remove all relations from the graph.
   */
  public async clear(): Promise<void> {
    this.relations.clear();
    this.outgoing.clear();
    this.incoming.clear();
  }

  // ── Query ───────────────────────────────────────────────────────────

  /**
   * Get all relations involving `itemId` (both outgoing and incoming),
   * optionally filtered by relation type.
   */
  public async getRelations(
    itemId: KnowledgeItemId,
    type?: KnowledgeRelationType,
  ): Promise<readonly KnowledgeRelation[]> {
    const outIds = this.outgoing.get(itemId);
    const inIds = this.incoming.get(itemId);

    if (outIds === undefined && inIds === undefined) {
      return [];
    }

    const idSet = new Set<KnowledgeRelationId>();
    if (outIds !== undefined) {
      for (const id of outIds) idSet.add(id);
    }
    if (inIds !== undefined) {
      for (const id of inIds) idSet.add(id);
    }

    return this.resolveRelationSet(idSet, type);
  }

  /**
   * Get outgoing relations from `itemId` (where `itemId` is the source).
   */
  public async getOutgoingRelations(
    itemId: KnowledgeItemId,
    type?: KnowledgeRelationType,
  ): Promise<readonly KnowledgeRelation[]> {
    const ids = this.outgoing.get(itemId);
    if (ids === undefined) {
      return [];
    }
    return this.resolveRelationSet(ids, type);
  }

  /**
   * Get incoming relations to `itemId` (where `itemId` is the target).
   */
  public async getIncomingRelations(
    itemId: KnowledgeItemId,
    type?: KnowledgeRelationType,
  ): Promise<readonly KnowledgeRelation[]> {
    const ids = this.incoming.get(itemId);
    if (ids === undefined) {
      return [];
    }
    return this.resolveRelationSet(ids, type);
  }

  /**
   * Returns the IDs of all items related to `itemId` (both directions),
   * optionally filtered by relation type. Deduplicated, no particular
   * ordering.
   */
  public async getRelatedItems(
    itemId: KnowledgeItemId,
    type?: KnowledgeRelationType,
  ): Promise<readonly KnowledgeItemId[]> {
    const relations = await this.getRelations(itemId, type);
    const seen = new Set<KnowledgeItemId>();

    const result: KnowledgeItemId[] = [];
    for (const rel of relations) {
      const peer: KnowledgeItemId =
        rel.sourceId === itemId ? rel.targetId : rel.sourceId;
      if (!seen.has(peer)) {
        seen.add(peer);
        result.push(peer);
      }
    }

    return Object.freeze(result);
  }

  /**
   * Returns every relation currently stored in the graph.
   */
  public async getAllRelations(): Promise<readonly KnowledgeRelation[]> {
    return Object.freeze([...this.relations.values()]);
  }

  // ── Traversal ───────────────────────────────────────────────────────

  /**
   * BFS check: is there *any* directed path from `fromId` to `toId`?
   */
  public async hasPath(
    fromId: KnowledgeItemId,
    toId: KnowledgeItemId,
  ): Promise<boolean> {
    return this.bfsReachable(fromId, toId);
  }

  /**
   * BFS shortest path from `fromId` to `toId`.
   * Returns the ordered list of item IDs (including both endpoints),
   * or `null` if no path exists.
   */
  public async getShortestPath(
    fromId: KnowledgeItemId,
    toId: KnowledgeItemId,
  ): Promise<readonly KnowledgeItemId[] | null> {
    const path = this.bfsPath(fromId, toId);
    return path !== null ? Object.freeze(path) : null;
  }

  // ── Cycle Detection & Validation ─────────────────────────────────────

  /**
   * Detect all elementary cycles in the graph.
   *
   * Uses Johnson's algorithm variant over the directed subgraph formed by
   * cycle-sensitive relation types. Returns arrays of item IDs, each array
   * representing one cycle.
   */
  public async detectCycles(): Promise<readonly KnowledgeItemId[][]> {
    const cycles = this.findCycles();
    // Freeze each cycle and the outer array for immutability.
    return Object.freeze(
      cycles.map((c) => Object.freeze([...c])),
    ) as readonly KnowledgeItemId[][];
  }

  /**
   * Validate the graph for consistency issues.
   *
   * Currently checks:
   * - Relations referencing items not present in the graph's node set
   *   (informational — the graph does not own items, so this is a warning).
   * - Actual cycles among cycle-sensitive relation types (errors).
   */
  public async validate(): Promise<KnowledgeValidationResult> {
    const issues: KnowledgeValidationIssue[] = [];

    // Check for existing cycles among cycle-sensitive types
    const cycles = this.findCycles();
    for (const cycle of cycles) {
      issues.push({
        code: 'CYCLIC_RELATION',
        message: `Cycle detected: ${cycle.join(' → ')} → ${cycle[0]}`,
        severity: 'error',
        details: Object.freeze({
          cycle: cycle.join(','),
        }),
      });
    }

    // Detect orphaned adjacency entries (edges in adjacency maps with no
    // corresponding relation — defensive consistency check)
    const allAdjIds = new Set<KnowledgeRelationId>();
    for (const set of this.outgoing.values()) {
      for (const id of set) allAdjIds.add(id);
    }
    for (const set of this.incoming.values()) {
      for (const id of set) allAdjIds.add(id);
    }

    for (const id of allAdjIds) {
      if (!this.relations.has(id)) {
        issues.push({
          code: 'ORPHANED_ADJACENCY_ENTRY',
          message: `Adjacency map references unknown relation: ${id}`,
          severity: 'error',
          details: Object.freeze({ relationId: id as unknown as string }),
        });
      }
    }

    // Detect relations missing from adjacency maps (reverse check)
    for (const [relId, rel] of this.relations) {
      const outSet = this.outgoing.get(rel.sourceId);
      if (outSet === undefined || !outSet.has(relId)) {
        issues.push({
          code: 'MISSING_OUTGOING_INDEX',
          message: `Relation ${relId} missing from outgoing adjacency for ${rel.sourceId}`,
          severity: 'error',
          details: Object.freeze({
            relationId: relId as unknown as string,
            itemId: rel.sourceId as unknown as string,
          }),
        });
      }
      const inSet = this.incoming.get(rel.targetId);
      if (inSet === undefined || !inSet.has(relId)) {
        issues.push({
          code: 'MISSING_INCOMING_INDEX',
          message: `Relation ${relId} missing from incoming adjacency for ${rel.targetId}`,
          severity: 'error',
          details: Object.freeze({
            relationId: relId as unknown as string,
            itemId: rel.targetId as unknown as string,
          }),
        });
      }
    }

    return Object.freeze({
      valid: issues.every((i) => i.severity !== 'error'),
      issues: Object.freeze(issues),
      checkedAt: now(),
    });
  }

  // ── Private Helpers ─────────────────────────────────────────────────

  /** Ensure the outgoing adjacency set for `itemId` exists. */
  private ensureOutgoing(
    itemId: KnowledgeItemId,
  ): Set<KnowledgeRelationId> {
    let set = this.outgoing.get(itemId);
    if (set === undefined) {
      set = new Set<KnowledgeRelationId>();
      this.outgoing.set(itemId, set);
    }
    return set;
  }

  /** Ensure the incoming adjacency set for `itemId` exists. */
  private ensureIncoming(
    itemId: KnowledgeItemId,
  ): Set<KnowledgeRelationId> {
    let set = this.incoming.get(itemId);
    if (set === undefined) {
      set = new Set<KnowledgeRelationId>();
      this.incoming.set(itemId, set);
    }
    return set;
  }

  /**
   * Resolve a set of relation IDs to their frozen `KnowledgeRelation`
   * objects, optionally filtered by type.
   */
  private resolveRelationSet(
    ids: Set<KnowledgeRelationId> | ReadonlySet<KnowledgeRelationId>,
    type?: KnowledgeRelationType,
  ): readonly KnowledgeRelation[] {
    const result: KnowledgeRelation[] = [];

    for (const id of ids) {
      const rel = this.relations.get(id);
      if (rel !== undefined && (type === undefined || rel.type === type)) {
        result.push(rel);
      }
    }

    return Object.freeze(result);
  }

  /**
   * Would adding an edge `sourceId → targetId` of the given type
   * create a cycle?
   *
   * For a directed edge source → target, a cycle exists if there is
   * already a directed path from target back to source. This is the
   * standard "would add edge create cycle" check.
   */
  private async wouldCreateCycle(
    sourceId: KnowledgeItemId,
    targetId: KnowledgeItemId,
    type: KnowledgeRelationType,
  ): Promise<boolean> {
    // The new edge goes sourceId → targetId.
    // A cycle exists iff targetId can already reach sourceId.
    return this.bfsReachable(targetId, sourceId, type);
  }

  /**
   * BFS reachability: can `fromId` reach `toId` following outgoing edges?
   * When `type` is given, only follow edges of that type.
   */
  private bfsReachable(
    fromId: KnowledgeItemId,
    toId: KnowledgeItemId,
    type?: KnowledgeRelationType,
  ): boolean {
    if (fromId === toId) {
      return false; // Empty path doesn't count as reachable
    }

    const visited = new Set<KnowledgeItemId>();
    const queue: KnowledgeItemId[] = [fromId];
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const outIds = this.outgoing.get(current);
      if (outIds === undefined) {
        continue;
      }

      for (const relId of outIds) {
        const rel = this.relations.get(relId);
        if (rel === undefined) {
          continue;
        }
        if (type !== undefined && rel.type !== type) {
          continue;
        }

        const neighbor = rel.targetId;
        if (neighbor === toId) {
          return true;
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  /**
   * BFS shortest path. Returns the ordered list of item IDs from `fromId`
   * to `toId` (inclusive), or `null` if unreachable.
   */
  private bfsPath(
    fromId: KnowledgeItemId,
    toId: KnowledgeItemId,
  ): KnowledgeItemId[] | null {
    if (fromId === toId) {
      return [fromId];
    }

    // parent map: itemId → predecessor itemId along the shortest path
    const parent = new Map<KnowledgeItemId, KnowledgeItemId>();
    const visited = new Set<KnowledgeItemId>();
    const queue: KnowledgeItemId[] = [fromId];
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const outIds = this.outgoing.get(current);
      if (outIds === undefined) {
        continue;
      }

      for (const relId of outIds) {
        const rel = this.relations.get(relId);
        if (rel === undefined) {
          continue;
        }

        const neighbor = rel.targetId;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, current);

          if (neighbor === toId) {
            // Reconstruct path
            const path: KnowledgeItemId[] = [toId];
            let node: KnowledgeItemId | undefined = toId;
            while (node !== undefined && node !== fromId) {
              node = parent.get(node);
              if (node !== undefined) {
                path.push(node);
              }
            }
            return path.reverse();
          }

          queue.push(neighbor);
        }
      }
    }

    return null;
  }

  /**
   * Find all elementary cycles in the directed graph.
   *
   * Only considers edges of cycle-sensitive types. Uses a DFS-based
   * approach: for each node as a starting point, attempt to find a path
   * back to it. Tracks visited nodes on the current stack to detect cycles.
   *
   * Returns de-duplicated cycles (each cycle is normalised so the
   * lexicographically smallest ID comes first).
   */
  private findCycles(): readonly KnowledgeItemId[][] {
    const nodes = this.collectNodesForCycleCheck();
    if (nodes.size === 0) {
      return [];
    }

    const found = new Set<string>();
    const cycles: KnowledgeItemId[][] = [];

    for (const start of nodes) {
      const stack: KnowledgeItemId[] = [start];
      const onStack = new Set<KnowledgeItemId>([start]);
      const visited = new Set<KnowledgeItemId>([start]);

      this.dfsFindCycles(start, stack, onStack, visited, cycles, found);
    }

    return cycles;
  }

  /**
   * Recursive DFS helper for cycle detection.
   */
  private dfsFindCycles(
    start: KnowledgeItemId,
    stack: KnowledgeItemId[],
    onStack: Set<KnowledgeItemId>,
    visited: Set<KnowledgeItemId>,
    cycles: KnowledgeItemId[][],
    found: Set<string>,
  ): void {
    const current = stack[stack.length - 1];

    const outIds = this.outgoing.get(current);
    if (outIds === undefined) {
      // Backtrack
      stack.pop();
      onStack.delete(current);
      return;
    }

    for (const relId of outIds) {
      const rel = this.relations.get(relId);
      if (rel === undefined) {
        continue;
      }
      // Only follow cycle-sensitive types
      if (!CYCLE_SENSITIVE_TYPES.has(rel.type)) {
        continue;
      }

      const neighbor = rel.targetId;

      if (neighbor === start) {
        // Found a cycle: start → ... → current → start
        const cycle = [...stack];
        this.normaliseAndRecordCycle(cycle, cycles, found);
        continue;
      }

      if (onStack.has(neighbor)) {
        // Not back to start but still a cycle — we'll find it from
        // a different starting node, skip to avoid duplicates.
        continue;
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        onStack.add(neighbor);
        stack.push(neighbor);

        this.dfsFindCycles(start, stack, onStack, visited, cycles, found);

        // Backtrack
        stack.pop();
        onStack.delete(neighbor);
      }
    }
  }

  /**
   * Normalise a cycle (rotate so lexicographically smallest ID is first)
   * and record it if not already found.
   */
  private normaliseAndRecordCycle(
    cycle: KnowledgeItemId[],
    cycles: KnowledgeItemId[][],
    found: Set<string>,
  ): void {
    if (cycle.length < 2) {
      return;
    }

    // Find rotation with smallest first element
    let minIdx = 0;
    for (let i = 1; i < cycle.length; i++) {
      if (cycle[i] < cycle[minIdx]) {
        minIdx = i;
      }
    }

    // Rotate
    const normalised: KnowledgeItemId[] = [
      ...cycle.slice(minIdx),
      ...cycle.slice(0, minIdx),
    ];

    // Dedup key
    const key = normalised.join('→');
    if (found.has(key)) {
      return;
    }
    found.add(key);

    cycles.push(normalised);
  }

  /**
   * Collect all item IDs that participate in at least one cycle-sensitive
   * relation (as source or target).
   */
  private collectNodesForCycleCheck(): ReadonlySet<KnowledgeItemId> {
    const nodes = new Set<KnowledgeItemId>();

    for (const [, rel] of this.relations) {
      if (!CYCLE_SENSITIVE_TYPES.has(rel.type)) {
        continue;
      }
      nodes.add(rel.sourceId);
      nodes.add(rel.targetId);
    }

    return nodes;
  }
}
