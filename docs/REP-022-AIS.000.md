# REP-022-AIS.000 — Personal Intelligence Runtime Report

> **Architecture Report** for TASK-AIS-005B.000
> Personal Intelligence Runtime — Stage VI (Product Intelligence)

---

## 1. Executive Summary

The Personal Intelligence Runtime (PIR) introduces a personal intelligence orchestration layer that sits above all 8 existing domain Runtimes (Memory, Knowledge, Identity, Capability, Workflow, Cognitive, Experience, Desktop) and the Platform layer. It is implemented as **15 tightly-coordinated subsystems** plus a dedicated metrics collector, all wired together by a single `PersonalRuntime` orchestrator class.

PIR is validated by **1,066 unit and integration tests** across **20 test files**, all passing at a 100% pass rate. The implementation spans **21 source files** and approximately **5,671 lines of TypeScript** in strict mode.

The key architectural achievement of PIR is its strict adherence to the **orchestration-only** design principle: PIR never imports or depends on any runtime class directly. Instead, it communicates exclusively through 9 well-defined contract interfaces. This ensures complete decoupling and makes PIR testable in isolation with mock contracts.

---

## 2. Introduction

### 2.1 The Problem

The AIS platform had 8 domain Runtimes, each managing its own domain (Memory, Knowledge, Identity, etc.), and a Platform layer that coordinated their lifecycle. However, there was no layer that understood the **user as a whole person** — their goals, habits, attention patterns, learning progress, daily workflow, and personal decision-making. Each runtime operated in isolation without awareness of the user's broader context.

### 2.2 The Solution

PIR introduces a **personal intelligence layer** that:

1. **Understands the user holistically** by building unified context snapshots from all runtime subsystems
2. **Manages the user's goal lifecycle** with a 5-level hierarchy (Vision → Strategy → Goal → Objective → Task)
3. **Predicts behavior** based on activity history, active goals, and recent patterns
4. **Tracks habits and attention** to understand productivity patterns
5. **Generates recommendations** across 8 categories tailored to the user's context
6. **Supports structured decision-making** with 6 analysis frameworks
7. **Delivers daily briefs** at 5 scheduled intervals
8. **Maintains a personal assistant state** that integrates all subsystem data

### 2.3 Why Orchestration Only?

PIR was deliberately designed as an orchestration-only layer for three reasons:

- **Separation of Concerns** — Each domain runtime owns its data. PIR only reads snapshots and writes its own derived data (goals, plans, habits, etc.).
- **Testability** — PIR can be fully tested with mock contracts without spinning up real runtimes.
- **Stability** — Changes to individual runtimes never break PIR as long as the contract interface is honored.

---

## 3. Design Principles

### 3.1 Orchestration Only

PIR makes decisions; it does not store or modify data belonging to other runtimes. Every subsystem reads from contracts and writes to its own internal maps. The only cross-runtime interaction is through event publishing via the Platform contract.

### 3.2 Contract-Based Integration

All runtime communication is mediated by 9 contract interfaces bundled into a `PersonalRuntimeContracts` object. PIR never imports any runtime class directly. This creates a clean dependency boundary and makes the system resilient to runtime internal changes.

### 3.3 No Data Duplication

PIR builds lightweight snapshot types (`PersonalContext` with 10 fields, `UnifiedContext` with 7 typed sub-snapshots) but does not persist raw runtime state. If a contract is temporarily unavailable, PIR gracefully falls back to empty defaults rather than caching stale data.

### 3.4 Fire-and-Forget Event Publishing

All subsystem events are published asynchronously using `void platform.publishEvent(...)`. This means event delivery failures never block or crash the subsystem. This design follows ADR-002 and ensures that PIR's critical path (goal management, priority scoring, planning) is never impacted by event bus latency or failures.

### 3.5 Immutable Domain Objects

Every domain object in PIR uses `Object.freeze(...)` at creation time and `readonly` modifiers on type definitions. This prevents accidental mutation and makes the system easier to reason about, especially in event-driven scenarios where multiple subsystems may reference the same object.

---

## 4. Architecture Overview

### 4.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       PersonalRuntime                        │
│  (Orchestrator — 15 subsystems + PersonalMetricsCollector)   │
│                                                               │
│  UserProfile  │  Goal    │  Priority │  Context │  Planning  │
│  Prediction   │  Habit   │  Recommend│ Atten.   │ Reflection │
│  Learning     │ Decision │  Daily    │ Assistant│  Metrics    │
│                                                               │
│  Internal State: 15 Maps + 1 MetricsCollector                │
│  External Dependencies: 9 Contract Interfaces                 │
│  Events: 33 PIR-specific types via Platform event bus        │
├───────────────────────────────────────────────────────────────┤
│              PersonalRuntimeContracts (9 contracts)            │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────┤
│Ident.│Memory│Knowl.│Workf.│Exper.│Cogn. │Capab.│Desktop│Platf.│
├──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┤
│                    Domain Runtimes (8)                         │
├───────────────────────────────────────────────────────────────┤
│                    Platform Runtime                            │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 Subsystem Coordination

PIR subsystems coordinate through two mechanisms:

1. **Shared Contract Bundle** — All subsystems receive the same `PersonalRuntimeContracts` object and can read from any runtime. For example, `ContextRuntime` reads from all 7 data-providing contracts to build the unified context, while `AttentionRuntime` reads from Desktop to estimate cognitive load.

2. **Event Bus** — Subsystems publish events that other subsystems can react to. For example, `GoalRuntime` publishes `GoalCompleted`, which could trigger `ReflectionRuntime` to update its accomplishments list, or `MetricsCollector` to increment its goals-completed gauge.

### 4.3 Data Ownership

Each PIR subsystem owns its data in an internal `Map<string, FrozenObject>`:

| Subsystem | Owns | Key Type |
|---|---|---|
| UserProfileRuntime | Cached PersonalContext | `PersonalContext` |
| GoalRuntime | Goal entities | `Goal` |
| PriorityRuntime | Cached scores | `PriorityScore` |
| ContextRuntime | Cached unified context | `UnifiedContext` |
| PlanningRuntime | Plans and items | `Plan` |
| PredictionRuntime | Predictions, history, validations | `Prediction` |
| HabitRuntime | Habit patterns | `Habit` |
| RecommendationRuntime | Recommendations | `PersonalRecommendation` |
| AttentionRuntime | Attention snapshots (array) | `AttentionSnapshot[]` |
| ReflectionRuntime | Reflections | `Reflection` |
| LearningRuntime | Learning items and edges | `LearningItem`, `LearningEdge` |
| DecisionRuntime | Decisions | `Decision` |
| DailyBriefRuntime | Briefs and delivery status | `DailyBrief` |
| AssistantRuntime | Assistant state | `AssistantState` |
| PersonalMetricsCollector | Counters, gauges, series | `number`, `SeriesEntry[]` |

---

## 5. Subsystem Details

### 5.1 UserProfileRuntime

Builds a `PersonalContext` by querying Identity (user ID, roles, preferences), Knowledge (recent items → skills and interests), Workflow (running instances → current activity), and Desktop (active window → activity, desktop state → environment). This is the entry point for understanding who the user is and what they are doing right now.

### 5.2 GoalRuntime

The most complex subsystem, implementing a full goal lifecycle with a 5-level hierarchy. Goals transition through 6 states (Draft → Active → Paused/Completed/Archived/Cancelled) with strict validation. Parent-child relationships form a tree with cycle detection. On goal completion, progress propagates upward to recalculate parent averages automatically.

### 5.3 PriorityRuntime

Implements an 8-factor weighted scoring model that assigns each goal a priority score from 0 to 100. Factors include deadline proximity (exponential decay), user-assigned importance, urgency derived from status, energy level, context fit, dependency readiness, risk inverse (lower for tasks), and inverse progress (higher for unstarted goals). Weights are configurable but default to importance=0.25 as the dominant factor.

### 5.4 ContextRuntime

Builds a `UnifiedContext` with 7 typed sub-snapshots (Memory, Knowledge, Identity, Desktop, Workflow, Experience, Conversation). Each snapshot builder wraps its contract calls in try/catch to gracefully handle unavailable contracts, returning empty defaults rather than crashing. This ensures PIR is resilient to partial runtime failures.

### 5.5 PlanningRuntime

Manages action plans across 5 time periods (Today, Tomorrow, Week, Month, Quarter). Supports the full plan lifecycle including creation, item management, completion tracking, priority-based reordering, plan merging, plan splitting, optimization, and constraint-based re-planning. Re-planning supports filtering by priority threshold, maximum total minutes budget, and maximum item count.

### 5.6 PredictionRuntime

Generates 5 types of predictions using rule-based heuristics: next action (frequency analysis of history), next task (deadline proximity + priority), next question (least-recently-discussed topic), next document (most frequently referenced), and next workflow (active workflow count). All predictions carry confidence scores and human-readable reasoning. Validation tracking enables accuracy measurement per prediction type.

### 5.7 HabitRuntime

Detects recurring behavioral patterns from activity arrays using frequency-based clustering. Automatically infers habit frequency (Daily, Weekly, Weekday, Weekend, Monthly) from timestamp distributions. Confidence grows logarithmically toward 1.0 as observations accumulate. Users can confirm detected patterns or mark them as broken, with corresponding confidence adjustments.

### 5.8 RecommendationRuntime

Generates 8 types of recommendations (Action, Learning, Reminder, Optimization, Automation, Knowledge, Focus, Health) with confidence scores and reasoning. Implements an auto-eviction policy: when the recommendation cap is reached, the oldest non-accepted, non-dismissed recommendation is removed. Acceptance and dismissal are tracked as mutually exclusive states.

### 5.9 AttentionRuntime

Records periodic attention snapshots that estimate cognitive load from open window count, detect context switches from activity changes, track focus bout duration, and determine attention state using a multi-factor heuristic (cognitive load ≥ 85 → Overloaded; focus duration > 45 min → Fatigued; frequent switches → ContextSwitching; multiple distractions → Distracted; sustained moderate load → Focused).

### 5.10 ReflectionRuntime

Generates structured reflections over 3 time periods (Daily, Weekly, Monthly). Scores productivity based on the ratio of accomplished to planned items with bonuses and penalties. Analyzes productivity patterns by keyword-based categorization (communication, development, learning, planning). Suggests targeted improvements based on score level and completion ratio.

### 5.11 LearningRuntime

Manages a directed graph of learning items with 3 edge types (prerequisite, related, applies_to). Supports 6 mastery states with validated transitions. Automatic confidence decay for unpracticed items triggers downgrades from Practicing → Declining → Forgotten. BFS-based path finding computes the full prerequisite chain from any target item to its roots.

### 5.12 DecisionRuntime

Implements 6 structured decision analysis methods, each with different scoring weights: Pros/Cons (1.0/-1.0/0), SWOT (0.5/-0.5/0), Risk Analysis (0.3/-0.3/-0.8), Scenario Analysis (0.4/-0.4/-0.4), Expected Outcome (0.6/-0.6/-0.2), Trade-offs (0.7/-0.7/-0.1). Auto-scoring applies method-specific weights to pros, cons, and risk counts to produce normalized 0–100 option scores.

### 5.13 DailyBriefRuntime

Generates curated briefs at 5 intervals with full delivery tracking. Each brief can include narrative summaries, key points, goal references, active recommendations, relevant predictions, and named metrics. Metric history tracking enables trend analysis across briefs over time.

### 5.14 AssistantRuntime

Manages the personal assistant's lifecycle (activate/deactivate) and state. Builds natural language summaries of yesterday's accomplishments and today's prioritized plan from goal references. Integrates with other subsystems through the shared contract bundle.

### 5.15 PersonalMetricsCollector

A lightweight in-process metrics system with counters, gauges, and time series. Provides 8 convenience getters for PIR-specific metrics (goals completed, habits detected, recommendations accepted, prediction accuracy, learning progress, decision success rate, attention score, daily productivity) and trend analysis (weekly, monthly).

---

## 6. Contract Integration

### 6.1 Contract Dependency Map

```
UserProfileRuntime ─── Identity, Knowledge, Workflow, Desktop, Platform
GoalRuntime ─────────── Platform
PriorityRuntime ────── Platform
ContextRuntime ──────── Identity, Memory, Knowledge, Desktop, Workflow, Experience, Cognitive, Platform
PlanningRuntime ─────── Platform
PredictionRuntime ────── Platform
HabitRuntime ────────── Platform
RecommendationRuntime ── Platform
AttentionRuntime ─────── Desktop, Workflow, Platform
ReflectionRuntime ────── Platform
LearningRuntime ──────── Platform
DecisionRuntime ──────── Platform
DailyBriefRuntime ────── Platform
AssistantRuntime ─────── Identity, Platform
PersonalMetricsCollector (none — self-contained)
```

Most subsystems only need `PlatformContract` for event publishing. The two subsystems that read the most contracts are `UserProfileRuntime` (5 contracts) and `ContextRuntime` (8 contracts), reflecting their roles as context aggregators.

### 6.2 Graceful Degradation

All contract reads are wrapped in try/catch blocks in `UserProfileRuntime` and `ContextRuntime`. If a contract is unavailable, the subsystem returns an empty default value rather than crashing. This ensures PIR continues to function even when some domain runtimes are offline or have not yet been bootstrapped.

---

## 7. Event System

### 7.1 Event Classifications

PIR events follow the INV-012 invariant (no domain event without a classification):

| Classification | Count | Description |
|---|---|---|
| `StateChange` | 17 | Lifecycle transitions and state mutations |
| `Info` | 9 | Informational events (generation, detection) |
| `Result` | 7 | Outcome events (completion, scoring, resolution) |
| `Action` | 4 | User-initiated actions (accept, dismiss, deliver) |
| `Error` | 1 | Alert conditions (attention overload/fatigue) |

### 7.2 Event Factory

All events are created using the `createPersonalEventBase(eventType, classification, aggregateId)` factory function, which generates a consistent envelope with `eventId` (UUID), `eventType`, `classification`, `timestamp`, `aggregateId`, and `aggregateType: 'Personal'`. This ensures all PIR events are traceable to the Personal aggregate root.

### 7.3 Fire-and-Forget Publishing

Events are published with `void platform.publishEvent(...)` calls, meaning the publishing is intentionally fire-and-forget. The subsystem never awaits the event delivery promise. This prevents event bus latency or failures from blocking the subsystem's critical path.

---

## 8. Error Handling

### 8.1 Error Hierarchy

PIR defines a 3-level error hierarchy:

1. **Base**: `PersonalRuntimeError` — carries `code` (string) and `details` (Record<string, unknown>)
2. **Subsystem-specific**: 15 subclasses with typed additional fields (e.g., `GoalNotFoundError.goalId`, `GoalValidationError.violations`)
3. **Cross-cutting**: `ContractNotAvailableError` for missing runtime contracts

### 8.2 Error Strategy

- **Input validation errors** throw immediately with descriptive violation lists (e.g., `GoalValidationError` with an array of violation strings)
- **Entity-not-found errors** throw with the missing entity ID for easy debugging
- **Contract unavailability** is handled gracefully at the subsystem level with try/catch, but explicit contract requirements throw `ContractNotAvailableError` during construction
- **Capacity limits** throw validation errors (e.g., "Maximum goal count reached") rather than silently dropping data

### 8.3 Graceful Degradation

PIR follows a principle of graceful degradation: if a contract is temporarily unavailable, the affected subsystem continues with empty defaults rather than crashing. This is implemented in `ContextRuntime` (7 snapshot builders with try/catch) and `UserProfileRuntime` (knowledge and workflow queries with try/catch).

---

## 9. Test Coverage

### 9.1 Test Summary

| Metric | Value |
|---|---|
| Total test files | 20 |
| Total test cases | 1,066 |
| Passed | 1,066 |
| Failed | 0 |
| Pass rate | 100% |
| Test runner | Vitest |
| TypeScript strict mode | Enabled |

### 9.2 Categories Breakdown

| # | Category | File(s) | Tests | Key Areas |
|---|---|---|---|---|
| 1 | Types | `types.test.ts` | 65 | All enums (12), interfaces, type compliance |
| 2 | Errors | `errors.test.ts` | 67 | All 17 error classes, inheritance, codes, details |
| 3 | Events | `events.test.ts` | 47 | All 33 event types, factory function, classifications |
| 4 | UserProfile | `user-profile.test.ts` | 41 | Profile building, context refresh, summary |
| 5 | Goal | `goal/goal.test.ts` | 113 | Full lifecycle, hierarchy, transitions, progress propagation |
| 6 | Priority | `priority/priority.test.ts` | 52 | 8-factor scoring, batch ranking, rank change detection |
| 7 | Context | `context/context.test.ts` | 36 | 7 snapshot builders, refresh, graceful degradation |
| 8 | Planning | `planning/planning.test.ts` | 82 | CRUD, merge, split, optimize, rePlan |
| 9 | Prediction | `prediction/prediction.test.ts` | 73 | 5 prediction types, validation, accuracy tracking |
| 10 | Habit | `habit/habit.test.ts` | 47 | Detection, confirmation, broken patterns, frequency inference |
| 11 | Recommendation | `recommendation/recommendation.test.ts` | 38 | Generation, accept/dismiss, eviction, cleanup |
| 12 | Attention | `attention/attention.test.ts` | 43 | Snapshot recording, state detection, alerts, scoring |
| 13 | Reflection | `reflection/reflection.test.ts` | 34 | Generation, scoring, pattern analysis, trends |
| 14 | Learning | `learning/learning.test.ts` | 50 | Graph operations, mastery transitions, decay, path finding |
| 15 | Decision | `decision/decision.test.ts` | 38 | 6 methods, auto-scoring, resolution, method comparison |
| 16 | Daily Brief | `daily/daily.test.ts` | 33 | Generation, delivery, metric history, trends |
| 17 | Assistant | `assistant/assistant.test.ts` | 49 | Lifecycle, state updates, summary/plan generation |
| 18 | Metrics | `metrics/metrics.test.ts` | 40 | Counters, gauges, series, trends, export, reset |
| 19 | PersonalRuntime | `personal-runtime.test.ts` | 57 | Orchestrator lifecycle, initialization, state summary, dispose |
| 20 | Integration | `integration/integration.test.ts` | 61 | Cross-subsystem interaction, contract wiring, end-to-end flows |

### 9.3 Test Approach

All tests use **mock contracts** to isolate PIR from real runtimes. This means:
- Tests execute in under 6 seconds (no runtime bootstrap overhead)
- Tests are deterministic and repeatable
- Tests validate contract compliance (PIR works with any contract implementation)
- Integration tests verify cross-subsystem event flows and data consistency

---

## 10. Performance Considerations

### 10.1 In-Process Architecture

PIR runs entirely in-process with no external dependencies. All data is stored in JavaScript Maps with frozen values. This means:
- **Memory**: O(n) where n is the number of entities per subsystem (typically < 1000)
- **CPU**: All operations are O(n) or O(n log n) — no quadratic algorithms
- **Startup**: Near-instantaneous (constructor only instantiates classes, no I/O)

### 10.2 Event Publishing Overhead

Fire-and-forget event publishing adds negligible overhead since the platform event bus processes events asynchronously. The subsystem never blocks on event delivery.

### 10.3 Capacity Limits

All subsystems enforce configurable capacity limits to prevent unbounded memory growth:
- Goals: 1000 (default)
- Plans: 100 (default)
- Habits: 200 (default)
- Recommendations: 100 (default, with auto-eviction)
- Learning items: 500 (default)
- Decisions: 100 (default)
- Attention snapshots: 1000 (default, FIFO eviction)
- Daily briefs: 365 (default, oldest-first eviction)

### 10.4 Scalability

PIR is designed for a single user. In multi-user scenarios, each user would have their own `PersonalRuntime` instance. The shared platform event bus would need to be extended with user-scoped event channels for isolation.

---

## 11. Risks and Limitations

### 11.1 Current Limitations

| # | Limitation | Impact | Mitigation |
|---|---|---|---|
| 1 | **No persistence** — PIR stores all data in-memory Maps | Data lost on process restart | Future: add persistence layer or rely on runtime storage |
| 2 | **Rule-based predictions** — No ML models | Prediction accuracy depends on simple heuristics | Future: integrate ML prediction service via contract |
| 3 | **Single-user design** — One PersonalRuntime per user | Memory scales linearly with user count | Future: add persistence and user-scoped isolation |
| 4 | **Synchronous context building** — Context building awaits contract calls | Blocks during contract reads | Risk is low since contracts are in-process |
| 5 | **No real-time attention tracking** — Requires manual snapshot recording | Attention data is only as fresh as the last snapshot | Future: add automated periodic snapshot recording |

### 11.2 Architecture Risks

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| 1 | Contract interface changes break PIR | Low | High | ADR governance; contract versioning |
| 2 | Event bus saturation under high subsystem activity | Low | Medium | Fire-and-forget already prevents blocking |
| 3 | Memory pressure from large goal hierarchies | Low | Medium | Configurable capacity limits |
| 4 | Priority scoring gaming (user sets all goals to max priority) | Medium | Low | Multiple factors prevent single-factor dominance |

---

## 12. Next Steps

### 12.1 Short-Term (Current Milestone)

- ✅ PIR source implementation complete
- ✅ 1,066 tests passing
- ✅ Documentation (SRC-012.000, REP-022-AIS.000, TST-012.000)

### 12.2 Medium-Term

1. **Persistence Layer** — Add optional persistence for goals, plans, habits, and learning data. This can be implemented as an additional contract or a storage adapter injected into each subsystem.
2. **Automated Snapshot Recording** — Add a timer-based mechanism in `AttentionRuntime` to automatically record attention snapshots at regular intervals without manual triggers.
3. **Cross-Subsystem Reactions** — Add event subscribers in subsystems that react to events from other subsystems (e.g., `ReflectionRuntime` listens for `GoalCompleted` to auto-update accomplishments).
4. **Extended Priority Factors** — Integrate real-time energy and context data from wearables or calendar APIs via additional contracts.

### 12.3 Long-Term

1. **ML-Based Predictions** — Replace rule-based heuristics with machine learning models trained on historical prediction validation data.
2. **Multi-User Isolation** — Design and implement user-scoped event channels and data isolation for multi-tenant deployments.
3. **Natural Language Brief Generation** — Integrate the Cognitive runtime's LLM capabilities to generate richer, more contextual daily briefs.
4. **Workflow Integration** — Enable PIR to suggest and auto-create workflow instances based on plan items and predictions.
