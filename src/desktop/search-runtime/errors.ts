/**
 * Search Runtime — Errors
 */
export class SearchError extends Error {
  constructor(message: string, public readonly code: string, public readonly searchId?: string) {
    super(message);
    this.name = 'SearchError';
  }
}

export class SearchNotFoundError extends SearchError {
  constructor(id: string) {
    super('Search not found: ' + id, 'SEARCH_NOT_FOUND', id);
    this.name = 'SearchNotFoundError';
  }
}
