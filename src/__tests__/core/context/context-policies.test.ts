import { describe, it, expect } from 'vitest';
import { ContextPolicyManager, DEFAULT_CONTEXT_POLICY } from '../../../core/context/policies.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import type { UnifiedContext, ContextEntry } from '../../../core/context/types.js';

function makeContext(entries: Map<string, ContextEntry>): UnifiedContext {
  return {
    contextId: 'test' as any, version: 'v1' as any,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    entries, metadata: {}, sizeBytes: 0,
  };
}

function makeEntry(key: string, overrides?: Partial<ContextEntry>): ContextEntry {
  return {
    key, value: 'v', source: ContextSource.Session, priority: ContextPriority.Normal,
    createdAt: new Date().toISOString(), ...overrides,
  };
}

describe('ContextPolicyManager', () => {
  it('default policy has maxContextSize', () => {
    expect(DEFAULT_CONTEXT_POLICY.maxContextSizeBytes).toBeDefined();
    expect(DEFAULT_CONTEXT_POLICY.maxContextSizeBytes).toBeGreaterThan(0);
  });

  it('canAddEntry returns ok for under-limit', () => {
    const mgr = new ContextPolicyManager();
    const ctx = makeContext(new Map());
    const entry = makeEntry('new');
    const result = mgr.canAddEntry(ctx, entry);
    expect(result.ok).toBe(true);
  });

  it('resolveMergeConflict returns higher priority', () => {
    const mgr = new ContextPolicyManager();
    const existing = makeEntry('k', { priority: ContextPriority.Low });
    const incoming = makeEntry('k', { priority: ContextPriority.High });
    const resolved = mgr.resolveMergeConflict(existing, incoming);
    expect(resolved.value).toBe(incoming.value);
  });

  it('checkExpiration returns true for expired entries', () => {
    const mgr = new ContextPolicyManager();
    const expired = makeEntry('exp', { expiresAt: '2020-01-01T00:00:00.000Z' });
    expect(mgr.checkExpiration(expired)).toBe(true);
  });

  it('checkExpiration returns false for valid entries', () => {
    const mgr = new ContextPolicyManager();
    const valid = makeEntry('valid', { expiresAt: '2030-01-01T00:00:00.000Z' });
    expect(mgr.checkExpiration(valid)).toBe(false);
  });

  it('checkExpiration returns false for entries without expiresAt', () => {
    const mgr = new ContextPolicyManager();
    const noExpiry = makeEntry('no-exp');
    expect(mgr.checkExpiration(noExpiry)).toBe(false);
  });

  it('shouldEvict returns false for under-limit contexts', () => {
    const mgr = new ContextPolicyManager({ ...DEFAULT_CONTEXT_POLICY, maxContextSize: 100 });
    const ctx = makeContext(new Map([['a', makeEntry('a')]]));
    expect(mgr.shouldEvict(ctx)).toBe(false);
  });
});
