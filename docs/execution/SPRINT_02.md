# SPRINT_02.md - Sec Scanner

> **Date:** 2026-07-14
> **Version:** 1.0
> **Type:** Operational document - Execution Plan
> **Owner:** CTO
> **Status:** Active
> **Related documents:** MASTER_EXECUTION_PLAN.md, EXECUTION_BACKLOG.md, SUCCESS_GATES.md, PRODUCT_INTELLIGENCE_FRAMEWORK.md

---

## Sprint 02: Beta Readiness

**Duration:** 7 days (Jul 21-27)
**Target Gate:** Gate 0 -> Gate 1 (Private Beta)

### Sprint Goal

Make the product ready for external beta users: stable, documented, observable

### Tasks

- EX-006: Onboarding Wizard (3 Steps)
- EX-007: Health Check + Error Pages + Sentry
- EX-008: ToS + User Guide + Feedback Button
- EX-009: Privacy Policy Review
- EX-010: Analytics (PostHog)
- EX-011: Uptime Monitoring

### Key Results

- 3-step onboarding wizard functional (Welcome -> Demo Scan -> Your Scan)
- Progressive disclosure: unused tabs hidden until first scan
- /api/health returns 200 with DB status and uptime
- Branded 404 and error pages
- Sentry captures production errors
- /terms and /privacy pages published
- Getting Started guide accessible from dashboard
- Feedback button links to Google Form
- PostHog tracks registration, scan, dashboard events
- UptimeRobot monitors /api/health with alerts

### Completion Criteria

New user completes onboarding in < 3 min. All 10 blocking checklist items resolved. Product is observable (Sentry, UptimeRobot, PostHog). Legal pages published.

### KPI Targets

TTFV (end-to-end, registration to score) < 3 min. Onboarding completion rate > 80% (of those who start). All 10 blocking checklist items = Ready.

### Day-by-Day Plan

```
Day 1-2: EX-006 (Onboarding Wizard) - requires EX-001/002 from Sprint 01
Day 3: EX-007 (Health Check + Error Pages + Sentry)
Day 4: EX-008 (ToS + Guide + Feedback) + EX-009 (Privacy Policy)
Day 5: EX-010 (PostHog) + EX-011 (Uptime Monitoring)
Day 6: End-to-end testing (create test user, full flow)
Day 7: Bug fixes, polish, Sprint 02 demo
```

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| DAST Engine accuracy insufficient | Medium | High | Start with basic HTTP checks. Iterate based on beta feedback. Full DAST deferred to post-beta. |
| Onboarding TTFV > 3 min | Medium | High | Progressive disclosure. Demo scan is pre-configured. Real scan is optional first step. |
| Low beta signup rate | Medium | High | Increase outreach volume. Try alternative channels (HN Show HN post, Reddit). |
| Production bugs during beta | Medium | Medium | Daily monitoring. Sentry alerts. Critical fixes < 24h. |

### Dependencies

All tasks in Sprint 02 depend on Sprint 01 being complete (for num > 1, all prior sprints done).

Intra-sprint dependencies are documented in EXECUTION_BACKLOG.md and DEPENDENCY_MAP.md.
