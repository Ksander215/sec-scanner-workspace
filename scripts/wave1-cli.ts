#!/usr/bin/env npx tsx
/**
 * Wave 1 CLI — TASK-MVP-PROTOTYPE-READINESS-CLOSURE-001
 *
 * Minimal human-facing entry point for the AIS Wave 1 vertical slice.
 * Allows a non-developer to:
 *   project → architecture question → AIS answer → evidence → feedback
 *
 * Usage:
 *   npx tsx scripts/wave1-cli.ts <project-path> "<question>" [options]
 *
 * Options (via environment variables):
 *   OPENAI_API_KEY   Required for real LLM mode. Without it, uses stub.
 *   AIS_REAL_LLM     Set to "true" to use real GPT-4o (requires OPENAI_API_KEY)
 *   AIS_EVIDENCE_PATH  Directory for evidence files (default: .ais/evidence/)
 *
 * Examples:
 *   npx tsx scripts/wave1-cli.ts ./my-project "What is the overall architecture?"
 *   OPENAI_API_KEY=sk-... AIS_REAL_LLM=true npx tsx scripts/wave1-cli.ts ./my-project "Describe the module boundaries"
 */

import { ExecutionEngine } from '../src/core/engine/execution-engine.js';
import type { ArchitectureAnswerResponse } from '../src/core/engine/execution-engine.js';
import * as readline from 'node:readline';

const args = process.argv.slice(2);

function usage(): void {
  console.log(`
AIS Wave 1 — Architecture Intelligence System
=============================================
Usage: npx tsx scripts/wave1-cli.ts <project-path> "<question>"

Arguments:
  project-path   Path to the project directory to analyze
  question       Architecture question about the project

Environment variables:
  OPENAI_API_KEY     Set for real LLM mode (GPT-4o)
  AIS_REAL_LLM       Set "true" to enable real LLM (default: stub)
  AIS_EVIDENCE_PATH  Evidence storage directory (default: .ais/evidence/)

After receiving the answer, you will be prompted to provide feedback.
`);
}

async function main(): Promise<number> {
  if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
    usage();
    return args[0] === '--help' || args[0] === '-h' ? 0 : 1;
  }

  const projectPath = args[0];
  const question = args.slice(1).join(' ');
  const evidencePath = process.env.AIS_EVIDENCE_PATH || '.ais/evidence';

  // Ensure real execution mode
  process.env.AIS_EXECUTION_REAL = 'true';
  process.env.AIS_EVIDENCE_PATH = evidencePath;

  // Determine LLM mode
  const useRealLLM = process.env.AIS_REAL_LLM === 'true';
  if (useRealLLM && !process.env.OPENAI_API_KEY) {
    console.error('Error: AIS_REAL_LLM=true but OPENAI_API_KEY is not set.');
    console.error('Set OPENAI_API_KEY or run without AIS_REAL_LLM to use stub mode.\n');
    return 1;
  }

  const llmMode = useRealLLM ? 'REAL (GPT-4o)' : 'STUB (hardcoded responses)';
  console.log(`AIS Wave 1 — Architecture Intelligence System`);
  console.log(`LLM Mode: ${llmMode}`);
  console.log(`Evidence: ${evidencePath}`);
  console.log('---');

  // Initialize engine
  const engine = new ExecutionEngine();
  await engine.initialize();
  await engine.start();

  // Execute the pipeline
  console.log(`\nScanning project: ${projectPath}`);
  console.log(`Question: ${question}\n`);

  const result = await engine.execute<ArchitectureAnswerResponse>({
    projectId: 'cli-session',
    projectPath,
    question,
    taskId: 'WAVE1-CLI',
  });

  // Display results
  console.log('=== Discovery Summary ===');
  console.log(`  Files: ${result.discoveryStats.totalFiles}`);
  console.log(`  Modules: ${result.discoveryStats.modules}`);
  console.log(`  Dependencies: ${result.discoveryStats.dependencies}`);
  console.log(`  Tech: ${result.discoveryStats.techStack.join(', ')}`);
  console.log(`  Model: ${result.model} (${result.provider})`);
  console.log(`  Latency: ${result.latencyMs}ms`);

  console.log('\n=== AIS Answer ===');
  console.log(result.answer);

  if (result.sources.length > 0) {
    console.log('\n=== Evidence Sources ===');
    for (const s of result.sources.slice(0, 10)) {
      console.log(`  [${(s.relevance * 100).toFixed(0)}%] ${s.filePath} — ${s.description}`);
    }
  }

  if (result.evidence) {
    console.log(`\nEvidence ID: ${result.evidence.evidenceId}`);
    console.log(`Evidence stored at: ${evidencePath}/evidence/${result.evidence.evidenceId}.json`);

    // Prompt for feedback
    if (engine.evidenceStore) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const feedback = await new Promise<string>((resolve) => {
        rl.question('\nProvide feedback on this answer (or press Enter to skip): ', (ans) => {
          rl.close();
          resolve(ans);
        });
      });

      if (feedback.trim()) {
        const sentiment = await new Promise<string>((resolve) => {
          const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl2.question('Sentiment (positive/negative/neutral) [neutral]: ', (ans) => {
            rl2.close();
            resolve(ans.trim() || 'neutral');
          });
        });

        const correctedAnswer = await new Promise<string>((resolve) => {
          const rl3 = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl3.question('Corrected answer (or press Enter to skip): ', (ans) => {
            rl3.close();
            resolve(ans);
          });
        });

        try {
          const validSentiments = ['positive', 'negative', 'neutral', 'mixed'];
          const correction = await engine.evidenceStore.storeCorrection({
            evidenceId: result.evidence.evidenceId,
            content: feedback.trim(),
            sentiment: (validSentiments.includes(sentiment) ? sentiment : 'neutral') as 'positive' | 'negative' | 'neutral' | 'mixed',
            correctedAnswer: correctedAnswer.trim() || null,
          });
          console.log(`\nFeedback recorded.`);
          console.log(`Correction ID: ${correction.correctionId}`);
          console.log(`Linked to: ${correction.evidenceId}`);
        } catch (err) {
          console.error('Error storing feedback:', err instanceof Error ? err.message : err);
        }
      }
    }
  }

  await engine.stop();
  await engine.shutdown();

  console.log('\n--- Session complete ---');
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
