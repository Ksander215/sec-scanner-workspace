import type { Command } from 'commander';
import { OutputFormatter } from '../output/formatter.js';
import { ApiClient } from '../client/api-client.js';
import type { CliConfig } from '../config/types.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerAttackCommand(
  program: Command,
  config: CliConfig,
  persistence?: PersistenceEngine,
): void {
  const attack = program.command('attack').description('Attack path analysis');

  attack
    .command('list')
    .description('List attack paths')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getAttackPathRepository();
          const graph = await repo.findByReport(options.report);
          if (graph) {
            console.log(formatter.formatAttackPaths(graph.paths));
          } else {
            console.log('No attack paths found.');
          }
        } else {
          const client = new ApiClient(config);
          const result = await client.getAttackPaths(options.report);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  attack
    .command('graph')
    .description('Show attack graph')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', 'json')
    .action(async (options: any) => {
      const formatter = new OutputFormatter(options.format);
      try {
        if (persistence) {
          const repo = persistence.getAttackPathRepository();
          const graph = await repo.findByReport(options.report);
          console.log(formatter.formatData(graph));
        } else {
          const client = new ApiClient(config);
          const result = await client.getAttackGraph(options.report);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  attack
    .command('simulate')
    .description('Simulate attack path')
    .requiredOption('--report <id>', 'Report ID')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (_options: any) => {
      console.error('Attack path simulation is not yet implemented');
      process.exit(1);
    });
}
