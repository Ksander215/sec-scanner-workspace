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
 *   POST   /api/session              → startInteraction
 *   POST   /api/session/:id/question  → submitQuestion
 *   POST   /api/session/:id/feedback  → submitFeedback
 *   GET    /api/session/:id/trace     → getTrace
 *   GET    /api/session/:id           → getSessionView
 *   GET    /api/demos                 → list demo projects
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
import { getAllDemoConfigs } from './demo-config.js';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface HttpAdapterConfig {
  readonly interactionService: InteractionService;
  readonly pathSecurity: PathSecurityService;
  readonly port?: number;
  readonly corsOrigin?: string;
  readonly spaPath?: string;
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
  private readonly port: number;
  private readonly corsOrigin: string;
  private readonly spaHtml: string;
  private server: Server | null = null;

  constructor(config: HttpAdapterConfig) {
    this.service = config.interactionService;
    this.pathSecurity = config.pathSecurity;
    this.port = config.port ?? 3456;
    this.corsOrigin = config.corsOrigin ?? '*';

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
      if (!sessionMatch) {
        this.sendError(res, 404, 'Not found');
        return;
      }

      const sessionId = sessionMatch.params.id;
      const subPath = sessionMatch.params.sub ?? '';

      // GET /api/session/:id
      if (method === 'GET' && !subPath) {
        this.handleGetSession(sessionId, res);
        return;
      }

      // GET /api/session/:id/trace
      if (method === 'GET' && subPath === 'trace') {
        this.handleGetTrace(sessionId, res);
        return;
      }

      // POST /api/session/:id/question
      if (method === 'POST' && subPath === 'question') {
        const body = await this.readBody(req);
        await this.handleSubmitQuestion(sessionId, body, res);
        return;
      }

      // POST /api/session/:id/feedback
      if (method === 'POST' && subPath === 'feedback') {
        const body = await this.readBody(req);
        await this.handleSubmitFeedback(sessionId, body, res);
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
      this.sendError(res, mapped.status, mapped.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────

  /** POST /api/session — Start a new interaction session. */
  private async handleStartSession(body: unknown, res: ServerResponse): Promise<void> {
    const parsed = this.parseObject(body);
    const rawPath = this.requireString(parsed, 'projectPath');
    const isDemo = parsed.isDemo === true;
    const provenance = (parsed.provenance as 'human' | 'synthetic') ?? 'human';

    // Validate project path (S-01, S-02, S-03)
    const projectPath = this.pathSecurity.validateProjectPath(rawPath, { isDemo });

    const sessionView = await this.service.startInteraction({
      projectPath,
      provenance,
    });

    this.sendJson(res, 201, {
      sessionId: sessionView.sessionId,
      state: sessionView.state,
      createdAt: sessionView.createdAt,
    });
  }

  /** POST /api/session/:id/question — Submit a question. */
  private async handleSubmitQuestion(sessionId: string, body: unknown, res: ServerResponse): Promise<void> {
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
}
