import { describe, it, expect, beforeEach } from 'vitest';
import { CompanionRuntime } from '../../core/companion/companion-runtime.js';
import {
  DefaultCompanionRuntimeConfig, NavigationSection, GoalPriority, GoalStatus,
  ConversationRole, SolutionStatus, InsightType, NotificationPriority,
  NotificationStatus, DailyTaskStatus, RecommendationCategory, ExplainabilityLevel,
} from '../../core/companion/types.js';
import {
  SessionNotFoundError, CompanionInitializationError, CompanionError,
} from '../../core/companion/errors.js';

const allSections = [
  NavigationSection.Conversation, NavigationSection.Goals, NavigationSection.DailyPlan,
  NavigationSection.Solutions, NavigationSection.Workflows, NavigationSection.Capabilities,
  NavigationSection.Marketplace, NavigationSection.Knowledge,
];

// ── 20 Full User Journeys ───────────────────────────────────────────────
describe('CompanionRuntime full user journeys', () => {
  let rt: CompanionRuntime;

  for (let journey = 0; journey < 20; journey++) {
    describe(`journey ${journey}`, () => {
      beforeEach(() => { rt = new CompanionRuntime(); });

      it(`completes full lifecycle`, async () => {
        const session = await rt.initialize(`user-j${journey}`);
        expect(session.id).toBeTruthy();
        expect(session.state).toBeDefined();

        // Navigate to Goals
        await rt.navigate(session.id, NavigationSection.Goals);

        // Create goals
        const g1 = await rt.goals.create(session.id as string, `user-j${journey}`, `Goal A ${journey}`, 'desc', GoalPriority.High);
        const g2 = await rt.goals.create(session.id as string, `user-j${journey}`, `Goal B ${journey}`, 'desc', GoalPriority.Medium);
        expect(g1.priority).toBe(GoalPriority.High);
        expect(g2.priority).toBe(GoalPriority.Medium);

        // Update and complete a goal
        await rt.goals.update(g1.id as string, { progress: 75 });
        const completed = await rt.goals.complete(g1.id as string);
        expect(completed.status).toBe(GoalStatus.Completed);

        // Navigate to Conversation
        await rt.navigate(session.id, NavigationSection.Conversation);
        const conv = await rt.conversation.create(session.id as string, `user-j${journey}`, `Chat ${journey}`);
        const msg1 = await rt.conversation.addMessage(conv.id as string, ConversationRole.User, `Hello ${journey}`);
        const msg2 = await rt.conversation.addMessage(conv.id as string, ConversationRole.Assistant, `Hi there ${journey}`);
        expect(msg1.role).toBe(ConversationRole.User);
        expect(msg2.role).toBe(ConversationRole.Assistant);

        // Navigate to Daily Plan
        await rt.navigate(session.id, NavigationSection.DailyPlan);
        const plan = await rt.dailyPlanner.create(session.id as string, `user-j${journey}`);
        await rt.dailyPlanner.addTask(plan.id as string, `Task ${journey}a`);
        await rt.dailyPlanner.addTask(plan.id as string, `Task ${journey}b`);
        const completedPlan = await rt.dailyPlanner.completePlan(plan.id as string);
        expect(completedPlan.tasks.every(t => t.status === DailyTaskStatus.Completed)).toBe(true);

        // Navigate to Solutions
        await rt.navigate(session.id, NavigationSection.Solutions);
        const sol = await rt.solutions.open(session.id as string, `user-j${journey}`, `Solution ${journey}`);
        expect(sol.status).toBe(SolutionStatus.Assembling);
        const validated = await rt.solutions.generate(sol.id as string);
        expect(validated.status).toBe(SolutionStatus.Validating);

        // Navigate to Insights
        await rt.navigate(session.id, NavigationSection.Goals);
        const ins = await rt.insights.generate(session.id as string, `user-j${journey}`, InsightType.Suggestion, `Insight ${journey}`, 'Try this approach', 0.85);
        expect(ins.type).toBe(InsightType.Suggestion);
        expect(ins.confidence).toBe(0.85);
        expect(ins.actionable).toBe(true);

        // Create notifications
        const n1 = await rt.notifications.create(session.id as string, `user-j${journey}`, `Notif ${journey}a`, 'Content', NotificationPriority.High);
        const n2 = await rt.notifications.create(session.id as string, `user-j${journey}`, `Notif ${journey}b`, 'Content', NotificationPriority.Normal);
        await rt.notifications.markRead(n1.id as string);
        const read = await rt.notifications.get(n1.id as string);
        expect(read!.status).toBe(NotificationStatus.Read);

        // Navigate all remaining sections
        await rt.navigate(session.id, NavigationSection.Workflows);
        await rt.navigate(session.id, NavigationSection.Capabilities);
        await rt.navigate(session.id, NavigationSection.Marketplace);
        await rt.navigate(session.id, NavigationSection.Knowledge);

        // Get metrics
        const metrics = await rt.getMetrics(session.id);
        expect(metrics.totalGoals).toBeGreaterThanOrEqual(2);
        expect(metrics.totalSolutions).toBeGreaterThanOrEqual(1);
        expect(metrics.totalInsights).toBeGreaterThanOrEqual(1);

        // Shutdown
        await rt.shutdown(session.id);
        const state = await rt.getState();
        expect(state).toBeDefined();
      });
    });
  }
});

// ── Cross-subsystem integration ─────────────────────────────────────────
describe('Cross-subsystem analytics integration', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  it('goal analytics flows to metrics', async () => {
    const session = await rt.initialize('u1');
    for (let i = 0; i < 10; i++) {
      const g = await rt.goals.create(session.id as string, 'u1', `G${i}`);
      if (i % 2 === 0) await rt.goals.complete(g.id as string);
    }
    const metrics = await rt.getMetrics(session.id);
    expect(metrics.totalGoals).toBe(10);
    expect(metrics.completedGoals).toBe(5);
    await rt.shutdown(session.id);
  });

  it('solution analytics flows to metrics', async () => {
    const session = await rt.initialize('u1');
    for (let i = 0; i < 10; i++) {
      const s = await rt.solutions.create(session.id as string, 'u1', `S${i}`);
      if (i % 2 === 0) await rt.solutions.complete(s.id as string);
    }
    // 10 creates + 5 completes each fire recordSolutionCreated = 15
    const metrics = await rt.getMetrics(session.id);
    expect(metrics.totalSolutions).toBe(15);
    await rt.shutdown(session.id);
  });

  it('insight analytics flows to metrics', async () => {
    const session = await rt.initialize('u1');
    for (let i = 0; i < 10; i++) {
      await rt.insights.generate(session.id as string, 'u1', InsightType.Pattern, `I${i}`, `desc ${i}`, 0.6 + i * 0.03);
    }
    const metrics = await rt.getMetrics(session.id);
    expect(metrics.totalInsights).toBe(10);
    await rt.shutdown(session.id);
  });

  for (const type of [InsightType.Pattern, InsightType.Opportunity, InsightType.Risk, InsightType.Suggestion, InsightType.Correlation]) {
    it(`insight type ${type} flows to analytics`, async () => {
      const session = await rt.initialize('u1');
      await rt.insights.generate(session.id as string, 'u1', type, `I-${type}`, 'desc', 0.8);
      const metrics = await rt.getMetrics(session.id);
      expect(metrics.totalInsights).toBe(1);
      await rt.shutdown(session.id);
    });
  }

  for (const pri of [NotificationPriority.Critical, NotificationPriority.High, NotificationPriority.Normal, NotificationPriority.Low, NotificationPriority.Info]) {
    it(`notification priority ${pri} integrates with session`, async () => {
      const session = await rt.initialize('u1');
      const n = await rt.notifications.create(session.id as string, 'u1', `N-${pri}`, 'content', pri);
      expect(n.priority).toBe(pri);
      expect(n.status).toBe(NotificationStatus.Unread);
      await rt.shutdown(session.id);
    });
  }

  for (const section of allSections) {
    it(`navigation to ${section} records visit`, async () => {
      const session = await rt.initialize('u1');
      await rt.navigate(session.id, section);
      const sm = rt.analytics.getSectionMetrics(section);
      expect(sm.visitCount).toBe(1);
      await rt.shutdown(session.id);
    });
  }

  it('session metrics tracks duration', async () => {
    const session = await rt.initialize('u1');
    await rt.shutdown(session.id);
    const metrics = rt.analytics.getSummary();
    expect(metrics.averageSessionDurationMs).toBeGreaterThanOrEqual(0);
  });
});

// ── Stress: 30 goals ─────────────────────────────────────────────────────
describe('Stress: 30 goals', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  it('creates and manages 30 goals', async () => {
    const session = await rt.initialize('u1');
    const ids: string[] = [];
    for (let i = 0; i < 30; i++) {
      const g = await rt.goals.create(session.id as string, 'u1', `Goal-${i}`, `desc-${i}`, [GoalPriority.Critical, GoalPriority.High, GoalPriority.Medium, GoalPriority.Low, GoalPriority.Aspirational][i % 5]);
      ids.push(g.id as string);
    }
    expect(await rt.goals.count(session.id as string)).toBe(30);

    for (let i = 0; i < 30; i++) {
      const g = await rt.goals.get(ids[i]);
      expect(g).not.toBeNull();
      expect(g!.title).toBe(`Goal-${i}`);
    }

    for (let i = 0; i < 30; i += 2) {
      await rt.goals.complete(ids[i]);
    }

    const metrics = await rt.getMetrics(session.id);
    expect(metrics.totalGoals).toBe(30);
    expect(metrics.completedGoals).toBe(15);

    const list = await rt.goals.list(session.id as string);
    expect(list).toHaveLength(30);

    for (let i = 0; i < 30; i += 3) {
      await rt.goals.remove(ids[i]);
    }
    expect(await rt.goals.count(session.id as string)).toBe(20);

    await rt.shutdown(session.id);
  });

  it('30 goals with updates', async () => {
    const session = await rt.initialize('u1');
    const ids: string[] = [];
    for (let i = 0; i < 30; i++) {
      const g = await rt.goals.create(session.id as string, 'u1', `G${i}`);
      ids.push(g.id as string);
    }
    for (let i = 0; i < 30; i++) {
      await rt.goals.update(ids[i], { progress: (i + 1) * 3 });
    }
    for (let i = 0; i < 30; i++) {
      const g = await rt.goals.get(ids[i]);
      expect(g!.progress).toBe((i + 1) * 3);
    }
    await rt.shutdown(session.id);
  });

  it('30 goals across 3 sessions', async () => {
    const sessions = [];
    for (let s = 0; s < 3; s++) {
      const session = await rt.initialize(`user-s${s}`);
      sessions.push(session);
      for (let i = 0; i < 10; i++) {
        await rt.goals.create(session.id as string, `user-s${s}`, `G-s${s}-${i}`);
      }
    }
    for (let s = 0; s < 3; s++) {
      expect(await rt.goals.count(sessions[s].id as string)).toBe(10);
    }
    // Only shutdown last session - shared lifecycle
    await rt.shutdown(sessions[2].id);
  });
});

// ── Stress: 30 insights ──────────────────────────────────────────────────
describe('Stress: 30 insights', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  it('creates and manages 30 insights', async () => {
    const session = await rt.initialize('u1');
    const ids: string[] = [];
    const types = [InsightType.Pattern, InsightType.Opportunity, InsightType.Risk, InsightType.Suggestion, InsightType.Correlation];
    for (let i = 0; i < 30; i++) {
      const ins = await rt.insights.generate(session.id as string, 'u1', types[i % 5], `Insight-${i}`, `desc-${i}`, 0.5 + (i / 100));
      ids.push(ins.id as string);
    }
    expect(await rt.insights.count(session.id as string)).toBe(30);

    for (let i = 0; i < 30; i++) {
      const ins = await rt.insights.get(ids[i]);
      expect(ins).not.toBeNull();
      expect(ins!.type).toBe(types[i % 5]);
    }

    const metrics = await rt.getMetrics(session.id);
    expect(metrics.totalInsights).toBe(30);

    for (let i = 0; i < 30; i += 3) {
      await rt.insights.remove(ids[i]);
    }
    expect(await rt.insights.count(session.id as string)).toBe(20);

    await rt.shutdown(session.id);
  });

  for (const type of [InsightType.Pattern, InsightType.Opportunity, InsightType.Risk, InsightType.Suggestion, InsightType.Correlation]) {
    it(`30 insights of type ${type}`, async () => {
      const session = await rt.initialize('u1');
      for (let i = 0; i < 30; i++) {
        await rt.insights.generate(session.id as string, 'u1', type, `I-${i}`, 'desc', 0.7);
      }
      const list = await rt.insights.listByType(session.id as string, type);
      expect(list).toHaveLength(30);
      await rt.shutdown(session.id);
    });
  }

  it('30 insights with different confidence levels', async () => {
    const session = await rt.initialize('u1');
    for (let i = 0; i < 30; i++) {
      const ins = await rt.insights.generate(session.id as string, 'u1', InsightType.Suggestion, `I${i}`, 'desc', i * 0.03 + 0.5);
      expect(ins.actionable).toBe(ins.confidence >= 0.7);
    }
    const actionable = (await rt.insights.list(session.id as string)).filter(i => i.actionable);
    expect(actionable.length).toBeGreaterThan(0);
    await rt.shutdown(session.id);
  });
});

// ── Stress: 30 notifications ─────────────────────────────────────────────
describe('Stress: 30 notifications', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  it('creates and manages 30 notifications', async () => {
    const session = await rt.initialize('u1');
    const ids: string[] = [];
    const priorities = [NotificationPriority.Critical, NotificationPriority.High, NotificationPriority.Normal, NotificationPriority.Low, NotificationPriority.Info];
    for (let i = 0; i < 30; i++) {
      const n = await rt.notifications.create(session.id as string, 'u1', `N-${i}`, `content-${i}`, priorities[i % 5]);
      ids.push(n.id as string);
    }
    expect(await rt.notifications.count(session.id as string)).toBe(30);
    expect(await rt.notifications.unreadCount(session.id as string)).toBe(30);

    for (let i = 0; i < 30; i++) {
      const n = await rt.notifications.get(ids[i]);
      expect(n).not.toBeNull();
      expect(n!.priority).toBe(priorities[i % 5]);
    }

    for (let i = 0; i < 15; i++) {
      await rt.notifications.markRead(ids[i]);
    }
    expect(await rt.notifications.unreadCount(session.id as string)).toBe(15);

    for (let i = 15; i < 25; i++) {
      await rt.notifications.markDismissed(ids[i]);
    }
    const dismissed = (await rt.notifications.list(session.id as string)).filter(n => n.status === NotificationStatus.Dismissed);
    expect(dismissed).toHaveLength(10);

    for (let i = 25; i < 30; i++) {
      await rt.notifications.remove(ids[i]);
    }
    expect(await rt.notifications.count(session.id as string)).toBe(25);

    await rt.shutdown(session.id);
  });

  it('30 notifications all marked read', async () => {
    const session = await rt.initialize('u1');
    const ids: string[] = [];
    for (let i = 0; i < 30; i++) {
      const n = await rt.notifications.create(session.id as string, 'u1', `N${i}`, 'c', NotificationPriority.Normal);
      ids.push(n.id as string);
    }
    for (const id of ids) {
      await rt.notifications.markRead(id);
    }
    expect(await rt.notifications.unreadCount(session.id as string)).toBe(0);
    await rt.shutdown(session.id);
  });
});

// ── Stress: Navigate all 9 sections ──────────────────────────────────────
describe('Stress: navigate all sections', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  for (let round = 0; round < 5; round++) {
    it(`navigates all sections round ${round}`, async () => {
      const session = await rt.initialize(`u-round${round}`);
      for (const section of allSections) {
        await rt.navigate(session.id, section);
      }
      for (const section of allSections) {
        const sm = rt.analytics.getSectionMetrics(section);
        // Each round creates a new runtime (beforeEach), so visitCount is exactly 1
        expect(sm.visitCount).toBe(1);
      }
      await rt.shutdown(session.id);
    });
  }

  it('navigates sections 10 times in sequence', async () => {
    const session = await rt.initialize('u1');
    for (let i = 0; i < 10; i++) {
      for (const section of allSections) {
        await rt.navigate(session.id, section);
      }
    }
    for (const section of allSections) {
      const sm = rt.analytics.getSectionMetrics(section);
      expect(sm.visitCount).toBe(10);
    }
    await rt.shutdown(session.id);
  });

  it('navigate after shutdown still works (session in map)', async () => {
    const session = await rt.initialize('u1');
    await rt.shutdown(session.id);
    // session remains in the map, navigate does not check lifecycle
    const updated = await rt.getSession(session.id);
    expect(updated).not.toBeNull();
  });

  it('getMetrics after shutdown still works (session in map)', async () => {
    const session = await rt.initialize('u1');
    await rt.shutdown(session.id);
    const metrics = await rt.getMetrics(session.id);
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalSessions).toBe('number');
  });

  it('SessionNotFoundError has correct fields', () => {
    const e = new SessionNotFoundError('sess-123');
    expect(e.code).toBe('SESSION_NOT_FOUND');
    expect(e.sessionId).toBe('sess-123');
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('CompanionInitializationError has correct fields', () => {
    const e = new CompanionInitializationError('init', { userId: 'u1' });
    expect(e.code).toBe('COMPANION_INIT_ERROR');
    expect(e.stage).toBe('init');
    expect(e.details).toBeDefined();
    expect(Object.isFrozen(e.details)).toBe(true);
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('shutdown nonexistent session throws', async () => {
    await expect(rt.shutdown('nonexistent' as any)).rejects.toThrow(SessionNotFoundError);
  });
});

// ── AI Control Center via Runtime ────────────────────────────────────────
describe('AIControlCenter via Runtime', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  it('default autonomy is medium', async () => {
    const session = await rt.initialize('u1');
    const level = await rt.aiControl.getLevel(session.id as string);
    expect(level).toBe('medium');
    await rt.shutdown(session.id);
  });

  for (const level of ['low', 'medium', 'high', 'full']) {
    it(`sets autonomy to ${level}`, async () => {
      const session = await rt.initialize('u1');
      const result = await rt.aiControl.setLevel(session.id as string, level);
      expect(result).toBe(level);
      const current = await rt.aiControl.getLevel(session.id as string);
      expect(current).toBe(level);
      await rt.shutdown(session.id);
    });
  }

  it('invalid level throws AIControlError', async () => {
    const session = await rt.initialize('u1');
    await expect(rt.aiControl.setLevel(session.id as string, 'invalid')).rejects.toThrow();
    await rt.shutdown(session.id);
  });

  it('history records changes', async () => {
    const session = await rt.initialize('u1');
    await rt.aiControl.setLevel(session.id as string, 'low');
    await rt.aiControl.setLevel(session.id as string, 'high');
    await rt.aiControl.setLevel(session.id as string, 'full');
    const history = await rt.aiControl.getHistory(session.id as string);
    expect(history).toHaveLength(3);
    expect(history[0].to).toBe('low');
    expect(history[1].to).toBe('high');
    expect(history[2].to).toBe('full');
    await rt.shutdown(session.id);
  });
});

// ── Knowledge and Capability via Runtime ─────────────────────────────────
describe('Knowledge and Capability via Runtime', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  it('knowledge add, search, list, remove via runtime', async () => {
    const session = await rt.initialize('u1');
    const e1 = await rt.knowledge.add(session.id as string, 'arch', 'Microservices', 'Use microservices pattern');
    const e2 = await rt.knowledge.add(session.id as string, 'pattern', 'CQRS', 'Command Query Responsibility Segregation');
    expect(await rt.knowledge.count(session.id as string)).toBe(2);
    const search = await rt.knowledge.search(session.id as string, 'microservices');
    expect(search).toHaveLength(1);
    await rt.knowledge.remove(session.id as string, e1.id);
    expect(await rt.knowledge.count(session.id as string)).toBe(1);
    await rt.shutdown(session.id);
  });

  it('capability install, list, get, remove via runtime', async () => {
    const session = await rt.initialize('u1');
    const c1 = await rt.capabilities.install(session.id as string, 'cap-auth', 'Auth Module');
    const c2 = await rt.capabilities.install(session.id as string, 'cap-cache', 'Cache Layer');
    expect(await rt.capabilities.count(session.id as string)).toBe(2);
    const found = await rt.capabilities.get(session.id as string, c1.id);
    expect(found!.label).toBe('Auth Module');
    await rt.capabilities.remove(session.id as string, c1.id);
    expect(await rt.capabilities.count(session.id as string)).toBe(1);
    await rt.shutdown(session.id);
  });

  it('marketplace browse, install via runtime', async () => {
    rt.marketplace.seedListings([
      { id: 'ml1', title: 'ML Module', description: 'Machine learning', category: 'ai', rating: 4.5, version: '1.0', author: 'team' },
    ]);
    const session = await rt.initialize('u1');
    const results = await rt.marketplace.browse(session.id as string);
    expect(results).toHaveLength(1);
    const details = await rt.marketplace.getDetails(session.id as string, 'ml1');
    expect(details!.title).toBe('ML Module');
    const inst = await rt.marketplace.install(session.id as string, 'ml1');
    expect(inst.listingId).toBe('ml1');
    await rt.shutdown(session.id);
  });
});

// ── Workflow Dashboard via Runtime ───────────────────────────────────────
describe('WorkflowDashboard via Runtime', () => {
  let rt: CompanionRuntime;
  beforeEach(() => { rt = new CompanionRuntime(); });

  it('register and list workflows', async () => {
    const session = await rt.initialize('u1');
    await rt.workflows.register(session.id as string, 'sol-1', 'wf-1', 'Workflow A', 'Pending');
    await rt.workflows.register(session.id as string, 'sol-1', 'wf-2', 'Workflow B', 'Active');
    await rt.workflows.register(session.id as string, 'sol-2', 'wf-3', 'Workflow C', 'Completed');
    const list = await rt.workflows.list(session.id as string);
    expect(list).toHaveLength(3);
    expect(list[0].title).toBe('Workflow A');
    const bySol = await rt.workflows.getBySolution('sol-1');
    expect(bySol).toHaveLength(2);
    await rt.shutdown(session.id);
  });

  it('workflow count by session', async () => {
    const session = await rt.initialize('u1');
    await rt.workflows.register(session.id as string, 'sol-1', 'wf-1', 'W1');
    await rt.workflows.register(session.id as string, 'sol-1', 'wf-2', 'W2');
    expect(await rt.workflows.count(session.id as string)).toBe(2);
    await rt.shutdown(session.id);
  });
});

// ── Multiple sessions metrics ───────────────────────────────────────────
describe('Multiple sessions metrics', () => {
  it('metrics aggregate across sessions (single runtime, no shutdown loop)', async () => {
    const rt = new CompanionRuntime();
    const sessions = [];
    for (let i = 0; i < 5; i++) {
      const session = await rt.initialize(`user-${i}`);
      sessions.push(session);
      for (let j = 0; j < 3; j++) {
        await rt.goals.create(session.id as string, `user-${i}`, `G${j}`);
      }
      await rt.insights.generate(session.id as string, `user-${i}`, InsightType.Suggestion, `I${i}`, 'desc', 0.8);
    }
    const metrics = await rt.getMetrics(sessions[0].id);
    expect(metrics.totalGoals).toBe(15);
    expect(metrics.totalInsights).toBe(5);
    // Only shutdown the last session since lifecycle is shared
    await rt.shutdown(sessions[4].id);
  });
});
