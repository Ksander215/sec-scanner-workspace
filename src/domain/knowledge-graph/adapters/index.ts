/**
 * Knowledge Graph Domain Adapters
 *
 * Adapter interfaces for integrating the Knowledge Graph domain
 * with external systems. Adapters follow the Ports & Adapters pattern:
 * the domain defines the port (interface), infrastructure provides the adapter.
 *
 * No implementations here — only type definitions.
 */

import type { GraphNode, GraphEdge } from '../models/index.ts';
import type { AnyGraphDomainEvent } from '../events/index.ts';

// ─── Finding Adapter ───────────────────────────────────────────

/**
 * Adapter for converting scan findings into Knowledge Graph nodes.
 * Bridges the Scan Platform domain with the Knowledge Graph domain.
 */
export interface FindingAdapter {
  /** Convert a scan finding to a GraphNode */
  findingToNode(finding: Record<string, unknown>): GraphNode;

  /** Convert a finding relationship to a GraphEdge */
  findingRelationshipToEdge(source: Record<string, unknown>, target: Record<string, unknown>, edgeType: string): GraphEdge;
}

// ─── Event Publisher ───────────────────────────────────────────

/**
 * Adapter for publishing domain events to external systems.
 * Enables event-driven integration without coupling.
 */
export interface EventPublisher {
  /** Publish a domain event */
  publish(event: AnyGraphDomainEvent): Promise<void>;

  /** Publish multiple events atomically */
  publishAll(events: readonly AnyGraphDomainEvent[]): Promise<void>;
}
