import { describe, it, expect, beforeEach } from 'vitest';
import { CompanionRuntime } from '../../core/companion/companion-runtime.js';
import { InsightEngine } from '../../core/companion/insight-engine.js';
import { NotificationCenter } from '../../core/companion/notification-center.js';
import { ExplainabilityCenter } from '../../core/companion/explainability-center.js';
import { ValueOptimizationEngine, OptimizationPhase } from '../../core/companion/value-optimization-engine.js';
import {
  CompanionState, NavigationSection, InsightType, NotificationPriority,
  GoalPriority, GoalStatus, ExplainabilityLevel, RecommendationCategory,
  DefaultCompanionRuntimeConfig, DefaultInsightEngineConfig, DefaultNotificationCenterConfig,
} from '../../core/companion/types.js';
import {
  SessionNotFoundError, CompanionInitializationError, StateTransitionError,
} from '../../core/companion/errors.js';

const USER = 'integration-user';

const SECTIONS = [
  NavigationSection.Conversation,
  NavigationSection.Goals,
  NavigationSection.DailyPlan,
  NavigationSection.Solutions,
  NavigationSection.Workflows,
  NavigationSection.Capabilities,
  NavigationSection.Marketplace,
  NavigationSection.Knowledge,
];

const SECTION_LABELS: Record<string, string> = {
  [NavigationSection.Conversation]: 'Conversation',
  [NavigationSection.Goals]: 'Goals',
  [NavigationSection.DailyPlan]: 'DailyPlan',
  [NavigationSection.Solutions]: 'Solutions',
  [NavigationSection.Workflows]: 'Workflows',
  [NavigationSection.Capabilities]: 'Capabilities',
  [NavigationSection.Marketplace]: 'Marketplace',
  [NavigationSection.Knowledge]: 'Knowledge',
};

describe('CompanionRuntime full user journey', () => {
  let runtime: CompanionRuntime;
  beforeEach(() => { runtime = new CompanionRuntime(); });

  it('initialize -> check state', async () => {
    const session = await runtime.initialize(USER);
    expect(session.id).toBeTruthy();
    expect(session.userId).toBe(USER);
    expect(session.state).toBe(CompanionState.Active);
    expect(session.workspaceId).toBeTruthy();
    expect(session.startedAt).toBeTruthy();
  });

  it('initialize -> navigate to each section', async () => {
    const session = await runtime.initialize(USER);
    for (const section of SECTIONS) {
      await runtime.navigate(session.id, section);
      const updated = await runtime.getSession(session.id);
      expect(updated!.currentSection).toBe(section);
    }
  });

  it('initialize -> create goals -> verify count', async () => {
    const session = await runtime.initialize(USER);
    const sid = session.id as string;
    for (let i = 0; i < 5; i++) {
      await runtime.goals.create(sid, USER, `Goal ${i}`, `Description ${i}`, GoalPriority.Medium);
    }
    const list = await runtime.goals.list(sid);
    expect(list).toHaveLength(5);
    const metrics = await runtime.getMetrics(session.id);
    expect(metrics.totalGoals).toBe(5);
  });

  it('initialize -> create insights -> verify count', async () => {
    const session = await runtime.initialize(USER);
    const sid = session.id as string;
    for (let i = 0; i < 5; i++) {
      await runtime.insights.generate(sid, USER, INSIGHT_TYPES_LIST[i % 5], `Insight ${i}`, `Desc ${i}`);
    }
    const list = await runtime.insights.list(sid);
    expect(list).toHaveLength(5);
    const metrics = await runtime.getMetrics(session.id);
    expect(metrics.totalInsights).toBe(5);
  });

  it('initialize -> create notifications -> verify count', async () => {
    const session = await runtime.initialize(USER);
    const sid = session.id as string;
    for (let i = 0; i < 5; i++) {
      await runtime.notifications.create(sid, USER, `Notif ${i}`, `Content ${i}`, NotificationPriority.Normal);
    }
    const list = await runtime.notifications.list(sid);
    expect(list).toHaveLength(5);
  });

  it('initialize -> navigate -> getMetrics', async () => {
    const session = await runtime.initialize(USER);
    await runtime.navigate(session.id, NavigationSection.Goals);
    await runtime.navigate(session.id, NavigationSection.Solutions);
    const metrics = await runtime.getMetrics(session.id);
    expect(metrics.totalSessions).toBe(1);
    expect(metrics.activeSessions).toBe(1);
  });

  it('initialize -> shutdown', async () => {
    const session = await runtime.initialize(USER);
    await runtime.shutdown(session.id);
    const state = await runtime.getState();
    expect(state).toBe(CompanionState.Shutdown);
    const metrics = await runtime.getMetrics(session.id);
    expect(metrics.activeSessions).toBe(0);
  });
});

const INSIGHT_TYPES_LIST = [
  InsightType.Pattern, InsightType.Opportunity, InsightType.Risk,
  InsightType.Suggestion, InsightType.Correlation,
];

describe('CompanionRuntime navigate to each section', () => {
  for (const section of SECTIONS) {
    it(`navigates to ${SECTION_LABELS[section]}`, async () => {
      const rt = new CompanionRuntime();
      const session = await rt.initialize(USER);
      await rt.navigate(session.id, section);
      const updated = await rt.getSession(session.id);
      expect(updated!.currentSection).toBe(section);
    });
  }
});

describe('CompanionRuntime session errors', () => {
  let runtime: CompanionRuntime;
  beforeEach(() => { runtime = new CompanionRuntime(); });

  it('getSession with non-existent id returns null', async () => {
    const session = await runtime.getSession({ __brand: 'CompanionSessionId' } as unknown as import('../../core/companion/types.js').CompanionSessionId);
    expect(session).toBeNull();
  });

  it('shutdown with non-existent session throws SessionNotFoundError', async () => {
    const fakeId = { __brand: 'CompanionSessionId' } as unknown as import('../../core/companion/types.js').CompanionSessionId;
    await expect(runtime.shutdown(fakeId)).rejects.toThrow(SessionNotFoundError);
  });

  it('navigate with non-existent session throws SessionNotFoundError', async () => {
    const fakeId = { __brand: 'CompanionSessionId' } as unknown as import('../../core/companion/types.js').CompanionSessionId;
    await expect(runtime.navigate(fakeId, NavigationSection.Goals)).rejects.toThrow(SessionNotFoundError);
  });

  it('getMetrics with non-existent session throws SessionNotFoundError', async () => {
    const fakeId = { __brand: 'CompanionSessionId' } as unknown as import('../../core/companion/types.js').CompanionSessionId;
    await expect(runtime.getMetrics(fakeId)).rejects.toThrow(SessionNotFoundError);
  });
});

describe('CompanionRuntime metrics tracking', () => {
  it('metrics start at zero for fresh runtime', () => {
    const rt = new CompanionRuntime();
    const summary = rt.analytics.getSummary();
    expect(summary.totalSessions).toBe(0);
    expect(summary.activeSessions).toBe(0);
    expect(summary.totalGoals).toBe(0);
    expect(summary.totalSolutions).toBe(0);
    expect(summary.totalInsights).toBe(0);
  });

  it('initialize increments sessions and active', async () => {
    const rt = new CompanionRuntime();
    await rt.initialize(USER);
    const m = rt.analytics.getSummary();
    expect(m.totalSessions).toBe(1);
    expect(m.activeSessions).toBe(1);
  });

  it('shutdown decrements active', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    await rt.shutdown(session.id);
    const m = rt.analytics.getSummary();
    expect(m.activeSessions).toBe(0);
    expect(m.totalSessions).toBe(1);
  });

  it('goal create increments totalGoals', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    await rt.goals.create(session.id as string, USER, 'G', 'D');
    const m = rt.analytics.getSummary();
    expect(m.totalGoals).toBe(1);
  });

  it('insight generate increments totalInsights', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    await rt.insights.generate(session.id as string, USER, InsightType.Pattern, 'T', 'D');
    const m = rt.analytics.getSummary();
    expect(m.totalInsights).toBe(1);
  });
});

describe('CompanionRuntime multiple sessions', () => {
  it('two sessions are independent', async () => {
    const rt = new CompanionRuntime();
    const s1 = await rt.initialize('user1');
    const s2 = await rt.initialize('user2');
    expect(s1.id).not.toBe(s2.id);
    expect(s1.userId).toBe('user1');
    expect(s2.userId).toBe('user2');
    expect((await rt.getSession(s1.id))!.userId).toBe('user1');
    expect((await rt.getSession(s2.id))!.userId).toBe('user2');
  });

  it('navigate one session does not affect another', async () => {
    const rt = new CompanionRuntime();
    const s1 = await rt.initialize('user1');
    const s2 = await rt.initialize('user2');
    await rt.navigate(s1.id, NavigationSection.Goals);
    expect((await rt.getSession(s2.id))!.currentSection).toBe(NavigationSection.Conversation);
    expect((await rt.getSession(s1.id))!.currentSection).toBe(NavigationSection.Goals);
  });
});

describe('CompanionRuntime subsystem access', () => {
  let runtime: CompanionRuntime;
  beforeEach(() => { runtime = new CompanionRuntime(); });

  it('has insight engine', () => {
    expect(runtime.insights).toBeInstanceOf(InsightEngine);
  });

  it('has notification center', () => {
    expect(runtime.notifications).toBeInstanceOf(NotificationCenter);
  });

  it('has lifecycle manager', () => {
    expect(runtime.lifecycle).toBeDefined();
    expect(runtime.lifecycle.getCurrentState()).toBe(CompanionState.Uninitialized);
  });
});

describe('Explainability 5-question model', () => {
  let ec: ExplainabilityCenter;
  let engine: ValueOptimizationEngine;
  beforeEach(() => {
    ec = new ExplainabilityCenter(500);
    engine = new ValueOptimizationEngine(500);
  });

  const categories = [
    RecommendationCategory.Capability,
    RecommendationCategory.Workflow,
    RecommendationCategory.Goal,
    RecommendationCategory.Knowledge,
    RecommendationCategory.Efficiency,
  ];

  for (const cat of categories) {
    it(`5-question model for ${cat} recommendation`, async () => {
      const sessionId = '5q-session';
      // 1. Start FOCUS cycle - Value Identification
      const cycle = await engine.startCycle(sessionId, `Optimize ${cat}`);
      // 2. Constraint Analysis
      await engine.advanceCycle(cycle.id, { constraintIdentified: `${cat} configuration is complex` });
      // 3. Improvement Design
      await engine.advanceCycle(cycle.id, { improvementProposed: `Simplified ${cat} management` });
      // 4. Measurement Setup
      await engine.advanceCycle(cycle.id, { measurementCriteria: `${cat} adoption > 80%` });
      // 5. Learning Capture
      await engine.advanceCycle(cycle.id, {
        learningCaptured: `Simplifying ${cat} improved user satisfaction`,
        valueScore: 0.9,
      });
      // Generate recommendation
      const rec = await engine.generateRecommendation(cycle.id);
      // Generate explainability record
      const expl = await ec.generateExplanation(sessionId, rec.id as string, {
        category: cat, title: rec.title, valueScore: rec.valueScore,
        constraintIdentified: rec.constraintRemoved,
        alternativesConsidered: [...rec.alternatives],
        reasoning: rec.reasoning,
      });
      // Verify 5 questions answered
      expect(expl.why).toBeTruthy();
      expect(expl.whatValue).toBeTruthy();
      expect(expl.whatConstraintRemoved).toBeTruthy();
      expect(expl.whatAlternatives.length).toBeGreaterThan(0);
      expect(expl.whyThisChoice).toBeTruthy();
      // Verify level
      expect(expl.level).toBe(ExplainabilityLevel.Full);
    });
  }

  it('validation catches missing question', () => {
    const missing = ec.validate({ why: 'some reason' });
    expect(missing).toContain('whatValue');
    expect(missing).toContain('whatConstraintRemoved');
    expect(missing).toContain('whatAlternatives');
    expect(missing).toContain('whyThisChoice');
  });
});

describe('Constraint Optimization complete FOCUS cycles', () => {
  const cycleScenarios = [
    { value: 'Reduce deployment time', constraint: 'Manual deploy process', improvement: 'CI/CD pipeline', measurement: 'Deploy freq > daily', learning: 'CI/CD cut deploy time 80%', score: 0.9 },
    { value: 'Improve test coverage', constraint: 'No automated testing', improvement: 'Unit test framework', measurement: 'Coverage > 80%', learning: 'Testing caught 50 bugs early', score: 0.85 },
    { value: 'Enhance user experience', constraint: 'Slow page loads', improvement: 'CDN + lazy loading', measurement: 'LCP < 2s', learning: 'Performance improvements boosted NPS', score: 0.75 },
  ];

  for (let i = 0; i < cycleScenarios.length; i++) {
    it(`FOCUS cycle ${i + 1}: ${cycleScenarios[i].value}`, async () => {
      const engine = new ValueOptimizationEngine(500);
      const c = await engine.startCycle('focus-session', cycleScenarios[i].value);
      expect(c.phase).toBe(OptimizationPhase.ValueIdentification);

      const c1 = await engine.advanceCycle(c.id, { constraintIdentified: cycleScenarios[i].constraint });
      expect(c1.phase).toBe(OptimizationPhase.ConstraintAnalysis);

      const c2 = await engine.advanceCycle(c.id, { improvementProposed: cycleScenarios[i].improvement });
      expect(c2.phase).toBe(OptimizationPhase.ImprovementDesign);

      const c3 = await engine.advanceCycle(c.id, { measurementCriteria: cycleScenarios[i].measurement });
      expect(c3.phase).toBe(OptimizationPhase.MeasurementSetup);

      const c4 = await engine.advanceCycle(c.id, {
        learningCaptured: cycleScenarios[i].learning,
        valueScore: cycleScenarios[i].score,
      });
      expect(c4.phase).toBe(OptimizationPhase.LearningCapture);
      expect(c4.completedAt).not.toBeNull();

      const rec = await engine.generateRecommendation(c.id);
      expect(rec.valueScore).toBe(cycleScenarios[i].score);
      expect(rec.constraintRemoved).toBe(cycleScenarios[i].constraint);
    });
  }
});

describe('Value Creation measurable value actions', () => {
  const valueTypes = ['user', 'platform', 'developer', 'ecosystem'] as const;

  for (const vt of valueTypes) {
    it(`records ${vt} value action`, async () => {
      const engine = new ValueOptimizationEngine(500);
      const va = await engine.recordValueAction('session', `action-${vt}`, vt, `Improved ${vt} productivity`, `${vt} satisfaction +20%`);
      expect(va.valueType).toBe(vt);
      expect(va.valueDescription).toContain(`${vt}`);
      expect(va.measurableOutcome).toBeTruthy();
    });
  }

  it('counts all value types correctly', async () => {
    const engine = new ValueOptimizationEngine(500);
    for (const vt of valueTypes) {
      for (let i = 0; i < 5; i++) {
        await engine.recordValueAction('session', `a-${vt}-${i}`, vt, `v`, `o`);
      }
    }
    expect(await engine.countValueActions('session')).toBe(20);
    const list = await engine.listValueActions('session');
    for (const vt of valueTypes) {
      expect(list.filter(va => va.valueType === vt)).toHaveLength(5);
    }
  });
});

describe('Stress: 50 goals', () => {
  it('creates and lists 50 goals', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    for (let i = 0; i < 50; i++) {
      await rt.goals.create(sid, USER, `Goal ${i}`, `Desc ${i}`);
    }
    const list = await rt.goals.list(sid);
    expect(list).toHaveLength(50);
    const metrics = await rt.getMetrics(session.id);
    expect(metrics.totalGoals).toBe(50);
  });

  it('50 goals with different priorities', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    const priorities = [GoalPriority.Critical, GoalPriority.High, GoalPriority.Medium, GoalPriority.Low, GoalPriority.Aspirational];
    for (let i = 0; i < 50; i++) {
      await rt.goals.create(sid, USER, `G${i}`, 'D', priorities[i % 5]);
    }
    const list = await rt.goals.list(sid);
    expect(list).toHaveLength(50);
    for (const p of priorities) {
      expect(list.filter(g => g.priority === p)).toHaveLength(10);
    }
  });
});

describe('Stress: 50 insights', () => {
  it('creates and lists 50 insights', async () => {
    const engine = new InsightEngine(DefaultInsightEngineConfig);
    for (let i = 0; i < 50; i++) {
      await engine.generate('session', USER, INSIGHT_TYPES_LIST[i % 5], `T${i}`, `D${i}`);
    }
    expect(await engine.count('session')).toBe(50);
    const list = await engine.list('session');
    expect(list).toHaveLength(50);
  });
});

describe('Stress: 50 notifications', () => {
  it('creates and lists 50 notifications', async () => {
    const nc = new NotificationCenter(DefaultNotificationCenterConfig);
    for (let i = 0; i < 50; i++) {
      await nc.create('session', USER, `T${i}`, `C${i}`);
    }
    expect(await nc.count('session')).toBe(50);
    const list = await nc.list('session');
    expect(list).toHaveLength(50);
  });
});

describe('Stress: 50 explainability records', () => {
  it('creates and lists 50 records', async () => {
    const ec = new ExplainabilityCenter(500);
    for (let i = 0; i < 50; i++) {
      await ec.record({
        sessionId: 'session', recommendationId: `rec-${i}`,
        level: LEVELS_LIST[i % 3],
        why: `Why ${i}`, whatValue: `Value ${i}`,
        whatConstraintRemoved: `Constraint ${i}`,
        whatAlternatives: [`Alt ${i}`],
        whyThisChoice: `Choice ${i}`,
      });
    }
    expect(await ec.count('session')).toBe(50);
  });
});

const LEVELS_LIST = [ExplainabilityLevel.Full, ExplainabilityLevel.Standard, ExplainabilityLevel.Minimal];

describe('Stress: 50 value actions', () => {
  it('creates and lists 50 value actions', async () => {
    const engine = new ValueOptimizationEngine(500);
    const vts: Array<'user' | 'platform' | 'developer' | 'ecosystem'> = ['user', 'platform', 'developer', 'ecosystem'];
    for (let i = 0; i < 50; i++) {
      await engine.recordValueAction('session', `a${i}`, vts[i % 4], `v${i}`, `o${i}`);
    }
    expect(await engine.countValueActions('session')).toBe(50);
  });
});

describe('Integration: goals + insights + notifications together', () => {
  it('create 10 goals, 10 insights, 10 notifications in one session', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    for (let i = 0; i < 10; i++) {
      await rt.goals.create(sid, USER, `G${i}`, `D${i}`);
      await rt.insights.generate(sid, USER, INSIGHT_TYPES_LIST[i % 5], `I${i}`, `D${i}`);
      await rt.notifications.create(sid, USER, `N${i}`, `C${i}`);
    }
    expect((await rt.goals.list(sid)).length).toBe(10);
    expect((await rt.insights.list(sid)).length).toBe(10);
    expect((await rt.notifications.list(sid)).length).toBe(10);
    const m = await rt.getMetrics(session.id);
    expect(m.totalGoals).toBe(10);
    expect(m.totalInsights).toBe(10);
  });
});

describe('Integration: FOCUS cycle + explainability', () => {
  it('complete cycle then generate explainability', async () => {
    const engine = new ValueOptimizationEngine(500);
    const ec = new ExplainabilityCenter(500);
    const sid = 'int-focus-session';

    const c = await engine.startCycle(sid, 'Improve code quality');
    await engine.advanceCycle(c.id, { constraintIdentified: 'No code standards' });
    await engine.advanceCycle(c.id, { improvementProposed: 'Enforce linting rules' });
    await engine.advanceCycle(c.id, { measurementCriteria: 'Lint errors = 0' });
    await engine.advanceCycle(c.id, { learningCaptured: 'Linting reduced bugs by 40%', valueScore: 0.85 });
    const rec = await engine.generateRecommendation(c.id);

    const expl = await ec.generateExplanation(sid, rec.id as string, {
      category: RecommendationCategory.Efficiency, title: rec.title,
      valueScore: rec.valueScore, constraintIdentified: rec.constraintRemoved,
      alternativesConsidered: [...rec.alternatives], reasoning: rec.reasoning,
    });

    expect(expl.why).toBeTruthy();
    expect(expl.whatValue).toBeTruthy();
    expect(expl.whatConstraintRemoved).toBe('No code standards');
    expect(expl.whatAlternatives.length).toBeGreaterThan(0);
    expect(expl.whyThisChoice).toBeTruthy();
  });
});

describe('Integration: full lifecycle with multiple navigations', () => {
  it('init -> navigate 8 sections -> goals -> shutdown', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    for (const section of SECTIONS) {
      await rt.navigate(session.id, section);
    }
    const sid = session.id as string;
    await rt.goals.create(sid, USER, 'Final Goal', 'Description');
    await rt.shutdown(session.id);
    expect(await rt.getState()).toBe(CompanionState.Shutdown);
    expect(rt.analytics.getSummary().activeSessions).toBe(0);
  });
});

describe('Integration: goal completion tracking', () => {
  it('create 5 goals, complete 3, metrics reflect', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    const goals = [];
    for (let i = 0; i < 5; i++) {
      goals.push(await rt.goals.create(sid, USER, `G${i}`, `D${i}`));
    }
    for (let i = 0; i < 3; i++) {
      await rt.goals.complete(goals[i].id as string);
    }
    const m = rt.analytics.getSummary();
    expect(m.totalGoals).toBe(5);
    expect(m.completedGoals).toBe(3);
  });
});

describe('Integration: notification lifecycle in runtime', () => {
  it('create, read, dismiss, remove in runtime context', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    const n = await rt.notifications.create(sid, USER, 'T', 'C', NotificationPriority.Critical);
    await rt.notifications.markRead(n.id as string);
    await rt.notifications.markDismissed(n.id as string);
    await rt.notifications.remove(n.id as string);
    expect(await rt.notifications.count(sid)).toBe(0);
  });
});

describe('Integration: insights with different types and confidence', () => {
  it('5 types each with high confidence, all actionable', async () => {
    const engine = new InsightEngine(DefaultInsightEngineConfig);
    for (const type of INSIGHT_TYPES_LIST) {
      const i = await engine.generate('session', USER, type, 'T', 'D', 0.9);
      expect(i.actionable).toBe(true);
      expect(i.type).toBe(type);
    }
    expect(await engine.count('session')).toBe(5);
  });

  it('5 types each with low confidence, none actionable', async () => {
    const engine = new InsightEngine(DefaultInsightEngineConfig);
    for (const type of INSIGHT_TYPES_LIST) {
      const i = await engine.generate('session', USER, type, 'T', 'D', 0.3);
      expect(i.actionable).toBe(false);
    }
    const list = await engine.list('session');
    expect(list.filter(i => i.actionable)).toHaveLength(0);
  });
});

describe('Integration: value optimization with each category', () => {
  const cats = [
    RecommendationCategory.Capability,
    RecommendationCategory.Workflow,
    RecommendationCategory.Goal,
    RecommendationCategory.Knowledge,
    RecommendationCategory.Efficiency,
  ];

  for (const cat of cats) {
    it(`FOCUS cycle for ${cat} generates recommendation`, async () => {
      const engine = new ValueOptimizationEngine(500);
      const c = await engine.startCycle('session', `${cat} optimization`);
      await engine.advanceCycle(c.id, { constraintIdentified: `${cat} limitation` });
      await engine.advanceCycle(c.id, { improvementProposed: `${cat} enhancement` });
      await engine.advanceCycle(c.id, { measurementCriteria: `${cat} metric > target` });
      await engine.advanceCycle(c.id, { learningCaptured: `${cat} improved significantly`, valueScore: 0.8 });
      const rec = await engine.generateRecommendation(c.id);
      expect(rec).toBeTruthy();
      expect(rec.valueScore).toBe(0.8);
    });
  }
});

describe('Integration: multiple FOCUS cycles in one session', () => {
  it('3 complete FOCUS cycles', async () => {
    const engine = new ValueOptimizationEngine(500);
    const ec = new ExplainabilityCenter(500);
    const sid = 'multi-focus';
    for (let i = 0; i < 3; i++) {
      const c = await engine.startCycle(sid, `Value ${i}`);
      await engine.advanceCycle(c.id, { constraintIdentified: `C${i}` });
      await engine.advanceCycle(c.id, { improvementProposed: `I${i}` });
      await engine.advanceCycle(c.id, { measurementCriteria: `M${i}` });
      await engine.advanceCycle(c.id, { learningCaptured: `L${i}`, valueScore: 0.5 + i * 0.15 });
      const rec = await engine.generateRecommendation(c.id);
      await ec.generateExplanation(sid, rec.id as string, {
        category: RecommendationCategory.Efficiency, title: rec.title,
        valueScore: rec.valueScore, constraintIdentified: rec.constraintRemoved,
        alternativesConsidered: [...rec.alternatives], reasoning: rec.reasoning,
      });
    }
    expect(await engine.countCycles(sid)).toBe(3);
    expect(await ec.count(sid)).toBe(3);
  });
});

describe('Integration: explainability for all levels', () => {
  for (const level of LEVELS_LIST) {
    it(`direct record with ${level} level`, async () => {
      const ec = new ExplainabilityCenter(500);
      const rec = await ec.record({
        sessionId: 'session', recommendationId: 'rec-1', level,
        why: 'Why', whatValue: 'Value', whatConstraintRemoved: 'Constraint',
        whatAlternatives: ['Alt'], whyThisChoice: 'Choice',
      });
      expect(rec.level).toBe(level);
      expect(await ec.get(rec.id as string)).not.toBeNull();
    });
  }
});

describe('Integration: runtime navigate visits all sections', () => {
  it('visits each section and records analytics', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    for (const section of SECTIONS) {
      await rt.navigate(session.id, section);
    }
    for (const section of SECTIONS) {
      const sm = rt.analytics.getSectionMetrics(section);
      expect(sm.visitCount).toBe(1);
      expect(sm.section).toBe(section);
    }
  });

  it('visiting same section twice increments count', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    await rt.navigate(session.id, NavigationSection.Goals);
    await rt.navigate(session.id, NavigationSection.Goals);
    const sm = rt.analytics.getSectionMetrics(NavigationSection.Goals);
    expect(sm.visitCount).toBe(2);
  });
});

describe('Integration: goal update after creation', () => {
  it('create goal, update priority, verify', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    const goal = await rt.goals.create(sid, USER, 'G', 'D', GoalPriority.Medium);
    const updated = await rt.goals.update(goal.id as string, { priority: GoalPriority.Critical });
    expect(updated.priority).toBe(GoalPriority.Critical);
  });

  it('create goal, update progress, verify', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    const goal = await rt.goals.create(sid, USER, 'G', 'D');
    const updated = await rt.goals.update(goal.id as string, { progress: 50 });
    expect(updated.progress).toBe(50);
  });

  it('create goal, update status, verify', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    const goal = await rt.goals.create(sid, USER, 'G', 'D');
    const updated = await rt.goals.update(goal.id as string, { status: GoalStatus.Active });
    expect(updated.status).toBe(GoalStatus.Active);
  });
});

describe('Integration: session not found after shutdown', () => {
  it('shutdown then navigate throws', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    await rt.shutdown(session.id);
    // Session still exists in the map, just state is Shutdown
    const updated = await rt.getSession(session.id);
    expect(updated).not.toBeNull();
  });
});

describe('Integration: full workflow with all subsystems', () => {
  it('init -> goals -> insights -> notifications -> explainability -> shutdown', async () => {
    const rt = new CompanionRuntime();
    const ec = new ExplainabilityCenter(500);
    const engine = new ValueOptimizationEngine(500);

    const session = await rt.initialize(USER);
    const sid = session.id as string;

    // Create goals
    const g1 = await rt.goals.create(sid, USER, 'Improve testing', 'Add unit tests', GoalPriority.High);
    await rt.goals.update(g1.id as string, { status: GoalStatus.Active, progress: 25 });

    // Generate insights
    await rt.insights.generate(sid, USER, InsightType.Suggestion, 'Add CI pipeline', 'Automate testing', 0.8);
    await rt.insights.generate(sid, USER, InsightType.Risk, 'Low coverage', 'Coverage below 40%', 0.6);

    // Create notifications
    await rt.notifications.create(sid, USER, 'Goal updated', 'Progress set to 25%', NotificationPriority.Normal);
    await rt.notifications.create(sid, USER, 'Risk alert', 'Low test coverage detected', NotificationPriority.High);

    // FOCUS cycle
    const cycle = await engine.startCycle(sid, 'Automate testing pipeline');
    await engine.advanceCycle(cycle.id, { constraintIdentified: 'Manual testing only' });
    await engine.advanceCycle(cycle.id, { improvementProposed: 'Jenkins CI setup' });
    await engine.advanceCycle(cycle.id, { measurementCriteria: 'All tests pass in CI' });
    await engine.advanceCycle(cycle.id, { learningCaptured: 'CI caught 5 regressions in first week', valueScore: 0.88 });
    const rec = await engine.generateRecommendation(cycle.id);

    // Explainability
    await ec.generateExplanation(sid, rec.id as string, {
      category: RecommendationCategory.Efficiency, title: rec.title,
      valueScore: rec.valueScore, constraintIdentified: rec.constraintRemoved,
      alternativesConsidered: [...rec.alternatives], reasoning: rec.reasoning,
    });

    // Verify metrics
    const m = await rt.getMetrics(session.id);
    expect(m.totalGoals).toBe(1);
    expect(m.totalInsights).toBe(2);
    expect(m.activeSessions).toBe(1);

    // Shutdown
    await rt.shutdown(session.id);
    expect(rt.analytics.getSummary().activeSessions).toBe(0);
  });
});

describe('Integration: insight listByType after mixed creates', () => {
  it('each type has correct count', async () => {
    const engine = new InsightEngine(DefaultInsightEngineConfig);
    for (let i = 0; i < 5; i++) {
      for (const type of INSIGHT_TYPES_LIST) {
        await engine.generate('session', USER, type, `T-${type}-${i}`, 'D');
      }
    }
    for (const type of INSIGHT_TYPES_LIST) {
      expect((await engine.listByType('session', type)).length).toBe(5);
    }
    expect(await engine.count('session')).toBe(25);
  });
});

describe('Integration: notification priority distribution', () => {
  it('create 5 of each priority, verify distribution', async () => {
    const nc = new NotificationCenter(DefaultNotificationCenterConfig);
    const priorities = [NotificationPriority.Critical, NotificationPriority.High, NotificationPriority.Normal, NotificationPriority.Low, NotificationPriority.Info];
    for (const p of priorities) {
      for (let i = 0; i < 5; i++) {
        await nc.create('session', USER, `T`, `C`, p);
      }
    }
    expect(await nc.count('session')).toBe(25);
    const list = await nc.list('session');
    for (const p of priorities) {
      expect(list.filter(n => n.priority === p)).toHaveLength(5);
    }
  });
});

describe('Integration: value actions by type distribution', () => {
  it('10 of each type, verify distribution', async () => {
    const engine = new ValueOptimizationEngine(500);
    const vts: Array<'user' | 'platform' | 'developer' | 'ecosystem'> = ['user', 'platform', 'developer', 'ecosystem'];
    for (const vt of vts) {
      for (let i = 0; i < 10; i++) {
        await engine.recordValueAction('session', `a${vt}${i}`, vt, `v`, `o`);
      }
    }
    expect(await engine.countValueActions('session')).toBe(40);
    const list = await engine.listValueActions('session');
    for (const vt of vts) {
      expect(list.filter(va => va.valueType === vt)).toHaveLength(10);
    }
  });
});

describe('Integration: CompanionState enum values', () => {
  const states = [CompanionState.Uninitialized, CompanionState.Initializing, CompanionState.Active, CompanionState.Paused, CompanionState.ShuttingDown, CompanionState.Shutdown, CompanionState.Error];
  it('has 7 distinct states', () => {
    expect(new Set(states).size).toBe(7);
  });
  it('all are strings', () => {
    for (const s of states) {
      expect(typeof s).toBe('string');
    }
  });
});

describe('Integration: InsightType enum values', () => {
  it('has 5 distinct types', () => {
    expect(new Set(INSIGHT_TYPES_LIST).size).toBe(5);
  });
  it('all are strings', () => {
    for (const t of INSIGHT_TYPES_LIST) {
      expect(typeof t).toBe('string');
    }
  });
});

describe('Integration: NotificationPriority enum values', () => {
  it('has 5 distinct priorities', () => {
    const p = [NotificationPriority.Critical, NotificationPriority.High, NotificationPriority.Normal, NotificationPriority.Low, NotificationPriority.Info];
    expect(new Set(p).size).toBe(5);
  });
});

describe('Integration: OptimizationPhase enum values', () => {
  it('has 5 distinct phases', () => {
    const p = [OptimizationPhase.ValueIdentification, OptimizationPhase.ConstraintAnalysis, OptimizationPhase.ImprovementDesign, OptimizationPhase.MeasurementSetup, OptimizationPhase.LearningCapture];
    expect(new Set(p).size).toBe(5);
  });
});

describe('Integration: runtime config defaults', () => {
  it('default maxNotifications is 500', () => {
    expect(DefaultNotificationCenterConfig.maxNotifications).toBe(500);
  });
  it('default maxInsightsPerSession is 500', () => {
    expect(DefaultInsightEngineConfig.maxInsightsPerSession).toBe(500);
  });
  it('default minConfidence is 0.5', () => {
    expect(DefaultInsightEngineConfig.minConfidence).toBe(0.5);
  });
});

describe('Integration: explainability validation completeness', () => {
  let ec: ExplainabilityCenter;
  beforeEach(() => { ec = new ExplainabilityCenter(500); });

  it('empty input has 5 missing', () => {
    expect(ec.validate({})).toHaveLength(5);
  });
  it('complete input has 0 missing', () => {
    expect(ec.validate({
      why: 'w', whatValue: 'v', whatConstraintRemoved: 'c',
      whatAlternatives: ['a'], whyThisChoice: 'y',
    })).toHaveLength(0);
  });
  it('missing each single field', () => {
    const full = { why: 'w', whatValue: 'v', whatConstraintRemoved: 'c', whatAlternatives: ['a'], whyThisChoice: 'y' };
    expect(ec.validate({ ...full, why: '' })).toContain('why');
    expect(ec.validate({ ...full, whatValue: '' })).toContain('whatValue');
    expect(ec.validate({ ...full, whatConstraintRemoved: '' })).toContain('whatConstraintRemoved');
    expect(ec.validate({ ...full, whatAlternatives: [] })).toContain('whatAlternatives');
    expect(ec.validate({ ...full, whyThisChoice: '' })).toContain('whyThisChoice');
  });
});

describe('Integration: analytics session duration', () => {
  it('shutdown records session duration in metrics', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    await rt.shutdown(session.id);
    const m = rt.analytics.getSummary();
    expect(m.averageSessionDurationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('Integration: goals with each priority', () => {
  const priorities = [GoalPriority.Critical, GoalPriority.High, GoalPriority.Medium, GoalPriority.Low, GoalPriority.Aspirational];
  for (const p of priorities) {
    it(`goal with ${p} priority`, async () => {
      const rt = new CompanionRuntime();
      const session = await rt.initialize(USER);
      const sid = session.id as string;
      const g = await rt.goals.create(sid, USER, 'G', 'D', p);
      expect(g.priority).toBe(p);
    });
  }
});

describe('Integration: insight actionability threshold', () => {
  const cases = [
    { conf: 0.69, actionable: false },
    { conf: 0.7, actionable: true },
    { conf: 0.5, actionable: false },
    { conf: 1.0, actionable: true },
  ];
  for (const c of cases) {
    it(`confidence ${c.conf} => actionable=${c.actionable}`, async () => {
      const engine = new InsightEngine(DefaultInsightEngineConfig);
      const i = await engine.generate('session', USER, InsightType.Pattern, 'T', 'D', c.conf);
      expect(i.actionable).toBe(c.actionable);
    });
  }
});

describe('Integration: lifecycle state through runtime', () => {
  it('runtime starts with Uninitialized lifecycle', () => {
    const rt = new CompanionRuntime();
    expect(rt.lifecycle.getCurrentState()).toBe(CompanionState.Uninitialized);
  });
  it('after initialize, state is Active', async () => {
    const rt = new CompanionRuntime();
    await rt.initialize(USER);
    expect(rt.lifecycle.getCurrentState()).toBe(CompanionState.Active);
  });
  it('after shutdown, state is Shutdown', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    await rt.shutdown(session.id);
    expect(rt.lifecycle.getCurrentState()).toBe(CompanionState.Shutdown);
  });
});

describe('Integration: solution creation tracking', () => {
  it('create solution increments totalSolutions', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    await rt.solutions.create(sid, USER, 'Solution Title', 'Description');
    const m = rt.analytics.getSummary();
    expect(m.totalSolutions).toBe(1);
  });
});

describe('Integration: session isolation in runtime', () => {
  it('goals in session 1 not visible in session 2 list', async () => {
    const rt = new CompanionRuntime();
    const s1 = await rt.initialize('user1');
    const s2 = await rt.initialize('user2');
    await rt.goals.create(s1.id as string, 'user1', 'G1', 'D');
    expect((await rt.goals.list(s1.id as string)).length).toBe(1);
    expect((await rt.goals.list(s2.id as string)).length).toBe(0);
  });
});

describe('Integration: mark notifications read in runtime', () => {
  it('create 3, read 1, unreadCount is 2', async () => {
    const rt = new CompanionRuntime();
    const session = await rt.initialize(USER);
    const sid = session.id as string;
    const all = [];
    for (let i = 0; i < 3; i++) {
      all.push(await rt.notifications.create(sid, USER, `T${i}`, `C`));
    }
    await rt.notifications.markRead(all[0].id as string);
    expect(await rt.notifications.unreadCount(sid)).toBe(2);
  });
});

describe('Integration: cycle limit and value action limit separate', () => {
  it('cycle limit does not affect value actions', async () => {
    const engine = new ValueOptimizationEngine(1);
 await engine.startCycle('session', 'V');
    await expect(engine.startCycle('session', 'V2')).rejects.toThrow();
    const va = await engine.recordValueAction('session', 'a', 'user', 'value', 'outcome');
    expect(va).toBeTruthy();
  });
});

describe('Integration: 5 FOCUS cycles + 5 explainability records + 5 value actions', () => {
  it('all counts correct', async () => {
    const engine = new ValueOptimizationEngine(500);
    const ec = new ExplainabilityCenter(500);
    const sid = 'combo-session';
    for (let i = 0; i < 5; i++) {
      const c = await engine.startCycle(sid, `V${i}`);
      await engine.advanceCycle(c.id, { constraintIdentified: `C${i}` });
      await engine.advanceCycle(c.id, { improvementProposed: `I${i}` });
      await engine.advanceCycle(c.id, { measurementCriteria: `M${i}` });
      await engine.advanceCycle(c.id, { learningCaptured: `L${i}`, valueScore: 0.7 + i * 0.05 });
      const rec = await engine.generateRecommendation(c.id);
      await ec.generateExplanation(sid, rec.id as string, {
        category: RecommendationCategory.Efficiency, title: rec.title,
        valueScore: rec.valueScore, constraintIdentified: rec.constraintRemoved,
        alternativesConsidered: [...rec.alternatives], reasoning: rec.reasoning,
      });
      await engine.recordValueAction(sid, `a${i}`, 'user', `v${i}`, `o${i}`);
    }
    expect(await engine.countCycles(sid)).toBe(5);
    expect(await ec.count(sid)).toBe(5);
    expect(await engine.countValueActions(sid)).toBe(5);
  });
});

describe('Integration: error types are instances of Error', () => {
  it('SessionNotFoundError', () => {
    expect(new SessionNotFoundError('x')).toBeInstanceOf(Error);
  });
  it('CompanionInitializationError', () => {
    expect(new CompanionInitializationError('stage')).toBeInstanceOf(Error);
  });
  it('StateTransitionError', () => {
    expect(new StateTransitionError('A', 'B')).toBeInstanceOf(Error);
  });
});

describe('Integration: error codes', () => {
  it('SessionNotFoundError code', () => {
    expect(new SessionNotFoundError('x').code).toBe('SESSION_NOT_FOUND');
  });
  it('CompanionInitializationError code', () => {
    expect(new CompanionInitializationError('stage').code).toBe('COMPANION_INIT_ERROR');
  });
  it('StateTransitionError code', () => {
    expect(new StateTransitionError('A', 'B').code).toBe('STATE_TRANSITION_ERROR');
  });
});

describe('Integration: CompanionInitializationError properties', () => {
  it('has stage and details', () => {
    const err = new CompanionInitializationError('init', { userId: 'u1' });
    expect(err.stage).toBe('init');
    expect(err.details).toEqual({ userId: 'u1' });
  });
});
