> **Superseded by:** [SECURITY_STATE_ENGINE.md](../SECURITY_STATE_ENGINE.md)
> **Archived reason:** Central entity design, implementation details now in Security State Engine
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# SECURITY STATE — Central Entity Design

> **Document Type:** Product Architecture — Security State
> **Version:** 2.0
> **Status:** Draft
> **Prepared by:** Lead Engineer (TASK-004)
> **Depends on:** DOMAIN_MODEL_V2.md

---

## 1. Why Security State Is the Center of the Product

The current Sec Scanner product has a fundamental identity problem: **it is a tool, not a platform**. Users open it to run a scan, see results, and leave. There is no reason to return until they need another scan.

Security State changes this. It transforms the product from "a thing you use occasionally" into "a thing you check daily."

The analogy is fitness tracking. A single workout is like a single scan — useful but isolated. A fitness tracker that shows your daily step count, trend over time, and comparison to goals — that's something you check every morning. **Security State is the fitness tracker for application security.**

### The Core Insight

Users don't want scan results. They want to know: **"Am I secure? Am I getting more secure? What do I need to fix?"**

Security State answers these questions continuously, without requiring the user to initiate a scan or read a report.

---

## 2. Security State Definition

**Security State** is a computed, time-series entity that represents the security posture of a scoped entity (Target, Project, or Workspace) at a point in time. It is derived entirely from Findings — never manually set, never stale beyond the last scan.

### Aggregation Hierarchy

```
Workspace Security State
  └── Project Security State (weighted average)
        └── Target Security State (computed from findings)
              └── Findings (raw data)
```

Each level aggregates from the level below, with optional weighting:
- **Target → Project:** Weighted by target importance (configurable)
- **Project → Workspace:** Weighted by project importance (configurable)

---

## 3. Metrics Catalog

### 3.1 Primary Metrics

#### Security Score (0-100)

The single most important number in the product. This is what users see first, what they track over time, and what they share with stakeholders.

**Computation:**
```
baseScore = 100
for each open finding:
  baseScore -= severityWeight(finding.severity) * ageMultiplier(finding)

severityWeight:
  critical: -25
  high:     -15
  medium:   -5
  low:      -1
  info:     0

ageMultiplier:
  < 7 days:    0.7  (recent findings penalize less — may be in progress)
  7-30 days:   1.0  (standard weight)
  30-90 days:  1.3  (aging findings — should be addressed)
  > 90 days:   1.6  (stale findings — serious negligence signal)

finalScore = clamp(baseScore, 0, 100)
```

**Design Decisions:**
- Starts at 100, subtracts for findings (not adds — a "perfect" application scores 100)
- Age multiplier prevents gaming by ignoring old findings
- Info-severity findings have zero impact on score (they are informational, not risks)
- Score is never negative; floor at 0

**Example Calculations:**

| Scenario | Score |
|----------|-------|
| No open findings | 100 |
| 1 medium (< 7 days) | 96.5 |
| 1 critical (> 90 days) | 60 |
| 2 high, 3 medium (mixed ages) | 52 |
| 5 critical, 10 high (neglected app) | 0 (floored) |

#### Risk Score (0-100)

Inverse of Security Score, but computed independently to capture different dimensions of risk. Security Score measures "how secure are you?" — Risk Score measures "how much danger are you in?"

**Computation:**
```
riskScore = 100 - securityScore

// Adjustments:
if hasOpenCritical && criticalAge > 30 days:
  riskScore = min(100, riskScore + 15)  // Critical boost
if regressionCount > 0:
  riskScore = min(100, riskScore + 10)  // Regression penalty
if coverage < 0.5:
  riskScore = min(100, riskScore + 10)  // Low coverage penalty
```

**Why Both?** Some stakeholders respond better to "your security score is 45/100" (negative framing) vs. "your risk score is 55/100" (positive framing). Marketing materials use Security Score; alert emails use Risk Score.

---

### 3.2 Trend Indicators

#### Trend Direction

| Value | Condition | Meaning |
|-------|-----------|---------|
| `improving` | Score increased by ≥ 3 points over comparison period | Security is getting better |
| `stable` | Score changed by < 3 points | No significant change |
| `declining` | Score decreased by ≥ 3 points | Security is getting worse |
| `unknown` | Not enough data (first scan, no comparison period) | Cannot determine trend |

**Comparison Period:** Default 30 days. Configurable per workspace.

#### Regression Count

Number of findings that were previously `resolved` but have been detected again in a recent scan. Regressions are the most actionable signal — they indicate either:
- A fix was incomplete or incorrect
- A new code deployment reintroduced the vulnerability
- The finding was falsely marked as resolved

**Computation:**
```
regressionCount = count(findings where status = 'regressed' in period)
```

#### Improvement Count

Number of findings resolved in the comparison period. This is the positive signal — it shows active remediation work.

**Computation:**
```
improvementCount = count(findings resolved in period)
```

#### Net Movement

```
netMovement = improvementCount - regressionCount - newFindingsCount
```

Positive = security is improving. Negative = security is declining.

---

### 3.3 Finding Metrics

#### Open Findings by Severity

```
{
  critical: number,
  high: number,
  medium: number,
  low: number,
  info: number,
  total: number
}
```

#### Finding Status Distribution

```
{
  open: number,       // First detection
  confirmed: number,  // Detected in 2+ scans
  accepted_risk: number,  // Acknowledged, won't fix
  resolved: number,   // No longer detected
  dismissed: number   // False positive
}
```

#### Mean Time to Resolution (MTTR)

Average number of days between `firstSeenAt` and `lastResolvedAt` for findings resolved in the period. This is a key operational metric.

**Computation:**
```
MTTR = avg(resolvedAt - firstSeenAt for findings resolved in period)
```

#### Mean Time to Detection (MTTD)

Average number of days between a vulnerability being introduced (estimated) and being detected by a scan. Harder to compute accurately — requires version control integration for ground truth.

**Approximation for now:**
```
MTTD = avg(firstSeenAt - previousScanCompletedAt for new findings)
```

---

### 3.4 Coverage Metrics

#### Scan Coverage

```
coverage = targetsScannedInPeriod / totalActiveTargets
```

Period: default 30 days. A coverage of 1.0 means every target was scanned at least once.

#### Freshness

```
freshness = 1.0 - (daysSinceLastScan / maxAcceptableAge)
```

Where `maxAcceptableAge` is configurable per workspace (default: 30 days). Freshness of 0 means the most recent scan is older than the acceptable age.

#### Scan Frequency

Average number of days between scans for each target. Lower is better for security, but may indicate over-scanning.

---

### 3.5 Confidence Score

How much can the user trust the current Security State? A high confidence score means the data is fresh, coverage is good, and findings are confirmed. A low confidence score means data may be stale or incomplete.

**Computation:**
```
confidenceFactors:
  coverageFactor = min(1.0, coverage)           // 0-1
  freshnessFactor = min(1.0, avgFreshness)      // 0-1
  confirmationFactor = confirmedCount / openCount // 0-1 (0 if no open findings)

confidence = weightedAverage(
  coverageFactor * 0.3,
  freshnessFactor * 0.5,
  confirmationFactor * 0.2
)
```

**Why This Matters:** A Security Score of 95 with a Confidence of 0.3 means "we think you're secure, but we haven't scanned enough recently to be sure." This distinction is crucial for building trust.

---

### 3.6 Historical State

Security State is stored as a time series. Each significant change (scan completion, finding resolution, finding regression) creates a new snapshot.

**Snapshot Record:**
```typescript
interface SecurityStateSnapshot {
  id: string;
  scopeType: 'target' | 'project' | 'workspace';
  scopeId: string;
  timestamp: DateTime;
  metrics: {
    securityScore: number;
    riskScore: number;
    trend: TrendDirection;
    openFindings: SeverityBreakdown;
    regressionCount: number;
    improvementCount: number;
    coverage: number;
    confidence: number;
    mttr: number | null;
    mttD: number | null;
  };
  triggerEvent: string;  // What caused this snapshot
  previousSnapshotId: string | null;  // For delta computation
}
```

**Retention:**
- Raw snapshots: 90 days (high granularity)
- Daily aggregates: 2 years
- Weekly aggregates: indefinite

**Storage:** Time-series optimized. For SQLite (current), a dedicated table with composite index on `(scopeType, scopeId, timestamp)`. For production, consider TimescaleDB or ClickHouse.

---

## 4. Score Visualization Guidelines

### Security Score Gauge

The primary visualization should be a **circular gauge** (not a progress bar). The gauge should:
- Use color gradient: green (80-100) → yellow (50-79) → orange (30-49) → red (0-29)
- Show the numeric score prominently in the center
- Show trend arrow (↑ ↓ →) next to the score
- Show comparison text: "↑ 5 pts from last week"

### Risk Trend Chart

A **line chart** showing Security Score over time. Key features:
- X-axis: time (last 30/90/365 days, selectable)
- Y-axis: 0-100
- Shaded area under the line (green/yellow/red based on score)
- Vertical markers for significant events (new critical finding, scan completed, etc.)
- Comparison line: previous period (ghosted)

### Severity Distribution

A **horizontal stacked bar** or **donut chart** showing open findings by severity. Always use the same color scheme:
- Critical: red (#EF4444)
- High: orange (#F97316)
- Medium: yellow (#EAB308)
- Low: blue (#3B82F6)
- Info: gray (#6B7280)

---

## 5. Score Calculation Engine

### When to Recompute

Security State should be recomputed after any of these events:
1. **Scan completed** — new findings or confirmed absence of existing findings
2. **Finding resolved** — user marks a finding as fixed
3. **Finding dismissed** — user marks a finding as false positive
4. **Finding regressed** — a resolved finding is detected again
5. **Target added/removed** — changes the coverage denominator
6. **Target activated/deactivated** — changes which targets count toward state
7. **Scheduled recomputation** — daily at midnight UTC to ensure consistency

### Computation Pipeline

```
Event Trigger
    │
    ▼
┌─────────────────────┐
│  Recompute Security │
│  State Job (async)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  1. Query all open  │
│     findings for    │
│     target          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  2. Compute target  │
│     security score  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  3. Store snapshot  │
│     (target level)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  4. Aggregate to    │
│     project level   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  5. Aggregate to    │
│     workspace level │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  6. Emit            │
│  SecurityScoreChanged event │
└─────────────────────┘
```

### Performance Considerations

**Problem:** A workspace with 500 targets and 50,000 findings will be expensive to recompute on every scan.

**Solutions:**
1. **Incremental computation:** When a scan completes, only recompute the target that was scanned. Use the previous project/workspace scores and adjust by the delta.
2. **Debouncing:** If multiple scans complete within 60 seconds, batch the recomputation.
3. **Caching:** Store the current state in memory (Redis). Only recompute from DB on cache miss or explicit invalidation.
4. **Prioritization:** User-facing pages read from cache. Background jobs recompute from source of truth.

---

## 6. Score Manipulation & Gaming Prevention

### Potential Gaming Vectors

| Vector | Mitigation |
|--------|------------|
| Dismiss all findings as false positive | Track dismissal rate; flag workspaces with >50% dismissal rate. Audit log captures all dismissals. |
| Delete targets with bad scores | Targets are soft-deleted. Historical state is preserved. Deleting a target doesn't remove its historical findings from workspace state. |
| Scan only "clean" targets, ignore vulnerable ones | Coverage metric penalizes partial scanning. Low coverage lowers Confidence. |
| Create many targets to dilute score | Target count doesn't directly affect score — only findings do. Adding empty targets slightly increases coverage numerator. |

### Score Integrity Rules

1. **Security Score is always computed** — never manually settable, even by admins
2. **All score changes are audited** — stored in SecurityStateSnapshot with trigger event
3. **Dismissal affects score** — dismissed findings are excluded from score, but the dismissal itself is tracked and visible
4. **Score cannot be "reset"** — there is no "clear all findings" operation at the database level

---

## 7. API Exposure

### GET /api/v1/security-state?scope={type}&id={id}

Returns the current security state for a target, project, or workspace.

```json
{
  "data": {
    "scopeType": "workspace",
    "scopeId": "ws_abc123",
    "computedAt": "2026-07-14T10:30:00Z",
    "confidence": 0.85,
    "score": {
      "security": 72,
      "risk": 38,
      "trend": "improving",
      "change": 5,
      "period": "30d"
    },
    "findings": {
      "open": {
        "critical": 1,
        "high": 3,
        "medium": 8,
        "low": 12,
        "info": 5,
        "total": 29
      },
      "regressions": 1,
      "improvements": 7,
      "mttr": 14.5
    },
    "coverage": 0.92,
    "freshness": 0.78,
    "lastScanAt": "2026-07-13T18:00:00Z"
  }
}
```

### GET /api/v1/security-state/history?scope={type}&id={id}&period={30d|90d|1y}

Returns time-series data for charts.

```json
{
  "data": {
    "points": [
      { "date": "2026-06-14", "securityScore": 65, "riskScore": 45, "openFindings": 35 },
      { "date": "2026-06-21", "securityScore": 68, "riskScore": 42, "openFindings": 32 },
      ...
    ],
    "period": "30d"
  }
}
```

---

## 8. Lead Engineer Concern: Is Security Score the Right Abstraction?

**The concern:** A single 0-100 score is reductive. Two applications with very different security profiles can have the same score. Security professionals may find it too simplistic, while non-technical executives may over-index on it.

**My assessment:** The score is necessary but not sufficient. It serves as an entry point — a conversation starter. The product must also expose:

1. **Score breakdown** — which findings contribute most to the score penalty
2. **Score history** — trend over time is more valuable than the current number
3. **Peer comparison** (future) — how does this score compare to similar applications?
4. **Confidence indicator** — how reliable is this score?

The risk of oversimplification is real but manageable if the score is always presented with context. A "72/100" with a red "↓ 5 pts" next to it and a link to "3 new critical findings" is actionable. A bare "72/100" on a dashboard is dangerous.

**Recommendation:** Implement the score as designed, but enforce that every UI surface showing the score also shows trend and at least one contextual metric (top contributor or confidence). Never show the score in isolation.