# INDEX.md — Security Intelligence Platform

> **Дата:** 2026-07-16
> **Версия:** 3.0 (Consolidated)
> **Тип:** Операционный документ — Навигационный центр документации
> **Владелец:** Engineering Manager
> **Статус:** Active

---

## Как пользоваться этим документом

**Цель INDEX.md** — ответить на вопрос «где найти нужную информацию?» за 2-3 минуты.

Если вы здесь впервые:
1. Прочитайте [README.md](README.md) — обзор проекта (2 мин)
2. Этот документ (INDEX.md) — навигация (3 мин)
3. Перейдите к нужному разделу ниже

---

## Корневые файлы (Конфигурация Workspace)

| Файл | Назначение |
|------|-----------|
| [README.md](README.md) | Entry point проекта |
| [INDEX.md](INDEX.md) | Навигация (этот документ) |
| [CHANGELOG.md](CHANGELOG.md) | История изменений Workspace |
| [.gitignore](.gitignore) | Правила игнорирования Git |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Как вносить изменения |
| [REPOSITORY_STANDARDS.md](REPOSITORY_STANDARDS.md) | Стандарты организации репозитория |
| [GOVERNANCE.md](GOVERNANCE.md) | Управление, ответственности, RACI |
| [DEFINITIONS.md](DEFINITIONS.md) | DoR/DoD для всех артефактов |
| [LABELS.md](LABELS.md) | GitHub Labels конфигурация |
| [MILESTONES_GUIDE.md](MILESTONES_GUIDE.md) | Milestones ↔ Success Gates |
| [GITHUB_PROJECTS.md](GITHUB_PROJECTS.md) | Kanban-доска конфигурация |
| [DECISION_LOG.md](DECISION_LOG.md) | Журнал решений Workspace |
| [REPOSITORY_MAP.md](REPOSITORY_MAP.md) | Визуальная карта структуры (Mermaid) |
| [DOCUMENT_LIFECYCLE.md](DOCUMENT_LIFECYCLE.md) | Жизненный цикл документов (6 стадий) |
| [CODEOWNERS](CODEOWNERS) | Права обзора по директориям |
| [package.json](package.json) | Vitest/TypeScript dev dependencies |

---

## `docs/governance/` — Управление проектом (6 документов)

**Назначение:** Ключевые документы управления проектом — контекст, решения, видение.

| Документ | Содержание |
|----------|-----------|
| [PROJECT_HANDOFF.md](docs/governance/PROJECT_HANDOFF.md) | Полный документ передачи контекста проекта (~43 KB) |
| [AI_CONTEXT.md](docs/governance/AI_CONTEXT.md) | Быстрый контекст для AI-агента: принципы, директивы, текущая задача |
| [ENGINEERING_MEMORY.md](docs/governance/ENGINEERING_MEMORY.md) | Инженерная память: решения, соглашения, уроки |
| [CTO_DECISIONS.md](docs/governance/CTO_DECISIONS.md) | 7 FINAL решений CTO: AI-Native, KG как SSOT, Plugin Architecture |
| [VISION.md](docs/governance/VISION.md) | Стратегическое видение: 7-слойное решение, целевые аудитории |
| [ARCHITECTURE_BASELINE_v1.1.md](docs/governance/ARCHITECTURE_BASELINE_v1.1.md) | Официальный архитектурный снапшот: RFC, ADR, prerequisites для INT-001 |

---

## `docs/architecture/` — Техническая архитектура (14 документов)

**Назначение:** Архитектурные RFC, ADR, доменные модели, дизайн-документы.

### Архитектурные RFC (из Session B)

| Документ | Содержание |
|----------|-----------|
| [RFC-001: SIE](docs/architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md) | Security Intelligence Engine: 11 компонентов, 12 сущностей, 7 ADR |
| [RFC-001 Review](docs/architecture/RFC_REVIEW_REPORT.md) | 4-рольное ревью SIE: 11 рисков, APPROVED WITH CONDITIONS |
| [KG-001: Knowledge Graph](docs/architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md) | Knowledge Graph Platform: 16 сущностей, 18 node types, 8 ADR |
| [KG-001 Review](docs/architecture/KG_ARCHITECTURE_REVIEW_REPORT.md) | 5-рольное ревью KG: 19 рисков, APPROVED WITH CONDITIONS |

### Архитектурные документы (из Session A)

| Документ | Содержание |
|----------|-----------|
| [PLATFORM_API_ARCHITECTURE.md](docs/architecture/PLATFORM_API_ARCHITECTURE.md) | Platform Layer: Clean Architecture, 7 application services |
| [PLATFORM_AUDIT.md](docs/architecture/PLATFORM_AUDIT.md) | Глубокий аудит: Domain 9/10, App 1/10 |
| [SECURITY_STATE_ENGINE.md](docs/architecture/SECURITY_STATE_ENGINE.md) | Алгоритмы Score/Risk/Trend/Confidence, 82 теста |
| [EXPLAINABILITY_LAYER.md](docs/architecture/EXPLAINABILITY_LAYER.md) | 4 типа объяснений, 83 теста |
| [BOUNDED_CONTEXTS.md](docs/architecture/BOUNDED_CONTEXTS.md) | DDD: 10 bounded contexts |
| [DOMAIN_MODEL_V2.md](docs/architecture/DOMAIN_MODEL_V2.md) | Доменная модель v2: 20+ сущностей |
| [EVENT_MODEL.md](docs/architecture/EVENT_MODEL.md) | Event-driven: 25+ event types |
| [DASHBOARD_V2.md](docs/architecture/DASHBOARD_V2.md) | Target-state UI spec |
| [ADR-202D HTTP Intelligence](docs/architecture/adr-202d-http-intelligence.md) | ADR: HTTP Intelligence как независимый модуль |

---

## `docs/strategy/` — Стратегия и позиционирование (5 документов)

| Документ | Содержание |
|----------|-----------|
| [PRODUCT_MARKET_FIT_BLUEPRINT.md](docs/strategy/PRODUCT_MARKET_FIT_BLUEPRINT.md) | PMF-анализ: ICP, JTBD, GTM, pricing, 90-дневный план |
| [NORTH_STAR_METRIC.md](docs/strategy/NORTH_STAR_METRIC.md) | WASP: определение, формула, leading indicators |
| [SUCCESS_GATES.md](docs/strategy/SUCCESS_GATES.md) | 6 контрольных точек: Gate 0 (Alpha) → Gate 5 (PMF Signal) |
| [MULTI_CHANNEL_PRODUCT_STRATEGY.md](docs/strategy/MULTI_CHANNEL_PRODUCT_STRATEGY.md) | Анализ 5 каналов: Web, Telegram, API, Mobile |
| [PRODUCT_INTELLIGENCE_FRAMEWORK.md](docs/strategy/PRODUCT_INTELLIGENCE_FRAMEWORK.md) | Product Intelligence: Success Model, Decision by Data |

---

## `docs/product/` — Продукт и UX (5 документов)

| Документ | Содержание |
|----------|-----------|
| [PRODUCT_READINESS_REPORT.md](docs/product/PRODUCT_READINESS_REPORT.md) | Комплексная оценка: 8-рольной self-check |
| [PRODUCT_MATURITY_SCORECARD.md](docs/product/PRODUCT_MATURITY_SCORECARD.md) | 12-мерная оценка зрелости: 3.7/10 |
| [PRIVATE_BETA_CHECKLIST.md](docs/product/PRIVATE_BETA_CHECKLIST.md) | Beta launch: 22 items (10 Blocking) |
| [PRIVATE_BETA_ROADMAP.md](docs/product/PRIVATE_BETA_ROADMAP.md) | План до beta: 8 P0 + 5 P1 + 6 P2 |
| [FIRST_VALUE_EXPERIENCE.md](docs/product/FIRST_VALUE_EXPERIENCE.md) | Security tab, ScoreGauge, RiskTrendCards |

---

## `docs/execution/` — Планирование и выполнение (10 документов)

| Документ | Содержание |
|----------|-----------|
| [MASTER_EXECUTION_PLAN.md](docs/execution/MASTER_EXECUTION_PLAN.md) | Стратегический план: 4 спринта, 16 задач |
| [EXECUTION_BACKLOG.md](docs/execution/EXECUTION_BACKLOG.md) | Все 25 задач с приоритетами |
| [SPRINT_01.md](docs/execution/SPRINT_01.md) | Core Product Value (EX-001..005) — Gate 0 |
| [SPRINT_02.md](docs/execution/SPRINT_02.md) | Beta Readiness (EX-006..011) — Gate 0→1 |
| [SPRINT_03.md](docs/execution/SPRINT_03.md) | Launch + First Users (EX-012..015) — Gate 1 |
| [SPRINT_04.md](docs/execution/SPRINT_04.md) | Learn + Iterate (EX-016) — Gate 2 |
| [MILESTONES.md](docs/execution/MILESTONES.md) | 6 milestones: Alpha → Beta → PMF Signal |
| [DEPENDENCY_MAP.md](docs/execution/DEPENDENCY_MAP.md) | Карта зависимостей: критический путь |
| [BLOCKERS.md](docs/execution/BLOCKERS.md) | Активные блокеры |
| [FOUNDER_DASHBOARD.md](docs/execution/FOUNDER_DASHBOARD.md) | 5-минутный Dashboard |

---

## `docs/growth/` — Метрики и рост (5 документов)

| Документ | Содержание |
|----------|-----------|
| [KPI_CATALOG.md](docs/growth/KPI_CATALOG.md) | 28 метрик: AARRR + Product + Engineering + Business |
| [GROWTH_DASHBOARD.md](docs/growth/GROWTH_DASHBOARD.md) | Шаблон дашборда: 5 уровней |
| [WEEKLY_REVIEW_TEMPLATE.md](docs/growth/WEEKLY_REVIEW_TEMPLATE.md) | Шаблон: 6 Key Questions + Gate Check |
| [MONTHLY_BUSINESS_REVIEW.md](docs/growth/MONTHLY_BUSINESS_REVIEW.md) | Шаблон: 13 разделов |
| [EXPERIMENT_PLAYBOOK.md](docs/growth/EXPERIMENT_PLAYBOOK.md) | Процесс: гипотеза → test → decision |

---

## `docs/decisions/` — Корпоративная память (2 документа)

| Документ | Содержание |
|----------|-----------|
| [DECISION_LOG.md](docs/decisions/DECISION_LOG.md) | 12 записей: стек, архитектура, ценообразование |
| [DECISION_MANAGEMENT_FRAMEWORK.md](docs/decisions/DECISION_MANAGEMENT_FRAMEWORK.md) | Таксономия (7 типов), lifecycle, метрики |

---

## `docs/reviews/` — Артефакты Review (1 документ)

| Документ | Содержание |
|----------|-----------|
| [MIGRATION_REPORT.md](docs/reviews/MIGRATION_REPORT.md) | Итоговый отчёт о миграции MIG-001 |

---

## `docs/draft/` — Черновики и Task-документы (4 документа)

| Документ | Содержание |
|----------|-----------|
| [TASK-201_SCAN_PLATFORM_FOUNDATION.md](docs/draft/TASK-201_SCAN_PLATFORM_FOUNDATION.md) | Scan Platform: 26 модулей, 78 тестов |
| [TASK-202A_NUCLEI_ADAPTER.md](docs/draft/TASK-202A_NUCLEI_ADAPTER.md) | Nuclei Adapter: 7 файлов, 51 тест |
| [TASK-202P_SCAN_PIPELINE_ARCHITECTURE.md](docs/draft/TASK-202P_SCAN_PIPELINE_ARCHITECTURE.md) | Scan Pipeline: staged execution, 1854 строки |
| [ADR-202D diagrams](docs/architecture/adr-202d-http-intelligence-diagrams.md) | ADR-202D diagrams supplement |

---

## `docs/project_os/` — Конституция проекта (4 документа)

| Документ | Содержание |
|----------|-----------|
| [PROJECT_OS.md](docs/project_os/PROJECT_OS.md) | Конституция: Vision, Mission, принципы, стратегия |
| [AI_OPERATING_MODEL.md](docs/project_os/AI_OPERATING_MODEL.md) | Регламент: Task Lifecycle (14 стадий), DoR/DoD |
| [DOCUMENT_STANDARDS.md](docs/project_os/DOCUMENT_STANDARDS.md) | Стандарты: метаданные, структура, версионирование |
| [DOCUMENT_AUDIT.md](docs/project_os/DOCUMENT_AUDIT.md) | Инвентаризация: статус каждого документа |

---

## `docs/assets/` — Рендеренные ассеты

| Файл | Описание |
|------|----------|
| [PROJECT_HANDOFF.pdf](docs/assets/pdf/PROJECT_HANDOFF.pdf) | PDF-версия документа передачи |
| [PROJECT_HANDOFF.html](docs/assets/html/PROJECT_HANDOFF.html) | HTML-версия (Tech Dark тема) |

---

## `docs/diagrams/` — SVG-диаграммы

| Диаграмма | Описание |
|-----------|----------|
| [Platform Architecture](docs/diagrams/handoff_platform_architecture.svg) | Архитектура платформы |
| [Intelligence Engine](docs/diagrams/intelligence_engine.svg) | Компонентная архитектура SIE |
| [Roadmap](docs/diagrams/roadmap.svg) | Дорожная карта проекта |

---

## `docs/archive/` — Архив (11 документов)

Исторические и superseded документы. Сохраняют контекст, не используются для текущих решений.

| Документ | Причина архивации | Superseded by |
|----------|-------------------|---------------|
| DOMAIN_MODEL.md | v1 доменной модели | DOMAIN_MODEL_V2.md |
| PRODUCT_ARCHITECTURE.md | v1 product architecture | PLATFORM_API_ARCHITECTURE.md |
| ARCHITECTURE_AUDIT.md | v1 audit | PLATFORM_AUDIT.md |
| ROADMAP_V2.md | 12-month roadmap | PMF Blueprint §9 |
| REFACTOR_ROADMAP.md | 6-sprint refactoring plan | PLATFORM_API_ARCHITECTURE.md |
| TECH_DEBT.md | 20 tech debt items | PLATFORM_AUDIT.md |
| DEPENDENCY_GRAPH.md | Module dependency graphs | PLATFORM_API_ARCHITECTURE.md |
| USER_FLOW.md | User flow maps | PMF Blueprint §7 |
| FIRST_VALUE_AUDIT.md | Pre-implementation UX audit | FIRST_VALUE_EXPERIENCE.md |
| PRODUCT_VISION_V2.md | Vision v2 | PMF Blueprint |
| SECURITY_STATE.md | Central entity design | SECURITY_STATE_ENGINE.md |

---

## `src/` — Исходный код

### `src/domain/scan-platform/` — Core Scanning Domain (26 модулей)

Orchestrator, EngineRegistry, ScanJob, ScanContext, Pipeline Executor, Plugin API, domain models.

### `src/engines/` — Scan Engine Implementations

- `browser/` — Browser Intelligence (10 модулей)
- `discovery/` — Attack Surface Discovery (9 модулей)
- `http-intelligence/` — HTTP Intelligence (12 модулей)
- `nuclei/` — Nuclei Adapter (4 модуля)

---

## Указатель по ролям

### Founder / CEO — быстрый статус (5 мин)

1. [FOUNDER_DASHBOARD.md](docs/execution/FOUNDER_DASHBOARD.md)
2. [MASTER_EXECUTION_PLAN.md](docs/execution/MASTER_EXECUTION_PLAN.md)
3. Последний weekly review

### CTO — перед задачей (20 мин)

1. [AI_CONTEXT.md](docs/governance/AI_CONTEXT.md) — контекст
2. [CTO_DECISIONS.md](docs/governance/CTO_DECISIONS.md) — непреложные решения
3. [RFC-001](docs/architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md) — архитектура SIE
4. [KG-001](docs/architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md) — архитектура KG

### Новый участник — onboarding (~75 мин)

1. [README.md](README.md) — 2 мин
2. [INDEX.md](INDEX.md) — 5 мин
3. [PROJECT_OS.md](docs/project_os/PROJECT_OS.md) — 30 мин
4. [AI_OPERATING_MODEL.md](docs/project_os/AI_OPERATING_MODEL.md) — 20 мин
5. [CONTRIBUTING.md](CONTRIBUTING.md) — 10 мин

### Внешний аудитор / инвестор (30 мин)

1. [README.md](README.md) — 2 мин
2. [PROJECT_HANDOFF.md](docs/governance/PROJECT_HANDOFF.md) — 10 мин
3. [PRODUCT_MARKET_FIT_BLUEPRINT.md](docs/strategy/PRODUCT_MARKET_FIT_BLUEPRINT.md) — 10 мин
4. [FOUNDER_DASHBOARD.md](docs/execution/FOUNDER_DASHBOARD.md) — 5 мин

---

## Статистика Workspace

| Показатель | Значение |
|-----------|----------|
| **Active документов** | 70+ |
| **Archived документов** | 11 |
| **Исходный код модулей** | 26+ (scan-platform + engines) |
| **Тестов** | 200+ |
| **Корневых файлов** | 17 |
| **GitHub Templates** | 7 |
| **Категорий docs/** | 11 (governance, architecture, strategy, product, execution, growth, decisions, reviews, draft, project_os, archive) |
| **Архитектурных RFC** | 2 (RFC-001, KG-001) |
| **ADR** | 15+ |
