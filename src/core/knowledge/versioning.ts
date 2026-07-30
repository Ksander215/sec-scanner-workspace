/**
 * Knowledge Runtime — Versioning
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 *
 * Immutable revision management for knowledge items.
 */

import type {
  KnowledgeVersion,
  KnowledgeItemId,
  KnowledgeVersionId,
  KnowledgeMetadata,
  KnowledgeState,
} from './types.js';
import { brandKnowledgeVersionId } from './types.js';
import type { KnowledgeStorageAdapter } from './types.js';
import type { Timestamp } from '../types/common.js';
import {
  KnowledgeVersionNotFoundError,
  KnowledgeStateError,
  KnowledgeStorageError,
} from './errors.js';

// ─── Configuration ───────────────────────────────────────────────────

export interface KnowledgeVersioningConfig {
  readonly storageAdapter?: KnowledgeStorageAdapter;
  readonly maxRevisionsPerItem?: number;
}

// ─── Version Manager ─────────────────────────────────────────────────

export class KnowledgeVersionManager {
  private readonly storageAdapter?: KnowledgeStorageAdapter;
  private readonly maxRevisions: number;
  private readonly versions = new Map<string, KnowledgeVersion[]>();
  private _disposed = false;

  constructor(config: KnowledgeVersioningConfig = {}) {
    this.storageAdapter = config.storageAdapter;
    this.maxRevisions = config.maxRevisionsPerItem ?? 100;
  }

  // ─── Create Version ──────────────────────────────────────────────

  async createVersion(
    itemId: KnowledgeItemId,
    content: string,
    metadata: KnowledgeMetadata,
    state: KnowledgeState,
    changelog?: string,
  ): Promise<KnowledgeVersion> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const existing = this.versions.get(itemKey);
    const nextRevision = existing !== undefined && existing.length > 0
      ? existing[existing.length - 1]!.revision + 1
      : 1;
    const parentId = existing !== undefined && existing.length > 0
      ? existing[existing.length - 1]!.id
      : undefined;

    const version: KnowledgeVersion = Object.freeze({
      id: brandKnowledgeVersionId(crypto.randomUUID()),
      itemId,
      revision: nextRevision,
      content,
      metadata,
      state,
      parentId,
      changelog,
      createdAt: new Date().toISOString() as Timestamp,
    });

    const updated = existing !== undefined
      ? [...existing, version]
      : [version];

    // Enforce max revisions
    let trimmed = updated;
    if (trimmed.length > this.maxRevisions) {
      const excess = trimmed.length - this.maxRevisions;
      trimmed = trimmed.slice(excess);
      // Remove oldest from storage
      for (let i = 0; i < excess; i++) {
        const removed = updated[i]!;
        void this.removeVersionFromStorage(removed.id);
      }
    }

    this.versions.set(itemKey, trimmed);

    try {
      await this.storageAdapter?.saveVersion({
        id: version.id as unknown as string,
        itemId: version.itemId as unknown as string,
        revision: version.revision,
        content: version.content,
        metadata: version.metadata,
        state: version.state,
        parentId: version.parentId as unknown as string | undefined,
        changelog: version.changelog,
        createdAt: version.createdAt,
      });
    } catch (e) {
      throw new KnowledgeStorageError(
        `Failed to persist version: ${(e as Error).message}`,
      );
    }

    return version;
  }

  // ─── Get Version ──────────────────────────────────────────────────

  async getVersion(versionId: KnowledgeVersionId): Promise<KnowledgeVersion | null> {
    this.assertNotDisposed();

    const vKey = versionId as unknown as string;
    for (const versions of this.versions.values()) {
      const found = versions.find((v) => (v.id as unknown as string) === vKey);
      if (found !== undefined) {
        return found;
      }
    }

    // Try loading from storage
    if (this.storageAdapter !== undefined) {
      // Storage doesn't support direct ID lookup, skip
    }

    return null;
  }

  // ─── Get Latest Version ───────────────────────────────────────────

  async getLatestVersion(itemId: KnowledgeItemId): Promise<KnowledgeVersion | null> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const versions = this.versions.get(itemKey);
    if (versions !== undefined && versions.length > 0) {
      return versions[versions.length - 1]!;
    }
    return null;
  }

  // ─── Get All Versions ─────────────────────────────────────────────

  async getVersions(itemId: KnowledgeItemId): Promise<readonly KnowledgeVersion[]> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const versions = this.versions.get(itemKey);
    if (versions === undefined || versions.length === 0) {
      return [];
    }
    // Return in descending revision order
    return Object.freeze([...versions].reverse());
  }

  // ─── Rollback ────────────────────────────────────────────────────

  async rollback(itemId: KnowledgeItemId, revision: number): Promise<KnowledgeVersion> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const versions = this.versions.get(itemKey);
    if (versions === undefined || versions.length === 0) {
      throw new KnowledgeVersionNotFoundError(itemId as unknown as string);
    }

    const target = versions.find((v) => v.revision === revision);
    if (target === undefined) {
      throw new KnowledgeVersionNotFoundError(
        `Revision ${revision} not found for item ${itemKey}`,
      );
    }

    // Create a new version with rolled-back content (immutability preserved)
    const newVersion = await this.createVersion(
      itemId,
      target.content,
      target.metadata,
      target.state,
      `Rollback to revision ${revision}`,
    );

    return newVersion;
  }

  // ─── Get Lineage ──────────────────────────────────────────────────

  async getLineage(itemId: KnowledgeItemId): Promise<readonly KnowledgeVersion[]> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const versions = this.versions.get(itemKey);
    if (versions === undefined || versions.length === 0) {
      return [];
    }
    return Object.freeze([...versions]);
  }

  // ─── Get History (Paginated) ──────────────────────────────────────

  async getHistory(
    itemId: KnowledgeItemId,
    offset?: number,
    limit?: number,
  ): Promise<{ readonly versions: readonly KnowledgeVersion[]; readonly total: number }> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const versions = this.versions.get(itemKey);
    if (versions === undefined || versions.length === 0) {
      return Object.freeze({ versions: [], total: 0 });
    }

    const total = versions.length;
    const safeOffset = Math.max(0, offset ?? 0);
    const safeLimit = Math.max(1, limit ?? 20);
    const sliced = versions.slice(safeOffset, safeOffset + safeLimit);

    return Object.freeze({
      versions: Object.freeze(sliced.reverse()),
      total,
    });
  }

  // ─── Delete Versions ─────────────────────────────────────────────

  async deleteVersions(itemId: KnowledgeItemId): Promise<void> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    this.versions.delete(itemKey);

    try {
      await this.storageAdapter?.deleteVersions(itemKey);
    } catch (e) {
      throw new KnowledgeStorageError(
        `Failed to delete versions from storage: ${(e as Error).message}`,
      );
    }
  }

  // ─── Count ───────────────────────────────────────────────────────

  count(itemId: KnowledgeItemId): number {
    const itemKey = itemId as unknown as string;
    const versions = this.versions.get(itemKey);
    return versions?.length ?? 0;
  }

  // ─── Total Count ──────────────────────────────────────────────────

  totalVersionCount(): number {
    let total = 0;
    for (const versions of this.versions.values()) {
      total += versions.length;
    }
    return total;
  }

  // ─── Dispose ────────────────────────────────────────────────────

  dispose(): void {
    this._disposed = true;
    this.versions.clear();
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new KnowledgeStateError('KnowledgeVersionManager has been disposed');
    }
  }

  private async removeVersionFromStorage(versionId: KnowledgeVersionId): Promise<void> {
    // Storage adapter doesn't have per-version delete, no-op
    void versionId;
  }
}
