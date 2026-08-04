/**
 * Autonomous Architecture Runtime — Base Event Interface
 * TASK-AIS-012A.001
 */

import type { Timestamp, Identifier, EventClassification } from '../types/common.js';

export interface ArchitectureEvent {
  readonly eventId: Identifier;
  readonly eventType: string;
  readonly classification: EventClassification;
  readonly timestamp: Timestamp;
}
