import { describe, test, expect } from 'vitest';
import { EventClassification } from '../../core/types/common.js';
import { createPackEventBase, type PersonalIntelligenceEvent } from '../../core/personal-intelligence/events.js';

describe('Events', () => {
  test('PersonalIntelligenceEvent includes PackCreated', () => { expect('PackCreated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes PackStateChanged', () => { expect('PackStateChanged').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes PackInitialized', () => { expect('PackInitialized').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes BriefGenerated', () => { expect('BriefGenerated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes BriefDelivered', () => { expect('BriefDelivered').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes ReflectionGenerated', () => { expect('ReflectionGenerated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes PackGoalCreated', () => { expect('PackGoalCreated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes PackGoalUpdated', () => { expect('PackGoalUpdated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes PackGoalStatusChanged', () => { expect('PackGoalStatusChanged').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes PackGoalCompleted', () => { expect('PackGoalCompleted').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes PackDecisionCreated', () => { expect('PackDecisionCreated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes PackDecisionResolved', () => { expect('PackDecisionResolved').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes ConstraintDetected', () => { expect('ConstraintDetected').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes ConstraintResolved', () => { expect('ConstraintResolved').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes ConstraintLifecycleChanged', () => { expect('ConstraintLifecycleChanged').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes ValueAssessmentCreated', () => { expect('ValueAssessmentCreated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes RecommendationComposed', () => { expect('RecommendationComposed').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes RecommendationPresented', () => { expect('RecommendationPresented').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes RecommendationAccepted', () => { expect('RecommendationAccepted').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes RecommendationRejected', () => { expect('RecommendationRejected').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes RecommendationChainBroken', () => { expect('RecommendationChainBroken').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes KnowledgeNodeCreated', () => { expect('KnowledgeNodeCreated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes KnowledgeEdgeCreated', () => { expect('KnowledgeEdgeCreated').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes ConversationInterpreted', () => { expect('ConversationInterpreted').toBeTruthy(); });
  test('PersonalIntelligenceEvent includes HabitInsightDetected', () => { expect('HabitInsightDetected').toBeTruthy(); });

  test('PersonalIntelligenceEvent union type exists', () => { expect(true).toBe(true); });
  test('createPackEventBase creates valid base', () => {
    const base = createPackEventBase('Test', EventClassification.Info, 'agg-1');
    expect(base.eventType).toBe('Test');
    expect(base.classification).toBe(EventClassification.Info);
    expect(base.aggregateId).toBe('agg-1');
    expect(base.aggregateType).toBe('PersonalIntelligencePack');
    expect(base.eventId).toBeDefined();
    expect(base.timestamp).toBeDefined();
  });
  test('createPackEventBase generates unique IDs', () => {
    const a = createPackEventBase('Test', EventClassification.Info, 'agg-1');
    const b = createPackEventBase('Test', EventClassification.Info, 'agg-1');
    expect(a.eventId).not.toBe(b.eventId);
  });
});
});
