/**
 * Knowledge Graph Storage Adapter — Transaction Layer
 *
 * ACID-like transactions at the storage adapter level.
 * Provides begin/commit/rollback with change tracking and
 * automatic rollback on errors.
 *
 * Transaction model:
 * - begin(): snapshot current state
 * - Operations are applied immediately but tracked
 * - commit(): finalize and publish events
 * - rollback(): restore to snapshot
 * - Nested transactions (savepoints) supported
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { NodeId, EdgeId, TransactionId, Timestamp } from '../../types/index.ts';
import { brandTransactionId } from '../../types/index.ts';
import { StorageTransactionState } from '../types/index.ts';
import type { StorageTransactionInfo } from '../types/index.ts';

// ─── Storage Change Set ───────────────────────────────────────

export class StorageChangeSet {
  readonly createdNodes: Map<NodeId, GraphNode> = new Map();
  readonly updatedNodes: Map<NodeId, { old: GraphNode; new: GraphNode }> = new Map();
  readonly deletedNodes: Map<NodeId, GraphNode> = new Map();
  readonly createdEdges: Map<EdgeId, GraphEdge> = new Map();
  readonly updatedEdges: Map<EdgeId, { old: GraphEdge; new: GraphEdge }> = new Map();
  readonly deletedEdges: Map<EdgeId, GraphEdge> = new Map();

  get isEmpty(): boolean {
    return (
      this.createdNodes.size === 0 &&
      this.updatedNodes.size === 0 &&
      this.deletedNodes.size === 0 &&
      this.createdEdges.size === 0 &&
      this.updatedEdges.size === 0 &&
      this.deletedEdges.size === 0
    );
  }

  get totalChanges(): number {
    return (
      this.createdNodes.size +
      this.updatedNodes.size +
      this.deletedNodes.size +
      this.createdEdges.size +
      this.updatedEdges.size +
      this.deletedEdges.size
    );
  }

  merge(other: StorageChangeSet): void {
    for (const [id, node] of other.createdNodes) this.createdNodes.set(id, node);
    for (const [id, pair] of other.updatedNodes) this.updatedNodes.set(id, pair);
    for (const [id, node] of other.deletedNodes) this.deletedNodes.set(id, node);
    for (const [id, edge] of other.createdEdges) this.createdEdges.set(id, edge);
    for (const [id, pair] of other.updatedEdges) this.updatedEdges.set(id, pair);
    for (const [id, edge] of other.deletedEdges) this.deletedEdges.set(id, edge);
  }
}

// ─── Transaction State ────────────────────────────────────────

interface TransactionState {
  readonly id: TransactionId;
  readonly changeSet: StorageChangeSet;
  readonly nodeSnapshot: Map<NodeId, GraphNode>;
  readonly edgeSnapshot: Map<EdgeId, GraphEdge>;
  readonly parent: TransactionState | null;
  state: StorageTransactionState;
  startedAt: Timestamp;
  committedAt: Timestamp | null;
}

// ─── Storage Transaction Manager ──────────────────────────────

export class StorageTransactionManager {
  private readonly _stack: TransactionState[] = [];
  private _counter = 0;
  private _committedCount = 0;
  private _rolledBackCount = 0;

  /** Generate unique transaction ID */
  private generateId(): TransactionId {
    return brandTransactionId(`tx_${Date.now().toString(36)}_${(++this._counter).toString(36)}`);
  }

  /** Check if a transaction is active */
  get isActive(): boolean {
    return this._stack.length > 0;
  }

  /** Get current (innermost) transaction */
  get current(): TransactionState | null {
    return this._stack[this._stack.length - 1] ?? null;
  }

  /** Get current change set */
  get currentChangeSet(): StorageChangeSet | null {
    return this.current?.changeSet ?? null;
  }

  /** Get nesting depth */
  get depth(): number {
    return this._stack.length;
  }

  /**
   * Begin a new transaction.
   * Creates a snapshot of current node/edge state for rollback.
   */
  begin(
    currentNodes: ReadonlyMap<NodeId, GraphNode>,
    currentEdges: ReadonlyMap<EdgeId, GraphEdge>,
  ): TransactionId {
    const id = this.generateId();
    const now = new Date().toISOString() as Timestamp;

    // Snapshot current state
    const nodeSnapshot = new Map(currentNodes);
    const edgeSnapshot = new Map(currentEdges);

    const state: TransactionState = {
      id,
      changeSet: new StorageChangeSet(),
      nodeSnapshot,
      edgeSnapshot,
      parent: this.current,
      state: StorageTransactionState.Active,
      startedAt: now,
      committedAt: null,
    };

    this._stack.push(state);
    return id;
  }

  /**
   * Commit the current transaction.
   * Nested transactions merge into parent.
   */
  commit(): StorageTransactionInfo {
    const tx = this.current;
    if (!tx) throw new Error('No active transaction to commit');
    if (tx.state !== StorageTransactionState.Active) {
      throw new Error(`Transaction '${tx.id}' is not active (state: ${tx.state})`);
    }

    tx.state = StorageTransactionState.Committed;
    tx.committedAt = new Date().toISOString() as Timestamp;
    this._stack.pop();

    if (tx.parent) {
      // Nested: merge into parent
      tx.parent.changeSet.merge(tx.changeSet);
    } else {
      this._committedCount++;
    }

    return {
      id: tx.id,
      state: tx.state,
      startedAt: tx.startedAt,
      committedAt: tx.committedAt,
      operationCount: tx.changeSet.totalChanges,
    };
  }

  /**
   * Rollback the current transaction.
   * Returns the snapshot for the adapter to restore.
   */
  rollback(): { info: StorageTransactionInfo; nodeSnapshot: Map<NodeId, GraphNode>; edgeSnapshot: Map<EdgeId, GraphEdge> } {
    const tx = this.current;
    if (!tx) throw new Error('No active transaction to rollback');
    if (tx.state !== StorageTransactionState.Active) {
      throw new Error(`Transaction '${tx.id}' is not active (state: ${tx.state})`);
    }

    tx.state = StorageTransactionState.RolledBack;
    this._stack.pop();

    if (!tx.parent) {
      this._rolledBackCount++;
    }

    return {
      info: {
        id: tx.id,
        state: tx.state,
        startedAt: tx.startedAt,
        committedAt: null,
        operationCount: tx.changeSet.totalChanges,
      },
      nodeSnapshot: tx.nodeSnapshot,
      edgeSnapshot: tx.edgeSnapshot,
    };
  }

  /** Track node creation */
  trackNodeCreated(node: GraphNode): void {
    const cs = this.currentChangeSet;
    if (cs) cs.createdNodes.set(node.identity.id, node);
  }

  /** Track node update */
  trackNodeUpdated(oldNode: GraphNode, newNode: GraphNode): void {
    const cs = this.currentChangeSet;
    if (cs) {
      if (cs.createdNodes.has(oldNode.identity.id)) {
        cs.createdNodes.set(newNode.identity.id, newNode);
      } else {
        cs.updatedNodes.set(newNode.identity.id, { old: oldNode, new: newNode });
      }
    }
  }

  /** Track node deletion */
  trackNodeDeleted(node: GraphNode): void {
    const cs = this.currentChangeSet;
    if (cs) {
      const id = node.identity.id;
      if (cs.createdNodes.has(id)) {
        cs.createdNodes.delete(id);
      } else {
        cs.updatedNodes.delete(id);
        cs.deletedNodes.set(id, node);
      }
    }
  }

  /** Track edge creation */
  trackEdgeCreated(edge: GraphEdge): void {
    const cs = this.currentChangeSet;
    if (cs) cs.createdEdges.set(edge.id, edge);
  }

  /** Track edge deletion */
  trackEdgeDeleted(edge: GraphEdge): void {
    const cs = this.currentChangeSet;
    if (cs) {
      const id = edge.id;
      if (cs.createdEdges.has(id)) {
        cs.createdEdges.delete(id);
      } else {
        cs.updatedEdges.delete(id);
        cs.deletedEdges.set(id, edge);
      }
    }
  }

  get committedCount(): number {
    return this._committedCount;
  }

  get rolledBackCount(): number {
    return this._rolledBackCount;
  }

  get activeTransactionCount(): number {
    return this._stack.length;
  }
}
