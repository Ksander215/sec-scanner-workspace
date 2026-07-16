/** INT-015: Detection Engineering — Engine */
import type {
  DetectionRule, RuleType, DetectionResult, SigmaRule, YaraRule,
  RuleCondition, CompiledRule, DetectionEngineConfig, MitreMapping,
} from './types.js';

const DEFAULT_CONFIG: DetectionEngineConfig = {
  maxRules: 10000,
  defaultTimeframeMs: 300000,
  enableCaching: true,
  cacheTtlMs: 60000,
};

export class DetectionEngine {
  private config: DetectionEngineConfig;
  private rules: Map<string, DetectionRule> = new Map();
  private matchCache: Map<string, { result: boolean; at: number }> = new Map();

  constructor(config?: Partial<DetectionEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Add a detection rule */
  addRule(rule: Omit<DetectionRule, 'id' | 'createdAt' | 'updatedAt' | 'version'>): DetectionRule {
    if (this.rules.size >= this.config.maxRules) {
      throw new Error(`Maximum rules limit reached (${this.config.maxRules})`);
    }

    const detectionRule: DetectionRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      compiled: this.compileRule(rule.type, rule.content),
    };

    this.rules.set(detectionRule.id, detectionRule);
    return detectionRule;
  }

  /** Import a Sigma rule */
  importSigmaRule(sigma: SigmaRule): DetectionRule {
    return this.addRule({
      type: 'sigma',
      name: sigma.title,
      description: sigma.description,
      author: sigma.author,
      severity: sigma.level as DetectionRule['severity'],
      enabled: true,
      content: JSON.stringify(sigma),
      tags: sigma.tags,
      mitreAttack: sigma.tags
        .filter(t => t.startsWith('attack.'))
        .map(t => ({ tactic: t.replace('attack.', ''), technique: '' })),
      references: [],
    });
  }

  /** Import a YARA rule */
  importYaraRule(yara: YaraRule): DetectionRule {
    return this.addRule({
      type: 'yara',
      name: yara.name,
      description: yara.meta.description ?? '',
      author: yara.meta.author ?? '',
      severity: (yara.meta.severity as DetectionRule['severity']) ?? 'medium',
      enabled: true,
      content: JSON.stringify(yara),
      tags: yara.meta.tags?.split(',') ?? [],
      mitreAttack: [],
      references: [],
    });
  }

  /** Evaluate all rules against a log event */
  evaluate(event: Record<string, unknown>): DetectionResult[] {
    const results: DetectionResult[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled || !rule.compiled) continue;

      // Check cache
      const cacheKey = `${rule.id}:${JSON.stringify(event)}`;
      if (this.config.enableCaching) {
        const cached = this.matchCache.get(cacheKey);
        if (cached && Date.now() - cached.at < this.config.cacheTtlMs) {
          if (cached.result) {
            results.push({ ruleId: rule.id, ruleName: rule.name, matched: true, severity: rule.severity, fields: event, timestamp: new Date(), evidence: [] });
          }
          continue;
        }
      }

      const matched = this.matchRule(rule.compiled, event);
      if (matched) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: true,
          severity: rule.severity,
          fields: event,
          timestamp: new Date(),
          evidence: this.extractEvidence(rule, event),
        });
      }

      if (this.config.enableCaching) {
        this.matchCache.set(cacheKey, { result: matched, at: Date.now() });
      }
    }

    return results;
  }

  /** Get a rule by ID */
  getRule(id: string): DetectionRule | undefined {
    return this.rules.get(id);
  }

  /** List rules */
  listRules(filter?: { type?: RuleType; enabled?: boolean; severity?: string }): DetectionRule[] {
    let results = [...this.rules.values()];
    if (filter?.type) results = results.filter(r => r.type === filter.type);
    if (filter?.enabled !== undefined) results = results.filter(r => r.enabled === filter.enabled);
    if (filter?.severity) results = results.filter(r => r.severity === filter.severity);
    return results;
  }

  /** Update a rule */
  updateRule(id: string, updates: Partial<Pick<DetectionRule, 'name' | 'description' | 'content' | 'severity' | 'enabled' | 'tags'>>): DetectionRule | null {
    const rule = this.rules.get(id);
    if (!rule) return null;

    if (updates.name) rule.name = updates.name;
    if (updates.description) rule.description = updates.description;
    if (updates.content) {
      rule.content = updates.content;
      rule.compiled = this.compileRule(rule.type, updates.content);
    }
    if (updates.severity) rule.severity = updates.severity;
    if (updates.enabled !== undefined) rule.enabled = updates.enabled;
    if (updates.tags) rule.tags = updates.tags;

    rule.updatedAt = new Date();
    rule.version++;
    return rule;
  }

  /** Delete a rule */
  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /** Get statistics */
  getStatistics(): { totalRules: number; byType: Record<RuleType, number>; bySeverity: Record<string, number>; enabled: number } {
    const byType = {} as Record<RuleType, number>;
    const bySeverity: Record<string, number> = {};
    let enabled = 0;

    for (const rule of this.rules.values()) {
      byType[rule.type] = (byType[rule.type] ?? 0) + 1;
      bySeverity[rule.severity] = (bySeverity[rule.severity] ?? 0) + 1;
      if (rule.enabled) enabled++;
    }

    return { totalRules: this.rules.size, byType, bySeverity, enabled };
  }

  // ─── Private ──────────────────────────────────────────────────────────

  private compileRule(type: RuleType, content: string): CompiledRule {
    switch (type) {
      case 'sigma': return this.compileSigma(content);
      case 'yara': return this.compileYara(content);
      case 'correlation-dsl': return this.compileCorrelationDsl(content);
      default: return { type, conditions: [], aggregations: [], outputFields: {} };
    }
  }

  private compileSigma(content: string): CompiledRule {
    try {
      const sigma = JSON.parse(content) as SigmaRule;
      const conditions: RuleCondition[] = [];

      if (sigma.detection.selection) {
        for (const [field, value] of Object.entries(sigma.detection.selection)) {
          conditions.push({ field, operator: 'eq', value });
        }
      }

      return { type: 'sigma', conditions, aggregations: [], outputFields: {} };
    } catch {
      return { type: 'sigma', conditions: [], aggregations: [], outputFields: {} };
    }
  }

  private compileYara(content: string): CompiledRule {
    try {
      const yara = JSON.parse(content) as YaraRule;
      const conditions: RuleCondition[] = yara.strings.map(s => ({
        field: s.identifier,
        operator: s.type === 'regex' ? 'regex' : 'contains',
        value: s.value,
      }));

      return { type: 'yara', conditions, aggregations: [], outputFields: yara.meta };
    } catch {
      return { type: 'yara', conditions: [], aggregations: [], outputFields: {} };
    }
  }

  private compileCorrelationDsl(_content: string): CompiledRule {
    return { type: 'correlation-dsl', conditions: [], aggregations: [], outputFields: {} };
  }

  private matchRule(compiled: CompiledRule, event: Record<string, unknown>): boolean {
    for (const condition of compiled.conditions) {
      const fieldValue = event[condition.field];
      switch (condition.operator) {
        case 'eq': if (fieldValue !== condition.value) return false; break;
        case 'neq': if (fieldValue === condition.value) return false; break;
        case 'contains': if (typeof fieldValue === 'string' && !fieldValue.includes(String(condition.value))) return false; break;
        case 'regex': if (typeof fieldValue === 'string') { try { if (!new RegExp(String(condition.value)).test(fieldValue)) return false; } catch { return false; } } break;
        case 'gt': if (Number(fieldValue) <= Number(condition.value)) return false; break;
        case 'lt': if (Number(fieldValue) >= Number(condition.value)) return false; break;
        case 'in': if (Array.isArray(condition.value) && !condition.value.includes(fieldValue)) return false; break;
        case 'startswith': if (typeof fieldValue === 'string' && !fieldValue.startsWith(String(condition.value))) return false; break;
        case 'endswith': if (typeof fieldValue === 'string' && !fieldValue.endsWith(String(condition.value))) return false; break;
      }
    }
    return compiled.conditions.length > 0;
  }

  private extractEvidence(rule: DetectionRule, event: Record<string, unknown>): string[] {
    if (!rule.compiled) return [];
    return rule.compiled.conditions
      .filter(c => event[c.field] !== undefined)
      .map(c => `${c.field} ${c.operator} ${String(c.value)} (actual: ${String(event[c.field])})`);
  }
}
