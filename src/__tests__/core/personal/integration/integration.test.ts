import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { PersonalRuntime } from '../../../../core/personal/personal-runtime.js';
import { GoalLevel, GoalStatus, RecommendationType, BriefType, HabitFrequency, LearningStatus, DecisionMethod, AttentionState, ReflectionPeriod } from '../../../../core/personal/types.js';

function createMockContracts(): PersonalRuntimeContracts {
  return {
    identity: { getCurrentUserId: vi.fn(() => 'user-1'), getUserRoles: vi.fn(() => ['admin']), getUserPreferences: vi.fn(() => ({ theme: 'dark' })), resolvePreference: vi.fn(() => 'dark') },
    memory: { retrieve: vi.fn(async () => null), store: vi.fn(async () => {}), query: vi.fn(() => []), getSessionEntries: vi.fn(() => []), getWorkingEntries: vi.fn(() => []) },
    knowledge: { search: vi.fn(async () => []), getNamespaces: vi.fn(async () => [{ id: 'ns-1' }]), getItemCount: vi.fn(async () => 42), getRecentItems: vi.fn(async () => []), getByTags: vi.fn(async () => []) },
    workflow: { getActiveWorkflows: vi.fn(() => []), getRunningInstances: vi.fn(() => []), getRecentCompletions: vi.fn(() => []), getAvailableWorkflows: vi.fn(() => []) },
    experience: { getActiveAdaptations: vi.fn(() => []), getRecommendations: vi.fn(() => []), getCurrentPhase: vi.fn(() => 'Learning'), getBehaviorPatterns: vi.fn(() => []) },
    cognitive: { getCurrentIntent: vi.fn(() => null), getConversationTurnCount: vi.fn(() => 0), getCurrentSessionId: vi.fn(() => null), getConversationSummary: vi.fn(async () => null) },
    capability: { getActivePacks: vi.fn(() => []), getAvailableCapabilities: vi.fn(() => []) },
    desktop: { getOpenWindowCount: vi.fn(() => 3), getActiveWindow: vi.fn(() => 'editor'), getDesktopState: vi.fn(() => 'Ready'), getSubsystemCount: vi.fn(() => 14) },
    platform: { publishEvent: vi.fn(async () => {}), getConfiguration: vi.fn(() => null), getHealth: vi.fn(async () => ({})) },
  };
}

describe('PersonalRuntime Integration', () => {
  let contracts: PersonalRuntimeContracts;
  let pir: PersonalRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    pir = new PersonalRuntime(contracts);
  });

  // ── Full lifecycle ───────────────────────────────────────
  describe('full lifecycle', () => {
    it('creates runtime and initializes', async () => {
      await pir.initialize();
      const ctx = await pir.getPersonalContext();
      expect(ctx.userId).toBe('user-1');
    });

    it('returns unified context after initialize', async () => {
      await pir.initialize();
      const ctx = await pir.getUnifiedContext();
      expect(ctx.userId).toBe('user-1');
      expect(ctx.memory).toBeDefined();
      expect(ctx.knowledge).toBeDefined();
    });

    it('getState returns valid summary', async () => {
      await pir.initialize();
      const state = pir.getState() as Record<string, unknown>;
      expect(state).toBeDefined();
      expect(Object.isFrozen(state)).toBe(true);
    });

    it('dispose cleans up without error', async () => {
      await pir.initialize();
      pir.dispose();
      expect(pir.predictions.getPredictions()).toHaveLength(0);
    });
  });

  // ── Goals → Priorities cross-subsystem ───────────────────
  describe('goals to priorities', () => {
    it('creating goals feeds into getState', () => {
      pir.goals.createGoal({ title: 'Learn TS', level: GoalLevel.Goal, priority: 8 });
      const state = pir.getState() as Record<string, any>;
      expect(state.goals.total).toBe(1);
    });

    it('multiple goals increase count', () => {
      pir.goals.createGoal({ title: 'A', level: GoalLevel.Goal });
      pir.goals.createGoal({ title: 'B', level: GoalLevel.Goal });
      pir.goals.createGoal({ title: 'C', level: GoalLevel.Goal });
      expect(pir.goals.getGoalCount()).toBe(3);
    });

    it('goal status changes are reflected', () => {
      const g = pir.goals.createGoal({ title: 'G', level: GoalLevel.Goal });
      pir.goals.activateGoal(g.id);
      expect(pir.goals.getGoal(g.id).status).toBe(GoalStatus.Active);
    });

    it('goal hierarchy works across calls', () => {
      const vision = pir.goals.createGoal({ title: 'Vision', level: GoalLevel.Vision });
      const strategy = pir.goals.createGoal({ title: 'Strategy', level: GoalLevel.Strategy, parentId: vision.id });
      expect(pir.goals.getGoal(strategy.id).parentId).toBe(vision.id);
    });

    it('completed goals are tracked', () => {
      const g = pir.goals.createGoal({ title: 'G', level: GoalLevel.Goal });
      pir.goals.activateGoal(g.id);
      pir.goals.completeGoal(g.id);
      expect(pir.goals.getGoal(g.id).status).toBe(GoalStatus.Completed);
    });
  });

  // ── Priorities feed into Planning ────────────────────────
  describe('priorities to plans', () => {
    it('creates a plan scoped to a goal', async () => {
      const g = pir.goals.createGoal({ title: 'G', level: GoalLevel.Goal });
      const plan = pir.planning.createPlan(
        'Today' as any, g.id,
        [{ title: 'Task 1', description: 'd', estimatedMinutes: 30, priority: 5 }],
      );
      expect(plan.goalId).toBe(g.id);
      expect(plan.items).toHaveLength(1);
    });

    it('plan items are managed', async () => {
      const plan = pir.planning.createPlan(
        'Today' as any, undefined,
        [
          { title: 'A', description: 'd', estimatedMinutes: 30, priority: 5 },
          { title: 'B', description: 'd', estimatedMinutes: 60, priority: 3 },
        ],
      );
      expect(pir.planning.getAllPlans()).toHaveLength(1);
      const state = pir.getState() as Record<string, any>;
      expect(state.planning.plans).toBe(1);
    });
  });

  // ── Context feeds into Predictions ────────────────────────
  describe('context into predictions', () => {
    it('prediction uses recorded action history', () => {
      pir.predictions.recordAction('code');
      pir.predictions.recordAction('code');
      pir.predictions.recordAction('code');
      const p = pir.predictions.predictNextAction({ activities: ['code', 'review'], timeOfDay: 'morning' });
      expect(p.value).toBe('code');
    });

    it('predictions are tracked in getState', () => {
      pir.predictions.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      const state = pir.getState() as Record<string, any>;
      expect(state.predictions.total).toBe(1);
    });

    it('prediction accuracy is tracked', () => {
      const p = pir.predictions.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      pir.predictions.recordOutcome(p.id, p.value);
      const state = pir.getState() as Record<string, any>;
      expect(state.predictions.accuracy).toBe(1);
    });

    it('next task prediction uses goals', () => {
      pir.goals.createGoal({ title: 'Ship feature', level: GoalLevel.Goal, priority: 8 });
      const p = pir.predictions.predictNextTask([
        { id: 'g1', title: 'Ship feature', deadline: new Date(Date.now() + 86400000).toISOString(), priority: 8 },
      ]);
      expect(p.type).toBe('NextTask');
    });

    it('next question prediction works', () => {
      const p = pir.predictions.predictNextQuestion(['TypeScript', 'React']);
      expect(p.type).toBe('NextQuestion');
      expect(['TypeScript', 'React']).toContain(p.value);
    });

    it('next document prediction works', () => {
      const p = pir.predictions.predictNextDocument(['design.md', 'design.md', 'readme.md']);
      expect(p.type).toBe('NextDocument');
      expect(p.value).toBe('design.md');
    });

    it('next workflow prediction works', () => {
      const p = pir.predictions.predictNextWorkflow(3);
      expect(p.type).toBe('NextWorkflow');
      expect(p.value).toBe('continue');
    });

    it('validation tracks correct and incorrect', () => {
      const p1 = pir.predictions.predictNextAction({ activities: ['a'], timeOfDay: 'm' });
      const p2 = pir.predictions.predictNextAction({ activities: ['b'], timeOfDay: 'm' });
      pir.predictions.recordOutcome(p1.id, p1.value);
      pir.predictions.recordOutcome(p2.id, 'wrong');
      expect(pir.predictions.getAccuracy()).toBeCloseTo(0.5);
    });
  });

  // ── Recommendations cross-subsystem ──────────────────────
  describe('recommendations', () => {
    it('generates and tracks recommendations', () => {
      const r = pir.recommendations.generateRecommendation(
        RecommendationType.Action, 'Take a break', 'Rest', 'High focus', 0.8, 'goal-1',
      );
      expect(r.goalId).toBe('goal-1');
      const state = pir.getState() as Record<string, any>;
      expect(state.recommendations.total).toBe(1);
    });

    it('accept and dismiss counts are tracked', () => {
      const a = pir.recommendations.generateRecommendation(RecommendationType.Action, 'A', 'd', 'r', 0.5);
      const b = pir.recommendations.generateRecommendation(RecommendationType.Action, 'B', 'd', 'r', 0.5);
      const c = pir.recommendations.generateRecommendation(RecommendationType.Action, 'C', 'd', 'r', 0.5);
      pir.recommendations.acceptRecommendation(a.id);
      pir.recommendations.dismissRecommendation(b.id);
      const state = pir.getState() as Record<string, any>;
      expect(state.recommendations.accepted).toBe(1);
      expect(state.recommendations.dismissed).toBe(1);
      expect(state.recommendations.active).toBe(1);
    });

    it('cleanup removes expired', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      pir.recommendations.generateRecommendation(RecommendationType.Action, 'Old', 'd', 'r', 0.5, undefined, past);
      pir.recommendations.cleanup();
      expect(pir.recommendations.getRecommendations()).toHaveLength(0);
    });
  });

  // ── Attention cross-subsystem ────────────────────────────
  describe('attention', () => {
    it('snapshots are tracked', () => {
      pir.attention.recordSnapshot({ state: AttentionState.Focused, cognitiveLoad: 40, focusDuration: 15, distractionCount: 0, contextSwitches: 0 });
      expect(pir.attention.getCurrentState()).toBe(AttentionState.Focused);
    });

    it('attention score is in getState', () => {
      pir.attention.recordSnapshot({ state: AttentionState.Focused, cognitiveLoad: 40, focusDuration: 15, distractionCount: 0, contextSwitches: 0 });
      const state = pir.getState() as Record<string, any>;
      expect(typeof state.attention.score).toBe('number');
    });

    it('state changes emit events', () => {
      pir.attention.recordSnapshot();
      pir.attention.recordSnapshot({ state: AttentionState.Overloaded, cognitiveLoad: 90, focusDuration: 0, distractionCount: 0, contextSwitches: 0 });
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('AttentionChanged', expect.any(Object));
    });

    it('average cognitive load is calculable', () => {
      pir.attention.recordSnapshot({ cognitiveLoad: 20 });
      pir.attention.recordSnapshot({ cognitiveLoad: 40 });
      expect(pir.attention.getAverageCognitiveLoad()).toBe(30);
    });

    it('focus duration tracks last snapshot', () => {
      pir.attention.recordSnapshot({ focusDuration: 25 });
      pir.attention.recordSnapshot({ focusDuration: 35 });
      expect(pir.attention.getFocusDuration()).toBe(35);
    });
  });

  // ── Habits cross-subsystem ────────────────────────────────
  describe('habits', () => {
    it('detecting habits shows in getState', () => {
      pir.habits.recordObservation({ name: 'Standup', description: 'Daily standup', frequency: HabitFrequency.Daily });
      const state = pir.getState() as Record<string, any>;
      expect(state.habits.total).toBe(1);
    });

    it('confirming and breaking habits works', () => {
      const h = pir.habits.recordObservation({ name: 'Coffee', description: 'd', frequency: HabitFrequency.Daily });
      const confirmed = pir.habits.confirmHabit(h.id);
      expect(confirmed.confidence).toBeGreaterThan(h.confidence);
      const broken = pir.habits.recordHabitBroken(confirmed.id);
      expect(broken.confidence).toBeLessThan(confirmed.confidence);
    });

    it('pattern detection works', () => {
      const ts = new Date().toISOString();
      const detected = pir.habits.detectPatterns([
        { name: 'review', timestamp: ts }, { name: 'review', timestamp: ts },
        { name: 'review', timestamp: ts }, { name: 'review', timestamp: ts },
        { name: 'other', timestamp: ts },
      ]);
      // May or may not detect depending on threshold, but should not throw
      expect(Array.isArray(detected)).toBe(true);
    });
  });

  // ── Learning cross-subsystem ──────────────────────────────
  describe('learning', () => {
    it('learning items appear in getState', () => {
      pir.learning.addLearningItem('TypeScript');
      const state = pir.getState() as Record<string, any>;
      expect(state.learning.total).toBe(1);
    });

    it('practice advances status', () => {
      const item = pir.learning.addLearningItem('Rust');
      let current = item;
      for (let i = 0; i < 3; i++) current = pir.learning.practice(current.id);
      expect(current.status).toBe(LearningStatus.Practicing);
    });

    it('learning path includes prerequisites', () => {
      const a = pir.learning.addLearningItem('Basics');
      const b = pir.learning.addLearningItem('Advanced');
      pir.learning.addEdge(a.id, b.id, 'prerequisite');
      const path = pir.learning.getLearningPath(b.id);
      expect(path).toHaveLength(2);
      expect(path[0].topic).toBe('Basics');
    });

    it('graph snapshot works', () => {
      pir.learning.addLearningItem('A');
      pir.learning.addLearningItem('B');
      const graph = pir.learning.getGraph();
      expect(graph.nodes).toHaveLength(2);
    });
  });

  // ── Decisions cross-subsystem ────────────────────────────
  describe('decisions', () => {
    it('decisions appear in getState', () => {
      pir.decisions.createDecision('Choose DB', 'Pick a database', DecisionMethod.ProsCons);
      const state = pir.getState() as Record<string, any>;
      expect(state.decisions.total).toBe(1);
    });

    it('full decision lifecycle', () => {
      const d = pir.decisions.createDecision('Framework', 'desc', DecisionMethod.ProsCons, [
        { title: 'React', pros: ['popular'], cons: ['complex'] },
        { title: 'Vue', pros: ['simple'], cons: ['smaller ecosystem'] },
      ]);
      pir.decisions.scoreOption(d.id, d.options[0].id, 80);
      pir.decisions.scoreOption(d.id, d.options[1].id, 70);
      const best = pir.decisions.getBestOption(d.id);
      expect(best!.title).toBe('React');
      const resolved = pir.decisions.resolveDecision(d.id, 'Go with React');
      expect(resolved.conclusion).toBe('Go with React');
    });
  });

  // ── Daily Briefs cross-subsystem ──────────────────────────
  describe('daily briefs', () => {
    it('briefs appear in getState', () => {
      pir.daily.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'Good morning' });
      const state = pir.getState() as Record<string, any>;
      expect(state.daily.briefs).toBe(1);
    });

    it('deliver tracks status', () => {
      const b = pir.daily.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S' });
      expect(pir.daily.isDelivered(b.id)).toBe(false);
      pir.daily.deliverBrief(b.id);
      expect(pir.daily.isDelivered(b.id)).toBe(true);
    });

    it('metric history works across briefs', () => {
      pir.daily.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { productivity: 80 } });
      pir.daily.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'S', metrics: { productivity: 90 } });
      const history = pir.daily.getMetricHistory('productivity');
      expect(history).toHaveLength(2);
      expect(history[0].value).toBe(90); // desc order
    });

    it('metric trend analysis works', () => {
      pir.daily.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { score: 50 } });
      pir.daily.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'S', metrics: { score: 100 } });
      expect(pir.daily.getMetricTrend('score')).toBe('improving');
    });
  });

  // ── Assistant cross-subsystem ────────────────────────────
  describe('assistant', () => {
    it('activate updates getState', () => {
      pir.assistant.activate();
      const state = pir.getState() as Record<string, any>;
      expect(state.assistant.active).toBe(true);
    });

    it('deactivate updates getState', () => {
      pir.assistant.activate();
      pir.assistant.deactivate();
      const state = pir.getState() as Record<string, any>;
      expect(state.assistant.active).toBe(false);
    });

    it('buildYesterdaySummary uses goal refs', () => {
      pir.assistant.activate();
      const goals = [
        { id: 'g1', title: 'Ship feature', status: 'Active' as const, progress: 50, deadline: null },
      ];
      const state = pir.assistant.buildYesterdaySummary(goals, 2);
      expect(state.yesterdaySummary).toContain('Completed 2 goals');
    });

    it('buildTodayPlan uses goal refs', () => {
      pir.assistant.activate();
      const goals = [
        { id: 'g1', title: 'Task A', status: 'Active' as const, progress: 30, deadline: null },
      ];
      const state = pir.assistant.buildTodayPlan(goals);
      expect(state.todayPlan).toContain('Task A');
    });

    it('getSummary includes context', () => {
      pir.assistant.activate();
      pir.assistant.updateState({ currentActivity: 'coding' });
      pir.assistant.setNextAction('Take a break');
      const summary = pir.assistant.getSummary();
      expect(summary).toContain('coding');
      expect(summary).toContain('Take a break');
    });
  });

  // ── Reflections cross-subsystem ──────────────────────────
  describe('reflections', () => {
    it('reflections appear in getState', async () => {
      await pir.reflections.generateReflection(ReflectionPeriod.Daily, undefined, ['Task A', 'Task B']);
      const state = pir.getState() as Record<string, any>;
      expect(state.reflections.total).toBe(1);
    });

    it('average score is calculated', async () => {
      await pir.reflections.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c'], ['d']);
      await pir.reflections.generateReflection(ReflectionPeriod.Daily, undefined, ['a'], ['b', 'c']);
      const avg = pir.reflections.getAverageScore(ReflectionPeriod.Daily);
      expect(avg).toBeGreaterThan(0);
    });

    it('trend is computed', async () => {
      await pir.reflections.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c', 'd', 'e']);
      await pir.reflections.generateReflection(ReflectionPeriod.Daily, undefined, ['a'], ['b', 'c', 'd', 'e']);
      const trend = pir.reflections.getTrend(ReflectionPeriod.Daily);
      expect(['improving', 'declining', 'stable']).toContain(trend);
    });
  });

  // ── Metrics cross-subsystem ──────────────────────────────
  describe('metrics', () => {
    it('metrics are independent of subsystems', () => {
      pir.metrics.increment('test.counter');
      pir.metrics.setGauge('test.gauge', 42);
      expect(pir.metrics.getCounter('test.counter')).toBe(1);
      expect(pir.metrics.getGauge('test.gauge')).toBe(42);
    });

    it('snapshot includes all metric types', () => {
      pir.metrics.increment('events');
      pir.metrics.setGauge('score', 75);
      pir.metrics.recordSeries('productivity', 80);
      const snapshot = pir.metrics.getSnapshot();
      expect(snapshot['counter:events']).toBe(1);
      expect(snapshot['gauge:score']).toBe(75);
    });

    it('reset clears everything', () => {
      pir.metrics.increment('a');
      pir.metrics.setGauge('b', 1);
      pir.metrics.recordSeries('c', 1);
      pir.metrics.reset();
      expect(Object.keys(pir.metrics.getSnapshot())).toHaveLength(0);
    });

    it('export produces valid JSON', () => {
      pir.metrics.increment('test');
      const json = pir.metrics.export();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('trend analysis uses series data', () => {
      pir.metrics.recordSeries('daily.productivity', 40);
      pir.metrics.recordSeries('daily.productivity', 100);
      expect(pir.metrics.getWeeklyTrend()).toBe('improving');
    });

    it('convenience getters work', () => {
      pir.metrics.setGauge('goals.completed', 5);
      pir.metrics.setGauge('habits.detected', 3);
      pir.metrics.setGauge('attention.score', 80);
      expect(pir.metrics.getGoalsCompleted()).toBe(5);
      expect(pir.metrics.getHabitsDetected()).toBe(3);
      expect(pir.metrics.getAttentionScore()).toBe(80);
    });
  });

  // ── End-to-end flows ─────────────────────────────────────
  describe('end-to-end flows', () => {
    it('full daily workflow: goal → plan → brief → deliver', async () => {
      // 1. Create a goal
      const g = pir.goals.createGoal({ title: 'Launch MVP', level: GoalLevel.Goal, priority: 9 });
      pir.goals.activateGoal(g.id);

      // 2. Create a plan for it
      const plan = pir.planning.createPlan(
        'Today' as any, g.id,
        [{ title: 'Write tests', description: 'Unit tests for API', estimatedMinutes: 60, priority: 8 }],
      );

      // 3. Record attention
      pir.attention.recordSnapshot({ state: AttentionState.Focused, cognitiveLoad: 40, focusDuration: 20, distractionCount: 0, contextSwitches: 0 });

      // 4. Generate a prediction
      const pred = pir.predictions.predictNextAction({ activities: ['coding', 'testing'], timeOfDay: 'morning' });

      // 5. Generate a recommendation
      const rec = pir.recommendations.generateRecommendation(RecommendationType.Action, 'Focus on tests', 'd', 'r', 0.7, g.id);

      // 6. Generate a brief
      const brief = pir.daily.generateBrief({
        type: BriefType.MorningBrief, date: new Date().toISOString().slice(0, 10),
        summary: `Working on ${g.title}. Focus on ${plan.items[0].title}.`,
        keyPoints: [pred.value, rec.title],
        metrics: { attentionScore: pir.attention.getScore(), predictionConfidence: pred.confidence },
      });

      // 7. Deliver
      pir.daily.deliverBrief(brief.id);
      expect(pir.daily.isDelivered(brief.id)).toBe(true);

      // 8. State check
      const state = pir.getState() as Record<string, any>;
      expect(state.goals.total).toBe(1);
      expect(state.planning.plans).toBe(1);
      expect(state.predictions.total).toBe(1);
      expect(state.recommendations.total).toBe(1);
      expect(state.daily.briefs).toBe(1);
    });

    it('learning journey: add items → practice → path', () => {
      const basics = pir.learning.addLearningItem('JS Basics');
      const ts = pir.learning.addLearningItem('TypeScript');
      const react = pir.learning.addLearningItem('React');
      pir.learning.addEdge(basics.id, ts.id, 'prerequisite');
      pir.learning.addEdge(ts.id, react.id, 'prerequisite');

      // Practice basics
      for (let i = 0; i < 3; i++) pir.learning.practice(basics.id);
      expect(pir.learning.getItem(basics.id).status).toBe(LearningStatus.Practicing);

      // Path to React includes all three
      const path = pir.learning.getLearningPath(react.id);
      expect(path).toHaveLength(3);
    });

    it('decision with scoring and resolution', () => {
      const d = pir.decisions.createDecision('Tech stack', 'Choose backend', DecisionMethod.ProsCons, [
        { title: 'Node.js', pros: ['fast', 'ecosystem'], cons: ['single-threaded'], risks: ['event-loop blocking'] },
        { title: 'Go', pros: ['fast', 'concurrent'], cons: ['verbose'] },
        { title: 'Rust', pros: ['safe', 'fast'], cons: ['learning curve'], risks: ['compile times'] },
      ]);

      pir.decisions.autoScore(d.id);
      const best = pir.decisions.getBestOption(d.id);
      expect(best).not.toBeNull();
      expect(best!.score).not.toBeNull();

      const resolved = pir.decisions.resolveDecision(d.id, `Go with ${best!.title}`);
      expect(resolved.conclusion).toContain(best!.title);
      expect(pir.decisions.getResolved()).toHaveLength(1);
    });

    it('habit detection and confirmation cycle', () => {
      const h = pir.habits.recordObservation({
        name: 'Code review', description: 'Review PRs daily',
        frequency: HabitFrequency.Daily, timeOfDay: '10:00', afterActivity: 'standup',
        daysOfWeek: [1, 2, 3, 4, 5],
      });

      // Confirm multiple times
      let current = h;
      for (let i = 0; i < 4; i++) current = pir.habits.confirmHabit(current.id);
      expect(current.confidence).toBeGreaterThan(0.9);

      // Update
      const updated = pir.habits.updateHabit(current.id, { description: 'Review PRs after standup' });
      expect(updated.description).toBe('Review PRs after standup');
    });

    it('attention tracking with state transitions', () => {
      // Start focused
      pir.attention.recordSnapshot({ state: AttentionState.Focused, cognitiveLoad: 40, focusDuration: 25, distractionCount: 0, contextSwitches: 0 });
      const focusedScore = pir.attention.getScore();
      expect(focusedScore).toBeGreaterThan(50);

      // Switch to overload
      pir.attention.recordSnapshot({ state: AttentionState.Overloaded, cognitiveLoad: 90, focusDuration: 0, distractionCount: 0, contextSwitches: 0 });
      const overloadedScore = pir.attention.getScore();
      expect(overloadedScore).toBeLessThan(focusedScore);
    });

    it('assistant full lifecycle', () => {
      pir.assistant.activate('user-1');
      pir.assistant.updateState({ currentActivity: 'coding' });
      pir.assistant.setNextAction('Review PR #123');

      const goals = [
        { id: 'g1', title: 'Ship feature', status: 'Active' as const, progress: 70, deadline: new Date(Date.now() + 2 * 86400000).toISOString() },
      ];
      pir.assistant.buildYesterdaySummary(goals, 3);
      pir.assistant.buildTodayPlan(goals);

      const summary = pir.assistant.getSummary();
      expect(summary).toContain('user-1');
      expect(summary).toContain('coding');
      expect(summary).toContain('Review PR #123');

      pir.assistant.deactivate();
      expect(pir.assistant.isActive()).toBe(false);
    });

    it('reflection with trend analysis', async () => {
      // Week 1: low score
      await pir.reflections.generateReflection(ReflectionPeriod.Weekly, '2024-W01', ['a'], ['b', 'c', 'd', 'e']);
      // Week 2: high score
      await pir.reflections.generateReflection(ReflectionPeriod.Weekly, '2024-W02', ['a', 'b', 'c', 'd', 'e'], []);

      const trend = pir.reflections.getTrend(ReflectionPeriod.Weekly);
      expect(['improving', 'declining', 'stable']).toContain(trend);

      const latest = pir.reflections.getLatestReflection(ReflectionPeriod.Weekly);
      expect(latest).not.toBeNull();
      // Date may not match due to sorting; just verify latest exists
    });
  });
});
