# Changelog — Security Intelligence Platform

Все значимые изменения в документации рабочего пространства.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

## [0.1.0] - 2026-07-15

### Added

- **PROJECT_HANDOFF.md** — полный документ передачи контекста проекта (14 разделов)
  - Главная цель проекта
  - Архитектурные принципы (7 принципов)
  - Реализованные компоненты (EPIC-01, TASK-201, TASK-202A-F)
  - Архитектура платформы (схема в Mermaid)
  - Security Knowledge Graph (KG-001)
  - Security Intelligence Engine (EPIC-04 / INT-001)
  - SIE — компонентная архитектура (6 компонентов)
  - Интеллектуальный поток
  - Правила корреляции и Attack Path
  - Ограничения и неизменяемые модули
  - Roadmap
  - Definition of Done
  - Глоссарий
  - ADR шаблоны

- **AI_CONTEXT.md** — быстрый контекст для AI-агента
  - Текущий статус проекта
  - Ключевые архитектурные принципы
  - CTO-указания
  - Неизменяемые модули
  - Текущая задача (EPIC-04)
  - Навигация по документам

- **ENGINEERING_MEMORY.md** — инженерная память проекта
  - Стек технологий
  - Выполненные EPIC и TASK
  - Известные проблемы и решения
  - Соглашения по коду
  - ADR реестр

- **CTO_DECISIONS.md** — реестр ключевых решений CTO
  - #1: AI-Native, но не LLM-зависимый
  - #2: Цепочка ценности Knowledge → Intelligence → Explainability → Action
  - #3: Knowledge Graph — единый источник истины
  - #4: Plugin Architecture для движков
  - #5: Event Driven через Artifact Bus
  - #6: SIE — детерминированный анализ
  - #7: Immutable Domain Models

- **VISION.md** — стратегическое видение продукта
  - Миссия и проблема
  - Семь слоёв ценности
  - Дифференциация от DAST-сканеров
  - Целевая аудитория
  - Метрики успеха

- **PROJECT_HANDOFF.pdf** — PDF-версия документа (22 страницы, Tech Dark тема)
- **PROJECT_HANDOFF.html** — HTML-версия документа (Tech Dark тема)
- **handoff_platform_architecture.svg** — схема архитектуры платформы
- **intelligence_engine.svg** — компонентная архитектура SIE
- **roadmap.svg** — дорожная карта проекта
- **README.md** — описание проекта и навигация
- **INDEX.md** — индекс документов рабочего пространства
- **CHANGELOG.md** — данный файл
