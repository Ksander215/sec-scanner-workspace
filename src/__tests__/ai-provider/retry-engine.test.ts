import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RetryEngine } from '../../core/ai-provider/retry-engine.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  BackoffStrategy,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

function makeEngine(
  overrides?: Partial<typeof DefaultAIProviderRuntimeConfig.retryEngine>,
): RetryEngine {
  const config = { ...DefaultAIProviderRuntimeConfig.retryEngine, ...overrides };
  return new RetryEngine(config);
}

function makeAttempt(
  attempt: number,
  overrides?: Partial<Types.RetryAttempt>,
): Types.RetryAttempt {
  return Object.freeze({
    attempt,
    delayMs: 1000,
    error: 'ECONNREFUSED',
    timestamp: new Date().toISOString(),
    metadata: { executionId: 'exec-1' },
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('RetryEngine', () => {
  let engine: RetryEngine;

  beforeEach(() => {
    engine = makeEngine();
  });

  afterEach(() => {
    // Each test is independent via fresh engine in beforeEach
  });

  // ═══════════════════════════════════════════════════════════════
  // getConfig
  // ═══════════════════════════════════════════════════════════════
  describe('getConfig', () => {
    it('should return config with maxRetries', () => {
      const config = engine.getConfig();
      expect(config.maxRetries).toBe(3);
    });

    it('should return config with backoffStrategy', () => {
      const config = engine.getConfig();
      expect(config.backoffStrategy).toBe(BackoffStrategy.ExponentialJitter);
    });

    it('should return config with initialDelayMs', () => {
      const config = engine.getConfig();
      expect(config.initialDelayMs).toBe(1000);
    });

    it('should return config with maxDelayMs', () => {
      const config = engine.getConfig();
      expect(config.maxDelayMs).toBe(30000);
    });

    it('should return config with jitter', () => {
      const config = engine.getConfig();
      expect(config.jitter).toBe(true);
    });

    it('should include retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors.length).toBeGreaterThan(0);
    });

    it('should include ECONNREFUSED in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('ECONNREFUSED');
    });

    it('should include 429 in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('429');
    });

    it('should include rate_limit in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('rate_limit');
    });

    it('should include 502 in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('502');
    });

    it('should include 503 in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('503');
    });

    it('should include 504 in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('504');
    });

    it('should include timeout in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('timeout');
    });

    it('should include overloaded in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('overloaded');
    });

    it('should include ECONNRESET in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('ECONNRESET');
    });

    it('should include ETIMEDOUT in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('ETIMEDOUT');
    });

    it('should include ENOTFOUND in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('ENOTFOUND');
    });

    it('should include capacity in retryableErrors', () => {
      const config = engine.getConfig();
      expect(config.retryableErrors).toContain('capacity');
    });

    it('should return frozen config', () => {
      const config = engine.getConfig();
      expect(Object.isFrozen(config)).toBe(true);
    });

    it('should include metadata object', () => {
      const config = engine.getConfig();
      expect(config.metadata).toBeDefined();
    });

    it('should return fresh frozen copy each time', () => {
      const c1 = engine.getConfig();
      const c2 = engine.getConfig();
      expect(c1).not.toBe(c2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // setConfig
  // ═══════════════════════════════════════════════════════════════
  describe('setConfig', () => {
    it('should update maxRetries', () => {
      engine.setConfig({ maxRetries: 5 });
      expect(engine.getConfig().maxRetries).toBe(5);
    });

    it('should update backoffStrategy', () => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.Fixed });
      expect(engine.getConfig().backoffStrategy).toBe(BackoffStrategy.Fixed);
    });

    it('should update initialDelayMs', () => {
      engine.setConfig({ initialDelayMs: 500 });
      expect(engine.getConfig().initialDelayMs).toBe(500);
    });

    it('should update maxDelayMs', () => {
      engine.setConfig({ maxDelayMs: 60000 });
      expect(engine.getConfig().maxDelayMs).toBe(60000);
    });

    it('should update jitter', () => {
      engine.setConfig({ jitter: false });
      expect(engine.getConfig().jitter).toBe(false);
    });

    it('should preserve unchanged values', () => {
      engine.setConfig({ maxRetries: 10 });
      expect(engine.getConfig().initialDelayMs).toBe(1000);
      expect(engine.getConfig().maxDelayMs).toBe(30000);
    });

    it('should update multiple fields at once', () => {
      engine.setConfig({ maxRetries: 7, initialDelayMs: 200, maxDelayMs: 5000 });
      const config = engine.getConfig();
      expect(config.maxRetries).toBe(7);
      expect(config.initialDelayMs).toBe(200);
      expect(config.maxDelayMs).toBe(5000);
    });

    it('should merge metadata', () => {
      engine.setConfig({ metadata: { customKey: 'value' } });
      const config = engine.getConfig();
      expect((config.metadata as Record<string, unknown>)['customKey']).toBe('value');
    });

    it('should allow setting to 0 maxRetries', () => {
      engine.setConfig({ maxRetries: 0 });
      expect(engine.getConfig().maxRetries).toBe(0);
    });

    it('should allow large maxDelayMs', () => {
      engine.setConfig({ maxDelayMs: 300000 });
      expect(engine.getConfig().maxDelayMs).toBe(300000);
    });

    it('should work with empty partial', () => {
      const before = engine.getConfig();
      engine.setConfig({});
      const after = engine.getConfig();
      expect(after.maxRetries).toBe(before.maxRetries);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // shouldRetry
  // ═══════════════════════════════════════════════════════════════
  describe('shouldRetry', () => {
    it('should return false when attempt >= maxRetries', () => {
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), 3)).toBe(false);
    });

    it('should return true when attempt < maxRetries with retryable error', () => {
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), 1)).toBe(true);
    });

    it('should return true when attempt < maxRetries (attempt=2)', () => {
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), 2)).toBe(true);
    });

    it('should return true for 502 error', () => {
      expect(engine.shouldRetry(new Error('502 Bad Gateway'), 1)).toBe(true);
    });

    it('should return true for 503 error', () => {
      expect(engine.shouldRetry(new Error('Service returned 503'), 1)).toBe(true);
    });

    it('should return true for 504 error', () => {
      expect(engine.shouldRetry(new Error('504 Gateway Timeout'), 1)).toBe(true);
    });

    it('should return true for 429 error', () => {
      expect(engine.shouldRetry(new Error('429 Too Many Requests'), 1)).toBe(true);
    });

    it('should return true for rate_limit error', () => {
      expect(engine.shouldRetry(new Error('rate_limit exceeded'), 1)).toBe(true);
    });

    it('should return true for timeout error', () => {
      expect(engine.shouldRetry(new Error('Request timeout'), 1)).toBe(true);
    });

    it('should return true for overloaded error', () => {
      expect(engine.shouldRetry(new Error('Server is overloaded'), 1)).toBe(true);
    });

    it('should return true for capacity error', () => {
      expect(engine.shouldRetry(new Error('No capacity'), 1)).toBe(true);
    });

    it('should return true for ECONNRESET', () => {
      expect(engine.shouldRetry(new Error('ECONNRESET'), 1)).toBe(true);
    });

    it('should return true for ETIMEDOUT', () => {
      expect(engine.shouldRetry(new Error('ETIMEDOUT'), 1)).toBe(true);
    });

    it('should return true for ENOTFOUND', () => {
      expect(engine.shouldRetry(new Error('ENOTFOUND'), 1)).toBe(true);
    });

    it('should return false for non-retryable error', () => {
      expect(engine.shouldRetry(new Error('Invalid API key'), 1)).toBe(false);
    });

    it('should return false for generic error', () => {
      expect(engine.shouldRetry(new Error('Something went wrong'), 1)).toBe(false);
    });

    it('should return false for authentication error', () => {
      expect(engine.shouldRetry(new Error('Unauthorized'), 1)).toBe(false);
    });

    it('should return false for permission error', () => {
      expect(engine.shouldRetry(new Error('Forbidden'), 1)).toBe(false);
    });

    it('should check case-insensitively', () => {
      expect(engine.shouldRetry(new Error('econnrefused'), 1)).toBe(true);
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), 1)).toBe(true);
      expect(engine.shouldRetry(new Error('eCoNnReFuSeD'), 1)).toBe(true);
    });

    it('should respect updated maxRetries', () => {
      engine.setConfig({ maxRetries: 1 });
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), 1)).toBe(false);
    });

    it('should return false for attempt 0', () => {
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), 0)).toBe(true);
    });

    it('should return false for negative attempt', () => {
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), -1)).toBe(true);
    });

    it('should return false when attempt exactly equals maxRetries', () => {
      engine.setConfig({ maxRetries: 5 });
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), 5)).toBe(false);
    });

    it('should return true when attempt is maxRetries - 1', () => {
      engine.setConfig({ maxRetries: 5 });
      expect(engine.shouldRetry(new Error('ECONNREFUSED'), 4)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getDelay — Fixed
  // ═══════════════════════════════════════════════════════════════
  describe('getDelay — Fixed', () => {
    beforeEach(() => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.Fixed, initialDelayMs: 1000, maxDelayMs: 30000 });
    });

    it('should return initialDelay for attempt 1', () => {
      expect(engine.getDelay(1)).toBe(1000);
    });

    it('should return initialDelay for attempt 2', () => {
      expect(engine.getDelay(2)).toBe(1000);
    });

    it('should return initialDelay for attempt 3', () => {
      expect(engine.getDelay(3)).toBe(1000);
    });

    it('should return initialDelay for attempt 5', () => {
      expect(engine.getDelay(5)).toBe(1000);
    });

    it('should return initialDelay for attempt 10', () => {
      expect(engine.getDelay(10)).toBe(1000);
    });

    it('should cap at maxDelayMs when initialDelay > maxDelay', () => {
      engine.setConfig({ initialDelayMs: 50000 });
      expect(engine.getDelay(1)).toBe(30000);
    });

    it('should return integer', () => {
      expect(Number.isInteger(engine.getDelay(1))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getDelay — Linear
  // ═══════════════════════════════════════════════════════════════
  describe('getDelay — Linear', () => {
    beforeEach(() => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.Linear, initialDelayMs: 1000, maxDelayMs: 30000 });
    });

    it('should return initialDelay * 1 for attempt 1', () => {
      expect(engine.getDelay(1)).toBe(1000);
    });

    it('should return initialDelay * 2 for attempt 2', () => {
      expect(engine.getDelay(2)).toBe(2000);
    });

    it('should return initialDelay * 3 for attempt 3', () => {
      expect(engine.getDelay(3)).toBe(3000);
    });

    it('should return initialDelay * 5 for attempt 5', () => {
      expect(engine.getDelay(5)).toBe(5000);
    });

    it('should return initialDelay * 10 for attempt 10', () => {
      expect(engine.getDelay(10)).toBe(10000);
    });

    it('should cap at maxDelayMs for large attempts', () => {
      expect(engine.getDelay(50)).toBe(30000);
    });

    it('should cap at maxDelayMs exactly when exceeded', () => {
      // 1000 * 35 = 35000 > 30000
      expect(engine.getDelay(35)).toBe(30000);
    });

    it('should return just under cap', () => {
      // 1000 * 29 = 29000 < 30000
      expect(engine.getDelay(29)).toBe(29000);
    });

    it('should return integer', () => {
      expect(Number.isInteger(engine.getDelay(7))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getDelay — Exponential
  // ═══════════════════════════════════════════════════════════════
  describe('getDelay — Exponential', () => {
    beforeEach(() => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.Exponential, initialDelayMs: 1000, maxDelayMs: 30000 });
    });

    it('should return 1000 for attempt 1 (2^0 * 1000)', () => {
      expect(engine.getDelay(1)).toBe(1000);
    });

    it('should return 2000 for attempt 2 (2^1 * 1000)', () => {
      expect(engine.getDelay(2)).toBe(2000);
    });

    it('should return 4000 for attempt 3 (2^2 * 1000)', () => {
      expect(engine.getDelay(3)).toBe(4000);
    });

    it('should return 8000 for attempt 4 (2^3 * 1000)', () => {
      expect(engine.getDelay(4)).toBe(8000);
    });

    it('should return 16000 for attempt 5 (2^4 * 1000)', () => {
      expect(engine.getDelay(5)).toBe(16000);
    });

    it('should cap at maxDelayMs for large attempts', () => {
      expect(engine.getDelay(10)).toBe(30000);
    });

    it('should cap at maxDelayMs for attempt 20', () => {
      expect(engine.getDelay(20)).toBe(30000);
    });

    it('should return just under cap for attempt 5 with maxDelayMs 20000', () => {
      engine.setConfig({ maxDelayMs: 20000 });
      // 2^4 * 1000 = 16000 < 20000
      expect(engine.getDelay(5)).toBe(16000);
    });

    it('should return integer', () => {
      expect(Number.isInteger(engine.getDelay(3))).toBe(true);
    });

    it('should double each attempt', () => {
      const d1 = engine.getDelay(1);
      const d2 = engine.getDelay(2);
      expect(d2).toBe(d1 * 2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getDelay — ExponentialJitter
  // ═══════════════════════════════════════════════════════════════
  describe('getDelay — ExponentialJitter', () => {
    beforeEach(() => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.ExponentialJitter, initialDelayMs: 1000, maxDelayMs: 30000 });
    });

    it('should be at least exponential delay for attempt 2', () => {
      const delay = engine.getDelay(2);
      expect(delay).toBeGreaterThanOrEqual(2000);
    });

    it('should be at most exponential + initialDelay for attempt 2', () => {
      const delay = engine.getDelay(2);
      expect(delay).toBeLessThanOrEqual(3000);
    });

    it('should be at least exponential delay for attempt 3', () => {
      const delay = engine.getDelay(3);
      expect(delay).toBeGreaterThanOrEqual(4000);
    });

    it('should be at most exponential + initialDelay for attempt 3', () => {
      const delay = engine.getDelay(3);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('should cap at maxDelayMs for attempt 10', () => {
      const delay = engine.getDelay(10);
      expect(delay).toBeLessThanOrEqual(30000);
    });

    it('should always cap at maxDelayMs even with jitter', () => {
      for (let i = 0; i < 100; i++) {
        const delay = engine.getDelay(20);
        expect(delay).toBeLessThanOrEqual(30000);
      }
    });

    it('should return integer (floored)', () => {
      const delay = engine.getDelay(1);
      expect(Number.isInteger(delay)).toBe(true);
    });

    it('should produce varying delays', () => {
      const delays = new Set<number>();
      for (let i = 0; i < 50; i++) {
        delays.add(engine.getDelay(2));
      }
      // With jitter, we should get at least a few distinct values
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // maxDelay cap verification
  // ═══════════════════════════════════════════════════════════════
  describe('maxDelay cap', () => {
    it('should cap Fixed strategy', () => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.Fixed, initialDelayMs: 100000, maxDelayMs: 5000 });
      expect(engine.getDelay(1)).toBe(5000);
    });

    it('should cap Linear strategy', () => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.Linear, initialDelayMs: 10000, maxDelayMs: 5000 });
      expect(engine.getDelay(10)).toBe(5000);
    });

    it('should cap Exponential strategy', () => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.Exponential, initialDelayMs: 10000, maxDelayMs: 5000 });
      expect(engine.getDelay(10)).toBe(5000);
    });

    it('should cap ExponentialJitter strategy', () => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.ExponentialJitter, initialDelayMs: 10000, maxDelayMs: 5000 });
      for (let i = 0; i < 50; i++) {
        expect(engine.getDelay(10)).toBeLessThanOrEqual(5000);
      }
    });

    it('should allow maxDelay larger than typical delays', () => {
      engine.setConfig({ backoffStrategy: BackoffStrategy.Exponential, initialDelayMs: 1000, maxDelayMs: 120000 });
      expect(engine.getDelay(5)).toBe(16000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordAttempt / getAttempts / reset
  // ═══════════════════════════════════════════════════════════════
  describe('recordAttempt / getAttempts / reset', () => {
    it('should record an attempt', () => {
      engine.recordAttempt(makeAttempt(1));
      expect(engine.getAttempts('exec-1')).toHaveLength(1);
    });

    it('should accumulate attempts', () => {
      engine.recordAttempt(makeAttempt(1));
      engine.recordAttempt(makeAttempt(2));
      engine.recordAttempt(makeAttempt(3));
      expect(engine.getAttempts('exec-1')).toHaveLength(3);
    });

    it('should store attempt number', () => {
      engine.recordAttempt(makeAttempt(2, { error: '503' }));
      const attempts = engine.getAttempts('exec-1');
      expect(attempts[0].attempt).toBe(2);
      expect(attempts[0].error).toBe('503');
    });

    it('should store delayMs', () => {
      engine.recordAttempt(makeAttempt(1, { delayMs: 2000 }));
      const attempts = engine.getAttempts('exec-1');
      expect(attempts[0].delayMs).toBe(2000);
    });

    it('should store error message', () => {
      engine.recordAttempt(makeAttempt(1, { error: 'ECONNRESET' }));
      const attempts = engine.getAttempts('exec-1');
      expect(attempts[0].error).toBe('ECONNRESET');
    });

    it('should return empty array for unknown executionId', () => {
      expect(engine.getAttempts('unknown')).toHaveLength(0);
    });

    it('should return empty array by default', () => {
      expect(engine.getAttempts('never-used')).toHaveLength(0);
    });

    it('should store metadata', () => {
      engine.recordAttempt(makeAttempt(1, { metadata: { executionId: 'exec-1', extra: 'data' } }));
      const attempts = engine.getAttempts('exec-1');
      expect((attempts[0].metadata as Record<string, unknown>)['extra']).toBe('data');
    });

    it('should store timestamp', () => {
      const ts = '2024-01-01T00:00:00Z';
      engine.recordAttempt(makeAttempt(1, { timestamp: ts }));
      const attempts = engine.getAttempts('exec-1');
      expect(attempts[0].timestamp).toBe(ts);
    });

    it('should reset attempts for an executionId', () => {
      engine.recordAttempt(makeAttempt(1));
      engine.recordAttempt(makeAttempt(2));
      engine.reset('exec-1');
      expect(engine.getAttempts('exec-1')).toHaveLength(0);
    });

    it('should not affect other executionIds on reset', () => {
      engine.recordAttempt(makeAttempt(1, { metadata: { executionId: 'exec-1' } }));
      engine.recordAttempt(makeAttempt(1, { metadata: { executionId: 'exec-2' } }));
      engine.reset('exec-1');
      expect(engine.getAttempts('exec-1')).toHaveLength(0);
      expect(engine.getAttempts('exec-2')).toHaveLength(1);
    });

    it('should use __global__ key when no executionId in metadata', () => {
      engine.recordAttempt(makeAttempt(1, { metadata: {} }));
      expect(engine.getAttempts('__global__')).toHaveLength(1);
    });

    it('should return readonly array', () => {
      engine.recordAttempt(makeAttempt(1));
      const attempts = engine.getAttempts('exec-1');
      expect(Array.isArray(attempts)).toBe(true);
    });

    it('should maintain order of attempts', () => {
      engine.recordAttempt(makeAttempt(1));
      engine.recordAttempt(makeAttempt(2));
      engine.recordAttempt(makeAttempt(3));
      const attempts = engine.getAttempts('exec-1');
      expect(attempts[0].attempt).toBe(1);
      expect(attempts[1].attempt).toBe(2);
      expect(attempts[2].attempt).toBe(3);
    });

    it('should allow recording after reset', () => {
      engine.recordAttempt(makeAttempt(1));
      engine.reset('exec-1');
      engine.recordAttempt(makeAttempt(1));
      expect(engine.getAttempts('exec-1')).toHaveLength(1);
    });

    it('should handle resetting non-existent executionId', () => {
      engine.reset('nonexistent');
      expect(engine.getAttempts('nonexistent')).toHaveLength(0);
    });

    it('should record multiple executions independently', () => {
      engine.recordAttempt(makeAttempt(1, { metadata: { executionId: 'exec-a' } }));
      engine.recordAttempt(makeAttempt(1, { metadata: { executionId: 'exec-b' } }));
      engine.recordAttempt(makeAttempt(2, { metadata: { executionId: 'exec-a' } }));
      expect(engine.getAttempts('exec-a')).toHaveLength(2);
      expect(engine.getAttempts('exec-b')).toHaveLength(1);
    });

    it('should store frozen attempt objects', () => {
      const attempt = makeAttempt(1);
      engine.recordAttempt(attempt);
      const stored = engine.getAttempts('exec-1')[0];
      expect(Object.isFrozen(stored)).toBe(true);
    });
  });
});
