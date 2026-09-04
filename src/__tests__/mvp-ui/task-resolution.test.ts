/**
 * TASK-AIS-TASK-RESOLUTION-SLICE-001 — Task Resolution slice tests
 *
 * Main question (task §25):
 *   "Can a user give AIS a task, and AIS independently determine the MINIMUM
 *    preparation required to work on that task, execute using the EXISTING
 *    MVP capabilities, and present the result — without making the user
 *    manage the underlying AI infrastructure?"
 *
 * Product principle under test (task §3):
 *   COMPLEXITY BELONGS TO AIS. INTENT BELONGS TO THE USER.
 *
 * Evidence layers:
 *
 *   Layer 1 (unit, provider-free): the deterministic resolution engine,
 *     validator, explanation policy and persisted-context digest — pure
 *     TypeScript, no LLM, no network (T9a, T10 + contract level of T1-T3,
 *     T4-T8).
 *
 *   Layer 2 (integration, REAL HTTP): the REAL HttpAdapter → InteractionService
 *     → Task Resolution → EvidenceLoop → ExecutionEngine(stubbed) → capture
 *     path over an ephemeral port, exactly like continue.test.ts Layer 1.
 *     The Task Resolution Engine is the REAL deterministic engine wired into
 *     InteractionService; only the ExecutionEngine is stubbed (no provider —
 *     T10). Asserts the real user path end to end, including that the
 *     ExecutionEngine received the plan's persisted-context digest ONLY when
 *     the resolved task really needed it.
 *
 *   Layer 3 (§20 cognitive-load acceptance): the REAL inline SPA script
 *     (same harness approach as welcome-back/continue tests) drives the REAL
 *     HTTP path. The user provides ONLY intent text — the recorded request
 *     bodies contain NO model/context/tool/MCP/skill/rule fields (there is
 *     no UI to configure them), and the preparation line renders from the
 *     AIS-decided adaptive explanation.
 *
 * Task mapping:
 *   T1  simple repository question        → integration (real HTTP path)
 *   T2  specific implementation question  → integration (context requirement + existing evidence path)
 *   T3  historical question               → integration + contract (history requirement only when it really exists; no fabrication)
 *   T4  explanation NONE (explicit)       → policy + integration
 *   T5  explanation SHORT (explicit)      → policy + integration
 *   T6  explanation DETAILED (explicit)   → policy + integration (human-readable, no jargon)
 *   T7  adaptive explanation (useful)     → policy + integration → SHORT
 *   T8  adaptive minimal                  → policy + integration → NONE
 *   T9  invalid resolution                → validator unit + degrade integration
 *   T10 provider independence            → whole suite runs with a stubbed engine; contracts carry no provider notions
 *   §20 cognitive-load acceptance        → Layer 3 real UI script + real HTTP, zero configuration
 *
 * Disqualifier guards:
 *   D-01 no memory-only proof: integration asserts flow through REAL HTTP
 *        and the REAL engine request captured at the execute() seam.
 *   D-05 no second pipeline: the ONLY execution input added by Task
 *        Resolution is plan.additionalContext (absent → byte-identical path).
 *   D-06 no persistence of resolutions: nothing in this slice writes new
 *        durable state (persisted shape unchanged — S-6/S-7 suites re-run).
 */

import { describe, it, expect, afterAll, vi } from 'vitest';
import {
  mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync, readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAllDemoConfigs } from '../../mvp-ui/demo-config.js';
import { SessionRuntime } from '../../core/session/session-runtime.js';
import { EvidenceLoopService } from '../../core/evidence-loop/evidence-loop-service.js';
import { InteractionService } from '../../core/interaction-layer/interaction-service.js';
import type { ExecutionEngine, ArchitectureAnswerResponse } from '../../core/engine/execution-engine.js';
import {
  TaskResolutionEngine, defaultClassifyIntent, buildPersistedContextDigest,
  validateTaskResolution, TaskResolutionValidationError, resolveExplanation,
  detectLanguage,
} from '../../core/task-resolution/index.js';
import type {
  TaskResolution, IntentClassification, PersistedFacts, ExecutionPlan,
} from '../../core/task-resolution/index.js';
import { PathSecurityService } from '../../mvp-ui/path-security.js';
import { ProjectStore } from '../../mvp-ui/project-store.js';
import { ProjectService } from '../../mvp-ui/project-service.js';
import { InsightService } from '../../mvp-ui/insight-service.js';
import { HttpAdapter } from '../../mvp-ui/http-adapter.js';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DEMO = getAllDemoConfigs()[0];
const DEMO_PROJECT_PATH = DEMO.projectPath;

const FIXED_NOW = '2026-01-01T00:00:00.000Z';

const RU_OVERVIEW = 'Что делает этот проект?';
const RU_DIAGNOSIS = 'Почему здесь возникает эта ошибка?';
const RU_HISTORY = 'Что мы делали в этом проекте раньше?';

const LEAD_IN_RU = 'Я подготовил всё необходимое.';

const tmpRoots: string[] = [];
function makeTmpDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ais-task-resolution-'));
  tmpRoots.push(dir);
  return dir;
}

// ═══════════════════════════════════════════════════════════════════
// UNIT — deterministic classifier (§17)
// ═══════════════════════════════════════════════════════════════════

describe('deterministic intent classifier (task §17)', () => {
  it('maps the three slice intents to the three slice task types (T1/T2/T3 contract)', () => {
    expect(defaultClassifyIntent(RU_OVERVIEW).taskType).toBe('repository.overview');
    expect(defaultClassifyIntent(RU_DIAGNOSIS).taskType).toBe('implementation.diagnosis');
    expect(defaultClassifyIntent(RU_HISTORY).taskType).toBe('project.history');
    expect(defaultClassifyIntent('What is the overall architecture of this project?').taskType)
      .toBe('repository.overview');
    expect(defaultClassifyIntent('Why does this test fail?').taskType)
      .toBe('implementation.diagnosis');
    expect(defaultClassifyIntent('What did we do previously on this repository?').taskType)
      .toBe('project.history');
  });

  it('falls back safely to general.question for anything unmatched (§18 continue-when-safe)', () => {
    const c = defaultClassifyIntent('Какая погода за окном?');
    expect(c.taskType).toBe('general.question');
    expect(c.confidence).toBeLessThan(0.9);
    expect(c.signals).toContain('fallback:general');
  });

  it('marks deictic pointers as ambiguous targets (§18 uncertainty)', () => {
    expect(defaultClassifyIntent(RU_DIAGNOSIS).ambiguousTarget).toBe(true);
    expect(defaultClassifyIntent('Why does this error occur here?').ambiguousTarget).toBe(true);
    expect(defaultClassifyIntent(RU_OVERVIEW).ambiguousTarget).toBe(false);
  });

  it('is deterministic — same input, same classification', () => {
    for (const q of [RU_OVERVIEW, RU_DIAGNOSIS, RU_HISTORY, 'Anything at all?']) {
      const a = defaultClassifyIntent(q);
      const b = defaultClassifyIntent(q);
      expect(b).toEqual(a);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// UNIT — resolution engine contract (T1/T2/T3 contract level, T10)
// ═══════════════════════════════════════════════════════════════════

describe('TaskResolutionEngine — contract (T1/T2/T3 contract level, T10)', () => {
  const facts: PersistedFacts = {
    sessions: [
      { question: 'What is the overall architecture of this project?', answer: 'It is a modular TypeScript service.', createdAt: '2026-01-01T10:00:00.000Z' },
    ],
    insights: [
      { text: 'Module boundaries should be re-checked.', status: 'DEFERRED', createdAt: '2026-01-01T11:00:00.000Z' },
    ],
  };

  function makeEngine(overrides?: Partial<{ facts: PersistedFacts | null }>) {
    return new TaskResolutionEngine({
      now: () => FIXED_NOW,
      projectFacts: () => (overrides && 'facts' in overrides ? overrides.facts : facts),
    });
  }

  it('T1 contract — overview intent resolves repository context and base capabilities, no configuration', () => {
    const out = makeEngine().resolveForSubmission({ sessionId: 's1', projectPath: '/p', question: RU_OVERVIEW });
    const r: TaskResolution = out.resolution;

    expect(r.taskId).toBe('TASK-s1');
    expect(r.userIntent).toBe(RU_OVERVIEW);
    expect(r.taskType).toBe('repository.overview');
    expect(r.createdAt).toBe(FIXED_NOW);
    expect(r.confidence).toBe(0.9);
    expect(r.requiredContext).toHaveLength(1);
    expect(r.requiredContext[0].id).toBe('ctx.project-state');
    // §7: requirement-level, NOT a file list.
    expect(r.requiredContext[0].description).not.toMatch(/\.[tj]sx?\b/);
    // §8: only capabilities the MVP really provides; persisted context not
    // needed for an overview on a fresh question.
    expect(r.requiredCapabilities.map(c => c.capability)).toEqual([
      'repository-inspection', 'context-retrieval', 'llm-reasoning', 'evidence-capture',
    ]);
    // §5.4: plan binds every selected capability to an EXISTING mechanism.
    expect(out.plan.steps.map(s => s.mechanism)).toEqual([
      'engine.wave1.discovery', 'engine.wave1.context-retrieval',
      'engine.wave1.llm-reasoning', 'engine.wave1.evidence-capture',
    ]);
    expect(out.plan.additionalContext).toBeNull();
    expect(out.preparation.degraded).toBe(false);
  });

  it('T2 contract — diagnosis intent requires the affected-implementation context (§7 related code, not error site only)', () => {
    const out = makeEngine().resolveForSubmission({ sessionId: 's2', projectPath: '/p', question: RU_DIAGNOSIS });
    expect(out.resolution.taskType).toBe('implementation.diagnosis');
    expect(out.resolution.requiredContext[0].id).toBe('ctx.affected-implementation');
    expect(out.resolution.requiredContext[0].description)
      .toContain('immediate dependencies');
  });

  it('T3 contract — history capability is selected ONLY when persisted history REALLY exists (no fabrication)', () => {
    // With real persisted facts → selected + digest really carries the records.
    const withHistory = makeEngine().resolveForSubmission({ sessionId: 's3', projectPath: '/p', question: RU_HISTORY });
    expect(withHistory.resolution.taskType).toBe('project.history');
    expect(withHistory.resolution.requiredContext[0].id).toBe('ctx.persisted-history');
    expect(withHistory.resolution.requiredCapabilities.map(c => c.capability))
      .toContain('persisted-project-context');
    expect(withHistory.plan.additionalContext).toBeTruthy();
    expect(withHistory.plan.additionalContext).toContain('What is the overall architecture of this project?');
    expect(withHistory.plan.additionalContext).toContain('Module boundaries should be re-checked.');
    expect(withHistory.plan.additionalContext).toContain('Persisted project context (real records only):');

    // Without persisted facts → NOT selected, no digest, honest short explanation.
    const withoutHistory = makeEngine({ facts: null }).resolveForSubmission({ sessionId: 's3b', projectPath: '/p', question: RU_HISTORY });
    expect(withoutHistory.resolution.requiredCapabilities.map(c => c.capability))
      .not.toContain('persisted-project-context');
    expect(withoutHistory.plan.additionalContext).toBeNull();
    // §18: continue when safe, explain uncertainty in human terms.
    expect(withoutHistory.resolution.explanation.mode).toBe('short');
    expect(withoutHistory.resolution.explanation.message).toContain('не выдумывая');
  });

  it('is deterministic for the full submission resolution (frozen now)', () => {
    const e = makeEngine();
    const a = e.resolveForSubmission({ sessionId: 'sd', projectPath: '/p', question: RU_DIAGNOSIS });
    const b = e.resolveForSubmission({ sessionId: 'sd', projectPath: '/p', question: RU_DIAGNOSIS });
    expect(b).toEqual(a);
  });

  it('T10 — contracts are provider-agnostic: no provider/model notions anywhere in the output', () => {
    const out = makeEngine().resolveForSubmission({ sessionId: 's10', projectPath: '/p', question: RU_DIAGNOSIS });
    const serialized = JSON.stringify(out);
    expect(serialized.toLowerCase()).not.toMatch(/openai|gpt|anthropic|claude|qwen|glm|provider|model"/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// UNIT — validation gate (T9a, task §16)
// ═══════════════════════════════════════════════════════════════════

describe('validateTaskResolution — invalid resolutions must not propagate (T9a, §16)', () => {
  const engine = new TaskResolutionEngine({ now: () => FIXED_NOW });
  const valid: TaskResolution = engine.resolveForSubmission({
    sessionId: 'v1', projectPath: '/p', question: RU_OVERVIEW,
  }).resolution;

  const malformed: readonly [string, unknown][] = [
    ['not an object (null)', null],
    ['not an object (string)', 'resolution'],
    ['not an object (number)', 42],
    ['taskId empty', { ...valid, taskId: '' }],
    ['taskId wrong type', { ...valid, taskId: 42 }],
    ['userIntent empty', { ...valid, userIntent: '   ' }],
    ['taskType unknown', { ...valid, taskType: 'quantum.compute' }],
    ['objective empty', { ...valid, objective: '' }],
    ['requiredContext not array', { ...valid, requiredContext: 'project state' }],
    ['requiredContext item missing rationale', { ...valid, requiredContext: [{ id: 'x', description: 'y' }] }],
    ['capability not available', { ...valid, requiredCapabilities: [{ capability: 'time-travel', reason: 'r' }] }],
    ['explanation mode unknown', { ...valid, explanation: { mode: 'verbose', message: null } }],
    ['explanation message wrong type', { ...valid, explanation: { mode: 'short', message: 42 } }],
    ['confidence above 1', { ...valid, confidence: 1.5 }],
    ['confidence not a number', { ...valid, confidence: 'high' }],
    ['createdAt empty', { ...valid, createdAt: '' }],
  ];

  for (const [name, candidate] of malformed) {
    it(`rejects: ${name}`, () => {
      expect(() => validateTaskResolution(candidate)).toThrow(TaskResolutionValidationError);
    });
  }

  it('accepts the runtime-produced resolution and never leaks field values into error messages', () => {
    expect(validateTaskResolution(valid)).toEqual(valid);
    try {
      validateTaskResolution({ ...valid, confidence: 7, userIntent: 'SECRET-VALUE-XYZ' });
      expect.unreachable('must throw');
    } catch (err) {
      expect((err as Error).message).toContain('confidence');
      expect((err as Error).message).not.toContain('SECRET-VALUE-XYZ');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// UNIT — explanation policy (T4/T5/T6/T7/T8 policy level, §9-§11)
// ═══════════════════════════════════════════════════════════════════

describe('explanation policy (T4-T8 policy level, §9-§11)', () => {
  const requirements = ['understand the implementation of the affected functionality and its immediate dependencies'];

  it('T4 — explicit NONE wins over every adaptive reason (priority 1)', () => {
    const out = resolveExplanation({
      preference: 'none',
      reasons: ['related-context', 'ambiguous-target'],
      requirements,
      language: 'ru',
    });
    expect(out.mode).toBe('none');
    expect(out.message).toBeNull();
  });

  it('T5 — explicit SHORT produces a concise human explanation (priority 1)', () => {
    const out = resolveExplanation({
      preference: 'short',
      reasons: ['related-context', 'ambiguous-target'],
      requirements,
      language: 'ru',
    });
    expect(out.mode).toBe('short');
    expect(out.message).toBeTruthy();
    expect(out.message!.startsWith(LEAD_IN_RU)).toBe(true);
    // concise: lead-in + reason sentences, no requirement dump
    expect(out.message).not.toContain('Что подготовлено:');
  });

  it('T6 — explicit DETAILED adds what was prepared, still human-readable, no jargon (§10/§11)', () => {
    const out = resolveExplanation({
      preference: 'detailed',
      reasons: ['related-context'],
      requirements,
      language: 'en',
    });
    expect(out.mode).toBe('detailed');
    expect(out.message).toContain('What was prepared:');
    expect(out.message).toContain('immediate dependencies');
    // §11 GOOD-pattern: meaning, not machinery. Never implementation jargon.
    expect(out.message).not.toMatch(/gpt|openai|glm|token|mcp|provider|model\b|\.tsx?\b|\/api\//i);
  });

  it('T7 — adaptive: explanation is SHORT exactly when a reason code says it is useful', () => {
    const useful = resolveExplanation({
      reasons: ['related-context', 'ambiguous-target'],
      requirements,
      language: 'ru',
    });
    expect(useful.mode).toBe('short');
    expect(useful.message).toContain('связанные части проекта');

    const useless = resolveExplanation({ reasons: [], requirements, language: 'ru' });
    expect(useless.mode).toBe('none');
    expect(useless.message).toBeNull();
  });

  it('T8 — adaptive default for a simple clear task is NONE (no unnecessary explanation)', () => {
    const out = resolveExplanation({ reasons: [], requirements: [], language: 'ru' });
    expect(out.mode).toBe('none');
    expect(out.message).toBeNull();
  });

  it('adaptive DETAILED is unreachable — only explicit preference can select it', () => {
    const out = resolveExplanation({
      reasons: ['degraded', 'ambiguous-target', 'related-context', 'history-grounded'],
      requirements,
      language: 'en',
    });
    expect(out.mode).toBe('short');
  });

  it('language follows the intent (Cyrillic → ru, else en)', () => {
    expect(detectLanguage(RU_DIAGNOSIS)).toBe('ru');
    expect(detectLanguage('Why does this fail?')).toBe('en');
  });
});

// ═══════════════════════════════════════════════════════════════════
// UNIT — persisted context digest (no fabrication, sanitized)
// ═══════════════════════════════════════════════════════════════════

describe('buildPersistedContextDigest — real records only, sanitized (§19/§22)', () => {
  it('returns null when nothing is persisted — never a fabricated placeholder', () => {
    expect(buildPersistedContextDigest({ sessions: [], insights: [] })).toBeNull();
  });

  it('orders newest-first, caps lengths, and redacts secrets', () => {
    const long = 'x'.repeat(500);
    const digest = buildPersistedContextDigest({
      sessions: [
        { question: 'newest question', answer: long, createdAt: '2026-01-02T00:00:00.000Z' },
        { question: 'oldest question', answer: 'a', createdAt: '2026-01-01T00:00:00.000Z' },
        { question: 'sk-abcdefghijklmnopqrst', answer: 'answer with sk-abcdefghijklmnopqrst inside', createdAt: '2026-01-03T00:00:00.000Z' },
      ],
      insights: [
        { text: 'an insight', status: 'DEFERRED', createdAt: '2026-01-02T12:00:00.000Z' },
      ],
    })!;

    expect(digest).toContain('newest question');
    expect(digest.indexOf('newest question')).toBeLessThan(digest.indexOf('oldest question'));
    expect(digest.length).toBeLessThan(2400); // total cap holds
    expect(digest).not.toContain('sk-abcdefghijklmnopqrst'); // sanitized (§22)
    expect(digest).toContain('[REDACTED:secret]');
  });
});

// ═══════════════════════════════════════════════════════════════════
// LAYER-2 HARNESS — real adapter + real services + REAL Task Resolution
// engine wired into InteractionService; only the ExecutionEngine is stubbed
// (same approach as continue.test.ts Layer 1 — no provider, T10).
// ═══════════════════════════════════════════════════════════════════

function makeEngineResponse(overrides?: Partial<ArchitectureAnswerResponse>): ArchitectureAnswerResponse {
  return {
    question: 'default question',
    answer: 'default answer',
    sources: [
      { filePath: 'src/index.ts', description: 'Entry point module', relevance: 0.9, snippet: 'export const main = () => {};' },
    ],
    evidence: null,
    model: 'test-model',
    provider: 'test-provider',
    latencyMs: 5,
    discoveryStats: { totalFiles: 10, modules: 2, dependencies: 3, techStack: ['typescript'] },
    ...overrides,
  };
}

interface Harness {
  adapter: HttpAdapter;
  port: number;
  projectDataDir: string;
  repoDir: string;
  /** Engine requests captured at the REAL execute() seam (D-01). */
  engineRequests: unknown[];
  responseBox: { current: ArchitectureAnswerResponse; fail?: boolean };
}

async function setupHarness(opts?: {
  classifyIntent?: (intent: string) => IntentClassification;
  /** Override the projectFacts wiring (defaults to the real ProjectService read path). */
  projectFacts?: (projectPath: string) => PersistedFacts | null;
}): Promise<Harness> {
  const tmp = makeTmpDir();
  const projectDataDir = join(tmp, 'ais-data', 'projects');
  const repoDir = join(tmp, 'repo');
  mkdirSync(repoDir, { recursive: true });

  const responseBox = { current: makeEngineResponse() };
  const engineRequests: unknown[] = [];

  const store = new ProjectStore(projectDataDir);
  const projectService = new ProjectService(store);
  const insightService = new InsightService(store);
  const sessionRuntime = new SessionRuntime();
  const evidenceLoop = new EvidenceLoopService({ sessionRuntime });

  const stubEngine = {
    execute: vi.fn(async (request: unknown) => {
      engineRequests.push(request);
      if (responseBox.fail) throw new Error('Simulated engine failure');
      return responseBox.current;
    }),
  } as unknown as ExecutionEngine;

  // The REAL deterministic Task Resolution engine (task §12 wiring), exactly
  // like mvp-ui/index.ts wires it — reading ONLY the existing ProjectService
  // read path (§5.1/§13).
  const taskResolver = new TaskResolutionEngine({
    projectFacts: opts?.projectFacts ?? ((projectPath: string) => {
      const project = projectService.findByPath(projectPath);
      if (!project) return null;
      return { sessions: project.sessions, insights: project.insights };
    }),
    ...(opts?.classifyIntent ? { classifyIntent: opts.classifyIntent } : {}),
  });

  const interactionService = new InteractionService({
    evidenceLoop,
    engine: stubEngine,
    taskResolver,
  });

  const pathSecurity = new PathSecurityService({
    allowedRoots: [tmp],
    demoAllowlist: [DEMO_PROJECT_PATH],
  });

  const spaPath = join(tmp, 'index.html');
  writeFileSync(spaPath, '<html><body>task-resolution-test</body></html>');

  const adapter = new HttpAdapter({
    interactionService,
    pathSecurity,
    port: 0,
    spaPath,
    realInferenceAvailable: true,
    projectService,
    insightService,
  });
  await adapter.start();
  return { adapter, port: adapter.actualPort, projectDataDir, repoDir, engineRequests, responseBox };
}

async function httpJson<T>(
  port: number,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; json: T; bodySent: unknown }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: (await res.json()) as T, bodySent: body };
}

interface QuestionResponse {
  responseId: string;
  content: string;
  sources: { filePath: string; type: string; excerpt: string; relevance: number }[];
  claims: { claimId: string; statement: string; isVerified: boolean; evidenceCount: number }[];
  preparation?: {
    mode: 'none' | 'short' | 'detailed';
    message: string | null;
    taskType: string;
    confidence: number;
    degraded: boolean;
  };
}

async function ask(
  h: Harness,
  projectPath: string,
  question: string,
  extraBody?: Record<string, unknown>,
): Promise<{ session: { sessionId: string; projectId?: string }; answer: QuestionResponse; status: number }> {
  const s = await httpJson<{ sessionId: string; projectId?: string }>(h.port, 'POST', '/api/session', { projectPath });
  expect(s.status).toBe(201);
  const q = await httpJson<QuestionResponse>(h.port, 'POST', `/api/session/${s.json.sessionId}/question`, {
    question,
    ...(extraBody ?? {}),
  });
  expect(q.status).toBe(200);
  return { session: s.json, answer: q.json, status: q.status };
}

// ═══════════════════════════════════════════════════════════════════
// LAYER-2 — T1/T2/T3/T7/T8 through the REAL HTTP path
// ═══════════════════════════════════════════════════════════════════

describe('task resolution through the real HTTP path (T1/T2/T3/T7/T8)', () => {
  it('T1 — simple repository question: resolution created, repository context selected, zero configuration requested', async () => {
    const h = await setupHarness();
    // The user's request contains ONLY intent — no model/context/tool/skill fields exist to send.
    const { answer } = await ask(h, h.repoDir, RU_OVERVIEW);

    expect(answer.preparation).toBeDefined();
    expect(answer.preparation!.taskType).toBe('repository.overview');
    expect(answer.preparation!.confidence).toBe(0.9);
    expect(answer.preparation!.degraded).toBe(false);
    // The existing answer path is untouched: content, claims, evidence all flow.
    expect(answer.content).toBe('default answer');
    expect(answer.claims).toHaveLength(1);
    expect(answer.sources).toHaveLength(1);
    // D-01: the execution seam received the plain request — the plan added NO
    // persisted context for a fresh overview task (byte-identical pipeline).
    expect(h.engineRequests).toHaveLength(1);
    expect((h.engineRequests[0] as { additionalContext?: string }).additionalContext).toBeUndefined();
  });

  it('T2 — specific implementation question: related-implementation context required, existing evidence path used', async () => {
    const h = await setupHarness();
    const { answer } = await ask(h, h.repoDir, RU_DIAGNOSIS);

    expect(answer.preparation!.taskType).toBe('implementation.diagnosis');
    // The execution used the EXISTING repository/evidence path (claims+sources from engineResponse).
    expect(answer.claims).toHaveLength(1);
    expect(answer.sources[0].filePath).toBe('src/index.ts');
    // No persisted history exists on this fresh project → no digest injected.
    expect((h.engineRequests[0] as { additionalContext?: string }).additionalContext).toBeUndefined();
  });

  it('T3 — historical question: persisted history really grounded in execution, nothing fabricated', async () => {
    const h = await setupHarness();

    // Seed one real Q&A through the normal path first.
    await ask(h, h.repoDir, 'What is the overall architecture of this project?');
    expect(h.engineRequests).toHaveLength(1);

    // Now the history question — a NEW interaction session (one Q&A per session FSM).
    const { answer } = await ask(h, h.repoDir, RU_HISTORY);

    expect(answer.preparation!.taskType).toBe('project.history');
    expect(answer.preparation!.mode).toBe('short');
    expect(answer.preparation!.message).toContain('сохранённую историю');
    // The plan's digest (and ONLY the plan's digest) reached the existing engine seam.
    const req = h.engineRequests[1] as { question: string; additionalContext?: string };
    expect(req.additionalContext).toBeTruthy();
    expect(req.additionalContext).toContain('Persisted project context (real records only):');
    expect(req.additionalContext).toContain('What is the overall architecture of this project?');
    // No fabricated history: only really persisted text appears in the digest.
    expect(req.additionalContext).not.toContain('fabricated');
  });

  it('T3b — historical question with NO persisted history: capability not claimed, honest short explanation, normal answer', async () => {
    const h = await setupHarness();
    const { answer } = await ask(h, h.repoDir, RU_HISTORY);

    expect(answer.preparation!.taskType).toBe('project.history');
    expect(answer.preparation!.mode).toBe('short');
    expect(answer.preparation!.message).toContain('не выдумывая');
    expect((h.engineRequests[0] as { additionalContext?: string }).additionalContext).toBeUndefined();
    // The existing pipeline answered anyway (continue-when-safe, §18).
    expect(answer.content).toBe('default answer');
  });

  it('T7 — adaptive: no explicit preference, but the situation is explanation-worthy → SHORT', async () => {
    const h = await setupHarness();
    const { answer } = await ask(h, h.repoDir, RU_DIAGNOSIS); // diagnosis + deictic "здесь"

    expect(answer.preparation!.mode).toBe('short');
    expect(answer.preparation!.message).toBeTruthy();
    expect(answer.preparation!.message!.startsWith(LEAD_IN_RU)).toBe(true);
    expect(answer.preparation!.message).toContain('связанные части проекта');
  });

  it('T8 — adaptive minimal: simple clear task, explanation adds no value → NONE (message null)', async () => {
    const h = await setupHarness();
    const { answer } = await ask(h, h.repoDir, RU_OVERVIEW);

    expect(answer.preparation!.mode).toBe('none');
    expect(answer.preparation!.message).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// LAYER-2 — explicit preference through HTTP (T4/T5/T6, §9 priority 1)
// ═══════════════════════════════════════════════════════════════════

describe('explicit explanation preference through HTTP (T4/T5/T6)', () => {
  it('T4 — explicit none: no unnecessary explanation even for an explanation-worthy task', async () => {
    const h = await setupHarness();
    const { answer } = await ask(h, h.repoDir, RU_DIAGNOSIS, { explanation: 'none' });
    expect(answer.preparation!.mode).toBe('none');
    expect(answer.preparation!.message).toBeNull();
  });

  it('T5 — explicit short: concise human explanation', async () => {
    const h = await setupHarness();
    const { answer } = await ask(h, h.repoDir, RU_DIAGNOSIS, { explanation: 'short' });
    expect(answer.preparation!.mode).toBe('short');
    expect(answer.preparation!.message).toBeTruthy();
    expect(answer.preparation!.message!.startsWith(LEAD_IN_RU)).toBe(true);
    expect(answer.preparation!.message).not.toContain('Что подготовлено:');
  });

  it('T6 — explicit detailed: more detailed, still human-readable, no implementation jargon', async () => {
    const h = await setupHarness();
    const short = (await ask(h, h.repoDir, RU_DIAGNOSIS, { explanation: 'short' })).answer.preparation!;
    const detailed = (await ask(h, h.repoDir, RU_DIAGNOSIS, { explanation: 'detailed' })).answer.preparation!;

    expect(detailed.mode).toBe('detailed');
    expect(detailed.message!.length).toBeGreaterThan(short.message!.length);
    expect(detailed.message).toContain('Что подготовлено:');
    expect(detailed.message).toContain('immediate dependencies');
    // §11: transparency explains MEANING, not implementation details.
    expect(detailed.message).not.toMatch(/gpt|openai|glm|token\b|mcp\b|\.tsx?\b|discovery/i);
  });

  it('rejects an out-of-vocabulary preference with the existing 400 convention', async () => {
    const h = await setupHarness();
    const s = await httpJson<{ sessionId: string }>(h.port, 'POST', '/api/session', { projectPath: h.repoDir });
    expect(s.status).toBe(201);
    const q = await httpJson<{ error: string }>(h.port, 'POST', `/api/session/${s.json.sessionId}/question`, {
      question: RU_OVERVIEW,
      explanation: 'shout-at-me',
    });
    expect(q.status).toBe(400);
    expect(q.json.error).toContain('none, short, detailed');
  });
});

// ═══════════════════════════════════════════════════════════════════
// T9b — invalid resolution degrades safely through the REAL path (§16/§18)
// ═══════════════════════════════════════════════════════════════════

describe('T9b — malformed classification degrades safely (no corrupted execution)', () => {
  const brokenClassifier = (): IntentClassification => ({
    taskType: 'quantum.compute' as never, // unknown task type → self-validation MUST fail
    confidence: 7, // out of bounds
    ambiguousTarget: false,
    signals: [],
  });

  it('degrades to the minimal-safe path: answer still produced, degraded flagged, no digest injected', async () => {
    const h = await setupHarness({ classifyIntent: brokenClassifier });
    const { answer, status } = await ask(h, h.repoDir, RU_DIAGNOSIS);

    expect(status).toBe(200);
    expect(answer.content).toBe('default answer'); // execution was NOT corrupted
    expect(answer.preparation!.degraded).toBe(true);
    expect(answer.preparation!.taskType).toBe('general.question');
    expect(answer.preparation!.confidence).toBe(0.3);
    expect(answer.preparation!.mode).toBe('short');
    expect(answer.preparation!.message).toContain('минимальной безопасной подготовкой');
    // The invalid resolution never reached execution: minimal-safe plan → no digest.
    expect((h.engineRequests[0] as { additionalContext?: string }).additionalContext).toBeUndefined();
  });

  it('a throwing classifier degrades the same way — the question path never breaks', async () => {
    const h = await setupHarness({
      classifyIntent: () => { throw new Error('classifier exploded'); },
    });
    const { answer, status } = await ask(h, h.repoDir, RU_OVERVIEW);
    expect(status).toBe(200);
    expect(answer.content).toBe('default answer');
    expect(answer.preparation!.degraded).toBe(true);
    expect(answer.preparation!.message).toContain('минимальной безопасной подготовкой');
  });

  it('even the degraded path produces a VALID resolution (validateTaskResolution passes)', () => {
    const engine = new TaskResolutionEngine({
      classifyIntent: brokenClassifier,
      now: () => FIXED_NOW,
    });
    const out = engine.resolveForSubmission({ sessionId: 'dg', projectPath: '/p', question: RU_DIAGNOSIS });
    expect(() => validateTaskResolution(out.resolution)).not.toThrow();
    expect(out.plan.additionalContext).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// T10 — provider independence of the whole flow
// ═══════════════════════════════════════════════════════════════════

describe('T10 — provider independence', () => {
  it('the full slice runs with a stubbed engine and no provider configuration; explanations stay provider-free', async () => {
    // No OPENAI_*/AIS_REAL_LLM env is set anywhere in this suite. The engine
    // seam is a stub — Task Resolution itself never touches a provider.
    const h = await setupHarness();
    const { answer } = await ask(h, h.repoDir, RU_DIAGNOSIS, { explanation: 'detailed' });
    expect(answer.preparation).toBeDefined();
    expect(answer.preparation!.message).not.toMatch(/gpt|openai|anthropic|glm|qwen/i);
    const serialized = JSON.stringify(answer.preparation);
    expect(serialized).not.toMatch(/provider|model/i);
  });

  it('a bare TaskResolutionEngine needs nothing but the intent', () => {
    const engine = new TaskResolutionEngine(); // no projectFacts, no config
    const out = engine.resolveForSubmission({ sessionId: 'bare', projectPath: '/nowhere', question: RU_OVERVIEW });
    expect(out.resolution.taskType).toBe('repository.overview');
    expect(out.plan.additionalContext).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// §20 COGNITIVE-LOAD ACCEPTANCE — the user configures NOTHING
// ═══════════════════════════════════════════════════════════════════

// ── Fake DOM harness (same approach as welcome-back/continue tests — no DOM lib)

class FakeClassList {
  private readonly set = new Set<string>();
  add(...tokens: string[]): void { for (const t of tokens) this.set.add(t); }
  remove(...tokens: string[]): void { for (const t of tokens) this.set.delete(t); }
  contains(token: string): boolean { return this.set.has(token); }
  toggle(token: string, force?: boolean): boolean {
    const next = force === undefined ? !this.set.has(token) : force;
    if (next) this.set.add(token); else this.set.delete(token);
    return next;
  }
}

class FakeElement {
  readonly tagName: string;
  id: string;
  className = '';
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  classList = new FakeClassList();
  value = '';
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  onclick: (() => void) | null = null;
  disabled = false;
  private inner = '';
  private ownText = '';

  constructor(tag: string, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
  }

  get innerHTML(): string {
    let out = this.inner;
    for (const child of this.children) out += child.serializeNode();
    return out;
  }
  set innerHTML(html: string) {
    this.inner = String(html);
    this.children = [];
  }

  get textContent(): string {
    return this.ownText + this.children.map(c => c.textContent).join('');
  }
  set textContent(text: string) {
    this.ownText = String(text);
    this.children = [];
  }

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  focus(): void { /* noop */ }

  private serializeNode(): string {
    const tag = this.tagName.toLowerCase();
    const cls = this.className ? ` class="${this.className}"` : '';
    const markup = this.inner + this.ownText + this.children.map(c => c.serializeNode()).join('');
    return `<${tag}${cls}>${markup}</${tag}>`;
  }
}

class FakeDocument {
  readonly elements = new Map<string, FakeElement>();
  getElementById(id: string): FakeElement {
    let el = this.elements.get(id);
    if (!el) { el = new FakeElement('div', id); this.elements.set(id, el); }
    return el;
  }
  createElement(tag: string): FakeElement { return new FakeElement(tag); }
  addEventListener(): void { /* not exercised here */ }
  querySelectorAll(): FakeElement[] { return []; }
}

class FakeLocalStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null { return this.map.has(key) ? (this.map.get(key) as string) : null; }
  setItem(key: string, value: string): void { this.map.set(key, String(value)); }
  removeItem(key: string): void { this.map.delete(key); }
  clear(): void { this.map.clear(); }
}

interface RecordedCall { url: string; method: string; body?: string; status?: number }

function makeRealFetch(port: number, calls: RecordedCall[]) {
  return async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    const abs = url.startsWith('/') ? `http://127.0.0.1:${port}${url}` : url;
    const res = await fetch(abs, { method: init?.method, headers: init?.headers, body: init?.body });
    calls.push({ url, method: (init?.method ?? 'GET').toUpperCase(), body: init?.body, status: res.status });
    return res;
  };
}

async function settleHttp(): Promise<void> {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 10));
}

describe('§20 cognitive-load acceptance — the user configures NOTHING', () => {
  it('HTTP level: the request contract has no configuration knobs at all — intent text only', async () => {
    const h = await setupHarness();
    // Session start: project selection only (not execution configuration).
    const s = await httpJson<{ sessionId: string }>(h.port, 'POST', '/api/session', { projectPath: h.repoDir });
    expect(s.status).toBe(201);
    expect(Object.keys(s.bodySent as object)).toEqual(['projectPath']);
    // Question: intent text only. AIS decided task type, context, capabilities itself.
    const q = await httpJson<QuestionResponse>(h.port, 'POST', `/api/session/${s.json.sessionId}/question`, { question: RU_DIAGNOSIS });
    expect(q.status).toBe(200);
    expect(Object.keys(q.bodySent as object)).toEqual(['question']);
    expect(q.json.preparation!.taskType).toBe('implementation.diagnosis');
    expect(q.json.claims).toHaveLength(1);
  });

  it('REAL UI script: user types intent, clicks once — AIS prepares everything and renders the explanation', async () => {
    const h = await setupHarness();
    const calls: RecordedCall[] = [];

    const html = readFileSync(join(REPO_ROOT, 'mvp-ui', 'index.html'), 'utf-8');
    const scriptStart = html.indexOf('<script>');
    const scriptEnd = html.lastIndexOf('</script>');
    expect(scriptStart).toBeGreaterThan(0);
    const scriptSrc = html.slice(scriptStart + '<script>'.length, scriptEnd);

    const doc = new FakeDocument();
    const win: Record<string, unknown> = { scrollTo: () => undefined };
    const factory = new Function(
      'document', 'window', 'localStorage', 'fetch',
      scriptSrc + '\n;return { createSession, submitQuestion };',
    ) as unknown as (
      d: FakeDocument, w: Record<string, unknown>, l: FakeLocalStorage, f: ReturnType<typeof makeRealFetch>,
    ) => { createSession: (p: string, demo: boolean) => Promise<void>; submitQuestion: () => Promise<void> };

    const spa = factory(doc, win, new FakeLocalStorage(), makeRealFetch(h.port, calls));

    // The user opens the demo project and types intent. NOTHING is selected,
    // configured, or toggled — the UI offers no such controls.
    await spa.createSession(DEMO_PROJECT_PATH, true);
    await settleHttp();

    doc.getElementById('question-input').value = RU_DIAGNOSIS;
    await spa.submitQuestion();

    // The EXACT wire body of the user's action: intent text, nothing else.
    const questionCall = calls.find(c => c.method === 'POST' && c.url.includes('/question'));
    expect(questionCall).toBeDefined();
    expect(questionCall!.body).toBe(JSON.stringify({ question: RU_DIAGNOSIS }));
    expect(questionCall!.status).toBe(200);
    // No configuration-bearing request exists anywhere in the whole exchange.
    for (const c of calls) {
      if (c.body) expect(c.body).not.toMatch(/"(model|tools|mcp|skills|rules|context)"/);
    }

    // The AIS-decided preparation line is rendered above the answer.
    const prep = doc.getElementById('preparation-note');
    expect(prep.textContent).toBeTruthy();
    expect(prep.textContent!.startsWith(LEAD_IN_RU)).toBe(true);
    expect(prep.classList.contains('hidden')).toBe(false);
    expect(doc.getElementById('answer-content').textContent).toBe('default answer');
  });

  it('REAL UI script: adaptive NONE keeps the preparation line hidden for a simple clear task', async () => {
    const h = await setupHarness();
    const calls: RecordedCall[] = [];

    const html = readFileSync(join(REPO_ROOT, 'mvp-ui', 'index.html'), 'utf-8');
    const scriptSrc = html.slice(html.indexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'));
    const doc = new FakeDocument();
    const factory = new Function(
      'document', 'window', 'localStorage', 'fetch',
      scriptSrc + '\n;return { createSession, submitQuestion };',
    ) as unknown as (
      d: FakeDocument, w: Record<string, unknown>, l: FakeLocalStorage, f: ReturnType<typeof makeRealFetch>,
    ) => { createSession: (p: string, demo: boolean) => Promise<void>; submitQuestion: () => Promise<void> };
    const spa = factory(doc, { scrollTo: () => undefined }, new FakeLocalStorage(), makeRealFetch(h.port, calls));

    await spa.createSession(DEMO_PROJECT_PATH, true);
    await settleHttp();
    doc.getElementById('question-input').value = RU_OVERVIEW;
    await spa.submitQuestion();

    const prep = doc.getElementById('preparation-note');
    expect(prep.textContent).toBe('');
    expect(prep.classList.contains('hidden')).toBe(true);
    expect(doc.getElementById('answer-content').textContent).toBe('default answer');
  });
});

// ═══════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════

afterAll(() => {
  for (const dir of tmpRoots) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});
