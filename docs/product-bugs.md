# PRODUCT BUGS — sec-scanner.pro

> Full audit of every page, button, link, form, input, dropdown, tooltip, and animation.
> Generated: 2026-07-17 | Updated: 2026-07-17 (Founder QA Round 1)

---

## Bug Status Flow

```
OPEN → FIXED → SELF VERIFIED → FOUNDER VERIFIED → CLOSED
```

| Status | Meaning |
|--------|---------|
| OPEN | Bug exists, not yet fixed |
| FIXED | Code change applied |
| SELF VERIFIED | Developer verified fix works locally |
| FOUNDER VERIFIED | Founder QA personally verified the fix |
| CLOSED | No further action needed |

---

## Summary

| Severity | Count | Fixed | Founder Verified | Remaining |
|----------|-------|-------|-----------------|-----------|
| Critical | 7 | 7 | 7 | 0 |
| High | 18 | 18 | 9 | 0 |
| Medium | 23 | 8 | 0 | 15 |
| Low | 8 | 1 | 0 | 7 |
| **Total** | **56** | **34** | **16** | **22** |

---

## Critical Bugs — ALL FOUNDER VERIFIED ✅

| Bug | До | После | Status | Founder QA |
|-----|-----|-------|--------|------------|
| BUG-001 | ❌ `#metrics` anchor scrolls nowhere | ✅ `id="metrics"` on PlatformMetrics section | FOUNDER VERIFIED | Founder QA passed. `#metrics` scrolls to "Production by the Numbers" |
| BUG-002 | ❌ `#demo` anchor scrolls nowhere | ✅ `id="demo"` on DemoPreview section | FOUNDER VERIFIED | Founder QA passed. `#demo` scrolls to "See the Platform in Action" |
| BUG-003 | ❌ 4 links in docs/getting-started missing `/app` prefix → 404 | ✅ All 4 fixed: `/docs/guides` → `/app/docs/guides`, etc. | FOUNDER VERIFIED | Founder QA passed. All "Next Steps" links resolve correctly |
| BUG-004 | ❌ 10 docs subpage breadcrumbs `href="/docs"` → 404 | ✅ All 10: `href="/docs"` → `href="/app/docs"` | FOUNDER VERIFIED | Founder QA passed. All docs breadcrumbs work |
| BUG-005 | ❌ 8 marketplace subpage breadcrumbs `href="/marketplace"` → 404 | ✅ All 8: `href="/marketplace"` → `href="/app/marketplace"` | FOUNDER VERIFIED | Founder QA passed. All marketplace breadcrumbs work |
| BUG-006 | ❌ Feature Requests breadcrumb `href="/community"` → 404 | ✅ `href="/community"` → `href="/app/community"` | FOUNDER VERIFIED | Founder QA passed. Breadcrumb navigates correctly |
| BUG-007 | ❌ Community App Discord `href="#"` | ✅ Replaced with GitHub Discussions + "Coming Soon" + opacity-60 | FOUNDER VERIFIED | Founder QA passed. No `href="#"` anywhere |

---

## Additional Fixes (INT-023G.1) — FOUNDER VERIFIED ✅

| Bug | До | После | Status | Founder QA |
|-----|-----|-------|--------|------------|
| BUG-008 | ❌ Community App Telegram `href="#"` | ✅ Replaced with GitHub Discussions + "Coming Soon" | FOUNDER VERIFIED | Founder QA passed. |
| BUG-009 | ❌ Landing Community Discord `href="#"` | ✅ GitHub Discussions + "Coming Soon" + opacity-60 | FOUNDER VERIFIED | Founder QA passed. |
| BUG-010 | ❌ Landing Community Telegram `href="#"` | ✅ GitHub Discussions + "Coming Soon" + opacity-60 | FOUNDER VERIFIED | Founder QA passed. |
| BUG-011 | ❌ Landing Community "Contribute" `href="#"` | ✅ Links to GitHub CONTRIBUTING.md | FOUNDER VERIFIED | Founder QA passed. |
| BUG-012 | ❌ Footer X/Twitter `href="#"` | ✅ Real URL + opacity-50 + title="Coming soon" | FOUNDER VERIFIED | Founder QA passed. |
| BUG-013 | ❌ Footer Telegram `href="#"` | ✅ Real URL + opacity-50 + title="Coming soon" | FOUNDER VERIFIED | Founder QA passed. |
| BUG-014 | ❌ Footer Discord `href="#"` | ✅ Real URL + opacity-50 + title="Coming soon" | FOUNDER VERIFIED | Founder QA passed. |
| BUG-024 | ❌ Landing Pricing CTA buttons no action | ✅ All `<a>` with real href: Free/Starter/Pro → `/app/demo`, Enterprise → `mailto:hello@sec-scanner.pro` | FOUNDER VERIFIED | Founder QA passed. All 4 CTAs perform actions. |
| BUG-025 | ❌ App Pricing CTA buttons no action | ✅ Same: Community/Team → `/app/demo`, Enterprise → `mailto:hello@sec-scanner.pro` | FOUNDER VERIFIED | Founder QA passed. |
| BUG-054 | ❌ Platform cards show "Learn more" but no link | ✅ All 6 cards `<motion.a>` with href | FOUNDER VERIFIED | Founder QA passed. All cards clickable. |

---

## Remaining Bugs — OPEN

### High — Non-Functional Buttons (now FIXED)

| ID | Page | Element | Status | Fix Description |
|----|------|---------|--------|-----------------|
| BUG-015 | Workspace → Pipelines | "New Pipeline" button | FIXED | onClick shows info panel about next release |
| BUG-016 | Workspace → Pipelines | Play button per pipeline (×4) | FIXED | onClick simulates 3s run with spinner + status change |
| BUG-017 | Scans | "New Scan" button | FIXED | onClick shows info panel with link to demo |
| BUG-018 | Scans | Play button per scan (×5) | FIXED | onClick simulates 3s re-run with spinner |
| BUG-019 | Reports | "Generate Report" button | FIXED | onClick simulates 2.5s generation with progress indicator |
| BUG-020 | Reports | Download button per report (×6) | FIXED | onClick simulates 1.5s download with checkmark |
| BUG-021 | Community → Roadmap | "Upvote this idea" button | FIXED | onClick toggles upvote state, updates count |
| BUG-022 | App TopBar | Notifications bell | FIXED | onClick opens dropdown with empty state message |
| BUG-023 | App TopBar | "Sign Out" button | FIXED | onClick redirects to /app/demo |

### Medium — Wrong Component Usage / Missing Interactivity

| ID | Page | Element | Status | Founder QA Note |
|----|------|---------|--------|-----------------|
| BUG-026 | Hero | Primary CTA uses `<a>` not `<Link>` | OPEN | Works but no client-side navigation |
| BUG-027 | Hero | Secondary CTA uses `<a>` not `<Link>` | OPEN | External link, acceptable |
| BUG-028 | Dashboard | Internal links use `<a>` not `<Link>` | OPEN | Works but no client-side navigation |
| BUG-029–BUG-037 | Multiple pages | Plain `<a>` instead of `<Link>` | OPEN | Works but no client-side navigation |
| BUG-038–BUG-042 | Marketplace subpages | Missing CTAs | OPEN | Subpages have content but no action buttons |
| BUG-043 | Docs → Guides | Misleading hover effects | OPEN | Cards look clickable but aren't |
| BUG-044 | Docs → API | Misleading hover effects | OPEN | Cards look clickable but aren't |
| BUG-045 | Settings | Theme/Sidebar/2FA/API Key not wired | FIXED | Theme → useTheme(), Sidebar → useState, 2FA → toggle, API Key → simulated generation |
| BUG-046 | Settings | Language toggle not wired | FIXED | Wired to useI18n() |
| BUG-047 | Settings | Notification toggles not wired | FIXED | All 4 toggles wired with useState |
| BUG-056 | Playground → Export | PDF/SARIF/JSON buttons no onClick | FIXED | Simulated export with 1.5s spinner + "Ready" state |

### Low — Visual / UX Polish

| ID | Page | Element | Status | Founder QA Note |
|----|------|---------|--------|-----------------|
| BUG-048 | Workspace → Assets | Rows non-clickable | OPEN | Expected in demo |
| BUG-049 | Workspace → History | Rows non-clickable | OPEN | Expected in demo |
| BUG-050 | Workspace → Jobs | Rows non-clickable | OPEN | Expected in demo |
| BUG-051 | Risks | Rows non-clickable | OPEN | Expected in demo |
| BUG-052 | Projects | Cards non-clickable | OPEN | Expected in demo |
| BUG-053 | Findings | Table rows non-clickable | OPEN | Expected in demo |
| BUG-055 | Blog | Cards non-clickable (no detail pages) | OPEN | No blog detail routes exist |

---

## Founder QA Round 1 Results

### Landing Page: Founder QA passed.

| Section | Verdict | Details |
|---------|---------|---------|
| Header Nav | ✅ | All 4 anchors + Dashboard + Docs + GitHub + "Open Platform" work |
| Hero CTA | ✅ | Primary → `/app/demo`, Secondary → GitHub |
| Platform Cards | ✅ | All 6 cards clickable with correct href |
| Metrics Cards | ✅ | All 6 clickable, external links open in new tab |
| Demo Preview | ✅ | Screenshot + 4 cards + CTA all link to `/app/demo` or subpages |
| Community | ✅ | All 6 cards + 2 banner buttons functional, "Coming Soon" labeled |
| Footer | ✅ | All links valid, no `href="#"`, socials with "Coming soon" |
| Pricing | ✅ | All 4 CTAs: 3 → `/app/demo`, 1 → `mailto:` |

### Dashboard: Founder QA passed.

| Section | Verdict | Details |
|---------|---------|---------|
| Load Demo Data | ✅ | onClick triggers pipeline animation |
| Severity Filter | ✅ | onClick filters findings |
| AI Copilot | ✅ | Chat input + submit work |
| Cards | ✅ | Visual data renders correctly |
| Links | ✅ | Knowledge Graph + Attack Paths links work |

### Marketplace: Founder QA passed.

| Section | Verdict | Details |
|---------|---------|---------|
| Search | ✅ | Filters by name, description, tags |
| Category Filter | ✅ | All 9 tabs work |
| Sort | ✅ | Popular / Top Rated toggle |
| Install | ✅ | Simulated install with 1.5s delay, state toggle |
| Cards | ✅ | All data renders (rating, installs, version, license) |

### Docs: Founder QA passed.

| Section | Verdict | Details |
|---------|---------|---------|
| Sidebar | ✅ | All 11 links use `<Link>`, active state works |
| Breadcrumbs | ✅ | All fixed, no broken links |
| Getting Started | ✅ | 4 "Next Steps" links all resolve |
| Internal Links | ✅ | All `/app/...` prefixed correctly |

### Knowledge Graph: Founder QA passed.

| Section | Verdict | Details |
|---------|---------|---------|
| Search | ✅ | Filters nodes by opacity |
| Filter | ✅ | 7 filter buttons work |
| Hover | ✅ | CSS transitions |
| Node Click | ✅ | Detail panel with connections |
| Legend | ✅ | 7 node types + 3 edge types |
| Controls | ✅ | Zoom, MiniMap, drag |

### Attack Paths: Founder QA passed.

| Section | Verdict | Details |
|---------|---------|---------|
| Path Selection | ✅ | 3 paths, onClick switches |
| CVE | ✅ | Detail panel shows CVE tags |
| MITRE | ✅ | Detail panel shows technique tags |
| Probability | ✅ | Bar + percentage |
| Business Risk | ✅ | Text + CVSS + Time to Compromise |
| Edge Click | ✅ | Detail panel opens/closes |

### Playground: Automated verification passed.

| Section | Verdict | Details |
|---------|---------|---------|
| Upload | ✅ | onClick triggers simulated processing |
| Pipeline | ✅ | 8 stages, navigation buttons work |
| Graph | ✅ | Stats + "Open Full Graph" link |
| Risk | ✅ | Score + attack paths + "View" links |
| Export | ⚠️ | PDF/SARIF/JSON buttons visual only (BUG-056) |

### Responsive: Automated verification passed.

| Section | Verdict | Details |
|---------|---------|---------|
| Desktop | ✅ | Sidebar visible, layout correct |
| Tablet | ✅ | Grid breakpoints, sidebar collapsible |
| Mobile | ✅ | Hamburger menu, responsive grids |

---

## Verified Routes (All Exist)

| Route | Page Exists | Links Work |
|-------|------------|------------|
| `/` | ✅ | ✅ |
| `/app` | ✅ | ✅ |
| `/app/dashboard` | ✅ | ✅ |
| `/app/workspace` | ✅ | ✅ |
| `/app/workspace/assets` | ✅ | ✅ |
| `/app/workspace/pipelines` | ✅ | ⚠️ (BUG-015, BUG-016) |
| `/app/workspace/history` | ✅ | ✅ |
| `/app/workspace/jobs` | ✅ | ✅ |
| `/app/workspace/monitoring` | ✅ | ✅ |
| `/app/projects` | ✅ | ✅ |
| `/app/scans` | ✅ | ⚠️ (BUG-017, BUG-018) |
| `/app/findings` | ✅ | ✅ |
| `/app/risks` | ✅ | ✅ |
| `/app/reports` | ✅ | ⚠️ (BUG-019, BUG-020) |
| `/app/marketplace` | ✅ | ✅ |
| `/app/marketplace/*` (8 subpages) | ✅ | ✅ |
| `/app/playground` | ✅ | ⚠️ (BUG-056) |
| `/app/docs` | ✅ | ✅ |
| `/app/docs/*` (11 subpages) | ✅ | ✅ |
| `/app/community` | ✅ | ✅ |
| `/app/community/roadmap` | ✅ | ⚠️ (BUG-021) |
| `/app/community/feature-requests` | ✅ | ✅ |
| `/app/community/contributing` | ✅ | ✅ |
| `/app/pricing` | ✅ | ✅ |
| `/app/demo` | ✅ | ✅ |
| `/app/demo/knowledge-graph` | ✅ | ✅ |
| `/app/demo/attack-paths` | ✅ | ✅ |
| `/app/settings` | ✅ | ⚠️ (BUG-045, 046, 047) |
| `/app/blog` | ✅ | ⚠️ (BUG-055) |
| `/app/legal/privacy` | ✅ | ✅ |
| `/app/legal/terms` | ✅ | ✅ |
| `/app/legal/security` | ✅ | ✅ |

---

## href="#" Audit — CLEAN ✅

No remaining `href="#"` stubs found on the entire site.

---

## New Bugs Discovered (Founder QA Round 1)

| ID | Severity | Page | Element | Description |
|----|----------|------|---------|-------------|
| BUG-056 | Medium | Playground → Export | PDF/SARIF/JSON format buttons | Buttons render but have no onClick handler. User cannot download reports. |
