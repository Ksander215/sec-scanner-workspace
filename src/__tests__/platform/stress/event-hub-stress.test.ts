import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformEventHub } from '../../../platform/event-hub/event-hub.js';

describe('EventHub Stress', () => {
  let h: PlatformEventHub;
  beforeEach(() => { h = new PlatformEventHub(); });

  it('500 events', async () => {
    for (let i = 0; i < 500; i++) await h.publish('t', { i });
    expect(h.getSequence()).toBe(500);
  });
  it('1000 events', async () => {
    for (let i = 0; i < 1000; i++) await h.publish('t', {});
    expect(h.getSequence()).toBe(1000);
  });
  it('500 events with subscriber', async () => {
    let count = 0;
    h.subscribe('t', () => count++);
    for (let i = 0; i < 500; i++) await h.publish('t', {});
    expect(count).toBe(500);
  });
  it('50 different event types', async () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 50; i++) {
      const type = `type-${i}`;
      h.subscribe(type, () => counts.set(type, (counts.get(type) ?? 0) + 1));
      await h.publish(type, {});
    }
    expect(counts.size).toBe(50);
  });
  it('100 subscribers on same event type', async () => {
    const subs: Array<ReturnType<typeof h.subscribe>> = [];
    let total = 0;
    for (let i = 0; i < 100; i++) subs.push(h.subscribe('t', () => total++));
    await h.publish('t', {});
    expect(total).toBe(100);
    for (const s of subs) s.unsubscribe();
  });
  it('filter log by non-existent type', async () => {
    await h.publish('a', {});
    expect(h.getEventLog('z')).toHaveLength(0);
  });
  it('log grows correctly', async () => {
    for (let i = 0; i < 100; i++) await h.publish('t', {});
    expect(h.getEventLog()).toHaveLength(100);
    expect(h.getEventLog('t')).toHaveLength(100);
  });
  it('clear and repopulate', async () => {
    for (let i = 0; i < 50; i++) await h.publish('t', {});
    h.clear();
    expect(h.getSequence()).toBe(0);
    for (let i = 0; i < 30; i++) await h.publish('t', {});
    expect(h.getSequence()).toBe(30);
  });
  it('mixed event types in log', async () => {
    await h.publish('a', {});
    await h.publish('b', {});
    await h.publish('a', {});
    await h.publish('c', {});
    expect(h.getEventLog('a')).toHaveLength(2);
    expect(h.getEventLog()).toHaveLength(4);
  });
  it('subscriber throws but others continue', async () => {
    const results: number[] = [];
    for (let i = 0; i < 10; i++) {
      if (i % 3 === 0) h.subscribe('t', () => { throw new Error('fail'); });
      else h.subscribe('t', () => results.push(i));
    }
    await h.publish('t', {});
    expect(results.length).toBeGreaterThan(0);
  });
  it('event IDs are unique', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const e = await h.publish('t', {});
      ids.add(e.eventId);
    }
    expect(ids.size).toBe(100);
  });
  it('timestamps are monotonic', async () => {
    const ts: string[] = [];
    for (let i = 0; i < 50; i++) {
      const e = await h.publish('t', {});
      ts.push(e.timestamp);
    }
    for (let i = 1; i < ts.length; i++) {
      expect(new Date(ts[i]).getTime()).toBeGreaterThanOrEqual(new Date(ts[i-1]).getTime() - 1);
    }
  });
  it('200 events with 10 subscribers each', async () => {
    let total = 0;
    for (let i = 0; i < 10; i++) h.subscribe('t', () => total++);
    for (let i = 0; i < 200; i++) await h.publish('t', {});
    expect(total).toBe(2000);
  });
});
