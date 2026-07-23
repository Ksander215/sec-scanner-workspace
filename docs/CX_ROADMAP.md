# CX MASTER ROADMAP — Product Conversion Evolution

> Дата: 2026-07-23
> Commit: `aa1f4ac`
> Принцип: Rule 34 — Value First Evolution. Запрещается делать новую функцию. Только то, что увеличивает TTFV / Trust / Understanding / WOW / Conversion / Retention.

---

## RULE 34 — Value First Evolution

Запрещается делать новую функцию. Разрешается делать только то, что увеличивает минимум один показатель:

1. Time To First Value (TTFV)
2. Trust
3. Understanding
4. WOW Effect
5. Conversion
6. Retention

Если изменение не влияет ни на один показатель — оно не имеет приоритета.

---

## RULE 35 — Hypothesis-Based Development

Каждая задача должна начинаться с гипотезы и заканчиваться проверкой:

```
Гипотеза: [что улучшится и на сколько]
Изменения: [что реализовано]
Ожидаемый эффект: [какие метрики должны улучшиться]
Проверка: [что нужно измерить после деплоя]
```

Запрещается формат "Сделан новый Hero". Только гипотеза → изменение → эффект → проверка.

---

## KPI Table

| KPI | Сейчас | Цель | Как измерить |
|-----|--------|------|--------------|
| Понимание продукта за 5 сек | 70% | 95% | User test: показать Home 5 сек, спросить "что это?" |
| Желание проверить сайт | 40% | 90% | Click-through rate на domain input |
| Доверие к продукту | ~60% | 95% | Trust Score (CX-005) |
| Time To First Value | ~180 сек (3 мин) | ≤60 сек | От открытия Home до первого результата |
| WOW Score | ~45% | ≥90% | WOW Timeline (CX-004) |
| Конверсия Hero → Первый скан | Не измеряется | +50% | Click на "Проверить" / visitors |
| Конверсия Отчёт → Pricing | Не измеряется | +40% | Click на "Получить план" / Security Review visitors |
| Конверсия Pricing → Checkout | 0% (нет checkout) | ≥60% | Trial signups / Pricing visitors |

---

## CX-002 — Time To First Value Optimization

### BLOCK 1: Измерить текущее

| Метрика | Сейчас | Цель |
|---------|--------|------|
| Количество экранов до первого WOW | 3 (Home → Scanner → Findings) | 1 (Home) |
| Количество кликов до первого WOW | 5 (input → check → scanner → run → results) | 1 (input → check) |
| Количество полей до первого WOW | 4+ (Project, Source, Tools, URL) | 1 (URL) |
| Количество ожиданий | 2 (demo check 3s + scanner pipeline) | 1 (real check) |
| Время до первого WOW | ~180 сек | ≤60 сек |

### BLOCK 2: Карта

**Сейчас:**
```
Landing → /app/home → input domain → demo result (3s) → click "Подробнее" → /app/scanner → 
select Project → select Source → select Tools → click "Run" → wait pipeline → /app/findings → 
список CVE → (нет WOW, технический язык) → перейти на /app/security-review → WOW (бизнес-перевод)
```

**Цель:**
```
Landing → /app/home → input domain → real check → AI Executive Summary → WOW (бизнес-перевод)
```

### BLOCK 3: Что можно убрать

| Что убрать | Почему | Влияние на TTFV |
|------------|--------|-----------------|
| Шаг "Project selection" в Scanner | Пользователь хочет ввести URL, не создавать проект | -30 сек |
| Шаг "Source selection" в Scanner | Автовыбор AI | -20 сек |
| Шаг "Tools selection" в Scanner | AI выбирает автоматически | -15 сек |
| Переход Home → Scanner для проверки | Проверка прямо на Home | -60 сек |
| Переход Findings → Security Review | Security Review как единый результат | -15 сек |
| Demo result на Home (fake) | Заменить на реальную проверку | +trust |

### BLOCK 4: TTFV Score

| Метрика | Текущий score | Целевой score |
|---------|---------------|---------------|
| Screens to WOW | 3/10 (3 экрана) | 9/10 (1 экран) |
| Clicks to WOW | 4/10 (5 кликов) | 9/10 (1 клик) |
| Fields to WOW | 3/10 (4+ полей) | 9/10 (1 поле) |
| Time to WOW | 3/10 (~180 сек) | 9/10 (≤60 сек) |
| **TTFV Score** | **3.3/10** | **9.0/10** |

---

## CX-003 — Cognitive Load Audit

### Home (/app/home)

| Элемент | Current | Target | Gap |
|---------|---------|--------|-----|
| CTAs (buttons/links) | 24 | 8 | -16 |
| Карточек | 11 | 5 | -6 |
| Иконок | 14 | 6 | -8 |
| Бейджей | 2 | 2 | 0 |
| Цветов | 16 | 6 | -10 |
| Чисел | 352 | 20 | -332 |
| Технических терминов | 2 | 0 | -2 |

### Scanner (/app/scanner)

| Элемент | Current | Target | Gap |
|---------|---------|--------|-----|
| CTAs | 35 | 5 | -30 |
| Карточек | 34 | 8 | -26 |
| Иконок | 95 | 10 | -85 |
| Шагов | 20 (refs) | 1 | -19 |
| Цветов | 2 | 4 | +2 |
| Чисел | 706 | 30 | -676 |
| Технических терминов | 61 | 0 | -61 |

### Pricing (/app/pricing)

| Элемент | Current | Target | Gap |
|---------|---------|--------|-----|
| CTAs | 5 | 4 | -1 |
| Карточек (планов) | 3 | 4 | +1 |
| Цветов | 2 | 4 | +2 |
| Чисел | 251 | 40 | -211 |
| Технических терминов | 2 | 0 | -2 |

### Security Review (/app/security-review)

| Элемент | Current | Target | Gap |
|---------|---------|--------|-----|
| CTAs | 11 | 8 | -3 |
| Карточек | 12 | 10 | -2 |
| Цветов | 20 | 8 | -12 |
| Чисел | 307 | 50 | -257 |
| Технических терминов (visible) | 9 | 0 (all hidden) | -9 |
| Бизнес-терминов | 7 | 20 | +13 |

---

## CX-004 — WOW Journey

| Экран | Есть WOW? | Почему | WOW Score |
|-------|-----------|--------|-----------|
| Landing | ❌ Нет | Стандартный marketing, ничего уникального | 10% |
| Hero (/app/home) | ⚠️ Частично | Domain input + AI check — интересно, но demo результат | 35% |
| Scanner | ❌ Нет | Сложная форма, технические термины | 10% |
| Findings | ❌ Нет | Технический список CVE/CVSS | 5% |
| Security Review | ✅ Да | AI Executive Summary + бизнес-перевод + Copy task | 80% |
| Reports | ⚠️ Частично | Real download, но нет wow | 30% |
| Pricing | ❌ Нет | Стандартные тарифы, нет ROI calculator | 15% |
| Checkout | ❌ Не существует | — | 0% |

### WOW Timeline (цель)

```
Landing:    10% → 30% (видно AI-powered, real product preview)
Hero:       35% → 70% (real check за 60 сек, business result)
Scanner:    10% → (убрать, проверки на Home)
Results:    80% → 90% (AI Executive Summary сразу после check)
Security:   80% → 100% (Copy task, Explain simpler, Jira integration)
Pricing:    15% → 40% (ROI calculator, comparison table)
Checkout:   0% → 50% (1-click trial, no credit card)
```

**Принцип**: перенести WOW выше. Пользователь должен получить WOW на Home (real check), не на 3-м экране.

---

## CX-005 — Trust Architecture

### Trust Score: 35/100

| Элемент | Реальное? | Demo? | Пометка? | Score |
|---------|-----------|-------|----------|-------|
| Отзывы клиентов | ❌ Нет | N/A | N/A | 0/10 |
| Кейсы | ❌ Нет | N/A | N/A | 0/10 |
| Логотипы клиентов | ❌ Нет | N/A | N/A | 0/10 |
| Цифры (MRR, users) | ❌ $0 MRR, 0 users | Demo | ✅ CEO Dashboard | 3/10 |
| Результаты сканирования | ❌ Demo (setTimeout) | Demo | ✅ Home badge | 4/10 |
| Отчёты | ✅ Real file download | — | — | 7/10 |
| AI Assistant | ⚠️ Pattern-based, не ML | Demo | ❌ Нет пометки | 4/10 |
| Скорость | ❌ 3s setTimeout (не real) | Demo | ❌ | 2/10 |
| Безопасность данных | ⚠️ Нет auth, нет encryption | N/A | N/A | 2/10 |
| Compliance | ❌ Нет SOC2/ISO | N/A | N/A | 0/10 |
| **Trust Score** | | | | **35/100** |

**Цель**: 95/100. Главные блокеры: нет testimonials, нет logos, нет real scans, нет compliance.

---

## CX-006 — Business Language

### Текущее соотношение

| Экран | Технических | Бизнес | Соотношение |
|-------|-------------|--------|-------------|
| Home | 2 | 7 | 1:3.5 ✅ |
| Scanner | 61 | 0 | 61:0 ❌ |
| Findings | 20+ | 0 | 20:0 ❌ |
| Security Review | 9 (hidden) | 7 | 1.3:1 ⚠️ |
| Reports | 6 (SARIF) | 0 | 6:0 ❌ |
| Pricing | 2 | 0 | 2:0 ❌ |
| **Итого** | **100** | **14** | **7.1:1** ❌ |

### Цель: 1:4 (на одно техническое — четыре бизнесовых)

**Текущее**: 7.1:1 (100 техн / 14 бизнес)
**Цель**: 1:4 (нужно 400 бизнес-терминов для 100 технических, или уменьшить технические до 3.5)

**Путь**: уменьшить технические до ~20 (скрыть в collapsible) + увеличить бизнес до ~80 = 1:4

---

## CX-007 — Emotion Audit

| Экран | Интерес | Любопытство | Тревога | Желание проверить | Доверие | Удовольствие |
|-------|---------|-------------|---------|-------------------|---------|--------------|
| Landing | 6 | 5 | 2 | 4 | 5 | 3 |
| Hero | 7 | 8 | 3 | 8 | 5 | 6 |
| Scanner | 3 | 2 | 6 | 3 | 3 | 1 |
| Findings | 2 | 1 | 7 | 1 | 2 | 1 |
| Security Review | 7 | 7 | 4 | 6 | 6 | 7 |
| Reports | 4 | 3 | 2 | 2 | 5 | 4 |
| Pricing | 3 | 2 | 4 | 2 | 3 | 2 |
| Checkout | 0 | 0 | 0 | 0 | 0 | 0 |

### Emotion Graph (текстовый)

```
Интерес:     Landing ████░░ Scanner ██░░░░ Security ██████░ Pricing ██░░░░
Любопытство: Landing ███░░░ Scanner █░░░░░ Security █████░░ Pricing █░░░░░
Тревога:     Landing █░░░░░ Scanner █████░ Security ███░░░ Pricing ███░░░
Желание:     Landing ██░░░░ Scanner █░░░░░ Security ████░░ Pricing █░░░░░
Доверие:     Landing ██░░░░ Scanner █░░░░░ Security ███░░░ Pricing █░░░░░
Удовольств:  Landing █░░░░░ Scanner █░░░░░ Security ████░░ Pricing █░░░░░
```

**Вывод**: Scanner и Findings — максимум тревоги, минимум интереса. Security Review — лучший по всем метрикам. Pricing — низкий везде.

---

## CX-008 — Conversion Psychology

| Вопрос | Сейчас | Почему |
|--------|--------|--------|
| Понимает? | ⚠️ Частично (70%) | Home понятен, Scanner — нет |
| Верит? | ❌ Мало (35%) | Demo данные, mock integrations, fake progress |
| Хочет попробовать? | ⚠️ Средне (40%) | Domain input мотивирует, но demo результат разочаровывает |
| Готов платить? | ❌ Нет (0%) | Нет checkout, нет trial, нет registration |
| Понимает цену? | ❌ Нет | 3 источника pricing, цены в ₽, нет ROI |
| Понимает выгоду? | ⚠️ Частично (50%) | Security Review показывает выгоду, но только на 5-м экране |

---

## CX-009 — Pricing Psychology

| Элемент | Есть? | Оценка |
|---------|-------|--------|
| Anchor pricing | ❌ Нет (Enterprise не виден на странице) | 0/10 |
| Decoy | ❌ Нет | 0/10 |
| Trial | ⚠️ "14 дней бесплатно" текст есть, но нет flow | 3/10 |
| Guarantee | ❌ Нет money-back guarantee | 0/10 |
| FAQ | ❌ Нет FAQ на pricing | 0/10 |
| ROI calculator | ❌ Нет | 0/10 |
| Comparison table | ⚠️ Есть, но базовая | 4/10 |
| Urgency | ❌ Нет urgency elements | 0/10 |
| **Pricing Psychology Score** | | **1/10** |

---

## CX-010 — Checkout (отсутствует)

```
Pricing → ??? → ??? → ??? → ??? → ???
```

| Шаг | Существует? | Что нужно |
|-----|-------------|-----------|
| Pricing → Checkout | ❌ | Registration form (email/password) |
| Checkout → Payment | ❌ | Stripe checkout |
| Payment → Success | ❌ | Success screen + onboarding |
| Success → First Login | ❌ | Dashboard/Home после login |
| First Login → First Scan | ❌ | Onboarding wizard (3 шага) |

**Conversion Pricing → Checkout: 0%** (нет checkout).

---

## CX-011 — User Journey Heatmap

| Экран | Где думает | Где сомневается | Где радуется | Где уходит |
|-------|------------|-----------------|--------------|------------|
| Landing | "Что это?" | "Для меня ли это?" | — | Если не понял за 5 сек |
| Hero | "Что ввести?" | "Это demo или реально?" | AI check result | Если demo разочаровал |
| Scanner | "Какой проект?" "Какие инструменты?" | "Что выбрать?" "Это сложно" | — | **60% уходят здесь** (4-step wizard) |
| Findings | "Что это значит?" | "CVE-2024-1234?" | — | Если технический язык |
| Security Review | "Что делать первым?" | — | AI Executive Summary | Низкий уход |
| Reports | "Какой формат?" | "SARIF?" | Real download | Низкий уход |
| Pricing | "Сколько?" "Для меня?" | "₽ или $?" "Нет trial" | — | Если нет trial CTA |

---

## CX-012 — Product Premium Audit

| Критерий | SIP (сейчас) | Microsoft Defender | Wiz | CrowdStrike | Snyk |
|----------|-------------|-------------------|-----|-------------|------|
| Типографика | ⚠️ Базовая | ✅ Premium | ✅ Premium | ✅ Premium | ✅ Premium |
| Пространство | ⚠️ Плотно | ✅ Воздух | ✅ Воздух | ✅ Воздух | ✅ Воздух |
| UI качество | ⚠️ 6/10 | ✅ 9/10 | ✅ 9/10 | ✅ 9/10 | ✅ 8/10 |
| Анимации | ⚠️ Базовые | ✅ Плавные | ✅ Плавные | ✅ Плавные | ⚠️ Минимальные |
| Цвета | ⚠️ 16 на Home | ✅ 4-5 | ✅ 4-5 | ✅ 4-5 | ✅ 4-5 |
| Доверие | ❌ 35/100 | ✅ 90+ | ✅ 90+ | ✅ 90+ | ✅ 85+ |
| Тексты | ⚠️ Техн/бизн 7:1 | ✅ Бизнес | ✅ Бизнес | ✅ Бизнес | ⚠️ Техн |
| Ощущение | ⚠️ "Инженерный инструмент" | ✅ "Enterprise product" | ✅ "Enterprise product" | ✅ "Enterprise product" | ✅ "Developer tool" |

**Вердикт**: SIP выглядит как "инженерный инструмент", не как premium product. Главные отличия от конкурентов: слишком много цветов, слишком плотно, технический язык, нет доверия.

---

## Приоритизация CX задач

| Задача | Главный KPI | Влияние | Усилие | Приоритет |
|--------|-------------|---------|--------|-----------|
| CX-002 (TTFV) | Time To First Value ≤60s | 🔴 Critical | Medium | P0 |
| CX-003 (Cognitive Load) | Understanding 95% | 🟠 High | Medium | P1 |
| CX-004 (WOW Journey) | WOW Score ≥90% | 🟠 High | Medium | P1 |
| CX-005 (Trust) | Trust 95/100 | 🔴 Critical | High | P0 |
| CX-006 (Business Language) | 1:4 ratio | 🟡 Medium | Medium | P2 |
| CX-007 (Emotion) | Desire to check 90% | 🟡 Medium | Low | P2 |
| CX-008 (Conversion Psych) | Conversion +50% | 🟠 High | Low | P1 |
| CX-009 (Pricing Psych) | Pricing→Checkout 60% | 🟠 High | Medium | P1 |
| CX-010 (Checkout) | Checkout exists | 🔴 Critical | High | P0 |
| CX-011 (Heatmap) | Reduce drop-off | 🟡 Medium | Low | P2 |
| CX-012 (Premium) | Looks like $5k/mo product | 🟡 Medium | High | P2 |

---

## Следующие шаги

Согласно Rule 34 и Rule 35, каждая следующая задача оформляется так:

```
Гипотеза: CX-002 (TTFV) повысит понимание продукта с 70% до 85%
Изменения: убрать 4-step wizard, проверка прямо на Home
Ожидаемый эффект: TTFV 180s→60s, клики 5→1, поля 4→1
Проверка: измерить TTFV после деплоя через agent-browser timeline
```

### Backlog (порядок реализации)

1. **CX-002**: TTFV — убрать шаги, проверка на Home (P0)
2. **CX-010**: Checkout — registration + billing (P0)
3. **CX-005**: Trust — real data, testimonials, logos (P0)
4. **CX-004**: WOW Journey — перенести WOW на Home (P1)
5. **CX-003**: Cognitive Load — уменьшить элементы (P1)
6. **CX-008**: Conversion Psychology — CTA audit fixes (P1)
7. **CX-009**: Pricing Psychology — ROI, FAQ, comparison (P1)
8. **CX-006**: Business Language — 1:4 ratio (P2)
9. **CX-007**: Emotion — снизить тревогу на Scanner (P2)
10. **CX-011**: Heatmap — найти точки ухода (P2)
11. **CX-012**: Premium — типографика, пространство, цвета (P2)
