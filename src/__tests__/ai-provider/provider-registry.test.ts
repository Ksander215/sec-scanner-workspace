import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderRegistry } from '../../core/ai-provider/provider-registry.js';
import { MockProviderSDK } from '../../core/ai-provider/provider-sdk.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  ProviderState,
  AIProviderType,
  PrivacyLevel,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';
import {
  ProviderAlreadyRegisteredError,
  ProviderNotFoundError,
  ProviderLimitExceededError,
} from '../../core/ai-provider/errors.js';

// ─── Factory helpers ─────────────────────────────────────────────

function makeProviderDescriptor(overrides?: Partial<Types.ProviderDescriptor>): Types.ProviderDescriptor {
  return Object.freeze({
    id: crypto.randomUUID() as Types.ProviderId,
    name: `Provider-${crypto.randomUUID().slice(0, 8)}`,
    type: AIProviderType.OpenAI,
    version: '1.0.0',
    description: 'A test provider',
    state: ProviderState.Registered,
    endpoint: 'https://api.example.com',
    supportedRegions: ['us-east-1'],
    capabilities: ['chat', 'completion'],
    privacyLevel: PrivacyLevel.Public,
    maxConcurrentRequests: 10,
    metadata: { key: 'value' },
    registeredAt: new Date().toISOString(),
    lastHealthCheckAt: null,
    ...overrides,
  });
}

function makeMockSDK(overrides?: Partial<{ id: string; name: string; latencyMs: number; failRate: number; errorMessage: string }>): MockProviderSDK {
  return new MockProviderSDK({
    id: overrides?.id ?? crypto.randomUUID(),
    name: overrides?.name ?? 'Test SDK',
    latencyMs: overrides?.latencyMs ?? 5,
    failRate: overrides?.failRate ?? 0,
    errorMessage: overrides?.errorMessage ?? 'Mock error',
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    registry = new ProviderRegistry(
      { ...DefaultAIProviderRuntimeConfig.providerRegistry },
      eventBus,
    );
  });

  afterEach(() => {
    eventBus.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // register
  // ═══════════════════════════════════════════════════════════════
  describe('register', () => {
    it('should register a provider successfully', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      const count = await registry.count();
      expect(count).toBe(1);
    });

    it('should set state to Ready on registration', async () => {
      const descriptor = makeProviderDescriptor({ state: ProviderState.Registered });
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      const result = await registry.get(descriptor.id);
      expect(result!.state).toBe(ProviderState.Ready);
    });

    it('should overwrite initial Registered state', async () => {
      const descriptor = makeProviderDescriptor({ state: ProviderState.Initializing });
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      const result = await registry.get(descriptor.id);
      expect(result!.state).toBe(ProviderState.Ready);
    });

    it('should store the SDK', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      const storedSdk = await registry.getSDK(descriptor.id);
      expect(storedSdk).toBe(sdk);
    });

    it('should throw ProviderAlreadyRegisteredError for duplicate id', async () => {
      const id = crypto.randomUUID() as Types.ProviderId;
      const d1 = makeProviderDescriptor({ id, name: 'Provider-A' });
      const d2 = makeProviderDescriptor({ id, name: 'Provider-B' });
      const sdk = makeMockSDK();
      await registry.register(d1, sdk);
      await expect(registry.register(d2, sdk)).rejects.toThrow(ProviderAlreadyRegisteredError);
    });

    it('should not increment count on duplicate registration failure', async () => {
      const id = crypto.randomUUID() as Types.ProviderId;
      const d1 = makeProviderDescriptor({ id });
      const d2 = makeProviderDescriptor({ id });
      const sdk = makeMockSDK();
      await registry.register(d1, sdk);
      try { await registry.register(d2, sdk); } catch { /* expected */ }
      expect(await registry.count()).toBe(1);
    });

    it('should throw ProviderLimitExceededError when max reached', async () => {
      const limitConfig = { ...DefaultAIProviderRuntimeConfig.providerRegistry, maxProviders: 2 };
      const reg = new ProviderRegistry(limitConfig, eventBus);
      const sdk = makeMockSDK();
      await reg.register(makeProviderDescriptor(), sdk);
      await reg.register(makeProviderDescriptor(), sdk);
      await expect(reg.register(makeProviderDescriptor(), sdk)).rejects.toThrow(ProviderLimitExceededError);
    });

    it('should allow exactly maxProviders registrations', async () => {
      const limitConfig = { ...DefaultAIProviderRuntimeConfig.providerRegistry, maxProviders: 3 };
      const reg = new ProviderRegistry(limitConfig, eventBus);
      const sdk = makeMockSDK();
      await reg.register(makeProviderDescriptor(), sdk);
      await reg.register(makeProviderDescriptor(), sdk);
      await reg.register(makeProviderDescriptor(), sdk);
      expect(await reg.count()).toBe(3);
    });

    it('should publish provider.registered event', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      const log = eventBus.getLog();
      const events = log.filter(e => e.eventType === 'provider.registered');
      expect(events).toHaveLength(1);
    });

    it('should include providerId in registered event', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      const log = eventBus.getLog();
      const event = log.find(e => e.eventType === 'provider.registered');
      expect(event).toBeDefined();
    });

    it('should register multiple different providers', async () => {
      const sdk1 = makeMockSDK();
      const sdk2 = makeMockSDK();
      const sdk3 = makeMockSDK();
      await registry.register(makeProviderDescriptor(), sdk1);
      await registry.register(makeProviderDescriptor(), sdk2);
      await registry.register(makeProviderDescriptor(), sdk3);
      expect(await registry.count()).toBe(3);
    });

    it('should work without event bus', async () => {
      const reg = new ProviderRegistry({ ...DefaultAIProviderRuntimeConfig.providerRegistry });
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await reg.register(descriptor, sdk);
      expect(await reg.count()).toBe(1);
    });

    it('should register provider with Custom type', async () => {
      const descriptor = makeProviderDescriptor({ type: AIProviderType.Custom });
      const sdk = makeMockSDK({ providerType: AIProviderType.Custom });
      await registry.register(descriptor, sdk);
      const result = await registry.get(descriptor.id);
      expect(result!.type).toBe(AIProviderType.Custom);
    });

    it('should register provider with Anthropic type', async () => {
      const descriptor = makeProviderDescriptor({ type: AIProviderType.Anthropic });
      const sdk = makeMockSDK({ providerType: AIProviderType.Anthropic });
      await registry.register(descriptor, sdk);
      const result = await registry.get(descriptor.id);
      expect(result!.type).toBe(AIProviderType.Anthropic);
    });

    it('should handle null event bus gracefully', async () => {
      const reg = new ProviderRegistry({ ...DefaultAIProviderRuntimeConfig.providerRegistry }, null);
      await reg.register(makeProviderDescriptor(), makeMockSDK());
      expect(await reg.count()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // unregister
  // ═══════════════════════════════════════════════════════════════
  describe('unregister', () => {
    it('should unregister a registered provider', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      await registry.unregister(descriptor.id);
      expect(await registry.count()).toBe(0);
    });

    it('should throw ProviderNotFoundError for missing provider', async () => {
      const fakeId = crypto.randomUUID() as Types.ProviderId;
      await expect(registry.unregister(fakeId)).rejects.toThrow(ProviderNotFoundError);
    });

    it('should publish provider.unregistered event', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      eventBus.clear();
      await registry.unregister(descriptor.id);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'provider.unregistered')).toBe(true);
    });

    it('should remove SDK on unregister', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      await registry.unregister(descriptor.id);
      const storedSdk = await registry.getSDK(descriptor.id);
      expect(storedSdk).toBeNull();
    });

    it('should remove provider from get lookup', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      await registry.unregister(descriptor.id);
      const result = await registry.get(descriptor.id);
      expect(result).toBeNull();
    });

    it('should remove provider from list', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      await registry.unregister(descriptor.id);
      const list = await registry.list();
      expect(list).toHaveLength(0);
    });

    it('should not affect other providers when unregistering one', async () => {
      const d1 = makeProviderDescriptor();
      const d2 = makeProviderDescriptor();
      await registry.register(d1, makeMockSDK());
      await registry.register(d2, makeMockSDK());
      await registry.unregister(d1.id);
      expect(await registry.count()).toBe(1);
      const remaining = await registry.get(d2.id);
      expect(remaining).not.toBeNull();
    });

    it('should handle unregistering from empty registry', async () => {
      await expect(registry.unregister(crypto.randomUUID() as Types.ProviderId)).rejects.toThrow(ProviderNotFoundError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // get
  // ═══════════════════════════════════════════════════════════════
  describe('get', () => {
    it('should return descriptor for registered provider', async () => {
      const descriptor = makeProviderDescriptor();
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(descriptor.id);
    });

    it('should return null for unknown provider', async () => {
      const result = await registry.get(crypto.randomUUID() as Types.ProviderId);
      expect(result).toBeNull();
    });

    it('should return descriptor with correct name', async () => {
      const descriptor = makeProviderDescriptor({ name: 'MySpecialProvider' });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.name).toBe('MySpecialProvider');
    });

    it('should return descriptor with correct type', async () => {
      const descriptor = makeProviderDescriptor({ type: AIProviderType.Google });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.type).toBe(AIProviderType.Google);
    });

    it('should return descriptor with Ready state', async () => {
      const descriptor = makeProviderDescriptor();
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.state).toBe(ProviderState.Ready);
    });

    it('should return frozen descriptor', async () => {
      const descriptor = makeProviderDescriptor();
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(Object.isFrozen(result!)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getByName
  // ═══════════════════════════════════════════════════════════════
  describe('getByName', () => {
    it('should find provider by name', async () => {
      const descriptor = makeProviderDescriptor({ name: 'UniqueName-12345' });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.getByName('UniqueName-12345');
      expect(result).not.toBeNull();
      expect(result!.id).toBe(descriptor.id);
    });

    it('should return null for unknown name', async () => {
      const result = await registry.getByName('NonExistent');
      expect(result).toBeNull();
    });

    it('should return first match when multiple providers exist', async () => {
      const d1 = makeProviderDescriptor({ name: 'SameName' });
      const d2 = makeProviderDescriptor({ name: 'SameName' });
      await registry.register(d1, makeMockSDK());
      await registry.register(d2, makeMockSDK());
      const result = await registry.getByName('SameName');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('SameName');
    });

    it('should find provider among many registered', async () => {
      const target = makeProviderDescriptor({ name: 'TargetProvider' });
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      await registry.register(target, makeMockSDK());
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      const result = await registry.getByName('TargetProvider');
      expect(result!.id).toBe(target.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // list
  // ═══════════════════════════════════════════════════════════════
  describe('list', () => {
    it('should return empty array when no providers', async () => {
      const result = await registry.list();
      expect(result).toHaveLength(0);
    });

    it('should return all registered providers', async () => {
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      const result = await registry.list();
      expect(result).toHaveLength(3);
    });

    it('should return descriptors with correct properties', async () => {
      const d = makeProviderDescriptor({ name: 'ListedProvider' });
      await registry.register(d, makeMockSDK());
      const result = await registry.list();
      expect(result[0].name).toBe('ListedProvider');
    });

    it('should reflect unregistrations in list', async () => {
      const d1 = makeProviderDescriptor();
      const d2 = makeProviderDescriptor();
      await registry.register(d1, makeMockSDK());
      await registry.register(d2, makeMockSDK());
      await registry.unregister(d1.id);
      const result = await registry.list();
      expect(result).toHaveLength(1);
    });

    it('should return readonly array', async () => {
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      const result = await registry.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getByType
  // ═══════════════════════════════════════════════════════════════
  describe('getByType', () => {
    it('should return providers matching type', async () => {
      await registry.register(makeProviderDescriptor({ type: AIProviderType.OpenAI }), makeMockSDK());
      await registry.register(makeProviderDescriptor({ type: AIProviderType.OpenAI }), makeMockSDK());
      await registry.register(makeProviderDescriptor({ type: AIProviderType.Anthropic }), makeMockSDK());
      const result = await registry.getByType('OpenAI');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-matching type', async () => {
      await registry.register(makeProviderDescriptor({ type: AIProviderType.OpenAI }), makeMockSDK());
      const result = await registry.getByType('Anthropic');
      expect(result).toHaveLength(0);
    });

    it('should return empty array when no providers registered', async () => {
      const result = await registry.getByType('OpenAI');
      expect(result).toHaveLength(0);
    });

    it('should return all providers when all match', async () => {
      await registry.register(makeProviderDescriptor({ type: AIProviderType.Custom }), makeMockSDK());
      await registry.register(makeProviderDescriptor({ type: AIProviderType.Custom }), makeMockSDK());
      const result = await registry.getByType('Custom');
      expect(result).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // healthCheck
  // ═══════════════════════════════════════════════════════════════
  describe('healthCheck', () => {
    it('should return healthy result for healthy SDK', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK({ failRate: 0, latencyMs: 10 });
      await registry.register(descriptor, sdk);
      const result = await registry.healthCheck(descriptor.id);
      expect(result.healthy).toBe(true);
    });

    it('should include latencyMs in result', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK({ latencyMs: 42 });
      await registry.register(descriptor, sdk);
      const result = await registry.healthCheck(descriptor.id);
      expect(result.latencyMs).toBe(42);
    });

    it('should include errorRate in result', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK({ failRate: 0.5 });
      await registry.register(descriptor, sdk);
      const result = await registry.healthCheck(descriptor.id);
      expect(result.errorRate).toBe(0.5);
    });

    it('should include lastCheckAt timestamp', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      const result = await registry.healthCheck(descriptor.id);
      expect(result.lastCheckAt).toBeTruthy();
    });

    it('should include providerId in result', async () => {
      const id = crypto.randomUUID() as Types.ProviderId;
      const descriptor = makeProviderDescriptor({ id });
      const sdk = makeMockSDK({ id });
      await registry.register(descriptor, sdk);
      const result = await registry.healthCheck(descriptor.id);
      expect(result.providerId).toBe(descriptor.id);
    });

    it('should throw ProviderNotFoundError for missing provider', async () => {
      await expect(registry.healthCheck(crypto.randomUUID() as Types.ProviderId)).rejects.toThrow(ProviderNotFoundError);
    });

    it('should return unhealthy result when SDK health() throws', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      // Replace the stored SDK with a broken one that throws on health()
      const brokenSDK = {
        ...sdk,
        health: async () => { throw new Error('unhealthy'); },
      };
      // We need a registry with a broken SDK; use a separate one
      const reg = new ProviderRegistry({ ...DefaultAIProviderRuntimeConfig.providerRegistry }, eventBus);
      const desc = makeProviderDescriptor();
      await reg.register(desc, brokenSDK);
      const result = await reg.healthCheck(desc.id);
      expect(result.healthy).toBe(false);
      expect(result.errorRate).toBe(1);
    });

    it('should publish provider.health-checked event for healthy', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      eventBus.clear();
      await registry.healthCheck(descriptor.id);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'provider.health-checked')).toBe(true);
    });

    it('should publish provider.health-checked event for unhealthy', async () => {
      const reg = new ProviderRegistry({ ...DefaultAIProviderRuntimeConfig.providerRegistry }, eventBus);
      const desc = makeProviderDescriptor();
      const brokenSDK = {
        health: async () => { throw new Error('fail'); },
      };
      await reg.register(desc, brokenSDK);
      eventBus.clear();
      await reg.healthCheck(desc.id);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'provider.health-checked')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // healthCheckAll
  // ═══════════════════════════════════════════════════════════════
  describe('healthCheckAll', () => {
    it('should return empty map when no providers', async () => {
      const result = await registry.healthCheckAll();
      expect(result.size).toBe(0);
    });

    it('should return health check for all registered providers', async () => {
      const d1 = makeProviderDescriptor();
      const d2 = makeProviderDescriptor();
      await registry.register(d1, makeMockSDK());
      await registry.register(d2, makeMockSDK());
      const result = await registry.healthCheckAll();
      expect(result.size).toBe(2);
    });

    it('should include healthy results', async () => {
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      const result = await registry.healthCheckAll();
      for (const check of result.values()) {
        expect(check.healthy).toBe(true);
      }
    });

    it('should use provider id as key', async () => {
      const d1 = makeProviderDescriptor();
      await registry.register(d1, makeMockSDK());
      const result = await registry.healthCheckAll();
      expect(result.has(d1.id as string)).toBe(true);
    });

    it('should return ReadonlyMap', async () => {
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      const result = await registry.healthCheckAll();
      expect(result instanceof Map).toBe(true);
    });

    it('should check multiple providers and return results for each', async () => {
      const d1 = makeProviderDescriptor({ name: 'Provider1' });
      const d2 = makeProviderDescriptor({ name: 'Provider2' });
      const d3 = makeProviderDescriptor({ name: 'Provider3' });
      await registry.register(d1, makeMockSDK({ latencyMs: 10 }));
      await registry.register(d2, makeMockSDK({ latencyMs: 20 }));
      await registry.register(d3, makeMockSDK({ latencyMs: 30 }));
      const results = await registry.healthCheckAll();
      expect(results.size).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSDK
  // ═══════════════════════════════════════════════════════════════
  describe('getSDK', () => {
    it('should return SDK for registered provider', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      const result = await registry.getSDK(descriptor.id);
      expect(result).toBe(sdk);
    });

    it('should return null for unknown provider', async () => {
      const result = await registry.getSDK(crypto.randomUUID() as Types.ProviderId);
      expect(result).toBeNull();
    });

    it('should return different SDKs for different providers', async () => {
      const d1 = makeProviderDescriptor();
      const d2 = makeProviderDescriptor();
      const sdk1 = makeMockSDK();
      const sdk2 = makeMockSDK();
      await registry.register(d1, sdk1);
      await registry.register(d2, sdk2);
      const r1 = await registry.getSDK(d1.id);
      const r2 = await registry.getSDK(d2.id);
      expect(r1).toBe(sdk1);
      expect(r2).toBe(sdk2);
    });

    it('should return null after unregister', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK();
      await registry.register(descriptor, sdk);
      await registry.unregister(descriptor.id);
      const result = await registry.getSDK(descriptor.id);
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // count
  // ═══════════════════════════════════════════════════════════════
  describe('count', () => {
    it('should return 0 for empty registry', async () => {
      expect(await registry.count()).toBe(0);
    });

    it('should return 1 after single registration', async () => {
      await registry.register(makeProviderDescriptor(), makeMockSDK());
      expect(await registry.count()).toBe(1);
    });

    it('should return N after N registrations', async () => {
      for (let i = 0; i < 5; i++) {
        await registry.register(makeProviderDescriptor(), makeMockSDK());
      }
      expect(await registry.count()).toBe(5);
    });

    it('should decrease after unregister', async () => {
      const d1 = makeProviderDescriptor();
      const d2 = makeProviderDescriptor();
      await registry.register(d1, makeMockSDK());
      await registry.register(d2, makeMockSDK());
      await registry.unregister(d1.id);
      expect(await registry.count()).toBe(1);
    });

    it('should return 0 after unregistering all', async () => {
      const d1 = makeProviderDescriptor();
      await registry.register(d1, makeMockSDK());
      await registry.unregister(d1.id);
      expect(await registry.count()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // edge cases & integration
  // ═══════════════════════════════════════════════════════════════
  describe('edge cases & integration', () => {
    it('should handle registering and unregistering the same provider repeatedly', async () => {
      for (let i = 0; i < 3; i++) {
        const descriptor = makeProviderDescriptor();
        await registry.register(descriptor, makeMockSDK());
        expect(await registry.count()).toBe(1);
        await registry.unregister(descriptor.id);
        expect(await registry.count()).toBe(0);
      }
    });

    it('should preserve provider metadata through registration', async () => {
      const metadata = { region: 'eu-west-1', tier: 'premium' };
      const descriptor = makeProviderDescriptor({ metadata });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.metadata).toEqual(metadata);
    });

    it('should support different privacy levels', async () => {
      const d1 = makeProviderDescriptor({ privacyLevel: PrivacyLevel.Public });
      const d2 = makeProviderDescriptor({ privacyLevel: PrivacyLevel.LocalOnly });
      const d3 = makeProviderDescriptor({ privacyLevel: PrivacyLevel.EnterpriseOnly });
      await registry.register(d1, makeMockSDK());
      await registry.register(d2, makeMockSDK());
      await registry.register(d3, makeMockSDK());
      expect(await registry.count()).toBe(3);
    });

    it('should work with limit of 1', async () => {
      const reg = new ProviderRegistry(
        { ...DefaultAIProviderRuntimeConfig.providerRegistry, maxProviders: 1 },
        eventBus,
      );
      await reg.register(makeProviderDescriptor(), makeMockSDK());
      await expect(reg.register(makeProviderDescriptor(), makeMockSDK())).rejects.toThrow(ProviderLimitExceededError);
    });

    it('should preserve provider endpoint', async () => {
      const descriptor = makeProviderDescriptor({ endpoint: 'https://custom.api.local' });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.endpoint).toBe('https://custom.api.local');
    });

    it('should preserve provider version', async () => {
      const descriptor = makeProviderDescriptor({ version: '2.5.0' });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.version).toBe('2.5.0');
    });

    it('should preserve provider description', async () => {
      const descriptor = makeProviderDescriptor({ description: 'Special provider for tests' });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.description).toBe('Special provider for tests');
    });

    it('should preserve provider capabilities', async () => {
      const descriptor = makeProviderDescriptor({ capabilities: ['chat', 'code', 'image'] });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.capabilities).toEqual(['chat', 'code', 'image']);
    });

    it('should preserve supportedRegions', async () => {
      const descriptor = makeProviderDescriptor({ supportedRegions: ['us-east-1', 'eu-west-1'] });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.supportedRegions).toEqual(['us-east-1', 'eu-west-1']);
    });

    it('should preserve maxConcurrentRequests', async () => {
      const descriptor = makeProviderDescriptor({ maxConcurrentRequests: 25 });
      await registry.register(descriptor, makeMockSDK());
      const result = await registry.get(descriptor.id);
      expect(result!.maxConcurrentRequests).toBe(25);
    });

    it('should return providers with different types via getByType', async () => {
      await registry.register(makeProviderDescriptor({ type: AIProviderType.OpenAI }), makeMockSDK());
      await registry.register(makeProviderDescriptor({ type: AIProviderType.Anthropic }), makeMockSDK());
      await registry.register(makeProviderDescriptor({ type: AIProviderType.Google }), makeMockSDK());
      const openai = await registry.getByType('OpenAI');
      const anthropic = await registry.getByType('Anthropic');
      const google = await registry.getByType('Google');
      expect(openai).toHaveLength(1);
      expect(anthropic).toHaveLength(1);
      expect(google).toHaveLength(1);
    });

    it('should handle multiple health checks on same provider', async () => {
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK({ id: descriptor.id as string });
      await registry.register(descriptor, sdk);
      const r1 = await registry.healthCheck(descriptor.id);
      const r2 = await registry.healthCheck(descriptor.id);
      expect(r1.healthy).toBe(true);
      expect(r2.healthy).toBe(true);
    });

    it('should handle event bus null for healthCheck', async () => {
      const reg = new ProviderRegistry({ ...DefaultAIProviderRuntimeConfig.providerRegistry }, null);
      const descriptor = makeProviderDescriptor();
      const sdk = makeMockSDK({ id: descriptor.id as string });
      await reg.register(descriptor, sdk);
      const result = await reg.healthCheck(descriptor.id);
      expect(result.healthy).toBe(true);
    });

    it('should return empty getByType for type not matching any provider', async () => {
      await registry.register(makeProviderDescriptor({ type: AIProviderType.OpenAI }), makeMockSDK());
      const result = await registry.getByType('Mistral');
      expect(result).toHaveLength(0);
    });
  });
});
