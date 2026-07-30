/**
 * Workflow Runtime — Trace Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowTrace } from '../../../core/workflow/workflow-trace.js';
import { brandWorkflowInstanceId, brandStageId, brandExecutionId } from '../../../core/workflow/types.js';
import { TraceLevel } from '../../../core/workflow/types.js';

describe('WorkflowTrace', () => {
  let trace: WorkflowTrace;
  const instanceId = brandWorkflowInstanceId('inst-1');
  const stageId = brandStageId('stage-1');
  const executionId = brandExecutionId('exec-1');

  beforeEach(() => {
    trace = new WorkflowTrace();
  });

  describe('add', () => {
    it('should add a trace entry', () => {
      const entry = trace.add(instanceId, TraceLevel.Info, 'test-action', 'test message');
      expect(entry.id).toBeDefined();
      expect(entry.workflowInstanceId).toBe(instanceId);
      expect(entry.level).toBe(TraceLevel.Info);
      expect(entry.action).toBe('test-action');
      expect(entry.message).toBe('test message');
      expect(entry.timestamp).toBeDefined();
    });

    it('should include stageId when provided', () => {
      const entry = trace.add(instanceId, TraceLevel.Info, 'action', 'msg', { stageId });
      expect(entry.stageId).toBe(stageId);
    });

    it('should include executionId when provided', () => {
      const entry = trace.add(instanceId, TraceLevel.Info, 'action', 'msg', { executionId });
      expect(entry.executionId).toBe(executionId);
    });

    it('should include artifacts when provided', () => {
      const entry = trace.add(instanceId, TraceLevel.Info, 'action', 'msg', { artifacts: ['artifact-1', 'artifact-2'] });
      expect(entry.artifacts).toHaveLength(2);
    });

    it('should include metadata when provided', () => {
      const entry = trace.add(instanceId, TraceLevel.Info, 'action', 'msg', { metadata: { key: 'value' } });
      expect(entry.metadata.key).toBe('value');
    });

    it('should return frozen entry', () => {
      const entry = trace.add(instanceId, TraceLevel.Info, 'action', 'msg');
      expect(Object.isFrozen(entry)).toBe(true);
    });
  });

  describe('Level methods', () => {
    it('should add debug entry', () => {
      const entry = trace.debug(instanceId, 'action', 'debug msg');
      expect(entry.level).toBe(TraceLevel.Debug);
    });

    it('should add info entry', () => {
      const entry = trace.info(instanceId, 'action', 'info msg');
      expect(entry.level).toBe(TraceLevel.Info);
    });

    it('should add warn entry', () => {
      const entry = trace.warn(instanceId, 'action', 'warn msg');
      expect(entry.level).toBe(TraceLevel.Warn);
    });

    it('should add error entry', () => {
      const entry = trace.error(instanceId, 'action', 'error msg');
      expect(entry.level).toBe(TraceLevel.Error);
    });
  });

  describe('getByInstance', () => {
    it('should return entries for a specific instance', () => {
      const instanceId2 = brandWorkflowInstanceId('inst-2');
      trace.info(instanceId, 'a', 'msg1');
      trace.info(instanceId2, 'b', 'msg2');
      trace.info(instanceId, 'c', 'msg3');
      expect(trace.getByInstance(instanceId)).toHaveLength(2);
      expect(trace.getByInstance(instanceId2)).toHaveLength(1);
    });

    it('should return empty for non-existent instance', () => {
      expect(trace.getByInstance(brandWorkflowInstanceId('nonexistent'))).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('should return all entries', () => {
      trace.info(instanceId, 'a', 'msg1');
      trace.info(instanceId, 'b', 'msg2');
      expect(trace.getAll()).toHaveLength(2);
    });

    it('should return empty when no entries', () => {
      expect(trace.getAll()).toHaveLength(0);
    });
  });

  describe('getByLevel', () => {
    it('should filter by level', () => {
      trace.info(instanceId, 'a', 'msg1');
      trace.error(instanceId, 'b', 'msg2');
      trace.info(instanceId, 'c', 'msg3');
      trace.debug(instanceId, 'd', 'msg4');
      expect(trace.getByLevel(instanceId, TraceLevel.Info)).toHaveLength(2);
      expect(trace.getByLevel(instanceId, TraceLevel.Error)).toHaveLength(1);
      expect(trace.getByLevel(instanceId, TraceLevel.Debug)).toHaveLength(1);
    });
  });

  describe('getByStage', () => {
    it('should filter by stage', () => {
      trace.info(instanceId, 'a', 'msg1', { stageId });
      trace.info(instanceId, 'b', 'msg2', { stageId: brandStageId('stage-2') });
      trace.info(instanceId, 'c', 'msg3', { stageId });
      expect(trace.getByStage(instanceId, stageId)).toHaveLength(2);
    });

    it('should return entries without stageId', () => {
      trace.info(instanceId, 'a', 'msg1');
      expect(trace.getByStage(instanceId, stageId)).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    it('should return count for instance', () => {
      trace.info(instanceId, 'a', 'msg1');
      trace.info(instanceId, 'b', 'msg2');
      expect(trace.getCount(instanceId)).toBe(2);
    });

    it('should return 0 for non-existent instance', () => {
      expect(trace.getCount(brandWorkflowInstanceId('nonexistent'))).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      trace.info(instanceId, 'a', 'msg1');
      trace.info(instanceId, 'b', 'msg2');
      trace.clear();
      expect(trace.getAll()).toHaveLength(0);
      expect(trace.getByInstance(instanceId)).toHaveLength(0);
    });
  });
});
