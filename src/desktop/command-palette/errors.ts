/**
 * CommandPalette Runtime — Errors
 */
export class CommandPaletteError extends Error {
  constructor(message: string, public readonly code: string, public readonly commandpaletteId?: string) {
    super(message);
    this.name = 'CommandPaletteError';
  }
}

export class CommandPaletteNotFoundError extends CommandPaletteError {
  constructor(id: string) {
    super('CommandPalette not found: ' + id, 'COMMANDPALETTE_NOT_FOUND', id);
    this.name = 'CommandPaletteNotFoundError';
  }
}
