# Customer Interviews Registry

> BP-002 BLOCK 2. Реестр интервью с потенциальными клиентами.
> Принцип: Validate before Build. Каждое интервью превращает гипотезу в факт.

---

## Структура

- `template.md` — шаблон для нового интервью
- `interview-NNN.md` — конкретные интервью (NNN = 001, 002, ...)

## Как использовать

1. Скопируйте `template.md` → `interview-NNN.md`
2. Заполните все поля во время интервью
3. Обновите `problem-registry.json` и `assumptions.json` после интервью
4. Обновите `product-market-fit.json` (Interview Count)

## Цель

- 30 интервью к концу Q4 2026
- Минимум 5 интервью на каждый ICP
- Минимум 10 validated problems
- Минимум 3 paying pilot customers

## Состояние

| Метрика | Текущее | Цель Q4 2026 |
|---------|---------|--------------|
| Интервью проведено | 2 (examples) | 30 |
| ICP покрыты | 1/5 | 5/5 |
| Validated problems | 0 | 10 |
| Validated solutions | 0 | 3 |
| Pilot customers | 0 | 3 |
| Paying customers | 0 | 5 |

## Связанные реестры

- `landing/src/data/problem-registry.json` — реестр проблем
- `landing/src/data/assumptions.json` — реестр гипотез
- `landing/src/data/product-market-fit.json` — PMF assessment
- `landing/src/data/competitor-evidence.json` — конкурентная разведка
