import { describe, it, expect } from 'vitest';
import { KnowledgeRetrievalRuntime } from '../../core/knowledge/retrieval.js';
import {
  KnowledgeKind,
  KnowledgeState,
  KnowledgeSortField,
  KnowledgeSortDirection,
  brandKnowledgeItemId,
  brandKnowledgeNamespaceId,
  brandKnowledgeVersionId,
} from '../../core/knowledge/types.js';
import type {
  KnowledgeItem,
  KnowledgeItemId,
  KnowledgeNamespaceId,
  KnowledgeVersionId,
  Timestamp,
  KnowledgeFilter,
  KnowledgeSort,
  KnowledgePagination,
} from '../../core/knowledge/types.js';

// --- Factories ---

function makeNsId(ns: string): KnowledgeNamespaceId { return brandKnowledgeNamespaceId(ns); }
function makeVerId(v: string): KnowledgeVersionId { return brandKnowledgeVersionId(v); }

interface Ov {
  readonly id?: KnowledgeItemId;
  readonly kind?: KnowledgeKind;
  readonly namespaceId?: KnowledgeNamespaceId;
  readonly name?: string;
  readonly content?: string;
  readonly tags?: readonly string[];
  readonly sourceType?: string;
  readonly confidence?: number;
  readonly state?: KnowledgeState;
  readonly versionId?: KnowledgeVersionId;
  readonly createdAt?: Timestamp;
  readonly updatedAt?: Timestamp;
}

function makeItem(ov: Partial<Ov> = {}): KnowledgeItem {
  const id = ov.id ?? brandKnowledgeItemId('auto-' + Math.random().toString(36).slice(2, 8));
  const ts = ov.createdAt ?? ('2025-01-15T10:00:00.000Z' as Timestamp);
  return Object.freeze({
    id,
    kind: ov.kind ?? KnowledgeKind.Item,
    namespaceId: ov.namespaceId ?? makeNsId('ns-default'),
    name: ov.name ?? ('Name ' + String(id)),
    content: ov.content ?? ('Content ' + String(id)),
    metadata: Object.freeze({
      tags: Object.freeze(ov.tags ?? ['tag-a']),
      source: Object.freeze({ type: ov.sourceType ?? 'manual', identifier: 'test', timestamp: ts }),
      confidence: ov.confidence ?? 0.8,
      custom: Object.freeze({}),
    }),
    state: ov.state ?? KnowledgeState.Active,
    currentVersionId: ov.versionId ?? makeVerId('v1'),
    createdAt: ts,
    updatedAt: ov.updatedAt ?? ts,
  });
}

function DS(): readonly KnowledgeItem[] {
  return Object.freeze([
    makeItem({ id: brandKnowledgeItemId('i1'), kind: KnowledgeKind.Document, namespaceId: makeNsId('ns-alpha'), name: 'Alpha Doc', content: 'Introduction to alpha', tags: ['intro', 'alpha'], sourceType: 'api', confidence: 0.9, state: KnowledgeState.Active, createdAt: '2025-01-01T00:00:00.000Z' as Timestamp, updatedAt: '2025-01-05T00:00:00.000Z' as Timestamp, versionId: makeVerId('v2') }),
    makeItem({ id: brandKnowledgeItemId('i2'), kind: KnowledgeKind.Fragment, namespaceId: makeNsId('ns-alpha'), name: 'Beta Fragment', content: 'Fragment of beta', tags: ['beta', 'fragment'], sourceType: 'api', confidence: 0.7, state: KnowledgeState.Draft, createdAt: '2025-01-02T00:00:00.000Z' as Timestamp, updatedAt: '2025-01-06T00:00:00.000Z' as Timestamp, versionId: makeVerId('v1') }),
    makeItem({ id: brandKnowledgeItemId('i3'), kind: KnowledgeKind.Item, namespaceId: makeNsId('ns-beta'), name: 'Gamma Item', content: 'General gamma', tags: ['gamma'], sourceType: 'manual', confidence: 0.5, state: KnowledgeState.Active, createdAt: '2025-01-03T00:00:00.000Z' as Timestamp, updatedAt: '2025-01-03T00:00:00.000Z' as Timestamp, versionId: makeVerId('v3') }),
    makeItem({ id: brandKnowledgeItemId('i4'), kind: KnowledgeKind.Collection, namespaceId: makeNsId('ns-beta'), name: 'Delta Collection', content: 'Collection of deltas', tags: ['delta', 'intro'], sourceType: 'file', confidence: 1.0, state: KnowledgeState.Archived, createdAt: '2025-01-04T00:00:00.000Z' as Timestamp, updatedAt: '2025-01-07T00:00:00.000Z' as Timestamp, versionId: makeVerId('v10') }),
    makeItem({ id: brandKnowledgeItemId('i5'), kind: KnowledgeKind.Document, namespaceId: makeNsId('ns-gamma'), name: 'Epsilon Doc', content: 'Deep epsilon content', tags: ['epsilon'], sourceType: 'api', confidence: 0.3, state: KnowledgeState.Deprecated, createdAt: '2025-01-05T00:00:00.000Z' as Timestamp, updatedAt: '2025-01-08T00:00:00.000Z' as Timestamp, versionId: makeVerId('v1') }),
  ]);
}

// --- Constructor ---

describe('KnowledgeRetrievalRuntime constructor', () => {
  it('throws if defaultLimit < 1', () => {
    expect(() => new KnowledgeRetrievalRuntime({ defaultLimit: 0 })).toThrow(RangeError);
    expect(() => new KnowledgeRetrievalRuntime({ defaultLimit: -5 })).toThrow(RangeError);
  });

  it('throws if maxLimit < 1', () => {
    expect(() => new KnowledgeRetrievalRuntime({ maxLimit: 0 })).toThrow(RangeError);
  });

  it('throws if defaultLimit exceeds maxLimit', () => {
    expect(() => new KnowledgeRetrievalRuntime({ defaultLimit: 100, maxLimit: 50 })).toThrow(RangeError);
  });

  it('accepts valid configuration', () => {
    const r = new KnowledgeRetrievalRuntime({ defaultLimit: 10, maxLimit: 100 });
    expect(r.defaultLimit).toBe(10);
    expect(r.maxLimit).toBe(100);
  });

  it('uses defaults when no config provided', () => {
    const r = new KnowledgeRetrievalRuntime();
    expect(r.defaultLimit).toBe(50);
    expect(r.maxLimit).toBe(1000);
  });
});

// --- getById ---

describe('KnowledgeRetrievalRuntime getById', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('returns the matching item by id', () => {
    const result = r.getById(items, brandKnowledgeItemId('i2'));
    expect(result).not.toBeNull();
    expect(result!.id).toBe(brandKnowledgeItemId('i2'));
  });

  it('returns null when id is not found', () => {
    expect(r.getById(items, brandKnowledgeItemId('nonexistent'))).toBeNull();
  });

  it('returns the exact item with all fields', () => {
    const result = r.getById(items, brandKnowledgeItemId('i1'))!;
    expect(result.name).toBe('Alpha Doc');
    expect(result.kind).toBe(KnowledgeKind.Document);
    expect(result.namespaceId).toBe(makeNsId('ns-alpha'));
  });

  it('works on an empty array', () => {
    expect(r.getById([], brandKnowledgeItemId('x'))).toBeNull();
  });
});

describe('KnowledgeRetrievalRuntime getByNamespace', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('returns items in the given namespace', () => {
    expect(r.getByNamespace(items, makeNsId('ns-alpha'))).toHaveLength(2);
  });

  it('returns empty when namespace has no items', () => {
    expect(r.getByNamespace(items, makeNsId('ns-empty'))).toHaveLength(0);
  });

  it('returns single-item namespace', () => {
    const result = r.getByNamespace(items, makeNsId('ns-gamma'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(brandKnowledgeItemId('i5'));
  });
});

describe('KnowledgeRetrievalRuntime getByTags', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('returns items matching all tags (default)', () => {
    expect(r.getByTags(items, ['intro'])).toHaveLength(2);
  });

  it('returns empty when not all tags match', () => {
    expect(r.getByTags(items, ['intro', 'gamma'])).toHaveLength(0);
  });

  it('explicit all mode', () => {
    expect(r.getByTags(items, ['beta', 'fragment'], 'all')).toHaveLength(1);
  });

  it('any mode matches at least one tag', () => {
    expect(r.getByTags(items, ['intro', 'gamma'], 'any')).toHaveLength(3);
  });

  it('any mode covers everything', () => {
    expect(r.getByTags(items, ['alpha', 'beta', 'gamma', 'delta', 'epsilon'], 'any')).toHaveLength(5);
  });

  it('empty tags returns all items', () => {
    expect(r.getByTags(items, [])).toHaveLength(5);
  });

  it('any mode with empty tags returns all items', () => {
    expect(r.getByTags(items, [], 'any')).toHaveLength(5);
  });
});

describe('KnowledgeRetrievalRuntime getBySource', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('returns items matching source type', () => {
    expect(r.getBySource(items, 'api')).toHaveLength(3);
  });

  it('returns single item for unique source', () => {
    const result = r.getBySource(items, 'file');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(brandKnowledgeItemId('i4'));
  });

  it('returns empty for unknown source', () => {
    expect(r.getBySource(items, 'nonexistent')).toHaveLength(0);
  });
});

describe('KnowledgeRetrievalRuntime getByKind', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('returns items matching kind', () => {
    expect(r.getByKind(items, KnowledgeKind.Document)).toHaveLength(2);
  });

  it('returns single item for unique kind', () => {
    expect(r.getByKind(items, KnowledgeKind.Fragment)).toHaveLength(1);
  });

  it('returns empty for non-existent kind in empty array', () => {
    expect(r.getByKind([], KnowledgeKind.Item)).toHaveLength(0);
  });
});

describe('KnowledgeRetrievalRuntime search', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('finds items by name substring (case-insensitive)', () => {
    const result = r.search(items, 'alpha');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some(i => i.id === brandKnowledgeItemId('i1'))).toBe(true);
  });

  it('finds items by content substring', () => {
    expect(r.search(items, 'fragment')).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    const upper = r.search(items, 'ALPHA');
    const lower = r.search(items, 'alpha');
    expect(upper).toHaveLength(lower.length);
  });

  it('returns empty for non-matching query', () => {
    expect(r.search(items, 'zzz-nonexistent')).toHaveLength(0);
  });

  it('returns all items when query is empty', () => {
    expect(r.search(items, '')).toHaveLength(5);
  });

  it('matches across both name and content', () => {
    expect(r.search(items, 'collection').length).toBeGreaterThanOrEqual(1);
  });
});

describe('KnowledgeRetrievalRuntime filter', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('filters by namespaceId', () => {
    const f: KnowledgeFilter = { namespaceId: makeNsId('ns-beta') };
    expect(r.filter(items, f)).toHaveLength(2);
  });

  it('filters by kinds (single)', () => {
    const f: KnowledgeFilter = { kinds: [KnowledgeKind.Document] };
    expect(r.filter(items, f)).toHaveLength(2);
  });

  it('filters by kinds (multiple)', () => {
    const f: KnowledgeFilter = { kinds: [KnowledgeKind.Document, KnowledgeKind.Fragment] };
    expect(r.filter(items, f)).toHaveLength(3);
  });

  it('filters by states', () => {
    const f: KnowledgeFilter = { states: [KnowledgeState.Active] };
    expect(r.filter(items, f)).toHaveLength(2);
  });

  it('filters by tags', () => {
    const f: KnowledgeFilter = { tags: ['intro'] };
    expect(r.filter(items, f)).toHaveLength(2);
  });

  it('filters by sourceTypes', () => {
    const f: KnowledgeFilter = { sourceTypes: ['api'] };
    expect(r.filter(items, f)).toHaveLength(3);
  });

  it('filters by createdAfter', () => {
    const f: KnowledgeFilter = { createdAfter: '2025-01-04T00:00:00.000Z' as Timestamp };
    expect(r.filter(items, f)).toHaveLength(2);
  });

  it('filters by createdBefore', () => {
    const f: KnowledgeFilter = { createdBefore: '2025-01-03T00:00:00.000Z' as Timestamp };
    expect(r.filter(items, f)).toHaveLength(3);
  });

  it('filters by updatedAfter', () => {
    const f: KnowledgeFilter = { updatedAfter: '2025-01-06T00:00:00.000Z' as Timestamp };
    expect(r.filter(items, f)).toHaveLength(3);
  });

  it('filters by updatedBefore', () => {
    const f: KnowledgeFilter = { updatedBefore: '2025-01-05T00:00:00.000Z' as Timestamp };
    expect(r.filter(items, f)).toHaveLength(2);
  });

  it('filters by minConfidence', () => {
    const f: KnowledgeFilter = { minConfidence: 0.8 };
    expect(r.filter(items, f)).toHaveLength(2);
  });

  it('filters by maxConfidence', () => {
    const f: KnowledgeFilter = { maxConfidence: 0.5 };
    expect(r.filter(items, f)).toHaveLength(2);
  });

  it('ANDs multiple criteria', () => {
    const f: KnowledgeFilter = { namespaceId: makeNsId('ns-alpha'), kinds: [KnowledgeKind.Document], minConfidence: 0.8 };
    const result = r.filter(items, f);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(brandKnowledgeItemId('i1'));
  });

  it('returns all items with empty filter', () => {
    expect(r.filter(items, {})).toHaveLength(5);
  });

  it('returns empty when no match', () => {
    const f: KnowledgeFilter = { namespaceId: makeNsId('nonexistent') };
    expect(r.filter(items, f)).toHaveLength(0);
  });
});

describe('KnowledgeRetrievalRuntime sort', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('sorts by CreatedAt ascending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.CreatedAt, direction: KnowledgeSortDirection.Ascending };
    const result = r.sort(items, s);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].createdAt >= result[i - 1].createdAt).toBe(true);
    }
  });

  it('sorts by CreatedAt descending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.CreatedAt, direction: KnowledgeSortDirection.Descending };
    const result = r.sort(items, s);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].createdAt <= result[i - 1].createdAt).toBe(true);
    }
  });

  it('sorts by UpdatedAt ascending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.UpdatedAt, direction: KnowledgeSortDirection.Ascending };
    const result = r.sort(items, s);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].updatedAt >= result[i - 1].updatedAt).toBe(true);
    }
  });

  it('sorts by UpdatedAt descending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.UpdatedAt, direction: KnowledgeSortDirection.Descending };
    const result = r.sort(items, s);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].updatedAt <= result[i - 1].updatedAt).toBe(true);
    }
  });

  it('sorts by Version ascending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.Version, direction: KnowledgeSortDirection.Ascending };
    const result = r.sort(items, s);
    for (let i = 1; i < result.length; i++) {
      const aV = result[i - 1].currentVersionId as unknown as string;
      const bV = result[i].currentVersionId as unknown as string;
      expect(aV <= bV).toBe(true);
    }
  });

  it('sorts by Version descending (v3 first for lexicographic order)', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.Version, direction: KnowledgeSortDirection.Descending };
    const result = r.sort(items, s);
    expect(result[0].id).toBe(brandKnowledgeItemId('i3'));
  });

  it('sorts by Name ascending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.Name, direction: KnowledgeSortDirection.Ascending };
    const result = r.sort(items, s);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].name.localeCompare(result[i - 1].name, undefined, { sensitivity: 'base' })).toBeGreaterThanOrEqual(0);
    }
  });

  it('sorts by Name descending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.Name, direction: KnowledgeSortDirection.Descending };
    const result = r.sort(items, s);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].name.localeCompare(result[i - 1].name, undefined, { sensitivity: 'base' })).toBeLessThanOrEqual(0);
    }
  });

  it('sorts by Relevance (confidence) ascending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.Relevance, direction: KnowledgeSortDirection.Ascending };
    const result = r.sort(items, s);
    expect(result[0].metadata.confidence).toBe(0.3);
    expect(result[result.length - 1].metadata.confidence).toBe(1.0);
  });

  it('sorts by Relevance descending', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.Relevance, direction: KnowledgeSortDirection.Descending };
    const result = r.sort(items, s);
    expect(result[0].metadata.confidence).toBe(1.0);
    expect(result[result.length - 1].metadata.confidence).toBe(0.3);
  });

  it('does not mutate the input array', () => {
    const copy = [...items];
    const s: KnowledgeSort = { field: KnowledgeSortField.Name, direction: KnowledgeSortDirection.Descending };
    r.sort(items, s);
    expect(items).toEqual(copy);
  });

  it('returns a new array reference', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.Name, direction: KnowledgeSortDirection.Ascending };
    expect(r.sort(items, s)).not.toBe(items);
  });
});

describe('KnowledgeRetrievalRuntime paginate', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('returns first page with offset 0 limit 2', () => {
    const p: KnowledgePagination = { offset: 0, limit: 2 };
    const page = r.paginate(items, p);
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(5);
    expect(page.offset).toBe(0);
    expect(page.limit).toBe(2);
    expect(page.hasMore).toBe(true);
  });

  it('returns single item with limit 1', () => {
    const page = r.paginate(items, { offset: 0, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(5);
    expect(page.hasMore).toBe(true);
  });

  it('returns empty when offset beyond end', () => {
    const page = r.paginate(items, { offset: 100, limit: 10 });
    expect(page.items).toHaveLength(0);
    expect(page.total).toBe(5);
    expect(page.hasMore).toBe(false);
  });

  it('hasMore false on last page', () => {
    const page = r.paginate(items, { offset: 3, limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(false);
  });

  it('hasMore false when offset+limit equals total', () => {
    const page = r.paginate(items, { offset: 4, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.hasMore).toBe(false);
  });

  it('clamps limit to maxLimit', () => {
    const smallMax = new KnowledgeRetrievalRuntime({ maxLimit: 2, defaultLimit: 2 });
    const page = smallMax.paginate(items, { offset: 0, limit: 100 });
    expect(page.limit).toBe(2);
    expect(page.items).toHaveLength(2);
  });

  it('clamps negative offset to 0', () => {
    const page = r.paginate(items, { offset: -5, limit: 2 });
    expect(page.offset).toBe(0);
    expect(page.items).toHaveLength(2);
  });

  it('clamps limit to at least 1', () => {
    const page = r.paginate(items, { offset: 0, limit: 0 });
    expect(page.limit).toBe(1);
  });

  it('freezes the returned page object', () => {
    const page = r.paginate(items, { offset: 0, limit: 2 });
    expect(Object.isFrozen(page)).toBe(true);
  });
});

describe('KnowledgeRetrievalRuntime query', () => {
  const r = new KnowledgeRetrievalRuntime();
  const items = DS();

  it('returns all items with no arguments', () => {
    const result = r.query(items);
    expect(result.items).toHaveLength(5);
    expect(result.total).toBe(5);
    expect(result.pagination).toBeUndefined();
  });

  it('applies filter only', () => {
    const f: KnowledgeFilter = { kinds: [KnowledgeKind.Document] };
    const result = r.query(items, f);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.pagination).toBeUndefined();
  });

  it('applies sort only', () => {
    const s: KnowledgeSort = { field: KnowledgeSortField.Name, direction: KnowledgeSortDirection.Ascending };
    const result = r.query(items, undefined, s);
    expect(result.items).toHaveLength(5);
    expect(result.pagination).toBeUndefined();
  });

  it('applies pagination only', () => {
    const p: KnowledgePagination = { offset: 0, limit: 2 };
    const result = r.query(items, undefined, undefined, p);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.pagination).toBeDefined();
    expect(result.pagination!.hasMore).toBe(true);
  });

  it('combines filter + sort + pagination', () => {
    const f: KnowledgeFilter = { sourceTypes: ['api'] };
    const s: KnowledgeSort = { field: KnowledgeSortField.Relevance, direction: KnowledgeSortDirection.Descending };
    const p: KnowledgePagination = { offset: 0, limit: 2 };
    const result = r.query(items, f, s, p);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe(brandKnowledgeItemId('i1'));
    expect(result.items[1].id).toBe(brandKnowledgeItemId('i2'));
    expect(result.total).toBe(3);
    expect(result.pagination!.hasMore).toBe(true);
  });

  it('freezes the query result', () => {
    expect(Object.isFrozen(r.query(items))).toBe(true);
  });

  it('empty filter with pagination has total 0', () => {
    const f: KnowledgeFilter = { namespaceId: makeNsId('nonexistent') };
    const p: KnowledgePagination = { offset: 0, limit: 10 };
    const result = r.query(items, f, undefined, p);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.pagination!.hasMore).toBe(false);
  });
});
