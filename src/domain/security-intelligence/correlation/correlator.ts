import type { SecurityFinding } from '../normalization/types.js';
import type {
  Correlation,
  CorrelationGroup,
  CorrelationRule,
  CorrelationResult,
  CorrelationStatistics,
  CorrelationType,
  CorrelationStrength,
} from './types.js';

export class CorrelationEngine {
  private rules: CorrelationRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  addRule(rule: CorrelationRule): void {
    this.rules.push(rule);
  }

  correlate(findings: SecurityFinding[]): CorrelationResult {
    const correlations: Correlation[] = [];

    // Pair-wise correlation
    for (let i = 0; i < findings.length; i++) {
      for (let j = i + 1; j < findings.length; j++) {
        for (const rule of this.rules) {
          if (rule.condition(findings[i], findings[j])) {
            const score = rule.scoreCalculator(findings[i], findings[j]);
            correlations.push({
              id: crypto.randomUUID(),
              findingA: findings[i].id,
              findingB: findings[j].id,
              type: rule.type,
              strength: this.scoreToStrength(score),
              score,
              description: rule.description,
              evidence: { rule: rule.id },
            });
          }
        }
      }
    }

    // Group correlated findings
    const groups = this.buildGroups(correlations, findings);

    const byType: Record<CorrelationType, number> = {
      'same-host': 0, 'same-service': 0, causal: 0,
      temporal: 0, 'attack-chain': 0, 'shared-root-cause': 0,
    };
    for (const c of correlations) byType[c.type]++;

    return {
      correlations,
      groups,
      statistics: {
        totalFindings: findings.length,
        totalCorrelations: correlations.length,
        totalGroups: groups.length,
        byType,
        avgGroupSize: groups.length > 0
          ? groups.reduce((s, g) => s + g.findings.length, 0) / groups.length
          : 0,
      },
    };
  }

  private scoreToStrength(score: number): CorrelationStrength {
    if (score >= 0.8) return 'strong';
    if (score >= 0.5) return 'moderate';
    return 'weak';
  }

  private buildGroups(correlations: Correlation[], findings: SecurityFinding[]): CorrelationGroup[] {
    // Union-Find for grouping
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x) ?? x;
    };
    const union = (a: string, b: string) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    for (const f of findings) parent.set(f.id, f.id);
    for (const c of correlations) union(c.findingA, c.findingB);

    const groupMap = new Map<string, string[]>();
    for (const [id] of parent) {
      const root = find(id);
      if (!groupMap.has(root)) groupMap.set(root, []);
      groupMap.get(root)!.push(id);
    }

    const groups: CorrelationGroup[] = [];
    let idx = 0;
    for (const [root, memberIds] of groupMap) {
      if (memberIds.length < 2) continue;
      const memberCorrelations = correlations.filter(
        c => memberIds.includes(c.findingA) || memberIds.includes(c.findingB)
      );
      groups.push({
        id: crypto.randomUUID(),
        name: `Correlation Group ${++idx}`,
        findings: memberIds,
        correlations: memberCorrelations.map(c => c.id),
        dominantCategory: 'mixed',
        riskMultiplier: 1 + memberIds.length * 0.1,
        description: `${memberIds.length} correlated findings`,
      });
    }
    return groups;
  }

  private registerDefaultRules(): void {
    // Same host correlation
    this.rules.push({
      id: 'same-host',
      name: 'Same Host',
      type: 'same-host',
      condition: (a, b) => a.host === b.host && a.id !== b.id,
      scoreCalculator: (a, b) => {
        let score = 0.6;
        if (a.severity === 'critical' || b.severity === 'critical') score += 0.2;
        if (a.category === b.category) score += 0.1;
        return Math.min(score, 1);
      },
      description: 'Findings on the same host',
    });

    // Same service correlation
    this.rules.push({
      id: 'same-service',
      name: 'Same Service',
      type: 'same-service',
      condition: (a, b) =>
        a.host === b.host && a.port === b.port && a.protocol === b.protocol && a.id !== b.id,
      scoreCalculator: () => 0.85,
      description: 'Findings on the same service',
    });

    // Temporal correlation
    this.rules.push({
      id: 'temporal',
      name: 'Temporal Proximity',
      type: 'temporal',
      condition: (a, b) => {
        const diff = Math.abs(a.timestamp.getTime() - b.timestamp.getTime());
        return diff < 60_000; // within 1 minute
      },
      scoreCalculator: (a, b) => {
        const diff = Math.abs(a.timestamp.getTime() - b.timestamp.getTime());
        return Math.max(0.3, 1 - diff / 60_000);
      },
      description: 'Findings discovered at similar times',
    });
  }
}
