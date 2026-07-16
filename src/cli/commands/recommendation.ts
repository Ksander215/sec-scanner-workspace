import type { Command } from 'commander';
import { OutputFormatter } from '../output/formatter.js';
import { ApiClient } from '../client/api-client.js';
import type { CliConfig } from '../config/types.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerRecommendationCommand(
  program: Command,
  config: CliConfig,
  persistence?: PersistenceEngine,
): void {
  const recommend = program.command('recommend').description('Security recommendations');

  recommend
    .command('list')
    .description('List recommendations')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getRecommendationRepository();
          const recs = await repo.findByReport(options.report);
          console.log(formatter.formatRecommendations(recs));
        } else {
          const client = new ApiClient(config);
          const result = await client.getRecommendations(options.report);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  recommend
    .command('plan')
    .description('Generate remediation plan')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const report = await persistence.loadReport(options.report);
          if (!report) { console.error(`Report not found`); process.exit(1); }
          console.log(formatter.formatData(report.remediationPlan));
        } else {
          const client = new ApiClient(config);
          const result = await client.createRemediationPlan(options.report);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  recommend
    .command('export')
    .description('Export recommendations')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', 'markdown')
    .option('--output <file>', 'Output file', 'recommendations.md')
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format);
      try {
        if (persistence) {
          const repo = persistence.getRecommendationRepository();
          const recs = await repo.findByReport(options.report);
          const { writeFile } = await import('node:fs/promises');
          await writeFile(options.output, formatter.formatRecommendations(recs), 'utf-8');
          console.error(`Recommendations exported to ${options.output}`);
        } else {
          const client = new ApiClient(config);
          const result = await client.getRecommendations(options.report);
          const { writeFile } = await import('node:fs/promises');
          await writeFile(options.output, formatter.formatData(result), 'utf-8');
          console.error(`Recommendations exported to ${options.output}`);
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
