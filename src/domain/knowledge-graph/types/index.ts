/**
 * Knowledge Graph Domain Types
 *
 * All enum and utility type definitions for the Knowledge Graph domain layer.
 * Types are the foundation upon which models, events, errors, and contracts are built.
 *
 * Design decisions:
 * - Node types and edge types are closed enums (exhaustive)
 * - All IDs are branded strings for nominal typing
 * - Timestamps are ISO-8601 strings (not Date objects) for serialization safety
 */

// ─── Branded ID Types ──────────────────────────────────────────

/** Branded string for GraphNode IDs — prevents accidental mixing with other string IDs */
export type NodeId = string & { readonly __brand: 'NodeId' };

/** Branded string for GraphEdge IDs — prevents accidental mixing with other string IDs */
export type EdgeId = string & { readonly __brand: 'EdgeId' };

/** Branded string for GraphSnapshot IDs */
export type SnapshotId = string & { readonly __brand: 'SnapshotId' };

/** Branded string for GraphTransaction IDs */
export type TransactionId = string & { readonly __brand: 'TransactionId' };

/** Branded string for GraphVersion IDs */
export type VersionId = string & { readonly __brand: 'VersionId' };

/** Branded string for GraphQuery IDs */
export type QueryId = string & { readonly __brand: 'QueryId' };

// ─── Utility Types ─────────────────────────────────────────────

/** ISO-8601 timestamp string */
export type Timestamp = string;

/** Arbitrary key-value metadata */
export type Metadata = Readonly<Record<string, string | number | boolean | null>>;

/** String-keyed record */
export type StringMap<T> = Readonly<Record<string, T>>;

/** Brand a plain string as a specific ID type */
export function brandNodeId(id: string): NodeId {
  return id as NodeId;
}

export function brandEdgeId(id: string): EdgeId {
  return id as EdgeId;
}

export function brandSnapshotId(id: string): SnapshotId {
  return id as SnapshotId;
}

export function brandTransactionId(id: string): TransactionId {
  return id as TransactionId;
}

export function brandVersionId(id: string): VersionId {
  return id as VersionId;
}

export function brandQueryId(id: string): QueryId {
  return id as QueryId;
}

// ─── Node Types ────────────────────────────────────────────────

/**
 * Enumeration of all supported node types in the Knowledge Graph.
 * Each type represents a distinct entity in the security domain.
 */
export enum NodeType {
  Application = 'Application',
  Host = 'Host',
  Endpoint = 'Endpoint',
  API = 'API',
  Technology = 'Technology',
  Finding = 'Finding',
  Evidence = 'Evidence',
  Identity = 'Identity',
  Secret = 'Secret',
  Credential = 'Credential',
  AttackStep = 'AttackStep',
  Recommendation = 'Recommendation',
  Asset = 'Asset',
  CloudResource = 'CloudResource',
  Service = 'Service',
  Container = 'Container',
  Repository = 'Repository',
  Component = 'Component',
}

/** Readonly array of all NodeType values for iteration */
export const ALL_NODE_TYPES: readonly NodeType[] = Object.values(NodeType) as NodeType[];

/** Total count of supported node types */
export const NODE_TYPE_COUNT = ALL_NODE_TYPES.length;

// ─── Edge Types ────────────────────────────────────────────────

/**
 * Enumeration of all supported edge (relationship) types.
 * Each type represents a directed semantic relationship between nodes.
 */
export enum EdgeType {
  USES = 'USES',
  OWNS = 'OWNS',
  CALLS = 'CALLS',
  DEPENDS_ON = 'DEPENDS_ON',
  HOSTS = 'HOSTS',
  CONNECTED_TO = 'CONNECTED_TO',
  LEADS_TO = 'LEADS_TO',
  DISCOVERED_BY = 'DISCOVERED_BY',
  EXPOSES = 'EXPOSES',
  AUTHENTICATES = 'AUTHENTICATES',
  TRUSTS = 'TRUSTS',
  CONTAINS = 'CONTAINS',
  RELATED_TO = 'RELATED_TO',
  MITIGATED_BY = 'MITIGATED_BY',
}

/** Readonly array of all EdgeType values for iteration */
export const ALL_EDGE_TYPES: readonly EdgeType[] = Object.values(EdgeType) as EdgeType[];

/** Total count of supported edge types */
export const EDGE_TYPE_COUNT = ALL_EDGE_TYPES.length;

// ─── Valid Node→Edge Combinations ──────────────────────────────

/**
 * Defines which edge types can originate from which node types.
 * Used by validators to enforce domain constraints.
 *
 * This is a simplified constraint map. The full constraint system
 * would be more granular (e.g., Finding can LEADS_TO AttackStep but not to Host),
 * but for the domain core we enforce basic type compatibility.
 */
export const VALID_SOURCE_EDGE_MAP: Readonly<Partial<Record<NodeType, readonly EdgeType[]>>> = Object.freeze({
  [NodeType.Application]: [EdgeType.OWNS, EdgeType.USES, EdgeType.CONTAINS, EdgeType.DEPENDS_ON],
  [NodeType.Host]: [EdgeType.HOSTS, EdgeType.CONNECTED_TO, EdgeType.CONTAINS],
  [NodeType.Endpoint]: [EdgeType.CALLS, EdgeType.EXPOSES, EdgeType.RELATED_TO],
  [NodeType.API]: [EdgeType.CALLS, EdgeType.DEPENDS_ON, EdgeType.USES],
  [NodeType.Technology]: [EdgeType.DEPENDS_ON, EdgeType.RELATED_TO],
  [NodeType.Finding]: [EdgeType.LEADS_TO, EdgeType.DISCOVERED_BY, EdgeType.RELATED_TO],
  [NodeType.Evidence]: [EdgeType.RELATED_TO],
  [NodeType.Identity]: [EdgeType.AUTHENTICATES, EdgeType.TRUSTS, EdgeType.OWNS],
  [NodeType.Secret]: [EdgeType.RELATED_TO, EdgeType.EXPOSES],
  [NodeType.Credential]: [EdgeType.AUTHENTICATES, EdgeType.RELATED_TO],
  [NodeType.AttackStep]: [EdgeType.LEADS_TO, EdgeType.RELATED_TO, EdgeType.MITIGATED_BY],
  [NodeType.Recommendation]: [EdgeType.MITIGATED_BY, EdgeType.RELATED_TO],
  [NodeType.Asset]: [EdgeType.OWNS, EdgeType.CONTAINS, EdgeType.USES],
  [NodeType.CloudResource]: [EdgeType.HOSTS, EdgeType.CONTAINS, EdgeType.CONNECTED_TO],
  [NodeType.Service]: [EdgeType.CALLS, EdgeType.DEPENDS_ON, EdgeType.USES, EdgeType.CONNECTED_TO],
  [NodeType.Container]: [EdgeType.CONTAINS, EdgeType.HOSTS, EdgeType.USES],
  [NodeType.Repository]: [EdgeType.CONTAINS, EdgeType.DEPENDS_ON],
  [NodeType.Component]: [EdgeType.DEPENDS_ON, EdgeType.USES, EdgeType.RELATED_TO],
} as const);

// ─── Graph Constants ───────────────────────────────────────────

/** Maximum number of properties a node can have */
export const MAX_NODE_PROPERTIES = 100;

/** Maximum number of properties an edge can have */
export const MAX_EDGE_PROPERTIES = 50;

/** Maximum label length for nodes/edges */
export const MAX_LABEL_LENGTH = 256;

/** Maximum ID length */
export const MAX_ID_LENGTH = 128;

/** Minimum ID length */
export const MIN_ID_LENGTH = 1;

// ─── Validation Severity ───────────────────────────────────────

export enum ValidationSeverity {
  Error = 'Error',
  Warning = 'Warning',
  Info = 'Info',
}

// ─── Traversal Direction ───────────────────────────────────────

export enum TraversalDirection {
  Outgoing = 'Outgoing',
  Incoming = 'Incoming',
  Both = 'Both',
}

// ─── Snapshot Status ───────────────────────────────────────────

export enum SnapshotStatus {
  Active = 'Active',
  Archived = 'Archived',
  Compacted = 'Compacted',
}

// ─── Transaction Status ────────────────────────────────────────

export enum TransactionStatus {
  Pending = 'Pending',
  Committed = 'Committed',
  RolledBack = 'RolledBack',
}
