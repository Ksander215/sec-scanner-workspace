# Contributing to Sec Scanner Workspace

> Правила работы с репозиторием sec-scanner-workspace.

---

## Общие принципы

1. **Этот репозиторий — Single Source of Truth.** Если информация существует только в голове или в чате — она не существует.
2. **Каждое изменение — осознанное.** Не коммитьте «правки» без понимания, какой документ затронут.
3. **Документы связаны.** Изменение одного документа может потребовать обновления ссылок в других.
4. **Версионируйте.** Каждое изменение увеличивает patch-версию документа. Структурные изменения — minor или major.

---

## Создание новых документов

### Шаг 1: Проверить необходимость

Новый документ создаётся только если:

1. Существует новая область знаний, не покрытая существующими документами
2. Существующий документ разросся > 2000 строк и требует разделения
3. TASK/Issue явно требует создания документа

**НЕ создавайте новый документ, если:** информация помещается в существующий документ, или это разовое исследование (используйте `docs/draft/`).

### Шаг 2: Использовать шаблон

```markdown
# [НАЗВАНИЕ] - Sec Scanner

> **Дата:** YYYY-MM-DD
> **Версия:** 1.0
> **Тип:** [Категория] - [Подкатегория]
> **Владелец:** [Роль]
> **Статус:** Draft
> **Связанные документы:** [если есть]

---

## 1. Цель
[Один абзац: зачем этот документ существует и для кого.]

## 2. Контекст
[Предыстория. Ссылки на предшествующие решения или документы.]

## 3. [Основное содержание]

## 4. Решения / Рекомендации

## 5. Открытые вопросы
```

### Шаг 3: Проверить стандарты

- Следуйте [DOCUMENT_STANDARDS.md](docs/project_os/DOCUMENT_STANDARDS.md)
- Язык: русский (основной), английский (технические термины)
- Категория документа: Стратегия / Архитектура / Инженерия / Продукт / Операционный / Временный

### Шаг 4: Зарегистрировать

- Добавить в [PROJECT_OS.md](docs/project_os/PROJECT_OS.md) (Document Index)
- Обновить [DOCUMENT_AUDIT.md](docs/project_os/DOCUMENT_AUDIT.md) (если используется)
- Обновить [DECISION_LOG.md](docs/decisions/DECISION_LOG.md) если документ фиксирует решение

---

## Изменение существующих документов

### Правила

1. **Прочитайте документ целиком** перед изменением.
2. **Проверьте связи** — какие документы ссылаются на изменяемый.
3. **Увеличьте версию** — patch (исправления), minor (новые разделы), major (переработка).
4. **Обновите дату** — в блоке метаданных.
5. **Проверьте статус** — Draft-документ должен перейти в Active или Archived в течение 2 TASK.

### Изменение стратегических документов

Стратегические документы (PROJECT_OS, PMF Blueprint, AI Operating Model, Success Gates) требуют:

- Понимания текущего состояния (прочитать PROJECT_OS + FOUNDER_DASHBOARD)
- Проверки на противоречие с DECISION_LOG
- Обновления связанных документов

### Изменение документов во время TASK

Если TASK затрагивает документ:

1. Обновить затронутые разделы
2. Увеличить версию (patch)
3. Обновить дату
4. Добавить запись в worklog

---

## Именование файлов

Полные правила именования: см. [REPOSITORY_STANDARDS.md, Section 4](REPOSITORY_STANDARDS.md).

Краткая справка:

| Тип | Формат | Пример |
|-----|--------|--------|
| Стратегический документ | UPPER_SNAKE_CASE.md | PRODUCT_MARKET_FIT_BLUEPRINT.md |
| Спринт | SPRINT_NN.md | SPRINT_01.md |
| Решение | встроено в DECISION_LOG.md | - |
| Weekly Review | weekly-YYYY-MM-DD.md | weekly-2026-07-21.md |
| Monthly Review | monthly-YYYY-MM.md | monthly-2026-07.md |
| Эксперимент | experiment-NNN-short-name.md | experiment-001-onboarding.md |

---

## Работа с ADR (Architecture Decision Records)

Каждое архитектурное решение фиксируется в [DECISION_LOG.md](docs/decisions/DECISION_LOG.md).

### Когда создавать ADR

- Выбор технологии или паттерна
- Изменение архитектурных границ
- Отклонение от существующего решения

### Шаблон ADR

```markdown
## DECISION-XXX: [Краткое название]

- **Дата:** YYYY-MM-DD
- **TASK:** TASK-XXX
- **Тип:** [ADR | PDR | SDR | UDR | BDR | MDR | ODR]
- **Статус:** [Proposed | Accepted | Deprecated | Superseded]
- **Owner (Role):** [Роль]
- **Approver:** Founder
- **Review Date:** YYYY-MM-DD
- **Проблема:** [Описание проблемы]
- **Рассмотренные варианты:**
  1. [Вариант A] - [плюсы/минусы]
  2. [Вариант B] - [плюсы/минусы]
- **Выбранное решение:** [Вариант X] - [краткое обоснование]
- **Обоснование:** [Подробное обоснование]
- **Expected Benefits:** [Измеримые выгоды]
- **Trade-offs:** [Что жертвуем]
- **Risks:** [Риски и митигация]
- **Success Metrics:**
  - Primary: "[метрика]" - [target]
  - Secondary: "[метрика]" - [target]
- **Review Triggers:** [Когда пересмотреть]
- **Related Decisions:** [Связанные решения]
- **Ответственные роли:** [Роли]
```

Полная система управления решениями: [DECISION_MANAGEMENT_FRAMEWORK.md](docs/decisions/DECISION_MANAGEMENT_FRAMEWORK.md)

---

## Работа со Sprint

### Обновление Sprint-документа

1. При старте спринта — создать/обновить `SPRINT_NN.md` в `docs/execution/`
2. Каждую задачу связать с EX-идентификатором из EXECUTION_BACKLOG
3. При завершении задачи — обновить статус в спринте
4. При завершении спринта — записать результаты (WASP change, learnings)

### Правила спринта

- **WIP = 1** — одна задача за раз
- Длительность: 1 неделя
- Задачи берутся только из EXECUTION_BACKLOG
- Новые идеи — в backlog, не в текущий спринт

---

## Работа с Roadmap

### Обновление Roadmap

Roadmap обновляется когда:

1. Завершён TASK с Roadmap-элементом — отметить как done
2. Новый TASK добавляет инициативу — добавить с оценкой ROI
3. Изменились приоритеты (market feedback, technical discovery) — пересчитать ROI
4. Ежеквартально — полный review всех инициатив

### Источники Roadmap

- [MASTER_EXECUTION_PLAN.md](docs/execution/MASTER_EXECUTION_PLAN.md) — авторитетный источник
- [SUCCESS_GATES.md](docs/strategy/SUCCESS_GATES.md) — контрольные точки
- [PRIVATE_BETA_ROADMAP.md](docs/product/PRIVATE_BETA_ROADMAP.md) — детальный план до beta

---

## Правила ревью

### Для документов

- Проверить соответствие DOCUMENT_STANDARDS.md
- Проверить уникальность (нет дублирования с другими документами)
- Проверить ссылки (все `[](docs/...)` валидны)
- Проверить метаданные (дата, версия, статус, владелец)

### Для кодовых PR (если код в этом репо)

- Build успешен
- Тесты проходят
- Следует Clean Architecture (Domain Layer без framework deps)
- Нет новых tech debt без явной записи

### Для Issue

- Следует шаблону (feature/bug/architecture/etc.)
- Имеет приоритет (P0-P4) — см. [LABELS.md](LABELS.md)
- Имеет измеримый критерий успеха — см. [DEFINITIONS.md](DEFINITIONS.md)
- Связан с North Star (WASP) или Success Gate

---

## Git Workflow

### Branch Naming

| Тип | Формат | Пример |
|-----|--------|--------|
| Фича | `feat/EX-NNN-short-name` | `feat/EX-002-basic-dast` |
| Fix | `fix/EX-NNN-short-name` | `fix/EX-003-pricing-display` |
| Документ | `docs/TASK-NNN-short-name` | `docs/REPO-001-workspace-bootstrap` |
| Hotfix | `hotfix/description` | `hotfix/landing-price-fix` |

### Commit Messages

```
type(scope): description

[optional body]

Refs: EX-NNN, TASK-NNN
```

Типы: `feat`, `fix`, `docs`, `refactor`, `chore`, `ci`

### Pull Request

Используйте [PR Template](.github/PULL_REQUEST_TEMPLATE.md).
