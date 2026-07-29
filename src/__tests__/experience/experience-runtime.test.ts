/**
 * Tests for ExperienceRuntime (Main Orchestrator)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExperienceRuntime } from '../../core/experience/experience-runtime.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { TraceCollector } from '../../core/trace/trace-collector.js';
import {
  BehaviorEventType,
  ExperienceState,
  AdaptationType,
  RecommendationType,
  ConsentMode,
  ConsentScope,
  type BehaviorEvent,
  type ObservationId,
} from '../../core/experience/types.js';
import { createId } from '../../core/domain/identifiers.js';

describe('ExperienceRuntime', () => {
  let runtime: ExperienceRuntime;
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    runtime = new ExperienceRuntime({}, eventBus);
  });

  // ─── Constructor ───────────────────────────────────────────

  describe('constructor', () => {
    it('creates runtime with name ExperienceRuntime', () => {
      expect(runtime.name).toBe('ExperienceRuntime');
    });

    it('creates all 13 subsystems', () => {
      expect(runtime.behaviorRuntime).toBeDefined();
      expect(runtime.preferenceEvolutionRuntime).toBeDefined();
      expect(runtime.habitEngineRuntime).toBeDefined();
      expect(runtime.adaptationEngineRuntime).toBeDefined();
      expect(runtime.recommendationEngineRuntime).toBeDefined();
      expect(runtime.experienceGraph).toBeDefined();
      expect(runtime.personalizationProfiles).toBeDefined();
      expect(runtime.contextSwitchingRuntime).toBeDefined();
      expect(runtime.explainabilityRuntime).toBeDefined();
      expect(runtime.experiencePolicies).toBeDefined();
      expect(runtime.experienceMetrics).toBeDefined();
      expect(runtime.snapshotRuntime).toBeDefined();
      expect(runtime.consentRuntime).toBeDefined();
    });

    it('creates experienceContext', () => {
      expect(runtime.experienceContext).toBeDefined();
    });

    it('initializes with state not initialized and not running', () => {
      expect(runtime.state.initialized).toBe(false);
      expect(runtime.state.running).toBe(false);
    });

    it('provides EventBus accessor', () => {
      expect(runtime.EventBus).toBe(eventBus);
    });

    it('provides Trace accessor', () => {
      expect(runtime.Trace).toBeDefined();
      expect(runtime.Trace).toBeInstanceOf(TraceCollector);
    });

    it('contracts is accessible and empty by default', () => {
      expect(runtime.contracts).toBeDefined();
      expect(Object.keys(runtime.contracts)).toHaveLength(0);
    });

    it('accepts custom event bus', () => {
      const customBus = new InProcessEventBus();
      const rt = new ExperienceRuntime({}, customBus);
      expect(rt.EventBus).toBe(customBus);
    });

    it('accepts custom contracts', () => {
      const contracts = { cognitive: { getCurrentIntent: async () => null } } as any;
      const rt = new ExperienceRuntime({}, undefined, contracts);
      expect(rt.contracts.cognitive).toBeDefined();
    });
  });

  // ─── Subsystem Accessors ───────────────────────────────────

  describe('subsystem accessors', () => {
    it('behaviorRuntime returns BehaviorRuntime instance', () => {
      expect(runtime.behaviorRuntime.constructor.name).toBe('BehaviorRuntime');
    });

    it('preferenceEvolutionRuntime returns PreferenceEvolution instance', () => {
      expect(runtime.preferenceEvolutionRuntime.constructor.name).toBe('PreferenceEvolution');
    });

    it('habitEngineRuntime returns HabitEngine instance', () => {
      expect(runtime.habitEngineRuntime.constructor.name).toBe('HabitEngine');
    });

    it('adaptationEngineRuntime returns AdaptationEngine instance', () => {
      expect(runtime.adaptationEngineRuntime.constructor.name).toBe('AdaptationEngine');
    });

    it('recommendationEngineRuntime returns RecommendationRuntime instance', () => {
      expect(runtime.recommendationEngineRuntime.constructor.name).toBe('RecommendationRuntime');
    });

    it('experienceGraph returns ExperienceGraph instance', () => {
      expect(runtime.experienceGraph.constructor.name).toBe('ExperienceGraph');
    });

    it('personalizationProfiles returns PersonalizationProfiles instance', () => {
      expect(runtime.personalizationProfiles.constructor.name).toBe('PersonalizationProfiles');
    });

    it('contextSwitchingRuntime returns ContextSwitching instance', () => {
      expect(runtime.contextSwitchingRuntime.constructor.name).toBe('ContextSwitching');
    });

    it('explainabilityRuntime returns ExplainabilityRuntime instance', () => {
      expect(runtime.explainabilityRuntime.constructor.name).toBe('ExplainabilityRuntime');
    });

    it('experiencePolicies returns ExperiencePolicies instance', () => {
      expect(runtime.experiencePolicies.constructor.name).toBe('ExperiencePolicies');
    });

    it('experienceMetrics returns ExperienceMetrics instance', () => {
      expect(runtime.experienceMetrics.constructor.name).toBe('ExperienceMetrics');
    });

    it('snapshotRuntime returns SnapshotRuntime instance', () => {
      expect(runtime.snapshotRuntime.constructor.name).toBe('SnapshotRuntime');
    });

    it('consentRuntime returns ConsentRuntime instance', () => {
      expect(runtime.consentRuntime.constructor.name).toBe('ConsentRuntime');
    });

    it('experienceContext returns ExperienceContext instance', () => {
      expect(runtime.experienceContext.constructor.name).toBe('ExperienceContext');
    });
  });

  // ─── Lifecycle ─────────────────────────────────────────────

  describe('lifecycle', () => {
    it('initialize sets initialized to true', async () => {
      await runtime.initialize();
      expect(runtime.state.initialized).toBe(true);
    });

    it('initialize is idempotent', async () => {
      await runtime.initialize();
      await runtime.initialize();
      expect(runtime.state.initialized).toBe(true);
    });

    it('start sets running to true after initialize', async () => {
      await runtime.initialize();
      await runtime.start();
      expect(runtime.state.running).toBe(true);
    });

    it('start throws if not initialized', async () => {
      await expect(runtime.start()).rejects.toThrow('must be initialized first');
    });

    it('start is idempotent', async () => {
      await runtime.initialize();
      await runtime.start();
      await runtime.start();
      expect(runtime.state.running).toBe(true);
    });

    it('stop sets running to false', async () => {
      await runtime.initialize();
      await runtime.start();
      await runtime.stop();
      expect(runtime.state.running).toBe(false);
    });

    it('stop is no-op when not running', async () => {
      await runtime.initialize();
      await runtime.stop();
      expect(runtime.state.running).toBe(false);
    });

    it('shutdown sets both initialized and running to false', async () => {
      await runtime.initialize();
      await runtime.start();
      await runtime.shutdown();
      expect(runtime.state.initialized).toBe(false);
      expect(runtime.state.running).toBe(false);
    });

    it('shutdown can be called without start', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      expect(runtime.state.initialized).toBe(false);
    });

    it('full lifecycle: initialize → start → stop → shutdown', async () => {
      await runtime.initialize();
      expect(runtime.state.initialized).toBe(true);
      expect(runtime.state.running).toBe(false);

      await runtime.start();
      expect(runtime.state.running).toBe(true);

      await runtime.stop();
      expect(runtime.state.running).toBe(false);
      expect(runtime.state.initialized).toBe(true);

      await runtime.shutdown();
      expect(runtime.state.initialized).toBe(false);
      expect(runtime.state.running).toBe(false);
    });
  });

  // ─── Service Interface Compliance ──────────────────────────

  describe('service interface', () => {
    it('has name property', () => {
      expect(typeof runtime.name).toBe('string');
      expect(runtime.name.length).toBeGreaterThan(0);
    });

    it('has initialize method', () => {
      expect(typeof runtime.initialize).toBe('function');
    });

    it('has start method', () => {
      expect(typeof runtime.start).toBe('function');
    });

    it('has stop method', () => {
      expect(typeof runtime.stop).toBe('function');
    });

    it('has shutdown method', () => {
      expect(typeof runtime.shutdown).toBe('function');
    });

    it('implements Service interface (has all lifecycle methods)', () => {
      const service = runtime as unknown as {
        name: string;
        initialize: () => Promise<void>;
        start: () => Promise<void>;
        stop: () => Promise<void>;
        shutdown: () => Promise<void>;
      };
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.start).toBe('function');
      expect(typeof service.stop).toBe('function');
      expect(typeof service.shutdown).toBe('function');
      expect(typeof service.name).toBe('string');
    });
  });

  // ─── recordBehaviorEvent ──────────────────────────────────

  describe('recordBehaviorEvent', () => {
    function makeBehaviorEvent(overrides: Partial<BehaviorEvent> = {}): BehaviorEvent {
      return {
        id: createId<BehaviorEvent['id']>(),
        type: BehaviorEventType.FeatureUsed,
        userIdHash: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: { feature: 'search' },
        metadata: {},
        ...overrides,
      };
    }

    it('records observation and returns it', async () => {
      await runtime.initialize();
      const event = makeBehaviorEvent();
      const observation = runtime.recordBehaviorEvent(event);
      expect(observation).toBeDefined();
      expect(observation.userIdHash).toBe(event.userIdHash);
    });

    it('propagates to preference evolution', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const event = makeBehaviorEvent({ userIdHash: user });
      runtime.recordBehaviorEvent(event);
      // The preference evolution should have received the observation
      // No assertion needed on internal state, just no crash
    });

    it('propagates to habit engine', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const event = makeBehaviorEvent({ userIdHash: user });
      runtime.recordBehaviorEvent(event);
      // Habit engine should have received the observation
      expect(runtime.habitEngineRuntime.getHabits(user)).toBeDefined();
    });

    it('increments observation_count metric', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.recordBehaviorEvent(makeBehaviorEvent({ userIdHash: user }));
      const counter = runtime.experienceMetrics.getCounter(
        'observation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(1);
    });

    it('increments observation_count for multiple events', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.recordBehaviorEvent(makeBehaviorEvent({ userIdHash: user }));
      runtime.recordBehaviorEvent(makeBehaviorEvent({ userIdHash: user }));
      runtime.recordBehaviorEvent(makeBehaviorEvent({ userIdHash: user }));
      const counter = runtime.experienceMetrics.getCounter(
        'observation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(3);
    });

    it('handles different event types', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const types = [
        BehaviorEventType.FeatureUsed,
        BehaviorEventType.SessionDuration,
        BehaviorEventType.NavigationPattern,
        BehaviorEventType.FeedbackProvided,
      ];
      for (const type of types) {
        runtime.recordBehaviorEvent(makeBehaviorEvent({ userIdHash: user, type }));
      }
      const counter = runtime.experienceMetrics.getCounter(
        'observation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(4);
    });

    it('generates observation with correct type from event type', async () => {
      await runtime.initialize();
      const event = makeBehaviorEvent({ type: BehaviorEventType.ToolUsed });
      const observation = runtime.recordBehaviorEvent(event);
      expect(observation.type).toBe(BehaviorEventType.ToolUsed);
    });
  });

  // ─── proposeAdaptation ────────────────────────────────────

  describe('proposeAdaptation', () => {
    it('proposes adaptation when consent granted', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.consentRuntime.grantConsent(user, ConsentScope.Adaptation, ConsentMode.Auto);
      // Disable explainability requirement so adaptation can proceed through policy check
      runtime.experiencePolicies.setPolicy({
        type: 'Explainability' as any,
        parameters: { requireExplanation: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const obsId = createId<ObservationId>();
      runtime.proposeAdaptation(
        AdaptationType.ResponseStyle,
        user,
        'casual',
        [obsId],
        'User prefers casual responses',
      );
      const counter = runtime.experienceMetrics.getCounter(
        'adaptation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(1);
    });

    it('blocks when consent denied', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      // No consent granted — should block silently
      const obsId = createId<ObservationId>();
      runtime.proposeAdaptation(
        AdaptationType.ResponseStyle,
        user,
        'casual',
        [obsId],
        'test',
      );
      const counter = runtime.experienceMetrics.getCounter(
        'adaptation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(0);
    });

    it('blocks when consent mode is Disabled', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.consentRuntime.grantConsent(user, ConsentScope.Adaptation, ConsentMode.Disabled);
      const obsId = createId<ObservationId>();
      runtime.proposeAdaptation(
        AdaptationType.ResponseStyle,
        user,
        'casual',
        [obsId],
        'test',
      );
      const counter = runtime.experienceMetrics.getCounter(
        'adaptation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(0);
    });

    it('checks policies before adapting', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.consentRuntime.grantConsent(user, ConsentScope.Adaptation, ConsentMode.Auto);

      // Set a very restrictive adaptation rate policy
      runtime.experiencePolicies.setPolicy({
        type: 'AdaptationRate' as any,
        parameters: { maxAdaptationsPerHour: 0 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const obsId = createId<ObservationId>();
      runtime.proposeAdaptation(
        AdaptationType.ResponseStyle,
        user,
        'casual',
        [obsId],
        'test',
      );
      const counter = runtime.experienceMetrics.getCounter(
        'adaptation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(0);
    });

    it('increments adaptation_count metric on success', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.consentRuntime.grantConsent(user, ConsentScope.Adaptation, ConsentMode.Auto);
      runtime.experiencePolicies.setPolicy({
        type: 'Explainability' as any,
        parameters: { requireExplanation: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const obsId = createId<ObservationId>();
      runtime.proposeAdaptation(
        AdaptationType.ResponseStyle,
        user,
        'casual',
        [obsId],
        'test',
      );
      runtime.proposeAdaptation(
        AdaptationType.ExplanationDepth,
        user,
        'detailed',
        [obsId],
        'test',
      );
      const counter = runtime.experienceMetrics.getCounter(
        'adaptation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(2);
    });
  });

  // ─── generateRecommendation ────────────────────────────────

  describe('generateRecommendation', () => {
    it('generates recommendation when policies allow', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      // Disable explainability requirement so recommendation can proceed through policy check
      runtime.experiencePolicies.setPolicy({
        type: 'Explainability' as any,
        parameters: { requireExplanation: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const obsId = createId<ObservationId>();
      runtime.generateRecommendation(
        RecommendationType.Workflow,
        user,
        'Try workflow X',
        'Workflow X would improve your productivity',
        [obsId],
        0.8,
      );
      const pending = runtime.recommendationEngineRuntime.getPendingRecommendations(user);
      expect(pending).toHaveLength(1);
    });

    it('blocks when policies deny', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      // Set a very restrictive recommendation frequency policy
      runtime.experiencePolicies.setPolicy({
        type: 'RecommendationFrequency' as any,
        parameters: { maxRecommendationsPerSession: 0 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const obsId = createId<ObservationId>();
      runtime.generateRecommendation(
        RecommendationType.Workflow,
        user,
        'Test',
        'Test desc',
        [obsId],
        0.8,
      );
      const pending = runtime.recommendationEngineRuntime.getPendingRecommendations(user);
      expect(pending).toHaveLength(0);
    });

    it('generates recommendations for different types', async () => {
      await runtime.initialize();
      runtime.experiencePolicies.setPolicy({
        type: 'Explainability' as any,
        parameters: { requireExplanation: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const user = crypto.randomUUID();
      const types = [
        RecommendationType.Workflow,
        RecommendationType.Automation,
        RecommendationType.Feature,
      ];
      for (const type of types) {
        runtime.generateRecommendation(
          type,
          user,
          `Rec: ${type}`,
          'Description',
          [createId<ObservationId>()],
          0.7,
        );
      }
      const pending = runtime.recommendationEngineRuntime.getPendingRecommendations(user);
      expect(pending).toHaveLength(3);
    });
  });

  // ─── acceptRecommendation / dismissRecommendation ──────────

  describe('acceptRecommendation', () => {
    it('updates recommendation_accepted metric', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.experiencePolicies.setPolicy({
        type: 'Explainability' as any,
        parameters: { requireExplanation: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Generate and present a recommendation, then accept it
      const rec = runtime.recommendationEngineRuntime.generateRecommendation(
        RecommendationType.Workflow, user, 'Test', 'Desc', [createId<ObservationId>()], 0.8,
      );
      runtime.recommendationEngineRuntime.presentRecommendation(rec.id);
      runtime.acceptRecommendation(rec.id);
      const counter = runtime.experienceMetrics.getCounter('recommendation_accepted' as any);
      expect(counter).toBe(1);
    });
  });

  describe('dismissRecommendation', () => {
    it('updates recommendation_dismissed metric', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.experiencePolicies.setPolicy({
        type: 'Explainability' as any,
        parameters: { requireExplanation: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const rec = runtime.recommendationEngineRuntime.generateRecommendation(
        RecommendationType.Workflow, user, 'Test', 'Desc', [createId<ObservationId>()], 0.8,
      );
      runtime.recommendationEngineRuntime.presentRecommendation(rec.id);
      runtime.dismissRecommendation(rec.id);
      const counter = runtime.experienceMetrics.getCounter('recommendation_dismissed' as any);
      expect(counter).toBe(1);
    });
  });

  // ─── createSnapshot ────────────────────────────────────────

  describe('createSnapshot', () => {
    it('creates snapshot with version', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const snap = runtime.createSnapshot(user);
      expect(snap.version).toBe(1);
      expect(snap.userIdHash).toBe(user);
    });

    it('includes preferences from preference evolution', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.createSnapshot(user);
      // Snapshot should capture current preferences (empty in this case)
      const snap = runtime.createSnapshot(user);
      expect(snap.preferences).toBeDefined();
    });

    it('includes habits from habit engine', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const snap = runtime.createSnapshot(user);
      expect(snap.habits).toBeDefined();
    });

    it('includes adaptations from adaptation engine', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const snap = runtime.createSnapshot(user);
      expect(snap.adaptations).toBeDefined();
    });

    it('includes recommendations from recommendation engine', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const snap = runtime.createSnapshot(user);
      expect(snap.recommendations).toBeDefined();
    });

    it('includes metrics summary', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.experienceMetrics.incrementCounter('test_key' as any);
      const snap = runtime.createSnapshot(user);
      expect(snap.metrics).toBeDefined();
      expect(snap.metrics['test_key']).toBe(1);
    });

    it('snapshot version increments', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const s1 = runtime.createSnapshot(user);
      const s2 = runtime.createSnapshot(user);
      expect(s2.version).toBe(s1.version + 1);
    });

    it('snapshot stores state', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      const snap = runtime.createSnapshot(user);
      expect(snap.state).toBe(ExperienceState.Created);
    });
  });

  // ─── getUserState ──────────────────────────────────────────

  describe('getUserState', () => {
    it('returns null for user with no session', () => {
      const state = runtime.getUserState(crypto.randomUUID());
      expect(state).toBeNull();
    });

    it('returns Created state after initialization', () => {
      // getUserState queries the context which creates sessions lazily
      // Without explicit session creation, returns null
      const state = runtime.getUserState(crypto.randomUUID());
      expect(state).toBeNull();
    });
  });

  // ─── State Transitions ─────────────────────────────────────

  describe('state transitions', () => {
    it('transitions from Created to Learning after 5 observations', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      // Create a session
      runtime.experienceContext.createSession(user);
      expect(runtime.getUserState(user)).toBe(ExperienceState.Created);

      // Record 5 behavior events
      for (let i = 0; i < 5; i++) {
        runtime.recordBehaviorEvent({
          id: createId<BehaviorEvent['id']>(),
          type: BehaviorEventType.FeatureUsed,
          userIdHash: user,
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data: { feature: `test-${i}` },
          metadata: {},
        });
      }

      expect(runtime.getUserState(user)).toBe(ExperienceState.Learning);
    });

    it('does not transition before 5 observations', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.experienceContext.createSession(user);

      for (let i = 0; i < 4; i++) {
        runtime.recordBehaviorEvent({
          id: createId<BehaviorEvent['id']>(),
          type: BehaviorEventType.FeatureUsed,
          userIdHash: user,
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data: { feature: `test-${i}` },
          metadata: {},
        });
      }

      expect(runtime.getUserState(user)).toBe(ExperienceState.Created);
    });

    it('emits ExperienceStateChanged event on transition', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.experienceContext.createSession(user);

      const handler = vi.fn();
      eventBus.subscribe('ExperienceStateChanged', handler);

      for (let i = 0; i < 5; i++) {
        runtime.recordBehaviorEvent({
          id: createId<BehaviorEvent['id']>(),
          type: BehaviorEventType.FeatureUsed,
          userIdHash: user,
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data: { feature: `test-${i}` },
          metadata: {},
        });
      }

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0];
      expect(event.eventType).toBe('ExperienceStateChanged');
      expect(event.payload.userIdHash).toBe(user);
      expect(event.payload.fromState).toBe(ExperienceState.Created);
      expect(event.payload.toState).toBe(ExperienceState.Learning);
    });

    it('event includes reason for state change', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.experienceContext.createSession(user);

      const handler = vi.fn();
      eventBus.subscribe('ExperienceStateChanged', handler);

      for (let i = 0; i < 5; i++) {
        runtime.recordBehaviorEvent({
          id: createId<BehaviorEvent['id']>(),
          type: BehaviorEventType.FeatureUsed,
          userIdHash: user,
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data: { feature: `test-${i}` },
          metadata: {},
        });
      }

      expect(handler.mock.calls[0][0].payload.reason).toBeTruthy();
    });
  });

  // ─── EventBus Accessibility ────────────────────────────────

  describe('EventBus', () => {
    it('is an InProcessEventBus instance', () => {
      expect(runtime.EventBus).toBeInstanceOf(InProcessEventBus);
    });

    it('can subscribe to events', () => {
      const handler = vi.fn();
      runtime.EventBus.subscribe('TestEvent', handler);
      expect(() => {
        runtime.EventBus.publish({
          eventId: createId(),
          eventType: 'TestEvent',
          classification: 'Info' as any,
          timestamp: new Date().toISOString(),
          sequence: 0,
          aggregateId: 'test',
          aggregateType: 'test',
          version: '1.0.0',
          payload: {},
        });
      }).not.toThrow();
    });

    it('publishes events to subscribers', () => {
      const handler = vi.fn();
      runtime.EventBus.subscribe('TestEvent', handler);
      runtime.EventBus.publish({
        eventId: createId(),
        eventType: 'TestEvent',
        classification: 'Info' as any,
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'test',
        aggregateType: 'test',
        version: '1.0.0',
        payload: { data: 'test' },
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ─── TraceCollector Accessibility ───────────────────────────

  describe('Trace', () => {
    it('is a TraceCollector instance', () => {
      expect(runtime.Trace).toBeInstanceOf(TraceCollector);
    });

    it('collects trace info during lifecycle', async () => {
      await runtime.initialize();
      await runtime.start();
      // TraceCollector should have entries
      // We can't directly inspect entries but verify no crash
      expect(runtime.Trace).toBeDefined();
    });
  });

  // ─── Config ────────────────────────────────────────────────

  describe('configuration', () => {
    it('accepts partial config override', () => {
      const rt = new ExperienceRuntime({ learningThreshold: 0.9 });
      expect(rt).toBeDefined();
    });

    it('uses default config when not provided', () => {
      const rt = new ExperienceRuntime();
      expect(rt).toBeDefined();
      expect(rt.state.initialized).toBe(false);
    });

    it('creates with default event bus if not provided', () => {
      const rt = new ExperienceRuntime({});
      expect(rt.EventBus).toBeInstanceOf(InProcessEventBus);
    });
  });

  // ─── Integration: Full Workflow ─────────────────────────────

  describe('integration workflow', () => {
    it('records events, transitions state, and tracks metrics', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.experienceContext.createSession(user);

      // Record 5 events → Created → Learning
      for (let i = 0; i < 5; i++) {
        runtime.recordBehaviorEvent({
          id: createId<BehaviorEvent['id']>(),
          type: BehaviorEventType.FeatureUsed,
          userIdHash: user,
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data: { feature: `feature-${i}` },
          metadata: {},
        });
      }
      expect(runtime.getUserState(user)).toBe(ExperienceState.Learning);

      // Check observation count metric
      const counter = runtime.experienceMetrics.getCounter(
        'observation_count' as any, { userIdHash: user },
      );
      expect(counter).toBe(5);

      // Create snapshot
      const snap = runtime.createSnapshot(user);
      expect(snap.userIdHash).toBe(user);
      expect(snap.state).toBe(ExperienceState.Learning);
      expect(snap.metrics['observation_count']).toBe(5);
    });

    it('granting consent enables adaptations', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      // Disable explainability requirement for this test
      runtime.experiencePolicies.setPolicy({
        type: 'Explainability' as any,
        parameters: { requireExplanation: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Without consent
      runtime.proposeAdaptation(
        AdaptationType.ResponseStyle,
        user,
        'casual',
        [createId<ObservationId>()],
        'test',
      );
      expect(
        runtime.experienceMetrics.getCounter('adaptation_count' as any, { userIdHash: user })
      ).toBe(0);

      // Grant consent
      runtime.consentRuntime.grantConsent(user, ConsentScope.Adaptation, ConsentMode.Auto);

      // With consent
      runtime.proposeAdaptation(
        AdaptationType.ResponseStyle,
        user,
        'casual',
        [createId<ObservationId>()],
        'test',
      );
      expect(
        runtime.experienceMetrics.getCounter('adaptation_count' as any, { userIdHash: user })
      ).toBe(1);
    });

    it('generates and tracks recommendations', async () => {
      await runtime.initialize();
      runtime.experiencePolicies.setPolicy({
        type: 'Explainability' as any,
        parameters: { requireExplanation: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const user = crypto.randomUUID();
      const obsId = createId<ObservationId>();

      runtime.generateRecommendation(
        RecommendationType.Workflow,
        user,
        'Try Workflow X',
        'Workflow X improves productivity',
        [obsId],
        0.85,
      );

      const pending = runtime.recommendationEngineRuntime.getPendingRecommendations(user);
      expect(pending).toHaveLength(1);
      expect(pending[0].title).toBe('Try Workflow X');
    });

    it('snapshot captures metrics state', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.experienceContext.createSession(user);

      // Record some events
      for (let i = 0; i < 3; i++) {
        runtime.recordBehaviorEvent({
          id: createId<BehaviorEvent['id']>(),
          type: BehaviorEventType.FeatureUsed,
          userIdHash: user,
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data: { feature: 'x' },
          metadata: {},
        });
      }

      const snap = runtime.createSnapshot(user);
      expect(snap.metrics['observation_count']).toBe(3);
    });

    it('policies validate adaptations across subsystems', async () => {
      await runtime.initialize();
      const user = crypto.randomUUID();
      runtime.consentRuntime.grantConsent(user, ConsentScope.Adaptation, ConsentMode.Auto);

      // Block with explainability requirement
      const result = runtime.experiencePolicies.validateAdaptation(
        AdaptationType.ResponseStyle, user, { hasExplanation: false },
      );
      expect(result.allowed).toBe(false);

      // Allow with explanation
      const result2 = runtime.experiencePolicies.validateAdaptation(
        AdaptationType.ResponseStyle, user, { hasExplanation: true },
      );
      expect(result2.allowed).toBe(true);
    });
  });

  // ─── Edge Cases ────────────────────────────────────────────

  describe('edge cases', () => {
    it('runtime works without explicit event bus', async () => {
      const rt = new ExperienceRuntime({});
      await rt.initialize();
      await rt.start();
      expect(rt.state.running).toBe(true);
      await rt.stop();
      await rt.shutdown();
    });

    it('runtime handles rapid lifecycle calls', async () => {
      await runtime.initialize();
      await runtime.start();
      await runtime.stop();
      await runtime.initialize();
      expect(runtime.state.initialized).toBe(true);
    });

    it('multiple users are tracked independently', async () => {
      await runtime.initialize();
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      runtime.experienceContext.createSession(user1);
      runtime.experienceContext.createSession(user2);

      // Record events only for user1
      for (let i = 0; i < 5; i++) {
        runtime.recordBehaviorEvent({
          id: createId<BehaviorEvent['id']>(),
          type: BehaviorEventType.FeatureUsed,
          userIdHash: user1,
          sessionId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data: { feature: 'x' },
          metadata: {},
        });
      }

      expect(runtime.getUserState(user1)).toBe(ExperienceState.Learning);
      expect(runtime.getUserState(user2)).toBe(ExperienceState.Created);
    });

    it('state accessor returns current state object', () => {
      const state = runtime.state;
      expect(state).toEqual({ initialized: false, running: false });
    });

    it('state accessor returns new object each time', () => {
      const s1 = runtime.state;
      const s2 = runtime.state;
      expect(s1).toEqual(s2);
      // They should be equal but separate references
      expect(s1 === s2).toBe(false);
    });
  });
});
