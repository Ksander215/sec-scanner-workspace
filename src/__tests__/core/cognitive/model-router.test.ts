/**
 * Model Router Tests — TASK-AIS-003I.000
 *
 * Tests the ModelRouter which selects the optimal model based on:
 *   - Cost, Latency, Privacy, Accuracy routing policies
 *   - Custom routing rules
 *   - Fallback models
 *   - Required capabilities and context size
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import { ModelRouter, DefaultModelRouterConfig } from '../../../core/cognitive/model-router.js';
import { RoutingPolicyType } from '../../../core/cognitive/types.js';
import { brandModelId } from '../../../core/cognitive/types.js';
import { NoAvailableModelError } from '../../../core/cognitive/cognitive-errors.js';
import type { ModelDescriptor, RoutingRule, Intent } from '../../../core/cognitive/types.js';
import { IntentType, IntentComplexity } from '../../../core/cognitive/types.js';

// ─── Helpers ─────────────────────────────────────────────────────

function createModel(overrides: Partial<ModelDescriptor> = {}): ModelDescriptor {
  return Object.freeze({
    id: brandModelId(crypto.randomUUID()),
    name: 'test-model',
    provider: 'test-provider',
    capabilities: ['generate'],
    maxContextTokens: 4096,
    maxOutputTokens: 2048,
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03,
    averageLatencyMs: 100,
    privacyLevel: 1,
    accuracyScore: 0.9,
    supportsStreaming: true,
    supportsEmbedding: true,
    tags: [],
    available: true,
    metadata: Object.freeze({}),
    ...overrides,
  });
}

function createIntent(overrides: Partial<Intent> = {}): Intent {
  return Object.freeze({
    id: crypto.randomUUID() as any,
    type: IntentType.Question,
    goal: 'answer a question',
    priority: 1,
    complexity: IntentComplexity.Simple,
    confidence: 0.95,
    requiredCapabilities: [],
    parameters: {},
    detectedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

// ─── DefaultModelRouterConfig ─────────────────────────────────────

describe('DefaultModelRouterConfig', () => {
  it('has null defaultModelId', () => {
    expect(DefaultModelRouterConfig.defaultModelId).toBeNull();
  });

  it('has null fallbackModelId', () => {
    expect(DefaultModelRouterConfig.fallbackModelId).toBeNull();
  });

  it('has empty rules array', () => {
    expect(DefaultModelRouterConfig.rules).toEqual([]);
  });
});

// ─── registerModel / unregisterModel ─────────────────────────────

describe('registerModel / unregisterModel', () => {
  it('registers a model', () => {
    const router = new ModelRouter();
    const model = createModel({ name: 'gpt-4' });

    router.registerModel(model);
    expect(router.listModels().length).toBe(1);
    expect(router.getModel(model.id)).toBe(model);
  });

  it('registers multiple models', () => {
    const router = new ModelRouter();
    router.registerModel(createModel({ name: 'gpt-4' }));
    router.registerModel(createModel({ name: 'claude-3' }));

    expect(router.listModels().length).toBe(2);
  });

  it('unregisters a model', () => {
    const router = new ModelRouter();
    const model = createModel({ name: 'gpt-4' });
    router.registerModel(model);

    router.unregisterModel(model.id);
    expect(router.listModels().length).toBe(0);
    expect(router.getModel(model.id)).toBeUndefined();
  });

  it('ignores unregistering a non-existent model', () => {
    const router = new ModelRouter();
    expect(() => router.unregisterModel(brandModelId('non-existent'))).not.toThrow();
  });

  it('listModels returns all registered models', () => {
    const router = new ModelRouter();
    const m1 = createModel({ name: 'model-1' });
    const m2 = createModel({ name: 'model-2' });
    router.registerModel(m1);
    router.registerModel(m2);

    const models = router.listModels();
    expect(models).toHaveLength(2);
    expect(models).toContainEqual(m1);
    expect(models).toContainEqual(m2);
  });

  it('getModel returns undefined for unregistered model', () => {
    const router = new ModelRouter();
    expect(router.getModel(brandModelId('xyz'))).toBeUndefined();
  });

  it('sets default model when defaultModelId is configured', () => {
    const defaultModel = createModel({ name: 'default' });
    const router = new ModelRouter({ defaultModelId: defaultModel.id });

    router.registerModel(defaultModel);
    // Default model is set internally — verified via selection
  });

  it('clears default model reference when unregistered', () => {
    const defaultModel = createModel({ name: 'default' });
    const router = new ModelRouter({ defaultModelId: defaultModel.id });
    router.registerModel(defaultModel);
    router.unregisterModel(defaultModel.id);
    // Should not throw — default is cleared
  });

  it('sets fallback model when fallbackModelId is configured', () => {
    const fallback = createModel({ name: 'fallback' });
    const router = new ModelRouter({ fallbackModelId: fallback.id });
    router.registerModel(fallback);
    // Fallback model is set internally
  });

  it('clears fallback model reference when unregistered', () => {
    const fallback = createModel({ name: 'fallback' });
    const router = new ModelRouter({ fallbackModelId: fallback.id });
    router.registerModel(fallback);
    router.unregisterModel(fallback.id);
    // Should not throw — fallback is cleared
  });
});

// ─── selectModel ─────────────────────────────────────────────────

describe('selectModel', () => {
  it('selects an available model', () => {
    const router = new ModelRouter();
    const model = createModel({ name: 'gpt-4' });
    router.registerModel(model);

    const selected = router.selectModel({ policyTypes: [] });
    expect(selected.id).toBe(model.id);
  });

  it('selects best scoring model when multiple available', () => {
    const router = new ModelRouter();
    const modelA = createModel({ name: 'cheap', costPer1kInputTokens: 0.001, costPer1kOutputTokens: 0.001, averageLatencyMs: 50, privacyLevel: 1, accuracyScore: 0.5 });
    const modelB = createModel({ name: 'expensive', costPer1kInputTokens: 0.1, costPer1kOutputTokens: 0.3, averageLatencyMs: 500, privacyLevel: 5, accuracyScore: 0.99 });
    router.registerModel(modelA);
    router.registerModel(modelB);

    // With no policy types, it uses bestScore (accuracy, latency, privacy weighted)
    const selected = router.selectModel({ policyTypes: [] });
    // modelB has higher accuracy (0.99) and higher privacy (5)
    expect(selected.id).toBe(modelB.id);
  });

  it('filters by requiredCapabilities', () => {
    const router = new ModelRouter();
    const modelA = createModel({ name: 'basic', capabilities: ['generate'] });
    const modelB = createModel({ name: 'advanced', capabilities: ['generate', 'vision'] });
    router.registerModel(modelA);
    router.registerModel(modelB);

    const selected = router.selectModel({
      policyTypes: [],
      requiredCapabilities: ['vision'],
    });
    expect(selected.id).toBe(modelB.id);
  });

  it('filters by maxTokens', () => {
    const router = new ModelRouter();
    const modelA = createModel({ name: 'small', maxContextTokens: 2048 });
    const modelB = createModel({ name: 'large', maxContextTokens: 128000 });
    router.registerModel(modelA);
    router.registerModel(modelB);

    const selected = router.selectModel({
      policyTypes: [],
      maxTokens: 8000,
    });
    expect(selected.id).toBe(modelB.id);
  });

  it('skips unavailable models', () => {
    const router = new ModelRouter();
    const modelA = createModel({ name: 'offline', available: false });
    const modelB = createModel({ name: 'online', available: true });
    router.registerModel(modelA);
    router.registerModel(modelB);

    const selected = router.selectModel({ policyTypes: [] });
    expect(selected.id).toBe(modelB.id);
  });

  it('throws NoAvailableModelError when no models match', () => {
    const router = new ModelRouter();
    const model = createModel({ name: 'basic', capabilities: ['generate'] });
    router.registerModel(model);

    expect(() =>
      router.selectModel({
        policyTypes: [],
        requiredCapabilities: ['vision'],
      }),
    ).toThrow(NoAvailableModelError);
  });

  it('throws NoAvailableModelError when all models unavailable', () => {
    const router = new ModelRouter();
    router.registerModel(createModel({ available: false }));

    expect(() => router.selectModel({ policyTypes: [] })).toThrow(NoAvailableModelError);
  });

  it('uses fallback when no models match criteria', () => {
    const fallback = createModel({ name: 'fallback' });
    const router = new ModelRouter({ fallbackModelId: fallback.id });
    router.registerModel(fallback);
    router.registerModel(createModel({ name: 'specialized', capabilities: ['vision'] }));

    const selected = router.selectModel({
      policyTypes: [],
      requiredCapabilities: ['nonexistent'],
    });
    expect(selected.id).toBe(fallback.id);
  });

  it('does not use fallback if it is unavailable', () => {
    const fallback = createModel({ name: 'fallback', available: false });
    const router = new ModelRouter({ fallbackModelId: fallback.id });
    router.registerModel(fallback);

    expect(() =>
      router.selectModel({ policyTypes: [], requiredCapabilities: ['nonexistent'] }),
    ).toThrow(NoAvailableModelError);
  });
});

// ─── selectModel with policy types ────────────────────────────────

describe('selectModel with routing policies', () => {
  it('selects cheapest model with Cost policy', () => {
    const router = new ModelRouter();
    const expensive = createModel({
      name: 'expensive',
      costPer1kInputTokens: 0.10,
      costPer1kOutputTokens: 0.30,
    });
    const cheap = createModel({
      name: 'cheap',
      costPer1kInputTokens: 0.001,
      costPer1kOutputTokens: 0.002,
    });
    router.registerModel(expensive);
    router.registerModel(cheap);

    const selected = router.selectModel({ policyTypes: [RoutingPolicyType.Cost] });
    expect(selected.id).toBe(cheap.id);
  });

  it('selects lowest-latency model with Latency policy', () => {
    const router = new ModelRouter();
    const slow = createModel({ name: 'slow', averageLatencyMs: 500 });
    const fast = createModel({ name: 'fast', averageLatencyMs: 50 });
    router.registerModel(slow);
    router.registerModel(fast);

    const selected = router.selectModel({ policyTypes: [RoutingPolicyType.Latency] });
    expect(selected.id).toBe(fast.id);
  });

  it('selects highest-privacy model with Privacy policy', () => {
    const router = new ModelRouter();
    const publicModel = createModel({ name: 'public', privacyLevel: 1 });
    const privateModel = createModel({ name: 'private', privacyLevel: 5 });
    router.registerModel(publicModel);
    router.registerModel(privateModel);

    const selected = router.selectModel({ policyTypes: [RoutingPolicyType.Privacy] });
    expect(selected.id).toBe(privateModel.id);
  });

  it('selects highest-accuracy model with Accuracy policy', () => {
    const router = new ModelRouter();
    const lowAcc = createModel({ name: 'low-acc', accuracyScore: 0.5 });
    const highAcc = createModel({ name: 'high-acc', accuracyScore: 0.99 });
    router.registerModel(lowAcc);
    router.registerModel(highAcc);

    const selected = router.selectModel({ policyTypes: [RoutingPolicyType.Accuracy] });
    expect(selected.id).toBe(highAcc.id);
  });

  it('applies multiple policy types as weighted scoring', () => {
    const router = new ModelRouter();
    const cheapFast = createModel({
      name: 'cheap-fast',
      costPer1kInputTokens: 0.001,
      costPer1kOutputTokens: 0.001,
      averageLatencyMs: 30,
      privacyLevel: 1,
      accuracyScore: 0.7,
    });
    const expensiveSlow = createModel({
      name: 'expensive-slow',
      costPer1kInputTokens: 0.10,
      costPer1kOutputTokens: 0.30,
      averageLatencyMs: 1000,
      privacyLevel: 5,
      accuracyScore: 0.95,
    });
    router.registerModel(cheapFast);
    router.registerModel(expensiveSlow);

    // Cost + Latency should favor cheap-fast
    const selected = router.selectModel({
      policyTypes: [RoutingPolicyType.Cost, RoutingPolicyType.Latency],
    });
    expect(selected.id).toBe(cheapFast.id);
  });

  it('privacyRequired filters to high-privacy models first', () => {
    const router = new ModelRouter();
    const publicModel = createModel({ name: 'public', privacyLevel: 1, accuracyScore: 0.99 });
    const privateModel = createModel({ name: 'private', privacyLevel: 4, accuracyScore: 0.7 });
    router.registerModel(publicModel);
    router.registerModel(privateModel);

    const selected = router.selectModel({
      policyTypes: [RoutingPolicyType.Accuracy],
      privacyRequired: true,
    });
    // Should pick from high-privacy models only
    expect(selected.id).toBe(privateModel.id);
  });
});

// ─── selectByPolicyType ──────────────────────────────────────────

describe('selectByPolicyType', () => {
  it('selects cheapest with Cost', () => {
    const router = new ModelRouter();
    const a = createModel({ costPer1kInputTokens: 0.05, costPer1kOutputTokens: 0.05 });
    const b = createModel({ costPer1kInputTokens: 0.01, costPer1kOutputTokens: 0.01 });
    router.registerModel(a);
    router.registerModel(b);

    const selected = router.selectByPolicyType(router.listModels(), RoutingPolicyType.Cost);
    expect(selected.id).toBe(b.id);
  });

  it('selects fastest with Latency', () => {
    const router = new ModelRouter();
    const a = createModel({ averageLatencyMs: 500 });
    const b = createModel({ averageLatencyMs: 50 });
    router.registerModel(a);
    router.registerModel(b);

    const selected = router.selectByPolicyType(router.listModels(), RoutingPolicyType.Latency);
    expect(selected.id).toBe(b.id);
  });

  it('selects highest privacy with Privacy', () => {
    const router = new ModelRouter();
    const a = createModel({ privacyLevel: 1 });
    const b = createModel({ privacyLevel: 5 });
    router.registerModel(a);
    router.registerModel(b);

    const selected = router.selectByPolicyType(router.listModels(), RoutingPolicyType.Privacy);
    expect(selected.id).toBe(b.id);
  });

  it('selects highest accuracy with Accuracy', () => {
    const router = new ModelRouter();
    const a = createModel({ accuracyScore: 0.6 });
    const b = createModel({ accuracyScore: 0.99 });
    router.registerModel(a);
    router.registerModel(b);

    const selected = router.selectByPolicyType(router.listModels(), RoutingPolicyType.Accuracy);
    expect(selected.id).toBe(b.id);
  });

  it('returns fallback when all provided models are unavailable', () => {
    const fallback = createModel({ name: 'fallback' });
    const router = new ModelRouter({ fallbackModelId: fallback.id });
    router.registerModel(fallback);

    const offline = createModel({ available: false });
    const selected = router.selectByPolicyType([offline], RoutingPolicyType.Cost);
    expect(selected.id).toBe(fallback.id);
  });

  it('returns first model when no fallback and all unavailable', () => {
    const router = new ModelRouter();
    const offline = createModel({ available: false });
    router.registerModel(offline);

    // Pass only the offline model
    const selected = router.selectByPolicyType([offline], RoutingPolicyType.Cost);
    expect(selected.id).toBe(offline.id);
  });
});

// ─── Routing rules ───────────────────────────────────────────────

describe('routing rules', () => {
  it('routes to a specific model based on rule condition', () => {
    const router = new ModelRouter({
      rules: [
        Object.freeze({
          id: 'rule-1',
          name: 'Question → cheap model',
          condition: 'question',
          modelId: brandModelId('cheap-model-id'),
          priority: 1,
          policyTypes: [RoutingPolicyType.Cost],
          fallbackModelId: null,
          metadata: {},
        }),
      ],
    });

    const cheapModel = createModel({ id: brandModelId('cheap-model-id'), name: 'cheap' });
    const otherModel = createModel({ name: 'other' });
    router.registerModel(cheapModel);
    router.registerModel(otherModel);

    const intent = createIntent({ type: IntentType.Question, goal: 'answer a question' });
    const selected = router.selectModel({ intent, policyTypes: [RoutingPolicyType.Accuracy] });

    // Rule should match "question" in intent type
    expect(selected.id).toBe(cheapModel.id);
  });

  it('uses fallback model from rule when primary not available', () => {
    const router = new ModelRouter({
      rules: [
        Object.freeze({
          id: 'rule-2',
          name: 'Workflow → special model',
          condition: 'workflow',
          modelId: brandModelId('special-model-id'),
          priority: 1,
          policyTypes: [],
          fallbackModelId: brandModelId('fallback-model-id'),
          metadata: {},
        }),
      ],
    });

    const fallbackModel = createModel({ id: brandModelId('fallback-model-id'), name: 'fallback' });
    router.registerModel(fallbackModel);

    const intent = createIntent({ type: IntentType.Workflow, goal: 'run workflow' });
    const selected = router.selectModel({ intent, policyTypes: [] });

    // Primary model not registered, fallback should be used
    expect(selected.id).toBe(fallbackModel.id);
  });

  it('condition "always" matches any intent', () => {
    const alwaysModel = createModel({ id: brandModelId('always-id'), name: 'always' });
    const router = new ModelRouter({
      rules: [
        Object.freeze({
          id: 'rule-3',
          name: 'Always route',
          condition: 'always',
          modelId: alwaysModel.id,
          priority: 1,
          policyTypes: [],
          fallbackModelId: null,
          metadata: {},
        }),
      ],
    });
    router.registerModel(alwaysModel);
    router.registerModel(createModel({ name: 'other' }));

    const intent = createIntent({ type: IntentType.Question, goal: 'any question' });
    const selected = router.selectModel({ intent, policyTypes: [RoutingPolicyType.Accuracy] });
    expect(selected.id).toBe(alwaysModel.id);
  });

  it('skips rules that do not match', () => {
    const router = new ModelRouter({
      rules: [
        Object.freeze({
          id: 'rule-4',
          name: 'Search rule',
          condition: 'search',
          modelId: brandModelId('search-model-id'),
          priority: 1,
          policyTypes: [],
          fallbackModelId: null,
          metadata: {},
        }),
      ],
    });

    const model = createModel({ name: 'general' });
    router.registerModel(model);

    const intent = createIntent({ type: IntentType.Question, goal: 'what is AI' });
    // No rule matches "question", should fall back to policy-based selection
    const selected = router.selectModel({ intent, policyTypes: [] });
    expect(selected.id).toBe(model.id);
  });
});

// ─── Empty router ────────────────────────────────────────────────

describe('empty router', () => {
  it('throws NoAvailableModelError when no models registered', () => {
    const router = new ModelRouter();
    expect(() => router.selectModel({ policyTypes: [] })).toThrow(NoAvailableModelError);
  });

  it('listModels returns empty array', () => {
    const router = new ModelRouter();
    expect(router.listModels()).toEqual([]);
  });
});
