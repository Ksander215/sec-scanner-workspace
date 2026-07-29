/**
 * Cognitive Runtime — Domain Events
 * TASK-AIS-003I.000
 *
 * Events published by the Cognitive Runtime following ADR-002 (Event Bus).
 * All events extend DomainEventBase and carry typed payloads.
 * INV-012: No domain event without a classification.
 *
 * Conforms to: ADR-002 (Event Bus), ARC-001.001 FP-07
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';

// ─── ConversationStarted ─────────────────────────────────────
export interface ConversationStarted extends DomainEventBase {
  readonly eventType: 'ConversationStarted';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly conversationId: string;
    readonly sessionId: string;
    readonly startedAt: Timestamp;
  };
}

// ─── ConversationEnded ─────────────────────────────────────────
export interface ConversationEnded extends DomainEventBase {
  readonly eventType: 'ConversationEnded';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly conversationId: string;
    readonly sessionId: string;
    readonly reason: string;
    readonly turnCount: number;
    readonly totalTokens: number;
    readonly endedAt: Timestamp;
  };
}

// ─── PromptBuilt ──────────────────────────────────────────────
export interface PromptBuilt extends DomainEventBase {
  readonly eventType: 'PromptBuilt';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly promptId: string;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly estimatedTokens: number;
    readonly hasMemory: boolean;
    readonly hasKnowledge: boolean;
    readonly builtAt: Timestamp;
  };
}

// ─── ContextBuilt ─────────────────────────────────────────────
export interface ContextBuilt extends DomainEventBase {
  readonly eventType: 'ContextBuilt';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly sessionId: string;
    readonly conversationId: string | null;
    readonly turnId: string | null;
    readonly tokenEstimate: number;
    readonly hasIntent: boolean;
    readonly hasIdentity: boolean;
    readonly hasMemory: boolean;
    readonly hasKnowledge: boolean;
    readonly builtAt: Timestamp;
  };
}

// ─── ProviderSelected ─────────────────────────────────────────
export interface ProviderSelected extends DomainEventBase {
  readonly eventType: 'ProviderSelected';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly providerName: string;
    readonly adapterType: string;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly selectedAt: Timestamp;
  };
}

// ─── ModelSelected ─────────────────────────────────────────────
export interface ModelSelected extends DomainEventBase {
  readonly eventType: 'ModelSelected';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly modelId: string;
    readonly modelName: string;
    readonly providerName: string;
    readonly routingPolicies: readonly string[];
    readonly conversationId: string;
    readonly selectedAt: Timestamp;
  };
}

// ─── CompletionStarted ────────────────────────────────────────
export interface CompletionStarted extends DomainEventBase {
  readonly eventType: 'CompletionStarted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly providerName: string;
    readonly modelName: string;
    readonly promptTokens: number;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly startedAt: Timestamp;
  };
}

// ─── CompletionFinished ───────────────────────────────────────
export interface CompletionFinished extends DomainEventBase {
  readonly eventType: 'CompletionFinished';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly providerName: string;
    readonly modelName: string;
    readonly content: string;
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
    readonly latencyMs: number;
    readonly finishReason: string;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly finishedAt: Timestamp;
  };
}

// ─── StreamStarted ─────────────────────────────────────────────
export interface StreamStarted extends DomainEventBase {
  readonly eventType: 'StreamStarted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly providerName: string;
    readonly modelName: string;
    readonly promptTokens: number;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly startedAt: Timestamp;
  };
}

// ─── StreamFinished ────────────────────────────────────────────
export interface StreamFinished extends DomainEventBase {
  readonly eventType: 'StreamFinished';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly providerName: string;
    readonly modelName: string;
    readonly totalChunks: number;
    readonly totalTokens: number;
    readonly totalLatencyMs: number;
    readonly finishReason: string;
    readonly conversationId: string;
    readonly finishedAt: Timestamp;
  };
}

// ─── ToolRequested ──────────────────────────────────────────────
export interface ToolRequested extends DomainEventBase {
  readonly eventType: 'ToolRequested';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly toolName: string;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly requestReason: string;
    readonly requestedAt: Timestamp;
  };
}

// ─── WorkflowRequested ─────────────────────────────────────────
export interface WorkflowRequested extends DomainEventBase {
  readonly eventType: 'WorkflowRequested';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly workflowId: string;
    readonly workflowName: string;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly requestReason: string;
    readonly requestedAt: Timestamp;
  };
}

// ─── MemoryUpdated ─────────────────────────────────────────────
export interface MemoryUpdated extends DomainEventBase {
  readonly eventType: 'MemoryUpdated';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly memoryType: string;
    readonly keys: readonly string[];
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly updatedAt: Timestamp;
  };
}

// ─── KnowledgeUpdated ──────────────────────────────────────────
export interface KnowledgeUpdated extends DomainEventBase {
  readonly eventType: 'KnowledgeUpdated';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly operation: string;
    readonly itemCount: number;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly updatedAt: Timestamp;
  };
}

// ─── SummaryCreated ────────────────────────────────────────────
export interface SummaryCreated extends DomainEventBase {
  readonly eventType: 'SummaryCreated';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly summaryId: string;
    readonly conversationId: string;
    readonly turnRangeStart: number;
    readonly turnRangeEnd: number;
    readonly originalTokens: number;
    readonly compressedTokens: number;
    readonly compressionRatio: number;
    readonly strategy: string;
    readonly createdAt: Timestamp;
  };
}

// ─── IntentDetected ─────────────────────────────────────────────
export interface IntentDetected extends DomainEventBase {
  readonly eventType: 'IntentDetected';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly intentId: string;
    readonly intentType: string;
    readonly goal: string;
    readonly confidence: number;
    readonly complexity: string;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly detectedAt: Timestamp;
  };
}

// ─── ResponsePlanned ────────────────────────────────────────────
export interface ResponsePlanned extends DomainEventBase {
  readonly eventType: 'ResponsePlanned';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly planId: string;
    readonly decision: string;
    readonly confidence: number;
    readonly conversationId: string;
    readonly turnNumber: number;
    readonly plannedAt: Timestamp;
  };
}

// ─── CognitiveError ─────────────────────────────────────────────
export interface CognitiveErrorEvent extends DomainEventBase {
  readonly eventType: 'CognitiveError';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly sessionId: string;
    readonly conversationId: string | null;
    readonly retryable: boolean;
    readonly occurredAt: Timestamp;
  };
}

// ─── Union type ────────────────────────────────────────────────
export type CognitiveEvent =
  | ConversationStarted
  | ConversationEnded
  | PromptBuilt
  | ContextBuilt
  | ProviderSelected
  | ModelSelected
  | CompletionStarted
  | CompletionFinished
  | StreamStarted
  | StreamFinished
  | ToolRequested
  | WorkflowRequested
  | MemoryUpdated
  | KnowledgeUpdated
  | SummaryCreated
  | IntentDetected
  | ResponsePlanned
  | CognitiveErrorEvent;

/**
 * Create a cognitive event base helper.
 */
export function createCognitiveEventBase(
  eventType: string,
  classification: EventClassification,
  aggregateId: string,
): {
  eventId: string;
  eventType: string;
  classification: EventClassification;
  timestamp: string;
  aggregateId: string;
  aggregateType: string;
  version: string;
} {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    classification,
    timestamp: new Date().toISOString(),
    aggregateId,
    aggregateType: 'Cognitive',
    version: '1.0.0',
  };
}
