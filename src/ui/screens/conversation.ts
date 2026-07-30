/**
 * Conversation Screen — Desktop UI
 * Implements the Conversation screen of the Desktop Application.
 */

export interface ConversationScreenProps {
  readonly screenId: string;
  readonly isActive: boolean;
}

export class ConversationScreen {
  readonly screenId: string;
  private _isActive = false;

  constructor(screenId: string) {
    this.screenId = screenId;
  }

  get isActive(): boolean { return this._isActive; }

  activate(): void { this._isActive = true; }
  deactivate(): void { this._isActive = false; }

  render(): string { return 'conversation-screen'; }

  getState(): { screenId: string; isActive: boolean; rendered: string } {
    return { screenId: this.screenId, isActive: this._isActive, rendered: this.render() };
  }
}
