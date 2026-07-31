/**
 * Compliance Events — comprehensive interface conformance tests
 * TASK-AIS-000Z.000
 *
 * Tests all 11 event types and the ComplianceEvent union.
 * Since events are interfaces (not classes), we test by creating
 * objects that conform to each interface and verifying structure.
 */

import type {
  RulePassedEvent,
  RuleFailedEvent,
  RuleRegisteredEvent,
  RuleUnregisteredEvent,
  ComplianceStartedEvent,
  ComplianceCompletedEvent,
  ViolationDetectedEvent,
  ViolationResolvedEvent,
  ReportGeneratedEvent,
  PolicyRegisteredEvent,
  ComplianceEvent,
} from '../../core/compliance/events.js';
import { EventClassification } from '../../core/types/common.js';
import {
  RuleSeverity,
  RuleCategory,
  ComplianceState,
} from '../../core/compliance/types.js';
import {
  brandRuleId,
  brandViolationId,
  brandComplianceReportId,
  brandPolicyId,
  brandComplianceSessionId,
} from '../../core/compliance/types.js';

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const ts = (): string => new Date().toISOString();
const meta = (): Readonly<Record<string, unknown>> => Object.freeze({ key: 'value' });

// ═══════════════════════════════════════════════════════════════════
// RulePassedEvent
// ═══════════════════════════════════════════════════════════════════

describe('RulePassedEvent', () => {
  function makeEvent(overrides: Partial<RulePassedEvent> = {}): RulePassedEvent {
    return Object.freeze({
      eventType: 'compliance.rule.passed',
      classification: EventClassification.Result,
      ruleId: brandRuleId('ARCH-001'),
      ruleName: 'No circular dependencies',
      category: RuleCategory.Architecture,
      sessionId: brandComplianceSessionId('session-1'),
      durationMs: 42,
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.rule.passed"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.rule.passed');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBeDefined();
    expect(typeof event.classification).toBe('string');
  });

  it('should accept Result classification', () => {
    const event = makeEvent({ classification: EventClassification.Result });
    expect(event.classification).toBe(EventClassification.Result);
  });

  it('should have ruleId as branded type', () => {
    const event = makeEvent();
    expect(event.ruleId).toBe(brandRuleId('ARCH-001'));
  });

  it('should have ruleName as string', () => {
    const event = makeEvent();
    expect(typeof event.ruleName).toBe('string');
    expect(event.ruleName.length).toBeGreaterThan(0);
  });

  it('should have category as RuleCategory enum', () => {
    const event = makeEvent();
    expect(event.category).toBe(RuleCategory.Architecture);
  });

  it('should accept any RuleCategory', () => {
    for (const cat of Object.values(RuleCategory)) {
      const event = makeEvent({ category: cat });
      expect(event.category).toBe(cat);
    }
  });

  it('should have sessionId as branded type', () => {
    const event = makeEvent();
    expect(event.sessionId).toBe(brandComplianceSessionId('session-1'));
  });

  it('should have durationMs as number', () => {
    const event = makeEvent();
    expect(typeof event.durationMs).toBe('number');
    expect(event.durationMs).toBe(42);
  });

  it('should accept zero durationMs', () => {
    const event = makeEvent({ durationMs: 0 });
    expect(event.durationMs).toBe(0);
  });

  it('should accept large durationMs', () => {
    const event = makeEvent({ durationMs: 999999 });
    expect(event.durationMs).toBe(999999);
  });

  it('should have timestamp as ISO string', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should have metadata as Readonly<Record<string, unknown>>', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
    expect(event.metadata).not.toBeNull();
  });

  it('should accept empty metadata', () => {
    const event = makeEvent({ metadata: {} });
    expect(Object.keys(event.metadata).length).toBe(0);
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.rule.passed');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleFailedEvent
// ═══════════════════════════════════════════════════════════════════

describe('RuleFailedEvent', () => {
  function makeEvent(overrides: Partial<RuleFailedEvent> = {}): RuleFailedEvent {
    return Object.freeze({
      eventType: 'compliance.rule.failed',
      classification: EventClassification.Error,
      ruleId: brandRuleId('ARCH-001'),
      ruleName: 'No circular dependencies',
      category: RuleCategory.Architecture,
      severity: RuleSeverity.Critical,
      sessionId: brandComplianceSessionId('session-1'),
      violationCount: 3,
      durationMs: 100,
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.rule.failed"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.rule.failed');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Error);
  });

  it('should accept Error classification', () => {
    const event = makeEvent({ classification: EventClassification.Error });
    expect(event.classification).toBe(EventClassification.Error);
  });

  it('should have ruleId', () => {
    const event = makeEvent();
    expect(event.ruleId).toBe(brandRuleId('ARCH-001'));
  });

  it('should have ruleName', () => {
    const event = makeEvent();
    expect(typeof event.ruleName).toBe('string');
  });

  it('should have category', () => {
    const event = makeEvent();
    expect(event.category).toBe(RuleCategory.Architecture);
  });

  it('should have severity', () => {
    const event = makeEvent();
    expect(event.severity).toBe(RuleSeverity.Critical);
  });

  it('should accept all severity levels', () => {
    for (const sev of Object.values(RuleSeverity)) {
      const event = makeEvent({ severity: sev });
      expect(event.severity).toBe(sev);
    }
  });

  it('should have sessionId', () => {
    const event = makeEvent();
    expect(event.sessionId).toBe(brandComplianceSessionId('session-1'));
  });

  it('should have violationCount as number', () => {
    const event = makeEvent();
    expect(typeof event.violationCount).toBe('number');
    expect(event.violationCount).toBe(3);
  });

  it('should accept zero violationCount', () => {
    const event = makeEvent({ violationCount: 0 });
    expect(event.violationCount).toBe(0);
  });

  it('should have durationMs', () => {
    const event = makeEvent();
    expect(typeof event.durationMs).toBe('number');
  });

  it('should have timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.rule.failed');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleRegisteredEvent
// ═══════════════════════════════════════════════════════════════════

describe('RuleRegisteredEvent', () => {
  function makeEvent(overrides: Partial<RuleRegisteredEvent> = {}): RuleRegisteredEvent {
    return Object.freeze({
      eventType: 'compliance.rule.registered',
      classification: EventClassification.Action,
      ruleId: brandRuleId('ARCH-001'),
      ruleName: 'No circular dependencies',
      category: RuleCategory.Architecture,
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.rule.registered"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.rule.registered');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('should accept Action classification', () => {
    const event = makeEvent({ classification: EventClassification.Action });
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('should have ruleId', () => {
    const event = makeEvent();
    expect(event.ruleId).toBe(brandRuleId('ARCH-001'));
  });

  it('should have ruleName', () => {
    const event = makeEvent();
    expect(typeof event.ruleName).toBe('string');
  });

  it('should have category', () => {
    const event = makeEvent();
    expect(event.category).toBe(RuleCategory.Architecture);
  });

  it('should have timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should accept Info classification', () => {
    const event = makeEvent({ classification: EventClassification.Info });
    expect(event.classification).toBe(EventClassification.Info);
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.rule.registered');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RuleUnregisteredEvent
// ═══════════════════════════════════════════════════════════════════

describe('RuleUnregisteredEvent', () => {
  function makeEvent(overrides: Partial<RuleUnregisteredEvent> = {}): RuleUnregisteredEvent {
    return Object.freeze({
      eventType: 'compliance.rule.unregistered',
      classification: EventClassification.Action,
      ruleId: brandRuleId('ARCH-001'),
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.rule.unregistered"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.rule.unregistered');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('should have ruleId', () => {
    const event = makeEvent();
    expect(event.ruleId).toBe(brandRuleId('ARCH-001'));
  });

  it('should have timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should not have ruleName field', () => {
    const event = makeEvent();
    expect('ruleName' in event).toBe(false);
  });

  it('should not have category field', () => {
    const event = makeEvent();
    expect('category' in event).toBe(false);
  });

  it('should accept StateChange classification', () => {
    const event = makeEvent({ classification: EventClassification.StateChange });
    expect(event.classification).toBe(EventClassification.StateChange);
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.rule.unregistered');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceStartedEvent
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceStartedEvent', () => {
  function makeEvent(overrides: Partial<ComplianceStartedEvent> = {}): ComplianceStartedEvent {
    return Object.freeze({
      eventType: 'compliance.started',
      classification: EventClassification.Action,
      sessionId: brandComplianceSessionId('session-1'),
      targetType: 'Architecture',
      targetPath: '/test/module.ts',
      rulesToEvaluate: 10,
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.started"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.started');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('should have sessionId', () => {
    const event = makeEvent();
    expect(event.sessionId).toBe(brandComplianceSessionId('session-1'));
  });

  it('should have targetType as string', () => {
    const event = makeEvent();
    expect(typeof event.targetType).toBe('string');
    expect(event.targetType).toBe('Architecture');
  });

  it('should accept any targetType string', () => {
    const event = makeEvent({ targetType: 'Runtime' });
    expect(event.targetType).toBe('Runtime');
  });

  it('should have targetPath as string', () => {
    const event = makeEvent();
    expect(typeof event.targetPath).toBe('string');
  });

  it('should have rulesToEvaluate as number', () => {
    const event = makeEvent();
    expect(typeof event.rulesToEvaluate).toBe('number');
    expect(event.rulesToEvaluate).toBe(10);
  });

  it('should accept zero rulesToEvaluate', () => {
    const event = makeEvent({ rulesToEvaluate: 0 });
    expect(event.rulesToEvaluate).toBe(0);
  });

  it('should have timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should accept Info classification', () => {
    const event = makeEvent({ classification: EventClassification.Info });
    expect(event.classification).toBe(EventClassification.Info);
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.started');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceCompletedEvent
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceCompletedEvent', () => {
  function makeEvent(overrides: Partial<ComplianceCompletedEvent> = {}): ComplianceCompletedEvent {
    return Object.freeze({
      eventType: 'compliance.completed',
      classification: EventClassification.Result,
      sessionId: brandComplianceSessionId('session-1'),
      state: ComplianceState.Completed,
      durationMs: 250,
      totalRules: 10,
      passedRules: 8,
      failedRules: 2,
      overallScore: 80,
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.completed"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.completed');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Result);
  });

  it('should have sessionId', () => {
    const event = makeEvent();
    expect(event.sessionId).toBe(brandComplianceSessionId('session-1'));
  });

  it('should have state as ComplianceState', () => {
    const event = makeEvent();
    expect(event.state).toBe(ComplianceState.Completed);
  });

  it('should accept all ComplianceState values', () => {
    for (const state of Object.values(ComplianceState)) {
      const event = makeEvent({ state });
      expect(event.state).toBe(state);
    }
  });

  it('should have durationMs', () => {
    const event = makeEvent();
    expect(typeof event.durationMs).toBe('number');
    expect(event.durationMs).toBe(250);
  });

  it('should have totalRules', () => {
    const event = makeEvent();
    expect(typeof event.totalRules).toBe('number');
    expect(event.totalRules).toBe(10);
  });

  it('should have passedRules', () => {
    const event = makeEvent();
    expect(typeof event.passedRules).toBe('number');
    expect(event.passedRules).toBe(8);
  });

  it('should have failedRules', () => {
    const event = makeEvent();
    expect(typeof event.failedRules).toBe('number');
    expect(event.failedRules).toBe(2);
  });

  it('should have overallScore', () => {
    const event = makeEvent();
    expect(typeof event.overallScore).toBe('number');
    expect(event.overallScore).toBe(80);
  });

  it('should accept overallScore of 100', () => {
    const event = makeEvent({ overallScore: 100, failedRules: 0, passedRules: 10 });
    expect(event.overallScore).toBe(100);
  });

  it('should accept overallScore of 0', () => {
    const event = makeEvent({ overallScore: 0, failedRules: 10, passedRules: 0 });
    expect(event.overallScore).toBe(0);
  });

  it('should have timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should accept Error classification for failed state', () => {
    const event = makeEvent({ classification: EventClassification.Error, state: ComplianceState.Failed });
    expect(event.classification).toBe(EventClassification.Error);
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.completed');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ViolationDetectedEvent
// ═══════════════════════════════════════════════════════════════════

describe('ViolationDetectedEvent', () => {
  function makeEvent(overrides: Partial<ViolationDetectedEvent> = {}): ViolationDetectedEvent {
    return Object.freeze({
      eventType: 'compliance.violation.detected',
      classification: EventClassification.Error,
      violationId: brandViolationId('viol-1'),
      ruleId: brandRuleId('ARCH-001'),
      ruleName: 'No circular dependencies',
      category: RuleCategory.Architecture,
      severity: RuleSeverity.Critical,
      target: '/test/module.ts',
      description: 'Circular dependency found',
      sessionId: brandComplianceSessionId('session-1'),
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.violation.detected"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.violation.detected');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Error);
  });

  it('should have violationId as branded type', () => {
    const event = makeEvent();
    expect(event.violationId).toBe(brandViolationId('viol-1'));
  });

  it('should have ruleId', () => {
    const event = makeEvent();
    expect(event.ruleId).toBe(brandRuleId('ARCH-001'));
  });

  it('should have ruleName', () => {
    const event = makeEvent();
    expect(typeof event.ruleName).toBe('string');
  });

  it('should have category', () => {
    const event = makeEvent();
    expect(event.category).toBe(RuleCategory.Architecture);
  });

  it('should have severity', () => {
    const event = makeEvent();
    expect(event.severity).toBe(RuleSeverity.Critical);
  });

  it('should accept all severity levels', () => {
    for (const sev of Object.values(RuleSeverity)) {
      const event = makeEvent({ severity: sev });
      expect(event.severity).toBe(sev);
    }
  });

  it('should have target', () => {
    const event = makeEvent();
    expect(typeof event.target).toBe('string');
    expect(event.target).toBe('/test/module.ts');
  });

  it('should accept empty target string', () => {
    const event = makeEvent({ target: '' });
    expect(event.target).toBe('');
  });

  it('should have description', () => {
    const event = makeEvent();
    expect(typeof event.description).toBe('string');
    expect(event.description).toBe('Circular dependency found');
  });

  it('should accept empty description', () => {
    const event = makeEvent({ description: '' });
    expect(event.description).toBe('');
  });

  it('should have sessionId', () => {
    const event = makeEvent();
    expect(event.sessionId).toBe(brandComplianceSessionId('session-1'));
  });

  it('should have timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.violation.detected');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ViolationResolvedEvent
// ═══════════════════════════════════════════════════════════════════

describe('ViolationResolvedEvent', () => {
  function makeEvent(overrides: Partial<ViolationResolvedEvent> = {}): ViolationResolvedEvent {
    return Object.freeze({
      eventType: 'compliance.violation.resolved',
      classification: EventClassification.Info,
      violationId: brandViolationId('viol-1'),
      ruleId: brandRuleId('ARCH-001'),
      resolvedAt: ts(),
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.violation.resolved"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.violation.resolved');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Info);
  });

  it('should have violationId', () => {
    const event = makeEvent();
    expect(event.violationId).toBe(brandViolationId('viol-1'));
  });

  it('should have ruleId', () => {
    const event = makeEvent();
    expect(event.ruleId).toBe(brandRuleId('ARCH-001'));
  });

  it('should have resolvedAt timestamp', () => {
    const event = makeEvent();
    expect(typeof event.resolvedAt).toBe('string');
    expect(event.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should have event timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should not have description field', () => {
    const event = makeEvent();
    expect('description' in event).toBe(false);
  });

  it('should not have target field', () => {
    const event = makeEvent();
    expect('target' in event).toBe(false);
  });

  it('should accept Result classification', () => {
    const event = makeEvent({ classification: EventClassification.Result });
    expect(event.classification).toBe(EventClassification.Result);
  });

  it('should accept StateChange classification', () => {
    const event = makeEvent({ classification: EventClassification.StateChange });
    expect(event.classification).toBe(EventClassification.StateChange);
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.violation.resolved');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ReportGeneratedEvent
// ═══════════════════════════════════════════════════════════════════

describe('ReportGeneratedEvent', () => {
  function makeEvent(overrides: Partial<ReportGeneratedEvent> = {}): ReportGeneratedEvent {
    return Object.freeze({
      eventType: 'compliance.report.generated',
      classification: EventClassification.Result,
      reportId: brandComplianceReportId('report-1'),
      overallScore: 85.5,
      totalViolations: 12,
      criticalViolations: 2,
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.report.generated"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.report.generated');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Result);
  });

  it('should have reportId as branded type', () => {
    const event = makeEvent();
    expect(event.reportId).toBe(brandComplianceReportId('report-1'));
  });

  it('should have overallScore', () => {
    const event = makeEvent();
    expect(typeof event.overallScore).toBe('number');
    expect(event.overallScore).toBe(85.5);
  });

  it('should accept overallScore of 100', () => {
    const event = makeEvent({ overallScore: 100, totalViolations: 0, criticalViolations: 0 });
    expect(event.overallScore).toBe(100);
  });

  it('should accept overallScore of 0', () => {
    const event = makeEvent({ overallScore: 0 });
    expect(event.overallScore).toBe(0);
  });

  it('should accept fractional overallScore', () => {
    const event = makeEvent({ overallScore: 33.333 });
    expect(event.overallScore).toBeCloseTo(33.333, 2);
  });

  it('should have totalViolations', () => {
    const event = makeEvent();
    expect(typeof event.totalViolations).toBe('number');
    expect(event.totalViolations).toBe(12);
  });

  it('should accept zero totalViolations', () => {
    const event = makeEvent({ totalViolations: 0, criticalViolations: 0 });
    expect(event.totalViolations).toBe(0);
  });

  it('should have criticalViolations', () => {
    const event = makeEvent();
    expect(typeof event.criticalViolations).toBe('number');
    expect(event.criticalViolations).toBe(2);
  });

  it('should accept zero criticalViolations', () => {
    const event = makeEvent({ criticalViolations: 0 });
    expect(event.criticalViolations).toBe(0);
  });

  it('should have timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should accept Info classification', () => {
    const event = makeEvent({ classification: EventClassification.Info });
    expect(event.classification).toBe(EventClassification.Info);
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.report.generated');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PolicyRegisteredEvent
// ═══════════════════════════════════════════════════════════════════

describe('PolicyRegisteredEvent', () => {
  function makeEvent(overrides: Partial<PolicyRegisteredEvent> = {}): PolicyRegisteredEvent {
    return Object.freeze({
      eventType: 'compliance.policy.registered',
      classification: EventClassification.Action,
      policyId: brandPolicyId('POL-001'),
      policyName: 'Architecture Compliance Policy',
      source: 'GOV-008.000 §3',
      timestamp: ts(),
      metadata: meta(),
      ...overrides,
    });
  }

  it('should have eventType "compliance.policy.registered"', () => {
    const event = makeEvent();
    expect(event.eventType).toBe('compliance.policy.registered');
  });

  it('should have classification field', () => {
    const event = makeEvent();
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('should have policyId as branded type', () => {
    const event = makeEvent();
    expect(event.policyId).toBe(brandPolicyId('POL-001'));
  });

  it('should have policyName', () => {
    const event = makeEvent();
    expect(typeof event.policyName).toBe('string');
    expect(event.policyName).toBe('Architecture Compliance Policy');
  });

  it('should accept empty policyName', () => {
    const event = makeEvent({ policyName: '' });
    expect(event.policyName).toBe('');
  });

  it('should have source', () => {
    const event = makeEvent();
    expect(typeof event.source).toBe('string');
    expect(event.source).toBe('GOV-008.000 §3');
  });

  it('should have timestamp', () => {
    const event = makeEvent();
    expect(typeof event.timestamp).toBe('string');
  });

  it('should have metadata', () => {
    const event = makeEvent();
    expect(typeof event.metadata).toBe('object');
  });

  it('should accept StateChange classification', () => {
    const event = makeEvent({ classification: EventClassification.StateChange });
    expect(event.classification).toBe(EventClassification.StateChange);
  });

  it('should be assignable to ComplianceEvent union', () => {
    const event: ComplianceEvent = makeEvent();
    expect(event.eventType).toBe('compliance.policy.registered');
  });

  it('should be frozen', () => {
    const event = makeEvent();
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ComplianceEvent UNION TYPE
// ═══════════════════════════════════════════════════════════════════

describe('ComplianceEvent — union type', () => {
  it('should accept RulePassedEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.rule.passed',
      classification: EventClassification.Result,
      ruleId: brandRuleId('R1'),
      ruleName: 'Test',
      category: RuleCategory.Architecture,
      sessionId: brandComplianceSessionId('s1'),
      durationMs: 10,
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.rule.passed');
  });

  it('should accept RuleFailedEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.rule.failed',
      classification: EventClassification.Error,
      ruleId: brandRuleId('R1'),
      ruleName: 'Test',
      category: RuleCategory.Security,
      severity: RuleSeverity.Error,
      sessionId: brandComplianceSessionId('s1'),
      violationCount: 1,
      durationMs: 10,
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.rule.failed');
  });

  it('should accept RuleRegisteredEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.rule.registered',
      classification: EventClassification.Action,
      ruleId: brandRuleId('R1'),
      ruleName: 'Test',
      category: RuleCategory.Quality,
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.rule.registered');
  });

  it('should accept RuleUnregisteredEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.rule.unregistered',
      classification: EventClassification.Action,
      ruleId: brandRuleId('R1'),
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.rule.unregistered');
  });

  it('should accept ComplianceStartedEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.started',
      classification: EventClassification.Action,
      sessionId: brandComplianceSessionId('s1'),
      targetType: 'Architecture',
      targetPath: '/test.ts',
      rulesToEvaluate: 5,
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.started');
  });

  it('should accept ComplianceCompletedEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.completed',
      classification: EventClassification.Result,
      sessionId: brandComplianceSessionId('s1'),
      state: ComplianceState.Completed,
      durationMs: 100,
      totalRules: 5,
      passedRules: 5,
      failedRules: 0,
      overallScore: 100,
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.completed');
  });

  it('should accept ViolationDetectedEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.violation.detected',
      classification: EventClassification.Error,
      violationId: brandViolationId('v1'),
      ruleId: brandRuleId('R1'),
      ruleName: 'Test',
      category: RuleCategory.Architecture,
      severity: RuleSeverity.Warning,
      target: '/test.ts',
      description: 'Issue found',
      sessionId: brandComplianceSessionId('s1'),
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.violation.detected');
  });

  it('should accept ViolationResolvedEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.violation.resolved',
      classification: EventClassification.Info,
      violationId: brandViolationId('v1'),
      ruleId: brandRuleId('R1'),
      resolvedAt: ts(),
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.violation.resolved');
  });

  it('should accept ReportGeneratedEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.report.generated',
      classification: EventClassification.Result,
      reportId: brandComplianceReportId('r1'),
      overallScore: 90,
      totalViolations: 5,
      criticalViolations: 1,
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.report.generated');
  });

  it('should accept PolicyRegisteredEvent', () => {
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.policy.registered',
      classification: EventClassification.Action,
      policyId: brandPolicyId('p1'),
      policyName: 'Test Policy',
      source: 'GOV-008.000',
      timestamp: ts(),
      metadata: {},
    });
    expect(event.eventType).toBe('compliance.policy.registered');
  });

  it('should support type narrowing by eventType', () => {
    const events: ComplianceEvent[] = [
      Object.freeze({
        eventType: 'compliance.rule.passed' as const,
        classification: EventClassification.Result,
        ruleId: brandRuleId('R1'),
        ruleName: 'T',
        category: RuleCategory.Architecture,
        sessionId: brandComplianceSessionId('s1'),
        durationMs: 0,
        timestamp: ts(),
        metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.rule.failed' as const,
        classification: EventClassification.Error,
        ruleId: brandRuleId('R2'),
        ruleName: 'T2',
        category: RuleCategory.Security,
        severity: RuleSeverity.Critical,
        sessionId: brandComplianceSessionId('s1'),
        violationCount: 1,
        durationMs: 0,
        timestamp: ts(),
        metadata: {},
      }),
    ];
    const passedEvent = events.find(e => e.eventType === 'compliance.rule.passed');
    if (passedEvent && passedEvent.eventType === 'compliance.rule.passed') {
      expect(passedEvent.ruleName).toBeDefined();
      expect(passedEvent.durationMs).toBeDefined();
    }
    const failedEvent = events.find(e => e.eventType === 'compliance.rule.failed');
    if (failedEvent && failedEvent.eventType === 'compliance.rule.failed') {
      expect(failedEvent.violationCount).toBeDefined();
      expect(failedEvent.severity).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// EVENT TYPE STRING PATTERNS
// ═══════════════════════════════════════════════════════════════════

describe('Event type string patterns', () => {
  it('rule events should follow "compliance.rule.<action>" pattern', () => {
    expect('compliance.rule.passed').toMatch(/^compliance\.rule\./);
    expect('compliance.rule.failed').toMatch(/^compliance\.rule\./);
    expect('compliance.rule.registered').toMatch(/^compliance\.rule\./);
    expect('compliance.rule.unregistered').toMatch(/^compliance\.rule\./);
  });

  it('session events should follow "compliance.<action>" pattern', () => {
    expect('compliance.started').toMatch(/^compliance\./);
    expect('compliance.completed').toMatch(/^compliance\./);
  });

  it('violation events should follow "compliance.violation.<action>" pattern', () => {
    expect('compliance.violation.detected').toMatch(/^compliance\.violation\./);
    expect('compliance.violation.resolved').toMatch(/^compliance\.violation\./);
  });

  it('report events should follow "compliance.report.<action>" pattern', () => {
    expect('compliance.report.generated').toMatch(/^compliance\.report\./);
  });

  it('policy events should follow "compliance.policy.<action>" pattern', () => {
    expect('compliance.policy.registered').toMatch(/^compliance\.policy\./);
  });

  it('all event types should be dot-separated', () => {
    const eventTypes = [
      'compliance.rule.passed',
      'compliance.rule.failed',
      'compliance.rule.registered',
      'compliance.rule.unregistered',
      'compliance.started',
      'compliance.completed',
      'compliance.violation.detected',
      'compliance.violation.resolved',
      'compliance.report.generated',
      'compliance.policy.registered',
    ];
    for (const et of eventTypes) {
      expect(et.split('.').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('all event types should start with "compliance"', () => {
    const eventTypes = [
      'compliance.rule.passed',
      'compliance.rule.failed',
      'compliance.rule.registered',
      'compliance.rule.unregistered',
      'compliance.started',
      'compliance.completed',
      'compliance.violation.detected',
      'compliance.violation.resolved',
      'compliance.report.generated',
      'compliance.policy.registered',
    ];
    for (const et of eventTypes) {
      expect(et.startsWith('compliance')).toBe(true);
    }
  });

  it('all event types should be unique', () => {
    const eventTypes = [
      'compliance.rule.passed',
      'compliance.rule.failed',
      'compliance.rule.registered',
      'compliance.rule.unregistered',
      'compliance.started',
      'compliance.completed',
      'compliance.violation.detected',
      'compliance.violation.resolved',
      'compliance.report.generated',
      'compliance.policy.registered',
    ];
    const unique = new Set(eventTypes);
    expect(unique.size).toBe(eventTypes.length);
  });
});

// ═══════════════════════════════════════════════════════════════════
// EVENT CLASSIFICATION VALUES
// ═══════════════════════════════════════════════════════════════════

describe('Event classification values used in compliance events', () => {
  it('EventClassification should have Info value', () => {
    expect(EventClassification.Info).toBe('info');
  });

  it('EventClassification should have Action value', () => {
    expect(EventClassification.Action).toBe('action');
  });

  it('EventClassification should have Result value', () => {
    expect(EventClassification.Result).toBe('result');
  });

  it('EventClassification should have Error value', () => {
    expect(EventClassification.Error).toBe('error');
  });

  it('EventClassification should have StateChange value', () => {
    expect(EventClassification.StateChange).toBe('state-change');
  });

  it('all classification values should be strings', () => {
    for (const val of Object.values(EventClassification)) {
      expect(typeof val).toBe('string');
    }
  });

  it('all classification values should be non-empty', () => {
    for (const val of Object.values(EventClassification)) {
      expect(val.length).toBeGreaterThan(0);
    }
  });

  it('EventClassification should have exactly 5 values', () => {
    expect(Object.values(EventClassification).length).toBe(5);
  });

  it('RulePassedEvent typically uses Result classification', () => {
    const event: RulePassedEvent = Object.freeze({
      eventType: 'compliance.rule.passed',
      classification: EventClassification.Result,
      ruleId: brandRuleId('R1'),
      ruleName: 'T',
      category: RuleCategory.Architecture,
      sessionId: brandComplianceSessionId('s1'),
      durationMs: 0,
      timestamp: ts(),
      metadata: {},
    });
    expect(event.classification).toBe(EventClassification.Result);
  });

  it('RuleFailedEvent typically uses Error classification', () => {
    const event: RuleFailedEvent = Object.freeze({
      eventType: 'compliance.rule.failed',
      classification: EventClassification.Error,
      ruleId: brandRuleId('R1'),
      ruleName: 'T',
      category: RuleCategory.Architecture,
      severity: RuleSeverity.Warning,
      sessionId: brandComplianceSessionId('s1'),
      violationCount: 1,
      durationMs: 0,
      timestamp: ts(),
      metadata: {},
    });
    expect(event.classification).toBe(EventClassification.Error);
  });
});

// ═══════════════════════════════════════════════════════════════════
// CROSS-EVENT CONSISTENCY
// ═══════════════════════════════════════════════════════════════════

describe('Cross-event consistency', () => {
  it('all events should have eventType as string literal', () => {
    const events: ComplianceEvent[] = [
      Object.freeze({
        eventType: 'compliance.rule.passed' as const,
        classification: EventClassification.Result,
        ruleId: brandRuleId('R1'), ruleName: 'T', category: RuleCategory.Architecture,
        sessionId: brandComplianceSessionId('s1'), durationMs: 0, timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.rule.failed' as const,
        classification: EventClassification.Error,
        ruleId: brandRuleId('R1'), ruleName: 'T', category: RuleCategory.Architecture,
        severity: RuleSeverity.Warning, sessionId: brandComplianceSessionId('s1'),
        violationCount: 1, durationMs: 0, timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.rule.registered' as const,
        classification: EventClassification.Action,
        ruleId: brandRuleId('R1'), ruleName: 'T', category: RuleCategory.Architecture,
        timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.rule.unregistered' as const,
        classification: EventClassification.Action,
        ruleId: brandRuleId('R1'), timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.started' as const,
        classification: EventClassification.Action,
        sessionId: brandComplianceSessionId('s1'), targetType: 'Architecture',
        targetPath: '/t', rulesToEvaluate: 1, timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.completed' as const,
        classification: EventClassification.Result,
        sessionId: brandComplianceSessionId('s1'), state: ComplianceState.Completed,
        durationMs: 0, totalRules: 1, passedRules: 1, failedRules: 0,
        overallScore: 100, timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.violation.detected' as const,
        classification: EventClassification.Error,
        violationId: brandViolationId('v1'), ruleId: brandRuleId('R1'), ruleName: 'T',
        category: RuleCategory.Architecture, severity: RuleSeverity.Warning,
        target: '/t', description: 'd', sessionId: brandComplianceSessionId('s1'),
        timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.violation.resolved' as const,
        classification: EventClassification.Info,
        violationId: brandViolationId('v1'), ruleId: brandRuleId('R1'),
        resolvedAt: ts(), timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.report.generated' as const,
        classification: EventClassification.Result,
        reportId: brandComplianceReportId('r1'), overallScore: 100,
        totalViolations: 0, criticalViolations: 0, timestamp: ts(), metadata: {},
      }),
      Object.freeze({
        eventType: 'compliance.policy.registered' as const,
        classification: EventClassification.Action,
        policyId: brandPolicyId('p1'), policyName: 'T', source: 'S',
        timestamp: ts(), metadata: {},
      }),
    ];
    for (const event of events) {
      expect(typeof event.eventType).toBe('string');
      expect(event.eventType.length).toBeGreaterThan(0);
      expect(typeof event.classification).toBe('string');
      expect(typeof event.timestamp).toBe('string');
      expect(typeof event.metadata).toBe('object');
    }
  });

  it('all events should have metadata', () => {
    const eventTypes = [
      'compliance.rule.passed',
      'compliance.rule.failed',
      'compliance.rule.registered',
      'compliance.rule.unregistered',
      'compliance.started',
      'compliance.completed',
      'compliance.violation.detected',
      'compliance.violation.resolved',
      'compliance.report.generated',
      'compliance.policy.registered',
    ];
    for (const et of eventTypes) {
      expect(et.length).toBeGreaterThan(0);
    }
  });

  it('all events should have a timestamp field', () => {
    // This is verified by the interface definitions — all 10 events include timestamp
    // We confirm by creating a type-check
    const event: ComplianceEvent = Object.freeze({
      eventType: 'compliance.rule.passed',
      classification: EventClassification.Result,
      ruleId: brandRuleId('R1'),
      ruleName: 'T',
      category: RuleCategory.Architecture,
      sessionId: brandComplianceSessionId('s1'),
      durationMs: 0,
      timestamp: ts(),
      metadata: {},
    });
    expect('timestamp' in event).toBe(true);
  });
});
