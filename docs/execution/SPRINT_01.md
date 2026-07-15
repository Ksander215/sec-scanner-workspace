# SPRINT_01.md - Sec Scanner

> **Date:** 2026-07-14
> **Version:** 1.0
> **Type:** Operational document - Execution Plan
> **Owner:** CTO
> **Status:** Active
> **Related documents:** MASTER_EXECUTION_PLAN.md, EXECUTION_BACKLOG.md, SUCCESS_GATES.md, PRODUCT_INTELLIGENCE_FRAMEWORK.md

---

## Sprint 01: Core Product Value

**Duration:** 7 days (Jul 14-20)
**Target Gate:** Gate 0 (Internal Alpha)

### Sprint Goal

Deliver real, measurable user value: user scans a URL and gets a real Security Score with explanations

### Tasks

- EX-001: Demo Target Deployment
- EX-002: Basic Real DAST Engine
- EX-003: Fix Pricing Display
- EX-004: Email Verification
- EX-005: Password Reset

### Key Results

- Demo Target deployed and accessible via one-click button
- Basic DAST engine performs HTTP-based security checks on any URL
- Security Score computed from real vulnerabilities (not mock)
- Explainability Layer processes real findings
- Email verification flow works end-to-end
- Password reset flow works end-to-end
- Landing page displays correct pricing ($29/$79/$199)

### Completion Criteria

Demo scan shows real Score. User can scan own URL and get real results. Email verification and password reset work end-to-end. Pricing displays correctly.

### KPI Targets

Scan Success Rate > 80% (internal). P95 scan duration < 60 sec. TTFV (demo) < 60 sec.

### Day-by-Day Plan

```
Day 1: EX-001 (Demo Target) + EX-003 (Fix Price)
Day 2-4: EX-002 (Basic DAST Engine) - largest task, main focus
Day 5: EX-004 (Email Verification) + EX-005 (Password Reset)
Day 6: Integration testing - demo scan -> real scan -> score -> explainability
Day 7: Buffer for bugs + Sprint 01 demo
```

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| DAST Engine accuracy insufficient | Medium | High | Start with basic HTTP checks. Iterate based on beta feedback. Full DAST deferred to post-beta. |
| Onboarding TTFV > 3 min | Medium | High | Progressive disclosure. Demo scan is pre-configured. Real scan is optional first step. |
| Low beta signup rate | Medium | High | Increase outreach volume. Try alternative channels (HN Show HN post, Reddit). |
| Production bugs during beta | Medium | Medium | Daily monitoring. Sentry alerts. Critical fixes < 24h. |

### Dependencies

All tasks in Sprint 01 depend on Sprint 00 being complete (for num > 1, all prior sprints done).

Intra-sprint dependencies are documented in EXECUTION_BACKLOG.md and DEPENDENCY_MAP.md.
