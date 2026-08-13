/**
 * Autonomous Architecture Runtime — Architecture Graph Change Set Foundation Smoke Tests
 * TASK-AIS-012A.012
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureChangeSet } from '../../../core/autonomous-architecture/services/architecture.change-set.js';
import type { ArchitectureGraphDiffResult } from '../../../core/autonomous-architecture/services/architecture.graph-diff.js';

describe('ArchitectureChangeSet', () => {
  const emptyDiff: ArchitectureGraphDiffResult = Object.freeze({
    addedNodes: Object.freeze([]),
    removedNodes: Object.freeze([]),
    addedEdges: Object.freeze([]),
    removedEdges: Object.freeze([]),
  });

  const nonEmptyDiff: ArchitectureGraphDiffResult = Object.freeze({
    addedNodes: Object.freeze([{ id: 'n1', kind: 'service' as const, name: 'A', layer: 'l1' }]),
    removedNodes: Object.freeze([{ id: 'n2', kind: 'module' as const, name: 'B', layer: 'l1' }]),
    addedEdges: Object.freeze([{ id: 'e1', kind: 'depends-on' as const, from: 'n1', to: 'n2' }]),
    removedEdges: Object.freeze([{ id: 'e2', kind: 'uses' as const, from: 'n2', to: 'n1' }]),
  });

  it('should create a ChangeSet from a diff result', () => {
    const changeSet = new ArchitectureChangeSet(emptyDiff);
    expect(changeSet).toBeInstanceOf(ArchitectureChangeSet);
  });

  it('should return the original diff via getChanges()', () => {
    const changeSet = new ArchitectureChangeSet(nonEmptyDiff);
    expect(changeSet.getChanges()).toBe(nonEmptyDiff);
  });

  it('should return the same reference on multiple getChanges() calls', () => {
    const changeSet = new ArchitectureChangeSet(nonEmptyDiff);
    expect(changeSet.getChanges()).toBe(changeSet.getChanges());
  });

  it('should create an empty ChangeSet from an empty diff', () => {
    const changeSet = new ArchitectureChangeSet(emptyDiff);
    const result = changeSet.getChanges();
    expect(result.addedNodes.length).toBe(0);
    expect(result.removedNodes.length).toBe(0);
    expect(result.addedEdges.length).toBe(0);
    expect(result.removedEdges.length).toBe(0);
  });

  it('should preserve added nodes', () => {
    const changeSet = new ArchitectureChangeSet(nonEmptyDiff);
    expect(changeSet.getChanges().addedNodes.length).toBe(1);
    expect(changeSet.getChanges().addedNodes[0].id).toBe('n1');
  });

  it('should preserve removed nodes', () => {
    const changeSet = new ArchitectureChangeSet(nonEmptyDiff);
    expect(changeSet.getChanges().removedNodes.length).toBe(1);
    expect(changeSet.getChanges().removedNodes[0].id).toBe('n2');
  });

  it('should preserve added edges', () => {
    const changeSet = new ArchitectureChangeSet(nonEmptyDiff);
    expect(changeSet.getChanges().addedEdges.length).toBe(1);
    expect(changeSet.getChanges().addedEdges[0].id).toBe('e1');
  });

  it('should preserve removed edges', () => {
    const changeSet = new ArchitectureChangeSet(nonEmptyDiff);
    expect(changeSet.getChanges().removedEdges.length).toBe(1);
    expect(changeSet.getChanges().removedEdges[0].id).toBe('e2');
  });

  it('should not modify the original diff', () => {
    const before = nonEmptyDiff.addedNodes.length;
    const changeSet = new ArchitectureChangeSet(nonEmptyDiff);
    changeSet.getChanges();
    expect(nonEmptyDiff.addedNodes.length).toBe(before);
  });

  it('should expose the class as a public export', () => {
    expect(ArchitectureChangeSet).toBeDefined();
    expect(typeof ArchitectureChangeSet).toBe('function');
  });
});
