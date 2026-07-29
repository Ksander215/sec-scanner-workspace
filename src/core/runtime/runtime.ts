/**
 * AIS Runtime — ARC-001.001
 * Manages service registration, lifecycle, and dependency injection.
 * DR-02: Cross-FP communication via Event Bus only.
 */
import { ServiceRegistry } from './service-registry.js';
import { DefaultLifecycleHooks, type LifecycleHooks } from './lifecycle.js';
import { InProcessEventBus } from '../events/event-bus.js';
import type { Service } from '../services/service.js';
import type { EngineConfig } from '../config/engine-config.js';

export class Runtime {
  private readonly registry = new ServiceRegistry();
  private readonly lifecycle = new DefaultLifecycleHooks();
  private readonly _eventBus = new InProcessEventBus();
  private _state: 'uninitialized' | 'ready' | 'running' | 'stopped' = 'uninitialized';

  constructor(_config: EngineConfig) {}

  get state(): string { return this._state; }
  get services(): ServiceRegistry { return this.registry; }
  get eventBus(): InProcessEventBus { return this._eventBus; }
  get hooks(): LifecycleHooks { return this.lifecycle; }

  /** Register a service */
  register<T extends Service>(service: T): void {
    this.registry.register(service);
  }

  /** Initialize all registered services */
  async initialize(): Promise<void> {
    await this.lifecycle.run('beforeInitialize');
    for (const service of this.registry.getAll()) {
      await service.initialize();
    }
    this._state = 'ready';
    await this.lifecycle.run('afterInitialize');
  }

  /** Start all registered services */
  async start(): Promise<void> {
    await this.lifecycle.run('beforeStart');
    for (const service of this.registry.getAll()) {
      await service.start();
    }
    this._state = 'running';
    await this.lifecycle.run('afterStart');
  }

  /** Stop all registered services */
  async stop(): Promise<void> {
    await this.lifecycle.run('beforeStop');
    for (const service of [...this.registry.getAll()].reverse()) {
      await service.stop();
    }
    this._state = 'stopped';
    await this.lifecycle.run('afterStop');
  }

  /** Shutdown all registered services */
  async shutdown(): Promise<void> {
    await this.lifecycle.run('beforeShutdown');
    for (const service of [...this.registry.getAll()].reverse()) {
      await service.shutdown();
    }
    this._state = 'uninitialized';
    await this.lifecycle.run('afterShutdown');
  }
}
