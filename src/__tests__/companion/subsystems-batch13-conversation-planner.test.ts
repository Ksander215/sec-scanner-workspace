import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationCenter } from '../../core/companion/conversation-center.js';
import { DailyPlanner } from '../../core/companion/daily-planner.js';
import {
  DefaultCompanionRuntimeConfig, ConversationRole, GoalPriority, GoalStatus,
  DailyTaskStatus, ConversationCenterConfig, DailyPlannerConfig,
} from '../../core/companion/types.js';
import {
  ConversationNotFoundError, ConversationLimitExceededError, MessageLimitExceededError,
  DailyPlanNotFoundError, TaskLimitExceededError, CompanionError,
} from '../../core/companion/errors.js';

const roles = [ConversationRole.User, ConversationRole.Assistant, ConversationRole.System] as const;
const msgContents = [
  'Hello', 'How are you?', 'Tell me about X', 'What is Y?', 'Help me with Z',
  'Thanks', 'Goodbye', 'Explain this', 'Show me data', 'Next step',
  'Previous step', 'More details', 'Summarize', 'Compare options', 'Why?',
  'How?', 'When?', 'Where?', 'Who?', 'Which one?',
];
const taskTitles = [
  'Review PR', 'Write docs', 'Fix bug', 'Add test', 'Deploy',
  'Refactor', 'Optimize', 'Debug', 'Design', 'Plan sprint',
  'Team standup', 'Code review', 'Update deps', 'Clean up', 'Research',
  'Prototype', 'Validate', 'Implement', 'Integrate', 'Release',
];

// ── ConversationCenter: create ─────────────────────────────────────────
describe('ConversationCenter create', () => {
  let cc: ConversationCenter;
  beforeEach(() => { cc = new ConversationCenter(DefaultCompanionRuntimeConfig.conversationCenterConfig); });

  for (let i = 0; i < 20; i++) {
    it(`creates conversation variant ${i}`, async () => {
      const c = await cc.create(`s${i}`, `u${i % 3}`);
      expect(c.userId).toBe(`u${i % 3}`);
      expect(c.title).toBe('New Conversation');
      expect(c.messages).toHaveLength(0);
    });
  }

  for (let i = 0; i < 20; i++) {
    it(`creates with title variant ${i}`, async () => {
      const c = await cc.create('s1', 'u1', `Title ${i}`);
      expect(c.title).toBe(`Title ${i}`);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`created conversation ${i} is frozen`, async () => {
      expect(Object.isFrozen(await cc.create('s1', 'u1', `T${i}`))).toBe(true);
    });
  }

  it('conversation metadata is frozen', async () => {
    const c = await cc.create('s1', 'u1');
    expect(Object.isFrozen(c.metadata)).toBe(true);
  });

  for (let i = 0; i < 10; i++) {
    it(`unique conversation id pair ${i}`, async () => {
      const a = await cc.create('s1', 'u1');
      const b = await cc.create('s1', 'u1');
      expect(a.id).not.toBe(b.id);
    });
  }

  it('null eventBus constructor', () => {
    expect(new ConversationCenter(DefaultCompanionRuntimeConfig.conversationCenterConfig, null)).toBeDefined();
  });
});

// ── ConversationCenter: addMessage with each ConversationRole ──────────
describe('ConversationCenter addMessage', () => {
  let cc: ConversationCenter;
  beforeEach(() => { cc = new ConversationCenter(DefaultCompanionRuntimeConfig.conversationCenterConfig); });

  for (const role of roles) {
    for (let i = 0; i < 15; i++) {
      it(`adds ${role} message variant ${i}`, async () => {
        const c = await cc.create('s1', 'u1');
        const m = await cc.addMessage(c.id as string, role, msgContents[i]);
        expect(m.role).toBe(role);
        expect(m.content).toBe(msgContents[i]);
        expect(m.conversationId).toBe(c.id);
      });
    }
  }

  for (const role of roles) {
    it(`message frozen for role ${role}`, async () => {
      const c = await cc.create('s1', 'u1');
      const m = await cc.addMessage(c.id as string, role, 'msg');
      expect(Object.isFrozen(m)).toBe(true);
      expect(Object.isFrozen(m.metadata)).toBe(true);
    });
  }

  for (const role of roles) {
    for (let i = 1; i <= 10; i++) {
      it(`adds ${i} ${role} messages sequentially`, async () => {
        const c = await cc.create('s1', 'u1');
        for (let j = 0; j < i; j++) {
          await cc.addMessage(c.id as string, role, `msg-${j}`);
        }
        const updated = await cc.get(c.id as string);
        expect(updated!.messages).toHaveLength(i);
        expect(updated!.messages.every(m => m.role === role)).toBe(true);
      });
    }
  }

  for (let i = 0; i < 10; i++) {
    it(`multi-role conversation variant ${i}`, async () => {
      const c = await cc.create('s1', 'u1');
      await cc.addMessage(c.id as string, ConversationRole.User, 'q');
      await cc.addMessage(c.id as string, ConversationRole.Assistant, 'a');
      if (i % 2 === 0) await cc.addMessage(c.id as string, ConversationRole.System, 'sys');
      const updated = await cc.get(c.id as string);
      expect(updated!.messages).toHaveLength(i % 2 === 0 ? 3 : 2);
    });
  }

  it('addMessage updates conversation updatedAt', async () => {
    const c = await cc.create('s1', 'u1');
    await cc.addMessage(c.id as string, ConversationRole.User, 'hi');
    const updated = await cc.get(c.id as string);
    expect(updated!.messages).toHaveLength(1);
    expect(updated!.updatedAt).toBeTruthy();
  });
});

// ── ConversationCenter: limits ──────────────────────────────────────────
describe('ConversationCenter limits', () => {
  it('conversation limit', async () => {
    const cfg: ConversationCenterConfig = { maxMessagesPerConversation: 1000, maxConversationsPerSession: 2 };
    const cc = new ConversationCenter(cfg);
    await cc.create('s1', 'u1');
    await cc.create('s1', 'u1');
    await expect(cc.create('s1', 'u1')).rejects.toThrow(ConversationLimitExceededError);
  });

  it('ConversationLimitExceededError has correct fields', async () => {
    const cfg: ConversationCenterConfig = { maxMessagesPerConversation: 1000, maxConversationsPerSession: 1 };
    const cc = new ConversationCenter(cfg);
    await cc.create('s1', 'u1');
    try { await cc.create('s1', 'u1'); } catch (e) {
      expect(e).toBeInstanceOf(ConversationLimitExceededError);
      expect((e as ConversationLimitExceededError).code).toBe('CONVERSATION_LIMIT');
      expect((e as ConversationLimitExceededError).limit).toBe(1);
      expect((e as ConversationLimitExceededError).current).toBe(1);
    }
  });

  for (const limit of [1, 3, 5, 10]) {
    it(`message limit of ${limit}`, async () => {
      const cfg: ConversationCenterConfig = { maxMessagesPerConversation: limit, maxConversationsPerSession: 50 };
      const cc = new ConversationCenter(cfg);
      const c = await cc.create('s1', 'u1');
      for (let i = 0; i < limit; i++) {
        await cc.addMessage(c.id as string, ConversationRole.User, `msg-${i}`);
      }
      await expect(cc.addMessage(c.id as string, ConversationRole.User, 'overflow')).rejects.toThrow(MessageLimitExceededError);
    });
  }

  it('MessageLimitExceededError has correct fields', async () => {
    const cfg: ConversationCenterConfig = { maxMessagesPerConversation: 1, maxConversationsPerSession: 50 };
    const cc = new ConversationCenter(cfg);
    const c = await cc.create('s1', 'u1');
    await cc.addMessage(c.id as string, ConversationRole.User, 'msg');
    try { await cc.addMessage(c.id as string, ConversationRole.User, 'overflow'); } catch (e) {
      expect(e).toBeInstanceOf(MessageLimitExceededError);
      expect((e as MessageLimitExceededError).code).toBe('MESSAGE_LIMIT');
      expect((e as MessageLimitExceededError).limit).toBe(1);
      expect((e as MessageLimitExceededError).current).toBe(1);
    }
  });

  it('limit is per session', async () => {
    const cfg: ConversationCenterConfig = { maxMessagesPerConversation: 1000, maxConversationsPerSession: 1 };
    const cc = new ConversationCenter(cfg);
    await cc.create('s1', 'u1');
    await expect(cc.create('s2', 'u1')).resolves.toBeDefined();
  });
});

// ── ConversationCenter: get, list, count, remove, errors ────────────────
describe('ConversationCenter get list count remove', () => {
  let cc: ConversationCenter;
  beforeEach(() => { cc = new ConversationCenter(DefaultCompanionRuntimeConfig.conversationCenterConfig); });

  it('get returns null for missing', async () => {
    expect(await cc.get('x')).toBeNull();
  });

  for (let i = 1; i <= 15; i++) {
    it(`list returns ${i} conversations`, async () => {
      for (let j = 0; j < i; j++) { await cc.create('s1', 'u1'); }
      expect((await cc.list('s1'))).toHaveLength(i);
    });
  }

  it('list filters by session', async () => {
    for (let j = 0; j < 5; j++) { await cc.create('s1', 'u1'); }
    for (let j = 0; j < 3; j++) { await cc.create('s2', 'u1'); }
    expect((await cc.list('s1'))).toHaveLength(5);
    expect((await cc.list('s2'))).toHaveLength(3);
  });

  for (let i = 1; i <= 15; i++) {
    it(`count returns ${i}`, async () => {
      for (let j = 0; j < i; j++) { await cc.create('s1', 'u1'); }
      expect(await cc.count('s1')).toBe(i);
    });
  }

  it('count zero for empty', async () => {
    expect(await cc.count('empty')).toBe(0);
  });

  for (let i = 0; i < 10; i++) {
    it(`remove conversation variant ${i}`, async () => {
      const c = await cc.create('s1', 'u1', `Conv ${i}`);
      await cc.remove(c.id as string);
      expect(await cc.get(c.id as string)).toBeNull();
      expect(await cc.count('s1')).toBe(0);
    });
  }

  it('remove nonexistent throws', async () => {
    await expect(cc.remove('x')).rejects.toThrow(ConversationNotFoundError);
  });

  it('addMessage to missing throws', async () => {
    await expect(cc.addMessage('x', ConversationRole.User, 'hi')).rejects.toThrow(ConversationNotFoundError);
  });

  it('ConversationNotFoundError has correct code', () => {
    const e = new ConversationNotFoundError('conv-123');
    expect(e.code).toBe('CONVERSATION_NOT_FOUND');
    expect(e.conversationId).toBe('conv-123');
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('ConversationLimitExceededError inherits CompanionError', () => {
    const e = new ConversationLimitExceededError(5, 5);
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('MessageLimitExceededError inherits CompanionError', () => {
    const e = new MessageLimitExceededError(10, 10);
    expect(e).toBeInstanceOf(CompanionError);
  });
});

// ── DailyPlanner: create ────────────────────────────────────────────────
describe('DailyPlanner create', () => {
  let dp: DailyPlanner;
  beforeEach(() => { dp = new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig); });

  for (let i = 0; i < 15; i++) {
    it(`creates plan variant ${i}`, async () => {
      const p = await dp.create(`s${i}`, `u${i % 3}`);
      expect(p.userId).toBe(`u${i % 3}`);
      expect(p.tasks).toHaveLength(0);
      expect(p.focusArea).toBe('');
      expect(p.overallPriority).toBe(GoalPriority.Medium);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`creates with date ${2025}-${String(i + 1).padStart(2, '0')}-15`, async () => {
      const date = `2025-${String(i + 1).padStart(2, '0')}-15`;
      const p = await dp.create('s1', 'u1', date);
      expect(p.date).toBe(date);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`plan ${i} is frozen`, async () => {
      expect(Object.isFrozen(await dp.create('s1', 'u1'))).toBe(true);
    });
  }

  it('plan metadata is frozen', async () => {
    const p = await dp.create('s1', 'u1');
    expect(Object.isFrozen(p.metadata)).toBe(true);
  });

  for (let i = 0; i < 10; i++) {
    it(`unique plan id pair ${i}`, async () => {
      const a = await dp.create('s1', 'u1');
      const b = await dp.create('s1', 'u1');
      expect(a.id).not.toBe(b.id);
    });
  }

  it('null eventBus constructor', () => {
    expect(new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig, null)).toBeDefined();
  });
});

// ── DailyPlanner: addTask ───────────────────────────────────────────────
describe('DailyPlanner addTask', () => {
  let dp: DailyPlanner;
  beforeEach(() => { dp = new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig); });

  for (let i = 0; i < 20; i++) {
    it(`adds task ${taskTitles[i]}`, async () => {
      const p = await dp.create('s1', 'u1');
      const u = await dp.addTask(p.id as string, taskTitles[i]);
      expect(u.tasks).toHaveLength(1);
      expect(u.tasks[0].title).toBe(taskTitles[i]);
    });
  }

  for (const p of [GoalPriority.Critical, GoalPriority.High, GoalPriority.Medium, GoalPriority.Low, GoalPriority.Aspirational]) {
    it(`adds task with priority ${p}`, async () => {
      const plan = await dp.create('s1', 'u1');
      const u = await dp.addTask(plan.id as string, 'T', 'd', p, 45);
      expect(u.tasks[0].priority).toBe(p);
    });
  }

  for (let i = 1; i <= 10; i++) {
    it(`adds ${i} tasks to plan`, async () => {
      const p = await dp.create('s1', 'u1');
      for (let j = 0; j < i; j++) {
        await dp.addTask(p.id as string, `Task ${j}`);
      }
      const updated = await dp.get(p.id as string);
      expect(updated!.tasks).toHaveLength(i);
    });
  }

  for (const mins of [5, 10, 15, 30, 45, 60, 90, 120, 180, 240]) {
    it(`sets estimatedMinutes to ${mins}`, async () => {
      const p = await dp.create('s1', 'u1');
      const u = await dp.addTask(p.id as string, 'T', '', GoalPriority.Medium, mins);
      expect(u.tasks[0].estimatedMinutes).toBe(mins);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`task ${i} is frozen`, async () => {
      const p = await dp.create('s1', 'u1');
      const u = await dp.addTask(p.id as string, `T${i}`);
      expect(Object.isFrozen(u.tasks[0])).toBe(true);
      expect(Object.isFrozen(u.tasks[0].metadata)).toBe(true);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`addTask sets relatedGoalId variant ${i}`, async () => {
      const p = await dp.create('s1', 'u1');
      const u = await dp.addTask(p.id as string, 'T', '', GoalPriority.Medium, 30, `goal-${i}`);
      expect(u.tasks[0].relatedGoalId).toBe(`goal-${i}`);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`addTask default relatedGoalId is null variant ${i}`, async () => {
      const p = await dp.create('s1', 'u1');
      const u = await dp.addTask(p.id as string, `T${i}`);
      expect(u.tasks[0].relatedGoalId).toBeNull();
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`addTask sets description variant ${i}`, async () => {
      const p = await dp.create('s1', 'u1');
      const u = await dp.addTask(p.id as string, 'T', `desc-${i}`);
      expect(u.tasks[0].description).toBe(`desc-${i}`);
    });
  }
});

// ── DailyPlanner: completeTask ──────────────────────────────────────────
describe('DailyPlanner completeTask', () => {
  let dp: DailyPlanner;
  beforeEach(() => { dp = new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig); });

  for (let i = 0; i < 10; i++) {
    it(`completes task ${i}`, async () => {
      const p = await dp.create('s1', 'u1');
      const u1 = await dp.addTask(p.id as string, taskTitles[i]);
      const u2 = await dp.completeTask(p.id as string, u1.tasks[0].id as string);
      expect(u2.tasks[0].status).toBe(DailyTaskStatus.Completed);
      expect(u2.tasks[0].completedAt).not.toBeNull();
    });
  }

  it('completes one task leaves others Pending', async () => {
    const p = await dp.create('s1', 'u1');
    const u1 = await dp.addTask(p.id as string, 'T1');
    await dp.addTask(p.id as string, 'T2');
    const u2 = await dp.completeTask(p.id as string, u1.tasks[0].id as string);
    expect(u2.tasks[0].status).toBe(DailyTaskStatus.Completed);
    expect(u2.tasks[1].status).toBe(DailyTaskStatus.Pending);
  });

  for (let i = 0; i < 5; i++) {
    it(`completes task ${i} in plan with ${i + 3} tasks`, async () => {
      const p = await dp.create('s1', 'u1');
      const ids: string[] = [];
      for (let j = 0; j < i + 3; j++) {
        const u = await dp.addTask(p.id as string, `T${j}`);
        ids.push(u.tasks[u.tasks.length - 1].id as string);
      }
      const u2 = await dp.completeTask(p.id as string, ids[i]);
      expect(u2.tasks[i].status).toBe(DailyTaskStatus.Completed);
      expect(u2.tasks.filter(t => t.status === DailyTaskStatus.Pending)).toHaveLength(i + 2);
    });
  }

  it('completeTask throws for missing plan', async () => {
    await expect(dp.completeTask('x', 't')).rejects.toThrow(DailyPlanNotFoundError);
  });
});

// ── DailyPlanner: completePlan ──────────────────────────────────────────
describe('DailyPlanner completePlan', () => {
  let dp: DailyPlanner;
  beforeEach(() => { dp = new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig); });

  for (let i = 0; i < 10; i++) {
    it(`completes plan with ${i + 1} tasks`, async () => {
      const p = await dp.create('s1', 'u1');
      for (let j = 0; j < i + 1; j++) { await dp.addTask(p.id as string, `T${j}`); }
      const u = await dp.completePlan(p.id as string);
      expect(u.tasks.every(t => t.status === DailyTaskStatus.Completed)).toBe(true);
    });
  }

  it('completePlan preserves task titles', async () => {
    const p = await dp.create('s1', 'u1');
    await dp.addTask(p.id as string, 'T1');
    await dp.addTask(p.id as string, 'T2');
    const u = await dp.completePlan(p.id as string);
    expect(u.tasks[0].title).toBe('T1');
    expect(u.tasks[1].title).toBe('T2');
  });

  it('completePlan empty plan', async () => {
    const p = await dp.create('s1', 'u1');
    const u = await dp.completePlan(p.id as string);
    expect(u.tasks).toHaveLength(0);
  });

  it('completePlan throws for missing plan', async () => {
    await expect(dp.completePlan('x')).rejects.toThrow(DailyPlanNotFoundError);
  });

  for (let i = 0; i < 5; i++) {
    it(`completePlan sets completedAt on all tasks variant ${i}`, async () => {
      const p = await dp.create('s1', 'u1');
      for (let j = 0; j < i + 2; j++) { await dp.addTask(p.id as string, `T${j}`); }
      const u = await dp.completePlan(p.id as string);
      expect(u.tasks.every(t => t.completedAt !== null)).toBe(true);
    });
  }
});

// ── DailyPlanner: getActivePlan ─────────────────────────────────────────
describe('DailyPlanner getActivePlan', () => {
  let dp: DailyPlanner;
  beforeEach(() => { dp = new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig); });

  it('returns null for no plans', async () => {
    expect(await dp.getActivePlan('no-user')).toBeNull();
  });

  it('returns today plan', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await dp.create('s1', 'u1', today);
    const active = await dp.getActivePlan('u1');
    expect(active).not.toBeNull();
    expect(active!.date).toBe(today);
  });

  it('ignores past plans', async () => {
    await dp.create('s1', 'u1', '2024-01-01');
    await dp.create('s1', 'u1', '2024-06-01');
    const today = new Date().toISOString().slice(0, 10);
    await dp.create('s1', 'u1', today);
    const active = await dp.getActivePlan('u1');
    expect(active).not.toBeNull();
    expect(active!.date).toBe(today);
  });

  for (let i = 0; i < 5; i++) {
    it(`ignores future plan ${2026}-${String(i + 1).padStart(2, '0')}-01`, async () => {
      const today = new Date().toISOString().slice(0, 10);
      await dp.create('s1', 'u1', today);
      const future = `2026-${String(i + 1).padStart(2, '0')}-01`;
      await dp.create('s1', 'u1', future);
      const active = await dp.getActivePlan('u1');
      expect(active!.date).toBe(today);
    });
  }

  it('filters by user', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await dp.create('s1', 'u1', today);
    expect(await dp.getActivePlan('u2')).toBeNull();
  });
});

// ── DailyPlanner: list, count, get, errors ──────────────────────────────
describe('DailyPlanner list count get', () => {
  let dp: DailyPlanner;
  beforeEach(() => { dp = new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig); });

  for (let i = 1; i <= 10; i++) {
    it(`list returns ${i} plans for user`, async () => {
      for (let j = 0; j < i; j++) { await dp.create(`s${j}`, 'u1', `2025-01-${String(j + 1).padStart(2, '0')}`); }
      expect((await dp.list('u1'))).toHaveLength(i);
    });
  }

  it('list filters by user', async () => {
    await dp.create('s1', 'u1');
    await dp.create('s2', 'u2');
    await dp.create('s3', 'u1');
    expect((await dp.list('u1'))).toHaveLength(2);
    expect((await dp.list('u2'))).toHaveLength(1);
  });

  for (let i = 1; i <= 10; i++) {
    it(`count returns ${i}`, async () => {
      for (let j = 0; j < i; j++) { await dp.create(`s${j}`, 'u1'); }
      expect(await dp.count('u1')).toBe(i);
    });
  }

  it('get returns null for missing', async () => {
    expect(await dp.get('x')).toBeNull();
  });

  it('get returns plan', async () => {
    const p = await dp.create('s1', 'u1');
    const found = await dp.get(p.id as string);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(p.id);
  });

  it('DailyPlanNotFoundError has correct fields', () => {
    const e = new DailyPlanNotFoundError('plan-123');
    expect(e.code).toBe('DAILY_PLAN_NOT_FOUND');
    expect(e.planId).toBe('plan-123');
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('TaskLimitExceededError has correct fields', () => {
    const e = new TaskLimitExceededError(50, 50);
    expect(e.code).toBe('TASK_LIMIT');
    expect(e.limit).toBe(50);
    expect(e.current).toBe(50);
    expect(e).toBeInstanceOf(CompanionError);
  });
});

// ── DailyPlanner: task limits ───────────────────────────────────────────
describe('DailyPlanner task limits', () => {
  for (const limit of [1, 3, 5, 10]) {
    it(`respects task limit of ${limit}`, async () => {
      const cfg: DailyPlannerConfig = { maxTasksPerPlan: limit, defaultEstimatedMinutes: 30 };
      const dp = new DailyPlanner(cfg);
      const p = await dp.create('s1', 'u1');
      for (let j = 0; j < limit; j++) { await dp.addTask(p.id as string, `T${j}`); }
      await expect(dp.addTask(p.id as string, 'overflow')).rejects.toThrow(TaskLimitExceededError);
    });
  }

  it('TaskLimitExceededError correct current', async () => {
    const cfg: DailyPlannerConfig = { maxTasksPerPlan: 2, defaultEstimatedMinutes: 30 };
    const dp = new DailyPlanner(cfg);
    const p = await dp.create('s1', 'u1');
    await dp.addTask(p.id as string, 'T1');
    await dp.addTask(p.id as string, 'T2');
    try { await dp.addTask(p.id as string, 'T3'); } catch (e) {
      expect(e).toBeInstanceOf(TaskLimitExceededError);
      expect((e as TaskLimitExceededError).current).toBe(2);
    }
  });
});
