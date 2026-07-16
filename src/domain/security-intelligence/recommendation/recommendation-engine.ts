import type { SecurityFinding } from '../normalization/types.js';
import type { RiskAssessment } from '../risk/types.js';
import type {
  Recommendation,
  RemediationAction,
  RemediationPlan,
  RecommendationPriority,
  RecommendationStatus,
} from './types.js';

export class RecommendationEngine {
  generate(findings: SecurityFinding[], risks: RiskAssessment[]): Recommendation[] {
    const riskMap = new Map(risks.map(r => [r.findingId, r]));
    const recommendations: Recommendation[] = [];

    for (const finding of findings) {
      const risk = riskMap.get(finding.id);
      const actions = this.generateActions(finding);
      const priority = this.determinePriority(finding, risk);

      recommendations.push({
        id: crypto.randomUUID(),
        findingIds: [finding.id],
        title: this.generateTitle(finding),
        description: this.generateDescription(finding, risk),
        priority,
        status: 'open',
        actions,
        estimatedRiskReduction: this.estimateRiskReduction(actions),
        relatedRecommendations: [],
        tags: [finding.category, finding.severity],
      });
    }

    return recommendations;
  }

  createPlan(recommendations: Recommendation[]): RemediationPlan {
    const sorted = [...recommendations].sort((a, b) => {
      const prioMap: Record<RecommendationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return prioMap[a.priority] - prioMap[b.priority];
    });

    const critical = sorted.filter(r => r.priority === 'critical');
    const high = sorted.filter(r => r.priority === 'high');
    const medium = sorted.filter(r => r.priority === 'medium');
    const low = sorted.filter(r => r.priority === 'low');

    return {
      id: crypto.randomUUID(),
      name: 'Remediation Plan',
      recommendations: sorted,
      totalEstimatedRiskReduction: sorted.reduce((s, r) => s + r.estimatedRiskReduction, 0) / sorted.length,
      estimatedEffort: critical.length > 3 ? 'high' : critical.length > 0 || high.length > 5 ? 'medium' : 'low',
      phases: [
        { name: 'Critical', recommendations: critical.map(r => r.id), priority: 'critical' },
        { name: 'High Priority', recommendations: high.map(r => r.id), priority: 'high' },
        { name: 'Medium Priority', recommendations: medium.map(r => r.id), priority: 'medium' },
        { name: 'Low Priority', recommendations: low.map(r => r.id), priority: 'low' },
      ].filter(p => p.recommendations.length > 0),
    };
  }

  private generateActions(finding: SecurityFinding): RemediationAction[] {
    const actions: RemediationAction[] = [];

    switch (finding.category) {
      case 'vulnerability':
        actions.push({
          id: crypto.randomUUID(),
          description: 'Apply security patches for the identified vulnerability',
          type: 'patch',
          effort: 'medium',
          riskReduction: 0.8,
          prerequisites: ['Identify patch version', 'Test patch in staging'],
        });
        break;
      case 'misconfiguration':
        actions.push({
          id: crypto.randomUUID(),
          description: 'Fix the security misconfiguration',
          type: 'config',
          effort: 'low',
          riskReduction: 0.9,
          prerequisites: ['Review current configuration'],
        });
        break;
      case 'secret':
        actions.push({
          id: crypto.randomUUID(),
          description: 'Rotate the exposed credential immediately',
          type: 'credential',
          effort: 'low',
          riskReduction: 0.95,
          prerequisites: ['Identify all systems using this credential'],
        });
        break;
      case 'exposure':
        actions.push({
          id: crypto.randomUUID(),
          description: 'Restrict access to the exposed resource',
          type: 'network',
          effort: 'medium',
          riskReduction: 0.7,
          prerequisites: ['Identify legitimate access patterns'],
        });
        break;
      default:
        actions.push({
          id: crypto.randomUUID(),
          description: 'Investigate and remediate the finding',
          type: 'process',
          effort: 'medium',
          riskReduction: 0.5,
          prerequisites: [],
        });
    }

    return actions;
  }

  private determinePriority(finding: SecurityFinding, risk?: RiskAssessment): RecommendationPriority {
    if (finding.severity === 'critical' || risk?.level === 'critical') return 'critical';
    if (finding.severity === 'high' || risk?.level === 'high') return 'high';
    if (finding.severity === 'medium' || risk?.level === 'medium') return 'medium';
    return 'low';
  }

  private generateTitle(finding: SecurityFinding): string {
    const actionMap: Record<string, string> = {
      vulnerability: 'Patch',
      misconfiguration: 'Fix configuration for',
      secret: 'Rotate credential exposed in',
      exposure: 'Restrict access to',
      outdated: 'Update',
    };
    return `${actionMap[finding.category] ?? 'Remediate'} ${finding.name}`;
  }

  private generateDescription(finding: SecurityFinding, risk?: RiskAssessment): string {
    return `${finding.severity.toUpperCase()} severity ${finding.category} detected on ${finding.host}${finding.port ? ':' + finding.port : ''}: ${finding.description}. Risk score: ${risk?.score ?? 'N/A'}.`;
  }

  private estimateRiskReduction(actions: RemediationAction[]): number {
    if (actions.length === 0) return 0;
    return Math.max(...actions.map(a => a.riskReduction));
  }
}
