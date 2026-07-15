/**
 * Knowledge Graph Domain Layer — Public API
 *
 * This is the single public entry point for the Knowledge Graph domain.
 * All imports should come from this module:
 *
 * ```ts
 * import { GraphNode, NodeType, GraphNodeBuilder, NodeValidator } from './knowledge-graph/index.ts';
 * ```
 *
 * The public API is organized into 10 concerns:
 * 1. Types — enums, branded IDs, utility types
 * 2. Models — domain entities (GraphNode, GraphEdge, etc.)
 * 3. Errors — domain-specific error hierarchy
 * 4. Events — domain events (NodeCreated, EdgeCreated, etc.)
 * 5. Builders — fluent builder API
 * 6. Validators — domain constraint validation
 * 7. Contracts — infrastructure interfaces (no implementation)
 * 8. Adapters — external system integration interfaces
 * 9. Traversal — graph traversal engine (BFS, DFS, paths, cycles, etc.)
 * 10. Query — query engine (fluent builder, predicates, aggregation, optimizer)
 */

// ─── Types ─────────────────────────────────────────────────────

export type {
  NodeId, EdgeId, SnapshotId, TransactionId, VersionId, QueryId,
  Timestamp, Metadata, StringMap,
} from './types/index.ts';

export {
  NodeType, EdgeType, SnapshotStatus, TransactionStatus,
  ValidationSeverity, TraversalDirection,
  ALL_NODE_TYPES, ALL_EDGE_TYPES,
  NODE_TYPE_COUNT, EDGE_TYPE_COUNT,
  VALID_SOURCE_EDGE_MAP,
  MAX_NODE_PROPERTIES, MAX_EDGE_PROPERTIES, MAX_LABEL_LENGTH,
  MAX_ID_LENGTH, MIN_ID_LENGTH,
  brandNodeId, brandEdgeId, brandSnapshotId,
  brandTransactionId, brandVersionId, brandQueryId,
} from './types/index.ts';

// ─── Models ────────────────────────────────────────────────────

export type {
  GraphNode, GraphEdge, NodeIdentity, NodeMetadata,
  Relationship, GraphSnapshot, GraphVersion,
  GraphTransaction, TransactionOperation,
  GraphTraversal, GraphSubgraph, GraphQuery, QueryFilter,
  GraphStatistics,
} from './models/index.ts';

export {
  createGraphNode, createGraphEdge, createNodeIdentity, createNodeMetadata,
  createRelationship, createGraphSnapshot, createGraphVersion,
  createGraphTransaction, createGraphTraversal, createGraphSubgraph,
  createGraphQuery, createGraphStatistics,
  graphNodeToJSON, graphNodeFromJSON, graphNodeEqual, graphNodeClone, graphNodeHash,
  graphEdgeToJSON, graphEdgeFromJSON, graphEdgeEqual, graphEdgeClone, graphEdgeHash,
  graphSnapshotToJSON, graphSnapshotFromJSON, graphSnapshotEqual, graphSnapshotClone, graphSnapshotHash,
  graphSubgraphToJSON, graphSubgraphFromJSON,
  graphVersionToJSON, graphVersionFromJSON,
  graphTransactionToJSON, graphTransactionFromJSON,
  deepEqual, hashString, hashModel, cloneModel, generateId,
} from './models/index.ts';

// ─── Errors ────────────────────────────────────────────────────

export {
  GraphError, DuplicateNodeError, DuplicateEdgeError,
  InvalidRelationshipError, GraphValidationError, SnapshotError,
  SelfReferenceError, NodeValidationError, EdgeValidationError,
  TransactionError,
} from './errors/index.ts';

// ─── Events ────────────────────────────────────────────────────

export type {
  GraphDomainEvent, AnyGraphDomainEvent,
  NodeCreatedEvent, NodeUpdatedEvent, NodeDeletedEvent,
  EdgeCreatedEvent, EdgeDeletedEvent,
  SnapshotCreatedEvent, GraphValidatedEvent,
} from './events/index.ts';

export {
  createNodeCreatedEvent, createNodeUpdatedEvent, createNodeDeletedEvent,
  createEdgeCreatedEvent, createEdgeDeletedEvent,
  createSnapshotCreatedEvent, createGraphValidatedEvent,
} from './events/index.ts';

// ─── Builders ──────────────────────────────────────────────────

export {
  GraphNodeBuilder, GraphEdgeBuilder,
  SnapshotBuilder, SubgraphBuilder,
} from './builders/index.ts';

// ─── Validators ────────────────────────────────────────────────

export type { ValidationIssue, ValidationResult } from './validators/index.ts';

export {
  NodeValidator, EdgeValidator, GraphValidator,
  validResult, invalidResult, mergeResults,
} from './validators/index.ts';

// ─── Contracts ─────────────────────────────────────────────────

export type {
  GraphRepository, GraphTraversalEngine,
  GraphQueryEngine, GraphExporter,
} from './contracts/index.ts';

// ─── Adapters ──────────────────────────────────────────────────

export type { FindingAdapter, EventPublisher } from './adapters/index.ts';

// ─── Traversal ────────────────────────────────────────────────

export {
  GraphTraversalEngineImpl,
  TraversalStrategy,
  TerminationReasonEnum,
  TraversalStatisticsCollector,
  VisitedTracker,
  PathPool,
  createCancellationToken,
  emptyTraversalResult,
  emptyTraversalStatistics,
  createTraversalStatistics,
  notFoundPathResult,
  createTraversalStartedEvent,
  createTraversalCompletedEvent,
  createTraversalCancelledEvent,
  createPathFoundEvent,
  createCycleDetectedEvent,
} from './traversal/index.ts';

export type {
  TraversalOptions,
  TraversalResult,
  TraversalContext,
  TraversalPath,
  TraversalStatistics,
  TerminationReason,
  NodePredicate,
  EdgePredicate,
  NodeVisitor,
  EdgeVisitor,
  CancellationToken,
  BFSOptions,
  DFSOptions,
  BidirectionalOptions,
  ShortestPathOptions,
  MultiPathOptions,
  CycleDetectionOptions,
  NeighborhoodOptions,
  SubgraphOptions,
  ReachabilityOptions,
  PathResult,
  Cycle,
  ConnectedComponent,
  TraversalEngineConfig,
  TraversalStartedEvent,
  TraversalCompletedEvent,
  TraversalCancelledEvent,
  PathFoundEvent,
  CycleDetectedEvent,
  AnyTraversalEvent,
} from './traversal/index.ts';

// ─── Query ─────────────────────────────────────────────────────

export {
  GraphQueryEngineImpl,
  PredicateOperator,
  FilterComposition,
  AggregationOp,
  PaginationMode,
  SortDirection,
  QueryTarget,
  QueryBuilder,
  QueryOptimizer,
  queryOptimizer,
  QueryStatisticsCollector,
  QueryCache,
  equals,
  notEquals,
  contains,
  startsWith,
  endsWith,
  regex,
  exists,
  inList,
  greaterThan,
  lessThan,
  gte,
  lte,
  negate,
  and as queryAnd,
  or as queryOr,
  notFilter,
  group as queryGroup,
  createQueryStartedEvent,
  createQueryCompletedEvent,
  createQueryCancelledEvent,
  createQueryCachedEvent,
  buildExplainPlan,
} from './query/index.ts';

export type {
  QueryPredicate,
  CompositeFilter,
  Projection,
  AggregationSpec,
  AggregationResult,
  GroupBySpec,
  GroupByResult,
  PaginationSpec,
  SortSpec,
  QuerySpecification,
  QueryPlan,
  QueryPlanStage,
  QueryStatistics,
  QueryResult,
  ExplainResult,
  SubgraphQueryResult,
  PathQueryResult,
  QueryEngineConfig,
  OptimizationResult,
  QueryStartedEvent,
  QueryCompletedEvent,
  QueryCancelledEvent,
  QueryCachedEvent,
  AnyQueryEvent,
} from './query/index.ts';

// ─── Storage ──────────────────────────────────────────────────

export type {
  GraphStorageProvider,
} from './storage/index.ts';

export {
  NetworkXStorageAdapter,
  DEFAULT_STORAGE_CONFIG,
  StorageConnectionState,
  StorageOperationType,
  StorageIndexType,
  StorageTransactionState,
  ExportFormat,
  ImportFormat,
  StorageIdentityIndex,
  StorageNodeTypeIndex,
  StorageRelationshipTypeIndex,
  StorageMetadataIndex,
  StorageLabelsIndex,
  StorageIndexManager,
  StorageReadCache,
  StorageWriteBuffer,
  StorageCacheManager,
  StorageSnapshotManager,
  StorageTransactionManager,
  StorageChangeSet,
  exportGraph,
  importGraph,
  GenericJSONMigration,
  MigrationRegistry,
  createDefaultMigrationRegistry,
  StorageStatisticsCollector,
  createStorageConnectedEvent,
  createStorageDisconnectedEvent,
  createStorageSnapshotCreatedEvent,
  createStorageRecoveredEvent,
  createStorageCompactedEvent,
  StorageEventBus,
} from './storage/index.ts';

export type {
  StorageAdapterConfig,
  StorageOperationResult,
  BatchOperationResult,
  BatchError,
  StorageIndexStats,
  StorageTransactionInfo,
  StorageStatistics,
  StorageHealthResult,
  StorageHealthIssue,
  ExportOptions,
  ExportResult,
  ImportOptions,
  ImportResult,
  StorageMigrationStep,
  MigrationProgress,
  MigrationResult,
  StorageMigration,
  StorageConnectedEvent,
  StorageDisconnectedEvent,
  StorageSnapshotCreatedEvent,
  StorageRecoveredEvent,
  StorageCompactedEvent,
  AnyStorageEvent,
} from './storage/index.ts';
