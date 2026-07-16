import type { Command } from 'commander';
import { OutputFormatter } from '../output/formatter.js';
import { ApiClient } from '../client/api-client.js';
import type { CliConfig } from '../config/types.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerReportsCommand(
  program: Command,
  config: CliConfig,
  persistence?: PersistenceEngine,
): void {
  const reports = program.command('reports').description('Manage analysis reports');

  reports
    .command('list')
    .description('List all reports')
    .option('--format <format>', 'Output format', config.output.format)
    .option('--limit <n>', 'Max results', '100')
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getReportRepository();
          const list = await repo.list({ limit: Number(options.limit) });
          console.log(formatter.formatData(list));
        } else {
          const client = new ApiClient(config);
          const result = await client.listReports(Number(options.limit));
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  reports
    .command('show <id>')
    .description('Show report details')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (id: string, options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const report = await persistence.loadReport(id);
          if (!report) { console.error(`Report ${id} not found`); process.exit(1); }
          console.log(formatter.formatReport(report));
        } else {
          const client = new ApiClient(config);
          const report = await client.getReport(id);
          console.log(formatter.formatData(report));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  reports
    .command('export <id>')
    .description('Export report to file')
    .option('--format <format>', 'Output format', 'json')
    .option('--output <file>', 'Output file', 'report.json')
    .action(async (id: string, options: any) => {
      const formatter = new OutputFormatter(options.format);
      try {
        let report: any;
        if (persistence) {
          report = await persistence.loadReport(id);
          if (!report) { console.error(`Report ${id} not found`); process.exit(1); }
        } else {
          const client = new ApiClient(config);
          report = await client.getReport(id);
        }
        const { writeFile } = await import('node:fs/promises');
        await writeFile(options.output, formatter.formatData(report), 'utf-8');
        console.error(`Report exported to ${options.output}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
