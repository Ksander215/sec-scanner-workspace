import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModelRegistry } from '../../core/ai-provider/model-registry.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  ModelCapability,
  PrivacyLevel,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';
import {
  ModelAlreadyRegisteredError,
  ModelNotFoundError,
} from '../../core/ai-provider/errors.js';

// ─── Factory helpers ─────────────────────────────────────────────

function makeModelDescriptor(overrides?: Partial<Types.ModelDescriptor>): Types.ModelDescriptor {
  return Object.freeze({
    id: crypto.randomUUID() as Types.ModelId,
    providerId: crypto.randomUUID() as Types.ProviderId,
    name: `Model-${crypto.randomUUID().slice(0, 8)}`,
    family: 'gpt',
    version: '1.0.0',
    capabilities: [ModelCapability.TextGeneration, ModelCapability.Streaming],
    tokenLimit: 128000,
    supportsVision: false,
    supportsTools: true,
    supportsJSON: true,
    supportsStreaming: true,
    supportsAudio: false,
    supportsReasoning: false,
    supportsEmbeddings: false,
    supportsFunctionCalling: false,
    privacyLevel: PrivacyLevel.Public,
    costProfile: Object.freeze({
      inputCostPer1kTokens: 0.03,
      outputCostPer1kTokens: 0.06,
      cachedInputCostPer1kTokens: 0.01,
      reasoningCostPer1kTokens: 0.02,
      imageCostPerUnit: 0,
      audioCostPerMinute: 0,
      currency: 'USD',
    }),
    latencyProfile: Object.freeze({
      averageMs: 10,
      p50Ms: 10,
      p95Ms: 20,
      p99Ms: 50,
      timeoutMs: 60000,
    }),
    available: true,
    metadata: {},
    registeredAt: new Date().toISOString(),
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('ModelRegistry', () => {
  let registry: ModelRegistry;
  let eventBus: InProcessEventBus;
  const providerId = crypto.randomUUID() as Types.ProviderId;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    registry = new ModelRegistry(
      { ...DefaultAIProviderRuntimeConfig.modelRegistry },
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
    it('should register a model successfully', async () => {
      const descriptor = makeModelDescriptor({ providerId });
      await registry.register(descriptor);
      expect(await registry.count()).toBe(1);
    });

    it('should throw ModelAlreadyRegisteredError for duplicate id', async () => {
      const id = crypto.randomUUID() as Types.ModelId;
      const d1 = makeModelDescriptor({ id, providerId });
      const d2 = makeModelDescriptor({ id, providerId });
      await registry.register(d1);
      await expect(registry.register(d2)).rejects.toThrow(ModelAlreadyRegisteredError);
    });

    it('should not increment count on duplicate', async () => {
      const id = crypto.randomUUID() as Types.ModelId;
      const d1 = makeModelDescriptor({ id, providerId });
      const d2 = makeModelDescriptor({ id, providerId });
      await registry.register(d1);
      try { await registry.register(d2); } catch { /* expected */ }
      expect(await registry.count()).toBe(1);
    });

    it('should throw when maxModelsPerProvider exceeded', async () => {
      const config = { ...DefaultAIProviderRuntimeConfig.modelRegistry, maxModelsPerProvider: 2 };
      const reg = new ModelRegistry(config, eventBus);
      await reg.register(makeModelDescriptor({ providerId }));
      await reg.register(makeModelDescriptor({ providerId }));
      await expect(reg.register(makeModelDescriptor({ providerId }))).rejects.toThrow(ModelAlreadyRegisteredError);
    });

    it('should allow models from different providers under limit', async () => {
      const config = { ...DefaultAIProviderRuntimeConfig.modelRegistry, maxModelsPerProvider: 2 };
      const reg = new ModelRegistry(config, eventBus);
      const pid1 = crypto.randomUUID() as Types.ProviderId;
      const pid2 = crypto.randomUUID() as Types.ProviderId;
      await reg.register(makeModelDescriptor({ providerId: pid1 }));
      await reg.register(makeModelDescriptor({ providerId: pid1 }));
      await reg.register(makeModelDescriptor({ providerId: pid2 }));
      expect(await reg.count()).toBe(3);
    });

    it('should publish model.registered event', async () => {
      const descriptor = makeModelDescriptor({ providerId });
      await registry.register(descriptor);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'model.registered')).toBe(true);
    });

    it('should work without event bus', async () => {
      const reg = new ModelRegistry({ ...DefaultAIProviderRuntimeConfig.modelRegistry });
      await reg.register(makeModelDescriptor({ providerId }));
      expect(await reg.count()).toBe(1);
    });

    it('should register model with LocalOnly privacy', async () => {
      const d = makeModelDescriptor({ privacyLevel: PrivacyLevel.LocalOnly, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.privacyLevel).toBe(PrivacyLevel.LocalOnly);
    });

    it('should register model with multiple capabilities', async () => {
      const d = makeModelDescriptor({
        capabilities: [ModelCapability.TextGeneration, ModelCapability.Vision, ModelCapability.Tools],
        providerId,
      });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.capabilities).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // unregister
  // ═══════════════════════════════════════════════════════════════
  describe('unregister', () => {
    it('should unregister a registered model', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      await registry.unregister(d.id);
      expect(await registry.count()).toBe(0);
    });

    it('should throw ModelNotFoundError for missing model', async () => {
      await expect(registry.unregister(crypto.randomUUID() as Types.ModelId)).rejects.toThrow(ModelNotFoundError);
    });

    it('should remove model from get lookup', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      await registry.unregister(d.id);
      expect(await registry.get(d.id)).toBeNull();
    });

    it('should clear default model when default is unregistered', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      await registry.setDefaultModel(d.id);
      expect(await registry.getDefaultModel()).not.toBeNull();
      await registry.unregister(d.id);
      expect(await registry.getDefaultModel()).toBeNull();
    });

    it('should publish model.unregistered event', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      eventBus.clear();
      await registry.unregister(d.id);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'model.unregistered')).toBe(true);
    });

    it('should not affect other models', async () => {
      const d1 = makeModelDescriptor({ providerId });
      const d2 = makeModelDescriptor({ providerId });
      await registry.register(d1);
      await registry.register(d2);
      await registry.unregister(d1.id);
      expect(await registry.count()).toBe(1);
      expect(await registry.get(d2.id)).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // get
  // ═══════════════════════════════════════════════════════════════
  describe('get', () => {
    it('should return descriptor for registered model', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(d.id);
    });

    it('should return null for unknown model', async () => {
      const result = await registry.get(crypto.randomUUID() as Types.ModelId);
      expect(result).toBeNull();
    });

    it('should return model with correct name', async () => {
      const d = makeModelDescriptor({ name: 'GPT-4-Turbo', providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.name).toBe('GPT-4-Turbo');
    });

    it('should return model with correct family', async () => {
      const d = makeModelDescriptor({ family: 'claude', providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.family).toBe('claude');
    });

    it('should return frozen descriptor', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(Object.isFrozen(result!)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getByName
  // ═══════════════════════════════════════════════════════════════
  describe('getByName', () => {
    it('should find model by name', async () => {
      const d = makeModelDescriptor({ name: 'Claude-3-Opus', providerId });
      await registry.register(d);
      const result = await registry.getByName('Claude-3-Opus');
      expect(result).not.toBeNull();
      expect(result!.id).toBe(d.id);
    });

    it('should return null for unknown name', async () => {
      const result = await registry.getByName('NonExistent');
      expect(result).toBeNull();
    });

    it('should return first match for duplicate names', async () => {
      const d1 = makeModelDescriptor({ name: 'SameName', providerId });
      const d2 = makeModelDescriptor({ name: 'SameName', providerId });
      await registry.register(d1);
      await registry.register(d2);
      const result = await registry.getByName('SameName');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('SameName');
    });

    it('should find among many registered models', async () => {
      const target = makeModelDescriptor({ name: 'TargetModel', providerId });
      await registry.register(makeModelDescriptor({ providerId }));
      await registry.register(target);
      await registry.register(makeModelDescriptor({ providerId }));
      const result = await registry.getByName('TargetModel');
      expect(result!.id).toBe(target.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // list
  // ═══════════════════════════════════════════════════════════════
  describe('list', () => {
    it('should return empty array when no models', async () => {
      const result = await registry.list();
      expect(result).toHaveLength(0);
    });

    it('should return all models with no filter', async () => {
      await registry.register(makeModelDescriptor({ providerId }));
      await registry.register(makeModelDescriptor({ providerId }));
      expect((await registry.list()).length).toBe(2);
    });

    it('should filter by providerId', async () => {
      const pid1 = crypto.randomUUID() as Types.ProviderId;
      const pid2 = crypto.randomUUID() as Types.ProviderId;
      await registry.register(makeModelDescriptor({ providerId: pid1 }));
      await registry.register(makeModelDescriptor({ providerId: pid1 }));
      await registry.register(makeModelDescriptor({ providerId: pid2 }));
      const result = await registry.list({ providerId: pid1 });
      expect(result).toHaveLength(2);
    });

    it('should filter by capability', async () => {
      await registry.register(makeModelDescriptor({
        capabilities: [ModelCapability.TextGeneration],
        providerId,
      }));
      await registry.register(makeModelDescriptor({
        capabilities: [ModelCapability.Vision, ModelCapability.TextGeneration],
        providerId,
      }));
      await registry.register(makeModelDescriptor({
        capabilities: [ModelCapability.Embeddings],
        providerId,
      }));
      const result = await registry.list({ capability: ModelCapability.TextGeneration });
      expect(result).toHaveLength(2);
    });

    it('should filter by privacyLevel', async () => {
      await registry.register(makeModelDescriptor({ privacyLevel: PrivacyLevel.Public, providerId }));
      await registry.register(makeModelDescriptor({ privacyLevel: PrivacyLevel.LocalOnly, providerId }));
      const result = await registry.list({ privacyLevel: PrivacyLevel.LocalOnly });
      expect(result).toHaveLength(1);
    });

    it('should filter by minTokenLimit', async () => {
      await registry.register(makeModelDescriptor({ tokenLimit: 8000, providerId }));
      await registry.register(makeModelDescriptor({ tokenLimit: 128000, providerId }));
      await registry.register(makeModelDescriptor({ tokenLimit: 200000, providerId }));
      const result = await registry.list({ minTokenLimit: 100000 });
      expect(result).toHaveLength(2);
    });

    it('should filter by availableOnly', async () => {
      await registry.register(makeModelDescriptor({ available: true, providerId }));
      await registry.register(makeModelDescriptor({ available: true, providerId }));
      await registry.register(makeModelDescriptor({ available: false, providerId }));
      const result = await registry.list({ availableOnly: true });
      expect(result).toHaveLength(2);
    });

    it('should filter by family', async () => {
      await registry.register(makeModelDescriptor({ family: 'gpt', providerId }));
      await registry.register(makeModelDescriptor({ family: 'claude', providerId }));
      await registry.register(makeModelDescriptor({ family: 'gpt', providerId }));
      const result = await registry.list({ family: 'gpt' });
      expect(result).toHaveLength(2);
    });

    it('should combine multiple filters', async () => {
      await registry.register(makeModelDescriptor({
        family: 'gpt', privacyLevel: PrivacyLevel.Public, tokenLimit: 128000, available: true, providerId,
      }));
      await registry.register(makeModelDescriptor({
        family: 'gpt', privacyLevel: PrivacyLevel.LocalOnly, tokenLimit: 128000, available: true, providerId,
      }));
      const result = await registry.list({ family: 'gpt', privacyLevel: PrivacyLevel.Public });
      expect(result).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // listByProvider
  // ═══════════════════════════════════════════════════════════════
  describe('listByProvider', () => {
    it('should return models for given provider', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      await registry.register(makeModelDescriptor({ providerId: pid }));
      await registry.register(makeModelDescriptor({ providerId: pid }));
      expect((await registry.listByProvider(pid)).length).toBe(2);
    });

    it('should return empty array for provider with no models', async () => {
      const result = await registry.listByProvider(crypto.randomUUID() as Types.ProviderId);
      expect(result).toHaveLength(0);
    });

    it('should not return models from other providers', async () => {
      const pid1 = crypto.randomUUID() as Types.ProviderId;
      const pid2 = crypto.randomUUID() as Types.ProviderId;
      await registry.register(makeModelDescriptor({ providerId: pid1 }));
      await registry.register(makeModelDescriptor({ providerId: pid2 }));
      expect((await registry.listByProvider(pid1)).length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getByCapability
  // ═══════════════════════════════════════════════════════════════
  describe('getByCapability', () => {
    it('should return models with given capability', async () => {
      await registry.register(makeModelDescriptor({ capabilities: [ModelCapability.TextGeneration], providerId }));
      await registry.register(makeModelDescriptor({
        capabilities: [ModelCapability.TextGeneration, ModelCapability.Vision], providerId,
      }));
      await registry.register(makeModelDescriptor({ capabilities: [ModelCapability.Embeddings], providerId }));
      const result = await registry.getByCapability(ModelCapability.TextGeneration);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for unmatched capability', async () => {
      await registry.register(makeModelDescriptor({ capabilities: [ModelCapability.TextGeneration], providerId }));
      const result = await registry.getByCapability(ModelCapability.Vision);
      expect(result).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getDefaultModel / setDefaultModel
  // ═══════════════════════════════════════════════════════════════
  describe('getDefaultModel', () => {
    it('should return null when no default is set', async () => {
      expect(await registry.getDefaultModel()).toBeNull();
    });

    it('should return default model after setting', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      await registry.setDefaultModel(d.id);
      const result = await registry.getDefaultModel();
      expect(result).not.toBeNull();
      expect(result!.id).toBe(d.id);
    });

    it('should return null after unregistering default model', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      await registry.setDefaultModel(d.id);
      await registry.unregister(d.id);
      expect(await registry.getDefaultModel()).toBeNull();
    });
  });

  describe('setDefaultModel', () => {
    it('should set default model successfully', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      await registry.setDefaultModel(d.id);
      expect((await registry.getDefaultModel())!.id).toBe(d.id);
    });

    it('should throw ModelNotFoundError for unknown model', async () => {
      await expect(registry.setDefaultModel(crypto.randomUUID() as Types.ModelId)).rejects.toThrow(ModelNotFoundError);
    });

    it('should allow changing default model', async () => {
      const d1 = makeModelDescriptor({ providerId });
      const d2 = makeModelDescriptor({ providerId });
      await registry.register(d1);
      await registry.register(d2);
      await registry.setDefaultModel(d1.id);
      await registry.setDefaultModel(d2.id);
      expect((await registry.getDefaultModel())!.id).toBe(d2.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // setModelAvailability
  // ═══════════════════════════════════════════════════════════════
  describe('setModelAvailability', () => {
    it('should set available to false', async () => {
      const d = makeModelDescriptor({ providerId, available: true });
      await registry.register(d);
      await registry.setModelAvailability(d.id, false);
      const result = await registry.get(d.id);
      expect(result!.available).toBe(false);
    });

    it('should set available to true', async () => {
      const d = makeModelDescriptor({ providerId, available: false });
      await registry.register(d);
      await registry.setModelAvailability(d.id, true);
      const result = await registry.get(d.id);
      expect(result!.available).toBe(true);
    });

    it('should throw ModelNotFoundError for unknown model', async () => {
      await expect(registry.setModelAvailability(crypto.randomUUID() as Types.ModelId, true)).rejects.toThrow(ModelNotFoundError);
    });

    it('should publish model.availability-changed event', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      eventBus.clear();
      await registry.setModelAvailability(d.id, false);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'model.availability-changed')).toBe(true);
    });

    it('should preserve other descriptor properties when updating availability', async () => {
      const d = makeModelDescriptor({ name: 'PreserveName', providerId, available: true });
      await registry.register(d);
      await registry.setModelAvailability(d.id, false);
      const result = await registry.get(d.id);
      expect(result!.name).toBe('PreserveName');
      expect(result!.tokenLimit).toBe(d.tokenLimit);
    });

    it('should reflect updated availability in list with filter', async () => {
      const d1 = makeModelDescriptor({ providerId, available: true });
      const d2 = makeModelDescriptor({ providerId, available: true });
      await registry.register(d1);
      await registry.register(d2);
      await registry.setModelAvailability(d1.id, false);
      const available = await registry.list({ availableOnly: true });
      expect(available).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // count
  // ═══════════════════════════════════════════════════════════════
  describe('count', () => {
    it('should return 0 when empty', async () => {
      expect(await registry.count()).toBe(0);
    });

    it('should return correct count after registrations', async () => {
      await registry.register(makeModelDescriptor({ providerId }));
      await registry.register(makeModelDescriptor({ providerId }));
      await registry.register(makeModelDescriptor({ providerId }));
      expect(await registry.count()).toBe(3);
    });

    it('should count with filter', async () => {
      const pid1 = crypto.randomUUID() as Types.ProviderId;
      const pid2 = crypto.randomUUID() as Types.ProviderId;
      await registry.register(makeModelDescriptor({ providerId: pid1 }));
      await registry.register(makeModelDescriptor({ providerId: pid1 }));
      await registry.register(makeModelDescriptor({ providerId: pid2 }));
      expect(await registry.count({ providerId: pid1 })).toBe(2);
    });

    it('should decrease after unregister', async () => {
      const d = makeModelDescriptor({ providerId });
      await registry.register(d);
      await registry.unregister(d.id);
      expect(await registry.count()).toBe(0);
    });

    it('should count with privacyLevel filter', async () => {
      await registry.register(makeModelDescriptor({ privacyLevel: PrivacyLevel.Public, providerId }));
      await registry.register(makeModelDescriptor({ privacyLevel: PrivacyLevel.LocalOnly, providerId }));
      await registry.register(makeModelDescriptor({ privacyLevel: PrivacyLevel.LocalOnly, providerId }));
      expect(await registry.count({ privacyLevel: PrivacyLevel.LocalOnly })).toBe(2);
    });

    it('should count with availableOnly filter', async () => {
      await registry.register(makeModelDescriptor({ available: true, providerId }));
      await registry.register(makeModelDescriptor({ available: false, providerId }));
      await registry.register(makeModelDescriptor({ available: true, providerId }));
      expect(await registry.count({ availableOnly: true })).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // edge cases
  // ═══════════════════════════════════════════════════════════════
  describe('edge cases', () => {
    it('should handle registering and unregistering the same model repeatedly', async () => {
      for (let i = 0; i < 3; i++) {
        const d = makeModelDescriptor({ providerId });
        await registry.register(d);
        expect(await registry.count()).toBe(1);
        await registry.unregister(d.id);
        expect(await registry.count()).toBe(0);
      }
    });

    it('should preserve model version', async () => {
      const d = makeModelDescriptor({ version: '2.1.0', providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.version).toBe('2.1.0');
    });

    it('should preserve tokenLimit', async () => {
      const d = makeModelDescriptor({ tokenLimit: 32768, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.tokenLimit).toBe(32768);
    });

    it('should preserve supportsVision', async () => {
      const d = makeModelDescriptor({ supportsVision: true, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.supportsVision).toBe(true);
    });

    it('should preserve supportsTools', async () => {
      const d = makeModelDescriptor({ supportsTools: true, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.supportsTools).toBe(true);
    });

    it('should preserve supportsStreaming', async () => {
      const d = makeModelDescriptor({ supportsStreaming: false, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.supportsStreaming).toBe(false);
    });

    it('should preserve supportsAudio', async () => {
      const d = makeModelDescriptor({ supportsAudio: true, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.supportsAudio).toBe(true);
    });

    it('should preserve supportsReasoning', async () => {
      const d = makeModelDescriptor({ supportsReasoning: true, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.supportsReasoning).toBe(true);
    });

    it('should preserve costProfile', async () => {
      const d = makeModelDescriptor({
        providerId,
        costProfile: Object.freeze({
          inputCostPer1kTokens: 0.05,
          outputCostPer1kTokens: 0.15,
          cachedInputCostPer1kTokens: 0.02,
          reasoningCostPer1kTokens: 0.03,
          imageCostPerUnit: 0.1,
          audioCostPerMinute: 0.05,
          currency: 'EUR',
        }),
      });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.costProfile.currency).toBe('EUR');
      expect(result!.costProfile.inputCostPer1kTokens).toBe(0.05);
    });

    it('should preserve latencyProfile', async () => {
      const d = makeModelDescriptor({
        providerId,
        latencyProfile: Object.freeze({
          averageMs: 50, p50Ms: 45, p95Ms: 100, p99Ms: 200, timeoutMs: 120000,
        }),
      });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.latencyProfile.averageMs).toBe(50);
      expect(result!.latencyProfile.timeoutMs).toBe(120000);
    });

    it('should preserve metadata', async () => {
      const meta = { tier: 'premium', region: 'us-east-1' };
      const d = makeModelDescriptor({ metadata: meta, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.metadata).toEqual(meta);
    });

    it('should handle models with empty capabilities', async () => {
      const d = makeModelDescriptor({ capabilities: [], providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.capabilities).toHaveLength(0);
    });

    it('should preserve registeredAt', async () => {
      const ts = '2024-06-15T12:00:00Z';
      const d = makeModelDescriptor({ registeredAt: ts, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.registeredAt).toBe(ts);
    });

    it('should list models with correct provider association', async () => {
      const pid1 = crypto.randomUUID() as Types.ProviderId;
      const pid2 = crypto.randomUUID() as Types.ProviderId;
      await registry.register(makeModelDescriptor({ providerId: pid1, name: 'Model-A' }));
      await registry.register(makeModelDescriptor({ providerId: pid2, name: 'Model-B' }));
      const byP1 = await registry.listByProvider(pid1);
      const byP2 = await registry.listByProvider(pid2);
      expect(byP1[0].providerId).toBe(pid1);
      expect(byP2[0].providerId).toBe(pid2);
    });

    it('should handle setDefaultModel after multiple registrations', async () => {
      const d1 = makeModelDescriptor({ providerId });
      const d2 = makeModelDescriptor({ providerId });
      const d3 = makeModelDescriptor({ providerId });
      await registry.register(d1);
      await registry.register(d2);
      await registry.register(d3);
      await registry.setDefaultModel(d2.id);
      expect((await registry.getDefaultModel())!.id).toBe(d2.id);
      await registry.setDefaultModel(d1.id);
      expect((await registry.getDefaultModel())!.id).toBe(d1.id);
    });

    it('should handle setModelAvailability toggling', async () => {
      const d = makeModelDescriptor({ providerId, available: true });
      await registry.register(d);
      await registry.setModelAvailability(d.id, false);
      expect((await registry.get(d.id))!.available).toBe(false);
      await registry.setModelAvailability(d.id, true);
      expect((await registry.get(d.id))!.available).toBe(true);
    });

    it('should publish events correctly when available changes twice', async () => {
      const d = makeModelDescriptor({ providerId, available: true });
      await registry.register(d);
      eventBus.clear();
      await registry.setModelAvailability(d.id, false);
      await registry.setModelAvailability(d.id, true);
      const log = eventBus.getLog();
      const events = log.filter(e => e.eventType === 'model.availability-changed');
      expect(events).toHaveLength(2);
    });

    it('should handle empty listByProvider result', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      const result = await registry.listByProvider(pid);
      expect(result).toHaveLength(0);
    });

    it('should handle empty getByCapability result', async () => {
      const result = await registry.getByCapability('NonExistentCapability');
      expect(result).toHaveLength(0);
    });

    it('should handle get with registered model', async () => {
      const d = makeModelDescriptor({ name: 'GetTestModel', providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('GetTestModel');
    });

    it('should count all models without filter', async () => {
      await registry.register(makeModelDescriptor({ providerId }));
      await registry.register(makeModelDescriptor({ providerId }));
      await registry.register(makeModelDescriptor({ providerId }));
      await registry.register(makeModelDescriptor({ providerId }));
      expect(await registry.count()).toBe(4);
    });

    it('should preserve supportsFunctionCalling', async () => {
      const d = makeModelDescriptor({ supportsFunctionCalling: true, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.supportsFunctionCalling).toBe(true);
    });

    it('should preserve supportsEmbeddings', async () => {
      const d = makeModelDescriptor({ supportsEmbeddings: true, providerId });
      await registry.register(d);
      const result = await registry.get(d.id);
      expect(result!.supportsEmbeddings).toBe(true);
    });
  });
});
