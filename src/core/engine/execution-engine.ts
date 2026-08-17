/**
 * Execution Engine — AIS Core
 * Lifecycle: initialize() → start() → [execute()] → stop() → shutdown()
 * Conforms to: ARC-001.001, CON-001.000
 *
 * DR-01: Provider-Independent Core
 * DR-02: Event-Driven Coordination
 * DR-03: Single Memory Authority
 * DR-10: Autonomy-Level Aware
 * DR-11: Audit-Log All Side Effects
 *
 * Wave 1 TD-4: When AIS_EXECUTION_REAL=true, execute() runs the full
 * Discovery → Architecture Model → Context → LLM → Answer → Evidence pipeline.
 */
import { Runtime } from '../runtime/runtime.js';
import { DefaultEngineConfig, type EngineConfig } from '../config/engine-config.js';
import { DefaultTrustZoneGate, type TrustZoneGate } from '../zones/trust-zone-gate.js';
import { AutonomyLevel, EngineState } from '../types/common.js';

// Wave 1 TD-4: Pipeline components (imported unconditionally, used only behind feature flag)
import { DiscoveryPipelineService } from '../discovery/discovery-pipeline.service.js';
import { CognitiveRuntime } from '../cognitive/cognitive-runtime.js';
import { FileEvidenceStoreAdapter } from '../validation/evidence-store.js';
import type { EvidenceRecord, EvidenceSource } from '../validation/evidence-types.js';

/**
 * The shape of a Wave 1 architecture question request.
 */
export interface ArchitectureQuestionRequest {
  projectId: string;
  projectPath: string;
  question: string;
  taskId?: string;
}

/**
 * The shape of a Wave 1 architecture answer response.
 */
export interface ArchitectureAnswerResponse {
  readonly question: string;
  readonly answer: string;
  readonly sources: readonly EvidenceSource[];
  readonly evidence: EvidenceRecord | null;
  readonly model: string;
  readonly provider: string;
  readonly latencyMs: number;
  readonly discoveryStats: {
    readonly totalFiles: number;
    readonly modules: number;
    readonly dependencies: number;
    readonly techStack: readonly string[];
  };
}

export class ExecutionEngine {
  private runtime: Runtime;
  private trustZoneGate: TrustZoneGate;
  private _state = EngineState.Uninitialized;
  private _autonomyLevel: AutonomyLevel;

  // Wave 1 TD-4: Pipeline components (lazy-initialized behind feature flag)
  private _cognitiveRuntime: CognitiveRuntime | null = null;
  private _evidenceStore: FileEvidenceStoreAdapter | null = null;

  constructor(config?: Partial<EngineConfig>) {
    const fullConfig = { ...DefaultEngineConfig, ...config };
    this.runtime = new Runtime(fullConfig);
    this.trustZoneGate = new DefaultTrustZoneGate();
    this._autonomyLevel = fullConfig.defaultAutonomyLevel;
  }

  /** Current engine state */
  get state(): EngineState { return this._state; }

  /** Current autonomy level (ADR-009) */
  get autonomyLevel(): AutonomyLevel { return this._autonomyLevel; }

  /** Runtime reference for service registration */
  get services() { return this.runtime.services; }

  /** Event Bus reference */
  get eventBus() { return this.runtime.eventBus; }

  /** Lifecycle hooks */
  get hooks() { return this.runtime.hooks; }

  /** Trust zone gate */
  get zoneGate() { return this.trustZoneGate; }

  /** Wave 1: Access to evidence store for feedback operations */
  get evidenceStore(): FileEvidenceStoreAdapter | null { return this._evidenceStore; }

  /**
   * Phase 1: Initialize
   * Sets up infrastructure, validates configuration, registers core services.
   * Wave 1 TD-4: Also initializes CognitiveRuntime and EvidenceStore when flag is on.
   */
  async initialize(): Promise<void> {
    if (this._state !== EngineState.Uninitialized) {
      throw new Error(`Cannot initialize from state: ${this._state}`);
    }
    this._state = EngineState.Initializing;
    try {
      await this.runtime.initialize();

      // Wave 1 TD-4: Initialize pipeline components behind feature flag
      if (process.env.AIS_EXECUTION_REAL === 'true') {
        this._evidenceStore = new FileEvidenceStoreAdapter(
          process.env.AIS_EVIDENCE_PATH
        );
        this._cognitiveRuntime = new CognitiveRuntime({
          maxTokensPerTurn: 8192,
          defaultMaxOutputTokens: 4096,
          defaultTemperature: 0.3,
        });
        await this._cognitiveRuntime.initialize();
        await this._cognitiveRuntime.start();
      }

      this._state = EngineState.Ready;
    } catch (error) {
      this._state = EngineState.Error;
      throw error;
    }
  }

  /**
   * Phase 2: Start
   * Starts all services, opens event bus, begins health checks.
   */
  async start(): Promise<void> {
    if (this._state !== EngineState.Ready) {
      throw new Error(`Cannot start from state: ${this._state}`);
    }
    this._state = EngineState.Running;
    try {
      await this.runtime.start();
    } catch (error) {
      this._state = EngineState.Error;
      throw error;
    }
  }

  /**
   * Phase 3: Execute
   * Main execution loop — routes requests through AIS Controller.
   *
   * Wave 1 TD-4: When AIS_EXECUTION_REAL=true and request matches
   * ArchitectureQuestionRequest, runs the full Wave 1 pipeline:
   *   Discovery → Architecture Model → Context → Real LLM → Answer → Evidence
   *
   * When flag is off or request doesn't match, returns placeholder (original behavior).
   */
  async execute<T>(request: unknown): Promise<T> {
    if (this._state !== EngineState.Running) {
      throw new Error(`Cannot execute from state: ${this._state}`);
    }

    // Wave 1 TD-4: Feature-flagged real pipeline
    if (process.env.AIS_EXECUTION_REAL === 'true' && this.isArchitectureQuestion(request)) {
      return await this.executeWave1Pipeline(request) as unknown as T;
    }

    // Original placeholder behavior
    return {} as T;
  }

  /**
   * Execute the full Wave 1 vertical slice pipeline.
   *
   * Pipeline: Real Project → Discovery → Architecture Model → Context → Real LLM → Answer → Evidence
   */
  private async executeWave1Pipeline(request: ArchitectureQuestionRequest): Promise<ArchitectureAnswerResponse> {
    const pipelineStart = Date.now();

    if (!this._cognitiveRuntime || !this._evidenceStore) {
      throw new Error('Wave 1 pipeline not initialized. Set AIS_EXECUTION_REAL=true and AIS_REAL_LLM=true.');
    }

    // Step 1: Discovery — scan the project
    const discovery = new DiscoveryPipelineService({
      rootPath: request.projectPath,
    });
    await discovery.initialize();
    await discovery.start();

    const { discovery: discoveryResult, architectureGraph } = await discovery.discover(request.projectId);

    // Step 2: Build context from discovery data
    const projectContext = this.buildProjectContext(discoveryResult, architectureGraph);

    // Step 3: Process through CognitiveRuntime (which uses real LLM when AIS_REAL_LLM=true)
    const fullQuestion = `${request.question}\n\n---\nProject Context:\n${projectContext}`;

    const result = await this._cognitiveRuntime.process(fullQuestion);

    // Step 4: Extract evidence sources from discovery result relevant to the question
    const answerSources = this.extractRelevantSources(
      request.question,
      discoveryResult,
      architectureGraph,
    );

    // Step 5: Store evidence (immutable — never overwritten)
    const evidence = await this._evidenceStore.storeEvidence({
      taskId: request.taskId ?? 'WAVE1-SMOKE',
      projectId: request.projectId,
      question: request.question,
      answer: result.response,
      sources: answerSources,
      architectureModelHash: null, // Wave 1: no hash computation
      model: 'gpt-4o',
      provider: process.env.AIS_REAL_LLM === 'true' ? 'openai-real' : 'openai-stub',
      tokens: {
        promptTokens: result.tokens.promptTokens,
        completionTokens: result.tokens.completionTokens,
        totalTokens: result.tokens.totalTokens,
      },
      latencyMs: result.latencyMs,
    });

    return Object.freeze({
      question: request.question,
      answer: result.response,
      sources: Object.freeze(answerSources),
      evidence,
      model: process.env.AIS_REAL_LLM === 'true' ? 'gpt-4o' : 'stub',
      provider: process.env.AIS_REAL_LLM === 'true' ? 'openai-real' : 'openai-stub',
      latencyMs: Date.now() - pipelineStart,
      discoveryStats: Object.freeze({
        totalFiles: discoveryResult.totalFiles,
        modules: discoveryResult.modules.length,
        dependencies: discoveryResult.dependencies.length,
        techStack: discoveryResult.techStack.map(t => t.name),
      }),
    });
  }

  /**
   * Build a text summary of the project context from discovery results.
   */
  private buildProjectContext(
    discovery: Awaited<ReturnType<DiscoveryPipelineService['discover']>>['discovery'],
    _graph: Awaited<ReturnType<DiscoveryPipelineService['discover']>>['architectureGraph'],
  ): string {
    const parts: string[] = [];

    // Tech stack
    if (discovery.techStack.length > 0) {
      parts.push(`## Technology Stack\n${discovery.techStack.map(t => `- ${t.name}${t.version ? ` (${t.version})` : ''} [${t.category}]`).join('\n')}`);
    }

    // Modules
    if (discovery.modules.length > 0) {
      const moduleList = discovery.modules
        .slice(0, 30)
        .map(m => `- ${m.name} (${m.fileCount} files)${m.entryPoints.length > 0 ? ` [entry: ${m.entryPoints.join(', ')}]` : ''}`)
        .join('\n');
      parts.push(`## Modules (${discovery.modules.length} total)\n${moduleList}`);
    }

    // Dependencies (top 50)
    if (discovery.dependencies.length > 0) {
      const depList = discovery.dependencies
        .slice(0, 50)
        .map(d => `- ${d.from} → ${d.to} [${d.type}]`)
        .join('\n');
      parts.push(`## Internal Dependencies (showing 50 of ${discovery.dependencies.length})\n${depList}`);
    }

    // Entry points
    if (discovery.entryPoints.length > 0) {
      parts.push(`## Entry Points\n${discovery.entryPoints.map(ep => `- ${ep}`).join('\n')}`);
    }

    // Config files
    if (discovery.configFiles.length > 0) {
      parts.push(`## Configuration Files\n${discovery.configFiles.map(cf => `- ${cf}`).join('\n')}`);
    }

    // File statistics
    const extCount = new Map<string, number>();
    for (const f of discovery.files) {
      extCount.set(f.extension, (extCount.get(f.extension) ?? 0) + 1);
    }
    const extStats = Array.from(extCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ext, count]) => `- ${ext || '(no ext)'}: ${count}`)
      .join('\n');
    parts.push(`## File Statistics (Total: ${discovery.totalFiles} files, ${this.formatBytes(discovery.totalSize)})\n${extStats}`);

    return parts.join('\n\n');
  }

  /**
   * Extract evidence sources relevant to the question.
   */
  private extractRelevantSources(
    question: string,
    discovery: Awaited<ReturnType<DiscoveryPipelineService['discover']>>['discovery'],
    _graph: Awaited<ReturnType<DiscoveryPipelineService['discover']>>['architectureGraph'],
  ): EvidenceSource[] {
    const sources: EvidenceSource[] = [];
    const q = question.toLowerCase();

    // Include modules whose name matches question keywords
    for (const mod of discovery.modules) {
      const moduleName = mod.name.toLowerCase();
      if (q.includes(moduleName) || moduleName.includes(q.split(' ')[0])) {
        sources.push({
          filePath: mod.path,
          description: `Module: ${mod.name} (${mod.fileCount} files)`,
          relevance: 0.8,
          snippet: '',
        });
      }
    }

    // Include tech stack items mentioned in question
    for (const tech of discovery.techStack) {
      if (q.includes(tech.name.toLowerCase())) {
        sources.push({
          filePath: tech.evidence,
          description: `Technology: ${tech.name} [${tech.category}]`,
          relevance: 0.7,
          snippet: '',
        });
      }
    }

    // Include entry points
    for (const ep of discovery.entryPoints) {
      if (q.includes('entry') || q.includes('main') || q.includes('start')) {
        sources.push({
          filePath: ep,
          description: 'Entry point',
          relevance: 0.9,
          snippet: '',
        });
      }
    }

    // Include config files
    for (const cf of discovery.configFiles) {
      if (q.includes('config') || q.includes('setup') || q.includes('build')) {
        sources.push({
          filePath: cf,
          description: 'Configuration file',
          relevance: 0.6,
          snippet: '',
        });
      }
    }

    // Always include at least some top files as evidence
    if (sources.length === 0) {
      for (const f of discovery.files.slice(0, 10)) {
        sources.push({
          filePath: f.relativePath,
          description: `${f.extension} file`,
          relevance: 0.3,
          snippet: '',
        });
      }
    }

    return sources;
  }

  /**
   * Type guard for ArchitectureQuestionRequest.
   */
  private isArchitectureQuestion(request: unknown): request is ArchitectureQuestionRequest {
    if (typeof request !== 'object' || request === null) return false;
    const r = request as Record<string, unknown>;
    return (
      typeof r.projectId === 'string' &&
      typeof r.projectPath === 'string' &&
      typeof r.question === 'string'
    );
  }

  /**
   * Phase 4: Stop
   * Gracefully stops all services. No new requests accepted.
   */
  async stop(): Promise<void> {
    if (this._state !== EngineState.Running) {
      throw new Error(`Cannot stop from state: ${this._state}`);
    }
    this._state = EngineState.Stopping;
    try {
      await this.runtime.stop();
      this._state = EngineState.Stopped;
    } catch (error) {
      this._state = EngineState.Error;
      throw error;
    }
  }

  /**
   * Phase 5: Shutdown
   * Full teardown. Releases all resources. Not restartable.
   */
  async shutdown(): Promise<void> {
    if (this._state !== EngineState.Stopped) {
      throw new Error(`Cannot shutdown from state: ${this._state}`);
    }
    if (this._cognitiveRuntime) {
      await this._cognitiveRuntime.shutdown();
    }
    await this.runtime.shutdown();
    this._state = EngineState.ShutDown;
  }

  /** Set autonomy level (DR-10) */
  setAutonomyLevel(level: AutonomyLevel): void {
    this._autonomyLevel = level;
  }

  /** Format bytes to human readable */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
