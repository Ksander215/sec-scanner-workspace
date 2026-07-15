# PROJECT_OS.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Операционный — Конституция проекта (Project Operating System)
> **Владелец:** Engineering Manager
> **Статус:** Active
> **Связанные документы:** Все документы в docs/

---

## Executive Summary

**Sec Scanner** — DAST SaaS-платформа нового поколения, которая переводит результаты сканирования уязвимостей на язык бизнес-метрик. Ключевая дифференциация: **Security Score (0-100)** + **Deterministic Explainability Layer** + **ROI-отсортированные рекомендации**.

**Текущая стадия:** Pre-revenue, архитектурный фундамент завершён (12 TASK), Private Beta не начат.

**Tech Stack:** Next.js 16, React 19, Prisma 6, SQLite, next-auth v4, TanStack React Query, shadcn/ui.

**Целевая аудитория:** Startup (5-20 devs) и SMB (20-50 devs), которым нужен понятный security posture без enterprise-цены.

**Документ предназначен для:** новых разработчиков, новых AI-агентов, инвесторов, и любого участника проекта.

**Время чтения:** ~25-30 минут.

---

## 1. Vision

> Мир, в котором каждая команда понимает своё состояние безопасности так же просто, как здоровье приложения в New Relic или качество кода в SonarQube. Без dedicated security-команды, без CVSS-мануалов, без alert fatigue.

## 2. Mission

> Демократизировать application security, превратив сложные технические результаты сканирования в понятные, объяснимые и действенные бизнес-метрики.

## 3. Core Principles

| # | Принцип | Описание |
|---|---------|----------|
| P1 | **Deterministic > AI-generated** | Объяснимость должна быть воспроизводимой. AI — optional enhancement, не замена. |
| P2 | **Business language > Technical jargon** | CTO должен понимать Security Score без security-бэкграунда. |
| P3 | **Simple > Complete** | Лучше 80% функциональности сейчас, чем 100% через 6 месяцев. |
| P4 | **Validate > Build** | Каждая feature сначала валидируется через feedback, потом реализуется полностью. |
| P5 | **Retention > Acquisition** | 100 новых users с 5% retention хуже, чем 50 с 20%. |
| P6 | **Clean Architecture always** | Domain Layer → Application Layer → Infrastructure. Dependency Inversion. |
| P7 | **Flat pricing** | Предсказуемые расходы для startup. Не per-developer. |

## 4. Product Strategy

### 4.1 One-liner

**Sec Scanner: DAST, который объясняет, а не просто находит.**

### 4.2 USP

Security Score (0-100) + Deterministic Explainability + ROI-отсортированные рекомендации — в одном SaaS за $29/мес. Ни один конкурент не предлагает эту комбинацию.

### 4.3 Целевые сегменты

| Приоритет | Сегмент | LTV (est.) | Почему |
|-----------|---------|------------|--------|
| P0 | Startup 5-20 devs | $700-1,200 | Наибольший pain, быстрое принятие решений |
| P0 | SMB 20-50 devs | $1,500-2,400 | Compliance needs, budget доступен |
| P1 | Individual Developer | $150-350 | Воронка + referral engine |
| P2 | Mid-Market 50-200 devs | $3,000-6,000 | Длинный sales cycle |
| P3 | Enterprise 200+ devs | $10,000+ | Не целевой сейчас |

### 4.4 Монетизация

| Tier | Цена | Для кого | Key limits |
|------|------|----------|------------|
| Free | $0 | Individual | 1 проект, 10 сканов/мес |
| Pro | $29/мес | Solo/micro-startup | 5 проектов, 100 сканов |
| Team | $79/мес | Startup 5-20 devs | 20 проектов, 10 members |
| Business | $199/мес | SMB 20-50 devs | Unlimited, SSO, 24h support |
| Enterprise | Custom | Mid-Market+ | White-label, dedicated, on-premise |

### 4.5 North Star Metric

**WASP (Weekly Active Scanning Projects)** — количество уникальных проектов, отсканированных хотя бы 1 раз за последние 7 дней.

## 5. Engineering Strategy

### 5.1 Architecture

Clean Architecture + Domain-Driven Design + Ports & Adapters.

```
┌─────────────────────────────────────────────────┐
│                  Clients                         │
│  Web │ API │ Telegram │ CLI │ AI │ Background   │
└──────────┬──────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────┐
│              Platform Layer                      │
│  Application Services (Ports)                   │
│  Scan │ SecurityState │ Explainability │ ...    │
└──────────┬──────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────┐
│              Domain Layer                         │
│  Security State Engine │ Explainability Layer   │
│  (Pure Functions, Strategy Pattern)              │
└─────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────┐
│            Infrastructure Layer                   │
│  Prisma/SQLite │ next-auth │ SSE │ Email │ ...   │
└─────────────────────────────────────────────────┘
```

### 5.2 Доменные модули (не изменять без явного разрешения)

| Модуль | Файлы | Описание | Статус |
|--------|-------|----------|--------|
| Security State Engine | `src/domain/security-state/` | Score, Risk, Trend, Confidence computation | Production-ready |
| Explainability Layer | `src/domain/explainability/` | Изменения, приоритеты, рекомендации, summaries | Production-ready |

### 5.3 Ключевые инженерные принципы

- **Domain Layer = zero framework dependencies.** Чистые TypeScript функции.
- **Strategy Pattern** для расширения: `ScoreStrategy`, `TrendStrategy`, `RecommendationStrategy`, `SummaryStrategy`.
- **Platform Layer** — единственная точка входа для всех клиентов. Не реализован (дизайн в PLATFORM_API_ARCHITECTURE.md).
- **API Keys** — `ssk_` prefix, SHA-256 storage, scopes.
- **Real-time** — SSE (Server-Sent Events) для scan completion push.

### 5.4 Текущие ограничения

- SQLite — не поддерживает concurrent writes при масштабе. Migration на PostgreSQL запланирована (M6-12).
- SSE in-memory — события теряются при restart. Redis pub/sub для M6+.
- Нет Application Layer — API routes напрямую вызывают Prisma (architecture leaks, см. PLATFORM_AUDIT.md).

## 6. Business Strategy

### 6.1 GTM подход

Product-Led Growth. Не Sales-Led. Self-service signup → free tier → content marketing → organic upgrade.

### 6.2 GTM Timeline (первые 90 дней)

| Фаза | Дни | Цель | Ключевые каналы |
|------|------|------|-----------------|
| Private Beta | 1-30 | 50 beta-users, 20+ active weekly | Personal outreach, HN, Reddit |
| Public Launch | 31-60 | 500 signups, 30 paying, $1K MRR | Product Hunt, GitHub open-core, HN follow-up |
| Growth | 61-90 | 1500 signups, 80 paying, $2.5K MRR | Email digest viral, integrations, YouTube |

### 6.3 Ключевые бизнес-метрики

| Метрика | M3 цель | M6 цель | M12 цель |
|---------|---------|---------|----------|
| WASP (North Star) | 50 | 150 | 500 |
| Activation Rate | 12% | 15% | 18% |
| MRR | $500 | $2,320 | $12,960 |
| Monthly Churn | < 12% | < 8% | < 5% |
| Paying Customers | 12 | 40 | 180 |

### 6.4 Ключевые риски

| # | Риск | Вероятность | Митигация |
|---|------|------------|-----------|
| R1 | Нет PMF | Высокая | Private Beta валидация (50 users) |
| R2 | AI-native конкурент | Высокая | Speed-to-market < 60 дней |
| R3 | DAST accuracy | Средняя | Transparent benchmark vs ZAP |
| R5 | Высокий churn | Высокая | Email digest + regression alerts |

## 7. Current Stage

**Stage:** Pre-revenue, Architecture Complete, Pre-Beta.

**Что реализовано:**
- [x] Domain Model (Security State Engine + Explainability Layer)
- [x] Platform Layer Design (документ, не код)
- [x] Multi-Channel Strategy
- [x] Platform API Architecture
- [x] Product Market Fit Blueprint
- [x] Project Operating System (этот документ)

**Что НЕ реализовано (блокеры для beta):**
- [ ] Landing Page + Signup Flow
- [ ] Demo Target (vulnerable app)
- [ ] GitHub OAuth
- [ ] Stripe Billing
- [ ] Email Notifications
- [ ] First Scan Optimisation (< 60 sec)
- [ ] Transparent Accuracy Benchmark

## 8. Current Sprint

**Текущий TASK:** TASK-012 (Project Operating System) — завершён.

**Следующий TASK:** Определяется Founder'ом. Рекомендация из PMF Blueprint:
1. Landing Page + Signup Flow (P0, 3-5 дней)
2. Demo Target (P0, 1-2 дня)
3. GitHub OAuth (P0, 1-2 дня)

## 9. Roadmap Summary

Полный Roadmap — в [PRODUCT_MARKET_FIT_BLUEPRINT.md](download/PRODUCT_MARKET_FIT_BLUEPRINT.md) §9.

**Ключевые milestones:**

| Срок | Milestone | Критерий успеха |
|------|-----------|-----------------|
| M1 | Private Beta Launch | 50 users, activation > 12% |
| M3 | First Revenue | $500 MRR, 12 paying |
| M6 | Product-Market Fit Signal | $2.3K MRR, churn < 8%, NRR > 90% |
| M9 | Series A Preparation | $7K+ MRR, 100+ paying, SOC 2 started |
| M12 | Seed/Transition | $13K MRR, 180 paying, NRR > 100% |

## 10. KPI Dashboard

### 10.1 Product KPIs

| Метрика | Определение | Текущее значение | Целевое (M3) |
|---------|-------------|-------------------|---------------|
| WASP | Projects scanned ≥1/week | 0 | 50 |
| Activation Rate | Users with 2+ scans in first week | N/A | 12% |
| Time to First Scan | Registration → first scan | N/A | < 3 мин |
| Scan Success Rate | Completed without error | N/A | > 85% |

### 10.2 Business KPIs

| Метрика | Текущее значение | Целевое (M3) |
|---------|-------------------|---------------|
| MRR | $0 | $500 |
| Paying Customers | 0 | 12 |
| Free Signups | 0 | 300 |
| Churn (monthly) | N/A | < 12% |

## 11. Operating Cycle

Каждый TASK следует стандартному циклу (подробно — ниже):

```text
1. CONTEXT    → Прочитать PROJECT_OS.md + связанные документы + worklog
2. SPECIFY    → Понять спецификацию TASK от Founder
3. PLAN       → Составить план (TodoWrite)
4. EXECUTE    → Реализовать код или документы
5. VERIFY     → Самопроверка по TASK спецификации
6. ARCHITECT  → Архитектурное ревью (если применимо)
7. PRODUCT    → Продуктовое ревью (если применимо)
8. DOCUMENT   → Обновить worklog, DECISION_LOG, DOCUMENT_AUDIT
9. HANDOFF    → Сформировать рекомендации для следующей итерации
```

## 12. Maturity Assessment

### 12.1 Шкала оценки

| Уровень | Название | Описание |
|---------|----------|----------|
| 1 | Initial | Ad-hoc процессы, нет стандартов |
| 2 | Managed | Базовые стандарты, повторяемые процессы |
| 3 | Defined | Стандартизированные процессы, документированы |
| 4 | Measured | Процессы измеряются, контролируются |
| 5 | Optimizing | Непрерывное улучшение на основе данных |

### 12.2 Текущая оценка (TASK-012)

| Dimension | Уровень | Обоснование |
|-----------|---------|-------------|
| **Architecture** | **4 (Measured)** | Clean Architecture реализована, аудирована (PLATFORM_AUDIT.md), designed для масштабирования. Минус: Application Layer не реализован. |
| **Code Quality** | **3 (Defined)** | Domain Layer — чистый, тестированный. Infrastructure — функциональный, но с architecture leaks. |
| **Security** | **3 (Defined)** | API keys, scopes, rate limiting, audit log реализованы. Но: SQLite, in-memory SSE, нет SSO. |
| **Performance** | **2 (Managed)** | Базовая оптимизация. Нет load testing, нет caching стратегии, SQLite bottleneck. |
| **UX** | **3 (Defined)** | ScoreGauge + Explainability widgets — уникальны. Но: 6-tab overload для first-time user (PMF Blueprint §10.4). |
| **Product** | **2 (Managed)** | PMF Blueprint существует, ICP определён, pricing разработана. Но: нет paying customers, нет validation. |
| **Business** | **2 (Managed)** | GTM стратегия существует, unit economics смоделированы. Но: $0 MRR, pre-revenue. |
| **Documentation** | **3 → 4 (Defined→Measured)** | 23 документа, но дублирование и плоская структура. После TASK-012: Project OS + стандарты + аудит. |

### 12.3 Debt Assessment

| Тип долга | Уровень | Детали |
|-----------|---------|--------|
| **Technical Debt** | Medium | ~45ч (TECH_DEBT.md), в основном: Application Layer не реализован, API routes напрямую к Prisma |
| **Architecture Debt** | Low | Domain Layer чист. Platform Layer спроектирован, не реализован. Это planned debt, не accidental. |
| **Business Debt** | High | Нет paying customers, нет PMF validation, нет landing page. Это blocking debt. |
| **Documentation Debt** | Medium | 23 документа, 14 require action (archive/update/merge). После TASK-012: снижен до Low. |

### 12.4 Правила перехода между уровнями

- **2 → 3:** Стандартизировать процессы (Project OS, Document Standards). ✓ Выполнено.
- **3 → 4:** Измерять процессы (метрики в PROJECT_OS.md, автоматический maturity assessment). ✓ Частично (метрики определены, автоматической оценки нет).
- **4 → 5:** Непрерывное улучшение на основе данных. Требует real users и real metrics.

## 13. Governance

### 13.1 Кто принимает решения

| Тип решения | Ответственная роль | Процесс |
|-------------|-------------------|---------|
| **Стратегические** (позиционирование, рынок, ценообразование) | CEO (Founder) | Спецификация TASK → Z.ai анализирует → CEO утверждает |
| **Архитектурные** (структура кода, технологии, паттерны) | CTO (Z.ai) | Z.ai предлагает → ChatGPT review → Founder утверждает |
| **Продуктовые** (features, UX, priorities) | CPO (Z.ai) | Z.ai предлагает → Founder утверждает |
| **Операционные** (документация, процессы, стандарты) | Engineering Manager (Z.ai) | Z.ai реализует, сообщает Founder |

### 13.2 Breaking changes

Breaking changes допускаются когда:
1. Предыдущий подход создаёт blocker для следующего TASK
2. Есть чёткий migration path
3. Изменение зафиксировано в DECISION_LOG.md
4. Связанные документы обновлены

**НЕ являются breaking changes:** добавление новых файлов, добавление новых функций, рефакторинг внутри модуля.

### 13.3 Создание новых документов

Новый документ создаётся когда:
1. Существует новая область знаний, не покрытая существующими документами
2. Существующий документ разросся > 2000 строк и требует разделения
3. TASK явно требует создания документа

Процесс: создать по DOCUMENT_STANDARDS.md → добавить в DOCUMENT_AUDIT.md → обновить PROJECT_OS.md ссылки.

### 13.4 Архивирование документов

Документ архивируется когда:
1. Статус изменён на Archived
2. Перемещён в `docs/archive/`
3. Все ссылки в активных документах обновлены (указывают на заменяющий документ)

### 13.5 Конфликтующие решения

Если два документа противоречат друг другу:
1. **Более новый документ имеет приоритет** (проверить по дате и версии)
2. **Стратегические документы > Инженерные** (если конфликт между уровнями)
3. **DECISION_LOG.md — арбитр** (если решение зафиксировано там)
4. Если конфликт не разрешается — эскалировать на Founder

### 13.6 Обновление Roadmap

Roadmap обновляется когда:
1. Завершён TASK с Roadmap-элементом — отметить как done
2. Новый TASK добавляет инициативу — добавить с оценкой ROI
3. Изменились приоритеты (market feedback, technical discovery) — пересчитать ROI
4. Ежеквартально — полный review всех инициатив

---

## 14. Document Index

### Активные документы

| Документ | Категория | Владелец | Описание |
|---------|-----------|----------|----------|
| [PROJECT_OS.md](download/PROJECT_OS.md) | Операционный | Eng Manager | Конституция проекта (этот документ) |
| [PRODUCT_MARKET_FIT_BLUEPRINT.md](download/PRODUCT_MARKET_FIT_BLUEPRINT.md) | Стратегия | CEO | PMF анализ, GTM, ICP, pricing, roadmap |
| [MULTI_CHANNEL_PRODUCT_STRATEGY.md](download/MULTI_CHANNEL_PRODUCT_STRATEGY.md) | Стратегия | CPO | Канальная стратегия (Web/Telegram/API) |
| [PLATFORM_API_ARCHITECTURE.md](download/PLATFORM_API_ARCHITECTURE.md) | Архитектура | CTO | Platform Layer дизайн, контракты, интеграции |
| [PLATFORM_AUDIT.md](download/PLATFORM_AUDIT.md) | Архитектура | CTO | Аудит текущей архитектуры, leaks, bottlenecks |
| [SECURITY_STATE_ENGINE.md](download/SECURITY_STATE_ENGINE.md) | Инженерия | CTO | Техническая документация Security State Engine |
| [EXPLAINABILITY_LAYER.md](download/EXPLAINABILITY_LAYER.md) | Инженерия | CTO | Архитектура Explainability Layer |
| [DOCUMENT_STANDARDS.md](download/DOCUMENT_STANDARDS.md) | Операционный | Eng Manager | Стандарты документации |
| [DECISION_LOG.md](download/DECISION_LOG.md) | Операционный | Eng Manager | Журнал архитектурных и продуктовых решений |
| [AI_OPERATING_MODEL.md](download/AI_OPERATING_MODEL.md) | Операционный | CTO | Правила взаимодействия AI-агентов |
| [DOCUMENT_AUDIT.md](download/DOCUMENT_AUDIT.md) | Операционный | Eng Manager | Аудит всей документации проекта |
| [DECISION_MANAGEMENT_FRAMEWORK.md](download/DECISION_MANAGEMENT_FRAMEWORK.md) | Операционный | Eng Manager | Corporate Memory: система управления решениями (taxonomy, lifecycle, metrics, knowledge graph) |
| [PRODUCT_READINESS_REPORT.md](download/PRODUCT_READINESS_REPORT.md) | Продукт | CPO | Комплексная оценка готовности к Private Beta (user journey, TTFV, competitive position) |
| [PRIVATE_BETA_CHECKLIST.md](download/PRIVATE_BETA_CHECKLIST.md) | Продукт | CPO | Чеклист готовности: 46 пунктов, 10 Blocking |
| [PRODUCT_MATURITY_SCORECARD.md](download/PRODUCT_MATURITY_SCORECARD.md) | Продукт | CPO | Оценка зрелости: 12 dimension, Overall 3.7/10 |
| [PRIVATE_BETA_ROADMAP.md](download/PRIVATE_BETA_ROADMAP.md) | Продукт | CPO | Roadmap до beta: 20 инициатив, 2 недели, Maturity 3.7→6.5 |
| [PRODUCT_INTELLIGENCE_FRAMEWORK.md](download/PRODUCT_INTELLIGENCE_FRAMEWORK.md) | Стратегия | CEO | Product Intelligence System: Success Model, Decision by Data, Founder Cockpit, Governance |
| [NORTH_STAR_METRIC.md](download/NORTH_STAR_METRIC.md) | Стратегия | CPO | North Star (WASP): обоснование, формула, leading indicators, guardrail metrics |
| [KPI_CATALOG.md](download/KPI_CATALOG.md) | Операционный | CPO | Полный каталог 28 метрик: AARRR (15), Product (4), Engineering (4), Business (5) |
| [GROWTH_DASHBOARD.md](download/GROWTH_DASHBOARD.md) | Стратегия | CPO | Dashboard Founder: 5 уровней (Executive/Product/Engineering/Business/Growth), Alerts, Gate Progress |
| [SUCCESS_GATES.md](download/SUCCESS_GATES.md) | Стратегия | CEO | 6 контрольных точек развития: Alpha → Beta → 50 users → 100 users → First Paid → PMF Signal |
| [WEEKLY_REVIEW_TEMPLATE.md](download/WEEKLY_REVIEW_TEMPLATE.md) | Операционный | Founder | Шаблон еженедельного обзора: Dashboard Update + 6 Key Questions + Gate Check + Experiments |
| [MONTHLY_BUSINESS_REVIEW.md](download/MONTHLY_BUSINESS_REVIEW.md) | Стратегия | CEO | Шаблон ежемесячного стратегического обзора: 13 разделов (Product, Users, Engineering, Marketing, Finances, Debts, Experiments) |
| [EXPERIMENT_PLAYBOOK.md](download/EXPERIMENT_PLAYBOOK.md) | Операционный | CPO | Процесс продуктовых экспериментов: гипотеза → test → decision, правила, примеры |
| [MASTER_EXECUTION_PLAN.md](download/MASTER_EXECUTION_PLAN.md) | Execution | CEO | Единый план разработки: DoR/DoD, Execution Rules, Self-Check (5 ролей) |
| [EXECUTION_BACKLOG.md](download/EXECUTION_BACKLOG.md) | Execution | CTO | Единый backlog: 25 задач с BV/EC/ROI, KPI, зависимости (16 в спринтах, 9 в backlog) |
| [SPRINT_01.md](download/SPRINT_01.md) | Execution | CTO | Sprint 01: Core Product Value (EX-001..005) — Gate 0 |
| [SPRINT_02.md](download/SPRINT_02.md) | Execution | CTO | Sprint 02: Beta Readiness (EX-006..011) — Gate 0→1 |
| [SPRINT_03.md](download/SPRINT_03.md) | Execution | CTO | Sprint 03: Launch + First Users (EX-012..015) — Gate 1 |
| [SPRINT_04.md](download/SPRINT_04.md) | Execution | CTO | Sprint 04: Learn + Iterate (EX-016) — Gate 2 progress |
| [MILESTONES.md](download/MILESTONES.md) | Execution | CEO | 6 milestones: Alpha → Beta → 50 Users → First Paid → PMF Signal |
| [DEPENDENCY_MAP.md](download/DEPENDENCY_MAP.md) | Execution | CTO | Карта зависимостей: критический путь (EX-002→006→012→014→016), параллелизируемые задачи |
| [BLOCKERS.md](download/BLOCKERS.md) | Execution | CTO | Активные блокеры: SMTP, DAST Scope, Demo Target, Landing Page |
| [FOUNDER_DASHBOARD.md](download/FOUNDER_DASHBOARD.md) | Execution | Founder | 5-минутный Dashboard: что/почему/блокеры/эффект/решения |

### Draft документы (требуют обновления)

| Документ | Категория | Примечание |
|---------|-----------|------------|
| BOUNDED_CONTEXTS.md | Архитектура | Полезен, обновить статус → Active |
| DOMAIN_MODEL_V2.md | Архитектура | Актуальная доменная модель, обновить статус → Active |
| EVENT_MODEL.md | Архитектура | Сохранить до реализации Domain Events |
| DASHBOARD_V2.md | Продукт | Сохранить до UI-редизайна |
| SECURITY_STATE.md | Архитектура | Частично перекрыт STATE_ENGINE.md |

### Архивированные документы

Перемещены в `docs/archive/` (рекомендация — выполнить после TASK-012):
- DOMAIN_MODEL.md (superseded by V2)
- PRODUCT_ARCHITECTURE.md (superseded by PLATFORM_*)
- ARCHITECTURE_AUDIT.md (superseded by PLATFORM_AUDIT.md)
- ROADMAP_V2.md (superseded by PMF Blueprint §9)
- REFACTOR_ROADMAP.md (superseded by PLATFORM_API_ARCH § Roadmap)
- TECH_DEBT.md (superseded by PLATFORM_AUDIT.md)
- DEPENDENCY_GRAPH.md (superseded by PLATFORM_API_ARCH)
- PRODUCT_VISION_V2.md (частично перекрыт PMF Blueprint)
- USER_FLOW.md (частично перекрыт PMF Blueprint §7)
- FIRST_VALUE_AUDIT.md (реализовано)
- FIRST_VALUE_EXPERIENCE.md (реализовано)
