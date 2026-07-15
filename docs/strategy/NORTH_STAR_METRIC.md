# NORTH_STAR_METRIC.md - Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Стратегический документ - North Star Definition
> **Владелец:** CPO
> **Статус:** Active
> **Связанные документы:** PRODUCT_INTELLIGENCE_FRAMEWORK.md, KPI_CATALOG.md, PROJECT_OS.md, PRODUCT_MARKET_FIT_BLUEPRINT.md

---

## Executive Summary

North Star Metric (NSM) - единственная главная метрика продукта, которая лучше всего отражает ценность, которую продукт доставляет пользователям. Все члены команды должны понимать эту метрику и знать, как их работа на неё влияет.

**North Star Metric Sec Scanner: WASP (Weekly Active Scanning Projects).**

WASP = количество уникальных проектов, отсканированных хотя бы 1 раз за последние 7 дней.

Эта метрика была определена в PROJECT_OS.md §4.5 и подтверждена через полный анализ в этом документе. WASP выбран потому, что он напрямую отражает ключевую ценность: пользователи регулярно используют Sec Scanner для мониторинга безопасности своих приложений.

---

## 1. Рассмотренные варианты

### Вариант A: Monthly Recurring Revenue (MRR)

**Описание:** Сумма ежемесячных повторяющихся платежей.

**Аргументы «за»:** Прямой бизнес-результат. Легко измерять. Стандарт для SaaS.

**Аргументы «против»:** Revenue - lagging indicator. Когда MRR растёт, продукт уже доставил ценность. На стадии Pre-revenue MRR = $0, метрика не информативна. Оптимизация MRR фокусирует на монетизации, а не на ценности (можно вырасти за счёт агрессивного sales при плохом product).

**Вердикт:** Отличная метрика для M6+, но не подходит как North Star на текущей стадии. MRR - результат, а не причина.

### Вариант B: Daily Active Users (DAU)

**Описание:** Количество уникальных пользователей, зашедших в продукт за последние 24 часа.

**Аргументы «за»:** Стандартная метрика engagement. Легко измерять.

**Аргументы «против:** DAU для Sec Scanner - обманчивая метрика. DAST-инструмент по природе не является daily-use продуктом. CTO не сканирует свой сайт каждый день. Ожидаемая частота использования: 1-4 раза в неделю. Оптимизация DAU приведёт к artificial engagement (unnecessary scans, notifications spam).

**Вердикт:** Неподходящая метрика для DAST. Интервал «ежедневно» не соответствует паттерну использования.

### Вариант C: Security Score Improvement

**Описание:** Среднее изменение Security Score пользователей за неделю (дельта).

**Аргументы «за»:** Прямо отражает ценность - продукт помогает улучшать безопасность.

**Аргументы «против:** (1) Score improvement зависит от действий пользователя (fix vulnerabilities), а не только от продукта. (2) На ранней стадии малая выборка делает среднее ненадёжным. (3) Score может «улучшаться» не потому, что продукт помогает, а потому, что пользователь исправил баги без рекомендаций. (4) Невозможно отличить «продукт помог» от «пользователь сам справился».

**Вердикт:** Отличная supplementary метрика (входит в KPI Catalog), но не подходит как North Star - слишком много внешних факторов.

### Вариант D: WASP (Weekly Active Scanning Projects) - ВЫБРАН

**Описание:** Количество уникальных проектов, отсканированных хотя бы 1 раз за последние 7 дней.

**Аргументы «за:**
1. **Отражает ценность:** Пользователь сканирует проект, потому что получает ценность (Security Score, объяснения, рекомендации). Никто не сканирует «просто так».
2. **Weekly interval соответствует паттерну:** DAST-сканирование - еженедельная активность для CTO. Weekly - естественный ритм.
3. **Projects > Users:** Проект - это единица ценности, не пользователь. Один пользователь может сканировать 5 проектов (высокая ценность) или 0 (нулевой). Считать проекты точнее, чем пользователей.
4. **Leading indicator для revenue:** WASP растёт → пользователи находят ценность → часть конвертируется в paying. MRR = f(WASP, conversion_rate, ARPU).
5. **Устойчив к gaming:** Невозможно «накрутить» WASP без реальной ценности (каждый scan - реальный URL).
6. **Aligns все функции:** Engineering (scan reliability), Product (onboarding, UX), Growth (acquisition, activation), Business (pricing tiers по количеству проектов).

**Аргументы «против:**
1. На стадии Pre-revenue WASP = 0 - метрика не информативна до первых пользователей. **Митигация:** до beta использовать Leading Indicators (см. §3).
2. Один пользователь, сканирующий 10 проектов, inflate метрику. **Митигация:** отслеживать параллельно WAU (Weekly Active Users) как health check.
3. Не отражает depth of engagement (1 scan vs 10 scans на проект). **Митигация:** supplementary метрика - среднее сканов на проект в неделю.

**Вердикт:** WASP - оптимальный North Star для Sec Scanner на текущей стадии (Pre-revenue → M12).

---

## 2. Формула и определение

### 2.1 Формула

```
WASP = COUNT(DISTINCT project_id)
       WHERE scan.status = 'completed'
         AND scan.completed_at >= NOW() - INTERVAL 7 DAYS
```

### 2.2 Операционное определение

| Атрибут | Значение |
|---------|----------|
| **Что считается** | Уникальные project_id с хотя бы 1 успешным scan за 7 дней |
| **Что НЕ считается** | Failed scans, cancelled scans, scans в прогрессе |
| **Период** | Rolling 7-day window |
| **Гранулярность** | Один счётчик на весь продукт (не по сегментам) |
| **Источник данных** | Prisma: `scan` table, filter by `status=completed`, `completed_at` |
| **Частота обновления** | Real-time (при каждом completed scan пересчитывается) |

### 2.3 Target values

| Горизонт | Target | Обоснование |
|----------|--------|-------------|
| Gate 1 (Private Beta Launch) | 5 | Минимальный сигнал: 5 проектов сканируютсяweekly |
| Gate 2 (50 active users) | 20 | 20 проектов weekly при 50 users = здоровое соотношение |
| M3 | 50 | PMF Blueprint §6.3 target |
| Gate 3 (100 users) | 40 | 40+ проектов weekly |
| M6 | 150 | PMF Blueprint §6.3 target |
| Gate 4 (First paid) | 25 | Проекты growing даже при раннем monetisation |
| Gate 5 (PMF Signal) | 80 | Сильный PMF: 80+ проектов weekly |
| M12 | 500 | PMF Blueprint §6.3 target |

---

## 3. Leading Indicators (до первых пользователей)

До запуска Private Beta WASP = 0. На этом этапе отслеживаются Leading Indicators, которые предшествуют WASP и позволяют измерять прогресс.

### 3.1 Leading Indicator Chain

```text
Landing Page Visitors → Registration → First Scan Completion → First Repeat Scan → WASP
     (LI-1)              (LI-2)           (LI-3)                    (LI-4)          (NSM)
```

| LI | Метрика | Target (Pre-Beta) | Target (M1) |
|----|---------|-------------------|-------------|
| LI-1 | Landing Page unique visitors / week | 100 | 500 |
| LI-2 | Registrations / week | 20 | 50 |
| LI-3 | First Scan Completions / week | 10 | 25 |
| LI-4 | Users with 2+ scans (repeat) / week | 3 | 10 |

### 3.2 Input Metrics (что движет WASP)

WASP - output metric. Чтобы его растить, нужно оптимизировать input metrics:

| Input Metric | Определение | Как влияет на WASP | Target (M3) |
|-------------|-------------|--------------------|----|
| **New User Activation** | % зарегистрированных, завершивших первый scan | Больше активированных = больше потенциальных weekly scanners | 12% |
| **Scan Success Rate** | % scans, завершённых без ошибки | Низкий success rate убивает мотивацию повторного сканирования | > 85% |
| **Time to First Value** | Время от регистрации до первого результата | Быстрый TTFV = выше activation = больше WASP | < 3 мин |
| **Weekly Return Rate** | % пользователей, вернувшихся на 2-ю неделю | Возвращающиеся пользователи - основа WASP | > 25% |
| **Email Digest CTR** | % кликов по weekly digest email | Email reminder = trigger для нового scan = +WASP | > 15% |
| **Avg Scans per Project per Week** | Среднее сканов на проект | Выше = deeper engagement = stable WASP | > 1.5 |

---

## 4. Риски ориентации на WASP

### Риск 1: Vanity Growth

**Описание:** WASP растёт за счёт новых пользователей, но existing users churn.

**Митигация:** Отслеживать WAU (Weekly Active Users) параллельно. Если WASP растёт, а WAU стабилен - рост за счёт новых users. Если WAU тоже растёт - здоровый growth. Дополнительно: D7 и D30 retention cohorts.

### Риск 2: Quality vs Quantity

**Описание:** Пользователи сканируют «для галочки» (1 раз, поверхностно), не получая реальной ценности.

**Митигация:** Отслеживать среднее количество сканов на проект в неделю. Если > 1.5 - глубина engagement достаточна. Если < 1.2 - пользователи не возвращаются к тому же проекту (нет ценности или нет триггера для rescan).

### Риск 3: Single Project Users

**Описание:** Один power user со 100 проектами inflate WASP.

**Митигация:** WASP/WAU ratio. Healthy ratio: 1.5-3.0 (в среднем 1.5-3 проекта на активного пользователя). Если ratio > 5 - один пользователь доминирует. Дополнительно: отслеживать median projects per user (robust к outliers).

### Риск 4: ignores Revenue

**Описание:** WASP может расти, но revenue - нет (все на Free tier).

**Митигация:** Secondary metric: Paying WASP (WASP от пользователей на платных тарифах). Если total WASP растёт, а Paying WASP = 0 - проблема с monetisation, а не с продуктом.

### Риск 5: Gaming via Bots

**Описание:** Автоматические сканы, не отражающие реальное использование.

**Митигация:** (1) Email verification перед первым scan. (2) Rate limiting. (3) Отслеживать manual vs API-triggered scans. (4) Anomaly detection: > 50 сканов с одного IP за час = flag.

---

## 5. Как каждая функция влияет на WASP

| Функция / Изменение | Прямое влияние на WASP | Механизм |
|---------------------|----------------------|----------|
| Onboarding Wizard | +Activation | Больше пользователей завершают первый scan → больше potential WASP |
| Demo Target | +Activation | Быстрый TTFV → первый scan завершён → WASP candidate |
| Email Weekly Digest | +Return Rate | Напоминание trigger → repeat scan → WASP |
| Team Invitations | +New Users | More users → more projects → WASP |
| CI/CD Integration | +Automation | Automatic weekly scans → stable WASP |
| Regression Alerts | +Return Rate | «Score упал на 5 пунктов» → trigger rescan → WASP |
| PDF Report | +Activation | CTO показывает report → team starts scanning → WASP |
| API Keys | +Depth | More scans per project (automated) → WASP |
| Pricing Tiers (project limits) | +Upgrade | Flat pricing = invite team = more projects = WASP |
| New DAST checks | +Quality | More findings = more actionable = repeat scans = WASP |

---

## 6. Заключение

WASP (Weekly Active Scanning Projects) - North Star Metric Sec Scanner. Он отражает главную ценность продукта (регулярный security monitoring), соответствует паттерну использования (weekly), устойчив к gaming, и aligns все функции команды на единый результат.

Параллельно с WASP отслеживаются: WAU (health check), Paying WASP (monetisation health), D7/D30 retention (engagement depth), Avg Scans per Project (engagement quality).

До первых пользователей (Pre-Beta) - отслеживать Leading Indicators (Landing Visitors → Registrations → First Scans → Repeat Scans).

---

## Приложение A. Quick Reference Card

```
North Star: WASP (Weekly Active Scanning Projects)
Formula:    COUNT(DISTINCT project_id) WHERE scan completed last 7 days
Target M3:  50
Target M6:  150
Target M12: 500

Leading Indicators (Pre-Beta):
  Visitors → Registrations → First Scans → Repeat Scans → WASP

Guardrail Metrics:
  WAU (Weekly Active Users) - health check
  Paying WASP - monetisation health
  D7/D30 retention - engagement depth
  Avg Scans/Project/Week - engagement quality
```
