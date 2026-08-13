import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationCenter } from '../../core/companion/conversation-center.js';
import { GoalCenter } from '../../core/companion/goal-center.js';
import { DailyPlanner } from '../../core/companion/daily-planner.js';
import {
  DefaultCompanionRuntimeConfig, ConversationRole, GoalPriority, GoalStatus,
  DailyTaskStatus,
} from '../../core/companion/types.js';
import {
  ConversationNotFoundError, ConversationLimitExceededError, MessageLimitExceededError,
  GoalNotFoundError, GoalLimitExceededError,
  DailyPlanNotFoundError, TaskLimitExceededError,
} from '../../core/companion/errors.js';

describe('ConversationCenter', () => {
  let cc: ConversationCenter;
  beforeEach(() => { cc = new ConversationCenter(DefaultCompanionRuntimeConfig.conversationCenterConfig); });

  it('creates conversation', async () => { const c = await cc.create('s1','u1'); expect(c.userId).toBe('u1'); expect(c.title).toBe('New Conversation'); expect(c.messages).toHaveLength(0); });
  it('creates with title', async () => { expect((await cc.create('s1','u1','T')).title).toBe('T'); });
  it('get returns conv', async () => { const c = await cc.create('s1','u1'); expect(await cc.get(c.id as string)).not.toBeNull(); });
  it('get null missing', async () => { expect(await cc.get('x')).toBeNull(); });
  it('list by session', async () => { await cc.create('s1','u1'); await cc.create('s1','u1'); await cc.create('s2','u1'); expect((await cc.list('s1'))).toHaveLength(2); });
  it('addMessage User', async () => { const c = await cc.create('s1','u1'); const m = await cc.addMessage(c.id as string, ConversationRole.User, 'hi'); expect(m.role).toBe(ConversationRole.User); expect(m.content).toBe('hi'); });
  it('addMessage Assistant', async () => { const c = await cc.create('s1','u1'); const m = await cc.addMessage(c.id as string, ConversationRole.Assistant, 'hi'); expect(m.role).toBe(ConversationRole.Assistant); expect(m.content).toBe('hi'); });
  it('addMessage System', async () => { const c = await cc.create('s1','u1'); const m = await cc.addMessage(c.id as string, ConversationRole.System, 'hi'); expect(m.role).toBe(ConversationRole.System); expect(m.content).toBe('hi'); });
  it('addMessage updates conv', async () => { const c = await cc.create('s1','u1'); await cc.addMessage(c.id as string, ConversationRole.User, 'hi'); expect((await cc.get(c.id as string))!.messages).toHaveLength(1); });
  it('addMessage throws missing', async () => { await expect(cc.addMessage('x', ConversationRole.User, 'hi')).rejects.toThrow(ConversationNotFoundError); });
  it('remove', async () => { const c = await cc.create('s1','u1'); await cc.remove(c.id as string); expect(await cc.get(c.id as string)).toBeNull(); });
  it('remove throws missing', async () => { await expect(cc.remove('x')).rejects.toThrow(ConversationNotFoundError); });
  it('count', async () => { await cc.create('s1','u1'); await cc.create('s1','u1'); expect(await cc.count('s1')).toBe(2); expect(await cc.count('s2')).toBe(0); });
  it('conv frozen', async () => { expect(Object.isFrozen(await cc.create('s1','u1'))).toBe(true); });
  it('msg frozen', async () => { const c = await cc.create('s1','u1'); const m = await cc.addMessage(c.id as string, ConversationRole.User, 'hi'); expect(Object.isFrozen(m)).toBe(true); });
  it('unique id 0', async () => { const a = await cc.create('s{i}','u{i}'); const b = await cc.create('s{i}','u{i}'); expect(a.id).not.toBe(b.id); });
  it('unique id 1', async () => { const a = await cc.create('s{i}','u{i}'); const b = await cc.create('s{i}','u{i}'); expect(a.id).not.toBe(b.id); });
  it('unique id 2', async () => { const a = await cc.create('s{i}','u{i}'); const b = await cc.create('s{i}','u{i}'); expect(a.id).not.toBe(b.id); });
  it('null eventBus', () => { expect(new ConversationCenter(DefaultCompanionRuntimeConfig.conversationCenterConfig, null)).toBeDefined(); });
});

describe('GoalCenter', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultCompanionRuntimeConfig.goalCenterConfig); });

  it('creates goal', async () => { const g = await gc.create('s1','u1','G','desc',GoalPriority.High); expect(g.title).toBe('G'); expect(g.priority).toBe(GoalPriority.High); expect(g.status).toBe(GoalStatus.Draft); expect(g.progress).toBe(0); });
  it('creates with defaults', async () => { const g = await gc.create('s1','u1','G'); expect(g.priority).toBe(GoalPriority.Medium); expect(g.description).toBe(''); });
  it('get returns goal', async () => { const g = await gc.create('s1','u1','G'); expect(await gc.get(g.id as string)).not.toBeNull(); });
  it('get null missing', async () => { expect(await gc.get('x')).toBeNull(); });
  it('list by session', async () => { await gc.create('s1','u1','G1'); await gc.create('s1','u1','G2'); await gc.create('s2','u1','G3'); expect((await gc.list('s1'))).toHaveLength(2); });
  it('update title', async () => { const g = await gc.create('s1','u1','G'); expect((await gc.update(g.id as string, { title: 'New' })).title).toBe('New'); });
  it('update description', async () => { const g = await gc.create('s1','u1','G'); expect((await gc.update(g.id as string, { description: 'D' })).description).toBe('D'); });
  it('update progress', async () => { const g = await gc.create('s1','u1','G'); expect((await gc.update(g.id as string, { progress: 50 })).progress).toBe(50); });
  it('update status', async () => { const g = await gc.create('s1','u1','G'); expect((await gc.update(g.id as string, { status: GoalStatus.Active })).status).toBe(GoalStatus.Active); });
  it('update priority', async () => { const g = await gc.create('s1','u1','G'); expect((await gc.update(g.id as string, { priority: GoalPriority.Critical })).priority).toBe(GoalPriority.Critical); });
  it('complete sets Completed + progress 100', async () => { const g = await gc.create('s1','u1','G'); const u = await gc.complete(g.id as string); expect(u.status).toBe(GoalStatus.Completed); expect(u.progress).toBe(100); });
  it('complete throws missing', async () => { await expect(gc.complete('x')).rejects.toThrow(GoalNotFoundError); });
  it('update throws missing', async () => { await expect(gc.update('x', { title: 'X' })).rejects.toThrow(GoalNotFoundError); });
  it('remove', async () => { const g = await gc.create('s1','u1','G'); await gc.remove(g.id as string); expect(await gc.get(g.id as string)).toBeNull(); });
  it('count', async () => { await gc.create('s1','u1','G1'); await gc.create('s1','u1','G2'); expect(await gc.count('s1')).toBe(2); });
  it('priority Critical', async () => { expect((await gc.create('s1','u1','G','',GoalPriority.Critical)).priority).toBe(GoalPriority.Critical); });
  it('priority High', async () => { expect((await gc.create('s1','u1','G','',GoalPriority.High)).priority).toBe(GoalPriority.High); });
  it('priority Medium', async () => { expect((await gc.create('s1','u1','G','',GoalPriority.Medium)).priority).toBe(GoalPriority.Medium); });
  it('priority Low', async () => { expect((await gc.create('s1','u1','G','',GoalPriority.Low)).priority).toBe(GoalPriority.Low); });
  it('priority Aspirational', async () => { expect((await gc.create('s1','u1','G','',GoalPriority.Aspirational)).priority).toBe(GoalPriority.Aspirational); });
  it('targetDate null by default', async () => { expect((await gc.create('s1','u1','G')).targetDate).toBeNull(); });
  it('goal frozen', async () => { expect(Object.isFrozen(await gc.create('s1','u1','G'))).toBe(true); });
  it('unique id 0', async () => { const a = await gc.create('s{i}','u{i}','G'); const b = await gc.create('s{i}','u{i}','G'); expect(a.id).not.toBe(b.id); });
  it('unique id 1', async () => { const a = await gc.create('s{i}','u{i}','G'); const b = await gc.create('s{i}','u{i}','G'); expect(a.id).not.toBe(b.id); });
  it('unique id 2', async () => { const a = await gc.create('s{i}','u{i}','G'); const b = await gc.create('s{i}','u{i}','G'); expect(a.id).not.toBe(b.id); });
  it('null eventBus', () => { expect(new GoalCenter(DefaultCompanionRuntimeConfig.goalCenterConfig, null)).toBeDefined(); });
});

describe('DailyPlanner', () => {
  let dp: DailyPlanner;
  beforeEach(() => { dp = new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig); });

  it('creates plan', async () => { const p = await dp.create('s1','u1'); expect(p.userId).toBe('u1'); expect(p.tasks).toHaveLength(0); expect(p.focusArea).toBe(''); });
  it('creates with date', async () => { expect((await dp.create('s1','u1','2025-01-15')).date).toBe('2025-01-15'); });
  it('get returns plan', async () => { const p = await dp.create('s1','u1'); expect(await dp.get(p.id as string)).not.toBeNull(); });
  it('get null missing', async () => { expect(await dp.get('x')).toBeNull(); });
  it('getActivePlan null no user', async () => { expect(await dp.getActivePlan('no')).toBeNull(); });
  it('getActivePlan returns today', async () => { const today = new Date().toISOString().slice(0,10); await dp.create('s1','u1',today); expect(await dp.getActivePlan('u1')).not.toBeNull(); });
  it('addTask', async () => { const p = await dp.create('s1','u1'); const u = await dp.addTask(p.id as string, 'Task 1', 'desc', GoalPriority.High, 45, 'goal-1'); expect(u.tasks).toHaveLength(1); expect(u.tasks[0].title).toBe('Task 1'); expect(u.tasks[0].priority).toBe(GoalPriority.High); expect(u.tasks[0].estimatedMinutes).toBe(45); });
  it('addTask defaults', async () => { const p = await dp.create('s1','u1'); const u = await dp.addTask(p.id as string, 'T'); expect(u.tasks[0].status).toBe(DailyTaskStatus.Pending); expect(u.tasks[0].estimatedMinutes).toBe(30); expect(u.tasks[0].relatedGoalId).toBeNull(); });
  it('addTask throws missing plan', async () => { await expect(dp.addTask('x','T')).rejects.toThrow(DailyPlanNotFoundError); });
  it('completeTask', async () => { const p = await dp.create('s1','u1'); const u1 = await dp.addTask(p.id as string, 'T'); const u2 = await dp.completeTask(p.id as string, u1.tasks[0].id as string); expect(u2.tasks[0].status).toBe(DailyTaskStatus.Completed); expect(u2.tasks[0].completedAt).not.toBeNull(); });
  it('completeTask throws missing plan', async () => { await expect(dp.completeTask('x','t')).rejects.toThrow(DailyPlanNotFoundError); });
  it('completePlan', async () => { const p = await dp.create('s1','u1'); const u1 = await dp.addTask(p.id as string, 'T1'); const u2 = await dp.completePlan(p.id as string); expect(u2.tasks.every(t => t.status === DailyTaskStatus.Completed)).toBe(true); });
  it('completePlan partial', async () => { const p = await dp.create('s1','u1'); const u1 = await dp.addTask(p.id as string, 'T1'); const u2 = await dp.addTask(p.id as string, 'T2'); await dp.completeTask(p.id as string, u1.tasks[0].id as string); const u3 = await dp.completePlan(p.id as string); expect(u3.tasks.every(t => t.status === DailyTaskStatus.Completed)).toBe(true); });
  it('list by user', async () => { await dp.create('s1','u1'); await dp.create('s2','u1'); await dp.create('s3','u2'); expect((await dp.list('u1'))).toHaveLength(2); });
  it('count', async () => { await dp.create('s1','u1'); await dp.create('s1','u1'); expect(await dp.count('u1')).toBe(2); expect(await dp.count('u2')).toBe(0); });
  it('task frozen', async () => { const p = await dp.create('s1','u1'); const u = await dp.addTask(p.id as string, 'T'); expect(Object.isFrozen(u.tasks[0])).toBe(true); });
  it('task relatedGoalId preserved', async () => { const p = await dp.create('s1','u1'); const u = await dp.addTask(p.id as string, 'T', '', GoalPriority.Medium, 30, 'g1'); expect(u.tasks[0].relatedGoalId).toBe('g1'); });
  it('plan frozen', async () => { expect(Object.isFrozen(await dp.create('s1','u1'))).toBe(true); });
  it('unique plan id 0', async () => { const a = await dp.create('s{i}','u{i}'); const b = await dp.create('s{i}','u{i}'); expect(a.id).not.toBe(b.id); });
  it('unique plan id 1', async () => { const a = await dp.create('s{i}','u{i}'); const b = await dp.create('s{i}','u{i}'); expect(a.id).not.toBe(b.id); });
  it('unique plan id 2', async () => { const a = await dp.create('s{i}','u{i}'); const b = await dp.create('s{i}','u{i}'); expect(a.id).not.toBe(b.id); });
  it('null eventBus', () => { expect(new DailyPlanner(DefaultCompanionRuntimeConfig.dailyPlannerConfig, null)).toBeDefined(); });
});