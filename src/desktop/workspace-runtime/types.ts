/**
 * Workspace Runtime — Types
 */
import type { Identifier, Timestamp } from '../../core/types/common.js';

export type WorkspaceId = Identifier & { readonly __brand: 'WorkspaceId' };

export enum WorkspaceState {
  Active = 'Active',
  Inactive = 'Inactive',
  Archived = 'Archived',
}

export interface Workspace {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly description: string;
  readonly state: WorkspaceState;
  readonly projectId?: Identifier;
  readonly layout: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface CreateWorkspaceOptions {
  readonly name: string;
  readonly description?: string;
  readonly projectId?: Identifier;
  readonly layout?: Record<string, unknown>;
}
