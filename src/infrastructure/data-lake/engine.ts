/** INT-017: Data Lake — Engine */
import type {
  DataLakeStore, DataLakeBackend, DataLakeRecord, DataLakeWriteResult,
  DataLakeQueryResult, DataLakeTable, DataLakeTableMeta, DataLakeTableSchema,
  DataLakeOptimizeResult, DataLakeConfig,
} from './types.js';

export class DataLakeEngine implements DataLakeStore {
  readonly backend: DataLakeBackend;
  private config: DataLakeConfig;
  private tables: Map<string, { schema: DataLakeTableSchema; records: DataLakeRecord[]; meta: DataLakeTableMeta }> = new Map();

  constructor(config: DataLakeConfig) {
    this.config = config;
    this.backend = config.backend;
  }

  async write(table: string, records: DataLakeRecord[]): Promise<DataLakeWriteResult> {
    const tbl = this.tables.get(table);
    if (!tbl) throw new Error(`Table ${table} not found`);

    const start = Date.now();
    tbl.records.push(...records);
    tbl.meta.rows += records.length;
    tbl.meta.sizeBytes += JSON.stringify(records).length;
    tbl.meta.updatedAt = new Date();

    return {
      recordsWritten: records.length,
      bytesWritten: JSON.stringify(records).length,
      partitionsCreated: 0,
      writeTimeMs: Date.now() - start,
    };
  }

  async query(sql: string, _params?: Record<string, unknown>): Promise<DataLakeQueryResult> {
    const start = Date.now();

    // Simple SQL-like parsing for basic queries
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return { columns: [], rows: [], totalRows: 0, executionTimeMs: Date.now() - start, scannedBytes: 0 };

    const tableName = tableMatch[1];
    const tbl = this.tables.get(tableName);
    if (!tbl) return { columns: [], rows: [], totalRows: 0, executionTimeMs: Date.now() - start, scannedBytes: 0 };

    const columns = tbl.schema.columns.map(c => c.name);
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 1000;
    const rows = tbl.records.slice(0, limit).map(r => r.data);

    return {
      columns,
      rows,
      totalRows: tbl.records.length,
      executionTimeMs: Date.now() - start,
      scannedBytes: tbl.meta.sizeBytes,
    };
  }

  async createTable(table: DataLakeTable): Promise<void> {
    this.tables.set(table.name, {
      schema: table.schema,
      records: [],
      meta: {
        name: table.name,
        rows: 0,
        sizeBytes: 0,
        partitions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async dropTable(table: string): Promise<void> {
    this.tables.delete(table);
  }

  async listTables(): Promise<DataLakeTableMeta[]> {
    return [...this.tables.values()].map(t => t.meta);
  }

  async getTableSchema(table: string): Promise<DataLakeTableSchema> {
    const tbl = this.tables.get(table);
    if (!tbl) throw new Error(`Table ${table} not found`);
    return tbl.schema;
  }

  async optimize(table: string): Promise<DataLakeOptimizeResult> {
    const tbl = this.tables.get(table);
    if (!tbl) throw new Error(`Table ${table} not found`);

    return { filesMerged: 0, bytesReclaimed: 0, optimizeTimeMs: 10 };
  }

  async health() { return { available: true }; }

  /** Create default security analytics tables */
  async initializeDefaultTables(): Promise<void> {
    await this.createTable({
      name: 'findings',
      schema: {
        columns: [
          { name: 'id', type: 'string', nullable: false },
          { name: 'type', type: 'string', nullable: false },
          { name: 'severity', type: 'string', nullable: false },
          { name: 'asset', type: 'string', nullable: true },
          { name: 'description', type: 'string', nullable: true },
          { name: 'risk_score', type: 'double', nullable: true },
          { name: 'timestamp', type: 'timestamp', nullable: false },
          { name: 'tenant_id', type: 'string', nullable: true },
        ],
      },
      partitionBy: ['severity'],
      orderBy: ['timestamp'],
      retentionDays: 365,
      description: 'Security findings history',
    });

    await this.createTable({
      name: 'risk_assessments',
      schema: {
        columns: [
          { name: 'id', type: 'string', nullable: false },
          { name: 'finding_id', type: 'string', nullable: false },
          { name: 'risk_level', type: 'string', nullable: false },
          { name: 'risk_score', type: 'double', nullable: false },
          { name: 'factors', type: 'json', nullable: true },
          { name: 'timestamp', type: 'timestamp', nullable: false },
        ],
      },
      partitionBy: ['risk_level'],
      retentionDays: 730,
      description: 'Risk assessment history',
    });

    await this.createTable({
      name: 'scan_results',
      schema: {
        columns: [
          { name: 'scan_id', type: 'string', nullable: false },
          { name: 'scanner', type: 'string', nullable: false },
          { name: 'target', type: 'string', nullable: false },
          { name: 'findings_count', type: 'int', nullable: false },
          { name: 'duration_ms', type: 'bigint', nullable: true },
          { name: 'timestamp', type: 'timestamp', nullable: false },
        ],
      },
      partitionBy: ['scanner'],
      retentionDays: 90,
      description: 'Scan execution history',
    });
  }

  /** Get analytics summary */
  async getAnalyticsSummary(): Promise<Record<string, { rows: number; sizeBytes: number }>> {
    const result: Record<string, { rows: number; sizeBytes: number }> = {};
    for (const [name, tbl] of this.tables) {
      result[name] = { rows: tbl.meta.rows, sizeBytes: tbl.meta.sizeBytes };
    }
    return result;
  }
}
