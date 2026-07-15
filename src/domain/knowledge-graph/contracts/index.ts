/**
 * Knowledge Graph Domain Contracts
 *
 * Interface definitions for the Knowledge Graph infrastructure layer.
 * These contracts define WHAT the infrastructure must provide,
 * but NOT how it is implemented.
 *
 * Implementation is the responsibility of the Storage Layer (INT-001B).
 * The domain layer depends only on these abstractions.
 */

import type { GraphNode, GraphEdge, GraphSnapshot, GraphSubgraph, GraphStatistics, GraphQuery, GraphTraversal } from '../models/index.ts';
import type { NodeId, EdgeId, SnapshotId } from '../types/index.ts';
import type { ValidationResult } from '../validators/index.ts';

// ─── GraphRepository ───────────────────────────────────────────

/**
 * Contract for persistent graph storage.
 * Provides CRUD operations for nodes and edges.
 */
export interface GraphRepository {
  /** Add a node to the graph. Throws DuplicateNodeError if id exists. */
  addNode(node: GraphNode): Promise<void>;

  /** Get a node by ID. Returns undefined if not found. */
  getNode(id: NodeId): Promise<GraphNode | undefined>;

  /** Remove a node by ID. Also removes all edges connected to this node. */
  removeNode(id: NodeId): Promise<boolean>;

  /** Update a node's properties. Node identity (id, type) is immutable. */
  updateNodeProperties(id: NodeId, properties: Record<string, unknown>): Promise<GraphNode>;

  /** Add an edge to the graph. Throws DuplicateEdgeError if id exists. */
  addEdge(edge: GraphEdge): Promise<void>;

  /** Get an edge by ID. Returns undefined if not found. */
  getEdge(id: EdgeId): Promise<GraphEdge | undefined>;

  /** Remove an edge by ID. */
  removeEdge(id: EdgeId): Promise<boolean>;

  /** Get all edges from a given node */
  getEdgesFrom(nodeId: NodeId): Promise<readonly GraphEdge[]>;

  /** Get all edges to a given node */
  getEdgesTo(nodeId: NodeId): Promise<readonly GraphEdge[]>;

  /** Get all nodes */
  getAllNodes(): Promise<readonly GraphNode[]>;

  /** Get all edges */
  getAllEdges(): Promise<readonly GraphEdge[]>;

  /** Count nodes */
  nodeCount(): Promise<number>;

  /** Count edges */
  edgeCount(): Promise<number>;

  /** Check if a node exists */
  hasNode(id: NodeId): Promise<boolean>;

  /** Check if an edge exists */
  hasEdge(id: EdgeId): Promise<boolean>;
}

// ─── GraphTraversalEngine ──────────────────────────────────────

/**
 * Contract for graph traversal algorithms.
 * Traversal algorithms are NOT part of the domain core —
 * they are implemented in the infrastructure layer.
 */
export interface GraphTraversalEngine {
  /** Execute a traversal specification and return matching nodes */
  traverse(spec: GraphTraversal): Promise<readonly GraphNode[]>;

  /** Find shortest path between two nodes */
  findPath(fromId: NodeId, toId: NodeId, maxDepth?: number): Promise<readonly GraphNode[]>;

  /** Find all neighbors of a node within given depth */
  findNeighbors(nodeId: NodeId, depth: number): Promise<readonly GraphNode[]>;

  /** Check if a path exists between two nodes */
  pathExists(fromId: NodeId, toId: NodeId): Promise<boolean>;

  /** Detect cycles in the graph */
  detectCycles(): Promise<readonly NodeId[][]>;
}

// ─── GraphQueryEngine ──────────────────────────────────────────

/**
 * Contract for graph query execution.
 * Query parsing and optimization are NOT part of the domain core.
 */
export interface GraphQueryEngine {
  /** Execute a query and return matching nodes */
  queryNodes(query: GraphQuery): Promise<readonly GraphNode[]>;

  /** Execute a query and return matching edges */
  queryEdges(query: GraphQuery): Promise<readonly GraphEdge[]>;

  /** Execute a query and return a subgraph */
  querySubgraph(query: GraphQuery): Promise<GraphSubgraph>;

  /** Get aggregate statistics */
  getStatistics(): Promise<GraphStatistics>;
}

// ─── GraphExporter ─────────────────────────────────────────────

/**
 * Contract for graph export functionality.
 * Supports different export formats for integration and visualization.
 */
export interface GraphExporter {
  /** Export entire graph as JSON */
  toJSON(): Promise<string>;

  /** Export a subgraph as JSON */
  subgraphToJSON(subgraph: GraphSubgraph): Promise<string>;

  /** Export graph in DOT format (for Graphviz) */
  toDOT(): Promise<string>;

  /** Export graph as Cypher (for Neo4j import) */
  toCypher(): Promise<string>;
}
