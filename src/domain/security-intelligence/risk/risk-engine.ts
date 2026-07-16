import type { SecurityFinding } from '../normalization/types.js';
import type { CorrelationGroup } from '../correlation/types.js';
import type {
  RiskAssessment,
  RiskLevel,
  RiskFactor,
  RiskSummary,
  RiskParameters,
} from './types.js';

export class RiskEngine {
  private params: RiskParameters;
  private correlationGroups: CorrelationGroup[] = [];

  constructor(params?: Partial<RiskParameters>) {
    this.params = {
      severityWeight: 0.35,
      confidenceWeight: 0.15,
      exposureWeight: 0.20,
      impactWeight: 0.15,
      exploitabilityWeight: 0.15,
      correlationMultiplier: 1.5,
      ...params,
    };
  }

  setCorrelationGroups(groups: CorrelationGroup[]): void {
    this.correlationGroups = groups;
  }

  assess(finding: SecurityFinding): RiskAssessment {
    const factors: RiskFactor[] = [];

    // Severity factor
    const severityScore = this.severityToScore(finding.severity);
    factors.push({
      name: 'severity',
      weight: this.params.severityWeight,
      value: severityScore,
      description: `Finding severity: ${finding.severity}`,
    });

    // Confidence factor
    const confidenceScore = this.confidenceToScore(finding.confidence);
    factors.push({
      name: 'confidence',
      weight: this.params.confidenceWeight,
      value: confidenceScore,
      description: `Finding confidence: ${finding.confidence}`,
    });

    // Exposure factor
    const exposureScore = this.calculateExposure(finding);
    factors.push({
      name: 'exposure',
      weight: this.params.exposureWeight,
      value: exposureScore,
      description: `Network exposure assessment`,
    });

    // Impact factor
    const impactScore = this.calculateImpact(finding);
    factors.push({
      name: 'impact',
      weight: this.params.impactWeight,
      value: impactScore,
      description: `Business impact assessment`,
    });

    // Exploitability factor
    const exploitScore = this.calculateExploitability(finding);
    factors.push({
      name: 'exploitability',
      weight: this.params.exploitabilityWeight,
      value: exploitScore,
      description: `Exploitability assessment`,
    });

    // Calculate weighted score
    let score = factors.reduce((sum, f) => sum + f.weight * f.value, 0);

    // Apply correlation multiplier
    const group = this.findGroup(finding.id);
    if (group) {
      score *= this.params.correlationMultiplier;
    }

    score = Math.min(Math.round(score * 100), 100);

    return {
      id: crypto.randomUUID(),
      findingId: finding.id,
      level: this.scoreToLevel(score),
      score,
      factors,
      confidence: confidenceScore,
      description: this.generateDescription(finding, score),
      recommendations: this.generateRecommendations(finding, score),
    };
  }

  assessAll(findings: SecurityFinding[]): RiskAssessment[] {
    return findings.map(f => this.assess(f));
  }

  summarize(assessments: RiskAssessment[]): RiskSummary {
    const byLevel: Record<RiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0, negligible: 0 };
    for (const a of assessments) byLevel[a.level]++;

    const topRisks = [...assessments].sort((a, b) => b.score - a.score).slice(0, 10);
    const avgScore = assessments.length > 0
      ? assessments.reduce((s, a) => s + a.score, 0) / assessments.length
      : 0;

    return {
      totalFindings: assessments.length,
      totalAssessed: assessments.length,
      averageScore: Math.round(avgScore),
      byLevel,
      topRisks,
      riskTrend: 'stable',
    };
  }

  private severityToScore(severity: string): number {
    const map: Record<string, number> = {
      critical: 1.0, high: 0.8, medium: 0.5, low: 0.3, info: 0.1, none: 0,
    };
    return map[severity] ?? 0.5;
  }

  private confidenceToScore(confidence: string): number {
    const map: Record<string, number> = { high: 0.9, medium: 0.6, low: 0.3 };
    return map[confidence] ?? 0.5;
  }

  private calculateExposure(finding: SecurityFinding): number {
    let score = 0.5;
    if (finding.protocol === 'https') score -= 0.1;
    if (finding.protocol === 'http') score += 0.2;
    if (finding.path?.startsWith('/api')) score += 0.1;
    if (finding.category === 'exposure') score += 0.2;
    return Math.max(0, Math.min(1, score));
  }

  private calculateImpact(finding: SecurityFinding): number {
    let score = 0.4;
    if (finding.category === 'secret') score += 0.3;
    if (finding.category === 'vulnerability') score += 0.2;
    if (finding.severity === 'critical' || finding.severity === 'high') score += 0.2;
    return Math.min(1, score);
  }

  private calculateExploitability(finding: SecurityFinding): number {
    let score = 0.3;
    if (finding.cve && finding.cve.length > 0) score += 0.3;
    if (finding.cvssScore && finding.cvssScore >= 7) score += 0.3;
    if (finding.category === 'misconfiguration') score += 0.2;
    return Math.min(1, score);
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'negligible';
  }

  private findGroup(findingId: string): CorrelationGroup | undefined {
    return this.correlationGroups.find(g => g.findings.includes(findingId));
  }

  private generateDescription(finding: SecurityFinding, score: number): string {
    const level = this.scoreToLevel(score);
    return `${level.toUpperCase()} risk: ${finding.name} on ${finding.host}${finding.port ? ':' + finding.port : ''}`;
  }

  private generateRecommendations(finding: SecurityFinding, _score: number): string[] {
    const recs: string[] = [];
    if (finding.category === 'vulnerability') recs.push('Apply security patches immediately');
    if (finding.category === 'misconfiguration') recs.push('Review and fix configuration');
    if (finding.category === 'secret') recs.push('Rotate exposed credentials');
    if (finding.category === 'exposure') recs.push('Restrict access to exposed resource');
    recs.push('Investigate and remediate the finding');
    return recs;
  }
}
