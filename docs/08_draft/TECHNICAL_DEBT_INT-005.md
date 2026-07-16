# TECHNICAL_DEBT_INT-005 — Recommendation Engine

## Document Metadata

| Field | Value |
|-------|-------|
| Module | `src/domain/security-intelligence/recommendation/` |
| Interface | INT-005 |
| Status | Draft |
| Date | 2025-03-04 |
| Test Coverage | 123 unit tests + 5 benchmarks, all passing |

---

## Conscious Trade-offs

### TD-01: Rule Cost/Benefit Estimates Are Rule-Internal Constants

**Severity:** Medium

**Description:** Each of the 14 pluggable rules returns fixed cost and benefit estimates (e.g. `implementationCost: 0.3`, `riskReduction: 0.8`) that are not derived from the actual characteristics of the finding, risk assessment, or impact analysis they process. A Critical CVE and a Low-severity misconfiguration both receive the same cost/benefit profile from the same rule.

**Rationale:** The upstream pipeline does not yet provide enough structured data to compute precise per-finding cost/benefit profiles. Fixed values guarantee determinism and make the 8-factor ranking stable across runs.

**Mitigation:**
1. Introduce a `CostCalibrationTable` that maps `(RuleType, Severity) → costEstimate` in the engine configuration, replacing hard-coded constants with configurable lookup.
2. In a future iteration, use Impact Analysis data (`ImpactAnalysis.remediationCandidates[].riskReductionFactor`) to seed benefit estimates instead of rule-internal values.
3. Add A/B benchmarking harness comparing calibrated vs. uncalibrated rankings on historical scan data.

---

### TD-02: Conflict Detection Is O(N^2) Pairwise Comparison

**Severity:** Medium

**Description:** `detectConflicts()` iterates over all recommendation pairs (`N * (N-1) / 2` comparisons) to find duplicates, contradictions, dependencies, and required-order conflicts. For batch sizes of 1000+ recommendations, this becomes a measurable bottleneck.

**Rationale:** With current production volumes (typically <200 recommendations per scan), O(N^2) is acceptable and the implementation is simple and correct. Premature optimization would complicate the conflict detection logic without measurable benefit.

**Mitigation:**
1. Add an index-based pre-filter: group recommendations by `(targetId, ruleType)` and only compare within overlapping groups. This reduces the comparison space to near-linear for typical workloads.
2. For the Duplicate check specifically, use a `Map<targetId, Map<ruleType, Recommendation[]>>` index to detect duplicates in O(N) instead of O(N^2).
3. Set a `MAX_CONFLICT_COMPARISONS` guard constant (e.g. 500,000) and fall back to sampling if exceeded.

---

### TD-03: Non-Deterministic Plan IDs

**Severity:** Low

**Description:** `buildPlan()` generates plan IDs using `Date.now()` + `Math.random()`, making them non-deterministic. While the plan's _content_ (actions, ordering, scores) is fully deterministic, the ID varies between runs with identical inputs.

**Rationale:** Plan IDs need to be unique for storage and caching. Deterministic hashing (e.g. based on input recommendation IDs) was considered but rejected because it would collide when two distinct plans share the same input set but different strategies.

**Mitigation:**
1. Introduce a `PlanIdStrategy` configuration option: `'random'` (current) or `'deterministic'` (hash of `strategy + sorted recommendation IDs`).
2. For testing and reproducibility, add a `setPlanIdGenerator(fn: () => RemediationPlanId)` method to the engine.
3. Document that plan comparison should rely on `RemediationPlan.name` + `strategy`, not on IDs.

---

### TD-04: No Parallel Batch Processing

**Severity:** Low

**Description:** `generateBatch()` processes source items sequentially — findings first, then correlation groups, then risk assessments, etc. There is no concurrent or parallel processing within or across source types.

**Rationale:** The Recommendation Engine is purely synchronous and CPU-bound. Worker Threads would add significant complexity (serialization of immutable models, thread-safe cache access) without measurable benefit at current volumes.

**Mitigation:**
1. If batch processing exceeds 3 seconds (the current benchmark threshold), introduce an async `generateBatchAsync()` method that processes source types concurrently via `Promise.all`.
2. For very large batches (>10K sources), consider a chunked processing pipeline with backpressure.
3. Ensure the dual LRU cache is made thread-safe before any parallelism is introduced.

---

### TD-05: Statistics Collector Does Not Track Time-Series Data

**Severity:** Low

**Description:** `RecommendationStatisticsCollector` accumulates lifetime counters (total recommendations, total failures, average risk reduction, etc.) but does not maintain time-series snapshots. Once `collect()` is called, the aggregate is returned but historical trends are lost.

**Rationale:** Time-series tracking would require a ring buffer or external storage, adding complexity that belongs in an observability layer rather than the domain engine.

**Mitigation:**
1. Expose a `snapshot()` method that returns an immutable copy of current counters, allowing the caller to implement time-series aggregation externally.
2. Integrate with the platform's metrics collector (e.g. Prometheus) via the event bus — emit `recommendation.generated` events and let the infrastructure handle time-series.
3. Add an optional `slidingWindowMs` configuration to the statistics collector that retains per-window aggregates.

---

### TD-06: Planner Dependency Resolution May Stall on Cycles

**Severity:** Low

**Description:** `orderByStrategy()` uses a multi-pass algorithm to order recommendations by prerequisites. If a cycle exists (rule A requires B, B requires A), the algorithm falls back to inserting remaining items in their current order. This is safe (no infinite loop) but may produce suboptimal ordering.

**Rationale:** True dependency cycles should not exist with well-designed rules, and the current prerequisite table (`getPrerequisiteRuleTypes`) has no cycles. The fallback is a defensive measure.

**Mitigation:**
1. Add explicit cycle detection: after the ordering loop, check if any `dependsOn` references form a cycle and emit a `recommendation.cycle-detected` warning event.
2. Log the cycle details to the statistics collector for operational monitoring.

---

### TD-07: Ranking Weights Sum to 1.0 But Are Not Validated at Construction

**Severity:** Low

**Description:** The 8 ranking weights in `RecommendationEngineConfig` default to values that sum to 1.0 (0.20 + 0.15 + 0.10 + 0.10 + 0.15 + 0.10 + 0.10 + 0.10), but there is no runtime validation that custom weight configurations also sum to 1.0. Non-normalized weights would still produce valid scores but would change the effective relative importance in unintended ways.

**Rationale:** Validating weight sums at construction time would prevent some misconfigurations, but forcing exactly 1.0 would also prevent intentionally unnormalized weights (e.g. for experimental tuning).

**Mitigation:**
1. Add a `validateWeights()` function that warns (not throws) when weights deviate from 1.0 by more than a tolerance (e.g. 0.01).
2. Normalize weights internally in `computeOverallRankingScore()` by dividing each by their sum, making the output scale-independent.
3. Document the normalization behavior in `RecommendationEngineConfig`.

---

### TD-08: `generateFromSingleFinding/Risk/Impact` Use `any` Type for Input

**Severity:** Low

**Description:** The convenience functions `generateFromSingleFinding()`, `generateFromSingleRisk()`, and `generateFromSingleImpact()` accept `any` as the input type rather than the proper domain types (`CanonicalFinding`, `RiskAssessment`, `ImpactAnalysis`).

**Rationale:** These functions were added as ergonomic shortcuts and would require importing upstream type definitions, creating a circular dependency risk if the upstream modules are not yet compiled.

**Mitigation:**
1. Replace `any` with the correct imported types once the build pipeline guarantees compilation ordering.
2. Add runtime type guards in these functions to catch misuse early.

---

## Future Tasks

| ID | Priority | Description | Related TD |
|----|----------|-------------|------------|
| F-01 | High | Introduce `CostCalibrationTable` for rule cost/benefit estimation | TD-01 |
| F-02 | High | Index-based conflict detection for O(N log N) performance | TD-02 |
| F-03 | Medium | Deterministic plan ID strategy option | TD-03 |
| F-04 | Medium | Weight normalization and validation in `computeOverallRankingScore` | TD-07 |
| F-05 | Medium | Replace `any` types in single-source convenience functions | TD-08 |
| F-06 | Low | Sliding window statistics for time-series observability | TD-05 |
| F-07 | Low | Cycle detection with warning events in planner | TD-06 |
| F-08 | Low | Async batch processing for >10K source workloads | TD-04 |

---

## Debt Summary

| Severity | Count | Blocker? |
|----------|-------|----------|
| Medium | 2 | No |
| Low | 6 | No |
| **Total** | **8** | **No** |

**Assessment:** The Recommendation Engine carries low-to-medium technical debt. No item blocks production integration. The two medium-severity items (TD-01 cost calibration, TD-02 O(N^2) conflict detection) should be addressed before scaling to enterprise workloads (>500 recommendations per scan, >10K sources per batch).
