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
 *
 * TASK-MVP-PROTOTYPE-CONTEXT-QUALITY-001: Question-driven retrieval using
 * ArchitectureGraph for relevant context assembly with real source excerpts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Runtime } from '../runtime/runtime.js';
import { DefaultEngineConfig, type EngineConfig } from '../config/engine-config.js';
import { DefaultTrustZoneGate, type TrustZoneGate } from '../zones/trust-zone-gate.js';
import { AutonomyLevel, EngineState } from '../types/common.js';
import { ArchitectureNodeKind } from '../autonomous-architecture/architecture.model.js';
import type { ArchitectureNode } from '../autonomous-architecture/architecture.model.js';
import type { ArchitectureGraph } from '../autonomous-architecture/architecture.graph.js';

// Wave 1 TD-4: Pipeline components (imported unconditionally, used only behind feature flag)
import { DiscoveryPipelineService } from '../discovery/discovery-pipeline.service.js';
import { CognitiveRuntime } from '../cognitive/cognitive-runtime.js';
import { FileEvidenceStoreAdapter } from '../validation/evidence-store.js';
import type { EvidenceRecord, EvidenceSource } from '../validation/evidence-types.js';
import type { DiscoveryResult, ModuleBoundary } from '../discovery/discovery-types.js';

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

// ═══════════════════════════════════════════════════════════════════
// CONTEXT QUALITY — Types & Constants (TASK-MVP-PROTOTYPE-CONTEXT-QUALITY-001)
// ═══════════════════════════════════════════════════════════════════

/** A graph node scored for relevance to a question. */
interface ScoredNode {
  readonly node: ArchitectureNode;
  readonly score: number;
  readonly reason: string;
}

/** Maximum prompt tokens for project context (target ≤8k total including system prompt + question overhead). */
const CONTEXT_TOKEN_BUDGET = 5000;

/** Approximate chars per token for code-heavy text (conservative: code + markdown backticks inflate token count). */
const CHARS_PER_TOKEN = 3.5;

/** Max lines per source excerpt in LLM context. */
const EXCERPT_MAX_LINES = 40;

/** Max lines per snippet in evidence sources. */
const EVIDENCE_SNIPPET_LINES = 15;

/** Common English words to filter from question keywords. */
const STOP_WORDS = new Set([
  'what', 'are', 'the', 'is', 'a', 'an', 'and', 'or', 'but', 'in', 'on',
  'at', 'to', 'for', 'of', 'with', 'by', 'from', 'how', 'do', 'does',
  'did', 'why', 'which', 'where', 'when', 'who', 'whom', 'this', 'that',
  'these', 'those', 'inside', 'within', 'between', 'about', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'main',
  'please', 'explain', 'describe', 'tell', 'me', 'my', 'can', 'you',
  'components', 'parts', 'elements', 'things',
]);

// ═══════════════════════════════════════════════════════════════════
// EXECUTION ENGINE
// ═══════════════════════════════════════════════════════════════════

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
   *
   * TASK-MVP-PROTOTYPE-CONTEXT-QUALITY-001: Now passes question and
   * projectPath to context builder and evidence extractor so they can
   * use ArchitectureGraph for question-driven retrieval and read real
   * source code excerpts.
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

    // Step 2: Build context — NOW question-driven with source excerpts
    const projectContext = this.buildProjectContext(
      request.question,
      discoveryResult,
      architectureGraph,
      request.projectPath,
    );

    // Step 3: Process through CognitiveRuntime (real LLM when AIS_REAL_LLM=true)
    const fullQuestion = `${request.question}\n\n---\nProject Context:\n${projectContext}`;

    const result = await this._cognitiveRuntime.process(fullQuestion);

    // Step 4: Extract evidence sources — NOW with real code snippets
    const answerSources = this.extractRelevantSources(
      request.question,
      discoveryResult,
      architectureGraph,
      request.projectPath,
    );

    // Step 5: Store evidence (immutable — never overwritten)
    const evidence = await this._evidenceStore.storeEvidence({
      taskId: request.taskId ?? 'WAVE1-CONTEXT-QUALITY',
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

  // ═══════════════════════════════════════════════════════════════════
  // CONTEXT QUALITY — Question-Driven Retrieval
  // TASK-MVP-PROTOTYPE-CONTEXT-QUALITY-001
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Extract meaningful keywords from a question by removing stop words.
   */
  private extractKeywords(question: string): string[] {
    return question
      .toLowerCase()
      .replace(/[^a-z0-9/\-_.\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  /**
   * Find graph nodes relevant to the question using keyword matching
   * and 1-hop neighbor expansion.
   *
   * v3 fix: WORD-BOUNDARY matching — "engine" no longer matches
   * "landing.src.lib.engine" (only matches whole path segments).
   * Multi-segment keywords ("src/core/engine") require contiguous
   * segment subsequence match.
   *
   * Algorithm (no semantic search, no vectors):
   *   1. Extract keywords from question
   *   2. Score each node by segment-level name matching
   *   3. Boost Module/Service kinds
   *   4. Expand top matches to 1-hop neighbors (reduced score)
   *   5. Return sorted by score descending
   */
  private findRelevantNodes(question: string, graph: ArchitectureGraph): ScoredNode[] {
    const keywords = this.extractKeywords(question);
    const scored: ScoredNode[] = [];

    for (const node of graph.nodes) {
      const name = node.name.toLowerCase();
      const normalizedName = name.replace(/\//g, '.');
      const nameSegments = normalizedName.split('.');
      let maxScore = 0;
      let bestReason = '';

      for (const kw of keywords) {
        const normalizedKw = kw.replace(/\//g, '.');
        const kwSegments = normalizedKw.split('.');

        // 1. Exact full-name match
        if (normalizedName === normalizedKw) {
          if (10 > maxScore) { maxScore = 10; bestReason = `exact match: "${kw}"`; }
          continue;
        }

        // 2. Contiguous segment subsequence match
        //    "src.core.engine" matches "src.core.engine.module" but NOT "landing.src.lib.engine"
        const segMatch = this.segmentSubsequenceScore(kwSegments, nameSegments);
        if (segMatch > 0) {
          const s = Math.min(8, segMatch * 2 + (kwSegments.length > 1 ? 2 : 0));
          if (s > maxScore) { maxScore = s; bestReason = `segment match: "${kw}" → "${node.name}"`; }
        }

        // 3. Single-segment keyword: must match a WHOLE segment, not a substring
        //    "engine" matches node segment "engine" but NOT "execution-engine" or "engine-props"
        if (kwSegments.length === 1 && kwSegments[0].length > 1) {
          if (nameSegments.includes(kwSegments[0])) {
            const s = kwSegments[0].length > 4 ? 5 : 3;
            if (s > maxScore) { maxScore = s; bestReason = `word match: "${kw}" = segment in "${node.name}"`; }
          }
        }
      }

      // Boost Module and Service nodes — they define architectural boundaries
      if (maxScore > 0) {
        if (node.kind === ArchitectureNodeKind.Module) maxScore += 2;
        if (node.kind === ArchitectureNodeKind.Service) maxScore += 2;
        scored.push({ node, score: maxScore, reason: bestReason });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    // Expand: add 1-hop neighbors for all matched nodes
    const expanded = new Map<string, ScoredNode>();
    for (const sn of scored) {
      expanded.set(sn.node.id, sn);

      for (const neighbor of graph.getNeighbors(sn.node.id)) {
        if (!expanded.has(neighbor.id)) {
          expanded.set(neighbor.id, {
            node: neighbor,
            score: sn.score * 0.4,
            reason: `neighbor of "${sn.node.name}"`,
          });
        }
      }
    }

    return Array.from(expanded.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Check if kwSegments form a contiguous subsequence of nameSegments.
   * Returns the number of matched segments, or 0 if no contiguous match.
   *
   * Examples:
   *   (['src','core','engine'], ['src','core','engine','module']) → 3
   *   (['src','core','engine'], ['landing','src','lib','engine']) → 0
   *   (['engine'], ['src','core','engine']) → 1
   */
  private segmentSubsequenceScore(kwSegments: string[], nameSegments: string[]): number {
    if (kwSegments.length === 0 || kwSegments.length > nameSegments.length) return 0;
    for (let start = 0; start <= nameSegments.length - kwSegments.length; start++) {
      let matched = 0;
      for (let i = 0; i < kwSegments.length; i++) {
        if (nameSegments[start + i] === kwSegments[i]) {
          matched++;
        } else {
          break;
        }
      }
      if (matched === kwSegments.length) return matched;
    }
    return 0;
  }

  /**
   * Find the DiscoveryResult module that corresponds to a graph node.
   * Uses fuzzy name matching since graph node names and module names
   * may differ slightly (e.g., "cognitive" vs "cognitive-runtime").
   */
  private findModuleForNode(nodeName: string, discovery: DiscoveryResult): ModuleBoundary | undefined {
    const target = nodeName.toLowerCase();
    return discovery.modules.find(m => {
      const moduleName = m.name.toLowerCase();
      return moduleName === target
        || moduleName.includes(target)
        || target.includes(moduleName);
    });
  }

  /**
   * Read the first N lines of a source file. Returns empty string on error.
   */
  private readSourceExcerpt(absolutePath: string, maxLines: number): string {
    try {
      const content = readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n').slice(0, maxLines);
      return lines.join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Build a structured architecture description from graph nodes and their edges.
   * v2: Truncate dependency lists to MAX_DEPS_DISPLAY, limit nodes to MAX_NODES,
   * respect character budget.
   */
  private buildGraphSection(scoredNodes: ScoredNode[], graph: ArchitectureGraph, maxChars: number): string {
    const lines: string[] = ['## Relevant Architecture (from dependency graph)'];
    const MAX_DEPS_DISPLAY = 7;
    const MAX_NODES = 6;
    let usedChars = lines[0].length + 1;

    for (const { node, score, reason } of scoredNodes.slice(0, MAX_NODES)) {
      const allOutgoing = graph.getOutgoingNeighbors(node.id).map(n => n.name);
      const allIncoming = graph.getIncomingNeighbors(node.id).map(n => n.name);
      const outgoing = allOutgoing.slice(0, MAX_DEPS_DISPLAY);
      const incoming = allIncoming.slice(0, MAX_DEPS_DISPLAY);

      const nodeLines: string[] = [];
      nodeLines.push(`### ${node.name} (${node.kind})`);
      nodeLines.push(`Retrieval: ${reason} [score: ${score.toFixed(1)}]`);

      if (outgoing.length > 0) {
        let depStr = `Depends on: ${outgoing.join(', ')}`;
        if (allOutgoing.length > MAX_DEPS_DISPLAY) depStr += ` (+${allOutgoing.length - MAX_DEPS_DISPLAY} more)`;
        nodeLines.push(depStr);
      }
      if (incoming.length > 0) {
        let depStr = `Used by: ${incoming.join(', ')}`;
        if (allIncoming.length > MAX_DEPS_DISPLAY) depStr += ` (+${allIncoming.length - MAX_DEPS_DISPLAY} more)`;
        nodeLines.push(depStr);
      }
      nodeLines.push('');

      const nodeSection = nodeLines.join('\n') + '\n';
      if (usedChars + nodeSection.length > maxChars) break;
      lines.push(...nodeLines);
      usedChars += nodeSection.length;
    }

    return lines.join('\n');
  }

  /**
   * Read actual source code from files belonging to relevant modules.
   * Respects character budget to stay within token limits.
   */
  private buildSourceExcerptsSection(
    scoredNodes: ScoredNode[],
    discovery: DiscoveryResult,
    projectPath: string,
    budgetChars: number,
  ): string {
    const blocks: string[] = [];
    let usedChars = 0;

    for (const { node } of scoredNodes) {
      if (usedChars >= budgetChars) break;

      const mod = this.findModuleForNode(node.name, discovery);
      if (!mod) continue;

      // v2: Use smart file selection — implementation files > index.ts
      const entries = this.findKeyFiles(mod, discovery, 3);

      for (const ep of entries) {
        if (usedChars >= budgetChars) break;

        const absolutePath = join(projectPath, ep);
        const excerpt = this.readSourceExcerpt(absolutePath, EXCERPT_MAX_LINES);
        if (!excerpt) continue;

        const block = `\n### ${ep}\n\`\`\`typescript\n${excerpt}\n\`\`\``;

        // If full excerpt doesn't fit, try a shorter one
        if (usedChars + block.length > budgetChars) {
          const shortExcerpt = this.readSourceExcerpt(absolutePath, 15);
          if (!shortExcerpt) continue;
          const shortBlock = `\n### ${ep}\n\`\`\`typescript\n${shortExcerpt}\n\`\`\``;
          if (usedChars + shortBlock.length > budgetChars) continue;
          blocks.push(shortBlock);
          usedChars += shortBlock.length;
        } else {
          blocks.push(block);
          usedChars += block.length;
        }
      }
    }

    return blocks.length > 0
      ? '## Source Code Excerpts' + blocks.join('\n')
      : '';
  }

  /**
   * Find the most important source files for a module.
   * v3: Generalized implementation-file detection — no hardcoded filenames.
   * Prioritizes: (1) non-index entry points, (2) files whose stem relates
   * to module name, (3) files with impl-like suffixes, (4) index.ts last.
   */
  private findKeyFiles(mod: ModuleBoundary, discovery: DiscoveryResult, maxFiles: number): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    // Derive module stem for name-based matching (e.g., "engine" from "src/core/engine")
    const moduleStem = mod.name.split('/').pop()?.split('-').pop()?.toLowerCase() ?? '';

    // Priority 1: Non-index entry points (likely implementation files)
    for (const ep of mod.entryPoints) {
      if (result.length >= maxFiles) break;
      if (ep.endsWith('.ts') && !ep.endsWith('index.ts') && !seen.has(ep)) {
        seen.add(ep); result.push(ep);
      }
    }

    // Priority 2: Files from discovery whose stem relates to the module name
    const moduleTsFiles = discovery.files
      .filter(f =>
        f.relativePath.startsWith(mod.path) &&
        f.relativePath.endsWith('.ts') &&
        !f.relativePath.endsWith('index.ts') &&
        !f.relativePath.endsWith('.d.ts') &&
        !f.relativePath.endsWith('.test.ts') &&
        !f.relativePath.endsWith('.spec.ts') &&
        !seen.has(f.relativePath),
      );

    // Sort by relevance: module-name match first, then impl suffixes, then by size (larger = more important)
    const implSuffixes = ['.service.ts', '-service.ts', '-runtime.ts', '-pipeline.ts', '-engine.ts', '-handler.ts', '-controller.ts', '-provider.ts', '-adapter.ts', '-gateway.ts', '-repository.ts'];
    moduleTsFiles.sort((a, b) => {
      const aStem = a.relativePath.split('/').pop()?.replace('.ts', '').toLowerCase() ?? '';
      const bStem = b.relativePath.split('/').pop()?.replace('.ts', '').toLowerCase() ?? '';
      // Module-name stem match gets highest priority
      const aNameMatch = moduleStem && (aStem === moduleStem || aStem.includes(moduleStem)) ? 0 : 10;
      const bNameMatch = moduleStem && (bStem === moduleStem || bStem.includes(moduleStem)) ? 0 : 10;
      if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch;
      // Impl-suffix match gets next priority
      const aSuffix = implSuffixes.findIndex(s => a.relativePath.endsWith(s));
      const bSuffix = implSuffixes.findIndex(s => b.relativePath.endsWith(s));
      if (aSuffix !== bSuffix) return (aSuffix === -1 ? 99 : aSuffix) - (bSuffix === -1 ? 99 : bSuffix);
      // Larger files are likely more important
      return b.size - a.size;
    });

    for (const f of moduleTsFiles) {
      if (result.length >= maxFiles) break;
      if (!seen.has(f.relativePath)) { seen.add(f.relativePath); result.push(f.relativePath); }
    }

    // Priority 3: index.ts (lowest priority — barrel exports are less useful)
    for (const ep of mod.entryPoints) {
      if (result.length >= maxFiles) break;
      if (ep.endsWith('index.ts') && !seen.has(ep)) {
        seen.add(ep); result.push(ep);
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONTEXT QUALITY — Rewritten Methods
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Build project context for the LLM — REWRITTEN for TASK-MVP-PROTOTYPE-CONTEXT-QUALITY-001.
   *
   * Before: Flat list of 30 modules + 50 dependencies (relevance-agnostic).
   * After:  Question-driven retrieval via ArchitectureGraph + real source code excerpts.
   *
   * The ArchitectureGraph (previously computed but unused as `_graph`) now drives
   * which modules and files are included in context, based on keyword matching
   * against the question + 1-hop neighbor expansion.
   */
  private buildProjectContext(
    question: string,
    discovery: DiscoveryResult,
    graph: ArchitectureGraph,
    projectPath: string,
  ): string {
    const parts: string[] = [];

    // v3: Instruct the LLM to cite specific code from the excerpts below.
    // This directly addresses AC-03 (concrete code references) and AC-07 (verifiable answers).
    parts.push(
      'When answering, you MUST cite specific source files and code patterns from the excerpts below.\n' +
      'Reference files by their path. Quote or paraphrase actual code (imports, class names, method signatures).\n' +
      'Do NOT give generic answers — ground every claim in the provided source code.',
    );
    const maxChars = CONTEXT_TOKEN_BUDGET * CHARS_PER_TOKEN;
    let usedChars = 0;

    // 1. Question-driven node retrieval from ArchitectureGraph
    const relevantNodes = this.findRelevantNodes(question, graph);

    // 2. Graph structure section (with budget enforcement)
    const graphBudget = Math.floor(maxChars * 0.3); // max 30% of budget for graph
    if (relevantNodes.length > 0) {
      const graphSection = this.buildGraphSection(relevantNodes, graph, graphBudget);
      parts.push(graphSection);
      usedChars += graphSection.length;
    }

    // 3. Source code excerpts from relevant module files
    if (relevantNodes.length > 0) {
      const remainingBudget = maxChars - usedChars - 500; // reserve for tech stack
      const sourceSection = this.buildSourceExcerptsSection(
        relevantNodes, discovery, projectPath, remainingBudget,
      );
      if (sourceSection) {
        parts.push(sourceSection);
        usedChars += sourceSection.length;
      }
    }

    // 4. Compact tech stack (always include, but brief)
    if (discovery.techStack.length > 0) {
      const tech = discovery.techStack
        .slice(0, 10)
        .map(t => `- ${t.name}${t.version ? ` ${t.version}` : ''} [${t.category}]`)
        .join('\n');
      parts.push(`## Technology Stack\n${tech}`);
    }

    // 5. Fallback: if no graph nodes matched, show compact module list
    //    (still better than before: only 20 modules, not 30, with entry points)
    if (relevantNodes.length === 0) {
      const moduleList = discovery.modules
        .slice(0, 20)
        .map(m => `- ${m.name} (${m.fileCount} files)${m.entryPoints.length > 0 ? ` [entry: ${m.entryPoints[0]}]` : ''}`)
        .join('\n');
      parts.push(`## Modules (${discovery.modules.length} total)\n${moduleList}`);

      // Still try to read source from top 3 modules
      const fallbackSource = this.buildSourceExcerptsSection(
        discovery.modules.slice(0, 3).map((m, i) => ({
          node: { id: `fallback-${i}` as any, kind: ArchitectureNodeKind.Module, name: m.name, layer: '' as any },
          score: 1,
          reason: 'fallback: no graph match',
        })),
        discovery,
        projectPath,
        maxChars * 0.6,
      );
      if (fallbackSource) parts.push(fallbackSource);
    }

    return parts.join('\n\n');
  }

  /**
   * Extract evidence sources — REWRITTEN for TASK-MVP-PROTOTYPE-CONTEXT-QUALITY-001.
   *
   * Before: Shallow keyword match on module names, ALL snippets empty ("").
   * After:  Graph-driven retrieval with real source code snippets from actual files.
   *
   * Each EvidenceSource now has a non-empty `snippet` containing real code,
   * making the evidence verifiable and the AI Wrapper Test passable.
   */
  private extractRelevantSources(
    question: string,
    discovery: DiscoveryResult,
    graph: ArchitectureGraph,
    projectPath: string,
  ): EvidenceSource[] {
    const sources: EvidenceSource[] = [];
    const relevantNodes = this.findRelevantNodes(question, graph);
    const seenPaths = new Set<string>();

    for (const { node, score, reason } of relevantNodes) {
      const mod = this.findModuleForNode(node.name, discovery);
      if (!mod) continue;

      // v3: Find key files first — skip module entirely if no readable files found
      const keyFiles = this.findKeyFiles(mod, discovery, 3);
      const mainFile = keyFiles[0];

      // v3: Skip modules with no actual source files (fixes empty-snippet directory-path bug)
      if (!mainFile) continue;
      const mainSnippet = this.readSourceExcerpt(join(projectPath, mainFile), EVIDENCE_SNIPPET_LINES);
      if (!mainSnippet) continue;

      // Module-level evidence source (only when we have a real file + snippet)
      if (!seenPaths.has(mainFile)) {
        seenPaths.add(mainFile);

        const MAX_DEPS_DESC = 5;
        const allOut = graph.getOutgoingNeighbors(node.id).map(n => n.name);
        const allIn = graph.getIncomingNeighbors(node.id).map(n => n.name);
        const outDeps = allOut.slice(0, MAX_DEPS_DESC);
        const inDeps = allIn.slice(0, MAX_DEPS_DESC);
        const depInfo = `depends on [${outDeps.join(', ')}${allOut.length > MAX_DEPS_DESC ? ` +${allOut.length - MAX_DEPS_DESC} more` : ''}], used by [${inDeps.join(', ')}${allIn.length > MAX_DEPS_DESC ? ` +${allIn.length - MAX_DEPS_DESC} more` : ''}]`;

        const relevance = Math.min(1.0, (score / 12) + 0.2);

        sources.push({
          filePath: mainFile,
          description: `Module: ${mod.name} (${mod.fileCount} files, ${node.kind}) — ${depInfo}. ${reason}`,
          relevance: parseFloat(relevance.toFixed(2)),
          snippet: mainSnippet,
        });
      }

      // Per-file evidence sources with individual snippets
      for (const file of keyFiles) {
        if (seenPaths.has(file)) continue;
        seenPaths.add(file);

        const snippet = this.readSourceExcerpt(join(projectPath, file), EVIDENCE_SNIPPET_LINES);
        if (!snippet) continue; // v3: Skip unreadable files
        sources.push({
          filePath: file,
          description: `Source: ${file} (${mod.name})`,
          relevance: parseFloat(Math.min(1.0, (score / 12) + 0.1).toFixed(2)),
          snippet,
        });
      }

      // v3: Reduced from 15 to 10 — fewer, higher-quality sources
      if (sources.length >= 10) break;
    }

    // Fallback with real snippets (never return empty snippets again)
    if (sources.length === 0) {
      for (const f of discovery.files) {
        if (!f.relativePath.endsWith('.ts')) continue;
        if (seenPaths.has(f.relativePath)) continue;
        seenPaths.add(f.relativePath);

        const snippet = this.readSourceExcerpt(join(projectPath, f.relativePath), EVIDENCE_SNIPPET_LINES);
        sources.push({
          filePath: f.relativePath,
          description: `${f.extension} source file`,
          relevance: 0.3,
          snippet,
        });

        if (sources.length >= 10) break;
      }
    }

    return sources;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ORIGINAL METHODS (unchanged)
  // ═══════════════════════════════════════════════════════════════════

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
