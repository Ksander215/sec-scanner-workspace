# AI Context — Security Intelligence Platform

> Документ для быстрого погружения AI-агента в контекст проекта.

## Что это за проект

AI-Native Security Intelligence Platform — платформа анализа безопасности веб-приложений нового поколения. Не очередной DAST-сканер, а интеллектуальная система, которая строит единую модель знаний, коррелирует данные из разных источников, оценивает риски и генерирует объяснимые рекомендации.

## Текущий статус

| Этап | Статус |
|------|--------|
| EPIC-01: Discovery & Scanning | DONE |
| TASK-201: Attack Surface Model | DONE |
| TASK-202A-F: Intelligence Modules | DONE |
| KG-001: Security Knowledge Graph | IN PROGRESS |
| EPIC-04 / INT-001: Security Intelligence Engine | CURRENT TASK |
| EPIC-05+: Будущие этапы | PLANNED |

## Ключевые архитектурные принципы

1. **Clean Architecture** — слои: домен, приложение, инфраструктура
2. **DDD** — модель вокруг предметной области безопасности
3. **Plugin Architecture** — движки через Plugin API, ядро не знает реализаций
4. **Event Driven** — Artifact Bus, слабая связность
5. **Immutable Models** — артефакты неизменяемы после создания
6. **Engine Agnostic** — Nuclei лишь один из адаптеров
7. **Test First** — TDD, покрытие >= 90%
8. **Deterministic & Explainable** — НЕ используем LLM/ML для аналитики

## Критически важные CTO-указания

> SIE — это НЕ AI/LLM модуль. Все аналитические компоненты детерминированы и воспроизводимы. Никакой недетерминированности.

> Главная цепочка: Knowledge → Intelligence → Explainability → Action

> Knowledge Graph — единый источник истины. Все данные — через KG.

## Неизменяемые модули (DO NOT MODIFY)

- `core/domain/` — доменные модели и события
- `core/application/` — use cases и порты
- `plugins/nuclei/` — Nuclei адаптер
- `plugins/browser-intelligence/` — Browser Intelligence
- `plugins/http-intelligence/` — HTTP Intelligence
- `core/attack-surface/` — Attack Surface Model
- `infrastructure/artifact-bus/` — событийная шина

## Текущая задача: EPIC-04 / INT-001

Security Intelligence Engine Foundation — шесть компонентов:

1. **Rule Engine** — оценка правил корреляции над графом знаний
2. **Correlation Engine** — выявление связей между находками
3. **Attack Path Builder** — построение цепочек атак
4. **Risk Aggregator** — агрегация рисков с детерминированным scoring
5. **Confidence Calculator** — расчёт достоверности находок
6. **Recommendation Engine** — генерация рекомендаций

## Где искать информацию

| Документ | Расположение |
|----------|-------------|
| Полный Handoff | [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md) |
| Решения CTO | [CTO_DECISIONS.md](./CTO_DECISIONS.md) |
| Инженерная память | [ENGINEERING_MEMORY.md](./ENGINEERING_MEMORY.md) |
| Видение | [VISION.md](./VISION.md) |
| Архитектура (PDF) | [../assets/pdf/PROJECT_HANDOFF.pdf](../assets/pdf/PROJECT_HANDOFF.pdf) |
| Диаграммы | [../diagrams/](../diagrams/) |
