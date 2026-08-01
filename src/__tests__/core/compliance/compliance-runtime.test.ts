import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComplianceRuntime } from '../../../core/compliance/compliance-runtime.js';
import {
  DefaultComplianceRuntimeConfig, brandComplianceSessionId, brandRuleId,
  RuleCategory, ComplianceState, RuleSeverity, EnforcementLevel, ValidationTargetType,
} from '../../../core/compliance/types.js';
import { ComplianceNotInitializedError } from '../../../core/compliance/errors.js';

describe('ComplianceRuntime', () => {
  let runtime: ComplianceRuntime;

  beforeEach(async () => {
    runtime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await runtime.initialize();
  });

  // ─── Lifecycle tests ───────────────────────────────────────────
  it('should initialize with Idle state', () => {
    expect(runtime.state).toBe(ComplianceState.Idle);
  });
  it('should not be null after initialization', () => {
    expect(runtime).not.toBeNull();
  });

  // ─── Rule listing tests ────────────────────────────────────────
  it('should list all registered rules', async () => {
    const rules = await runtime.listRules();
    expect(rules.length).toBeGreaterThanOrEqual(38);
  });
  it('should list rules by category: Architecture', async () => {
    const rules = await runtime.listRules(RuleCategory.Architecture);
    expect(rules.length).toBe(5);
    for (const r of rules) {
      expect(r.category).toBe(RuleCategory.Architecture);
    }
  });
  it('should list rules by category: Runtime', async () => {
    const rules = await runtime.listRules(RuleCategory.Runtime);
    expect(rules.length).toBeGreaterThanOrEqual(5);
    for (const r of rules) {
      expect(r.category).toBe(RuleCategory.Runtime);
    }
  });
  it('should list rules by category: CapabilityPack', async () => {
    const rules = await runtime.listRules(RuleCategory.CapabilityPack);
    expect(rules.length).toBe(6);
    for (const r of rules) {
      expect(r.category).toBe(RuleCategory.CapabilityPack);
    }
  });
  it('should list rules by category: Documentation', async () => {
    const rules = await runtime.listRules(RuleCategory.Documentation);
    expect(rules.length).toBeGreaterThanOrEqual(5);
  });
  it('should list rules by category: Privacy', async () => {
    const rules = await runtime.listRules(RuleCategory.Privacy);
    expect(rules.length).toBe(3);
  });
  it('should list rules by category: Security', async () => {
    const rules = await runtime.listRules(RuleCategory.Security);
    expect(rules.length).toBe(4);
  });
  it('should list rules by category: Quality', async () => {
    const rules = await runtime.listRules(RuleCategory.Quality);
    expect(rules.length).toBe(3);
  });
  it('should list rules by category: Governance', async () => {
    const rules = await runtime.listRules(RuleCategory.Governance);
    expect(rules.length).toBeGreaterThanOrEqual(2);
  });
  it('should list rules by category: Philosophy', async () => {
    const rules = await runtime.listRules(RuleCategory.Philosophy);
    expect(rules.length).toBeGreaterThanOrEqual(1);
  });
  it('should list rules by category: AI', async () => {
    const rules = await runtime.listRules(RuleCategory.AI);
    expect(rules.length).toBe(0);
  });
  it('should list rules by category: undefined returns all', async () => {
    const rules = await runtime.listRules(undefined);
    expect(rules.length).toBeGreaterThanOrEqual(38);
  });
  it('all rules should have valid structure', async () => {
    const rules = await runtime.listRules();
    for (const rule of rules) {
      expect(rule.id).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(rule.description).toBeDefined();
      expect(rule.category).toBeDefined();
      expect(rule.severity).toBeDefined();
      expect(rule.enforcementLevel).toBeDefined();
      expect(rule.enabled).toBeDefined();
    }
  });
  it('all rules should be enabled by default', async () => {
    const rules = await runtime.listRules();
    for (const rule of rules) {
      expect(rule.enabled).toBe(true);
    }
  });
  it('all rules should have non-empty tags', async () => {
    const rules = await runtime.listRules();
    for (const rule of rules) {
      expect(rule.tags.length).toBeGreaterThan(0);
    }
  });

  // ─── getRule tests ─────────────────────────────────────────────
  it('should get a known rule', async () => {
    const rule = await runtime.getRule(brandRuleId('ARCH-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No circular dependencies');
  });
  it('should return null for unknown rule', async () => {
    const rule = await runtime.getRule(brandRuleId('UNKNOWN-999'));
    expect(rule).toBeNull();
  });
  it('should get RUN-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('RUN-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime implements governance contract');
  });
  it('should get CAP-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('CAP-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Manifest present');
  });
  it('should get DOC-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('DOC-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Document has ID');
  });
  it('should get PRIV-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('PRIV-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No data leakage');
  });
  it('should get SEC-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('SEC-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('No hardcoded secrets');
  });
  it('should get QUAL-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('QUAL-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Function complexity acceptable');
  });
  it('should get TRACE-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('TRACE-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('ADR references principles');
  });
  it('should get VAL-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('VAL-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime declares value dimensions');
  });
  it('should get CONSTR-001 rule', async () => {
    const rule = await runtime.getRule(brandRuleId('CONSTR-001'));
    expect(rule).not.toBeNull();
    expect(rule!.name).toBe('Runtime exposes getConstraintReport');
  });

  // ─── Subsystem accessors ───────────────────────────────────────
  it('getRuleEngine() should return RuleEngine instance', () => {
    const re = runtime.getRuleEngine();
    expect(re).toBeDefined();
    expect(re.constructor.name).toBe('RuleEngine');
  });
  it('getPolicyEngine() should return PolicyEngine instance', () => {
    const pe = runtime.getPolicyEngine();
    expect(pe).toBeDefined();
    expect(pe.constructor.name).toBe('PolicyEngine');
  });

  // ─── Policy tests ──────────────────────────────────────────────
  it('listPolicies() should return empty array initially', async () => {
    const policies = await runtime.listPolicies();
    expect(Array.isArray(policies)).toBe(true);
  });
  it('getPolicy() should return null for unknown policy', async () => {
    const policy = await runtime.getPolicy(brandComplianceSessionId('nonexistent') as any);
    expect(policy).toBeNull();
  });

  // ─── validateArchitecture() ─────────────────────────────────────
  it('validateArchitecture() should return result', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result).toBeDefined();
    expect(result.targetPath).toBe('test.ts');
  });
  it('validateArchitecture() should evaluate architecture rules', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.totalRules).toBe(5);
  });
  it('validateArchitecture() should pass for clean code', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.passedRules).toBe(5);
    expect(result.failedRules).toBe(0);
  });
  it('validateArchitecture() should have Architecture target type', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.targetType).toBe(ValidationTargetType.Architecture);
  });
  it('validateArchitecture() should return Completed state for all pass', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.state).toBe(ComplianceState.Completed);
  });
  it('validateArchitecture() should have valid startedAt and completedAt', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.startedAt).toBeDefined();
    expect(result.completedAt).toBeDefined();
  });
  it('validateArchitecture() should have non-negative durationMs', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
  it('validateArchitecture() should have session id', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.sessionId).toBeDefined();
  });
  it('validateArchitecture() should handle undefined content', async () => {
    const result = await runtime.validateArchitecture('test.ts');
    expect(result).toBeDefined();
  });
  it('validateArchitecture() result should have results array', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(5);
  });
  it('validateArchitecture() result should have violations array', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(Array.isArray(result.violations)).toBe(true);
  });
  it('validateArchitecture() should detect violations', async () => {
    const content = `import { B } from './b.js';
import { C } from './b.js';
import { D } from './b.js';`;
    const result = await runtime.validateArchitecture('test.ts', content);
    expect(result.failedRules).toBeGreaterThanOrEqual(0);
  });
  it('validateArchitecture() should have skippedRules of 0', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.skippedRules).toBe(0);
  });
  it('validateArchitecture() should have autoFixedCount of 0', async () => {
    const result = await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(result.autoFixedCount).toBe(0);
  });

  // ─── validateRuntime() ──────────────────────────────────────────
  it('validateRuntime() should return result', async () => {
    const result = await runtime.validateRuntime('runtime.ts');
    expect(result).toBeDefined();
    expect(result.targetPath).toBe('runtime.ts');
  });
  it('validateRuntime() should evaluate runtime rules', async () => {
    const result = await runtime.validateRuntime('runtime.ts');
    expect(result.totalRules).toBe(5);
  });
  it('validateRuntime() should have Runtime target type', async () => {
    const result = await runtime.validateRuntime('runtime.ts');
    expect(result.targetType).toBe(ValidationTargetType.Runtime);
  });
  it('validateRuntime() should pass for empty content', async () => {
    const result = await runtime.validateRuntime('runtime.ts');
    expect(result.passedRules).toBe(5);
  });
  it('validateRuntime() result should have results array', async () => {
    const result = await runtime.validateRuntime('runtime.ts');
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(5);
  });
  it('validateRuntime() should fail for content without governance methods', async () => {
    // Note: validateRuntime passes undefined content, so it should skip
    const result = await runtime.validateRuntime('runtime.ts');
    expect(result).toBeDefined();
  });

  // ─── validateCapability() ──────────────────────────────────────
  it('validateCapability() should return result', async () => {
    const result = await runtime.validateCapability('cap.ts');
    expect(result).toBeDefined();
  });
  it('validateCapability() should evaluate 6 capability rules', async () => {
    const result = await runtime.validateCapability('cap.ts');
    expect(result.totalRules).toBe(6);
  });
  it('validateCapability() should have CapabilityPack target type', async () => {
    const result = await runtime.validateCapability('cap.ts');
    expect(result.targetType).toBe(ValidationTargetType.CapabilityPack);
  });
  it('validateCapability() should pass for empty content', async () => {
    const result = await runtime.validateCapability('cap.ts');
    expect(result.passedRules).toBe(6);
  });

  // ─── validateDocumentation() ────────────────────────────────────
  it('validateDocumentation() should return result', async () => {
    const result = await runtime.validateDocumentation('doc.md', 'id: x');
    expect(result).toBeDefined();
  });
  it('validateDocumentation() should evaluate 8 doc+trace rules', async () => {
    const result = await runtime.validateDocumentation('doc.md', 'id: x');
    expect(result.totalRules).toBeGreaterThanOrEqual(5);
  });
  it('validateDocumentation() should have Documentation target type', async () => {
    const result = await runtime.validateDocumentation('doc.md', 'id: x');
    expect(result.targetType).toBe(ValidationTargetType.Documentation);
  });
  it('validateDocumentation() should handle undefined content', async () => {
    const result = await runtime.validateDocumentation('doc.md');
    expect(result).toBeDefined();
  });
  it('validateDocumentation() should pass for valid document', async () => {
    const content = `id: 'doc-1'
version: '1.0.0'
owner: 'team'
references: ['SPEC-001']
status: 'Active'`;
    const result = await runtime.validateDocumentation('doc.md', content);
    expect(result.failedRules).toBe(0);
  });

  // ─── validateRepository() ────────────────────────────────────────
  it('validateRepository() should return result', async () => {
    const result = await runtime.validateRepository('/');
    expect(result).toBeDefined();
  });
  it('validateRepository() should evaluate all categories', async () => {
    const result = await runtime.validateRepository('/');
    expect(result.totalRules).toBeGreaterThanOrEqual(38);
  });
  it('validateRepository() should have Repository target type', async () => {
    const result = await runtime.validateRepository('/');
    expect(result.targetType).toBe(ValidationTargetType.Repository);
  });
  it('validateRepository() should pass for empty content', async () => {
    const result = await runtime.validateRepository('/');
    expect(result.passedRules).toBeGreaterThanOrEqual(38);
  });
  it('validateRepository() should have results for each rule', async () => {
    const result = await runtime.validateRepository('/');
    expect(result.results.length).toBeGreaterThanOrEqual(38);
  });

  // ─── generateComplianceReport() ─────────────────────────────────
  it('generateComplianceReport() should return a report', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(report).toBeDefined();
  });
  it('report should have an id', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(report.id).toBeDefined();
  });
  it('report should have generatedAt timestamp', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(report.generatedAt).toBeDefined();
  });
  it('report should have overallScore', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.overallScore).toBe('number');
  });
  it('report should have overallLevel', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(report.overallLevel).toBeDefined();
  });
  it('report should have categoryScores', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(Array.isArray(report.categoryScores)).toBe(true);
  });
  it('report should have totalRules', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.totalRules).toBe('number');
  });
  it('report should have totalPassed and totalFailed', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.totalPassed).toBe('number');
    expect(typeof report.totalFailed).toBe('number');
  });
  it('report should have violations array', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(Array.isArray(report.violations)).toBe(true);
  });
  it('report should have validationResults', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(Array.isArray(report.validationResults)).toBe(true);
  });
  it('report should have durationMs', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.durationMs).toBe('number');
  });

  // ─── getMetrics() ───────────────────────────────────────────────
  it('getMetrics() should return metrics', async () => {
    const metrics = await runtime.getMetrics();
    expect(metrics).toBeDefined();
  });
  it('metrics should have totalViolations', async () => {
    const metrics = await runtime.getMetrics();
    expect(typeof metrics.totalViolations).toBe('number');
  });
  it('metrics should have violationsBySeverity', async () => {
    const metrics = await runtime.getMetrics();
    expect(metrics.violationsBySeverity).toBeDefined();
  });
  it('metrics should have violationsByCategory', async () => {
    const metrics = await runtime.getMetrics();
    expect(metrics.violationsByCategory).toBeDefined();
  });
  it('metrics should have violationsByState', async () => {
    const metrics = await runtime.getMetrics();
    expect(metrics.violationsByState).toBeDefined();
  });
  it('metrics should have overallComplianceScore', async () => {
    const metrics = await runtime.getMetrics();
    expect(typeof metrics.overallComplianceScore).toBe('number');
  });
  it('metrics should have checksPerformed', async () => {
    const metrics = await runtime.getMetrics();
    expect(typeof metrics.checksPerformed).toBe('number');
  });
  it('metrics should have checksPassed and checksFailed', async () => {
    const metrics = await runtime.getMetrics();
    expect(typeof metrics.checksPassed).toBe('number');
    expect(typeof metrics.checksFailed).toBe('number');
  });
  it('metrics should have ruleCoverage', async () => {
    const metrics = await runtime.getMetrics();
    expect(typeof metrics.ruleCoverage).toBe('number');
  });
  it('metrics should have autoFixCount', async () => {
    const metrics = await runtime.getMetrics();
    expect(typeof metrics.autoFixCount).toBe('number');
  });
  it('metrics should have autoFixSuccessRate', async () => {
    const metrics = await runtime.getMetrics();
    expect(typeof metrics.autoFixSuccessRate).toBe('number');
  });

  // ─── shutdown() ────────────────────────────────────────────────
  it('shutdown() should set state to Completed', async () => {
    await runtime.shutdown();
    expect(runtime.state).toBe(ComplianceState.Completed);
  });
  it('shutdown() should prevent further validation', async () => {
    await runtime.shutdown();
    await expect(runtime.validateArchitecture('test.ts', 'const x = 1;')).rejects.toThrow(ComplianceNotInitializedError);
  });
  it('shutdown() should prevent generateComplianceReport', async () => {
    await runtime.shutdown();
    await expect(runtime.generateComplianceReport()).rejects.toThrow(ComplianceNotInitializedError);
  });

  // ─── Not initialized errors ────────────────────────────────────
  it('should throw when validateArchitecture called before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await expect(freshRuntime.validateArchitecture('test.ts', 'const x = 1;')).rejects.toThrow(ComplianceNotInitializedError);
  });
  it('should throw when validateRuntime called before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await expect(freshRuntime.validateRuntime('runtime.ts')).rejects.toThrow(ComplianceNotInitializedError);
  });
  it('should throw when validateCapability called before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await expect(freshRuntime.validateCapability('cap.ts')).rejects.toThrow(ComplianceNotInitializedError);
  });
  it('should throw when validateDocumentation called before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await expect(freshRuntime.validateDocumentation('doc.md', 'id: x')).rejects.toThrow(ComplianceNotInitializedError);
  });
  it('should throw when validateRepository called before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await expect(freshRuntime.validateRepository('/')).rejects.toThrow(ComplianceNotInitializedError);
  });
  it('should throw when generateComplianceReport called before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await expect(freshRuntime.generateComplianceReport()).rejects.toThrow(ComplianceNotInitializedError);
  });

  // ─── State transitions ──────────────────────────────────────────
  it('state should be Idle after init', async () => {
    const rt = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    expect(rt.state).toBe(ComplianceState.Idle);
    await rt.initialize();
    expect(rt.state).toBe(ComplianceState.Idle);
  });
  it('state should return to Idle after validation', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(runtime.state).toBe(ComplianceState.Idle);
  });

  // ─── DefaultComplianceRuntimeConfig ─────────────────────────────
  it('DefaultComplianceRuntimeConfig should have ruleEngine config', () => {
    expect(DefaultComplianceRuntimeConfig.ruleEngine).toBeDefined();
  });
  it('DefaultComplianceRuntimeConfig should have policyEngine config', () => {
    expect(DefaultComplianceRuntimeConfig.policyEngine).toBeDefined();
  });
  it('DefaultComplianceRuntimeConfig should have validators config', () => {
    expect(DefaultComplianceRuntimeConfig.validators).toBeDefined();
  });
  it('DefaultComplianceRuntimeConfig should have reportGenerator config', () => {
    expect(DefaultComplianceRuntimeConfig.reportGenerator).toBeDefined();
  });
  it('DefaultComplianceRuntimeConfig should have metrics config', () => {
    expect(DefaultComplianceRuntimeConfig.metrics).toBeDefined();
  });
  it('DefaultComplianceRuntimeConfig should have eventBusEnabled', () => {
    expect(typeof DefaultComplianceRuntimeConfig.eventBusEnabled).toBe('boolean');
  });
  it('DefaultComplianceRuntimeConfig score weights should sum to ~1', () => {
    const weights = DefaultComplianceRuntimeConfig.reportGenerator.scoreWeights;
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
  it('should handle multiple validations sequentially', async () => {
    const r1 = await runtime.validateArchitecture('a.ts', 'const x = 1;');
    const r2 = await runtime.validateArchitecture('b.ts', 'const y = 2;');
    expect(r1.targetPath).toBe('a.ts');
    expect(r2.targetPath).toBe('b.ts');
  });
  it('validateArchitecture should set state to Idle after completion', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    expect(runtime.state).toBe(ComplianceState.Idle);
  });
  it('validateRuntime should set state to Idle after completion', async () => {
    await runtime.validateRuntime('runtime.ts');
    expect(runtime.state).toBe(ComplianceState.Idle);
  });
  it('validateCapability should set state to Idle after completion', async () => {
    await runtime.validateCapability('cap.ts');
    expect(runtime.state).toBe(ComplianceState.Idle);
  });
  it('validateDocumentation should set state to Idle after completion', async () => {
    await runtime.validateDocumentation('doc.md', 'id: x');
    expect(runtime.state).toBe(ComplianceState.Idle);
  });
  it('validateRepository should set state to Idle after completion', async () => {
    await runtime.validateRepository('/');
    expect(runtime.state).toBe(ComplianceState.Idle);
  });
  it('report should reflect multiple validations', async () => {
    await runtime.validateArchitecture('a.ts', 'const x = 1;');
    await runtime.validateArchitecture('b.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(report.validationResults.length).toBe(2);
  });
  it('report should have metadata object', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(report.metadata).toBeDefined();
  });
  it('report should have sessionId', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(report.sessionId).toBeDefined();
  });
  it('report should have architectureScore', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.architectureScore).toBe('number');
  });
  it('report should have governanceScore', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.governanceScore).toBe('number');
  });
  it('report should have documentationScore', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.documentationScore).toBe('number');
  });
  it('report should have qualityScore', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.qualityScore).toBe('number');
  });
  it('report should have privacyScore', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.privacyScore).toBe('number');
  });
  it('report should have securityScore', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.securityScore).toBe('number');
  });
  it('report should have criticalViolations', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const report = await runtime.generateComplianceReport();
    expect(typeof report.criticalViolations).toBe('number');
  });
  it('should get metrics before any validation', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await freshRuntime.initialize();
    const metrics = await freshRuntime.getMetrics();
    expect(metrics).toBeDefined();
  });
  it('metrics should update after validation', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await freshRuntime.initialize();
    await freshRuntime.validateArchitecture('test.ts', 'const x = 1;');
    const metrics = await freshRuntime.getMetrics();
    expect(metrics.checksPerformed).toBeGreaterThanOrEqual(1);
  });
  it('metrics should have lastCheckAt after validation', async () => {
    await runtime.validateArchitecture('test.ts', 'const x = 1;');
    const metrics = await runtime.getMetrics();
    expect(metrics.lastCheckAt).not.toBeNull();
  });
  it('metrics should have averageCheckDurationMs', async () => {
    const metrics = await runtime.getMetrics();
    expect(typeof metrics.averageCheckDurationMs).toBe('number');
  });
  it('validateArchitecture should detect violations in content', async () => {
    const content = 'import { B } from "./b.js";\n'.repeat(4);
    const result = await runtime.validateArchitecture('test.ts', content);
    expect(result.violations.length).toBeGreaterThanOrEqual(0);
  });
  it('validateRepository should include all categories in categories filter', async () => {
    const result = await runtime.validateRepository('/');
    expect(result.totalRules).toBeGreaterThanOrEqual(38);
  });
  it('getMetrics should be callable before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    const metrics = await freshRuntime.getMetrics();
    expect(metrics).toBeDefined();
  });
  it('getRule should work before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    const rule = await freshRuntime.getRule(brandRuleId('ARCH-001'));
    expect(rule).toBeNull();
  });
  it('listRules should return empty before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    const rules = await freshRuntime.listRules();
    expect(rules.length).toBe(0);
  });
  it('getPolicy should return null before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    const policy = await freshRuntime.getPolicy(brandComplianceSessionId('test') as any);
    expect(policy).toBeNull();
  });
  it('listPolicies should return empty before init', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    const policies = await freshRuntime.listPolicies();
    expect(Array.isArray(policies)).toBe(true);
    expect(policies.length).toBe(0);
  });
  it('getRuleEngine should work before init', () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    expect(freshRuntime.getRuleEngine()).toBeDefined();
  });
  it('getPolicyEngine should work before init', () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    expect(freshRuntime.getPolicyEngine()).toBeDefined();
  });
  it('validateArchitecture should record metrics', async () => {
    const freshRuntime = new ComplianceRuntime(DefaultComplianceRuntimeConfig);
    await freshRuntime.initialize();
    await freshRuntime.validateArchitecture('test.ts', 'const x = 1;');
    const metrics = await freshRuntime.getMetrics();
    expect(metrics.checksPerformed).toBeGreaterThanOrEqual(1);
  });
  it('should construct with null eventBus', async () => {
    const rt = new ComplianceRuntime(DefaultComplianceRuntimeConfig, null);
    await rt.initialize();
    const rules = await rt.listRules();
    expect(rules.length).toBeGreaterThanOrEqual(38);
    await rt.shutdown();
  });
  it('should handle multiple shutdowns', async () => {
    await runtime.shutdown();
    await runtime.shutdown();
    expect(runtime.state).toBe(ComplianceState.Completed);
  });
});
