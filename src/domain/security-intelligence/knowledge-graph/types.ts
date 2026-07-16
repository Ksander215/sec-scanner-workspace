/** Knowledge Graph node types */
export type NodeType =
  | 'application' | 'host' | 'endpoint' | 'api' | 'technology'
  | 'finding' | 'evidence' | 'identity' | 'secret' | 'credential'
  | 'attack-step' | 'recommendation' | 'asset' | 'cloud-resource'
  | 'service' | 'container' | 'repository' | 'component';

/** Knowledge Graph edge types */
export type EdgeType =
  | 'USES' | 'OWNS' | 'CALLS' | 'DEPENDS_ON' | 'HOSTS'
  | 'CONNECTED_TO' | 'LEADS_TO' | 'DISCOVERED_BY' | 'EXPOSES'
  | 'AUTHENTICATES' | 'TRUSTS' | 'CONTAINS' | 'RELATED_TO' | 'MITIGATED_BY';

/** Node in the knowledge graph */
export interface KGNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, unknown>;
  createdAt: Date;
}

/** Edge in the knowledge graph */
export interface KGEdge {
  id: string;
  type: EdgeType;
  source: string; // node id
  target: string; // node id
  properties: Record<string, unknown>;
  weight: number;
  createdAt: Date;
}

/** Graph traversal result */
export interface TraversalResult {
  nodes: KGNode[];
  edges: KGEdge[];
  paths: string[][]; // arrays of node ids
}

/** Knowledge Graph statistics */
export interface KGStatistics {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<NodeType, number>;
  edgesByType: Record<EdgeType, number>;
  connectedComponents: number;
  density: number;
}

/** The complete knowledge graph */
export interface KnowledgeGraph {
  nodes: Map<string, KGNode>;
  edges: Map<string, KGEdge>;
  adjacency: Map<string, Set<string>>; // nodeId -> Set of connected nodeIds
}
