import { describe, it, expect } from 'vitest';
import {
  ComplianceError,
  RuleNotFoundError,
  RuleAlreadyRegisteredError,
  RuleEvaluationError,
  RuleEvaluationTimeoutError,
  RuleLimitExceededError,
  PolicyNotFoundError,
  PolicyAlreadyRegisteredError,
  PolicyLimitExceededError,
  ValidationError,
  ValidationTimeoutError,
  BlockingViolationError,
  ComplianceRuntimeError,
  ComplianceNotInitializedError,
  ReportGenerationError,
  ViolationNotFoundError,
} from '../../../core/compliance/errors.js';

// ═══════════════════════════════════════════════════════════════════
// Base: ComplianceError
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceError', () => {
  it('should be an instance of Error', () => {
    const err = new ComplianceError('TEST_CODE', 'test message');
    expect(err).toBeInstanceOf(Error);
  });

  it('should set the message property', () => {
    const err = new ComplianceError('TEST_CODE', 'my error message');
    expect(err.message).toBe('my error message');
  });

  it('should set the name property to ComplianceError', () => {
    const err = new ComplianceError('TEST_CODE', 'msg');
    expect(err.name).toBe('ComplianceError');
  });

  it('should set the code property', () => {
    const err = new ComplianceError('MY_CODE', 'msg');
    expect(err.code).toBe('MY_CODE');
  });

  it('should set timestamp as ISO string', () => {
    const before = new Date().toISOString();
    const err = new ComplianceError('TEST', 'msg');
    const after = new Date().toISOString();
    expect(err.timestamp >= before).toBe(true);
    expect(err.timestamp <= after).toBe(true);
  });

  it('should set default empty context when not provided', () => {
    const err = new ComplianceError('TEST', 'msg');
    expect(err.context).toEqual({});
  });

  it('should freeze the context object', () => {
    const err = new ComplianceError('TEST', 'msg', { key: 'value' });
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should spread context properties into frozen object', () => {
    const ctx = { foo: 1, bar: 'baz' };
    const err = new ComplianceError('TEST', 'msg', ctx);
    expect(err.context).toEqual({ foo: 1, bar: 'baz' });
  });

  it('should not share context reference with input', () => {
    const ctx = { mutable: true };
    const err = new ComplianceError('TEST', 'msg', ctx);
    expect(err.context).not.toBe(ctx);
  });

  it('should handle null/undefined context-like values gracefully', () => {
    const err = new ComplianceError('TEST', 'msg', {});
    expect(err.context).toEqual({});
  });

  it('should have stack trace', () => {
    const err = new ComplianceError('TEST', 'msg');
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleNotFoundError
// ═══════════════════════════════════════════════════════════════════

describe('RuleNotFoundError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleNotFoundError('rule-1');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const err = new RuleNotFoundError('rule-1');
    expect(err.name).toBe('RuleNotFoundError');
  });

  it('should have correct code', () => {
    const err = new RuleNotFoundError('rule-1');
    expect(err.code).toBe('RULE_NOT_FOUND');
  });

  it('should include ruleId in message', () => {
    const err = new RuleNotFoundError('my-rule-id');
    expect(err.message).toContain('my-rule-id');
  });

  it('should set ruleId property', () => {
    const err = new RuleNotFoundError('rule-abc');
    expect(err.ruleId).toBe('rule-abc');
  });

  it('should include ruleId in context', () => {
    const err = new RuleNotFoundError('rule-xyz');
    expect(err.context.ruleId).toBe('rule-xyz');
  });

  it('should merge additional context', () => {
    const err = new RuleNotFoundError('rule-1', { extra: 'data' });
    expect(err.context.ruleId).toBe('rule-1');
    expect(err.context.extra).toBe('data');
  });

  it('should handle special characters in ruleId', () => {
    const err = new RuleNotFoundError('rule/with\special<chars>');
    expect(err.ruleId).toBe('rule/with\special<chars>');
    expect(err.message).toContain('rule/with\special<chars>');
  });

  it('should handle UUID ruleId', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const err = new RuleNotFoundError(uuid);
    expect(err.ruleId).toBe(uuid);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleAlreadyRegisteredError
// ═══════════════════════════════════════════════════════════════════

describe('RuleAlreadyRegisteredError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleAlreadyRegisteredError('rule-1');
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new RuleAlreadyRegisteredError('rule-1');
    expect(err.name).toBe('RuleAlreadyRegisteredError');
  });

  it('should have correct code', () => {
    const err = new RuleAlreadyRegisteredError('rule-1');
    expect(err.code).toBe('RULE_ALREADY_REGISTERED');
  });

  it('should include ruleId in message', () => {
    const err = new RuleAlreadyRegisteredError('dup-rule');
    expect(err.message).toContain('dup-rule');
  });

  it('should set ruleId property', () => {
    const err = new RuleAlreadyRegisteredError('r1');
    expect(err.ruleId).toBe('r1');
  });

  it('should include ruleId in context', () => {
    const err = new RuleAlreadyRegisteredError('r1');
    expect(err.context.ruleId).toBe('r1');
  });

  it('should merge additional context', () => {
    const err = new RuleAlreadyRegisteredError('r1', { existingName: 'My Rule' });
    expect(err.context.existingName).toBe('My Rule');
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleEvaluationError
// ═══════════════════════════════════════════════════════════════════

describe('RuleEvaluationError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleEvaluationError('rule-1', 'timeout');
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new RuleEvaluationError('r1', 'reason');
    expect(err.name).toBe('RuleEvaluationError');
  });

  it('should have correct code', () => {
    const err = new RuleEvaluationError('r1', 'reason');
    expect(err.code).toBe('RULE_EVALUATION_ERROR');
  });

  it('should include ruleId and reason in message', () => {
    const err = new RuleEvaluationError('rule-abc', 'validator crashed');
    expect(err.message).toContain('rule-abc');
    expect(err.message).toContain('validator crashed');
  });

  it('should set ruleId property', () => {
    const err = new RuleEvaluationError('r1', 'fail');
    expect(err.ruleId).toBe('r1');
  });

  it('should include ruleId in context', () => {
    const err = new RuleEvaluationError('r1', 'fail');
    expect(err.context.ruleId).toBe('r1');
  });

  it('should handle empty reason string', () => {
    const err = new RuleEvaluationError('r1', '');
    expect(err.message).toContain('r1');
  });

  it('should merge additional context', () => {
    const err = new RuleEvaluationError('r1', 'fail', { stackTrace: '...' });
    expect(err.context.stackTrace).toBe('...');
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleEvaluationTimeoutError
// ═══════════════════════════════════════════════════════════════════

describe('RuleEvaluationTimeoutError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleEvaluationTimeoutError('r1', 5000);
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new RuleEvaluationTimeoutError('r1', 5000);
    expect(err.name).toBe('RuleEvaluationTimeoutError');
  });

  it('should have correct code', () => {
    const err = new RuleEvaluationTimeoutError('r1', 5000);
    expect(err.code).toBe('RULE_EVALUATION_TIMEOUT');
  });

  it('should include ruleId and timeoutMs in message', () => {
    const err = new RuleEvaluationTimeoutError('slow-rule', 10000);
    expect(err.message).toContain('slow-rule');
    expect(err.message).toContain('10000');
  });

  it('should set ruleId property', () => {
    const err = new RuleEvaluationTimeoutError('r1', 5000);
    expect(err.ruleId).toBe('r1');
  });

  it('should include timeoutMs in context', () => {
    const err = new RuleEvaluationTimeoutError('r1', 5000);
    expect(err.context.timeoutMs).toBe(5000);
  });

  it('should handle zero timeout', () => {
    const err = new RuleEvaluationTimeoutError('r1', 0);
    expect(err.context.timeoutMs).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleLimitExceededError
// ═══════════════════════════════════════════════════════════════════

describe('RuleLimitExceededError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleLimitExceededError(100);
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new RuleLimitExceededError(100);
    expect(err.name).toBe('RuleLimitExceededError');
  });

  it('should have correct code', () => {
    const err = new RuleLimitExceededError(50);
    expect(err.code).toBe('RULE_LIMIT_EXCEEDED');
  });

  it('should include maxRules in message', () => {
    const err = new RuleLimitExceededError(200);
    expect(err.message).toContain('200');
  });

  it('should include maxRules in context', () => {
    const err = new RuleLimitExceededError(99);
    expect(err.context.maxRules).toBe(99);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PolicyNotFoundError
// ═══════════════════════════════════════════════════════════════════

describe('PolicyNotFoundError', () => {
  it('should extend ComplianceError', () => {
    const err = new PolicyNotFoundError('p1');
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new PolicyNotFoundError('p1');
    expect(err.name).toBe('PolicyNotFoundError');
  });

  it('should have correct code', () => {
    const err = new PolicyNotFoundError('p1');
    expect(err.code).toBe('POLICY_NOT_FOUND');
  });

  it('should set policyId property', () => {
    const err = new PolicyNotFoundError('pol-abc');
    expect(err.policyId).toBe('pol-abc');
  });

  it('should include policyId in context and message', () => {
    const err = new PolicyNotFoundError('pol-xyz');
    expect(err.context.policyId).toBe('pol-xyz');
    expect(err.message).toContain('pol-xyz');
  });
});

// ═══════════════════════════════════════════════════════════════════
// PolicyAlreadyRegisteredError
// ═══════════════════════════════════════════════════════════════════

describe('PolicyAlreadyRegisteredError', () => {
  it('should extend ComplianceError', () => {
    const err = new PolicyAlreadyRegisteredError('p1');
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new PolicyAlreadyRegisteredError('p1');
    expect(err.name).toBe('PolicyAlreadyRegisteredError');
  });

  it('should have correct code', () => {
    const err = new PolicyAlreadyRegisteredError('p1');
    expect(err.code).toBe('POLICY_ALREADY_REGISTERED');
  });

  it('should set policyId property', () => {
    const err = new PolicyAlreadyRegisteredError('dup-pol');
    expect(err.policyId).toBe('dup-pol');
  });

  it('should include policyId in message', () => {
    const err = new PolicyAlreadyRegisteredError('dup-pol');
    expect(err.message).toContain('dup-pol');
  });
});

// ═══════════════════════════════════════════════════════════════════
// PolicyLimitExceededError
// ═══════════════════════════════════════════════════════════════════

describe('PolicyLimitExceededError', () => {
  it('should extend ComplianceError', () => {
    const err = new PolicyLimitExceededError(10);
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new PolicyLimitExceededError(10);
    expect(err.name).toBe('PolicyLimitExceededError');
  });

  it('should have correct code', () => {
    const err = new PolicyLimitExceededError(10);
    expect(err.code).toBe('POLICY_LIMIT_EXCEEDED');
  });

  it('should include maxPolicies in message', () => {
    const err = new PolicyLimitExceededError(50);
    expect(err.message).toContain('50');
  });

  it('should include maxPolicies in context', () => {
    const err = new PolicyLimitExceededError(50);
    expect(err.context.maxPolicies).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ValidationError
// ═══════════════════════════════════════════════════════════════════

describe('ValidationError', () => {
  it('should extend ComplianceError', () => {
    const err = new ValidationError('/path/file.ts', 'bad syntax');
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new ValidationError('/path', 'reason');
    expect(err.name).toBe('ValidationError');
  });

  it('should have correct code', () => {
    const err = new ValidationError('/path', 'reason');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should set targetPath property', () => {
    const err = new ValidationError('/src/module.ts', 'fail');
    expect(err.targetPath).toBe('/src/module.ts');
  });

  it('should include targetPath in message', () => {
    const err = new ValidationError('/src/module.ts', 'fail');
    expect(err.message).toContain('/src/module.ts');
    expect(err.message).toContain('fail');
  });

  it('should include targetPath in context', () => {
    const err = new ValidationError('/path', 'reason');
    expect(err.context.targetPath).toBe('/path');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ValidationTimeoutError
// ═══════════════════════════════════════════════════════════════════

describe('ValidationTimeoutError', () => {
  it('should extend ComplianceError', () => {
    const err = new ValidationTimeoutError('/path', 5000);
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new ValidationTimeoutError('/path', 5000);
    expect(err.name).toBe('ValidationTimeoutError');
  });

  it('should have correct code', () => {
    const err = new ValidationTimeoutError('/path', 5000);
    expect(err.code).toBe('VALIDATION_TIMEOUT');
  });

  it('should set targetPath property', () => {
    const err = new ValidationTimeoutError('/big/file.ts', 10000);
    expect(err.targetPath).toBe('/big/file.ts');
  });

  it('should include timeoutMs in context', () => {
    const err = new ValidationTimeoutError('/path', 3000);
    expect(err.context.timeoutMs).toBe(3000);
  });

  it('should include both path and timeout in message', () => {
    const err = new ValidationTimeoutError('/path.ts', 7000);
    expect(err.message).toContain('/path.ts');
    expect(err.message).toContain('7000');
  });
});

// ═══════════════════════════════════════════════════════════════════
// BlockingViolationError
// ═══════════════════════════════════════════════════════════════════

describe('BlockingViolationError', () => {
  it('should extend ComplianceError', () => {
    const err = new BlockingViolationError(['v1', 'v2']);
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new BlockingViolationError(['v1']);
    expect(err.name).toBe('BlockingViolationError');
  });

  it('should have correct code', () => {
    const err = new BlockingViolationError(['v1']);
    expect(err.code).toBe('BLOCKING_VIOLATION');
  });

  it('should set violationIds property', () => {
    const ids = ['vio-1', 'vio-2', 'vio-3'];
    const err = new BlockingViolationError(ids);
    expect(err.violationIds).toEqual(ids);
  });

  it('should include violation count in message', () => {
    const err = new BlockingViolationError(['a', 'b']);
    expect(err.message).toContain('2');
  });

  it('should include violationCount in context', () => {
    const err = new BlockingViolationError(['v1', 'v2', 'v3']);
    expect(err.context.violationCount).toBe(3);
  });

  it('should handle empty violation list', () => {
    const err = new BlockingViolationError([]);
    expect(err.violationIds).toEqual([]);
    expect(err.message).toContain('0');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceRuntimeError
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceRuntimeError', () => {
  it('should extend ComplianceError', () => {
    const err = new ComplianceRuntimeError('something broke');
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new ComplianceRuntimeError('reason');
    expect(err.name).toBe('ComplianceRuntimeError');
  });

  it('should have correct code', () => {
    const err = new ComplianceRuntimeError('reason');
    expect(err.code).toBe('COMPLIANCE_RUNTIME_ERROR');
  });

  it('should include reason in message', () => {
    const err = new ComplianceRuntimeError('engine failed to start');
    expect(err.message).toContain('engine failed to start');
  });

  it('should accept context', () => {
    const err = new ComplianceRuntimeError('fail', { component: 'RuleEngine' });
    expect(err.context.component).toBe('RuleEngine');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceNotInitializedError
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceNotInitializedError', () => {
  it('should extend ComplianceError', () => {
    const err = new ComplianceNotInitializedError();
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new ComplianceNotInitializedError();
    expect(err.name).toBe('ComplianceNotInitializedError');
  });

  it('should have correct code', () => {
    const err = new ComplianceNotInitializedError();
    expect(err.code).toBe('COMPLIANCE_NOT_INITIALIZED');
  });

  it('should have a fixed message', () => {
    const err = new ComplianceNotInitializedError();
    expect(err.message).toBe('Compliance runtime is not initialized');
  });

  it('should accept context', () => {
    const err = new ComplianceNotInitializedError({ action: 'evaluate' });
    expect(err.context.action).toBe('evaluate');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ReportGenerationError
// ═══════════════════════════════════════════════════════════════════

describe('ReportGenerationError', () => {
  it('should extend ComplianceError', () => {
    const err = new ReportGenerationError('pdf failed');
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new ReportGenerationError('reason');
    expect(err.name).toBe('ReportGenerationError');
  });

  it('should have correct code', () => {
    const err = new ReportGenerationError('reason');
    expect(err.code).toBe('REPORT_GENERATION_ERROR');
  });

  it('should include reason in message', () => {
    const err = new ReportGenerationError('template missing');
    expect(err.message).toContain('template missing');
  });

  it('should accept context', () => {
    const err = new ReportGenerationError('fail', { format: 'json' });
    expect(err.context.format).toBe('json');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ViolationNotFoundError
// ═══════════════════════════════════════════════════════════════════

describe('ViolationNotFoundError', () => {
  it('should extend ComplianceError', () => {
    const err = new ViolationNotFoundError('v1');
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should have correct name', () => {
    const err = new ViolationNotFoundError('v1');
    expect(err.name).toBe('ViolationNotFoundError');
  });

  it('should have correct code', () => {
    const err = new ViolationNotFoundError('v1');
    expect(err.code).toBe('VIOLATION_NOT_FOUND');
  });

  it('should set violationId property', () => {
    const err = new ViolationNotFoundError('vio-999');
    expect(err.violationId).toBe('vio-999');
  });

  it('should include violationId in message and context', () => {
    const err = new ViolationNotFoundError('vio-abc');
    expect(err.message).toContain('vio-abc');
    expect(err.context.violationId).toBe('vio-abc');
  });

  it('should merge additional context', () => {
    const err = new ViolationNotFoundError('v1', { resolutionAttempted: true });
    expect(err.context.resolutionAttempted).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Inheritance chain validation
// ═══════════════════════════════════════════════════════════════════

describe('Error inheritance chain', () => {
  const errorClasses = [
    { Ctor: RuleNotFoundError, args: ['r1'] },
    { Ctor: RuleAlreadyRegisteredError, args: ['r1'] },
    { Ctor: RuleEvaluationError, args: ['r1', 'fail'] },
    { Ctor: RuleEvaluationTimeoutError, args: ['r1', 5000] },
    { Ctor: RuleLimitExceededError, args: [100] },
    { Ctor: PolicyNotFoundError, args: ['p1'] },
    { Ctor: PolicyAlreadyRegisteredError, args: ['p1'] },
    { Ctor: PolicyLimitExceededError, args: [100] },
    { Ctor: ValidationError, args: ['/path', 'fail'] },
    { Ctor: ValidationTimeoutError, args: ['/path', 5000] },
    { Ctor: BlockingViolationError, args: [['v1']] },
    { Ctor: ComplianceRuntimeError, args: ['fail'] },
    { Ctor: ComplianceNotInitializedError, args: [] },
    { Ctor: ReportGenerationError, args: ['fail'] },
    { Ctor: ViolationNotFoundError, args: ['v1'] },
  ];

  for (const { Ctor, args } of errorClasses) {
    it(`${Ctor.name} should be instanceof ComplianceError`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = new (Ctor as any)(...args);
      expect(err).toBeInstanceOf(ComplianceError);
    });

    it(`${Ctor.name} should be instanceof Error`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = new (Ctor as any)(...args);
      expect(err).toBeInstanceOf(Error);
    });

    it(`${Ctor.name} should have a timestamp`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = new (Ctor as any)(...args);
      expect(err.timestamp).toBeDefined();
      expect(typeof err.timestamp).toBe('string');
    });

    it(`${Ctor.name} should have a non-empty code`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = new (Ctor as any)(...args);
      expect(err.code).toBeTruthy();
    });

    it(`${Ctor.name} should have frozen context`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = new (Ctor as any)(...args);
      expect(Object.isFrozen(err.context)).toBe(true);
    });
  }
});
