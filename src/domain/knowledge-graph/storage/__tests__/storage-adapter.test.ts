/**
 * Knowledge Graph Storage Adapter — Comprehensive Tests
 *
 * Tests cover:
 * - CRUD operations (node + edge)
 * - Batch operations
 * - Transactions (begin/commit/rollback/nested)
 * - Snapshot persistence (save/restore/list)
 * - Import/Export (JSON, DOT, GraphML)
 * - Health checks & verification
 * - Cache (read cache, write buffer, TTL, invalidation)
 * - Migration compatibility
 * - Statistics
 * - Events
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NetworkXStorageAdapter } from '../adapter/index.ts';
import type { GraphNode, GraphEdge } from '../../models/index.ts';
import { createGraphNode, createGraphEdge, createRelationship } from '../../models/index.ts';
import { NodeType, EdgeType, brandNodeId, brandEdgeId, brandSnapshotId } from '../../types/index.ts';
import { ExportFormat, ImportFormat } from '../types/index.ts';
import type { StorageAdapterConfig } from '../types/index.ts';
import { DEFAULT_STORAGE_CONFIG } from '../types/index.ts';
import {
  StorageIndexManager,
  StorageIdentityIndex,
  StorageNodeTypeIndex,
  StorageRelationshipTypeIndex,
  StorageMetadataIndex,
  StorageLabelsIndex,
} from '../indexes/index.ts';
import { StorageReadCache, StorageWriteBuffer, StorageCacheManager } from '../cache/index.ts';
import { StorageSnapshotManager } from '../snapshot/index.ts';
import { StorageTransactionManager } from '../transaction/index.ts';
import { StorageStatisticsCollector } from '../statistics/index.ts';
import {
  StorageEventBus,
  createStorageConnectedEvent,
  createStorageDisconnectedEvent,
  createStorageSnapshotCreatedEvent,
  createStorageRecoveredEvent,
  createStorageCompactedEvent,
} from '../events/index.ts';
import { GenericJSONMigration, MigrationRegistry, createDefaultMigrationRegistry } from '../migration/index.ts';
import { exportGraph, importGraph } from '../import-export/index.ts';

// ─── Test Helpers ─────────────────────────────────────────────

function makeNode(id: string, type: NodeType = NodeType.Host, labels: string[] = []): GraphNode {
  return createGraphNode(id, type, { labels, metadata: { source: 'test', confidence: 0.9, tags: ['unit-test'] } });
}

function makeEdge(id: string, sourceId: string, targetId: string, edgeType: EdgeType = EdgeType.CONNECTED_TO): GraphEdge {
  const rel = createRelationship(edgeType);
  return createGraphEdge(id, sourceId, targetId, rel);
}

function makeAdapter(config: Partial<StorageAdapterConfig> = {}): NetworkXStorageAdapter {
  return new NetworkXStorageAdapter({ id: 'test', ...config });
}

async function makeConnectedAdapter(config: Partial<StorageAdapterConfig> = {}): Promise<NetworkXStorageAdapter> {
  const adapter = makeAdapter(config);
  await adapter.connect();
  return adapter;
}

async function populateGraph(adapter: NetworkXStorageAdapter, nodeCount: number = 5): Promise<void> {
  for (let i = 0; i < nodeCount; i++) {
    await adapter.createNode(makeNode(`node_${i}`, NodeType.Host));
  }
  for (let i = 0; i < nodeCount - 1; i++) {
    await adapter.createEdge(makeEdge(`edge_${i}`, `node_${i}`, `node_${i + 1}`));
  }
}

// ─── Lifecycle Tests ──────────────────────────────────────────

describe('NetworkXStorageAdapter — Lifecycle', () => {
  it('should connect and set connected state', async () => {
    const adapter = makeAdapter();
    expect(adapter.isConnected).toBe(false);
    await adapter.connect();
    expect(adapter.isConnected).toBe(true);
    expect(adapter.connectionState).toBe('Connected');
  });

  it('should disconnect and set disconnected state', async () => {
    const adapter = await makeConnectedAdapter();
    await adapter.disconnect();
    expect(adapter.isConnected).toBe(false);
    expect(adapter.connectionState).toBe('Disconnected');
  });

  it('should emit StorageConnected event on connect', async () => {
    const adapter = makeAdapter();
    const events: any[] = [];
    adapter.eventBus.subscribe(e => events.push(e));
    await adapter.connect();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('storage.connected');
  });

  it('should emit StorageDisconnected event on disconnect', async () => {
    const adapter = await makeConnectedAdapter();
    const events: any[] = [];
    adapter.eventBus.subscribe(e => events.push(e));
    await adapter.disconnect();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('storage.disconnected');
  });

  it('should throw on operations when not connected', async () => {
    const adapter = makeAdapter();
    await expect(adapter.createNode(makeNode('x'))).rejects.toThrow('not connected');
  });

  it('should be idempotent on connect', async () => {
    const adapter = makeAdapter();
    await adapter.connect();
    await adapter.connect(); // should not throw
    expect(adapter.isConnected).toBe(true);
  });
});

// ─── Node CRUD Tests ──────────────────────────────────────────

describe('NetworkXStorageAdapter — Node CRUD', () => {
  let adapter: NetworkXStorageAdapter;

  beforeEach(async () => {
    adapter = await makeConnectedAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should create a node', async () => {
    const node = makeNode('n1');
    const result = await adapter.createNode(node);
    expect(result.success).toBe(true);
    expect(result.data).toBe(node);
  });

  it('should reject duplicate node creation', async () => {
    const node = makeNode('n1');
    await adapter.createNode(node);
    const result = await adapter.createNode(node);
    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('should get a node by ID', async () => {
    const node = makeNode('n1');
    await adapter.createNode(node);
    const result = await adapter.getNode(brandNodeId('n1'));
    expect(result.success).toBe(true);
    expect(result.data?.identity.id).toBe(brandNodeId('n1'));
  });

  it('should return undefined for non-existent node', async () => {
    const result = await adapter.getNode(brandNodeId('nonexistent'));
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('should update node properties', async () => {
    const node = makeNode('n1');
    await adapter.createNode(node);
    const result = await adapter.updateNode(brandNodeId('n1'), { severity: 'high', score: 9.5 });
    expect(result.success).toBe(true);
    expect(result.data?.properties).toHaveProperty('severity', 'high');
    expect(result.data?.properties).toHaveProperty('score', 9.5);
  });

  it('should reject update of non-existent node', async () => {
    const result = await adapter.updateNode(brandNodeId('n1'), { x: 1 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should delete a node and its connected edges', async () => {
    await adapter.createNode(makeNode('n1'));
    await adapter.createNode(makeNode('n2'));
    await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    const result = await adapter.deleteNode(brandNodeId('n1'));
    expect(result.success).toBe(true);
    expect(await adapter.hasNode(brandNodeId('n1'))).toBe(false);
    expect(await adapter.hasEdge(brandEdgeId('e1'))).toBe(false);
  });

  it('should reject delete of non-existent node', async () => {
    const result = await adapter.deleteNode(brandNodeId('n1'));
    expect(result.success).toBe(false);
  });

  it('should check if node exists', async () => {
    await adapter.createNode(makeNode('n1'));
    expect(await adapter.hasNode(brandNodeId('n1'))).toBe(true);
    expect(await adapter.hasNode(brandNodeId('n2'))).toBe(false);
  });

  it('should get all nodes', async () => {
    await populateGraph(adapter, 3);
    const nodes = await adapter.getAllNodes();
    expect(nodes.length).toBe(3);
  });

  it('should count nodes', async () => {
    await populateGraph(adapter, 5);
    expect(await adapter.nodeCount()).toBe(5);
  });
});

// ─── Edge CRUD Tests ──────────────────────────────────────────

describe('NetworkXStorageAdapter — Edge CRUD', () => {
  let adapter: NetworkXStorageAdapter;

  beforeEach(async () => {
    adapter = await makeConnectedAdapter();
    await adapter.createNode(makeNode('n1'));
    await adapter.createNode(makeNode('n2'));
    await adapter.createNode(makeNode('n3'));
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should create an edge', async () => {
    const edge = makeEdge('e1', 'n1', 'n2');
    const result = await adapter.createEdge(edge);
    expect(result.success).toBe(true);
    expect(result.data).toBe(edge);
  });

  it('should reject duplicate edge creation', async () => {
    await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    const result = await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    expect(result.success).toBe(false);
  });

  it('should reject edge with non-existent source', async () => {
    const result = await adapter.createEdge(makeEdge('e1', 'nonexistent', 'n2'));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Source');
  });

  it('should reject edge with non-existent target', async () => {
    const result = await adapter.createEdge(makeEdge('e1', 'n1', 'nonexistent'));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Target');
  });

  it('should get an edge by ID', async () => {
    const edge = makeEdge('e1', 'n1', 'n2');
    await adapter.createEdge(edge);
    const result = await adapter.getEdge(brandEdgeId('e1'));
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe(brandEdgeId('e1'));
  });

  it('should update edge properties', async () => {
    await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    const result = await adapter.updateEdge(brandEdgeId('e1'), { weight: 5 });
    expect(result.success).toBe(true);
    expect(result.data?.properties).toHaveProperty('weight', 5);
  });

  it('should delete an edge', async () => {
    await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    const result = await adapter.deleteEdge(brandEdgeId('e1'));
    expect(result.success).toBe(true);
    expect(await adapter.hasEdge(brandEdgeId('e1'))).toBe(false);
  });

  it('should get edges from a node', async () => {
    await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    await adapter.createEdge(makeEdge('e2', 'n1', 'n3'));
    const edges = await adapter.getEdgesFrom(brandNodeId('n1'));
    expect(edges.length).toBe(2);
  });

  it('should get edges to a node', async () => {
    await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    await adapter.createEdge(makeEdge('e2', 'n3', 'n2'));
    const edges = await adapter.getEdgesTo(brandNodeId('n2'));
    expect(edges.length).toBe(2);
  });

  it('should count edges', async () => {
    await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    await adapter.createEdge(makeEdge('e2', 'n2', 'n3'));
    expect(await adapter.edgeCount()).toBe(2);
  });
});

// ─── Batch Operation Tests ────────────────────────────────────

describe('NetworkXStorageAdapter — Batch Operations', () => {
  let adapter: NetworkXStorageAdapter;

  beforeEach(async () => {
    adapter = await makeConnectedAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should batch create nodes', async () => {
    const nodes = Array.from({ length: 10 }, (_, i) => makeNode(`bn_${i}`));
    const result = await adapter.batchCreateNodes(nodes);
    expect(result.total).toBe(10);
    expect(result.succeeded).toBe(10);
    expect(result.failed).toBe(0);
  });

  it('should handle partial failures in batch create', async () => {
    await adapter.createNode(makeNode('bn_0'));
    const nodes = Array.from({ length: 5 }, (_, i) => makeNode(`bn_${i}`));
    const result = await adapter.batchCreateNodes(nodes);
    expect(result.succeeded).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.errors[0].id).toBe('bn_0');
  });

  it('should batch delete nodes', async () => {
    const nodes = Array.from({ length: 5 }, (_, i) => makeNode(`bn_${i}`));
    await adapter.batchCreateNodes(nodes);
    const result = await adapter.batchDeleteNodes(nodes.map(n => n.identity.id));
    expect(result.succeeded).toBe(5);
  });

  it('should batch create edges', async () => {
    await adapter.batchCreateNodes(Array.from({ length: 5 }, (_, i) => makeNode(`bn_${i}`)));
    const edges = Array.from({ length: 4 }, (_, i) => makeEdge(`be_${i}`, `bn_${i}`, `bn_${i + 1}`));
    const result = await adapter.batchCreateEdges(edges);
    expect(result.succeeded).toBe(4);
  });

  it('should batch delete edges', async () => {
    await adapter.batchCreateNodes(Array.from({ length: 5 }, (_, i) => makeNode(`bn_${i}`)));
    const edges = Array.from({ length: 4 }, (_, i) => makeEdge(`be_${i}`, `bn_${i}`, `bn_${i + 1}`));
    await adapter.batchCreateEdges(edges);
    const result = await adapter.batchDeleteEdges(edges.map(e => e.id));
    expect(result.succeeded).toBe(4);
  });
});

// ─── Transaction Tests ────────────────────────────────────────

describe('NetworkXStorageAdapter — Transactions', () => {
  let adapter: NetworkXStorageAdapter;

  beforeEach(async () => {
    adapter = await makeConnectedAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should begin and commit a transaction', async () => {
    const txId = await adapter.beginTransaction();
    expect(txId).toBeDefined();
    expect(adapter.isTransactionActive).toBe(true);
    await adapter.createNode(makeNode('tx_n1'));
    const info = await adapter.commitTransaction();
    expect(info.state).toBe('Committed');
    expect(adapter.isTransactionActive).toBe(false);
    expect(await adapter.hasNode(brandNodeId('tx_n1'))).toBe(true);
  });

  it('should rollback a transaction', async () => {
    await adapter.beginTransaction();
    await adapter.createNode(makeNode('tx_n1'));
    const info = await adapter.rollbackTransaction();
    expect(info.state).toBe('RolledBack');
    expect(await adapter.hasNode(brandNodeId('tx_n1'))).toBe(false);
  });

  it('should support nested transactions', async () => {
    await adapter.beginTransaction();
    await adapter.createNode(makeNode('tx_n1'));

    await adapter.beginTransaction(); // nested
    await adapter.createNode(makeNode('tx_n2'));
    await adapter.commitTransaction(); // commit inner

    expect(await adapter.hasNode(brandNodeId('tx_n1'))).toBe(true);
    expect(await adapter.hasNode(brandNodeId('tx_n2'))).toBe(true);

    await adapter.commitTransaction(); // commit outer
  });

  it('should rollback outer transaction to restore state', async () => {
    await adapter.beginTransaction();
    await adapter.createNode(makeNode('tx_n1'));
    await adapter.rollbackTransaction();
    expect(await adapter.hasNode(brandNodeId('tx_n1'))).toBe(false);
  });

  it('should throw when committing without active transaction', async () => {
    await expect(adapter.commitTransaction()).rejects.toThrow();
  });

  it('should throw when rolling back without active transaction', async () => {
    await expect(adapter.rollbackTransaction()).rejects.toThrow();
  });
});

// ─── Snapshot Tests ───────────────────────────────────────────

describe('NetworkXStorageAdapter — Snapshots', () => {
  let adapter: NetworkXStorageAdapter;

  beforeEach(async () => {
    adapter = await makeConnectedAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should save a snapshot', async () => {
    await populateGraph(adapter, 3);
    const snap = await adapter.saveSnapshot();
    expect(snap.nodeCount).toBe(3);
    expect(snap.edgeCount).toBe(2);
    expect(snap.id).toBeDefined();
  });

  it('should restore a snapshot', async () => {
    await populateGraph(adapter, 5);
    const snap = await adapter.saveSnapshot();

    // Modify the graph
    await adapter.createNode(makeNode('extra_node'));
    expect(await adapter.nodeCount()).toBe(6);

    // Restore
    const restored = await adapter.restoreSnapshot(snap.id);
    expect(restored.nodeCount).toBe(5);
    expect(await adapter.nodeCount()).toBe(5);
    expect(await adapter.hasNode(brandNodeId('extra_node'))).toBe(false);
  });

  it('should list snapshots', async () => {
    await populateGraph(adapter, 3);
    await adapter.saveSnapshot({ label: 'snap1' });
    await adapter.saveSnapshot({ label: 'snap2' });
    const list = await adapter.listSnapshots();
    expect(list.length).toBe(2);
  });

  it('should emit StorageSnapshotCreated event', async () => {
    const events: any[] = [];
    adapter.eventBus.subscribe(e => events.push(e));
    await populateGraph(adapter, 3);
    await adapter.saveSnapshot();
    expect(events.some(e => e.type === 'storage.snapshot.created')).toBe(true);
  });

  it('should emit StorageRecovered event on restore', async () => {
    await populateGraph(adapter, 3);
    const snap = await adapter.saveSnapshot();
    const events: any[] = [];
    adapter.eventBus.subscribe(e => events.push(e));
    await adapter.restoreSnapshot(snap.id);
    expect(events.some(e => e.type === 'storage.recovered')).toBe(true);
  });

  it('should throw when restoring non-existent snapshot', async () => {
    await expect(adapter.restoreSnapshot(brandSnapshotId('nonexistent'))).rejects.toThrow();
  });
});

// ─── Import/Export Tests ──────────────────────────────────────

describe('NetworkXStorageAdapter — Import/Export', () => {
  let adapter: NetworkXStorageAdapter;

  beforeEach(async () => {
    adapter = await makeConnectedAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should export to JSON', async () => {
    await populateGraph(adapter, 3);
    const result = await adapter.exportGraph({
      format: ExportFormat.JSON,
      includeMetadata: true,
      prettyPrint: false,
    });
    expect(result.format).toBe(ExportFormat.JSON);
    expect(result.nodeCount).toBe(3);
    expect(result.data).toContain('nodes');
    expect(result.data).toContain('edges');
  });

  it('should export to DOT', async () => {
    await populateGraph(adapter, 3);
    const result = await adapter.exportGraph({
      format: ExportFormat.DOT,
      includeMetadata: true,
      prettyPrint: false,
    });
    expect(result.format).toBe(ExportFormat.DOT);
    expect(result.data).toContain('digraph');
  });

  it('should export to GraphML', async () => {
    await populateGraph(adapter, 3);
    const result = await adapter.exportGraph({
      format: ExportFormat.GraphML,
      includeMetadata: true,
      prettyPrint: false,
    });
    expect(result.format).toBe(ExportFormat.GraphML);
    expect(result.data).toContain('graphml');
  });

  it('should import from JSON (round-trip)', async () => {
    await populateGraph(adapter, 3);
    const exported = await adapter.exportGraph({
      format: ExportFormat.JSON,
      includeMetadata: true,
      prettyPrint: false,
    });

    const adapter2 = await makeConnectedAdapter({ id: 'import-target' });
    const imported = await adapter2.importGraph(exported.data, {
      format: ImportFormat.JSON,
      mergeStrategy: 'replace',
      validateBeforeImport: true,
    });

    expect(imported.nodesImported).toBe(3);
    expect(imported.edgesImported).toBe(2);
    expect(imported.errors.length).toBe(0);
    await adapter2.disconnect();
  });

  it('should filter by node type on export', async () => {
    await adapter.createNode(makeNode('h1', NodeType.Host));
    await adapter.createNode(makeNode('a1', NodeType.Application));
    const result = await adapter.exportGraph({
      format: ExportFormat.JSON,
      includeMetadata: true,
      prettyPrint: false,
      filter: { nodeTypes: ['Host'] },
    });
    const parsed = JSON.parse(result.data);
    expect(parsed.nodes.length).toBe(1);
  });

  it('should handle invalid JSON import', async () => {
    const result = await adapter.importGraph('not valid json', {
      format: ImportFormat.JSON,
      mergeStrategy: 'replace',
      validateBeforeImport: true,
    });
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── Statistics Tests ─────────────────────────────────────────

describe('NetworkXStorageAdapter — Statistics', () => {
  let adapter: NetworkXStorageAdapter;

  beforeEach(async () => {
    adapter = await makeConnectedAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should report correct node and edge counts', async () => {
    await populateGraph(adapter, 5);
    const stats = adapter.getStatistics();
    expect(stats.nodeCount).toBe(5);
    expect(stats.edgeCount).toBe(4);
  });

  it('should track read/write operations', async () => {
    await adapter.createNode(makeNode('n1'));
    await adapter.getNode(brandNodeId('n1'));
    const stats = adapter.getStatistics();
    expect(stats.totalWriteOperations).toBeGreaterThan(0);
    expect(stats.totalReadOperations).toBeGreaterThan(0);
  });

  it('should report memory usage', async () => {
    await populateGraph(adapter, 10);
    const stats = adapter.getStatistics();
    expect(stats.memoryUsageBytes).toBeGreaterThan(0);
  });

  it('should report uptime', async () => {
    const stats = adapter.getStatistics();
    expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should report index count and size', async () => {
    await populateGraph(adapter, 5);
    const stats = adapter.getStatistics();
    expect(stats.indexCount).toBeGreaterThan(0);
    expect(stats.indexSizeBytes).toBeGreaterThan(0);
  });
});

// ─── Health Check Tests ───────────────────────────────────────

describe('NetworkXStorageAdapter — Health & Verification', () => {
  let adapter: NetworkXStorageAdapter;

  beforeEach(async () => {
    adapter = await makeConnectedAdapter();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should report healthy when connected', () => {
    const health = adapter.health();
    expect(health.healthy).toBe(true);
    expect(health.connectionState).toBe('Connected');
  });

  it('should report unhealthy when not connected', () => {
    const disconnected = makeAdapter();
    const health = disconnected.health();
    expect(health.healthy).toBe(false);
  });

  it('should verify data integrity', async () => {
    await populateGraph(adapter, 5);
    const result = adapter.verify();
    expect(result.healthy).toBe(true);
    expect(result.issues.filter(i => i.severity === 'error').length).toBe(0);
  });

  it('should rebuild indexes', async () => {
    await populateGraph(adapter, 5);
    await adapter.rebuildIndexes();
    const stats = adapter.getStatistics();
    expect(stats.indexCount).toBeGreaterThan(0);
  });

  it('should clear storage', async () => {
    await populateGraph(adapter, 5);
    await adapter.clear();
    expect(await adapter.nodeCount()).toBe(0);
    expect(await adapter.edgeCount()).toBe(0);
  });
});

// ─── Cache Tests ──────────────────────────────────────────────

describe('Storage Cache', () => {
  it('should cache and retrieve nodes', () => {
    const cache = new StorageReadCache(100, 60000);
    const node = makeNode('n1');
    cache.setNode(node.identity.id, node);
    expect(cache.getNode(node.identity.id)).toBe(node);
    expect(cache.hasNode(node.identity.id)).toBe(true);
  });

  it('should cache and retrieve edges', () => {
    const cache = new StorageReadCache(100, 60000);
    const edge = makeEdge('e1', 'n1', 'n2');
    cache.setEdge(edge.id, edge);
    expect(cache.getEdge(edge.id)).toBe(edge);
  });

  it('should invalidate cache entries', () => {
    const cache = new StorageReadCache(100, 60000);
    const node = makeNode('n1');
    cache.setNode(node.identity.id, node);
    cache.invalidateNode(node.identity.id);
    expect(cache.getNode(node.identity.id)).toBeUndefined();
  });

  it('should track hit rate', () => {
    const cache = new StorageReadCache(100, 60000);
    const node = makeNode('n1');
    cache.setNode(node.identity.id, node);
    cache.getNode(node.identity.id); // hit
    cache.getNode(brandNodeId('miss')); // miss
    expect(cache.hitRate).toBeGreaterThan(0);
    expect(cache.hitRate).toBeLessThan(1);
  });

  it('should evict expired entries', async () => {
    const cache = new StorageReadCache(100, 50); // 50ms TTL
    const node = makeNode('n1');
    cache.setNode(node.identity.id, node);
    expect(cache.getNode(node.identity.id)).toBeDefined();

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 100));
    cache.evictExpired();
    expect(cache.getNode(node.identity.id)).toBeUndefined();
  });

  it('write buffer should track pending operations', () => {
    const buffer = new StorageWriteBuffer(10);
    expect(buffer.isEmpty).toBe(true);
    buffer.push({
      operation: 1 as any,
      target: 'node',
      id: 'n1',
      data: makeNode('n1') as any,
      timestamp: new Date().toISOString() as any,
    });
    expect(buffer.size).toBe(1);
    expect(buffer.shouldFlush).toBe(false);

    // Fill to threshold
    for (let i = 1; i < 10; i++) {
      buffer.push({
        operation: 1 as any,
        target: 'node',
        id: `n${i}`,
        data: makeNode(`n${i}`) as any,
        timestamp: new Date().toISOString() as any,
      });
    }
    expect(buffer.shouldFlush).toBe(true);

    const drained = buffer.drain();
    expect(drained.length).toBe(10);
    expect(buffer.isEmpty).toBe(true);
  });
});

// ─── Index Tests ──────────────────────────────────────────────

describe('Storage Indexes', () => {
  let indexManager: StorageIndexManager;

  beforeEach(() => {
    indexManager = new StorageIndexManager();
  });

  it('should index and retrieve nodes by type', () => {
    const node = makeNode('n1', NodeType.Host);
    indexManager.indexNode(node);
    const ids = indexManager.nodeTypeIndex.getByType('Host');
    expect(ids.size).toBe(1);
    expect(ids.has(brandNodeId('n1'))).toBe(true);
  });

  it('should index and retrieve edges by type', () => {
    const edge = makeEdge('e1', 'n1', 'n2');
    indexManager.indexEdge(edge);
    const ids = indexManager.relationshipTypeIndex.getByType('CONNECTED_TO');
    expect(ids.size).toBe(1);
  });

  it('should index nodes by label', () => {
    const node = makeNode('n1', NodeType.Host, ['critical', 'production']);
    indexManager.indexNode(node);
    expect(indexManager.labelsIndex.findByLabel('critical').size).toBe(1);
    expect(indexManager.labelsIndex.findByLabel('production').size).toBe(1);
  });

  it('should index nodes by metadata', () => {
    const node = makeNode('n1');
    indexManager.indexNode(node);
    expect(indexManager.metadataIndex.findBySource('test').size).toBe(1);
    expect(indexManager.metadataIndex.findByTag('unit-test').size).toBe(1);
  });

  it('should de-index nodes', () => {
    const node = makeNode('n1', NodeType.Host, ['label1']);
    indexManager.indexNode(node);
    indexManager.deindexNode(node);
    expect(indexManager.nodeTypeIndex.getByType('Host').size).toBe(0);
    expect(indexManager.labelsIndex.findByLabel('label1').size).toBe(0);
  });

  it('should compute index stats', () => {
    const node = makeNode('n1', NodeType.Host);
    indexManager.indexNode(node);
    const stats = indexManager.getAllStats();
    expect(stats.length).toBe(5);
    expect(stats.every(s => s.entryCount >= 0)).toBe(true);
  });

  it('should report total memory usage', () => {
    const node = makeNode('n1', NodeType.Host);
    indexManager.indexNode(node);
    expect(indexManager.totalMemoryUsage).toBeGreaterThan(0);
  });
});

// ─── Snapshot Manager Tests ───────────────────────────────────

describe('Storage Snapshot Manager', () => {
  let manager: StorageSnapshotManager;

  beforeEach(() => {
    manager = new StorageSnapshotManager(0);
  });

  it('should save a snapshot', () => {
    const nodes = [makeNode('n1'), makeNode('n2')];
    const edges = [makeEdge('e1', 'n1', 'n2')];
    const { meta } = manager.saveSnapshot(nodes, edges);
    expect(meta.nodeCount).toBe(2);
    expect(meta.edgeCount).toBe(1);
  });

  it('should restore a snapshot', () => {
    const nodes = [makeNode('n1'), makeNode('n2')];
    const edges = [makeEdge('e1', 'n1', 'n2')];
    const { meta } = manager.saveSnapshot(nodes, edges);
    const data = manager.restoreSnapshot(meta.id);
    expect(data.nodes.length).toBe(2);
    expect(data.edges.length).toBe(1);
  });

  it('should list snapshots', () => {
    manager.saveSnapshot([makeNode('n1')], []);
    manager.saveSnapshot([makeNode('n2')], []);
    expect(manager.listSnapshots().length).toBe(2);
  });

  it('should enforce max snapshots', () => {
    const mgr = new StorageSnapshotManager(2);
    mgr.saveSnapshot([makeNode('n1')], []);
    mgr.saveSnapshot([makeNode('n2')], []);
    mgr.saveSnapshot([makeNode('n3')], []);
    expect(mgr.snapshotCount).toBe(2);
  });

  it('should throw on non-existent snapshot restore', () => {
    expect(() => manager.restoreSnapshot(brandSnapshotId('nonexistent'))).toThrow();
  });
});

// ─── Transaction Manager Tests ────────────────────────────────

describe('Storage Transaction Manager', () => {
  let txManager: StorageTransactionManager;
  let nodes: Map<string, GraphNode>;
  let edges: Map<string, GraphEdge>;

  beforeEach(() => {
    txManager = new StorageTransactionManager();
    nodes = new Map();
    edges = new Map();
  });

  it('should begin a transaction', () => {
    const txId = txManager.begin(nodes as any, edges as any);
    expect(txId).toBeDefined();
    expect(txManager.isActive).toBe(true);
  });

  it('should commit a transaction', () => {
    txManager.begin(nodes as any, edges as any);
    const info = txManager.commit();
    expect(info.state).toBe('Committed');
    expect(txManager.isActive).toBe(false);
  });

  it('should rollback a transaction', () => {
    txManager.begin(nodes as any, edges as any);
    const { info } = txManager.rollback();
    expect(info.state).toBe('RolledBack');
  });

  it('should track change sets', () => {
    txManager.begin(nodes as any, edges as any);
    const node = makeNode('n1');
    txManager.trackNodeCreated(node);
    expect(txManager.currentChangeSet?.createdNodes.size).toBe(1);
    txManager.commit();
  });
});

// ─── Statistics Collector Tests ────────────────────────────────

describe('Storage Statistics Collector', () => {
  it('should track reads and writes', () => {
    const collector = new StorageStatisticsCollector();
    collector.recordRead();
    collector.recordRead();
    collector.recordWrite();
    expect(collector.totalReads).toBe(2);
    expect(collector.totalWrites).toBe(1);
  });

  it('should reset counters', () => {
    const collector = new StorageStatisticsCollector();
    collector.recordRead();
    collector.reset();
    expect(collector.totalReads).toBe(0);
  });
});

// ─── Event Tests ──────────────────────────────────────────────

describe('Storage Events', () => {
  it('should create and emit events', () => {
    const bus = new StorageEventBus();
    const events: any[] = [];
    bus.subscribe(e => events.push(e));

    const event = createStorageConnectedEvent('test', 'networkx');
    bus.emit(event);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('storage.connected');
  });

  it('should unsubscribe handlers', () => {
    const bus = new StorageEventBus();
    const events: any[] = [];
    const unsub = bus.subscribe(e => events.push(e));
    unsub();
    bus.emit(createStorageConnectedEvent('test', 'networkx'));
    expect(events.length).toBe(0);
  });

  it('should create all event types', () => {
    const connected = createStorageConnectedEvent('a', 'networkx');
    expect(connected.type).toBe('storage.connected');

    const disconnected = createStorageDisconnectedEvent('a', 'networkx', true);
    expect(disconnected.type).toBe('storage.disconnected');

    const snapshot = createStorageSnapshotCreatedEvent('a', 'networkx', brandSnapshotId('s1'), 10, 5);
    expect(snapshot.type).toBe('storage.snapshot.created');

    const recovered = createStorageRecoveredEvent('a', 'networkx', brandSnapshotId('s1'), 10, 5);
    expect(recovered.type).toBe('storage.recovered');

    const compacted = createStorageCompactedEvent('a', 'networkx', 100, 90, 200, 180, 1000);
    expect(compacted.type).toBe('storage.compacted');
  });
});

// ─── Migration Tests ──────────────────────────────────────────

describe('Storage Migration', () => {
  it('should register and retrieve migrations', () => {
    const registry = new MigrationRegistry();
    const migration = new GenericJSONMigration();
    registry.register(migration);
    expect(registry.has('networkx', 'neo4j')).toBe(true);
    expect(registry.list().length).toBe(1);
  });

  it('should create default migration registry', () => {
    const registry = createDefaultMigrationRegistry();
    expect(registry.list().length).toBeGreaterThan(0);
  });

  it('should execute generic JSON migration', async () => {
    const source = await makeConnectedAdapter({ id: 'source' });
    const target = await makeConnectedAdapter({ id: 'target' });

    await source.createNode(makeNode('n1'));
    await source.createNode(makeNode('n2'));
    await source.createEdge(makeEdge('e1', 'n1', 'n2'));

    const migration = new GenericJSONMigration();
    const result = await migration.migrate(source, target);

    expect(result.success).toBe(true);
    expect(result.nodesMigrated).toBe(2);
    expect(result.edgesMigrated).toBe(1);

    await source.disconnect();
    await target.disconnect();
  });
});

// ─── Import/Export Module Tests ────────────────────────────────

describe('Import/Export Module', () => {
  const nodes = [makeNode('n1', NodeType.Host), makeNode('n2', NodeType.Application)];
  const edges = [makeEdge('e1', 'n1', 'n2', EdgeType.HOSTS)];

  it('should export and import JSON', () => {
    const exported = exportGraph(nodes, edges, {
      format: ExportFormat.JSON,
      includeMetadata: true,
      prettyPrint: false,
    });
    expect(exported.data).toContain('n1');

    const imported = importGraph(exported.data, {
      format: ImportFormat.JSON,
      mergeStrategy: 'replace',
      validateBeforeImport: true,
    });
    expect(imported.nodesImported).toBe(2);
    expect(imported.edgesImported).toBe(1);
  });

  it('should export DOT format', () => {
    const result = exportGraph(nodes, edges, {
      format: ExportFormat.DOT,
      includeMetadata: true,
      prettyPrint: false,
    });
    expect(result.data).toContain('digraph');
    expect(result.data).toContain('->');
  });

  it('should export GraphML format', () => {
    const result = exportGraph(nodes, edges, {
      format: ExportFormat.GraphML,
      includeMetadata: true,
      prettyPrint: false,
    });
    expect(result.data).toContain('graphml');
    expect(result.data).toContain('<node');
    expect(result.data).toContain('<edge');
  });
});

// ─── Cache Manager Tests ──────────────────────────────────────

describe('Storage Cache Manager', () => {
  it('should manage read cache and write buffer', () => {
    const manager = new StorageCacheManager({
      readCacheCapacity: 100,
      readCacheTTL: 60000,
      writeBufferThreshold: 50,
    });

    const node = makeNode('n1');
    manager.readCache.setNode(node.identity.id, node);
    expect(manager.readCache.getNode(node.identity.id)).toBe(node);

    manager.writeBuffer.push({
      operation: 1 as any,
      target: 'node',
      id: 'n1',
      data: node as any,
      timestamp: new Date().toISOString() as any,
    });
    expect(manager.writeBuffer.size).toBe(1);

    manager.clear();
    expect(manager.readCache.getNode(node.identity.id)).toBeUndefined();
    expect(manager.writeBuffer.isEmpty).toBe(true);

    manager.dispose();
  });

  it('should invalidate node and edge caches', () => {
    const manager = new StorageCacheManager();
    const node = makeNode('n1');
    const edge = makeEdge('e1', 'n1', 'n2');
    manager.readCache.setNode(node.identity.id, node);
    manager.readCache.setEdge(edge.id, edge);

    manager.invalidateNode(node.identity.id);
    expect(manager.readCache.getNode(node.identity.id)).toBeUndefined();

    manager.invalidateEdge(edge.id);
    expect(manager.readCache.getEdge(edge.id)).toBeUndefined();

    manager.dispose();
  });
});

// ─── Adapter Cache Integration Tests ──────────────────────────

describe('NetworkXStorageAdapter — Cache Integration', () => {
  it('should serve nodes from cache on subsequent reads', async () => {
    const adapter = await makeConnectedAdapter({ readCacheCapacity: 100, enableReadCache: true });
    await adapter.createNode(makeNode('n1'));

    // First read may or may not be from cache depending on whether createNode cached it
    const first = await adapter.getNode(brandNodeId('n1'));
    expect(first.success).toBe(true);

    // Second read should definitely be from cache
    const second = await adapter.getNode(brandNodeId('n1'));
    expect(second.fromCache).toBe(true);

    await adapter.disconnect();
  });

  it('should invalidate cache on update', async () => {
    const adapter = await makeConnectedAdapter({ readCacheCapacity: 100, enableReadCache: true });
    await adapter.createNode(makeNode('n1'));

    await adapter.getNode(brandNodeId('n1')); // populate cache
    await adapter.updateNode(brandNodeId('n1'), { updated: true });

    const result = await adapter.getNode(brandNodeId('n1'));
    expect(result.data?.properties).toHaveProperty('updated', true);

    await adapter.disconnect();
  });

  it('should clear cache', async () => {
    const adapter = await makeConnectedAdapter();
    await adapter.createNode(makeNode('n1'));
    await adapter.getNode(brandNodeId('n1')); // populate cache
    adapter.clearCache();
    // After cache clear, next read should be from storage
    const result = await adapter.getNode(brandNodeId('n1'));
    expect(result.fromCache).toBe(false);
    await adapter.disconnect();
  });

  it('should report cache hit rate in statistics', async () => {
    const adapter = await makeConnectedAdapter({ enableReadCache: true });
    await adapter.createNode(makeNode('n1'));
    await adapter.getNode(brandNodeId('n1')); // miss
    await adapter.getNode(brandNodeId('n1')); // hit
    const stats = adapter.getStatistics();
    expect(stats.cacheHitRate).toBeGreaterThan(0);
    await adapter.disconnect();
  });
});

// ─── Edge Case Tests ──────────────────────────────────────────

describe('NetworkXStorageAdapter — Edge Cases', () => {
  it('should handle empty graph operations', async () => {
    const adapter = await makeConnectedAdapter();
    expect(await adapter.nodeCount()).toBe(0);
    expect(await adapter.edgeCount()).toBe(0);
    expect((await adapter.getAllNodes()).length).toBe(0);
    expect((await adapter.getAllEdges()).length).toBe(0);
    const health = adapter.health();
    expect(health.healthy).toBe(true);
    await adapter.disconnect();
  });

  it('should handle clearing empty storage', async () => {
    const adapter = await makeConnectedAdapter();
    await adapter.clear();
    expect(await adapter.nodeCount()).toBe(0);
    await adapter.disconnect();
  });

  it('should handle health check on empty graph', async () => {
    const adapter = await makeConnectedAdapter();
    const verification = adapter.verify();
    expect(verification.healthy).toBe(true);
    await adapter.disconnect();
  });

  it('should report adapter identity correctly', async () => {
    const adapter = await makeConnectedAdapter({ id: 'my-adapter' });
    expect(adapter.id).toBe('my-adapter');
    expect(adapter.adapterType).toBe('networkx');
    await adapter.disconnect();
  });

  it('should use default config when none provided', async () => {
    const adapter = makeAdapter();
    expect(adapter.config.adapterType).toBe('networkx');
    expect(adapter.config.enableIndexes).toBe(true);
    expect(adapter.config.enableTransactions).toBe(true);
  });
});

// ─── Post-Review Fix Tests ────────────────────────────────────

describe('NetworkXStorageAdapter — Post-Review Fixes', () => {
  it('should enforce maxNodes limit', async () => {
    const adapter = await makeConnectedAdapter({ maxNodes: 3 });
    await adapter.createNode(makeNode('n1'));
    await adapter.createNode(makeNode('n2'));
    await adapter.createNode(makeNode('n3'));
    await expect(adapter.createNode(makeNode('n4'))).rejects.toThrow('Node limit exceeded');
    await adapter.disconnect();
  });

  it('should enforce maxEdges limit', async () => {
    const adapter = await makeConnectedAdapter({ maxEdges: 1 });
    await adapter.createNode(makeNode('n1'));
    await adapter.createNode(makeNode('n2'));
    await adapter.createEdge(makeEdge('e1', 'n1', 'n2'));
    await expect(adapter.createEdge(makeEdge('e2', 'n2', 'n1'))).rejects.toThrow('Edge limit exceeded');
    await adapter.disconnect();
  });

  it('should enforce maxNodes in batch create', async () => {
    const adapter = await makeConnectedAdapter({ maxNodes: 2 });
    const nodes = [makeNode('n1'), makeNode('n2'), makeNode('n3')];
    await expect(adapter.batchCreateNodes(nodes)).rejects.toThrow('Node limit exceeded');
    await adapter.disconnect();
  });

  it('should implement merge strategy on import', async () => {
    const adapter = await makeConnectedAdapter();
    await adapter.createNode(makeNode('n1'));

    // Create JSON with same node ID but different properties
    const exported = await adapter.exportGraph({
      format: ExportFormat.JSON,
      includeMetadata: true,
      prettyPrint: false,
    });

    // Modify the exported data to change properties
    const data = JSON.parse(exported.data);
    if (data.nodes.length > 0) {
      data.nodes[0].properties = { ...data.nodes[0].properties, merged_prop: 'hello' };
    }
    const modifiedData = JSON.stringify(data);

    const result = await adapter.importGraph(modifiedData, {
      format: ImportFormat.JSON,
      mergeStrategy: 'merge',
      validateBeforeImport: true,
    });

    const node = await adapter.getNode(brandNodeId('n1'));
    expect(node.data?.properties).toHaveProperty('merged_prop', 'hello');
    await adapter.disconnect();
  });

  it('should use separate counters for snapshot ID and version', async () => {
    const adapter = await makeConnectedAdapter();
    await adapter.createNode(makeNode('n1'));
    const snap1 = await adapter.saveSnapshot();
    const snap2 = await adapter.saveSnapshot();
    // Snapshot IDs should be unique
    expect(snap1.id).not.toBe(snap2.id);
    // Versions should be sequential
    expect(snap2.version).not.toBe(snap1.version);
    await adapter.disconnect();
  });

  it('should have side-effect-free has() in cache', () => {
    const cache = new StorageReadCache(100, 60000);
    const node = makeNode('n1');
    cache.setNode(node.identity.id, node);

    // has() should not affect hit rate
    const hitRateBefore = cache.hitRate;
    cache.hasNode(node.identity.id);
    const hitRateAfter = cache.hitRate;
    expect(hitRateBefore).toBe(hitRateAfter);
  });
});
