/**
 * LocalStorage Runtime — Errors
 */
export class LocalStorageError extends Error {
  constructor(message: string, public readonly code: string, public readonly localstorageId?: string) {
    super(message);
    this.name = 'LocalStorageError';
  }
}

export class LocalStorageNotFoundError extends LocalStorageError {
  constructor(id: string) {
    super('LocalStorage not found: ' + id, 'LOCALSTORAGE_NOT_FOUND', id);
    this.name = 'LocalStorageNotFoundError';
  }
}
