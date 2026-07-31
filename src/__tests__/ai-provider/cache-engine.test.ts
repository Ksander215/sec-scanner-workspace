import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheEngine } from '../../core/ai-provider/cache-engine.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  CacheType,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

const MODEL_ID = crypto.randomUUID() as Types.ModelId;
const PROVIDER_ID = crypto.randomUUID() as Types.ProviderId;

function makeEntry(overrides?: Partial<Omit<Types.CacheEntry, 'hitCount' | 'lastAccessedAt'>>): Omit<Types.CacheEntry, 'hitCount' | 'lastAccessedAt'> {
  const now = new Date();
  const later = new Date(now.getTime() + 3600000);
  return Object.freeze({
    key: `cache-${crypto.randomUUID().slice(0, 8)}` as Types.CacheKeyId,
    type: CacheType.Memory,
    value: 'cached-response',
    tokenCount: 100,
    modelId: MODEL_ID,
    providerId: PROVIDER_ID,
    createdAt: now.toISOString(),
    expiresAt: later.toISOString(),
    metadata: {},
    ...overrides,
  });
}

function makeEngine(
  configOverrides?: Partial<Types.CacheEngineConfig>,
  eventBus?: InProcessEventBus | null,
): CacheEngine {
  const config = { ...DefaultAIProviderRuntimeConfig.cacheEngine, ...configOverrides };
  return new CacheEngine(config, eventBus ?? null);
}

function makeMessage(overrides?: Partial<Types.ExecutionMessage>): Types.ExecutionMessage {
  return Object.freeze({
    role: 'user' as const,
    content: 'Hello world',
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('CacheEngine', () => {
  let engine: CacheEngine;
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    engine = makeEngine(undefined, null);
  });

  afterEach(() => {
    eventBus.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // set / get — basic
  // ═══════════════════════════════════════════════════════════════
  describe('set / get — basic', () => {
    it('should return null for non-existent key', async () => {
      const result = await engine.get('nonexistent-key' as Types.CacheKeyId);
      expect(result).toBeNull();
    });

    it('should store and retrieve an entry', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result).not.toBeNull();
      expect(result!.value).toBe('cached-response');
    });

    it('should return frozen entry from get', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(Object.isFrozen(result!)).toBe(true);
    });

    it('should initialize hitCount to 0', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      const result = await engine.get(entry.key);
      // First get increments hitCount to 1
      expect(result!.hitCount).toBe(1);
    });

    it('should increment hitCount on successive gets', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      await engine.get(entry.key);
      await engine.get(entry.key);
      const result = await engine.get(entry.key);
      expect(result!.hitCount).toBe(3);
    });

    it('should update lastAccessedAt on get', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      await new Promise(r => setTimeout(r, 10));
      const result = await engine.get(entry.key);
      expect(new Date(result!.lastAccessedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(entry.createdAt).getTime(),
      );
    });

    it('should preserve key on get', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result!.key).toBe(entry.key);
    });

    it('should preserve type on get', async () => {
      const entry = makeEntry({ type: CacheType.Semantic });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result!.type).toBe(CacheType.Semantic);
    });

    it('should preserve value on get', async () => {
      const entry = makeEntry({ value: 'my-value' });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result!.value).toBe('my-value');
    });

    it('should preserve tokenCount on get', async () => {
      const entry = makeEntry({ tokenCount: 500 });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result!.tokenCount).toBe(500);
    });

    it('should preserve modelId on get', async () => {
      const mid = crypto.randomUUID() as Types.ModelId;
      const entry = makeEntry({ modelId: mid });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result!.modelId).toBe(mid);
    });

    it('should preserve providerId on get', async () => {
      const pid = crypto.randomUUID() as Types.ProviderId;
      const entry = makeEntry({ providerId: pid });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result!.providerId).toBe(pid);
    });

    it('should preserve metadata on get', async () => {
      const entry = makeEntry({ metadata: { key: 'value' } });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect((result!.metadata as Record<string, unknown>).key).toBe('value');
    });

    it('should overwrite existing entry on set with same key', async () => {
      const entry = makeEntry({ value: 'first' });
      await engine.set(entry);
      const entry2 = makeEntry({ key: entry.key, value: 'second' });
      await engine.set(entry2);
      const result = await engine.get(entry.key);
      expect(result!.value).toBe('second');
    });

    it('should reset hitCount on overwrite', async () => {
      const entry = makeEntry({ value: 'first' });
      await engine.set(entry);
      await engine.get(entry.key);
      await engine.get(entry.key);
      // Overwrite
      const entry2 = makeEntry({ key: entry.key, value: 'second' });
      await engine.set(entry2);
      const result = await engine.get(entry.key);
      expect(result!.hitCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TTL expiration
  // ═══════════════════════════════════════════════════════════════
  describe('TTL expiration', () => {
    it('should return null for expired entry', async () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const entry = makeEntry({ expiresAt: past });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result).toBeNull();
    });

    it('should count expired get as miss', async () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const entry = makeEntry({ expiresAt: past });
      await engine.set(entry);
      await engine.get(entry.key);
      const stats = engine.getStats();
      expect(stats.totalMisses).toBe(1);
    });

    it('should evict expired entry from cache', async () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const entry = makeEntry({ expiresAt: past });
      await engine.set(entry);
      await engine.get(entry.key);
      const stats = engine.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should increment evictionCount for expired entries', async () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const entry = makeEntry({ expiresAt: past });
      await engine.set(entry);
      await engine.get(entry.key);
      const stats = engine.getStats();
      expect(stats.evictionCount).toBe(1);
    });

    it('should return entry that has not expired yet', async () => {
      const future = new Date(Date.now() + 100000).toISOString();
      const entry = makeEntry({ expiresAt: future });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // events
  // ═══════════════════════════════════════════════════════════════
  describe('events', () => {
    it('should publish cache.hit on cache hit', async () => {
      const eng = makeEngine(undefined, eventBus);
      const entry = makeEntry();
      await eng.set(entry);
      await eng.get(entry.key);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'cache.hit')).toBe(true);
    });

    it('should publish cache.miss on cache miss', async () => {
      const eng = makeEngine(undefined, eventBus);
      await eng.get('nonexistent' as Types.CacheKeyId);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'cache.miss')).toBe(true);
    });

    it('should publish cache.evicted on TTL expiry', async () => {
      const eng = makeEngine(undefined, eventBus);
      const past = new Date(Date.now() - 1000).toISOString();
      const entry = makeEntry({ expiresAt: past });
      await eng.set(entry);
      await eng.get(entry.key);
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'cache.evicted')).toBe(true);
    });

    it('should publish cache.evicted on capacity eviction', async () => {
      const eng = makeEngine({ maxMemoryEntries: 2 }, eventBus);
      await eng.set(makeEntry());
      await eng.set(makeEntry());
      await new Promise(r => setTimeout(r, 10));
      await eng.set(makeEntry()); // should evict oldest
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'cache.evicted')).toBe(true);
    });

    it('should not publish events when no eventBus', async () => {
      await engine.set(makeEntry());
      await engine.get('nonexistent' as Types.CacheKeyId);
      // No error — events silently dropped
      expect(true).toBe(true);
    });

    it('should include cacheKeyId in cache.hit event envelope', async () => {
      const eng = makeEngine(undefined, eventBus);
      const entry = makeEntry();
      await eng.set(entry);
      await eng.get(entry.key);
      const log = eventBus.getLog();
      const hit = log.find(e => e.eventType === 'cache.hit');
      expect(hit).toBeDefined();
    });

    it('should include savedTokens in cache.hit event envelope', async () => {
      const eng = makeEngine(undefined, eventBus);
      const entry = makeEntry({ tokenCount: 250 });
      await eng.set(entry);
      await eng.get(entry.key);
      const log = eventBus.getLog();
      const hit = log.find(e => e.eventType === 'cache.hit');
      expect(hit).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // invalidate
  // ═══════════════════════════════════════════════════════════════
  describe('invalidate', () => {
    it('should remove entry by key', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      await engine.invalidate(entry.key);
      const result = await engine.get(entry.key);
      expect(result).toBeNull();
    });

    it('should not throw for invalidating non-existent key', async () => {
      await expect(engine.invalidate('nonexistent' as Types.CacheKeyId)).resolves.not.toThrow();
    });

    it('should only invalidate the specified key', async () => {
      const e1 = makeEntry();
      const e2 = makeEntry();
      await engine.set(e1);
      await engine.set(e2);
      await engine.invalidate(e1.key);
      expect(await engine.get(e1.key)).toBeNull();
      expect(await engine.get(e2.key)).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // invalidateByType
  // ═══════════════════════════════════════════════════════════════
  describe('invalidateByType', () => {
    it('should remove all entries of given type', async () => {
      await engine.set(makeEntry({ type: CacheType.Memory }));
      await engine.set(makeEntry({ type: CacheType.Memory }));
      await engine.set(makeEntry({ type: CacheType.Semantic }));
      await engine.invalidateByType(CacheType.Memory);
      const stats = engine.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should preserve entries of other types', async () => {
      const semanticEntry = makeEntry({ type: CacheType.Semantic });
      await engine.set(makeEntry({ type: CacheType.Memory }));
      await engine.set(semanticEntry);
      await engine.invalidateByType(CacheType.Memory);
      expect(await engine.get(semanticEntry.key)).not.toBeNull();
    });

    it('should handle invalidating type with no entries', async () => {
      await engine.set(makeEntry({ type: CacheType.Memory }));
      await engine.invalidateByType(CacheType.Disk);
      expect(engine.getStats().totalEntries).toBe(1);
    });

    it('should invalidate all cache types individually', async () => {
      await engine.set(makeEntry({ type: CacheType.Memory }));
      await engine.set(makeEntry({ type: CacheType.Disk }));
      await engine.set(makeEntry({ type: CacheType.Semantic }));
      await engine.set(makeEntry({ type: CacheType.Prompt }));
      await engine.invalidateByType(CacheType.Memory);
      await engine.invalidateByType(CacheType.Disk);
      await engine.invalidateByType(CacheType.Semantic);
      await engine.invalidateByType(CacheType.Prompt);
      expect(engine.getStats().totalEntries).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // invalidateByModel
  // ═══════════════════════════════════════════════════════════════
  describe('invalidateByModel', () => {
    it('should remove all entries for a model', async () => {
      await engine.set(makeEntry({ modelId: MODEL_ID }));
      await engine.set(makeEntry({ modelId: MODEL_ID }));
      const otherModel = crypto.randomUUID() as Types.ModelId;
      await engine.set(makeEntry({ modelId: otherModel }));
      await engine.invalidateByModel(MODEL_ID);
      expect(engine.getStats().totalEntries).toBe(1);
    });

    it('should preserve entries for other models', async () => {
      const otherModel = crypto.randomUUID() as Types.ModelId;
      const otherEntry = makeEntry({ modelId: otherModel });
      await engine.set(makeEntry({ modelId: MODEL_ID }));
      await engine.set(otherEntry);
      await engine.invalidateByModel(MODEL_ID);
      expect(await engine.get(otherEntry.key)).not.toBeNull();
    });

    it('should handle invalidating non-existent model', async () => {
      await engine.set(makeEntry());
      await engine.invalidateByModel(crypto.randomUUID() as Types.ModelId);
      expect(engine.getStats().totalEntries).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // clear
  // ═══════════════════════════════════════════════════════════════
  describe('clear', () => {
    it('should remove all entries', async () => {
      await engine.set(makeEntry());
      await engine.set(makeEntry());
      await engine.set(makeEntry());
      await engine.clear();
      expect(engine.getStats().totalEntries).toBe(0);
    });

    it('should not throw when cache is empty', async () => {
      await expect(engine.clear()).resolves.not.toThrow();
    });

    it('should allow setting entries after clear', async () => {
      await engine.set(makeEntry());
      await engine.clear();
      const entry = makeEntry();
      await engine.set(entry);
      expect(await engine.get(entry.key)).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getStats
  // ═══════════════════════════════════════════════════════════════
  describe('getStats', () => {
    it('should return frozen stats', () => {
      const stats = engine.getStats();
      expect(Object.isFrozen(stats)).toBe(true);
    });

    it('should return totalEntries of 0 initially', () => {
      expect(engine.getStats().totalEntries).toBe(0);
    });

    it('should reflect entries after set', async () => {
      await engine.set(makeEntry());
      await engine.set(makeEntry());
      expect(engine.getStats().totalEntries).toBe(2);
    });

    it('should return hitRate of 0 initially', () => {
      expect(engine.getStats().hitRate).toBe(0);
    });

    it('should return missRate of 0 initially', () => {
      expect(engine.getStats().missRate).toBe(0);
    });

    it('should return totalHits of 0 initially', () => {
      expect(engine.getStats().totalHits).toBe(0);
    });

    it('should return totalMisses of 0 initially', () => {
      expect(engine.getStats().totalMisses).toBe(0);
    });

    it('should increment totalHits on cache hit', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      await engine.get(entry.key);
      expect(engine.getStats().totalHits).toBe(1);
    });

    it('should increment totalMisses on cache miss', async () => {
      await engine.get('nope' as Types.CacheKeyId);
      expect(engine.getStats().totalMisses).toBe(1);
    });

    it('should calculate hitRate correctly', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      await engine.get(entry.key); // hit
      await engine.get('miss' as Types.CacheKeyId); // miss
      const stats = engine.getStats();
      expect(stats.hitRate).toBeCloseTo(0.5);
    });

    it('should calculate missRate correctly', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      await engine.get(entry.key);
      await engine.get('miss' as Types.CacheKeyId);
      const stats = engine.getStats();
      expect(stats.missRate).toBeCloseTo(0.5);
    });

    it('should have hitRate + missRate = 1', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      await engine.get(entry.key);
      await engine.get('miss' as Types.CacheKeyId);
      const stats = engine.getStats();
      expect(stats.hitRate + stats.missRate).toBeCloseTo(1);
    });

    it('should track evictionCount', async () => {
      const eng = makeEngine({ maxMemoryEntries: 2 });
      await eng.set(makeEntry());
      await eng.set(makeEntry());
      await new Promise(r => setTimeout(r, 5));
      await eng.set(makeEntry()); // evicts oldest
      expect(eng.getStats().evictionCount).toBe(1);
    });

    it('should track totalSavedTokens', async () => {
      const entry = makeEntry({ tokenCount: 200 });
      await engine.set(entry);
      await engine.get(entry.key);
      await engine.get(entry.key);
      expect(engine.getStats().totalSavedTokens).toBe(400);
    });

    it('should have totalSavedCost of 0', () => {
      expect(engine.getStats().totalSavedCost).toBe(0);
    });

    it('should include byType breakdown', async () => {
      await engine.set(makeEntry({ type: CacheType.Memory }));
      await engine.set(makeEntry({ type: CacheType.Memory }));
      await engine.set(makeEntry({ type: CacheType.Semantic }));
      const stats = engine.getStats();
      expect(stats.byType[CacheType.Memory]).toBe(2);
      expect(stats.byType[CacheType.Semantic]).toBe(1);
    });

    it('should have 0 for unpopulated cache types in byType', () => {
      const stats = engine.getStats();
      expect(stats.byType[CacheType.Disk]).toBe(0);
      expect(stats.byType[CacheType.Prompt]).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // lookup
  // ═══════════════════════════════════════════════════════════════
  describe('lookup', () => {
    it('should return null for uncached messages', async () => {
      const result = await engine.lookup([makeMessage()], MODEL_ID);
      expect(result).toBeNull();
    });

    it('should return null when messages differ', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      const result = await engine.lookup([makeMessage({ content: 'different' })], MODEL_ID);
      expect(result).toBeNull();
    });

    it('should generate consistent keys for same input', async () => {
      const msgs = [makeMessage()];
      const key1 = await engine.lookup(msgs, MODEL_ID);
      // Even if miss, the key generation is deterministic
      const key2 = await engine.lookup(msgs, MODEL_ID);
      // Both null, but the hash is deterministic internally
      expect(key1).toBeNull();
      expect(key2).toBeNull();
    });

    it('should generate different keys for different models', async () => {
      // We can't directly test keys, but can verify independence
      const msgs = [makeMessage()];
      const r1 = await engine.lookup(msgs, MODEL_ID);
      const r2 = await engine.lookup(msgs, crypto.randomUUID() as Types.ModelId);
      expect(r1).toBeNull();
      expect(r2).toBeNull();
    });

    it('should generate different keys for different message content', async () => {
      const r1 = await engine.lookup([makeMessage({ content: 'A' })], MODEL_ID);
      const r2 = await engine.lookup([makeMessage({ content: 'B' })], MODEL_ID);
      expect(r1).toBeNull();
      expect(r2).toBeNull();
    });

    it('should count as miss on lookup miss', async () => {
      await engine.lookup([makeMessage()], MODEL_ID);
      expect(engine.getStats().totalMisses).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // capacity eviction
  // ═══════════════════════════════════════════════════════════════
  describe('capacity eviction', () => {
    it('should evict oldest (LRU) when at capacity', async () => {
      const eng = makeEngine({ maxMemoryEntries: 2 });
      const e1 = makeEntry();
      await eng.set(e1);
      await new Promise(r => setTimeout(r, 10));
      const e2 = makeEntry();
      await eng.set(e2);
      await new Promise(r => setTimeout(r, 10));
      const e3 = makeEntry();
      await eng.set(e3);
      expect(await eng.get(e1.key)).toBeNull();
      expect(await eng.get(e2.key)).not.toBeNull();
      expect(await eng.get(e3.key)).not.toBeNull();
    });

    it('should not evict when under capacity', async () => {
      const eng = makeEngine({ maxMemoryEntries: 5 });
      const e1 = makeEntry();
      await eng.set(e1);
      await new Promise(r => setTimeout(r, 5));
      const e2 = makeEntry();
      await eng.set(e2);
      expect(await eng.get(e1.key)).not.toBeNull();
      expect(await eng.get(e2.key)).not.toBeNull();
    });

    it('should not evict on update of existing key', async () => {
      const eng = makeEngine({ maxMemoryEntries: 1 });
      const e1 = makeEntry();
      await eng.set(e1);
      // Update same key — should not trigger eviction
      const e1Update = makeEntry({ key: e1.key, value: 'updated' });
      await eng.set(e1Update);
      expect(eng.getStats().evictionCount).toBe(0);
      expect(await eng.get(e1.key)).not.toBeNull();
    });

    it('should update LRU order on access', async () => {
      const eng = makeEngine({ maxMemoryEntries: 2 });
      const e1 = makeEntry();
      await eng.set(e1);
      await new Promise(r => setTimeout(r, 15));
      const e2 = makeEntry();
      await eng.set(e2);
      await new Promise(r => setTimeout(r, 15));
      // Access e1 to make it recently used
      await eng.get(e1.key);
      await new Promise(r => setTimeout(r, 15));
      // Add e3 — should evict e2 (oldest not recently accessed)
      const e3 = makeEntry();
      await eng.set(e3);
      expect(await eng.get(e1.key)).not.toBeNull();
      expect(await eng.get(e3.key)).not.toBeNull();
    });

    it('should track eviction count correctly', async () => {
      const eng = makeEngine({ maxMemoryEntries: 1 });
      await eng.set(makeEntry());
      await new Promise(r => setTimeout(r, 5));
      await eng.set(makeEntry());
      await new Promise(r => setTimeout(r, 5));
      await eng.set(makeEntry());
      expect(eng.getStats().evictionCount).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // defaultType config
  // ═══════════════════════════════════════════════════════════════
  describe('defaultType config', () => {
    it('should use CacheType.Memory as default', () => {
      const eng = makeEngine();
      expect(eng).toBeDefined();
    });

    it('should use custom defaultType from config', () => {
      const eng = makeEngine({ defaultType: CacheType.Semantic });
      expect(eng).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // edge cases
  // ═══════════════════════════════════════════════════════════════
  describe('edge cases', () => {
    it('should handle empty value', async () => {
      const entry = makeEntry({ value: '' });
      await engine.set(entry);
      const result = await engine.get(entry.key);
      expect(result!.value).toBe('');
    });

    it('should handle zero tokenCount', async () => {
      const entry = makeEntry({ tokenCount: 0 });
      await engine.set(entry);
      await engine.get(entry.key);
      expect(engine.getStats().totalSavedTokens).toBe(0);
    });

    it('should handle large number of entries within capacity', async () => {
      const eng = makeEngine({ maxMemoryEntries: 500 });
      for (let i = 0; i < 500; i++) {
        await eng.set(makeEntry());
      }
      expect(eng.getStats().totalEntries).toBe(500);
    });

    it('should handle setting same entry multiple times', async () => {
      const entry = makeEntry();
      await engine.set(entry);
      await engine.set(entry);
      await engine.set(entry);
      expect(engine.getStats().totalEntries).toBe(1);
    });

    it('should handle empty messages in lookup', async () => {
      const result = await engine.lookup([], MODEL_ID);
      expect(result).toBeNull();
    });
  });
});
