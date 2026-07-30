/**
 * Window Manager — Errors
 */
export class WindowManagerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly windowId?: string,
  ) {
    super(message);
    this.name = 'WindowManagerError';
  }
}

export class WindowNotFoundError extends WindowManagerError {
  constructor(windowId: string) {
    super(`Window not found: ${windowId}`, 'WINDOW_NOT_FOUND', windowId);
    this.name = 'WindowNotFoundError';
  }
}

export class WindowLimitExceededError extends WindowManagerError {
  constructor(limit: number) {
    super(`Window limit exceeded: max ${limit}`, 'WINDOW_LIMIT_EXCEEDED');
    this.name = 'WindowLimitExceededError';
  }
}

export class InvalidWindowTransitionError extends WindowManagerError {
  constructor(from: string, to: string, windowId?: string) {
    super(`Invalid window transition: ${from} -> ${to}`, 'INVALID_WINDOW_TRANSITION', windowId);
    this.name = 'InvalidWindowTransitionError';
  }
}

export class DuplicateWindowError extends WindowManagerError {
  constructor(windowId: string) {
    super(`Duplicate window: ${windowId}`, 'DUPLICATE_WINDOW', windowId);
    this.name = 'DuplicateWindowError';
  }
}
