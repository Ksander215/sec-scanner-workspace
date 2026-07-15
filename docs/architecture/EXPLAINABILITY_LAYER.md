# Explainability Layer — Architecture Document

## 1. Overview

The Explainability Layer is a **standalone domain module** that makes Security State Engine results understandable to humans. It answers not just "what is the score?" but "why is it this way, what changed, and what should I do about it?"

### Design Principles

- **No AI, no LLM.** All explanations are generated via deterministic template composition and rule-based analysis.
- **Read-only.** The layer never mutates Security State Engine internals or any external state.
- **Pure functions.** Every function is synchronous, deterministic, and side-effect-free.
- **Zero framework coupling.** No React, no Next.js, no Prisma, no external dependencies.
- **Works on top of Security State.** Consumes already-computed `SecurityState` + raw `Finding[]` — never re-computes scores.

## 2. Architecture

```
src/domain/explainability/

├── index.ts                    # Public API (ONLY import from here)
├── types.ts                    # All interfaces, enums, extension points
├── explanation-engine.ts       # Facade: ExplanationEngine class
├── explanation-builder.ts      # Orchestrator: assembles full ExplanationResult
├── change-analysis.ts          # Part 3: compares two Security States
├── priorities.ts               # Parts 2 & 5: reasons + top impacts
├── recommendation-engine.ts    # Part 4: actionable recommendations
├── templates.ts                # Part 6: executive summary generation
└── tests/
    ├── test-helpers.ts         # Shared factories and constants
    ├── change-analysis.test.ts # 20 tests
    ├── priorities.test.ts      # 24 tests
    ├── recommendation-engine.test.ts  # 12 tests
    ├── templates.test.ts       # 14 tests
    └── explanation-engine.test.ts     # 13 integration tests
```

### Module Dependency Graph

```
ExplanationEngine (facade)
  └── ExplanationBuilder (orchestrator)
        ├── Priorities
        │     ├── computeTopImpacts()   → TopImpactFactor[]
        │     └── generateReasons()     → Reason[]
        ├── ChangeAnalysis
        │     ├── analyzeChanges()      → ChangeFactor[]
        │     ├── splitByDirection()    → { improvements, regressions }
        │     └── computeScoreChangeReasons() → ScoreChangeReason[]
        ├── RecommendationEngine
        │     └── generateRecommendations() → Recommendation[]
        └── Templates
              └── generateSummary()     → string
```

No circular dependencies. Each module imports only from `types.ts` and `security-state/types.ts`.

## 3. Data Model

### Input: `ExplanationInput`

```typescript
interface ExplanationInput {
  currentState: SecurityState;      // From Security State Engine
  previousState: SecurityState | null;  // For comparison
  findings: Finding[];              // Raw findings (for per-finding recs)
  findingImpacts: FindingImpact[];  // From Security State Engine
  now: Date;
  comparisonPeriodDays: number;
}
```

### Output: `ExplanationResult`

```typescript
interface ExplanationResult {
  summary: string;                  // 1-5 sentence executive narrative
  reasons: Reason[];                // Why the state is what it is
  improvements: ChangeFactor[];     // What got better
  regressions: ChangeFactor[];      // What got worse
  recommendations: Recommendation[];  // What to do, sorted by ROI
  topImpacts: TopImpactFactor[];    // Biggest score factors
  scoreChangeReasons: ScoreChangeReason[];  // Why score changed
}
```

### Key Types

| Type | Purpose |
|------|---------|
| `Reason` | A factor explaining current state (id, influence, description, scoreImpact) |
| `ChangeFactor` | A delta between two states (aspect, direction, before, after) |
| `Recommendation` | An action with ROI (description, priority, expectedScoreGain, complexity, roi) |
| `TopImpactFactor` | A ranked factor (label, impact, count, severity) |
| `ScoreChangeReason` | A reason for score delta (label, direction, scoreDelta) |

### Influence Levels

`very_high` | `high` | `medium` | `low` | `minimal`

Mapped from numeric impact: >=20 → very_high, >=10 → high, >=5 → medium, >=1 → low, <1 → minimal.

### Priority Levels

`P0` — Fix immediately (critical findings, regressions)
`P1` — This sprint (high findings, stale critical, no scans)
`P2` — Schedule soon (medium findings)
`P3` — Backlog (low findings)

## 4. Algorithms

### 4.1 Reasons (`priorities.ts`)

For each check, the module tests a condition and generates a `Reason` if applicable:

| Reason ID | Condition | Score Impact |
|-----------|-----------|-------------|
| `critical_findings` | >=1 open critical finding | -sum(impacts) |
| `high_findings` | >=1 open high finding (impact >= threshold) | -sum(impacts) |
| `medium_findings` | >=3 open medium findings | -sum(impacts) |
| `stale_findings` | >=1 finding open >30 days | -sum(stale impacts) |
| `no_recent_scan` | No scan in 30d (or never) | -10 |
| `regressions` | regressionCount > 0 | -min(10, count*5) |
| `low_confidence` | confidence < 0.5 | -5 |
| `trend_declining` | trend === "declining" | scoreChange |
| `new_findings` | newFindingsInPeriod > 0 | -count*3 |
| `recent_scan` | scan <7d ago (positive) | 0 |
| `trend_improving` | trend === "improving" (positive) | scoreChange |
| `no_findings` | openFindingsCount === 0 && scans > 0 (positive) | 0 |

Reasons are sorted by `|scoreImpact|` descending.

### 4.2 Top Impacts (`priorities.ts`)

Groups `FindingImpact[]` by severity, sums impacts per group, adds non-finding factors (stale data, regressions, low confidence). Sorted by `|impact|` descending, capped at `maxTopImpacts` (default: 5).

### 4.3 Change Analysis (`change-analysis.ts`)

Compares every field of two `SecurityState` objects:
- Security Score, Risk Score, Trend, Confidence
- Per-severity breakdown, total open findings, regressions
- New findings, resolved findings

Produces `ChangeFactor[]` with direction ("improved" | "declined"), then splits into two lists.

**Score Change Reasons** estimates what caused the numeric delta:
- Resolved findings → positive contribution (estimated from avg impact)
- New findings → negative contribution (estimated with 0.7 age multiplier)
- Regressions → negative contribution (estimated at 8 pts each)
- Unexplained delta → attributed to "Finding Age Increase" or "Data Quality Improvement"

### 4.4 Recommendation Engine (`recommendation-engine.ts`)

Two sources of recommendations:

**Per-finding recommendations:**
- Generated for each `FindingImpact` in the input
- Complexity estimated from severity + CWE ID:
  - CWE-79 (XSS), CWE-89 (SQLi), CWE-502 (Deserialization) → +1 complexity tier
  - CWE-798 (Hardcoded Creds), CWE-16 (Config), CWE-311 (Encryption) → -1 complexity tier
- ROI = `expectedScoreGain / effort` where effort = 1-5 based on complexity
- Priority: P0 for critical/regressed, P1 for high/old-medium, P2 for medium, P3 for low

**General recommendations:**
- "Run a scan" when no recent scan exists (trivial effort, ROI = 10)
- "Investigate regressions" when regressionCount > 0 (P0, high complexity)
- "Schedule regular scans" when totalScans < 3 (P2, low complexity)

All recommendations de-duplicated by description, sorted by ROI descending.

### 4.5 Executive Summary (`templates.ts`)

Composed from 4 independent sentence builders:

1. **Opening**: score tier + score + trend + confidence warning
2. **Change**: top improvement + top decline from `ScoreChangeReason[]`
3. **Risk**: top 1-2 negative reasons
4. **Action**: "Address X" or "Run a scan" or "No action needed"

Sentence builders can be added/removed independently — no single function controls the full output.

## 5. Extension Points

### `RecommendationStrategy`

```typescript
interface RecommendationStrategy {
  readonly id: string;
  readonly name: string;
  generate(input, reasons, topImpacts): Recommendation[];
}
```

Inject via `new ExplanationEngine({ recommendationStrategy: myStrategy })`.

Use cases:
- AI-powered recommendations (call LLM in the strategy, keep it out of the domain)
- Compliance-driven prioritization (e.g., SOC2 requires fixing specific CWEs first)
- Organization-specific policies (e.g., "always fix auth issues before anything else")

### `SummaryStrategy`

```typescript
interface SummaryStrategy {
  readonly id: string;
  readonly name: string;
  generate(currentState, previousState, reasons, topImpacts, scoreChangeReasons): string;
}
```

Use cases:
- LLM-generated summaries for natural language
- Locale-specific templates (i18n)
- Audience-adapted summaries (technical for engineers, business for executives)

### `ExplanationConfig`

```typescript
interface ExplanationConfig {
  maxRecommendations: number;      // default: 10
  maxTopImpacts: number;           // default: 5
  maxReasons: number;              // default: 10
  includePositiveReasons: boolean; // default: true
  minimalImpactThreshold: number;  // default: 0.5
}
```

## 6. Limitations

### 6.1 Score Change Estimation

The `computeScoreChangeReasons` function estimates score deltas for resolved/new/regressed findings. It does NOT have access to the actual previous finding set — only the current one and aggregate counts. This means:

- The "Findings Resolved" score gain is an **estimate** based on the average impact of remaining findings.
- The "New Findings" score loss uses a fixed 0.7 multiplier for young findings.
- The "Finding Age Increase" attribution is a residual (unexplained delta), not a precise calculation.

**Future improvement:** Pass `previousFindings[]` in `ExplanationInput` for exact delta computation.

### 6.2 Complexity Estimation

The complexity heuristic is severity + CWE based. It does NOT consider:
- Actual codebase size or architecture
- Developer experience with the technology
- Whether a fix requires cross-team coordination
- Business logic complexity of the vulnerable code path

This is acceptable for Sprint 2 but should evolve with historical fix-time data.

### 6.3 Template Language

The executive summary and reason descriptions are currently in **English only**. The `SummaryStrategy` extension point allows i18n, but the built-in `generateReasons()` produces English strings directly. A future i18n layer would need to either:
- Wrap the domain output with a translation layer (preferred — keeps domain pure)
- Use message keys instead of strings in the domain (more invasive)

### 6.4 No Root Cause Analysis

The explainability layer explains WHAT is happening but not WHY at the code level. "Fix Critical: XSS in search" is actionable, but "the XSS exists because user input is concatenated into HTML without escaping" requires code analysis. This is explicitly out of scope — AI Assistant (future) would fill this gap.

## 7. Tradeoffs

| Decision | Rationale | Tradeoff |
|----------|-----------|----------|
| No AI/LLM in Sprint 2 | Deterministic, testable, fast, no API costs | Less natural language quality |
| Template-based summary | Composable, extensible, predictable | Less flexible than free-form text |
| CWE-based complexity | Simple, no external data needed | Inaccurate for project-specific patterns |
| Estimated score changes | No access to historical finding-level data | Imprecise delta attribution |
| Pure functions only | Testable, no side effects, predictable | Caller must manage DB access and state persistence |

## 8. Future Improvements

1. **Exact Delta Computation:** Accept `previousFindings[]` in `ExplanationInput` for precise score change attribution.
2. **Historical Trend Narratives:** Generate "over the past 30/60/90 days" narratives from multiple snapshots.
3. **Compliance Scoring:** Add a `ComplianceEngine` that maps findings to regulatory requirements (SOC2, GDPR, PCI-DSS).
4. **Team-Level Aggregation:** Explain security state across multiple targets (workspace-level explanations).
5. **Recommendation Feedback Loop:** Track which recommendations were acted on and adjust ROI estimates based on actual outcomes.
6. **Finding Correlation:** Detect when multiple findings share the same root cause and group recommendations accordingly.
7. **Time-Based Recommendations:** "Best time to fix" estimates based on developer activity patterns (future, with analytics data).

## 9. Integration Example

```typescript
import { SecurityStateEngine } from "@/domain/security-state";
import { ExplanationEngine } from "@/domain/explainability";
import { computeFindingImpacts } from "@/domain/security-state";

// 1. Compute security state
const engine = new SecurityStateEngine();
const state = engine.compute(input);

// 2. Compute per-finding impacts
const openFindings = input.findings.filter(f => f.status === "open" || f.status === "confirmed");
const findingImpacts = computeFindingImpacts(openFindings, DEFAULT_WEIGHTS, input.now);

// 3. Explain
const explainer = new ExplanationEngine();
const explanation = explainer.explain({
  currentState: state,
  previousState: previousStateSnapshot,  // from DB
  findings: input.findings,
  findingImpacts,
  now: input.now,
  comparisonPeriodDays: input.comparisonPeriodDays ?? 30,
});

// 4. Use
console.log(explanation.summary);
console.log(explanation.reasons);
console.log(explanation.recommendations[0].description);  // Top ROI action
```

## 10. Test Coverage

- **83 tests** across 5 test files
- **165 total** domain tests (82 security-state + 83 explainability)
- Coverage includes:
  - Empty state, perfect state, degraded state
  - With and without previous state
  - Large number of findings (50+)
  - Never-scanned targets
  - Boundary cases (exact thresholds, zero values)
  - Custom strategies and configuration
  - Determinism verification