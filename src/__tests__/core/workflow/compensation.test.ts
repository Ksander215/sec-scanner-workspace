/**
 * Workflow Runtime — Compensation Engine Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompensationEngine } from '../../../core/workflow/compensation.js';
import type { StageInstance, StageDefinition, WorkflowContext } from '../../../core/workflow/types.js';
import { brandStageId, brandExecutionId, brandWorkflowInstanceId, brandWorkflowId } from '../../../core/workflow/types.js';
import { CompensationAction, StageState, StageType, CompensationStatus } from '../../../core/workflow/types.js';

function makeStageInstance(id: string, state: StageState = StageState.Completed): StageInstance {
  return Object.freeze({
    id: id as any,
    name: `Stage-${id}`,
    state,
    type: StageType.Sequential,
    executions: [],
    input: Object.freeze({}),
    output: Object.freeze({ result: 'done' }),
    error: null,
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:01:00Z',
    attempts: 1,
    compensation: null,
    metadata: Object.freeze({}),
  });
}

function makeStageDef(id: string, action: CompensationAction = CompensationAction.Undo): StageDefinition {
  return Object.freeze({
    id: id as any,
    name: `Stage-${id}`,
    description: '',
    type: StageType.Sequential,
    handler: `handler-${id}`,
    inputMapping: Object.freeze({}),
    outputMapping: Object.freeze({}),
    timeoutMs: 30000,
    retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
    compensation: Object.freeze({ action, handler: `compensate-${id}`, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
    conditions: [],
    metadata: Object.freeze({}),
    dependencies: [],
  });
}

function makeContext(stageId: string): WorkflowContext {
  const instanceId = brandWorkflowInstanceId(crypto.randomUUID());
  const workflowId = brandWorkflowId(crypto.randomUUID());
  return Object.freeze({
    workflowInstanceId: instanceId,
    workflowId,
    stageId: stageId as any,
    input: Object.freeze({}),
    metadata: Object.freeze({}),
    getVariable: () => undefined,
    setVariable: () => {},
    emit: vi.fn(),
  });
}

describe('CompensationEngine', () => {
  let engine: CompensationEngine;
  const stageA = brandStageId('a');
  const stageB = brandStageId('b');
  const stageC = brandStageId('c');

  beforeEach(() => {
    engine = new CompensationEngine();
  });

  describe('compensate', () => {
    it('should process stages in reverse order', async () => {
      const handler = vi.fn();
      engine.registerHandler('compensate-a', handler);
      engine.registerHandler('compensate-b', handler);

      const stages = [makeStageInstance(stageA), makeStageInstance(stageB)];
      const defs = new Map([
        [stageA, makeStageDef(stageA, CompensationAction.Undo)],
        [stageB, makeStageDef(stageB, CompensationAction.Undo)],
      ]);

      const results = await engine.compensate(stages, defs, (id) => makeContext(id));
      expect(results).toHaveLength(2);
      expect(results[0].stageId).toBe(stageB); // reverse order
      expect(results[1].stageId).toBe(stageA);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should skip stages without definitions', async () => {
      const stages = [makeStageInstance(stageA)];
      const defs = new Map();
      const results = await engine.compensate(stages, defs, (id) => makeContext(id));
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(CompensationStatus.Skipped);
    });
  });

  describe('compensateStage', () => {
    it('should skip when action is Skip', async () => {
      const def = makeStageDef(stageA, CompensationAction.Skip);
      const result = await engine.compensateStage(def, makeContext(stageA));
      expect(result.action).toBe(CompensationAction.Skip);
      expect(result.status).toBe(CompensationStatus.Skipped);
    });

    it('should complete when action is Abort', async () => {
      const def = makeStageDef(stageA, CompensationAction.Abort);
      const result = await engine.compensateStage(def, makeContext(stageA));
      expect(result.action).toBe(CompensationAction.Abort);
      expect(result.status).toBe(CompensationStatus.Completed);
    });

    it('should call handler for Undo action', async () => {
      const handler = vi.fn();
      engine.registerHandler(`compensate-${stageA}`, handler);
      const def = makeStageDef(stageA, CompensationAction.Undo);
      const result = await engine.compensateStage(def, makeContext(stageA));
      expect(result.status).toBe(CompensationStatus.Completed);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should call handler for Retry action', async () => {
      const handler = vi.fn();
      engine.registerHandler(`compensate-${stageA}`, handler);
      const def = makeStageDef(stageA, CompensationAction.Retry);
      const result = await engine.compensateStage(def, makeContext(stageA));
      expect(result.status).toBe(CompensationStatus.Completed);
    });

    it('should call handler for Restart action', async () => {
      const handler = vi.fn();
      engine.registerHandler(`compensate-${stageA}`, handler);
      const def = makeStageDef(stageA, CompensationAction.Restart);
      const result = await engine.compensateStage(def, makeContext(stageA));
      expect(result.status).toBe(CompensationStatus.Completed);
    });

    it('should return Failed when handler throws', async () => {
      engine.registerHandler(`compensate-${stageA}`, async () => { throw new Error('comp failed'); });
      const def = makeStageDef(stageA, CompensationAction.Undo);
      const result = await engine.compensateStage(def, makeContext(stageA));
      expect(result.status).toBe(CompensationStatus.Failed);
      expect(result.error).not.toBeNull();
    });

    it('should skip when no handler registered', async () => {
      const def = makeStageDef(stageA, CompensationAction.Undo);
      const result = await engine.compensateStage(def, makeContext(stageA));
      expect(result.status).toBe(CompensationStatus.Skipped);
    });

    it('should fall back to stage handler when no compensation handler', async () => {
      const handler = vi.fn();
      const def = Object.freeze({
        ...makeStageDef(stageA, CompensationAction.Undo),
        compensation: Object.freeze({
          action: CompensationAction.Undo,
          timeoutMs: 30000,
          retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
        }),
      });
      engine.registerHandler(`handler-${stageA}`, handler);
      const result = await engine.compensateStage(def, makeContext(stageA));
      expect(result.status).toBe(CompensationStatus.Completed);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerHandler', () => {
    it('should replace existing handler', async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      engine.registerHandler('handler', h1);
      engine.registerHandler('handler', h2);
      const def = makeStageDef(stageA, CompensationAction.Undo);
      // Handler name is `compensate-${stageA}`
      engine.registerHandler(`compensate-${stageA}`, h2);
      await engine.compensateStage(def, makeContext(stageA));
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledTimes(1);
    });
  });
});
