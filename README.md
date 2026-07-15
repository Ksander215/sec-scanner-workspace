# Security Intelligence Platform

> **Единый источник правды** (Single Source of Truth) для управления развитием продукта Sec Scanner — AI-Native платформы анализа безопасности веб-приложений нового поколения.

[![Project Stage: Pre-Alpha](https://img.shields.io/badge/Stage-Pre--Alpha-orange)](https://github.com/Ksander215/sec-scanner-workspace)
[![Architecture Baseline: v1.1](https://img.shields.io/badge/Architecture-v1.1-blue)](docs/governance/ARCHITECTURE_BASELINE_v1.1.md)
[![Docs: 70+](https://img.shields.io/badge/Documents-70%2B-blue)](#-document-architecture)

---

## Что это за проект?

**Security Intelligence Platform** — это не очередной DAST-сканер. Это интеллектуальная система, которая:

- Строит **единую модель знаний** (Security Knowledge Graph)
- **Коррелирует** находки из разных источников
- **Оценивает риски** с учётом контекста приложения
- **Строит цепочки атак** (Attack Paths)
- Предоставляет **объяснимые рекомендации** (Deterministic Explainability, не AI-generated)
- Переводит результаты сканирования на **язык бизнес-метрик** (Security Score 0-100)

> Knowledge → Intelligence → Explainability → Action

**Целевая аудитория:** Startup (5-20 devs) и SMB (20-50 devs). Flat pricing от $29/мес.

**Tech Stack:** Next.js 16, React 19, Prisma 6, SQLite, Python 3.12+, Pydantic v2, NetworkX/Neo4j.

---

## Текущий статус

| Компонент | Статус |
|-----------|--------|
| EPIC-01: Discovery & Scanning | ✅ DONE |
| TASK-201: Scan Platform Foundation | ✅ DONE (78/78 tests) |
| TASK-202A: Nuclei Adapter | ✅ DONE (51 tests) |
| TASK-202B-F: Intelligence Modules | ✅ DONE |
| KG-001: Security Knowledge Graph | ✅ RFC APPROVED (with conditions) |
| RFC-001: Security Intelligence Engine | ✅ RFC APPROVED (with conditions) |
| EPIC-04 / INT-001: SIE Implementation | 📋 PENDING (10 prerequisites) |
| EPIC-05+: Explainability & Dashboard | 📋 PLANNED |

**Stage:** Pre-revenue, Architecture Complete, Pre-Beta.
**Product Maturity:** 3.7/10.
**Следующий шаг:** INT-001 — Knowledge Graph Core Implementation.

---

## Document Architecture

```
docs/
  governance/          PROJECT_HANDOFF, AI_CONTEXT, CTO_DECISIONS, VISION, ENGINEERING_MEMORY
  architecture/        RFC-001, KG-001, ADRs, Security State Engine, Explainability, Domain Model
  strategy/            PMF Blueprint, North Star, Success Gates, Multi-Channel, Intelligence Framework
  product/             Readiness, Maturity, Beta Checklist, Beta Roadmap, First Value Experience
  execution/           Master Plan, Backlog, 4 Sprints, Milestones, Dependencies, Blockers
  growth/              KPI Catalog, Growth Dashboard, Weekly/Monthly Templates, Experiments
  decisions/           Decision Log, Decision Management Framework
  reviews/             Migration Report, Review Artifacts
  draft/               TASK-201, TASK-202A, TASK-202P (task documents)
  project_os/          Project OS Constitution, AI Operating Model, Document Standards, Audit
  assets/              PDF, HTML rendered documents
  diagrams/            SVG architecture diagrams
  archive/             Superseded and historical documents
src/
  domain/scan-platform/    Core scanning domain (orchestrator, pipeline, models)
  engines/                 Browser, Discovery, HTTP Intelligence, Nuclei
scripts/                   Utility scripts
benchmarks/                Performance benchmarks
```

---

## Governance (управление проектом)

| Документ | Описание |
|----------|----------|
| [PROJECT_HANDOFF.md](docs/governance/PROJECT_HANDOFF.md) | Полный документ передачи контекста проекта |
| [AI_CONTEXT.md](docs/governance/AI_CONTEXT.md) | Быстрый контекст для AI-агента |
| [ENGINEERING_MEMORY.md](docs/governance/ENGINEERING_MEMORY.md) | Инженерная память: решения, соглашения, уроки |
| [CTO_DECISIONS.md](docs/governance/CTO_DECISIONS.md) | Реестр ключевых решений CTO |
| [VISION.md](docs/governance/VISION.md) | Стратегическое видение продукта |
| [ARCHITECTURE_BASELINE_v1.1.md](docs/governance/ARCHITECTURE_BASELINE_v1.1.md) | Архитектурная база v1.1 |

## Architecture (архитектурные RFC и документы)

| Документ | Описание |
|----------|----------|
| [RFC-001: SIE](docs/architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md) | Архитектура Security Intelligence Engine |
| [KG-001: Knowledge Graph](docs/architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md) | Архитектура Knowledge Graph Platform |
| [Security State Engine](docs/architecture/SECURITY_STATE_ENGINE.md) | Алгоритмы Score/Risk/Trend/Confidence |
| [Explainability Layer](docs/architecture/EXPLAINABILITY_LAYER.md) | 4 типа объяснений, 83 теста |
| [Platform API Architecture](docs/architecture/PLATFORM_API_ARCHITECTURE.md) | Clean Architecture, Ports & Adapters |

## Ассеты

| Файл | Описание |
|------|----------|
| [PROJECT_HANDOFF.pdf](docs/assets/pdf/PROJECT_HANDOFF.pdf) | PDF-версия документа передачи |
| [PROJECT_HANDOFF.html](docs/assets/html/PROJECT_HANDOFF.html) | HTML-версия (Tech Dark тема) |

## Диаграммы

| Диаграмма | Описание |
|-----------|----------|
| [Platform Architecture](docs/diagrams/handoff_platform_architecture.svg) | Архитектура платформы |
| [Intelligence Engine](docs/diagrams/intelligence_engine.svg) | Компонентная архитектура SIE |
| [Roadmap](docs/diagrams/roadmap.svg) | Дорожная карта проекта |

---

## Архитектурные принципы

- **Clean Architecture** — домен, приложение, инфраструктура
- **DDD** — модель вокруг предметной области безопасности
- **Plugin Architecture** — движки через Plugin API (ScanEnginePlugin interface)
- **Event Driven** — Artifact Bus для слабой связности
- **Immutable Models** — артефакты неизменяемы (frozen Pydantic)
- **Deterministic & Explainable** — НЕ LLM/ML в ядре аналитики
- **Test First** — каждая доменная сущность покрывается тестами

---

## Роли в проекте

| Роль | Зона ответственности | Решения |
|------|---------------------|---------|
| **Founder / CEO** | Стратегия, приоритеты, бюджет | Финальные (BDR, MDR) |
| **CTO** | Архитектура, код, безопасность | Предлагает (ADR, SDR) |
| **CPO** | Продукт, UX, roadmap, метрики | Предлагает (PDR, UDR) |
| **Engineering Manager** | Процессы, стандарты, документация | Операционные (ODR) |

---

## Быстрый старт для нового AI-агента

1. Прочитай [AI_CONTEXT.md](docs/governance/AI_CONTEXT.md) — быстрый контекст
2. Прочитай [CTO_DECISIONS.md](docs/governance/CTO_DECISIONS.md) — непреложные решения
3. Прочитай [PROJECT_HANDOFF.md](docs/governance/PROJECT_HANDOFF.md) — полный контекст
4. Изучи [ENGINEERING_MEMORY.md](docs/governance/ENGINEERING_MEMORY.md) — накопленный опыт

## Быстрый старт для нового участника

1. [README.md](README.md) — вы читаете это (2 мин)
2. [INDEX.md](INDEX.md) — навигация по всем документам (3 мин)
3. [PROJECT_OS.md](docs/project_os/PROJECT_OS.md) — конституция проекта (30 мин)
4. [AI_OPERATING_MODEL.md](docs/project_os/AI_OPERATING_MODEL.md) — регламент разработки (20 мин)

## Быстрый статус

1. [FOUNDER_DASHBOARD.md](docs/execution/FOUNDER_DASHBOARD.md) — текущий статус (5 мин)
2. [MASTER_EXECUTION_PLAN.md](docs/execution/MASTER_EXECUTION_PLAN.md) — что строим и в каком порядке

---

## North Star Metric

**WASP** (Weekly Active Scanning Projects) — количество уникальных проектов, отсканированных за последние 7 дней.

Текущий: **0**. Цель (M3): **50**. Цель (M12): **500**.

---

## Навигация по Workspace

| Документ | Назначение |
|---------|-----------|
| [INDEX.md](INDEX.md) | Полная навигация по документации |
| [REPOSITORY_MAP.md](REPOSITORY_MAP.md) | Визуальная карта репозитория (Mermaid) |
| [DOCUMENT_LIFECYCLE.md](DOCUMENT_LIFECYCLE.md) | Жизненный цикл документов (6 стадий) |
| [CHANGELOG.md](CHANGELOG.md) | История изменений Workspace |
| [DECISION_LOG.md](DECISION_LOG.md) | Решения об инфраструктуре управления |
| [GOVERNANCE.md](GOVERNANCE.md) | Управление, ответственности, RACI |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Как вносить изменения |

---

*Подробности о структуре: [REPOSITORY_STANDARDS.md](REPOSITORY_STANDARDS.md)*
*Определения DoR/DoD: [DEFINITIONS.md](DEFINITIONS.md)*
