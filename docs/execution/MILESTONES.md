# MILESTONES.md - Sec Scanner

> **Date:** 2026-07-14
> **Version:** 1.0
> **Type:** Strategic document - Development Milestones
> **Owner:** CEO
> **Status:** Active
> **Related documents:** MASTER_EXECUTION_PLAN.md, SUCCESS_GATES.md, EXECUTION_BACKLOG.md, SPRINT_01.md, SPRINT_02.md, SPRINT_03.md, SPRINT_04.md

---

## Executive Summary

Six milestones from Internal Alpha to Product-Market Fit Signal. Each milestone maps to Success Gates (SUCCESS_GATES.md) and has explicit criteria, KPI targets, risks, and blocking tasks.

---

## M1: Internal Alpha

**Maps to:** Gate 0 (SUCCESS_GATES.md)
**Target Date:** End of Sprint 01 (Jul 20)
**Sprint:** 01

### Mandatory Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Real DAST engine works (basic HTTP checks) | Pending |
| 2 | Demo Target deployed (one-click demo scan) | Pending |
| 3 | Security Score computed from real data | Pending |
| 4 | Email Verification works | Pending |
| 5 | Password Reset works | Pending |
| 6 | Health Check endpoint exists | Pending (Sprint 02, acceptable delay) |
| 7 | Error pages (404, error.tsx) exist | Pending (Sprint 02, acceptable delay) |

### KPI Targets

| Metric | Target |
|--------|--------|
| Scan Success Rate (internal) | > 90% |
| TTFV (demo) | < 60 sec |
| Security Score from real data | Yes |
| Pricing display correct | Yes |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| DAST Engine takes > 5 days | High | Scope down: skip cookie checks, focus on headers only |
| Demo Target deployment issues | Medium | Use Docker on same VPS, subdomain approach |

### Blocking Tasks

EX-001, EX-002, EX-003, EX-004, EX-005

---

## M2: Private Beta Ready

**Maps to:** Gate 0 complete + Gate 1 ready
**Target Date:** End of Sprint 02 (Jul 27)
**Sprint:** 02

### Mandatory Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Landing Page live and correct | Pending |
| 2 | Registration flow works (email/OAuth) | Pending |
| 3 | Onboarding < 3 min | Pending |
| 4 | First scan gives real value (Score + Explainability) | Pending |
| 5 | Terms of Service published | Pending |
| 6 | Privacy Policy published | Pending |
| 7 | Error tracking (Sentry) | Pending |
| 8 | Health Check endpoint | Pending |

### KPI Targets

| Metric | Target |
|--------|--------|
| WASP | > 1 (at least 1 internal project scanned) |
| TTFV (end-to-end) | < 3 min |
| Scan Success Rate | > 80% |
| All 10 blocking checklist items | Ready |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Onboarding takes > 5 min | High | Simplify to 2 steps if 3-step fails |
| Legal pages not ready | Medium | Use standard SaaS templates, minimal customization |

### Blocking Tasks

EX-006, EX-007, EX-008, EX-009, EX-010, EX-011

---

## M3: Closed Alpha (First 10 Users)

**Maps to:** Gate 1 (Private Beta Launch)
**Target Date:** End of Sprint 03 (Aug 3)
**Sprint:** 03

### Mandatory Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | 10+ beta users registered | Pending |
| 2 | 5+ users activated (completed first scan) | Pending |
| 3 | WASP > 5 | Pending |
| 4 | Activation Rate > 10% | Pending |
| 5 | Zero critical production bugs | Pending |
| 6 | Feedback mechanism active | Pending |
| 7 | Daily monitoring established | Pending |

### KPI Targets

| Metric | Target |
|--------|--------|
| WASP | > 5 |
| Activation Rate | > 10% |
| Scan Success Rate | > 85% |
| NPS (first responses) | > 0 |
| D1 Retention | > 30% |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Zero response to outreach | High | Try alternative channels: HN Show HN, Reddit r/netsec, Dev.to article |
| Users register but don't activate | High | Trigger email sequence (EX-013). Improve onboarding based on data. |
| Critical bug in production | Medium | Sentry alerts. < 24h fix commitment. |

### Blocking Tasks

EX-012, EX-013, EX-014, EX-015

---

## M4: Private Beta (50 Invited)

**Maps to:** Gate 2 progress
**Target Date:** End of Sprint 04 (Aug 10)
**Sprint:** 04

### Mandatory Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | 50+ users invited | Pending |
| 2 | 20+ registered | Pending |
| 3 | 10+ weekly active | Pending |
| 4 | WASP > 10 | Pending |
| 5 | D7 Retention > 15% | Pending |
| 6 | 3+ user interviews completed | Pending |
| 7 | Top 3 complaints identified | Pending |

### KPI Targets

| Metric | Target |
|--------|--------|
| WASP | > 10 |
| WAU | > 10 |
| D7 Retention | > 15% |
| NPS | > 10 |
| Email Digest open rate | N/A (not implemented yet) |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| D7 Retention < 10% | High | Conduct 5+ exit interviews. Consider onboarding or value prop changes. |
| No repeat scans | High | This is the #1 PMF risk. If users don't rescan, product has no stickiness. |
| Activation < 5% | High | Onboarding redesign. Consider simplifying further or adding guided tour. |

---

## M5: First Paying Customer

**Maps to:** Gate 4 (SUCCESS_GATES.md)
**Target Date:** M2-3 (Sep-Oct 2026)
**Sprint:** Post-04

### Mandatory Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | First real payment via Stripe | Pending |
| 2 | Paying user completed 3+ scans | Pending |
| 3 | MRR > $29 | Pending |
| 4 | Free -> Paid conversion > 0 | Pending |

### KPI Targets

| Metric | Target |
|--------|--------|
| MRR | > $29 |
| Paying WASP | > 1 |
| D7 Retention (paying) | > 30% |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No one upgrades | High | Ensure Free tier limits are real blockers. Test pricing with beta users. |
| Stripe integration issues | Medium | Implement early (EX-017), test with real payment. |

---

## M6: Product-Market Fit Signal

**Maps to:** Gate 5 (SUCCESS_GATES.md)
**Target Date:** M6 (Jan 2027)
**Sprint:** Long-term

### Mandatory Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | MRR > $2,000 | Pending |
| 2 | Paying Customers > 30 | Pending |
| 3 | Monthly Churn < 10% | Pending |
| 4 | NRR > 85% | Pending |
| 5 | WASP > 80 | Pending |
| 6 | D30 Retention > 18% | Pending |
| 7 | NPS > 40 | Pending |
| 8 | 3+ unsolicited testimonials | Pending |
| 9 | 2+ users scanned 10+ times | Pending |
| 10 | Sean Ellis Test > 40% "very disappointed" | Pending |

### KPI Targets

See SUCCESS_GATES.md Gate 5 and KPI_CATALOG.md M6 targets.

### Risks

The primary risk is that PMF is not achieved. If at M3 (Oct 2026) metrics show no signal (Activation < 5%, D7 < 10%, 0 repeat scans), a strategic pivot must be considered per PMF Blueprint 8.6.
