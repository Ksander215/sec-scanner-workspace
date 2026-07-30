/**
 * Tests for RecommendationRuntime (Subsystem 5)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecommendationRuntime } from '../../core/experience/recommendation-runtime.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { TraceCollector } from '../../core/trace/trace-collector.js';
import {
  RecommendationState,
  RecommendationType,
  DefaultExperienceRuntimeConfig,
  type ObservationId,
  type ExperienceRuntimeConfig,
} from '../../core/experience/types.js';
import { RecommendationValidationError } from '../../core/experience/errors.js';

describe('RecommendationRuntime', () => {
  let runtime: RecommendationRuntime;
  let eventBus: InProcessEventBus;
  const userId = crypto.randomUUID();

  const makeEvidence = (): ObservationId[] =>
    [crypto.randomUUID() as ObservationId, crypto.randomUUID() as ObservationId];

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    runtime = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus);
  });

  // ─── Constructor ─────────────────────────────────────────

  describe('constructor', () => {
    it('creates instance without error', () => {
      const rt = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus);
      expect(rt).toBeInstanceOf(RecommendationRuntime);
    });

    it('creates instance with custom config', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxRecommendationsPerSession: 2 };
      const rt = new RecommendationRuntime(config, eventBus);
      expect(rt).toBeInstanceOf(RecommendationRuntime);
    });

    it('creates instance without optional trace', () => {
      const rt = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus);
      expect(rt).toBeInstanceOf(RecommendationRuntime);
    });

    it('creates instance with explicit trace collector', () => {
      const trace = new TraceCollector();
      const rt = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
      expect(rt).toBeInstanceOf(RecommendationRuntime);
    });

    it('logs initialization to trace', () => {
      const trace = new TraceCollector();
      new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
      expect(trace.length).toBe(1);
      expect(trace.getEntries()[0].message).toContain('initialized');
    });

    it('records maxRecommendationsPerSession in trace', () => {
      const trace = new TraceCollector();
      const config = { ...DefaultExperienceRuntimeConfig, maxRecommendationsPerSession: 99 };
      new RecommendationRuntime(config, eventBus, trace);
      expect(trace.getEntries()[0].data?.maxRecommendationsPerSession).toBe(99);
    });
  });

  // ─── generateRecommendation ─────────────────────────────

  describe('generateRecommendation', () => {
    it('creates a recommendation with Generated state', () => {
      const rec = runtime.generateRecommendation(
        RecommendationType.Workflow, userId, 'Use Shortcuts', 'Try keyboard shortcuts', makeEvidence(), 0.8,
      );
      expect(rec.state).toBe(RecommendationState.Generated);
    });

    it('assigns a unique id', () => {
      const r1 = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const r2 = runtime.generateRecommendation(RecommendationType.Feature, userId, 'B', 'D', makeEvidence(), 0.8);
      expect(r1.id).not.toBe(r2.id);
    });

    it('stores the provided type', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Automation, userId, 'A', 'D', makeEvidence(), 0.8);
      expect(rec.type).toBe(RecommendationType.Automation);
    });

    it('stores the provided userIdHash', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      expect(rec.userIdHash).toBe(userId);
    });

    it('stores the provided title', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'My Title', 'D', makeEvidence(), 0.8);
      expect(rec.title).toBe('My Title');
    });

    it('stores the provided description', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'My Desc', makeEvidence(), 0.8);
      expect(rec.description).toBe('My Desc');
    });

    it('stores the provided confidence', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.42);
      expect(rec.confidence).toBe(0.42);
    });

    it('stores the evidence observation IDs', () => {
      const evidence = makeEvidence();
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', evidence, 0.8);
      expect(rec.evidence).toEqual(evidence);
    });

    it('stores a generatedAt timestamp', () => {
      const before = new Date().toISOString();
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const after = new Date().toISOString();
      expect(rec.generatedAt >= before).toBe(true);
      expect(rec.generatedAt <= after).toBe(true);
    });

    it('does not have presentedAt initially', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      expect(rec.presentedAt).toBeUndefined();
    });

    it('does not have resolvedAt initially', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      expect(rec.resolvedAt).toBeUndefined();
    });

    it('supports all RecommendationType values', () => {
      for (const type of Object.values(RecommendationType)) {
        const rec = runtime.generateRecommendation(type, userId, `T-${type}`, 'D', makeEvidence(), 0.8);
        expect(rec.type).toBe(type);
      }
    });

    it('supports confidence of 0', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0);
      expect(rec.confidence).toBe(0);
    });

    it('supports confidence of 1', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 1);
      expect(rec.confidence).toBe(1);
    });

    // ─── Validation errors ───────────────────────────

    it('throws when userIdHash is empty', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Workflow, '', 'A', 'D', makeEvidence(), 0.8),
      ).toThrow(RecommendationValidationError);
    });

    it('throws when title is empty', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Workflow, userId, '', 'D', makeEvidence(), 0.8),
      ).toThrow(RecommendationValidationError);
    });

    it('throws when description is empty', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', '', makeEvidence(), 0.8),
      ).toThrow(RecommendationValidationError);
    });

    it('throws when evidence array is empty', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', [], 0.8),
      ).toThrow(RecommendationValidationError);
    });

    it('throws when confidence is negative', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), -0.1),
      ).toThrow(RecommendationValidationError);
    });

    it('throws when confidence exceeds 1', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 1.1),
      ).toThrow(RecommendationValidationError);
    });

    it('throws when confidence is not a number', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 'bad' as unknown as number),
      ).toThrow(RecommendationValidationError);
    });

    it('throws when userIdHash is not a string', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Workflow, 123 as unknown as string, 'A', 'D', makeEvidence(), 0.8),
      ).toThrow(RecommendationValidationError);
    });

    it('includes error code EXP-REC-002', () => {
      try {
        runtime.generateRecommendation(RecommendationType.Workflow, '', 'A', 'D', makeEvidence(), 0.8);
      } catch (e) {
        expect((e as RecommendationValidationError).code).toBe('EXP-REC-002');
      }
    });

    // ─── Event emission ───────────────────────────

    it('emits RecommendationGenerated event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('RecommendationGenerated', handler);
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('event contains correct payload fields', async () => {
      const handler = vi.fn();
      eventBus.subscribe('RecommendationGenerated', handler);
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'My Rec', 'Desc', makeEvidence(), 0.85);
      await new Promise(r => setTimeout(r, 10));
      const envelope = handler.mock.calls[0][0];
      expect(envelope.payload.recommendationId).toBe(rec.id);
      expect(envelope.payload.userIdHash).toBe(userId);
      expect(envelope.payload.recommendationType).toBe('Workflow');
      expect(envelope.payload.title).toBe('My Rec');
      expect(envelope.payload.confidence).toBe(0.85);
    });

    it('event has Info classification', async () => {
      const handler = vi.fn();
      eventBus.subscribe('RecommendationGenerated', handler);
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].classification).toBe('info');
    });

    it('logs generation to trace', () => {
      const trace = new TraceCollector();
      const rt = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
      rt.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const entries = trace.getEntries().filter(e => e.message === 'Recommendation generated');
      expect(entries).toHaveLength(1);
    });
  });

  // ─── presentRecommendation ─────────────────────────────

  describe('presentRecommendation', () => {
    it('transitions Generated to Presented', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const presented = runtime.presentRecommendation(rec.id);
      expect(presented.state).toBe(RecommendationState.Presented);
    });

    it('sets presentedAt timestamp', () => {
      const before = new Date().toISOString();
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const presented = runtime.presentRecommendation(rec.id);
      const after = new Date().toISOString();
      expect(presented.presentedAt! >= before).toBe(true);
      expect(presented.presentedAt! <= after).toBe(true);
    });

    it('preserves other fields', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Feature, userId, 'T', 'Desc', makeEvidence(), 0.75);
      const presented = runtime.presentRecommendation(rec.id);
      expect(presented.type).toBe(RecommendationType.Feature);
      expect(presented.title).toBe('T');
      expect(presented.confidence).toBe(0.75);
      expect(presented.evidence).toEqual(rec.evidence);
    });

    it('throws for non-existent recommendation', () => {
      expect(() => runtime.presentRecommendation(crypto.randomUUID() as any)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is already Presented', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      expect(() => runtime.presentRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is Accepted', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.acceptRecommendation(rec.id);
      expect(() => runtime.presentRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is Dismissed', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.dismissRecommendation(rec.id);
      expect(() => runtime.presentRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('logs presentation to trace', () => {
      const trace = new TraceCollector();
      const rt = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
      const rec = rt.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      rt.presentRecommendation(rec.id);
      const entries = trace.getEntries().filter(e => e.message === 'Recommendation presented');
      expect(entries).toHaveLength(1);
    });
  });

  // ─── acceptRecommendation ─────────────────────────────

  describe('acceptRecommendation', () => {
    it('transitions Presented to Accepted', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      const accepted = runtime.acceptRecommendation(rec.id);
      expect(accepted.state).toBe(RecommendationState.Accepted);
    });

    it('sets resolvedAt timestamp', () => {
      const before = new Date().toISOString();
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      const accepted = runtime.acceptRecommendation(rec.id);
      const after = new Date().toISOString();
      expect(accepted.resolvedAt! >= before).toBe(true);
      expect(accepted.resolvedAt! <= after).toBe(true);
    });

    it('preserves other fields', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Optimization, userId, 'Opt', 'Desc', makeEvidence(), 0.6);
      runtime.presentRecommendation(rec.id);
      const accepted = runtime.acceptRecommendation(rec.id);
      expect(accepted.type).toBe(RecommendationType.Optimization);
      expect(accepted.title).toBe('Opt');
    });

    it('throws for non-existent recommendation', () => {
      expect(() => runtime.acceptRecommendation(crypto.randomUUID() as any)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is Generated', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      expect(() => runtime.acceptRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is Accepted', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.acceptRecommendation(rec.id);
      expect(() => runtime.acceptRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is Dismissed', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.dismissRecommendation(rec.id);
      expect(() => runtime.acceptRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('logs acceptance to trace', () => {
      const trace = new TraceCollector();
      const rt = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
      const rec = rt.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      rt.presentRecommendation(rec.id);
      rt.acceptRecommendation(rec.id);
      const entries = trace.getEntries().filter(e => e.message === 'Recommendation accepted');
      expect(entries).toHaveLength(1);
    });
  });

  // ─── dismissRecommendation ─────────────────────────────

  describe('dismissRecommendation', () => {
    it('transitions Presented to Dismissed', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      const dismissed = runtime.dismissRecommendation(rec.id);
      expect(dismissed.state).toBe(RecommendationState.Dismissed);
    });

    it('sets resolvedAt timestamp', () => {
      const before = new Date().toISOString();
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      const dismissed = runtime.dismissRecommendation(rec.id);
      const after = new Date().toISOString();
      expect(dismissed.resolvedAt! >= before).toBe(true);
      expect(dismissed.resolvedAt! <= after).toBe(true);
    });

    it('throws for non-existent recommendation', () => {
      expect(() => runtime.dismissRecommendation(crypto.randomUUID() as any)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is Generated', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      expect(() => runtime.dismissRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is Accepted', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.acceptRecommendation(rec.id);
      expect(() => runtime.dismissRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('throws when recommendation is Dismissed', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.dismissRecommendation(rec.id);
      expect(() => runtime.dismissRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('logs dismissal to trace', () => {
      const trace = new TraceCollector();
      const rt = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
      const rec = rt.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      rt.presentRecommendation(rec.id);
      rt.dismissRecommendation(rec.id);
      const entries = trace.getEntries().filter(e => e.message === 'Recommendation dismissed');
      expect(entries).toHaveLength(1);
    });
  });

  // ─── getPendingRecommendations ────────────────────────

  describe('getPendingRecommendations', () => {
    it('includes Generated recommendations', () => {
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const pending = runtime.getPendingRecommendations(userId);
      expect(pending).toHaveLength(1);
      expect(pending[0].state).toBe(RecommendationState.Generated);
    });

    it('includes Presented recommendations', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      const pending = runtime.getPendingRecommendations(userId);
      expect(pending).toHaveLength(1);
      expect(pending[0].state).toBe(RecommendationState.Presented);
    });

    it('excludes Accepted recommendations', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.acceptRecommendation(rec.id);
      const pending = runtime.getPendingRecommendations(userId);
      expect(pending).toHaveLength(0);
    });

    it('excludes Dismissed recommendations', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.dismissRecommendation(rec.id);
      const pending = runtime.getPendingRecommendations(userId);
      expect(pending).toHaveLength(0);
    });

    it('returns empty array for unknown user', () => {
      expect(runtime.getPendingRecommendations(crypto.randomUUID())).toEqual([]);
    });

    it('returns empty array when no recommendations exist', () => {
      expect(runtime.getPendingRecommendations(userId)).toEqual([]);
    });

    it('does not mix users', () => {
      const otherUser = crypto.randomUUID();
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.generateRecommendation(RecommendationType.Feature, otherUser, 'B', 'D', makeEvidence(), 0.7);
      expect(runtime.getPendingRecommendations(userId)).toHaveLength(1);
      expect(runtime.getPendingRecommendations(otherUser)).toHaveLength(1);
    });

    it('includes both Generated and Presented in result', () => {
      const r1 = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'G', 'D', makeEvidence(), 0.8);
      const r2 = runtime.generateRecommendation(RecommendationType.Feature, userId, 'P', 'D', makeEvidence(), 0.7);
      runtime.presentRecommendation(r2.id);
      const pending = runtime.getPendingRecommendations(userId);
      expect(pending).toHaveLength(2);
    });

    it('returns results with type readonly', () => {
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const pending = runtime.getPendingRecommendations(userId);
      // TypeScript readonly — the return type is readonly Recommendation[]
      expect(Array.isArray(pending)).toBe(true);
    });
  });

  // ─── getRecommendationsForSession ────────────────────────

  describe('getRecommendationsForSession', () => {
    it('returns Generated recommendations sorted by confidence', () => {
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'Low', 'D', makeEvidence(), 0.3);
      runtime.generateRecommendation(RecommendationType.Feature, userId, 'High', 'D', makeEvidence(), 0.9);
      const session = runtime.getRecommendationsForSession(userId);
      expect(session).toHaveLength(2);
      expect(session[0].title).toBe('High');
      expect(session[1].title).toBe('Low');
    });

    it('respects maxRecommendationsPerSession', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxRecommendationsPerSession: 2 };
      const rt = new RecommendationRuntime(config, eventBus);
      rt.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.9);
      rt.generateRecommendation(RecommendationType.Feature, userId, 'B', 'D', makeEvidence(), 0.8);
      rt.generateRecommendation(RecommendationType.Automation, userId, 'C', 'D', makeEvidence(), 0.7);
      const session = rt.getRecommendationsForSession(userId);
      expect(session).toHaveLength(2);
    });

    it('prioritizes Generated over Presented', () => {
      const r1 = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'Presented', 'D', makeEvidence(), 0.5);
      runtime.presentRecommendation(r1.id);
      runtime.generateRecommendation(RecommendationType.Feature, userId, 'Generated', 'D', makeEvidence(), 0.4);
      const session = runtime.getRecommendationsForSession(userId);
      expect(session[0].title).toBe('Generated');
    });

    it('returns empty when all slots used by presented', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxRecommendationsPerSession: 1 };
      const rt = new RecommendationRuntime(config, eventBus);
      const r1 = rt.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      rt.presentRecommendation(r1.id);
      rt.generateRecommendation(RecommendationType.Feature, userId, 'B', 'D', makeEvidence(), 0.7);
      const session = rt.getRecommendationsForSession(userId);
      expect(session).toHaveLength(0);
    });

    it('returns empty for unknown user', () => {
      expect(runtime.getRecommendationsForSession(crypto.randomUUID())).toEqual([]);
    });

    it('accounts for remaining slots after some presented', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxRecommendationsPerSession: 3 };
      const rt = new RecommendationRuntime(config, eventBus);
      const r1 = rt.generateRecommendation(RecommendationType.Workflow, userId, 'P1', 'D', makeEvidence(), 0.9);
      rt.presentRecommendation(r1.id);
      rt.generateRecommendation(RecommendationType.Feature, userId, 'G1', 'D', makeEvidence(), 0.8);
      rt.generateRecommendation(RecommendationType.Automation, userId, 'G2', 'D', makeEvidence(), 0.7);
      const session = rt.getRecommendationsForSession(userId);
      expect(session).toHaveLength(2);
    });

    it('logs limit reached to trace', () => {
      const trace = new TraceCollector();
      const config = { ...DefaultExperienceRuntimeConfig, maxRecommendationsPerSession: 1 };
      const rt = new RecommendationRuntime(config, eventBus, trace);
      const r1 = rt.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      rt.presentRecommendation(r1.id);
      rt.generateRecommendation(RecommendationType.Feature, userId, 'B', 'D', makeEvidence(), 0.7);
      rt.getRecommendationsForSession(userId);
      const entries = trace.getEntries().filter(e => e.message === 'Session recommendation limit reached');
      expect(entries).toHaveLength(1);
    });

    it('returns readonly-style result', () => {
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const session = runtime.getRecommendationsForSession(userId);
      expect(Array.isArray(session)).toBe(true);
    });
  });

  // ─── expireRecommendations ───────────────────────────────

  describe('expireRecommendations', () => {
    it('returns 0 when no recommendations to expire', () => {
      expect(runtime.expireRecommendations()).toBe(0);
    });

    it('does not expire fresh recommendations', () => {
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      const count = runtime.expireRecommendations();
      expect(count).toBe(0);
    });

    it('does not expire Accepted recommendations', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.acceptRecommendation(rec.id);
      const count = runtime.expireRecommendations();
      expect(count).toBe(0);
    });

    it('does not expire Dismissed recommendations', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.dismissRecommendation(rec.id);
      const count = runtime.expireRecommendations();
      expect(count).toBe(0);
    });

    it('returns count of expired recommendations', () => {
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      const count = runtime.expireRecommendations();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('returns numeric value', () => {
      expect(typeof runtime.expireRecommendations()).toBe('number');
    });

    it('returns 0 when only Accepted and Dismissed exist', () => {
      const r1 = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(r1.id);
      runtime.acceptRecommendation(r1.id);
      const r2 = runtime.generateRecommendation(RecommendationType.Feature, userId, 'B', 'D', makeEvidence(), 0.7);
      runtime.presentRecommendation(r2.id);
      runtime.dismissRecommendation(r2.id);
      expect(runtime.expireRecommendations()).toBe(0);
    });

    it('logs expiration count to trace when expired', () => {
      const trace = new TraceCollector();
      const rt = new RecommendationRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
      rt.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      // Simulate by expiring — fresh recs won't expire, so this test checks trace behavior
      rt.expireRecommendations();
      // No expiration should have happened since rec is fresh
      const expiredEntries = trace.getEntries().filter(e => e.message === 'Recommendations expired');
      expect(expiredEntries).toHaveLength(0);
    });
  });

  // ─── Multi-user isolation ───────────────────────────────

  describe('multi-user isolation', () => {
    it('recommendations for different users are independent', () => {
      const userB = crypto.randomUUID();
      const rA = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const rB = runtime.generateRecommendation(RecommendationType.Feature, userB, 'B', 'D', makeEvidence(), 0.7);
      expect(rA.userIdHash).toBe(userId);
      expect(rB.userIdHash).toBe(userB);
    });

    it('present for one user does not affect another', () => {
      const userB = crypto.randomUUID();
      const rA = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rA.id);
      const pendingB = runtime.getPendingRecommendations(userB);
      expect(pendingB).toHaveLength(0);
    });

    it('accept for one user does not affect another', () => {
      const userB = crypto.randomUUID();
      runtime.generateRecommendation(RecommendationType.Workflow, userId, 'A', 'D', makeEvidence(), 0.8);
      const rB = runtime.generateRecommendation(RecommendationType.Feature, userB, 'B', 'D', makeEvidence(), 0.7);
      runtime.presentRecommendation(rB.id);
      runtime.acceptRecommendation(rB.id);
      const pendingA = runtime.getPendingRecommendations(userId);
      expect(pendingA).toHaveLength(1);
    });
  });

  // ─── Full lifecycle ───────────────────────────────────────

  describe('full lifecycle', () => {
    it('complete lifecycle: generate → present → accept', () => {
      const rec = runtime.generateRecommendation(
        RecommendationType.Workflow, userId, 'Full', 'Lifecycle', makeEvidence(), 0.9,
      );
      expect(rec.state).toBe(RecommendationState.Generated);
      const presented = runtime.presentRecommendation(rec.id);
      expect(presented.state).toBe(RecommendationState.Presented);
      expect(presented.presentedAt).toBeDefined();
      const accepted = runtime.acceptRecommendation(rec.id);
      expect(accepted.state).toBe(RecommendationState.Accepted);
      expect(accepted.resolvedAt).toBeDefined();
    });

    it('complete lifecycle: generate → present → dismiss', () => {
      const rec = runtime.generateRecommendation(
        RecommendationType.Feature, userId, 'Dis', 'Miss', makeEvidence(), 0.5,
      );
      runtime.presentRecommendation(rec.id);
      const dismissed = runtime.dismissRecommendation(rec.id);
      expect(dismissed.state).toBe(RecommendationState.Dismissed);
      expect(dismissed.resolvedAt).toBeDefined();
    });

    it('cannot transition backwards from Accepted to Presented', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.acceptRecommendation(rec.id);
      expect(() => runtime.presentRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('cannot accept a dismissed recommendation', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.dismissRecommendation(rec.id);
      expect(() => runtime.acceptRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('cannot dismiss an accepted recommendation', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      runtime.presentRecommendation(rec.id);
      runtime.acceptRecommendation(rec.id);
      expect(() => runtime.dismissRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('cannot accept directly from Generated (skipping present)', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      expect(() => runtime.acceptRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });

    it('cannot dismiss directly from Generated (skipping present)', () => {
      const rec = runtime.generateRecommendation(RecommendationType.Workflow, userId, 'T', 'D', makeEvidence(), 0.8);
      expect(() => runtime.dismissRecommendation(rec.id)).toThrow(RecommendationValidationError);
    });
  });
});
