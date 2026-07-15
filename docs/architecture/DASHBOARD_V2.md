# DASHBOARD V2 — Next-Generation Dashboard Concept

> **Document Type:** Product Architecture — Dashboard Design
> **Version:** 2.0
> **Status:** Draft
> **Prepared by:** Lead Engineer (TASK-004)
> **Depends on:** DOMAIN_MODEL_V2.md, SECURITY_STATE.md, PRODUCT_VISION_V2.md

---

## 1. Current Dashboard Analysis

### What Exists Now

The current dashboard is a tabbed SPA with five tabs: Scan, History, Teams, API Keys, Billing. The Scan tab has a URL input and a "How it works" card. The History tab shows a flat list of scans. There is no aggregated view, no trends, no persistent state.

**Critical UX Problem:** The first thing a user sees after logging in is... a blank scan form. There is no reason to be here unless the user actively wants to scan something. This is a tool, not a platform.

### Design Principles for V2

1. **Show value immediately.** The first screen should answer "how secure am I right now?" — not prompt for input.
2. **Every number has context.** A score without a trend is meaningless. A finding count without severity breakdown is useless.
3. **Action-oriented.** Every widget should have a clear next action ("3 new findings → View findings", "Score dropped → See what changed").
4. **Progressive disclosure.** Overview first, details on demand. Don't overwhelm with data.
5. **Mobile-adequate.** The dashboard must be usable on a phone (check daily digest on mobile).

---

## 2. Dashboard Layout

### Desktop Layout (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo]  Sec Scanner        [Workspace: Acme Corp ▾]  [🔔] [👤 Alex] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐  ┌────────────────────────────────────────┐  │
│  │                    │  │  Security Score Trend (30d)            │  │
│  │    SECURITY        │  │  ╭─────────────────────────────╮      │  │
│  │    SCORE           │  │  │    ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲        │      │  │
│  │    78/100          │  │  │   ╱                ╲   ╱╲   │      │  │
│  │    ↑ 3 pts         │  │  │  ╱                  ╲ ╱  ╲  │      │  │
│  │    (last week)     │  │  │ ╱                    ╲╱    ╲ │      │  │
│  │                    │  │  │╱                            ╲│      │  │
│  │  Confidence: 85%   │  │  ╰─────────────────────────────╯      │  │
│  └────────────────────┘  │  Jun 1    Jun 15    Jul 1    Jul 14    │  │
│                          └────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ CRITICAL │ │   HIGH   │ │  MEDIUM  │ │   LOW   │ │ COVERAGE │  │
│  │    1     │ │    3     │ │    8     │ │   12    │ │   92%    │  │
│  │    ↓1    │ │    →     │ │    ↓2    │ │    ↓1    │ │   ↑5%    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                      │
│  ┌────────────────────────────┐  ┌──────────────────────────────┐   │
│  │  RECENT CHANGES            │  │  SCHEDULED SCANS             │   │
│  │                            │  │                              │   │
│  │  ⚠ SQL Injection regressed │  │  🟢 api.example.com         │   │
│  │    on staging, 2h ago      │  │     Next: Today 14:00 UTC    │   │
│  │    [View finding →]        │  │  🟢 app.example.com         │   │
│  │                            │  │     Next: Today 18:00 UTC    │   │
│  │  ✅ 3 findings resolved    │  │  🟡 portal.example.com      │   │
│  │    on api, 6h ago          │  │     Next: Tomorrow 06:00 UTC │   │
│  │    [View details →]        │  │                              │   │
│  │                            │  │  [+ Schedule new scan]       │   │
│  │  🆕 New finding detected   │  │                              │   │
│  │    on dashboard, 1d ago    │  │                              │   │
│  │    [View finding →]        │  │                              │   │
│  └────────────────────────────┘  └──────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────┐  ┌──────────────────────────────┐   │
│  │  REGRESSIONS               │  │  TEAM ACTIVITY               │   │
│  │                            │  │                              │   │
│  │  🔴 SQL Injection          │  │  Alex resolved 3 findings    │   │
│  │     api.example.com/login  │  │    6h ago                    │   │
│  │     Regressed 2h ago       │  │  Sam assigned 1 finding      │   │
│  │     [Assign →]             │  │    1d ago                    │   │
│  │                            │  │  Maria viewed report         │   │
│  │  (none others)             │  │    2d ago                    │   │
│  └────────────────────────────┘  └──────────────────────────────┘   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ [Dashboard] [Targets] [Findings] [Scans] [Reports] [Settings]       │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

Stack all widgets vertically. Score gauge at top (full width). Severity cards in 2×2 grid. Recent changes and scheduled scans as collapsible sections. Team activity and regressions accessible via "More" link.

---

## 3. Widget Specifications

### 3.1 Security Score Gauge

**Placement:** Top-left, first thing the user sees.
**Size:** 280×280px (desktop), 200×200px (mobile).
**Content:**
- Large circular gauge with score (0-100)
- Color: Green (80-100), Yellow (50-79), Orange (30-49), Red (0-29)
- Trend arrow and delta: "↑ 3 pts from last week" / "↓ 2 pts from last week" / "→ No change"
- Confidence badge: "85% confidence" (small, below score)
- Click: navigates to Security State detail page

**Interaction:** Hovering shows a tooltip with the score breakdown: "Score impact: -15 (2 high) -10 (8 medium) -5 (12 low)"

**Color palette:**
```
Score 80-100: #10B981 (emerald-500)  — Secure
Score 50-79:  #F59E0B (amber-500)    — Needs Attention
Score 30-49:  #F97316 (orange-500)   — At Risk
Score 0-29:   #EF4444 (red-500)      — Critical
```

### 3.2 Security Score Trend Chart

**Placement:** Top-right, spanning full width.
**Size:** Full remaining width, 200px height.
**Chart type:** Area chart with gradient fill.
**X-axis:** Last 30 days (configurable: 7d, 30d, 90d, 1y).
**Y-axis:** 0-100.
**Features:**
- Gradient fill: green above 80, yellow 50-80, orange 30-50, red below 30
- Data points connected by smooth curve
- Vertical marker for today
- Hover: shows exact score and date
- Click data point: shows what changed (new findings, resolutions, regressions)

**Implementation:** Recharts (already in dependencies via shadcn/ui chart component). Use `<AreaChart>` with `<Gradient>` fill.

### 3.3 Severity Breakdown Cards

**Placement:** Second row, 5 cards.
**Size:** Equal width, ~120px height.
**Content:**
- Severity label (CRITICAL, HIGH, MEDIUM, LOW, COVERAGE)
- Count (large number)
- Trend arrow and delta from comparison period
- Background color: subtle tint of severity color
- Click: filters findings list by this severity

**Interactions:**
- Hover: shows tooltip "3 critical findings across 2 targets"
- Click: navigates to Findings page filtered by severity

### 3.4 Recent Changes

**Placement:** Third row, left column.
**Size:** ~50% width, ~250px height.
**Content:** Last 5 significant changes, newest first.
**Each entry shows:**
- Icon: ⚠ (regression/new finding), ✅ (resolution), 🆕 (new target), 📊 (score change)
- Description: "SQL Injection regressed on staging.example.com"
- Time: "2h ago" / "6h ago" / "1d ago"
- Action link: "[View finding →]" / "[View details →]"
**Click:** navigates to the relevant entity.

### 3.5 Scheduled Scans

**Placement:** Third row, right column.
**Size:** ~50% width, ~250px height.
**Content:**
- List of targets with scheduled scans, ordered by next scan time
- Each entry: target hostname, next scan time, status indicator (🟢 on schedule, 🟡 delayed, 🔴 failed)
- "Schedule new scan" button (navigates to target creation or scan scheduling)

### 3.6 Regressions Panel

**Placement:** Fourth row, left column.
**Size:** ~50% width.
**Content:**
- List of regressed findings, newest first
- Each entry: finding title, target, regression time, [Assign →] button
- If no regressions: green checkmark with "No regressions — all fixes holding"
**Visibility rule:** Always visible. Empty state is a positive signal — show it proudly.

### 3.7 Team Activity

**Placement:** Fourth row, right column.
**Size:** ~50% width.
**Content:**
- Recent workspace member actions: findings resolved, findings assigned, reports viewed, targets added
- Each entry: member name, action, time
- "View all activity" link

### 3.8 Notifications Bell (Header)

**Placement:** Top-right header, always visible.
**Content:**
- Bell icon with unread count badge
- Click: dropdown with last 10 notifications
- Each notification: icon, title, time, [View →] link
- "Mark all as read" button
- "View all notifications" link → full notifications page

---

## 4. Navigation Model

### Current Navigation

Tabs within a single page (SPA anti-pattern). No URL-based navigation. No browser back/forward support.

### V2 Navigation

**Top-level navigation** (sidebar or top bar, based on viewport):
1. **Dashboard** — The screen described above (default landing page)
2. **Targets** — List of all targets with status, last scan, score per target
3. **Findings** — Filterable, sortable list of all findings with lifecycle management
4. **Scans** — Scan history with detail views
5. **Reports** — Generated reports, schedule new reports
6. **Settings** — Workspace settings, members, API keys, integrations, billing

**Secondary navigation** (breadcrumbs, context switches):
- Workspace switcher (top-right header)
- Project filter (sidebar or dropdown)
- Target filter (within Findings/Scans views)

### URL Structure

```
/                                    → Dashboard (default)
/targets                             → Target list
/targets/:id                         → Target detail (score, findings, scans)
/findings                            → Finding list (with filters)
/findings/:id                        → Finding detail (evidence, history, comments)
/scans                               → Scan list
/scans/:id                           → Scan detail
/reports                             → Report list
/reports/:id                         → Report detail/download
/settings                            → Workspace settings
/settings/members                    → Member management
/settings/integrations               → Integration management
/settings/billing                    → Billing & subscription
```

---

## 5. Empty States

The dashboard must handle empty states gracefully — first-time users, workspaces with no targets, periods with no scans.

### First-Time User (No Targets)

```
┌──────────────────────────────────────────┐
│                                          │
│  Welcome to Sec Scanner!                 │
│                                          │
│  Start monitoring your applications by   │
│  adding your first target.               │
│                                          │
│  [Add First Target →]                   │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Or import targets in bulk:              │
│  [Import from CSV]  [Import from URL]   │
│                                          │
└──────────────────────────────────────────┘
```

### Targets Added, No Scans Yet

```
┌──────────────────────────────────────────┐
│  SECURITY SCORE                           │
│  ─────                                    │
│  No data yet                              │
│                                          │
│  Your first scan is scheduled for:       │
│  Today 14:00 UTC                         │
│                                          │
│  [Run scan now →]                       │
└──────────────────────────────────────────┘
```

### No Regressions

```
┌──────────────────────────────────────────┐
│  REGRESSIONS                              │
│  ══════════                               │
│  ✅ No regressions detected              │
│                                          │
│  All previously resolved findings        │
│  are still resolved.                     │
└──────────────────────────────────────────┘
```

---

## 6. Real-Time Updates

### Current Implementation

SSE (Server-Sent Events) for scan status updates. Only pushes `scan-update` events. Frontend invalidates React Query cache on event receipt.

### V2 Implementation

Expand SSE to push all relevant dashboard updates:

**Events pushed via SSE:**
- `scan-update` — scan status changed (existing)
- `score-update` — security score changed (new)
- `finding-update` — new/regressed/resolved finding (new)
- `notification` — new in-app notification (new)

**Frontend behavior:**
- Score gauge: updates in real-time when `score-update` received
- Severity cards: update counts when `finding-update` received
- Recent changes: new item slides in from top when event received
- Notifications bell: badge count updates, dropdown refreshes

**Performance consideration:** Batch SSE events within 2-second windows to avoid excessive re-renders. Use `useTransition` in React for non-urgent updates.

---

## 7. Data Requirements Per Widget

| Widget | API Endpoint | Data Shape | Refresh Strategy |
|--------|-------------|------------|-----------------|
| Score Gauge | `GET /api/v1/security-state?scope=workspace` | `{ securityScore, riskScore, trend, confidence, change }` | SSE push + 5min polling fallback |
| Trend Chart | `GET /api/v1/security-state/history?scope=workspace&period=30d` | `{ points: [{ date, securityScore }] }` | On mount + period change |
| Severity Cards | Same as Score Gauge | `{ findings: { critical, high, medium, low, info } }` | SSE push |
| Recent Changes | `GET /api/v1/activity?limit=5` | `[{ type, description, timestamp, link }]` | SSE push + 30s polling |
| Scheduled Scans | `GET /api/v1/targets?fields=hostname,nextScanAt,scheduleStatus` | `[{ hostname, nextScanAt, status }]` | On mount + 5min polling |
| Regressions | `GET /api/v1/findings?status=regressed&limit=5` | `[{ id, title, target, regressedAt }]` | SSE push + 30s polling |
| Team Activity | `GET /api/v1/activity?type=team&limit=5` | `[{ actor, action, timestamp }]` | SSE push + 1min polling |
| Notifications | `GET /api/v1/notifications?unread=true&limit=10` | `[{ id, type, title, read, createdAt }]` | SSE push |

---

## 8. Performance Budget

| Metric | Target | Rationale |
|--------|--------|-----------|
| Dashboard First Contentful Paint | < 1.5s | Users should see the score within 2 seconds |
| Score Gauge Time to Interactive | < 2s | The primary widget must be interactive fast |
| Full Dashboard Loaded | < 4s | All widgets visible and populated |
| SSE Event Latency | < 3s | Events should appear within 3 seconds of occurrence |
| API Response (any widget) | < 500ms | Backend queries must be fast (indexed, cached) |

### Caching Strategy

- Security State: cached in-memory, invalidated by events
- Finding counts: cached alongside Security State
- Activity feed: cached in-memory with 30s TTL
- Notifications: Redis-backed (future), in-memory for now

---

## 9. Lead Engineer Concern: Dashboard-First Development Risk

**The concern:** The DASHBOARD_V2 document describes a rich, real-time dashboard with 8+ widgets, SSE integration, and multiple API endpoints. But the underlying data model (Target, Finding, Security State) doesn't exist yet. Building the dashboard before the data layer means building against mock data, which creates rework.

**My assessment: The dashboard design is a specification, not an implementation plan.** It should be used as a target to drive API and data model design, not as a UI sprint.

**Recommended approach:**
1. Implement the data model first (DOMAIN_MODEL_V2 entities)
2. Implement the API endpoints (returning real data from the new model)
3. Build the dashboard UI against the real API
4. Add SSE real-time updates last

**However**, I recommend building a **minimal viable dashboard (MVD)** early — just the Score Gauge and Severity Cards — to validate the Security State computation. This gives rapid feedback on whether the score algorithm produces useful numbers, before investing in the full dashboard.

**What NOT to do:**
- Build the full dashboard UI with mock data, then try to connect it to a real backend
- Spend more than 2 weeks on dashboard UI before the data layer exists
- Implement real-time SSE updates before the basic API returns correct data