import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformEventHub } from '../../../platform/event-hub/event-hub.js';

describe('PlatformEventHub Extended', () => {
  let hub: PlatformEventHub;
  beforeEach(() => { hub = new PlatformEventHub(); });

  it('event has version 1', async () => {
    const e = await hub.publish('t', {});
    expect(e.version).toBe(1);
  });
  it('timestamp is ISO string', async () => {
    const e = await hub.publish('t', {});
    expect(new Date(e.timestamp).getTime()).not.toBeNaN();
  });
  it('sequence starts at 1', async () => {
    const e = await hub.publish('t', {});
    expect(e.sequence).toBe(1);
  });
  it('sequence increments correctly', async () => {
    for (let i = 0; i < 50; i++) await hub.publish('t', {});
    expect(hub.getSequence()).toBe(50);
  });
  it('getEventLog returns array with events', async () => {
    await hub.publish('t', {});
    const log = hub.getEventLog();
    expect(log).toHaveLength(1);
    expect(log[0].eventType).toBe('t');
  });
  it('unsubscribing from non-existent handler does not throw', () => {
    const sub = hub.subscribe('t', () => {});
    sub.unsubscribe();
    sub.unsubscribe(); // second time
    expect(hub.getSequence()).toBe(0);
  });
  it('subscriber receives correct payload type', async () => {
    interface MyPayload { count: number; }
    let received: MyPayload | undefined;
    hub.subscribe('typed', (e) => { received = e.payload as MyPayload; });
    await hub.publish('typed', { count: 42 });
    expect(received?.count).toBe(42);
  });
  it('handles large payload', async () => {
    const large = Array(10000).fill('x').join('');
 let received = '';
    hub.subscribe('big', (e) => { received = e.payload as string; });
    await hub.publish('big', large);
    expect(received.length).toBe(10000);
  });
  it('handles rapid fire events', async () => {
    let count = 0;
    hub.subscribe('rapid', () => count++);
    const promises = [];
    for (let i = 0; i < 500; i++) promises.push(hub.publish('rapid', {}));
    await Promise.all(promises);
    expect(count).toBe(500);
  });
  it('multiple event types with shared subscriber', async () => {
    const types: string[] = [];
    hub.subscribeAll((e) => types.push(e.eventType));
    await hub.publish('a', {});
    await hub.publish('b', {});
    await hub.publish('c', {});
    expect(types).toEqual(['a', 'b', 'c']);
  });
  it('unsubscribe from subscribeAll', async () => {
    let count = 0;
    const sub = hub.subscribeAll(() => count++);
    await hub.publish('a', {});
    sub.unsubscribe();
    await hub.publish('b', {});
    expect(count).toBe(1);
  });
  it('empty string event type works', async () => {
    let received = false;
    hub.subscribe('', () => { received = true; });
    await hub.publish('', {});
    expect(received).toBe(true);
  });
  it('numeric payload', async () => {
    let val = 0;
    hub.subscribe('num', (e) => { val = e.payload as number; });
    await hub.publish('num', 42.5);
    expect(val).toBe(42.5);
  });
  it('null payload', async () => {
    let val: unknown = 'init';
    hub.subscribe('null', (e) => { val = e.payload; });
    await hub.publish('null', null);
    expect(val).toBeNull();
  });
  it('boolean payload', async () => {
    let val = false;
    hub.subscribe('bool', (e) => { val = e.payload as boolean; });
    await hub.publish('bool', true);
    expect(val).toBe(true);
  });
  it('array payload', async () => {
    let val: unknown[] = [];
    hub.subscribe('arr', (e) => { val = e.payload as unknown[]; });
    await hub.publish('arr', [1, 'two', false]);
    expect(val).toEqual([1, 'two', false]);
  });
  it('nested object payload', async () => {
    let val: unknown = null;
    hub.subscribe('nested', (e) => { val = e.payload; });
    await hub.publish('nested', { a: { b: { c: 1 } } });
    expect((val as {a:{b:{c:number}}}).a.b.c).toBe(1);
  });
  it('metadata on event', async () => {
    const e = await hub.publish('meta', {}, 'src');
    expect(e.source).toBe('src');
  });
  it('filter log returns copies', async () => {
    await hub.publish('a', { x: 1 });
    const filtered = hub.getEventLog('a');
    expect(filtered).toHaveLength(1);
  });
  it('clear resets sequence to 0', async () => {
    await hub.publish('a', {});
    hub.clear();
    expect(hub.getSequence()).toBe(0);
  });
  it('clear empties filtered log', async () => {
    await hub.publish('a', {});
    hub.clear();
    expect(hub.getEventLog('a')).toHaveLength(0);
  });
  it('subscriber can be async and slow', async () => {
    let val = 0;
    hub.subscribe('slow', async () => {
      await new Promise(r => setTimeout(r, 1));
      val = 99;
    });
    await hub.publish('slow', {});
    expect(val).toBe(99);
  });
});
