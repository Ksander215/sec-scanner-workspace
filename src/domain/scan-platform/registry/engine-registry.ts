/**
 * Scan Platform — Engine Registry
 *
 * Manages registration, lifecycle, and selection of Scan Engines.
 * The Registry knows about engines but does NOT execute scans.
 * Scanning is the Orchestrator's responsibility.
 *
 * Design:
 * - O(1) lookup by ID.
 * - Capability-based selection with caching.
 * - Event emission for observability.
 * - Enable/disable without unregister.
 * - Periodic health checks.
 */

import type { ID, ScanCapability, Timestamp } from '../types/index.ts';
import { EngineHealthStatus } from '../types/index.ts';
import type { ScanEnginePlugin, HealthCheckResult } from '../plugin-api/scan-engine-plugin.ts';
import type { ScanEngineInfo } from '../models/scan-engine-info.ts';
import {
  EngineAlreadyRegisteredError,
  EngineNotFoundError,
  EngineDisabledError,
  NoCapableEngineError,
} from '../errors/scan-errors.ts';

// ─── Registry Entry ────────────────────────────────────────

/**
 * Internal registry entry wrapping a plugin with runtime state.
 */
interface RegistryEntry {
  readonly plugin: ScanEnginePlugin;
  readonly registeredAt: Timestamp;
  enabled: boolean;
  lastHealthCheck: HealthCheckResult | null;
  totalScansExecuted: number;
  totalFindingsProduced: number;
}

// ─── Event Types ───────────────────────────────────────────

export interface RegistryEvent {
  readonly type: 'registered' | 'unregistered' | 'enabled' | 'disabled' | 'health_changed';
  readonly engineId: string;
  readonly timestamp: Timestamp;
  readonly data?: Record<string, unknown>;
}

export type RegistryEventHandler = (event: RegistryEvent) => void;

// ─── Engine Registry ───────────────────────────────────────

/**
 * Central registry for all Scan Engine plugins.
 *
 * Usage:
 *   const registry = new EngineRegistry();
 *   registry.register(myNucleiPlugin);
 *   registry.register(myZapPlugin);
 *
 *   const engines = registry.findByCapabilities(['crawling', 'vulnerability_detection']);
 */
export class EngineRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  private readonly eventHandlers: RegistryEventHandler[] = [];
  private _healthCheckIntervalMs: number;

  constructor(config?: { healthCheckIntervalMs?: number }) {
    this._healthCheckIntervalMs = config?.healthCheckIntervalMs ?? 30_000;
  }

  // ─── Registration ──────────────────────────────────────

  /**
   * Register a new Scan Engine plugin.
   *
   * @throws EngineAlreadyRegisteredError if ID is already taken.
   */
  async register(plugin: ScanEnginePlugin): Promise<void> {
    if (this.entries.has(plugin.id)) {
      throw new EngineAlreadyRegisteredError(plugin.id);
    }

    // Initialize the plugin (may throw — plugin not registered on failure).
    await plugin.initialize();

    const entry: RegistryEntry = {
      plugin,
      registeredAt: new Date().toISOString(),
      enabled: true,
      lastHealthCheck: null,
      totalScansExecuted: 0,
      totalFindingsProduced: 0,
    };

    this.entries.set(plugin.id, entry);
    this.emit({ type: 'registered', engineId: plugin.id });
  }

  /**
   * Unregister an engine.
   * Calls shutdown() on the plugin before removal.
   *
   * @throws EngineNotFoundError if ID not found.
   */
  async unregister(engineId: string): Promise<void> {
    const entry = this.getEntryOrThrow(engineId);

    try {
      await entry.plugin.shutdown();
    } catch {
      // Shutdown errors are logged but don't block unregistration.
    }

    this.entries.delete(engineId);
    this.emit({ type: 'unregistered', engineId });
  }

  // ─── Lookup ────────────────────────────────────────────

  /** Get a plugin by ID. Throws if not found. */
  getPlugin(engineId: string): ScanEnginePlugin {
    return this.getEntryOrThrow(engineId).plugin;
  }

  /** Get plugin info by ID. Throws if not found. */
  getInfo(engineId: string): ScanEngineInfo {
    const entry = this.getEntryOrThrow(engineId);
    return this.entryToInfo(entry);
  }

  /** Get all registered engine IDs. */
  getAllEngineIds(): string[] {
    return Array.from(this.entries.keys());
  }

  /** Get info for all engines. */
  getAllInfo(): ScanEngineInfo[] {
    return Array.from(this.entries.values()).map(e => this.entryToInfo(e));
  }

  /**
   * Find engines that provide ALL of the required capabilities.
   * Returns only enabled engines.
   *
   * @throws NoCapableEngineError if no engine matches.
   */
  findByCapabilities(capabilities: readonly ScanCapability[]): ScanEnginePlugin[] {
    const capSet = new Set(capabilities);
    const matches: ScanEnginePlugin[] = [];

    for (const [, entry] of this.entries) {
      if (!entry.enabled) continue;
      const engineCaps = new Set(entry.plugin.capabilities);
      if (capabilities.every(c => engineCaps.has(c))) {
        matches.push(entry.plugin);
      }
    }

    return matches;
  }

  /**
   * Find best engine for a single capability (returns first match).
   */
  findBestForCapability(capability: ScanCapability): ScanEnginePlugin | undefined {
    for (const [, entry] of this.entries) {
      if (!entry.enabled) continue;
      if (entry.plugin.capabilities.includes(capability)) {
        return entry.plugin;
      }
    }
    return undefined;
  }

  // ─── Enable / Disable ──────────────────────────────────

  /** Enable an engine. */
  enable(engineId: string): void {
    const entry = this.getEntryOrThrow(engineId);
    entry.enabled = true;
    this.emit({ type: 'enabled', engineId });
  }

  /** Disable an engine. */
  disable(engineId: string): void {
    const entry = this.getEntryOrThrow(engineId);
    entry.enabled = false;
    this.emit({ type: 'disabled', engineId });
  }

  /** Check if an engine is enabled. */
  isEnabled(engineId: string): boolean {
    const entry = this.entries.get(engineId);
    return entry?.enabled ?? false;
  }

  // ─── Health Checks ─────────────────────────────────────

  /** Run health check for a single engine. */
  async healthCheck(engineId: string): Promise<HealthCheckResult> {
    const entry = this.getEntryOrThrow(engineId);
    const previousStatus = entry.lastHealthCheck?.status;

    try {
      const result = await entry.plugin.health();
      entry.lastHealthCheck = result;

      if (previousStatus && previousStatus !== result.status) {
        this.emit({
          type: 'health_changed',
          engineId,
          data: { previousStatus, currentStatus: result.status },
        });
      }

      return result;
    } catch (err) {
      const result: HealthCheckResult = {
        engineId,
        status: EngineHealthStatus.Unhealthy,
        latencyMs: 0,
        message: err instanceof Error ? err.message : 'Unknown error',
        checkedAt: new Date().toISOString(),
      };
      entry.lastHealthCheck = result;
      return result;
    }
  }

  /** Run health checks for all engines. Returns map of engineId → result. */
  async healthCheckAll(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    const checks = Array.from(this.entries.keys()).map(async (id) => {
      results.set(id, await this.healthCheck(id));
    });
    await Promise.allSettled(checks);
    return results;
  }

  // ─── Statistics (updated by Orchestrator) ──────────────

  /** Increment scan counter for an engine (called by Orchestrator). */
  recordScanExecuted(engineId: string): void {
    const entry = this.entries.get(engineId);
    if (entry) entry.totalScansExecuted++;
  }

  /** Increment findings counter for an engine (called by Orchestrator). */
  recordFindingsProduced(engineId: string, count: number): void {
    const entry = this.entries.get(engineId);
    if (entry) entry.totalFindingsProduced += count;
  }

  // ─── Observers ─────────────────────────────────────────

  /** Subscribe to registry events. Returns unsubscribe function. */
  onEvent(handler: RegistryEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const idx = this.eventHandlers.indexOf(handler);
      if (idx >= 0) this.eventHandlers.splice(idx, 1);
    };
  }

  // ─── Internals ─────────────────────────────────────────

  private getEntryOrThrow(engineId: string): RegistryEntry {
    const entry = this.entries.get(engineId);
    if (!entry) throw new EngineNotFoundError(engineId);
    return entry;
  }

  private entryToInfo(entry: RegistryEntry): ScanEngineInfo {
    return {
      id: entry.plugin.id,
      name: entry.plugin.name,
      version: entry.plugin.version,
      description: entry.plugin.description,
      capabilities: [...entry.plugin.capabilities],
      healthStatus: entry.lastHealthCheck?.status ?? EngineHealthStatus.Unknown,
      enabled: entry.enabled,
      registeredAt: entry.registeredAt,
      lastHealthCheckAt: entry.lastHealthCheck?.checkedAt ?? null,
      totalScansExecuted: entry.totalScansExecuted,
      totalFindingsProduced: entry.totalFindingsProduced,
    };
  }

  private emit(event: RegistryEvent): void {
    for (const handler of this.eventHandlers) {
      try { handler(event); } catch { /* observer errors don't break registry */ }
    }
  }
}