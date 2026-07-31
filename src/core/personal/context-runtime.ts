/**
 * Personal Intelligence Runtime — Context Subsystem
 *
 * Builds a UnifiedContext snapshot from all runtime contracts.
 * Owns only the assembled snapshot; raw data stays in each
 * respective runtime.
 */
import type {
  UnifiedContext,
  ContextMemorySnapshot,
  ContextKnowledgeSnapshot,
  ContextIdentitySnapshot,
  ContextDesktopSnapshot,
  ContextWorkflowSnapshot,
  ContextExperienceSnapshot,
  ContextConversationSnapshot,
} from './types.js';
import type { PersonalRuntimeContracts as Contracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';

type SnapshotKey =
  | 'memory'
  | 'knowledge'
  | 'identity'
  | 'desktop'
  | 'workflow'
  | 'experience'
  | 'conversation';

export class ContextRuntime {
  private contracts: Contracts;
  private lastContext: UnifiedContext | null = null;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  // ── Build ────────────────────────────────────────────────────

  async buildContext(): Promise<UnifiedContext> {
    const userId = this.contracts.identity.getCurrentUserId() ?? 'anonymous';
    const now = new Date().toISOString();

    const memory = this.buildMemorySnapshot();
    const knowledge = await this.buildKnowledgeSnapshot();
    const identity = this.buildIdentitySnapshot(userId);
    const desktop = this.buildDesktopSnapshot();
    const workflow = this.buildWorkflowSnapshot();
    const experience = this.buildExperienceSnapshot();
    const conversation = this.buildConversationSnapshot();

    const context: UnifiedContext = Object.freeze({
      userId,
      timestamp: now,
      memory: Object.freeze(memory),
      knowledge: Object.freeze(knowledge),
      identity: Object.freeze(identity),
      desktop: Object.freeze(desktop),
      workflow: Object.freeze(workflow),
      experience: Object.freeze(experience),
      conversation: Object.freeze(conversation),
    });

    this.lastContext = context;

    // Emit ContextUpdated
    const base = createPersonalEventBase('ContextUpdated', EventClassification.StateChange, userId);
    await this.contracts.platform.publishEvent('ContextUpdated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        userId,
        changedSnapshots: Object.freeze([
          'memory', 'knowledge', 'identity', 'desktop', 'workflow', 'experience', 'conversation',
        ] as const),
        updatedAt: now,
      },
    });

    return context;
  }

  // ── Refresh ──────────────────────────────────────────────────

  async refreshContext(): Promise<UnifiedContext> {
    const userId = this.contracts.identity.getCurrentUserId() ?? 'anonymous';
    const now = new Date().toISOString();

    const memory = this.buildMemorySnapshot();
    const knowledge = await this.buildKnowledgeSnapshot();
    const identity = this.buildIdentitySnapshot(userId);
    const desktop = this.buildDesktopSnapshot();
    const workflow = this.buildWorkflowSnapshot();
    const experience = this.buildExperienceSnapshot();
    const conversation = this.buildConversationSnapshot();

    const context: UnifiedContext = Object.freeze({
      userId,
      timestamp: now,
      memory: Object.freeze(memory),
      knowledge: Object.freeze(knowledge),
      identity: Object.freeze(identity),
      desktop: Object.freeze(desktop),
      workflow: Object.freeze(workflow),
      experience: Object.freeze(experience),
      conversation: Object.freeze(conversation),
    });

    this.lastContext = context;

    // Emit ContextRefreshed
    const base = createPersonalEventBase('ContextRefreshed', EventClassification.Info, userId);
    await this.contracts.platform.publishEvent('ContextRefreshed', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        userId,
        refreshedAt: now,
      },
    });

    return context;
  }

  // ── Accessors ────────────────────────────────────────────────

  getContext(): UnifiedContext | null {
    return this.lastContext;
  }

  getSnapshot(type: string): unknown {
    if (!this.lastContext) return undefined;
    const key = type as SnapshotKey;
    if (key in this.lastContext) {
      return (this.lastContext as unknown as Record<string, unknown>)[key];
    }
    return undefined;
  }

  // ── Snapshot builders ────────────────────────────────────────

  private buildMemorySnapshot(): ContextMemorySnapshot {
    let workingEntries = 0;
    let sessionEntries = 0;
    const recentKeys: string[] = [];

    try {
      const sessionId = this.contracts.cognitive.getCurrentSessionId();
      if (sessionId) {
        sessionEntries = this.contracts.memory.getSessionEntries(sessionId).length;
      }
    } catch {
      // Memory contract may be unavailable
    }

    try {
      workingEntries = this.contracts.memory.getWorkingEntries('current').length;
    } catch {
      // Memory contract may be unavailable
    }

    try {
      const allEntries = this.contracts.memory.query({});
      for (const entry of allEntries) {
        if (typeof entry !== 'object' || entry === null) continue;
        const record = entry as Record<string, unknown>;
        if (typeof record.key === 'string') {
          recentKeys.push(record.key);
        }
      }
    } catch {
      // Memory contract may be unavailable
    }

    return Object.freeze({
      workingEntries,
      sessionEntries,
      recentKeys: Object.freeze(recentKeys.slice(-5)),
    });
  }

  private async buildKnowledgeSnapshot(): Promise<ContextKnowledgeSnapshot> {
    let namespaceCount = 0;
    let itemCount = 0;
    const recentItems: string[] = [];

    try {
      const namespaces = await this.contracts.knowledge.getNamespaces();
      namespaceCount = namespaces.length;
    } catch {
      // Knowledge contract may be unavailable
    }

    try {
      itemCount = await this.contracts.knowledge.getItemCount();
    } catch {
      // Knowledge contract may be unavailable
    }

    try {
      const recent = await this.contracts.knowledge.getRecentItems(5);
      for (const item of recent) {
        if (typeof item !== 'object' || item === null) continue;
        const record = item as Record<string, unknown>;
        const label =
          typeof record.name === 'string' ? record.name :
          typeof record.title === 'string' ? record.title :
          null;
        if (label) recentItems.push(label);
      }
    } catch {
      // Knowledge contract may be unavailable
    }

    return Object.freeze({
      namespaceCount,
      itemCount,
      recentItems: Object.freeze(recentItems),
    });
  }

  private buildIdentitySnapshot(userId: string): ContextIdentitySnapshot {
    const roles = this.contracts.identity.getUserRoles(userId);
    const activePreferences = this.contracts.identity.getUserPreferences(userId);
    let organizationId: string | null = null;

    try {
      const org = this.contracts.identity.resolvePreference(userId, 'organization');
      if (typeof org === 'string') {
        organizationId = org;
      }
    } catch {
      // Preference may not exist
    }

    return Object.freeze({
      roles: Object.freeze([...roles]),
      activePreferences: Object.freeze({ ...activePreferences }),
      organizationId,
    });
  }

  private buildDesktopSnapshot(): ContextDesktopSnapshot {
    return Object.freeze({
      openWindows: this.contracts.desktop.getOpenWindowCount(),
      activeWindow: this.contracts.desktop.getActiveWindow(),
      desktopState: this.contracts.desktop.getDesktopState(),
    });
  }

  private buildWorkflowSnapshot(): ContextWorkflowSnapshot {
    const activeWorkflows = this.contracts.workflow.getActiveWorkflows().length;
    const runningInstances = this.contracts.workflow.getRunningInstances().length;
    const recentCompletions: string[] = [];

    try {
      const completions = this.contracts.workflow.getRecentCompletions(5);
      for (const entry of completions) {
        if (typeof entry !== 'object' || entry === null) continue;
        const record = entry as Record<string, unknown>;
        if (typeof record.id === 'string') {
          recentCompletions.push(record.id);
        }
      }
    } catch {
      // Workflow contract may be unavailable
    }

    return Object.freeze({
      activeWorkflows,
      runningInstances,
      recentCompletions: Object.freeze(recentCompletions),
    });
  }

  private buildExperienceSnapshot(): ContextExperienceSnapshot {
    let adaptationCount = 0;
    let recommendationCount = 0;
    let currentPhase = 'unknown';

    try {
      adaptationCount = this.contracts.experience.getActiveAdaptations().length;
    } catch {
      // Experience contract may be unavailable
    }

    try {
      recommendationCount = this.contracts.experience.getRecommendations().length;
    } catch {
      // Experience contract may be unavailable
    }

    try {
      currentPhase = this.contracts.experience.getCurrentPhase();
    } catch {
      // Experience contract may be unavailable
    }

    return Object.freeze({
      adaptationCount,
      recommendationCount,
      currentPhase,
    });
  }

  private buildConversationSnapshot(): ContextConversationSnapshot {
    let currentIntent: string | null = null;
    let turnCount = 0;
    let sessionId: string | null = null;

    try {
      currentIntent = this.contracts.cognitive.getCurrentIntent();
    } catch {
      // Cognitive contract may be unavailable
    }

    try {
      turnCount = this.contracts.cognitive.getConversationTurnCount();
    } catch {
      // Cognitive contract may be unavailable
    }

    try {
      sessionId = this.contracts.cognitive.getCurrentSessionId();
    } catch {
      // Cognitive contract may be unavailable
    }

    return Object.freeze({
      currentIntent,
      turnCount,
      sessionId,
    });
  }
}
