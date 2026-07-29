/**
 * WorkingMemory Tests
 */
import { describe, it, expect } from 'vitest';
import { WorkingMemory } from '../../../core/memory/working-memory.js';

describe('WorkingMemory', () => {
  it('store creates entry with correct key', () => {
    const wm = new WorkingMemory('exec-1');
    const entry = wm.store('my-key', 'hello');
    expect(entry.key).toBe('my-key');
  });
  it('store creates entry with correct value', () => {
    const wm = new WorkingMemory('exec-1');
    const entry = wm.store('my-key', 42);
    expect(entry.value).toBe(42);
  });
  it('store creates entry with layer=working', () => {
    const wm = new WorkingMemory('exec-1');
    const entry = wm.store('k', 'v');
    expect(entry.layer).toBe('working');
  });
  it('store creates entry with accessCount=0', () => {
    const wm = new WorkingMemory('exec-1');
    const entry = wm.store('k', 'v');
    expect(entry.accessCount).toBe(0);
  });
  it('retrieve returns stored entry', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('k', 'v');
    const result = wm.retrieve('k');
    expect(result).not.toBeNull();
    expect(result!.key).toBe('k');
    expect(result!.value).toBe('v');
  });
  it('retrieve returns null for missing key', () => {
    const wm = new WorkingMemory('exec-1');
    const result = wm.retrieve('no-such-key');
    expect(result).toBeNull();
  });
  it('retrieve increments accessCount', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('k', 'v');
    wm.retrieve('k');
    const result = wm.retrieve('k');
    expect(result).not.toBeNull();
    expect(result!.accessCount).toBe(2);
  });
  it('retrieve sets lastAccessedAt', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('k', 'v');
    const result = wm.retrieve('k');
    expect(result).not.toBeNull();
    expect(result!.lastAccessedAt).not.toBeNull();
  });
  it('update modifies existing entry', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('k', 'old');
    const updated = wm.update('k', 'new');
    expect(updated).not.toBeNull();
    expect(updated!.value).toBe('new');
  });
  it('update returns null for missing key', () => {
    const wm = new WorkingMemory('exec-1');
    const result = wm.update('no-key', 'val');
    expect(result).toBeNull();
  });
  it('delete removes entry and returns true', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('k', 'v');
    const deleted = wm.delete('k');
    expect(deleted).toBe(true);
    expect(wm.has('k')).toBe(false);
  });
  it('delete returns false for missing key', () => {
    const wm = new WorkingMemory('exec-1');
    const deleted = wm.delete('no-key');
    expect(deleted).toBe(false);
  });
  it('has returns true for existing key', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('k', 'v');
    expect(wm.has('k')).toBe(true);
  });
  it('has returns false for missing key', () => {
    const wm = new WorkingMemory('exec-1');
    expect(wm.has('no-key')).toBe(false);
  });
  it('clear removes all entries', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('a', 1);
    wm.store('b', 2);
    wm.store('c', 3);
    const cleared = wm.clear();
    expect(cleared).toBe(3);
    expect(wm.size()).toBe(0);
  });
  it('entries_snapshot returns all stored entries', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('a', 1);
    wm.store('b', 2);
    const snapshot = wm.entries_snapshot();
    expect(snapshot.length).toBe(2);
  });
  it('size returns correct count', () => {
    const wm = new WorkingMemory('exec-1');
    expect(wm.size()).toBe(0);
    wm.store('a', 1);
    expect(wm.size()).toBe(1);
    wm.store('b', 2);
    expect(wm.size()).toBe(2);
    wm.delete('a');
    expect(wm.size()).toBe(1);
  });
  it('getStats returns correct entry count', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('a', 'hello');
    wm.store('b', { foo: 'bar' });
    const stats = wm.getStats();
    expect(stats.entries).toBe(2);
    expect(stats.sizeBytes > 0, 'sizeBytes should be positive').toBe(true);
  });
  it('multiple stores with different keys', () => {
    const wm = new WorkingMemory('exec-1');
    wm.store('key1', 'v1');
    wm.store('key2', 'v2');
    wm.store('key3', 'v3');
    expect(wm.size()).toBe(3);
    expect(wm.retrieve('key1')!.value).toBe('v1');
    expect(wm.retrieve('key2')!.value).toBe('v2');
    expect(wm.retrieve('key3')!.value).toBe('v3');
  });
  it('store and retrieve complex values', () => {
    const wm = new WorkingMemory('exec-1');
    const complex = { nested: { arr: [1, 2, 3], flag: true }, str: 'test' };
    wm.store('complex', complex);
    const result = wm.retrieve('complex');
    expect(result).not.toBeNull();
    expect(result!.value).toBe(complex);
  });
});
