/**
 * Types Tests — Cognitive Runtime
 * Tests for branded IDs, enum values, and default config.
 */

import { describe, it, expect } from 'vitest';
import {
  CognitiveState,
  IntentType,
  IntentComplexity,
  ResponseDecision,
  MessageRole,
  MessageStatus,
  ConversationState,
  RoutingPolicyType,
  CognitivePolicyType,
  CompressionStrategy,
  ProviderAdapterType,
  CognitiveTraceLevel,
  DefaultCognitiveRuntimeConfig,
  brandCognitiveSessionId,
  brandConversationId,
  brandMessageId,
  brandTurnId,
  brandThreadId,
  brandIntentId,
  brandPromptId,
  brandProviderAdapterId,
  brandModelId,
  brandCognitiveTraceId,
  brandResponsePlanId,
  brandSummaryId,
} from '../../../core/cognitive/types.js';

describe('types — Branded IDs', () => {
  it('brandCognitiveSessionId returns a string', () => {
    const id = brandCognitiveSessionId('sess-123');
    expect(typeof id).toBe('string');
    expect(id).toBe('sess-123');
  });

  it('brandConversationId returns a string', () => {
    const id = brandConversationId('conv-456');
    expect(typeof id).toBe('string');
    expect(id).toBe('conv-456');
  });

  it('brandMessageId returns a string', () => {
    const id = brandMessageId('msg-789');
    expect(typeof id).toBe('string');
    expect(id).toBe('msg-789');
  });

  it('brandTurnId returns a string', () => {
    const id = brandTurnId('turn-abc');
    expect(typeof id).toBe('string');
    expect(id).toBe('turn-abc');
  });

  it('brandThreadId returns a string', () => {
    const id = brandThreadId('thread-def');
    expect(typeof id).toBe('string');
    expect(id).toBe('thread-def');
  });

  it('brandIntentId returns a string', () => {
    const id = brandIntentId('intent-ghi');
    expect(typeof id).toBe('string');
    expect(id).toBe('intent-ghi');
  });

  it('brandPromptId returns a string', () => {
    const id = brandPromptId('prompt-jkl');
    expect(typeof id).toBe('string');
    expect(id).toBe('prompt-jkl');
  });

  it('brandProviderAdapterId returns a string', () => {
    const id = brandProviderAdapterId('adapter-mno');
    expect(typeof id).toBe('string');
    expect(id).toBe('adapter-mno');
  });

  it('brandModelId returns a string', () => {
    const id = brandModelId('model-pqr');
    expect(typeof id).toBe('string');
    expect(id).toBe('model-pqr');
  });

  it('brandCognitiveTraceId returns a string', () => {
    const id = brandCognitiveTraceId('trace-stu');
    expect(typeof id).toBe('string');
    expect(id).toBe('trace-stu');
  });

  it('brandResponsePlanId returns a string', () => {
    const id = brandResponsePlanId('plan-vwx');
    expect(typeof id).toBe('string');
    expect(id).toBe('plan-vwx');
  });

  it('brandSummaryId returns a string', () => {
    const id = brandSummaryId('summary-yz');
    expect(typeof id).toBe('string');
    expect(id).toBe('summary-yz');
  });
});

describe('types — Enums', () => {
  it('CognitiveState has all lifecycle states', () => {
    expect(CognitiveState.Created).toBe('Created');
    expect(CognitiveState.Initialized).toBe('Initialized');
    expect(CognitiveState.Ready).toBe('Ready');
    expect(CognitiveState.Processing).toBe('Processing');
    expect(CognitiveState.Streaming).toBe('Streaming');
    expect(CognitiveState.WaitingTool).toBe('WaitingTool');
    expect(CognitiveState.WaitingWorkflow).toBe('WaitingWorkflow');
    expect(CognitiveState.Completed).toBe('Completed');
    expect(CognitiveState.Disposed).toBe('Disposed');
  });

  it('IntentType has all types', () => {
    expect(IntentType.Question).toBe('Question');
    expect(IntentType.Command).toBe('Command');
    expect(IntentType.Workflow).toBe('Workflow');
    expect(IntentType.ToolInvocation).toBe('ToolInvocation');
    expect(IntentType.Search).toBe('Search');
    expect(IntentType.MemoryRecall).toBe('MemoryRecall');
    expect(IntentType.Planning).toBe('Planning');
    expect(IntentType.Conversation).toBe('Conversation');
    expect(IntentType.System).toBe('System');
  });

  it('IntentComplexity has all levels', () => {
    expect(IntentComplexity.Simple).toBe('Simple');
    expect(IntentComplexity.Moderate).toBe('Moderate');
    expect(IntentComplexity.Complex).toBe('Complex');
    expect(IntentComplexity.Critical).toBe('Critical');
  });

  it('ResponseDecision has all 6 decisions', () => {
    const decisions = Object.values(ResponseDecision);
    expect(decisions).toHaveLength(6);
    expect(ResponseDecision.Answer).toBe('Answer');
    expect(ResponseDecision.Workflow).toBe('Workflow');
    expect(ResponseDecision.Tool).toBe('Tool');
    expect(ResponseDecision.Memory).toBe('Memory');
    expect(ResponseDecision.Clarification).toBe('Clarification');
    expect(ResponseDecision.Escalation).toBe('Escalation');
  });

  it('MessageRole has all roles', () => {
    expect(MessageRole.User).toBe('User');
    expect(MessageRole.Assistant).toBe('Assistant');
    expect(MessageRole.System).toBe('System');
    expect(MessageRole.Tool).toBe('Tool');
  });

  it('MessageStatus has all statuses', () => {
    expect(MessageStatus.Pending).toBe('Pending');
    expect(MessageStatus.Sent).toBe('Sent');
    expect(MessageStatus.Delivered).toBe('Delivered');
    expect(MessageStatus.Failed).toBe('Failed');
    expect(MessageStatus.Cancelled).toBe('Cancelled');
  });

  it('ConversationState has all states', () => {
    expect(ConversationState.Active).toBe('Active');
    expect(ConversationState.Paused).toBe('Paused');
    expect(ConversationState.Archived).toBe('Archived');
    expect(ConversationState.Closed).toBe('Closed');
  });

  it('RoutingPolicyType has all policies', () => {
    expect(RoutingPolicyType.Cost).toBe('Cost');
    expect(RoutingPolicyType.Latency).toBe('Latency');
    expect(RoutingPolicyType.Privacy).toBe('Privacy');
    expect(RoutingPolicyType.Accuracy).toBe('Accuracy');
  });

  it('CognitivePolicyType has all 6 policy types', () => {
    const types = Object.values(CognitivePolicyType);
    expect(types).toHaveLength(6);
    expect(CognitivePolicyType.Privacy).toBe('Privacy');
    expect(CognitivePolicyType.Cost).toBe('Cost');
    expect(CognitivePolicyType.Token).toBe('Token');
    expect(CognitivePolicyType.Trust).toBe('Trust');
    expect(CognitivePolicyType.Capability).toBe('Capability');
    expect(CognitivePolicyType.Conversation).toBe('Conversation');
  });

  it('CompressionStrategy has all strategies', () => {
    expect(CompressionStrategy.Summary).toBe('Summary');
    expect(CompressionStrategy.Truncation).toBe('Truncation');
    expect(CompressionStrategy.SlidingWindow).toBe('SlidingWindow');
    expect(CompressionStrategy.Semantic).toBe('Semantic');
  });

  it('ProviderAdapterType has all 6 types', () => {
    const types = Object.values(ProviderAdapterType);
    expect(types).toHaveLength(6);
    expect(ProviderAdapterType.OpenAI).toBe('OpenAI');
    expect(ProviderAdapterType.Anthropic).toBe('Anthropic');
    expect(ProviderAdapterType.Google).toBe('Google');
    expect(ProviderAdapterType.Ollama).toBe('Ollama');
    expect(ProviderAdapterType.LmStudio).toBe('LmStudio');
    expect(ProviderAdapterType.VLLM).toBe('VLLM');
  });

  it('CognitiveTraceLevel has all levels', () => {
    expect(CognitiveTraceLevel.Debug).toBe('Debug');
    expect(CognitiveTraceLevel.Info).toBe('Info');
    expect(CognitiveTraceLevel.Warn).toBe('Warn');
    expect(CognitiveTraceLevel.Error).toBe('Error');
  });
});

describe('types — DefaultCognitiveRuntimeConfig', () => {
  it('has all required config fields', () => {
    const config = DefaultCognitiveRuntimeConfig;
    expect(config).toHaveProperty('maxTokensPerTurn');
    expect(config).toHaveProperty('maxTurnsPerConversation');
    expect(config).toHaveProperty('maxConversationsPerSession');
    expect(config).toHaveProperty('defaultTemperature');
    expect(config).toHaveProperty('defaultTopP');
    expect(config).toHaveProperty('defaultMaxOutputTokens');
    expect(config).toHaveProperty('compressionThreshold');
    expect(config).toHaveProperty('compressionStrategy');
    expect(config).toHaveProperty('summaryRetentionTurns');
    expect(config).toHaveProperty('defaultProvider');
    expect(config).toHaveProperty('enableStreaming');
    expect(config).toHaveProperty('enableMemoryBridge');
    expect(config).toHaveProperty('enableKnowledgeRetrieval');
    expect(config).toHaveProperty('enableWorkflowInvocation');
    expect(config).toHaveProperty('enableToolInvocation');
    expect(config).toHaveProperty('traceEnabled');
    expect(config).toHaveProperty('metricsEnabled');
    expect(config).toHaveProperty('policies');
    expect(config).toHaveProperty('metadata');
  });

  it('has expected default values', () => {
    expect(DefaultCognitiveRuntimeConfig.maxTokensPerTurn).toBe(4096);
    expect(DefaultCognitiveRuntimeConfig.defaultTemperature).toBe(0.7);
    expect(DefaultCognitiveRuntimeConfig.defaultProvider).toBe('openai');
    expect(DefaultCognitiveRuntimeConfig.policies).toEqual([]);
  });
});
