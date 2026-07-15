# EXECUTION_BACKLOG.md - Sec Scanner

> **Date:** 2026-07-14
> **Version:** 1.0
> **Type:** Operational document - Unified Backlog
> **Owner:** CTO
> **Status:** Active
> **Related documents:** MASTER_EXECUTION_PLAN.md, SPRINT_01.md, SPRINT_02.md, SPRINT_03.md, SPRINT_04.md, DEPENDENCY_MAP.md

---

## Executive Summary

Unified backlog of all engineering tasks. 25 items total: 16 in Sprints 01-04, 9 in Backlog. Every item has measurable business value, KPI success criterion, and ROI estimate.

Items are sourced from: PRIVATE_BETA_ROADMAP (ROADMAP-001..020), PRIVATE_BETA_CHECKLIST (B1..B10), PLATFORM_AUDIT recommendations, PRODUCT_MARKET_FIT_BLUEPRINT roadmap (items 1-30). Duplicates merged. Architecture debt (Application Layer, Domain Events, Ports & Adapters) deferred to post-beta per CTO assessment.

---

## Active Tasks (Sprint 01-04)

### EPIC-01: Core Product Value (Sprint 01)

#### EX-001: Demo Target Deployment
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-01 Core Product Value |
| **Description** | Deploy OWASP Juice Shop on subdomain. Add "Try Demo Scan" button. Results processed through Security State Engine + Explainability Layer. |
| **User Value** | User sees real Security Score with real explanations in one click |
| **Business Impact** | 10/10 - impossible to demo product without this |
| **Engineering Complexity** | 3/10 - ~1 day |
| **ROI** | 3.3 |
| **KPI Success** | TTFV for demo scan < 60 sec. Score computed from real vulnerabilities. |
| **Dependencies** | None |
| **Risk** | Low. Juice Shop is well-documented. |
| **Priority** | P0 |
| **Sprint** | 01 |
| **Sources** | ROADMAP-001, PMF #2, Checklist B1 |

#### EX-002: Basic Real DAST Engine
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-01 Core Product Value |
| **Description** | HTTP-based security checks: security headers (CSP, HSTS, X-Frame-Options), cookie attributes, mixed content, open redirects, form fields detection, directory listing. No spidering/XSS/SQLi - basic checks only. Results fed to Security State Engine. |
| **User Value** | User scans their own URL and gets real Security Score |
| **Business Impact** | 10/10 - product core, zero value without it |
| **Engineering Complexity** | 7/10 - 3-5 days |
| **ROI** | 1.4 |
| **KPI Success** | User enters URL, gets real Score. Scan success rate > 80%. P95 scan duration < 60 sec. |
| **Dependencies** | None |
| **Risk** | High. Accuracy unknown. Mitigation: validate against known vulnerable targets. |
| **Priority** | P0 |
| **Sprint** | 01 |
| **Sources** | ROADMAP-002, PMF #4, Checklist B1 |

#### EX-003: Fix Pricing Display
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-01 Core Product Value |
| **Description** | Update StoreProduct seed data: Pro $29, Team $79, Business $199. Verify landing page shows correct prices. |
| **User Value** | Users see correct pricing |
| **Business Impact** | 7/10 - wrong price creates trust issues |
| **Engineering Complexity** | 1/10 - 15 min |
| **ROI** | 7.0 |
| **KPI Success** | Landing pricing section shows $29 / $79 / $199 |
| **Dependencies** | None |
| **Risk** | Low |
| **Priority** | P0 |
| **Sprint** | 01 |
| **Sources** | ROADMAP-008 |

### EPIC-02: User Authentication Security (Sprint 01)

#### EX-004: Email Verification
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-02 Auth Security |
| **Description** | Send verification email with token on registration. Block product access until verified. Token expires in 24h. |
| **User Value** | Account security, email deliverability |
| **Business Impact** | 6/10 - prevents spam registrations, protects reputation |
| **Engineering Complexity** | 2/10 - 4-6 hours |
| **ROI** | 3.0 |
| **KPI Success** | Registration without verified email = redirect to "check email" page. After click = full access. |
| **Dependencies** | SMTP configured (or graceful degradation to console) |
| **Risk** | Low |
| **Priority** | P0 |
| **Sprint** | 01 |
| **Sources** | ROADMAP-003, Checklist B2 |

#### EX-005: Password Reset
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-02 Auth Security |
| **Description** | POST /api/auth/forgot-password (generate token, send email). POST /api/auth/reset-password (verify token, update password). Token expires in 1h. |
| **User Value** | Users who forget password can recover access |
| **Business Impact** | 7/10 - forgotten password = lost user = negative review |
| **Engineering Complexity** | 2/10 - 4-6 hours |
| **ROI** | 3.5 |
| **KPI Success** | User clicks "Forgot password" -> enters email -> receives email -> resets -> logs in. |
| **Dependencies** | SMTP |
| **Risk** | Low |
| **Priority** | P0 |
| **Sprint** | 01 |
| **Sources** | ROADMAP-004, Checklist B3 |

### EPIC-03: Production Readiness (Sprint 02)

#### EX-006: Onboarding Wizard (3 Steps)
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-03 Beta Readiness |
| **Description** | 3-step wizard post-registration: (1) Welcome message + "Try Demo" CTA. (2) Auto-scan Demo Target, show Score + Explainability. (3) "Now scan your site" - URL input -> scan -> result. Progressive disclosure: hide unused tabs until first scan. |
| **User Value** | Clear path from registration to first value in < 3 min |
| **Business Impact** | 8/10 - directly impacts Activation Rate |
| **Engineering Complexity** | 5/10 - 1-2 days |
| **ROI** | 1.6 |
| **KPI Success** | New user completes wizard in < 3 min. Activation Rate > 10% (target 12%). |
| **Dependencies** | EX-001 (Demo Target), EX-002 (DAST Engine) |
| **Risk** | Medium. TTFV depends on DAST Engine performance. |
| **Priority** | P0 |
| **Sprint** | 02 |
| **Sources** | ROADMAP-005, PMF #5, Checklist B4 |

#### EX-007: Health Check + Error Pages + Error Tracking
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-03 Beta Readiness |
| **Description** | (1) /api/health - DB check, uptime, version, last scan. (2) not-found.tsx - branded 404. (3) error.tsx - error boundary with recovery. (4) Sentry free tier integration. |
| **User Value** | Stable experience, errors are visible to team |
| **Business Impact** | 6/10 - production stability |
| **Engineering Complexity** | 3/10 - 4-8 hours |
| **ROI** | 2.0 |
| **KPI Success** | /api/health returns 200. 404/error pages branded. Production errors visible in Sentry. |
| **Dependencies** | None |
| **Risk** | Low |
| **Priority** | P0 |
| **Sprint** | 02 |
| **Sources** | ROADMAP-006, Checklist B8-B10 |

#### EX-008: Terms of Service + User Guide + Feedback
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-03 Beta Readiness |
| **Description** | (1) /terms page - minimal SaaS ToS template. (2) 1-page "Getting Started" guide (Register -> Scan -> Read Report). (3) Feedback button in navbar - links to Google Form. |
| **User Value** | Legal clarity, know how to use product, can give feedback |
| **Business Impact** | 7/10 - legal compliance + user support |
| **Engineering Complexity** | 3/10 - 1 day |
| **ROI** | 2.3 |
| **KPI Success** | /terms exists. User Guide accessible from dashboard. Feedback button visible and functional. |
| **Dependencies** | None |
| **Risk** | Low |
| **Priority** | P0 |
| **Sprint** | 02 |
| **Sources** | ROADMAP-007, Checklist B5-B7 |

#### EX-009: Privacy Policy Review
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-03 Beta Readiness |
| **Description** | Replace placeholder Privacy Policy with standard SaaS template covering data processing, retention, user rights. |
| **User Value** | Legal transparency |
| **Business Impact** | 5/10 - GDPR basic compliance |
| **Engineering Complexity** | 2/10 - 2-4 hours |
| **ROI** | 2.5 |
| **KPI Success** | /privacy page has full legal text |
| **Dependencies** | None |
| **Risk** | Low |
| **Priority** | P1 |
| **Sprint** | 02 |
| **Sources** | ROADMAP-010, Checklist 5.5 |

#### EX-010: Analytics Integration (PostHog)
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-03 Beta Readiness |
| **Description** | PostHog free tier (< 1M events). Track: registration, first scan, scan completion, dashboard views, feedback clicks, onboarding steps. |
| **User Value** | Indirect - better product through data |
| **Business Impact** | 8/10 - without analytics, beta is blind |
| **Engineering Complexity** | 2/10 - 2-4 hours |
| **ROI** | 4.0 |
| **KPI Success** | Registration, scan, and dashboard events tracked. PostHog dashboard shows real-time users. |
| **Dependencies** | None |
| **Risk** | Low |
| **Priority** | P1 |
| **Sprint** | 02 |
| **Sources** | ROADMAP-009, Checklist 7.4 |

#### EX-011: Uptime Monitoring
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-03 Beta Readiness |
| **Description** | UptimeRobot free tier. Ping /api/health every minute. Alert on email/Telegram for downtime. |
| **User Value** | Indirect - product availability |
| **Business Impact** | 5/10 - know when product is down |
| **Engineering Complexity** | 1/10 - 30 min |
| **ROI** | 5.0 |
| **KPI Success** | UptimeRobot monitoring active. Alert received on test downtime. |
| **Dependencies** | EX-007 (Health Check) |
| **Risk** | Low |
| **Priority** | P1 |
| **Sprint** | 02 |
| **Sources** | ROADMAP-013, Checklist 7.3 |

### EPIC-04: Launch & Learning (Sprint 03-04)

#### EX-012: End-to-End Testing + Landing Verification
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-04 Launch |
| **Description** | Manual E2E test: signup -> email verify -> onboarding -> demo scan -> real scan -> score view -> PDF export -> logout -> password reset -> login. Fix all discovered bugs. Verify landing page renders correctly. |
| **User Value** | Smooth experience for first beta users |
| **Business Impact** | 9/10 - broken beta = wasted outreach |
| **Engineering Complexity** | 3/10 - 1 day |
| **ROI** | 3.0 |
| **KPI Success** | Full E2E flow passes without errors. Zero critical bugs. |
| **Dependencies** | EX-001 through EX-011 |
| **Risk** | Medium. Unknown bugs may be discovered. |
| **Priority** | P0 |
| **Sprint** | 03 |
| **Sources** | PROD-001, PMF Blueprint |

#### EX-013: Welcome Email Sequence
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-04 Launch |
| **Description** | Email 1 (immediate): Welcome + Getting Started link. Email 2 (24h): "You haven't scanned yet - here's how". Email 3 (7d): "How is Sec Scanner? Feedback link". |
| **User Value** | Guided experience, know what to do next |
| **Business Impact** | 5/10 - improves activation and return rate |
| **Engineering Complexity** | 2/10 - 2-4 hours |
| **ROI** | 2.5 |
| **KPI Success** | 3 emails sent at correct intervals. Open rate tracked. |
| **Dependencies** | SMTP, EX-004 (Email Verification) |
| **Risk** | Low |
| **Priority** | P1 |
| **Sprint** | 03 |
| **Sources** | ROADMAP-012 |

#### EX-014: Beta User Outreach (First 10)
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-04 Launch |
| **Description** | Send 50+ personalized messages to qualified CTOs (LinkedIn, HN, personal contacts). Goal: 10 first beta users in week 1. Track: outreach sent, responses, signups, activated. |
| **User Value** | N/A - acquisition |
| **Business Impact** | 10/10 - no users = no beta |
| **Engineering Complexity** | 1/10 - non-engineering (Founder task) |
| **ROI** | 10.0 (if successful) |
| **KPI Success** | 10 beta users registered, 5+ activated (completed first scan) |
| **Dependencies** | All Sprint 01-02 tasks done |
| **Risk** | Medium. Response rate unknown. |
| **Priority** | P0 |
| **Sprint** | 03 |
| **Sources** | PMF Blueprint 8.1-8.2 |

#### EX-015: User Feedback Collection + NPS
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-04 Launch |
| **Description** | (1) In-app micro-survey after 3rd scan: "Was this result useful? (1-5)". (2) NPS survey after 14 days: "Would you recommend Sec Scanner? (0-10)". (3) Structured feedback capture in WEEKLY_REVIEW_TEMPLATE. |
| **User Value** | Voice heard, product improves |
| **Business Impact** | 7/10 - feedback drives product decisions |
| **Engineering Complexity** | 3/10 - 1 day |
| **ROI** | 2.3 |
| **KPI Success** | Micro-survey response rate > 20%. NPS collected from 5+ users. |
| **Dependencies** | EX-010 (Analytics) |
| **Risk** | Low |
| **Priority** | P1 |
| **Sprint** | 03 |
| **Sources** | PMF Blueprint 8.5, KPI_CATALOG NPS |

#### EX-016: Beta Week 2-3: Monitor + Fix + Iterate
| Attribute | Value |
|-----------|-------|
| **Epic** | EPIC-04 Launch |
| **Description** | Daily: review Sentry errors, PostHog analytics, feedback. Fix critical bugs within 24h. Onboarding adjustments based on drop-off data. Invite remaining 40 beta users. |
| **User Value** | Product improves based on real usage |
| **Business Impact** | 8/10 - iteration is how PMF is found |
| **Engineering Complexity** | 4/10 - ongoing |
| **ROI** | N/A - core activity |
| **KPI Success** | WASP > 5. D7 retention > 15%. Critical bugs fixed < 24h. 3+ user interviews completed. |
| **Dependencies** | EX-014 (First users) |
| **Risk** | Medium. Unknown feedback patterns. |
| **Priority** | P0 |
| **Sprint** | 04 |
| **Sources** | PMF Blueprint 8.6-8.7, SUCCESS_GATES Gate 1-2 |

---

## Backlog (Post Sprint 04)

| ID | Task | Priority | BV | EC | ROI | Sprint | Dependency | Source |
|----|------|----------|----|----|-----|--------|-------------|--------|
| EX-017 | Stripe Billing Integration | P0 | 10 | 5 | 2.0 | Post-04 | Gate 2 | PMF #6, ROADMAP-014 |
| EX-018 | Enhanced DAST Engine (spidering, XSS/SQLi) | P1 | 9 | 7 | 1.3 | Post-04 | EX-002, beta accuracy feedback | ROADMAP-015 |
| EX-019 | Email Digest (Weekly Security Posture) | P1 | 8 | 4 | 2.0 | Post-04 | EX-016, users with 2+ scans | PMF #7, ROADMAP-016 |
| EX-020 | Regression Alerts (Score drop notification) | P1 | 7 | 3 | 2.3 | Post-04 | EX-002, 2+ scans per target | ROADMAP-017 |
| EX-021 | Application Layer (ScanService, SecurityStateService) | P1 | 6 | 7 | 0.9 | Post-04 | Gate 2 | PLATFORM_AUDIT 7.1 |
| EX-022 | CI/CD Pipeline (GitHub Actions) | P1 | 6 | 3 | 2.0 | Post-04 | None | ROADMAP-019 |
| EX-023 | GitHub OAuth | P0 | 8 | 2 | 4.0 | Post-04 | None | PMF #3 |
| EX-024 | Transparent Accuracy Benchmark | P1 | 7 | 3 | 2.3 | Post-04 | EX-002, EX-018 | PMF #8 |
| EX-025 | PostgreSQL Migration | P2 | 7 | 8 | 0.9 | M6+ | > 100 concurrent | PMF #21, ROADMAP-020 |

---

## Priority Distribution

| Priority | Count | In Sprint | In Backlog |
|----------|-------|-----------|------------|
| P0 | 10 | 10 | 0 |
| P1 | 10 | 6 | 4 |
| P2 | 4 | 0 | 4 |
| P3 | 0 | 0 | 0 |
| P4 | 1 | 0 | 1 |
