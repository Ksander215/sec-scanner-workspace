import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRuntime } from '../../../desktop/local-storage-runtime/local-storage-runtime.js';

describe('LocalStorageRuntime', () => {
  let ls: LocalStorageRuntime;
  beforeEach(async () => { ls = new LocalStorageRuntime(); await ls.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(ls.name).toBe('LocalStorageRuntime'); });
    it('should initialize', () => { expect(ls.initialized).toBe(true); });
    it('should start', async () => { await ls.start(); });
    it('should stop', async () => { await ls.stop(); });
    it('should shutdown', async () => { await ls.shutdown(); expect(ls.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof ls.initialize).toBe('function'); });
  });

  describe('get/set', () => {
    it('should set and get string', () => { ls.set('k1', 'hello'); expect(ls.get('k1')).toBe('hello'); });
    it('should set and get number', () => { ls.set('k2', 42); expect(ls.get('k2')).toBe(42); });
    it('should set and get object', () => { ls.set('k3', { a: 1 }); expect(ls.get('k3').a).toBe(1); });
    it('should set and get array', () => { ls.set('k4', [1, 2, 3]); expect(ls.get('k4').length).toBe(3); });
    it('should return undefined for missing key', () => { expect(ls.get('nope')).toBeUndefined(); });
    it('should overwrite value', () => { ls.set('k1', 'a'); ls.set('k1', 'b'); expect(ls.get('k1')).toBe('b'); });
    it('should get with generic type', () => { ls.set('k', 100); const v: number = ls.get<number>('k')!; expect(v).toBe(100); });
  });

  describe('has', () => {
    it('should return true for existing key', () => { ls.set('k1', 'v'); expect(ls.has('k1')).toBe(true); });
    it('should return false for missing key', () => { expect(ls.has('nope')).toBe(false); });
  });

  describe('delete', () => {
    it('should delete existing key', () => { ls.set('k1', 'v'); expect(ls.delete('k1')).toBe(true); expect(ls.has('k1')).toBe(false); });
    it('should return false for missing key', () => { expect(ls.delete('nope')).toBe(false); });
  });

  describe('clear', () => {
    it('should clear all entries', () => { ls.set('a', 1); ls.set('b', 2); ls.clear(); expect(ls.size).toBe(0); });
    it('should handle empty store', () => { ls.clear(); expect(ls.size).toBe(0); });
  });

  describe('keys', () => {
    it('should return all keys', () => { ls.set('a', 1); ls.set('b', 2); ls.set('c', 3); expect(ls.keys().length).toBe(3); });
    it('should return empty array initially', () => { expect(ls.keys().length).toBe(0); });
  });

  describe('entries', () => {
    it('should return all entries', () => { ls.set('a', 1); ls.set('b', 2); expect(ls.entries().length).toBe(2); });
    it('should return key-value pairs', () => { ls.set('k', 'v'); expect(ls.entries()[0]![0]).toBe('k'); expect(ls.entries()[0]![1]).toBe('v'); });
  });

  describe('size', () => {
    it('should return 0 initially', () => { expect(ls.size).toBe(0); });
    it('should increment on set', () => { ls.set('a', 1); expect(ls.size).toBe(1); });
    it('should decrement on delete', () => { ls.set('a', 1); ls.delete('a'); expect(ls.size).toBe(0); });
    it('should reset on clear', () => { ls.set('a', 1); ls.set('b', 2); ls.clear(); expect(ls.size).toBe(0); });
  });

  describe('edge cases', () => {
    it('should handle null value', () => { ls.set('k', null); expect(ls.get('k')).toBeNull(); });
    it('should handle boolean value', () => { ls.set('k', true); expect(ls.get('k')).toBe(true); });
    it('should store many entries', () => { for (let i = 0; i < 100; i++) ls.set(`k${i}`, i); expect(ls.size).toBe(100); });
    it('should handle shutdown and reinit', async () => { await ls.shutdown(); await ls.initialize(); expect(ls.initialized).toBe(true); });
    it('should handle double init', async () => { await ls.initialize(); expect(ls.initialized).toBe(true); });
  });
});
