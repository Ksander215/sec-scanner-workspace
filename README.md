# Security Intelligence Platform

AI-Native платформа анализа безопасности веб-приложений нового поколения.

## О проекте

Security Intelligence Platform — это не очередной DAST-сканер. Это интеллектуальная система, которая:

- Строит **единую модель знаний** (Security Knowledge Graph)
- **Коррелирует** находки из разных источников
- **Оценивает риски** с учётом контекста приложения
- **Строит цепочки атак** (Attack Paths)
- Предоставляет **объяснимые рекомендации**

> Knowledge → Intelligence → Explainability → Action

## Текущий статус

| Компонент | Статус |
|-----------|--------|
| EPIC-01: Discovery & Scanning | ✅ DONE |
| TASK-201: Attack Surface Model | ✅ DONE |
| TASK-202A-F: Intelligence Modules | ✅ DONE |
| KG-001: Security Knowledge Graph | ✅ RFC APPROVED |
| EPIC-04 / INT-001: Security Intelligence Engine | 📋 PENDING INT-001 |
| EPIC-05+: Explainability & Dashboard | 📋 PLANNED |

## Документация

### Governance (управление проектом)

| Документ | Описание |
|----------|----------|
| [PROJECT_HANDOFF.md](./docs/00_governance/PROJECT_HANDOFF.md) | Полный документ передачи контекста проекта |
| [AI_CONTEXT.md](./docs/00_governance/AI_CONTEXT.md) | Быстрый контекст для AI-агента |
| [ENGINEERING_MEMORY.md](./docs/00_governance/ENGINEERING_MEMORY.md) | Инженерная память: решения, соглашения, уроки |
| [CTO_DECISIONS.md](./docs/00_governance/CTO_DECISIONS.md) | Реестр ключевых решений CTO |
| [VISION.md](./docs/00_governance/VISION.md) | Стратегическое видение продукта |
| [ARCHITECTURE_BASELINE_v1.1.md](./docs/00_governance/ARCHITECTURE_BASELINE_v1.1.md) | Архитектурная база v1.1 |

### Architecture (архитектурные RFC)

| Документ | Описание |
|----------|----------|
| [RFC-001: SIE](./docs/01_architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md) | Архитектура Security Intelligence Engine |
| [RFC-001 Review](./docs/01_architecture/RFC_REVIEW_REPORT.md) | Отчёт ревью SIE (4 роли) |
| [KG-001: Knowledge Graph](./docs/01_architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md) | Архитектура Knowledge Graph Platform |
| [KG-001 Review](./docs/01_architecture/KG_ARCHITECTURE_REVIEW_REPORT.md) | Отчёт ревью KG (5 ролей) |

### Ассеты

| Файл | Описание |
|------|----------|
| [PROJECT_HANDOFF.pdf](./docs/assets/pdf/PROJECT_HANDOFF.pdf) | PDF-версия документа передачи |
| [PROJECT_HANDOFF.html](./docs/assets/html/PROJECT_HANDOFF.html) | HTML-версия (Tech Dark тема) |

### Диаграммы

| Диаграмма | Описание |
|-----------|----------|
| [Platform Architecture](./docs/diagrams/handoff_platform_architecture.svg) | Архитектура платформы |
| [Intelligence Engine](./docs/diagrams/intelligence_engine.svg) | Компонентная архитектура SIE |
| [Roadmap](./docs/diagrams/roadmap.svg) | Дорожная карта проекта |

## Архитектурные принципы

- **Clean Architecture** — домен, приложение, инфраструктура
- **DDD** — модель вокруг предметной области безопасности
- **Plugin Architecture** — движки через Plugin API
- **Event Driven** — Artifact Bus для слабой связности
- **Immutable Models** — артефакты неизменяемы
- **Deterministic & Explainable** — НЕ LLM/ML в ядре

## Быстрый старт для нового AI-агента

1. Прочитай [AI_CONTEXT.md](./docs/00_governance/AI_CONTEXT.md) — быстрый контекст
2. Прочитай [CTO_DECISIONS.md](./docs/00_governance/CTO_DECISIONS.md) — непреложные решения
3. Прочитай [PROJECT_HANDOFF.md](./docs/00_governance/PROJECT_HANDOFF.md) — полный контекст
4. Изучи [ENGINEERING_MEMORY.md](./docs/00_governance/ENGINEERING_MEMORY.md) — накопленный опыт

## Индекс документов

См. [INDEX.md](./INDEX.md) для полного перечня документов.

## Changelog

См. [CHANGELOG.md](./CHANGELOG.md) для истории изменений.
