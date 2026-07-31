/**
 * Personal Intelligence Capability Pack — Runtime Contracts
 * TASK-AIS-007A.000
 *
 * Interface contracts for integrating with the 9 platform runtimes.
 * The pack NEVER depends on concrete implementations — only these contracts.
 * Conforms to: AL-002 (Boundary by Contract)
 */

// ── Identity Runtime Contract ──────────────────────────────────

/** Contract for reading user identity data. */
export interface IdentityContract {
  getCurrentUserId(): string | null;
  getUserRoles(userId: string): readonly string[];
  getUserPreferences(userId: string): Readonly<Record<string, unknown>>;
  resolvePreference(userId: string, key: string): unknown;
}

// ── Memory Runtime Contract ────────────────────────────────────

/** Contract for reading and writing memory entries. */
export interface MemoryContract {
  retrieve(layer: string, key: string, scope?: string): Promise<unknown>;
  store(layer: string, key: string, value: unknown, scope?: string): Promise<void>;
  query(filter: Record<string, unknown>): readonly unknown[];
  getSessionEntries(sessionId: string): readonly unknown[];
  getWorkingEntries(executionId: string): readonly unknown[];
}

// ── Knowledge Runtime Contract ─────────────────────────────────

/** Contract for reading knowledge base data. */
export interface KnowledgeContract {
  search(query: string): Promise<readonly unknown[]>;
  getNamespaces(): Promise<readonly unknown[]>;
  getItemCount(): Promise<number>;
  getRecentItems(limit?: number): Promise<readonly unknown[]>;
  getByTags(tags: readonly string[]): Promise<readonly unknown[]>;
}

// ── Workflow Runtime Contract ──────────────────────────────────

/** Contract for reading workflow state. */
export interface WorkflowContract {
  getActiveWorkflows(): readonly unknown[];
  getRunningInstances(): readonly unknown[];
  getRecentCompletions(limit?: number): readonly unknown[];
  getAvailableWorkflows(): readonly unknown[];
}

// ── Cognitive Runtime Contract ─────────────────────────────────

/** Contract for cognitive/conversation operations. */
export interface CognitiveContract {
  getCurrentIntent(): string | null;
  getConversationTurnCount(): number;
  getCurrentSessionId(): string | null;
  getConversationSummary(): Promise<string | null>;
}

// ── Personal Runtime Contract ──────────────────────────────────

/** Contract for reading personal intelligence data. */
export interface PersonalContract {
  getGoals(): readonly unknown[];
  getActiveGoals(): readonly unknown[];
  getRecommendations(): readonly unknown[];
  getHabits(): readonly unknown[];
  getReflections(): readonly unknown[];
  getDecisions(): readonly unknown[];
  getAttentionState(): string;
}

// ── AI Provider Runtime Contract ───────────────────────────────

/** Contract for AI inference operations. */
export interface AIProviderContract {
  complete(prompt: string, options?: Record<string, unknown>): Promise<string>;
  embed(text: string): Promise<number[]>;
  isAvailable(): boolean;
}

// ── Experience Runtime Contract ────────────────────────────────

/** Contract for reading experience and adaptation data. */
export interface ExperienceContract {
  getActiveAdaptations(): readonly unknown[];
  getRecommendations(): readonly unknown[];
  getCurrentPhase(): string;
  getBehaviorPatterns(): readonly unknown[];
}

// ── Platform Runtime Contract ──────────────────────────────────

/** Contract for platform-level services. */
export interface PlatformContract {
  publishEvent(type: string, payload: unknown): Promise<void>;
  getConfiguration(key: string): unknown;
  getHealth(): Promise<unknown>;
}

// ── Bundle ─────────────────────────────────────────────────────

/** All runtime contracts bundled into a single object. */
export interface PersonalIntelligenceContracts {
  readonly identity: IdentityContract;
  readonly memory: MemoryContract;
  readonly knowledge: KnowledgeContract;
  readonly workflow: WorkflowContract;
  readonly cognitive: CognitiveContract;
  readonly personal: PersonalContract;
  readonly aiProvider: AIProviderContract;
  readonly experience: ExperienceContract;
  readonly platform: PlatformContract;
}
