/**
 * Workflow Runtime — Workflow Definition Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorkflowDefinition, validateDefinition } from '../../../core/workflow/workflow-definition.js';
import type { WorkflowDefinition, StageDefinition } from '../../../core/workflow/types.js';
import { StageType } from '../../../core/workflow/types.js';

const baseConfig = {
  name: 'Test Workflow',
  stages: [
    { name: 'Step 1', handler: 'handler-1' },
    { name: 'Step 2', handler: 'handler-2' },
  ],
};

describe('createWorkflowDefinition', () => {
  it('creates a definition with correct name', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.name).toBe('Test Workflow');
  });

  it('generates a unique ID', () => {
    const def1 = createWorkflowDefinition(baseConfig);
    const def2 = createWorkflowDefinition(baseConfig);
    expect(def1.id).not.toBe(def2.id);
  });

  it('defaults description to empty string', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.description).toBe('');
  });

  it('uses provided description', () => {
    const def = createWorkflowDefinition({ ...baseConfig, description: 'A test workflow' });
    expect(def.description).toBe('A test workflow');
  });

  it('defaults version to 1.0.0', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.version).toBe('1.0.0');
  });

  it('uses provided version', () => {
    const def = createWorkflowDefinition({ ...baseConfig, version: '2.1.0' });
    expect(def.version).toBe('2.1.0');
  });

  it('creates stages with unique IDs', () => {
    const def = createWorkflowDefinition(baseConfig);
    const ids = def.stages.map(s => s.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('sets stage names from config', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.stages[0]!.name).toBe('Step 1');
    expect(def.stages[1]!.name).toBe('Step 2');
  });

  it('defaults stage type to Sequential', () => {
    const def = createWorkflowDefinition(baseConfig);
    for (const stage of def.stages) {
      expect(stage.type).toBe(StageType.Sequential);
    }
  });

  it('uses provided stage type', () => {
    const def = createWorkflowDefinition({
      ...baseConfig,
      stages: [{ name: 'S1', handler: 'h', type: StageType.Parallel }],
    });
    expect(def.stages[0]!.type).toBe(StageType.Parallel);
  });

  it('sets stage handler from config', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.stages[0]!.handler).toBe('handler-1');
  });

  it('defaults stage description to empty string', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.stages[0]!.description).toBe('');
  });

  it('defaults stage timeoutMs to 30000', () => {
    const def = createWorkflowDefinition(baseConfig);
    for (const stage of def.stages) {
      expect(stage.timeoutMs).toBe(30000);
    }
  });

  it('uses provided stage timeoutMs', () => {
    const def = createWorkflowDefinition({
      ...baseConfig,
      stages: [{ name: 'S1', handler: 'h', timeoutMs: 60000 }],
    });
    expect(def.stages[0]!.timeoutMs).toBe(60000);
  });

  it('defaults inputMapping to empty object', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.stages[0]!.inputMapping).toEqual({});
  });

  it('defaults outputMapping to empty object', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.stages[0]!.outputMapping).toEqual({});
  });

  it('uses provided inputMapping', () => {
    const def = createWorkflowDefinition({
      ...baseConfig,
      stages: [{ name: 'S1', handler: 'h', inputMapping: { key: 'value' } }],
    });
    expect(def.stages[0]!.inputMapping).toEqual({ key: 'value' });
  });

  it('sets default retry policy', () => {
    const def = createWorkflowDefinition(baseConfig);
    const rp = def.stages[0]!.retryPolicy;
    expect(rp.maxAttempts).toBe(3);
    expect(rp.delayMs).toBe(1000);
    expect(rp.backoffMultiplier).toBe(2);
    expect(rp.retryableErrors).toEqual([]);
  });

  it('merges provided retry policy with defaults', () => {
    const def = createWorkflowDefinition({
      ...baseConfig,
      stages: [{ name: 'S1', handler: 'h', retryPolicy: { maxAttempts: 5 } }],
    });
    const rp = def.stages[0]!.retryPolicy;
    expect(rp.maxAttempts).toBe(5);
    expect(rp.delayMs).toBe(1000);
    expect(rp.backoffMultiplier).toBe(2);
  });

  it('sets default compensation', () => {
    const def = createWorkflowDefinition(baseConfig);
    const comp = def.stages[0]!.compensation;
    expect(comp.action).toBe('Undo');
    expect(comp.timeoutMs).toBe(30000);
  });

  it('defaults metadata to empty object', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.metadata).toEqual({});
  });

  it('uses provided metadata', () => {
    const def = createWorkflowDefinition({
      ...baseConfig,
      metadata: { author: 'test' },
    });
    expect(def.metadata).toEqual({ author: 'test' });
  });

  it('sets createdAt and updatedAt', () => {
    const beforeMs = Date.now();
    const def = createWorkflowDefinition(baseConfig);
    const afterMs = Date.now();
    const createdMs = new Date(def.createdAt).getTime();
    expect(createdMs).toBeGreaterThanOrEqual(beforeMs);
    expect(createdMs).toBeLessThanOrEqual(afterMs);
    expect(def.createdAt).toBe(def.updatedAt);
  });

  it('creates with empty transitions array', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(def.transitions).toHaveLength(0);
  });

  it('creates transitions from config', () => {
    const def = createWorkflowDefinition(baseConfig);
    const fromId = def.stages[0]!.id;
    const toId = def.stages[1]!.id;
    const def2 = createWorkflowDefinition({
      ...baseConfig,
      transitions: [
        { from: fromId, to: toId, condition: 'cond1', guard: 'guard1', priority: 5 },
      ],
    });
    expect(def2.transitions).toHaveLength(1);
    expect(def2.transitions[0]!.from).toBe(fromId);
    expect(def2.transitions[0]!.to).toBe(toId);
    expect(def2.transitions[0]!.condition).toBe('cond1');
    expect(def2.transitions[0]!.guard).toBe('guard1');
    expect(def2.transitions[0]!.priority).toBe(5);
  });

  it('defaults transition priority to 0', () => {
    const def = createWorkflowDefinition(baseConfig);
    const fromId = def.stages[0]!.id;
    const toId = def.stages[1]!.id;
    const def2 = createWorkflowDefinition({
      ...baseConfig,
      transitions: [{ from: fromId, to: toId }],
    });
    expect(def2.transitions[0]!.priority).toBe(0);
  });

  it('sets stage dependencies to empty array', () => {
    const def = createWorkflowDefinition(baseConfig);
    for (const stage of def.stages) {
      expect(stage.dependencies).toHaveLength(0);
    }
  });

  it('sets stage dependencies from config', () => {
    const def = createWorkflowDefinition(baseConfig);
    const depId = def.stages[0]!.id;
    const def2 = createWorkflowDefinition({
      ...baseConfig,
      stages: [
        { name: 'S1', handler: 'h' },
        { name: 'S2', handler: 'h', dependencies: [depId] },
      ],
    });
    expect(def2.stages[1]!.dependencies).toContain(depId);
  });

  it('sets delayMs from config', () => {
    const def = createWorkflowDefinition({
      ...baseConfig,
      stages: [{ name: 'S1', handler: 'h', delayMs: 5000 }],
    });
    expect(def.stages[0]!.delayMs).toBe(5000);
  });

  it('sets eventType from config', () => {
    const def = createWorkflowDefinition({
      ...baseConfig,
      stages: [{ name: 'S1', handler: 'h', eventType: 'user.input' }],
    });
    expect(def.stages[0]!.eventType).toBe('user.input');
  });

  it('sets parallelism from config', () => {
    const def = createWorkflowDefinition({
      ...baseConfig,
      stages: [{ name: 'S1', handler: 'h', parallelism: 4 }],
    });
    expect(def.stages[0]!.parallelism).toBe(4);
  });

  it('freezes the definition', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(Object.isFrozen(def)).toBe(true);
  });

  it('freezes stages', () => {
    const def = createWorkflowDefinition(baseConfig);
    expect(Object.isFrozen(def.stages)).toBe(true);
    for (const stage of def.stages) {
      expect(Object.isFrozen(stage)).toBe(true);
    }
  });
});

describe('validateDefinition', () => {
  it('returns empty array for valid definition', () => {
    const def = createWorkflowDefinition(baseConfig);
    const issues = validateDefinition(def);
    expect(issues).toHaveLength(0);
  });

  it('reports missing workflow name', () => {
    const def = createWorkflowDefinition({ ...baseConfig, name: '' });
    const issues = validateDefinition(def);
    expect(issues).toContain('Workflow name is required');
  });

  it('reports whitespace-only name', () => {
    const def = createWorkflowDefinition({ ...baseConfig, name: '   ' });
    const issues = validateDefinition(def);
    expect(issues).toContain('Workflow name is required');
  });

  it('reports empty stages', () => {
    const def = createWorkflowDefinition({ name: 'Test', stages: [] });
    const issues = validateDefinition(def);
    expect(issues).toContain('Workflow must have at least one stage');
  });

  it('reports duplicate stage IDs (synthetic)', () => {
    const def = createWorkflowDefinition(baseConfig);
    const firstId = def.stages[0]!.id;
    const second = { ...def.stages[1]!, id: firstId } as StageDefinition;
    const modified = { ...def, stages: Object.freeze([def.stages[0]!, second]) as any };
    const issues = validateDefinition(modified as WorkflowDefinition);
    expect(issues.some(i => i.includes('Duplicate stage ID'))).toBe(true);
  });

  it('reports transition referencing unknown source stage', () => {
    const def = createWorkflowDefinition(baseConfig);
    const badTransition = Object.freeze({
      id: 't-1' as any,
      from: 'nonexistent-stage' as any,
      to: def.stages[0]!.id,
      priority: 0,
      metadata: Object.freeze({}),
    });
    const modified = { ...def, transitions: Object.freeze([badTransition]) as any };
    const issues = validateDefinition(modified as WorkflowDefinition);
    expect(issues.some(i => i.includes('unknown source stage'))).toBe(true);
  });

  it('reports transition referencing unknown target stage', () => {
    const def = createWorkflowDefinition(baseConfig);
    const badTransition = Object.freeze({
      id: 't-1' as any,
      from: def.stages[0]!.id,
      to: 'nonexistent-stage' as any,
      priority: 0,
      metadata: Object.freeze({}),
    });
    const modified = { ...def, transitions: Object.freeze([badTransition]) as any };
    const issues = validateDefinition(modified as WorkflowDefinition);
    expect(issues.some(i => i.includes('unknown target stage'))).toBe(true);
  });

  it('reports stage with unknown dependency', () => {
    const def = createWorkflowDefinition(baseConfig);
    const stageWithBadDep = Object.freeze({
      ...def.stages[1]!,
      dependencies: Object.freeze(['nonexistent-dep' as any]),
    });
    const modified = { ...def, stages: Object.freeze([def.stages[0]!, stageWithBadDep]) as any };
    const issues = validateDefinition(modified as WorkflowDefinition);
    expect(issues.some(i => i.includes('depends on unknown stage'))).toBe(true);
  });

  it('validates definition with valid dependencies', () => {
    const def = createWorkflowDefinition(baseConfig);
    const depId = def.stages[0]!.id;
    const stageWithDep = Object.freeze({
      ...def.stages[1]!,
      dependencies: Object.freeze([depId] as const),
    });
    const modified = { ...def, stages: Object.freeze([def.stages[0]!, stageWithDep]) as any };
    const issues = validateDefinition(modified as WorkflowDefinition);
    expect(issues.some(i => i.includes('depends on unknown'))).toBe(false);
  });

  it('reports multiple issues at once', () => {
    const def = createWorkflowDefinition({ name: '  ', stages: [] });
    const issues = validateDefinition(def);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});
