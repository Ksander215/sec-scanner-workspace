# Repository Standards — Sec Scanner Workspace

> **Дата:** 2026-07-15
> **Версия:** 1.0
> **Тип:** Операционный документ - стандарты репозитория
> **Владелец:** Engineering Manager
> **Статус:** Active
> **Связанные документы:** CONTRIBUTING.md, GOVERNANCE.md, docs/project_os/DOCUMENT_STANDARDS.md

---

## 1. Цель

Определить стандарты организации репозитория sec-scanner-workspace. Этот документ дополняет [DOCUMENT_STANDARDS.md](docs/project_os/DOCUMENT_STANDARDS.md) (стандарты содержания документов) и задаёт стандарты **хранения и организации**.

---

## 2. Структура директорий

```
sec-scanner-workspace/
  # --- Ядро (REPO-001) ---
  README.md                     Корпоративный README (entry point)
  CONTRIBUTING.md               Правила работы с репозиторием
  REPOSITORY_STANDARDS.md       Этот документ
  GOVERNANCE.md                 Управление, ответственности, lifecycle
  DEFINITIONS.md                DoR/DoD (унифицированная ссылка)
  LABELS.md                     Рекомендуемые labels для GitHub
  MILESTONES_GUIDE.md           Карта milestones к стратегии
  GITHUB_PROJECTS.md            Конфигурация Kanban-доски
  CODEOWNERS                    Права обзора PR по директориям

  # --- Операционные (REPO-002 + MIG-001) ---
  DECISION_LOG.md               Журнал решений Workspace (инфраструктура, WS-NNN)
  CHANGELOG.md                  История версий Workspace (W.X.Y)
  INDEX.md                      Навигационный центр документации
  REPOSITORY_MAP.md             Визуальная карта структуры (Mermaid)
  DOCUMENT_LIFECYCLE.md         Жизненный цикл документов (6 стадий)
  CROSS_REFERENCE_AUDIT.md      Аудит перекрёстных ссылок (REPO-002)
  NAVIGATION_REVIEW.md          Navigation Review + Self-Review (REPO-002)

  .github/
    ISSUE_TEMPLATE/             6 шаблонов Issue
      01_feature_request.md
      02_bug_report.md
      03_architecture_decision.md
      04_product_improvement.md
      05_technical_debt.md
      06_research.md
    PULL_REQUEST_TEMPLATE.md

  docs/
    00_project_os/              Конституция и операционные стандарты
    01_strategy/                Стратегические документы
    02_architecture/            Архитектурные документы
    03_product/                 Продуктовые документы
    04_execution/               Планирование и выполнение
    05_growth/                  Метрики, рост, эксперименты
    06_decisions/               Решения
    07_reviews/                 Review артефакты
    08_draft/                   Черновики (< 1 TASK)
    archive/                    Архив (superseded)
```

### Почему такая структура

**Нумерация директорий (00-08)** задаёт порядок чтения. Новый участник читает документы в порядке номеров: от конституции (00) до черновиков (08). Это лучше, чем алфавитный порядок, потому что:

- `00_project_os` читается первым — контекст проекта
- `01_strategy` — понимание направления
- `02_architecture` — технический фундамент
- `03_product` — что строим для пользователя
- `04_execution` — как и когда строим
- `05_growth` — как измеряем успех
- `06_decisions` — почему приняли такие решения
- `07_reviews` — что узнали
- `08_draft` — что исследуем

**Отдельный `archive/`** вместо удаления. Архивированные документы сохраняют исторический контекст, но не мешают навигации.

**`.github/` для шаблонов** — стандартное место для GitHub-конфигурации. GitHub автоматически использует ISSUE_TEMPLATE и PR_TEMPLATE.

---

## 3. Правила хранения файлов

### 3.1 Где хранить

| Тип файла | Место | Пример |
|-----------|-------|--------|
| Активный документ | `docs/NN_category/` | `docs/strategy/NORTH_STAR_METRIC.md` |
| Sprint-документ | `docs/execution/` | `docs/execution/SPRINT_01.md` |
| Review | `docs/reviews/` | `docs/reviews/weekly-2026-07-21.md` |
| Эксперимент | `docs/growth/` | `docs/growth/experiment-001-onboarding.md` |
| Черновик | `docs/draft/` | `docs/draft/research-dast-accuracy.md` |
| Архив | `docs/archive/` | `docs/archive/DOMAIN_MODEL.md` |
| Шаблон Issue | `.github/ISSUE_TEMPLATE/` | `.github/ISSUE_TEMPLATE/01_feature_request.md` |
| Конфигурация | Корень репозитория | `README.md`, `CONTRIBUTING.md` |

### 3.2 Чего НЕ хранить

| Файл | Причина | Альтернатива |
|------|---------|-------------|
| Секреты, пароли, API keys | Security | `.env` (в кодовом репо, .gitignore) |
| Бинарные файлы | Git не для бинарников | Внешнее хранилище |
| Сгенерированные отчёты | Воспроизводимы | Генерировать из source |
| Логи серверов | Не относится к workspace | Мониторинг-система |
| Код продукта | Отдельный репозиторий | sec-scanner (кодовый репо) |

### 3.3 Дублирование

Если информация содержится в двух документах:

1. **Оставить в одном** — там, где она наиболее уместна.
2. **В другом — ссылка** на первоисточник.
3. **Исключение:** PROJECT_OS содержит краткие резюме с ссылками на полные документы. Это допустимое дублирование (summary pattern).

---

## 4. Соглашения по именованию

### 4.1 Документы

| Правило | Формат | Пример |
|---------|--------|--------|
| Основные документы | UPPER_SNAKE_CASE.md | PRODUCT_MARKET_FIT_BLUEPRINT.md |
| Роли-префиксы (если нужно) | ROLE_DOCUMENT.md | CTO_ARCHITECTURE_NOTES.md |
| Временные артефакты | kebab-case-YYYY-MM-DD.md | weekly-2026-07-21.md |

### 4.2 Директории

| Правило | Формат | Пример |
|---------|--------|--------|
| Категории (постоянные) | NN_lower_snake_case/ | 01_strategy/ |
| Временные | kebab-case/ | (не ожидается) |

### 4.3 Запрещено

- Пробелы в именах файлов и директорий
- Спецсимволы (кроме `-` и `_`)
- camelCase для файлов
- Русские символы в именах файлов (содержание — на русском)

---

## 5. Жизненный цикл документов

```
Draft -> Active -> (Reviewed) -> Active -> ... -> Deprecated -> Archived
                              \-> Superseded -> Archived
```

| Статус | Значение | Расположение |
|--------|----------|-------------|
| **Draft** | Черновик, требует ревью | `docs/draft/` |
| **Active** | Текущий, используется | `docs/NN_category/` |
| **Deprecated** | Устарел, но может быть полезен | На месте (с пометкой) |
| **Superseded** | Заменён новым документом | Перемещён в `docs/archive/` |
| **Archived** | Исторический | `docs/archive/` |

### Автоматизация статуса

- Draft-документ без изменений > 2 TASK → Engineering Manager инициирует ревью или архивацию
- Active-документ без изменений > 6 месяцев → пометить для ревью
- Active-документ, заменённый новым → Deprecated → Archived (в течение 1 TASK)

---

## 6. Правила архивирования

### Когда архивировать

1. Документ заменён более новой версией (Superseded)
2. Документ более не релевантен (проект изменил направление)
3. Решение из документа отменено (сохранить исторический контекст)

### Процесс

1. Добавить в метаданных: `> **Superseded by:** [NEW_DOCUMENT.md]`
2. Переместить в `docs/archive/`
3. Обновить ссылки во всех активных документах
4. Удалить из Document Index в PROJECT_OS.md (переместить в раздел "Архивированные")

### Что НЕ архивировать

- PROJECT_OS.md (всегда Active)
- DECISION_LOG.md (всегда Active, решения никогда не удаляются)
- AI_OPERATING_MODEL.md (действующий регламент)
- Текущий активный спринт

---

## 7. Требования к новым документам

Каждый новый документ в `docs/` должен:

1. [ ] Следовать шаблону из DOCUMENT_STANDARDS.md (метаданные, структура)
2. [ ] Иметь уникальное имя (проверить по `docs/`)
3. [ ] Быть размещён в правильной категории (`docs/NN_category/`)
4. [ ] Иметь хотя бы одну ссылку на существующий документ (связность)
5. [ ] Быть зарегистрирован в PROJECT_OS.md Document Index
6. [ ] Быть зарегистрирован в DOCUMENT_AUDIT.md

---

## 8. Что GitHub предоставляет «из коробки»

Не дублируйте документацией то, что GitHub делает автоматически:

| Функция | GitHub | Не делайте |
|---------|--------|-----------|
| История изменений | Git log | Вести отдельный changelog документов |
| Diff | Pull Requests | Описывать каждое изменение в тексте |
| Обсуждение | Issues / Discussions | Вести обсуждения в .md файлах |
| Проектная доска | GitHub Projects (Kanban) | Дублировать Kanban в .md |
| Поиск | GitHub Search | Создавать индексы вручную |
| Уведомления | Watch / Notifications | Отдельная система подписок |

Исключение: DECISION_LOG — ведётся в .md, потому что решения требуют структурированного контекста (проблема, варианты, обоснование), который не умещается в формат Issue.
