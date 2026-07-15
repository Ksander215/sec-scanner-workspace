/**
 * Knowledge Graph Domain Builders
 *
 * Fluent builder API for constructing domain models.
 * All builders:
 * - Return `this` from each `with*()` method for chaining
 * - Validate required fields in `build()`
 * - Return Object.freeze()'d immutable results
 * - Fall back to sensible defaults for optional fields
 */

import type { Metadata, StringMap, Timestamp } from '../types/index.ts';
import {
  NodeType, EdgeType, SnapshotStatus, TransactionStatus,
  MAX_NODE_PROPERTIES, MAX_EDGE_PROPERTIES,
} from '../types/index.ts';
import {
  createGraphNode, createGraphEdge, createGraphSubgraph, createGraphSnapshot,
  createNodeIdentity, createNodeMetadata, createRelationship,
  type GraphNode, type GraphEdge, type GraphSubgraph, type GraphSnapshot,
  generateId,
} from '../models/index.ts';

// ─── GraphNodeBuilder ──────────────────────────────────────────

/**
 * Fluent builder for GraphNode instances.
 *
 * @example
 * ```ts
 * const node = new GraphNodeBuilder()
 *   .withId('app-1')
 *   .withType(NodeType.Application)
 *   .withLabels(['webapp', 'production'])
 *   .withProperty('name', 'MyApp')
 *   .withConfidence(0.95)
 *   .withSource('nuclei-scan')
 *   .build();
 * ```
 */
export class GraphNodeBuilder {
  private _id: string = '';
  private _type: NodeType | null = null;
  private _labels: string[] = [];
  private _properties: Record<string, string | number | boolean | null> = {};
  private _source: string = 'unknown';
  private _confidence: number = 1.0;
  private _tags: string[] = [];
  private _createdAt: string | null = null;
  private _updatedAt: string | null = null;

  withId(id: string): this {
    this._id = id;
    return this;
  }

  withType(type: NodeType): this {
    this._type = type;
    return this;
  }

  withLabels(labels: readonly string[]): this {
    this._labels = [...labels];
    return this;
  }

  addLabel(label: string): this {
    this._labels.push(label);
    return this;
  }

  withProperty(key: string, value: string | number | boolean | null): this {
    this._properties[key] = value;
    return this;
  }

  withProperties(properties: Metadata): this {
    Object.assign(this._properties, properties);
    return this;
  }

  withSource(source: string): this {
    this._source = source;
    return this;
  }

  withConfidence(confidence: number): this {
    this._confidence = confidence;
    return this;
  }

  withTags(tags: readonly string[]): this {
    this._tags = [...tags];
    return this;
  }

  addTag(tag: string): this {
    this._tags.push(tag);
    return this;
  }

  withCreatedAt(createdAt: string): this {
    this._createdAt = createdAt;
    return this;
  }

  withUpdatedAt(updatedAt: string): this {
    this._updatedAt = updatedAt;
    return this;
  }

  build(): GraphNode {
    if (!this._id) {
      throw new Error('GraphNode requires an id — call withId() before build()');
    }
    if (this._type === null) {
      throw new Error('GraphNode requires a type — call withType() before build()');
    }

    return createGraphNode(this._id, this._type, {
      labels: this._labels,
      metadata: {
        source: this._source,
        confidence: this._confidence,
        tags: this._tags,
        createdAt: this._createdAt ?? undefined,
        updatedAt: this._updatedAt ?? undefined,
      },
      properties: this._properties as Metadata,
    });
  }

  /** Reset builder state for reuse */
  reset(): this {
    this._id = '';
    this._type = null;
    this._labels = [];
    this._properties = {};
    this._source = 'unknown';
    this._confidence = 1.0;
    this._tags = [];
    this._createdAt = null;
    this._updatedAt = null;
    return this;
  }
}

// ─── GraphEdgeBuilder ──────────────────────────────────────────

/**
 * Fluent builder for GraphEdge instances.
 *
 * @example
 * ```ts
 * const edge = new GraphEdgeBuilder()
 *   .withId('edge-1')
 *   .withSource('app-1')
 *   .withTarget('host-1')
 *   .withEdgeType(EdgeType.HOSTS)
 *   .withStrength(0.8)
 *   .withProperty('since', '2024-01-01')
 *   .build();
 * ```
 */
export class GraphEdgeBuilder {
  private _id: string = '';
  private _sourceId: string = '';
  private _targetId: string = '';
  private _edgeType: EdgeType | null = null;
  private _strength: number = 1.0;
  private _description: string = '';
  private _properties: Record<string, string | number | boolean | null> = {};
  private _createdAt: string | null = null;

  withId(id: string): this {
    this._id = id;
    return this;
  }

  withSource(sourceId: string): this {
    this._sourceId = sourceId;
    return this;
  }

  withTarget(targetId: string): this {
    this._targetId = targetId;
    return this;
  }

  withEdgeType(edgeType: EdgeType): this {
    this._edgeType = edgeType;
    return this;
  }

  withStrength(strength: number): this {
    this._strength = strength;
    return this;
  }

  withDescription(description: string): this {
    this._description = description;
    return this;
  }

  withProperty(key: string, value: string | number | boolean | null): this {
    this._properties[key] = value;
    return this;
  }

  withProperties(properties: Metadata): this {
    Object.assign(this._properties, properties);
    return this;
  }

  withCreatedAt(createdAt: string): this {
    this._createdAt = createdAt;
    return this;
  }

  build(): GraphEdge {
    if (!this._id) {
      throw new Error('GraphEdge requires an id — call withId() before build()');
    }
    if (!this._sourceId) {
      throw new Error('GraphEdge requires a source — call withSource() before build()');
    }
    if (!this._targetId) {
      throw new Error('GraphEdge requires a target — call withTarget() before build()');
    }
    if (this._edgeType === null) {
      throw new Error('GraphEdge requires an edgeType — call withEdgeType() before build()');
    }

    const relationship = createRelationship(this._edgeType, {
      strength: this._strength,
      description: this._description,
    });

    return createGraphEdge(this._id, this._sourceId, this._targetId, relationship, {
      properties: this._properties as Metadata,
      createdAt: this._createdAt ?? undefined,
    });
  }

  reset(): this {
    this._id = '';
    this._sourceId = '';
    this._targetId = '';
    this._edgeType = null;
    this._strength = 1.0;
    this._description = '';
    this._properties = {};
    this._createdAt = null;
    return this;
  }
}

// ─── SnapshotBuilder ───────────────────────────────────────────

/**
 * Fluent builder for GraphSnapshot instances.
 *
 * @example
 * ```ts
 * const snapshot = new SnapshotBuilder()
 *   .withId('snap-1')
 *   .withVersion('v1')
 *   .withCounts(100, 250)
 *   .withNodeTypeCount('Application', 20)
 *   .withEdgeTypeCount('HOSTS', 50)
 *   .build();
 * ```
 */
export class SnapshotBuilder {
  private _id: string = '';
  private _version: string = '';
  private _nodeCount: number = 0;
  private _edgeCount: number = 0;
  private _nodeTypeCounts: Record<string, number> = {};
  private _edgeTypeCounts: Record<string, number> = {};
  private _status: SnapshotStatus = SnapshotStatus.Active;
  private _metadata: Record<string, string | number | boolean | null> = {};
  private _createdAt: string | null = null;

  withId(id: string): this {
    this._id = id;
    return this;
  }

  withVersion(version: string): this {
    this._version = version;
    return this;
  }

  withCounts(nodeCount: number, edgeCount: number): this {
    this._nodeCount = nodeCount;
    this._edgeCount = edgeCount;
    return this;
  }

  withNodeTypeCount(type: string, count: number): this {
    this._nodeTypeCounts[type] = count;
    return this;
  }

  withEdgeTypeCount(type: string, count: number): this {
    this._edgeTypeCounts[type] = count;
    return this;
  }

  withStatus(status: SnapshotStatus): this {
    this._status = status;
    return this;
  }

  withMetadata(metadata: Metadata): this {
    Object.assign(this._metadata, metadata);
    return this;
  }

  withCreatedAt(createdAt: string): this {
    this._createdAt = createdAt;
    return this;
  }

  build(): GraphSnapshot {
    if (!this._id) {
      throw new Error('Snapshot requires an id — call withId() before build()');
    }
    if (!this._version) {
      throw new Error('Snapshot requires a version — call withVersion() before build()');
    }

    return createGraphSnapshot(
      this._id, this._version, this._nodeCount, this._edgeCount,
      {
        nodeTypeCounts: this._nodeTypeCounts as StringMap<number>,
        edgeTypeCounts: this._edgeTypeCounts as StringMap<number>,
        status: this._status,
        metadata: this._metadata as Metadata,
        createdAt: this._createdAt ?? undefined,
      },
    );
  }

  reset(): this {
    this._id = '';
    this._version = '';
    this._nodeCount = 0;
    this._edgeCount = 0;
    this._nodeTypeCounts = {};
    this._edgeTypeCounts = {};
    this._status = SnapshotStatus.Active;
    this._metadata = {};
    this._createdAt = null;
    return this;
  }
}

// ─── SubgraphBuilder ───────────────────────────────────────────

/**
 * Fluent builder for GraphSubgraph instances.
 * Validates that all edge endpoints exist in the node set.
 *
 * @example
 * ```ts
 * const subgraph = new SubgraphBuilder()
 *   .withId('sg-1')
 *   .withDescription('Application subgraph')
 *   .addNode(appNode)
 *   .addNode(hostNode)
 *   .addEdge(hostsEdge)
 *   .build();
 * ```
 */
export class SubgraphBuilder {
  private _id: string = '';
  private _nodes: GraphNode[] = [];
  private _edges: GraphEdge[] = [];
  private _description: string = '';

  withId(id: string): this {
    this._id = id;
    return this;
  }

  withDescription(description: string): this {
    this._description = description;
    return this;
  }

  addNode(node: GraphNode): this {
    this._nodes.push(node);
    return this;
  }

  addNodes(nodes: readonly GraphNode[]): this {
    this._nodes.push(...nodes);
    return this;
  }

  addEdge(edge: GraphEdge): this {
    this._edges.push(edge);
    return this;
  }

  addEdges(edges: readonly GraphEdge[]): this {
    this._edges.push(...edges);
    return this;
  }

  build(): GraphSubgraph {
    if (!this._id) {
      throw new Error('Subgraph requires an id — call withId() before build()');
    }

    return createGraphSubgraph(this._id, this._nodes, this._edges, {
      description: this._description,
    });
  }

  reset(): this {
    this._id = '';
    this._nodes = [];
    this._edges = [];
    this._description = '';
    return this;
  }
}
