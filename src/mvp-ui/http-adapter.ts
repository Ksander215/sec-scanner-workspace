/**
 * HTTP Adapter — MVP UI
 * TASK-MVP-FREE-UI-001
 *
 * Minimal HTTP server using Node.js built-in `http` module.
 * ZERO new dependencies — no Express, Hono, or any framework.
 *
 * Architecture: UI → HTTP Adapter → InteractionService → EvidenceLoopService → ExecutionEngine
 *
 * Endpoints:
 *   POST   /api/resolve-repo       → resolve GitHub URL, clone repo
 *   POST   /api/session              → startInteraction
 *   POST   /api/session/:id/question  → submitQuestion
 *   POST   /api/session/:id/feedback  → submitFeedback
 *   GET    /api/session/:id/trace     → getTrace
 *   GET    /api/session/:id           → getSessionView
 *   GET    /api/demos                 → list demo projects
 *   GET    /api/project/:id/history   → session history
 *   GET    /api/project/:id/continuity → read-only continuity reconstruction
 *   GET    /api/project/:id/insights  → list insights
 *   POST   /api/project/:id/insights  → create insight
 *   POST   /api/project/:id/insights/:iid/evaluate → evaluate insight
 *   POST   /api/project/:id/insights/:iid/decide    → user decision
 *   GET    /api/project/:id/insights/revisitable → revisitable insights
 *   GET    /api/project/:id/insights/counts       → insight counts
 *   GET    /api/recent                 → recent sessions + insight summary
 *   GET    /                         → serve SPA
 *
 * Security:
 *   - CORS headers for MVP (configurable origin)
 *   - Path validation via PathSecurityService
 *   - Error responses never include stack traces (§19)
 *   - Input validation on all endpoints
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { InteractionService } from '../core/interaction-layer/interaction-service.js';
import { InteractionError, EmptyQuestionError, InteractionStateError, InteractionSessionNotFoundError, ExecutionFailedError } from '../core/interaction-layer/errors.js';
import { PathSecurityService } from './path-security.js';
import { GitHubResolver, GitHubResolverError } from './github-resolver.js';
import { getAllDemoConfigs } from './demo-config.js';
import type { ProjectService } from './project-service.js';
import type { InsightService } from './insight-service.js';
import { GoalAlignment } from './project-types.js';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface HttpAdapterConfig {
  readonly interactionService: InteractionService;
  readonly pathSecurity: PathSecurityService;
  readonly port?: number;
  readonly corsOrigin?: string;
  readonly spaPath?: string;
  readonly realInferenceAvailable?: boolean;
  readonly githubResolver?: GitHubResolver;
  readonly projectService?: ProjectService;
  readonly insightService?: InsightService;
}

interface RouteMatch {
  params: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════
// SPA HTML
// ═══════════════════════════════════════════════════════════════════

/** Resolve the SPA HTML path (relative to this file → mvp-ui/index.html). */
function getDefaultSpaPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // From dist/mvp-ui/http-adapter.js → mvp-ui/index.html
  return resolve(__dirname, '..', '..', 'mvp-ui', 'index.html');
}

// ═══════════════════════════════════════════════════════════════════
// HTTP ADAPTER
// ═══════════════════════════════════════════════════════════════════

export class HttpAdapter {
  private readonly service: InteractionService;
  private readonly pathSecurity: PathSecurityService;
  private readonly githubResolver: GitHubResolver | undefined;
  private readonly projectService: ProjectService | undefined;
  private readonly insightService: InsightService | undefined;
  private readonly port: number;
  private readonly corsOrigin: string;
  private readonly spaHtml: string;
  private readonly realInferenceAvailable: boolean;
  private server: Server | null = null;

  constructor(config: HttpAdapterConfig) {
    this.service = config.interactionService;
    this.pathSecurity = config.pathSecurity;
    this.port = config.port ?? 3456;
    this.corsOrigin = config.corsOrigin ?? '*';
    this.realInferenceAvailable = config.realInferenceAvailable ?? false;
    this.githubResolver = config.githubResolver;
    this.projectService = config.projectService;
    this.insightService = config.insightService;

    // Load SPA HTML at startup
    const spaPath = config.spaPath ?? getDefaultSpaPath();
    try {
      this.spaHtml = readFileSync(spaPath, 'utf-8');
    } catch {
      throw new Error(
        `SPA HTML not found at ${spaPath}. Run from project root or set spaPath config.`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────

  /** Start the HTTP server. */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch(() => {
          // Already handled in handleRequest
        });
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  /** Stop the HTTP server. */
  async stop(): Promise<void> {
    if (!this.server) return;
    return new Promise((resolve) => {
      this.server!.close(() => resolve());
      this.server = null;
    });
  }

  /** Get the actual port the server is listening on. */
  get actualPort(): number {
    if (!this.server) return this.port;
    const addr = this.server.address();
    if (typeof addr === 'object' && addr) return addr.port;
    return this.port;
  }

  // ─────────────────────────────────────────────────────────────
  // REQUEST ROUTING
  // ─────────────────────────────────────────────────────────────

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // CORS preflight
      if (req.method === 'OPTIONS') {
        this.setCorsHeaders(res);
        res.writeHead(204);
        res.end();
        return;
      }

      this.setCorsHeaders(res);

      const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);
      const method = req.method?.toUpperCase() ?? 'GET';
      const path = url.pathname;

      // API routes
      if (path.startsWith('/api/')) {
        await this.handleApiRoute(method, path, url, req, res);
        return;
      }

      // SPA — serve index.html for all non-API routes
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(this.spaHtml);
    } catch (err) {
      this.sendError(res, 500, 'Internal server error');
    }
  }

  private async handleApiRoute(
    method: string,
    path: string,
    _url: URL,
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      // POST /api/resolve-repo — TASK-MVP-FREE-REPOSITORY-UX-001
      if (method === 'POST' && path === '/api/resolve-repo') {
        const body = await this.readBody(req);
        await this.handleResolveRepo(body, res);
        return;
      }

      // POST /api/session
      if (method === 'POST' && path === '/api/session') {
        const body = await this.readBody(req);
        await this.handleStartSession(body, res);
        return;
      }

      // GET /api/demos
      if (method === 'GET' && path === '/api/demos') {
        this.handleListDemos(res);
        return;
      }

      // Match /api/session/:id/*
      const sessionMatch = this.matchSessionRoute(path);
      if (sessionMatch) {
        const sessionId = sessionMatch.params.id;
        const subPath = sessionMatch.params.sub ?? '';

        if (method === 'GET' && !subPath) {
          this.handleGetSession(sessionId, res);
          return;
        }
        if (method === 'GET' && subPath === 'trace') {
          this.handleGetTrace(sessionId, res);
          return;
        }
        if (method === 'POST' && subPath === 'question') {
          const body = await this.readBody(req);
          await this.handleSubmitQuestion(sessionId, body, res);
          return;
        }
        if (method === 'POST' && subPath === 'feedback') {
          const body = await this.readBody(req);
          await this.handleSubmitFeedback(sessionId, body, res);
          return;
        }
      }

      // ── Project + Insight routes ──────────────────────────────
      const projectMatch = this.matchProjectRoute(path);
      if (projectMatch && this.projectService && this.insightService) {
        const { id: projectId, sub: projectSub } = projectMatch.params;

        // GET /api/project/:id/history
        if (method === 'GET' && projectSub === 'history') {
          this.handleGetProjectHistory(projectId, res);
          return;
        }

        // GET /api/project/:id/continuity — TASK-AIS-CONTINUITY-RECONSTRUCTION-001
        // Read-only: resolves the project through the existing ProjectService /
        // ProjectStore and projects its durable state. No ensureProject, no
        // lifecycle writes, no LLM (§18). Unknown project → deterministic 404.
        if (method === 'GET' && projectSub === 'continuity') {
          this.handleGetProjectContinuity(projectId, res);
          return;
        }

        // GET /api/project/:id/insights/counts
        if (method === 'GET' && projectSub === 'insights/counts') {
          this.handleGetInsightCounts(projectId, res);
          return;
        }

        // GET /api/project/:id/insights/revisitable
        if (method === 'GET' && projectSub === 'insights/revisitable') {
          this.handleGetRevisitableInsights(projectId, res);
          return;
        }

        // POST /api/project/:id/insights (create)
        if (method === 'POST' && projectSub === 'insights') {
          const body = await this.readBody(req);
          await this.handleCreateInsight(projectId, body, res);
          return;
        }

        // GET /api/project/:id/insights (list)
        if (method === 'GET' && projectSub === 'insights') {
          this.handleListInsights(projectId, res);
          return;
        }

        // Match /api/project/:id/insights/:iid/*
        const insightMatch = this.matchInsightRoute(path);
        if (insightMatch) {
          const { iid: insightId, sub: insightSub } = insightMatch.params;

          // POST /api/project/:id/insights/:iid/evaluate
          if (method === 'POST' && insightSub === 'evaluate') {
            const body = await this.readBody(req);
            this.handleEvaluateInsight(projectId, insightId, body, res);
            return;
          }
          // POST /api/project/:id/insights/:iid/decide
          if (method === 'POST' && insightSub === 'decide') {
            const body = await this.readBody(req);
            this.handleDecideInsight(projectId, insightId, body, res);
            return;
          }
        }
      }

      // GET /api/recent — recent sessions + insight summary
      if (method === 'GET' && path === '/api/recent') {
        this.handleGetRecent(res);
        return;
      }

      this.sendError(res, 404, 'Not found');
    } catch (err) {
      if (err instanceof Error && err.message === 'Request body too large') {
        this.sendError(res, 413, 'Request body too large');
        return;
      }
      if (err instanceof Error && err.message === 'Invalid JSON in request body') {
        this.sendError(res, 400, 'Invalid JSON in request body');
        return;
      }
      const mapped = this.mapError(err);
      // TASK-MVP-FREE-REAL-E2E-001: temporary diagnostic logging for real inference debugging
      console.error('[MVP-UI] Request error:', mapped.status, err instanceof Error ? err.message : String(err), err instanceof Error ? err.stack?.substring(0, 500) : '');
      this.sendError(res, mapped.status, mapped.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────

  /** POST /api/resolve-repo — Clone a GitHub repository for analysis. */
  private async handleResolveRepo(body: unknown, res: ServerResponse): Promise<void> {
    if (!this.githubResolver) {
      this.sendError(res, 503, 'GitHub repository resolution is not available on this server.');
      return;
    }

    const parsed = this.parseObject(body);
    const url = this.requireString(parsed, 'url');

    try {
      const result = await this.githubResolver.resolve(url);
      this.sendJson(res, 200, {
        cloneId: result.cloneId,
        projectPath: result.projectPath,
        repoInfo: result.repoInfo,
      });
    } catch (err) {
      if (err instanceof GitHubResolverError) {
        const statusMap: Record<string, number> = {
          INVALID_URL: 400,
          REPO_NOT_FOUND: 404,
          REPO_PRIVATE: 403,
          REPO_TOO_LARGE: 413,
          CLONE_TIMEOUT: 504,
          CLONE_FAILED: 502,
        };
        const status = statusMap[err.code] ?? 400;
        this.sendError(res, status, err.message);
        return;
      }
      throw err;
    }
  }

  /** POST /api/session — Start a new interaction session. */
  private async handleStartSession(body: unknown, res: ServerResponse): Promise<void> {
    const parsed = this.parseObject(body);
    const rawPath = this.requireString(parsed, 'projectPath');
    const isDemo = parsed.isDemo === true;
    const provenance = (parsed.provenance as 'human' | 'synthetic') ?? 'human';

    // Validate project path (S-01, S-02, S-03)
    const projectPath = this.pathSecurity.validateProjectPath(rawPath, { isDemo });

    // TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-1): durable project identity.
    // The first POST /api/session for a project creates the Project aggregate
    // and persists .ais-data/projects/<projectId>.json synchronously
    // (write-through). Idempotent: subsequent calls return the same project.
    // This also resolves baseline finding D-1: project creation is now
    // user-reachable. Path comes from PathSecurityService — never from
    // unvalidated client input.
    //
    // TASK-AIS-WELCOME-BACK-001 (S-5): the already-executed ensureProject call
    // now has its return value surfaced as an ADDITIVE response field, so the
    // UI can load GET /api/project/:id/continuity right after a successful
    // open (task §4: projectId known → fetch continuity → renderWelcomeBack).
    // No new endpoint, no session-creation semantic change, no S-4 contract
    // change — when projectService is absent the field is simply omitted.
    let projectId: string | undefined;
    if (this.projectService) {
      const project = this.projectService.ensureProject(projectPath);
      projectId = project.id;
    }

    const sessionView = await this.service.startInteraction({
      projectPath,
      provenance,
    });

    this.sendJson(res, 201, {
      sessionId: sessionView.sessionId,
      state: sessionView.state,
      createdAt: sessionView.createdAt,
      // S-5 (additive): durable project identity for the Welcome Back panel.
      // Dropped by JSON.stringify when projectService is not configured.
      projectId,
    });
  }

  /** POST /api/session/:id/question — Submit a question. */
  private async handleSubmitQuestion(sessionId: string, body: unknown, res: ServerResponse): Promise<void> {
    // §8, §13: DEMO != FAKE — refuse to return empty/mock results
    if (!this.realInferenceAvailable) {
      this.sendError(res, 503,
        'Real inference is not available. ' +
        'Set AIS_EXECUTION_REAL=true, AIS_REAL_LLM=true, and OPENAI_API_KEY environment variables.',
      );
      return;
    }

    const parsed = this.parseObject(body);
    const question = this.requireString(parsed, 'question');

    if (question.trim().length === 0) {
      this.sendError(res, 400, 'Question must not be empty');
      return;
    }

    if (question.length > 10_000) {
      this.sendError(res, 400, 'Question too long (max 10,000 characters)');
      return;
    }

    const answerView = await this.service.submitQuestion({
      sessionId: sessionId as any,
      question: question.trim(),
    });

    // TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-2): durable Q&A capture (write-through),
    // completed BEFORE the HTTP response is sent (§9 persistence invariant).
    // Keying invariant (§5): PersistedSession.sessionId === answerView.responseId,
    // so feedback can never corrupt sibling records. projectPath comes from the
    // existing InteractionSession via getCaptureContext (§7 preferred source),
    // never from client input. Sanitization + length caps live in ProjectService —
    // NOT duplicated here. Capture failure must not discard the computed answer:
    // log and continue.
    if (this.projectService) {
      try {
        const captureCtx = this.service.getCaptureContext(sessionId);
        if (captureCtx) {
          this.projectService.captureSessionAnswer({
            projectPath: captureCtx.projectPath,
            sessionId: answerView.responseId,
            interactionSessionId: sessionId,
            question: question.trim(),
            answer: answerView.content,
            claims: answerView.claims,
            sources: answerView.sources,
          });
        }
      } catch (captureErr) {
        console.error('[MVP-UI] Session answer capture failed:', captureErr instanceof Error ? captureErr.message : String(captureErr));
      }
    }

    this.sendJson(res, 200, {
      responseId: answerView.responseId,
      content: answerView.content,
      sources: answerView.sources,
      claims: answerView.claims,
    });
  }

  /** POST /api/session/:id/feedback — Submit feedback. */
  private async handleSubmitFeedback(sessionId: string, body: unknown, res: ServerResponse): Promise<void> {
    const parsed = this.parseObject(body);
    const verdict = this.requireString(parsed, 'verdict');
    const comment = typeof parsed.comment === 'string' ? parsed.comment : undefined;

    if (!['correct', 'incorrect', 'incomplete'].includes(verdict)) {
      this.sendError(res, 400, 'Verdict must be one of: correct, incorrect, incomplete');
      return;
    }

    const feedbackView = await this.service.submitFeedback({
      sessionId: sessionId as any,
      verdict: verdict as 'correct' | 'incorrect' | 'incomplete',
      comment,
    });

    // TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-3): durable feedback capture
    // (write-through), completed BEFORE the HTTP response is sent. Feedback is
    // addressed by the responseId the evidence loop actually targeted
    // (interaction.lastResponseId) — never by the interaction session id —
    // satisfying §6: feedback(B) must mutate only record B. Sanitization lives
    // in ProjectService — NOT duplicated here. Capture failure is logged, not
    // propagated: the feedback was already recorded by the evidence loop.
    if (this.projectService) {
      try {
        const captureCtx = this.service.getCaptureContext(sessionId);
        if (captureCtx?.lastResponseId) {
          this.projectService.captureSessionFeedback({
            projectPath: captureCtx.projectPath,
            sessionId: captureCtx.lastResponseId,
            verdict,
            comment,
          });
        }
      } catch (captureErr) {
        console.error('[MVP-UI] Session feedback capture failed:', captureErr instanceof Error ? captureErr.message : String(captureErr));
      }
    }

    this.sendJson(res, 200, {
      feedbackId: feedbackView.feedbackId,
      verdict: feedbackView.verdict,
      findingCreated: feedbackView.findingCreated,
    });
  }

  /** GET /api/session/:id/trace — Get session trace. */
  private handleGetTrace(sessionId: string, res: ServerResponse): void {
    const traceView = this.service.getTrace(sessionId);
    this.sendJson(res, 200, traceView);
  }

  /** GET /api/session/:id — Get session state. */
  private handleGetSession(sessionId: string, res: ServerResponse): void {
    const sessionView = this.service.getSessionView(sessionId);
    this.sendJson(res, 200, {
      sessionId: sessionView.sessionId,
      state: sessionView.state,
      createdAt: sessionView.createdAt,
    });
  }

  /** GET /api/demos — List available demo projects. */
  private handleListDemos(res: ServerResponse): void {
    const demos = getAllDemoConfigs().map(d => ({
      name: d.name,
      projectPath: d.projectPath,
      description: d.description,
      suggestedQuestions: d.suggestedQuestions,
    }));
    this.sendJson(res, 200, { demos });
  }

  // ─── PROJECT + INSIGHT HANDLERS ──────────────────────────────

  /** GET /api/project/:id/history */
  private handleGetProjectHistory(projectId: string, res: ServerResponse): void {
    if (!this.projectService) { this.sendError(res, 503, 'Project service not available'); return; }
    const sessions = this.projectService.getSessionHistory(projectId, 20);
    this.sendJson(res, 200, { projectId, sessions });
  }

  /**
   * GET /api/project/:id/continuity — read-only continuity reconstruction
   * (TASK-AIS-CONTINUITY-RECONSTRUCTION-001, S-4.1..S-4.12).
   *
   * READ-ONLY verified: the handler only calls ProjectService.getProjectContinuity,
   * which only calls ProjectStore.findById (a Map read). No ensureProject, no
   * insight lifecycle mutation, no capture*, no persist, no LLM. Missing
   * project → 404 with the deterministic error body convention (§19).
   */
  private handleGetProjectContinuity(projectId: string, res: ServerResponse): void {
    if (!this.projectService) { this.sendError(res, 503, 'Project service not available'); return; }
    const view = this.projectService.getProjectContinuity(projectId);
    if (!view) {
      this.sendError(res, 404, 'Project not found');
      return;
    }
    this.sendJson(res, 200, view);
  }

  /** POST /api/project/:id/insights — Create insight. */
  private async handleCreateInsight(projectId: string, body: unknown, res: ServerResponse): Promise<void> {
    if (!this.insightService) { this.sendError(res, 503, 'Insight service not available'); return; }
    const parsed = this.parseObject(body);
    const text = this.requireString(parsed, 'text');
    if (text.trim().length === 0) { this.sendError(res, 400, 'Insight text must not be empty'); return; }
    if (text.length > 5000) { this.sendError(res, 400, 'Insight text too long (max 5000 chars)'); return; }
    const sessionId = typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined;
    try {
      const insight = this.insightService.createInsight({ projectId, text, sessionId });
      this.sendJson(res, 201, insight);
    } catch (err) {
      this.sendError(res, 400, err instanceof Error ? err.message : 'Bad request');
    }
  }

  /** GET /api/project/:id/insights — List insights. */
  private handleListInsights(projectId: string, res: ServerResponse): void {
    if (!this.insightService) { this.sendError(res, 503, 'Insight service not available'); return; }
    const insights = this.insightService.listInsights(projectId);
    this.sendJson(res, 200, { projectId, insights });
  }

  /** POST /api/project/:id/insights/:iid/evaluate */
  private handleEvaluateInsight(projectId: string, insightId: string, body: unknown, res: ServerResponse): void {
    if (!this.insightService) { this.sendError(res, 503, 'Insight service not available'); return; }
    const parsed = this.parseObject(body);
    const relevance = this.requireNumber(parsed, 'relevance', 0, 1);
    const feasibility = this.requireNumber(parsed, 'feasibility', 0, 1);
    const alignmentStr = this.requireString(parsed, 'goalAlignment');
    const rationale = this.requireString(parsed, 'rationale');
    const validAlignments = Object.values(GoalAlignment) as string[];
    if (!validAlignments.includes(alignmentStr)) {
      this.sendError(res, 400, `goalAlignment must be one of: ${validAlignments.join(', ')}`);
      return;
    }
    try {
      const insight = this.insightService.evaluateInsight({
        projectId, insightId,
        relevance, feasibility,
        goalAlignment: alignmentStr as GoalAlignment,
        rationale,
      });
      this.sendJson(res, 200, insight);
    } catch (err) {
      this.sendError(res, 400, err instanceof Error ? err.message : 'Bad request');
    }
  }

  /** POST /api/project/:id/insights/:iid/decide */
  private handleDecideInsight(projectId: string, insightId: string, body: unknown, res: ServerResponse): void {
    if (!this.insightService) { this.sendError(res, 503, 'Insight service not available'); return; }
    const parsed = this.parseObject(body);
    const decision = this.requireString(parsed, 'decision');
    if (!['IMPLEMENT_NOW', 'DEFER', 'REJECT'].includes(decision)) {
      this.sendError(res, 400, 'decision must be IMPLEMENT_NOW, DEFER, or REJECT');
      return;
    }
    const revisitCondition = typeof parsed.revisitCondition === 'string' ? parsed.revisitCondition : undefined;
    try {
      const insight = this.insightService.decideInsight({
        projectId, insightId,
        decision: decision as 'IMPLEMENT_NOW' | 'DEFER' | 'REJECT',
        revisitCondition,
      });
      this.sendJson(res, 200, insight);
    } catch (err) {
      this.sendError(res, 400, err instanceof Error ? err.message : 'Bad request');
    }
  }

  /** GET /api/project/:id/insights/revisitable */
  private handleGetRevisitableInsights(projectId: string, res: ServerResponse): void {
    if (!this.insightService) { this.sendError(res, 503, 'Insight service not available'); return; }
    const revisitable = this.insightService.checkRevisitability(projectId);
    this.sendJson(res, 200, { projectId, revisitable });
  }

  /** GET /api/project/:id/insights/counts */
  private handleGetInsightCounts(projectId: string, res: ServerResponse): void {
    if (!this.insightService) { this.sendError(res, 503, 'Insight service not available'); return; }
    const counts = this.insightService.getInsightCounts(projectId);
    this.sendJson(res, 200, { projectId, counts });
  }

  /** GET /api/recent — recent sessions + insight summary. */
  private handleGetRecent(res: ServerResponse): void {
    if (!this.projectService || !this.insightService) {
      this.sendError(res, 503, 'Persistence not available');
      return;
    }
    const recentSessions = this.projectService.getRecentSessions(10);
    const projects = this.projectService.getAllProjects();
    const insightSummary = projects.map(p => ({
      projectId: p.id,
      projectName: p.name,
      insightCount: p.insights.length,
    }));
    this.sendJson(res, 200, { recentSessions, insightSummary });
  }

  // ─────────────────────────────────────────────────────────────
  // ROUTE MATCHERS
  // ─────────────────────────────────────────────────────────────

  private matchProjectRoute(path: string): RouteMatch | null {
    const match = path.match(/^\/api\/project\/([^/]+)(?:\/(.+))?$/);
    if (!match) return null;
    return { params: { id: match[1], sub: match[2] ?? '' } };
  }

  private matchInsightRoute(path: string): RouteMatch | null {
    const match = path.match(/^\/api\/project\/([^/]+)\/insights\/([^/]+)(?:\/([^/]+))?$/);
    if (!match) return null;
    return { params: { id: match[1], iid: match[2], sub: match[3] ?? '' } };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  private matchSessionRoute(path: string): RouteMatch | null {
    // Match /api/session/:id and /api/session/:id/:sub
    const match = path.match(/^\/api\/session\/([^/]+)(?:\/([^/]+))?$/);
    if (!match) return null;
    return {
      params: {
        id: match[1],
        sub: match[2] ?? '',
      },
    };
  }

  private setCorsHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', this.corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  private sendError(res: ServerResponse, status: number, message: string): void {
    this.sendJson(res, status, { error: message });
  }

  /** Safely map InteractionLayer errors to HTTP status codes. */
  private mapError(err: unknown): { status: number; message: string } {
    if (err instanceof EmptyQuestionError) {
      return { status: 400, message: 'Question must not be empty' };
    }
    if (err instanceof InteractionStateError) {
      return { status: 409, message: `Invalid state transition: ${err.message}` };
    }
    if (err instanceof InteractionSessionNotFoundError) {
      return { status: 404, message: 'Session not found' };
    }
    if (err instanceof ExecutionFailedError) {
      return { status: 502, message: 'AIS processing failed. Please try again.' };
    }
    if (err instanceof InteractionError) {
      return { status: 400, message: err.message };
    }
    // PathSecurityError or unknown
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return { status: 400, message: msg };
  }

  /** Read request body as JSON. */
  private readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        // Limit body size to 1MB
        const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
        if (totalSize > 1_048_576) {
          reject(new Error('Request body too large'));
          req.destroy();
        }
      });
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (!raw.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error('Invalid JSON in request body'));
        }
      });
      req.on('error', reject);
    });
  }

  private parseObject(body: unknown): Record<string, unknown> {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new Error('Request body must be a JSON object');
    }
    return body as Record<string, unknown>;
  }

  private requireString(obj: Record<string, unknown>, key: string): string {
    const val = obj[key];
    if (typeof val !== 'string') {
      throw new Error(`Missing or invalid field: ${key}`);
    }
    return val;
  }

  private requireNumber(obj: Record<string, unknown>, key: string, min: number, max: number): number {
    const val = obj[key];
    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error(`Missing or invalid field: ${key}`);
    }
    if (val < min || val > max) {
      throw new Error(`Field ${key} must be between ${min} and ${max}`);
    }
    return val;
  }
}
