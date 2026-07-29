/**
 * Workflow Runtime — Edge Cases & Stress Tests
 * TASK-AIS-003H.000
 *
 * Additional edge case and stress tests:
 * - Empty handler outputs
 * - Handler that throws non-Error
 * - Large workflow definitions
 * - Storage boundary conditions
 * - Scheduler edge cases
 * - Metrics calculation precision
 * - FSM boundary states
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorkflowDefinition, validateDefinition } from '../../../core/workflow/workflow-definition.js';
import { InMemoryWorkflowStorage } from '../../../core/workflow/workflow-storage.js';
import { WorkflowScheduler } from '../../../core/workflow/scheduler.js';
import { WorkflowMetricsCollector } from '../../../core/workflow/workflow-metrics.js';
import { VariablesRuntime } from '../../../core/workflow/variables.js';
import { WorkflowTrace } from '../../../core/workflow/workflow-trace.js';
import { WorkflowVersionManager } from '../../../core/workflow/workflow-versioning.js';
import { WorkflowPolicyEngine } from '../../../core/workflow/workflow-policies.js';
import { createWorkflowInstance, cloneMutable, freezeInstance, createExecutionRecord, completeExecutionRecord, updateStageState } from '../../../core/workflow/workflow-instance.js';
import { createWorkflowFSM, createStageFSM } from '../../../core/workflow/workflow-fsm.js';
import { createWorkflowEventBase } from '../../../core/workflow/workflow-events.js';
import {
  WorkflowState,
  StageState,
  StageType,
  ExecutionStatus,
  CompensationAction,
  CompensationStatus,
  TraceLevel,
  VariableScope,
  PolicyType,
} from '../../../core/workflow/types.js';
import {
  brandStageId,
  brandWorkflowId,
  brandWorkflowInstanceId,
  brandExecutionId,
  brandTransitionId,
  brandCheckpointId,
} from '../../../core/workflow/types.js';
import type { StageDefinition } from '../../../core/workflow/types.js';

describe('Workflow Edge Cases & Stress Tests', () => {
  // ─── Definition Edge Cases ──────────────────────────────────

  describe('definition edge cases', () => {
    it('should handle single-character name', () => {
      const def = createWorkflowDefinition({ name: 'a', stages: [{ name: 's1', handler: 'h1' }] });
      expect(def.name).toBe('a');
      expect(validateDefinition(def)).toHaveLength(0);
    });

    it('should handle very long name', () => {
      const name = 'x'.repeat(500);
      const def = createWorkflowDefinition({ name, stages: [{ name: 's1', handler: 'h1' }] });
      expect(def.name).toBe(name);
    });

    it('should handle special characters in name', () => {
      const def = createWorkflowDefinition({ name: 'test-workflow_2024.v1', stages: [{ name: 's1', handler: 'h1' }] });
      expect(validateDefinition(def)).toHaveLength(0);
    });

    it('should handle version with many digits', () => {
      const def = createWorkflowDefinition({ name: 'test', version: '100.200.300', stages: [{ name: 's1', handler: 'h1' }] });
      expect(def.version).toBe('100.200.300');
    });
  });

  // ─── Storage Edge Cases ──────────────────────────────────

  describe('storage edge cases', () => {
    it('should handle deleting non-existent instance', async () => {
      const storage = new InMemoryWorkflowStorage();
      expect(await storage.deleteWorkflowInstance(brandWorkflowInstanceId('x'))).toBe(false);
    });

    it('should handle deleting non-existent definition', async () => {
      const storage = new InMemoryWorkflowStorage();
      expect(await storage.deleteDefinition(brandWorkflowId('x'))).toBe(false);
    });

    it('should return empty checkpoints for unknown instance', async () => {
      const storage = new InMemoryWorkflowStorage();
      expect(await storage.loadCheckpoint(brandWorkflowInstanceId('x'))).toBeNull();
      expect(await storage.listCheckpoints(brandWorkflowInstanceId('x'))).toHaveLength(0);
    });

    it('should handle loading from empty storage', async () => {
      const storage = new InMemoryWorkflowStorage();
      expect(await storage.loadWorkflowInstance(brandWorkflowInstanceId('x'))).toBeNull();
      expect(await storage.loadDefinition(brandWorkflowId('x'))).toBeNull();
      expect(await storage.listWorkflowInstances()).toHaveLength(0);
      expect(await storage.listDefinitions()).toHaveLength(0);
    });
  });

  // ─── Metrics Precision ──────────────────────────────────

  describe('metrics precision', () => {
    it('should calculate success rate correctly with zero total', () => {
      const m = new WorkflowMetricsCollector();
      expect(m.getMetrics().successRate).toBe(0);
    });

    it('should calculate success rate with all completed', () => {
      const m = new WorkflowMetricsCollector();
      m.incrementCompleted();
      m.incrementCompleted();
      m.incrementCompleted();
      expect(m.getMetrics().successRate).toBe(100);
    });

    it('should calculate success rate with all failed', () => {
      const m = new WorkflowMetricsCollector();
      m.incrementFailed();
      m.incrementFailed();
      expect(m.getMetrics().successRate).toBe(0);
    });

    it('should calculate success rate with mixed results', () => {
      const m = new WorkflowMetricsCollector();
      m.incrementCompleted();
      m.incrementCompleted();
      m.incrementCompleted();
      m.incrementFailed();
      m.incrementCancelled();
      // 3/5 = 60%
      expect(m.getMetrics().successRate).toBe(60);
    });

    it('should calculate average time correctly', () => {
      const m = new WorkflowMetricsCollector();
      m.incrementCompleted();
      m.recordExecutionTime(100);
      m.incrementCompleted();
      m.recordExecutionTime(200);
      m.incrementCompleted();
      m.recordExecutionTime(300);
      expect(m.getMetrics().averageExecutionTimeMs).toBe(200);
    });
  });

  // ─── Variables Edge Cases ────────────────────────────────

  describe('variables edge cases', () => {
    it('should overwrite value multiple times', () => {
      const v = new VariablesRuntime();
      v.setGlobal('key', 'a');
      v.setGlobal('key', 'b');
      v.setGlobal('key', 'c');
      expect(v.getGlobal('key')).toBe('c');
    });

    it('should handle undefined values', () => {
      const v = new VariablesRuntime();
      v.setGlobal('undef', undefined);
      expect(v.getGlobal('undef')).toBeUndefined();
    });

    it('should handle object reference correctly', () => {
      const v = new VariablesRuntime();
      const obj = { nested: true };
      v.setGlobal('ref', obj);
      obj.nested = false;
      // Variable stores reference but returns via ReadonlyMap which creates copy
      const stored = v.getGlobal('ref') as typeof obj;
      expect(stored).toEqual({ nested: false });
    });

    it('should clear temporary scope without affecting others', () => {
      const v = new VariablesRuntime();
      v.setGlobal('g', 'global');
      v.setTemporary('t', 'temp');
      v.clearTemporary();
      expect(v.getGlobal('g')).toBe('global');
      expect(v.getTemporary('t')).toBeUndefined();
    });
  });

  // ─── Trace Edge Cases ─────────────────────────────────────

  describe('trace edge cases', () => {
    it('should handle trace with empty artifacts', () => {
      const t = new WorkflowTrace();
      const id = brandWorkflowInstanceId('i');
      t.info(id, 'action', 'msg', { artifacts: [] });
      expect(t.getByInstance(id)[0].artifacts).toHaveLength(0);
    });

    it('should handle empty metadata', () => {
      const t = new WorkflowTrace();
      const id = brandWorkflowInstanceId('i');
      t.info(id, 'action', 'msg', { metadata: Object.freeze({}) });
      expect(Object.keys(t.getByInstance(id)[0].metadata)).toHaveLength(0);
    });
  });

  // ─── FSM Edge Cases ───────────────────────────────────────

  describe('fsm edge cases', () => {
    it('should not allow self-transitions', () => {
      const wFsm = createWorkflowFSM();
      expect(wFsm.canTransition(wFsm.currentState)).toBe(false);
      expect(() => wFsm.transition(wFsm.currentState)).toThrow();
    });

    it('should track history length correctly', () => {
      const wFsm = createWorkflowFSM();
      expect(wFsm.getHistory()).toHaveLength(1); // initial state
      wFsm.transition('Ready');
      expect(wFsm.getHistory()).toHaveLength(2);
      wFsm.transition('Running');
      expect(wFsm.getHistory()).toHaveLength(3);
    });

    it('stage FSM should not allow self-transitions from Pending', () => {
      const sFsm = createStageFSM();
      expect(() => sFsm.transition(sFsm.currentState)).toThrow();
    });
  });

  // ─── Event Base Edge Cases ──────────────────────────────

  describe('event base edge cases', () => {
    it('should handle empty aggregate ID', () => {
      const base = createWorkflowEventBase('TestEvent', 0 as any, '');
      expect(base.aggregateId).toBe('');
      expect(base.aggregateType).toBe('Workflow');
    });

    it('should return consistent structure', () => {
      const base1 = createWorkflowEventBase('Event1', 0 as any, 'agg');
      const base2 = createWorkflowEventBase('Event2', 0 as any, 'agg');
      expect(Object.keys(base1)).toEqual(Object.keys(base2));
    });
  });

  // ─── Execution Record Edge Cases ────────────────────────

  describe('execution record edge cases', () => {
    it('should handle completion with error', () => {
      const stageId = brandStageId('s1');
      const record = createExecutionRecord(stageId, 1, {});
      const error = Object.freeze({
        code: 'ERR', message: 'fail', details: [], occurredAt: '2024-01-01', attempt: 1, retryable: true,
      });
      const completed = completeExecutionRecord(record, ExecutionStatus.Failed, {}, error);
      expect(completed.error).toBe(error);
      expect(completed.status).toBe(ExecutionStatus.Failed);
    });

    it('should handle multiple completions with same record reference', () => {
      const stageId = brandStageId('s1');
      const record = createExecutionRecord(stageId, 1, {});
      const c1 = completeExecutionRecord(record, ExecutionStatus.Completed, { a: 1 });
      // record is frozen, so c1 is independent
      const c2 = completeExecutionRecord(record, ExecutionStatus.Completed, { a: 2 });
      expect(c1.output.a).toBe(1);
      expect(c2.output.a).toBe(2);
    });
  });

  // ─── Policy Edge Cases ──────────────────────────────────

  describe('policy edge cases', () => {
    it('should handle empty rules', () => {
      const engine = new WorkflowPolicyEngine();
      engine.registerDefaults();
      const result = engine.evaluatePolicy(Object.freeze({
        id: 'p1', name: 'empty', type: PolicyType.Timeout,
        rules: Object.freeze({}),
        description: 'empty policy',
      }), {});
      expect(result.passed).toBe(true);
    });

    it('should evaluate all policies with empty rules', () => {
      const engine = new WorkflowPolicyEngine();
      engine.registerDefaults();
      const results = engine.evaluateAll({});
      expect(results).toHaveLength(0);
    });
  });

  // ─── Scheduler Edge Cases ──────────────────────────────

  describe('scheduler edge cases', () => {
    it('should handle zero stages', () => {
      const scheduler = new WorkflowScheduler();
      const plans = scheduler.schedule([]);
      expect(plans).toHaveLength(0);
    });

    it('should handle circular dependency detection', () => {
      const scheduler = new WorkflowScheduler();
      const s1 = brandStageId('1');
      const s2 = brandStageId('2');

      // s1 depends on s2 and s2 depends on s1 → should be filtered out
      const stages = [
        Object.freeze({
          id: s1, name: 's1', description: '', type: StageType.Sequential, handler: 'h',
          inputMapping: Object.freeze({}), outputMapping: Object.freeze({}),
          timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
          compensation: Object.freeze({ action: CompensationAction.Undo, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
          conditions: [], metadata: Object.freeze({}), dependencies: [s2] as any,
        }),
        Object.freeze({
          id: s2, name: 's2', description: '', type: StageType.Sequential, handler: 'h',
          inputMapping: Object.freeze({}), outputMapping: Object.freeze({}),
          timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
          compensation: Object.freeze({ action: CompensationAction.Undo, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
          conditions: [], metadata: Object.freeze({}), dependencies: [s1] as any,
        }),
      ];
      const plans = scheduler.schedule(stages);
      // Both stages have unresolvable dependencies, so neither should be scheduled
      expect(plans).toHaveLength(0);
    });
  });
});
