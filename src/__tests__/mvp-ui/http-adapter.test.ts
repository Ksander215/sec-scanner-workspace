/**
 * HTTP Adapter — Tests
 * TASK-MVP-FREE-UI-001 §36
 *
 * Unit tests: HTTP routing, input validation, error mapping, CORS.
 * Uses a stub InteractionService to isolate HTTP layer behavior.
 * The stub is NOT a mock of AIS inference — it tests HTTP plumbing only.
 *
 * Integration tests (real AIS pipeline) require OPENAI_API_KEY and are
 * documented as BLOCKED — see TASK-MVP-FREE-UI-001 final report.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PathSecurityService } from '../../mvp-ui/path-security.js';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

// ═══════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════

const TMP_DIR = resolve('/tmp/ais-mvp-ui-http-test-' + process.pid);

function createMockInteractionService() {
  return {
    startInteraction: async (params: any) => ({
      sessionId: 'test-session-123',
      state: 'CREATED',
      createdAt: new Date().toISOString(),
    }),
    submitQuestion: async (params: any) => ({
      responseId: 'resp-1',
      content: 'Test answer content.',
      sources: [{ filePath: 'src/index.ts', type: 'code', excerpt: 'export', relevance: 0.9 }],
      claims: [{ claimId: 'claim-1', statement: 'Test claim', evidenceCount: 1, isVerified: false }],
    }),
    submitFeedback: async (params: any) => ({
      feedbackId: 'fb-1',
      verdict: params.verdict,
      findingCreated: params.verdict === 'incorrect',
    }),
    getTrace: (sessionId: string) => ({
      sessionId,
      provenance: 'human',
      question: 'Test question?',
      answer: 'Test answer.',
      claims: [],
      sources: [],
      feedback: [{ feedbackId: 'fb-1', type: 'correct', content: 'Good' }],
      findings: [],
    }),
    getSessionView: (sessionId: string) => ({
      sessionId,
      state: 'CREATED',
      createdAt: new Date().toISOString(),
    }),
  };
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════
// HELPER: make HTTP request to the adapter
// ═══════════════════════════════════════════════════════════════

async function httpRequest(
  adapter: any,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any; headers: Headers }> {
  // Use actual HTTP since the adapter creates a real server
  const port = adapter.actualPort;
  const url = `http://127.0.0.1:${port}${path}`;
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const data = await res.json();
    return { status: res.status, data, headers: res.headers };
  } catch (err: any) {
    return { status: 0, data: { error: err.message }, headers: new Headers() };
  }
}

async function createTestAdapter(service: any, options?: { realInferenceAvailable?: boolean }) {
  const pathSecurity = new PathSecurityService({
    allowedRoots: [TMP_DIR],
    demoAllowlist: [TMP_DIR],
  });

  // Create a minimal SPA file for the adapter to load
  const { writeFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const spaPath = resolve(TMP_DIR, 'index.html');
  writeFileSync(spaPath, '<html><body>test</body></html>');

  // Import dynamically to avoid circular issues
  const { HttpAdapter } = await import('../../mvp-ui/http-adapter.js');
  const adapter = new HttpAdapter({
    interactionService: service,
    pathSecurity,
    port: 0, // let OS pick
    spaPath,
    realInferenceAvailable: options?.realInferenceAvailable ?? true,
  });
  await adapter.start();
  return adapter;
}

// ═══════════════════════════════════════════════════════════════
// ROUTING TESTS
// ═══════════════════════════════════════════════════════════════

describe('HttpAdapter — Routing', () => {
  it('GET / returns SPA HTML', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await fetch(`http://127.0.0.1:${adapter.actualPort}/`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('test');
    } finally {
      await adapter.stop();
    }
  });

  it('GET /api/demos returns demo list', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'GET', '/api/demos');
      expect(res.status).toBe(200);
      expect(res.data.demos).toBeDefined();
      expect(res.data.demos.length).toBeGreaterThan(0);
    } finally {
      await adapter.stop();
    }
  });

  it('GET /api/nonexistent returns 404', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'GET', '/api/nonexistent');
      expect(res.status).toBe(404);
    } finally {
      await adapter.stop();
    }
  });

  it('CORS headers are present', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'GET', '/api/demos');
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-methods')).toContain('GET');
      expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    } finally {
      await adapter.stop();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// API ENDPOINT TESTS
// ═══════════════════════════════════════════════════════════════

describe('HttpAdapter — POST /api/session', () => {
  it('creates session with valid demo path', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'POST', '/api/session', {
        projectPath: TMP_DIR,
        isDemo: true,
      });
      expect(res.status).toBe(201);
      expect(res.data.sessionId).toBe('test-session-123');
      expect(res.data.state).toBe('CREATED');
    } finally {
      await adapter.stop();
    }
  });

  it('rejects missing projectPath', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'POST', '/api/session', {});
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('projectPath');
    } finally {
      await adapter.stop();
    }
  });

  it('rejects invalid path', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'POST', '/api/session', {
        projectPath: '/nonexistent/path',
      });
      expect(res.status).toBe(400);
    } finally {
      await adapter.stop();
    }
  });
});

describe('HttpAdapter — POST /api/session/:id/question', () => {
  it('submits question and returns answer (realInferenceAvailable=true)', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc, { realInferenceAvailable: true });
    try {
      const res = await httpRequest(adapter, 'POST', '/api/session/test-123/question', {
        question: 'What is the architecture?',
      });
      expect(res.status).toBe(200);
      expect(res.data.content).toBe('Test answer content.');
      expect(res.data.sources.length).toBe(1);
      expect(res.data.claims.length).toBe(1);
    } finally {
      await adapter.stop();
    }
  });

  it('rejects empty question', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc, { realInferenceAvailable: true });
    try {
      const res = await httpRequest(adapter, 'POST', '/api/session/test-123/question', {
        question: '   ',
      });
      expect(res.status).toBe(400);
    } finally {
      await adapter.stop();
    }
  });

  it('returns 503 when realInferenceAvailable=false (§8, §13 DEMO!=FAKE)', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc, { realInferenceAvailable: false });
    try {
      const res = await httpRequest(adapter, 'POST', '/api/session/test-123/question', {
        question: 'What is the architecture?',
      });
      expect(res.status).toBe(503);
      expect(res.data.error).toContain('Real inference is not available');
      expect(res.data.error).toContain('AIS_EXECUTION_REAL');
      expect(res.data.error).toContain('OPENAI_API_KEY');
    } finally {
      await adapter.stop();
    }
  });

  it('503 is returned before input validation (no leak of internal behavior)', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc, { realInferenceAvailable: false });
    try {
      // Empty question + no inference → 503, NOT 400
      const res = await httpRequest(adapter, 'POST', '/api/session/test-123/question', {
        question: '',
      });
      expect(res.status).toBe(503);
    } finally {
      await adapter.stop();
    }
  });
});

describe('HttpAdapter — POST /api/session/:id/feedback', () => {
  it('submits correct feedback', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'POST', '/api/session/test-123/feedback', {
        verdict: 'correct',
        comment: 'Looks good!',
      });
      expect(res.status).toBe(200);
      expect(res.data.verdict).toBe('correct');
      expect(res.data.findingCreated).toBe(false);
    } finally {
      await adapter.stop();
    }
  });

  it('rejects invalid verdict', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'POST', '/api/session/test-123/feedback', {
        verdict: 'maybe',
      });
      expect(res.status).toBe(400);
    } finally {
      await adapter.stop();
    }
  });
});

describe('HttpAdapter — GET /api/session/:id/trace', () => {
  it('returns trace', async () => {
    const svc = createMockInteractionService();
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'GET', '/api/session/test-123/trace');
      expect(res.status).toBe(200);
      expect(res.data.sessionId).toBe('test-123');
      expect(res.data.question).toBe('Test question?');
    } finally {
      await adapter.stop();
    }
  });
});

describe('HttpAdapter — Error Mapping', () => {
  it('maps InteractionSessionNotFoundError to 404', async () => {
    const { InteractionSessionNotFoundError } = await import('../../core/interaction-layer/errors.js');
    const svc = {
      ...createMockInteractionService(),
      getTrace: () => { throw new InteractionSessionNotFoundError('not-found'); },
    };
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'GET', '/api/session/missing/trace');
      expect(res.status).toBe(404);
      expect(res.data.error).toContain('not found');
    } finally {
      await adapter.stop();
    }
  });

  it('maps unknown errors to safe message', async () => {
    const svc = {
      ...createMockInteractionService(),
      getTrace: () => { throw new Error('Internal leak'); },
    };
    const adapter = await createTestAdapter(svc);
    try {
      const res = await httpRequest(adapter, 'GET', '/api/session/test/trace');
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Internal leak');
      // No stack trace
      expect(res.data.error).not.toContain('at ');
    } finally {
      await adapter.stop();
    }
  });
});
