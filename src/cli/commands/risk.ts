import type { Command } from 'commander';
import { OutputFormatter } from '../output/formatter.js';
import { ApiClient } from '../client/api-client.js';
import type { CliConfig } from '../config/types.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerRiskCommand(
  program: Command,
  config: CliConfig,
  persistence?: PersistenceEngine,
): void {
  const risk = program.command('risk').description('Risk assessment');

  risk
    .command('summary')
    .description('Show risk summary')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const report = await persistence.loadReport(options.report);
          if (!report) { console.error(`Report not found`); process.exit(1); }
          console.log(formatter.formatData(report.riskSummary));
        } else {
          const client = new ApiClient(config);
          const result = await client.getRiskSummary(options.report);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  risk
    .command('top')
    .description('Show top risks')
    .option('--limit <n>', 'Max results', '10')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getRiskRepository();
          const risks = await repo.findTop(Number(options.limit));
          console.log(formatter.formatRisks(risks));
        } else {
          const client = new ApiClient(config);
          const result = await client.getTopRisks(Number(options.limit));
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  risk
    .command('show')
    .description('Show risks for a report')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getRiskRepository();
          const risks = await repo.findByReport(options.report);
          console.log(formatter.formatRisks(risks));
        } else {
          const client = new ApiClient(config);
          const result = await client.getRisks(options.report);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
