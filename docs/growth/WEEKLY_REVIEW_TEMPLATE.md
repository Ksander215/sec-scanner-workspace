# WEEKLY_REVIEW_TEMPLATE.md - Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Операционный документ - Review Template
> **Владелец:** Founder
> **Статус:** Active
> **Связанные документы:** PRODUCT_INTELLIGENCE_FRAMEWORK.md, KPI_CATALOG.md, GROWTH_DASHBOARD.md, SUCCESS_GATES.md

---

## Purpose

Weekly Review - еженедельный обзор состояния продукта. Занимает 30 минут. Проводится каждый понедельник (или первый рабочий день недели). Результат: обновлённый Growth Dashboard + список action items на неделю.

Этот шаблон - структура для заполнения. Каждую неделю создаётся новый файл: `reviews/weekly-YYYY-MM-DD.md`.

---

## Template

### Week [N] - [YYYY-MM-DD to YYYY-MM-DD]

---

### 1. Executive Summary (2-3 sentences)

[Краткое резюме: что главное произошло за неделю. Одна позитивная и одна негативная тема.]

---

### 2. Dashboard Update

#### 2.1 Executive KPIs

| Метрика | Прошлая неделя | Эта неделя | Delta | Target | Status |
|---------|---------------|------------|-------|--------|--------|
| WASP | | | | 50 (M3) | ✅/🟡/🔴 |
| MRR | | | | $500 (M3) | ✅/🟡/🔴 |
| D7 Retention | | | | > 25% (M3) | ✅/🟡/🔴 |

#### 2.2 Product KPIs

| Метрика | Прошлая неделя | Эта неделя | Delta | Target | Status |
|---------|---------------|------------|-------|--------|--------|
| Activation Rate | | | | > 12% | |
| TTFV (median) | | | | < 3 min | |
| Scan Success Rate | | | | > 85% | |
| Score Median | | | | 40-60 | |
| Rec Click Rate | | | | > 25% | |

#### 2.3 Engineering KPIs

| Метрика | Прошлая неделя | Эта неделя | Delta | Target | Status |
|---------|---------------|------------|-------|--------|--------|
| Uptime (7d) | | | | > 99.5% | |
| P95 Scan Duration | | | | < 60s ||
| Error Rate (5xx) | | | | < 1% | |
| Test Coverage | | | | > 60% | |

#### 2.4 Business KPIs

| Метрика | Прошлая неделя | Эта неделя | Delta | Target | Status |
|---------|---------------|------------|-------|--------|--------|
| Weekly Signups | | | | 20/week | |
| Paying Customers | | | | 12 (M3) | |
| Monthly Churn | | | | < 12% | |
| ARPU | | | | > $40 | |
| Pipeline (at limit) | | | | > 20 | |

#### 2.5 Growth KPIs

| Метрика | Прошлая неделя | Эта неделя | Delta | Target | Status |
|---------|---------------|------------|-------|--------|--------|
| Weekly Visitors | | | | 500/week | |
| Landing Conversion | | | | > 8% | |
| Registration Rate | | | | > 5% | |
| CAC | | | | < $30 | |
| Referral Rate | | | | > 5% | |
| NPS | | | | > 30 | |

---

### 3. Six Key Questions

#### 3.1 Что выросло?

[Перечислить 2-3 метрики, которые улучшились. Для каждой: метрика, delta, вероятная причина.]

#### 3.2 Что ухудшилось?

[Перечислить 1-3 метрики, которые ухудшились. Для каждой: метрика, delta, вероятная причина.]

#### 3.3 Почему?

[Анализ root cause для главного улучшения и главного ухудшения. Не «WASP вырос на 5» а «WASP вырос на 5, потому что Email Digest (запущен в среду) trigger'ил 8 repeat scans». Если причина неизвестна - записать как гипотезу.]

#### 3.4 Какие гипотезы подтвердились?

[Перечислить гипотезы из прошлых недель, которые получили подтверждение данными. Пример: «Гипотеза: Email Digest увеличит repeat scans на 30%. Результат: repeat scans выросли на 35%. Гипотеза подтверждена.»]

#### 3.5 Какие опровергнуты?

[Перечислить гипотезы, которые не подтвердились. Пример: «Гипотеза: Добавление step 4 в onboarding повысит Activation на 5%. Результат: Activation упала на 2% (больше friction). Гипотеза опровергнута. Действие: откатить step 4.»]

#### 3.6 Что делаем дальше?

[3-5 конкретных action items на следующую неделю. Каждый с: (a) действие, (b) ожидаемый эффект на метрику, (c) приоритет. Пример: «Оптимизировать landing page CTA copy. Ожидание: Landing Conversion +2%. Приоритет: P0.»]

---

### 4. Success Gate Check

| Gate | Status | Notes |
|------|--------|-------|
| Gate 0 (Alpha) | ✅/🟡/🔴/⬜ | [критерий, который ближе всего к непроходу] |
| Gate 1 (Beta) | ✅/🟡/🔴/⬜ | [критерий, который ближе всего к непроходу] |
| Gate 2 (50 users) | ✅/🟡/🔴/⬜ | [критерий, который ближе всего к непроходу] |
| Gate 3 (100 users) | ✅/🟡/🔴/⬜ | - |
| Gate 4 (First paid) | ✅/🟡/🔴/⬜ | - |
| Gate 5 (PMF Signal) | ✅/🟡/🔴/⬜ | - |

**Ближайший Gate для прохождения:** [номер и название]

**Самый критичный gap:** [критерий с наибольшим отклонением от target]

---

### 5. Active Experiments

| Experiment ID | Гипотеза | Started | Expected End | Current Status | Result |
|--------------|----------|---------|-------------|----------------|--------|
| EXP-001 | [description] | [date] | [date] | Running / Completed / Cancelled | [preliminary/final result] |

---

### 6. Key Decisions This Week

| Decision | Type (Data/Expert/Interview) | Outcome | Impact |
|----------|------------------------------|---------|--------|
| [description] | Data-Required / Expert / Interview | [what was decided] | [expected metric impact] |

---

### 7. Blockers & Risks

| # | Blocker / Risk | Severity | Mitigation | Owner |
|---|---------------|----------|------------|-------|
| 1 | [description] | High / Medium / Low | [action] | [role] |

---

## Filing Convention

- Файлы хранятся в: `reviews/weekly-YYYY-MM-DD.md`
- Формат имени: `weekly-2026-07-21.md` (дата понедельника недели)
- Retention: хранить все weekly reviews. Они - исторический контекст для Monthly Business Review.

---

## Quick Reference (печатать и держать перед глазами)

```
WEEKLY REVIEW - 6 QUESTIONS
1. Что выросло?         → metrics + reasons
2. Что ухудшилось?      → metrics + reasons
3. Почему?              → root cause, not just numbers
4. Гипотезы подтвержд?  → validated hypotheses
5. Гипотезы опроверг?   → invalidated hypotheses
6. Что делаем дальше?   → 3-5 action items

TIME: 30 minutes max
FREQUENCY: Every Monday
OUTPUT: Updated dashboard + action items
