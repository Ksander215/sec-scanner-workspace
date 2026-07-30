import { describe, it, expect, beforeEach } from 'vitest';
import { ThreadSafeRuntimeRegistry } from '../../../platform/runtime-registry/runtime-registry.js';
import type { RuntimeDescriptor } from '../../../platform/types.js';
import { BootstrapPhase, HealthStatus } from '../../../platform/types.js';

function makeDescriptor(overrides: Partial<RuntimeDescriptor> = {}): RuntimeDescriptor {
  return Object.freeze({
    id: overrides.id ?? 'rt-1',
    name: overrides.name ?? 'Runtime1',
    version: '1.0.0',
    description: 'Test runtime',
    dependencies: [],
    phase: BootstrapPhase.Discovery,
    health: HealthStatus.Unknown,
    initializedAt: null,
    activatedAt: null,
    instance: null,
    ...overrides,
  });
}

describe('ThreadSafeRuntimeRegistry', () => {
  let reg: ThreadSafeRuntimeRegistry;
  beforeEach(() => { reg = new ThreadSafeRuntimeRegistry(); });

  it('registers a descriptor', () => {
    const d = makeDescriptor();
    reg.register(d);
    expect(reg.has('rt-1')).toBe(true);
  });
  it('gets descriptor by id', () => {
    const d = makeDescriptor();
    reg.register(d);
    expect(reg.get('rt-1')?.name).toBe('Runtime1');
  });
  it('returns undefined for unknown id', () => {
    expect(reg.get('unknown')).toBeUndefined();
  });
  it('gets descriptor by name', () => {
    reg.register(makeDescriptor());
    expect(reg.getByName('Runtime1')?.id).toBe('rt-1');
  });
  it('returns undefined for unknown name', () => {
    expect(reg.getByName('Nope')).toBeUndefined();
  });
  it('getAll returns all registered', () => {
    reg.register(makeDescriptor({ id: 'a' }));
    reg.register(makeDescriptor({ id: 'b' }));
    expect(reg.getAll().length).toBe(2);
  });
  it('getAll returns empty for empty registry', () => {
    expect(reg.getAll()).toEqual([]);
  });
  it('getByPhase filters correctly', () => {
    reg.register(makeDescriptor({ id: 'a', phase: BootstrapPhase.Initialization }));
    reg.register(makeDescriptor({ id: 'b', phase: BootstrapPhase.Ready }));
    expect(reg.getByPhase(BootstrapPhase.Initialization).length).toBe(1);
  });
  it('count returns 0 for empty', () => {
    expect(reg.count()).toBe(0);
  });
  it('count increments on register', () => {
    reg.register(makeDescriptor({ id: 'a' }));
    reg.register(makeDescriptor({ id: 'b' }));
    expect(reg.count()).toBe(2);
  });
  it('throws on duplicate id', () => {
    reg.register(makeDescriptor({ id: 'a' }));
    expect(() => reg.register(makeDescriptor({ id: 'a' }))).toThrow();
  });
  it('allows different ids with same name', () => {
    reg.register(makeDescriptor({ id: 'a', name: 'Same' }));
    reg.register(makeDescriptor({ id: 'b', name: 'Same2' }));
    expect(reg.count()).toBe(2);
  });
  it('stores descriptor immutably reference', () => {
    const d = makeDescriptor();
    reg.register(d);
    expect(reg.get('rt-1')).toBe(d);
  });
  it('handles many registrations', () => {
    for (let i = 0; i < 100; i++) reg.register(makeDescriptor({ id: `rt-${i}` }));
    expect(reg.count()).toBe(100);
  });
  it('getByPhase returns empty for non-matching phase', () => {
    reg.register(makeDescriptor());
    expect(reg.getByPhase(BootstrapPhase.Activation)).toEqual([]);
  });
  it('has returns false for unregistered', () => {
    expect(reg.has('nope')).toBe(false);
  });
});
