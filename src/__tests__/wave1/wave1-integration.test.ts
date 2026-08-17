/**
 * Wave 1 Integration Tests — TASK-MVP-PROTOTYPE-READINESS-CLOSURE-001
 *
 * Exercises the actual Wave 1 code paths:
 * - AIS_EXECUTION_REAL=true / false
 * - Discovery pipeline
 * - Context construction
 * - Evidence persistence
 * - Feedback / correction
 * - Original answer preservation
 * - resolveModuleName graph-edge fix
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { ExecutionEngine } from '../../core/engine/execution-engine.js';
import type { ArchitectureAnswerResponse } from '../../core/engine/execution-engine.js';
import { DiscoveryPipelineService } from '../../core/discovery/discovery-pipeline.service.js';
import { FileEvidenceStoreAdapter } from '../../core/validation/evidence-store.js';
import type { EvidenceRecord } from '../../core/validation/evidence-types.js';

const FIXTURE_ROOT = '/tmp/wave1-test-' + process.pid;
const EVIDENCE_DIR = '/tmp/wave1-evidence-' + process.pid;

function buildFixture(root: string): void {
  mkdirSync(join(root, 'src', 'auth'), { recursive: true });
  mkdirSync(join(root, 'src', 'api'), { recursive: true });
  mkdirSync(join(root, 'src', 'utils'), { recursive: true });

  writeFileSync(join(root, 'src', 'auth', 'auth.service.ts'), `
import { hashPassword } from '../utils/hash.js';
export class AuthService {
  async login(user: string, pass: string) { return hashPassword(pass); }
}
`);

  writeFileSync(join(root, 'src', 'api', 'user.controller.ts'), `
import { AuthService } from '../auth/auth.service.js';
export class UserController {
  private auth = new AuthService();
  async getUser(id: string) { return this.auth.login(id, ''); }
}
`);

  writeFileSync(join(root, 'src', 'utils', 'hash.ts'), `
export function hashPassword(p: string): string { return p; }
`);

  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name: 'test-project',
    dependencies: { express: '^4.18.0' },
    devDependencies: { typescript: '^5.3.0', vitest: '^1.0.0' },
  }, null, 2));

  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'NodeNext' },
  }, null, 2));
}

function cleanDir(dir: string): void {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

describe('Wave 1 Integration', () => {
  beforeEach(() => {
    cleanDir(FIXTURE_ROOT);
    cleanDir(EVIDENCE_DIR);
    buildFixture(FIXTURE_ROOT);
    delete process.env.AIS_EXECUTION_REAL;
    delete process.env.AIS_REAL_LLM;
    delete process.env.AIS_EVIDENCE_PATH;
  });

  afterEach(() => {
    cleanDir(FIXTURE_ROOT);
    cleanDir(EVIDENCE_DIR);
    delete process.env.AIS_EXECUTION_REAL;
    delete process.env.AIS_REAL_LLM;
    delete process.env.AIS_EVIDENCE_PATH;
  });

  // ─── FLAG=FALSE FALLBACK ─────────────────────────────────────

  describe('flag=false fallback', () => {
    it('returns empty object when AIS_EXECUTION_REAL is not set', async () => {
      const engine = new ExecutionEngine();
      await engine.initialize();
      await engine.start();
      const result = await engine.execute<Record<string, unknown>>({
        projectId: 'test',
        projectPath: FIXTURE_ROOT,
        question: 'test?',
      });
      expect(result).toEqual({});
      await engine.stop();
      await engine.shutdown();
    });

    it('returns empty object when AIS_EXECUTION_REAL is false', async () => {
      process.env.AIS_EXECUTION_REAL = 'false';
      const engine = new ExecutionEngine();
      await engine.initialize();
      await engine.start();
      const result = await engine.execute<Record<string, unknown>>({
        projectId: 'test',
        projectPath: FIXTURE_ROOT,
        question: 'test?',
      });
      expect(result).toEqual({});
      await engine.stop();
      await engine.shutdown();
    });
  });

  // ─── DISCOVERY ────────────────────────────────────────────────

  describe('Discovery', () => {
    it('discovers files, modules, dependencies, and tech stack', async () => {
      const discovery = new DiscoveryPipelineService({ rootPath: FIXTURE_ROOT });
      await discovery.initialize();
      await discovery.start();
      const { discovery: result } = await discovery.discover('test-project');

      expect(result.totalFiles).toBe(5);
      expect(result.modules.length).toBe(3);
      expect(result.dependencies.length).toBe(2);
      expect(result.techStack.map(t => t.name)).toContain('TypeScript');
      expect(result.techStack.map(t => t.name)).toContain('Express');
      expect(result.configFiles).toContain('package.json');
      expect(result.configFiles).toContain('tsconfig.json');
    });

    it('builds ArchitectureGraph with correct nodes AND edges (graph-edge bug fix)', async () => {
      const discovery = new DiscoveryPipelineService({ rootPath: FIXTURE_ROOT });
      await discovery.initialize();
      await discovery.start();
      const { architectureGraph } = await discovery.discover('test-project');

      // 3 module nodes
      expect(architectureGraph.nodes.length).toBe(3);
      const nodeNames = architectureGraph.nodes.map(n => n.name).sort();
      expect(nodeNames).toEqual(['src.api', 'src.auth', 'src.utils']);

      // 2 dependency edges (the bug fix)
      expect(architectureGraph.edges.length).toBe(2);
      const edgeKinds = architectureGraph.edges.map(e => e.kind);
      expect(edgeKinds.every(k => k === 'depends-on')).toBe(true);

      // Verify the dependency chain: api -> auth -> utils
      const nodeIds = new Map(architectureGraph.nodes.map(n => [n.name, n.id]));
      const apiToAuth = architectureGraph.edges.some(
        e => e.from === nodeIds.get('src.api') && e.to === nodeIds.get('src.auth')
      );
      const authToUtils = architectureGraph.edges.some(
        e => e.from === nodeIds.get('src.auth') && e.to === nodeIds.get('src.utils')
      );
      expect(apiToAuth).toBe(true);
      expect(authToUtils).toBe(true);
    });
  });

  // ─── EVIDENCE PERSISTENCE ─────────────────────────────────────

  describe('Evidence persistence', () => {
    it('stores and retrieves evidence with file persistence', async () => {
      const store = new FileEvidenceStoreAdapter(EVIDENCE_DIR);
      const evidence = await store.storeEvidence({
        taskId: 'TEST-001',
        projectId: 'p1',
        question: 'What is X?',
        answer: 'X is a component.',
        sources: [{ filePath: 'src/x.ts', description: 'X component', relevance: 0.9, snippet: 'export class X' }],
        model: 'stub',
        provider: 'openai-stub',
        tokens: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        latencyMs: 100,
      });

      // In-memory retrieval
      const retrieved = await store.getEvidence(evidence.evidenceId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.answer).toBe('X is a component.');
      expect(Object.isFrozen(retrieved)).toBe(true);

      // File persistence
      const diskFile = join(EVIDENCE_DIR, 'evidence', `${evidence.evidenceId}.json`);
      expect(existsSync(diskFile)).toBe(true);
      const diskData = JSON.parse(readFileSync(diskFile, 'utf-8'));
      expect(diskData.answer).toBe('X is a component.');
    });

    it('stores corrections linked to evidence without modifying original', async () => {
      const store = new FileEvidenceStoreAdapter(EVIDENCE_DIR);

      const evidence = await store.storeEvidence({
        taskId: 'TEST-002',
        projectId: 'p1',
        question: 'What is Y?',
        answer: 'Y is a module.',
        sources: [],
        model: 'stub',
        provider: 'openai-stub',
      });

      const originalAnswer = evidence.answer;

      await store.storeCorrection({
        evidenceId: evidence.evidenceId,
        content: 'Y is actually a service, not a module.',
        sentiment: 'negative',
        correctedAnswer: 'Y is a service.',
      });

      // Original is preserved
      const original = await store.getEvidence(evidence.evidenceId);
      expect(original!.answer).toBe(originalAnswer);

      // Correction is linked
      const corrections = await store.getCorrections(evidence.evidenceId);
      expect(corrections.length).toBe(1);
      expect(corrections[0].correctedAnswer).toBe('Y is a service.');
      expect(corrections[0].evidenceId).toBe(evidence.evidenceId);
      expect(corrections[0].sentiment).toBe('negative');

      // Evidence count unchanged (immutable principle)
      expect(await store.count()).toBe(1);

      // Multiple corrections accumulate
      await store.storeCorrection({
        evidenceId: evidence.evidenceId,
        content: 'Confirmed.',
        sentiment: 'positive',
      });
      expect((await store.getCorrections(evidence.evidenceId)).length).toBe(2);
      expect(await store.count()).toBe(1);
    });
  });

  // ─── FULL PIPELINE (AIS_EXECUTION_REAL=true, stub LLM) ──────

  describe('Full pipeline (AIS_EXECUTION_REAL=true, stub LLM)', () => {
    it('runs discovery → context → stub LLM → answer → evidence', async () => {
      process.env.AIS_EXECUTION_REAL = 'true';
      process.env.AIS_EVIDENCE_PATH = EVIDENCE_DIR;
      // AIS_REAL_LLM not set → uses stubs

      const engine = new ExecutionEngine();
      await engine.initialize();
      await engine.start();

      const result = await engine.execute<ArchitectureAnswerResponse>({
        projectId: 'pipeline-test',
        projectPath: FIXTURE_ROOT,
        question: 'Describe the module structure.',
        taskId: 'PIPELINE-001',
      });

      // Discovery data present
      expect(result.discoveryStats.totalFiles).toBe(5);
      expect(result.discoveryStats.modules).toBe(3);
      expect(result.discoveryStats.dependencies).toBe(2);

      // Answer exists (stub content, but non-empty)
      expect(result.answer).toBeTruthy();
      expect(typeof result.answer).toBe('string');

      // Evidence was recorded
      expect(result.evidence).not.toBeNull();
      expect(result.evidence!.question).toBe('Describe the module structure.');
      expect(result.evidence!.projectId).toBe('pipeline-test');
      expect(Object.isFrozen(result.evidence!)).toBe(true);

      // Provider is stub
      expect(result.provider).toBe('openai-stub');
      expect(result.model).toBe('stub');

      // Evidence on disk
      const diskFile = join(EVIDENCE_DIR, 'evidence', `${result.evidence!.evidenceId}.json`);
      expect(existsSync(diskFile)).toBe(true);

      await engine.stop();
      await engine.shutdown();
    });

    it('allows feedback/correction on the evidence via evidenceStore', async () => {
      process.env.AIS_EXECUTION_REAL = 'true';
      process.env.AIS_EVIDENCE_PATH = EVIDENCE_DIR;

      const engine = new ExecutionEngine();
      await engine.initialize();
      await engine.start();

      const result = await engine.execute<ArchitectureAnswerResponse>({
        projectId: 'feedback-test',
        projectPath: FIXTURE_ROOT,
        question: 'What components exist?',
        taskId: 'FEEDBACK-001',
      });

      expect(engine.evidenceStore).not.toBeNull();

      // Store correction
      const correction = await engine.evidenceStore!.storeCorrection({
        evidenceId: result.evidence!.evidenceId,
        content: 'Incomplete answer — missed the utils module.',
        sentiment: 'negative',
        correctedAnswer: 'Components: auth, api, utils.',
      });

      // Verify correction
      expect(correction.evidenceId).toBe(result.evidence!.evidenceId);
      expect(correction.correctedAnswer).toBe('Components: auth, api, utils.');

      // Verify both records are retrievable
      const original = await engine.evidenceStore!.getEvidence(result.evidence!.evidenceId);
      expect(original!.answer).toBeTruthy(); // original answer preserved

      const corrections = await engine.evidenceStore!.getCorrections(result.evidence!.evidenceId);
      expect(corrections.length).toBe(1);

      await engine.stop();
      await engine.shutdown();
    });
  });
});
