/** INT-017: Data Lake — Types */

export type DataLakeBackend = 'parquet' | 'duckdb' | 'iceberg' | 'clickhouse';

export interface DataLakeStore {
  readonly backend: DataLakeBackend;
  write(table: string, records: DataLakeRecord[]): Promise<DataLakeWriteResult>;
  query(sql: string, params?: Record<string, unknown>): Promise<DataLakeQueryResult>;
  createTable(table: DataLakeTable): Promise<void>;
  dropTable(table: string): Promise<void>;
  listTables(): Promise<DataLakeTableMeta[]>;
  getTableSchema(table: string): Promise<DataLakeTableSchema>;
  optimize(table: string): Promise<DataLakeOptimizeResult>;
  health(): Promise<{ available: boolean }>;
}

export interface DataLakeRecord {
  data: Record<string, unknown>;
  timestamp: Date;
  partition?: string;
}

export interface DataLakeWriteResult {
  recordsWritten: number;
  bytesWritten: number;
  partitionsCreated: number;
  writeTimeMs: number;
}

export interface DataLakeQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  executionTimeMs: number;
  scannedBytes: number;
}

export interface DataLakeTable {
  name: string;
  schema: DataLakeTableSchema;
  partitionBy?: string[];
  orderBy?: string[];
  retentionDays?: number;
  description?: string;
}

export interface DataLakeTableSchema {
  columns: DataLakeColumn[];
  primaryKey?: string[];
}

export interface DataLakeColumn {
  name: string;
  type: 'string' | 'int' | 'bigint' | 'float' | 'double' | 'boolean' | 'timestamp' | 'json' | 'array' | 'map';
  nullable: boolean;
  description?: string;
}

export interface DataLakeTableMeta {
  name: string;
  rows: number;
  sizeBytes: number;
  partitions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataLakeOptimizeResult {
  filesMerged: number;
  bytesReclaimed: number;
  optimizeTimeMs: number;
}

export interface DataLakeConfig {
  backend: DataLakeBackend;
  path?: string;
  endpoint?: string;
  defaultPartitionBy?: string[];
  defaultRetentionDays?: number;
  compression?: 'gzip' | 'snappy' | 'zstd' | 'none';
}
