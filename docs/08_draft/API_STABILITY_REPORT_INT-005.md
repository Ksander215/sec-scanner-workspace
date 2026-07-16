# API_STABILITY_REPORT_INT-005 — Recommendation Engine

## Document Metadata

| Field | Value |
|-------|-------|
| Module | `src/domain/security-intelligence/recommendation/` |
| Interface | INT-005 |
| Status | Draft |
| Date | 2025-03-04 |

---

## API Surface by Stability Tier

### Stable — Public API, backward compatibility guaranteed

Breaking changes to these APIs require a major version bump and a migration guide.

| API | Module | Description |
|-----|--------|-------------|
| `RecommendationEngine.generate()` | engine | Generate recommendations from a single source |
| `RecommendationEngine.generateBatch()` | engine | Generate from multiple sources in batch |
| `RecommendationEngine.rank()` | engine | Rank recommendations using 8-factor weighted scoring |
| `RecommendationEngine.plan()` | engine | Build a remediation plan with a specified strategy |
| `RecommendationEngine.comparePlans()` | engine | Compare two remediation plans deterministically |
| `RecommendationEngine.statistics()` | engine | Get engine operation statistics |
| `RecommendationEngine.reset()` | engine | Reset all engine state (cache, statistics, events) |
| `RecommendationEngine.ruleRegistry` | engine | Access the rule registry for extending rules |
| `RecommendationEngine.config` | engine | Read-only engine configuration |
| `generateFromSource()` | sources | Generate recommendations from a single source context |
| `generateFromAllSources()` | sources | Generate from all 5 source types in batch |
| `rankRecommendations()` | ranking | Rank recommendations with configurable weights |
| `computeRankingScores()` | ranking | Compute 8-factor scores for a single recommendation |
| `compareRecommendations()` | ranking | Compare two recommendations by score |
| `buildPlan()` | planner | Build a remediation plan from ranked recommendations |
| `selectByStrategy()` | planner | Select recommendations by planning strategy |
| `orderByStrategy()` | planner | Order recommendations for execution |
| `detectConflicts()` | conflicts | Detect all conflicts among recommendations |
| `resolveConflict()` | conflicts | Resolve a single conflict deterministically |
| `resolveAllConflicts()` | conflicts | Detect and resolve all conflicts |
| `generateBatch()` | batch | Full batch generation + ranking + planning |
| `createRecommendation()` | models | Create an immutable Recommendation |
| `createRecommendationGroup()` | models | Create an immutable RecommendationGroup |
| `createRecommendationAction()` | models | Create an immutable RecommendationAction |
| `createRemediationPlan()` | models | Create an immutable RemediationPlan |
| `createRemediationTask()` | models | Create an immutable RemediationTask |
| `createRecommendationCost()` | models | Create an immutable RecommendationCost |
| `createRecommendationBenefit()` | models | Create an immutable RecommendationBenefit |
| `createRecommendationEvidence()` | models | Create an immutable RecommendationEvidence |
| `createRecommendationRanking()` | models | Create an immutable RecommendationRanking |
| `createExplainabilityData()` | models | Create structured explainability hooks |
| `createConflict()` | models | Create an immutable Conflict |
| `computeOverallRankingScore()` | models | Compute weighted composite ranking score |
| `computeTotalCost()` | models | Compute composite cost from components |
| `computeTotalBenefit()` | models | Compute composite benefit from components |
| `computePlanRiskReduction()` | models | Compute total risk reduction for a plan |
| `computePlanAttackSurfaceReduction()` | models | Compute attack surface reduction for a plan |
| `computePlanCost()` | models | Compute total cost for a plan |
| `computePlanEffort()` | models | Compute total effort hours for a plan |
| `computePlanCoverage()` | models | Compute coverage score for a plan |
| `computePlanPriority()` | models | Compute priority score for a plan |
| `recommendationToJSON()` | models | Serialize a Recommendation to JSON |
| `recommendationFromJSON()` | models | Deserialize a Recommendation from JSON with validation |
| `remediationPlanToJSON()` | models | Serialize a RemediationPlan to JSON |
| `remediationPlanFromJSON()` | models | Deserialize a RemediationPlan from JSON with validation |
| `recommendationsEqual()` | models | Deep equality check for Recommendations |
| `remediationPlansEqual()` | models | Deep equality check for RemediationPlans |
| `cloneRecommendation()` | models | Deep clone a Recommendation |
| `cloneRemediationPlan()` | models | Deep clone a RemediationPlan |
| `hashRecommendation()` | models | Deterministic hash of a Recommendation |
| `hashRemediationPlan()` | models | Deterministic hash of a RemediationPlan |
| `RuleRegistry` | rules | Extensible rule registry class |
| `BUILT_IN_RULES` | rules | Array of 14 built-in recommendation rules |
| `createDefaultRuleRegistry()` | rules | Create a registry with all 14 built-in rules |
| `RecommendationCache` | cache | Dual LRU cache (recommendation + plan) |
| `RecommendationEventBus` | events | Event bus for 5 domain events |
| `RecommendationStatisticsCollector` | statistics | Statistics collector for engine metrics |
| `RecommendationRuleType` | types | Enum — 14 rule types |
| `RecommendationSource` | types | Enum — 5 source types |
| `PlanningStrategy` | types | Enum — 5 planning strategies |
| `ConflictType` | types | Enum — 4 conflict types |
| `ActionStatus` | types | Enum — 6 action statuses |
| `RecommendationSeverity` | types | Enum — 5 severity levels |
| `DEFAULT_RECOMMENDATION_ENGINE_CONFIG` | types | Default configuration object |
| `ALL_RECOMMENDATION_RULE_TYPES` | types | Array of all rule type values |
| `ALL_RECOMMENDATION_SOURCES` | types | Array of all source values |
| `ALL_PLANNING_STRATEGIES` | types | Array of all strategy values |
| `ALL_CONFLICT_TYPES` | types | Array of all conflict type values |
| `ALL_ACTION_STATUSES` | types | Array of all action status values |
| `ALL_RECOMMENDATION_SEVERITIES` | types | Array of all severity values |
| `createRecommendationGeneratedEvent()` | events | Factory for `recommendation.generated` event |
| `createRecommendationRankedEvent()` | events | Factory for `recommendation.ranked` event |
| `createRecommendationAcceptedEvent()` | events | Factory for `recommendation.accepted` event |
| `createRecommendationRejectedEvent()` | events | Factory for `recommendation.rejected` event |
| `createRemediationPlanBuiltEvent()` | events | Factory for `remediation.plan.built` event |

---

### Experimental — API may change in subsequent versions

Clients using these APIs should expect breaking changes between minor versions and pin their dependency accordingly.

| API | Module | Description | Risk |
|-----|--------|-------------|------|
| `generateFromSingleFinding()` | batch | Convenience for single-finding generation | Input type may change from `any` to `CanonicalFinding` (TD-08) |
| `generateFromSingleRisk()` | batch | Convenience for single-risk generation | Input type may change from `any` to `RiskAssessment` (TD-08) |
| `generateFromSingleImpact()` | batch | Convenience for single-impact generation | Input type may change from `any` to `ImpactAnalysis` (TD-08) |
| `computeRankingScores()` return shape | ranking | Returns 8-factor score object | May gain additional fields (e.g. `normalizedOverallScore`) |
| `RecommendationEngine.cacheStatistics` | engine | Cache statistics property | May be replaced by a `cacheStatistics()` method for lazy evaluation |
| `RecommendationEngine.eventBus` | engine | Direct access to EventBus | May be replaced by a `subscribe()` method for encapsulation |
| `RecommendationRule.evaluate()` | rules | Rule evaluation interface | May receive additional context fields (e.g. `historicalData`) |
| `RankingResult` | ranking | Ranking operation result | May gain `conflictCount` and `strategyParams` fields |
| `BatchResult` | batch | Batch operation result | May gain `sourceBreakdown` and `skippedCount` fields |

---

### Internal — Not intended for external use

These APIs may be removed, renamed, or reorganized without warning. Do not depend on them outside the `recommendation/` module.

| API | Module | Description |
|-----|--------|-------------|
| `brandRecommendationId()` | types | Branded ID constructor (internal) |
| `brandRecommendationGroupId()` | types | Branded ID constructor (internal) |
| `brandRecommendationActionId()` | types | Branded ID constructor (internal) |
| `brandRemediationPlanId()` | types | Branded ID constructor (internal) |
| `brandRemediationTaskId()` | types | Branded ID constructor (internal) |
| `brandRecommendationEvidenceId()` | types | Branded ID constructor (internal) |
| `brandRecommendationStatisticsId()` | types | Branded ID constructor (internal) |
| `brandRecommendationCostId()` | types | Branded ID constructor (internal) |
| `brandRecommendationBenefitId()` | types | Branded ID constructor (internal) |
| `generateRecommendationId()` | models | ID generation (internal, non-deterministic) |
| `generateRecommendationGroupId()` | models | ID generation (internal) |
| `generateRecommendationActionId()` | models | ID generation (internal) |
| `generateRemediationPlanId()` | models | ID generation (internal) |
| `generateRemediationTaskId()` | models | ID generation (internal) |
| `generateRecommendationEvidenceId()` | models | ID generation (internal) |
| `generateRecommendationStatisticsId()` | models | ID generation (internal) |
| `generateRecommendationCostId()` | models | ID generation (internal) |
| `generateRecommendationBenefitId()` | models | ID generation (internal) |
| All `*Input` interfaces | models | Factory input types (internal) |
| `InternalCacheEntry<T>` | cache | Cache entry structure (internal) |
| `getPrerequisiteRuleTypes()` | planner | Prerequisite mapping (internal) |
| `severityRank()` | planner | Severity comparison (internal) |
| `hasOverlappingFindings()` | conflicts | Overlap detection (internal) |

---

## Breaking Change Risk Assessment

### Low Risk

| Change Scenario | Impact | Mitigation |
|-----------------|--------|------------|
| Adding a new `RecommendationRuleType` enum value | No breaking change to existing code; new value is additive | Consumers should use `switch` with `default` case |
| Adding a new `RecommendationSource` enum value | No breaking change; new source type is additive | Rules that don't `appliesTo` the new source are unaffected |
| Adding a new `PlanningStrategy` enum value | No breaking change; new strategy is additive | Existing `plan()` calls use `defaultStrategy` |
| Adding a new `ConflictType` enum value | No breaking change; new conflict type is additive | `resolveConflict()` has a `default` case |
| Adding a new field to `Recommendation` interface | Minor — TypeScript structural typing allows extra fields | `recommendationFromJSON()` will need to handle the new field |
| Adding a new field to `RemediationPlan` interface | Minor — same as above | `remediationPlanFromJSON()` will need to handle the new field |

### Medium Risk

| Change Scenario | Impact | Mitigation |
|-----------------|--------|------------|
| Changing default ranking weights | Alters ranking output for all consumers using defaults | Pin `formulaVersion` in config; version-gate weight changes |
| Adding a new rule to `BUILT_IN_RULES` | May produce additional recommendations for existing inputs | Disable auto-registration; let consumers register rules explicitly |
| Changing `computeTotalCost` weight distribution (0.35/0.20/0.25/0.20) | Alters all cost calculations and downstream rankings | Tie to `formulaVersion`; old version preserved via config |
| Changing `computeOverallRankingScore` formula | Alters all ranking outcomes | Tie to `formulaVersion`; old formula accessible via versioned config |
| Removing or renaming an `Experimental` API | Breaks consumers depending on experimental surface | Announce deprecation 1 minor version before removal |

### High Risk

| Change Scenario | Impact | Mitigation |
|-----------------|--------|------------|
| Changing the `RecommendationRule.evaluate()` signature | Breaks all custom rule implementations | Extend `RuleContext` rather than modifying `evaluate()` |
| Removing a field from a Stable model interface | Breaks all consumers reading that field | Never remove fields; deprecate and mark optional first |
| Changing the `GenerateInput` interface shape | Breaks all `generate()` callers | Add new fields as optional; never remove or rename existing fields |
| Changing the `PlanConstraints` interface shape | Breaks `plan()` callers using constraints | Additive only; existing constraints remain unchanged |

---

## Versioning Strategy

### Formula Versioning

The engine uses a `formulaVersion` field in `RecommendationEngineConfig` (default: `'1.0.0'`). This version gates all computational formulas:

- `computeTotalCost()` weight distribution
- `computeOverallRankingScore()` factor weights
- `computeTotalBenefit()` weight distribution
- `computePlanPriority()` scoring formula

**Rule:** When any formula changes, a new `formulaVersion` is introduced. The old formula is preserved and accessible by setting `formulaVersion` to the previous value. Cache keys include the formula version, preventing stale results.

### API Versioning

| Version Pattern | Meaning |
|-----------------|---------|
| `1.x.x` | Stable API — additive changes only |
| `formulaVersion: '1.0.0'` | Computational formula set |
| `formulaVersion: '1.1.0'` | New formula with backward-compatible output range |

### Deprecation Policy

1. **Stable API**: Deprecated features are marked with `@deprecated` JSDoc and remain functional for at least 2 minor versions.
2. **Experimental API**: May change without deprecation notice. Consumers must pin versions.
3. **Internal API**: No deprecation policy. May be removed at any time.

---

## Compatibility Guarantees

1. **Determinism Guarantee**: For the same inputs and the same `formulaVersion`, the engine produces identical outputs across runs. This is the strongest guarantee and must never be broken.

2. **Additive Evolution**: New enum values, new optional fields, and new functions are always added without breaking existing consumers. TypeScript's structural typing ensures forward compatibility.

3. **No Mutation Guarantee**: The engine never mutates its inputs. All `CanonicalFinding`, `RiskAssessment`, `AttackPath`, `ImpactAnalysis`, and `CorrelationGroup` objects are treated as read-only.

4. **Serialization Compatibility**: `recommendationToJSON()` / `recommendationFromJSON()` and `remediationPlanToJSON()` / `remediationPlanFromJSON()` maintain round-trip fidelity. New fields are added with default values in `fromJSON()` to handle data produced by older versions.

5. **Event Schema Stability**: The 5 event types (`recommendation.generated`, `recommendation.ranked`, `recommendation.accepted`, `recommendation.rejected`, `remediation.plan.built`) follow additive evolution. New fields may be added but existing fields will not be renamed or removed.

---

## API Surface Summary

| Tier | Count | Compatibility |
|------|-------|---------------|
| Stable | 62 | Breaking changes require major version bump |
| Experimental | 9 | May change between minor versions |
| Internal | 22 | No guarantee; may change without notice |
| **Total** | **93** | |
