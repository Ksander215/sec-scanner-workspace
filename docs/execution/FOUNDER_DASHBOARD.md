# FOUNDER_DASHBOARD.md - Sec Scanner

> **Date:** 2026-07-14
> **Version:** 1.0
> **Type:** Strategic document - Founder Dashboard
> **Owner:** Founder
> **Status:** Active
> **Related documents:** MASTER_EXECUTION_PLAN.md, EXECUTION_BACKLOG.md, SPRINT_01.md, SUCCESS_GATES.md, BLOCKERS.md, PRODUCT_INTELLIGENCE_FRAMEWORK.md

---

## Purpose

One-page executive dashboard. Updated daily during active sprints. Answers 5 questions in 5 minutes.

---

## 1. What Are We Doing Now?

**Current Sprint:** Sprint 01 - Core Product Value
**Sprint Goal:** Deliver real user value - user scans URL, gets real Security Score
**Start Date:** 2026-07-14
**Days Remaining:** 7
**Sprint Status:** IN PROGRESS

### Sprint Progress

| Task | Status | Days | Notes |
|------|--------|------|-------|
| EX-001 Demo Target | Pending | 1 | First task, Day 1 |
| EX-002 DAST Engine | Pending | 3-5 | Critical path, main focus |
| EX-003 Fix Price | Pending | 0.1 | Quick win, do first |
| EX-004 Email Verification | Pending | 0.5 | After EX-002 |
| EX-005 Password Reset | Pending | 0.5 | After EX-002 |

---

## 2. Why Exactly This?

**Strategic Alignment:** Sprint 01 directly targets Gate 0 (Internal Alpha) and creates the core product value - the ability to scan a URL and get a real Security Score. Without this, nothing else matters.

**Business Value:** Every task in Sprint 01 is P0 - blocking for Private Beta. The DAST Engine (EX-002) is the single most important task in the entire project: it transforms Sec Scanner from "infrastructure without value" into "a product that delivers on its promise."

**Alternative Considered:** Starting with Application Layer (architecture cleanup). Rejected because architecture improvements don't create user value and don't bring us closer to the first paying customer.

---

## 3. What Is Blocking Progress?

| Blocker | Severity | Status | Impact |
|---------|----------|--------|--------|
| BLK-002 DAST Engine scope undefined | High | Active | EX-002 cannot start without spec |
| BLK-003 Demo Target not selected | Medium | Active | EX-001 cannot start |
| BLK-001 SMTP not configured | Medium | Active | EX-004/005 blocked |

**Most Critical Blocker:** BLK-002. Resolution: define exact DAST check list before Day 1 coding starts (30 min exercise).

---

## 4. What Is the Expected Effect?

**After Sprint 01 (Jul 20):**
- Product Maturity: 3.7 -> 5.0/10 (core value exists)
- Gate 0: PASSED (Internal Alpha)
- Key metrics: TTFV < 60 sec, Scan Success > 80%, real Score computed

**After Sprint 02 (Jul 27):**
- Product Maturity: 5.0 -> 6.5/10 (beta-ready)
- Gate 1: READY (Private Beta can launch)
- Key metrics: TTFV < 3 min, all 10 blocking items resolved

**After Sprint 03 (Aug 3):**
- WASP > 5 (first real users scanning)
- 10+ beta users, 5+ activated
- First user feedback received

**After Sprint 04 (Aug 10):**
- WASP > 10, WAU > 10
- D7 Retention > 15%
- Go/Pivot/Stop assessment data available

---

## 5. What Decisions Does the Founder Need to Make?

| # | Decision | Type | Urgency | Context |
|---|----------|------|---------|---------|
| 1 | DVWA or OWASP Juice Shop for Demo Target? | Expert | Day 1 | BLK-003. Recommendation: Juice Shop (more modern, better documented) |
| 2 | DAST Engine: which exact checks for v1? | Expert | Day 1 | BLK-002. Recommendation: security headers (6) + form detection + mixed content |
| 3 | SMTP provider choice? | Expert | Day 1 | BLK-001. Recommendation: Resend (free tier, good DX) or Mailgun |
| 4 | Beta outreach: which channels first? | Data-Required | Sprint 03 | PMF Blueprint 8.2 recommends LinkedIn + HN + personal contacts |
| 5 | If D7 Retention < 10% at Sprint 04 end: pivot or persevere? | Interview + Data | Sprint 04 | PMF Blueprint 8.6 defines Go/Pivot/Stop criteria |

---

## Quick Reference: 4-Week Trajectory

```
Week 1 [Sprint 01]:  Build core value (DAST + Demo + Auth)    -> Gate 0
Week 2 [Sprint 02]:  Make it user-ready (Onboarding + Legal + Monitoring) -> Gate 1 Ready
Week 3 [Sprint 03]:  Launch beta, first 10 users, collect feedback -> Gate 1
Week 4 [Sprint 04]:  Iterate, invite 50 users, assess PMF signal -> Gate 2 progress
```

**North Star:** WASP (Weekly Active Scanning Projects)
**Current WASP:** 0 (pre-launch)
**Target WASP (Sprint 04 end):** > 10
**Target WASP (M3):** 50
