/**
 * Knowledge Graph Runtime — Performance Benchmarks
 *
 * Benchmarks for 1K, 10K, 50K, and 100K nodes.
 * Measures:
 * - Insert throughput (nodes and edges)
 * - Lookup latency
 * - Delete latency
 * - Snapshot create/restore
 * - Find by type (index performance)
 *
 * Run: npx vitest run src/domain/knowledge-graph/runtime/__benchmarks__/runtime-benchmark.ts
 */

import { describe, it, expect } from 'vitest';

import { NodeType, EdgeType, brandNodeId, brandEdgeId } from '../../types/index.ts';
import { createGraphNode, createGraphEdge, createRelationship } from '../../models/index.ts';
import { InMemoryGraphRepository } from '../repository/index.ts';

// ─── Helpers ────────────────────────────────────────────────

function generateNodes(count: number) {
  const types = [NodeType.Application, NodeType.Host, NodeType.Endpoint, NodeType.API, NodeType.Service];
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    nodes.push(createGraphNode(`node-${i}`, type, {
      labels: [`label-${i % 10}`],
      properties: { name: `Node-${i}`, index: i },
      metadata: { source: 'benchmark', tags: [`tag-${i % 5}`] },
    }));
  }
  return nodes;
}

function generateEdges(nodeCount: number, edgeCount: number) {
  const edgeTypes = [EdgeType.HOSTS, EdgeType.USES, EdgeType.DEPENDS_ON, EdgeType.CALLS, EdgeType.CONNECTED_TO];
  const edges = [];
  for (let i = 0; i < edgeCount; i++) {
    const sourceIdx = i % nodeCount;
    let targetIdx = (i + 1 + Math.floor(i / nodeCount)) % nodeCount;
    if (targetIdx === sourceIdx) targetIdx = (targetIdx + 1) % nodeCount;
    const rel = createRelationship(edgeTypes[i % edgeTypes.length]);
    edges.push(createGraphEdge(`edge-${i}`, `node-${sourceIdx}`, `node-${targetIdx}`, rel));
  }
  return edges;
}

function formatMs(ns: number): string {
  return (ns / 1_000_000).toFixed(2) + 'ms';
}

function formatOpsPerSec(count: number, ns: number): string {
  const seconds = ns / 1_000_000_000;
  return Math.round(count / seconds).toLocaleString() + ' ops/s';
}

// ─── Benchmark Runner ──────────────────────────────────────

interface BenchmarkResult {
  scale: string;
  nodeCount: number;
  edgeCount: number;
  insertNodesNs: number;
  insertEdgesNs: number;
  lookupNodeNs: number;
  lookupEdgeNs: number;
  deleteNodeNs: number;
  findByTypeNs: number;
  createSnapshotNs: number;
  restoreSnapshotNs: number;
  statisticsNs: number;
}

async function runBenchmark(nodeCount: number, edgeMultiplier: number = 3): Promise<BenchmarkResult> {
  const edgeCount = Math.min(nodeCount * edgeMultiplier, nodeCount * (nodeCount - 1) / 2);
  const repo = new InMemoryGraphRepository();
  const nodes = generateNodes(nodeCount);
  const edges = generateEdges(nodeCount, edgeCount);

  // Insert nodes
  const insertNodesStart = performance.now();
  for (const node of nodes) {
    repo.createNode(node);
  }
  const insertNodesNs = (performance.now() - insertNodesStart) * 1_000_000;

  // Insert edges
  const insertEdgesStart = performance.now();
  for (const edge of edges) {
    repo.createEdge(edge);
  }
  const insertEdgesNs = (performance.now() - insertEdgesStart) * 1_000_000;

  // Lookup node (random mid-point)
  const lookupNodeId = brandNodeId(`node-${Math.floor(nodeCount / 2)}`);
  const lookupNodeStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    repo.readNode(lookupNodeId);
  }
  const lookupNodeNs = ((performance.now() - lookupNodeStart) / 1000) * 1_000_000;

  // Lookup edge (random mid-point)
  const lookupEdgeId = brandEdgeId(`edge-${Math.floor(edgeCount / 2)}`);
  const lookupEdgeStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    repo.readEdge(lookupEdgeId);
  }
  const lookupEdgeNs = ((performance.now() - lookupEdgeStart) / 1000) * 1_000_000;

  // Delete node
  const deleteStart = performance.now();
  repo.deleteNode(brandNodeId(`node-${nodeCount - 1}`));
  const deleteNodeNs = (performance.now() - deleteStart) * 1_000_000;

  // Find by type (index)
  const findByTypeStart = performance.now();
  await repo.findNodesByType(NodeType.Application);
  const findByTypeNs = (performance.now() - findByTypeStart) * 1_000_000;

  // Create snapshot
  const snapStart = performance.now();
  const snapshot = await repo.createSnapshot();
  const createSnapshotNs = (performance.now() - snapStart) * 1_000_000;

  // Restore snapshot
  const restoreStart = performance.now();
  await repo.restoreSnapshot(snapshot.id);
  const restoreSnapshotNs = (performance.now() - restoreStart) * 1_000_000;

  // Statistics
  const statsStart = performance.now();
  await repo.getStatistics();
  const statisticsNs = (performance.now() - statsStart) * 1_000_000;

  return {
    scale: `${(nodeCount / 1000).toFixed(0)}K`,
    nodeCount,
    edgeCount,
    insertNodesNs,
    insertEdgesNs,
    lookupNodeNs,
    lookupEdgeNs,
    deleteNodeNs,
    findByTypeNs,
    createSnapshotNs,
    restoreSnapshotNs,
    statisticsNs,
  };
}

// ═══════════════════════════════════════════════════════════════
// BENCHMARKS
// ═══════════════════════════════════════════════════════════════

describe('Knowledge Graph Runtime Benchmarks', () => {
  const results: BenchmarkResult[] = [];

  it('benchmark 1K nodes, 3K edges', async () => {
    const result = await runBenchmark(1_000, 3);
    results.push(result);
    console.log(`\n═══ 1K Benchmark ═══`);
    console.log(`  Insert ${result.nodeCount} nodes: ${formatMs(result.insertNodesNs)} (${formatOpsPerSec(result.nodeCount, result.insertNodesNs)})`);
    console.log(`  Insert ${result.edgeCount} edges: ${formatMs(result.insertEdgesNs)} (${formatOpsPerSec(result.edgeCount, result.insertEdgesNs)})`);
    console.log(`  Lookup node (avg 1000x): ${(result.lookupNodeNs / 1000).toFixed(3)}us`);
    console.log(`  Lookup edge (avg 1000x): ${(result.lookupEdgeNs / 1000).toFixed(3)}us`);
    console.log(`  Delete node: ${formatMs(result.deleteNodeNs)}`);
    console.log(`  Find by type: ${formatMs(result.findByTypeNs)}`);
    console.log(`  Create snapshot: ${formatMs(result.createSnapshotNs)}`);
    console.log(`  Restore snapshot: ${formatMs(result.restoreSnapshotNs)}`);
    console.log(`  Statistics: ${formatMs(result.statisticsNs)}`);

    // Verify performance targets
    expect(result.lookupNodeNs / 1000).toBeLessThan(100); // < 100us per lookup
    expect(result.lookupEdgeNs / 1000).toBeLessThan(100); // < 100us per lookup
  });

  it('benchmark 10K nodes, 30K edges', async () => {
    const result = await runBenchmark(10_000, 3);
    results.push(result);
    console.log(`\n═══ 10K Benchmark ═══`);
    console.log(`  Insert ${result.nodeCount} nodes: ${formatMs(result.insertNodesNs)} (${formatOpsPerSec(result.nodeCount, result.insertNodesNs)})`);
    console.log(`  Insert ${result.edgeCount} edges: ${formatMs(result.insertEdgesNs)} (${formatOpsPerSec(result.edgeCount, result.insertEdgesNs)})`);
    console.log(`  Lookup node (avg 1000x): ${(result.lookupNodeNs / 1000).toFixed(3)}us`);
    console.log(`  Lookup edge (avg 1000x): ${(result.lookupEdgeNs / 1000).toFixed(3)}us`);
    console.log(`  Delete node: ${formatMs(result.deleteNodeNs)}`);
    console.log(`  Find by type: ${formatMs(result.findByTypeNs)}`);
    console.log(`  Create snapshot: ${formatMs(result.createSnapshotNs)}`);
    console.log(`  Restore snapshot: ${formatMs(result.restoreSnapshotNs)}`);
    console.log(`  Statistics: ${formatMs(result.statisticsNs)}`);

    expect(result.lookupNodeNs / 1000).toBeLessThan(100);
    expect(result.lookupEdgeNs / 1000).toBeLessThan(100);
  });

  it('benchmark 50K nodes, 150K edges', async () => {
    const result = await runBenchmark(50_000, 3);
    results.push(result);
    console.log(`\n═══ 50K Benchmark ═══`);
    console.log(`  Insert ${result.nodeCount} nodes: ${formatMs(result.insertNodesNs)} (${formatOpsPerSec(result.nodeCount, result.insertNodesNs)})`);
    console.log(`  Insert ${result.edgeCount} edges: ${formatMs(result.insertEdgesNs)} (${formatOpsPerSec(result.edgeCount, result.insertEdgesNs)})`);
    console.log(`  Lookup node (avg 1000x): ${(result.lookupNodeNs / 1000).toFixed(3)}us`);
    console.log(`  Lookup edge (avg 1000x): ${(result.lookupEdgeNs / 1000).toFixed(3)}us`);
    console.log(`  Delete node: ${formatMs(result.deleteNodeNs)}`);
    console.log(`  Find by type: ${formatMs(result.findByTypeNs)}`);
    console.log(`  Create snapshot: ${formatMs(result.createSnapshotNs)}`);
    console.log(`  Restore snapshot: ${formatMs(result.restoreSnapshotNs)}`);
    console.log(`  Statistics: ${formatMs(result.statisticsNs)}`);

    expect(result.lookupNodeNs / 1000).toBeLessThan(100);
  });

  it('benchmark 100K nodes, 300K edges', async () => {
    const result = await runBenchmark(100_000, 3);
    results.push(result);
    console.log(`\n═══ 100K Benchmark ═══`);
    console.log(`  Insert ${result.nodeCount} nodes: ${formatMs(result.insertNodesNs)} (${formatOpsPerSec(result.nodeCount, result.insertNodesNs)})`);
    console.log(`  Insert ${result.edgeCount} edges: ${formatMs(result.insertEdgesNs)} (${formatOpsPerSec(result.edgeCount, result.insertEdgesNs)})`);
    console.log(`  Lookup node (avg 1000x): ${(result.lookupNodeNs / 1000).toFixed(3)}us`);
    console.log(`  Lookup edge (avg 1000x): ${(result.lookupEdgeNs / 1000).toFixed(3)}us`);
    console.log(`  Delete node: ${formatMs(result.deleteNodeNs)}`);
    console.log(`  Find by type: ${formatMs(result.findByTypeNs)}`);
    console.log(`  Create snapshot: ${formatMs(result.createSnapshotNs)}`);
    console.log(`  Restore snapshot: ${formatMs(result.restoreSnapshotNs)}`);
    console.log(`  Statistics: ${formatMs(result.statisticsNs)}`);

    // 100K should still have fast lookups
    expect(result.lookupNodeNs / 1000).toBeLessThan(100);

    // Print summary
    console.log(`\n═══════════════════════════════════════`);
    console.log(`  SUMMARY TABLE`);
    console.log(`═══════════════════════════════════════`);
    console.log(`  Scale  | Nodes    | Edges    | Insert Ns  | Insert Es  | Lookup N  | Lookup E  | Snapshot  | Restore`);
    for (const r of results) {
      console.log(
        `  ${r.scale.padEnd(6)} | ${String(r.nodeCount).padStart(7)} | ${String(r.edgeCount).padStart(7)} | ` +
        `${formatMs(r.insertNodesNs).padStart(10)} | ${formatMs(r.insertEdgesNs).padStart(10)} | ` +
        `${(r.lookupNodeNs / 1000).toFixed(2).padStart(7)}us | ${(r.lookupEdgeNs / 1000).toFixed(2).padStart(7)}us | ` +
        `${formatMs(r.createSnapshotNs).padStart(9)} | ${formatMs(r.restoreSnapshotNs).padStart(9)}`,
      );
    }
  });
});
