import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRuntime } from '../../desktop/local-storage-runtime/local-storage-runtime.js';

describe('LocalStorageRuntime', () => {
  let rt: LocalStorageRuntime;
  beforeEach(async () => { rt = new LocalStorageRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should initialize', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should have name', () => { expect(rt.name).toBe('LocalStorageRuntime'); });
    it('should start', async () => { await rt.initialize(); await rt.start(); });
    it('should stop', async () => { await rt.initialize(); await rt.stop(); });
    it('should shutdown', async () => { await rt.initialize(); await rt.shutdown(); expect(rt.initialized).toBe(false); });
  });

  describe('methods', () => {
    it('set string', () => { rt.set("k", "v"); expect(rt.get("k")).toBe("v"); });
    it('set number', () => { rt.set("n", 42); expect(rt.get("n")).toBe(42); });
    it('set object', () => { rt.set("o", {a:1}); expect(rt.get("o")).toEqual({a:1}); });
    it('set boolean', () => { rt.set("f", true); expect(rt.get("f")).toBe(true); });
    it('set null', () => { rt.set("n", null); expect(rt.get("n")).toBeNull(); });
    it('has existing', () => { rt.set("x", 1); expect(rt.has("x")).toBe(true); });
    it('has missing', () => { expect(rt.has("m")).toBe(false); });
    it('delete existing', () => { rt.set("x", 1); expect(rt.delete("x")).toBe(true); expect(rt.has("x")).toBe(false); });
    it('delete missing', () => { expect(rt.delete("m")).toBe(false); });
    it('clear', () => { rt.set("a", 1); rt.set("b", 2); rt.clear(); expect(rt.size).toBe(0); });
    it('size', () => { rt.set("a", 1); rt.set("b", 2); expect(rt.size).toBe(2); });
    it('keys', () => { rt.set("a", 1); rt.set("b", 2); expect(rt.keys()).toEqual(["a","b"]); });
    it('entries', () => { rt.set("a", 1); rt.set("b", 2); expect(rt.entries().length).toBe(2); });
    it('get missing', () => { expect(rt.get("m")).toBeUndefined(); });
    it('overwrite', () => { rt.set("x", 1); rt.set("x", 2); expect(rt.get("x")).toBe(2); });
    it('get after clear', () => { rt.set("x", 1); rt.clear(); expect(rt.get("x")).toBeUndefined(); });
    it('empty initially', () => { expect(rt.size).toBe(0); });
    it('set array', () => { rt.set("arr", [1,2,3]); expect(rt.get<number[]>("arr")).toEqual([1,2,3]); });
    it('set nested object', () => { rt.set("n", {a:{b:1}}); expect(rt.get("n")).toEqual({a:{b:1}}); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); await rt.initialize(); expect(rt.initialized).toBe(true); });
  });
});
