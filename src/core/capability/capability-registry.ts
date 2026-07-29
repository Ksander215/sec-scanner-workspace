/**
 * Capability Registry — Pack storage and index.
 * TASK-AIS-003G.000
 *
 * Stores all registered capability packs with indexes for
 * fast lookup by ID, name, state, and dependency.
 * All returned data is defensively copied/frozen.
 */
import type {
  CapabilityPack,
  CapabilityPackId,
  CapabilityState,
  CapabilityManifest,
} from './types.js';

export class CapabilityRegistry {
  private readonly packs = new Map<string, CapabilityPack>();
  private readonly manifests = new Map<string, CapabilityManifest>();
  private readonly nameIndex = new Map<string, CapabilityPackId>();
  private readonly stateIndex = new Map<CapabilityState, Set<string>>();
  private readonly dependencyIndex = new Map<string, Set<string>>();

  // ─── Pack CRUD ──────────────────────────────────────────────

  register(pack: CapabilityPack): void {
    const key = pack.id as unknown as string;
    if (this.packs.has(key)) {
      throw new Error(`Pack already registered: ${pack.id}`);
    }
    this.packs.set(key, pack);
    this.nameIndex.set(pack.name, pack.id);

    let stateSet = this.stateIndex.get(pack.state);
    if (!stateSet) {
      stateSet = new Set();
      this.stateIndex.set(pack.state, stateSet);
    }
    stateSet.add(key);

    for (const dep of pack.manifest.dependencies) {
      const depKey = dep.packId as unknown as string;
      let depSet = this.dependencyIndex.get(depKey);
      if (!depSet) {
        depSet = new Set();
        this.dependencyIndex.set(depKey, depSet);
      }
      depSet.add(key);
    }
  }

  unregister(packId: CapabilityPackId): boolean {
    const key = packId as unknown as string;
    const pack = this.packs.get(key);
    if (!pack) return false;

    this.packs.delete(key);
    this.nameIndex.delete(pack.name);
    this.stateIndex.get(pack.state)?.delete(key);

    for (const dep of pack.manifest.dependencies) {
      const depKey = dep.packId as unknown as string;
      this.dependencyIndex.get(depKey)?.delete(key);
    }

    return true;
  }

  get(packId: CapabilityPackId): CapabilityPack | null {
    const pack = this.packs.get(packId as unknown as string) ?? null;
    return pack;
  }

  getByName(name: string): CapabilityPack | null {
    const packId = this.nameIndex.get(name);
    if (!packId) return null;
    return this.packs.get(packId as unknown as string) ?? null;
  }

  getByState(state: CapabilityState): readonly CapabilityPack[] {
    const keys = this.stateIndex.get(state);
    if (!keys) return [];
    return Object.freeze([...keys].map(k => this.packs.get(k)!).filter(Boolean));
  }

  getAll(): readonly CapabilityPack[] {
    return Object.freeze([...this.packs.values()]);
  }

  has(packId: CapabilityPackId): boolean {
    return this.packs.has(packId as unknown as string);
  }

  hasByName(name: string): boolean {
    return this.nameIndex.has(name);
  }

  // ─── Manifest ───────────────────────────────────────────────

  saveManifest(manifest: CapabilityManifest): void {
    const key = manifest.packId as unknown as string;
    this.manifests.set(key, manifest);
  }

  getManifest(packId: CapabilityPackId): CapabilityManifest | null {
    return this.manifests.get(packId as unknown as string) ?? null;
  }

  // ─── State update ───────────────────────────────────────────

  updateState(packId: CapabilityPackId, newState: CapabilityState): void {
    const key = packId as unknown as string;
    const pack = this.packs.get(key);
    if (!pack) return;

    const oldState = pack.state;
    this.stateIndex.get(oldState)?.delete(key);

    let stateSet = this.stateIndex.get(newState);
    if (!stateSet) {
      stateSet = new Set();
      this.stateIndex.set(newState, stateSet);
    }
    stateSet.add(key);
  }

  // ─── Dependency lookups ─────────────────────────────────────

  getDependents(packId: CapabilityPackId): readonly CapabilityPack[] {
    const key = packId as unknown as string;
    const dependentKeys = this.dependencyIndex.get(key);
    if (!dependentKeys) return [];
    return Object.freeze([...dependentKeys].map(k => this.packs.get(k)!).filter(Boolean));
  }

  // ─── Stats ──────────────────────────────────────────────────

  get count(): number {
    return this.packs.size;
  }

  get size(): number {
    return this.packs.size;
  }

  clear(): void {
    this.packs.clear();
    this.manifests.clear();
    this.nameIndex.clear();
    this.stateIndex.clear();
    this.dependencyIndex.clear();
  }
}
