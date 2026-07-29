/**
 * Execution Engine — AIS Core
 * Lifecycle: initialize() → start() → [execute()] → stop() → shutdown()
 * Conforms to: ARC-001.001, CON-001.000
 *
 * DR-01: Provider-Independent Core
 * DR-02: Event-Driven Coordination
 * DR-03: Single Memory Authority
 * DR-10: Autonomy-Level Aware
 * DR-11: Audit-Log All Side Effects
 */
import { Runtime } from '../runtime/runtime.js';
import { DefaultEngineConfig, type EngineConfig } from '../config/engine-config.js';
import { DefaultTrustZoneGate, type TrustZoneGate } from '../zones/trust-zone-gate.js';
import { AutonomyLevel, EngineState } from '../types/common.js';

export class ExecutionEngine {
  private runtime: Runtime;
  private trustZoneGate: TrustZoneGate;
  private _state = EngineState.Uninitialized;
  private _autonomyLevel: AutonomyLevel;

  constructor(config?: Partial<EngineConfig>) {
    const fullConfig = { ...DefaultEngineConfig, ...config };
    this.runtime = new Runtime(fullConfig);
    this.trustZoneGate = new DefaultTrustZoneGate();
    this._autonomyLevel = fullConfig.defaultAutonomyLevel;
  }

  /** Current engine state */
  get state(): EngineState { return this._state; }

  /** Current autonomy level (ADR-009) */
  get autonomyLevel(): AutonomyLevel { return this._autonomyLevel; }

  /** Runtime reference for service registration */
  get services() { return this.runtime.services; }

  /** Event Bus reference */
  get eventBus() { return this.runtime.eventBus; }

  /** Lifecycle hooks */
  get hooks() { return this.runtime.hooks; }

  /** Trust zone gate */
  get zoneGate() { return this.trustZoneGate; }

  /**
   * Phase 1: Initialize
   * Sets up infrastructure, validates configuration, registers core services.
   */
  async initialize(): Promise<void> {
    if (this._state !== EngineState.Uninitialized) {
      throw new Error(`Cannot initialize from state: ${this._state}`);
    }
    this._state = EngineState.Initializing;
    try {
      await this.runtime.initialize();
      this._state = EngineState.Ready;
    } catch (error) {
      this._state = EngineState.Error;
      throw error;
    }
  }

  /**
   * Phase 2: Start
   * Starts all services, opens event bus, begins health checks.
   */
  async start(): Promise<void> {
    if (this._state !== EngineState.Ready) {
      throw new Error(`Cannot start from state: ${this._state}`);
    }
    this._state = EngineState.Running;
    try {
      await this.runtime.start();
    } catch (error) {
      this._state = EngineState.Error;
      throw error;
    }
  }

  /**
   * Phase 3: Execute
   * Main execution loop — routes requests through AIS Controller.
   */
  async execute<T>(_request: unknown): Promise<T> {
    if (this._state !== EngineState.Running) {
      throw new Error(`Cannot execute from state: ${this._state}`);
    }
    // Placeholder — will be implemented in AIS-003B+
    return {} as T;
  }

  /**
   * Phase 4: Stop
   * Gracefully stops all services. No new requests accepted.
   */
  async stop(): Promise<void> {
    if (this._state !== EngineState.Running) {
      throw new Error(`Cannot stop from state: ${this._state}`);
    }
    this._state = EngineState.Stopping;
    try {
      await this.runtime.stop();
      this._state = EngineState.Stopped;
    } catch (error) {
      this._state = EngineState.Error;
      throw error;
    }
  }

  /**
   * Phase 5: Shutdown
   * Full teardown. Releases all resources. Not restartable.
   */
  async shutdown(): Promise<void> {
    if (this._state !== EngineState.Stopped) {
      throw new Error(`Cannot shutdown from state: ${this._state}`);
    }
    await this.runtime.shutdown();
    this._state = EngineState.ShutDown;
  }

  /** Set autonomy level (DR-10) */
  setAutonomyLevel(level: AutonomyLevel): void {
    this._autonomyLevel = level;
  }
}
