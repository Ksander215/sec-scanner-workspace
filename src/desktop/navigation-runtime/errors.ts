/**
 * Navigation Runtime — Errors
 */
export class NavigationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'NavigationError';
  }
}

export class ScreenNotFoundError extends NavigationError {
  constructor(path: string) {
    super(`Screen not found: ${path}`, 'SCREEN_NOT_FOUND');
    this.name = 'ScreenNotFoundError';
  }
}

export class NavigationHistoryError extends NavigationError {
  constructor(message: string) {
    super(message, 'NAVIGATION_HISTORY_ERROR');
    this.name = 'NavigationHistoryError';
  }
}

export class DuplicateScreenError extends NavigationError {
  constructor(path: string) {
    super(`Duplicate screen path: ${path}`, 'DUPLICATE_SCREEN');
    this.name = 'DuplicateScreenError';
  }
}
