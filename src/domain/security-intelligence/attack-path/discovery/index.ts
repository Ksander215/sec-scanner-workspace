/**
 * Security Intelligence Attack Path Builder — Path Discovery
 *
 * Uses the existing GraphTraversalEngine to discover attack paths.
 * Does NOT implement custom graph traversal algorithms — all
 * traversal is delegated to the Knowledge Graph's traversal engine.
 *
 * Supported strategies:
 * - BFS: Level-by-level exploration
 * - DFS: Deep exploration before backtracking
 * - ShortestPath: Minimal hop count path
 * - MultiPath: K-shortest paths discovery
 * - Reachability: All reachable nodes from a source
 */

import type { NodeId, EdgeId } from '../../../knowledge-graph/types/index.ts';
import type { GraphNode, GraphEdge, GraphTraversal } from '../../../knowledge-graph/models/index.ts';
import type { GraphTraversalEngineImpl } from '../../../knowledge-graph/traversal/engine/index.ts';
import type {
  AttackNode, AttackEdge, AttackStep, AttackObjective,
  DiscoveryStrategy, DiscoveryConstraints, AttackNodeType, AttackEdgeType,
  AttackObjectiveType,
} from '../types/index.ts';
import {
  AttackNodeType as ANType, AttackEdgeType as AEType, AttackObjectiveType as AOT,
  DiscoveryStrategy as DS,
} from '../types/index.ts';
import type {
  AttackNodeInput, AttackEdgeInput, AttackStepInput,
} from '../models/index.ts';
import {
  createAttackNode, createAttackEdge, createAttackStep, createAttackObjective,
} from '../models/index.ts';
import type { RiskLevel } from '../../risk/types/index.ts';
import { RiskLevel as RLvl } from '../../risk/types/index.ts';
import type { NodeType, EdgeType } from '../../../knowledge-graph/types/index.ts';

// ─── Discovery Result ────────────────────────────────────────

/** Result of path discovery before ranking */
export interface DiscoveryResult {
  readonly paths: readonly DiscoveredPath[];
  readonly totalDiscovered: number;
  readonly durationMs: number;
  readonly strategy: DiscoveryStrategy;
  readonly constraints: DiscoveryConstraints;
}

/** A discovered path (before conversion to AttackPath) */
export interface DiscoveredPath {
  readonly nodes: readonly AttackNode[];
  readonly edges: readonly AttackEdge[];
  readonly steps: readonly AttackStep[];
  readonly objective: AttackObjective;
  readonly strategy: DiscoveryStrategy;
  readonly discoveryDurationMs: number;
}

// ─── Knowledge Graph Adapter ─────────────────────────────────

/**
 * Adapter that translates Knowledge Graph nodes and edges
 * into Attack Graph nodes and edges.
 *
 * Maps KG NodeType → AttackNodeType
 * Maps KG EdgeType → AttackEdgeType
 * Resolves risk from RiskAssessments
 */
export class KnowledgeGraphAdapter {
  private readonly _riskScores: Map<NodeId, { score: number; level: RiskLevel }>;
  private readonly _findingMap: Map<NodeId, readonly import('../../normalization/types/index.ts').FindingId[]>;
  private readonly _assetMap: Map<NodeId, import('../../normalization/types/index.ts').AssetId | null>;
  private readonly _entryPointIds: ReadonlySet<NodeId>;
  private readonly _objectiveIds: ReadonlySet<NodeId>;

  constructor(config: {
    readonly riskScores?: ReadonlyMap<NodeId, { readonly score: number; readonly level: RiskLevel }>;
    readonly findingMap?: ReadonlyMap<NodeId, readonly import('../../normalization/types/index.ts').FindingId[]>;
    readonly assetMap?: ReadonlyMap<NodeId, import('../../normalization/types/index.ts').AssetId | null>;
    readonly entryPointIds?: ReadonlySet<NodeId>;
    readonly objectiveIds?: ReadonlySet<NodeId>;
  } = {}) {
    this._riskScores = new Map(config.riskScores ?? []);
    this._findingMap = new Map(config.findingMap ?? []);
    this._assetMap = new Map(config.assetMap ?? []);
    this._entryPointIds = config.entryPointIds ?? new Set();
    this._objectiveIds = config.objectiveIds ?? new Set();
  }

  /** Convert a KG GraphNode to an AttackNode */
  toAttackNode(node: GraphNode): AttackNode {
    const nodeType = this.mapNodeType(node.identity.type);
    const risk = this._riskScores.get(node.identity.id) ?? { score: 0.5, level: RLvl.Medium };
    const isEntryPoint = this._entryPointIds.has(node.identity.id);
    const isObjective = this._objectiveIds.has(node.identity.id);

    const input: AttackNodeInput = {
      graphNodeId: node.identity.id,
      nodeType,
      label: node.identity.labels[0] ?? node.identity.id,
      riskScore: risk.score,
      riskLevel: risk.level,
      findingIds: this._findingMap.get(node.identity.id) ?? [],
      assetId: this._assetMap.get(node.identity.id) ?? null,
      isEntryPoint,
      isObjective,
      metadata: { ...node.properties } as Record<string, string | number | boolean | null>,
    };

    return createAttackNode(input);
  }

  /** Convert a KG GraphEdge to an AttackEdge */
  toAttackEdge(edge: GraphEdge, sourceNodeId: import('../types/index.ts').AttackNodeId, targetNodeId: import('../types/index.ts').AttackNodeId): AttackEdge {
    const edgeType = this.mapEdgeType(edge.relationship.edgeType);
    const riskContribution = this.computeEdgeRisk(edge);

    const input: AttackEdgeInput = {
      sourceNodeId,
      targetNodeId,
      graphEdgeId: edge.id,
      edgeType,
      probability: edge.relationship.strength,
      riskContribution,
      requiresAuthentication: this.edgeRequiresAuth(edge),
      requiresPrivilege: this.edgeRequiresPrivilege(edge),
      isLateralMovement: this.isLateralMovement(edge),
      isPrivilegeEscalation: this.isPrivilegeEscalation(edge),
      metadata: { ...edge.properties } as Record<string, string | number | boolean | null>,
    };

    return createAttackEdge(input);
  }

  /** Map KG NodeType to AttackNodeType */
  private mapNodeType(type: NodeType): AttackNodeType {
    const mapping: Partial<Record<NodeType, AttackNodeType>> = {
      Application: ANType.Application,
      Host: ANType.Infrastructure,
      Endpoint: ANType.Asset,
      API: ANType.Service,
      Finding: ANType.Vulnerability,
      Identity: ANType.Credential,
      Credential: ANType.Credential,
      Secret: ANType.Credential,
      Service: ANType.Service,
      Asset: ANType.Asset,
      CloudResource: ANType.Infrastructure,
      Container: ANType.Infrastructure,
    };
    return mapping[type] ?? ANType.Asset;
  }

  /** Map KG EdgeType to AttackEdgeType */
  private mapEdgeType(type: EdgeType): AttackEdgeType {
    const mapping: Partial<Record<EdgeType, AttackEdgeType>> = {
      EXPOSES: AEType.Exploitation,
      LEADS_TO: AEType.Exploitation,
      AUTHENTICATES: AEType.CredentialUse,
      TRUSTS: AEType.TrustRelationship,
      DEPENDS_ON: AEType.Dependency,
      CONNECTED_TO: AEType.LateralMovement,
      USES: AEType.Dependency,
      CALLS: AEType.Dependency,
    };
    return mapping[type] ?? AEType.Dependency;
  }

  /** Compute edge risk contribution deterministically */
  private computeEdgeRisk(edge: GraphEdge): number {
    const strength = edge.relationship.strength;
    const baseRisk = 0.5;
    return Math.max(0, Math.min(1, baseRisk * strength));
  }

  /** Check if an edge requires authentication */
  private edgeRequiresAuth(edge: GraphEdge): boolean {
    return edge.relationship.edgeType === 'AUTHENTICATES' ||
           edge.properties?.requiresAuth === true;
  }

  /** Check if an edge requires privilege */
  private edgeRequiresPrivilege(edge: GraphEdge): boolean {
    return edge.properties?.requiresPrivilege === true;
  }

  /** Check if an edge represents lateral movement */
  private isLateralMovement(edge: GraphEdge): boolean {
    return edge.relationship.edgeType === 'CONNECTED_TO' ||
           edge.relationship.edgeType === 'CALLS';
  }

  /** Check if an edge represents privilege escalation */
  private isPrivilegeEscalation(edge: GraphEdge): boolean {
    return edge.properties?.privilegeEscalation === true;
  }
}

// ─── Path Discovery Engine ───────────────────────────────────

/**
 * Discovers attack paths by delegating to the Knowledge Graph's
 * GraphTraversalEngine. Does NOT implement custom traversal algorithms.
 *
 * All traversal is performed via:
 * - bfs() for BFS strategy
 * - dfs() for DFS strategy
 * - shortestPath() for ShortestPath strategy
 * - findPaths() for MultiPath strategy
 * - reachableNodes() for Reachability strategy
 */
export class PathDiscoveryEngine {
  private readonly _traversalEngine: GraphTraversalEngineImpl;
  private readonly _kgAdapter: KnowledgeGraphAdapter;

  constructor(
    traversalEngine: GraphTraversalEngineImpl,
    kgAdapter: KnowledgeGraphAdapter,
  ) {
    this._traversalEngine = traversalEngine;
    this._kgAdapter = kgAdapter;
  }

  /**
   * Discover attack paths from a source node to a target objective.
   *
   * Uses the Knowledge Graph's TraversalEngine for all graph operations.
   * Forbidden nodes and edges are excluded via edge/node filters.
   */
  async discover(
    sourceId: NodeId,
    targetIds: readonly NodeId[],
    objective: AttackObjective,
    strategy: DiscoveryStrategy,
    constraints: DiscoveryConstraints,
  ): Promise<DiscoveryResult> {
    const startTime = performance.now();

    try {
      // Build filter predicates from constraints
      const forbiddenNodes = new Set(constraints.forbiddenNodeIds);
      const forbiddenEdges = new Set(constraints.forbiddenEdgeIds);

      const nodeFilter = (node: GraphNode) => !forbiddenNodes.has(node.identity.id);
      const edgeFilter = (edge: GraphEdge) => !forbiddenEdges.has(edge.id);

      const options = {
        maxDepth: constraints.maximumDepth,
        nodeFilter,
        edgeFilter,
        collectPaths: true,
        timeout: constraints.timeoutMs,
      };

      let discoveredPaths: DiscoveredPath[] = [];

      switch (strategy) {
        case DS.BFS:
          discoveredPaths = await this.discoverBFS(sourceId, targetIds, objective, options);
          break;
        case DS.DFS:
          discoveredPaths = await this.discoverDFS(sourceId, targetIds, objective, options);
          break;
        case DS.ShortestPath:
          discoveredPaths = await this.discoverShortestPath(sourceId, targetIds, objective, options);
          break;
        case DS.MultiPath:
          discoveredPaths = await this.discoverMultiPath(sourceId, targetIds, objective, constraints, options);
          break;
        case DS.Reachability:
          discoveredPaths = await this.discoverReachability(sourceId, targetIds, objective, options);
          break;
      }

      // Apply maximum paths constraint
      if (discoveredPaths.length > constraints.maximumPaths) {
        discoveredPaths = discoveredPaths.slice(0, constraints.maximumPaths);
      }

      const durationMs = performance.now() - startTime;

      return Object.freeze({
        paths: Object.freeze(discoveredPaths),
        totalDiscovered: discoveredPaths.length,
        durationMs,
        strategy,
        constraints,
      });
    } catch {
      const durationMs = performance.now() - startTime;
      return Object.freeze({
        paths: [],
        totalDiscovered: 0,
        durationMs,
        strategy,
        constraints,
      });
    }
  }

  // ─── BFS Discovery ──────────────────────────────────────

  private async discoverBFS(
    sourceId: NodeId,
    targetIds: readonly NodeId[],
    objective: AttackObjective,
    options: Record<string, unknown>,
  ): Promise<DiscoveredPath[]> {
    const result = await this._traversalEngine.bfs(sourceId, options as any);
    return this.convertTraversalResult(result, sourceId, targetIds, objective, DS.BFS);
  }

  // ─── DFS Discovery ──────────────────────────────────────

  private async discoverDFS(
    sourceId: NodeId,
    targetIds: readonly NodeId[],
    objective: AttackObjective,
    options: Record<string, unknown>,
  ): Promise<DiscoveredPath[]> {
    const result = await this._traversalEngine.dfs(sourceId, options as any);
    return this.convertTraversalResult(result, sourceId, targetIds, objective, DS.DFS);
  }

  // ─── Shortest Path Discovery ────────────────────────────

  private async discoverShortestPath(
    sourceId: NodeId,
    targetIds: readonly NodeId[],
    objective: AttackObjective,
    options: Record<string, unknown>,
  ): Promise<DiscoveredPath[]> {
    const paths: DiscoveredPath[] = [];

    for (const targetId of targetIds) {
      const result = await this._traversalEngine.shortestPath(sourceId, targetId, options as any);
      if (result.found && result.path) {
        const path = this.convertPathResult(result.path, objective, DS.ShortestPath);
        if (path) paths.push(path);
      }
    }

    return paths;
  }

  // ─── Multi Path Discovery ───────────────────────────────

  private async discoverMultiPath(
    sourceId: NodeId,
    targetIds: readonly NodeId[],
    objective: AttackObjective,
    constraints: DiscoveryConstraints,
    options: Record<string, unknown>,
  ): Promise<DiscoveredPath[]> {
    const paths: DiscoveredPath[] = [];

    for (const targetId of targetIds) {
      const result = await this._traversalEngine.findPaths(sourceId, targetId, {
        ...options as any,
        maxPaths: constraints.maximumPaths,
      });

      if (result.found && result.path) {
        const primaryPath = this.convertPathResult(result.path, objective, DS.MultiPath);
        if (primaryPath) paths.push(primaryPath);
      }

      for (const alt of result.alternatives) {
        const altPath = this.convertPathResult(alt, objective, DS.MultiPath);
        if (altPath) paths.push(altPath);
      }

      if (paths.length >= constraints.maximumPaths) break;
    }

    return paths;
  }

  // ─── Reachability Discovery ─────────────────────────────

  private async discoverReachability(
    sourceId: NodeId,
    targetIds: readonly NodeId[],
    objective: AttackObjective,
    options: Record<string, unknown>,
  ): Promise<DiscoveredPath[]> {
    const result = await this._traversalEngine.reachableNodes(sourceId, options as any);
    return this.convertTraversalResult(result, sourceId, targetIds, objective, DS.Reachability);
  }

  // ─── Conversion Helpers ─────────────────────────────────

  /** Convert a TraversalResult (BFS/DFS/Reachability) to DiscoveredPaths */
  private convertTraversalResult(
    result: import('../../../knowledge-graph/traversal/types/index.ts').TraversalResult,
    sourceId: NodeId,
    targetIds: readonly NodeId[],
    objective: AttackObjective,
    strategy: DiscoveryStrategy,
  ): DiscoveredPath[] {
    const targetSet = new Set(targetIds);

    // Convert all visited nodes to attack nodes
    const attackNodes = result.visitedNodes.map(n => this._kgAdapter.toAttackNode(n));
    const nodeById = new Map(attackNodes.map(n => [n.graphNodeId, n]));

    // Convert all visited edges to attack edges
    const attackEdges = result.visitedEdges.map(e => {
      const sourceAttackNode = nodeById.get(e.sourceId);
      const targetAttackNode = nodeById.get(e.targetId);
      if (!sourceAttackNode || !targetAttackNode) return null;
      return this._kgAdapter.toAttackEdge(e, sourceAttackNode.id, targetAttackNode.id);
    }).filter((e): e is AttackEdge => e !== null);

    // If there are explicit paths, convert each
    if (result.paths.length > 0) {
      return result.paths
        .filter(p => p.nodes.length > 0 && p.nodes.some(n => targetSet.has(n.identity.id)))
        .map(path => this.convertPathToDiscoveredPath(path, objective, strategy, result.duration))
        .filter((p): p is DiscoveredPath => p !== null);
    }

    // Otherwise, build a single path from all visited nodes
    if (attackNodes.length > 0) {
      const steps = this.buildStepsFromNodes(attackNodes, attackEdges, objective.type);
      if (steps.length > 0) {
        return [Object.freeze({
          nodes: attackNodes,
          edges: attackEdges,
          steps,
          objective,
          strategy,
          discoveryDurationMs: result.duration,
        })];
      }
    }

    return [];
  }

  /** Convert a single PathResult (TraversalPath) to a DiscoveredPath */
  private convertPathResult(
    path: import('../../../knowledge-graph/traversal/types/index.ts').TraversalPath,
    objective: AttackObjective,
    strategy: DiscoveryStrategy,
  ): DiscoveredPath | null {
    if (path.nodes.length === 0) return null;

    const attackNodes = path.nodes.map(n => this._kgAdapter.toAttackNode(n));
    const attackEdges: AttackEdge[] = [];

    for (let i = 0; i < path.edges.length; i++) {
      const edge = path.edges[i];
      const source = attackNodes[i];
      const target = attackNodes[i + 1];
      if (source && target) {
        attackEdges.push(this._kgAdapter.toAttackEdge(edge, source.id, target.id));
      }
    }

    const steps = this.buildStepsFromNodes(attackNodes, attackEdges, objective.type);

    return Object.freeze({
      nodes: Object.freeze(attackNodes),
      edges: Object.freeze(attackEdges),
      steps: Object.freeze(steps),
      objective,
      strategy,
      discoveryDurationMs: 0, // will be set by caller
    });
  }

  /** Convert a TraversalPath to a DiscoveredPath */
  private convertPathToDiscoveredPath(
    path: import('../../../knowledge-graph/traversal/types/index.ts').TraversalPath,
    objective: AttackObjective,
    strategy: DiscoveryStrategy,
    durationMs: number,
  ): DiscoveredPath | null {
    const result = this.convertPathResult(path, objective, strategy);
    if (!result) return null;
    return Object.freeze({ ...result, discoveryDurationMs: durationMs });
  }

  /** Build AttackSteps from a sequence of nodes and edges */
  private buildStepsFromNodes(
    nodes: readonly AttackNode[],
    edges: readonly AttackEdge[],
    objectiveType: AttackObjectiveType,
  ): AttackStep[] {
    const steps: AttackStep[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const incomingEdge = i > 0 ? this.findEdgeTo(edges, node.id) : null;
      const outgoingEdges = this.findEdgesFrom(edges, node.id);

      // Determine if this step is critical (high-risk, authentication required, etc.)
      const isCritical = node.riskScore >= 0.7 ||
        (incomingEdge?.requiresAuthentication ?? false) ||
        (incomingEdge?.isPrivilegeEscalation ?? false);

      // Determine if this step is a detection point
      const isDetectionPoint = node.nodeType === ANType.Vulnerability ||
        (incomingEdge?.requiresAuthentication ?? false);

      // Determine objective for this step
      const stepObjective = i === nodes.length - 1 ? objectiveType : null;

      const stepInput: AttackStepInput = {
        node,
        incomingEdge,
        outgoingEdges,
        stepIndex: i,
        objective: stepObjective,
        isCritical,
        isDetectionPoint,
      };

      steps.push(createAttackStep(stepInput));
    }

    return steps;
  }

  /** Find edges originating from a node */
  private findEdgesFrom(edges: readonly AttackEdge[], nodeId: import('../types/index.ts').AttackNodeId): AttackEdge[] {
    return edges.filter(e => e.sourceNodeId === nodeId);
  }

  /** Find edges leading to a node */
  private findEdgeTo(edges: readonly AttackEdge[], nodeId: import('../types/index.ts').AttackNodeId): AttackEdge | null {
    return edges.find(e => e.targetNodeId === nodeId) ?? null;
  }
}
