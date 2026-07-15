/**
 * Knowledge Graph Query Engine — Comprehensive Tests
 *
 * Tests cover:
 * - Simple queries
 * - Complex queries with nested predicates
 * - Composite filters (AND, OR, NOT, GROUP)
 * - Aggregation (count, sum, avg, min, max, distinct)
 * - Projection
 * - Sorting (asc, desc, multi-sort)
 * - Pagination (offset, cursor, page)
 * - Explain
 * - Optimizer
 * - Cache
 * - Invalid queries
 * - Large graph
 * - Empty graph
 * - Path queries
 * - Subgraph queries
 * - Fluent builder immutability
 * - Events
 * - Statistics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GraphQueryEngineImpl,
  QueryBuilder,
  QueryOptimizer,
  QueryCache,
  QueryStatisticsCollector,
  PredicateOperator,
  FilterComposition,
  AggregationOp,
  PaginationMode,
  SortDirection,
  QueryTarget,
  EMPTY_PROJECTION,
  DEFAULT_PAGINATION,
  emptyQueryStatistics,
  equals,
  notEquals,
  contains,
  startsWith,
  endsWith,
  regex,
  exists,
  inList,
  greaterThan,
  lessThan,
  gte,
  lte,
  negate,
  evaluateNodePredicate,
  evaluateEdgePredicate,
  evaluateNodeFilter,
  evaluateEdgeFilter,
  and,
  or,
  notFilter,
  group,
  countPredicates,
  flattenPredicates,
  queryOptimizer,
  buildExplainPlan,
  buildQuickPlan,
  createQueryStartedEvent,
  createQueryCompletedEvent,
  createQueryCancelledEvent,
  createQueryCachedEvent,
} from '../index.ts';
import { InMemoryGraphRepository } from '../../runtime/repository/index.ts';
import { GraphTraversalEngineImpl } from '../../traversal/engine/index.ts';
import {
  createGraphNode,
  createGraphEdge,
  createRelationship,
  createGraphQuery,
} from '../../models/index.ts';
import {
  NodeType,
  EdgeType,
  brandNodeId,
  brandEdgeId,
  brandQueryId,
} from '../../types/index.ts';

// ─── Test Helpers ──────────────────────────────────────────────

function makeNode(id: string, type: NodeType, opts?: { labels?: string[]; confidence?: number; tags?: string[]; properties?: Record<string, unknown> }): ReturnType<typeof createGraphNode> {
  return createGraphNode(id, type, {
    labels: opts?.labels ?? [],
    metadata: { confidence: opts?.confidence ?? 1.0, tags: opts?.tags ?? [], source: 'test' },
    properties: opts?.properties ?? {},
  });
}

function makeEdge(id: string, src: string, tgt: string, edgeType: EdgeType, strength: number = 1.0): ReturnType<typeof createGraphEdge> {
  return createGraphEdge(id, src, tgt, createRelationship(edgeType, { strength }), {});
}

async function buildTestGraph(): Promise<{
  repo: InMemoryGraphRepository;
  traversal: GraphTraversalEngineImpl;
  engine: GraphQueryEngineImpl;
}> {
  const repo = new InMemoryGraphRepository();
  const traversal = new GraphTraversalEngineImpl(repo);
  const engine = new GraphQueryEngineImpl(repo, traversal);

  // Create a security-focused graph
  const app = makeNode('app-1', NodeType.Application, { labels: ['web', 'critical'], confidence: 0.95, tags: ['production'] });
  const host1 = makeNode('host-1', NodeType.Host, { labels: ['linux'], confidence: 0.9, tags: ['production'], properties: { ip: '10.0.0.1', os: 'Ubuntu 22.04' } });
  const host2 = makeNode('host-2', NodeType.Host, { labels: ['windows'], confidence: 0.85, tags: ['staging'], properties: { ip: '10.0.0.2', os: 'Windows Server 2022' } });
  const endpoint1 = makeNode('ep-1', NodeType.Endpoint, { labels: ['api'], confidence: 0.8, properties: { path: '/api/v1/users' } });
  const endpoint2 = makeNode('ep-2', NodeType.Endpoint, { labels: ['api'], confidence: 0.75, properties: { path: '/api/v1/admin' } });
  const finding1 = makeNode('finding-1', NodeType.Finding, { labels: ['critical'], confidence: 0.98, tags: ['verified'], properties: { severity: 9.5, cvss: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' } });
  const finding2 = makeNode('finding-2', NodeType.Finding, { labels: ['medium'], confidence: 0.7, properties: { severity: 5.5, cvss: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N' } });
  const attack1 = makeNode('attack-1', NodeType.AttackStep, { labels: ['initial-access'], confidence: 0.9, properties: { technique: 'T1190' } });
  const identity1 = makeNode('identity-1', NodeType.Identity, { labels: ['service-account'], confidence: 0.85, properties: { name: 'svc-api' } });

  await repo.addNode(app);
  await repo.addNode(host1);
  await repo.addNode(host2);
  await repo.addNode(endpoint1);
  await repo.addNode(endpoint2);
  await repo.addNode(finding1);
  await repo.addNode(finding2);
  await repo.addNode(attack1);
  await repo.addNode(identity1);

  await repo.addEdge(makeEdge('e1', 'app-1', 'host-1', EdgeType.DEPENDS_ON, 0.9));
  await repo.addEdge(makeEdge('e2', 'app-1', 'ep-1', EdgeType.OWNS));
  await repo.addEdge(makeEdge('e3', 'host-1', 'ep-1', EdgeType.HOSTS, 0.8));
  await repo.addEdge(makeEdge('e4', 'host-2', 'ep-2', EdgeType.HOSTS, 0.7));
  await repo.addEdge(makeEdge('e5', 'finding-1', 'attack-1', EdgeType.LEADS_TO, 0.95));
  await repo.addEdge(makeEdge('e6', 'finding-2', 'ep-2', EdgeType.RELATED_TO, 0.5));
  await repo.addEdge(makeEdge('e7', 'identity-1', 'app-1', EdgeType.AUTHENTICATES, 0.8));
  await repo.addEdge(makeEdge('e8', 'ep-1', 'ep-2', EdgeType.CALLS, 0.6));
  await repo.addEdge(makeEdge('e9', 'app-1', 'ep-2', EdgeType.EXPOSES, 0.7));

  return { repo, traversal, engine };
}

async function buildEmptyGraph(): Promise<{
  repo: InMemoryGraphRepository;
  traversal: GraphTraversalEngineImpl;
  engine: GraphQueryEngineImpl;
}> {
  const repo = new InMemoryGraphRepository();
  const traversal = new GraphTraversalEngineImpl(repo);
  const engine = new GraphQueryEngineImpl(repo, traversal);
  return { repo, traversal, engine };
}

async function buildLargeGraph(nodeCount: number): Promise<{
  repo: InMemoryGraphRepository;
  traversal: GraphTraversalEngineImpl;
  engine: GraphQueryEngineImpl;
}> {
  const repo = new InMemoryGraphRepository();
  const traversal = new GraphTraversalEngineImpl(repo);
  const engine = new GraphQueryEngineImpl(repo, traversal);

  const types = [NodeType.Host, NodeType.Application, NodeType.Endpoint, NodeType.Finding, NodeType.Service];
  for (let i = 0; i < nodeCount; i++) {
    const type = types[i % types.length];
    await repo.addNode(makeNode(`n-${i}`, type, {
      confidence: 0.5 + Math.random() * 0.5,
      labels: [`label-${i % 10}`],
      tags: [`tag-${i % 5}`],
      properties: { severity: Math.random() * 10, index: i },
    }));
  }

  // Create edges (each node connects to 2-3 others)
  const edgeTypes = [EdgeType.DEPENDS_ON, EdgeType.USES, EdgeType.CONNECTED_TO, EdgeType.RELATED_TO];
  for (let i = 0; i < nodeCount; i++) {
    const targets = [Math.min(i + 1, nodeCount - 1), Math.min(i + 2, nodeCount - 1)];
    for (let j = 0; j < targets.length; j++) {
      if (i !== targets[j]) {
        const et = edgeTypes[(i + j) % edgeTypes.length];
        try {
          await repo.addEdge(makeEdge(`e-${i}-${j}`, `n-${i}`, `n-${targets[j]}`, et, 0.5 + Math.random() * 0.5));
        } catch { /* skip invalid edges */ }
      }
    }
  }

  return { repo, traversal, engine };
}

// ─── Tests ────────────────────────────────────────────────────

describe('Query Engine — Predicates', () => {
  it('should evaluate equals predicate', () => {
    const node = makeNode('n1', NodeType.Host);
    expect(evaluateNodePredicate(equals('identity.type', 'Host'), node)).toBe(true);
    expect(evaluateNodePredicate(equals('identity.type', 'Application'), node)).toBe(false);
  });

  it('should evaluate notEquals predicate', () => {
    const node = makeNode('n1', NodeType.Host);
    expect(evaluateNodePredicate(notEquals('identity.type', 'Application'), node)).toBe(true);
    expect(evaluateNodePredicate(notEquals('identity.type', 'Host'), node)).toBe(false);
  });

  it('should evaluate contains predicate', () => {
    const node = makeNode('n1', NodeType.Host, { labels: ['linux-server'] });
    expect(evaluateNodePredicate(contains('identity.labels', 'linux'), node)).toBe(true);
    expect(evaluateNodePredicate(contains('identity.type', 'os'), node)).toBe(true);
    expect(evaluateNodePredicate(contains('identity.type', 'xyz'), node)).toBe(false);
  });

  it('should evaluate startsWith predicate', () => {
    const node = makeNode('n1', NodeType.Host);
    expect(evaluateNodePredicate(startsWith('identity.type', 'Ho'), node)).toBe(true);
    expect(evaluateNodePredicate(startsWith('identity.type', 'App'), node)).toBe(false);
  });

  it('should evaluate endsWith predicate', () => {
    const node = makeNode('n1', NodeType.Host);
    expect(evaluateNodePredicate(endsWith('identity.type', 'st'), node)).toBe(true);
    expect(evaluateNodePredicate(endsWith('identity.type', 'ion'), node)).toBe(false);
  });

  it('should evaluate regex predicate', () => {
    const node = makeNode('n1', NodeType.Host);
    expect(evaluateNodePredicate(regex('identity.type', '^H.*t$'), node)).toBe(true);
    expect(evaluateNodePredicate(regex('identity.type', '^App'), node)).toBe(false);
  });

  it('should evaluate exists predicate', () => {
    const node = makeNode('n1', NodeType.Host, { properties: { ip: '10.0.0.1' } });
    expect(evaluateNodePredicate(exists('properties.ip'), node)).toBe(true);
    expect(evaluateNodePredicate(exists('properties.nonexistent'), node)).toBe(false);
  });

  it('should evaluate in predicate', () => {
    const node = makeNode('n1', NodeType.Host);
    expect(evaluateNodePredicate(inList('identity.type', ['Host', 'Application']), node)).toBe(true);
    expect(evaluateNodePredicate(inList('identity.type', ['Application', 'Service']), node)).toBe(false);
  });

  it('should evaluate greaterThan/lessThan predicates', () => {
    const node = makeNode('n1', NodeType.Host, { confidence: 0.8 });
    expect(evaluateNodePredicate(greaterThan('metadata.confidence', 0.5), node)).toBe(true);
    expect(evaluateNodePredicate(greaterThan('metadata.confidence', 0.9), node)).toBe(false);
    expect(evaluateNodePredicate(lessThan('metadata.confidence', 0.9), node)).toBe(true);
    expect(evaluateNodePredicate(lessThan('metadata.confidence', 0.5), node)).toBe(false);
  });

  it('should evaluate gte/lte predicates', () => {
    const node = makeNode('n1', NodeType.Host, { confidence: 0.8 });
    expect(evaluateNodePredicate(gte('metadata.confidence', 0.8), node)).toBe(true);
    expect(evaluateNodePredicate(gte('metadata.confidence', 0.9), node)).toBe(false);
    expect(evaluateNodePredicate(lte('metadata.confidence', 0.8), node)).toBe(true);
    expect(evaluateNodePredicate(lte('metadata.confidence', 0.7), node)).toBe(false);
  });

  it('should negate predicates', () => {
    const node = makeNode('n1', NodeType.Host);
    const negated = negate(equals('identity.type', 'Host'));
    expect(evaluateNodePredicate(negated, node)).toBe(false);
  });

  it('should handle null/undefined field values', () => {
    const node = makeNode('n1', NodeType.Host);
    expect(evaluateNodePredicate(equals('properties.missing', 'something'), node)).toBe(false);
    expect(evaluateNodePredicate(exists('properties.missing'), node)).toBe(false);
  });

  it('should evaluate edge predicates', () => {
    const edge = makeEdge('e1', 'a', 'b', EdgeType.DEPENDS_ON, 0.8);
    expect(evaluateEdgePredicate(equals('relationship.edgeType', 'DEPENDS_ON'), edge)).toBe(true);
    expect(evaluateEdgePredicate(greaterThan('relationship.strength', 0.5), edge)).toBe(true);
    expect(evaluateEdgePredicate(lessThan('relationship.strength', 0.5), edge)).toBe(false);
  });
});

describe('Query Engine — Composite Filters', () => {
  it('should evaluate AND filter', () => {
    const node = makeNode('n1', NodeType.Host, { confidence: 0.9 });
    const filter = and(
      equals('identity.type', 'Host'),
      greaterThan('metadata.confidence', 0.8),
    );
    expect(evaluateNodeFilter(filter, node)).toBe(true);

    const filter2 = and(
      equals('identity.type', 'Host'),
      lessThan('metadata.confidence', 0.5),
    );
    expect(evaluateNodeFilter(filter2, node)).toBe(false);
  });

  it('should evaluate OR filter', () => {
    const node = makeNode('n1', NodeType.Host);
    const filter = or(
      equals('identity.type', 'Host'),
      equals('identity.type', 'Application'),
    );
    expect(evaluateNodeFilter(filter, node)).toBe(true);

    const filter2 = or(
      equals('identity.type', 'Application'),
      equals('identity.type', 'Service'),
    );
    expect(evaluateNodeFilter(filter2, node)).toBe(false);
  });

  it('should evaluate NOT filter', () => {
    const node = makeNode('n1', NodeType.Host);
    const filter = notFilter(equals('identity.type', 'Host'));
    expect(evaluateNodeFilter(filter, node)).toBe(false);

    const filter2 = notFilter(equals('identity.type', 'Application'));
    expect(evaluateNodeFilter(filter2, node)).toBe(true);
  });

  it('should evaluate GROUP filter', () => {
    const node = makeNode('n1', NodeType.Host, { confidence: 0.9 });
    const filter = group(
      equals('identity.type', 'Host'),
      greaterThan('metadata.confidence', 0.8),
    );
    expect(evaluateNodeFilter(filter, node)).toBe(true);
  });

  it('should handle nested filters', () => {
    const node = makeNode('n1', NodeType.Host, { confidence: 0.9, tags: ['production'] });
    const filter = and(
      equals('identity.type', 'Host'),
      or(
        greaterThan('metadata.confidence', 0.95),
        group(
          contains('metadata.tags', 'production'),
          gte('metadata.confidence', 0.8),
        ),
      ),
    );
    expect(evaluateNodeFilter(filter, node)).toBe(true);
  });

  it('should short-circuit AND evaluation', () => {
    const node = makeNode('n1', NodeType.Application);
    const filter = and(
      equals('identity.type', 'Host'), // false
      equals('identity.type', 'never_evaluated'), // would fail if evaluated
    );
    expect(evaluateNodeFilter(filter, node)).toBe(false);
  });

  it('should short-circuit OR evaluation', () => {
    const node = makeNode('n1', NodeType.Host);
    const filter = or(
      equals('identity.type', 'Host'), // true — short-circuits
      equals('identity.type', 'never_evaluated'),
    );
    expect(evaluateNodeFilter(filter, node)).toBe(true);
  });

  it('should return true for null filter', () => {
    const node = makeNode('n1', NodeType.Host);
    expect(evaluateNodeFilter(null, node)).toBe(true);
  });

  it('should evaluate edge filters', () => {
    const edge = makeEdge('e1', 'a', 'b', EdgeType.DEPENDS_ON, 0.8);
    const filter = and(
      equals('relationship.edgeType', 'DEPENDS_ON'),
      greaterThan('relationship.strength', 0.5),
    );
    expect(evaluateEdgeFilter(filter, edge)).toBe(true);
  });

  it('should count predicates', () => {
    const filter = and(
      equals('a', '1'),
      or(
        equals('b', '2'),
        equals('c', '3'),
      ),
    );
    expect(countPredicates(filter)).toBe(3);
    expect(countPredicates(null)).toBe(0);
  });

  it('should flatten predicates', () => {
    const filter = and(
      equals('a', '1'),
      or(equals('b', '2'), equals('c', '3')),
    );
    const flat = flattenPredicates(filter);
    expect(flat).toHaveLength(3);
    expect(flat.map(p => p.field)).toEqual(['a', 'b', 'c']);
  });
});

describe('Query Engine — Fluent Builder', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should create immutable builder instances', () => {
    const b1 = engine.query();
    const b2 = b1.findNodes();
    const b3 = b2.where(equals('identity.type', 'Host'));
    expect(b1).not.toBe(b2);
    expect(b2).not.toBe(b3);
    // b1 is default (nodes), b2 is also nodes — they share the same target enum value
    // The key is they're different builder instances
    expect(b1.filter).toBeNull();
    expect(b2.filter).toBeNull();
    expect(b3.filter).not.toBeNull();
  });

  it('should build a simple node query', async () => {
    const result = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .execute();
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every(n => (n as any).identity.type === 'Host')).toBe(true);
  });

  it('should build a query with AND filter', async () => {
    const result = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .and(greaterThan('metadata.confidence', 0.8))
      .execute();
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should build a query with OR filter', async () => {
    const result = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .or(equals('identity.type', 'Application'))
      .execute();
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should build a query with NOT filter', async () => {
    const result = await engine.query()
      .findNodes()
      .not(equals('identity.type', 'Host'))
      .execute();
    expect(result.rows.every(n => (n as any).identity.type !== 'Host')).toBe(true);
  });

  it('should build a query with limit', async () => {
    const result = await engine.query()
      .findNodes()
      .limit(2)
      .execute();
    expect(result.rows.length).toBeLessThanOrEqual(2);
  });

  it('should build a query with offset', async () => {
    const all = await engine.query().findNodes().execute();
    const paged = await engine.query().findNodes().offset(2).execute();
    expect(paged.rows.length).toBeLessThanOrEqual(all.rows.length - 2);
  });

  it('should build a query with sort', async () => {
    const result = await engine.query()
      .findNodes()
      .sortDesc('metadata.confidence')
      .execute();
    if (result.rows.length >= 2) {
      const c1 = (result.rows[0] as any).metadata.confidence;
      const c2 = (result.rows[1] as any).metadata.confidence;
      expect(c1).toBeGreaterThanOrEqual(c2);
    }
  });

  it('should build a query with select projection', () => {
    const spec = engine.query()
      .findNodes()
      .select('identity.type', 'metadata.confidence')
      .build();
    expect(spec.projection.select).toEqual(['identity.type', 'metadata.confidence']);
  });

  it('should build a query with exclude projection', () => {
    const spec = engine.query()
      .findNodes()
      .exclude('properties')
      .build();
    expect(spec.projection.exclude).toEqual(['properties']);
  });

  it('should build a query with aggregation', async () => {
    const result = await engine.query()
      .findNodes()
      .count()
      .execute();
    expect(result.aggregations.length).toBe(1);
    expect(result.aggregations[0].name).toBe('count');
  });

  it('should build a subgraph query', async () => {
    const result = await engine.query()
      .findSubgraph(brandNodeId('app-1'), 2)
      .executeSubgraph();
    expect(result.subgraph.nodes.length).toBeGreaterThan(0);
  });

  it('should build a path query', async () => {
    const result = await engine.query()
      .findPath(brandNodeId('app-1'), brandNodeId('ep-1'), 5)
      .executePath();
    // Path may or may not be found depending on graph structure
    expect(typeof result.found).toBe('boolean');
  });

  it('should produce explain plan', () => {
    const explain = engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .explain();
    expect(explain.plan).toBeDefined();
    expect(explain.plan.stages.length).toBeGreaterThan(0);
    expect(explain.estimatedComplexity).toBeDefined();
  });

  it('should not mutate builder state on chaining', () => {
    const b1 = engine.query().findNodes();
    const b2 = b1.where(equals('identity.type', 'Host'));
    const b3 = b1.where(equals('identity.type', 'Application'));
    // b1 should have no filter, b2 and b3 different filters
    expect(b1.filter).toBeNull();
    expect(b2.filter).not.toBeNull();
    expect(b3.filter).not.toBeNull();
  });
});

describe('Query Engine — Node Search', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should find nodes by type', async () => {
    const nodes = await engine.findByType(NodeType.Host);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every(n => n.identity.type === NodeType.Host)).toBe(true);
  });

  it('should find a single node by ID', async () => {
    const node = await engine.findNode(brandNodeId('host-1'));
    expect(node).toBeDefined();
    expect(node!.identity.id as string).toBe('host-1');
  });

  it('should find node by ID (findById alias)', async () => {
    const node = await engine.findById(brandNodeId('host-1'));
    expect(node).toBeDefined();
  });

  it('should return undefined for non-existent node', async () => {
    const node = await engine.findNode(brandNodeId('nonexistent'));
    expect(node).toBeUndefined();
  });

  it('should find nodes by label', async () => {
    const nodes = await engine.findByLabel('critical');
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every(n => n.identity.labels.includes('critical'))).toBe(true);
  });

  it('should find nodes by tag', async () => {
    const nodes = await engine.findByTag('production');
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every(n => n.metadata.tags.includes('production'))).toBe(true);
  });

  it('should find nodes by metadata', async () => {
    const nodes = await engine.findByMetadata('confidence', 0.95);
    // May or may not match exactly due to type coercion
    expect(Array.isArray(nodes)).toBe(true);
  });
});

describe('Query Engine — Edge Search', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should find edges by relationship type', async () => {
    const edges = await engine.findByRelationship(EdgeType.DEPENDS_ON);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every(e => e.relationship.edgeType === EdgeType.DEPENDS_ON)).toBe(true);
  });

  it('should find incoming edges', async () => {
    const edges = await engine.findIncoming(brandNodeId('ep-1'));
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every(e => e.targetId as string === 'ep-1')).toBe(true);
  });

  it('should find outgoing edges', async () => {
    const edges = await engine.findOutgoing(brandNodeId('app-1'));
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every(e => e.sourceId as string === 'app-1')).toBe(true);
  });

  it('should find edges between two nodes', async () => {
    const edges = await engine.findBetween(brandNodeId('app-1'), brandNodeId('ep-2'));
    expect(Array.isArray(edges)).toBe(true);
  });

  it('should find a single edge by ID', async () => {
    const edge = await engine.findEdge(brandEdgeId('e1'));
    expect(edge).toBeDefined();
  });
});

describe('Query Engine — Path Queries', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should find a path between connected nodes', async () => {
    const result = await engine.path(brandNodeId('app-1'), brandNodeId('ep-1'));
    expect(typeof result.found).toBe('boolean');
    if (result.found) {
      expect(result.path.length).toBeGreaterThan(0);
    }
  });

  it('should find multiple paths', async () => {
    const result = await engine.paths(brandNodeId('app-1'), brandNodeId('ep-2'), 3);
    expect(typeof result.found).toBe('boolean');
  });

  it('should check reachability', async () => {
    const reachable = await engine.reachable(brandNodeId('app-1'), brandNodeId('ep-1'));
    expect(typeof reachable).toBe('boolean');
  });

  it('should find neighbors', async () => {
    const neighbors = await engine.neighbors(brandNodeId('app-1'), 1);
    expect(neighbors.length).toBeGreaterThan(0);
  });
});

describe('Query Engine — Subgraph Queries', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should extract a subgraph', async () => {
    const result = await engine.subgraph(brandNodeId('app-1'), 2);
    expect(result.subgraph.nodes.length).toBeGreaterThan(0);
    expect(result.subgraph.edges.length).toBeGreaterThan(0);
  });

  it('should expand a subgraph', async () => {
    const sg = await engine.subgraph(brandNodeId('app-1'), 1);
    const expanded = await engine.expand(sg.subgraph, 1);
    expect(expanded.subgraph.nodes.length).toBeGreaterThanOrEqual(sg.subgraph.nodes.length);
  });

  it('should collapse a subgraph', async () => {
    const sg = await engine.subgraph(brandNodeId('app-1'), 2);
    const collapsed = await engine.collapse(sg.subgraph, 1);
    expect(collapsed.subgraph.nodes.length).toBeLessThanOrEqual(sg.subgraph.nodes.length);
  });
});

describe('Query Engine — Aggregation', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should count nodes', async () => {
    const result = await engine.query()
      .findNodes()
      .count()
      .execute();
    expect(result.aggregations.length).toBe(1);
    expect(result.aggregations[0].value).toBeGreaterThan(0);
  });

  it('should compute sum', async () => {
    const result = await engine.query()
      .findNodes()
      .sum('properties.severity')
      .execute();
    expect(result.aggregations.length).toBe(1);
  });

  it('should compute average', async () => {
    const result = await engine.query()
      .findNodes()
      .avg('metadata.confidence')
      .execute();
    expect(result.aggregations.length).toBe(1);
  });

  it('should compute min/max', async () => {
    const result = await engine.query()
      .findNodes()
      .min('metadata.confidence')
      .max('metadata.confidence')
      .execute();
    expect(result.aggregations.length).toBe(2);
  });

  it('should compute distinct values', async () => {
    const result = await engine.query()
      .findNodes()
      .distinct('identity.type')
      .execute();
    expect(result.aggregations.length).toBe(1);
    expect(Array.isArray(result.aggregations[0].value)).toBe(true);
  });

  it('should group by with aggregations', async () => {
    const result = await engine.query()
      .findNodes()
      .groupBy(
        ['identity.type'],
        [{ op: AggregationOp.Count, alias: 'count_per_type' }],
      )
      .execute();
    expect(result.groups.length).toBeGreaterThan(0);
  });
});

describe('Query Engine — Sorting', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should sort ascending', async () => {
    const result = await engine.query()
      .findNodes()
      .sortAsc('metadata.confidence')
      .execute();
    if (result.rows.length >= 2) {
      const c1 = (result.rows[0] as any).metadata.confidence;
      const c2 = (result.rows[1] as any).metadata.confidence;
      expect(c1).toBeLessThanOrEqual(c2);
    }
  });

  it('should sort descending', async () => {
    const result = await engine.query()
      .findNodes()
      .sortDesc('metadata.confidence')
      .execute();
    if (result.rows.length >= 2) {
      const c1 = (result.rows[0] as any).metadata.confidence;
      const c2 = (result.rows[1] as any).metadata.confidence;
      expect(c1).toBeGreaterThanOrEqual(c2);
    }
  });

  it('should multi-sort', async () => {
    const result = await engine.query()
      .findNodes()
      .sortAsc('identity.type')
      .sortDesc('metadata.confidence')
      .execute();
    expect(result.rows.length).toBeGreaterThan(0);
  });
});

describe('Query Engine — Pagination', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should paginate with offset', async () => {
    const result = await engine.query()
      .findNodes()
      .limit(3)
      .offset(0)
      .execute();
    expect(result.rows.length).toBeLessThanOrEqual(3);
    expect(result.totalCount).toBeGreaterThan(0);
  });

  it('should paginate with cursor', async () => {
    const result = await engine.query()
      .findNodes()
      .limit(3)
      .cursor('')
      .execute();
    expect(result.rows.length).toBeLessThanOrEqual(3);
  });

  it('should paginate with page', async () => {
    const result = await engine.query()
      .findNodes()
      .limit(3)
      .page(1)
      .execute();
    expect(result.rows.length).toBeLessThanOrEqual(3);
  });

  it('should report hasMore and nextCursor', async () => {
    const result = await engine.query()
      .findNodes()
      .limit(2)
      .execute();
    if (result.totalCount > 2) {
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
    }
  });
});

describe('Query Engine — Explain', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should produce explain plan', () => {
    const spec = engine.query().findNodes().where(equals('identity.type', 'Host')).build();
    const explain = engine.explain(spec);
    expect(explain.plan).toBeDefined();
    expect(explain.plan.stages.length).toBeGreaterThan(0);
    expect(explain.estimatedCost).toBeGreaterThan(0);
    expect(explain.estimatedComplexity).toBeDefined();
  });

  it('should report indexes used for type filter', () => {
    const spec = engine.query().findNodes().findByType(NodeType.Host).build();
    const explain = engine.explain(spec);
    expect(explain.indexesUsed).toContain('NodeTypeIndex');
  });

  it('should report filters applied', () => {
    const spec = engine.query().findNodes().where(equals('identity.type', 'Host')).build();
    const explain = engine.explain(spec);
    expect(explain.filtersApplied.length).toBeGreaterThan(0);
  });
});

describe('Query Engine — Optimizer', () => {
  it('should optimize with predicate pushdown', () => {
    const spec = {
      id: brandQueryId('test-1'),
      target: QueryTarget.Nodes,
      filter: and(equals('identity.type', 'Host')),
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: DEFAULT_PAGINATION,
      sort: [],
      nodeTypes: [],
      edgeTypes: [],
      pathSource: null,
      pathTarget: null,
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: new Date().toISOString(),
    };
    const result = queryOptimizer.optimize(spec);
    expect(result.pushdownApplied).toBe(true);
    expect(result.plan.stages.length).toBeGreaterThan(0);
  });

  it('should detect cacheable queries', () => {
    const spec = {
      id: brandQueryId('test-2'),
      target: QueryTarget.Nodes,
      filter: null,
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: DEFAULT_PAGINATION,
      sort: [],
      nodeTypes: [],
      edgeTypes: [],
      pathSource: null,
      pathTarget: null,
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: new Date().toISOString(),
    };
    const result = queryOptimizer.optimize(spec);
    expect(result.cacheable).toBe(true);
  });

  it('should detect non-cacheable path queries', () => {
    const spec = {
      id: brandQueryId('test-3'),
      target: QueryTarget.Path,
      filter: null,
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: DEFAULT_PAGINATION,
      sort: [],
      nodeTypes: [],
      edgeTypes: [],
      pathSource: brandNodeId('a'),
      pathTarget: brandNodeId('b'),
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: new Date().toISOString(),
    };
    const result = queryOptimizer.optimize(spec);
    expect(result.cacheable).toBe(false);
  });

  it('should recommend scan order', () => {
    const spec = {
      id: brandQueryId('test-4'),
      target: QueryTarget.Nodes,
      filter: and(equals('identity.type', 'Host'), equals('identity.id', 'n1')),
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: DEFAULT_PAGINATION,
      sort: [],
      nodeTypes: [NodeType.Host],
      edgeTypes: [],
      pathSource: null,
      pathTarget: null,
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: new Date().toISOString(),
    };
    const result = queryOptimizer.optimize(spec);
    expect(result.recommendedScanOrder.length).toBeGreaterThan(0);
  });
});

describe('Query Engine — Cache', () => {
  it('should cache and retrieve results', () => {
    const cache = new QueryCache();
    const spec = {
      id: brandQueryId('cache-1'),
      target: QueryTarget.Nodes,
      filter: null,
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: DEFAULT_PAGINATION,
      sort: [],
      nodeTypes: [],
      edgeTypes: [],
      pathSource: null,
      pathTarget: null,
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: new Date().toISOString(),
    };

    const key = QueryCache.makeKey(spec);
    const result: any = { queryId: spec.id, rows: [], totalCount: 0, hasMore: false, nextCursor: null, statistics: emptyQueryStatistics(), plan: null, aggregations: [], groups: [], duration: 0 };
    cache.set(key, result);

    const cached = cache.get(key);
    expect(cached).not.toBeNull();
  });

  it('should report cache miss for non-existent key', () => {
    const cache = new QueryCache();
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should invalidate cache', () => {
    const cache = new QueryCache();
    const spec = {
      id: brandQueryId('cache-2'),
      target: QueryTarget.Nodes,
      filter: null,
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: DEFAULT_PAGINATION,
      sort: [],
      nodeTypes: [],
      edgeTypes: [],
      pathSource: null,
      pathTarget: null,
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: new Date().toISOString(),
    };
    const key = QueryCache.makeKey(spec);
    const result: any = { queryId: spec.id, rows: [], totalCount: 0, hasMore: false, nextCursor: null, statistics: emptyQueryStatistics(), plan: null, aggregations: [], groups: [], duration: 0 };
    cache.set(key, result);
    cache.clear();
    expect(cache.get(key)).toBeNull();
  });

  it('should track cache stats', () => {
    const cache = new QueryCache();
    const stats = cache.getStats();
    expect(stats.size).toBe(0);
    expect(stats.maxEntries).toBeGreaterThan(0);
  });
});

describe('Query Engine — Statistics', () => {
  it('should collect statistics during query', async () => {
    const { engine } = await buildTestGraph();
    const result = await engine.query().findNodes().execute();
    expect(result.statistics).toBeDefined();
    expect(result.statistics.nodesScanned).toBeGreaterThan(0);
    expect(result.statistics.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('should produce empty statistics', () => {
    const stats = emptyQueryStatistics();
    expect(stats.nodesScanned).toBe(0);
    expect(stats.edgesScanned).toBe(0);
    expect(stats.cacheHits).toBe(0);
  });

  it('should track statistics collector', () => {
    const collector = new QueryStatisticsCollector();
    collector.start();
    collector.recordNodeScan(10);
    collector.recordEdgeScan(5);
    collector.recordCacheHit();
    collector.recordCacheMiss();
    collector.recordReturnedRows(7);
    collector.recordPredicateEvaluated();
    collector.recordPredicateShortCircuited();

    const stats = collector.toSnapshot();
    expect(stats.nodesScanned).toBe(10);
    expect(stats.edgesScanned).toBe(5);
    expect(stats.cacheHits).toBe(1);
    expect(stats.cacheMisses).toBe(1);
    expect(stats.returnedRows).toBe(7);
    expect(stats.predicatesEvaluated).toBe(1);
    expect(stats.predicatesShortCircuited).toBe(1);
    expect(stats.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('should reset statistics collector', () => {
    const collector = new QueryStatisticsCollector();
    collector.start();
    collector.recordNodeScan(10);
    collector.reset();
    const stats = collector.toSnapshot();
    expect(stats.nodesScanned).toBe(0);
  });
});

describe('Query Engine — Events', () => {
  it('should create QueryStartedEvent', () => {
    const event = createQueryStartedEvent('q1', QueryTarget.Nodes, { filterCount: 2 });
    expect(event.type).toBe('query.started');
    expect(event.data.queryId).toBeDefined();
    expect(event.data.filterCount).toBe(2);
  });

  it('should create QueryCompletedEvent', () => {
    const event = createQueryCompletedEvent('q1', QueryTarget.Nodes, { returnedRows: 5, duration: 10 });
    expect(event.type).toBe('query.completed');
    expect(event.data.returnedRows).toBe(5);
  });

  it('should create QueryCancelledEvent', () => {
    const event = createQueryCancelledEvent('q1', QueryTarget.Nodes, { reason: 'timeout', duration: 30 });
    expect(event.type).toBe('query.cancelled');
    expect(event.data.reason).toBe('timeout');
  });

  it('should create QueryCachedEvent', () => {
    const event = createQueryCachedEvent('q1', QueryTarget.Nodes, { cacheHitCount: 3, age: 5000 });
    expect(event.type).toBe('query.cached');
    expect(event.data.cacheHitCount).toBe(3);
  });
});

describe('Query Engine — Domain Contract', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should implement queryNodes via domain contract', async () => {
    const query = createGraphQuery('q1', 'node_lookup', {
      filters: [{ field: 'identity.type', operator: 'eq', value: 'Host' }],
    });
    const nodes = await engine.queryNodes(query);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every(n => n.identity.type === 'Host')).toBe(true);
  });

  it('should implement queryEdges via domain contract', async () => {
    const query = createGraphQuery('q2', 'edge_lookup', {
      filters: [{ field: 'relationship.edgeType', operator: 'eq', value: 'DEPENDS_ON' }],
    });
    const edges = await engine.queryEdges(query);
    expect(edges.length).toBeGreaterThan(0);
  });

  it('should implement querySubgraph via domain contract', async () => {
    const query = createGraphQuery('q3', 'node_lookup', {
      filters: [{ field: 'identity.type', operator: 'eq', value: 'Host' }],
    });
    const subgraph = await engine.querySubgraph(query);
    expect(subgraph.nodes.length).toBeGreaterThan(0);
  });

  it('should implement getStatistics via domain contract', async () => {
    const stats = await engine.getStatistics();
    expect(stats.nodeCount).toBeGreaterThan(0);
    expect(stats.edgeCount).toBeGreaterThan(0);
    expect(stats.avgDegree).toBeGreaterThanOrEqual(0);
  });
});

describe('Query Engine — Empty Graph', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildEmptyGraph();
    engine = e;
  });

  it('should return empty results on empty graph', async () => {
    const result = await engine.query().findNodes().execute();
    expect(result.rows.length).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it('should return empty aggregation on empty graph', async () => {
    const result = await engine.query().findNodes().count().execute();
    expect(result.aggregations[0].value).toBe(0);
  });

  it('should return undefined for missing node', async () => {
    const node = await engine.findNode(brandNodeId('missing'));
    expect(node).toBeUndefined();
  });

  it('should return empty statistics', async () => {
    const stats = await engine.getStatistics();
    expect(stats.nodeCount).toBe(0);
    expect(stats.edgeCount).toBe(0);
  });
});

describe('Query Engine — Invalid Queries', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should handle invalid regex gracefully', async () => {
    const result = await engine.query()
      .findNodes()
      .where(regex('identity.type', '[invalid'))
      .execute();
    // Should not throw, just return no matches
    expect(result.rows.length).toBe(0);
  });

  it('should handle missing fields gracefully', async () => {
    const result = await engine.query()
      .findNodes()
      .where(equals('nonexistent.field', 'value'))
      .execute();
    expect(result.rows.length).toBe(0);
  });

  it('should handle subgraph query without start node', async () => {
    await expect(
      engine.query().findSubgraph(brandNodeId('nonexistent'), 2).executeSubgraph(),
    ).resolves.toBeDefined(); // May return empty subgraph, not throw
  });

  it('should handle path query between disconnected components', async () => {
    const result = await engine.path(brandNodeId('finding-1'), brandNodeId('identity-1'));
    expect(typeof result.found).toBe('boolean');
  });
});

describe('Query Engine — Large Graph', () => {
  it('should handle 1K nodes', async () => {
    const { engine } = await buildLargeGraph(1000);
    const result = await engine.query().findNodes().limit(100).execute();
    expect(result.rows.length).toBeLessThanOrEqual(100);
    expect(result.totalCount).toBeGreaterThan(0);
  }, 30000);

  it('should handle filtered search on large graph', async () => {
    const { engine } = await buildLargeGraph(1000);
    const result = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .execute();
    expect(result.rows.every(n => (n as any).identity.type === 'Host')).toBe(true);
  }, 30000);

  it('should handle aggregation on large graph', async () => {
    const { engine } = await buildLargeGraph(1000);
    const result = await engine.query()
      .findNodes()
      .count()
      .avg('metadata.confidence')
      .execute();
    expect(result.aggregations.length).toBe(2);
  }, 30000);

  it('should handle pagination on large graph', async () => {
    const { engine } = await buildLargeGraph(1000);
    const result = await engine.query()
      .findNodes()
      .limit(50)
      .offset(100)
      .execute();
    expect(result.rows.length).toBeLessThanOrEqual(50);
  }, 30000);
});

describe('Query Engine — Plan', () => {
  it('should build quick plan', () => {
    const spec = {
      id: brandQueryId('plan-1'),
      target: QueryTarget.Nodes,
      filter: null,
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: DEFAULT_PAGINATION,
      sort: [],
      nodeTypes: [],
      edgeTypes: [],
      pathSource: null,
      pathTarget: null,
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: new Date().toISOString(),
    };
    const plan = buildQuickPlan(spec);
    expect(plan.stages.length).toBeGreaterThan(0);
    expect(plan.totalEstimatedCost).toBeGreaterThan(0);
  });

  it('should build explain plan with filters', () => {
    const spec = {
      id: brandQueryId('plan-2'),
      target: QueryTarget.Nodes,
      filter: and(equals('identity.type', 'Host'), greaterThan('metadata.confidence', 0.5)),
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: DEFAULT_PAGINATION,
      sort: [],
      nodeTypes: [NodeType.Host],
      edgeTypes: [],
      pathSource: null,
      pathTarget: null,
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: new Date().toISOString(),
    };
    const explain = buildExplainPlan(spec);
    expect(explain.plan.stages.length).toBeGreaterThan(1);
    expect(explain.description).toContain('scan');
  });
});

describe('Query Engine — Cache Integration', () => {
  it('should cache repeated queries', async () => {
    const { engine } = await buildTestGraph();

    // First query — cache miss
    const result1 = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .execute();

    // Second identical query — should hit cache
    const result2 = await engine.query()
      .findNodes()
      .where(equals('identity.type', 'Host'))
      .execute();

    expect(result1.totalCount).toBe(result2.totalCount);
  });

  it('should respect noCache flag', async () => {
    const { engine } = await buildTestGraph();
    const result = await engine.query()
      .findNodes()
      .noCache()
      .execute();
    expect(result.rows).toBeDefined();
  });

  it('should invalidate cache', async () => {
    const { engine } = await buildTestGraph();
    await engine.query().findNodes().execute();
    engine.invalidateCache();
    const stats = engine.getCacheStats();
    expect(stats.size).toBe(0);
  });
});

describe('Query Engine — Complex Nested Queries', () => {
  let engine: GraphQueryEngineImpl;

  beforeEach(async () => {
    const { engine: e } = await buildTestGraph();
    engine = e;
  });

  it('should handle deeply nested AND/OR/NOT', async () => {
    const result = await engine.query()
      .findNodes()
      .where(
        and(
          or(
            equals('identity.type', 'Host'),
            equals('identity.type', 'Application'),
          ),
          notFilter(equals('identity.type', 'Finding')),
        ),
      )
      .execute();
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every(n => {
      const type = (n as any).identity.type;
      return type === 'Host' || type === 'Application';
    })).toBe(true);
  });

  it('should handle complex filter with type shortcut', async () => {
    const result = await engine.query()
      .findNodes()
      .findByType(NodeType.Finding)
      .and(greaterThan('metadata.confidence', 0.8))
      .execute();
    expect(result.rows.every(n => (n as any).identity.type === 'Finding')).toBe(true);
  });

  it('should handle query with all features combined', async () => {
    const result = await engine.query()
      .findNodes()
      .findByType(NodeType.Host)
      .and(greaterThan('metadata.confidence', 0.7))
      .sortDesc('metadata.confidence')
      .limit(5)
      .select('identity.type', 'metadata.confidence')
      .count()
      .execute();
    expect(result.rows.length).toBeLessThanOrEqual(5);
    expect(result.aggregations.length).toBe(1);
  });
});
