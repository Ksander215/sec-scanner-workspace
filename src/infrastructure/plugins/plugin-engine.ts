import type {
  SiPlugin, PluginManifest, PluginContext, PluginEntry, PluginLogger,
  CorrelationRuleExtension, RiskFactorExtension, RecommendationRuleExtension,
  CliCommandExtension, RestEndpointExtension, PersistenceProviderExtension,
  AnalysisStageExtension, OutputFormatterExtension,
} from './types.js';

export class PluginEngine {
  private plugins: Map<string, PluginEntry> = new Map();
  private correlationRules: CorrelationRuleExtension[] = [];
  private riskFactors: RiskFactorExtension[] = [];
  private recommendationRules: RecommendationRuleExtension[] = [];
  private cliCommands: CliCommandExtension[] = [];
  private restEndpoints: RestEndpointExtension[] = [];
  private persistenceProviders: PersistenceProviderExtension[] = [];
  private analysisStages: AnalysisStageExtension[] = [];
  private outputFormatters: OutputFormatterExtension[] = [];

  async loadPlugin(plugin: SiPlugin, config: Record<string, unknown> = {}): Promise<void> {
    const manifest = plugin.manifest;

    if (this.plugins.has(manifest.name)) {
      throw new Error(`Plugin "${manifest.name}" is already loaded`);
    }

    const context = this.createContext(manifest.name, config);
    await plugin.initialize(context);

    this.plugins.set(manifest.name, {
      manifest,
      instance: plugin,
      enabled: true,
      loadedAt: new Date(),
    });
  }

  async unloadPlugin(name: string): Promise<void> {
    const entry = this.plugins.get(name);
    if (!entry) throw new Error(`Plugin "${name}" not found`);
    await entry.instance.destroy();
    this.plugins.delete(name);
  }

  getPlugin(name: string): PluginEntry | undefined {
    return this.plugins.get(name);
  }

  listPlugins(): PluginEntry[] {
    return [...this.plugins.values()];
  }

  getCorrelationRules(): CorrelationRuleExtension[] { return this.correlationRules; }
  getRiskFactors(): RiskFactorExtension[] { return this.riskFactors; }
  getRecommendationRules(): RecommendationRuleExtension[] { return this.recommendationRules; }
  getCliCommands(): CliCommandExtension[] { return this.cliCommands; }
  getRestEndpoints(): RestEndpointExtension[] { return this.restEndpoints; }
  getPersistenceProviders(): PersistenceProviderExtension[] { return this.persistenceProviders; }
  getAnalysisStages(): AnalysisStageExtension[] {
    return [...this.analysisStages].sort((a, b) => a.order - b.order);
  }
  getOutputFormatters(): OutputFormatterExtension[] { return this.outputFormatters; }

  private createContext(pluginName: string, config: Record<string, unknown>): PluginContext {
    const logger = this.createLogger(pluginName);

    return {
      logger,
      config,
      registerCorrelationRule: (rule) => { this.correlationRules.push(rule); logger.info(`Registered correlation rule: ${rule.name}`); },
      registerRiskFactor: (factor) => { this.riskFactors.push(factor); logger.info(`Registered risk factor: ${factor.name}`); },
      registerRecommendationRule: (rule) => { this.recommendationRules.push(rule); logger.info(`Registered recommendation rule: ${rule.name}`); },
      registerCliCommand: (command) => { this.cliCommands.push(command); logger.info(`Registered CLI command: ${command.name}`); },
      registerRestEndpoint: (endpoint) => { this.restEndpoints.push(endpoint); logger.info(`Registered REST endpoint: ${endpoint.method} ${endpoint.path}`); },
      registerPersistenceProvider: (provider) => { this.persistenceProviders.push(provider); logger.info(`Registered persistence provider: ${provider.type}`); },
      registerAnalysisStage: (stage) => { this.analysisStages.push(stage); logger.info(`Registered analysis stage: ${stage.name} (order: ${stage.order})`); },
      registerOutputFormatter: (formatter) => { this.outputFormatters.push(formatter); logger.info(`Registered output formatter: ${formatter.format}`); },
    };
  }

  private createLogger(pluginName: string): PluginLogger {
    return {
      debug: (msg, data) => console.debug(`[plugin:${pluginName}] ${msg}`, data ?? ''),
      info: (msg, data) => console.info(`[plugin:${pluginName}] ${msg}`, data ?? ''),
      warn: (msg, data) => console.warn(`[plugin:${pluginName}] ${msg}`, data ?? ''),
      error: (msg, data) => console.error(`[plugin:${pluginName}] ${msg}`, data ?? ''),
    };
  }
}
