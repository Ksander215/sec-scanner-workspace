/**
 * PersistentMemory Tests
 */
import { describe, it, expect } from 'vitest';
import { PersistentMemory, InMemoryPersistentStorageAdapter } from '../../../core/memory/persistent-memory.js';
import type { PersistentStorageAdapter } from '../../../core/memory/persistent-memory.js';

/** Adapter that records all calls for verification */
class TrackingAdapter implements PersistentStorageAdapter {
  private readonly inner = new InMemoryPersistentStorageAdapter();
  savedKeys: string[] = [];
  savedData: Map<string, string> = new Map();

  async save(key: string, data: string): Promise<void> {
    this.savedKeys.push(key);
    this.savedData.set(key, data);
    await this.inner.save(key, data);
  }
  async load(key: string): Promise<string | null> {
    return this.inner.load(key);
  }
  async delete(key: string): Promise<boolean> {
    return this.inner.delete(key);
  }
  async keys(): Promise<readonly string[]> {
    return this.inner.keys();
  }
}

describe('PersistentMemory', () => {
  it('store creates entry with layer=persistent', async () => {
    const pm = new PersistentMemory();
    const entry = await pm.store('k', 'v');
    expect(entry.layer).toBe('persistent');
    expect(entry.key).toBe('k');
    expect(entry.value).toBe('v');
  });
  it('retrieve returns stored entry', async () => {
    const pm = new PersistentMemory();
    await pm.store('k', 'v');
    const result = await pm.retrieve('k');
    expect(result).not.toBeNull();
    expect(result!.key).toBe('k');
    expect(result!.value).toBe('v');
  });
  it('update modifies existing entry', async () => {
    const pm = new PersistentMemory();
    await pm.store('k', 'old');
    const updated = await pm.update('k', 'new');
    expect(updated).not.toBeNull();
    expect(updated!.value).toBe('new');
  });
  it('delete removes entry', async () => {
    const pm = new PersistentMemory();
    await pm.store('k', 'v');
    const deleted = await pm.delete('k');
    expect(deleted).toBe(true);
    expect(pm.has('k')).toBe(false);
  });
  it('has checks existence', async () => {
    const pm = new PersistentMemory();
    expect(pm.has('k')).toBe(false);
    await pm.store('k', 'v');
    expect(pm.has('k')).toBe(true);
  });
  it('flush persists dirty entries', async () => {
    const adapter = new TrackingAdapter();
    const pm = new PersistentMemory(adapter);
    await pm.store('k1', 'v1');
    await pm.store('k2', 'v2');
    const count = await pm.flush();
    expect(count).toBe(2);
    expect(adapter.savedKeys.length).toBe(2);
  });
  it('load retrieves persisted entry', async () => {
    const adapter = new InMemoryPersistentStorageAdapter();
    const pm1 = new PersistentMemory(adapter);
    await pm1.store('k', 'v');
    await pm1.flush();

    const pm2 = new PersistentMemory(adapter);
    const loaded = await pm2.load('k');
    expect(loaded).not.toBeNull();
    expect(loaded!.value).toBe('v');
  });
  it('loadAll loads all entries', async () => {
    const adapter = new InMemoryPersistentStorageAdapter();
    const pm1 = new PersistentMemory(adapter);
    await pm1.store('a', 1);
    await pm1.store('b', 2);
    await pm1.flush();

    const pm2 = new PersistentMemory(adapter);
    const count = await pm2.loadAll();
    expect(count).toBe(2);
    expect(pm2.size()).toBe(2);
  });
  it('storeWithTtl creates entry with expiration', async () => {
    const pm = new PersistentMemory();
    const entry = await pm.storeWithTtl('ttl-key', 'v', 60000);
    expect(entry.layer).toBe('persistent');
    expect(entry.expiresAt).not.toBeNull();
  });
  it('purgeExpired removes expired entries', async () => {
    const pm = new PersistentMemory();
    await pm.storeWithTtl('expired', 'v', -1);
    await pm.store('valid', 'v2');
    await new Promise(r => setTimeout(r, 2));
    const purged = await pm.purgeExpired();
    expect(purged).toBe(1);
    expect(pm.size()).toBe(1);
  });
  it('serializeEntry and deserializeEntry round-trip', () => {
    const pm = new PersistentMemory();
    const entry = pm.serializeEntry({
      id: 'test-id' as any,
      key: 'k',
      value: { foo: 'bar' },
      layer: 'persistent',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      accessCount: 3,
    });
    const restored = pm.deserializeEntry(entry);
    expect(restored.key).toBe('k');
    expect(restored.value).toEqual({ foo: 'bar' });
    expect(restored.accessCount).toBe(3);
    expect(restored.layer).toBe('persistent');
  });
  it('cache is populated on store', async () => {
    const pm = new PersistentMemory();
    await pm.store('k', 'v');
    expect(pm.size()).toBe(1);
  });
  it('storage adapter receives correct data', async () => {
    const adapter = new TrackingAdapter();
    const pm = new PersistentMemory(adapter);
    await pm.store('my-key', { data: 42 });
    await pm.flush();
    expect(adapter.savedKeys.includes('mem:my-key'), 'storage key should be prefixed').toBe(true);
    const savedJson = adapter.savedData.get('mem:my-key');
    expect(savedJson).not.toBeNull();
    const parsed = JSON.parse(savedJson!);
    expect(parsed.key).toBe('my-key');
    expect(parsed.value).toEqual({ data: 42 });
  });
  it('retrieve from storage fallback loads from adapter', async () => {
    const adapter = new InMemoryPersistentStorageAdapter();
    const pm1 = new PersistentMemory(adapter);
    await pm1.store('k', 'v');
    await pm1.flush();

    const pm2 = new PersistentMemory(adapter);
    const result = await pm2.retrieve('k');
    expect(result).not.toBeNull();
    expect(result!.value).toBe('v');
  });
  it('getStats returns correct counts', async () => {
    const pm = new PersistentMemory();
    await pm.store('a', 1);
    await pm.store('b', 2);
    await pm.store('c', 3);
    const stats = pm.getStats();
    expect(stats.entries).toBe(3);
    expect(stats.dirtyEntries).toBe(3);
    expect(stats.expiredEntries).toBe(0);
  });
});
