#!/usr/bin/env node
import { Command } from 'commander';
import { SecurityIntelligenceBuilder } from '../domain/security-intelligence/orchestrator/builder.js';
import { PersistenceBuilder } from '../domain/security-intelligence/persistence/builder.js';
import { ConfigManager } from './config/manager.js';
import { registerAnalyzeCommand } from './commands/analyze.js';
import { registerReportsCommand } from './commands/reports.js';
import { registerFindingsCommand } from './commands/findings.js';
import { registerRiskCommand } from './commands/risk.js';
import { registerAttackCommand } from './commands/attack.js';
import { registerRecommendationCommand } from './commands/recommendation.js';
import { registerExplainCommand } from './commands/explain.js';
import { registerPersistenceCommand } from './commands/persistence.js';
import { registerConfigCommand } from './commands/config.js';
import { registerServerCommand } from './commands/server.js';

export async function main(): Promise<void> {
  // Load configuration
  const configManager = new ConfigManager();
  const config = await configManager.load();

  // Initialize engine (local mode)
  const engine = new SecurityIntelligenceBuilder().build();

  // Initialize persistence
  const persistence = new PersistenceBuilder()
    .withDataDir(config.persistence.dataDir)
    .build();
  await persistence.initialize();

  // Setup CLI program
  const program = new Command();
  program
    .name('si')
    .description('Security Intelligence Platform CLI')
    .version('1.0.0')
    .option('--format <format>', 'Output format (table|json|yaml|csv|jsonl|markdown)', config.output.format)
    .option('--remote', 'Use remote REST API', false);

  // Register commands
  registerAnalyzeCommand(program, config, engine, persistence);
  registerReportsCommand(program, config, persistence);
  registerFindingsCommand(program, config, persistence);
  registerRiskCommand(program, config, persistence);
  registerAttackCommand(program, config, persistence);
  registerRecommendationCommand(program, config, persistence);
  registerExplainCommand(program, config, persistence);
  registerPersistenceCommand(program, config, persistence);
  registerConfigCommand(program, configManager);
  registerServerCommand(program, engine, persistence);

  // Parse and execute
  program.parse(process.argv);
}

// Run
main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
