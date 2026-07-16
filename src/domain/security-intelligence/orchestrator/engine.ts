import type { RawFinding, SecurityFinding } from '../normalization/types.js';
import type { Correlation, CorrelationGroup } from '../correlation/types.js';
import type { KnowledgeGraph } from '../knowledge-graph/types.js';
import type { RiskAssessment } from '../risk/types.js';
import type { AttackGraph } from '../attack-path/types.js';
import type { ImpactAssessment } from '../impact/types.js';
import type { Recommendation, RemediationPlan } from '../recommendation/types.js';
import type { Explanation, AnalysisTrace } from '../explainability/types.js';
import { NormalizationEngine } from '../normalization/normalizer.js';
import { CorrelationEngine } from '../correlation/correlator.js';
import { KnowledgeGraphBuilder } from '../knowledge-graph/graph-builder.js';
import { RiskEngine } from '../risk/risk-engine.js';
import { AttackPathBuilder } from '../attack-path/attack-path-builder.js';
import { ImpactEngine } from '../impact/impact-engine.js';
import { RecommendationEngine } from '../recommendation/recommendation-engine.js';
import { ExplainabilityEngine } from '../explainability/explainability-engine.js';
import type {
  PipelineStage,
  StageStatus,
  StageResult,
  PipelineProgress,
  PipelineEvent,
  PipelineEventHandler,
  PipelineMetrics,
  SecurityIntelligenceReport,
  AnalysisOptions,
  ScanInput,
} from './types.js';

const STAGES: PipelineStage[] = [
  'normalize', 'correlate', 'knowledge-graph', 'risk',
  'attack-path', 'impact', 'recommendation', 'explain', 'report',
];

export class SecurityIntelligenceEngine {
  private normalizer: NormalizationEngine;
  private correlator: CorrelationEngine;
  private graphBuilder: KnowledgeGraphBuilder;
  private riskEngine: RiskEngine;
  private attackPathBuilder: AttackPathBuilder;
  private impactEngine: ImpactEngine;
  private recommendationEngine: RecommendationEngine;
  private explainabilityEngine: ExplainabilityEngine;
  private eventHandlers: PipelineEventHandler[] = [];
  private stageResults: Map<PipelineStage, StageResult> = new Map();
  private cancelled = false;

  constructor() {
    this.normalizer = new NormalizationEngine();
    this.correlator = new CorrelationEngine();
    this.graphBuilder = new KnowledgeGraphBuilder();
    this.riskEngine = new RiskEngine();
    this.attackPathBuilder = new AttackPathBuilder();
    this.impactEngine = new ImpactEngine();
    this.recommendationEngine = new RecommendationEngine();
    this.explainabilityEngine = new ExplainabilityEngine();
  }

  /** Main analysis entry point */
  async analyze(input: ScanInput, options?: AnalysisOptions): Promise<SecurityIntelligenceReport> {
    const runId = crypto.randomUUID();
    const startTime = new Date();
    this.cancelled = false;
    this.stageResults.clear();

    // Register event handler from options
    if (options?.onEvent) {
      this.onEvent(options.onEvent);
    }

    // Check for cancellation
    options?.signal?.addEventListener('abort', () => {
      this.cancelled = true;
    });

    this.emit('pipeline:started', runId, { totalStages: STAGES.length });

    try {
      // Stage 1: Normalize
      const normalizationStart = new Date();
      this.emitStage('normalize', 'started', runId);
      this.updateProgress('normalize', runId, options?.onProgress);
      const normalizationResult = this.normalizer.normalize(input.findings as RawFinding[]);
      const findings = normalizationResult.findings;
      this.emitStage('normalize', 'completed', runId, { count: findings.length });

      if (this.cancelled) throw new Error('Pipeline cancelled');

      // Stage 2: Correlate
      this.emitStage('correlate', 'started', runId);
      this.updateProgress('correlate', runId, options?.onProgress);
      const correlationResult = this.correlator.correlate(findings);
      this.riskEngine.setCorrelationGroups(correlationResult.groups);
      this.emitStage('correlate', 'completed', runId, { count: correlationResult.correlations.length });

      if (this.cancelled) throw new Error('Pipeline cancelled');

      // Stage 3: Knowledge Graph
      this.emitStage('knowledge-graph', 'started', runId);
      this.updateProgress('knowledge-graph', runId, options?.onProgress);
      const graph = this.graphBuilder.buildFromFindings(findings);
      const findingMap = new Map(findings.map(f => [f.id, f]));
      this.graphBuilder.addCorrelations(correlationResult.correlations, findingMap);
      this.graphBuilder.addGroups(correlationResult.groups);
      const kgStats = this.graphBuilder.getStatistics();
      this.emitStage('knowledge-graph', 'completed', runId, { nodes: kgStats.totalNodes, edges: kgStats.totalEdges });

      if (this.cancelled) throw new Error('Pipeline cancelled');

      // Stage 4: Risk
      this.emitStage('risk', 'started', runId);
      this.updateProgress('risk', runId, options?.onProgress);
      const risks = this.riskEngine.assessAll(findings);
      const riskSummary = this.riskEngine.summarize(risks);
      this.emitStage('risk', 'completed', runId, { count: risks.length });

      if (this.cancelled) throw new Error('Pipeline cancelled');

      // Stage 5: Attack Path
      const attackPaths: AttackGraph[] = [];
      if (options?.includeAttackPaths !== false) {
        this.emitStage('attack-path', 'started', runId);
        this.updateProgress('attack-path', runId, options?.onProgress);
        const attackGraph = this.attackPathBuilder.discoverPaths(findings, risks, graph);
        attackPaths.push(attackGraph);
        this.emitStage('attack-path', 'completed', runId, { paths: attackGraph.statistics.totalPaths });
      }

      if (this.cancelled) throw new Error('Pipeline cancelled');

      // Stage 6: Impact
      let impacts: ImpactAssessment[] = [];
      if (options?.includeImpact !== false) {
        this.emitStage('impact', 'started', runId);
        this.updateProgress('impact', runId, options?.onProgress);
        impacts = this.impactEngine.assessAll(findings, risks);
        this.emitStage('impact', 'completed', runId, { count: impacts.length });
      }

      if (this.cancelled) throw new Error('Pipeline cancelled');

      // Stage 7: Recommendation
      this.emitStage('recommendation', 'started', runId);
      this.updateProgress('recommendation', runId, options?.onProgress);
      const recommendations = this.recommendationEngine.generate(findings, risks);
      const remediationPlan = this.recommendationEngine.createPlan(recommendations);
      this.emitStage('recommendation', 'completed', runId, { count: recommendations.length });

      if (this.cancelled) throw new Error('Pipeline cancelled');

      // Stage 8: Explain
      let explanations: Explanation[] = [];
      if (options?.explain !== false) {
        this.emitStage('explain', 'started', runId);
        this.updateProgress('explain', runId, options?.onProgress);
        for (const finding of findings) {
          const risk = risks.find(r => r.findingId === finding.id);
          explanations.push(this.explainabilityEngine.explainFinding(finding, risk));
        }
        this.emitStage('explain', 'completed', runId, { count: explanations.length });
      }

      if (this.cancelled) throw new Error('Pipeline cancelled');

      // Stage 9: Report
      this.emitStage('report', 'started', runId);
      this.updateProgress('report', runId, options?.onProgress);

      const endTime = new Date();
      const totalDurationMs = endTime.getTime() - startTime.getTime();

      const trace = this.explainabilityEngine.createTrace(
        STAGES.map(name => {
          const result = this.stageResults.get(name);
          return {
            name,
            start: result?.startTime ?? startTime,
            end: result?.endTime ?? endTime,
            inputCount: 0,
            outputCount: 0,
          };
        }),
      );

      const metrics: PipelineMetrics = {
        runId,
        totalDurationMs,
        stageDurations: {} as Record<PipelineStage, number>,
        findingsCount: findings.length,
        correlationsCount: correlationResult.correlations.length,
        risksCount: risks.length,
        attackPathsCount: attackPaths.reduce((s, g) => s + g.statistics.totalPaths, 0),
        recommendationsCount: recommendations.length,
        peakMemoryMb: 0,
      };
      for (const [stage, result] of this.stageResults) {
        metrics.stageDurations[stage] = result.durationMs ?? 0;
      }

      const report: SecurityIntelligenceReport = {
        id: crypto.randomUUID(),
        runId,
        timestamp: new Date(),
        findings,
        normalization: normalizationResult.statistics,
        correlation: correlationResult.statistics,
        knowledgeGraph: kgStats,
        riskSummary,
        risks,
        attackGraph: attackPaths[0]?.statistics ?? { totalPaths: 0, avgPathLength: 0, maxRiskScore: 0, entryPoints: 0, criticalPaths: 0 },
        attackPaths,
        impacts,
        recommendations,
        remediationPlan,
        explanations,
        trace,
        metrics,
      };

      this.emitStage('report', 'completed', runId, {});
      this.emit('pipeline:completed', runId, { reportId: report.id, durationMs: totalDurationMs });

      return report;
    } catch (err) {
      this.emit('pipeline:failed', runId, { error: (err as Error).message });
      throw err;
    } finally {
      this.eventHandlers = [];
    }
  }

  /** Register event handler */
  onEvent(handler: PipelineEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(type: PipelineEvent['type'], runId: string, data: Record<string, unknown>): void {
    const event: PipelineEvent = { type, runId, timestamp: new Date(), data };
    for (const handler of this.eventHandlers) {
      try { handler(event); } catch { /* ignore handler errors */ }
    }
  }

  private emitStage(stage: PipelineStage, status: 'started' | 'completed' | 'failed', runId: string, data: Record<string, unknown> = {}): void {
    const now = new Date();
    if (status === 'started') {
      this.stageResults.set(stage, { stage, status: 'running', startTime: now });
      this.emit('stage:started', runId, { stage, ...data });
    } else if (status === 'completed') {
      const existing = this.stageResults.get(stage);
      if (existing) {
        existing.status = 'completed';
        existing.endTime = now;
        existing.durationMs = now.getTime() - existing.startTime.getTime();
      }
      this.emit('stage:completed', runId, { stage, durationMs: existing?.durationMs, ...data });
    } else {
      const existing = this.stageResults.get(stage);
      if (existing) {
        existing.status = 'failed';
        existing.endTime = now;
        existing.durationMs = now.getTime() - existing.startTime.getTime();
        existing.error = new Error(String(data.error));
      }
      this.emit('stage:failed', runId, { stage, ...data });
    }
  }

  private updateProgress(currentStage: PipelineStage, runId: string, onProgress?: (progress: PipelineProgress) => void): void {
    if (!onProgress) return;
    const idx = STAGES.indexOf(currentStage);
    const stageStatuses: Record<PipelineStage, StageStatus> = {
      normalize: 'pending', correlate: 'pending', 'knowledge-graph': 'pending',
      risk: 'pending', 'attack-path': 'pending', impact: 'pending',
      recommendation: 'pending', explain: 'pending', report: 'pending',
    };
    for (const [stage, result] of this.stageResults) {
      stageStatuses[stage] = result.status;
    }
    stageStatuses[currentStage] = 'running';

    onProgress({
      currentStage,
      stageIndex: idx,
      totalStages: STAGES.length,
      percentage: Math.round(((idx + 0.5) / STAGES.length) * 100),
      stageStatuses,
      startTime: new Date(),
      elapsedMs: 0,
    });
  }
}
