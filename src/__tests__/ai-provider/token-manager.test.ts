import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenManager } from '../../core/ai-provider/token-manager.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  TokenType,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';
import { TokenBudgetExceededError } from '../../core/ai-provider/errors.js';

// ─── Factory helpers ─────────────────────────────────────────────

const MODEL_ID = crypto.randomUUID() as Types.ModelId;

function makeUsage(overrides?: Partial<Types.TokenCountResult>): Types.TokenCountResult {
  return Object.freeze({
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 10,
    reasoningTokens: 5,
    imageTokens: 0,
    audioTokens: 0,
    totalTokens: 165,
    modelId: MODEL_ID,
    providerId: crypto.randomUUID() as Types.ProviderId,
    ...overrides,
  });
}

function makeManager(
  budget?: number,
  warnThreshold?: number,
  blockThreshold?: number,
  period?: 'hourly' | 'daily' | 'weekly' | 'monthly',
  eventBus?: InProcessEventBus | null,
): TokenManager {
  const config = { ...DefaultAIProviderRuntimeConfig.tokenManager };
  if (budget !== undefined) config.defaultBudget = budget;
  if (warnThreshold !== undefined) config.warnThreshold = warnThreshold;
  if (blockThreshold !== undefined) config.blockThreshold = blockThreshold;
  if (period !== undefined) config.period = period;
  return new TokenManager(config, eventBus ?? null);
}

// ─── Tests ────────────────────────────────────────────────────────

describe('TokenManager', () => {
  let manager: TokenManager;
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    manager = makeManager(undefined, undefined, undefined, undefined, null);
  });

  afterEach(() => {
    eventBus.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // count
  // ═══════════════════════════════════════════════════════════════
  describe('count', () => {
    it('should return 0 for empty text', async () => {
      const result = await manager.count('', MODEL_ID);
      expect(result.totalTokens).toBe(0);
    });

    it('should return 0 inputTokens for empty text', async () => {
      const result = await manager.count('', MODEL_ID);
      expect(result.inputTokens).toBe(0);
    });

    it('should estimate tokens as chars / 4 rounded up', async () => {
      const result = await manager.count('A'.repeat(100), MODEL_ID);
      expect(result.totalTokens).toBe(25);
    });

    it('should set outputTokens to 0', async () => {
      const result = await manager.count('Hello world', MODEL_ID);
      expect(result.outputTokens).toBe(0);
    });

    it('should set modelId on result', async () => {
      const result = await manager.count('test', MODEL_ID);
      expect(result.modelId).toBe(MODEL_ID);
    });

    it('should round up for non-divisible chars', async () => {
      const result = await manager.count('ABCDE', MODEL_ID);
      expect(result.totalTokens).toBe(2);
    });

    it('should handle single char', async () => {
      const result = await manager.count('X', MODEL_ID);
      expect(result.totalTokens).toBe(1);
    });

    it('should handle 3 chars (rounds up to 1)', async () => {
      const result = await manager.count('ABC', MODEL_ID);
      expect(result.totalTokens).toBe(1);
    });

    it('should handle 5 chars (rounds up to 2)', async () => {
      const result = await manager.count('ABCDE', MODEL_ID);
      expect(result.totalTokens).toBe(2);
    });

    it('should handle large text', async () => {
      const result = await manager.count('A'.repeat(10000), MODEL_ID);
      expect(result.totalTokens).toBe(2500);
    });

    it('should set all non-input token counts to 0', async () => {
      const result = await manager.count('test', MODEL_ID);
      expect(result.outputTokens).toBe(0);
      expect(result.cachedTokens).toBe(0);
      expect(result.reasoningTokens).toBe(0);
      expect(result.imageTokens).toBe(0);
      expect(result.audioTokens).toBe(0);
    });

    it('should return frozen result', async () => {
      const result = await manager.count('test', MODEL_ID);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // record
  // ═══════════════════════════════════════════════════════════════
  describe('record', () => {
    it('should record usage and update used total', async () => {
      await manager.record(makeUsage({ totalTokens: 100 }));
      expect(await manager.getUsed()).toBe(100);
    });

    it('should accumulate across multiple records', async () => {
      await manager.record(makeUsage({ totalTokens: 100 }));
      await manager.record(makeUsage({ totalTokens: 200 }));
      await manager.record(makeUsage({ totalTokens: 300 }));
      expect(await manager.getUsed()).toBe(600);
    });

    it('should track input tokens by type', async () => {
      await manager.record(makeUsage({ inputTokens: 50, totalTokens: 50 }));
      expect(await manager.getByType(TokenType.Input)).toBe(50);
    });

    it('should track output tokens by type', async () => {
      await manager.record(makeUsage({ outputTokens: 30, totalTokens: 30 }));
      expect(await manager.getByType(TokenType.Output)).toBe(30);
    });

    it('should track cached tokens by type', async () => {
      await manager.record(makeUsage({ cachedTokens: 10, totalTokens: 10 }));
      expect(await manager.getByType(TokenType.Cached)).toBe(10);
    });

    it('should track reasoning tokens by type', async () => {
      await manager.record(makeUsage({ reasoningTokens: 5, totalTokens: 5 }));
      expect(await manager.getByType(TokenType.Reasoning)).toBe(5);
    });

    it('should track image tokens by type', async () => {
      await manager.record(makeUsage({ imageTokens: 3, totalTokens: 3 }));
      expect(await manager.getByType(TokenType.Image)).toBe(3);
    });

    it('should track audio tokens by type', async () => {
      await manager.record(makeUsage({ audioTokens: 7, totalTokens: 7 }));
      expect(await manager.getByType(TokenType.Audio)).toBe(7);
    });

    it('should track by provider', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      await manager.record(makeUsage({ providerId: pid, totalTokens: 100 }));
      expect(await manager.getByProvider(pid as string)).toBe(100);
    });

    it('should track by model', async () => {
      const mid = crypto.randomUUID() as Types.ModelId;
      await manager.record(makeUsage({ modelId: mid, totalTokens: 100 }));
      expect(await manager.getByModel(mid as string)).toBe(100);
    });

    it('should accumulate by provider across records', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      await manager.record(makeUsage({ providerId: pid, totalTokens: 100 }));
      await manager.record(makeUsage({ providerId: pid, totalTokens: 200 }));
      expect(await manager.getByProvider(pid as string)).toBe(300);
    });

    it('should handle recording 0 tokens', async () => {
      await manager.record(makeUsage({ totalTokens: 0 }));
      expect(await manager.getUsed()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // budget warning at 80%
  // ═══════════════════════════════════════════════════════════════
  describe('budget warning', () => {
    it('should publish token.budget-warning event at warn threshold', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 800 }));
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'token.budget-warning')).toBe(true);
    });

    it('should publish warning only once', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 800 }));
      await m.record(makeUsage({ totalTokens: 10 }));
      const log = eventBus.getLog();
      const warnings = log.filter(e => e.eventType === 'token.budget-warning');
      expect(warnings).toHaveLength(1);
    });

    it('should not publish warning below threshold', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 100 }));
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'token.budget-warning')).toBe(false);
    });

    it('should not publish warning just below threshold', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 799 }));
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'token.budget-warning')).toBe(false);
    });

    it('should publish warning exactly at threshold', async () => {
      const m = makeManager(10000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 8000 }));
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'token.budget-warning')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // budget exceeded at 95%
  // ═══════════════════════════════════════════════════════════════
  describe('budget exceeded', () => {
    it('should throw TokenBudgetExceededError at block threshold', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 900 }));
      await expect(m.record(makeUsage({ totalTokens: 100 }))).rejects.toThrow(TokenBudgetExceededError);
    });

    it('should include budget and used in error', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 900 }));
      try {
        await m.record(makeUsage({ totalTokens: 100 }));
      } catch (e) {
        expect((e as TokenBudgetExceededError).budget).toBe(1000);
        expect((e as TokenBudgetExceededError).used).toBe(1000);
      }
    });

    it('should publish budget.exceeded event when exceeded', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 900 }));
      try { await m.record(makeUsage({ totalTokens: 100 })); } catch { /* expected */ }
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'budget.exceeded')).toBe(true);
    });

    it('should not count tokens that were rejected', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 900 }));
      try { await m.record(makeUsage({ totalTokens: 100 })); } catch { /* expected */ }
      expect(await m.getUsed()).toBe(900);
    });

    it('should allow usage just below block threshold', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 940 }));
      expect(await m.getUsed()).toBe(940);
    });

    it('should throw exactly at 95% threshold', async () => {
      const m = makeManager(10000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 9490 }));
      await expect(m.record(makeUsage({ totalTokens: 60 }))).rejects.toThrow(TokenBudgetExceededError);
    });

    it('should allow exactly 94% of budget', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 949 }));
      expect(await m.getUsed()).toBe(949);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getAccount
  // ═══════════════════════════════════════════════════════════════
  describe('getAccount', () => {
    it('should return account with correct budget', async () => {
      const m = makeManager(5000);
      const account = await m.getAccount();
      expect(account.budget).toBe(5000);
    });

    it('should return default account name', async () => {
      const account = await manager.getAccount();
      expect(account.name).toBe('default');
    });

    it('should return used = 0 initially', async () => {
      const account = await manager.getAccount();
      expect(account.used).toBe(0);
    });

    it('should return remaining = budget initially', async () => {
      const account = await manager.getAccount();
      expect(account.remaining).toBe(account.budget);
    });

    it('should reflect recorded usage in account', async () => {
      await manager.record(makeUsage({ totalTokens: 500 }));
      const account = await manager.getAccount();
      expect(account.used).toBe(500);
      expect(account.remaining).toBe(account.budget - 500);
    });

    it('should include byType breakdown', async () => {
      await manager.record(makeUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 }));
      const account = await manager.getAccount();
      expect(account.byType[TokenType.Input]).toBe(100);
      expect(account.byType[TokenType.Output]).toBe(50);
    });

    it('should include periodStart', async () => {
      const account = await manager.getAccount();
      expect(account.periodStart).toBeTruthy();
    });

    it('should include periodEnd after periodStart', async () => {
      const account = await manager.getAccount();
      expect(new Date(account.periodEnd).getTime()).toBeGreaterThan(
        new Date(account.periodStart).getTime(),
      );
    });

    it('should return frozen account', async () => {
      const account = await manager.getAccount();
      expect(Object.isFrozen(account)).toBe(true);
    });

    it('should return same id across calls', async () => {
      const a1 = await manager.getAccount();
      const a2 = await manager.getAccount();
      expect(a1.id).toBe(a2.id);
    });

    it('should include byProvider in account', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      await manager.record(makeUsage({ providerId: pid, totalTokens: 100 }));
      const account = await manager.getAccount();
      expect(account.byProvider[pid as string]).toBe(100);
    });

    it('should include byModel in account', async () => {
      const mid = crypto.randomUUID() as Types.ModelId;
      await manager.record(makeUsage({ modelId: mid, totalTokens: 200 }));
      const account = await manager.getAccount();
      expect(account.byModel[mid as string]).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // reset
  // ═══════════════════════════════════════════════════════════════
  describe('reset', () => {
    it('should clear used tokens', async () => {
      await manager.record(makeUsage({ totalTokens: 500 }));
      await manager.reset();
      expect(await manager.getUsed()).toBe(0);
    });

    it('should clear byType tracking', async () => {
      await manager.record(makeUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 }));
      await manager.reset();
      expect(await manager.getByType(TokenType.Input)).toBe(0);
      expect(await manager.getByType(TokenType.Output)).toBe(0);
    });

    it('should clear byProvider tracking', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      await manager.record(makeUsage({ providerId: pid, totalTokens: 100 }));
      await manager.reset();
      expect(await manager.getByProvider(pid as string)).toBe(0);
    });

    it('should clear byModel tracking', async () => {
      const mid = crypto.randomUUID() as Types.ModelId;
      await manager.record(makeUsage({ modelId: mid, totalTokens: 100 }));
      await manager.reset();
      expect(await manager.getByModel(mid as string)).toBe(0);
    });

    it('should reset remaining to budget', async () => {
      await manager.record(makeUsage({ totalTokens: 500 }));
      await manager.reset();
      expect(await manager.getRemaining()).toBe(await manager.getBudget());
    });

    it('should allow recording after reset', async () => {
      await manager.record(makeUsage({ totalTokens: 500 }));
      await manager.reset();
      await manager.record(makeUsage({ totalTokens: 100 }));
      expect(await manager.getUsed()).toBe(100);
    });

    it('should reset warned flag allowing new warnings', async () => {
      const m = makeManager(1000, 0.8, 0.95, undefined, eventBus);
      await m.record(makeUsage({ totalTokens: 800 }));
      await m.reset();
      await m.record(makeUsage({ totalTokens: 800 }));
      const log = eventBus.getLog();
      const warnings = log.filter(e => e.eventType === 'token.budget-warning');
      expect(warnings).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getByType for each TokenType
  // ═══════════════════════════════════════════════════════════════
  describe('getByType', () => {
    it('should return 0 for Input type initially', async () => {
      expect(await manager.getByType(TokenType.Input)).toBe(0);
    });

    it('should return 0 for Output type initially', async () => {
      expect(await manager.getByType(TokenType.Output)).toBe(0);
    });

    it('should return 0 for Cached type initially', async () => {
      expect(await manager.getByType(TokenType.Cached)).toBe(0);
    });

    it('should return 0 for Reasoning type initially', async () => {
      expect(await manager.getByType(TokenType.Reasoning)).toBe(0);
    });

    it('should return 0 for Image type initially', async () => {
      expect(await manager.getByType(TokenType.Image)).toBe(0);
    });

    it('should return 0 for Audio type initially', async () => {
      expect(await manager.getByType(TokenType.Audio)).toBe(0);
    });

    it('should accumulate Input type across records', async () => {
      await manager.record(makeUsage({ inputTokens: 10, totalTokens: 10 }));
      await manager.record(makeUsage({ inputTokens: 20, totalTokens: 20 }));
      expect(await manager.getByType(TokenType.Input)).toBe(30);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getByProvider
  // ═══════════════════════════════════════════════════════════════
  describe('getByProvider', () => {
    it('should return 0 for unknown provider', async () => {
      expect(await manager.getByProvider('nonexistent')).toBe(0);
    });

    it('should return total tokens for known provider', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      await manager.record(makeUsage({ providerId: pid, totalTokens: 250 }));
      expect(await manager.getByProvider(pid as string)).toBe(250);
    });

    it('should separate different providers', async () => {
      const p1 = crypto.randomUUID() as Types.ProviderId;
      const p2 = crypto.randomUUID() as Types.ProviderId;
      await manager.record(makeUsage({ providerId: p1, totalTokens: 100 }));
      await manager.record(makeUsage({ providerId: p2, totalTokens: 200 }));
      expect(await manager.getByProvider(p1 as string)).toBe(100);
      expect(await manager.getByProvider(p2 as string)).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getByModel
  // ═══════════════════════════════════════════════════════════════
  describe('getByModel', () => {
    it('should return 0 for unknown model', async () => {
      expect(await manager.getByModel('nonexistent')).toBe(0);
    });

    it('should return total tokens for known model', async () => {
      const mid = crypto.randomUUID() as Types.ModelId;
      await manager.record(makeUsage({ modelId: mid, totalTokens: 500 }));
      expect(await manager.getByModel(mid as string)).toBe(500);
    });

    it('should separate different models', async () => {
      const m1 = crypto.randomUUID() as Types.ModelId;
      const m2 = crypto.randomUUID() as Types.ModelId;
      await manager.record(makeUsage({ modelId: m1, totalTokens: 100 }));
      await manager.record(makeUsage({ modelId: m2, totalTokens: 300 }));
      expect(await manager.getByModel(m1 as string)).toBe(100);
      expect(await manager.getByModel(m2 as string)).toBe(300);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getBudget / getUsed / getRemaining
  // ═══════════════════════════════════════════════════════════════
  describe('getBudget / getUsed / getRemaining', () => {
    it('getBudget should return configured budget', async () => {
      expect(await manager.getBudget()).toBe(DefaultAIProviderRuntimeConfig.tokenManager.defaultBudget);
    });

    it('getUsed should return 0 initially', async () => {
      expect(await manager.getUsed()).toBe(0);
    });

    it('getRemaining should return budget initially', async () => {
      expect(await manager.getRemaining()).toBe(await manager.getBudget());
    });

    it('getRemaining should not go negative', async () => {
      const remaining = await manager.getRemaining();
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('getRemaining should decrease as tokens are used', async () => {
      const before = await manager.getRemaining();
      await manager.record(makeUsage({ totalTokens: 100 }));
      const after = await manager.getRemaining();
      expect(after).toBe(before - 100);
    });

    it('getBudget should return custom budget', async () => {
      const m = makeManager(500);
      expect(await m.getBudget()).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // edge cases
  // ═══════════════════════════════════════════════════════════════
  describe('edge cases', () => {
    it('should handle budget of 0 without division by zero', async () => {
      const m = makeManager(0);
      await m.record(makeUsage({ totalTokens: 100 }));
      expect(await m.getUsed()).toBe(100);
    });

    it('should handle all period types', () => {
      const hourly = makeManager(1000, undefined, undefined, 'hourly');
      const daily = makeManager(1000, undefined, undefined, 'daily');
      const weekly = makeManager(1000, undefined, undefined, 'weekly');
      const monthly = makeManager(1000, undefined, undefined, 'monthly');
      expect(hourly).toBeDefined();
      expect(daily).toBeDefined();
      expect(weekly).toBeDefined();
      expect(monthly).toBeDefined();
    });

    it('should handle recording with all token types populated', async () => {
      await manager.record(makeUsage({
        inputTokens: 10,
        outputTokens: 20,
        cachedTokens: 5,
        reasoningTokens: 3,
        imageTokens: 2,
        audioTokens: 1,
        totalTokens: 41,
      }));
      expect(await manager.getByType(TokenType.Input)).toBe(10);
      expect(await manager.getByType(TokenType.Output)).toBe(20);
      expect(await manager.getByType(TokenType.Cached)).toBe(5);
      expect(await manager.getByType(TokenType.Reasoning)).toBe(3);
      expect(await manager.getByType(TokenType.Image)).toBe(2);
      expect(await manager.getByType(TokenType.Audio)).toBe(1);
    });

    it('should handle recording after reset with new provider', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      await manager.record(makeUsage({ providerId: pid, totalTokens: 100 }));
      await manager.reset();
      await manager.record(makeUsage({ providerId: pid, totalTokens: 200 }));
      expect(await manager.getByProvider(pid as string)).toBe(200);
    });

    it('should handle custom id in getAccount', async () => {
      const customId = crypto.randomUUID() as Types.TokenAccountId;
      const account = await manager.getAccount(customId);
      // getAccount ignores the passed id and returns the default account
      expect(account).toBeDefined();
      expect(account.name).toBe('default');
    });

    it('should handle very large token recording within budget', async () => {
      const m = makeManager(10000000);
      await m.record(makeUsage({ totalTokens: 999999 }));
      expect(await m.getUsed()).toBe(999999);
    });
  });
});
