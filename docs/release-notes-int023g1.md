# RELEASE NOTES — INT-023G.1

**Critical Bug Fix Sprint** | Date: 2026-07-17

---

## Summary

Fixed all 7 Critical bugs and 9 High-priority bugs found during INT-023G Product Stabilization audit. No new features added. All 5 critical user flows now pass without errors.

---

## Critical Fixes (7/7)

### BUG-001, BUG-002 — Landing Navigation Anchors
- **Problem:** `#metrics` and `#demo` anchor links in header scrolled nowhere
- **Fix:** Added `id="metrics"` to `<section>` in PlatformMetrics.tsx and `id="demo"` to DemoPreview.tsx
- **Files:** `PlatformMetrics.tsx`, `DemoPreview.tsx`

### BUG-003 — Docs Getting Started Broken Links
- **Problem:** 4 "Next Steps" links missing `/app` prefix → 404
- **Fix:** `/docs/guides` → `/app/docs/guides`, `/docs/api` → `/app/docs/api`, `/docs/cli` → `/app/docs/cli`, `/marketplace` → `/app/marketplace`
- **Files:** `docs/getting-started/page.tsx`

### BUG-004 — Docs Breadcrumbs (10 pages)
- **Problem:** All 10 docs subpages breadcrumb `href="/docs"` → 404
- **Fix:** Changed to `href="/app/docs"` across all docs subpages
- **Files:** 10 docs subpage files

### BUG-005 — Marketplace Breadcrumbs (8 pages)
- **Problem:** All 8 marketplace subpages breadcrumb `href="/marketplace"` → 404
- **Fix:** Changed to `href="/app/marketplace"` across all marketplace subpages
- **Files:** 8 marketplace subpage files

### BUG-006 — Community Breadcrumbs
- **Problem:** Feature Requests and Contributing breadcrumbs `href="/community"` → 404
- **Fix:** Changed to `href="/app/community"`
- **Files:** `community/feature-requests/page.tsx`, `community/contributing/page.tsx`

### BUG-007 — Community Discord Link
- **Problem:** `href="#"` stub, goes nowhere
- **Fix:** Replaced with `/app/community` + "Coming Soon" label + reduced opacity
- **Files:** `Community.tsx`, `community/page.tsx`

---

## High-Priority Fixes (9 additional)

- **BUG-008–BUG-010:** Community Telegram/Discord stubs → replaced with "Coming Soon" links to `/app/community`
- **BUG-011:** Community "Contribute" → now links to GitHub CONTRIBUTING.md
- **BUG-012–BUG-014:** Footer social icons `href="#"` → replaced with real URLs + `opacity-50` + "Coming soon" title
- **BUG-024–BUG-025:** Landing & App Pricing CTA buttons → converted from `<button>` to `<a>` with real `href` (Free/Trial → `/app/demo`, Enterprise → `mailto:hello@sec-scanner.pro`)
- **BUG-054:** Platform feature cards → converted from `<div>` to `<a>` with links to corresponding pages

---

## Other Changes

- **Landing:** Added Pricing section between Demo and Community
- **Marketplace:** Install button now shows "Installed ✓" state after click, reverts on second click

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/sections/PlatformMetrics.tsx` | Added `id="metrics"` |
| `src/components/sections/DemoPreview.tsx` | Added `id="demo"` |
| `src/components/sections/Platform.tsx` | Cards → `<a>` with `href` |
| `src/components/sections/Pricing.tsx` | Buttons → `<a>` with `ctaHref` |
| `src/components/sections/Community.tsx` | Removed `href="#"`, added "Coming Soon" |
| `src/components/sections/Footer.tsx` | Removed `href="#"`, added "Coming Soon" |
| `src/app/page.tsx` | Added Pricing section |
| `src/app/(app)/app/pricing/page.tsx` | Buttons → `<a>` with `ctaHref` |
| `src/app/(app)/app/community/page.tsx` | Removed `href="#"` |
| `src/app/(app)/app/marketplace/page.tsx` | Added `installed` state |
| `src/app/(app)/app/docs/*/page.tsx` (10 files) | Fixed breadcrumbs |
| `src/app/(app)/app/marketplace/*/page.tsx` (8 files) | Fixed breadcrumbs |
| `src/app/(app)/app/community/*/page.tsx` (2 files) | Fixed breadcrumbs |
| `src/app/(app)/app/docs/getting-started/page.tsx` | Fixed 4 content links |

---

## Remaining Work (INT-023G.2+)

- 10 High bugs: non-functional buttons (Workspace, Scans, Reports, TopBar)
- 22 Medium bugs: `<a>` → `<Link>` conversions, Settings wiring, missing CTAs
- 7 Low bugs: non-clickable rows in workspace/risks/projects
