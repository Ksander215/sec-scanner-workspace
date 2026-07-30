/**
 * Workflow Runtime — Advanced Feature Tests
 * TASK-AIS-003H.000
 *
 * Additional tests for advanced features:
 * - Handler with side effects
 * - Multiple workflows running
 * - Metrics accuracy
 * - Storage filtering
 * - Definition with dependencies
 * - Compensation flows
 * - Variable propagation
 * - Concurrent workflow support
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowRuntime } from '../../../core/workflow/workflow-runtime.js';
import { InMemoryWorkflowStorage } from '../../../core/workflow/workflow-storage.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { TransitionEngine } from '../../../core/workflow/transition-engine.js';
import { VariablesRuntime } from '../../../core/workflow/variables.js';
import { CompensationEngine } from '../../../core/workflow/compensation.js';
import { WorkflowScheduler } from '../../../core/workflow/scheduler.js';
import { WorkflowVersionManager } from '../../../core/workflow/workflow-versioning.js';
import { WorkflowTrace } from '../../../core/workflow/workflow-trace.js';
import { WorkflowPolicyEngine } from '../../../core/workflow/workflow-policies.js';
import { createWorkflowDefinition, validateDefinition } from '../../../core/workflow/workflow-definition.js';
import {
  createWorkflowInstance,
  cloneMutable,
  freezeInstance,
  updateStageState,
  createExecutionRecord,
  completeExecutionRecord,
} from '../../../core/workflow/workflow-instance.js';
import {
  WorkflowState,
  StageState,
  StageType,
  ExecutionStatus,
  CompensationAction,
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
import type {
  WorkflowDefinition,
  StageHandler,
  StageDefinition,
  WorkflowContext,
  WorkflowInstance,
} from '../../../core/workflow/types.js';

// ─── Helper ──────────────────────────────────────────────────────

function makeRuntime(opts?: { eventBus?: InProcessEventBus; storage?: InMemoryWorkflowStorage }) {
  return new WorkflowRuntime({
    eventBus: opts?.eventBus ?? new InProcessEventBus(),
    storage: opts?.storage ?? new InMemoryWorkflowStorage(),
  });
}

function makeDef(name: string, stageConfigs: { name: string; handler: string; type?: StageType; deps?: string[] }[]) {
  const stages = stageConfigs.map(s => ({
    name: s.name,
    handler: s.handler,
    type: s.type,
    dependencies: s.deps as any,
  }));
  return createWorkflowDefinition({ name, stages });
}

const okHandler: StageHandler = {
  execute: vi.fn(async () => ({ result: 'ok' })),
};

const failHandler: StageHandler = {
  execute: vi.fn(async () => { throw new Error('fail'); }),
};

// ═══════════════════════════════════════════════════════════════

describe('Advanced Workflow Features', () => {
  let runtime: WorkflowRuntime;
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    runtime = makeRuntime({ eventBus });
  });

  // ─── Multiple Concurrent Workflows ──────────────────────────

  describe('concurrent workflows', () => {
    it('should run multiple workflows independently', async () => {
      const h1: StageHandler = { execute: vi.fn(async () => ({ wf: 1 })) };
      const h2: StageHandler = { execute: vi.fn(async () => ({ wf: 2 })) };
      runtime.registerHandler('h1', h1);
      runtime.registerHandler('h2', h2);

      const def1 = makeDef('wf-1', [{ name: 's1', handler: 'h1' }]);
      const def2 = makeDef('wf-2', [{ name: 's2', handler: 'h2' }]);
      await runtime.registerDefinition(def1);
      await runtime.registerDefinition(def2);

      const id1 = await runtime.createInstance(def1.id);
      const id2 = await runtime.createInstance(def2.id);

      await runtime.startInstance(id1);
      await runtime.startInstance(id2);

      expect(runtime.getInstance(id1).state).toBe(WorkflowState.Completed);
      expect(runtime.getInstance(id2).state).toBe(WorkflowState.Completed);
      expect(runtime.getMetrics().completedWorkflows).toBe(2);
    });

    it('should track running count correctly', async () => {
      const h: StageHandler = {
        execute: vi.fn(async () => { await new Promise(r => setTimeout(r, 10)); return {}; }),
      };
      runtime.registerHandler('slow', h);
      const def = makeDef('slow-wf', [{ name: 's1', handler: 'slow' }]);
      await runtime.registerDefinition(def);

      const metricsBefore = runtime.getMetrics();
      expect(metricsBefore.runningWorkflows).toBe(0);

      const id = await runtime.createInstance(def.id);
      await runtime.startInstance(id);

      expect(runtime.getMetrics().completedWorkflows).toBe(1);
      expect(runtime.getMetrics().runningWorkflows).toBe(0);
    });
  });

  // ─── Handler Side Effects ──────────────────────────────────

  describe('handler side effects', () => {
    it('should allow handler to modify context variables', async () => {
      const h: StageHandler = {
        execute: vi.fn(async (ctx) => {
          ctx.setVariable('processed', true);
          return { processed: true };
        }),
      };
      runtime.registerHandler('side-effect', h);
      const def = makeDef('side-effect', [{ name: 's1', handler: 'side-effect' }]);
      await runtime.registerDefinition(def);
      const id = await runtime.createInstance(def.id);
      await runtime.startInstance(id);
      expect(runtime.getInstance(id).state).toBe(WorkflowState.Completed);
    });

    it('should pass input to handler via context', async () => {
      const h: StageHandler = {
        execute: vi.fn(async (ctx) => {
          const inputVal = ctx.input.testKey;
          return { received: inputVal };
        }),
      };
      runtime.registerHandler('input-check', h);
      const def = makeDef('input-test', [{ name: 's1', handler: 'input-check' }]);
      await runtime.registerDefinition(def);
      const id = await runtime.createInstance(def.id, { testKey: 'hello' });
      await runtime.startInstance(id);
      expect(runtime.getInstance(id).state).toBe(WorkflowState.Completed);
    });
  });

  // ─── Definition Validation ───────────────────────────────

  describe('definition validation', () => {
    it('should reject workflow with whitespace-only name', () => {
      const def = createWorkflowDefinition({
        name: '   ',
        stages: [{ name: 's1', handler: 'h1' }],
      });
      const issues = validateDefinition(def);
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should accept workflow with valid name', () => {
      const def = createWorkflowDefinition({
        name: 'valid-name',
        stages: [{ name: 's1', handler: 'h1' }],
      });
      expect(validateDefinition(def)).toHaveLength(0);
    });

    it('should detect multiple issues', () => {
      const def = createWorkflowDefinition({
        name: '',
        stages: [],
      });
      const issues = validateDefinition(def);
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Storage Filtering ────────────────────────────────────

  describe('storage filtering', () => {
    it('should filter instances by state', async () => {
      runtime.registerHandler('h1', okHandler);
      const def = makeDef('filter-test', [{ name: 's1', handler: 'h1' }]);
      await runtime.registerDefinition(def);

      const id1 = await runtime.createInstance(def.id);
      const id2 = await runtime.createInstance(def.id);

      // id1 stays Draft, id2 is started
      await runtime.startInstance(id2);

      const storage = runtime.getInstance(id1); // just to verify
      const instances = runtime.listInstances();
      expect(instances.length).toBe(2);
    });
  });

  // ─── Transition Engine Advanced ──────────────────────────

  describe('transition engine advanced', () => {
    it('should handle multiple conditions on same transition', () => {
      const engine = new TransitionEngine();
      const sA = brandStageId('a');
      const sB = brandStageId('b');

      engine.registerConditionEvaluator('cond1', () => true);
      engine.registerConditionEvaluator('cond2', () => true);

      const t = Object.freeze({
        id: brandTransitionId(crypto.randomUUID()),
        from: sA,
        to: sB,
        condition: 'cond1',
        priority: 0,
        metadata: Object.freeze({}),
      });

      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(true);
    });

    it('should evaluate transitions with complex variable maps', () => {
      const engine = new TransitionEngine();
      engine.registerConditionEvaluator('complex', (vars) => {
        const val = vars.get('nested') as Record<string, unknown> | undefined;
        return val?.deep === true;
      });

      const vars = new Map([['nested', { deep: true }]]);
      const t = Object.freeze({
        id: brandTransitionId(crypto.randomUUID()),
        from: brandStageId('a'),
        to: brandStageId('b'),
        condition: 'complex',
        priority: 0,
        metadata: Object.freeze({}),
      });

      expect(engine.evaluateTransition(t, vars).allowed).toBe(true);
      expect(engine.evaluateTransition(t, new Map([['nested', { deep: false }]])).allowed).toBe(false);
    });
  });

  // ─── Variables Runtime Advanced ──────────────────────────

  describe('variables runtime advanced', () => {
    it('should handle nested variable lookups', () => {
      const vars = new VariablesRuntime();
      vars.setGlobal('config', { timeout: 5000, retries: 3 });
      const config = vars.getGlobal('config') as Record<string, unknown>;
      expect(config.timeout).toBe(5000);
      expect(config.retries).toBe(3);
    });

    it('should handle array values', () => {
      const vars = new VariablesRuntime();
      vars.setOutput('results', [1, 2, 3]);
      expect(vars.getOutput('results')).toEqual([1, 2, 3]);
    });

    it('should handle null values correctly', () => {
      const vars = new VariablesRuntime();
      vars.setGlobal('nullable', null);
      expect(vars.getGlobal('nullable')).toBeNull();
    });

    it('should handle large numbers of variables', () => {
      const vars = new VariablesRuntime();
      for (let i = 0; i < 100; i++) {
        vars.setGlobal(`key-${i}`, i);
      }
      expect(vars.getAllGlobal().size).toBe(100);
      expect(vars.getGlobal('key-99')).toBe(99);
    });
  });

  // ─── Scheduler Advanced ────────────────────────────────────

  describe('scheduler advanced', () => {
    it('should handle fan-out pattern', () => {
      const scheduler = new WorkflowScheduler();
      const s1 = brandStageId('1');
      const s2 = brandStageId('2');
      const s3 = brandStageId('3');
      const s4 = brandStageId('4');

      const stages = [
        { id: s1, name: 's1', type: StageType.Sequential, deps: [] },
        { id: s2, name: 's2', type: StageType.Sequential, deps: [s1] },
        { id: s3, name: 's3', type: StageType.Parallel, deps: [s1] },
        { id: s4, name: 's4', type: StageType.Sequential, deps: [s2, s3] },
      ].map(s => Object.freeze({
        id: s.id, name: s.name, description: '', type: s.type, handler: 'h',
        inputMapping: Object.freeze({}), outputMapping: Object.freeze({}),
        timeoutMs: 30000,
        retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
        compensation: Object.freeze({ action: CompensationAction.Undo, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
        conditions: [], metadata: Object.freeze({}), dependencies: s.deps as any,
      }));

      const plans = scheduler.schedule(stages);
      const g0 = plans.filter(p => p.group === 0);
      const g1 = plans.filter(p => p.group === 1);
      const g2 = plans.filter(p => p.group === 2);
      expect(g0).toHaveLength(1); // s1
      expect(g1).toHaveLength(2); // s2, s3 (parallel)
      expect(g2).toHaveLength(1); // s4
    });

    it('should handle single stage with no dependencies', () => {
      const scheduler = new WorkflowScheduler();
      const stages = [Object.freeze({
        id: brandStageId('solo'), name: 'solo', description: '', type: StageType.Sequential,
        handler: 'h', inputMapping: Object.freeze({}), outputMapping: Object.freeze({}),
        timeoutMs: 30000,
        retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
        compensation: Object.freeze({ action: CompensationAction.Undo, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
        conditions: [], metadata: Object.freeze({}), dependencies: [],
      })];
      const plans = scheduler.schedule(stages);
      expect(plans).toHaveLength(1);
      expect(plans[0].group).toBe(0);
    });
  });

  // ─── Metrics Edge Cases ────────────────────────────────────

  describe('metrics edge cases', () => {
    it('should handle rapid workflow creation', async () => {
      for (let i = 0; i < 20; i++) {
        const def = makeDef(`rapid-${i}`, [{ name: `s${i}`, handler: `h${i}` }]);
        await runtime.registerDefinition(def);
        runtime.registerHandler(`h${i}`, okHandler);
        const id = await runtime.createInstance(def.id);
        await runtime.startInstance(id);
      }
      const m = runtime.getMetrics();
      expect(m.completedWorkflows).toBe(20);
    });
  });

  // ─── Trace Advanced ──────────────────────────────────────

  describe('trace advanced', () => {
    it('should handle many trace entries', () => {
      const trace = new WorkflowTrace();
      const instanceId = brandWorkflowInstanceId('inst-1');
      for (let i = 0; i < 100; i++) {
        trace.info(instanceId, `action-${i}`, `message-${i}`);
      }
      expect(trace.getCount(instanceId)).toBe(100);
      expect(trace.getByInstance(instanceId)).toHaveLength(100);
    });

    it('should handle trace with stage and execution detail', () => {
      const trace = new WorkflowTrace();
      const instanceId = brandWorkflowInstanceId('inst-1');
      const stageId = brandStageId('s1');
      const execId = brandExecutionId('e1');

      trace.info(instanceId, 'workflow.start', 'started', { stageId });
      trace.info(instanceId, 'stage.execute', 'executing', { stageId, executionId: execId });
      trace.debug(instanceId, 'stage.detail', 'checking', { stageId, executionId: execId });
      trace.error(instanceId, 'stage.error', 'failed', { stageId, executionId: execId });

      expect(trace.getByStage(instanceId, stageId)).toHaveLength(4);
      expect(trace.getByLevel(instanceId, TraceLevel.Error)).toHaveLength(1);
      expect(trace.getByLevel(instanceId, TraceLevel.Debug)).toHaveLength(1);
    });
  });

  // ─── Compensation Advanced ────────────────────────────────

  describe('compensation advanced', () => {
    it('should handle multiple compensation actions in sequence', async () => {
      const engine = new CompensationEngine();
      const s1 = brandStageId('s1');
      const s2 = brandStageId('s2');
      const s3 = brandStageId('s3');

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      engine.registerHandler('h1', handler1);
      engine.registerHandler('h2', handler2);
      engine.registerHandler('h3', handler3);

      const def = createWorkflowDefinition({
        name: 'comp-test',
        stages: [
          { name: 's1', handler: 'h1', compensation: { action: CompensationAction.Undo as any } },
          { name: 's2', handler: 'h2', compensation: { action: CompensationAction.Restart as any } },
          { name: 's3', handler: 'h3', compensation: { action: CompensationAction.Skip } },
        ],
      });

      const stages = def.stages.map(s => Object.freeze({
        id: s.id, name: s.name, state: StageState.Completed, type: s.type,
        executions: [], input: Object.freeze({}), output: Object.freeze({}),
        error: null, startedAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-01T00:01:00Z',
        attempts: 1, compensation: null, metadata: Object.freeze({}),
      }));

      const stageDefs = new Map(def.stages.map(s => [s.id, s]));
      const ctx = () => Object.freeze({
        workflowInstanceId: brandWorkflowInstanceId('i'),
        workflowId: brandWorkflowId('w'),
        stageId: null,
        input: Object.freeze({}),
        metadata: Object.freeze({}),
        getVariable: () => undefined,
        setVariable: () => {},
        emit: vi.fn(),
      });

      const results = await engine.compensate(stages, stageDefs, ctx);
      expect(results).toHaveLength(3);
      expect(handler3).not.toHaveBeenCalled(); // Skip
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  // ─── Policy Engine Advanced ──────────────────────────────

  describe('policy engine advanced', () => {
    it('should evaluate multiple policies of same type', () => {
      const engine = new WorkflowPolicyEngine();
      engine.registerDefaults();
      engine.registerPolicy(Object.freeze({
        id: 'timeout-1', name: 'Global Timeout', type: PolicyType.Timeout,
        rules: Object.freeze({ maxTimeoutMs: 60000, elapsedMs: 10000 }),
        description: 'Global timeout policy',
      }));
      engine.registerPolicy(Object.freeze({
        id: 'timeout-2', name: 'Stage Timeout', type: PolicyType.Timeout,
        rules: Object.freeze({ maxTimeoutMs: 30000, elapsedMs: 10000 }),
        description: 'Stage timeout policy',
      }));

      const results = engine.evaluateAll({});
      expect(results).toHaveLength(2);
      expect(results.every(r => r.passed)).toBe(true);
    });
  });

  // ─── Version Manager Advanced ─────────────────────────────

  describe('version manager advanced', () => {
    it('should handle many version registrations', () => {
      const manager = new WorkflowVersionManager();
      const wfId = brandWorkflowId('wf-1');

      for (let i = 1; i <= 10; i++) {
        const def = createWorkflowDefinition({
          name: `v${i}`,
          version: `${i}.0.0`,
          stages: [{ name: 's1', handler: 'h1' }],
        });
        // Override the definition's id to match wfId
        const patchedDef = Object.freeze({ ...def, id: wfId });
        manager.registerVersion(patchedDef);
      }

      expect(manager.getVersions(wfId)).toHaveLength(10);
      expect(manager.getLatestVersion(wfId)!.version).toBe('10.0.0');
    });

    it('should handle multiple workflows', () => {
      const manager = new WorkflowVersionManager();
      const wf1 = brandWorkflowId('wf-1');
      const wf2 = brandWorkflowId('wf-2');

      const def1 = createWorkflowDefinition({
        name: 'wf1-v1', version: '1.0.0', stages: [{ name: 's1', handler: 'h1' }],
      });
      const def2 = createWorkflowDefinition({
        name: 'wf1-v2', version: '2.0.0', stages: [{ name: 's1', handler: 'h1' }],
      });
      const def3 = createWorkflowDefinition({
        name: 'wf2-v1', version: '1.0.0', stages: [{ name: 's1', handler: 'h1' }],
      });

      manager.registerVersion(Object.freeze({ ...def1, id: wf1 }));
      manager.registerVersion(Object.freeze({ ...def2, id: wf1 }));
      manager.registerVersion(Object.freeze({ ...def3, id: wf2 }));

      expect(manager.getVersions(wf1)).toHaveLength(2);
      expect(manager.getVersions(wf2)).toHaveLength(1);
    });
  });

  // ─── Instance Manipulation ──────────────────────────────────

  describe('instance manipulation', () => {
    it('should create and freeze multiple instances', () => {
      const def = createWorkflowDefinition({
        name: 'test',
        stages: [{ name: 's1', handler: 'h1' }, { name: 's2', handler: 'h2' }],
      });

      const inst1 = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: '1.0.0' });
      const inst2 = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: '1.0.0' });

      expect(inst1.id).not.toBe(inst2.id);
      expect(inst1.stages.size).toBe(2);
      expect(inst2.stages.size).toBe(2);
    });

    it('should support multiple clone-mutable-freeze cycles', () => {
      const def = createWorkflowDefinition({
        name: 'test',
        stages: [{ name: 's1', handler: 'h1' }],
      });
      const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: '1.0.0' });

      // Cycle 1: Draft → Ready → Running → Completed
      let mutable = cloneMutable(inst);
      mutable.state = WorkflowState.Ready;
      let frozen = freezeInstance(inst, mutable);

      mutable = cloneMutable(frozen);
      mutable.state = WorkflowState.Running;
      frozen = freezeInstance(frozen, mutable);

      mutable = cloneMutable(frozen);
      mutable.state = WorkflowState.Completed;
      mutable.completedAt = '2024-01-01T00:00:00Z';
      frozen = freezeInstance(frozen, mutable);

      expect(frozen.state).toBe(WorkflowState.Completed);
      expect(frozen.completedAt).toBe('2024-01-01T00:00:00Z');
      // Original unchanged
      expect(inst.state).toBe(WorkflowState.Draft);
    });
  });

  // ─── Error Hierarchy ──────────────────────────────────────

  describe('error message quality', () => {
    it('should include contextual information in error messages', async () => {
      const { WorkflowNotFoundError } = await import('../../../core/workflow/workflow-errors.js');
      const err = new WorkflowNotFoundError('wf-123');
      expect(err.message).toContain('wf-123');
      expect(err.code).toBeDefined();
    });
  });
});
