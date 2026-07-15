# CROSS_REFERENCE_AUDIT.md — Sec Scanner Workspace

> **Дата:** 2026-07-15
> **Версия:** 1.0
> **Тип:** Операционный документ — Отчёт о перекрёстном аудите
> **Владелец:** Engineering Manager
> **Статус:** Active
> **Связанные документы:** REPOSITORY_STANDARDS.md, GOVERNANCE.md, CONTRIBUTING.md, INDEX.md

---

## 1. Область аудита

**Проверено:** Все 17 файлов REPO-001 Workspace (9 корневых .md + 7 Issue Templates + 1 PR Template) + 5 новых файлов REPO-002.

**Метод:** Автоматическое извлечение всех markdown-ссылок, метаданных и текстовых упоминаний документов с последующим анализом.

---

## 2. Pre-Migration ссылки (ожидаемые)

Все ссылки вида `docs/NN_category/FILE.md` указывают на файлы, которые будут физически созданы при MIG-001. Всего **20 markdown-ссылок + ~34 текстовых упоминания**.

**Вердикт:** Ожидаемо. Не является дефектом. Ссылки станут рабочими после MIG-001.

**Действие:** При MIG-001 — верифицировать каждую ссылку после перемещения файлов.

---

## 3. Исправленные проблемы

### 3.1 ✅ Отсутствие P4 в шаблоне Product Improvement

**Файл:** `.github/ISSUE_TEMPLATE/04_product_improvement.md`
**Проблема:** Шаблон содержал приоритеты P0-P3 (4 уровня), в то время как остальные шаблоны, LABELS.md и DEFINITIONS.md определяют P0-P4 (5 уровней).
**Исправление:** Добавлен `- [ ] P4 Wishlist`.
**Статус:** Исправлен в REPO-002.

### 3.2 ✅ Жёстко заданные ссылки в шаблоне Technical Debt

**Файл:** `.github/ISSUE_TEMPLATE/05_technical_debt.md`
**Проблема:** Шаблон содержал конкретные ссылки на `PLATFORM_AUDIT.md` и `PLATFORM_API_ARCHITECTURE.md`, в то время как другие шаблоны используют placeholder `-`. При этом эти файлы будут находиться в `docs/architecture/` после миграции.
**Исправление:** Заменено на placeholder `-`, как в других шаблонах.
**Статус:** Исправлен в REPO-002.

### 3.3 ✅ Дублирование naming conventions

**Файлы:** CONTRIBUTING.md и REPOSITORY_STANDARDS.md
**Проблема:** Оба файла определяли правила именования файлов. CONTRIBUTING.md имел полную таблицу (8 строк) + «Запрещено», REPOSITORY_STANDARDS.md имел полную таблицу (7 строк) + «Запрещено» + правила для директорий.
**Исправление:** CONTRIBUTING.md Section «Именование файлов» сокращена до краткой справки с ссылкой на REPOSITORY_STANDARDS.md Section 4 как авторитетный источник. Удалено дублирование «Запрещено».
**Статус:** Исправлен в REPO-002.

### 3.4 ✅ Отсутствующие перекрёстные ссылки в CONTRIBUTING

**Файл:** CONTRIBUTING.md, раздел «Для Issue»
**Проблема:** Пункт «Имеет приоритет (P0-P4)» и «Имеет измеримый критерий успеха» не ссылались на LABELS.md и DEFINITIONS.md соответственно.
**Исправление:** Добавлены ссылки: `см. [LABELS.md](LABELS.md)` и `см. [DEFINITIONS.md](DEFINITIONS.md)`.
**Статус:** Исправлен в REPO-002.

---

## 4. Отложенные до пост-MIG-001

### 4.1 GOVERNANCE.md: текстовые ссылки → markdown-ссылки

GOVERNANCE.md Sections 2.1–2.6 содержат ~30 имён документов в виде простого текста (в таблицах). После MIG-001 эти упоминания должны быть преобразованы в кликабельные ссылки `[](docs/...)`.

### 4.2 MILESTONES_GUIDE.md: текстовые ссылки → markdown-ссылки

Аналогично GOVERNANCE.md — все упоминания документов (`SUCCESS_GATES.md`, `MILESTONES.md`, `SPRINT_01.md` и т.д.) в виде простого текста.

### 4.3 DEFINITIONS.md ↔ GOVERNANCE.md

DEFINITIONS.md определяет критерии DoR/DoD, но не ссылается на GOVERNANCE.md (где описано принуждение к их выполнению). После MIG-001 — добавить перекрёстные ссылки.

### 4.4 LABELS.md ↔ DEFINITIONS.md

LABELS.md определяет `status: ready` и `status: in-review`, но не ссылается на DEFINITIONS.md (где определены конкретные критерии для ready и review). После MIG-001 — добавить ссылку.

### 4.5 CODEOWNERS: неполное покрытие корневых файлов

CODEOWNERS явно перечисляет только `README.md`, `GOVERNANCE.md`, `DEFINITIONS.md`. Остальные корневые файлы (`CONTRIBUTING.md`, `REPOSITORY_STANDARDS.md`, `LABELS.md`, `MILESTONES_GUIDE.md`, `GITHUB_PROJECTS.md`) попадают под wildcard `*`. После MIG-001 — расширить CODEOWNERS для явности.

---

## 5. Допустимое дублирование (не требует исправления)

| Что | Где | Почему допустимо |
|-----|-----|------------------|
| WIP = 1 | README, CONTRIBUTING, GITHUB_PROJECTS | Краткие напоминания (1 строка). GITHUB_PROJECTS атрибутирует источник. |
| DoR/DoD | README (summary), DEFINITIONS (канонически), CONTRIBUTING (чеклист) | Три уровня: краткий → полный → практический. Нет дублирования, есть уточнение. |
| Роли | README (описание), GOVERNANCE (RACI) | Комплементарные виды: WHAT vs WHO. |
| Классификация документов | GOVERNANCE (по методу обновления), REPOSITORY_STANDARDS (по месту хранения) | Разные углы (когда обновлять vs где хранить). |

---

## 6. Противоречия

**Не обнаружено содержательных противоречий.** Все документы консистентны в описании:
- Стадии проекта (Pre-revenue, Pre-Alpha)
- Tech Stack (Next.js 16, Prisma, SQLite)
- WASP target (0 → 50 → 500)
- Роли (Founder/CEO, CTO/Z.ai, CPO/Z.ai, Eng Manager/Z.ai)
- Ценообразование (Free/$29/$79/$199/Enterprise)