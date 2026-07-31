/**
 * Architecture Compliance & Governance Engine — Domain Events
 * TASK-AIS-000Z.000
 *
 * All domain events emitted by the Compliance Runtime.
 * Events are immutable value objects.
 */

import type { Timestamp } from '../types/common.js';
import type {
  RuleId, ViolationId, ComplianceReportId, PolicyId, ComplianceSessionId,
  RuleSeverity, RuleCategory, ComplianceState,
} from './types.js';
import { EventClassification } from '../types/common.js';

// ═══════════════════════════════════════════════════════════════════
// RULE ENGINE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface RulePassedEvent {
  readonly eventType: 'compliance.rule.passed';
  readonly classification: EventClassification;
  readonly ruleId: RuleId;
  readonly ruleName: string;
  readonly category: RuleCategory;
  readonly sessionId: ComplianceSessionId;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RuleFailedEvent {
  readonly eventType: 'compliance.rule.failed';
  readonly classification: EventClassification;
  readonly ruleId: RuleId;
  readonly ruleName: string;
  readonly category: RuleCategory;
  readonly severity: RuleSeverity;
  readonly sessionId: ComplianceSessionId;
  readonly violationCount: number;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RuleRegisteredEvent {
  readonly eventType: 'compliance.rule.registered';
  readonly classification: EventClassification;
  readonly ruleId: RuleId;
  readonly ruleName: string;
  readonly category: RuleCategory;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RuleUnregisteredEvent {
  readonly eventType: 'compliance.rule.unregistered';
  readonly classification: EventClassification;
  readonly ruleId: RuleId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE SESSION EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ComplianceStartedEvent {
  readonly eventType: 'compliance.started';
  readonly classification: EventClassification;
  readonly sessionId: ComplianceSessionId;
  readonly targetType: string;
  readonly targetPath: string;
  readonly rulesToEvaluate: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ComplianceCompletedEvent {
  readonly eventType: 'compliance.completed';
  readonly classification: EventClassification;
  readonly sessionId: ComplianceSessionId;
  readonly state: ComplianceState;
  readonly durationMs: number;
  readonly totalRules: number;
  readonly passedRules: number;
  readonly failedRules: number;
  readonly overallScore: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// VIOLATION EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ViolationDetectedEvent {
  readonly eventType: 'compliance.violation.detected';
  readonly classification: EventClassification;
  readonly violationId: ViolationId;
  readonly ruleId: RuleId;
  readonly ruleName: string;
  readonly category: RuleCategory;
  readonly severity: RuleSeverity;
  readonly target: string;
  readonly description: string;
  readonly sessionId: ComplianceSessionId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ViolationResolvedEvent {
  readonly eventType: 'compliance.violation.resolved';
  readonly classification: EventClassification;
  readonly violationId: ViolationId;
  readonly ruleId: RuleId;
  readonly resolvedAt: Timestamp;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// REPORT EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ReportGeneratedEvent {
  readonly eventType: 'compliance.report.generated';
  readonly classification: EventClassification;
  readonly reportId: ComplianceReportId;
  readonly overallScore: number;
  readonly totalViolations: number;
  readonly criticalViolations: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// POLICY EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface PolicyRegisteredEvent {
  readonly eventType: 'compliance.policy.registered';
  readonly classification: EventClassification;
  readonly policyId: PolicyId;
  readonly policyName: string;
  readonly source: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// EVENT UNION
// ═══════════════════════════════════════════════════════════════════

export type ComplianceEvent =
  | RulePassedEvent
  | RuleFailedEvent
  | RuleRegisteredEvent
  | RuleUnregisteredEvent
  | ComplianceStartedEvent
  | ComplianceCompletedEvent
  | ViolationDetectedEvent
  | ViolationResolvedEvent
  | ReportGeneratedEvent
  | PolicyRegisteredEvent;
