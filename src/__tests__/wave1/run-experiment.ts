/**
 * TASK-MVP-PROTOTYPE-CONTEXT-QUALITY-001 — Experiment Runner
 *
 * Runs the Wave 1 pipeline against the AIS repo itself (self-referential)
 * with a real LLM and outputs evidence metrics for AC evaluation.
 *
 * Usage:
 *   AIS_EXECUTION_REAL=true AIS_REAL_LLM=true \
 *   AIS_EVIDENCE_PATH=./evidence \
 *   npx ts-node src/__tests__/wave1/run-experiment.ts
 */

import { ExecutionEngine } from '../../core/engine/execution-engine.js';
import type { ArchitectureAnswerResponse } from '../../core/engine/execution-engine.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';

// Project scans itself — resolve to repo root (2 levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(dirname(dirname(dirname(__filename)))));

// The experiment question (same for CONTROL and EXPERIMENT comparison)
const QUESTION = 'What are the main components inside src/core/engine and what do they do?';

async function main() {
  console.log('=== TASK-MVP-PROTOTYPE-CONTEXT-QUALITY-001 ===');
  console.log(`Repo root:   ${REPO_ROOT}`);
  console.log(`Question:    ${QUESTION}`);
  console.log(`REAL_LLM:    ${process.env.AIS_REAL_LLM ?? 'false'}`);
  console.log(`EVIDENCE:    ${process.env.AIS_EVIDENCE_PATH ?? './evidence'}`);
  console.log('');

  // Ensure evidence directory exists
  const evidencePath = process.env.AIS_EVIDENCE_PATH ?? './evidence';
  if (!existsSync(evidencePath)) {
    mkdirSync(evidencePath, { recursive: true });
  }

  const engine = new ExecutionEngine();
  await engine.initialize();
  await engine.start();

  const result = await engine.execute<ArchitectureAnswerResponse>({
    projectId: 'ais-self-scan',
    projectPath: REPO_ROOT,
    question: QUESTION,
    taskId: 'CONTEXT-QUALITY-V3',
  });

  await engine.stop();
  await engine.shutdown();

  // ─── Output Results ───────────────────────────────────────
  console.log('--- Discovery Summary ---');
  console.log(`Files:       ${result.discoveryStats.totalFiles}`);
  console.log(`Modules:     ${result.discoveryStats.modules}`);
  console.log(`Deps:        ${result.discoveryStats.dependencies}`);
  console.log(`Tech:        ${result.discoveryStats.techStack.join(', ')}`);
  console.log('');

  console.log('--- Answer ---');
  console.log(result.answer);
  console.log('');

  console.log('--- Evidence Sources ---');
  for (const src of result.sources) {
    const hasSnippet = src.snippet.length > 0;
    console.log(`  [${src.relevance}] ${src.filePath}  snippet=${hasSnippet ? src.snippet.length + 'chars' : 'EMPTY'}`);
  }
  console.log('');

  // Evidence file location
  if (result.evidence) {
    const evidenceDir = join(evidencePath, 'evidence');
    if (existsSync(evidenceDir)) {
      const files = readdirSync(evidenceDir).filter(f => f.endsWith('.json'));
      console.log(`Evidence files: ${files.length}`);
      for (const f of files) {
        const data = JSON.parse(readFileSync(join(evidenceDir, f), 'utf-8'));
        console.log(`  ${f}`);
        console.log(`    promptTokens:    ${data.tokens.promptTokens}`);
        console.log(`    completionTokens: ${data.tokens.completionTokens}`);
        console.log(`    totalTokens:     ${data.tokens.totalTokens}`);
        console.log(`    latencyMs:       ${data.latencyMs}`);
        console.log(`    sources:         ${data.sources.length}`);
        const emptySnippets = data.sources.filter((s: any) => !s.snippet || s.snippet.length === 0).length;
        console.log(`    emptySnippets:   ${emptySnippets}`);
        console.log(`    provider:        ${data.provider}`);
      }
    }
  }

  console.log('');
  console.log(`Evidence ID: ${result.evidence?.evidenceId ?? 'none'}`);
  console.log(`Latency: ${result.latencyMs}ms`);
}

main().catch(err => {
  console.error('Experiment failed:', err);
  process.exit(1);
});
