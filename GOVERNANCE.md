# Governance — Sec Scanner Workspace

> **Дата:** 2026-07-15
> **Версия:** 1.0
> **Тип:** Операционный документ - управление репозиторием
> **Владелец:** Engineering Manager
> **Статус:** Active
> **Связанные документы:** REPOSITORY_STANDARDS.md, CONTRIBUTING.md, docs/project_os/AI_OPERATING_MODEL.md

---

## 1. Цель

Определить, кто отвечает за какие документы, какие обновляются автоматически, какие вручную, и как обеспечивается актуальность репозитория.

---

## 2. Классификация документов по методу обновления

### 2.1 Обязательные (MUST exist)

Эти документы критичны для функционирования проекта. Их отсутствие = проект не управляется.

| Документ | Обновление | Ответственный | Триггер обновления |
|---------|-----------|---------------|--------------------|
| PROJECT_OS.md | Вручную | Eng Manager (Z.ai) | Каждый TASK, изменение статуса проекта |
| AI_OPERATING_MODEL.md | Вручную | CTO (Z.ai) | Изменение процессов (каждые 3-6 месяцев) |
| DECISION_LOG.md | Вручную | Z.ai (любая роль) | Каждое значимое решение |
| EXECUTION_BACKLOG.md | Вручную | CTO (Z.ai) | Новая задача, изменение приоритета |
| FOUNDER_DASHBOARD.md | Вручную | Z.ai | Ежедневно во время активного спринта |
| DOCUMENT_STANDARDS.md | Вручную | Eng Manager | При изменении стандартов (редко) |

### 2.2 Обновляемые по событию (Event-driven)

| Документ | Обновление | Ответственный | Триггер |
|---------|-----------|---------------|---------|
| Sprint NN.md | Вручную | CTO | Старт/завершение задачи в спринте |
| MILESTONES.md | Вручную | CEO | Достижение milestone-критерия |
| BLOCKERS.md | Вручную | CTO | Появление/устранение блокера |
| DEPENDENCY_MAP.md | Вручную | CTO | Изменение зависимостей задач |
| PRODUCT_MATURITY_SCORECARD.md | Вручную | CPO | Завершение спринта или значимой задачи |
| PRIVATE_BETA_CHECKLIST.md | Вручную | CPO | Завершение P0/P1 задачи |

### 2.3 Обновляемые по расписанию (Scheduled)

| Документ | Частота | Ответственный | Место хранения |
|---------|---------|---------------|---------------|
| Weekly Review | Еженедельно | Founder + Z.ai | `docs/reviews/weekly-YYYY-MM-DD.md` |
| Monthly Business Review | Ежемесячно | Founder + Z.ai | `docs/reviews/monthly-YYYY-MM.md` |
| Experiment Registry | По мере создания | CPO | `docs/growth/experiment-NNN-name.md` |

### 2.4 Стратегические (редко обновляемые)

| Документ | Частота обновления | Ответственный |
|---------|-------------------|---------------|
| PRODUCT_MARKET_FIT_BLUEPRINT.md | Квартально или при pivot | CEO + CPO |
| SUCCESS_GATES.md | При достижении gate | CEO |
| NORTH_STAR_METRIC.md | При изменении North Star (редко) | CPO |
| KPI_CATALOG.md | При добавлении/изменении метрик | CPO |
| PLATFORM_API_ARCHITECTURE.md | При архитектурных изменениях | CTO |
| DECISION_MANAGEMENT_FRAMEWORK.md | Полугодие | Eng Manager |
| GROWTH_DASHBOARD.md | Квартально | CPO |
| EXPERIMENT_PLAYBOOK.md | Полугодие | CPO |

### 2.5 Справочные (Reference)

| Документ | Обновление | Примечание |
|---------|-----------|-----------|
| SECURITY_STATE_ENGINE.md | При изменении domain layer | Техническая документация модуля |
| EXPLAINABILITY_LAYER.md | При изменении domain layer | Техническая документация модуля |
| MULTI_CHANNEL_PRODUCT_STRATEGY.md | При изменении каналов | Справочник по каналам |
| PRODUCT_READINESS_REPORT.md | Перед каждым Gate review | Снимок состояния |
| PRIVATE_BETA_ROADMAP.md | При изменении плана | Текущий план до beta |

### 2.6 Автоматические (Auto-generated)

| Артефакт | Генерация | Примечание |
|---------|-----------|-----------|
| worklog.md | Каждая сессия Z.ai | Автоматическая запись в конец файла |
| DOCUMENT_AUDIT.md | При создании/архивации документа | Инвентаризация |

---

## 3. Ответственность за актуальность

### 3.1 Матрица ответственности (RACI)

| Документ | Founder | CTO (Z.ai) | CPO (Z.ai) | Eng Mgr (Z.ai) |
|---------|---------|------------|------------|----------------|
| PROJECT_OS.md | A | C | C | **R** |
| AI_OPERATING_MODEL.md | A | **R** | C | C |
| Стратегия (PMF, Success Gates, North Star) | **R/A** | C | C | I |
| Архитектура (Platform API, State Engine) | I | **R/A** | I | I |
| Продукт (Readiness, Checklist, Maturity) | A | C | **R** | I |
| Execution (Backlog, Sprints, Milestones) | A | **R** | C | I |
| Growth (KPI, Dashboard, Experiments) | A | I | **R** | I |
| Decisions | A | R | R | **R** (формат) |
| Standards (Doc Standards, Repo Standards) | I | C | I | **R/A** |

**R** = Responsible (делает), **A** = Accountable (утверждает), **C** = Consulted, **I** = Informed

### 3.2 Проверка актуальности

| Проверка | Когда | Кто | Действие |
|----------|-------|-----|----------|
| Статус документов | Каждый TASK | Eng Manager | Проверить, нет ли Draft > 2 TASK |
| Ссылки | Каждый TASK | Z.ai (автор) | Проверить ссылки в изменённых документах |
| Полный аудит | Ежеквартально | Eng Manager | Все документы: статус, ссылки, дублирование |
| Архивация | После полного аудита | Eng Manager | Переместить superseded в archive/ |

---

## 4. Breaking Changes в документации

Изменение документа является **breaking change**, если:

1. Изменяется ключевой принцип или стратегия (например, смена North Star Metric)
2. Удаляется или перемещается документ, на который ссылаются другие документы
3. Изменяется нумерация или идентификаторы задач (EX-NNN)

### Процесс breaking change

1. Создать Issue с типом "Architecture Decision" или "Product Improvement"
2. Перечислить все затронутые документы
3. Выполнить изменения и обновить все ссылки
4. Уведомить Founder

---

## 5. Доступ и permissions

### GitHub Repository

| Роль | Access Level | Права |
|------|-------------|-------|
| Founder (Owner) | Admin | Всё |
| Collaborators (будущие) | Write | Issues, PRs, push в feature branches |
| External (будущие advisors) | Read | Чтение, Issues (только comment) |

### Branch Protection (когда появится команда)

- `main` — protected, PR required, 1 approval
- Feature branches — свободный push

---

## 6. Incident Response для документации

### Устаревший критический документ

Если стратегический документ (PROJECT_OS, PMF Blueprint) обнаружен устаревшим (> 3 месяца без обновления при активной разработке):

1. Eng Manager создаёт Issue: "DOC-MAINT: Update [DOCUMENT]"
2. Приоритет: P1 (High)
3. Исполнитель: роль-владелец документа
4. Срок: 1 TASK

### Противоречие между документами

Если два документа противоречат друг другу:

1. **Более новый** имеет приоритет (проверить по дате и версии)
2. **Стратегические > Инженерные** (если конфликт между уровнями)
3. **DECISION_LOG** — арбитр (если решение зафиксировано)
4. Если не разрешается — эскалировать на Founder
