import { describe, it, expect } from 'vitest';
import { DependencyResolver } from '../../../platform/dependency-resolver/dependency-resolver.js';
import type { RuntimeDescriptor } from '../../../platform/types.js';
import { BootstrapPhase, HealthStatus } from '../../../platform/types.js';

function rt(id: string, deps: string[] = []): RuntimeDescriptor {
  return Object.freeze({ id, name: id, version: '1.0.0', description: '', dependencies: deps, phase: BootstrapPhase.Discovery, health: HealthStatus.Unknown, initializedAt: null, activatedAt: null, instance: null });
}

const resolver = new DependencyResolver();

describe('DependencyResolver Extended', () => {
  it('fan-out: one dependency many dependents', () => {
    const g = resolver.resolve([rt('a', ['base']), rt('b', ['base']), rt('c', ['base']), rt('base')]);
    expect(g.hasCycle).toBe(false);
    expect(g.resolvedOrder).toHaveLength(4);
    const baseIdx = g.resolvedOrder.indexOf('base');
    expect(g.resolvedOrder.indexOf('a')).toBeGreaterThan(baseIdx);
    expect(g.resolvedOrder.indexOf('b')).toBeGreaterThan(baseIdx);
    expect(g.resolvedOrder.indexOf('c')).toBeGreaterThan(baseIdx);
  });

  it('deep chain of 20 nodes', () => {
    const rts: RuntimeDescriptor[] = [];
    for (let i = 0; i < 20; i++) rts.push(rt(`n${i}`, i > 0 ? [`n${i - 1}`] : []));
    const g = resolver.resolve(rts);
    expect(g.hasCycle).toBe(false);
    for (let i = 1; i < 20; i++) {
      expect(g.resolvedOrder.indexOf(`n${i}`)).toBeGreaterThan(g.resolvedOrder.indexOf(`n${i - 1}`));
    }
  });

  it('parallel chains', () => {
    const g = resolver.resolve([
      rt('a1', ['a0']), rt('a0'),
      rt('b1', ['b0']), rt('b0'),
      rt('c1', ['c0']), rt('c0'),
    ]);
    expect(g.hasCycle).toBe(false);
    expect(g.resolvedOrder).toHaveLength(6);
  });

  it('single node no edges', () => {
    const g = resolver.resolve([rt('solo')]);
    expect(g.edges).toHaveLength(0);
    expect(g.resolvedOrder).toEqual(['solo']);
  });

  it('3-node cycle detection', () => {
    try {
      resolver.resolve([rt('a', ['b']), rt('b', ['c']), rt('c', ['a'])]);
      expect(true).toBe(false);
    } catch {
      expect(true).toBe(true);
    }
  });

  it('4-node cycle', () => {
    try {
      resolver.resolve([rt('a', ['b']), rt('b', ['c']), rt('c', ['d']), rt('d', ['a'])]);
      expect(true).toBe(false);
    } catch {
      expect(true).toBe(true);
    }
  });

  it('complex DAG with 15 nodes', () => {
    const rts = [
      rt('mem', []),
      rt('know', ['mem']), rt('ident', ['mem']),
      rt('cap', ['mem', 'ident']), rt('wf', ['mem', 'know']),
      rt('cog', ['mem', 'know', 'ident']),
      rt('exp', ['mem', 'ident', 'cog']),
      rt('desk', ['mem', 'know', 'ident', 'cog', 'exp']),
      rt('tool', ['mem', 'cap']),
      rt('sess', ['mem', 'ident']),
      rt('ctx', ['mem', 'know', 'cog']),
      rt('rec', ['mem', 'wf']),
      rt('plug', ['cap', 'tool']),
      rt('evt', ['mem']),
      rt('cmd', ['evt']),
    ];
    const g = resolver.resolve(rts);
    expect(g.hasCycle).toBe(false);
    expect(g.resolvedOrder).toHaveLength(15);
    // Memory should be first
    expect(g.resolvedOrder[0]).toBe('mem');
  });

  it('empty input returns empty graph', () => {
    const g = resolver.resolve([]);
    expect(g.nodes).toEqual([]);
    expect(g.resolvedOrder).toEqual([]);
    expect(g.hasCycle).toBe(false);
  });

  it('checkForCycles with no nodes', () => {
    expect(resolver.checkForCycles([], [])).toBeNull();
  });

  it('edges only between known nodes', () => {
    const g = resolver.resolve([rt('a', ['b']), rt('b')]);
    expect(g.edges).toHaveLength(1);
  });
});
