/**
 * Knowledge Graph Runtime — Transaction Layer
 *
 * Provides ACID-like transaction semantics for graph mutations.
 * Transactions are atomic — either all operations succeed or none do.
 *
 * Features:
 * - begin() / commit() / rollback() / abort()
 * - Nested transactions (savepoints)
 * - Change tracking (created, updated, deleted for nodes and edges)
 * - Automatic rollback on error
 *
 * No external dependencies.
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { NodeId, EdgeId, TransactionId } from '../../types/index.ts';
import { brandTransactionId, TransactionStatus } from '../../types/index.ts';
import { TransactionError } from '../../errors/index.ts';
import type { InternalStorage } from '../storage/index.ts';
import type { IndexManager } from '../indexes/index.ts';
import type { CacheManager } from '../cache/index.ts';

// ─── Change Set ─────────────────────────────────────────────

/**
 * Records all changes made within a transaction.
 * Used for event publishing after commit and for rollback support.
 */
export class ChangeSet {
  readonly createdNodes: Map<NodeId, GraphNode> = new Map();
  readonly updatedNodes: Map<NodeId, { old: GraphNode; new: GraphNode }> = new Map();
  readonly deletedNodes: Map<NodeId, GraphNode> = new Map();
  readonly createdEdges: Map<EdgeId, GraphEdge> = new Map();
  readonly updatedEdges: Map<EdgeId, { old: GraphEdge; new: GraphEdge }> = new Map();
  readonly deletedEdges: Map<EdgeId, GraphEdge> = new Map();

  /** Check if any changes were recorded. */
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

  /** Total number of changes. */
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

  /** Merge another change set into this one (for nested transaction commit). */
  merge(other: ChangeSet): void {
    for (const [id, node] of other.createdNodes) {
      this.createdNodes.set(id, node);
    }
    for (const [id, pair] of other.updatedNodes) {
      this.updatedNodes.set(id, pair);
    }
    for (const [id, node] of other.deletedNodes) {
      this.deletedNodes.set(id, node);
    }
    for (const [id, edge] of other.createdEdges) {
      this.createdEdges.set(id, edge);
    }
    for (const [id, pair] of other.updatedEdges) {
      this.updatedEdges.set(id, pair);
    }
    for (const [id, edge] of other.deletedEdges) {
      this.deletedEdges.set(id, edge);
    }
  }
}

// ─── Transaction State ──────────────────────────────────────

/** Internal state for an active transaction. */
interface TransactionState {
  readonly id: TransactionId;
  readonly changeSet: ChangeSet;
  readonly storageSnapshot: import('../storage/index.ts').StorageSnapshot;
  readonly parent: TransactionState | null;
  committed: boolean;
  rolledBack: boolean;
}

// ─── Transaction Manager ────────────────────────────────────

/**
 * Manages transaction lifecycle including nested transactions.
 *
 * Transaction model:
 * - begin() creates a new transaction with a storage snapshot
 * - Operations within a transaction are applied immediately to storage
 *   but tracked in the change set
 * - commit() finalizes the transaction and publishes events
 * - rollback() restores the storage snapshot
 * - Nested transactions create savepoints — child rollback only
 *   restores to the parent's state
 */
export class TransactionManager {
  private readonly _storage: InternalStorage;
  private readonly _indexManager: IndexManager;
  private readonly _cacheManager: CacheManager;
  private readonly _transactionStack: TransactionState[] = [];
  private _transactionCounter: number = 0;
  private _committedCount: number = 0;
  private _rolledBackCount: number = 0;

  constructor(
    storage: InternalStorage,
    indexManager: IndexManager,
    cacheManager: CacheManager,
  ) {
    this._storage = storage;
    this._indexManager = indexManager;
    this._cacheManager = cacheManager;
  }

  /** Generate a unique transaction ID. */
  private generateTransactionId(): TransactionId {
    this._transactionCounter++;
    return brandTransactionId(`tx_${Date.now().toString(36)}_${this._transactionCounter.toString(36)}`);
  }

  /** Check if a transaction is currently active. */
  get isActive(): boolean {
    return this._transactionStack.length > 0;
  }

  /** Get the current (innermost) transaction, or null. */
  get currentTransaction(): TransactionState | null {
    return this._transactionStack[this._transactionStack.length - 1] ?? null;
  }

  /** Get the current transaction's change set, or null. */
  get currentChangeSet(): ChangeSet | null {
    return this.currentTransaction?.changeSet ?? null;
  }

  /** Get the nesting depth of the current transaction. */
  get depth(): number {
    return this._transactionStack.length;
  }

  /**
   * Begin a new transaction.
   * If a transaction is already active, this creates a nested transaction (savepoint).
   */
  begin(): TransactionId {
    const id = this.generateTransactionId();
    const storageSnapshot = this._storage.snapshot();
    const parent = this.currentTransaction;

    const state: TransactionState = {
      id,
      changeSet: new ChangeSet(),
      storageSnapshot,
      parent,
      committed: false,
      rolledBack: false,
    };

    this._transactionStack.push(state);
    return id;
  }

  /**
   * Commit the current (innermost) transaction.
   * If this is a nested transaction, its change set is merged into the parent.
   * If this is the root transaction, events are published.
   *
   * @returns The change set from the committed transaction
   */
  commit(): ChangeSet {
    const tx = this.currentTransaction;
    if (!tx) {
      throw new TransactionError('No active transaction to commit');
    }
    if (tx.committed) {
      throw new TransactionError(`Transaction '${tx.id}' is already committed`);
    }
    if (tx.rolledBack) {
      throw new TransactionError(`Transaction '${tx.id}' is already rolled back`);
    }

    tx.committed = true;
    this._transactionStack.pop();

    if (tx.parent) {
      // Nested: merge change set into parent
      tx.parent.changeSet.merge(tx.changeSet);
    } else {
      // Root: transaction is finalized
      this._committedCount++;
    }

    return tx.changeSet;
  }

  /**
   * Rollback the current (innermost) transaction.
   * Restores the storage to the state at begin() time.
   * Also rebuilds indexes from the restored state.
   */
  rollback(): void {
    const tx = this.currentTransaction;
    if (!tx) {
      throw new TransactionError('No active transaction to rollback');
    }
    if (tx.committed) {
      throw new TransactionError(`Transaction '${tx.id}' is already committed`);
    }
    if (tx.rolledBack) {
      throw new TransactionError(`Transaction '${tx.id}' is already rolled back`);
    }

    tx.rolledBack = true;
    this._transactionStack.pop();

    // Restore storage to the snapshot taken at begin() time
    this._storage.restore(tx.storageSnapshot);

    // Rebuild indexes from restored state
    this._indexManager.clear();
    for (const [, node] of this._storage.nodes) {
      this._indexManager.indexNode(node);
    }
    for (const [, edge] of this._storage.edges) {
      this._indexManager.indexEdge(edge);
    }

    // Clear caches since they may contain stale data
    this._cacheManager.clear();

    if (!tx.parent) {
      this._rolledBackCount++;
    }
  }

  /**
   * Abort all active transactions.
   * Rolls back from innermost to outermost.
   */
  abort(): void {
    while (this._transactionStack.length > 0) {
      this.rollback();
    }
  }

  /** Track a node creation in the current transaction's change set. */
  trackNodeCreated(node: GraphNode): void {
    const cs = this.currentChangeSet;
    if (cs) {
      cs.createdNodes.set(node.identity.id, node);
    }
  }

  /** Track a node update in the current transaction's change set. */
  trackNodeUpdated(oldNode: GraphNode, newNode: GraphNode): void {
    const cs = this.currentChangeSet;
    if (cs) {
      // If this node was already created in this transaction, just update the created entry
      if (cs.createdNodes.has(oldNode.identity.id)) {
        cs.createdNodes.set(newNode.identity.id, newNode);
      } else {
        cs.updatedNodes.set(newNode.identity.id, { old: oldNode, new: newNode });
      }
    }
  }

  /** Track a node deletion in the current transaction's change set. */
  trackNodeDeleted(node: GraphNode): void {
    const cs = this.currentChangeSet;
    if (cs) {
      const id = node.identity.id;
      // If the node was created in this transaction, just remove it from created
      if (cs.createdNodes.has(id)) {
        cs.createdNodes.delete(id);
      } else {
        // Remove any update tracking since we're deleting
        cs.updatedNodes.delete(id);
        cs.deletedNodes.set(id, node);
      }
    }
  }

  /** Track an edge creation in the current transaction's change set. */
  trackEdgeCreated(edge: GraphEdge): void {
    const cs = this.currentChangeSet;
    if (cs) {
      cs.createdEdges.set(edge.id, edge);
    }
  }

  /** Track an edge deletion in the current transaction's change set. */
  trackEdgeDeleted(edge: GraphEdge): void {
    const cs = this.currentChangeSet;
    if (cs) {
      const id = edge.id;
      // If the edge was created in this transaction, just remove it from created
      if (cs.createdEdges.has(id)) {
        cs.createdEdges.delete(id);
      } else {
        cs.updatedEdges.delete(id);
        cs.deletedEdges.set(id, edge);
      }
    }
  }

  /** Number of committed transactions. */
  get committedCount(): number {
    return this._committedCount;
  }

  /** Number of rolled back transactions. */
  get rolledBackCount(): number {
    return this._rolledBackCount;
  }

  /** Total number of transactions (committed + rolled back). */
  get totalTransactionCount(): number {
    return this._committedCount + this._rolledBackCount;
  }
}
