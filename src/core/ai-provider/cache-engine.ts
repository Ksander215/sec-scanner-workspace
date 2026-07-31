/**
 * Universal AI Provider Runtime — Cache Engine
 * TASK-AIS-006A.000
 *
 * Map-based in-memory cache with TTL, eviction, and statistics.
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type { ICacheEngine } from './contracts.js';
import type {
  CacheKeyId, CacheEntry, CacheStats, CacheType,
  CacheEngineConfig, ModelId, ExecutionMessage,
} from './types.js';
import { CacheType as CT } from './types.js';
import type { CacheHitEvent, CacheMissEvent, CacheEvictedEvent } from './events.js';

interface MutableCacheEntry extends CacheEntry {
  hitCount: number;
  lastAccessedAt: string;
}

export class CacheEngine implements ICacheEngine {
  private readonly config: CacheEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly cache = new Map<string, MutableCacheEntry>();
  private totalHits = 0;
  private totalMisses = 0;
  private evictionCount = 0;
  private totalSavedTokens = 0;
  private totalSavedCost = 0;

  constructor(config: CacheEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  private publish(event: DomainEventBase): void {
    if (this.eventBus) { void this.eventBus.publish(event); }
  }

  async get(key: CacheKeyId): Promise<CacheEntry | null> {
    const entry = this.cache.get(key as string);
    if (!entry) {
      this.totalMisses++;
      this.publish(Object.freeze({
        eventType: 'cache.miss',
        classification: EventClassification.Info,
        cacheKeyId: key, cacheType: this.config.defaultType,
        modelId: '' as ModelId,
        timestamp: new Date().toISOString(), metadata: {},
        eventId: crypto.randomUUID(), sequence: 0,
        aggregateId: key as string, aggregateType: 'Cache', version: '1.0.0',
      } as CacheMissEvent & DomainEventBase));
      return null;
    }

    // Check TTL
    if (new Date(entry.expiresAt).getTime() < Date.now()) {
      this.cache.delete(key as string);
      this.evictionCount++;
      this.totalMisses++;
      this.publish(Object.freeze({
        eventType: 'cache.evicted',
        classification: EventClassification.Info,
        cacheKeyId: key, reason: 'TTL expired',
        timestamp: new Date().toISOString(), metadata: {},
        eventId: crypto.randomUUID(), sequence: 0,
        aggregateId: key as string, aggregateType: 'Cache', version: '1.0.0',
      } as CacheEvictedEvent & DomainEventBase));
      return null;
    }

    entry.hitCount++;
    entry.lastAccessedAt = new Date().toISOString();
    this.totalHits++;
    this.totalSavedTokens += entry.tokenCount;

    this.publish(Object.freeze({
      eventType: 'cache.hit',
      classification: EventClassification.Info,
      cacheKeyId: key, cacheType: entry.type,
      modelId: entry.modelId,
      savedTokens: entry.tokenCount, savedCost: 0,
      timestamp: new Date().toISOString(), metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: key as string, aggregateType: 'Cache', version: '1.0.0',
    } as CacheHitEvent & DomainEventBase));

    return Object.freeze({ ...entry });
  }

  async set(entry: Omit<CacheEntry, 'hitCount' | 'lastAccessedAt'>): Promise<void> {
    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxMemoryEntries && !this.cache.has(entry.key as string)) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        const t = new Date(v.lastAccessedAt).getTime();
        if (t < oldestTime) { oldestTime = t; oldestKey = k; }
      }
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.evictionCount++;
        this.publish(Object.freeze({
          eventType: 'cache.evicted',
          classification: EventClassification.Info,
          cacheKeyId: oldestKey as CacheKeyId, reason: 'capacity',
          timestamp: new Date().toISOString(), metadata: {},
          eventId: crypto.randomUUID(), sequence: 0,
          aggregateId: oldestKey, aggregateType: 'Cache', version: '1.0.0',
        } as CacheEvictedEvent & DomainEventBase));
      }
    }

    const now = new Date().toISOString();
    this.cache.set(entry.key as string, {
      ...entry,
      hitCount: 0,
      lastAccessedAt: now,
    });
  }

  async invalidate(key: CacheKeyId): Promise<void> {
    this.cache.delete(key as string);
  }

  async invalidateByType(type: CacheType): Promise<void> {
    for (const [k, v] of this.cache) {
      if (v.type === type) {
        this.cache.delete(k);
      }
    }
  }

  async invalidateByModel(modelId: ModelId): Promise<void> {
    const mid = modelId as string;
    for (const [k, v] of this.cache) {
      if ((v.modelId as string) === mid) {
        this.cache.delete(k);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getStats(): CacheStats {
    const total = this.totalHits + this.totalMisses;
    const byType: Record<string, number> = {};
    for (const v of this.cache.values()) {
      byType[v.type] = (byType[v.type] ?? 0) + 1;
    }

    return Object.freeze({
      totalEntries: this.cache.size,
      byType: Object.freeze({
        [CT.Memory]: byType[CT.Memory] ?? 0,
        [CT.Disk]: byType[CT.Disk] ?? 0,
        [CT.Semantic]: byType[CT.Semantic] ?? 0,
        [CT.Prompt]: byType[CT.Prompt] ?? 0,
      } as Record<CacheType, number>),
      hitRate: total > 0 ? this.totalHits / total : 0,
      missRate: total > 0 ? this.totalMisses / total : 0,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      evictionCount: this.evictionCount,
      totalSavedTokens: this.totalSavedTokens,
      totalSavedCost: this.totalSavedCost,
    });
  }

  async lookup(
    messages: readonly ExecutionMessage[],
    modelId: ModelId,
  ): Promise<CacheEntry | null> {
    const key = this.generateKey(messages, modelId);
    return this.get(key);
  }

  private generateKey(messages: readonly ExecutionMessage[], modelId: ModelId): CacheKeyId {
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    const hash = this.simpleHash(`${content}:${modelId as string}`);
    return hash as CacheKeyId;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    return `cache-${Math.abs(hash).toString(16)}`;
  }
}
