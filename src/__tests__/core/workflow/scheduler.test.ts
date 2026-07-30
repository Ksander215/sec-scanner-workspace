/**
 * Workflow Runtime — Scheduler Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowScheduler } from '../../../core/workflow/scheduler.js';
import type { StageDefinition } from '../../../core/workflow/types.js';
import { brandStageId } from '../../../core/workflow/types.js';
import { StageType } from '../../../core/workflow/types.js';

function makeStage(id: string, type: StageType = StageType.Sequential, deps: string[] = []): StageDefinition {
  return Object.freeze({
    id: id as any,
    name: `Stage-${id}`,
    description: '',
    type,
    handler: 'handler',
    inputMapping: Object.freeze({}),
    outputMapping: Object.freeze({}),
    timeoutMs: 30000,
    retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
    compensation: Object.freeze({ action: 'Undo' as any, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
    conditions: [],
    metadata: Object.freeze({}),
    dependencies: deps as any,
  });
}

describe('WorkflowScheduler', () => {
  let scheduler: WorkflowScheduler;
  const stageA = brandStageId('a');
  const stageB = brandStageId('b');
  const stageC = brandStageId('c');
  const stageD = brandStageId('d');

  beforeEach(() => {
    scheduler = new WorkflowScheduler();
  });

  describe('schedule', () => {
    it('should schedule a single stage', () => {
      const stages = [makeStage(stageA)];
      const plans = scheduler.schedule(stages);
      expect(plans).toHaveLength(1);
      expect(plans[0].stageId).toBe(stageA);
      expect(plans[0].group).toBe(0);
    });

    it('should schedule independent stages in same group', () => {
      const stages = [makeStage(stageA), makeStage(stageB)];
      const plans = scheduler.schedule(stages);
      expect(plans).toHaveLength(2);
      expect(plans[0].group).toBe(plans[1].group);
    });

    it('should schedule dependent stages in sequential groups', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
      ];
      const plans = scheduler.schedule(stages);
      expect(plans).toHaveLength(2);
      expect(plans[0].group).toBe(0);
      expect(plans[1].group).toBe(1);
      expect(plans[1].dependencies).toContain(stageA);
    });

    it('should handle diamond dependency', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
        makeStage(stageC, StageType.Sequential, [stageA]),
        makeStage(stageD, StageType.Sequential, [stageB, stageC]),
      ];
      const plans = scheduler.schedule(stages);
      expect(plans).toHaveLength(4);

      const planA = plans.find(p => p.stageId === stageA)!;
      const planB = plans.find(p => p.stageId === stageB)!;
      const planC = plans.find(p => p.stageId === stageC)!;
      const planD = plans.find(p => p.stageId === stageD)!;

      expect(planA.group).toBe(0);
      expect(planB.group).toBe(1);
      expect(planC.group).toBe(1);
      expect(planD.group).toBe(2);
    });

    it('should handle chain of dependencies', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
        makeStage(stageC, StageType.Sequential, [stageB]),
        makeStage(stageD, StageType.Sequential, [stageC]),
      ];
      const plans = scheduler.schedule(stages);
      for (let i = 0; i < plans.length; i++) {
        expect(plans[i].group).toBe(i);
      }
    });

    it('should preserve order within group', () => {
      const stages = [makeStage(stageA), makeStage(stageB), makeStage(stageC)];
      const plans = scheduler.schedule(stages);
      expect(plans[0].order).toBeLessThan(plans[1].order);
      expect(plans[1].order).toBeLessThan(plans[2].order);
    });

    it('should resolve stage type to execution mode', () => {
      const stages = [makeStage(stageA, StageType.Parallel)];
      const plans = scheduler.schedule(stages);
      expect(plans[0].mode).toBe('Parallel');
    });

    it('should resolve sequential type', () => {
      const stages = [makeStage(stageA, StageType.Sequential)];
      const plans = scheduler.schedule(stages);
      expect(plans[0].mode).toBe('Sequential');
    });

    it('should resolve conditional type', () => {
      const stages = [makeStage(stageA, StageType.Conditional)];
      const plans = scheduler.schedule(stages);
      expect(plans[0].mode).toBe('Conditional');
    });

    it('should resolve delayed type', () => {
      const stages = [makeStage(stageA, StageType.Delayed)];
      const plans = scheduler.schedule(stages);
      expect(plans[0].mode).toBe('Delayed');
    });

    it('should resolve event-driven type', () => {
      const stages = [makeStage(stageA, StageType.EventDriven)];
      const plans = scheduler.schedule(stages);
      expect(plans[0].mode).toBe('EventDriven');
    });

    it('should include delayMs from stage', () => {
      const stage = Object.freeze({
        ...makeStage(stageA, StageType.Delayed),
        delayMs: 5000,
      });
      const plans = scheduler.schedule([stage]);
      expect(plans[0].delayMs).toBe(5000);
    });

    it('should include eventType from stage', () => {
      const stage = Object.freeze({
        ...makeStage(stageA, StageType.EventDriven),
        eventType: 'custom.event',
      });
      const plans = scheduler.schedule([stage]);
      expect(plans[0].eventType).toBe('custom.event');
    });
  });

  describe('getParallelGroup', () => {
    it('should return plans for a specific group', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
      ];
      const plans = scheduler.schedule(stages);
      const group0 = scheduler.getParallelGroup(plans, 0);
      expect(group0).toHaveLength(1);
      expect(group0[0].stageId).toBe(stageA);
    });

    it('should return empty for non-existent group', () => {
      const plans = scheduler.schedule([makeStage(stageA)]);
      expect(scheduler.getParallelGroup(plans, 99)).toHaveLength(0);
    });
  });

  describe('getNextStages', () => {
    it('should return stages whose dependencies are met', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
        makeStage(stageC, StageType.Sequential, [stageA]),
      ];
      const plans = scheduler.schedule(stages);
      const next = scheduler.getNextStages(plans, new Set([stageA]));
      const ids = next.map(p => p.stageId);
      expect(ids).toContain(stageB);
      expect(ids).toContain(stageC);
      expect(ids).not.toContain(stageA);
    });

    it('should return empty when no stages have dependencies met', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
      ];
      const plans = scheduler.schedule(stages);
      expect(scheduler.getNextStages(plans, new Set())).toHaveLength(1);
      expect(scheduler.getNextStages(plans, new Set()).at(0)?.stageId).toBe(stageA);
    });
  });

  describe('isStageReady', () => {
    it('should return true when no dependencies', () => {
      const stages = [makeStage(stageA)];
      const plans = scheduler.schedule(stages);
      expect(scheduler.isStageReady(plans[0], new Set(), new Set())).toBe(true);
    });

    it('should return true when all dependencies completed', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
      ];
      const plans = scheduler.schedule(stages);
      expect(scheduler.isStageReady(plans[1], new Set([stageA]), new Set())).toBe(true);
    });

    it('should return false when dependencies not met', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
      ];
      const plans = scheduler.schedule(stages);
      expect(scheduler.isStageReady(plans[1], new Set(), new Set())).toBe(false);
    });

    it('should return false for already completed stages', () => {
      const stages = [makeStage(stageA)];
      const plans = scheduler.schedule(stages);
      expect(scheduler.isStageReady(plans[0], new Set([stageA]), new Set())).toBe(false);
    });

    it('should return false for skipped stages', () => {
      const stages = [makeStage(stageA)];
      const plans = scheduler.schedule(stages);
      expect(scheduler.isStageReady(plans[0], new Set(), new Set([stageA]))).toBe(false);
    });

    it('should accept skipped dependencies', () => {
      const stages = [
        makeStage(stageA),
        makeStage(stageB, StageType.Sequential, [stageA]),
      ];
      const plans = scheduler.schedule(stages);
      expect(scheduler.isStageReady(plans[1], new Set(), new Set([stageA]))).toBe(true);
    });
  });
});
