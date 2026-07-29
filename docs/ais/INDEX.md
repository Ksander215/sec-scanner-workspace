# IDX-001.000 — AIS Architecture Documentation Index

> **Document ID**: IDX-001.000  
> **Tier**: Navigation  
> **Status**: APPROVED  
> **Issued by**: TASK-AIS-000X.000  
> **Baseline membership**: AIS Baseline v1.0

---

## Architecture Documentation Tree

```
docs/ais/
├── 00-constitution/
│   └── CON-001.000-AIS-Constitution.md          [L1] [APPROVED]
├── 01-architecture/
│   └── ARC-001.001-AIS-Architecture-Baseline-v1.0.md [L2] [APPROVED]
├── 02-domain/
│   ├── DOM-001.000-AIS-Domain-Vision-and-Principles.md [L2] [APPROVED]
│   └── DOM-002.000-AIS-Domain-Model-Specification.md    [L2] [APPROVED]
├── 03-adr/
│   ├── ADR-001.000-Modular-Monolith.md          [L3] [ACCEPTED]
│   ├── ADR-002.000-Event-Bus.md                 [L3] [ACCEPTED]
│   ├── ADR-003.000-Provider-Abstraction.md       [L3] [ACCEPTED]
│   ├── ADR-004.000-File-Storage.md              [L3] [ACCEPTED]
│   ├── ADR-005.000-TypeScript.md                [L3] [ACCEPTED]
│   ├── ADR-006.000-Plugins.md                   [L3] [ACCEPTED]
│   ├── ADR-007.000-CLI.md                       [L3] [ACCEPTED]
│   ├── ADR-008.000-Session-Memory.md            [L3] [ACCEPTED]
│   ├── ADR-009.000-Autonomy-Spectrum.md         [L3] [ACCEPTED]
│   ├── ADR-010.000-Trust-Boundaries.md          [L3] [ACCEPTED]
│   ├── ADR-011.000-Data-Sovereignty.md          [L3] [ACCEPTED]
│   ├── ADR-012.000-Minimal-Privilege.md         [L3] [ACCEPTED]
│   ├── ADR-013.000-Refinement-Strategy.md       [L3] [ACCEPTED]
│   └── ADR-014.000-Domain-Model-Structure.md    [L3] [ACCEPTED]
├── 04-governance/
│   ├── GOV-003.000-AIS-Decision-Governance-Model.md  [L5] [APPROVED]
│   └── GOV-004.000-Domain-Governance-Standard.md      [L5] [APPROVED]
├── 05-reports/
│   ├── REP-000-AIS.000-Repository-Recovery-Report.md            [APPROVED]
│   ├── REP-001-AIS.000-Constitution-Establishment-Report.md       [APPROVED]
│   ├── REP-002-AIS.000-Compliance-Audit-Report.md                [APPROVED]
│   ├── REP-003-AIS.000-Architecture-Refinement-Report.md         [APPROVED]
│   ├── REP-004-AIS.000-Architecture-Baseline-Establishment-Report.md [APPROVED]
│   ├── REP-005-AIS.000-Domain-Foundation-Establishment-Report.md  [APPROVED]
│   ├── REP-006-AIS.000-Domain-Modeling-Report.md                 [APPROVED]
│   ├── REP-007-AIS.000-Domain-Baseline-Certification-Report.md   [APPROVED]
│   ├── REP-008-AIS.000-Architecture-Baseline-Verification-Report.md [APPROVED]
│   ├── REP-009-AIS.000-Architecture-Closure-Report.md            [APPROVED]
│   ├── REP-010-AIS.000-Execution-Engine-Foundation-Report.md     [APPROVED]
│   └── TST-001.000-Foundation-Validation-Report.md               [APPROVED]
├── 06-baselines/
│   ├── BAS-000.000-Architecture-Repository-Manifest.md             [APPROVED]
│   └── BAS-001.000-Architecture-Baseline-Manifest.md               [APPROVED]
├── 07-releases/
│   └── (release notes stored here)
└── INDEX.md                                       [THIS FILE]
```

---

## Documents by Tier

### L1 — Constitutional Layer

| Document | Path | Status | Version |
|----------|------|--------|---------|
| CON-001.000 | 00-constitution/ | APPROVED | 000 |

### L2 — Architecture / Domain Layer

| Document | Path | Status | Version |
|----------|------|--------|---------|
| ARC-001.001 | 01-architecture/ | APPROVED | 001 |
| DOM-001.000 | 02-domain/ | APPROVED | 000 |
| DOM-002.000 | 02-domain/ | APPROVED | 000 |

### L3 — Architecture Decision Records

| Document | Path | Status |
|----------|------|--------|
| ADR-001.000 through ADR-014.000 | 03-adr/ | ACCEPTED |

### L5 — Governance Layer

| Document | Path | Status | Version |
|----------|------|--------|---------|
| GOV-003.000 | 04-governance/ | APPROVED | 000 |
| GOV-004.000 | 04-governance/ | APPROVED | 000 |

---

## Documents by Task

| Task | Deliverables |
|------|-------------|
| TASK-AIS-000.000 | CON-001.000, REP-001-AIS.000 |
| TASK-AIS-000A.000 | REP-002-AIS.000, ADR-009..012 |
| TASK-AIS-001B.000 | ARC-001.001, REP-003-AIS.000 |
| TASK-AIS-001C.000 | BAS-001.000, REP-004-AIS.000, GOV-003.000 |
| TASK-AIS-002A.000 | DOM-001.000, GOV-004.000, REP-005-AIS.000 |
| TASK-AIS-002B.000 | DOM-002.000, ADR-014, REP-006-AIS.000 |
| TASK-AIS-000X.000 | BAS-000.000, REP-000-AIS.000, IDX-001.000 |
| TASK-AIS-000Y.000 | REP-008-AIS.000, BAS-003.000, GOV-005.000 |
| TASK-AIS-002C.000 | BAS-002.000, REP-007-AIS.000, CER-001.000 |
| TASK-AIS-002D.000 | REP-009-AIS.000, GOV-006.000, CER-002.000 |
| TASK-AIS-003A.000 | REP-010-AIS.000, SRC-001.000, TST-001.000 |
| TASK-AIS-003B.000 | Tool Runtime |
| TASK-AIS-003C.000 | Tool Runtime |
| TASK-AIS-003D.000 | Memory Runtime |
| TASK-AIS-003E.000 | Knowledge Runtime |
| TASK-AIS-003F.000 | Identity Runtime |
| TASK-AIS-003G.000 | Capability Runtime, SRC-006.000, REP-016-AIS.000, TST-006.000 |
| TASK-AIS-003H.000 | Workflow Runtime ✅, SRC-007.000, REP-017-AIS.000, TST-007.000 |

---

## Quick Links

- [Constitution](00-constitution/CON-001.000-AIS-Constitution.md)
- [Architecture Baseline](01-architecture/ARC-001.001-AIS-Architecture-Baseline-v1.0.md)
- [Domain Vision](02-domain/DOM-001.000-AIS-Domain-Vision-and-Principles.md)
- [Domain Model](02-domain/DOM-002.000-AIS-Domain-Model-Specification.md)
- [ADR Index](03-adr/ADR-001.000-Modular-Monolith.md)
- [Decision Governance](04-governance/GOV-003.000-AIS-Decision-Governance-Model.md)
- [Domain Governance](04-governance/GOV-004.000-Domain-Governance-Standard.md)
- [Reports](05-reports/)
- [Baselines](06-baselines/)
