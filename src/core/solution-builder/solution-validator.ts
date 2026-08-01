/**
 * Solution Validator Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Validates solution manifests against required categories (Compliance, Security,
 * Privacy, Architecture, Performance, Value). Produces a ValidationReport with
 * per-check verdicts and category scores.
 * Emits ValidationCompletedEvent. If overall verdict is Fail, also emits
 * ValidationFailedEvent.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, ValidationReportId, ValidationReport,
  ValidationCategory, ValidationVerdict, ValidationCheck,
  SolutionManifest,
} from './types.js';
import { brandValidationReportId, ValidationCategory as VCat, ValidationVerdict as VVerdict } from './types.js';
import type { ISolutionValidator } from './contracts.js';
import type { SolutionValidatorConfig } from './types.js';
import { SolutionValidationError } from './errors.js';
import type { ValidationCompletedEvent, ValidationFailedEvent } from './events.js';

/** Validation check definitions per category */
interface CheckDefinition {
  readonly category: ValidationCategory;
  readonly name: string;
  readonly validate: (manifest: SolutionManifest) => { verdict: ValidationVerdict; message: string; details: string | null };
}

const CHECK_DEFINITIONS: readonly CheckDefinition[] = Object.freeze([
  // ── Compliance ──
  Object.freeze({
    category: VCat.Compliance,
    name: 'Regulatory Compliance',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const hasCompliance = m.complianceStatus === VVerdict.Pass || m.complianceStatus === VVerdict.PassWithWarnings;
      return {
        verdict: hasCompliance ? VVerdict.Pass : VVerdict.Fail,
        message: hasCompliance ? 'Solution meets regulatory compliance requirements' : 'Solution does not meet regulatory compliance requirements',
        details: `Compliance status: ${m.complianceStatus}`,
      };
    },
  }),
  Object.freeze({
    category: VCat.Compliance,
    name: 'License Validation',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const hasLicense = m.license && m.license.trim().length > 0;
      return {
        verdict: hasLicense ? VVerdict.Pass : VVerdict.Fail,
        message: hasLicense ? 'Valid license specified' : 'No license specified',
        details: hasLicense ? `License: ${m.license}` : 'A license must be specified for distribution',
      };
    },
  }),

  // ── Security ──
  Object.freeze({
    category: VCat.Security,
    name: 'Security Profile Completeness',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const keys = Object.keys(m.securityProfile);
      const hasProfile = keys.length > 0;
      return {
        verdict: hasProfile ? VVerdict.Pass : VVerdict.Fail,
        message: hasProfile ? 'Security profile is defined' : 'Security profile is empty',
        details: hasProfile ? `${keys.length} security controls defined` : 'Define at least one security control',
      };
    },
  }),
  Object.freeze({
    category: VCat.Security,
    name: 'Digital Signature Verification',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const hasSignature = m.digitalSignature !== null && m.digitalSignature.length > 0;
      return {
        verdict: hasSignature ? VVerdict.Pass : VVerdict.PassWithWarnings,
        message: hasSignature ? 'Digital signature present' : 'No digital signature — recommended for production',
        details: hasSignature ? 'Signature verified' : 'Consider adding a digital signature for integrity verification',
      };
    },
  }),

  // ── Privacy ──
  Object.freeze({
    category: VCat.Privacy,
    name: 'Privacy Profile Completeness',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const keys = Object.keys(m.privacyProfile);
      const hasProfile = keys.length > 0;
      return {
        verdict: hasProfile ? VVerdict.Pass : VVerdict.Fail,
        message: hasProfile ? 'Privacy profile is defined' : 'Privacy profile is empty',
        details: hasProfile ? `${keys.length} privacy controls defined` : 'Define at least one privacy control',
      };
    },
  }),

  // ── Architecture ──
  Object.freeze({
    category: VCat.Architecture,
    name: 'Workflow Package Coverage',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const hasWorkflows = m.workflowPackages.length > 0;
      return {
        verdict: hasWorkflows ? VVerdict.Pass : VVerdict.Fail,
        message: hasWorkflows ? 'Solution has workflow packages' : 'No workflow packages defined',
        details: `${m.workflowPackages.length} workflow package(s) found`,
      };
    },
  }),
  Object.freeze({
    category: VCat.Architecture,
    name: 'Knowledge Package Coverage',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const hasKnowledge = m.knowledgePackages.length > 0;
      return {
        verdict: hasKnowledge ? VVerdict.Pass : VVerdict.PassWithWarnings,
        message: hasKnowledge ? 'Solution has knowledge packages' : 'No knowledge packages — domain context may be limited',
        details: `${m.knowledgePackages.length} knowledge package(s) found`,
      };
    },
  }),
  Object.freeze({
    category: VCat.Architecture,
    name: 'Capability Dependency Integrity',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const hasCapabilities = m.capabilityDependencies.length > 0;
      return {
        verdict: hasCapabilities ? VVerdict.Pass : VVerdict.PassWithWarnings,
        message: hasCapabilities ? 'Capability dependencies defined' : 'No capability dependencies — solution may lack core functionality',
        details: `${m.capabilityDependencies.length} capability dependenc(ies) found`,
      };
    },
  }),

  // ── Performance ──
  Object.freeze({
    category: VCat.Performance,
    name: 'AI Latency Assessment',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      if (!m.aiConfiguration) {
        return { verdict: VVerdict.Skipped, message: 'No AI configuration to assess', details: null };
      }
      const latency = m.aiConfiguration.estimatedLatencyMs;
      const acceptable = latency <= 1500;
      return {
        verdict: acceptable ? VVerdict.Pass : VVerdict.PassWithWarnings,
        message: acceptable ? 'AI latency is within acceptable range' : 'AI latency exceeds recommended threshold',
        details: `Estimated latency: ${latency}ms (threshold: 1500ms)`,
      };
    },
  }),
  Object.freeze({
    category: VCat.Performance,
    name: 'Build Time Efficiency',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const buildTime = m.metrics.buildTimeMs;
      const acceptable = buildTime <= 60_000;
      return {
        verdict: acceptable ? VVerdict.Pass : VVerdict.PassWithWarnings,
        message: acceptable ? 'Build time is efficient' : 'Build time exceeds recommended threshold',
        details: `Build time: ${buildTime}ms (threshold: 60000ms)`,
      };
    },
  }),

  // ── Value ──
  Object.freeze({
    category: VCat.Value,
    name: 'Expected Value Definition',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const hasValue = m.expectedValue && m.expectedValue.trim().length > 0;
      return {
        verdict: hasValue ? VVerdict.Pass : VVerdict.Fail,
        message: hasValue ? 'Expected value is clearly defined' : 'No expected value defined (PHI-007 violation)',
        details: hasValue ? m.expectedValue : 'Solution must define expected value creation',
      };
    },
  }),
  Object.freeze({
    category: VCat.Value,
    name: 'ROI Assessment',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const roi = m.metrics.estimatedROI;
      const positive = roi > 0;
      return {
        verdict: positive ? VVerdict.Pass : VVerdict.PassWithWarnings,
        message: positive ? 'Positive ROI projected' : 'ROI is not positive — review value proposition',
        details: `Estimated ROI: ${roi}%`,
      };
    },
  }),
  Object.freeze({
    category: VCat.Value,
    name: 'KPI Definition',
    validate: (m: SolutionManifest): { verdict: ValidationVerdict; message: string; details: string | null } => {
      const hasKpis = m.kpis.length > 0;
      return {
        verdict: hasKpis ? VVerdict.Pass : VVerdict.PassWithWarnings,
        message: hasKpis ? 'KPIs are defined for value measurement' : 'No KPIs defined — value measurement will be difficult',
        details: `${m.kpis.length} KPI(s) found`,
      };
    },
  }),
]);

export class SolutionValidator implements ISolutionValidator {
  private readonly config: SolutionValidatorConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly reports = new Map<string, ValidationReport>();
  private readonly solutionIndex = new Map<string, ValidationReportId[]>();

  constructor(config: SolutionValidatorConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async validate(solutionId: SolutionId, manifest: SolutionManifest): Promise<ValidationReport> {
    if (this.reports.size >= this.config.maxReports) {
      throw new SolutionValidationError(
        solutionId as string,
        `Maximum validation reports exceeded: ${this.config.maxReports}`,
        { maxReports: this.config.maxReports },
      );
    }

    const now: Timestamp = new Date().toISOString();
    const reportId = brandValidationReportId(crypto.randomUUID());

    // Run checks for each required category
    const checks = this.runChecks(manifest);

    // Compute per-category scores and overall verdict
    const { complianceScore, securityScore, privacyScore, architectureScore, performanceScore, valueScore, overallVerdict } =
      this.computeScores(checks);

    const report: ValidationReport = Object.freeze({
      id: reportId,
      solutionId,
      checks: Object.freeze(checks),
      overallVerdict,
      complianceScore,
      securityScore,
      privacyScore,
      architectureScore,
      performanceScore,
      valueScore,
      validatedAt: now,
      metadata: Object.freeze({
        manifestName: manifest.name,
        manifestVersion: manifest.version,
        totalChecks: checks.length,
      }),
    });

    const key = reportId as string;
    this.reports.set(key, report);

    const existing = this.solutionIndex.get(solutionId as string);
    if (existing) {
      this.solutionIndex.set(solutionId as string, [...existing, reportId]);
    } else {
      this.solutionIndex.set(solutionId as string, [reportId]);
    }

    // Always emit ValidationCompletedEvent
    const completedEvent: ValidationCompletedEvent = Object.freeze({
      eventType: 'solution.validation.completed',
      classification: overallVerdict === VVerdict.Fail ? EventClassification.Error : EventClassification.Info,
      reportId,
      solutionId,
      verdict: overallVerdict,
      complianceScore,
      valueScore,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(completedEvent as unknown as Record<string, unknown>, solutionId as string, 'ValidationReport');

    // If overall Fail, also emit ValidationFailedEvent
    if (overallVerdict === VVerdict.Fail) {
      const failedChecks = checks.filter(c => c.verdict === VVerdict.Fail);
      const reason = failedChecks.map(c => `${c.category}/${c.name}: ${c.message}`).join('; ');

      const failedEvent: ValidationFailedEvent = Object.freeze({
        eventType: 'solution.validation.failed',
        classification: EventClassification.Error,
        reportId,
        solutionId,
        reason,
        timestamp: now,
        metadata: Object.freeze({ failedCheckCount: failedChecks.length }),
      });
      await this.publishEvent(failedEvent as unknown as Record<string, unknown>, solutionId as string, 'ValidationReport');
    }

    return report;
  }

  async getById(id: ValidationReportId): Promise<ValidationReport | null> {
    return this.reports.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<ValidationReport | null> {
    const ids = this.solutionIndex.get(solutionId as string);
    if (!ids || ids.length === 0) return null;
    // Return the most recent report
    const lastId = ids[ids.length - 1];
    return this.reports.get(lastId as string) ?? null;
  }

  async list(filter?: Partial<{ verdict: ValidationVerdict }>): Promise<readonly ValidationReport[]> {
    let results = [...this.reports.values()];
    if (filter?.verdict !== undefined) {
      results = results.filter(r => r.overallVerdict === filter.verdict);
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.reports.size;
  }

  // ─── Validation Logic ────────────────────────────────────────────

  private runChecks(manifest: SolutionManifest): readonly ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    for (const def of CHECK_DEFINITIONS) {
      const result = def.validate(manifest);
      checks.push(Object.freeze({
        category: def.category,
        name: def.name,
        verdict: result.verdict,
        message: result.message,
        details: result.details,
      }));
    }

    // If required categories don't have any checks, add a default Pass
    for (const cat of this.config.requiredCategories) {
      const hasCheck = checks.some(c => c.category === cat);
      if (!hasCheck) {
        checks.push(Object.freeze({
          category: cat,
          name: `${cat} Category Check`,
          verdict: VVerdict.Pass,
          message: `No specific ${cat} checks defined — assumed compliant`,
          details: null,
        }));
      }
    }

    return checks;
  }

  private computeScores(checks: readonly ValidationCheck[]): {
    complianceScore: number;
    securityScore: number;
    privacyScore: number;
    architectureScore: number;
    performanceScore: number;
    valueScore: number;
    overallVerdict: ValidationVerdict;
  } {
    const scoreFor = (cat: ValidationCategory): number => {
      const catChecks = checks.filter(c => c.category === cat);
      if (catChecks.length === 0) return 100;
      let total = 0;
      for (const c of catChecks) {
        switch (c.verdict) {
          case VVerdict.Pass: total += 100; break;
          case VVerdict.PassWithWarnings: total += 75; break;
          case VVerdict.Skipped: total += 50; break;
          case VVerdict.Fail: total += 0; break;
        }
      }
      return Math.round(total / catChecks.length);
    };

    const complianceScore = scoreFor(VCat.Compliance);
    const securityScore = scoreFor(VCat.Security);
    const privacyScore = scoreFor(VCat.Privacy);
    const architectureScore = scoreFor(VCat.Architecture);
    const performanceScore = scoreFor(VCat.Performance);
    const valueScore = scoreFor(VCat.Value);

    // Overall verdict: Fail if any required category has any Fail check
    const hasFail = checks.some(c => c.verdict === VVerdict.Fail);
    const hasOnlyPassOrSkip = checks.every(c => c.verdict === VVerdict.Pass || c.verdict === VVerdict.Skipped);
    const hasWarning = checks.some(c => c.verdict === VVerdict.PassWithWarnings);

    let overallVerdict: ValidationVerdict;
    if (hasFail) {
      overallVerdict = VVerdict.Fail;
    } else if (hasOnlyPassOrSkip) {
      overallVerdict = VVerdict.Pass;
    } else if (hasWarning) {
      overallVerdict = VVerdict.PassWithWarnings;
    } else {
      overallVerdict = VVerdict.Pass;
    }

    return {
      complianceScore, securityScore, privacyScore,
      architectureScore, performanceScore, valueScore,
      overallVerdict,
    };
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
