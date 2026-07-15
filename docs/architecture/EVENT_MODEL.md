# EVENT MODEL — Event-Driven Architecture Design

> **Document Type:** Product Architecture — Event Model
> **Version:** 2.0
> **Status:** Draft
> **Prepared by:** Lead Engineer (TASK-004)
> **Depends on:** DOMAIN_MODEL_V2.md, SECURITY_STATE.md

---

## 1. Why Events

The current architecture is **request-driven**: every action is a synchronous HTTP request that directly modifies the database. The scan flow is the only partially asynchronous component (fire-and-forget `void runMockScan()` with SSE broadcast), but even this is ad-hoc, not systematic.

An event model transforms the architecture from "call a function, get a result" to "something happened, react to it." This is essential for:

1. **Decoupling:** The scan engine doesn't need to know about notifications, security state computation, or integrations. It just emits events.
2. **Extensibility:** Adding a new consumer (e.g., Slack integration) requires zero changes to the event producer.
3. **Auditability:** Every significant state change is recorded as an event, creating a complete audit trail beyond the current `AuditLog`.
4. **Reliability:** Events can be retried, replayed, and dead-lettered. Direct function calls cannot.
5. **Scalability:** Event consumers can process events at their own pace. The scan engine isn't blocked by slow notification delivery.

---

## 2. Event Architecture

### Transport Layer

**Current state:** In-memory `globalThis` maps (SSE hub, rate limiter). Single-process only.

**Target state:** Event bus with persistence. Three implementation tiers:

| Tier | Technology | When to use |
|------|-----------|-------------|
| **Tier 1 (Current)** | In-process EventEmitter + SQLite journal | 0-100 concurrent users, single VPS |
| **Tier 2 (Growth)** | Redis Streams / BullMQ | 100-10,000 concurrent users, multi-process |
| **Tier 3 (Scale)** | Apache Kafka / AWS EventBridge | 10,000+ concurrent users, multi-region |

**Recommendation for immediate implementation:** Start with Tier 1 (in-process) but design the event interfaces as if they'll be on a message broker. This means:
- Events are plain objects with a schema (not callbacks)
- Event handlers are idempotent (safe to replay)
- No direct references between producer and consumer code
- Event ordering guarantees are not assumed (handlers must be tolerant of out-of-order delivery)

### Event Envelope

Every event has a standard envelope:

```typescript
interface DomainEvent<T = unknown> {
  id: string;              // Unique event ID (CUID)
  type: string;            // Event type (e.g., "ScanCompleted")
  version: number;         // Schema version (for migration)
  timestamp: string;       // ISO 8601
  correlationId: string;   // Groups related events (e.g., all events from one scan)
  causationId: string;     // The event that caused this event (event chain)
  source: string;          // Bounded context that produced this event
  data: T;                 // Event-specific payload
  metadata: {
    actorId?: string;      // User who triggered the action
    workspaceId: string;   // Always present (data isolation)
    ipAddress?: string;
    userAgent?: string;
  };
}
```

**Why `correlationId` and `causationId`?**
- `correlationId` groups all events from a single business transaction (e.g., one scan execution). A scan produces: `ScanStarted` → `FindingDetected` (N times) → `ScanCompleted` → `SecurityScoreChanged`. All share the same `correlationId`.
- `causationId` traces the event chain. `SecurityScoreChanged` was caused by `ScanCompleted`, which was caused by `ScanStarted`. This enables event replay and debugging.

---

## 3. Core Event Catalog

### 3.1 Identity Events

#### UserRegistered
```typescript
type = "UserRegistered"
source = "Identity"
data = {
  userId: string;
  email: string;
  registrationMethod: "credentials" | "google" | "github";
}
```
- **Trigger:** New user account created
- **Consumers:** `Workspace` context (create personal workspace), `Billing` (start trial), `AuditLog`
- **Future integrations:** Welcome email sequence, analytics tracking, fraud detection
- **Side effects:** Create personal workspace, send welcome email, emit analytics event

#### UserLoginSucceeded
```typescript
type = "UserLoginSucceeded"
data = {
  userId: string;
  method: "credentials" | "google" | "github";
  totpUsed: boolean;
}
```
- **Trigger:** Successful authentication
- **Consumers:** `AuditLog`, `Notification` (login from new IP/device detection)
- **Future integrations:** Login anomaly detection, session management

#### UserLoginFailed
```typescript
type = "UserLoginFailed"
data = {
  email: string;
  reason: "user_not_found" | "invalid_password" | "invalid_totp" | "rate_limited";
  ipAddress: string;
}
```
- **Trigger:** Failed authentication attempt
- **Consumers:** `AuditLog`, `Security` (brute-force detection, account lockout)

---

### 3.2 Workspace Events

#### WorkspaceCreated
```typescript
type = "WorkspaceCreated"
source = "Workspace"
data = {
  workspaceId: string;
  name: string;
  type: "personal" | "team";
  ownerId: string;
}
```
- **Trigger:** Workspace created (automatically for personal, manually for team)
- **Consumers:** `Billing` (create subscription), `AuditLog`
- **Future integrations:** Workspace provisioning, default integration setup

#### MemberInvited
```typescript
type = "MemberInvited"
data = {
  workspaceId: string;
  inviteId: string;
  email: string;
  role: "admin" | "member" | "viewer";
  invitedBy: string;
  expiresAt: string;
}
```
- **Trigger:** Invitation sent
- **Consumers:** `Notification` (send invite email), `AuditLog`
- **Future integrations:** Slack notification to workspace channel

#### MemberJoined
```typescript
type = "MemberJoined"
data = {
  workspaceId: string;
  userId: string;
  role: string;
  invitedBy?: string;
}
```
- **Trigger:** User accepts invitation or is added directly
- **Consumers:** `AuditLog`, `Notification` (welcome to workspace), `Security` (update access control cache)
- **Future integrations:** SCIM provisioning sync

---

### 3.3 Scanning Events

#### TargetCreated
```typescript
type = "TargetCreated"
source = "Scanning"
data = {
  targetId: string;
  projectId: string;
  url: string;
  hostname: string;
  createdBy: string;
}
```
- **Trigger:** New target added to a project
- **Consumers:** `Scanning` (verify target reachability), `SecurityState` (recompute coverage), `AuditLog`
- **Future integrations:** DNS/HTTP verification, tech fingerprint scan, certificate transparency check
- **Side effects:** Queue target verification job, recompute project/workspace coverage

#### TargetUpdated
```typescript
type = "TargetUpdated"
data = {
  targetId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  updatedBy: string;
}
```
- **Trigger:** Target configuration changed (URL, schedule, scan profile)
- **Consumers:** `AuditLog`, `SecurityState` (if schedule or status changed)
- **Future integrations:** Re-verify if URL changed, cancel pending scans if target deactivated

#### ScanScheduled
```typescript
type = "ScanScheduled"
source = "Scanning"
data = {
  scanId: string;
  targetId: string;
  scheduledAt: string;
  triggerType: "manual" | "scheduled" | "api" | "ci_cd";
  triggeredBy?: string;
  scanProfileId: string;
}
```
- **Trigger:** Scan queued for execution
- **Consumers:** `Notification` (show "scan starting" in activity feed), `AuditLog`
- **Future integrations:** CI/CD status checks, external calendar integration
- **Side effects:** Update target `lastScannedAt`, push SSE notification to connected clients

#### ScanStarted
```typescript
type = "ScanStarted"
source = "Scanning"
data = {
  scanId: string;
  targetId: string;
  targetUrl: string;
  engineVersion: string;
  startedAt: string;
}
```
- **Trigger:** Scan execution begins
- **Consumers:** SSE hub (push to connected clients), `AuditLog`
- **Future integrations:** Webhook (notify external systems), status page update
- **Side effects:** Update scan status to `running`, push SSE event to frontend

#### ScanProgress
```typescript
type = "ScanProgress"
source = "Scanning"
data = {
  scanId: string;
  targetId: string;
  progress: number;       // 0-100
  phase: string;          // "crawling" | "testing" | "analysis" | "finalizing"
  findingsSoFar: number;
  elapsedTime: number;    // seconds
}
```
- **Trigger:** During scan execution (at key milestones)
- **Consumers:** SSE hub (real-time progress bar in UI)
- **Future integrations:** WebSocket to frontend, progress webhooks
- **Note:** This is a high-frequency event. For production, batch or throttle to avoid flooding.

#### ScanCompleted
```typescript
type = "ScanCompleted"
source = "Scanning"
data = {
  scanId: string;
  targetId: string;
  targetUrl: string;
  status: "completed";
  durationMs: number;
  score: number;
  findingsCount: number;
  findingsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  newFindings: number;
  regressedFindings: number;
  resolvedFindings: number;
  completedAt: string;
}
```
- **Trigger:** Scan finishes successfully
- **Consumers:** **This is the most-consumed event in the system.**
  - `SecurityState` — recompute security state for target → project → workspace
  - `Notification` — send scan completion notification
  - `SSE` — push to connected clients
  - `Integration` — fire webhooks, create Jira tickets, post to Slack
  - `Reporting` — check if any reports are waiting on this scan
  - `AuditLog` — record completion
  - `Billing` — update usage counters
- **Side effects:** Recompute security state (async), send notifications (async), fire integrations (async)

#### ScanFailed
```typescript
type = "ScanFailed"
data = {
  scanId: string;
  targetId: string;
  error: string;
  retryable: boolean;
  failedAt: string;
}
```
- **Trigger:** Scan encounters an error
- **Consumers:** SSE hub, `Notification` (alert if scan was scheduled/important), `AuditLog`
- **Side effects:** Update scan status, notify user, log for monitoring

---

### 3.4 Finding Events

#### FindingDetected
```typescript
type = "FindingDetected"
source = "Findings"
data = {
  findingId: string;
  scanId: string;
  targetId: string;
  isNew: boolean;            // First time this finding hash seen on this target
  isRegression: boolean;     // Was previously resolved, now detected again
  severity: Severity;
  cweId: string;
  title: string;
  location: string;
  confidence: number;
}
```
- **Trigger:** A new or recurring finding is identified from scan results
- **Consumers:**
  - `Notification` — if severity is critical/high or finding is a regression
  - `Integration` — create Jira ticket / GitHub issue for new critical findings
  - `SecurityState` — if finding is new or regression, schedule state recompute
  - `AuditLog` — record finding creation
- **Future integrations:** Auto-assign to team member based on location/code ownership, link to commit that introduced the vulnerability

#### FindingResolved
```typescript
type = "FindingResolved"
source = "Findings"
data = {
  findingId: string;
  targetId: string;
  resolvedBy: string;
  resolutionNote?: string;
  method: "scan_confirmed" | "manual" | "auto_dismiss";
  wasOpenFor: number;  // days
}
```
- **Trigger:** Finding is no longer detected in a scan, or manually marked as resolved
- **Consumers:**
  - `SecurityState` — recompute security state
  - `Notification` — notify assignee and watchers
  - `Integration` — close Jira ticket / resolve GitHub issue
  - `AuditLog` — record resolution
- **Note:** Two resolution methods:
  1. **Scan-confirmed:** A scan ran and this finding was not detected. Automatic resolution.
  2. **Manual:** User explicitly marked as resolved (e.g., they fixed it but haven't rescanned yet).
  3. **Auto-dismiss:** System marked as false positive based on confidence or pattern.

#### FindingRegressed
```typescript
type = "FindingRegressed"
source = "Findings"
data = {
  findingId: string;
  scanId: string;
  targetId: string;
  severity: Severity;
  title: string;
  previouslyResolvedAt: string;
  resolutionAge: number;  // days between resolution and regression
  location: string;
}
```
- **Trigger:** A previously resolved finding is detected again
- **Consumers:**
  - `Notification` — **HIGH PRIORITY** — regressions are critical signals
  - `Integration` — reopen Jira ticket / GitHub issue, post to Slack with warning
  - `SecurityState` — recompute (regression penalty)
  - `AuditLog` — record regression
- **Why regressions are special:** They indicate either an incomplete fix or a code reintroduction. Regressions should trigger higher-priority notifications than new findings of the same severity.

#### RiskChanged
```typescript
type = "RiskChanged"
source = "SecurityState"
data = {
  scopeType: "target" | "project" | "workspace";
  scopeId: string;
  previousScore: number;
  newScore: number;
  previousRiskScore: number;
  newRiskScore: number;
  previousTrend: TrendDirection;
  newTrend: TrendDirection;
  change: number;         // positive = improvement, negative = decline
  significant: boolean;   // |change| >= threshold
  triggers: string[];     // what caused the change (finding IDs)
}
```
- **Trigger:** Computed after Security State recomputation, only if score changed beyond threshold
- **Consumers:**
  - `Notification` — alert on significant negative changes, celebrate positive changes
  - `Integration` — fire webhook, post to Slack
  - `Reporting` — include in daily/weekly digests
- **Threshold:** Default ±3 points. Configurable per workspace.

#### SecurityScoreChanged
```typescript
type = "SecurityScoreChanged"
source = "SecurityState"
data = {
  scopeType: "target" | "project" | "workspace";
  scopeId: string;
  previousScore: number;
  newScore: number;
  trend: TrendDirection;
  confidence: number;
  openFindingsBreakdown: SeverityBreakdown;
}
```
- **Trigger:** Derived from `RiskChanged` — emitted for dashboard/consumer convenience
- **Consumers:** Dashboard UI (SSE push), API clients, widgets
- **Note:** This is a view event — it's derived from `RiskChanged` for consumers that only care about the score, not the details.

---

### 3.5 Reporting Events

#### ReportGenerated
```typescript
type = "ReportGenerated"
source = "Reporting"
data = {
  reportId: string;
  scopeType: "target" | "project" | "workspace";
  scopeId: string;
  format: "pdf" | "html" | "json" | "csv";
  generatedBy: string;
  fileUrl?: string;
  fileSize?: number;
  generatedAt: string;
}
```
- **Trigger:** Report generation completes
- **Consumers:** `Notification` (send report to recipients), `Integration` (post to Slack, upload to S3)
- **Future integrations:** Auto-distribute to stakeholders, archive to document management system

---

### 3.6 Notification Events

#### NotificationSent
```typescript
type = "NotificationSent"
source = "Notifications"
data = {
  notificationId: string;
  userId: string;
  workspaceId: string;
  channel: "in_app" | "email" | "slack" | "webhook";
  type: string;
  status: "sent" | "delivered" | "failed";
  error?: string;
}
```
- **Trigger:** Notification delivery attempt completes
- **Consumers:** `AuditLog`, monitoring/alerting (detect notification delivery failures)

---

## 4. Event Flow Diagrams

### 4.1 Scan Lifecycle Event Flow

```
User clicks "Start Scan"
        │
        ▼
   ScanScheduled ─────────────────────────┐
        │                                  │
        ▼                                  │
   ScanStarted ──────► SSE (UI) ─────────┤
        │                                  │
        ▼                                  │
   ScanProgress ────► SSE (progress)      │
        │                                  │
        ▼                                  │
   [Scan engine runs]                      │
        │                                  │
        ▼                                  │
   FindingDetected (×N) ──► Dedup check   │
        │                       │          │
        │              New? ────┤          │
        │              │       │          │
        │              ▼       ▼          │
        │         Create    Update        │
        │         Finding   existing      │
        │                                │
        ▼                                  │
   ScanCompleted ─────────────────────────┤
        │                                  │
        ├──► SecurityState recompute      │
        │         │                        │
        │         ▼                        │
        │    SecurityScoreChanged ──► SSE (UI) │
        │    RiskChanged ──► Notification  │
        │                                  │
        ├──► Notification (email)         │
        │                                  │
        ├──► Integration (webhooks)       │
        │                                  │
        └──► Billing (usage update)       │
```

### 4.2 Finding Lifecycle Event Flow

```
Scan detects vulnerability
        │
        ▼
   Compute finding hash
        │
        ├── Hash not found in DB ──► CREATE finding (status: "open")
        │                                │
        │                                ▼
        │                           FindingDetected (isNew: true)
        │                                │
        │                                ▼
        │                           Notification (if critical/high)
        │                           Integration (create ticket)
        │
        ├── Hash found, finding is "resolved" ──► UPDATE finding (status: "regressed")
        │                                                   │
        │                                                   ▼
        │                                              FindingRegressed
        │                                                   │
        │                                                   ▼
        │                                              Notification (HIGH PRIORITY)
        │                                              Integration (reopen ticket)
        │
        └── Hash found, finding is "open"/"confirmed" ──► UPDATE finding (lastSeenAt)
                                                          │
                                                          ▼
                                                     FindingDetected (isNew: false)
                                                     (no notification — already known)
```

---

## 5. Event Processing Architecture

### Phase 1: In-Process (Current VPS Deployment)

```
┌─────────────────────────────────────────────┐
│  Next.js Process                            │
│                                             │
│  ┌──────────┐    ┌──────────────────────┐  │
│  │  Event   │───►│  In-Process Handler  │  │
│  │  Emitter │    │  Registry            │  │
│  └──────────┘    └──────────┬───────────┘  │
│                             │              │
│              ┌──────────────┼──────────┐   │
│              ▼              ▼          ▼   │
│     ┌────────────┐  ┌──────────┐ ┌─────┐  │
│     │ Security   │  │ Notify   │ │SSE  │  │
│     │ State      │  │ Handler  │ │Hub  │  │
│     │ Recomputer │  │          │ │     │  │
│     └─────┬──────┘  └──────────┘ └─────┘  │
│           │                                │
│           ▼                                │
│     ┌──────────┐                           │
│     │ SQLite   │                           │
│     │ (events  │                           │
│     │  table)  │                           │
│     └──────────┘                           │
└─────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// Simple typed event bus
type EventHandler<T> = (event: DomainEvent<T>) => Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  on<T>(type: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  async emit<T>(event: DomainEvent<T>): Promise<void> {
    // 1. Persist to event journal (SQLite)
    await persistEvent(event);

    // 2. Dispatch to handlers (async, non-blocking)
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        // Fire and forget — errors are caught and logged
        handler(event).catch(err => {
          console.error(`[EventBus] Handler error for ${event.type}:`, err);
        });
      }
    }

    // 3. Dispatch to wildcard handlers (for monitoring, logging)
    const wildcards = this.handlers.get('*');
    if (wildcards) {
      for (const handler of wildcards) {
        handler(event).catch(err => {
          console.error(`[EventBus] Wildcard handler error:`, err);
        });
      }
    }
  }
}
```

### Phase 2: Redis Streams (Multi-Process, ~100 concurrent users)

Replace in-process dispatch with Redis Streams. Each consumer group is a separate process (or separate worker within a process). This enables:
- Horizontal scaling of consumers
- Event replay from any point in the stream
- Dead letter queue for failed events
- Consumer lag monitoring

### Phase 3: Message Broker (Scale, ~10,000+ concurrent users)

Full message broker (Kafka, AWS EventBridge, or similar) with:
- Event schemas enforced by a schema registry
- Exactly-once or at-least-once delivery (configurable per event type)
- Multi-region event replication
- Event archival for compliance

---

## 6. Event Journal (SQLite Table)

Even in Phase 1, every event is persisted to the database. This serves multiple purposes:

1. **Auditability:** Complete record of everything that happened
2. **Replay:** Events can be replayed to rebuild state (e.g., after a bug fix)
3. **Debugging:** Trace the exact sequence of events for a specific scan or finding
4. **Analytics:** Query event history for product usage insights

```sql
CREATE TABLE domain_events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  timestamp   TEXT NOT NULL,           -- ISO 8601
  correlation_id TEXT NOT NULL,
  causation_id   TEXT,
  source      TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  actor_id    TEXT,
  data        TEXT NOT NULL,           -- JSON
  metadata    TEXT NOT NULL,           -- JSON
  processed   INTEGER DEFAULT 0       -- For consumer tracking
);

CREATE INDEX idx_events_type ON domain_events(type);
CREATE INDEX idx_events_correlation ON domain_events(correlation_id);
CREATE INDEX idx_events_workspace ON domain_events(workspace_id);
CREATE INDEX idx_events_timestamp ON domain_events(timestamp);
CREATE INDEX idx_events_scope ON domain_events(type, workspace_id, timestamp);
```

**Retention:** 90 days in SQLite. Export to cold storage (S3, archive DB) before deletion.

---

## 7. Lead Engineer Concern: Is Event-Driven Overkill Right Now?

**The concern:** The current product has ~50 active users (estimate based on VPS deployment and feature set). Implementing a full event system adds significant complexity — event schemas, handlers, journaling, error handling, idempotency. Is this complexity justified?

**My assessment: Yes, but with caveats.**

The argument against: YAGNI. You don't need Kafka for 50 users. The current direct-function-call approach works fine at this scale.

The argument for: The event model is not about scale — it's about **architectural clarity**. Even at 50 users, the current code has problems that events solve:

1. **`runMockScan()` in `route.ts`** directly calls `broadcastScanUpdate()`, `notifyScanCompleted()`, and `db.transaction()`. This is three concerns mixed into one function. With events, each is a separate handler.

2. **Adding a Slack notification** currently requires modifying the scan route handler. With events, you add a new event handler — zero changes to existing code.

3. **Security State computation** (the core new feature) cannot be bolted onto the current `runMockScan()` function. It needs its own processing pipeline. Events are the natural way to connect them.

**Recommendation:** Implement Phase 1 (in-process EventBus with SQLite journal) as part of the Security State implementation. The implementation is ~200 lines of TypeScript. The event schemas enforce documentation. The journal provides auditability. When you outgrow it, migrating to Redis Streams is a transport change — not an architectural change.

**What NOT to do:** Don't implement all events at once. Start with the scan lifecycle events (`ScanScheduled`, `ScanStarted`, `ScanCompleted`, `FindingDetected`, `SecurityScoreChanged`). Add identity and workspace events when those contexts are refactored.