/**
 * Cognitive Events Tests — TASK-AIS-003I.000
 *
 * Tests for the createCognitiveEventBase helper function that
 * generates DomainEventBase structures for all Cognitive Runtime events.
 *
 * Conforms to: INV-012 (Event Classification), ADR-002 (Event Bus)
 */

import { createCognitiveEventBase } from '../../../core/cognitive/cognitive-events.js';
import { EventClassification } from '../../../core/types/common.js';

describe('createCognitiveEventBase', () => {
  it('returns an object with all required fields', () => {
    const result = createCognitiveEventBase(
      'ConversationStarted',
      EventClassification.StateChange,
      'session-123',
    );

    expect(result).toHaveProperty('eventId');
    expect(result).toHaveProperty('eventType');
    expect(result).toHaveProperty('classification');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('aggregateId');
    expect(result).toHaveProperty('aggregateType');
    expect(result).toHaveProperty('version');
  });

  it('sets eventType to the provided value', () => {
    const result = createCognitiveEventBase('PromptBuilt', EventClassification.Action, 'agg-1');
    expect(result.eventType).toBe('PromptBuilt');
  });

  it('sets classification to the provided EventClassification', () => {
    const result = createCognitiveEventBase('Test', EventClassification.Error, 'agg-2');
    expect(result.classification).toBe(EventClassification.Error);
  });

  it('sets aggregateId to the provided value', () => {
    const result = createCognitiveEventBase('Test', EventClassification.Info, 'conv-xyz');
    expect(result.aggregateId).toBe('conv-xyz');
  });

  it('sets aggregateType to "Cognitive"', () => {
    const result = createCognitiveEventBase('Test', EventClassification.Info, 'agg-3');
    expect(result.aggregateType).toBe('Cognitive');
  });

  it('sets version to "1.0.0"', () => {
    const result = createCognitiveEventBase('Test', EventClassification.Info, 'agg-4');
    expect(result.version).toBe('1.0.0');
  });

  it('generates a valid UUID for eventId', () => {
    const result = createCognitiveEventBase('Test', EventClassification.Info, 'agg-5');
    expect(result.eventId).toBeTruthy();
    expect(typeof result.eventId).toBe('string');
    // UUID v4 pattern
    expect(result.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('sets timestamp to a valid ISO string', () => {
    const before = new Date().toISOString();
    const result = createCognitiveEventBase('Test', EventClassification.Info, 'agg-6');
    const after = new Date().toISOString();
    expect(result.timestamp >= before && result.timestamp <= after).toBe(true);
  });

  it('generates unique eventIds for each call', () => {
    const r1 = createCognitiveEventBase('E1', EventClassification.Info, 'agg-7');
    const r2 = createCognitiveEventBase('E2', EventClassification.Info, 'agg-7');
    expect(r1.eventId).not.toBe(r2.eventId);
  });

  it('works with EventClassification.Action', () => {
    const result = createCognitiveEventBase('CompletionStarted', EventClassification.Action, 'agg-a');
    expect(result.classification).toBe(EventClassification.Action);
  });

  it('works with EventClassification.Result', () => {
    const result = createCognitiveEventBase('CompletionFinished', EventClassification.Result, 'agg-b');
    expect(result.classification).toBe(EventClassification.Result);
  });

  it('works with EventClassification.StateChange', () => {
    const result = createCognitiveEventBase('ConversationStarted', EventClassification.StateChange, 'agg-c');
    expect(result.classification).toBe(EventClassification.StateChange);
  });

  it('works with EventClassification.Info', () => {
    const result = createCognitiveEventBase('InfoEvent', EventClassification.Info, 'agg-d');
    expect(result.classification).toBe(EventClassification.Info);
  });

  it('returns an object matching DomainEventBase shape', () => {
    const result = createCognitiveEventBase('Test', EventClassification.Info, 'agg-e');
    expect(result).toEqual({
      eventId: expect.any(String),
      eventType: expect.any(String),
      classification: expect.any(String),
      timestamp: expect.any(String),
      aggregateId: expect.any(String),
      aggregateType: 'Cognitive',
      version: '1.0.0',
    });
  });
});
