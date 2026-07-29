# CX-002A — TTFV Audit (план первой итерации)

> SYS-001 BLOCK 14. Подготовка плана CX-002A без перехода к реализации.

---

## Experiment Card

**Experiment**: CX-002A — Time To First Value Audit

**Почему**: TTFV — 20% веса в PVS. Сейчас 180 сек (score 17). Цель 60 сек (score 100). Это крупнейший рычаг PVS.

**Гипотеза**: (будет сформулирована в CX-002B после аудита)

**Риск**: N/A (audit — без изменений кода)

**Метрика**: TTFV (секунды от открытия Home до первого результата)

**PVS**:
  - Current: 38
  - Expected after CX-002C: 52 (TTFV 17→100, +16.6 PVS points)

**Definition of Success**: Audit документ с измеренными метриками TTFV

**Rollback**: N/A (audit не изменяет код)

---

## Что измерять в CX-002A

| Метрика | Как измерить | Где записать |
|---------|-------------|--------------|
| Количество экранов до WOW | Пройти путь Landing→Home→Scanner→Results | Audit doc |
| Количество кликов до WOW | Посчитать в agent-browser | Audit doc |
| Количество полей до WOW | Посчитать в коде | Audit doc |
| Время до WOW (сек) | agent-browser timeline | Audit doc |
| Текущий TTFV Score | Формула: (180-TTFV)/120×100 | Audit doc |

---

## План следующих итераций

```
SYS-001 (завершён)
  │
  ▼
CX-002A — TTFV Audit (измерить — этот план)
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
... (по схеме A→B→C→D для каждого CX)
```

---

## Impact Table (Rule 36 — для CX-002A)

| Метрика | Сейчас | После | Почему |
|---------|--------|-------|--------|
| Understanding | 70 | 70 | Audit не меняет UI |
| Trust | 35 | 35 | Audit не меняет UI |
| Desire | 40 | 40 | Audit не меняет UI |
| WOW | 45 | 45 | Audit не меняет UI |
| TTFV | 180 сек | 180 сек | Audit не меняет UI |
| Conversion | 0% | 0% | Audit не меняет UI |
| **PVS** | **38** | **38** | Audit — только измерение |

---

## Статус: PLAN READY (не реализован — только план)

CX-002A будет выполнен как первая итерация после подтверждения SYS-001.
