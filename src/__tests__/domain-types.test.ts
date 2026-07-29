import { describe, it, expect } from 'vitest';
import {
  AutonomyLevel,
  TrustZone,
  EventClassification,
  ProviderType,
  EngineState,
} from '../core/types/common.js';
import {
  ConfidenceLevel,
  classifyConfidence,
} from '../core/domain/value-objects/confidence-level.js';
import { UserRole } from '../core/domain/value-objects/user-role.js';
import { FrequencyModeValue } from '../core/domain/value-objects/frequency-mode.js';
import { NotificationType } from '../core/domain/value-objects/notification-type.js';
import { createId } from '../core/domain/identifiers.js';
import {
  assertSingleProfile,
  assertSessionHasContext,
  assertConfidenceRange,
  assertNarrativeHasRole,
  assertNotificationHasType,
  assertNoTipRepetition,
  assertProviderHasCredentials,
  assertPluginHasManifest,
  assertPermissionsWithinScope,
  assertZoneGateCrossing,
  assertActionWithinAutonomy,
  assertAuditEntry,
} from '../core/domain/aggregates/index.js';
import type { UserProfileId } from '../core/domain/identifiers.js';

describe('Value Objects and Enums', () => {
  it('ConfidenceLevel has 5 values', () => {
    expect(Object.values(ConfidenceLevel)).toHaveLength(5);
  });

  it('classifyConfidence maps scores correctly', () => {
    expect(classifyConfidence(10)).toBe(ConfidenceLevel.VeryLow);
    expect(classifyConfidence(30)).toBe(ConfidenceLevel.Low);
    expect(classifyConfidence(50)).toBe(ConfidenceLevel.Moderate);
    expect(classifyConfidence(70)).toBe(ConfidenceLevel.High);
    expect(classifyConfidence(90)).toBe(ConfidenceLevel.VeryHigh);
  });

  it('classifyConfidence rejects out of range (INV-002)', () => {
    expect(() => classifyConfidence(-1)).toThrow('INV-002');
    expect(() => classifyConfidence(101)).toThrow('INV-002');
  });

  it('UserRole has 4 values', () => {
    expect(Object.values(UserRole)).toHaveLength(4);
  });

  it('AutonomyLevel has 5 values (L0-L4)', () => {
    expect(Object.values(AutonomyLevel)).toHaveLength(5);
  });

  it('TrustZone has 5 values (Z0-Z4)', () => {
    expect(Object.values(TrustZone)).toHaveLength(5);
  });

  it('EventClassification has 5 values', () => {
    expect(Object.values(EventClassification)).toHaveLength(5);
  });

  it('ProviderType has 4 values', () => {
    expect(Object.values(ProviderType)).toHaveLength(4);
  });

  it('NotificationType has 6 values', () => {
    expect(Object.values(NotificationType)).toHaveLength(6);
  });
});

describe('Identifiers', () => {
  it('createId generates typed UUIDs', () => {
    const id = createId<UserProfileId>();
    expect(id).toBeDefined();
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('Aggregate Invariants', () => {
  it('INV-001: assertSingleProfile passes for single profile', () => {
    expect(() => assertSingleProfile([], 'p1')).not.toThrow();
  });

  it('INV-002: assertConfidenceRange validates [0, 100]', () => {
    expect(() => assertConfidenceRange(50)).not.toThrow();
    expect(() => assertConfidenceRange(-1)).toThrow('INV-002');
    expect(() => assertConfidenceRange(101)).toThrow('INV-002');
  });

  it('INV-009: assertAuditEntry requires actor and intent', () => {
    expect(() => assertAuditEntry('user', 'test')).not.toThrow();
    expect(() => assertAuditEntry('', 'test')).toThrow('INV-009');
    expect(() => assertAuditEntry('user', '')).toThrow('INV-009');
  });

  it('INV-008: assertActionWithinAutonomy', () => {
    expect(() => assertActionWithinAutonomy(AutonomyLevel.Suggest, AutonomyLevel.Suggest)).not.toThrow();
    expect(() => assertActionWithinAutonomy(AutonomyLevel.Autonomous, AutonomyLevel.Suggest)).toThrow('INV-008');
  });

  it('INV-007: assertZoneGateCrossing validates gate', () => {
    expect(() => assertZoneGateCrossing(TrustZone.CoreAIS, TrustZone.PluginSandbox, true)).not.toThrow();
    expect(() => assertZoneGateCrossing(TrustZone.CoreAIS, TrustZone.PluginSandbox, false)).toThrow('INV-007');
  });

  it('INV-013: assertPermissionsWithinScope', () => {
    expect(() => assertPermissionsWithinScope(['read', 'write'], ['read'])).not.toThrow();
    expect(() => assertPermissionsWithinScope(['read'], ['write'])).toThrow('INV-013');
  });
});
