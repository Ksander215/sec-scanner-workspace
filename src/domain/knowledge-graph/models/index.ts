/**
 * Knowledge Graph Domain Models
 *
 * All domain models for the Knowledge Graph are defined as readonly interfaces
 * with Object.freeze() enforcement at runtime. Models are immutable by design:
 * - All fields are readonly
 * - Arrays use readonly T[]
 * - Optional fields use ? with readonly
 * - Object.freeze() applied at construction (via builders)
 *
 * Each model supports:
 * - Constructor validation (via builders)
 * - Serialization (toJSON)
 * - Deserialization (static fromJSON)
 * - Equality (deepEqual)
 * - Cloning (clone)
 * - Hashing (hash)
 */

import type {
  NodeId, EdgeId, SnapshotId, TransactionId, VersionId, QueryId,
  Timestamp, Metadata, StringMap,
} from '../types/index.ts';
import {
  NodeType, EdgeType, SnapshotStatus, TransactionStatus,
  brandNodeId, brandEdgeId, brandSnapshotId, brandTransactionId, brandVersionId, brandQueryId,
  MAX_ID_LENGTH, MIN_ID_LENGTH, MAX_LABEL_LENGTH, MAX_NODE_PROPERTIES, MAX_EDGE_PROPERTIES,
} from '../types/index.ts';

// ─── Utility Functions ─────────────────────────────────────────

/** Deep equality check for serializable objects */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => deepEqual(aObj[key], bObj[key]));
}

/** Simple hash function (dual FNV-1a) for consistent hashing of model data with low collision rate */
export function hashString(input: string): string {
  // Two independent FNV-1a passes with different seeds for a 16-char hex output
  let h1 = 0x811c9dc5;
  let h2 = 0x1e35a7bd; // Different seed for second pass
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 ^= ch;
    h2 = (h2 * 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** Recursively sort object keys for deterministic JSON serialization */
function sortedStringify(data: unknown): string {
  if (data === null || data === undefined) return JSON.stringify(data);
  if (typeof data !== 'object') return JSON.stringify(data);
  if (Array.isArray(data)) return '[' + data.map(sortedStringify).join(',') + ']';
  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + sortedStringify(obj[k])).join(',') + '}';
}

/** Hash a model by serializing it to a deterministic JSON string */
export function hashModel(data: unknown): string {
  return hashString(sortedStringify(data));
}

/** Deep clone via JSON round-trip (safe for our serializable models) */
export function cloneModel<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

/** Generate a unique ID with an optional prefix */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── NodeIdentity ──────────────────────────────────────────────

/**
 * Identity information for a graph node.
 * Provides uniqueness guarantees and type classification.
 */
export interface NodeIdentity {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly labels: readonly string[];
}

/** Create a NodeIdentity with validation */
export function createNodeIdentity(
  id: string,
  type: NodeType,
  labels: readonly string[] = [],
): NodeIdentity {
  if (!id || id.length < MIN_ID_LENGTH || id.length > MAX_ID_LENGTH) {
    throw new Error(`Node id must be 1-${MAX_ID_LENGTH} characters, got: '${id}'`);
  }
  if (!Object.values(NodeType).includes(type)) {
    throw new Error(`Invalid NodeType: ${type}`);
  }
  for (const label of labels) {
    if (label.length > MAX_LABEL_LENGTH) {
      throw new Error(`Label exceeds max length ${MAX_LABEL_LENGTH}: '${label.slice(0, 20)}...'`);
    }
  }
  return Object.freeze({
    id: brandNodeId(id),
    type,
    labels: Object.freeze([...labels]),
  });
}

// ─── NodeMetadata ──────────────────────────────────────────────

/**
 * Metadata associated with a graph node.
 * Includes creation/update timestamps, source information, and confidence.
 */
export interface NodeMetadata {
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly source: string;
  readonly confidence: number;
  readonly tags: readonly string[];
}

/** Create NodeMetadata with validation and defaults */
export function createNodeMetadata(partial: Partial<NodeMetadata> = {}): NodeMetadata {
  const now = new Date().toISOString();
  const confidence = partial.confidence ?? 1.0;
  if (confidence < 0 || confidence > 1) {
    throw new Error(`Confidence must be between 0 and 1, got: ${confidence}`);
  }
  return Object.freeze({
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    source: partial.source ?? 'unknown',
    confidence,
    tags: Object.freeze([...(partial.tags ?? [])]),
  });
}

// ─── GraphNode ─────────────────────────────────────────────────

/**
 * A node in the Knowledge Graph representing a security domain entity.
 * Nodes are the primary entities — applications, hosts, endpoints, findings, etc.
 */
export interface GraphNode {
  readonly identity: NodeIdentity;
  readonly metadata: NodeMetadata;
  readonly properties: Metadata;
}

/** Create a GraphNode with validation */
export function createGraphNode(
  id: string,
  type: NodeType,
  options: {
    labels?: readonly string[];
    metadata?: Partial<NodeMetadata>;
    properties?: Metadata;
  } = {},
): GraphNode {
  const identity = createNodeIdentity(id, type, options.labels);
  const metadata = createNodeMetadata(options.metadata);

  if (options.properties) {
    const propKeys = Object.keys(options.properties);
    if (propKeys.length > MAX_NODE_PROPERTIES) {
      throw new Error(`Node properties exceed maximum (${MAX_NODE_PROPERTIES}), got: ${propKeys.length}`);
    }
  }

  return Object.freeze({
    identity,
    metadata,
    properties: Object.freeze({ ...(options.properties ?? {}) }),
  });
}

/** Serialize GraphNode to JSON-compatible object */
export function graphNodeToJSON(node: GraphNode): Record<string, unknown> {
  return {
    identity: {
      id: node.identity.id,
      type: node.identity.type,
      labels: [...node.identity.labels],
    },
    metadata: { ...node.metadata, tags: [...node.metadata.tags] },
    properties: { ...node.properties },
  };
}

/** Deserialize GraphNode from JSON-compatible object */
export function graphNodeFromJSON(json: Record<string, unknown>): GraphNode {
  const identity = json.identity as Record<string, unknown>;
  const metadata = json.metadata as Record<string, unknown>;
  const props = (json.properties ?? {}) as Metadata;
  return createGraphNode(
    identity.id as string,
    identity.type as NodeType,
    {
      labels: identity.labels as string[],
      metadata: {
        createdAt: metadata.createdAt as string,
        updatedAt: metadata.updatedAt as string,
        source: metadata.source as string,
        confidence: metadata.confidence as number,
        tags: metadata.tags as string[],
      },
      properties: props,
    },
  );
}

/** Check equality of two GraphNodes */
export function graphNodeEqual(a: GraphNode, b: GraphNode): boolean {
  return a.identity.id === b.identity.id && deepEqual(graphNodeToJSON(a), graphNodeToJSON(b));
}

/** Clone a GraphNode */
export function graphNodeClone(node: GraphNode): GraphNode {
  return graphNodeFromJSON(graphNodeToJSON(node));
}

/** Hash a GraphNode */
export function graphNodeHash(node: GraphNode): string {
  return hashModel(graphNodeToJSON(node));
}

// ─── Relationship ──────────────────────────────────────────────

/**
 * Describes the semantic relationship between two nodes.
 * Used within GraphEdge to provide relationship context.
 */
export interface Relationship {
  readonly edgeType: EdgeType;
  readonly strength: number;
  readonly description: string;
}

/** Create a Relationship with validation */
export function createRelationship(
  edgeType: EdgeType,
  options: { strength?: number; description?: string } = {},
): Relationship {
  const strength = options.strength ?? 1.0;
  if (strength < 0 || strength > 1) {
    throw new Error(`Relationship strength must be between 0 and 1, got: ${strength}`);
  }
  if (!Object.values(EdgeType).includes(edgeType)) {
    throw new Error(`Invalid EdgeType: ${edgeType}`);
  }
  return Object.freeze({
    edgeType,
    strength,
    description: options.description ?? '',
  });
}

// ─── GraphEdge ─────────────────────────────────────────────────

/**
 * A directed edge in the Knowledge Graph representing a relationship
 * between two nodes. Edges are typed and carry optional properties.
 */
export interface GraphEdge {
  readonly id: EdgeId;
  readonly sourceId: NodeId;
  readonly targetId: NodeId;
  readonly relationship: Relationship;
  readonly properties: Metadata;
  readonly createdAt: Timestamp;
}

/** Create a GraphEdge with validation */
export function createGraphEdge(
  id: string,
  sourceId: string,
  targetId: string,
  relationship: Relationship,
  options: { properties?: Metadata; createdAt?: Timestamp } = {},
): GraphEdge {
  if (!id || id.length > MAX_ID_LENGTH) {
    throw new Error(`Edge id must be 1-${MAX_ID_LENGTH} characters, got: '${id}'`);
  }
  if (!sourceId || !targetId) {
    throw new Error('Edge sourceId and targetId are required');
  }
  if (sourceId === targetId) {
    throw new Error(`Self-referencing edge not allowed: '${sourceId}' -> '${targetId}'`);
  }

  if (options.properties) {
    const propKeys = Object.keys(options.properties);
    if (propKeys.length > MAX_EDGE_PROPERTIES) {
      throw new Error(`Edge properties exceed maximum (${MAX_EDGE_PROPERTIES}), got: ${propKeys.length}`);
    }
  }

  return Object.freeze({
    id: brandEdgeId(id),
    sourceId: brandNodeId(sourceId),
    targetId: brandNodeId(targetId),
    relationship,
    properties: Object.freeze({ ...(options.properties ?? {}) }),
    createdAt: options.createdAt ?? new Date().toISOString(),
  });
}

/** Serialize GraphEdge to JSON */
export function graphEdgeToJSON(edge: GraphEdge): Record<string, unknown> {
  return {
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relationship: { ...edge.relationship },
    properties: { ...edge.properties },
    createdAt: edge.createdAt,
  };
}

/** Deserialize GraphEdge from JSON */
export function graphEdgeFromJSON(json: Record<string, unknown>): GraphEdge {
  const rel = json.relationship as Record<string, unknown>;
  return createGraphEdge(
    json.id as string,
    json.sourceId as string,
    json.targetId as string,
    createRelationship(rel.edgeType as EdgeType, {
      strength: rel.strength as number,
      description: rel.description as string,
    }),
    {
      properties: (json.properties ?? {}) as Metadata,
      createdAt: json.createdAt as string | undefined,
    },
  );
}

/** Check equality of two GraphEdges */
export function graphEdgeEqual(a: GraphEdge, b: GraphEdge): boolean {
  return a.id === b.id && deepEqual(graphEdgeToJSON(a), graphEdgeToJSON(b));
}

/** Clone a GraphEdge */
export function graphEdgeClone(edge: GraphEdge): GraphEdge {
  return graphEdgeFromJSON(graphEdgeToJSON(edge));
}

/** Hash a GraphEdge */
export function graphEdgeHash(edge: GraphEdge): string {
  return hashModel(graphEdgeToJSON(edge));
}

// ─── GraphSnapshot ─────────────────────────────────────────────

/**
 * An immutable point-in-time snapshot of the graph's state.
 * Snapshots enable versioning, rollback, and audit capabilities.
 */
export interface GraphSnapshot {
  readonly id: SnapshotId;
  readonly version: VersionId;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly nodeTypeCounts: StringMap<number>;
  readonly edgeTypeCounts: StringMap<number>;
  readonly createdAt: Timestamp;
  readonly status: SnapshotStatus;
  readonly metadata: Metadata;
}

/** Create a GraphSnapshot */
export function createGraphSnapshot(
  id: string,
  version: string,
  nodeCount: number,
  edgeCount: number,
  options: {
    nodeTypeCounts?: StringMap<number>;
    edgeTypeCounts?: StringMap<number>;
    createdAt?: Timestamp;
    status?: SnapshotStatus;
    metadata?: Metadata;
  } = {},
): GraphSnapshot {
  if (!id || !version) {
    throw new Error('Snapshot id and version are required');
  }
  return Object.freeze({
    id: brandSnapshotId(id),
    version: brandVersionId(version),
    nodeCount,
    edgeCount,
    nodeTypeCounts: Object.freeze({ ...(options.nodeTypeCounts ?? {}) }),
    edgeTypeCounts: Object.freeze({ ...(options.edgeTypeCounts ?? {}) }),
    createdAt: options.createdAt ?? new Date().toISOString(),
    status: options.status ?? SnapshotStatus.Active,
    metadata: Object.freeze({ ...(options.metadata ?? {}) }),
  });
}

/** Serialize/deserialize GraphSnapshot */
export function graphSnapshotToJSON(snap: GraphSnapshot): Record<string, unknown> {
  return { ...snap };
}

export function graphSnapshotFromJSON(json: Record<string, unknown>): GraphSnapshot {
  return createGraphSnapshot(
    json.id as string,
    json.version as string,
    json.nodeCount as number,
    json.edgeCount as number,
    {
      nodeTypeCounts: json.nodeTypeCounts as StringMap<number>,
      edgeTypeCounts: json.edgeTypeCounts as StringMap<number>,
      createdAt: json.createdAt as string | undefined,
      status: json.status as SnapshotStatus | undefined,
      metadata: json.metadata as Metadata | undefined,
    },
  );
}

export function graphSnapshotEqual(a: GraphSnapshot, b: GraphSnapshot): boolean {
  return a.id === b.id && deepEqual(graphSnapshotToJSON(a), graphSnapshotToJSON(b));
}

export function graphSnapshotClone(snap: GraphSnapshot): GraphSnapshot {
  return graphSnapshotFromJSON(graphSnapshotToJSON(snap));
}

export function graphSnapshotHash(snap: GraphSnapshot): string {
  return hashModel(graphSnapshotToJSON(snap));
}

// ─── GraphVersion ──────────────────────────────────────────────

/**
 * Represents a version of the graph with lineage information.
 * Enables version tracking and rollback capabilities.
 */
export interface GraphVersion {
  readonly id: VersionId;
  readonly version: string;
  readonly parentVersion: VersionId | null;
  readonly snapshotId: SnapshotId;
  readonly createdAt: Timestamp;
  readonly description: string;
}

/** Create a GraphVersion */
export function createGraphVersion(
  id: string,
  version: string,
  snapshotId: string,
  options: {
    parentVersion?: string | null;
    createdAt?: Timestamp;
    description?: string;
  } = {},
): GraphVersion {
  return Object.freeze({
    id: brandVersionId(id),
    version,
    parentVersion: options.parentVersion != null ? brandVersionId(options.parentVersion) : null,
    snapshotId: brandSnapshotId(snapshotId),
    createdAt: options.createdAt ?? new Date().toISOString(),
    description: options.description ?? '',
  });
}

export function graphVersionToJSON(v: GraphVersion): Record<string, unknown> {
  return {
    id: v.id, version: v.version, parentVersion: v.parentVersion,
    snapshotId: v.snapshotId, createdAt: v.createdAt, description: v.description,
  };
}

export function graphVersionFromJSON(json: Record<string, unknown>): GraphVersion {
  return createGraphVersion(
    json.id as string, json.version as string, json.snapshotId as string,
    {
      parentVersion: json.parentVersion as string | null | undefined,
      createdAt: json.createdAt as string | undefined,
      description: json.description as string | undefined,
    },
  );
}

// ─── GraphTransaction ──────────────────────────────────────────

/**
 * Represents an atomic transaction on the graph.
 * Transactions group multiple operations that must be applied together.
 */
export interface GraphTransaction {
  readonly id: TransactionId;
  readonly status: TransactionStatus;
  readonly operations: readonly TransactionOperation[];
  readonly createdAt: Timestamp;
  readonly committedAt: Timestamp | null;
}

/** A single operation within a transaction */
export interface TransactionOperation {
  readonly type: 'add_node' | 'remove_node' | 'add_edge' | 'remove_edge' | 'update_properties';
  readonly targetId: string;
  readonly payload: Metadata;
}

/** Create a GraphTransaction */
export function createGraphTransaction(
  id: string,
  operations: readonly TransactionOperation[] = [],
  options: {
    status?: TransactionStatus;
    createdAt?: Timestamp;
    committedAt?: Timestamp | null;
  } = {},
): GraphTransaction {
  return Object.freeze({
    id: brandTransactionId(id),
    status: options.status ?? TransactionStatus.Pending,
    operations: Object.freeze([...operations]),
    createdAt: options.createdAt ?? new Date().toISOString(),
    committedAt: options.committedAt ?? null,
  });
}

export function graphTransactionToJSON(tx: GraphTransaction): Record<string, unknown> {
  return {
    id: tx.id, status: tx.status,
    operations: tx.operations.map(op => ({ ...op })),
    createdAt: tx.createdAt, committedAt: tx.committedAt,
  };
}

export function graphTransactionFromJSON(json: Record<string, unknown>): GraphTransaction {
  return createGraphTransaction(
    json.id as string,
    (json.operations ?? []) as TransactionOperation[],
    {
      status: json.status as TransactionStatus | undefined,
      createdAt: json.createdAt as string | undefined,
      committedAt: json.committedAt as string | null | undefined,
    },
  );
}

// ─── GraphTraversal ────────────────────────────────────────────

/**
 * Represents a traversal specification for the graph.
 * Traversal algorithms are NOT implemented here — this is just the specification.
 */
export interface GraphTraversal {
  readonly id: QueryId;
  readonly startNodeId: NodeId;
  readonly direction: 'outgoing' | 'incoming' | 'both';
  readonly edgeTypes: readonly EdgeType[];
  readonly nodeTypes: readonly NodeType[];
  readonly maxDepth: number;
  readonly createdAt: Timestamp;
}

/** Create a GraphTraversal specification */
export function createGraphTraversal(
  id: string,
  startNodeId: string,
  options: {
    direction?: 'outgoing' | 'incoming' | 'both';
    edgeTypes?: readonly EdgeType[];
    nodeTypes?: readonly NodeType[];
    maxDepth?: number;
    createdAt?: Timestamp;
  } = {},
): GraphTraversal {
  if (!startNodeId) {
    throw new Error('startNodeId is required for traversal');
  }
  const maxDepth = options.maxDepth ?? 10;
  if (maxDepth < 1 || maxDepth > 100) {
    throw new Error(`maxDepth must be 1-100, got: ${maxDepth}`);
  }
  return Object.freeze({
    id: brandQueryId(id),
    startNodeId: brandNodeId(startNodeId),
    direction: options.direction ?? 'both',
    edgeTypes: Object.freeze([...(options.edgeTypes ?? [])]),
    nodeTypes: Object.freeze([...(options.nodeTypes ?? [])]),
    maxDepth,
    createdAt: options.createdAt ?? new Date().toISOString(),
  });
}

// ─── GraphSubgraph ─────────────────────────────────────────────

/**
 * A subgraph — a subset of nodes and edges extracted from the full graph.
 * Used for focused analysis, visualization, and export.
 */
export interface GraphSubgraph {
  readonly id: QueryId;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly createdAt: Timestamp;
  readonly description: string;
}

/** Create a GraphSubgraph */
export function createGraphSubgraph(
  id: string,
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  options: {
    createdAt?: Timestamp;
    description?: string;
  } = {},
): GraphSubgraph {
  // Verify all edge endpoints exist in the node set
  const nodeIds = new Set(nodes.map(n => n.identity.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceId)) {
      throw new Error(`Edge source '${edge.sourceId}' not found in subgraph nodes`);
    }
    if (!nodeIds.has(edge.targetId)) {
      throw new Error(`Edge target '${edge.targetId}' not found in subgraph nodes`);
    }
  }
  return Object.freeze({
    id: brandQueryId(id),
    nodes: Object.freeze([...nodes]),
    edges: Object.freeze([...edges]),
    createdAt: options.createdAt ?? new Date().toISOString(),
    description: options.description ?? '',
  });
}

export function graphSubgraphToJSON(sg: GraphSubgraph): Record<string, unknown> {
  return {
    id: sg.id,
    nodes: sg.nodes.map(graphNodeToJSON),
    edges: sg.edges.map(graphEdgeToJSON),
    createdAt: sg.createdAt,
    description: sg.description,
  };
}

export function graphSubgraphFromJSON(json: Record<string, unknown>): GraphSubgraph {
  return createGraphSubgraph(
    json.id as string,
    ((json.nodes ?? []) as Record<string, unknown>[]).map(graphNodeFromJSON),
    ((json.edges ?? []) as Record<string, unknown>[]).map(graphEdgeFromJSON),
    {
      createdAt: json.createdAt as string | undefined,
      description: json.description as string | undefined,
    },
  );
}

// ─── GraphQuery ────────────────────────────────────────────────

/**
 * Represents a query specification for the graph.
 * Query execution is NOT implemented here — this is just the specification.
 */
export interface GraphQuery {
  readonly id: QueryId;
  readonly type: 'node_lookup' | 'edge_lookup' | 'path' | 'subgraph' | 'neighbors' | 'aggregate';
  readonly filters: readonly QueryFilter[];
  readonly limit: number;
  readonly offset: number;
  readonly createdAt: Timestamp;
}

/** A single filter condition for a query */
export interface QueryFilter {
  readonly field: string;
  readonly operator: 'eq' | 'neq' | 'in' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists';
  readonly value: string | number | boolean | readonly string[];
}

/** Create a GraphQuery */
export function createGraphQuery(
  id: string,
  type: GraphQuery['type'],
  options: {
    filters?: readonly QueryFilter[];
    limit?: number;
    offset?: number;
    createdAt?: Timestamp;
  } = {},
): GraphQuery {
  const limit = options.limit ?? 100;
  if (limit < 1 || limit > 10000) {
    throw new Error(`limit must be 1-10000, got: ${limit}`);
  }
  return Object.freeze({
    id: brandQueryId(id),
    type,
    filters: Object.freeze([...(options.filters ?? [])]),
    limit,
    offset: options.offset ?? 0,
    createdAt: options.createdAt ?? new Date().toISOString(),
  });
}

// ─── GraphStatistics ───────────────────────────────────────────

/**
 * Aggregate statistics about the graph's current state.
 * Used for monitoring, dashboards, and capacity planning.
 */
export interface GraphStatistics {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly nodeTypeDistribution: StringMap<number>;
  readonly edgeTypeDistribution: StringMap<number>;
  readonly avgDegree: number;
  readonly maxDegree: number;
  readonly computedAt: Timestamp;
}

/** Create GraphStatistics */
export function createGraphStatistics(
  nodeCount: number,
  edgeCount: number,
  options: {
    nodeTypeDistribution?: StringMap<number>;
    edgeTypeDistribution?: StringMap<number>;
    avgDegree?: number;
    maxDegree?: number;
    computedAt?: Timestamp;
  } = {},
): GraphStatistics {
  return Object.freeze({
    nodeCount,
    edgeCount,
    nodeTypeDistribution: Object.freeze({ ...(options.nodeTypeDistribution ?? {}) }),
    edgeTypeDistribution: Object.freeze({ ...(options.edgeTypeDistribution ?? {}) }),
    avgDegree: options.avgDegree ?? (nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0),
    maxDegree: options.maxDegree ?? 0,
    computedAt: options.computedAt ?? new Date().toISOString(),
  });
}
