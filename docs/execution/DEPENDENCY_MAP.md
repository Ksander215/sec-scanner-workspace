# DEPENDENCY_MAP.md - Sec Scanner

> **Date:** 2026-07-14
> **Version:** 1.0
> **Type:** Operational document - Dependency Map
> **Owner:** CTO
> **Status:** Active
> **Related documents:** MASTER_EXECUTION_PLAN.md, EXECUTION_BACKLOG.md, SPRINT_01.md, SPRINT_02.md, SPRINT_03.md, SPRINT_04.md

---

## Executive Summary

Task dependency map for EXEC-001. Critical path identified: EX-002 (DAST Engine) is the longest task and gates most downstream work. All 25 tasks mapped with dependencies.

---

## Dependency Graph (Text)

```
Sprint 01:
  EX-001 (Demo Target) ─────────────────────┐
  EX-002 (DAST Engine) ─────────────────────┤
  EX-003 (Fix Price) ── (no deps)           │
  EX-004 (Email Verification) ── (no deps)   │
  EX-005 (Password Reset) ── (no deps)       │

Sprint 02:
  EX-006 (Onboarding) ─── depends on EX-001, EX-002
  EX-007 (Health/Errors) ── (no deps)
  EX-008 (ToS/Guide/Feedback) ── (no deps)
  EX-009 (Privacy Policy) ── (no deps)
  EX-010 (Analytics) ── (no deps)
  EX-011 (Uptime Monitor) ── depends on EX-007

Sprint 03:
  EX-012 (E2E Testing) ── depends on ALL Sprint 01-02 tasks
  EX-013 (Welcome Emails) ── depends on EX-004
  EX-014 (Outreach) ── depends on ALL Sprint 01-02 tasks
  EX-015 (Feedback/NPS) ── depends on EX-010

Sprint 04:
  EX-016 (Monitor/Fix/Iterate) ── depends on EX-014

Backlog:
  EX-017 (Stripe) ── depends on Gate 2
  EX-018 (Enhanced DAST) ── depends on EX-002 + beta accuracy feedback
  EX-019 (Email Digest) ── depends on EX-016 + users with 2+ scans
  EX-020 (Regression Alerts) ── depends on EX-002 + 2+ scans per target
  EX-021 (Application Layer) ── depends on Gate 2
  EX-022 (CI/CD) ── (no deps)
  EX-023 (GitHub OAuth) ── (no deps)
  EX-024 (Accuracy Benchmark) ── depends on EX-002 + EX-018
  EX-025 (PostgreSQL) ── depends on > 100 concurrent users
```

---

## Critical Path

```
EX-002 (DAST Engine, 3-5 days)
  |
  v
EX-006 (Onboarding, 1-2 days)
  |
  v
EX-012 (E2E Testing, 1 day)
  |
  v
EX-014 (Outreach + First Users, ongoing)
  |
  v
EX-016 (Monitor + Iterate, ongoing)
```

**Critical path length:** ~10-12 days of the 28-day plan (Sprint 01-04).

**Key insight:** EX-002 (DAST Engine) is the single biggest risk to the timeline. If it takes > 5 days, the entire plan shifts. Mitigation: start with the most minimal viable checks (security headers only), expand in subsequent sprints.

---

## Parallelizable Tasks

Tasks that CAN run in parallel within a sprint:

**Sprint 01:**
- EX-001 (Demo Target) || EX-003 (Fix Price) || EX-004 (Email) || EX-005 (Password Reset) - all independent
- EX-002 (DAST Engine) is the main focus but doesn't block EX-003/004/005

**Sprint 02:**
- EX-007 (Health/Errors) || EX-008 (ToS/Guide) || EX-009 (Privacy) || EX-010 (Analytics) - all independent
- EX-006 (Onboarding) must wait for EX-001/002
- EX-011 (Uptime) depends on EX-007

**Sprint 03:**
- EX-013 (Welcome Emails) || EX-015 (Feedback/NPS) - can run in parallel
- EX-012 (E2E) and EX-014 (Outreach) are sequential (test first, then launch)

---

## Blockers Table

| Task Blocked | Blocking Task | Sprint | Impact if Delayed |
|-------------|---------------|--------|-------------------|
| EX-006 (Onboarding) | EX-001, EX-002 | 01 -> 02 | Sprint 02 goal at risk |
| EX-011 (Uptime) | EX-007 (Health Check) | 02 | Low - can defer |
| EX-012 (E2E Testing) | ALL Sprint 01-02 | 02 -> 03 | Sprint 03 launch at risk |
| EX-014 (Outreach) | ALL Sprint 01-02 | 02 -> 03 | No users without launch readiness |
| EX-015 (Feedback/NPS) | EX-010 (Analytics) | 02 -> 03 | Can collect feedback manually |
| EX-016 (Iterate) | EX-014 (Users) | 03 -> 04 | No data without users |
