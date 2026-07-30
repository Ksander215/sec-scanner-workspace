/**
 * Diagnostics Runtime — Errors
 */
export class DiagnosticsError extends Error {
  constructor(message: string, public readonly code: string, public readonly diagnosticsId?: string) {
    super(message);
    this.name = 'DiagnosticsError';
  }
}

export class DiagnosticsNotFoundError extends DiagnosticsError {
  constructor(id: string) {
    super('Diagnostics not found: ' + id, 'DIAGNOSTICS_NOT_FOUND', id);
    this.name = 'DiagnosticsNotFoundError';
  }
}
