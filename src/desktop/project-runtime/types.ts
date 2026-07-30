/**
 * Project Runtime — Types
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';

export type ProjectId = Identifier & { readonly __brand: 'ProjectId' };

export interface ProjectEntity {
  readonly id: ProjectId;
  readonly name: string;
  readonly description: string;
  readonly settings: Record<string, unknown>;
  readonly tags: readonly string[];
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface CreateProjectOptions {
  readonly name: string;
  readonly description?: string;
  readonly settings?: Record<string, unknown>;
  readonly tags?: readonly string[];
}
