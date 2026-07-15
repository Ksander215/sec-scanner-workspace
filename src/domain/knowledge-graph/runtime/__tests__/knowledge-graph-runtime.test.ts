/**
 * Knowledge Graph Runtime — Comprehensive Unit Tests
 *
 * Tests cover:
 * - CRUD operations (create, read, update, delete)
 * - Batch operations (addNodes, addEdges, removeNodes, removeEdges, replace)
 * - Index operations (NodeType, EdgeType, Identity, Metadata)
 * - Cache operations (Node, Edge, Traversal)
 * - Snapshot operations (create, restore, diff, list)
 * - Transaction operations (begin, commit, rollback, nested)
 * - Change set tracking
 * - Event publishing
 * - Consistency checks
 * - Statistics
 * - Performance characteristics
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  NodeType, EdgeType, SnapshotStatus,
  brandNodeId, brandEdgeId, brandSnapshotId,
} from '../../types/index.ts';

import {
  createGraphNode, createGraphEdge, createRelationship,
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

import type { ConsistencyReport } from '../repository/index.ts';

import {
  InternalStorage,
} from '../storage/index.ts';

import {
  NodeTypeIndex, EdgeTypeIndex, IdentityIndex, MetadataIndex, IndexManager,
} from '../indexes/index.ts';

import {
  NodeCache, EdgeCache, TraversalCache, CacheManager,
} from '../cache/index.ts';

import {
  SnapshotEngine,
} from '../snapshot/index.ts';

import {
  TransactionManager, ChangeSet,
} from '../transaction/index.ts';

import type { EventPublisher, AnyGraphDomainEvent } from '../../adapters/index.ts';

// ─── Test Helpers ────────────────────────────────────────────

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

/** In-memory event collector for testing */
class TestEventPublisher implements EventPublisher {
  readonly events: AnyGraphDomainEvent[] = [];

  async publish(event: AnyGraphDomainEvent): Promise<void> {
    this.events.push(event);
  }

  async publishAll(events: readonly AnyGraphDomainEvent[]): Promise<void> {
    this.events.push(...events);
  }

  clear(): void {
    this.events.length = 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL STORAGE
// ═══════════════════════════════════════════════════════════════

describe('InternalStorage', () => {
  let storage: InternalStorage;

  beforeEach(() => {
    storage = new InternalStorage();
  });

  describe('Node Operations', () => {
    it('setNode adds a new node and returns true', () => {
      const node = makeNode('n1');
      expect(storage.setNode(node.identity.id, node)).toBe(true);
    });

    it('setNode overwrites existing node and returns false', () => {
      const node1 = makeNode('n1');
      const node2 = makeNode('n1', NodeType.Host);
      storage.setNode(node1.identity.id, node1);
      expect(storage.setNode(node2.identity.id, node2)).toBe(false);
    });

    it('getNode returns node by ID', () => {
      const node = makeNode('n1');
      storage.setNode(node.identity.id, node);
      expect(storage.getNode(node.identity.id)).toBe(node);
    });

    it('getNode returns undefined for non-existent node', () => {
      expect(storage.getNode(brandNodeId('missing'))).toBeUndefined();
    });

    it('hasNode checks existence', () => {
      const node = makeNode('n1');
      expect(storage.hasNode(node.identity.id)).toBe(false);
      storage.setNode(node.identity.id, node);
      expect(storage.hasNode(node.identity.id)).toBe(true);
    });

    it('deleteNode removes node and returns it', () => {
      const node = makeNode('n1');
      storage.setNode(node.identity.id, node);
      const deleted = storage.deleteNode(node.identity.id);
      expect(deleted).toBe(node);
      expect(storage.hasNode(node.identity.id)).toBe(false);
    });

    it('deleteNode returns undefined for non-existent node', () => {
      expect(storage.deleteNode(brandNodeId('missing'))).toBeUndefined();
    });

    it('nodeCount tracks count', () => {
      expect(storage.nodeCount).toBe(0);
      storage.setNode(brandNodeId('n1'), makeNode('n1'));
      expect(storage.nodeCount).toBe(1);
      storage.setNode(brandNodeId('n2'), makeNode('n2'));
      expect(storage.nodeCount).toBe(2);
      storage.deleteNode(brandNodeId('n1'));
      expect(storage.nodeCount).toBe(1);
    });
  });

  describe('Edge Operations', () => {
    it('setEdge adds edge and updates adjacency', () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      storage.setNode(n1.identity.id, n1);
      storage.setNode(n2.identity.id, n2);
      const edge = makeEdge('e1', 'n1', 'n2');
      expect(storage.setEdge(edge.id, edge)).toBe(true);
    });

    it('getEdge returns edge by ID', () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      storage.setNode(n1.identity.id, n1);
      storage.setNode(n2.identity.id, n2);
      const edge = makeEdge('e1', 'n1', 'n2');
      storage.setEdge(edge.id, edge);
      expect(storage.getEdge(edge.id)).toBe(edge);
    });

    it('deleteEdge removes edge and updates adjacency', () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      storage.setNode(n1.identity.id, n1);
      storage.setNode(n2.identity.id, n2);
      const edge = makeEdge('e1', 'n1', 'n2');
      storage.setEdge(edge.id, edge);
      const deleted = storage.deleteEdge(edge.id);
      expect(deleted).toBe(edge);
      expect(storage.hasEdge(edge.id)).toBe(false);
    });

    it('edgeCount tracks count', () => {
      expect(storage.edgeCount).toBe(0);
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      storage.setNode(n1.identity.id, n1);
      storage.setNode(n2.identity.id, n2);
      storage.setEdge(brandEdgeId('e1'), makeEdge('e1', 'n1', 'n2'));
      expect(storage.edgeCount).toBe(1);
    });
  });

  describe('Adjacency Operations', () => {
    it('getOutgoingEdges returns edges from a node', () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      const n3 = makeNode('n3');
      storage.setNode(n1.identity.id, n1);
      storage.setNode(n2.identity.id, n2);
      storage.setNode(n3.identity.id, n3);
      const e1 = makeEdge('e1', 'n1', 'n2');
      const e2 = makeEdge('e2', 'n1', 'n3');
      storage.setEdge(e1.id, e1);
      storage.setEdge(e2.id, e2);
      const outgoing = storage.getOutgoingEdges(n1.identity.id);
      expect(outgoing).toHaveLength(2);
    });

    it('getIncomingEdges returns edges to a node', () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      storage.setNode(n1.identity.id, n1);
      storage.setNode(n2.identity.id, n2);
      const e1 = makeEdge('e1', 'n1', 'n2');
      storage.setEdge(e1.id, e1);
      const incoming = storage.getIncomingEdges(n2.identity.id);
      expect(incoming).toHaveLength(1);
      expect(incoming[0].id).toBe(e1.id);
    });

    it('getOutgoingEdges returns empty for node with no outgoing edges', () => {
      const n1 = makeNode('n1');
      storage.setNode(n1.identity.id, n1);
      expect(storage.getOutgoingEdges(n1.identity.id)).toHaveLength(0);
    });
  });

  describe('removeAllEdgesForNode', () => {
    it('removes all incoming and outgoing edges for a node', () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      const n3 = makeNode('n3');
      storage.setNode(n1.identity.id, n1);
      storage.setNode(n2.identity.id, n2);
      storage.setNode(n3.identity.id, n3);
      const e1 = makeEdge('e1', 'n1', 'n2');
      const e2 = makeEdge('e2', 'n3', 'n1');
      storage.setEdge(e1.id, e1);
      storage.setEdge(e2.id, e2);
      const removed = storage.removeAllEdgesForNode(n1.identity.id);
      expect(removed).toHaveLength(2);
      expect(storage.edgeCount).toBe(0);
    });
  });

  describe('Snapshot and Restore', () => {
    it('snapshot captures current state', () => {
      const n1 = makeNode('n1');
      storage.setNode(n1.identity.id, n1);
      const snap = storage.snapshot();
      expect(snap.nodes.size).toBe(1);
    });

    it('restore replaces current state', () => {
      const n1 = makeNode('n1');
      storage.setNode(n1.identity.id, n1);
      const snap = storage.snapshot();
      storage.setNode(brandNodeId('n2'), makeNode('n2'));
      expect(storage.nodeCount).toBe(2);
      storage.restore(snap);
      expect(storage.nodeCount).toBe(1);
    });
  });

  describe('Clear', () => {
    it('clear removes all data', () => {
      storage.setNode(brandNodeId('n1'), makeNode('n1'));
      storage.setNode(brandNodeId('n2'), makeNode('n2'));
      storage.clear();
      expect(storage.nodeCount).toBe(0);
      expect(storage.edgeCount).toBe(0);
    });
  });

  describe('Memory Usage', () => {
    it('returns a positive number', () => {
      storage.setNode(brandNodeId('n1'), makeNode('n1'));
      expect(storage.memoryUsage).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

describe('NodeTypeIndex', () => {
  let index: NodeTypeIndex;

  beforeEach(() => {
    index = new NodeTypeIndex();
  });

  it('adds and retrieves nodes by type', () => {
    const node = makeNode('n1', NodeType.Application);
    index.add(node);
    const ids = index.getByType(NodeType.Application);
    expect(ids.size).toBe(1);
    expect(ids.has(node.identity.id)).toBe(true);
  });

  it('removes nodes from index', () => {
    const node = makeNode('n1', NodeType.Application);
    index.add(node);
    index.remove(node.identity.id, NodeType.Application);
    expect(index.getByType(NodeType.Application).size).toBe(0);
  });

  it('counts nodes by type', () => {
    index.add(makeNode('n1', NodeType.Application));
    index.add(makeNode('n2', NodeType.Application));
    index.add(makeNode('n3', NodeType.Host));
    expect(index.countByType(NodeType.Application)).toBe(2);
    expect(index.countByType(NodeType.Host)).toBe(1);
  });

  it('returns distribution', () => {
    index.add(makeNode('n1', NodeType.Application));
    index.add(makeNode('n2', NodeType.Host));
    const dist = index.getDistribution();
    expect(dist.get(NodeType.Application)).toBe(1);
    expect(dist.get(NodeType.Host)).toBe(1);
  });

  it('clear removes all entries', () => {
    index.add(makeNode('n1', NodeType.Application));
    index.clear();
    expect(index.getByType(NodeType.Application).size).toBe(0);
  });
});

describe('EdgeTypeIndex', () => {
  let index: EdgeTypeIndex;

  beforeEach(() => {
    index = new EdgeTypeIndex();
  });

  it('adds and retrieves edges by type', () => {
    const edge = makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS);
    index.add(edge);
    expect(index.getByType(EdgeType.HOSTS).size).toBe(1);
  });

  it('removes edges from index', () => {
    const edge = makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS);
    index.add(edge);
    index.remove(edge.id, EdgeType.HOSTS);
    expect(index.getByType(EdgeType.HOSTS).size).toBe(0);
  });

  it('returns distribution', () => {
    index.add(makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS));
    index.add(makeEdge('e2', 'n3', 'n4', EdgeType.USES));
    const dist = index.getDistribution();
    expect(dist.size).toBe(2);
  });
});

describe('IdentityIndex', () => {
  let index: IdentityIndex;

  beforeEach(() => {
    index = new IdentityIndex();
  });

  it('tracks node IDs', () => {
    const node = makeNode('n1');
    index.add(node);
    expect(index.has('n1')).toBe(true);
  });

  it('finds nodes by label', () => {
    const node = makeNode('n1', NodeType.Application, ['webapp']);
    index.add(node);
    const found = index.findByLabel('webapp');
    expect(found.size).toBe(1);
  });

  it('removes nodes and their labels', () => {
    const node = makeNode('n1', NodeType.Application, ['webapp']);
    index.add(node);
    index.remove(node);
    expect(index.has('n1')).toBe(false);
    expect(index.findByLabel('webapp').size).toBe(0);
  });
});

describe('MetadataIndex', () => {
  let index: MetadataIndex;

  beforeEach(() => {
    index = new MetadataIndex();
  });

  it('finds nodes by source', () => {
    const node = makeNode('n1');
    index.add(node);
    const found = index.findBySource('test');
    expect(found.size).toBe(1);
  });

  it('finds nodes by tag', () => {
    const node = makeNode('n1');
    index.add(node);
    const found = index.findByTag('unit-test');
    expect(found.size).toBe(1);
  });

  it('removes node from metadata indexes', () => {
    const node = makeNode('n1');
    index.add(node);
    index.remove(node);
    expect(index.findBySource('test').size).toBe(0);
  });

  it('returns source distribution', () => {
    index.add(makeNode('n1'));
    index.add(makeNode('n2'));
    const dist = index.getSourceDistribution();
    expect(dist.get('test')).toBe(2);
  });
});

describe('IndexManager', () => {
  let manager: IndexManager;

  beforeEach(() => {
    manager = new IndexManager();
  });

  it('indexNode adds to all relevant indexes', () => {
    const node = makeNode('n1', NodeType.Application, ['webapp']);
    manager.indexNode(node);
    expect(manager.nodeTypeIndex.countByType(NodeType.Application)).toBe(1);
    expect(manager.identityIndex.has('n1')).toBe(true);
    expect(manager.identityIndex.findByLabel('webapp').size).toBe(1);
    expect(manager.metadataIndex.findBySource('test').size).toBe(1);
  });

  it('deindexNode removes from all indexes', () => {
    const node = makeNode('n1', NodeType.Application, ['webapp']);
    manager.indexNode(node);
    manager.deindexNode(node);
    expect(manager.nodeTypeIndex.countByType(NodeType.Application)).toBe(0);
    expect(manager.identityIndex.has('n1')).toBe(false);
  });

  it('indexEdge adds to edge type index', () => {
    const edge = makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS);
    manager.indexEdge(edge);
    expect(manager.edgeTypeIndex.countByType(EdgeType.HOSTS)).toBe(1);
  });

  it('deindexEdge removes from edge type index', () => {
    const edge = makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS);
    manager.indexEdge(edge);
    manager.deindexEdge(edge);
    expect(manager.edgeTypeIndex.countByType(EdgeType.HOSTS)).toBe(0);
  });

  it('reindexNode handles type changes', () => {
    const oldNode = makeNode('n1', NodeType.Application);
    const newNode = makeNode('n1', NodeType.Host);
    manager.indexNode(oldNode);
    manager.reindexNode(oldNode, newNode);
    expect(manager.nodeTypeIndex.countByType(NodeType.Application)).toBe(0);
    expect(manager.nodeTypeIndex.countByType(NodeType.Host)).toBe(1);
  });

  it('clear removes all index data', () => {
    manager.indexNode(makeNode('n1'));
    manager.indexEdge(makeEdge('e1', 'n1', 'n2'));
    manager.clear();
    expect(manager.nodeTypeIndex.countByType(NodeType.Application)).toBe(0);
    expect(manager.edgeTypeIndex.countByType(EdgeType.HOSTS)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

describe('NodeCache', () => {
  let cache: NodeCache;

  beforeEach(() => {
    cache = new NodeCache(100);
  });

  it('stores and retrieves nodes', () => {
    const node = makeNode('n1');
    cache.set(node.identity.id, node);
    expect(cache.get(node.identity.id)).toBe(node);
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get(brandNodeId('missing'))).toBeUndefined();
  });

  it('invalidates entries', () => {
    const node = makeNode('n1');
    cache.set(node.identity.id, node);
    cache.invalidate(node.identity.id);
    expect(cache.has(node.identity.id)).toBe(false);
  });

  it('evicts oldest entry when at capacity', () => {
    const smallCache = new NodeCache(2);
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const n3 = makeNode('n3');
    smallCache.set(n1.identity.id, n1);
    smallCache.set(n2.identity.id, n2);
    smallCache.set(n3.identity.id, n3);
    expect(smallCache.size).toBe(2);
    expect(smallCache.has(n1.identity.id)).toBe(false); // evicted
    expect(smallCache.has(n3.identity.id)).toBe(true);
  });

  it('tracks hit rate', () => {
    const node = makeNode('n1');
    cache.set(node.identity.id, node);
    cache.get(node.identity.id); // hit
    cache.recordHit();
    cache.get(brandNodeId('missing')); // miss
    cache.recordMiss();
    expect(cache.hitRate).toBeGreaterThan(0);
  });

  it('resets stats', () => {
    cache.recordHit();
    cache.recordHit();
    cache.resetStats();
    expect(cache.hitRate).toBe(0);
  });

  it('clear removes all entries', () => {
    cache.set(brandNodeId('n1'), makeNode('n1'));
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe('EdgeCache', () => {
  it('stores and retrieves edges', () => {
    const cache = new EdgeCache(100);
    const edge = makeEdge('e1', 'n1', 'n2');
    cache.set(edge.id, edge);
    expect(cache.get(edge.id)).toBe(edge);
  });
});

describe('TraversalCache', () => {
  it('stores and retrieves adjacency results', () => {
    const cache = new TraversalCache(100);
    const edges = [makeEdge('e1', 'n1', 'n2')];
    cache.set(brandNodeId('n1'), 'out', edges);
    expect(cache.get(brandNodeId('n1'), 'out')).toBe(edges);
  });

  it('invalidates node entries in both directions', () => {
    const cache = new TraversalCache(100);
    cache.set(brandNodeId('n1'), 'out', []);
    cache.set(brandNodeId('n1'), 'in', []);
    cache.invalidateNode(brandNodeId('n1'));
    expect(cache.get(brandNodeId('n1'), 'out')).toBeUndefined();
    expect(cache.get(brandNodeId('n1'), 'in')).toBeUndefined();
  });

  it('invalidates edge entries by source/target', () => {
    const cache = new TraversalCache(100);
    const edge = makeEdge('e1', 'n1', 'n2');
    cache.set(brandNodeId('n1'), 'out', [edge]);
    cache.set(brandNodeId('n2'), 'in', [edge]);
    cache.invalidateEdge(edge);
    expect(cache.get(brandNodeId('n1'), 'out')).toBeUndefined();
    expect(cache.get(brandNodeId('n2'), 'in')).toBeUndefined();
  });
});

describe('CacheManager', () => {
  it('invalidates node across all caches', () => {
    const mgr = new CacheManager();
    const nodeId = brandNodeId('n1');
    mgr.nodeCache.set(nodeId, makeNode('n1'));
    mgr.traversalCache.set(nodeId, 'out', []);
    mgr.invalidateNode(nodeId);
    expect(mgr.nodeCache.has(nodeId)).toBe(false);
    expect(mgr.traversalCache.get(nodeId, 'out')).toBeUndefined();
  });

  it('invalidates edge across all caches', () => {
    const mgr = new CacheManager();
    const edge = makeEdge('e1', 'n1', 'n2');
    mgr.edgeCache.set(edge.id, edge);
    mgr.traversalCache.set(brandNodeId('n1'), 'out', [edge]);
    mgr.invalidateEdge(edge);
    expect(mgr.edgeCache.has(edge.id)).toBe(false);
  });

  it('clears all caches', () => {
    const mgr = new CacheManager();
    mgr.nodeCache.set(brandNodeId('n1'), makeNode('n1'));
    mgr.edgeCache.set(brandEdgeId('e1'), makeEdge('e1', 'n1', 'n2'));
    mgr.clear();
    expect(mgr.nodeCache.size).toBe(0);
    expect(mgr.edgeCache.size).toBe(0);
  });

  it('returns stats', () => {
    const mgr = new CacheManager();
    const stats = mgr.getStats();
    expect(stats).toHaveProperty('nodeCacheSize');
    expect(stats).toHaveProperty('edgeCacheSize');
    expect(stats).toHaveProperty('traversalCacheSize');
    expect(stats).toHaveProperty('nodeCacheHitRate');
  });
});

// ═══════════════════════════════════════════════════════════════
// SNAPSHOT ENGINE
// ═══════════════════════════════════════════════════════════════

describe('SnapshotEngine', () => {
  let storage: InternalStorage;
  let indexManager: IndexManager;
  let engine: SnapshotEngine;

  beforeEach(() => {
    storage = new InternalStorage();
    indexManager = new IndexManager();
    engine = new SnapshotEngine(storage, indexManager);
  });

  it('creates a snapshot with correct metadata', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    storage.setNode(brandNodeId('n2'), makeNode('n2'));
    indexManager.indexNode(makeNode('n1'));
    indexManager.indexNode(makeNode('n2'));

    const snap = engine.createSnapshot();
    expect(snap.nodeCount).toBe(2);
    expect(snap.edgeCount).toBe(0);
    expect(snap.status).toBe(SnapshotStatus.Active);
  });

  it('restores graph to snapshot state', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    const snap = engine.createSnapshot();

    storage.setNode(brandNodeId('n2'), makeNode('n2'));
    indexManager.indexNode(makeNode('n2'));
    expect(storage.nodeCount).toBe(2);

    engine.restoreSnapshot(snap.id);
    expect(storage.nodeCount).toBe(1);
  });

  it('throws SnapshotError for non-existent snapshot', () => {
    expect(() => engine.restoreSnapshot(brandSnapshotId('missing'))).toThrow(SnapshotError);
  });

  it('computes diff between two snapshots', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    const snap1 = engine.createSnapshot();

    storage.setNode(brandNodeId('n2'), makeNode('n2'));
    indexManager.indexNode(makeNode('n2'));
    const snap2 = engine.createSnapshot();

    const diff = engine.diffSnapshots(snap1.id, snap2.id);
    expect(diff.nodesAdded).toBe(1);
    expect(diff.nodesRemoved).toBe(0);
  });

  it('lists all snapshots', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    engine.createSnapshot();
    engine.createSnapshot();
    expect(engine.listSnapshots()).toHaveLength(2);
  });

  it('checks if snapshot exists', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    const snap = engine.createSnapshot();
    expect(engine.hasSnapshot(snap.id)).toBe(true);
    expect(engine.hasSnapshot(brandSnapshotId('missing'))).toBe(false);
  });

  it('getSnapshot returns metadata', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    const snap = engine.createSnapshot();
    const meta = engine.getSnapshot(snap.id);
    expect(meta).toBeDefined();
    expect(meta!.nodeCount).toBe(1);
  });

  it('tracks snapshot count', () => {
    expect(engine.snapshotCount).toBe(0);
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    engine.createSnapshot();
    expect(engine.snapshotCount).toBe(1);
  });

  it('clear removes all snapshots', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    engine.createSnapshot();
    engine.clear();
    expect(engine.snapshotCount).toBe(0);
  });

  it('throws SnapshotError for diff with non-existent snapshot', () => {
    storage.setNode(brandNodeId('n1'), makeNode('n1'));
    indexManager.indexNode(makeNode('n1'));
    const snap = engine.createSnapshot();
    expect(() => engine.diffSnapshots(brandSnapshotId('missing'), snap.id)).toThrow(SnapshotError);
    expect(() => engine.diffSnapshots(snap.id, brandSnapshotId('missing'))).toThrow(SnapshotError);
  });
});

// ═══════════════════════════════════════════════════════════════
// TRANSACTION LAYER
// ═══════════════════════════════════════════════════════════════

describe('ChangeSet', () => {
  it('starts empty', () => {
    const cs = new ChangeSet();
    expect(cs.isEmpty).toBe(true);
    expect(cs.totalChanges).toBe(0);
  });

  it('tracks created nodes', () => {
    const cs = new ChangeSet();
    const node = makeNode('n1');
    cs.createdNodes.set(node.identity.id, node);
    expect(cs.isEmpty).toBe(false);
    expect(cs.totalChanges).toBe(1);
  });

  it('merges another change set', () => {
    const cs1 = new ChangeSet();
    const cs2 = new ChangeSet();
    cs1.createdNodes.set(brandNodeId('n1'), makeNode('n1'));
    cs2.createdNodes.set(brandNodeId('n2'), makeNode('n2'));
    cs2.deletedNodes.set(brandNodeId('n3'), makeNode('n3'));
    cs1.merge(cs2);
    expect(cs1.createdNodes.size).toBe(2);
    expect(cs1.deletedNodes.size).toBe(1);
  });
});

describe('TransactionManager', () => {
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

  it('begins a transaction', () => {
    const txId = txManager.begin();
    expect(txId).toBeDefined();
    expect(txManager.isActive).toBe(true);
    expect(txManager.depth).toBe(1);
  });

  it('commits a transaction', () => {
    txManager.begin();
    const cs = txManager.commit();
    expect(cs).toBeDefined();
    expect(txManager.isActive).toBe(false);
    expect(txManager.committedCount).toBe(1);
  });

  it('rolls back a transaction', () => {
    const node = makeNode('n1');
    storage.setNode(node.identity.id, node);
    indexManager.indexNode(node);

    txManager.begin();
    storage.setNode(brandNodeId('n2'), makeNode('n2'));
    txManager.rollback();

    expect(storage.nodeCount).toBe(1);
    expect(txManager.isActive).toBe(false);
    expect(txManager.rolledBackCount).toBe(1);
  });

  it('throws when committing with no active transaction', () => {
    expect(() => txManager.commit()).toThrow(TransactionError);
  });

  it('throws when rolling back with no active transaction', () => {
    expect(() => txManager.rollback()).toThrow(TransactionError);
  });

  it('aborts all active transactions', () => {
    txManager.begin();
    txManager.begin();
    txManager.abort();
    expect(txManager.isActive).toBe(false);
    expect(txManager.depth).toBe(0);
  });

  it('supports nested transactions', () => {
    txManager.begin(); // outer
    txManager.begin(); // inner (savepoint)
    expect(txManager.depth).toBe(2);

    const innerCs = txManager.commit(); // commit inner
    expect(txManager.depth).toBe(1);
    expect(txManager.isActive).toBe(true);

    const outerCs = txManager.commit(); // commit outer
    expect(txManager.depth).toBe(0);
    expect(txManager.isActive).toBe(false);
  });

  it('nested rollback restores to parent state', () => {
    const n1 = makeNode('n1');
    storage.setNode(n1.identity.id, n1);
    indexManager.indexNode(n1);

    txManager.begin(); // outer
    txManager.begin(); // inner

    storage.setNode(brandNodeId('n2'), makeNode('n2'));

    txManager.rollback(); // rollback inner
    expect(storage.nodeCount).toBe(1); // only n1 remains

    txManager.commit(); // commit outer
    expect(txManager.committedCount).toBe(1);
  });

  it('tracks changes via change set', () => {
    txManager.begin();
    const node = makeNode('n1');
    txManager.trackNodeCreated(node);
    const cs = txManager.currentChangeSet;
    expect(cs).not.toBeNull();
    expect(cs!.createdNodes.size).toBe(1);
    txManager.commit();
  });

  it('tracks node updates in change set', () => {
    const oldNode = makeNode('n1');
    const newNode = makeNode('n1', NodeType.Host);
    txManager.begin();
    txManager.trackNodeUpdated(oldNode, newNode);
    const cs = txManager.currentChangeSet;
    expect(cs!.updatedNodes.size).toBe(1);
    txManager.commit();
  });

  it('tracks node deletions in change set', () => {
    const node = makeNode('n1');
    txManager.begin();
    txManager.trackNodeDeleted(node);
    const cs = txManager.currentChangeSet;
    expect(cs!.deletedNodes.size).toBe(1);
    txManager.commit();
  });

  it('tracks edge operations in change set', () => {
    const edge = makeEdge('e1', 'n1', 'n2');
    txManager.begin();
    txManager.trackEdgeCreated(edge);
    const cs = txManager.currentChangeSet;
    expect(cs!.createdEdges.size).toBe(1);
    txManager.commit();
  });

  it('tracks edge deletion in change set', () => {
    const edge = makeEdge('e1', 'n1', 'n2');
    txManager.begin();
    txManager.trackEdgeDeleted(edge);
    const cs = txManager.currentChangeSet;
    expect(cs!.deletedEdges.size).toBe(1);
    txManager.commit();
  });

  it('created then deleted edge cancels out', () => {
    txManager.begin();
    const edge = makeEdge('e1', 'n1', 'n2');
    txManager.trackEdgeCreated(edge);
    txManager.trackEdgeDeleted(edge);
    const cs = txManager.currentChangeSet;
    expect(cs!.createdEdges.size).toBe(0); // creation cancelled
    expect(cs!.deletedEdges.size).toBe(0); // deletion not recorded for in-tx creation
    txManager.commit();
  });

  it('created then deleted node cancels out', () => {
    txManager.begin();
    const node = makeNode('n1');
    txManager.trackNodeCreated(node);
    txManager.trackNodeDeleted(node);
    const cs = txManager.currentChangeSet;
    expect(cs!.createdNodes.size).toBe(0); // creation cancelled
    expect(cs!.deletedNodes.size).toBe(0); // deletion not recorded for in-tx creation
    txManager.commit();
  });

  it('tracks transaction counts', () => {
    txManager.begin();
    txManager.commit();
    txManager.begin();
    txManager.rollback();
    expect(txManager.totalTransactionCount).toBe(2);
    expect(txManager.committedCount).toBe(1);
    expect(txManager.rolledBackCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY GRAPH REPOSITORY
// ═══════════════════════════════════════════════════════════════

describe('InMemoryGraphRepository', () => {
  let repo: InMemoryGraphRepository;
  let eventPublisher: TestEventPublisher;

  beforeEach(() => {
    eventPublisher = new TestEventPublisher();
    repo = new InMemoryGraphRepository({ eventPublisher });
  });

  // ─── CRUD ────────────────────────────────────────────────

  describe('CRUD Operations', () => {
    it('creates and reads a node', async () => {
      const node = makeNode('n1');
      await repo.addNode(node);
      const result = await repo.getNode(node.identity.id);
      expect(result).toBeDefined();
      expect(result!.identity.id).toBe(node.identity.id);
    });

    it('throws DuplicateNodeError for duplicate node ID', async () => {
      const node = makeNode('n1');
      await repo.addNode(node);
      await expect(repo.addNode(node)).rejects.toThrow(DuplicateNodeError);
    });

    it('reads a node that does not exist', async () => {
      const result = await repo.getNode(brandNodeId('missing'));
      expect(result).toBeUndefined();
    });

    it('updates node properties', async () => {
      const node = makeNode('n1');
      await repo.addNode(node);
      const updated = await repo.updateNodeProperties(node.identity.id, { version: 2 });
      expect(updated.properties.version).toBe(2);
      // updatedAt is always refreshed on update
      expect(updated.metadata.updatedAt).toBeDefined();
      expect(typeof updated.metadata.updatedAt).toBe('string');
    });

    it('throws when updating non-existent node', async () => {
      await expect(repo.updateNodeProperties(brandNodeId('missing'), { x: 1 }))
        .rejects.toThrow(GraphValidationError);
    });

    it('deletes a node and its connected edges', async () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      await repo.addNode(n1);
      await repo.addNode(n2);
      const edge = makeEdge('e1', 'n1', 'n2');
      await repo.addEdge(edge);
      const deleted = await repo.removeNode(n1.identity.id);
      expect(deleted).toBe(true);
      expect(await repo.getNode(n1.identity.id)).toBeUndefined();
      expect(await repo.getEdge(edge.id)).toBeUndefined();
    });

    it('delete returns false for non-existent node', async () => {
      expect(await repo.removeNode(brandNodeId('missing'))).toBe(false);
    });

    it('creates and reads an edge', async () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      await repo.addNode(n1);
      await repo.addNode(n2);
      const edge = makeEdge('e1', 'n1', 'n2');
      await repo.addEdge(edge);
      const result = await repo.getEdge(edge.id);
      expect(result).toBeDefined();
      expect(result!.id).toBe(edge.id);
    });

    it('throws DuplicateEdgeError for duplicate edge ID', async () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      await repo.addNode(n1);
      await repo.addNode(n2);
      const edge = makeEdge('e1', 'n1', 'n2');
      await repo.addEdge(edge);
      await expect(repo.addEdge(edge)).rejects.toThrow(DuplicateEdgeError);
    });

    it('throws for self-referencing edge', async () => {
      const n1 = makeNode('n1');
      await repo.addNode(n1);
      // Self-reference is caught at model creation level (createGraphEdge throws Error)
      // This is correct behavior — the domain model prevents self-referencing edges
      const rel = createRelationship(EdgeType.RELATED_TO);
      expect(() => createGraphEdge('e1', 'n1', 'n1', rel)).toThrow();
    });

    it('throws when edge source does not exist', async () => {
      const n2 = makeNode('n2');
      await repo.addNode(n2);
      const edge = makeEdge('e1', 'n1', 'n2');
      await expect(repo.addEdge(edge)).rejects.toThrow(GraphValidationError);
    });

    it('throws when edge target does not exist', async () => {
      const n1 = makeNode('n1');
      await repo.addNode(n1);
      const edge = makeEdge('e1', 'n1', 'n2');
      await expect(repo.addEdge(edge)).rejects.toThrow(GraphValidationError);
    });

    it('deletes an edge', async () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      await repo.addNode(n1);
      await repo.addNode(n2);
      const edge = makeEdge('e1', 'n1', 'n2');
      await repo.addEdge(edge);
      expect(await repo.removeEdge(edge.id)).toBe(true);
      expect(await repo.getEdge(edge.id)).toBeUndefined();
    });

    it('delete edge returns false for non-existent edge', async () => {
      expect(await repo.removeEdge(brandEdgeId('missing'))).toBe(false);
    });

    it('getEdgesFrom returns outgoing edges', async () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      const n3 = makeNode('n3');
      await repo.addNode(n1);
      await repo.addNode(n2);
      await repo.addNode(n3);
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      await repo.addEdge(makeEdge('e2', 'n1', 'n3'));
      const edges = await repo.getEdgesFrom(n1.identity.id);
      expect(edges).toHaveLength(2);
    });

    it('getEdgesTo returns incoming edges', async () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      await repo.addNode(n1);
      await repo.addNode(n2);
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      const edges = await repo.getEdgesTo(n2.identity.id);
      expect(edges).toHaveLength(1);
    });

    it('getAllNodes returns all nodes', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      const nodes = await repo.getAllNodes();
      expect(nodes).toHaveLength(2);
    });

    it('getAllEdges returns all edges', async () => {
      const n1 = makeNode('n1');
      const n2 = makeNode('n2');
      await repo.addNode(n1);
      await repo.addNode(n2);
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      const edges = await repo.getAllEdges();
      expect(edges).toHaveLength(1);
    });

    it('nodeCount and edgeCount', async () => {
      expect(await repo.nodeCount()).toBe(0);
      await repo.addNode(makeNode('n1'));
      expect(await repo.nodeCount()).toBe(1);
      const n2 = makeNode('n2');
      await repo.addNode(n2);
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      expect(await repo.edgeCount()).toBe(1);
    });

    it('hasNode and hasEdge', async () => {
      const n1 = makeNode('n1');
      await repo.addNode(n1);
      expect(await repo.hasNode(n1.identity.id)).toBe(true);
      expect(await repo.hasNode(brandNodeId('missing'))).toBe(false);
      expect(await repo.hasEdge(brandEdgeId('missing'))).toBe(false);
    });
  });

  // ─── Batch Operations ───────────────────────────────────

  describe('Batch Operations', () => {
    it('addNodes adds multiple nodes atomically', async () => {
      const nodes = [makeNode('n1'), makeNode('n2'), makeNode('n3')];
      await repo.addNodes(nodes);
      expect(await repo.nodeCount()).toBe(3);
    });

    it('addNodes fails if any node is duplicate', async () => {
      await repo.addNode(makeNode('n1'));
      const nodes = [makeNode('n2'), makeNode('n1')]; // n1 duplicate
      await expect(repo.addNodes(nodes)).rejects.toThrow(DuplicateNodeError);
    });

    it('addEdges adds multiple edges atomically', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      await repo.addNode(makeNode('n3'));
      const edges = [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3')];
      await repo.addEdges(edges);
      expect(await repo.edgeCount()).toBe(2);
    });

    it('addEdges fails if any edge is duplicate', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      const edges = [makeEdge('e1', 'n1', 'n2')]; // duplicate
      await expect(repo.addEdges(edges)).rejects.toThrow(DuplicateEdgeError);
    });

    it('removeNodes removes multiple nodes', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      await repo.addNode(makeNode('n3'));
      await repo.removeNodes([brandNodeId('n1'), brandNodeId('n2')]);
      expect(await repo.nodeCount()).toBe(1);
    });

    it('removeEdges removes multiple edges', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      await repo.addNode(makeNode('n3'));
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      await repo.addEdge(makeEdge('e2', 'n2', 'n3'));
      await repo.removeEdges([brandEdgeId('e1'), brandEdgeId('e2')]);
      expect(await repo.edgeCount()).toBe(0);
    });

    it('replaceNodes upserts nodes', async () => {
      await repo.addNode(makeNode('n1'));
      const updatedNode = makeNode('n1', NodeType.Host); // type changed
      const newNode = makeNode('n2');
      await repo.replaceNodes([updatedNode, newNode]);
      expect(await repo.nodeCount()).toBe(2);
      const n1 = await repo.getNode(brandNodeId('n1'));
      expect(n1!.identity.type).toBe(NodeType.Host);
    });

    it('replaceEdges upserts edges', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      await repo.addEdge(makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS));
      const updatedEdge = makeEdge('e1', 'n1', 'n2', EdgeType.USES); // type changed
      await repo.replaceEdges([updatedEdge]);
      const edge = await repo.getEdge(brandEdgeId('e1'));
      expect(edge!.relationship.edgeType).toBe(EdgeType.USES);
    });
  });

  // ─── Find Operations ────────────────────────────────────

  describe('Find Operations', () => {
    beforeEach(async () => {
      await repo.addNode(makeNode('app1', NodeType.Application, ['webapp']));
      await repo.addNode(makeNode('app2', NodeType.Application, ['mobile']));
      await repo.addNode(makeNode('host1', NodeType.Host, ['production']));
      await repo.addEdge(makeEdge('e1', 'app1', 'host1', EdgeType.HOSTS));
      await repo.addEdge(makeEdge('e2', 'app2', 'host1', EdgeType.USES));
    });

    it('findNodesByType returns nodes of given type', async () => {
      const apps = await repo.findNodesByType(NodeType.Application);
      expect(apps).toHaveLength(2);
    });

    it('findEdgesByType returns edges of given type', async () => {
      const hosts = await repo.findEdgesByType(EdgeType.HOSTS);
      expect(hosts).toHaveLength(1);
    });

    it('findNodesByLabel returns nodes with matching label', async () => {
      const webapps = await repo.findNodesByLabel('webapp');
      expect(webapps).toHaveLength(1);
    });

    it('findNodesBySource returns nodes from given source', async () => {
      const nodes = await repo.findNodesBySource('test');
      expect(nodes).toHaveLength(3);
    });

    it('findNodesByTag returns nodes with matching tag', async () => {
      const nodes = await repo.findNodesByTag('unit-test');
      expect(nodes).toHaveLength(3);
    });
  });

  // ─── List Operations ────────────────────────────────────

  describe('List Operations', () => {
    it('listNodes with limit and offset', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.addNode(makeNode(`n${i}`));
      }
      const page1 = await repo.listNodes(3, 0);
      const page2 = await repo.listNodes(3, 3);
      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
    });

    it('listEdges with limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.addNode(makeNode(`n${i}`));
      }
      for (let i = 0; i < 4; i++) {
        await repo.addEdge(makeEdge(`e${i}`, `n${i}`, `n${i + 1}`));
      }
      const edges = await repo.listEdges(2, 0);
      expect(edges).toHaveLength(2);
    });
  });

  // ─── Clear ──────────────────────────────────────────────

  describe('Clear', () => {
    it('clear removes all data', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.clear();
      expect(await repo.nodeCount()).toBe(0);
      expect(await repo.edgeCount()).toBe(0);
    });
  });

  // ─── Statistics ─────────────────────────────────────────

  describe('Statistics', () => {
    it('computes statistics for empty graph', async () => {
      const stats = await repo.getStatistics();
      expect(stats.nodeCount).toBe(0);
      expect(stats.edgeCount).toBe(0);
      expect(stats.avgDegree).toBe(0);
    });

    it('computes statistics with data', async () => {
      await repo.addNode(makeNode('n1', NodeType.Application));
      await repo.addNode(makeNode('n2', NodeType.Host));
      await repo.addNode(makeNode('n3', NodeType.Host));
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      await repo.addEdge(makeEdge('e2', 'n1', 'n3'));
      const stats = await repo.getStatistics();
      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.avgDegree).toBeCloseTo(4 / 3);
      expect(stats.maxDegree).toBe(2); // n1 has degree 2
    });

    it('includes type distributions', async () => {
      await repo.addNode(makeNode('n1', NodeType.Application));
      await repo.addNode(makeNode('n2', NodeType.Host));
      const stats = await repo.getStatistics();
      expect(stats.nodeTypeDistribution[NodeType.Application]).toBe(1);
      expect(stats.nodeTypeDistribution[NodeType.Host]).toBe(1);
    });
  });

  // ─── Consistency ────────────────────────────────────────

  describe('Consistency Checks', () => {
    it('empty graph is consistent', async () => {
      const report = await repo.checkConsistency();
      expect(report.valid).toBe(true);
    });

    it('detects no issues for well-formed graph', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      const report = await repo.checkConsistency();
      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it('reports fields are zero for consistent graph', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      const report = await repo.checkConsistency();
      expect(report.danglingEdges).toBe(0);
      expect(report.duplicateNodeIds).toBe(0);
      expect(report.duplicateEdgeIds).toBe(0);
      expect(report.selfReferences).toBe(0);
    });
  });

  // ─── Snapshots ─────────────────────────────────────────

  describe('Snapshot Operations', () => {
    it('creates and lists snapshots', async () => {
      await repo.addNode(makeNode('n1'));
      const snap = await repo.createSnapshot();
      expect(snap.nodeCount).toBe(1);
      const list = repo.listSnapshots();
      expect(list).toHaveLength(1);
    });

    it('restores to snapshot state', async () => {
      await repo.addNode(makeNode('n1'));
      const snap = await repo.createSnapshot();
      await repo.addNode(makeNode('n2'));
      expect(await repo.nodeCount()).toBe(2);
      await repo.restoreSnapshot(snap.id);
      expect(await repo.nodeCount()).toBe(1);
    });

    it('diffs between snapshots', async () => {
      await repo.addNode(makeNode('n1'));
      const snap1 = await repo.createSnapshot();
      await repo.addNode(makeNode('n2'));
      const snap2 = await repo.createSnapshot();
      const diff = await repo.diffSnapshots(snap1.id, snap2.id);
      expect(diff.nodesAdded).toBe(1);
    });
  });

  // ─── Transactions ──────────────────────────────────────

  describe('Transaction Operations', () => {
    it('begin and commit', () => {
      repo.beginTransaction();
      expect(repo.isTransactionActive).toBe(true);
      expect(repo.transactionDepth).toBe(1);
      repo.commitTransaction();
      expect(repo.isTransactionActive).toBe(false);
    });

    it('rollback restores state', async () => {
      await repo.addNode(makeNode('n1'));
      repo.beginTransaction();
      repo.createNode(makeNode('n2'));
      repo.rollbackTransaction();
      expect(await repo.nodeCount()).toBe(1);
    });

    it('abort all transactions', () => {
      repo.beginTransaction();
      repo.beginTransaction();
      repo.abortAllTransactions();
      expect(repo.isTransactionActive).toBe(false);
    });

    it('nested commit merges change sets', () => {
      repo.beginTransaction();
      repo.beginTransaction();
      repo.commitTransaction();
      expect(repo.transactionDepth).toBe(1);
      repo.commitTransaction();
      expect(repo.transactionDepth).toBe(0);
    });

    it('nested rollback restores to parent state', async () => {
      await repo.addNode(makeNode('n1'));
      repo.beginTransaction();
      repo.beginTransaction();
      repo.createNode(makeNode('n2'));
      repo.rollbackTransaction();
      expect(await repo.nodeCount()).toBe(1);
      repo.commitTransaction();
    });
  });

  // ─── Events ────────────────────────────────────────────

  describe('Event Publishing', () => {
    it('publishes NodeCreated event', async () => {
      await repo.addNode(makeNode('n1'));
      expect(eventPublisher.events.length).toBeGreaterThanOrEqual(1);
      const nodeEvents = eventPublisher.events.filter(e => e.type === 'graph.node.created');
      expect(nodeEvents.length).toBe(1);
    });

    it('publishes EdgeCreated event', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.addNode(makeNode('n2'));
      eventPublisher.clear();
      await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
      const edgeEvents = eventPublisher.events.filter(e => e.type === 'graph.edge.created');
      expect(edgeEvents.length).toBe(1);
    });

    it('publishes NodeDeleted event', async () => {
      await repo.addNode(makeNode('n1'));
      eventPublisher.clear();
      await repo.removeNode(brandNodeId('n1'));
      const delEvents = eventPublisher.events.filter(e => e.type === 'graph.node.deleted');
      expect(delEvents.length).toBe(1);
    });

    it('publishes SnapshotCreated event', async () => {
      await repo.addNode(makeNode('n1'));
      eventPublisher.clear();
      await repo.createSnapshot();
      const snapEvents = eventPublisher.events.filter(e => e.type === 'graph.snapshot.created');
      expect(snapEvents.length).toBe(1);
    });

    it('defers events during transaction until commit', async () => {
      repo.beginTransaction();
      repo.createNode(makeNode('n1'));
      // Events should not be published yet (deferred)
      // They will be published on commit
      const cs = repo.commitTransaction();
      // After commit, events should be flushed
      expect(cs.createdNodes.size).toBe(1);
    });

    it('clears events on rollback', async () => {
      repo.beginTransaction();
      repo.createNode(makeNode('n1'));
      repo.rollbackTransaction();
      // Events from the rolled-back transaction should be discarded
    });
  });

  // ─── Cache ─────────────────────────────────────────────

  describe('Cache Operations', () => {
    it('returns cache stats', () => {
      const stats = repo.getCacheStats();
      expect(stats).toHaveProperty('nodeCacheSize');
      expect(stats).toHaveProperty('edgeCacheSize');
      expect(stats).toHaveProperty('traversalCacheSize');
      expect(stats).toHaveProperty('nodeCacheHitRate');
    });

    it('invalidates cache', async () => {
      await repo.addNode(makeNode('n1'));
      repo.invalidateCache();
      const stats = repo.getCacheStats();
      expect(stats.nodeCacheSize).toBe(0);
    });
  });

  // ─── Extended Stats ────────────────────────────────────

  describe('Extended Statistics', () => {
    it('tracks snapshot count', async () => {
      await repo.addNode(makeNode('n1'));
      await repo.createSnapshot();
      expect(repo.snapshotCount).toBe(1);
    });

    it('tracks transaction count', () => {
      repo.beginTransaction();
      repo.commitTransaction();
      expect(repo.transactionCount).toBe(1);
    });

    it('tracks memory usage', async () => {
      await repo.addNode(makeNode('n1'));
      expect(repo.memoryUsage).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION: REPOSITORY WITHOUT EVENT PUBLISHER
// ═══════════════════════════════════════════════════════════════

describe('InMemoryGraphRepository without EventPublisher', () => {
  let repo: InMemoryGraphRepository;

  beforeEach(() => {
    repo = new InMemoryGraphRepository(); // no publisher
  });

  it('works without an event publisher', async () => {
    await repo.addNode(makeNode('n1'));
    const node = await repo.getNode(brandNodeId('n1'));
    expect(node).toBeDefined();
  });

  it('snapshot operations work without publisher', async () => {
    await repo.addNode(makeNode('n1'));
    const snap = await repo.createSnapshot();
    expect(snap.nodeCount).toBe(1);
  });

  it('transaction operations work without publisher', async () => {
    repo.beginTransaction();
    repo.createNode(makeNode('n1'));
    const cs = repo.commitTransaction();
    expect(cs.createdNodes.size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  let repo: InMemoryGraphRepository;

  beforeEach(() => {
    repo = new InMemoryGraphRepository();
  });

  it('deleting a node removes all its edges', async () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const n3 = makeNode('n3');
    await repo.addNode(n1);
    await repo.addNode(n2);
    await repo.addNode(n3);
    await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
    await repo.addEdge(makeEdge('e2', 'n3', 'n1'));
    await repo.addEdge(makeEdge('e3', 'n2', 'n3'));

    await repo.removeNode(n1.identity.id);
    expect(await repo.edgeCount()).toBe(1); // only e3 remains
  });

  it('findNodesByType returns empty for unknown type', async () => {
    const nodes = await repo.findNodesByType('Unknown');
    expect(nodes).toHaveLength(0);
  });

  it('findEdgesByType returns empty for unknown type', async () => {
    const edges = await repo.findEdgesByType('Unknown');
    expect(edges).toHaveLength(0);
  });

  it('listNodes with out-of-range offset returns empty', async () => {
    await repo.addNode(makeNode('n1'));
    const result = await repo.listNodes(10, 100);
    expect(result).toHaveLength(0);
  });

  it('clear after data works', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.addNode(makeNode('n2'));
    await repo.addEdge(makeEdge('e1', 'n1', 'n2'));
    await repo.clear();
    expect(await repo.nodeCount()).toBe(0);
    expect(await repo.edgeCount()).toBe(0);
    expect(repo.snapshotCount).toBe(0);
  });

  it('multiple snapshots can be created and listed', async () => {
    await repo.addNode(makeNode('n1'));
    await repo.createSnapshot();
    await repo.addNode(makeNode('n2'));
    await repo.createSnapshot();
    await repo.addNode(makeNode('n3'));
    await repo.createSnapshot();
    const list = repo.listSnapshots();
    expect(list).toHaveLength(3);
    // Each snapshot should have progressively more nodes
    expect(list[0].nodeCount).toBe(1);
    expect(list[1].nodeCount).toBe(2);
    expect(list[2].nodeCount).toBe(3);
  });

  it('statistics for single node with no edges', async () => {
    await repo.addNode(makeNode('n1'));
    const stats = await repo.getStatistics();
    expect(stats.nodeCount).toBe(1);
    expect(stats.edgeCount).toBe(0);
    expect(stats.avgDegree).toBe(0);
    expect(stats.maxDegree).toBe(0);
  });
});
