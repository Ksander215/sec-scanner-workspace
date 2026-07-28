import { describe, it, expect } from 'vitest';
import { DeterministicPlanner, type PlanTemplate } from '../core/pipeline/planner/deterministic-planner.js';
import { makeStepId } from '../core/pipeline/planner/planner.js';
import type { Goal, Plan } from '../core/pipeline/types.js';
import { AutonomyLevel } from '../core/types/common.js';
import { PlanningError } from '../core/pipeline/errors.js';

function createGoal(description: string, input: Record<string, unknown> = {}): Goal {
  return {
    id: crypto.randomUUID() as unknown as Goal['id'],
    description,
    input,
    createdAt: new Date().toISOString(),
    autonomyLevel: AutonomyLevel.Suggest,
  };
}

describe('makeStepId', () => {
  it('produces deterministic step IDs with seed', () => {
    const id = makeStepId(1);
    expect(id).toMatch(/^step-001-/);
  });
});

describe('DeterministicPlanner', () => {
  const echoTemplate: PlanTemplate = {
    templateId: 'echo-plan',
    match: (goal) => goal.description.includes('echo'),
    build: (goal) => [
      {
        id: makeStepId(1),
        name: 'echo-step',
        taskType: 'echo',
        input: goal.input,
        description: 'Echo the input',
      },
    ],
  };

  const multiStepTemplate: PlanTemplate = {
    templateId: 'multi-step',
    match: (goal) => goal.description.includes('multi'),
    build: (goal) => {
      const step1Id = makeStepId(1);
      const step2Id = makeStepId(2);
      return [
        {
          id: step1Id,
          name: 'step-1',
          taskType: 'echo',
          input: { value: 'first' },
        },
        {
          id: step2Id,
          name: 'step-2',
          taskType: 'identity',
          input: { value: 'second' },
          dependsOn: [step1Id],
        },
      ];
    },
  };

  it('creates with empty templates', () => {
    const planner = new DeterministicPlanner();
    expect(planner.plannerId).toBe('deterministic-planner-v1');
  });

  it('matches and builds from a registered template', async () => {
    const planner = new DeterministicPlanner([echoTemplate]);
    const goal = createGoal('echo test');
    const plan = await planner.buildPlan(goal);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].taskType).toBe('echo');
    expect(plan.goalId).toBe(goal.id);
    expect(plan.plannerId).toBe('deterministic-planner-v1');
    expect(plan.version).toBe('1.0.0');
  });

  it('throws when no template matches and no fallback', async () => {
    const planner = new DeterministicPlanner();
    const goal = createGoal('unknown task');
    await expect(planner.buildPlan(goal)).rejects.toThrow(PlanningError);
  });

  it('uses fallback when no template matches', async () => {
    const fallback: PlanTemplate = {
      templateId: 'fallback',
      match: () => true,
      build: (goal) => [
        {
          id: makeStepId(1),
          name: 'noop',
          taskType: 'echo',
          input: goal.input,
        },
      ],
    };
    const planner = new DeterministicPlanner([], fallback);
    const goal = createGoal('anything');
    const plan = await planner.buildPlan(goal);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].name).toBe('noop');
  });

  it('throws when template produces 0 steps', async () => {
    const emptyTemplate: PlanTemplate = {
      templateId: 'empty',
      match: () => true,
      build: () => [],
    };
    const planner = new DeterministicPlanner([emptyTemplate]);
    const goal = createGoal('empty test');
    await expect(planner.buildPlan(goal)).rejects.toThrow('produced 0 steps');
  });

  it('throws for goal without description', async () => {
    const planner = new DeterministicPlanner([echoTemplate]);
    const goal = createGoal('');
    await expect(planner.buildPlan(goal)).rejects.toThrow('must have a description');
  });

  it('builds multi-step plan with dependencies', async () => {
    const planner = new DeterministicPlanner([multiStepTemplate]);
    const goal = createGoal('multi step plan');
    const plan = await planner.buildPlan(goal);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[1].dependsOn).toHaveLength(1);
  });

  it('detects duplicate step IDs', async () => {
    const badTemplate: PlanTemplate = {
      templateId: 'dup',
      match: () => true,
      build: () => {
        const id = makeStepId(1);
        return [
          { id, name: 'a', taskType: 'echo', input: {} },
          { id, name: 'b', taskType: 'echo', input: {} },
        ];
      },
    };
    const planner = new DeterministicPlanner([badTemplate]);
    await expect(planner.buildPlan(createGoal('dup test'))).rejects.toThrow('Duplicate step id');
  });

  it('detects missing dependency', async () => {
    const badTemplate: PlanTemplate = {
      templateId: 'missing-dep',
      match: () => true,
      build: () => [
        { id: makeStepId(1), name: 'a', taskType: 'echo', input: {}, dependsOn: ['nonexistent' as any] },
      ],
    };
    const planner = new DeterministicPlanner([badTemplate]);
    await expect(planner.buildPlan(createGoal('missing dep test'))).rejects.toThrow('unknown step');
  });

  it('registerTemplate adds template at runtime', async () => {
    const planner = new DeterministicPlanner();
    planner.registerTemplate(echoTemplate);
    const goal = createGoal('echo dynamic');
    const plan = await planner.buildPlan(goal);
    expect(plan.steps).toHaveLength(1);
  });

  it('plan has a unique ID', async () => {
    const planner = new DeterministicPlanner([echoTemplate]);
    const plan1 = await planner.buildPlan(createGoal('echo a'));
    const plan2 = await planner.buildPlan(createGoal('echo b'));
    expect(plan1.id).not.toBe(plan2.id);
  });

  it('plan has createdAt timestamp', async () => {
    const planner = new DeterministicPlanner([echoTemplate]);
    const plan = await planner.buildPlan(createGoal('echo ts'));
    expect(new Date(plan.createdAt).getTime()).not.toBeNaN();
  });
});
