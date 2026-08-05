/**
 * Autonomous Architecture Runtime — Architecture Runtime Lifecycle Smoke Tests
 * TASK-AIS-012A.025
 */

import { describe, it, expect } from 'vitest';
import {
  ArchitectureRuntimeLifecycle,
  ArchitectureRuntimeTransition,
  ArchitectureRuntimeStatus,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureRuntimeLifecycle', () => {
  const t1 = new ArchitectureRuntimeTransition(
    ArchitectureRuntimeStatus.Created,
    ArchitectureRuntimeStatus.Ready,
  );
  const t2 = new ArchitectureRuntimeTransition(
    ArchitectureRuntimeStatus.Ready,
    ArchitectureRuntimeStatus.Running,
  );
  const t3 = new ArchitectureRuntimeTransition(
    ArchitectureRuntimeStatus.Running,
    ArchitectureRuntimeStatus.Stopped,
  );

  it('should construct with transitions array', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1, t2, t3]);
    expect(lifecycle).toBeInstanceOf(ArchitectureRuntimeLifecycle);
  });

  it('should support empty lifecycle', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([]);
    expect(lifecycle).toBeInstanceOf(ArchitectureRuntimeLifecycle);
    expect(lifecycle.getTransitionCount()).toBe(0);
  });

  it('should store a single transition', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1]);
    expect(lifecycle.getTransitionCount()).toBe(1);
    expect(lifecycle.getTransitions()).toHaveLength(1);
  });

  it('should store multiple transitions', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1, t2, t3]);
    expect(lifecycle.getTransitionCount()).toBe(3);
  });

  it('should return transitions via getTransitions', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1, t2]);
    const transitions = lifecycle.getTransitions();
    expect(transitions).toHaveLength(2);
    expect(transitions[0]).toBe(t1);
    expect(transitions[1]).toBe(t2);
  });

  it('should return same reference on repeated getTransitions calls', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1, t2]);
    expect(lifecycle.getTransitions()).toBe(lifecycle.getTransitions());
  });

  it('should return transition count via getTransitionCount', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1, t2, t3]);
    expect(lifecycle.getTransitionCount()).toBe(3);
  });

  it('should return true from isEmpty when empty', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([]);
    expect(lifecycle.isEmpty()).toBe(true);
  });

  it('should return false from isEmpty when not empty', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1]);
    expect(lifecycle.isEmpty()).toBe(false);
  });

  it('should hold immutable reference', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1, t2]);
    const before = lifecycle.getTransitions().length;
    lifecycle.getTransitions();
    lifecycle.getTransitionCount();
    lifecycle.isEmpty();
    expect(lifecycle.getTransitions().length).toBe(before);
  });

  it('should have no side effects on getter calls', () => {
    const lifecycle = new ArchitectureRuntimeLifecycle([t1, t2, t3]);
    const countBefore = lifecycle.getTransitionCount();
    const emptyBefore = lifecycle.isEmpty();
    lifecycle.getTransitions();
    lifecycle.getTransitionCount();
    lifecycle.isEmpty();
    lifecycle.getTransitions();
    expect(lifecycle.getTransitionCount()).toBe(countBefore);
    expect(lifecycle.isEmpty()).toBe(emptyBefore);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureRuntimeLifecycle).toBeDefined();
    expect(typeof ArchitectureRuntimeLifecycle).toBe('function');
  });
});
