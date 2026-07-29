# CHANGELOG_PRODUCT.md — SIP Product Changelog

> Auto-maintained. Each entry corresponds to a feature change verified in production.

---

## [INT-038] — 2026-07-21

### Platform Audit, Feature Registry & Product Intelligence

**Added:**
- Feature Registry (`/src/data/feature-registry.json`) — single source of truth for all platform features
- Feature Registry helper library (`/src/lib/feature-registry.ts`) — computed readiness, compliance, matrix
- Platform Status Center (`/app/platform-status`) — overall readiness, per-category breakdown, functional matrix
- Developer Overlay (`/app/debug/features`) — per-page feature status for administrators
- AIS Feature Registry integration — AIS Guide tab shows page compliance status
- Platform Status sidebar entry — accessible from sidebar navigation
- PRODUCT_AUDIT.md — comprehensive product audit with defect tracking

**Fixed:**
- Removed green overline labels from 7 landing page sections (Platform, Pricing, Community, Trust, HowItWorks, Comparison, ApproachComparison)
- Removed "Live" badge from Knowledge Graph and Attack Paths demo pages
- Added DemoBadge to 6 pages showing fake data without disclaimer (Cloud, Workspace/Monitoring, History, Jobs, Assets, Community/Roadmap)
- Deleted orphaned GuideAssistant component
- Made BusinessResult "configured" conditional on Notifications and API Keys pages (only shows when items exist)
- Made BusinessResult "report_ready" conditional on Reports page (only shows when findings exist)
- Made BusinessResult "organized" conditional on Projects page (only shows when projects exist)
- Made BusinessResult "risks_known" conditional on Findings and Risks pages
- Made BusinessResult "connected" conditional on Integrations page

**Defects Registered:**
- AUD-001 through AUD-014 — mock data and in-progress features tracked

---

## [INT-036] — 2026-07-20

### Adaptive Intelligence System (AIS) — Full Implementation

**Added:**
- AIS Engine with 16 modules (memory, sound, confidence, context-predictor, goals, role detection)
- AIS Assistant — floating button + side panel with Guide, Goal, Confidence tabs
- SOLO LEVELING notification system with glow, sound, animation
- Smart Scroll Navigator
- Role-based dashboard adaptation
- Personal Goal Card with progress tracking
- Company Progress indicator
- Context prediction system
- 150+ AIS i18n keys (RU/EN)

---

## [INT-033] — 2026-07-18

### Smart Scroll Navigator

**Added:**
- Scroll-aware navigation indicator
- AIS integration for contextual tips
- Section-based scroll tracking

---

## [INT-030] — 2026-07-15

### Business UX Layer

**Added:**
- Contextual Help component
- Business Result component
- Executive Summary component
- Section FAQ component
- Smart Next Step component
- Visual Flow component
- Demo Badge component
- Term Tooltip component
- Why Important component
- What Changed component
