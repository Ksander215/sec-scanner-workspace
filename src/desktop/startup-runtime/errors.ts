/**
 * Startup Runtime — Errors
 */
export class StartupError extends Error {
  constructor(message: string, public readonly code: string, public readonly startupId?: string) {
    super(message);
    this.name = 'StartupError';
  }
}

export class StartupNotFoundError extends StartupError {
  constructor(id: string) {
    super('Startup not found: ' + id, 'STARTUP_NOT_FOUND', id);
    this.name = 'StartupNotFoundError';
  }
}
