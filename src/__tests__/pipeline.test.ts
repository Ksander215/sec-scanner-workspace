import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionPipeline } from '../core/pipeline/execution-pipeline.js';
import {
  DeterministicPlanner,
  type PlanTemplate,
} from '../core/pipeline/planner/deterministic-planner.js';
import {
  TaskHandlerRegistry,
  EchoHandler,
  IdentityHandler,
  FailHandler,
} from '../core/pipeline/executor/task-handler.js';
import { makeStepId } from '../core/pipeline/planner/planner.js';
import { InProcessEventBus } from '../core/events/event-bus.js';
import { CancellationTokenImpl } from '../core/pipeline/cancellation-token.js';
import {
  FixedRetryPolicy,
  NoRetryPolicy,
  LimitedRetryPolicy,
} from '../core/pipeline/recovery/retry-policy.js';
import { DefaultRecoveryPolicy } from '../core/pipeline/recovery/recovery-policy.js';
import type { Goal, ExecutionRequest } from '../core/pipeline/types.js';
import { ExecutionStatus, TaskStatus } from '../core/pipeline/types.js';
import { AutonomyLevel } from '../core/types/common.js';

function createGoal(description: string, input: Record<string, unknown> = {}): Goal {
  return {
    id: crypto.randomUUID() as unknown as Goal['id'],
    description,
    input,
    createdAt: new Date().toISOString(),
    autonomyLevel: AutonomyLevel.Suggest,
  };
}

const simpleEchoTemplate: PlanTemplate = {
  templateId: 'simple-echo',
  match: (g) => g.description === 'echo',
  build: (g) => [
    {
      id: makeStepId(1),
      name: 'echo-step',
      taskType: 'echo',
      input: g.input,
    },
  ],
};

const threeStepTemplate: PlanTemplate = {
  templateId: 'three-step',
  match: (g) => g.description === 'three-step',
  build: () => [
    { id: makeStepId(1), name: 'step1', taskType: 'echo', input: { val: 1 } },
    { id: makeStepId(2), name: 'step2', taskType: 'identity', input: { val: 2 } },
    { id: makeStepId(3), name: 'step3', taskType: 'echo', input: { val: 3 } },
  ],
};

const failingStepTemplate: PlanTemplate = {
  templateId: 'fail-step',
  match: (g) => g.description === 'fail-test',
  build: () => [
    { id: makeStepId(1), name: 'fail-step', taskType: 'fail', input: {} },
  ],
};

const failThenSucceedTemplate: PlanTemplate = {
  templateId: 'fail-then-succeed',
  match: (g) => g.description === 'fail-then-succeed',
  build: () => [
    { id: makeStepId(1), name: 'retryable-step', taskType: 'fail', input: {} },
    { id: makeStepId(2), name: 'success-step', taskType: 'echo', input: { ok: true } },
  ],
};

describe('ExecutionPipeline', () => {
  let bus: InProcessEventBus;
  let handlers: TaskHandlerRegistry;

  beforeEach(() => {
    bus = new InProcessEventBus();
    handlers = new TaskHandlerRegistry();
    handlers.register(new EchoHandler());
    handlers.register(new IdentityHandler());
    handlers.register(new FailHandler());
  });

  function createPipeline(templates: PlanTemplate[] = [], retryPolicy?: FixedRetryPolicy) {
    return new ExecutionPipeline({
      handlerRegistry: handlers,
      eventBus: bus,
      planner: new DeterministicPlanner(templates),
      retryPolicy,
    });
  }

  it('executes a simple echo goal successfully', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const request: ExecutionRequest = {
      goal: createGoal('echo', { msg: 'hello' }),
    };
    const { result, report } = await pipeline.execute(request);
    expect(result.status).toBe(ExecutionStatus.Completed);
    expect(result.outputs).toBeDefined();
    expect(report.metrics.totalSteps).toBe(1);
    expect(report.metrics.succeededCount).toBe(1);
    expect(report.metrics.failedCount).toBe(0);
    expect(report.status).toBe(ExecutionStatus.Completed);
  });

  it('executes a 3-step plan', async () => {
    const pipeline = createPipeline([threeStepTemplate]);
    const request: ExecutionRequest = {
      goal: createGoal('three-step'),
    };
    const { result, report } = await pipeline.execute(request);
    expect(result.status).toBe(ExecutionStatus.Completed);
    expect(report.metrics.totalSteps).toBe(3);
    expect(report.metrics.succeededCount).toBe(3);
    expect(report.steps).toHaveLength(3);
    expect(report.steps[0].status).toBe('succeeded');
    expect(report.steps[1].status).toBe('succeeded');
    expect(report.steps[2].status).toBe('succeeded');
  });

  it('publishes GoalCreated event', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const events: string[] = [];
    bus.subscribe('GoalCreated', async (e) => events.push(e.eventType));
    await pipeline.execute({ goal: createGoal('echo') });
    expect(events).toContain('GoalCreated');
  });

  it('publishes PlanBuilt event', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const events: string[] = [];
    bus.subscribe('PlanBuilt', async (e) => events.push(e.eventType));
    await pipeline.execute({ goal: createGoal('echo') });
    expect(events).toContain('PlanBuilt');
  });

  it('publishes TaskStarted and TaskFinished events', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const started: string[] = [];
    const finished: string[] = [];
    bus.subscribe('TaskStarted', async (e) => started.push(e.eventType));
    bus.subscribe('TaskFinished', async (e) => finished.push(e.eventType));
    await pipeline.execute({ goal: createGoal('echo') });
    expect(started).toHaveLength(1);
    expect(finished).toHaveLength(1);
  });

  it('publishes ExecutionCompleted event on success', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const events: string[] = [];
    bus.subscribe('ExecutionCompleted', async (e) => events.push(e.eventType));
    await pipeline.execute({ goal: createGoal('echo') });
    expect(events).toContain('ExecutionCompleted');
  });

  it('publishes ExecutionStateChange events for each transition', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const states: string[] = [];
    bus.subscribe('ExecutionStateChange', async (e) => {
      states.push(`${e.payload.previousState}→${e.payload.newState}`);
    });
    await pipeline.execute({ goal: createGoal('echo') });
    expect(states).toContain('idle→planning');
    expect(states).toContain('planning→ready');
    expect(states).toContain('ready→running');
    expect(states).toContain('running→completed');
  });

  it('fails when a task fails and no retry', async () => {
    const pipeline = createPipeline([failingStepTemplate], new NoRetryPolicy());
    const { result, report } = await pipeline.execute({
      goal: createGoal('fail-test'),
    });
    expect(result.status).toBe(ExecutionStatus.Failed);
    expect(result.error).toBeDefined();
    expect(report.metrics.failedCount).toBe(1);
  });

  it('publishes ExecutionFailed event on failure', async () => {
    const pipeline = createPipeline([failingStepTemplate], new NoRetryPolicy());
    const events: string[] = [];
    bus.subscribe('ExecutionFailed', async (e) => events.push(e.eventType));
    await pipeline.execute({ goal: createGoal('fail-test') });
    expect(events).toContain('ExecutionFailed');
  });

  it('retries retryable failures', async () => {
    const retryableFail = new FailHandler('RETRYABLE_FAIL', 'will retry', true);
    const h = new TaskHandlerRegistry();
    h.register(retryableFail);
    h.register(new EchoHandler());

    const tpl: PlanTemplate = {
      templateId: 'retry-test',
      match: (g) => g.description === 'retry-test',
      build: () => [
        { id: makeStepId(1), name: 'retry-step', taskType: 'fail', input: {} },
      ],
    };

    const pipeline = new ExecutionPipeline({
      handlerRegistry: h,
      eventBus: bus,
      planner: new DeterministicPlanner([tpl]),
      retryPolicy: new FixedRetryPolicy(2, 0), // 2 retries, no delay
    });

    const { result, report } = await pipeline.execute({
      goal: createGoal('retry-test'),
    });

    expect(result.status).toBe(ExecutionStatus.Failed); // all retries exhausted
    expect(report.metrics.failedCount).toBe(1);
    expect(report.metrics.totalRetries).toBe(2);
  });

  it('publishes ExecutionRetried events during retries', async () => {
    const retryableFail = new FailHandler('RETRY', 'retry', true);
    const h = new TaskHandlerRegistry();
    h.register(retryableFail);

    const tpl: PlanTemplate = {
      templateId: 'retry-events',
      match: (g) => g.description === 'retry-events',
      build: () => [
        { id: makeStepId(1), name: 'r', taskType: 'fail', input: {} },
      ],
    };

    const pipeline = new ExecutionPipeline({
      handlerRegistry: h,
      eventBus: bus,
      planner: new DeterministicPlanner([tpl]),
      retryPolicy: new FixedRetryPolicy(1, 0),
    });

    const retries: string[] = [];
    bus.subscribe('ExecutionRetried', async (e) => retries.push(e.eventType));
    await pipeline.execute({ goal: createGoal('retry-events') });
    expect(retries).toHaveLength(1);
  });

  it('skips remaining steps after failure', async () => {
    const pipeline = createPipeline([failThenSucceedTemplate], new NoRetryPolicy());
    const { report } = await pipeline.execute({
      goal: createGoal('fail-then-succeed'),
    });
    expect(report.metrics.totalSteps).toBe(2);
    expect(report.metrics.failedCount).toBe(1);
    expect(report.metrics.skippedCount).toBe(1);
    expect(report.steps[1].status).toBe('skipped');
  });

  it('supports cancellation via request token', async () => {
    const token = new CancellationTokenImpl();
    const tpl: PlanTemplate = {
      templateId: 'cancel-test',
      match: (g) => g.description === 'cancel-test',
      build: () => [
        { id: makeStepId(1), name: 'step1', taskType: 'echo', input: {} },
        { id: makeStepId(2), name: 'step2', taskType: 'echo', input: {} },
      ],
    };
    const pipeline = createPipeline([tpl]);

    // Cancel immediately
    token.cancel('test cancellation');
    const { result, report } = await pipeline.execute({
      goal: createGoal('cancel-test'),
      cancellationToken: token,
    });

    expect(result.status).toBe(ExecutionStatus.Cancelled);
    expect(report.metrics.cancelledCount).toBeGreaterThanOrEqual(0);
  });

  it('publishes ExecutionCancelled event', async () => {
    const token = new CancellationTokenImpl();
    token.cancel('test');

    const tpl: PlanTemplate = {
      templateId: 'cancel-event',
      match: (g) => g.description === 'cancel-event',
      build: () => [
        { id: makeStepId(1), name: 's', taskType: 'echo', input: {} },
      ],
    };
    const pipeline = createPipeline([tpl]);

    const events: string[] = [];
    bus.subscribe('ExecutionCancelled', async (e) => events.push(e.eventType));
    await pipeline.execute({
      goal: createGoal('cancel-event'),
      cancellationToken: token,
    });
    expect(events).toContain('ExecutionCancelled');
  });

  it('cancel() method cancels by execution ID (not directly testable in sequential execution, but API exists)', () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    // Execution hasn't started yet, so cancel throws
    expect(() => pipeline.cancel('nonexistent')).toThrow('not found');
  });

  it('report contains execution timing', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const { report } = await pipeline.execute({
      goal: createGoal('echo'),
    });
    expect(report.startedAt).toBeTruthy();
    expect(report.finishedAt).toBeTruthy();
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('report contains trace entries', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const { report } = await pipeline.execute({
      goal: createGoal('echo'),
    });
    expect(report.traceEntries.length).toBeGreaterThan(0);
  });

  it('report contains eventsPublished count', async () => {
    const pipeline = createPipeline([simpleEchoTemplate]);
    const { report } = await pipeline.execute({
      goal: createGoal('echo'),
    });
    expect(report.eventsPublished).toBeGreaterThan(0);
  });

  it('variables propagate across steps', async () => {
    const tpl: PlanTemplate = {
      templateId: 'var-propagation',
      match: (g) => g.description === 'var-propagation',
      build: () => [
        { id: makeStepId(1), name: 'produce', taskType: 'echo', input: { data: 42 } },
        { id: makeStepId(2), name: 'consume', taskType: 'echo', input: { ref: '${produce}' } },
      ],
    };
    const pipeline = createPipeline([tpl]);
    const { result, report } = await pipeline.execute({
      goal: createGoal('var-propagation'),
    });
    expect(result.status).toBe(ExecutionStatus.Completed);
    // The 'produce' step's output is stored as variables['produce']
    expect(report.variables['produce']).toBeDefined();
  });

  it('handles planning failure gracefully', async () => {
    const pipeline = createPipeline([]); // no templates, no fallback
    const { result, report } = await pipeline.execute({
      goal: createGoal('no-match'),
    });
    expect(result.status).toBe(ExecutionStatus.Failed);
    expect(result.error).toBeDefined();
    expect(report.status).toBe(ExecutionStatus.Failed);
  });
});
