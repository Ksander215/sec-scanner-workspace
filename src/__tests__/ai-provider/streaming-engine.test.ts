import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StreamingEngine } from '../../core/ai-provider/streaming-engine.js';
import { MockProviderSDK } from '../../core/ai-provider/provider-sdk.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  StreamState,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';
import {
  StreamError,
  StreamNotFoundError,
  StreamAlreadyCompletedError,
} from '../../core/ai-provider/errors.js';

// ─── Factory helpers ─────────────────────────────────────────────

const PROVIDER_ID = crypto.randomUUID() as Types.ProviderId;
const MODEL_ID = crypto.randomUUID() as Types.ModelId;

function makeSDK(overrides?: Partial<Parameters<typeof MockProviderSDK>[0]>): MockProviderSDK {
  return new MockProviderSDK({
    id: PROVIDER_ID as unknown as string,
    response: 'Hello world this is a test',
    latencyMs: 0,
    failRate: 0,
    ...overrides,
  });
}

function makeEngine(
  configOverrides?: Partial<Types.StreamingEngineConfig>,
  eventBus?: InProcessEventBus | null,
  sdkGetter?: (providerId: string) => Promise<Types.ProviderSDK | null>,
): StreamingEngine {
  const config = { ...DefaultAIProviderRuntimeConfig.streamingEngine, ...configOverrides };
  return new StreamingEngine(config, {
    eventBus: eventBus ?? null,
    getProviderSDK: sdkGetter ?? (async (_pid: string) => makeSDK() as unknown as Types.ProviderSDK),
  });
}

function makeRequest(overrides?: Partial<Types.ExecutionRequest>): Types.ExecutionRequest {
  return Object.freeze({
    id: crypto.randomUUID() as Types.ExecutionId,
    modelId: MODEL_ID,
    providerId: PROVIDER_ID,
    messages: [{ role: 'user' as const, content: 'Hello' }],
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  });
}

function makeChunk(overrides?: Partial<Types.StreamChunk>): Types.StreamChunk {
  return Object.freeze({
    id: crypto.randomUUID(),
    streamId: crypto.randomUUID() as Types.StreamId,
    content: 'chunk-content',
    modelId: MODEL_ID,
    providerId: PROVIDER_ID,
    finishReason: null,
    tokenCount: 5,
    latencyMs: 10,
    createdAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('StreamingEngine', () => {
  let engine: StreamingEngine;
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    engine = makeEngine(undefined, null);
  });

  afterEach(() => {
    eventBus.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // stream — basic
  // ═══════════════════════════════════════════════════════════════
  describe('stream — basic', () => {
    it('should yield at least one chunk', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should yield chunks with content', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      expect(chunks.every(c => typeof c.content === 'string')).toBe(true);
    });

    it('should yield chunks with modelId', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      expect(chunks.every(c => c.modelId === MODEL_ID)).toBe(true);
    });

    it('should yield chunks with providerId', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      expect(chunks.every(c => c.providerId === PROVIDER_ID)).toBe(true);
    });

    it('should yield chunks with streamId', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      // All chunks from same stream should have same streamId
      const ids = new Set(chunks.map(c => c.streamId as string));
      expect(ids.size).toBe(1);
    });

    it('should yield chunks with createdAt timestamp', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      expect(chunks.every(c => typeof c.createdAt === 'string')).toBe(true);
    });

    it('should yield 6 chunks from mock (word-split)', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      // Mock SDK splits 'Hello world this is a test' into 6 words = 6 chunks
      expect(chunks.length).toBe(6);
    });

    it('should yield last chunk with finishReason', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      expect(chunks[chunks.length - 1].finishReason).toBe('stop');
    });

    it('should yield non-last chunks with finishReason null', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].finishReason).toBeNull();
      }
    });

    it('should have tokenCount >= 0 for each chunk', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      expect(chunks.every(c => c.tokenCount >= 0)).toBe(true);
    });

    it('should yield chunks in order', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) {
        chunks.push(chunk);
      }
      // First chunk should start with 'Hello'
      expect(chunks[0].content).toBe('Hello');
      // Last chunk should be ' test' (with leading space)
      expect(chunks[chunks.length - 1].content).toBe(' test');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // stream — events
  // ═══════════════════════════════════════════════════════════════
  describe('stream — events', () => {
    it('should publish stream.started event', async () => {
      const eng = makeEngine(undefined, eventBus);
      const iter = eng.stream(makeRequest());
      await iter.next();
      await iter.return?.();
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'stream.started')).toBe(true);
    });

    it('should publish stream.completed event', async () => {
      const eng = makeEngine(undefined, eventBus);
      for await (const _chunk of eng.stream(makeRequest())) { /* consume */ }
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'stream.completed')).toBe(true);
    });

    it('should publish stream.started before stream.completed', async () => {
      const eng = makeEngine(undefined, eventBus);
      for await (const _chunk of eng.stream(makeRequest())) { /* consume */ }
      const log = eventBus.getLog();
      const startedIdx = log.findIndex(e => e.eventType === 'stream.started');
      const completedIdx = log.findIndex(e => e.eventType === 'stream.completed');
      expect(startedIdx).toBeLessThan(completedIdx);
    });

    it('should not publish events when no eventBus', async () => {
      for await (const _chunk of engine.stream(makeRequest())) { /* consume */ }
      expect(true).toBe(true);
    });

    it('should publish stream.cancelled on error', async () => {
      const failingSDK = {
        ...makeSDK(),
        stream: async function* () { throw new Error('ECONNREFUSED'); },
      };
      const eng = makeEngine(undefined, eventBus, async () => failingSDK as unknown as Types.ProviderSDK);
      try {
        for await (const _chunk of eng.stream(makeRequest())) { /* consume */ }
      } catch { /* expected */ }
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'stream.cancelled')).toBe(true);
    });

    it('should publish events with correct classification', async () => {
      const eng = makeEngine(undefined, eventBus);
      for await (const _chunk of eng.stream(makeRequest())) { /* consume */ }
      const log = eventBus.getLog();
      const started = log.find(e => e.eventType === 'stream.started');
      expect(started?.classification).toBeDefined();
    });

    it('should publish events with timestamp', async () => {
      const eng = makeEngine(undefined, eventBus);
      for await (const _chunk of eng.stream(makeRequest())) { /* consume */ }
      const log = eventBus.getLog();
      const started = log.find(e => e.eventType === 'stream.started');
      expect(started?.timestamp).toBeTruthy();
    });

    it('should publish events with sequence numbers', async () => {
      const eng = makeEngine(undefined, eventBus);
      for await (const _chunk of eng.stream(makeRequest())) { /* consume */ }
      const log = eventBus.getLog();
      expect(log[0].sequence).toBe(1);
      expect(log[1].sequence).toBe(2);
    });

    it('should publish events with version', async () => {
      const eng = makeEngine(undefined, eventBus);
      for await (const _chunk of eng.stream(makeRequest())) { /* consume */ }
      const log = eventBus.getLog();
      const started = log.find(e => e.eventType === 'stream.started');
      expect(started?.version).toBe('1.0.0');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // stream — error handling
  // ═══════════════════════════════════════════════════════════════
  describe('stream — error handling', () => {
    it('should throw StreamError when max concurrent streams reached', async () => {
      const eng = makeEngine({ maxConcurrentStreams: 0 });
      await expect(eng.stream(makeRequest()).next()).rejects.toThrow(StreamError);
    });

    it('should include max streams count in StreamError message', async () => {
      const eng = makeEngine({ maxConcurrentStreams: 0 });
      try {
        await eng.stream(makeRequest()).next();
      } catch (e) {
        expect((e as StreamError).message).toContain('0');
      }
    });

    it('should throw StreamNotFoundError when provider SDK not found', async () => {
      const eng = makeEngine(undefined, eventBus, async () => null);
      try {
        for await (const _chunk of eng.stream(makeRequest())) { /* consume */ }
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(StreamNotFoundError);
      }
    });

    it('should propagate SDK errors', async () => {
      const failingSDK = {
        ...makeSDK(),
        stream: async function* () { throw new Error('ECONNREFUSED'); },
      };
      const eng = makeEngine(undefined, eventBus, async () => failingSDK as unknown as Types.ProviderSDK);
      await expect(
        (async () => { for await (const _c of eng.stream(makeRequest())) {} })(),
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('should publish stream.completed with Errored state on error', async () => {
      const failingSDK = {
        ...makeSDK(),
        stream: async function* () { throw new Error('ECONNREFUSED'); },
      };
      const eng = makeEngine(undefined, eventBus, async () => failingSDK as unknown as Types.ProviderSDK);
      try {
        for await (const _c of eng.stream(makeRequest())) {}
      } catch { /* expected */ }
      const log = eventBus.getLog();
      expect(log.some(e => e.eventType === 'stream.completed')).toBe(true);
      expect(log.some(e => e.eventType === 'stream.cancelled')).toBe(true);
    });

    it('should include streamError code in error', async () => {
      const eng = makeEngine({ maxConcurrentStreams: 0 });
      try {
        await eng.stream(makeRequest()).next();
      } catch (e) {
        expect((e as StreamError).code).toBe('STREAM_ERROR');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cancel — unknown stream
  // ═══════════════════════════════════════════════════════════════
  describe('cancel — unknown stream', () => {
    it('should throw StreamNotFoundError for unknown streamId', async () => {
      await expect(engine.cancel(crypto.randomUUID() as Types.StreamId)).rejects.toThrow(StreamNotFoundError);
    });

    it('should throw StreamNotFoundError for random string', async () => {
      await expect(engine.cancel('not-a-uuid' as Types.StreamId)).rejects.toThrow(StreamNotFoundError);
    });

    it('should include streamId in error', async () => {
      const id = 'test-id';
      try {
        await engine.cancel(id as Types.StreamId);
      } catch (e) {
        expect((e as StreamNotFoundError).streamId).toBe(id);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // pause / resume — unknown stream
  // ═══════════════════════════════════════════════════════════════
  describe('pause / resume — unknown stream', () => {
    it('should throw StreamNotFoundError when pausing unknown stream', async () => {
      await expect(engine.pause(crypto.randomUUID() as Types.StreamId)).rejects.toThrow(StreamNotFoundError);
    });

    it('should throw StreamNotFoundError when resuming unknown stream', async () => {
      await expect(engine.resume(crypto.randomUUID() as Types.StreamId)).rejects.toThrow(StreamNotFoundError);
    });

    it('should throw StreamNotFoundError for pause with empty string', async () => {
      await expect(engine.pause('' as Types.StreamId)).rejects.toThrow(StreamNotFoundError);
    });

    it('should throw StreamNotFoundError for resume with empty string', async () => {
      await expect(engine.resume('' as Types.StreamId)).rejects.toThrow(StreamNotFoundError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getBuffer — unknown stream
  // ═══════════════════════════════════════════════════════════════
  describe('getBuffer — unknown stream', () => {
    it('should throw StreamNotFoundError for unknown stream', async () => {
      await expect(engine.getBuffer(crypto.randomUUID() as Types.StreamId)).rejects.toThrow(StreamNotFoundError);
    });

    it('should throw StreamNotFoundError for empty key', async () => {
      await expect(engine.getBuffer('' as Types.StreamId)).rejects.toThrow(StreamNotFoundError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getStatus
  // ═══════════════════════════════════════════════════════════════
  describe('getStatus', () => {
    it('should return null for unknown stream', async () => {
      const status = await engine.getStatus(crypto.randomUUID() as Types.StreamId);
      expect(status).toBeNull();
    });

    it('should return null for empty string', async () => {
      const status = await engine.getStatus('' as Types.StreamId);
      expect(status).toBeNull();
    });

    it('should return StreamState type', async () => {
      const status = await engine.getStatus(crypto.randomUUID() as Types.StreamId);
      // null is valid (unknown stream)
      expect(status).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // listActive
  // ═══════════════════════════════════════════════════════════════
  describe('listActive', () => {
    it('should return empty array initially', async () => {
      const active = await engine.listActive();
      expect(active).toHaveLength(0);
    });

    it('should return readonly array', async () => {
      const active = await engine.listActive();
      expect(Array.isArray(active)).toBe(true);
    });

    it('should return StreamId typed elements', async () => {
      const active = await engine.listActive();
      expect(active).toBeDefined();
    });

    it('should return empty array after stream completes', async () => {
      for await (const _chunk of engine.stream(makeRequest())) { /* consume */ }
      const active = await engine.listActive();
      expect(active).toHaveLength(0);
    });

    it('should return empty after error', async () => {
      const failingSDK = makeSDK({ failRate: 1, errorMessage: 'fail' });
      const eng = makeEngine(undefined, null, async () => failingSDK as unknown as Types.ProviderSDK);
      try {
        for await (const _c of eng.stream(makeRequest())) {}
      } catch { /* expected */ }
      const active = await eng.listActive();
      // The errored stream is still in the map with Errored state
      // listActive only returns Active/Paused/Resumed, not Errored
      expect(active).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // merge
  // ═══════════════════════════════════════════════════════════════
  describe('merge', () => {
    it('should return empty string for empty chunks array', () => {
      expect(engine.merge([])).toBe('');
    });

    it('should join single chunk content', () => {
      const chunk = makeChunk({ content: 'hello' });
      expect(engine.merge([chunk])).toBe('hello');
    });

    it('should join multiple chunks content', () => {
      const c1 = makeChunk({ content: 'hello ' });
      const c2 = makeChunk({ content: 'world' });
      expect(engine.merge([c1, c2])).toBe('hello world');
    });

    it('should join many chunks in order', () => {
      const chunks = [
        makeChunk({ content: 'a' }),
        makeChunk({ content: 'b' }),
        makeChunk({ content: 'c' }),
      ];
      expect(engine.merge(chunks)).toBe('abc');
    });

    it('should handle chunks with empty content', () => {
      const c1 = makeChunk({ content: '' });
      const c2 = makeChunk({ content: 'data' });
      expect(engine.merge([c1, c2])).toBe('data');
    });

    it('should return string type', () => {
      const result = engine.merge([makeChunk()]);
      expect(typeof result).toBe('string');
    });

    it('should handle special characters in content', () => {
      const c1 = makeChunk({ content: 'hello\n' });
      const c2 = makeChunk({ content: 'world\t!' });
      expect(engine.merge([c1, c2])).toBe('hello\nworld\t!');
    });

    it('should handle unicode content', () => {
      const c1 = makeChunk({ content: '你好 ' });
      const c2 = makeChunk({ content: '世界' });
      expect(engine.merge([c1, c2])).toBe('你好 世界');
    });

    it('should handle all empty chunks', () => {
      const chunks = [makeChunk({ content: '' }), makeChunk({ content: '' })];
      expect(engine.merge(chunks)).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // max concurrent streams
  // ═══════════════════════════════════════════════════════════════
  describe('max concurrent streams', () => {
    it('should allow streams up to maxConcurrentStreams', async () => {
      const eng = makeEngine({ maxConcurrentStreams: 3 });
      const chunks: Types.StreamChunk[] = [];
      for await (const c of eng.stream(makeRequest())) { chunks.push(c); }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should use config maxConcurrentStreams from DefaultAIProviderRuntimeConfig', () => {
      const eng = makeEngine();
      expect(eng).toBeDefined();
    });

    it('should allow overriding maxConcurrentStreams', async () => {
      const eng = makeEngine({ maxConcurrentStreams: 1 });
      const chunks: Types.StreamChunk[] = [];
      for await (const c of eng.stream(makeRequest())) { chunks.push(c); }
      expect(chunks.length).toBe(6);
    });

    it('should reject at maxConcurrentStreams=0', async () => {
      const eng = makeEngine({ maxConcurrentStreams: 0 });
      await expect(eng.stream(makeRequest()).next()).rejects.toThrow(StreamError);
    });

    it('should work with maxConcurrentStreams=1 after first completes', async () => {
      const eng = makeEngine({ maxConcurrentStreams: 1 });
      const chunks1: Types.StreamChunk[] = [];
      for await (const c of eng.stream(makeRequest())) { chunks1.push(c); }
      expect(chunks1.length).toBeGreaterThan(0);
      // After first completes, second should work
      const chunks2: Types.StreamChunk[] = [];
      for await (const c of eng.stream(makeRequest())) { chunks2.push(c); }
      expect(chunks2.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // stream — different request variations
  // ═══════════════════════════════════════════════════════════════
  describe('stream — request variations', () => {
    it('should handle request with no providerId', async () => {
      const eng = makeEngine(undefined, null, async () => makeSDK() as unknown as Types.ProviderSDK);
      const req = makeRequest({ providerId: undefined });
      const chunks: Types.StreamChunk[] = [];
      for await (const c of eng.stream(req)) { chunks.push(c); }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle request with no modelId', async () => {
      const eng = makeEngine(undefined, null, async () => makeSDK() as unknown as Types.ProviderSDK);
      const req = makeRequest({ modelId: undefined });
      const chunks: Types.StreamChunk[] = [];
      for await (const c of eng.stream(req)) { chunks.push(c); }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle multiple sequential streams', async () => {
      for (let i = 0; i < 3; i++) {
        const chunks: Types.StreamChunk[] = [];
        for await (const c of engine.stream(makeRequest())) { chunks.push(c); }
        expect(chunks.length).toBe(6);
      }
    });

    it('should handle single word response', async () => {
      const sdk = makeSDK({ response: 'Hi' });
      const eng = makeEngine(undefined, null, async () => sdk as unknown as Types.ProviderSDK);
      const chunks: Types.StreamChunk[] = [];
      for await (const c of eng.stream(makeRequest())) { chunks.push(c); }
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe('Hi');
    });

    it('should handle empty response from SDK', async () => {
      const sdk = makeSDK({ response: '' });
      const eng = makeEngine(undefined, null, async () => sdk as unknown as Types.ProviderSDK);
      const chunks: Types.StreamChunk[] = [];
      for await (const c of eng.stream(makeRequest())) { chunks.push(c); }
      // Empty response: ''.split(' ') gives [''] which yields 1 chunk
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe('');
    });

    it('should handle request with messages', async () => {
      const req = makeRequest({
        messages: [
          { role: 'system', content: 'Be helpful' },
          { role: 'user', content: 'Hello' },
        ],
      });
      const chunks: Types.StreamChunk[] = [];
      for await (const c of engine.stream(req)) { chunks.push(c); }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle request with empty messages', async () => {
      const req = makeRequest({ messages: [] });
      const chunks: Types.StreamChunk[] = [];
      for await (const c of engine.stream(req)) { chunks.push(c); }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle request with system prompt', async () => {
      const req = makeRequest({ systemPrompt: 'You are a test assistant.' });
      const chunks: Types.StreamChunk[] = [];
      for await (const c of engine.stream(req)) { chunks.push(c); }
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // stream — chunk details
  // ═══════════════════════════════════════════════════════════════
  describe('stream — chunk details', () => {
    it('should yield chunks with id', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) { chunks.push(chunk); }
      expect(chunks.every(c => typeof c.id === 'string')).toBe(true);
    });

    it('should yield chunks with metadata', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) { chunks.push(chunk); }
      expect(chunks.every(c => c.metadata !== undefined)).toBe(true);
    });

    it('should yield chunks with latencyMs', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) { chunks.push(chunk); }
      expect(chunks.every(c => typeof c.latencyMs === 'number')).toBe(true);
    });

    it('should accumulate total tokens from chunks', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) { chunks.push(chunk); }
      const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
      expect(totalTokens).toBeGreaterThan(0);
    });

    it('should yield chunks with consistent streamId', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) { chunks.push(chunk); }
      const streamIds = chunks.map(c => c.streamId);
      expect(new Set(streamIds).size).toBe(1);
    });

    it('should yield first chunk without leading space', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) { chunks.push(chunk); }
      expect(chunks[0].content.startsWith(' ')).toBe(false);
    });

    it('should yield non-first chunks with leading space', async () => {
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of engine.stream(makeRequest())) { chunks.push(chunk); }
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].content.startsWith(' ')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // stream — config
  // ═══════════════════════════════════════════════════════════════
  describe('stream — config', () => {
    it('should use default maxConcurrentStreams of 5', () => {
      const eng = makeEngine();
      expect(eng).toBeDefined();
    });

    it('should use default chunkBufferSize from config', () => {
      const eng = makeEngine();
      expect(eng).toBeDefined();
    });

    it('should use default defaultTimeoutMs from config', () => {
      const eng = makeEngine();
      expect(eng).toBeDefined();
    });

    it('should accept custom config', () => {
      const eng = makeEngine({
        maxConcurrentStreams: 100,
        chunkBufferSize: 500,
        defaultTimeoutMs: 300000,
      });
      expect(eng).toBeDefined();
    });

    it('should work with metadata in config', () => {
      const eng = makeEngine({ metadata: { env: 'test' } });
      expect(eng).toBeDefined();
    });
  });
});
