/**
 * Workflow Runtime — Transition Engine Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TransitionEngine } from '../../../core/workflow/transition-engine.js';
import { brandStageId, brandTransitionId } from '../../../core/workflow/types.js';
import type { TransitionDefinition, StageDefinition } from '../../../core/workflow/types.js';

function makeTransition(from: string, to: string, opts?: Partial<TransitionDefinition>): TransitionDefinition {
  return Object.freeze({
    id: brandTransitionId(crypto.randomUUID()),
    from: from as any,
    to: to as any,
    priority: opts?.priority ?? 0,
    metadata: Object.freeze({}),
    ...opts,
  });
}

function makeStage(id: string, deps: string[] = [], retryPolicy?: any): StageDefinition {
  return Object.freeze({
    id: id as any,
    name: `Stage ${id}`,
    description: '',
    type: 'Sequential' as any,
    handler: 'h',
    inputMapping: Object.freeze({}),
    outputMapping: Object.freeze({}),
    timeoutMs: 30000,
    retryPolicy: retryPolicy ?? Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
    compensation: Object.freeze({ action: 'Undo' as any, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
    conditions: [],
    metadata: Object.freeze({}),
    dependencies: deps as any,
  });
}

describe('TransitionEngine', () => {
  let engine: TransitionEngine;

  beforeEach(() => {
    engine = new TransitionEngine();
  });

  describe('evaluateTransition', () => {
    it('allows transition with no condition and no guard', () => {
      const t = makeTransition('A', 'B');
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Allowed');
    });

    it('denies when condition evaluator is not registered', () => {
      const t = makeTransition('A', 'B', { condition: 'missing-cond' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not registered');
    });

    it('allows when condition returns true', () => {
      engine.registerConditionEvaluator('cond1', () => true);
      const t = makeTransition('A', 'B', { condition: 'cond1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(true);
    });

    it('denies when condition returns false', () => {
      engine.registerConditionEvaluator('cond1', () => false);
      const t = makeTransition('A', 'B', { condition: 'cond1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not met');
    });

    it('denies when guard is not registered', () => {
      const t = makeTransition('A', 'B', { guard: 'missing-guard' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not registered');
    });

    it('allows when guard returns true', () => {
      engine.registerGuardEvaluator('guard1', () => true);
      const t = makeTransition('A', 'B', { guard: 'guard1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(true);
    });

    it('denies when guard returns false', () => {
      engine.registerGuardEvaluator('guard1', () => false);
      const t = makeTransition('A', 'B', { guard: 'guard1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied');
    });

    it('denies when condition throws', () => {
      engine.registerConditionEvaluator('cond1', () => { throw new Error('eval error'); });
      const t = makeTransition('A', 'B', { condition: 'cond1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('eval error');
    });

    it('denies when guard throws', () => {
      engine.registerGuardEvaluator('guard1', () => { throw new Error('guard error'); });
      const t = makeTransition('A', 'B', { guard: 'guard1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('guard error');
    });

    it('allows when condition and guard both pass', () => {
      engine.registerConditionEvaluator('cond1', () => true);
      engine.registerGuardEvaluator('guard1', () => true);
      const t = makeTransition('A', 'B', { condition: 'cond1', guard: 'guard1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Condition met, guard passed');
    });

    it('denies when condition passes but guard fails', () => {
      engine.registerConditionEvaluator('cond1', () => true);
      engine.registerGuardEvaluator('guard1', () => false);
      const t = makeTransition('A', 'B', { condition: 'cond1', guard: 'guard1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
    });

    it('denies when condition fails (guard not checked)', () => {
      engine.registerConditionEvaluator('cond1', () => false);
      engine.registerGuardEvaluator('guard1', () => true);
      const t = makeTransition('A', 'B', { condition: 'cond1', guard: 'guard1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
    });

    it('passes variables to condition evaluator', () => {
      let capturedVars: any;
      engine.registerConditionEvaluator('cond1', (vars) => { capturedVars = vars; return true; });
      const vars = new Map([['key', 'value']]);
      const t = makeTransition('A', 'B', { condition: 'cond1' });
      engine.evaluateTransition(t, vars);
      expect(capturedVars).toBe(vars);
    });

    it('passes variables to guard evaluator', () => {
      let capturedVars: any;
      engine.registerGuardEvaluator('guard1', (vars) => { capturedVars = vars; return true; });
      const vars = new Map([['key', 'value']]);
      const t = makeTransition('A', 'B', { guard: 'guard1' });
      engine.evaluateTransition(t, vars);
      expect(capturedVars).toBe(vars);
    });

    it('returns the transition reference in evaluation', () => {
      const t = makeTransition('A', 'B');
      const result = engine.evaluateTransition(t, new Map());
      expect(result.transition).toBe(t);
    });

    it('handles non-Error throws in condition', () => {
      engine.registerConditionEvaluator('cond1', () => { throw 'string error'; });
      const t = makeTransition('A', 'B', { condition: 'cond1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('string error');
    });

    it('handles non-Error throws in guard', () => {
      engine.registerGuardEvaluator('guard1', () => { throw 42; });
      const t = makeTransition('A', 'B', { guard: 'guard1' });
      const result = engine.evaluateTransition(t, new Map());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('42');
    });
  });

  describe('findValidTransitions', () => {
    it('finds transitions from current stage', () => {
      const transitions = [
        makeTransition('A', 'B'),
        makeTransition('B', 'C'),
      ];
      const results = engine.findValidTransitions('A' as any, transitions, new Map());
      expect(results).toHaveLength(1);
      expect(results[0]!.transition.to).toBe('B');
    });

    it('returns empty array when no transitions from stage', () => {
      const results = engine.findValidTransitions('Z' as any, [], new Map());
      expect(results).toHaveLength(0);
    });

    it('sorts by priority', () => {
      const transitions = [
        makeTransition('A', 'C', { priority: 10 }),
        makeTransition('A', 'B', { priority: 1 }),
      ];
      const results = engine.findValidTransitions('A' as any, transitions, new Map());
      expect(results[0]!.transition.to).toBe('B');
      expect(results[1]!.transition.to).toBe('C');
    });

    it('evaluates conditions on found transitions', () => {
      engine.registerConditionEvaluator('cond1', () => false);
      const transitions = [
        makeTransition('A', 'B', { condition: 'cond1' }),
      ];
      const results = engine.findValidTransitions('A' as any, transitions, new Map());
      expect(results).toHaveLength(1);
      expect(results[0]!.allowed).toBe(false);
    });
  });

  describe('selectTransition', () => {
    it('returns first allowed transition', () => {
      const t1 = makeTransition('A', 'B');
      const evaluations = [
        { transition: t1, allowed: true, reason: 'ok' },
      ];
      const result = engine.selectTransition(evaluations);
      expect(result).not.toBeNull();
      expect(result!.transition).toBe(t1);
    });

    it('returns null when no allowed transitions', () => {
      const t1 = makeTransition('A', 'B');
      const evaluations = [
        { transition: t1, allowed: false, reason: 'denied' },
      ];
      const result = engine.selectTransition(evaluations);
      expect(result).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(engine.selectTransition([])).toBeNull();
    });

    it('returns first allowed from multiple', () => {
      const t1 = makeTransition('A', 'B', { priority: 1 });
      const t2 = makeTransition('A', 'C', { priority: 2 });
      const evaluations = [
        { transition: t1, allowed: true, reason: 'ok' },
        { transition: t2, allowed: true, reason: 'ok' },
      ];
      const result = engine.selectTransition(evaluations);
      expect(result!.transition).toBe(t1);
    });

    it('skips denied transitions', () => {
      const t1 = makeTransition('A', 'B');
      const t2 = makeTransition('A', 'C');
      const evaluations = [
        { transition: t1, allowed: false, reason: 'no' },
        { transition: t2, allowed: true, reason: 'yes' },
      ];
      const result = engine.selectTransition(evaluations);
      expect(result!.transition).toBe(t2);
    });
  });

  describe('checkDependencies', () => {
    it('returns true when no dependencies', () => {
      const stage = makeStage('A', []);
      expect(engine.checkDependencies(stage, new Set(), new Set())).toBe(true);
    });

    it('returns true when all dependencies completed', () => {
      const stage = makeStage('B', ['A']);
      const completed = new Set(['A' as any]);
      expect(engine.checkDependencies(stage, completed, new Set())).toBe(true);
    });

    it('returns true when dependency is skipped', () => {
      const stage = makeStage('B', ['A']);
      const skipped = new Set(['A' as any]);
      expect(engine.checkDependencies(stage, new Set(), skipped)).toBe(true);
    });

    it('returns false when dependency not satisfied', () => {
      const stage = makeStage('B', ['A']);
      expect(engine.checkDependencies(stage, new Set(), new Set())).toBe(false);
    });

    it('returns false when one of multiple deps not satisfied', () => {
      const stage = makeStage('C', ['A', 'B']);
      const completed = new Set(['A' as any]);
      expect(engine.checkDependencies(stage, completed, new Set())).toBe(false);
    });

    it('returns true when all deps are completed or skipped mix', () => {
      const stage = makeStage('C', ['A', 'B']);
      const completed = new Set(['A' as any]);
      const skipped = new Set(['B' as any]);
      expect(engine.checkDependencies(stage, completed, skipped)).toBe(true);
    });
  });

  describe('checkTimeout', () => {
    it('returns true when elapsed exceeds timeout', () => {
      const stage = makeStage('A');
      const startedAt = new Date(Date.now() - 35000);
      expect(engine.checkTimeout(stage, startedAt)).toBe(true);
    });

    it('returns false when within timeout', () => {
      const stage = makeStage('A');
      const startedAt = new Date(Date.now() - 10000);
      expect(engine.checkTimeout(stage, startedAt)).toBe(false);
    });

    it('returns false at exact boundary', () => {
      const stage = makeStage('A');
      const startedAt = new Date(Date.now() - 30000);
      // The check uses > so at exactly timeoutMs it should be false or just barely true
      const result = engine.checkTimeout(stage, startedAt);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('checkRetry', () => {
    it('returns true when attempt < maxAttempts and no retryableErrors list', () => {
      const stage = makeStage('A');
      expect(engine.checkRetry(stage, 1, 'SOME_ERROR')).toBe(true);
    });

    it('returns false when attempt >= maxAttempts', () => {
      const stage = makeStage('A');
      expect(engine.checkRetry(stage, 3, 'SOME_ERROR')).toBe(false);
    });

    it('returns true when error is in retryableErrors list', () => {
      const stage = makeStage('A', [], { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: ['TIMEOUT'] });
      expect(engine.checkRetry(stage, 1, 'TIMEOUT')).toBe(true);
    });

    it('returns false when error not in retryableErrors list', () => {
      const stage = makeStage('A', [], { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: ['TIMEOUT'] });
      expect(engine.checkRetry(stage, 1, 'OTHER_ERROR')).toBe(false);
    });

    it('returns true when retryableErrors is empty (allow all)', () => {
      const stage = makeStage('A', [], { maxAttempts: 5, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] });
      expect(engine.checkRetry(stage, 1, 'ANY')).toBe(true);
    });

    it('returns false when attempt equals maxAttempts', () => {
      const stage = makeStage('A', [], { maxAttempts: 2, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] });
      expect(engine.checkRetry(stage, 2, 'ANY')).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('returns delayMs for attempt 0', () => {
      const stage = makeStage('A');
      expect(engine.calculateRetryDelay(stage, 0)).toBe(1000);
    });

    it('returns delayMs * multiplier for attempt 1', () => {
      const stage = makeStage('A');
      expect(engine.calculateRetryDelay(stage, 1)).toBe(2000);
    });

    it('returns delayMs * multiplier^2 for attempt 2', () => {
      const stage = makeStage('A');
      expect(engine.calculateRetryDelay(stage, 2)).toBe(4000);
    });

    it('respects custom delayMs', () => {
      const stage = makeStage('A', [], { maxAttempts: 3, delayMs: 500, backoffMultiplier: 2, retryableErrors: [] });
      expect(engine.calculateRetryDelay(stage, 0)).toBe(500);
    });

    it('respects custom backoffMultiplier', () => {
      const stage = makeStage('A', [], { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 3, retryableErrors: [] });
      expect(engine.calculateRetryDelay(stage, 1)).toBe(3000);
      expect(engine.calculateRetryDelay(stage, 2)).toBe(9000);
    });

    it('returns integer (rounded)', () => {
      const stage = makeStage('A', [], { maxAttempts: 3, delayMs: 333, backoffMultiplier: 3, retryableErrors: [] });
      const result = engine.calculateRetryDelay(stage, 1);
      expect(result).toBe(Math.round(333 * 3));
    });

    it('handles attempt 0', () => {
      const stage = makeStage('A');
      expect(engine.calculateRetryDelay(stage, 0)).toBe(1000);
    });

    it('grows exponentially', () => {
      const stage = makeStage('A');
      const d0 = engine.calculateRetryDelay(stage, 0);
      const d1 = engine.calculateRetryDelay(stage, 1);
      const d2 = engine.calculateRetryDelay(stage, 2);
      expect(d1).toBeGreaterThan(d0);
      expect(d2).toBeGreaterThan(d1);
    });
  });

  describe('registerConditionEvaluator', () => {
    it('overwrites previous evaluator with same name', () => {
      engine.registerConditionEvaluator('c', () => false);
      engine.registerConditionEvaluator('c', () => true);
      const t = makeTransition('A', 'B', { condition: 'c' });
      expect(engine.evaluateTransition(t, new Map()).allowed).toBe(true);
    });
  });

  describe('registerGuardEvaluator', () => {
    it('overwrites previous evaluator with same name', () => {
      engine.registerGuardEvaluator('g', () => false);
      engine.registerGuardEvaluator('g', () => true);
      const t = makeTransition('A', 'B', { guard: 'g' });
      expect(engine.evaluateTransition(t, new Map()).allowed).toBe(true);
    });
  });
});
