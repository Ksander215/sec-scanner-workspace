import { describe, it, expect } from 'vitest';
import { createSessionFSM } from '../../../core/session/session-state.js';
import { SessionState } from '../../../core/session/types.js';

describe('SessionFSM', () => {
  it('Created -> Running is valid', () => {
    const fsm = createSessionFSM(); expect(fsm.canTransition(SessionState.Running)).toBe(true);
  });

  it('Running -> Paused is valid', () => {
    const fsm2 = createSessionFSM(); fsm2.transition(SessionState.Running); expect(fsm2.canTransition(SessionState.Paused)).toBe(true);
  });

  it('Paused -> Running is valid', () => {
    const fsm3 = createSessionFSM(); fsm3.transition(SessionState.Running); fsm3.transition(SessionState.Paused); expect(fsm3.canTransition(SessionState.Running)).toBe(true);
  });

  it('Running -> Completed is valid', () => {
    const fsm4 = createSessionFSM(); fsm4.transition(SessionState.Running); expect(fsm4.canTransition(SessionState.Completed)).toBe(true);
  });

  it('Completed -> Archived is valid', () => {
    const fsm5 = createSessionFSM(); fsm5.transition(SessionState.Running); fsm5.transition(SessionState.Completed); expect(fsm5.canTransition(SessionState.Archived)).toBe(true);
  });

  it('Created -> Completed is invalid', () => {
    const fsm6 = createSessionFSM(); expect(fsm6.canTransition(SessionState.Completed)).toBe(false);
  });

  it('Created -> Paused is invalid', () => {
    const fsm7 = createSessionFSM(); expect(fsm7.canTransition(SessionState.Paused)).toBe(false);
  });

  it('Archived -> any is invalid', () => {
    const fsm = createSessionFSM();
    fsm.transition(SessionState.Running);
    fsm.transition(SessionState.Completed);
    fsm.transition(SessionState.Archived);
    expect(fsm.canTransition(SessionState.Running)).toBe(false);
    expect(fsm.canTransition(SessionState.Created)).toBe(false);
  });

  it('transition throws for invalid transitions', () => {
    const fsm = createSessionFSM();
    expect(() => fsm.transition(SessionState.Completed)).toThrow();
  });

  it('transition updates state for valid transitions', () => {
    const fsm = createSessionFSM();
    fsm.transition(SessionState.Running);
    expect(fsm.currentState).toBe(SessionState.Running);
  });

  it('all 5 defined transitions work', () => {
    const fsm = createSessionFSM();
    fsm.transition(SessionState.Running);
    expect(fsm.currentState).toBe(SessionState.Running);
    fsm.transition(SessionState.Paused);
    expect(fsm.currentState).toBe(SessionState.Paused);
    fsm.transition(SessionState.Running);
    expect(fsm.currentState).toBe(SessionState.Running);
    fsm.transition(SessionState.Completed);
    expect(fsm.currentState).toBe(SessionState.Completed);
    fsm.transition(SessionState.Archived);
    expect(fsm.currentState).toBe(SessionState.Archived);
  });

  it('Running -> Archived is invalid', () => {
    const fsm8 = createSessionFSM(); fsm8.transition(SessionState.Running); expect(fsm8.canTransition(SessionState.Archived)).toBe(false);
  });

  it('Paused -> Completed is invalid', () => {
    const fsm9 = createSessionFSM(); fsm9.transition(SessionState.Running); fsm9.transition(SessionState.Paused); expect(fsm9.canTransition(SessionState.Completed)).toBe(false);
  });
});
