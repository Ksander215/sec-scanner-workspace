/**
 * Project Runtime — Errors
 */
export class ProjectError extends Error {
  constructor(message: string, public readonly code: string, public readonly projectId?: string) {
    super(message);
    this.name = 'ProjectError';
  }
}

export class ProjectNotFoundError extends ProjectError {
  constructor(id: string) {
    super('Project not found: ' + id, 'PROJECT_NOT_FOUND', id);
    this.name = 'ProjectNotFoundError';
  }
}
