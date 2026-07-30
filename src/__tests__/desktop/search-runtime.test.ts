import { describe, it, expect, beforeEach } from 'vitest';
import { SearchRuntime } from '../../desktop/search-runtime/search-runtime.js';

describe('SearchRuntime', () => {
  let rt: SearchRuntime;
  beforeEach(async () => { rt = new SearchRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should initialize', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should have name', () => { expect(rt.name).toBe('SearchRuntime'); });
    it('should start', async () => { await rt.initialize(); await rt.start(); });
    it('should stop', async () => { await rt.initialize(); await rt.stop(); });
    it('should shutdown', async () => { await rt.initialize(); await rt.shutdown(); expect(rt.initialized).toBe(false); });
  });

  describe('methods', () => {
    it('index doc', () => { rt.indexDocument("c", "1", {title:"Hello"}); expect(rt.getCollectionSize("c")).toBe(1); });
    it('find match', () => { rt.indexDocument("c", "1", {name:"alice"}); rt.indexDocument("c", "2", {name:"bob"}); expect(rt.search("c", "alice").length).toBe(1); });
    it('case insensitive', () => { rt.indexDocument("c", "1", {name:"Alice"}); expect(rt.search("c", "alice").length).toBe(1); });
    it('no match', () => { rt.indexDocument("c", "1", {name:"alice"}); expect(rt.search("c", "bob").length).toBe(0); });
    it('empty collection', () => { expect(rt.search("m", "a").length).toBe(0); });
    it('remove from index', () => { rt.indexDocument("c", "1", {n:"a"}); rt.removeFromIndex("c", "1"); expect(rt.getCollectionSize("c")).toBe(0); });
    it('collection names', () => { rt.indexDocument("a", "1", {}); rt.indexDocument("b", "1", {}); expect(rt.getCollectionNames().length).toBe(2); });
    it('clear collection', () => { rt.indexDocument("c", "1", {}); rt.clearCollection("c"); expect(rt.getCollectionSize("c")).toBe(0); });
    it('clear all', () => { rt.indexDocument("a", "1", {}); rt.clearAll(); expect(rt.getCollectionNames().length).toBe(0); });
    it('multi field search', () => { rt.indexDocument("c", "1", {name:"alice",role:"admin"}); expect(rt.search("c", "admin").length).toBe(1); });
    it('empty query', () => { rt.indexDocument("c", "1", {n:"t"}); expect(rt.search("c", "").length).toBe(1); });
    it('multiple docs', () => { rt.indexDocument("c", "1", {n:"a"}); rt.indexDocument("c", "2", {n:"ab"}); rt.indexDocument("c", "3", {n:"abc"}); expect(rt.search("c", "ab").length).toBe(2); });
    it('size of collection', () => { rt.indexDocument("c", "1", {}); rt.indexDocument("c", "2", {}); expect(rt.getCollectionSize("c")).toBe(2); });
    it('non-existing collection size', () => { expect(rt.getCollectionSize("m")).toBe(0); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); await rt.initialize(); expect(rt.initialized).toBe(true); });
  });
});
