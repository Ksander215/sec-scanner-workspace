/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Evolution Graph
 * TASK-AIS-008A.000
 *
 * Graph of platform evolution. Each change is a node.
 * Tracks the lineage and impact of every improvement.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IEvolutionGraph, EvolutionNodeParams } from './contracts.js';
import type {
  EvolutionNodeId, EvolutionNode, EvolutionEdge, EvolutionGraphConfig,
} from './types.js';
import { brandEvolutionNodeId } from './types.js';
import { GraphNodeLimitExceededError, EvolutionGraphError } from './errors.js';

export class EvolutionGraph implements IEvolutionGraph {
  private readonly config: EvolutionGraphConfig;
  private readonly eventBus: InProcessEventBus | null;
  private nodes = new Map<string, EvolutionNode>();
  private edges: EvolutionEdge[] = [];

  constructor(config: EvolutionGraphConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async addNode(params: EvolutionNodeParams): Promise<EvolutionNode> {
    if (this.nodes.size >= this.config.maxNodes) {
      throw new GraphNodeLimitExceededError(this.config.maxNodes);
    }

    const now: Timestamp = new Date().toISOString();
    const id = brandEvolutionNodeId(crypto.randomUUID());

    // Validate parent exists if parentId is provided
    if (params.parentId !== null) {
      const parent = this.nodes.get(params.parentId as string);
      if (!parent) {
        throw new EvolutionGraphError(`Parent node not found: ${params.parentId as string}`);
      }
    }

    const node: EvolutionNode = Object.freeze({
      id,
      type: params.type,
      title: params.title,
      description: params.description,
      relatedIds: Object.freeze([...params.relatedIds]),
      parentId: params.parentId,
      childIds: Object.freeze([]),
      valueImpact: params.valueImpact,
      createdAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });

    this.nodes.set(id as string, node);

    // Update parent's childIds
    if (params.parentId !== null) {
      const parent = this.nodes.get(params.parentId as string)!;
      const updatedParent: EvolutionNode = Object.freeze({
        ...parent,
        childIds: Object.freeze([...parent.childIds, id]),
      });
      this.nodes.set(params.parentId as string, updatedParent);
    }

    await this.publishEvent({
      eventType: 'evolution.graph.nodeAdded',
      classification: EventClassification.Action,
      nodeId: id,
      type: params.type,
      title: params.title,
      timestamp: now,
      metadata: Object.freeze({}),
    }, id as string, 'EvolutionNode');

    return node;
  }

  async addEdge(from: EvolutionNodeId, to: EvolutionNodeId, label: string, weight: number = 1): Promise<EvolutionEdge> {
    const now: Timestamp = new Date().toISOString();
    const edge: EvolutionEdge = Object.freeze({
      from,
      to,
      label,
      weight,
      createdAt: now,
    });
    this.edges.push(edge);
    return edge;
  }

  async getNode(id: EvolutionNodeId): Promise<EvolutionNode | null> {
    return this.nodes.get(id as string) ?? null;
  }

  async getRootNodes(): Promise<readonly EvolutionNode[]> {
    return Array.from(this.nodes.values()).filter(n => n.parentId === null);
  }

  async getPath(nodeId: EvolutionNodeId): Promise<readonly EvolutionNode[]> {
    const path: EvolutionNode[] = [];
    let current = this.nodes.get(nodeId as string);
    while (current && path.length < this.config.maxDepth) {
      path.unshift(current);
      if (current.parentId !== null) {
        current = this.nodes.get(current.parentId as string);
      } else {
        break;
      }
    }
    return Object.freeze(path);
  }

  async listNodes(): Promise<readonly EvolutionNode[]> {
    return Array.from(this.nodes.values());
  }

  async listEdges(): Promise<readonly EvolutionEdge[]> {
    return Object.freeze([...this.edges]);
  }

  async count(): Promise<number> {
    return this.nodes.size;
  }

  /** Reset internal state. Used by EvolutionRuntime.shutdown(). */
  dispose(): void {
    this.nodes = new Map();
    this.edges = [];
  }

  private async publishEvent(
    event: Record<string, unknown>,
    aggregateId: string,
    aggregateType: string,
  ): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
