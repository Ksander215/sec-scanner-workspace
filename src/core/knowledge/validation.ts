/**
 * Knowledge Runtime — Validation Module
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 *
 * Validates knowledge store consistency: namespace isolation,
 * duplicate IDs, broken references, cyclic relations,
 * version lineage, and overall graph integrity.
 */

import type {
  KnowledgeItem,
  KnowledgeNamespace,
  KnowledgeRelation,
  KnowledgeVersion,
  KnowledgeValidationResult,
  KnowledgeValidationIssue,
  KnowledgeRelationId,
} from './types.js';
import { KnowledgeRelationType } from './types.js';
import type { Timestamp } from '../types/common.js';

// ─── Configuration ──────────────────────────────────────────────────

/** Configuration options for the KnowledgeValidator. */
export interface KnowledgeValidationConfig {
  /** Enable DFS-based cyclic-reference detection (default: false). */
  readonly enableCyclicDetection?: boolean;
  /** Maximum allowed items per namespace before emitting a warning (default: ∞). */
  readonly maxItemsPerNamespace?: number;
}

// ─── Helper ──────────────────────────────────────────────────────────

/** Factory that builds a KnowledgeValidationResult from an array of issues. */
export function createValidationResult(
  issues: readonly KnowledgeValidationIssue[],
): KnowledgeValidationResult {
  const hasErrors = issues.some((issue) => issue.severity === 'error');
  return Object.freeze({
    valid: !hasErrors,
    issues: Object.freeze([...issues]),
    checkedAt: new Date().toISOString() as Timestamp,
  });
}

// ─── Default config ─────────────────────────────────────────────────

const DEFAULT_CONFIG: Readonly<Required<KnowledgeValidationConfig>> = Object.freeze({
  enableCyclicDetection: false,
  maxItemsPerNamespace: Infinity,
});

// ─── Cyclic-detection relation types ─────────────────────────────────

const CYCLIC_RELATION_TYPES: ReadonlySet<KnowledgeRelationType> = Object.freeze(
  new Set<KnowledgeRelationType>([
    KnowledgeRelationType.Parent,
    KnowledgeRelationType.Child,
    KnowledgeRelationType.Dependency,
    KnowledgeRelationType.DerivedFrom,
  ]),
);

// ─── KnowledgeValidator ─────────────────────────────────────────────

/**
 * Validates knowledge store consistency.
 *
 * Each method returns a {@link KnowledgeValidationResult} containing
 * any issues found. Use {@link validateAll} to run every check at once.
 */
export class KnowledgeValidator {
  private readonly _config: Readonly<Required<KnowledgeValidationConfig>>;

  constructor(config: Readonly<KnowledgeValidationConfig> = {}) {
    this._config = Object.freeze({
      enableCyclicDetection: config.enableCyclicDetection ?? DEFAULT_CONFIG.enableCyclicDetection,
      maxItemsPerNamespace: config.maxItemsPerNamespace ?? DEFAULT_CONFIG.maxItemsPerNamespace,
    });
  }

  // ── Namespace Isolation ──────────────────────────────────────────

  /**
   * Checks that every item references an existing namespace.
   * Emits an error for items whose `namespaceId` is not found in
   * the provided `namespaces` array, and a warning when a namespace
   * exceeds `maxItemsPerNamespace`.
   */
  validateNamespaceIsolation(
    items: readonly KnowledgeItem[],
    namespaces: readonly KnowledgeNamespace[],
  ): KnowledgeValidationResult {
    const issues: KnowledgeValidationIssue[] = [];

    const namespaceIds: ReadonlySet<string> = new Set(
      namespaces.map((ns) => ns.id as unknown as string),
    );

    // Track item count per namespace for capacity warning
    const itemsPerNamespace = new Map<string, number>();

    for (const item of items) {
      const nsKey = item.namespaceId as unknown as string;

      // Count items per namespace
      const prev = itemsPerNamespace.get(nsKey) ?? 0;
      itemsPerNamespace.set(nsKey, prev + 1);

      if (!namespaceIds.has(nsKey)) {
        issues.push(
          Object.freeze({
            code: 'KNOWLEDGE_INVALID_NAMESPACE',
            message: `Item "${item.id}" references unknown namespace "${item.namespaceId}".`,
            severity: 'error',
            itemId: item.id,
            details: Object.freeze({
              namespaceId: nsKey,
              itemId: item.id as unknown as string,
            }),
          }),
        );
      }
    }

    // Emit capacity warnings
    if (this._config.maxItemsPerNamespace !== Infinity) {
      for (const [nsKey, count] of itemsPerNamespace) {
        if (count > this._config.maxItemsPerNamespace) {
          issues.push(
            Object.freeze({
              code: 'KNOWLEDGE_NAMESPACE_CAPACITY_WARNING',
              message: `Namespace "${nsKey}" has ${count} items, exceeding the limit of ${this._config.maxItemsPerNamespace}.`,
              severity: 'warning',
              details: Object.freeze({
                namespaceId: nsKey,
                count: String(count),
                limit: String(this._config.maxItemsPerNamespace),
              }),
            }),
          );
        }
      }
    }

    return createValidationResult(issues);
  }

  // ── Duplicate IDs ────────────────────────────────────────────────

  /**
   * Checks for duplicate IDs within the same namespace.
   * Each KnowledgeItem ID should be globally unique, but this
   * validation groups by namespace and flags any collisions
   * found within each group.
   */
  validateDuplicateIds(
    items: readonly KnowledgeItem[],
  ): KnowledgeValidationResult {
    const issues: KnowledgeValidationIssue[] = [];

    const byNamespace = new Map<string, readonly KnowledgeItem[]>();

    for (const item of items) {
      const nsKey = item.namespaceId as unknown as string;
      const existing = byNamespace.get(nsKey);
      if (existing !== undefined) {
        byNamespace.set(nsKey, [...existing, item]);
      } else {
        byNamespace.set(nsKey, [item]);
      }
    }

    for (const [nsKey, nsItems] of byNamespace) {
      const seen = new Map<string, number>();

      for (const item of nsItems) {
        const idKey = item.id as unknown as string;
        const prevIdx = seen.get(idKey);

        if (prevIdx !== undefined) {
          issues.push(
            Object.freeze({
              code: 'KNOWLEDGE_DUPLICATE_ID',
              message: `Duplicate item ID "${item.id}" detected in namespace "${nsKey}".`,
              severity: 'error',
              itemId: item.id,
              details: Object.freeze({
                namespaceId: nsKey,
                itemId: idKey,
              }),
            }),
          );
        } else {
          seen.set(idKey, nsItems.length);
        }
      }
    }

    return createValidationResult(issues);
  }

  // ── Broken References ────────────────────────────────────────────

  /**
   * Checks that all relation `sourceId` and `targetId` values
   * reference items that exist in the provided `items` array.
   */
  validateBrokenReferences(
    items: readonly KnowledgeItem[],
    relations: readonly KnowledgeRelation[],
  ): KnowledgeValidationResult {
    const issues: KnowledgeValidationIssue[] = [];

    const itemIds: ReadonlySet<string> = new Set(
      items.map((item) => item.id as unknown as string),
    );

    for (const relation of relations) {
      const sourceKey = relation.sourceId as unknown as string;
      const targetKey = relation.targetId as unknown as string;

      if (!itemIds.has(sourceKey)) {
        issues.push(
          Object.freeze({
            code: 'KNOWLEDGE_BROKEN_SOURCE_REF',
            message: `Relation "${relation.id}" references non-existent source item "${relation.sourceId}".`,
            severity: 'error',
            details: Object.freeze({
              relationId: relation.id as unknown as string,
              sourceId: sourceKey,
              type: relation.type,
            }),
          }),
        );
      }

      if (!itemIds.has(targetKey)) {
        issues.push(
          Object.freeze({
            code: 'KNOWLEDGE_BROKEN_TARGET_REF',
            message: `Relation "${relation.id}" references non-existent target item "${relation.targetId}".`,
            severity: 'error',
            details: Object.freeze({
              relationId: relation.id as unknown as string,
              targetId: targetKey,
              type: relation.type,
            }),
          }),
        );
      }
    }

    return createValidationResult(issues);
  }

  // ── Cyclic References ───────────────────────────────────────────

  /**
   * Checks for cycles in Parent / Child / Dependency / DerivedFrom
   * relations using depth-first search.
   *
   * If `enableCyclicDetection` is `false` this method returns
   * immediately with a clean result.
   */
  validateCyclicReferences(
    relations: readonly KnowledgeRelation[],
  ): KnowledgeValidationResult {
    if (!this._config.enableCyclicDetection) {
      return createValidationResult([]);
    }

    const issues: KnowledgeValidationIssue[] = [];

    // Build adjacency list from eligible relation types
    const adjacency = new Map<string, readonly string[]>();

    for (const relation of relations) {
      if (!CYCLIC_RELATION_TYPES.has(relation.type)) {
        continue;
      }

      const sourceKey = relation.sourceId as unknown as string;
      const targetKey = relation.targetId as unknown as string;
      const existing = adjacency.get(sourceKey);
      if (existing !== undefined) {
        adjacency.set(sourceKey, [...existing, targetKey]);
      } else {
        adjacency.set(sourceKey, [targetKey]);
      }
    }

    // Collect all unique nodes
    const allNodes = new Set<string>();
    for (const [src, targets] of adjacency) {
      allNodes.add(src);
      for (const t of targets) {
        allNodes.add(t);
      }
    }

    // DFS three-colour cycle detection
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    const path: string[] = [];

    for (const node of allNodes) {
      color.set(node, WHITE);
    }

    const dfs = (node: string): void => {
      color.set(node, GRAY);
      path.push(node);

      const neighbours = adjacency.get(node) ?? [];
      for (const neighbour of neighbours) {
        const neighbourColor = color.get(neighbour) ?? WHITE;

        if (neighbourColor === GRAY) {
          // Back-edge → cycle
          const cycleStart = path.indexOf(neighbour);
          const cyclePath = [...path.slice(cycleStart), neighbour].join(' → ');

          issues.push(
            Object.freeze({
              code: 'KNOWLEDGE_CYCLIC_RELATION',
              message: `Cyclic relation detected: ${cyclePath}.`,
              severity: 'error',
              details: Object.freeze({
                cycle: cyclePath,
                from: node,
                to: neighbour,
              }),
            }),
          );
        } else if (neighbourColor === WHITE) {
          dfs(neighbour);
        }
        // BLACK → already fully explored, skip
      }

      path.pop();
      color.set(node, BLACK);
    };

    for (const node of allNodes) {
      if ((color.get(node) ?? WHITE) === WHITE) {
        dfs(node);
      }
    }

    return createValidationResult(issues);
  }

  // ── Version Lineage ─────────────────────────────────────────────

  /**
   * Validates version consistency for every knowledge item:
   *   - Each item's `currentVersionId` must exist in the `versions` array.
   *   - Revisions for a single item must be sequential (1, 2, 3, …).
   *   - The lineage chain (via `parentId`) must have no gaps — every
   *     `parentId` must point to a version belonging to the same item.
   */
  validateVersions(
    items: readonly KnowledgeItem[],
    versions: readonly KnowledgeVersion[],
  ): KnowledgeValidationResult {
    const issues: KnowledgeValidationIssue[] = [];

    // Index versions by ID for fast lookup
    const versionById = new Map<string, KnowledgeVersion>();
    for (const version of versions) {
      versionById.set(version.id as unknown as string, version);
    }

    // Group versions by itemId
    const versionsByItem = new Map<string, readonly KnowledgeVersion[]>();
    for (const version of versions) {
      const itemKey = version.itemId as unknown as string;
      const existing = versionsByItem.get(itemKey);
      if (existing !== undefined) {
        versionsByItem.set(itemKey, [...existing, version]);
      } else {
        versionsByItem.set(itemKey, [version]);
      }
    }

    // ─ Check currentVersionId exists ─
    for (const item of items) {
      const currentKey = item.currentVersionId as unknown as string;
      if (!versionById.has(currentKey)) {
        issues.push(
          Object.freeze({
            code: 'KNOWLEDGE_MISSING_CURRENT_VERSION',
            message: `Item "${item.id}" references non-existent currentVersionId "${item.currentVersionId}".`,
            severity: 'error',
            itemId: item.id,
            details: Object.freeze({
              itemId: item.id as unknown as string,
              versionId: currentKey,
            }),
          }),
        );
      }
    }

    // ─ Check revision sequencing and lineage gaps per item ─
    for (const [itemKey, itemVersions] of versionsByItem) {
      const sorted = [...itemVersions].sort((a, b) => a.revision - b.revision);

      // Revision sequentiality: expect 1, 2, 3, …
      for (let i = 0; i < sorted.length; i++) {
        const expected = i + 1;
        if (sorted[i].revision !== expected) {
          issues.push(
            Object.freeze({
              code: 'KNOWLEDGE_REVISION_GAP',
              message: `Item "${itemKey}" has revision gap: expected ${expected} but found ${sorted[i].revision}.`,
              severity: 'error',
              details: Object.freeze({
                itemId: itemKey,
                expected: String(expected),
                actual: String(sorted[i].revision),
              }),
            }),
          );
        }
      }

      // Lineage chain: parentId must point to another version of the same item
      for (const version of itemVersions) {
        if (version.parentId !== undefined) {
          const parentKey = version.parentId as unknown as string;
          const parent = versionById.get(parentKey);

          if (parent === undefined) {
            issues.push(
              Object.freeze({
                code: 'KNOWLEDGE_LINEAGE_BROKEN',
                message: `Version "${version.id}" of item "${itemKey}" references non-existent parentId "${version.parentId}".`,
                severity: 'error',
                details: Object.freeze({
                  itemId: itemKey,
                  versionId: version.id as unknown as string,
                  parentId: parentKey,
                }),
              }),
            );
          } else {
            const parentItemKey = parent.itemId as unknown as string;
            if (parentItemKey !== itemKey) {
              issues.push(
                Object.freeze({
                  code: 'KNOWLEDGE_LINEAGE_CROSS_ITEM',
                  message: `Version "${version.id}" parentId "${version.parentId}" belongs to a different item "${parentItemKey}" (expected "${itemKey}").`,
                  severity: 'error',
                  details: Object.freeze({
                    itemId: itemKey,
                    versionId: version.id as unknown as string,
                    parentId: parentKey,
                    parentItemId: parentItemKey,
                  }),
                }),
              );
            }
          }
        }
      }
    }

    return createValidationResult(issues);
  }

  // ── Graph Consistency ───────────────────────────────────────────

  /**
   * Full graph consistency check:
   *   - **No orphans**: items that are neither a source nor a target
   *     of any relation are reported as warnings.
   *   - **No self-references**: a relation whose `sourceId === targetId`
   *     is invalid unless the type is `Related`.
   *   - **No duplicate relations**: the tuple `(sourceId, targetId, type)`
   *     must be unique across all relations.
   */
  validateGraphConsistency(
    items: readonly KnowledgeItem[],
    relations: readonly KnowledgeRelation[],
  ): KnowledgeValidationResult {
    const issues: KnowledgeValidationIssue[] = [];

    // Collect all referenced IDs from relations
    const referencedIds = new Set<string>();
    for (const relation of relations) {
      referencedIds.add(relation.sourceId as unknown as string);
      referencedIds.add(relation.targetId as unknown as string);
    }

    // ─ Orphans: items not appearing in any relation ─
    for (const item of items) {
      const idKey = item.id as unknown as string;
      if (!referencedIds.has(idKey)) {
        issues.push(
          Object.freeze({
            code: 'KNOWLEDGE_ORPHAN_ITEM',
            message: `Item "${item.id}" is not referenced by any relation.`,
            severity: 'warning',
            itemId: item.id,
            details: Object.freeze({
              itemId: idKey,
              namespaceId: item.namespaceId as unknown as string,
            }),
          }),
        );
      }
    }

    // ─ Self-references (except Related type) ─
    for (const relation of relations) {
      const sourceKey = relation.sourceId as unknown as string;
      const targetKey = relation.targetId as unknown as string;

      if (sourceKey === targetKey && relation.type !== KnowledgeRelationType.Related) {
        issues.push(
          Object.freeze({
            code: 'KNOWLEDGE_SELF_REFERENCE',
            message: `Relation "${relation.id}" of type "${relation.type}" is a self-reference (sourceId === targetId: "${sourceKey}").`,
            severity: 'error',
            details: Object.freeze({
              relationId: relation.id as unknown as string,
              type: relation.type,
              itemId: sourceKey,
            }),
          }),
        );
      }
    }

    // ─ Duplicate relations: unique (sourceId, targetId, type) ─
    const seenTuples = new Map<string, KnowledgeRelationId>();
    for (const relation of relations) {
      const tupleKey = `${relation.sourceId}|${relation.targetId}|${relation.type}`;
      const existingId = seenTuples.get(tupleKey);

      if (existingId !== undefined) {
        issues.push(
          Object.freeze({
            code: 'KNOWLEDGE_DUPLICATE_RELATION',
            message: `Duplicate relation detected: ${tupleKey}. First relation "${existingId}", duplicate "${relation.id}".`,
            severity: 'error',
            details: Object.freeze({
              tuple: tupleKey,
              firstRelationId: existingId as unknown as string,
              duplicateRelationId: relation.id as unknown as string,
            }),
          }),
        );
      } else {
        seenTuples.set(tupleKey, relation.id);
      }
    }

    return createValidationResult(issues);
  }

  // ── Validate All ────────────────────────────────────────────────

  /**
   * Runs every validation in sequence and combines the results.
   * The overall `valid` flag is `true` only if **no** combined issues
   * have severity `'error'`.
   */
  validateAll(
    items: readonly KnowledgeItem[],
    namespaces: readonly KnowledgeNamespace[],
    relations: readonly KnowledgeRelation[],
    versions: readonly KnowledgeVersion[],
  ): KnowledgeValidationResult {
    const allIssues: KnowledgeValidationIssue[] = [];

    const results: readonly KnowledgeValidationResult[] = Object.freeze([
      this.validateNamespaceIsolation(items, namespaces),
      this.validateDuplicateIds(items),
      this.validateBrokenReferences(items, relations),
      this.validateCyclicReferences(relations),
      this.validateVersions(items, versions),
      this.validateGraphConsistency(items, relations),
    ]);

    for (const result of results) {
      for (const issue of result.issues) {
        allIssues.push(issue);
      }
    }

    const hasErrors = allIssues.some((issue) => issue.severity === 'error');

    return Object.freeze({
      valid: !hasErrors,
      issues: Object.freeze([...allIssues]),
      checkedAt: new Date().toISOString() as Timestamp,
    });
  }
}
