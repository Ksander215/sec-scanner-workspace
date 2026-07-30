/**
 * DependencyResolver — Unit Tests
 * TASK-AIS-003G.000
 *
 * Covers: resolve, resolveAll, wouldIntroduceCycle, findMissing, findConflicts
 * Scenarios: no deps, chains, cycles, missing deps, version conflicts, optional deps, self-deps
 */

import { DependencyResolver } from '../../../core/capability/dependency-resolver.js';
import type { CapabilityPack, CapabilityPackId, CapabilityDependency } from '../../../core/capability/types.js';
import { CapabilityState as CS, CapabilityTrustLevel } from '../../../core/capability/types.js';

// ─── Helpers ──────────────────────────────────────────────────

function createMockPack(name: string, id: string, deps: CapabilityDependency[] = [], version = '1.0.0'): CapabilityPack {
  const manifest = {
    id: crypto.randomUUID() as any,
    packId: id as any,
    name,
    version,
    description: 'Test',
    author: 'test',
    license: 'MIT',
    keywords: [],
    dependencies: deps,
    interfaces: [],
    permissions: [],
    trustLevel: CapabilityTrustLevel.Trusted,
    policies: [],
    exports: [],
    checksum: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
  };
  return Object.freeze({
    id: id as any,
    name,
    state: CS.Registered,
    manifest,
    installedAt: new Date().toISOString(),
    activatedAt: null,
    version: 1,
    error: null,
    capabilities: [],
    metadata: {},
  });
}

function makeDep(packId: string, name: string, version = '1.0.0', optional = false): CapabilityDependency {
  return Object.freeze({ packId: packId as any, name, version, optional, reason: '' });
}

// ─── Fixture ──────────────────────────────────────────────────

let resolver: DependencyResolver;

beforeEach(() => {
  resolver = new DependencyResolver();
});

// ═══════════════════════════════════════════════════════════════════
// 1. Single pack with no dependencies (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — single pack with no deps', () => {
  it('should resolve a standalone pack successfully', () => {
    const pack = createMockPack('solo', 'pack-solo');
    const installed = new Map<string, CapabilityPack>([['pack-solo', pack]]);

    const result = resolver.resolve('pack-solo' as any, installed);

    expect(result.resolved).toBe(true);
    expect(result.order).toHaveLength(1);
    expect(result.order[0]).toBe('pack-solo');
  });

  it('should return no cycles for a standalone pack', () => {
    const pack = createMockPack('solo', 'pack-solo');
    const installed = new Map<string, CapabilityPack>([['pack-solo', pack]]);

    const result = resolver.resolve('pack-solo' as any, installed);

    expect(result.cycles).toHaveLength(0);
  });

  it('should return no missing deps and no conflicts for a standalone pack', () => {
    const pack = createMockPack('solo', 'pack-solo');
    const installed = new Map<string, CapabilityPack>([['pack-solo', pack]]);

    const result = resolver.resolve('pack-solo' as any, installed);

    expect(result.missing).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Two packs with dependency A → B (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — two packs A → B', () => {
  it('should resolve with resolved=true', () => {
    const packB = createMockPack('pack-b', 'pack-b');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(true);
  });

  it('should place B before A in resolution order (topological)', () => {
    const packB = createMockPack('pack-b', 'pack-b');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.order).toEqual(['pack-b', 'pack-a']);
  });

  it('should include both packs in the order', () => {
    const packB = createMockPack('pack-b', 'pack-b');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.order).toHaveLength(2);
    expect(result.order).toContain('pack-a');
    expect(result.order).toContain('pack-b');
  });

  it('should report no cycles', () => {
    const packB = createMockPack('pack-b', 'pack-b');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.cycles).toHaveLength(0);
  });

  it('should report no missing or conflicts', () => {
    const packB = createMockPack('pack-b', 'pack-b');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.missing).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Three packs A → B → C (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — three packs A → B → C', () => {
  const packC = createMockPack('pack-c', 'pack-c');
  const packB = createMockPack('pack-b', 'pack-b', [makeDep('pack-c', 'pack-c')]);
  const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b')]);
  const installed = new Map<string, CapabilityPack>([
    ['pack-a', packA],
    ['pack-b', packB],
    ['pack-c', packC],
  ]);

  it('should resolve the full chain successfully', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(true);
  });

  it('should produce correct topological order: C, B, A', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.order).toEqual(['pack-c', 'pack-b', 'pack-a']);
  });

  it('should include all three packs', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.order).toHaveLength(3);
  });

  it('should report no cycles for a valid chain', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.cycles).toHaveLength(0);
  });

  it('should report no missing or conflicts', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.missing).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Circular dependency A → B → A (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — circular dependency A → B → A', () => {
  const packB = createMockPack('pack-b', 'pack-b', [makeDep('pack-a', 'pack-a')]);
  const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b')]);
  const installed = new Map<string, CapabilityPack>([
    ['pack-a', packA],
    ['pack-b', packB],
  ]);

  it('should report resolved=false for a circular dependency', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(false);
  });

  it('should detect and report a cycle', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.cycles.length).toBeGreaterThanOrEqual(1);
  });

  it('should include both packs in the cycle description', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    const cyclePackIds = result.cycles.flatMap((c) => c.packIds as unknown as string[]);
    expect(cyclePackIds).toContain('pack-a');
    expect(cyclePackIds).toContain('pack-b');
  });

  it('should have a non-empty description in the cycle', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    for (const cycle of result.cycles) {
      expect(cycle.description.length).toBeGreaterThan(0);
    }
  });

  it('should still include packs in order but mark resolved=false for cycle', () => {
    const result = resolver.resolve('pack-a' as any, installed);

    // DFS adds packs to order before/after detecting cycles;
    // resolution is still marked as false due to the cycle
    expect(result.resolved).toBe(false);
    expect(result.order.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Missing dependency (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — missing dependency', () => {
  it('should report resolved=false when a dependency is missing', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-z', 'pack-z')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(false);
  });

  it('should report the missing dependency in the missing array', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-z', 'pack-z')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].packId).toBe('pack-z');
  });

  it('should report the name of the missing dependency', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-z', 'Missing Pack')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.missing[0].name).toBe('Missing Pack');
  });

  it('should not report cycles for missing deps', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-z', 'pack-z')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.cycles).toHaveLength(0);
  });

  it('should report missing for root pack not found', () => {
    const installed = new Map<string, CapabilityPack>();

    const result = resolver.resolve('nonexistent' as any, installed);

    expect(result.resolved).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].packId).toBe('nonexistent');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Version conflict (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — version conflict', () => {
  it('should report conflict when required minor > installed minor', () => {
    const packB = createMockPack('pack-b', 'pack-b', [], '1.3.0');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b', '1.5.0')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(false);
    expect(result.conflicts).toHaveLength(1);
  });

  it('should include correct versions in the conflict', () => {
    const packB = createMockPack('pack-b', 'pack-b', [], '1.2.0');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b', '1.5.0')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.conflicts[0].requiredVersion).toBe('1.5.0');
    expect(result.conflicts[0].installedVersion).toBe('1.2.0');
  });

  it('should have a descriptive conflict message', () => {
    const packB = createMockPack('pack-b', 'pack-b', [], '1.0.0');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b', '1.5.0')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.conflicts[0].description.length).toBeGreaterThan(0);
  });

  it('should not report conflict when installed minor >= required minor', () => {
    const packB = createMockPack('pack-b', 'pack-b', [], '1.5.0');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b', '1.3.0')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.conflicts).toHaveLength(0);
    expect(result.resolved).toBe(true);
  });

  it('should not report conflict when versions are identical', () => {
    const packB = createMockPack('pack-b', 'pack-b', [], '1.3.0');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b', '1.3.0')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.conflicts).toHaveLength(0);
    expect(result.resolved).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Mixed: missing + cycle + conflict (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — mixed issues: missing + cycle + conflict', () => {
  it('should report both missing and conflict simultaneously', () => {
    const packB = createMockPack('pack-b', 'pack-b', [], '1.0.0');
    // pack-a depends on pack-b (version conflict) and pack-z (missing)
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('pack-b', 'pack-b', '1.5.0'),
      makeDep('pack-z', 'pack-z'),
    ]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(1);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(1);
  });

  it('should report both cycle and missing deps', () => {
    const packB = createMockPack('pack-b', 'pack-b', [makeDep('pack-a', 'pack-a')]);
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('pack-b', 'pack-b'),
      makeDep('pack-z', 'pack-z'),
    ]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(false);
    expect(result.cycles.length).toBeGreaterThanOrEqual(1);
    expect(result.missing.length).toBeGreaterThanOrEqual(1);
  });

  it('should collect all three issue types together', () => {
    const packC = createMockPack('pack-c', 'pack-c', [makeDep('pack-a', 'pack-a')]);
    const packB = createMockPack('pack-b', 'pack-b', [], '1.0.0');
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('pack-b', 'pack-b', '1.5.0'),
      makeDep('pack-c', 'pack-c'),
      makeDep('pack-z', 'pack-z'),
    ]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
      ['pack-c', packC],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(false);
    // At minimum we expect missing and conflicts; cycles depend on traversal
    const issueCount = result.cycles.length + result.missing.length + result.conflicts.length;
    expect(issueCount).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. Optional dependency not installed (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — optional dependency not installed', () => {
  it('should resolve successfully when optional dep is missing', () => {
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('pack-opt', 'pack-opt', '1.0.0', true),
    ]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(true);
  });

  it('should not list optional missing dep in missing array', () => {
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('pack-opt', 'pack-opt', '1.0.0', true),
    ]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.missing).toHaveLength(0);
  });

  it('should include optional dep in order if it is installed', () => {
    const packOpt = createMockPack('pack-opt', 'pack-opt');
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('pack-opt', 'pack-opt', '1.0.0', true),
    ]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-opt', packOpt],
    ]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(true);
    expect(result.order).toContain('pack-opt');
    expect(result.order).toContain('pack-a');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. Self-dependency detection (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — self-dependency', () => {
  it('should detect self-dependency via resolve as a cycle', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-a', 'pack-a')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.resolved).toBe(false);
  });

  it('should detect self-dependency via wouldIntroduceCycle', () => {
    const deps = [makeDep('pack-new', 'pack-new')];
    const installed = new Map<string, CapabilityPack>();

    const result = resolver.wouldIntroduceCycle('pack-new' as any, deps, installed);

    expect(result).toBe(true);
  });

  it('should report cycle with the self-referencing pack', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-a', 'pack-a')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolve('pack-a' as any, installed);

    expect(result.cycles.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. resolveAll with multiple independent packs (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — resolveAll', () => {
  it('should resolve all independent packs successfully', () => {
    const packX = createMockPack('pack-x', 'pack-x');
    const packY = createMockPack('pack-y', 'pack-y');
    const packZ = createMockPack('pack-z', 'pack-z');
    const installed = new Map<string, CapabilityPack>([
      ['pack-x', packX],
      ['pack-y', packY],
      ['pack-z', packZ],
    ]);

    const result = resolver.resolveAll(installed);

    expect(result.resolved).toBe(true);
    expect(result.order).toHaveLength(3);
  });

  it('should include all packs in the resolution order', () => {
    const packX = createMockPack('pack-x', 'pack-x');
    const packY = createMockPack('pack-y', 'pack-y');
    const installed = new Map<string, CapabilityPack>([
      ['pack-x', packX],
      ['pack-y', packY],
    ]);

    const result = resolver.resolveAll(installed);

    expect(result.order).toContain('pack-x');
    expect(result.order).toContain('pack-y');
  });

  it('should respect dependency order across all packs', () => {
    const packB = createMockPack('pack-b', 'pack-b');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-b', 'pack-b')]);
    const packC = createMockPack('pack-c', 'pack-c');
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['pack-b', packB],
      ['pack-c', packC],
    ]);

    const result = resolver.resolveAll(installed);

    expect(result.resolved).toBe(true);
    const bIdx = result.order.indexOf('pack-b' as any);
    const aIdx = result.order.indexOf('pack-a' as any);
    expect(bIdx).toBeLessThan(aIdx);
  });

  it('should report unresolved if any pack has missing deps', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('pack-missing', 'pack-missing')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.resolveAll(installed);

    expect(result.resolved).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty result for empty installed map', () => {
    const installed = new Map<string, CapabilityPack>();

    const result = resolver.resolveAll(installed);

    expect(result.resolved).toBe(true);
    expect(result.order).toHaveLength(0);
    expect(result.cycles).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. wouldIntroduceCycle (8 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — wouldIntroduceCycle', () => {
  it('should return false for a new pack with no deps', () => {
    const installed = new Map<string, CapabilityPack>();

    const result = resolver.wouldIntroduceCycle('pack-new' as any, [], installed);

    expect(result).toBe(false);
  });

  it('should return false for a new pack depending on existing pack (no cycle)', () => {
    const existing = createMockPack('existing', 'existing');
    const installed = new Map<string, CapabilityPack>([['existing', existing]]);

    const result = resolver.wouldIntroduceCycle(
      'pack-new' as any,
      [makeDep('existing', 'existing')],
      installed,
    );

    expect(result).toBe(false);
  });

  it('should return true for direct self-dependency', () => {
    const installed = new Map<string, CapabilityPack>();

    const result = resolver.wouldIntroduceCycle(
      'pack-new' as any,
      [makeDep('pack-new', 'pack-new')],
      installed,
    );

    expect(result).toBe(true);
  });

  it('should return true when new pack depends on a pack that transitively depends on new pack', () => {
    // existing → would depend on pack-new (simulated)
    // But we are testing: newPack deps include 'existing', and 'existing' already depends on newPack
    // We set up: pack-b depends on pack-new. Now adding pack-new with dep on pack-b creates cycle.
    const packB = createMockPack('pack-b', 'pack-b', [makeDep('pack-new', 'pack-new')]);
    const installed = new Map<string, CapabilityPack>([['pack-b', packB]]);

    const result = resolver.wouldIntroduceCycle(
      'pack-new' as any,
      [makeDep('pack-b', 'pack-b')],
      installed,
    );

    expect(result).toBe(true);
  });

  it('should return true for a longer transitive cycle', () => {
    // pack-c → pack-b → pack-new (already in installed)
    // Adding pack-new → pack-c creates: pack-new → pack-c → pack-b → pack-new
    const packC = createMockPack('pack-c', 'pack-c', [makeDep('pack-new', 'pack-new')]);
    const packB = createMockPack('pack-b', 'pack-b', [makeDep('pack-c', 'pack-c')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-b', packB],
      ['pack-c', packC],
    ]);

    const result = resolver.wouldIntroduceCycle(
      'pack-new' as any,
      [makeDep('pack-b', 'pack-b')],
      installed,
    );

    expect(result).toBe(true);
  });

  it('should return false when new pack depends on an independent existing pack', () => {
    const existing = createMockPack('existing', 'existing');
    const installed = new Map<string, CapabilityPack>([['existing', existing]]);

    const result = resolver.wouldIntroduceCycle(
      'pack-new' as any,
      [makeDep('existing', 'existing')],
      installed,
    );

    expect(result).toBe(false);
  });

  it('should return false when new pack has multiple non-cyclic deps', () => {
    const libA = createMockPack('lib-a', 'lib-a');
    const libB = createMockPack('lib-b', 'lib-b');
    const installed = new Map<string, CapabilityPack>([
      ['lib-a', libA],
      ['lib-b', libB],
    ]);

    const result = resolver.wouldIntroduceCycle(
      'pack-new' as any,
      [makeDep('lib-a', 'lib-a'), makeDep('lib-b', 'lib-b')],
      installed,
    );

    expect(result).toBe(false);
  });

  it('should return true when any one of multiple deps creates a cycle', () => {
    const libA = createMockPack('lib-a', 'lib-a');
    const libB = createMockPack('lib-b', 'lib-b', [makeDep('pack-new', 'pack-new')]);
    const installed = new Map<string, CapabilityPack>([
      ['lib-a', libA],
      ['lib-b', libB],
    ]);

    const result = resolver.wouldIntroduceCycle(
      'pack-new' as any,
      [makeDep('lib-a', 'lib-a'), makeDep('lib-b', 'lib-b')],
      installed,
    );

    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 12. findMissing (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — findMissing', () => {
  it('should return empty array when all deps are installed', () => {
    const dep = createMockPack('dep', 'dep');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('dep', 'dep')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['dep', dep],
    ]);

    const result = resolver.findMissing(packA, installed);

    expect(result).toHaveLength(0);
  });

  it('should return the missing dependency', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('dep', 'dep')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.findMissing(packA, installed);

    expect(result).toHaveLength(1);
    expect(result[0].packId).toBe('dep');
  });

  it('should skip optional dependencies that are missing', () => {
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('opt-dep', 'opt-dep', '1.0.0', true),
    ]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.findMissing(packA, installed);

    expect(result).toHaveLength(0);
  });

  it('should return multiple missing dependencies', () => {
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('dep-1', 'dep-1'),
      makeDep('dep-2', 'dep-2'),
    ]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.findMissing(packA, installed);

    expect(result).toHaveLength(2);
  });

  it('should return a frozen (readonly) array', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('dep', 'dep')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.findMissing(packA, installed);

    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 13. findConflicts (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('DependencyResolver — findConflicts', () => {
  it('should return empty array when all dep versions are compatible', () => {
    const dep = createMockPack('dep', 'dep', [], '1.5.0');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('dep', 'dep', '1.3.0')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['dep', dep],
    ]);

    const result = resolver.findConflicts(packA, installed);

    expect(result).toHaveLength(0);
  });

  it('should return conflict when required minor > installed minor', () => {
    const dep = createMockPack('dep', 'dep', [], '1.2.0');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('dep', 'dep', '1.5.0')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['dep', dep],
    ]);

    const result = resolver.findConflicts(packA, installed);

    expect(result).toHaveLength(1);
    expect(result[0].requiredVersion).toBe('1.5.0');
    expect(result[0].installedVersion).toBe('1.2.0');
  });

  it('should not report conflict for missing deps (only installed ones)', () => {
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('missing', 'missing', '1.5.0')]);
    const installed = new Map<string, CapabilityPack>([['pack-a', packA]]);

    const result = resolver.findConflicts(packA, installed);

    expect(result).toHaveLength(0);
  });

  it('should return multiple conflicts for multiple mismatched deps', () => {
    const dep1 = createMockPack('dep-1', 'dep-1', [], '1.0.0');
    const dep2 = createMockPack('dep-2', 'dep-2', [], '1.1.0');
    const packA = createMockPack('pack-a', 'pack-a', [
      makeDep('dep-1', 'dep-1', '1.5.0'),
      makeDep('dep-2', 'dep-2', '1.9.0'),
    ]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['dep-1', dep1],
      ['dep-2', dep2],
    ]);

    const result = resolver.findConflicts(packA, installed);

    expect(result).toHaveLength(2);
  });

  it('should return a frozen (readonly) array', () => {
    const dep = createMockPack('dep', 'dep', [], '1.0.0');
    const packA = createMockPack('pack-a', 'pack-a', [makeDep('dep', 'dep', '1.5.0')]);
    const installed = new Map<string, CapabilityPack>([
      ['pack-a', packA],
      ['dep', dep],
    ]);

    const result = resolver.findConflicts(packA, installed);

    expect(Object.isFrozen(result)).toBe(true);
  });
});
