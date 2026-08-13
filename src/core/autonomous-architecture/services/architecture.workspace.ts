/**
 * Autonomous Architecture Runtime — Architecture Workspace
 * TASK-AIS-012A.016
 *
 * Immutable container holding architectural service references.
 * No creation. No validation. No analysis. No state. No lifecycle.
 */

import { ArchitectureGraph } from '../architecture.graph.js';
import { ArchitectureGraphValidator } from '../architecture.graph-validator.js';
import { ArchitectureGraphAnalysis } from '../architecture.graph-analysis.js';

export class ArchitectureWorkspace {
  private readonly graph: ArchitectureGraph;
  private readonly validator: ArchitectureGraphValidator;
  private readonly analysis: ArchitectureGraphAnalysis;

  constructor(
    graph: ArchitectureGraph,
    validator: ArchitectureGraphValidator,
    analysis: ArchitectureGraphAnalysis,
  ) {
    this.graph = graph;
    this.validator = validator;
    this.analysis = analysis;
  }

  getGraph(): ArchitectureGraph {
    return this.graph;
  }

  getValidator(): ArchitectureGraphValidator {
    return this.validator;
  }

  getAnalysis(): ArchitectureGraphAnalysis {
    return this.analysis;
  }
}
