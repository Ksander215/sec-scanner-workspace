/**
 * Personal Intelligence Pack — Knowledge Synthesizer
 * TASK-AIS-007A.000
 *
 * Builds a personal knowledge graph linking:
 * notes → conversations → projects → decisions → conclusions → experience
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type {
  KnowledgeNode, KnowledgeEdge, PackKnowledgeNodeId,
} from './types.js';
import { KnowledgeEdgeType, KnowledgeNodeType } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { KnowledgeNodeError, KnowledgeEdgeError } from './errors.js';

export class KnowledgeSynthesizer {
  private contracts: PersonalIntelligenceContracts;
  private nodes = new Map<string, KnowledgeNode>();
  private edges = new Map<string, KnowledgeEdge>();
  constructor(contracts: PersonalIntelligenceContracts, _maxNodes = 5000) {
    this.contracts = contracts;
  }

  addNode(type: KnowledgeNodeType, title: string, content: string, source: string, tags?: readonly string[]): KnowledgeNode {
    if (!title.trim()) throw new KnowledgeNodeError('title is required');
    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackKnowledgeNodeId;
    const node: KnowledgeNode = Object.freeze({
      id, type, title: title.trim(), content: content.trim(), source,
      tags: Object.freeze(tags ?? []), goalIds: Object.freeze([]),
      createdAt: now, updatedAt: now,
    });
    this.nodes.set(id as unknown as string, node);
    const base = createPackEventBase('KnowledgeNodeCreated', EventClassification.StateChange, id as unknown as string);
    void this.contracts.platform.publishEvent('KnowledgeNodeCreated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { nodeId: id, type, title, createdAt: now },
    });
    return node;
  }

  addEdge(sourceId: PackKnowledgeNodeId, targetId: PackKnowledgeNodeId, type: KnowledgeEdgeType, weight?: number): KnowledgeEdge {
    const sKey = sourceId as unknown as string;
    const tKey = targetId as unknown as string;
    if (!this.nodes.has(sKey)) throw new KnowledgeEdgeError(`Source node not found: ${sKey}`);
    if (!this.nodes.has(tKey)) throw new KnowledgeEdgeError(`Target node not found: ${tKey}`);
    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID();
    const edge: KnowledgeEdge = Object.freeze({
      id, sourceId, targetId, type,
      weight: weight ?? 1.0, createdAt: now,
    });
    this.edges.set(id, edge);
    const base = createPackEventBase('KnowledgeEdgeCreated', EventClassification.StateChange, id);
    void this.contracts.platform.publishEvent('KnowledgeEdgeCreated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { edgeId: id, sourceId: sKey, targetId: tKey, edgeType: type, createdAt: now },
    });
    return edge;
  }

  getNode(id: string): KnowledgeNode {
    const n = this.nodes.get(id);
    if (!n) throw new KnowledgeNodeError(`Node not found: ${id}`);
    return n;
  }

  getNodesByType(type: KnowledgeNodeType): readonly KnowledgeNode[] {
    return Object.freeze(Array.from(this.nodes.values()).filter(n => n.type === type));
  }

  getConnectedNodes(nodeId: string): readonly KnowledgeNode[] {
    const connected = new Set<string>();
    for (const edge of this.edges.values()) {
      const sKey = edge.sourceId as unknown as string;
      const tKey = edge.targetId as unknown as string;
      if (sKey === nodeId) connected.add(tKey);
      if (tKey === nodeId) connected.add(sKey);
    }
    return Object.freeze(
      Array.from(connected).map(k => this.nodes.get(k)).filter((n): n is KnowledgeNode => n !== undefined),
    );
  }

  getEdgesForNode(nodeId: string): readonly KnowledgeEdge[] {
    return Object.freeze(
      Array.from(this.edges.values()).filter(e =>
        (e.sourceId as unknown as string) === nodeId || (e.targetId as unknown as string) === nodeId,
      ),
    );
  }

  getSynthesis(): { nodes: readonly KnowledgeNode[]; edges: readonly KnowledgeEdge[]; totalNodes: number; totalEdges: number; synthesizedAt: Timestamp } {
    return Object.freeze({
      nodes: Object.freeze(Array.from(this.nodes.values())),
      edges: Object.freeze(Array.from(this.edges.values())),
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      synthesizedAt: new Date().toISOString() as Timestamp,
    });
  }

  getAllNodes(): readonly KnowledgeNode[] { return Object.freeze(Array.from(this.nodes.values())); }
  getAllEdges(): readonly KnowledgeEdge[] { return Object.freeze(Array.from(this.edges.values())); }
  getNodeCount(): number { return this.nodes.size; }
  getEdgeCount(): number { return this.edges.size; }
  searchNodes(query: string): readonly KnowledgeNode[] {
    const q = query.toLowerCase();
    return Object.freeze(
      Array.from(this.nodes.values()).filter(n =>
        n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
      ),
    );
  }

  dispose(): void { this.nodes.clear(); this.edges.clear(); }
}
