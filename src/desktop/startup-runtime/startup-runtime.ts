/**
 * Startup Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';

export class StartupRuntime implements Service {
  readonly name = 'StartupRuntime';
  private steps: Array<{name: string; fn: () => Promise<void>}> = [];
  private completedSteps = new Set<string>();
  private startTime = 0;
  private endTime = 0;
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.steps = []; this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  registerStep(name: string, fn: () => Promise<void>): void { this.steps.push({ name, fn }); }
  async runStartupSequence(): Promise<void> {
    this.startTime = Date.now(); this.completedSteps.clear();
    for (const step of this.steps) { await step.fn(); this.completedSteps.add(step.name); }
    this.endTime = Date.now();
  }
  getStartupDuration(): number { return this.endTime - this.startTime; }
  getCompletedSteps(): readonly string[] { return [...this.completedSteps]; }
  getStepCount(): number { return this.steps.length; }
  isStepCompleted(name: string): boolean { return this.completedSteps.has(name); }
}
