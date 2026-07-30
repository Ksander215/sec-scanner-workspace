/**
 * Knowledge Validation — Comprehensive Tests
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 */

import { describe, it, expect } from 'vitest';
import { KnowledgeValidator, createValidationResult } from '../../core/knowledge/validation.js';
import type { KnowledgeValidationConfig } from '../../core/knowledge/validation.js';
import {
  brandKnowledgeItemId,
  brandKnowledgeNamespaceId,
  brandKnowledgeVersionId,
  brandKnowledgeRelationId,
  KnowledgeKind,
  KnowledgeState,
  KnowledgeRelationType,
} from '../../core/knowledge/types.js';
import type {
  KnowledgeItem,
  KnowledgeNamespace,
  KnowledgeVersion,
  KnowledgeRelation,
  KnowledgeMetadata,
} from '../../core/knowledge/types.js';

// ─── Helpers ──────────────────────────────────────────────────────

const TS = () => new Date().toISOString() as any; // Timestamp

const META: KnowledgeMetadata = Object.freeze({
  tags: [],
  source: { type: 'test', identifier: 'test', timestamp: TS() },
  confidence: 1.0,
  custom: {},
});

function makeNamespace(id: string, name = id): KnowledgeNamespace {
  return Object.freeze({
    id: brandKnowledgeNamespaceId(id),
    name,
    createdAt: TS(),
    updatedAt: TS(),
    metadata: {},
  });
}

function makeItem(
  id: string,
  namespaceId: string,
  overrides?: Partial<KnowledgeItem>,
): KnowledgeItem {
  return Object.freeze({
    id: brandKnowledgeItemId(id),
    kind: KnowledgeKind.Item,
    namespaceId: brandKnowledgeNamespaceId(namespaceId),
    name: id,
    content: `content of ${id}`,
    metadata: META,
    state: KnowledgeState.Active,
    currentVersionId: brandKnowledgeVersionId(`version-${id}-1`),
    createdAt: TS(),
    updatedAt: TS(),
    ...overrides,
  });
}

function makeVersion(
  id: string,
  itemId: string,
  revision: number,
  overrides?: Partial<KnowledgeVersion>,
): KnowledgeVersion {
  return Object.freeze({
    id: brandKnowledgeVersionId(id),
    itemId: brandKnowledgeItemId(itemId),
    revision,
    content: `content rev ${revision}`,
    metadata: META,
    state: KnowledgeState.Active,
    createdAt: TS(),
    ...overrides,
  });
}

function makeRelation(
  id: string,
  sourceId: string,
  targetId: string,
  type: KnowledgeRelationType = KnowledgeRelationType.Reference,
): KnowledgeRelation {
  return Object.freeze({
    id: brandKnowledgeRelationId(id),
    type,
    sourceId: brandKnowledgeItemId(sourceId),
    targetId: brandKnowledgeItemId(targetId),
    metadata: {},
    createdAt: TS(),
  });
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('KnowledgeValidator', () => {
  // ── validateNamespaceIsolation ──────────────────────────────────

  describe('validateNamespaceIsolation', () => {
    it('returns valid when all items reference known namespaces', () => {
      const validator = new KnowledgeValidator();
      const ns = makeNamespace('ns-1');
      const item = makeItem('item-1', 'ns-1');
      const result = validator.validateNamespaceIsolation([item], [ns]);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('returns invalid when an item references an unknown namespace', () => {
      const validator = new KnowledgeValidator();
      const ns = makeNamespace('ns-1');
      const item = makeItem('item-1', 'ns-unknown');
      const result = validator.validateNamespaceIsolation([item], [ns]);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]!.code).toBe('KNOWLEDGE_INVALID_NAMESPACE');
      expect(result.issues[0]!.severity).toBe('error');
    });

    it('reports errors for multiple items with invalid namespaces', () => {
      const validator = new KnowledgeValidator();
      const ns = makeNamespace('ns-1');
      const items = [
        makeItem('item-1', 'ns-bad-1'),
        makeItem('item-2', 'ns-1'),
        makeItem('item-3', 'ns-bad-2'),
      ];
      const result = validator.validateNamespaceIsolation(items, [ns]);
      expect(result.valid).toBe(false);
      expect(result.issues.filter((i) => i.code === 'KNOWLEDGE_INVALID_NAMESPACE')).toHaveLength(2);
    });

    it('returns valid when items and namespaces are both empty', () => {
      const validator = new KnowledgeValidator();
      const result = validator.validateNamespaceIsolation([], []);
      expect(result.valid).toBe(true);
    });

    it('emits a warning when a namespace exceeds maxItemsPerNamespace', () => {
      const validator = new KnowledgeValidator({ maxItemsPerNamespace: 2 });
      const ns = makeNamespace('ns-1');
      const items = [
        makeItem('i1', 'ns-1'),
        makeItem('i2', 'ns-1'),
        makeItem('i3', 'ns-1'),
      ];
      const result = validator.validateNamespaceIsolation(items, [ns]);
      const capacityIssues = result.issues.filter((i) => i.code === 'KNOWLEDGE_NAMESPACE_CAPACITY_WARNING');
      expect(capacityIssues).toHaveLength(1);
      expect(capacityIssues[0]!.severity).toBe('warning');
    });

    it('does not emit capacity warning when under the limit', () => {
      const validator = new KnowledgeValidator({ maxItemsPerNamespace: 5 });
      const ns = makeNamespace('ns-1');
      const items = [makeItem('i1', 'ns-1'), makeItem('i2', 'ns-1')];
      const result = validator.validateNamespaceIsolation(items, [ns]);
      expect(result.issues.filter((i) => i.code === 'KNOWLEDGE_NAMESPACE_CAPACITY_WARNING')).toHaveLength(0);
    });

    it('does not emit capacity warning when maxItemsPerNamespace is not set (default Infinity)', () => {
      const validator = new KnowledgeValidator();
      const ns = makeNamespace('ns-1');
      const items = Array.from({ length: 100 }, (_, i) => makeItem(`i${i}`, 'ns-1'));
      const result = validator.validateNamespaceIsolation(items, [ns]);
      expect(result.issues.filter((i) => i.code === 'KNOWLEDGE_NAMESPACE_CAPACITY_WARNING')).toHaveLength(0);
    });

    it('includes itemId in the issue for invalid namespace', () => {
      const validator = new KnowledgeValidator();
      const item = makeItem('item-x', 'ns-bad');
      const result = validator.validateNamespaceIsolation([item], []);
      expect(result.issues[0]!.itemId).toBe(item.id);
    });
  });

  // ── validateDuplicateIds ────────────────────────────────────────

  describe('validateDuplicateIds', () => {
    it('returns valid when all IDs in the same namespace are unique', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns-1'), makeItem('b', 'ns-1')];
      const result = validator.validateDuplicateIds(items);
      expect(result.valid).toBe(true);
    });

    it('returns invalid when two items share the same ID in the same namespace', () => {
      const validator = new KnowledgeValidator();
      const nsId = 'ns-1';
      const items = [
        makeItem('dup', nsId),
        makeItem('dup', nsId),
      ];
      const result = validator.validateDuplicateIds(items);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]!.code).toBe('KNOWLEDGE_DUPLICATE_ID');
    });

    it('does not flag same ID in different namespaces as duplicate', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('same', 'ns-1'), makeItem('same', 'ns-2')];
      const result = validator.validateDuplicateIds(items);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('returns valid for empty items', () => {
      const validator = new KnowledgeValidator();
      const result = validator.validateDuplicateIds([]);
      expect(result.valid).toBe(true);
    });

    it('detects multiple duplicate pairs across namespaces', () => {
      const validator = new KnowledgeValidator();
      const items = [
        makeItem('dup-a', 'ns-1'),
        makeItem('dup-a', 'ns-1'),
        makeItem('dup-b', 'ns-2'),
        makeItem('dup-b', 'ns-2'),
      ];
      const result = validator.validateDuplicateIds(items);
      expect(result.issues).toHaveLength(2);
    });

    it('flags only the second and subsequent occurrences of a duplicate', () => {
      const validator = new KnowledgeValidator();
      const items = [
        makeItem('dup', 'ns-1'),
        makeItem('dup', 'ns-1'),
        makeItem('dup', 'ns-1'),
      ];
      const result = validator.validateDuplicateIds(items);
      expect(result.issues).toHaveLength(2);
    });
  });

  // ── validateBrokenReferences ────────────────────────────────────

  describe('validateBrokenReferences', () => {
    it('returns valid when all source and target IDs exist', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns'), makeItem('b', 'ns')];
      const rels = [makeRelation('r1', 'a', 'b')];
      const result = validator.validateBrokenReferences(items, rels);
      expect(result.valid).toBe(true);
    });

    it('returns invalid when sourceId does not exist', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('b', 'ns')];
      const rels = [makeRelation('r1', 'ghost-source', 'b')];
      const result = validator.validateBrokenReferences(items, rels);
      expect(result.valid).toBe(false);
      expect(result.issues[0]!.code).toBe('KNOWLEDGE_BROKEN_SOURCE_REF');
    });

    it('returns invalid when targetId does not exist', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns')];
      const rels = [makeRelation('r1', 'a', 'ghost-target')];
      const result = validator.validateBrokenReferences(items, rels);
      expect(result.valid).toBe(false);
      expect(result.issues[0]!.code).toBe('KNOWLEDGE_BROKEN_TARGET_REF');
    });

    it('reports both errors when both source and target are missing', () => {
      const validator = new KnowledgeValidator();
      const rels = [makeRelation('r1', 'ghost-a', 'ghost-b')];
      const result = validator.validateBrokenReferences([], rels);
      expect(result.issues).toHaveLength(2);
      const codes = result.issues.map((i) => i.code);
      expect(codes).toContain('KNOWLEDGE_BROKEN_SOURCE_REF');
      expect(codes).toContain('KNOWLEDGE_BROKEN_TARGET_REF');
    });

    it('returns valid when relations array is empty', () => {
      const validator = new KnowledgeValidator();
      const result = validator.validateBrokenReferences([], []);
      expect(result.valid).toBe(true);
    });

    it('includes relation type in broken reference details', () => {
      const validator = new KnowledgeValidator();
      const rels = [makeRelation('r1', 'ghost', 'also-ghost', KnowledgeRelationType.Dependency)];
      const result = validator.validateBrokenReferences([], rels);
      expect(result.issues[0]!.details!.type).toBe(KnowledgeRelationType.Dependency);
    });
  });

  // ── validateCyclicReferences ───────────────────────────────────

  describe('validateCyclicReferences', () => {
    it('returns valid immediately when cyclic detection is disabled', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: false });
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Parent),
        makeRelation('r2', 'b', 'a', KnowledgeRelationType.Parent),
      ];
      const result = validator.validateCyclicReferences(rels);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('returns valid when cyclic detection is enabled but no cycle exists', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Parent),
        makeRelation('r2', 'b', 'c', KnowledgeRelationType.Parent),
      ];
      const result = validator.validateCyclicReferences(rels);
      expect(result.valid).toBe(true);
    });

    it('detects a simple two-node cycle (A->B->A)', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Parent),
        makeRelation('r2', 'b', 'a', KnowledgeRelationType.Parent),
      ];
      const result = validator.validateCyclicReferences(rels);
      expect(result.valid).toBe(false);
      expect(result.issues[0]!.code).toBe('KNOWLEDGE_CYCLIC_RELATION');
    });

    it('detects a longer cycle (A->B->C->A)', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Dependency),
        makeRelation('r2', 'b', 'c', KnowledgeRelationType.Dependency),
        makeRelation('r3', 'c', 'a', KnowledgeRelationType.Dependency),
      ];
      const result = validator.validateCyclicReferences(rels);
      expect(result.valid).toBe(false);
    });

    it('ignores non-cyclic relation types (Reference, Related, etc.)', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Reference),
        makeRelation('r2', 'b', 'a', KnowledgeRelationType.Reference),
      ];
      const result = validator.validateCyclicReferences(rels);
      expect(result.valid).toBe(true);
    });

    it('detects a self-loop as a cycle', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const rels = [
        makeRelation('r1', 'a', 'a', KnowledgeRelationType.Child),
      ];
      const result = validator.validateCyclicReferences(rels);
      expect(result.valid).toBe(false);
    });

    it('detects multiple disconnected cycles', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.DerivedFrom),
        makeRelation('r2', 'b', 'a', KnowledgeRelationType.DerivedFrom),
        makeRelation('r3', 'x', 'y', KnowledgeRelationType.Parent),
        makeRelation('r4', 'y', 'x', KnowledgeRelationType.Parent),
      ];
      const result = validator.validateCyclicReferences(rels);
      const cycleIssues = result.issues.filter((i) => i.code === 'KNOWLEDGE_CYCLIC_RELATION');
      expect(cycleIssues.length).toBeGreaterThanOrEqual(2);
    });

    it('returns valid for empty relations', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const result = validator.validateCyclicReferences([]);
      expect(result.valid).toBe(true);
    });

    it('does not flag a diamond DAG as cyclic', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Dependency),
        makeRelation('r2', 'a', 'c', KnowledgeRelationType.Dependency),
        makeRelation('r3', 'b', 'd', KnowledgeRelationType.Dependency),
        makeRelation('r4', 'c', 'd', KnowledgeRelationType.Dependency),
      ];
      const result = validator.validateCyclicReferences(rels);
      expect(result.valid).toBe(true);
    });

    it('includes cycle path in the issue details', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Parent),
        makeRelation('r2', 'b', 'a', KnowledgeRelationType.Parent),
      ];
      const result = validator.validateCyclicReferences(rels);
      expect(result.issues[0]!.details!.cycle).toContain('a');
      expect(result.issues[0]!.details!.cycle).toContain('b');
    });
  });

  // ── validateVersions ───────────────────────────────────────────

  describe('validateVersions', () => {
    it('returns valid for a correct sequential version chain', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('item-1', 'ns', { currentVersionId: brandKnowledgeVersionId('v-1-3') })];
      const versions = [
        makeVersion('v-1-1', 'item-1', 1),
        makeVersion('v-1-2', 'item-1', 2, { parentId: brandKnowledgeVersionId('v-1-1') }),
        makeVersion('v-1-3', 'item-1', 3, { parentId: brandKnowledgeVersionId('v-1-2') }),
      ];
      const result = validator.validateVersions(items, versions);
      expect(result.valid).toBe(true);
    });

    it('returns invalid when currentVersionId does not exist in versions', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('item-1', 'ns', { currentVersionId: brandKnowledgeVersionId('nonexistent') })];
      const versions = [makeVersion('v-1-1', 'item-1', 1)];
      const result = validator.validateVersions(items, versions);
      expect(result.valid).toBe(false);
      expect(result.issues[0]!.code).toBe('KNOWLEDGE_MISSING_CURRENT_VERSION');
    });

    it('detects revision gaps', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('item-1', 'ns', { currentVersionId: brandKnowledgeVersionId('v-1-2') })];
      const versions = [
        makeVersion('v-1-1', 'item-1', 1),
        makeVersion('v-1-2', 'item-1', 3), // gap: revision 2 is missing
      ];
      const result = validator.validateVersions(items, versions);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'KNOWLEDGE_REVISION_GAP')).toBe(true);
    });

    it('detects a broken parentId that references a non-existent version', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('item-1', 'ns', { currentVersionId: brandKnowledgeVersionId('v-1-2') })];
      const versions = [
        makeVersion('v-1-1', 'item-1', 1),
        makeVersion('v-1-2', 'item-1', 2, { parentId: brandKnowledgeVersionId('ghost-version') }),
      ];
      const result = validator.validateVersions(items, versions);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'KNOWLEDGE_LINEAGE_BROKEN')).toBe(true);
    });

    it('detects a parentId that points to a version of a different item', () => {
      const validator = new KnowledgeValidator();
      const items = [
        makeItem('item-1', 'ns', { currentVersionId: brandKnowledgeVersionId('v-1-2') }),
        makeItem('item-2', 'ns', { currentVersionId: brandKnowledgeVersionId('v-2-1') }),
      ];
      const versions = [
        makeVersion('v-1-1', 'item-1', 1),
        makeVersion('v-1-2', 'item-1', 2, { parentId: brandKnowledgeVersionId('v-2-1') }),
        makeVersion('v-2-1', 'item-2', 1),
      ];
      const result = validator.validateVersions(items, versions);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'KNOWLEDGE_LINEAGE_CROSS_ITEM')).toBe(true);
    });

    it('returns valid when items and versions are both empty', () => {
      const validator = new KnowledgeValidator();
      const result = validator.validateVersions([], []);
      expect(result.valid).toBe(true);
    });

    it('returns invalid when items reference versions not in the array', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('item-1', 'ns')];
      const result = validator.validateVersions(items, []);
      expect(result.valid).toBe(false);
      expect(result.issues[0]!.code).toBe('KNOWLEDGE_MISSING_CURRENT_VERSION');
    });

    it('allows first version to have no parentId', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('item-1', 'ns', { currentVersionId: brandKnowledgeVersionId('v-1-1') })];
      const versions = [makeVersion('v-1-1', 'item-1', 1)];
      const result = validator.validateVersions(items, versions);
      expect(result.valid).toBe(true);
    });

    it('handles multiple items with independent version chains', () => {
      const validator = new KnowledgeValidator();
      const items = [
        makeItem('item-1', 'ns', { currentVersionId: brandKnowledgeVersionId('v-1-2') }),
        makeItem('item-2', 'ns', { currentVersionId: brandKnowledgeVersionId('v-2-1') }),
      ];
      const versions = [
        makeVersion('v-1-1', 'item-1', 1),
        makeVersion('v-1-2', 'item-1', 2, { parentId: brandKnowledgeVersionId('v-1-1') }),
        makeVersion('v-2-1', 'item-2', 1),
      ];
      const result = validator.validateVersions(items, versions);
      expect(result.valid).toBe(true);
    });
  });

  // ── validateGraphConsistency ───────────────────────────────────

  describe('validateGraphConsistency', () => {
    it('returns valid for a fully connected graph', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns'), makeItem('b', 'ns')];
      const rels = [makeRelation('r1', 'a', 'b')];
      const result = validator.validateGraphConsistency(items, rels);
      expect(result.valid).toBe(true);
    });

    it('reports orphan items as warnings', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('orphan', 'ns'), makeItem('connected', 'ns')];
      // 'connected' self-references via Related type (allowed), so it's referenced.
      // 'orphan' is not referenced by any relation.
      const rels = [makeRelation('r1', 'connected', 'connected', KnowledgeRelationType.Related)];
      const result = validator.validateGraphConsistency(items, rels);
      const orphanIssues = result.issues.filter((i) => i.code === 'KNOWLEDGE_ORPHAN_ITEM');
      expect(orphanIssues).toHaveLength(1);
      expect(orphanIssues[0]!.severity).toBe('warning');
    });

    it('detects self-references for non-Related types as errors', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns')];
      const rels = [makeRelation('r1', 'a', 'a', KnowledgeRelationType.Parent)];
      const result = validator.validateGraphConsistency(items, rels);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'KNOWLEDGE_SELF_REFERENCE')).toBe(true);
    });

    it('allows self-references for the Related type', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns')];
      const rels = [makeRelation('r1', 'a', 'a', KnowledgeRelationType.Related)];
      const result = validator.validateGraphConsistency(items, rels);
      const selfRefIssues = result.issues.filter((i) => i.code === 'KNOWLEDGE_SELF_REFERENCE');
      expect(selfRefIssues).toHaveLength(0);
    });

    it('detects duplicate relations (same source, target, type)', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns'), makeItem('b', 'ns')];
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Reference),
        makeRelation('r2', 'a', 'b', KnowledgeRelationType.Reference),
      ];
      const result = validator.validateGraphConsistency(items, rels);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'KNOWLEDGE_DUPLICATE_RELATION')).toBe(true);
    });

    it('does not flag relations with different types as duplicates', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns'), makeItem('b', 'ns')];
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Reference),
        makeRelation('r2', 'a', 'b', KnowledgeRelationType.Dependency),
      ];
      const result = validator.validateGraphConsistency(items, rels);
      const dupIssues = result.issues.filter((i) => i.code === 'KNOWLEDGE_DUPLICATE_RELATION');
      expect(dupIssues).toHaveLength(0);
    });

    it('reports multiple orphan items', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('o1', 'ns'), makeItem('o2', 'ns')];
      const result = validator.validateGraphConsistency(items, []);
      const orphans = result.issues.filter((i) => i.code === 'KNOWLEDGE_ORPHAN_ITEM');
      expect(orphans).toHaveLength(2);
    });

    it('returns valid for empty items and relations', () => {
      const validator = new KnowledgeValidator();
      const result = validator.validateGraphConsistency([], []);
      expect(result.valid).toBe(true);
    });

    it('includes both relation IDs in duplicate relation details', () => {
      const validator = new KnowledgeValidator();
      const items = [makeItem('a', 'ns'), makeItem('b', 'ns')];
      const rels = [
        makeRelation('r-first', 'a', 'b', KnowledgeRelationType.Reference),
        makeRelation('r-dup', 'a', 'b', KnowledgeRelationType.Reference),
      ];
      const result = validator.validateGraphConsistency(items, rels);
      const dupIssue = result.issues.find((i) => i.code === 'KNOWLEDGE_DUPLICATE_RELATION');
      expect(dupIssue!.details!.firstRelationId).toBe('r-first');
      expect(dupIssue!.details!.duplicateRelationId).toBe('r-dup');
    });
  });

  // ── validateAll ────────────────────────────────────────────────

  describe('validateAll', () => {
    it('returns valid when all data is consistent', () => {
      const validator = new KnowledgeValidator();
      const ns = makeNamespace('ns-1');
      const items = [
        makeItem('a', 'ns-1', { currentVersionId: brandKnowledgeVersionId('v-a-1') }),
        makeItem('b', 'ns-1', { currentVersionId: brandKnowledgeVersionId('v-b-1') }),
      ];
      const rels = [makeRelation('r1', 'a', 'b')];
      const versions = [
        makeVersion('v-a-1', 'a', 1),
        makeVersion('v-b-1', 'b', 1),
      ];
      const result = validator.validateAll(items, [ns], rels, versions);
      expect(result.valid).toBe(true);
    });

    it('combines errors from multiple validation checks', () => {
      const validator = new KnowledgeValidator();
      const items = [
        makeItem('a', 'ns-unknown'),
        makeItem('a', 'ns-unknown'),
      ];
      const rels = [makeRelation('r1', 'ghost', 'ghost')];
      const versions = [];
      const result = validator.validateAll(items, [], rels, versions);
      expect(result.valid).toBe(false);
      // At least: namespace errors (2), duplicate (1), 2 broken refs = 5+
      expect(result.issues.length).toBeGreaterThanOrEqual(4);
    });

    it('warnings do not make valid=false', () => {
      const validator = new KnowledgeValidator();
      const ns = makeNamespace('ns-1');
      const items = [makeItem('orphan', 'ns-1', { currentVersionId: brandKnowledgeVersionId('v-o-1') })];
      const versions = [makeVersion('v-o-1', 'orphan', 1)];
      const result = validator.validateAll(items, [ns], [], versions);
      // Orphan is a warning, so overall should be valid
      expect(result.valid).toBe(true);
      const warnings = result.issues.filter((i) => i.severity === 'warning');
      expect(warnings.length).toBeGreaterThanOrEqual(1);
    });

    it('includes checkedAt timestamp', () => {
      const validator = new KnowledgeValidator();
      const result = validator.validateAll([], [], [], []);
      expect(result.checkedAt).toBeTruthy();
      expect(typeof result.checkedAt).toBe('string');
    });

    it('returns frozen result', () => {
      const validator = new KnowledgeValidator();
      const result = validator.validateAll([], [], [], []);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.issues)).toBe(true);
    });

    it('detects cyclic references in validateAll when enabled', () => {
      const validator = new KnowledgeValidator({ enableCyclicDetection: true });
      const ns = makeNamespace('ns-1');
      const items = [
        makeItem('a', 'ns-1', { currentVersionId: brandKnowledgeVersionId('v-a-1') }),
        makeItem('b', 'ns-1', { currentVersionId: brandKnowledgeVersionId('v-b-1') }),
      ];
      const rels = [
        makeRelation('r1', 'a', 'b', KnowledgeRelationType.Parent),
        makeRelation('r2', 'b', 'a', KnowledgeRelationType.Parent),
      ];
      const versions = [
        makeVersion('v-a-1', 'a', 1),
        makeVersion('v-b-1', 'b', 1),
      ];
      const result = validator.validateAll(items, [ns], rels, versions);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === 'KNOWLEDGE_CYCLIC_RELATION')).toBe(true);
    });
  });

  // ── createValidationResult helper ───────────────────────────────

  describe('createValidationResult', () => {
    it('returns valid=true when there are no issues', () => {
      const result = createValidationResult([]);
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('returns valid=true when only warnings exist', () => {
      const issues = [{
        code: 'TEST_WARN',
        message: 'just a warning',
        severity: 'warning' as const,
      }];
      const result = createValidationResult(issues);
      expect(result.valid).toBe(true);
    });

    it('returns valid=false when an error exists', () => {
      const issues = [{
        code: 'TEST_ERR',
        message: 'an error',
        severity: 'error' as const,
      }];
      const result = createValidationResult(issues);
      expect(result.valid).toBe(false);
    });

    it('returns valid=false when both errors and warnings exist', () => {
      const issues = [
        { code: 'W', message: 'warn', severity: 'warning' as const },
        { code: 'E', message: 'err', severity: 'error' as const },
      ];
      const result = createValidationResult(issues);
      expect(result.valid).toBe(false);
    });

    it('returns a frozen result object', () => {
      const result = createValidationResult([]);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.issues)).toBe(true);
    });

    it('sets checkedAt to a valid ISO timestamp', () => {
      const before = new Date().toISOString();
      const result = createValidationResult([]);
      const after = new Date().toISOString();
      expect(result.checkedAt >= before && result.checkedAt <= after).toBe(true);
    });
  });
});
