/**
 * TASK-AIS-CONTINUITY-RECONSTRUCTION-001 — Read-Only Continuity Endpoint Tests
 *
 * Covers:
 *   T4.1 — Basic reconstruction: identity + 2 sessions + feedback + 2 insights
 *          + 1 explicit decision + 1 revisit condition → full continuity view
 *   T4.2 — Empty project: identity only → valid view with [] / null, zero
 *          fabricated values
 *   T4.3 — Missing project → 404 + deterministic error body + no mutation
 *   T4.4 — Feedback isolation: feedback(A) appears on responseId A only
 *   T4.5 — Read-only disk mutation test: project JSON bytes + mtime unchanged
 *   T4.6 — No goal fabrication: goal === null even with rich activity
 *   T4.7 — Deterministic reconstruction: identical state → identical response
 *   T4.8 — Reload boundary: continuity served from a NEW ProjectStore after
 *          re-instantiation (durable-store boundary, NOT a Map round-trip)
 *   S-4.11.C — suggestedQuestions reuse the existing demo mechanism, [] else
 *
 * Infrastructure under test is REAL: ProjectStore (atomic fsync+rename),
 * real temporary filesystem, real ProjectService / InsightService, real
 * PathSecurityService, real HttpAdapter on an ephemeral port. Only the
 * ExecutionEngine is stubbed (no network, no credentials) — the continuity
 * GET itself never touches the engine at all.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { SessionRuntime } from '../../core/session/session-runtime.js';
import { EvidenceLoopService } from '../../core/evidence-loop/evidence-loop-service.js';
import { InteractionService } from '../../core/interaction-layer/interaction-service.js';
import type { ExecutionEngine, ArchitectureAnswerResponse } from '../../core/engine/execution-engine.js';
import { PathSecurityService } from '../../mvp-ui/path-security.js';
import { ProjectStore } from '../../mvp-ui/project-store.js';
import { ProjectService } from '../../mvp-ui/project-service.js';
import { InsightService } from '../../mvp-ui/insight-service.js';
import { HttpAdapter } from '../../mvp-ui/http-adapter.js';
import { getDemoConfig, DEMO_SUGGESTED_QUESTIONS } from '../../mvp-ui/demo-config.js';
import { GoalAlignment, InsightStatus } from '../../mvp-ui/project-types.js';
import type { Project, ProjectContinuityView } from '../../mvp-ui/project-types.js';

// ═══════════════════════════════════════════════════════════════
// TEMP FS LIFECYCLE
// ═══════════════════════════════════════════════════════════════

const tmpRoots: string[] = [];

function makeTmpDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ais-continuity-'));
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
    sources: [],
    evidence: null,
    model: 'test-model',
    provider: 'test-provider',
    latencyMs: 5,
    discoveryStats: { totalFiles: 10, modules: 2, dependencies: 3, techStack: ['typescript'] },
    ...overrides,
  };
}

function createStubEngine(responseBox: { current: ArchitectureAnswerResponse }): ExecutionEngine {
  return {
    execute: vi.fn(async () => responseBox.current),
  } as unknown as ExecutionEngine;
}

function makeInteractionService(): InteractionService {
  const responseBox = { current: makeEngineResponse() };
  const sessionRuntime = new SessionRuntime();
  const evidenceLoop = new EvidenceLoopService({ sessionRuntime });
  return new InteractionService({
    evidenceLoop,
    engine: createStubEngine(responseBox),
  });
}

interface Harness {
  adapter: HttpAdapter;
  projectDataDir: string;
  repoPath: string;
  store: ProjectStore;
  projectService: ProjectService;
  insightService: InsightService;
}

async function setupHarness(): Promise<Harness> {
  const tmp = makeTmpDir();
  const projectDataDir = join(tmp, 'ais-data', 'projects');
  const repoDir = join(tmp, 'repo');
  mkdirSync(repoDir, { recursive: true });

  const store = new ProjectStore(projectDataDir);
  const projectService = new ProjectService(store);
  const insightService = new InsightService(store);
  const pathSecurity = new PathSecurityService({
    allowedRoots: [tmp],
    demoAllowlist: [tmp],
  });

  const spaPath = join(tmp, 'index.html');
  writeFileSync(spaPath, '<html><body>continuity-test</body></html>');

  const adapter = new HttpAdapter({
    interactionService: makeInteractionService(),
    pathSecurity,
    port: 0,
    spaPath,
    realInferenceAvailable: true,
    projectService,
    insightService,
  });
  await adapter.start();
  return { adapter, projectDataDir, repoPath: resolve(repoDir), store, projectService, insightService };
}

async function httpRequest(
  adapter: HttpAdapter,
  method: string,
  path: string,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`http://127.0.0.1:${adapter.actualPort}${path}`, { method });
  return { status: res.status, data: await res.json() };
}

async function getContinuity(
  adapter: HttpAdapter,
  projectId: string,
): Promise<{ status: number; data: ProjectContinuityView | { error: string } }> {
  return httpRequest(adapter, 'GET', `/api/project/${projectId}/continuity`);
}

/** Read the single project JSON file straight from disk. */
function readProjectFile(projectDataDir: string): Project {
  const files = readdirSync(projectDataDir).filter(f => f.endsWith('.json'));
  expect(files.length).toBe(1);
  return JSON.parse(readFileSync(join(projectDataDir, files[0]), 'utf-8')) as Project;
}

function projectFilePath(projectDataDir: string): string {
  const files = readdirSync(projectDataDir).filter(f => f.endsWith('.json'));
  expect(files.length).toBe(1);
  return join(projectDataDir, files[0]);
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Legitimate path to a DEFERRED insight: NEW → EVALUATING → ACTIVE → DEFERRED. */
function seedDeferredInsight(
  h: Harness,
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
    rationale: 'seed evaluation',
  });
  h.insightService.decideInsight({ projectId, insightId: insight.id, decision: 'IMPLEMENT_NOW' });
  h.insightService.decideInsight({
    projectId, insightId: insight.id, decision: 'DEFER', revisitCondition,
  });
  return insight.id;
}

interface RichSeed {
  projectId: string;
  responseId1: string;
  responseId2: string;
  insightAId: string;
  insightBId: string;
}

/**
 * Seed exactly what T4.1 prescribes: project + 2 sessions + 1 feedback
 * + 2 insights + 1 explicit decision (DEFER) + 1 revisit condition.
 * Small sleeps keep timestamps strictly ordered for deterministic
 * lastActivity expectations (test-setup concern only).
 */
async function seedRichProject(h: Harness): Promise<RichSeed> {
  const { projectService, insightService, repoPath } = h;
  const project = projectService.ensureProject(repoPath, 'Continuity Fixture');
  const responseId1 = 'response-aaa-1';
  const responseId2 = 'response-bbb-2';

  projectService.captureSessionAnswer({
    projectPath: repoPath,
    sessionId: responseId1,
    interactionSessionId: 'interaction-1',
    question: 'How does authentication work?',
    answer: 'Auth flows through the login module.',
    claims: [{ claimId: 'claim-1', statement: 'Login is handled in one module.', isVerified: true, evidenceCount: 1 }],
    sources: [{
      filePath: 'src/auth/login.ts',
      type: 'code',
      excerpt: 'const token = "sk-abcdefghijklmnopqrstuvwxyz012345";',
      relevance: 0.92,
    }],
  });
  await sleep(4);

  projectService.captureSessionFeedback({
    projectPath: repoPath,
    sessionId: responseId1,
    verdict: 'correct',
    comment: 'Verified against the source',
  });
  await sleep(4);

  const insightAId = seedDeferredInsight(
    h, project.id, 'Extract auth into a dedicated module', 'when the auth module exceeds 500 lines',
  );
  await sleep(4);

  projectService.captureSessionAnswer({
    projectPath: repoPath,
    sessionId: responseId2,
    interactionSessionId: 'interaction-2',
    question: 'What tests cover the parser?',
    answer: 'Parser regression tests live in tests/parser.',
    claims: [{ claimId: 'claim-2', statement: 'Parser has regression coverage.', isVerified: true, evidenceCount: 1 }],
    sources: [{
      filePath: 'tests/parser/parser.test.ts',
      type: 'test',
      excerpt: 'describe("parser", () => {})',
      relevance: 0.81,
    }],
  });
  await sleep(4);

  const insightBId = insightService.createInsight({ projectId: project.id, text: 'Add parser regression suite' }).id;

  return { projectId: project.id, responseId1, responseId2, insightAId, insightBId };
}

// ═══════════════════════════════════════════════════════════════
// T4.1 — BASIC RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════

describe('S-4 / T4.1 — basic reconstruction', () => {
  it('rebuilds identity, Q&A, sources, feedback, insights, decision, unresolved, continuation', async () => {
    const h = await setupHarness();
    try {
      const seed = await seedRichProject(h);
      const disk = readProjectFile(h.projectDataDir);

      const res = await getContinuity(h.adapter, seed.projectId);
      expect(res.status).toBe(200);
      const view = res.data as ProjectContinuityView;

      // ── Identity: verbatim from the persisted Project (§S-4.2) ──
      expect(view.project).toEqual({
        id: disk.id,
        name: disk.name,
        path: disk.projectPath,
        createdAt: disk.createdAt,
        updatedAt: disk.updatedAt,
      });

      // ── Goal never fabricated (§S-4.9) ──
      expect(view.goal).toBeNull();

      // ── Sessions = 2, newest-first (existing history convention) ──
      expect(view.sessions.length).toBe(2);
      expect(view.sessions[0].responseId).toBe(seed.responseId2);
      expect(view.sessions[1].responseId).toBe(seed.responseId1);

      // Q&A content preserved (§S-4.4)
      const s1 = view.sessions[1];
      expect(s1.question).toBe('How does authentication work?');
      expect(s1.answer).toBe('Auth flows through the login module.');
      expect(s1.interactionSessionId).toBe('interaction-1');
      expect(s1.timestamp).toBe(disk.sessions.find(x => x.sessionId === seed.responseId1)!.createdAt);

      // Claims preserved
      expect(s1.claims.length).toBe(1);
      expect(s1.claims[0]).toEqual({
        claimId: 'claim-1',
        statement: 'Login is handled in one module.',
        isVerified: true,
        evidenceCount: 1,
      });

      // Evidence preserved from persisted session data — no re-scan (§S-4.5)
      expect(s1.sources.length).toBe(1);
      expect(s1.sources[0].filePath).toBe('src/auth/login.ts');
      expect(s1.sources[0].type).toBe('code');
      expect(s1.sources[0].relevance).toBe(0.92);
      // §21: persisted sanitization guarantees flow through the endpoint
      expect(s1.sources[0].excerpt).not.toContain('sk-abcdefghijklmnopqrstuvwxyz012345');
      expect(s1.sources[0].excerpt).toContain('[REDACTED:secret]');

      // Feedback returned on the exact responseId that received it (§S-4.6)
      expect(s1.feedback).toBeDefined();
      expect(s1.feedback!.verdict).toBe('correct');
      expect(s1.feedback!.comment).toBe('Verified against the source');
      expect(view.sessions[0].feedback).toBeUndefined();

      // ── Insights (§S-4.7) ──
      expect(view.insights.length).toBe(2);
      const insightA = view.insights.find(i => i.id === seed.insightAId)!;
      const insightB = view.insights.find(i => i.id === seed.insightBId)!;
      expect(insightA).toBeDefined();
      expect(insightB).toBeDefined();
      expect(insightA.text).toBe('Extract auth into a dedicated module');
      expect(insightA.status).toBe('DEFERRED');
      expect(insightA.userDecision).toBe('DEFER');
      expect(insightA.revisitCondition).toBe('when the auth module exceeds 500 lines');
      expect(insightA.decisionAt).toBeTruthy();
      expect(insightA.history.length).toBeGreaterThanOrEqual(2);
      expect(insightB.status).toBe('NEW');

      // ── Decisions: only the explicit user decision (§S-4.8) ──
      expect(view.decisions.length).toBe(1);
      expect(view.decisions[0]).toEqual({
        insightId: seed.insightAId,
        decision: 'DEFER',
        timestamp: insightA.decisionAt,
      });

      // ── Unresolved: NEW + DEFERRED persisted statuses only (§S-4.10) ──
      expect(view.unresolved.length).toBe(2);
      const unresolvedA = view.unresolved.find(u => u.insightId === seed.insightAId)!;
      expect(unresolvedA.status).toBe('DEFERRED');
      expect(unresolvedA.revisitCondition).toBe('when the auth module exceeds 500 lines');
      expect(view.unresolved.find(u => u.insightId === seed.insightBId)!.status).toBe('NEW');

      // ── Continuation (§S-4.11) ──
      expect(view.continuation.revisitableInsights).toEqual([]); // nothing REVISITABLE yet
      expect(view.continuation.suggestedQuestions).toEqual([]); // non-demo project
      // lastActivity = the newest REAL record = insightB (created last)
      expect(view.lastActivity).not.toBeNull();
      expect(view.continuation.lastActivity).toEqual(view.lastActivity);
      expect(view.lastActivity!.type).toBe('insight');
      expect(view.lastActivity!.summary).toBe('Add parser regression suite');
      const insightBCreatedAt = disk.insights.find(i => i.id === seed.insightBId)!.createdAt;
      expect(view.lastActivity!.timestamp).toBe(insightBCreatedAt);
    } finally {
      await h.adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T4.2 — EMPTY PROJECT
// ═══════════════════════════════════════════════════════════════

describe('S-4 / T4.2 — empty project yields a valid, unfabricated view', () => {
  it('returns identity with empty collections and lastActivity null', async () => {
    const h = await setupHarness();
    try {
      const project = h.projectService.ensureProject(h.repoPath, 'Empty Fixture');
      const disk = readProjectFile(h.projectDataDir);

      const res = await getContinuity(h.adapter, project.id);
      expect(res.status).toBe(200);
      const view = res.data as ProjectContinuityView;

      expect(view.project.id).toBe(disk.id);
      expect(view.project.name).toBe(disk.name);
      expect(view.project.path).toBe(h.repoPath);
      expect(view.project.createdAt).toBe(disk.createdAt);
      expect(view.project.updatedAt).toBe(disk.updatedAt);

      expect(view.sessions).toEqual([]);
      expect(view.insights).toEqual([]);
      expect(view.decisions).toEqual([]);
      expect(view.unresolved).toEqual([]);
      expect(view.lastActivity).toBeNull();
      expect(view.goal).toBeNull();

      expect(view.continuation.revisitableInsights).toEqual([]);
      expect(view.continuation.suggestedQuestions).toEqual([]);
      expect(view.continuation.lastActivity).toBeNull();
    } finally {
      await h.adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T4.3 — MISSING PROJECT
// ═══════════════════════════════════════════════════════════════

describe('S-4 / T4.3 — missing project returns deterministic 404, no mutation', () => {
  it('404 with error body; never creates a project', async () => {
    const h = await setupHarness();
    try {
      const res = await getContinuity(h.adapter, 'nonexistent-project-xyz');
      expect(res.status).toBe(404);
      expect(res.data).toEqual({ error: 'Project not found' });

      // §S-4.12: no auto-creation — the durable dir stays empty
      const files = readdirSync(h.projectDataDir).filter(f => f.endsWith('.json'));
      expect(files.length).toBe(0);
    } finally {
      await h.adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T4.4 — FEEDBACK ISOLATION (responseId keying)
// ═══════════════════════════════════════════════════════════════

describe('S-4 / T4.4 — feedback isolation per responseId', () => {
  it('feedback(A) appears on A only; B stays feedback-free', async () => {
    const h = await setupHarness();
    try {
      const project = h.projectService.ensureProject(h.repoPath, 'Feedback Fixture');

      h.projectService.captureSessionAnswer({
        projectPath: h.repoPath,
        sessionId: 'response-A',
        question: 'Question A',
        answer: 'Answer A',
        claims: [],
        sources: [],
      });
      h.projectService.captureSessionAnswer({
        projectPath: h.repoPath,
        sessionId: 'response-B',
        question: 'Question B',
        answer: 'Answer B',
        claims: [],
        sources: [],
      });
      h.projectService.captureSessionFeedback({
        projectPath: h.repoPath,
        sessionId: 'response-A',
        verdict: 'incorrect',
        comment: 'missed the module boundary',
      });

      const res = await getContinuity(h.adapter, project.id);
      expect(res.status).toBe(200);
      const view = res.data as ProjectContinuityView;

      const a = view.sessions.find(s => s.responseId === 'response-A')!;
      const b = view.sessions.find(s => s.responseId === 'response-B')!;
      expect(a).toBeDefined();
      expect(b).toBeDefined();

      // Canonical keying rule: feedback(A) must never leak into sibling B
      expect(a.feedback).toBeDefined();
      expect(a.feedback!.verdict).toBe('incorrect');
      expect(a.feedback!.comment).toBe('missed the module boundary');
      expect(b.feedback).toBeUndefined();
    } finally {
      await h.adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T4.5 — READ-ONLY DISK MUTATION TEST
// ═══════════════════════════════════════════════════════════════

describe('S-4 / T4.5 — GET continuity does not mutate persistent state', () => {
  it('project JSON bytes and mtime are identical before and after GET', async () => {
    const h = await setupHarness();
    try {
      const seed = await seedRichProject(h);
      const file = projectFilePath(h.projectDataDir);

      const beforeBytes = readFileSync(file, 'utf-8');
      const beforeMtime = statSync(file).mtimeMs;

      const res = await getContinuity(h.adapter, seed.projectId);
      expect(res.status).toBe(200);

      const afterBytes = readFileSync(file, 'utf-8');
      const afterMtime = statSync(file).mtimeMs;

      expect(afterBytes).toBe(beforeBytes);
      expect(afterMtime).toBe(beforeMtime);
    } finally {
      await h.adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T4.6 — NO GOAL FABRICATION
// ═══════════════════════════════════════════════════════════════

describe('S-4 / T4.6 — goal is never fabricated', () => {
  it('goal stays null even with Q&A, an insight, and a DEFER decision', async () => {
    const h = await setupHarness();
    try {
      const project = h.projectService.ensureProject(h.repoPath, 'Goal Integrity Fixture');

      h.projectService.captureSessionAnswer({
        projectPath: h.repoPath,
        sessionId: 'response-goal-1',
        question: 'How should we restructure the parser?',
        answer: 'A staged refactor is safest.',
        claims: [],
        sources: [],
      });
      seedDeferredInsight(h, project.id, 'Split parser into lexer and grammar stages', 'after v0.9 ships');

      const res = await getContinuity(h.adapter, project.id);
      expect(res.status).toBe(200);
      const view = res.data as ProjectContinuityView;

      // §S-4.9: no goal runtime exists — nothing may be inferred from the
      // question, the insight, the decision, or the project name.
      expect(view.goal).toBeNull();
      expect(view.decisions.length).toBe(1);
      expect(view.decisions[0].decision).toBe('DEFER');
    } finally {
      await h.adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T4.7 — DETERMINISTIC RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════

describe('S-4 / T4.7 — deterministic reconstruction', () => {
  it('two GETs over the same durable state return byte-identical responses', async () => {
    const h = await setupHarness();
    try {
      const seed = await seedRichProject(h);

      const resA = await getContinuity(h.adapter, seed.projectId);
      const resB = await getContinuity(h.adapter, seed.projectId);
      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      // No volatile fields exist in the view, so raw JSON equality is the
      // strongest normalization available (§20).
      expect(JSON.stringify(resB.data)).toBe(JSON.stringify(resA.data));
    } finally {
      await h.adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// T4.8 — RELOAD BOUNDARY (durable-store, not Map round-trip)
// ═══════════════════════════════════════════════════════════════

describe('S-4 / T4.8 — continuity survives ProjectStore re-instantiation', () => {
  it('is served from the reloaded disk state by a brand-new adapter', async () => {
    const h = await setupHarness();
    let projectId: string;
    try {
      const seed = await seedRichProject(h);
      projectId = seed.projectId;
      const disk = readProjectFile(h.projectDataDir);
      expect(disk.sessions.length).toBe(2);
      expect(disk.insights.length).toBe(2);
    } finally {
      await h.adapter.stop(); // destroy the first process-equivalent: adapter + services
    }

    // ── Re-instantiate from the SAME directory ──────────────────
    const store2 = new ProjectStore(h.projectDataDir);

    // Before loadAll the new store knows NOTHING — proves continuity is not
    // an in-memory Map round-trip but a durable-store reconstruction.
    expect(store2.findById(projectId!)).toBeUndefined();
    store2.loadAll();

    const projectService2 = new ProjectService(store2);
    const insightService2 = new InsightService(store2);

    const tmp = h.projectDataDir; // same tmp root holds the spa file
    const spaPath = join(resolve(tmp, '..', '..'), 'index.html');
    const adapter2 = new HttpAdapter({
      interactionService: makeInteractionService(),
      pathSecurity: new PathSecurityService({
        allowedRoots: [resolve(tmp, '..', '..')],
        demoAllowlist: [resolve(tmp, '..', '..')],
      }),
      port: 0,
      spaPath,
      realInferenceAvailable: true,
      projectService: projectService2,
      insightService: insightService2,
    });
    await adapter2.start();
    try {
      const res = await getContinuity(adapter2, projectId!);
      expect(res.status).toBe(200);
      const view = res.data as ProjectContinuityView;

      const disk = readProjectFile(h.projectDataDir);

      // Full reconstruction from reloaded disk state
      expect(view.project.id).toBe(disk.id);
      expect(view.project.name).toBe(disk.name);
      expect(view.project.path).toBe(disk.projectPath);
      expect(view.project.createdAt).toBe(disk.createdAt);

      expect(view.sessions.length).toBe(2);
      expect(view.sessions.map(s => s.responseId).sort()).toEqual(['response-aaa-1', 'response-bbb-2']);
      expect(view.sessions.find(s => s.responseId === 'response-aaa-1')!.question)
        .toBe('How does authentication work?');
      expect(view.sessions.find(s => s.responseId === 'response-aaa-1')!.feedback).toBeDefined();

      expect(view.insights.length).toBe(2);
      expect(view.decisions.length).toBe(1);
      expect(view.decisions[0].decision).toBe('DEFER');
      expect(view.unresolved.length).toBe(2);
      expect(view.goal).toBeNull();
      expect(view.lastActivity).not.toBeNull();
    } finally {
      await adapter2.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// S-4.11.A — REVISITABLE CONTINUATION POINTS
// ═══════════════════════════════════════════════════════════════

describe('S-4.11.A — revisitable insights become continuation points', () => {
  it('lists persisted REVISITABLE insights with their revisit conditions', async () => {
    const h = await setupHarness();
    try {
      const project = h.projectService.ensureProject(h.repoPath, 'Revisitable Fixture');
      const insightId = seedDeferredInsight(
        h, project.id, 'Migrate build to lazy compilation', 'when build time exceeds 60s',
      );
      // Existing legit transition DEFERRED → REVISITABLE (test setup only;
      // the GET itself must never perform it — verified by T4.5).
      h.insightService.updateStatus({
        projectId: project.id,
        insightId,
        newStatus: InsightStatus.REVISITABLE,
        detail: 'context changed',
      });

      const res = await getContinuity(h.adapter, project.id);
      expect(res.status).toBe(200);
      const view = res.data as ProjectContinuityView;

      expect(view.continuation.revisitableInsights.length).toBe(1);
      const r = view.continuation.revisitableInsights[0];
      expect(r.insightId).toBe(insightId);
      expect(r.text).toBe('Migrate build to lazy compilation');
      expect(r.revisitCondition).toBe('when build time exceeds 60s');

      // REVISITABLE is also an unresolved persisted state
      expect(view.unresolved.some(u => u.insightId === insightId && u.status === 'REVISITABLE')).toBe(true);
    } finally {
      await h.adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// S-4.11.C — DEMO SUGGESTED QUESTIONS REUSE
// ═══════════════════════════════════════════════════════════════

describe('S-4.11.C — suggestedQuestions reuse the existing demo mechanism', () => {
  it('inherits demo questions for the demo path and [] otherwise', async () => {
    const h = await setupHarness();
    try {
      // Project registered at the EXISTING demo project path (only the
      // dataDir is temporary — no repository files are touched).
      const project = h.projectService.ensureProject(getDemoConfig().projectPath, 'Demo Fixture');

      const res = await getContinuity(h.adapter, project.id);
      expect(res.status).toBe(200);
      const view = res.data as ProjectContinuityView;

      expect(view.continuation.suggestedQuestions).toEqual([...DEMO_SUGGESTED_QUESTIONS]);
      // No activity records → still no fabricated activity
      expect(view.lastActivity).toBeNull();
    } finally {
      await h.adapter.stop();
    }
  });
});
