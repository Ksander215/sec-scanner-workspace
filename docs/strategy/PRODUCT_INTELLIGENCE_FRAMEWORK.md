# PRODUCT_INTELLIGENCE_FRAMEWORK.md - Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Стратегический документ - Product Intelligence System
> **Владелец:** CEO
> **Статус:** Active
> **Связанные документы:** PROJECT_OS.md, NORTH_STAR_METRIC.md, KPI_CATALOG.md, GROWTH_DASHBOARD.md, SUCCESS_GATES.md, WEEKLY_REVIEW_TEMPLATE.md, MONTHLY_BUSINESS_REVIEW.md, EXPERIMENT_PLAYBOOK.md, PRODUCT_MARKET_FIT_BLUEPRINT.md

---

## Executive Summary

Product Intelligence & Growth Operating System - единая система управления развитием продукта Sec Scanner на основе измеримых результатов. Документ определяет, как измеряется успех продукта, какие метрики являются критериями перехода между этапами развития, и когда необходимо менять стратегию.

Без этой системы существует критический риск: решения принимаются на основе субъективных ощущений, а не реальных данных. Особенно опасно на стадии Pre-revenue → Private Beta, когда каждый гипотеза ещё не валидирована, а ресурс на ошибки минимален.

**Ключевой принцип:** Ни одно крупное продуктовое изменение не внедряется без анализа данных. Экспертные решения допустимы только для операционных вопросов, не влияющих на пользовательскую ценность.

**Архитектура системы:**

```text
Product Intelligence & Growth OS
├── North Star Metric (NORTH_STAR_METRIC.md)
│   └── WASP - единственная главная метрика
├── KPI Catalog (KPI_CATALOG.md)
│   ├── AARRR Funnel (15 метрик)
│   ├── Product Metrics (4 метрики)
│   ├── Engineering Metrics (4 метрики)
│   └── Business Metrics (5 метрики)
├── Growth Dashboard (GROWTH_DASHBOARD.md)
│   ├── Executive Level (3 KPI)
│   ├── Product Level (5 метрик)
│   ├── Engineering Level (4 метрики)
│   ├── Business Level (4 метрики)
│   └── Growth Level (5 метрик)
├── Success Gates (SUCCESS_GATES.md)
│   └── Gate 0 → Gate 5 (6 контрольных точек)
├── Review Cadence
│   ├── Weekly Review (WEEKLY_REVIEW_TEMPLATE.md)
│   └── Monthly Business Review (MONTHLY_BUSINESS_REVIEW.md)
├── Experiment Playbook (EXPERIMENT_PLAYBOOK.md)
│   └── Hypothesis → Test → Decision
└── Decision by Data Rules
    ├── Data-Required Decisions
    ├── Expert Decisions
    └── User Interview Decisions
```

---

## 1. Product Success Model

### 1.1 Vision успешного продукта через 3 месяца (M3)

Через 3 месяца Sec Scanner - это работающий DAST SaaS с подтверждённым интересом пользователей. Не «запущенный продукт», а «продукт, который пользователи используют повторно». Успех на этом этапе измеряется не revenue, а поведенческими сигналами: возвращаются ли пользователи, сканируют ли они повторно, рекомендуют ли инструмент коллегам.

**Конкретная картина успеха M3:**
- 50 уникальных пользователей зарегистрировались (не боты, реальные CTO/developers)
- 20+ из них активно сканируют (WASP > 20)
- 12 пользователей совершили хотя бы 2 сканирования с интервалом > 3 дней (повторное использование)
- 5+ пользователей инициировали upgrade intent (достигли лимита free tier)
- 3+ пользователя дали unsolicited positive feedback
- Activation Rate > 12% (зарегистрированные →.completed first scan)
- Средний Security Score пользователей снижается от scan 1 к scan 3 (пользователи действуют по рекомендациям)

**Подтверждающие показатели M3:**
- D7 retention > 25% (каждый четвёртый вернулся через неделю)
- D30 retention > 12% (каждый восьмой - через месяц)
- NPS > 30 (если < 10 - проблема с ценностью)
- Email Digest open rate > 35%
- Среднее время от регистрации до первого скана < 3 минут

### 1.2 Vision успешного продукта через 6 месяцев (M6)

Через 6 месяцев Sec Scanner - продукт с подтверждённым Product-Market Fit сигналом. Revenue растёт, churn контролируем, пользователи интегрируют инструмент в регулярный workflow. Это момент, когда можно начать думать о fundraise или расширении команды.

**Конкретная картина успеха M6:**
- $2,320 MRR (40 paying customers)
- WASP > 150 (150 проектов сканируются еженедельно)
- Monthly churn < 8% (ниже industry average 10-12% для SaaS)
- NRR (Net Revenue Retention) > 90% (существующие клиенты не уходят и часть апгрейдится)
- Activation Rate > 15%
- 3+ unsolicited testimonials для landing page
- 2+ интеграции (GitHub, Slack или CI/CD webhook)
- Product Hunt launch завершён с top-5 Daily

**Подтверждающие показатели M6:**
- D30 retention > 20%
- Referral Rate > 8% (пользователи приглашают коллег)
- Среднее количество сканов на пользователя/месяц > 4
- CAC < $80 (при LTV > $1,200 - LTV/CAC > 15x)
- Pipeline из inbound запросов (люди сами находят продукт)

### 1.3 Vision успешного продукта через 12 месяцев (M12)

Через 12 месяцев Sec Scanner - устойчивый SaaS-бизнес с $13K MRR, готовый к Seed-раунду или bootstrapped growth. Продукт вышел за рамки «DAST-инструмент» и стал «Security Posture Dashboard» для стартапов и SMB. Архитектура масштабируется (PostgreSQL), команда расширилась, inbound channel даёт > 50% новых пользователей.

**Конкретная картина успеха M12:**
- $12,960 MRR (180 paying customers)
- WASP > 500
- Monthly churn < 5%
- NRR > 100% (upsell превышает churn)
- NPS > 50
- 10+ testimonials, 3+ case studies
- SOC 2 Type I started (для Enterprise attractiveness)
- PostgreSQL migration завершена
- 2-3 платных канала acquisition работают с positive ROI
- Team: 3-5 человек ( Founder + 2-3 engineers + 1 content/growth)

**Подтверждающие показатели M12:**
- D30 retention > 30%
- Referral Rate > 15%
- ARPU > $72/мес
- CAC payback < 2 месяца
- 50%+ новых пользователей - inbound (organic + referral + content)
- 2+ feature requests от paying customers, реализованные и повысившие retention

### 1.4 Матрица подтверждения успеха

| Горизонт | Главный вопрос | Подтверждается, если... | Опровергается, если... |
|----------|---------------|------------------------|----------------------|
| M3 | Ценность существует? | D7 > 25%, WASP > 20, 3+ feedback | D7 < 10%, WASP < 5, 0 feedback |
| M6 | PMF сигнал? | MRR > $1,500, churn < 10%, NRR > 85% | MRR < $300, churn > 20%, NRR < 70% |
| M12 | Устойчивый бизнес? | MRR > $8K, NRR > 95%, 50%+ inbound | MRR < $2K, churn > 15%, 80%+ outbound |

---

## 2. Decision by Data Rules

### 2.1 Классификация решений по требованию данных

Каждое продуктовое решение должно быть классифицировано по уровню требуемых данных. Классификация определяет, можно ли решение принимать экспертно, или обязательны метрики, пользовательские интервью, или A/B тест.

### 2.2 Data-Required Decisions (обязательны метрики)

Следующие типы решений **НЕ могут** приниматься без анализа данных. Нарушение этого правила - operational anti-pattern.

| Категория решений | Примеры | Обязательные данные |
|-------------------|---------|-------------------|
| **Feature prioritization** | «Добавить API endpoint для CI/CD» | Сколько пользователей запрашивали? Activation rate пользователей с API vs без? |
| **Pricing changes** | «Поднять Pro с $29 до $39» | Price sensitivity analysis, conversion funnel, competitor pricing, churn impact моделирование |
| **Onboarding changes** | «Добавить step 4 в wizard» | TTFV до и после, Activation Rate до и после, drop-off на каждом шаге |
| **Marketing channel** | «Инвестировать в Product Hunt» | Historical conversion по каналу, CAC по каналу, LTV пользователей из канала |
| **Churn response** | «Добавить feature X для снижения churn» | Churn reason analysis (exit interviews, usage patterns), cohort analysis |
| **Infrastructure changes** | «Мигрировать на PostgreSQL» | Current concurrent users, write throughput, latency measurements, scaling projections |
| **Pivot evaluation** | «Изменить позиционирование» | PMF signals (NPS, retention, WASP trend), user interview synthesis, competitive movement |

**Процесс для Data-Required Decisions:**
1. Сформулировать гипотезу изменения.
2. Определить, какие метрики подтверждают/опровергают гипотезу.
3. Собрать baseline (текущее значение метрик).
4. Реализовать изменение.
5. Измерить метрики через минимум 1 неделю (2 недели для pricing).
6. Сравнить с baseline. Принять решение на основе delta.

### 2.3 Expert Decisions (допустимы без метрик)

Следующие типы решений могут приниматься экспертно (Founder, CTO, CPO) на основе опыта, логики и рыночного анализа. Данные желательны, но не блокируют решение.

| Категория | Примеры | Почему экспертно допустимо |
|-----------|---------|---------------------------|
| **Architecture choices** | Выбор паттерна, структура модулей | Не измеряются пользователями, влияют на maintainability |
| **Technology stack** | Выбор библиотеки, фреймворка | Инженерная экспертиза, не влияет на user-facing метрики напрямую |
| **Code style** | Форматирование, naming conventions | Не влияет на продукт |
| **Internal tooling** | Скрипты, CI/CD детали | Операционная эффективность, не пользовательская ценность |
| **Document structure** | Организация документации | Внутренний процесс |
| **Emergency fixes** | Production bug, security patch | Время критично, данные можно собрать post-fix |

**Важное ограничение:** Expert Decision, который впоследствии покажет негативное влияние на метрики, должен быть пересмотрен как Data-Required Decision. Например: выбор библиотеки (Expert) → обнаружен performance regression (Data-Required: заменить или оптимизировать).

### 2.4 User Interview Decisions (обязательны интервью)

Следующие типы решений требуют качественных данных - пользовательских интервью. Количественные метрики недостаточны.

| Категория | Примеры | Почему интервью обязательны |
|-----------|---------|---------------------------|
| **Positioning changes** | «Перефразировать one-liner» | Метрики не объясняют, почему пользователь не конвертирует |
| **New segment entry** | «Выйти на Mid-Market» | Нет данных о потребностях сегмента |
| **Value proposition** | «Убрать feature X из messaging» | Нужно понять, какие слова резонируют |
| **Churn deep-dive** | «Почему уходят paying customers?» | Метрики показывают «когда», интервью - «почему» |
| **Competitive response** | «Конкурент запустил feature Y» | Нужно понять, насколько это важно для наших пользователей |
| **Pivot evaluation** | «DAST → Security Posture Dashboard» | Качественное подтверждение изменения ценностного предложения |

**Минимальный стандарт интервью:** 5 пользователей из целевого сегмента, структурированный протокол (проблема → текущее решение → реакция на предложение → готовность платить). Результат: документированные выводы с цитатами.

### 2.5 Decision Matrix (Quick Reference)

| Решение | Данные? | Интервью? | Экспертно? | Минимальный срок анализа |
|---------|---------|-----------|------------|------------------------|
| Новый feature | ✅ | Желательно | ❌ | 1 неделя post-launch |
| Изменение pricing | ✅ | ✅ | ❌ | 2 недели |
| Изменение onboarding | ✅ | ❌ | ❌ | 1 неделя |
| Новый маркетинг-канал | ✅ | ❌ | ❌ | 2 недели |
| Архитектурное изменение | Желательно | ❌ | ✅ | По ситуации |
| Bug fix / Emergency | ❌ | ❌ | ✅ | Немедленно |
| Pivot | ✅ | ✅ | ❌ | 2-4 недели |
| Изменение позиционирования | ✅ | ✅ | ❌ | 2 недели |
| Новый tier / план | ✅ | ✅ | ❌ | 2 недели |

---

## 3. Information Architecture

### 3.1 Документы Product Intelligence System

| Документ | Назначение | Аудитория | Частота обновления |
|----------|-----------|-----------|-------------------|
| PRODUCT_INTELLIGENCE_FRAMEWORK.md | Этот документ. Конституция системы. | Все роли | Квартально или при изменении стратегии |
| NORTH_STAR_METRIC.md | Определение и обоснование главной метрики | Все роли | При изменении North Star (редко) |
| KPI_CATALOG.md | Полный каталог всех метрик с формулами | CPO, Growth Lead | При добавлении/удалении метрик |
| GROWTH_DASHBOARD.md | Визуальная структура дашборда | Founder, CPO | При изменении структуры dashboard |
| SUCCESS_GATES.md | Контрольные точки развития | CEO, CPO, Investors | При прохождении gate |
| WEEKLY_REVIEW_TEMPLATE.md | Шаблон еженедельного обзора | Founder | Еженедельно (заполняется) |
| MONTHLY_BUSINESS_REVIEW.md | Шаблон ежемесячного стратегического обзора | Founder, Board | Еженедельно (заполняется) |
| EXPERIMENT_PLAYBOOK.md | Процесс проведения экспериментов | CPO, Growth Lead | При изменении процесса |

### 3.2 Как использовать систему

**Ежедневно:** Авторизоваться - нет. Система не требует ежедневного вмешательства. Данные собираются автоматически.

**Еженедельно (30 минут):** Заполнить Weekly Review Template. Ответить на 6 вопросов. Обновить dashboard значения.

**Еженедельно (15 минут):** Проверить Success Gate прогресс. Находится ли продукт на траектории к следующему gate?

**Ежемесячно (60 минут):** Заполнить Monthly Business Review. Провести эксперимент ретроспективу. Обновить Product Success Model при необходимости.

**По необходимости:** Запустить эксперимент по Experiment Playbook. Принять Data-Required Decision.

### 3.3 Связь с другими системами проекта

Product Intelligence System интегрируется с:

- **AI Operating Model** - Weekly Review и Monthly Review являются частью операционного цикла (§6 Operating Cycle)
- **Decision Management Framework** - каждое Data-Required Decision фиксируется в DECISION_LOG по стандартному шаблону с Success Metrics
- **Project OS** - business-метрики из §6.3 и §10 являются входными данными для Growth Dashboard
- **Private Beta Roadmap** - Success Gates определяют, когда roadmap-задачи считаются выполненными

---

## 4. Governance

### 4.1 Кто отвечает за Product Intelligence

| Аспект | Ответственная роль | Процесс |
|--------|-------------------|---------|
| Определение метрик | CPO + Growth Lead | Предложение → Founder утверждает |
| Сбор данных | CTO | Автоматическаяinstrumentation |
| Анализ данных | Growth Lead | Еженедельный отчёт |
| Решения на основе данных | Founder | Weekly Review → Decision |
| Обновление системы | Engineering Manager | По запросу CPO/Founder |
| Experiment запуск | CPO | По Experiment Playbook |
| Investor reporting | CEO | Monthly Business Review |

### 4.2 Правила изменения системы

1. Добавление новой метрики - CPO предлагает, Founder утверждает. Метрика добавляется в KPI_CATALOG.md.
2. Изменение North Star - требуется Monthly Business Review + 5-рольная оценка. Меняется редко (ожидается 0-1 раз за 12 месяцев).
3. Изменение Success Gate критериев - только при прохождении gate. Founder утверждает.
4. Изменение Weekly/Monthly Review шаблона - CPO предлагает, Founder утверждает.

### 4.3 Anti-patterns (чёго НЕ делать)

1. **Vanity metrics.** Не отслеживать: total signups (без контекста активности), page views, social media followers. Только action metrics.
2. **Metric manipulation.** Не оптимизировать метрику в ущерб продукту (например, artificially inflate scans по email reminders без ценности).
3. **Analysis paralysis.** Не требовать 95% confidence для каждого решения. 70% confidence + speed > 95% confidence + delay.
4. **Ignoring qualitative data.** Метрики показывают «что», интервью - «почему». Оба необходимы.
5. **Moving goalposts.** Не менять целевые значения метрик post-hoc. Если цель M3 WASP=50 не достигнута - это сигнал, а не повод снизить цель.

---

## 5. Founder Cockpit

Founder Cockpit - ментальная модель главного экрана управления. Не UI-дизайн, а определение того, что Founder должен видеть и за 5 минут понимать полную картину.

### 5.1 Пять вопросов (5 minutes to answer)

| # | Вопрос | Источник ответа | Время |
|---|--------|----------------|-------|
| 1 | **Становится ли продукт лучше?** | WASP trend (3 недели) + D7 Retention trend | 30 сек |
| 2 | **Растёт ли ценность для пользователей?** | Activation Rate + NPS + Score Median trend | 30 сек |
| 3 | **Какие изменения действительно работают?** | Weekly Review: подтверждённые гипотезы | 60 сек |
| 4 | **Где находятся главные риски?** | Alert Panel (красные алерты) + Gate Progress | 60 сек |
| 5 | **Какие действия дадут максимальный эффект?** | Weekly Review: action items + Experiment status | 60 сек |

### 5.2 Cockpit Components

```
FOUNDER COCKPIT (5 min read)
|
+-- 1. EXECUTIVE FLASH (30 sec)
|   WASP: [23] / 50  [+5 vs prev]  [GREEN/YELLOW/RED]
|   MRR: [$0]        [-]            [N/A pre-revenue]
|   D7:   [18%]      [-3%]          [YELLOW]
|
+-- 2. TREND DIRECTION (60 sec)
|   WASP:        /\\_/\\   (8-week sparkline)
|   Activation:  _/\\_/    (8-week sparkline)
|   D7 Retention: \\_/\\   (8-week sparkline)
|   NPS:         [28]     (+5 vs last month)
|
+-- 3. ALERTS (30 sec)
|   RED:   [none or top 2]
|   YELLOW: [list of warnings]
|   NOTE:  [biggest positive signal]
|
+-- 4. GATE PROGRESS (30 sec)
|   Current Gate: [1 - Private Beta]
|   Closest failing criterion: [Activation 11% < 12%]
|   Next Gate: [Gate 2 - 50 users]
|
+-- 5. ACTION ITEMS (90 sec)
|   #1: [highest-ROI action from Weekly Review]
|   #2: [second-priority action]
|   #3: [experiment to check this week]
|
+-- 6. EXPERIMENTS (30 sec)
|   Running: EXP-002 [Digest timing] - Day 12 of 21
|   Completed: EXP-001 [Onboarding] - Confirmed, shipped
```

### 5.3 Implementation Path

- **Pre-Beta (сейчас):** Cockpit = Weekly Review Template + Growth Dashboard в Google Sheets. 20 мин/неделю.
- **M3+ (automated):** Dashboard auto-updated from Prisma + Stripe. Cockpit = открыть дашборд, прочитать 5 вопросов, записать action items. 5-10 мин/неделю.
- **M6+ (real-time):** Cockpit = single screen в admin panel. Push alerts на телефон для красных алертов. 5 мин/неделю.

### 5.4 5-Role Self-Check Results

Each role was asked: "If this Dashboard were the ONLY source of information, could I effectively manage the company?"

| Role | Answer | Gap Found | Fix Applied |
|------|--------|-----------|-------------|
| **CEO** | Yes | No "Ask/Hypothesis" for board | Added to MBR section 13 (Next Month Priorities) |
| **CTO** | Yes | Incident count missing from Dashboard Level 3 | Added to MBR Engineering Health |
| **CPO** | Yes | Score Distribution important but not in Dashboard | Already in Product Level (P4) |
| **Growth Lead** | Yes | Channel performance only in MBR, not Dashboard | Acceptable: Dashboard shows aggregate, MBR drills down |
| **Investor** | Yes | No ARR projection in Dashboard Executive | Added to GROWTH_DASHBOARD.md Executive E2 |

All 5 roles answered "Yes" after fixes. No additional documents needed.

---

## Приложение A. Evolution History

| Версия | Дата | Изменение | Автор |
|--------|------|-----------|-------|
| 1.0 | 2026-07-14 | Initial - Product Intelligence System для Pre-revenue → Private Beta | Engineering Manager |

