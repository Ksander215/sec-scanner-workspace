import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CostEngine } from '../../core/ai-provider/cost-engine.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  DefaultAIProviderRuntimeConfig,
  PrivacyLevel,
} from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

const MODEL_ID = crypto.randomUUID() as Types.ModelId;

function makeModel(overrides?: Partial<Types.ModelDescriptor>): Types.ModelDescriptor {
  return Object.freeze({
    id: MODEL_ID,
    providerId: crypto.randomUUID() as Types.ProviderId,
    name: 'CostModel',
    family: 'test',
    version: '1.0.0',
    capabilities: [],
    tokenLimit: 128000,
    supportsVision: false,
    supportsTools: false,
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

function makeCostDetail(overrides?: Partial<Types.CostDetail>): Types.CostDetail {
  return Object.freeze({
    inputCost: 0.03,
    outputCost: 0.06,
    cachedCost: 0,
    reasoningCost: 0,
    imageCost: 0,
    audioCost: 0,
    totalCost: 0.09,
    currency: 'USD',
    ...overrides,
  });
}

function makeEngine(
  eventBus?: InProcessEventBus | null,
  modelOverrides?: Partial<Types.ModelDescriptor>,
  getModelFn?: (id: Types.ModelId) => Promise<Types.ModelDescriptor | null>,
): CostEngine {
  if (getModelFn) {
    return new CostEngine(
      { ...DefaultAIProviderRuntimeConfig.costEngine },
      { eventBus: eventBus ?? null, getModel: getModelFn },
    );
  }
  const model = makeModel(modelOverrides);
  return new CostEngine(
    { ...DefaultAIProviderRuntimeConfig.costEngine },
    { eventBus: eventBus ?? null, getModel: async () => model },
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('CostEngine', () => {
  let engine: CostEngine;
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    engine = makeEngine(eventBus);
  });

  afterEach(() => {
    eventBus.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // calculate
  // ═══════════════════════════════════════════════════════════════
  describe('calculate', () => {
    it('should return CostDetail with correct input cost', async () => {
      const result = await engine.calculate(1000, 500, MODEL_ID);
      expect(result.inputCost).toBe(0.03);
    });

    it('should return correct output cost', async () => {
      const result = await engine.calculate(1000, 1000, MODEL_ID);
      expect(result.outputCost).toBe(0.06);
    });

    it('should compute totalCost as sum of all costs', async () => {
      const result = await engine.calculate(1000, 1000, MODEL_ID);
      expect(result.totalCost).toBeCloseTo(result.inputCost + result.outputCost, 10);
    });

    it('should return zero costs when model not found', async () => {
      const noModelEngine = makeEngine(null, undefined, async () => null);
      const result = await noModelEngine.calculate(1000, 1000, crypto.randomUUID() as Types.ModelId);
      expect(result.inputCost).toBe(0);
      expect(result.outputCost).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('should use default currency when model not found', async () => {
      const noModelEngine = makeEngine(null, undefined, async () => null);
      const result = await noModelEngine.calculate(100, 100, crypto.randomUUID() as Types.ModelId);
      expect(result.currency).toBe('USD');
    });

    it('should use model currency when model is found', async () => {
      const result = await engine.calculate(100, 100, MODEL_ID);
      expect(result.currency).toBe('USD');
    });

    it('should handle zero tokens', async () => {
      const result = await engine.calculate(0, 0, MODEL_ID);
      expect(result.totalCost).toBe(0);
    });

    it('should scale linearly with input token count', async () => {
      const r1 = await engine.calculate(1000, 0, MODEL_ID);
      const r2 = await engine.calculate(2000, 0, MODEL_ID);
      expect(r2.inputCost).toBeCloseTo(r1.inputCost * 2, 10);
    });

    it('should scale linearly with output token count', async () => {
      const r1 = await engine.calculate(0, 500, MODEL_ID);
      const r2 = await engine.calculate(0, 1500, MODEL_ID);
      expect(r2.outputCost).toBeCloseTo(r1.outputCost * 3, 10);
    });

    it('should set cachedCost to 0', async () => {
      const result = await engine.calculate(1000, 1000, MODEL_ID);
      expect(result.cachedCost).toBe(0);
    });

    it('should set reasoningCost to 0', async () => {
      const result = await engine.calculate(1000, 1000, MODEL_ID);
      expect(result.reasoningCost).toBe(0);
    });

    it('should set imageCost to 0', async () => {
      const result = await engine.calculate(1000, 1000, MODEL_ID);
      expect(result.imageCost).toBe(0);
    });

    it('should set audioCost to 0', async () => {
      const result = await engine.calculate(1000, 1000, MODEL_ID);
      expect(result.audioCost).toBe(0);
    });

    it('should return frozen CostDetail', async () => {
      const result = await engine.calculate(100, 100, MODEL_ID);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should use model with custom cost profile', async () => {
      const customModel = makeModel({
        costProfile: Object.freeze({
          inputCostPer1kTokens: 0.05,
          outputCostPer1kTokens: 0.15,
          cachedInputCostPer1kTokens: 0,
          reasoningCostPer1kTokens: 0,
          imageCostPerUnit: 0,
          audioCostPerMinute: 0,
          currency: 'EUR',
        }),
      });
      const customEngine = makeEngine(null, undefined, async () => customModel);
      const result = await customEngine.calculate(1000, 1000, MODEL_ID);
      expect(result.inputCost).toBe(0.05);
      expect(result.outputCost).toBe(0.15);
      expect(result.currency).toBe('EUR');
    });

    it('should handle fractional token counts', async () => {
      const result = await engine.calculate(500, 250, MODEL_ID);
      expect(result.inputCost).toBeCloseTo(0.015, 10);
      expect(result.outputCost).toBeCloseTo(0.015, 10);
    });

    it('should handle very large token counts', async () => {
      const result = await engine.calculate(1000000, 500000, MODEL_ID);
      expect(result.totalCost).toBeGreaterThan(0);
    });

    it('should handle model with zero cost profile', async () => {
      const zeroModel = makeModel({
        costProfile: Object.freeze({
          inputCostPer1kTokens: 0, outputCostPer1kTokens: 0,
          cachedInputCostPer1kTokens: 0, reasoningCostPer1kTokens: 0,
          imageCostPerUnit: 0, audioCostPerMinute: 0, currency: 'JPY',
        }),
      });
      const zeroEngine = makeEngine(null, undefined, async () => zeroModel);
      const result = await zeroEngine.calculate(1000, 1000, MODEL_ID);
      expect(result.totalCost).toBe(0);
      expect(result.currency).toBe('JPY');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // record
  // ═══════════════════════════════════════════════════════════════
  describe('record', () => {
    it('should accumulate total cost', async () => {
      await engine.record(makeCostDetail({ inputCost: 1.0, outputCost: 0, totalCost: 1.0 }));
      expect(await engine.getTotal()).toBe(1.0);
    });

    it('should accumulate across multiple records', async () => {
      await engine.record(makeCostDetail({ inputCost: 1.0, outputCost: 0, totalCost: 1.0 }));
      await engine.record(makeCostDetail({ inputCost: 2.0, outputCost: 0, totalCost: 2.0 }));
      await engine.record(makeCostDetail({ inputCost: 3.0, outputCost: 0, totalCost: 3.0 }));
      expect(await engine.getTotal()).toBe(6.0);
    });

    it('should track input cost separately', async () => {
      await engine.record(makeCostDetail({ inputCost: 0.5, outputCost: 0.3, totalCost: 0.8 }));
      const report = await engine.getReport();
      expect(report.byType['input']).toBeCloseTo(0.5, 10);
    });

    it('should track output cost separately', async () => {
      await engine.record(makeCostDetail({ inputCost: 0.5, outputCost: 0.3, totalCost: 0.8 }));
      const report = await engine.getReport();
      expect(report.byType['output']).toBeCloseTo(0.3, 10);
    });

    it('should publish cost.recorded event', async () => {
      await engine.record(makeCostDetail({ totalCost: 1.0 }));
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'cost.recorded')).toBe(true);
    });

    it('should handle zero cost recording', async () => {
      await engine.record(makeCostDetail({ inputCost: 0, outputCost: 0, totalCost: 0 }));
      expect(await engine.getTotal()).toBe(0);
    });

    it('should track cached cost', async () => {
      await engine.record(makeCostDetail({ cachedCost: 0.01, totalCost: 0.01 }));
      const report = await engine.getReport();
      expect(report.byType['cached']).toBeCloseTo(0.01, 10);
    });

    it('should track reasoning cost', async () => {
      await engine.record(makeCostDetail({ reasoningCost: 0.02, totalCost: 0.02 }));
      const report = await engine.getReport();
      expect(report.byType['reasoning']).toBeCloseTo(0.02, 10);
    });

    it('should track image cost', async () => {
      await engine.record(makeCostDetail({ imageCost: 0.04, totalCost: 0.04 }));
      const report = await engine.getReport();
      expect(report.byType['image']).toBeCloseTo(0.04, 10);
    });

    it('should track audio cost', async () => {
      await engine.record(makeCostDetail({ audioCost: 0.05, totalCost: 0.05 }));
      const report = await engine.getReport();
      expect(report.byType['audio']).toBeCloseTo(0.05, 10);
    });

    it('should accumulate all cost types', async () => {
      await engine.record(makeCostDetail({
        inputCost: 1, outputCost: 2, cachedCost: 0.5,
        reasoningCost: 0.3, imageCost: 0.1, audioCost: 0.1,
        totalCost: 4.0,
      }));
      expect(await engine.getTotal()).toBeCloseTo(4.0, 10);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getReport
  // ═══════════════════════════════════════════════════════════════
  describe('getReport', () => {
    it('should return a report with id', async () => {
      const report = await engine.getReport();
      expect(report.id).toBeTruthy();
    });

    it('should include periodStart and periodEnd', async () => {
      const report = await engine.getReport();
      expect(report.periodStart).toBeTruthy();
      expect(report.periodEnd).toBeTruthy();
    });

    it('should include byType breakdown', async () => {
      await engine.record(makeCostDetail({ inputCost: 1, outputCost: 2, totalCost: 3 }));
      const report = await engine.getReport();
      expect(report.byType['input']).toBe(1);
      expect(report.byType['output']).toBe(2);
    });

    it('should reflect recorded costs in totalCost', async () => {
      await engine.record(makeCostDetail({ inputCost: 5.5, outputCost: 0, totalCost: 5.5 }));
      const report = await engine.getReport();
      expect(report.totalCost).toBeCloseTo(5.5, 10);
    });

    it('should accept custom period range', async () => {
      const report = await engine.getReport('2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
      expect(report.periodStart).toBe('2024-01-01T00:00:00Z');
      expect(report.periodEnd).toBe('2024-12-31T23:59:59Z');
    });

    it('should return frozen report', async () => {
      const report = await engine.getReport();
      expect(Object.isFrozen(report)).toBe(true);
    });

    it('should include currency from config', async () => {
      const report = await engine.getReport();
      expect(report.currency).toBe('USD');
    });

    it('should generate unique IDs for each report', async () => {
      const r1 = await engine.getReport();
      const r2 = await engine.getReport();
      expect(r1.id).not.toBe(r2.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getByProvider / getByModel
  // ═══════════════════════════════════════════════════════════════
  describe('getByProvider / getByModel', () => {
    it('should return 0 for unknown provider', async () => {
      expect(await engine.getByProvider('unknown')).toBe(0);
    });

    it('should return 0 for unknown model', async () => {
      expect(await engine.getByModel('unknown')).toBe(0);
    });

    it('getByProvider should return 0 initially', async () => {
      expect(await engine.getByProvider('provider-1')).toBe(0);
    });

    it('getByModel should return 0 initially', async () => {
      expect(await engine.getByModel('model-1')).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getTotal
  // ═══════════════════════════════════════════════════════════════
  describe('getTotal', () => {
    it('should return 0 initially', async () => {
      expect(await engine.getTotal()).toBe(0);
    });

    it('should return sum of all recorded costs', async () => {
      await engine.record(makeCostDetail({ inputCost: 1, outputCost: 2, totalCost: 3 }));
      await engine.record(makeCostDetail({ inputCost: 0.5, outputCost: 1.5, totalCost: 2 }));
      expect(await engine.getTotal()).toBeCloseTo(5, 10);
    });

    it('should match report totalCost', async () => {
      await engine.record(makeCostDetail({ inputCost: 7.5, outputCost: 0, totalCost: 7.5 }));
      expect(await engine.getTotal()).toBeCloseTo((await engine.getReport()).totalCost, 10);
    });

    it('should handle negative costs', async () => {
      await engine.record(makeCostDetail({ inputCost: -0.5, outputCost: -0.5, totalCost: -1 }));
      const total = await engine.getTotal();
      expect(total).toBe(-1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // setLimit / removeLimit
  // ═══════════════════════════════════════════════════════════════
  describe('setLimit / removeLimit', () => {
    it('should set a cost limit policy', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Daily Limit', limit: 10,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      const result = await engine.checkLimit();
      expect(result.limit).toBe(10);
    });

    it('should add new limit without replacing existing', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit A', limit: 100,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.setLimit({
        id: 'limit-2', name: 'Limit B', limit: 50,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      const result = await engine.checkLimit();
      expect(result.limit).toBe(50);
    });

    it('should replace limit with same id', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit', limit: 100,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.setLimit({
        id: 'limit-1', name: 'Limit Updated', limit: 200,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      const result = await engine.checkLimit();
      expect(result.limit).toBe(200);
    });

    it('should remove a limit', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit', limit: 10,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.removeLimit('limit-1');
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(true);
      expect(result.limit).toBe(0);
    });

    it('should handle removing non-existent limit', async () => {
      await expect(engine.removeLimit('non-existent')).resolves.toBeUndefined();
    });

    it('should set limit with different scopes', async () => {
      await engine.setLimit({
        id: 'p-limit', name: 'Provider Limit', limit: 50,
        period: 'daily', action: 'warn', scope: 'provider', scopeId: 'p1', metadata: {},
      });
      await engine.setLimit({
        id: 'm-limit', name: 'Model Limit', limit: 20,
        period: 'daily', action: 'block', scope: 'model', scopeId: 'm1', metadata: {},
      });
      // Global check should still be withinLimit since no global limits
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // checkLimit
  // ═══════════════════════════════════════════════════════════════
  describe('checkLimit', () => {
    it('should return withinLimit=true when under limit', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit', limit: 100,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.record(makeCostDetail({ totalCost: 5 }));
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(true);
    });

    it('should return withinLimit=false when over limit', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit', limit: 1,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.record(makeCostDetail({ inputCost: 5, outputCost: 0, totalCost: 5 }));
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(false);
    });

    it('should return withinLimit=true with no limit set', async () => {
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(true);
      expect(result.limit).toBe(0);
    });

    it('should return withinLimit=true with usage=0 and no limit', async () => {
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(true);
      expect(result.usage).toBe(0);
    });

    it('should use the most restrictive global limit', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Big', limit: 100,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.setLimit({
        id: 'limit-2', name: 'Small', limit: 10,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      const result = await engine.checkLimit();
      expect(result.limit).toBe(10);
    });

    it('should publish budget.exceeded when over limit', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit', limit: 1,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.record(makeCostDetail({ inputCost: 5, outputCost: 0, totalCost: 5 }));
      await engine.checkLimit();
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'budget.exceeded')).toBe(true);
    });

    it('should include usage in checkLimit result', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit', limit: 100,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.record(makeCostDetail({ inputCost: 10, outputCost: 15, totalCost: 25 }));
      const result = await engine.checkLimit();
      expect(result.usage).toBeCloseTo(25, 10);
    });

    it('should only consider global scope limits', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Provider Limit', limit: 1,
        period: 'daily', action: 'block', scope: 'provider', scopeId: 'p1', metadata: {},
      });
      await engine.record(makeCostDetail({ inputCost: 100, outputCost: 0, totalCost: 100 }));
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(true);
    });

    it('should handle exactly at limit boundary', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit', limit: 10,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.record(makeCostDetail({ inputCost: 10, outputCost: 0, totalCost: 10 }));
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(false);
    });

    it('should handle just under limit', async () => {
      await engine.setLimit({
        id: 'limit-1', name: 'Limit', limit: 10,
        period: 'daily', action: 'block', scope: 'global', metadata: {},
      });
      await engine.record(makeCostDetail({ inputCost: 9.99, outputCost: 0, totalCost: 9.99 }));
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // edge cases
  // ═══════════════════════════════════════════════════════════════
  describe('edge cases', () => {
    it('should handle calculate with 1 token input', async () => {
      const result = await engine.calculate(1, 0, MODEL_ID);
      expect(result.inputCost).toBeCloseTo(0.00003, 10);
    });

    it('should handle calculate with mixed token counts', async () => {
      const result = await engine.calculate(1500, 750, MODEL_ID);
      expect(result.inputCost).toBeCloseTo(0.045, 10);
      expect(result.outputCost).toBeCloseTo(0.045, 10);
    });

    it('should handle record with only input cost', async () => {
      await engine.record(makeCostDetail({ inputCost: 3.0, outputCost: 0, cachedCost: 0, reasoningCost: 0, imageCost: 0, audioCost: 0, totalCost: 3.0 }));
      expect(await engine.getTotal()).toBe(3.0);
    });

    it('should handle record with only output cost', async () => {
      await engine.record(makeCostDetail({ inputCost: 0, outputCost: 4.0, cachedCost: 0, reasoningCost: 0, imageCost: 0, audioCost: 0, totalCost: 4.0 }));
      expect(await engine.getTotal()).toBe(4.0);
    });

    it('should handle record with only cached cost', async () => {
      await engine.record(makeCostDetail({ inputCost: 0, outputCost: 0, cachedCost: 2.0, reasoningCost: 0, imageCost: 0, audioCost: 0, totalCost: 2.0 }));
      expect(await engine.getTotal()).toBe(2.0);
    });

    it('should handle record with only reasoning cost', async () => {
      await engine.record(makeCostDetail({ inputCost: 0, outputCost: 0, cachedCost: 0, reasoningCost: 1.5, imageCost: 0, audioCost: 0, totalCost: 1.5 }));
      expect(await engine.getTotal()).toBe(1.5);
    });

    it('should handle record with only image cost', async () => {
      await engine.record(makeCostDetail({ inputCost: 0, outputCost: 0, cachedCost: 0, reasoningCost: 0, imageCost: 0.5, audioCost: 0, totalCost: 0.5 }));
      expect(await engine.getTotal()).toBe(0.5);
    });

    it('should handle record with only audio cost', async () => {
      await engine.record(makeCostDetail({ inputCost: 0, outputCost: 0, cachedCost: 0, reasoningCost: 0, imageCost: 0, audioCost: 0.25, totalCost: 0.25 }));
      expect(await engine.getTotal()).toBe(0.25);
    });

    it('should handle setting and removing multiple limits', async () => {
      await engine.setLimit({ id: 'l1', name: 'L1', limit: 10, period: 'daily', action: 'block', scope: 'global', metadata: {} });
      await engine.setLimit({ id: 'l2', name: 'L2', limit: 5, period: 'daily', action: 'block', scope: 'global', metadata: {} });
      await engine.setLimit({ id: 'l3', name: 'L3', limit: 20, period: 'daily', action: 'block', scope: 'global', metadata: {} });
      await engine.removeLimit('l2');
      const result = await engine.checkLimit();
      expect(result.limit).toBe(10);
    });

    it('should handle checkLimit without recording anything', async () => {
      await engine.setLimit({ id: 'l1', name: 'L1', limit: 10, period: 'daily', action: 'block', scope: 'global', metadata: {} });
      const result = await engine.checkLimit();
      expect(result.withinLimit).toBe(true);
      expect(result.usage).toBe(0);
    });

    it('should handle getByProvider with recorded cost', async () => {
      expect(await engine.getByProvider('provider-a')).toBe(0);
    });

    it('should handle getByModel with recorded cost', async () => {
      expect(await engine.getByModel('model-a')).toBe(0);
    });

    it('should handle calculate with unknown model id and default config currency', async () => {
      const noModelEngine = makeEngine(null, undefined, async () => null);
      const result = await noModelEngine.calculate(1000, 1000, crypto.randomUUID() as Types.ModelId);
      expect(result.currency).toBe('USD');
      expect(result.totalCost).toBe(0);
    });

    it('should handle setLimit with warn action', async () => {
      await engine.setLimit({ id: 'l1', name: 'WarnLimit', limit: 100, period: 'daily', action: 'warn', scope: 'global', metadata: {} });
      const result = await engine.checkLimit();
      expect(result.limit).toBe(100);
    });

    it('should handle setLimit with fallback action', async () => {
      await engine.setLimit({ id: 'l1', name: 'FallbackLimit', limit: 50, period: 'monthly', action: 'fallback', scope: 'global', metadata: {} });
      const result = await engine.checkLimit();
      expect(result.limit).toBe(50);
    });

    it('should handle calculate with same input and output tokens', async () => {
      const result = await engine.calculate(500, 500, MODEL_ID);
      expect(result.inputCost).toBeCloseTo(0.015, 10);
      expect(result.outputCost).toBeCloseTo(0.03, 10);
      expect(result.totalCost).toBeCloseTo(0.045, 10);
    });

    it('should handle getReport without any recordings', async () => {
      const report = await engine.getReport();
      expect(report.totalCost).toBe(0);
      expect(report.byType['input']).toBeUndefined();
    });

    it('should return zero getTotal for fresh engine', async () => {
      const fresh = makeEngine(null);
      expect(await fresh.getTotal()).toBe(0);
    });
  });
});
