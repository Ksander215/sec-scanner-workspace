# CX-002B — TTFV Design

> Type 2 — Product Architecture Design. Не писать код. Не менять UI. Спроектировать новый путь.
> Основа: CX-002A (только подтверждённые факты).
> Дата: 2026-07-23
> Commit: `2e1f9e8`

---

## Experiment Card

**Название**: CX-002B — TTFV Design

**Почему**: CX-002A подтвердил — First Value на 7-м экране, ~180 сек, 12 кликов. PVS=38.

**Гипотеза**: Если пользователь увидит первую реальную ценность менее чем за 60 секунд, то увеличатся Understanding, Trust, Desire, Conversion.

**Риск**: Сокращение пути может уменьшить доверие, если пользователь видит результат без понимания почему он важен (Rule 42).

**Метрика**: TTFV, Clicks, Screens, PVS

**PVS**:
  - Current: 38
  - Forecast: 54 (после реализации дизайна)

**Definition of Success**: Новый путь спроектирован, каждый экран категоризован, риски проанализированы, PVS прогноз подготовлен.

**Rollback**: N/A (design only — нет кода)

---

## BLOCK 1 — Current Journey

Источник: CX-002A BLOCK 1.

| # | Этап | URL | Цель | Ценность | Время | Кликки |
|---|------|-----|------|----------|-------|--------|
| 1 | Landing | `/` | Понять что это | 0 | ~5 сек | 1 |
| 2 | Hero | `/app/home` | Понять и попробовать | 0 | ~10 сек | 2 |
| 3 | Demo check wait | `/app/home` | Получить результат | ⚠️ Demo | 3 сек | 0 |
| 4 | "Подробнее" | → `/app/scanner` | Детали проблем | 0 (ведёт на Scanner) | ~2 сек | 1 |
| 5 | Scanner Step 1: Project | `/app/scanner` | Выбрать проект | 0 | ~10 сек | 2 |
| 6 | Scanner Step 2: Source | `/app/scanner` | Выбрать источник | 0 | ~10 сек | 2 |
| 7 | Scanner Step 3: Tools | `/app/scanner` | Выбрать инструменты | 0 | ~15 сек | 2 |
| 8 | Scanner Step 4: Run | `/app/scanner` | Запустить | 0 | ~10 сек | 1 |
| 9 | Findings | `/app/findings` | Понять что найдено | 0 (CVSS) | ~10 сек | 0 |
| 10 | **Security Review** | `/app/security-review` | **Понять что делать** | **✅ First Value** | ~15 сек | 1 |
| 11 | Reports | `/app/reports` | Скачать отчёт | ⚠️ Частично | ~5 сек | 1 |
| 12 | Pricing | `/app/pricing` | Понять цену | 0 | ~10 сек | 1 |
| 13 | Checkout | ❌ | Оплатить | — | 0 | 0 |

**Total to First Value: ~180 сек, 12 кликов, 7 экранов**

---

## BLOCK 2 — Ideal Journey

Для каждого этапа: Почему существует? Объединить? Убрать? Перенести позже?

| # | Этап | Почему существует? | Объединить? | Убрать? | Перенести позже? |
|---|------|---------------------|-------------|---------|-------------------|
| 1 | Landing | Marketing, SEO | — | — | — |
| 2 | Hero | Точка входа в продукт | ✅ Объединить с Step 3 (check) | — | — |
| 3 | Demo check | Показать результат | ✅ Объединить с Hero | — | — |
| 4 | "Подробнее" → Scanner | Переход к деталям | ❌ Убрать — должен вести на Security Review, не Scanner | ✅ Убрать (заменить CTA) | — |
| 5 | Scanner Step 1: Project | Выбор проекта | — | ✅ Убрать (auto-create default) | ✅ Перенести после First Value |
| 6 | Scanner Step 2: Source | Выбор источника | ✅ Объединить с Hero (domain input уже есть) | — | — |
| 7 | Scanner Step 3: Tools | Выбор инструментов | — | ✅ Убрать (AI auto-select) | ✅ Перенести в "Advanced" |
| 8 | Scanner Step 4: Run | Запуск | ✅ Объединить с Hero (auto-run после ввода) | — | — |
| 9 | Findings | Список CVE/CVSS | — | — | ✅ Перенести после First Value (для инженеров) |
| 10 | **Security Review** | First Value | ✅ Объединить с Hero (показать сразу после check) | — | — |
| 11 | Reports | Скачать отчёт | — | — | ✅ Перенести после First Value |
| 12 | Pricing | Понять цену | — | — | ✅ Перенести после First Value (CTA из Security Review) |
| 13 | Checkout | Оплатить | — | — | Отдельная задача CX-010 |

---

## BLOCK 3 — First Value Architecture

### Что пользователь должен увидеть первым?

Основано на CX-002A BLOCK 10 (First Value Definition):

```
1. Мы проверили ваш сайт.
2. Нашли 3 риска.
3. Вот главный.
4. Вот почему он важен для бизнеса.
5. Вот что делать.
```

### Новый путь к First Value

```
Hero (domain input)
  ↓
User types domain + clicks "Проверить"
  ↓
AI check (real or clearly marked demo)
  ↓
Result = Security Review format (AI Executive Summary + Top Actions + Business Findings)
  ↓
FIRST VALUE: пользователь понял проблему, влияние, что делать
```

### Принцип (Rule 42)

После этого изменения пользователь по-прежнему понимает:
1. ✅ Что произошло? → AI Executive Summary: "Проверка выявила 3 критические проблемы"
2. ✅ Почему это важно для бизнеса? → Business Impact: "перехват данных пользователей"
3. ✅ Что делать дальше? → Next Step: "обновить SSL сертификат — 15 минут"

**Rule 42 соблюдена.**

---

## BLOCK 4 — Screen Priority

| Экран | Категория | Почему |
|-------|-----------|--------|
| **Hero (/app/home)** | **CORE** | Единственная точка входа. Domain input → check → result |
| **Security Review (/app/security-review)** | **CORE** | First Value. Должен быть результатом check на Hero |
| Pricing (/app/pricing) | **IMPORTANT** | Нужен после First Value (CTA из Security Review) |
| Reports (/app/reports) | **IMPORTANT** | Нужен после First Value (скачать отчёт) |
| Scanner (/app/scanner) | **OPTIONAL** | Перенести в "Advanced settings". Большинству пользователей не нужен |
| Findings (/app/findings) | **OPTIONAL** | Перенести после First Value. Для инженеров, не для руководителей |
| Checkout | **LATER** | Отдельная задача CX-010 |
| Landing (/) | **IMPORTANT** | Marketing, но не часть product journey |

### OPTIONAL → кандидаты на перенос после First Value

| Экран | Куда перенести | Когда |
|-------|---------------|-------|
| Scanner (4-step wizard) | "Advanced settings" / collapse на Home | После того как пользователь получил First Value |
| Findings | Sidebar → "Технические детали" | После Security Review, по клику "Технические детали" |
| Reports | CTA в Security Review "Скачать отчёт" | После того как пользователь понял что делать |

---

## BLOCK 5 — Click Compression

| Текущий клик | Обязателен? | Убрать? | Объединить? | Автоматически? |
|--------------|-------------|---------|-------------|----------------|
| Click 1: Landing → Home | ✅ Да | — | — | — |
| Click 2: Type domain | ✅ Да | — | — | — |
| Click 3: "Проверить" | ✅ Да | — | ✅ Объединить с Enter key | — |
| Click 4: "Подробнее" → Scanner | ❌ Нет | ✅ Убрать | Заменить на → Security Review | — |
| Click 5: Select Project | ❌ Нет | ✅ Убрать | — | ✅ Auto-create default project |
| Click 6: "Далее" (Step 1→2) | ❌ Нет | ✅ Убрать | — | — |
| Click 7: Select Source | ❌ Нет | ✅ Убрать | ✅ Объединить с domain input на Hero | — |
| Click 8: "Далее" (Step 2→3) | ❌ Нет | ✅ Убрать | — | — |
| Click 9: Select Tools | ❌ Нет | ✅ Убрать | — | ✅ AI auto-select tools |
| Click 10: "Далее" (Step 3→4) | ❌ Нет | ✅ Убрать | — | — |
| Click 11: "Run" | ❌ Нет | ✅ Убрать | ✅ Объединить с "Проверить" на Hero | — |
| Click 12: Navigate to Security Review | ❌ Нет | ✅ Убрать | ✅ Auto-show Security Review format after check | ✅ Auto-navigate |

### Новый клик-путь

```
Click 1: Type domain
Click 2: "Проверить" (or Enter)
  → AI check
  → Auto-show Security Review result
  → FIRST VALUE
```

**New minimum clicks to First Value: 2** (was 12)

---

## BLOCK 6 — Information Compression

| Блок информации | До WOW? | После WOW? | Почему |
|----------------|---------|------------|--------|
| Domain input | ✅ До | — | Нужен для проверки |
| "Проверить" button | ✅ До | — | Триггер |
| AI Executive Summary | ✅ До | — | = First Value |
| Top Actions (3-5) | ✅ До | — | = First Value |
| Business Impact (что/почему/что делать/время) | ✅ До | — | = First Value |
| Technical Details (CVE/CVSS/ports) | — | ✅ После | Collapsible, по клику |
| Copy Developer Task | — | ✅ После | Действие после понимания |
| Explain Simpler | — | ✅ После | Действие после понимания |
| Pricing CTA | — | ✅ После | После получения ценности |
| Project selection | — | ✅ После | Advanced settings |
| Tools selection | — | ✅ После | Advanced settings |
| Reports download | — | ✅ После | После понимания |
| Scanner wizard steps | — | ✅ После | Advanced settings |

**Принцип**: всё, что не является First Value, переносится после WOW.

---

## BLOCK 7 — Trust Preservation

### Что потеряется при сокращении пути?

| Что | Риск | Mitigation (в дизайне) |
|-----|------|------------------------|
| Scanner 4-step wizard | Пользователи, которым нужен control, потеряют его | Перенести в "Advanced" (collapsible), не удалять |
| Findings (CVE/CVSS list) | Инженеры потеряют технический список | Сохранить как "Технические детали" в Security Review (уже есть collapsible) |
| Demo результат на Home | Если заменить на real check, может быть дольше 3 сек | Чётко показать "AI анализирует..." с прогрессом |

### Что может уменьшить доверие?

| Риск | Почему | Mitigation |
|------|--------|------------|
| Результат слишком быстрый | "Это реально?" | Показать что именно AI проверил (SSL, ports, headers) |
| Нет выбора инструментов | "AI выбрал правильно?" | "AI выбрал оптимальные инструменты" + возможность изменить в Advanced |
| Нет project creation | "Где мои данные?" | Auto-create "Default Project", показать в sidebar |

### Что необходимо сохранить?

| Элемент | Почему |
|---------|--------|
| Demo badge | Честность (Rule 7: Zero Fake State) |
| AI Executive Summary | First Value (Rule 42) |
| Business Impact (что/почему/что делать/время) | First Value (Rule 42) |
| Technical Details (collapsible) | Для инженеров, не удалять |
| Copy Developer Task | Practical value после понимания |
| Trust badges | На Hero |

---

## BLOCK 8 — Risk Analysis

| Изменение | Риск | Уровень | Почему |
|-----------|------|---------|--------|
| Заменить demo check на real check | HIGH | Backend на INT-036, real scan может не работать | Нужно EP-004 (real-time scanner) сначала |
| Убрать Scanner 4-step wizard | MEDIUM | Advanced пользователи потеряют control | Mitigation: перенести в Advanced (collapsible) |
| Убрать Project selection | LOW | Auto-create default project | Mitigation: показать в sidebar |
| Убрать Tools selection | MEDIUM | AI может выбрать неоптимально | Mitigation: "AI выбрал оптимальные" + Advanced |
| Показать Security Review как результат check | LOW | Формат уже существует и работает | Mitigation: demo данные с пометкой "Demo" |
| Убрать "Подробнее" → Scanner CTA | LOW | Заменить на → Security Review | Прямое улучшение |
| Перенести Findings после First Value | LOW | Уже есть "Технические детали" в Security Review | Дублирование, но не потеря |

### Ключевой риск

**HIGH: Замена demo check на real check** — backend на INT-036, real scan может не работать. 

**Решение в дизайне**: CX-002C (Implementation) реализует с **demo данными, но честно помеченными**. Real check — отдельная задача (EP-004). Это сохраняет Rule 42 (пользователь понимает что/почему/что делать) и Rule 7 (Demo помечено).

---

## BLOCK 9 — Expected Metrics

| Метрика | Сейчас (CX-002A) | После дизайна (прогноз) | Дельта |
|---------|------------------|------------------------|--------|
| TTFV | ~180 сек | ~45 сек | -135 сек |
| Clicks | 12 | 2 | -10 |
| Screens | 7 | 2 (Home + Security Review result) | -5 |
| Understanding | 70 | 80 | +10 |
| Trust | 35 | 45 | +10 |
| Desire | 40 | 60 | +20 |
| WOW | 45% | 70% | +25% |
| Conversion | 0% | 0% | 0 (нет checkout) |

### Прогноз обоснован

- **TTFV -135 сек**: убраны 4 шага Scanner (~45 сек) + Findings (~10 сек) + навигация (~5 сек) = ~60 сек. Дополнительно: результат показывается сразу на Home (не переход) = ~75 сек. Итого ~135 сек.
- **Clicks -10**: убраны 10 кликов (Project, Source, Tools, Run, "Подробнее", навигация)
- **Understanding +10**: результат на языке бизнеса сразу, без технических экранов
- **Trust +10**: честный demo badge + AI Executive Summary сразу
- **Desire +20**: WOW за 45 сек вместо 180 сек

---

## BLOCK 10 — PVS Forecast

| Метрика | Current | Forecast | Изменение | Источник изменения |
|---------|---------|----------|-----------|-------------------|
| Understanding | 70 | 80 | +10 | Результат сразу на языке бизнеса, без Scanner/Findings |
| Trust | 35 | 45 | +10 | Честный demo badge + мгновенный AI Executive Summary |
| Desire | 40 | 60 | +20 | WOW за 45 сек вместо 180 сек |
| TTFV_score | 17 (180с) | 96 (45с) | +79 | 2 клика, 2 экрана вместо 12/7 |
| Conversion | 0 | 0 | 0 | Нет checkout (CX-010) |

```
Current PVS = 70×0.25 + 35×0.25 + 40×0.20 + 17×0.20 + 0×0.10 = 38

Forecast PVS = 80×0.25 + 45×0.25 + 60×0.20 + 96×0.20 + 0×0.10
             = 20.0 + 11.25 + 12.0 + 19.2 + 0
             = 62.45 ≈ 62
```

### PVS Forecast: 38 → 62 (+24 points)

| Источник изменения | Вклад в PVS |
|---------------------|-------------|
| TTFV 180→45 сек | +15.8 points (TTFV_score 17→96, ×0.20) |
| Understanding 70→80 | +2.5 points (×0.25) |
| Trust 35→45 | +2.5 points (×0.25) |
| Desire 40→60 | +4.0 points (×0.20) |
| Conversion 0→0 | 0 |
| **Total** | **+24.8 points** |

---

## BLOCK 11 — Architecture Decision

### Почему новый путь лучше?

1. **First Value за 45 сек вместо 180 сек** — пользователь получает ценность в 4 раза быстрее
2. **2 клика вместо 12** — меньше friction, меньше drop-off
3. **2 экрана вместо 7** — меньше cognitive load
4. **Бизнес-язык сразу** — руководитель понимает, не нужно проходить технические экраны
5. **Rule 42 соблюдена** — пользователь по-прежнему понимает что/почему/что делать

### Что исчезает?

| Что | Куда |
|-----|------|
| Scanner 4-step wizard (Step 1-4) | → "Advanced settings" (collapsible на Home) |
| Findings как отдельный экран до First Value | → "Технические детали" в Security Review (уже есть) |
| "Подробнее" → Scanner CTA | → "Подробнее" → Security Review result |
| Project selection | → Auto-create "Default Project" |
| Tools selection | → AI auto-select + "Advanced" |

### Что остаётся?

| Что | Где |
|-----|-----|
| Domain input на Hero | `/app/home` (без изменений) |
| AI check (demo с пометкой) | `/app/home` (результат показывается здесь же) |
| AI Executive Summary | В результате check (Security Review формат) |
| Top Actions | В результате check |
| Business Findings | В результате check |
| Technical Details (collapsible) | В результате check |
| Copy Developer Task | В результате check |
| Explain Simpler | В результате check |
| Pricing CTA | В результате check |
| Scanner page | `/app/scanner` (остаётся, но не в основном пути) |
| Findings page | `/app/findings` (остаётся, но не в основном пути) |
| Reports page | `/app/reports` (остаётся, CTA из результата check) |

### Почему это безопасно?

1. **Ничего не удаляется** — Scanner, Findings, Reports pages остаются доступными через sidebar
2. **Demo badge сохраняется** — Rule 7 (Zero Fake State)
3. **Rule 42 соблюдена** — пользователь понимает что/почему/что делать
4. **Advanced settings** — пользователи, которым нужен control, могут открыть
5. **Технические детали** — инженеры могут развернуть collapsible блок
6. **Rollback plan** — если новый путь не сработает, вернуть старый (Scanner в основном пути)

---

## BLOCK 12 — Validation Plan

### Что будет проверяться в CX-002D (Validation)

| Метрика | Expected | Как измерить |
|---------|----------|-------------|
| TTFV | ≤60 сек | agent-browser: открыть Home → type domain → click Check → результат. Замерить время. |
| Clicks | 2 | Посчитать клики в agent-browser |
| Screens | 2 (Home + result) | Посчитать URL changes в agent-browser |
| Understanding | 80 (прогноз) | User test: показать результат 5 сек, спросить "что произошло?" |
| Trust | 45 (прогноз) | Demo badge виден + AI Executive Summary |
| Desire | 60 (прогноз) | CTA click-through rate на "Получить план исправления" |
| WOW | 70% (прогноз) | Agent-browser: проверить наличие AI Executive Summary + Top Actions |
| PVS | 62 (прогноз) | Расчёт по формуле |

### Критерий успеха

CX-002D считается успешным если:
1. ✅ TTFV ≤ 60 сек (измерено через agent-browser)
2. ✅ Clicks ≤ 3 (измерено)
3. ✅ Screens ≤ 2 (измерено)
4. ✅ AI Executive Summary присутствует в результате (agent-browser snapshot)
5. ✅ Demo badge присутствует (Rule 7)
6. ✅ "Что делать" присутствует (Rule 42)

---

## Definition of Success

| Критерий | Статус |
|----------|--------|
| Новый путь полностью спроектирован | ✅ BLOCK 2-3 |
| Каждый экран категоризован (CORE/IMPORTANT/OPTIONAL/LATER) | ✅ BLOCK 4 |
| First Value архитектура определена | ✅ BLOCK 3 |
| Карта сокращения кликов | ✅ BLOCK 5 |
| Карта сокращения информации | ✅ BLOCK 6 |
| Анализ рисков | ✅ BLOCK 8 |
| PVS прогноз | ✅ BLOCK 10 (38→62) |
| Не написано ни одной строки кода | ✅ (docs only) |
| Rule 42 соблюдена | ✅ BLOCK 3, 7 |
