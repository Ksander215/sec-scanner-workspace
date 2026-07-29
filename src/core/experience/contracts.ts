/**
 * Experience Runtime — Integration Contracts
 * TASK-AIS-004A.000
 *
 * Interface contracts for integrating with other runtimes.
 * Experience Runtime NEVER depends on concrete implementations — only contracts.
 * Conforms to: AL-002 (Boundary by Contract)
 */

import type { Identifier, Timestamp } from '../types/common.js';

// ─── Cognitive Runtime Contract ───────────────────────────────

/** Read-only access to cognitive state for adaptation decisions */
export interface ICognitiveRuntimeAdapter {
  /** Get the current intent classification for a user session */
  readonly getCurrentIntent: (userIdHash: string, sessionId: string) => Promise<{
    readonly intent: string;
    readonly confidence: number;
  } | null>;

  /** Get current conversation context summary */
  readonly getConversationSummary: (userIdHash: string, sessionId: string) => Promise<{
    readonly topic: string;
    readonly complexity: number;
    readonly sentiment: string;
  } | null>;
}

// ─── Identity Runtime Contract ───────────────────────────────

/** Read-only access to identity for user hashing and verification */
export interface IIdentityRuntimeAdapter {
  /** Hash a user identifier for anonymization */
  readonly hashUserId: (userId: Identifier) => Promise<string>;

  /** Verify a user hash is valid */
  readonly verifyUserHash: (userIdHash: string) => Promise<boolean>;

  /** Get active roles/contexts for a user */
  readonly getUserRoles: (userIdHash: string) => Promise<readonly string[]>;
}

// ─── Memory Runtime Contract ─────────────────────────────────

/** Read-only access to memory for observation provenance */
export interface IMemoryRuntimeAdapter {
  /** Retrieve a specific memory entry */
  readonly retrieveMemory: (key: string, userIdHash: string) => Promise<{
    readonly content: unknown;
    readonly timestamp: Timestamp;
    readonly confidence: number;
  } | null>;

  /** Search memories by pattern */
  readonly searchMemories: (pattern: string, userIdHash: string) => Promise<readonly {
    readonly key: string;
    readonly content: unknown;
    readonly timestamp: Timestamp;
  }[]>;
}

// ─── Knowledge Runtime Contract ──────────────────────────────

/** Read-only access to knowledge for domain context */
export interface IKnowledgeRuntimeAdapter {
  /** Get available knowledge domains */
  readonly getDomains: () => Promise<readonly string[]>;

  /** Check if a domain exists */
  readonly hasDomain: (domain: string) => Promise<boolean>;

  /** Get knowledge context for a domain */
  readonly getDomainContext: (domain: string) => Promise<{
    readonly description: string;
    readonly topics: readonly string[];
    readonly complexity: number;
  } | null>;
}

// ─── Workflow Runtime Contract ──────────────────────────────

/** Read-only access to workflow data for recommendations */
export interface IWorkflowRuntimeAdapter {
  /** Get available workflows */
  readonly getAvailableWorkflows: (userIdHash: string) => Promise<readonly {
    readonly workflowId: Identifier;
    readonly name: string;
    readonly description: string;
    readonly usageCount: number;
  }[]>;

  /** Get workflow execution history for a user */
  readonly getWorkflowHistory: (userIdHash: string) => Promise<readonly {
    readonly workflowId: Identifier;
    readonly name: string;
    readonly lastExecuted: Timestamp;
    readonly successCount: number;
    readonly failureCount: number;
  }[]>;
}

// ─── Capability Runtime Contract ─────────────────────────────

/** Read-only access to capabilities for recommendations */
export interface ICapabilityRuntimeAdapter {
  /** Get available capabilities */
  readonly getAvailableCapabilities: (userIdHash: string) => Promise<readonly {
    readonly capabilityId: Identifier;
    readonly name: string;
    readonly description: string;
    readonly category: string;
  }[]>;

  /** Get capabilities used by a user */
  readonly getUsedCapabilities: (userIdHash: string) => Promise<readonly {
    readonly capabilityId: Identifier;
    readonly name: string;
    readonly usageCount: number;
    readonly lastUsed: Timestamp;
  }[]>;
}

// ─── Unified Contract Registry ───────────────────────────────

/** All runtime contracts the Experience Runtime depends on */
export interface IExperienceContracts {
  readonly cognitive?: ICognitiveRuntimeAdapter;
  readonly identity?: IIdentityRuntimeAdapter;
  readonly memory?: IMemoryRuntimeAdapter;
  readonly knowledge?: IKnowledgeRuntimeAdapter;
  readonly workflow?: IWorkflowRuntimeAdapter;
  readonly capability?: ICapabilityRuntimeAdapter;
}
