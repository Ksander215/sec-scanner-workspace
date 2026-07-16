import type { SecurityIntelligenceReport } from '../orchestrator/types.js';
import type { PersistenceProvider, StorageBackend, PersistenceEvent, PersistenceEventHandler, StorageStatistics } from './types.js';
import type { ReportRepository, FindingRepository, RiskRepository, CorrelationRepository, AttackPathRepository, RecommendationRepository, ExplainabilityRepository, SnapshotRepository } from './repository.js';
import type { SnapshotMetadata } from './types.js';
import type { SecurityFinding } from '../normalization/types.js';
import type { RiskAssessment } from '../risk/types.js';
import type { Correlation, CorrelationGroup } from '../correlation/types.js';
import type { AttackGraph } from '../attack-path/types.js';
import type { Recommendation } from '../recommendation/types.js';
import type { Explanation } from '../explainability/types.js';
import { readFile, writeFile, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * JSON file-based persistence provider
 */
export class JsonPersistenceProvider implements PersistenceProvider {
  readonly type: StorageBackend = 'json';
  private dataDir: string;
  private eventHandlers: PersistenceEventHandler[] = [];
  private initialized = false;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async initialize(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await mkdir(join(this.dataDir, 'reports'), { recursive: true });
    await mkdir(join(this.dataDir, 'snapshots'), { recursive: true });
    this.initialized = true;
    this.emit('persistence:initialized', {});
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  async isHealthy(): Promise<boolean> {
    return this.initialized;
  }

  onEvent(handler: PersistenceEventHandler): void {
    this.eventHandlers.push(handler);
  }

  getReportRepository(): ReportRepository {
    return new JsonReportRepository(this.dataDir, this);
  }

  getFindingRepository(): FindingRepository {
    return new JsonFindingRepository(this.dataDir, this);
  }

  getRiskRepository(): RiskRepository {
    return new JsonRiskRepository(this.dataDir, this);
  }

  getCorrelationRepository(): CorrelationRepository {
    return new JsonCorrelationRepository(this.dataDir, this);
  }

  getAttackPathRepository(): AttackPathRepository {
    return new JsonAttackPathRepository(this.dataDir, this);
  }

  getRecommendationRepository(): RecommendationRepository {
    return new JsonRecommendationRepository(this.dataDir, this);
  }

  getExplainabilityRepository(): ExplainabilityRepository {
    return new JsonExplainabilityRepository(this.dataDir, this);
  }

  getSnapshotRepository(): SnapshotRepository {
    return new JsonSnapshotRepository(this.dataDir, this);
  }

  async getStatistics(): Promise<StorageStatistics> {
    const reportsDir = join(this.dataDir, 'reports');
    const files = await readdir(reportsDir).catch(() => [] as string[]);
    let totalSize = 0;
    let oldest: Date | undefined;
    let newest: Date | undefined;
    let totalFindings = 0;
    let totalReports = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = join(reportsDir, file);
      const s = await stat(filePath);
      totalSize += s.size;
      totalReports++;
      try {
        const content = await readFile(filePath, 'utf-8');
        const report = JSON.parse(content);
        totalFindings += report.findings?.length ?? 0;
        const ts = new Date(report.timestamp);
        if (!oldest || ts < oldest) oldest = ts;
        if (!newest || ts > newest) newest = ts;
      } catch { /* skip corrupted */ }
    }

    const snapshotsDir = join(this.dataDir, 'snapshots');
    const snapshotFiles = await readdir(snapshotsDir).catch(() => [] as string[]);

    return {
      totalReports,
      totalFindings,
      totalSnapshots: snapshotFiles.length,
      storageSizeBytes: totalSize,
      oldestReport: oldest,
      newestReport: newest,
      byBackend: { json: { count: totalReports, sizeBytes: totalSize }, sqlite: { count: 0, sizeBytes: 0 }, postgres: { count: 0, sizeBytes: 0 }, neo4j: { count: 0, sizeBytes: 0 }, redis: { count: 0, sizeBytes: 0 } },
    };
  }

  emit(type: PersistenceEvent['type'], data: Record<string, unknown>): void {
    const event: PersistenceEvent = { type, timestamp: new Date(), data };
    for (const handler of this.eventHandlers) {
      try { handler(event); } catch { /* ignore */ }
    }
  }
}

abstract class JsonBaseRepository {
  protected dataDir: string;
  protected provider: JsonPersistenceProvider;

  constructor(dataDir: string, provider: JsonPersistenceProvider) {
    this.dataDir = dataDir;
    this.provider = provider;
  }

  protected async readReport(reportId: string): Promise<SecurityIntelligenceReport | null> {
    try {
      const filePath = join(this.dataDir, 'reports', `${reportId}.json`);
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  protected async writeReport(report: SecurityIntelligenceReport): Promise<void> {
    const filePath = join(this.dataDir, 'reports', `${report.id}.json`);
    await writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  }
}

class JsonReportRepository extends JsonBaseRepository implements ReportRepository {
  async save(report: SecurityIntelligenceReport): Promise<string> {
    await this.writeReport(report);
    this.provider.emit('persistence:report-saved', { reportId: report.id });
    return report.id;
  }

  async load(id: string): Promise<SecurityIntelligenceReport | null> {
    const report = await this.readReport(id);
    if (report) this.provider.emit('persistence:report-loaded', { reportId: id });
    return report;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const filePath = join(this.dataDir, 'reports', `${id}.json`);
      await rm(filePath);
      this.provider.emit('persistence:report-deleted', { reportId: id });
      return true;
    } catch {
      return false;
    }
  }

  async list(options?: { limit?: number; offset?: number }): Promise<Array<{ id: string; timestamp: Date; findingsCount: number }>> {
    const reportsDir = join(this.dataDir, 'reports');
    const files = await readdir(reportsDir).catch(() => [] as string[]);
    const results: Array<{ id: string; timestamp: Date; findingsCount: number }> = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await readFile(join(reportsDir, file), 'utf-8');
        const report = JSON.parse(content);
        results.push({ id: report.id, timestamp: new Date(report.timestamp), findingsCount: report.findings?.length ?? 0 });
      } catch { /* skip */ }
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  async getSummary(id: string): Promise<Record<string, unknown> | null> {
    const report = await this.readReport(id);
    if (!report) return null;
    return {
      id: report.id,
      runId: report.runId,
      timestamp: report.timestamp,
      findingsCount: report.findings.length,
      riskSummary: report.riskSummary,
      metrics: report.metrics,
    };
  }
}

class JsonFindingRepository extends JsonBaseRepository implements FindingRepository {
  async save(_findings: SecurityFinding[], _reportId: string): Promise<void> {
    // Findings are saved as part of the report
  }

  async findByReport(reportId: string): Promise<SecurityFinding[]> {
    const report = await this.readReport(reportId);
    return report?.findings ?? [];
  }

  async findById(id: string): Promise<SecurityFinding | null> {
    const reportsDir = join(this.dataDir, 'reports');
    const files = await readdir(reportsDir).catch(() => [] as string[]);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await readFile(join(reportsDir, file), 'utf-8');
        const report = JSON.parse(content);
        const finding = report.findings?.find((f: SecurityFinding) => f.id === id);
        if (finding) return finding;
      } catch { continue; }
    }
    return null;
  }

  async search(query: string, options?: { limit?: number; offset?: number }): Promise<SecurityFinding[]> {
    const results: SecurityFinding[] = [];
    const reportsDir = join(this.dataDir, 'reports');
    const files = await readdir(reportsDir).catch(() => [] as string[]);
    const q = query.toLowerCase();

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await readFile(join(reportsDir, file), 'utf-8');
        const report = JSON.parse(content);
        for (const f of report.findings ?? []) {
          if (f.name?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q) || f.host?.toLowerCase().includes(q)) {
            results.push(f);
          }
        }
      } catch { continue; }
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  async deleteByReport(_reportId: string): Promise<number> {
    return 0; // Findings are deleted with the report
  }
}

class JsonRiskRepository extends JsonBaseRepository implements RiskRepository {
  async save(_risks: RiskAssessment[], _reportId: string): Promise<void> {}
  async findByReport(reportId: string): Promise<RiskAssessment[]> {
    const report = await this.readReport(reportId);
    return report?.risks ?? [];
  }
  async findTop(limit: number): Promise<RiskAssessment[]> {
    const all: RiskAssessment[] = [];
    const reportsDir = join(this.dataDir, 'reports');
    const files = await readdir(reportsDir).catch(() => [] as string[]);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await readFile(join(reportsDir, file), 'utf-8');
        const report = JSON.parse(content);
        all.push(...(report.risks ?? []));
      } catch { continue; }
    }
    return all.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

class JsonCorrelationRepository extends JsonBaseRepository implements CorrelationRepository {
  async save(_correlations: Correlation[], _groups: CorrelationGroup[], _reportId: string): Promise<void> {}
  async findByReport(_reportId: string): Promise<{ correlations: Correlation[]; groups: CorrelationGroup[] }> {
    // Correlation data is stored as statistics in the report;
    // a full relational store would need a dedicated storage approach
    return { correlations: [], groups: [] };
  }
}

class JsonAttackPathRepository extends JsonBaseRepository implements AttackPathRepository {
  async save(_graph: AttackGraph, _reportId: string): Promise<void> {}
  async findByReport(reportId: string): Promise<AttackGraph | null> {
    const report = await this.readReport(reportId);
    return report?.attackPaths?.[0] ?? null;
  }
}

class JsonRecommendationRepository extends JsonBaseRepository implements RecommendationRepository {
  async save(_recommendations: Recommendation[], _reportId: string): Promise<void> {}
  async findByReport(reportId: string): Promise<Recommendation[]> {
    const report = await this.readReport(reportId);
    return report?.recommendations ?? [];
  }
}

class JsonExplainabilityRepository extends JsonBaseRepository implements ExplainabilityRepository {
  async save(_explanations: Explanation[], _reportId: string): Promise<void> {}
  async findByReport(reportId: string): Promise<Explanation[]> {
    const report = await this.readReport(reportId);
    return report?.explanations ?? [];
  }
  async findByTarget(targetId: string): Promise<Explanation | null> {
    const reportsDir = join(this.dataDir, 'reports');
    const files = await readdir(reportsDir).catch(() => [] as string[]);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await readFile(join(reportsDir, file), 'utf-8');
        const report = JSON.parse(content);
        const expl = report.explanations?.find((e: Explanation) => e.targetId === targetId);
        if (expl) return expl;
      } catch { continue; }
    }
    return null;
  }
}

class JsonSnapshotRepository extends JsonBaseRepository implements SnapshotRepository {
  async create(reportId: string, data: Buffer, description?: string): Promise<SnapshotMetadata> {
    const snapshotId = crypto.randomUUID();
    const metadata: SnapshotMetadata = {
      id: snapshotId,
      reportId,
      createdAt: new Date(),
      size: data.length,
      format: 'json',
      description: description ?? `Snapshot of report ${reportId}`,
    };
    const filePath = join(this.dataDir, 'snapshots', `${snapshotId}.json`);
    await writeFile(filePath, JSON.stringify({ metadata, data: data.toString('base64') }), 'utf-8');
    this.provider.emit('persistence:snapshot-created', { snapshotId, reportId });
    return metadata;
  }

  async restore(snapshotId: string): Promise<SecurityIntelligenceReport> {
    const filePath = join(this.dataDir, 'snapshots', `${snapshotId}.json`);
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const reportBuffer = Buffer.from(parsed.data, 'base64');
    return JSON.parse(reportBuffer.toString('utf-8'));
  }

  async list(): Promise<SnapshotMetadata[]> {
    const snapshotsDir = join(this.dataDir, 'snapshots');
    const files = await readdir(snapshotsDir).catch(() => [] as string[]);
    const results: SnapshotMetadata[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await readFile(join(snapshotsDir, file), 'utf-8');
        const parsed = JSON.parse(content);
        results.push(parsed.metadata);
      } catch { continue; }
    }
    return results;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await rm(join(this.dataDir, 'snapshots', `${id}.json`));
      return true;
    } catch { return false; }
  }
}
