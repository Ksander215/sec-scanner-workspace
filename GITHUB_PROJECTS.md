# GitHub Projects — Kanban Configuration

> **Дата:** 2026-07-15
> **Версия:** 1.0
> **Тип:** Операционный документ - конфигурация проектной доски
> **Владелец:** Engineering Manager
> **Статус:** Active
> **Связанные документы:** LABELS.md, docs/execution/EXECUTION_BACKLOG.md, docs/execution/MASTER_EXECUTION_PLAN.md

---

## Рекомендуемая структура Kanban-доски

### Создание проекта

GitHub Projects (new, beta) -> Create new project -> «Sec Scanner Board»

### Columns (статусы)

| Column | Описание | Критерии входа | Критерии выхода |
|--------|----------|---------------|-----------------|
| **Icebox** | Идеи, не оценённые, waiting for prioritization | Любая идея | Проведён приоритизационный анализ (BV/EC/ROI) |
| **Backlog** | Оценённые задачи, ждут своего спринта | DoR пройден, Priority установлен, BV/EC оценён | Назначена в Sprint |
| **Ready** | Задачи текущего спринта, готовы к работе | Назначена в Sprint, зависимости разрешены, ответственный назначен | Работа начата (Implementation) |
| **In Progress** | Активная работа (WIP = 1) | Задача взята в работу | Implementation завершена, Self Review пройден |
| **Review** | На ревью (CTO/Product) | Self Review пройден | Review Approved |
| **Testing** | Тестирование (build, unit, manual) | Review Approved | Все тесты проходят |
| **Done** | Задача завершена, DoD пройден | DoD полностью пройден | - |

### Почему 7 колонок (а не стандартные 5)

Стандартный Kanban (Backlog/In Progress/Review/Done) недостаточен для нашего процесса:

1. **Icebox** нужен для идей, которые ещё не оценены. Без него Backlog загрязняется неоформленными идеями.
2. **Ready** отделён от Backlog, потому что в нашем процессе (WIP=1) важно чётко видеть, какие задачи готовы к немедленному старту.
3. **Testing** отделён от Review, потому что у нас определённые критерии тестирования (build, unit tests, manual verification).

Альтернатива (более простая, если 7 колонок кажется много):

```
Backlog -> Ready -> In Progress -> Review -> Done
```

---

## WIP Limits

| Column | WIP Limit | Обоснование |
|--------|-----------|-------------|
| In Progress | **1** | WIP = 1 из AI_OPERATING_MODEL |
| Review | 2 | Параллельно: CTO Review + Product Review |
| Testing | 2 | Build + Manual test |
| Остальные | Без лимита |

---

## Автоматизация (GitHub Projects features)

### Рекомендуемые правила автоматизации

| Trigger | Action |
|---------|--------|
| Issue создан | Добавить в «Icebox» |
| Issue получает метку `status: ready` | Переместить в «Ready» |
| Issue получает метку `status: in-review` | Переместить в «Review» |
| PR связан с Issue и merged | Переместить в «Testing» |
| Все чек-листы в Issue выполнены | Переместить в «Done» |
| Issue без активности 7+ дней | Добавить метку `status: blocked` |

---

## Views (представления)

### View 1: Sprint Board

Фильтр: `sprint: 01` (или текущий спринт)
Показывает только задачи текущего спринта. Группировка по column.

### View 2: By Priority

Группировка по Priority label (P0 -> P4). Помогает видеть, сколько критических задач в каждой колонке.

### View 3: By Gate

Группировка по Gate label. Помогает видеть прогресс к каждой контрольной точке.

### View 4: Blocked

Фильтр: `status: blocked`. Показывает все блокеры в одном месте.

### View 5: Founder View

Фильтр: Priority = P0 или P1. Показывает только то, что требует внимания Founder'а.
