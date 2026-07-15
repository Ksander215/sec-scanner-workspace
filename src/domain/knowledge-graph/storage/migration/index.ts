/**
 * Knowledge Graph Storage Adapter — Migration Layer
 *
 * Interface for migrating data between storage backends.
 * Enables future migration from NetworkX → Neo4j → Memgraph
 * without changing business logic.
 *
 * The migration process:
 * 1. Export data from source adapter
 * 2. Transform data if needed (schema changes)
 * 3. Import data into target adapter
 * 4. Verify data integrity
 *
 * No actual migrations are implemented yet — this is the interface
 * and a JSON-based migration pipeline that works with any
 * GraphStorageProvider.
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { MigrationResult, MigrationProgressCallback } from '../types/index.ts';
import type { GraphStorageProvider } from '../provider/index.ts';
import { ExportFormat, ImportFormat } from '../types/index.ts';

// ─── Storage Migration Interface ──────────────────────────────

/**
 * Interface for storage migrations.
 * Each migration step knows how to transform data from one
 * adapter type to another.
 */
export interface StorageMigration {
  /** Source adapter type identifier */
  readonly fromAdapter: string;

  /** Target adapter type identifier */
  readonly toAdapter: string;

  /** Migration version */
  readonly version: string;

  /** Human-readable description */
  readonly description: string;

  /**
   * Execute the migration from source to target.
   * The callback provides progress updates during long-running migrations.
   */
  migrate(
    source: GraphStorageProvider,
    target: GraphStorageProvider,
    onProgress?: MigrationProgressCallback,
  ): Promise<MigrationResult>;
}

// ─── Generic JSON Migration ───────────────────────────────────

/**
 * Generic migration that exports from source as JSON and imports
 * into target. Works with any pair of GraphStorageProvider
 * implementations.
 */
export class GenericJSONMigration implements StorageMigration {
  readonly fromAdapter = '*';
  readonly toAdapter = '*';
  readonly version = '1.0.0';
  readonly description = 'Generic JSON-based migration between any storage backends';

  async migrate(
    source: GraphStorageProvider,
    target: GraphStorageProvider,
    onProgress?: MigrationProgressCallback,
  ): Promise<MigrationResult> {
    const errors: string[] = [];
    const start = performance.now();

    try {
      // Phase 1: Export from source
      onProgress?.({ phase: 'export', currentStep: 1, totalSteps: 4, message: 'Exporting from source...' });
      const exportResult = await source.exportGraph({
        format: ExportFormat.JSON,
        includeMetadata: true,
        prettyPrint: false,
      });

      // Phase 2: Transform (identity for generic migration)
      onProgress?.({ phase: 'transform', currentStep: 2, totalSteps: 4, message: 'Transforming data...' });
      // No transformation needed for generic JSON migration

      // Phase 3: Import into target
      onProgress?.({ phase: 'import', currentStep: 3, totalSteps: 4, message: 'Importing into target...' });
      const importResult = await target.importGraph(exportResult.data, {
        format: ImportFormat.JSON,
        mergeStrategy: 'replace',
        validateBeforeImport: true,
      });

      errors.push(...importResult.errors);

      // Phase 4: Verify
      onProgress?.({ phase: 'verify', currentStep: 4, totalSteps: 4, message: 'Verifying migration...' });
      const sourceStats = source.getStatistics();
      const targetStats = target.getStatistics();

      if (sourceStats.nodeCount !== targetStats.nodeCount) {
        errors.push(
          `Node count mismatch: source=${sourceStats.nodeCount}, target=${targetStats.nodeCount}`,
        );
      }
      if (sourceStats.edgeCount !== targetStats.edgeCount) {
        errors.push(
          `Edge count mismatch: source=${sourceStats.edgeCount}, target=${targetStats.edgeCount}`,
        );
      }

      return {
        success: errors.length === 0,
        nodesMigrated: importResult.nodesImported,
        edgesMigrated: importResult.edgesImported,
        errors,
        durationMs: performance.now() - start,
      };
    } catch (e) {
      errors.push(`Migration failed: ${(e as Error).message}`);
      return {
        success: false,
        nodesMigrated: 0,
        edgesMigrated: 0,
        errors,
        durationMs: performance.now() - start,
      };
    }
  }
}

// ─── Migration Registry ───────────────────────────────────────

/**
 * Registry of available migrations.
 * Can be extended with custom migrations for specific adapter pairs.
 */
export class MigrationRegistry {
  private readonly _migrations: Map<string, StorageMigration> = new Map();

  /** Register a migration */
  register(migration: StorageMigration): void {
    const key = `${migration.fromAdapter}->${migration.toAdapter}`;
    this._migrations.set(key, migration);
  }

  /** Get a migration for a specific source→target pair */
  get(fromAdapter: string, toAdapter: string): StorageMigration | undefined {
    const key = `${fromAdapter}->${toAdapter}`;
    return this._migrations.get(key) ?? this._migrations.get('*->*');
  }

  /** List all registered migrations */
  list(): readonly StorageMigration[] {
    return Array.from(this._migrations.values());
  }

  /** Check if a migration exists for a specific pair */
  has(fromAdapter: string, toAdapter: string): boolean {
    return this._migrations.has(`${fromAdapter}->${toAdapter}`) ||
           this._migrations.has('*->*');
  }
}

/** Pre-built registry with the generic JSON migration */
export function createDefaultMigrationRegistry(): MigrationRegistry {
  const registry = new MigrationRegistry();
  registry.register(new GenericJSONMigration());
  return registry;
}
