import type { OutputFormat } from '../config/types.js';
import type { SecurityFinding } from '../../domain/security-intelligence/normalization/types.js';
import type { RiskAssessment } from '../../domain/security-intelligence/risk/types.js';
import type { Recommendation } from '../../domain/security-intelligence/recommendation/types.js';
import type { AttackPath } from '../../domain/security-intelligence/attack-path/types.js';
import type { SecurityIntelligenceReport } from '../../domain/security-intelligence/orchestrator/types.js';

export class OutputFormatter {
  constructor(private format: OutputFormat) {}

  setFormat(format: OutputFormat): void {
    this.format = format;
  }

  formatFindings(findings: SecurityFinding[]): string {
    switch (this.format) {
      case 'json': return JSON.stringify(findings, null, 2);
      case 'jsonl': return findings.map(f => JSON.stringify(f)).join('\n');
      case 'yaml': return this.toYaml(findings);
      case 'csv': return this.findingsToCsv(findings);
      case 'markdown': return this.findingsToMarkdown(findings);
      case 'table':
      default: return this.findingsToTable(findings);
    }
  }

  formatRisks(risks: RiskAssessment[]): string {
    switch (this.format) {
      case 'json': return JSON.stringify(risks, null, 2);
      case 'jsonl': return risks.map(r => JSON.stringify(r)).join('\n');
      case 'yaml': return this.toYaml(risks);
      case 'csv': return this.risksToCsv(risks);
      case 'markdown': return this.risksToMarkdown(risks);
      case 'table':
      default: return this.risksToTable(risks);
    }
  }

  formatRecommendations(recs: Recommendation[]): string {
    switch (this.format) {
      case 'json': return JSON.stringify(recs, null, 2);
      case 'jsonl': return recs.map(r => JSON.stringify(r)).join('\n');
      case 'yaml': return this.toYaml(recs);
      case 'markdown': return this.recsToMarkdown(recs);
      case 'table':
      default: return this.recsToTable(recs);
    }
  }

  formatAttackPaths(paths: AttackPath[]): string {
    switch (this.format) {
      case 'json': return JSON.stringify(paths, null, 2);
      case 'yaml': return this.toYaml(paths);
      case 'markdown': return this.pathsToMarkdown(paths);
      case 'table':
      default: return this.pathsToTable(paths);
    }
  }

  formatReport(report: SecurityIntelligenceReport): string {
    switch (this.format) {
      case 'json': return JSON.stringify(report, null, 2);
      case 'yaml': return this.toYaml(report);
      case 'markdown': return this.reportToMarkdown(report);
      case 'table':
      default: return this.reportToTable(report);
    }
  }

  formatData(data: unknown): string {
    switch (this.format) {
      case 'json': return JSON.stringify(data, null, 2);
      case 'yaml': return this.toYaml(data);
      default: return JSON.stringify(data, null, 2);
    }
  }

  private findingsToTable(findings: SecurityFinding[]): string {
    if (findings.length === 0) return 'No findings.';
    const header = 'ID\tSource\tName\tSeverity\tCategory\tHost';
    const rows = findings.map(f =>
      `${f.id.slice(0, 8)}\t${f.source}\t${f.name}\t${f.severity}\t${f.category}\t${f.host}`
    );
    return [header, ...rows].join('\n');
  }

  private findingsToCsv(findings: SecurityFinding[]): string {
    const header = 'id,source,name,severity,category,host,port,protocol';
    const rows = findings.map(f =>
      `"${f.id}","${f.source}","${f.name}","${f.severity}","${f.category}","${f.host}","${f.port ?? ''}","${f.protocol ?? ''}"`
    );
    return [header, ...rows].join('\n');
  }

  private findingsToMarkdown(findings: SecurityFinding[]): string {
    let md = '| ID | Source | Name | Severity | Category | Host |\n';
    md += '|---|---|---|---|---|---|\n';
    for (const f of findings) {
      md += `| ${f.id.slice(0, 8)} | ${f.source} | ${f.name} | ${f.severity} | ${f.category} | ${f.host} |\n`;
    }
    return md;
  }

  private risksToTable(risks: RiskAssessment[]): string {
    if (risks.length === 0) return 'No risks.';
    const header = 'ID\tFinding\tLevel\tScore\tConfidence';
    const rows = risks.map(r =>
      `${r.id.slice(0, 8)}\t${r.findingId.slice(0, 8)}\t${r.level}\t${r.score}\t${(r.confidence * 100).toFixed(0)}%`
    );
    return [header, ...rows].join('\n');
  }

  private risksToCsv(risks: RiskAssessment[]): string {
    const header = 'id,findingId,level,score,confidence';
    const rows = risks.map(r =>
      `"${r.id}","${r.findingId}","${r.level}","${r.score}","${r.confidence}"`
    );
    return [header, ...rows].join('\n');
  }

  private risksToMarkdown(risks: RiskAssessment[]): string {
    let md = '| ID | Finding | Level | Score | Confidence |\n';
    md += '|---|---|---|---|---|\n';
    for (const r of risks) {
      md += `| ${r.id.slice(0, 8)} | ${r.findingId.slice(0, 8)} | ${r.level} | ${r.score} | ${(r.confidence * 100).toFixed(0)}% |\n`;
    }
    return md;
  }

  private recsToTable(recs: Recommendation[]): string {
    if (recs.length === 0) return 'No recommendations.';
    const header = 'ID\tPriority\tTitle\tRisk Reduction';
    const rows = recs.map(r =>
      `${r.id.slice(0, 8)}\t${r.priority}\t${r.title}\t${(r.estimatedRiskReduction * 100).toFixed(0)}%`
    );
    return [header, ...rows].join('\n');
  }

  private recsToMarkdown(recs: Recommendation[]): string {
    let md = '| ID | Priority | Title | Risk Reduction |\n';
    md += '|---|---|---|---|\n';
    for (const r of recs) {
      md += `| ${r.id.slice(0, 8)} | ${r.priority} | ${r.title} | ${(r.estimatedRiskReduction * 100).toFixed(0)}% |\n`;
    }
    return md;
  }

  private pathsToTable(paths: AttackPath[]): string {
    if (paths.length === 0) return 'No attack paths.';
    const header = 'ID\tName\tSteps\tRisk Score\tEntry Point';
    const rows = paths.map(p =>
      `${p.id.slice(0, 8)}\t${p.name}\t${p.steps.length}\t${p.totalRiskScore}\t${p.entryPoint}`
    );
    return [header, ...rows].join('\n');
  }

  private pathsToMarkdown(paths: AttackPath[]): string {
    let md = '| ID | Name | Steps | Risk Score | Entry Point |\n';
    md += '|---|---|---|---|---|\n';
    for (const p of paths) {
      md += `| ${p.id.slice(0, 8)} | ${p.name} | ${p.steps.length} | ${p.totalRiskScore} | ${p.entryPoint} |\n`;
    }
    return md;
  }

  private reportToTable(report: SecurityIntelligenceReport): string {
    let out = 'Security Intelligence Report\n';
    out += '============================\n';
    out += `ID:          ${report.id}\n`;
    out += `Run ID:      ${report.runId}\n`;
    out += `Timestamp:   ${report.timestamp.toISOString()}\n`;
    out += `Findings:    ${report.findings.length}\n`;
    out += `Risks:       ${report.risks.length}\n`;
    out += `Attack Paths: ${report.attackPaths.reduce((s, g) => s + g.statistics.totalPaths, 0)}\n`;
    out += `Recommendations: ${report.recommendations.length}\n`;
    out += `Duration:    ${report.metrics.totalDurationMs}ms\n`;
    return out;
  }

  private reportToMarkdown(report: SecurityIntelligenceReport): string {
    let md = '# Security Intelligence Report\n\n';
    md += `- **ID**: ${report.id}\n`;
    md += `- **Run ID**: ${report.runId}\n`;
    md += `- **Timestamp**: ${report.timestamp.toISOString()}\n`;
    md += `- **Findings**: ${report.findings.length}\n`;
    md += `- **Risks**: ${report.risks.length}\n`;
    md += `- **Attack Paths**: ${report.attackPaths.reduce((s, g) => s + g.statistics.totalPaths, 0)}\n`;
    md += `- **Recommendations**: ${report.recommendations.length}\n`;
    md += `- **Duration**: ${report.metrics.totalDurationMs}ms\n`;
    return md;
  }

  private toYaml(data: unknown, indent = 0): string {
    const prefix = '  '.repeat(indent);
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return `${prefix}"${data}"`;
    if (typeof data === 'number' || typeof data === 'boolean') return `${prefix}${data}`;
    if (data instanceof Date) return `${prefix}"${data.toISOString()}"`;
    if (Array.isArray(data)) {
      if (data.length === 0) return `${prefix}[]`;
      return data.map(item => `${prefix}- ${this.toYaml(item, indent + 1).trim()}`).join('\n');
    }
    if (typeof data === 'object') {
      const entries = Object.entries(data as Record<string, unknown>);
      if (entries.length === 0) return `${prefix}{}`;
      return entries.map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${prefix}${key}:\n${this.toYaml(value, indent + 1)}`;
        }
        return `${prefix}${key}: ${this.toYaml(value, 0).trim()}`;
      }).join('\n');
    }
    return `${prefix}${data}`;
  }
}
