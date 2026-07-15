# First Value Experience — Implementation Report

## Пользовательский сценарий

### Новый путь (после TASK-007)

```text
Landing Page
    ↓ (регистрация)
Dashboard → Security Tab (по умолчанию)
    ↓
[ДЕМО] Security Score 62/100 — немедленная ценность
    ↓
"Почему 62?" → Reasons Panel
    ↓
"Что изменилось?" → Score Drivers: −8 new findings, +10 resolved
    ↓
"Что делать?" → P0: Fix SQL Injection (+32.5 score)
    ↓
"Run Your First Scan" → переключение на Scan Tab
```

### Time to First Value

| Метрика | До | После |
|---------|-----|-------|
| Time to First Value | 2-3 мин (нужен реальный скан) | **0 сек** (демо при входе) |
| Понимание состояния | Нет | Security Score + 4 карточки + объяснение |
| Следующее действие | Не понятно | P0-рекомендация + CTA |
| Пустые состояния | Текст | Визуал + кнопка действия |

## Принятые решения

### 1. Демо-режим по умолчанию

**Решение:** При первом входе пользователь видит Security Dashboard с демо-данными, вычисленными реальными доменными модулями (Security State Engine + Explainability Layer).

**Почему:** Пользователь получает ценность мгновенно. Демо использует 8 реалистичных findings (SQL Injection, XSS, CSRF и т.д.) с правильными CWE-идентификаторами.

**Компромисс:** Демо-данные не отражают реальное состояние. Смягчается явным баннером "This is a demo assessment" с кнопкой "Use Real Data".

### 2. Security Tab как первая вкладка

**Решение:** Вкладка "Security" теперь первая и по умолчанию, а не "New Scan".

**Почему:** Scan Tab показывает только форму ввода URL + "How it works". Security Tab показывает полный анализ. Сканирование — это одно из действий, но не основная ценность.

**Компромисс:** Существующие пользователи, привыкшие к Scan Tab как первой, увидят изменение. Но визуальная иерархия однозначно улучшается.

### 3. Удаление "How it works" блока

**Решение:** Блок "How it works" (занимал 50% экрана на Scan Tab) удалён из Dashboard. Причина: информация перенесена в Security Dashboard и Empty States.

### 4. Визуальные компоненты

| Компонент | Назначение |
|-----------|------------|
| `ScoreGauge` | SVG circle gauge с score, tier badge, trend, confidence |
| `RiskTrendCards` | 4 стат-карточки: Risk Score, Open Findings, Regressions, Last Scan |
| `ExecutiveSummary` | Текстовое резюме от Explainability Layer |
| `TopImpactsPanel` | Progress bars с факторами, влияющими на score |
| `ReasonsPanel` | Карточки с объяснениями "почему такой score" |
| `RecommendationsPanel` | Кликабельные рекомендации, отсортированные по ROI |
| `ChangeSummary` | Score Drivers + Improved/Regressed списки |
| `EmptyState*` | 3 пустых состояния с иконками и CTA |

### 5. Рекомендации — Action-Oriented

Каждая рекомендация кликабельна и ведёт к Dialog с деталями:
- Priority (P0-P3) с цветовым кодированием
- Ожидаемый эффект (+N score, -N risk)
- Сложность (trivial/low/medium/high)
- ROI числовой показатель
- Ссылки на конкретные findings

### 6. Empty States

| Состояние | Компонент | Действие |
|-----------|-----------|----------|
| Нет данных (первый визит) | `EmptyStateNoData` | "Run Your First Scan" → Scan Tab |
| Нет данных для сравнения | `EmptyStateNoComparison` | "Run at least two scans" |
| Идеальное состояние | `EmptyStatePerfect` | "Schedule Regular Scans" |
| Переключение на реал | Баннер + кнопка | "Use Real Data" → пустое состояние |

## Изменённые файлы

| Файл | Действие |
|------|----------|
| `src/components/dashboard/dashboard.tsx` | Добавлена вкладка "Security" (первая), удалён ActivityCard |
| `src/components/security-dashboard/demo-adapter.ts` | Новый: адаптер с демо-данными + утилиты стилей |
| `src/components/security-dashboard/security-widgets.tsx` | Новый: 8 визуальных компонентов |
| `src/components/security-dashboard/security-tab.tsx` | Новый: основная вкладка с демо/реал переключением |

## Не изменено

- Security State Engine (0 строк)
- Explainability Layer (0 строк)
- Prisma schema (0 строк)
- API Routes (0 строк)
- React/Next.js конфигурация
- Auth flow
- Existing tabs (Scan, History, Teams, API Keys, Billing)

## Архитектура интеграции

```
React Component (security-tab.tsx)
    ↓
demo-adapter.ts (getDemoData)
    ↓
Security State Engine (compute)
    ↓
Explainability Layer (explain)
    ↓
ExplanationResult → UI Components
```

В продакшене `demo-adapter.ts` будет заменён на API route, который:
1. Получает findings из БД
2. Вызывает `securityStateEngine.compute(input)`
3. Вызывает `explanationEngine.explain(input)`
4. Возвращает `ExplanationResult` в JSON

Доменные модули остаются чистыми — адаптер — единственная точка связи с UI.

## Ограничения

1. **Демо-данные захардкожены** — 8 findings с фиксированными датами. В продакшене заменяются реальными данными.
2. **Нет WebSocket/SSE** для Security Dashboard — данные статичны до следующего скана.
3. **i18n** — Security Dashboard использует English hardcoded строки (как и весь текущий Dashboard).
4. **No real adapter** — переключение на "Use Real Data" показывает empty state, а не реальные данные.
5. **SVG gauge** — нет анимации загрузки, простая circle. Для MVP достаточно.

## Будущие улучшения

1. **API route** `/api/security/state` — реальный адаптер к БД
2. **Real-time updates** — SSE для Security State при завершении скана
3. **Target selector** — переключение между целями в Security Dashboard
4. **Historical trend chart** — график score за последние N сканов
5. **Finding detail** — переход из рекомендации к деталям finding
6. **i18n** — перевести все строки Security Dashboard

## Самопроверка

### Оценки (глаза первого пользователя)

| Критерий | Оценка | Обоснование |
|----------|--------|-------------|
| **Time to First Value** | **9/10** | Демо-данные показываются мгновенно. Реальное TTFV требует скана (~10 сек). |
| **UX** | **7/10** | Security Dashboard понятен и action-oriented. Но: SPA без deep linking, нет мобильно-оптимизированного layout. |
| **Архитектура** | **8/10** | Чистая интеграция через адаптер, 0 изменений в доменных модулях. Но демо-адаптер — временный костыль. |
| **Коммерческая ценность** | **8/10** | Пользователь видит "Почему 62?" и "Что исправить?" — это прямая ценность. Но без реального скана — только демо. |
| **Вероятность удержания** | **7/10** | Рекомендации P0 создают чувство срочности. Executive summary даёт контекст. Но нужен реальный скан для подтверждения. |

### Итоговая оценка: **7.8/10**

**Сильные стороны:**
- Мгновенная ценность через демо
- Реальные доменные модули, не mock
- Action-oriented: каждая рекомендация → диалог с деталями
- Чистая архитектура интеграции

**Слабые места:**
- Демо-данные не отражают реальность (нет выбора: показываем демо или пустоту)
- Нет "Repeat Scan" CTA на Security Dashboard
- Нет мобильных оптимизаций
- "How it works" удалён, но онбординг для новых пользователей минимален

### Что я улучшил после ревью

1. **Initial state = demo** — изначально планировал показывать empty state, но это не давало ценности. Переключил на demo по умолчанию.
2. **"Use Real Data" banner** — явный индикатор демо-режима с возможностью переключения.
3. **Recommendation Dialog** — добавил при клике на рекомендацию диалог с деталями, ROI и reasoning.
4. **Score circle gauge** — SVG с color-coded arc вместо простого числа.