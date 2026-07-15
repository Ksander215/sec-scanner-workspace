/**
 * Knowledge Graph Storage Adapter — Benchmarks
 *
 * Performance benchmarks for 10K, 100K, 500K, and 1M nodes.
 * Measures:
 * - Insert throughput
 * - Update throughput
 * - Traversal (adjacency) latency
 * - Query latency (lookup by ID)
 * - Snapshot creation time
 * - Snapshot restore time
 * - Memory usage
 */

import { describe, it, expect } from 'vitest';
import { NetworkXStorageAdapter } from '../adapter/index.ts';
import { createGraphNode, createGraphEdge, createRelationship } from '../../models/index.ts';
import { NodeType, EdgeType, brandNodeId } from '../../types/index.ts';
import { ExportFormat } from '../types/index.ts';

// ─── Helpers ──────────────────────────────────────────────────

function generateNodes(count: number): ReturnType<typeof createGraphNode>[] {
  const types = [NodeType.Host, NodeType.Application, NodeType.Endpoint, NodeType.Service, NodeType.Asset];
  const nodes: ReturnType<typeof createGraphNode>[] = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    nodes.push(createGraphNode(`bench_node_${i}`, type, {
      labels: [`label_${i % 10}`],
      metadata: { source: `source_${i % 5}`, confidence: 0.8 + (i % 20) * 0.01, tags: [`tag_${i % 10}`] },
      properties: { index: i, category: `cat_${i % 20}`, value: Math.random() * 100 },
    }));
  }
  return nodes;
}

function generateEdges(nodeCount: number, edgePerNode: number = 2): ReturnType<typeof createGraphEdge>[] {
  const types = [EdgeType.CONNECTED_TO, EdgeType.DEPENDS_ON, EdgeType.USES, EdgeType.HOSTS, EdgeType.RELATED_TO];
  const edges: ReturnType<typeof createGraphEdge>[] = [];
  for (let i = 0; i < nodeCount - 1; i++) {
    for (let j = 1; j <= Math.min(edgePerNode, nodeCount - i - 1); j++) {
      const type = types[(i + j) % types.length];
      const rel = createRelationship(type);
      edges.push(createGraphEdge(`bench_edge_${i}_${j}`, `bench_node_${i}`, `bench_node_${i + j}`, rel));
    }
  }
  return edges;
}

interface BenchmarkResult {
  readonly operation: string;
  readonly count: number;
  readonly durationMs: number;
  readonly opsPerSecond: number;
  readonly memoryMB: number;
}

function formatResult(result: BenchmarkResult): string {
  return `${result.operation}: ${result.count} ops in ${result.durationMs.toFixed(1)}ms = ${result.opsPerSecond.toFixed(0)} ops/s, memory: ${result.memoryMB.toFixed(1)}MB`;
}

// ─── Benchmark Suites ─────────────────────────────────────────

const SIZES = [10_000, 100_000] as const;
// Note: 500K and 1M are very large for in-memory tests, use with caution

describe('NetworkXStorageAdapter — Benchmarks', () => {
  for (const size of SIZES) {
    describe(`${size.toLocaleString()} nodes`, () => {
      it('should benchmark insert operations', async () => {
        const adapter = new NetworkXStorageAdapter({ id: `bench-${size}`, enableReadCache: true, enableIndexes: true });
        await adapter.connect();

        const nodes = generateNodes(size);
        const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;

        const start = performance.now();
        const result = await adapter.batchCreateNodes(nodes);
        const duration = performance.now() - start;

        const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;

        const benchResult: BenchmarkResult = {
          operation: `Insert ${size.toLocaleString()} nodes`,
          count: size,
          durationMs: duration,
          opsPerSecond: (size / duration) * 1000,
          memoryMB: memAfter - memBefore,
        };

        console.log(formatResult(benchResult));
        expect(result.succeeded).toBe(size);
        expect(duration).toBeLessThan(size * 0.1); // Less than 0.1ms per node

        await adapter.disconnect();
      });

      it('should benchmark update operations', async () => {
        const adapter = new NetworkXStorageAdapter({ id: `bench-update-${size}`, enableReadCache: true, enableIndexes: true });
        await adapter.connect();

        const nodes = generateNodes(size);
        await adapter.batchCreateNodes(nodes);

        const updateCount = Math.min(1000, size);
        const start = performance.now();
        for (let i = 0; i < updateCount; i++) {
          await adapter.updateNode(brandNodeId(`bench_node_${i}`), { updated: true, timestamp: Date.now() });
        }
        const duration = performance.now() - start;

        const benchResult: BenchmarkResult = {
          operation: `Update ${updateCount.toLocaleString()} nodes`,
          count: updateCount,
          durationMs: duration,
          opsPerSecond: (updateCount / duration) * 1000,
          memoryMB: 0,
        };

        console.log(formatResult(benchResult));
        expect(duration).toBeLessThan(updateCount * 1); // Less than 1ms per update

        await adapter.disconnect();
      });

      it('should benchmark lookup operations', async () => {
        const adapter = new NetworkXStorageAdapter({ id: `bench-lookup-${size}`, enableReadCache: true, enableIndexes: true });
        await adapter.connect();

        const nodes = generateNodes(size);
        await adapter.batchCreateNodes(nodes);

        const lookupCount = Math.min(1000, size);
        const start = performance.now();
        for (let i = 0; i < lookupCount; i++) {
          await adapter.getNode(brandNodeId(`bench_node_${i}`));
        }
        const duration = performance.now() - start;

        const benchResult: BenchmarkResult = {
          operation: `Lookup ${lookupCount.toLocaleString()} nodes`,
          count: lookupCount,
          durationMs: duration,
          opsPerSecond: (lookupCount / duration) * 1000,
          memoryMB: 0,
        };

        console.log(formatResult(benchResult));
        expect(duration).toBeLessThan(lookupCount * 1);

        await adapter.disconnect();
      });

      it('should benchmark adjacency traversal', async () => {
        const adapter = new NetworkXStorageAdapter({ id: `bench-traversal-${size}`, enableReadCache: true, enableIndexes: true });
        await adapter.connect();

        const nodes = generateNodes(size);
        await adapter.batchCreateNodes(nodes);
        const edges = generateEdges(size, 2);
        await adapter.batchCreateEdges(edges);

        const traversalCount = Math.min(100, size);
        const start = performance.now();
        for (let i = 0; i < traversalCount; i++) {
          await adapter.getEdgesFrom(brandNodeId(`bench_node_${i}`));
        }
        const duration = performance.now() - start;

        const benchResult: BenchmarkResult = {
          operation: `Adjacency traversal ${traversalCount} nodes`,
          count: traversalCount,
          durationMs: duration,
          opsPerSecond: (traversalCount / duration) * 1000,
          memoryMB: 0,
        };

        console.log(formatResult(benchResult));

        await adapter.disconnect();
      });

      it('should benchmark snapshot creation', async () => {
        const adapter = new NetworkXStorageAdapter({ id: `bench-snap-${size}`, enableReadCache: true, enableIndexes: true });
        await adapter.connect();

        const nodes = generateNodes(size);
        await adapter.batchCreateNodes(nodes);

        const start = performance.now();
        const snap = await adapter.saveSnapshot();
        const duration = performance.now() - start;

        const benchResult: BenchmarkResult = {
          operation: `Snapshot creation (${size.toLocaleString()} nodes)`,
          count: 1,
          durationMs: duration,
          opsPerSecond: 1000 / duration,
          memoryMB: 0,
        };

        console.log(formatResult(benchResult));
        expect(snap.nodeCount).toBe(size);

        await adapter.disconnect();
      });

      it('should benchmark snapshot restore', async () => {
        const adapter = new NetworkXStorageAdapter({ id: `bench-restore-${size}`, enableReadCache: true, enableIndexes: true });
        await adapter.connect();

        const nodes = generateNodes(size);
        await adapter.batchCreateNodes(nodes);
        const snap = await adapter.saveSnapshot();

        // Modify after snapshot
        await adapter.createNode(createGraphNode('extra_node', NodeType.Host));

        const start = performance.now();
        await adapter.restoreSnapshot(snap.id);
        const duration = performance.now() - start;

        const benchResult: BenchmarkResult = {
          operation: `Snapshot restore (${size.toLocaleString()} nodes)`,
          count: 1,
          durationMs: duration,
          opsPerSecond: 1000 / duration,
          memoryMB: 0,
        };

        console.log(formatResult(benchResult));
        expect(await adapter.nodeCount()).toBe(size);

        await adapter.disconnect();
      });

      it('should benchmark JSON export', async () => {
        const adapter = new NetworkXStorageAdapter({ id: `bench-export-${size}`, enableReadCache: true, enableIndexes: true });
        await adapter.connect();

        const nodes = generateNodes(size);
        await adapter.batchCreateNodes(nodes);

        const start = performance.now();
        const result = await adapter.exportGraph({
          format: ExportFormat.JSON,
          includeMetadata: true,
          prettyPrint: false,
        });
        const duration = performance.now() - start;

        const benchResult: BenchmarkResult = {
          operation: `JSON export (${size.toLocaleString()} nodes)`,
          count: 1,
          durationMs: duration,
          opsPerSecond: 1000 / duration,
          memoryMB: result.data.length / 1024 / 1024,
        };

        console.log(formatResult(benchResult));

        await adapter.disconnect();
      });

      it('should benchmark memory usage', async () => {
        const adapter = new NetworkXStorageAdapter({ id: `bench-mem-${size}`, enableReadCache: true, enableIndexes: true });
        await adapter.connect();

        const nodes = generateNodes(size);
        const edges = generateEdges(size, 2);

        const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;

        await adapter.batchCreateNodes(nodes);
        await adapter.batchCreateEdges(edges);

        const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
        const memUsedMB = memAfter - memBefore;
        const stats = adapter.getStatistics();

        console.log(`Memory for ${size.toLocaleString()} nodes + ${edges.length} edges: ${memUsedMB.toFixed(1)}MB (estimated: ${stats.memoryUsageBytes / 1024 / 1024}MB)`);

        await adapter.disconnect();
      });
    });
  }
});
