import type { Command } from 'commander';
import { OutputFormatter } from '../output/formatter.js';
import { ApiClient } from '../client/api-client.js';
import type { CliConfig } from '../config/types.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerFindingsCommand(
  program: Command,
  config: CliConfig,
  persistence?: PersistenceEngine,
): void {
  const findings = program.command('findings').description('Query security findings');

  findings
    .command('list')
    .description('List findings')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', config.output.format)
    .option('--limit <n>', 'Max results', '100')
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getFindingRepository();
          const result = await repo.findByReport(options.report);
          console.log(formatter.formatFindings(result));
        } else {
          const client = new ApiClient(config);
          const result = await client.listFindings(options.report, Number(options.limit));
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  findings
    .command('search <query>')
    .description('Search findings')
    .option('--format <format>', 'Output format', config.output.format)
    .option('--limit <n>', 'Max results', '100')
    .action(async (query: string, options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getFindingRepository();
          const result = await repo.search(query, { limit: Number(options.limit) });
          console.log(formatter.formatFindings(result));
        } else {
          const client = new ApiClient(config);
          const result = await client.searchFindings(query, Number(options.limit));
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  findings
    .command('export')
    .description('Export findings')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', 'csv')
    .option('--output <file>', 'Output file', 'findings.csv')
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format);
      try {
        if (persistence) {
          const repo = persistence.getFindingRepository();
          const result = await repo.findByReport(options.report);
          const { writeFile } = await import('node:fs/promises');
          await writeFile(options.output, formatter.formatFindings(result), 'utf-8');
          console.error(`Findings exported to ${options.output}`);
        } else {
          const client = new ApiClient(config);
          const result = await client.listFindings(options.report);
          const { writeFile } = await import('node:fs/promises');
          await writeFile(options.output, formatter.formatData(result), 'utf-8');
          console.error(`Findings exported to ${options.output}`);
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
