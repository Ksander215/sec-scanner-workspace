/**
 * SessionMemory Tests
 */
import { describe, it, expect } from 'vitest';
import { SessionMemory } from '../../../core/memory/session-memory.js';

describe('SessionMemory', () => {
  // --- Working memory feature parity ---
  it('store creates entry with correct key and value', () => {
    const sm = new SessionMemory('sess-1');
    const entry = sm.store('my-key', 'hello');
    expect(entry.key).toBe('my-key');
    expect(entry.value).toBe('hello');
  });
  it('store creates entry with layer=session', () => {
    const sm = new SessionMemory('sess-1');
    const entry = sm.store('k', 'v');
    expect(entry.layer).toBe('session');
  });
  it('store creates entry with accessCount=0', () => {
    const sm = new SessionMemory('sess-1');
    const entry = sm.store('k', 'v');
    expect(entry.accessCount).toBe(0);
  });
  it('retrieve returns stored entry', () => {
    const sm = new SessionMemory('sess-1');
    sm.store('k', 'v');
    const result = sm.retrieve('k');
    expect(result).not.toBeNull();
    expect(result!.key).toBe('k');
    expect(result!.value).toBe('v');
  });
  it('retrieve returns null for missing key', () => {
    const sm = new SessionMemory('sess-1');
    expect(sm.retrieve('no-such-key')).toBeNull();
  });
  it('update modifies existing entry', () => {
    const sm = new SessionMemory('sess-1');
    sm.store('k', 'old');
    const updated = sm.update('k', 'new');
    expect(updated).not.toBeNull();
    expect(updated!.value).toBe('new');
  });
  it('update returns null for missing key', () => {
    const sm = new SessionMemory('sess-1');
    expect(sm.update('no-key', 'val')).toBeNull();
  });
  it('delete removes entry and returns true', () => {
    const sm = new SessionMemory('sess-1');
    sm.store('k', 'v');
    expect(sm.delete('k')).toBe(true);
    expect(sm.has('k')).toBe(false);
  });
  it('delete returns false for missing key', () => {
    const sm = new SessionMemory('sess-1');
    expect(sm.delete('no-key')).toBe(false);
  });
  it('has returns true for existing', () => {
    const sm = new SessionMemory('sess-1');
    sm.store('k', 'v');
    expect(sm.has('k')).toBe(true);
  });
  it('has returns false for missing', () => {
    const sm = new SessionMemory('sess-1');
    expect(sm.has('no-key')).toBe(false);
  });
  // --- TTL features ---
  it('storeWithTtl creates entry with expiration', () => {
    const sm = new SessionMemory('sess-1');
    const entry = sm.storeWithTtl('ttl-key', 'v', 60000);
    expect(entry.expiresAt).not.toBeNull();
    expect(entry.layer).toBe('session');
  });
  it('getExpiredEntries returns entries past TTL', async () => {
    const sm = new SessionMemory('sess-1');
    sm.storeWithTtl('expired-key', 'v', -1);
    await new Promise(r => setTimeout(r, 2));
    const expired = sm.getExpiredEntries();
    expect(expired.length >= 1, 'Should have at least one expired entry').toBe(true);
    expect(expired[0].key).toBe('expired-key');
  });
  it('purgeExpired removes expired entries', async () => {
    const sm = new SessionMemory('sess-1');
    sm.storeWithTtl('expired-key', 'v', -1);
    sm.store('non-expired-key', 'v2');
    await new Promise(r => setTimeout(r, 2));
    const purged = sm.purgeExpired();
    expect(purged).toBe(1);
    expect(sm.size()).toBe(1);
  });
  it('non-expired entries are not purged', () => {
    const sm = new SessionMemory('sess-1');
    sm.storeWithTtl('long-ttl', 'v', 600000);
    sm.store('permanent', 'v2');
    const purged = sm.purgeExpired();
    expect(purged).toBe(0);
    expect(sm.size()).toBe(2);
  });
  // --- Serialization ---
  it('serialize produces array of entries', () => {
    const sm = new SessionMemory('sess-1');
    sm.store('a', 1);
    sm.store('b', 2);
    const data = sm.serialize();
    expect(Array.isArray(data), 'serialize should return an array').toBe(true);
    expect(data.length).toBe(2);
  });
  it('deserialize reconstructs session memory', () => {
    const sm = new SessionMemory('sess-1');
    sm.store('a', 1);
    sm.store('b', 2);
    const data = sm.serialize();
    const restored = SessionMemory.deserialize('sess-1', data);
    expect(restored.size()).toBe(2);
    expect(restored.retrieve('a')).not.toBeNull();
    expect(restored.retrieve('a')!.value).toBe(1);
  });
  it('round-trip serialize/deserialize preserves data', () => {
    const sm = new SessionMemory('sess-1');
    sm.store('complex', { nested: true, arr: [1, 2] });
    sm.storeWithTtl('ttl-entry', 'val', 60000);
    const data = sm.serialize();
    const restored = SessionMemory.deserialize('sess-1', data);
    expect(restored.retrieve('complex')!.value).toEqual({ nested: true, arr: [1, 2] });
    expect(restored.retrieve('ttl-entry')!.expiresAt).not.toBeNull();
  });
  it('sessionId is set correctly', () => {
    const sm = new SessionMemory('my-session-42');
    expect(sm.getSessionId()).toBe('my-session-42');
    const entry = sm.store('k', 'v');
    expect(entry.sessionId).toBe('my-session-42');
  });
});
