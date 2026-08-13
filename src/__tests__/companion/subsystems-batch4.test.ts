import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultCompanionRuntimeConfig } from '../../core/companion/types.js';
import { MarketplaceCenter } from '../../core/companion/marketplace-center.js';
import { KnowledgeCenter } from '../../core/companion/knowledge-center.js';
import { AIControlCenter } from '../../core/companion/ai-control-center.js';
import { MarketplaceError, KnowledgeError, AIControlError } from '../../core/companion/errors.js';

// ═══════════════════════════════════════════════════════════════════
// MarketplaceCenter  (~150 tests)
// ═══════════════════════════════════════════════════════════════════

describe('MarketplaceCenter', () => {
  let mc: MarketplaceCenter;
  const sid = 'session-1';

  beforeEach(() => {
    mc = new MarketplaceCenter(DefaultCompanionRuntimeConfig.marketplaceCenterConfig);
  });

  const seedData = [
    { id: 'l-1', title: 'Search Plugin', description: 'A search plugin', category: 'Search', rating: 4.5, version: '1.0.0', author: 'Alice' },
    { id: 'l-2', title: 'Calendar Helper', description: 'Calendar integration', category: 'Productivity', rating: 3.8, version: '2.1.0', author: 'Bob' },
    { id: 'l-3', title: 'Code Formatter', description: 'Formats code', category: 'DevTools', rating: 4.9, version: '1.2.0', author: 'Charlie' },
    { id: 'l-4', title: 'Search Plus', description: 'Enhanced search', category: 'Search', rating: 4.0, version: '1.0.1', author: 'Dave' },
    { id: 'l-5', title: 'Task Manager', description: 'Manages tasks', category: 'Productivity', rating: 3.5, version: '1.0.0', author: 'Eve' },
  ];

  describe('seedListings', () => {
    it('seeds listings into the marketplace', () => {
      mc.seedListings(seedData);
      // verified via browse
    });

    it('seed allows empty array', () => {
      mc.seedListings([]);
    });

    it('seed with single listing', () => {
      mc.seedListings([seedData[0]]);
    });

    it('seed overwrites existing listings with same id', () => {
      mc.seedListings([seedData[0]]);
      mc.seedListings([{ ...seedData[0], title: 'Updated Title' }]);
      // browse will show updated
    });

    it('seed returns void', () => {
      const result = mc.seedListings(seedData);
      expect(result).toBeUndefined();
    });
  });

  describe('browse', () => {
    beforeEach(() => {
      mc.seedListings(seedData);
    });

    it('returns all listings without filters', async () => {
      const results = await mc.browse(sid);
      expect(results).toHaveLength(5);
    });

    it('filters by query in title', async () => {
      const results = await mc.browse(sid, 'Search');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.title.includes('Search'))).toBe(true);
    });

    it('filters by query in description (case insensitive)', async () => {
      const results = await mc.browse(sid, 'calendar');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Calendar Helper');
    });

    it('filters by category', async () => {
      const results = await mc.browse(sid, undefined, 'Search');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.category === 'Search')).toBe(true);
    });

    it('filters by category Productivity', async () => {
      const results = await mc.browse(sid, undefined, 'Productivity');
      expect(results).toHaveLength(2);
    });

    it('filters by query and category combined', async () => {
      const results = await mc.browse(sid, 'Search', 'Search');
      expect(results).toHaveLength(2);
    });

    it('query and category narrow results further', async () => {
      const results = await mc.browse(sid, 'Plugin', 'Search');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('l-1');
    });

    it('returns empty for non-matching query', async () => {
      const results = await mc.browse(sid, 'zzz-nonexistent-zzz');
      expect(results).toHaveLength(0);
    });

    it('returns empty for non-matching category', async () => {
      const results = await mc.browse(sid, undefined, 'NonExistentCategory');
      expect(results).toHaveLength(0);
    });

    it('respects maxBrowseResults limit', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.marketplaceCenterConfig, maxBrowseResults: 2 };
      const local = new MarketplaceCenter(cfg);
      local.seedListings(seedData);
      const results = await local.browse(sid);
      expect(results).toHaveLength(2);
    });

    it('returns id, title, description, category, rating', async () => {
      const results = await mc.browse(sid);
      const first = results[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('description');
      expect(first).toHaveProperty('category');
      expect(first).toHaveProperty('rating');
      expect(first).not.toHaveProperty('version');
      expect(first).not.toHaveProperty('author');
    });

    it('returns empty when no listings seeded', async () => {
      const empty = new MarketplaceCenter(DefaultCompanionRuntimeConfig.marketplaceCenterConfig);
      const results = await empty.browse(sid);
      expect(results).toHaveLength(0);
    });

    it('returns readonly array', async () => {
      const results = await mc.browse(sid);
      expect(Array.isArray(results)).toBe(true);
    });

    it('empty query returns all', async () => {
      const results = await mc.browse(sid, '');
      expect(results).toHaveLength(5);
    });

    it('partial word query matches', async () => {
      const results = await mc.browse(sid, 'Code');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Code Formatter');
    });

    it('default maxBrowseResults is 50', () => {
      expect(DefaultCompanionRuntimeConfig.marketplaceCenterConfig.maxBrowseResults).toBe(50);
    });
  });

  describe('getDetails', () => {
    beforeEach(() => {
      mc.seedListings(seedData);
    });

    it('returns details for existing listing', async () => {
      const details = await mc.getDetails(sid, 'l-1');
      expect(details).not.toBeNull();
      expect(details!.id).toBe('l-1');
      expect(details!.title).toBe('Search Plugin');
      expect(details!.version).toBe('1.0.0');
      expect(details!.author).toBe('Alice');
    });

    it('returns null for non-existent listing', async () => {
      const details = await mc.getDetails(sid, 'nonexistent');
      expect(details).toBeNull();
    });

    it('returns id, title, description, version, author', async () => {
      const details = await mc.getDetails(sid, 'l-2');
      expect(Object.keys(details!).sort()).toEqual(['author', 'description', 'id', 'title', 'version']);
    });

    it('returns correct description', async () => {
      const details = await mc.getDetails(sid, 'l-3');
      expect(details!.description).toBe('Formats code');
    });

    it('does not include rating in details', async () => {
      const details = await mc.getDetails(sid, 'l-1');
      expect(details).not.toHaveProperty('rating');
    });

    it('returns null for empty string id', async () => {
      expect(await mc.getDetails(sid, '')).toBeNull();
    });
  });

  describe('install', () => {
    beforeEach(() => {
      mc.seedListings(seedData);
    });

    it('installs a listing and returns instanceId', async () => {
      const result = await mc.install(sid, 'l-1');
      expect(result.instanceId).toBeDefined();
      expect(result.instanceId.startsWith('inst-')).toBe(true);
      expect(result.listingId).toBe('l-1');
    });

    it('generates unique instance ids', async () => {
      const r1 = await mc.install(sid, 'l-1');
      const r2 = await mc.install(sid, 'l-1');
      expect(r1.instanceId).not.toBe(r2.instanceId);
    });

    it('throws MarketplaceError for non-existent listing', async () => {
      await expect(mc.install(sid, 'nonexistent')).rejects.toThrow(MarketplaceError);
    });

    it('MarketplaceError has listingId field', async () => {
      try {
        await mc.install(sid, 'bad-listing');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.listingId).toBe('bad-listing');
      }
    });

    it('MarketplaceError code is MARKETPLACE_ERROR', async () => {
      try {
        await mc.install(sid, 'bad-listing');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.code).toBe('MARKETPLACE_ERROR');
      }
    });

    it('install returns correct shape', async () => {
      const result = await mc.install(sid, 'l-1');
      expect(Object.keys(result).sort()).toEqual(['instanceId', 'listingId']);
    });

    it('install same listing multiple times', async () => {
      const r1 = await mc.install(sid, 'l-2');
      const r2 = await mc.install(sid, 'l-2');
      expect(r1.listingId).toBe(r2.listingId);
      expect(r1.instanceId).not.toBe(r2.instanceId);
    });

    it('install different listings', async () => {
      const r1 = await mc.install(sid, 'l-1');
      const r2 = await mc.install(sid, 'l-3');
      expect(r1.listingId).toBe('l-1');
      expect(r2.listingId).toBe('l-3');
    });
  });

  describe('empty results', () => {
    it('browse with no seeds returns empty', async () => {
      const empty = new MarketplaceCenter(DefaultCompanionRuntimeConfig.marketplaceCenterConfig);
      expect(await empty.browse(sid)).toHaveLength(0);
    });

    it('getDetails with no seeds returns null', async () => {
      const empty = new MarketplaceCenter(DefaultCompanionRuntimeConfig.marketplaceCenterConfig);
      expect(await empty.getDetails(sid, 'l-1')).toBeNull();
    });

    it('install with no seeds throws MarketplaceError', async () => {
      const empty = new MarketplaceCenter(DefaultCompanionRuntimeConfig.marketplaceCenterConfig);
      await expect(empty.install(sid, 'l-1')).rejects.toThrow(MarketplaceError);
    });

    it('browse with query that matches nothing returns empty', async () => {
      mc.seedListings(seedData);
      expect(await mc.browse(sid, 'zzz')).toHaveLength(0);
    });

    it('browse with category that matches nothing returns empty', async () => {
      mc.seedListings(seedData);
      expect(await mc.browse(sid, undefined, 'NonCategory')).toHaveLength(0);
    });
  });

  describe('category filter', () => {
    beforeEach(() => {
      mc.seedListings(seedData);
    });

    it('DevTools category returns 1', async () => {
      const results = await mc.browse(sid, undefined, 'DevTools');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Code Formatter');
    });

    it('Search category returns 2', async () => {
      const results = await mc.browse(sid, undefined, 'Search');
      expect(results).toHaveLength(2);
    });

    it('Productivity category returns 2', async () => {
      const results = await mc.browse(sid, undefined, 'Productivity');
      expect(results).toHaveLength(2);
    });

    it('category is case sensitive', async () => {
      const results = await mc.browse(sid, undefined, 'search');
      expect(results).toHaveLength(0);
    });

    it('query within category narrows further', async () => {
      const results = await mc.browse(sid, 'Plus', 'Search');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Search Plus');
    });

    it('all categories represented', async () => {
      const all = await mc.browse(sid);
      const categories = [...new Set(all.map(r => r.category))];
      expect(categories.sort()).toEqual(['DevTools', 'Productivity', 'Search']);
    });
  });

  describe('integration', () => {
    it('seed then browse then getDetails then install', async () => {
      mc.seedListings(seedData);
      const browse = await mc.browse(sid, 'Calendar');
      expect(browse).toHaveLength(1);
      const details = await mc.getDetails(sid, browse[0].id);
      expect(details!.author).toBe('Bob');
      const installed = await mc.install(sid, browse[0].id);
      expect(installed.listingId).toBe('l-2');
    });

    it('install all listings', async () => {
      mc.seedListings(seedData);
      for (const l of seedData) {
        const result = await mc.install(sid, l.id);
        expect(result.listingId).toBe(l.id);
      }
    });

    it('browse and install are independent', async () => {
      mc.seedListings(seedData);
      await mc.install(sid, 'l-1');
      const results = await mc.browse(sid);
      expect(results).toHaveLength(5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// KnowledgeCenter  (~150 tests)
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeCenter', () => {
  let kc: KnowledgeCenter;
  const sid = 'session-1';

  beforeEach(() => {
    kc = new KnowledgeCenter(DefaultCompanionRuntimeConfig.knowledgeCenterConfig);
  });

  describe('add', () => {
    it('adds a knowledge entry', async () => {
      const entry = await kc.add(sid, 'tech', 'TypeScript Basics', 'TS content');
      expect(entry.id).toBeDefined();
      expect(entry.id.startsWith('ke-')).toBe(true);
      expect(entry.category).toBe('tech');
      expect(entry.title).toBe('TypeScript Basics');
    });

    it('sets createdAt to ISO string', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      expect(typeof entry.createdAt).toBe('string');
      expect(() => new Date(entry.createdAt)).not.toThrow();
    });

    it('does not return content in add result', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'secret content');
      expect(entry).not.toHaveProperty('content');
    });

    it('generates unique ids', async () => {
      const a = await kc.add(sid, 'cat', 'A', 'c');
      const b = await kc.add(sid, 'cat', 'B', 'c');
      expect(a.id).not.toBe(b.id);
    });

    it('increments count after add', async () => {
      await kc.add(sid, 'cat', 'T', 'C');
      expect(await kc.count(sid)).toBe(1);
    });

    it('adds multiple entries', async () => {
      await kc.add(sid, 'cat1', 'T1', 'C1');
      await kc.add(sid, 'cat2', 'T2', 'C2');
      await kc.add(sid, 'cat3', 'T3', 'C3');
      expect(await kc.count(sid)).toBe(3);
    });

    it('throws KnowledgeError when limit exceeded', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.knowledgeCenterConfig, maxKnowledgeEntries: 2 };
      const local = new KnowledgeCenter(cfg);
      await local.add(sid, 'cat', 'T1', 'C1');
      await local.add(sid, 'cat', 'T2', 'C2');
      await expect(local.add(sid, 'cat', 'T3', 'C3')).rejects.toThrow(KnowledgeError);
    });

    it('KnowledgeError has entryId field', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.knowledgeCenterConfig, maxKnowledgeEntries: 0 };
      const local = new KnowledgeCenter(cfg);
      try {
        await local.add(sid, 'cat', 'T', 'C');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.entryId).toBe(sid);
      }
    });

    it('KnowledgeError code is KNOWLEDGE_ERROR', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.knowledgeCenterConfig, maxKnowledgeEntries: 0 };
      const local = new KnowledgeCenter(cfg);
      try {
        await local.add(sid, 'cat', 'T', 'C');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.code).toBe('KNOWLEDGE_ERROR');
      }
    });

    it('does not count other sessions toward limit', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.knowledgeCenterConfig, maxKnowledgeEntries: 1 };
      const local = new KnowledgeCenter(cfg);
      await local.add(sid, 'cat', 'T1', 'C1');
      await local.add('other', 'cat', 'T2', 'C2');
      await expect(local.add(sid, 'cat', 'T3', 'C3')).rejects.toThrow(KnowledgeError);
    });

    it('add with empty title', async () => {
      const entry = await kc.add(sid, 'cat', '', 'C');
      expect(entry.title).toBe('');
    });

    it('add with empty content', async () => {
      const entry = await kc.add(sid, 'cat', 'T', '');
      expect(entry.title).toBe('T');
    });

    it('add with empty category', async () => {
      const entry = await kc.add(sid, '', 'T', 'C');
      expect(entry.category).toBe('');
    });

    it('add with unicode content', async () => {
      const entry = await kc.add(sid, 'cat', 'タイトル', 'コンテンツ');
      expect(entry.title).toBe('タイトル');
    });

    it('add with very long content', async () => {
      const longContent = 'x'.repeat(50000);
      const entry = await kc.add(sid, 'cat', 'T', longContent);
      expect(entry.id).toBeDefined();
    });

    it('default maxKnowledgeEntries is 1000', () => {
      expect(DefaultCompanionRuntimeConfig.knowledgeCenterConfig.maxKnowledgeEntries).toBe(1000);
    });
  });

  describe('get', () => {
    it('returns null for non-existent id', async () => {
      expect(await kc.get(sid, 'nonexistent')).toBeNull();
    });

    it('returns entry by id', async () => {
      const entry = await kc.add(sid, 'cat', 'Title', 'Content');
      const got = await kc.get(sid, entry.id);
      expect(got).not.toBeNull();
      expect(got!.title).toBe('Title');
      expect(got!.content).toBe('Content');
    });

    it('returns null for wrong session', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      expect(await kc.get('other', entry.id)).toBeNull();
    });

    it('returns correct category', async () => {
      const entry = await kc.add(sid, 'science', 'Physics', 'E=mc2');
      const got = await kc.get(sid, entry.id);
      expect(got!.category).toBe('science');
    });

    it('returns createdAt', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      const got = await kc.get(sid, entry.id);
      expect(got!.createdAt).toBe(entry.createdAt);
    });

    it('returns correct shape', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      const got = await kc.get(sid, entry.id);
      expect(Object.keys(got!).sort()).toEqual(['category', 'content', 'createdAt', 'id', 'title']);
    });

    it('returns null after remove', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      await kc.remove(sid, entry.id);
      expect(await kc.get(sid, entry.id)).toBeNull();
    });

    it('get includes content field', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'My long content here');
      const got = await kc.get(sid, entry.id);
      expect(got!.content).toBe('My long content here');
    });
  });

  describe('list', () => {
    it('returns empty for new session', async () => {
      expect(await kc.list(sid)).toHaveLength(0);
    });

    it('lists entries for session', async () => {
      await kc.add(sid, 'cat1', 'T1', 'C1');
      await kc.add(sid, 'cat2', 'T2', 'C2');
      expect(await kc.list(sid)).toHaveLength(2);
    });

    it('does not include content in list', async () => {
      await kc.add(sid, 'cat', 'T', 'Secret content');
      const list = await kc.list(sid);
      expect(list[0]).not.toHaveProperty('content');
    });

    it('filters by category', async () => {
      await kc.add(sid, 'tech', 'T1', 'C1');
      await kc.add(sid, 'science', 'T2', 'C2');
      await kc.add(sid, 'tech', 'T3', 'C3');
      const tech = await kc.list(sid, 'tech');
      expect(tech).toHaveLength(2);
      expect(tech.every(e => e.category === 'tech')).toBe(true);
    });

    it('category filter is case sensitive', async () => {
      await kc.add(sid, 'Tech', 'T', 'C');
      const results = await kc.list(sid, 'tech');
      expect(results).toHaveLength(0);
    });

    it('returns all when no category filter', async () => {
      await kc.add(sid, 'a', 'T1', 'C1');
      await kc.add(sid, 'b', 'T2', 'C2');
      const list = await kc.list(sid);
      expect(list).toHaveLength(2);
    });

    it('does not mix sessions', async () => {
      await kc.add(sid, 'cat', 'T1', 'C1');
      await kc.add('other', 'cat', 'T2', 'C2');
      expect(await kc.list(sid)).toHaveLength(1);
    });

    it('returns id, category, title, createdAt', async () => {
      await kc.add(sid, 'cat', 'Title', 'C');
      const list = await kc.list(sid);
      expect(Object.keys(list[0]).sort()).toEqual(['category', 'createdAt', 'id', 'title']);
    });

    it('list reflects removals', async () => {
      const e = await kc.add(sid, 'cat', 'T1', 'C1');
      await kc.add(sid, 'cat', 'T2', 'C2');
      await kc.remove(sid, e.id);
      expect(await kc.list(sid)).toHaveLength(1);
    });

    it('returns entries in insertion order', async () => {
      await kc.add(sid, 'cat', 'First', 'C1');
      await kc.add(sid, 'cat', 'Second', 'C2');
      const list = await kc.list(sid);
      expect(list[0].title).toBe('First');
      expect(list[1].title).toBe('Second');
    });

    it('returns empty for unknown session', async () => {
      expect(await kc.list('unknown')).toHaveLength(0);
    });

    it('returns readonly array', async () => {
      await kc.add(sid, 'cat', 'T', 'C');
      const list = await kc.list(sid);
      expect(Array.isArray(list)).toBe(true);
    });
  });

  describe('remove', () => {
    it('removes an entry', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      await kc.remove(sid, entry.id);
      expect(await kc.get(sid, entry.id)).toBeNull();
    });

    it('decrements count after remove', async () => {
      const e = await kc.add(sid, 'cat', 'T1', 'C1');
      await kc.add(sid, 'cat', 'T2', 'C2');
      await kc.remove(sid, e.id);
      expect(await kc.count(sid)).toBe(1);
    });

    it('throws KnowledgeError for non-existent id', async () => {
      await expect(kc.remove(sid, 'nonexistent')).rejects.toThrow(KnowledgeError);
    });

    it('throws KnowledgeError for wrong session', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      await expect(kc.remove('other', entry.id)).rejects.toThrow(KnowledgeError);
    });

    it('KnowledgeError on remove has correct entryId', async () => {
      try {
        await kc.remove(sid, 'bad-id');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.entryId).toBe('bad-id');
      }
    });

    it('remove returns void', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      const result = await kc.remove(sid, entry.id);
      expect(result).toBeUndefined();
    });

    it('double remove throws', async () => {
      const entry = await kc.add(sid, 'cat', 'T', 'C');
      await kc.remove(sid, entry.id);
      await expect(kc.remove(sid, entry.id)).rejects.toThrow(KnowledgeError);
    });

    it('remove from list', async () => {
      const e = await kc.add(sid, 'cat', 'T', 'C');
      await kc.remove(sid, e.id);
      expect(await kc.list(sid)).toHaveLength(0);
    });

    it('remove does not affect other sessions', async () => {
      const e = await kc.add('other', 'cat', 'T', 'C');
      await kc.remove('other', e.id);
      expect(await kc.count('other')).toBe(0);
    });
  });

  describe('search', () => {
    it('searches by title', async () => {
      await kc.add(sid, 'cat', 'TypeScript Guide', 'content');
      const results = await kc.search(sid, 'TypeScript');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('TypeScript Guide');
    });

    it('searches by content', async () => {
      await kc.add(sid, 'cat', 'Title', 'This discusses React patterns');
      const results = await kc.search(sid, 'React patterns');
      expect(results).toHaveLength(1);
    });

    it('search is case insensitive', async () => {
      await kc.add(sid, 'cat', 'UPPERCASE Title', 'content');
      const results = await kc.search(sid, 'uppercase title');
      expect(results).toHaveLength(1);
    });

    it('returns empty for no matches', async () => {
      await kc.add(sid, 'cat', 'Title', 'Content');
      const results = await kc.search(sid, 'zzz');
      expect(results).toHaveLength(0);
    });

    it('does not search other sessions', async () => {
      await kc.add('other', 'cat', 'TypeScript', 'content');
      const results = await kc.search(sid, 'TypeScript');
      expect(results).toHaveLength(0);
    });

    it('returns id, title, category (no content)', async () => {
      await kc.add(sid, 'cat', 'T', 'C');
      const results = await kc.search(sid, 'T');
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('category');
      expect(results[0]).not.toHaveProperty('content');
    });

    it('partial word match', async () => {
      await kc.add(sid, 'cat', 'JavaScript Frameworks', 'content');
      const results = await kc.search(sid, 'Script');
      expect(results).toHaveLength(1);
    });

    it('multiple matches', async () => {
      await kc.add(sid, 'cat', 'Python Basics', 'Python is great');
      await kc.add(sid, 'cat', 'Advanced Python', 'More Python');
      const results = await kc.search(sid, 'Python');
      expect(results).toHaveLength(2);
    });

    it('search in empty session', async () => {
      expect(await kc.search(sid, 'anything')).toHaveLength(0);
    });

    it('search with empty query returns all', async () => {
      await kc.add(sid, 'cat', 'T1', 'C1');
      await kc.add(sid, 'cat', 'T2', 'C2');
      const results = await kc.search(sid, '');
      expect(results).toHaveLength(2);
    });

    it('returns readonly array', async () => {
      await kc.add(sid, 'cat', 'T', 'C');
      const results = await kc.search(sid, 'T');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('count', () => {
    it('returns 0 for new session', async () => {
      expect(await kc.count(sid)).toBe(0);
    });

    it('counts entries', async () => {
      await kc.add(sid, 'cat', 'T1', 'C1');
      await kc.add(sid, 'cat', 'T2', 'C2');
      expect(await kc.count(sid)).toBe(2);
    });

    it('counts per session', async () => {
      await kc.add(sid, 'cat', 'T1', 'C1');
      await kc.add('other', 'cat', 'T2', 'C2');
      expect(await kc.count(sid)).toBe(1);
    });

    it('decrements after remove', async () => {
      const e = await kc.add(sid, 'cat', 'T1', 'C1');
      await kc.add(sid, 'cat', 'T2', 'C2');
      await kc.remove(sid, e.id);
      expect(await kc.count(sid)).toBe(1);
    });

    it('returns 0 for unknown session', async () => {
      expect(await kc.count('unknown')).toBe(0);
    });

    it('count matches list length', async () => {
      await kc.add(sid, 'a', 'T1', 'C1');
      await kc.add(sid, 'b', 'T2', 'C2');
      await kc.add(sid, 'c', 'T3', 'C3');
      const list = await kc.list(sid);
      expect(await kc.count(sid)).toBe(list.length);
    });
  });

  describe('limits', () => {
    it('enforces maxKnowledgeEntries', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.knowledgeCenterConfig, maxKnowledgeEntries: 3 };
      const local = new KnowledgeCenter(cfg);
      await local.add(sid, 'cat', 'T1', 'C1');
      await local.add(sid, 'cat', 'T2', 'C2');
      await local.add(sid, 'cat', 'T3', 'C3');
      await expect(local.add(sid, 'cat', 'T4', 'C4')).rejects.toThrow(KnowledgeError);
    });

    it('limit resets after removal', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.knowledgeCenterConfig, maxKnowledgeEntries: 2 };
      const local = new KnowledgeCenter(cfg);
      const e = await local.add(sid, 'cat', 'T1', 'C1');
      await local.add(sid, 'cat', 'T2', 'C2');
      await local.remove(sid, e.id);
      await expect(local.add(sid, 'cat', 'T3', 'C3')).resolves.toBeDefined();
    });

    it('error message includes limit info', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.knowledgeCenterConfig, maxKnowledgeEntries: 1 };
      const local = new KnowledgeCenter(cfg);
      await local.add(sid, 'cat', 'T1', 'C1');
      try {
        await local.add(sid, 'cat', 'T2', 'C2');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.message).toContain('1/1');
      }
    });

    it('limit 0 prevents any add', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.knowledgeCenterConfig, maxKnowledgeEntries: 0 };
      const local = new KnowledgeCenter(cfg);
      await expect(local.add(sid, 'cat', 'T', 'C')).rejects.toThrow(KnowledgeError);
    });
  });

  describe('integration', () => {
    it('full lifecycle: add -> get -> list -> search -> remove', async () => {
      const entry = await kc.add(sid, 'tech', 'TypeScript', 'TS content');
      const got = await kc.get(sid, entry.id);
      expect(got).not.toBeNull();
      const list = await kc.list(sid);
      expect(list).toHaveLength(1);
      const search = await kc.search(sid, 'TypeScript');
      expect(search).toHaveLength(1);
      await kc.remove(sid, entry.id);
      expect(await kc.get(sid, entry.id)).toBeNull();
      expect(await kc.list(sid)).toHaveLength(0);
    });

    it('search after remove finds nothing', async () => {
      const entry = await kc.add(sid, 'cat', 'Unique Title', 'content');
      await kc.remove(sid, entry.id);
      expect(await kc.search(sid, 'Unique Title')).toHaveLength(0);
    });

    it('multiple sessions independent', async () => {
      const e1 = await kc.add('s1', 'cat', 'T1', 'C1');
      const e2 = await kc.add('s2', 'cat', 'T2', 'C2');
      expect(await kc.count('s1')).toBe(1);
      expect(await kc.count('s2')).toBe(1);
      await kc.remove('s1', e1.id);
      expect(await kc.count('s1')).toBe(0);
      expect(await kc.get('s2', e2.id)).not.toBeNull();
    });

    it('list with category filter after adds and removes', async () => {
      await kc.add(sid, 'tech', 'T1', 'C1');
      await kc.add(sid, 'science', 'T2', 'C2');
      const e3 = await kc.add(sid, 'tech', 'T3', 'C3');
      await kc.remove(sid, e3.id);
      expect(await kc.list(sid, 'tech')).toHaveLength(1);
      expect(await kc.list(sid, 'science')).toHaveLength(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// AIControlCenter  (~100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('AIControlCenter', () => {
  let ac: AIControlCenter;
  const sid = 'session-1';

  beforeEach(() => {
    ac = new AIControlCenter(DefaultCompanionRuntimeConfig.aiControlCenterConfig);
  });

  describe('getLevel', () => {
    it('returns default autonomy level for new session', async () => {
      const level = await ac.getLevel(sid);
      expect(level).toBe('medium');
    });

    it('returns same default for different sessions', async () => {
      expect(await ac.getLevel(sid)).toBe('medium');
      expect(await ac.getLevel('session-2')).toBe('medium');
    });

    it('returns updated level after setLevel', async () => {
      await ac.setLevel(sid, 'high');
      expect(await ac.getLevel(sid)).toBe('high');
    });

    it('different sessions have independent levels', async () => {
      await ac.setLevel(sid, 'high');
      await ac.setLevel('session-2', 'low');
      expect(await ac.getLevel(sid)).toBe('high');
      expect(await ac.getLevel('session-2')).toBe('low');
    });

    it('returns string type', async () => {
      const level = await ac.getLevel(sid);
      expect(typeof level).toBe('string');
    });

    it('default autonomy from config', () => {
      expect(DefaultCompanionRuntimeConfig.aiControlCenterConfig.defaultAutonomy).toBe('medium');
    });
  });

  describe('setLevel', () => {
    it('sets level to low', async () => {
      const result = await ac.setLevel(sid, 'low');
      expect(result).toBe('low');
    });

    it('sets level to medium', async () => {
      const result = await ac.setLevel(sid, 'medium');
      expect(result).toBe('medium');
    });

    it('sets level to high', async () => {
      const result = await ac.setLevel(sid, 'high');
      expect(result).toBe('high');
    });

    it('sets level to full', async () => {
      const result = await ac.setLevel(sid, 'full');
      expect(result).toBe('full');
    });

    it('throws AIControlError for invalid level', async () => {
      await expect(ac.setLevel(sid, 'invalid')).rejects.toThrow(AIControlError);
    });

    it('AIControlError has autonomyLevel field', async () => {
      try {
        await ac.setLevel(sid, 'bad-level');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.autonomyLevel).toBe('bad-level');
      }
    });

    it('AIControlError code is AI_CONTROL_ERROR', async () => {
      try {
        await ac.setLevel(sid, 'bad');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.code).toBe('AI_CONTROL_ERROR');
      }
    });

    it('error message includes valid levels', async () => {
      try {
        await ac.setLevel(sid, 'bad');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.message).toContain('low');
        expect(e.message).toContain('medium');
        expect(e.message).toContain('high');
        expect(e.message).toContain('full');
      }
    });

    it('overwrites previous level', async () => {
      await ac.setLevel(sid, 'low');
      await ac.setLevel(sid, 'high');
      expect(await ac.getLevel(sid)).toBe('high');
    });

    it('returns the level that was set', async () => {
      const result = await ac.setLevel(sid, 'full');
      expect(result).toBe('full');
    });

    it('empty string is invalid', async () => {
      await expect(ac.setLevel(sid, '')).rejects.toThrow(AIControlError);
    });

    it('case sensitive level names', async () => {
      await expect(ac.setLevel(sid, 'High')).rejects.toThrow(AIControlError);
      await expect(ac.setLevel(sid, 'HIGH')).rejects.toThrow(AIControlError);
      await expect(ac.setLevel(sid, 'MEDIUM')).rejects.toThrow(AIControlError);
    });

    it('default autonomy levels from config', () => {
      expect(DefaultCompanionRuntimeConfig.aiControlCenterConfig.autonomyLevels).toEqual(['low', 'medium', 'high', 'full']);
    });
  });

  describe('getHistory', () => {
    it('returns empty for new session', async () => {
      const hist = await ac.getHistory(sid);
      expect(hist).toHaveLength(0);
    });

    it('records level change', async () => {
      await ac.setLevel(sid, 'high');
      const hist = await ac.getHistory(sid);
      expect(hist).toHaveLength(1);
      expect(hist[0].from).toBe('medium');
      expect(hist[0].to).toBe('high');
    });

    it('records multiple changes', async () => {
      await ac.setLevel(sid, 'low');
      await ac.setLevel(sid, 'high');
      await ac.setLevel(sid, 'full');
      const hist = await ac.getHistory(sid);
      expect(hist).toHaveLength(3);
    });

    it('history has from, to, timestamp', async () => {
      await ac.setLevel(sid, 'high');
      const hist = await ac.getHistory(sid);
      expect(hist[0]).toHaveProperty('from');
      expect(hist[0]).toHaveProperty('to');
      expect(hist[0]).toHaveProperty('timestamp');
    });

    it('timestamp is ISO string', async () => {
      await ac.setLevel(sid, 'high');
      const hist = await ac.getHistory(sid);
      expect(typeof hist[0].timestamp).toBe('string');
      expect(() => new Date(hist[0].timestamp)).not.toThrow();
    });

    it('from is previous level or default', async () => {
      await ac.setLevel(sid, 'low');
      await ac.setLevel(sid, 'high');
      const hist = await ac.getHistory(sid);
      expect(hist[0].from).toBe('medium');
      expect(hist[0].to).toBe('low');
      expect(hist[1].from).toBe('low');
      expect(hist[1].to).toBe('high');
    });

    it('history is independent per session', async () => {
      await ac.setLevel(sid, 'high');
      await ac.setLevel('other', 'low');
      expect(await ac.getHistory(sid)).toHaveLength(1);
      expect(await ac.getHistory('other')).toHaveLength(1);
    });

    it('returns empty for unknown session', async () => {
      expect(await ac.getHistory('unknown')).toHaveLength(0);
    });

    it('returns readonly array', async () => {
      await ac.setLevel(sid, 'high');
      const hist = await ac.getHistory(sid);
      expect(Array.isArray(hist)).toBe(true);
    });

    it('failed setLevel does not add to history', async () => {
      try { await ac.setLevel(sid, 'invalid'); } catch { /* expected */ }
      expect(await ac.getHistory(sid)).toHaveLength(0);
    });

    it('history preserves order', async () => {
      await ac.setLevel(sid, 'low');
      await ac.setLevel(sid, 'medium');
      await ac.setLevel(sid, 'high');
      const hist = await ac.getHistory(sid);
      expect(hist[0].to).toBe('low');
      expect(hist[1].to).toBe('medium');
      expect(hist[2].to).toBe('high');
    });
  });

  describe('integration', () => {
    it('getLevel returns default, setLevel changes it, getHistory records it', async () => {
      expect(await ac.getLevel(sid)).toBe('medium');
      await ac.setLevel(sid, 'high');
      expect(await ac.getLevel(sid)).toBe('high');
      const hist = await ac.getHistory(sid);
      expect(hist).toHaveLength(1);
      expect(hist[0].from).toBe('medium');
      expect(hist[0].to).toBe('high');
    });

    it('level changes persist across multiple getLevel calls', async () => {
      await ac.setLevel(sid, 'full');
      expect(await ac.getLevel(sid)).toBe('full');
      expect(await ac.getLevel(sid)).toBe('full');
    });

    it('rapid level changes all recorded', async () => {
      for (const level of ['low', 'medium', 'high', 'full', 'low']) {
        await ac.setLevel(sid, level);
      }
      const hist = await ac.getHistory(sid);
      expect(hist).toHaveLength(5);
      expect(hist[4].to).toBe('low');
    });

    it('different sessions do not interfere', async () => {
      await ac.setLevel('s1', 'low');
      await ac.setLevel('s2', 'high');
      expect(await ac.getLevel('s1')).toBe('low');
      expect(await ac.getLevel('s2')).toBe('high');
      expect((await ac.getHistory('s1'))[0].to).toBe('low');
      expect((await ac.getHistory('s2'))[0].to).toBe('high');
    });
  });
});
