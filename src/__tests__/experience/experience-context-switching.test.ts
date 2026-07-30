/**
 * Tests for ContextSwitching (Subsystem 8)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextSwitching } from '../../core/experience/context-switching.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import {
  DefaultExperienceRuntimeConfig,
  type ContextId,
  type ExperienceRuntimeConfig,
} from '../../core/experience/types.js';
import { ContextDetectionError } from '../../core/experience/errors.js';

describe('ContextSwitching', () => {
  let ctx: ContextSwitching;
  let eventBus: InProcessEventBus;
  const userId = crypto.randomUUID();

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    ctx = new ContextSwitching(DefaultExperienceRuntimeConfig, eventBus);
  });

  // ─── Constructor ──────────────────────────────────────────

  describe('constructor', () => {
    it('creates instance with config and event bus', () => {
      const c = new ContextSwitching(DefaultExperienceRuntimeConfig, eventBus);
      expect(c).toBeInstanceOf(ContextSwitching);
    });

    it('creates instance without event bus', () => {
      const c = new ContextSwitching(DefaultExperienceRuntimeConfig);
      expect(c).toBeInstanceOf(ContextSwitching);
    });

    it('creates instance with custom config', () => {
      const config = { ...DefaultExperienceRuntimeConfig, learningThreshold: 0.5 };
      const c = new ContextSwitching(config, eventBus);
      expect(c).toBeInstanceOf(ContextSwitching);
    });
  });

  // ─── defineContext ────────────────────────────────────────

  describe('defineContext', () => {
    it('creates a context with given name', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work context', ['editor', 'git']);
      expect(c.name).toBe('Work');
    });

    it('creates a context with given description', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work context', ['editor']);
      expect(c.description).toBe('Work context');
    });

    it('creates a context with given indicators', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work context', ['editor', 'git', 'terminal']);
      expect(c.indicators).toEqual(['editor', 'git', 'terminal']);
    });

    it('creates a context with userIdHash', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work context', ['editor']);
      expect(c.userIdHash).toBe(userId);
    });

    it('creates a context with unique id', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      expect(c1.id).not.toBe(c2.id);
    });

    it('initializes confidence to 0', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      expect(c.confidence).toBe(0);
    });

    it('initializes isActive to false', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      expect(c.isActive).toBe(false);
    });

    it('stores context for retrieval', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const all = ctx.getAllContexts(userId);
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(c.id);
    });

    it('creates multiple contexts for same user', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.defineContext(userId, 'Study', 'Study', ['books']);
      expect(ctx.getAllContexts(userId)).toHaveLength(3);
    });

    it('creates contexts for different users independently', () => {
      const other = crypto.randomUUID();
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      ctx.defineContext(other, 'Home', 'Home', ['social']);
      expect(ctx.getAllContexts(userId)).toHaveLength(1);
      expect(ctx.getAllContexts(other)).toHaveLength(1);
    });

    it('creates context with empty indicators', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', []);
      expect(c.indicators).toEqual([]);
    });

    it('returns readonly-style indicators array', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['a']);
      // TypeScript type is readonly, runtime is a new array
      expect(Array.isArray(c.indicators)).toBe(true);
    });

    it('context has undefined activatedAt initially', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      expect(c.activatedAt).toBeUndefined();
    });

    it('context has undefined deactivatedAt initially', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      expect(c.deactivatedAt).toBeUndefined();
    });
  });

  // ─── detectContext ──────────────────────────────────────

  describe('detectContext', () => {
    it('returns null when no contexts defined', () => {
      expect(ctx.detectContext(userId, { foo: 'bar' })).toBeNull();
    });

    it('returns null when no signals match', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor', 'git']);
      expect(ctx.detectContext(userId, { social: true })).toBeNull();
    });

    it('returns null for unknown user', () => {
      expect(ctx.detectContext(crypto.randomUUID(), { editor: true })).toBeNull();
    });

    it('matches when signals contain indicator keys', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor', 'git']);
      // Need to exceed learning threshold (0.7)
      for (let i = 0; i < 5; i++) {
        ctx.detectContext(userId, { editor: true, git: true });
      }
      const detected = ctx.detectContext(userId, { editor: true, git: true });
      expect(detected).not.toBeNull();
      expect(detected!.name).toBe('Work');
    });

    it('ignores empty string values in signals', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      for (let i = 0; i < 5; i++) {
        ctx.detectContext(userId, { editor: '' });
      }
      const detected = ctx.detectContext(userId, { editor: '' });
      // Empty string should not count as a match
      expect(detected).toBeNull();
    });

    it('ignores null values in signals', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      for (let i = 0; i < 5; i++) {
        ctx.detectContext(userId, { editor: null });
      }
      const detected = ctx.detectContext(userId, { editor: null });
      expect(detected).toBeNull();
    });

    it('returns context with highest score above threshold', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor', 'git', 'terminal']);
      ctx.defineContext(userId, 'Home', 'Home', ['social', 'games']);
      for (let i = 0; i < 5; i++) {
        ctx.detectContext(userId, { editor: true, git: true, terminal: true });
      }
      const detected = ctx.detectContext(userId, { editor: true, git: true, terminal: true });
      expect(detected!.name).toBe('Work');
    });

    it('uses sliding window for stable detection', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      // Feed work signals then home signals
      for (let i = 0; i < 10; i++) {
        ctx.detectContext(userId, { editor: true });
      }
      for (let i = 0; i < 10; i++) {
        ctx.detectContext(userId, { social: true });
      }
      // Window should now be all social, so work should not match
      const detected = ctx.detectContext(userId, { social: true });
      expect(detected).toBeNull();
    });

    it('skips contexts with no indicators', () => {
      ctx.defineContext(userId, 'Empty', 'Empty', []);
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      for (let i = 0; i < 5; i++) {
        ctx.detectContext(userId, { editor: true });
      }
      const detected = ctx.detectContext(userId, { editor: true });
      expect(detected).not.toBeNull();
      expect(detected!.name).toBe('Work');
    });

    it('truthy non-string values count as matches', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['active', 'focused']);
      for (let i = 0; i < 5; i++) {
        ctx.detectContext(userId, { active: true, focused: 1 });
      }
      const detected = ctx.detectContext(userId, { active: true, focused: 1 });
      expect(detected).not.toBeNull();
    });

    it('returns null when score is below threshold', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor', 'git', 'terminal']);
      // Only one signal present - low score
      const detected = ctx.detectContext(userId, { editor: true });
      expect(detected).toBeNull();
    });

    it('undefined values in signals do not count as matches', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      for (let i = 0; i < 5; i++) {
        ctx.detectContext(userId, { editor: undefined });
      }
      const detected = ctx.detectContext(userId, { editor: undefined });
      expect(detected).toBeNull();
    });

    it('respects config contextDetectionWindowSize', () => {
      const config: ExperienceRuntimeConfig = {
        ...DefaultExperienceRuntimeConfig,
        contextDetectionWindowSize: 3,
      };
      const cCtx = new ContextSwitching(config, eventBus);
      cCtx.defineContext(userId, 'Work', 'Work', ['editor']);
      // Fill beyond window size
      for (let i = 0; i < 10; i++) {
        cCtx.detectContext(userId, { editor: true });
      }
      // Now switch to non-matching signals
      for (let i = 0; i < 10; i++) {
        cCtx.detectContext(userId, { social: true });
      }
      const detected = cCtx.detectContext(userId, { social: true });
      expect(detected).toBeNull();
    });

    it('does not modify the input signals object', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const signals: Record<string, unknown> = { editor: true };
      const copy = { ...signals };
      ctx.detectContext(userId, signals);
      expect(signals).toEqual(copy);
    });
  });

  // ─── getActiveContext ────────────────────────────────────

  describe('getActiveContext', () => {
    it('returns null when no context is active', () => {
      expect(ctx.getActiveContext(userId)).toBeNull();
    });

    it('returns the active context after switch', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      ctx.switchContext(userId, c.id);
      const active = ctx.getActiveContext(userId);
      expect(active).not.toBeNull();
      expect(active!.id).toBe(c.id);
    });

    it('returns null for unknown user', () => {
      expect(ctx.getActiveContext(crypto.randomUUID())).toBeNull();
    });

    it('returns updated context after multiple switches', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);
      ctx.switchContext(userId, c2.id);
      const active = ctx.getActiveContext(userId);
      expect(active!.id).toBe(c2.id);
    });
  });

  // ─── switchContext ──────────────────────────────────────

  describe('switchContext', () => {
    it('activates the target context', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const activated = ctx.switchContext(userId, c.id);
      expect(activated.isActive).toBe(true);
    });

    it('sets confidence to 1.0', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const activated = ctx.switchContext(userId, c.id);
      expect(activated.confidence).toBe(1.0);
    });

    it('sets activatedAt timestamp', () => {
      const before = new Date().toISOString();
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const activated = ctx.switchContext(userId, c.id);
      const after = new Date().toISOString();
      expect(activated.activatedAt! >= before).toBe(true);
      expect(activated.activatedAt! <= after).toBe(true);
    });

    it('deactivates previous context', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);
      ctx.switchContext(userId, c2.id);
      expect(ctx.getAllContexts(userId).find(c => c.id === c1.id)!.isActive).toBe(false);
    });

    it('sets deactivatedAt on previous context', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);
      const before = new Date().toISOString();
      ctx.switchContext(userId, c2.id);
      const after = new Date().toISOString();
      const prev = ctx.getAllContexts(userId).find(c => c.id === c1.id)!;
      expect(prev.deactivatedAt! >= before).toBe(true);
      expect(prev.deactivatedAt! <= after).toBe(true);
    });

    it('throws for non-existent context', () => {
      expect(() => ctx.switchContext(userId, crypto.randomUUID() as ContextId)).toThrow(ContextDetectionError);
    });

    it('throws when context belongs to different user', () => {
      const other = crypto.randomUUID();
      const c = ctx.defineContext(other, 'Work', 'Work', ['editor']);
      expect(() => ctx.switchContext(userId, c.id)).toThrow(ContextDetectionError);
    });

    it('emits ContextChanged event', async () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const handler = vi.fn();
      eventBus.subscribe('ContextChanged', handler);
      ctx.switchContext(userId, c.id);
      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
      const envelope = handler.mock.calls[0][0];
      expect(envelope.payload.contextName).toBe('Work');
      expect(envelope.payload.userIdHash).toBe(userId);
      expect(envelope.payload.confidence).toBe(1.0);
    });

    it('includes fromContext in event when switching from another', async () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);
      const handler = vi.fn();
      eventBus.subscribe('ContextChanged', handler);
      ctx.switchContext(userId, c2.id);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].payload.fromContext).toBe('Work');
    });

    it('fromContext is undefined on first switch', async () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const handler = vi.fn();
      eventBus.subscribe('ContextChanged', handler);
      ctx.switchContext(userId, c.id);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].payload.fromContext).toBeUndefined();
    });

    it('does not emit event without event bus', () => {
      const noBus = new ContextSwitching(DefaultExperienceRuntimeConfig);
      const c = noBus.defineContext(userId, 'Work', 'Work', ['editor']);
      const result = noBus.switchContext(userId, c.id);
      expect(result.isActive).toBe(true);
    });

    it('ContextDetectionError has code EXP-CTX-001', () => {
      try {
        ctx.switchContext(userId, crypto.randomUUID() as ContextId);
      } catch (e) {
        expect((e as ContextDetectionError).code).toBe('EXP-CTX-001');
      }
    });

    it('switching to same active context works without error', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      ctx.switchContext(userId, c.id);
      const result = ctx.switchContext(userId, c.id);
      expect(result.isActive).toBe(true);
    });

    it('preserves other context fields on activation', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work context description', ['editor', 'git']);
      ctx.switchContext(userId, c.id);
      const activated = ctx.getActiveContext(userId)!;
      expect(activated.name).toBe('Work');
      expect(activated.description).toBe('Work context description');
      expect(activated.indicators).toEqual(['editor', 'git']);
      expect(activated.userIdHash).toBe(userId);
    });
  });

  // ─── getAllContexts ──────────────────────────────────────

  describe('getAllContexts', () => {
    it('returns all contexts for a user', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      ctx.defineContext(userId, 'Home', 'Home', ['social']);
      const all = ctx.getAllContexts(userId);
      expect(all).toHaveLength(2);
    });

    it('returns empty for unknown user', () => {
      expect(ctx.getAllContexts(crypto.randomUUID())).toEqual([]);
    });

    it('does not mix users', () => {
      const other = crypto.randomUUID();
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      ctx.defineContext(other, 'Home', 'Home', ['social']);
      expect(ctx.getAllContexts(userId)).toHaveLength(1);
      expect(ctx.getAllContexts(other)).toHaveLength(1);
    });

    it('returns contexts with current state', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      ctx.switchContext(userId, c.id);
      const all = ctx.getAllContexts(userId);
      const active = all.find(x => x.id === c.id);
      expect(active!.isActive).toBe(true);
    });

    it('returns array of context objects', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const all = ctx.getAllContexts(userId);
      expect(Array.isArray(all)).toBe(true);
      expect(all[0]).toHaveProperty('id');
      expect(all[0]).toHaveProperty('name');
      expect(all[0]).toHaveProperty('indicators');
    });

    it('preserves indicator arrays', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['a', 'b', 'c']);
      const all = ctx.getAllContexts(userId);
      expect(all[0].indicators).toEqual(['a', 'b', 'c']);
    });
  });

  // ─── getContextSwitchHistory ────────────────────────────

  describe('getContextSwitchHistory', () => {
    it('returns empty array for user with no switches', () => {
      expect(ctx.getContextSwitchHistory(userId)).toEqual([]);
    });

    it('records a switch', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);
      ctx.switchContext(userId, c2.id);
      const history = ctx.getContextSwitchHistory(userId);
      expect(history).toHaveLength(1);
      expect(history[0].from).toBe(c1.id);
      expect(history[0].to).toBe(c2.id);
    });

    it('records multiple switches in order', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      const c3 = ctx.defineContext(userId, 'Study', 'Study', ['books']);
      ctx.switchContext(userId, c1.id);
      ctx.switchContext(userId, c2.id);
      ctx.switchContext(userId, c3.id);
      const history = ctx.getContextSwitchHistory(userId);
      expect(history).toHaveLength(2);
      expect(history[0].to).toBe(c2.id);
      expect(history[1].to).toBe(c3.id);
    });

    it('records timestamps', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      const before = new Date().toISOString();
      ctx.switchContext(userId, c1.id);
      ctx.switchContext(userId, c2.id);
      const after = new Date().toISOString();
      const history = ctx.getContextSwitchHistory(userId);
      expect(history[0].timestamp >= before).toBe(true);
      expect(history[0].timestamp <= after).toBe(true);
    });

    it('returns empty for unknown user', () => {
      expect(ctx.getContextSwitchHistory(crypto.randomUUID())).toEqual([]);
    });

    it('does not record initial switch (no previous context)', () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      ctx.switchContext(userId, c.id);
      expect(ctx.getContextSwitchHistory(userId)).toHaveLength(0);
    });

    it('returns readonly-style array', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);
      ctx.switchContext(userId, c2.id);
      const history = ctx.getContextSwitchHistory(userId);
      expect(Array.isArray(history)).toBe(true);
    });

    it('preserves from/to context IDs correctly', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);
      ctx.switchContext(userId, c2.id);
      const history = ctx.getContextSwitchHistory(userId);
      expect(typeof history[0].from).toBe('string');
      expect(typeof history[0].to).toBe('string');
    });
  });

  // ─── Event emission ─────────────────────────────────────

  describe('event emission', () => {
    it('emits ContextChanged with correct classification', async () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const handler = vi.fn();
      eventBus.subscribe('ContextChanged', handler);
      ctx.switchContext(userId, c.id);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].classification).toBe('state-change');
    });

    it('emits with contextId in payload', async () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const handler = vi.fn();
      eventBus.subscribe('ContextChanged', handler);
      ctx.switchContext(userId, c.id);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].payload.contextId).toBe(c.id);
    });

    it('emits with eventType ContextChanged', async () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const handler = vi.fn();
      eventBus.subscribe('ContextChanged', handler);
      ctx.switchContext(userId, c.id);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].eventType).toBe('ContextChanged');
    });

    it('event includes changedAt timestamp', async () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const handler = vi.fn();
      eventBus.subscribe('ContextChanged', handler);
      ctx.switchContext(userId, c.id);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].payload.changedAt).toBeDefined();
    });

    it('does not break when event handler throws', async () => {
      const c = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const badHandler = vi.fn(() => { throw new Error('handler error'); });
      eventBus.subscribe('ContextChanged', badHandler);
      // Should not throw — subscriber isolation
      ctx.switchContext(userId, c.id);
      await new Promise(r => setTimeout(r, 10));
      expect(badHandler).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Error hierarchy ──────────────────────────────────────

  describe('error hierarchy', () => {
    it('ContextDetectionError extends Error', () => {
      const err = new ContextDetectionError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ContextDetectionError);
      expect(err.name).toBe('ContextDetectionError');
    });

    it('ContextDetectionError includes details', () => {
      const err = new ContextDetectionError('test', { contextId: 'c1' });
      expect(err.details).toEqual({ contextId: 'c1' });
    });
  });

  // ─── Edge cases ────────────────────────────────────────────

  describe('edge cases', () => {
    it('detectContext with empty signals object', () => {
      ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      expect(ctx.detectContext(userId, {})).toBeNull();
    });

    it('defining many contexts does not break detection', () => {
      for (let i = 0; i < 20; i++) {
        ctx.defineContext(userId, `Ctx${i}`, `Context ${i}`, [`indicator${i}`]);
      }
      // Feed signals matching first context
      for (let j = 0; j < 5; j++) {
        ctx.detectContext(userId, { indicator0: true });
      }
      const detected = ctx.detectContext(userId, { indicator0: true });
      expect(detected).not.toBeNull();
      expect(detected!.name).toBe('Ctx0');
    });

    it('switching back and forth records all history', () => {
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(userId, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);   // Initial switch, no previous → no record
      ctx.switchContext(userId, c2.id);   // c1→c2
      ctx.switchContext(userId, c1.id);   // c2→c1
      ctx.switchContext(userId, c2.id);   // c1→c2
      const history = ctx.getContextSwitchHistory(userId);
      // Initial switch is not recorded (no previous context)
      expect(history).toHaveLength(3);
      expect(history[0].to).toBe(c2.id);
      expect(history[1].to).toBe(c1.id);
      expect(history[2].to).toBe(c2.id);
    });

    it('multi-user context isolation', () => {
      const other = crypto.randomUUID();
      const c1 = ctx.defineContext(userId, 'Work', 'Work', ['editor']);
      const c2 = ctx.defineContext(other, 'Home', 'Home', ['social']);
      ctx.switchContext(userId, c1.id);
      ctx.switchContext(other, c2.id);
      expect(ctx.getActiveContext(userId)!.id).toBe(c1.id);
      expect(ctx.getActiveContext(other)!.id).toBe(c2.id);
    });
  });
});
