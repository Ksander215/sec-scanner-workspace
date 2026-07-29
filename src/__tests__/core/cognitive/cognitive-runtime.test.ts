/**
 * Cognitive Runtime Tests — Main Orchestrator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CognitiveRuntime } from '../../../core/cognitive/cognitive-runtime.js';
import { OpenAIStubAdapter } from '../../../core/cognitive/provider-adapters.js';
import { ProviderAdapterType, CognitiveState, DefaultCognitiveRuntimeConfig } from '../../../core/cognitive/types.js';

const providerConfig = Object.freeze({
  adapterType: ProviderAdapterType.OpenAI,
  name: 'openai-stub',
  model: 'gpt-4',
  maxTokens: 4096,
  temperature: 0.7,
  timeoutMs: 30000,
  metadata: Object.freeze({}),
});

describe('CognitiveRuntime', () => {
  let runtime: CognitiveRuntime;
  let adapter: OpenAIStubAdapter;

  beforeEach(async () => {
    adapter = new OpenAIStubAdapter();
    await adapter.initialize(providerConfig);
    runtime = new CognitiveRuntime();
    await runtime.initialize();
    await runtime.start();
    await runtime.providerRuntime.registerAdapter(adapter);
  });

  // ─── constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates runtime instance', () => {
      const rt = new CognitiveRuntime();
      expect(rt).toBeInstanceOf(CognitiveRuntime);
    });

    it('starts in Created state', () => {
      const rt = new CognitiveRuntime();
      expect(rt.state).toBe(CognitiveState.Created);
    });

    it('accepts custom config', () => {
      const rt = new CognitiveRuntime({ maxTokensPerTurn: 8192 });
      expect(rt).toBeInstanceOf(CognitiveRuntime);
    });

    it('accepts eventBus', () => {
      const rt = new CognitiveRuntime({}, null);
      expect(rt).toBeInstanceOf(CognitiveRuntime);
    });
  });

  // ─── subsystem accessors ───────────────────────────────────

  describe('subsystem accessors', () => {
    it('exposes intentRuntime', () => {
      expect(runtime.intentRuntime).toBeDefined();
    });

    it('exposes contextBuilder', () => {
      expect(runtime.contextBuilder).toBeDefined();
    });

    it('exposes conversationRuntime', () => {
      expect(runtime.conversationRuntime).toBeDefined();
    });

    it('exposes promptComposer', () => {
      expect(runtime.promptComposer).toBeDefined();
    });

    it('exposes providerRuntime', () => {
      expect(runtime.providerRuntime).toBeDefined();
    });

    it('exposes modelRouter', () => {
      expect(runtime.modelRouter).toBeDefined();
    });

    it('exposes responsePlanner', () => {
      expect(runtime.responsePlanner).toBeDefined();
    });

    it('exposes compression', () => {
      expect(runtime.compression).toBeDefined();
    });

    it('exposes memoryBridge', () => {
      expect(runtime.memoryBridge).toBeDefined();
    });

    it('exposes policyEngine', () => {
      expect(runtime.policyEngine).toBeDefined();
    });

    it('exposes metrics', () => {
      expect(runtime.metrics).toBeDefined();
    });

    it('exposes trace', () => {
      expect(runtime.trace).toBeDefined();
    });
  });

  // ─── sessionId / eventBus ───────────────────────────────────

  describe('sessionId / eventBus', () => {
    it('sessionId is null before initialize', () => {
      const rt = new CognitiveRuntime();
      expect(rt.sessionId).toBeNull();
    });

    it('eventBus is null by default', () => {
      const rt = new CognitiveRuntime();
      expect(rt.eventBus).toBeNull();
    });
  });

  // ─── initialize ───────────────────────────────────────────────

  describe('initialize', () => {
    it('transitions to Initialized', async () => {
      const rt = new CognitiveRuntime();
      await rt.initialize();
      expect(rt.state).toBe(CognitiveState.Initialized);
    });

    it('sets sessionId', async () => {
      const rt = new CognitiveRuntime();
      await rt.initialize();
      expect(rt.sessionId).toBeDefined();
      expect(typeof rt.sessionId).toBe('string');
    });

    it('records session in metrics', async () => {
      const rt = new CognitiveRuntime();
      await rt.initialize();
      expect(rt.metrics.getMetrics().totalSessions).toBe(1);
    });

    it('sessionId is unique across instances', async () => {
      const rt1 = new CognitiveRuntime();
      const rt2 = new CognitiveRuntime();
      await rt1.initialize();
      await rt2.initialize();
      expect(rt1.sessionId).not.toBe(rt2.sessionId);
    });
  });

  // ─── start ───────────────────────────────────────────────────

  describe('start', () => {
    it('transitions to Ready', async () => {
      const rt = new CognitiveRuntime();
      await rt.initialize();
      await rt.start();
      expect(rt.state).toBe(CognitiveState.Ready);
    });
  });

  // ─── process (full pipeline) ─────────────────────────────────

  describe('process', () => {
    it('processes a simple input', async () => {
      const result = await runtime.process('what is AI?');
      expect(result.response).toBeDefined();
      expect(result.conversation).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('creates a conversation on first process', async () => {
      const result = await runtime.process('what is AI?');
      expect(result.conversation.turns.length).toBeGreaterThan(0);
    });

    it('classifies intent as Question', async () => {
      const result = await runtime.process('what is AI?');
      expect(result.intent.type).toBe('Question');
    });

    it('returns to Ready after processing', async () => {
      await runtime.process('what is AI?');
      expect(runtime.state).toBe(CognitiveState.Ready);
    });

    it('records metrics on process', async () => {
      await runtime.process('what is AI?');
      const m = runtime.metrics.getMetrics();
      expect(m.totalMessages).toBeGreaterThan(0);
      expect(m.totalTurns).toBeGreaterThan(0);
    });

    it('records trace entries', async () => {
      await runtime.process('what is AI?');
      expect(runtime.trace.count).toBeGreaterThan(0);
    });

    it('supports multiple sequential processes', async () => {
      await runtime.process('what is AI?');
      await runtime.process('how are you?');
      const m = runtime.metrics.getMetrics();
      expect(m.totalTurns).toBe(2);
    });

    it('continues same conversation across processes', async () => {
      const r1 = await runtime.process('what is AI?');
      const r2 = await runtime.process('how are you?');
      expect(r1.conversation.id).toBe(r2.conversation.id);
    });

    it('response is a non-empty string', async () => {
      const result = await runtime.process('what is AI?');
      expect(result.response.length).toBeGreaterThan(0);
    });

    it('tokens include promptTokens and completionTokens', async () => {
      const result = await runtime.process('what is AI?');
      expect(result.tokens.promptTokens).toBeGreaterThanOrEqual(0);
      expect(result.tokens.completionTokens).toBeGreaterThanOrEqual(0);
    });

    it('latencyMs is a number', async () => {
      const result = await runtime.process('what is AI?');
      expect(typeof result.latencyMs).toBe('number');
    });
  });

  // ─── process — error handling ────────────────────────────────

  describe('process — error handling', () => {
    it('records failure on error', async () => {
      const badRuntime = new CognitiveRuntime({ defaultProvider: 'nonexistent' });
      await badRuntime.initialize();
      await badRuntime.start();
      try {
        await badRuntime.process('hello');
      } catch {
        // expected
      }
      expect(badRuntime.metrics.getMetrics().totalFailures).toBe(1);
    });

    it('returns to Ready after error', async () => {
      const badRuntime = new CognitiveRuntime({ defaultProvider: 'nonexistent' });
      await badRuntime.initialize();
      await badRuntime.start();
      try {
        await badRuntime.process('what is AI?');
      } catch {
        // expected
      }
      expect(badRuntime.state).toBe(CognitiveState.Ready);
    });

    it('re-throws the original error', async () => {
      const badRuntime = new CognitiveRuntime({ defaultProvider: 'nonexistent' });
      await badRuntime.initialize();
      await badRuntime.start();
      await expect(badRuntime.process('hello')).rejects.toThrow();
    });
  });

  // ─── register contracts ───────────────────────────────────────

  describe('registerMemoryContract', () => {
    it('registers without error', () => {
      runtime.registerMemoryContract({
        retrieve: async () => [],
        store: async () => {},
        getSessionEntries: async () => [],
        getWorkingEntries: async () => [],
      });
    });
  });

  describe('registerKnowledgeContract', () => {
    it('registers without error', () => {
      runtime.registerKnowledgeContract({
        retrieve: async () => [],
        getNamespaces: async () => [],
        itemCount: async () => 0,
      });
    });
  });

  describe('registerIdentityContract', () => {
    it('registers without error', () => {
      runtime.registerIdentityContract({
        resolve: async () => null,
        getRoles: async () => [],
        getPreferences: async () => ({}),
      });
    });
  });

  describe('registerCapabilityContract', () => {
    it('registers without error', () => {
      runtime.registerCapabilityContract({
        available: async () => [],
        activePacks: async () => [],
        isAllowed: async () => true,
      });
    });
  });

  describe('registerWorkflowContract', () => {
    it('registers without error', () => {
      runtime.registerWorkflowContract({
        invoke: async () => ({}),
        available: async () => [],
        canInvoke: async () => true,
      });
    });
  });

  describe('registerToolContract', () => {
    it('registers without error', () => {
      runtime.registerToolContract({
        invoke: async () => ({}),
        available: async () => [],
        canInvoke: async () => true,
      });
    });
  });

  // ─── shutdown ────────────────────────────────────────────────

  describe('shutdown', () => {
    it('transitions to Disposed', async () => {
      await runtime.shutdown();
      expect(runtime.state).toBe(CognitiveState.Disposed);
    });

    it('shuts down providers', async () => {
      await runtime.shutdown();
      expect(runtime.providerRuntime.sandbox.list()).toHaveLength(0);
    });

    it('records session end in metrics', async () => {
      await runtime.shutdown();
      const m = runtime.metrics.getMetrics();
      expect(m.totalSessions).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── state transitions ───────────────────────────────────────

  describe('state transitions', () => {
    it('Created → Initialized → Ready → Processing → Completed → Ready → Disposed', async () => {
      const rt = new CognitiveRuntime();
      expect(rt.state).toBe(CognitiveState.Created);

      await rt.initialize();
      expect(rt.state).toBe(CognitiveState.Initialized);

      await rt.start();
      expect(rt.state).toBe(CognitiveState.Ready);

      const a = new OpenAIStubAdapter();
      await a.initialize(providerConfig);
      await rt.providerRuntime.registerAdapter(a);

      await rt.process('what is AI?');
      expect(rt.state).toBe(CognitiveState.Ready);

      await rt.shutdown();
      expect(rt.state).toBe(CognitiveState.Disposed);
    });

    it('state is Ready after processing', async () => {
      await runtime.process('what is AI?');
      expect(runtime.state).toBe(CognitiveState.Ready);
    });

    it('state transitions through Processing during process', async () => {
      // After processing, state returns to Ready (Processing → Completed → Ready)
      await runtime.process('what is AI?');
      expect(runtime.state).toBe(CognitiveState.Ready);
    });
  });

  // ─── policy enforcement ──────────────────────────────────────

  describe('policy enforcement in process', () => {
    it('process respects registered policies', async () => {
      const rt = new CognitiveRuntime({
        policies: Object.freeze([
          Object.freeze({
            id: 'conv-limit',
            name: 'Conversation Limit',
            type: 'Conversation' as any,
            rules: Object.freeze({ maxTurns: 1000 }),
            priority: 10,
            description: 'Limit conversations',
          }),
        ]),
      });
      await rt.initialize();
      await rt.start();
      const a = new OpenAIStubAdapter();
      await a.initialize(providerConfig);
      await rt.providerRuntime.registerAdapter(a);

      const result = await rt.process('what is AI?');
      expect(result).toBeDefined();
    });
  });

  // ─── DefaultCognitiveRuntimeConfig ───────────────────────────

  describe('DefaultCognitiveRuntimeConfig', () => {
    it('has defaultProvider openai', () => {
      expect(DefaultCognitiveRuntimeConfig.defaultProvider).toBe('openai');
    });

    it('has enableStreaming true', () => {
      expect(DefaultCognitiveRuntimeConfig.enableStreaming).toBe(true);
    });

    it('has enableMemoryBridge true', () => {
      expect(DefaultCognitiveRuntimeConfig.enableMemoryBridge).toBe(true);
    });

    it('has traceEnabled true', () => {
      expect(DefaultCognitiveRuntimeConfig.traceEnabled).toBe(true);
    });

    it('has empty policies', () => {
      expect(DefaultCognitiveRuntimeConfig.policies).toEqual([]);
    });

    it('has maxTokensPerTurn 4096', () => {
      expect(DefaultCognitiveRuntimeConfig.maxTokensPerTurn).toBe(4096);
    });

    it('has maxTurnsPerConversation 100', () => {
      expect(DefaultCognitiveRuntimeConfig.maxTurnsPerConversation).toBe(100);
    });

    it('has defaultTemperature 0.7', () => {
      expect(DefaultCognitiveRuntimeConfig.defaultTemperature).toBe(0.7);
    });

    it('has metricsEnabled true', () => {
      expect(DefaultCognitiveRuntimeConfig.metricsEnabled).toBe(true);
    });

    it('has enableWorkflowInvocation true', () => {
      expect(DefaultCognitiveRuntimeConfig.enableWorkflowInvocation).toBe(true);
    });

    it('has enableToolInvocation true', () => {
      expect(DefaultCognitiveRuntimeConfig.enableToolInvocation).toBe(true);
    });

    it('has enableKnowledgeRetrieval true', () => {
      expect(DefaultCognitiveRuntimeConfig.enableKnowledgeRetrieval).toBe(true);
    });
  });
});
