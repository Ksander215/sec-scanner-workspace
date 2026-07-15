/**
 * Knowledge Graph Domain Errors
 *
 * Error hierarchy for the Knowledge Graph domain layer.
 * Follows the same pattern as scan-platform errors: abstract base class
 * with concrete domain-specific error classes.
 *
 * Each error carries:
 * - message: human-readable description
 * - code: machine-readable uppercase snake_case
 * - details: optional structured context
 */

// ─── Base Error ────────────────────────────────────────────────

/**
 * Abstract base class for all Knowledge Graph domain errors.
 * Extends the native Error class with structured error information.
 */
export abstract class GraphError extends Error {
  abstract readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }

  /** Serialize error to a plain object for logging/transport */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// ─── Node Errors ───────────────────────────────────────────────

/** Thrown when attempting to create or register a node with an ID that already exists */
export class DuplicateNodeError extends GraphError {
  readonly code = 'DUPLICATE_NODE';

  constructor(nodeId: string, details?: Record<string, unknown>) {
    super(`Node with id '${nodeId}' already exists`, { nodeId, ...details });
  }
}

/** Thrown when node validation fails */
export class NodeValidationError extends GraphError {
  readonly code = 'NODE_VALIDATION_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

// ─── Edge Errors ───────────────────────────────────────────────

/** Thrown when attempting to create or register an edge with an ID that already exists */
export class DuplicateEdgeError extends GraphError {
  readonly code = 'DUPLICATE_EDGE';

  constructor(edgeId: string, details?: Record<string, unknown>) {
    super(`Edge with id '${edgeId}' already exists`, { edgeId, ...details });
  }
}

/** Thrown when edge validation fails */
export class EdgeValidationError extends GraphError {
  readonly code = 'EDGE_VALIDATION_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

// ─── Relationship Errors ───────────────────────────────────────

/** Thrown when an invalid relationship (edge type) is used between node types */
export class InvalidRelationshipError extends GraphError {
  readonly code = 'INVALID_RELATIONSHIP';

  constructor(
    sourceType: string,
    edgeType: string,
    targetType: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Invalid relationship: ${sourceType} -[${edgeType}]-> ${targetType}`,
      { sourceType, edgeType, targetType, ...details },
    );
  }
}

// ─── Graph Validation Errors ───────────────────────────────────

/** Thrown when overall graph validation fails (broken invariants, cycles, etc.) */
export class GraphValidationError extends GraphError {
  readonly code = 'GRAPH_VALIDATION_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

// ─── Snapshot Errors ───────────────────────────────────────────

/** Thrown when snapshot operations fail */
export class SnapshotError extends GraphError {
  readonly code = 'SNAPSHOT_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

// ─── Self-Reference Error ──────────────────────────────────────

/** Thrown when an edge references the same node as both source and target */
export class SelfReferenceError extends GraphError {
  readonly code = 'SELF_REFERENCE';

  constructor(nodeId: string, edgeType: string, details?: Record<string, unknown>) {
    super(
      `Self-referencing edge not allowed: node '${nodeId}' -[${edgeType}]-> itself`,
      { nodeId, edgeType, ...details },
    );
  }
}

// ─── Transaction Error ─────────────────────────────────────────

/** Thrown when transaction operations fail */
export class TransactionError extends GraphError {
  readonly code = 'TRANSACTION_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}
