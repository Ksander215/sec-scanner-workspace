import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { FeedbackCollector } from '../../core/evolution/feedback-collector.js';
import { DefaultEvolutionRuntimeConfig, FeedbackSource, FeedbackSentiment, brandFeedbackId, brandBottleneckId, brandImprovementId } from '../../core/evolution/types.js';
import { FeedbackLimitExceededError, FeedbackNotFoundError, EvolutionError } from '../../core/evolution/errors.js';

const cfg = DefaultEvolutionRuntimeConfig.feedbackCollector;

function createCollector(bus?: InProcessEventBus) {
  return new FeedbackCollector(cfg, bus);
}

const defaultParams = {
  source: FeedbackSource.User,
  sentiment: FeedbackSentiment.Positive,
  content: 'This is great!',
  relatedBottleneckId: null as any,
  relatedImprovementId: null as any,
  metadata: Object.freeze({}),
};

// ═══════════════════════════════════════════════════════════════════
// CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — constructor', () => {
  it('creates instance without eventBus', () => {
    const c = createCollector();
    expect(c).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const c = createCollector(new InProcessEventBus());
    expect(c).toBeDefined();
  });
  it('creates instance with custom config', () => {
    const c = new FeedbackCollector({ maxFeedback: 50, autoProcessEnabled: false, processingTimeoutMs: 5000 });
    expect(c).toBeDefined();
  });
  it('store is accessible via getStore', () => {
    const c = createCollector();
    expect(c.getStore()).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// COLLECT
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — collect', () => {
  it('returns a FeedbackEntry', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
  });
  it('assigns a unique id', async () => {
    const c = createCollector();
    const e1 = await c.collect(defaultParams);
    const e2 = await c.collect(defaultParams);
    expect(e1.id).not.toBe(e2.id);
  });
  it('sets source correctly', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.source).toBe(FeedbackSource.User);
  });
  it('sets sentiment correctly', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.sentiment).toBe(FeedbackSentiment.Positive);
  });
  it('sets content correctly', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.content).toBe('This is great!');
  });
  it('sets relatedBottleneckId to null by default', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.relatedBottleneckId).toBeNull();
  });
  it('sets relatedImprovementId to null by default', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.relatedImprovementId).toBeNull();
  });
  it('sets relatedBottleneckId when provided', async () => {
    const c = createCollector();
    const bnId = brandBottleneckId('bn-1');
    const entry = await c.collect({ ...defaultParams, relatedBottleneckId: bnId });
    expect(entry.relatedBottleneckId).toBe(bnId);
  });
  it('sets relatedImprovementId when provided', async () => {
    const c = createCollector();
    const impId = brandImprovementId('imp-1');
    const entry = await c.collect({ ...defaultParams, relatedImprovementId: impId });
    expect(entry.relatedImprovementId).toBe(impId);
  });
  it('sets receivedAt timestamp', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.receivedAt).toBeDefined();
    expect(typeof entry.receivedAt).toBe('string');
  });
  it('entry is frozen', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(Object.isFrozen(entry)).toBe(true);
  });
  it('metadata is passed through', async () => {
    const c = createCollector();
    const meta = Object.freeze({ sessionId: 'abc' });
    const entry = await c.collect({ ...defaultParams, metadata: meta });
    expect(entry.metadata).toBe(meta);
  });
  it('empty metadata is frozen', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(Object.isFrozen(entry.metadata)).toBe(true);
  });

  // All 4 sentiments
  it('handles Positive sentiment', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Positive });
    expect(entry.sentiment).toBe(FeedbackSentiment.Positive);
  });
  it('handles Negative sentiment', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Negative });
    expect(entry.sentiment).toBe(FeedbackSentiment.Negative);
  });
  it('handles Neutral sentiment', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Neutral });
    expect(entry.sentiment).toBe(FeedbackSentiment.Neutral);
  });
  it('handles Critical sentiment', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Critical });
    expect(entry.sentiment).toBe(FeedbackSentiment.Critical);
  });

  // All sources
  it('handles User source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.User });
    expect(entry.source).toBe(FeedbackSource.User);
  });
  it('handles Developer source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.Developer });
    expect(entry.source).toBe(FeedbackSource.Developer);
  });
  it('handles Logs source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.Logs });
    expect(entry.source).toBe(FeedbackSource.Logs);
  });
  it('handles Metrics source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.Metrics });
    expect(entry.source).toBe(FeedbackSource.Metrics);
  });
  it('handles AI source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.AI });
    expect(entry.source).toBe(FeedbackSource.AI);
  });
  it('handles Workflow source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.Workflow });
    expect(entry.source).toBe(FeedbackSource.Workflow);
  });
  it('handles Errors source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.Errors });
    expect(entry.source).toBe(FeedbackSource.Errors);
  });
  it('handles Conversation source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.Conversation });
    expect(entry.source).toBe(FeedbackSource.Conversation);
  });
  it('handles Capability source', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, source: FeedbackSource.Capability });
    expect(entry.source).toBe(FeedbackSource.Capability);
  });

  // Auto-process when enabled
  it('auto-processes when config.autoProcessEnabled=true', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.processed).toBe(true);
  });
  it('auto-processed entry has processedAt', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.processedAt).not.toBeNull();
  });
  it('auto-processed entry has extractedInsights', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(entry.extractedInsights.length).toBeGreaterThan(0);
  });
  it('extractedInsights is frozen', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    expect(Object.isFrozen(entry.extractedInsights)).toBe(true);
  });
  it('does not auto-process when config.autoProcessEnabled=false', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    expect(entry.processed).toBe(false);
  });
  it('non-auto-processed entry has processedAt null', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    expect(entry.processedAt).toBeNull();
  });
  it('non-auto-processed entry has empty extractedInsights', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    expect(entry.extractedInsights).toEqual([]);
  });

  // Empty content
  it('handles empty content string', async () => {
    const c = createCollector();
    const entry = await c.collect({ ...defaultParams, content: '' });
    expect(entry.content).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROCESS
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — process', () => {
  it('sets processed to true', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    const processed = await c.process(entry.id);
    expect(processed.processed).toBe(true);
  });
  it('sets processedAt timestamp', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    const processed = await c.process(entry.id);
    expect(processed.processedAt).not.toBeNull();
    expect(typeof processed.processedAt).toBe('string');
  });
  it('extracts insights for Positive sentiment', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Positive });
    const processed = await c.process(entry.id);
    expect(processed.extractedInsights).toContain('Working well');
    expect(processed.extractedInsights).toContain('Value confirmed');
    expect(processed.extractedInsights).toContain('User satisfied');
  });
  it('extracts insights for Negative sentiment', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Negative });
    const processed = await c.process(entry.id);
    expect(processed.extractedInsights).toContain('Potential bottleneck');
    expect(processed.extractedInsights).toContain('Quality concern');
    expect(processed.extractedInsights).toContain('UX friction detected');
  });
  it('extracts insights for Critical sentiment', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Critical });
    const processed = await c.process(entry.id);
    expect(processed.extractedInsights).toContain('Critical issue');
    expect(processed.extractedInsights).toContain('Immediate action needed');
    expect(processed.extractedInsights).toContain('Value destruction detected');
  });
  it('extracts insights for Neutral sentiment', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Neutral });
    const processed = await c.process(entry.id);
    expect(processed.extractedInsights).toContain('Observation');
    expect(processed.extractedInsights).toContain('Data point recorded');
    expect(processed.extractedInsights).toContain('Monitoring recommended');
  });
  it('insights are frozen', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    const processed = await c.process(entry.id);
    expect(Object.isFrozen(processed.extractedInsights)).toBe(true);
  });
  it('processed entry is frozen', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    const processed = await c.process(entry.id);
    expect(Object.isFrozen(processed)).toBe(true);
  });
  it('throws FeedbackNotFoundError for unknown id', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await expect(c.process(brandFeedbackId('nonexistent'))).rejects.toThrow(FeedbackNotFoundError);
  });
  it('FeedbackNotFoundError extends EvolutionError', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    try {
      await c.process(brandFeedbackId('nope'));
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(EvolutionError);
    }
  });
  it('FeedbackNotFoundError has feedbackId', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    try {
      await c.process(brandFeedbackId('nope'));
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as FeedbackNotFoundError).feedbackId).toBe('nope');
    }
  });
  it('updates the stored entry', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    await c.process(entry.id);
    const stored = await c.getById(entry.id);
    expect(stored!.processed).toBe(true);
  });
  it('preserves original fields after processing', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    await c.process(entry.id);
    const stored = await c.getById(entry.id);
    expect(stored!.source).toBe(FeedbackSource.User);
    expect(stored!.sentiment).toBe(FeedbackSentiment.Positive);
    expect(stored!.content).toBe('This is great!');
    expect(stored!.receivedAt).toBe(entry.receivedAt);
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — getById', () => {
  it('returns null for unknown id', async () => {
    const c = createCollector();
    const result = await c.getById(brandFeedbackId('nonexistent'));
    expect(result).toBeNull();
  });
  it('returns entry after collect', async () => {
    const c = createCollector();
    const entry = await c.collect(defaultParams);
    const found = await c.getById(entry.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(entry.id);
  });
  it('returns processed entry after process', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    await c.process(entry.id);
    const found = await c.getById(entry.id);
    expect(found!.processed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — list', () => {
  it('returns empty array initially', async () => {
    const c = createCollector();
    const all = await c.list();
    expect(all).toEqual([]);
  });
  it('returns all entries', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    await c.collect({ ...defaultParams, content: 'Second' });
    const all = await c.list();
    expect(all).toHaveLength(2);
  });
  it('filters by source', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    await c.collect({ ...defaultParams, source: FeedbackSource.Logs, content: 'From logs' });
    const userFeedback = await c.list({ source: FeedbackSource.User });
    expect(userFeedback).toHaveLength(1);
    expect(userFeedback[0].source).toBe(FeedbackSource.User);
  });
  it('filters by sentiment', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Negative, content: 'Bad' });
    const negative = await c.list({ sentiment: FeedbackSentiment.Negative });
    expect(negative).toHaveLength(1);
  });
  it('filters by processed=true', async () => {
    const c = createCollector(); // auto-process enabled
    await c.collect(defaultParams);
    const processed = await c.list({ processed: true });
    expect(processed).toHaveLength(1);
  });
  it('filters by processed=false', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    const unprocessed = await c.list({ processed: false });
    expect(unprocessed).toHaveLength(1);
  });
  it('combines multiple filters', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Negative, content: 'Bad' });
    await c.process((await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Negative, content: 'Bad2' })).id);
    const filtered = await c.list({ sentiment: FeedbackSentiment.Negative, processed: true });
    expect(filtered).toHaveLength(1);
  });
  it('returns frozen array', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    const all = await c.list();
    expect(Object.isFrozen(all)).toBe(true);
  });
  it('returns empty when no entries match filter', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    const logs = await c.list({ source: FeedbackSource.Logs });
    expect(logs).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// COUNT
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — count', () => {
  it('returns 0 initially', async () => {
    const c = createCollector();
    expect(await c.count()).toBe(0);
  });
  it('returns 1 after one collect', async () => {
    const c = createCollector();
    await c.collect(defaultParams);
    expect(await c.count()).toBe(1);
  });
  it('returns 5 after five collects', async () => {
    const c = createCollector();
    for (let i = 0; i < 5; i++) {
      await c.collect({ ...defaultParams, content: `Feedback ${i}` });
    }
    expect(await c.count()).toBe(5);
  });
  it('count does not change on process', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect(defaultParams);
    await c.process(entry.id);
    expect(await c.count()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIMIT EXCEEDED
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — limit exceeded', () => {
  it('throws FeedbackLimitExceededError when maxFeedback reached', async () => {
    const c = new FeedbackCollector({ maxFeedback: 2, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    await c.collect(defaultParams);
    await expect(c.collect(defaultParams)).rejects.toThrow(FeedbackLimitExceededError);
  });
  it('FeedbackLimitExceededError extends EvolutionError', async () => {
    const c = new FeedbackCollector({ maxFeedback: 1, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    try {
      await c.collect(defaultParams);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(EvolutionError);
    }
  });
  it('FeedbackLimitExceededError has error code', async () => {
    const c = new FeedbackCollector({ maxFeedback: 1, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    try {
      await c.collect(defaultParams);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as EvolutionError).code).toBe('FEEDBACK_LIMIT_EXCEEDED');
    }
  });
  it('FeedbackLimitExceededError has timestamp', async () => {
    const c = new FeedbackCollector({ maxFeedback: 1, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    try {
      await c.collect(defaultParams);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as EvolutionError).timestamp).toBeDefined();
    }
  });
  it('FeedbackLimitExceededError has context with maxFeedback', async () => {
    const c = new FeedbackCollector({ maxFeedback: 1, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    try {
      await c.collect(defaultParams);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as FeedbackLimitExceededError).context.maxFeedback).toBe(1);
    }
  });
  it('allows exactly maxFeedback collects', async () => {
    const c = new FeedbackCollector({ maxFeedback: 3, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    await c.collect(defaultParams);
    await c.collect(defaultParams);
    expect(await c.count()).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// EVENT EMISSION
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — event emission', () => {
  it('emits FeedbackReceivedEvent on collect', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 }, bus);
    await c.collect(defaultParams);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.feedback.received');
    expect(evt).toBeDefined();
  });
  it('FeedbackReceivedEvent has timestamp', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 }, bus);
    await c.collect(defaultParams);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.feedback.received');
    expect(evt!.timestamp).toBeDefined();
  });
  it('emits FeedbackProcessedEvent on process', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 }, bus);
    const entry = await c.collect(defaultParams);
    await c.process(entry.id);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.feedback.processed');
    expect(evt).toBeDefined();
  });
  it('FeedbackProcessedEvent has timestamp', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 }, bus);
    const entry = await c.collect(defaultParams);
    await c.process(entry.id);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.feedback.processed');
    expect(evt!.timestamp).toBeDefined();
  });
  it('emits both events on collect with auto-process', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: true, processingTimeoutMs: 10000 }, bus);
    await c.collect(defaultParams);
    const log = bus.getLog();
    const received = log.filter(e => e.eventType === 'evolution.feedback.received');
    const processed = log.filter(e => e.eventType === 'evolution.feedback.processed');
    expect(received).toHaveLength(1);
    expect(processed).toHaveLength(1);
  });
  it('FeedbackReceivedEvent fires before FeedbackProcessedEvent', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: true, processingTimeoutMs: 10000 }, bus);
    await c.collect(defaultParams);
    const log = bus.getLog();
    const recvIdx = log.findIndex(e => e.eventType === 'evolution.feedback.received');
    const procIdx = log.findIndex(e => e.eventType === 'evolution.feedback.processed');
    expect(recvIdx).toBeLessThan(procIdx);
  });
  it('does not emit events without eventBus', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    await c.collect(defaultParams);
    // No error
    expect(true).toBe(true);
  });
  it('multiple collects emit multiple received events', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 }, bus);
    await c.collect(defaultParams);
    await c.collect(defaultParams);
    await c.collect(defaultParams);
    const log = bus.getLog();
    const received = log.filter(e => e.eventType === 'evolution.feedback.received');
    expect(received).toHaveLength(3);
  });
  it('multiple processes emit multiple processed events', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 }, bus);
    const e1 = await c.collect(defaultParams);
    const e2 = await c.collect(defaultParams);
    await c.process(e1.id);
    await c.process(e2.id);
    const log = bus.getLog();
    const processed = log.filter(e => e.eventType === 'evolution.feedback.processed');
    expect(processed).toHaveLength(2);
  });
  it('event log grows correctly', async () => {
    const bus = new InProcessEventBus();
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 }, bus);
    const e1 = await c.collect(defaultParams);
    await c.process(e1.id);
    const log = bus.getLog();
    expect(log.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// STORE ACCESS
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — store access', () => {
  it('getStore returns store instance', () => {
    const c = createCollector();
    expect(c.getStore()).toBeDefined();
  });
  it('store size reflects collections', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const store = c.getStore();
    expect(store.size).toBe(0);
    await c.collect(defaultParams);
    expect(store.size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INSIGHT PATTERNS
// ═══════════════════════════════════════════════════════════════════

describe('FeedbackCollector — insight patterns', () => {
  it('Positive has 3 insights', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Positive });
    const processed = await c.process(entry.id);
    expect(processed.extractedInsights).toHaveLength(3);
  });
  it('Negative has 3 insights', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Negative });
    const processed = await c.process(entry.id);
    expect(processed.extractedInsights).toHaveLength(3);
  });
  it('Critical has 3 insights', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Critical });
    const processed = await c.process(entry.id);
    expect(processed.extractedInsights).toHaveLength(3);
  });
  it('Neutral has 3 insights', async () => {
    const c = new FeedbackCollector({ maxFeedback: 10000, autoProcessEnabled: false, processingTimeoutMs: 10000 });
    const entry = await c.collect({ ...defaultParams, sentiment: FeedbackSentiment.Neutral });
    const processed = await c.process(entry.id);
    expect(processed.extractedInsights).toHaveLength(3);
  });
});
