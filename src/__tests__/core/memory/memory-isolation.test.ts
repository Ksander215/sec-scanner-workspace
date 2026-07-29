/**
 * MemoryIsolationGuard Tests
 */
import { describe, it, expect } from 'vitest';
import { MemoryIsolationGuard, DEFAULT_ISOLATION_RULES } from '../../../core/memory/memory-isolation.js';

describe('MemoryIsolationGuard', () => {
  const guard = new MemoryIsolationGuard();

  it('working memory: no session required', () => {
    const result = guard.validateStore('working', undefined);
    expect(result.ok, 'working memory should not require sessionId').toBe(true);
  });
  it('session memory: session required — fails without sessionId', () => {
    const result = guard.validateStore('session', undefined);
    expect(!result.ok, 'session memory should require sessionId').toBe(true);
    expect(result.error).not.toBeNull();
    expect((result.error as any).code).toBe('MEMORY_SESSION_ID_REQUIRED');
  });
  it('persistent memory: no session required', () => {
    const result = guard.validateStore('persistent', undefined);
    expect(result.ok, 'persistent memory should not require sessionId').toBe(true);
  });
  it('persistent memory: cross-session allowed', () => {
    const result = guard.checkAccess('persistent', 'session-b', 'session-a');
    expect(result.ok, 'persistent layer should allow cross-session access').toBe(true);
  });
  it('session memory: cross-session access denied', () => {
    const result = guard.checkAccess('session', 'session-b', 'session-a');
    expect(!result.ok, 'session layer should deny cross-session access').toBe(true);
  });
  it('session memory: no accessor session denied', () => {
    const result = guard.checkAccess('session', undefined, 'session-a');
    expect(!result.ok, 'session layer should deny access without accessor sessionId').toBe(true);
  });
  it('checkAccess returns ok for valid access (same session)', () => {
    const result = guard.checkAccess('session', 'sess-1', 'sess-1');
    expect(result.ok, 'same session should be allowed').toBe(true);
  });
  it('checkAccess returns error for violation (different sessions)', () => {
    const result = guard.checkAccess('session', 'sess-2', 'sess-1');
    expect(!result.ok).toBe(true);
    expect(result.error).not.toBeNull();
    expect((result.error as any).sessionId).toBe('sess-1');
    expect((result.error as any).accessorSessionId).toBe('sess-2');
  });
  it('checkAccess allows access when entry has no sessionId', () => {
    const result = guard.checkAccess('working', undefined, undefined);
    expect(result.ok, 'entry with no sessionId should be accessible').toBe(true);
  });
  it('validateStore returns ok for valid layer (working)', () => {
    const result = guard.validateStore('working', 'any-session');
    expect(result.ok).toBe(true);
  });
  it('validateStore returns ok for valid layer (persistent)', () => {
    const result = guard.validateStore('persistent', 'any-session');
    expect(result.ok).toBe(true);
  });
  it('validateStore returns ok for session layer with sessionId', () => {
    const result = guard.validateStore('session', 'my-session');
    expect(result.ok).toBe(true);
  });
  it('validateStore returns error when sessionId missing for session layer', () => {
    const result = guard.validateStore('session', undefined);
    expect(!result.ok).toBe(true);
    expect(result.error).not.toBeNull();
    expect((result.error as any).code).toBe('MEMORY_SESSION_ID_REQUIRED');
  });
  it('getRule returns rule for working layer', () => {
    const rule = guard.getRule('working');
    expect(rule).not.toBeNull();
    expect(rule!.sessionIdRequired).toBe(false);
    expect(rule!.crossSessionAccessAllowed).toBe(false);
  });
  it('getRule returns rule for persistent layer', () => {
    const rule = guard.getRule('persistent');
    expect(rule).not.toBeNull();
    expect(rule!.sessionIdRequired).toBe(false);
    expect(rule!.crossSessionAccessAllowed).toBe(true);
  });
});
