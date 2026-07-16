import type { SecurityFinding } from '../normalization/types.js';
import type { RiskAssessment } from '../risk/types.js';
import type { ImpactAssessment, ImpactLevel, ImpactDimension } from './types.js';

const DIMENSIONS: ImpactDimension[] = [
  'confidentiality', 'integrity', 'availability', 'financial', 'reputation', 'compliance',
];

export class ImpactEngine {
  assess(finding: SecurityFinding, risk: RiskAssessment): ImpactAssessment {
    const dimensions: Record<ImpactDimension, number> = {
      confidentiality: 0, integrity: 0, availability: 0,
      financial: 0, reputation: 0, compliance: 0,
    };

    // Base scores from severity and category
    const baseScore = risk.score / 100;

    if (finding.category === 'secret' || finding.category === 'exposure') {
      dimensions.confidentiality = Math.min(1, baseScore + 0.3);
      dimensions.compliance = Math.min(1, baseScore + 0.2);
    }
    if (finding.category === 'vulnerability') {
      dimensions.integrity = Math.min(1, baseScore + 0.2);
      dimensions.availability = Math.min(1, baseScore + 0.1);
    }
    if (finding.category === 'misconfiguration') {
      dimensions.availability = Math.min(1, baseScore + 0.2);
      dimensions.integrity = Math.min(1, baseScore + 0.1);
    }

    dimensions.financial = Math.min(1, baseScore * 0.8);
    dimensions.reputation = Math.min(1, baseScore * 0.6);

    const avgScore = DIMENSIONS.reduce((s, d) => s + dimensions[d], 0) / DIMENSIONS.length;
    const score = Math.round(avgScore * 100);

    return {
      id: crypto.randomUUID(),
      findingId: finding.id,
      level: this.scoreToLevel(score),
      score,
      dimensions,
      description: `Impact assessment for ${finding.name}`,
      affectedAssets: [finding.host],
    };
  }

  assessAll(findings: SecurityFinding[], risks: RiskAssessment[]): ImpactAssessment[] {
    const riskMap = new Map(risks.map(r => [r.findingId, r]));
    return findings.map(f => this.assess(f, riskMap.get(f.id)!)).filter((a): a is ImpactAssessment => a !== undefined);
  }

  private scoreToLevel(score: number): ImpactLevel {
    if (score >= 80) return 'severe';
    if (score >= 60) return 'major';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'minor';
    return 'negligible';
  }
}
