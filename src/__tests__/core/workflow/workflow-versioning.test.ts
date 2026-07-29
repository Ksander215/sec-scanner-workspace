/**
 * Workflow Runtime — Version Manager Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowVersionManager } from '../../../core/workflow/workflow-versioning.js';
import type { WorkflowDefinition } from '../../../core/workflow/types.js';
import { brandWorkflowId, brandStageId } from '../../../core/workflow/types.js';
import { StageType } from '../../../core/workflow/types.js';

function makeDefinition(id: string, version: string): WorkflowDefinition {
  return Object.freeze({
    id: id as any,
    name: `Workflow-${id}`,
    description: '',
    version,
    stages: Object.freeze([Object.freeze({
      id: brandStageId(crypto.randomUUID()),
      name: 'stage-1',
      description: '',
      type: StageType.Sequential,
      handler: 'handler',
      inputMapping: Object.freeze({}),
      outputMapping: Object.freeze({}),
      timeoutMs: 30000,
      retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
      compensation: Object.freeze({ action: 'Undo' as any, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
      conditions: [],
      metadata: Object.freeze({}),
      dependencies: [],
    })]),
    transitions: Object.freeze([]),
    conditions: Object.freeze([]),
    policies: Object.freeze([]),
    metadata: Object.freeze({}),
    inputSchema: Object.freeze({}),
    outputSchema: Object.freeze({}),
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });
}

describe('WorkflowVersionManager', () => {
  let manager: WorkflowVersionManager;
  const wfId = brandWorkflowId('wf-1');

  beforeEach(() => {
    manager = new WorkflowVersionManager();
  });

  describe('registerVersion', () => {
    it('should register first version as active', () => {
      const def = makeDefinition(wfId, '1.0.0');
      const info = manager.registerVersion(def);
      expect(info.version).toBe('1.0.0');
      expect(info.isActive).toBe(true);
      expect(info.workflowId).toBe(wfId);
    });

    it('should not mark subsequent versions as active', () => {
      manager.registerVersion(makeDefinition(wfId, '1.0.0'));
      const v2 = manager.registerVersion(makeDefinition(wfId, '2.0.0'));
      expect(v2.isActive).toBe(false);
    });

    it('should store the definition', () => {
      const def = makeDefinition(wfId, '1.0.0');
      const info = manager.registerVersion(def);
      expect(info.definition.name).toBe(def.name);
    });
  });

  describe('getVersion', () => {
    it('should get a specific version', () => {
      manager.registerVersion(makeDefinition(wfId, '1.0.0'));
      manager.registerVersion(makeDefinition(wfId, '2.0.0'));
      const v1 = manager.getVersion(wfId, '1.0.0');
      expect(v1).not.toBeNull();
      expect(v1!.version).toBe('1.0.0');
    });

    it('should return null for non-existent version', () => {
      expect(manager.getVersion(wfId, '9.0.0')).toBeNull();
    });

    it('should return null for non-existent workflow', () => {
      expect(manager.getVersion(brandWorkflowId('nonexistent'), '1.0.0')).toBeNull();
    });
  });

  describe('getLatestVersion', () => {
    it('should return the latest version', () => {
      manager.registerVersion(makeDefinition(wfId, '1.0.0'));
      manager.registerVersion(makeDefinition(wfId, '2.0.0'));
      manager.registerVersion(makeDefinition(wfId, '3.0.0'));
      const latest = manager.getLatestVersion(wfId);
      expect(latest!.version).toBe('3.0.0');
    });

    it('should return null for non-existent workflow', () => {
      expect(manager.getLatestVersion(brandWorkflowId('nonexistent'))).toBeNull();
    });
  });

  describe('getVersions', () => {
    it('should return all versions', () => {
      manager.registerVersion(makeDefinition(wfId, '1.0.0'));
      manager.registerVersion(makeDefinition(wfId, '2.0.0'));
      const versions = manager.getVersions(wfId);
      expect(versions).toHaveLength(2);
    });

    it('should return empty for non-existent workflow', () => {
      expect(manager.getVersions(brandWorkflowId('nonexistent'))).toHaveLength(0);
    });
  });

  describe('getActiveVersion', () => {
    it('should return the first registered version', () => {
      manager.registerVersion(makeDefinition(wfId, '1.0.0'));
      manager.registerVersion(makeDefinition(wfId, '2.0.0'));
      const active = manager.getActiveVersion(wfId);
      expect(active!.version).toBe('1.0.0');
    });

    it('should return null for non-existent workflow', () => {
      expect(manager.getActiveVersion(brandWorkflowId('nonexistent'))).toBeNull();
    });
  });

  describe('setActiveVersion', () => {
    it('should set the active version', () => {
      manager.registerVersion(makeDefinition(wfId, '1.0.0'));
      manager.registerVersion(makeDefinition(wfId, '2.0.0'));
      expect(manager.setActiveVersion(wfId, '2.0.0')).toBe(true);
      expect(manager.getActiveVersion(wfId)!.version).toBe('2.0.0');
    });

    it('should return false for non-existent version', () => {
      manager.registerVersion(makeDefinition(wfId, '1.0.0'));
      expect(manager.setActiveVersion(wfId, '5.0.0')).toBe(false);
    });

    it('should return false for non-existent workflow', () => {
      expect(manager.setActiveVersion(brandWorkflowId('nonexistent'), '1.0.0')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should detect patch change', () => {
      const result = manager.compareVersions('1.0.0', '1.0.1');
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.migrated).toBe(true);
    });

    it('should detect minor change', () => {
      const result = manager.compareVersions('1.0.0', '1.1.0');
      expect(result.changes).toContainEqual(expect.stringContaining('Minor'));
    });

    it('should detect major change with errors', () => {
      const result = manager.compareVersions('1.0.0', '2.0.0');
      expect(result.changes).toContainEqual(expect.stringContaining('Major'));
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.migrated).toBe(false);
    });

    it('should report no changes for same version', () => {
      const result = manager.compareVersions('1.0.0', '1.0.0');
      expect(result.changes).toHaveLength(0);
      expect(result.migrated).toBe(true);
    });
  });

  describe('canUpgrade', () => {
    it('should allow upgrade', () => {
      expect(manager.canUpgrade('1.0.0', '2.0.0')).toBe(true);
      expect(manager.canUpgrade('1.0.0', '1.1.0')).toBe(true);
      expect(manager.canUpgrade('1.0.0', '1.0.1')).toBe(true);
    });

    it('should prevent downgrade', () => {
      expect(manager.canUpgrade('2.0.0', '1.0.0')).toBe(false);
      expect(manager.canUpgrade('1.1.0', '1.0.0')).toBe(false);
      expect(manager.canUpgrade('1.0.1', '1.0.0')).toBe(false);
    });

    it('should return true for same version (equal)', () => {
      // Same version is allowed since no downgrade is needed
      expect(manager.canUpgrade('1.0.0', '1.0.0')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all versions', () => {
      manager.registerVersion(makeDefinition(wfId, '1.0.0'));
      manager.registerVersion(makeDefinition(wfId, '2.0.0'));
      manager.clear();
      expect(manager.getVersions(wfId)).toHaveLength(0);
    });
  });
});
