/**
 * Memory Error Hierarchy Tests
 */
import { describe, it, expect } from 'vitest';
import {
  MemoryError,
  MemoryEntryNotFoundError,
  MemoryIsolationViolationError,
  MemoryCapacityError,
  MemorySerializationError,
  MemoryDeserializationError,
} from '../../../core/memory/errors.js';

describe('MemoryErrors', () => {
  it('MemoryError has correct code', () => {
    const err = new MemoryError('test', 'TEST_CODE');
    expect(err.name).toBe('MemoryError');
    expect(err.code).toBe('TEST_CODE');
    expect(err instanceof Error).toBe(true);
  });
  it('MemoryEntryNotFoundError has key and layer', () => {
    const err = new MemoryEntryNotFoundError('my-key', 'working');
    expect(err.name).toBe('MemoryEntryNotFoundError');
    expect(err.code).toBe('MEMORY_ENTRY_NOT_FOUND');
    expect(err.key).toBe('my-key');
    expect(err.layer).toBe('working');
    expect(err instanceof MemoryError).toBe(true);
  });
  it('MemoryEntryNotFoundError without layer', () => {
    const err = new MemoryEntryNotFoundError('my-key');
    expect(err.key).toBe('my-key');
    expect(err.layer).toBe(undefined);
  });
  it('MemoryIsolationViolationError has sessionIds', () => {
    const err = new MemoryIsolationViolationError('sess-a', 'sess-b');
    expect(err.name).toBe('MemoryIsolationViolationError');
    expect(err.code).toBe('MEMORY_ISOLATION_VIOLATION');
    expect(err.sessionId).toBe('sess-a');
    expect(err.accessorSessionId).toBe('sess-b');
    expect(err instanceof MemoryError).toBe(true);
  });
  it('MemoryCapacityError has layer and maxEntries', () => {
    const err = new MemoryCapacityError('working', 100);
    expect(err.name).toBe('MemoryCapacityError');
    expect(err.code).toBe('MEMORY_CAPACITY_EXCEEDED');
    expect(err.layer).toBe('working');
    expect(err.maxEntries).toBe(100);
    expect(err instanceof MemoryError).toBe(true);
  });
  it('MemorySerializationError has correct code', () => {
    const err = new MemorySerializationError('bad data');
    expect(err.name).toBe('MemorySerializationError');
    expect(err.code).toBe('MEMORY_SERIALIZATION_FAILED');
    expect(err instanceof MemoryError).toBe(true);
  });
  it('MemoryDeserializationError has correct code', () => {
    const err = new MemoryDeserializationError('bad json');
    expect(err.name).toBe('MemoryDeserializationError');
    expect(err.code).toBe('MEMORY_DESERIALIZATION_FAILED');
    expect(err instanceof MemoryError).toBe(true);
  });
  it('all errors are instances of Error', () => {
    expect(new MemoryError('m', 'c') instanceof Error).toBe(true);
    expect(new MemoryEntryNotFoundError('k') instanceof Error).toBe(true);
    expect(new MemoryIsolationViolationError('a', 'b') instanceof Error).toBe(true);
    expect(new MemoryCapacityError('w', 1) instanceof Error).toBe(true);
    expect(new MemorySerializationError() instanceof Error).toBe(true);
    expect(new MemoryDeserializationError() instanceof Error).toBe(true);
  });
  it('MemoryError with optional entryId', () => {
    const err = new MemoryError('test', 'CODE', 'entry-123');
    expect(err.entryId).toBe('entry-123');
  });
  it('error message contains useful info', () => {
    const err = new MemoryEntryNotFoundError('my-key', 'session');
    expect(err.message.includes('my-key')).toBe(true);
    expect(err.message.includes('session')).toBe(true);
  });
});
