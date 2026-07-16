import type {
  RawFinding,
  SecurityFinding,
  Severity,
  Confidence,
  FindingCategory,
  NormalizationRule,
  NormalizationResult,
  NormalizationStatistics,
} from './types.js';

/**
 * NormalizationEngine — transforms raw findings into canonical SecurityFinding models
 */
export class NormalizationEngine {
  private rules: Map<string, NormalizationRule> = new Map();

  addRule(rule: NormalizationRule): void {
    this.rules.set(rule.source, rule);
  }

  normalize(rawFindings: RawFinding[]): NormalizationResult {
    const findings: SecurityFinding[] = [];
    const skipped: Array<{ raw: RawFinding; reason: string }> = [];
    const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0, none: 0 };
    const byCategory: Record<FindingCategory, number> = {
      vulnerability: 0, misconfiguration: 0, exposure: 0, secret: 0,
      outdated: 0, 'policy-violation': 0, anomaly: 0,
    };
    const bySource: Record<string, number> = {};

    for (const raw of rawFindings) {
      try {
        const normalized = this.normalizeOne(raw);
        findings.push(normalized);
        bySeverity[normalized.severity]++;
        byCategory[normalized.category]++;
        bySource[normalized.source] = (bySource[normalized.source] ?? 0) + 1;
      } catch (err) {
        skipped.push({ raw, reason: (err as Error).message });
      }
    }

    return {
      findings,
      skipped,
      statistics: {
        total: rawFindings.length,
        normalized: findings.length,
        skipped: skipped.length,
        bySeverity,
        byCategory,
        bySource,
      },
    };
  }

  private normalizeOne(raw: RawFinding): SecurityFinding {
    const rule = this.rules.get(raw.source);
    const severity = this.mapSeverity(raw.severity, rule);
    const category = this.mapCategory(raw.category, rule);
    const confidence = rule?.confidenceDefault ?? 'medium';
    const tags = this.extractTags(raw, rule);
    const fingerprint = this.computeFingerprint(raw);

    return {
      id: crypto.randomUUID(),
      source: raw.source,
      sourceId: raw.sourceId,
      name: raw.name,
      description: raw.description,
      severity,
      category,
      confidence,
      host: raw.host ?? 'unknown',
      port: raw.port,
      protocol: raw.protocol,
      path: raw.path,
      evidence: raw.evidence ?? {},
      metadata: raw.metadata ?? {},
      timestamp: new Date(raw.timestamp),
      normalizedAt: new Date(),
      fingerprint,
      tags,
      cvssVector: raw.metadata?.cvssVector as string | undefined,
      cvssScore: raw.metadata?.cvssScore as number | undefined,
      cwe: (raw.metadata?.cwe as string[]) ?? [],
      cve: (raw.metadata?.cve as string[]) ?? [],
      references: (raw.metadata?.references as string[]) ?? [],
    };
  }

  private mapSeverity(raw: string, rule?: NormalizationRule): Severity {
    const normalized = raw.toLowerCase().trim();
    if (rule?.severityMapping[normalized]) return rule.severityMapping[normalized];
    const map: Record<string, Severity> = {
      critical: 'critical', high: 'high', medium: 'medium', low: 'low',
      info: 'info', informational: 'info', none: 'none', unknown: 'none',
    };
    return map[normalized] ?? 'medium';
  }

  private mapCategory(raw?: string, rule?: NormalizationRule): FindingCategory {
    if (!raw) return 'vulnerability';
    const normalized = raw.toLowerCase().trim();
    if (rule?.categoryMapping[normalized]) return rule.categoryMapping[normalized];
    const map: Record<string, FindingCategory> = {
      vulnerability: 'vulnerability', misconfiguration: 'misconfiguration',
      exposure: 'exposure', secret: 'secret', outdated: 'outdated',
      'policy-violation': 'policy-violation', anomaly: 'anomaly',
    };
    return map[normalized] ?? 'vulnerability';
  }

  private extractTags(raw: RawFinding, rule?: NormalizationRule): string[] {
    const tags: string[] = [];
    if (rule?.tagExtractors) {
      for (const ext of rule.tagExtractors) {
        const val = (raw as Record<string, unknown>)[ext.field];
        if (typeof val === 'string') {
          if (ext.pattern) {
            const match = val.match(new RegExp(ext.pattern));
            if (match) tags.push((ext.prefix ?? '') + match[0]);
          } else {
            tags.push((ext.prefix ?? '') + val);
          }
        }
      }
    }
    return [...new Set(tags)];
  }

  private computeFingerprint(raw: RawFinding): string {
    const parts = [raw.source, raw.name, raw.host ?? '', String(raw.port ?? '')];
    return parts.join('|');
  }
}
