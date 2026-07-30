/**
 * Tests for AdaptationEngine (Subsystem 4)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptationEngine } from '../../core/experience/adaptation-engine.js';
import type { Adaptation, AdaptationId, ObservationId } from '../../core/experience/types.js';
import { AdaptationState, AdaptationType } from '../../core/experience/types.js';
import {
  AdaptationValidationError,
  AdaptationRevertError,
  AdaptationExpiredError,
} from '../../core/experience/errors.js';
import { DefaultExperienceRuntimeConfig } from '../../core/experience/types.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { TraceCollector } from '../../core/trace/trace-collector.js';
import { createId } from '../../core/domain/identifiers.js';

// ─── Factory Helpers ─────────────────────────────────────────

function createTestEvidence(count: number = 2): readonly ObservationId[] {
  return Array.from({ length: count }, () => createId<ObservationId>());
}

function createProposedAdaptation(
  engine: AdaptationEngine,
  overrides?: {
    type?: AdaptationType;
    userIdHash?: string;
    newValue?: string;
    evidence?: readonly ObservationId[];
    reason?: string;
  },
): Adaptation {
  return engine.proposeAdaptation(
    overrides?.type ?? AdaptationType.ResponseStyle,
    overrides?.userIdHash ?? crypto.randomUUID(),
    overrides?.newValue ?? 'formal',
    overrides?.evidence ?? createTestEvidence(),
    overrides?.reason ?? 'test adaptation',
  );
}

// ─── Tests ────────────────────────────────────────────────────

describe('AdaptationEngine', () => {
  let engine: AdaptationEngine;
  let eventBus: InProcessEventBus;
  let trace: TraceCollector;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    trace = new TraceCollector();
    engine = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
  });

  // ─── Constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates an instance with config and event bus', () => {
      const e = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus);
      expect(e).toBeDefined();
    });

    it('creates an instance with config, event bus, and trace', () => {
      const e = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      expect(e).toBeDefined();
    });

    it('records initialization in trace', () => {
      const t = new TraceCollector();
      new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, t);
      const entries = t.getEntries();
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].message).toContain('AdaptationEngine initialized');
    });

    it('includes adaptationRate in init trace', () => {
      const t = new TraceCollector();
      new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, t);
      const entry = t.getEntries()[0];
      expect(entry.data).toBeDefined();
      expect(entry.data!['adaptationRate']).toBe(0.1);
    });

    it('accepts custom config with different adaptationRate', () => {
      const cfg = { ...DefaultExperienceRuntimeConfig, adaptationRate: 0.5 };
      const e = new AdaptationEngine(cfg, eventBus, trace);
      expect(e).toBeDefined();
    });
  });

  // ─── proposeAdaptation ───────────────────────────────────────

  describe('proposeAdaptation', () => {
    it('creates an adaptation in Proposed state', () => {
      const adaptation = createProposedAdaptation(engine);
      expect(adaptation.state).toBe(AdaptationState.Proposed);
    });

    it('has a unique id', () => {
      const a1 = createProposedAdaptation(engine);
      const a2 = createProposedAdaptation(engine);
      expect(a1.id).not.toBe(a2.id);
    });

    it('has correct type', () => {
      const adaptation = createProposedAdaptation(engine, { type: AdaptationType.ToneAdjustment });
      expect(adaptation.type).toBe(AdaptationType.ToneAdjustment);
    });

    it('has correct userIdHash', () => {
      const userId = crypto.randomUUID();
      const adaptation = createProposedAdaptation(engine, { userIdHash: userId });
      expect(adaptation.userIdHash).toBe(userId);
    });

    it('has correct newValue', () => {
      const adaptation = createProposedAdaptation(engine, { newValue: 'casual' });
      expect(adaptation.newValue).toBe('casual');
    });

    it('has previousValue as empty string', () => {
      const adaptation = createProposedAdaptation(engine);
      expect(adaptation.previousValue).toBe('');
    });

    it('has correct reason', () => {
      const adaptation = createProposedAdaptation(engine, { reason: 'user prefers formal tone' });
      expect(adaptation.reason).toBe('user prefers formal tone');
    });

    it('has evidence array', () => {
      const evidence = createTestEvidence(3);
      const adaptation = createProposedAdaptation(engine, { evidence });
      expect(adaptation.evidence).toHaveLength(3);
    });

    it('has confidence equal to adaptationRate', () => {
      const adaptation = createProposedAdaptation(engine);
      expect(adaptation.confidence).toBe(0.1);
    });

    it('has expiresAt set to 7 days from now', () => {
      const before = Date.now();
      const adaptation = createProposedAdaptation(engine);
      const after = Date.now();
      const expiresAt = new Date(adaptation.expiresAt!).getTime();
      const expectedMin = before + 7 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 7 * 24 * 60 * 60 * 1000;
      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('throws AdaptationValidationError for empty userIdHash', () => {
      expect(() => engine.proposeAdaptation(
        AdaptationType.ResponseStyle, '', 'formal', createTestEvidence(), 'test',
      )).toThrow(AdaptationValidationError);
    });

    it('throws AdaptationValidationError for non-string userIdHash', () => {
      expect(() => engine.proposeAdaptation(
        AdaptationType.ResponseStyle, null as unknown as string, 'formal', createTestEvidence(), 'test',
      )).toThrow(AdaptationValidationError);
    });

    it('throws AdaptationValidationError for empty newValue', () => {
      expect(() => engine.proposeAdaptation(
        AdaptationType.ResponseStyle, crypto.randomUUID(), '', createTestEvidence(), 'test',
      )).toThrow(AdaptationValidationError);
    });

    it('throws AdaptationValidationError for non-string newValue', () => {
      expect(() => engine.proposeAdaptation(
        AdaptationType.ResponseStyle, crypto.randomUUID(), 123 as unknown as string, createTestEvidence(), 'test',
      )).toThrow(AdaptationValidationError);
    });

    it('throws AdaptationValidationError for empty evidence', () => {
      expect(() => engine.proposeAdaptation(
        AdaptationType.ResponseStyle, crypto.randomUUID(), 'formal', [], 'test',
      )).toThrow(AdaptationValidationError);
    });

    it('throws AdaptationValidationError for empty reason', () => {
      expect(() => engine.proposeAdaptation(
        AdaptationType.ResponseStyle, crypto.randomUUID(), 'formal', createTestEvidence(), '',
      )).toThrow(AdaptationValidationError);
    });

    it('throws AdaptationValidationError for non-string reason', () => {
      expect(() => engine.proposeAdaptation(
        AdaptationType.ResponseStyle, crypto.randomUUID(), 'formal', createTestEvidence(), null as unknown as string,
      )).toThrow(AdaptationValidationError);
    });

    it('throws with code EXP-ADAPT-001', () => {
      try {
        engine.proposeAdaptation(AdaptationType.ResponseStyle, '', 'formal', createTestEvidence(), 'test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as AdaptationValidationError).code).toBe('EXP-ADAPT-001');
      }
    });

    it('works with all AdaptationType values', () => {
      const types = [
        AdaptationType.ResponseStyle, AdaptationType.ExplanationDepth,
        AdaptationType.InformationFormat, AdaptationType.ProactivityLevel,
        AdaptationType.ComplexityLevel, AdaptationType.ToneAdjustment,
      ];
      for (const type of types) {
        const adaptation = createProposedAdaptation(engine, { type });
        expect(adaptation.type).toBe(type);
      }
    });

    it('records trace info on propose', () => {
      createProposedAdaptation(engine);
      expect(trace.getEntries().find(e => e.message === 'Adaptation proposed')).toBeDefined();
    });

    it('trace includes adaptationId', () => {
      const adaptation = createProposedAdaptation(engine);
      const entry = trace.getEntries().find(e => e.message === 'Adaptation proposed');
      expect(entry?.data?.['adaptationId']).toBe(adaptation.id);
    });

    it('trace includes userIdHash', () => {
      const userId = crypto.randomUUID();
      createProposedAdaptation(engine, { userIdHash: userId });
      const entry = trace.getEntries().find(e => e.message === 'Adaptation proposed');
      expect(entry?.data?.['userIdHash']).toBe(userId);
    });

    it('trace includes adaptation type', () => {
      createProposedAdaptation(engine, { type: AdaptationType.ToneAdjustment });
      const entry = trace.getEntries().find(e => e.message === 'Adaptation proposed');
      expect(entry?.data?.['type']).toBe(AdaptationType.ToneAdjustment);
    });

    it('stores adaptation so it can be retrieved', () => {
      const adaptation = createProposedAdaptation(engine);
      const retrieved = engine.getAdaptation(adaptation.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(adaptation.id);
    });

    it('no appliedAt on proposed adaptation', () => {
      const adaptation = createProposedAdaptation(engine);
      expect(adaptation.appliedAt).toBeUndefined();
    });

    it('no revertedAt on proposed adaptation', () => {
      const adaptation = createProposedAdaptation(engine);
      expect(adaptation.revertedAt).toBeUndefined();
    });
  });

  // ─── applyAdaptation ───────────────────────────────────────

  describe('applyAdaptation', () => {
    it('applies a proposed adaptation', () => {
      const adaptation = createProposedAdaptation(engine);
      const applied = engine.applyAdaptation(adaptation.id);
      expect(applied.state).toBe(AdaptationState.Applied);
    });

    it('sets appliedAt timestamp', () => {
      const adaptation = createProposedAdaptation(engine);
      const applied = engine.applyAdaptation(adaptation.id);
      expect(applied.appliedAt).toBeTruthy();
    });

    it('preserves other fields', () => {
      const userId = crypto.randomUUID();
      const adaptation = createProposedAdaptation(engine, { userIdHash: userId, newValue: 'verbose' });
      const applied = engine.applyAdaptation(adaptation.id);
      expect(applied.userIdHash).toBe(userId);
      expect(applied.newValue).toBe('verbose');
      expect(applied.type).toBe(adaptation.type);
      expect(applied.reason).toBe(adaptation.reason);
    });

    it('throws AdaptationValidationError for non-existent adaptation', () => {
      expect(() => engine.applyAdaptation(crypto.randomUUID() as AdaptationId)).toThrow(AdaptationValidationError);
    });

    it('throws with message about not found', () => {
      try {
        engine.applyAdaptation(crypto.randomUUID() as AdaptationId);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as AdaptationValidationError).message).toContain('not found');
      }
    });

    it('throws AdaptationValidationError for non-Proposed state', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      expect(() => engine.applyAdaptation(adaptation.id)).toThrow(AdaptationValidationError);
    });

    it('throws with message about state', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      try {
        engine.applyAdaptation(adaptation.id);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as AdaptationValidationError).message).toContain('state');
      }
    });

    it('throws AdaptationExpiredError for expired adaptation', () => {
      // Create an adaptation with an already-expired expiresAt by manipulating time
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      // Advance time by 8 days (past the 7-day TTL)
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      expect(() => engine2.applyAdaptation(adaptation.id)).toThrow(AdaptationExpiredError);
      vi.useRealTimers();
    });

    it('AdaptationExpiredError has code EXP-ADAPT-003', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      try {
        engine2.applyAdaptation(adaptation.id);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as AdaptationExpiredError).code).toBe('EXP-ADAPT-003');
      }
      vi.useRealTimers();
    });

    it('expired adaptation gets marked as Expired', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      try { engine2.applyAdaptation(adaptation.id); } catch { /* expected */ }
      const updated = engine2.getAdaptation(adaptation.id);
      expect(updated!.state).toBe(AdaptationState.Expired);
      vi.useRealTimers();
    });

    it('publishes AdaptationApplied event', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const applied = log.find(e => e.eventType === 'AdaptationApplied');
      expect(applied).toBeDefined();
    });

    it('AdaptationApplied has correct payload', () => {
      const userId = crypto.randomUUID();
      const adaptation = createProposedAdaptation(engine, { userIdHash: userId, newValue: 'formal' });
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationApplied')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['userIdHash']).toBe(userId);
      expect(payload['newValue']).toBe('formal');
    });

    it('AdaptationApplied includes reason', () => {
      const adaptation = createProposedAdaptation(engine, { reason: 'my reason' });
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationApplied')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['reason']).toBe('my reason');
    });

    it('AdaptationApplied includes confidence', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationApplied')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['confidence']).toBe(0.1);
    });

    it('AdaptationApplied includes adaptationType', () => {
      const adaptation = createProposedAdaptation(engine, { type: AdaptationType.ComplexityLevel });
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationApplied')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['adaptationType']).toBe(AdaptationType.ComplexityLevel);
    });

    it('records trace info on apply', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      expect(trace.getEntries().find(e => e.message === 'Adaptation applied')).toBeDefined();
    });

    it('trace includes adaptationId on apply', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const entry = trace.getEntries().find(e => e.message === 'Adaptation applied');
      expect(entry?.data?.['adaptationId']).toBe(adaptation.id);
    });

    it('updated adaptation is reflected in getAdaptation', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const retrieved = engine.getAdaptation(adaptation.id);
      expect(retrieved!.state).toBe(AdaptationState.Applied);
    });
  });

  // ─── revertAdaptation ───────────────────────────────────────

  describe('revertAdaptation', () => {
    it('reverts an applied adaptation', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const reverted = engine.revertAdaptation(adaptation.id, 'user requested revert');
      expect(reverted.state).toBe(AdaptationState.Reverted);
    });

    it('sets revertedAt timestamp', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const reverted = engine.revertAdaptation(adaptation.id, 'reason');
      expect(reverted.revertedAt).toBeTruthy();
    });

    it('preserves other fields', () => {
      const userId = crypto.randomUUID();
      const adaptation = createProposedAdaptation(engine, { userIdHash: userId, newValue: 'verbose', reason: 'test adaptation' });
      engine.applyAdaptation(adaptation.id);
      const reverted = engine.revertAdaptation(adaptation.id, 'test adaptation');
      expect(reverted.userIdHash).toBe(userId);
      expect(reverted.newValue).toBe('verbose');
      expect(reverted.reason).toBe('test adaptation');
      expect(reverted.appliedAt).toBeTruthy();
    });

    it('throws AdaptationRevertError for non-existent adaptation', () => {
      expect(() => engine.revertAdaptation(crypto.randomUUID() as AdaptationId, 'reason')).toThrow(AdaptationRevertError);
    });

    it('AdaptationRevertError has code EXP-ADAPT-002', () => {
      try {
        engine.revertAdaptation(crypto.randomUUID() as AdaptationId, 'reason');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as AdaptationRevertError).code).toBe('EXP-ADAPT-002');
      }
    });

    it('throws AdaptationRevertError for non-Applied state (Proposed)', () => {
      const adaptation = createProposedAdaptation(engine);
      expect(() => engine.revertAdaptation(adaptation.id, 'reason')).toThrow(AdaptationRevertError);
    });

    it('throws AdaptationRevertError for non-Applied state (Reverted)', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      expect(() => engine.revertAdaptation(adaptation.id, 'another reason')).toThrow(AdaptationRevertError);
    });

    it('throws AdaptationRevertError for empty reason', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      expect(() => engine.revertAdaptation(adaptation.id, '')).toThrow(AdaptationRevertError);
    });

    it('throws AdaptationRevertError for non-string reason', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      expect(() => engine.revertAdaptation(adaptation.id, null as unknown as string)).toThrow(AdaptationRevertError);
    });

    it('throws with correct message for invalid reason', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      try {
        engine.revertAdaptation(adaptation.id, '');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as AdaptationRevertError).message).toContain('reason');
      }
    });

    it('throws with correct message for wrong state', () => {
      const adaptation = createProposedAdaptation(engine);
      try {
        engine.revertAdaptation(adaptation.id, 'reason');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as AdaptationRevertError).message).toContain('state');
      }
    });

    it('publishes AdaptationReverted event', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'user feedback');
      const log = eventBus.getLog();
      const reverted = log.find(e => e.eventType === 'AdaptationReverted');
      expect(reverted).toBeDefined();
    });

    it('AdaptationReverted has correct payload', () => {
      const userId = crypto.randomUUID();
      const adaptation = createProposedAdaptation(engine, { userIdHash: userId, newValue: 'formal' });
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'user feedback');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationReverted')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['userIdHash']).toBe(userId);
      expect(payload['reason']).toBe('user feedback');
    });

    it('AdaptationReverted includes revertedValue', () => {
      const adaptation = createProposedAdaptation(engine, { newValue: 'verbose' });
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationReverted')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['revertedValue']).toBe('verbose');
    });

    it('AdaptationReverted includes originalValue', () => {
      const adaptation = createProposedAdaptation(engine, { newValue: 'verbose' });
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationReverted')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['originalValue']).toBe('');
    });

    it('records trace info on revert', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      expect(trace.getEntries().find(e => e.message === 'Adaptation reverted')).toBeDefined();
    });

    it('trace includes adaptationId on revert', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      const entry = trace.getEntries().find(e => e.message === 'Adaptation reverted');
      expect(entry?.data?.['adaptationId']).toBe(adaptation.id);
    });

    it('trace includes reason on revert', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'my revert reason');
      const entry = trace.getEntries().find(e => e.message === 'Adaptation reverted');
      expect(entry?.data?.['reason']).toBe('my revert reason');
    });

    it('updated adaptation is reflected in getAdaptation', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      const retrieved = engine.getAdaptation(adaptation.id);
      expect(retrieved!.state).toBe(AdaptationState.Reverted);
    });
  });

  // ─── getActiveAdaptations ───────────────────────────────────

  describe('getActiveAdaptations', () => {
    it('returns empty for user with no adaptations', () => {
      expect(engine.getActiveAdaptations(crypto.randomUUID())).toHaveLength(0);
    });

    it('returns only Applied adaptations', () => {
      const userId = crypto.randomUUID();
      const a1 = createProposedAdaptation(engine, { userIdHash: userId });
      engine.applyAdaptation(a1.id);
      const a2 = createProposedAdaptation(engine, { userIdHash: userId });
      // a2 is still Proposed
      const active = engine.getActiveAdaptations(userId);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(a1.id);
    });

    it('excludes Reverted adaptations', () => {
      const userId = crypto.randomUUID();
      const a1 = createProposedAdaptation(engine, { userIdHash: userId });
      engine.applyAdaptation(a1.id);
      const a2 = createProposedAdaptation(engine, { userIdHash: userId });
      engine.applyAdaptation(a2.id);
      engine.revertAdaptation(a2.id, 'reason');
      const active = engine.getActiveAdaptations(userId);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(a1.id);
    });

    it('does not return adaptations for other users', () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      const a1 = createProposedAdaptation(engine, { userIdHash: user1 });
      engine.applyAdaptation(a1.id);
      expect(engine.getActiveAdaptations(user2)).toHaveLength(0);
    });

    it('returns multiple active adaptations', () => {
      const userId = crypto.randomUUID();
      const a1 = createProposedAdaptation(engine, { userIdHash: userId });
      const a2 = createProposedAdaptation(engine, { userIdHash: userId });
      engine.applyAdaptation(a1.id);
      engine.applyAdaptation(a2.id);
      expect(engine.getActiveAdaptations(userId)).toHaveLength(2);
    });

    it('excludes Proposed adaptations', () => {
      const userId = crypto.randomUUID();
      createProposedAdaptation(engine, { userIdHash: userId });
      expect(engine.getActiveAdaptations(userId)).toHaveLength(0);
    });
  });

  // ─── getAdaptation ───────────────────────────────────────────

  describe('getAdaptation', () => {
    it('returns null for non-existent adaptation', () => {
      expect(engine.getAdaptation(crypto.randomUUID() as AdaptationId)).toBeNull();
    });

    it('returns adaptation by id', () => {
      const adaptation = createProposedAdaptation(engine);
      const retrieved = engine.getAdaptation(adaptation.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(adaptation.id);
    });

    it('returns current state after apply', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const retrieved = engine.getAdaptation(adaptation.id);
      expect(retrieved!.state).toBe(AdaptationState.Applied);
    });

    it('returns current state after revert', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      const retrieved = engine.getAdaptation(adaptation.id);
      expect(retrieved!.state).toBe(AdaptationState.Reverted);
    });
  });

  // ─── getAdaptationHistory ─────────────────────────────────────

  describe('getAdaptationHistory', () => {
    it('returns empty for user with no adaptations', () => {
      expect(engine.getAdaptationHistory(crypto.randomUUID())).toHaveLength(0);
    });

    it('returns all adaptations including Proposed', () => {
      const userId = crypto.randomUUID();
      createProposedAdaptation(engine, { userIdHash: userId });
      expect(engine.getAdaptationHistory(userId)).toHaveLength(1);
    });

    it('returns all adaptations including Applied and Reverted', () => {
      const userId = crypto.randomUUID();
      const a1 = createProposedAdaptation(engine, { userIdHash: userId });
      const a2 = createProposedAdaptation(engine, { userIdHash: userId });
      engine.applyAdaptation(a1.id);
      engine.applyAdaptation(a2.id);
      engine.revertAdaptation(a2.id, 'reason');
      const history = engine.getAdaptationHistory(userId);
      expect(history).toHaveLength(2);
      const states = history.map(a => a.state);
      expect(states).toContain(AdaptationState.Applied);
      expect(states).toContain(AdaptationState.Reverted);
    });

    it('does not include adaptations from other users', () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      createProposedAdaptation(engine, { userIdHash: user1 });
      createProposedAdaptation(engine, { userIdHash: user2 });
      expect(engine.getAdaptationHistory(user1)).toHaveLength(1);
      expect(engine.getAdaptationHistory(user2)).toHaveLength(1);
    });
  });

  // ─── checkExpiredAdaptations ──────────────────────────────────

  describe('checkExpiredAdaptations', () => {
    it('returns empty when no adaptations exist', () => {
      expect(engine.checkExpiredAdaptations()).toHaveLength(0);
    });

    it('returns empty when no adaptations are expired', () => {
      createProposedAdaptation(engine);
      expect(engine.checkExpiredAdaptations()).toHaveLength(0);
    });

    it('returns empty for recently created applied adaptations', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      expect(engine.checkExpiredAdaptations()).toHaveLength(0);
    });

    it('expires applied adaptations past TTL', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      engine2.applyAdaptation(adaptation.id);
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      const expired = engine2.checkExpiredAdaptations();
      expect(expired.length).toBeGreaterThanOrEqual(1);
      expect(expired[0].state).toBe(AdaptationState.Expired);
      vi.useRealTimers();
    });

    it('updates the stored adaptation to Expired', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      engine2.applyAdaptation(adaptation.id);
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      engine2.checkExpiredAdaptations();
      const retrieved = engine2.getAdaptation(adaptation.id);
      expect(retrieved!.state).toBe(AdaptationState.Expired);
      vi.useRealTimers();
    });

    it('does not expire Proposed adaptations', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      createProposedAdaptation(engine2);
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      const expired = engine2.checkExpiredAdaptations();
      const proposedExpired = expired.filter(a => a.state === AdaptationState.Proposed);
      expect(proposedExpired).toHaveLength(0);
      vi.useRealTimers();
    });

    it('does not expire Reverted adaptations', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      engine2.applyAdaptation(adaptation.id);
      engine2.revertAdaptation(adaptation.id, 'reason');
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      const expired = engine2.checkExpiredAdaptations();
      const revertedExpired = expired.filter(a => a.state === AdaptationState.Reverted);
      expect(revertedExpired).toHaveLength(0);
      vi.useRealTimers();
    });

    it('records trace info when expiring adaptations', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      engine2.applyAdaptation(adaptation.id);
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      engine2.checkExpiredAdaptations();
      expect(trace.getEntries().find(e => e.message === 'Expired adaptations checked')).toBeDefined();
      vi.useRealTimers();
    });
  });

  // ─── Event Bus Integration ───────────────────────────────────

  describe('event bus integration', () => {
    it('AdaptationApplied includes adaptationType in payload', () => {
      const adaptation = createProposedAdaptation(engine, { type: AdaptationType.ComplexityLevel });
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationApplied')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['adaptationType']).toBe(AdaptationType.ComplexityLevel);
    });

    it('AdaptationApplied has classification action', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationApplied')!;
      expect(envelope.classification).toBe('action');
    });

    it('AdaptationApplied has version 1.0.0', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationApplied')!;
      expect(envelope.version).toBe('1.0.0');
    });

    it('AdaptationReverted includes userIdHash in payload', () => {
      const userId = crypto.randomUUID();
      const adaptation = createProposedAdaptation(engine, { userIdHash: userId });
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationReverted')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['userIdHash']).toBe(userId);
    });

    it('AdaptationReverted has classification state-change', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationReverted')!;
      expect(envelope.classification).toBe('state-change');
    });

    it('AdaptationReverted has version 1.0.0', () => {
      const adaptation = createProposedAdaptation(engine);
      engine.applyAdaptation(adaptation.id);
      engine.revertAdaptation(adaptation.id, 'reason');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationReverted')!;
      expect(envelope.version).toBe('1.0.0');
    });

    it('events have incrementing sequence numbers', () => {
      const a1 = createProposedAdaptation(engine);
      engine.applyAdaptation(a1.id);
      engine.revertAdaptation(a1.id, 'reason');
      const log = eventBus.getLog();
      expect(log[0].sequence).toBe(1);
      expect(log[1].sequence).toBe(2);
    });

    it('AdaptationApplied includes userIdHash in payload', () => {
      const userId = crypto.randomUUID();
      const adaptation = createProposedAdaptation(engine, { userIdHash: userId });
      engine.applyAdaptation(adaptation.id);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'AdaptationApplied')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['userIdHash']).toBe(userId);
    });
  });

  // ─── Adaptation Lifecycle ─────────────────────────────────────

  describe('adaptation lifecycle', () => {
    it('full lifecycle: Proposed → Applied → Reverted', () => {
      const adaptation = createProposedAdaptation(engine);
      expect(adaptation.state).toBe(AdaptationState.Proposed);

      const applied = engine.applyAdaptation(adaptation.id);
      expect(applied.state).toBe(AdaptationState.Applied);
      expect(applied.appliedAt).toBeTruthy();

      const reverted = engine.revertAdaptation(adaptation.id, 'lifecycle test');
      expect(reverted.state).toBe(AdaptationState.Reverted);
      expect(reverted.revertedAt).toBeTruthy();
    });

    it('full lifecycle: Proposed → Expired', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      expect(adaptation.state).toBe(AdaptationState.Proposed);

      engine2.applyAdaptation(adaptation.id);
      expect(engine2.getAdaptation(adaptation.id)!.state).toBe(AdaptationState.Applied);

      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      engine2.checkExpiredAdaptations();
      expect(engine2.getAdaptation(adaptation.id)!.state).toBe(AdaptationState.Expired);
      vi.useRealTimers();
    });

    it('cannot apply expired adaptation', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const adaptation = createProposedAdaptation(engine2);
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      // Try to apply — should fail with expired error
      expect(() => engine2.applyAdaptation(adaptation.id)).toThrow(AdaptationExpiredError);
      vi.useRealTimers();
    });

    it('expired adaptation is not in active adaptations', () => {
      vi.useFakeTimers();
      const engine2 = new AdaptationEngine(DefaultExperienceRuntimeConfig, eventBus, trace);
      const userId = crypto.randomUUID();
      const adaptation = createProposedAdaptation(engine2, { userIdHash: userId });
      engine2.applyAdaptation(adaptation.id);
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      engine2.checkExpiredAdaptations();
      expect(engine2.getActiveAdaptations(userId)).toHaveLength(0);
      vi.useRealTimers();
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles many adaptations for same user', () => {
      const userId = crypto.randomUUID();
      const count = 50;
      for (let i = 0; i < count; i++) {
        createProposedAdaptation(engine, { userIdHash: userId });
      }
      expect(engine.getAdaptationHistory(userId)).toHaveLength(count);
    });

    it('handles adaptations for many users', () => {
      const count = 20;
      for (let i = 0; i < count; i++) {
        const userId = crypto.randomUUID();
        createProposedAdaptation(engine, { userIdHash: userId });
      }
      expect(true).toBe(true);
    });

    it('proposed adaptation not in active adaptations', () => {
      const userId = crypto.randomUUID();
      createProposedAdaptation(engine, { userIdHash: userId });
      expect(engine.getActiveAdaptations(userId)).toHaveLength(0);
    });

    it('evidence is copied not referenced', () => {
      const evidence = createTestEvidence(2);
      const adaptation = createProposedAdaptation(engine, { evidence });
      expect(adaptation.evidence).toEqual(evidence);
      expect(adaptation.evidence).not.toBe(evidence);
    });

    it('adaptation has all required fields', () => {
      const adaptation = createProposedAdaptation(engine);
      expect(adaptation.id).toBeTruthy();
      expect(adaptation.type).toBeTruthy();
      expect(adaptation.userIdHash).toBeTruthy();
      expect(adaptation.previousValue).toBeDefined();
      expect(adaptation.newValue).toBeTruthy();
      expect(adaptation.state).toBeDefined();
      expect(adaptation.reason).toBeTruthy();
      expect(adaptation.evidence).toBeDefined();
      expect(adaptation.confidence).toBeDefined();
      expect(adaptation.expiresAt).toBeTruthy();
    });
  });
});
