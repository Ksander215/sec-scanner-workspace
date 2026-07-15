# BLOCKERS.md - Sec Scanner

> **Date:** 2026-07-14
> **Version:** 1.0
> **Type:** Operational document - Active Blockers
> **Owner:** CTO
> **Status:** Active
> **Related documents:** MASTER_EXECUTION_PLAN.md, DEPENDENCY_MAP.md, EXECUTION_BACKLOG.md

---

## Purpose

Living document tracking all active blockers. Updated daily during active sprints. Resolved blockers are archived at the bottom.

---

## Active Blockers

### BLK-001: SMTP Configuration
| Attribute | Value |
|-----------|-------|
| **Status** | Active |
| **Blocking** | EX-004 (Email Verification), EX-005 (Password Reset), EX-013 (Welcome Emails) |
| **Severity** | High |
| **Description** | SMTP credentials (host, port, user, pass) must be configured for email sending. Current email.ts gracefully degrades to console.log, which is not usable for production. |
| **Required Action** | Configure SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS). Test with real email send. |
| **Resolution Target** | Sprint 01, Day 1 (before EX-004) |
| **Owner** | CTO |

### BLK-002: DAST Engine Scope Unknown
| Attribute | Value |
|-----------|-------|
| **Status** | Active |
| **Blocking** | EX-002 (Basic DAST Engine), EX-006 (Onboarding) |
| **Severity** | High |
| **Description** | "Basic HTTP-based checks" is not a precise spec. Need to define: which headers to check, how to detect forms, what constitutes a "finding" vs noise. Without this, EX-002 may over-scope or under-scope. |
| **Required Action** | Before starting EX-002, define: (1) exact list of checks, (2) severity mapping, (3) minimum viable output format that feeds into Security State Engine. |
| **Resolution Target** | Sprint 01, Day 1 (before coding EX-002) |
| **Owner** | CTO |

### BLK-003: Demo Target Selection
| Attribute | Value |
|-----------|-------|
| **Status** | Active |
| **Blocking** | EX-001 (Demo Target) |
| **Severity** | Medium |
| **Description** | Need to choose between DVWA and OWASP Juice Shop. Both are vulnerable web apps. Decision affects deployment approach and URL. |
| **Required Action** | Choose one. Deploy to subdomain. Verify accessible. |
| **Resolution Target** | Sprint 01, Day 1 (first task) |
| **Owner** | CTO |

### BLK-004: No Landing Page for External Users
| Attribute | Value |
|-----------|-------|
| **Status** | Active |
| **Blocking** | EX-014 (Outreach), Gate 1 |
| **Severity** | Medium |
| **Description** | Current landing page may be internal/CMS-driven. Need to verify it works for external traffic, has correct CTA, and displays proper pricing. |
| **Required Action** | Verify landing page renders for anonymous users. Test signup flow from landing. |
| **Resolution Target** | Sprint 02, Day 1 (before EX-012 E2E test) |
| **Owner** | CTO |

---

## Resolved Blockers

(No resolved blockers yet - document created at EXEC-001 start)

---

## Escalation Rules

1. **Blocker severity High + age > 24h:** Escalate to Founder. Consider scope change.
2. **Blocker severity Medium + age > 48h:** Escalate to Founder. Reassess priority.
3. **Blocker severity Low:** Track in this document. No escalation needed.

---

## Update Log

| Date | Blocker | Action |
|------|---------|--------|
| 2026-07-14 | BLK-001..004 | Created during EXEC-001 planning |
