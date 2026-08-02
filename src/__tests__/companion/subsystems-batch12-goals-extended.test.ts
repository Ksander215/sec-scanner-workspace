import { describe, it, expect, beforeEach } from 'vitest';
import { GoalCenter } from '../../core/companion/goal-center.js';
import {
  DefaultGoalCenterConfig, GoalPriority, GoalStatus, GoalCenterConfig,
} from '../../core/companion/types.js';
import {
  GoalNotFoundError, GoalLimitExceededError, CompanionError,
} from '../../core/companion/errors.js';

const priorities = [GoalPriority.Critical, GoalPriority.High, GoalPriority.Medium, GoalPriority.Low, GoalPriority.Aspirational] as const;
const statuses = [GoalStatus.Draft, GoalStatus.Active, GoalStatus.InProgress, GoalStatus.Completed, GoalStatus.Abandoned, GoalStatus.Paused] as const;
const progressValues = [0, 10, 25, 33, 50, 67, 75, 90, 95, 100] as const;
const titles = ['Learn TypeScript', 'Build API', 'Deploy App', 'Write Tests', 'Refactor Code', 'Fix Bugs', 'Add Auth', 'Optimize DB', 'Create CI/CD', 'Document API', 'Upgrade Deps', 'Security Audit', 'Mobile App', 'Data Pipeline', 'ML Model', 'UI Overhaul', 'Microservices', 'Cache Layer', 'Search Engine', 'Monitoring', 'Rate Limiter', 'Feature Flags', 'A/B Testing', 'Analytics', 'Logging', 'Error Handling', 'Validation', 'Pagination', 'WebSockets', 'GraphQL', 'REST API', 'gRPC Service', 'Event Sourcing', 'CQRS', 'Saga Pattern', 'Bulk Import', 'Export CSV', 'PDF Reports', 'Email Service', 'Push Notifications'];
const descriptions = ['description-a', 'description-b', 'description-c', 'description-d', 'description-e'];
const sessions = ['sess-b12-1', 'sess-b12-2', 'sess-b12-3'];
const users = ['user-b12-1', 'user-b12-2', 'user-b12-3'];
const targetDates = ['2025-06-01T00:00:00.000Z', '2025-07-15T00:00:00.000Z', '2025-12-31T00:00:00.000Z'];

// ── Create with each GoalPriority ──────────────────────────────────────
describe('GoalCenter create with GoalPriority', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const p of priorities) {
    for (let i = 0; i < 5; i++) {
      it(`creates goal with priority ${p} variant ${i}`, async () => {
        const g = await gc.create(sessions[i % 3], users[i % 3], titles[i], descriptions[i % 5], p);
        expect(g.priority).toBe(p);
        expect(g.title).toBe(titles[i]);
        expect(g.description).toBe(descriptions[i % 5]);
        expect(g.status).toBe(GoalStatus.Draft);
        expect(g.progress).toBe(0);
        expect(g.targetDate).toBeNull();
        expect(g.completedAt).toBeNull();
      });
    }
  }
});

// ── Frozen entities ─────────────────────────────────────────────────────
describe('GoalCenter frozen entities', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const p of priorities) {
    it(`created goal with priority ${p} is frozen`, async () => {
      const g = await gc.create('s1', 'u1', 'F', 'd', p);
      expect(Object.isFrozen(g)).toBe(true);
    });

    it(`goal metadata with priority ${p} is frozen`, async () => {
      const g = await gc.create('s1', 'u1', 'F', 'd', p);
      expect(Object.isFrozen(g.metadata)).toBe(true);
    });
  }

  for (const p of priorities) {
    it(`completed goal with priority ${p} is frozen`, async () => {
      const g = await gc.create('s1', 'u1', 'F', 'd', p);
      const c = await gc.complete(g.id as string);
      expect(Object.isFrozen(c)).toBe(true);
    });
  }

  for (let i = 0; i < 20; i++) {
    it(`updated goal variant ${i} is frozen`, async () => {
      const g = await gc.create('s1', 'u1', titles[i]);
      const u = await gc.update(g.id as string, { title: `Updated ${i}` });
      expect(Object.isFrozen(u)).toBe(true);
    });
  }
});

// ── Update title ─────────────────────────────────────────────────────────
describe('GoalCenter update title', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (let i = 0; i < 40; i++) {
    it(`updates title to variant ${i}`, async () => {
      const g = await gc.create('s1', 'u1', titles[i]);
      const newTitle = `Updated-${i}`;
      const u = await gc.update(g.id as string, { title: newTitle });
      expect(u.title).toBe(newTitle);
      expect(u.updatedAt).toBeTruthy();
      expect(typeof u.updatedAt).toBe('string');
    });
  }
});

// ── Update description ──────────────────────────────────────────────────
describe('GoalCenter update description', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (let i = 0; i < 25; i++) {
    it(`updates description to variant ${i}`, async () => {
      const g = await gc.create('s1', 'u1', 'T', 'old-desc');
      const newDesc = `new-description-${i}`;
      const u = await gc.update(g.id as string, { description: newDesc });
      expect(u.description).toBe(newDesc);
    });
  }
});

// ── Update priority ─────────────────────────────────────────────────────
describe('GoalCenter update priority', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const from of priorities) {
    for (const to of priorities) {
      it(`updates priority from ${from} to ${to}`, async () => {
        const g = await gc.create('s1', 'u1', 'G', 'd', from);
        const u = await gc.update(g.id as string, { priority: to });
        expect(u.priority).toBe(to);
      });
    }
  }
});

// ── Update progress ─────────────────────────────────────────────────────
describe('GoalCenter update progress', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const p of progressValues) {
    it(`updates progress to ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'G');
      const u = await gc.update(g.id as string, { progress: p });
      expect(u.progress).toBe(p);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`incremental progress update ${i}`, async () => {
      const g = await gc.create('s1', 'u1', 'G');
      const u = await gc.update(g.id as string, { progress: (i + 1) * 10 });
      expect(u.progress).toBe((i + 1) * 10);
      expect(g.progress).toBe(0);
    });
  }
});

// ── Update status ───────────────────────────────────────────────────────
describe('GoalCenter update status', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const s of statuses) {
    it(`updates status to ${s}`, async () => {
      const g = await gc.create('s1', 'u1', 'G');
      const u = await gc.update(g.id as string, { status: s });
      expect(u.status).toBe(s);
    });
  }

  for (const from of [GoalStatus.Draft, GoalStatus.Active]) {
    for (const to of statuses) {
      it(`transitions from ${from} to ${to}`, async () => {
        const g = await gc.create('s1', 'u1', 'G');
        await gc.update(g.id as string, { status: from });
        const u = await gc.update(g.id as string, { status: to });
        expect(u.status).toBe(to);
      });
    }
  }
});

// ── Update targetDate ───────────────────────────────────────────────────
describe('GoalCenter update targetDate', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const td of targetDates) {
    it(`sets targetDate to ${td}`, async () => {
      const g = await gc.create('s1', 'u1', 'G');
      const u = await gc.update(g.id as string, { targetDate: td });
      expect(u.targetDate).toBe(td);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`sets targetDate variant ${i}`, async () => {
      const date = `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`;
      const g = await gc.create('s1', 'u1', 'G');
      const u = await gc.update(g.id as string, { targetDate: date });
      expect(u.targetDate).toBe(date);
    });
  }

  for (const td of targetDates) {
    it(`clears targetDate from ${td.slice(0, 10)}`, async () => {
      const g = await gc.create('s1', 'u1', 'G');
      await gc.update(g.id as string, { targetDate: td });
      const u = await gc.update(g.id as string, { targetDate: null as unknown as string });
      expect(u.targetDate).toBeNull();
    });
  }
});

// ── Complete goals ──────────────────────────────────────────────────────
describe('GoalCenter complete', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const p of priorities) {
    it(`completes goal with priority ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'G', 'd', p);
      const c = await gc.complete(g.id as string);
      expect(c.status).toBe(GoalStatus.Completed);
      expect(c.progress).toBe(100);
      expect(c.completedAt).not.toBeNull();
      expect(c.priority).toBe(p);
    });
  }

  for (let i = 0; i < 15; i++) {
    it(`completes goal variant ${i} with prior progress`, async () => {
      const g = await gc.create('s1', 'u1', titles[i]);
      await gc.update(g.id as string, { progress: i * 5 });
      const c = await gc.complete(g.id as string);
      expect(c.progress).toBe(100);
      expect(c.status).toBe(GoalStatus.Completed);
    });
  }

  for (const p of priorities) {
    it(`completed goal with priority ${p} has completedAt set`, async () => {
      const g = await gc.create('s1', 'u1', 'G', '', p);
      const c = await gc.complete(g.id as string);
      expect(c.completedAt).not.toBeNull();
      expect(typeof c.completedAt).toBe('string');
      expect(c.completedAt!.length).toBeGreaterThan(0);
    });
  }
});

// ── Analytics callback ──────────────────────────────────────────────────
describe('GoalCenter analytics callback', () => {
  let gc: GoalCenter;
  let created = 0;
  let completed = 0;
  beforeEach(() => {
    created = 0;
    completed = 0;
    gc = new GoalCenter(DefaultGoalCenterConfig);
    gc.setAnalyticsCallback((e) => { if (e === 'goalCreated') created++; if (e === 'goalCompleted') completed++; });
  });

  for (let i = 1; i <= 20; i++) {
    it(`analytics fires goalCreated for create ${i}`, async () => {
      for (let j = 0; j < i; j++) { await gc.create('s1', 'u1', `G${j}`); }
      expect(created).toBe(i);
    });
  }

  for (let i = 1; i <= 15; i++) {
    it(`analytics fires goalCompleted for complete ${i}`, async () => {
      for (let j = 0; j < i; j++) {
        const g = await gc.create('s1', 'u1', `G${j}`);
        await gc.complete(g.id as string);
      }
      expect(completed).toBe(i);
    });
  }

  it('analytics fires both events in sequence', async () => {
    const g = await gc.create('s1', 'u1', 'G');
    expect(created).toBe(1);
    await gc.complete(g.id as string);
    expect(completed).toBe(1);
  });
});

// ── Limit exceeded ──────────────────────────────────────────────────────
describe('GoalCenter limit exceeded', () => {
  it('throws GoalLimitExceededError at limit', async () => {
    const cfg: GoalCenterConfig = { maxGoalsPerSession: 3, defaultProgress: 0 };
    const gc = new GoalCenter(cfg);
    await gc.create('s1', 'u1', 'G1');
    await gc.create('s1', 'u1', 'G2');
    await gc.create('s1', 'u1', 'G3');
    await expect(gc.create('s1', 'u1', 'G4')).rejects.toThrow(GoalLimitExceededError);
  });

  it('GoalLimitExceededError has correct code', async () => {
    const cfg: GoalCenterConfig = { maxGoalsPerSession: 1, defaultProgress: 0 };
    const gc = new GoalCenter(cfg);
    await gc.create('s1', 'u1', 'G1');
    try { await gc.create('s1', 'u1', 'G2'); } catch (e) {
      expect(e).toBeInstanceOf(GoalLimitExceededError);
      expect((e as GoalLimitExceededError).code).toBe('GOAL_LIMIT');
      expect((e as GoalLimitExceededError).limit).toBe(1);
      expect((e as GoalLimitExceededError).current).toBe(1);
    }
  });

  it('limit is per session', async () => {
    const cfg: GoalCenterConfig = { maxGoalsPerSession: 2, defaultProgress: 0 };
    const gc = new GoalCenter(cfg);
    await gc.create('s1', 'u1', 'G1');
    await gc.create('s1', 'u1', 'G2');
    await expect(gc.create('s2', 'u1', 'G3')).resolves.toBeDefined();
  });

  for (const limit of [1, 2, 5, 10]) {
    it(`respects limit of ${limit}`, async () => {
      const cfg: GoalCenterConfig = { maxGoalsPerSession: limit, defaultProgress: 0 };
      const gc = new GoalCenter(cfg);
      for (let i = 0; i < limit; i++) {
        await gc.create('s1', 'u1', `G${i}`);
      }
      await expect(gc.create('s1', 'u1', 'overflow')).rejects.toThrow(GoalLimitExceededError);
    });
  }
});

// ── Error classes ────────────────────────────────────────────────────────
describe('GoalCenter errors', () => {
  it('GoalNotFoundError has correct code', () => {
    const e = new GoalNotFoundError('g-123');
    expect(e.code).toBe('GOAL_NOT_FOUND');
    expect(e.goalId).toBe('g-123');
    expect(e.message).toContain('g-123');
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('GoalLimitExceededError has correct code', () => {
    const e = new GoalLimitExceededError(10, 10);
    expect(e.code).toBe('GOAL_LIMIT');
    expect(e.limit).toBe(10);
    expect(e.current).toBe(10);
    expect(e.message).toContain('10/10');
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('GoalNotFoundError for update', async () => {
    const gc = new GoalCenter(DefaultGoalCenterConfig);
    try { await gc.update('nonexistent', { title: 'X' }); } catch (e) {
      expect(e).toBeInstanceOf(GoalNotFoundError);
      expect((e as GoalNotFoundError).code).toBe('GOAL_NOT_FOUND');
    }
  });

  it('GoalNotFoundError for complete', async () => {
    const gc = new GoalCenter(DefaultGoalCenterConfig);
    try { await gc.complete('nonexistent'); } catch (e) {
      expect(e).toBeInstanceOf(GoalNotFoundError);
      expect((e as GoalNotFoundError).goalId).toBe('nonexistent');
    }
  });

  it('GoalNotFoundError for remove', async () => {
    const gc = new GoalCenter(DefaultGoalCenterConfig);
    await expect(gc.remove('nonexistent')).rejects.toThrow(GoalNotFoundError);
  });

  for (let i = 0; i < 10; i++) {
    it(`remove nonexistent goal variant ${i}`, async () => {
      const gc = new GoalCenter(DefaultGoalCenterConfig);
      await expect(gc.remove(`fake-${i}`)).rejects.toThrow(GoalNotFoundError);
    });
  }
});

// ── List and count ──────────────────────────────────────────────────────
describe('GoalCenter list and count', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const s of sessions) {
    for (const u of users) {
      it(`list for session ${s} user ${u}`, async () => {
        await gc.create(s, u, 'G1');
        await gc.create(s, u, 'G2');
        const list = await gc.list(s);
        expect(list).toHaveLength(2);
        expect(list[0].sessionId as string).toBe(s);
        expect(list[1].userId).toBe(u);
      });
    }
  }

  it('list empty session', async () => {
    expect((await gc.list('empty-session'))).toHaveLength(0);
  });

  it('count empty session', async () => {
    expect(await gc.count('empty-session')).toBe(0);
  });

  for (const n of [5, 10, 15, 20]) {
    it(`count ${n} goals in session`, async () => {
      for (let i = 0; i < n; i++) { await gc.create('s1', 'u1', `G${i}`); }
      expect(await gc.count('s1')).toBe(n);
    });
  }

  for (const n of [5, 10, 15, 20]) {
    it(`list returns ${n} goals`, async () => {
      for (let i = 0; i < n; i++) { await gc.create('s1', 'u1', `G${i}`); }
      expect((await gc.list('s1'))).toHaveLength(n);
    });
  }
});

// ── Get goals ────────────────────────────────────────────────────────────
describe('GoalCenter get', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const p of priorities) {
    it(`get goal with priority ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'G', 'd', p);
      const found = await gc.get(g.id as string);
      expect(found).not.toBeNull();
      expect(found!.priority).toBe(p);
    });
  }

  for (let i = 0; i < 15; i++) {
    it(`get returns goal with title ${titles[i]}`, async () => {
      const g = await gc.create('s1', 'u1', titles[i]);
      const found = await gc.get(g.id as string);
      expect(found!.title).toBe(titles[i]);
    });
  }

  it('get returns null for missing', async () => {
    expect(await gc.get('nonexistent')).toBeNull();
  });

  it('get returns same reference shape', async () => {
    const g = await gc.create('s1', 'u1', 'G', 'desc');
    const found = await gc.get(g.id as string);
    expect(found!.id).toBe(g.id as string);
    expect(found!.userId).toBe(g.userId);
  });
});

// ── Remove goals ─────────────────────────────────────────────────────────
describe('GoalCenter remove', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const p of priorities) {
    it(`removes goal with priority ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'G', '', p);
      await gc.remove(g.id as string);
      expect(await gc.get(g.id as string)).toBeNull();
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`remove decrements count variant ${i}`, async () => {
      for (let j = 0; j <= i; j++) { await gc.create('s1', 'u1', `G${j}`); }
      const list = await gc.list('s1');
      await gc.remove(list[0].id as string);
      expect(await gc.count('s1')).toBe(i);
    });
  }
});

// ── Multi-session isolation ─────────────────────────────────────────────
describe('GoalCenter multi-session isolation', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (let i = 0; i < 10; i++) {
    it(`session ${sessions[i % 3]} is isolated variant ${i}`, async () => {
      await gc.create(sessions[0], users[0], `G-s0-${i}`);
      await gc.create(sessions[1], users[1], `G-s1-${i}`);
      await gc.create(sessions[2], users[2], `G-s2-${i}`);
      // Each test creates a fresh gc, so each session has exactly 1 goal
      expect(await gc.count(sessions[i % 3])).toBe(1);
    });
  }

  it('goals from different sessions have different sessionIds', async () => {
    const g1 = await gc.create('sess-a', 'u1', 'G1');
    const g2 = await gc.create('sess-b', 'u1', 'G2');
    expect(g1.sessionId as string).toBe('sess-a');
    expect(g2.sessionId as string).toBe('sess-b');
  });

  it('removing from session a does not affect session b', async () => {
    const g1 = await gc.create('sess-a', 'u1', 'G1');
    await gc.create('sess-b', 'u1', 'G2');
    await gc.remove(g1.id as string);
    expect(await gc.count('sess-a')).toBe(0);
    expect(await gc.count('sess-b')).toBe(1);
  });
});

// ── Unique IDs ──────────────────────────────────────────────────────────
describe('GoalCenter unique IDs', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (let i = 0; i < 20; i++) {
    it(`unique id pair ${i}`, async () => {
      const a = await gc.create('s1', 'u1', 'A');
      const b = await gc.create('s1', 'u1', 'B');
      expect(a.id).not.toBe(b.id);
    });
  }
});

// ── Null eventBus ────────────────────────────────────────────────────────
describe('GoalCenter null eventBus', () => {
  it('constructs with null eventBus', () => {
    expect(new GoalCenter(DefaultGoalCenterConfig, null)).toBeDefined();
  });

  it('constructs with undefined eventBus', () => {
    expect(new GoalCenter(DefaultGoalCenterConfig)).toBeDefined();
  });

  it('create works with null eventBus', async () => {
    const gc = new GoalCenter(DefaultGoalCenterConfig, null);
    const g = await gc.create('s1', 'u1', 'G');
    expect(g.title).toBe('G');
  });
});

// ── Update preserves other fields ───────────────────────────────────────
describe('GoalCenter update preserves fields', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const p of priorities) {
    it(`update title preserves priority ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'Old', 'desc', p);
      const u = await gc.update(g.id as string, { title: 'New' });
      expect(u.priority).toBe(p);
      expect(u.description).toBe('desc');
    });

    it(`update priority preserves status for ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'G', 'd', GoalPriority.Medium);
      await gc.update(g.id as string, { status: GoalStatus.Active });
      const u = await gc.update(g.id as string, { priority: p });
      expect(u.status).toBe(GoalStatus.Active);
    });

    it(`update progress preserves priority ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'G', 'd', p);
      const u = await gc.update(g.id as string, { progress: 75 });
      expect(u.priority).toBe(p);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`update preserves createdAt variant ${i}`, async () => {
      const g = await gc.create('s1', 'u1', titles[i]);
      const u = await gc.update(g.id as string, { title: `New ${i}` });
      expect(u.createdAt).toBe(g.createdAt);
    });
  }
});

// ── Complete preserves other fields ─────────────────────────────────────
describe('GoalCenter complete preserves fields', () => {
  let gc: GoalCenter;
  beforeEach(() => { gc = new GoalCenter(DefaultGoalCenterConfig); });

  for (const p of priorities) {
    it(`complete preserves priority ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'G', 'd', p);
      const c = await gc.complete(g.id as string);
      expect(c.priority).toBe(p);
    });

    it(`complete preserves title for priority ${p}`, async () => {
      const g = await gc.create('s1', 'u1', `Title-${p}`, 'desc', p);
      const c = await gc.complete(g.id as string);
      expect(c.title).toBe(`Title-${p}`);
    });

    it(`complete preserves description for priority ${p}`, async () => {
      const g = await gc.create('s1', 'u1', 'G', `desc-${p}`, p);
      const c = await gc.complete(g.id as string);
      expect(c.description).toBe(`desc-${p}`);
    });
  }

  for (const td of targetDates) {
    it(`complete preserves targetDate ${td.slice(0, 10)}`, async () => {
      const g = await gc.create('s1', 'u1', 'G');
      await gc.update(g.id as string, { targetDate: td });
      const c = await gc.complete(g.id as string);
      expect(c.targetDate).toBe(td);
    });
  }
});
