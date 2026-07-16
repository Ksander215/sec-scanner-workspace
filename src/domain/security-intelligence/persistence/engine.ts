import type { SecurityIntelligenceReport } from '../orchestrator/types.js';
import type { PersistenceProvider, PersistenceMetrics, StorageStatistics } from './types.js';
import type { ReportRepository, FindingRepository, RiskRepository, CorrelationRepository, AttackPathRepository, RecommendationRepository, ExplainabilityRepository, SnapshotRepository } from './repository.js';
import { JsonPersistenceProvider } from './json-provider.js';

/**
 * PersistenceEngine — facade over all persistence operations
 */
export class PersistenceEngine {
  private provider: PersistenceProvider;
  private metrics: PersistenceMetrics = {
    totalSaves: 0,
    totalLoads: 0,
    totalDeletes: 0,
    totalSnapshots: 0,
    avgSaveDurationMs: 0,
    avgLoadDurationMs: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(provider: PersistenceProvider) {
    this.provider = provider;
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
  }

  async shutdown(): Promise<void> {
    await this.provider.shutdown();
  }

  async isHealthy(): Promise<boolean> {
    return this.provider.isHealthy();
  }

  getReportRepository(): ReportRepository {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getReportRepository();
    }
    throw new Error('Unsupported provider type');
  }

  getFindingRepository(): FindingRepository {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getFindingRepository();
    }
    throw new Error('Unsupported provider type');
  }

  getRiskRepository(): RiskRepository {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getRiskRepository();
    }
    throw new Error('Unsupported provider type');
  }

  getCorrelationRepository(): CorrelationRepository {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getCorrelationRepository();
    }
    throw new Error('Unsupported provider type');
  }

  getAttackPathRepository(): AttackPathRepository {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getAttackPathRepository();
    }
    throw new Error('Unsupported provider type');
  }

  getRecommendationRepository(): RecommendationRepository {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getRecommendationRepository();
    }
    throw new Error('Unsupported provider type');
  }

  getExplainabilityRepository(): ExplainabilityRepository {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getExplainabilityRepository();
    }
    throw new Error('Unsupported provider type');
  }

  getSnapshotRepository(): SnapshotRepository {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getSnapshotRepository();
    }
    throw new Error('Unsupported provider type');
  }

  async getStatistics(): Promise<StorageStatistics> {
    if (this.provider instanceof JsonPersistenceProvider) {
      return this.provider.getStatistics();
    }
    throw new Error('Unsupported provider type');
  }

  /** Save a complete report */
  async saveReport(report: SecurityIntelligenceReport): Promise<string> {
    const start = Date.now();
    const repo = this.getReportRepository();
    const id = await repo.save(report);
    this.metrics.totalSaves++;
    this.metrics.avgSaveDurationMs = (this.metrics.avgSaveDurationMs * (this.metrics.totalSaves - 1) + (Date.now() - start)) / this.metrics.totalSaves;
    return id;
  }

  /** Load a complete report */
  async loadReport(id: string): Promise<SecurityIntelligenceReport | null> {
    const start = Date.now();
    const repo = this.getReportRepository();
    const report = await repo.load(id);
    this.metrics.totalLoads++;
    this.metrics.avgLoadDurationMs = (this.metrics.avgLoadDurationMs * (this.metrics.totalLoads - 1) + (Date.now() - start)) / this.metrics.totalLoads;
    return report;
  }

  /** Delete a report */
  async deleteReport(id: string): Promise<boolean> {
    const repo = this.getReportRepository();
    const result = await repo.delete(id);
    if (result) this.metrics.totalDeletes++;
    return result;
  }

  /** Create a snapshot */
  async createSnapshot(reportId: string, description?: string): Promise<string> {
    const report = await this.loadReport(reportId);
    if (!report) throw new Error(`Report ${reportId} not found`);
    const data = Buffer.from(JSON.stringify(report), 'utf-8');
    const repo = this.getSnapshotRepository();
    const metadata = await repo.create(reportId, data, description);
    this.metrics.totalSnapshots++;
    return metadata.id;
  }

  /** Restore from a snapshot */
  async restoreSnapshot(snapshotId: string): Promise<SecurityIntelligenceReport> {
    const repo = this.getSnapshotRepository();
    return repo.restore(snapshotId);
  }

  getMetrics(): PersistenceMetrics {
    return { ...this.metrics };
  }
}
