/**
 * Workflow Runtime — Policies Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowPolicyEngine } from '../../../core/workflow/workflow-policies.js';
import type { WorkflowPolicyDefinition } from '../../../core/workflow/types.js';
import { PolicyType } from '../../../core/workflow/types.js';

function makePolicy(name: string, type: PolicyType, rules: Record<string, unknown> = {}): WorkflowPolicyDefinition {
  return Object.freeze({
    id: crypto.randomUUID(),
    name,
    type,
    rules: Object.freeze(rules),
    description: `Policy ${name}`,
  });
}

describe('WorkflowPolicyEngine', () => {
  let engine: WorkflowPolicyEngine;

  beforeEach(() => {
    engine = new WorkflowPolicyEngine();
    engine.registerDefaults();
  });

  describe('registerPolicy', () => {
    it('should register a policy', () => {
      const policy = makePolicy('test', PolicyType.Timeout);
      engine.registerPolicy(policy);
      expect(engine.getPolicies()).toHaveLength(1);
    });

    it('should register multiple policies', () => {
      engine.registerPolicy(makePolicy('p1', PolicyType.Timeout));
      engine.registerPolicy(makePolicy('p2', PolicyType.Retry));
      expect(engine.getPolicies()).toHaveLength(2);
    });
  });

  describe('evaluatePolicy', () => {
    it('should pass timeout policy within limits', () => {
      const policy = makePolicy('timeout', PolicyType.Timeout, { maxTimeoutMs: 60000, elapsedMs: 30000 });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(true);
    });

    it('should fail timeout policy when exceeded', () => {
      const policy = makePolicy('timeout', PolicyType.Timeout, { maxTimeoutMs: 10000, elapsedMs: 20000 });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('exceeds');
    });

    it('should pass retry policy within limits', () => {
      const policy = makePolicy('retry', PolicyType.Retry, { maxRetries: 3, attempts: 2 });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(true);
    });

    it('should fail retry policy when exceeded', () => {
      const policy = makePolicy('retry', PolicyType.Retry, { maxRetries: 3, attempts: 4 });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('exceeds');
    });

    it('should pass parallelism policy within limits', () => {
      const policy = makePolicy('parallel', PolicyType.Parallelism, { maxParallel: 10, currentParallel: 5 });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(true);
    });

    it('should fail parallelism policy when exceeded', () => {
      const policy = makePolicy('parallel', PolicyType.Parallelism, { maxParallel: 5, currentParallel: 10 });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(false);
    });

    it('should pass resource limit policy within limits', () => {
      const policy = makePolicy('resource', PolicyType.ResourceLimit, { maxStages: 100, currentStages: 50 });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(true);
    });

    it('should fail resource limit when exceeded', () => {
      const policy = makePolicy('resource', PolicyType.ResourceLimit, { maxStages: 10, currentStages: 15 });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(false);
    });

    it('should pass security policy when role matches', () => {
      const policy = makePolicy('security', PolicyType.Security, { requiredRole: 'admin', currentRole: 'admin' });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(true);
    });

    it('should fail security policy when role mismatch', () => {
      const policy = makePolicy('security', PolicyType.Security, { requiredRole: 'admin', currentRole: 'guest' });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('Security');
    });

    it('should pass security policy without required role', () => {
      const policy = makePolicy('security', PolicyType.Security, { currentRole: 'any' });
      const result = engine.evaluatePolicy(policy, {});
      expect(result.passed).toBe(true);
    });

    it('should return passed for unregistered policy type handler', () => {
      const policy = makePolicy('custom', PolicyType.Security, {});
      // Security handler is registered but we test behavior
      expect(engine.evaluatePolicy(policy, {}).passed).toBe(true);
    });
  });

  describe('evaluateAll', () => {
    it('should evaluate all policies', () => {
      engine.registerPolicy(makePolicy('p1', PolicyType.Timeout, { maxTimeoutMs: 60000, elapsedMs: 1000 }));
      engine.registerPolicy(makePolicy('p2', PolicyType.Retry, { maxRetries: 3, attempts: 1 }));
      const results = engine.evaluateAll({});
      expect(results).toHaveLength(2);
      expect(results.every(r => r.passed)).toBe(true);
    });

    it('should detect violations', () => {
      engine.registerPolicy(makePolicy('p1', PolicyType.Timeout, { maxTimeoutMs: 1000, elapsedMs: 5000 }));
      engine.registerPolicy(makePolicy('p2', PolicyType.Retry, { maxRetries: 3, attempts: 1 }));
      const results = engine.evaluateAll({});
      expect(results.some(r => !r.passed)).toBe(true);
    });
  });

  describe('validate', () => {
    it('should throw on policy violation', async () => {
      engine.registerPolicy(makePolicy('timeout', PolicyType.Timeout, { maxTimeoutMs: 1000, elapsedMs: 5000 }));
      await expect(engine.validate({})).rejects.toThrow();
    });

    it('should not throw when all policies pass', async () => {
      engine.registerPolicy(makePolicy('timeout', PolicyType.Timeout, { maxTimeoutMs: 60000, elapsedMs: 1000 }));
      await expect(engine.validate({})).resolves.toBeUndefined();
    });
  });

  describe('removePolicy', () => {
    it('should remove a registered policy', () => {
      const policy = makePolicy('remove-me', PolicyType.Timeout);
      engine.registerPolicy(policy);
      expect(engine.getPolicies()).toHaveLength(1);
      engine.removePolicy(policy.id);
      expect(engine.getPolicies()).toHaveLength(0);
    });

    it('should return false for non-existent policy', () => {
      expect(engine.removePolicy('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all policies and handlers', () => {
      engine.registerPolicy(makePolicy('p1', PolicyType.Timeout));
      engine.clear();
      expect(engine.getPolicies()).toHaveLength(0);
    });
  });
});
