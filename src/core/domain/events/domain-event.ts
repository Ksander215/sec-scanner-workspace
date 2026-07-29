/**
 * Domain Event Base — DOM-002.000 §6, ADR-002 (Event Bus)
 * INV-012: No domain event without a classification.
 *
 * Every domain event carries:
 * - A unique eventId for deduplication
 * - A classification per ARC-001.001 §5.2
 * - A timestamp for auditability (AL-012)
 * - A sequence number for ordering (ADR-002)
 * - The aggregate that produced it (traceability)
 */

import type { Timestamp, Identifier } from '../../types/common.js';
import { EventClassification } from '../../types/common.js';

export interface DomainEventBase {
  /** Unique event identifier */
  readonly eventId: Identifier;
  /** Event type name (e.g. 'UserActionRecorded') */
  readonly eventType: string;
  /** Event classification (INV-012) */
  readonly classification: EventClassification;
  /** ISO-8601 timestamp */
  readonly timestamp: Timestamp;
  /** Monotonically increasing sequence number */
  readonly sequence: number;
  /** Aggregate that produced this event */
  readonly aggregateId: Identifier;
  /** Aggregate type name */
  readonly aggregateType: string;
  /** Schema version for evolution */
  readonly version: string;
}
