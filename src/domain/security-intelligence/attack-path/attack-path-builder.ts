import type { SecurityFinding } from '../normalization/types.js';
import type { RiskAssessment } from '../risk/types.js';
import type { KnowledgeGraph, KGNode } from '../knowledge-graph/types.js';
import type {
  AttackPath,
  AttackStep,
  AttackGraph,
  AttackGraphNode,
  AttackGraphEdge,
  AttackGraphStatistics,
} from './types.js';

export class AttackPathBuilder {
  discoverPaths(
    findings: SecurityFinding[],
    risks: RiskAssessment[],
    _graph?: KnowledgeGraph,
  ): AttackGraph {
    const riskMap = new Map(risks.map(r => [r.findingId, r]));

    // Build attack paths from high-risk findings
    const paths: AttackPath[] = [];
    const criticalFindings = findings.filter(
      f => (riskMap.get(f.id)?.level ?? 'low') === 'critical' || (riskMap.get(f.id)?.level ?? 'low') === 'high',
    );

    // Group by host for path building
    const hostGroups = new Map<string, SecurityFinding[]>();
    for (const f of findings) {
      const group = hostGroups.get(f.host) ?? [];
      group.push(f);
      hostGroups.set(f.host, group);
    }

    // For each host with critical findings, build an attack path
    for (const [host, hostFindings] of hostGroups) {
      if (!hostFindings.some(f => criticalFindings.includes(f))) continue;

      const steps: AttackStep[] = hostFindings
        .sort((a, b) => {
          const ra = riskMap.get(a.id);
          const rb = riskMap.get(b.id);
          return (rb?.score ?? 0) - (ra?.score ?? 0);
        })
        .map(f => ({
          id: crypto.randomUUID(),
          findingId: f.id,
          name: f.name,
          description: f.description,
          riskScore: riskMap.get(f.id)?.score ?? 50,
          technique: f.category,
        }));

      if (steps.length > 0) {
        const totalRisk = steps.reduce((s, st) => s + st.riskScore, 0) / steps.length;
        paths.push({
          id: crypto.randomUUID(),
          name: `Attack path via ${host}`,
          steps,
          totalRiskScore: Math.round(totalRisk),
          exploitability: this.calculateExploitability(steps),
          impact: this.calculateImpact(steps),
          description: `Multi-step attack path through ${host} involving ${steps.length} steps`,
          entryPoint: host,
          target: host,
        });
      }
    }

    // Build graph representation
    const nodes: AttackGraphNode[] = [];
    const edges: AttackGraphEdge[] = [];

    for (const path of paths) {
      for (let i = 0; i < path.steps.length; i++) {
        const step = path.steps[i];
        nodes.push({
          id: step.findingId,
          type: i === 0 ? 'entry' : i === path.steps.length - 1 ? 'target' : 'pivot',
          label: step.name,
          riskScore: step.riskScore,
        });
        if (i > 0) {
          edges.push({
            source: path.steps[i - 1].findingId,
            target: step.findingId,
            technique: step.technique ?? 'unknown',
            difficulty: 1 - step.riskScore / 100,
          });
        }
      }
    }

    const avgPathLength = paths.length > 0
      ? paths.reduce((s, p) => s + p.steps.length, 0) / paths.length
      : 0;
    const maxRisk = paths.length > 0
      ? Math.max(...paths.map(p => p.totalRiskScore))
      : 0;

    return {
      id: crypto.randomUUID(),
      paths,
      nodes,
      edges,
      statistics: {
        totalPaths: paths.length,
        avgPathLength: Math.round(avgPathLength * 10) / 10,
        maxRiskScore: maxRisk,
        entryPoints: nodes.filter(n => n.type === 'entry').length,
        criticalPaths: paths.filter(p => p.totalRiskScore >= 70).length,
      },
    };
  }

  private calculateExploitability(steps: AttackStep[]): number {
    if (steps.length === 0) return 0;
    const avgRisk = steps.reduce((s, st) => s + st.riskScore, 0) / steps.length;
    return Math.min(1, avgRisk / 100 + steps.length * 0.05);
  }

  private calculateImpact(steps: AttackStep[]): number {
    if (steps.length === 0) return 0;
    const maxRisk = Math.max(...steps.map(s => s.riskScore));
    return Math.min(1, maxRisk / 100);
  }
}
