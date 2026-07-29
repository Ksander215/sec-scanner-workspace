/**
 * Context Snapshot Manager — Creates, restores, serializes, and deserializes
 * point-in-time snapshots of UnifiedContext.
 *
 * Snapshots are immutable once created. They support persistence via
 * serialize/deserialize for file-based storage (ADR-004).
 *
 * Conforms to: DOM-002.000 (Domain Model), ADR-004 (File Storage)
 */
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { UnifiedContext, SerializableContext, ContextId, SnapshotId } from './types.js';
import { ContextSerializer } from './context-serializer.js';
import {
  ContextSnapshotCreated,
  ContextRestored,
  createContextEventBase,
} from './events.js';
import { EventClassification } from '../types/common.js';
import {
  SnapshotCorruptedError,
  ContextDeserializationError,
} from './errors.js';

/** Trigger types for snapshot creation. */
export type SnapshotTrigger = 'manual' | 'state-change' | 'checkpoint' | 'auto';

/** An immutable snapshot of a context at a point in time. */
export interface ContextSnapshot {
  readonly snapshotId: SnapshotId;
  readonly contextId: ContextId;
  readonly context: SerializableContext;
  readonly createdAt: string;
  readonly trigger: SnapshotTrigger;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Manages context snapshots — creation, restoration, serialization, deserialization.
 * Publishes events via the Event Bus when snapshots are created or restored.
 */
export class ContextSnapshotManager {
  private readonly serializer = new ContextSerializer();

  constructor(private readonly eventBus?: EventBus) {}

  /**
   * Create a snapshot of the given context.
   * Serializes the context to a portable format for storage.
   */
  createSnapshot(
    context: UnifiedContext,
    trigger: SnapshotTrigger,
    metadata?: Readonly<Record<string, unknown>>,
  ): ContextSnapshot {
    const serializable = this.serializer.toSerializable(context);

    const snapshot: ContextSnapshot = {
      snapshotId: crypto.randomUUID() as unknown as SnapshotId,
      contextId: context.contextId,
      context: serializable,
      createdAt: new Date().toISOString(),
      trigger,
      metadata,
    };

    // Publish event asynchronously (fire-and-forget)
    this.publishEvent<ContextSnapshotCreated>({
      ...createContextEventBase(
        'ContextSnapshotCreated',
        EventClassification.Info,
        context.contextId,
      ),
      eventType: 'ContextSnapshotCreated',
      classification: EventClassification.Info,
      payload: {
        snapshotId: snapshot.snapshotId,
        contextId: context.contextId,
        trigger: snapshot.trigger,
        version: context.version,
        entryCount: context.entries.size,
        sizeBytes: context.sizeBytes,
        createdAt: snapshot.createdAt,
      },
    });

    return snapshot;
  }

  /**
   * Restore a UnifiedContext from a snapshot.
   * Deserializes the stored data back into a live context.
   */
  restoreFromSnapshot(snapshot: ContextSnapshot): UnifiedContext {
    const context = this.serializer.fromSerializable(snapshot.context);

    // Publish event
    this.publishEvent<ContextRestored>({
      ...createContextEventBase(
        'ContextRestored',
        EventClassification.StateChange,
        snapshot.contextId,
      ),
      eventType: 'ContextRestored',
      classification: EventClassification.StateChange,
      payload: {
        snapshotId: snapshot.snapshotId,
        contextId: context.contextId,
        version: context.version,
        entryCount: context.entries.size,
        restoredAt: new Date().toISOString(),
      },
    });

    return context;
  }

  /**
   * Serialize a snapshot to a JSON string for persistence.
   * Validates the snapshot structure before serialization.
   */
  serializeSnapshot(snapshot: ContextSnapshot): string {
    try {
      const result = this.serializer.validate(
        JSON.stringify(snapshot.context),
      );
      if (!result.ok) {
        throw new SnapshotCorruptedError(
          `Snapshot ${snapshot.snapshotId} contains invalid context: ${result.error.message}`,
          snapshot.contextId,
        );
      }
      return JSON.stringify(snapshot, null, 0);
    } catch (error) {
      if (error instanceof SnapshotCorruptedError) throw error;
      throw new SnapshotCorruptedError(
        `Failed to serialize snapshot ${snapshot.snapshotId}: ${error instanceof Error ? error.message : String(error)}`,
        snapshot.contextId,
      );
    }
  }

  /**
   * Deserialize a JSON string back into a ContextSnapshot.
   * Validates the data structure on parse.
   */
  deserializeSnapshot(data: string): ContextSnapshot {
    try {
      const parsed = JSON.parse(data) as ContextSnapshot;

      // Validate required fields
      if (!parsed.snapshotId || typeof parsed.snapshotId !== 'string') {
        throw new SnapshotCorruptedError(
          'Invalid snapshot: missing or invalid snapshotId',
        );
      }
      if (!parsed.contextId || typeof parsed.contextId !== 'string') {
        throw new SnapshotCorruptedError(
          'Invalid snapshot: missing or invalid contextId',
          parsed.contextId as string | undefined,
        );
      }
      if (!parsed.context || typeof parsed.context !== 'object') {
        throw new SnapshotCorruptedError(
          'Invalid snapshot: missing context data',
          parsed.contextId as string | undefined,
        );
      }
      if (!parsed.createdAt || typeof parsed.createdAt !== 'string') {
        throw new SnapshotCorruptedError(
          'Invalid snapshot: missing or invalid createdAt',
          parsed.contextId as string | undefined,
        );
      }

      // Validate the embedded context structure
      const validationResult = this.serializer.validate(
        JSON.stringify(parsed.context),
      );
      if (!validationResult.ok) {
        throw new SnapshotCorruptedError(
          `Snapshot context validation failed: ${validationResult.error.message}`,
          parsed.contextId as string | undefined,
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof SnapshotCorruptedError) throw error;
      throw new ContextDeserializationError(
        `Failed to deserialize snapshot: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Publish an event to the event bus if available. Fire-and-forget. */
  private publishEvent<T extends DomainEventBase>(event: T): void {
    if (!this.eventBus) return;
    // Fire-and-forget: don't await to avoid blocking the caller
    void this.eventBus.publish(event);
  }
}
