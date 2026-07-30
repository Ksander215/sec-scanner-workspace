import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationRuntime } from '../../../desktop/notification-runtime/notification-runtime.js';

describe('NotificationRuntime', () => {
  let n: NotificationRuntime;
  beforeEach(async () => { n = new NotificationRuntime(); await n.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(n.name).toBe('NotificationRuntime'); });
    it('should initialize', () => { expect(n.initialized).toBe(true); });
    it('should start', async () => { await n.start(); });
    it('should stop', async () => { await n.stop(); });
    it('should shutdown', async () => { await n.shutdown(); expect(n.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof n.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create notification', () => { const id = n.create('Title', 'Body'); expect(id).toBeTruthy(); });
    it('should return unique ids', () => { const id1 = n.create('T', 'B'); const id2 = n.create('T', 'B'); expect(id1).not.toBe(id2); });
    it('should default type to info', () => { n.create('T', 'B'); expect(n.getAll()[0]!.type).toBe('info'); });
    it('should default priority to 0', () => { n.create('T', 'B'); expect(n.getAll()[0]!.priority).toBe(0); });
    it('should default read to false', () => { n.create('T', 'B'); expect(n.getAll()[0]!.read).toBe(false); });
    it('should accept custom type', () => { n.create('T', 'B', 'error'); expect(n.getAll()[0]!.type).toBe('error'); });
    it('should accept custom priority', () => { n.create('T', 'B', 'info', 5); expect(n.getAll()[0]!.priority).toBe(5); });
    it('should set createdAt', () => { n.create('T', 'B'); expect(n.getAll()[0]!.createdAt).toBeTruthy(); });
    it('should set expiresAt to null', () => { n.create('T', 'B'); expect(n.getAll()[0]!.expiresAt).toBeNull(); });
  });

  describe('markRead', () => {
    it('should mark single as read', () => { const id = n.create('T', 'B'); n.markRead(id); expect(n.getById(id)!.read).toBe(true); });
    it('should decrement unread count', () => { const id = n.create('T', 'B'); n.markRead(id); expect(n.getUnreadCount()).toBe(0); });
    it('should no-op if already read', () => { const id = n.create('T', 'B'); n.markRead(id); n.markRead(id); expect(n.getUnreadCount()).toBe(0); });
  });

  describe('markAllRead', () => {
    it('should mark all as read', () => { n.create('T1', 'B1'); n.create('T2', 'B2'); n.markAllRead(); expect(n.getUnreadCount()).toBe(0); });
    it('should handle empty list', () => { n.markAllRead(); expect(n.getUnreadCount()).toBe(0); });
  });

  describe('getUnreadCount', () => {
    it('should return 0 initially', () => { expect(n.getUnreadCount()).toBe(0); });
    it('should increment on create', () => { n.create('T', 'B'); expect(n.getUnreadCount()).toBe(1); });
    it('should track multiple', () => { n.create('T', 'B'); n.create('T', 'B'); expect(n.getUnreadCount()).toBe(2); });
  });

  describe('getAll', () => {
    it('should return all notifications', () => { n.create('T1', 'B1'); n.create('T2', 'B2'); expect(n.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(n.getAll().length).toBe(0); });
  });

  describe('getById', () => {
    it('should return notification', () => { const id = n.create('T', 'B'); expect(n.getById(id)!.title).toBe('T'); });
    it('should return undefined for missing', () => { expect(n.getById('nope')).toBeUndefined(); });
  });

  describe('delete', () => {
    it('should delete notification', () => { const id = n.create('T', 'B'); n.delete(id); expect(n.getById(id)).toBeUndefined(); });
    it('should decrement unread count', () => { const id = n.create('T', 'B'); n.delete(id); expect(n.getUnreadCount()).toBe(0); });
    it('should not decrement if already read', () => { const id = n.create('T', 'B'); n.markRead(id); const before = n.getUnreadCount(); n.delete(id); expect(n.getUnreadCount()).toBe(before); });
  });

  describe('clear', () => {
    it('should clear all notifications', () => { n.create('T1', 'B1'); n.create('T2', 'B2'); n.clear(); expect(n.getAll().length).toBe(0); });
    it('should reset unread count', () => { n.create('T', 'B'); n.clear(); expect(n.getUnreadCount()).toBe(0); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await n.shutdown(); await n.initialize(); expect(n.initialized).toBe(true); });
    it('should handle double init', async () => { await n.initialize(); expect(n.initialized).toBe(true); });
    it('should handle many notifications', () => { for (let i = 0; i < 100; i++) n.create(`T${i}`, `B${i}`); expect(n.getAll().length).toBe(100); });
  });
});
