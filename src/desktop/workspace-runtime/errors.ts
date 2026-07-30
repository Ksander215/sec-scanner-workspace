/**
 * Workspace Runtime — Errors
 */
export class WorkspaceError extends Error {
  constructor(message: string, public readonly code: string, public readonly workspaceId?: string) {
    super(message);
    this.name = 'WorkspaceError';
  }
}

export class WorkspaceNotFoundError extends WorkspaceError {
  constructor(id: string) {
    super(`Workspace not found: ${id}`, 'WORKSPACE_NOT_FOUND', id);
    this.name = 'WorkspaceNotFoundError';
  }
}

export class DuplicateWorkspaceError extends WorkspaceError {
  constructor(name: string) {
    super(`Duplicate workspace name: ${name}`, 'DUPLICATE_WORKSPACE');
    this.name = 'DuplicateWorkspaceError';
  }
}
