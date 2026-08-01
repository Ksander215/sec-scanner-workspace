/**
 * Capability Selector Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Selects capabilities for a solution based on its blueprint.
 * Analyzes blueprint dependencies and matches to available capabilities.
 * Emits CapabilitySelectedEvent per selection via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, CapabilitySelectionId, CapabilitySelection, SolutionBlueprint,
} from './types.js';
import { brandCapabilitySelectionId } from './types.js';
import type { ICapabilitySelector } from './contracts.js';
import type { CapabilitySelectorConfig } from './types.js';
import type { CapabilitySelectedEvent } from './events.js';

/** Known capability catalog — capability ID to metadata */
interface CapabilityDescriptor {
  readonly id: string;
  readonly name: string;
  readonly keywords: readonly string[];
  readonly category: string;
  readonly required: boolean;
}

/** Built-in capability catalog for matching */
const CAPABILITY_CATALOG: ReadonlyMap<string, CapabilityDescriptor> = new Map<string, CapabilityDescriptor>([
  ['chat-engine', Object.freeze({ id: 'chat-engine', name: 'Chat Engine', keywords: Object.freeze(['chat', 'conversation', 'dialog', 'messaging', 'talk', 'reply', 'respond']), category: 'Communication', required: false })],
  ['reporting', Object.freeze({ id: 'reporting', name: 'Reporting & Analytics', keywords: Object.freeze(['report', 'dashboard', 'analytics', 'visualization', 'chart', 'graph', 'insight', 'metric']), category: 'Analytics', required: false })],
  ['search', Object.freeze({ id: 'search', name: 'Search Engine', keywords: Object.freeze(['search', 'find', 'lookup', 'query', 'discover', 'explore', 'filter']), category: 'Discovery', required: false })],
  ['notifications', Object.freeze({ id: 'notifications', name: 'Notification System', keywords: Object.freeze(['notify', 'alert', 'remind', 'push', 'notification', 'warning', 'alarm']), category: 'Communication', required: false })],
  ['scheduling', Object.freeze({ id: 'scheduling', name: 'Scheduling & Calendar', keywords: Object.freeze(['schedule', 'calendar', 'event', 'meeting', 'appointment', 'reminder', 'deadline']), category: 'Productivity', required: false })],
  ['document-generation', Object.freeze({ id: 'document-generation', name: 'Document Generation', keywords: Object.freeze(['document', 'pdf', 'doc', 'generate', 'create document', 'template', 'format']), category: 'Content', required: false })],
  ['email', Object.freeze({ id: 'email', name: 'Email Integration', keywords: Object.freeze(['email', 'mail', 'smtp', 'inbox', 'send email', 'receive email']), category: 'Communication', required: false })],
  ['file-management', Object.freeze({ id: 'file-management', name: 'File Management', keywords: Object.freeze(['file', 'upload', 'download', 'storage', 'attachment', 'folder', 'document store']), category: 'Infrastructure', required: false })],
  ['workflow-automation', Object.freeze({ id: 'workflow-automation', name: 'Workflow Automation', keywords: Object.freeze(['workflow', 'process', 'automate', 'pipeline', 'orchestration', 'flow', 'trigger']), category: 'Automation', required: false })],
  ['data-integration', Object.freeze({ id: 'data-integration', name: 'Data Integration', keywords: Object.freeze(['integrate', 'sync', 'connect', 'import', 'export', 'api', 'etl', 'data source']), category: 'Infrastructure', required: false })],
  ['knowledge-base', Object.freeze({ id: 'knowledge-base', name: 'Knowledge Base', keywords: Object.freeze(['knowledge', 'wiki', 'faq', 'documentation', 'reference', 'encyclopedia', 'glossary']), category: 'Knowledge', required: false })],
  ['compliance', Object.freeze({ id: 'compliance', name: 'Compliance Framework', keywords: Object.freeze(['compliance', 'regulation', 'audit', 'policy', 'governance', 'standard', 'sox', 'hipaa', 'gdpr']), category: 'Governance', required: false })],
  ['security', Object.freeze({ id: 'security', name: 'Security Module', keywords: Object.freeze(['security', 'auth', 'authentication', 'authorization', 'encrypt', 'ssl', 'tls', 'firewall', 'access control']), category: 'Security', required: true })],
  ['core-events', Object.freeze({ id: 'core-events', name: 'Core Events System', keywords: Object.freeze([]), category: 'Infrastructure', required: true })],
  ['core-runtime', Object.freeze({ id: 'core-runtime', name: 'Core Runtime', keywords: Object.freeze([]), category: 'Infrastructure', required: true })],
]);

export class CapabilitySelector implements ICapabilitySelector {
  private readonly config: CapabilitySelectorConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly selections = new Map<string, CapabilitySelection>();
  private readonly solutionIndex = new Map<string, CapabilitySelectionId[]>();

  constructor(config: CapabilitySelectorConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async select(solutionId: SolutionId, blueprint: SolutionBlueprint): Promise<readonly CapabilitySelection[]> {
    const now: Timestamp = new Date().toISOString();
    const results: CapabilitySelection[] = [];

    // Collect all required capabilities first
    const requiredIds = this.selectRequiredCapabilities(blueprint);

    // Then select optional capabilities based on blueprint analysis
    const optionalIds = this.selectOptionalCapabilities(blueprint, requiredIds);

    // Merge required + optional, respecting maxSelections
    const allIds = [...requiredIds, ...optionalIds].slice(0, this.config.maxSelections);

    for (const capId of allIds) {
      if (results.length >= this.config.maxSelections) break;

      const descriptor = CAPABILITY_CATALOG.get(capId);
      if (!descriptor) continue;

      const selectionId = brandCapabilitySelectionId(crypto.randomUUID());
      const isRequired = requiredIds.includes(capId);
      const reason = this.buildReason(descriptor, isRequired, blueprint);

      const selection: CapabilitySelection = Object.freeze({
        id: selectionId,
        solutionId,
        capabilityId: descriptor.id,
        capabilityName: descriptor.name,
        reason,
        required: isRequired,
        selectedAt: now,
        metadata: Object.freeze({
          category: descriptor.category,
        }),
      });

      const key = selectionId as string;
      this.selections.set(key, selection);

      const existing = this.solutionIndex.get(solutionId as string);
      if (existing) {
        existing.push(selectionId);
      } else {
        this.solutionIndex.set(solutionId as string, [selectionId]);
      }

      results.push(selection);

      // Emit individual selection event
      const event: CapabilitySelectedEvent = Object.freeze({
        eventType: 'solution.capability.selected',
        classification: EventClassification.Info,
        selectionId,
        solutionId,
        capabilityName: descriptor.name,
        required: isRequired,
        timestamp: now,
        metadata: Object.freeze({ capabilityId: descriptor.id, category: descriptor.category }),
      });

      await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'CapabilitySelection');
    }

    return Object.freeze(results);
  }

  async getById(id: CapabilitySelectionId): Promise<CapabilitySelection | null> {
    return this.selections.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<readonly CapabilitySelection[]> {
    const ids = this.solutionIndex.get(solutionId as string);
    if (!ids) return Object.freeze([]);
    const results: CapabilitySelection[] = [];
    for (const id of ids) {
      const sel = this.selections.get(id as string);
      if (sel) results.push(sel);
    }
    return Object.freeze(results);
  }

  async list(): Promise<readonly CapabilitySelection[]> {
    return Object.freeze([...this.selections.values()]);
  }

  async count(): Promise<number> {
    return this.selections.size;
  }

  // ─── Selection Helpers ──────────────────────────────────────────

  private selectRequiredCapabilities(blueprint: SolutionBlueprint): readonly string[] {
    const required: string[] = [];

    // Always include required capabilities
    for (const [id, descriptor] of CAPABILITY_CATALOG) {
      if (descriptor.required) {
        required.push(id);
      }
    }

    // Include explicit capability dependencies from blueprint
    for (const dep of blueprint.capabilityDependencies) {
      const normalized = dep.toLowerCase().trim();
      if (CAPABILITY_CATALOG.has(normalized) && !required.includes(normalized)) {
        required.push(normalized);
      }
    }

    return required;
  }

  private selectOptionalCapabilities(blueprint: SolutionBlueprint, alreadySelected: readonly string[]): readonly string[] {
    const scores = new Map<string, number>();

    // Score each optional capability against blueprint metadata
    const blueprintText = [
      blueprint.name,
      blueprint.description,
      ...blueprint.runtimeDependencies,
      ...blueprint.capabilityDependencies,
    ].join(' ').toLowerCase();

    for (const [id, descriptor] of CAPABILITY_CATALOG) {
      if (descriptor.required) continue;
      if (alreadySelected.includes(id)) continue;

      let score = 0;
      for (const keyword of descriptor.keywords) {
        if (blueprintText.includes(keyword)) {
          score++;
        }
      }
      // Bonus for domain-specific match
      if (descriptor.keywords.length > 0 && score > 0) {
        score += 0.5; // Category match bonus
      }
      if (score > 0) {
        scores.set(id, score);
      }
    }

    // Sort by score descending and return as many as we can
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .filter(([_, score]) => score >= this.config.minReuseTarget)
      .map(([id]) => id);
  }

  private buildReason(descriptor: CapabilityDescriptor, isRequired: boolean, blueprint: SolutionBlueprint): string {
    if (isRequired) {
      return `Required capability: ${descriptor.name} is essential for the solution architecture.`;
    }
    return `Matched to blueprint "${blueprint.name}" based on ${descriptor.category.toLowerCase()} requirements and keyword analysis.`;
  }

  // ─── Event Publishing ────────────────────────────────────────────

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
