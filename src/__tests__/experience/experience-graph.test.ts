/**
 * Tests for ExperienceGraph (Subsystem 6)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExperienceGraph } from '../../core/experience/experience-graph.js';
import {
  ExperienceNodeType,
  ExperienceEdgeType,
  type ExperienceNode,
  type ExperienceEdge,
  type ExperienceNodeId,
} from '../../core/experience/types.js';
import { ExperienceGraphError } from '../../core/experience/errors.js';

// ─── Factory helpers ──────────────────────────────────────────

const makeNode = (
  id: ExperienceNodeId,
  userIdHash = crypto.randomUUID(),
  type = ExperienceNodeType.Habit,
  label = 'node',
): ExperienceNode => ({
  id,
  type,
  userIdHash,
  label,
  properties: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeEdge = (
  id: string,
  sourceId: ExperienceNodeId,
  targetId: ExperienceNodeId,
  type = ExperienceEdgeType.RelatedTo,
  weight = 1.0,
): ExperienceEdge => ({
  id,
  sourceId,
  targetId,
  type,
  weight,
  properties: {},
  createdAt: new Date().toISOString(),
});

const nid = (): ExperienceNodeId => crypto.randomUUID() as ExperienceNodeId;

describe('ExperienceGraph', () => {
  let graph: ExperienceGraph;

  beforeEach(() => {
    graph = new ExperienceGraph();
  });

  // ─── addNode ────────────────────────────────────────────

  describe('addNode', () => {
    it('stores a node', () => {
      const node = makeNode(nid());
      const result = graph.addNode(node);
      expect(result.id).toBe(node.id);
    });

    it('returns the same node reference', () => {
      const node = makeNode(nid());
      const result = graph.addNode(node);
      expect(result).toBe(node);
    });

    it('throws on duplicate node ID', () => {
      const id = nid();
      graph.addNode(makeNode(id));
      expect(() => graph.addNode(makeNode(id))).toThrow(ExperienceGraphError);
    });

    it('stores nodes for different users independently', () => {
      const userA = crypto.randomUUID();
      const userB = crypto.randomUUID();
      graph.addNode(makeNode(nid(), userA));
      graph.addNode(makeNode(nid(), userB));
      expect(graph.getUserGraph(userA).nodes).toHaveLength(1);
      expect(graph.getUserGraph(userB).nodes).toHaveLength(1);
    });

    it('stores multiple nodes for same user', () => {
      const user = crypto.randomUUID();
      graph.addNode(makeNode(nid(), user));
      graph.addNode(makeNode(nid(), user));
      expect(graph.getUserGraph(user).nodes).toHaveLength(2);
    });

    it('stores node with all properties', () => {
      const id = nid();
      const node = makeNode(id, 'u1', ExperienceNodeType.Skill, 'Python');
      graph.addNode(node);
      const retrieved = graph.getNode(id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.type).toBe(ExperienceNodeType.Skill);
      expect(retrieved!.label).toBe('Python');
      expect(retrieved!.userIdHash).toBe('u1');
    });

    it('stores node with custom properties', () => {
      const id = nid();
      const node: ExperienceNode = {
        ...makeNode(id),
        properties: { level: 'advanced', years: 5 },
      };
      graph.addNode(node);
      const retrieved = graph.getNode(id);
      expect(retrieved!.properties).toEqual({ level: 'advanced', years: 5 });
    });

    it('throws with error code EXP-GRF-001', () => {
      const id = nid();
      graph.addNode(makeNode(id));
      try {
        graph.addNode(makeNode(id));
      } catch (e) {
        expect((e as ExperienceGraphError).code).toBe('EXP-GRF-001');
      }
    });

    it('supports all ExperienceNodeType values', () => {
      for (const type of Object.values(ExperienceNodeType)) {
        const id = nid();
        graph.addNode(makeNode(id, crypto.randomUUID(), type, `Node-${type}`));
        expect(graph.getNode(id)!.type).toBe(type);
      }
    });
  });

  // ─── removeNode ──────────────────────────────────────────

  describe('removeNode', () => {
    it('removes a node from the graph', () => {
      const id = nid();
      graph.addNode(makeNode(id));
      graph.removeNode(id);
      expect(graph.getNode(id)).toBeNull();
    });

    it('throws for non-existent node', () => {
      expect(() => graph.removeNode(nid())).toThrow(ExperienceGraphError);
    });

    it('cascading: removes outgoing edges', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      graph.removeNode(a);
      expect(graph.getEdgesForNode(a)).toHaveLength(0);
    });

    it('cascading: removes incoming edges', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      graph.removeNode(b);
      expect(graph.getEdgesForNode(a)).toHaveLength(0);
    });

    it('cascading: removes only edges connected to removed node', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', a, c));
      graph.addEdge(makeEdge('e3', b, c));
      graph.removeNode(a);
      // Edges e1 (a→b) and e2 (a→c) are removed
      expect(graph.getEdgesForNode(a)).toHaveLength(0);
      // b→c edge is unaffected
      expect(graph.getEdgesForNode(b)).toHaveLength(1);
      expect(graph.getEdgesForNode(c)).toHaveLength(1);
    });

    it('removes node from user index', () => {
      const user = crypto.randomUUID();
      const id = nid();
      graph.addNode(makeNode(id, user));
      graph.removeNode(id);
      expect(graph.getUserGraph(user).nodes).toHaveLength(0);
    });

    it('node can be added again after removal', () => {
      const id = nid();
      graph.addNode(makeNode(id));
      graph.removeNode(id);
      graph.addNode(makeNode(id, crypto.randomUUID(), ExperienceNodeType.Domain, 'new'));
      expect(graph.getNode(id)).not.toBeNull();
      expect(graph.getNode(id)!.label).toBe('new');
    });

    it('throws with error code EXP-GRF-001', () => {
      try {
        graph.removeNode(nid());
      } catch (e) {
        expect((e as ExperienceGraphError).code).toBe('EXP-GRF-001');
      }
    });
  });

  // ─── getNode ─────────────────────────────────────────────

  describe('getNode', () => {
    it('returns node by ID', () => {
      const id = nid();
      const node = makeNode(id);
      graph.addNode(node);
      expect(graph.getNode(id)).toEqual(node);
    });

    it('returns null for non-existent node', () => {
      expect(graph.getNode(nid())).toBeNull();
    });

    it('returns null for empty graph', () => {
      expect(graph.getNode(nid())).toBeNull();
    });
  });

  // ─── addEdge ─────────────────────────────────────────────

  describe('addEdge', () => {
    it('stores an edge', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      const edge = makeEdge('e1', a, b);
      const result = graph.addEdge(edge);
      expect(result.id).toBe('e1');
    });

    it('throws on duplicate edge ID', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      expect(() => graph.addEdge(makeEdge('e1', a, b))).toThrow(ExperienceGraphError);
    });

    it('throws when source node not found', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(b));
      expect(() => graph.addEdge(makeEdge('e1', a, b))).toThrow(ExperienceGraphError);
    });

    it('throws when target node not found', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      expect(() => graph.addEdge(makeEdge('e1', a, b))).toThrow(ExperienceGraphError);
    });

    it('stores edges with all types', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b, ExperienceEdgeType.HasSkill));
      const edges = graph.getEdgesForNode(a);
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe(ExperienceEdgeType.HasSkill);
    });

    it('stores edge with custom weight', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      const edge = makeEdge('e1', a, b, ExperienceEdgeType.InfluencedBy, 0.75);
      graph.addEdge(edge);
      const edges = graph.getEdgesForNode(a);
      expect(edges[0].weight).toBe(0.75);
    });

    it('stores bidirectional edges as two separate edges', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', b, a));
      expect(graph.getEdgesForNode(a)).toHaveLength(2);
      expect(graph.getEdgesForNode(b)).toHaveLength(2);
    });

    it('stores edge with custom properties', () => {
      const a = nid();
      const b = nid();
      const edge: ExperienceEdge = {
        ...makeEdge('e1', a, b),
        properties: { since: '2024-01-01' },
      };
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(edge);
      const edges = graph.getEdgesForNode(a);
      expect(edges[0].properties).toEqual({ since: '2024-01-01' });
    });

    it('supports self-loops (edge from node to itself)', () => {
      const a = nid();
      graph.addNode(makeNode(a));
      graph.addEdge(makeEdge('e1', a, a));
      // Self-loop appears in both outgoing and incoming index
      const edges = graph.getEdgesForNode(a);
      expect(edges.length).toBeGreaterThanOrEqual(1);
      expect(edges[0].sourceId).toBe(a);
      expect(edges[0].targetId).toBe(a);
    });

    it('allows multiple edges between same nodes with different IDs', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b, ExperienceEdgeType.HasHabit));
      graph.addEdge(makeEdge('e2', a, b, ExperienceEdgeType.HasPreference));
      expect(graph.getEdgesForNode(a)).toHaveLength(2);
    });
  });

  // ─── removeEdge ───────────────────────────────────────────

  describe('removeEdge', () => {
    it('removes an existing edge', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      graph.removeEdge('e1');
      expect(graph.getEdgesForNode(a)).toHaveLength(0);
      expect(graph.getEdgesForNode(b)).toHaveLength(0);
    });

    it('throws for non-existent edge', () => {
      expect(() => graph.removeEdge('nope')).toThrow(ExperienceGraphError);
    });

    it('removes only the specified edge', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', a, c));
      graph.removeEdge('e1');
      expect(graph.getEdgesForNode(a)).toHaveLength(1);
      expect(graph.getEdgesForNode(a)[0].id).toBe('e2');
    });

    it('throws with error code EXP-GRF-001', () => {
      try {
        graph.removeEdge('nope');
      } catch (e) {
        expect((e as ExperienceGraphError).code).toBe('EXP-GRF-001');
      }
    });
  });

  // ─── getEdgesForNode ─────────────────────────────────────

  describe('getEdgesForNode', () => {
    it('returns outgoing edges', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      const edges = graph.getEdgesForNode(a);
      expect(edges).toHaveLength(1);
      expect(edges[0].sourceId).toBe(a);
    });

    it('returns incoming edges', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      const edges = graph.getEdgesForNode(b);
      expect(edges).toHaveLength(1);
      expect(edges[0].targetId).toBe(b);
    });

    it('returns empty for unknown node', () => {
      expect(graph.getEdgesForNode(nid())).toEqual([]);
    });

    it('returns both outgoing and incoming', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', c, a));
      const edges = graph.getEdgesForNode(a);
      expect(edges).toHaveLength(2);
    });

    it('returns empty array after all edges removed', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      graph.removeEdge('e1');
      expect(graph.getEdgesForNode(a)).toEqual([]);
    });
  });

  // ─── getNeighbors ────────────────────────────────────────

  describe('getNeighbors', () => {
    it('returns adjacent nodes via outgoing edge', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      const neighbors = graph.getNeighbors(a);
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe(b);
    });

    it('returns adjacent nodes via incoming edge', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      const neighbors = graph.getNeighbors(b);
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe(a);
    });

    it('returns empty for isolated node', () => {
      const a = nid();
      graph.addNode(makeNode(a));
      expect(graph.getNeighbors(a)).toEqual([]);
    });

    it('returns empty for non-existent node', () => {
      expect(graph.getNeighbors(nid())).toEqual([]);
    });

    it('deduplicates neighbors with bidirectional edges', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', b, a));
      const neighbors = graph.getNeighbors(a);
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe(b);
    });

    it('returns multiple neighbors', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', a, c));
      const neighbors = graph.getNeighbors(a);
      expect(neighbors).toHaveLength(2);
    });

    it('includes self in neighbors for self-loop', () => {
      const a = nid();
      graph.addNode(makeNode(a));
      graph.addEdge(makeEdge('e1', a, a));
      const neighbors = graph.getNeighbors(a);
      // Self-loop adds 'a' as neighbor — deduplicated via Set
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe(a);
    });
  });

  // ─── findPath ────────────────────────────────────────────

  describe('findPath', () => {
    it('finds shortest path between directly connected nodes', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      const path = graph.findPath(a, b);
      expect(path).toEqual([a, b]);
    });

    it('finds shortest path through intermediate node', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', b, c));
      const path = graph.findPath(a, c);
      expect(path).toEqual([a, b, c]);
    });

    it('finds shortest path when multiple paths exist', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      const d = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addNode(makeNode(d));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', b, d));
      graph.addEdge(makeEdge('e3', a, c));
      graph.addEdge(makeEdge('e4', c, d));
      const path = graph.findPath(a, d);
      expect(path![0]).toBe(a);
      expect(path![path!.length - 1]).toBe(d);
      expect(path!.length).toBeLessThanOrEqual(4);
    });

    it('returns [from] when from === to', () => {
      const a = nid();
      graph.addNode(makeNode(a));
      expect(graph.findPath(a, a)).toEqual([a]);
    });

    it('returns empty array when nodes are disconnected', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      expect(graph.findPath(a, b)).toEqual([]);
    });

    it('returns empty when source node not found', () => {
      const b = nid();
      graph.addNode(makeNode(b));
      expect(graph.findPath(nid(), b)).toEqual([]);
    });

    it('returns empty when target node not found', () => {
      const a = nid();
      graph.addNode(makeNode(a));
      expect(graph.findPath(a, nid())).toEqual([]);
    });

    it('does not traverse edges in reverse direction', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      expect(graph.findPath(b, a)).toEqual([]);
    });

    it('handles longer paths correctly', () => {
      const nodes = Array.from({ length: 5 }, () => nid());
      for (const n of nodes) graph.addNode(makeNode(n));
      for (let i = 0; i < nodes.length - 1; i++) {
        graph.addEdge(makeEdge(`e${i}`, nodes[i], nodes[i + 1]));
      }
      const path = graph.findPath(nodes[0], nodes[4]);
      expect(path).toHaveLength(5);
      expect(path![0]).toBe(nodes[0]);
      expect(path![4]).toBe(nodes[4]);
    });

    it('handles single-node path correctly', () => {
      const a = nid();
      graph.addNode(makeNode(a));
      const path = graph.findPath(a, a);
      expect(path).toHaveLength(1);
    });

    it('returns empty for both missing nodes', () => {
      expect(graph.findPath(nid(), nid())).toEqual([]);
    });
  });

  // ─── getSubgraph ──────────────────────────────────────────

  describe('getSubgraph', () => {
    it('depth 0 returns only root node with no edges', () => {
      const a = nid();
      graph.addNode(makeNode(a));
      const sub = graph.getSubgraph(a, 0);
      expect(sub.nodes).toHaveLength(1);
      expect(sub.edges).toHaveLength(0);
    });

    it('depth 1 returns root and direct neighbors', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', a, c));
      const sub = graph.getSubgraph(a, 1);
      expect(sub.nodes).toHaveLength(3);
      expect(sub.edges).toHaveLength(2);
    });

    it('depth 2 reaches second-degree neighbors', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', b, c));
      const sub = graph.getSubgraph(a, 2);
      expect(sub.nodes).toHaveLength(3);
      expect(sub.edges).toHaveLength(2);
    });

    it('returns empty for non-existent node', () => {
      const sub = graph.getSubgraph(nid(), 1);
      expect(sub.nodes).toHaveLength(0);
      expect(sub.edges).toHaveLength(0);
    });

    it('does not duplicate nodes in overlapping paths', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', a, c));
      graph.addEdge(makeEdge('e3', b, c));
      const sub = graph.getSubgraph(a, 2);
      expect(sub.nodes).toHaveLength(3);
    });

    it('includes connecting edges', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      const sub = graph.getSubgraph(a, 1);
      expect(sub.edges[0].id).toBe('e1');
    });

    it('limits expansion at specified depth', () => {
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', b, c));
      const sub = graph.getSubgraph(a, 1);
      expect(sub.nodes).toHaveLength(2);
    });

    it('includes incoming edge nodes in subgraph', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', b, a));
      const sub = graph.getSubgraph(a, 1);
      expect(sub.nodes).toHaveLength(2);
      expect(sub.edges).toHaveLength(1);
    });

    it('depth larger than graph diameter returns full graph', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      const sub = graph.getSubgraph(a, 100);
      expect(sub.nodes).toHaveLength(2);
      expect(sub.edges).toHaveLength(1);
    });
  });

  // ─── getUserGraph ─────────────────────────────────────────

  describe('getUserGraph', () => {
    it('returns all nodes for a user', () => {
      const user = crypto.randomUUID();
      graph.addNode(makeNode(nid(), user));
      graph.addNode(makeNode(nid(), user));
      graph.addNode(makeNode(nid(), user));
      const ug = graph.getUserGraph(user);
      expect(ug.nodes).toHaveLength(3);
    });

    it('returns edges between nodes of same user', () => {
      const user = crypto.randomUUID();
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a, user));
      graph.addNode(makeNode(b, user));
      graph.addEdge(makeEdge('e1', a, b));
      const ug = graph.getUserGraph(user);
      expect(ug.edges).toHaveLength(1);
    });

    it('does not include edges to other users nodes', () => {
      const userA = crypto.randomUUID();
      const userB = crypto.randomUUID();
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a, userA));
      graph.addNode(makeNode(b, userB));
      graph.addEdge(makeEdge('e1', a, b));
      const ug = graph.getUserGraph(userA);
      expect(ug.edges).toHaveLength(0);
    });

    it('returns empty for unknown user', () => {
      const ug = graph.getUserGraph(crypto.randomUUID());
      expect(ug.nodes).toHaveLength(0);
      expect(ug.edges).toHaveLength(0);
    });

    it('returns empty nodes and edges after removing all user nodes', () => {
      const user = crypto.randomUUID();
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a, user));
      graph.addNode(makeNode(b, user));
      graph.addEdge(makeEdge('e1', a, b));
      graph.removeNode(a);
      graph.removeNode(b);
      const ug = graph.getUserGraph(user);
      expect(ug.nodes).toHaveLength(0);
      expect(ug.edges).toHaveLength(0);
    });

    it('returns nodes with correct types', () => {
      const user = crypto.randomUUID();
      graph.addNode(makeNode(nid(), user, ExperienceNodeType.Skill, 'TS'));
      graph.addNode(makeNode(nid(), user, ExperienceNodeType.Domain, 'Web'));
      const ug = graph.getUserGraph(user);
      expect(ug.nodes.map(n => n.type)).toEqual([ExperienceNodeType.Skill, ExperienceNodeType.Domain]);
    });

    it('includes multiple edges within user graph', () => {
      const user = crypto.randomUUID();
      const a = nid();
      const b = nid();
      const c = nid();
      graph.addNode(makeNode(a, user));
      graph.addNode(makeNode(b, user));
      graph.addNode(makeNode(c, user));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', b, c));
      const ug = graph.getUserGraph(user);
      expect(ug.edges).toHaveLength(2);
    });
  });

  // ─── Edge cases and integration ───────────────────────────

  describe('edge cases', () => {
    it('empty graph returns empty results for all queries', () => {
      expect(graph.getNode(nid())).toBeNull();
      expect(graph.getEdgesForNode(nid())).toEqual([]);
      expect(graph.getNeighbors(nid())).toEqual([]);
      expect(graph.findPath(nid(), nid())).toEqual([]);
      expect(graph.getUserGraph(crypto.randomUUID()).nodes).toHaveLength(0);
    });

    it('diamond graph findPath returns shortest path', () => {
      // a → b → d and a → c → d
      const a = nid();
      const b = nid();
      const c = nid();
      const d = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addNode(makeNode(c));
      graph.addNode(makeNode(d));
      graph.addEdge(makeEdge('e1', a, b));
      graph.addEdge(makeEdge('e2', a, c));
      graph.addEdge(makeEdge('e3', b, d));
      graph.addEdge(makeEdge('e4', c, d));
      const path = graph.findPath(a, d);
      // Both paths are length 3, either is valid
      expect(path).toHaveLength(3);
      expect(path![0]).toBe(a);
      expect(path![2]).toBe(d);
    });

    it('removing and re-adding edge works correctly', () => {
      const a = nid();
      const b = nid();
      graph.addNode(makeNode(a));
      graph.addNode(makeNode(b));
      graph.addEdge(makeEdge('e1', a, b));
      graph.removeEdge('e1');
      expect(graph.getEdgesForNode(a)).toHaveLength(0);
      // Re-add with same ID
      graph.addEdge(makeEdge('e1', a, b));
      expect(graph.getEdgesForNode(a)).toHaveLength(1);
    });

    it('star graph: central node connects to many leaves', () => {
      const center = nid();
      graph.addNode(makeNode(center));
      const leaves = Array.from({ length: 10 }, () => nid());
      for (const leaf of leaves) {
        graph.addNode(makeNode(leaf));
        graph.addEdge(makeEdge(`e-${leaf}`, center, leaf));
      }
      expect(graph.getNeighbors(center)).toHaveLength(10);
      const sub = graph.getSubgraph(center, 1);
      expect(sub.nodes).toHaveLength(11);
      expect(sub.edges).toHaveLength(10);
    });

    it('getUserGraph handles user with only isolated nodes', () => {
      const user = crypto.randomUUID();
      graph.addNode(makeNode(nid(), user));
      graph.addNode(makeNode(nid(), user));
      const ug = graph.getUserGraph(user);
      expect(ug.nodes).toHaveLength(2);
      expect(ug.edges).toHaveLength(0);
    });
  });
});
