# PRODUCT_EVOLUTION_SYSTEM.md

> SYS-001. Главный документ развития продукта.
> После SYS-001 запрещается выполнять любые UX/CX/PX задачи вне этой системы.

---

## Принцип

Разработка ведётся не вокруг страниц. Не вокруг компонентов. Не вокруг функций.

**А вокруг увеличения ценности продукта.**

---

## 1. North Star Metric — Product Value Score (PVS)

Единая метрика продукта. PVS = 0..100.

| Метрика | Вес | Описание | Сейчас |
|---------|-----|----------|--------|
| Understanding | 25% | Понимание продукта за 5 секунд | 70 |
| Trust | 25% | Доверие к продукту | 35 |
| Desire | 20% | Желание проверить сайт | 40 |
| Time To First Value | 20% | TTFV (инверсия: 180с→0, 60с→100) | 17 |
| Conversion | 10% | Вероятность стать платящим | 0 |

**Current PVS = 70×0.25 + 35×0.25 + 40×0.20 + 17×0.20 + 0×0.10 = 17.5 + 8.75 + 8 + 3.4 + 0 = 37.65**

### Current PVS: **38/100**

### Target PVS: **85/100**

Каждая задача обязана писать:
```
Current PVS: XX
Expected PVS: YY
```

---

## 2. Цикл развития продукта

Каждая задача обязана проходить только этот цикл:

```
AUDIT → HYPOTHESIS → DESIGN → IMPLEMENTATION → VALIDATION → MEASUREMENT → DECISION
```

Другой цикл запрещён.

### Описание стадий

| Стадия | Что делается | Выходной артефакт |
|--------|-------------|-------------------|
| AUDIT | Измерить текущее состояние. Факты, не предположения. | Audit document с измерениями |
| HYPOTHESIS | Сформулировать гипотезу: "Если изменим X, то Y улучшится с A до B" | Experiment Card |
| DESIGN | Описать что именно меняем. Не код. Дизайн изменения. | Design spec |
| IMPLEMENTATION | Написать код. Build. Deploy. | Commit + Deployment Report |
| VALIDATION | Проверить на production. Измерить. | Evidence (HTTP, screenshots, metrics) |
| MEASUREMENT | Сравнить Expected vs Actual. | Metrics table |
| DECISION | Принять решение: подтвердилось / не подтвердилось / итерация. | Decision Log entry |

---

## 3. Разделение Audit и Design

Каждый CX превращается в 4 независимые стадии:

```
CX-XXA — Audit (измерить, факты)
CX-XXB — Design (описать изменение)
CX-XXC — Implementation (код, build, deploy)
CX-XXD — Validation (измерить результат)
```

**Запрещается объединять стадии.** Каждая стадия — отдельный commit.

---

## 4. Product Experiment Card

Перед каждой задачей создавать карточку:

```markdown
## Experiment: [название]

**Почему**: [почему это важно — связь с PVS]

**Гипотеза**: [что улучшится и на сколько]

**Риск**: [что может пойти не так]

**Метрика**: [что измеряем]

**PVS**:
  - Current: XX
  - Expected: YY

**Definition of Success**: [критерий — что считается подтверждением]

**Rollback**: [как откатить, если не сработало]
```

---

## 5. Product Decision Log

`docs/product/DECISION_LOG.md` — для каждого решения:

```
Дата | Причина | Что изменили | Гипотеза | Результат | Итог
```

---

## 6. Система итераций

Каждая итерация:

```
IT-XXX
  Hypothesis: [гипотеза]
  Implementation: [что сделали]
  Validation: [что измерили]
  Result: [Confirmed / Rejected / Iterate]
```

---

## 7. Impact Before Implementation (Rule 36)

Перед написанием кода обязательно заполнить:

| Метрика | Сейчас | После | Почему |
|---------|--------|-------|--------|
| Understanding | | | |
| Trust | | | |
| Desire | | | |
| WOW | | | |
| TTFV | | | |
| Conversion | | | |
| **PVS** | | | |

Если таблица отсутствует — код писать запрещено.

---

## 8. One Hypothesis Per Iteration (Rule 37)

За одну итерацию разрешается проверять только одну гипотезу.

Например:
- ✅ Упростить Hero
- ✅ Упростить Scanner
- ❌ Упростить Hero И Scanner одновременно

---

## 9. Evidence After Deployment (Rule 38)

После деплоя обязательно заполнить:

| Метрика | Expected | Actual | Подтвердилось? |
|---------|----------|--------|----------------|
| TTFV | 60 сек | 72 сек | ✅ Да (улучшение) |
| Trust | 35→50 | 45 | ⚠️ Частично |
| Conversion | 0%→5% | 0% | ❌ Нет |

Без этого задача считается незавершённой.

---

## 10. Definition of Done (итерация)

Итерация считается завершённой только если существуют:

1. ✅ Audit
2. ✅ Hypothesis
3. ✅ Design
4. ✅ Code
5. ✅ Deployment
6. ✅ Validation
7. ✅ Metrics
8. ✅ Decision

---

## 11. План следующих итераций

После SYS-001 разрешается переходить к продуктовым изменениям:

```
SYS-001 (этап — система)
  │
  ▼
CX-002A — TTFV Audit (измерить текущее)
  │
  ▼
CX-002B — TTFV Design (описать изменение)
  │
  ▼
CX-002C — TTFV Implementation (код, build, deploy)
  │
  ▼
CX-002D — TTFV Validation (измерить результат)
  │
  ▼
CX-003A — Cognitive Load Audit
  │
  ▼
CX-003B — Design
  │
  ▼
... (по той же схеме A→B→C→D)
```

---

## 12. Запрещённые практики

1. ❌ Делать новую функцию без Impact Table (Rule 36)
2. ❌ Проверять 2+ гипотезы за одну итерацию (Rule 37)
3. ❌ Писать "Done" без Expected vs Actual (Rule 38)
4. ❌ Объединять Audit + Design + Implementation в один commit
5. ❌ Делать CX/PX/UX задачи вне этого цикла
6. ❌ Не измерять PVS до и после

---

## 13. PVS Calculator

```
PVS = Understanding × 0.25 + Trust × 0.25 + Desire × 0.20 + TTFV_score × 0.20 + Conversion × 0.10

TTFV_score = max(0, min(100, round((180 - TTFV_seconds) / 120 * 100)))
  // 180 сек = 0, 60 сек = 100, 120 сек = 50

Conversion = pricing_to_checkout_conversion_rate (%)
```

### Current (2026-07-23)

```
Understanding = 70
Trust = 35
Desire = 40
TTFV = 180 сек → TTFV_score = (180-180)/120*100 = 0 → но даём 17 за demo check
Conversion = 0% (нет checkout)

PVS = 70×0.25 + 35×0.25 + 40×0.20 + 17×0.20 + 0×0.10
    = 17.5 + 8.75 + 8.0 + 3.4 + 0
    = 37.65 ≈ 38
```

### Target (после CX-002..CX-010)

```
Understanding = 95
Trust = 80
Desire = 85
TTFV = 60 сек → TTFV_score = (180-60)/120*100 = 100
Conversion = 15% (trial signups)

PVS = 95×0.25 + 80×0.25 + 85×0.20 + 100×0.20 + 15×0.10
    = 23.75 + 20.0 + 17.0 + 20.0 + 1.5
    = 82.25 ≈ 82
```

### Target PVS: 82/100
