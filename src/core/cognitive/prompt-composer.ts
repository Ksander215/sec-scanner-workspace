/**
 * Cognitive Runtime — Prompt Composer
 * TASK-AIS-003I.000
 *
 * Creates structured PromptContext objects from CognitiveContext.
 * The PromptContext is NOT a string — it is an object.
 * Conversion to text happens only inside Provider Adapters.
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import type {
  PromptContext,
  PromptIdentity,
  PromptPreferences,
  PromptMemory,
  PromptKnowledge,
  PromptCapabilities,
  PromptPolicies,
  PromptConstraints,
  PromptEnvironment,
  PromptConversation,
  CognitiveContext,
  CognitiveRuntimeConfig,
  PromptId,
  MemoryEntry,
  MemoryRelevantEntry,
  KnowledgeRelevantItem,
} from './types.js';
import { brandPromptId } from './types.js';
import { DefaultCognitiveRuntimeConfig } from './types.js';

/**
 * Configuration for Prompt Composer.
 */
export interface PromptComposerConfig {
  readonly systemInstructions: string;
  readonly maxHistoryMessages: number;
  readonly runtimeConfig: CognitiveRuntimeConfig;
}

/**
 * Default Prompt Composer configuration.
 */
export const DefaultPromptComposerConfig: PromptComposerConfig = {
  systemInstructions: 'You are a helpful AI assistant within the AIS platform.',
  maxHistoryMessages: 50,
  runtimeConfig: DefaultCognitiveRuntimeConfig,
};

/**
 * PromptComposer — creates structured PromptContext objects.
 */
export class PromptComposer {
  private readonly _config: PromptComposerConfig;

  constructor(config?: Partial<PromptComposerConfig>) {
    this._config = { ...DefaultPromptComposerConfig, ...config };
  }

  /**
   * Compose a PromptContext from a CognitiveContext and user message.
   */
  compose(
    cognitiveContext: CognitiveContext,
    userMessage: string,
  ): PromptContext {
    const id: PromptId = brandPromptId(crypto.randomUUID());

    const identity = this.composeIdentity(cognitiveContext);
    const preferences = this.composePreferences(cognitiveContext);
    const memory = this.composeMemory(cognitiveContext);
    const knowledge = this.composeKnowledge(cognitiveContext);
    const capabilities = this.composeCapabilities(cognitiveContext);
    const policies = this.composePolicies(cognitiveContext);
    const constraints = this.composeConstraints(cognitiveContext);
    const environment = this.composeEnvironment(cognitiveContext);
    const conversation = this.composeConversation(cognitiveContext);

    return Object.freeze({
      id,
      identity,
      preferences,
      intent: cognitiveContext.intent,
      memory,
      knowledge,
      capabilities,
      policies,
      constraints,
      environment,
      conversation,
      systemInstructions: this._config.systemInstructions,
      userMessage,
      createdAt: new Date().toISOString(),
      metadata: Object.freeze({
        sessionId: cognitiveContext.sessionId,
        conversationId: cognitiveContext.conversationId,
      }),
    });
  }

  /**
   * Validate a PromptContext for completeness.
   */
  validate(context: PromptContext): { valid: boolean; issues: readonly string[] } {
    const issues: string[] = [];

    if (!context.userMessage.trim()) {
      issues.push('User message is empty');
    }
    if (!context.systemInstructions.trim()) {
      issues.push('System instructions are empty');
    }
    if (context.policies.maxTokens <= 0) {
      issues.push('Max tokens must be positive');
    }

    return { valid: issues.length === 0, issues: Object.freeze(issues) };
  }

  /**
   * Compose identity section.
   */
  private composeIdentity(context: CognitiveContext): PromptIdentity {
    if (context.identity) {
      return Object.freeze({
        identityId: context.identity.identityId,
        name: context.identity.name,
        roles: Object.freeze([...context.identity.roles]),
        permissions: Object.freeze([]),
        preferences: Object.freeze({ ...context.identity.preferences }),
      });
    }

    return Object.freeze({
      identityId: 'anonymous',
      name: 'Anonymous',
      roles: Object.freeze([]),
      permissions: Object.freeze([]),
      preferences: Object.freeze({}),
    });
  }

  /**
   * Compose preferences section.
   */
  private composePreferences(context: CognitiveContext): PromptPreferences {
    const userPrefs = context.identity?.preferences ?? {};
    return Object.freeze({
      language: (userPrefs.language as string) ?? 'en',
      timezone: (userPrefs.timezone as string) ?? 'UTC',
      verbosity: (userPrefs.verbosity as string) ?? 'normal',
      explanationLevel: (userPrefs.explanationLevel as string) ?? 'standard',
      answerStyle: (userPrefs.answerStyle as string) ?? 'professional',
      creativity: (userPrefs.creativity as number) ?? 0.7,
      custom: Object.freeze({}),
    });
  }

  /**
   * Compose memory section.
   */
  private composeMemory(context: CognitiveContext): PromptMemory {
    const workingEntries: MemoryEntry[] = [];
    const sessionEntries: MemoryEntry[] = [...context.memory.sessionEntries];
    const relevantMemories: MemoryRelevantEntry[] = [...context.memory.relevantEntries];

    return Object.freeze({
      workingEntries: Object.freeze(workingEntries),
      sessionEntries: Object.freeze(sessionEntries),
      relevantMemories: Object.freeze(relevantMemories),
      summary: context.memory.summary,
    });
  }

  /**
   * Compose knowledge section.
   */
  private composeKnowledge(context: CognitiveContext): PromptKnowledge {
    const relevantItems: KnowledgeRelevantItem[] = [...context.knowledge.relevantItems];
    const confidence = relevantItems.length > 0
      ? relevantItems.reduce((sum, item) => sum + item.relevance, 0) / relevantItems.length
      : 0;

    return Object.freeze({
      relevantItems: Object.freeze(relevantItems),
      namespaces: Object.freeze([...context.knowledge.namespaces]),
      confidence: Math.round(confidence * 1000) / 1000,
    });
  }

  /**
   * Compose capabilities section.
   */
  private composeCapabilities(context: CognitiveContext): PromptCapabilities {
    return Object.freeze({
      available: Object.freeze([...context.capabilities.available]),
      required: Object.freeze([...context.capabilities.required]),
      denied: Object.freeze([...context.capabilities.denied]),
    });
  }

  /**
   * Compose policies section.
   */
  private composePolicies(context: CognitiveContext): PromptPolicies {
    const cfg = this._config.runtimeConfig;
    return Object.freeze({
      maxTokens: context.policies.maxTokens,
      temperature: cfg.defaultTemperature,
      topP: cfg.defaultTopP,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: Object.freeze([]),
      custom: Object.freeze({}),
    });
  }

  /**
   * Compose constraints section.
   */
  private composeConstraints(_context: CognitiveContext): PromptConstraints {
    return Object.freeze({
      maxOutputTokens: this._config.runtimeConfig.defaultMaxOutputTokens,
      forbiddenTopics: Object.freeze([]),
      requiredTopics: Object.freeze([]),
      formatHints: Object.freeze([]),
    });
  }

  /**
   * Compose environment section.
   */
  private composeEnvironment(context: CognitiveContext): PromptEnvironment {
    return Object.freeze({
      runtimeVersion: context.environment.runtimeVersion,
      sessionId: context.environment.sessionId,
      conversationId: context.conversationId ?? 'none',
      timestamp: context.environment.timestamp,
      timezone: context.environment.timezone,
    });
  }

  /**
   * Compose conversation section.
   */
  private composeConversation(context: CognitiveContext): PromptConversation {
    const recent = context.conversationHistory.recentMessages.slice(-this._config.maxHistoryMessages);
    return Object.freeze({
      turnCount: context.conversationHistory.turnCount,
      recentMessages: Object.freeze(recent),
      summary: context.conversationHistory.summary,
      threadContext: null,
    });
  }
}
