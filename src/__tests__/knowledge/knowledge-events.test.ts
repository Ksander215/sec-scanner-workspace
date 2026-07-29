import { describe, it, expect } from 'vitest';
import { EventClassification } from '../../core/types/common.js';
import type {
  KnowledgeItemCreated,
  KnowledgeItemUpdated,
  KnowledgeItemDeleted,
  KnowledgeItemRetrieved,
  KnowledgeItemStateChanged,
  KnowledgeNamespaceCreated,
  KnowledgeNamespaceDeleted,
  KnowledgeVersionCreated,
  KnowledgeVersionRolledBack,
  KnowledgeRelationCreated,
  KnowledgeRelationDeleted,
  KnowledgeIndexRebuilt,
  KnowledgeIndexEntryAdded,
  KnowledgeValidationCompleted,
} from '../../core/knowledge/events.js';

// --- Helpers ---

const baseEvent = {
  eventId: 'evt-001',
  timestamp: '2025-01-01T00:00:00.000Z',
  sequence: 1,
  aggregateId: 'agg-knowledge',
  aggregateType: 'KnowledgeRuntime',
  version: '1.0.0',
} as const;

// --- KnowledgeItemCreated ---

describe('KnowledgeItemCreated event', () => {
  const event: KnowledgeItemCreated = {
    ...baseEvent,
    eventType: 'KnowledgeItemCreated',
    classification: EventClassification.Action,
    payload: {
      itemId: 'item-001',
      namespaceId: 'ns-default',
      kind: 'fact',
      name: 'Test Fact',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeItemCreated');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has itemId in payload', () => {
    expect(event.payload).toHaveProperty('itemId', 'item-001');
  });

  it('has namespaceId in payload', () => {
    expect(event.payload).toHaveProperty('namespaceId', 'ns-default');
  });

  it('has kind and name in payload', () => {
    expect(event.payload).toHaveProperty('kind', 'fact');
    expect(event.payload).toHaveProperty('name', 'Test Fact');
  });
});

// --- KnowledgeItemUpdated ---

describe('KnowledgeItemUpdated event', () => {
  const event: KnowledgeItemUpdated = {
    ...baseEvent,
    eventType: 'KnowledgeItemUpdated',
    classification: EventClassification.Action,
    payload: {
      itemId: 'item-002',
      namespaceId: 'ns-default',
      fieldCount: 3,
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeItemUpdated');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has fieldCount in payload', () => {
    expect(event.payload).toHaveProperty('fieldCount', 3);
  });

  it('has itemId and namespaceId', () => {
    expect(event.payload).toHaveProperty('itemId', 'item-002');
    expect(event.payload).toHaveProperty('namespaceId', 'ns-default');
  });
});

// --- KnowledgeItemDeleted ---

describe('KnowledgeItemDeleted event', () => {
  const event: KnowledgeItemDeleted = {
    ...baseEvent,
    eventType: 'KnowledgeItemDeleted',
    classification: EventClassification.Action,
    payload: {
      itemId: 'item-003',
      namespaceId: 'ns-default',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeItemDeleted');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has itemId and namespaceId in payload', () => {
    expect(event.payload).toHaveProperty('itemId', 'item-003');
    expect(event.payload).toHaveProperty('namespaceId', 'ns-default');
  });
});

// --- KnowledgeItemRetrieved ---

describe('KnowledgeItemRetrieved event', () => {
  const event: KnowledgeItemRetrieved = {
    ...baseEvent,
    eventType: 'KnowledgeItemRetrieved',
    classification: EventClassification.Info,
    payload: {
      itemId: 'item-004',
      namespaceId: 'ns-search',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeItemRetrieved');
  });

  it('has Info classification', () => {
    expect(event.classification).toBe(EventClassification.Info);
  });

  it('has itemId in payload', () => {
    expect(event.payload).toHaveProperty('itemId', 'item-004');
  });
});

// --- KnowledgeItemStateChanged ---

describe('KnowledgeItemStateChanged event', () => {
  const event: KnowledgeItemStateChanged = {
    ...baseEvent,
    eventType: 'KnowledgeItemStateChanged',
    classification: EventClassification.StateChange,
    payload: {
      itemId: 'item-005',
      fromState: 'draft',
      toState: 'published',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeItemStateChanged');
  });

  it('has StateChange classification', () => {
    expect(event.classification).toBe(EventClassification.StateChange);
  });

  it('has fromState and toState in payload', () => {
    expect(event.payload).toHaveProperty('fromState', 'draft');
    expect(event.payload).toHaveProperty('toState', 'published');
  });
});

// --- KnowledgeNamespaceCreated ---

describe('KnowledgeNamespaceCreated event', () => {
  const event: KnowledgeNamespaceCreated = {
    ...baseEvent,
    eventType: 'KnowledgeNamespaceCreated',
    classification: EventClassification.Action,
    payload: {
      namespaceId: 'ns-new',
      name: 'New Namespace',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeNamespaceCreated');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has namespaceId and name in payload', () => {
    expect(event.payload).toHaveProperty('namespaceId', 'ns-new');
    expect(event.payload).toHaveProperty('name', 'New Namespace');
  });
});

// --- KnowledgeNamespaceDeleted ---

describe('KnowledgeNamespaceDeleted event', () => {
  const event: KnowledgeNamespaceDeleted = {
    ...baseEvent,
    eventType: 'KnowledgeNamespaceDeleted',
    classification: EventClassification.Action,
    payload: {
      namespaceId: 'ns-gone',
      name: 'Gone Namespace',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeNamespaceDeleted');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has namespaceId and name in payload', () => {
    expect(event.payload).toHaveProperty('namespaceId', 'ns-gone');
    expect(event.payload).toHaveProperty('name', 'Gone Namespace');
  });
});

// --- KnowledgeVersionCreated ---

describe('KnowledgeVersionCreated event', () => {
  const event: KnowledgeVersionCreated = {
    ...baseEvent,
    eventType: 'KnowledgeVersionCreated',
    classification: EventClassification.Action,
    payload: {
      versionId: 'ver-001',
      itemId: 'item-010',
      revision: 2,
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeVersionCreated');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has versionId, itemId, and revision in payload', () => {
    expect(event.payload).toHaveProperty('versionId', 'ver-001');
    expect(event.payload).toHaveProperty('itemId', 'item-010');
    expect(event.payload).toHaveProperty('revision', 2);
  });
});

// --- KnowledgeVersionRolledBack ---

describe('KnowledgeVersionRolledBack event', () => {
  const event: KnowledgeVersionRolledBack = {
    ...baseEvent,
    eventType: 'KnowledgeVersionRolledBack',
    classification: EventClassification.Action,
    payload: {
      itemId: 'item-010',
      fromRevision: 5,
      toRevision: 3,
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeVersionRolledBack');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has fromRevision and toRevision in payload', () => {
    expect(event.payload).toHaveProperty('fromRevision', 5);
    expect(event.payload).toHaveProperty('toRevision', 3);
  });
});

// --- KnowledgeRelationCreated ---

describe('KnowledgeRelationCreated event', () => {
  const event: KnowledgeRelationCreated = {
    ...baseEvent,
    eventType: 'KnowledgeRelationCreated',
    classification: EventClassification.Action,
    payload: {
      relationId: 'rel-001',
      sourceId: 'item-a',
      targetId: 'item-b',
      relationType: 'depends-on',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeRelationCreated');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has relationId, sourceId, targetId, and relationType', () => {
    expect(event.payload).toHaveProperty('relationId', 'rel-001');
    expect(event.payload).toHaveProperty('sourceId', 'item-a');
    expect(event.payload).toHaveProperty('targetId', 'item-b');
    expect(event.payload).toHaveProperty('relationType', 'depends-on');
  });
});

// --- KnowledgeRelationDeleted ---

describe('KnowledgeRelationDeleted event', () => {
  const event: KnowledgeRelationDeleted = {
    ...baseEvent,
    eventType: 'KnowledgeRelationDeleted',
    classification: EventClassification.Action,
    payload: {
      relationId: 'rel-002',
      sourceId: 'item-c',
      targetId: 'item-d',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeRelationDeleted');
  });

  it('has Action classification', () => {
    expect(event.classification).toBe(EventClassification.Action);
  });

  it('has relationId, sourceId, and targetId', () => {
    expect(event.payload).toHaveProperty('relationId', 'rel-002');
    expect(event.payload).toHaveProperty('sourceId', 'item-c');
    expect(event.payload).toHaveProperty('targetId', 'item-d');
  });
});

// --- KnowledgeIndexRebuilt ---

describe('KnowledgeIndexRebuilt event', () => {
  const event: KnowledgeIndexRebuilt = {
    ...baseEvent,
    eventType: 'KnowledgeIndexRebuilt',
    classification: EventClassification.StateChange,
    payload: {
      indexType: 'full-text',
      entryCount: 1024,
      durationMs: 350,
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeIndexRebuilt');
  });

  it('has StateChange classification', () => {
    expect(event.classification).toBe(EventClassification.StateChange);
  });

  it('has indexType, entryCount, and durationMs', () => {
    expect(event.payload).toHaveProperty('indexType', 'full-text');
    expect(event.payload).toHaveProperty('entryCount', 1024);
    expect(event.payload).toHaveProperty('durationMs', 350);
  });
});

// --- KnowledgeIndexEntryAdded ---

describe('KnowledgeIndexEntryAdded event', () => {
  const event: KnowledgeIndexEntryAdded = {
    ...baseEvent,
    eventType: 'KnowledgeIndexEntryAdded',
    classification: EventClassification.Info,
    payload: {
      indexType: 'tag',
      key: 'important',
      itemId: 'item-099',
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeIndexEntryAdded');
  });

  it('has Info classification', () => {
    expect(event.classification).toBe(EventClassification.Info);
  });

  it('has indexType, key, and itemId in payload', () => {
    expect(event.payload).toHaveProperty('indexType', 'tag');
    expect(event.payload).toHaveProperty('key', 'important');
    expect(event.payload).toHaveProperty('itemId', 'item-099');
  });
});

// --- KnowledgeValidationCompleted ---

describe('KnowledgeValidationCompleted event', () => {
  const event: KnowledgeValidationCompleted = {
    ...baseEvent,
    eventType: 'KnowledgeValidationCompleted',
    classification: EventClassification.Result,
    payload: {
      valid: true,
      issueCount: 0,
      errorCount: 0,
    },
  };

  it('has correct eventType', () => {
    expect(event.eventType).toBe('KnowledgeValidationCompleted');
  });

  it('has Result classification', () => {
    expect(event.classification).toBe(EventClassification.Result);
  });

  it('has valid, issueCount, and errorCount in payload', () => {
    expect(event.payload).toHaveProperty('valid', true);
    expect(event.payload).toHaveProperty('issueCount', 0);
    expect(event.payload).toHaveProperty('errorCount', 0);
  });

  it('can represent a failed validation', () => {
    const failed: KnowledgeValidationCompleted = {
      ...baseEvent,
      eventType: 'KnowledgeValidationCompleted',
      classification: EventClassification.Result,
      payload: {
        valid: false,
        issueCount: 4,
        errorCount: 2,
      },
    };
    expect(failed.payload.valid).toBe(false);
    expect(failed.payload.issueCount).toBe(4);
    expect(failed.payload.errorCount).toBe(2);
  });
});

// --- Cross-cutting: all events share DomainEventBase properties ---

describe('All knowledge events share DomainEventBase', () => {
  const allEvents: Record<string, unknown>[] = [
    {
      ...baseEvent,
      eventType: 'KnowledgeItemCreated',
      classification: EventClassification.Action,
      payload: { itemId: 'i', namespaceId: 'n', kind: 'k', name: 'N' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeItemUpdated',
      classification: EventClassification.Action,
      payload: { itemId: 'i', namespaceId: 'n', fieldCount: 1 },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeItemDeleted',
      classification: EventClassification.Action,
      payload: { itemId: 'i', namespaceId: 'n' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeItemRetrieved',
      classification: EventClassification.Info,
      payload: { itemId: 'i', namespaceId: 'n' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeItemStateChanged',
      classification: EventClassification.StateChange,
      payload: { itemId: 'i', fromState: 'a', toState: 'b' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeNamespaceCreated',
      classification: EventClassification.Action,
      payload: { namespaceId: 'n', name: 'N' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeNamespaceDeleted',
      classification: EventClassification.Action,
      payload: { namespaceId: 'n', name: 'N' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeVersionCreated',
      classification: EventClassification.Action,
      payload: { versionId: 'v', itemId: 'i', revision: 1 },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeVersionRolledBack',
      classification: EventClassification.Action,
      payload: { itemId: 'i', fromRevision: 2, toRevision: 1 },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeRelationCreated',
      classification: EventClassification.Action,
      payload: { relationId: 'r', sourceId: 'a', targetId: 'b', relationType: 't' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeRelationDeleted',
      classification: EventClassification.Action,
      payload: { relationId: 'r', sourceId: 'a', targetId: 'b' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeIndexRebuilt',
      classification: EventClassification.StateChange,
      payload: { indexType: 'x', entryCount: 1, durationMs: 10 },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeIndexEntryAdded',
      classification: EventClassification.Info,
      payload: { indexType: 'x', key: 'k', itemId: 'i' },
    },
    {
      ...baseEvent,
      eventType: 'KnowledgeValidationCompleted',
      classification: EventClassification.Result,
      payload: { valid: true, issueCount: 0, errorCount: 0 },
    },
  ];

  it('every event has eventId', () => {
    for (const ev of allEvents) {
      expect(ev).toHaveProperty('eventId');
    }
  });

  it('every event has a timestamp', () => {
    for (const ev of allEvents) {
      expect(ev).toHaveProperty('timestamp');
    }
  });

  it('every event has a sequence number', () => {
    for (const ev of allEvents) {
      expect(ev).toHaveProperty('sequence');
    }
  });

  it('every event has aggregateId and aggregateType', () => {
    for (const ev of allEvents) {
      expect(ev).toHaveProperty('aggregateId');
      expect(ev).toHaveProperty('aggregateType');
    }
  });

  it('every event has a version', () => {
    for (const ev of allEvents) {
      expect(ev).toHaveProperty('version');
    }
  });

  it('every event has a non-empty eventType', () => {
    for (const ev of allEvents) {
      expect(typeof (ev as any).eventType).toBe('string');
      expect((ev as any).eventType.length).toBeGreaterThan(0);
    }
  });

  it('every event has a payload object', () => {
    for (const ev of allEvents) {
      expect(ev).toHaveProperty('payload');
      expect(typeof (ev as any).payload).toBe('object');
    }
  });

  it('every event has a classification that is a valid EventClassification value', () => {
    const validClassifications = new Set(Object.values(EventClassification));
    for (const ev of allEvents) {
      expect(validClassifications.has((ev as any).classification)).toBe(true);
    }
  });

  it('all 14 event types are represented', () => {
    const types = allEvents.map((ev) => (ev as any).eventType);
    expect(types).toHaveLength(14);
    expect(new Set(types).size).toBe(14);
  });
});
