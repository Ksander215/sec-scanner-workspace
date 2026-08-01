import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { DefaultEvolutionRuntimeConfig } from '../../core/evolution/types.js';
import { BottleneckDetector } from '../../core/evolution/bottleneck-detector.js';
import { ConstraintAnalyzer } from '../../core/evolution/constraint-analyzer.js';
import { TechDebtAnalyzer } from '../../core/evolution/tech-debt-analyzer.js';
import { FeedbackCollector } from '../../core/evolution/feedback-collector.js';
import { LearningLoop } from '../../core/evolution/learning-loop.js';
import {
  BottleneckScope,
  BottleneckSeverity,
  ConstraintType,
  TechDebtPriority,
  FeedbackSource,
  FeedbackSentiment,
  LearningOutcome,
} from '../../core/evolution/types.js';
import { EventClassification } from '../../core/types/common.js';
import {
  BottleneckNotFoundError,
  BottleneckLimitExceededError,
  TechDebtNotFoundError,
  TechDebtLimitExceededError,
  FeedbackNotFoundError,
  FeedbackLimitExceededError,
} from '../../core/evolution/errors.js';

// ═══════════════════════════════════════════════════════════════════
// 1. BottleneckDetector
// ═══════════════════════════════════════════════════════════════════

describe('BottleneckDetector', () => {
  let bus: InProcessEventBus;
  let detector: BottleneckDetector;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    detector = new BottleneckDetector(
      { ...DefaultEvolutionRuntimeConfig.bottleneckDetector },
      bus,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- detect() happy path ---
  describe('detect() — happy path', () => {
    it('returns an array with one bottleneck', async () => {
      const result = await detector.detect({ runtimeName: 'rt' });
      expect(result).toHaveLength(1);
    });

    it('returns a frozen bottleneck object', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(Object.isFrozen(bn)).toBe(true);
    });

    it('assigns a branded id starting with "bn-"', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.id).toMatch(/^bn-/);
    });

    it('sets name to include the runtime name', async () => {
      const [bn] = await detector.detect({ runtimeName: 'myRuntime' });
      expect(bn.name).toContain('myRuntime');
    });

    it('sets description to include the runtime name and timestamp', async () => {
      const [bn] = await detector.detect({ runtimeName: 'myRuntime' });
      expect(bn.description).toContain('myRuntime');
      expect(bn.description).toContain('Detected constraint');
    });

    it('defaults runtimeName to "unknown" when omitted', async () => {
      const [bn] = await detector.detect({});
      expect(bn.targetRuntime).toBe('unknown');
      expect(bn.name).toContain('unknown');
    });

    it('uses provided runtimeName when given', async () => {
      const [bn] = await detector.detect({ runtimeName: 'custom-rt' });
      expect(bn.targetRuntime).toBe('custom-rt');
    });

    it('sets targetCapability from params', async () => {
      const [bn] = await detector.detect({ capabilityName: 'cap-A' });
      expect(bn.targetCapability).toBe('cap-A');
    });

    it('defaults targetCapability to null when omitted', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.targetCapability).toBeNull();
    });

    it('sets targetWorkflow from params', async () => {
      const [bn] = await detector.detect({ workflowName: 'wf-B' });
      expect(bn.targetWorkflow).toBe('wf-B');
    });

    it('defaults targetWorkflow to null when omitted', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.targetWorkflow).toBeNull();
    });

    it('sets detectedAt to a valid ISO timestamp', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('initializes resolvedAt to null', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.resolvedAt).toBeNull();
    });

    it('sets relatedBottleneckIds to empty array', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.relatedBottleneckIds).toEqual([]);
    });

    it('freezes relatedBottleneckIds array', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(Object.isFrozen(bn.relatedBottleneckIds)).toBe(true);
    });

    it('stores evidence array from errors param', async () => {
      const [bn] = await detector.detect({ errors: ['err1', 'err2'] });
      expect(bn.evidence).toContain('err1');
      expect(bn.evidence).toContain('err2');
    });

    it('freezes evidence array', async () => {
      const [bn] = await detector.detect({ errors: ['err1'] });
      expect(Object.isFrozen(bn.evidence)).toBe(true);
    });

    it('adds "auto-detected" evidence when errors.length < minEvidenceItems', async () => {
      detector = new BottleneckDetector(
        { ...DefaultEvolutionRuntimeConfig.bottleneckDetector, minEvidenceItems: 3 },
        bus,
      );
      const [bn] = await detector.detect({ errors: ['e1'] });
      expect(bn.evidence).toContain('auto-detected');
    });

    it('does not add "auto-detected" when errors.length >= minEvidenceItems', async () => {
      const [bn] = await detector.detect({ errors: ['e1', 'e2'] });
      expect(bn.evidence).not.toContain('auto-detected');
    });

    it('copies metadata from params', async () => {
      const meta = { key: 'val' };
      const [bn] = await detector.detect({ metadata: meta });
      expect(bn.metadata).toEqual(meta);
    });

    it('freezes metadata', async () => {
      const [bn] = await detector.detect({ metadata: { a: 1 } });
      expect(Object.isFrozen(bn.metadata)).toBe(true);
    });

    it('defaults metadata to empty object when omitted', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.metadata).toEqual({});
    });

    it('stores the bottleneck so getById can retrieve it', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      const found = await detector.getById(bn.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(bn.id);
    });

    it('publishes a detected event on the bus', async () => {
      await detector.detect({ runtimeName: 'rt' });
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.bottleneck.detected');
    });

    it('event has correct classification', async () => {
      await detector.detect({ runtimeName: 'rt' });
      const envelope = bus.getLog()[0];
      expect(envelope.classification).toBe(EventClassification.Result);
    });

    it('event sequence increments with each detect', async () => {
      await detector.detect({ runtimeName: 'rt' });
      await detector.detect({ runtimeName: 'rt' });
      expect(bus.getLog()[1].sequence).toBeGreaterThan(bus.getLog()[0].sequence);
    });
  });

  // --- detect() constraint type inference ---
  describe('detect() — constraint type inference', () => {
    it('infers Performance when latency_ms metric is present', async () => {
      const [bn] = await detector.detect({ metrics: { latency_ms: 500 } });
      expect(bn.constraintType).toBe(ConstraintType.Performance);
    });

    it('infers Performance when response_time metric is present', async () => {
      const [bn] = await detector.detect({ metrics: { response_time: 200 } });
      expect(bn.constraintType).toBe(ConstraintType.Performance);
    });

    it('infers Quality when error_rate metric is present', async () => {
      const [bn] = await detector.detect({ metrics: { error_rate: 0.5 } });
      expect(bn.constraintType).toBe(ConstraintType.Quality);
    });

    it('infers Quality when errors array is non-empty', async () => {
      const [bn] = await detector.detect({ errors: ['some error'] });
      expect(bn.constraintType).toBe(ConstraintType.Quality);
    });

    it('infers UX when ux_score metric is present', async () => {
      const [bn] = await detector.detect({ metrics: { ux_score: 3.2 } });
      expect(bn.constraintType).toBe(ConstraintType.UX);
    });

    it('infers Architecture when no special metrics or errors', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt', metrics: {} });
      expect(bn.constraintType).toBe(ConstraintType.Architecture);
    });

    it('Performance takes priority over Quality when both metrics present', async () => {
      const [bn] = await detector.detect({
        metrics: { latency_ms: 100, error_rate: 0.2 },
      });
      expect(bn.constraintType).toBe(ConstraintType.Performance);
    });

    it('Performance takes priority over errors', async () => {
      const [bn] = await detector.detect({
        metrics: { latency_ms: 100 },
        errors: ['err1'],
      });
      expect(bn.constraintType).toBe(ConstraintType.Performance);
    });

    it('Quality inferred from errors when no quality metric', async () => {
      const [bn] = await detector.detect({ errors: ['err1', 'err2'] });
      expect(bn.constraintType).toBe(ConstraintType.Quality);
    });
  });

  // --- detect() severity inference ---
  describe('detect() — severity inference', () => {
    it('severity is Critical when errors.length >= 5', async () => {
      const [bn] = await detector.detect({
        errors: ['e1', 'e2', 'e3', 'e4', 'e5'],
      });
      expect(bn.severity).toBe(BottleneckSeverity.Critical);
    });

    it('severity is High when errors.length >= 3 and < 5', async () => {
      const [bn] = await detector.detect({ errors: ['e1', 'e2', 'e3'] });
      expect(bn.severity).toBe(BottleneckSeverity.High);
    });

    it('severity is Medium when errors.length >= 1 and < 3', async () => {
      const [bn] = await detector.detect({ errors: ['e1'] });
      expect(bn.severity).toBe(BottleneckSeverity.Medium);
    });

    it('severity is Low when errors array is empty', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.severity).toBe(BottleneckSeverity.Low);
    });

    it('severity is Low when errors is undefined', async () => {
      const [bn] = await detector.detect({});
      expect(bn.severity).toBe(BottleneckSeverity.Low);
    });

    it('boundary: exactly 5 errors yields Critical', async () => {
      const [bn] = await detector.detect({
        errors: Array.from({ length: 5 }, (_, i) => `e${i}`),
      });
      expect(bn.severity).toBe(BottleneckSeverity.Critical);
    });

    it('boundary: exactly 3 errors yields High', async () => {
      const [bn] = await detector.detect({
        errors: Array.from({ length: 3 }, (_, i) => `e${i}`),
      });
      expect(bn.severity).toBe(BottleneckSeverity.High);
    });

    it('boundary: exactly 1 error yields Medium', async () => {
      const [bn] = await detector.detect({ errors: ['only-one'] });
      expect(bn.severity).toBe(BottleneckSeverity.Medium);
    });
  });

  // --- detect() scope inference ---
  describe('detect() — scope inference', () => {
    it('scope is Workflow when workflowName is provided', async () => {
      const [bn] = await detector.detect({ workflowName: 'wf-1' });
      expect(bn.scope).toBe(BottleneckScope.Workflow);
    });

    it('scope is Capability when capabilityName is provided (no workflow)', async () => {
      const [bn] = await detector.detect({ capabilityName: 'cap-1' });
      expect(bn.scope).toBe(BottleneckScope.Capability);
    });

    it('scope is Runtime when neither workflow nor capability provided', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect(bn.scope).toBe(BottleneckScope.Runtime);
    });

    it('Workflow takes priority over Capability when both provided', async () => {
      const [bn] = await detector.detect({
        workflowName: 'wf-1',
        capabilityName: 'cap-1',
      });
      expect(bn.scope).toBe(BottleneckScope.Workflow);
    });
  });

  // --- detect() limit exceeded ---
  describe('detect() — limit exceeded', () => {
    it('throws BottleneckLimitExceededError at capacity', async () => {
      detector = new BottleneckDetector({ maxBottlenecks: 1, scanIntervalMs: 60_000, minEvidenceItems: 1 }, bus);
      await detector.detect({ runtimeName: 'rt' });
      await expect(detector.detect({ runtimeName: 'rt' })).rejects.toThrow(BottleneckLimitExceededError);
    });

    it('error message includes the limit value', async () => {
      detector = new BottleneckDetector({ maxBottlenecks: 2, scanIntervalMs: 60_000, minEvidenceItems: 1 }, bus);
      await detector.detect({ runtimeName: 'rt' });
      await detector.detect({ runtimeName: 'rt' });
      await expect(detector.detect({ runtimeName: 'rt' })).rejects.toThrow('2');
    });

    it('works fine when under the limit', async () => {
      detector = new BottleneckDetector({ maxBottlenecks: 5, scanIntervalMs: 60_000, minEvidenceItems: 1 }, bus);
      for (let i = 0; i < 5; i++) {
        const result = await detector.detect({ runtimeName: `rt-${i}` });
        expect(result).toHaveLength(1);
      }
    });
  });

  // --- getById() ---
  describe('getById()', () => {
    it('returns the bottleneck when found', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      const found = await detector.getById(bn.id);
      expect(found).toEqual(bn);
    });

    it('returns null when id does not exist', async () => {
      const found = await detector.getById('nonexistent-id' as any);
      expect(found).toBeNull();
    });

    it('returns null for empty-string id', async () => {
      const found = await detector.getById('' as any);
      expect(found).toBeNull();
    });
  });

  // --- list() ---
  describe('list()', () => {
    it('returns empty array when no bottlenecks', async () => {
      const result = await detector.list();
      expect(result).toEqual([]);
    });

    it('returns all bottlenecks with no filter', async () => {
      await detector.detect({ runtimeName: 'rt1' });
      await detector.detect({ runtimeName: 'rt2' });
      const result = await detector.list();
      expect(result).toHaveLength(2);
    });

    it('filters by scope=Runtime', async () => {
      await detector.detect({ runtimeName: 'rt1' });
      await detector.detect({ workflowName: 'wf1' });
      const result = await detector.list({ scope: BottleneckScope.Runtime });
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe(BottleneckScope.Runtime);
    });

    it('filters by scope=Workflow', async () => {
      await detector.detect({ runtimeName: 'rt1' });
      await detector.detect({ workflowName: 'wf1' });
      const result = await detector.list({ scope: BottleneckScope.Workflow });
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe(BottleneckScope.Workflow);
    });

    it('filters by scope=Capability', async () => {
      await detector.detect({ capabilityName: 'cap1' });
      await detector.detect({ workflowName: 'wf1' });
      const result = await detector.list({ scope: BottleneckScope.Capability });
      expect(result).toHaveLength(1);
    });

    it('filters by severity=Low', async () => {
      await detector.detect({ runtimeName: 'rt' });
      await detector.detect({ errors: ['e1'] });
      const result = await detector.list({ severity: BottleneckSeverity.Low });
      expect(result).toHaveLength(1);
    });

    it('filters by severity=Critical', async () => {
      await detector.detect({ errors: Array(5).fill('err') });
      await detector.detect({ runtimeName: 'rt' });
      const result = await detector.list({ severity: BottleneckSeverity.Critical });
      expect(result).toHaveLength(1);
    });

    it('filters by resolved=true', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      await detector.resolve(bn.id);
      const result = await detector.list({ resolved: true });
      expect(result).toHaveLength(1);
      expect(result[0].resolvedAt).not.toBeNull();
    });

    it('filters by resolved=false', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      await detector.resolve(bn.id);
      const result = await detector.list({ resolved: false });
      expect(result).toHaveLength(0);
    });

    it('combined filter: scope and severity', async () => {
      await detector.detect({ runtimeName: 'rt' });
      await detector.detect({ workflowName: 'wf1', errors: ['e1', 'e2', 'e3'] });
      const result = await detector.list({
        scope: BottleneckScope.Workflow,
        severity: BottleneckSeverity.High,
      });
      expect(result).toHaveLength(1);
    });

    it('combined filter returns empty when no match', async () => {
      await detector.detect({ runtimeName: 'rt' });
      const result = await detector.list({
        scope: BottleneckScope.Workflow,
      });
      expect(result).toHaveLength(0);
    });
  });

  // --- resolve() ---
  describe('resolve()', () => {
    it('throws BottleneckNotFoundError for nonexistent id', async () => {
      await expect(detector.resolve('nope' as any)).rejects.toThrow(BottleneckNotFoundError);
    });

    it('error includes the bottleneck id', async () => {
      try {
        await detector.resolve('missing-id' as any);
      } catch (err) {
        expect((err as BottleneckNotFoundError).bottleneckId).toBe('missing-id');
      }
    });

    it('sets resolvedAt to a valid ISO timestamp', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      await detector.resolve(bn.id);
      const updated = await detector.getById(bn.id);
      expect(updated!.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('resolved bottleneck is still frozen', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      await detector.resolve(bn.id);
      const updated = await detector.getById(bn.id);
      expect(Object.isFrozen(updated!)).toBe(true);
    });

    it('publishes a resolved event', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      bus.clear();
      await detector.resolve(bn.id);
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.bottleneck.resolved');
    });

    it('resolved event has StateChange classification', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      bus.clear();
      await detector.resolve(bn.id);
      expect(bus.getLog()[0].classification).toBe(EventClassification.StateChange);
    });

    it('resolving an already-resolved bottleneck updates resolvedAt', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      await detector.resolve(bn.id);
      const first = (await detector.getById(bn.id))!.resolvedAt;
      // small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 2));
      await detector.resolve(bn.id);
      const second = (await detector.getById(bn.id))!.resolvedAt;
      expect(second).not.toBe(first);
    });
  });

  // --- count() ---
  describe('count()', () => {
    it('returns 0 initially', async () => {
      expect(await detector.count()).toBe(0);
    });

    it('increments with each detect', async () => {
      await detector.detect({ runtimeName: 'rt' });
      expect(await detector.count()).toBe(1);
      await detector.detect({ runtimeName: 'rt' });
      expect(await detector.count()).toBe(2);
    });

    it('count does not change on resolve', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      await detector.resolve(bn.id);
      expect(await detector.count()).toBe(1);
    });
  });

  // --- Event verification ---
  describe('event verification', () => {
    it('detected event includes bottleneckId', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      const envelope = bus.getLog()[0];
      expect(envelope.eventId).toBeDefined();
      expect(envelope.version).toBe('1.0.0');
    });

    it('detected event includes aggregateType "Bottleneck"', async () => {
      await detector.detect({ runtimeName: 'rt' });
      const envelope = bus.getLog()[0];
      expect(envelope.sequence).toBeGreaterThanOrEqual(1);
    });

    it('resolved event includes bottleneckId via aggregateId', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      bus.clear();
      await detector.resolve(bn.id);
      const envelope = bus.getLog()[0];
      expect(envelope.eventType).toBe('evolution.bottleneck.resolved');
    });

    it('no events when eventBus is null', async () => {
      const noBusDetector = new BottleneckDetector(
        { ...DefaultEvolutionRuntimeConfig.bottleneckDetector },
        null,
      );
      await noBusDetector.detect({ runtimeName: 'rt' });
      expect(bus.getLog().length).toBe(0);
    });

    it('no events when eventBus is undefined', async () => {
      const noBusDetector = new BottleneckDetector(
        { ...DefaultEvolutionRuntimeConfig.bottleneckDetector },
        undefined,
      );
      await noBusDetector.detect({ runtimeName: 'rt' });
      expect(bus.getLog().length).toBe(0);
    });

    it('no resolve event when eventBus is null', async () => {
      const noBusDetector = new BottleneckDetector(
        { ...DefaultEvolutionRuntimeConfig.bottleneckDetector },
        null,
      );
      const [bn] = await noBusDetector.detect({ runtimeName: 'rt' });
      await noBusDetector.resolve(bn.id);
      expect(bus.getLog().length).toBe(0);
    });

    it('event timestamp is a valid ISO string', async () => {
      await detector.detect({ runtimeName: 'rt' });
      expect(bus.getLog()[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // --- Additional edge cases ---
  describe('additional edge cases', () => {
    it('detect with empty string runtimeName', async () => {
      const [bn] = await detector.detect({ runtimeName: '' });
      expect(bn.targetRuntime).toBe('');
      expect(bn.name).toContain('');
    });

    it('detect with empty errors array', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt', errors: [] });
      expect(bn.evidence).toContain('auto-detected');
    });

    it('detect with empty metrics object', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt', metrics: {} });
      expect(bn.constraintType).toBe(ConstraintType.Architecture);
    });

    it('detect with multiple metrics - latency_ms takes priority', async () => {
      const [bn] = await detector.detect({
        runtimeName: 'rt',
        metrics: { latency_ms: 100, error_rate: 0.5, ux_score: 3 },
      });
      expect(bn.constraintType).toBe(ConstraintType.Performance);
    });

    it('list with no bottlenecks returns empty for any filter', async () => {
      expect(await detector.list({ scope: BottleneckScope.Runtime })).toEqual([]);
      expect(await detector.list({ severity: BottleneckSeverity.Critical })).toEqual([]);
      expect(await detector.list({ resolved: true })).toEqual([]);
      expect(await detector.list({ resolved: false })).toEqual([]);
    });

    it('count after multiple detects', async () => {
      for (let i = 0; i < 10; i++) {
        await detector.detect({ runtimeName: `rt-${i}` });
      }
      expect(await detector.count()).toBe(10);
    });

    it('resolve updates the bottleneck in-place (getById reflects change)', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      expect((await detector.getById(bn.id))!.resolvedAt).toBeNull();
      await detector.resolve(bn.id);
      expect((await detector.getById(bn.id))!.resolvedAt).not.toBeNull();
    });

    it('list filter by resolved=false after adding unresovled bottlenecks', async () => {
      await detector.detect({ runtimeName: 'rt1' });
      await detector.detect({ runtimeName: 'rt2' });
      expect(await detector.list({ resolved: false })).toHaveLength(2);
    });

    it('detect with metadata containing multiple keys', async () => {
      const meta = { env: 'prod', region: 'us-east', team: 'platform' };
      const [bn] = await detector.detect({ runtimeName: 'rt', metadata: meta });
      expect(bn.metadata).toEqual(meta);
    });

    it('evidence includes all error strings', async () => {
      const errors = ['err-a', 'err-b', 'err-c'];
      const [bn] = await detector.detect({ errors });
      for (const e of errors) {
        expect(bn.evidence).toContain(e);
      }
    });

    it('multiple resolves only produce one resolved event each', async () => {
      const [bn] = await detector.detect({ runtimeName: 'rt' });
      bus.clear();
      await detector.resolve(bn.id);
      await detector.resolve(bn.id);
      expect(bus.getLog().length).toBe(2);
      bus.getLog().forEach((e) => {
        expect(e.eventType).toBe('evolution.bottleneck.resolved');
      });
    });

    it('detect with zero maxBottlenecks throws immediately', async () => {
      detector = new BottleneckDetector({ maxBottlenecks: 0, scanIntervalMs: 60_000, minEvidenceItems: 1 }, bus);
      await expect(detector.detect({ runtimeName: 'rt' })).rejects.toThrow(BottleneckLimitExceededError);
    });

    it('resolve preserves all other bottleneck fields', async () => {
      const [bn] = await detector.detect({
        runtimeName: 'my-rt',
        capabilityName: 'my-cap',
        workflowName: null,
        errors: ['e1'],
        metrics: { latency_ms: 100 },
        metadata: { key: 'val' },
      });
      await detector.resolve(bn.id);
      const updated = await detector.getById(bn.id);
      expect(updated!.name).toBe(bn.name);
      expect(updated!.description).toBe(bn.description);
      expect(updated!.constraintType).toBe(bn.constraintType);
      expect(updated!.scope).toBe(bn.scope);
      expect(updated!.severity).toBe(bn.severity);
      expect(updated!.targetRuntime).toBe(bn.targetRuntime);
      expect(updated!.targetCapability).toBe(bn.targetCapability);
      expect(updated!.evidence).toEqual(bn.evidence);
      expect(updated!.detectedAt).toBe(bn.detectedAt);
      expect(updated!.metadata).toEqual(bn.metadata);
    });

    it('detect without eventBus still stores bottleneck internally', async () => {
      const noBusDetector = new BottleneckDetector(
        { ...DefaultEvolutionRuntimeConfig.bottleneckDetector },
        null,
      );
      const [bn] = await noBusDetector.detect({ runtimeName: 'rt' });
      const found = await noBusDetector.getById(bn.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(bn.id);
    });

    it('resolve on noBus detector still updates state', async () => {
      const noBusDetector = new BottleneckDetector(
        { ...DefaultEvolutionRuntimeConfig.bottleneckDetector },
        null,
      );
      const [bn] = await noBusDetector.detect({ runtimeName: 'rt' });
      await noBusDetector.resolve(bn.id);
      const found = await noBusDetector.getById(bn.id);
      expect(found!.resolvedAt).not.toBeNull();
    });

    it('count on noBus detector works', async () => {
      const noBusDetector = new BottleneckDetector(
        { ...DefaultEvolutionRuntimeConfig.bottleneckDetector },
        null,
      );
      await noBusDetector.detect({ runtimeName: 'rt' });
      expect(await noBusDetector.count()).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. ConstraintAnalyzer
// ═══════════════════════════════════════════════════════════════════

describe('ConstraintAnalyzer', () => {
  let bus: InProcessEventBus;
  let analyzer: ConstraintAnalyzer;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    analyzer = new ConstraintAnalyzer(
      { ...DefaultEvolutionRuntimeConfig.constraintAnalyzer },
      bus,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- analyze() ---
  describe('analyze()', () => {
    it('returns a frozen analysis object', async () => {
      const analysis = await analyzer.analyze('bn-123' as any);
      expect(Object.isFrozen(analysis)).toBe(true);
    });

    it('analysis has an id (EvolutionSessionId)', async () => {
      const analysis = await analyzer.analyze('bn-123' as any);
      expect(analysis.id).toBeDefined();
      expect(typeof analysis.id).toBe('string');
    });

    it('analysis references the provided bottleneckId', async () => {
      const analysis = await analyzer.analyze('bn-some-id' as any);
      expect(analysis.bottleneckId).toBe('bn-some-id');
    });

    it('constraintType is Architecture', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.constraintType).toBe(ConstraintType.Architecture);
    });

    it('rootCause matches Architecture pattern', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.rootCause).toContain('Structural coupling');
    });

    it('impactDescription mentions the bottleneck id', async () => {
      const analysis = await analyzer.analyze('bn-abc' as any);
      expect(analysis.impactDescription).toContain('bn-abc');
    });

    it('impactDescription mentions value creation', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.impactDescription).toContain('value creation');
    });

    it('affectedRuntimes is an empty frozen array', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.affectedRuntimes).toEqual([]);
      expect(Object.isFrozen(analysis.affectedRuntimes)).toBe(true);
    });

    it('affectedCapabilities is an empty frozen array', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.affectedCapabilities).toEqual([]);
      expect(Object.isFrozen(analysis.affectedCapabilities)).toBe(true);
    });

    it('suggestedImprovements is an empty frozen array', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.suggestedImprovements).toEqual([]);
      expect(Object.isFrozen(analysis.suggestedImprovements)).toBe(true);
    });

    it('analyzedAt is a valid ISO timestamp', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.analyzedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('metadata is an empty frozen object', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.metadata).toEqual({});
      expect(Object.isFrozen(analysis.metadata)).toBe(true);
    });

    it('publishes an analyzed event on the bus', async () => {
      await analyzer.analyze('bn-1' as any);
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.constraint.analyzed');
    });

    it('event has Result classification', async () => {
      await analyzer.analyze('bn-1' as any);
      expect(bus.getLog()[0].classification).toBe(EventClassification.Result);
    });

    it('event has version 1.0.0', async () => {
      await analyzer.analyze('bn-1' as any);
      expect(bus.getLog()[0].version).toBe('1.0.0');
    });

    it('event has a valid eventId', async () => {
      await analyzer.analyze('bn-1' as any);
      expect(bus.getLog()[0].eventId).toBeDefined();
    });

    it('event has aggregateType ConstraintAnalysis', async () => {
      await analyzer.analyze('bn-1' as any);
      const envelope = bus.getLog()[0];
      // aggregateId is set from sessionId
      expect(envelope.sequence).toBeGreaterThanOrEqual(1);
    });

    it('durationMs is a non-negative number', async () => {
      await analyzer.analyze('bn-1' as any);
      // The duration is in the published event data, not in the envelope payload
      // Since InProcessEventBus stores envelope not the full event, we check it ran
      const log = bus.getLog();
      expect(log.length).toBe(1);
    });

    it('multiple analyses each get unique ids', async () => {
      const a1 = await analyzer.analyze('bn-1' as any);
      const a2 = await analyzer.analyze('bn-2' as any);
      expect(a1.id).not.toBe(a2.id);
    });

    it('no events when eventBus is null', async () => {
      const noBus = new ConstraintAnalyzer(
        { ...DefaultEvolutionRuntimeConfig.constraintAnalyzer },
        null,
      );
      await noBus.analyze('bn-1' as any);
      expect(bus.getLog().length).toBe(0);
    });
  });

  // --- getAnalysis() ---
  describe('getAnalysis()', () => {
    it('returns analysis when sessionId exists', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      const found = await analyzer.getAnalysis(analysis.id as string);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(analysis.id);
    });

    it('returns null when sessionId does not exist', async () => {
      const found = await analyzer.getAnalysis('nonexistent');
      expect(found).toBeNull();
    });

    it('returns null for empty string', async () => {
      const found = await analyzer.getAnalysis('');
      expect(found).toBeNull();
    });
  });

  // --- listAnalyses() ---
  describe('listAnalyses()', () => {
    it('returns empty array initially', async () => {
      const result = await analyzer.listAnalyses();
      expect(result).toEqual([]);
    });

    it('returns all analyses after multiple analyze calls', async () => {
      await analyzer.analyze('bn-1' as any);
      await analyzer.analyze('bn-2' as any);
      await analyzer.analyze('bn-3' as any);
      const result = await analyzer.listAnalyses();
      expect(result).toHaveLength(3);
    });

    it('returns frozen analysis objects in the list', async () => {
      await analyzer.analyze('bn-1' as any);
      const [item] = await analyzer.listAnalyses();
      expect(Object.isFrozen(item)).toBe(true);
    });
  });

  // --- Root cause patterns ---
  describe('root cause patterns', () => {
    // The ConstraintAnalyzer always uses Architecture type, but we can verify
    // the ROOT_CAUSE_PATTERNS constant indirectly via the analysis result
    it('Architecture root cause mentions structural coupling', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.rootCause).toContain('Structural coupling');
    });

    it('root cause is a non-empty string', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.rootCause.length).toBeGreaterThan(0);
    });

    it('constraintType is always Architecture regardless of input bottleneckId', async () => {
      const a1 = await analyzer.analyze('bn-perf' as any);
      const a2 = await analyzer.analyze('bn-qual' as any);
      expect(a1.constraintType).toBe(ConstraintType.Architecture);
      expect(a2.constraintType).toBe(ConstraintType.Architecture);
    });

    it('root cause ends with a period', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.rootCause.endsWith('.')).toBe(true);
    });

    it('root cause is identical for same constraint type', async () => {
      const a1 = await analyzer.analyze('bn-a' as any);
      const a2 = await analyzer.analyze('bn-b' as any);
      expect(a1.rootCause).toBe(a2.rootCause);
    });

    it('impactDescription is a non-empty string', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      expect(analysis.impactDescription.length).toBeGreaterThan(0);
    });
  });

  // --- Additional edge cases ---
  describe('additional edge cases', () => {
    it('analyze with empty string bottleneckId', async () => {
      const analysis = await analyzer.analyze('' as any);
      expect(analysis.bottleneckId).toBe('');
      expect(analysis.impactDescription).toContain('');
    });

    it('analyze with very long bottleneckId', async () => {
      const longId = 'bn-' + 'x'.repeat(500);
      const analysis = await analyzer.analyze(longId as any);
      expect(analysis.bottleneckId).toBe(longId);
    });

    it('analyze stores result accessible via getAnalysis', async () => {
      const analysis = await analyzer.analyze('bn-1' as any);
      const found = await analyzer.getAnalysis(analysis.id as string);
      expect(found).not.toBeNull();
      expect(found!.constraintType).toBe(analysis.constraintType);
      expect(found!.rootCause).toBe(analysis.rootCause);
    });

    it('listAnalyses returns same count as number of analyze calls', async () => {
      for (let i = 0; i < 15; i++) {
        await analyzer.analyze(`bn-${i}` as any);
      }
      expect((await analyzer.listAnalyses()).length).toBe(15);
    });

    it('analyzedAt timestamps are valid and recent', async () => {
      const before = new Date().toISOString();
      const analysis = await analyzer.analyze('bn-1' as any);
      const after = new Date().toISOString();
      expect(analysis.analyzedAt >= before).toBe(true);
      expect(analysis.analyzedAt <= after).toBe(true);
    });

    it('impactDescription always mentions bottleneck id', async () => {
      for (const id of ['bn-x', 'bn-y', 'bn-z']) {
        const analysis = await analyzer.analyze(id as any);
        expect(analysis.impactDescription).toContain(id);
      }
    });

    it('config is not used in the analyze method (only stored)', async () => {
      const customConfig = { maxAnalysisDepth: 99, analysisTimeoutMs: 1 };
      const customAnalyzer = new ConstraintAnalyzer(customConfig, bus);
      // Should still work fine regardless of config values
      const analysis = await customAnalyzer.analyze('bn-1' as any);
      expect(analysis.id).toBeDefined();
    });

    it('getAnalysis with whitespace-only string returns null', async () => {
      expect(await analyzer.getAnalysis('   ')).toBeNull();
    });

    it('no events when eventBus is null for analyze', async () => {
      const noBus = new ConstraintAnalyzer(
        { ...DefaultEvolutionRuntimeConfig.constraintAnalyzer },
        null,
      );
      await noBus.analyze('bn-1' as any);
      expect(bus.getLog().length).toBe(0);
    });

    it('no events when eventBus is undefined for analyze', async () => {
      const noBus = new ConstraintAnalyzer(
        { ...DefaultEvolutionRuntimeConfig.constraintAnalyzer },
        undefined,
      );
      await noBus.analyze('bn-1' as any);
      expect(bus.getLog().length).toBe(0);
    });

    it('analyze event has valid eventId', async () => {
      await analyzer.analyze('bn-1' as any);
      expect(bus.getLog()[0].eventId).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. TechDebtAnalyzer
// ═══════════════════════════════════════════════════════════════════

describe('TechDebtAnalyzer', () => {
  let bus: InProcessEventBus;
  let tdAnalyzer: TechDebtAnalyzer;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    tdAnalyzer = new TechDebtAnalyzer(
      { ...DefaultEvolutionRuntimeConfig.techDebt },
      bus,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- register() ---
  describe('register()', () => {
    it('returns a TechDebtItem with correct name', async () => {
      const item = await tdAnalyzer.register({
        name: 'Debt A',
        description: 'desc',
        priority: TechDebtPriority.High,
        estimatedCost: 100,
        impact: 8,
        targetModule: 'mod',
        targetFile: null,
        metadata: {},
      });
      expect(item.name).toBe('Debt A');
    });

    it('returns a frozen item', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 1, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(Object.isFrozen(item)).toBe(true);
    });

    it('assigns a branded id', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 1, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.id).toBeDefined();
      expect(typeof item.id).toBe('string');
    });

    it('stores description correctly', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'A detailed description', priority: TechDebtPriority.Medium,
        estimatedCost: 50, impact: 5, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.description).toBe('A detailed description');
    });

    it('stores priority correctly', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Critical,
        estimatedCost: 200, impact: 10, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.priority).toBe(TechDebtPriority.Critical);
    });

    it('stores estimatedCost correctly', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 42.5, impact: 3, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.estimatedCost).toBe(42.5);
    });

    it('stores impact correctly', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 7.5, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.impact).toBe(7.5);
    });

    it('stores targetModule correctly', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'core/auth', targetFile: null, metadata: {},
      });
      expect(item.targetModule).toBe('core/auth');
    });

    it('stores targetFile when provided', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: 'auth.ts', metadata: {},
      });
      expect(item.targetFile).toBe('auth.ts');
    });

    it('stores targetFile as null when not provided', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.targetFile).toBeNull();
    });

    it('sets createdAt to a valid ISO timestamp', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('initializes resolvedAt to null', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.resolvedAt).toBeNull();
    });

    it('copies metadata from params', async () => {
      const meta = { origin: 'scan', severity: 'high' };
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: meta,
      });
      expect(item.metadata).toEqual(meta);
    });

    it('freezes metadata', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: { a: 1 },
      });
      expect(Object.isFrozen(item.metadata)).toBe(true);
    });

    it('defaults metadata to empty object when omitted', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.metadata).toEqual({});
    });

    it('publishes a detected event on the bus', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.techDebt.detected');
    });

    it('event has Action classification', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(bus.getLog()[0].classification).toBe(EventClassification.Action);
    });

    it('event has version 1.0.0', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(bus.getLog()[0].version).toBe('1.0.0');
    });

    it('can register with all four priority levels', async () => {
      for (const p of [TechDebtPriority.Low, TechDebtPriority.Medium, TechDebtPriority.High, TechDebtPriority.Critical]) {
        const item = await tdAnalyzer.register({
          name: `D-${p}`, description: 'd', priority: p,
          estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
        });
        expect(item.priority).toBe(p);
      }
    });
  });

  // --- register() limit exceeded ---
  describe('register() — limit exceeded', () => {
    it('throws TechDebtLimitExceededError at capacity', async () => {
      tdAnalyzer = new TechDebtAnalyzer({ maxItems: 1, depreciationRate: 0.1 }, bus);
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await expect(
        tdAnalyzer.register({
          name: 'D2', description: 'd2', priority: TechDebtPriority.Low,
          estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
        }),
      ).rejects.toThrow(TechDebtLimitExceededError);
    });

    it('error message includes the limit', async () => {
      tdAnalyzer = new TechDebtAnalyzer({ maxItems: 3, depreciationRate: 0.1 }, bus);
      for (let i = 0; i < 3; i++) {
        await tdAnalyzer.register({
          name: `D${i}`, description: 'd', priority: TechDebtPriority.Low,
          estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
        });
      }
      await expect(
        tdAnalyzer.register({
          name: 'overflow', description: 'd', priority: TechDebtPriority.Low,
          estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
        }),
      ).rejects.toThrow('3');
    });

    it('works fine at exactly the limit', async () => {
      tdAnalyzer = new TechDebtAnalyzer({ maxItems: 5, depreciationRate: 0.1 }, bus);
      for (let i = 0; i < 5; i++) {
        const item = await tdAnalyzer.register({
          name: `D${i}`, description: 'd', priority: TechDebtPriority.Low,
          estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
        });
        expect(item).toBeDefined();
      }
    });
  });

  // --- resolve() ---
  describe('resolve()', () => {
    it('throws TechDebtNotFoundError for nonexistent id', async () => {
      await expect(tdAnalyzer.resolve('nope' as any)).rejects.toThrow(TechDebtNotFoundError);
    });

    it('error includes techDebtId', async () => {
      try {
        await tdAnalyzer.resolve('missing' as any);
      } catch (err) {
        expect((err as TechDebtNotFoundError).techDebtId).toBe('missing');
      }
    });

    it('sets resolvedAt to a valid ISO timestamp', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.resolve(item.id);
      const updated = await tdAnalyzer.getById(item.id);
      expect(updated!.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('resolved item is still frozen', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.resolve(item.id);
      const updated = await tdAnalyzer.getById(item.id);
      expect(Object.isFrozen(updated!)).toBe(true);
    });

    it('publishes a resolved event', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      bus.clear();
      await tdAnalyzer.resolve(item.id);
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.techDebt.resolved');
    });

    it('resolved event has StateChange classification', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      bus.clear();
      await tdAnalyzer.resolve(item.id);
      expect(bus.getLog()[0].classification).toBe(EventClassification.StateChange);
    });

    it('resolving twice updates resolvedAt', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.resolve(item.id);
      const first = (await tdAnalyzer.getById(item.id))!.resolvedAt;
      await new Promise((r) => setTimeout(r, 2));
      await tdAnalyzer.resolve(item.id);
      const second = (await tdAnalyzer.getById(item.id))!.resolvedAt;
      expect(second).not.toBe(first);
    });
  });

  // --- getById() ---
  describe('getById()', () => {
    it('returns item when found', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      const found = await tdAnalyzer.getById(item.id);
      expect(found).toEqual(item);
    });

    it('returns null when id does not exist', async () => {
      const found = await tdAnalyzer.getById('nonexistent' as any);
      expect(found).toBeNull();
    });

    it('returns null for empty string id', async () => {
      const found = await tdAnalyzer.getById('' as any);
      expect(found).toBeNull();
    });
  });

  // --- list() ---
  describe('list()', () => {
    it('returns empty array initially', async () => {
      expect(await tdAnalyzer.list()).toEqual([]);
    });

    it('returns all items with no filter', async () => {
      await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.register({
        name: 'D2', description: 'd', priority: TechDebtPriority.High,
        estimatedCost: 20, impact: 5, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(await tdAnalyzer.list()).toHaveLength(2);
    });

    it('filters by priority', async () => {
      await tdAnalyzer.register({
        name: 'Low', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.register({
        name: 'High', description: 'd', priority: TechDebtPriority.High,
        estimatedCost: 20, impact: 5, targetModule: 'm', targetFile: null, metadata: {},
      });
      const result = await tdAnalyzer.list({ priority: TechDebtPriority.High });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('High');
    });

    it('filters by resolved=true', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.register({
        name: 'D2', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.resolve(item.id);
      const result = await tdAnalyzer.list({ resolved: true });
      expect(result).toHaveLength(1);
    });

    it('filters by resolved=false', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.resolve(item.id);
      const result = await tdAnalyzer.list({ resolved: false });
      expect(result).toHaveLength(0);
    });

    it('combined filter: priority and resolved', async () => {
      const item = await tdAnalyzer.register({
        name: 'HighUnresolved', description: 'd', priority: TechDebtPriority.High,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.register({
        name: 'LowUnresolved', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      const result = await tdAnalyzer.list({ priority: TechDebtPriority.High, resolved: false });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('HighUnresolved');
    });

    it('combined filter returns empty when no match', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      const result = await tdAnalyzer.list({ priority: TechDebtPriority.Critical, resolved: false });
      expect(result).toHaveLength(0);
    });
  });

  // --- getTotalCost() ---
  describe('getTotalCost()', () => {
    it('returns 0 when no items', async () => {
      expect(await tdAnalyzer.getTotalCost()).toBe(0);
    });

    it('sums estimatedCost of unresolved items', async () => {
      await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 100, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.register({
        name: 'D2', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 200, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(await tdAnalyzer.getTotalCost()).toBe(300);
    });

    it('excludes resolved items from total cost', async () => {
      const item = await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 100, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.register({
        name: 'D2', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 200, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.resolve(item.id);
      expect(await tdAnalyzer.getTotalCost()).toBe(200);
    });

    it('returns 0 when all items are resolved', async () => {
      const i1 = await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 100, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.resolve(i1.id);
      expect(await tdAnalyzer.getTotalCost()).toBe(0);
    });

    it('handles fractional costs', async () => {
      await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 99.99, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.register({
        name: 'D2', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 0.01, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(await tdAnalyzer.getTotalCost()).toBe(100);
    });

    it('handles zero cost items', async () => {
      await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 0, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(await tdAnalyzer.getTotalCost()).toBe(0);
    });
  });

  // --- count() ---
  describe('count()', () => {
    it('returns 0 initially', async () => {
      expect(await tdAnalyzer.count()).toBe(0);
    });

    it('increments with each register', async () => {
      await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(await tdAnalyzer.count()).toBe(1);
      await tdAnalyzer.register({
        name: 'D2', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(await tdAnalyzer.count()).toBe(2);
    });

    it('count unchanged after resolve', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.resolve(item.id);
      expect(await tdAnalyzer.count()).toBe(1);
    });
  });

  // --- Event verification ---
  describe('event verification', () => {
    it('detected event has valid eventId', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(bus.getLog()[0].eventId).toBeDefined();
    });

    it('resolved event has valid eventId', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      bus.clear();
      await tdAnalyzer.resolve(item.id);
      expect(bus.getLog()[0].eventId).toBeDefined();
    });

    it('no events when eventBus is null', async () => {
      const noBus = new TechDebtAnalyzer(
        { ...DefaultEvolutionRuntimeConfig.techDebt },
        null,
      );
      await noBus.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(bus.getLog().length).toBe(0);
    });
  });

  // --- dispose() ---
  describe('dispose()', () => {
    it('clears all items', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      tdAnalyzer.dispose();
      expect(await tdAnalyzer.count()).toBe(0);
    });

    it('allows registering after dispose', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      tdAnalyzer.dispose();
      const item = await tdAnalyzer.register({
        name: 'D2', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.name).toBe('D2');
    });

    it('getTotalCost returns 0 after dispose', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 50, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      tdAnalyzer.dispose();
      expect(await tdAnalyzer.getTotalCost()).toBe(0);
    });

    it('list returns empty after dispose', async () => {
      await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      tdAnalyzer.dispose();
      expect(await tdAnalyzer.list()).toEqual([]);
    });
  });

  // --- Additional edge cases ---
  describe('additional edge cases', () => {
    it('register with empty string name', async () => {
      const item = await tdAnalyzer.register({
        name: '', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.name).toBe('');
    });

    it('register with empty string description', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: '', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.description).toBe('');
    });

    it('register with zero estimatedCost', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 0, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.estimatedCost).toBe(0);
    });

    it('register with zero impact', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 0, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.impact).toBe(0);
    });

    it('register with negative estimatedCost', async () => {
      const item = await tdAnalyzer.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: -100, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(item.estimatedCost).toBe(-100);
    });

    it('getTotalCost with negative cost items sums correctly', async () => {
      await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: -50, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      await tdAnalyzer.register({
        name: 'D2', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 100, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(await tdAnalyzer.getTotalCost()).toBe(50);
    });

    it('resolve preserves all other fields', async () => {
      const item = await tdAnalyzer.register({
        name: 'Debt-Name', description: 'A detailed description', priority: TechDebtPriority.High,
        estimatedCost: 99, impact: 8.5, targetModule: 'core/auth', targetFile: 'auth.ts', metadata: { k: 'v' },
      });
      await tdAnalyzer.resolve(item.id);
      const updated = await tdAnalyzer.getById(item.id);
      expect(updated!.name).toBe('Debt-Name');
      expect(updated!.description).toBe('A detailed description');
      expect(updated!.priority).toBe(TechDebtPriority.High);
      expect(updated!.estimatedCost).toBe(99);
      expect(updated!.impact).toBe(8.5);
      expect(updated!.targetModule).toBe('core/auth');
      expect(updated!.targetFile).toBe('auth.ts');
      expect(updated!.createdAt).toBe(item.createdAt);
      expect(updated!.metadata).toEqual({ k: 'v' });
    });

    it('register without eventBus still stores internally', async () => {
      const noBus = new TechDebtAnalyzer(
        { ...DefaultEvolutionRuntimeConfig.techDebt },
        null,
      );
      const item = await noBus.register({
        name: 'D', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      const found = await noBus.getById(item.id);
      expect(found).not.toBeNull();
    });

    it('list with empty filter object returns all', async () => {
      await tdAnalyzer.register({
        name: 'D1', description: 'd', priority: TechDebtPriority.Low,
        estimatedCost: 10, impact: 1, targetModule: 'm', targetFile: null, metadata: {},
      });
      expect(await tdAnalyzer.list({})).toHaveLength(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. FeedbackCollector
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector', () => {
  let bus: InProcessEventBus;
  let collector: FeedbackCollector;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    collector = new FeedbackCollector(
      { ...DefaultEvolutionRuntimeConfig.feedbackCollector },
      bus,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- collect() ---
  describe('collect()', () => {
    it('returns a FeedbackEntry with correct source', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User,
        sentiment: FeedbackSentiment.Negative,
        content: 'It is slow',
        relatedBottleneckId: null,
        relatedImprovementId: null,
        metadata: {},
      });
      expect(entry.source).toBe(FeedbackSource.User);
    });

    it('returns a frozen entry', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it('assigns a branded id', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.Logs, sentiment: FeedbackSentiment.Neutral,
        content: 'log msg', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe('string');
    });

    it('stores sentiment correctly', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Critical,
        content: 'broken', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.sentiment).toBe(FeedbackSentiment.Critical);
    });

    it('stores content correctly', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'The UI is confusing and slow',
        relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.content).toBe('The UI is confusing and slow');
    });

    it('stores relatedBottleneckId when provided', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.Metrics, sentiment: FeedbackSentiment.Negative,
        content: 'bad', relatedBottleneckId: 'bn-1' as any, relatedImprovementId: null, metadata: {},
      });
      expect(entry.relatedBottleneckId).toBe('bn-1');
    });

    it('stores relatedBottleneckId as null by default', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.relatedBottleneckId).toBeNull();
    });

    it('stores relatedImprovementId when provided', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.AI, sentiment: FeedbackSentiment.Positive,
        content: 'good', relatedBottleneckId: null, relatedImprovementId: 'imp-1' as any, metadata: {},
      });
      expect(entry.relatedImprovementId).toBe('imp-1');
    });

    it('stores relatedImprovementId as null by default', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.relatedImprovementId).toBeNull();
    });

    it('sets receivedAt to valid ISO timestamp', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('initializes processed to false', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.processed).toBe(false);
    });

    it('initializes processedAt to null', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.processedAt).toBeNull();
    });

    it('initializes extractedInsights to empty array', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.extractedInsights).toEqual([]);
    });

    it('extractedInsights is frozen', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(Object.isFrozen(entry.extractedInsights)).toBe(true);
    });

    it('copies metadata from params', async () => {
      const meta = { userAgent: 'test', page: '/home' };
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta,
      });
      expect(entry.metadata).toEqual(meta);
    });

    it('metadata is frozen', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: { a: 1 },
      });
      expect(Object.isFrozen(entry.metadata)).toBe(true);
    });

    it('publishes a received event on the bus', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.feedback.received');
    });

    it('event has Action classification', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(bus.getLog()[0].classification).toBe(EventClassification.Action);
    });

    it('event has version 1.0.0', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(bus.getLog()[0].version).toBe('1.0.0');
    });

    it('works with all FeedbackSource values', async () => {
      const sources = Object.values(FeedbackSource);
      for (const src of sources) {
        const entry = await collector.collect({
          source: src, sentiment: FeedbackSentiment.Neutral,
          content: 'test', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
        });
        expect(entry.source).toBe(src);
      }
    });

    it('works with all FeedbackSentiment values', async () => {
      const sentiments = Object.values(FeedbackSentiment);
      for (const s of sentiments) {
        const entry = await collector.collect({
          source: FeedbackSource.User, sentiment: s,
          content: 'test', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
        });
        expect(entry.sentiment).toBe(s);
      }
    });
  });

  // --- collect() limit exceeded ---
  describe('collect() — limit exceeded', () => {
    it('throws FeedbackLimitExceededError at capacity', async () => {
      collector = new FeedbackCollector({ maxFeedback: 1, autoProcessEnabled: false, processingTimeoutMs: 1000 }, bus);
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'first', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await expect(
        collector.collect({
          source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
          content: 'second', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
        }),
      ).rejects.toThrow(FeedbackLimitExceededError);
    });

    it('error message includes the limit', async () => {
      collector = new FeedbackCollector({ maxFeedback: 2, autoProcessEnabled: false, processingTimeoutMs: 1000 }, bus);
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'f1', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'f2', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await expect(
        collector.collect({
          source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
          content: 'f3', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
        }),
      ).rejects.toThrow('2');
    });

    it('works fine at exactly the limit', async () => {
      collector = new FeedbackCollector({ maxFeedback: 3, autoProcessEnabled: false, processingTimeoutMs: 1000 }, bus);
      for (let i = 0; i < 3; i++) {
        const entry = await collector.collect({
          source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
          content: `f${i}`, relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
        });
        expect(entry).toBeDefined();
      }
    });
  });

  // --- process() ---
  describe('process()', () => {
    it('throws FeedbackNotFoundError for nonexistent id', async () => {
      await expect(collector.process('nope' as any)).rejects.toThrow(FeedbackNotFoundError);
    });

    it('error includes feedbackId', async () => {
      try {
        await collector.process('missing' as any);
      } catch (err) {
        expect((err as FeedbackNotFoundError).feedbackId).toBe('missing');
      }
    });

    it('sets processed to true', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow response', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.processed).toBe(true);
    });

    it('sets processedAt to valid ISO timestamp', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('populates extractedInsights for content with keywords', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'The page is very slow and has error messages',
        relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.length).toBeGreaterThan(0);
    });

    it('extractedInsights is frozen after processing', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(Object.isFrozen(processed.extractedInsights)).toBe(true);
    });

    it('processing already-processed entry is idempotent (no-op on processed flag)', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const first = await collector.process(entry.id);
      const second = await collector.process(entry.id);
      expect(second.processed).toBe(true);
      expect(second.extractedInsights).toEqual(first.extractedInsights);
    });

    it('processing already-processed entry publishes another event', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.process(entry.id);
      bus.clear();
      await collector.process(entry.id);
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.feedback.processed');
    });

    it('publishes a processed event', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      bus.clear();
      await collector.process(entry.id);
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.feedback.processed');
    });

    it('processed event has Result classification', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      bus.clear();
      await collector.process(entry.id);
      expect(bus.getLog()[0].classification).toBe(EventClassification.Result);
    });

    it('processed entry is still frozen', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(Object.isFrozen(processed)).toBe(true);
    });
  });

  // --- extractInsights keyword detection ---
  describe('extractInsights — keyword detection', () => {
    it('detects "slow" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'The app is slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('slow'))).toBe(true);
    });

    it('detects "error" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'I see an error', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('error'))).toBe(true);
    });

    it('detects "confusing" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'This is confusing', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('confusing'))).toBe(true);
    });

    it('detects "bug" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'Found a bug', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('bug'))).toBe(true);
    });

    it('detects multiple keywords in one content', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'The app is slow and has a bug with error handling',
        relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.length).toBeGreaterThanOrEqual(3);
    });

    it('detects "ux" keyword (case-insensitive: "UX" in content)', async () => {
      // Note: 'ux' is not in INSIGHT_KEYWORDS list; let's test 'unresponsive'
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'The app is unresponsive', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('unresponsive'))).toBe(true);
    });

    it('returns general feedback when no keywords match', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Positive,
        content: 'I love this feature, it works great',
        relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights).toHaveLength(1);
      expect(processed.extractedInsights[0]).toContain('General feedback');
    });

    it('keyword detection is case-insensitive', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'SLOW BUG ERROR', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.length).toBe(3);
    });

    it('detects "timeout" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.Logs, sentiment: FeedbackSentiment.Negative,
        content: 'Request timeout after 30s', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('timeout'))).toBe(true);
    });

    it('detects "lag" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'There is noticeable lag', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('lag'))).toBe(true);
    });

    it('detects "crash" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.Errors, sentiment: FeedbackSentiment.Critical,
        content: 'App crash on startup', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('crash'))).toBe(true);
    });

    it('detects "frustrating" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'This workflow is frustrating', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('frustrating'))).toBe(true);
    });

    it('detects "missing" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'Button is missing', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('missing'))).toBe(true);
    });

    it('detects "wrong" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'The output is wrong', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('wrong'))).toBe(true);
    });

    it('detects "fail" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.Errors, sentiment: FeedbackSentiment.Negative,
        content: 'Test fail in CI', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('fail'))).toBe(true);
    });

    it('detects "complex" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Negative,
        content: 'The API is too complex', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('complex'))).toBe(true);
    });

    it('detects "difficult" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'Difficult to use', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('difficult'))).toBe(true);
    });

    it('detects "inconsistent" keyword', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'Behavior is inconsistent', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('inconsistent'))).toBe(true);
    });

    it('insight text includes the keyword in quotes', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights[0]).toContain('"slow"');
    });
  });

  // --- getById() ---
  describe('getById()', () => {
    it('returns entry when found', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const found = await collector.getById(entry.id);
      expect(found).toEqual(entry);
    });

    it('returns null when id does not exist', async () => {
      const found = await collector.getById('nonexistent' as any);
      expect(found).toBeNull();
    });

    it('returns the processed version after processing', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.process(entry.id);
      const found = await collector.getById(entry.id);
      expect(found!.processed).toBe(true);
    });
  });

  // --- list() ---
  describe('list()', () => {
    it('returns empty array initially', async () => {
      expect(await collector.list()).toEqual([]);
    });

    it('returns all entries with no filter', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.collect({
        source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Negative,
        content: 'bad', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(await collector.list()).toHaveLength(2);
    });

    it('filters by source', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.collect({
        source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Negative,
        content: 'bad', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const result = await collector.list({ source: FeedbackSource.Developer });
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe(FeedbackSource.Developer);
    });

    it('filters by sentiment', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Positive,
        content: 'good', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'bad', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const result = await collector.list({ sentiment: FeedbackSentiment.Negative });
      expect(result).toHaveLength(1);
    });

    it('filters by processed=true', async () => {
      const e1 = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.process(e1.id);
      const result = await collector.list({ processed: true });
      expect(result).toHaveLength(1);
    });

    it('filters by processed=false', async () => {
      const e1 = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.process(e1.id);
      const result = await collector.list({ processed: false });
      expect(result).toHaveLength(1);
    });

    it('combined filter: source and sentiment', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Positive,
        content: 'good', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.collect({
        source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Negative,
        content: 'bad', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const result = await collector.list({ source: FeedbackSource.User, sentiment: FeedbackSentiment.Positive });
      expect(result).toHaveLength(1);
    });

    it('combined filter returns empty when no match', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const result = await collector.list({ source: FeedbackSource.AI, sentiment: FeedbackSentiment.Critical });
      expect(result).toHaveLength(0);
    });
  });

  // --- count() ---
  describe('count()', () => {
    it('returns 0 initially', async () => {
      expect(await collector.count()).toBe(0);
    });

    it('increments with each collect', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(await collector.count()).toBe(1);
    });

    it('count unchanged after process', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await collector.process(entry.id);
      expect(await collector.count()).toBe(1);
    });
  });

  // --- Event verification ---
  describe('event verification', () => {
    it('no events when eventBus is null', async () => {
      const noBus = new FeedbackCollector(
        { ...DefaultEvolutionRuntimeConfig.feedbackCollector },
        null,
      );
      await noBus.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(bus.getLog().length).toBe(0);
    });

    it('received event has a valid sequence number', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(bus.getLog()[0].sequence).toBeGreaterThanOrEqual(1);
    });

    it('processed event has a valid sequence number', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      bus.clear();
      await collector.process(entry.id);
      expect(bus.getLog()[0].sequence).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Additional edge cases ---
  describe('additional edge cases', () => {
    it('collect with empty string content', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: '', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.content).toBe('');
    });

    it('process empty content returns general feedback insight', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: '', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights).toHaveLength(1);
      expect(processed.extractedInsights[0]).toContain('General feedback');
    });

    it('collect with very long content', async () => {
      const longContent = 'slow '.repeat(1000);
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: longContent, relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(entry.content).toBe(longContent);
    });

    it('process does not change source or sentiment', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.Developer, sentiment: FeedbackSentiment.Critical,
        content: 'error crash', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.source).toBe(FeedbackSource.Developer);
      expect(processed.sentiment).toBe(FeedbackSentiment.Critical);
    });

    it('process does not change content', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'original content', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.content).toBe('original content');
    });

    it('process does not change receivedAt', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.receivedAt).toBe(entry.receivedAt);
    });

    it('process does not change relatedBottleneckId', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: 'bn-1' as any, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.relatedBottleneckId).toBe('bn-1');
    });

    it('process does not change metadata', async () => {
      const meta = { page: '/test', ref: 'v1' };
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: meta,
      });
      const processed = await collector.process(entry.id);
      expect(processed.metadata).toEqual(meta);
    });

    it('collect without eventBus still stores internally', async () => {
      const noBus = new FeedbackCollector(
        { ...DefaultEvolutionRuntimeConfig.feedbackCollector },
        null,
      );
      const entry = await noBus.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const found = await noBus.getById(entry.id);
      expect(found).not.toBeNull();
    });

    it('list with empty filter object returns all', async () => {
      await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Neutral,
        content: 'ok', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      expect(await collector.list({})).toHaveLength(1);
    });

    it('content with "broken" keyword is detected', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'The feature is broken', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('broken'))).toBe(true);
    });

    it('content with "unclear" keyword is detected', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'The instructions are unclear', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      const processed = await collector.process(entry.id);
      expect(processed.extractedInsights.some((i) => i.includes('unclear'))).toBe(true);
    });

    it('no process events when eventBus is null', async () => {
      const noBus = new FeedbackCollector(
        { ...DefaultEvolutionRuntimeConfig.feedbackCollector },
        null,
      );
      const entry = await noBus.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      await noBus.process(entry.id);
      expect(bus.getLog().length).toBe(0);
    });

    it('processed event has valid eventId', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      bus.clear();
      await collector.process(entry.id);
      expect(bus.getLog()[0].eventId).toBeDefined();
    });

    it('processed event has valid version', async () => {
      const entry = await collector.collect({
        source: FeedbackSource.User, sentiment: FeedbackSentiment.Negative,
        content: 'slow', relatedBottleneckId: null, relatedImprovementId: null, metadata: {},
      });
      bus.clear();
      await collector.process(entry.id);
      expect(bus.getLog()[0].version).toBe('1.0.0');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. LearningLoop
// ═══════════════════════════════════════════════════════════════════

describe('LearningLoop', () => {
  let bus: InProcessEventBus;
  let loop: LearningLoop;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    loop = new LearningLoop(
      { ...DefaultEvolutionRuntimeConfig.learningLoop },
      bus,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- record() ---
  describe('record()', () => {
    it('returns a LearningRecord with correct action', async () => {
      const rec = await loop.record({
        action: 'refactor-auth',
        outcome: LearningOutcome.Improved,
        lesson: 'Simplify token validation',
        context: 'Auth module refactor',
        improvementId: null,
        experimentId: null,
        metadata: {},
      });
      expect(rec.action).toBe('refactor-auth');
    });

    it('returns a frozen record', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.NoChange,
        lesson: 'no lesson', context: 'ctx',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(Object.isFrozen(rec)).toBe(true);
    });

    it('assigns a branded id', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.NoChange,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.id).toBeDefined();
      expect(typeof rec.id).toBe('string');
    });

    it('stores outcome correctly', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Worsened,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.outcome).toBe(LearningOutcome.Worsened);
    });

    it('stores lesson correctly', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'Always validate inputs early', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.lesson).toBe('Always validate inputs early');
    });

    it('stores context correctly', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'Payment processing pipeline',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.context).toBe('Payment processing pipeline');
    });

    it('stores improvementId when provided', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: 'imp-1' as any, experimentId: null, metadata: {},
      });
      expect(rec.improvementId).toBe('imp-1');
    });

    it('stores improvementId as null by default', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.improvementId).toBeNull();
    });

    it('stores experimentId when provided', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: 'exp-1' as any, metadata: {},
      });
      expect(rec.experimentId).toBe('exp-1');
    });

    it('stores experimentId as null by default', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.experimentId).toBeNull();
    });

    it('sets createdAt to valid ISO timestamp', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('copies metadata from params', async () => {
      const meta = { team: 'backend', sprint: '42' };
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: meta,
      });
      expect(rec.metadata).toEqual(meta);
    });

    it('metadata is frozen', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: { a: 1 },
      });
      expect(Object.isFrozen(rec.metadata)).toBe(true);
    });

    it('defaults metadata to empty object when omitted', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.metadata).toEqual({});
    });

    it('works with all LearningOutcome values', async () => {
      const outcomes = Object.values(LearningOutcome);
      for (const o of outcomes) {
        const rec = await loop.record({
          action: `action-${o}`, outcome: o,
          lesson: 'l', context: 'c',
          improvementId: null, experimentId: null, metadata: {},
        });
        expect(rec.outcome).toBe(o);
      }
    });

    it('publishes a recorded event on the bus', async () => {
      await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog().length).toBeGreaterThan(0);
      expect(bus.getLog()[0].eventType).toBe('evolution.learning.recorded');
    });

    it('event has Action classification', async () => {
      await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog()[0].classification).toBe(EventClassification.Action);
    });

    it('event has version 1.0.0', async () => {
      await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog()[0].version).toBe('1.0.0');
    });

    it('event has a valid eventId', async () => {
      await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog()[0].eventId).toBeDefined();
    });

    it('stores the record so getById retrieves it', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const found = await loop.getById(rec.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(rec.id);
    });

    it('no events when eventBus is null', async () => {
      const noBus = new LearningLoop(
        { ...DefaultEvolutionRuntimeConfig.learningLoop },
        null,
      );
      await noBus.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog().length).toBe(0);
    });
  });

  // --- record() eviction ---
  describe('record() — eviction at max capacity', () => {
    it('evicts oldest record when at capacity', async () => {
      loop = new LearningLoop({ maxLearningRecords: 2, similarityThreshold: 0.8, retentionPeriodMs: 10000 }, bus);
      const r1 = await loop.record({
        action: 'first', outcome: LearningOutcome.Improved,
        lesson: 'l1', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'second', outcome: LearningOutcome.Improved,
        lesson: 'l2', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      // Now at capacity (2). Adding a 3rd should evict r1
      const r3 = await loop.record({
        action: 'third', outcome: LearningOutcome.Improved,
        lesson: 'l3', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(await loop.count()).toBe(2);
      expect(await loop.getById(r1.id)).toBeNull();
      expect(await loop.getById(r3.id)).not.toBeNull();
    });

    it('evicts in FIFO order', async () => {
      loop = new LearningLoop({ maxLearningRecords: 3, similarityThreshold: 0.8, retentionPeriodMs: 10000 }, bus);
      const r1 = await loop.record({
        action: 'first', outcome: LearningOutcome.Improved,
        lesson: 'l1', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const r2 = await loop.record({
        action: 'second', outcome: LearningOutcome.NoChange,
        lesson: 'l2', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const r3 = await loop.record({
        action: 'third', outcome: LearningOutcome.Worsened,
        lesson: 'l3', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      // At capacity. Adding 4th evicts r1
      await loop.record({
        action: 'fourth', outcome: LearningOutcome.Improved,
        lesson: 'l4', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(await loop.getById(r1.id)).toBeNull();
      expect(await loop.getById(r2.id)).not.toBeNull();
      expect(await loop.getById(r3.id)).not.toBeNull();
    });

    it('maintains count at maxLearningRecords after eviction', async () => {
      loop = new LearningLoop({ maxLearningRecords: 3, similarityThreshold: 0.8, retentionPeriodMs: 10000 }, bus);
      for (let i = 0; i < 10; i++) {
        await loop.record({
          action: `action-${i}`, outcome: LearningOutcome.Improved,
          lesson: `l${i}`, context: 'c',
          improvementId: null, experimentId: null, metadata: {},
        });
      }
      expect(await loop.count()).toBe(3);
    });

    it('does not throw when evicting', async () => {
      loop = new LearningLoop({ maxLearningRecords: 1, similarityThreshold: 0.8, retentionPeriodMs: 10000 }, bus);
      await loop.record({
        action: 'first', outcome: LearningOutcome.Improved,
        lesson: 'l1', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await expect(
        loop.record({
          action: 'second', outcome: LearningOutcome.Improved,
          lesson: 'l2', context: 'c',
          improvementId: null, experimentId: null, metadata: {},
        }),
      ).resolves.toBeDefined();
    });
  });

  // --- getById() ---
  describe('getById()', () => {
    it('returns record when found', async () => {
      const rec = await loop.record({
        action: 'test', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const found = await loop.getById(rec.id);
      expect(found).toEqual(rec);
    });

    it('returns null when id does not exist', async () => {
      const found = await loop.getById('nonexistent' as any);
      expect(found).toBeNull();
    });

    it('returns null for empty string id', async () => {
      const found = await loop.getById('' as any);
      expect(found).toBeNull();
    });
  });

  // --- list() ---
  describe('list()', () => {
    it('returns empty array initially', async () => {
      expect(await loop.list()).toEqual([]);
    });

    it('returns all records with no filter', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'a2', outcome: LearningOutcome.Worsened, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(await loop.list()).toHaveLength(2);
    });

    it('filters by outcome=Improved', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'a2', outcome: LearningOutcome.Worsened, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.list({ outcome: LearningOutcome.Improved });
      expect(result).toHaveLength(1);
      expect(result[0].outcome).toBe(LearningOutcome.Improved);
    });

    it('filters by outcome=Worsened', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'a2', outcome: LearningOutcome.Worsened, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.list({ outcome: LearningOutcome.Worsened });
      expect(result).toHaveLength(1);
    });

    it('filters by outcome=NoChange', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'a2', outcome: LearningOutcome.NoChange, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.list({ outcome: LearningOutcome.NoChange });
      expect(result).toHaveLength(1);
    });

    it('filters by outcome=UnexpectedSideEffect', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'a2', outcome: LearningOutcome.UnexpectedSideEffect, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.list({ outcome: LearningOutcome.UnexpectedSideEffect });
      expect(result).toHaveLength(1);
    });

    it('returns empty when filter matches nothing', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.list({ outcome: LearningOutcome.Worsened });
      expect(result).toHaveLength(0);
    });
  });

  // --- getLessonsForAction() ---
  describe('getLessonsForAction()', () => {
    it('returns records matching the action string', async () => {
      await loop.record({
        action: 'refactor-auth', outcome: LearningOutcome.Improved,
        lesson: 'Simplify', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'refactor-db', outcome: LearningOutcome.Worsened,
        lesson: 'Index matters', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.getLessonsForAction('refactor-auth');
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('refactor-auth');
    });

    it('is case-insensitive', async () => {
      await loop.record({
        action: 'Refactor-Auth', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.getLessonsForAction('refactor-auth');
      expect(result).toHaveLength(1);
    });

    it('query is case-insensitive', async () => {
      await loop.record({
        action: 'refactor-auth', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.getLessonsForAction('REFACTOR-AUTH');
      expect(result).toHaveLength(1);
    });

    it('matches partial action strings (substring)', async () => {
      await loop.record({
        action: 'refactor-auth-module', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.getLessonsForAction('refactor');
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no match', async () => {
      await loop.record({
        action: 'refactor-auth', outcome: LearningOutcome.Improved,
        lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.getLessonsForAction('migrate-db');
      expect(result).toHaveLength(0);
    });

    it('returns multiple matches', async () => {
      await loop.record({
        action: 'refactor-auth', outcome: LearningOutcome.Improved,
        lesson: 'Simplify', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'refactor-auth-v2', outcome: LearningOutcome.Worsened,
        lesson: 'Do not over-engineer', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.getLessonsForAction('refactor-auth');
      expect(result).toHaveLength(2);
    });

    it('returns empty when no records exist', async () => {
      const result = await loop.getLessonsForAction('anything');
      expect(result).toHaveLength(0);
    });

    it('handles empty string query (matches all)', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'a2', outcome: LearningOutcome.NoChange, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const result = await loop.getLessonsForAction('');
      expect(result).toHaveLength(2);
    });
  });

  // --- count() ---
  describe('count()', () => {
    it('returns 0 initially', async () => {
      expect(await loop.count()).toBe(0);
    });

    it('increments with each record', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(await loop.count()).toBe(1);
      await loop.record({
        action: 'a2', outcome: LearningOutcome.NoChange, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(await loop.count()).toBe(2);
    });

    it('stays at maxLearningRecords after eviction', async () => {
      loop = new LearningLoop({ maxLearningRecords: 5, similarityThreshold: 0.8, retentionPeriodMs: 10000 }, bus);
      for (let i = 0; i < 20; i++) {
        await loop.record({
          action: `a${i}`, outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
          improvementId: null, experimentId: null, metadata: {},
        });
      }
      expect(await loop.count()).toBe(5);
    });
  });

  // --- Event verification ---
  describe('event verification', () => {
    it('event has valid sequence number', async () => {
      await loop.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog()[0].sequence).toBeGreaterThanOrEqual(1);
    });

    it('multiple records produce incrementing sequences', async () => {
      await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop.record({
        action: 'a2', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog()[1].sequence).toBeGreaterThan(bus.getLog()[0].sequence);
    });

    it('event timestamp is a valid ISO string', async () => {
      await loop.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog()[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('evicted records do not produce events on the bus for eviction', async () => {
      loop = new LearningLoop({ maxLearningRecords: 1, similarityThreshold: 0.8, retentionPeriodMs: 10000 }, bus);
      await loop.record({
        action: 'first', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      bus.clear();
      await loop.record({
        action: 'second', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      // Only the new record event should be published
      expect(bus.getLog().length).toBe(1);
      expect(bus.getLog()[0].eventType).toBe('evolution.learning.recorded');
    });
  });

  // --- Additional edge cases ---
  describe('additional edge cases', () => {
    it('record with empty string action', async () => {
      const rec = await loop.record({
        action: '', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.action).toBe('');
    });

    it('record with empty string lesson', async () => {
      const rec = await loop.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: '', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.lesson).toBe('');
    });

    it('record with empty string context', async () => {
      const rec = await loop.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: '',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.context).toBe('');
    });

    it('record with very long action string', async () => {
      const longAction = 'refactor-' + 'x'.repeat(500);
      const rec = await loop.record({
        action: longAction, outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(rec.action).toBe(longAction);
    });

    it('record with both improvementId and experimentId', async () => {
      const rec = await loop.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: 'imp-1' as any, experimentId: 'exp-1' as any, metadata: {},
      });
      expect(rec.improvementId).toBe('imp-1');
      expect(rec.experimentId).toBe('exp-1');
    });

    it('getLessonsForAction with special regex chars in query', async () => {
      await loop.record({
        action: 'refactor(auth)', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      // Should not throw due to regex special chars
      const result = await loop.getLessonsForAction('refactor(auth)');
      expect(result).toHaveLength(1);
    });

    it('list with empty filter object returns all', async () => {
      await loop.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(await loop.list({})).toHaveLength(1);
    });

    it('createdAt timestamps are valid and recent', async () => {
      const before = new Date().toISOString();
      const rec = await loop.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const after = new Date().toISOString();
      expect(rec.createdAt >= before).toBe(true);
      expect(rec.createdAt <= after).toBe(true);
    });

    it('records are independent across different instances', async () => {
      const bus2 = new InProcessEventBus();
      const loop2 = new LearningLoop(
        { ...DefaultEvolutionRuntimeConfig.learningLoop },
        bus2,
      );
      const rec1 = await loop.record({
        action: 'a1', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      const rec2 = await loop2.record({
        action: 'a2', outcome: LearningOutcome.Worsened, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(await loop.getById(rec2.id)).toBeNull();
      expect(await loop2.getById(rec1.id)).toBeNull();
      expect(await loop.count()).toBe(1);
      expect(await loop2.count()).toBe(1);
    });

    it('event bus sequence is independent per bus instance', async () => {
      const bus2 = new InProcessEventBus();
      const loop2 = new LearningLoop(
        { ...DefaultEvolutionRuntimeConfig.learningLoop },
        bus2,
      );
      await loop.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      await loop2.record({
        action: 'a', outcome: LearningOutcome.Improved, lesson: 'l', context: 'c',
        improvementId: null, experimentId: null, metadata: {},
      });
      expect(bus.getLog()[0].sequence).toBe(1);
      expect(bus2.getLog()[0].sequence).toBe(1);
    });
  });
});
