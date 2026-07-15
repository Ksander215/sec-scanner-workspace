# DOCUMENT_AUDIT.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Операционный документ — аудит документации
> **Владелец:** Engineering Manager
> **Статус:** Active
> **Связанные документы:** PROJECT_OS.md, DOCUMENT_STANDARDS.md

---

## 1. Введение

Данный документ содержит полный аудит всей существующей документации проекта Sec Scanner на момент TASK-012. Цель — определить актуальность каждого документа, устранить дублирование и создать основу для Project OS.

**Методология:** Каждый документ оценён по 5 критериям:
- **Актуальность** (1-5): насколько содержание отражает текущее состояние проекта
- **Уникальность** (1-5): содержит ли информацию, не доступную в других документах
- **Структура** (1-3): насколько документ соответствует стандартам (заголовки, метаданные, ссылки)
- **Практическая ценность** (1-5): полезен ли документ для принятия решений или разработки
- **Итого** — средневзвешенная оценка

## 2. Обзор

| Показатель | Значение |
|-----------|----------|
| Всего документов | 23 (.md) + 1 worklog |
| Общий объём | ~10,400 строк |
| Период создания | 2026-07-14 (единый день работы, TASK-001 → TASK-011) |
| Категорий | Стратегические, Архитектурные, Инженерные, Продуктовые, Операционные |
| Хранилище | Единая директория `download/` (плоская структура) |

## 3. Классификация по статусу

### 3.1 Актуальные (Active) — используются для принятия решений

| # | Документ | Строки | Категория | Владелец | Зависит от | Актуальн. | Уникальн. | Ценность | Итого |
|---|---------|--------|-----------|----------|------------|-----------|-----------|-----------|-------|
| 1 | PRODUCT_MARKET_FIT_BLUEPRINT.md | 1155 | Стратегия | CEO | MULTI_CHANNEL, PLATFORM_API | 5 | 5 | 5 | **5.0** |
| 2 | PLATFORM_API_ARCHITECTURE.md | 1567 | Архитектура | CTO | PLATFORM_AUDIT, STATE_ENGINE, EXPLAINABILITY | 5 | 5 | 5 | **5.0** |
| 3 | PLATFORM_AUDIT.md | 516 | Архитектура | CTO | TASK-001→TASK-009 код | 5 | 5 | 4 | **4.7** |
| 4 | MULTI_CHANNEL_PRODUCT_STRATEGY.md | 845 | Стратегия | CPO | PRODUCT_ARCH, ROADMAP_V2, STATE_ENGINE, EXPLAINABILITY | 5 | 4 | 5 | **4.7** |
| 5 | EXPLAINABILITY_LAYER.md | 321 | Инженерия | CTO | — | 5 | 5 | 4 | **4.7** |
| 6 | SECURITY_STATE_ENGINE.md | 403 | Инженерия | CTO | — | 5 | 5 | 4 | **4.7** |
| 7 | worklog.md | 245 | Операционный | Все | — | 5 | 5 | 4 | **4.7** |

### 3.2 Частично устаревшие (Superseded) — содержат полезную информацию, но существуют более новые версии

| # | Документ | Строки | Категория | Заменён на | Уникальная ценность | Рекомендация |
|---|---------|--------|-----------|------------|---------------------|-------------|
| 8 | DOMAIN_MODEL.md | 441 | Архитектура | DOMAIN_MODEL_V2 | Описывает V1 доменной модели (до bounded contexts) | **Архивировать** |
| 9 | PRODUCT_ARCHITECTURE.md | 607 | Архитектура | PLATFORM_API_ARCHITECTURE + PLATFORM_AUDIT | Ранний стратегический анализ | **Архивировать** |
| 10 | ARCHITECTURE_AUDIT.md | 283 | Архитектура | PLATFORM_AUDIT | Ранняя версия аудита (v0.2.0) | **Архивировать** |
| 11 | ROADMAP_V2.md | 619 | Стратегия | PRODUCT_MARKET_FIT_BLUEPRINT (Roadmap раздел) | Детальный roadmap TASK-004 эпохи | **Архивировать** |
| 12 | REFACTOR_ROADMAP.md | 856 | Инженерия | PLATFORM_API_ARCHITECTURE (Roadmap) | Детальный план рефакторинга v0.2→1.0 | **Архивировать** |
| 13 | TECH_DEBT.md | 421 | Инженерия | PLATFORM_AUDIT (раздел «Bottlenecks») | Детализация tech debt | **Архивировать** |
| 14 | DEPENDENCY_GRAPH.md | 372 | Архитектура | PLATFORM_API_ARCHITECTURE | Визуализация зависимостей | **Архивировать** |

### 3.3 Draft / TASK-004 batch (созданы в рамках одной задачи, статус Draft)

Эти документы были созданы в рамках TASK-004 как «blueprint bundle». Они содержат полезные идеи, но многие не реализованы и статус «Draft» не обновлялся.

| # | Документ | Строки | Категория | Уникальная ценность | Рекомендация |
|---|---------|--------|-----------|---------------------|-------------|
| 15 | BOUNDED_CONTEXTS.md | 598 | Архитектура | Определение границ доменных контекстов | **Сохранить, обновить статус** |
| 16 | DASHBOARD_V2.md | 371 | Продукт | Концепция следующей версии дашборда | **Сохранить до UI-редизайна** |
| 17 | DOMAIN_MODEL_V2.md | 774 | Архитектура | Обновлённая доменная модель | **Сохранить, актуальна** |
| 18 | EVENT_MODEL.md | 694 | Архитектура | Дизайн событийной архитектуры | **Сохранить до реализации** |
| 19 | PRODUCT_VISION_V2.md | 359 | Стратегия | Видение продукта | **Частично перекрыта PMF Blueprint** |
| 20 | SECURITY_STATE.md | 482 | Архитектура | Design Security State entity | **Частично перекрыта STATE_ENGINE** |
| 21 | USER_FLOW.md | 552 | Продукт | Пользовательские сценарии | **Частично перекрыта PMF Blueprint §7** |

### 3.4 Операционные / Minor

| # | Документ | Строки | Категория | Рекомендация |
|---|---------|--------|-----------|-------------|
| 22 | FIRST_VALUE_AUDIT.md | 103 | Продукт | **Архивировать** (реализовано в TASK-007) |
| 23 | FIRST_VALUE_EXPERIENCE.md | 173 | Продукт | **Архивировать** (реализовано в TASK-007) |
| 24 | README.md | 1 | — | **Удалить** (placeholder) |

### 3.5 Не-документы (не входит в аудит)

- `research_*.json` — временные файлы веб-исследований (14 файлов). Удалить после завершения TASK-012.
- `tool-results/*.txt` — кэш инструментов. Не управляется.
- `*.zip` — архивы. Не управляется.
- `*.png` — изображения. Не управляется.
- `id_ed25519`, `id_ed25519.pub` — SSH ключи. Не управляется.
- `db/custom.db` — база данных. Не управляется.
- `source/` — альтернативная копия проекта (устаревшая).

## 4. Ключевые проблемы

### 4.1 Дублирование (High severity)

1. **Domain Model:** DOMAIN_MODEL.md (v1) и DOMAIN_MODEL_V2.md (v2) — 441 + 774 = 1215 строк на одну тему. V1 полностью superseded.
2. **Roadmap:** ROADMAP_V2.md, REFACTOR_ROADMAP.md, и Roadmap-раздел в PRODUCT_MARKET_FIT_BLUEPRINT.md — 3 документа с пересекающимся содержанием.
3. **Security State:** SECURITY_STATE.md, SECURITY_STATE_ENGINE.md, и Security State в PLATFORM_API_ARCHITECTURE.md.
4. **Vision:** PRODUCT_VISION_V2.md и Vision-раздел в PRODUCT_MARKET_FIT_BLUEPRINT.md.
5. **Architecture Audit:** ARCHITECTURE_AUDIT.md и PLATFORM_AUDIT.md.

### 4.2 Плоская структура (Medium severity)

Все 23 документа в одной директории `download/`. Нет разделения по категориям, нет иерархии. Новый участник не понимает, с чего начать.

### 4.3 Отсутствие стандартов (Medium severity)

Документы созданы в разное время разными «итерациями» AI-агента. Нет единых стандартов: разный формат заголовков, разный уровень детализации метаданных, разный язык (часть на русском, часть на английском).

### 4.4 Статус документов (Low severity)

Несколько документов имеют статус «Draft» с момента создания, но никогда не были обновлены до «Active». Неясно, актуален ли «Draft» документ.

### 4.5 Orphaned documents (Low severity)

Некоторые документы не имеют явного «владельца» (роли) и не связаны с другими документами. Примеры: USER_FLOW.md, FIRST_VALUE_AUDIT.md.

## 5. Рекомендации

### 5.1 Немедленные действия

1. **Создать структуру Project OS** (данный TASK-012)
2. **Архивировать superseded документы** в `docs/archive/`
3. **Удалить временные файлы** (`research_*.json`, `README.md` placeholder)

### 5.2 Краткосрочные действия

4. **Перенести актуальные документы** в новую структуру `docs/` с правильными категориями
5. **Обновить метаданные** всех активных документов по DOCUMENT_STANDARDS.md
6. **Создать Decision Log** для фиксации решений, которые были приняты неявно

### 5.3 Стратегические действия

7. **Объединить пересекающиеся документы** (Domain Model, Roadmap, Vision) в канонические версии
8. **Определить владельцев** для каждого активного документа
9. **Установить правило:** каждый TASK обновляет DOCUMENT_AUDIT.md

## 6. Карта зависимостей (текущая)

```text
TASK-005 ──→ SECURITY_STATE_ENGINE.md
TASK-006 ──→ EXPLAINABILITY_LAYER.md
TASK-007 ──→ FIRST_VALUE_AUDIT.md ──→ FIRST_VALUE_EXPERIENCE.md
TASK-009 ──→ MULTI_CHANNEL_PRODUCT_STRATEGY.md
TASK-010 ──→ PLATFORM_AUDIT.md ──→ PLATFORM_API_ARCHITECTURE.md
TASK-011 ──→ PRODUCT_MARKET_FIT_BLUEPRINT.md (зависит от всех выше)

TASK-004 ──→ BOUNDED_CONTEXTS.md
           ──→ DASHBOARD_V2.md
           ──→ DOMAIN_MODEL_V2.md
           ──→ EVENT_MODEL.md
           ──→ PRODUCT_VISION_V2.md
           ──→ ROADMAP_V2.md
           ──→ SECURITY_STATE.md

Pre-TASK-004:
           ──→ DOMAIN_MODEL.md (superseded by V2)
           ──→ PRODUCT_ARCHITECTURE.md (superseded by PLATFORM_*)
           ──→ ARCHITECTURE_AUDIT.md (superseded by PLATFORM_AUDIT)
           ──→ DEPENDENCY_GRAPH.md (superseded by PLATFORM_API_ARCH)
           ──→ REFACTOR_ROADMAP.md (superseded by PLATFORM_API_ARCH Roadmap)
           ──→ TECH_DEBT.md (superseded by PLATFORM_AUDIT)
           ──→ USER_FLOW.md (partially superseded by PMF Blueprint §7)
```
