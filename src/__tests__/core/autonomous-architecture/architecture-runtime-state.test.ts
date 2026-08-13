/**
 * Autonomous Architecture Runtime — Architecture Runtime State Smoke Tests
 * TASK-AIS-012A.023
 */

import { describe, it, expect } from 'vitest';
import {
  ArchitectureRuntimeState,
  ArchitectureRuntimeStatus,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureRuntimeState', () => {
  it('should construct with a status', () => {
    const state = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Created);
    expect(state).toBeInstanceOf(ArchitectureRuntimeState);
  });

  it('should return status via getStatus', () => {
    const state = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Created);
    expect(state.getStatus()).toBe(ArchitectureRuntimeStatus.Created);
  });

  it('should store Created status', () => {
    const state = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Created);
    expect(state.getStatus()).toBe(ArchitectureRuntimeStatus.Created);
  });

  it('should store Ready status', () => {
    const state = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Ready);
    expect(state.getStatus()).toBe(ArchitectureRuntimeStatus.Ready);
  });

  it('should store Running status', () => {
    const state = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Running);
    expect(state.getStatus()).toBe(ArchitectureRuntimeStatus.Running);
  });

  it('should store Stopped status', () => {
    const state = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Stopped);
    expect(state.getStatus()).toBe(ArchitectureRuntimeStatus.Stopped);
  });

  it('should return same value on repeated getter calls', () => {
    const state = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Running);
    expect(state.getStatus()).toBe(state.getStatus());
  });

  it('should be immutable — different instances do not share state', () => {
    const state1 = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Created);
    const state2 = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Running);
    expect(state1.getStatus()).toBe(ArchitectureRuntimeStatus.Created);
    expect(state2.getStatus()).toBe(ArchitectureRuntimeStatus.Running);
  });

  it('should have no side effects on getter calls', () => {
    const state = new ArchitectureRuntimeState(ArchitectureRuntimeStatus.Ready);
    const before = state.getStatus();
    state.getStatus();
    state.getStatus();
    const after = state.getStatus();
    expect(after).toBe(before);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureRuntimeState).toBeDefined();
    expect(typeof ArchitectureRuntimeState).toBe('function');
  });

  it('should have enum publicly exported', () => {
    expect(ArchitectureRuntimeStatus).toBeDefined();
    expect(ArchitectureRuntimeStatus.Created).toBe(0);
    expect(ArchitectureRuntimeStatus.Ready).toBe(1);
    expect(ArchitectureRuntimeStatus.Running).toBe(2);
    expect(ArchitectureRuntimeStatus.Stopped).toBe(3);
  });
});
