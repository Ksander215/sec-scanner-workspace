import { describe, it, expect } from 'vitest';
import { SessionRuntime } from '../../../core/session/session-runtime.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { SessionState } from '../../../core/session/types.js';
import { EventClassification } from '../../../core/types/common.js';

describe('SessionRuntime', () => {
  it('creates a session in Created state', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    expect(session.state).toBe(SessionState.Created);
    expect(session.id).toBeDefined();
    expect(session.createdAt).toBeDefined();
  });

  it('creates session with metadata', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession({ tag: 'test', env: 'dev' });
    expect(session.metadata.tag).toBe('test');
    expect(session.metadata.env).toBe('dev');
  });

  it('starts a session (Created -> Running)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Running);
  });

  it('pauses a session (Running -> Paused)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    await runtime.pauseSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Paused);
  });

  it('resumes a session (Paused -> Running)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    await runtime.pauseSession(session.id);
    await runtime.resumeSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Running);
  });

  it('completes a session (Running -> Completed)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    await runtime.completeSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Completed);
  });

  it('archives a session (Completed -> Archived)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    await runtime.completeSession(session.id);
    await runtime.archiveSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Archived);
  });

  it('invalid transition throws', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await expect(runtime.completeSession(session.id)).rejects.toThrow();
  });

  it('getSession returns null for unknown', () => {
    const runtime = new SessionRuntime();
    expect(runtime.getSession('unknown')).toBeNull();
  });

  it('listSessions returns all sessions', async () => {
    const runtime = new SessionRuntime();
    await runtime.createSession();
    await runtime.createSession();
    expect(runtime.listSessions()).toHaveLength(2);
  });

  it('multiple sessions are isolated', async () => {
    const runtime = new SessionRuntime();
    const s1 = await runtime.createSession();
    const s2 = await runtime.createSession();
    await runtime.startSession(s1.id);
    expect(runtime.getSession(s2.id)!.state).toBe(SessionState.Created);
    expect(runtime.getSession(s1.id)!.state).toBe(SessionState.Running);
  });

  it('publishes SessionCreated event', async () => {
    const bus = new InProcessEventBus();
    const runtime = new SessionRuntime({ eventBus: bus });
    await runtime.createSession();
    const log = bus.getLog();
    expect(log.some(e => e.eventType === 'SessionCreated')).toBe(true);
  });

  it('events have correct classification', async () => {
    const bus = new InProcessEventBus();
    const runtime = new SessionRuntime({ eventBus: bus });
    await runtime.createSession();
    const log = bus.getLog();
    const created = log.find(e => e.eventType === 'SessionCreated');
    expect(created!.classification).toBe(EventClassification.StateChange);
  });

  it('serialize and deserialize round-trip', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession({ tag: 'ser-test' });
    // Do NOT start — serialize in Created state
    const serialized = runtime.serializeSession(session);
    const deserialized = runtime.deserializeSession(serialized);
    expect(deserialized.id).toBe(session.id);
    expect(deserialized.state).toBe(SessionState.Created);
    expect(deserialized.metadata.tag).toBe('ser-test');
  });

  it('branded ID round-trips correctly', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    const serialized = runtime.serializeSession(session);
    expect(typeof serialized.id).toBe('string');
    const deserialized = runtime.deserializeSession(serialized);
    expect(deserialized.id).toBe(session.id);
  });

  it('records executions', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    runtime.recordExecution(session.id, 'exec-1');
    const updated = runtime.getSession(session.id)!;
    expect(updated.executionCount).toBe(1);
    expect(updated.lastExecutionId).toBe('exec-1');
  });
});
