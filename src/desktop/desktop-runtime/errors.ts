/**
 * Desktop Runtime — Errors
 */
export class DesktopRuntimeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DesktopRuntimeError';
  }
}

export class DesktopNotInitializedError extends DesktopRuntimeError {
  constructor() {
    super('Desktop Runtime is not initialized', 'DESKTOP_NOT_INITIALIZED');
    this.name = 'DesktopNotInitializedError';
  }
}

export class SubsystemNotFoundError extends DesktopRuntimeError {
  constructor(name: string) {
    super(`Subsystem not found: ${name}`, 'SUBSYSTEM_NOT_FOUND');
    this.name = 'SubsystemNotFoundError';
  }
}
