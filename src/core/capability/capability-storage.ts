/**
 * Capability Persistence — Storage Adapters.
 * TASK-AIS-003G.000
 *
 * Three storage strategies:
 *   1. InMemory — for testing and ephemeral use
 *   2. FileStorage — for persistent local storage
 *   3. Snapshot — decorator for point-in-time snapshots
 */
import type {
  CapabilityPack,
  CapabilityPackId,
  CapabilityManifest,
  CapabilityStorageAdapter,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY ADAPTER
// ═══════════════════════════════════════════════════════════════════

export class InMemoryCapabilityStorage implements CapabilityStorageAdapter {
  private readonly packs = new Map<string, CapabilityPack>();
  private readonly manifests = new Map<string, CapabilityManifest>();

  async savePack(pack: CapabilityPack): Promise<void> {
    const key = pack.id as unknown as string;
    this.packs.set(key, structuredClone(pack));
  }

  async loadPack(packId: CapabilityPackId): Promise<CapabilityPack | null> {
    const key = packId as unknown as string;
    const pack = this.packs.get(key) ?? null;
    return pack;
  }

  async deletePack(packId: CapabilityPackId): Promise<boolean> {
    const key = packId as unknown as string;
    this.manifests.delete(key);
    return this.packs.delete(key);
  }

  async listPacks(): Promise<readonly CapabilityPack[]> {
    return Object.freeze([...this.packs.values()]);
  }

  async saveManifest(manifest: CapabilityManifest): Promise<void> {
    const key = manifest.packId as unknown as string;
    this.manifests.set(key, structuredClone(manifest));
  }

  async loadManifest(packId: CapabilityPackId): Promise<CapabilityManifest | null> {
    const key = packId as unknown as string;
    return this.manifests.get(key) ?? null;
  }

  get packCount(): number { return this.packs.size; }
  get manifestCount(): number { return this.manifests.size; }

  clear(): void {
    this.packs.clear();
    this.manifests.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════
// FILE STORAGE ADAPTER
// ═══════════════════════════════════════════════════════════════════

export class FileCapabilityStorage implements CapabilityStorageAdapter {
  private readonly _basePath: string;

  constructor(basePath: string) {
    this._basePath = basePath;
    //basePath is stored for future fs operations extension
    void this._basePath;
  }

  async savePack(pack: CapabilityPack): Promise<void> {
    // File-based storage — placeholder for real fs operations
    // In the core runtime, we use InMemory for now.
    // This adapter exists for future extension.
    void pack;
  }

  async loadPack(packId: CapabilityPackId): Promise<CapabilityPack | null> {
    void packId;
    return null;
  }

  async deletePack(packId: CapabilityPackId): Promise<boolean> {
    void packId;
    return false;
  }

  async listPacks(): Promise<readonly CapabilityPack[]> {
    return [];
  }

  async saveManifest(manifest: CapabilityManifest): Promise<void> {
    void manifest;
  }

  async loadManifest(packId: CapabilityPackId): Promise<CapabilityManifest | null> {
    void packId;
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SNAPSHOT STORAGE ADAPTER (Decorator)
// ═══════════════════════════════════════════════════════════════════

export class SnapshotCapabilityStorage implements CapabilityStorageAdapter {
  private readonly delegate: CapabilityStorageAdapter;
  private readonly snapshots = new Map<string, Map<string, CapabilityPack>>();

  constructor(delegate: CapabilityStorageAdapter) {
    this.delegate = delegate;
  }

  async savePack(pack: CapabilityPack): Promise<void> {
    await this.delegate.savePack(pack);
  }

  async loadPack(packId: CapabilityPackId): Promise<CapabilityPack | null> {
    return this.delegate.loadPack(packId);
  }

  async deletePack(packId: CapabilityPackId): Promise<boolean> {
    return this.delegate.deletePack(packId);
  }

  async listPacks(): Promise<readonly CapabilityPack[]> {
    return this.delegate.listPacks();
  }

  async saveManifest(manifest: CapabilityManifest): Promise<void> {
    await this.delegate.saveManifest(manifest);
  }

  async loadManifest(packId: CapabilityPackId): Promise<CapabilityManifest | null> {
    return this.delegate.loadManifest(packId);
  }

  /**
   * Take a snapshot of all currently stored packs.
   */
  async takeSnapshot(snapshotId: string): Promise<void> {
    const packs = await this.delegate.listPacks();
    const snapshot = new Map<string, CapabilityPack>();
    for (const pack of packs) {
      snapshot.set(pack.id as unknown as string, structuredClone(pack));
    }
    this.snapshots.set(snapshotId, snapshot);
  }

  /**
   * Restore a snapshot.
   */
  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    // Clear current and restore
    const currentPacks = await this.delegate.listPacks();
    for (const pack of currentPacks) {
      await this.delegate.deletePack(pack.id);
    }
    for (const pack of snapshot.values()) {
      await this.delegate.savePack(pack);
    }

    return true;
  }

  /**
   * List available snapshots.
   */
  listSnapshots(): readonly string[] {
    return Object.freeze([...this.snapshots.keys()]);
  }

  /**
   * Delete a snapshot.
   */
  deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }
}
