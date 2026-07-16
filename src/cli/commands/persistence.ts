import type { Command } from 'commander';
import { OutputFormatter } from '../output/formatter.js';
import { ApiClient } from '../client/api-client.js';
import type { CliConfig } from '../config/types.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerPersistenceCommand(
  program: Command,
  config: CliConfig,
  persistence?: PersistenceEngine,
): void {
  const snapshot = program.command('snapshot').description('Snapshot management');

  snapshot
    .command('create')
    .description('Create a snapshot')
    .requiredOption('--report <id>', 'Report ID')
    .option('--description <desc>', 'Snapshot description')
    .action(async (options: any) => {
      try {
        if (persistence) {
          const snapshotId = await persistence.createSnapshot(options.report, options.description);
          console.log(`Snapshot created: ${snapshotId}`);
        } else {
          const client = new ApiClient(config);
          const result = await client.createSnapshot(options.report, options.description);
          console.log(`Snapshot created:`, result);
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  snapshot
    .command('restore <id>')
    .description('Restore from a snapshot')
    .action(async (id: string) => {
      try {
        if (persistence) {
          const report = await persistence.restoreSnapshot(id);
          console.log(`Restored report: ${report.id}`);
        } else {
          const client = new ApiClient(config);
          const report = await client.restoreSnapshot(id);
          console.log(`Restored report:`, report.id);
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Migration command
  program
    .command('migrate')
    .description('Run database migrations')
    .action(async () => {
      console.error('Migration is not yet implemented for JSON provider');
    });

  // Storage stats command
  program
    .command('storage-stats')
    .description('Show storage statistics')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const stats = await persistence.getStatistics();
          console.log(formatter.formatData(stats));
        } else {
          const client = new ApiClient(config);
          const result = await client.getStorageStatistics();
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
