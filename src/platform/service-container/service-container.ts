/**
 * Service Container — Dependency Injection Container
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Supports Singleton, Scoped, Transient, and Factory lifetimes.
 */
import type { ServiceDescriptor, ScopedContainer, ServiceContainer as ServiceContainerInterface } from '../types.js';
import { ServiceScope } from '../types.js';

class DefaultScopedContainer implements ScopedContainer {
  private readonly instances = new Map<string, unknown>();
  private disposed = false;

  constructor(
    private readonly parent: ServiceContainerImpl,
    private readonly scopeId: string,
  ) {}

  async resolve<T>(id: string): Promise<T> {
    if (this.disposed) throw new Error(`Scope ${this.scopeId} is disposed`);
    const descriptor = this.parent.getDescriptor(id);
    if (!descriptor) throw new Error(`Service not registered: ${id}`);
    if (descriptor.scope === ServiceScope.Singleton) {
      return this.parent.resolve<T>(id);
    }
    if (descriptor.scope === ServiceScope.Scoped) {
      if (this.instances.has(id)) return this.instances.get(id) as T;
      const instance = await this.parent.createInstance(descriptor);
      this.instances.set(id, instance);
      return instance as T;
    }
    return this.parent.createInstance(descriptor) as Promise<T>;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.instances.clear();
  }
}

export class ServiceContainerImpl implements ServiceContainerInterface {
  private readonly descriptors = new Map<string, ServiceDescriptor>();
  private readonly singletons = new Map<string, unknown>();
  private scopeCounter = 0;

  register(
    id: string,
    factory: () => Promise<unknown> | unknown,
    scope: ServiceScope = ServiceScope.Transient,
  ): void {
    this.descriptors.set(id, { id, scope, factory });
  }

  registerSingleton<T>(id: string, instance: T): void {
    this.singletons.set(id, instance);
    this.descriptors.set(id, {
      id,
      scope: ServiceScope.Singleton,
      factory: () => instance,
    });
  }

  async resolve<T>(id: string): Promise<T> {
    const descriptor = this.descriptors.get(id);
    if (!descriptor) throw new Error(`Service not registered: ${id}`);

    if (descriptor.scope === ServiceScope.Singleton && this.singletons.has(id)) {
      return this.singletons.get(id) as T;
    }

    const instance = await this.createInstance(descriptor);

    if (descriptor.scope === ServiceScope.Singleton) {
      this.singletons.set(id, instance);
    }

    return instance as T;
  }

  has(id: string): boolean {
    return this.descriptors.has(id);
  }

  getAll(): ReadonlyMap<string, ServiceDescriptor> {
    return new Map(this.descriptors);
  }

  createScope(): ScopedContainer {
    const scopeId = `scope-${++this.scopeCounter}`;
    return new DefaultScopedContainer(this, scopeId);
  }

  getDescriptor(id: string): ServiceDescriptor | undefined {
    return this.descriptors.get(id);
  }

  async createInstance(descriptor: ServiceDescriptor): Promise<unknown> {
    return descriptor.factory();
  }
}