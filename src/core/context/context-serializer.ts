/**
 * Context Serializer — Serialization and deserialization of UnifiedContext.
 *
 * Converts between the live UnifiedContext (with ReadonlyMap) and a
 * JSON-serializable format (SerializableContext with Array).
 * Also provides validation of serialized data.
 *
 * Conforms to: ADR-004 (File Storage)
 */
import type { Result } from '../types/common.js';
import type { UnifiedContext, SerializableContext, ContextEntry, ContextVersion, ContextId } from './types.js';
import { ContextSource, ContextPriority } from './types.js';
import { ContextValidationError, ContextDeserializationError, ContextSerializationError } from './errors.js';

/**
 * Handles serialization, deserialization, and validation of context data.
 */
export class ContextSerializer {
  /**
   * Serialize a UnifiedContext to a JSON string.
   * Converts the entries Map to a plain array for JSON compatibility.
   */
  serialize(context: UnifiedContext): string {
    try {
      const serializable = this.toSerializable(context);
      return JSON.stringify(serializable);
    } catch (error) {
      throw new ContextSerializationError(
        `Failed to serialize context ${context.contextId}: ${error instanceof Error ? error.message : String(error)}`,
        context.contextId,
      );
    }
  }

  /**
   * Deserialize a JSON string back into a UnifiedContext.
   * Reconstructs the entries Map from the plain array.
   */
  deserialize(data: string): UnifiedContext {
    try {
      const serializable = JSON.parse(data) as SerializableContext;
      return this.fromSerializable(serializable);
    } catch (error) {
      if (error instanceof ContextDeserializationError) throw error;
      if (error instanceof SyntaxError) {
        throw new ContextDeserializationError(
          `Invalid JSON when deserializing context: ${error.message}`,
        );
      }
      throw new ContextDeserializationError(
        `Failed to deserialize context: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate serialized context data (as JSON string).
   * Returns the parsed SerializableContext on success, or validation errors.
   */
  validate(data: string): Result<SerializableContext, ContextValidationError> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      return {
        ok: false,
        error: new ContextValidationError(
          `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
          ['Invalid JSON syntax'],
        ),
      };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return {
        ok: false,
        error: new ContextValidationError(
          'Context data must be a JSON object',
          ['Expected object, got ' + typeof parsed],
        ),
      };
    }

    const ctx = parsed as SerializableContext;
    const violations: string[] = [];

    if (!ctx.contextId || typeof ctx.contextId !== 'string') {
      violations.push('contextId must be a non-empty string');
    }
    if (!ctx.version || typeof ctx.version !== 'string') {
      violations.push('version must be a non-empty string');
    }
    if (!ctx.createdAt || typeof ctx.createdAt !== 'string') {
      violations.push('createdAt must be an ISO-8601 string');
    }
    if (!ctx.updatedAt || typeof ctx.updatedAt !== 'string') {
      violations.push('updatedAt must be an ISO-8601 string');
    }
    if (typeof ctx.sizeBytes !== 'number' || ctx.sizeBytes < 0) {
      violations.push('sizeBytes must be a non-negative number');
    }
    if (!Array.isArray(ctx.entries)) {
      violations.push('entries must be an array');
    } else {
      for (let i = 0; i < ctx.entries.length; i++) {
        const entry = ctx.entries[i];
        if (!entry || typeof entry !== 'object') {
          violations.push(`entries[${i}] must be an object`);
          continue;
        }
        if (!entry.key || typeof entry.key !== 'string') {
          violations.push(`entries[${i}].key must be a non-empty string`);
        }
        if (entry.value === undefined) {
          violations.push(`entries[${i}].value must not be undefined`);
        }
        if (typeof entry.source !== 'string' || !Object.values(ContextSource).includes(entry.source as ContextSource)) {
          violations.push(`entries[${i}].source must be a valid ContextSource`);
        }
        if (typeof entry.priority !== 'number' || !Object.values(ContextPriority).includes(entry.priority as ContextPriority)) {
          violations.push(`entries[${i}].priority must be a valid ContextPriority`);
        }
        if (!entry.createdAt || typeof entry.createdAt !== 'string') {
          violations.push(`entries[${i}].createdAt must be an ISO-8601 string`);
        }
      }
    }

    if (violations.length > 0) {
      return {
        ok: false,
        error: new ContextValidationError(
          `Context validation failed with ${violations.length} violation(s)`,
          violations,
          ctx.contextId as string | undefined,
        ),
      };
    }

    return { ok: true, value: ctx };
  }

  /**
   * Convert a UnifiedContext to a SerializableContext.
   * Extracts Map entries into a plain array.
   */
  toSerializable(context: UnifiedContext): SerializableContext {
    const entriesArray: SerializableContext['entries'] = Array.from(
      context.entries.values(),
    ).map((entry) => ({
      key: entry.key,
      value: entry.value,
      source: entry.source,
      priority: entry.priority,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      tags: entry.tags,
    }));

    return {
      contextId: context.contextId,
      version: context.version,
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
      entries: entriesArray,
      metadata: context.metadata,
      sizeBytes: context.sizeBytes,
      sessionId: context.sessionId,
      executionId: context.executionId,
    };
  }

  /**
   * Convert a SerializableContext back to a UnifiedContext.
   * Reconstructs the Map from the array.
   */
  fromSerializable(serializable: SerializableContext): UnifiedContext {
    const entries = new Map<string, ContextEntry>();
    let sizeBytes = 0;

    for (const entryData of serializable.entries) {
      const entry: ContextEntry = {
        key: entryData.key,
        value: entryData.value,
        source: entryData.source as ContextSource,
        priority: entryData.priority as ContextPriority,
        createdAt: entryData.createdAt,
        expiresAt: entryData.expiresAt,
        tags: entryData.tags,
      };
      entries.set(entry.key, entry);
      sizeBytes += this.estimateEntrySizeBytes(entry);
    }

    return {
      contextId: serializable.contextId as ContextId,
      version: serializable.version as ContextVersion,
      createdAt: serializable.createdAt,
      updatedAt: serializable.updatedAt,
      entries,
      metadata: serializable.metadata ?? {},
      sizeBytes: sizeBytes,
      sessionId: serializable.sessionId,
      executionId: serializable.executionId,
    };
  }

  /** Approximate byte size of an entry. */
  private estimateEntrySizeBytes(entry: ContextEntry): number {
    const keySize = new TextEncoder().encode(entry.key).length;
    const valueSize = new TextEncoder().encode(JSON.stringify(entry.value)).length;
    return keySize + valueSize + 128; // metadata overhead
  }
}
