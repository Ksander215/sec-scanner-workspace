export { PersistenceEngine } from './engine.js';
export { PersistenceBuilder } from './builder.js';
export { JsonPersistenceProvider } from './json-provider.js';
export type {
  StorageBackend,
  PersistenceProvider,
  SerializationFormat,
  SnapshotMetadata,
  SnapshotResult,
  MigrationInfo,
  StorageStatistics,
  PersistenceEvent,
  PersistenceEventType,
  PersistenceEventHandler,
  PersistenceMetrics,
} from './types.js';
export type {
  ReportRepository,
  FindingRepository,
  RiskRepository,
  CorrelationRepository,
  AttackPathRepository,
  RecommendationRepository,
  ExplainabilityRepository,
  SnapshotRepository,
} from './repository.js';
