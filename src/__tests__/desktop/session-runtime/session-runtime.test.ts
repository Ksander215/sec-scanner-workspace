import { describe, it, expect, beforeEach } from 'vitest';
import { SessionRuntime } from '../../../desktop/session-runtime/session-runtime.js';
import type { SessionId } from '../../../desktop/session-runtime/types.js';
import { SessionNotFoundError } from '../../../desktop/session-runtime/errors.js';

describe('SessionRuntime', () => {
  let sr: SessionRuntime;
  beforeEach(async () => { sr = new SessionRuntime(); await sr.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(sr.name).toBe('SessionRuntime'); });
    it('should initialize', () => { expect(sr.initialized).toBe(true); });
    it('should start', async () => { await sr.start(); });
    it('should stop', async () => { await sr.stop(); });
    it('should shutdown', async () => { await sr.shutdown(); expect(sr.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof sr.initialize).toBe('function'); });
  });

  describe('create', () => {
    it('should create session', () => { const s = sr.create({ userId: 'user-1' }); expect(s.userId).toBe('user-1'); });
    it('should generate id', () => { const s = sr.create({ userId: 'u1' }); expect(s.id).toBeTruthy(); });
    it('should set default identitySnapshot', () => { const s = sr.create({ userId: 'u1' }); expect(Object.keys(s.identitySnapshot).length).toBe(0); });
    it('should set custom identitySnapshot', () => { const s = sr.create({ userId: 'u1', identitySnapshot: { name: 'Alice' } }); expect(s.identitySnapshot.name).toBe('Alice'); });
    it('should set default metadata', () => { const s = sr.create({ userId: 'u1' }); expect(Object.keys(s.metadata).length).toBe(0); });
    it('should set timestamps', () => { const s = sr.create({ userId: 'u1' }); expect(s.createdAt).toBeTruthy(); expect(s.updatedAt).toBeTruthy(); });
    it('should generate unique ids', () => { const s1 = sr.create({ userId: 'u1' }); const s2 = sr.create({ userId: 'u1' }); expect(s1.id).not.toBe(s2.id); });
    it('should increment count', () => { sr.create({ userId: 'u1' }); sr.create({ userId: 'u2' }); expect(sr.count).toBe(2); });
  });

  describe('getById', () => {
    it('should get by id', () => { const s = sr.create({ userId: 'u1' }); expect(sr.getById(s.id).userId).toBe('u1'); });
    it('should throw on missing', () => { expect(() => sr.getById('bad' as SessionId)).toThrow(SessionNotFoundError); });
  });

  describe('getAll', () => {
    it('should return all', () => { sr.create({ userId: 'u1' }); sr.create({ userId: 'u2' }); expect(sr.getAll().length).toBe(2); });
    it('should return empty initially', () => { expect(sr.getAll().length).toBe(0); });
  });

  describe('delete', () => {
    it('should delete session', () => { const s = sr.create({ userId: 'u1' }); sr.delete(s.id); expect(sr.count).toBe(0); });
    it('should throw on missing', () => { expect(() => sr.delete('bad' as SessionId)).toThrow(SessionNotFoundError); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await sr.shutdown(); await sr.initialize(); expect(sr.initialized).toBe(true); });
    it('should handle double init', async () => { await sr.initialize(); expect(sr.initialized).toBe(true); });
    it('should handle many sessions', () => { for (let i = 0; i < 100; i++) sr.create({ userId: `u${i}` }); expect(sr.count).toBe(100); });
    it('should handle complex identity snapshot', () => { const s = sr.create({ userId: 'u1', identitySnapshot: { name: 'Alice', roles: ['admin'], prefs: { theme: 'dark' } } }); expect(sr.getById(s.id).identitySnapshot.roles).toEqual(['admin']); });
  });
});
