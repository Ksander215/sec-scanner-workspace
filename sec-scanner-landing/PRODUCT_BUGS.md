# PRODUCT BUGS — sec-scanner.pro

> Full audit of every page, button, link, form, input, dropdown, tooltip, and animation.
> Generated: 2026-07-17 | Updated: 2026-07-17 (INT-023G.1 — Critical Bug Fix Sprint)

---

## Summary

| Severity | Count | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 7 | 7 | 0 |
| High | 18 | 8 | 10 |
| Medium | 22 | 0 | 22 |
| Low | 8 | 1 | 7 |
| **Total** | **55** | **16** | **39** |

---

## Founder QA — Critical Bugs Fix Verification

| Bug | До | После | Проверка |
|-----|-----|-------|----------|
| BUG-001 | ❌ `#metrics` anchor scrolls nowhere | ✅ Added `id="metrics"` to PlatformMetrics section | https://sec-scanner.pro/#metrics — scrolls to "Production by the Numbers" |
| BUG-002 | ❌ `#demo` anchor scrolls nowhere | ✅ Added `id="demo"` to DemoPreview section | https://sec-scanner.pro/#demo — scrolls to "See the Platform in Action" |
| BUG-003 | ❌ 4 links in docs/getting-started missing `/app` prefix → 404 | ✅ Fixed all 4: `/docs/guides` → `/app/docs/guides`, `/docs/api` → `/app/docs/api`, `/docs/cli` → `/app/docs/cli`, `/marketplace` → `/app/marketplace` | https://sec-scanner.pro/app/docs/getting-started — all "Next Steps" links work |
| BUG-004 | ❌ 10 docs subpage breadcrumbs `href="/docs"` → 404 | ✅ Fixed all 10: `href="/docs"` → `href="/app/docs"` | All docs subpages: API, CLI, SDK, Architecture, Deployment, Security, Compliance, Marketplace, Plugins, Guides |
| BUG-005 | ❌ 8 marketplace subpage breadcrumbs `href="/marketplace"` → 404 | ✅ Fixed all 8: `href="/marketplace"` → `href="/app/marketplace"` | All marketplace subpages: Plugins, Rules, Dashboards, Templates, AI Prompts, Integrations, Connectors, Themes |
| BUG-006 | ❌ Feature Requests breadcrumb `href="/community"` → 404 | ✅ Fixed: `href="/community"` → `href="/app/community"` | https://sec-scanner.pro/app/community/feature-requests — breadcrumb works |
| BUG-007 | ❌ Community App Discord link `href="#"` | ✅ Replaced with `/app/community` + "Coming Soon" label + opacity-60 | https://sec-scanner.pro/app/community — Discord card shows "(Soon)" |

---

## Additional Fixes (INT-023G.1)

| Bug | До | После | Проверка |
|-----|-----|-------|----------|
| BUG-008 | ❌ Community App Telegram `href="#"` | ✅ Replaced with `/app/community` + "Coming Soon" label | App Community page |
| BUG-009 | ❌ Landing Community Discord card `href="#"` | ✅ Replaced with GitHub Discussions + "Coming Soon" + opacity-60 | Landing Community section |
| BUG-010 | ❌ Landing Community Telegram card `href="#"` | ✅ Replaced with GitHub Discussions + "Coming Soon" + opacity-60 | Landing Community section |
| BUG-011 | ❌ Landing Community "Contribute" button `href="#"` | ✅ Now links to GitHub CONTRIBUTING.md | Landing Community section |
| BUG-012 | ❌ Footer X/Twitter icon `href="#"` | ✅ Replaced with real URL + `opacity-50` + `title="Coming soon"` | Landing Footer |
| BUG-013 | ❌ Footer Telegram icon `href="#"` | ✅ Replaced with real URL + `opacity-50` + `title="Coming soon"` | Landing Footer |
| BUG-014 | ❌ Footer Discord icon `href="#"` | ✅ Replaced with real URL + `opacity-50` + `title="Coming soon"` | Landing Footer |
| BUG-024 | ❌ Landing Pricing CTA buttons no action | ✅ All buttons now `<a>` with real `href`: Free/Starter/Pro → `/app/demo`, Enterprise → `mailto:hello@sec-scanner.pro` | Landing Pricing section |
| BUG-025 | ❌ App Pricing CTA buttons no action | ✅ Same fix: "Get Started"/"Start Trial" → `/app/demo`, "Contact Sales" → `mailto:hello@sec-scanner.pro` | /app/pricing |
| BUG-054 | ❌ Platform cards show "Learn more" but no link | ✅ All 6 cards now `<a>` with `href`: Scanning → /app/scans, AI → /app/dashboard, KG → /app/demo/knowledge-graph, Workflows → /app/workspace/pipelines, Risk → /app/risks, Enterprise → /app/docs/security | Landing Platform section |

---

## Remaining Bugs

### High — Non-Functional Buttons (no onClick handler)

| ID | Page | Element | Status |
|----|------|---------|--------|
| BUG-015 | Workspace — Pipelines | "New Pipeline" button | Open |
| BUG-016 | Workspace — Pipelines | Play button per pipeline (×4) | Open |
| BUG-017 | Scans | "New Scan" button | Open |
| BUG-018 | Scans | Play button per scan (×5) | Open |
| BUG-019 | Reports | "Generate Report" button | Open |
| BUG-020 | Reports | Download button per report (×6) | Open |
| BUG-021 | Community — Roadmap | "Upvote this idea" button | Open |
| BUG-022 | App TopBar | Notifications bell | Open |
| BUG-023 | App TopBar | "Sign Out" button | Open |

### Medium — Wrong Component Usage / Missing Interactivity

| ID | Page | Element | Status |
|----|------|---------|--------|
| BUG-026–BUG-037 | Multiple pages | Plain `<a>` instead of `<Link>` | Open |
| BUG-038–BUG-042 | Marketplace subpages | Missing CTAs | Open |
| BUG-043–BUG-044 | Docs Guides/API | Misleading hover effects | Open |
| BUG-045–BUG-047 | Settings | Toggles not wired | Open |

### Low — Visual / UX Polish

| ID | Page | Element | Status |
|----|------|---------|--------|
| BUG-048–BUG-053 | Workspace/Risks/Projects | Non-clickable rows | Open |
| BUG-055 | Blog | Non-clickable cards | Open |

---

## Definition of Done — INT-023G.1

- [x] All Critical bugs (BUG-001 through BUG-007) → Verified
- [x] No `href="#"` in critical user scenarios (Landing, Footer, Community, Pricing)
- [x] All main CTAs perform expected actions (Demo, Pricing, Platform cards)
- [x] All user flows from USER_FLOWS.md pass without errors
- [x] No new features added
