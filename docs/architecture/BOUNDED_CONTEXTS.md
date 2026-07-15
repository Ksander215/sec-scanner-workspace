# BOUNDED CONTEXTS — Domain Boundary Definitions

> **Document Type:** Product Architecture — Bounded Contexts
> **Version:** 2.0
> **Status:** Draft
> **Prepared by:** Lead Engineer (TASK-004)
> **Depends on:** DOMAIN_MODEL_V2.md, EVENT_MODEL.md

---

## 1. Current State: No Boundaries

The current codebase has **zero domain boundaries**. Every API route directly imports `db` from `@/lib/db` and performs arbitrary Prisma queries. The `runMockScan` function in `src/app/api/scans/route.ts` simultaneously handles:
- Scan orchestration
- Vulnerability persistence
- SSE broadcasting
- Email notifications
- Audit logging

This is the classic "Big Ball of Mud" anti-pattern. It works for a prototype but becomes unmanageable as complexity grows.

---

## 2. Target Bounded Contexts

### Context Map

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Identity   │────►│  Workspace   │◄────│   Billing   │
│   Context    │     │  Context     │     │   Context   │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌────────────┐ ┌──────────┐ ┌─────────────┐
     │  Scanning   │ │ Findings │ │ Reporting   │
     │  Context    │ │ Context  │ │ Context     │
     └──────┬─────┘ └────┬─────┘ └─────────────┘
            │            │
            ▼            ▼
     ┌────────────────────────┐
     │   Security State       │
     │   Context              │
     └───────────┬────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
  ┌──────────┐ ┌──────┐ ┌──────────┐
  │ Notifi-  │ │Audit  │ │Integra-  │
  │ cations  │ │Log   │ │tions     │
  └──────────┘ └──────┘ └──────────┘
```

---

## 3. Context Definitions

### 3.1 Identity Context

**Responsibility:** User authentication, registration, session management, and 2FA. This context owns the User entity's identity-related data (credentials, OAuth links, TOTP). It does NOT own workspaces, teams, or any domain data.

**Owned Entities:**
- User (identity data only: email, password, OAuth, 2FA)
- Session (managed by next-auth)

**Dependencies:**
- `Workspace` context — to create personal workspace on registration
- `AuditLog` context — to log auth events

**Public Interfaces:**
```
POST /api/auth/register        → UserRegistered event
POST /api/auth/[...nextauth]   → UserLoginSucceeded / UserLoginFailed events
POST /api/auth/2fa/setup       → TOTP setup
POST /api/auth/2fa/verify      → TOTP verification
POST /api/auth/2fa/disable     → TOTP disable
GET  /api/user                  → Current user profile
PATCH /api/user                 → Update profile
PATCH /api/user/password        → Change password
```

**Events Produced:**
- `UserRegistered`
- `UserLoginSucceeded`
- `UserLoginFailed`
- `TwoFactorEnabled`
- `TwoFactorDisabled`
- `PasswordChanged`

**Events Consumed:**
- (none — this is a leaf context)

**Current Problems:**
- `auth.ts` imports `db` directly and creates/updates User records
- `auth.ts` calls `audit()` directly — should emit events instead
- User preferences (theme, notifications) are in the User model but belong to Workspace context
- `admin-guard.ts` checks `user.role` directly — should be a proper access control service

**Dependencies to Remove:**
- ❌ Direct DB access from auth callbacks → ✅ Emit events, let Workspace context handle side effects
- ❌ Direct audit() calls → ✅ Emit auth events, AuditLog context subscribes

**Implementation Notes:**
- Keep next-auth as the authentication framework — it's well-suited
- Extract auth logic from `auth.ts` into proper service functions
- The Identity context should be the first context to be properly bounded, because it's the simplest and sets the pattern

---

### 3.2 Workspace Context

**Responsibility:** Organizational structure — workspaces, membership, invitations, roles. This is the access control boundary. Every other context asks Workspace "does this user have access to this resource?"

**Owned Entities:**
- Workspace
- WorkspaceMember
- WorkspaceInvite
- ApiKey (workspace-scoped)

**Dependencies:**
- `Identity` context — to verify user existence for invitations
- `AuditLog` context — to log membership changes

**Public Interfaces:**
```
GET    /api/v1/workspaces                    → List user's workspaces
POST   /api/v1/workspaces                    → Create workspace
GET    /api/v1/workspaces/:id                → Get workspace details
PATCH  /api/v1/workspaces/:id                → Update workspace
DELETE /api/v1/workspaces/:id                → Delete workspace

POST   /api/v1/workspaces/:id/members        → Add member
DELETE /api/v1/workspaces/:id/members/:uid   → Remove member
PATCH  /api/v1/workspaces/:id/members/:uid   → Change role

POST   /api/v1/workspaces/:id/invites        → Send invite
GET    /api/v1/invites/:token                → Get invite details
POST   /api/v1/invites/:token/accept         → Accept invite
DELETE /api/v1/invites/:token                → Revoke invite

POST   /api/v1/workspaces/:id/api-keys       → Create API key
GET    /api/v1/workspaces/:id/api-keys       → List API keys
DELETE /api/v1/workspaces/:id/api-keys/:id   → Revoke API key
```

**Events Produced:**
- `WorkspaceCreated`
- `MemberJoined`
- `MemberRemoved`
- `MemberRoleChanged`
- `MemberInvited`
- `InviteAccepted`
- `InviteRevoked`
- `ApiKeyCreated`
- `ApiKeyRevoked`

**Events Consumed:**
- `UserRegistered` — to create personal workspace

**Current Problems:**
- `Team` model conflates workspace and team concepts
- Membership checks are scattered across route handlers (`resolveTeamMembership` in `teams.ts`, manual checks in scan routes)
- No workspace-level access control — scan routes check `userId` directly, not workspace membership
- `ApiKey` is global to user, not scoped to workspace

**Dependencies to Remove:**
- ❌ Scan routes checking `userId` directly → ✅ Check workspace membership via Workspace context
- ❌ ApiKey global to user → ✅ Scope to workspace

---

### 3.3 Scanning Context

**Responsibility:** Everything related to executing a scan. This context owns the scan lifecycle (scheduling, execution, result collection). It does NOT interpret results (that's Findings) and does NOT compute aggregate state (that's Security State).

**Owned Entities:**
- Target
- Scan
- ScanProfile
- FindingScan (junction)

**Dependencies:**
- `Workspace` context — to verify access to target/project
- `Findings` context — to process scan results into findings

**Public Interfaces:**
```
POST   /api/v1/targets                       → Create target
GET    /api/v1/targets                       → List targets (scoped)
GET    /api/v1/targets/:id                   → Get target
PATCH  /api/v1/targets/:id                   → Update target
DELETE /api/v1/targets/:id                   → Remove target
POST   /api/v1/targets/:id/verify            → Verify target reachability

POST   /api/v1/scans                         → Start scan (by target ID)
GET    /api/v1/scans                         → List scans
GET    /api/v1/scans/:id                     → Get scan detail
DELETE /api/v1/scans/:id                     → Cancel scan

GET    /api/v1/scans/events                  → SSE stream (kept from current)
```

**Events Produced:**
- `TargetCreated`
- `TargetUpdated`
- `ScanScheduled`
- `ScanStarted`
- `ScanProgress`
- `ScanCompleted`
- `ScanFailed`

**Events Consumed:**
- (none — this is a producer context)

**Current Problems:**
- No Target entity — scans accept a raw URL string
- Scan route directly creates vulnerabilities in DB (should emit events)
- `runMockScan()` is defined inside the route handler (should be a service)
- Scan profile configuration is hardcoded in the mock engine
- No scan scheduling (no cron-based execution)

**Dependencies to Remove:**
- ❌ Direct vulnerability creation in scan route → ✅ Emit `ScanCompleted` event, Findings context processes it
- ❌ Direct SSE broadcast from scan route → ✅ Event bus handles notification delivery
- ❌ Direct email notification from scan route → ✅ Notification context subscribes to events

---

### 3.4 Findings Context

**Responsibility:** The lifecycle management of security findings. This is where raw scan output becomes actionable intelligence. The Findings context handles deduplication, status transitions (open → confirmed → resolved → regressed), and assignment.

**Owned Entities:**
- Finding
- FindingScan (junction with per-scan evidence)
- FindingComment (future)

**Dependencies:**
- `Scanning` context — consumes `ScanCompleted` to create/update findings
- `Security State` context — triggers recompute on finding changes
- `Workspace` context — to resolve assignees

**Public Interfaces:**
```
GET    /api/v1/findings                      → List findings (filterable)
GET    /api/v1/findings/:id                  → Get finding detail
PATCH  /api/v1/findings/:id                  → Update finding (assign, add note)
POST   /api/v1/findings/:id/resolve          → Resolve finding
POST   /api/v1/findings/:id/dismiss          → Dismiss as false positive
POST   /api/v1/findings/:id/accept-risk      → Accept risk
POST   /api/v1/findings/bulk-resolve         → Resolve multiple findings
```

**Events Produced:**
- `FindingDetected` (new or recurring)
- `FindingResolved`
- `FindingDismissed`
- `FindingRegressed`
- `FindingAssigned`

**Events Consumed:**
- `ScanCompleted` — to create/update findings from scan results

**Current Problems:**
- The `Vulnerability` model has no lifecycle — findings are static per-scan records
- No deduplication — same finding detected in two scans creates two separate records
- No cross-scan tracking — cannot determine if a finding is new, recurring, or resolved
- No assignment workflow — no way to assign a finding to a team member

**Dependencies to Remove:**
- ❌ Vulnerability directly tied to Scan → ✅ Finding is a first-class entity with its own lifecycle

---

### 3.5 Security State Context

**Responsibility:** Compute and expose the security posture of targets, projects, and workspaces. This is a **read-heavy, compute-heavy** context. It consumes events from Findings and Scanning to maintain an up-to-date view of security state.

**Owned Entities:**
- SecurityStateSnapshot (time series)
- SecurityState (current, cached)

**Dependencies:**
- `Findings` context — consumes finding change events
- `Scanning` context — consumes scan events for coverage calculation
- `Workspace` context — to scope computations

**Public Interfaces:**
```
GET    /api/v1/security-state                → Get current state (by scope)
GET    /api/v1/security-state/history        → Get time series data
GET    /api/v1/security-state/compare        → Compare two periods
```

**Events Produced:**
- `SecurityScoreChanged`
- `RiskChanged`

**Events Consumed:**
- `ScanCompleted` — recompute for affected target
- `FindingResolved` — recompute for affected target
- `FindingDismissed` — recompute for affected target
- `FindingRegressed` — recompute for affected target
- `TargetCreated` / `TargetRemoved` — recompute coverage
- `FindingDetected` (if new or regression) — recompute

**Current Problems:**
- No security state entity exists
- Score is computed per-scan only, not aggregated over time
- No trend data, no coverage, no confidence metrics

**Implementation Notes:**
- This context should be the first to use the event bus (consumes events from Scanning and Findings)
- Computation must be asynchronous (background job)
- Current state should be cached in-memory with Redis fallback
- Time-series data requires a storage strategy (see SECURITY_STATE.md)

---

### 3.6 Reporting Context

**Responsibility:** Generate, store, and manage security reports. Reports are point-in-time snapshots — they don't update when findings change.

**Owned Entities:**
- Report
- ReportTemplate (future)

**Dependencies:**
- `Security State` context — to include current metrics in reports
- `Findings` context — to include finding details
- `Workspace` context — for scoping and access control

**Public Interfaces:**
```
POST   /api/v1/reports                      → Generate report
GET    /api/v1/reports                      → List reports
GET    /api/v1/reports/:id                  → Get report
GET    /api/v1/reports/:id/download         → Download file
DELETE /api/v1/reports/:id                  → Delete report
```

**Events Produced:**
- `ReportGenerated`
- `ReportFailed`

**Events Consumed:**
- (none — reports are generated on demand or via schedule)

**Current Problems:**
- PDF generation is embedded in the scan detail route (`/api/scans/[id]/pdf`)
- No report templates — single hardcoded React-PDF template
- No scheduling, no delivery, no storage management
- Report generation blocks the request (should be async)

**Dependencies to Remove:**
- ❌ PDF generation in scan route → ✅ Separate Reporting context with async generation

---

### 3.7 Notification Context

**Responsibility:** Deliver the right information to the right people at the right time through the right channel. This context owns notification preferences, delivery, and tracking.

**Owned Entities:**
- Notification
- NotificationPreference (per-user, per-workspace)
- NotificationRule (custom user-defined rules, future)

**Dependencies:**
- Event bus — subscribes to all events that may trigger notifications
- `Workspace` context — for user preferences and member lookups
- `Identity` context — for user email addresses

**Public Interfaces:**
```
GET    /api/v1/notifications                → List notifications
PATCH  /api/v1/notifications/:id/read       → Mark as read
PATCH  /api/v1/notifications/read-all       → Mark all as read
GET    /api/v1/notification-preferences     → Get preferences
PATCH  /api/v1/notification-preferences     → Update preferences
```

**Events Produced:**
- `NotificationSent`
- `NotificationFailed`

**Events Consumed:**
- `ScanCompleted` — notify user if preferences allow
- `FindingDetected` — notify if critical/high
- `FindingRegressed` — HIGH PRIORITY notification
- `SecurityScoreChanged` — notify if significant change
- `MemberInvited` — invite email
- `ReportGenerated` — report ready notification
- `MemberJoined` — new member notification

**Current Problems:**
- Email notification is embedded in `runMockScan()` via `notifyScanCompleted()`
- Preferences are global boolean flags on User model (not per-workspace, not per-event-type)
- No in-app notification system
- No notification history
- No delivery tracking

**Dependencies to Remove:**
- ❌ Email call from scan route → ✅ Notification context subscribes to `ScanCompleted`
- ❌ Global user preferences → ✅ Per-workspace, per-event-type preferences

---

### 3.8 Billing Context

**Responsibility:** Manage the commercial relationship. Plans, subscriptions, usage tracking, and payment processing.

**Owned Entities:**
- Plan
- Subscription
- UsageRecord
- Invoice (future)

**Dependencies:**
- `Workspace` context — subscription is scoped to workspace
- Event bus — consumes scan events for usage tracking

**Public Interfaces:**
```
GET    /api/v1/billing/plan                 → Current plan
GET    /api/v1/billing/plans                → Available plans
POST   /api/v1/billing/subscribe            → Change plan
POST   /api/v1/billing/portal               → Stripe customer portal
GET    /api/v1/billing/usage                → Current usage
GET    /api/v1/billing/invoices             → Invoice history
```

**Events Produced:**
- `SubscriptionChanged`
- `PaymentSucceeded`
- `PaymentFailed`
- `UsageLimitWarning`
- `UsageLimitReached`

**Events Consumed:**
- `ScanCompleted` — increment usage counter
- `WorkspaceCreated` — create trial subscription
- `TargetCreated` — check plan limits

**Current Problems:**
- `StoreProduct` is a static price list with no actual billing integration
- No subscription lifecycle
- No usage tracking
- Billing tab in UI shows products but "Current plan" button is disabled
- No Stripe (or other payment processor) integration

---

### 3.9 Integrations Context

**Responsibility:** Manage connections to external systems. This context owns integration configuration and event routing to external systems.

**Owned Entities:**
- Integration
- IntegrationEventLog (delivery tracking)

**Dependencies:**
- Event bus — subscribes to events and routes to configured integrations
- `Workspace` context — integrations are workspace-scoped

**Public Interfaces:**
```
GET    /api/v1/integrations                 → List integrations
POST   /api/v1/integrations                 → Create integration
PATCH  /api/v1/integrations/:id             → Update integration
DELETE /api/v1/integrations/:id             → Delete integration
POST   /api/v1/integrations/:id/test        → Test integration
GET    /api/v1/integrations/:id/logs        → Delivery logs
```

**Events Produced:**
- `IntegrationEventDelivered`
- `IntegrationEventFailed`

**Events Consumed:**
- All domain events (configurable per integration)

**Current Problems:**
- No integration system exists
- No webhooks, no Slack, no Jira, no external system connections

---

### 3.10 Audit Log Context

**Responsibility:** Append-only record of security-relevant actions. This is a cross-cutting concern that consumes events from all other contexts.

**Owned Entities:**
- AuditLog (existing, with enhancements)

**Dependencies:**
- Event bus — subscribes to all events

**Public Interfaces:**
```
GET    /api/v1/admin/audit-log              → Query audit log (admin only)
```

**Events Consumed:**
- ALL domain events — every event becomes an audit log entry

**Current Problems:**
- Audit is called directly from route handlers via `audit()` function
- Some events are audited, others are not (inconsistent)
- No structured event correlation
- No admin UI for viewing audit logs (only API endpoint)

**Dependencies to Remove:**
- ❌ Direct `audit()` calls from route handlers → ✅ AuditLog context subscribes to events
- **Caveat:** Keep direct audit calls for auth events (before user is authenticated, events may not be routable)

---

## 4. Cross-Cutting Concerns

### Access Control

Access control is not a bounded context — it's a cross-cutting service used by every context. Currently, access control is implemented ad-hoc in each route handler (check `session.user.id`, check team membership, check admin role).

**Target Architecture:**
```
┌─────────────────────────────────────────────┐
│  Access Control Service                     │
│                                             │
│  Methods:                                   │
│  - canAccess(userId, workspaceId, action)   │
│  - canAccessTarget(userId, targetId, action)│
│  - canAccessProject(userId, projectId, action)│
│  - requireRole(userId, workspaceId, roles)  │
│                                             │
│  Implementation:                            │
│  - Loads workspace membership (cached)      │
│  - Checks role against permission matrix    │
│  - Returns boolean (no side effects)        │
└─────────────────────────────────────────────┘
```

Every API route handler calls the access control service as its first operation. This is enforced by a middleware layer, not by individual route handlers.

### Event Bus

The event bus is also a cross-cutting concern. It connects all bounded contexts without creating direct dependencies between them. See EVENT_MODEL.md for details.

---

## 5. Implementation Priority

| Priority | Context | Rationale |
|----------|---------|-----------|
| 1 | **Scanning** | Already exists in rudimentary form. Needs Target entity and event emission. |
| 2 | **Security State** | Core differentiator. Depends on Scanning and Findings events. |
| 3 | **Findings** | Required for Security State. Needs Finding entity with lifecycle. |
| 4 | **Workspace** | Evolve existing Team into Workspace. Add personal workspace. |
| 5 | **Notification** | Currently embedded in scan flow. Extract and enhance. |
| 6 | **Identity** | Works well enough. Refactor to emit events instead of direct calls. |
| 7 | **Reporting** | Extract from scan route. Add async generation. |
| 8 | **Billing** | No revenue impact until product has more users. |
| 9 | **Integrations** | Nice-to-have for power users. |
| 10 | **Audit Log** | Already works. Convert to event-driven. |

---

## 6. Lead Engineer Concern: Are 10 Bounded Contexts Too Many?

**The concern:** 10 bounded contexts for a product with ~50 users and a single VPS is enterprise-level architecture. It adds directory structure, module boundaries, and cognitive overhead. Is this premature?

**My assessment: The boundaries are real, but the implementation should be lightweight.**

The key insight: **bounded contexts are about logical separation, not physical separation.** In the current codebase, you don't need 10 separate microservices or even 10 separate directories. You need:

1. **Event types defined in one place** (`src/events/`)
2. **Event handlers organized by context** (`src/handlers/scanning.ts`, `src/handlers/findings.ts`)
3. **API routes grouped by context** (already mostly done: `/api/scans/`, `/api/teams/`, `/api/auth/`)
4. **No direct DB access across contexts** — use the event bus or public interfaces

This is ~3-5 days of refactoring, not 3-5 months of microservices migration.

**What I would NOT do:**
- Separate databases per context (overkill for single-VPS deployment)
- Message queues between contexts (in-process event bus is sufficient)
- Separate deployment units (monolith is correct for current scale)
- Context-specific Prisma schemas (shared schema with clear ownership is fine)

**What I WOULD do:**
- Enforce context boundaries in code review ("this route handler shouldn't import from `@/lib/dast`")
- Group files by context in the directory structure
- Use the event bus as the integration mechanism between contexts
- Define clear "owned entities" per context and enforce them

The 10 contexts are a **target state**. The migration path is:
1. Phase 1: Extract events from `runMockScan()` (creates Scanning, Findings, Notification, Security State boundaries)
2. Phase 2: Organize remaining routes by context (Workspace, Identity, Reporting)
3. Phase 3: Add Billing and Integrations as new features (clean implementation from the start)