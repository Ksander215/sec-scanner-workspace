/**
 * Projects Screen — Desktop UI
 * Implements the Projects screen of the Desktop Application.
 */

export interface ProjectsScreenProps {
  readonly screenId: string;
  readonly isActive: boolean;
}

export class ProjectsScreen {
  readonly screenId: string;
  private _isActive = false;

  constructor(screenId: string) {
    this.screenId = screenId;
  }

  get isActive(): boolean { return this._isActive; }

  activate(): void { this._isActive = true; }
  deactivate(): void { this._isActive = false; }

  render(): string { return 'projects-screen'; }

  getState(): { screenId: string; isActive: boolean; rendered: string } {
    return { screenId: this.screenId, isActive: this._isActive, rendered: this.render() };
  }
}
