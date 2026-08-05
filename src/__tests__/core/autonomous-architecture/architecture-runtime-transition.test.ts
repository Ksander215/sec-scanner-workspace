/**
 * Autonomous Architecture Runtime — Architecture Runtime Transition Smoke Tests
 * TASK-AIS-012A.024
 */

import { describe, it, expect } from 'vitest';
import {
  ArchitectureRuntimeTransition,
  ArchitectureRuntimeStatus,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureRuntimeTransition', () => {
  it('should construct with from and to statuses', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Created,
      ArchitectureRuntimeStatus.Ready,
    );
    expect(transition).toBeInstanceOf(ArchitectureRuntimeTransition);
  });

  it('should store from status', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Created,
      ArchitectureRuntimeStatus.Ready,
    );
    expect(transition.getFrom()).toBe(ArchitectureRuntimeStatus.Created);
  });

  it('should store to status', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Created,
      ArchitectureRuntimeStatus.Ready,
    );
    expect(transition.getTo()).toBe(ArchitectureRuntimeStatus.Ready);
  });

  it('should return from via getFrom', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Ready,
      ArchitectureRuntimeStatus.Running,
    );
    expect(transition.getFrom()).toBe(ArchitectureRuntimeStatus.Ready);
  });

  it('should return to via getTo', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Ready,
      ArchitectureRuntimeStatus.Running,
    );
    expect(transition.getTo()).toBe(ArchitectureRuntimeStatus.Running);
  });

  it('should return same value on repeated getFrom calls', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Created,
      ArchitectureRuntimeStatus.Ready,
    );
    expect(transition.getFrom()).toBe(transition.getFrom());
  });

  it('should return same value on repeated getTo calls', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Created,
      ArchitectureRuntimeStatus.Ready,
    );
    expect(transition.getTo()).toBe(transition.getTo());
  });

  it('should have immutable fields', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Running,
      ArchitectureRuntimeStatus.Stopped,
    );
    const fromBefore = transition.getFrom();
    const toBefore = transition.getTo();
    transition.getFrom();
    transition.getTo();
    expect(transition.getFrom()).toBe(fromBefore);
    expect(transition.getTo()).toBe(toBefore);
  });

  it('should have no side effects on getter calls', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Created,
      ArchitectureRuntimeStatus.Ready,
    );
    const v1 = transition.getFrom();
    const v2 = transition.getTo();
    transition.getFrom();
    transition.getTo();
    transition.getFrom();
    expect(transition.getFrom()).toBe(v1);
    expect(transition.getTo()).toBe(v2);
  });

  it('should support same from and to states', () => {
    const transition = new ArchitectureRuntimeTransition(
      ArchitectureRuntimeStatus.Created,
      ArchitectureRuntimeStatus.Created,
    );
    expect(transition.getFrom()).toBe(ArchitectureRuntimeStatus.Created);
    expect(transition.getTo()).toBe(ArchitectureRuntimeStatus.Created);
  });

  it('should not mutate original values', () => {
    const from = ArchitectureRuntimeStatus.Created;
    const to = ArchitectureRuntimeStatus.Running;
    const transition = new ArchitectureRuntimeTransition(from, to);
    expect(from).toBe(ArchitectureRuntimeStatus.Created);
    expect(to).toBe(ArchitectureRuntimeStatus.Running);
    expect(transition.getFrom()).toBe(from);
    expect(transition.getTo()).toBe(to);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureRuntimeTransition).toBeDefined();
    expect(typeof ArchitectureRuntimeTransition).toBe('function');
  });
});
