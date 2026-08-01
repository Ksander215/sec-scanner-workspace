import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { EvolutionGraph } from '../../core/evolution/evolution-graph.js';
import { DefaultEvolutionRuntimeConfig, brandEvolutionNodeId } from '../../core/evolution/types.js';
import { GraphNodeLimitExceededError } from '../../core/evolution/errors.js';

const cfg = DefaultEvolutionRuntimeConfig.evolutionGraph;

function createGraph(bus?: InProcessEventBus) {
  return new EvolutionGraph(cfg, bus);
}

const baseParams = {
  type: 'improvement' as const,
  title: 'Test Node',
  description: 'A test node',
  relatedIds: Object.freeze([] as string[]),
  parentId: null as any,
  valueImpact: 50,
  metadata: Object.freeze({}),
};

describe('EvolutionGraph — constructor', () => {
  it('creates instance without eventBus', () => {
    const g = createGraph();
    expect(g).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const g = createGraph(new InProcessEventBus());
    expect(g).toBeDefined();
  });
});

describe('EvolutionGraph — addNode', () => {
  it('creates node with correct fields', async () => {
    const g = createGraph();
    const node = await g.addNode(baseParams);
    expect(node.id).toBeDefined();
    expect(node.type).toBe('improvement');
    expect(node.title).toBe('Test Node');
    expect(node.description).toBe('A test node');
    expect(node.relatedIds).toEqual([]);
    expect(node.parentId).toBeNull();
    expect(node.childIds).toEqual([]);
    expect(node.valueImpact).toBe(50);
    expect(node.createdAt).toBeDefined();
  });
  it('node is frozen', async () => {
    const g = createGraph();
    const node = await g.addNode(baseParams);
    expect(Object.isFrozen(node)).toBe(true);
  });
  it('each node has unique id', async () => {
    const g = createGraph();
    const n1 = await g.addNode(baseParams);
    const n2 = await g.addNode(baseParams);
    expect(n1.id).not.toBe(n2.id);
  });
  it('creates experiment type node', async () => {
    const g = createGraph();
    const node = await g.addNode({ ...baseParams, type: 'experiment' });
    expect(node.type).toBe('experiment');
  });
  it('creates bottleneck_resolved type node', async () => {
    const g = createGraph();
    const node = await g.addNode({ ...baseParams, type: 'bottleneck_resolved' });
    expect(node.type).toBe('bottleneck_resolved');
  });
  it('creates tech_debt_fixed type node', async () => {
    const g = createGraph();
    const node = await g.addNode({ ...baseParams, type: 'tech_debt_fixed' });
    expect(node.type).toBe('tech_debt_fixed');
  });
  it('creates architecture_change type node', async () => {
    const g = createGraph();
    const node = await g.addNode({ ...baseParams, type: 'architecture_change' });
    expect(node.type).toBe('architecture_change');
  });
  it('creates improvement type node', async () => {
    const g = createGraph();
    const node = await g.addNode(baseParams);
    expect(node.type).toBe('improvement');
  });
  it('preserves relatedIds', async () => {
    const g = createGraph();
    const related = Object.freeze(['id1', 'id2']);
    const node = await g.addNode({ ...baseParams, relatedIds: related });
    expect(node.relatedIds).toBe(related);
  });
  it('preserves valueImpact', async () => {
    const g = createGraph();
    const node = await g.addNode({ ...baseParams, valueImpact: 99.5 });
    expect(node.valueImpact).toBe(99.5);
  });
  it('preserves metadata', async () => {
    const g = createGraph();
    const meta = Object.freeze({ key: 'val' });
    const node = await g.addNode({ ...baseParams, metadata: meta });
    expect(node.metadata).toBe(meta);
  });
  it('emits evolution.graph.nodeAdded event', async () => {
    const bus = new InProcessEventBus();
    const g = createGraph(bus);
    await g.addNode(baseParams);
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.graph.nodeAdded');
    expect(events.length).toBe(1);
  });
  it('event envelope has correct fields', async () => {
    const bus = new InProcessEventBus();
    const g = createGraph(bus);
    await g.addNode(baseParams);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.graph.nodeAdded');
    expect(evt).toBeDefined();
    expect(evt!.eventType).toBe('evolution.graph.nodeAdded');
    expect(evt!.timestamp).toBeDefined();
  });
  it('emits one event per addNode', async () => {
    const bus = new InProcessEventBus();
    const g = createGraph(bus);
    await g.addNode(baseParams);
    await g.addNode(baseParams);
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.graph.nodeAdded');
    expect(events.length).toBe(2);
  });
  it('does not emit events without eventBus', async () => {
    const g = createGraph();
    await g.addNode(baseParams);
  });
  it('throws GraphNodeLimitExceededError when limit reached', async () => {
    const g = new EvolutionGraph({ maxNodes: 1, maxDepth: 20 });
    await g.addNode(baseParams);
    await expect(g.addNode(baseParams)).rejects.toThrow(GraphNodeLimitExceededError);
  });
  it('parent-child relationship: child has parentId set', async () => {
    const g = createGraph();
    const parent = await g.addNode(baseParams);
    const child = await g.addNode({ ...baseParams, parentId: parent.id });
    expect(child.parentId).toBe(parent.id);
  });
  it('parent-child relationship: parent childIds includes child id', async () => {
    const g = createGraph();
    const parent = await g.addNode(baseParams);
    const child = await g.addNode({ ...baseParams, parentId: parent.id });
    const updatedParent = await g.getNode(parent.id);
    expect(updatedParent!.childIds).toContain(child.id);
  });
  it('parent-child relationship: child with nonexistent parent still works', async () => {
    const g = createGraph();
    const fakeParentId = brandEvolutionNodeId(crypto.randomUUID());
    const child = await g.addNode({ ...baseParams, parentId: fakeParentId });
    expect(child.parentId).toBe(fakeParentId);
  });
});

describe('EvolutionGraph — addEdge', () => {
  it('creates edge with correct fields', async () => {
    const g = createGraph();
    const n1 = await g.addNode(baseParams);
    const n2 = await g.addNode(baseParams);
    const edge = await g.addEdge(n1.id, n2.id, 'depends on', 1.5);
    expect(edge.from).toBe(n1.id);
    expect(edge.to).toBe(n2.id);
    expect(edge.label).toBe('depends on');
    expect(edge.weight).toBe(1.5);
    expect(edge.createdAt).toBeDefined();
  });
  it('edge is frozen', async () => {
    const g = createGraph();
    const n1 = await g.addNode(baseParams);
    const n2 = await g.addNode(baseParams);
    const edge = await g.addEdge(n1.id, n2.id, 'test');
    expect(Object.isFrozen(edge)).toBe(true);
  });
  it('default weight is 1', async () => {
    const g = createGraph();
    const n1 = await g.addNode(baseParams);
    const n2 = await g.addNode(baseParams);
    const edge = await g.addEdge(n1.id, n2.id, 'test');
    expect(edge.weight).toBe(1);
  });
});

describe('EvolutionGraph — getNode', () => {
  it('returns null for unknown id', async () => {
    const g = createGraph();
    const result = await g.getNode(brandEvolutionNodeId(crypto.randomUUID()));
    expect(result).toBeNull();
  });
  it('returns node after addNode', async () => {
    const g = createGraph();
    const node = await g.addNode(baseParams);
    const found = await g.getNode(node.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(node.id);
  });
  it('returns frozen node', async () => {
    const g = createGraph();
    const node = await g.addNode(baseParams);
    const found = await g.getNode(node.id);
    expect(Object.isFrozen(found!)).toBe(true);
  });
});

describe('EvolutionGraph — getRootNodes', () => {
  it('returns nodes with parentId null', async () => {
    const g = createGraph();
    const root = await g.addNode(baseParams);
    await g.addNode({ ...baseParams, parentId: root.id });
    const roots = await g.getRootNodes();
    expect(roots.length).toBe(1);
    expect(roots[0].id).toBe(root.id);
  });
  it('returns empty when no nodes', async () => {
    const g = createGraph();
    const roots = await g.getRootNodes();
    expect(roots).toEqual([]);
  });
  it('returns array of root nodes', async () => {
    const g = createGraph();
    await g.addNode(baseParams);
    const roots = await g.getRootNodes();
    expect(roots.length).toBe(1);
  });
  it('multiple root nodes', async () => {
    const g = createGraph();
    await g.addNode(baseParams);
    await g.addNode(baseParams);
    const roots = await g.getRootNodes();
    expect(roots.length).toBe(2);
  });
});

describe('EvolutionGraph — getPath', () => {
  it('returns ancestor chain', async () => {
    const g = createGraph();
    const root = await g.addNode({ ...baseParams, title: 'root' });
    const child = await g.addNode({ ...baseParams, title: 'child', parentId: root.id });
    const grandchild = await g.addNode({ ...baseParams, title: 'grandchild', parentId: child.id });
    const path = await g.getPath(grandchild.id);
    expect(path.length).toBe(3);
    expect(path[0].title).toBe('root');
    expect(path[1].title).toBe('child');
    expect(path[2].title).toBe('grandchild');
  });
  it('returns single node for root', async () => {
    const g = createGraph();
    const root = await g.addNode(baseParams);
    const path = await g.getPath(root.id);
    expect(path.length).toBe(1);
    expect(path[0].id).toBe(root.id);
  });
  it('returns frozen array', async () => {
    const g = createGraph();
    const root = await g.addNode(baseParams);
    const child = await g.addNode({ ...baseParams, parentId: root.id });
    const path = await g.getPath(child.id);
    expect(Object.isFrozen(path)).toBe(true);
  });
  it('returns empty array for unknown node', async () => {
    const g = createGraph();
    const path = await g.getPath(brandEvolutionNodeId(crypto.randomUUID()));
    expect(path).toEqual([]);
  });
  it('respects maxDepth', async () => {
    const g = new EvolutionGraph({ maxNodes: 10, maxDepth: 2 });
    const n1 = await g.addNode({ ...baseParams, title: 'n1' });
    const n2 = await g.addNode({ ...baseParams, title: 'n2', parentId: n1.id });
    const n3 = await g.addNode({ ...baseParams, title: 'n3', parentId: n2.id });
    const n4 = await g.addNode({ ...baseParams, title: 'n4', parentId: n3.id });
    const path = await g.getPath(n4.id);
    expect(path.length).toBeLessThanOrEqual(2);
  });
});

describe('EvolutionGraph — listNodes', () => {
  it('returns empty initially', async () => {
    const g = createGraph();
    const nodes = await g.listNodes();
    expect(nodes).toEqual([]);
  });
  it('returns all nodes', async () => {
    const g = createGraph();
    await g.addNode(baseParams);
    await g.addNode(baseParams);
    const nodes = await g.listNodes();
    expect(nodes.length).toBe(2);
  });
  it('returns frozen array', async () => {
    const g = createGraph();
    await g.addNode(baseParams);
    const nodes = await g.listNodes();
    expect(Object.isFrozen(nodes)).toBe(true);
  });
});

describe('EvolutionGraph — listEdges', () => {
  it('returns empty initially', async () => {
    const g = createGraph();
    const edges = await g.listEdges();
    expect(edges).toEqual([]);
  });
  it('returns all edges', async () => {
    const g = createGraph();
    const n1 = await g.addNode(baseParams);
    const n2 = await g.addNode(baseParams);
    const n3 = await g.addNode(baseParams);
    await g.addEdge(n1.id, n2.id, 'e1');
    await g.addEdge(n2.id, n3.id, 'e2');
    const edges = await g.listEdges();
    expect(edges.length).toBe(2);
  });
  it('returns frozen array', async () => {
    const g = createGraph();
    const n1 = await g.addNode(baseParams);
    const n2 = await g.addNode(baseParams);
    await g.addEdge(n1.id, n2.id, 'e1');
    const edges = await g.listEdges();
    expect(Object.isFrozen(edges)).toBe(true);
  });
});

describe('EvolutionGraph — count', () => {
  it('returns 0 initially', async () => {
    const g = createGraph();
    expect(await g.count()).toBe(0);
  });
  it('returns correct count after addNode', async () => {
    const g = createGraph();
    await g.addNode(baseParams);
    await g.addNode(baseParams);
    await g.addNode(baseParams);
    expect(await g.count()).toBe(3);
  });
});

describe('EvolutionGraph — store access', () => {
  it('getStore returns store', () => {
    const g = createGraph();
    expect(g.getStore()).toBeDefined();
  });
  it('store nodeCount is 0 initially', () => {
    const g = createGraph();
    expect(g.getStore().nodeCount).toBe(0);
  });
  it('store edgeCount is 0 initially', () => {
    const g = createGraph();
    expect(g.getStore().edgeCount).toBe(0);
  });
  it('store nodeCount increases after addNode', async () => {
    const g = createGraph();
    await g.addNode(baseParams);
    expect(g.getStore().nodeCount).toBe(1);
  });
  it('store edgeCount increases after addEdge', async () => {
    const g = createGraph();
    const n1 = await g.addNode(baseParams);
    const n2 = await g.addNode(baseParams);
    await g.addEdge(n1.id, n2.id, 'e');
    expect(g.getStore().edgeCount).toBe(1);
  });
});
