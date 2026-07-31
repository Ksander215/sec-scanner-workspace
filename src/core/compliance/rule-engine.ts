/**
 * Architecture Compliance & Governance Engine — Rule Engine Implementation
 * TASK-AIS-000Z.000
 *
 * Manages compliance rules: registration, evaluation, enable/disable.
 * Stores rules and externally-registered validator functions in Map-based storage.
 * Publishes domain events via InProcessEventBus when available.
 */

import type { IRuleEngine } from './contracts.js';
import type {
  RuleId,
  ComplianceRule,
  RuleEvaluationResult,
  ValidationRequest,
  ValidationResult,
  RuleEngineConfig,
  RuleCategory,
  ComplianceSessionId,
} from './types.js';
import {
  RuleSeverity,
  ComplianceState,
} from './types.js';
import {
  RuleAlreadyRegisteredError,
  RuleNotFoundError,
  RuleEvaluationTimeoutError,
} from './errors.js';
import type {
  RulePassedEvent,
  RuleFailedEvent,
  RuleRegisteredEvent,
  RuleUnregisteredEvent,
  ComplianceStartedEvent,
  ComplianceCompletedEvent,
} from './events.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';

/**
 * Rule Engine — manages rule registration, evaluation, and lifecycle.
 *
 * Conforms to IRuleEngine from contracts.ts.
 * Uses Map-based storage for rules and externally-registered validator functions.
 */
export class RuleEngine implements IRuleEngine {
  private readonly config: RuleEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly rules = new Map<string, ComplianceRule>();
  private readonly validators = new Map<
    string,
    (request: ValidationRequest) => Promise<RuleEvaluationResult>
  >();

  constructor(config: RuleEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  // ─── Validator Function Registration ────────────────────────────

  /**
   * Register an external validator function for a rule.
   * Called by validators to bind their evaluation logic to a rule ID.
   */
  async registerValidatorFunction(
    ruleId: RuleId,
    validator: (request: ValidationRequest) => Promise<RuleEvaluationResult>,
  ): Promise<void> {
    this.validators.set(ruleId as string, validator);
  }

  // ─── Rule Registration ─────────────────────────────────────────

  async registerRule(rule: ComplianceRule): Promise<void> {
    const id = rule.id as string;

    if (this.rules.has(id)) {
      throw new RuleAlreadyRegisteredError(id);
    }

    const frozenRule: ComplianceRule = Object.freeze({ ...rule });
    this.rules.set(id, frozenRule);

    const event: RuleRegisteredEvent & DomainEventBase = Object.freeze({
      eventType: 'compliance.rule.registered',
      classification: EventClassification.Action,
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      timestamp: new Date().toISOString(),
      metadata: { ...rule.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: id,
      aggregateType: 'ComplianceRule',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  // ─── Rule Unregistration ───────────────────────────────────────

  async unregisterRule(ruleId: RuleId): Promise<void> {
    const id = ruleId as string;

    if (!this.rules.has(id)) {
      throw new RuleNotFoundError(id);
    }

    this.rules.delete(id);
    this.validators.delete(id);

    const event: RuleUnregisteredEvent & DomainEventBase = Object.freeze({
      eventType: 'compliance.rule.unregistered',
      classification: EventClassification.Action,
      ruleId,
      timestamp: new Date().toISOString(),
      metadata: {},
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: id,
      aggregateType: 'ComplianceRule',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  // ─── Queries ──────────────────────────────────────────────────

  async getRule(ruleId: RuleId): Promise<ComplianceRule | null> {
    return this.rules.get(ruleId as string) ?? null;
  }

  async listRules(
    filter?: Partial<{ category: RuleCategory; severity: RuleSeverity; enabled: boolean }>,
  ): Promise<readonly ComplianceRule[]> {
    if (!filter) {
      return Array.from(this.rules.values());
    }

    const result: ComplianceRule[] = [];
    for (const rule of this.rules.values()) {
      if (filter.category !== undefined && rule.category !== filter.category) {
        continue;
      }
      if (filter.severity !== undefined && rule.severity !== filter.severity) {
        continue;
      }
      if (filter.enabled !== undefined && rule.enabled !== filter.enabled) {
        continue;
      }
      result.push(rule);
    }

    return result;
  }

  // ─── Single Rule Evaluation ────────────────────────────────────

  async evaluateRule(
    ruleId: RuleId,
    request: ValidationRequest,
  ): Promise<RuleEvaluationResult> {
    const id = ruleId as string;
    const rule = this.rules.get(id);

    if (!rule) {
      throw new RuleNotFoundError(id);
    }

    const validator = this.validators.get(id);

    if (!validator) {
      const noValidatorResult: RuleEvaluationResult = Object.freeze({
        ruleId,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: false,
        violations: [],
        durationMs: 0,
        autoFixed: false,
        metadata: { error: 'No validator registered for rule' },
      });

      await this.publishRuleFailedEvent(rule, request.sessionId, 0, 0);
      return noValidatorResult;
    }

    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new RuleEvaluationTimeoutError(id, this.config.evaluationTimeoutMs)),
          this.config.evaluationTimeoutMs,
        );
      });

      const result = await Promise.race([validator(request), timeoutPromise]);
      const durationMs = Date.now() - startTime;

      if (result.passed) {
        await this.publishRulePassedEvent(rule, request.sessionId, durationMs);
      } else {
        await this.publishRuleFailedEvent(rule, request.sessionId, result.violations.length, durationMs);
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown evaluation error';

      const failedResult: RuleEvaluationResult = Object.freeze({
        ruleId,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: false,
        violations: [],
        durationMs,
        autoFixed: false,
        metadata: { error: errorMessage },
      });

      await this.publishRuleFailedEvent(rule, request.sessionId, 0, durationMs);
      return failedResult;
    }
  }

  // ─── Batch Evaluation ──────────────────────────────────────────

  async evaluateRules(request: ValidationRequest): Promise<ValidationResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const rulesToEvaluate = this.selectRulesForEvaluation(request);

    await this.publishComplianceStartedEvent(request, rulesToEvaluate.length);

    const results: RuleEvaluationResult[] = [];
    let passedRules = 0;
    let failedRules = 0;
    let autoFixedCount = 0;

    for (const rule of rulesToEvaluate) {
      const result = await this.evaluateRule(rule.id, request);
      results.push(result);

      if (result.passed) {
        passedRules++;
      } else {
        failedRules++;

        if (this.config.failFast && rule.severity === RuleSeverity.Critical) {
          break;
        }
      }

      if (this.config.autoFixEnabled && result.autoFixed) {
        autoFixedCount++;
      }
    }

    const skippedRules = rulesToEvaluate.length - results.length;
    const durationMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    const state: ComplianceState =
      failedRules === 0
        ? ComplianceState.Completed
        : results.length < rulesToEvaluate.length
          ? ComplianceState.PartiallyCompleted
          : ComplianceState.Completed;

    const allViolations = results.flatMap((r) => [...r.violations]);

    const overallScore =
      rulesToEvaluate.length > 0
        ? (passedRules / rulesToEvaluate.length) * 100
        : 100;

    const validationResult: ValidationResult = Object.freeze({
      sessionId: request.sessionId,
      targetType: request.targetType,
      targetPath: request.targetPath,
      startedAt,
      completedAt,
      durationMs,
      results,
      totalRules: rulesToEvaluate.length,
      passedRules,
      failedRules,
      skippedRules,
      violations: allViolations,
      autoFixedCount,
      state,
    });

    await this.publishComplianceCompletedEvent(request, validationResult, overallScore);

    return validationResult;
  }

  // ─── Enable / Disable ──────────────────────────────────────────

  async enableRule(ruleId: RuleId): Promise<void> {
    const id = ruleId as string;
    const rule = this.rules.get(id);

    if (!rule) {
      throw new RuleNotFoundError(id);
    }

    if (rule.enabled) {
      return;
    }

    const enabledRule: ComplianceRule = Object.freeze({
      ...rule,
      enabled: true,
    });

    this.rules.set(id, enabledRule);
  }

  async disableRule(ruleId: RuleId): Promise<void> {
    const id = ruleId as string;
    const rule = this.rules.get(id);

    if (!rule) {
      throw new RuleNotFoundError(id);
    }

    if (!rule.enabled) {
      return;
    }

    const disabledRule: ComplianceRule = Object.freeze({
      ...rule,
      enabled: false,
    });

    this.rules.set(id, disabledRule);
  }

  // ─── Count ────────────────────────────────────────────────────

  async count(): Promise<number> {
    return this.rules.size;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private selectRulesForEvaluation(request: ValidationRequest): ComplianceRule[] {
    let candidates = Array.from(this.rules.values()).filter((r) => r.enabled);

    if (request.ruleIds && request.ruleIds.length > 0) {
      const idSet = new Set(request.ruleIds.map((id) => id as string));
      candidates = candidates.filter((r) => idSet.has(r.id as string));
    }

    if (request.categories && request.categories.length > 0) {
      const categorySet = new Set(request.categories);
      candidates = candidates.filter((r) => categorySet.has(r.category));
    }

    return candidates;
  }

  private async publishRulePassedEvent(
    rule: ComplianceRule,
    sessionId: ComplianceSessionId,
    durationMs: number,
  ): Promise<void> {
    const event: RulePassedEvent & DomainEventBase = Object.freeze({
      eventType: 'compliance.rule.passed',
      classification: EventClassification.Result,
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      sessionId,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: { ...rule.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: rule.id as string,
      aggregateType: 'ComplianceRule',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  private async publishRuleFailedEvent(
    rule: ComplianceRule,
    sessionId: ComplianceSessionId,
    violationCount: number,
    durationMs: number,
  ): Promise<void> {
    const event: RuleFailedEvent & DomainEventBase = Object.freeze({
      eventType: 'compliance.rule.failed',
      classification: EventClassification.Error,
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      sessionId,
      violationCount,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: { ...rule.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: rule.id as string,
      aggregateType: 'ComplianceRule',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  private async publishComplianceStartedEvent(
    request: ValidationRequest,
    rulesToEvaluate: number,
  ): Promise<void> {
    const event: ComplianceStartedEvent & DomainEventBase = Object.freeze({
      eventType: 'compliance.started',
      classification: EventClassification.Action,
      sessionId: request.sessionId,
      targetType: request.targetType,
      targetPath: request.targetPath,
      rulesToEvaluate,
      timestamp: new Date().toISOString(),
      metadata: { ...request.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: request.sessionId as string,
      aggregateType: 'ComplianceSession',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  private async publishComplianceCompletedEvent(
    request: ValidationRequest,
    result: ValidationResult,
    overallScore: number,
  ): Promise<void> {
    const event: ComplianceCompletedEvent & DomainEventBase = Object.freeze({
      eventType: 'compliance.completed',
      classification:
        result.state === ComplianceState.Completed
          ? EventClassification.Result
          : EventClassification.Error,
      sessionId: request.sessionId,
      state: result.state,
      durationMs: result.durationMs,
      totalRules: result.totalRules,
      passedRules: result.passedRules,
      failedRules: result.failedRules,
      overallScore,
      timestamp: new Date().toISOString(),
      metadata: { ...request.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: request.sessionId as string,
      aggregateType: 'ComplianceSession',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }
}
