#!/usr/bin/env python3
"""Create all governance documents and SVG diagrams for the sec-scanner-workspace repo."""

import os

BASE = "/home/z/my-project/sec-scanner-workspace"

# ═══════════════════════════════════════════════════════════════
# AI_CONTEXT.md
# ═══════════════════════════════════════════════════════════════
AI_CONTEXT = """# AI Context — Security Intelligence Platform

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
"""

# ═══════════════════════════════════════════════════════════════
# ENGINEERING_MEMORY.md
# ═══════════════════════════════════════════════════════════════
ENGINEERING_MEMORY = """# Engineering Memory — Security Intelligence Platform

> Инженерная память проекта: накопленные решения, известные проблемы, соглашения и уроки.

## Стек технологий

| Слой | Технология | Примечание |
|------|-----------|------------|
| Язык | Python 3.12+ | Основной язык платформы |
| Доменные модели | Pydantic v2 | Валидация и сериализация |
| События | Artifact Bus (asyncio) | Внутренняя событийная шина |
| Plugin API | Абстрактные классы + Registry | Каждый движок — plugin |
| Граф знаний | NetworkX (текущий) → Neo4j (planned) | KG-001 в процессе |
| Тестирование | pytest + coverage | Покрытие >= 90% |
| CI/CD | GitHub Actions | Автоматические проверки |

## Выполненные EPIC и TASK

### EPIC-01: Discovery & Scanning Foundation (DONE)
- Реализован Discovery Engine с Plugin API
- Подключены Nuclei, Browser Intelligence, HTTP Intelligence
- Настроен Artifact Bus для событийного обмена
- Attack Surface Model формирует структуру приложения

### TASK-201: Attack Surface Model (DONE)
- Модель представления поверхности атаки
- Endpoint, Parameter, Header, Cookie модели
- Связи между элементами через граф

### TASK-202A-F: Intelligence Modules (DONE)
- 202A: Nuclei Plugin — интеграция сканера
- 202B: Browser Intelligence Plugin — анализ через браузер
- 202C: HTTP Intelligence Plugin — HTTP-level анализ
- 202D: Result Normalizer — нормализация результатов
- 202E: Artifact Bus — событийная шина
- 202F: Pipeline Orchestrator — оркестрация конвейера

## Известные проблемы и решения

### Проблема: Нормализация данных из разных источников
**Решение:** Result Normalizer приводит все находки к единому формату через абстрактный интерфейс `FindingPort`. Каждый plugin реализует свой адаптер.

### Проблема: Слабая связность между компонентами
**Решение:** Event Driven архитектура через Artifact Bus. Компоненты публикуют события, подписчики обрабатывают асинхронно.

### Проблема: Тестируемость доменной логики
**Решение:** Clean Architecture с инверсией зависимостей. Бизнес-логика в `core/domain/`, инфраструктура подключается через порты.

## Соглашения по коду

- Все доменные модели — Pydantic BaseModel с `frozen=True` (неизменяемость)
- Все интерфейсы — абстрактные классы с `abc.ABC`
- Именование: `snake_case` для файлов и функций, `PascalCase` для классов
- События именуются `<Сущность><Действие>Event` (например, `ScanCompletedEvent`)
- Тесты рядом с кодом: `tests/` дублирует структуру `src/`
- Docstrings на английском, комментарии могут быть на русском

## ADR (Architecture Decision Records)

При каждом значимом архитектурном решении создаётся ADR по шаблону:

- **ADR-SIE-001**: Rule Engine — декларативные правила над графом
- **ADR-SIE-002**: Correlation Engine — графовый обход для связей
- **ADR-SIE-003**: Attack Path Builder — DFS/BFS с ограничением глубины
- **ADR-SIE-004**: Risk Aggregator — взвешенная сумма с confidence
- **ADR-SIE-005**: Confidence Calculator — Multi-factor credibility scoring
- **ADR-SIE-006**: Recommendation Engine — шаблонный генератор рекомендаций
"""

# ═══════════════════════════════════════════════════════════════
# CTO_DECISIONS.md
# ═══════════════════════════════════════════════════════════════
CTO_DECISIONS = """# CTO Decisions — Security Intelligence Platform

> Регистр ключевых решений CTO. Эти решения имеют приоритет над любыми другими соображениями.

## Решение #1: AI-Native, но не LLM-зависимый

**Дата:** Начало проекта
**Контекст:** Платформа позиционируется как AI-Native, но использование LLM в ядре аналитики создаёт недетерминированность.
**Решение:** AI-Native означает интеллектуальный анализ, но НЕ через LLM/ML. Все аналитические модули — детерминированные алгоритмы с воспроизводимыми результатами.
**Обоснование:** Без воспроизводимости невозможна верификация, аудит и доверие к результатам безопасности.
**Статус:** FINAL

---

## Решение #2: Цепочка ценности Knowledge → Intelligence → Explainability → Action

**Дата:** Начало проекта
**Контекст:** Необходим чёткий порядок построения возможностей платформы.
**Решение:** Платформа строится строго по слоям:
1. **Knowledge** — Security Knowledge Graph как единый источник истины
2. **Intelligence** — Security Intelligence Engine для корреляции и анализа
3. **Explainability** — Объяснимость каждого вывода
4. **Action** — Конкретные рекомендации и действия
**Обоснование:** Нельзя строить Intelligence без Knowledge. Нельзя давать рекомендации без объяснимости.
**Статус:** FINAL

---

## Решение #3: Knowledge Graph — единый источник истины

**Дата:** Начало проекта
**Контекст:** Данные поступают из множества источников (Nuclei, Browser, HTTP).
**Решение:** Все данные должны быть нормализованы и загружены в Security Knowledge Graph. Никакой компонент не читает данные напрямую из источников — только через KG.
**Обоснование:** Единая модель знаний обеспечивает целостность, устраняет дублирование и позволяет строить связи.
**Статус:** FINAL

---

## Решение #4: Plugin Architecture для движков сканирования

**Дата:** EPIC-01
**Контекст:** Необходима поддержка разных сканирующих движков без модификации ядра.
**Решение:** Каждый движок реализует Plugin API (абстрактный интерфейс). Ядро знает только о контрактах, не о реализациях. Nuclei — первый plugin, не единственный.
**Обоснование:** Расширяемость без модификации, соответствие Open/Closed Principle.
**Статус:** FINAL

---

## Решение #5: Event Driven через Artifact Bus

**Дата:** EPIC-01
**Контекст:** Компоненты должны работать асинхронно и независимо.
**Решение:** Все взаимодействия через Artifact Bus — внутреннюю событийную шину. Компоненты публикуют и подписываются на события. Никаких прямых вызовов между модулями.
**Обоснование:** Слабая связность, масштабируемость, возможность добавления новых подписчиков без изменения существующих.
**Статус:** FINAL

---

## Решение #6: SIE — детерминированный анализ

**Дата:** EPIC-04
**Контекст:** Разработка Security Intelligence Engine — основного аналитического слоя.
**Решение:** Все 6 компонентов SIE (Rule Engine, Correlation Engine, Attack Path Builder, Risk Aggregator, Confidence Calculator, Recommendation Engine) — детерминированные алгоритмы. Одинаковый вход всегда даёт одинаковый выход.
**Обоснование:** Результаты анализа безопасности должны быть воспроизводимыми, верифицируемыми и пригодными для аудита.
**Статус:** FINAL

---

## Решение #7: Immutable Domain Models

**Дата:** Начало проекта
**Контекст:** Необходимость обеспечения целостности данных.
**Решение:** Все доменные модели неизменяемы (frozen Pydantic models). Результаты сканирования, артефакты и аналитические выводы не могут быть модифицированы после создания. Для обновлений создаются новые версии.
**Обоснование:** Предотвращение побочных эффектов, потокобезопасность, аудитоспособность.
**Статус:** FINAL
"""

# ═══════════════════════════════════════════════════════════════
# VISION.md
# ═══════════════════════════════════════════════════════════════
VISION = """# Vision — Security Intelligence Platform

> Стратегическое видение продукта и его место в рынке.

## Миссия

Создать интеллектуальную платформу анализа безопасности, которая не просто находит уязвимости, а понимает связи между ними, оценивает реальный риск и предоставляет объяснимые рекомендации для устранения.

## Проблема

Традиционные DAST-сканеры обладают критическими ограничениями:

1. **Изолированные находки** — сканер видит каждую уязвимость отдельно, без контекста
2. **Шум и ложные срабатывания** — сотни находок низкого качества без приоритизации
3. **Нет понимания риска** — CVSS-скоринг не учитывает контекст приложения
4. **Нет объяснимости** — «почему это критично?» остаётся без ответа
5. **Нет рекомендаций** — «что делать?» не входит в зону ответственности сканера

## Наше решение

AI-Native Security Intelligence Platform — семь слоёв ценности:

```
Discovery → Browser Intel → HTTP Intel → Nuclei →
    Security Knowledge Graph → Security Intelligence Engine →
        Explainability Engine → Dashboard → Continuous Security
```

### Слой 1: Discovery & Scanning
Сбор данных о приложении через множество источников: пассивный анализ, браузерное сканирование, HTTP-интеллект, сканирование уязвимостей (Nuclei).

### Слой 2: Security Knowledge Graph
Единая модель знаний — граф, связывающий endpoints, параметры, заголовки, cookies, находки и их отношения. Это фундамент всего интеллекта платформы.

### Слой 3: Security Intelligence Engine
Детерминированная аналитика: корреляция находок, построение цепочек атак, агрегация рисков, расчёт достоверности и генерация рекомендаций.

### Слой 4: Explainability Engine
Каждый вывод сопровождается полным объяснением: какие данные были использованы, какие правила сработали, какой путь атаки выявлен.

### Слой 5: Dashboard & Visualization
Интерактивная визуализация: граф атак, heat map рисков, таймлайн изменений.

### Слой 6: Continuous Security
Мониторинг изменений в поверхности атаки, автоматический пересчёт рисков при появлении новых данных.

## Дифференциация

| Возможность | Традиционный DAST | Наша платформа |
|------------|------------------|----------------|
| Поиск уязвимостей | Да | Да |
| Корреляция находок | Нет | Да (Correlation Engine) |
| Построение цепочек атак | Нет | Да (Attack Path Builder) |
| Оценка риска с контекстом | Нет (только CVSS) | Да (Risk Aggregator + KG) |
| Объяснимость выводов | Нет | Да (Explainability Engine) |
| Рекомендации | Нет | Да (Recommendation Engine) |
| Единая модель знаний | Нет | Да (Security Knowledge Graph) |

## Целевая аудитория

- **Security Engineers** — автоматизированный анализ с глубокой аналитикой
- **DevOps / Platform Engineers** — интеграция в CI/CD через API
- **CISO / Security Leaders** — приоритизация рисков и отчётность
- **Разработчики** — понятные рекомендации по исправлению

## Ключевые принципы продукта

1. **Детерминированность** — воспроизводимые результаты, пригодные для аудита
2. **Объяснимость** — каждый вывод подкреплён аргументацией
3. **Расширяемость** — plugin-архитектура для новых источников данных
4. **Открытость** — API-first, интеграция в любой workflow

## Метрики успеха

- Снижение false positive rate до < 5%
- Среднее время от сканирования до actionable insight < 5 минут
- Покрытие OWASP Top 10 — 100%
- Воспроизводимость результатов — 100% (det deterministic guarantee)
"""

# ═══════════════════════════════════════════════════════════════
# SVG Diagrams
# ═══════════════════════════════════════════════════════════════

SVG_PLATFORM = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" font-family="Inter, system-ui, sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#0f1a2e"/>
    </linearGradient>
    <linearGradient id="accent-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="900" height="620" fill="url(#bg)" rx="12"/>
  
  <!-- Title -->
  <text x="450" y="40" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="600" letter-spacing="2">PLATFORM ARCHITECTURE</text>
  <text x="450" y="62" text-anchor="middle" fill="#fff" font-size="20" font-weight="800">Архитектура Security Intelligence Platform</text>
  
  <!-- Layer 1: Scanning Plugins -->
  <rect x="40" y="85" width="820" height="100" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="60" y="108" fill="#38bdf8" font-size="11" font-weight="600" letter-spacing="1.5">SCANNING PLUGINS</text>
  
  <rect x="60" y="120" width="170" height="48" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="145" y="148" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="600">Discovery Engine</text>
  
  <rect x="250" y="120" width="170" height="48" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="335" y="148" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="600">Browser Intel</text>
  
  <rect x="440" y="120" width="170" height="48" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="525" y="148" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="600">HTTP Intel</text>
  
  <rect x="630" y="120" width="170" height="48" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="715" y="148" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="600">Nuclei Plugin</text>
  
  <!-- Arrow down -->
  <line x1="450" y1="185" x2="450" y2="215" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
  <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker></defs>
  
  <!-- Layer 2: Core Domain -->
  <rect x="40" y="215" width="820" height="100" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="60" y="238" fill="#34d399" font-size="11" font-weight="600" letter-spacing="1.5">CORE DOMAIN</text>
  
  <rect x="60" y="250" width="240" height="48" rx="6" fill="#0f172a" stroke="#34d399" stroke-opacity="0.3"/>
  <text x="180" y="278" text-anchor="middle" fill="#34d399" font-size="13" font-weight="600">Attack Surface Model</text>
  
  <rect x="320" y="250" width="240" height="48" rx="6" fill="#0f172a" stroke="#34d399" stroke-opacity="0.3"/>
  <text x="440" y="278" text-anchor="middle" fill="#34d399" font-size="13" font-weight="600">Artifact Bus</text>
  
  <rect x="580" y="250" width="240" height="48" rx="6" fill="#0f172a" stroke="#34d399" stroke-opacity="0.3"/>
  <text x="700" y="278" text-anchor="middle" fill="#34d399" font-size="13" font-weight="600">Pipeline Orchestrator</text>
  
  <!-- Arrow down -->
  <line x1="450" y1="315" x2="450" y2="345" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- Layer 3: Knowledge Graph -->
  <rect x="40" y="345" width="820" height="100" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="60" y="368" fill="#fbbf24" font-size="11" font-weight="600" letter-spacing="1.5">KNOWLEDGE LAYER</text>
  
  <rect x="140" y="380" width="620" height="48" rx="6" fill="#0f172a" stroke="#fbbf24" stroke-opacity="0.3"/>
  <text x="450" y="408" text-anchor="middle" fill="#fbbf24" font-size="15" font-weight="700">Security Knowledge Graph (KG-001)</text>
  
  <!-- Arrow down -->
  <line x1="450" y1="445" x2="450" y2="475" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- Layer 4: Intelligence Engine -->
  <rect x="40" y="475" width="820" height="100" rx="8" fill="#111827" stroke="#38bdf8" stroke-width="2"/>
  <text x="60" y="498" fill="#38bdf8" font-size="11" font-weight="600" letter-spacing="1.5">INTELLIGENCE LAYER — EPIC-04 (CURRENT)</text>
  
  <rect x="60" y="510" width="115" height="48" rx="6" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="117" y="532" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="600">Rule Engine</text>
  
  <rect x="185" y="510" width="115" height="48" rx="6" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="242" y="532" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="600">Correlation</text>
  
  <rect x="310" y="510" width="115" height="48" rx="6" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="367" y="532" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="600">Attack Path</text>
  
  <rect x="435" y="510" width="115" height="48" rx="6" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="492" y="532" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="600">Risk Aggr.</text>
  
  <rect x="560" y="510" width="115" height="48" rx="6" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="617" y="532" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="600">Confidence</text>
  
  <rect x="685" y="510" width="115" height="48" rx="6" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" stroke-opacity="0.3"/>
  <text x="742" y="532" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="600">Recommend.</text>
  
  <!-- Future arrow -->
  <text x="450" y="608" text-anchor="middle" fill="#64748b" font-size="12">Explainability → Dashboard → Continuous Security</text>
</svg>
"""

SVG_INTELLIGENCE = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 700" font-family="Inter, system-ui, sans-serif">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#0f1a2e"/>
    </linearGradient>
    <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker>
  </defs>
  
  <rect width="800" height="700" fill="url(#bg2)" rx="12"/>
  
  <!-- Title -->
  <text x="400" y="38" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="600" letter-spacing="2">SIE COMPONENT ARCHITECTURE</text>
  <text x="400" y="60" text-anchor="middle" fill="#fff" font-size="18" font-weight="800">Security Intelligence Engine</text>
  
  <!-- Input: SKG -->
  <rect x="280" y="80" width="240" height="50" rx="8" fill="#0f172a" stroke="#fbbf24" stroke-opacity="0.5"/>
  <text x="400" y="110" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="700">Security Knowledge Graph</text>
  
  <!-- Arrow -->
  <line x1="400" y1="130" x2="400" y2="160" stroke="#64748b" stroke-width="2" marker-end="url(#arr)"/>
  
  <!-- SIE Core -->
  <rect x="100" y="160" width="600" height="50" rx="8" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" stroke-width="2"/>
  <text x="400" y="190" text-anchor="middle" fill="#38bdf8" font-size="15" font-weight="700">Intelligence Engine Core</text>
  
  <!-- 6 Components -->
  <!-- Row 1 -->
  <rect x="50" y="240" width="220" height="90" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="160" y="265" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="600">ADR-SIE-001</text>
  <text x="160" y="288" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Rule Engine</text>
  <text x="160" y="310" text-anchor="middle" fill="#94a3b8" font-size="11">Декларативные правила</text>
  <text x="160" y="325" text-anchor="middle" fill="#94a3b8" font-size="11">над графом знаний</text>
  
  <rect x="290" y="240" width="220" height="90" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="400" y="265" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="600">ADR-SIE-002</text>
  <text x="400" y="288" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Correlation Engine</text>
  <text x="400" y="310" text-anchor="middle" fill="#94a3b8" font-size="11">Графовый обход</text>
  <text x="400" y="325" text-anchor="middle" fill="#94a3b8" font-size="11">для выявления связей</text>
  
  <rect x="530" y="240" width="220" height="90" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="640" y="265" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="600">ADR-SIE-003</text>
  <text x="640" y="288" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Attack Path Builder</text>
  <text x="640" y="310" text-anchor="middle" fill="#94a3b8" font-size="11">DFS/BFS с ограничением</text>
  <text x="640" y="325" text-anchor="middle" fill="#94a3b8" font-size="11">глубины и циклов</text>
  
  <!-- Row 2 -->
  <rect x="50" y="360" width="220" height="90" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="160" y="385" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="600">ADR-SIE-004</text>
  <text x="160" y="408" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Risk Aggregator</text>
  <text x="160" y="430" text-anchor="middle" fill="#94a3b8" font-size="11">Взвешенная сумма</text>
  <text x="160" y="445" text-anchor="middle" fill="#94a3b8" font-size="11">с confidence weights</text>
  
  <rect x="290" y="360" width="220" height="90" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="400" y="385" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="600">ADR-SIE-005</text>
  <text x="400" y="408" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Confidence Calculator</text>
  <text x="400" y="430" text-anchor="middle" fill="#94a3b8" font-size="11">Multi-factor credibility</text>
  <text x="400" y="445" text-anchor="middle" fill="#94a3b8" font-size="11">scoring</text>
  
  <rect x="530" y="360" width="220" height="90" rx="8" fill="#111827" stroke="#1e293b"/>
  <text x="640" y="385" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="600">ADR-SIE-006</text>
  <text x="640" y="408" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Recommendation Engine</text>
  <text x="640" y="430" text-anchor="middle" fill="#94a3b8" font-size="11">Шаблонный генератор</text>
  <text x="640" y="445" text-anchor="middle" fill="#94a3b8" font-size="11">рекомендаций</text>
  
  <!-- Arrows from components down -->
  <line x1="160" y1="330" x2="160" y2="360" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="400" y1="330" x2="400" y2="360" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="640" y1="330" x2="640" y2="360" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3"/>
  
  <!-- Output section -->
  <line x1="400" y1="450" x2="400" y2="490" stroke="#64748b" stroke-width="2" marker-end="url(#arr)"/>
  
  <rect x="100" y="490" width="600" height="50" rx="8" fill="rgba(52,211,153,0.1)" stroke="#34d399" stroke-opacity="0.5"/>
  <text x="400" y="520" text-anchor="middle" fill="#34d399" font-size="14" font-weight="700">Intelligence Output (Det + Explainable)</text>
  
  <!-- Output details -->
  <rect x="50" y="560" width="150" height="60" rx="6" fill="#111827" stroke="#1e293b"/>
  <text x="125" y="585" text-anchor="middle" fill="#94a3b8" font-size="11">Correlated</text>
  <text x="125" y="605" text-anchor="middle" fill="#94a3b8" font-size="11">Findings</text>
  
  <rect x="220" y="560" width="150" height="60" rx="6" fill="#111827" stroke="#1e293b"/>
  <text x="295" y="585" text-anchor="middle" fill="#94a3b8" font-size="11">Attack</text>
  <text x="295" y="605" text-anchor="middle" fill="#94a3b8" font-size="11">Paths</text>
  
  <rect x="390" y="560" width="150" height="60" rx="6" fill="#111827" stroke="#1e293b"/>
  <text x="465" y="585" text-anchor="middle" fill="#94a3b8" font-size="11">Risk</text>
  <text x="465" y="605" text-anchor="middle" fill="#94a3b8" font-size="11">Assessment</text>
  
  <rect x="560" y="560" width="150" height="60" rx="6" fill="#111827" stroke="#1e293b"/>
  <text x="635" y="585" text-anchor="middle" fill="#94a3b8" font-size="11">Recommendations</text>
  <text x="635" y="605" text-anchor="middle" fill="#94a3b8" font-size="11">&amp; Explanations</text>
  
  <!-- Footer -->
  <text x="400" y="660" text-anchor="middle" fill="#64748b" font-size="12">Knowledge → Intelligence → Explainability → Action</text>
</svg>
"""

SVG_ROADMAP = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" font-family="Inter, system-ui, sans-serif">
  <defs>
    <linearGradient id="bg3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#0f1a2e"/>
    </linearGradient>
  </defs>
  
  <rect width="800" height="520" fill="url(#bg3)" rx="12"/>
  
  <!-- Title -->
  <text x="400" y="38" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="600" letter-spacing="2">PROJECT ROADMAP</text>
  <text x="400" y="60" text-anchor="middle" fill="#fff" font-size="18" font-weight="800">Дорожная карта платформы</text>
  
  <!-- Timeline line -->
  <line x1="100" y1="100" x2="100" y2="490" stroke="#1e293b" stroke-width="3"/>
  
  <!-- EPIC-01: DONE -->
  <circle cx="100" cy="110" r="8" fill="#34d399" stroke="#34d399"/>
  <text x="130" y="105" fill="#34d399" font-size="11" font-weight="600">DONE</text>
  <text x="130" y="122" fill="#fff" font-size="15" font-weight="700">EPIC-01: Discovery &amp; Scanning</text>
  <text x="130" y="138" fill="#94a3b8" font-size="12">Plugin API, Nuclei, Browser/HTTP Intel, Attack Surface Model</text>
  
  <!-- TASK-201: DONE -->
  <circle cx="100" cy="170" r="8" fill="#34d399" stroke="#34d399"/>
  <text x="130" y="165" fill="#34d399" font-size="11" font-weight="600">DONE</text>
  <text x="130" y="182" fill="#fff" font-size="15" font-weight="700">TASK-201: Attack Surface Model</text>
  <text x="130" y="198" fill="#94a3b8" font-size="12">Endpoint, Parameter, Header модели и связи</text>
  
  <!-- TASK-202: DONE -->
  <circle cx="100" cy="230" r="8" fill="#34d399" stroke="#34d399"/>
  <text x="130" y="225" fill="#34d399" font-size="11" font-weight="600">DONE</text>
  <text x="130" y="242" fill="#fff" font-size="15" font-weight="700">TASK-202A-F: Intelligence Modules</text>
  <text x="130" y="258" fill="#94a3b8" font-size="12">Nuclei Plugin, Browser/HTTP Intel, Result Normalizer, Artifact Bus, Pipeline</text>
  
  <!-- KG-001: IN PROGRESS -->
  <circle cx="100" cy="300" r="8" fill="#fbbf24" stroke="#fbbf24"/>
  <text x="130" y="295" fill="#fbbf24" font-size="11" font-weight="600">IN PROGRESS</text>
  <text x="130" y="312" fill="#fff" font-size="15" font-weight="700">KG-001: Security Knowledge Graph</text>
  <text x="130" y="328" fill="#94a3b8" font-size="12">Графовая модель знаний, unified query interface</text>
  
  <!-- EPIC-04: CURRENT -->
  <circle cx="100" cy="370" r="10" fill="#38bdf8" stroke="#38bdf8" stroke-width="3"/>
  <circle cx="100" cy="370" r="14" fill="none" stroke="#38bdf8" stroke-opacity="0.3" stroke-width="2"/>
  <text x="130" y="365" fill="#38bdf8" font-size="11" font-weight="600">CURRENT TASK</text>
  <text x="130" y="382" fill="#fff" font-size="15" font-weight="700">EPIC-04 / INT-001: Security Intelligence Engine</text>
  <text x="130" y="398" fill="#94a3b8" font-size="12">Rule Engine, Correlation, Attack Path, Risk, Confidence, Recommendation</text>
  
  <!-- EPIC-05: PLANNED -->
  <circle cx="100" cy="440" r="8" fill="none" stroke="#64748b" stroke-width="2"/>
  <text x="130" y="435" fill="#64748b" font-size="11" font-weight="600">PLANNED</text>
  <text x="130" y="452" fill="#64748b" font-size="15" font-weight="700">EPIC-05+: Explainability &amp; Dashboard</text>
  <text x="130" y="468" fill="#64748b" font-size="12">Explainability Engine, Dashboard, Continuous Security</text>
  
  <!-- Legend -->
  <circle cx="550" y="490" r="6" fill="#34d399"/>
  <text x="565" y="494" fill="#94a3b8" font-size="11">Done</text>
  <circle cx="620" y="490" r="6" fill="#fbbf24"/>
  <text x="635" y="494" fill="#94a3b8" font-size="11">In Progress</text>
  <circle cx="720" y="490" r="6" fill="#38bdf8"/>
  <text x="735" y="494" fill="#94a3b8" font-size="11">Current</text>
</svg>
"""

# Write all files
def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  Written: {path} ({len(content)} bytes)")

print("Creating governance documents...")
write_file(f"{BASE}/docs/00_governance/AI_CONTEXT.md", AI_CONTEXT)
write_file(f"{BASE}/docs/00_governance/ENGINEERING_MEMORY.md", ENGINEERING_MEMORY)
write_file(f"{BASE}/docs/00_governance/CTO_DECISIONS.md", CTO_DECISIONS)
write_file(f"{BASE}/docs/00_governance/VISION.md", VISION)

print("\nCreating SVG diagrams...")
write_file(f"{BASE}/docs/diagrams/handoff_platform_architecture.svg", SVG_PLATFORM)
write_file(f"{BASE}/docs/diagrams/intelligence_engine.svg", SVG_INTELLIGENCE)
write_file(f"{BASE}/docs/diagrams/roadmap.svg", SVG_ROADMAP)

print("\nAll governance docs and diagrams created successfully!")
