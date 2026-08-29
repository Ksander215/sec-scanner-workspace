/**
 * Insight Lifecycle — Tests
 * TASK-AIS-INSIGHT-LIFECYCLE-001
 *
 * Covers: InsightService create, evaluate, decide, status transitions,
 * invalid transitions, secret sanitization, context snapshot, revisitability, counts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectStore } from '../../mvp-ui/project-store.js';
import { InsightService } from '../../mvp-ui/insight-service.js';
import { InsightStatus, GoalAlignment } from '../../mvp-ui/project-types.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

let tmpDir: string;
let store: ProjectStore;
let service: InsightService;
let projectId: string;

beforeEach(() => {
  tmpDir = mkdtempSync(resolve(tmpdir(), 'test-insight-'));
  store = new ProjectStore(tmpDir);
  service = new InsightService(store);
  const project = store.getOrCreate('/test/project', 'test-project');
  projectId = project.id;
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════
// InsightService: create
// ═══════════════════════════════════════════════════════════════

describe('InsightService — create (IS-01)', () => {
  it('creates insight with NEW status', () => {
    const insight = service.createInsight({ projectId, text: 'Test insight' });
    expect(insight.status).toBe(InsightStatus.NEW);
    expect(insight.text).toBe('Test insight');
    expect(insight.projectId).toBe(projectId);
    expect(insight.history).toHaveLength(1);
    expect(insight.history[0].action).toBe('CREATED');
    expect(insight.id).toBeTruthy();
  });

  it('creates insight with optional sessionId', () => {
    const insight = service.createInsight({ projectId, text: 'Test', sessionId: 'sess-123' });
    expect(insight.sessionId).toBe('sess-123');
  });

  it('captures context snapshot on creation', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    expect(insight.contextSnapshot).toBeDefined();
    expect(typeof insight.contextSnapshot!.sessionCount).toBe('number');
    expect(typeof insight.contextSnapshot!.insightCount).toBe('number');
  });

  it('trims whitespace from text', () => {
    const insight = service.createInsight({ projectId, text: '  hello world  ' });
    expect(insight.text).toBe('hello world');
  });

  it('rejects empty text', () => {
    expect(() => service.createInsight({ projectId, text: '' })).toThrow('must not be empty');
  });

  it('rejects whitespace-only text', () => {
    expect(() => service.createInsight({ projectId, text: '   \t  \n  ' })).toThrow('must not be empty');
  });
});

// ═══════════════════════════════════════════════════════════════
// InsightService: evaluate
// ═══════════════════════════════════════════════════════════════

describe('InsightService — evaluate (IS-02)', () => {
  it('transitions NEW -> EVALUATING and sets fields', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    const evaluated = service.evaluateInsight({
      projectId, insightId: insight.id,
      relevance: 0.8, feasibility: 0.9,
      goalAlignment: GoalAlignment.HIGH, rationale: 'Good idea',
    });
    expect(evaluated.status).toBe(InsightStatus.EVALUATING);
    expect(evaluated.relevance).toBe(0.8);
    expect(evaluated.feasibility).toBe(0.9);
    expect(evaluated.goalAlignment).toBe(GoalAlignment.HIGH);
    expect(evaluated.rationale).toBe('Good idea');
    expect(evaluated.history).toHaveLength(2);
    expect(evaluated.history[1].action).toBe('EVALUATED');
  });

  it('rejects evaluate for wrong status', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    // Directly make it ACTIVE via store
    store.updateInsight(projectId, insight.id, { status: InsightStatus.ACTIVE } as any);
    expect(() => service.evaluateInsight({
      projectId, insightId: insight.id,
      relevance: 0.5, feasibility: 0.5,
      goalAlignment: GoalAlignment.MEDIUM, rationale: 'test',
    })).toThrow('Invalid insight transition');
  });

  it('throws for non-existent insight', () => {
    expect(() => service.evaluateInsight({
      projectId, insightId: 'nonexistent',
      relevance: 0.5, feasibility: 0.5,
      goalAlignment: GoalAlignment.MEDIUM, rationale: 'test',
    })).toThrow('Insight not found');
  });
});

// ═══════════════════════════════════════════════════════════════
// InsightService: decide
// ═══════════════════════════════════════════════════════════════

describe('InsightService — decide (IS-03)', () => {
  it('IMPLEMENT_NOW transitions to ACTIVE', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    service.evaluateInsight({
      projectId, insightId: insight.id,
      relevance: 0.9, feasibility: 0.9,
      goalAlignment: GoalAlignment.HIGH, rationale: 'Do it',
    });
    const decided = service.decideInsight({
      projectId, insightId: insight.id, decision: 'IMPLEMENT_NOW',
    });
    expect(decided.status).toBe(InsightStatus.ACTIVE);
    expect(decided.userDecision).toBe('IMPLEMENT_NOW');
    expect(decided.decisionAt).toBeTruthy();
  });

  it('DEFER transitions to DEFERRED with revisitCondition (from ACTIVE)', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    service.evaluateInsight({
      projectId, insightId: insight.id,
      relevance: 0.3, feasibility: 0.5,
      goalAlignment: GoalAlignment.LOW, rationale: 'Not now',
    });
    // Must go through ACTIVE first (IMPLEMENT_NOW), then DEFER from ACTIVE
    service.decideInsight({ projectId, insightId: insight.id, decision: 'IMPLEMENT_NOW' });
    const decided = service.decideInsight({
      projectId, insightId: insight.id, decision: 'DEFER',
      revisitCondition: 'After v2.0',
    });
    expect(decided.status).toBe(InsightStatus.DEFERRED);
    expect(decided.userDecision).toBe('DEFER');
    expect(decided.revisitCondition).toBe('After v2.0');
  });

  it('REJECT transitions to REJECTED', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    service.evaluateInsight({
      projectId, insightId: insight.id,
      relevance: 0.1, feasibility: 0.2,
      goalAlignment: GoalAlignment.NOT_APPLICABLE, rationale: 'Bad idea',
    });
    const decided = service.decideInsight({
      projectId, insightId: insight.id, decision: 'REJECT',
    });
    expect(decided.status).toBe(InsightStatus.REJECTED);
    expect(decided.userDecision).toBe('REJECT');
  });
});

// ═══════════════════════════════════════════════════════════════
// Status transitions (IS-04)
// ═══════════════════════════════════════════════════════════════

describe('InsightService — status transitions (IS-04)', () => {
  it('INVALIDATED is terminal', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    const invalidated = service.updateStatus({
      projectId, insightId: insight.id,
      newStatus: InsightStatus.INVALIDATED, detail: 'test',
    });
    expect(invalidated.status).toBe(InsightStatus.INVALIDATED);
    expect(() => service.updateStatus({
      projectId, insightId: insight.id,
      newStatus: InsightStatus.ACTIVE,
    })).toThrow('Invalid insight transition');
  });

  it('NEW can go to EVALUATING, REJECTED, or INVALIDATED', () => {
    const i1 = service.createInsight({ projectId, text: 'Test 1' });
    const i2 = service.createInsight({ projectId, text: 'Test 2' });
    const i3 = service.createInsight({ projectId, text: 'Test 3' });

    // NEW -> EVALUATING via evaluateInsight
    expect(() => service.evaluateInsight({
      projectId, insightId: i1.id, relevance: 0.5, feasibility: 0.5,
      goalAlignment: GoalAlignment.MEDIUM, rationale: 'r',
    })).not.toThrow();

    // NEW -> REJECTED is valid (REJECTED is in VALID_TRANSITIONS[NEW])
    const rejected = service.updateStatus({
      projectId, insightId: i2.id, newStatus: InsightStatus.REJECTED,
    });
    expect(rejected.status).toBe(InsightStatus.REJECTED);

    // NEW -> INVALIDATED
    const invalidated = service.updateStatus({
      projectId, insightId: i3.id, newStatus: InsightStatus.INVALIDATED,
    });
    expect(invalidated.status).toBe(InsightStatus.INVALIDATED);
  });

  it('ACTIVE can transition to TESTING', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    service.evaluateInsight({
      projectId, insightId: insight.id, relevance: 0.9, feasibility: 0.9,
      goalAlignment: GoalAlignment.HIGH, rationale: 'test',
    });
    service.decideInsight({ projectId, insightId: insight.id, decision: 'IMPLEMENT_NOW' });
    const testing = service.updateStatus({
      projectId, insightId: insight.id, newStatus: InsightStatus.TESTING,
    });
    expect(testing.status).toBe(InsightStatus.TESTING);
  });

  it('TESTING -> VALIDATED -> IMPLEMENTED path works', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    service.evaluateInsight({
      projectId, insightId: insight.id, relevance: 1, feasibility: 1,
      goalAlignment: GoalAlignment.HIGH, rationale: 'r',
    });
    service.decideInsight({ projectId, insightId: insight.id, decision: 'IMPLEMENT_NOW' });
    service.updateStatus({ projectId, insightId: insight.id, newStatus: InsightStatus.TESTING });
    const validated = service.updateStatus({
      projectId, insightId: insight.id, newStatus: InsightStatus.VALIDATED,
    });
    expect(validated.status).toBe(InsightStatus.VALIDATED);
    const implemented = service.updateStatus({
      projectId, insightId: insight.id, newStatus: InsightStatus.IMPLEMENTED,
    });
    expect(implemented.status).toBe(InsightStatus.IMPLEMENTED);
  });

  it('invalid transition throws', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    expect(() => service.updateStatus({
      projectId, insightId: insight.id, newStatus: InsightStatus.IMPLEMENTED,
    })).toThrow('Invalid insight transition');
  });
});

// ═══════════════════════════════════════════════════════════════
// Secret sanitization (IS-05)
// ═══════════════════════════════════════════════════════════════

describe('InsightService — secret sanitization (IS-05)', () => {
  it('redacts API key from insight text', () => {
    const insight = service.createInsight({
      projectId, text: 'Use sk-abc123456789012345678901234567 for auth',
    });
    expect(insight.text).not.toContain('sk-abc');
    expect(insight.text).toContain('[REDACTED:secret]');
  });

  it('redacts Bearer tokens', () => {
    const insight = service.createInsight({
      projectId, text: 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890',
    });
    expect(insight.text).not.toContain('Bearer abcdef');
    expect(insight.text).toContain('[REDACTED:secret]');
  });

  it('redacts GitHub PAT', () => {
    const insight = service.createInsight({
      projectId, text: 'Token: ghp_' + 'a'.repeat(36),
    });
    expect(insight.text).not.toContain('ghp_');
    expect(insight.text).toContain('[REDACTED:secret]');
  });

  it('redacts secrets from rationale', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    const evaluated = service.evaluateInsight({
      projectId, insightId: insight.id, relevance: 0.5, feasibility: 0.5,
      goalAlignment: GoalAlignment.MEDIUM,
      rationale: 'Use sk-key123456789012345678901234567 for API',
    });
    expect(evaluated.rationale).not.toContain('sk-key');
    expect(evaluated.rationale).toContain('[REDACTED:secret]');
  });

  it('redacts secrets from revisitCondition', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    service.evaluateInsight({
      projectId, insightId: insight.id, relevance: 0.3, feasibility: 0.5,
      goalAlignment: GoalAlignment.LOW, rationale: 'test',
    });
    // Must go through ACTIVE first, then DEFER (EVALUATING -> DEFERRED is not valid)
    service.decideInsight({ projectId, insightId: insight.id, decision: 'IMPLEMENT_NOW' });
    const decided = service.decideInsight({
      projectId, insightId: insight.id, decision: 'DEFER',
      revisitCondition: 'When sk-key123456789012345678901234567 is rotated',
    });
    expect(decided.revisitCondition).not.toContain('sk-key');
    expect(decided.revisitCondition).toContain('[REDACTED:secret]');
  });
});

// ═══════════════════════════════════════════════════════════════
// ProjectStore: insight operations (IS-06)
// ═══════════════════════════════════════════════════════════════

describe('ProjectStore — insight operations (IS-06)', () => {
  it('addInsight persists and returns updated project', () => {
    const insight: any = {
      id: 'ins-1', projectId, text: 'Test',
      createdAt: new Date().toISOString(), status: InsightStatus.NEW, history: [],
    };
    const updated = store.addInsight(projectId, insight);
    expect(updated.insights).toHaveLength(1);
  });

  it('updateInsight patches fields', () => {
    const insight: any = {
      id: 'ins-2', projectId, text: 'Test',
      createdAt: new Date().toISOString(), status: InsightStatus.NEW, history: [],
    };
    store.addInsight(projectId, insight);
    const updated = store.updateInsight(projectId, 'ins-2', { status: InsightStatus.EVALUATING } as any);
    expect(updated!.insights.find((i: any) => i.id === 'ins-2')!.status).toBe(InsightStatus.EVALUATING);
  });

  it('getInsight returns the insight', () => {
    const insight: any = {
      id: 'ins-3', projectId, text: 'Test',
      createdAt: new Date().toISOString(), status: InsightStatus.NEW, history: [],
    };
    store.addInsight(projectId, insight);
    const found = store.getInsight(projectId, 'ins-3');
    expect(found).toBeDefined();
    expect(found!.id).toBe('ins-3');
  });

  it('getRevisitableInsights filters by REVISITABLE status', () => {
    const insights = [
      { id: 'ins-a', projectId, text: 'A', createdAt: new Date().toISOString(), status: InsightStatus.REVISITABLE, history: [] } as any,
      { id: 'ins-b', projectId, text: 'B', createdAt: new Date().toISOString(), status: InsightStatus.NEW, history: [] } as any,
      { id: 'ins-c', projectId, text: 'C', createdAt: new Date().toISOString(), status: InsightStatus.REVISITABLE, history: [] } as any,
    ];
    for (const i of insights) store.addInsight(projectId, i);
    const revisitable = store.getRevisitableInsights(projectId);
    expect(revisitable).toHaveLength(2);
    expect(revisitable.every(i => i.status === 'REVISITABLE')).toBe(true);
  });

  it('updateInsight for non-existent project returns undefined', () => {
    const result = store.updateInsight('nonexistent', 'ins-x', { status: InsightStatus.NEW } as any);
    expect(result).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// Context snapshot & revisitability (IS-07)
// ═══════════════════════════════════════════════════════════════

describe('InsightService — context snapshot & revisitability (IS-07)', () => {
  it('checkRevisitability returns empty when no deferred insights', () => {
    service.createInsight({ projectId, text: 'Test' });
    const revisitable = service.checkRevisitability(projectId);
    expect(revisitable).toHaveLength(0);
  });

  it('DEFERRED insight becomes REVISITABLE when context changes', () => {
    // Create insight and defer it (NEW -> EVALUATING -> ACTIVE -> DEFERRED)
    const insight = service.createInsight({ projectId, text: 'Test' });
    service.evaluateInsight({
      projectId, insightId: insight.id, relevance: 0.3, feasibility: 0.5,
      goalAlignment: GoalAlignment.LOW, rationale: 'test',
    });
    service.decideInsight({ projectId, insightId: insight.id, decision: 'IMPLEMENT_NOW' });
    service.decideInsight({ projectId, insightId: insight.id, decision: 'DEFER' });

    // Add a session to change context
    const project = store.getOrCreate('/test/project', 'test-project');
    store.addSession(projectId, {
      sessionId: 'sess-1', projectPath: '/test/project',
      createdAt: new Date().toISOString(), question: 'Q', answer: 'A',
      claims: [], sources: [], findings: [],
    });

    const revisitable = service.checkRevisitability(projectId);
    // Context changed: sessionCount went from 0 to 1, so the deferred insight should become revisitable
    expect(revisitable).toHaveLength(1);
    expect(revisitable[0].status).toBe(InsightStatus.REVISITABLE);
  });

  it('context snapshot is captured at creation time', () => {
    // Snapshot is built before addInsight, so insightCount is 0 at creation
    const insight = service.createInsight({ projectId, text: 'Test' });
    expect(insight.contextSnapshot).toBeDefined();
    expect(insight.contextSnapshot!.sessionCount).toBe(0);
    // After creation, insightCount in snapshot is 0 (captured before insert)
    expect(insight.contextSnapshot!.insightCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Insight counts (IS-08)
// ═══════════════════════════════════════════════════════════════

describe('InsightService — insight counts (IS-08)', () => {
  it('returns empty counts for project with no insights', () => {
    const counts = service.getInsightCounts(projectId);
    expect(counts).toEqual({});
  });

  it('counts insights by status', () => {
    service.createInsight({ projectId, text: 'A' });
    service.createInsight({ projectId, text: 'B' });
    service.createInsight({ projectId, text: 'C' });
    const counts = service.getInsightCounts(projectId);
    expect(counts[InsightStatus.NEW]).toBe(3);
  });

  it('counts after transitions', () => {
    const i1 = service.createInsight({ projectId, text: 'A' });
    service.createInsight({ projectId, text: 'B' });
    service.evaluateInsight({
      projectId, insightId: i1.id, relevance: 0.5, feasibility: 0.5,
      goalAlignment: GoalAlignment.MEDIUM, rationale: 'r',
    });
    const counts = service.getInsightCounts(projectId);
    expect(counts[InsightStatus.NEW]).toBe(1);
    expect(counts[InsightStatus.EVALUATING]).toBe(1);
  });

  it('returns empty object for non-existent project', () => {
    const counts = service.getInsightCounts('nonexistent');
    expect(counts).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════
// listInsights & getRevisitable (IS-09)
// ═══════════════════════════════════════════════════════════════

describe('InsightService — listInsights & getRevisitable (IS-09)', () => {
  it('listInsights returns summaries newest first', () => {
    service.createInsight({ projectId, text: 'First' });
    service.createInsight({ projectId, text: 'Second' });
    const list = service.listInsights(projectId);
    expect(list).toHaveLength(2);
    expect(list[0].text).toBe('Second');
    expect(list[1].text).toBe('First');
  });

  it('listInsights returns minimal fields only', () => {
    const insight = service.createInsight({ projectId, text: 'Test' });
    const list = service.listInsights(projectId);
    const item = list[0];
    expect(item.id).toBe(insight.id);
    expect(item.text).toBe('Test');
    expect(item.status).toBe(InsightStatus.NEW);
    expect(item.createdAt).toBeTruthy();
    // Should NOT have full fields like history, contextSnapshot
    expect((item as any).history).toBeUndefined();
    expect((item as any).contextSnapshot).toBeUndefined();
  });

  it('getRevisitable returns only REVISITABLE insights', () => {
    const directInsight: any = {
      id: 'rev-1', projectId, text: 'Revisitable',
      createdAt: new Date().toISOString(), status: InsightStatus.REVISITABLE, history: [],
    };
    store.addInsight(projectId, directInsight);
    service.createInsight({ projectId, text: 'New one' });

    const revisitable = service.getRevisitable(projectId);
    expect(revisitable).toHaveLength(1);
    expect(revisitable[0].id).toBe('rev-1');
  });
});

// ═══════════════════════════════════════════════════════════════
// Empty/whitespace text rejection (IS-10)
// ═══════════════════════════════════════════════════════════════

describe('InsightService — empty/whitespace rejection (IS-10)', () => {
  it('rejects empty string', () => {
    expect(() => service.createInsight({ projectId, text: '' })).toThrow();
  });

  it('rejects spaces only', () => {
    expect(() => service.createInsight({ projectId, text: '     ' })).toThrow();
  });

  it('rejects tabs and newlines only', () => {
    expect(() => service.createInsight({ projectId, text: '\t\n\r' })).toThrow();
  });

  it('rejects mixed whitespace', () => {
    expect(() => service.createInsight({ projectId, text: '  \t  \n  ' })).toThrow();
  });

  it('accepts single character', () => {
    const insight = service.createInsight({ projectId, text: 'X' });
    expect(insight.text).toBe('X');
  });
});
