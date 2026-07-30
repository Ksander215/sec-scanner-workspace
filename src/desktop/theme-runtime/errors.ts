/**
 * Theme Runtime — Errors
 */
export class ThemeError extends Error {
  constructor(message: string, public readonly code: string, public readonly themeId?: string) {
    super(message);
    this.name = 'ThemeError';
  }
}

export class ThemeNotFoundError extends ThemeError {
  constructor(id: string) {
    super('Theme not found: ' + id, 'THEME_NOT_FOUND', id);
    this.name = 'ThemeNotFoundError';
  }
}
