/**
 * Runtime Registry — Registration of all Platform Runtimes
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Stores RuntimeDescriptors, supports lookup by id, name, or phase.
 */
import type { RuntimeDescriptor, RuntimeRegistry as RuntimeRegistryInterface, BootstrapPhase } from '../types.js';

export class ThreadSafeRuntimeRegistry implements RuntimeRegistryInterface {
  private readonly store = new Map<string, RuntimeDescriptor>();
  private readonly nameIndex = new Map<string, string>();

  register(descriptor: RuntimeDescriptor): void {
    if (this.store.has(descriptor.id)) {
      throw new Error(`Runtime already registered: ${descriptor.id}`);
    }
    this.store.set(descriptor.id, descriptor);
    this.nameIndex.set(descriptor.name, descriptor.id);
  }

  get(id: string): RuntimeDescriptor | undefined {
    return this.store.get(id);
  }

  getByName(name: string): RuntimeDescriptor | undefined {
    const id = this.nameIndex.get(name);
    return id ? this.store.get(id) : undefined;
  }

  getAll(): readonly RuntimeDescriptor[] {
    return [...this.store.values()];
  }

  getByPhase(phase: BootstrapPhase): readonly RuntimeDescriptor[] {
    return [...this.store.values()].filter((d) => d.phase === phase);
  }

  has(id: string): boolean {
    return this.store.has(id);
  }

  count(): number {
    return this.store.size;
  }
}
