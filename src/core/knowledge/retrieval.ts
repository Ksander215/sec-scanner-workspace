/**
 * Knowledge Retrieval Runtime
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 *
 * Provides synchronous searching, filtering, sorting, and pagination
 * of knowledge items. Storage is delegated to the caller / runtime;
 * this module operates on item arrays passed as parameters.
 */

import type {
  KnowledgeItem,
  KnowledgeItemId,
  KnowledgeNamespaceId,
  KnowledgeKind,
  KnowledgeFilter,
  KnowledgeSort,
  KnowledgePagination,
  KnowledgePage,
  KnowledgeQueryResult,
} from './types.js';
import { KnowledgeSortField, KnowledgeSortDirection } from './types.js';

// ─── Configuration ──────────────────────────────────────────────────

export interface KnowledgeRetrievalConfig {
  readonly defaultLimit?: number;
  readonly maxLimit?: number;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_DEFAULT_LIMIT = 50;
const DEFAULT_MAX_LIMIT = 1000;

// ─── Runtime ───────────────────────────────────────────────────────

/**
 * Knowledge retrieval engine — pure functions that transform in-memory
 * item arrays through filter → sort → paginate pipelines.
 */
export class KnowledgeRetrievalRuntime {
  private readonly _defaultLimit: number;
  private readonly _maxLimit: number;

  constructor(config?: KnowledgeRetrievalConfig) {
    const defaultLimit = config?.defaultLimit ?? DEFAULT_DEFAULT_LIMIT;
    const maxLimit = config?.maxLimit ?? DEFAULT_MAX_LIMIT;

    if (defaultLimit < 1) {
      throw new RangeError(`defaultLimit must be >= 1, got ${defaultLimit}`);
    }
    if (maxLimit < 1) {
      throw new RangeError(`maxLimit must be >= 1, got ${maxLimit}`);
    }
    if (defaultLimit > maxLimit) {
      throw new RangeError(
        `defaultLimit (${defaultLimit}) must not exceed maxLimit (${maxLimit})`,
      );
    }

    this._defaultLimit = defaultLimit;
    this._maxLimit = maxLimit;
  }

  // ── Accessors ─────────────────────────────────────────────────────

  /** Maximum page size enforced by this runtime. */
  get maxLimit(): number {
    return this._maxLimit;
  }

  /** Default page size used when no explicit limit is provided. */
  get defaultLimit(): number {
    return this._defaultLimit;
  }

  // ── Single-item lookup ────────────────────────────────────────────

  /**
   * Lookup a single item by its unique identifier.
   * Returns `null` when no match is found.
   */
  getById(items: readonly KnowledgeItem[], id: KnowledgeItemId): KnowledgeItem | null {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.id === id) {
        return item;
      }
    }
    return null;
  }

  // ── Simple filters ────────────────────────────────────────────────

  /**
   * Return all items belonging to the given namespace.
   */
  getByNamespace(
    items: readonly KnowledgeItem[],
    namespaceId: KnowledgeNamespaceId,
  ): readonly KnowledgeItem[] {
    return items.filter((item): boolean => item.namespaceId === namespaceId);
  }

  /**
   * Return items whose tags include the supplied `tags`.
   *
   * - `matchMode === 'all'` (default): item must carry **every** tag.
   * - `matchMode === 'any'`: item must carry **at least one** tag.
   */
  getByTags(
    items: readonly KnowledgeItem[],
    tags: readonly string[],
    matchMode: 'all' | 'any' = 'all',
  ): readonly KnowledgeItem[] {
    if (tags.length === 0) {
      return items;
    }

    return items.filter((item): boolean => {
      const itemTags: ReadonlySet<string> = new Set(item.metadata.tags);
      if (matchMode === 'all') {
        return tags.every((tag) => itemTags.has(tag));
      }
      return tags.some((tag) => itemTags.has(tag));
    });
  }

  /**
   * Return items whose source type matches the given `sourceType`.
   */
  getBySource(
    items: readonly KnowledgeItem[],
    sourceType: string,
  ): readonly KnowledgeItem[] {
    return items.filter(
      (item): boolean => item.metadata.source.type === sourceType,
    );
  }

  /**
   * Return items whose `kind` matches exactly.
   */
  getByKind(
    items: readonly KnowledgeItem[],
    kind: KnowledgeKind,
  ): readonly KnowledgeItem[] {
    return items.filter((item): boolean => item.kind === kind);
  }

  // ── Text search ──────────────────────────────────────────────────

  /**
   * Simple case-insensitive substring search across `name` and `content`.
   * Returns items where the query appears in either field.
   */
  search(
    items: readonly KnowledgeItem[],
    query: string,
  ): readonly KnowledgeItem[] {
    const normalizedQuery = query.toLowerCase();

    if (normalizedQuery.length === 0) {
      return items;
    }

    return items.filter((item): boolean => {
      const nameMatch = item.name.toLowerCase().includes(normalizedQuery);
      const contentMatch = item.content.toLowerCase().includes(normalizedQuery);
      return nameMatch || contentMatch;
    });
  }

  // ── Structured filter ─────────────────────────────────────────────

  /**
   * Apply a structured {@link KnowledgeFilter} criteria set.
   * All provided criteria are ANDed together; omitted criteria are ignored.
   */
  filter(
    items: readonly KnowledgeItem[],
    filter: KnowledgeFilter,
  ): readonly KnowledgeItem[] {
    return items.filter((item): boolean => {
      if (filter.namespaceId !== undefined && item.namespaceId !== filter.namespaceId) {
        return false;
      }

      if (filter.kinds !== undefined && filter.kinds.length > 0) {
        if (!filter.kinds.includes(item.kind)) {
          return false;
        }
      }

      if (filter.states !== undefined && filter.states.length > 0) {
        if (!filter.states.includes(item.state)) {
          return false;
        }
      }

      if (filter.tags !== undefined && filter.tags.length > 0) {
        const itemTags: ReadonlySet<string> = new Set(item.metadata.tags);
        if (!filter.tags.every((tag) => itemTags.has(tag))) {
          return false;
        }
      }

      if (filter.sourceTypes !== undefined && filter.sourceTypes.length > 0) {
        if (!filter.sourceTypes.includes(item.metadata.source.type)) {
          return false;
        }
      }

      if (filter.createdAfter !== undefined && item.createdAt < filter.createdAfter) {
        return false;
      }

      if (filter.createdBefore !== undefined && item.createdAt > filter.createdBefore) {
        return false;
      }

      if (filter.updatedAfter !== undefined && item.updatedAt < filter.updatedAfter) {
        return false;
      }

      if (filter.updatedBefore !== undefined && item.updatedAt > filter.updatedBefore) {
        return false;
      }

      if (filter.minConfidence !== undefined && item.metadata.confidence < filter.minConfidence) {
        return false;
      }

      if (filter.maxConfidence !== undefined && item.metadata.confidence > filter.maxConfidence) {
        return false;
      }

      return true;
    });
  }

  // ── Sort ───────────────────────────────────────────────────────────

  /**
   * Sort items according to the given {@link KnowledgeSort} specification.
   * Returns a new array; the input is never mutated.
   */
  sort(
    items: readonly KnowledgeItem[],
    sort: KnowledgeSort,
  ): readonly KnowledgeItem[] {
    const sorted = [...items];

    const direction = sort.direction === KnowledgeSortDirection.Descending ? -1 : 1;

    sorted.sort((a, b): number => {
      const comparison = this.compareByField(a, b, sort.field);
      return comparison * direction;
    });

    return sorted;
  }

  // ── Pagination ─────────────────────────────────────────────────────

  /**
   * Slice items into a page according to the given {@link KnowledgePagination}.
   * The `limit` is clamped to {@link maxLimit}.
   */
  paginate(
    items: readonly KnowledgeItem[],
    pagination: KnowledgePagination,
  ): KnowledgePage<KnowledgeItem> {
    const { offset, limit } = this.resolvePagination(pagination);

    const sliced = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;

    return Object.freeze({
      items: sliced,
      total: items.length,
      offset,
      limit,
      hasMore,
    });
  }

  // ── Combined query ────────────────────────────────────────────────

  /**
   * Execute a combined query pipeline: **filter → sort → paginate**.
   *
   * If `pagination` is omitted the full filtered+sorted set is returned
   * (i.e. {@link KnowledgeQueryResult.pagination} will be `undefined`).
   */
  query(
    items: readonly KnowledgeItem[],
    filter?: KnowledgeFilter,
    sort?: KnowledgeSort,
    pagination?: KnowledgePagination,
  ): KnowledgeQueryResult<KnowledgeItem> {
    let result: readonly KnowledgeItem[] = items;

    if (filter !== undefined) {
      result = this.filter(result, filter);
    }

    if (sort !== undefined) {
      result = this.sort(result, sort);
    }

    if (pagination !== undefined) {
      const page = this.paginate(result, pagination);

      return Object.freeze({
        items: page.items,
        total: page.total,
        pagination: page,
      });
    }

    return Object.freeze({
      items: result,
      total: result.length,
    });
  }

  // ── Private helpers ──────────────────────────────────────────────

  /** Clamp pagination values to configured limits. */
  private resolvePagination(pagination: KnowledgePagination): {
    readonly offset: number;
    readonly limit: number;
  } {
    const offset = Math.max(0, Math.floor(pagination.offset));
    const limit = Math.min(
      Math.max(1, Math.floor(pagination.limit)),
      this._maxLimit,
    );
    return { offset, limit };
  }

  /** Compare two items by the given sort field. Returns <0, 0, or >0. */
  private compareByField(a: KnowledgeItem, b: KnowledgeItem, field: KnowledgeSortField): number {
    switch (field) {
      case KnowledgeSortField.CreatedAt:
        return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;

      case KnowledgeSortField.UpdatedAt:
        return a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0;

      case KnowledgeSortField.Version:
        // Lexicographic comparison of version ids (stable for semver strings)
        const aVersionId: string = a.currentVersionId as unknown as string;
        const bVersionId: string = b.currentVersionId as unknown as string;
        return aVersionId < bVersionId ? -1 : aVersionId > bVersionId ? 1 : 0;

      case KnowledgeSortField.Name:
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

      case KnowledgeSortField.Relevance:
        // Confidence serves as a relevance proxy when no dedicated relevance score exists.
        return a.metadata.confidence - b.metadata.confidence;

      default: {
        const _exhaustive: never = field;
        throw new Error(`Unexpected KnowledgeSortField: ${_exhaustive}`);
      }
    }
  }
}
