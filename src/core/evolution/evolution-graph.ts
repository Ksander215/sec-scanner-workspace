/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #11
 * EvolutionGraph: Graph of platform evolution. Each change is a node.
 * TASK-AIS-008A.000
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  EvolutionNodeId, EvolutionNode, EvolutionEdge,
  EvolutionGraphConfig,
} from './types.js';
import { brandEvolutionNodeId } from './types.js';
import type { IEvolutionGraph, EvolutionNodeParams } from './contracts.js';
import { GraphNodeLimitExceededError } from './errors.js';
import type { EvolutionNodeAddedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class GraphStore {
  private readonly nodes = new Map<string, EvolutionNode>();
  private readonly edges: EvolutionEdge[] = [];

  addNode(n: EvolutionNode): void { this.nodes.set(n.id, n); }
  getNode(id: EvolutionNodeId): EvolutionNode | undefined { return this.nodes.get(id); }
  getAllNodes(): readonly EvolutionNode[] { return Object.freeze([...this.nodes.values()]); }
  addEdge(e: EvolutionEdge): void { this.edges.push(e); }
  getAllEdges(): readonly EvolutionEdge[] { return Object.freeze([...this.edges]); }
  get nodeCount(): number { return this.nodes.size; }
  get edgeCount(): number { return this.edges.length; }
}

export class EvolutionGraph implements IEvolutionGraph {
  private readonly config: EvolutionGraphConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new GraphStore();

  constructor(config: EvolutionGraphConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async addNode(params: EvolutionNodeParams): Promise<EvolutionNode> {
    if (this.store.nodeCount >= this.config.maxNodes) {
      throw new GraphNodeLimitExceededError(this.config.maxNodes);
    }
    const ts = new Date().toISOString();
    const nodeId = brandEvolutionNodeId(crypto.randomUUID());
    const node: EvolutionNode = Object.freeze({
      id: nodeId,
      type: params.type,
      title: params.title,
      description: params.description,
      relatedIds: params.relatedIds,
      parentId: params.parentId,
      childIds: Object.freeze([]),
      valueImpact: params.valueImpact,
      createdAt: ts,
      metadata: params.metadata,
    });

    // Update parent's childIds
    if (params.parentId) {
      const parent = this.store.getNode(params.parentId);
      if (parent) {
        const updatedParent: EvolutionNode = Object.freeze({
          ...parent,
          childIds: Object.freeze([...parent.childIds, nodeId]),
        });
        this.store.addNode(updatedParent);
      }
    }

    this.store.addNode(node);
    void this.publishEvent<EvolutionNodeAddedEvent>({
      eventType: 'evolution.graph.nodeAdded', classification: EventClassification.Action,
      nodeId, type: params.type, title: params.title,
      timestamp: ts, metadata: Object.freeze({}),
    });
    return node;
  }

  async addEdge(from: EvolutionNodeId, to: EvolutionNodeId, label: string, weight: number = 1): Promise<EvolutionEdge> {
    const edge: EvolutionEdge = Object.freeze({
      from, to, label, weight, createdAt: new Date().toISOString(),
    });
    this.store.addEdge(edge);
    return edge;
  }

  async getNode(id: EvolutionNodeId): Promise<EvolutionNode | null> {
    return this.store.getNode(id) ?? null;
  }

  async getRootNodes(): Promise<readonly EvolutionNode[]> {
    return this.store.getAllNodes().filter(n => n.parentId === null);
  }

  async getPath(nodeId: EvolutionNodeId): Promise<readonly EvolutionNode[]> {
    const path: EvolutionNode[] = [];
    let current = this.store.getNode(nodeId);
    while (current && path.length < this.config.maxDepth) {
      path.unshift(current);
      if (current.parentId) {
        current = this.store.getNode(current.parentId);
      } else {
        break;
      }
    }
    return Object.freeze(path);
  }

  async listNodes(): Promise<readonly EvolutionNode[]> {
    return this.store.getAllNodes();
  }

  async listEdges(): Promise<readonly EvolutionEdge[]> {
    return this.store.getAllEdges();
  }

  async count(): Promise<number> { return this.store.nodeCount; }

  getStore(): GraphStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        aggregateId: 'evolution-graph', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
