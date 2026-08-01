/**
 * Compatibility Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { CompatibilityReport, CompatibilityCheck, CompatibilityEngineConfig, CapabilityEntry } from './types.js';
import { brandCompatibilityReportId } from './types.js';
import type { ICompatibilityEngine } from './contracts.js';
import { CapabilityNotFoundError } from './errors.js';
import type { CompatibilityCheckedEvent } from './events.js';
import { CompatibilityDimension, CompatibilityVerdict } from './types.js';

export class CompatibilityEngine implements ICompatibilityEngine {
  private readonly config: CompatibilityEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly reports = new Map<string, CompatibilityReport>();
  private capabilities: readonly CapabilityEntry[] = Object.freeze([]);

  constructor(config: CompatibilityEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setCapabilities(caps: readonly CapabilityEntry[]): void {
    this.capabilities = caps;
  }

  async check(capabilityId: import('./types.js').CapabilityId): Promise<CompatibilityReport> {
    const cap = this.capabilities.find(c => c.id === capabilityId);
    if (!cap) throw new CapabilityNotFoundError(capabilityId as string);
    const now: Timestamp = new Date().toISOString();
    const checks = this.buildChecks(cap);
    const allPassed = checks.every(c => c.passed);
    const hasWarning = checks.some(c => c.warning !== null);
    const verdict = allPassed
      ? (hasWarning ? CompatibilityVerdict.CompatibleWithWarnings : CompatibilityVerdict.Compatible)
      : CompatibilityVerdict.Incompatible;
    const id = brandCompatibilityReportId(crypto.randomUUID());
    const report: CompatibilityReport = Object.freeze({
      id,
      capabilityId,
      version: cap.version,
      verdict,
      checks,
      checkedAt: now,
      metadata: Object.freeze({}),
    });
    this.reports.set(id as string, report);
    const event: CompatibilityCheckedEvent = Object.freeze({
      eventType: 'marketplace.compatibility.checked',
      classification: EventClassification.Result,
      reportId: id,
      capabilityId,
      verdict,
      checkCount: checks.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, capabilityId as string, 'CompatibilityReport');
    return report;
  }

  private buildChecks(cap: CapabilityEntry): readonly CompatibilityCheck[] {
    const checks: CompatibilityCheck[] = [];
    for (const req of cap.compatibilityRequirements) {
      let actual = '*';
      if (req.dimension === CompatibilityDimension.Runtime) actual = this.config.runtimeVersion;
      else if (req.dimension === CompatibilityDimension.Platform) actual = this.config.platformVersion;
      else if (req.dimension === CompatibilityDimension.OS) actual = this.config.osType;
      else if (req.dimension === CompatibilityDimension.AIProvider) actual = this.config.aiProviderVersion;
      const passed = actual === '*' || actual === req.required;
      checks.push(Object.freeze({
        dimension: req.dimension,
        required: req.required,
        actual,
        passed,
        warning: passed ? null : `Requires ${req.dimension} ${req.required}, found ${actual}`,
      }));
    }
    if (checks.length === 0) {
      checks.push(Object.freeze({
        dimension: CompatibilityDimension.Runtime,
        required: this.config.runtimeVersion,
        actual: this.config.runtimeVersion,
        passed: true,
        warning: null,
      }));
    }
    return checks;
  }

  async getReport(id: import('./types.js').CompatibilityReportId): Promise<CompatibilityReport | null> {
    return this.reports.get(id as string) ?? null;
  }

  async getVerdict(capId: import('./types.js').CapabilityId): Promise<CompatibilityVerdict> {
    for (const report of this.reports.values()) {
      if (report.capabilityId === capId) return report.verdict;
    }
    return CompatibilityVerdict.Unknown;
  }

  async checkDimension(capId: import('./types.js').CapabilityId, dimension: CompatibilityDimension): Promise<boolean> {
    for (const report of this.reports.values()) {
      if (report.capabilityId === capId) {
        const check = report.checks.find(c => c.dimension === dimension);
        if (check) return check.passed;
      }
    }
    return true;
  }

  async listReports(filter?: Partial<{ verdict: CompatibilityVerdict }>): Promise<readonly CompatibilityReport[]> {
    let results = [...this.reports.values()];
    if (filter?.verdict !== undefined) {
      results = results.filter(r => r.verdict === filter.verdict);
    }
    return Object.freeze(results);
  }


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
