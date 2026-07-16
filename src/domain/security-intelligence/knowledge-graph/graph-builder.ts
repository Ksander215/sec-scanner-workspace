import type { SecurityFinding } from '../normalization/types.js';
import type { Correlation, CorrelationGroup } from '../correlation/types.js';
import type {
  KGNode,
  KGEdge,
  NodeType,
  EdgeType,
  KnowledgeGraph,
  KGStatistics,
  TraversalResult,
} from './types.js';

export class KnowledgeGraphBuilder {
  private graph: KnowledgeGraph = {
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map(),
  };

  buildFromFindings(findings: SecurityFinding[]): KnowledgeGraph {
    for (const f of findings) {
      this.addFindingNodes(f);
    }
    return this.graph;
  }

  addCorrelations(correlations: Correlation[], findings: Map<string, SecurityFinding>): void {
    for (const c of correlations) {
      const a = findings.get(c.findingA);
      const b = findings.get(c.findingB);
      if (a && b) {
        this.addEdge(a.id, b.id, c.type as EdgeType, { correlationId: c.id, score: c.score }, c.score);
      }
    }
  }

  addGroups(groups: CorrelationGroup[]): void {
    for (const g of groups) {
      const groupId = `group-${g.id}`;
      this.addNode(groupId, 'attack-step', g.name, { description: g.description });
      for (const fid of g.findings) {
        this.addEdge(fid, groupId, 'RELATED_TO', { group: g.id }, 1);
      }
    }
  }

  addNode(id: string, type: NodeType, label: string, properties: Record<string, unknown> = {}): KGNode {
    if (this.graph.nodes.has(id)) return this.graph.nodes.get(id)!;
    const node: KGNode = { id, type, label, properties, createdAt: new Date() };
    this.graph.nodes.set(id, node);
    if (!this.graph.adjacency.has(id)) this.graph.adjacency.set(id, new Set());
    return node;
  }

  addEdge(source: string, target: string, type: EdgeType, properties: Record<string, unknown> = {}, weight = 1): KGEdge {
    const id = `edge-${source}-${target}-${type}`;
    if (this.graph.edges.has(id)) return this.graph.edges.get(id)!;
    const edge: KGEdge = { id, type, source, target, properties, weight, createdAt: new Date() };
    this.graph.edges.set(id, edge);
    this.graph.adjacency.get(source)?.add(target);
    this.graph.adjacency.get(target)?.add(source);
    return edge;
  }

  traverse(startId: string, maxDepth = 3): TraversalResult {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
    const nodes: KGNode[] = [];
    const edges: KGEdge[] = [];
    const paths: string[][] = [];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const node = this.graph.nodes.get(id);
      if (node) nodes.push(node);

      const neighbors = this.graph.adjacency.get(id) ?? new Set();
      for (const nid of neighbors) {
        const edge = this.findEdge(id, nid);
        if (edge) edges.push(edge);
        if (!visited.has(nid)) {
          queue.push({ id: nid, depth: depth + 1 });
        }
      }
    }

    return { nodes, edges, paths };
  }

  getStatistics(): KGStatistics {
    const nodesByType: Record<NodeType, number> = {} as Record<NodeType, number>;
    const edgesByType: Record<EdgeType, number> = {} as Record<EdgeType, number>;

    for (const node of this.graph.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
    }
    for (const edge of this.graph.edges.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1;
    }

    const n = this.graph.nodes.size;
    const density = n > 1 ? (2 * this.graph.edges.size) / (n * (n - 1)) : 0;

    return {
      totalNodes: n,
      totalEdges: this.graph.edges.size,
      nodesByType,
      edgesByType,
      connectedComponents: this.countComponents(),
      density,
    };
  }

  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  private addFindingNodes(f: SecurityFinding): void {
    // Host node
    this.addNode(f.host, 'host', f.host, { ip: f.host });

    // Finding node
    this.addNode(f.id, 'finding', f.name, {
      severity: f.severity,
      category: f.category,
      confidence: f.confidence,
      description: f.description,
    });

    // Host DISCOVERED_BY Finding
    this.addEdge(f.host, f.id, 'DISCOVERED_BY', {}, 1);

    // Port/Service nodes
    if (f.port) {
      const serviceId = `${f.host}:${f.port}`;
      this.addNode(serviceId, 'service', serviceId, { port: f.port, protocol: f.protocol });
      this.addEdge(f.host, serviceId, 'HOSTS', {}, 1);
      this.addEdge(serviceId, f.id, 'DISCOVERED_BY', {}, 1);
    }
  }

  private findEdge(a: string, b: string): KGEdge | undefined {
    for (const edge of this.graph.edges.values()) {
      if ((edge.source === a && edge.target === b) || (edge.source === b && edge.target === a)) {
        return edge;
      }
    }
    return undefined;
  }

  private countComponents(): number {
    const visited = new Set<string>();
    let count = 0;
    for (const [id] of this.graph.nodes) {
      if (!visited.has(id)) {
        count++;
        const queue = [id];
        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (visited.has(curr)) continue;
          visited.add(curr);
          const neighbors = this.graph.adjacency.get(curr) ?? new Set();
          for (const n of neighbors) queue.push(n);
        }
      }
    }
    return count;
  }
}
