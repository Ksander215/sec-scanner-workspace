/** INT-015: Detection Engineering — Types */

export type RuleType = 'sigma' | 'yara' | 'correlation-dsl' | 'custom';

export interface DetectionRule {
  id: string;
  type: RuleType;
  name: string;
  description: string;
  author: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  /** Original rule content (Sigma YAML, YARA rule, DSL expression) */
  content: string;
  /** Parsed/compiled rule */
  compiled?: CompiledRule;
  tags: string[];
  mitreAttack: MitreMapping[];
  references: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  /** Detection-as-Code: git reference */
  source?: { repo: string; path: string; commit: string };
}

export interface CompiledRule {
  type: RuleType;
  conditions: RuleCondition[];
  aggregations: RuleAggregation[];
  outputFields: Record<string, string>;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'startswith' | 'endswith' | 'regex' | 'gt' | 'lt' | 'in' | 'contains-all' | 'contains-any';
  value: unknown;
}

export interface RuleAggregation {
  field: string;
  function: 'count' | 'sum' | 'avg' | 'min' | 'max';
  groupBy?: string[];
  having?: { operator: string; value: number };
  timeframeMs?: number;
}

export interface MitreMapping {
  tactic: string;
  technique: string;
  subtechnique?: string;
}

export interface DetectionResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  severity: string;
  fields: Record<string, unknown>;
  timestamp: Date;
  evidence: string[];
}

export interface SigmaRule {
  title: string;
  id: string;
  status: string;
  description: string;
  author: string;
  date: string;
  modified?: string;
  tags: string[];
  logsource: Record<string, string>;
  detection: {
    selection?: Record<string, unknown>;
    condition: string;
    timeframe?: string;
  };
  level: string;
  falsepositives?: string[];
}

export interface YaraRule {
  name: string;
  meta: Record<string, string>;
  strings: YaraString[];
  condition: string;
}

export interface YaraString {
  identifier: string;
  type: 'text' | 'hex' | 'regex';
  value: string;
  modifiers?: string[];
}

export interface CorrelationDslExpression {
  expression: string;
  variables: Record<string, unknown>;
}

export interface DetectionEngineConfig {
  maxRules: number;
  defaultTimeframeMs: number;
  enableCaching: boolean;
  cacheTtlMs: number;
}
