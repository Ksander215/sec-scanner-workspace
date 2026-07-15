/**
 * Knowledge Graph Query Engine — Performance Benchmarks
 *
 * Benchmarks for query engine performance at scale:
 * - 10K, 50K, 100K, 500K nodes
 * - Lookup, filtered search, aggregation, projection, pagination, path query
 */

import { describe, it, expect } from 'vitest';
import {
  GraphQueryEngineImpl,
  equals,
  greaterThan,
  contains,
  inList,
  exists,
  and,
  or,
  AggregationOp,
} from '../index.ts';
import { InMemoryGraphRepository } from '../../runtime/repository/index.ts';
import { GraphTraversalEngineImpl } from '../../traversal/engine/index.ts';
import { createGraphNode, createGraphEdge, createRelationship } from '../../models/index.ts';
import { NodeType, EdgeType, brandNodeId } from '../../types/index.ts';

// ─── Helpers ───────────────────────────────────────────────────

async function buildScaledGraph(nodeCount: number): Promise<GraphQueryEngineImpl> {
  const repo = new InMemoryGraphRepository();
  const traversal = new GraphTraversalEngineImpl(repo);
  const engine = new GraphQueryEngineImpl(repo, traversal);

  const types = [NodeType.Host, NodeType.Application, NodeType.Endpoint, NodeType.Finding, NodeType.Service, NodeType.Identity];
  const edgeTypes = [EdgeType.DEPENDS_ON, EdgeType.USES, EdgeType.CONNECTED_TO, EdgeType.RELATED_TO, EdgeType.CONTAINS];

  // Batch create nodes
  for (let i = 0; i < nodeCount; i++) {
    const type = types[i % types.length];
    const node = createGraphNode(`n-${i}`, type, {
      labels: [`label-${i % 20}`, `group-${i % 5}`],
      metadata: {
        confidence: 0.3 + (i % 70) / 100,
        tags: [`tag-${i % 10}`],
        source: 'benchmark',
      },
      properties: { severity: Math.random() * 10, index: i, name: `node-${i}` },
    });
    await repo.addNode(node);
  }

  // Create edges (each node connects to 1-3 others)
  for (let i = 0; i < nodeCount; i++) {
    const numEdges = Math.min(3, nodeCount - i - 1);
    for (let j = 1; j <= numEdges; j++) {
      const target = i + j;
      const et = edgeTypes[(i + j) % edgeTypes.length];
      // Check source type compatibility
      const sourceType = types[i % types.length];
      const canUse = {
        [NodeType.Application]: [EdgeType.OWNS, EdgeType.USES, EdgeType.CONTAINS, EdgeType.DEPENDS_ON],
        [NodeType.Host]: [EdgeType.HOSTS, EdgeType.CONNECTED_TO, EdgeType.CONTAINS],
        [NodeType.Endpoint]: [EdgeType.CALLS, EdgeType.EXPOSES, EdgeType.RELATED_TO],
        [NodeType.Finding]: [EdgeType.LEADS_TO, EdgeType.DISCOVERED_BY, EdgeType.RELATED_TO],
        [NodeType.Service]: [EdgeType.CALLS, EdgeType.DEPENDS_ON, EdgeType.USES, EdgeType.CONNECTED_TO],
        [NodeType.Identity]: [EdgeType.AUTHENTICATES, EdgeType.TRUSTS, EdgeType.OWNS],
      }[sourceType] ?? [];
      const validET = canUse.includes(et) ? et : (canUse[0] ?? EdgeType.RELATED_TO);
      try {
        const edge = createGraphEdge(
          `e-${i}-${j}`,
          `n-${i}`,
          `n-${target}`,
          createRelationship(validET, { strength: 0.5 + Math.random() * 0.5 }),
          {},
        );
        await repo.addEdge(edge);
      } catch {
        // Skip invalid edges
      }
    }
  }

  return engine;
}

// ─── Benchmarks ────────────────────────────────────────────────

describe('Query Engine Benchmarks', () => {
  it('benchmark 10K nodes — lookup', async () => {
    const engine = await buildScaledGraph(10_000);
    const start = performance.now();

    const node = await engine.findNode(brandNodeId('n-5000'));

    const duration = performance.now() - start;
    console.log(`  10K lookup: ${duration.toFixed(1)}ms`);
    expect(node).toBeDefined();
    expect(duration).toBeLessThan(100);
  }, 30_000);

  it('benchmark 10K nodes — filtered search', async () => {
    const engine = await buildScaledGraph(10_000);
    const start = performance.now();

    const result = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .and(greaterThan('metadata.confidence', 0.7))
      .limit(100)
      .execute();

    const duration = performance.now() - start;
    console.log(`  10K filtered: ${duration.toFixed(1)}ms, rows: ${result.rows.length}`);
    expect(duration).toBeLessThan(500);
  }, 30_000);

  it('benchmark 10K nodes — aggregation', async () => {
    const engine = await buildScaledGraph(10_000);
    const start = performance.now();

    const result = await engine.query()
      .findNodes()
      .count()
      .avg('metadata.confidence')
      .min('metadata.confidence')
      .max('metadata.confidence')
      .execute();

    const duration = performance.now() - start;
    console.log(`  10K aggregation: ${duration.toFixed(1)}ms`);
    expect(result.aggregations.length).toBe(4);
    expect(duration).toBeLessThan(500);
  }, 30_000);

  it('benchmark 50K nodes — filtered search', async () => {
    const engine = await buildScaledGraph(50_000);
    const start = performance.now();

    const result = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .and(contains('metadata.tags', 'tag-3'))
      .limit(100)
      .execute();

    const duration = performance.now() - start;
    console.log(`  50K filtered: ${duration.toFixed(1)}ms, rows: ${result.rows.length}`);
    expect(duration).toBeLessThan(2000);
  }, 60_000);

  it('benchmark 50K nodes — pagination', async () => {
    const engine = await buildScaledGraph(50_000);
    const start = performance.now();

    const result = await engine.query()
      .findNodes()
      .limit(50)
      .offset(10_000)
      .sortDesc('metadata.confidence')
      .execute();

    const duration = performance.now() - start;
    console.log(`  50K pagination: ${duration.toFixed(1)}ms, rows: ${result.rows.length}`);
    expect(result.rows.length).toBeLessThanOrEqual(50);
    expect(duration).toBeLessThan(3000);
  }, 60_000);

  it('benchmark 100K nodes — filtered search', async () => {
    const engine = await buildScaledGraph(100_000);
    const start = performance.now();

    const result = await engine.query()
      .findNodes()
      .where(inList('identity.type', ['Host', 'Application']))
      .and(greaterThan('metadata.confidence', 0.8))
      .limit(200)
      .sortDesc('metadata.confidence')
      .execute();

    const duration = performance.now() - start;
    console.log(`  100K filtered: ${duration.toFixed(1)}ms, rows: ${result.rows.length}`);
    expect(duration).toBeLessThan(5000);
  }, 120_000);

  it('benchmark 100K nodes — aggregation + groupBy', async () => {
    const engine = await buildScaledGraph(100_000);
    const start = performance.now();

    const result = await engine.query()
      .findNodes()
      .groupBy(
        ['identity.type'],
        [
          { op: AggregationOp.Count, alias: 'count' },
          { op: AggregationOp.Avg, field: 'metadata.confidence', alias: 'avg_confidence' },
        ],
      )
      .execute();

    const duration = performance.now() - start;
    console.log(`  100K groupBy: ${duration.toFixed(1)}ms, groups: ${result.groups.length}`);
    expect(result.groups.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(5000);
  }, 120_000);

  it('benchmark 100K nodes — projection', async () => {
    const engine = await buildScaledGraph(100_000);
    const start = performance.now();

    const result = await engine.query()
      .findNodes()
      .select('identity.type', 'metadata.confidence')
      .limit(1000)
      .execute();

    const duration = performance.now() - start;
    console.log(`  100K projection: ${duration.toFixed(1)}ms, rows: ${result.rows.length}`);
    expect(duration).toBeLessThan(5000);
  }, 120_000);

  it('benchmark 100K nodes — path query', async () => {
    const engine = await buildScaledGraph(100_000);
    const start = performance.now();

    const result = await engine.path(brandNodeId('n-0'), brandNodeId('n-100'), 5);

    const duration = performance.now() - start;
    console.log(`  100K path: ${duration.toFixed(1)}ms, found: ${result.found}`);
    expect(duration).toBeLessThan(5000);
  }, 120_000);

  it('benchmark 100K nodes — edge search', async () => {
    const engine = await buildScaledGraph(100_000);
    const start = performance.now();

    const result = await engine.query()
      .findEdges()
      .where(equals('relationship.edgeType', 'DEPENDS_ON'))
      .limit(500)
      .execute();

    const duration = performance.now() - start;
    console.log(`  100K edge search: ${duration.toFixed(1)}ms, rows: ${result.rows.length}`);
    expect(duration).toBeLessThan(5000);
  }, 120_000);

  it('benchmark 100K nodes — cached repeat query', async () => {
    const engine = await buildScaledGraph(100_000);

    // First query (cold)
    const start1 = performance.now();
    await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .limit(100)
      .execute();
    const coldDuration = performance.now() - start1;

    // Second identical query (cached)
    const start2 = performance.now();
    const result = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .limit(100)
      .execute();
    const warmDuration = performance.now() - start2;

    console.log(`  100K cached: cold=${coldDuration.toFixed(1)}ms, warm=${warmDuration.toFixed(1)}ms, rows: ${result.rows.length}`);
    // Cached should be faster or comparable
    expect(warmDuration).toBeLessThan(coldDuration + 50); // Allow some variance
  }, 120_000);
});
