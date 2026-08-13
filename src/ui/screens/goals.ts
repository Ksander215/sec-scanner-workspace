/**
 * Goals Screen — Desktop UI
 * TASK-AIS-011A.001
 */

export interface GoalsScreenProps {
  readonly screenId: string;
  readonly isActive: boolean;
}

export class GoalsScreen {
  readonly screenId: string;
  private _isActive = false;

  constructor(screenId: string) {
    this.screenId = screenId;
  }

  get isActive(): boolean { return this._isActive; }
  activate(): void { this._isActive = true; }
  deactivate(): void { this._isActive = false; }

  render(): string {
    return `Goals Screen [${this.screenId}] — ${this._isActive ? 'active' : 'inactive'}`;
  }

  getProps(): GoalsScreenProps {
    return { screenId: this.screenId, isActive: this._isActive };
  }
}
