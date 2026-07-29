import { describe, it, expect } from 'vitest';
import {
  CancellationTokenImpl,
} from '../core/pipeline/cancellation-token.js';

describe('CancellationToken', () => {
  it('starts uncancelled', () => {
    const token = new CancellationTokenImpl();
    expect(token.cancelled).toBe(false);
    expect(token.reason).toBeUndefined();
  });

  it('transitions to cancelled', () => {
    const token = new CancellationTokenImpl();
    token.cancel('test reason');
    expect(token.cancelled).toBe(true);
    expect(token.reason).toBe('test reason');
  });

  it('invokes callbacks registered before cancel', () => {
    const token = new CancellationTokenImpl();
    let called = false;
    token.onCancel(() => { called = true; });
    token.cancel();
    expect(called).toBe(true);
  });

  it('invokes callbacks immediately if already cancelled', () => {
    const token = new CancellationTokenImpl();
    token.cancel();
    let called = false;
    token.onCancel(() => { called = true; });
    expect(called).toBe(true);
  });

  it('supports multiple callbacks', () => {
    const token = new CancellationTokenImpl();
    const calls: number[] = [];
    token.onCancel(() => calls.push(1));
    token.onCancel(() => calls.push(2));
    token.cancel();
    expect(calls).toEqual([1, 2]);
  });

  it('callbacks are not called after first cancel', () => {
    const token = new CancellationTokenImpl();
    const calls: number[] = [];
    token.onCancel(() => calls.push(1));
    token.cancel();
    token.cancel('second'); // should be no-op
    expect(calls).toHaveLength(1);
  });

  it('callbacks that throw do not block other callbacks', () => {
    const token = new CancellationTokenImpl();
    const calls: number[] = [];
    token.onCancel(() => { throw new Error('cb1'); });
    token.onCancel(() => calls.push(2));
    token.cancel();
    expect(calls).toEqual([2]);
  });

  it('throwIfCancelled does nothing when not cancelled', () => {
    const token = new CancellationTokenImpl();
    expect(() => token.throwIfCancelled()).not.toThrow();
  });

  it('throwIfCancelled throws when cancelled', () => {
    const token = new CancellationTokenImpl();
    token.cancel('reason');
    expect(() => token.throwIfCancelled()).toThrow('Execution cancelled: reason');
  });

  it('cancel without reason still works', () => {
    const token = new CancellationTokenImpl();
    token.cancel();
    expect(token.cancelled).toBe(true);
    expect(token.reason).toBeUndefined();
    expect(() => token.throwIfCancelled()).toThrow('Execution cancelled: no reason provided');
  });
});
