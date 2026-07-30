/**
 * Workflow Runtime — Context Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowContextImpl } from '../../../core/workflow/workflow-context.js';
import { brandWorkflowInstanceId, brandWorkflowId, brandStageId } from '../../../core/workflow/types.js';

describe('WorkflowContextImpl', () => {
  const instanceId = brandWorkflowInstanceId('inst-1');
  const workflowId = brandWorkflowId('wf-1');
  const stageId = brandStageId('stage-1');

  it('should create with required params', () => {
    const ctx = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId,
      stageId,
      input: { key: 'value' },
    });
    expect(ctx.workflowInstanceId).toBe(instanceId);
    expect(ctx.workflowId).toBe(workflowId);
    expect(ctx.stageId).toBe(stageId);
  });

  it('should have empty variables initially', () => {
    const ctx = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId,
      stageId: null,
      input: {},
    });
    expect(ctx.variables.size).toBe(0);
  });

  it('should set and get variables', () => {
    const ctx = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId,
      stageId: null,
      input: {},
    });
    ctx.setVariable('key', 'value');
    expect(ctx.getVariable('key')).toBe('value');
  });

  it('should return undefined for missing variable', () => {
    const ctx = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId,
      stageId: null,
      input: {},
    });
    expect(ctx.getVariable('missing')).toBeUndefined();
  });

  it('should freeze input', () => {
    const ctx = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId,
      stageId: null,
      input: { a: 1 },
    });
    expect(Object.isFrozen(ctx.input)).toBe(true);
  });

  it('should freeze metadata', () => {
    const ctx = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId,
      stageId: null,
      input: {},
      metadata: { key: 'value' },
    });
    expect(Object.isFrozen(ctx.metadata)).toBe(true);
  });

  it('should use default emit (no-op)', async () => {
    const ctx = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId,
      stageId: null,
      input: {},
    });
    await expect(ctx.emit('test', {})).resolves.toBeUndefined();
  });

  it('should use custom emit', async () => {
    const emitFn = vi.fn();
    const ctx = new WorkflowContextImpl({
      workflowInstanceId: instanceId,
      workflowId,
      stageId: null,
      input: {},
      emit: emitFn,
    });
    await ctx.emit('custom.event', { data: 123 });
    expect(emitFn).toHaveBeenCalledWith('custom.event', { data: 123 });
  });

  describe('createStageContext', () => {
    it('should create child context with new stageId', () => {
      const ctx = new WorkflowContextImpl({
        workflowInstanceId: instanceId,
        workflowId,
        stageId,
        input: { shared: true },
      });
      const childCtx = ctx.createStageContext(brandStageId('stage-2'));
      expect(childCtx.stageId).toBe(brandStageId('stage-2'));
      expect(childCtx.workflowInstanceId).toBe(instanceId);
      expect(childCtx.input.shared).toBe(true);
    });

    it('should share emit function', async () => {
      const emitFn = vi.fn();
      const ctx = new WorkflowContextImpl({
        workflowInstanceId: instanceId,
        workflowId,
        stageId: null,
        input: {},
        emit: emitFn,
      });
      const child = ctx.createStageContext(stageId);
      await child.emit('event', {});
      expect(emitFn).toHaveBeenCalled();
    });

    it('should not share variables', () => {
      const ctx = new WorkflowContextImpl({
        workflowInstanceId: instanceId,
        workflowId,
        stageId: null,
        input: {},
      });
      ctx.setVariable('parent-var', 'value');
      const child = ctx.createStageContext(stageId);
      expect(child.getVariable('parent-var')).toBeUndefined();
    });
  });
});
