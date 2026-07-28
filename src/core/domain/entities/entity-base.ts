/**
 * Base Entity interface — ADR-014 (DDD Structure)
 * All domain entities have identity, version, and timestamps.
 */
import type { Timestamp, Identifier } from '../../types/common.js';

export interface EntityBase {
  readonly id: Identifier;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}
