# Architecture Baseline v1.1

**Tag:** `architecture-baseline-v1.1`  
**Date:** 2026-07-16  
**Commit:** `3778051`  
**Status:** Ready for INT-001  

---

## Included

### Architecture RFCs

- **RFC-001: Security Intelligence Engine** — 11 components, 12 domain entities, 10 correlation rules, Risk Engine (7 parameters), Attack Path Builder, Recommendation Engine, Explainability Contract, 7 API methods, 8 Mermaid diagrams, 7 ADR. Review: APPROVED WITH CONDITIONS (4 roles, 11 risks, 16 recommendations).

- **KG-001: Knowledge Graph Architecture** — 16 domain entities, 18 Node Types, 14 Edge Types, Graph Storage Model (6 index types), Traversal Engine (7 algorithms with complexity analysis), Versioning (Snapshot + Delta hybrid, Rollback, Replay, Merge), Graph Query API (11 methods), Synchronization (5 flows, Event Bus), Performance Strategy (4-level cache), Security (immutable graph, audit trail, integrity, validation), Failure Recovery (8 scenarios), 10 Mermaid diagrams, 8 ADR. Review: APPROVED WITH CONDITIONS (5 roles, 19 risks, 25 recommendations).

### Repository Governance

- PROJECT_HANDOFF.md — full project context document (43 KB)
- AI_CONTEXT.md — quick context for AI agents
- ENGINEERING_MEMORY.md — engineering memory & decisions
- CTO_DECISIONS.md — 7 CTO decisions (FINAL)
- VISION.md — strategic product vision
- ARCHITECTURE_BASELINE_v1.1.md — official baseline document

### Scan Platform

- TASK-201: Attack Surface Model
- TASK-202A: Nuclei Adapter
- TASK-202P: Scan Pipeline Architecture
- TASK-202E: Pipeline Executor Core
- TASK-202F: Pipeline Validation Suite

### Assets

- PROJECT_HANDOFF.pdf (22 pages, Tech Dark theme)
- PROJECT_HANDOFF.html (Tech Dark theme)
- 3 SVG diagrams (Platform Architecture, Intelligence Engine, Roadmap)

### Infrastructure

- README.md, INDEX.md, CHANGELOG.md
- .gitignore (Python/IDE/OS/secrets exclusions)
- RELEASE_CANDIDATE_v1.0.md

---

## Statistics

| Metric | Value |
|--------|-------|
| Total files | 20 |
| Governance documents | 6 |
| Architecture documents | 4 |
| SVG diagrams | 3 |
| Mermaid diagrams (in RFCs) | 18 |
| ADR | 15 (7 INT + 8 KG) |
| Node Types (KG) | 18 |
| Edge Types (KG) | 14 |
| Domain Entities (KG) | 16 |
| SIE Components | 11 |
| Traversal Algorithms | 7 |
| Graph Query API Methods | 11 |
| Correlation Rules | 10 |
| Risk Engine Parameters | 7 |
| Repository size | 1.2 MB |
| Commits | 6 |
| Audit result | PASSED (7/7 checks) |

---

## ADR Registry

### SIE (RFC-001)

1. ADR-INT-001: Knowledge Graph Adapter as Anti-Corruption Layer
2. ADR-INT-002: Immutable Analysis Results
3. ADR-INT-003: Deterministic Rule Engine
4. ADR-INT-004: Pipeline Architecture for SIE
5. ADR-INT-005: Explainability Contract as Separate Adapter
6. ADR-INT-006: Zero Coupling with Scan Engines
7. ADR-INT-007: Event-Driven Internal Communication

### KG (KG-001)

1. ADR-KG-001: Why Property Graph
2. ADR-KG-002: Why Graph Immutable
3. ADR-KG-003: Why Snapshot-based Versioning
4. ADR-KG-004: Why Traversal Engine Separated from Storage
5. ADR-KG-005: Why Query API Independent from Storage
6. ADR-KG-006: Why Graph Event Bus
7. ADR-KG-007: Why Delta Synchronization
8. ADR-KG-008: Why Explainability Uses Graph Snapshot

---

## Next Milestone

**INT-001 — Knowledge Graph Core Implementation**

Prerequisites:
- [ ] Approve Storage Backend (recommendation: NetworkX for MVP)
- [ ] Approve Retention Policy (30 snapshots + 7 days delta)
- [ ] Fix RISK-PGE-002: Async Snapshot Creation
- [ ] Fix RISK-DSA-001: Read Replica for Graph Platform
- [ ] Fix RISK-SA-001: Strict Node Type Validation
- [ ] Add CancellationToken to traverse() and shortestPath()
- [ ] Add Query Timeout for query()
- [ ] Add Delta Chain Length Guard
- [ ] Add Event Payload Sanitization
- [ ] Define Graph Health Metrics
- [ ] Develop Threat Model for Graph Platform
