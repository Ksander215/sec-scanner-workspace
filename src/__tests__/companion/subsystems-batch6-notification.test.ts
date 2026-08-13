import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationCenter } from '../../core/companion/notification-center.js';
import { NotificationPriority, NotificationStatus, DefaultNotificationCenterConfig } from '../../core/companion/types.js';
import { NotificationNotFoundError, NotificationLimitExceededError } from '../../core/companion/errors.js';

const SESSION_1 = 'session-notify-1';
const SESSION_2 = 'session-notify-2';
const USER_1 = 'user-n1';
const USER_2 = 'user-n2';

const PRIORITIES = [
  NotificationPriority.Critical,
  NotificationPriority.High,
  NotificationPriority.Normal,
  NotificationPriority.Low,
  NotificationPriority.Info,
];

const PRIORITY_LABELS: Record<string, string> = {
  [NotificationPriority.Critical]: 'Critical',
  [NotificationPriority.High]: 'High',
  [NotificationPriority.Normal]: 'Normal',
  [NotificationPriority.Low]: 'Low',
  [NotificationPriority.Info]: 'Info',
};

describe('NotificationCenter CRUD', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  describe('create with each priority', () => {
    for (const priority of PRIORITIES) {
      it(`creates notification with ${PRIORITY_LABELS[priority]} priority`, async () => {
        const n = await nc.create(SESSION_1, USER_1, `Title ${priority}`, `Content ${priority}`, priority);
        expect(n.id).toBeTruthy();
        expect(n.sessionId).toBe(SESSION_1);
        expect(n.userId).toBe(USER_1);
        expect(n.priority).toBe(priority);
        expect(n.status).toBe(NotificationStatus.Unread);
        expect(n.readAt).toBeNull();
        expect(n.title).toBe(`Title ${priority}`);
        expect(n.content).toBe(`Content ${priority}`);
        expect(n.createdAt).toBeTruthy();
      });
    }
  });

  describe('create without explicit priority uses default', () => {
    it('uses Normal as default priority', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(n.priority).toBe(DefaultNotificationCenterConfig.defaultPriority);
    });
  });

  describe('create returns frozen objects', () => {
    for (const priority of PRIORITIES) {
      it(`notification with ${PRIORITY_LABELS[priority]} is frozen`, async () => {
        const n = await nc.create(SESSION_1, USER_1, 'T', 'C', priority);
        expect(Object.isFrozen(n)).toBe(true);
      });
    }
  });

  describe('create generates unique IDs', () => {
    it('two notifications get different IDs', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'A', 'B');
      const n2 = await nc.create(SESSION_1, USER_1, 'C', 'D');
      expect(n1.id).not.toBe(n2.id);
    });
  });

  describe('create sets timestamps', () => {
    it('createdAt is a valid ISO string', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(() => new Date(n.createdAt).getTime()).not.toThrow();
    });
    it('two notifications have close timestamps', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'T1', 'C1');
      const n2 = await nc.create(SESSION_1, USER_1, 'T2', 'C2');
      const diff = Math.abs(new Date(n2.createdAt).getTime() - new Date(n1.createdAt).getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('get by id', () => {
    it('returns null for non-existent id', async () => {
      const result = await nc.get('nonexistent-id');
      expect(result).toBeNull();
    });
    it('returns the notification for a valid id', async () => {
      const created = await nc.create(SESSION_1, USER_1, 'GetTest', 'Content');
      const fetched = await nc.get(created.id as string);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.title).toBe('GetTest');
    });
    it('returns exact same object shape', async () => {
      const created = await nc.create(SESSION_1, USER_1, 'Shape', 'Test');
      const fetched = await nc.get(created.id as string);
      expect(fetched).toEqual(created);
    });
    for (const priority of PRIORITIES) {
      it(`get returns notification with ${PRIORITY_LABELS[priority]} priority`, async () => {
        const created = await nc.create(SESSION_1, USER_1, 'T', 'C', priority);
        const fetched = await nc.get(created.id as string);
        expect(fetched!.priority).toBe(priority);
      });
    }
  });

  describe('list', () => {
    it('returns empty array for new session', async () => {
      const list = await nc.list(SESSION_1);
      expect(list).toEqual([]);
    });
    it('returns one notification after creating one', async () => {
      await nc.create(SESSION_1, USER_1, 'T', 'C');
      const list = await nc.list(SESSION_1);
      expect(list).toHaveLength(1);
    });
    it('returns all notifications for a session', async () => {
      for (let i = 0; i < 5; i++) {
        await nc.create(SESSION_1, USER_1, `T${i}`, `C${i}`);
      }
      const list = await nc.list(SESSION_1);
      expect(list).toHaveLength(5);
    });
    it('does not leak notifications across sessions', async () => {
      await nc.create(SESSION_1, USER_1, 'S1', 'C');
      await nc.create(SESSION_2, USER_2, 'S2', 'C');
      const list1 = await nc.list(SESSION_1);
      const list2 = await nc.list(SESSION_2);
      expect(list1).toHaveLength(1);
      expect(list2).toHaveLength(1);
      expect(list1[0].sessionId).toBe(SESSION_1);
      expect(list2[0].sessionId).toBe(SESSION_2);
    });
    it('returns a copy (not the internal array)', async () => {
      await nc.create(SESSION_1, USER_1, 'T', 'C');
      const list1 = await nc.list(SESSION_1);
      const list2 = await nc.list(SESSION_1);
      expect(list1).not.toBe(list2);
    });
  });

  describe('count', () => {
    it('returns 0 for empty session', async () => {
      expect(await nc.count(SESSION_1)).toBe(0);
    });
    it('returns 1 after creating one notification', async () => {
      await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(await nc.count(SESSION_1)).toBe(1);
    });
    it('returns correct count after multiple creates', async () => {
      for (let i = 0; i < 10; i++) {
        await nc.create(SESSION_1, USER_1, `T${i}`, `C${i}`);
      }
      expect(await nc.count(SESSION_1)).toBe(10);
    });
    it('counts only the specified session', async () => {
      for (let i = 0; i < 5; i++) {
        await nc.create(SESSION_1, USER_1, `T${i}`, `C`);
        await nc.create(SESSION_2, USER_2, `T${i}`, `C`);
      }
      expect(await nc.count(SESSION_1)).toBe(5);
      expect(await nc.count(SESSION_2)).toBe(5);
    });
  });

  describe('unreadCount', () => {
    it('returns 0 for empty session', async () => {
      expect(await nc.unreadCount(SESSION_1)).toBe(0);
    });
    it('returns 1 for a single unread notification', async () => {
      await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(await nc.unreadCount(SESSION_1)).toBe(1);
    });
    it('returns 0 after marking read', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.markRead(n.id as string);
      expect(await nc.unreadCount(SESSION_1)).toBe(0);
    });
    it('returns 0 after marking dismissed', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.markDismissed(n.id as string);
      expect(await nc.unreadCount(SESSION_1)).toBe(0);
    });
    it('tracks multiple unread correctly', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'T1', 'C1');
      await nc.create(SESSION_1, USER_1, 'T2', 'C2');
      await nc.create(SESSION_1, USER_1, 'T3', 'C3');
      await nc.markRead(n1.id as string);
      expect(await nc.unreadCount(SESSION_1)).toBe(2);
    });
    it('is session-isolated', async () => {
      await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.create(SESSION_2, USER_2, 'T', 'C');
      expect(await nc.unreadCount(SESSION_1)).toBe(1);
      expect(await nc.unreadCount(SESSION_2)).toBe(1);
    });
  });

  describe('markRead', () => {
    it('throws NotificationNotFoundError for non-existent id', async () => {
      await expect(nc.markRead('nope')).rejects.toThrow(NotificationNotFoundError);
    });
    it('changes status to Read', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      const updated = await nc.markRead(n.id as string);
      expect(updated.status).toBe(NotificationStatus.Read);
    });
    it('sets readAt timestamp', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      const updated = await nc.markRead(n.id as string);
      expect(updated.readAt).not.toBeNull();
      expect(() => new Date(updated.readAt!).getTime()).not.toThrow();
    });
    it('preserves all other fields', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'PreserveTitle', 'PreserveContent', NotificationPriority.Critical);
      const updated = await nc.markRead(n.id as string);
      expect(updated.id).toBe(n.id);
      expect(updated.title).toBe('PreserveTitle');
      expect(updated.content).toBe('PreserveContent');
      expect(updated.priority).toBe(NotificationPriority.Critical);
      expect(updated.createdAt).toBe(n.createdAt);
      expect(updated.sessionId).toBe(n.sessionId);
      expect(updated.userId).toBe(n.userId);
    });
    it('is idempotent - marking read twice still works', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      const first = await nc.markRead(n.id as string);
      const second = await nc.markRead(n.id as string);
      expect(first.status).toBe(NotificationStatus.Read);
      expect(second.status).toBe(NotificationStatus.Read);
    });
    it('returns frozen object', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      const updated = await nc.markRead(n.id as string);
      expect(Object.isFrozen(updated)).toBe(true);
    });
    it('get after markRead reflects change', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.markRead(n.id as string);
      const fetched = await nc.get(n.id as string);
      expect(fetched!.status).toBe(NotificationStatus.Read);
      expect(fetched!.readAt).not.toBeNull();
    });
  });

  describe('markDismissed', () => {
    it('throws NotificationNotFoundError for non-existent id', async () => {
      await expect(nc.markDismissed('nope')).rejects.toThrow(NotificationNotFoundError);
    });
    it('changes status to Dismissed', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      const updated = await nc.markDismissed(n.id as string);
      expect(updated.status).toBe(NotificationStatus.Dismissed);
    });
    it('does not set readAt', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      const updated = await nc.markDismissed(n.id as string);
      expect(updated.readAt).toBeNull();
    });
    it('preserves all other fields', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'DismissTitle', 'DismissContent', NotificationPriority.High);
      const updated = await nc.markDismissed(n.id as string);
      expect(updated.id).toBe(n.id);
      expect(updated.title).toBe('DismissTitle');
      expect(updated.content).toBe('DismissContent');
      expect(updated.priority).toBe(NotificationPriority.High);
    });
    it('returns frozen object', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      const updated = await nc.markDismissed(n.id as string);
      expect(Object.isFrozen(updated)).toBe(true);
    });
    it('get after markDismissed reflects change', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.markDismissed(n.id as string);
      const fetched = await nc.get(n.id as string);
      expect(fetched!.status).toBe(NotificationStatus.Dismissed);
    });
    it('markRead then markDismissed keeps Dismissed status', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.markRead(n.id as string);
      const updated = await nc.markDismissed(n.id as string);
      expect(updated.status).toBe(NotificationStatus.Dismissed);
    });
  });

  describe('remove', () => {
    it('throws NotificationNotFoundError for non-existent id', async () => {
      await expect(nc.remove('nope')).rejects.toThrow(NotificationNotFoundError);
    });
    it('removes the notification from get', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.remove(n.id as string);
      const fetched = await nc.get(n.id as string);
      expect(fetched).toBeNull();
    });
    it('removes the notification from list', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.create(SESSION_1, USER_1, 'T2', 'C2');
      await nc.remove(n.id as string);
      const list = await nc.list(SESSION_1);
      expect(list).toHaveLength(1);
      expect(list[0].id).not.toBe(n.id);
    });
    it('decrements count', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.create(SESSION_1, USER_1, 'T2', 'C2');
      expect(await nc.count(SESSION_1)).toBe(2);
      await nc.remove(n.id as string);
      expect(await nc.count(SESSION_1)).toBe(1);
    });
    it('decrements unreadCount if unread', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(await nc.unreadCount(SESSION_1)).toBe(1);
      await nc.remove(n.id as string);
      expect(await nc.unreadCount(SESSION_1)).toBe(0);
    });
    it('does not affect other sessions', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'T1', 'C1');
      const n2 = await nc.create(SESSION_2, USER_2, 'T2', 'C2');
      await nc.remove(n1.id as string);
      expect(await nc.count(SESSION_2)).toBe(1);
      const fetched = await nc.get(n2.id as string);
      expect(fetched).not.toBeNull();
    });
  });

  describe('limit enforcement', () => {
    it('throws NotificationLimitExceededError at limit', async () => {
      const limitNc = new NotificationCenter({ maxNotifications: 3, defaultPriority: NotificationPriority.Normal });
      await limitNc.create(SESSION_1, USER_1, 'T1', 'C1');
      await limitNc.create(SESSION_1, USER_1, 'T2', 'C2');
      await limitNc.create(SESSION_1, USER_1, 'T3', 'C3');
      await expect(limitNc.create(SESSION_1, USER_1, 'T4', 'C4')).rejects.toThrow(NotificationLimitExceededError);
    });
    it('error contains correct limit and current', async () => {
      const limitNc = new NotificationCenter({ maxNotifications: 2, defaultPriority: NotificationPriority.Normal });
      await limitNc.create(SESSION_1, USER_1, 'T1', 'C1');
      await limitNc.create(SESSION_1, USER_1, 'T2', 'C2');
      try {
        await limitNc.create(SESSION_1, USER_1, 'T3', 'C3');
        expect.unreachable('should have thrown');
      } catch (err) {
        const e = err as NotificationLimitExceededError;
        expect(e.limit).toBe(2);
        expect(e.current).toBe(2);
      }
    });
    it('limit is per-session', async () => {
      const limitNc = new NotificationCenter({ maxNotifications: 2, defaultPriority: NotificationPriority.Normal });
      await limitNc.create(SESSION_1, USER_1, 'T1', 'C1');
      await limitNc.create(SESSION_1, USER_1, 'T2', 'C2');
      await expect(limitNc.create(SESSION_1, USER_1, 'T3', 'C3')).rejects.toThrow();
      const n = await limitNc.create(SESSION_2, USER_2, 'T4', 'C4');
      expect(n).toBeTruthy();
    });
    it('delete + recreate is allowed', async () => {
      const limitNc = new NotificationCenter({ maxNotifications: 2, defaultPriority: NotificationPriority.Normal });
      const n1 = await limitNc.create(SESSION_1, USER_1, 'T1', 'C1');
      await limitNc.create(SESSION_1, USER_1, 'T2', 'C2');
      await limitNc.remove(n1.id as string);
      const n3 = await limitNc.create(SESSION_1, USER_1, 'T3', 'C3');
      expect(n3).toBeTruthy();
      expect(await limitNc.count(SESSION_1)).toBe(2);
    });
    it('delete all + recreate all works', async () => {
      const limitNc = new NotificationCenter({ maxNotifications: 2, defaultPriority: NotificationPriority.Normal });
      const n1 = await limitNc.create(SESSION_1, USER_1, 'T1', 'C1');
      const n2 = await limitNc.create(SESSION_1, USER_1, 'T2', 'C2');
      await limitNc.remove(n1.id as string);
      await limitNc.remove(n2.id as string);
      const n3 = await limitNc.create(SESSION_1, USER_1, 'T3', 'C3');
      const n4 = await limitNc.create(SESSION_1, USER_1, 'T4', 'C4');
      expect(n3).toBeTruthy();
      expect(n4).toBeTruthy();
    });
  });

  describe('rapid cycles', () => {
    it('handles 20 sequential creates', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        const n = await nc.create(SESSION_1, USER_1, `Rapid${i}`, `Content${i}`);
        ids.push(n.id as string);
      }
      expect(ids.length).toBe(20);
      expect(await nc.count(SESSION_1)).toBe(20);
      for (const id of ids) {
        const fetched = await nc.get(id);
        expect(fetched).not.toBeNull();
      }
    });
    it('handles create-remove cycles', async () => {
      for (let i = 0; i < 15; i++) {
        const n = await nc.create(SESSION_1, USER_1, `Cycle${i}`, `C${i}`);
        await nc.remove(n.id as string);
      }
      expect(await nc.count(SESSION_1)).toBe(0);
    });
    it('handles create-read-dismiss-remove cycle', async () => {
      for (let i = 0; i < 10; i++) {
        const n = await nc.create(SESSION_1, USER_1, `Full${i}`, `C${i}`);
        await nc.markRead(n.id as string);
        await nc.markDismissed(n.id as string);
        await nc.remove(n.id as string);
      }
      expect(await nc.count(SESSION_1)).toBe(0);
    });
  });

  describe('cross-session isolation', () => {
    it('read in session 1 does not affect session 2', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'S1', 'C');
      const n2 = await nc.create(SESSION_2, USER_2, 'S2', 'C');
      await nc.markRead(n1.id as string);
      const fetched2 = await nc.get(n2.id as string);
      expect(fetched2!.status).toBe(NotificationStatus.Unread);
    });
    it('remove in session 1 does not affect session 2', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'S1', 'C');
      const n2 = await nc.create(SESSION_2, USER_2, 'S2', 'C');
      await nc.remove(n1.id as string);
      const fetched2 = await nc.get(n2.id as string);
      expect(fetched2).not.toBeNull();
      expect(await nc.count(SESSION_2)).toBe(1);
    });
    it('dismiss in session 1 does not affect session 2', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'S1', 'C');
      const n2 = await nc.create(SESSION_2, USER_2, 'S2', 'C');
      await nc.markDismissed(n1.id as string);
      const fetched2 = await nc.get(n2.id as string);
      expect(fetched2!.status).toBe(NotificationStatus.Unread);
    });
    it('bulk operations in 3 sessions are isolated', async () => {
      const sessions = [SESSION_1, SESSION_2, 'session-notify-3'];
      for (const sess of sessions) {
        for (let i = 0; i < 5; i++) {
          await nc.create(sess, USER_1, `T-${sess}-${i}`, `C`);
        }
      }
      for (const sess of sessions) {
        expect(await nc.count(sess)).toBe(5);
        expect(await nc.unreadCount(sess)).toBe(5);
      }
    });
  });

  describe('metadata immutability', () => {
    it('metadata is frozen empty object', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(Object.isFrozen(n.metadata)).toBe(true);
      expect(n.metadata).toEqual({});
    });
  });

  describe('various title and content', () => {
    it('handles empty title', async () => {
      const n = await nc.create(SESSION_1, USER_1, '', 'Content');
      expect(n.title).toBe('');
    });
    it('handles empty content', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'Title', '');
      expect(n.content).toBe('');
    });
    it('handles unicode title and content', async () => {
      const n = await nc.create(SESSION_1, USER_1, '\u2603 Snowman \u2764', '\u2605 Star \u2666');
      expect(n.title).toBe('\u2603 Snowman \u2764');
      expect(n.content).toBe('\u2605 Star \u2666');
    });
    it('handles very long title', async () => {
      const longTitle = 'X'.repeat(500);
      const n = await nc.create(SESSION_1, USER_1, longTitle, 'C');
      expect(n.title).toBe(longTitle);
    });
    it('handles very long content', async () => {
      const longContent = 'Y'.repeat(1000);
      const n = await nc.create(SESSION_1, USER_1, 'T', longContent);
      expect(n.content).toBe(longContent);
    });
  });

  describe('various userId values', () => {
    it('accepts numeric string userId', async () => {
      const n = await nc.create(SESSION_1, '12345', 'T', 'C');
      expect(n.userId).toBe('12345');
    });
    it('accepts uuid userId', async () => {
      const uuid = crypto.randomUUID();
      const n = await nc.create(SESSION_1, uuid, 'T', 'C');
      expect(n.userId).toBe(uuid);
    });
    it('accepts email-like userId', async () => {
      const n = await nc.create(SESSION_1, 'user@example.com', 'T', 'C');
      expect(n.userId).toBe('user@example.com');
    });
  });

  describe('error properties', () => {
    it('NotificationNotFoundError has correct properties', () => {
      const err = new NotificationNotFoundError('test-id');
      expect(err.notificationId).toBe('test-id');
      expect(err.code).toBe('NOTIFICATION_NOT_FOUND');
      expect(err.message).toContain('test-id');
    });
    it('NotificationLimitExceededError has correct properties', () => {
      const err = new NotificationLimitExceededError(10, 10);
      expect(err.limit).toBe(10);
      expect(err.current).toBe(10);
      expect(err.code).toBe('NOTIFICATION_LIMIT');
    });
  });

  describe('combined operations', () => {
    it('create 3, read 1, dismiss 1, remove 1, count and unreadCount match', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'A', 'A');
      const n2 = await nc.create(SESSION_1, USER_1, 'B', 'B');
      const n3 = await nc.create(SESSION_1, USER_1, 'C', 'C');
      await nc.markRead(n1.id as string);
      await nc.markDismissed(n2.id as string);
      await nc.remove(n3.id as string);
      expect(await nc.count(SESSION_1)).toBe(2);
      expect(await nc.unreadCount(SESSION_1)).toBe(0);
    });
    it('list returns only existing notifications', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'A', 'A');
      const n2 = await nc.create(SESSION_1, USER_1, 'B', 'B');
      await nc.remove(n1.id as string);
      const list = await nc.list(SESSION_1);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(n2.id);
    });
  });

  describe('priority distribution', () => {
    it('creates 10 notifications of each priority and counts', async () => {
      for (const priority of PRIORITIES) {
        for (let i = 0; i < 10; i++) {
          await nc.create(SESSION_1, USER_1, `${priority}-${i}`, 'C', priority);
        }
      }
      expect(await nc.count(SESSION_1)).toBe(50);
      const list = await nc.list(SESSION_1);
      const criticals = list.filter(n => n.priority === NotificationPriority.Critical);
      const highs = list.filter(n => n.priority === NotificationPriority.High);
      const normals = list.filter(n => n.priority === NotificationPriority.Normal);
      const lows = list.filter(n => n.priority === NotificationPriority.Low);
      const infos = list.filter(n => n.priority === NotificationPriority.Info);
      expect(criticals).toHaveLength(10);
      expect(highs).toHaveLength(10);
      expect(normals).toHaveLength(10);
      expect(lows).toHaveLength(10);
      expect(infos).toHaveLength(10);
    });
  });

  describe('status transitions', () => {
    it('Unread -> Read -> get returns Read', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(n.status).toBe(NotificationStatus.Unread);
      const read = await nc.markRead(n.id as string);
      expect(read.status).toBe(NotificationStatus.Read);
      const fetched = await nc.get(n.id as string);
      expect(fetched!.status).toBe(NotificationStatus.Read);
    });
    it('Unread -> Dismissed -> get returns Dismissed', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(n.status).toBe(NotificationStatus.Unread);
      const dismissed = await nc.markDismissed(n.id as string);
      expect(dismissed.status).toBe(NotificationStatus.Dismissed);
    });
    it('Unread -> Read -> Dismissed', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.markRead(n.id as string);
      const dismissed = await nc.markDismissed(n.id as string);
      expect(dismissed.status).toBe(NotificationStatus.Dismissed);
    });
  });

  describe('edge cases', () => {
    it('remove throws on already removed notification', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.remove(n.id as string);
      await expect(nc.remove(n.id as string)).rejects.toThrow(NotificationNotFoundError);
    });
    it('markRead throws on removed notification', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.remove(n.id as string);
      await expect(nc.markRead(n.id as string)).rejects.toThrow(NotificationNotFoundError);
    });
    it('markDismissed throws on removed notification', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      await nc.remove(n.id as string);
      await expect(nc.markDismissed(n.id as string)).rejects.toThrow(NotificationNotFoundError);
    });
    it('creating with same session/user but different content works', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'Same', 'First');
      const n2 = await nc.create(SESSION_1, USER_1, 'Same', 'Second');
      expect(n1.id).not.toBe(n2.id);
      expect(n1.content).toBe('First');
      expect(n2.content).toBe('Second');
    });
  });

  describe('list ordering', () => {
    it('list returns notifications in creation order', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const n = await nc.create(SESSION_1, USER_1, `Order${i}`, `C`);
        ids.push(n.id as string);
      }
      const list = await nc.list(SESSION_1);
      const listIds = list.map(n => n.id as string);
      expect(listIds).toEqual(ids);
    });
  });

  describe('create 50 notifications stress', () => {
    it('creates 50 notifications in one session', async () => {
      const notifications = [];
      for (let i = 0; i < 50; i++) {
        const n = await nc.create(SESSION_1, USER_1, `Stress${i}`, `Content${i}`, PRIORITIES[i % 5]);
        notifications.push(n);
      }
      expect(notifications).toHaveLength(50);
      expect(await nc.count(SESSION_1)).toBe(50);
      const uniqueIds = new Set(notifications.map(n => n.id as string));
      expect(uniqueIds.size).toBe(50);
    });
  });

  describe('mark all operations across many notifications', () => {
    it('markRead on first 10 of 20 leaves 10 unread', async () => {
      const all = [];
      for (let i = 0; i < 20; i++) {
        all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
      }
      for (let i = 0; i < 10; i++) {
        await nc.markRead(all[i].id as string);
      }
      expect(await nc.unreadCount(SESSION_1)).toBe(10);
    });
    it('markDismissed on all leaves 0 unread', async () => {
      const all = [];
      for (let i = 0; i < 15; i++) {
        all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
      }
      for (const n of all) {
        await nc.markDismissed(n.id as string);
      }
      expect(await nc.unreadCount(SESSION_1)).toBe(0);
    });
    it('remove all leaves 0 count and 0 unread', async () => {
      const all = [];
      for (let i = 0; i < 25; i++) {
        all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
      }
      for (const n of all) {
        await nc.remove(n.id as string);
      }
      expect(await nc.count(SESSION_1)).toBe(0);
      expect(await nc.unreadCount(SESSION_1)).toBe(0);
    });
  });

  describe('different sessions with interleaved operations', () => {
    it('interleaved creates across 4 sessions', async () => {
      const sessions = ['s-a', 's-b', 's-c', 's-d'];
      for (let i = 0; i < 10; i++) {
        for (const s of sessions) {
          await nc.create(s, USER_1, `T-${s}-${i}`, `C`);
        }
      }
      for (const s of sessions) {
        expect(await nc.count(s)).toBe(10);
      }
    });
    it('interleaved read/dismiss/remove across 3 sessions', async () => {
      const n1 = await nc.create(SESSION_1, USER_1, 'S1', 'C');
      const n2 = await nc.create(SESSION_2, USER_2, 'S2', 'C');
      const n3 = await nc.create('session-notify-3', USER_1, 'S3', 'C');
      await nc.markRead(n1.id as string);
      await nc.markDismissed(n2.id as string);
      await nc.remove(n3.id as string);
      expect(await nc.unreadCount(SESSION_1)).toBe(0);
      expect(await nc.unreadCount(SESSION_2)).toBe(0);
      expect(await nc.count('session-notify-3')).toBe(0);
    });
  });

  describe('notification field types', () => {
    it('id starts with notif-', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect((n.id as string).startsWith('notif-')).toBe(true);
    });
    it('sessionId matches input', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(n.sessionId).toBe(SESSION_1);
    });
    it('createdAt is a string', async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(typeof n.createdAt).toBe('string');
    });
  });
});

describe('NotificationCenter with custom config', () => {
  it('respects default priority config', async () => {
    const ncCustom = new NotificationCenter({ maxNotifications: 10, defaultPriority: NotificationPriority.Critical });
    const n = await ncCustom.create(SESSION_1, USER_1, 'T', 'C');
    expect(n.priority).toBe(NotificationPriority.Critical);
  });
  it('respects maxNotifications of 1', async () => {
    const ncSmall = new NotificationCenter({ maxNotifications: 1, defaultPriority: NotificationPriority.Normal });
    await ncSmall.create(SESSION_1, USER_1, 'T', 'C');
    await expect(ncSmall.create(SESSION_1, USER_1, 'T2', 'C2')).rejects.toThrow(NotificationLimitExceededError);
  });
  it('maxNotifications of 0 prevents all creates', async () => {
    const ncZero = new NotificationCenter({ maxNotifications: 0, defaultPriority: NotificationPriority.Normal });
    await expect(ncZero.create(SESSION_1, USER_1, 'T', 'C')).rejects.toThrow(NotificationLimitExceededError);
  });
});

describe('NotificationCenter sessionId variations', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  const sessionIdVariants = [
    { label: 'uuid', value: () => crypto.randomUUID() },
    { label: 'numeric string', value: () => '12345' },
    { label: 'hyphenated', value: () => 'my-session-id-001' },
    { label: 'short', value: () => 's1' },
    { label: 'long', value: () => 'a'.repeat(200) },
  ];

  for (const variant of sessionIdVariants) {
    it(`handles ${variant.label} sessionId`, async () => {
      const sid = variant.value();
      const n = await nc.create(sid, USER_1, 'T', 'C');
      expect(n.sessionId).toBe(sid);
      const list = await nc.list(sid);
      expect(list).toHaveLength(1);
    });
  }
});

describe('NotificationCenter comprehensive field verification', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  const fields = ['id', 'sessionId', 'userId', 'title', 'content', 'priority', 'status', 'createdAt', 'readAt', 'metadata'];
  for (const field of fields) {
    it(`notification has ${field} field`, async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
      expect(field in n).toBe(true);
    });
  }
});

describe('NotificationCenter batch operations pattern', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('batch create 30, verify each by get', async () => {
    const created = [];
    for (let i = 0; i < 30; i++) {
      created.push(await nc.create(SESSION_1, USER_1, `Batch${i}`, `Desc${i}`));
    }
    for (let i = 0; i < 30; i++) {
      const fetched = await nc.get(created[i].id as string);
      expect(fetched!.title).toBe(`Batch${i}`);
      expect(fetched!.content).toBe(`Desc${i}`);
    }
  });
  it('batch create 30, verify by list ordering', async () => {
    for (let i = 0; i < 30; i++) {
      await nc.create(SESSION_1, USER_1, `Seq${i}`, `C`);
    }
    const list = await nc.list(SESSION_1);
    for (let i = 0; i < 30; i++) {
      expect(list[i].title).toBe(`Seq${i}`);
    }
  });
  it('batch create 20, remove every other, verify survivors', async () => {
    const all = [];
    for (let i = 0; i < 20; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `Parity${i}`, `C`));
    }
    for (let i = 0; i < 20; i += 2) {
      await nc.remove(all[i].id as string);
    }
    expect(await nc.count(SESSION_1)).toBe(10);
    const list = await nc.list(SESSION_1);
    for (const n of list) {
      const idx = parseInt(n.title.replace('Parity', ''), 10);
      expect(idx % 2).toBe(1);
    }
  });
  it('batch create 25 across 5 sessions, verify per-session counts', async () => {
    const sessions = ['bs-1', 'bs-2', 'bs-3', 'bs-4', 'bs-5'];
    for (let i = 0; i < 25; i++) {
      const sid = sessions[i % 5];
      await nc.create(sid, USER_1, `T${i}`, `C`);
    }
    for (const sid of sessions) {
      expect(await nc.count(sid)).toBe(5);
    }
  });
});

describe('NotificationCenter unreadCount after mixed operations', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('5 created: read 2, dismiss 1, remove 1 -> 1 unread', async () => {
    const all = [];
    for (let i = 0; i < 5; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    await nc.markRead(all[0].id as string);
    await nc.markRead(all[1].id as string);
    await nc.markDismissed(all[2].id as string);
    await nc.remove(all[3].id as string);
    expect(await nc.unreadCount(SESSION_1)).toBe(1);
    expect(await nc.count(SESSION_1)).toBe(4);
  });

  it('markRead then remove keeps unreadCount consistent', async () => {
    const n1 = await nc.create(SESSION_1, USER_1, 'T1', 'C');
    const n2 = await nc.create(SESSION_1, USER_1, 'T2', 'C');
    const n3 = await nc.create(SESSION_1, USER_1, 'T3', 'C');
    await nc.markRead(n1.id as string);
    await nc.remove(n2.id as string);
    expect(await nc.unreadCount(SESSION_1)).toBe(1);
    await nc.remove(n1.id as string);
    expect(await nc.unreadCount(SESSION_1)).toBe(1);
    await nc.remove(n3.id as string);
    expect(await nc.unreadCount(SESSION_1)).toBe(0);
  });
});

describe('NotificationCenter createdAt consistency', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('readAt is after createdAt when marked read', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const readNotif = await nc.markRead(n.id as string);
    expect(new Date(readNotif.readAt!).getTime()).toBeGreaterThanOrEqual(new Date(readNotif.createdAt).getTime());
  });
  it('createdAt does not change after markRead', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const readNotif = await nc.markRead(n.id as string);
    expect(readNotif.createdAt).toBe(n.createdAt);
  });
  it('createdAt does not change after markDismissed', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const dismissed = await nc.markDismissed(n.id as string);
    expect(dismissed.createdAt).toBe(n.createdAt);
  });
});

describe('NotificationCenter concurrent session patterns', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  for (let sessionIdx = 0; sessionIdx < 3; sessionIdx++) {
    describe(`session ${sessionIdx}`, () => {
      const sid = `concurrent-session-${sessionIdx}`;
      it(`creates and retrieves 10 notifications`, async () => {
        const ids: string[] = [];
        for (let i = 0; i < 10; i++) {
          const n = await nc.create(sid, `user-${sessionIdx}`, `T${i}`, `C`);
          ids.push(n.id as string);
        }
        expect(await nc.count(sid)).toBe(10);
        for (const id of ids) {
          const fetched = await nc.get(id);
          expect(fetched).not.toBeNull();
          expect(fetched!.sessionId).toBe(sid);
        }
      });
    });
  }
});

describe('NotificationCenter priority-specific behavior', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  for (const priority of PRIORITIES) {
    describe(`${PRIORITY_LABELS[priority]} notifications`, () => {
      it(`create, get, and verify ${PRIORITY_LABELS[priority]}`, async () => {
        const n = await nc.create(SESSION_1, USER_1, `P-${priority}`, 'C', priority);
        const fetched = await nc.get(n.id as string);
        expect(fetched!.priority).toBe(priority);
      });
      it(`${PRIORITY_LABELS[priority]} survives markRead`, async () => {
        const n = await nc.create(SESSION_1, USER_1, 'T', 'C', priority);
        const read = await nc.markRead(n.id as string);
        expect(read.priority).toBe(priority);
      });
      it(`${PRIORITY_LABELS[priority]} survives markDismissed`, async () => {
        const n = await nc.create(SESSION_1, USER_1, 'T', 'C', priority);
        const dismissed = await nc.markDismissed(n.id as string);
        expect(dismissed.priority).toBe(priority);
      });
      it(`${PRIORITY_LABELS[priority]} in list`, async () => {
        await nc.create(SESSION_1, USER_1, 'T', 'C', priority);
        const list = await nc.list(SESSION_1);
        const matching = list.filter(n => n.priority === priority);
        expect(matching).toHaveLength(1);
      });
      it(`multiple ${PRIORITY_LABELS[priority]} notifications counted`, async () => {
        for (let i = 0; i < 5; i++) {
          await nc.create(SESSION_1, USER_1, `T${i}`, 'C', priority);
        }
        const list = await nc.list(SESSION_1);
        const matching = list.filter(n => n.priority === priority);
        expect(matching).toHaveLength(5);
      });
    });
  }
});

describe('NotificationCenter error inheritance', () => {
  it('NotificationNotFoundError is instance of Error', () => {
    const err = new NotificationNotFoundError('x');
    expect(err).toBeInstanceOf(Error);
  });
  it('NotificationLimitExceededError is instance of Error', () => {
    const err = new NotificationLimitExceededError(5, 5);
    expect(err).toBeInstanceOf(Error);
  });
  it('NotificationNotFoundError has code property', () => {
    const err = new NotificationNotFoundError('x');
    expect(typeof err.code).toBe('string');
  });
  it('NotificationLimitExceededError has code property', () => {
    const err = new NotificationLimitExceededError(5, 5);
    expect(typeof err.code).toBe('string');
  });
});

describe('NotificationCenter list after various modifications', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('list reflects status changes', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    await nc.markRead(n.id as string);
    const list = await nc.list(SESSION_1);
    expect(list[0].status).toBe(NotificationStatus.Read);
  });
  it('list does not include removed items', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    await nc.remove(n.id as string);
    expect(await nc.list(SESSION_1)).toHaveLength(0);
  });
  it('list count matches get for each item', async () => {
    const all = [];
    for (let i = 0; i < 8; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    const list = await nc.list(SESSION_1);
    expect(list).toHaveLength(8);
    for (const n of list) {
      const fetched = await nc.get(n.id as string);
      expect(fetched!.id).toBe(n.id);
    }
  });
});

describe('NotificationCenter new instance isolation', () => {
  it('two instances do not share notifications', async () => {
    const nc1 = new NotificationCenter(DefaultNotificationCenterConfig);
    const nc2 = new NotificationCenter(DefaultNotificationCenterConfig);
    await nc1.create(SESSION_1, USER_1, 'NC1', 'C');
    await nc2.create(SESSION_1, USER_1, 'NC2', 'C');
    expect(await nc1.count(SESSION_1)).toBe(1);
    expect(await nc2.count(SESSION_1)).toBe(1);
    const list1 = await nc1.list(SESSION_1);
    expect(list1[0].title).toBe('NC1');
    const list2 = await nc2.list(SESSION_1);
    expect(list2[0].title).toBe('NC2');
  });
});

describe('NotificationCenter remove all then recreate pattern', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter({ maxNotifications: 5, defaultPriority: NotificationPriority.Normal }); });

  it('fill to limit, remove all, recreate to limit', async () => {
    const all = [];
    for (let i = 0; i < 5; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    for (const n of all) {
      await nc.remove(n.id as string);
    }
    expect(await nc.count(SESSION_1)).toBe(0);
    for (let i = 0; i < 5; i++) {
      await nc.create(SESSION_1, USER_1, `New${i}`, `C`);
    }
    expect(await nc.count(SESSION_1)).toBe(5);
  });
  it('fill to limit, remove one, create one', async () => {
    const all = [];
    for (let i = 0; i < 5; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    await nc.remove(all[0].id as string);
    const n = await nc.create(SESSION_1, USER_1, 'Replacement', 'C');
    expect(n).toBeTruthy();
    expect(await nc.count(SESSION_1)).toBe(5);
  });
});

describe('NotificationCenter notification snapshot immutability', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('returned notification from create is independent of internal state changes', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    await nc.markRead(n.id as string);
    expect(n.status).toBe(NotificationStatus.Unread);
    const fetched = await nc.get(n.id as string);
    expect(fetched!.status).toBe(NotificationStatus.Read);
  });
  it('list returns current state snapshots', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    await nc.markRead(n.id as string);
    const list = await nc.list(SESSION_1);
    expect(list[0].status).toBe(NotificationStatus.Read);
  });
});

describe('NotificationCenter stress: create-remove alternating', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('alternating create/remove 40 times stays at count 0-1', async () => {
    let lastId: string | undefined;
    for (let i = 0; i < 40; i++) {
      const n = await nc.create(SESSION_1, USER_1, `Alt${i}`, `C`);
      lastId = n.id as string;
      if (i % 2 === 0) {
        await nc.remove(lastId);
      }
    }
    expect(await nc.count(SESSION_1)).toBe(20);
  });
});

describe('NotificationCenter userId tracking', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('notifications preserve their userId', async () => {
    const n1 = await nc.create(SESSION_1, 'alice', 'T', 'C');
    const n2 = await nc.create(SESSION_1, 'bob', 'T', 'C');
    expect(n1.userId).toBe('alice');
    expect(n2.userId).toBe('bob');
  });
  it('markRead preserves userId', async () => {
    const n = await nc.create(SESSION_1, 'charlie', 'T', 'C');
    const read = await nc.markRead(n.id as string);
    expect(read.userId).toBe('charlie');
  });
  it('markDismissed preserves userId', async () => {
    const n = await nc.create(SESSION_1, 'diana', 'T', 'C');
    const dismissed = await nc.markDismissed(n.id as string);
    expect(dismissed.userId).toBe('diana');
  });
});

describe('NotificationCenter empty string operations', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('get with empty string returns null', async () => {
    expect(await nc.get('')).toBeNull();
  });
  it('remove with empty string throws', async () => {
    await expect(nc.remove('')).rejects.toThrow(NotificationNotFoundError);
  });
  it('markRead with empty string throws', async () => {
    await expect(nc.markRead('')).rejects.toThrow(NotificationNotFoundError);
  });
  it('markDismissed with empty string throws', async () => {
    await expect(nc.markDismissed('')).rejects.toThrow(NotificationNotFoundError);
  });
  it('count with empty sessionId returns 0', async () => {
    expect(await nc.count('')).toBe(0);
  });
  it('unreadCount with empty sessionId returns 0', async () => {
    expect(await nc.unreadCount('')).toBe(0);
  });
  it('list with empty sessionId returns empty', async () => {
    expect(await nc.list('')).toEqual([]);
  });
});

describe('NotificationCenter id format', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('all created IDs are unique across 100 notifications', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const n = await nc.create(SESSION_1, USER_1, `T${i}`, `C`);
      ids.add(n.id as string);
    }
    expect(ids.size).toBe(100);
  });
  it('each ID starts with notif-', async () => {
    for (let i = 0; i < 20; i++) {
      const n = await nc.create(SESSION_1, USER_1, `T${i}`, `C`);
      expect((n.id as string).startsWith('notif-')).toBe(true);
    }
  });
});

describe('NotificationCenter limit boundary at 2', () => {
  it('exactly at limit is ok', async () => {
    const nc2 = new NotificationCenter({ maxNotifications: 2, defaultPriority: NotificationPriority.Normal });
    await nc2.create(SESSION_1, USER_1, 'T1', 'C1');
    await nc2.create(SESSION_1, USER_1, 'T2', 'C2');
    expect(await nc2.count(SESSION_1)).toBe(2);
  });
  it('one over limit throws', async () => {
    const nc2 = new NotificationCenter({ maxNotifications: 2, defaultPriority: NotificationPriority.Normal });
    await nc2.create(SESSION_1, USER_1, 'T1', 'C1');
    await nc2.create(SESSION_1, USER_1, 'T2', 'C2');
    await expect(nc2.create(SESSION_1, USER_1, 'T3', 'C3')).rejects.toThrow(NotificationLimitExceededError);
  });
  it('count is still 2 after failed create', async () => {
    const nc2 = new NotificationCenter({ maxNotifications: 2, defaultPriority: NotificationPriority.Normal });
    await nc2.create(SESSION_1, USER_1, 'T1', 'C1');
    await nc2.create(SESSION_1, USER_1, 'T2', 'C2');
    try { await nc2.create(SESSION_1, USER_1, 'T3', 'C3'); } catch { /* expected */ }
    expect(await nc2.count(SESSION_1)).toBe(2);
  });
});

describe('NotificationCenter markRead on different priority notifications', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  for (const priority of PRIORITIES) {
    it(`markRead works on ${PRIORITY_LABELS[priority]} notification`, async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C', priority);
      const read = await nc.markRead(n.id as string);
      expect(read.status).toBe(NotificationStatus.Read);
      expect(read.priority).toBe(priority);
    });
  }
});

describe('NotificationCenter markDismissed on different priority notifications', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  for (const priority of PRIORITIES) {
    it(`markDismissed works on ${PRIORITY_LABELS[priority]} notification`, async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C', priority);
      const dismissed = await nc.markDismissed(n.id as string);
      expect(dismissed.status).toBe(NotificationStatus.Dismissed);
      expect(dismissed.priority).toBe(priority);
    });
  }
});

describe('NotificationCenter remove on different priority notifications', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  for (const priority of PRIORITIES) {
    it(`remove works on ${PRIORITY_LABELS[priority]} notification`, async () => {
      const n = await nc.create(SESSION_1, USER_1, 'T', 'C', priority);
      await nc.remove(n.id as string);
      expect(await nc.get(n.id as string)).toBeNull();
    });
  }
});

describe('NotificationCenter count after remove of specific priorities', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('remove Critical notifications leaves others', async () => {
    const criticals = [];
    const others = [];
    for (let i = 0; i < 3; i++) {
      criticals.push(await nc.create(SESSION_1, USER_1, `Crit${i}`, 'C', NotificationPriority.Critical));
    }
    for (let i = 0; i < 3; i++) {
      others.push(await nc.create(SESSION_1, USER_1, `Other${i}`, 'C', NotificationPriority.Normal));
    }
    for (const n of criticals) {
      await nc.remove(n.id as string);
    }
    expect(await nc.count(SESSION_1)).toBe(3);
  });
});

describe('NotificationCenter list with mixed sessions and priorities', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('session 1 has 2 Critical, session 2 has 3 Normal', async () => {
    await nc.create(SESSION_1, USER_1, 'T', 'C', NotificationPriority.Critical);
    await nc.create(SESSION_1, USER_1, 'T2', 'C', NotificationPriority.Critical);
    await nc.create(SESSION_2, USER_2, 'T3', 'C', NotificationPriority.Normal);
    await nc.create(SESSION_2, USER_2, 'T4', 'C', NotificationPriority.Normal);
    await nc.create(SESSION_2, USER_2, 'T5', 'C', NotificationPriority.Normal);
    const list1 = await nc.list(SESSION_1);
    const list2 = await nc.list(SESSION_2);
    expect(list1).toHaveLength(2);
    expect(list2).toHaveLength(3);
    expect(list1.every(n => n.priority === NotificationPriority.Critical)).toBe(true);
    expect(list2.every(n => n.priority === NotificationPriority.Normal)).toBe(true);
  });
});

describe('NotificationCenter metadata frozen across operations', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('metadata frozen after create', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    expect(Object.isFrozen(n.metadata)).toBe(true);
  });
  it('metadata frozen after markRead', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const read = await nc.markRead(n.id as string);
    expect(Object.isFrozen(read.metadata)).toBe(true);
  });
  it('metadata frozen after markDismissed', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const dismissed = await nc.markDismissed(n.id as string);
    expect(Object.isFrozen(dismissed.metadata)).toBe(true);
  });
});

describe('NotificationCenter multiple operations on same notification', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('markRead twice returns Read both times', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const r1 = await nc.markRead(n.id as string);
    const r2 = await nc.markRead(n.id as string);
    expect(r1.status).toBe(NotificationStatus.Read);
    expect(r2.status).toBe(NotificationStatus.Read);
  });
  it('markDismissed twice returns Dismissed both times', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const d1 = await nc.markDismissed(n.id as string);
    const d2 = await nc.markDismissed(n.id as string);
    expect(d1.status).toBe(NotificationStatus.Dismissed);
    expect(d2.status).toBe(NotificationStatus.Dismissed);
  });
  it('markRead then markDismissed then markRead', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    await nc.markRead(n.id as string);
    await nc.markDismissed(n.id as string);
    const final = await nc.markRead(n.id as string);
    expect(final.status).toBe(NotificationStatus.Read);
  });
  it('markDismissed then markRead then markDismissed', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    await nc.markDismissed(n.id as string);
    await nc.markRead(n.id as string);
    const final = await nc.markDismissed(n.id as string);
    expect(final.status).toBe(NotificationStatus.Dismissed);
  });
});

describe('NotificationCenter get returns consistent object across calls', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('get twice returns same values', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const f1 = await nc.get(n.id as string);
    const f2 = await nc.get(n.id as string);
    expect(f1!.id).toBe(f2!.id);
    expect(f1!.title).toBe(f2!.title);
    expect(f1!.status).toBe(f2!.status);
  });
  it('get after list returns same data', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'Consistent', 'Test');
    const list = await nc.list(SESSION_1);
    const fetched = await nc.get(n.id as string);
    expect(list[0].id).toBe(fetched!.id);
    expect(list[0].title).toBe(fetched!.title);
  });
});

describe('NotificationCenter notification status enum values', () => {
  it('Unread is a string', () => {
    expect(typeof NotificationStatus.Unread).toBe('string');
  });
  it('Read is a string', () => {
    expect(typeof NotificationStatus.Read).toBe('string');
  });
  it('Dismissed is a string', () => {
    expect(typeof NotificationStatus.Dismissed).toBe('string');
  });
  it('Actioned is a string', () => {
    expect(typeof NotificationStatus.Actioned).toBe('string');
  });
  it('all status values are distinct', () => {
    const values = new Set([NotificationStatus.Unread, NotificationStatus.Read, NotificationStatus.Dismissed, NotificationStatus.Actioned]);
    expect(values.size).toBe(4);
  });
  it('all priority values are distinct', () => {
    const values = new Set(PRIORITIES);
    expect(values.size).toBe(5);
  });
});

describe('NotificationCenter remove and count consistency', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('count decreases by 1 after each remove', async () => {
    const all = [];
    for (let i = 0; i < 10; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    for (let i = 0; i < 10; i++) {
      expect(await nc.count(SESSION_1)).toBe(10 - i);
      await nc.remove(all[i].id as string);
    }
    expect(await nc.count(SESSION_1)).toBe(0);
  });
});

describe('NotificationCenter unreadCount with only dismissed', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('all dismissed gives 0 unread', async () => {
    const all = [];
    for (let i = 0; i < 5; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    for (const n of all) {
      await nc.markDismissed(n.id as string);
    }
    expect(await nc.unreadCount(SESSION_1)).toBe(0);
    expect(await nc.count(SESSION_1)).toBe(5);
  });
});

describe('NotificationCenter list with no notifications returns empty array', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('list for non-existent session returns empty array', async () => {
    expect(await nc.list('no-such-session')).toEqual([]);
  });
  it('list for empty session is a new array each time', async () => {
    const l1 = await nc.list('empty-session');
    const l2 = await nc.list('empty-session');
    expect(l1).not.toBe(l2);
    expect(l1).toEqual([]);
  });
});

describe('NotificationCenter get after multiple status transitions', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('5 transitions on same notification, final state is last', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    await nc.markRead(n.id as string);
    await nc.markDismissed(n.id as string);
    await nc.markRead(n.id as string);
    await nc.markDismissed(n.id as string);
    const final = await nc.markRead(n.id as string);
    expect(final.status).toBe(NotificationStatus.Read);
    const fetched = await nc.get(n.id as string);
    expect(fetched!.status).toBe(NotificationStatus.Read);
  });
});

describe('NotificationCenter create with each priority preserves all fields', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  for (const priority of PRIORITIES) {
    it(`fields preserved for ${PRIORITY_LABELS[priority]}`, async () => {
      const n = await nc.create(SESSION_1, USER_1, `Title-${priority}`, `Content-${priority}`, priority);
      expect(n.id).toBeTruthy();
      expect(n.sessionId).toBe(SESSION_1);
      expect(n.userId).toBe(USER_1);
      expect(n.title).toBe(`Title-${priority}`);
      expect(n.content).toBe(`Content-${priority}`);
      expect(n.priority).toBe(priority);
      expect(n.status).toBe(NotificationStatus.Unread);
      expect(n.readAt).toBeNull();
      expect(n.createdAt).toBeTruthy();
      expect(n.metadata).toEqual({});
    });
  }
});

describe('NotificationCenter large batch count accuracy', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('count matches list length for 100 items', async () => {
    for (let i = 0; i < 100; i++) {
      await nc.create(SESSION_1, USER_1, `T${i}`, `C`);
    }
    expect(await nc.count(SESSION_1)).toBe(100);
    expect((await nc.list(SESSION_1)).length).toBe(100);
  });
});

describe('NotificationCenter remove middle items', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('remove items 2,4,6 from 10, count is 7', async () => {
    const all = [];
    for (let i = 0; i < 10; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    await nc.remove(all[2].id as string);
    await nc.remove(all[4].id as string);
    await nc.remove(all[6].id as string);
    expect(await nc.count(SESSION_1)).toBe(7);
  });
});

describe('NotificationCenter empty content and title', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('both empty strings work', async () => {
    const n = await nc.create(SESSION_1, USER_1, '', '');
    expect(n.title).toBe('');
    expect(n.content).toBe('');
  });
  it('empty title with priority works', async () => {
    const n = await nc.create(SESSION_1, USER_1, '', 'C', NotificationPriority.Critical);
    expect(n.title).toBe('');
    expect(n.priority).toBe(NotificationPriority.Critical);
  });
});

describe('NotificationCenter error message content', () => {
  it('NotificationNotFoundError message contains the id', () => {
    const err = new NotificationNotFoundError('abc-123');
    expect(err.message).toContain('abc-123');
  });
  it('NotificationLimitExceededError message contains counts', () => {
    const err = new NotificationLimitExceededError(50, 50);
    expect(err.message).toContain('50');
  });
});

describe('NotificationCenter rapid create and immediate get', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('create then immediately get returns same notification', async () => {
    for (let i = 0; i < 30; i++) {
      const n = await nc.create(SESSION_1, USER_1, `Immediate${i}`, `C`);
      const fetched = await nc.get(n.id as string);
      expect(fetched!.title).toBe(`Immediate${i}`);
    }
  });
});

describe('NotificationCenter session isolation under limit pressure', () => {
  it('session 1 at limit does not block session 2', async () => {
    const nc2 = new NotificationCenter({ maxNotifications: 3, defaultPriority: NotificationPriority.Normal });
    await nc2.create(SESSION_1, USER_1, 'S1-1', 'C');
    await nc2.create(SESSION_1, USER_1, 'S1-2', 'C');
    await nc2.create(SESSION_1, USER_1, 'S1-3', 'C');
    await expect(nc2.create(SESSION_1, USER_1, 'S1-4', 'C')).rejects.toThrow();
    const n = await nc2.create(SESSION_2, USER_2, 'S2-1', 'C');
    expect(n).toBeTruthy();
    expect(n.sessionId).toBe(SESSION_2);
  });
});

describe('NotificationCenter remove nonexistent ids', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  const badIds = ['nonexistent', '', 'null', 'undefined-string', '12345', 'notif-fake'];
  for (const badId of badIds) {
    it(`remove throws for id: ${badId}`, async () => {
      await expect(nc.remove(badId)).rejects.toThrow(NotificationNotFoundError);
    });
  }
});

describe('NotificationCenter markRead nonexistent ids', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  const badIds = ['nonexistent', '', 'null', '12345', 'notif-fake'];
  for (const badId of badIds) {
    it(`markRead throws for id: ${badId}`, async () => {
      await expect(nc.markRead(badId)).rejects.toThrow(NotificationNotFoundError);
    });
  }
});

describe('NotificationCenter markDismissed nonexistent ids', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  const badIds = ['nonexistent', '', 'null', '12345', 'notif-fake'];
  for (const badId of badIds) {
    it(`markDismissed throws for id: ${badId}`, async () => {
      await expect(nc.markDismissed(badId)).rejects.toThrow(NotificationNotFoundError);
    });
  }
});

describe('NotificationCenter count and list consistency after mixed removals', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('create 20, remove first 5, last 5, count is 10', async () => {
    const all = [];
    for (let i = 0; i < 20; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    for (let i = 0; i < 5; i++) {
      await nc.remove(all[i].id as string);
    }
    for (let i = 15; i < 20; i++) {
      await nc.remove(all[i].id as string);
    }
    expect(await nc.count(SESSION_1)).toBe(10);
    expect((await nc.list(SESSION_1)).length).toBe(10);
  });
});

describe('NotificationCenter 5 sessions with 10 items each', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  const sessions = ['multi-s1', 'multi-s2', 'multi-s3', 'multi-s4', 'multi-s5'];
  it('each session has exactly 10', async () => {
    for (const s of sessions) {
      for (let i = 0; i < 10; i++) {
        await nc.create(s, USER_1, `T-${s}-${i}`, `C`);
      }
    }
    for (const s of sessions) {
      expect(await nc.count(s)).toBe(10);
      expect(await nc.unreadCount(s)).toBe(10);
    }
  });
  it('total across all sessions is 50', async () => {
    for (const s of sessions) {
      for (let i = 0; i < 10; i++) {
        await nc.create(s, USER_1, `T-${s}-${i}`, `C`);
      }
    }
    let total = 0;
    for (const s of sessions) {
      total += await nc.count(s);
    }
    expect(total).toBe(50);
  });
});

describe('NotificationCenter readAt null checks', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('readAt is null on freshly created notification', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    expect(n.readAt).toBeNull();
  });
  it('readAt is null after markDismissed', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const dismissed = await nc.markDismissed(n.id as string);
    expect(dismissed.readAt).toBeNull();
  });
  it('readAt is non-null after markRead', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const read = await nc.markRead(n.id as string);
    expect(read.readAt).not.toBeNull();
  });
  it('readAt persists after markRead then markDismissed', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'C');
    const read = await nc.markRead(n.id as string);
    expect(read.readAt).not.toBeNull();
    const dismissed = await nc.markDismissed(n.id as string);
    expect(dismissed.readAt).not.toBeNull();
  });
});

describe('NotificationCenter create with special characters', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('handles newlines in content', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'Line1\nLine2');
    expect(n.content).toBe('Line1\nLine2');
  });
  it('handles tabs in content', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', 'col1\tcol2');
    expect(n.content).toBe('col1\tcol2');
  });
  it('handles JSON in content', async () => {
    const json = JSON.stringify({ key: 'value' });
    const n = await nc.create(SESSION_1, USER_1, 'T', json);
    expect(n.content).toBe(json);
  });
});

describe('NotificationCenter remove then get returns null for all ids', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('remove all 5, then get each returns null', async () => {
    const all = [];
    for (let i = 0; i < 5; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    for (const n of all) {
      await nc.remove(n.id as string);
    }
    for (const n of all) {
      expect(await nc.get(n.id as string)).toBeNull();
    }
  });
});

describe('NotificationCenter create notification preserves userId across sessions', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('same userId across sessions shows in both lists', async () => {
    await nc.create(SESSION_1, USER_1, 'T', 'C');
    await nc.create(SESSION_2, USER_1, 'T', 'C');
    const l1 = await nc.list(SESSION_1);
    const l2 = await nc.list(SESSION_2);
    expect(l1[0].userId).toBe(USER_1);
    expect(l2[0].userId).toBe(USER_1);
  });
  it('different userIds across same session', async () => {
    await nc.create(SESSION_1, 'alice', 'T', 'C');
    await nc.create(SESSION_1, 'bob', 'T', 'C');
    const list = await nc.list(SESSION_1);
    const users = list.map(n => n.userId);
    expect(users).toContain('alice');
    expect(users).toContain('bob');
  });
});

describe('NotificationCenter behavior with whitespace content', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('whitespace title is preserved', async () => {
    const n = await nc.create(SESSION_1, USER_1, '   ', 'C');
    expect(n.title).toBe('   ');
  });
  it('whitespace content is preserved', async () => {
    const n = await nc.create(SESSION_1, USER_1, 'T', '   ');
    expect(n.content).toBe('   ');
  });
});

describe('NotificationCenter batch create and verify each', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('create 15 with unique titles and verify each by list', async () => {
    for (let i = 0; i < 15; i++) {
      await nc.create(SESSION_1, USER_1, `UniqueTitle${i}`, `UniqueContent${i}`);
    }
    const list = await nc.list(SESSION_1);
    for (let i = 0; i < 15; i++) {
      const found = list.find(n => n.title === `UniqueTitle${i}`);
      expect(found).toBeTruthy();
      expect(found!.content).toBe(`UniqueContent${i}`);
    }
  });
});

describe('NotificationCenter concurrent read-dismiss patterns', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('read odd, dismiss even, all 10 processed', async () => {
    const all = [];
    for (let i = 0; i < 10; i++) {
      all.push(await nc.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        await nc.markDismissed(all[i].id as string);
      } else {
        await nc.markRead(all[i].id as string);
      }
    }
    expect(await nc.unreadCount(SESSION_1)).toBe(0);
    const list = await nc.list(SESSION_1);
    expect(list).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        expect(list[i].status).toBe(NotificationStatus.Dismissed);
      } else {
        expect(list[i].status).toBe(NotificationStatus.Read);
      }
    }
  });
});

describe('NotificationCenter limit edge at maxNotifications=10', () => {
  it('create 10 succeeds, 11th fails', async () => {
    const nc10 = new NotificationCenter({ maxNotifications: 10, defaultPriority: NotificationPriority.Normal });
    for (let i = 0; i < 10; i++) {
      await nc10.create(SESSION_1, USER_1, `T${i}`, `C`);
    }
    await expect(nc10.create(SESSION_1, USER_1, 'T10', 'C')).rejects.toThrow(NotificationLimitExceededError);
  });
  it('remove 1 then create 1 succeeds', async () => {
    const nc10 = new NotificationCenter({ maxNotifications: 10, defaultPriority: NotificationPriority.Normal });
    const all = [];
    for (let i = 0; i < 10; i++) {
      all.push(await nc10.create(SESSION_1, USER_1, `T${i}`, `C`));
    }
    await nc10.remove(all[0].id as string);
    const n = await nc10.create(SESSION_1, USER_1, 'New', 'C');
    expect(n).toBeTruthy();
  });
});

describe('NotificationCenter verify all fields on get after multiple ops', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('create with Critical, read, get, all fields match', async () => {
    const created = await nc.create(SESSION_1, USER_1, 'FullCheck', 'FullContent', NotificationPriority.Critical);
    await nc.markRead(created.id as string);
    const fetched = await nc.get(created.id as string);
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.sessionId).toBe(SESSION_1);
    expect(fetched!.userId).toBe(USER_1);
    expect(fetched!.title).toBe('FullCheck');
    expect(fetched!.content).toBe('FullContent');
    expect(fetched!.priority).toBe(NotificationPriority.Critical);
    expect(fetched!.status).toBe(NotificationStatus.Read);
    expect(fetched!.createdAt).toBe(created.createdAt);
    expect(fetched!.readAt).not.toBeNull();
  });
});

describe('NotificationCenter with all 5 priorities in mixed operations', () => {
  let nc: NotificationCenter;
  beforeEach(() => { nc = new NotificationCenter(DefaultNotificationCenterConfig); });

  it('create one of each priority, read first 2, dismiss last 2, count is 5', async () => {
    const all = [];
    for (const p of PRIORITIES) {
      all.push(await nc.create(SESSION_1, USER_1, `T-${p}`, 'C', p));
    }
    await nc.markRead(all[0].id as string);
    await nc.markRead(all[1].id as string);
    await nc.markDismissed(all[3].id as string);
    await nc.markDismissed(all[4].id as string);
    expect(await nc.count(SESSION_1)).toBe(5);
    expect(await nc.unreadCount(SESSION_1)).toBe(1);
    const list = await nc.list(SESSION_1);
    expect(list[0].status).toBe(NotificationStatus.Read);
    expect(list[1].status).toBe(NotificationStatus.Read);
    expect(list[2].status).toBe(NotificationStatus.Unread);
    expect(list[3].status).toBe(NotificationStatus.Dismissed);
    expect(list[4].status).toBe(NotificationStatus.Dismissed);
  });
});
