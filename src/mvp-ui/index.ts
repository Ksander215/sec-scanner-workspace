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
import { GitHubResolver } from './github-resolver.js';
import { getDemoConfig } from './demo-config.js';

// ═══════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate that required environment variables are set for real inference.
 * Returns true if real inference is available, false otherwise.
 * Logs a clear diagnostic message either way.
 */
function validateEnvVars(): { realInferenceAvailable: boolean; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const execReal = process.env.AIS_EXECUTION_REAL === 'true';
  const realLlm = process.env.AIS_REAL_LLM === 'true';
  const hasKey = !!process.env.OPENAI_API_KEY;

  if (execReal && realLlm && hasKey) {
    diagnostics.push('Real inference: ENABLED (AIS_EXECUTION_REAL=true, AIS_REAL_LLM=true, OPENAI_API_KEY set)');
    return { realInferenceAvailable: true, diagnostics };
  }

  diagnostics.push('Real inference: NOT AVAILABLE');
  if (!execReal) diagnostics.push('  - AIS_EXECUTION_REAL is not set to "true"');
  if (!realLlm) diagnostics.push('  - AIS_REAL_LLM is not set to "true"');
  if (!hasKey) diagnostics.push('  - OPENAI_API_KEY is not set or invalid');
  diagnostics.push('To enable real inference, run with:');
  diagnostics.push('  AIS_EXECUTION_REAL=true AIS_REAL_LLM=true OPENAI_API_KEY=sk-... npx tsx src/mvp-ui/index.ts');

  return { realInferenceAvailable: false, diagnostics };
}

async function main(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = resolve(__dirname, '..', '..');

  const port = parseInt(process.env.MVP_UI_PORT ?? '3456', 10);

  console.log('[MVP-UI] Initializing AIS components...');

  // 0. Validate environment for real inference
  const envCheck = validateEnvVars();
  for (const line of envCheck.diagnostics) {
    console.log(`[MVP-UI] ${line}`);
  }

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

  // 5. GitHub Repository Resolver (TASK-MVP-FREE-REPOSITORY-UX-001)
  const githubResolver = new GitHubResolver();

  // 6. Path Security — includes clone root for GitHub repos
  const demoConfig = getDemoConfig();
  const pathSecurity = new PathSecurityService({
    allowedRoots: [projectRoot, githubResolver.getCloneRoot()],
    demoAllowlist: [demoConfig.projectPath],
  });

  // 7. HTTP Adapter
  const adapter = new HttpAdapter({
    interactionService,
    pathSecurity,
    port,
    realInferenceAvailable: envCheck.realInferenceAvailable,
    githubResolver,
  });

  await adapter.start();

  console.log(`[MVP-UI] Server running at http://localhost:${adapter.actualPort}`);
  console.log(`[MVP-UI] Demo project: ${demoConfig.name}`);
  console.log(`[MVP-UI] GitHub clone root: ${githubResolver.getCloneRoot()}`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[MVP-UI] Shutting down...');
    // Clean up all cloned repositories (TASK-MVP-FREE-REPOSITORY-UX-001)
    githubResolver.cleanupAll();
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
