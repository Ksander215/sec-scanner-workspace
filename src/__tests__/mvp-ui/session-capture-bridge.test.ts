/**
 * TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 — Session Capture Bridge Tests
 *
 * Covers:
 *   T1.1 — Project creation via POST /api/session (durable project identity)
 *   T1.2 — Q&A capture with responseId keying (sessions[0].sessionId === responseId1)
 *   T1.3 — Feedback keying: feedback(B) must never touch sibling record A
 *   T1.4 — Secret sanitization of persisted representation (existing contract)
 *   T1.5 — Length caps (answer 2000, excerpt 500, statement 1000)
 *   T2   — Durable store re-instantiation: new ProjectStore(same dir) + loadAll()
 *          restores project identity, Q&A, responseIds, sources, claims,
 *          feedback, timestamps (NOT an in-memory Map round-trip).
 *
 * Infrastructure under test is REAL: ProjectStore (atomic fsync+rename writes),
 * real temporary filesystem, real SessionRuntime → EvidenceLoopService →
 * InteractionService chain, real PathSecurityService, real HttpAdapter on an
 * ephemeral port. Only the ExecutionEngine is stubbed (no network, no
 * credentials) — it returns a canned ArchitectureAnswerResponse.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { SessionRuntime } from '../../core/session/session-runtime.js';
import { EvidenceLoopService } from '../../core/evidence-loop/evidence-loop-service.js';
import { InteractionService } from '../../core/interaction-layer/interaction-service.js';
import type { ExecutionEngine, ArchitectureAnswerResponse } from '../../core/engine/execution-engine.js';
import { PathSecurityService } from '../../mvp-ui/path-security.js';
import { ProjectStore } from '../../mvp-ui/project-store.js';
import { ProjectService } from '../../mvp-ui/project-service.js';
import { HttpAdapter } from '../../mvp-ui/http-adapter.js';
import { MAX_PERSISTED_ANSWER_LENGTH, MAX_PERSISTED_EXCERPT_LENGTH } from '../../mvp-ui/project-types.js';
import type { Project } from '../../mvp-ui/project-types.js';

// ═══════════════════════════════════════════════════════════════
// TEMP FS LIFECYCLE
// ═══════════════════════════════════════════════════════════════

const tmpRoots: string[] = [];

function makeTmpDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ais-capture-bridge-'));
  tmpRoots.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpRoots) rmSync(dir, { recursive: true, force: true });
  tmpRoots.length = 0;
});

// ═══════════════════════════════════════════════════════════════
// HARNESS — real services, stubbed engine
// ═══════════════════════════════════════════════════════════════

function makeEngineResponse(overrides?: Partial<ArchitectureAnswerResponse>): ArchitectureAnswerResponse {
  return {
    question: 'default question',
    answer: 'default answer',
    sources: [
      {
        filePath: 'src/index.ts',
        description: 'Entry point module',
        relevance: 0.9,
        snippet: 'export const main = () => {};',
      },
    ],
    evidence: null,
    model: 'test-model',
    provider: 'test-provider',
    latencyMs: 5,
    discoveryStats: {
      totalFiles: 10,
      modules: 2,
      dependencies: 3,
      techStack: ['typescript'],
    },
    ...overrides,
  };
}

function createStubEngine(responseBox: { current: ArchitectureAnswerResponse }): ExecutionEngine {
  return {
    execute: vi.fn(async () => responseBox.current),
  } as unknown as ExecutionEngine;
}

interface Harness {
  adapter: HttpAdapter;
  projectDataDir: string;
  repoDir: string;
  responseBox: { current: ArchitectureAnswerResponse };
}

async function setupHarness(): Promise<Harness> {
  const tmp = makeTmpDir();
  const projectDataDir = join(tmp, 'ais-data', 'projects');
  const repoDir = join(tmp, 'repo');
  mkdirSync(repoDir, { recursive: true });

  const responseBox = { current: makeEngineResponse() };

  const store = new ProjectStore(projectDataDir);
  const projectService = new ProjectService(store);
  const sessionRuntime = new SessionRuntime();
  const evidenceLoop = new EvidenceLoopService({ sessionRuntime });
  const interactionService = new InteractionService({
    evidenceLoop,
    engine: createStubEngine(responseBox),
  });
  const pathSecurity = new PathSecurityService({
    allowedRoots: [tmp],
    demoAllowlist: [tmp],
  });

  const spaPath = join(tmp, 'index.html');
  writeFileSync(spaPath, '<html><body>capture-bridge-test</body></html>');

  const adapter = new HttpAdapter({
    interactionService,
    pathSecurity,
    port: 0,
    spaPath,
    realInferenceAvailable: true,
    projectService,
  });
  await adapter.start();
  return { adapter, projectDataDir, repoDir, responseBox };
}

async function httpRequest(
  adapter: HttpAdapter,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`http://127.0.0.1:${adapter.actualPort}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

/** Read the single project JSON file straight from disk (write-through proof). */
function readProjectFile(projectDataDir: string): Project {
  const files = readdirSync(projectDataDir).filter(f => f.endsWith('.json'));
  expect(files.length).toBe(1);
  return JSON.parse(readFileSync(join(projectDataDir, files[0]), 'utf-8')) as Project;
}

async function startSession(adapter: HttpAdapter, repoDir: string): Promise<string> {
  const res = await httpRequest(adapter, 'POST', '/api/session', { projectPath: repoDir });
  expect(res.status).toBe(201);
  return res.data.sessionId as string;
}

async function ask(adapter: HttpAdapter, interactionSessionId: string, question: string): Promise<string> {
  const res = await httpRequest(adapter, 'POST', `/api/session/${interactionSessionId}/question`, { question });
  expect(res.status).toBe(200);
  return res.data.responseId as string;
}

async function giveFeedback(
  adapter: HttpAdapter,
  interactionSessionId: string,
  verdict: 'correct' | 'incorrect' | 'incomplete',
  comment?: string,
): Promise<void> {
  const res = await httpRequest(adapter, 'POST', `/api/session/${interactionSessionId}/feedback`, { verdict, comment });
  expect(res.status).toBe(200);
}

// ═══════════════════════════════════════════════════════════════
// T1.1 — PROJECT CREATION (AC-01)
// ═══════════════════════════════════════════════════════════════

describe('S-1 / T1.1 — durable project creation', () => {
  it('POST /api/session creates a durable Project on disk with a stable ID', async () => {
    const { adapter, projectDataDir, repoDir } = await setupHarness();
    try {
      const firstSessionId = await startSession(adapter, repoDir);
      expect(firstSessionId).toBeTruthy();

      // JSON exists on disk immediately (write-through, no flush needed)
      const files = readdirSync(projectDataDir).filter(f => f.endsWith('.json'));
      expect(files.length).toBe(1);
      expect(existsSync(join(projectDataDir, files[0]))).toBe(true);

      const project = readProjectFile(projectDataDir);
      expect(project.id).toBe(files[0].replace(/\.json$/, ''));
      expect(project.id.length).toBeGreaterThan(0);
      expect(project.projectPath).toBe(resolve(repoDir));
      expect(project.sessions).toEqual([]);
      expect(project.insights).toEqual([]);
      expect(project.createdAt).toBeTruthy();

      // Second session on the same projectPath → SAME project identity, no duplicate file
      await startSession(adapter, repoDir);
      const filesAfter = readdirSync(projectDataDir).filter(f => f.endsWith('.json'));
      expect(filesAfter.length).toBe(1);
      const projectAfter = readProjectFile(projectDataDir);
      expect(projectAfter.id).toBe(project.id);
    } finally {
      await adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T1.2 — Q&A CAPTURE + RESPONSE KEYING (AC-02, AC-03, AC-05)
// ═══════════════════════════════════════════════════════════════

describe('S-2 / T1.2 — Q&A capture keyed by responseId', () => {
  it('persists one record per answered question; sessionId === responseId; write-through', async () => {
    const { adapter, projectDataDir, repoDir, responseBox } = await setupHarness();
    try {
      responseBox.current = makeEngineResponse({
        question: 'What does main.ts do?',
        answer: 'It bootstraps the runtime.',
      });

      const s1 = await startSession(adapter, repoDir);
      const responseId1 = await ask(adapter, s1, 'What does main.ts do?');

      const s2 = await startSession(adapter, repoDir);
      const responseId2 = await ask(adapter, s2, 'And the second question?');

      expect(responseId1).not.toBe(responseId2);

      // Read the JSON directly from disk — proves write-through (§9):
      // the HTTP responses above have already returned, no flush/exit involved.
      const project = readProjectFile(projectDataDir);
      expect(project.sessions.length).toBe(2);

      const [record1, record2] = project.sessions;

      // AC-03: response keying
      expect(record1.sessionId).toBe(responseId1);
      expect(record2.sessionId).toBe(responseId2);

      // Content persisted
      expect(record1.question).toBe('What does main.ts do?');
      expect(record1.answer).toBe('It bootstraps the runtime.');
      expect(record2.question).toBe('And the second question?');

      // Optional back-reference to the interaction session (§8, backward-safe)
      expect(record1.interactionSessionId).toBe(s1);
      expect(record2.interactionSessionId).toBe(s2);

      // Claims + sources carried through (1 source in stub → 1 claim + 1 evidence)
      expect(record1.claims.length).toBe(1);
      expect(record1.claims[0].statement).toBe('Entry point module');
      expect(record1.sources.length).toBe(1);
      expect(record1.sources[0].filePath).toBe('src/index.ts');
      expect(record1.sources[0].excerpt).toBe('export const main = () => {};');

      // No feedback yet — sibling isolation precondition for T1.3
      expect(record1.feedback).toBeUndefined();
      expect(record2.feedback).toBeUndefined();

      // Timestamps present
      expect(record1.createdAt).toBeTruthy();
      expect(record2.createdAt).toBeTruthy();
    } finally {
      await adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T1.3 — FEEDBACK KEYING (AC-04)
// ═══════════════════════════════════════════════════════════════

describe('S-3 / T1.3 — feedback addressed by responseId never corrupts siblings', () => {
  it('feedback(B) updates only B; feedback(A) then updates only A', async () => {
    const { adapter, projectDataDir, repoDir } = await setupHarness();
    try {
      const sessionA = await startSession(adapter, repoDir);
      const responseIdA = await ask(adapter, sessionA, 'Question A');

      const sessionB = await startSession(adapter, repoDir);
      const responseIdB = await ask(adapter, sessionB, 'Question B');

      // Feedback for B only
      await giveFeedback(adapter, sessionB, 'incorrect', 'the answer missed the module boundary');

      let project = readProjectFile(projectDataDir);
      const recA = project.sessions.find(s => s.sessionId === responseIdA)!;
      const recB = project.sessions.find(s => s.sessionId === responseIdB)!;
      expect(recA).toBeDefined();
      expect(recB).toBeDefined();

      // AC-04: sibling record untouched
      expect(recA.feedback).toBeUndefined();
      expect(recB.feedback).toBeDefined();
      expect(recB.feedback!.verdict).toBe('incorrect');
      expect(recB.feedback!.comment).toBe('the answer missed the module boundary');
      expect(recB.feedback!.feedbackId).toBeTruthy();

      // Feedback for A afterwards — B must remain intact
      await giveFeedback(adapter, sessionA, 'correct', 'answered precisely');

      project = readProjectFile(projectDataDir);
      const recA2 = project.sessions.find(s => s.sessionId === responseIdA)!;
      const recB2 = project.sessions.find(s => s.sessionId === responseIdB)!;
      expect(recA2.feedback).toBeDefined();
      expect(recA2.feedback!.verdict).toBe('correct');
      expect(recB2.feedback!.verdict).toBe('incorrect');
      expect(recB2.feedback!.feedbackId).toBe(recB.feedback!.feedbackId);
    } finally {
      await adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T1.4 — SANITIZATION (AC-06)
// ═══════════════════════════════════════════════════════════════

describe('T1.4 — persisted representation passes secret sanitization', () => {
  it('redacts credential-like values in question, answer, claims, sources, and feedback', async () => {
    const { adapter, projectDataDir, repoDir, responseBox } = await setupHarness();
    try {
      const skKey = 'sk-abcdefghijklmnopqrstuvwxyz012345';
      const ghPat = 'ghp_' + 'aB3'.repeat(12);
      const awsKey = 'AKIAIOSFODNN7EXAMPLE';
      const bearer = 'Bearer ' + 'x'.repeat(30);

      responseBox.current = makeEngineResponse({
        question: `auth setup: ${skKey} and ${ghPat} with password=hunter2secret`,
        answer: `Config uses ${awsKey} and ${bearer}.`,
        sources: [
          {
            filePath: 'src/config.ts',
            description: `Module referencing ${skKey}`,
            relevance: 0.9,
            snippet: `const key = "${awsKey}";`,
          },
        ],
      });

      const sessionId = await startSession(adapter, repoDir);
      await ask(adapter, sessionId, responseBox.current.question);
      await giveFeedback(adapter, sessionId, 'incorrect', `my own key was ${skKey}`);

      const raw = readFileSync(join(projectDataDir, readdirSync(projectDataDir).find(f => f.endsWith('.json'))!), 'utf-8');

      // No raw secret survives anywhere in the persisted representation
      expect(raw).not.toContain(skKey);
      expect(raw).not.toContain(ghPat);
      expect(raw).not.toContain(awsKey);
      expect(raw).not.toContain(bearer);
      expect(raw).not.toContain('password=hunter2secret');
      expect(raw).not.toContain('hunter2');

      // The existing sanitizer's redaction marker is present
      expect(raw).toContain('[REDACTED:secret]');

      // Structure intact after sanitization
      const project = JSON.parse(raw) as Project;
      expect(project.sessions.length).toBe(1);
      expect(project.sessions[0].feedback!.comment).toContain('[REDACTED:secret]');
    } finally {
      await adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T1.5 — LENGTH CAPS (existing ProjectService contract)
// ═══════════════════════════════════════════════════════════════

describe('T1.5 — persisted fields respect existing length caps', () => {
  it('caps answer at 2000, excerpt at 500, statement at 1000', async () => {
    const { adapter, projectDataDir, repoDir, responseBox } = await setupHarness();
    try {
      responseBox.current = makeEngineResponse({
        question: 'Q'.repeat(4500), // below ProjectService's 5000 question cap
        answer: 'A'.repeat(5000),
        sources: [
          {
            filePath: 'src/big.ts',
            description: 'D'.repeat(3000),
            relevance: 0.9,
            snippet: 'S'.repeat(2000),
          },
        ],
      });

      const sessionId = await startSession(adapter, repoDir);
      await ask(adapter, sessionId, responseBox.current.question);

      const project = readProjectFile(projectDataDir);
      const record = project.sessions[0];

      expect(record.answer.length).toBe(MAX_PERSISTED_ANSWER_LENGTH); // 2000
      expect(record.sources[0].excerpt.length).toBe(MAX_PERSISTED_EXCERPT_LENGTH); // 500
      expect(record.claims[0].statement.length).toBe(1000);
      expect(record.question.length).toBe(4500); // below the 5000 cap, unchanged
    } finally {
      await adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T2 — DURABLE STORE RE-INSTANTIATION (AC-07)
// ═══════════════════════════════════════════════════════════════

describe('T2 — new ProjectStore(same directory) reloads everything from disk', () => {
  it('restores project identity, Q&A, responseIds, sources, claims, feedback, timestamps', async () => {
    const { adapter, projectDataDir, repoDir } = await setupHarness();
    let projectIdFromDisk: string;
    try {
      const sessionId = await startSession(adapter, repoDir);
      const responseId = await ask(adapter, sessionId, 'Which module owns startup?');
      await giveFeedback(adapter, sessionId, 'correct', 'verified against the source');

      const before = readProjectFile(projectDataDir);
      projectIdFromDisk = before.id;
      expect(before.sessions.length).toBe(1);
    } finally {
      await adapter.stop();
    }

    // ── Destroy all in-memory objects ──────────────────────────
    // (adapter stopped above; store/service go out of scope with the harness)

    // ── Re-instantiate from the SAME directory ─────────────────
    const store2 = new ProjectStore(projectDataDir);
    store2.loadAll();
    const service2 = new ProjectService(store2);

    const reloaded = service2.findById(projectIdFromDisk);
    expect(reloaded).toBeDefined();
    expect(reloaded!.id).toBe(projectIdFromDisk);
    expect(reloaded!.projectPath).toBe(resolve(repoDir));

    // Project identity timestamps survive
    expect(reloaded!.createdAt).toBeTruthy();

    // Q&A record restored
    expect(reloaded!.sessions.length).toBe(1);
    const session = reloaded!.sessions[0];
    expect(session.question).toBe('Which module owns startup?');
    expect(session.createdAt).toBeTruthy();

    // responseId keying survives the reload
    expect(typeof session.sessionId).toBe('string');
    expect(session.sessionId.length).toBeGreaterThan(0);
    expect(session.interactionSessionId).toBeTruthy();

    // Sources + claims restored
    expect(session.sources.length).toBe(1);
    expect(session.sources[0].filePath).toBe('src/index.ts');
    expect(session.claims.length).toBe(1);

    // Feedback restored
    expect(session.feedback).toBeDefined();
    expect(session.feedback!.verdict).toBe('correct');
    expect(session.feedback!.comment).toBe('verified against the source');

    // And via the service-level history API (what continuity will consume next wave)
    const history = service2.getSessionHistory(projectIdFromDisk!);
    expect(history.length).toBe(1);
    expect(history[0].sessionId).toBe(session.sessionId);
  });
});
