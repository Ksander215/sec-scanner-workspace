/**
 * Signature Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { PackageSignature, SignatureEngineConfig } from './types.js';
import { brandSignatureId } from './types.js';
import type { ISignatureEngine } from './contracts.js';
import { SignatureVerificationError } from './errors.js';
import type { PackageSignedEvent, SignatureVerifiedEvent } from './events.js';
import { SignatureAlgorithm, SignatureStatus } from './types.js';

export class SignatureEngine implements ISignatureEngine {
  private readonly config: SignatureEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly signatures = new Map<string, PackageSignature>();

  constructor(config: SignatureEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async sign(packageId: import('./types.js').PackageId, algorithm?: SignatureAlgorithm): Promise<PackageSignature> {
    if (this.signatures.size >= this.config.maxSignatures) {
      throw new SignatureVerificationError('Maximum signatures exceeded');
    }
    const now: Timestamp = new Date().toISOString();
    const algo = algorithm ?? this.config.defaultAlgorithm;
    const id = brandSignatureId(crypto.randomUUID());
    const expiresAt = new Date(Date.now() + this.config.expiryDays * 86400000).toISOString();
    const signature: PackageSignature = Object.freeze({
      id,
      packageId,
      algorithm: algo,
      publicKey: '',
      signature: '',
      signedAt: now,
      expiresAt: expiresAt as Timestamp,
      status: SignatureStatus.Valid,
      verifiedAt: null,
      metadata: Object.freeze({}),
    });
    this.signatures.set(id as string, signature);
    const event: PackageSignedEvent = Object.freeze({
      eventType: 'marketplace.signature.signed',
      classification: EventClassification.Info,
      signatureId: id,
      packageId,
      algorithm: algo as unknown as string,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'PackageSignature');
    return signature;
  }

  async verify(signatureId: import('./types.js').SignatureId): Promise<SignatureStatus> {
    const sig = this.signatures.get(signatureId as string);
    if (!sig) throw new SignatureVerificationError('Signature not found');
    const now = new Date();
    const expires = new Date(sig.expiresAt);
    let status: SignatureStatus;
    if (now > expires) {
      status = SignatureStatus.Expired;
    } else {
      status = SignatureStatus.Valid;
    }
    const nowTs: Timestamp = new Date().toISOString();
    const updated: PackageSignature = Object.freeze({
      ...sig,
      status,
      verifiedAt: nowTs,
    });
    this.signatures.set(signatureId as string, updated);
    const event: SignatureVerifiedEvent = Object.freeze({
      eventType: 'marketplace.signature.verified',
      classification: EventClassification.Result,
      signatureId,
      status,
      timestamp: nowTs,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, signatureId as string, 'PackageSignature');
    return status;
  }

  async getById(id: import('./types.js').SignatureId): Promise<PackageSignature | null> {
    return this.signatures.get(id as string) ?? null;
  }

  async getByPackageId(packageId: import('./types.js').PackageId): Promise<PackageSignature | null> {
    for (const sig of this.signatures.values()) {
      if (sig.packageId === packageId) return sig;
    }
    return null;
  }

  async revoke(signatureId: import('./types.js').SignatureId): Promise<void> {
    const key = signatureId as string;
    const sig = this.signatures.get(key);
    if (!sig) throw new SignatureVerificationError('Signature not found');
    const revoked: PackageSignature = Object.freeze({
      ...sig,
      status: SignatureStatus.Revoked,
    });
    this.signatures.set(key, revoked);
  }

  async count(): Promise<number> {
    return this.signatures.size;
  }


  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
