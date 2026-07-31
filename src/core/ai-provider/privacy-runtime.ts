/**
 * Universal AI Provider Runtime — Privacy Runtime
 * TASK-AIS-006A.000
 *
 * Evaluates provider privacy levels against requirements.
 * Privacy level hierarchy:
 *   Public < CloudAllowed < LocalOnly < OfflineOnly < EncryptedOnly < EnterpriseOnly
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type { IPrivacyRuntime } from './contracts.js';
import type {
  ProviderId, PolicyId, PrivacyPolicy, PrivacyEvaluation,
  PrivacyRuntimeConfig, PrivacyLevel,
} from './types.js';
import { PrivacyLevel as PL } from './types.js';
import type { PrivacyViolationEvent, PolicyEvaluatedEvent } from './events.js';

const LEVEL_ORDER: Record<string, number> = {
  [PL.Public]: 0,
  [PL.CloudAllowed]: 1,
  [PL.LocalOnly]: 2,
  [PL.OfflineOnly]: 3,
  [PL.EncryptedOnly]: 4,
  [PL.EnterpriseOnly]: 5,
};

function levelRank(level: PrivacyLevel): number {
  return LEVEL_ORDER[level] ?? 0;
}

export class PrivacyRuntime implements IPrivacyRuntime {
  private readonly config: PrivacyRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly policies = new Map<string, PrivacyPolicy>();
  private readonly providerLevels = new Map<string, PL>();
  private defaultLevel: PL;

  constructor(
    config: PrivacyRuntimeConfig,
    eventBus?: InProcessEventBus | null,
  ) {
    this.config = config;
    this.eventBus = eventBus ?? null;
    this.defaultLevel = config.defaultLevel as PL;
  }

  private publish(event: DomainEventBase): void {
    if (this.eventBus) { void this.eventBus.publish(event); }
  }

  setDefaultLevel(level: PrivacyLevel): void {
    this.defaultLevel = level as PL;
  }

  getDefaultLevel(): PrivacyLevel {
    return this.defaultLevel as PrivacyLevel;
  }

  async evaluate(
    providerId: ProviderId,
    dataTypes: readonly string[],
  ): Promise<PrivacyEvaluation> {
    // Determine the required privacy level based on policies and data types
    let requiredLevel = this.defaultLevel;
    let matchingPolicyId = '' as PolicyId;

    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        if (dataTypes.includes(rule.dataType)) {
          if (levelRank(policy.level) > levelRank(requiredLevel)) {
            requiredLevel = policy.level;
            matchingPolicyId = policy.id;
          }
        }
      }
    }

    // Look up provider's registered privacy level; fall back to default.
    const pid = providerId as string;
    const actualLevel = this.providerLevels.get(pid) ?? this.defaultLevel;
    const allowed = levelRank(actualLevel) >= levelRank(requiredLevel);

    if (!allowed && this.config.enforcePolicies) {
      this.publish(Object.freeze({
        eventType: 'privacy.violation',
        classification: EventClassification.Error,
        providerId,
        requiredLevel: requiredLevel as PrivacyLevel,
        actualLevel: actualLevel as PrivacyLevel,
        reason: `Provider privacy level ${actualLevel} does not meet required level ${requiredLevel}`,
        timestamp: new Date().toISOString(), metadata: {},
        eventId: crypto.randomUUID(), sequence: 0,
        aggregateId: providerId as string, aggregateType: 'Privacy', version: '1.0.0',
      } as PrivacyViolationEvent & DomainEventBase));
    }

    return Object.freeze({
      allowed,
      policyId: matchingPolicyId,
      reason: allowed
        ? 'Privacy requirements satisfied'
        : `Provider level ${actualLevel} < required ${requiredLevel}`,
      requiredLevel: requiredLevel as PrivacyLevel,
      actualLevel: actualLevel as PrivacyLevel,
      metadata: {},
    });
  }

  async addPolicy(policy: PrivacyPolicy): Promise<void> {
    this.policies.set(policy.id as string, policy);
    this.publish(Object.freeze({
      eventType: 'policy.evaluated',
      classification: EventClassification.Action,
      policyId: policy.id,
      policyType: 'privacy',
      allowed: true,
      reason: 'Policy added',
      timestamp: new Date().toISOString(), metadata: { ...policy.metadata },
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: policy.id as string, aggregateType: 'Policy', version: '1.0.0',
    } as PolicyEvaluatedEvent & DomainEventBase));
  }

  async removePolicy(policyId: PolicyId): Promise<void> {
    this.policies.delete(policyId as string);
  }

  async getPolicy(policyId: PolicyId): Promise<PrivacyPolicy | null> {
    return this.policies.get(policyId as string) ?? null;
  }

  async listPolicies(): Promise<readonly PrivacyPolicy[]> {
    return Array.from(this.policies.values());
  }
}
