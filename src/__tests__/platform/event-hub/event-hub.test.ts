import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformEventHub } from '../../../platform/event-hub/event-hub.js';

describe('PlatformEventHub', () => {
  let hub: PlatformEventHub;
  beforeEach(() => { hub = new PlatformEventHub(); });

  it('publishes an event', async () => {
    const e = await hub.publish('test', { x: 1 });
    expect(e.eventType).toBe('test');
    expect(e.payload).toEqual({ x: 1 });
    expect(e.sequence).toBe(1);
  });
  it('generates unique eventId', async () => {
    const e1 = await hub.publish('a', {});
    const e2 = await hub.publish('b', {});
    expect(e1.eventId).not.toBe(e2.eventId);
  });
  it('increments sequence', async () => {
    await hub.publish('a', {});
    await hub.publish('b', {});
    expect(hub.getSequence()).toBe(2);
  });
  it('subscribes and receives event', async () => {
    let received = false;
    hub.subscribe('test', () => { received = true; });
    await hub.publish('test', {});
    expect(received).toBe(true);
  });
  it('does not receive different event type', async () => {
    let received = false;
    hub.subscribe('a', () => { received = true; });
    await hub.publish('b', {});
    expect(received).toBe(false);
  });
  it('unsubscribe stops events', async () => {
    let count = 0;
    const sub = hub.subscribe('test', () => { count++; });
    await hub.publish('test', {});
    sub.unsubscribe();
    await hub.publish('test', {});
    expect(count).toBe(1);
  });
  it('multiple subscribers receive same event', async () => {
    const results: number[] = [];
    hub.subscribe('test', () => results.push(1));
    hub.subscribe('test', () => results.push(2));
    await hub.publish('test', {});
    expect(results).toEqual([1, 2]);
  });
  it('subscribeAll receives all events', async () => {
    const types: string[] = [];
    hub.subscribeAll((e) => types.push(e.eventType));
    await hub.publish('a', {});
    await hub.publish('b', {});
    expect(types).toEqual(['a', 'b']);
  });
  it('failing subscriber does not block others', async () => {
    const results: number[] = [];
    hub.subscribe('test', () => { throw new Error('fail'); });
    hub.subscribe('test', () => results.push(1));
    await hub.publish('test', {});
    expect(results).toEqual([1]);
  });
  it('event log records all events', async () => {
    await hub.publish('a', {});
    await hub.publish('b', {});
    expect(hub.getEventLog()).toHaveLength(2);
  });
  it('getEventLog filters by type', async () => {
    await hub.publish('a', {});
    await hub.publish('b', {});
    await hub.publish('a', {});
    expect(hub.getEventLog('a')).toHaveLength(2);
  });
  it('clear removes all events', async () => {
    await hub.publish('a', {});
    hub.clear();
    expect(hub.getSequence()).toBe(0);
    expect(hub.getEventLog()).toHaveLength(0);
  });
  it('async subscriber works', async () => {
    let val = 0;
    hub.subscribe('test', async () => { val = 42; });
    await hub.publish('test', {});
    expect(val).toBe(42);
  });
  it('sets source correctly', async () => {
    const e = await hub.publish('test', {}, 'my-source');
    expect(e.source).toBe('my-source');
  });
  it('default source is platform', async () => {
    const e = await hub.publish('test', {});
    expect(e.source).toBe('platform');
  });
  it('handles 100 events', async () => {
    let count = 0;
    hub.subscribe('test', () => count++);
    for (let i = 0; i < 100; i++) await hub.publish('test', { i });
    expect(count).toBe(100);
  });
  it('payload is frozen', async () => {
    const e = await hub.publish('test', { x: 1 });
    expect(Object.isFrozen(e)).toBe(true);
  });
});
