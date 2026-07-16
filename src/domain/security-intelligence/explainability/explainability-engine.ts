import type { SecurityFinding } from '../normalization/types.js';
import type { RiskAssessment } from '../risk/types.js';
import type { AttackPath } from '../attack-path/types.js';
import type { Recommendation } from '../recommendation/types.js';
import type {
  Explanation,
  ExplanationType,
  ExplanationStep,
  ExplanationEvidence,
  AnalysisTrace,
  TraceStage,
} from './types.js';

export class ExplainabilityEngine {
  explainFinding(finding: SecurityFinding, risk?: RiskAssessment): Explanation {
    const steps: ExplanationStep[] = [];

    steps.push({
      index: 0,
      title: 'Finding Identification',
      description: `The scanner detected a ${finding.category} finding named "${finding.name}" on ${finding.host}.`,
      evidence: [{
        source: 'scanner',
        description: 'Raw finding data',
        weight: 1.0,
        data: { source: finding.source, sourceId: finding.sourceId },
      }],
      conclusion: `Finding identified as ${finding.severity} severity ${finding.category}.`,
    });

    if (risk) {
      steps.push({
        index: 1,
        title: 'Risk Assessment',
        description: `Risk assessment produced a score of ${risk.score}/100 (${risk.level} level).`,
        evidence: risk.factors.map(f => ({
          source: 'risk-engine',
          description: f.description,
          weight: f.weight,
          data: { value: f.value },
        })),
        conclusion: `Risk level: ${risk.level} (score: ${risk.score}).`,
      });
    }

    return {
      id: crypto.randomUUID(),
      type: 'finding',
      targetId: finding.id,
      summary: `${finding.severity.toUpperCase()} ${finding.category}: ${finding.name} on ${finding.host}`,
      steps,
      confidence: finding.confidence === 'high' ? 0.9 : finding.confidence === 'medium' ? 0.7 : 0.5,
      timestamp: new Date(),
    };
  }

  explainRisk(risk: RiskAssessment, finding: SecurityFinding): Explanation {
    return {
      id: crypto.randomUUID(),
      type: 'risk',
      targetId: risk.id,
      summary: `Risk score ${risk.score}/100 for ${finding.name}`,
      steps: [
        {
          index: 0,
          title: 'Risk Factor Analysis',
          description: `The risk assessment considered ${risk.factors.length} factors.`,
          evidence: risk.factors.map(f => ({
            source: 'risk-engine',
            description: `${f.name}: ${f.description}`,
            weight: f.weight,
            data: { value: f.value, weight: f.weight },
          })),
          conclusion: `Overall risk: ${risk.level} (${risk.score}/100).`,
        },
      ],
      confidence: risk.confidence,
      timestamp: new Date(),
    };
  }

  explainAttackPath(path: AttackPath): Explanation {
    return {
      id: crypto.randomUUID(),
      type: 'attack-path',
      targetId: path.id,
      summary: `Attack path with ${path.steps.length} steps, total risk ${path.totalRiskScore}`,
      steps: path.steps.map((step, i) => ({
        index: i,
        title: step.name,
        description: step.description,
        evidence: [{
          source: 'attack-path-builder',
          description: `Step ${i + 1} of attack path`,
          weight: step.riskScore / 100,
          data: { technique: step.technique, riskScore: step.riskScore },
        }],
        conclusion: `Risk score: ${step.riskScore}/100.`,
      })),
      confidence: path.exploitability,
      timestamp: new Date(),
    };
  }

  explainRecommendation(rec: Recommendation): Explanation {
    return {
      id: crypto.randomUUID(),
      type: 'recommendation',
      targetId: rec.id,
      summary: `${rec.priority.toUpperCase()} priority: ${rec.title}`,
      steps: rec.actions.map((action, i) => ({
        index: i,
        title: action.description,
        description: `Action type: ${action.type}, effort: ${action.effort}, risk reduction: ${(action.riskReduction * 100).toFixed(0)}%`,
        evidence: [{
          source: 'recommendation-engine',
          description: `Remediation action`,
          weight: action.riskReduction,
          data: { type: action.type, effort: action.effort },
        }],
        conclusion: `This action reduces risk by ${(action.riskReduction * 100).toFixed(0)}%.`,
      })),
      confidence: rec.estimatedRiskReduction,
      timestamp: new Date(),
    };
  }

  createTrace(stages: Array<{ name: string; start: Date; end: Date; inputCount: number; outputCount: number }>): AnalysisTrace {
    const traceStages: TraceStage[] = stages.map(s => ({
      name: s.name,
      startTime: s.start,
      endTime: s.end,
      durationMs: s.end.getTime() - s.start.getTime(),
      inputCount: s.inputCount,
      outputCount: s.outputCount,
      metadata: {},
    }));

    return {
      id: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      stages: traceStages,
      totalTimeMs: traceStages.reduce((s, st) => s + st.durationMs, 0),
    };
  }
}
