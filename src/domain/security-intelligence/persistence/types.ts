/** Storage backend type */
export type StorageBackend = 'json' | 'sqlite' | 'postgres' | 'neo4j' | 'redis';

/** Persistence provider interface */
export interface PersistenceProvider {
  readonly type: StorageBackend;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isHealthy(): Promise<boolean>;
}

/** Serialization format */
export type SerializationFormat = 'json' | 'jsonl' | 'gzip' | 'msgpack';

/** Snapshot metadata */
export interface SnapshotMetadata {
  id: string;
  reportId: string;
  createdAt: Date;
  size: number;
  format: SerializationFormat;
  description: string;
}

/** Snapshot result */
export interface SnapshotResult {
  metadata: SnapshotMetadata;
  data: Buffer;
}

/** Migration info */
export interface MigrationInfo {
  version: number;
  description: string;
  appliedAt: Date;
}

/** Storage statistics */
export interface StorageStatistics {
  totalReports: number;
  totalFindings: number;
  totalSnapshots: number;
  storageSizeBytes: number;
  oldestReport?: Date;
  newestReport?: Date;
  byBackend: Record<StorageBackend, { count: number; sizeBytes: number }>;
}

/** Persistence event types */
export type PersistenceEventType =
  | 'persistence:initialized'
  | 'persistence:report-saved'
  | 'persistence:report-loaded'
  | 'persistence:report-deleted'
  | 'persistence:snapshot-created'
  | 'persistence:snapshot-restored'
  | 'persistence:migration-applied';

export interface PersistenceEvent {
  type: PersistenceEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type PersistenceEventHandler = (event: PersistenceEvent) => void;

/** Persistence metrics */
export interface PersistenceMetrics {
  totalSaves: number;
  totalLoads: number;
  totalDeletes: number;
  totalSnapshots: number;
  avgSaveDurationMs: number;
  avgLoadDurationMs: number;
  cacheHits: number;
  cacheMisses: number;
}
