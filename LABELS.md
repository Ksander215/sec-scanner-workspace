# Labels — Sec Scanner Workspace

> Рекомендуемый набор labels для GitHub Issues и Pull Requests.

---

## Как использовать

1. Откройте репозиторий Settings -> Labels
2. Удалите стандартные GitHub labels (если есть)
3. Создайте labels из таблиц ниже

Цвета подобраны для визуального различения категорий на доске.

---

## Priority (Приоритет)

| Label | Color | Описание | Когда использовать |
|-------|-------|----------|-------------------|
| `P0 Critical` | `#B60205` | Блокер, немедленное выполнение | Продукт не работает, security breach, данные под угрозой |
| `P1 High` | `#D93F0B` | Этот цикл/спринт | Блокирует других, влияет на WASP или Gate |
| `P2 Medium` | `#FBCA04` | Следующие 2 цикла | Улучшение, не блокирует, но желательно скоро |
| `P3 Low` | `#0E8A16` | В течение месяца | Удобство, полировка, nice-to-have |
| `P4 Wishlist` | `#C5DEF5` | Когда будет время | Идеи на будущее, нет давления |

---

## Type (Тип задачи)

| Label | Color | Описание |
|-------|-------|----------|
| `type: feature` | `#1D76DB` | Новая функциональность |
| `type: bug` | `#E11D21` | Ошибка в существующем функционале |
| `type: improvement` | `#5319E7` | Улучшение существующего (не новый feature) |
| `type: documentation` | `#0075CA` | Изменение документации |
| `type: research` | `#F9D0C4` | Исследование, анализ, прототип |
| `type: tech-debt` | `#D4C5F9` | Рефакторинг, улучшение кода без изменения функциональности |
| `type: security` | `#B60205` | Security-related задача |
| `type: infrastructure` | `#6E40AA` | DevOps, CI/CD, деплой, мониторинг |

---

## Status (Статус)

| Label | Color | Описание |
|-------|-------|----------|
| `status: blocked` | `#000000` | Заблокирован внешней зависимостью |
| `status: in-review` | `#FEF2C0` | На ревью (CTO Review, Founder Review) |
| `status: ready` | `#0E8A16` | Готов к работе (DoR пройден) |
| `status: testing` | `#5319E7` | На тестировании |
| `status: deferred` | `#C5DEF5` | Отложен (с причиной) |

---

## Product Area (Область продукта)

| Label | Color | Описание |
|-------|-------|----------|
| `area: scanning` | `#1D76DB` | DAST engine, сканирование |
| `area: security-score` | `#006B75` | Security Score computation, State Engine |
| `area: explainability` | `#006B75` | Explainability Layer, рекомендации |
| `area: auth` | `#D93F0B` | Аутентификация, авторизация, OAuth |
| `area: billing` | `#5319E7` | Stripe, подписки, pricing |
| `area: onboarding` | `#FBCA04` | First value experience, wizard |
| `area: dashboard` | `#1D76DB` | UI дашборда, виджеты |
| `area: api` | `#6E40AA` | API endpoints, Platform Layer |
| `area: infra` | `#6E40AA` | VPS, Caddy, monitoring, CI/CD |
| `area: docs` | `#0075CA` | Пользовательская документация |
| `area: workspace` | `#C5DEF5` | Этот репозиторий, процессы |

---

## Risk (Риск)

| Label | Color | Описание |
|-------|-------|----------|
| `risk: high` | `#B60205` | Высокий риск (может провалить спринт или Gate) |
| `risk: medium` | `#FBCA04` | Средний риск (управляемый) |
| `risk: low` | `#0E8A16` | Низкий риск (предсказуемый результат) |

---

## Sprint (Спринт)

| Label | Color | Описание |
|-------|-------|----------|
| `sprint: 01` | `#1D76DB` | Sprint 01 - Core Product Value |
| `sprint: 02` | `#5319E7` | Sprint 02 - Beta Readiness |
| `sprint: 03` | `#6E40AA` | Sprint 03 - Launch + First Users |
| `sprint: 04` | `#D4C5F9` | Sprint 04 - Learn + Iterate |
| `sprint: backlog` | `#C5DEF5` | Backlog (не в текущем спринте) |

---

## Gate (Контрольная точка)

| Label | Color | Описание |
|-------|-------|----------|
| `gate: 0` | `#B60205` | Gate 0 - Alpha (Internal) |
| `gate: 1` | `#D93F0B` | Gate 1 - Beta (Private Beta) |
| `gate: 2` | `#FBCA04` | Gate 2 - 50 Users |
| `gate: 3` | `#0E8A16` | Gate 3 - 100 Users |
| `gate: 4` | `#1D76DB` | Gate 4 - First Paid |
| `gate: 5` | `#5319E7` | Gate 5 - PMF Signal |

---

## Комбинации

Типичный Issue должен иметь:

1. **Один Priority** label (P0-P4)
2. **Один Type** label (type: feature, bug, и т.д.)
3. **Один или ноль Status** label (status: ready, blocked, и т.д.)
4. **Один Product Area** label (area: scanning, auth, и т.д.)
5. **Опционально:** Risk, Sprint, Gate

Пример: `P1 High` + `type: feature` + `area: scanning` + `sprint: 01` + `gate: 0` + `risk: high`
