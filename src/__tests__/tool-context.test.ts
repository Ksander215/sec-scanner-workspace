/**
 * Tool Context Tests
 */
import { describe, it, expect } from 'vitest';
import {
  DefaultToolLogger,
  DefaultToolClock,
  FixedToolClock,
  InMemoryToolMemory,
  createToolContext,
} from '../core/tool/tool-context.js';
import { TrustZone } from '../core/types/common.js';

describe('DefaultToolLogger', () => {
  it('should log entries with correct levels', () => {
    const logger = new DefaultToolLogger('test-tool');
    logger.info('info msg', { key: 'val' });
    logger.warn('warn msg');
    logger.error('err msg');
    logger.debug('dbg msg');

    const entries = logger.getEntries();
    expect(entries).toHaveLength(4);
    expect(entries[0].level).toBe('info');
    expect(entries[0].message).toBe('info msg');
    expect(entries[0].data).toEqual({ key: 'val' });
    expect(entries[1].level).toBe('warn');
    expect(entries[2].level).toBe('error');
    expect(entries[3].level).toBe('debug');
  });

  it('should count by level', () => {
    const logger = new DefaultToolLogger('test-tool');
    logger.info('a');
    logger.info('b');
    logger.error('c');
    expect(logger.countByLevel('info')).toBe(2);
    expect(logger.countByLevel('error')).toBe(1);
    expect(logger.countByLevel('warn')).toBe(0);
  });

  it('should clear entries', () => {
    const logger = new DefaultToolLogger('test-tool');
    logger.info('msg');
    logger.clear();
    expect(logger.getEntries()).toHaveLength(0);
  });

  it('should store tool name', () => {
    const logger = new DefaultToolLogger('my-tool');
    expect(logger.toolName).toBe('my-tool');
  });
});

describe('DefaultToolClock', () => {
  it('should return current ISO timestamp', () => {
    const clock = new DefaultToolClock();
    expect(clock.now).toBeTruthy();
    expect(new Date(clock.now).getTime()).not.toBeNaN();
  });

  it('should return epoch ms', () => {
    const clock = new DefaultToolClock();
    expect(clock.epochMs).toBeGreaterThan(0);
  });
});

describe('FixedToolClock', () => {
  it('should return fixed time', () => {
    const clock = new FixedToolClock('2026-01-01T00:00:00Z', 1704067200000);
    expect(clock.now).toBe('2026-01-01T00:00:00Z');
    expect(clock.epochMs).toBe(1704067200000);
  });
});

describe('InMemoryToolMemory', () => {
  it('should store and retrieve values', () => {
    const mem = new InMemoryToolMemory('test');
    mem.set('key1', 'value1');
    expect(mem.get('key1')).toBe('value1');
  });

  it('should check has', () => {
    const mem = new InMemoryToolMemory('test');
    mem.set('key1', 'val');
    expect(mem.has('key1')).toBe(true);
    expect(mem.has('missing')).toBe(false);
  });

  it('should delete values', () => {
    const mem = new InMemoryToolMemory('test');
    mem.set('key1', 'val');
    expect(mem.delete('key1')).toBe(true);
    expect(mem.has('key1')).toBe(false);
    expect(mem.delete('nonexistent')).toBe(false);
  });

  it('should return keys', () => {
    const mem = new InMemoryToolMemory('test');
    mem.set('a', 1);
    mem.set('b', 2);
    expect(mem.keys()).toContain('a');
    expect(mem.keys()).toContain('b');
  });

  it('should clear', () => {
    const mem = new InMemoryToolMemory('test');
    mem.set('a', 1);
    mem.set('b', 2);
    mem.clear();
    expect(mem.keys()).toHaveLength(0);
  });

  it('should store tool name and scope', () => {
    const mem = new InMemoryToolMemory('my-tool', 'session');
    expect(mem.toolName).toBe('my-tool');
    expect(mem.scope).toBe('session');
  });
});

describe('createToolContext', () => {
  it('should create context with defaults', () => {
    const ctx = createToolContext({
      executionId: 'exec-1',
      toolName: 'test-tool',
      cancellationToken: { cancelled: false, onCancel: () => {}, cancel: () => {} },
      eventPublisher: {
        publish: async () => ({ eventId: '', eventType: '', classification: 'info' as const, timestamp: '', sequence: 0, aggregateId: '', aggregateType: '', version: '' }),
      },
      trustZone: TrustZone.CoreAIS,
    });

    expect(ctx.executionId).toBe('exec-1');
    expect(ctx.toolName).toBe('test-tool');
    expect(ctx.trustZone).toBe(TrustZone.CoreAIS);
    expect(ctx.logger).toBeDefined();
    expect(ctx.clock).toBeDefined();
    expect(ctx.memory).toBeDefined();
    expect(ctx.configuration).toEqual({});
  });

  it('should use custom clock and memory', () => {
    const clock = new FixedToolClock('2026-01-01T00:00:00Z');
    const memory = new InMemoryToolMemory('custom');
    const ctx = createToolContext({
      executionId: 'exec-1',
      toolName: 'test-tool',
      cancellationToken: { cancelled: false, onCancel: () => {}, cancel: () => {} },
      eventPublisher: {
        publish: async () => ({ eventId: '', eventType: '', classification: 'info' as const, timestamp: '', sequence: 0, aggregateId: '', aggregateType: '', version: '' }),
      },
      trustZone: TrustZone.PluginSandbox,
      clock,
      memory,
    });

    expect(ctx.clock.now).toBe('2026-01-01T00:00:00Z');
    expect(ctx.memory).toBe(memory);
  });
});
