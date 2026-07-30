/**
 * Experience Runtime — Consent Runtime
 * TASK-AIS-004A.000, Subsystem 14
 *
 * All user-affecting changes must pass through consent model.
 * Modes: Disabled, Ask, Auto (within allowed policies)
 */

import { createId } from '../domain/identifiers.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  ConsentRecordId,
  ConsentRecord,
  ConsentMode,
  ConsentScope,
  ExperienceRuntimeConfig,
} from './types.js';
import { ConsentDeniedError } from './errors.js';

export class ConsentRuntime {
  private readonly records = new Map<ConsentRecordId, ConsentRecord>();
  private readonly userConsents = new Map<string, ConsentRecordId[]>();
  private readonly config: ExperienceRuntimeConfig;
  private eventBus?: InProcessEventBus;

  constructor(config: ExperienceRuntimeConfig, eventBus?: InProcessEventBus) {
    this.config = config;
    this.eventBus = eventBus;
  }

  /** Grant consent for a specific scope */
  grantConsent(
    userIdHash: string,
    scope: ConsentScope,
    mode: ConsentMode,
    policyId?: string,
  ): ConsentRecord {
    const now = new Date().toISOString();
    const record: ConsentRecord = {
      id: createId<ConsentRecordId>(),
      userIdHash,
      scope,
      mode,
      grantedAt: now,
      isActive: true,
      policyId,
    };

    this.records.set(record.id, record);
    this.trackUserConsent(userIdHash, record.id);
    this.emitConsentGranted(record);
    return record;
  }

  /** Revoke consent */
  revokeConsent(consentRecordId: ConsentRecordId, reason: string): ConsentRecord {
    const record = this.records.get(consentRecordId);
    if (!record) {
      throw new ConsentDeniedError(`Consent record ${consentRecordId} not found`, { consentRecordId, reason });
    }
    if (!record.isActive) {
      throw new ConsentDeniedError(`Consent ${consentRecordId} is already inactive`, { consentRecordId });
    }

    const revoked: ConsentRecord = {
      ...record,
      isActive: false,
      revokedAt: new Date().toISOString(),
    };

    this.records.set(consentRecordId, revoked);
    this.emitConsentRevoked(revoked, reason);
    return revoked;
  }

  /** Get consent record for a user and scope */
  getConsent(userIdHash: string, scope: ConsentScope): ConsentRecord | null {
    const ids = this.userConsents.get(userIdHash) ?? [];
    for (const id of ids) {
      const record = this.records.get(id);
      if (record && record.scope === scope) return record;
    }
    return null;
  }

  /** Check if user has active consent for a scope */
  hasActiveConsent(userIdHash: string, scope: ConsentScope): boolean {
    const record = this.getConsent(userIdHash, scope);
    return record?.isActive ?? false;
  }

  /** Check consent status — returns allowed/mode/record */
  checkConsent(
    userIdHash: string,
    scope: ConsentScope,
  ): { allowed: boolean; mode: ConsentMode; record: ConsentRecord | null } {
    const record = this.getConsent(userIdHash, scope);
    if (!record || !record.isActive) {
      return { allowed: false, mode: this.config.defaultConsentMode, record: null };
    }

    if (record.mode === 'Disabled') {
      return { allowed: false, mode: record.mode, record };
    }

    if (record.mode === 'Auto') {
      return { allowed: true, mode: record.mode, record };
    }

    // Ask mode — consent is acknowledged but action requires explicit prompt
    return { allowed: true, mode: record.mode, record };
  }

  /** Require consent — returns null if consent needs to be asked (for Ask mode) */
  requireConsent(
    userIdHash: string,
    scope: ConsentScope,
  ): ConsentRecord | null {
    const record = this.getConsent(userIdHash, scope);
    if (!record || !record.isActive) return null;
    if (record.mode === 'Disabled') return null;
    return record;
  }

  /** Get all consent records for a user */
  getAllConsents(userIdHash: string): readonly ConsentRecord[] {
    const ids = this.userConsents.get(userIdHash) ?? [];
    return ids
      .map((id) => this.records.get(id))
      .filter((r): r is ConsentRecord => r !== undefined);
  }

  /** Check and mark expired consents — returns count of newly expired */
  checkExpiredConsents(): number {
    const now = Date.now();
    let count = 0;
    for (const [id, record] of this.records) {
      if (!record.isActive || !record.expiresAt) continue;
      const expiry = new Date(record.expiresAt).getTime();
      if (expiry <= now) {
        const expired: ConsentRecord = {
          ...record,
          isActive: false,
          revokedAt: new Date().toISOString(),
        };
        this.records.set(id, expired);
        count++;
      }
    }
    return count;
  }

  /** Track consent record under a user */
  private trackUserConsent(userIdHash: string, recordId: ConsentRecordId): void {
    let ids = this.userConsents.get(userIdHash);
    if (!ids) {
      ids = [];
      this.userConsents.set(userIdHash, ids);
    }
    ids.push(recordId);
  }

  /** Emit ConsentGranted event */
  private emitConsentGranted(record: ConsentRecord): void {
    if (!this.eventBus) return;
    this.eventBus.publish({
      eventId: createId(),
      eventType: 'ConsentGranted',
      classification: EventClassification.Action,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: record.id,
      aggregateType: 'ConsentRecord',
      version: '1.0.0',
      payload: {
        consentRecordId: record.id,
        userIdHash: record.userIdHash,
        scope: record.scope,
        mode: record.mode,
        grantedAt: record.grantedAt,
      },
    });
  }

  /** Emit ConsentRevoked event */
  private emitConsentRevoked(record: ConsentRecord, reason: string): void {
    if (!this.eventBus) return;
    this.eventBus.publish({
      eventId: createId(),
      eventType: 'ConsentRevoked',
      classification: EventClassification.StateChange,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: record.id,
      aggregateType: 'ConsentRecord',
      version: '1.0.0',
      payload: {
        consentRecordId: record.id,
        userIdHash: record.userIdHash,
        scope: record.scope,
        revokedAt: record.revokedAt,
        reason,
      },
    });
  }
}
