import { describe, it, expect } from 'vitest';
import { DependencyResolver } from '../../../platform/dependency-resolver/dependency-resolver.js';
import type { RuntimeDescriptor } from '../../../platform/types.js';
import { BootstrapPhase, HealthStatus } from '../../../platform/types.js';

function makeRT(id: string, deps: string[] = []): RuntimeDescriptor {
  return Object.freeze({
    id, name: id, version: '1.0.0', description: '', dependencies: deps,
    phase: BootstrapPhase.Discovery, health: HealthStatus.Unknown,
    initializedAt: null, activatedAt: null, instance: null,
  });
}

describe('DependencyResolver', () => {
  const resolver = new DependencyResolver();

  it('resolves single node', () => {
    const graph = resolver.resolve([makeRT('a')]);
    expect(graph.resolvedOrder).toEqual(['a']);
    expect(graph.hasCycle).toBe(false);
  });
  it('resolves two independent nodes', () => {
    const g = resolver.resolve([makeRT('a'), makeRT('b')]);
    expect(g.resolvedOrder).toHaveLength(2);
    expect(g.hasCycle).toBe(false);
  });
  it('resolves a -> b dependency', () => {
    const g = resolver.resolve([makeRT('a', ['b']), makeRT('b')]);
    expect(g.resolvedOrder.indexOf('b')).toBeLessThan(g.resolvedOrder.indexOf('a'));
  });
  it('resolves chain a -> b -> c', () => {
    const g = resolver.resolve([makeRT('a', ['b']), makeRT('b', ['c']), makeRT('c')]);
    const idx = (id: string) => g.resolvedOrder.indexOf(id);
    expect(idx('c')).toBeLessThan(idx('b'));
    expect(idx('b')).toBeLessThan(idx('a'));
  });
  it('resolves diamond: a->b, a->c, b->d, c->d', () => {
    const g = resolver.resolve([
      makeRT('a', ['b', 'c']), makeRT('b', ['d']), makeRT('c', ['d']), makeRT('d'),
    ]);
    expect(g.hasCycle).toBe(false);
    expect(g.resolvedOrder).toHaveLength(4);
  });
  it('detects direct cycle a -> b -> a', () => {
    expect(() => resolver.resolve([makeRT('a', ['b']), makeRT('b', ['a'])])).toThrow();
  });
  it('detects self-cycle', () => {
    expect(() => resolver.resolve([makeRT('a', ['a'])])).toThrow();
  });
  it('detects 3-node cycle a -> b -> c -> a', () => {
    expect(() => resolver.resolve([
      makeRT('a', ['b']), makeRT('b', ['c']), makeRT('c', ['a']),
    ])).toThrow();
  });
  it('ignores unknown dependencies', () => {
    const g = resolver.resolve([makeRT('a', ['unknown'])]);
    expect(g.edges).toEqual([]);
    expect(g.resolvedOrder).toHaveLength(1);
  });
  it('returns all nodes', () => {
    const g = resolver.resolve([makeRT('a'), makeRT('b'), makeRT('c')]);
    expect(g.nodes).toHaveLength(3);
  });
  it('returns correct edges', () => {
    const g = resolver.resolve([makeRT('a', ['b']), makeRT('b')]);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].from).toBe('a');
    expect(g.edges[0].to).toBe('b');
  });
  it('cyclePath is null when no cycle', () => {
    const g = resolver.resolve([makeRT('a')]);
    expect(g.cyclePath).toBeNull();
  });
  it('checkForCycles returns null for no cycle', () => {
    expect(resolver.checkForCycles(['a', 'b'], [])).toBeNull();
  });
  it('checkForCycles detects cycle', () => {
    const result = resolver.checkForCycles(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]);
    expect(result).not.toBeNull();
  });
  it('handles 50 nodes with no cycles', () => {
    const rts: RuntimeDescriptor[] = [];
    for (let i = 0; i < 50; i++) rts.push(makeRT(`rt-${i}`, i > 0 ? [`rt-${i - 1}`] : []));
    const g = resolver.resolve(rts);
    expect(g.hasCycle).toBe(false);
    expect(g.resolvedOrder).toHaveLength(50);
  });
});
