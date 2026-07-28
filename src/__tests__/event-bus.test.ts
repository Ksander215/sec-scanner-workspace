import { describe, it, expect } from 'vitest';
import { InProcessEventBus } from '../core/events/event-bus.js';
import type { DomainEventBase } from '../core/domain/events/domain-event.js';
import { EventClassification } from '../core/types/common.js';

function makeEvent(partial: Partial<DomainEventBase> = {}): DomainEventBase {
  return {
    eventId: crypto.randomUUID(),
    eventType: 'TestEvent',
    classification: EventClassification.Info,
    timestamp: new Date().toISOString(),
    sequence: 0,
    aggregateId: 'agg-1',
    aggregateType: 'TestAggregate',
    version: '1.0',
    ...partial,
  } as DomainEventBase;
}

describe('InProcessEventBus', () => {
  it('registers subscribers', () => {
    const bus = new InProcessEventBus();
    const sub = bus.subscribe('TestEvent', async () => {});
    expect(sub.eventType).toBe('TestEvent');
    expect(sub.id).toBeDefined();
  });

  it('unsubscribes handlers', () => {
    const bus = new InProcessEventBus();
    let called = false;
    const handler = async () => { called = true; };
    const sub = bus.subscribe('TestEvent', handler);
    sub.unsubscribe();
    bus.publish(makeEvent());
    expect(called).toBe(false);
  });

  it('dispatches events to subscribers', async () => {
    const bus = new InProcessEventBus();
    let received: unknown = null;
    bus.subscribe('TestEvent', async (env) => {
      received = env;
    });
    await bus.publish(makeEvent());
    expect(received).not.toBeNull();
  });

  it('isolates failing subscribers (ADR-002)', async () => {
    const bus = new InProcessEventBus();
    let secondCalled = false;
    bus.subscribe('TestEvent', async () => { throw new Error('fail'); });
    bus.subscribe('TestEvent', async () => { secondCalled = true; });
    await bus.publish(makeEvent());
    expect(secondCalled).toBe(true);
  });

  it('increments sequence numbers', async () => {
    const bus = new InProcessEventBus();
    await bus.publish(makeEvent());
    await bus.publish(makeEvent());
    expect(bus.getSequence()).toBe(2);
  });

  it('maintains event log for audit', async () => {
    const bus = new InProcessEventBus();
    await bus.publish(makeEvent());
    await bus.publish(makeEvent());
    expect(bus.getLog().length).toBe(2);
  });

  it('clears log', async () => {
    const bus = new InProcessEventBus();
    await bus.publish(makeEvent());
    bus.clear();
    expect(bus.getLog().length).toBe(0);
    expect(bus.getSequence()).toBe(0);
  });
});
