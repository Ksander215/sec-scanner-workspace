import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FailoverEngine } from '../../core/ai-provider/failover-engine.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  FailoverStrategy,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

const P1 = crypto.randomUUID() as Types.ProviderId;
const P2 = crypto.randomUUID() as Types.ProviderId;
const P3 = crypto.randomUUID() as Types.ProviderId;
const M1 = crypto.randomUUID() as Types.ModelId;
const M2 = crypto.randomUUID() as Types.ModelId;
const M3 = crypto.randomUUID() as Types.ModelId;

function makeChain(overrides?: Partial<Types.FailoverChain>): Types.FailoverChain {
  return Object.freeze({
    id: crypto.randomUUID(),
    name: 'Test Chain',
    strategy: FailoverStrategy.Sequential,
    providers: Object.freeze([
      Object.freeze({ providerId: P1, modelId: M1, priority: 1, weight: 1, enabled: true }),
      Object.freeze({ providerId: P2, modelId: M2, priority: 2, weight: 1, enabled: true }),
      Object.freeze({ providerId: P3, modelId: M3, priority: 3, weight: 1, enabled: true }),
    ]),
    metadata: {},
    ...overrides,
  });
}

function makeEngine(
  configOverrides?: Partial<Types.FailoverEngineConfig>,
): FailoverEngine {
  const config = { ...DefaultAIProviderRuntimeConfig.failoverEngine, ...configOverrides };
  return new FailoverEngine(config);
}

function makeFailoverEvent(overrides?: Partial<Types.FailoverEvent>): Types.FailoverEvent {
  return Object.freeze({
    id: crypto.randomUUID(),
    executionId: crypto.randomUUID() as Types.ExecutionId,
    fromProviderId: P1,
    fromModelId: M1,
    toProviderId: P2,
    toModelId: M2,
    reason: 'ECONNREFUSED',
    timestamp: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('FailoverEngine', () => {
  let engine: FailoverEngine;

  beforeEach(() => {
    engine = makeEngine();
  });

  afterEach(() => {
    // no-op
  });

  // ═══════════════════════════════════════════════════════════════
  // defineChain
  // ═══════════════════════════════════════════════════════════════
  describe('defineChain', () => {
    it('should store a chain', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      expect(engine.getDefaultChain()).toBeDefined();
    });

    it('should freeze the stored chain', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const stored = engine.getDefaultChain()!;
      expect(Object.isFrozen(stored)).toBe(true);
    });

    it('should set first chain as default', async () => {
      const chain = makeChain({ id: 'chain-1' });
      await engine.defineChain(chain);
      expect(engine.getDefaultChain()?.id).toBe('chain-1');
    });

    it('should not change default when defining second chain', async () => {
      const chain1 = makeChain({ id: 'chain-1' });
      const chain2 = makeChain({ id: 'chain-2' });
      await engine.defineChain(chain1);
      await engine.defineChain(chain2);
      expect(engine.getDefaultChain()?.id).toBe('chain-1');
    });

    it('should preserve chain name', async () => {
      const chain = makeChain({ name: 'Production Chain' });
      await engine.defineChain(chain);
      expect(engine.getDefaultChain()?.name).toBe('Production Chain');
    });

    it('should preserve chain strategy', async () => {
      const chain = makeChain({ strategy: FailoverStrategy.Priority });
      await engine.defineChain(chain);
      expect(engine.getDefaultChain()?.strategy).toBe(FailoverStrategy.Priority);
    });

    it('should preserve chain providers', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      expect(engine.getDefaultChain()?.providers).toHaveLength(3);
    });

    it('should allow defining a chain with single provider', async () => {
      const chain = makeChain({
        providers: Object.freeze([
          Object.freeze({ providerId: P1, modelId: M1, priority: 1, weight: 1, enabled: true }),
        ]),
      });
      await engine.defineChain(chain);
      expect(engine.getDefaultChain()?.providers).toHaveLength(1);
    });

    it('should allow defining a chain with empty providers', async () => {
      const chain = makeChain({ providers: Object.freeze([]) });
      await engine.defineChain(chain);
      expect(engine.getDefaultChain()?.providers).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeChain
  // ═══════════════════════════════════════════════════════════════
  describe('removeChain', () => {
    it('should remove an existing chain', async () => {
      const chain = makeChain({ id: 'to-remove' });
      await engine.defineChain(chain);
      await engine.removeChain('to-remove');
      // Default chain was removed, getNextProvider should return null
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, P1);
      expect(next).toBeNull();
    });

    it('should not throw when removing non-existent chain', async () => {
      await expect(engine.removeChain('nonexistent')).resolves.not.toThrow();
    });

    it('should update default to next available chain', async () => {
      const c1 = makeChain({ id: 'c1' });
      const c2 = makeChain({ id: 'c2' });
      await engine.defineChain(c1);
      await engine.defineChain(c2);
      await engine.removeChain('c1');
      expect(engine.getDefaultChain()?.id).toBe('c2');
    });

    it('should set default to null when all chains removed', async () => {
      const c1 = makeChain({ id: 'c1' });
      await engine.defineChain(c1);
      await engine.removeChain('c1');
      expect(engine.getDefaultChain()).toBeNull();
    });

    it('should not affect other chains', async () => {
      const c1 = makeChain({ id: 'c1' });
      const c2 = makeChain({ id: 'c2', name: 'Chain 2' });
      await engine.defineChain(c1);
      await engine.defineChain(c2);
      await engine.removeChain('c1');
      expect(engine.getDefaultChain()?.name).toBe('Chain 2');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getNextProvider — basic
  // ═══════════════════════════════════════════════════════════════
  describe('getNextProvider — basic', () => {
    it('should return null when no chains defined', async () => {
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, P1);
      expect(next).toBeNull();
    });

    it('should return next provider in chain', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, P1);
      expect(next).not.toBeNull();
      expect(next!.providerId).toBe(P2);
      expect(next!.modelId).toBe(M2);
    });

    it('should return third provider after second', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, P2);
      expect(next).not.toBeNull();
      expect(next!.providerId).toBe(P3);
    });

    it('should wrap around when at end of chain', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const next = await engine.getNextProvider(eid, P3);
      // P3 is last, wrap-around is allowed (history.length 0 < maxFailovers 3)
      expect(next).not.toBeNull();
      expect(next!.providerId).not.toBe(P3);
    });

    it('should return first provider when current not in chain', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const unknown = crypto.randomUUID() as Types.ProviderId;
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, unknown);
      expect(next).not.toBeNull();
      expect(next!.providerId).toBe(P1);
    });

    it('should skip disabled providers', async () => {
      const chain = makeChain({
        providers: Object.freeze([
          Object.freeze({ providerId: P1, modelId: M1, priority: 1, weight: 1, enabled: true }),
          Object.freeze({ providerId: P2, modelId: M2, priority: 2, weight: 1, enabled: false }),
          Object.freeze({ providerId: P3, modelId: M3, priority: 3, weight: 1, enabled: true }),
        ]),
      });
      await engine.defineChain(chain);
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, P1);
      expect(next).not.toBeNull();
      expect(next!.providerId).toBe(P3);
    });

    it('should return null when all next providers disabled', async () => {
      const chain = makeChain({
        providers: Object.freeze([
          Object.freeze({ providerId: P1, modelId: M1, priority: 1, weight: 1, enabled: true }),
          Object.freeze({ providerId: P2, modelId: M2, priority: 2, weight: 1, enabled: false }),
          Object.freeze({ providerId: P3, modelId: M3, priority: 3, weight: 1, enabled: false }),
        ]),
      });
      await engine.defineChain(chain);
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, P1);
      expect(next).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getNextProvider — wrap-around
  // ═══════════════════════════════════════════════════════════════
  describe('getNextProvider — wrap-around', () => {
    it('should wrap around within maxFailovers', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const eid = crypto.randomUUID() as Types.ExecutionId;
      // Record no failovers yet
      const next = await engine.getNextProvider(eid, P3);
      // No history, so wrap-around allowed (history.length 0 < maxFailovers 3)
      expect(next).not.toBeNull();
    });

    it('should return null when failovers exceed maxFailovers', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const eid = crypto.randomUUID() as Types.ExecutionId;
      // Record maxFailovers events
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      const next = await engine.getNextProvider(eid, P3);
      expect(next).toBeNull();
    });

    it('should allow wrap-around exactly at maxFailovers - 1', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const eid = crypto.randomUUID() as Types.ExecutionId;
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      const next = await engine.getNextProvider(eid, P3);
      expect(next).not.toBeNull();
    });

    it('should not return current provider in wrap-around', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const next = await engine.getNextProvider(eid, P3);
      expect(next).not.toBeNull();
      expect(next!.providerId).not.toBe(P3);
    });

    it('should respect custom maxFailovers', async () => {
      const eng = makeEngine({ maxFailovers: 0 });
      const chain = makeChain();
      await eng.defineChain(chain);
      const eid = crypto.randomUUID() as Types.ExecutionId;
      // maxFailovers=0 means no wrap-around allowed
      const next = await eng.getNextProvider(eid, P3);
      expect(next).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordFailover / getFailovers
  // ═══════════════════════════════════════════════════════════════
  describe('recordFailover / getFailovers', () => {
    it('should return empty array for unknown execution', () => {
      expect(engine.getFailovers('unknown')).toHaveLength(0);
    });

    it('should record a failover event', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const event = makeFailoverEvent({ executionId: eid });
      engine.recordFailover(event);
      expect(engine.getFailovers(eid as string)).toHaveLength(1);
    });

    it('should accumulate failover events', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      expect(engine.getFailovers(eid as string)).toHaveLength(3);
    });

    it('should store executionId in event', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const event = makeFailoverEvent({ executionId: eid });
      engine.recordFailover(event);
      const events = engine.getFailovers(eid as string);
      expect(events[0].executionId).toBe(eid);
    });

    it('should store fromProviderId', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const event = makeFailoverEvent({ executionId: eid, fromProviderId: P1 });
      engine.recordFailover(event);
      expect(engine.getFailovers(eid as string)[0].fromProviderId).toBe(P1);
    });

    it('should store toProviderId', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const event = makeFailoverEvent({ executionId: eid, toProviderId: P2 });
      engine.recordFailover(event);
      expect(engine.getFailovers(eid as string)[0].toProviderId).toBe(P2);
    });

    it('should store reason', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const event = makeFailoverEvent({ executionId: eid, reason: '503 Service Unavailable' });
      engine.recordFailover(event);
      expect(engine.getFailovers(eid as string)[0].reason).toBe('503 Service Unavailable');
    });

    it('should store timestamp', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const ts = '2024-06-01T00:00:00Z';
      const event = makeFailoverEvent({ executionId: eid, timestamp: ts });
      engine.recordFailover(event);
      expect(engine.getFailovers(eid as string)[0].timestamp).toBe(ts);
    });

    it('should store metadata', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const event = makeFailoverEvent({ executionId: eid, metadata: { attempt: 2 } });
      engine.recordFailover(event);
      expect((engine.getFailovers(eid as string)[0].metadata as Record<string, unknown>).attempt).toBe(2);
    });

    it('should separate failovers by executionId', () => {
      const eid1 = crypto.randomUUID() as Types.ExecutionId;
      const eid2 = crypto.randomUUID() as Types.ExecutionId;
      engine.recordFailover(makeFailoverEvent({ executionId: eid1 }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid2 }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid1 }));
      expect(engine.getFailovers(eid1 as string)).toHaveLength(2);
      expect(engine.getFailovers(eid2 as string)).toHaveLength(1);
    });

    it('should return readonly array', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      const events = engine.getFailovers(eid as string);
      expect(Array.isArray(events)).toBe(true);
    });

    it('should maintain order of failover events', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      engine.recordFailover(makeFailoverEvent({ executionId: eid, toProviderId: P2 }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid, toProviderId: P3 }));
      const events = engine.getFailovers(eid as string);
      expect(events[0].toProviderId).toBe(P2);
      expect(events[1].toProviderId).toBe(P3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getDefaultChain
  // ═══════════════════════════════════════════════════════════════
  describe('getDefaultChain', () => {
    it('should return null when no chains defined', () => {
      expect(engine.getDefaultChain()).toBeNull();
    });

    it('should return the first defined chain', async () => {
      const chain = makeChain({ id: 'default' });
      await engine.defineChain(chain);
      expect(engine.getDefaultChain()?.id).toBe('default');
    });

    it('should return frozen chain', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      expect(Object.isFrozen(engine.getDefaultChain()!)).toBe(true);
    });

    it('should return null after all chains removed', async () => {
      const chain = makeChain({ id: 'only' });
      await engine.defineChain(chain);
      await engine.removeChain('only');
      expect(engine.getDefaultChain()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // config
  // ═══════════════════════════════════════════════════════════════
  describe('config', () => {
    it('should use default maxFailovers from config', async () => {
      const chain = makeChain();
      await engine.defineChain(chain);
      const eid = crypto.randomUUID() as Types.ExecutionId;
      // Default maxFailovers is 3
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      engine.recordFailover(makeFailoverEvent({ executionId: eid }));
      const next = await engine.getNextProvider(eid, P3);
      expect(next).not.toBeNull();
    });

    it('should use defaultStrategy from config', async () => {
      const eng = makeEngine({ defaultStrategy: FailoverStrategy.CostOptimized });
      const chain = makeChain({ strategy: FailoverStrategy.CostOptimized });
      await eng.defineChain(chain);
      expect(eng.getDefaultChain()?.strategy).toBe(FailoverStrategy.CostOptimized);
    });

    it('should use custom maxFailovers', async () => {
      const eng = makeEngine({ maxFailovers: 1 });
      const chain = makeChain();
      await eng.defineChain(chain);
      const eid = crypto.randomUUID() as Types.ExecutionId;
      eng.recordFailover(makeFailoverEvent({ executionId: eid }));
      const next = await eng.getNextProvider(eid, P3);
      // history.length 1 >= maxFailovers 1 → no wrap-around
      expect(next).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // edge cases
  // ═══════════════════════════════════════════════════════════════
  describe('edge cases', () => {
    it('should handle chain with only disabled providers', async () => {
      const chain = makeChain({
        providers: Object.freeze([
          Object.freeze({ providerId: P1, modelId: M1, priority: 1, weight: 1, enabled: false }),
        ]),
      });
      await engine.defineChain(chain);
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, P1);
      expect(next).toBeNull();
    });

    it('should handle empty chain providers', async () => {
      const chain = makeChain({ providers: Object.freeze([]) });
      await engine.defineChain(chain);
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, P1);
      expect(next).toBeNull();
    });

    it('should handle multiple chains with same id (overwrite)', async () => {
      const c1 = makeChain({ id: 'same', name: 'First' });
      const c2 = makeChain({ id: 'same', name: 'Second' });
      await engine.defineChain(c1);
      await engine.defineChain(c2);
      expect(engine.getDefaultChain()?.name).toBe('Second');
    });

    it('should return first enabled when current not in chain and some disabled', async () => {
      const chain = makeChain({
        providers: Object.freeze([
          Object.freeze({ providerId: P1, modelId: M1, priority: 1, weight: 1, enabled: false }),
          Object.freeze({ providerId: P2, modelId: M2, priority: 2, weight: 1, enabled: true }),
        ]),
      });
      await engine.defineChain(chain);
      const next = await engine.getNextProvider(crypto.randomUUID() as Types.ExecutionId, crypto.randomUUID() as Types.ProviderId);
      expect(next).not.toBeNull();
      expect(next!.providerId).toBe(P2);
    });

    it('should handle fromModelId and toModelId in events', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const event = makeFailoverEvent({
        executionId: eid,
        fromModelId: M1,
        toModelId: M2,
      });
      engine.recordFailover(event);
      const events = engine.getFailovers(eid as string);
      expect(events[0].fromModelId).toBe(M1);
      expect(events[0].toModelId).toBe(M2);
    });

    it('should store id in failover event', () => {
      const eid = crypto.randomUUID() as Types.ExecutionId;
      const id = 'event-123';
      const event = makeFailoverEvent({ executionId: eid, id });
      engine.recordFailover(event);
      expect(engine.getFailovers(eid as string)[0].id).toBe(id);
    });
  });
});
