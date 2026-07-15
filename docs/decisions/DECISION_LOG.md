# DECISION_LOG.md — Sec Scanner

> **Дата создания:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Операционный документ — журнал решений
> **Владелец:** Engineering Manager
> **Статус:** Active ( permanently active — обновляется каждый TASK)
> **Связанные документы:** PROJECT_OS.md, DOCUMENT_STANDARDS.md, DECISION_MANAGEMENT_FRAMEWORK.md, AI_OPERATING_MODEL.md

---

> **Примечание:** Полная система управления решениями определена в [DECISION_MANAGEMENT_FRAMEWORK.md](download/DECISION_MANAGEMENT_FRAMEWORK.md). Этот файл содержит исторические решения в формате v1. Новые решения должны создаваться по стандартному шаблону из Framework §3.

---

## Правила ведения (v1 — legacy)

> **Внимание:** С созданием DECISION_MANAGEMENT_FRAMEWORK.md этот документ переходит в режим «legacy storage». Существующие решения здесь остаются (исторический контекст). Новые решения создаются по стандартному шаблону из DECISION_MANAGEMENT_FRAMEWORK.md §3 и хранятся в этом файле (или в отдельных файлах при масштабировании).

1. Каждое значимое решение записывается здесь.
2. «Значимое» = влияет на архитектуру, продукт, или стратегию. Не фиксировать: выбор имени переменной, форматирование кода.
3. Формат: один блок на решение. Хронологический порядок (новые сверху).
4. При пересмотре решения — не удалять старое, добавить новый блок с ссылкой на предыдущий.
5. Новые решения должны следовать стандартному шаблону из DECISION_MANAGEMENT_FRAMEWORK.md §3 (полный или упрощённый для ODR).
6. Каждое решение должно иметь Success Metrics (измеримые критерии успеха).
7. Каждое решение должно иметь Review Date (дата следующего пересмотра).

---

## DECISION-EXEC-001: Master Execution Plan - Strategy to Backlog

- **Дата:** 2026-07-14
- **TASK:** EXEC-001
- **Тип:** [BDR] - Execution System
- **Статус:** Implemented
- **Owner (Role):** CEO
- **Approver:** Founder
- **Review Date:** 2026-10-14 (M3 - after Sprint 04)
- **Проблема:** 30+ roadmap items scattered across 5 documents, no unified backlog, no sprint plan, no dependencies mapped. Risk: team works on wrong things, misses blocking items, no path to first paying customer.
- **Рассмотренные варианты:**
  1. Continue with separate roadmaps per document (status quo)
  2. Create unified Master Execution Plan with consolidated backlog, 4 sprints, milestones
  3. Jira/Linear project management tool
- **Выбранное решение:** Вариант 2 - 10 internal documents. Jira/Linear deferred (cost, setup overhead at pre-revenue).
- **Обоснование:** Internal .md files versionable via git. Unified backlog prevents scope creep. 4-sprint plan gives clear 4-week trajectory. Every task has measurable business value and KPI.
- **Expected Benefits:** WIP=1 enforced. Every task traced to strategy. Critical path visible (EX-002 -> 006 -> 012 -> 014 -> 016). Founder Dashboard answers 5 questions in 5 min.
- **Trade-offs:** 10 new documents for maintenance. Sprint plan may need adjustment based on Sprint 01 learnings.
- **Risks:** DAST Engine (EX-002) is the critical path risk. If it takes > 5 days, the 4-week plan shifts. Mitigation: scope down to minimum viable checks.
- **Success Metrics:**
  - Primary: "All 16 Sprint 01-04 tasks completed within 4 weeks" - 100%
  - Secondary: "Gate 0 passed by end of Sprint 01" - yes/no
  - Tertiary: "WASP > 10 by end of Sprint 04" - confirms product value
- **Review Triggers:** Scheduled 2026-10-14. Early: if Sprint 01 extends > 10 days.
- **Related Decisions:** uses BDR-011 (PLG - requires measurable growth), uses BDR-GROWTH-001 (KPI system for measurement), defers ADR-010 (Platform Layer - architecture debt)
- **Ответственные роли:** CEO, CTO

---

## DECISION-GROWTH-001: Product Intelligence & Growth Operating System

- **Дата:** 2026-07-14
- **TASK:** GROWTH-001
- **Тип:** [BDR] - Business Operating System
- **Статус:** Implemented
- **Owner (Role):** CEO
- **Approver:** Founder
- **Review Date:** 2026-10-14 (M3)
- **Проблема:** Проект переходит от инженерного управления к управлению продуктом. Нет единой системы метрик, нет критериев перехода между этапами, решения принимаются интуитивно.
- **Рассмотренные варианты:**
  1. Использовать существующие KPI из PROJECT_OS.md (incremental)
  2. Создать полную Product Intelligence System с 8 документами
  3. Внедрить внешнюю аналитическую платформу (Amplitude/Mixpanel)
- **Выбранное решение:** Вариант 2 - 8 внутренних документов: Framework, North Star, KPI Catalog, Dashboard, Gates, Weekly/Monthly Reviews, Experiment Playbook.
- **Обоснование:** Внутренние .md документы versionable через git. Внешние платформы создают dependency и cost на pre-revenue стадии. Incremental подход не создаёт system thinking.
- **Expected Benefits:** Каждое решение основано на данных. Founder тратит 5 мин/неделю на понимание состояния продукта. Чёткие критерии PMF (Gate 5).
- **Trade-offs:** 8 новых документов для поддержки. Overhead на Weekly/Monthly Reviews (~1.5 часа/месяц).
- **Risks:** Overhead на reviews может быть слишком высоким для solo founder. Митигация: Weekly Review = 30 мин, Monthly = 60 мин. Manual dashboard на первом этапе.
- **Success Metrics:**
  - Primary: "Weekly Review проводится каждую неделю без пропусков" - 100% к M3
  - Secondary: "Каждое Data-Required Decision имеет baseline + post-measurement" - 100% к M3
  - Tertiary: "WASP target достигнут (50 к M3)" - подтверждает, что система работает
- **Review Triggers:** Scheduled 2026-10-14. Early: если Weekly Review пропускается 2+ недели подряд.
- **Related Decisions:** extends BDR-011 (Product-Led Growth - требует метрик для валидации), extends BDR-012 (Project OS - добавляет measurement layer), uses ADR-007 (Score + Explainability как First Value - WASP зависит от этого)

---

## DECISION-OS-003: Decision Management Framework — Corporate Memory

- **Дата:** 2026-07-14
- **TASK:** OS-003
- **Тип:** [BDR] — Corporate Memory System
- **Статус:** Implemented
- **Owner (Role):** Engineering Manager
- **Approver:** Founder
- **Review Date:** 2026-10-14 (M3)
- **Проблема:** DECISION_LOG.md v1 фиксирует решения, но без метрик успеха, сроков ревизии, связей между решениями и статусов. Через год невозможно оценить, почему решения были приняты и оправдались ли они.
- **Рассмотренные варианты:**
  1. Дополнить DECISION_LOG.md новыми полями (incremental)
  2. Создать отдельный Framework-документ с полной системой управления решениями
  3. Использовать внешние инструменты (Notion, Confluence, ADR tools)
- **Выбранное решение:** Вариант 2 — DECISION_MANAGEMENT_FRAMEWORK.md как корпоративная память.
- **Обоснование:** Отдельный документ позволяет создать полноценную систему (taxonomy, lifecycle, metrics, knowledge graph) без перегрузки DECISION_LOG. Внешние инструменты создают dependency. Локальный .md versionable через git.
- **Expected Benefits:** Каждое решение измеримо. Новые участники понимают «почему» за 15-20 минут. Устаревшие решения обнаруживаются автоматически через Review Dates.
- **Trade-offs:** Дополнительный документ для поддержки. Более сложный процесс создания решений (больше полей).
- **Risks:** Overhead на создание решений может замедлить разработку. Митигация: упрощённый шаблон для ODR.
- **Success Metrics:**
  - Primary: «Каждое новое решение имеет Success Metrics» — 100% к M3
  - Secondary: «Все решения с Review Date ≤ M3 reviewed» — 100% к M3
- **Review Triggers:** Scheduled 2026-10-14. Early: если overhead создания решений > 15 мин на решение.
- **Related Decisions:** extends BDR-012 (Project OS), extends BDR-OS-002 (AI Operating Model)
- **Ответственные роли:** Engineering Manager, CTO

---

## DECISION-OS-002: AI Operating Model v2 — от инструкций к регламенту

- **Дата:** 2026-07-14
- **TASK:** OS-002
- **Тип:** [BDR] — Operating Model как бизнес-процесс
- **Проблема:** AI_OPERATING_MODEL.md v1 (175 строк) определял только базовые правила взаимодействия агентов. Не было жизненного цикла задач, стандартов качества, приоритизации, Release Lifecycle. Документ был инструкцией для AI, а не регламентом разработки продукта.
- **Рассмотренные варианты:**
  1. Дополнить v1 новыми разделами (incremental)
  2. Переписать с нуля как полноценный Operating Model
  3. Создать отдельные документы для каждого процесса (DoR, DoD, Lifecycle и т.д.)
- **Выбранное решение:** Вариант 2 — полный перепис с сохранением сильных сторон v1. Один документ как единый регламент, а не набор разрозненных процессов.
- **Обоснование:** Единый документ проще поддерживать и обновлять. Quick Reference Card (Приложение A) решает проблему объёма. Разделение на 15 секций + 3 приложения создаёт чёткую навигацию.
- **Последствия:** AI Operating Model перестаёт быть «инструкцией для AI» и становится официальным регламентом разработки. Любая новая задача должна проходить через описанные процессы. Объём вырос с 175 до 1117 строк, но Quick Reference Card позволяет быструю ориентацию.
- **Ответственные роли:** CTO, Engineering Manager

---

## DECISION-012: Project OS вместо набора документов

- **Дата:** 2026-07-14
- **TASK:** TASK-012
- **Проблема:** 23 документа в плоской директории, дублирование, нет единого источника истины. Новому участнику невозможно быстро понять проект.
- **Рассмотренные варианты:**
  1. Продолжать добавлять документы в `download/` — status quo
  2. Создать `docs/` с категориями и стандартами
  3. Конфлюенс/Notion — отдельная платформа для документации
- **Выбранное решение:** Вариант 2 — создать `docs/` структуру внутри проекта с PROJECT_OS.md как конституцией. Стандарты в DOCUMENT_STANDARDS.md.
- **Обоснование:** Документация должна жить рядом с кодом. Внешние платформы (Notion) создают friction и dependency. Локальные .md файлы versionable через git.
- **Последствия:** Требуется миграция существующих документов, обновление ссылок, привыкание команды к новым стандартам.
- **Ответственные роли:** Engineering Manager, CTO

## DECISION-011: Product-Led Growth, не Sales-Led

- **Дата:** 2026-07-14
- **TASK:** TASK-011
- **Проблема:** Как выходить на рынок — через sales team или через product?
- **Рассмотренные варианты:**
  1. Sales-led: нанять SDR, холодные звонки CTO
  2. Product-led: free tier → self-service upgrade → content marketing
  3. Hybrid: sales для Enterprise, product-led для SMB
- **Выбранное решение:** Вариант 2 — Product-Led Growth. Enterprise sales (вариант 3) отложен до $5K+ MRR.
- **Обоснование:** Нет бюджета на sales team. Целевая аудитория (startup CTO) ненавидит «Contact Sales». Self-service = масштабируемость.
- **Последствия:** Landing page, pricing page, onboarding — всё self-service. Контент-маркетинг > outbound.
- **Ответственные роли:** CEO, VP Marketing, Head of Sales

## DECISION-010: Platform Layer как единая точка входа

- **Дата:** 2026-07-14
- **TASK:** TASK-010
- **Проблема:** API routes напрямую вызывают Prisma и доменные модули (architecture leaks). Новые клиенты (Telegram, CLI, API) не могут подключиться без дублирования логики.
- **Рассмотренные варианты:**
  1. Добавить адаптеры для каждого клиента прямо в API routes
  2. Создать Application Layer (Platform Layer) между routes и domain
  3. Микросервисная архитектура с отдельным API gateway
- **Выбранное решение:** Вариант 2 — Platform Layer (Application Services) по Clean Architecture.
- **Обоснование:** Минимальные изменения архитектуры. Domain Layer остаётся чистым. Все 7 типов клиентов подключаются через Platform Layer.
- **Последствия:** Требуется реализация 7 application services, но это можно делать incrementally. Никуда не деплоить до готовности.
- **Ответственные роли:** CTO

## DECISION-009: Email Digest > Telegram Mini App

- **Дата:** 2026-07-14
- **TASK:** TASK-009
- **Проблема:** Стоит ли делать Telegram Mini App как канал?
- **Рассмотренные варианты:**
  1. Telegram Mini App (ROI 4.3/10)
  2. Email Weekly Digest (ROI 7.5/10)
  3. Оба одновременно
- **Выбранное решение:** Email Digest приоритет, Telegram Mini App отложен на 4-6 месяцев.
- **Обоснование:** ROI Mini App ниже порога (6.0). Email Digest: шире аудитория, выше retention impact, меньше engineering cost. Telegram Bot (push alerts) остаётся в roadmap.
- **Последствия:** Не тратить ресурсы на Mini App. Направить усилия на Email + Web.
- **Ответственные роли:** CPO, CTO

## DECISION-008: (пропущен в текущей истории)

## DECISION-007: First Value Experience — explainability как ценность

- **Дата:** 2026-07-14
- **TASK:** TASK-007
- **Проблема:** Как показать ценность продукта за первый визит?
- **Рассмотренные варианты:**
  1. Скорость сканирования
  2. Количество найденных уязвимостей
  3. Security Score + Explainability
- **Выбранное решение:** Вариант 3 — Security Score с Explainability widgets.
- **Обоснование:** Скорость и количество — commodity. Score + объяснение = уникальная ценность.
- **Последствия:** Onboarding фокусируется на Score Gauge и Explainability, а не на списке findings.
- **Ответственные роли:** CPO, Product Designer

## DECISION-006: Deterministic Explainability, не AI-generated

- **Дата:** 2026-07-14
- **TASK:** TASK-006
- **Проблема:** Как объяснять Security Score — через AI (LLM) или детерминированные функции?
- **Рассмотренные варианты:**
  1. AI-generated объяснения (LLM)
  2. Детерминированные вычислимые объяснения (чистые функции)
  3. Гибрид: детерминированные + AI enhancement
- **Выбранное решение:** Вариант 2 — полностью детерминированный Explainability Layer. AI как optional enhancement в будущем (вариант 3).
- **Обоснование:** Воспроизводимость — критична для security. AI галлюцинирует. Детерминированный подход создаёт moat (сложно воспроизвести). AI можно добавить позже через Strategy Pattern.
- **Последствия:** Explainability Layer на чистых функциях с Strategy interfaces. Требует больше engineering effort, но результат надёженнее.
- **Ответственные роли:** CTO, CPO

## DECISION-005: Security State Engine — чистые функции

- **Дата:** 2026-07-14
- **TASK:** TASK-005
- **Проблема:** Как вычислять Security Score — монолитный сервис или модуль чистых функций?
- **Рассмотренные варианты:**
  1. Сервис-класс с методами
  2. Модуль чистых функций + Strategy Pattern
  3. External rules engine (JSON/YAML config)
- **Выбранное решение:** Вариант 2 — чистые функции с ScoreStrategy, TrendStrategy, ConfidenceStrategy interfaces.
- **Обоснование:** Тестируемость, расширяемость, zero framework dependency. Strategy Pattern позволяет добавлять новые алгоритмы без изменения существующего кода (OCP).
- **Последствия:** Domain layer полностью изолирован. Score computation можно вызывать из любого контекста (API, worker, test).
- **Ответственные роли:** CTO

## DECISION-004: Bounded Contexts для доменной модели

- **Дата:** 2026-07-14
- **TASK:** TASK-004
- **Проблема:** Доменная модель растёт, нужна декомпозиция.
- **Рассмотренные варианты:**
  1. Единый доменный модуль
  2. Bounded Contexts (DDD): Security State, Explainability, Scanning, Team, Billing
  3. Микросервисы с отдельными БД
- **Выбранное решение:** Вариант 2 — Bounded Contexts в рамках монорепозитория. Микросервисы (вариант 3) отложены.
- **Обоснование:** Чистая декомпозиция без operational complexity. Каждый context имеет свой интерфейс.
- **Последствия:** 5 bounded contexts, каждый с собственными типами и интерфейсами.
- **Ответственные роли:** CTO

## DECISION-003: Flat pricing, не per-developer

- **Дата:** 2026-07-14
- **TASK:** TASK-011 (формализовано)
- **Проблема:** Как ценообразовать — за каждого разработчика или фиксированная цена?
- **Рассмотренные варианты:**
  1. Per-developer (как Snyk $25/dev/мес)
  2. Flat per tier (как Sec Scanner $29/79/199/мес)
  3. Usage-based (per scan)
- **Выбранное решение:** Вариант 2 — Flat pricing по tiers.
- **Обоснование:** Startup'ы ненавидят непредсказуемые расходы. Flat pricing стимулирует приглашать всю команду (больше users = выше switching cost = ниже churn).
- **Последствия:** Меньше revenue per user при масштабе, но выше conversion и retention.
- **Ответственные роли:** CEO, Head of Sales

## DECISION-002: SQLite → PostgreSQL migration (отложено)

- **Дата:** 2026-07-14
- **TASK:** TASK-010 (определено)
- **Проблема:** SQLite не поддерживает concurrent writes при масштабе.
- **Рассмотренные варианты:**
  1. Мигрировать на PostgreSQL немедленно
  2. Остаться на SQLite с WAL mode + connection pooling
  3. Отложить миграцию до M6-12
- **Выбранное решение:** Вариант 2 сейчас, вариант 3 для масштабирования.
- **Обоснование:** SQLite достаточно для beta (< 100 concurrent users). PostgreSQL migration — expensive, отвлекает от GTM. Platform Layer (Ports & Adapters) делает будущую миграцию безопасной.
- **Последствия:** Roadmap #21 (M6-12) — PostgreSQL migration.
- **Ответственные роли:** CTO

## DECISION-001: Next.js 16 + Prisma + SQLite как initial stack

- **Дата:** 2026-07-14
- **TASK:** TASK-001 (предположительно)
- **Проблема:** Выбор технологического стека.
- **Рассмотренные варианты:**
  1. Next.js 16 + Prisma + SQLite
  2. Next.js + Drizzle + PostgreSQL
  3. FastAPI + React SPA
- **Выбранное решение:** Вариант 1.
- **Обоснование:** Максимальная скорость разработки (solo/small team). SQLite — zero-config. Prisma — type-safe ORM. Next.js — SSR + API routes в одном фреймворке.
- **Последствия:** Future migration path: SQLite → PostgreSQL. Prisma делает это относительно безболезненным.
- **Ответственные роли:** CTO
