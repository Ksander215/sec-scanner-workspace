# Milestones Guide — Sec Scanner

> **Дата:** 2026-07-15
> **Версия:** 1.0
> **Тип:** Операционный документ - руководство по milestones
> **Владелец:** CEO
> **Статус:** Active
> **Связанные документы:** docs/execution/MILESTONES.md, docs/strategy/SUCCESS_GATES.md, docs/execution/MASTER_EXECUTION_PLAN.md

---

## Цель

Карта между GitHub Milestones (инструмент трекинга) и стратегическими контрольными точками (Success Gates). Показывает, какие milestones создать в GitHub и как они связаны с документами.

---

## Рекомендуемые Milestones для GitHub

Создайте в GitHub (Issues -> Milestones) следующие milestones:

### M1: Internal Alpha

| Поле | Значение |
|------|----------|
| **Title** | M1: Internal Alpha |
| **Description** | Gate 0 passed. Real DAST engine works. Demo Target deployed. Security Score from real data. |
| **Due Date** | Jul 20, 2026 |
| **Связанные документы** | SUCCESS_GATES.md (Gate 0), MILESTONES.md (M1), SPRINT_01.md |

**Критерии закрытия:**
- EX-001 (Demo Target) + EX-002 (DAST Engine) + EX-003 (Fix Price) = Done
- EX-004 (Email Verification) + EX-005 (Password Reset) = Done
- Scan Success Rate > 90% (internal)
- TTFV (demo) < 60 sec

---

### M2: Private Beta Ready

| Поле | Значение |
|------|----------|
| **Title** | M2: Private Beta Ready |
| **Description** | Gate 0 complete + Gate 1 ready. All 10 blocking checklist items resolved. Product can be shown to users. |
| **Due Date** | Jul 27, 2026 |
| **Связанные документы** | SUCCESS_GATES.md (Gate 1), PRIVATE_BETA_CHECKLIST.md, SPRINT_02.md |

**Критерии закрытия:**
- Все 10 Blocking items из PRIVATE_BETA_CHECKLIST = Ready
- TTFV (end-to-end) < 3 min
- Onboarding wizard работает
- Terms of Service + Privacy Policy опубликованы
- Error tracking (Sentry) настроен

---

### M3: First 10 Users

| Поле | Значение |
|------|----------|
| **Title** | M3: First 10 Users |
| **Description** | Gate 1 passed. 10+ beta users registered, 5+ activated. First real feedback received. |
| **Due Date** | Aug 3, 2026 |
| **Связанные документы** | SUCCESS_GATES.md (Gate 1), MILESTONES.md (M3), SPRINT_03.md |

**Критерии закрытия:**
- WASP > 5
- Activation Rate > 10%
- 3+ user interviews completed
- Feedback mechanism active

---

### M4: Private Beta (50 Users)

| Поле | Значение |
|------|----------|
| **Title** | M4: 50 Beta Users |
| **Description** | Gate 2 progress. 20+ registered, 10+ weekly active. Go/Pivot/Stop data available. |
| **Due Date** | Aug 10, 2026 |
| **Связанные документы** | SUCCESS_GATES.md (Gate 2), MILESTONES.md (M4), SPRINT_04.md |

**Критерии закрытия:**
- WASP > 10
- D7 Retention > 15%
- Top 3 complaints identified
- 3+ user interviews completed

---

### M5: First Paying Customer

| Поле | Значение |
|------|----------|
| **Title** | M5: First Revenue |
| **Description** | Gate 4. First real Stripe payment. Paying user completed 3+ scans. |
| **Due Date** | Sep-Oct 2026 |
| **Связанные документы** | SUCCESS_GATES.md (Gate 4), KPI_CATALOG.md |

**Критерии закрытия:**
- MRR > $29
- Free -> Paid conversion > 0
- Paying user completed 3+ scans (не «забыл отменить»)

---

### M6: Product-Market Fit Signal

| Поле | Значение |
|------|----------|
| **Title** | M6: PMF Signal |
| **Description** | Gate 5. Sean Ellis Test > 40%. MRR > $2K. Churn < 10%. NPS > 40. |
| **Due Date** | Jan 2027 |
| **Связанные документы** | SUCCESS_GATES.md (Gate 5), PRODUCT_INTELLIGENCE_FRAMEWORK.md |

**Критерии закрытия:**
- MRR > $2,000
- Paying Customers > 30
- Monthly Churn < 10%
- NRR > 85%
- Sean Ellis Test > 40%

---

## Как привязать Issues к Milestones

1. При создании Issue выбрать milestone из выпадающего списка
2. Если Issue не привязан к конкретному milestone — не назначать (не все задачи имеют milestone)
3. Milestone закрывается **только** если все критерии закрытия выполнены

## Процесс закрытия Milestone

1. Проверить все критерии из таблицы выше
2. Создать Issue типа «Feature Request»: «MILESTONE-N: Close M[N] - [Title]»
3. В Issue перечислить: что достигнуто, что не достигнуто (с причиной), извлечённые уроки
4. Обновить SUCCESS_GATES.md (статус Gate)
5. Обновить FOUNDER_DASHBOARD.md
6. Закрыть Milestone в GitHub
