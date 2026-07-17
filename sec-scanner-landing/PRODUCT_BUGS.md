# PRODUCT BUGS — sec-scanner.pro

> Full audit of every page, button, link, form, input, dropdown, tooltip, and animation.
> Generated: 2026-07-17

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 18 |
| Medium | 22 |
| Low | 8 |
| **Total** | **55** |

---

## Bug List

### Critical — Broken Links (404 / Navigation Failure)

| ID | Page | Element | Severity | Description |
|----|------|---------|----------|-------------|
| BUG-001 | Landing — Header | `#metrics` nav link | Critical | `href="#metrics"` but PlatformMetrics section has no `id="metrics"`. Link scrolls nowhere. |
| BUG-002 | Landing — Header | `#demo` nav link | Critical | `href="#demo"` but DemoPreview section has no `id="demo"`. Link scrolls nowhere. |
| BUG-003 | Docs — Getting Started | 4 "Next Steps" links | Critical | `href="/docs/guides"`, `/docs/api`, `/docs/cli`, `/marketplace` — all missing `/app` prefix, result in 404. |
| BUG-004 | Docs — All 10 subpages | Breadcrumb "Docs" link | Critical | `href="/docs"` in all 10 docs subpage breadcrumbs — missing `/app` prefix, 404. |
| BUG-005 | Marketplace — All 8 subpages | Breadcrumb "Marketplace" link | Critical | `href="/marketplace"` in all 8 marketplace subpage breadcrumbs — missing `/app` prefix, 404. |
| BUG-006 | Community — Feature Requests | Breadcrumb "Community" link | Critical | `href="/community"` — missing `/app` prefix, 404. |
| BUG-007 | Community — App page | Discord link | Critical | `href="#"` — stub, goes nowhere. User expects Discord invite. |

### High — Stub Links / Non-Functional Buttons

| ID | Page | Element | Severity | Description |
|----|------|---------|----------|-------------|
| BUG-008 | Community — App page | Telegram link | High | `href="#"` — stub, goes nowhere. User expects Telegram invite. |
| BUG-009 | Landing — Community | Discord card | High | `href="#"` — stub, no real Discord URL. |
| BUG-010 | Landing — Community | Telegram card | High | `href="#"` — stub, no real Telegram URL. |
| BUG-011 | Landing — Community | "Contribute" button | High | `href="#"` — stub, should link to GitHub contributing page. |
| BUG-012 | Landing — Footer | X/Twitter icon | High | `href="#"` — stub, no real Twitter/X URL. |
| BUG-013 | Landing — Footer | Telegram icon | High | `href="#"` — stub, no real Telegram URL. |
| BUG-014 | Landing — Footer | Discord icon | High | `href="#"` — stub, no real Discord URL. |
| BUG-015 | Workspace — Pipelines | "New Pipeline" button | High | No `onClick` handler — button does nothing. |
| BUG-016 | Workspace — Pipelines | Play button per pipeline (×4) | High | No `onClick` handler — buttons do nothing. |
| BUG-017 | Scans | "New Scan" button | High | No `onClick` handler — button does nothing. |
| BUG-018 | Scans | Play button per scan (×5) | High | No `onClick` handler — buttons do nothing. |
| BUG-019 | Reports | "Generate Report" button | High | No `onClick` handler — button does nothing. |
| BUG-020 | Reports | Download button per report (×6) | High | No `onClick` handler — buttons do nothing. |
| BUG-021 | Community — Roadmap | "Upvote this idea" button | High | No `onClick` handler — button does nothing. |
| BUG-022 | App TopBar | Notifications bell | High | No `onClick` handler — no dropdown or panel appears. |
| BUG-023 | App TopBar | "Sign Out" button | High | No `onClick` handler — does nothing. |
| BUG-024 | Landing — Pricing | All 3 plan CTA buttons | High | "Get Started", "Start Trial", "Contact Sales" — no `onClick`, no `href`. Completely non-functional. |
| BUG-025 | App — Pricing | All 3 plan CTA buttons | High | Same issue as landing pricing — no `onClick`. |

### Medium — Wrong Component Usage / Missing Interactivity

| ID | Page | Element | Severity | Description |
|----|------|---------|----------|-------------|
| BUG-026 | Community — App page | Contributing link | Medium | Uses plain `<a>` instead of Next.js `<Link>` — causes full page reload. |
| BUG-027 | Community — App page | Roadmap link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-028 | Community — App page | Feature Requests link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-029 | Architecture | "Try Demo" link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-030 | Capabilities | "Browse Plugins" link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-031 | Capabilities | "Build Your Own" link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-032 | Marketplace — Plugins | "Read Plugin SDK Docs" link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-033 | Marketplace — Rules | "Rule Writing Guide" link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-034 | Marketplace — Connectors | "Connector SDK Guide" link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-035 | App TopBar | Profile link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-036 | App TopBar | Preferences link | Medium | Uses plain `<a>` instead of `<Link>`. |
| BUG-037 | Docs — Getting Started | 4 "Next Steps" links | Medium | Use plain `<a>` instead of `<Link>` (in addition to wrong URLs). |
| BUG-038 | Marketplace — Dashboards | "Custom Dashboards" section | Medium | Heading + description with NO link/button — dead-end. |
| BUG-039 | Marketplace — Templates | "Create a Template" section | Medium | No link/button — dead-end. |
| BUG-040 | Marketplace — AI Prompts | "Custom AI Prompts" section | Medium | No link/button — dead-end. |
| BUG-041 | Marketplace — Integrations | "Request an Integration" section | Medium | No link/button — dead-end. |
| BUG-042 | Marketplace — Themes | "Create a Theme" section | Medium | No link/button — dead-end. |
| BUG-043 | Docs — Guides | 8 guide cards | Medium | Cards have hover effect suggesting clickability but no `href` — misleading UX. |
| BUG-044 | Docs — API | Endpoint rows | Medium | Hover effect but no action — misleading UX. |
| BUG-045 | Settings — Theme buttons | Dark/Light/System | Medium | 3 theme toggle buttons in Settings page are not connected to `next-themes`. Only the TopBar theme switch actually works. |
| BUG-046 | Settings — Language buttons | RU/EN toggle | Medium | Not connected to any i18n system. Clicking does nothing. |
| BUG-047 | Settings — Sidebar Position | Left/Right toggle | Medium | No state management — clicking does nothing. |

### Low — Visual / UX Polish

| ID | Page | Element | Severity | Description |
|----|------|---------|----------|-------------|
| BUG-048 | Workspace — Assets | Asset rows | Low | Not clickable — no way to drill into asset detail. |
| BUG-049 | Workspace — Jobs | Job rows | Low | Not clickable — no cancel/retry/detail. |
| BUG-050 | Workspace — History | History rows | Low | Not clickable — no re-run/detail view. |
| BUG-051 | Workspace — Monitoring | Monitoring metrics | Low | Not clickable — no refresh or incident drill-down. |
| BUG-052 | Risks | Risk items | Low | Not clickable — no risk detail or remediation action. |
| BUG-053 | Projects | Project cards | Low | Not clickable — no way to enter a project. |
| BUG-054 | Platform | Feature cards | Low | 6 cards with "Learn more" text on hover but no link. |
| BUG-055 | Blog | Blog post cards | Low | Not clickable — no individual post pages exist. |

---

## Pages With Zero Issues

- ✅ Landing — Hero (both CTAs functional)
- ✅ Landing — PlatformMetrics (all 6 cards now clickable)
- ✅ Landing — DemoPreview (screenshot + cards + CTA all functional)
- ✅ App — Dashboard (tabs, AI copilot, all links functional)
- ✅ App — Demo (pipeline, all interactive elements functional)
- ✅ App — Demo — Knowledge Graph (search, filter, nodes all functional)
- ✅ App — Demo — Attack Paths (path selector, edge detail panel functional)
- ✅ App — Marketplace main page (search, sort, categories, install buttons functional)
- ✅ App — Playground (all 5 steps, navigation buttons functional)
- ✅ App — Docs main page (all 11 section cards link correctly)
- ✅ App — Changelog (content-only, no interactive elements needed)
- ✅ App — Legal (all 3 pages: privacy, terms, security — mailto links functional)
- ✅ App — Downloads (link-only page)
- ✅ App — Community — Contributing
- ✅ App — DocsSidebar (all 11 links correct)
- ✅ App — AppSidebar (all 23 links correct)
- ✅ App — Search index (all 55 entries verified)

---

## Recommended Fix Priority

### Phase 1 — Critical (must fix before any demo)

1. **BUG-001, BUG-002**: Add `id="metrics"` to PlatformMetrics, `id="demo"` to DemoPreview
2. **BUG-003**: Fix 4 broken links in docs/getting-started — add `/app` prefix
3. **BUG-004**: Fix 10 breadcrumb links in docs subpages — `/docs` → `/app/docs`
4. **BUG-005**: Fix 8 breadcrumb links in marketplace subpages — `/marketplace` → `/app/marketplace`
5. **BUG-006**: Fix 1 breadcrumb link in feature-requests — `/community` → `/app/community`

### Phase 2 — High (must fix for professional feel)

6. **BUG-007–BUG-014**: Replace all `href="#"` stubs with real URLs or disable with tooltip "Coming soon"
7. **BUG-015–BUG-021**: Add `onClick` handlers (even toast "Demo mode" feedback) to all dead buttons
8. **BUG-022–BUG-023**: Wire notifications bell and sign-out button
9. **BUG-024–BUG-025**: Make pricing CTAs functional (link to signup/demo/contact)

### Phase 3 — Medium (polish)

10. **BUG-026–BUG-037**: Convert all plain `<a>` to Next.js `<Link>` for client-side navigation
11. **BUG-038–BUG-042**: Add CTAs to marketplace subpage dead-end sections
12. **BUG-043–BUG-044**: Remove misleading hover effects on non-clickable cards, or add click handlers
13. **BUG-045–BUG-047**: Wire Settings page toggles to actual state

### Phase 4 — Low (future iteration)

14. **BUG-048–BUG-055**: Add click-through to detail views for workspace, risks, projects, blog
