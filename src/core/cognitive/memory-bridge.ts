/**
 * Cognitive Runtime — Conversation Memory Bridge
 * TASK-AIS-003I.000
 *
 * After each response, updates Memory Runtime and Knowledge Runtime
 * if policy allows. Bridges conversation data into long-term storage.
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import type {
  Conversation,
  Turn,
  CognitiveSessionId,
  MemoryRuntimeContract,
  KnowledgeRuntimeContract,
  Intent,
} from './types.js';
import type { CognitivePolicyResult, CognitivePolicyType } from './types.js';

/**
 * Configuration for Memory Bridge.
 */
export interface MemoryBridgeConfig {
  readonly enabled: boolean;
  readonly autoStoreMemories: boolean;
  readonly autoUpdateKnowledge: boolean;
  readonly minTurnsForMemoryUpdate: number;
  readonly keyPrefix: string;
}

/**
 * Default Memory Bridge configuration.
 */
export const DefaultMemoryBridgeConfig: MemoryBridgeConfig = {
  enabled: true,
  autoStoreMemories: true,
  autoUpdateKnowledge: true,
  minTurnsForMemoryUpdate: 2,
  keyPrefix: 'cognitive:bridge',
};

/**
 * Result of a memory bridge update.
 */
export interface MemoryBridgeResult {
  readonly memoriesStored: number;
  readonly knowledgeUpdated: boolean;
  readonly errors: readonly string[];
}

/**
 * ConversationMemoryBridge — bridges conversation data into Memory/Knowledge runtimes.
 */
export class ConversationMemoryBridge {
  private readonly _config: MemoryBridgeConfig;
  private _memoryContract: MemoryRuntimeContract | null = null;
  private _knowledgeContract: KnowledgeRuntimeContract | null = null;
  private readonly _policyEvaluators: Map<string, (params: Record<string, unknown>) => Promise<CognitivePolicyResult>> = new Map();

  constructor(config?: Partial<MemoryBridgeConfig>) {
    this._config = { ...DefaultMemoryBridgeConfig, ...config };
  }

  /**
   * Register Memory Runtime contract.
   */
  registerMemoryContract(contract: MemoryRuntimeContract): void {
    this._memoryContract = contract;
  }

  /**
   * Register Knowledge Runtime contract.
   */
  registerKnowledgeContract(contract: KnowledgeRuntimeContract): void {
    this._knowledgeContract = contract;
  }

  /**
   * Register a policy evaluator for a specific policy type.
   */
  registerPolicyEvaluator(
    policyType: string,
    evaluator: (params: Record<string, unknown>) => Promise<CognitivePolicyResult>,
  ): void {
    this._policyEvaluators.set(policyType, evaluator);
  }

  /**
   * Bridge conversation data after a turn completes.
   */
  async bridge(params: {
    conversation: Conversation;
    turn: Turn;
    intent: Intent | null;
    sessionId: CognitiveSessionId;
  }): Promise<MemoryBridgeResult> {
    if (!this._config.enabled) {
      return { memoriesStored: 0, knowledgeUpdated: false, errors: Object.freeze([]) };
    }

    const errors: string[] = [];
    let memoriesStored = 0;
    let knowledgeUpdated = false;

    // Check if we should update memory
    if (this._config.autoStoreMemories && this._memoryContract) {
      try {
        const policyResult = await this.evaluatePolicy('Memory', {
          conversationId: params.conversation.id,
          sessionId: params.sessionId,
          turnCount: params.conversation.turns.length,
        });

        if (policyResult.allowed) {
          memoriesStored = await this.storeMemories(params);
        }
      } catch (error) {
        errors.push(`Memory store error: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    // Check if we should update knowledge
    if (this._config.autoUpdateKnowledge && this._knowledgeContract) {
      try {
        const policyResult = await this.evaluatePolicy('Knowledge', {
          conversationId: params.conversation.id,
          sessionId: params.sessionId,
          hasIntent: params.intent !== null,
        });

        if (policyResult.allowed) {
          knowledgeUpdated = await this.updateKnowledge(params);
        }
      } catch (error) {
        errors.push(`Knowledge update error: ${error instanceof Error ? error.message : 'unknown'}`);
      }
    }

    return Object.freeze({
      memoriesStored,
      knowledgeUpdated,
      errors: Object.freeze(errors),
    });
  }

  /**
   * Store relevant conversation data into Memory Runtime.
   */
  private async storeMemories(params: {
    conversation: Conversation;
    turn: Turn;
    intent: Intent | null;
    sessionId: CognitiveSessionId;
  }): Promise<number> {
    if (!this._memoryContract) return 0;

    let count = 0;

    // Store intent if present
    if (params.intent) {
      await this._memoryContract.store(
        `${this._config.keyPrefix}:intent:${params.conversation.id}`,
        {
          type: params.intent.type,
          goal: params.intent.goal,
          confidence: params.intent.confidence,
        },
        { sessionId: params.sessionId },
      );
      count++;
    }

    // Store turn summary
    if (params.turn.messages.length > 0) {
      const lastMessage = params.turn.messages[params.turn.messages.length - 1];
      await this._memoryContract.store(
        `${this._config.keyPrefix}:turn:${params.conversation.id}:${params.turn.number}`,
        {
          role: lastMessage.role,
          contentPreview: lastMessage.content.slice(0, 200),
          tokenCount: lastMessage.tokens.totalTokens,
        },
        { sessionId: params.sessionId },
      );
      count++;
    }

    // Store conversation metadata
    await this._memoryContract.store(
      `${this._config.keyPrefix}:meta:${params.conversation.id}`,
      {
        turnCount: params.conversation.turns.length,
        messageCount: params.conversation.messageCount,
        totalTokens: params.conversation.tokenCount,
        lastActivity: params.conversation.lastActivityAt,
      },
      { sessionId: params.sessionId },
    );
    count++;

    return count;
  }

  /**
   * Update Knowledge Runtime with conversation insights.
   */
  private async updateKnowledge(params: {
    conversation: Conversation;
    turn: Turn;
    intent: Intent | null;
    sessionId: CognitiveSessionId;
  }): Promise<boolean> {
    // Knowledge updates are handled by Knowledge Runtime
    // The bridge signals that an update may be warranted
    return params.intent !== null && params.intent.confidence > 0.8;
  }

  /**
   * Evaluate a policy for the given parameters.
   */
  private async evaluatePolicy(
    policyType: string,
    params: Record<string, unknown>,
  ): Promise<CognitivePolicyResult> {
    const evaluator = this._policyEvaluators.get(policyType);
    if (evaluator) {
      return evaluator(params);
    }

    // Default: allow all
    return {
      allowed: true,
      policyId: 'default',
      policyType: policyType as CognitivePolicyType,
      reason: 'No policy evaluator registered; default allow',
      constraints: Object.freeze({}),
    };
  }
}
