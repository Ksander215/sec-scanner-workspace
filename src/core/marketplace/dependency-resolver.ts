/**
 * Dependency Resolver Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { DependencyNode, DependencyResolverConfig, PackageDependency, CapabilityEntry } from './types.js';
import { brandDependencyNodeId } from './types.js';
import type { IDependencyResolver } from './contracts.js';
import { CircularDependencyError, DependencyNotFoundError, CapabilityNotFoundError } from './errors.js';
import type { DependencyResolvedEvent } from './events.js';

export class DependencyResolver implements IDependencyResolver {
  private readonly config: DependencyResolverConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly resolutions = new Map<string, DependencyNode[]>();
  private capabilities: readonly CapabilityEntry[] = Object.freeze([]);

  constructor(config: DependencyResolverConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setCapabilities(caps: readonly CapabilityEntry[]): void {
    this.capabilities = caps;
  }

  async resolve(capabilityId: import('./types.js').CapabilityId): Promise<DependencyNode[]> {
    const key = capabilityId as string;
    const startTime = Date.now();
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const nodes: DependencyNode[] = [];

    const walk = (pkgName: string, depth: number): void => {
      if (depth > this.config.maxDepth) return;
      if (visited.has(pkgName)) return;
      if (visiting.has(pkgName)) {
        throw new CircularDependencyError(pkgName);
      }
      visiting.add(pkgName);
      const cap = this.capabilities.find(c => c.name === pkgName);
      if (!cap) throw new DependencyNotFoundError(pkgName);
      const deps = cap.dependencies.filter(d => !d.optional);
      const childIds: import('./types.js').DependencyNodeId[] = [];
      for (const dep of deps) {
        const childId = brandDependencyNodeId(crypto.randomUUID());
        childIds.push(childId);
        walk(dep.name, depth + 1);
      }
      const nodeId = brandDependencyNodeId(crypto.randomUUID());
      const node: DependencyNode = Object.freeze({
        id: nodeId,
        packageName: pkgName,
        resolvedVersion: cap.version,
        dependencies: Object.freeze(childIds),
        depth,
        optional: false,
      });
      nodes.push(node);
      visited.add(pkgName);
      visiting.delete(pkgName);
    };

    const cap = this.capabilities.find(c => c.id === capabilityId);
    if (!cap) throw new CapabilityNotFoundError(key);
    walk(cap.name, 0);
    this.resolutions.set(key, nodes);
    const durationMs = Date.now() - startTime;
    const event: DependencyResolvedEvent = Object.freeze({
      eventType: 'marketplace.dependency.resolved',
      classification: EventClassification.Result,
      capabilityId,
      nodeCount: nodes.length,
      depth: nodes.length > 0 ? Math.max(...nodes.map(n => n.depth)) : 0,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'DependencyNode');
    return nodes;
  }

  async getResolution(capId: import('./types.js').CapabilityId): Promise<DependencyNode[] | null> {
    return this.resolutions.get(capId as string) ?? null;
  }

  async hasCircularDependency(capId: import('./types.js').CapabilityId): Promise<boolean> {
    try {
      await this.resolve(capId);
      return false;
    } catch (err) {
      if (err instanceof CircularDependencyError) return true;
      throw err;
    }
  }

  async getDependencies(capId: import('./types.js').CapabilityId): Promise<readonly PackageDependency[]> {
    const cap = this.capabilities.find(c => c.id === capId);
    if (!cap) throw new CapabilityNotFoundError(capId as string);
    return cap.dependencies;
  }


  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
