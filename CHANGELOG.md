# CHANGELOG.md — Security Intelligence Platform

> **Версия:** 2.0.0
> **Тип:** Операционный документ — история развития Workspace
> **Владелец:** Engineering Manager
> **Статус:** Active (permanently active)

---

## Convention

Формат версионирования Workspace: **W.X.Y**

- **W (Major):** Фундаментальные изменения структуры (консолидация архивов, новая категория)
- **X (Minor):** Новые документы, новые шаблоны, значительные обновления
- **Y (Patch):** Исправления ссылок, уточнения текста, мелкие правки

---

## [2.0.0] — 2026-07-16 — OPS-004: Repository Consolidation & GitHub Synchronization

### Добавлено

- **Repository Consolidation** — объединение двух независимых AI-сессий в единый SSOT
- **Source code** — 26+ модулей scan-platform + 4 engine implementations из Archive A
- **Strategy documents** — PMF Blueprint, North Star, Success Gates, Multi-Channel (5 документов)
- **Product documents** — Readiness Report, Maturity Scorecard, Beta Checklist/Roadmap, FVE (5 документов)
- **Execution documents** — Master Plan, Backlog, 4 Sprints, Milestones, Dependencies, Blockers (10 документов)
- **Growth documents** — KPI Catalog, Growth Dashboard, Review Templates, Experiment Playbook (5 документов)
- **Project OS** — Constitution, AI Operating Model, Document Standards, Audit (4 документа)
- **Benchmarks** — Pipeline benchmark results

### Изменено

- **Directory structure** — переход от numbered categories (00-08) к named categories (governance, architecture, strategy, etc.)
- **README.md** — объединён из двух источников: Project OS (A) + Security Intelligence Platform (B)
- **INDEX.md** — расширен с 15 до 70+ документов с навигацией по обеим сессиям
- **CHANGELOG.md** — объединены истории из обоих архивов
- **.gitignore** — объединены Python (B) и Node.js (A) паттерны

### Импортировано из Archive A (dialog-session-files.zip)

- Scan Platform Foundation (26 модулей, 78 тестов)
- Pipeline Executor (11 модулей, staged execution)
- Browser Intelligence (10 модулей)
- HTTP Intelligence (12 модулей, ADR-202D)
- Discovery Engine (9 модулей, Katana adapter)
- Nuclei Adapter (4 модуля, 51 тест)
- Governance docs (GOVERNANCE.md, CODEOWNERS, CONTRIBUTING.md, etc.)
- Strategy docs (5 документов)
- Product docs (5 документов)
- Execution docs (10 документов)
- Growth docs (5 документов)
- Project OS docs (4 документа)

### Импортировано из Archive B (sec-scanner-workspace)

- Governance docs (AI_CONTEXT, CTO_DECISIONS, ENGINEERING_MEMORY, PROJECT_HANDOFF, VISION, ARCHITECTURE_BASELINE)
- Architecture RFCs (RFC-001 SIE, KG-001 Knowledge Graph)
- Architecture Reviews (4-role SIE review, 5-role KG review)
- Assets (PDF, HTML)
- Diagrams (3 SVG)

---

## [1.1.0] — 2026-07-15 — Architecture Baseline v1.1

### Добавлено

- **KG-001 Knowledge Graph Architecture** — 16 сущностей, 18 node types, 14 edge types, 8 ADR
- **KG Architecture Review Report** — 5-рольное ревью, 19 рисков, APPROVED WITH CONDITIONS
- **ARCHITECTURE_BASELINE_v1.1.md** — официальный снапшот архитектуры
- **RELEASE_NOTES_v1.1.md** — release notes для Architecture Baseline v1.1

### Одобрено

- RFC-001 (SIE): APPROVED WITH CONDITIONS — 10 prerequisites для INT-001
- KG-001 (Knowledge Graph): APPROVED WITH CONDITIONS — 3 critical risks

---

## [1.0.0] — 2026-07-15 — MIG-001: Documentation Migration

### Добавлено

- **39 active документов** размещены в docs/ структуре по 9 категориям
- **11 archived документов** с пометками Superseded by
- INDEX.md v2.0 с полным каталогом, указателем по ролям
- Устранено 4 duplication clusters

---

## [0.2.0] — 2026-07-15 — REPO-002: Production Readiness

### Добавлено

- DECISION_LOG.md, CHANGELOG.md, INDEX.md, REPOSITORY_MAP.md, DOCUMENT_LIFECYCLE.md
- Перекрёстный аудит ссылок, Navigation Review

---

## [0.1.0] — 2026-07-15 — REPO-001: Bootstrap GitHub Workspace

### Добавлено

- README.md, CONTRIBUTING.md, REPOSITORY_STANDARDS.md, GOVERNANCE.md, DEFINITIONS.md
- LABELS.md, MILESTONES_GUIDE.md, GITHUB_PROJECTS.md, CODEOWNERS
- 6 Issue Templates + 1 PR Template

---

## Roadmap Workspace

| Версия | Задача | Содержание |
|--------|--------|------------|
| 0.1.0 | REPO-001 | Bootstrap: структура, шаблоны, governance |
| 0.2.0 | REPO-002 | Production Readiness: INDEX, Map, Lifecycle, CHANGELOG |
| 1.0.0 | MIG-001 | Documentation Migration: 39 active + 11 archived |
| 1.1.0 | — | Architecture Baseline v1.1: RFC-001, KG-001 |
| **2.0.0** | **OPS-004** | **Repository Consolidation: A+B merge, source code import** |
