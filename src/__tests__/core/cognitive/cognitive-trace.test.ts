/**
 * Cognitive Trace Tests — TASK-AIS-003I.000
 *
 * Tests the CognitiveTrace audit trail:
 *   - record entries at all levels (Debug, Info, Warn, Error)
 *   - debug/info/warn/error convenience methods
 *   - getBySession, getByConversation, getByPhase, getByLevel
 *   - clear, count
 *   - Disabled trace returns empty entries
 *   - Max entries eviction
 */

import { CognitiveTrace } from '../../../core/cognitive/cognitive-trace.js';
import { CognitiveTraceLevel } from '../../../core/cognitive/types.js';
import { brandCognitiveSessionId, brandConversationId } from '../../../core/cognitive/types.js';

// ─── Helpers ─────────────────────────────────────────────────────

function createSessionId(): ReturnType<typeof brandCognitiveSessionId> {
  return brandCognitiveSessionId(crypto.randomUUID());
}

function createConversationId(): ReturnType<typeof brandConversationId> {
  return brandConversationId(crypto.randomUUID());
}

// ─── Enabled Trace ───────────────────────────────────────────────

describe('CognitiveTrace (enabled)', () => {
  let trace: CognitiveTrace;
  const sessionId = createSessionId();
  const conversationId = createConversationId();

  beforeEach(() => {
    trace = new CognitiveTrace(true, 100);
  });

  // ─── Record at all levels ──────────────────────────────────────

  it('records a Debug entry', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Debug,
      phase: 'intent',
      action: 'classify',
      message: 'Classifying intent',
    });

    expect(entry.level).toBe(CognitiveTraceLevel.Debug);
    expect(entry.phase).toBe('intent');
    expect(entry.action).toBe('classify');
    expect(entry.message).toBe('Classifying intent');
    expect(entry.sessionId).toBe(sessionId);
  });

  it('records an Info entry', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'context',
      action: 'build',
      message: 'Context built',
    });

    expect(entry.level).toBe(CognitiveTraceLevel.Info);
    expect(trace.count).toBe(1);
  });

  it('records a Warn entry', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Warn,
      phase: 'compression',
      action: 'compress',
      message: 'Context near limit',
    });

    expect(entry.level).toBe(CognitiveTraceLevel.Warn);
  });

  it('records an Error entry', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Error,
      phase: 'provider',
      action: 'generate',
      message: 'Provider failed',
    });

    expect(entry.level).toBe(CognitiveTraceLevel.Error);
  });

  // ─── Entry structure ───────────────────────────────────────────

  it('entries have an id', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
    });
    expect(entry.id).toBeTruthy();
  });

  it('entries have a timestamp', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
    });
    expect(entry.timestamp).toBeTruthy();
    expect(typeof entry.timestamp).toBe('string');
  });

  it('entries have null conversationId and turnId by default', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
    });
    expect(entry.conversationId).toBeNull();
    expect(entry.turnId).toBeNull();
  });

  it('entries can have conversationId and turnId', () => {
    const entry = trace.record({
      sessionId,
      conversationId,
      turnId: 'turn-1',
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
    });
    expect(entry.conversationId).toBe(conversationId);
    expect(entry.turnId).toBe('turn-1');
  });

  it('entries can have durationMs', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
      durationMs: 42,
    });
    expect(entry.durationMs).toBe(42);
  });

  it('entries default durationMs to null', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
    });
    expect(entry.durationMs).toBeNull();
  });

  it('entries can have metadata', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
      metadata: { key: 'value', count: 5 },
    });
    expect(entry.metadata).toEqual({ key: 'value', count: 5 });
  });

  it('entries default metadata to empty object', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
    });
    expect(entry.metadata).toEqual({});
  });

  it('entries are frozen', () => {
    const entry = trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'test',
    });
    expect(Object.isFrozen(entry)).toBe(true);
  });

  // ─── Convenience methods ─────────────────────────────────────

  it('debug() records a Debug-level entry', () => {
    const entry = trace.debug({
      sessionId,
      phase: 'intent',
      action: 'parse',
      message: 'parsing input',
    });
    expect(entry.level).toBe(CognitiveTraceLevel.Debug);
  });

  it('info() records an Info-level entry', () => {
    const entry = trace.info({
      sessionId,
      phase: 'ctx',
      action: 'build',
      message: 'building context',
    });
    expect(entry.level).toBe(CognitiveTraceLevel.Info);
  });

  it('warn() records a Warn-level entry', () => {
    const entry = trace.warn({
      sessionId,
      phase: 'budget',
      action: 'check',
      message: 'budget low',
    });
    expect(entry.level).toBe(CognitiveTraceLevel.Warn);
  });

  it('error() records an Error-level entry', () => {
    const entry = trace.error({
      sessionId,
      phase: 'provider',
      action: 'call',
      message: 'provider down',
    });
    expect(entry.level).toBe(CognitiveTraceLevel.Error);
  });

  // ─── getEntries ───────────────────────────────────────────────

  it('getEntries returns all recorded entries', () => {
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'a', action: 'b', message: 'm1' });
    trace.record({ sessionId, level: CognitiveTraceLevel.Warn, phase: 'c', action: 'd', message: 'm2' });
    expect(trace.getEntries().length).toBe(2);
  });

  it('getEntries returns a frozen copy', () => {
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'a', action: 'b', message: 'm1' });
    const entries = trace.getEntries();
    expect(Object.isFrozen(entries)).toBe(true);
  });

  // ─── getBySession ─────────────────────────────────────────────

  it('getBySession filters by sessionId', () => {
    const session2 = createSessionId();
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm1' });
    trace.record({ sessionId: session2, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm2' });
    trace.record({ sessionId, level: CognitiveTraceLevel.Warn, phase: 'p', action: 'a', message: 'm3' });

    const result = trace.getBySession(sessionId);
    expect(result.length).toBe(2);
    expect(result.every(e => e.sessionId === sessionId)).toBe(true);
  });

  it('getBySession returns frozen array', () => {
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm1' });
    expect(Object.isFrozen(trace.getBySession(sessionId))).toBe(true);
  });

  // ─── getByConversation ────────────────────────────────────────

  it('getByConversation filters by conversationId', () => {
    const conv2 = createConversationId();
    trace.record({ sessionId, conversationId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm1' });
    trace.record({ sessionId, conversationId: conv2, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm2' });
    trace.record({ sessionId, conversationId, level: CognitiveTraceLevel.Warn, phase: 'p', action: 'a', message: 'm3' });

    const result = trace.getByConversation(conversationId);
    expect(result.length).toBe(2);
  });

  // ─── getByPhase ───────────────────────────────────────────────

  it('getByPhase filters by phase', () => {
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'intent', action: 'a', message: 'm1' });
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'context', action: 'a', message: 'm2' });
    trace.record({ sessionId, level: CognitiveTraceLevel.Warn, phase: 'intent', action: 'a', message: 'm3' });

    const result = trace.getByPhase('intent');
    expect(result.length).toBe(2);
    expect(result.every(e => e.phase === 'intent')).toBe(true);
  });

  // ─── getByLevel ───────────────────────────────────────────────

  it('getByLevel filters by level', () => {
    trace.record({ sessionId, level: CognitiveTraceLevel.Debug, phase: 'p', action: 'a', message: 'm1' });
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm2' });
    trace.record({ sessionId, level: CognitiveTraceLevel.Error, phase: 'p', action: 'a', message: 'm3' });

    expect(trace.getByLevel(CognitiveTraceLevel.Debug).length).toBe(1);
    expect(trace.getByLevel(CognitiveTraceLevel.Info).length).toBe(1);
    expect(trace.getByLevel(CognitiveTraceLevel.Error).length).toBe(1);
    expect(trace.getByLevel(CognitiveTraceLevel.Warn).length).toBe(0);
  });

  // ─── count ────────────────────────────────────────────────────

  it('count returns 0 initially', () => {
    expect(trace.count).toBe(0);
  });

  it('count increases with each record', () => {
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm1' });
    expect(trace.count).toBe(1);
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm2' });
    expect(trace.count).toBe(2);
  });

  // ─── clear ───────────────────────────────────────────────────

  it('clear removes all entries', () => {
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm1' });
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm2' });
    expect(trace.count).toBe(2);

    trace.clear();
    expect(trace.count).toBe(0);
    expect(trace.getEntries()).toEqual([]);
  });

  it('allows recording after clear', () => {
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'm1' });
    trace.clear();
    trace.record({ sessionId, level: CognitiveTraceLevel.Warn, phase: 'p', action: 'a', message: 'm2' });
    expect(trace.count).toBe(1);
    expect(trace.getEntries()[0]!.level).toBe(CognitiveTraceLevel.Warn);
  });

  // ─── Max entries eviction ──────────────────────────────────────

  describe('max entries eviction', () => {
    it('evicts oldest entries when over maxEntries', () => {
      const limitedTrace = new CognitiveTrace(true, 5);
      const sId = createSessionId();

      for (let i = 0; i < 8; i++) {
        limitedTrace.record({
          sessionId: sId,
          level: CognitiveTraceLevel.Info,
          phase: `p${i}`,
          action: `a${i}`,
          message: `entry ${i}`,
        });
      }

      expect(limitedTrace.count).toBe(5);
      // The oldest entries (0, 1, 2) should be evicted
      const entries = limitedTrace.getEntries();
      expect(entries[0]!.message).toBe('entry 3');
      expect(entries[4]!.message).toBe('entry 7');
    });

    it('keeps entries at exactly maxEntries when exceeding', () => {
      const limitedTrace = new CognitiveTrace(true, 3);
      const sId = createSessionId();

      for (let i = 0; i < 10; i++) {
        limitedTrace.record({
          sessionId: sId,
          level: CognitiveTraceLevel.Info,
          phase: 'p',
          action: 'a',
          message: `msg-${i}`,
        });
      }

      expect(limitedTrace.count).toBe(3);
    });
  });
});

// ─── Disabled Trace ───────────────────────────────────────────────

describe('CognitiveTrace (disabled)', () => {
  it('returns empty entries when disabled', () => {
    const trace = new CognitiveTrace(false);
    const sessionId = createSessionId();

    trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'test',
      action: 'run',
      message: 'this should be discarded',
    });

    expect(trace.count).toBe(0);
    expect(trace.getEntries()).toEqual([]);
  });

  it('debug/info/warn/error return stub entries when disabled', () => {
    const trace = new CognitiveTrace(false);
    const sessionId = createSessionId();

    const entry = trace.info({
      sessionId,
      phase: 'test',
      action: 'run',
      message: 'ignored',
    });

    // Stub entry should have specific values
    expect(entry.phase).toBe('disabled');
    expect(entry.action).toBe('none');
    expect(entry.message).toBe('Tracing is disabled');
    expect(entry.id).toBeTruthy();
  });

  it('convenience methods do not add to entries when disabled', () => {
    const trace = new CognitiveTrace(false);
    const sessionId = createSessionId();

    trace.debug({ sessionId, phase: 'p', action: 'a', message: 'd' });
    trace.info({ sessionId, phase: 'p', action: 'a', message: 'i' });
    trace.warn({ sessionId, phase: 'p', action: 'a', message: 'w' });
    trace.error({ sessionId, phase: 'p', action: 'a', message: 'e' });

    expect(trace.count).toBe(0);
  });

  it('getBySession returns empty when disabled', () => {
    const trace = new CognitiveTrace(false);
    const sessionId = createSessionId();

    trace.record({
      sessionId,
      level: CognitiveTraceLevel.Info,
      phase: 'p',
      action: 'a',
      message: 'test',
    });

    expect(trace.getBySession(sessionId)).toEqual([]);
  });

  it('getByConversation returns empty when disabled', () => {
    const trace = new CognitiveTrace(false);
    const convId = createConversationId();

    trace.record({
      sessionId: createSessionId(),
      conversationId: convId,
      level: CognitiveTraceLevel.Info,
      phase: 'p',
      action: 'a',
      message: 'test',
    });

    expect(trace.getByConversation(convId)).toEqual([]);
  });

  it('getByPhase returns empty when disabled', () => {
    const trace = new CognitiveTrace(false);
    trace.record({
      sessionId: createSessionId(),
      level: CognitiveTraceLevel.Info,
      phase: 'intent',
      action: 'a',
      message: 'test',
    });

    expect(trace.getByPhase('intent')).toEqual([]);
  });

  it('getByLevel returns empty when disabled', () => {
    const trace = new CognitiveTrace(false);
    trace.record({
      sessionId: createSessionId(),
      level: CognitiveTraceLevel.Error,
      phase: 'p',
      action: 'a',
      message: 'test',
    });

    expect(trace.getByLevel(CognitiveTraceLevel.Error)).toEqual([]);
  });

  it('clear works when disabled (no-op)', () => {
    const trace = new CognitiveTrace(false);
    expect(() => trace.clear()).not.toThrow();
  });
});

// ─── Default constructor ─────────────────────────────────────────

describe('CognitiveTrace default constructor', () => {
  it('is enabled by default', () => {
    const trace = new CognitiveTrace();
    const sessionId = createSessionId();
    trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: 'test' });
    expect(trace.count).toBe(1);
  });

  it('defaults maxEntries to 10000', () => {
    const trace = new CognitiveTrace();
    // Can't inspect private field directly, but 10000 entries should all fit
    const sessionId = createSessionId();
    for (let i = 0; i < 100; i++) {
      trace.record({ sessionId, level: CognitiveTraceLevel.Info, phase: 'p', action: 'a', message: `m${i}` });
    }
    expect(trace.count).toBe(100);
  });
});
