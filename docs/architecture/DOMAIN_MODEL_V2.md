# DOMAIN MODEL V2 — Sec Scanner Platform

> **Document Type:** Product Architecture — Domain Model
> **Version:** 2.0
> **Status:** Draft
> **Prepared by:** Lead Engineer (TASK-004)
> **Depends on:** TASK-001 (Architecture Audit), TASK-002 (Tech Debt), TASK-003 (Product Architecture v1)

---

## 1. Executive Summary

This document defines the complete domain model for Sec Scanner as a **Continuous Application Security Platform** — not merely a DAST scanner. The model is designed to support the product's evolution over 3-5 years without requiring fundamental restructuring.

The current implementation (10 Prisma models) represents a **flat, scan-centric architecture**. The target architecture introduces a **hierarchical, state-centric model** with clear entity boundaries, ownership chains, and lifecycle management.

**Key architectural shift:** From "scan → vulnerabilities" to "target → continuous security state → findings lifecycle."

---

## 2. Current vs. Target Model Gap Analysis

### Current Database Schema (10 models)

| Model | Purpose | Problem |
|-------|---------|---------|
| `User` | Identity, auth, preferences | Mixed concerns: UX preferences + auth + 2FA in one model |
| `Scan` | Scan execution record | No concept of Target; `target` is just a string field |
| `Vulnerability` | Finding from a single scan | No cross-scan deduplication; no lifecycle (open/closed/accepted) |
| `Team` | Organization unit | Confused with Workspace concept; no hierarchy |
| `TeamMembership` | User↔Team junction | No granular permissions; role is a bare string |
| `TeamInvite` | Pending invitations | Tightly coupled to Team, no workspace context |
| `ApiKey` | Programmatic access | No workspace scoping; global to user |
| `SiteContent` | CMS for landing page | Doesn't belong in security domain at all |
| `StoreProduct` | Billing plans | No Subscription model; no usage tracking |
| `AuditLog` | Security audit trail | Good foundation, but needs event correlation |

### Critical Gaps

1. **No Target entity** — scans are fire-and-forget against a URL string
2. **No Finding lifecycle** — vulnerabilities exist only within a single scan
3. **No Security State** — no aggregated view of security posture over time
4. **No Workspace** — Teams are the only organizational unit, no personal workspace
5. **No Project** — no way to group related targets
6. **No Subscription** — StoreProduct exists but no actual billing relationship
7. **No Notification preferences per context** — global boolean flags only
8. **No Integration model** — no webhooks, no external system connections
9. **No Report template system** — PDF is generated ad-hoc per scan

---

## 3. Domain Entity Catalog

### 3.1 Workspace

**Responsibility:** Top-level organizational container. Every user has at least one personal workspace. Teams are workspaces shared by multiple users. The workspace is the billing boundary, the access control boundary, and the data isolation boundary.

**Lifecycle:**
```
Created (auto on registration) → Active → Suspended (billing) → Deleted (grace period)
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `name` | String | Display name |
| `slug` | String | URL-safe identifier, unique |
| `type` | Enum | `personal` \| `team` |
| `ownerId` | FK → User | Workspace creator/owner |
| `billingPlanId` | FK → Plan | Current billing plan |
| `subscriptionStatus` | Enum | `trialing` \| `active` \| `past_due` \| `canceled` |
| `trialEndsAt` | DateTime? | When trial expires |
| `currentPeriodEndsAt` | DateTime? | Current billing period end |
| `settings` | JSON | Workspace-level configuration (retention, default scan config, notification defaults) |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last modification |

**Relationships:**
- `owner` → User (N:1)
- `members` → WorkspaceMember[] (1:N)
- `invites` → WorkspaceInvite[] (1:N)
- `projects` → Project[] (1:N)
- `apiKeys` → ApiKey[] (1:N, scoped to workspace)
- `integrations` → Integration[] (1:N)
- `subscription` → Subscription (1:1)
- `auditLog` → AuditLog[] (1:N)

**Data Owner:** Workspace owner (with admin delegation)
**Access Control:** Members inherit workspace-level roles, projects may add additional restrictions

**Future Extensions:**
- Workspace-level SSO (SAML/OIDC)
- Workspace-level IP allowlists
- Multi-region data residency
- Workspace templates (pre-configured scan policies, notification channels)
- Child workspaces for enterprise hierarchy

---

### 3.2 User

**Responsibility:** System identity. Authenticates, holds personal preferences, belongs to one or more workspaces. The User model should be as thin as possible — all domain data belongs to Workspace.

**Lifecycle:**
```
Invited (email) → Registered (credentials/OAuth) → Active → Disabled (by admin) → Deleted (anonymized)
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `email` | String | Unique, lowercased |
| `name` | String? | Display name |
| `avatarUrl` | String? | Profile image URL |
| `passwordHash` | String? | Null for OAuth-only users |
| `oauthProvider` | String? | `google` \| `github` \| null |
| `oauthSubject` | String? | Provider-specific user ID |
| `totpSecret` | String? | Encrypted TOTP secret |
| `totpEnabled` | Boolean | Whether 2FA is active |
| `role` | Enum | `user` \| `admin` (system-level, not workspace-level) |
| `lastLoginAt` | DateTime? | Last successful authentication |
| `createdAt` | DateTime | Registration timestamp |
| `updatedAt` | DateTime | Last modification |

**Relationships:**
- `ownedWorkspaces` → Workspace[] (1:N)
- `memberships` → WorkspaceMember[] (1:N)
- `sentInvites` → WorkspaceInvite[] (1:N)
- `personalApiKey` → ApiKey[] (1:N, personal scope)
- `auditEntries` → AuditLog[] (1:N as actor)

**Data Owner:** The user themselves (self-service profile management)
**Access Control:** System admins can disable users; workspace owners can remove from workspace

**Future Extensions:**
- Passkey/WebAuthn support
- Account recovery keys
- User-level API usage analytics
- Federated identity (SCIM provisioning)

---

### 3.3 WorkspaceMember (Membership)

**Responsibility:** Junction entity representing a user's participation in a workspace with a specific role. This is the foundation of the access control model.

**Lifecycle:**
```
Invited → Active → Role Changed → Removed
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `userId` | FK → User | The member |
| `workspaceId` | FK → Workspace | The workspace |
| `role` | Enum | `owner` \| `admin` \| `member` \| `viewer` |
| `joinedAt` | DateTime | When membership became active |
| `invitedBy` | FK → User? | Who invited (null if self-joined) |
| `notificationPreferences` | JSON | Per-workspace notification overrides |

**Role Permissions Matrix:**

| Action | owner | admin | member | viewer |
|--------|-------|-------|--------|--------|
| Manage workspace settings | ✅ | ❌ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ |
| Create/delete projects | ✅ | ✅ | ✅ | ❌ |
| Create/delete targets | ✅ | ✅ | ✅ | ✅ |
| Start scans | ✅ | ✅ | ✅ | ❌ |
| View all findings | ✅ | ✅ | ✅ | ✅ |
| Resolve/dismiss findings | ✅ | ✅ | ✅ | ❌ |
| Manage API keys | ✅ | ✅ | ❌ | ❌ |
| Manage integrations | ✅ | ✅ | ❌ | ❌ |
| Export reports | ✅ | ✅ | ✅ | ✅ |

**Data Owner:** Workspace owner
**Future Extensions:**
- Granular permissions (RBAC with fine-grained scopes)
- Project-level role overrides
- Time-limited access (contractors)
- Mandatory access review periods

---

### 3.4 Project

**Responsibility:** Logical grouping of related targets. A project represents a single application, service, or environment that you want to monitor as a unit. Projects are the primary organizational unit within a workspace.

**Lifecycle:**
```
Created → Active → Archived → Deleted (soft)
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `workspaceId` | FK → Workspace | Parent workspace |
| `name` | String | Display name |
| `description` | String? | Project purpose |
| `slug` | String | URL-safe, unique within workspace |
| `defaultScanProfileId` | FK → ScanProfile? | Default scan configuration |
| `tags` | String[] | User-defined categorization |
| `status` | Enum | `active` \| `archived` |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Relationships:**
- `workspace` → Workspace (N:1)
- `targets` → Target[] (1:N)
- `scanProfiles` → ScanProfile[] (1:N)
- `securityState` → SecurityState (1:1, computed/aggregate)
- `findings` → Finding[] (1:N, via targets)

**Data Owner:** Project creator (within workspace permissions)
**Access Control:** Inherits from workspace; optionally can restrict visibility to subset of members

**Future Extensions:**
- Project-level environment tags (production/staging/dev)
- Project-level SLA targets (max critical findings, min security score)
- Project cloning with target inheritance
- Cross-project comparison views
- Project-level budget allocation

---

### 3.5 Target

**Responsibility:** A specific URL or endpoint to be scanned. The target is the persistent entity that gives continuity to security monitoring. Without Target, every scan is an isolated event. With Target, we can track security posture over time.

**This is the single most important entity missing from the current architecture.**

**Lifecycle:**
```
Added → Verified (DNS/HTTP check) → Active → Paused → Removed
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `projectId` | FK → Project | Parent project |
| `url` | String | The target URL (normalized) |
| `hostname` | String | Extracted hostname for grouping |
| `displayName` | String? | User-friendly label |
| `description` | String? | |
| `scanProfileId` | FK → ScanProfile? | Override project default |
| `scheduleCron` | String? | Cron expression for automatic scans |
| `scheduleTimezone` | String | Default: `UTC` |
| `lastScannedAt` | DateTime? | Most recent scan start |
| `lastSuccessfulScanAt` | DateTime? | Most recent completed scan |
| `verificationStatus` | Enum | `pending` \| `reachable` \| `unreachable` \| `blocked` |
| `tags` | String[] | |
| `isActive` | Boolean | Whether scheduled scans are enabled |
| `metadata` | JSON | Tech fingerprint, headers, certificate info |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Relationships:**
- `project` → Project (N:1)
- `scans` → Scan[] (1:N)
- `findings` → Finding[] (1:N, via scans)
- `securityState` → SecurityState (denormalized, computed from findings)
- `scanProfile` → ScanProfile (N:1)

**Data Owner:** Workspace (via project)
**Access Control:** Same as project

**Why This Matters (Lead Engineer Perspective):**

The absence of Target is the #1 architectural limitation of the current system. Every scan is a fire-and-forget event against a URL string. This means:
- No way to track "has example.com gotten more secure over time?"
- No scheduled scanning (the user must manually re-enter the URL)
- No aggregated security score for a specific application
- No finding deduplication across scans of the same target

Introducing Target is a breaking change that requires a migration strategy, but it unlocks virtually every feature in this roadmap.

---

### 3.6 Scan

**Responsibility:** A single execution of the security scanner against a target. Scans are immutable execution records. The scan itself doesn't hold business state — it produces Findings that feed into the Security State.

**Lifecycle:**
```
Scheduled → Queued → Running → Completed → Archived
                                  ↘ Failed → Retry → Completed
                                  ↘ Cancelled
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `targetId` | FK → Target | The target being scanned |
| `triggeredBy` | FK → User \| `system` | Who/what initiated |
| `triggerType` | Enum | `manual` \| `scheduled` \| `api` \| `ci_cd` |
| `status` | Enum | `queued` \| `running` \| `completed` \| `failed` \| `cancelled` |
| `scanProfileId` | FK → ScanProfile | Configuration used |
| `startedAt` | DateTime | Execution start |
| `completedAt` | DateTime? | Execution end |
| `durationMs` | Int? | Actual duration |
| `score` | Int? | 0-100 (computed from findings) |
| `error` | String? | Failure reason |
| `findingsCount` | Int | Total findings |
| `findingsBySeverity` | JSON | `{ critical: 0, high: 2, medium: 3, low: 1, info: 0 }` |
| `engineVersion` | String | Scanner engine version used |
| `metadata` | JSON | Scan configuration, environment info |
| `createdAt` | DateTime | Record creation |

**Relationships:**
- `target` → Target (N:1)
- `findings` → Finding[] (1:N)
- `triggeringUser` → User (N:1)
- `scanProfile` → ScanProfile (N:1)

**Data Owner:** Workspace (via target → project → workspace)
**Access Control:** Inherited from workspace

**Future Extensions:**
- Incremental scans (only test changed pages)
- Multi-engine scans (DAST + SCA + SAST)
- Scan artifacts (har files, screenshots, network captures)
- Distributed scanning (multiple nodes)
- Scan comparison (diff between two scans)

---

### 3.7 Finding

**Responsibility:** A security issue detected during a scan. Findings are the core business entities of the platform. They have a lifecycle that spans multiple scans — a finding can be first detected, confirmed, resolved, and potentially regress.

**This is the second most important missing entity.** Currently, `Vulnerability` exists only within a single scan. There is no way to track whether a finding persists across scans, was resolved, or regressed.

**Lifecycle:**
```
Detected → Confirmed (appears in 2+ scans) → Accepted (risk acknowledged) → Resolved (no longer detected)
                                                         ↘ Dismissed (false positive)
                                    ↘ Regressed (was resolved, now reappears)
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `targetId` | FK → Target | Where this finding exists |
| `firstSeenAt` | DateTime | First scan that detected it |
| `lastSeenAt` | DateTime | Most recent scan that detected it |
| `lastResolvedAt` | DateTime? | Most recent resolution |
| `resolutionCount` | Int | How many times it's been resolved and regressed |
| `status` | Enum | `open` \| `confirmed` \| `accepted_risk` \| `resolved` \| `dismissed` |
| `severity` | Enum | `info` \| `low` \| `medium` \| `high` \| `critical` |
| `cweId` | String? | CWE classification |
| `owaspCategory` | String? | OWASP category |
| `title` | String | Human-readable title |
| `description` | String | Detailed description |
| `evidence` | String? | Proof of exploitation |
| `location` | String? | URL/path where found |
| `remediation` | String? | Fix guidance |
| `assignedTo` | FK → WorkspaceMember? | Who is responsible for fixing |
| `resolutionNote` | String? | Why it was resolved/dismissed |
| `resolvedBy` | FK → User? | Who resolved it |
| `isFalsePositive` | Boolean | Marked as false positive |
| `confidence` | Float? | 0.0-1.0 scanner confidence |
| `hash` | String | Deterministic hash for deduplication (CWE + location + normalized params) |
| `scanReferences` | FindingScan[] | All scans that detected this finding |
| `metadata` | JSON | Extra data from scanner |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Relationships:**
- `target` → Target (N:1)
- `scanReferences` → FindingScan[] (1:N, junction table)
- `assignedTo` → WorkspaceMember (N:1, nullable)
- `resolvedBy` → User (N:1, nullable)
- `comments` → FindingComment[] (1:N, future)
- `affectedBy` → SecurityState (computed reference)

**Finding Deduplication Strategy:**
A finding is considered the *same issue* across scans if its `hash` matches. The hash is computed from:
- `cweId` (or title if no CWE)
- `location` (normalized URL path, stripped of query params)
- `severity` (must match)

When a new scan detects a finding with a hash that matches an existing open finding:
1. Update `lastSeenAt` on the existing finding
2. Create a `FindingScan` reference
3. If the finding was `resolved`, change status to `regressed` and increment `resolutionCount`
4. If this is the 2nd detection, promote status from `open` to `confirmed`

**Data Owner:** Workspace (via target)
**Access Control:** Workspace members can view; admins+ can resolve/dismiss

---

### 3.8 Vulnerability (Legacy → FindingScan Junction)

**Responsibility (Current):** Raw scan output — a vulnerability detected in a single scan.

**Responsibility (Target Model):** This model becomes `FindingScan` — a junction table recording which scans detected which finding, with per-scan evidence.

**Migration Path:**
1. Create `Finding` and `FindingScan` tables
2. Migrate existing `Vulnerability` records: group by (target, cweId, location) → create `Finding`, link scans via `FindingScan`
3. Deprecate `Vulnerability` model (keep as view for backward compatibility during transition)
4. Remove `Vulnerability` after all consumers migrated

**FindingScan (Junction) Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `findingId` | FK → Finding | The persistent finding |
| `scanId` | FK → Scan | The scan that detected it |
| `evidence` | String? | Scan-specific evidence (may differ between scans) |
| `detectedAt` | DateTime | When this scan found it |

---

### 3.9 Security State

**Responsibility:** The **central computed entity** of the platform. Security State represents the current security posture of a target, project, or workspace at a point in time. It is always derived from findings — never manually set. Security State is what makes this product a *platform* rather than a *scanner*.

> *Detailed design in SECURITY_STATE.md*

**Lifecycle:**
```
Computed (on every scan completion or finding change) → Stored (time-series) → Archived
```

**Aggregation Levels:**
- **Target-level:** Security state of a single URL
- **Project-level:** Aggregated from all targets in a project
- **Workspace-level:** Aggregated from all projects

**Key Metrics (computed automatically):**
| Metric | Type | Description |
|--------|------|-------------|
| `securityScore` | Int (0-100) | Weighted score based on open findings |
| `riskScore` | Int (0-100) | Inverse of security score — higher = worse |
| `trend` | Enum | `improving` \| `stable` \| `declining` \| `unknown` |
| `openFindings` | Int | Total open + confirmed findings |
| `criticalFindings` | Int | Open critical-severity findings |
| `regressionCount` | Int | Findings that regressed since last period |
| `improvementCount` | Int | Findings resolved in last period |
| `coverage` | Float (0-1) | % of targets scanned in last 30 days |
| `confidence` | Float (0-1) | How recent the data is |
| `lastScanAt` | DateTime? | Most recent scan across all targets |
| `computedAt` | DateTime | When this snapshot was calculated |

**Relationships:**
- `target` → Target (1:1, latest)
- `project` → Project (1:1, latest)
- `workspace` → Workspace (1:1, latest)
- `history` → SecurityStateSnapshot[] (1:N, time series)

**Data Owner:** System (computed)
**Access Control:** Same as parent entity

---

### 3.10 Report

**Responsibility:** A shareable, exportable document summarizing security posture. Reports can be generated on-demand or scheduled, at any aggregation level (target, project, workspace). Reports are snapshots in time — they don't update when findings change.

**Lifecycle:**
```
Requested → Generating → Ready → Downloaded → Expired (auto-delete)
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `workspaceId` | FK → Workspace | |
| `scopeType` | Enum | `target` \| `project` \| `workspace` |
| `scopeId` | String | FK to the scoped entity |
| `templateId` | String | Report template used |
| `title` | String | User-defined or auto-generated |
| `status` | Enum | `pending` \| `generating` \| `ready` \| `failed` |
| `format` | Enum | `pdf` \| `html` \| `json` \| `csv` |
| `generatedAt` | DateTime? | |
| `expiresAt` | DateTime? | Auto-cleanup for storage management |
| `fileUrl` | String? | Storage location |
| `fileSize` | Int? | |
| `generatedBy` | FK → User? | |
| `scheduleCron` | String? | For recurring reports |
| `recipients` | String[] | Email addresses for delivery |
| `metadata` | JSON | Snapshot of data used (for auditability) |

**Future Extensions:**
- Custom report templates (WYSIWYG builder)
- Executive summary vs. technical detail toggle
- Compliance-specific templates (SOC2, ISO27001, PCI-DSS)
- Report comparison (current vs. previous period)
- Branded reports (company logo, custom colors)
- Report sharing via public link (with auth)

---

### 3.11 Notification

**Responsibility:** Tracks all notifications sent to users about security-relevant events. Supports multiple channels (in-app, email, Slack, webhook). Notifications respect user and workspace preferences.

**Lifecycle:**
```
Triggered → Queued → Delivered → Read → Archived
                    ↘ Failed → Retry → Delivered
                              ↘ Bounced
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `workspaceId` | FK → Workspace | Context |
| `userId` | FK → User? | Recipient (null for broadcast) |
| `channel` | Enum | `in_app` \| `email` \| `slack` \| `webhook` |
| `type` | Enum | `scan_completed` \| `finding_detected` \| `finding_regressed` \| `score_changed` \| `report_ready` \| `invite_accepted` |
| `title` | String | Notification title |
| `body` | String | Notification body |
| `link` | String? | Deep link to relevant entity |
| `status` | Enum | `pending` \| `sent` \| `delivered` \| `read` \| `failed` |
| `sentAt` | DateTime? | |
| `readAt` | DateTime? | |
| `error` | String? | Delivery failure reason |
| `metadata` | JSON | Event payload that triggered this notification |

**Future Extensions:**
- Digest notifications (daily/weekly summary)
- Smart notification routing (escalate critical findings to Slack immediately, batch low in daily digest)
- User-defined notification rules ("notify me only when critical findings increase on project X")
- Push notifications (mobile app)

---

### 3.12 Integration

**Responsibility:** External system connections that extend platform capabilities. Integrations enable the security platform to participate in the broader development and operations workflow.

**Lifecycle:**
```
Configured → Active → Paused → Deleted
```

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `workspaceId` | FK → Workspace | |
| `type` | Enum | `slack` \| `webhook` \| `jira` \| `github` \| `gitlab` \| `pagerduty` \| `sentry` |
| `name` | String | User-defined label |
| `config` | JSON | Encrypted integration-specific configuration |
| `events` | String[] | Which event types trigger this integration |
| `status` | Enum | `active` \| `paused` \| `error` |
| `lastEventAt` | DateTime? | |
| `lastError` | String? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Event → Integration Routing:**
| Event | Slack | Webhook | Jira | GitHub | PagerDuty |
|-------|-------|---------|------|--------|-----------|
| `FindingDetected` | ✅ (channel msg) | ✅ (POST) | ✅ (create ticket) | ✅ (create issue) | ❌ |
| `FindingRegressed` | ✅ (channel msg) | ✅ (POST) | ✅ (comment/reopen) | ✅ (comment/reopen) | ❌ |
| `CriticalFindingDetected` | ✅ (@channel) | ✅ (POST) | ✅ (high priority) | ❌ | ✅ (alert) |
| `SecurityScoreChanged` | ✅ (if threshold) | ✅ | ❌ | ❌ | ✅ (if low) |
| `ReportGenerated` | ✅ (share link) | ✅ | ❌ | ❌ | ❌ |

**Data Owner:** Workspace admins
**Security Consideration:** Integration configs (API tokens, webhook secrets) must be encrypted at rest. Never log config values.

---

### 3.13 Billing (Subscription + Plan + Usage)

**Responsibility:** Manages the commercial relationship between the platform and workspaces. Currently, `StoreProduct` exists as a static price list. The target model introduces a full subscription lifecycle.

**Entities:**

#### Plan
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `sku` | String | Unique identifier |
| `name` | String | `Free` \| `Pro` \| `Business` \| `Enterprise` |
| `priceCents` | Int | Price per period |
| `period` | Enum | `month` \| `year` |
| `features` | JSON | Feature flags and limits |
| `limits` | JSON | `{ maxTargets, maxScansPerMonth, maxMembers, maxProjects }` |
| `isActive` | Boolean | Whether this plan is available for new subscriptions |

#### Subscription
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `workspaceId` | FK → Workspace | |
| `planId` | FK → Plan | Current plan |
| `status` | Enum | `trialing` \| `active` \| `past_due` \| `canceled` \| `unpaid` |
| `stripeCustomerId` | String? | External billing system ID |
| `stripeSubscriptionId` | String? | |
| `currentPeriodStart` | DateTime | |
| `currentPeriodEnd` | DateTime | |
| `trialEnd` | DateTime? | |
| `canceledAt` | DateTime? | |

#### UsageRecord
| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `workspaceId` | FK → Workspace | |
| `periodStart` | DateTime | Billing period start |
| `periodEnd` | DateTime | Billing period end |
| `scansUsed` | Int | Scans executed this period |
| `targetsCount` | Int | Active targets |
| `membersCount` | Int | Active members |
| `storageUsedBytes` | Int | Reports, artifacts |
| `apiCallsUsed` | Int | API requests |

---

### 3.14 ScanProfile

**Responsibility:** Reusable scan configuration. Allows users to define different scanning policies for different contexts (e.g., aggressive scan for staging, passive for production).

| Field | Type | Description |
|-------|------|-------------|
| `id` | CUID | Primary key |
| `workspaceId` | FK → Workspace | |
| `name` | String | |
| `description` | String? | |
| `isDefault` | Boolean | Workspace default |
| `config` | JSON | Scan engine parameters |
| `scheduleCron` | String? | Default schedule when assigned to target |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Scan Config (JSON):**
```json
{
  "engine": "dast",
  "maxDepth": 3,
  "maxDuration": 300,
  "followRedirects": true,
  "scanScope": ["owasp-top-10", "headers", "tls"],
  "excludedPaths": ["/admin", "/internal"],
  "authentication": {
    "type": "basic",
    "credentials": { "reference": "vault://target-cred-123" }
  },
  "sensitivity": "balanced"
}
```

---

## 4. Entity Relationship Diagram

```
Workspace ──────────────────────────────────────────────────────┐
  │                                                            │
  ├── 1:N ── Project                                           │
  │            │                                               │
  │            ├── 1:N ── Target                                │
  │            │            │                                  │
  │            │            ├── 1:N ── Scan                     │
  │            │            │            │                     │
  │            │            │            └── 1:N ── FindingScan │
  │            │            │                         │        │
  │            │            ├── 1:N ── Finding ◄───────────────┘│
  │            │            │                                  │
  │            │            └── 1:1 ── SecurityState (latest)   │
  │            │                                               │
  │            └── 1:1 ── SecurityState (aggregated)            │
  │                                                            │
  ├── 1:N ── WorkspaceMember ── N:1 ── User                    │
  ├── 1:N ── WorkspaceInvite                                   │
  ├── 1:N ── ApiKey (scoped)                                   │
  ├── 1:N ── Integration                                       │
  ├── 1:N ── Report                                            │
  ├── 1:N ── Notification                                      │
  ├── 1:N ── ScanProfile                                       │
  ├── 1:1 ── Subscription ── N:1 ── Plan                       │
  └── 1:N ── UsageRecord                                       │
                                                               │
User ──────────────────────────────────────────────────────────┘
  └── 1:N ── ApiKey (personal)
```

---

## 5. Fundamental vs. Derived Entities

### Fundamental (require explicit creation)
- **User** — the human actor
- **Workspace** — the organizational boundary
- **Project** — the logical grouping
- **Target** — the thing being monitored
- **ScanProfile** — the scanning policy
- **Plan** — the commercial offering
- **Integration** — the external connection

### Derived (computed from fundamentals)
- **Scan** — created when a scan is triggered against a target
- **Finding** — derived from scan results, with deduplication across scans
- **Security State** — computed from findings at any aggregation level
- **Report** — snapshot of security state + findings at a point in time
- **Notification** — triggered by events on fundamental/derived entities
- **Usage Record** — aggregated from scan/target activity
- **Subscription** — derived from Plan + Workspace commercial decision
- **WorkspaceMember** — derived from User + Workspace + role assignment

---

## 6. Data Ownership & Isolation

### Isolation Boundary: Workspace

All domain data (except User identity) is scoped to a Workspace. This means:
- A user in Workspace A cannot see Workspace B's targets, scans, or findings
- API keys are scoped to a workspace
- Billing is per-workspace
- Integrations are per-workspace

### Cross-Workspace Concerns
- User identity is global (same user can belong to multiple workspaces)
- System-level admin can view audit logs across workspaces
- Future: enterprise parent workspaces can aggregate child workspace data

---

## 7. Lead Engineer Notes

### Architectural Concerns

**1. Target introduction is a breaking change.**

The current `Scan.target` is a bare string. Introducing `Target` as a first-class entity requires:
- Migration: group existing scans by target URL → create Target records
- API: all scan endpoints must accept `targetId` instead of `target` string
- UI: users must create targets before scanning (UX friction)

**Recommendation:** Implement Target in phases:
1. Phase 1: Create Target entity, auto-create on scan if not exists (backward-compatible)
2. Phase 2: Add target management UI, encourage users to manage targets explicitly
3. Phase 3: Require target selection for new scans (breaking change)

**2. Finding deduplication is non-trivial.**

The hash-based approach (CWE + location + severity) will have false positives:
- Same CWE on different parameters of the same URL → same hash, actually different findings
- Same finding with different severity due to scanner version change → different hash, actually same finding

**Recommendation:** Start with a conservative dedup strategy and refine based on real data. Consider ML-based dedup in the future.

**3. Security State computation must be asynchronous.**

Computing security state for a workspace with 100+ targets and 10,000+ findings cannot be synchronous. This requires a background job system (BullMQ, Temporal, or similar).

**Recommendation:** Introduce an event-driven computation pipeline:
- Scan completes → emit `ScanCompleted` event
- Event handler queues `RecomputeSecurityState` job
- Job computes state for target → project → workspace (bottom-up)

**4. The Workspace concept subsumes Team.**

The current `Team` model is essentially a workspace. Renaming it introduces migration complexity but no architectural benefit. Instead, evolve `Team` into `Workspace` by adding the missing fields and relationships.

**Recommendation:** Add a `type` field to Team (`personal` | `team`), rename in code and UI, keep the DB table name for migration simplicity.