/**
 * Demo Configuration — MVP UI
 * TASK-MVP-FREE-UI-001 §26
 *
 * Defines the demo project: AIS self-analysis.
 * The demo session uses provenance='human' (per UX contract resolution),
 * differs from "my project" by projectScope.
 *
 * Demo invariant:
 *   D-01: Demo sessions use AIS project as projectScope
 *   D-02: Demo sessions are isolated — no cross-contamination with user sessions
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Resolve the AIS project root (where this code lives).
 * Used as the demo project path for self-analysis.
 */
function getAisProjectRoot(): string {
 // __dirname equivalent for ES modules
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = dirname(__filename);
 // From src/mvp-ui/demo-config.ts → project root
 return resolve(__dirname, '..', '..');
}

/** Suggested questions for demo mode (AIS self-analysis). */
export const DEMO_SUGGESTED_QUESTIONS: readonly string[] = [
  'What is the overall architecture of this project?',
  'How does the Evidence Loop Service enforce invariants?',
  'What are the main dependencies between core modules?',
  'How does the Interaction Service orchestrate a user question?',
];

/** Demo project configuration. */
export interface DemoProjectConfig {
 /** Display name for the demo project. */
 readonly name: string;
 /** Resolved absolute path to the demo project. */
 readonly projectPath: string;
 /** Suggested questions for the user. */
 readonly suggestedQuestions: readonly string[];
 /** Description shown on the Start screen. */
 readonly description: string;
}

/**
 * Get the demo project configuration.
 * The demo project is the AIS codebase itself (self-analysis).
 */
export function getDemoConfig(): DemoProjectConfig {
 const projectPath = getAisProjectRoot();

 return Object.freeze({
  name: 'AIS Self-Analysis',
  projectPath,
  suggestedQuestions: DEMO_SUGGESTED_QUESTIONS,
  description:
   'Analyze the AIS (Adaptive Intelligence System) codebase — ' +
   'a TypeScript library with 37 modules, evidence loop, interaction layer, ' +
   'and cognitive runtime. Ask about architecture, invariants, or dependencies.',
 });
}

/**
 * Get the full list of demo project configurations.
 * Currently only one: AIS self-analysis.
 * Future: additional demo projects can be added here.
 */
export function getAllDemoConfigs(): readonly DemoProjectConfig[] {
 return Object.freeze([getDemoConfig()]);
}
