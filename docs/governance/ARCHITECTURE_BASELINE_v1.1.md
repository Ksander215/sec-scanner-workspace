# Architecture Baseline v1.1

**Дата:** 2026-07-16  
**Commit:** `24dd1d3`  
**Tag:** `architecture-baseline-v1.1`  
**Ветка:** `main`  
**Статус:** APPROVED — Ready for INT-001  

---

## Утверждённые RFC

| # | Документ | Версия | Статус | Ревью |
|---|----------|--------|--------|-------|
| 1 | RFC-001: Security Intelligence Engine | Draft | APPROVED WITH CONDITIONS | 4 роли, 11 рисков, 16 рекомендаций |
| 2 | KG-001: Knowledge Graph Architecture | Draft | APPROVED WITH CONDITIONS | 5 ролей, 19 рисков, 25 рекомендаций |

## Утверждённые ADR

### RFC-001 (Security Intelligence Engine)

| ADR | Решение |
|-----|---------|
| ADR-INT-001 | Knowledge Graph Adapter как Anti-Corruption Layer |
| ADR-INT-002 | Immutable Analysis Results |
| ADR-INT-003 | Deterministic Rule Engine |
| ADR-INT-004 | Pipeline Architecture для SIE |
| ADR-INT-005 | Explainability Contract как отдельный Adapter |
| ADR-INT-006 | Zero Coupling с Scan Engines |
| ADR-INT-007 | Event-Driven Internal Communication |

### KG-001 (Knowledge Graph Architecture)

| ADR | Решение |
|-----|---------|
| ADR-KG-001 | Почему выбран Property Graph |
| ADR-KG-002 | Почему Graph Immutable |
| ADR-KG-003 | Почему Snapshot-based Versioning |
| ADR-KG-004 | Почему Traversal Engine отделён от Storage |
| ADR-KG-005 | Почему Query API не зависит от Storage |
| ADR-KG-006 | Почему Graph Event Bus |
| ADR-KG-007 | Почему Delta Synchronization |
| ADR-KG-008 | Почему Explainability использует Graph Snapshot |

## Завершённые этапы

| # | Этап | Описание | Статус |
|---|------|----------|--------|
| 1 | Workspace v1.0 | Инициализация репозитория и SSOT | DONE |
| 2 | Repository Governance | PROJECT_HANDOFF, AI_CONTEXT, ENGINEERING_MEMORY, CTO_DECISIONS, VISION | DONE |
| 3 | Scan Platform Foundation | TASK-201: Attack Surface Model | DONE |
| 4 | Nuclei Adapter | TASK-202A: Nuclei Integration | DONE |
| 5 | Pipeline Architecture | TASK-202P: Scan Pipeline Design | DONE |
| 6 | Pipeline Executor | TASK-202E: Pipeline Executor Core | DONE |
| 7 | Pipeline Validation | TASK-202F: Pipeline Validation Suite | DONE |
| 8 | Pre-Production Audit | OPS-002: Repository Audit & Release Candidate | DONE |
| 9 | SIE Architecture | RFC-001: Security Intelligence Engine | RFC APPROVED |
| 10 | KG Architecture | KG-001: Knowledge Graph Platform | RFC APPROVED |

## Содержимое репозитория

### Governance (5 документов)

- `docs/governance/PROJECT_HANDOFF.md` — 43 KB, полный документ передачи контекста
- `docs/governance/AI_CONTEXT.md` — 4 KB, быстрый контекст для AI-агента
- `docs/governance/ENGINEERING_MEMORY.md` — 4.6 KB, инженерная память
- `docs/governance/CTO_DECISIONS.md` — 6 KB, 7 CTO-решений
- `docs/governance/VISION.md` — 5.5 KB, стратегическое видение

### Architecture (4 документа)

- `docs/architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md` — 78 KB, SIE RFC
- `docs/architecture/RFC_REVIEW_REPORT.md` — 18.7 KB, SIE Review Report
- `docs/architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md` — 112 KB, KG RFC
- `docs/architecture/KG_ARCHITECTURE_REVIEW_REPORT.md` — 31 KB, KG Review Report

### Assets (3 файла)

- `docs/assets/pdf/PROJECT_HANDOFF.pdf` — 681 KB, PDF-версия Handoff
- `docs/assets/html/PROJECT_HANDOFF.html` — 83 KB, HTML-версия Handoff
- `docs/diagrams/` — 3 SVG-диаграммы

### Infrastructure (4 файла)

- `README.md` — описание проекта и навигация
- `INDEX.md` — индекс документов
- `CHANGELOG.md` — история изменений
- `.gitignore` — исключения Git

### Release

- `RELEASE_CANDIDATE_v1.0.md` — Release Candidate (OPS-002)

## Статистика

| Метрика | Значение |
|---------|----------|
| Всего файлов | 20 |
| Governance документы | 5 |
| Architecture документы | 4 |
| SVG-диаграммы | 3 |
| Mermaid-диаграммы (в RFC) | 18 (8 в RFC-001 + 10 в KG-001) |
| ADR | 15 (7 ADR-INT + 8 ADR-KG) |
| Node Types (KG) | 18 |
| Edge Types (KG) | 14 |
| SIE Components | 11 |
| KG Domain Entities | 16 |
| Traversal Algorithms | 7 |
| Graph Query API Methods | 11 |
| Размер репозитория | 1.2 MB |
| Commit'ов | 5 |

## Следующий этап

**INT-001 — Knowledge Graph Core Implementation**

Перед началом INT-001 необходимо:

1. Утвердить Storage Backend (рекомендация: NetworkX для MVP)
2. Утвердить Retention Policy (30 snapshots + 7 дней delta)
3. Внести правки по критическим рискам:
   - RISK-PGE-002: Snapshot creation — blocking operation
   - RISK-DSA-001: Single Point of Failure — Graph Platform
   - RISK-SA-001: Node Type Injection
4. Добавить CancellationToken в traverse() и shortestPath()
5. Добавить Query Timeout для query()
6. Добавить Delta Chain Length Guard
7. Добавить Event Payload Sanitization
8. Добавить Strict Node Type Validation
9. Определить Graph Health Metrics
10. Разработать Threat Model для Graph Platform

## Статус репозитория

- **Ветка:** main
- **Commit:** 24dd1d3
- **Tag:** architecture-baseline-v1.1
- **Незакоммиченные изменения:** нет
- **Секреты:** не обнаружены
- **Битые ссылки:** не обнаружены
- **Временные файлы:** не обнаружены
- **Аудит:** PASSED (7/7 checks)

---

**Связанные документы:** [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md) | [AI_CONTEXT.md](./AI_CONTEXT.md) | [CTO_DECISIONS.md](./CTO_DECISIONS.md) | [ENGINEERING_MEMORY.md](./ENGINEERING_MEMORY.md) | [VISION.md](./VISION.md) | [RFC-001](../01_architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md) | [KG-001](../01_architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md)
