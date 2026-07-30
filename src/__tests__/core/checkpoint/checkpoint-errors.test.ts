import { describe, it, expect } from 'vitest';
import {
  CheckpointError, CheckpointNotFoundError, CheckpointCorruptedError, CheckpointStateError,
} from '../../../core/checkpoint/errors.js';

describe('CheckpointErrors', () => {
  it('CheckpointError has code', () => {
    const err = new CheckpointError('test', 'CP_CODE');
    expect(err.code).toBe('CP_CODE');
    expect(err.name).toBe('CheckpointError');
    expect(err).toBeInstanceOf(Error);
  });

  it('CheckpointNotFoundError has checkpointId', () => {
    const err = new CheckpointNotFoundError('cp-1');
    expect(err.code).toBe('CHECKPOINT_NOT_FOUND');
    expect(err.checkpointId).toBe('cp-1');
    expect(err).toBeInstanceOf(CheckpointError);
  });

  it('CheckpointCorruptedError has contextId', () => {
    const err = new CheckpointCorruptedError('invalid data', 'ctx-1');
    expect(err.code).toBe('CHECKPOINT_CORRUPTED');
    expect(err.contextId).toBe('ctx-1');
    expect(err).toBeInstanceOf(CheckpointError);
  });

  it('CheckpointStateError has currentStatus', () => {
    const err = new CheckpointStateError('consumed');
    expect(err.code).toBe('CHECKPOINT_INVALID_STATE');
    expect(err.currentStatus).toBe('consumed');
    expect(err).toBeInstanceOf(CheckpointError);
  });

  it('all errors are instanceof Error', () => {
    expect(new CheckpointError('m', 'c') instanceof Error).toBe(true);
    expect(new CheckpointNotFoundError('x') instanceof Error).toBe(true);
    expect(new CheckpointCorruptedError('x', 'c') instanceof Error).toBe(true);
    expect(new CheckpointStateError('s') instanceof Error).toBe(true);
  });
});
