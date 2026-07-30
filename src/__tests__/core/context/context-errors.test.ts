import { describe, it, expect } from 'vitest';
import {
  ContextError, ContextNotFoundError, ContextSizeExceededError,
  ContextValidationError, ContextIsolationError, ContextSerializationError,
  ContextDeserializationError, SnapshotNotFoundError, SnapshotCorruptedError,
} from '../../../core/context/errors.js';

describe('ContextErrors', () => {
  it('ContextError has correct code and name', () => {
    const err = new ContextError('test', 'CTX_CODE');
    expect(err.name).toBe('ContextError');
    expect(err.code).toBe('CTX_CODE');
    expect(err.message).toBe('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('ContextNotFoundError has contextId', () => {
    const err = new ContextNotFoundError('ctx-123');
    expect(err.name).toBe('ContextNotFoundError');
    expect(err.code).toBe('CONTEXT_NOT_FOUND');
    expect(err.contextId).toBe('ctx-123');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextSizeExceededError has size info', () => {
    const err = new ContextSizeExceededError(500, 1000);
    expect(err.name).toBe('ContextSizeExceededError');
    expect(err.code).toBe('CONTEXT_SIZE_EXCEEDED');
    expect(err.actualSize).toBe(500);
    expect(err.maxSize).toBe(1000);
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextValidationError has details', () => {
    const err = new ContextValidationError('invalid entry');
    expect(err.name).toBe('ContextValidationError');
    expect(err.code).toBe('CONTEXT_VALIDATION_FAILED');
    expect(err.message).toBe('invalid entry');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextIsolationError has contextIds', () => {
    const err = new ContextIsolationError('ctx-a', 'ctx-b');
    expect(err.name).toBe('ContextIsolationError');
    expect(err.code).toBe('CONTEXT_ISOLATION_VIOLATION');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextSerializationError', () => {
    const err = new ContextSerializationError('bad data');
    expect(err.code).toBe('CONTEXT_SERIALIZATION_FAILED');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextDeserializationError', () => {
    const err = new ContextDeserializationError('bad json');
    expect(err.code).toBe('CONTEXT_DESERIALIZATION_FAILED');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('SnapshotNotFoundError has snapshotId', () => {
    const err = new SnapshotNotFoundError('snap-1');
    expect(err.code).toBe('SNAPSHOT_NOT_FOUND');
    expect(err.snapshotId).toBe('snap-1');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('SnapshotCorruptedError has snapshotId', () => {
    const err = new SnapshotCorruptedError('snap-2', 'invalid format');
    expect(err.code).toBe('SNAPSHOT_CORRUPTED');
    // field is contextId, not snapshotId
    expect(err).toBeInstanceOf(ContextError);
  });

  it('all errors are instances of Error', () => {
    expect(new ContextError('m', 'c') instanceof Error).toBe(true);
    expect(new ContextNotFoundError('x') instanceof Error).toBe(true);
    expect(new SnapshotNotFoundError('x') instanceof Error).toBe(true);
    expect(new SnapshotCorruptedError('x', 'r') instanceof Error).toBe(true);
  });
});
