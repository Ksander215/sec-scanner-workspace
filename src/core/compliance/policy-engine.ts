/**
 * Architecture Compliance & Governance Engine — Policy Engine Implementation
 * TASK-AIS-000Z.000
 *
 * Manages compliance policies: registration, evaluation.
 * Delegates rule evaluation to the IRuleEngine.
 * Publishes domain events via InProcessEventBus when available.
 */

import type { IPolicyEngine, IRuleEngine } from './contracts.js';
import type {
  PolicyId,
  CompliancePolicy,
  ValidationResult,
  ValidationRequest,
  RuleId,
  PolicyEngineConfig,
} from './types.js';
import {
  PolicyAlreadyRegisteredError,
  PolicyNotFoundError,
  PolicyLimitExceededError,
} from './errors.js';
import type { PolicyRegisteredEvent } from './events.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';

/**
 * Policy Engine — manages policy registration and evaluation.
 *
 * Conforms to IPolicyEngine from contracts.ts.
 * Delegates actual rule evaluation to the IRuleEngine.
 */
export class PolicyEngine implements IPolicyEngine {
  private readonly config: PolicyEngineConfig;
  private readonly ruleEngine: IRuleEngine;
  private readonly eventBus: InProcessEventBus | null;
  private readonly policies = new Map<string, CompliancePolicy>();

  constructor(
    config: PolicyEngineConfig,
    ruleEngine: IRuleEngine,
    eventBus?: InProcessEventBus | null,
  ) {
    this.config = config;
    this.ruleEngine = ruleEngine;
    this.eventBus = eventBus ?? null;
  }

  // ─── Policy Registration ───────────────────────────────────────

  async registerPolicy(policy: CompliancePolicy): Promise<void> {
    const id = policy.id as string;

    if (this.policies.has(id)) {
      throw new PolicyAlreadyRegisteredError(id);
    }

    if (this.policies.size >= this.config.maxPolicies) {
      throw new PolicyLimitExceededError(this.config.maxPolicies);
    }

    const frozenPolicy: CompliancePolicy = Object.freeze({ ...policy });
    this.policies.set(id, frozenPolicy);

    const event: PolicyRegisteredEvent & DomainEventBase = Object.freeze({
      eventType: 'compliance.policy.registered',
      classification: EventClassification.Action,
      policyId: policy.id,
      policyName: policy.name,
      source: policy.source,
      timestamp: new Date().toISOString(),
      metadata: { ...policy.metadata },
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: id,
      aggregateType: 'CompliancePolicy',
      version: '1.0.0',
    });

    if (this.eventBus) {
      await this.eventBus.publish(event);
    }
  }

  // ─── Policy Unregistration ────────────────────────────────────

  async unregisterPolicy(policyId: PolicyId): Promise<void> {
    const id = policyId as string;

    if (!this.policies.has(id)) {
      throw new PolicyNotFoundError(id);
    }

    this.policies.delete(id);
  }

  // ─── Queries ──────────────────────────────────────────────────

  async getPolicy(policyId: PolicyId): Promise<CompliancePolicy | null> {
    return this.policies.get(policyId as string) ?? null;
  }

  async listPolicies(): Promise<readonly CompliancePolicy[]> {
    return Array.from(this.policies.values());
  }

  // ─── Policy Evaluation ─────────────────────────────────────────

  async evaluatePolicy(
    policyId: PolicyId,
    request: ValidationRequest,
  ): Promise<ValidationResult> {
    const policy = this.policies.get(policyId as string);

    if (!policy) {
      throw new PolicyNotFoundError(policyId as string);
    }

    const policyRequest: ValidationRequest = {
      ...request,
      ruleIds: policy.rules,
    };

    return this.ruleEngine.evaluateRules(policyRequest);
  }

  // ─── Rules for Policy ─────────────────────────────────────────

  async getRulesForPolicy(policyId: PolicyId): Promise<readonly RuleId[]> {
    const policy = this.policies.get(policyId as string);

    if (!policy) {
      throw new PolicyNotFoundError(policyId as string);
    }

    return policy.rules;
  }

  // ─── Count ────────────────────────────────────────────────────

  async count(): Promise<number> {
    return this.policies.size;
  }
}
