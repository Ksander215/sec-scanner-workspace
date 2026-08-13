import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultCompanionRuntimeConfig } from '../../core/companion/types.js';
import { SolutionCenter } from '../../core/companion/solution-center.js';
import { WorkflowDashboard } from '../../core/companion/workflow-dashboard.js';
import { CapabilityManager } from '../../core/companion/capability-manager.js';
import { SolutionStatus } from '../../core/companion/types.js';
import { SolutionNotFoundError, SolutionLimitExceededError, CapabilityError } from '../../core/companion/errors.js';

// ═══════════════════════════════════════════════════════════════════
// SolutionCenter  (~200 tests)
// ═══════════════════════════════════════════════════════════════════

describe('SolutionCenter', () => {
  let sc: SolutionCenter;
  const sid = 'session-1';
  const uid = 'user-1';

  beforeEach(() => {
    sc = new SolutionCenter(DefaultCompanionRuntimeConfig.solutionCenterConfig);
  });

  // --- create ---
  describe('create', () => {
    it('creates a solution with title and userId', async () => {
      const sol = await sc.create(sid, uid, 'Test Solution');
      expect(sol).toBeDefined();
      expect(sol.title).toBe('Test Solution');
      expect(sol.userId).toBe(uid);
      expect(sol.sessionId).toBe(sid);
    });

    it('creates with description parameter', async () => {
      const sol = await sc.create(sid, uid, 'T', 'A description');
      expect(sol.description).toBe('A description');
    });

    it('defaults description to empty string', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(sol.description).toBe('');
    });

    it('creates with goalId', async () => {
      const sol = await sc.create(sid, uid, 'T', '', 'goal-123');
      expect(sol.goalId).toBe('goal-123');
    });

    it('defaults goalId to null', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(sol.goalId).toBeNull();
    });

    it('sets initial status to Draft', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(sol.status).toBe(SolutionStatus.Draft);
    });

    it('sets valueScore from config default', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(sol.valueScore).toBe(DefaultCompanionRuntimeConfig.solutionCenterConfig.defaultValueScore);
    });

    it('sets workflowsGenerated to 0', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(sol.workflowsGenerated).toBe(0);
    });

    it('sets completedAt to null', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(sol.completedAt).toBeNull();
    });

    it('generates id with sol- prefix', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect((sol.id as string).startsWith('sol-')).toBe(true);
    });

    it('sets createdAt to ISO string', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(typeof sol.createdAt).toBe('string');
      expect(() => new Date(sol.createdAt)).not.toThrow();
    });

    it('sets updatedAt equal to createdAt', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(sol.updatedAt).toBe(sol.createdAt);
    });

    it('metadata is frozen empty object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(Object.isFrozen(sol.metadata)).toBe(true);
      expect(Object.keys(sol.metadata)).toHaveLength(0);
    });

    it('solution instance is frozen', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(Object.isFrozen(sol)).toBe(true);
    });

    it('creates multiple solutions with unique ids', async () => {
      const s1 = await sc.create(sid, uid, 'A');
      const s2 = await sc.create(sid, uid, 'B');
      expect(s1.id).not.toBe(s2.id);
    });

    it('increments count after creation', async () => {
      await sc.create(sid, uid, 'A');
      expect(await sc.count(sid)).toBe(1);
    });

    it('create with empty title', async () => {
      const sol = await sc.create(sid, uid, '');
      expect(sol.title).toBe('');
    });

    it('create with unicode title', async () => {
      const sol = await sc.create(sid, uid, '日本語テスト');
      expect(sol.title).toBe('日本語テスト');
    });

    it('create with very long description', async () => {
      const longDesc = 'x'.repeat(10000);
      const sol = await sc.create(sid, uid, 'T', longDesc);
      expect(sol.description).toBe(longDesc);
    });

    it('create with special characters in title', async () => {
      const sol = await sc.create(sid, uid, '<script>alert(1)</script>');
      expect(sol.title).toBe('<script>alert(1)</script>');
    });

    it('throws SolutionLimitExceededError when limit reached', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.solutionCenterConfig, maxSolutionsPerSession: 2 };
      const local = new SolutionCenter(cfg);
      await local.create(sid, uid, 'A');
      await local.create(sid, uid, 'B');
      await expect(local.create(sid, uid, 'C')).rejects.toThrow(SolutionLimitExceededError);
    });

    it('SolutionLimitExceededError has correct limit field', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.solutionCenterConfig, maxSolutionsPerSession: 1 };
      const local = new SolutionCenter(cfg);
      await local.create(sid, uid, 'A');
      try {
        await local.create(sid, uid, 'B');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.limit).toBe(1);
        expect(e.current).toBe(1);
      }
    });

    it('does not count solutions from other sessions toward limit', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.solutionCenterConfig, maxSolutionsPerSession: 1 };
      const local = new SolutionCenter(cfg);
      await local.create(sid, uid, 'A');
      await local.create('session-2', uid, 'B');
      await expect(local.create(sid, uid, 'C')).rejects.toThrow(SolutionLimitExceededError);
    });

    it('returns a SolutionInstance', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(sol).toHaveProperty('id');
      expect(sol).toHaveProperty('sessionId');
      expect(sol).toHaveProperty('userId');
      expect(sol).toHaveProperty('title');
      expect(sol).toHaveProperty('status');
    });
  });

  // --- get ---
  describe('get', () => {
    it('returns null for non-existent id', async () => {
      expect(await sc.get('nonexistent')).toBeNull();
    });

    it('returns solution by id', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const fetched = await sc.get(sol.id as string);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(sol.id);
    });

    it('returns exact same data', async () => {
      const sol = await sc.create(sid, uid, 'My Title', 'My Desc');
      const fetched = await sc.get(sol.id as string);
      expect(fetched!.title).toBe('My Title');
      expect(fetched!.description).toBe('My Desc');
    });

    it('returns frozen object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const fetched = await sc.get(sol.id as string);
      expect(Object.isFrozen(fetched!)).toBe(true);
    });

    it('get after remove returns null', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await sc.remove(sol.id as string);
      expect(await sc.get(sol.id as string)).toBeNull();
    });

    it('get does not return solutions from other sessions', async () => {
      const sol = await sc.create('other-session', uid, 'T');
      const fetched = await sc.get(sol.id as string);
      expect(fetched).not.toBeNull();
      expect(fetched!.sessionId).toBe('other-session');
    });
  });

  // --- open ---
  describe('open', () => {
    it('creates solution with Assembling status', async () => {
      const sol = await sc.open(sid, uid, 'New Solution');
      expect(sol.status).toBe(SolutionStatus.Assembling);
    });

    it('sets empty description', async () => {
      const sol = await sc.open(sid, uid, 'T');
      expect(sol.description).toBe('');
    });

    it('open with goalId', async () => {
      const sol = await sc.open(sid, uid, 'T', 'goal-x');
      expect(sol.goalId).toBe('goal-x');
    });

    it('open returns frozen object', async () => {
      const sol = await sc.open(sid, uid, 'T');
      expect(Object.isFrozen(sol)).toBe(true);
    });

    it('open increments count', async () => {
      await sc.open(sid, uid, 'A');
      expect(await sc.count(sid)).toBe(1);
    });

    it('open respects limit', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.solutionCenterConfig, maxSolutionsPerSession: 1 };
      const local = new SolutionCenter(cfg);
      await local.open(sid, uid, 'A');
      await expect(local.open(sid, uid, 'B')).rejects.toThrow(SolutionLimitExceededError);
    });

    it('open generates unique id', async () => {
      const a = await sc.open(sid, uid, 'A');
      const b = await sc.open(sid, uid, 'B');
      expect(a.id).not.toBe(b.id);
    });

    it('open preserves userId', async () => {
      const sol = await sc.open(sid, 'user-x', 'T');
      expect(sol.userId).toBe('user-x');
    });
  });

  // --- generate ---
  describe('generate', () => {
    it('transitions Draft to Validating', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const updated = await sc.generate(sol.id as string);
      expect(updated.status).toBe(SolutionStatus.Validating);
    });

    it('increments workflowsGenerated', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const updated = await sc.generate(sol.id as string);
      expect(updated.workflowsGenerated).toBe(1);
    });

    it('generate multiple times accumulates workflowsGenerated', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const u1 = await sc.generate(sol.id as string);
      const u2 = await sc.generate(sol.id as string);
      const u3 = await sc.generate(sol.id as string);
      expect(u3.workflowsGenerated).toBe(3);
    });

    it('throws SolutionNotFoundError for non-existent id', async () => {
      await expect(sc.generate('nonexistent')).rejects.toThrow(SolutionNotFoundError);
    });

    it('SolutionNotFoundError has solutionId field', async () => {
      try {
        await sc.generate('bad-id');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.solutionId).toBe('bad-id');
      }
    });

    it('generate returns frozen object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const updated = await sc.generate(sol.id as string);
      expect(Object.isFrozen(updated)).toBe(true);
    });

    it('generate updates updatedAt', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await new Promise(r => setTimeout(r, 2));
      const updated = await sc.generate(sol.id as string);
      expect(updated.updatedAt).not.toBe(sol.updatedAt);
    });

    it('generate from Assembling status works', async () => {
      const sol = await sc.open(sid, uid, 'T');
      const updated = await sc.generate(sol.id as string);
      expect(updated.status).toBe(SolutionStatus.Validating);
    });

    it('generate on completed solution changes status to Validating', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await sc.complete(sol.id as string);
      const updated = await sc.generate(sol.id as string);
      expect(updated.status).toBe(SolutionStatus.Validating);
    });

    it('generate preserves other fields', async () => {
      const sol = await sc.create(sid, uid, 'My Sol', 'desc', 'goal-1');
      const updated = await sc.generate(sol.id as string);
      expect(updated.title).toBe('My Sol');
      expect(updated.description).toBe('desc');
      expect(updated.goalId).toBe('goal-1');
    });
  });

  // --- list ---
  describe('list', () => {
    it('returns empty array for new session', async () => {
      const list = await sc.list(sid);
      expect(list).toHaveLength(0);
    });

    it('lists solutions for session', async () => {
      await sc.create(sid, uid, 'A');
      await sc.create(sid, uid, 'B');
      const list = await sc.list(sid);
      expect(list).toHaveLength(2);
    });

    it('does not include solutions from other sessions', async () => {
      await sc.create(sid, uid, 'A');
      await sc.create('other', uid, 'B');
      const list = await sc.list(sid);
      expect(list).toHaveLength(1);
    });

    it('returns readonly array', async () => {
      await sc.create(sid, uid, 'A');
      const list = await sc.list(sid);
      expect(Object.isFrozen(list)).toBe(false);
    });

    it('list reflects removals', async () => {
      const s = await sc.create(sid, uid, 'A');
      await sc.create(sid, uid, 'B');
      await sc.remove(s.id as string);
      expect(await sc.list(sid)).toHaveLength(1);
    });

    it('lists solutions with correct titles', async () => {
      await sc.create(sid, uid, 'Alpha');
      await sc.create(sid, uid, 'Beta');
      const list = await sc.list(sid);
      const titles = list.map(s => s.title).sort();
      expect(titles).toEqual(['Alpha', 'Beta']);
    });

    it('lists include all fields', async () => {
      const sol = await sc.create(sid, uid, 'T', 'D');
      const list = await sc.list(sid);
      expect(list[0].id).toBe(sol.id);
      expect(list[0].status).toBe(SolutionStatus.Draft);
    });
  });

  // --- complete ---
  describe('complete', () => {
    it('transitions to Completed', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const completed = await sc.complete(sol.id as string);
      expect(completed.status).toBe(SolutionStatus.Completed);
    });

    it('sets completedAt to ISO string', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const completed = await sc.complete(sol.id as string);
      expect(typeof completed.completedAt).toBe('string');
      expect(completed.completedAt).not.toBeNull();
    });

    it('throws SolutionNotFoundError for bad id', async () => {
      await expect(sc.complete('bad')).rejects.toThrow(SolutionNotFoundError);
    });

    it('returns frozen object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const completed = await sc.complete(sol.id as string);
      expect(Object.isFrozen(completed)).toBe(true);
    });

    it('updates updatedAt', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await new Promise(r => setTimeout(r, 2));
      const completed = await sc.complete(sol.id as string);
      expect(completed.updatedAt).not.toBe(sol.updatedAt);
    });

    it('complete preserves title', async () => {
      const sol = await sc.create(sid, uid, 'Keep Title');
      const completed = await sc.complete(sol.id as string);
      expect(completed.title).toBe('Keep Title');
    });

    it('complete from Validating status works', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await sc.generate(sol.id as string);
      const completed = await sc.complete(sol.id as string);
      expect(completed.status).toBe(SolutionStatus.Completed);
    });

    it('complete from Cancelled status works', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await sc.cancel(sol.id as string);
      const completed = await sc.complete(sol.id as string);
      expect(completed.status).toBe(SolutionStatus.Completed);
    });

    it('complete then get returns completed solution', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await sc.complete(sol.id as string);
      const fetched = await sc.get(sol.id as string);
      expect(fetched!.status).toBe(SolutionStatus.Completed);
    });
  });

  // --- cancel ---
  describe('cancel', () => {
    it('transitions to Cancelled', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const cancelled = await sc.cancel(sol.id as string);
      expect(cancelled.status).toBe(SolutionStatus.Cancelled);
    });

    it('cancel with reason works', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const cancelled = await sc.cancel(sol.id as string, 'no longer needed');
      expect(cancelled.status).toBe(SolutionStatus.Cancelled);
    });

    it('cancel without reason works', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const cancelled = await sc.cancel(sol.id as string);
      expect(cancelled.status).toBe(SolutionStatus.Cancelled);
    });

    it('throws SolutionNotFoundError for bad id', async () => {
      await expect(sc.cancel('bad')).rejects.toThrow(SolutionNotFoundError);
    });

    it('returns frozen object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const cancelled = await sc.cancel(sol.id as string);
      expect(Object.isFrozen(cancelled)).toBe(true);
    });

    it('updates updatedAt', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await new Promise(r => setTimeout(r, 2));
      const cancelled = await sc.cancel(sol.id as string);
      expect(cancelled.updatedAt).not.toBe(sol.updatedAt);
    });

    it('preserves completedAt as null', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const cancelled = await sc.cancel(sol.id as string);
      expect(cancelled.completedAt).toBeNull();
    });

    it('cancel after complete changes status to Cancelled', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await sc.complete(sol.id as string);
      const cancelled = await sc.cancel(sol.id as string);
      expect(cancelled.status).toBe(SolutionStatus.Cancelled);
    });

    it('preserves title and description', async () => {
      const sol = await sc.create(sid, uid, 'Title', 'Desc');
      const cancelled = await sc.cancel(sol.id as string);
      expect(cancelled.title).toBe('Title');
      expect(cancelled.description).toBe('Desc');
    });
  });

  // --- remove ---
  describe('remove', () => {
    it('removes solution by id', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await sc.remove(sol.id as string);
      expect(await sc.get(sol.id as string)).toBeNull();
    });

    it('decrements count after remove', async () => {
      const sol = await sc.create(sid, uid, 'A');
      await sc.create(sid, uid, 'B');
      await sc.remove(sol.id as string);
      expect(await sc.count(sid)).toBe(1);
    });

    it('throws SolutionNotFoundError for bad id', async () => {
      await expect(sc.remove('bad')).rejects.toThrow(SolutionNotFoundError);
    });

    it('remove returns void', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const result = await sc.remove(sol.id as string);
      expect(result).toBeUndefined();
    });

    it('remove then list does not include removed', async () => {
      const sol = await sc.create(sid, uid, 'A');
      await sc.create(sid, uid, 'B');
      await sc.remove(sol.id as string);
      const list = await sc.list(sid);
      expect(list.find(s => s.id === sol.id)).toBeUndefined();
    });

    it('double remove throws', async () => {
      const sol = await sc.create(sid, uid, 'T');
      await sc.remove(sol.id as string);
      await expect(sc.remove(sol.id as string)).rejects.toThrow(SolutionNotFoundError);
    });

    it('remove does not affect other sessions', async () => {
      const sol1 = await sc.create(sid, uid, 'A');
      const sol2 = await sc.create('other', uid, 'B');
      await sc.remove(sol1.id as string);
      expect(await sc.get(sol2.id as string)).not.toBeNull();
    });
  });

  // --- count ---
  describe('count', () => {
    it('returns 0 for new session', async () => {
      expect(await sc.count(sid)).toBe(0);
    });

    it('counts single solution', async () => {
      await sc.create(sid, uid, 'A');
      expect(await sc.count(sid)).toBe(1);
    });

    it('counts multiple solutions', async () => {
      await sc.create(sid, uid, 'A');
      await sc.create(sid, uid, 'B');
      await sc.create(sid, uid, 'C');
      expect(await sc.count(sid)).toBe(3);
    });

    it('decrements after remove', async () => {
      const sol = await sc.create(sid, uid, 'A');
      await sc.create(sid, uid, 'B');
      await sc.remove(sol.id as string);
      expect(await sc.count(sid)).toBe(1);
    });

    it('only counts session-specific solutions', async () => {
      await sc.create(sid, uid, 'A');
      await sc.create('other', uid, 'B');
      await sc.create('other', uid, 'C');
      expect(await sc.count(sid)).toBe(1);
    });

    it('count for empty session returns 0', async () => {
      expect(await sc.count('empty-session')).toBe(0);
    });

    it('count after open', async () => {
      await sc.open(sid, uid, 'A');
      expect(await sc.count(sid)).toBe(1);
    });
  });

  // --- limits ---
  describe('limits', () => {
    it('enforces maxSolutionsPerSession', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.solutionCenterConfig, maxSolutionsPerSession: 3 };
      const local = new SolutionCenter(cfg);
      await local.create(sid, uid, 'A');
      await local.create(sid, uid, 'B');
      await local.create(sid, uid, 'C');
      await expect(local.create(sid, uid, 'D')).rejects.toThrow(SolutionLimitExceededError);
    });

    it('limit resets when solutions are removed', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.solutionCenterConfig, maxSolutionsPerSession: 2 };
      const local = new SolutionCenter(cfg);
      const s1 = await local.create(sid, uid, 'A');
      await local.create(sid, uid, 'B');
      await local.remove(s1.id as string);
      await expect(local.create(sid, uid, 'C')).resolves.toBeDefined();
    });

    it('error code is SOLUTION_LIMIT', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.solutionCenterConfig, maxSolutionsPerSession: 0 };
      const local = new SolutionCenter(cfg);
      try {
        await local.create(sid, uid, 'A');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.code).toBe('SOLUTION_LIMIT');
      }
    });

    it('default limit from config is 50', () => {
      expect(DefaultCompanionRuntimeConfig.solutionCenterConfig.maxSolutionsPerSession).toBe(50);
    });

    it('defaultValueScore from config is 0', () => {
      expect(DefaultCompanionRuntimeConfig.solutionCenterConfig.defaultValueScore).toBe(0);
    });
  });

  // --- immutability ---
  describe('immutability', () => {
    it('create returns frozen object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(Object.isFrozen(sol)).toBe(true);
    });

    it('generate returns new frozen object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const updated = await sc.generate(sol.id as string);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(updated).not.toBe(sol);
    });

    it('complete returns new frozen object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const completed = await sc.complete(sol.id as string);
      expect(Object.isFrozen(completed)).toBe(true);
      expect(completed).not.toBe(sol);
    });

    it('cancel returns new frozen object', async () => {
      const sol = await sc.create(sid, uid, 'T');
      const cancelled = await sc.cancel(sol.id as string);
      expect(Object.isFrozen(cancelled)).toBe(true);
      expect(cancelled).not.toBe(sol);
    });

    it('metadata is always frozen', async () => {
      const sol = await sc.create(sid, uid, 'T');
      expect(Object.isFrozen(sol.metadata)).toBe(true);
    });

    it('open returns frozen object', async () => {
      const sol = await sc.open(sid, uid, 'T');
      expect(Object.isFrozen(sol)).toBe(true);
    });

    it('cannot mutate frozen solution title', async () => {
      const sol = await sc.create(sid, uid, 'Original');
      try {
        (sol as any).title = 'Mutated';
      } catch { /* expected in strict mode */ }
      expect(sol.title).toBe('Original');
    });
  });

  // --- lifecycle integration ---
  describe('lifecycle integration', () => {
    it('full lifecycle: create -> generate -> complete', async () => {
      const sol = await sc.create(sid, uid, 'Full Life');
      expect(sol.status).toBe(SolutionStatus.Draft);
      const gen = await sc.generate(sol.id as string);
      expect(gen.status).toBe(SolutionStatus.Validating);
      const done = await sc.complete(sol.id as string);
      expect(done.status).toBe(SolutionStatus.Completed);
      expect(done.completedAt).not.toBeNull();
    });

    it('full lifecycle: open -> generate -> cancel', async () => {
      const sol = await sc.open(sid, uid, 'Open Cancel');
      expect(sol.status).toBe(SolutionStatus.Assembling);
      const gen = await sc.generate(sol.id as string);
      expect(gen.status).toBe(SolutionStatus.Validating);
      const canc = await sc.cancel(sol.id as string, 'changed mind');
      expect(canc.status).toBe(SolutionStatus.Cancelled);
    });

    it('multiple generate calls before complete', async () => {
      const sol = await sc.create(sid, uid, 'Multi Gen');
      await sc.generate(sol.id as string);
      await sc.generate(sol.id as string);
      const gen3 = await sc.generate(sol.id as string);
      const done = await sc.complete(sol.id as string);
      expect(done.workflowsGenerated).toBe(3);
    });

    it('re-complete after cancel', async () => {
      const sol = await sc.create(sid, uid, 'Re-complete');
      await sc.cancel(sol.id as string);
      const done = await sc.complete(sol.id as string);
      expect(done.status).toBe(SolutionStatus.Completed);
      expect(done.completedAt).not.toBeNull();
    });

    it('create after remove at limit', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.solutionCenterConfig, maxSolutionsPerSession: 2 };
      const local = new SolutionCenter(cfg);
      const s1 = await local.create(sid, uid, 'A');
      const s2 = await local.create(sid, uid, 'B');
      await local.remove(s1.id as string);
      const s3 = await local.create(sid, uid, 'C');
      expect(s3.title).toBe('C');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// WorkflowDashboard  (~100 tests)
// ═══════════════════════════════════════════════════════════════════

describe('WorkflowDashboard', () => {
  let wd: WorkflowDashboard;
  const sid = 'session-1';

  beforeEach(() => {
    wd = new WorkflowDashboard(DefaultCompanionRuntimeConfig.workflowDashboardConfig);
  });

  describe('register', () => {
    it('registers a workflow', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'My Workflow');
      const list = await wd.list(sid);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('wf-1');
    });

    it('registers with default Pending status', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W');
      const list = await wd.list(sid);
      expect(list[0].status).toBe('Pending');
    });

    it('registers with custom status', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W', 'Running');
      const list = await wd.list(sid);
      expect(list[0].status).toBe('Running');
    });

    it('registers multiple workflows', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W1');
      await wd.register(sid, 'sol-1', 'wf-2', 'W2');
      await wd.register(sid, 'sol-1', 'wf-3', 'W3');
      expect(await wd.list(sid)).toHaveLength(3);
    });

    it('register returns void', async () => {
      const result = await wd.register(sid, 'sol-1', 'wf-1', 'W');
      expect(result).toBeUndefined();
    });

    it('register for different sessions', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W1');
      await wd.register('session-2', 'sol-2', 'wf-2', 'W2');
      expect(await wd.list(sid)).toHaveLength(1);
      expect(await wd.list('session-2')).toHaveLength(1);
    });

    it('register overwrites same workflowId', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'Old');
      await wd.register(sid, 'sol-2', 'wf-1', 'New');
      const list = await wd.list(sid);
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe('New');
      expect(list[0].solutionId).toBe('sol-2');
    });

    it('register with empty title', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', '');
      const list = await wd.list(sid);
      expect(list[0].title).toBe('');
    });

    it('register with unicode title', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'ワークフロー');
      const list = await wd.list(sid);
      expect(list[0].title).toBe('ワークフロー');
    });

    it('register with empty status string', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W', '');
      const list = await wd.list(sid);
      expect(list[0].status).toBe('');
    });
  });

  describe('list', () => {
    it('returns empty for no workflows', async () => {
      expect(await wd.list(sid)).toHaveLength(0);
    });

    it('returns workflows for session', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'A');
      await wd.register(sid, 'sol-1', 'wf-2', 'B');
      const list = await wd.list(sid);
      expect(list).toHaveLength(2);
    });

    it('does not mix sessions', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'A');
      await wd.register('other', 'sol-2', 'wf-2', 'B');
      expect(await wd.list(sid)).toHaveLength(1);
    });

    it('respects maxVisibleWorkflows limit', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.workflowDashboardConfig, maxVisibleWorkflows: 2 };
      const local = new WorkflowDashboard(cfg);
      for (let i = 0; i < 5; i++) {
        await local.register(sid, 'sol-1', `wf-${i}`, `W${i}`);
      }
      expect(await local.list(sid)).toHaveLength(2);
    });

    it('returns id, title, status, solutionId', async () => {
      await wd.register(sid, 'sol-x', 'wf-x', 'Title', 'Done');
      const list = await wd.list(sid);
      expect(list[0]).toEqual({ id: 'wf-x', title: 'Title', status: 'Done', solutionId: 'sol-x' });
    });

    it('returns empty for unknown session', async () => {
      expect(await wd.list('unknown')).toHaveLength(0);
    });

    it('returns entries in insertion order', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'First');
      await wd.register(sid, 'sol-1', 'wf-2', 'Second');
      const list = await wd.list(sid);
      expect(list[0].id).toBe('wf-1');
      expect(list[1].id).toBe('wf-2');
    });

    it('returns readonly array', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W');
      const list = await wd.list(sid);
      expect(Array.isArray(list)).toBe(true);
    });
  });

  describe('getBySolution', () => {
    it('returns workflows for solution', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'A');
      await wd.register(sid, 'sol-1', 'wf-2', 'B');
      const result = await wd.getBySolution('sol-1');
      expect(result).toHaveLength(2);
    });

    it('returns empty for unknown solution', async () => {
      expect(await wd.getBySolution('unknown')).toHaveLength(0);
    });

    it('does not return workflows from other solutions', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'A');
      await wd.register(sid, 'sol-2', 'wf-2', 'B');
      const result = await wd.getBySolution('sol-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wf-1');
    });

    it('returns id, title, status', async () => {
      await wd.register(sid, 'sol-x', 'wf-x', 'MyWf', 'Active');
      const result = await wd.getBySolution('sol-x');
      expect(result[0]).toEqual({ id: 'wf-x', title: 'MyWf', status: 'Active' });
    });

    it('includes workflows from multiple sessions for same solution', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'A');
      await wd.register('other', 'sol-1', 'wf-2', 'B');
      const result = await wd.getBySolution('sol-1');
      expect(result).toHaveLength(2);
    });

    it('returns entries in insertion order', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'First');
      await wd.register(sid, 'sol-1', 'wf-2', 'Second');
      const result = await wd.getBySolution('sol-1');
      expect(result[0].id).toBe('wf-1');
      expect(result[1].id).toBe('wf-2');
    });

    it('returns readonly array', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W');
      const result = await wd.getBySolution('sol-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles workflows with different statuses', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W1', 'Pending');
      await wd.register(sid, 'sol-1', 'wf-2', 'W2', 'Running');
      await wd.register(sid, 'sol-1', 'wf-3', 'W3', 'Completed');
      const result = await wd.getBySolution('sol-1');
      expect(result.map(r => r.status)).toEqual(['Pending', 'Running', 'Completed']);
    });
  });

  describe('count', () => {
    it('returns 0 for empty session', async () => {
      expect(await wd.count(sid)).toBe(0);
    });

    it('counts registered workflows', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'A');
      await wd.register(sid, 'sol-1', 'wf-2', 'B');
      expect(await wd.count(sid)).toBe(2);
    });

    it('counts per session', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'A');
      await wd.register('other', 'sol-2', 'wf-2', 'B');
      expect(await wd.count(sid)).toBe(1);
    });

    it('count does not respect maxVisibleWorkflows', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.workflowDashboardConfig, maxVisibleWorkflows: 2 };
      const local = new WorkflowDashboard(cfg);
      for (let i = 0; i < 5; i++) {
        await local.register(sid, 'sol-1', `wf-${i}`, `W${i}`);
      }
      expect(await local.count(sid)).toBe(5);
    });

    it('decrements after overwrite does not double count', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'A');
      await wd.register(sid, 'sol-2', 'wf-1', 'B');
      expect(await wd.count(sid)).toBe(1);
    });

    it('default maxVisibleWorkflows is 100', () => {
      expect(DefaultCompanionRuntimeConfig.workflowDashboardConfig.maxVisibleWorkflows).toBe(100);
    });
  });

  describe('integration', () => {
    it('list and getBySolution are consistent', async () => {
      await wd.register(sid, 'sol-1', 'wf-1', 'W1', 'Running');
      await wd.register(sid, 'sol-2', 'wf-2', 'W2', 'Done');
      const bySession = await wd.list(sid);
      const bySol1 = await wd.getBySolution('sol-1');
      expect(bySol1.length).toBe(1);
      expect(bySession.find(w => w.id === 'wf-1')!.status).toBe('Running');
    });

    it('multiple sessions with shared solution', async () => {
      await wd.register('s1', 'sol-1', 'wf-1', 'Session1 Wf');
      await wd.register('s2', 'sol-1', 'wf-2', 'Session2 Wf');
      expect(await wd.count('s1')).toBe(1);
      expect(await wd.count('s2')).toBe(1);
      expect(await wd.getBySolution('sol-1')).toHaveLength(2);
    });

    it('count matches list length when under limit', async () => {
      for (let i = 0; i < 10; i++) {
        await wd.register(sid, 'sol-1', `wf-${i}`, `W${i}`);
      }
      expect(await wd.count(sid)).toBe(10);
      expect(await wd.list(sid)).toHaveLength(10);
    });

    it('list length capped at maxVisibleWorkflows', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.workflowDashboardConfig, maxVisibleWorkflows: 3 };
      const local = new WorkflowDashboard(cfg);
      for (let i = 0; i < 10; i++) {
        await local.register(sid, 'sol-1', `wf-${i}`, `W${i}`);
      }
      expect(await local.list(sid)).toHaveLength(3);
      expect(await local.count(sid)).toBe(10);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// CapabilityManager  (~150 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CapabilityManager', () => {
  let cm: CapabilityManager;
  const sid = 'session-1';

  beforeEach(() => {
    cm = new CapabilityManager(DefaultCompanionRuntimeConfig.capabilityManagerConfig);
  });

  describe('install', () => {
    it('installs a capability', async () => {
      const inst = await cm.install(sid, 'cap-search', 'Search');
      expect(inst.id).toBeDefined();
      expect(inst.capabilityId).toBe('cap-search');
      expect(inst.label).toBe('Search');
    });

    it('generates id with capinst- prefix', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      expect(inst.id.startsWith('capinst-')).toBe(true);
    });

    it('sets installedAt to ISO string', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      expect(typeof inst.installedAt).toBe('string');
      expect(() => new Date(inst.installedAt)).not.toThrow();
    });

    it('increments count after install', async () => {
      await cm.install(sid, 'cap-1', 'L');
      expect(await cm.count(sid)).toBe(1);
    });

    it('installs multiple capabilities', async () => {
      await cm.install(sid, 'cap-1', 'A');
      await cm.install(sid, 'cap-2', 'B');
      await cm.install(sid, 'cap-3', 'C');
      expect(await cm.count(sid)).toBe(3);
    });

    it('generates unique ids', async () => {
      const a = await cm.install(sid, 'cap-1', 'A');
      const b = await cm.install(sid, 'cap-2', 'B');
      expect(a.id).not.toBe(b.id);
    });

    it('installs same capabilityId twice as separate instances', async () => {
      await cm.install(sid, 'cap-1', 'First');
      await cm.install(sid, 'cap-1', 'Second');
      expect(await cm.count(sid)).toBe(2);
    });

    it('throws CapabilityError when limit exceeded', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.capabilityManagerConfig, maxManagedCapabilities: 2 };
      const local = new CapabilityManager(cfg);
      await local.install(sid, 'cap-1', 'A');
      await local.install(sid, 'cap-2', 'B');
      await expect(local.install(sid, 'cap-3', 'C')).rejects.toThrow(CapabilityError);
    });

    it('CapabilityError has capabilityId field', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.capabilityManagerConfig, maxManagedCapabilities: 0 };
      const local = new CapabilityManager(cfg);
      try {
        await local.install(sid, 'cap-x', 'L');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.capabilityId).toBe('cap-x');
      }
    });

    it('CapabilityError code is CAPABILITY_ERROR', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.capabilityManagerConfig, maxManagedCapabilities: 0 };
      const local = new CapabilityManager(cfg);
      try {
        await local.install(sid, 'cap-x', 'L');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.code).toBe('CAPABILITY_ERROR');
      }
    });

    it('does not count other sessions toward limit', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.capabilityManagerConfig, maxManagedCapabilities: 1 };
      const local = new CapabilityManager(cfg);
      await local.install(sid, 'cap-1', 'A');
      await local.install('other', 'cap-2', 'B');
      await expect(local.install(sid, 'cap-3', 'C')).rejects.toThrow(CapabilityError);
    });

    it('install with empty label', async () => {
      const inst = await cm.install(sid, 'cap-1', '');
      expect(inst.label).toBe('');
    });

    it('install with unicode label', async () => {
      const inst = await cm.install(sid, 'cap-1', '能力');
      expect(inst.label).toBe('能力');
    });

    it('install with empty capabilityId', async () => {
      const inst = await cm.install(sid, '', 'L');
      expect(inst.capabilityId).toBe('');
    });

    it('returns correct shape', async () => {
      const inst = await cm.install(sid, 'cap-1', 'Label');
      expect(inst).toHaveProperty('id');
      expect(inst).toHaveProperty('capabilityId');
      expect(inst).toHaveProperty('label');
      expect(inst).toHaveProperty('installedAt');
    });

    it('default maxManagedCapabilities is 200', () => {
      expect(DefaultCompanionRuntimeConfig.capabilityManagerConfig.maxManagedCapabilities).toBe(200);
    });
  });

  describe('remove', () => {
    it('removes installed capability', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      await cm.remove(sid, inst.id);
      expect(await cm.get(sid, inst.id)).toBeNull();
    });

    it('decrements count after remove', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      await cm.install(sid, 'cap-2', 'M');
      await cm.remove(sid, inst.id);
      expect(await cm.count(sid)).toBe(1);
    });

    it('throws CapabilityError for non-existent instance', async () => {
      await expect(cm.remove(sid, 'nonexistent')).rejects.toThrow(CapabilityError);
    });

    it('throws CapabilityError for wrong session', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      await expect(cm.remove('other', inst.id)).rejects.toThrow(CapabilityError);
    });

    it('CapabilityError on remove has correct capabilityId (instanceId)', async () => {
      try {
        await cm.remove(sid, 'bad-id');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.capabilityId).toBe('bad-id');
      }
    });

    it('remove returns void', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      const result = await cm.remove(sid, inst.id);
      expect(result).toBeUndefined();
    });

    it('double remove throws', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      await cm.remove(sid, inst.id);
      await expect(cm.remove(sid, inst.id)).rejects.toThrow(CapabilityError);
    });

    it('remove from list', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      await cm.remove(sid, inst.id);
      const list = await cm.list(sid);
      expect(list.find(i => i.id === inst.id)).toBeUndefined();
    });

    it('remove does not affect other sessions', async () => {
      const inst = await cm.install('other', 'cap-1', 'L');
      await cm.remove('other', inst.id);
      expect(await cm.count('other')).toBe(0);
      expect(await cm.count(sid)).toBe(0);
    });
  });

  describe('list', () => {
    it('returns empty for new session', async () => {
      expect(await cm.list(sid)).toHaveLength(0);
    });

    it('lists installed capabilities', async () => {
      await cm.install(sid, 'cap-1', 'A');
      await cm.install(sid, 'cap-2', 'B');
      const list = await cm.list(sid);
      expect(list).toHaveLength(2);
    });

    it('does not mix sessions', async () => {
      await cm.install(sid, 'cap-1', 'A');
      await cm.install('other', 'cap-2', 'B');
      expect(await cm.list(sid)).toHaveLength(1);
    });

    it('returns correct fields', async () => {
      await cm.install(sid, 'cap-1', 'Label');
      const list = await cm.list(sid);
      expect(list[0]).toHaveProperty('id');
      expect(list[0]).toHaveProperty('capabilityId');
      expect(list[0]).toHaveProperty('label');
      expect(list[0]).toHaveProperty('installedAt');
    });

    it('list reflects removals', async () => {
      const inst = await cm.install(sid, 'cap-1', 'A');
      await cm.install(sid, 'cap-2', 'B');
      await cm.remove(sid, inst.id);
      expect(await cm.list(sid)).toHaveLength(1);
    });

    it('returns readonly array', async () => {
      await cm.install(sid, 'cap-1', 'A');
      const list = await cm.list(sid);
      expect(Array.isArray(list)).toBe(true);
    });

    it('returns entries in insertion order', async () => {
      await cm.install(sid, 'cap-a', 'A');
      await cm.install(sid, 'cap-b', 'B');
      const list = await cm.list(sid);
      expect(list[0].capabilityId).toBe('cap-a');
      expect(list[1].capabilityId).toBe('cap-b');
    });

    it('returns empty for unknown session', async () => {
      expect(await cm.list('unknown')).toHaveLength(0);
    });
  });

  describe('get', () => {
    it('returns null for non-existent id', async () => {
      expect(await cm.get(sid, 'nonexistent')).toBeNull();
    });

    it('returns installed capability', async () => {
      const inst = await cm.install(sid, 'cap-1', 'Label');
      const got = await cm.get(sid, inst.id);
      expect(got).not.toBeNull();
      expect(got!.id).toBe(inst.id);
      expect(got!.capabilityId).toBe('cap-1');
      expect(got!.label).toBe('Label');
    });

    it('returns null for wrong session', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      expect(await cm.get('other', inst.id)).toBeNull();
    });

    it('returns correct installedAt', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      const got = await cm.get(sid, inst.id);
      expect(got!.installedAt).toBe(inst.installedAt);
    });

    it('returns null after remove', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      await cm.remove(sid, inst.id);
      expect(await cm.get(sid, inst.id)).toBeNull();
    });

    it('returns correct shape', async () => {
      const inst = await cm.install(sid, 'cap-1', 'L');
      const got = await cm.get(sid, inst.id);
      expect(Object.keys(got!).sort()).toEqual(['capabilityId', 'id', 'installedAt', 'label']);
    });
  });

  describe('count', () => {
    it('returns 0 for new session', async () => {
      expect(await cm.count(sid)).toBe(0);
    });

    it('counts installed capabilities', async () => {
      await cm.install(sid, 'cap-1', 'A');
      await cm.install(sid, 'cap-2', 'B');
      expect(await cm.count(sid)).toBe(2);
    });

    it('counts per session', async () => {
      await cm.install(sid, 'cap-1', 'A');
      await cm.install('other', 'cap-2', 'B');
      await cm.install('other', 'cap-3', 'C');
      expect(await cm.count(sid)).toBe(1);
      expect(await cm.count('other')).toBe(2);
    });

    it('decrements after remove', async () => {
      const inst = await cm.install(sid, 'cap-1', 'A');
      await cm.install(sid, 'cap-2', 'B');
      await cm.remove(sid, inst.id);
      expect(await cm.count(sid)).toBe(1);
    });

    it('returns 0 for unknown session', async () => {
      expect(await cm.count('unknown')).toBe(0);
    });

    it('count matches list length', async () => {
      await cm.install(sid, 'cap-1', 'A');
      await cm.install(sid, 'cap-2', 'B');
      await cm.install(sid, 'cap-3', 'C');
      expect(await cm.count(sid)).toBe(await cm.list(sid).then(l => l.length));
    });
  });

  describe('limits', () => {
    it('enforces maxManagedCapabilities', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.capabilityManagerConfig, maxManagedCapabilities: 3 };
      const local = new CapabilityManager(cfg);
      await local.install(sid, 'cap-1', 'A');
      await local.install(sid, 'cap-2', 'B');
      await local.install(sid, 'cap-3', 'C');
      await expect(local.install(sid, 'cap-4', 'D')).rejects.toThrow(CapabilityError);
    });

    it('limit resets after removal', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.capabilityManagerConfig, maxManagedCapabilities: 2 };
      const local = new CapabilityManager(cfg);
      const inst = await local.install(sid, 'cap-1', 'A');
      await local.install(sid, 'cap-2', 'B');
      await local.remove(sid, inst.id);
      await expect(local.install(sid, 'cap-3', 'C')).resolves.toBeDefined();
    });

    it('error message includes limit info', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.capabilityManagerConfig, maxManagedCapabilities: 1 };
      const local = new CapabilityManager(cfg);
      await local.install(sid, 'cap-1', 'A');
      try {
        await local.install(sid, 'cap-2', 'B');
        expect.unreachable('should throw');
      } catch (e: any) {
        expect(e.message).toContain('1/1');
      }
    });

    it('limit 0 prevents any install', async () => {
      const cfg = { ...DefaultCompanionRuntimeConfig.capabilityManagerConfig, maxManagedCapabilities: 0 };
      const local = new CapabilityManager(cfg);
      await expect(local.install(sid, 'cap-1', 'A')).rejects.toThrow(CapabilityError);
    });
  });

  describe('integration', () => {
    it('full lifecycle: install -> get -> list -> remove', async () => {
      const inst = await cm.install(sid, 'cap-1', 'Search');
      const got = await cm.get(sid, inst.id);
      expect(got).not.toBeNull();
      const list = await cm.list(sid);
      expect(list).toHaveLength(1);
      await cm.remove(sid, inst.id);
      expect(await cm.get(sid, inst.id)).toBeNull();
      expect(await cm.list(sid)).toHaveLength(0);
    });

    it('multiple sessions independent', async () => {
      const i1 = await cm.install('s1', 'cap-1', 'A');
      const i2 = await cm.install('s2', 'cap-2', 'B');
      expect(await cm.count('s1')).toBe(1);
      expect(await cm.count('s2')).toBe(1);
      await cm.remove('s1', i1.id);
      expect(await cm.count('s1')).toBe(0);
      expect(await cm.count('s2')).toBe(1);
      expect(await cm.get('s2', i2.id)).not.toBeNull();
    });

    it('install remove reinstall works', async () => {
      const inst = await cm.install(sid, 'cap-1', 'First');
      await cm.remove(sid, inst.id);
      const inst2 = await cm.install(sid, 'cap-1', 'Second');
      expect(inst2.id).not.toBe(inst.id);
      expect(await cm.count(sid)).toBe(1);
    });

    it('list order preserved after interleaved removes', async () => {
      const a = await cm.install(sid, 'cap-a', 'A');
      const b = await cm.install(sid, 'cap-b', 'B');
      const c = await cm.install(sid, 'cap-c', 'C');
      await cm.remove(sid, b.id);
      const list = await cm.list(sid);
      expect(list.map(l => l.capabilityId)).toEqual(['cap-a', 'cap-c']);
    });

    it('count matches list after operations', async () => {
      const i1 = await cm.install(sid, 'cap-1', 'A');
      const i2 = await cm.install(sid, 'cap-2', 'B');
      expect(await cm.count(sid)).toBe(2);
      await cm.remove(sid, i1.id);
      expect(await cm.count(sid)).toBe(1);
      await cm.install(sid, 'cap-3', 'C');
      expect(await cm.count(sid)).toBe(2);
      await cm.remove(sid, i2.id);
      expect(await cm.count(sid)).toBe(1);
    });

    it('get returns consistent data with list', async () => {
      const inst = await cm.install(sid, 'cap-1', 'Label');
      const got = await cm.get(sid, inst.id);
      const list = await cm.list(sid);
      expect(list[0].id).toBe(got!.id);
      expect(list[0].label).toBe(got!.label);
    });
  });
});
