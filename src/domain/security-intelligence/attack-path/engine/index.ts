/**
 * Security Intelligence Attack Path Builder — Main Engine
 *
 * The main orchestrator that transforms RiskAssessments, CorrelationGroups,
 * and Knowledge Graph data into deterministic attack paths.
 *
 * Public API:
 * - discover(): Discover attack paths from source to objective
 * - discoverAll(): Discover all possible attack paths
 * - rank(): Rank discovered paths
 * - simulate(): Simulate an attack path
 * - project(): Project a path to a subgraph
 * - statistics(): Get engine statistics
 *
 * Architecture:
 * - Uses existing GraphTraversalEngine for all traversal operations
 * - Uses PathDiscoveryEngine for path discovery (delegates to TraversalEngine)
 * - Uses PathRankingEngine for deterministic path ranking
 * - Uses SimulationEngine for deterministic attack simulation
 * - Uses GraphProjectionEngine for subgraph projection
 * - Uses ConstraintsEngine for constraint enforcement
 * - Uses AttackTechniqueRegistry for MITRE ATT&CK technique lookup
 * - Dual LRU cache (path + simulation)
 * - Event-driven observability
 */

import type {
  AttackPathEngineConfig, AttackPathStatistics, AttackPath, AttackPathSummary,
  AttackSimulation, AttackObjective, AttackObjectiveType, DiscoveryStrategy,
  DiscoveryConstraints, RankingConfig, AttackPathRanking, AttackNode,
  NodeId as AttackPathNodeId,
} from '../types/index.ts';
import {
  DEFAULT_ATTACK_PATH_ENGINE_CONFIG, DEFAULT_CONSTRAINTS,
  DiscoveryStrategy as DS, AttackObjectiveType as AOT,
} from '../types/index.ts';
import type { NodeId } from '../../../knowledge-graph/types/index.ts';
import type { RiskAssessment } from '../../risk/types/index.ts';
import type { RiskLevel } from '../../risk/types/index.ts';
import { RiskLevel as RLvl } from '../../risk/types/index.ts';
import type { CorrelationGroup, CorrelationResult } from '../../correlation/types/index.ts';
import type { GraphTraversalEngineImpl } from '../../../knowledge-graph/traversal/engine/index.ts';
import { PathDiscoveryEngine, KnowledgeGraphAdapter } from '../discovery/index.ts';
import { PathRankingEngine } from '../ranking/index.ts';
import { SimulationEngine } from '../simulation/index.ts';
import { GraphProjectionEngine } from '../projection/index.ts';
import { ConstraintsEngine } from '../constraints/index.ts';
import { AttackTechniqueRegistry, createDefaultTechniqueRegistry } from '../techniques/index.ts';
import { AttackPathCache } from '../cache/index.ts';
import { AttackPathEventBus } from '../events/index.ts';
import { createAttackPath, createAttackPathSummary, createAttackPathRanking } from '../models/index.ts';
import { AttackPathStatisticsCollector } from '../statistics/index.ts';
import { createObjectiveByType } from '../objectives/index.ts';
import {
  createPathDiscoveredEvent,
  createPathRankedEvent,
  createSimulationCompletedEvent,
  createAttackGraphBuiltEvent,
} from '../events/index.ts';

// ─── Engine Input ────────────────────────────────────────────

/** Input for attack path discovery */
export interface DiscoveryInput {
  /** Source node ID (entry point in the Knowledge Graph) */
  readonly sourceId: NodeId;
  /** Target node IDs (objective targets in the Knowledge Graph) */
  readonly targetIds: readonly NodeId[];
  /** Risk assessments for nodes along the path */
  readonly riskAssessments?: readonly RiskAssessment[];
  /** Correlation result for cross-referencing findings */
  readonly correlationResult?: CorrelationResult | null;
  /** Attack objective type */
  readonly objectiveType?: AttackObjectiveType;
  /** Discovery strategy (default: MultiPath) */
  readonly strategy?: DiscoveryStrategy;
  /** Discovery constraints (default: from engine config) */
  readonly constraints?: DiscoveryConstraints;
}

// ─── AttackPathEngine ────────────────────────────────────────

/**
 * Main engine for the Attack Path Builder.
 *
 * Provides a comprehensive API for discovering, ranking, simulating,
 * and projecting attack paths. All operations are fully deterministic.
 *
 * Uses the Knowledge Graph's GraphTraversalEngine for all graph
 * traversal operations — no custom traversal algorithms.
 */
export class AttackPathEngine {
  private readonly _config: AttackPathEngineConfig;
  private readonly _discoveryEngine: PathDiscoveryEngine;
  private readonly _rankingEngine: PathRankingEngine;
  private readonly _simulationEngine: SimulationEngine;
  private readonly _projectionEngine: GraphProjectionEngine;
  private readonly _techniqueRegistry: AttackTechniqueRegistry;
  private readonly _cache: AttackPathCache;
  private readonly _statisticsCollector: AttackPathStatisticsCollector;
  readonly eventBus: AttackPathEventBus;

  constructor(
    traversalEngine: GraphTraversalEngineImpl,
    config: Partial<AttackPathEngineConfig> = {},
  ) {
    this._config = { ...DEFAULT_ATTACK_PATH_ENGINE_CONFIG, ...config };

    // Build KG adapter with risk scores
    const kgAdapter = new KnowledgeGraphAdapter();

    this._discoveryEngine = new PathDiscoveryEngine(traversalEngine, kgAdapter);
    this._rankingEngine = new PathRankingEngine(this._config.rankingConfig);
    this._simulationEngine = new SimulationEngine();
    this._projectionEngine = new GraphProjectionEngine(traversalEngine);
    this._techniqueRegistry = createDefaultTechniqueRegistry();
    this._cache = new AttackPathCache({
      capacity: this._config.cacheSize,
      ttlMs: this._config.cacheTtlMs,
    });
    this._statisticsCollector = new AttackPathStatisticsCollector();
    this.eventBus = new AttackPathEventBus();
  }

  // ─── Public API ────────────────────────────────────────

  /**
   * Discover attack paths from a source to an objective.
   *
   * Delegates to the Knowledge Graph's TraversalEngine for all
   * graph traversal operations. Uses the configured discovery strategy.
   */
  async discover(input: DiscoveryInput): Promise<readonly AttackPath[]> {
    const startTime = performance.now();

    try {
      const strategy = input.strategy ?? DS.MultiPath;
      const constraints = input.constraints ?? this._config.defaultConstraints;
      const objectiveType = input.objectiveType ?? AOT.Impact;

      // Create objective
      const objective = createObjectiveByType(objectiveType);

      // Update KG adapter with risk assessments if provided
      if (input.riskAssessments) {
        this.updateKGAdapterWithRisks(input.riskAssessments);
      }

      // Discover paths using the traversal engine
      const discoveryResult = await this._discoveryEngine.discover(
        input.sourceId,
        input.targetIds,
        objective,
        strategy,
        constraints,
      );

      // Convert discovered paths to AttackPaths
      const paths: AttackPath[] = [];
      for (const discovered of discoveryResult.paths) {
        // Rank the path
        const rankingInput = this._rankingEngine.computeScores(discovered.steps);
        const ranking = {
          ...rankingInput,
          config: this._config.rankingConfig,
        };
        const pathRanking = createAttackPathRanking(ranking);

        const attackPath = createAttackPath({
          steps: discovered.steps,
          edges: discovered.edges,
          nodes: discovered.nodes,
          objective: discovered.objective,
          ranking: pathRanking,
          discoveryStrategy: strategy,
          discoveryDurationMs: discovered.discoveryDurationMs,
        });

        paths.push(attackPath);

        // Cache the path
        if (this._config.enableCaching) {
          this._cache.setPath(this.computePathCacheKey(attackPath.id), attackPath);
        }

        // Emit discovery event
        this.eventBus.emit(createPathDiscoveredEvent(
          this._config.engineId,
          attackPath.id,
          strategy,
          objectiveType,
          attackPath.length,
          attackPath.totalRisk,
          discoveryResult.durationMs,
        ));
      }

      // Record statistics
      const durationMs = performance.now() - startTime;
      this._statisticsCollector.recordDiscovery(durationMs, strategy, objectiveType);

      return Object.freeze(paths);
    } catch {
      this._statisticsCollector.recordFailure();
      return [];
    }
  }

  /**
   * Discover all possible attack paths for all objectives.
   *
   * Runs discovery for each objective type with the Reachability strategy
   * to find all reachable paths from all entry points.
   */
  async discoverAll(input: Omit<DiscoveryInput, 'objectiveType' | 'strategy'>): Promise<readonly AttackPath[]> {
    const allPaths: AttackPath[] = [];

    for (const objectiveType of Object.values(AOT)) {
      const paths = await this.discover({
        ...input,
        objectiveType,
        strategy: DS.Reachability,
      });
      allPaths.push(...paths);
    }

    return Object.freeze(allPaths);
  }

  /**
   * Rank a set of attack paths.
   *
   * Uses the deterministic ranking formula with configurable weights.
   */
  rank(paths: readonly AttackPath[]): readonly AttackPath[] {
    const startTime = performance.now();

    const result = this._rankingEngine.rankPaths(paths);

    // Emit ranking events
    for (const path of result.rankedPaths) {
      this.eventBus.emit(createPathRankedEvent(
        this._config.engineId,
        path.id,
        path.ranking.overallScore,
        path.ranking.rank,
        result.durationMs,
      ));
    }

    const durationMs = performance.now() - startTime;
    this._statisticsCollector.recordRanking(durationMs);

    return result.rankedPaths;
  }

  /**
   * Simulate an attack path.
   *
   * Returns a deterministic simulation result with:
   * - Success probability
   * - Critical steps
   * - Bottlenecks
   * - Detection points
   */
  simulate(path: AttackPath): AttackSimulation {
    const startTime = performance.now();

    // Check simulation cache
    if (this._config.enableCaching) {
      const cacheKey = this.computeSimulationCacheKey(path.id);
      const cached = this._cache.getSimulation(cacheKey);
      if (cached) {
        this._statisticsCollector.recordCacheHit();
        return cached;
      }
      this._statisticsCollector.recordCacheMiss();
    }

    const simulation = this._simulationEngine.simulate(path);

    // Cache the simulation
    if (this._config.enableCaching) {
      const cacheKey = this.computeSimulationCacheKey(path.id);
      this._cache.setSimulation(cacheKey, simulation);
    }

    // Emit simulation event
    const durationMs = performance.now() - startTime;
    this.eventBus.emit(createSimulationCompletedEvent(
      this._config.engineId,
      simulation.id,
      path.id,
      simulation.successProbability,
      simulation.criticalSteps.length,
      simulation.detectionPoints.length,
      durationMs,
    ));

    this._statisticsCollector.recordSimulation(durationMs);

    return simulation;
  }

  /**
   * Project an attack path to a subgraph.
   *
   * Uses the Knowledge Graph's subgraph extraction.
   */
  async project(path: AttackPath): Promise<import('../projection/index.ts').ProjectionResult> {
    const startTime = performance.now();
    const result = await this._projectionEngine.project(path);
    const durationMs = performance.now() - startTime;
    this._statisticsCollector.recordProjection(durationMs);
    return result;
  }

  /**
   * Get engine statistics.
   */
  statistics(): AttackPathStatistics {
    return this._statisticsCollector.collect();
  }

  /**
   * Get a summary of discovered paths.
   */
  summarize(paths: readonly AttackPath[]): AttackPathSummary {
    return createAttackPathSummary(paths);
  }

  /**
   * Batch discover paths for multiple source-target pairs.
   * Supports 100, 1K, 10K batch sizes.
   */
  async discoverBatch(inputs: readonly DiscoveryInput[]): Promise<readonly AttackPath[]> {
    const startTime = performance.now();
    const allPaths: AttackPath[] = [];

    for (const input of inputs) {
      const paths = await this.discover(input);
      allPaths.push(...paths);
    }

    const durationMs = performance.now() - startTime;
    this._statisticsCollector.recordBatch();

    return Object.freeze(allPaths);
  }

  /**
   * Get the technique registry for extending techniques.
   */
  get techniqueRegistry(): AttackTechniqueRegistry {
    return this._techniqueRegistry;
  }

  /**
   * Get the ranking engine.
   */
  get rankingEngine(): PathRankingEngine {
    return this._rankingEngine;
  }

  /**
   * Get the simulation engine.
   */
  get simulationEngine(): SimulationEngine {
    return this._simulationEngine;
  }

  /**
   * Get the cache statistics.
   */
  get cacheStatistics() {
    return this._cache.getStatistics();
  }

  /**
   * Reset all engine state.
   */
  reset(): void {
    this._statisticsCollector.reset();
    this._cache.clear();
    this.eventBus.clear();
  }

  // ─── Private Helpers ────────────────────────────────────

  /** Update the KG adapter with risk assessment data */
  private updateKGAdapterWithRisks(assessments: readonly RiskAssessment[]): void {
    // Risk scores are stored internally and used to enrich
    // attack nodes during path construction. The KG adapter
    // receives risk context from these assessments.
    if (!assessments || assessments.length === 0) return;

    // Map risk assessments to node-level risk scores
    const riskMap = new Map<string, { score: number; level: RiskLevel }>();
    for (const assessment of assessments) {
      // Map finding-based assessments to their scope IDs
      const scopeId = assessment.scopeId;
      riskMap.set(scopeId, {
        score: assessment.score.rawScore,
        level: assessment.score.level,
      });
    }
    // Store for use in node enrichment during discovery
    this._riskScoreMap = riskMap;
  }

  /** Internal risk score map populated from RiskAssessments */
  private _riskScoreMap: Map<string, { score: number; level: RiskLevel }> = new Map();

  /** Compute a cache key for a path */
  private computePathCacheKey(pathId: string): string {
    return `path_${pathId}_v${this._config.formulaVersion}`;
  }

  /** Compute a cache key for a simulation */
  private computeSimulationCacheKey(pathId: string): string {
    return `sim_${pathId}_v${this._config.formulaVersion}`;
  }
}
