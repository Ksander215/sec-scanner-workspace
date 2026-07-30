import { describe, it, expect } from 'vitest';
import {
  SessionError, SessionNotFoundError, SessionStateError, SessionAlreadyExistsError,
} from '../../../core/session/errors.js';

describe('SessionErrors', () => {
  it('SessionError has code', () => {
    const err = new SessionError('test', 'SESSION_CODE');
    expect(err.code).toBe('SESSION_CODE');
    expect(err.name).toBe('SessionError');
    expect(err).toBeInstanceOf(Error);
  });

  it('SessionNotFoundError has sessionId', () => {
    const err = new SessionNotFoundError('sess-1');
    expect(err.code).toBe('SESSION_NOT_FOUND');
    expect(err.sessionId).toBe('sess-1');
    expect(err).toBeInstanceOf(SessionError);
  });

  it('SessionStateError has from and to states', () => {
    const err = new SessionStateError('Created', 'Archived', 'invalid');
    expect(err.code).toBe('SESSION_INVALID_STATE');
    expect(err.from).toBe('Created');
    expect(err.to).toBe('Archived');
    expect(err).toBeInstanceOf(SessionError);
  });

  it('SessionAlreadyExistsError has sessionId', () => {
    const err = new SessionAlreadyExistsError('sess-1');
    expect(err.code).toBe('SESSION_ALREADY_EXISTS');
    expect(err.sessionId).toBe('sess-1');
    expect(err).toBeInstanceOf(SessionError);
  });

  it('all errors are instanceof Error', () => {
    expect(new SessionError('m', 'c') instanceof Error).toBe(true);
    expect(new SessionNotFoundError('x') instanceof Error).toBe(true);
    expect(new SessionStateError('a', 'b', 'm') instanceof Error).toBe(true);
    expect(new SessionAlreadyExistsError('x') instanceof Error).toBe(true);
  });

  it('error messages contain useful info', () => {
    const err = new SessionStateError('Running', 'Created', 'backward');
    expect(err.message).toContain('Running');
    expect(err.message).toContain('Created');
  });
});
