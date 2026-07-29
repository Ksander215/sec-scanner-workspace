/**
 * Service Registry — Dependency container for the AIS Runtime.
 * AL-002: Boundary by Contract — modules interact only through registered services.
 */
import type { Service } from '../services/service.js';

export class ServiceRegistry {
  private services = new Map<string, Service>();

  register<T extends Service>(service: T): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service '${service.name}' already registered`);
    }
    this.services.set(service.name, service);
  }

  get<T extends Service>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }
    return service as T;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  getAll(): readonly Service[] {
    return Array.from(this.services.values());
  }

  getAllNames(): readonly string[] {
    return Array.from(this.services.keys());
  }
}
