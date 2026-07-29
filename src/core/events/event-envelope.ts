/**
 * Event Envelope — wraps domain events with metadata.
 * ADR-002: versioned, classified, sequenced.
 */
import { EventClassification } from '../types/common.js';

export interface EventEnvelope {
  readonly eventId: string;
  readonly eventType: string;
  readonly classification: EventClassification;
  readonly timestamp: string;
  readonly sequence: number;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly payload: unknown;
  readonly version: string;
}
