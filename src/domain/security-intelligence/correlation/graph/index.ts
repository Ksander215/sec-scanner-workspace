/**
 * Security Intelligence Correlation Engine — Correlation Graph
 *
 * Internal graph structure for storing correlations between findings.
 * Nodes = Findings, Edges = CorrelationEdges with weights and reasons.
 *
 * Supports:
 * - Adding findings as nodes
 * - Adding correlation edges between findings
 * - Building correlation groups via connected components
 * - Querying the graph for correlations
 */

import type { FindingId } from '../../normalization/types/index.ts';
import { Severity as Sev, FindingCategory as Cat, SEVERITY_ORDER } from '../../normalization/types/index.ts';
import type {
  CorrelationEdge, CorrelationGroup, CorrelationReason, CorrelationEvidence,
} from '../types/index.ts';
import { CorrelationReason as Reason, CorrelationEdgeId } from '../types/index.ts';
import {
  createCorrelationEdge, createCorrelationGroup, generateCorrelationEdgeId,
} from '../models/index.ts';
import type { CorrelationFindingInput } from '../types/index.ts';

// ─── Graph Node ──────────────────────────────────────────────

interface CorrelationGraphNode {
  readonly findingId: FindingId;
  readonly finding: CorrelationFindingInput;
  readonly edges: Map<string, CorrelationEdge>;
}

// ─── Correlation Graph ───────────────────────────────────────

export interface CorrelationGraphSnapshot {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly groupCount: number;
  readonly averageDegree: number;
  readonly density: number;
}

/**
 * Internal correlation graph that stores findings as nodes
 * and correlations as weighted, typed edges.
 */
export class CorrelationGraph {
  private readonly _nodes: Map<string, CorrelationGraphNode> = new Map();
  private readonly _edgeIndex: Map<string, CorrelationEdge> = new Map();
  private readonly _adjacency: Map<string, Set<string>> = new Map();

  /** Add a finding as a node in the graph */
  addNode(finding: CorrelationFindingInput): void {
    const key = finding.id;
    if (!this._nodes.has(key)) {
      this._nodes.set(key, {
        findingId: finding.id,
        finding,
        edges: new Map(),
      });
      this._adjacency.set(key, new Set());
    }
  }

  /** Add a correlation edge between two findings */
  addEdge(
    sourceId: FindingId,
    targetId: FindingId,
    reasons: readonly CorrelationReason[],
    score: number,
    evidence: readonly CorrelationEvidence[],
  ): CorrelationEdge | null {
    if (!this._nodes.has(sourceId) || !this._nodes.has(targetId)) return null;
    if (sourceId === targetId) return null; // No self-loops

    // Check for existing edge
    const edgeKey = this.computeEdgeKey(sourceId, targetId);
    const existingEdge = this._edgeIndex.get(edgeKey);
    if (existingEdge) {
      // Merge: keep the higher score, combine reasons and evidence
      const mergedReasons = new Set([...existingEdge.reasons, ...reasons]);
      const mergedEvidence = [...existingEdge.evidence, ...evidence];
      const mergedScore = Math.max(existingEdge.score, score);
      const mergedEdge = createCorrelationEdge({
        sourceFindingId: sourceId,
        targetFindingId: targetId,
        reasons: [...mergedReasons],
        score: mergedScore,
        evidence: mergedEvidence,
      });
      this._edgeIndex.set(edgeKey, mergedEdge);

      // Update node edge references
      const sourceNode = this._nodes.get(sourceId)!;
      const targetNode = this._nodes.get(targetId)!;
      sourceNode.edges.set(edgeKey, mergedEdge);
      targetNode.edges.set(edgeKey, mergedEdge);

      return mergedEdge;
    }

    const edge = createCorrelationEdge({
      sourceFindingId: sourceId,
      targetFindingId: targetId,
      reasons,
      score,
      evidence,
    });

    this._edgeIndex.set(edgeKey, edge);

    // Update adjacency
    this._adjacency.get(sourceId)!.add(targetId);
    this._adjacency.get(targetId)!.add(sourceId);

    // Update node edge references
    this._nodes.get(sourceId)!.edges.set(edgeKey, edge);
    this._nodes.get(targetId)!.edges.set(edgeKey, edge);

    return edge;
  }

  /** Get a node by finding ID */
  getNode(findingId: FindingId): CorrelationFindingInput | null {
    return this._nodes.get(findingId)?.finding ?? null;
  }

  /** Get all edges for a finding */
  getEdges(findingId: FindingId): readonly CorrelationEdge[] {
    const node = this._nodes.get(findingId);
    if (!node) return [];
    return [...node.edges.values()];
  }

  /** Get all edges in the graph */
  getAllEdges(): readonly CorrelationEdge[] {
    return [...this._edgeIndex.values()];
  }

  /** Get all nodes (findings) in the graph */
  getAllNodes(): readonly CorrelationFindingInput[] {
    return [...this._nodes.values()].map(n => n.finding);
  }

  /** Get the number of nodes */
  get nodeCount(): number {
    return this._nodes.size;
  }

  /** Get the number of edges */
  get edgeCount(): number {
    return this._edgeIndex.size;
  }

  /** Check if a node exists */
  hasNode(findingId: FindingId): boolean {
    return this._nodes.has(findingId);
  }

  /** Check if an edge exists between two nodes */
  hasEdge(sourceId: FindingId, targetId: FindingId): boolean {
    return this._edgeIndex.has(this.computeEdgeKey(sourceId, targetId));
  }

  /** Get neighbors of a node */
  getNeighbors(findingId: FindingId): readonly FindingId[] {
    const neighbors = this._adjacency.get(findingId);
    if (!neighbors) return [];
    return [...neighbors] as FindingId[];
  }

  /**
   * Build correlation groups using connected components.
   * Groups are formed by finding connected subgraphs where
   * edge scores exceed the minimum threshold.
   */
  buildGroups(minScore: number = 0.3, maxGroupSize: number = 100): CorrelationGroup[] {
    const visited = new Set<string>();
    const groups: CorrelationGroup[] = [];

    for (const [nodeId] of this._nodes) {
      if (visited.has(nodeId)) continue;

      // BFS to find connected component
      const component = this.bfsConnectedComponent(nodeId, minScore, visited);
      if (component.length < 2) continue; // No group for singletons

      // Split into sub-groups if too large
      const subGroups = this.splitIntoSubGroups(component, maxGroupSize);

      for (const subGroup of subGroups) {
        const group = this.createGroupFromComponent(subGroup);
        if (group) groups.push(group);
      }
    }

    return groups;
  }

  /** Get graph statistics */
  getSnapshot(): CorrelationGraphSnapshot {
    const nodeCount = this._nodes.size;
    const edgeCount = this._edgeIndex.size;
    const totalDegree = [...this._adjacency.values()].reduce((sum, neighbors) => sum + neighbors.size, 0);
    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    const maxEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

    // Estimate group count
    const groups = this.buildGroups(0.3);

    return Object.freeze({
      nodeCount,
      edgeCount,
      groupCount: groups.length,
      averageDegree: Math.round(averageDegree * 1000) / 1000,
      density: Math.round(density * 10000) / 10000,
    });
  }

  /** Remove all nodes and edges */
  clear(): void {
    this._nodes.clear();
    this._edgeIndex.clear();
    this._adjacency.clear();
  }

  // ─── Private Helpers ───────────────────────────────────

  private computeEdgeKey(sourceId: FindingId, targetId: FindingId): string {
    // Deterministic key regardless of direction
    return sourceId < targetId ? `${sourceId}::${targetId}` : `${targetId}::${sourceId}`;
  }

  private bfsConnectedComponent(
    startId: string,
    minScore: number,
    visited: Set<string>,
  ): FindingId[] {
    const component: FindingId[] = [];
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      component.push(currentId as FindingId);

      const neighbors = this._adjacency.get(currentId);
      if (!neighbors) continue;

      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;

        // Check edge score
        const edgeKey = this.computeEdgeKey(currentId as FindingId, neighborId as FindingId);
        const edge = this._edgeIndex.get(edgeKey);
        if (edge && edge.score >= minScore) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    return component;
  }

  private splitIntoSubGroups(component: FindingId[], maxSize: number): FindingId[][] {
    if (component.length <= maxSize) return [component];

    const subGroups: FindingId[][] = [];
    for (let i = 0; i < component.length; i += maxSize) {
      subGroups.push(component.slice(i, i + maxSize));
    }
    return subGroups;
  }

  private createGroupFromComponent(component: FindingId[]): CorrelationGroup | null {
    if (component.length === 0) return null;

    const findings = component
      .map(id => this._nodes.get(id)?.finding)
      .filter((f): f is CorrelationFindingInput => f !== undefined);

    if (findings.length === 0) return null;

    // Determine dominant severity (highest)
    const dominantSeverity = findings.reduce((max, f) =>
      SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[max] ? f.severity : max,
      findings[0].severity,
    );

    // Determine dominant category (most frequent)
    const categoryCounts = new Map<string, number>();
    for (const f of findings) {
      categoryCounts.set(f.category, (categoryCounts.get(f.category) ?? 0) + 1);
    }
    let dominantCategory = findings[0].category;
    let maxCount = 0;
    for (const [cat, count] of categoryCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantCategory = cat as any;
      }
    }

    // Representative finding = highest severity
    const representative = findings.reduce((rep, f) =>
      SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[rep.severity] ? f : rep,
      findings[0],
    );

    // Collect all reasons and compute max score
    const allReasons = new Set<CorrelationReason>();
    let maxScore = 0;
    for (const findingId of component) {
      const edges = this.getEdges(findingId);
      for (const edge of edges) {
        for (const reason of edge.reasons) allReasons.add(reason);
        maxScore = Math.max(maxScore, edge.score);
      }
    }

    return createCorrelationGroup({
      findingIds: component,
      dominantCategory: dominantCategory as any,
      dominantSeverity,
      correlationScore: maxScore,
      reasons: [...allReasons],
      representativeFindingId: representative.id,
    });
  }
}
