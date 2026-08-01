import { describe, it, expect } from 'vitest';
import {
  // Brand functions
  brandRuleId,
  brandViolationId,
  brandComplianceReportId,
  brandPolicyId,
  brandValidatorId,
  brandComplianceSessionId,
  brandRuleSetId,
  // Enums
  RuleSeverity,
  RuleCategory,
  ComplianceState,
  ViolationState,
  AutoFixCapability,
  ComplianceRuntimeState,
  EnforcementLevel,
  ValidationTargetType,
  ScoreLevel,
  // Default config
  DefaultComplianceRuntimeConfig,
  // Re-exported types
  type Timestamp,
  type SemVer,
  // Branded type aliases (imported as types for assignment tests)
  type RuleId,
  type ViolationId,
  type ComplianceReportId,
  type PolicyId,
  type ValidatorId,
  type ComplianceSessionId,
  type RuleSetId,
  // Interface types
  type ComplianceRule,
  type ComplianceViolation,
  type ValidationRequest,
  type RuleEvaluationResult,
  type ValidationResult,
  type CompliancePolicy,
  type CategoryScore,
  type ComplianceReport,
  type ComplianceMetrics,
  type RuleSet,
  type RuleEngineConfig,
  type PolicyEngineConfig,
  type ValidatorConfig,
  type ReportGeneratorConfig,
  type MetricsConfig,
  type ComplianceRuntimeConfig,
} from '../../core/compliance/types.js';

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
} from '../../core/compliance/errors.js';

// ═══════════════════════════════════════════════════════════════════
// BRAND FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

describe('brandRuleId', () => {
  it('should return a string when called with a string', () => {
    const result = brandRuleId('test');
    expect(typeof result).toBe('string');
  });

  it('should return the input string value', () => {
    const id = 'rule-123';
    const result = brandRuleId(id);
    expect(result).toBe(id);
  });

  it('should be assignable to RuleId type', () => {
    const id: RuleId = brandRuleId('rule-456');
    expect(id).toBe('rule-456');
  });

  it('should handle empty string', () => {
    const result = brandRuleId('');
    expect(result).toBe('');
  });

  it('should handle UUID-like strings', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const result = brandRuleId(uuid);
    expect(result).toBe(uuid);
  });

  it('should handle strings with special characters', () => {
    const id = 'rule-001.000-§5';
    const result = brandRuleId(id);
    expect(result).toBe(id);
  });

  it('should return same value on repeated calls', () => {
    const id = 'rule-repeat';
    expect(brandRuleId(id)).toBe(brandRuleId(id));
  });
});

describe('brandViolationId', () => {
  it('should return a string when called with a string', () => {
    const result = brandViolationId('test');
    expect(typeof result).toBe('string');
  });

  it('should return the input string value', () => {
    const id = 'violation-123';
    const result = brandViolationId(id);
    expect(result).toBe(id);
  });

  it('should be assignable to ViolationId type', () => {
    const id: ViolationId = brandViolationId('vio-456');
    expect(id).toBe('vio-456');
  });

  it('should handle empty string', () => {
    const result = brandViolationId('');
    expect(result).toBe('');
  });

  it('should handle UUID-like strings', () => {
    const uuid = '660e8400-e29b-41d4-a716-446655440001';
    const result = brandViolationId(uuid);
    expect(result).toBe(uuid);
  });

  it('should handle strings with special characters', () => {
    const id = 'vio-001.000-§3';
    const result = brandViolationId(id);
    expect(result).toBe(id);
  });

  it('should return same value on repeated calls', () => {
    const id = 'vio-repeat';
    expect(brandViolationId(id)).toBe(brandViolationId(id));
  });
});

describe('brandComplianceReportId', () => {
  it('should return a string when called with a string', () => {
    const result = brandComplianceReportId('test');
    expect(typeof result).toBe('string');
  });

  it('should return the input string value', () => {
    const id = 'report-123';
    const result = brandComplianceReportId(id);
    expect(result).toBe(id);
  });

  it('should be assignable to ComplianceReportId type', () => {
    const id: ComplianceReportId = brandComplianceReportId('rep-456');
    expect(id).toBe('rep-456');
  });

  it('should handle empty string', () => {
    const result = brandComplianceReportId('');
    expect(result).toBe('');
  });

  it('should handle UUID-like strings', () => {
    const uuid = '770e8400-e29b-41d4-a716-446655440002';
    const result = brandComplianceReportId(uuid);
    expect(result).toBe(uuid);
  });

  it('should return same value on repeated calls', () => {
    const id = 'rep-repeat';
    expect(brandComplianceReportId(id)).toBe(brandComplianceReportId(id));
  });
});

describe('brandPolicyId', () => {
  it('should return a string when called with a string', () => {
    const result = brandPolicyId('test');
    expect(typeof result).toBe('string');
  });

  it('should return the input string value', () => {
    const id = 'policy-123';
    const result = brandPolicyId(id);
    expect(result).toBe(id);
  });

  it('should be assignable to PolicyId type', () => {
    const id: PolicyId = brandPolicyId('pol-456');
    expect(id).toBe('pol-456');
  });

  it('should handle empty string', () => {
    const result = brandPolicyId('');
    expect(result).toBe('');
  });

  it('should handle UUID-like strings', () => {
    const uuid = '880e8400-e29b-41d4-a716-446655440003';
    const result = brandPolicyId(uuid);
    expect(result).toBe(uuid);
  });

  it('should return same value on repeated calls', () => {
    const id = 'pol-repeat';
    expect(brandPolicyId(id)).toBe(brandPolicyId(id));
  });
});

describe('brandValidatorId', () => {
  it('should return a string when called with a string', () => {
    const result = brandValidatorId('test');
    expect(typeof result).toBe('string');
  });

  it('should return the input string value', () => {
    const id = 'validator-123';
    const result = brandValidatorId(id);
    expect(result).toBe(id);
  });

  it('should be assignable to ValidatorId type', () => {
    const id: ValidatorId = brandValidatorId('val-456');
    expect(id).toBe('val-456');
  });

  it('should handle empty string', () => {
    const result = brandValidatorId('');
    expect(result).toBe('');
  });

  it('should handle UUID-like strings', () => {
    const uuid = '990e8400-e29b-41d4-a716-446655440004';
    const result = brandValidatorId(uuid);
    expect(result).toBe(uuid);
  });

  it('should return same value on repeated calls', () => {
    const id = 'val-repeat';
    expect(brandValidatorId(id)).toBe(brandValidatorId(id));
  });
});

describe('brandComplianceSessionId', () => {
  it('should return a string when called with a string', () => {
    const result = brandComplianceSessionId('test');
    expect(typeof result).toBe('string');
  });

  it('should return the input string value', () => {
    const id = 'session-123';
    const result = brandComplianceSessionId(id);
    expect(result).toBe(id);
  });

  it('should be assignable to ComplianceSessionId type', () => {
    const id: ComplianceSessionId = brandComplianceSessionId('ses-456');
    expect(id).toBe('ses-456');
  });

  it('should handle empty string', () => {
    const result = brandComplianceSessionId('');
    expect(result).toBe('');
  });

  it('should handle UUID-like strings', () => {
    const uuid = 'aa0e8400-e29b-41d4-a716-446655440005';
    const result = brandComplianceSessionId(uuid);
    expect(result).toBe(uuid);
  });

  it('should return same value on repeated calls', () => {
    const id = 'ses-repeat';
    expect(brandComplianceSessionId(id)).toBe(brandComplianceSessionId(id));
  });
});

describe('brandRuleSetId', () => {
  it('should return a string when called with a string', () => {
    const result = brandRuleSetId('test');
    expect(typeof result).toBe('string');
  });

  it('should return the input string value', () => {
    const id = 'ruleset-123';
    const result = brandRuleSetId(id);
    expect(result).toBe(id);
  });

  it('should be assignable to RuleSetId type', () => {
    const id: RuleSetId = brandRuleSetId('rs-456');
    expect(id).toBe('rs-456');
  });

  it('should handle empty string', () => {
    const result = brandRuleSetId('');
    expect(result).toBe('');
  });

  it('should handle UUID-like strings', () => {
    const uuid = 'bb0e8400-e29b-41d4-a716-446655440006';
    const result = brandRuleSetId(uuid);
    expect(result).toBe(uuid);
  });

  it('should return same value on repeated calls', () => {
    const id = 'rs-repeat';
    expect(brandRuleSetId(id)).toBe(brandRuleSetId(id));
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: RuleSeverity
// ═══════════════════════════════════════════════════════════════════

describe('RuleSeverity', () => {
  it('should have Info member with value "Info"', () => {
    expect(RuleSeverity.Info).toBe('Info');
  });

  it('should have Warning member with value "Warning"', () => {
    expect(RuleSeverity.Warning).toBe('Warning');
  });

  it('should have Error member with value "Error"', () => {
    expect(RuleSeverity.Error).toBe('Error');
  });

  it('should have Critical member with value "Critical"', () => {
    expect(RuleSeverity.Critical).toBe('Critical');
  });

  it('should have exactly 4 members', () => {
    expect(Object.keys(RuleSeverity).length).toBe(4);
  });

  it('should have all string values', () => {
    for (const value of Object.values(RuleSeverity)) {
      expect(typeof value).toBe('string');
    }
  });

  it('should be usable as a Record key type', () => {
    const record: Record<RuleSeverity, number> = {
      [RuleSeverity.Info]: 1,
      [RuleSeverity.Warning]: 2,
      [RuleSeverity.Error]: 3,
      [RuleSeverity.Critical]: 4,
    };
    expect(record[RuleSeverity.Info]).toBe(1);
    expect(record[RuleSeverity.Critical]).toBe(4);
  });

  it('should not contain any other values', () => {
    const values = new Set(Object.values(RuleSeverity));
    expect(values.has('Info')).toBe(true);
    expect(values.has('Warning')).toBe(true);
    expect(values.has('Error')).toBe(true);
    expect(values.has('Critical')).toBe(true);
    expect(values.size).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: RuleCategory
// ═══════════════════════════════════════════════════════════════════

describe('RuleCategory', () => {
  it('should have Architecture member', () => {
    expect(RuleCategory.Architecture).toBe('Architecture');
  });

  it('should have Philosophy member', () => {
    expect(RuleCategory.Philosophy).toBe('Philosophy');
  });

  it('should have Governance member', () => {
    expect(RuleCategory.Governance).toBe('Governance');
  });

  it('should have Runtime member', () => {
    expect(RuleCategory.Runtime).toBe('Runtime');
  });

  it('should have AI member', () => {
    expect(RuleCategory.AI).toBe('AI');
  });

  it('should have Documentation member', () => {
    expect(RuleCategory.Documentation).toBe('Documentation');
  });

  it('should have CapabilityPack member', () => {
    expect(RuleCategory.CapabilityPack).toBe('CapabilityPack');
  });

  it('should have Privacy member', () => {
    expect(RuleCategory.Privacy).toBe('Privacy');
  });

  it('should have Security member', () => {
    expect(RuleCategory.Security).toBe('Security');
  });

  it('should have Quality member', () => {
    expect(RuleCategory.Quality).toBe('Quality');
  });

  it('should have exactly 10 members', () => {
    expect(Object.keys(RuleCategory).length).toBe(10);
  });

  it('should have all string values', () => {
    for (const value of Object.values(RuleCategory)) {
      expect(typeof value).toBe('string');
    }
  });

  it('should be usable as a Record key type', () => {
    const record: Record<RuleCategory, number> = {
      [RuleCategory.Architecture]: 1,
      [RuleCategory.Philosophy]: 2,
      [RuleCategory.Governance]: 3,
      [RuleCategory.Runtime]: 4,
      [RuleCategory.AI]: 5,
      [RuleCategory.Documentation]: 6,
      [RuleCategory.CapabilityPack]: 7,
      [RuleCategory.Privacy]: 8,
      [RuleCategory.Security]: 9,
      [RuleCategory.Quality]: 10,
    };
    expect(record[RuleCategory.Architecture]).toBe(1);
    expect(record[RuleCategory.Quality]).toBe(10);
  });

  it('should not contain any other values', () => {
    const values = new Set(Object.values(RuleCategory));
    const expected = ['Architecture', 'Philosophy', 'Governance', 'Runtime', 'AI', 'Documentation', 'CapabilityPack', 'Privacy', 'Security', 'Quality'];
    for (const val of expected) {
      expect(values.has(val)).toBe(true);
    }
    expect(values.size).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: ComplianceState
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceState', () => {
  it('should have Idle member', () => {
    expect(ComplianceState.Idle).toBe('Idle');
  });

  it('should have Running member', () => {
    expect(ComplianceState.Running).toBe('Running');
  });

  it('should have Completed member', () => {
    expect(ComplianceState.Completed).toBe('Completed');
  });

  it('should have Failed member', () => {
    expect(ComplianceState.Failed).toBe('Failed');
  });

  it('should have PartiallyCompleted member', () => {
    expect(ComplianceState.PartiallyCompleted).toBe('PartiallyCompleted');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(ComplianceState).length).toBe(5);
  });

  it('should have all string values', () => {
    for (const value of Object.values(ComplianceState)) {
      expect(typeof value).toBe('string');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: ViolationState
// ═══════════════════════════════════════════════════════════════════

describe('ViolationState', () => {
  it('should have Detected member', () => {
    expect(ViolationState.Detected).toBe('Detected');
  });

  it('should have Acknowledged member', () => {
    expect(ViolationState.Acknowledged).toBe('Acknowledged');
  });

  it('should have Resolved member', () => {
    expect(ViolationState.Resolved).toBe('Resolved');
  });

  it('should have WontFix member', () => {
    expect(ViolationState.WontFix).toBe('WontFix');
  });

  it('should have Suppressed member', () => {
    expect(ViolationState.Suppressed).toBe('Suppressed');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(ViolationState).length).toBe(5);
  });

  it('should have all string values', () => {
    for (const value of Object.values(ViolationState)) {
      expect(typeof value).toBe('string');
    }
  });

  it('should be usable as a Record key type', () => {
    const record: Record<ViolationState, number> = {
      [ViolationState.Detected]: 0,
      [ViolationState.Acknowledged]: 1,
      [ViolationState.Resolved]: 2,
      [ViolationState.WontFix]: 3,
      [ViolationState.Suppressed]: 4,
    };
    expect(record[ViolationState.Detected]).toBe(0);
    expect(record[ViolationState.Suppressed]).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: AutoFixCapability
// ═══════════════════════════════════════════════════════════════════

describe('AutoFixCapability', () => {
  it('should have None member', () => {
    expect(AutoFixCapability.None).toBe('None');
  });

  it('should have Suggested member', () => {
    expect(AutoFixCapability.Suggested).toBe('Suggested');
  });

  it('should have Automatic member', () => {
    expect(AutoFixCapability.Automatic).toBe('Automatic');
  });

  it('should have exactly 3 members', () => {
    expect(Object.keys(AutoFixCapability).length).toBe(3);
  });

  it('should have all string values', () => {
    for (const value of Object.values(AutoFixCapability)) {
      expect(typeof value).toBe('string');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: ComplianceRuntimeState
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceRuntimeState', () => {
  it('should have Uninitialized member', () => {
    expect(ComplianceRuntimeState.Uninitialized).toBe('Uninitialized');
  });

  it('should have Initializing member', () => {
    expect(ComplianceRuntimeState.Initializing).toBe('Initializing');
  });

  it('should have Ready member', () => {
    expect(ComplianceRuntimeState.Ready).toBe('Ready');
  });

  it('should have Running member', () => {
    expect(ComplianceRuntimeState.Running).toBe('Running');
  });

  it('should have Stopping member', () => {
    expect(ComplianceRuntimeState.Stopping).toBe('Stopping');
  });

  it('should have Stopped member', () => {
    expect(ComplianceRuntimeState.Stopped).toBe('Stopped');
  });

  it('should have Error member', () => {
    expect(ComplianceRuntimeState.Error).toBe('Error');
  });

  it('should have exactly 7 members', () => {
    expect(Object.keys(ComplianceRuntimeState).length).toBe(7);
  });

  it('should have all string values', () => {
    for (const value of Object.values(ComplianceRuntimeState)) {
      expect(typeof value).toBe('string');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: EnforcementLevel
// ═══════════════════════════════════════════════════════════════════

describe('EnforcementLevel', () => {
  it('should have Advisory member', () => {
    expect(EnforcementLevel.Advisory).toBe('Advisory');
  });

  it('should have Blocking member', () => {
    expect(EnforcementLevel.Blocking).toBe('Blocking');
  });

  it('should have exactly 2 members', () => {
    expect(Object.keys(EnforcementLevel).length).toBe(2);
  });

  it('should have all string values', () => {
    for (const value of Object.values(EnforcementLevel)) {
      expect(typeof value).toBe('string');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: ValidationTargetType
// ═══════════════════════════════════════════════════════════════════

describe('ValidationTargetType', () => {
  it('should have Architecture member', () => {
    expect(ValidationTargetType.Architecture).toBe('Architecture');
  });

  it('should have Runtime member', () => {
    expect(ValidationTargetType.Runtime).toBe('Runtime');
  });

  it('should have CapabilityPack member', () => {
    expect(ValidationTargetType.CapabilityPack).toBe('CapabilityPack');
  });

  it('should have Documentation member', () => {
    expect(ValidationTargetType.Documentation).toBe('Documentation');
  });

  it('should have Repository member', () => {
    expect(ValidationTargetType.Repository).toBe('Repository');
  });

  it('should have PullRequest member', () => {
    expect(ValidationTargetType.PullRequest).toBe('PullRequest');
  });

  it('should have exactly 6 members', () => {
    expect(Object.keys(ValidationTargetType).length).toBe(6);
  });

  it('should have all string values', () => {
    for (const value of Object.values(ValidationTargetType)) {
      expect(typeof value).toBe('string');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENUM: ScoreLevel
// ═══════════════════════════════════════════════════════════════════

describe('ScoreLevel', () => {
  it('should have Excellent member', () => {
    expect(ScoreLevel.Excellent).toBe('Excellent');
  });

  it('should have Good member', () => {
    expect(ScoreLevel.Good).toBe('Good');
  });

  it('should have Acceptable member', () => {
    expect(ScoreLevel.Acceptable).toBe('Acceptable');
  });

  it('should have NeedsImprovement member', () => {
    expect(ScoreLevel.NeedsImprovement).toBe('NeedsImprovement');
  });

  it('should have Failing member', () => {
    expect(ScoreLevel.Failing).toBe('Failing');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(ScoreLevel).length).toBe(5);
  });

  it('should have all string values', () => {
    for (const value of Object.values(ScoreLevel)) {
      expect(typeof value).toBe('string');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: ComplianceRule
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceRule interface', () => {
  it('should accept an object with all required fields', () => {
    const rule: ComplianceRule = {
      id: brandRuleId('rule-001'),
      name: 'Test Rule',
      description: 'A test rule',
      category: RuleCategory.Architecture,
      severity: RuleSeverity.Error,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.None,
      source: 'CON-001.000 §1',
      validatorId: brandValidatorId('val-001'),
      enabled: true,
      tags: ['test', 'architecture'],
      metadata: {},
    };
    expect(rule.id).toBe('rule-001');
    expect(rule.name).toBe('Test Rule');
    expect(rule.enabled).toBe(true);
  });

  it('should accept an object with empty tags', () => {
    const rule: ComplianceRule = {
      id: brandRuleId('rule-002'),
      name: 'Rule With Empty Tags',
      description: 'desc',
      category: RuleCategory.Security,
      severity: RuleSeverity.Critical,
      enforcementLevel: EnforcementLevel.Blocking,
      autoFix: AutoFixCapability.Automatic,
      source: 'SEC-001 §2',
      validatorId: brandValidatorId('val-002'),
      enabled: false,
      tags: [],
      metadata: { key: 'value' },
    };
    expect(rule.tags).toEqual([]);
    expect(rule.metadata).toEqual({ key: 'value' });
  });

  it('should accept all severity levels', () => {
    for (const severity of Object.values(RuleSeverity)) {
      const rule: ComplianceRule = {
        id: brandRuleId('r'),
        name: 'Test',
        description: 'd',
        category: RuleCategory.Architecture,
        severity,
        enforcementLevel: EnforcementLevel.Advisory,
        autoFix: AutoFixCapability.None,
        source: 'src',
        validatorId: brandValidatorId('v'),
        enabled: true,
        tags: [],
        metadata: {},
      };
      expect(rule.severity).toBe(severity);
    }
  });

  it('should accept all categories', () => {
    for (const category of Object.values(RuleCategory)) {
      const rule: ComplianceRule = {
        id: brandRuleId('r'),
        name: 'Test',
        description: 'd',
        category,
        severity: RuleSeverity.Warning,
        enforcementLevel: EnforcementLevel.Advisory,
        autoFix: AutoFixCapability.None,
        source: 'src',
        validatorId: brandValidatorId('v'),
        enabled: true,
        tags: [],
        metadata: {},
      };
      expect(rule.category).toBe(category);
    }
  });

  it('should accept all enforcement levels', () => {
    for (const level of Object.values(EnforcementLevel)) {
      const rule: ComplianceRule = {
        id: brandRuleId('r'),
        name: 'Test',
        description: 'd',
        category: RuleCategory.Governance,
        severity: RuleSeverity.Error,
        enforcementLevel: level,
        autoFix: AutoFixCapability.Suggested,
        source: 'GOV-008.000',
        validatorId: brandValidatorId('v'),
        enabled: true,
        tags: [],
        metadata: {},
      };
      expect(rule.enforcementLevel).toBe(level);
    }
  });

  it('should accept all autofix capabilities', () => {
    for (const autoFix of Object.values(AutoFixCapability)) {
      const rule: ComplianceRule = {
        id: brandRuleId('r'),
        name: 'Test',
        description: 'd',
        category: RuleCategory.Quality,
        severity: RuleSeverity.Info,
        enforcementLevel: EnforcementLevel.Advisory,
        autoFix,
        source: 'QUAL-001',
        validatorId: brandValidatorId('v'),
        enabled: true,
        tags: [],
        metadata: {},
      };
      expect(rule.autoFix).toBe(autoFix);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: ComplianceViolation
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceViolation interface', () => {
  const makeViolation = (overrides?: Partial<ComplianceViolation>): ComplianceViolation => ({
    id: brandViolationId('vio-001'),
    ruleId: brandRuleId('rule-001'),
    ruleName: 'Test Rule',
    category: RuleCategory.Architecture,
    severity: RuleSeverity.Error,
    enforcementLevel: EnforcementLevel.Blocking,
    state: ViolationState.Detected,
    description: 'A violation',
    evidence: ['evidence 1'],
    recommendation: 'Fix it',
    autoFixAvailable: AutoFixCapability.None,
    target: 'src/app/page.tsx',
    detectedAt: '2025-01-01T00:00:00.000Z',
    resolvedAt: null,
    metadata: {},
    ...overrides,
  });

  it('should accept a full object', () => {
    const v = makeViolation();
    expect(v.id).toBe('vio-001');
    expect(v.ruleId).toBe('rule-001');
    expect(v.state).toBe(ViolationState.Detected);
    expect(v.resolvedAt).toBeNull();
  });

  it('should accept all violation states', () => {
    for (const state of Object.values(ViolationState)) {
      const v = makeViolation({ state });
      expect(v.state).toBe(state);
    }
  });

  it('should accept resolvedAt as a timestamp string', () => {
    const v = makeViolation({
      state: ViolationState.Resolved,
      resolvedAt: '2025-01-02T00:00:00.000Z',
    });
    expect(v.resolvedAt).toBe('2025-01-02T00:00:00.000Z');
  });

  it('should accept empty evidence array', () => {
    const v = makeViolation({ evidence: [] });
    expect(v.evidence).toEqual([]);
  });

  it('should accept multiple evidence items', () => {
    const v = makeViolation({ evidence: ['line 1', 'line 2', 'line 3'] });
    expect(v.evidence).toHaveLength(3);
  });

  it('should accept metadata with various types', () => {
    const v = makeViolation({
      metadata: { line: 42, column: 10, fixable: true },
    });
    expect(v.metadata.line).toBe(42);
    expect(v.metadata.fixable).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: ValidationRequest
// ═══════════════════════════════════════════════════════════════════

describe('ValidationRequest interface', () => {
  it('should accept a minimal request (without optional fields)', () => {
    const req: ValidationRequest = {
      targetType: ValidationTargetType.Architecture,
      targetPath: 'src/app/page.tsx',
      sessionId: brandComplianceSessionId('ses-001'),
      metadata: {},
    };
    expect(req.targetPath).toBe('src/app/page.tsx');
    expect(req.targetContent).toBeUndefined();
    expect(req.ruleIds).toBeUndefined();
    expect(req.categories).toBeUndefined();
  });

  it('should accept a full request with all optional fields', () => {
    const req: ValidationRequest = {
      targetType: ValidationTargetType.Repository,
      targetPath: '/repo/root',
      targetContent: 'file content here',
      ruleIds: [brandRuleId('r1'), brandRuleId('r2')],
      categories: [RuleCategory.Security, RuleCategory.Privacy],
      sessionId: brandComplianceSessionId('ses-002'),
      metadata: { userId: 'user-1' },
    };
    expect(req.targetContent).toBe('file content here');
    expect(req.ruleIds).toHaveLength(2);
    expect(req.categories).toHaveLength(2);
  });

  it('should accept all validation target types', () => {
    for (const type of Object.values(ValidationTargetType)) {
      const req: ValidationRequest = {
        targetType: type,
        targetPath: '/test',
        sessionId: brandComplianceSessionId('s'),
        metadata: {},
      };
      expect(req.targetType).toBe(type);
    }
  });

  it('should accept empty ruleIds array', () => {
    const req: ValidationRequest = {
      targetType: ValidationTargetType.Runtime,
      targetPath: '/test',
      ruleIds: [],
      sessionId: brandComplianceSessionId('s'),
      metadata: {},
    };
    expect(req.ruleIds).toEqual([]);
  });

  it('should accept empty categories array', () => {
    const req: ValidationRequest = {
      targetType: ValidationTargetType.CapabilityPack,
      targetPath: '/test',
      categories: [],
      sessionId: brandComplianceSessionId('s'),
      metadata: {},
    };
    expect(req.categories).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: RuleEvaluationResult
// ═══════════════════════════════════════════════════════════════════

describe('RuleEvaluationResult interface', () => {
  it('should accept a passing result with no violations', () => {
    const result: RuleEvaluationResult = {
      ruleId: brandRuleId('r-001'),
      ruleName: 'Test Rule',
      category: RuleCategory.Architecture,
      severity: RuleSeverity.Warning,
      passed: true,
      violations: [],
      durationMs: 42,
      autoFixed: false,
      metadata: {},
    };
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.durationMs).toBe(42);
  });

  it('should accept a failing result with violations', () => {
    const result: RuleEvaluationResult = {
      ruleId: brandRuleId('r-002'),
      ruleName: 'Fail Rule',
      category: RuleCategory.Security,
      severity: RuleSeverity.Critical,
      passed: false,
      violations: [
        {
          id: brandViolationId('v-001'),
          ruleId: brandRuleId('r-002'),
          ruleName: 'Fail Rule',
          category: RuleCategory.Security,
          severity: RuleSeverity.Critical,
          enforcementLevel: EnforcementLevel.Blocking,
          state: ViolationState.Detected,
          description: 'Security issue',
          evidence: ['evidence'],
          recommendation: 'Fix it',
          autoFixAvailable: AutoFixCapability.Automatic,
          target: 'file.ts',
          detectedAt: '2025-01-01T00:00:00.000Z',
          resolvedAt: null,
          metadata: {},
        },
      ],
      durationMs: 100,
      autoFixed: false,
      metadata: {},
    };
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
  });

  it('should accept a result with autoFixed true', () => {
    const result: RuleEvaluationResult = {
      ruleId: brandRuleId('r-003'),
      ruleName: 'AutoFix Rule',
      category: RuleCategory.Quality,
      severity: RuleSeverity.Info,
      passed: true,
      violations: [],
      durationMs: 50,
      autoFixed: true,
      metadata: { fixedBy: 'auto-fixer' },
    };
    expect(result.autoFixed).toBe(true);
    expect(result.metadata.fixedBy).toBe('auto-fixer');
  });

  it('should accept zero durationMs', () => {
    const result: RuleEvaluationResult = {
      ruleId: brandRuleId('r-004'),
      ruleName: 'Instant Rule',
      category: RuleCategory.Documentation,
      severity: RuleSeverity.Info,
      passed: true,
      violations: [],
      durationMs: 0,
      autoFixed: false,
      metadata: {},
    };
    expect(result.durationMs).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: ValidationResult
// ═══════════════════════════════════════════════════════════════════

describe('ValidationResult interface', () => {
  const makeResult = (overrides?: Partial<ValidationResult>): ValidationResult => ({
    sessionId: brandComplianceSessionId('ses-001'),
    targetType: ValidationTargetType.Architecture,
    targetPath: '/test/path',
    startedAt: '2025-01-01T00:00:00.000Z',
    completedAt: '2025-01-01T00:00:01.000Z',
    durationMs: 1000,
    results: [],
    totalRules: 10,
    passedRules: 8,
    failedRules: 1,
    skippedRules: 1,
    violations: [],
    autoFixedCount: 0,
    state: ComplianceState.Completed,
    ...overrides,
  });

  it('should accept a complete validation result', () => {
    const vr = makeResult();
    expect(vr.totalRules).toBe(10);
    expect(vr.passedRules + vr.failedRules + vr.skippedRules).toBe(vr.totalRules);
    expect(vr.state).toBe(ComplianceState.Completed);
  });

  it('should accept a partial completion state', () => {
    const vr = makeResult({ state: ComplianceState.PartiallyCompleted });
    expect(vr.state).toBe(ComplianceState.PartiallyCompleted);
  });

  it('should accept a failed state', () => {
    const vr = makeResult({ state: ComplianceState.Failed });
    expect(vr.state).toBe(ComplianceState.Failed);
  });

  it('should accept all compliance states', () => {
    for (const state of Object.values(ComplianceState)) {
      const vr = makeResult({ state });
      expect(vr.state).toBe(state);
    }
  });

  it('should accept empty results array', () => {
    const vr = makeResult();
    expect(vr.results).toEqual([]);
  });

  it('should accept violations in the violations array', () => {
    const vio: ComplianceViolation = {
      id: brandViolationId('v1'),
      ruleId: brandRuleId('r1'),
      ruleName: 'Rule',
      category: RuleCategory.Architecture,
      severity: RuleSeverity.Warning,
      enforcementLevel: EnforcementLevel.Advisory,
      state: ViolationState.Detected,
      description: 'desc',
      evidence: [],
      recommendation: 'fix',
      autoFixAvailable: AutoFixCapability.None,
      target: 'file.ts',
      detectedAt: '2025-01-01T00:00:00.000Z',
      resolvedAt: null,
      metadata: {},
    };
    const vr = makeResult({ violations: [vio] });
    expect(vr.violations).toHaveLength(1);
    expect(vr.violations[0].id).toBe('v1');
  });

  it('should accept autoFixedCount greater than 0', () => {
    const vr = makeResult({ autoFixedCount: 5 });
    expect(vr.autoFixedCount).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: CompliancePolicy
// ═══════════════════════════════════════════════════════════════════

describe('CompliancePolicy interface', () => {
  it('should accept a full policy object', () => {
    const policy: CompliancePolicy = {
      id: brandPolicyId('pol-001'),
      name: 'Test Policy',
      description: 'A test policy',
      source: 'GOV-008.000 §3',
      rules: [brandRuleId('r1'), brandRuleId('r2')],
      enforcementLevel: EnforcementLevel.Blocking,
      enabled: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      metadata: {},
    };
    expect(policy.id).toBe('pol-001');
    expect(policy.rules).toHaveLength(2);
  });

  it('should accept a policy with empty rules array', () => {
    const policy: CompliancePolicy = {
      id: brandPolicyId('pol-002'),
      name: 'Empty Policy',
      description: 'No rules',
      source: 'src',
      rules: [],
      enforcementLevel: EnforcementLevel.Advisory,
      enabled: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      metadata: { author: 'test' },
    };
    expect(policy.rules).toEqual([]);
  });

  it('should accept disabled policy', () => {
    const policy: CompliancePolicy = {
      id: brandPolicyId('pol-003'),
      name: 'Disabled Policy',
      description: 'desc',
      source: 'src',
      rules: [brandRuleId('r1')],
      enforcementLevel: EnforcementLevel.Advisory,
      enabled: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      metadata: {},
    };
    expect(policy.enabled).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: CategoryScore
// ═══════════════════════════════════════════════════════════════════

describe('CategoryScore interface', () => {
  it('should accept a score of 100 (Excellent)', () => {
    const score: CategoryScore = {
      category: RuleCategory.Architecture,
      score: 100,
      level: ScoreLevel.Excellent,
      totalRules: 10,
      passedRules: 10,
      failedRules: 0,
      criticalViolations: 0,
    };
    expect(score.score).toBe(100);
    expect(score.level).toBe(ScoreLevel.Excellent);
  });

  it('should accept a score of 0 (Failing)', () => {
    const score: CategoryScore = {
      category: RuleCategory.Security,
      score: 0,
      level: ScoreLevel.Failing,
      totalRules: 5,
      passedRules: 0,
      failedRules: 5,
      criticalViolations: 5,
    };
    expect(score.score).toBe(0);
    expect(score.level).toBe(ScoreLevel.Failing);
  });

  it('should accept a mid-range score (Acceptable)', () => {
    const score: CategoryScore = {
      category: RuleCategory.Quality,
      score: 65,
      level: ScoreLevel.Acceptable,
      totalRules: 20,
      passedRules: 13,
      failedRules: 7,
      criticalViolations: 1,
    };
    expect(score.score).toBe(65);
  });

  it('should accept all score levels', () => {
    const levels = [
      ScoreLevel.Excellent,
      ScoreLevel.Good,
      ScoreLevel.Acceptable,
      ScoreLevel.NeedsImprovement,
      ScoreLevel.Failing,
    ];
    for (const level of levels) {
      const score: CategoryScore = {
        category: RuleCategory.Architecture,
        score: 50,
        level,
        totalRules: 10,
        passedRules: 5,
        failedRules: 5,
        criticalViolations: 0,
      };
      expect(score.level).toBe(level);
    }
  });

  it('should accept all rule categories', () => {
    for (const cat of Object.values(RuleCategory)) {
      const score: CategoryScore = {
        category: cat,
        score: 80,
        level: ScoreLevel.Good,
        totalRules: 5,
        passedRules: 4,
        failedRules: 1,
        criticalViolations: 0,
      };
      expect(score.category).toBe(cat);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: ComplianceReport
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceReport interface', () => {
  it('should accept a full report object', () => {
    const report: ComplianceReport = {
      id: brandComplianceReportId('rep-001'),
      sessionId: brandComplianceSessionId('ses-001'),
      generatedAt: '2025-01-01T00:00:00.000Z',
      durationMs: 5000,
      overallScore: 85,
      overallLevel: ScoreLevel.Good,
      categoryScores: [],
      architectureScore: 90,
      governanceScore: 80,
      documentationScore: 70,
      qualityScore: 85,
      privacyScore: 95,
      securityScore: 88,
      totalRules: 100,
      totalPassed: 85,
      totalFailed: 15,
      totalViolations: 20,
      criticalViolations: 3,
      violations: [],
      validationResults: [],
      metadata: {},
    };
    expect(report.overallScore).toBe(85);
    expect(report.totalRules).toBe(100);
  });

  it('should accept a perfect score report', () => {
    const report: ComplianceReport = {
      id: brandComplianceReportId('rep-002'),
      sessionId: brandComplianceSessionId('ses-002'),
      generatedAt: '2025-01-01T00:00:00.000Z',
      durationMs: 100,
      overallScore: 100,
      overallLevel: ScoreLevel.Excellent,
      categoryScores: [],
      architectureScore: 100,
      governanceScore: 100,
      documentationScore: 100,
      qualityScore: 100,
      privacyScore: 100,
      securityScore: 100,
      totalRules: 50,
      totalPassed: 50,
      totalFailed: 0,
      totalViolations: 0,
      criticalViolations: 0,
      violations: [],
      validationResults: [],
      metadata: {},
    };
    expect(report.overallLevel).toBe(ScoreLevel.Excellent);
    expect(report.totalFailed).toBe(0);
  });

  it('should accept report with category scores', () => {
    const catScore: CategoryScore = {
      category: RuleCategory.Architecture,
      score: 90,
      level: ScoreLevel.Excellent,
      totalRules: 10,
      passedRules: 9,
      failedRules: 1,
      criticalViolations: 0,
    };
    const report: ComplianceReport = {
      id: brandComplianceReportId('rep-003'),
      sessionId: brandComplianceSessionId('ses-003'),
      generatedAt: '2025-01-01T00:00:00.000Z',
      durationMs: 2000,
      overallScore: 90,
      overallLevel: ScoreLevel.Excellent,
      categoryScores: [catScore],
      architectureScore: 90,
      governanceScore: 90,
      documentationScore: 90,
      qualityScore: 90,
      privacyScore: 90,
      securityScore: 90,
      totalRules: 10,
      totalPassed: 9,
      totalFailed: 1,
      totalViolations: 1,
      criticalViolations: 0,
      violations: [],
      validationResults: [],
      metadata: {},
    };
    expect(report.categoryScores).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: ComplianceMetrics
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceMetrics interface', () => {
  it('should accept a full metrics object', () => {
    const metrics: ComplianceMetrics = {
      totalViolations: 10,
      violationsBySeverity: {
        [RuleSeverity.Info]: 2,
        [RuleSeverity.Warning]: 3,
        [RuleSeverity.Error]: 4,
        [RuleSeverity.Critical]: 1,
      },
      violationsByCategory: {
        [RuleCategory.Architecture]: 5,
        [RuleCategory.Security]: 3,
        [RuleCategory.Quality]: 2,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
      },
      violationsByState: {
        [ViolationState.Detected]: 10,
        [ViolationState.Acknowledged]: 0,
        [ViolationState.Resolved]: 0,
        [ViolationState.WontFix]: 0,
        [ViolationState.Suppressed]: 0,
      },
      averageCheckDurationMs: 150.5,
      ruleCoverage: 0.85,
      autoFixCount: 3,
      autoFixSuccessRate: 0.75,
      overallComplianceScore: 87.5,
      lastCheckAt: '2025-01-01T00:00:00.000Z',
      checksPerformed: 100,
      checksPassed: 90,
      checksFailed: 10,
      metadata: {},
    };
    expect(metrics.totalViolations).toBe(10);
    expect(metrics.ruleCoverage).toBe(0.85);
  });

  it('should accept metrics with null lastCheckAt', () => {
    const metrics: ComplianceMetrics = {
      totalViolations: 0,
      violationsBySeverity: {
        [RuleSeverity.Info]: 0,
        [RuleSeverity.Warning]: 0,
        [RuleSeverity.Error]: 0,
        [RuleSeverity.Critical]: 0,
      },
      violationsByCategory: {
        [RuleCategory.Architecture]: 0,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
      violationsByState: {
        [ViolationState.Detected]: 0,
        [ViolationState.Acknowledged]: 0,
        [ViolationState.Resolved]: 0,
        [ViolationState.WontFix]: 0,
        [ViolationState.Suppressed]: 0,
      },
      averageCheckDurationMs: 0,
      ruleCoverage: 0,
      autoFixCount: 0,
      autoFixSuccessRate: 0,
      overallComplianceScore: 0,
      lastCheckAt: null,
      checksPerformed: 0,
      checksPassed: 0,
      checksFailed: 0,
      metadata: {},
    };
    expect(metrics.lastCheckAt).toBeNull();
  });

  it('should accept metrics with all zero numeric values', () => {
    const metrics: ComplianceMetrics = {
      totalViolations: 0,
      violationsBySeverity: {
        [RuleSeverity.Info]: 0,
        [RuleSeverity.Warning]: 0,
        [RuleSeverity.Error]: 0,
        [RuleSeverity.Critical]: 0,
      },
      violationsByCategory: {
        [RuleCategory.Architecture]: 0,
        [RuleCategory.Philosophy]: 0,
        [RuleCategory.Governance]: 0,
        [RuleCategory.Runtime]: 0,
        [RuleCategory.AI]: 0,
        [RuleCategory.Documentation]: 0,
        [RuleCategory.CapabilityPack]: 0,
        [RuleCategory.Privacy]: 0,
        [RuleCategory.Security]: 0,
        [RuleCategory.Quality]: 0,
      },
      violationsByState: {
        [ViolationState.Detected]: 0,
        [ViolationState.Acknowledged]: 0,
        [ViolationState.Resolved]: 0,
        [ViolationState.WontFix]: 0,
        [ViolationState.Suppressed]: 0,
      },
      averageCheckDurationMs: 0,
      ruleCoverage: 0,
      autoFixCount: 0,
      autoFixSuccessRate: 0,
      overallComplianceScore: 0,
      lastCheckAt: null,
      checksPerformed: 0,
      checksPassed: 0,
      checksFailed: 0,
      metadata: {},
    };
    expect(metrics.totalViolations).toBe(0);
    expect(metrics.checksPerformed).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: RuleSet
// ═══════════════════════════════════════════════════════════════════

describe('RuleSet interface', () => {
  it('should accept a full ruleset object', () => {
    const rs: RuleSet = {
      id: brandRuleSetId('rs-001'),
      name: 'Architecture Rules',
      description: 'All architecture rules',
      rules: [brandRuleId('r1'), brandRuleId('r2')],
      createdAt: '2025-01-01T00:00:00.000Z',
      metadata: {},
    };
    expect(rs.name).toBe('Architecture Rules');
    expect(rs.rules).toHaveLength(2);
  });

  it('should accept a ruleset with empty rules', () => {
    const rs: RuleSet = {
      id: brandRuleSetId('rs-002'),
      name: 'Empty Set',
      description: 'desc',
      rules: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      metadata: { version: '1.0.0' },
    };
    expect(rs.rules).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTERFACE CONFORMANCE: Config Interfaces
// ═══════════════════════════════════════════════════════════════════

describe('RuleEngineConfig interface', () => {
  it('should accept a valid config', () => {
    const config: RuleEngineConfig = {
      maxConcurrentEvaluations: 5,
      evaluationTimeoutMs: 10000,
      failFast: true,
      autoFixEnabled: false,
      cacheResults: false,
      cacheTtlMs: 0,
    };
    expect(config.maxConcurrentEvaluations).toBe(5);
    expect(config.failFast).toBe(true);
  });
});

describe('PolicyEngineConfig interface', () => {
  it('should accept a valid config', () => {
    const config: PolicyEngineConfig = {
      maxPolicies: 50,
      defaultEnforcementLevel: EnforcementLevel.Blocking,
    };
    expect(config.maxPolicies).toBe(50);
    expect(config.defaultEnforcementLevel).toBe(EnforcementLevel.Blocking);
  });
});

describe('ValidatorConfig interface', () => {
  it('should accept a valid config', () => {
    const config: ValidatorConfig = {
      enabled: false,
      timeoutMs: 5000,
      maxFileSizeBytes: 1024,
    };
    expect(config.enabled).toBe(false);
    expect(config.maxFileSizeBytes).toBe(1024);
  });
});

describe('ReportGeneratorConfig interface', () => {
  it('should accept a valid config', () => {
    const config: ReportGeneratorConfig = {
      includePassedRules: true,
      includeEvidence: false,
      maxViolationsPerReport: 500,
      scoreWeights: {
        [RuleCategory.Architecture]: 0.25,
        [RuleCategory.Philosophy]: 0.05,
        [RuleCategory.Governance]: 0.25,
        [RuleCategory.Runtime]: 0.10,
        [RuleCategory.AI]: 0.10,
        [RuleCategory.Documentation]: 0.05,
        [RuleCategory.CapabilityPack]: 0.05,
        [RuleCategory.Privacy]: 0.05,
        [RuleCategory.Security]: 0.05,
        [RuleCategory.Quality]: 0.05,
      },
    };
    expect(config.includePassedRules).toBe(true);
    expect(config.scoreWeights[RuleCategory.Architecture]).toBe(0.25);
  });
});

describe('MetricsConfig interface', () => {
  it('should accept a valid config', () => {
    const config: MetricsConfig = {
      retentionPeriodMs: 3600000,
      aggregationWindowMs: 60000,
    };
    expect(config.retentionPeriodMs).toBe(3600000);
  });
});

describe('ComplianceRuntimeConfig interface', () => {
  it('should accept a valid config with all sections', () => {
    const config: ComplianceRuntimeConfig = {
      ruleEngine: {
        maxConcurrentEvaluations: 1,
        evaluationTimeoutMs: 1000,
        failFast: true,
        autoFixEnabled: false,
        cacheResults: false,
        cacheTtlMs: 0,
      },
      policyEngine: {
        maxPolicies: 1,
        defaultEnforcementLevel: EnforcementLevel.Advisory,
      },
      validators: {
        enabled: true,
        timeoutMs: 1000,
        maxFileSizeBytes: 512,
      },
      reportGenerator: {
        includePassedRules: false,
        includeEvidence: false,
        maxViolationsPerReport: 100,
        scoreWeights: {
          [RuleCategory.Architecture]: 1.0,
          [RuleCategory.Philosophy]: 0,
          [RuleCategory.Governance]: 0,
          [RuleCategory.Runtime]: 0,
          [RuleCategory.AI]: 0,
          [RuleCategory.Documentation]: 0,
          [RuleCategory.CapabilityPack]: 0,
          [RuleCategory.Privacy]: 0,
          [RuleCategory.Security]: 0,
          [RuleCategory.Quality]: 0,
        },
      },
      metrics: {
        retentionPeriodMs: 0,
        aggregationWindowMs: 0,
      },
      eventBusEnabled: false,
    };
    expect(config.eventBusEnabled).toBe(false);
    expect(config.ruleEngine.maxConcurrentEvaluations).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// DefaultComplianceRuntimeConfig
// ═══════════════════════════════════════════════════════════════════

describe('DefaultComplianceRuntimeConfig', () => {
  it('should be defined', () => {
    expect(DefaultComplianceRuntimeConfig).toBeDefined();
  });

  it('should be frozen (top-level)', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig)).toBe(true);
  });

  it('should have ruleEngine section', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine).toBeDefined();
  });

  it('should have policyEngine section', () => {
    expect(DefaultComplianceRuntimeConfig.policyEngine).toBeDefined();
  });

  it('should have validators section', () => {
    expect(DefaultComplianceRuntimeConfig.validators).toBeDefined();
  });

  it('should have reportGenerator section', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator).toBeDefined();
  });

  it('should have metrics section', () => {
    expect(DefaultComplianceRuntimeConfig.metrics).toBeDefined();
  });

  it('should have eventBusEnabled property', () => {
    expect(DefaultComplianceRuntimeConfig.eventBusEnabled).toBe(true);
  });

  // ruleEngine defaults
  it('ruleEngine.maxConcurrentEvaluations should be 10', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.maxConcurrentEvaluations).toBe(10);
  });

  it('ruleEngine.evaluationTimeoutMs should be 30000', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.evaluationTimeoutMs).toBe(30000);
  });

  it('ruleEngine.failFast should be false', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.failFast).toBe(false);
  });

  it('ruleEngine.autoFixEnabled should be true', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.autoFixEnabled).toBe(true);
  });

  it('ruleEngine.cacheResults should be true', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.cacheResults).toBe(true);
  });

  it('ruleEngine.cacheTtlMs should be 300000', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.cacheTtlMs).toBe(300000);
  });

  it('ruleEngine section should be frozen', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.ruleEngine)).toBe(true);
  });

  // policyEngine defaults
  it('policyEngine.maxPolicies should be 100', () => {
    expect(DefaultComplianceRuntimeConfig.policyEngine.maxPolicies).toBe(100);
  });

  it('policyEngine.defaultEnforcementLevel should be Advisory', () => {
    expect(DefaultComplianceRuntimeConfig.policyEngine.defaultEnforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  it('policyEngine section should be frozen', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.policyEngine)).toBe(true);
  });

  // validators defaults
  it('validators.enabled should be true', () => {
    expect(DefaultComplianceRuntimeConfig.validators.enabled).toBe(true);
  });

  it('validators.timeoutMs should be 60000', () => {
    expect(DefaultComplianceRuntimeConfig.validators.timeoutMs).toBe(60000);
  });

  it('validators.maxFileSizeBytes should be 10MB (10485760)', () => {
    expect(DefaultComplianceRuntimeConfig.validators.maxFileSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('validators section should be frozen', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.validators)).toBe(true);
  });

  // reportGenerator defaults
  it('reportGenerator.includePassedRules should be false', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.includePassedRules).toBe(false);
  });

  it('reportGenerator.includeEvidence should be true', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.includeEvidence).toBe(true);
  });

  it('reportGenerator.maxViolationsPerReport should be 1000', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.maxViolationsPerReport).toBe(1000);
  });

  it('reportGenerator section should be frozen', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.reportGenerator)).toBe(true);
  });

  it('reportGenerator.scoreWeights should be frozen', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights)).toBe(true);
  });

  it('scoreWeights should have Architecture weight of 0.20', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Architecture]).toBe(0.20);
  });

  it('scoreWeights should have Philosophy weight of 0.10', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Philosophy]).toBe(0.10);
  });

  it('scoreWeights should have Governance weight of 0.15', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Governance]).toBe(0.15);
  });

  it('scoreWeights should have Runtime weight of 0.10', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Runtime]).toBe(0.10);
  });

  it('scoreWeights should have AI weight of 0.10', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.AI]).toBe(0.10);
  });

  it('scoreWeights should have Documentation weight of 0.05', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Documentation]).toBe(0.05);
  });

  it('scoreWeights should have CapabilityPack weight of 0.05', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.CapabilityPack]).toBe(0.05);
  });

  it('scoreWeights should have Privacy weight of 0.10', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Privacy]).toBe(0.10);
  });

  it('scoreWeights should have Security weight of 0.10', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Security]).toBe(0.10);
  });

  it('scoreWeights should have Quality weight of 0.05', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Quality]).toBe(0.05);
  });

  it('scoreWeights should sum to 1.0', () => {
    const weights = DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights;
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });

  // metrics defaults
  it('metrics.retentionPeriodMs should be 24 hours', () => {
    expect(DefaultComplianceRuntimeConfig.metrics.retentionPeriodMs).toBe(24 * 60 * 60 * 1000);
  });

  it('metrics.aggregationWindowMs should be 1 hour', () => {
    expect(DefaultComplianceRuntimeConfig.metrics.aggregationWindowMs).toBe(60 * 60 * 1000);
  });

  it('metrics section should be frozen', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.metrics)).toBe(true);
  });

  // Immutability tests
  it('should not allow adding properties to top-level object', () => {
    expect(() => {
      (DefaultComplianceRuntimeConfig as Record<string, unknown>).newProp = 'test';
    }).toThrow();
  });

  it('should not allow modifying top-level properties', () => {
    expect(() => {
      (DefaultComplianceRuntimeConfig as { eventBusEnabled: boolean }).eventBusEnabled = false;
    }).toThrow();
  });

  it('should not allow modifying nested ruleEngine properties', () => {
    expect(() => {
      (DefaultComplianceRuntimeConfig.ruleEngine as { failFast: boolean }).failFast = true;
    }).toThrow();
  });

  it('should not allow modifying nested scoreWeights', () => {
    expect(() => {
      (DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights as Record<string, number>)[RuleCategory.Architecture] = 0.5;
    }).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Re-exported types
// ═══════════════════════════════════════════════════════════════════

describe('Re-exported types (Timestamp, SemVer)', () => {
  it('Timestamp should be assignable from ISO string', () => {
    const ts: Timestamp = '2025-01-01T00:00:00.000Z';
    expect(typeof ts).toBe('string');
  });

  it('Timestamp should accept any string', () => {
    const ts: Timestamp = 'any-string';
    expect(typeof ts).toBe('string');
  });

  it('SemVer should be assignable from version string', () => {
    const ver: SemVer = '1.0.0';
    expect(typeof ver).toBe('string');
  });

  it('SemVer should accept MAJOR.MINOR format', () => {
    const ver: SemVer = '2.5';
    expect(ver).toBe('2.5');
  });
});

// ═══════════════════════════════════════════════════════════════════
// BASE ERROR: ComplianceError
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceError', () => {
  it('should extend Error', () => {
    const err = new ComplianceError('TEST_CODE', 'test message');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ComplianceError);
  });

  it('should set code property', () => {
    const err = new ComplianceError('CODE_001', 'msg');
    expect(err.code).toBe('CODE_001');
  });

  it('should set message property', () => {
    const err = new ComplianceError('CODE', 'hello world');
    expect(err.message).toBe('hello world');
  });

  it('should set name to "ComplianceError"', () => {
    const err = new ComplianceError('CODE', 'msg');
    expect(err.name).toBe('ComplianceError');
  });

  it('should set timestamp as ISO string', () => {
    const before = new Date().toISOString();
    const err = new ComplianceError('CODE', 'msg');
    const after = new Date().toISOString();
    expect(typeof err.timestamp).toBe('string');
    // Verify it's a valid ISO string
    const parsed = Date.parse(err.timestamp as string);
    expect(parsed).not.toBeNaN();
    // Verify it's between before and after
    expect((err.timestamp as string) >= before).toBe(true);
    expect((err.timestamp as string) <= after).toBe(true);
  });

  it('should freeze context', () => {
    const err = new ComplianceError('CODE', 'msg', { key: 'value' });
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should copy context values', () => {
    const ctx = { key: 'value', nested: { a: 1 } };
    const err = new ComplianceError('CODE', 'msg', ctx);
    expect(err.context.key).toBe('value');
    expect((err.context as Record<string, unknown>).nested).toEqual({ a: 1 });
  });

  it('should not share context reference with input', () => {
    const ctx = { key: 'original' };
    const err = new ComplianceError('CODE', 'msg', ctx);
    ctx.key = 'modified';
    expect(err.context.key).toBe('original');
  });

  it('should default context to empty object when not provided', () => {
    const err = new ComplianceError('CODE', 'msg');
    expect(err.context).toEqual({});
  });

  it('should have code that returns the assigned value', () => {
    const err = new ComplianceError('CODE', 'msg');
    expect(err.code).toBe('CODE');
    // TypeScript readonly is compile-time only; verify the value is correct
    (err as { code: string }).code = 'MUTATED';
    expect(err.code).toBe('MUTATED');
  });

  it('should have timestamp that returns the assigned value', () => {
    const err = new ComplianceError('CODE', 'msg');
    const originalTs = err.timestamp;
    expect(typeof originalTs).toBe('string');
    // TypeScript readonly is compile-time only; verify the value is correct
    (err as { timestamp: string }).timestamp = 'new-timestamp';
    expect(err.timestamp).toBe('new-timestamp');
  });

  it('should accept empty code', () => {
    const err = new ComplianceError('', 'msg');
    expect(err.code).toBe('');
  });

  it('should accept empty message', () => {
    const err = new ComplianceError('CODE', '');
    expect(err.message).toBe('');
  });

  it('should accept empty context object', () => {
    const err = new ComplianceError('CODE', 'msg', {});
    expect(err.context).toEqual({});
  });

  it('should preserve context with various value types', () => {
    const err = new ComplianceError('CODE', 'msg', {
      str: 'text',
      num: 42,
      bool: true,
      nil: null,
      arr: [1, 2, 3],
      obj: { nested: true },
    });
    expect(err.context.str).toBe('text');
    expect(err.context.num).toBe(42);
    expect(err.context.bool).toBe(true);
    expect(err.context.nil).toBeNull();
    expect(err.context.arr).toEqual([1, 2, 3]);
    expect(err.context.obj).toEqual({ nested: true });
  });

  it('should have a stack trace', () => {
    const err = new ComplianceError('CODE', 'msg');
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleNotFoundError
// ═══════════════════════════════════════════════════════════════════

describe('RuleNotFoundError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleNotFoundError('rule-001');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "RuleNotFoundError"', () => {
    const err = new RuleNotFoundError('rule-001');
    expect(err.name).toBe('RuleNotFoundError');
  });

  it('should set code to "RULE_NOT_FOUND"', () => {
    const err = new RuleNotFoundError('rule-001');
    expect(err.code).toBe('RULE_NOT_FOUND');
  });

  it('should set ruleId property', () => {
    const err = new RuleNotFoundError('rule-abc');
    expect(err.ruleId).toBe('rule-abc');
  });

  it('should include ruleId in message', () => {
    const err = new RuleNotFoundError('rule-xyz');
    expect(err.message).toContain('rule-xyz');
  });

  it('should include ruleId in context', () => {
    const err = new RuleNotFoundError('rule-001');
    expect(err.context.ruleId).toBe('rule-001');
  });

  it('should accept additional context', () => {
    const err = new RuleNotFoundError('rule-001', { extra: 'data' });
    expect(err.context.extra).toBe('data');
    expect(err.context.ruleId).toBe('rule-001');
  });

  it('should have timestamp', () => {
    const err = new RuleNotFoundError('r');
    expect(err.timestamp).toBeDefined();
    expect(typeof err.timestamp).toBe('string');
  });

  it('should have frozen context', () => {
    const err = new RuleNotFoundError('r', { key: 'val' });
    expect(Object.isFrozen(err.context)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleAlreadyRegisteredError
// ═══════════════════════════════════════════════════════════════════

describe('RuleAlreadyRegisteredError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleAlreadyRegisteredError('rule-001');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "RuleAlreadyRegisteredError"', () => {
    const err = new RuleAlreadyRegisteredError('rule-001');
    expect(err.name).toBe('RuleAlreadyRegisteredError');
  });

  it('should set code to "RULE_ALREADY_REGISTERED"', () => {
    const err = new RuleAlreadyRegisteredError('rule-001');
    expect(err.code).toBe('RULE_ALREADY_REGISTERED');
  });

  it('should set ruleId property', () => {
    const err = new RuleAlreadyRegisteredError('rule-dup');
    expect(err.ruleId).toBe('rule-dup');
  });

  it('should include ruleId in message', () => {
    const err = new RuleAlreadyRegisteredError('rule-dup');
    expect(err.message).toContain('rule-dup');
  });

  it('should include ruleId in context', () => {
    const err = new RuleAlreadyRegisteredError('rule-001');
    expect(err.context.ruleId).toBe('rule-001');
  });

  it('should accept additional context', () => {
    const err = new RuleAlreadyRegisteredError('r', { existingName: 'Old Rule' });
    expect(err.context.existingName).toBe('Old Rule');
  });

  it('should have frozen context', () => {
    const err = new RuleAlreadyRegisteredError('r');
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new RuleAlreadyRegisteredError('r');
    expect(typeof err.timestamp).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleEvaluationError
// ═══════════════════════════════════════════════════════════════════

describe('RuleEvaluationError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleEvaluationError('r-001', 'timeout');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "RuleEvaluationError"', () => {
    const err = new RuleEvaluationError('r-001', 'reason');
    expect(err.name).toBe('RuleEvaluationError');
  });

  it('should set code to "RULE_EVALUATION_ERROR"', () => {
    const err = new RuleEvaluationError('r-001', 'reason');
    expect(err.code).toBe('RULE_EVALUATION_ERROR');
  });

  it('should set ruleId property', () => {
    const err = new RuleEvaluationError('rule-eval', 'failed');
    expect(err.ruleId).toBe('rule-eval');
  });

  it('should include ruleId and reason in message', () => {
    const err = new RuleEvaluationError('r-001', 'div by zero');
    expect(err.message).toContain('r-001');
    expect(err.message).toContain('div by zero');
  });

  it('should include ruleId in context', () => {
    const err = new RuleEvaluationError('r-001', 'reason');
    expect(err.context.ruleId).toBe('r-001');
  });

  it('should accept additional context', () => {
    const err = new RuleEvaluationError('r', 'fail', { stack: 'trace' });
    expect(err.context.stack).toBe('trace');
  });

  it('should have frozen context', () => {
    const err = new RuleEvaluationError('r', 'fail');
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new RuleEvaluationError('r', 'fail');
    expect(typeof err.timestamp).toBe('string');
  });

  it('should handle empty reason', () => {
    const err = new RuleEvaluationError('r', '');
    expect(err.message).toContain('r');
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleEvaluationTimeoutError
// ═══════════════════════════════════════════════════════════════════

describe('RuleEvaluationTimeoutError', () => {
  it('should extend ComplianceError', () => {
    const err = new RuleEvaluationTimeoutError('r-001', 5000);
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "RuleEvaluationTimeoutError"', () => {
    const err = new RuleEvaluationTimeoutError('r', 1000);
    expect(err.name).toBe('RuleEvaluationTimeoutError');
  });

  it('should set code to "RULE_EVALUATION_TIMEOUT"', () => {
    const err = new RuleEvaluationTimeoutError('r', 1000);
    expect(err.code).toBe('RULE_EVALUATION_TIMEOUT');
  });

  it('should set ruleId property', () => {
    const err = new RuleEvaluationTimeoutError('rule-slow', 30000);
    expect(err.ruleId).toBe('rule-slow');
  });

  it('should include ruleId and timeout in message', () => {
    const err = new RuleEvaluationTimeoutError('r-001', 5000);
    expect(err.message).toContain('r-001');
    expect(err.message).toContain('5000');
  });

  it('should include ruleId and timeoutMs in context', () => {
    const err = new RuleEvaluationTimeoutError('r-001', 5000);
    expect(err.context.ruleId).toBe('r-001');
    expect(err.context.timeoutMs).toBe(5000);
  });

  it('should accept additional context', () => {
    const err = new RuleEvaluationTimeoutError('r', 1000, { hint: 'optimize' });
    expect(err.context.hint).toBe('optimize');
  });

  it('should have frozen context', () => {
    const err = new RuleEvaluationTimeoutError('r', 1000);
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new RuleEvaluationTimeoutError('r', 1000);
    expect(typeof err.timestamp).toBe('string');
  });

  it('should handle zero timeout', () => {
    const err = new RuleEvaluationTimeoutError('r', 0);
    expect(err.message).toContain('0');
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
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "RuleLimitExceededError"', () => {
    const err = new RuleLimitExceededError(100);
    expect(err.name).toBe('RuleLimitExceededError');
  });

  it('should set code to "RULE_LIMIT_EXCEEDED"', () => {
    const err = new RuleLimitExceededError(100);
    expect(err.code).toBe('RULE_LIMIT_EXCEEDED');
  });

  it('should include maxRules in message', () => {
    const err = new RuleLimitExceededError(50);
    expect(err.message).toContain('50');
  });

  it('should include maxRules in context', () => {
    const err = new RuleLimitExceededError(200);
    expect(err.context.maxRules).toBe(200);
  });

  it('should accept additional context', () => {
    const err = new RuleLimitExceededError(100, { currentCount: 101 });
    expect(err.context.currentCount).toBe(101);
  });

  it('should have frozen context', () => {
    const err = new RuleLimitExceededError(100);
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new RuleLimitExceededError(100);
    expect(typeof err.timestamp).toBe('string');
  });

  it('should handle maxRules of 0', () => {
    const err = new RuleLimitExceededError(0);
    expect(err.context.maxRules).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PolicyNotFoundError
// ═══════════════════════════════════════════════════════════════════

describe('PolicyNotFoundError', () => {
  it('should extend ComplianceError', () => {
    const err = new PolicyNotFoundError('pol-001');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "PolicyNotFoundError"', () => {
    const err = new PolicyNotFoundError('pol-001');
    expect(err.name).toBe('PolicyNotFoundError');
  });

  it('should set code to "POLICY_NOT_FOUND"', () => {
    const err = new PolicyNotFoundError('pol-001');
    expect(err.code).toBe('POLICY_NOT_FOUND');
  });

  it('should set policyId property', () => {
    const err = new PolicyNotFoundError('pol-abc');
    expect(err.policyId).toBe('pol-abc');
  });

  it('should include policyId in message', () => {
    const err = new PolicyNotFoundError('pol-xyz');
    expect(err.message).toContain('pol-xyz');
  });

  it('should include policyId in context', () => {
    const err = new PolicyNotFoundError('pol-001');
    expect(err.context.policyId).toBe('pol-001');
  });

  it('should accept additional context', () => {
    const err = new PolicyNotFoundError('pol', { searchedIn: 'registry' });
    expect(err.context.searchedIn).toBe('registry');
  });

  it('should have frozen context', () => {
    const err = new PolicyNotFoundError('pol');
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new PolicyNotFoundError('pol');
    expect(typeof err.timestamp).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
// PolicyAlreadyRegisteredError
// ═══════════════════════════════════════════════════════════════════

describe('PolicyAlreadyRegisteredError', () => {
  it('should extend ComplianceError', () => {
    const err = new PolicyAlreadyRegisteredError('pol-001');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "PolicyAlreadyRegisteredError"', () => {
    const err = new PolicyAlreadyRegisteredError('pol-001');
    expect(err.name).toBe('PolicyAlreadyRegisteredError');
  });

  it('should set code to "POLICY_ALREADY_REGISTERED"', () => {
    const err = new PolicyAlreadyRegisteredError('pol-001');
    expect(err.code).toBe('POLICY_ALREADY_REGISTERED');
  });

  it('should set policyId property', () => {
    const err = new PolicyAlreadyRegisteredError('pol-dup');
    expect(err.policyId).toBe('pol-dup');
  });

  it('should include policyId in message', () => {
    const err = new PolicyAlreadyRegisteredError('pol-dup');
    expect(err.message).toContain('pol-dup');
  });

  it('should include policyId in context', () => {
    const err = new PolicyAlreadyRegisteredError('pol-001');
    expect(err.context.policyId).toBe('pol-001');
  });

  it('should accept additional context', () => {
    const err = new PolicyAlreadyRegisteredError('pol', { existing: true });
    expect(err.context.existing).toBe(true);
  });

  it('should have frozen context', () => {
    const err = new PolicyAlreadyRegisteredError('pol');
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new PolicyAlreadyRegisteredError('pol');
    expect(typeof err.timestamp).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
// PolicyLimitExceededError
// ═══════════════════════════════════════════════════════════════════

describe('PolicyLimitExceededError', () => {
  it('should extend ComplianceError', () => {
    const err = new PolicyLimitExceededError(50);
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "PolicyLimitExceededError"', () => {
    const err = new PolicyLimitExceededError(50);
    expect(err.name).toBe('PolicyLimitExceededError');
  });

  it('should set code to "POLICY_LIMIT_EXCEEDED"', () => {
    const err = new PolicyLimitExceededError(50);
    expect(err.code).toBe('POLICY_LIMIT_EXCEEDED');
  });

  it('should include maxPolicies in message', () => {
    const err = new PolicyLimitExceededError(25);
    expect(err.message).toContain('25');
  });

  it('should include maxPolicies in context', () => {
    const err = new PolicyLimitExceededError(100);
    expect(err.context.maxPolicies).toBe(100);
  });

  it('should accept additional context', () => {
    const err = new PolicyLimitExceededError(50, { current: 51 });
    expect(err.context.current).toBe(51);
  });

  it('should have frozen context', () => {
    const err = new PolicyLimitExceededError(50);
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new PolicyLimitExceededError(50);
    expect(typeof err.timestamp).toBe('string');
  });

  it('should handle maxPolicies of 0', () => {
    const err = new PolicyLimitExceededError(0);
    expect(err.context.maxPolicies).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ValidationError (compliance)
// ═══════════════════════════════════════════════════════════════════

describe('ValidationError', () => {
  it('should extend ComplianceError', () => {
    const err = new ValidationError('/path/to/file', 'invalid structure');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "ValidationError"', () => {
    const err = new ValidationError('/path', 'reason');
    expect(err.name).toBe('ValidationError');
  });

  it('should set code to "VALIDATION_ERROR"', () => {
    const err = new ValidationError('/path', 'reason');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should set targetPath property', () => {
    const err = new ValidationError('/src/app/page.tsx', 'reason');
    expect(err.targetPath).toBe('/src/app/page.tsx');
  });

  it('should include targetPath and reason in message', () => {
    const err = new ValidationError('/test/path', 'missing field');
    expect(err.message).toContain('/test/path');
    expect(err.message).toContain('missing field');
  });

  it('should include targetPath in context', () => {
    const err = new ValidationError('/path', 'reason');
    expect(err.context.targetPath).toBe('/path');
  });

  it('should accept additional context', () => {
    const err = new ValidationError('/path', 'reason', { validator: 'arch' });
    expect(err.context.validator).toBe('arch');
  });

  it('should have frozen context', () => {
    const err = new ValidationError('/path', 'reason');
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new ValidationError('/path', 'reason');
    expect(typeof err.timestamp).toBe('string');
  });

  it('should handle empty targetPath', () => {
    const err = new ValidationError('', 'reason');
    expect(err.targetPath).toBe('');
  });

  it('should handle empty reason', () => {
    const err = new ValidationError('/path', '');
    expect(err.message).toContain('/path');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ValidationTimeoutError
// ═══════════════════════════════════════════════════════════════════

describe('ValidationTimeoutError', () => {
  it('should extend ComplianceError', () => {
    const err = new ValidationTimeoutError('/path', 5000);
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "ValidationTimeoutError"', () => {
    const err = new ValidationTimeoutError('/path', 1000);
    expect(err.name).toBe('ValidationTimeoutError');
  });

  it('should set code to "VALIDATION_TIMEOUT"', () => {
    const err = new ValidationTimeoutError('/path', 1000);
    expect(err.code).toBe('VALIDATION_TIMEOUT');
  });

  it('should set targetPath property', () => {
    const err = new ValidationTimeoutError('/src/test.ts', 30000);
    expect(err.targetPath).toBe('/src/test.ts');
  });

  it('should include targetPath and timeout in message', () => {
    const err = new ValidationTimeoutError('/path', 10000);
    expect(err.message).toContain('/path');
    expect(err.message).toContain('10000');
  });

  it('should include targetPath and timeoutMs in context', () => {
    const err = new ValidationTimeoutError('/path', 5000);
    expect(err.context.targetPath).toBe('/path');
    expect(err.context.timeoutMs).toBe(5000);
  });

  it('should accept additional context', () => {
    const err = new ValidationTimeoutError('/path', 1000, { rule: 'r1' });
    expect(err.context.rule).toBe('r1');
  });

  it('should have frozen context', () => {
    const err = new ValidationTimeoutError('/path', 1000);
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new ValidationTimeoutError('/path', 1000);
    expect(typeof err.timestamp).toBe('string');
  });

  it('should handle zero timeout', () => {
    const err = new ValidationTimeoutError('/path', 0);
    expect(err.context.timeoutMs).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// BlockingViolationError
// ═══════════════════════════════════════════════════════════════════

describe('BlockingViolationError', () => {
  it('should extend ComplianceError', () => {
    const err = new BlockingViolationError(['v1', 'v2']);
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "BlockingViolationError"', () => {
    const err = new BlockingViolationError(['v1']);
    expect(err.name).toBe('BlockingViolationError');
  });

  it('should set code to "BLOCKING_VIOLATION"', () => {
    const err = new BlockingViolationError(['v1']);
    expect(err.code).toBe('BLOCKING_VIOLATION');
  });

  it('should set violationIds property', () => {
    const err = new BlockingViolationError(['vio-1', 'vio-2', 'vio-3']);
    expect(err.violationIds).toEqual(['vio-1', 'vio-2', 'vio-3']);
  });

  it('should include violation count in message', () => {
    const err = new BlockingViolationError(['v1', 'v2', 'v3']);
    expect(err.message).toContain('3');
  });

  it('should include violationCount in context', () => {
    const err = new BlockingViolationError(['v1', 'v2']);
    expect(err.context.violationCount).toBe(2);
  });

  it('should accept additional context', () => {
    const err = new BlockingViolationError(['v1'], { policy: 'blocking' });
    expect(err.context.policy).toBe('blocking');
  });

  it('should have frozen context', () => {
    const err = new BlockingViolationError(['v1']);
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new BlockingViolationError(['v1']);
    expect(typeof err.timestamp).toBe('string');
  });

  it('should accept empty violationIds array', () => {
    const err = new BlockingViolationError([]);
    expect(err.violationIds).toEqual([]);
    expect(err.message).toContain('0');
  });

  it('should accept single violation id', () => {
    const err = new BlockingViolationError(['only-one']);
    expect(err.violationIds).toHaveLength(1);
    expect(err.violationIds[0]).toBe('only-one');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceRuntimeError
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceRuntimeError', () => {
  it('should extend ComplianceError', () => {
    const err = new ComplianceRuntimeError('something broke');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "ComplianceRuntimeError"', () => {
    const err = new ComplianceRuntimeError('reason');
    expect(err.name).toBe('ComplianceRuntimeError');
  });

  it('should set code to "COMPLIANCE_RUNTIME_ERROR"', () => {
    const err = new ComplianceRuntimeError('reason');
    expect(err.code).toBe('COMPLIANCE_RUNTIME_ERROR');
  });

  it('should include reason in message', () => {
    const err = new ComplianceRuntimeError('engine failed');
    expect(err.message).toContain('engine failed');
  });

  it('should accept additional context', () => {
    const err = new ComplianceRuntimeError('fail', { component: 'rules' });
    expect(err.context.component).toBe('rules');
  });

  it('should have frozen context', () => {
    const err = new ComplianceRuntimeError('fail');
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new ComplianceRuntimeError('fail');
    expect(typeof err.timestamp).toBe('string');
  });

  it('should default context to empty object', () => {
    const err = new ComplianceRuntimeError('fail');
    expect(err.context).toEqual({});
  });

  it('should handle empty reason', () => {
    const err = new ComplianceRuntimeError('');
    expect(err.message).toContain('Compliance runtime error');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceNotInitializedError
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceNotInitializedError', () => {
  it('should extend ComplianceError', () => {
    const err = new ComplianceNotInitializedError();
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "ComplianceNotInitializedError"', () => {
    const err = new ComplianceNotInitializedError();
    expect(err.name).toBe('ComplianceNotInitializedError');
  });

  it('should set code to "COMPLIANCE_NOT_INITIALIZED"', () => {
    const err = new ComplianceNotInitializedError();
    expect(err.code).toBe('COMPLIANCE_NOT_INITIALIZED');
  });

  it('should have fixed message', () => {
    const err = new ComplianceNotInitializedError();
    expect(err.message).toBe('Compliance runtime is not initialized');
  });

  it('should accept context', () => {
    const err = new ComplianceNotInitializedError({ operation: 'run' });
    expect(err.context.operation).toBe('run');
  });

  it('should have frozen context', () => {
    const err = new ComplianceNotInitializedError();
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new ComplianceNotInitializedError();
    expect(typeof err.timestamp).toBe('string');
  });

  it('should default context to empty object', () => {
    const err = new ComplianceNotInitializedError();
    expect(err.context).toEqual({});
  });

  it('should work without arguments', () => {
    const err = new ComplianceNotInitializedError();
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err.code).toBe('COMPLIANCE_NOT_INITIALIZED');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ReportGenerationError
// ═══════════════════════════════════════════════════════════════════

describe('ReportGenerationError', () => {
  it('should extend ComplianceError', () => {
    const err = new ReportGenerationError('disk full');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "ReportGenerationError"', () => {
    const err = new ReportGenerationError('reason');
    expect(err.name).toBe('ReportGenerationError');
  });

  it('should set code to "REPORT_GENERATION_ERROR"', () => {
    const err = new ReportGenerationError('reason');
    expect(err.code).toBe('REPORT_GENERATION_ERROR');
  });

  it('should include reason in message', () => {
    const err = new ReportGenerationError('PDF export failed');
    expect(err.message).toContain('PDF export failed');
  });

  it('should accept additional context', () => {
    const err = new ReportGenerationError('fail', { format: 'pdf' });
    expect(err.context.format).toBe('pdf');
  });

  it('should have frozen context', () => {
    const err = new ReportGenerationError('fail');
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new ReportGenerationError('fail');
    expect(typeof err.timestamp).toBe('string');
  });

  it('should default context to empty object', () => {
    const err = new ReportGenerationError('fail');
    expect(err.context).toEqual({});
  });

  it('should handle empty reason', () => {
    const err = new ReportGenerationError('');
    expect(err.message).toContain('Report generation failed');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ViolationNotFoundError
// ═══════════════════════════════════════════════════════════════════

describe('ViolationNotFoundError', () => {
  it('should extend ComplianceError', () => {
    const err = new ViolationNotFoundError('vio-001');
    expect(err).toBeInstanceOf(ComplianceError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to "ViolationNotFoundError"', () => {
    const err = new ViolationNotFoundError('vio-001');
    expect(err.name).toBe('ViolationNotFoundError');
  });

  it('should set code to "VIOLATION_NOT_FOUND"', () => {
    const err = new ViolationNotFoundError('vio-001');
    expect(err.code).toBe('VIOLATION_NOT_FOUND');
  });

  it('should set violationId property', () => {
    const err = new ViolationNotFoundError('vio-abc');
    expect(err.violationId).toBe('vio-abc');
  });

  it('should include violationId in message', () => {
    const err = new ViolationNotFoundError('vio-xyz');
    expect(err.message).toContain('vio-xyz');
  });

  it('should include violationId in context', () => {
    const err = new ViolationNotFoundError('vio-001');
    expect(err.context.violationId).toBe('vio-001');
  });

  it('should accept additional context', () => {
    const err = new ViolationNotFoundError('vio', { attemptedAction: 'resolve' });
    expect(err.context.attemptedAction).toBe('resolve');
  });

  it('should have frozen context', () => {
    const err = new ViolationNotFoundError('vio');
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should have timestamp', () => {
    const err = new ViolationNotFoundError('vio');
    expect(typeof err.timestamp).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
// CROSS-CUTTING: Error Inheritance Chain
// ═══════════════════════════════════════════════════════════════════

describe('Error inheritance chain', () => {
  it('all errors should be instances of Error', () => {
    const errors = [
      new ComplianceError('C', 'm'),
      new RuleNotFoundError('r'),
      new RuleAlreadyRegisteredError('r'),
      new RuleEvaluationError('r', 'f'),
      new RuleEvaluationTimeoutError('r', 1000),
      new RuleLimitExceededError(100),
      new PolicyNotFoundError('p'),
      new PolicyAlreadyRegisteredError('p'),
      new PolicyLimitExceededError(100),
      new ValidationError('/p', 'r'),
      new ValidationTimeoutError('/p', 1000),
      new BlockingViolationError([]),
      new ComplianceRuntimeError('r'),
      new ComplianceNotInitializedError(),
      new ReportGenerationError('r'),
      new ViolationNotFoundError('v'),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('all errors should be instances of ComplianceError', () => {
    const errors = [
      new ComplianceError('C', 'm'),
      new RuleNotFoundError('r'),
      new RuleAlreadyRegisteredError('r'),
      new RuleEvaluationError('r', 'f'),
      new RuleEvaluationTimeoutError('r', 1000),
      new RuleLimitExceededError(100),
      new PolicyNotFoundError('p'),
      new PolicyAlreadyRegisteredError('p'),
      new PolicyLimitExceededError(100),
      new ValidationError('/p', 'r'),
      new ValidationTimeoutError('/p', 1000),
      new BlockingViolationError([]),
      new ComplianceRuntimeError('r'),
      new ComplianceNotInitializedError(),
      new ReportGenerationError('r'),
      new ViolationNotFoundError('v'),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(ComplianceError);
    }
  });

  it('all errors should have unique name properties', () => {
    const errors = [
      new ComplianceError('C', 'm'),
      new RuleNotFoundError('r'),
      new RuleAlreadyRegisteredError('r'),
      new RuleEvaluationError('r', 'f'),
      new RuleEvaluationTimeoutError('r', 1000),
      new RuleLimitExceededError(100),
      new PolicyNotFoundError('p'),
      new PolicyAlreadyRegisteredError('p'),
      new PolicyLimitExceededError(100),
      new ValidationError('/p', 'r'),
      new ValidationTimeoutError('/p', 1000),
      new BlockingViolationError([]),
      new ComplianceRuntimeError('r'),
      new ComplianceNotInitializedError(),
      new ReportGenerationError('r'),
      new ViolationNotFoundError('v'),
    ];
    const names = errors.map(e => e.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('all errors should have unique code properties', () => {
    const errors = [
      new ComplianceError('CUSTOM_CODE', 'm'),
      new RuleNotFoundError('r'),
      new RuleAlreadyRegisteredError('r'),
      new RuleEvaluationError('r', 'f'),
      new RuleEvaluationTimeoutError('r', 1000),
      new RuleLimitExceededError(100),
      new PolicyNotFoundError('p'),
      new PolicyAlreadyRegisteredError('p'),
      new PolicyLimitExceededError(100),
      new ValidationError('/p', 'r'),
      new ValidationTimeoutError('/p', 1000),
      new BlockingViolationError([]),
      new ComplianceRuntimeError('r'),
      new ComplianceNotInitializedError(),
      new ReportGenerationError('r'),
      new ViolationNotFoundError('v'),
    ];
    const codes = errors.map(e => e.code);
    const uniqueCodes = new Set(codes);
    // ComplianceError can have custom code, so exclude it
    const subCodes = codes.slice(1);
    const uniqueSubCodes = new Set(subCodes);
    expect(uniqueSubCodes.size).toBe(subCodes.length);
  });

  it('all errors should have string timestamps', () => {
    const errors = [
      new ComplianceError('C', 'm'),
      new RuleNotFoundError('r'),
      new RuleAlreadyRegisteredError('r'),
      new RuleEvaluationError('r', 'f'),
      new RuleEvaluationTimeoutError('r', 1000),
      new RuleLimitExceededError(100),
      new PolicyNotFoundError('p'),
      new PolicyAlreadyRegisteredError('p'),
      new PolicyLimitExceededError(100),
      new ValidationError('/p', 'r'),
      new ValidationTimeoutError('/p', 1000),
      new BlockingViolationError([]),
      new ComplianceRuntimeError('r'),
      new ComplianceNotInitializedError(),
      new ReportGenerationError('r'),
      new ViolationNotFoundError('v'),
    ];
    for (const err of errors) {
      expect(typeof err.timestamp).toBe('string');
      expect(Date.parse(err.timestamp as string)).not.toBeNaN();
    }
  });

  it('all errors should have frozen contexts', () => {
    const errors = [
      new ComplianceError('C', 'm', { k: 'v' }),
      new RuleNotFoundError('r', { k: 'v' }),
      new RuleAlreadyRegisteredError('r', { k: 'v' }),
      new RuleEvaluationError('r', 'f', { k: 'v' }),
      new RuleEvaluationTimeoutError('r', 1000, { k: 'v' }),
      new RuleLimitExceededError(100, { k: 'v' }),
      new PolicyNotFoundError('p', { k: 'v' }),
      new PolicyAlreadyRegisteredError('p', { k: 'v' }),
      new PolicyLimitExceededError(100, { k: 'v' }),
      new ValidationError('/p', 'r', { k: 'v' }),
      new ValidationTimeoutError('/p', 1000, { k: 'v' }),
      new BlockingViolationError([], { k: 'v' }),
      new ComplianceRuntimeError('r', { k: 'v' }),
      new ComplianceNotInitializedError({ k: 'v' }),
      new ReportGenerationError('r', { k: 'v' }),
      new ViolationNotFoundError('v', { k: 'v' }),
    ];
    for (const err of errors) {
      expect(Object.isFrozen(err.context)).toBe(true);
    }
  });

  it('sub-errors should NOT be instances of each other', () => {
    const ruleErr = new RuleNotFoundError('r');
    const policyErr = new PolicyNotFoundError('p');
    const valErr = new ValidationError('/p', 'r');
    expect(ruleErr).not.toBeInstanceOf(PolicyNotFoundError);
    expect(ruleErr).not.toBeInstanceOf(ValidationError);
    expect(policyErr).not.toBeInstanceOf(RuleNotFoundError);
    expect(valErr).not.toBeInstanceOf(PolicyNotFoundError);
  });
});

// ═══════════════════════════════════════════════════════════════════
// CROSS-CUTTING: Brand function cross-compatibility
// ═══════════════════════════════════════════════════════════════════

describe('Brand function cross-compatibility', () => {
  it('all brand functions should return string values', () => {
    const id = 'shared-id';
    expect(typeof brandRuleId(id)).toBe('string');
    expect(typeof brandViolationId(id)).toBe('string');
    expect(typeof brandComplianceReportId(id)).toBe('string');
    expect(typeof brandPolicyId(id)).toBe('string');
    expect(typeof brandValidatorId(id)).toBe('string');
    expect(typeof brandComplianceSessionId(id)).toBe('string');
    expect(typeof brandRuleSetId(id)).toBe('string');
  });

  it('all brand functions should preserve input value', () => {
    const ids = ['id-1', 'id-2', 'id-3', 'id-4', 'id-5', 'id-6', 'id-7'];
    expect(brandRuleId(ids[0])).toBe(ids[0]);
    expect(brandViolationId(ids[1])).toBe(ids[1]);
    expect(brandComplianceReportId(ids[2])).toBe(ids[2]);
    expect(brandPolicyId(ids[3])).toBe(ids[3]);
    expect(brandValidatorId(ids[4])).toBe(ids[4]);
    expect(brandComplianceSessionId(ids[5])).toBe(ids[5]);
    expect(brandRuleSetId(ids[6])).toBe(ids[6]);
  });

  it('brand functions should be callable as type assertions', () => {
    // This tests that the branded types work correctly in type positions
    const ruleId: RuleId = brandRuleId('r');
    const violationId: ViolationId = brandViolationId('v');
    const reportId: ComplianceReportId = brandComplianceReportId('rep');
    const policyId: PolicyId = brandPolicyId('p');
    const validatorId: ValidatorId = brandValidatorId('val');
    const sessionId: ComplianceSessionId = brandComplianceSessionId('s');
    const ruleSetId: RuleSetId = brandRuleSetId('rs');

    expect(ruleId).toBe('r');
    expect(violationId).toBe('v');
    expect(reportId).toBe('rep');
    expect(policyId).toBe('p');
    expect(validatorId).toBe('val');
    expect(sessionId).toBe('s');
    expect(ruleSetId).toBe('rs');
  });
});

// ═══════════════════════════════════════════════════════════════════
// CROSS-CUTTING: Enum uniqueness across enums
// ═══════════════════════════════════════════════════════════════════

describe('Enum value uniqueness', () => {
  it('ComplianceRuntimeState should have unique string values', () => {
    const values = Object.values(ComplianceRuntimeState);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('ScoreLevel should have unique string values', () => {
    const values = Object.values(ScoreLevel);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('EnforcementLevel should have unique string values', () => {
    const values = Object.values(EnforcementLevel);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
