import { describe, it, expect, beforeEach } from 'vitest';
import { SearchRuntime } from '../../../desktop/search-runtime/search-runtime.js';

describe('SearchRuntime', () => {
  let s: SearchRuntime;
  beforeEach(async () => { s = new SearchRuntime(); await s.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(s.name).toBe('SearchRuntime'); });
    it('should initialize', () => { expect(s.initialized).toBe(true); });
    it('should start', async () => { await s.start(); });
    it('should stop', async () => { await s.stop(); });
    it('should shutdown', async () => { await s.shutdown(); expect(s.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof s.initialize).toBe('function'); });
  });

  describe('indexDocument', () => {
    it('should index a document', () => { s.indexDocument('col1', 'doc1', { title: 'Hello World' }); expect(s.getCollectionSize('col1')).toBe(1); });
    it('should auto-create collection', () => { s.indexDocument('new-col', 'd1', {}); expect(s.getCollectionNames()).toContain('new-col'); });
    it('should overwrite existing document', () => { s.indexDocument('c', 'd1', { v: 1 }); s.indexDocument('c', 'd1', { v: 2 }); expect(s.getCollectionSize('c')).toBe(1); });
    it('should index multiple documents', () => { s.indexDocument('c', 'd1', {}); s.indexDocument('c', 'd2', {}); expect(s.getCollectionSize('c')).toBe(2); });
    it('should index into multiple collections', () => { s.indexDocument('c1', 'd1', {}); s.indexDocument('c2', 'd1', {}); expect(s.getCollectionNames().length).toBe(2); });
  });

  describe('search', () => {
    it('should find matching document', () => { s.indexDocument('c', 'd1', { title: 'Hello World' }); const r = s.search('c', 'hello'); expect(r.length).toBe(1); });
    it('should be case-insensitive', () => { s.indexDocument('c', 'd1', { title: 'Hello' }); const r = s.search('c', 'HELLO'); expect(r.length).toBe(1); });
    it('should search across all fields', () => { s.indexDocument('c', 'd1', { title: 'Foo', body: 'Bar' }); const r = s.search('c', 'bar'); expect(r.length).toBe(1); });
    it('should return empty for no match', () => { s.indexDocument('c', 'd1', { title: 'Foo' }); expect(s.search('c', 'xyz').length).toBe(0); });
    it('should return empty for non-existent collection', () => { expect(s.search('nope', 'q').length).toBe(0); });
    it('should find multiple matches', () => { s.indexDocument('c', 'd1', { t: 'hello' }); s.indexDocument('c', 'd2', { t: 'hello' }); expect(s.search('c', 'hello').length).toBe(2); });
    it('should match partial strings', () => { s.indexDocument('c', 'd1', { t: 'foobar' }); expect(s.search('c', 'bar').length).toBe(1); });
    it('should search numbers as strings', () => { s.indexDocument('c', 'd1', { count: 42 }); const r = s.search('c', '42'); expect(r.length).toBe(1); });
  });

  describe('removeFromIndex', () => {
    it('should remove document', () => { s.indexDocument('c', 'd1', {}); s.removeFromIndex('c', 'd1'); expect(s.getCollectionSize('c')).toBe(0); });
    it('should no-op for missing document', () => { s.removeFromIndex('c', 'nope'); });
    it('should no-op for missing collection', () => { s.removeFromIndex('nope', 'd1'); });
  });

  describe('collections', () => {
    it('should list collection names', () => { s.indexDocument('c1', 'd1', {}); s.indexDocument('c2', 'd1', {}); expect(s.getCollectionNames().length).toBe(2); });
    it('should return 0 size for non-existent collection', () => { expect(s.getCollectionSize('nope')).toBe(0); });
    it('should clear collection', () => { s.indexDocument('c', 'd1', {}); s.indexDocument('c', 'd2', {}); s.clearCollection('c'); expect(s.getCollectionSize('c')).toBe(0); });
    it('should clear all collections', () => { s.indexDocument('c1', 'd1', {}); s.indexDocument('c2', 'd1', {}); s.clearAll(); expect(s.getCollectionNames().length).toBe(0); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await s.shutdown(); await s.initialize(); expect(s.initialized).toBe(true); });
    it('should handle double init', async () => { await s.initialize(); expect(s.initialized).toBe(true); });
    it('should index many documents', () => { for (let i = 0; i < 100; i++) s.indexDocument('c', `d${i}`, { v: i }); expect(s.getCollectionSize('c')).toBe(100); });
    it('should handle complex documents', () => { s.indexDocument('c', 'd1', { title: 'Hello', tags: ['foo', 'bar'] }); const r = s.search('c', 'foo'); expect(r.length).toBe(1); });
  });
});
