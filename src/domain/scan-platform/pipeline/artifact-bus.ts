/**
 * Pipeline Executor Core — Artifact Bus
 *
 * In-process artifact store with publish/subscribe, search,
 * deduplication, and immutability.
 *
 * Design:
 * - Artifacts are immutable once published.
 * - Deduplication by category+key (last-write-wins for same key).
 * - Subscribe to categories for incremental processing.
 * - O(1) lookup by category+key.
 * - O(n) search within category.
 */

import type { ID } from '../types/index.ts';
import type {
  PipelineArtifact,
  ArtifactCategory,
  ArtifactBus,
  ArtifactBusReadonly,
  ArtifactBusWriteable,
} from './types.ts';

// ─── Artifact Bus ──────────────────────────────────────────

export class ArtifactBusImpl implements ArtifactBus {
  private readonly artifacts: PipelineArtifact[] = [];
  private readonly byCategory = new Map<ArtifactCategory, Map<string, PipelineArtifact>>();
  private readonly byStage = new Map<string, PipelineArtifact[]>();
  private readonly subscribers = new Map<ArtifactCategory, Array<(artifact: PipelineArtifact) => void>>();
  private idCounter = 0;

  // ─── Publish ──────────────────────────────────────────

  publish(input: Omit<PipelineArtifact, 'id' | 'publishedAt'>): PipelineArtifact {
    const artifact: PipelineArtifact = {
      ...input,
      id: `art-${++this.idCounter}`,
      publishedAt: new Date().toISOString(),
    };

    // Store
    this.artifacts.push(artifact);

    // Index by category+key (dedup: replace if same key exists)
    const catMap = this.byCategory.get(artifact.category) ?? new Map();
    catMap.set(artifact.key, artifact);
    this.byCategory.set(artifact.category, catMap);

    // Index by stage
    const stageList = this.byStage.get(artifact.stageId) ?? [];
    stageList.push(artifact);
    this.byStage.set(artifact.stageId, stageList);

    // Notify subscribers
    const subs = this.subscribers.get(artifact.category);
    if (subs) {
      for (const handler of subs) {
        try { handler(artifact); } catch { /* subscriber errors are non-fatal */ }
      }
    }

    return artifact;
  }

  // ─── Read Operations ──────────────────────────────────

  getAll(category?: ArtifactCategory): readonly PipelineArtifact[] {
    if (!category) return this.artifacts;
    const catMap = this.byCategory.get(category);
    return catMap ? Array.from(catMap.values()) : [];
  }

  getByCategory(category: ArtifactCategory): readonly PipelineArtifact[] {
    return this.getAll(category);
  }

  getByStage(stageId: string): readonly PipelineArtifact[] {
    return this.byStage.get(stageId) ?? [];
  }

  get(category: ArtifactCategory, key: string): PipelineArtifact | undefined {
    return this.byCategory.get(category)?.get(key);
  }

  search(
    category: ArtifactCategory,
    predicate: (a: PipelineArtifact) => boolean,
  ): readonly PipelineArtifact[] {
    const catMap = this.byCategory.get(category);
    if (!catMap) return [];
    return Array.from(catMap.values()).filter(predicate);
  }

  count(category?: ArtifactCategory): number {
    if (!category) return this.artifacts.length;
    return this.byCategory.get(category)?.size ?? 0;
  }

  hasKey(category: ArtifactCategory, key: string): boolean {
    return this.byCategory.get(category)?.has(key) ?? false;
  }

  // ─── Subscribe ────────────────────────────────────────

  /**
   * Subscribe to artifacts of a specific category.
   * Returns an unsubscribe function.
   */
  onArtifact(category: ArtifactCategory, handler: (artifact: PipelineArtifact) => void): () => void {
    const list = this.subscribers.get(category) ?? [];
    list.push(handler);
    this.subscribers.set(category, list);
    return () => {
      const current = this.subscribers.get(category);
      if (current) {
        const idx = current.indexOf(handler);
        if (idx >= 0) current.splice(idx, 1);
      }
    };
  }

  // ─── Snapshot (for persistence) ───────────────────────

  /** Get a serializable snapshot of all artifacts. */
  toSnapshot(): readonly PipelineArtifact[] {
    return [...this.artifacts];
  }

  /** Restore from a snapshot. */
  static fromSnapshot(artifacts: readonly PipelineArtifact[]): ArtifactBusImpl {
    const bus = new ArtifactBusImpl();
    for (const a of artifacts) {
      // Re-assign IDs to maintain consistency
      bus.publish({
        category: a.category,
        stageId: a.stageId,
        key: a.key,
        value: a.value,
        sourceEngine: a.sourceEngine,
      });
    }
    return bus;
  }
}

/** Factory function. */
export function createArtifactBus(): ArtifactBus {
  return new ArtifactBusImpl();
}