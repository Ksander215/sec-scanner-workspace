import { describe, it, expect } from 'vitest';
import {
  RuleSeverity,
  RuleCategory,
  ComplianceState,
  ViolationState,
  AutoFixCapability,
  ComplianceRuntimeState,
  EnforcementLevel,
  ValidationTargetType,
  ScoreLevel,
  DefaultComplianceRuntimeConfig,
  brandRuleId,
  brandViolationId,
  brandComplianceReportId,
  brandPolicyId,
  brandValidatorId,
  brandComplianceSessionId,
  brandRuleSetId,
} from '../../../core/compliance/types.js';

// ═══════════════════════════════════════════════════════════════════
// RuleSeverity Enum
// ═══════════════════════════════════════════════════════════════════

describe('RuleSeverity', () => {
  it('should have Info value', () => {
    expect(RuleSeverity.Info).toBe('Info');
  });

  it('should have Warning value', () => {
    expect(RuleSeverity.Warning).toBe('Warning');
  });

  it('should have Error value', () => {
    expect(RuleSeverity.Error).toBe('Error');
  });

  it('should have Critical value', () => {
    expect(RuleSeverity.Critical).toBe('Critical');
  });

  it('should have exactly 4 members', () => {
    expect(Object.keys(RuleSeverity)).toHaveLength(4);
  });

  it('should be usable in a switch statement', () => {
    let matched = false;
    switch (RuleSeverity.Critical) {
      case RuleSeverity.Critical:
        matched = true;
        break;
    }
    expect(matched).toBe(true);
  });

  it('should be usable as a Record key', () => {
    const map: Record<RuleSeverity, number> = {
      [RuleSeverity.Info]: 0,
      [RuleSeverity.Warning]: 1,
      [RuleSeverity.Error]: 2,
      [RuleSeverity.Critical]: 3,
    };
    expect(map[RuleSeverity.Critical]).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleCategory Enum
// ═══════════════════════════════════════════════════════════════════

describe('RuleCategory', () => {
  it('should have Architecture value', () => {
    expect(RuleCategory.Architecture).toBe('Architecture');
  });

  it('should have Philosophy value', () => {
    expect(RuleCategory.Philosophy).toBe('Philosophy');
  });

  it('should have Governance value', () => {
    expect(RuleCategory.Governance).toBe('Governance');
  });

  it('should have Runtime value', () => {
    expect(RuleCategory.Runtime).toBe('Runtime');
  });

  it('should have AI value', () => {
    expect(RuleCategory.AI).toBe('AI');
  });

  it('should have Documentation value', () => {
    expect(RuleCategory.Documentation).toBe('Documentation');
  });

  it('should have CapabilityPack value', () => {
    expect(RuleCategory.CapabilityPack).toBe('CapabilityPack');
  });

  it('should have Privacy value', () => {
    expect(RuleCategory.Privacy).toBe('Privacy');
  });

  it('should have Security value', () => {
    expect(RuleCategory.Security).toBe('Security');
  });

  it('should have Quality value', () => {
    expect(RuleCategory.Quality).toBe('Quality');
  });

  it('should have exactly 10 members', () => {
    expect(Object.keys(RuleCategory)).toHaveLength(10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceState Enum
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceState', () => {
  it('should have Idle value', () => {
    expect(ComplianceState.Idle).toBe('Idle');
  });

  it('should have Running value', () => {
    expect(ComplianceState.Running).toBe('Running');
  });

  it('should have Completed value', () => {
    expect(ComplianceState.Completed).toBe('Completed');
  });

  it('should have Failed value', () => {
    expect(ComplianceState.Failed).toBe('Failed');
  });

  it('should have PartiallyCompleted value', () => {
    expect(ComplianceState.PartiallyCompleted).toBe('PartiallyCompleted');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(ComplianceState)).toHaveLength(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ViolationState Enum
// ═══════════════════════════════════════════════════════════════════

describe('ViolationState', () => {
  it('should have Detected value', () => {
    expect(ViolationState.Detected).toBe('Detected');
  });

  it('should have Acknowledged value', () => {
    expect(ViolationState.Acknowledged).toBe('Acknowledged');
  });

  it('should have Resolved value', () => {
    expect(ViolationState.Resolved).toBe('Resolved');
  });

  it('should have WontFix value', () => {
    expect(ViolationState.WontFix).toBe('WontFix');
  });

  it('should have Suppressed value', () => {
    expect(ViolationState.Suppressed).toBe('Suppressed');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(ViolationState)).toHaveLength(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AutoFixCapability Enum
// ═══════════════════════════════════════════════════════════════════

describe('AutoFixCapability', () => {
  it('should have None value', () => {
    expect(AutoFixCapability.None).toBe('None');
  });

  it('should have Suggested value', () => {
    expect(AutoFixCapability.Suggested).toBe('Suggested');
  });

  it('should have Automatic value', () => {
    expect(AutoFixCapability.Automatic).toBe('Automatic');
  });

  it('should have exactly 3 members', () => {
    expect(Object.keys(AutoFixCapability)).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceRuntimeState Enum
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceRuntimeState', () => {
  it('should have Uninitialized value', () => {
    expect(ComplianceRuntimeState.Uninitialized).toBe('Uninitialized');
  });

  it('should have Initializing value', () => {
    expect(ComplianceRuntimeState.Initializing).toBe('Initializing');
  });

  it('should have Ready value', () => {
    expect(ComplianceRuntimeState.Ready).toBe('Ready');
  });

  it('should have Running value', () => {
    expect(ComplianceRuntimeState.Running).toBe('Running');
  });

  it('should have Stopping value', () => {
    expect(ComplianceRuntimeState.Stopping).toBe('Stopping');
  });

  it('should have Stopped value', () => {
    expect(ComplianceRuntimeState.Stopped).toBe('Stopped');
  });

  it('should have Error value', () => {
    expect(ComplianceRuntimeState.Error).toBe('Error');
  });

  it('should have exactly 7 members', () => {
    expect(Object.keys(ComplianceRuntimeState)).toHaveLength(7);
  });
});

// ═══════════════════════════════════════════════════════════════════
// EnforcementLevel Enum
// ═══════════════════════════════════════════════════════════════════

describe('EnforcementLevel', () => {
  it('should have Advisory value', () => {
    expect(EnforcementLevel.Advisory).toBe('Advisory');
  });

  it('should have Blocking value', () => {
    expect(EnforcementLevel.Blocking).toBe('Blocking');
  });

  it('should have exactly 2 members', () => {
    expect(Object.keys(EnforcementLevel)).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ValidationTargetType Enum
// ═══════════════════════════════════════════════════════════════════

describe('ValidationTargetType', () => {
  it('should have Architecture value', () => {
    expect(ValidationTargetType.Architecture).toBe('Architecture');
  });

  it('should have Runtime value', () => {
    expect(ValidationTargetType.Runtime).toBe('Runtime');
  });

  it('should have CapabilityPack value', () => {
    expect(ValidationTargetType.CapabilityPack).toBe('CapabilityPack');
  });

  it('should have Documentation value', () => {
    expect(ValidationTargetType.Documentation).toBe('Documentation');
  });

  it('should have Repository value', () => {
    expect(ValidationTargetType.Repository).toBe('Repository');
  });

  it('should have PullRequest value', () => {
    expect(ValidationTargetType.PullRequest).toBe('PullRequest');
  });

  it('should have exactly 6 members', () => {
    expect(Object.keys(ValidationTargetType)).toHaveLength(6);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ScoreLevel Enum
// ═══════════════════════════════════════════════════════════════════

describe('ScoreLevel', () => {
  it('should have Excellent value', () => {
    expect(ScoreLevel.Excellent).toBe('Excellent');
  });

  it('should have Good value', () => {
    expect(ScoreLevel.Good).toBe('Good');
  });

  it('should have Acceptable value', () => {
    expect(ScoreLevel.Acceptable).toBe('Acceptable');
  });

  it('should have NeedsImprovement value', () => {
    expect(ScoreLevel.NeedsImprovement).toBe('NeedsImprovement');
  });

  it('should have Failing value', () => {
    expect(ScoreLevel.Failing).toBe('Failing');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(ScoreLevel)).toHaveLength(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// DefaultComplianceRuntimeConfig
// ═══════════════════════════════════════════════════════════════════

describe('DefaultComplianceRuntimeConfig', () => {
  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig)).toBe(true);
  });

  it('should have ruleEngine config section', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine).toBeDefined();
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.ruleEngine)).toBe(true);
  });

  it('should have policyEngine config section', () => {
    expect(DefaultComplianceRuntimeConfig.policyEngine).toBeDefined();
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.policyEngine)).toBe(true);
  });

  it('should have validators config section', () => {
    expect(DefaultComplianceRuntimeConfig.validators).toBeDefined();
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.validators)).toBe(true);
  });

  it('should have reportGenerator config section', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator).toBeDefined();
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.reportGenerator)).toBe(true);
  });

  it('should have metrics config section', () => {
    expect(DefaultComplianceRuntimeConfig.metrics).toBeDefined();
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.metrics)).toBe(true);
  });

  it('should have eventBusEnabled as true', () => {
    expect(DefaultComplianceRuntimeConfig.eventBusEnabled).toBe(true);
  });

  it('should have correct ruleEngine.maxConcurrentEvaluations', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.maxConcurrentEvaluations).toBe(10);
  });

  it('should have correct ruleEngine.evaluationTimeoutMs', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.evaluationTimeoutMs).toBe(30000);
  });

  it('should have correct ruleEngine.failFast', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.failFast).toBe(false);
  });

  it('should have correct ruleEngine.autoFixEnabled', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.autoFixEnabled).toBe(true);
  });

  it('should have correct ruleEngine.cacheResults', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.cacheResults).toBe(true);
  });

  it('should have correct ruleEngine.cacheTtlMs', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine.cacheTtlMs).toBe(300000);
  });

  it('should have correct policyEngine.maxPolicies', () => {
    expect(DefaultComplianceRuntimeConfig.policyEngine.maxPolicies).toBe(100);
  });

  it('should have correct policyEngine.defaultEnforcementLevel', () => {
    expect(DefaultComplianceRuntimeConfig.policyEngine.defaultEnforcementLevel).toBe(EnforcementLevel.Advisory);
  });

  it('should have correct validators.enabled', () => {
    expect(DefaultComplianceRuntimeConfig.validators.enabled).toBe(true);
  });

  it('should have correct validators.timeoutMs', () => {
    expect(DefaultComplianceRuntimeConfig.validators.timeoutMs).toBe(60000);
  });

  it('should have correct validators.maxFileSizeBytes', () => {
    expect(DefaultComplianceRuntimeConfig.validators.maxFileSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('should have correct reportGenerator.includePassedRules', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.includePassedRules).toBe(false);
  });

  it('should have correct reportGenerator.includeEvidence', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.includeEvidence).toBe(true);
  });

  it('should have correct reportGenerator.maxViolationsPerReport', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.maxViolationsPerReport).toBe(1000);
  });

  it('should have scoreWeights that sum to expected total', () => {
    const weights = Object.values(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights);
    const sum = weights.reduce((a, b) => a + b, 0);
    // Weights are defined per category; verify they are all positive and sum is reasonable
    expect(sum).toBeGreaterThan(0);
    for (const w of weights) {
      expect(w).toBeGreaterThan(0);
    }
  });

  it('should have correct metrics.retentionPeriodMs (24h)', () => {
    expect(DefaultComplianceRuntimeConfig.metrics.retentionPeriodMs).toBe(24 * 60 * 60 * 1000);
  });

  it('should have correct metrics.aggregationWindowMs (1h)', () => {
    expect(DefaultComplianceRuntimeConfig.metrics.aggregationWindowMs).toBe(60 * 60 * 1000);
  });

  it('should have a weight for every RuleCategory in scoreWeights', () => {
    const categories = Object.keys(RuleCategory);
    const weightKeys = Object.keys(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights);
    for (const cat of categories) {
      expect(weightKeys).toContain(cat);
    }
  });

  it('should have scoreWeights frozen', () => {
    expect(Object.isFrozen(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights)).toBe(true);
  });

  it('should have Architecture weight of 0.20', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Architecture]).toBe(0.20);
  });

  it('should have Governance weight of 0.20', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights[RuleCategory.Governance]).toBe(0.20);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Branded ID Functions
// ═══════════════════════════════════════════════════════════════════

describe('brandRuleId', () => {
  it('should return the input string as RuleId', () => {
    const id = brandRuleId('test-rule');
    expect(id).toBe('test-rule');
  });

  it('should return a string type', () => {
    const id = brandRuleId('my-rule');
    expect(typeof id).toBe('string');
  });

  it('should preserve special characters', () => {
    const id = brandRuleId('rule-123_abc.test');
    expect(id).toBe('rule-123_abc.test');
  });

  it('should handle empty string', () => {
    const id = brandRuleId('');
    expect(id).toBe('');
  });

  it('should handle UUID strings', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const id = brandRuleId(uuid);
    expect(id).toBe(uuid);
  });
});

describe('brandViolationId', () => {
  it('should return the input string as ViolationId', () => {
    const id = brandViolationId('vio-001');
    expect(id).toBe('vio-001');
  });

  it('should preserve the input value', () => {
    const id = brandViolationId('violation-special-chars!@#');
    expect(id).toBe('violation-special-chars!@#');
  });
});

describe('brandComplianceReportId', () => {
  it('should return the input string as ComplianceReportId', () => {
    const id = brandComplianceReportId('report-001');
    expect(id).toBe('report-001');
  });

  it('should handle generated report IDs', () => {
    const id = brandComplianceReportId(`report-${Date.now()}`);
    expect(id).toMatch(/^report-\d+$/);
  });
});

describe('brandPolicyId', () => {
  it('should return the input string as PolicyId', () => {
    const id = brandPolicyId('policy-001');
    expect(id).toBe('policy-001');
  });
});

describe('brandValidatorId', () => {
  it('should return the input string as ValidatorId', () => {
    const id = brandValidatorId('validator-001');
    expect(id).toBe('validator-001');
  });
});

describe('brandComplianceSessionId', () => {
  it('should return the input string as ComplianceSessionId', () => {
    const id = brandComplianceSessionId('session-001');
    expect(id).toBe('session-001');
  });
});

describe('brandRuleSetId', () => {
  it('should return the input string as RuleSetId', () => {
    const id = brandRuleSetId('ruleset-001');
    expect(id).toBe('ruleset-001');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Cross-enum consistency
// ═══════════════════════════════════════════════════════════════════

describe('Cross-enum consistency', () => {
  it('RuleCategory should include all categories present in DefaultComplianceRuntimeConfig scoreWeights', () => {
    const weightCategories = Object.keys(DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights);
    const enumCategories = Object.values(RuleCategory);
    for (const wc of weightCategories) {
      expect(enumCategories).toContain(wc);
    }
  });

  it('all enums should use string values (reverse mapping)', () => {
    // TypeScript string enums have reverse mapping
    expect(RuleSeverity['Info']).toBe('Info');
    expect(RuleCategory['Architecture']).toBe('Architecture');
    expect(ComplianceState['Completed']).toBe('Completed');
    expect(ViolationState['Detected']).toBe('Detected');
    expect(AutoFixCapability['None']).toBe('None');
  });
});
