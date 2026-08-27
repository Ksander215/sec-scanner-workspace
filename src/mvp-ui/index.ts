/**
 * MVP UI — Entry Point
 * TASK-MVP-FREE-UI-001
 *
 * Wires up: PathSecurityService → InteractionService → HttpAdapter
 * Starts the HTTP server on the configured port.
 *
 * Usage:
 *   AIS_EXECUTION_REAL=true AIS_REAL_LLM=true OPENAI_API_KEY=sk-... \
 *     npx tsx src/mvp-ui/index.ts
 *
 * Or after build:
 *   AIS_EXECUTION_REAL=true AIS_REAL_LLM=true OPENAI_API_KEY=sk-... \
 *     node dist/mvp-ui/index.js
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ExecutionEngine } from '../core/engine/execution-engine.js';
import { SessionRuntime, InMemorySessionStorageAdapter } from '../core/session/index.js';
import { EvidenceLoopService } from '../core/evidence-loop/evidence-loop-service.js';
import { InteractionService } from '../core/interaction-layer/interaction-service.js';
import { HttpAdapter } from './http-adapter.js';
import { PathSecurityService } from './path-security.js';
import { getDemoConfig } from './demo-config.js';

// ═══════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = resolve(__dirname, '..', '..');

  const port = parseInt(process.env.MVP_UI_PORT ?? '3456', 10);

  console.log('[MVP-UI] Initializing AIS components...');

  // 1. Session Runtime (in-memory, no persistence for MVP)
  const sessionRuntime = new SessionRuntime({
    storageAdapter: new InMemorySessionStorageAdapter(),
  });

  // 2. Evidence Loop Service (wraps SessionRuntime, preserves I-01..I-13)
  const evidenceLoop = new EvidenceLoopService({ sessionRuntime });

  // 3. Execution Engine (requires AIS_EXECUTION_REAL=true for real inference)
  const engine = new ExecutionEngine();
  await engine.initialize();
  await engine.start();

  // 4. Interaction Service (thin orchestrator)
  const interactionService = new InteractionService({
    evidenceLoop,
    engine,
  });

  // 5. Path Security
  const demoConfig = getDemoConfig();
  const pathSecurity = new PathSecurityService({
    allowedRoots: [projectRoot],
    demoAllowlist: [demoConfig.projectPath],
  });

  // 6. HTTP Adapter
  const adapter = new HttpAdapter({
    interactionService,
    pathSecurity,
    port,
  });

  await adapter.start();

  console.log(`[MVP-UI] Server running at http://localhost:${adapter.actualPort}`);
  console.log(`[MVP-UI] Demo project: ${demoConfig.name}`);
  console.log(`[MVP-UI] AIS_EXECUTION_REAL=${process.env.AIS_EXECUTION_REAL ?? 'false'}`);
  console.log(`[MVP-UI] AIS_REAL_LLM=${process.env.AIS_REAL_LLM ?? 'false'}`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[MVP-UI] Shutting down...');
    await adapter.stop();
    await engine.stop();
    await engine.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[MVP-UI] Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
