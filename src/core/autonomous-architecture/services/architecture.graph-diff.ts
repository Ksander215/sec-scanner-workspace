/**
 * Autonomous Architecture Runtime — Architecture Graph Diff Foundation
 * TASK-AIS-012A.011
 *
 * Structural comparison between two ArchitectureGraphSnapshot instances.
 * No algorithms. No traversal. No analysis. No persistence.
 */

import type { ArchitectureNode, ArchitectureEdge } from '../architecture.model.js';
import { ArchitectureGraphSnapshot } from './architecture.graph-snapshot.js';

export interface ArchitectureGraphDiffResult {
  readonly addedNodes: readonly ArchitectureNode[];
  readonly removedNodes: readonly ArchitectureNode[];
  readonly addedEdges: readonly ArchitectureEdge[];
  readonly removedEdges: readonly ArchitectureEdge[];
}

export class ArchitectureGraphDiff {
  private readonly before: ArchitectureGraphSnapshot;
  private readonly after: ArchitectureGraphSnapshot;

  constructor(before: ArchitectureGraphSnapshot, after: ArchitectureGraphSnapshot) {
    this.before = before;
    this.after = after;
  }

  getResult(): ArchitectureGraphDiffResult {
    const beforeGraph = this.before.getGraph();
    const afterGraph = this.after.getGraph();

    const beforeNodes = beforeGraph.nodes;
    const afterNodes = afterGraph.nodes;
    const beforeEdges = beforeGraph.edges;
    const afterEdges = afterGraph.edges;

    const addedNodes = afterNodes.filter(
      (n) => !beforeNodes.some((bn) => bn.id === n.id)
    );

    const removedNodes = beforeNodes.filter(
      (n) => !afterNodes.some((an) => an.id === n.id)
    );

    const addedEdges = afterEdges.filter(
      (e) => !beforeEdges.some((be) => be.id === e.id)
    );

    const removedEdges = beforeEdges.filter(
      (e) => !afterEdges.some((ae) => ae.id === e.id)
    );

    return Object.freeze({
      addedNodes: Object.freeze([...addedNodes]),
      removedNodes: Object.freeze([...removedNodes]),
      addedEdges: Object.freeze([...addedEdges]),
      removedEdges: Object.freeze([...removedEdges]),
    });
  }
}
