/**
 * Universal AI Provider Runtime — Provider Registry Implementation
 * TASK-AIS-006A.000
 *
 * Manages provider lifecycle: registration, unregistration, health checks.
 * Publishes domain events via InProcessEventBus when available.
 */

import type { IProviderRegistry } from '../contracts.js';
import type {
  ProviderId,
  ProviderDescriptor,
  ProviderHealthCheck,
  ProviderRegistryConfig,
  ProviderSDK,
} from '../types.js';
import { ProviderState } from '../types.js';
import {
  ProviderAlreadyRegisteredError,
  ProviderNotFoundError,
  ProviderLimitExceededError,
} from '../errors.js';
import type {
  ProviderRegisteredEvent,
  ProviderUnregisteredEvent,
  ProviderHealthCheckedEvent,
} from '../events.js';
import { EventClassification } from '../../types/common.js';
import type { DomainEventBase } from '../../domain/events/domain-event.js';
import type { InProcessEventBus } from '../../events/event-bus.js';

/**
 * Provider Registry — manages provider registration, lookup, and health checks.
 *
 * Conforms to IProviderRegistry from contracts.ts.
 * Uses Map-based storage for both descriptors and SDK instances.
 */
export class ProviderRegistry implements IProviderRegistry {
  private readonly config: ProviderRegistryConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly providers = new Map<string, ProviderDescriptor>();
  private readonly sdks = new Map<string, unknown>();

  constructor(config: ProviderRegistryConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  // ─── Registration ─────────────────────────────────────────────

  async register(descriptor: ProviderDescriptor, sdk: unknown): Promise<void> {
    const id = descriptor.id as string;

    if (this.providers.has(id)) {
      throw new ProviderAlreadyRegisteredError(id);
    }

    if (this.providers.size >= this.config.maxProviders) {
      throw new ProviderLimitExceededError(this.config.maxProviders);
    }

    // Create a new descriptor with state set to Ready
    const readyDescriptor: ProviderDescriptor = Object.freeze({
      ...descriptor,
      state: ProviderState.Ready,
    });

    this.providers.set(id, readyDescriptor);
    this.sdks.set(id, sdk);

    const event: ProviderRegisteredEvent & DomainEventBase = Object.freeze({
      eventType: 'provider.registered',
      classification: EventClassification.Action,
      providerId: descriptor.id,
      providerName: descriptor.name,
      providerType: descriptor.type as string,
      timestamp: new Date().toISOString(),
      metadata: { ...descriptor.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: descriptor.id as string,
      aggregateType: 'Provider',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  // ─── Unregistration ───────────────────────────────────────────

  async unregister(providerId: ProviderId): Promise<void> {
    const id = providerId as string;
    const descriptor = this.providers.get(id);

    if (!descriptor) {
      throw new ProviderNotFoundError(id);
    }

    this.providers.delete(id);
    this.sdks.delete(id);

    const event: ProviderUnregisteredEvent & DomainEventBase = Object.freeze({
      eventType: 'provider.unregistered',
      classification: EventClassification.Action,
      providerId,
      providerName: descriptor.name,
      timestamp: new Date().toISOString(),
      metadata: { ...descriptor.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: id,
      aggregateType: 'Provider',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  // ─── Queries ──────────────────────────────────────────────────

  async get(providerId: ProviderId): Promise<ProviderDescriptor | null> {
    return this.providers.get(providerId as string) ?? null;
  }

  async getByName(name: string): Promise<ProviderDescriptor | null> {
    for (const descriptor of this.providers.values()) {
      if (descriptor.name === name) {
        return descriptor;
      }
    }
    return null;
  }

  async list(): Promise<readonly ProviderDescriptor[]> {
    return Array.from(this.providers.values());
  }

  async getByType(type: string): Promise<readonly ProviderDescriptor[]> {
    const result: ProviderDescriptor[] = [];
    for (const descriptor of this.providers.values()) {
      if ((descriptor.type as string) === type) {
        result.push(descriptor);
      }
    }
    return result;
  }

  // ─── Health Checks ────────────────────────────────────────────

  async healthCheck(providerId: ProviderId): Promise<ProviderHealthCheck> {
    const id = providerId as string;
    const sdk = this.sdks.get(id);

    if (!sdk) {
      throw new ProviderNotFoundError(id);
    }

    let result: ProviderHealthCheck;
    try {
      result = await (sdk as ProviderSDK).health();
    } catch {
      result = Object.freeze({
        providerId,
        healthy: false,
        latencyMs: 0,
        errorRate: 1,
        lastCheckAt: new Date().toISOString(),
        details: 'Health check invocation failed',
        metadata: {},
      });
    }

    const event: ProviderHealthCheckedEvent & DomainEventBase = Object.freeze({
      eventType: 'provider.health-checked',
      classification: result.healthy
        ? EventClassification.Result
        : EventClassification.Error,
      providerId,
      healthy: result.healthy,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
      metadata: { ...result.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: id,
      aggregateType: 'Provider',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }

    return result;
  }

  async healthCheckAll(): Promise<ReadonlyMap<string, ProviderHealthCheck>> {
    const results = new Map<string, ProviderHealthCheck>();

    for (const id of this.providers.keys()) {
      const check = await this.healthCheck(id as ProviderId);
      results.set(id, check);
    }

    return results;
  }

  // ─── SDK Access ───────────────────────────────────────────────

  async getSDK(providerId: ProviderId): Promise<unknown | null> {
    return this.sdks.get(providerId as string) ?? null;
  }

  // ─── Count ────────────────────────────────────────────────────

  async count(): Promise<number> {
    return this.providers.size;
  }
}
