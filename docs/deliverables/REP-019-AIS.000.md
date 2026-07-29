# REP-019-AIS.000 — Experience Runtime Architecture Report

## Task ID
TASK-AIS-004A.000

## Priority
P0 / CRITICAL

## Date
2026-07-30

---

## 1. Overview

Experience Runtime is the platform's long-term adaptation layer. Unlike Memory Runtime (which stores facts) or Identity Runtime (which manages profiles), Experience Runtime builds a probabilistic model of user interaction patterns and gradually adapts platform behavior.

## 2. Architectural Decisions

### 2.1 Probabilistic Model

All observations accumulate statistical evidence before triggering changes. A preference requires ≥3 observations and ≥0.6 confidence before being considered "Established". Habit detection requires ≥5 occurrences (configurable via `minHabitOccurrences`). This prevents spurious adaptations from isolated events.

### 2.2 Explainability by Design

Every adaptation generates an ExplainabilityRecord that answers:
- Why did this change? (reason)
- Based on what observations? (evidence chain)
- When did it happen? (timestamp)
- What were the previous and new states? (state diff)

### 2.3 Consent-First Architecture

All user-affecting operations (adaptations, recommendations, profile switches, context detection) pass through the Consent Runtime. Three modes:
- **Disabled**: No automated changes
- **Ask**: Changes require explicit user approval
- **Auto**: Changes proceed within allowed policy boundaries

### 2.4 Contract-Based Integration

Experience Runtime defines 6 interface contracts for integration with other runtimes. No direct imports of concrete runtime implementations. This allows:
- Independent development and testing
- Runtime substitution in test environments
- Clear architectural boundaries

## 3. Data Flow

```
BehaviorEvent → BehaviorRuntime.recordEvent()
                    ↓
               Observation (provenance unit)
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
PreferenceEvolution  HabitEngine  AdaptationEngine
    ↓               ↓               ↓
PreferenceChange  HabitDetected  AdaptationApplied
    ↓               ↓               ↓
RecommendationRuntime (generates suggestions)
    ↓
ConsentRuntime (gates user-affecting actions)
    ↓
ExperienceMetrics (tracks all metrics)
    ↓
SnapshotRuntime (periodic snapshots for rollback)
```

## 4. State Machine

```
Created → Learning → Observing → Adapting → Stable → Archived
                              ↑           ↓
                              └── Relearning ←┘
```

State transitions are triggered automatically based on accumulated observations and detected patterns:
- **Created → Learning**: After 5 observations
- **Learning → Observing**: After 20 observations
- **Observing → Adapting**: After 3 habits detected
- **Adapting → Stable**: After 3 active adaptations

## 5. Subsystem Details

### 5.1 Behavior Runtime
- Collects anonymized events (feature usage, session duration, interaction modes)
- Enforces per-user observation limits
- Converts events to Observation records for downstream provenance

### 5.2 Preference Evolution
- Sliding window of 100 observations per (user, preferenceKey)
- Statistical analysis of value frequency
- Triggers PreferenceChanged events only when confidence threshold met

### 5.3 Habit Engine
- Groups observations by type and detects periodicity
- Coefficient of variation analysis for pattern detection
- Strength classification: Weak/Moderate/Strong/Core

### 5.4 Adaptation Engine
- Full lifecycle: Proposed → Applied → Reverted/Expired
- 7-day TTL for applied adaptations
- Evidence chain tracking for explainability

### 5.5 Recommendation Runtime
- Full lifecycle: Generated → Presented → Accepted/Dismissed/Expired
- Per-session limit enforcement
- Confidence-based prioritization

### 5.6 Experience Graph
- Nodes: User, Habit, Preference, Goal, Project, Domain, Skill, Context
- Edges: 8 relationship types with weights
- BFS pathfinding and depth-limited subgraph extraction

### 5.7 Personalization Profiles
- Built-in: Work, Home, Study, Research
- Custom profiles supported
- Activation modes: Manual, Auto, Policy
- Only one active profile per user at a time

### 5.8 Context Switching
- Sliding window signal matching
- Configurable detection window size
- Automatic context history tracking

### 5.9 Explainability Runtime
- Triple-indexed storage (by ID, target, user, adaptation)
- Human-readable explanation generation
- State diff tracking

### 5.10 Experience Policies
- 7 default policies: Privacy, Explainability, AdaptationRate, RecommendationFrequency, LearningThreshold, Consent, DataRetention
- Policy evaluation with context enrichment
- Violation errors with reasons

## 6. Event System

16 event types defined:
1. HabitDetected
2. PreferenceChanged
3. AdaptationApplied
4. AdaptationReverted
5. RecommendationGenerated
6. ProfileActivated
7. ProfileSwitched
8. ContextChanged
9. LearningCheckpointCreated
10. ExperienceStateChanged
11. SnapshotCreated
12. SnapshotRestored
13. ConsentGranted
14. ConsentRevoked
15. ObservationRecorded
16. BehaviorEventCollected

All events extend DomainEventBase with typed payloads.

## 7. Error Hierarchy

30+ error classes organized by subsystem:
- Behavior: BehaviorEventValidationError, BehaviorEventStorageError
- Preference: PreferenceValidationError, InsufficientObservationsError, PreferenceConflictError
- Habit: HabitDetectionError, HabitNotFoundError
- Adaptation: AdaptationValidationError, AdaptationRevertError, AdaptationExpiredError
- Recommendation: RecommendationLimitError, RecommendationValidationError
- Profile: ProfileNotFoundError, ProfileConflictError
- Context: ContextDetectionError
- Consent: ConsentRequiredError, ConsentDeniedError, ConsentExpiredError
- Snapshot: SnapshotNotFoundError, SnapshotExportError, SnapshotImportError
- FSM: ExperienceFSMError
- Graph: ExperienceGraphError
- Explainability: ExplainabilityError
- Policy: PolicyViolationError, PolicyNotFoundError

## 8. Testing

- 1,172 tests across 15 test files
- All tests pass
- Coverage includes: unit tests, integration tests, error scenarios, event emission, edge cases, multi-user isolation

## 9. Compliance

- TypeScript Strict: ✅ 0 compile errors
- Immutable DTOs: ✅ All interfaces use readonly
- DI Only: ✅ Constructor injection throughout
- Event Bus: ✅ All subsystems publish events
- Trace: ✅ All subsystems log to TraceCollector
- No Circular Dependencies: ✅ Unidirectional imports
- Contract-Based Integration: ✅ No direct runtime dependencies
