/** Plugin metadata */
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  extensions: PluginExtensionPoint[];
}

/** Extension points where plugins can hook in */
export type PluginExtensionPoint =
  | 'correlation-rule'
  | 'risk-factor'
  | 'recommendation-rule'
  | 'cli-command'
  | 'rest-endpoint'
  | 'persistence-provider'
  | 'analysis-stage'
  | 'output-formatter';

/** Base plugin interface */
export interface SiPlugin {
  readonly manifest: PluginManifest;
  initialize(context: PluginContext): Promise<void>;
  destroy(): Promise<void>;
}

/** Plugin context — what plugins can access */
export interface PluginContext {
  logger: PluginLogger;
  config: Record<string, unknown>;
  registerCorrelationRule(rule: CorrelationRuleExtension): void;
  registerRiskFactor(factor: RiskFactorExtension): void;
  registerRecommendationRule(rule: RecommendationRuleExtension): void;
  registerCliCommand(command: CliCommandExtension): void;
  registerRestEndpoint(endpoint: RestEndpointExtension): void;
  registerPersistenceProvider(provider: PersistenceProviderExtension): void;
  registerAnalysisStage(stage: AnalysisStageExtension): void;
  registerOutputFormatter(formatter: OutputFormatterExtension): void;
}

/** Plugin logger */
export interface PluginLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

/** Extension: Correlation Rule */
export interface CorrelationRuleExtension {
  id: string;
  name: string;
  condition(a: Record<string, unknown>, b: Record<string, unknown>): boolean;
  scoreCalculator(a: Record<string, unknown>, b: Record<string, unknown>): number;
}

/** Extension: Risk Factor */
export interface RiskFactorExtension {
  id: string;
  name: string;
  weight: number;
  calculate(finding: Record<string, unknown>): number;
}

/** Extension: Recommendation Rule */
export interface RecommendationRuleExtension {
  id: string;
  name: string;
  appliesTo(finding: Record<string, unknown>): boolean;
  generate(finding: Record<string, unknown>, risk: Record<string, unknown>): RecommendationOutput;
}

export interface RecommendationOutput {
  title: string;
  description: string;
  priority: string;
  actions: Array<{ description: string; type: string; effort: string; riskReduction: number }>;
}

/** Extension: CLI Command */
export interface CliCommandExtension {
  name: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
  options: Array<{ flags: string; description: string; defaultValue?: unknown }>;
  execute(args: Record<string, unknown>): Promise<void>;
}

/** Extension: REST Endpoint */
export interface RestEndpointExtension {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (request: unknown, reply: unknown) => Promise<void>;
  schema?: Record<string, unknown>;
}

/** Extension: Persistence Provider */
export interface PersistenceProviderExtension {
  type: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  shutdown(): Promise<void>;
}

/** Extension: Analysis Stage */
export interface AnalysisStageExtension {
  name: string;
  order: number;
  process(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** Extension: Output Formatter */
export interface OutputFormatterExtension {
  format: string;
  formatFindings(findings: unknown[]): string;
  formatRisks(risks: unknown[]): string;
  formatReport(report: unknown): string;
}

/** Plugin registry entry */
export interface PluginEntry {
  manifest: PluginManifest;
  instance: SiPlugin;
  enabled: boolean;
  loadedAt: Date;
}
