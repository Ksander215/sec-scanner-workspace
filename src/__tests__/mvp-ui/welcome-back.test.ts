/**
 * TASK-AIS-WELCOME-BACK-001 — S-5 Welcome Back UI Tests
 *
 * The SPA (mvp-ui/index.html) is a single-file vanilla-JS app served by
 * HttpAdapter. There is no DOM library in the repo (ZERO new dependencies),
 * so this suite evaluates the REAL inline script extracted from
 * mvp-ui/index.html inside a minimal deterministic DOM harness and drives
 * the ACTUAL user flow: createSession() → loadWelcomeBack(projectId) →
 * GET /api/project/:id/continuity → renderWelcomeBack().
 *
 * Covers:
 *   T5.1 — Existing project: continuity fixture → project identity, last
 *          activity, previous Q&A (+ preview/expand, sources, feedback),
 *          insights, decisions, unresolved, continuation all rendered
 *   T5.2 — Empty project: one-line welcome, no fabricated sections
 *   T5.3 — Goal null: no "Your goal is..." rendering (explicit absence)
 *   T5.4 — Continuation action: suggested question fills the EXISTING
 *          question input — no new backend request
 *   T5.5 — Revisitable insight: fills question input; NO insight lifecycle
 *          mutation, no decide/evaluate requests (read-only preserved)
 *   T5.6 — 404: existing project-not-found handling (error box), no context
 *   T5.7 — Endpoint unavailable: graceful in-panel error, no fallback
 *          reconstruction from any other source
 *   T5.8 — XSS: persisted user text is never interpreted as executable HTML
 *
 * Integrity invariants asserted throughout:
 *   - The ONLY project-state request is GET /api/project/:id/continuity
 *     (no /history, no /insights re-reads — UI never reconstructs state).
 *   - Clicking continuation buttons never issues any request.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ═══════════════════════════════════════════════════════════════
// MINIMAL DETERMINISTIC DOM HARNESS
// ═══════════════════════════════════════════════════════════════

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

/** Escape text for serialization — mirrors how a real DOM serializes text
 *  nodes inside innerHTML (textContent can never inject markup). */
function escForSerialize(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  /** Real-DOM semantics: assigned markup + serialized descendants
   *  (descendant text nodes appear escaped). */
  get innerHTML(): string {
    let out = this.inner;
    for (const child of this.children) out += child.serializeNode();
    return out;
  }
  set innerHTML(html: string) {
    // Real DOM: assigning innerHTML replaces all children.
    this.inner = String(html);
    this.children = [];
  }

  /** Real-DOM semantics: assignment replaces the subtree with one text node. */
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
    // Assigned markup goes through verbatim (this is exactly what the script
    // put into innerHTML — raw, so XSS regressions stay visible in asserts);
    // textContent becomes an escaped text node, like a real DOM would render it.
    const markup = this.inner + (this.ownText ? escForSerialize(this.ownText) : '');
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

interface FakeResponse { ok: boolean; status: number; json: () => Promise<unknown>; }
type FetchFn = (url: string, init?: { method?: string }) => Promise<FakeResponse>;

interface Route {
  match: (url: string, method: string) => boolean;
  status?: number;
  body?: unknown;
  reject?: boolean;
}

function makeFetch(routes: Route[]): { fn: FetchFn; calls: Array<{ url: string; method: string }> } {
  const calls: Array<{ url: string; method: string }> = [];
  const fn: FetchFn = (url, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ url: String(url), method });
    for (const route of routes) {
      if (route.match(String(url), method)) {
        if (route.reject) return Promise.reject(new Error('network unreachable'));
        const status = route.status ?? 200;
        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          json: () => Promise.resolve(route.body),
        });
      }
    }
    return Promise.reject(new Error('Unhandled fetch: ' + String(url)));
  };
  return { fn, calls };
}

/** Load the REAL SPA script from mvp-ui/index.html and evaluate it in the
 *  harness. Returns the SPA functions the tests drive end-to-end. */
function loadSpa(fetchFn: FetchFn, storage: FakeLocalStorage): {
  createSession: (projectPath: string, isDemoMode: boolean, repoInfo?: unknown) => Promise<void>;
  loadWelcomeBack: (projectId: string) => Promise<void>;
  renderWelcomeBack: (view: unknown) => void;
  resetToStart: () => void;
  doc: FakeDocument;
  /** The raw SPA markup — static panel texts live in the served HTML. */
  spaHtml: string;
} {
  const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');
  const html = readFileSync(join(repoRoot, 'mvp-ui', 'index.html'), 'utf-8');
  const scriptStart = html.indexOf('<script>');
  const scriptEnd = html.lastIndexOf('</script>');
  if (scriptStart < 0 || scriptEnd <= scriptStart) {
    throw new Error('Inline SPA script not found in mvp-ui/index.html');
  }
  const scriptSrc = html.slice(scriptStart + '<script>'.length, scriptEnd);

  const doc = new FakeDocument();
  const win = { scrollTo: () => undefined };

  const factory = new Function(
    'document', 'window', 'localStorage', 'fetch',
    scriptSrc +
    '\n;return { createSession, loadWelcomeBack, renderWelcomeBack, resetToStart };',
  ) as unknown as (
    d: FakeDocument, w: { scrollTo: () => void }, l: FakeLocalStorage, f: FetchFn,
  ) => {
    createSession: (projectPath: string, isDemoMode: boolean, repoInfo?: unknown) => Promise<void>;
    loadWelcomeBack: (projectId: string) => Promise<void>;
    renderWelcomeBack: (view: unknown) => void;
    resetToStart: () => void;
  };

  const api = factory(doc, win, storage, fetchFn);
  return { ...api, doc, spaHtml: html };
}

/** Flush all pending microtasks/macrotasks of the stub-fetch chains. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
}

function wbEl(doc: FakeDocument, id: string): FakeElement {
  return doc.getElementById(id);
}

// ═══════════════════════════════════════════════════════════════
// FIXTURES — mirror the real ProjectContinuityView contract
// ═══════════════════════════════════════════════════════════════

const LONG_ANSWER =
  'The discovery pipeline starts at the repository root and walks the file tree. ' +
  'It classifies files by extension and builds a module graph from import statements. ' +
  'The graph is then analyzed for cycles and layering violations, producing a report ' +
  'that the evidence loop uses to ground its answers. The pipeline is fully read-only ' +
  'and caches nothing between runs, which keeps every answer reproducible.';

function richContinuityFixture(): Record<string, unknown> {
  return {
    project: {
      id: 'p1',
      name: 'sec-scanner',
      path: '/repos/sec-scanner',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-02T12:00:00.000Z',
    },
    goal: null,
    lastActivity: {
      timestamp: '2026-09-02T12:00:00.000Z',
      type: 'qa',
      summary: 'How does the discovery pipeline work?',
    },
    sessions: [
      {
        responseId: 'resp-2',
        interactionSessionId: 'is-2',
        question: 'How does the discovery pipeline work?',
        answer: LONG_ANSWER,
        claims: [{ claimId: 'c1', statement: 'Pipeline is read-only', isVerified: true, evidenceCount: 2 }],
        sources: [
          { filePath: 'src/core/discovery/scanner.ts', type: 'file', excerpt: 'walks the tree', relevance: 0.9 },
          { filePath: 'src/core/discovery/graph.ts', type: 'file', excerpt: 'module graph', relevance: 0.8 },
          { filePath: 'src/core/evidence-loop/service.ts', type: 'file', excerpt: 'grounding', relevance: 0.7 },
          { filePath: 'src/core/engine/execution-engine.ts', type: 'file', excerpt: 'orchestration', relevance: 0.6 },
        ],
        feedback: { feedbackId: 'fb-1', verdict: 'correct' },
        findings: [],
        timestamp: '2026-09-02T12:00:00.000Z',
      },
      {
        responseId: 'resp-1',
        question: 'What is this project?',
        answer: 'It is a security scanner.',
        claims: [],
        sources: [],
        feedback: undefined,
        findings: [],
        timestamp: '2026-09-01T11:00:00.000Z',
      },
    ],
    insights: [
      {
        id: 'i1', text: 'Consider replacing X', status: 'DEFERRED',
        createdAt: '2026-09-01T15:00:00.000Z', userDecision: 'DEFER',
        decisionAt: '2026-09-01T15:30:00.000Z', revisitCondition: 'after v2 release', history: [],
      },
      {
        id: 'i2', text: 'Investigate Y', status: 'REVISITABLE',
        createdAt: '2026-09-01T14:00:00.000Z', history: [],
      },
      {
        id: 'i3', text: 'Ship the MVP slice', status: 'IMPLEMENTED',
        createdAt: '2026-09-01T13:00:00.000Z', userDecision: 'IMPLEMENT_NOW',
        decisionAt: '2026-09-02T10:00:00.000Z', history: [],
      },
    ],
    decisions: [
      { insightId: 'i3', decision: 'IMPLEMENT_NOW', timestamp: '2026-09-02T10:00:00.000Z' },
      { insightId: 'i1', decision: 'DEFER', timestamp: '2026-09-01T15:30:00.000Z' },
    ],
    unresolved: [
      { insightId: 'i1', status: 'DEFERRED', text: 'Consider replacing X', revisitCondition: 'after v2 release' },
      { insightId: 'i2', status: 'REVISITABLE', text: 'Investigate Y' },
    ],
    continuation: {
      revisitableInsights: [{ insightId: 'i2', text: 'Investigate Y' }],
      suggestedQuestions: ['How does the discovery pipeline work?'],
      lastActivity: {
        timestamp: '2026-09-02T12:00:00.000Z',
        type: 'qa',
        summary: 'How does the discovery pipeline work?',
      },
    },
  };
}

function emptyContinuityFixture(): Record<string, unknown> {
  return {
    project: {
      id: 'p2', name: 'fresh-project', path: '/repos/fresh',
      createdAt: '2026-09-03T09:00:00.000Z', updatedAt: '2026-09-03T09:00:00.000Z',
    },
    goal: null,
    lastActivity: null,
    sessions: [], insights: [], decisions: [], unresolved: [],
    continuation: { revisitableInsights: [], suggestedQuestions: [], lastActivity: null },
  };
}

/** Standard routes for the open-project flow (session start + continuity). */
function baseRoutes(continuity: Route): Route[] {
  return [
    {
      match: (u, m) => m === 'POST' && u === '/api/session',
      status: 201,
      body: { sessionId: 'sess-1', state: 'AWAITING_QUESTION', createdAt: '2026-09-03T09:00:00.000Z', projectId: 'p1' },
    },
    { match: (u) => u === '/api/demos', status: 200, body: { demos: [] } },
    continuity,
  ];
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('TASK-AIS-WELCOME-BACK-001 — S-5 Welcome Back UI', () => {

  it('T5.1 — existing project: renders identity, last activity, previous Q&A, insights, decisions, unresolved, continuation from GET continuity only', async () => {
    const { fn, calls } = makeFetch(baseRoutes({
      match: (u, m) => m === 'GET' && u === '/api/project/p1/continuity',
      status: 200,
      body: richContinuityFixture(),
    }));
    const spa = loadSpa(fn, new FakeLocalStorage());

    await spa.createSession('/repos/sec-scanner', false);
    await settle();

    // Data source invariant: the ONLY project-state request is the continuity GET.
    // No /history re-read, no /insights re-reads — the UI never reconstructs state.
    expect(calls).toContainEqual({ url: '/api/project/p1/continuity', method: 'GET' });
    for (const c of calls) {
      expect(c.url.includes('/history')).toBe(false);
      expect(c.url.includes('/insights')).toBe(false);
    }

    const panel = wbEl(spa.doc, 'welcome-back-panel');
    expect(panel.classList.contains('hidden')).toBe(false);
    expect(wbEl(spa.doc, 'wb-loading').classList.contains('hidden')).toBe(true);
    expect(wbEl(spa.doc, 'wb-empty').classList.contains('hidden')).toBe(true);
    expect(wbEl(spa.doc, 'wb-content').classList.contains('hidden')).toBe(false);

    // Project identity (§8)
    expect(wbEl(spa.doc, 'wb-project-name').textContent).toBe('sec-scanner');
    expect(wbEl(spa.doc, 'wb-project-path').textContent).toBe('/repos/sec-scanner');

    // Last activity (§9) — verbatim from the view
    expect(wbEl(spa.doc, 'wb-activity-section').classList.contains('hidden')).toBe(false);
    expect(wbEl(spa.doc, 'wb-last-activity').innerHTML).toContain('How does the discovery pipeline work?');

    // Previous work (§10/§11): latest Q&A with answer PREVIEW (not the full answer)
    expect(wbEl(spa.doc, 'wb-previous-work-section').classList.contains('hidden')).toBe(false);
    const work = wbEl(spa.doc, 'wb-previous-work');
    expect(work.children.length).toBe(2);
    const first = work.children[0];
    const answerEl = first.children.find(c => c.className === 'wb-qa-answer');
    expect(answerEl).toBeDefined();
    expect((answerEl as FakeElement).textContent).toBe(LONG_ANSWER.substring(0, 280) + '…');
    expect((answerEl as FakeElement).textContent).not.toBe(LONG_ANSWER);
    expect(first.innerHTML).toContain('Based on 4 sources:');
    expect(first.innerHTML).toContain('src/core/discovery/scanner.ts');
    expect(first.innerHTML).toContain('+1 more');
    expect(first.innerHTML).toContain('badge-green');
    expect(first.innerHTML).toContain('correct');

    // Expand toggle: reveals the full answer (pure presentation, no fetch)
    const callsBeforeExpand = calls.length;
    const toggle = first.children.find(c => c.onclick && c.textContent === 'Show full answer') as FakeElement;
    expect(toggle).toBeDefined();
    toggle.onclick?.();
    const answerAfter = wbEl(spa.doc, 'wb-previous-work').children[0]
      .children.find(c => c.className === 'wb-qa-answer') as FakeElement;
    expect(answerAfter.textContent).toBe(LONG_ANSWER);
    expect(calls.length).toBe(callsBeforeExpand); // no request issued by the toggle

    // Insights (§12): text + localized status badges, no lifecycle change
    const insightsHtml = wbEl(spa.doc, 'wb-insights').innerHTML;
    expect(insightsHtml).toContain('Consider replacing X');
    expect(insightsHtml).toContain('Investigate Y');
    expect(insightsHtml).toContain('Отложена');
    expect(insightsHtml).toContain('К пересмотру');

    // Decisions (§13): ONLY the explicit persisted decisions
    const decisionsHtml = wbEl(spa.doc, 'wb-decisions').innerHTML;
    expect(decisionsHtml).toContain('Implement now');
    expect(decisionsHtml).toContain('Deferred');
    expect(decisionsHtml).toContain('Ship the MVP slice');

    // Unresolved (§14): canonical list rendered, empty-state text absent
    const unresolvedHtml = wbEl(spa.doc, 'wb-unresolved').innerHTML;
    expect(unresolvedHtml).toContain('Consider replacing X');
    expect(unresolvedHtml).toContain('Investigate Y');
    expect(unresolvedHtml).not.toContain('Nothing currently marked as unresolved');

    // Continuation (§15): revisitable insight + suggested question buttons
    const continueSection = wbEl(spa.doc, 'wb-continue-section');
    expect(continueSection.classList.contains('hidden')).toBe(false);
    const buttons = wbEl(spa.doc, 'wb-continue').children;
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Revisit: Investigate Y');
    expect(buttons[1].textContent).toBe('Ask: How does the discovery pipeline work?');

    // Goal (§18): explicit absence, never fabricated
    expect(wbEl(spa.doc, 'wb-goal').textContent).toBe('Not defined yet.');

    // §19: visit marker stored client-side; badge shows new activity vs stale visit
    const storage = new FakeLocalStorage();
    storage.setItem('ais.lastVisitAt.p1', '2026-09-01T00:00:00.000Z');
    const spa2 = loadSpa(fn, storage);
    await spa2.createSession('/repos/sec-scanner', false);
    await settle();
    expect(wbEl(spa2.doc, 'wb-new-activity').classList.contains('hidden')).toBe(false);
    expect(storage.getItem('ais.lastVisitAt.p1')! > '2026-09-01T00:00:00.000Z').toBe(true);
  });

  it('T5.2 — empty project: one-line welcome, no fabricated sections', async () => {
    const { fn, calls } = makeFetch(baseRoutes({
      match: (u, m) => m === 'GET' && u === '/api/project/p1/continuity',
      status: 200,
      body: emptyContinuityFixture(),
    }));
    const spa = loadSpa(fn, new FakeLocalStorage());

    await spa.createSession('/repos/fresh', false);
    await settle();

    expect(calls).toContainEqual({ url: '/api/project/p1/continuity', method: 'GET' });

    expect(wbEl(spa.doc, 'welcome-back-panel').classList.contains('hidden')).toBe(false);
    expect(wbEl(spa.doc, 'wb-loading').classList.contains('hidden')).toBe(true);
    expect(wbEl(spa.doc, 'wb-empty').classList.contains('hidden')).toBe(false);
    expect(wbEl(spa.doc, 'wb-content').classList.contains('hidden')).toBe(true);

    // §22: minimal cognitive load — no wall of empty sections
    // (the one-line welcome itself is static panel markup, verified below)
    expect(spa.spaHtml).toContain("Welcome. This project doesn't have previous activity yet.");
    expect(wbEl(spa.doc, 'wb-previous-work').children.length).toBe(0);
    expect(wbEl(spa.doc, 'wb-insights').children.length).toBe(0);
    expect(wbEl(spa.doc, 'wb-decisions').children.length).toBe(0);
    expect(wbEl(spa.doc, 'wb-continue').children.length).toBe(0);
    expect(wbEl(spa.doc, 'wb-last-activity').innerHTML).toBe('');
  });

  it('T5.3 — goal null: no fabricated "Your goal is..." anywhere in the panel', async () => {
    const { fn } = makeFetch(baseRoutes({
      match: (u, m) => m === 'GET' && u === '/api/project/p1/continuity',
      status: 200,
      body: richContinuityFixture(), // rich activity, goal still null
    }));
    const spa = loadSpa(fn, new FakeLocalStorage());

    await spa.createSession('/repos/sec-scanner', false);
    await settle();

    const panel = wbEl(spa.doc, 'welcome-back-panel');
    expect(panel.classList.contains('hidden')).toBe(false);
    expect(wbEl(spa.doc, 'wb-goal').textContent).toBe('Not defined yet.');
    expect(wbEl(spa.doc, 'wb-goal').innerHTML).not.toContain('Your goal is');
    expect(panel.innerHTML).not.toContain('Your goal is');
  });

  it('T5.4 — continuation action: suggested question fills the EXISTING question input, no new request', async () => {
    const { fn, calls } = makeFetch(baseRoutes({
      match: (u, m) => m === 'GET' && u === '/api/project/p1/continuity',
      status: 200,
      body: richContinuityFixture(),
    }));
    const spa = loadSpa(fn, new FakeLocalStorage());

    await spa.createSession('/repos/sec-scanner', false);
    await settle();

    const callsAfterRender = calls.length;
    const askBtn = wbEl(spa.doc, 'wb-continue').children
      .find(b => b.textContent === 'Ask: How does the discovery pipeline work?') as FakeElement;
    expect(askBtn).toBeDefined();

    askBtn.onclick?.();

    expect(wbEl(spa.doc, 'question-input').value).toBe('How does the discovery pipeline work?');
    expect(calls.length).toBe(callsAfterRender); // no backend continuation API
  });

  it('T5.5 — revisitable insight: fills question input; NO insight lifecycle mutation, no decide/evaluate requests', async () => {
    const { fn, calls } = makeFetch(baseRoutes({
      match: (u, m) => m === 'GET' && u === '/api/project/p1/continuity',
      status: 200,
      body: richContinuityFixture(),
    }));
    const spa = loadSpa(fn, new FakeLocalStorage());

    await spa.createSession('/repos/sec-scanner', false);
    await settle();

    const callsAfterRender = calls.length;
    const revisitBtn = wbEl(spa.doc, 'wb-continue').children
      .find(b => b.textContent === 'Revisit: Investigate Y') as FakeElement;
    expect(revisitBtn).toBeDefined();

    revisitBtn.onclick?.();

    expect(wbEl(spa.doc, 'question-input').value).toBe('Investigate Y');
    // Read-only preserved: no request at all, in particular no decide/evaluate
    expect(calls.length).toBe(callsAfterRender);
    for (const c of calls) {
      expect(c.url.includes('/decide')).toBe(false);
      expect(c.url.includes('/evaluate')).toBe(false);
    }
    // Status badge in the panel still reflects the persisted status verbatim
    expect(wbEl(spa.doc, 'wb-insights').innerHTML).toContain('К пересмотру');
  });

  it('T5.6 — 404: existing project-not-found handling, no fabricated context', async () => {
    const { fn } = makeFetch(baseRoutes({
      match: (u, m) => m === 'GET' && u === '/api/project/p1/continuity',
      status: 404,
      body: { error: 'Project not found' },
    }));
    const spa = loadSpa(fn, new FakeLocalStorage());

    await spa.createSession('/repos/sec-scanner', false);
    await settle();

    const errorBox = wbEl(spa.doc, 'error-box');
    expect(errorBox.classList.contains('hidden')).toBe(false);
    expect(errorBox.textContent).toBe('Project not found');
    expect(wbEl(spa.doc, 'welcome-back-panel').classList.contains('hidden')).toBe(true);
    expect(wbEl(spa.doc, 'wb-content').classList.contains('hidden')).toBe(true);
    expect(wbEl(spa.doc, 'wb-empty').classList.contains('hidden')).toBe(true);
  });

  it('T5.7 — endpoint unavailable: graceful in-panel error, no fallback reconstruction', async () => {
    const { fn, calls } = makeFetch(baseRoutes({
      match: (u, m) => m === 'GET' && u === '/api/project/p1/continuity',
      reject: true, // network unreachable
    }));
    const spa = loadSpa(fn, new FakeLocalStorage());

    await spa.createSession('/repos/sec-scanner', false);
    await settle();

    // §21: graceful degradation — the project itself stays usable
    expect(wbEl(spa.doc, 'welcome-back-panel').classList.contains('hidden')).toBe(false);
    expect(wbEl(spa.doc, 'wb-error').classList.contains('hidden')).toBe(false);
    expect(spa.spaHtml).toContain("couldn't restore your previous context");
    expect(spa.spaHtml).toContain('still available');
    expect(wbEl(spa.doc, 'wb-content').classList.contains('hidden')).toBe(true);

    // No fallback fabrication: nothing rendered from any other source
    expect(wbEl(spa.doc, 'wb-last-activity').innerHTML).toBe('');
    expect(wbEl(spa.doc, 'wb-previous-work').children.length).toBe(0);
    expect(wbEl(spa.doc, 'wb-continue').children.length).toBe(0);
    // Only the session POST + the (failed) continuity GET happened;
    // no substitute data requests were issued after the failure.
    const stateCalls = calls.filter(c => c.url !== '/api/demos');
    expect(stateCalls).toEqual([
      { url: '/api/session', method: 'POST' },
      { url: '/api/project/p1/continuity', method: 'GET' },
    ]);
  });

  it('T5.8 — XSS: persisted text is never interpreted as executable HTML', async () => {
    const fixture: Record<string, unknown> = {
      project: {
        id: 'p1', name: '<b>Evil</b>', path: '/repos/<script>alert(0)</script>',
        createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-02T12:00:00.000Z',
      },
      goal: null,
      lastActivity: {
        timestamp: '2026-09-02T12:00:00.000Z', type: 'qa',
        summary: '<img src=x onerror=alert(3)>',
      },
      sessions: [{
        responseId: 'resp-x',
        question: '<img src=x onerror=alert(1)>',
        answer: '<script>alert(1)</script>',
        claims: [], sources: [], findings: [],
        timestamp: '2026-09-02T12:00:00.000Z',
      }],
      insights: [{ id: 'i1', text: '<img src=x onerror=alert(2)>', status: 'REVISITABLE', createdAt: '2026-09-01T14:00:00.000Z', history: [] }],
      decisions: [],
      unresolved: [{ insightId: 'i1', status: 'REVISITABLE', text: '<img src=x onerror=alert(2)>' }],
      continuation: {
        revisitableInsights: [{ insightId: 'i1', text: '<img src=x onerror=alert(2)>' }],
        suggestedQuestions: ['<img src=x onerror=alert(4)>'],
        lastActivity: null,
      },
    };

    const { fn } = makeFetch(baseRoutes({
      match: (u, m) => m === 'GET' && u === '/api/project/p1/continuity',
      status: 200,
      body: fixture,
    }));
    const spa = loadSpa(fn, new FakeLocalStorage());

    await spa.createSession('/repos/evil', false);
    await settle();

    // innerHTML-rendered surfaces must carry ESCAPED entities, never raw tags
    const insightsHtml = wbEl(spa.doc, 'wb-insights').innerHTML;
    expect(insightsHtml).toContain('&lt;img src=x onerror=alert(2)&gt;');
    expect(insightsHtml).not.toContain('<img ');

    const activityHtml = wbEl(spa.doc, 'wb-last-activity').innerHTML;
    expect(activityHtml).toContain('&lt;img src=x onerror=alert(3)&gt;');
    expect(activityHtml).not.toContain('<img ');

    const workHtml = wbEl(spa.doc, 'wb-previous-work').innerHTML;
    expect(workHtml).not.toContain('<img ');
    expect(workHtml).not.toContain('<script>');

    // textContent-rendered surfaces keep the raw string (safe by construction)
    expect(wbEl(spa.doc, 'wb-project-name').textContent).toBe('<b>Evil</b>');

    // Continuation buttons use textContent — the raw payload never lands in HTML
    const askBtn = wbEl(spa.doc, 'wb-continue').children
      .find(b => b.textContent.includes('alert(4)')) as FakeElement | undefined;
    expect(askBtn).toBeDefined();
    expect(askBtn!.textContent).toBe('Ask: <img src=x onerror=alert(4)>');

    // Clicking a poisoned continuation button only fills the input — no HTML injection
    askBtn!.onclick?.();
    expect(wbEl(spa.doc, 'question-input').value).toBe('<img src=x onerror=alert(4)>');
  });
});
