> **Superseded by:** [PRODUCT_MARKET_FIT_BLUEPRINT.md (Section 9)](../PRODUCT_MARKET_FIT_BLUEPRINT.md (Section 9))
> **Archived reason:** 12-month roadmap, superseded by PMF Blueprint
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# ROADMAP V2 — Product Development Roadmap

> **Document Type:** Product Strategy — Roadmap
> **Version:** 2.0
> **Status:** Draft
> **Prepared by:** Lead Engineer (TASK-004)
> **Depends on:** All TASK-004 documents

---

## Evaluation Criteria

Each task is evaluated on 5 dimensions (1-5 scale):

| Dimension | Meaning |
|-----------|---------|
| **ROI** | Return on investment — business value per engineering hour |
| **Users** | Impact on user experience and retention |
| **Architecture** | Impact on long-term system health and maintainability |
| **Commerce** | Impact on revenue generation or cost reduction |
| **Complexity** | Implementation difficulty (inverted: 5 = easy, 1 = very hard) |

---

## Phase 1: Foundation (Months 1-3)

**Theme:** Build the core platform infrastructure that everything else depends on.

### 1.1 App Router Migration + SPA Elimination

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 3 | No direct user-facing value, but enables everything else |
| Users | 2 | Users don't see routing changes |
| Architecture | 5 | Removes the #1 architectural anti-pattern |
| Commerce | 2 | No direct revenue impact |
| Complexity | 3 | Medium — mechanical but touches every component |

**Problem:** The entire app renders on `/` via client-side conditional rendering. This breaks URL-based navigation, SEO, code splitting, and server-side rendering. It is the root cause of multiple technical debt items.

**Approach:**
- Create proper page routes: `/dashboard`, `/targets`, `/findings`, `/scans`, `/reports`, `/settings`
- Move the SPA conditionals (`if (!session) show login, else show dashboard`) to proper `layout.tsx` with server-side auth checks
- Keep the existing UI components — this is a routing refactor, not a UI redesign
- Add `redirect()` calls in `page.tsx` files for auth-gated routes

**Breaking changes:** Old URLs (everything on `/`) will break. Implement redirects.

**Estimated effort:** 40h

---

### 1.2 Target Entity + Persistence

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 5 | Unlocks scheduled scanning, security state, and continuous monitoring |
| Users | 5 | Users can manage targets instead of re-entering URLs |
| Architecture | 5 | Introduces the most important missing entity |
| Commerce | 4 | Enables per-target billing, usage tracking |
| Complexity | 3 | Medium — new entity, migration, CRUD API, UI |

**Problem:** Scans are fire-and-forget against URL strings. There is no persistent target, no scheduled scanning, no cross-scan tracking.

**Approach:**
- Add `Target` model to Prisma schema with all fields from DOMAIN_MODEL_V2
- Migration: group existing scans by `target` URL → create Target records, link scans
- Build CRUD API: `POST/GET/PATCH/DELETE /api/v1/targets`
- Build Target management UI: list view with hostname, status, last scan, score
- Modify scan creation: accept `targetId` instead of URL string (backward-compatible: auto-create target if not exists)
- Add target verification: async job that checks DNS resolution and HTTP reachability

**Breaking changes:** Scan API changes from `{ target: "url" }` to `{ targetId: "id" }`. Maintain backward compatibility by auto-creating targets.

**Estimated effort:** 60h

---

### 1.3 Finding Lifecycle + Deduplication

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 5 | Enables security state computation, regression detection, and trend tracking |
| Users | 4 | Users can track finding status over time |
| Architecture | 5 | Replaces flat Vulnerability model with proper lifecycle entity |
| Commerce | 3 | Indirect — better data quality increases product value |
| Complexity | 2 | Hard — deduplication logic is non-trivial, data migration is complex |

**Problem:** Vulnerabilities exist only within a single scan. No deduplication, no lifecycle, no regression tracking.

**Approach:**
- Add `Finding` and `FindingScan` models to Prisma schema
- Implement hash-based deduplication: `hash = sha256(cweId + normalizedLocation + severity)`
- Migration strategy:
  1. Group existing Vulnerability records by (target, cweId, location) → create Finding records
  2. Link scans via FindingScan junction
  3. Keep Vulnerability table as a view during transition
- Build Finding API: list (filterable), detail, resolve, dismiss, accept-risk
- Build Finding UI: filterable list with status badges, severity colors, and action buttons
- Implement auto-resolution: when a scan completes without detecting a previously open finding, mark as `resolved` (after 2 consecutive absences to reduce false positives)

**Breaking changes:** Vulnerability model is replaced. All consumers must migrate.

**Estimated effort:** 80h

---

### 1.4 Event Bus (In-Process)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 4 | Decouples system components, enables all future features |
| Users | 1 | Invisible to users |
| Architecture | 5 | Foundation for bounded contexts, security state computation, integrations |
| Commerce | 2 | No direct revenue impact |
| Complexity | 4 | Relatively easy — ~200 lines of TypeScript |

**Problem:** Business logic is tightly coupled in route handlers. `runMockScan()` directly calls notification, SSE, and database operations.

**Approach:**
- Implement in-process EventBus class (see EVENT_MODEL.md Phase 1)
- Create event journal table in SQLite
- Migrate `runMockScan()` to emit events instead of direct calls
- Define event types for scan lifecycle (ScanStarted, ScanCompleted, ScanFailed, FindingDetected)
- Register handlers: SSE broadcaster, notification sender, audit logger
- Event handlers are async, fire-and-forget, with error logging

**Breaking changes:** None — internal refactoring only.

**Estimated effort:** 30h

---

### 1.5 Real DAST Engine Integration (Proof of Concept)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 5 | Product is worthless with a mock scanner |
| Users | 5 | Users get real vulnerability data |
| Architecture | 3 | Replaces mock engine — interface stays the same |
| Commerce | 5 | Product cannot be sold with fake results |
| Complexity | 2 | Hard — integrating a real scanner is non-trivial |

**Problem:** The current scanner generates deterministic fake vulnerabilities from 12 OWASP templates. A security product must produce real results.

**Approach — Phased:**

**Phase 1a (Month 1-2): OWASP ZAP as a Service**
- Deploy OWASP ZAP in a Docker container alongside the Next.js app
- Use ZAP's REST API to start scans, poll status, retrieve results
- Map ZAP alerts to the Finding entity (CWE mapping, severity normalization)
- Implement async scan execution: queue scan → ZAP executes → results processed → events emitted
- Estimated: 60h

**Phase 1b (Month 2-3): Scanner Abstraction Layer**
- Define a `ScanEngine` interface:
  ```typescript
  interface ScanEngine {
    startScan(target: string, profile: ScanProfile): Promise<string>;
    getStatus(scanId: string): Promise<ScanStatus>;
    getResults(scanId: string): Promise<ScanFinding[]>;
    cancelScan(scanId: string): Promise<void>;
  }
  ```
- Implement `ZapScanEngine` (wraps ZAP API)
- Implement `MockScanEngine` (for testing and demos)
- Configuration: `SCAN_ENGINE=zap|mock`
- Estimated: 30h

**Breaking changes:** Scan results will be different (real vs. fake). The score algorithm must be recalibrated for real findings.

**Estimated total effort:** 90h

---

### Phase 1 Summary

| Task | Effort | Dependencies |
|------|--------|-------------|
| 1.1 App Router Migration | 40h | None |
| 1.2 Target Entity | 60h | None |
| 1.3 Finding Lifecycle | 80h | 1.2 (Target) |
| 1.4 Event Bus | 30h | None |
| 1.5 Real DAST Engine | 90h | 1.2 (Target), 1.3 (Finding) |
| **Total** | **300h** | |

**Parallelism:**
- 1.1, 1.2, 1.4 can run in parallel (no dependencies)
- 1.3 depends on 1.2
- 1.5 depends on 1.2 and 1.3

**With 2 developers (~160h/month):** ~2 months
**With 1 developer (~80h/month):** ~4 months (exceeds 3-month target)

**Recommendation:** Prioritize 1.2 and 1.4 first (they unblock everything else), then 1.3, then 1.5. 1.1 can be done at any point — it's independent.

---

## Phase 2: Intelligence (Months 4-6)

**Theme:** Transform from a scanner into an intelligent security monitoring platform.

### 2.1 Security State Computation

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 5 | Core product differentiator |
| Users | 5 | Gives users a reason to return daily |
| Architecture | 5 | Central computed entity |
| Commerce | 5 | The single biggest driver of paid conversions |
| Complexity | 3 | Medium — algorithm is straightforward, async pipeline is the challenge |

**Problem:** No aggregated security view. Users see individual scan results, not a security posture.

**Approach:**
- Implement Security Score algorithm (see SECURITY_STATE.md)
- Create `SecurityStateSnapshot` table for time-series storage
- Implement async computation pipeline (event-driven, triggered by scan completion and finding changes)
- Build API: current state, history, comparison
- Build minimal dashboard widget: Score Gauge only
- Cache current state in-memory

**Estimated effort:** 60h

---

### 2.2 Dashboard V2 (Core Widgets)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 5 | Primary user-facing product surface |
| Users | 5 | Transforms the user experience from tool to platform |
| Architecture | 3 | UI work, no backend architecture changes |
| Commerce | 4 | Demo/sales dashboard is the #1 conversion tool |
| Complexity | 4 | Relatively easy — shadcn/ui components, Recharts already available |

**Problem:** Current dashboard is a blank scan form. First-time users see no value.

**Approach:**
- Build the dashboard layout from DASHBOARD_V2.md
- Implement widgets in priority order:
  1. Security Score Gauge + Trend Chart (depends on 2.1)
  2. Severity Breakdown Cards
  3. Recent Changes feed
  4. Scheduled Scans panel
  5. Regressions panel
  6. Team Activity feed
- Extend SSE to push score updates and finding events
- Implement workspace-level and project-level views (scope switcher)

**Estimated effort:** 80h

---

### 2.3 Scheduled Scanning (Cron-Based)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 5 | Enables continuous monitoring — the core value proposition |
| Users | 5 | Users set it once, get continuous value |
| Architecture | 4 | Requires job scheduler infrastructure |
| Commerce | 5 | Scheduled scanning is a premium feature |
| Complexity | 3 | Medium — cron scheduling, queue management, failure handling |

**Problem:** Users must manually start every scan. No continuous monitoring.

**Approach:**
- Introduce a job scheduler (node-cron for single-VPS, BullMQ for scale)
- Store schedule configuration on Target model (`scheduleCron` field)
- Implement scan queue: scheduled scans are queued at the configured time
- Handle failures: retry with exponential backoff, notify on persistent failure
- Build UI: set/edit/remove schedule per target, view upcoming scans
- Default schedules: daily for all targets (configurable per workspace)

**Estimated effort:** 50h

---

### 2.4 Slack Integration

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 4 | High retention impact, competitive differentiator |
| Users | 4 | Users see security in their existing workflow |
| Architecture | 4 | Validates the integration architecture |
| Commerce | 3 | Premium feature, but hard to charge for |
| Complexity | 4 | Relatively easy — webhook-based, Slack API is well-documented |

**Problem:** No external integrations. Users must open the product to see security status.

**Approach:**
- Build Integration context (from BOUNDED_CONTEXTS.md)
- Implement Slack webhook integration:
  - Post scan results to a channel
  - Post critical finding alerts (immediately)
  - Post daily security digest (configurable time)
- Build integration management UI: connect Slack workspace, select channel, configure events
- Use event bus: integration handler subscribes to domain events

**Estimated effort:** 40h

---

### 2.5 Notification System Overhaul

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 4 | Key retention mechanism |
| Users | 4 | Users get timely alerts without checking the dashboard |
| Architecture | 4 | Extracts notification logic from scan route |
| Commerce | 3 | Digest emails drive daily engagement |
| Complexity | 3 | Medium — preference system, delivery tracking |

**Problem:** Email notifications are embedded in scan route. No in-app notifications. No per-event-type preferences.

**Approach:**
- Build Notification context with proper event subscription
- Implement in-app notifications: notification bell, dropdown, unread count
- Implement per-workspace, per-event-type notification preferences
- Implement daily/weekly email digest (summaries, not individual alerts)
- Implement smart routing: critical → immediate (email + in-app + Slack), low → daily digest

**Estimated effort:** 50h

---

### 2.6 Workspace Evolution (Team → Workspace)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 3 | Required for billing, access control, and multi-tenancy |
| Users | 3 | Users get a personal workspace automatically |
| Architecture | 5 | Correct organizational boundary |
| Commerce | 5 | Workspace = billing boundary |
| Complexity | 3 | Medium — model evolution, migration, access control refactoring |

**Problem:** Team is the only organizational unit. No personal workspace. No workspace-level billing or settings.

**Approach:**
- Add `type` field to Team table: `personal` | `team`
- Rename in UI: "Team" → "Workspace"
- Auto-create personal workspace on registration
- Move access control from user-level to workspace-level
- Scope API keys to workspace
- Scope notification preferences to workspace

**Estimated effort:** 50h

---

### Phase 2 Summary

| Task | Effort | Dependencies |
|------|--------|-------------|
| 2.1 Security State | 60h | Phase 1 (Target, Finding, Events) |
| 2.2 Dashboard V2 | 80h | 2.1 (Security State) |
| 2.3 Scheduled Scanning | 50h | 1.2 (Target), 1.4 (Events) |
| 2.4 Slack Integration | 40h | 1.4 (Events) |
| 2.5 Notification System | 50h | 1.4 (Events), 2.6 (Workspace) |
| 2.6 Workspace Evolution | 50h | None (can start in Phase 1) |
| **Total** | **330h** | |

---

## Phase 3: Growth (Months 7-12)

**Theme:** Scale the platform, add commercial features, and build moat.

### 3.1 Billing Integration (Stripe)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 5 | Revenue generation |
| Users | 2 | Users don't love billing, but need it |
| Architecture | 3 | Well-defined domain, standard implementation |
| Commerce | 5 | Without billing, there is no business |
| Complexity | 4 | Relatively easy — Stripe has excellent docs and SDKs |

**Approach:**
- Integrate Stripe Subscriptions API
- Implement Plan management (Free, Pro, Business, Enterprise)
- Implement Subscription lifecycle (trial → active → past_due → canceled)
- Build billing portal (Stripe Customer Portal for self-service)
- Implement usage tracking and limit enforcement
- Replace static `StoreProduct` with dynamic `Plan` entity

**Estimated effort:** 60h

---

### 3.2 Report Generation V2

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 4 | Key enterprise feature, drives paid conversions |
| Users | 4 | CTOs need reports for boards and compliance |
| Architecture | 3 | Separate Reporting context |
| Commerce | 5 | Scheduled reports are a premium feature |
| Complexity | 3 | Medium — async generation, templates, storage |

**Approach:**
- Extract report generation from scan route into Reporting context
- Implement async generation (queue, generate, store, notify)
- Add report templates: Executive Summary, Technical Detail, Compliance (SOC2, ISO27001)
- Implement scheduled reports (weekly/monthly, auto-deliver to email)
- Implement report storage with auto-expiry
- Add branding (workspace logo, custom colors)

**Estimated effort:** 70h

---

### 3.3 Jira/GitHub Integration

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 4 | High retention, competitive necessity |
| Users | 5 | Developers live in Jira/GitHub — meet them there |
| Architecture | 4 | Extends integration framework |
| Commerce | 4 | Premium feature |
| Complexity | 3 | Medium — OAuth flows, bi-directional sync |

**Approach:**
- Extend Integration context for Jira Cloud and GitHub
- Jira: auto-create tickets for new critical/high findings, update on resolution
- GitHub: create issues for new findings, comment on resolution, link to PRs (future)
- Implement OAuth2 flow for authorization
- Build integration setup UI (authorize, select project/repo, configure mapping)

**Estimated effort:** 80h

---

### 3.4 Webhook System

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 3 | Enables custom integrations without building each one |
| Users | 3 | Power users want to connect to custom systems |
| Architecture | 4 | Generic integration mechanism |
| Commerce | 3 | Premium feature |
| Complexity | 4 | Relatively easy — POST JSON to URL |

**Approach:**
- Implement generic webhook integration type
- User configures: URL, secret (for HMAC signing), event types
- System signs every payload with HMAC-SHA256 for verification
- Delivery tracking: success/failure, retry on failure, dead letter after 3 retries
- Build webhook management UI: create, test, view delivery logs

**Estimated effort:** 40h

---

### 3.5 Advanced Scanning Features

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 4 | Expands the scanner's capabilities |
| Users | 4 | More scan types = more value |
| Architecture | 3 | Extends scanner abstraction layer |
| Commerce | 4 | Advanced scanning = premium tier |
| Complexity | 2 | Hard — real scanning is complex |

**Features:**
- Authentication-aware scanning (login before scanning protected pages)
- Custom scan profiles (scope, depth, exclusions)
- API endpoint scanning (REST/GraphQL)
- Incremental scanning (only test changed pages)
- Multi-engine support (add SAST/SCA engines alongside DAST)

**Estimated effort:** 120h

---

### 3.6 Multi-Language Support V2

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 3 | Market expansion |
| Users | 4 | Non-English users |
| Architecture | 2 | i18n already exists, needs expansion |
| Commerce | 4 | Larger addressable market |
| Complexity | 4 | Relatively easy — add translation keys |

**Approach:**
- Expand existing i18n system to cover all new UI surfaces
- Add Russian, German, French, Spanish translations
- Implement language detection based on browser settings
- Ensure all email templates are translatable

**Estimated effort:** 30h

---

### 3.7 Performance & Reliability

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| ROI | 3 | Infrastructure investment, not user-facing |
| Users | 3 | Faster page loads, fewer errors |
| Architecture | 5 | Required for scale |
| Commerce | 2 | Indirect — reliability enables enterprise sales |
| Complexity | 3 | Medium — caching, optimization, monitoring |

**Tasks:**
- Replace in-memory state (rate limiter, SSE hub) with Redis
- Add database connection pooling and query optimization
- Implement response caching for dashboard APIs
- Add health checks and monitoring (Prometheus metrics, Grafana dashboards)
- Implement rate limiting per workspace (not just per IP/user)
- Add request logging and performance tracking
- Set up CI/CD pipeline with automated testing

**Estimated effort:** 80h

---

### Phase 3 Summary

| Task | Effort | Dependencies |
|------|--------|-------------|
| 3.1 Billing (Stripe) | 60h | 2.6 (Workspace) |
| 3.2 Report Generation V2 | 70h | 2.1 (Security State) |
| 3.3 Jira/GitHub Integration | 80h | 2.4 (Integration framework) |
| 3.4 Webhook System | 40h | 2.4 (Integration framework) |
| 3.5 Advanced Scanning | 120h | 1.5 (Scanner abstraction) |
| 3.6 Multi-Language V2 | 30h | None |
| 3.7 Performance & Reliability | 80h | None |
| **Total** | **480h** | |

---

## 12-Month Roadmap Overview

```
Month 1-3: FOUNDATION
├── App Router Migration
├── Target Entity
├── Finding Lifecycle
├── Event Bus
└── Real DAST Engine
    Total: 300h

Month 4-6: INTELLIGENCE
├── Security State Computation
├── Dashboard V2
├── Scheduled Scanning
├── Slack Integration
├── Notification System
└── Workspace Evolution
    Total: 330h

Month 7-12: GROWTH
├── Billing (Stripe)
├── Report Generation V2
├── Jira/GitHub Integration
├── Webhook System
├── Advanced Scanning
├── Multi-Language V2
└── Performance & Reliability
    Total: 480h

GRAND TOTAL: 1,110h
```

---

## Resource Planning

| Scenario | Monthly Capacity | Phase 1 | Phase 2 | Phase 3 |
|----------|-----------------|---------|---------|---------|
| Solo founder (20h/week) | ~80h | 3.75 months | 4.1 months | 6 months | 14 months total |
| 1 full-time dev (40h/week) | ~160h | 1.9 months | 2.1 months | 3 months | 7 months total |
| 2 developers | ~320h | 0.9 months | 1.0 months | 1.5 months | 3.5 months total |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Real DAST engine integration takes 3x longer than estimated | High | Critical | Start with ZAP (proven, well-documented). Budget 90h but have a 150h contingency. |
| Security Score algorithm produces confusing/unhelpful numbers | Medium | High | Implement MVD dashboard early to validate. Adjust weights based on real data. |
| User churn during foundation phase (no visible new features) | Medium | High | Ship Target management and Finding UI incrementally — don't wait for full phase. |
| SQLite becomes a bottleneck | Low | High | Design for PostgreSQL from the start (Prisma makes this easy). Switch when user count exceeds 500. |
| Event system adds too much complexity for a solo developer | Medium | Medium | Keep Phase 1 (in-process EventBus) as simple as possible. Resist over-engineering. |
| Billing integration blocked by legal/tax compliance | Low | Medium | Use Stripe — they handle most compliance. Start with simple monthly subscriptions. |
| OWASP ZAP Docker container consumes too much memory on VPS | Medium | Medium | Use ZAP's lightweight mode. Limit concurrent scans. Consider external scanning service. |

---

## Lead Engineer Concern: Is This Roadmap Too Ambitious?

**The concern:** 1,110 hours over 12 months assumes ~90h/month sustained effort. For a solo founder or small team, this is aggressive. What if Phase 1 takes 5 months instead of 3?

**My assessment: The roadmap is correctly scoped but the timeline may be optimistic.** Here's my honest assessment:

**What I would cut if time-constrained:**
1. **3.6 Multi-Language V2 (30h)** — current i18n is adequate for Russian/English. Expand later.
2. **3.4 Webhook System (40h)** — generic webhooks are nice-to-have when Slack + Jira + GitHub cover 90% of use cases.
3. **3.7 Performance & Reliability (partial, -40h)** — only do Redis migration when user count justifies it.

**Total savings: 110h**, bringing the grand total to ~1,000h.

**What I would NOT cut under any circumstances:**
1. **Target Entity (1.2)** — everything depends on it
2. **Finding Lifecycle (1.3)** — security state depends on it
3. **Real DAST Engine (1.5)** — the product is a joke without real scanning
4. **Security State (2.1)** — this IS the product
5. **Dashboard V2 (2.2)** — this is how users experience the product

**The real risk is Phase 1.** If the real DAST engine integration takes 150h instead of 90h, the entire timeline shifts. Mitigation: start with the simplest possible ZAP integration (single-target, no auth, no custom profiles) and iterate.

**One more thing I would argue against:** Phase 3.5 (Advanced Scanning, 120h) is the single largest task. I would split it:
- Phase 3a (Month 7-9): Auth-aware scanning + custom profiles (60h)
- Phase 3b (Month 10-12): API scanning + multi-engine (60h)
- Defer incremental scanning to next year

This makes the roadmap more achievable without sacrificing the core vision.