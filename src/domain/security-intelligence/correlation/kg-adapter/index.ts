/**
 * Security Intelligence Correlation Engine — Knowledge Graph Adapter
 *
 * Converts correlation results into Knowledge Graph nodes and edges
 * through the public API of the Knowledge Graph domain.
 *
 * This adapter bridges the Security Intelligence domain with the
 * Knowledge Graph domain WITHOUT modifying either core.
 *
 * Mappings:
 * - CorrelationGroup → GraphNode (type: CorrelationGroup)
 * - Correlation → GraphEdge (RELATED_TO, EXPOSES, LEADS_TO, etc.)
 * - Group → Finding → GraphEdge (CONTAINS)
 */

import type { Correlation, CorrelationGroup, CorrelationEdge as CorrEdge, CorrelationResult, CorrelationReason } from '../types/index.ts';
import { CorrelationReason as Reason } from '../types/index.ts';
import type { FindingId } from '../../normalization/types/index.ts';

// ─── Knowledge Graph Public API Types ────────────────────────
// These mirror the KG domain's public types. The KG domain defines
// the canonical versions; these are structural subtypes that are
// compatible with the KG's createGraphNode/createGraphEdge APIs.

interface KGNodeIdentity {
  readonly id: string;
  readonly type: string;
  readonly labels: readonly string[];
}

interface KGNodeMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly source: string;
  readonly confidence: number;
  readonly tags: readonly string[];
}

interface KGGraphNode {
  readonly identity: KGNodeIdentity;
  readonly metadata: KGNodeMetadata;
  readonly properties: Record<string, string | number | boolean | null>;
}

interface KGRelationship {
  readonly edgeType: string;
  readonly strength: number;
  readonly description: string;
}

interface KGGraphEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationship: KGRelationship;
  readonly properties: Record<string, string | number | boolean | null>;
  readonly createdAt: string;
}

// ─── Adapter Results ─────────────────────────────────────────

export interface KGAdapterResult {
  readonly nodes: readonly KGGraphNode[];
  readonly edges: readonly KGGraphEdge[];
  readonly statistics: KGAdapterStatistics;
}

export interface KGAdapterStatistics {
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly findingNodes: number;
  readonly groupNodes: number;
  readonly correlationEdges: number;
}

// ─── Reason → Edge Type Mapping ──────────────────────────────

/**
 * Maps correlation reasons to KG edge types.
 * Each reason maps to a semantically appropriate edge type.
 */
const REASON_TO_EDGE_TYPE: ReadonlyMap<CorrelationReason, string> = new Map([
  [Reason.SameCVE, 'EXPOSES'],
  [Reason.SameCWE, 'LEADS_TO'],
  [Reason.SameHost, 'HOSTS'],
  [Reason.SameEndpoint, 'EXPOSES'],
  [Reason.SameURL, 'EXPOSES'],
  [Reason.SameService, 'CONNECTED_TO'],
  [Reason.SameTechnology, 'DEPENDS_ON'],
  [Reason.SameCookie, 'RELATED_TO'],
  [Reason.SameHeader, 'RELATED_TO'],
  [Reason.SameSecret, 'EXPOSES'],
  [Reason.SameIdentity, 'AUTHENTICATES'],
  [Reason.SameCertificate, 'TRUSTS'],
  [Reason.SamePath, 'RELATED_TO'],
  [Reason.SharedEvidence, 'RELATED_TO'],
  [Reason.SharedRequest, 'CALLS'],
  [Reason.SharedResponse, 'RELATED_TO'],
  [Reason.SharedAuthentication, 'AUTHENTICATES'],
  [Reason.SharedComponent, 'DEPENDS_ON'],
]);

// ─── Correlation → Knowledge Graph Adapter ───────────────────

/**
 * Adapts correlation results for insertion into the Knowledge Graph.
 * Converts Correlation, CorrelationGroup, and CorrelationEdge models
 * into KG-compatible GraphNode and GraphEdge representations.
 */
export class CorrelationKGAdapter {
  private readonly _sourcePrefix: string;

  constructor(config: { readonly sourcePrefix?: string } = {}) {
    this._sourcePrefix = config.sourcePrefix ?? 'correlation-engine';
  }

  /**
   * Convert a CorrelationResult into KG nodes and edges.
   */
  adapt(result: CorrelationResult): KGAdapterResult {
    const nodes: KGGraphNode[] = [];
    const edges: KGGraphEdge[] = [];
    let groupNodes = 0;
    let correlationEdges = 0;

    // Collect all finding IDs referenced in correlations and groups
    const findingIdSet = new Set<string>();
    for (const corr of result.correlations) {
      findingIdSet.add(corr.sourceFindingId);
      findingIdSet.add(corr.targetFindingId);
    }
    for (const group of result.groups) {
      for (const fid of group.findingIds) {
        findingIdSet.add(fid);
      }
    }

    // Create finding nodes (using finding IDs as node references)
    const findingNodes = findingIdSet.size;
    for (const fid of findingIdSet) {
      nodes.push(this.findingToNode(fid));
    }

    // Convert correlation groups to group nodes
    for (const group of result.groups) {
      const groupNode = this.correlationGroupToNode(group);
      nodes.push(groupNode);
      groupNodes++;

      // Create CONTAINS edges from group to findings
      for (const findingId of group.findingIds) {
        edges.push(this.createEdge(
          `edge_grp_${group.id}::${findingId}`,
          group.id,
          findingId,
          'CONTAINS',
          group.correlationScore,
          `Group ${group.id} contains finding ${findingId}`,
        ));
        correlationEdges++;
      }
    }

    // Convert correlations to edges between finding nodes
    for (const correlation of result.correlations) {
      edges.push(this.correlationToEdge(correlation));
      correlationEdges++;
    }

    return Object.freeze({
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
      statistics: Object.freeze({
        totalNodes: nodes.length,
        totalEdges: edges.length,
        findingNodes,
        groupNodes,
        correlationEdges,
      }),
    });
  }

  /**
   * Convert a single correlation to a KG edge.
   */
  correlationToEdge(correlation: Correlation): KGGraphEdge {
    const edgeType = this.determineEdgeType(correlation);
    const description = this.buildEdgeDescription(correlation);

    return this.createEdge(
      `edge_corr_${correlation.id}`,
      correlation.sourceFindingId,
      correlation.targetFindingId,
      edgeType,
      correlation.score,
      description,
      {
        correlationId: correlation.id,
        reasons: correlation.reasons.join(','),
        duplicateType: correlation.duplicateType ?? '',
        score: correlation.score,
      },
    );
  }

  /**
   * Convert a finding ID to a KG node.
   */
  findingToNode(findingId: string): KGGraphNode {
    const now = new Date().toISOString();
    return Object.freeze({
      identity: Object.freeze({
        id: findingId,
        type: 'Finding',
        labels: Object.freeze(['Finding', 'SecurityFinding']),
      }),
      metadata: Object.freeze({
        createdAt: now,
        updatedAt: now,
        source: this._sourcePrefix,
        confidence: 0.5, // Default — actual confidence is in the finding data
        tags: Object.freeze([]),
      }),
      properties: Object.freeze({
        type: 'Finding',
        source: this._sourcePrefix,
      }),
    });
  }

  /**
   * Convert a correlation group to a KG node.
   * Uses 'CorrelationGroup' as the node type (NOT 'Asset').
   */
  correlationGroupToNode(group: CorrelationGroup): KGGraphNode {
    const now = new Date().toISOString();
    return Object.freeze({
      identity: Object.freeze({
        id: group.id,
        type: 'CorrelationGroup',
        labels: Object.freeze(['CorrelationGroup', group.dominantCategory, group.dominantSeverity]),
      }),
      metadata: Object.freeze({
        createdAt: group.createdAt ?? now,
        updatedAt: now,
        source: this._sourcePrefix,
        confidence: group.correlationScore,
        tags: Object.freeze([...group.reasons]),
      }),
      properties: Object.freeze({
        type: 'CorrelationGroup',
        dominantCategory: group.dominantCategory,
        dominantSeverity: group.dominantSeverity,
        correlationScore: group.correlationScore,
        findingCount: group.findingIds.length,
        representativeFindingId: group.representativeFindingId,
      }),
    });
  }

  // ─── Private Helpers ───────────────────────────────────

  private determineEdgeType(correlation: Correlation): string {
    if (correlation.duplicateType) return 'RELATED_TO';

    // Use the first reason to determine the primary edge type
    for (const reason of correlation.reasons) {
      const mapped = REASON_TO_EDGE_TYPE.get(reason);
      if (mapped) return mapped;
    }

    return 'RELATED_TO';
  }

  private buildEdgeDescription(correlation: Correlation): string {
    const reasonStr = correlation.reasons.join(', ');
    const dupStr = correlation.duplicateType ? ` [${correlation.duplicateType}]` : '';
    return `Correlated via ${reasonStr}${dupStr} (score: ${correlation.score.toFixed(2)})`;
  }

  private createEdge(
    id: string,
    sourceId: string,
    targetId: string,
    edgeType: string,
    strength: number,
    description: string,
    extraProps?: Record<string, string | number | boolean | null>,
  ): KGGraphEdge {
    const now = new Date().toISOString();
    return Object.freeze({
      id,
      sourceId,
      targetId,
      relationship: Object.freeze({
        edgeType,
        strength: Math.max(0, Math.min(1, strength)),
        description,
      }),
      properties: Object.freeze({
        source: this._sourcePrefix,
        createdAt: now,
        ...extraProps,
      }),
      createdAt: now,
    });
  }
}
