/**
 * Recovery Error Tests
 *
 * Tests for RecoveryError hierarchy:
 * RecoveryError, RecoveryNotFoundError, RecoveryStateError,
 * SessionRecoveryError, MemoryRecoveryError, PipelineRecoveryError.
 */
import { describe, it, expect } from 'vitest';
import {
  RecoveryError,
  RecoveryNotFoundError,
  RecoveryStateError,
  SessionRecoveryError,
  MemoryRecoveryError,
  PipelineRecoveryError,
} from '../../../core/recovery/errors.js';

describe('RecoveryErrors', () => {
  // RecoveryError
  it('RecoveryError has code', () => {
    const err = new RecoveryError('test error', 'TEST_CODE');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test error');
    expect(err.name).toBe('RecoveryError');
  });
  it('RecoveryError is instanceof Error', () => {
    const err = new RecoveryError('test', 'CODE');
    expect(err instanceof Error, 'RecoveryError should extend Error').toBe(true);
  });
  it('RecoveryError has optional recoveryId', () => {
    const err = new RecoveryError('test', 'CODE', 'rec-123');
    expect(err.recoveryId).toBe('rec-123');
  });
  it('RecoveryError recoveryId defaults to undefined', () => {
    const err = new RecoveryError('test', 'CODE');
    expect(err.recoveryId).toBe(undefined);
  });

  // RecoveryNotFoundError
  it('RecoveryNotFoundError has code RECOVERY_NOT_FOUND', () => {
    const err = new RecoveryNotFoundError('rec-123');
    expect(err.code).toBe('RECOVERY_NOT_FOUND');
    expect(err.recoveryId).toBe('rec-123');
    expect(err.name).toBe('RecoveryNotFoundError');
  });

  // RecoveryStateError
  it('RecoveryStateError has code RECOVERY_INVALID_STATE', () => {
    const err = new RecoveryStateError('invalid transition');
    expect(err.code).toBe('RECOVERY_INVALID_STATE');
    expect(err.message).toBe('invalid transition');
    expect(err.name).toBe('RecoveryStateError');
  });

  // SessionRecoveryError
  it('SessionRecoveryError has code SESSION_RECOVERY_FAILED', () => {
    const err = new SessionRecoveryError('session failed');
    expect(err.code).toBe('SESSION_RECOVERY_FAILED');
    expect(err.message).toBe('session failed');
    expect(err.name).toBe('SessionRecoveryError');
  });

  // MemoryRecoveryError
  it('MemoryRecoveryError has code MEMORY_RECOVERY_FAILED', () => {
    const err = new MemoryRecoveryError('memory failed');
    expect(err.code).toBe('MEMORY_RECOVERY_FAILED');
    expect(err.message).toBe('memory failed');
    expect(err.name).toBe('MemoryRecoveryError');
  });

  // PipelineRecoveryError
  it('PipelineRecoveryError has code PIPELINE_RECOVERY_FAILED', () => {
    const err = new PipelineRecoveryError('pipeline failed');
    expect(err.code).toBe('PIPELINE_RECOVERY_FAILED');
    expect(err.message).toBe('pipeline failed');
    expect(err.name).toBe('PipelineRecoveryError');
  });

  // All errors extend RecoveryError
  it('All errors extend RecoveryError', () => {
    expect(new RecoveryNotFoundError('x') instanceof RecoveryError).toBe(true);
    expect(new RecoveryStateError('x') instanceof RecoveryError).toBe(true);
    expect(new SessionRecoveryError('x') instanceof RecoveryError).toBe(true);
    expect(new MemoryRecoveryError('x') instanceof RecoveryError).toBe(true);
    expect(new PipelineRecoveryError('x') instanceof RecoveryError).toBe(true);
  });
});
