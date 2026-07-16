import { readFile } from 'node:fs/promises';
import type { Command } from 'commander';
import type { SecurityIntelligenceEngine } from '../../domain/security-intelligence/orchestrator/engine.js';
import type { SecurityIntelligenceReport } from '../../domain/security-intelligence/orchestrator/types.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { OutputFormatter } from '../output/formatter.js';
import { ProgressRenderer } from '../progress/renderer.js';
import { ApiClient } from '../client/api-client.js';
import type { CliConfig } from '../config/types.js';

export function registerAnalyzeCommand(
  program: Command,
  config: CliConfig,
  engine?: SecurityIntelligenceEngine,
  persistence?: PersistenceEngine,
): void {
  program
    .command('analyze <input>')
    .description('Run security analysis on scan results')
    .option('--persist', 'Persist results to storage', false)
    .option('--explain', 'Generate explanations', true)
    .option('--no-explain', 'Skip explanations')
    .option('--output <file>', 'Output file path')
    .option('--format <format>', 'Output format (table|json|yaml|csv|jsonl|markdown)', config.output.format)
    .option('--remote', 'Use remote REST API', false)
    .option('--local', 'Use local engine (default)', true)
    .action(async (input: string, options: any) => {
      const formatter = new OutputFormatter(options.format ?? config.output.format);
      const progressRenderer = new ProgressRenderer();

      try {
        // Read input file
        const content = await readFile(input, 'utf-8');
        const scanData = JSON.parse(content);
        const findings = scanData.findings ?? scanData;

        let report: SecurityIntelligenceReport;

        if (options.remote) {
          // Remote mode — use REST API
          const client = new ApiClient(config);
          console.error('Running analysis via REST API...');
          report = await client.analyzeSync({ findings });
        } else {
          // Local mode — use embedded engine
          if (!engine) {
            console.error('Error: Engine not available. Use --remote to connect to API server.');
            process.exit(1);
          }

          console.error('Running analysis with local engine...');
          report = await engine.analyze(
            { findings },
            {
              persist: options.persist,
              explain: options.explain,
              onProgress: (progress) => progressRenderer.render(progress),
            },
          );
        }

        progressRenderer.clear();

        // Persist if requested
        if (options.persist && persistence) {
          await persistence.saveReport(report);
          console.error(`Report saved: ${report.id}`);
        }

        // Output
        const output = formatter.formatReport(report);
        if (options.output) {
          const { writeFile } = await import('node:fs/promises');
          await writeFile(options.output, output, 'utf-8');
          console.error(`Output written to ${options.output}`);
        } else {
          console.log(output);
        }
      } catch (err) {
        progressRenderer.clear();
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
