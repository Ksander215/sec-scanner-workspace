/**
 * Solution Optimizer Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Analyzes solution manifests and generates optimization suggestions across
 * six dimensions: Cost, Speed, Quality, UX, Constraints, and ROI.
 * Produces an OptimizationReport with before/after scores and actionable suggestions.
 * Emits OptimizationCompletedEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, OptimizationReportId, OptimizationReport,
  OptimizationSuggestion, SolutionManifest,
} from './types.js';
import { brandOptimizationReportId, OptimizationDimension as ODim } from './types.js';
import type { ISolutionOptimizer } from './contracts.js';
import type { SolutionOptimizerConfig } from './types.js';
import { OptimizationFailedError } from './errors.js';
import type { OptimizationCompletedEvent } from './events.js';

export class SolutionOptimizer implements ISolutionOptimizer {
  private readonly config: SolutionOptimizerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly reports = new Map<string, OptimizationReport>();
  private readonly solutionIndex = new Map<string, OptimizationReportId>();

  constructor(config: SolutionOptimizerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async optimize(solutionId: SolutionId, manifest: SolutionManifest): Promise<OptimizationReport> {
    if (this.reports.size >= this.config.maxReports) {
      throw new OptimizationFailedError(
        `Maximum optimization reports exceeded: ${this.config.maxReports}`,
        { maxReports: this.config.maxReports },
      );
    }

    const now: Timestamp = new Date().toISOString();
    const reportId = brandOptimizationReportId(crypto.randomUUID());

    // Generate suggestions across all six dimensions
    const suggestions = this.generateSuggestions(manifest);

    // Compute before/after cost and quality estimates
    const costBefore = manifest.metrics.estimatedCost;
    const costAfter = this.computeOptimizedCost(manifest, suggestions);
    const qualityBefore = manifest.metrics.complianceScore;
    const qualityAfter = this.computeOptimizedQuality(manifest, suggestions);

    const report: OptimizationReport = Object.freeze({
      id: reportId,
      solutionId,
      suggestions: Object.freeze(suggestions),
      costBefore,
      costAfter,
      qualityBefore,
      qualityAfter,
      optimizedAt: now,
      metadata: Object.freeze({
        manifestName: manifest.name,
        manifestVersion: manifest.version,
        totalSuggestions: suggestions.length,
      }),
    });

    const key = reportId as string;
    this.reports.set(key, report);
    this.solutionIndex.set(solutionId as string, reportId);

    const costReduction = costBefore > 0
      ? Math.round(((costBefore - costAfter) / costBefore) * 100)
      : 0;
    const qualityImprovement = Math.max(0, qualityAfter - qualityBefore);

    const event: OptimizationCompletedEvent = Object.freeze({
      eventType: 'solution.optimization.completed',
      classification: EventClassification.Info,
      reportId,
      solutionId,
      costReduction,
      qualityImprovement,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'OptimizationReport');

    return report;
  }

  async getById(id: OptimizationReportId): Promise<OptimizationReport | null> {
    return this.reports.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<OptimizationReport | null> {
    const reportId = this.solutionIndex.get(solutionId as string);
    if (!reportId) return null;
    return this.reports.get(reportId as string) ?? null;
  }

  async list(): Promise<readonly OptimizationReport[]> {
    return Object.freeze([...this.reports.values()]);
  }

  async count(): Promise<number> {
    return this.reports.size;
  }

  // ─── Optimization Logic ───────────────────────────────────────────

  private generateSuggestions(manifest: SolutionManifest): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    suggestions.push(...this.analyzeCost(manifest));
    suggestions.push(...this.analyzeSpeed(manifest));
    suggestions.push(...this.analyzeQuality(manifest));
    suggestions.push(...this.analyzeUX(manifest));
    suggestions.push(...this.analyzeConstraints(manifest));
    suggestions.push(...this.analyzeROI(manifest));

    // Sort by estimated impact descending, cap at config limit
    suggestions.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
    return suggestions.slice(0, this.config.maxSuggestions);
  }

  private analyzeCost(manifest: SolutionManifest): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (manifest.aiConfiguration && manifest.aiConfiguration.estimatedMonthlyCost > 500) {
      suggestions.push(Object.freeze({
        dimension: ODim.Cost,
        description: 'AI configuration cost is above recommended threshold',
        estimatedImpact: 25,
        action: 'Consider switching to a balanced cost strategy or optimizing temperature settings to reduce token usage',
      }));
    }

    if (manifest.metrics.aiCost > 1000) {
      suggestions.push(Object.freeze({
        dimension: ODim.Cost,
        description: 'Total AI cost projection exceeds efficiency target',
        estimatedImpact: 30,
        action: 'Review AI configuration for cost optimization opportunities; consider local model fallback for non-critical paths',
      }));
    }

    if (manifest.capabilityDependencies.length > 10) {
      suggestions.push(Object.freeze({
        dimension: ODim.Cost,
        description: 'High number of capability dependencies increases operational cost',
        estimatedImpact: 15,
        action: 'Consolidate overlapping capabilities to reduce licensing and integration costs',
      }));
    }

    return suggestions;
  }

  private analyzeSpeed(manifest: SolutionManifest): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (manifest.aiConfiguration && manifest.aiConfiguration.estimatedLatencyMs > 2000) {
      suggestions.push(Object.freeze({
        dimension: ODim.Speed,
        description: 'AI response latency exceeds recommended threshold',
        estimatedImpact: 35,
        action: 'Switch to a faster model, implement response caching, or use streaming responses for perceived performance',
      }));
    }

    if (manifest.metrics.buildTimeMs > 30_000) {
      suggestions.push(Object.freeze({
        dimension: ODim.Speed,
        description: 'Solution build time is above optimal range',
        estimatedImpact: 20,
        action: 'Enable parallel processing in the build pipeline and cache intermediate artifacts',
      }));
    }

    return suggestions;
  }

  private analyzeQuality(manifest: SolutionManifest): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (manifest.metrics.complianceScore < 80) {
      suggestions.push(Object.freeze({
        dimension: ODim.Quality,
        description: 'Compliance score is below target threshold',
        estimatedImpact: 40,
        action: 'Address compliance gaps by adding required security and privacy controls',
      }));
    }

    if (manifest.metrics.constraintScore < 70) {
      suggestions.push(Object.freeze({
        dimension: ODim.Quality,
        description: 'Constraint satisfaction is low',
        estimatedImpact: 25,
        action: 'Review and prioritize constraint fulfillment in the solution blueprint',
      }));
    }

    return suggestions;
  }

  private analyzeUX(manifest: SolutionManifest): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (!manifest.desktopConfiguration) {
      suggestions.push(Object.freeze({
        dimension: ODim.UX,
        description: 'No desktop configuration defined — user experience may be suboptimal',
        estimatedImpact: 30,
        action: 'Add a desktop configuration with appropriate layout, theme, and navigation for better UX',
      }));
    } else if (manifest.desktopConfiguration.navigation.length === 0) {
      suggestions.push(Object.freeze({
        dimension: ODim.UX,
        description: 'No navigation items defined in desktop configuration',
        estimatedImpact: 20,
        action: 'Add navigation items to improve discoverability and user workflow',
      }));
    }

    if (manifest.metrics.userSatisfactionPrediction < 70) {
      suggestions.push(Object.freeze({
        dimension: ODim.UX,
        description: 'Predicted user satisfaction is below target',
        estimatedImpact: 35,
        action: 'Enhance UI/UX design, reduce workflow complexity, and add user feedback mechanisms',
      }));
    }

    return suggestions;
  }

  private analyzeConstraints(manifest: SolutionManifest): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (manifest.constraints.length === 0) {
      suggestions.push(Object.freeze({
        dimension: ODim.Constraints,
        description: 'No constraints defined — solution may lack necessary boundaries',
        estimatedImpact: 15,
        action: 'Define explicit constraints to ensure the solution operates within safe and compliant boundaries',
      }));
    }

    if (manifest.metrics.constraintScore < 60) {
      suggestions.push(Object.freeze({
        dimension: ODim.Constraints,
        description: 'Constraint satisfaction score is critically low',
        estimatedImpact: 45,
        action: 'Re-evaluate solution design against all stated constraints; some constraints may be conflicting',
      }));
    }

    return suggestions;
  }

  private analyzeROI(manifest: SolutionManifest): readonly OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (manifest.metrics.estimatedROI < 50) {
      suggestions.push(Object.freeze({
        dimension: ODim.ROI,
        description: 'Estimated ROI is below recommended threshold',
        estimatedImpact: 50,
        action: 'Review value proposition, reduce implementation costs, or identify additional value streams',
      }));
    }

    if (manifest.kpis.length === 0) {
      suggestions.push(Object.freeze({
        dimension: ODim.ROI,
        description: 'No KPIs defined — ROI measurement will be unreliable',
        estimatedImpact: 20,
        action: 'Define clear KPIs aligned with business goals to enable accurate ROI tracking',
      }));
    }

    if (manifest.metrics.capabilityReuse < 0.5) {
      suggestions.push(Object.freeze({
        dimension: ODim.ROI,
        description: 'Low capability reuse reduces ROI through duplicated effort',
        estimatedImpact: 25,
        action: 'Increase use of existing marketplace capabilities to improve reuse and reduce development cost',
      }));
    }

    return suggestions;
  }

  private computeOptimizedCost(manifest: SolutionManifest, suggestions: readonly OptimizationSuggestion[]): number {
    let cost = manifest.metrics.estimatedCost;
    for (const s of suggestions) {
      if (s.dimension === ODim.Cost) {
        cost = cost * (1 - s.estimatedImpact / 200);
      }
    }
    return Math.round(cost * 100) / 100;
  }

  private computeOptimizedQuality(manifest: SolutionManifest, suggestions: readonly OptimizationSuggestion[]): number {
    let quality = manifest.metrics.complianceScore;
    for (const s of suggestions) {
      if (s.dimension === ODim.Quality) {
        quality = Math.min(100, quality + s.estimatedImpact / 4);
      }
    }
    return Math.round(quality);
  }

  // ─── Event Publishing ──────────────────────────────────────────────

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
