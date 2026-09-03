/**
 * TASK-AIS-CONTINUE-001 — S-6 Continue Tests (T6.1..T6.14)
 *
 * Main question (task §1):
 *   "After the project is restored, can the user continue working from the
 *    restored context with ONE action, without re-entering known
 *    information — appending new state to the SAME project?"
 *
 * S-7 proved that AIS REMEMBERS. S-6 must prove AIS can CONTINUE from that
 * memory. This suite drives the REAL existing user path — no new memory,
 * context, conversation, or persistence architecture (task §4, §19):
 *
 *   continuity.continuation            (GET /api/project/:id/continuity)
 *     ↓ Welcome Back rendering         (wbRenderContinue — [Ask]/[Revisit])
 *     ↓ click                          (fills the EXISTING #question-input)
 *     ↓ submitQuestion()               (the EXISTING SPA submit flow)
 *     ↓ POST /api/session/:id/question (EXISTING endpoint, EXISTING FSM)
 *     ↓ answer + evidence              (EXISTING answer path)
 *     ↓ captureSessionAnswer           (EXISTING capture bridge, responseId keying)
 *     ↓ ProjectStore.addSession        (write-through persisted JSON)
 *     ↓ SAME projectId (S-6.5), append-only (S-6.4), preserved history
 *
 * Two evidence layers:
 *
 *   Layer 1 (in-process): the REAL inline SPA script (extracted from
 *     mvp-ui/index.html, same harness approach as welcome-back.test.ts)
 *     evaluated in a deterministic fake DOM whose fetch performs REAL HTTP
 *     requests against a REAL HttpAdapter (ephemeral port) wired with REAL
 *     SessionRuntime → EvidenceLoopService → InteractionService,
 *     PathSecurityService, ProjectStore (temp fs), ProjectService and
 *     InsightService. Only the ExecutionEngine is stubbed (no network).
 *
 *   Layer 2 (T6.13/T6.14): REAL OS processes (same technique as
 *     memory-restart-acceptance.test.ts) with the hermetic OpenAI-compatible
 *     mock: Process A seeds state via HTTP → SIGTERM → Process B restores it
 *     and the REAL UI performs the continue action (Welcome Back → click
 *     continuation → input populated → submitQuestion) → new Q&A persisted →
 *     SIGKILL → Process C restores Q1/Q2/Q3 (task §10/§11 scenario).
 *
 * Disqualifier guards (task §19):
 *   D-01 no memory-only proof: every state assertion re-reads via real HTTP
 *     or directly from the persisted JSON on disk. Cross-test variables hold
 *     ORCHESTRATION state only (ports, ids, UI element handles).
 *   D-02 no manual seeding of .ais-data in Layer 2 — the project JSON is
 *     created by POST /api/session only.
 *   D-03 no shutdown dependence: files are asserted on disk before kills.
 *   D-05 zero source changes: this file adds tests only (src/ untouched).
 *   No fabricated context: continuation points are only ever the REAL
 *     persisted revisitable insights / existing demo suggested questions;
 *     the empty-project case must show no fabricated history (§14/§15).
 */

import { describe, it, expect, afterAll } from 'vitest';
import { vi } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import {
  mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { getAllDemoConfigs } from '../../mvp-ui/demo-config.js';
import type {
  Project,
  PersistedSession,
  ProjectContinuityView,
} from '../../mvp-ui/project-types.js';
import { InsightStatus, GoalAlignment } from '../../mvp-ui/project-types.js';
import { SessionRuntime } from '../../core/session/session-runtime.js';
import { EvidenceLoopService } from '../../core/evidence-loop/evidence-loop-service.js';
import { InteractionService } from '../../core/interaction-layer/interaction-service.js';
import type { ExecutionEngine, ArchitectureAnswerResponse } from '../../core/engine/execution-engine.js';
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
/** The existing demo suggested questions — the ONLY source of [Ask: …] continuation. */
const DEMO_QUESTIONS = DEMO.suggestedQuestions;
const QUESTION_1 = DEMO_QUESTIONS[0];
const QUESTION_2 = DEMO_QUESTIONS[1];
/** The continuation suggestion used for the Continue action (not asked before). */
const CONTINUE_SUGGESTION = DEMO_QUESTIONS[2];

const FEEDBACK_COMMENT = 'Continue acceptance: answer was grounded.';
const INSIGHT_TEXT = 'Continue acceptance: module boundaries should be re-checked.';
const REVISIT_CONDITION = 'Revisit when the repository structure changes.';

const tmpRoots: string[] = [];

function makeTmpDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ais-continue-'));
  tmpRoots.push(dir);
  return dir;
}

// ═══════════════════════════════════════════════════════════════════
// FAKE DOM HARNESS (same approach as welcome-back.test.ts — no DOM lib)
// ═══════════════════════════════════════════════════════════════════

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
  get childElementCount(): number { return this.children.length; }

  private serializeNode(): string {
    const tag = this.tagName.toLowerCase();
    const cls = this.className ? ` class="${this.className}"` : '';
    const markup = this.inner + (this.ownText ? this.ownText : '');
    const childMarkup = this.children.map(c => c.serializeNode()).join('');
    return `<${tag}${cls}>${markup}${childMarkup}</${tag}>`;
  }
}

class FakeDocument {
  readonly elements = new Map<string, FakeElement>();
  readonly listeners: Array<{ type: string; fn: unknown }> = [];

  getElementById(id: string): FakeElement {
    let el = this.elements.get(id);
    if (!el) { el = new FakeElement('div', id); this.elements.set(id, el); }
    return el;
  }
  createElement(tag: string): FakeElement { return new FakeElement(tag); }
  addEventListener(type: string, fn: unknown): void { this.listeners.push({ type, fn }); }
  querySelectorAll(): FakeElement[] { return []; }
}

class FakeLocalStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null { return this.map.has(key) ? (this.map.get(key) as string) : null; }
  setItem(key: string, value: string): void { this.map.set(key, String(value)); }
  removeItem(key: string): void { this.map.delete(key); }
  clear(): void { this.map.clear(); }
}

/** The fetch signature the SPA actually uses (apiPost/apiGet/loadWelcomeBack). */
type SpaFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<Response>;

interface RecordedCall {
  url: string;
  method: string;
  body?: string;
  status?: number;
  json?: unknown;
}

/**
 * REAL-HTTP fetch for the SPA: relative SPA URLs are mapped onto the target
 * AIS server. Every exchange is recorded (method/url/status/body/response).
 * This is a real network round trip — not a stubbed route table.
 */
function makeRealFetch(port: number, calls: RecordedCall[]): SpaFetch {
  return async (url, init) => {
    const abs = url.startsWith('/') ? `http://127.0.0.1:${port}${url}` : url;
    const res = await fetch(abs, {
      method: init?.method,
      headers: init?.headers,
      body: init?.body,
    });
    const record: RecordedCall = { url, method: (init?.method ?? 'GET').toUpperCase(), body: init?.body, status: res.status };
    try { record.json = await res.clone().json(); } catch { /* non-JSON response */ }
    calls.push(record);
    return res;
  };
}

/** Flush the floating promises (loadWelcomeBack/loadSuggestions) of createSession. */
async function settleHttp(): Promise<void> {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 10));
}

interface SpaHandle {
  createSession: (projectPath: string, isDemoMode: boolean, repoInfo?: unknown) => Promise<void>;
  loadWelcomeBack: (projectId: string) => Promise<void>;
  submitQuestion: () => Promise<void>;
  resetToStart: () => void;
  doc: FakeDocument;
  /** The real window object the script ran against (holds _clearProgress). */
  win: { scrollTo: () => void } & Record<string, unknown>;
  spaHtml: string;
}

/**
 * Mirror the STATIC initial state of the Welcome Back panel markup
 * (mvp-ui/index.html lines 431-491): the real DOM loads these elements
 * with class="hidden"; the fake DOM creates elements on demand, so the
 * initial visibility contract is applied here — exactly as served.
 */
function applyStaticWelcomeBackState(doc: FakeDocument): void {
  const initiallyHidden = [
    'welcome-back-panel', 'wb-new-activity', 'wb-error', 'wb-empty', 'wb-content',
    'wb-activity-section', 'wb-previous-work-section', 'wb-insights-section',
    'wb-decisions-section', 'wb-continue-section',
  ];
  for (const id of initiallyHidden) doc.getElementById(id).classList.add('hidden');
  // error-box (global) and screen-question start hidden per the static markup;
  // screen-question starts VISIBLE only after createSession → showScreen.
  doc.getElementById('error-box').classList.add('hidden');
}

/** Extract and evaluate the REAL inline SPA script from mvp-ui/index.html. */
function loadSpa(fetchFn: SpaFetch, storage: FakeLocalStorage): SpaHandle {
  const html = readFileSync(join(REPO_ROOT, 'mvp-ui', 'index.html'), 'utf-8');
  const scriptStart = html.indexOf('<script>');
  const scriptEnd = html.lastIndexOf('</script>');
  if (scriptStart < 0 || scriptEnd <= scriptStart) {
    throw new Error('Inline SPA script not found in mvp-ui/index.html');
  }
  const scriptSrc = html.slice(scriptStart + '<script>'.length, scriptEnd);

  const doc = new FakeDocument();
  const win: { scrollTo: () => void } & Record<string, unknown> = { scrollTo: () => undefined };

  const factory = new Function(
    'document', 'window', 'localStorage', 'fetch',
    scriptSrc +
    '\n;return { createSession, loadWelcomeBack, renderWelcomeBack, submitQuestion, resetToStart };',
  ) as unknown as (
    d: FakeDocument, w: typeof win, l: FakeLocalStorage, f: SpaFetch,
  ) => Omit<SpaHandle, 'doc' | 'win' | 'spaHtml'>;

  applyStaticWelcomeBackState(doc);
  const api = factory(doc, win, storage, fetchFn);
  return { ...api, doc, win, spaHtml: html };
}

// ═══════════════════════════════════════════════════════════════════
// LAYER-1 HARNESS — real adapter + real services, stubbed engine
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

interface EngineBox {
  current: ArchitectureAnswerResponse;
  fail?: boolean;
}

function createStubEngine(box: EngineBox): ExecutionEngine {
  return {
    execute: vi.fn(async () => {
      if (box.fail) throw new Error('Simulated engine failure');
      return box.current;
    }),
  } as unknown as ExecutionEngine;
}

interface HarnessA {
  adapter: HttpAdapter;
  port: number;
  projectDataDir: string;
  repoDir: string;
  projectService: ProjectService;
  insightService: InsightService;
  responseBox: EngineBox;
}

async function setupHarness(): Promise<HarnessA> {
  const tmp = makeTmpDir();
  const projectDataDir = join(tmp, 'ais-data', 'projects');
  const repoDir = join(tmp, 'repo');
  mkdirSync(repoDir, { recursive: true });

  const responseBox: EngineBox = { current: makeEngineResponse() };

  const store = new ProjectStore(projectDataDir);
  const projectService = new ProjectService(store);
  const insightService = new InsightService(store);
  const sessionRuntime = new SessionRuntime();
  const evidenceLoop = new EvidenceLoopService({ sessionRuntime });
  const interactionService = new InteractionService({
    evidenceLoop,
    engine: createStubEngine(responseBox),
  });
  const pathSecurity = new PathSecurityService({
    allowedRoots: [tmp],
    // The REAL demo path stays in the allowlist so the demo continuation
    // ([Ask: …] suggestions) can flow through the EXISTING validation.
    demoAllowlist: [tmp, DEMO_PROJECT_PATH],
  });

  const spaPath = join(tmp, 'index.html');
  writeFileSync(spaPath, '<html><body>continue-test</body></html>');

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
  return { adapter, port: adapter.actualPort, projectDataDir, repoDir, projectService, insightService, responseBox };
}

async function httpJson<T>(
  port: number,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; json: T }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: (await res.json()) as T };
}

function readSingleProjectFile(projectDataDir: string): Project {
  const files = readdirSync(projectDataDir).filter(f => f.endsWith('.json'));
  expect(files.length).toBe(1);
  return JSON.parse(readFileSync(join(projectDataDir, files[0]), 'utf-8')) as Project;
}

// ═══════════════════════════════════════════════════════════════════
// SEED HELPERS (setup only — the path under test is the UI continue flow)
// ═══════════════════════════════════════════════════════════════════

async function seedQuestion(
  port: number,
  projectPath: string,
  question: string,
  isDemo: boolean,
): Promise<{ interactionSessionId: string; responseId: string; projectId: string }> {
  const s = await httpJson<{ sessionId: string; projectId?: string }>(port, 'POST', '/api/session', { projectPath, isDemo });
  expect(s.status).toBe(201);
  const q = await httpJson<{ responseId: string }>(port, 'POST', `/api/session/${s.json.sessionId}/question`, { question });
  expect(q.status).toBe(200);
  return { interactionSessionId: s.json.sessionId, responseId: q.json.responseId, projectId: s.json.projectId as string };
}

async function seedFeedback(
  port: number,
  interactionSessionId: string,
  verdict: 'correct' | 'incorrect' | 'incomplete',
  comment: string,
): Promise<void> {
  const res = await httpJson<{ verdict: string }>(port, 'POST', `/api/session/${interactionSessionId}/feedback`, { verdict, comment });
  expect(res.status).toBe(200);
}

/** Legit FSM path to DEFERRED: NEW → EVALUATING → ACTIVE → DEFERRED (same as S-4/S-7). */
function seedDeferredInsight(
  h: HarnessA,
  projectId: string,
  text: string,
  revisitCondition?: string,
): string {
  const insight = h.insightService.createInsight({ projectId, text });
  h.insightService.evaluateInsight({
    projectId,
    insightId: insight.id,
    relevance: 0.8,
    feasibility: 0.7,
    goalAlignment: GoalAlignment.NOT_APPLICABLE,
    rationale: 'continue-test seed evaluation',
  });
  h.insightService.decideInsight({ projectId, insightId: insight.id, decision: 'IMPLEMENT_NOW' });
  h.insightService.decideInsight({ projectId, insightId: insight.id, decision: 'DEFER', revisitCondition });
  return insight.id;
}

/** Field-by-field equality of a restored ContinuitySessionView vs persisted truth. */
function expectRestoredEqualsPersisted(
  restored: ProjectContinuityView['sessions'][number] | undefined,
  persisted: PersistedSession | undefined,
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

// ═══════════════════════════════════════════════════════════════════
// LAYER 1 — S-6.1..S-6.5: the REAL UI continue path over REAL HTTP
// ═══════════════════════════════════════════════════════════════════

interface CtxA {
  h: HarnessA | null;
  spa: SpaHandle | null;
  calls: RecordedCall[];
  projectId: string;
  r1: string;
  r2: string;
  insightId: string;
  diskBefore: Project | null;
  continuityBefore: ProjectContinuityView | null;
  suggestion: string;
  continueInteractionSessionId: string;
  r3: string;
}

describe('S-6 Continue — UI continuation completes through the EXISTING question flow', () => {
  const ctxA: CtxA = {
    h: null, spa: null, calls: [], projectId: '', r1: '', r2: '', insightId: '',
    diskBefore: null, continuityBefore: null, suggestion: '', continueInteractionSessionId: '', r3: '',
  };

  afterAll(async () => {
    if (ctxA.h) await ctxA.h.adapter.stop();
  }, 30_000);

  it('T6.1 — Welcome Back (restored project) renders the REAL continuation points ([Ask: …] + [Revisit: …])', async () => {
    const h = await setupHarness();
    ctxA.h = h;

    // ── Seed the project the user "left yesterday" (setup, existing APIs) ──
    const q1 = await seedQuestion(h.port, DEMO_PROJECT_PATH, QUESTION_1, true);
    await seedFeedback(h.port, q1.interactionSessionId, 'correct', FEEDBACK_COMMENT);
    const q2 = await seedQuestion(h.port, DEMO_PROJECT_PATH, QUESTION_2, true);
    ctxA.projectId = q1.projectId;
    ctxA.r1 = q1.responseId;
    ctxA.r2 = q2.responseId;
    expect(q2.projectId).toBe(ctxA.projectId); // seeding stayed on one project

    ctxA.insightId = seedDeferredInsight(h, ctxA.projectId, INSIGHT_TEXT, REVISIT_CONDITION);
    h.insightService.updateStatus({
      projectId: ctxA.projectId,
      insightId: ctxA.insightId,
      newStatus: InsightStatus.REVISITABLE,
      detail: 'context changed',
    });

    // Snapshot the durable truth BEFORE the continue action (S-6.4 baseline).
    ctxA.diskBefore = readSingleProjectFile(h.projectDataDir);
    expect(ctxA.diskBefore.sessions.length).toBe(2);
    expect(ctxA.diskBefore.insights.length).toBe(1);

    const contBefore = await httpJson<ProjectContinuityView>(h.port, 'GET', `/api/project/${ctxA.projectId}/continuity`);
    expect(contBefore.status).toBe(200);
    ctxA.continuityBefore = contBefore.json;

    // ── The REAL user path begins: open the (restored) project in the UI ──
    ctxA.calls = [];
    ctxA.spa = loadSpa(makeRealFetch(h.port, ctxA.calls), new FakeLocalStorage());
    await ctxA.spa.createSession(DEMO_PROJECT_PATH, true);
    await settleHttp();

    const doc = ctxA.spa.doc;
    // The Welcome Back panel rendered from the REAL continuity endpoint.
    expect(doc.getElementById('welcome-back-panel').classList.contains('hidden')).toBe(false);
    expect(doc.getElementById('wb-content').classList.contains('hidden')).toBe(false);
    expect(doc.getElementById('wb-empty').classList.contains('hidden')).toBe(true);

    // Restored context is visible — the user does NOT re-enter known info.
    const prevWork = doc.getElementById('wb-previous-work');
    expect(prevWork.childElementCount).toBe(2);
    expect(prevWork.textContent).toContain(QUESTION_1);
    expect(prevWork.textContent).toContain(QUESTION_2);
    // The persisted feedback badge is rendered through an assigned innerHTML,
    // so it is asserted on the serialized subtree (like a real DOM would show it).
    expect(prevWork.innerHTML).toContain('badge-green');
    expect(prevWork.innerHTML).toContain('correct');

    // Data-source invariant: the ONLY project-state request is GET continuity.
    const stateUrls = ctxA.calls.map(c => c.url).filter(u => u.includes('/api/project/'));
    expect(stateUrls).toEqual([`/api/project/${ctxA.projectId}/continuity`]);

    // ── T6.1: continuation exists and mirrors the REAL endpoint data ──
    expect(doc.getElementById('wb-continue-section').classList.contains('hidden')).toBe(false);
    const buttons = doc.getElementById('wb-continue').children;
    const revisitBtns = buttons.filter(b => b.textContent.startsWith('Revisit: '));
    const askBtns = buttons.filter(b => b.textContent.startsWith('Ask: '));

    // [Revisit: …] from the persisted REVISITABLE insight — nothing invented.
    expect(revisitBtns.length).toBe(1);
    expect(revisitBtns[0].textContent).toBe('Revisit: ' + INSIGHT_TEXT);
    // [Ask: …] from the existing demo suggested-questions mechanism.
    expect(askBtns.length).toBe(DEMO_QUESTIONS.length);
    expect(askBtns.map(b => b.textContent.slice('Ask: '.length))).toEqual([...DEMO_QUESTIONS]);

    // Render > Recompute: rendered buttons === endpoint continuation payload.
    expect(ctxA.continuityBefore!.continuation.suggestedQuestions).toEqual([...DEMO_QUESTIONS]);
    expect(ctxA.continuityBefore!.continuation.revisitableInsights[0].text).toBe(INSIGHT_TEXT);
  }, 60_000);

  it('T6.2 + T6.3 — clicking [Ask: …] populates the EXISTING #question-input; submission uses the EXISTING submit flow', async () => {
    const spa = ctxA.spa!;
    const calls = ctxA.calls;

    // Pick the suggestion that was NOT asked before (deterministic demo question).
    const askBtn = ctxA.spa!.doc.getElementById('wb-continue').children
      .find(b => b.textContent === 'Ask: ' + CONTINUE_SUGGESTION);
    expect(askBtn).toBeDefined();

    const callsBeforeClick = calls.length;
    askBtn!.onclick!(); // the ONE user action (task §2: one action to continue)

    // T6.2: the EXISTING question input received the suggestion text.
    const input = spa.doc.getElementById('question-input');
    expect(input.value).toBe(CONTINUE_SUGGESTION);
    // The click itself issues NO request (read-only continuation, §17 of S-5).
    expect(calls.length).toBe(callsBeforeClick);

    // T6.3: the user submits through the EXISTING SPA submit flow —
    // no new endpoint, no new handler, the regular "Ask" button path.
    await spa.submitQuestion();

    const questionPosts = calls.filter(
      c => c.method === 'POST' && /\/api\/session\/[^/]+\/question$/.test(c.url),
    );
    expect(questionPosts.length).toBe(1);
    expect(questionPosts[0].status).toBe(200);
    expect(JSON.parse(questionPosts[0].body as string)).toEqual({ question: CONTINUE_SUGGESTION });

    ctxA.suggestion = CONTINUE_SUGGESTION;
    ctxA.r3 = (questionPosts[0].json as { responseId: string }).responseId;

    // The interaction session created by the UI's own createSession (T6.5).
    const sessionPosts = calls.filter(c => c.method === 'POST' && c.url === '/api/session');
    expect(sessionPosts.length).toBe(1);
    ctxA.continueInteractionSessionId = (sessionPosts[0].json as { sessionId: string }).sessionId;
    expect(ctxA.continueInteractionSessionId).toBeTruthy();
  }, 60_000);

  it('T6.4 + T6.5 + T6.6 — new responseId, new session, SAME projectId', async () => {
    const h = ctxA.h!;
    expect(ctxA.r3).toBeTruthy();
    // T6.4: a NEW responseId — no reuse of any previous one.
    expect([ctxA.r1, ctxA.r2]).not.toContain(ctxA.r3);

    // Continuity via REAL HTTP after the continue action.
    const res = await httpJson<ProjectContinuityView>(h.port, 'GET', `/api/project/${ctxA.projectId}/continuity`);
    expect(res.status).toBe(200);
    const view = res.json;

    // T6.6: SAME project identity (projectId(before) === projectId(after)).
    expect(view.project.id).toBe(ctxA.continuityBefore!.project.id);
    expect(view.project.id).toBe(ctxA.projectId);
    // S-6.5: projectPath invariant (canonical continuity model carries path).
    expect(view.project.path).toBe(ctxA.continuityBefore!.project.path);
    expect(view.project.path).toBe(DEMO_PROJECT_PATH);

    // T6.5: a NEW session record was created (new persisted session).
    expect(view.sessions.length).toBe(3);
    expect(view.sessions[0].responseId).toBe(ctxA.r3); // newest-first append
    expect(view.sessions[0].interactionSessionId).toBe(ctxA.continueInteractionSessionId);
    expect(view.sessions[0].question).toBe(ctxA.suggestion);
    expect(view.sessions[0].claims.length).toBeGreaterThan(0);
    expect(view.sessions[0].sources.length).toBeGreaterThan(0);

    // The new Q&A really went through the answer/evidence path.
    const disk = readSingleProjectFile(h.projectDataDir);
    expect(disk.sessions.length).toBe(3);
    const appended = disk.sessions.find(s => s.sessionId === ctxA.r3);
    expect(appended).toBeDefined();
    expect(appended!.interactionSessionId).toBe(ctxA.continueInteractionSessionId);
    expect(appended!.projectPath).toBe(DEMO_PROJECT_PATH);
  }, 60_000);

  it('T6.7 + T6.8 + T6.9 + T6.10 — previous Q&A, evidence, feedback and insight are preserved', async () => {
    const h = ctxA.h!;
    const res = await httpJson<ProjectContinuityView>(h.port, 'GET', `/api/project/${ctxA.projectId}/continuity`);
    const view = res.json;
    const diskNow = readSingleProjectFile(h.projectDataDir);
    const byIdNow = new Map(diskNow.sessions.map(s => [s.sessionId, s]));

    // T6.7: Q1 and Q2 still exist, field-exact vs the pre-continue disk truth.
    const restored1 = view.sessions.find(s => s.responseId === ctxA.r1);
    const restored2 = view.sessions.find(s => s.responseId === ctxA.r2);
    expectRestoredEqualsPersisted(restored1, ctxA.diskBefore!.sessions.find(s => s.sessionId === ctxA.r1));
    expectRestoredEqualsPersisted(restored2, ctxA.diskBefore!.sessions.find(s => s.sessionId === ctxA.r2));

    // T6.8: evidence preserved (claims + sources of the old records untouched).
    expect(byIdNow.get(ctxA.r1)!.claims).toEqual(ctxA.diskBefore!.sessions.find(s => s.sessionId === ctxA.r1)!.claims);
    expect(byIdNow.get(ctxA.r1)!.sources).toEqual(ctxA.diskBefore!.sessions.find(s => s.sessionId === ctxA.r1)!.sources);
    expect(byIdNow.get(ctxA.r2)!.sources).toEqual(ctxA.diskBefore!.sessions.find(s => s.sessionId === ctxA.r2)!.sources);

    // T6.9: feedback preserved — still on r1, verdict/comment unchanged, not reassigned.
    expect(byIdNow.get(ctxA.r1)!.feedback).toEqual(ctxA.diskBefore!.sessions.find(s => s.sessionId === ctxA.r1)!.feedback);
    expect(byIdNow.get(ctxA.r1)!.feedback!.verdict).toBe('correct');
    expect(byIdNow.get(ctxA.r1)!.feedback!.comment).toBe(FEEDBACK_COMMENT);
    expect(byIdNow.get(ctxA.r2)!.feedback).toBeUndefined();
    expect(byIdNow.get(ctxA.r3)!.feedback).toBeUndefined(); // no feedback leakage to the new record

    // T6.10: insight preserved — same id, status, decision, revisit condition.
    const insight = view.insights.find(i => i.id === ctxA.insightId);
    expect(insight).toBeDefined();
    expect(insight!.status).toBe(InsightStatus.REVISITABLE);
    expect(insight!.userDecision).toBe('DEFER');
    expect(insight!.revisitCondition).toBe(REVISIT_CONDITION);
    expect(view.decisions).toEqual([
      { insightId: ctxA.insightId, decision: 'DEFER', timestamp: expect.any(String) },
    ]);
    expect(view.unresolved.map(u => u.insightId)).toContain(ctxA.insightId);
    expect(diskNow.insights.length).toBe(1); // untouched by the continue append
  }, 60_000);

  it('T6.11 + T6.12 — persisted JSON is append-only; no duplicate old session (§17)', async () => {
    const h = ctxA.h!;
    const diskNow = readSingleProjectFile(h.projectDataDir);

    // T6.11: sessions.length += 1 — the new Q&A APPENDED to the same aggregate.
    expect(diskNow.sessions.length).toBe(ctxA.diskBefore!.sessions.length + 1);
    expect(diskNow.id).toBe(ctxA.diskBefore!.id);

    // Old records unchanged in the FILE (not just the UI): order + content.
    expect(diskNow.sessions.slice(0, 2)).toEqual(ctxA.diskBefore!.sessions);

    // T6.12: no duplicate old session — every responseId appears exactly once.
    const ids = diskNow.sessions.map(s => s.sessionId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => id === ctxA.r1).length).toBe(1);
    expect(ids.filter(id => id === ctxA.r2).length).toBe(1);
    expect(ids).toContain(ctxA.r3);
    // The old interaction sessions were not duplicated either.
    const interactionIds = diskNow.sessions.map(s => s.interactionSessionId);
    expect(interactionIds).not.toContain(ctxA.continueInteractionSessionId + '-dup');
    expect(new Set(interactionIds.filter(Boolean)).size).toBe(interactionIds.filter(Boolean).length);
  }, 60_000);
});

// ═══════════════════════════════════════════════════════════════════
// [Revisit: …] continuation — insight-based continuation points
// ═══════════════════════════════════════════════════════════════════

describe('S-6 — [Revisit: …] continuation uses the same existing question flow', () => {
  let h: HarnessA;
  let spa: SpaHandle;
  let calls: RecordedCall[] = [];
  let projectId = '';
  let q1ResponseId = '';
  let insightId = '';
  let r2 = '';

  afterAll(async () => {
    if (h) await h.adapter.stop();
  }, 30_000);

  it('clicks [Revisit: …], the input is populated and the existing flow appends Q2 to the SAME project', async () => {
    h = await setupHarness();
    const q1 = await seedQuestion(h.port, h.repoDir, 'What does this repository do?', false);
    projectId = q1.projectId;
    q1ResponseId = q1.responseId;
    insightId = seedDeferredInsight(h, projectId, INSIGHT_TEXT, REVISIT_CONDITION);
    h.insightService.updateStatus({ projectId, insightId, newStatus: InsightStatus.REVISITABLE, detail: 'context changed' });

    calls = [];
    spa = loadSpa(makeRealFetch(h.port, calls), new FakeLocalStorage());
    await spa.createSession(h.repoDir, false); // NON-demo → no [Ask: …] continuation
    await settleHttp();

    const doc = spa.doc;
    expect(doc.getElementById('welcome-back-panel').classList.contains('hidden')).toBe(false);
    const buttons = doc.getElementById('wb-continue').children;
    const revisitBtns = buttons.filter(b => b.textContent.startsWith('Revisit: '));
    const askBtns = buttons.filter(b => b.textContent.startsWith('Ask: '));
    expect(revisitBtns.length).toBe(1);
    expect(askBtns.length).toBe(0); // non-demo project: no suggested questions, nothing fabricated

    revisitBtns[0].onclick!();
    const input = doc.getElementById('question-input');
    expect(input.value).toBe(INSIGHT_TEXT);

    await spa.submitQuestion();
    const questionPosts = calls.filter(
      c => c.method === 'POST' && /\/api\/session\/[^/]+\/question$/.test(c.url),
    );
    expect(questionPosts.length).toBe(1);
    expect(questionPosts[0].status).toBe(200);
    expect(JSON.parse(questionPosts[0].body as string)).toEqual({ question: INSIGHT_TEXT });
    r2 = (questionPosts[0].json as { responseId: string }).responseId;
    expect([q1ResponseId]).not.toContain(r2);

    // Same project, append-only, previous record preserved.
    const disk = readSingleProjectFile(h.projectDataDir);
    expect(disk.id).toBe(projectId);
    expect(disk.sessions.length).toBe(2);
    expect(disk.sessions[0]).toEqual(JSON.parse(JSON.stringify(disk.sessions[0]))); // shape sanity
    expect(disk.sessions.map(s => s.sessionId)).toEqual([q1ResponseId, r2]); // append order
    expect(disk.sessions[0].question).toBe('What does this repository do?');
    expect(disk.insights.length).toBe(1);
    expect(disk.insights[0].status).toBe(InsightStatus.REVISITABLE);

    const cont = await httpJson<ProjectContinuityView>(h.port, 'GET', `/api/project/${projectId}/continuity`);
    expect(cont.json.project.id).toBe(projectId);
    expect(cont.json.sessions.length).toBe(2);
    expect(cont.json.sessions[0].responseId).toBe(r2);
  }, 60_000);
});

// ═══════════════════════════════════════════════════════════════════
// §15 EMPTY PROJECT — Welcome without fabricated history
// ═══════════════════════════════════════════════════════════════════

describe('S-6 §15 — empty project: no fabricated continuation, normal question flow', () => {
  let h: HarnessA;
  let spa: SpaHandle;
  let calls: RecordedCall[] = [];
  let projectId = '';

  afterAll(async () => {
    if (h) await h.adapter.stop();
  }, 30_000);

  it('shows the one-line welcome, renders no continuation buttons, and the normal flow appends Q1', async () => {
    h = await setupHarness();
    calls = [];
    spa = loadSpa(makeRealFetch(h.port, calls), new FakeLocalStorage());
    await spa.createSession(h.repoDir, false); // brand-new project: no history at all
    await settleHttp();

    const doc = spa.doc;
    const sessionPost = calls.find(c => c.method === 'POST' && c.url === '/api/session');
    projectId = (sessionPost!.json as { projectId?: string }).projectId as string;
    expect(projectId).toBeTruthy();

    // §22: one-line welcome — content hidden, empty state visible.
    expect(doc.getElementById('welcome-back-panel').classList.contains('hidden')).toBe(false);
    expect(doc.getElementById('wb-content').classList.contains('hidden')).toBe(true);
    expect(doc.getElementById('wb-empty').classList.contains('hidden')).toBe(false);
    // The static one-line welcome lives in the served HTML.
    expect(spa.spaHtml).toContain("This project doesn't have previous activity yet.");
    // No fabricated continuation points and no fabricated previous work.
    expect(doc.getElementById('wb-continue').childElementCount).toBe(0);
    expect(doc.getElementById('wb-previous-work-section').classList.contains('hidden')).toBe(true);

    // The normal question flow still works for the empty project.
    doc.getElementById('question-input').value = 'First question about this project.';
    await spa.submitQuestion();

    const disk = readSingleProjectFile(h.projectDataDir);
    expect(disk.id).toBe(projectId);
    expect(disk.sessions.length).toBe(1);
    expect(disk.sessions[0].question).toBe('First question about this project.');

    const cont = await httpJson<ProjectContinuityView>(h.port, 'GET', `/api/project/${projectId}/continuity`);
    expect(cont.status).toBe(200);
    expect(cont.json.sessions.length).toBe(1);
  }, 60_000);
});

// ═══════════════════════════════════════════════════════════════════
// §16 FAILURE BEHAVIOR — no fabrication, old state untouched
// ═══════════════════════════════════════════════════════════════════

describe('S-6 §16 — failure behavior', () => {
  it('Continuity 404 — existing "Project not found" handling, no fallback reconstruction', async () => {
    const h = await setupHarness();
    try {
      const calls: RecordedCall[] = [];
      const spa = loadSpa(makeRealFetch(h.port, calls), new FakeLocalStorage());

      // HTTP contract: unknown project → deterministic 404, never auto-creation.
      const res = await httpJson<{ error: string }>(h.port, 'GET', '/api/project/no-such-project/continuity');
      expect(res.status).toBe(404);
      expect(res.json.error).toBe('Project not found');
      expect(readdirSync(h.projectDataDir).filter(f => f.endsWith('.json')).length).toBe(0);

      // UI: the existing project-not-found handling, no substitute rendering.
      await spa.loadWelcomeBack('no-such-project');
      await settleHttp();
      expect(spa.doc.getElementById('error-box').textContent).toBe('Project not found');
      expect(spa.doc.getElementById('welcome-back-panel').classList.contains('hidden')).toBe(true);
      // No fallback reconstruction: the 404 GET was the ONLY project-state
      // request (the script-load /api/demos call is not project state).
      expect(calls.map(c => c.url).filter(u => u.includes('/api/project/')))
        .toEqual(['/api/project/no-such-project/continuity']);
    } finally {
      await h.adapter.stop();
    }
  }, 60_000);

  it('New question failure — the old persisted state remains unchanged', async () => {
    const h = await setupHarness();
    try {
      const q1 = await seedQuestion(h.port, h.repoDir, 'Question before the failure.', false);
      const diskBefore = readSingleProjectFile(h.projectDataDir);
      expect(diskBefore.sessions.length).toBe(1);

      const calls: RecordedCall[] = [];
      const spa = loadSpa(makeRealFetch(h.port, calls), new FakeLocalStorage());
      await spa.createSession(h.repoDir, false);
      await settleHttp();

      // The continue question fails (engine failure → 502).
      h.responseBox.fail = true;
      spa.doc.getElementById('question-input').value = 'This question will fail.';
      await spa.submitQuestion();

      const questionPosts = calls.filter(
        c => c.method === 'POST' && /\/api\/session\/[^/]+\/question$/.test(c.url),
      );
      expect(questionPosts.length).toBe(1);
      expect(questionPosts[0].status).toBe(502);

      // The UI surfaced the existing mapped error and returned to the question screen.
      expect(spa.doc.getElementById('error-box').textContent).toBe('AIS processing failed. Please try again.');
      expect(spa.doc.getElementById('screen-question').classList.contains('hidden')).toBe(false);
      expect(spa.doc.getElementById('btn-ask').disabled).toBe(false); // user can retry
      spa.win._clearProgress = (spa.win._clearProgress as (() => void) | undefined)?.bind(spa.win);
      (spa.win._clearProgress as (() => void) | undefined)?.(); // stop the progress interval (failure path)

      // The failed continue must NOT mutate the durable state (§16).
      const diskAfter = readSingleProjectFile(h.projectDataDir);
      expect(diskAfter).toEqual(diskBefore);
      expect(diskAfter.sessions.length).toBe(1);
      expect(diskAfter.sessions[0].sessionId).toBe(q1.responseId);

      const cont = await httpJson<ProjectContinuityView>(h.port, 'GET', `/api/project/${q1.projectId}/continuity`);
      expect(cont.json.sessions.length).toBe(1);
    } finally {
      h.responseBox.fail = false;
      await h.adapter.stop();
    }
  }, 60_000);
});

// ═══════════════════════════════════════════════════════════════════
// LAYER 2 — S-6.6 / S-6.7 / T6.13 / T6.14:
// Continue after a REAL process restart (S-7 scenario + UI continue step)
// ═══════════════════════════════════════════════════════════════════

const DIST_ENTRY = join(REPO_ROOT, 'dist', 'mvp-ui', 'index.js');

const mockAnswerFor = (question: string): string => `Mock deterministic answer for: ${question}`;

interface MockCompletionRequest {
  path: string;
  auth: string | undefined;
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
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
              messages?: Array<{ role?: string; content?: unknown }>;
            };
            const messages = Array.isArray(body.messages) ? body.messages : [];
            const lastUser = [...messages].reverse().find((m) => m.role === 'user');
            question = String(lastUser?.content ?? '').split('\n')[0].slice(0, 300);
          } catch {
            question = '';
          }
          mockRequests.push({ path: url, auth: req.headers.authorization, question });
          const bodyOut = JSON.stringify({
            id: 'chatcmpl-mock-' + createHash('sha256').update(question).digest('hex').slice(0, 12),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'gpt-4o',
            choices: [
              { index: 0, message: { role: 'assistant', content: mockAnswerFor(question) }, finish_reason: 'stop' },
            ],
            usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(bodyOut);
          return;
        }
        // Hermetic catch-all: unexpected endpoints must be visible, not guessed.
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
    throw new Error(`dist/mvp-ui/index.js not found — run \`npm run build\` first (acceptance gate).`);
  }
  const port = await getFreePort();
  const child = spawn(process.execPath, [DIST_ENTRY], {
    cwd, // cwd-relative .ais-data → storage isolated in the temp dir
    env: {
      ...process.env,
      MVP_UI_PORT: String(port),
      AIS_EXECUTION_REAL: 'true',
      AIS_REAL_LLM: 'true',
      OPENAI_API_KEY: 'test-key', // test credential only
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
      res(code ?? (signalName ? 0 : -1));
    });
    child.kill(signal);
  });
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

interface CtxB {
  tempDir: string;
  pidA: number;
  pidB: number;
  pidC: number;
  procB: AisProcess | null;
  projectId: string;
  r1: string;
  r2: string;
  r3: string;
  insightId: string;
  diskBeforeKill: Project | null;
}

describe('S-6.6/S-6.7 — Continue after REAL process restart (T6.13 + T6.14)', () => {
  const ctxB: CtxB = {
    tempDir: '', pidA: 0, pidB: 0, pidC: 0, procB: null, projectId: '',
    r1: '', r2: '', r3: '', insightId: '', diskBeforeKill: null,
  };

  afterAll(async () => {
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
    if (ctxB.tempDir) rmSync(ctxB.tempDir, { recursive: true, force: true });
  }, 60_000);

  it('T6.13 — Process A seeds → SIGTERM → Process B: the REAL UI continue path appends Q3 to the SAME project', async () => {
    // ── Isolated environment: cwd-relative storage inside a temp dir ──
    ctxB.tempDir = mkdtempSync(join(tmpdir(), 'ais-continue-acceptance-'));
    expect(existsSync(join(ctxB.tempDir, '.ais-data'))).toBe(false); // D-02

    await startMockOpenAI();
    expect(mockPort).toBeGreaterThan(0);

    // ── Process A: existing project state through the EXISTING HTTP API ──
    const procA = await startAisProcess(ctxB.tempDir, 'A');
    ctxB.pidA = procA.pid;

    const s1 = await httpJson<SessionStartResponse>(procA.port, 'POST', '/api/session', { projectPath: DEMO_PROJECT_PATH, isDemo: true });
    expect(s1.status).toBe(201);
    ctxB.projectId = s1.json.projectId as string;

    const q1 = await httpJson<AnswerResponse>(procA.port, 'POST', `/api/session/${s1.json.sessionId}/question`, { question: QUESTION_1 });
    expect(q1.status).toBe(200);
    ctxB.r1 = q1.json.responseId;
    expect(q1.json.content).toBe(mockAnswerFor(QUESTION_1));

    const s2 = await httpJson<SessionStartResponse>(procA.port, 'POST', '/api/session', { projectPath: DEMO_PROJECT_PATH, isDemo: true });
    expect(s2.status).toBe(201);
    expect(s2.json.projectId).toBe(ctxB.projectId);
    const q2 = await httpJson<AnswerResponse>(procA.port, 'POST', `/api/session/${s2.json.sessionId}/question`, { question: QUESTION_2 });
    expect(q2.status).toBe(200);
    ctxB.r2 = q2.json.responseId;
    expect([ctxB.r1]).not.toContain(ctxB.r2);

    const fb = await httpJson<{ verdict: string }>(procA.port, 'POST', `/api/session/${s1.json.sessionId}/feedback`, {
      verdict: 'correct', comment: FEEDBACK_COMMENT,
    });
    expect(fb.status).toBe(200);

    // Insight lifecycle via the EXISTING HTTP API (NEW→EVALUATING→ACTIVE→DEFERRED).
    const created = await httpJson<{ id: string; status: string }>(procA.port, 'POST', `/api/project/${ctxB.projectId}/insights`, { text: INSIGHT_TEXT });
    expect(created.status).toBe(201);
    ctxB.insightId = created.json.id;
    await httpJson(procA.port, 'POST', `/api/project/${ctxB.projectId}/insights/${ctxB.insightId}/evaluate`, {
      relevance: 0.9, feasibility: 0.8, goalAlignment: 'NOT_APPLICABLE', rationale: 'before restart',
    });
    await httpJson(procA.port, 'POST', `/api/project/${ctxB.projectId}/insights/${ctxB.insightId}/decide`, { decision: 'IMPLEMENT_NOW' });
    const deferred = await httpJson<{ status: string; revisitCondition?: string }>(procA.port, 'POST', `/api/project/${ctxB.projectId}/insights/${ctxB.insightId}/decide`, {
      decision: 'DEFER', revisitCondition: REVISIT_CONDITION,
    });
    expect(deferred.json.status).toBe('DEFERRED');
    expect(deferred.json.revisitCondition).toBe(REVISIT_CONDITION);

    // Write-through proof BEFORE termination (D-03).
    const file = join(ctxB.tempDir, '.ais-data', 'projects', `${ctxB.projectId}.json`);
    expect(existsSync(file)).toBe(true);
    const diskA = JSON.parse(readFileSync(file, 'utf-8')) as Project;
    expect(diskA.sessions.length).toBe(2);
    expect(diskA.insights[0].status).toBe('DEFERRED');
    expect(diskA.sessions.find(s => s.sessionId === ctxB.r1)!.feedback).toBeDefined();

    // ── SIGTERM: Process A dies gracefully ──
    expect(await terminate(procA.child, 'SIGTERM')).toBe(0);
    expect(existsSync(file)).toBe(true);

    // ── Process B: brand-new OS process, same storage, zero shared memory ──
    const procB = await startAisProcess(ctxB.tempDir, 'B');
    ctxB.procB = procB;
    ctxB.pidB = procB.pid;
    expect(procB.pid).not.toBe(ctxB.pidA);

    // Pre-continue truth snapshot from the RESTORED process (disk + HTTP).
    ctxB.diskBeforeKill = JSON.parse(readFileSync(file, 'utf-8')) as Project;
    const contB = await httpJson<ProjectContinuityView>(procB.port, 'GET', `/api/project/${ctxB.projectId}/continuity`);
    expect(contB.status).toBe(200);
    expect(contB.json.sessions.length).toBe(2);
    expect(contB.json.project.id).toBe(ctxB.projectId);

    // ══ THE REAL USER PATH (task §13): UI → HTTP → answer → capture → fs ══
    const calls: RecordedCall[] = [];
    const spa = loadSpa(makeRealFetch(procB.port, calls), new FakeLocalStorage());
    await spa.createSession(DEMO_PROJECT_PATH, true);
    await settleHttp();

    // Welcome Back rendered from the REAL restored continuity.
    const doc = spa.doc;
    expect(doc.getElementById('welcome-back-panel').classList.contains('hidden')).toBe(false);
    expect(doc.getElementById('wb-content').classList.contains('hidden')).toBe(false);
    expect(doc.getElementById('wb-previous-work').textContent).toContain(QUESTION_1);
    expect(doc.getElementById('wb-previous-work').textContent).toContain(QUESTION_2);

    // Continuation suggestions exist — [Ask: …] from the REAL endpoint.
    const askBtns = doc.getElementById('wb-continue').children.filter(b => b.textContent.startsWith('Ask: '));
    expect(askBtns.length).toBe(DEMO_QUESTIONS.length);
    // Cross-check Render > Recompute: the buttons carry the endpoint's payload.
    expect(askBtns.map(b => b.textContent.slice('Ask: '.length))).toEqual(contB.json.continuation.suggestedQuestions);

    // ONE user action: click the continuation suggestion (not asked before).
    const continueBtn = askBtns.find(b => b.textContent === 'Ask: ' + CONTINUE_SUGGESTION);
    expect(continueBtn).toBeDefined();
    continueBtn!.onclick!();
    const input = doc.getElementById('question-input');
    expect(input.value).toBe(CONTINUE_SUGGESTION); // no re-typing of known info

    // Submit through the EXISTING flow → REAL HTTP → hermetic LLM → capture.
    await spa.submitQuestion();

    const questionPosts = calls.filter(
      c => c.method === 'POST' && /\/api\/session\/[^/]+\/question$/.test(c.url),
    );
    expect(questionPosts.length).toBe(1);
    expect(questionPosts[0].status).toBe(200);
    expect(JSON.parse(questionPosts[0].body as string)).toEqual({ question: CONTINUE_SUGGESTION });
    ctxB.r3 = (questionPosts[0].json as { responseId: string }).responseId;
    expect(ctxB.r3).toBeTruthy();
    expect([ctxB.r1, ctxB.r2]).not.toContain(ctxB.r3); // T6.4: new responseId
    expect((questionPosts[0].json as { content: string }).content).toBe(mockAnswerFor(CONTINUE_SUGGESTION));

    // T6.6/S-6.5: same project — continuity after the continue.
    const contAfter = await httpJson<ProjectContinuityView>(procB.port, 'GET', `/api/project/${ctxB.projectId}/continuity`);
    expect(contAfter.json.project.id).toBe(ctxB.projectId);
    expect(contAfter.json.project.path).toBe(DEMO_PROJECT_PATH);
    expect(contAfter.json.sessions.length).toBe(3); // T6.11
    expect(contAfter.json.sessions[0].responseId).toBe(ctxB.r3);
    expect(contAfter.json.insights.find(i => i.id === ctxB.insightId)!.status).toBe('DEFERRED'); // T6.10

    // §17: persisted JSON proof — append-only (T6.11/T6.12), old records intact.
    const diskAfterContinue = JSON.parse(readFileSync(file, 'utf-8')) as Project;
    expect(diskAfterContinue.sessions.length).toBe(3);
    expect(diskAfterContinue.sessions.slice(0, 2)).toEqual(ctxB.diskBeforeKill!.sessions);
    const ids = diskAfterContinue.sessions.map(s => s.sessionId);
    expect(new Set(ids).size).toBe(3);
    const appended = diskAfterContinue.sessions.find(s => s.sessionId === ctxB.r3)!;
    expect(appended.question).toBe(CONTINUE_SUGGESTION);
    expect(appended.answer).toBe(mockAnswerFor(CONTINUE_SUGGESTION));
    expect(appended.claims.length).toBeGreaterThan(0);
    expect(appended.sources.length).toBeGreaterThan(0);
    expect(diskAfterContinue.insights.length).toBe(1);
    expect(diskAfterContinue.insights[0].revisitCondition).toBe(REVISIT_CONDITION);
    // Security: the hermetic credential never reaches .ais-data.
    expect(readFileSync(file, 'utf-8')).not.toContain('test-key');
  }, 300_000);

  it('T6.14 — SIGKILL Process B → Process C restores Q1/Q2/Q3 + insight + feedback (S-6.7 complete)', async () => {
    // Destroy THE Process B that performed the continue (no graceful shutdown).
    expect(ctxB.procB).not.toBeNull();
    expect(ctxB.procB!.child.exitCode).toBeNull();
    expect(await terminate(ctxB.procB!.child, 'SIGKILL')).toBe(0);

    // The continued state survived the SIGKILL (T6.14).
    const file = join(ctxB.tempDir, '.ais-data', 'projects', `${ctxB.projectId}.json`);
    expect(existsSync(file)).toBe(true);
    const onDisk = JSON.parse(readFileSync(file, 'utf-8')) as Project;
    expect(onDisk.sessions.length).toBe(3);
    expect(onDisk.sessions.map(s => s.sessionId)).toContain(ctxB.r3);
    expect(onDisk.insights[0].status).toBe('DEFERRED');

    // Process C: third OS process restores old + new Q&A (S-6.7 loop closed).
    const procC = await startAisProcess(ctxB.tempDir, 'C');
    ctxB.pidC = procC.pid;
    expect(procC.pid).not.toBe(ctxB.pidA);
    expect(procC.pid).not.toBe(ctxB.pidB);

    const res = await httpJson<ProjectContinuityView>(procC.port, 'GET', `/api/project/${ctxB.projectId}/continuity`);
    expect(res.status).toBe(200);
    const view = res.json;
    expect(view.project.id).toBe(ctxB.projectId);
    expect(view.project.path).toBe(DEMO_PROJECT_PATH);

    expect(view.sessions.length).toBe(3);
    const restored1 = view.sessions.find(s => s.responseId === ctxB.r1)!;
    const restored2 = view.sessions.find(s => s.responseId === ctxB.r2)!;
    const restored3 = view.sessions.find(s => s.responseId === ctxB.r3)!;
    // Old records field-exact vs the pre-continue disk truth (T6.7/T6.8).
    expectRestoredEqualsPersisted(restored1, ctxB.diskBeforeKill!.sessions.find(s => s.sessionId === ctxB.r1));
    expectRestoredEqualsPersisted(restored2, ctxB.diskBeforeKill!.sessions.find(s => s.sessionId === ctxB.r2));
    expect(restored1.feedback!.verdict).toBe('correct'); // T6.9
    expect(restored3.question).toBe(CONTINUE_SUGGESTION);
    expect(restored3.answer).toBe(mockAnswerFor(CONTINUE_SUGGESTION));
    expect(restored3.claims.length).toBeGreaterThan(0); // T6.8 for the new record

    // Insight + decision + revisit condition survived both destruction cycles (T6.10).
    expect(view.insights.length).toBe(1);
    expect(view.insights[0].id).toBe(ctxB.insightId);
    expect(view.insights[0].status).toBe('DEFERRED');
    expect(view.insights[0].userDecision).toBe('DEFER');
    expect(view.insights[0].revisitCondition).toBe(REVISIT_CONDITION);
    expect(view.decisions[0].decision).toBe('DEFER');

    const hist = await httpJson<{ sessions: PersistedSession[] }>(procC.port, 'GET', `/api/project/${ctxB.projectId}/history`);
    expect(hist.status).toBe(200);
    expect(hist.json.sessions.length).toBe(3);
    expect(hist.json.sessions.map(s => s.sessionId).sort()).toEqual([ctxB.r1, ctxB.r2, ctxB.r3].sort());

    // Every answer went through the hermetic real-provider path.
    expect(mockRequests.length).toBeGreaterThanOrEqual(3);
    for (const req of mockRequests) {
      expect(req.path).toContain('/chat/completions');
      expect(req.auth).toBe('Bearer test-key');
    }

    await terminate(procC.child, 'SIGTERM');
  }, 300_000);
});
