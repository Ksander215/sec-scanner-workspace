# RELEASE NOTES v2.0 — Repository Consolidation

> **Tag:** `repository-baseline-v2.0`
> **Date:** 2026-07-15
> **Task:** OPS-004 — Repository Consolidation & GitHub Synchronization

---

## Overview

Это крупнейший релиз в истории проекта: объединение результатов **двух независимых AI-сессий** в единый GitHub Repository как Single Source of Truth.

До этого релиза артефакты проекта были разделены:
- **Archive A** (dialog-session-files.zip) — Workspace со стратегией, продуктами, спринтами, исходным кодом scan-platform и engines
- **Archive B** (sec-scanner-workspace) — Governance документы, архитектурные RFC (RFC-001, KG-001), reviews

Теперь всё в одном репозитории.

---

## Что импортировано

### Из Archive A (MIG-001 Workspace)

| Категория | Содержание | Документов/Модулей |
|-----------|-----------|-------------------|
| Scan Platform Foundation | Orchestrator, Pipeline, Models, Plugin API | 26 модулей |
| Pipeline Executor | Staged execution, Artifact Bus, Recovery | 11 модулей |
| Browser Intelligence | DOM Snapshot, Navigation, Auth | 10 модулей |
| HTTP Intelligence | Headers, TLS, Cookies, Fingerprinting | 12 модулей |
| Discovery Engine | Attack Surface, Katana, Scope | 9 модулей |
| Nuclei Adapter | CLI integration, JSONL parser | 4 модуля |
| Strategy | PMF Blueprint, North Star, Success Gates | 5 документов |
| Product | Readiness, Maturity, Beta | 5 документов |
| Execution | Master Plan, Sprints, Milestones | 10 документов |
| Growth | KPI, Dashboard, Templates | 5 документов |
| Project OS | Constitution, Operating Model | 4 документа |
| Governance | GOVERNANCE, CODEOWNERS, CONTRIBUTING | 12 файлов |
| GitHub Templates | 6 Issue + 1 PR template | 7 файлов |
| Scripts | gen_report, data_provider | 5 файлов |
| Benchmarks | Pipeline performance results | 2 файла |

### Из Archive B (Architecture Baseline v1.1)

| Категория | Содержание |
|-----------|-----------|
| Governance | AI_CONTEXT, CTO_DECISIONS, ENGINEERING_MEMORY, PROJECT_HANDOFF, VISION, ARCHITECTURE_BASELINE |
| Architecture RFCs | RFC-001 (SIE), KG-001 (Knowledge Graph) |
| Architecture Reviews | 4-role SIE review, 5-role KG review |
| Assets | PROJECT_HANDOFF.pdf, PROJECT_HANDOFF.html |
| Diagrams | 3 SVG diagrams |
| Release | RELEASE_CANDIDATE_v1.0, RELEASE_NOTES_v1.1 |

---

## Какие документы объединены

| Документ | Изменение |
|----------|-----------|
| README.md | Объединён: AI-Native Platform (B) + Project OS (A) |
| INDEX.md | Расширен с 15 до 70+ документов |
| CHANGELOG.md | Объединены истории v0.1.0→v2.0.0 |
| .gitignore | Объединены Python (B) + Node.js (A) паттерны |

---

## Какие RFC утверждены

| RFC | Статус | Условия |
|-----|--------|---------|
| RFC-001 (Security Intelligence Engine) | APPROVED WITH CONDITIONS | 10 prerequisites для INT-001 |
| KG-001 (Knowledge Graph Platform) | APPROVED WITH CONDITIONS | 3 critical risks до INT-001 |

---

## Какие ADR добавлены

| ADR | Описание | Источник |
|-----|----------|---------|
| ADR-SIE-001..007 | Security Intelligence Engine (7 ADR) | RFC-001 |
| ADR-KG-001..008 | Knowledge Graph Platform (8 ADR) | KG-001 |
| ADR-202D | HTTP Intelligence как независимый модуль | Archive A |
| ARCH-201-01..10 | Scan Platform Foundation (10 ADR) | TASK-201 |

---

## Текущее состояние проекта

| Метрика | Значение |
|---------|----------|
| Файлов в репозитории | 189 |
| Документов | 70+ |
| Исходный код модулей | 70+ |
| Тестов | 200+ |
| Архитектурных RFC | 2 (APPROVED WITH CONDITIONS) |
| ADR | 25+ |
| Категорий docs/ | 11 |
| Коммитов | 19 |

---

## Следующий этап разработки

**INT-001: Knowledge Graph Core Implementation**

Перед началом INT-001 должны быть выполнены 10 prerequisites:
1. Утвердить Storage Backend (NetworkX для MVP)
2. Утвердить Retention Policy
3. Исправить 3 critical risks из KG-001 Review
4. Добавить CancellationToken во все async operations
5. Добавить Cache Strategy
6. Добавить Performance Benchmarks
7. Добавить Progress Reporting
8. Добавить Security Unit Tests
9. Добавить CompletenessLevel enum
10. Зафиксировать API versioning strategy
