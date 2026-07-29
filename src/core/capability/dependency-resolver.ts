/**
 * Capability Dependency Resolver — Graph resolution with cycle detection.
 * TASK-AIS-003G.000
 *
 * Resolves dependency graphs for capability packs:
 *   - Topological sort for load order
 *   - Cycle detection (DFS)
 *   - Missing dependency detection
 *   - Version conflict detection
 */
import type {
  CapabilityPack,
  CapabilityPackId,
  CapabilityDependency,
  DependencyResolutionResult,
  DependencyCycle,
  DependencyConflict,
} from './types.js';

export class DependencyResolver {

  /**
   * Resolve dependencies for a given pack and all its transitive dependencies.
   * Returns the order in which packs should be loaded, or errors for cycles/missing/conflicts.
   */
  resolve(
    packId: CapabilityPackId,
    installedPacks: ReadonlyMap<string, CapabilityPack>,
  ): DependencyResolutionResult {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const order: CapabilityPackId[] = [];
    const cycles: DependencyCycle[] = [];
    const missing: CapabilityDependency[] = [];
    const conflicts: DependencyConflict[] = [];

    const key = packId as unknown as string;
    const pack = installedPacks.get(key);
    if (!pack) {
      return {
        resolved: false,
        order: Object.freeze([]),
        cycles: Object.freeze([]),
        missing: Object.freeze([{ packId, name: packId, version: '0.0.0', optional: false, reason: 'Root pack not found' }]),
        conflicts: Object.freeze([]),
      };
    }

    // DFS for topological sort + cycle detection
    const hasCycle = this.dfs(packId, installedPacks, visited, inStack, order, cycles, missing, conflicts);
    if (hasCycle || cycles.length > 0 || missing.length > 0 || conflicts.length > 0) {
      return {
        resolved: false,
        order: Object.freeze(order),
        cycles: Object.freeze(cycles),
        missing: Object.freeze(missing),
        conflicts: Object.freeze(conflicts),
      };
    }

    return {
      resolved: true,
      order: Object.freeze(order),
      cycles: Object.freeze([]),
      missing: Object.freeze([]),
      conflicts: Object.freeze([]),
    };
  }

  /**
   * Resolve dependencies for all packs (full system resolution).
   */
  resolveAll(installedPacks: ReadonlyMap<string, CapabilityPack>): DependencyResolutionResult {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const order: CapabilityPackId[] = [];
    const cycles: DependencyCycle[] = [];
    const missing: CapabilityDependency[] = [];
    const conflicts: DependencyConflict[] = [];

    for (const pack of installedPacks.values()) {
      const key = pack.id as unknown as string;
      if (!visited.has(key)) {
        this.dfs(pack.id, installedPacks, visited, inStack, order, cycles, missing, conflicts);
      }
    }

    return {
      resolved: cycles.length === 0 && missing.length === 0 && conflicts.length === 0,
      order: Object.freeze(order),
      cycles: Object.freeze(cycles),
      missing: Object.freeze(missing),
      conflicts: Object.freeze(conflicts),
    };
  }

  /**
   * Check if adding a new pack would introduce cycles.
   */
  wouldIntroduceCycle(
    newPackId: CapabilityPackId,
    newDependencies: readonly CapabilityDependency[],
    installedPacks: ReadonlyMap<string, CapabilityPack>,
  ): boolean {
    // Check direct self-dependency
    for (const dep of newDependencies) {
      if (dep.packId === newPackId) return true;
    }

    // Check if any installed pack that depends on newPackId would form a cycle
    for (const pack of installedPacks.values()) {
      if (this.hasPath(pack.id, newPackId, installedPacks, new Set())) {
        // pack -> ... -> newPackId exists, check if newPackId -> ... -> pack would form a cycle
        for (const dep of newDependencies) {
          if (dep.packId === pack.id) return true;
          if (this.hasPath(dep.packId, pack.id, installedPacks, new Set([newPackId as unknown as string]))) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check for missing dependencies of a pack.
   */
  findMissing(pack: CapabilityPack, installedPacks: ReadonlyMap<string, CapabilityPack>): readonly CapabilityDependency[] {
    const missing: CapabilityDependency[] = [];
    for (const dep of pack.manifest.dependencies) {
      if (!dep.optional) {
        const depKey = dep.packId as unknown as string;
        if (!installedPacks.has(depKey)) {
          missing.push(dep);
        }
      }
    }
    return Object.freeze(missing);
  }

  /**
   * Check for version conflicts.
   */
  findConflicts(
    pack: CapabilityPack,
    installedPacks: ReadonlyMap<string, CapabilityPack>,
  ): readonly DependencyConflict[] {
    const conflicts: DependencyConflict[] = [];
    for (const dep of pack.manifest.dependencies) {
      const depKey = dep.packId as unknown as string;
      const installed = installedPacks.get(depKey);
      if (installed && !isCompatibleVersion(dep.version, installed.manifest.version)) {
        conflicts.push({
          packId: dep.packId,
          requiredVersion: dep.version,
          installedVersion: installed.manifest.version,
          description: `Pack "${pack.name}" requires "${dep.name}" version ${dep.version}, but ${installed.manifest.version} is installed`,
        });
      }
    }
    return Object.freeze(conflicts);
  }

  // ─── Private helpers ─────────────────────────────────────────

  private dfs(
    packId: CapabilityPackId,
    installedPacks: ReadonlyMap<string, CapabilityPack>,
    visited: Set<string>,
    inStack: Set<string>,
    order: CapabilityPackId[],
    cycles: DependencyCycle[],
    missing: CapabilityDependency[],
    conflicts: DependencyConflict[],
  ): boolean {
    const key = packId as unknown as string;

    if (inStack.has(key)) {
      // Cycle detected - will be collected from inStack
      return true;
    }

    if (visited.has(key)) return false;

    visited.add(key);
    inStack.add(key);

    const pack = installedPacks.get(key);
    if (!pack) return false;

    for (const dep of pack.manifest.dependencies) {
      const depKey = dep.packId as unknown as string;
      const depPack = installedPacks.get(depKey);

      if (!depPack) {
        if (!dep.optional) {
          missing.push(dep);
        }
        continue;
      }

      if (!isCompatibleVersion(dep.version, depPack.manifest.version)) {
        conflicts.push({
          packId: dep.packId,
          requiredVersion: dep.version,
          installedVersion: depPack.manifest.version,
          description: `Version conflict: requires ${dep.version}, installed ${depPack.manifest.version}`,
        });
      }

      if (inStack.has(depKey)) {
        // Build cycle path
        const cyclePath: CapabilityPackId[] = [];
        for (const k of inStack) {
          cyclePath.push(k as unknown as CapabilityPackId);
        }
        cyclePath.push(dep.packId);
        cycles.push({
          packIds: Object.freeze(cyclePath),
          description: `Cycle detected: ${[...cyclePath].join(' → ')}`,
        });
        continue;
      }

      if (!visited.has(depKey)) {
        const foundCycle = this.dfs(dep.packId, installedPacks, visited, inStack, order, cycles, missing, conflicts);
        if (foundCycle && cycles.length === 0) return true;
      }
    }

    inStack.delete(key);
    order.push(packId);
    return false;
  }

  /**
   * Check if there is a path from `from` to `to` via dependencies.
   */
  private hasPath(
    from: CapabilityPackId,
    to: CapabilityPackId,
    installedPacks: ReadonlyMap<string, CapabilityPack>,
    visited: Set<string>,
  ): boolean {
    const fromKey = from as unknown as string;
    if (from === to) return true;
    if (visited.has(fromKey)) return false;

    visited.add(fromKey);

    const pack = installedPacks.get(fromKey);
    if (!pack) return false;

    for (const dep of pack.manifest.dependencies) {
      if (dep.packId === to) return true;
      if (this.hasPath(dep.packId, to, installedPacks, visited)) return true;
    }

    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Simple semver compatibility check: major.minor must match.
 * Supports "1.2" and "1.2.3" formats.
 */
function isCompatibleVersion(required: string, installed: string): boolean {
  const reqParts = required.split('.').map(Number);
  const instParts = installed.split('.').map(Number);
  if (reqParts.length < 2 || instParts.length < 2) return true;
  // Same major version required
  if (reqParts[0] !== instParts[0]) return false;
  // If required specifies minor, it must match or be lower
  if (reqParts.length >= 2 && instParts.length >= 2) {
    if (reqParts[1] > instParts[1]) return false;
  }
  return true;
}
