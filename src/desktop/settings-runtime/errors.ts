/**
 * Settings Runtime — Errors
 */
export class SettingsError extends Error {
  constructor(message: string, public readonly code: string, public readonly settingsId?: string) {
    super(message);
    this.name = 'SettingsError';
  }
}

export class SettingsNotFoundError extends SettingsError {
  constructor(id: string) {
    super('Settings not found: ' + id, 'SETTINGS_NOT_FOUND', id);
    this.name = 'SettingsNotFoundError';
  }
}
