import type { Command } from 'commander';
import type { SecurityIntelligenceEngine } from '../../domain/security-intelligence/orchestrator/engine.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { SecurityIntelligenceApiBuilder } from '../../api/server/index.js';

export function registerServerCommand(
  program: Command,
  engine: SecurityIntelligenceEngine,
  persistence?: PersistenceEngine,
): void {
  const server = program.command('server').description('API server management');

  server
    .command('start')
    .description('Start the API server')
    .option('--port <port>', 'Port number', '8080')
    .option('--host <host>', 'Host address', '0.0.0.0')
    .action(async (options: any) => {
      const builder = new SecurityIntelligenceApiBuilder()
        .withEngine(engine)
        .withPort(Number(options.port))
        .withHost(options.host);

      if (persistence) {
        builder.withPersistence(persistence);
      }

      const api = builder.build();
      console.error(`Starting Security Intelligence API Server on ${options.host}:${options.port}...`);
      await api.start();
    });

  server
    .command('stop')
    .description('Stop the API server')
    .action(() => {
      console.error('Server stop not implemented (use Ctrl+C)');
    });

  server
    .command('status')
    .description('Check server status')
    .action(async () => {
      try {
        const response = await fetch('http://localhost:8080/health');
        const health = await response.json();
        console.log(JSON.stringify(health, null, 2));
      } catch {
        console.error('Server is not running');
      }
    });
}
