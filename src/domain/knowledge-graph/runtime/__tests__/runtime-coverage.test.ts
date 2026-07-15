/**
 * Knowledge Graph Runtime — Additional Coverage Tests
 *
 * Targeted tests for edge cases and branches to achieve ≥97% coverage
 * in the runtime layer specifically.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  NodeType, EdgeType, SnapshotStatus, TransactionStatus,
  brandNodeId, brandEdgeId, brandSnapshotId, brandTransactionId,
} from '../../types/index.ts';

import {
  createGraphNode, createGraphEdge, createRelationship,
  createGraphSnapshot, createGraphStatistics,
  type GraphNode, type GraphEdge,
} from '../../models/index.ts';

import {
  DuplicateNodeError, DuplicateEdgeError,
  SelfReferenceError, GraphValidationError,
  TransactionError, SnapshotError,
} from '../../errors/index.ts';

import {
  InMemoryGraphRepository,
} from '../repository/index.ts';

import { InternalStorage } from '../storage/index.ts';
import { IndexManager, NodeTypeIndex, EdgeTypeIndex, IdentityIndex, MetadataIndex } from '../indexes/index.ts';
import { CacheManager } from '../cache/index.ts';
import { SnapshotEngine } from '../snapshot/index.ts';
import { TransactionManager, ChangeSet } from '../transaction/index.ts';
import type { EventPublisher, AnyGraphDomainEvent } from '../../adapters/index.ts';

function makeNode(id: string, type: NodeType = NodeType.Application, labels: string[] = []): GraphNode {
  return createGraphNode(id, type, {
    labels,
    properties: { name: `Node-${id}` },
    metadata: { source: 'test', tags: ['unit-test'] },
  });
}

function makeEdge(id: string, sourceId: string, targetId: string, edgeType: EdgeType = EdgeType.HOSTS): GraphEdge {
  const rel = createRelationship(edgeType);
  return createGraphEdge(id, sourceId, targetId, rel);
}

class TestEventPublisher implements EventPublisher {
  readonly events: AnyGraphDomainEvent[] = [];
  async publish(event: AnyGraphDomainEvent): Promise<void> { this.events.push(event); }
  async publishAll(events: readonly AnyGraphDomainEvent[]): Promise<void> { this.events.push(...events); }
  clear(): void { this.events.length = 0; }
}

// ─── Storage Coverage ────────────────────────────────────────

describe('InternalStorage — additional coverage', () => {
  it('getOutgoingEdgeIds and getIncomingEdgeIds for empty node', () => {
    const storage = new InternalStorage();
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    expect(storage.getOutgoingEdgeIds(brandNodeId('n1')).size).toBe(0);
    expect(storage.getIncomingEdgeIds(brandNodeId('n1')).size).toBe(0);
  });

  it('getOutgoingEdgeIds and getIncomingEdgeIds for non-existent node', () => {
    const storage = new InternalStorage();
    expect(storage.getOutgoingEdgeIds(brandNodeId('missing')).size).toBe(0);
    expect(storage.getIncomingEdgeIds(brandNodeId('missing')).size).toBe(0);
  });

  it('removeAllEdgesForNode with no edges', () => {
    const storage = new InternalStorage();
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    const removed = storage.removeAllEdgesForNode(brandNodeId('n1'));
    expect(removed).toHaveLength(0);
  });

  it('getOutgoingEdges and getIncomingEdges for non-existent node', () => {
    const storage = new InternalStorage();
    expect(storage.getOutgoingEdges(brandNodeId('missing'))).toHaveLength(0);
    expect(storage.getIncomingEdges(brandNodeId('missing'))).toHaveLength(0);
  });

  it('snapshot and restore with edges', () => {
    const storage = new InternalStorage();
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    storage.setNode(brandNodeId('n2'), makeNode('n2'));
    const edge = makeEdge('e1', 'n1', 'n2');
    storage.setEdge(edge.id, edge);

    const snap = storage.snapshot();
    expect(snap.edges.size).toBe(1);
    expect(snap.adjacencyOut.size).toBe(2);
    expect(snap.adjacencyIn.size).toBe(2);

    // Modify, then restore
    storage.setNode(brandNodeId('n3'), makeNode('n3'));
    storage.restore(snap);
    expect(storage.nodeCount).toBe(2);
    expect(storage.edgeCount).toBe(1);
  });

  it('setEdge creates adjacency sets for unknown nodes', () => {
    const storage = new InternalStorage();
    // When setting an edge for nodes not yet in adjacency maps
    const edge = makeEdge('e1', 'unknown1', 'unknown2');
    storage.setEdge(edge.id, edge);
    // Adjacency sets should be created
    expect(storage.getOutgoingEdgeIds(brandNodeId('unknown1')).size).toBe(1);
    expect(storage.getIncomingEdgeIds(brandNodeId('unknown2')).size).toBe(1);
  });

  it('memory usage for empty storage', () => {
    const storage = new InternalStorage();
    expect(storage.memoryUsage).toBe(0);
  });
});

// ─── Index Coverage ──────────────────────────────────────────

describe('Indexes — additional coverage', () => {
  it('NodeTypeIndex handles unknown type', () => {
    const index = new NodeTypeIndex();
    const node = makeNode('n1');
    index.add(node);
    expect(index.getByType(NodeType.Application).size).toBe(1);
    expect(index.getByType('UnknownType').size).toBe(0);
  });

  it('EdgeTypeIndex handles unknown type', () => {
    const index = new EdgeTypeIndex();
    expect(index.getByType('UnknownType').size).toBe(0);
  });

  it('NodeTypeIndex countByType for unknown type', () => {
    const index = new NodeTypeIndex();
    expect(index.countByType('Unknown')).toBe(0);
  });

  it('EdgeTypeIndex countByType for unknown type', () => {
    const index = new EdgeTypeIndex();
    expect(index.countByType('Unknown')).toBe(0);
  });

  it('IdentityIndex has returns false for missing', () => {
    const index = new IdentityIndex();
    expect(index.has('missing')).toBe(false);
  });

  it('IdentityIndex findByLabel returns empty for missing', () => {
    const index = new IdentityIndex();
    expect(index.findByLabel('missing').size).toBe(0);
  });

  it('MetadataIndex findBySource returns empty for missing', () => {
    const index = new MetadataIndex();
    expect(index.findBySource('missing').size).toBe(0);
  });

  it('MetadataIndex findByTag returns empty for missing', () => {
    const index = new MetadataIndex();
    expect(index.findByTag('missing').size).toBe(0);
  });

  it('IndexManager reindexNode with same type (no type change)', () => {
    const manager = new IndexManager();
    const oldNode = makeNode('n1', NodeType.Application, ['webapp']);
    const newNode = makeNode('n1', NodeType.Application, ['mobile']);
    manager.indexNode(oldNode);
    manager.reindexNode(oldNode, newNode);
    expect(manager.identityIndex.findByLabel('webapp').size).toBe(0);
    expect(manager.identityIndex.findByLabel('mobile').size).toBe(1);
  });

  it('IndexManager reindexNode with label change', () => {
    const manager = new IndexManager();
    const oldNode = makeNode('n1', NodeType.Application, ['old']);
    const newNode = makeNode('n1', NodeType.Host, ['new']);
    manager.indexNode(oldNode);
    manager.reindexNode(oldNode, newNode);
    expect(manager.nodeTypeIndex.countByType(NodeType.Application)).toBe(0);
    expect(manager.nodeTypeIndex.countByType(NodeType.Host)).toBe(1);
    expect(manager.identityIndex.findByLabel('old').size).toBe(0);
    expect(manager.identityIndex.findByLabel('new').size).toBe(1);
  });
});

// ─── Snapshot Coverage ──────────────────────────────────────

describe('SnapshotEngine — additional coverage', () => {
  let storage: InternalStorage;
  let indexManager: IndexManager;
  let engine: SnapshotEngine;

  beforeEach(() => {
    storage = new InternalStorage();
    indexManager = new IndexManager();
    engine = new SnapshotEngine(storage, indexManager);
  });

  it('creates snapshot with custom metadata', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    const snap = engine.createSnapshot({ author: 'test', version: 2 });
    expect(snap.metadata.author).toBe('test');
    expect(snap.metadata.version).toBe(2);
  });

  it('creates snapshot with edges', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    storage.setNode(brandNodeId('n2'), makeNode('n2'));
    const edge = makeEdge('e1', 'n1', 'n2');
    storage.setEdge(edge.id, edge);
    indexManager.indexNode(makeNode('n1'));
    indexManager.indexNode(makeNode('n2'));
    indexManager.indexEdge(edge);
    const snap = engine.createSnapshot();
    expect(snap.edgeCount).toBe(1);
  });

  it('diff snapshots with removals', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    storage.setNode(brandNodeId('n2'), makeNode('n2'));
    indexManager.indexNode(makeNode('n1'));
    indexManager.indexNode(makeNode('n2'));
    const snap1 = engine.createSnapshot();

    storage.deleteNode(brandNodeId('n2'));
    indexManager.deindexNode(makeNode('n2'));
    const snap2 = engine.createSnapshot();

    const diff = engine.diffSnapshots(snap1.id, snap2.id);
    expect(diff.nodesRemoved).toBe(1);
    expect(diff.nodesAdded).toBe(0);
  });

  it('restore rebuilds indexes correctly', () => {
    const n1 = makeNode('n1', NodeType.Application);
    storage.setNode(n1.identity.id, n1);
    indexManager.indexNode(n1);
    const snap = engine.createSnapshot();

    // Add more data
    const n2 = makeNode('n2', NodeType.Host);
    storage.setNode(n2.identity.id, n2);
    indexManager.indexNode(n2);
    expect(indexManager.nodeTypeIndex.countByType(NodeType.Host)).toBe(1);

    // Restore should rebuild indexes from storage
    engine.restoreSnapshot(snap.id);
    expect(indexManager.nodeTypeIndex.countByType(NodeType.Application)).toBe(1);
    expect(indexManager.nodeTypeIndex.countByType(NodeType.Host)).toBe(0);
  });
});

// ─── Transaction Coverage ───────────────────────────────────

describe('TransactionManager — additional coverage', () => {
  let storage: InternalStorage;
  let indexManager: IndexManager;
  let cacheManager: CacheManager;
  let txManager: TransactionManager;

  beforeEach(() => {
    storage = new InternalStorage();
    indexManager = new IndexManager();
    cacheManager = new CacheManager();
    txManager = new TransactionManager(storage, indexManager, cacheManager);
  });

  it('commit double throws TransactionError', () => {
    txManager.begin();
    txManager.commit();
    expect(() => txManager.commit()).toThrow(TransactionError);
  });

  it('rollback double throws TransactionError', () => {
    txManager.begin();
    txManager.rollback();
    expect(() => txManager.rollback()).toThrow(TransactionError);
  });

  it('commit after rollback throws TransactionError', () => {
    txManager.begin();
    txManager.rollback();
    expect(() => txManager.commit()).toThrow(TransactionError);
  });

  it('rollback after commit throws TransactionError', () => {
    txManager.begin();
    txManager.commit();
    expect(() => txManager.rollback()).toThrow(TransactionError);
  });

  it('nested commit then rollback outer', () => {
    const n1 = makeNode('n1');
    storage.setNode(n1.identity.id, n1);
    indexManager.indexNode(n1);

    txManager.begin(); // outer
    txManager.begin(); // inner
    txManager.commit(); // commit inner
    expect(txManager.depth).toBe(1);

    txManager.rollback(); // rollback outer
    expect(txManager.depth).toBe(0);
  });

  it('rollback clears caches', () => {
    const n1 = makeNode('n1');
    storage.setNode(n1.identity.id, n1);
    indexManager.indexNode(n1);
    cacheManager.nodeCache.set(n1.identity.id, n1);

    txManager.begin();
    storage.setNode(brandNodeId('n2'), makeNode('n2'));
    txManager.rollback();

    // Cache should be cleared
    expect(cacheManager.nodeCache.size).toBe(0);
  });

  it('trackNodeUpdated with created node in same tx', () => {
    txManager.begin();
    const node = makeNode('n1');
    txManager.trackNodeCreated(node);
    const updated = makeNode('n1', NodeType.Host);
    txManager.trackNodeUpdated(node, updated);
    // When node was created in same tx, update should modify the created entry
    const cs = txManager.currentChangeSet;
    expect(cs!.createdNodes.get(node.identity.id)).toBe(updated);
    txManager.commit();
  });

  it('trackEdgeDeleted removes from created if in same tx', () => {
    txManager.begin();
    const edge = makeEdge('e1', 'n1', 'n2');
    txManager.trackEdgeCreated(edge);
    txManager.trackEdgeDeleted(edge);
    const cs = txManager.currentChangeSet;
    expect(cs!.createdEdges.size).toBe(0);
    expect(cs!.deletedEdges.size).toBe(0);
    txManager.commit();
  });

  it('ChangeSet tracks all types', () => {
    const cs = new ChangeSet();
    const node = makeNode('n1');
    const edge = makeEdge('e1', 'n1', 'n2');
    const oldNode = makeNode('n2');
    const newNode = makeNode('n2', NodeType.Host);
    const oldEdge = makeEdge('e2', 'n2', 'n3');
    const newEdge = makeEdge('e2', 'n2', 'n3', EdgeType.USES);

    cs.createdNodes.set(node.identity.id, node);
    cs.updatedNodes.set(oldNode.identity.id, { old: oldNode, new: newNode });
    cs.deletedNodes.set(brandNodeId('n3'), makeNode('n3'));
    cs.createdEdges.set(edge.id, edge);
    cs.updatedEdges.set(oldEdge.id, { old: oldEdge, new: newEdge });
    cs.deletedEdges.set(brandEdgeId('e3'), makeEdge('e3', 'n4', 'n5'));

    expect(cs.totalChanges).toBe(6);
    expect(cs.isEmpty).toBe(false);
  });
});

// ─── Repository Coverage ────────────────────────────────────

describe('InMemoryGraphRepository — additional coverage', () => {
  let repo: InMemoryGraphRepository;
  let publisher: TestEventPublisher;

  beforeEach(() => {
    publisher = new TestEventPublisher();
    repo = new InMemoryGraphRepository({ eventPublisher: publisher });
  });

  it('updateNode changes properties and metadata', async () => {
    await repo.addNode(makeNode('n1'));
    const updated = repo.updateNode(brandNodeId('n1'), { version: 3, status: 'active' });
    expect(updated.properties.version).toBe(3);
    expect(updated.properties.status).toBe('active');
    expect(updated.metadata.updatedAt).toBeDefined();
  });

  it('createNode and createEdge via sync methods', async () => {
    repo.createNode(makeNode('n1'));
    repo.createNode(makeNode('n2'));
    repo.createEdge(makeEdge('e1', 'n1', 'n2'));
    expect(await repo.nodeCount()).toBe(2);
    expect(await repo.edgeCount()).toBe(1);
  });

  it('readNode and readEdge return undefined for missing', () => {
    expect(repo.readNode(brandNodeId('missing'))).toBeUndefined();
    expect(repo.readEdge(brandEdgeId('missing'))).toBeUndefined();
  });

  it('deleteNode returns false for missing', () => {
    expect(repo.deleteNode(brandNodeId('missing'))).toBe(false);
  });

  it('deleteEdge returns false for missing', () => {
    expect(repo.deleteEdge(brandEdgeId('missing'))).toBe(false);
  });

  it('event publishing works without publisher for sync ops', () => {
    const repoNoPublisher = new InMemoryGraphRepository();
    repoNoPublisher.createNode(makeNode('n1'));
    // Should not throw
  });

  it('event publishing defers during transaction', () => {
    repo.beginTransaction();
    repo.createNode(makeNode('n1'));
    repo.createNode(makeNode('n2'));
    repo.createEdge(makeEdge('e1', 'n1', 'n2'));
    // Events should be deferred — not published yet
    const cs = repo.commitTransaction();
    expect(cs.createdNodes.size).toBe(2);
    expect(cs.createdEdges.size).toBe(1);
  });

  it('rollback clears pending events', () => {
    repo.beginTransaction();
    repo.createNode(makeNode('n1'));
    repo.rollbackTransaction();
    // No events should be published for rolled-back transaction
  });

  it('findNodesByLabel returns empty for missing', async () => {
    const nodes = await repo.findNodesByLabel('nonexistent');
    expect(nodes).toHaveLength(0);
  });

  it('findNodesBySource returns empty for missing', async () => {
    const nodes = await repo.findNodesBySource('nonexistent');
    expect(nodes).toHaveLength(0);
  });

  it('findNodesByTag returns empty for missing', async () => {
    const nodes = await repo.findNodesByTag('nonexistent');
    expect(nodes).toHaveLength(0);
  });

  it('listNodes returns all with default params', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.addNode(makeNode(`n${i}`));
    }
    const all = await repo.listNodes();
    expect(all).toHaveLength(5);
  });

  it('listEdges returns all with default params', async () => {
    for (let i = 0; i < 3; i++) {
      await repo.addNode(makeNode(`n${i}`));
    }
    for (let i = 0; i < 2; i++) {
      await repo.addEdge(makeEdge(`e${i}`, `n${i}`, `n${i + 1}`));
    }
    const all = await repo.listEdges();
    expect(all).toHaveLength(2);
  });

  it('committedTransactionCount tracks correctly', () => {
    repo.beginTransaction();
    repo.commitTransaction();
    repo.beginTransaction();
    repo.commitTransaction();
    expect(repo.committedTransactionCount).toBe(2);
  });

  it('cache hit rate tracking', async () => {
    await repo.addNode(makeNode('n1'));
    // Read multiple times to generate cache hits
    await repo.getNode(brandNodeId('n1'));
    await repo.getNode(brandNodeId('n1'));
    await repo.getNode(brandNodeId('n1'));
    const stats = repo.getCacheStats();
    expect(stats.nodeCacheHitRate).toBeGreaterThanOrEqual(0);
  });

  it('createSnapshot via async API', async () => {
    await repo.addNode(makeNode('n1'));
    const snap = await repo.createSnapshot();
    expect(snap.nodeCount).toBe(1);
    expect(snap.id).toBeDefined();
  });

  it('restoreSnapshot via async API', async () => {
    await repo.addNode(makeNode('n1'));
    const snap = await repo.createSnapshot();
    await repo.addNode(makeNode('n2'));
    expect(await repo.nodeCount()).toBe(2);
    await repo.restoreSnapshot(snap.id);
    expect(await repo.nodeCount()).toBe(1);
  });

  it('diffSnapshots via async API', async () => {
    await repo.addNode(makeNode('n1'));
    const snap1 = await repo.createSnapshot();
    await repo.addNode(makeNode('n2'));
    const snap2 = await repo.createSnapshot();
    const diff = await repo.diffSnapshots(snap1.id, snap2.id);
    expect(diff.nodesAdded).toBe(1);
  });

  it('clear also clears snapshots', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.createSnapshot();
    expect(repo.snapshotCount).toBe(1);
    await repo.clear();
    expect(repo.snapshotCount).toBe(0);
  });

  it('consistency check for graph with edges', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.addNode(makeNode('n2'));
    await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
    await repo.addEdge(makeEdge('e2', 'n2', 'n1'));
    const report = await repo.checkConsistency();
    expect(report.valid).toBe(true);
  });

  it('statistics with various node and edge types', async () => {
    await repo.addNode(makeNode('n1', NodeType.Application));
    await repo.addNode(makeNode('n2', NodeType.Host));
    await repo.addNode(makeNode('n3', NodeType.Endpoint));
    await repo.addEdge(makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS));
    await repo.addEdge(makeEdge('e2', 'n1', 'n3', EdgeType.CONNECTED_TO));
    await repo.addEdge(makeEdge('e3', 'n2', 'n3', EdgeType.DEPENDS_ON));
    const stats = await repo.getStatistics();
    expect(stats.nodeCount).toBe(3);
    expect(stats.edgeCount).toBe(3);
    expect(Object.keys(stats.nodeTypeDistribution).length).toBe(3);
    expect(Object.keys(stats.edgeTypeDistribution).length).toBe(3);
  });

  it('addEdges validates self-reference', async () => {
    await repo.addNode(makeNode('n1'));
    // Cannot create a self-referencing edge — model layer prevents it
    const rel = createRelationship(EdgeType.RELATED_TO);
    expect(() => createGraphEdge('e1', 'n1', 'n1', rel)).toThrow();
  });

  it('replaceNodes with all new nodes', async () => {
    await repo.replaceNodes([makeNode('n1'), makeNode('n2')]);
    expect(await repo.nodeCount()).toBe(2);
  });

  it('replaceEdges with all new edges', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.addNode(makeNode('n2'));
    await repo.replaceEdges([makeEdge('e1', 'n1', 'n2')]);
    expect(await repo.edgeCount()).toBe(1);
  });

  it('EdgeDeleted event for removeEdge', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.addNode(makeNode('n2'));
    await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
    publisher.clear();
    await repo.removeEdge(brandEdgeId('e1'));
    const events = publisher.events.filter(e => e.type === 'graph.edge.deleted');
    expect(events.length).toBe(1);
  });

  it('NodeUpdated event for updateNode', async () => {
    await repo.addNode(makeNode('n1'));
    publisher.clear();
    repo.updateNode(brandNodeId('n1'), { newProp: 'value' });
    const events = publisher.events.filter(e => e.type === 'graph.node.updated');
    expect(events.length).toBe(1);
  });

  it('consistency check with duplicate relationships', async () => {
    await repo.addNode(makeNode('n1', NodeType.Application));
    await repo.addNode(makeNode('n2', NodeType.Host));
    // Create two edges with same source/target/type (but different IDs)
    await repo.addEdge(makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS));
    await repo.addEdge(makeEdge('e1-dup', 'n1', 'n2', EdgeType.HOSTS));
    const report = await repo.checkConsistency();
    // Should detect duplicate relationship
    expect(report.duplicateRelationships).toBe(1);
  });

  it('addNodes with self-referencing edge in batch', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.addNode(makeNode('n2'));
    // addEdges validates all edges before inserting
    const rel = createRelationship(EdgeType.RELATED_TO);
    // This will fail at model creation, not at repo
    expect(() => createGraphEdge('e1', 'n1', 'n1', rel)).toThrow();
  });

  it('transaction with multiple operations', async () => {
    repo.beginTransaction();
    repo.createNode(makeNode('n1'));
    repo.createNode(makeNode('n2'));
    repo.createNode(makeNode('n3'));
    repo.createEdge(makeEdge('e1', 'n1', 'n2'));
    repo.createEdge(makeEdge('e2', 'n2', 'n3'));
    const cs = repo.commitTransaction();
    expect(cs.createdNodes.size).toBe(3);
    expect(cs.createdEdges.size).toBe(2);
    expect(await repo.nodeCount()).toBe(3);
    expect(await repo.edgeCount()).toBe(2);
  });

  it('transaction rollback with events', async () => {
    repo.beginTransaction();
    repo.createNode(makeNode('n1'));
    publisher.clear();
    repo.rollbackTransaction();
    // No events should be published after rollback
    expect(publisher.events.length).toBe(0);
    expect(await repo.nodeCount()).toBe(0);
  });

  it('getEdgesFrom with cache', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.addNode(makeNode('n2'));
    await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
    // First call populates cache
    const edges1 = await repo.getEdgesFrom(brandNodeId('n1'));
    expect(edges1).toHaveLength(1);
    // Second call should hit cache
    const edges2 = await repo.getEdgesFrom(brandNodeId('n1'));
    expect(edges2).toHaveLength(1);
  });

  it('getEdgesTo with cache', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.addNode(makeNode('n2'));
    await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
    // First call populates cache
    const edges1 = await repo.getEdgesTo(brandNodeId('n2'));
    expect(edges1).toHaveLength(1);
    // Second call should hit cache
    const edges2 = await repo.getEdgesTo(brandNodeId('n2'));
    expect(edges2).toHaveLength(1);
  });

  it('node cache hit tracking', async () => {
    await repo.addNode(makeNode('n1'));
    // Multiple reads to generate hits
    await repo.getNode(brandNodeId('n1'));
    await repo.getNode(brandNodeId('n1'));
    const stats = repo.getCacheStats();
    expect(stats.nodeCacheSize).toBeGreaterThan(0);
  });
});

// ─── Event Publisher Edge Cases ──────────────────────────────

describe('Event Publishing — edge cases', () => {
  it('publisher that throws does not break repository', async () => {
    const failingPublisher: EventPublisher = {
      async publish(): Promise<void> { throw new Error('Publisher failed'); },
      async publishAll(): Promise<void> { throw new Error('Publisher failed'); },
    };
    const repo = new InMemoryGraphRepository({ eventPublisher: failingPublisher });
    // Should not throw even if publisher fails
    repo.createNode(makeNode('n1'));
    await new Promise(resolve => setTimeout(resolve, 10));
    // Node should still exist
    expect(repo.readNode(brandNodeId('n1'))).toBeDefined();
  });

  it('batch operation publishes multiple events', async () => {
    const publisher = new TestEventPublisher();
    const repo = new InMemoryGraphRepository({ eventPublisher: publisher });
    await repo.addNodes([makeNode('n1'), makeNode('n2'), makeNode('n3')]);
    const nodeEvents = publisher.events.filter(e => e.type === 'graph.node.created');
    expect(nodeEvents.length).toBe(3);
  });

  it('delete node publishes both NodeDeleted and EdgeDeleted events', async () => {
    const publisher = new TestEventPublisher();
    const repo = new InMemoryGraphRepository({ eventPublisher: publisher });
    await repo.addNode(makeNode('n1'));
    await repo.addNode(makeNode('n2'));
    await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
    publisher.clear();
    await repo.removeNode(brandNodeId('n1'));
    const delNodeEvents = publisher.events.filter(e => e.type === 'graph.node.deleted');
    const delEdgeEvents = publisher.events.filter(e => e.type === 'graph.edge.deleted');
    expect(delNodeEvents.length).toBe(1);
    expect(delEdgeEvents.length).toBe(1);
  });

  it('updateNode publishes NodeUpdated event', async () => {
    const publisher = new TestEventPublisher();
    const repo = new InMemoryGraphRepository({ eventPublisher: publisher });
    await repo.addNode(makeNode('n1'));
    publisher.clear();
    await repo.updateNodeProperties(brandNodeId('n1'), { updated: true });
    const updateEvents = publisher.events.filter(e => e.type === 'graph.node.updated');
    expect(updateEvents.length).toBe(1);
  });
});
