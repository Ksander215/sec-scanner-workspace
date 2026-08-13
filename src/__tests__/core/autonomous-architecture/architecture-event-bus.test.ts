/**
 * Autonomous Architecture Runtime — Architecture EventBus Smoke Tests
 * TASK-AIS-012A.020
 */

import { describe, it, expect } from 'vitest';
import {
  ArchitectureEventBus,
  type ArchitectureEvent,
  type ArchitectureEventHandler,
} from '../../../core/autonomous-architecture/services/architecture.event-bus.js';

describe('ArchitectureEventBus', () => {
  it('should construct without parameters', () => {
    const bus = new ArchitectureEventBus();
    expect(bus).toBeInstanceOf(ArchitectureEventBus);
  });

  it('should subscribe to an event type', () => {
    const bus = new ArchitectureEventBus();
    const handler: ArchitectureEventHandler = () => {};
    const subscription = bus.subscribe('test', handler);
    expect(subscription).toBeDefined();
    expect(typeof subscription.unsubscribe).toBe('function');
  });

  it('should publish and call handler', () => {
    const bus = new ArchitectureEventBus();
    const calls: ArchitectureEvent[] = [];
    const handler: ArchitectureEventHandler = (event) => {
      calls.push(event);
    };
    bus.subscribe('test', handler);
    const event: ArchitectureEvent = { type: 'test', payload: 'data' };
    bus.publish(event);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(event);
  });

  it('should unsubscribe and stop calling handler', () => {
    const bus = new ArchitectureEventBus();
    const calls: ArchitectureEvent[] = [];
    const handler: ArchitectureEventHandler = (event) => {
      calls.push(event);
    };
    const subscription = bus.subscribe('test', handler);
    subscription.unsubscribe();
    bus.publish({ type: 'test', payload: 'data' });
    expect(calls).toHaveLength(0);
  });

  it('should support multiple subscribers for same type', () => {
    const bus = new ArchitectureEventBus();
    const calls1: ArchitectureEvent[] = [];
    const calls2: ArchitectureEvent[] = [];
    bus.subscribe('test', (e) => calls1.push(e));
    bus.subscribe('test', (e) => calls2.push(e));
    const event: ArchitectureEvent = { type: 'test', payload: 'data' };
    bus.publish(event);
    expect(calls1).toHaveLength(1);
    expect(calls2).toHaveLength(1);
  });

  it('should support multiple event types independently', () => {
    const bus = new ArchitectureEventBus();
    const typeACalls: ArchitectureEvent[] = [];
    const typeBCalls: ArchitectureEvent[] = [];
    bus.subscribe('type-a', (e) => typeACalls.push(e));
    bus.subscribe('type-b', (e) => typeBCalls.push(e));
    bus.publish({ type: 'type-a', payload: 'a' });
    expect(typeACalls).toHaveLength(1);
    expect(typeBCalls).toHaveLength(0);
    bus.publish({ type: 'type-b', payload: 'b' });
    expect(typeACalls).toHaveLength(1);
    expect(typeBCalls).toHaveLength(1);
  });

  it('should do nothing when publishing with no subscribers', () => {
    const bus = new ArchitectureEventBus();
    bus.publish({ type: 'nonexistent', payload: null });
    expect(true).toBe(true);
  });

  it('should call handler exactly once per publish', () => {
    const bus = new ArchitectureEventBus();
    let count = 0;
    bus.subscribe('test', () => { count += 1; });
    bus.publish({ type: 'test', payload: 1 });
    expect(count).toBe(1);
    bus.publish({ type: 'test', payload: 2 });
    expect(count).toBe(2);
  });

  it('should remove only unsubscribed handler', () => {
    const bus = new ArchitectureEventBus();
    const calls1: ArchitectureEvent[] = [];
    const calls2: ArchitectureEvent[] = [];
    const sub1 = bus.subscribe('test', (e) => calls1.push(e));
    bus.subscribe('test', (e) => calls2.push(e));
    sub1.unsubscribe();
    bus.publish({ type: 'test', payload: 'data' });
    expect(calls1).toHaveLength(0);
    expect(calls2).toHaveLength(1);
  });

  it('should return true from hasSubscribers when subscribers exist', () => {
    const bus = new ArchitectureEventBus();
    expect(bus.hasSubscribers('test')).toBe(false);
    bus.subscribe('test', () => {});
    expect(bus.hasSubscribers('test')).toBe(true);
  });

  it('should return correct subscriber count', () => {
    const bus = new ArchitectureEventBus();
    expect(bus.getSubscriberCount('test')).toBe(0);
    bus.subscribe('test', () => {});
    expect(bus.getSubscriberCount('test')).toBe(1);
    bus.subscribe('test', () => {});
    expect(bus.getSubscriberCount('test')).toBe(2);
  });

  it('should handle multiple publishes sequentially', () => {
    const bus = new ArchitectureEventBus();
    const payloads: unknown[] = [];
    bus.subscribe('test', (e) => payloads.push(e.payload));
    bus.publish({ type: 'test', payload: 'a' });
    bus.publish({ type: 'test', payload: 'b' });
    bus.publish({ type: 'test', payload: 'c' });
    expect(payloads).toEqual(['a', 'b', 'c']);
  });

  it('should preserve subscriber call order', () => {
    const bus = new ArchitectureEventBus();
    const order: number[] = [];
    bus.subscribe('test', () => order.push(1));
    bus.subscribe('test', () => order.push(2));
    bus.subscribe('test', () => order.push(3));
    bus.publish({ type: 'test', payload: null });
    expect(order).toEqual([1, 2, 3]);
  });

  it('should propagate handler exceptions', () => {
    const bus = new ArchitectureEventBus();
    bus.subscribe('test', () => {
      throw new Error('handler error');
    });
    expect(() => {
      bus.publish({ type: 'test', payload: null });
    }).toThrow('handler error');
  });

  it('should be publicly exported', () => {
    expect(ArchitectureEventBus).toBeDefined();
    expect(typeof ArchitectureEventBus).toBe('function');
  });
});
