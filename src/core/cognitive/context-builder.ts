/**
 * Cognitive Runtime — Context Builder
 * TASK-AIS-003I.000
 *
 * Assembles a unified, immutable CognitiveContext from all runtime sources.
 * Sources: Identity, Memory, Knowledge, Workflow, Execution, Capability.
 *
 * Conforms to: ARC-001.001, DOM-002.000, ADR-002
 */

import type {
  CognitiveContext,
  CognitiveSessionId,
  ConversationId,
  TurnId,
  Intent,
  MemoryEntry,
  MemoryRelevantEntry,
  KnowledgeRelevantItem,
  PromptMessageEntry,
  CognitiveIdentityContext,
  CognitiveMemoryContext,
  CognitiveKnowledgeContext,
  CognitiveCapabilitiesContext,
  CognitivePoliciesContext,
  CognitiveEnvironmentContext,
  CognitiveConversationHistory,
  Timestamp,
  SemVer,
} from './types.js';
import type {
  MemoryRuntimeContract,
  KnowledgeRuntimeContract,
  IdentityRuntimeContract,
  CapabilityRuntimeContract,
} from './types.js';

/**
 * Configuration for Context Builder.
 */
export interface ContextBuilderConfig {
  readonly maxMemoryEntries: number;
  readonly maxKnowledgeItems: number;
  readonly maxConversationHistory: number;
  readonly runtimeVersion: SemVer;
}

/**
 * Default Context Builder configuration.
 */
export const DefaultContextBuilderConfig: ContextBuilderConfig = {
  maxMemoryEntries: 20,
  maxKnowledgeItems: 10,
  maxConversationHistory: 50,
  runtimeVersion: '0.4.0',
};

/**
 * ContextBuilder — assembles CognitiveContext from all runtime sources.
 */
export class ContextBuilder {
  private readonly _config: ContextBuilderConfig;
  private _memoryContract: MemoryRuntimeContract | null = null;
  private _knowledgeContract: KnowledgeRuntimeContract | null = null;
  private _identityContract: IdentityRuntimeContract | null = null;
  private _capabilityContract: CapabilityRuntimeContract | null = null;

  constructor(config?: Partial<ContextBuilderConfig>) {
    this._config = { ...DefaultContextBuilderConfig, ...config };
  }

  /**
   * Register runtime integration contracts.
   */
  registerMemoryContract(contract: MemoryRuntimeContract): void {
    this._memoryContract = contract;
  }

  registerKnowledgeContract(contract: KnowledgeRuntimeContract): void {
    this._knowledgeContract = contract;
  }

  registerIdentityContract(contract: IdentityRuntimeContract): void {
    this._identityContract = contract;
  }

  registerCapabilityContract(contract: CapabilityRuntimeContract): void {
    this._capabilityContract = contract;
  }

  /**
   * Build a complete CognitiveContext.
   */
  async build(params: {
    sessionId: CognitiveSessionId;
    conversationId: ConversationId | null;
    turnId: TurnId | null;
    intent: Intent | null;
    userMessage: string;
    conversationHistory: readonly PromptMessageEntry[];
    conversationSummary: string | null;
    timezone: string;
  }): Promise<CognitiveContext> {
    const identity = await this.resolveIdentity(params.sessionId);
    const memory = await this.resolveMemory(params.userMessage, params.sessionId);
    const knowledge = await this.resolveKnowledge(params.userMessage);
    const capabilities = await this.resolveCapabilities();
    const policies = this.resolvePolicies();
    const environment = this.resolveEnvironment(params.sessionId, params.timezone);
    const conversationHistory = this.resolveConversationHistory(
      params.conversationHistory,
      params.conversationSummary,
    );

    const context: CognitiveContext = Object.freeze({
      sessionId: params.sessionId,
      conversationId: params.conversationId,
      turnId: params.turnId,
      intent: params.intent,
      identity,
      memory,
      knowledge,
      capabilities,
      policies,
      environment,
      conversationHistory,
      assembledAt: new Date().toISOString(),
      tokenEstimate: this.estimateContextTokens(),
    });

    return context;
  }

  /**
   * Resolve identity context from Identity Runtime.
   */
  private async resolveIdentity(sessionId: string): Promise<CognitiveIdentityContext | null> {
    if (!this._identityContract) return null;
    try {
      return await this._identityContract.resolve(sessionId);
    } catch {
      return null;
    }
  }

  /**
   * Resolve memory context from Memory Runtime.
   */
  private async resolveMemory(userMessage: string, sessionId: string): Promise<CognitiveMemoryContext> {
    const workingEntries: MemoryEntry[] = [];
    const sessionEntries: MemoryEntry[] = [];
    const relevantEntries: MemoryRelevantEntry[] = [];
    let summary: string | null = null;

    if (this._memoryContract) {
      try {
        const relevant = await this._memoryContract.retrieve(userMessage, this._config.maxMemoryEntries);
        relevantEntries.push(...relevant);

        const sessionEntriesResult = await this._memoryContract.getSessionEntries(sessionId);
        sessionEntries.push(...sessionEntriesResult.slice(0, this._config.maxMemoryEntries));
      } catch {
        // Memory retrieval failures are non-fatal
      }
    }

    return Object.freeze({
      workingEntries: Object.freeze(workingEntries),
      sessionEntries: Object.freeze(sessionEntries),
      relevantEntries: Object.freeze(relevantEntries),
      summary,
    });
  }

  /**
   * Resolve knowledge context from Knowledge Runtime.
   */
  private async resolveKnowledge(userMessage: string): Promise<CognitiveKnowledgeContext> {
    const relevantItems: KnowledgeRelevantItem[] = [];
    const namespaces: string[] = [];
    let totalItems = 0;

    if (this._knowledgeContract) {
      try {
        const items = await this._knowledgeContract.retrieve(userMessage, this._config.maxKnowledgeItems);
        relevantItems.push(...items);

        const ns = await this._knowledgeContract.getNamespaces();
        namespaces.push(...ns);

        totalItems = await this._knowledgeContract.itemCount();
      } catch {
        // Knowledge retrieval failures are non-fatal
      }
    }

    return Object.freeze({
      relevantItems: Object.freeze(relevantItems),
      namespaces: Object.freeze(namespaces),
      totalItems,
    });
  }

  /**
   * Resolve capabilities context from Capability Runtime.
   */
  private async resolveCapabilities(): Promise<CognitiveCapabilitiesContext> {
    const available: string[] = [];
    const activePacks: string[] = [];

    if (this._capabilityContract) {
      try {
        const caps = await this._capabilityContract.available();
        available.push(...caps);

        const packs = await this._capabilityContract.activePacks();
        activePacks.push(...packs);
      } catch {
        // Capability resolution failures are non-fatal
      }
    }

    return Object.freeze({
      available: Object.freeze(available),
      required: Object.freeze([]),
      denied: Object.freeze([]),
      activePacks: Object.freeze(activePacks),
    });
  }

  /**
   * Resolve policies context.
   */
  private resolvePolicies(): CognitivePoliciesContext {
    return Object.freeze({
      maxTokens: 4096,
      allowedProviders: Object.freeze([]),
      privacyLevel: 1,
      trustLevel: 1,
      costBudget: 100,
      activePolicies: Object.freeze([]),
    });
  }

  /**
   * Resolve environment context.
   */
  private resolveEnvironment(sessionId: string, timezone: string): CognitiveEnvironmentContext {
    return Object.freeze({
      runtimeVersion: this._config.runtimeVersion,
      sessionId,
      timezone,
      timestamp: new Date().toISOString() as Timestamp,
    });
  }

  /**
   * Resolve conversation history.
   */
  private resolveConversationHistory(
    messages: readonly PromptMessageEntry[],
    summary: string | null,
  ): CognitiveConversationHistory {
    const recent = messages.slice(-this._config.maxConversationHistory);
    return Object.freeze({
      turnCount: messages.length,
      recentMessages: Object.freeze(recent),
      summary,
    });
  }

  /**
   * Rough token estimation for a context.
   */
  private estimateContextTokens(): number {
    return 100; // Base estimate; real calculation happens in provider
  }
}
