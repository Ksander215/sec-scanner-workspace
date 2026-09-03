/**
 * Memory Restart Acceptance — T3.1..T3.8
 * TASK-AIS-MEMORY-RESTART-ACCEPTANCE-001 (S-7, final evidence gate)
 *
 * Main question (task §1):
 *   "If the AIS process was fully destroyed and then restarted with the same
 *    project storage, can the user continue where they left off?"
 *
 * Answered with REAL OS processes, not in-memory objects:
 *
 *   Process A  (spawn node dist/mvp-ui/index.js, cwd = isolated temp dir)
 *     POST /api/session  -> Q1 -> Q2 -> feedback -> insight lifecycle (HTTP only)
 *     write-through proof: .ais-data/projects/<id>.json read from disk BEFORE kill
 *     SIGTERM -> exit
 *   Process B  (new OS process, same cwd/.ais-data, no shared memory)
 *     GET /continuity + /history -> full reconstruction
 *     Q3 -> append-only continuation (Q1/Q2 unchanged)
 *     SIGKILL -> exit (no graceful shutdown)
 *   Process C  (new OS process, same cwd/.ais-data)
 *     GET /continuity + /history -> Q1..Q3 + insight + decision + revisitCondition
 *
 * Hermetic LLM (task §4): a local OpenAI-compatible mock on 127.0.0.1 serves
 * POST /v1/chat/completions deterministically; AIS processes run with
 * AIS_EXECUTION_REAL=true, AIS_REAL_LLM=true, OPENAI_API_KEY=test-key,
 * OPENAI_BASE_URL=http://127.0.0.1:<mock>/v1 — the EXISTING provider wrapper
 * mechanism (RealOpenAIAdapter already supports OPENAI_BASE_URL). No internet,
 * no real key, no provider architecture change.
 *
 * Isolation (task §5): every AIS process runs with cwd = mkdtemp dir, so the
 * cwd-relative ProjectStore (resolve('.ais-data/projects')) writes ONLY inside
 * the temp dir. The repository's own .ais-data is never touched. The project
 * JSON is never seeded manually (D-02) — it is created by POST /api/session.
 *
 * Disqualifier notes (task §19):
 *   D-01 memory-only: project data is never passed between tests — every
 *     reconstruction assertion re-reads state via HTTP from a fresh process or
 *     directly from disk. The only cross-test state is ORCHESTRATION state
 *     (ports, PIDs, responseIds captured from HTTP responses, and a byte
 *     snapshot of the disk file used as a comparison baseline).
 *   D-03 shutdown-dependent: the file is asserted on disk BEFORE termination.
 *   D-04 fake restart: PIDs are asserted distinct; SIGTERM/SIGKILL exit is awaited.
 *   D-05/D-06: this file contains no new memory architecture and asserts exact
 *     equality against persisted truth (no fabricated continuity).
 */

import { describe, it, expect, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { getAllDemoConfigs } from '../../mvp-ui/demo-config.js';
import type { ProjectContinuityView, PersistedSession } from '../../mvp-ui/project-types.js';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DIST_ENTRY = join(REPO_ROOT, 'dist', 'mvp-ui', 'index.js');
/** Task §7 A1: an existing Demo Project (the canonical demo = AIS self-analysis). */
const DEMO_PROJECT_PATH = getAllDemoConfigs()[0].projectPath;

const QUESTION_1 = 'What is the overall architecture of this project?';
const QUESTION_2 = 'How does the Evidence Loop Service enforce invariants?';
const QUESTION_3 = 'How does the Interaction Service orchestrate a user question?';

const FEEDBACK_VERDICT = 'correct' as const; // existing API value (§7 A4)
const FEEDBACK_COMMENT = 'Acceptance feedback: answer was grounded and useful.';
const INSIGHT_TEXT = 'Acceptance insight: module boundaries should be re-checked after refactoring.';
const REVISIT_CONDITION = 'Revisit when repository structure changes.';

const mockAnswerFor = (question: string): string => `Mock deterministic answer for: ${question}`;

// ═══════════════════════════════════════════════════════════════════
// HERMETIC OPENAI-COMPATIBLE MOCK (task §4)
// ═══════════════════════════════════════════════════════════════════

interface MockCompletionRequest {
  path: string;
  auth: string | undefined;
  model: string | undefined;
  question: string;
}

let mockServer: Server | null = null;
let mockPort = 0;
const mockRequests: MockCompletionRequest[] = [];

function startMockOpenAI(): Promise<number> {
  return new Promise((resolvePromise) => {
    mockServer = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const url = req.url ?? '';
        if (req.method === 'POST' && (url === '/v1/chat/completions' || url === '/chat/completions')) {
          let question = '';
          let model: string | undefined;
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
              model?: string;
              messages?: Array<{ role?: string; content?: unknown }>;
            };
            model = body.model;
            const messages = Array.isArray(body.messages) ? body.messages : [];
            const lastUser = [...messages].reverse().find((m) => m.role === 'user');
            // The engine sends "<question>\n\n---\nProject Context: ..." — the
            // first line of the last user message is the literal question.
            question = String(lastUser?.content ?? '').split('\n')[0].slice(0, 300);
          } catch {
            question = '';
          }
          mockRequests.push({ path: url, auth: req.headers.authorization, model, question });
          const bodyOut = JSON.stringify({
            id: 'chatcmpl-mock-' + createHash('sha256').update(question).digest('hex').slice(0, 12),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model ?? 'gpt-4o',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: mockAnswerFor(question) },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(bodyOut);
          return;
        }
        // Hermetic catch-all: any unexpected endpoint must be visible, not guessed.
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `mock-openai: unknown endpoint ${req.method} ${url}` }));
      });
    });
    mockServer.listen(0, '127.0.0.1', () => {
      const addr = mockServer!.address();
      mockPort = typeof addr === 'object' && addr ? addr.port : 0;
      resolvePromise(mockPort);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// REAL AIS PROCESS LAUNCHER (task §6/§11)
// ═══════════════════════════════════════════════════════════════════

interface AisProcess {
  child: ChildProcess;
  port: number;
  pid: number;
  output: string;
}

const spawnedChildren: ChildProcess[] = [];

function getFreePort(): Promise<number> {
  return new Promise((res, rej) => {
    const s = createServer();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      s.close(() => res(port));
    });
  });
}

async function startAisProcess(cwd: string, label: string): Promise<AisProcess> {
  if (!existsSync(DIST_ENTRY)) {
    throw new Error(
      `dist/mvp-ui/index.js not found — run \`npm run build\` first (acceptance gate, task §21).`,
    );
  }
  const port = await getFreePort();
  const child = spawn(process.execPath, [DIST_ENTRY], {
    cwd, // cwd-relative .ais-data → storage isolated in the temp dir (task §5)
    env: {
      ...process.env,
      MVP_UI_PORT: String(port),
      AIS_EXECUTION_REAL: 'true',
      AIS_REAL_LLM: 'true',
      OPENAI_API_KEY: 'test-key', // test credential only (task §22)
      OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  spawnedChildren.push(child);
  let output = '';
  const append = (d: Buffer) => {
    output += d.toString();
    if (output.length > 60_000) output = output.slice(-30_000);
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);

  const proc: AisProcess = { child, port, pid: child.pid as number, output };
  await waitForReady(proc, 90_000, label);
  return proc;
}

async function waitForReady(proc: AisProcess, timeoutMs: number, label: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (proc.child.exitCode !== null) {
      throw new Error(
        `[${label}] process exited before becoming ready (code ${proc.child.exitCode}). Tail:\n${proc.output.slice(-2500)}`,
      );
    }
    try {
      const res = await fetch(`http://127.0.0.1:${proc.port}/api/demos`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return;
    } catch {
      // not ready yet — poll again
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`[${label}] not ready within ${timeoutMs}ms. Tail:\n${proc.output.slice(-2500)}`);
}

async function terminate(child: ChildProcess, signal: 'SIGTERM' | 'SIGKILL', timeoutMs = 20_000): Promise<number> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return (child.exitCode ?? -1);
  }
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      rej(new Error(`process did not exit within ${timeoutMs}ms after ${signal}`));
    }, timeoutMs);
    child.once('exit', (code, signalName) => {
      clearTimeout(timer);
      // SIGKILL → killed by signal; SIGTERM → graceful shutdown exits 0.
      res(code ?? (signalName ? 0 : -1));
    });
    child.kill(signal);
  });
}

// ═══════════════════════════════════════════════════════════════════
// HTTP + DISK HELPERS
// ═══════════════════════════════════════════════════════════════════

async function api<T>(
  port: number,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; json: T }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120_000),
  });
  const json = (await res.json()) as T;
  return { status: res.status, json };
}

function projectFile(cwd: string, projectId: string): string {
  return join(cwd, '.ais-data', 'projects', `${projectId}.json`);
}

function readDiskProject(cwd: string, projectId: string): {
  id: string;
  name: string;
  projectPath: string;
  sessions: PersistedSession[];
  insights: Array<Record<string, unknown>>;
} {
  return JSON.parse(readFileSync(projectFile(cwd, projectId), 'utf-8'));
}

interface SessionStartResponse {
  sessionId: string;
  state: string;
  createdAt: string;
  projectId?: string;
}

interface AnswerResponse {
  responseId: string;
  content: string;
  sources: Array<{ filePath: string; type: string; excerpt: string; relevance: number }>;
  claims: Array<{ claimId: string; statement: string; isVerified: boolean; evidenceCount: number }>;
}

// ═══════════════════════════════════════════════════════════════════
// ORCHESTRATION STATE (ports/PIDs/ids only — never project data; see D-01 note)
// ═══════════════════════════════════════════════════════════════════

const ctx: {
  tempDir: string;
  pidA: number;
  pidB: number;
  pidC: number;
  /** Process B handle (T3.3 spawns it; T3.7 SIGKILLs it) — orchestration only. */
  procB: AisProcess | null;
  projectId: string;
  sessionIdA1: string;
  sessionIdA2: string;
  sessionIdB3: string;
  r1: string;
  r2: string;
  r3: string;
  insightId: string;
  /** Raw bytes of the project file captured BEFORE SIGTERM (comparison baseline). */
  rawBytesBeforeShutdown: string;
} = {
  tempDir: '',
  pidA: 0,
  pidB: 0,
  pidC: 0,
  procB: null,
  projectId: '',
  sessionIdA1: '',
  sessionIdA2: '',
  sessionIdB3: '',
  r1: '',
  r2: '',
  r3: '',
  insightId: '',
  rawBytesBeforeShutdown: '',
};

/**
 * Compare a restored ContinuitySessionView against the persisted PersistedSession
 * truth, field by field (the view renames sessionId→responseId / createdAt→timestamp
 * and drops projectPath — the VALUES must match exactly; T3.20 no-fabrication).
 */
function expectRestoredEqualsPersisted(
  restored: ContinuitySessionViewOrUndefined,
  persisted: PersistedSessionOrUndefined,
): void {
  expect(restored).toBeDefined();
  expect(persisted).toBeDefined();
  expect(restored!.responseId).toBe(persisted!.sessionId);
  expect(restored!.question).toBe(persisted!.question);
  expect(restored!.answer).toBe(persisted!.answer);
  expect(restored!.claims).toEqual(persisted!.claims);
  expect(restored!.sources).toEqual(persisted!.sources);
  expect(restored!.feedback).toEqual(persisted!.feedback);
  expect(restored!.findings).toEqual(persisted!.findings);
}

type ContinuitySessionViewOrUndefined =
  | import('../../mvp-ui/project-types.js').ContinuitySessionView
  | undefined;
type PersistedSessionOrUndefined = PersistedSession | undefined;

// ═══════════════════════════════════════════════════════════════════
// ACCEPTANCE SUITE
// ═══════════════════════════════════════════════════════════════════

describe('Memory Restart Acceptance (TASK-AIS-MEMORY-RESTART-ACCEPTANCE-001)', () => {
  afterAll(async () => {
    // Force-clean any surviving process and the temp workspace (task §22).
    for (const child of spawnedChildren) {
      try {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      } catch { /* already gone */ }
    }
    await new Promise((r) => setTimeout(r, 300));
    if (mockServer) {
      await new Promise<void>((r) => mockServer!.close(() => r()));
      mockServer = null;
    }
    if (ctx.tempDir) {
      rmSync(ctx.tempDir, { recursive: true, force: true });
    }
  }, 60_000);

  it('T3.1 Real Process Restart — SIGTERM: Process A runs the real user scenario (CREATE → CAPTURE → PERSIST)', async () => {
    // ── Isolated filesystem environment (task §5) ──────────────────
    ctx.tempDir = mkdtempSync(join(tmpdir(), 'ais-memory-acceptance-'));
    // D-02 guard: no manual seeding — no .ais-data may pre-exist.
    expect(existsSync(join(ctx.tempDir, '.ais-data'))).toBe(false);

    await startMockOpenAI();
    expect(mockPort).toBeGreaterThan(0);

    // ── Process A: a real OS process (task §6) ─────────────────────
    const procA = await startAisProcess(ctx.tempDir, 'A');
    ctx.pidA = procA.pid;
    expect(procA.pid).toBeGreaterThan(0);

    // ── A1: start session (existing Demo Project) ──────────────────
    const s1 = await api<SessionStartResponse>(procA.port, 'POST', '/api/session', {
      projectPath: DEMO_PROJECT_PATH,
      isDemo: true,
    });
    expect(s1.status).toBe(201);
    expect(s1.json.projectId).toBeDefined(); // task §7 A1: projectId !== undefined
    expect(typeof s1.json.sessionId).toBe('string');
    ctx.projectId = s1.json.projectId as string;
    ctx.sessionIdA1 = s1.json.sessionId;

    // ── A2: first question through the REAL pipeline ───────────────
    const q1 = await api<AnswerResponse>(procA.port, 'POST', `/api/session/${ctx.sessionIdA1}/question`, {
      question: QUESTION_1,
    });
    expect(q1.status).toBe(200);
    expect(typeof q1.json.responseId).toBe('string');
    expect(q1.json.content).toBe(mockAnswerFor(QUESTION_1)); // deterministic hermetic LLM
    expect(q1.json.claims.length).toBeGreaterThan(0);
    expect(q1.json.sources.length).toBeGreaterThan(0);
    ctx.r1 = q1.json.responseId;

    // The real provider wrapper was exercised via OPENAI_BASE_URL (task §4).
    expect(mockRequests.length).toBeGreaterThanOrEqual(1);
    expect(mockRequests[0].path).toContain('/chat/completions');
    expect(mockRequests[0].auth).toBe('Bearer test-key');

    // ── A3: second question (one Q&A per interaction session — the
    // existing interaction FSM is strictly linear, so the second question
    // opens a new interaction session on the SAME project) ───────────
    const s2 = await api<SessionStartResponse>(procA.port, 'POST', '/api/session', {
      projectPath: DEMO_PROJECT_PATH,
      isDemo: true,
    });
    expect(s2.status).toBe(201);
    expect(s2.json.projectId).toBe(ctx.projectId); // same project identity
    ctx.sessionIdA2 = s2.json.sessionId;

    const q2 = await api<AnswerResponse>(procA.port, 'POST', `/api/session/${ctx.sessionIdA2}/question`, {
      question: QUESTION_2,
    });
    expect(q2.status).toBe(200);
    expect(q2.json.responseId).not.toBe(ctx.r1); // two distinct response IDs (§7 A3)
    expect(q2.json.content).toBe(mockAnswerFor(QUESTION_2));
    expect(q2.json.claims.length).toBeGreaterThan(0);
    expect(q2.json.sources.length).toBeGreaterThan(0);
    ctx.r2 = q2.json.responseId;

    // ── A4: feedback on the first answer ───────────────────────────
    const fb = await api<{ feedbackId: string; verdict: string; findingCreated: boolean }>(
      procA.port, 'POST', `/api/session/${ctx.sessionIdA1}/feedback`,
      { verdict: FEEDBACK_VERDICT, comment: FEEDBACK_COMMENT },
    );
    expect(fb.status).toBe(200);
    expect(fb.json.verdict).toBe(FEEDBACK_VERDICT);

    // ── §8: insight lifecycle through the EXISTING HTTP API ────────
    // Legit FSM path to DEFERRED: NEW → EVALUATING → ACTIVE → DEFERRED
    // (EVALUATING → DEFERRED is not a valid transition; same path as the
    // S-4 continuity tests).
    const created = await api<{ id: string; status: string }>(
      procA.port, 'POST', `/api/project/${ctx.projectId}/insights`, { text: INSIGHT_TEXT, sessionId: ctx.sessionIdA1 },
    );
    expect(created.status).toBe(201);
    expect(created.json.status).toBe('NEW');
    ctx.insightId = created.json.id;

    const evaluated = await api<{ id: string; status: string }>(
      procA.port, 'POST', `/api/project/${ctx.projectId}/insights/${ctx.insightId}/evaluate`,
      { relevance: 0.9, feasibility: 0.8, goalAlignment: 'NOT_APPLICABLE', rationale: 'Acceptance evaluation before restart.' },
    );
    expect(evaluated.status).toBe(200);
    expect(evaluated.json.status).toBe('EVALUATING');

    const activated = await api<{ id: string; status: string; userDecision?: string }>(
      procA.port, 'POST', `/api/project/${ctx.projectId}/insights/${ctx.insightId}/decide`,
      { decision: 'IMPLEMENT_NOW' },
    );
    expect(activated.status).toBe(200);
    expect(activated.json.status).toBe('ACTIVE');

    const deferred = await api<{ id: string; status: string; userDecision?: string; revisitCondition?: string }>(
      procA.port, 'POST', `/api/project/${ctx.projectId}/insights/${ctx.insightId}/decide`,
      { decision: 'DEFER', revisitCondition: REVISIT_CONDITION },
    );
    expect(deferred.status).toBe(200);
    expect(deferred.json.status).toBe('DEFERRED');
    expect(deferred.json.userDecision).toBe('DEFER');
    expect(deferred.json.revisitCondition).toBe(REVISIT_CONDITION);

    // ── §9: WRITE-THROUGH PROOF — the file is already on disk BEFORE
    // termination. Acceptance does not depend on shutdown hooks (D-03). ──
    const file = projectFile(ctx.tempDir, ctx.projectId);
    expect(existsSync(file)).toBe(true);
    ctx.rawBytesBeforeShutdown = readFileSync(file, 'utf-8');
    const onDisk = JSON.parse(ctx.rawBytesBeforeShutdown);

    expect(onDisk.id).toBe(ctx.projectId);
    expect(onDisk.projectPath).toBe(DEMO_PROJECT_PATH);
    expect(onDisk.sessions.length).toBe(2);

    const diskS1 = onDisk.sessions.find((s: PersistedSession) => s.sessionId === ctx.r1);
    const diskS2 = onDisk.sessions.find((s: PersistedSession) => s.sessionId === ctx.r2);
    expect(diskS1).toBeDefined();
    expect(diskS2).toBeDefined();
    expect(diskS1.question).toBe(QUESTION_1);
    expect(diskS1.answer).toBe(mockAnswerFor(QUESTION_1));
    expect(diskS1.claims.length).toBeGreaterThan(0); // evidence persisted (§9)
    expect(diskS1.sources.length).toBeGreaterThan(0);
    expect(diskS1.feedback).toBeDefined(); // feedback persisted (§9)
    expect(diskS1.feedback.verdict).toBe(FEEDBACK_VERDICT);
    expect(diskS1.feedback.comment).toBe(FEEDBACK_COMMENT);
    expect(diskS2.feedback).toBeUndefined(); // feedback must not leak to siblings

    expect(onDisk.insights.length).toBe(1);
    expect(onDisk.insights[0].id).toBe(ctx.insightId);
    expect(onDisk.insights[0].status).toBe('DEFERRED'); // §9: DEFER persisted
    expect(onDisk.insights[0].userDecision).toBe('DEFER');
    expect(onDisk.insights[0].revisitCondition).toBe(REVISIT_CONDITION); // §9
    const actions = onDisk.insights[0].history.map((h: { action: string }) => h.action);
    expect(actions).toContain('CREATED');
    expect(actions).toContain('EVALUATED');
    expect(actions.some((a: string) => a.startsWith('USER_DECIDED: DEFER'))).toBe(true);

    // Security (task §22): the test credential must never reach .ais-data.
    expect(ctx.rawBytesBeforeShutdown).not.toContain('test-key');
    expect(ctx.rawBytesBeforeShutdown).not.toContain('Bearer ');
    expect(ctx.rawBytesBeforeShutdown).not.toContain('sk-');

    // ── §10: SIGTERM ───────────────────────────────────────────────
    const exitCode = await terminate(procA.child, 'SIGTERM');
    expect(exitCode).toBe(0); // graceful shutdown completed, did not hang

    // Persisted JSON survived process death.
    expect(existsSync(file)).toBe(true);
    const afterExit = JSON.parse(readFileSync(file, 'utf-8'));
    expect(afterExit.sessions.length).toBe(2);
    expect(afterExit.insights.length).toBe(1);
  }, 300_000);

  it('T3.2 Filesystem Persistence Before Shutdown — pre-kill bytes are exactly what survived termination', async () => {
    // The bytes captured BEFORE SIGTERM (T3.1) are byte-identical to the file
    // after termination: persistence was write-through, not flush-on-exit.
    const file = projectFile(ctx.tempDir, ctx.projectId);
    const rawAfter = readFileSync(file, 'utf-8');
    expect(rawAfter).toBe(ctx.rawBytesBeforeShutdown);
    expect(rawAfter.length).toBeGreaterThan(0);

    const onDisk = JSON.parse(rawAfter);
    expect(onDisk.sessions.map((s: PersistedSession) => s.sessionId).sort()).toEqual([ctx.r1, ctx.r2].sort());
    expect(onDisk.insights[0].userDecision).toBe('DEFER');
    expect(onDisk.insights[0].revisitCondition).toBe(REVISIT_CONDITION);
  }, 60_000);

  it('T3.3 Reconstruction After SIGTERM — Process B (new OS process) restores the full continuity view', async () => {
    // ── §11: Process B — same cwd/.ais-data, brand-new OS process.
    // One Process B serves T3.3–T3.6 (reconstruction, history, insight,
    // continuation) and is SIGKILLed in T3.7 — the exact task narrative. ──
    const procB = await startAisProcess(ctx.tempDir, 'B');
    ctx.procB = procB;
    ctx.pidB = procB.pid;
    expect(procB.pid).toBeGreaterThan(0);
    expect(procB.pid).not.toBe(ctx.pidA); // D-04: a real new process, not a reuse

    // ── §12: reconstruction through the continuity API ─────────────
    const res = await api<ProjectContinuityView>(procB.port, 'GET', `/api/project/${ctx.projectId}/continuity`);
    expect(res.status).toBe(200);
    const view = res.json;

    // Project identity matches Session A.
    expect(view.project.id).toBe(ctx.projectId);
    expect(view.project.path).toBe(DEMO_PROJECT_PATH);
    expect(typeof view.project.name).toBe('string');
    expect(view.project.name.length).toBeGreaterThan(0);

    // Q&A: both questions with answers, claims, evidence, responseIds.
    expect(view.sessions.length).toBe(2);
    const restored1 = view.sessions.find((s) => s.responseId === ctx.r1);
    const restored2 = view.sessions.find((s) => s.responseId === ctx.r2);
    expect(restored1).toBeDefined();
    expect(restored2).toBeDefined();
    expect(restored1!.question).toBe(QUESTION_1);
    expect(restored1!.answer).toBe(mockAnswerFor(QUESTION_1));
    expect(restored1!.claims.length).toBeGreaterThan(0);
    expect(restored1!.sources.length).toBeGreaterThan(0);
    expect(restored2!.question).toBe(QUESTION_2);
    expect(restored2!.answer).toBe(mockAnswerFor(QUESTION_2));

    // Feedback restored and linked to exactly the original responseId.
    expect(restored1!.feedback).toBeDefined();
    expect(restored1!.feedback!.verdict).toBe(FEEDBACK_VERDICT);
    expect(restored2!.feedback).toBeUndefined();

    // Newest-first ordering (existing history convention).
    expect(view.sessions[0].responseId).toBe(ctx.r2);

    // Insight + explicit decision + revisit condition restored (task §12).
    expect(view.insights.length).toBe(1);
    const insight = view.insights[0];
    expect(insight.id).toBe(ctx.insightId);
    expect(insight.status).toBe('DEFERRED');
    expect(insight.userDecision).toBe('DEFER');
    expect(insight.revisitCondition).toBe(REVISIT_CONDITION);

    expect(view.decisions.length).toBe(1);
    expect(view.decisions[0].insightId).toBe(ctx.insightId);
    expect(view.decisions[0].decision).toBe('DEFER');

    // Unresolved: DEFERRED is an unresolved status per the existing model.
    expect(view.unresolved.length).toBe(1);
    expect(view.unresolved[0].insightId).toBe(ctx.insightId);
    expect(view.unresolved[0].status).toBe('DEFERRED');
    expect(view.unresolved[0].revisitCondition).toBe(REVISIT_CONDITION);

    // Continuation contains real data, not fabricated placeholders (task §12).
    expect(view.lastActivity).not.toBeNull();
    // The insight lifecycle ran AFTER Q2 in Session A, so the most recent real
    // record is the insight (S-4 lastActivity semantics: newest real record).
    expect(view.lastActivity!.type).toBe('insight');
    expect(view.goal).toBeNull(); // no goal fabrication
    expect(view.continuation.suggestedQuestions.length).toBeGreaterThan(0);

    // T3.20 no-fabrication: the continuity view must equal the disk truth.
    const disk = readDiskProject(ctx.tempDir, ctx.projectId);
    const diskById = new Map(disk.sessions.map((s) => [s.sessionId, s]));
    for (const s of view.sessions) {
      expectRestoredEqualsPersisted(s, diskById.get(s.responseId));
    }
  }, 300_000);

  it('T3.4 History Reconstruction — history endpoint returns both Session A records', async () => {
    // Same living Process B (task narrative §13) — reconstruction already proven.
    expect(ctx.procB).not.toBeNull();
    const procB = ctx.procB!;

    const res = await api<{ projectId: string; sessions: PersistedSession[] }>(
      procB.port, 'GET', `/api/project/${ctx.projectId}/history`,
    );
    expect(res.status).toBe(200);
    expect(res.json.projectId).toBe(ctx.projectId);
    expect(res.json.sessions.length).toBe(2); // task §13: history count = 2

    const ids = res.json.sessions.map((s) => s.sessionId);
    expect(ids).toContain(ctx.r1);
    expect(ids).toContain(ctx.r2);

    const h1 = res.json.sessions.find((s) => s.sessionId === ctx.r1)!;
    expect(h1.question).toBe(QUESTION_1);
    expect(h1.answer).toBe(mockAnswerFor(QUESTION_1));
    expect(h1.feedback?.verdict).toBe(FEEDBACK_VERDICT);

    // Newest first.
    expect(res.json.sessions[0].sessionId).toBe(ctx.r2);
  }, 120_000);

  it('T3.5 Insight Reconstruction — lifecycle state survives the restart exactly', async () => {
    expect(ctx.procB).not.toBeNull();
    const procB = ctx.procB!;

    const res = await api<ProjectContinuityView>(procB.port, 'GET', `/api/project/${ctx.projectId}/continuity`);
    expect(res.status).toBe(200);

    const insight = res.json.insights[0];
    expect(insight.id).toBe(ctx.insightId);
    expect(insight.status).toBe('DEFERRED');
    expect(insight.userDecision).toBe('DEFER');
    expect(insight.revisitCondition).toBe(REVISIT_CONDITION);

    // Full lifecycle history survived: created → evaluated → user decision.
    const actions = insight.history.map((h) => h.action);
    expect(actions).toContain('CREATED');
    expect(actions).toContain('EVALUATED');
    expect(actions.some((a) => a.startsWith('USER_DECIDED: IMPLEMENT_NOW'))).toBe(true);
    expect(actions.some((a) => a.startsWith('USER_DECIDED: DEFER'))).toBe(true);

    // The decision surfaces exactly once, linked to the same insight.
    expect(res.json.decisions).toEqual([
      { insightId: ctx.insightId, decision: 'DEFER', timestamp: expect.any(String) },
    ]);
  }, 120_000);

  it('T3.6 Continuation Append — Q3 in Process B appends without overwriting Q1/Q2', async () => {
    expect(ctx.procB).not.toBeNull();
    const procB = ctx.procB!; // the SAME Process B from T3.3 (task narrative §14)

    // ── §14: continue the project with a third question ────────────
    const s3 = await api<SessionStartResponse>(procB.port, 'POST', '/api/session', {
      projectPath: DEMO_PROJECT_PATH,
      isDemo: true,
    });
    expect(s3.status).toBe(201);
    expect(s3.json.projectId).toBe(ctx.projectId); // SAME project, reconstructed
    ctx.sessionIdB3 = s3.json.sessionId;

    const q3 = await api<AnswerResponse>(procB.port, 'POST', `/api/session/${ctx.sessionIdB3}/question`, {
      question: QUESTION_3,
    });
    expect(q3.status).toBe(200);
    expect(q3.json.content).toBe(mockAnswerFor(QUESTION_3));
    expect(q3.json.claims.length).toBeGreaterThan(0);
    expect(q3.json.sources.length).toBeGreaterThan(0);
    ctx.r3 = q3.json.responseId;
    expect([ctx.r1, ctx.r2]).not.toContain(ctx.r3); // no duplicate response IDs

    // Continuity: session count = 3, Q3 appended, Q1/Q2 unchanged.
    const res = await api<ProjectContinuityView>(procB.port, 'GET', `/api/project/${ctx.projectId}/continuity`);
    expect(res.status).toBe(200);
    const view = res.json;
    expect(view.sessions.length).toBe(3); // task §14: session count = 3

    const ids = view.sessions.map((s) => s.responseId);
    expect(new Set(ids).size).toBe(3); // no duplicates
    expect(ids).toContain(ctx.r1);
    expect(ids).toContain(ctx.r2);
    expect(ids).toContain(ctx.r3);
    expect(view.sessions[0].responseId).toBe(ctx.r3); // newest first: Q3 appended at the head

    const restored1 = view.sessions.find((s) => s.responseId === ctx.r1)!;
    const restored2 = view.sessions.find((s) => s.responseId === ctx.r2)!;
    expect(restored1.question).toBe(QUESTION_1);
    expect(restored1.answer).toBe(mockAnswerFor(QUESTION_1));
    expect(restored1.feedback?.verdict).toBe(FEEDBACK_VERDICT); // feedback not reassigned
    expect(restored2.question).toBe(QUESTION_2);
    expect(restored2.answer).toBe(mockAnswerFor(QUESTION_2));
    expect(restored2.feedback).toBeUndefined();

    // Q1/Q2 field-by-field equal to the pre-restart disk snapshot:
    // append-only — no overwrite, no rewrite of old records (task §14).
    const before = JSON.parse(ctx.rawBytesBeforeShutdown);
    const before1 = before.sessions.find((s: PersistedSession) => s.sessionId === ctx.r1);
    const before2 = before.sessions.find((s: PersistedSession) => s.sessionId === ctx.r2);
    expectRestoredEqualsPersisted(restored1, before1);
    expectRestoredEqualsPersisted(restored2, before2);
    expect(before.sessions.length).toBe(2); // the old file snapshot is untouched by definition

    // Write-through in Process B: the third record is already on disk.
    const disk = readDiskProject(ctx.tempDir, ctx.projectId);
    expect(disk.sessions.length).toBe(3);
    expect(disk.sessions.map((s) => s.sessionId)).toContain(ctx.r3);
    expect(disk.insights[0].status).toBe('DEFERRED'); // untouched by the append
  }, 300_000);

  it('T3.7 Real Process Restart — SIGKILL: Process B destroyed without graceful shutdown, state intact', async () => {
    // Destroy THE Process B that served T3.3–T3.6 (SIGKILL — the OS reaps it;
    // no shutdown hook can run). Task §15.
    expect(ctx.procB).not.toBeNull();
    const procB = ctx.procB!;
    expect(procB.child.exitCode).toBeNull(); // it was alive right before the kill

    const exitCode = await terminate(procB.child, 'SIGKILL');
    expect(exitCode).toBe(0); // killed by signal

    // §15: SIGKILL must not destroy the persisted state.
    const file = projectFile(ctx.tempDir, ctx.projectId);
    expect(existsSync(file)).toBe(true);
    const onDisk = JSON.parse(readFileSync(file, 'utf-8'));
    expect(onDisk.sessions.length).toBe(3);
    expect(onDisk.insights.length).toBe(1);
    expect(onDisk.insights[0].status).toBe('DEFERRED');
    expect(onDisk.insights[0].revisitCondition).toBe(REVISIT_CONDITION);
    expect(onDisk.sessions.find((s: PersistedSession) => s.sessionId === ctx.r3)).toBeDefined();
  }, 180_000);

  it('T3.8 Reconstruction After SIGKILL — Process C restores Q1–Q3, insight, decision, revisit condition', async () => {
    // ── §16: Process C — third OS process, same cwd/.ais-data ──────
    const procC = await startAisProcess(ctx.tempDir, 'C');
    ctx.pidC = procC.pid;
    expect(ctx.pidC).toBeGreaterThan(0);
    expect(ctx.pidC).not.toBe(ctx.pidA);
    expect(ctx.pidC).not.toBe(ctx.pidB);

    const res = await api<ProjectContinuityView>(procC.port, 'GET', `/api/project/${ctx.projectId}/continuity`);
    expect(res.status).toBe(200);
    const view = res.json;

    // Identity survived both destruction cycles.
    expect(view.project.id).toBe(ctx.projectId);
    expect(view.project.path).toBe(DEMO_PROJECT_PATH);

    // Q1, Q2, Q3 all present (task §16).
    expect(view.sessions.length).toBe(3);
    const restored1 = view.sessions.find((s) => s.responseId === ctx.r1);
    const restored2 = view.sessions.find((s) => s.responseId === ctx.r2);
    const restored3 = view.sessions.find((s) => s.responseId === ctx.r3);
    expect(restored1!.question).toBe(QUESTION_1);
    expect(restored1!.answer).toBe(mockAnswerFor(QUESTION_1));
    expect(restored1!.feedback?.verdict).toBe(FEEDBACK_VERDICT);
    expect(restored2!.question).toBe(QUESTION_2);
    expect(restored2!.answer).toBe(mockAnswerFor(QUESTION_2));
    expect(restored3!.question).toBe(QUESTION_3);
    expect(restored3!.answer).toBe(mockAnswerFor(QUESTION_3));
    expect(restored3!.claims.length).toBeGreaterThan(0);
    expect(restored3!.sources.length).toBeGreaterThan(0);

    // Insight + decision + revisit condition survived SIGKILL.
    expect(view.insights.length).toBe(1);
    expect(view.insights[0].id).toBe(ctx.insightId);
    expect(view.insights[0].status).toBe('DEFERRED');
    expect(view.insights[0].userDecision).toBe('DEFER');
    expect(view.insights[0].revisitCondition).toBe(REVISIT_CONDITION);
    expect(view.decisions[0].decision).toBe('DEFER');
    expect(view.unresolved.map((u) => u.insightId)).toContain(ctx.insightId);
    expect(view.lastActivity).not.toBeNull();
    expect(view.goal).toBeNull();

    // History endpoint agrees after SIGKILL.
    const hist = await api<{ sessions: PersistedSession[] }>(procC.port, 'GET', `/api/project/${ctx.projectId}/history`);
    expect(hist.status).toBe(200);
    expect(hist.json.sessions.length).toBe(3);
    expect(hist.json.sessions.map((s) => s.sessionId).sort()).toEqual([ctx.r1, ctx.r2, ctx.r3].sort());

    // Every answer so far went through the hermetic real-provider path.
    expect(mockRequests.length).toBeGreaterThanOrEqual(3);
    for (const req of mockRequests) {
      expect(req.path).toContain('/chat/completions'); // no unexpected endpoints (hermetic)
      expect(req.auth).toBe('Bearer test-key');
    }

    await terminate(procC.child, 'SIGTERM');
  }, 300_000);
});
