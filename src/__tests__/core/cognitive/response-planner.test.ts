/**
 * Response Planner Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponsePlanner, DefaultResponsePlannerConfig } from '../../../core/cognitive/response-planner.js';
import { ResponseDecision, IntentType, IntentComplexity, brandIntentId, brandCognitiveSessionId } from '../../../core/cognitive/types.js';

// ─── Helpers ──────────────────────────────────────────────────

function createMockIntent(overrides: Partial<any> = {}): any {
  return Object.freeze({
    id: brandIntentId(crypto.randomUUID()),
    type: IntentType.Question,
    goal: 'test goal',
    priority: 5,
    complexity: IntentComplexity.Simple,
    confidence: 0.8,
    requiredCapabilities: [],
    parameters: {},
    detectedAt: '2024-01-01T00:00:00Z',
    metadata: Object.freeze({}),
    ...overrides,
  });
}

function createMockContext(overrides: Partial<any> = {}): any {
  return Object.freeze({
    sessionId: 'test-session',
    conversationId: 'test-conv',
    turnId: null,
    intent: null,
    identity: null,
    memory: Object.freeze({
      workingEntries: [],
      sessionEntries: [],
      relevantEntries: [{ key: 'test', value: 'data', relevance: 0.9, source: 'memory' }],
      summary: null,
    }),
    knowledge: Object.freeze({
      relevantItems: [{ id: '1', name: 'doc', content: 'content', relevance: 0.8, source: 'knowledge' }],
      namespaces: ['default'],
      totalItems: 1,
    }),
    capabilities: Object.freeze({
      available: ['search', 'calculate'],
      required: [],
      denied: [],
      activePacks: [],
    }),
    policies: Object.freeze({
      maxTokens: 4096,
      allowedProviders: [],
      privacyLevel: 1,
      trustLevel: 1,
      costBudget: 100,
      activePolicies: [],
    }),
    environment: Object.freeze({
      runtimeVersion: '0.4.0',
      sessionId: 'test',
      timezone: 'UTC',
      timestamp: '2024-01-01T00:00:00Z',
    }),
    conversationHistory: Object.freeze({
      turnCount: 5,
      recentMessages: [],
      summary: null,
    }),
    assembledAt: '2024-01-01T00:00:00Z',
    tokenEstimate: 100,
    ...overrides,
  });
}

describe('ResponsePlanner', () => {
  let planner: ResponsePlanner;

  beforeEach(() => {
    planner = new ResponsePlanner();
  });

  // ─── constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates with default config', () => {
      expect(planner).toBeInstanceOf(ResponsePlanner);
    });

    it('accepts custom config', () => {
      const p = new ResponsePlanner({ clarificationThreshold: 0.3 });
      expect(p).toBeInstanceOf(ResponsePlanner);
    });

    it('accepts all config overrides', () => {
      const p = new ResponsePlanner({
        toolInvocationThreshold: 0.5,
        workflowInvocationThreshold: 0.5,
        clarificationThreshold: 0.2,
        escalationThreshold: 0.95,
      });
      expect(p).toBeInstanceOf(ResponsePlanner);
    });
  });

  // ─── plan — Question → Answer ────────────────────────────────

  describe('plan — Question → Answer', () => {
    it('returns Answer decision for Question intent', () => {
      const intent = createMockIntent({ type: IntentType.Question, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });

    it('returns Answer decision for Conversation intent', () => {
      const intent = createMockIntent({ type: IntentType.Conversation, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });

    it('returns Answer for Search intent', () => {
      const intent = createMockIntent({ type: IntentType.Search, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });

    it('returns Answer for Command intent', () => {
      const intent = createMockIntent({ type: IntentType.Command, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });

    it('returns Answer for Planning intent', () => {
      const intent = createMockIntent({ type: IntentType.Planning, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });

    it('returns Answer for System intent', () => {
      const intent = createMockIntent({ type: IntentType.System, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });
  });

  // ─── plan — ToolInvocation → Tool ───────────────────────────

  describe('plan — ToolInvocation → Tool', () => {
    it('returns Tool decision for ToolInvocation intent', () => {
      const intent = createMockIntent({
        type: IntentType.ToolInvocation,
        confidence: 0.9,
        requiredCapabilities: ['search'],
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Tool);
    });

    it('sets targetTool to matching capability', () => {
      const intent = createMockIntent({
        type: IntentType.ToolInvocation,
        confidence: 0.9,
        requiredCapabilities: ['search'],
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.targetTool).toBe('search');
    });

    it('falls through to Answer when no matching capability in context', () => {
      const intent = createMockIntent({
        type: IntentType.ToolInvocation,
        confidence: 0.9,
        requiredCapabilities: ['nonexistent'],
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
      expect(plan.targetTool).toBeUndefined();
    });

    it('sets targetTool to default when no required capabilities', () => {
      const intent = createMockIntent({
        type: IntentType.ToolInvocation,
        confidence: 0.9,
        requiredCapabilities: [],
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.targetTool).toBe('default');
    });

    it('falls through to Answer when confidence < threshold', () => {
      const intent = createMockIntent({
        type: IntentType.ToolInvocation,
        confidence: 0.5,
        requiredCapabilities: ['search'],
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });
  });

  // ─── plan — Workflow → Workflow ───────────────────────────────

  describe('plan — Workflow → Workflow', () => {
    it('returns Workflow decision for Workflow intent', () => {
      const intent = createMockIntent({
        type: IntentType.Workflow,
        confidence: 0.9,
        parameters: { workflowId: 'wf-123' },
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Workflow);
    });

    it('sets targetWorkflow from intent parameters', () => {
      const intent = createMockIntent({
        type: IntentType.Workflow,
        confidence: 0.9,
        parameters: { workflowId: 'wf-123' },
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.targetWorkflow).toBe('wf-123');
    });

    it('falls through when confidence < threshold', () => {
      const intent = createMockIntent({
        type: IntentType.Workflow,
        confidence: 0.5,
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });
  });

  // ─── plan — MemoryRecall → Memory ────────────────────────────

  describe('plan — MemoryRecall → Memory', () => {
    it('returns Memory decision for MemoryRecall with relevant entries', () => {
      const intent = createMockIntent({ type: IntentType.MemoryRecall, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Memory);
    });

    it('sets targetMemory from first relevant entry key', () => {
      const intent = createMockIntent({ type: IntentType.MemoryRecall, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.targetMemory).toBe('test');
    });

    it('falls through to Answer when no relevant entries', () => {
      const intent = createMockIntent({ type: IntentType.MemoryRecall, confidence: 0.8 });
      const context = createMockContext({
        memory: Object.freeze({ workingEntries: [], sessionEntries: [], relevantEntries: [], summary: null }),
      });
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });
  });

  // ─── plan — Clarification ────────────────────────────────────

  describe('plan — Clarification', () => {
    it('returns Clarification when confidence < threshold', () => {
      const intent = createMockIntent({ type: IntentType.Question, confidence: 0.3 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Clarification);
    });

    it('generates clarification questions', () => {
      const intent = createMockIntent({ type: IntentType.Question, confidence: 0.3 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.clarificationQuestions).toBeDefined();
      expect(plan.clarificationQuestions!.length).toBeGreaterThan(0);
    });

    it('clarification questions reference intent goal', () => {
      const intent = createMockIntent({ type: IntentType.Question, confidence: 0.3, goal: 'my goal' });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.clarificationQuestions![0]).toContain('my goal');
    });

    it('does not set targetTool/targetWorkflow/targetMemory', () => {
      const intent = createMockIntent({ type: IntentType.Question, confidence: 0.3 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.targetTool).toBeUndefined();
      expect(plan.targetWorkflow).toBeUndefined();
      expect(plan.targetMemory).toBeUndefined();
    });
  });

  // ─── plan — Escalation ───────────────────────────────────────

  describe('plan — Escalation', () => {
    it('returns Escalation for Critical complexity with low confidence', () => {
      const intent = createMockIntent({
        type: IntentType.Question,
        complexity: IntentComplexity.Critical,
        confidence: 0.7,
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Escalation);
    });

    it('sets escalation reason', () => {
      const intent = createMockIntent({
        type: IntentType.Question,
        complexity: IntentComplexity.Critical,
        confidence: 0.7,
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.escalationReason).toBeDefined();
    });

    it('does not escalate Critical with high confidence', () => {
      const intent = createMockIntent({
        type: IntentType.Question,
        complexity: IntentComplexity.Critical,
        confidence: 0.95,
      });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.decision).toBe(ResponseDecision.Answer);
    });
  });

  // ─── plan — confidence calculation ───────────────────────────

  describe('plan — confidence calculation', () => {
    it('confidence is >= 0', () => {
      const intent = createMockIntent({ confidence: 0.1 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.confidence).toBeGreaterThanOrEqual(0);
    });

    it('confidence is <= 1', () => {
      const intent = createMockIntent({ confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.confidence).toBeLessThanOrEqual(1);
    });

    it('Answer confidence boosted by knowledge', () => {
      const intent = createMockIntent({ type: IntentType.Question, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.confidence).toBeGreaterThan(0.8);
    });

    it('Answer confidence boosted by memory', () => {
      const intent = createMockIntent({ type: IntentType.Question, confidence: 0.8 });
      const context = createMockContext({ knowledge: Object.freeze({ relevantItems: [], namespaces: [], totalItems: 0 }) });
      const plan = planner.plan(intent, context);
      expect(plan.confidence).toBeGreaterThan(0.8);
    });

    it('Tool confidence boosted by capabilities', () => {
      const intent = createMockIntent({ type: IntentType.ToolInvocation, confidence: 0.8, requiredCapabilities: ['search'] });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.confidence).toBeGreaterThan(0.8);
    });
  });

  // ─── plan — reasoning ───────────────────────────────────────

  describe('plan — reasoning', () => {
    it('reasoning is a non-empty string', () => {
      const intent = createMockIntent();
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.reasoning).toBeDefined();
      expect(plan.reasoning.length).toBeGreaterThan(0);
    });

    it('Answer reasoning mentions intent type', () => {
      const intent = createMockIntent({ type: IntentType.Question });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.reasoning).toContain('Question');
    });

    it('Tool reasoning mentions capabilities', () => {
      const intent = createMockIntent({ type: IntentType.ToolInvocation, confidence: 0.9, requiredCapabilities: ['search'] });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.reasoning).toContain('search');
    });

    it('Workflow reasoning mentions goal', () => {
      const intent = createMockIntent({ type: IntentType.Workflow, confidence: 0.9, goal: 'deploy app' });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.reasoning).toContain('deploy app');
    });

    it('Memory reasoning mentions entry count', () => {
      const intent = createMockIntent({ type: IntentType.MemoryRecall, confidence: 0.8 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.reasoning).toContain('1');
    });

    it('Clarification reasoning mentions thresholds', () => {
      const intent = createMockIntent({ type: IntentType.Question, confidence: 0.3 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.reasoning).toContain('0.3');
    });

    it('Escalation reasoning mentions critical', () => {
      const intent = createMockIntent({ type: IntentType.Question, complexity: IntentComplexity.Critical, confidence: 0.7 });
      const context = createMockContext();
      const plan = planner.plan(intent, context);
      expect(plan.reasoning).toContain('Escalation');
    });
  });

  // ─── plan — response plan structure ──────────────────────────

  describe('plan — response plan structure', () => {
    it('plan has id', () => {
      const plan = planner.plan(createMockIntent(), createMockContext());
      expect(plan.id).toBeDefined();
    });

    it('plan has createdAt timestamp', () => {
      const plan = planner.plan(createMockIntent(), createMockContext());
      expect(plan.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('plan metadata includes intentType', () => {
      const intent = createMockIntent({ type: IntentType.Question });
      const plan = planner.plan(intent, createMockContext());
      expect(plan.metadata.intentType).toBe(IntentType.Question);
    });

    it('plan metadata includes intentComplexity', () => {
      const intent = createMockIntent({ complexity: IntentComplexity.Simple });
      const plan = planner.plan(intent, createMockContext());
      expect(plan.metadata.intentComplexity).toBe(IntentComplexity.Simple);
    });

    it('plan metadata is frozen', () => {
      const plan = planner.plan(createMockIntent(), createMockContext());
      expect(Object.isFrozen(plan.metadata)).toBe(true);
    });
  });

  // ─── DefaultResponsePlannerConfig ────────────────────────────

  describe('DefaultResponsePlannerConfig', () => {
    it('has toolInvocationThreshold 0.8', () => {
      expect(DefaultResponsePlannerConfig.toolInvocationThreshold).toBe(0.8);
    });

    it('has workflowInvocationThreshold 0.8', () => {
      expect(DefaultResponsePlannerConfig.workflowInvocationThreshold).toBe(0.8);
    });

    it('has clarificationThreshold 0.5', () => {
      expect(DefaultResponsePlannerConfig.clarificationThreshold).toBe(0.5);
    });

    it('has escalationThreshold 0.9', () => {
      expect(DefaultResponsePlannerConfig.escalationThreshold).toBe(0.9);
    });
  });
});
