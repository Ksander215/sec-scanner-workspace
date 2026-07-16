import type { Command } from 'commander';
import { OutputFormatter } from '../output/formatter.js';
import { ApiClient } from '../client/api-client.js';
import type { CliConfig } from '../config/types.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerExplainCommand(
  program: Command,
  config: CliConfig,
  persistence?: PersistenceEngine,
): void {
  const explain = program.command('explain').description('Explainability');

  explain
    .command('finding <id>')
    .description('Explain a finding')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (id: string, options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getExplainabilityRepository();
          const explanation = await repo.findByTarget(id);
          if (!explanation) { console.error(`Explanation not found`); process.exit(1); }
          console.log(formatter.formatData(explanation));
        } else {
          const client = new ApiClient(config);
          const result = await client.getExplanation(id);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  explain
    .command('risk <id>')
    .description('Explain a risk assessment')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (id: string, options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getExplainabilityRepository();
          const explanation = await repo.findByTarget(id);
          if (!explanation) { console.error(`Explanation not found`); process.exit(1); }
          console.log(formatter.formatData(explanation));
        } else {
          const client = new ApiClient(config);
          const result = await client.getExplanation(id);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  explain
    .command('recommendation <id>')
    .description('Explain a recommendation')
    .option('--format <format>', 'Output format', config.output.format)
    .action(async (id: string, options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      try {
        if (persistence) {
          const repo = persistence.getExplainabilityRepository();
          const explanation = await repo.findByTarget(id);
          if (!explanation) { console.error(`Explanation not found`); process.exit(1); }
          console.log(formatter.formatData(explanation));
        } else {
          const client = new ApiClient(config);
          const result = await client.getExplanation(id);
          console.log(formatter.formatData(result));
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
