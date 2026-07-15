/**
 * Security Intelligence Correlation Engine — Public API
 *
 * Single entry point for the Correlation Engine layer.
 * Connects CanonicalFindings into a unified intelligence model.
 *
 * Usage:
 * ```ts
 * import { CorrelationEngine } from './correlation/index.ts';
 *
 * const engine = new CorrelationEngine({ engineId: 'main' });
 *
 * const result = engine.correlate(findings);
 *
 * console.log(result.correlations.length);
 * console.log(result.groups.length);
 * console.log(result.duplicates.length);
 * ```
 *
 * Architecture:
 * - Types: Enums, branded IDs, interfaces
 * - Models: Correlation, CorrelationGroup, CorrelationEdge, etc.
 * - Events: Correlation lifecycle observability
 * - Rules: 18 weighted correlation rules with extensible registry
 * - Deduplication: Exact, Semantic, Similar, Related detection
 * - Graph: Internal correlation graph with group building
 * - Cache: LRU cache with TTL and invalidation
 * - KG Adapter: Knowledge Graph integration
 * - Engine: CorrelationEngine (main orchestrator)
 * - Statistics: Comprehensive metrics
 */

// ─── Types ───────────────────────────────────────────────────

export type {
  CorrelationId, CorrelationGroupId, CorrelationEdgeId, Timestamp, Metadata,
  CorrelationReason, DuplicateType,
  CorrelationEvidence, CorrelationEdge, CorrelationGroup, Correlation,
  CorrelationResult, CorrelationResultStatistics, DuplicateDetection,
  CorrelationConfig, CorrelationStatistics,
  CorrelationRule, CorrelationFindingInput, CorrelationEvidenceInput,
  CorrelationRuleResult, CorrelationCacheEntry,
  CorrelationValidationResult, CorrelationValidationError, CorrelationValidationWarning,
} from './types/index.ts';

export {
  brandCorrelationId, brandCorrelationGroupId, brandCorrelationEdgeId,
  CorrelationReason, DuplicateType,
  ALL_CORRELATION_REASONS, ALL_DUPLICATE_TYPES,
  DEFAULT_CORRELATION_CONFIG,
} from './types/index.ts';

// ─── Models ──────────────────────────────────────────────────

export {
  generateCorrelationId, generateCorrelationGroupId, generateCorrelationEdgeId,
  createCorrelationEvidence, createCorrelationEdge, createCorrelationGroup,
  createCorrelation, createDuplicateDetection, createCorrelationResult,
  createEmptyResultStatistics,
  toCorrelationFindingInput,
  correlationToJSON, correlationFromJSON,
  correlationGroupToJSON, correlationResultToJSON,
  correlationsEqual, correlationGroupsEqual,
  cloneCorrelation, hashCorrelation,
} from './models/index.ts';

// ─── Events ──────────────────────────────────────────────────

export type {
  CorrelationEvent,
  CorrelationStartedEvent, CorrelationCompletedEvent,
  CorrelationFailedEvent, DuplicateDetectedEvent, CorrelationGraphBuiltEvent,
  AnyCorrelationEvent, CorrelationEventHandler,
} from './events/index.ts';

export {
  createCorrelationStartedEvent, createCorrelationCompletedEvent,
  createCorrelationFailedEvent, createDuplicateDetectedEvent,
  createCorrelationGraphBuiltEvent,
  CorrelationEventBus,
} from './events/index.ts';

// ─── Rules ───────────────────────────────────────────────────

export {
  BUILT_IN_RULES,
  RuleRegistry,
} from './rules/index.ts';

// ─── Deduplication ───────────────────────────────────────────

export type {
  DuplicateDetectionResult, DuplicateDetectionStatistics,
} from './deduplication/index.ts';

export {
  DuplicateDetector,
} from './deduplication/index.ts';

// ─── Graph ───────────────────────────────────────────────────

export type {
  CorrelationGraphSnapshot,
} from './graph/index.ts';

export {
  CorrelationGraph,
} from './graph/index.ts';

// ─── Cache ───────────────────────────────────────────────────

export type {
  CacheStatistics,
} from './cache/index.ts';

export {
  CorrelationCache,
} from './cache/index.ts';

// ─── KG Adapter ──────────────────────────────────────────────

export type {
  KGAdapterResult, KGAdapterStatistics,
} from './kg-adapter/index.ts';

export {
  CorrelationKGAdapter,
} from './kg-adapter/index.ts';

// ─── Engine ──────────────────────────────────────────────────

export { CorrelationEngine } from './engine/index.ts';

// ─── Statistics ──────────────────────────────────────────────

export { CorrelationStatisticsCollector } from './statistics/index.ts';
