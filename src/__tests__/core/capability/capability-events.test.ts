/**
 * capability-events.test.ts
 * Tests for createCapabilityEventBase helper in events.ts
 */
import { describe, it, expect } from 'vitest';
import { createCapabilityEventBase } from '../../../core/capability/events.js';
import { EventClassification } from '../../../core/types/common.js';

describe('createCapabilityEventBase', () => {

  // ─── Structure Tests ──────────────────────────────────────────

  describe('returns correct structure', () => {
    it('should return an object with an eventId string', () => {
      const result = createCapabilityEventBase('TestEvent', EventClassification.Info, 'agg-1');
      expect(result).toHaveProperty('eventId');
      expect(typeof result.eventId).toBe('string');
      expect(result.eventId.length).toBeGreaterThan(0);
    });

    it('should return the provided eventType', () => {
      const result = createCapabilityEventBase('CapabilityInstalled', EventClassification.StateChange, 'agg-1');
      expect(result.eventType).toBe('CapabilityInstalled');
    });

    it('should return the provided classification', () => {
      const result = createCapabilityEventBase('TestEvent', EventClassification.Error, 'agg-1');
      expect(result.classification).toBe(EventClassification.Error);
    });

    it('should return a timestamp string', () => {
      const before = new Date().toISOString();
      const result = createCapabilityEventBase('TestEvent', EventClassification.Info, 'agg-1');
      const after = new Date().toISOString();
      expect(typeof result.timestamp).toBe('string');
      // Timestamp should be between before and after (within the same second)
      expect(result.timestamp >= before && result.timestamp <= after).toBe(true);
    });

    it('should return the correct aggregateId and aggregateType', () => {
      const result = createCapabilityEventBase('TestEvent', EventClassification.Info, 'my-aggregate-id');
      expect(result.aggregateId).toBe('my-aggregate-id');
      expect(result.aggregateType).toBe('Capability');
    });
  });

  // ─── Unique EventId Tests ────────────────────────────────────

  describe('unique eventId generation', () => {
    it('should generate a different eventId on each call', () => {
      const result1 = createCapabilityEventBase('TestEvent', EventClassification.Info, 'agg-1');
      const result2 = createCapabilityEventBase('TestEvent', EventClassification.Info, 'agg-1');
      expect(result1.eventId).not.toBe(result2.eventId);
    });

    it('should generate unique eventIds across many calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = createCapabilityEventBase('TestEvent', EventClassification.Info, 'agg-1');
        ids.add(result.eventId);
      }
      expect(ids.size).toBe(100);
    });
  });

  // ─── Classification Pass-Through Tests ────────────────────────

  describe('classification pass-through', () => {
    it('should pass through EventClassification.Info', () => {
      const result = createCapabilityEventBase('Test', EventClassification.Info, 'agg');
      expect(result.classification).toBe(EventClassification.Info);
    });

    it('should pass through EventClassification.Action', () => {
      const result = createCapabilityEventBase('Test', EventClassification.Action, 'agg');
      expect(result.classification).toBe(EventClassification.Action);
    });

    it('should pass through EventClassification.Error', () => {
      const result = createCapabilityEventBase('Test', EventClassification.Error, 'agg');
      expect(result.classification).toBe(EventClassification.Error);
    });
  });

  // ─── AggregateId Pass-Through Tests ──────────────────────────

  describe('aggregateId pass-through', () => {
    it('should pass through the given aggregateId', () => {
      const result = createCapabilityEventBase('Test', EventClassification.Info, 'pack-abc-123');
      expect(result.aggregateId).toBe('pack-abc-123');
    });

    it('should pass through an empty aggregateId', () => {
      const result = createCapabilityEventBase('Test', EventClassification.Info, '');
      expect(result.aggregateId).toBe('');
    });
  });

  // ─── AggregateType Tests ─────────────────────────────────────

  describe('aggregateType', () => {
    it('should always return "Capability" as aggregateType', () => {
      const result = createCapabilityEventBase('Test', EventClassification.Info, 'agg');
      expect(result.aggregateType).toBe('Capability');
    });
  });

  // ─── Timestamp Format Tests ────────────────────────────────────

  describe('timestamp format', () => {
    it('should return an ISO-8601 formatted timestamp', () => {
      const result = createCapabilityEventBase('Test', EventClassification.Info, 'agg');
      const parsed = Date.parse(result.timestamp);
      expect(isNaN(parsed)).toBe(false);
    });

    it('should return a valid ISO string that can be parsed by new Date()', () => {
      const result = createCapabilityEventBase('Test', EventClassification.Info, 'agg');
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });
  });
});
