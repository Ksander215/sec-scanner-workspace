import { describe, it, expect } from 'vitest';
import { createPersonalEventBase } from '../../../core/personal/events.js';
import { EventClassification } from '../../../core/types/common.js';

describe('createPersonalEventBase', () => {
  it('returns an object with eventId', () => {
    const evt = createPersonalEventBase('TestEvent', EventClassification.Info, 'agg-1');
    expect(evt.eventId).toBeDefined();
    expect(typeof evt.eventId).toBe('string');
    expect(evt.eventId.length).toBeGreaterThan(0);
  });

  it('returns a valid UUID for eventId', () => {
    const evt = createPersonalEventBase('Test', EventClassification.Info, 'a');
    expect(evt.eventId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns a unique eventId each call', () => {
    const a = createPersonalEventBase('T', EventClassification.Info, 'x');
    const b = createPersonalEventBase('T', EventClassification.Info, 'x');
    expect(a.eventId).not.toBe(b.eventId);
  });

  it('returns the provided eventType', () => {
    const evt = createPersonalEventBase('GoalCreated', EventClassification.StateChange, 'g-1');
    expect(evt.eventType).toBe('GoalCreated');
  });

  it('returns the provided classification', () => {
    const evt = createPersonalEventBase('X', EventClassification.Action, 'a');
    expect(evt.classification).toBe(EventClassification.Action);
  });

  it('returns aggregateId matching input', () => {
    const evt = createPersonalEventBase('X', EventClassification.Info, 'user-42');
    expect(evt.aggregateId).toBe('user-42');
  });

  it('always returns aggregateType "Personal"', () => {
    const evt = createPersonalEventBase('X', EventClassification.Info, 'a');
    expect(evt.aggregateType).toBe('Personal');
  });

  it('returns an ISO-8601 timestamp', () => {
    const evt = createPersonalEventBase('X', EventClassification.Info, 'a');
    expect(evt.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns a recent timestamp', () => {
    const before = new Date();
    const evt = createPersonalEventBase('X', EventClassification.Info, 'a');
    const after = new Date();
    const evtDate = new Date(evt.timestamp);
    expect(evtDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1);
    expect(evtDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1);
  });

  it('has exactly 6 fields', () => {
    const evt = createPersonalEventBase('X', EventClassification.Info, 'a');
    expect(Object.keys(evt)).toHaveLength(6);
  });

  it('works with EventClassification.StateChange', () => {
    const evt = createPersonalEventBase('GoalUpdated', EventClassification.StateChange, 'g-1');
    expect(evt.classification).toBe(EventClassification.StateChange);
  });

  it('works with EventClassification.Result', () => {
    const evt = createPersonalEventBase('GoalCompleted', EventClassification.Result, 'g-1');
    expect(evt.classification).toBe(EventClassification.Result);
  });

  it('works with EventClassification.Error', () => {
    const evt = createPersonalEventBase('AttentionAlert', EventClassification.Error, 'a');
    expect(evt.classification).toBe(EventClassification.Error);
  });

  it('works with EventClassification.Action', () => {
    const evt = createPersonalEventBase('RecommendationAccepted', EventClassification.Action, 'r-1');
    expect(evt.classification).toBe(EventClassification.Action);
  });

  // ── Verify all PIR event type strings are well-formed ─────────
  const pirEventTypes = [
    'GoalCreated',
    'GoalUpdated',
    'GoalStatusChanged',
    'GoalCompleted',
    'GoalArchived',
    'PriorityCalculated',
    'PriorityChanged',
    'ContextUpdated',
    'ContextRefreshed',
    'PlanCreated',
    'PlanUpdated',
    'PlanItemCompleted',
    'PredictionGenerated',
    'PredictionValidated',
    'HabitDetected',
    'HabitConfirmed',
    'HabitBroken',
    'RecommendationGenerated',
    'RecommendationAccepted',
    'RecommendationDismissed',
    'AttentionChanged',
    'AttentionAlert',
    'ReflectionGenerated',
    'ReflectionScored',
    'LearningItemUpdated',
    'LearningGraphUpdated',
    'DecisionCreated',
    'DecisionResolved',
    'DailyBriefGenerated',
    'DailyBriefDelivered',
    'AssistantStateChanged',
    'ProfileUpdated',
    'PersonalContextChanged',
  ];

  describe('all PIR event types produce valid base', () => {
    for (const eventType of pirEventTypes) {
      it(`${eventType} produces valid base`, () => {
        const evt = createPersonalEventBase(eventType, EventClassification.Info, 'test');
        expect(evt.eventType).toBe(eventType);
        expect(evt.aggregateType).toBe('Personal');
        expect(evt.eventId).toMatch(/^[0-9a-f-]{36}$/);
      });
    }
  });
});
