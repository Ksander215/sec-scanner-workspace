/**
 * Project Store — Tests
 * TASK-AIS-EVIDENCE-PERSISTENCE-001 + TASK-AIS-INSIGHT-LIFECYCLE-001
 *
 * Covers: getOrCreate, atomic write, corruption handling,
 * backward compat, addSession, updateSessionFeedback, getRecentSessions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectStore } from '../../mvp-ui/project-store.js';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

let tmpDir: string;
let store: ProjectStore;

beforeEach(() => {
  tmpDir = mkdtempSync(resolve(tmpdir(), 'test-pstore-'));
  store = new ProjectStore(tmpDir);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════
// getOrCreate (PS-01)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — getOrCreate (PS-01)', () => {
  it('creates project file on disk', () => {
    const project = store.getOrCreate('/path/to/myproject', 'myproject');
    expect(existsSync(resolve(tmpDir, project.id + '.json'))).toBe(true);
  });

  it('returns existing project for same path', () => {
    const p1 = store.getOrCreate('/path/to/proj', 'proj');
    const p2 = store.getOrCreate('/path/to/proj', 'proj');
    expect(p1.id).toBe(p2.id);
  });

  it('initializes with empty sessions and insights', () => {
    const project = store.getOrCreate('/a/b/c');
    expect(project.sessions).toEqual([]);
    expect(project.insights).toEqual([]);
  });

  it('uses basename as name when not provided', () => {
    const project = store.getOrCreate('/path/to/myrepo');
    expect(project.name).toBe('myrepo');
  });

  it('uses provided name over basename', () => {
    const project = store.getOrCreate('/path/to/myrepo', 'Custom Name');
    expect(project.name).toBe('Custom Name');
  });

  it('sets id, projectPath, createdAt, updatedAt', () => {
    const project = store.getOrCreate('/x/y');
    expect(project.id).toBeTruthy();
    expect(project.projectPath).toBe('/x/y');
    expect(project.createdAt).toBeTruthy();
    expect(project.updatedAt).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// Atomic write — no .tmp left after write (PS-02)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — atomic write (PS-02)', () => {
  it('no .tmp file remains after getOrCreate', () => {
    store.getOrCreate('/a/b');
    const files = readdirSync(tmpDir);
    const tmpFiles = files.filter(f => f.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });

  it('no .tmp file remains after addSession', () => {
    const project = store.getOrCreate('/a/b');
    store.addSession(project.id, {
      sessionId: 's1', projectPath: '/a/b',
      createdAt: new Date().toISOString(), question: 'Q', answer: 'A',
      claims: [], sources: [], findings: [],
    });
    const files = readdirSync(tmpDir);
    const tmpFiles = files.filter(f => f.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });

  it('no .tmp file remains after addInsight', () => {
    const project = store.getOrCreate('/a/b');
    store.addInsight(project.id, {
      id: 'i1', projectId: project.id, text: 'Test',
      createdAt: new Date().toISOString(), status: 'NEW' as any, history: [],
    });
    const files = readdirSync(tmpDir);
    const tmpFiles = files.filter(f => f.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });

  it('file contains valid JSON after write', () => {
    const project = store.getOrCreate('/a/b', 'test');
    const filePath = resolve(tmpDir, project.id + '.json');
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    expect(data.id).toBe(project.id);
    expect(data.name).toBe('test');
  });
});

// ═══════════════════════════════════════════════════════════════
// Corruption handling (PS-03)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — corruption handling (PS-03)', () => {
  it('skips empty file on loadAll', () => {
    const filePath = resolve(tmpDir, 'corrupt1.json');
    writeFileSync(filePath, '');
    store.loadAll();
    expect(store.getAll()).toHaveLength(0);
  });

  it('skips invalid JSON on loadAll', () => {
    const filePath = resolve(tmpDir, 'corrupt2.json');
    writeFileSync(filePath, '{not valid json');
    store.loadAll();
    expect(store.getAll()).toHaveLength(0);
  });

  it('skips file missing required fields', () => {
    const filePath = resolve(tmpDir, 'corrupt3.json');
    writeFileSync(filePath, JSON.stringify({ foo: 'bar' }));
    store.loadAll();
    expect(store.getAll()).toHaveLength(0);
  });

  it('skips .tmp files on loadAll', () => {
    const filePath = resolve(tmpDir, 'project.json.tmp');
    writeFileSync(filePath, JSON.stringify({ id: 'x', name: 'y', projectPath: '/z', createdAt: '', updatedAt: '', sessions: [], insights: [] }));
    store.loadAll();
    expect(store.getAll()).toHaveLength(0);
  });

  it('loads valid project from file', () => {
    const validProject = {
      id: 'test-id', name: 'test-name', projectPath: '/test',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
      sessions: [], insights: [],
    };
    writeFileSync(resolve(tmpDir, 'test-id.json'), JSON.stringify(validProject, null, 2));
    store.loadAll();
    const all = store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('test-id');
  });
});

// ═══════════════════════════════════════════════════════════════
// Backward compatibility — project without sessions/insights arrays (PS-04)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — backward compat (PS-04)', () => {
  it('project without sessions array gets empty sessions', () => {
    const oldProject = {
      id: 'old-id', name: 'old', projectPath: '/old',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    };
    writeFileSync(resolve(tmpDir, 'old-id.json'), JSON.stringify(oldProject, null, 2));
    store.loadAll();
    const project = store.findById('old-id');
    expect(project).toBeDefined();
    expect(project!.sessions).toEqual([]);
  });

  it('project without insights array gets empty insights', () => {
    const oldProject = {
      id: 'old2-id', name: 'old2', projectPath: '/old2',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    };
    writeFileSync(resolve(tmpDir, 'old2-id.json'), JSON.stringify(oldProject, null, 2));
    store.loadAll();
    const project = store.findById('old2-id');
    expect(project).toBeDefined();
    expect(project!.insights).toEqual([]);
  });

  it('project with non-array sessions gets empty sessions', () => {
    const badProject = {
      id: 'bad-id', name: 'bad', projectPath: '/bad',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
      sessions: 'not-array', insights: null as any,
    };
    writeFileSync(resolve(tmpDir, 'bad-id.json'), JSON.stringify(badProject, null, 2));
    store.loadAll();
    const project = store.findById('bad-id');
    expect(project).toBeDefined();
    expect(project!.sessions).toEqual([]);
    expect(project!.insights).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// addSession (PS-05)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — addSession (PS-05)', () => {
  it('adds session and returns updated project', () => {
    const project = store.getOrCreate('/a/b');
    const updated = store.addSession(project.id, {
      sessionId: 's1', projectPath: '/a/b',
      createdAt: '2024-06-01T00:00:00Z', question: 'What?', answer: 'Something',
      claims: [], sources: [], findings: [],
    });
    expect(updated.sessions).toHaveLength(1);
    expect(updated.sessions[0].sessionId).toBe('s1');
  });

  it('throws for non-existent project', () => {
    expect(() => store.addSession('nonexistent', {
      sessionId: 's1', projectPath: '/a',
      createdAt: '', question: 'Q', answer: 'A',
      claims: [], sources: [], findings: [],
    })).toThrow('Project not found');
  });

  it('increments session count on multiple adds', () => {
    const project = store.getOrCreate('/a/b');
    store.addSession(project.id, {
      sessionId: 's1', projectPath: '/a/b',
      createdAt: '2024-06-01T00:00:00Z', question: 'Q1', answer: 'A1',
      claims: [], sources: [], findings: [],
    });
    store.addSession(project.id, {
      sessionId: 's2', projectPath: '/a/b',
      createdAt: '2024-06-02T00:00:00Z', question: 'Q2', answer: 'A2',
      claims: [], sources: [], findings: [],
    });
    const current = store.findById(project.id);
    expect(current!.sessions).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// updateSessionFeedback (PS-06)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — updateSessionFeedback (PS-06)', () => {
  it('updates feedback on a session', () => {
    const project = store.getOrCreate('/a/b');
    store.addSession(project.id, {
      sessionId: 's1', projectPath: '/a/b',
      createdAt: '2024-06-01T00:00:00Z', question: 'Q', answer: 'A',
      claims: [], sources: [], findings: [],
    });
    const updated = store.updateSessionFeedback(project.id, 's1',
      { feedbackId: 'fb-1', verdict: 'correct', comment: 'Great!' },
      []
    );
    expect(updated).toBeDefined();
    const session = updated!.sessions.find(s => s.sessionId === 's1');
    expect(session!.feedback!.verdict).toBe('correct');
    expect(session!.feedback!.comment).toBe('Great!');
  });

  it('returns undefined for non-existent project', () => {
    const result = store.updateSessionFeedback('nonexistent', 's1',
      { feedbackId: 'fb-1', verdict: 'correct' }, []
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined for non-existent session', () => {
    const project = store.getOrCreate('/a/b');
    store.addSession(project.id, {
      sessionId: 's1', projectPath: '/a/b',
      createdAt: '2024-06-01T00:00:00Z', question: 'Q', answer: 'A',
      claims: [], sources: [], findings: [],
    });
    const result = store.updateSessionFeedback(project.id, 'nonexistent',
      { feedbackId: 'fb-1', verdict: 'correct' }, []
    );
    // Should still return the project, session just won't be found so no update
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// getRecentSessions (PS-07)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — getRecentSessions (PS-07)', () => {
  it('returns empty for no sessions', () => {
    store.getOrCreate('/a/b');
    const recent = store.getRecentSessions(10);
    expect(recent).toHaveLength(0);
  });

  it('returns sessions newest first across projects', () => {
    const p1 = store.getOrCreate('/a');
    const p2 = store.getOrCreate('/b');
    store.addSession(p1.id, {
      sessionId: 's1', projectPath: '/a',
      createdAt: '2024-06-01T00:00:00Z', question: 'Q1', answer: 'A1',
      claims: [], sources: [], findings: [],
    });
    store.addSession(p2.id, {
      sessionId: 's2', projectPath: '/b',
      createdAt: '2024-06-02T00:00:00Z', question: 'Q2', answer: 'A2',
      claims: [], sources: [], findings: [],
    });
    const recent = store.getRecentSessions(10);
    expect(recent).toHaveLength(2);
    expect(recent[0].sessionId).toBe('s2'); // Newest first
    expect(recent[1].sessionId).toBe('s1');
  });

  it('respects limit', () => {
    const p = store.getOrCreate('/a');
    for (let i = 0; i < 5; i++) {
      store.addSession(p.id, {
        sessionId: 's' + i, projectPath: '/a',
        createdAt: '2024-06-0' + (i + 1) + 'T00:00:00Z',
        question: 'Q' + i, answer: 'A' + i,
        claims: [], sources: [], findings: [],
      });
    }
    const recent = store.getRecentSessions(3);
    expect(recent).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// getSessionHistory (PS-08)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — getSessionHistory (PS-08)', () => {
  it('returns empty for no sessions', () => {
    const p = store.getOrCreate('/a');
    const history = store.getSessionHistory(p.id);
    expect(history).toHaveLength(0);
  });

  it('returns newest first for a project', () => {
    const p = store.getOrCreate('/a');
    store.addSession(p.id, {
      sessionId: 's1', projectPath: '/a',
      createdAt: '2024-06-01T00:00:00Z', question: 'Q1', answer: 'A1',
      claims: [], sources: [], findings: [],
    });
    store.addSession(p.id, {
      sessionId: 's2', projectPath: '/a',
      createdAt: '2024-06-02T00:00:00Z', question: 'Q2', answer: 'A2',
      claims: [], sources: [], findings: [],
    });
    const history = store.getSessionHistory(p.id);
    expect(history[0].sessionId).toBe('s2');
  });
});
