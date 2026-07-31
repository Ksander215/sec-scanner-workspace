/**
 * Personal Intelligence Runtime — Runtime Contracts
 *
 * Interfaces that PIR uses to integrate with other runtimes (memory,
 * identity, knowledge, workflow, experience, cognitive, capability, desktop,
 * platform). PIR never imports runtime classes directly — it only depends
 * on these contracts.
 */

// ── Identity ──────────────────────────────────────────────────

/** Contract for reading user identity data. */
export interface IdentityContract {
  /** Returns the currently active user identifier, or null if none. */
  getCurrentUserId(): string | null;
  /** Returns role names assigned to the given user. */
  getUserRoles(userId: string): readonly string[];
  /** Returns all preference key-value pairs for the given user. */
  getUserPreferences(userId: string): Readonly<Record<string, unknown>>;
  /** Resolves a single preference key through the hierarchy. */
  resolvePreference(userId: string, key: string): unknown;
}

// ── Memory ────────────────────────────────────────────────────

/** Contract for reading and writing memory entries. */
export interface MemoryContract {
  /** Retrieves a single memory entry by layer and key. */
  retrieve(layer: string, key: string, scope?: string): Promise<unknown>;
  /** Stores a memory entry in the given layer. */
  store(layer: string, key: string, value: unknown, scope?: string): Promise<void>;
  /** Returns entries matching the given filter. */
  query(filter: Record<string, unknown>): readonly unknown[];
  /** Returns all entries belonging to a session. */
  getSessionEntries(sessionId: string): readonly unknown[];
  /** Returns all entries belonging to an execution. */
  getWorkingEntries(executionId: string): readonly unknown[];
}

// ── Knowledge ─────────────────────────────────────────────────

/** Contract for reading knowledge base data. */
export interface KnowledgeContract {
  /** Searches knowledge items by query string. */
  search(query: string): Promise<readonly unknown[]>;
  /** Returns all knowledge namespaces. */
  getNamespaces(): Promise<readonly unknown[]>;
  /** Returns the total count of knowledge items. */
  getItemCount(): Promise<number>;
  /** Returns the most recently created or updated items. */
  getRecentItems(limit?: number): Promise<readonly unknown[]>;
  /** Returns items tagged with any of the given tags. */
  getByTags(tags: readonly string[]): Promise<readonly unknown[]>;
}

// ── Workflow ───────────────────────────────────────────────────

/** Contract for reading workflow state. */
export interface WorkflowContract {
  /** Returns all currently defined workflows. */
  getActiveWorkflows(): readonly unknown[];
  /** Returns all currently executing workflow instances. */
  getRunningInstances(): readonly unknown[];
  /** Returns recently completed workflow instances. */
  getRecentCompletions(limit?: number): readonly unknown[];
  /** Returns all available workflow definitions. */
  getAvailableWorkflows(): readonly unknown[];
}

// ── Experience ─────────────────────────────────────────────────

/** Contract for reading experience and adaptation data. */
export interface ExperienceContract {
  /** Returns all active experience adaptations. */
  getActiveAdaptations(): readonly unknown[];
  /** Returns current experience recommendations. */
  getRecommendations(): readonly unknown[];
  /** Returns the current experience phase label. */
  getCurrentPhase(): string;
  /** Returns detected behavior patterns. */
  getBehaviorPatterns(): readonly unknown[];
}

// ── Cognitive ──────────────────────────────────────────────────

/** Contract for cognitive/conversation operations. */
export interface CognitiveContract {
  /** Returns the inferred intent of the current conversation turn. */
  getCurrentIntent(): string | null;
  /** Returns the number of turns in the current session. */
  getConversationTurnCount(): number;
  /** Returns the current conversation session identifier. */
  getCurrentSessionId(): string | null;
  /** Returns a textual summary of the current conversation. */
  getConversationSummary(): Promise<string | null>;
}

// ── Capability ─────────────────────────────────────────────────

/** Contract for querying available capabilities. */
export interface CapabilityContract {
  /** Returns all currently active capability packs. */
  getActivePacks(): readonly unknown[];
  /** Returns names of all available capabilities. */
  getAvailableCapabilities(): readonly string[];
}

// ── Desktop ────────────────────────────────────────────────────

/** Contract for reading desktop/window state. */
export interface DesktopContract {
  /** Returns the number of currently open windows. */
  getOpenWindowCount(): number;
  /** Returns the title of the focused window, or null. */
  getActiveWindow(): string | null;
  /** Returns a serialized desktop state descriptor. */
  getDesktopState(): string;
  /** Returns the number of registered subsystems. */
  getSubsystemCount(): number;
}

// ── Platform ───────────────────────────────────────────────────

/** Contract for platform-level services. */
export interface PlatformContract {
  /** Publishes an event through the platform event bus. */
  publishEvent(type: string, payload: unknown): Promise<void>;
  /** Retrieves a configuration value by key. */
  getConfiguration(key: string): unknown;
  /** Returns the current platform health status. */
  getHealth(): Promise<unknown>;
}

// ── Bundle ─────────────────────────────────────────────────────

/** All runtime contracts bundled into a single object. */
export interface PersonalRuntimeContracts {
  /** Identity runtime contract */
  readonly identity: IdentityContract;
  /** Memory runtime contract */
  readonly memory: MemoryContract;
  /** Knowledge runtime contract */
  readonly knowledge: KnowledgeContract;
  /** Workflow runtime contract */
  readonly workflow: WorkflowContract;
  /** Experience runtime contract */
  readonly experience: ExperienceContract;
  /** Cognitive runtime contract */
  readonly cognitive: CognitiveContract;
  /** Capability runtime contract */
  readonly capability: CapabilityContract;
  /** Desktop runtime contract */
  readonly desktop: DesktopContract;
  /** Platform runtime contract */
  readonly platform: PlatformContract;
}
