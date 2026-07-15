# KPI_CATALOG.md - Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Операционный документ - KPI Catalog
> **Владелец:** CPO
> **Статус:** Active
> **Связанные документы:** PRODUCT_INTELLIGENCE_FRAMEWORK.md, NORTH_STAR_METRIC.md, GROWTH_DASHBOARD.md, SUCCESS_GATES.md, PROJECT_OS.md

---

## Executive Summary

KPI Catalog - полный каталог всех метрик Sec Scanner, организованный по фреймворку AARRR (Pirate Metrics) с дополнительными категориями Product, Engineering, Business. Каждая метрика содержит: определение, формулу, источник данных, целевые значения для Private Beta и Public Launch.

Каталог является единственным источником истины для всех метрик продукта. Если метрики нет в этом каталоге - она не существует для целей управления продуктом.

---

## 1. AARRR Framework - Acquisition

### 1.1 Visitors (Landing Page Unique Visitors per Week)

| Атрибут | Значение |
|---------|----------|
| **Определение** | Количество уникальных посетителей landing page за 7 дней |
| **Формула** | COUNT(DISTINCT session_id) WHERE page = '/' AND timestamp >= NOW() - 7d |
| **Источник данных** | Analytics (PostHog / Plausible / umami) |
| **Target Private Beta** | 100 / неделю |
| **Target Public Launch (M2)** | 500 / неделю |
| **Target M3** | 1,000 / неделю |
| **Target M6** | 3,000 / неделю |
| **Зачем** | Верхний уровень воронки. Рост visitors = рост awareness |

### 1.2 Landing Conversion Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % посетителей landing page, кликнувших «Get Started» или «Scan Free» |
| **Формула** | (CTA clicks / unique visitors) x 100 |
| **Источник данных** | Analytics (event tracking) |
| **Target Private Beta** | > 8% |
| **Target Public Launch** | > 10% |
| **Target M3** | > 12% |
| **Зачем** | Показывает, насколько landing page убеждает попробовать продукт |

### 1.3 Registration Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % посетителей, завершивших регистрацию (создали аккаунт) |
| **Формула** | (completed registrations / unique visitors) x 100 |
| **Источник данных** | Prisma: User.created_at |
| **Target Private Beta** | > 5% |
| **Target Public Launch** | > 8% |
| **Target M3** | > 10% |
| **Зачем** | Фильтрует «интерес» от «намерения». Разрыв между Landing Conversion и Registration = friction в signup flow |

### 1.4 Cost of Acquisition (CAC)

| Атрибут | Значение |
|---------|----------|
| **Определение** | Полная стоимость привлечения одного зарегистрированного пользователя |
| **Формула** | (Total marketing spend + Founder time cost) / new registrations in period |
| **Источник данных** | Manual tracking: marketing spend, time allocation |
| **Target Private Beta** | < $15 (outreach-driven) |
| **Target Public Launch** | < $30 |
| **Target M6** | < $80 |
| **Зачем** | CAC > LTV = неустойчивый бизнес. Для PLG CAC должен быть низким |

---

## 2. AARRR Framework - Activation

### 2.1 Time To First Value (TTFV)

| Атрибут | Значение |
|---------|----------|
| **Определение** | Время от момента регистрации до момента, когда пользователь видит первый Security Score с реальными данными |
| **Формула** | MEDIAN(first_score_view_at - user.created_at) WHERE first_scan_status = 'completed' |
| **Источник данных** | Prisma: User.created_at, Scan.completed_at |
| **Target Private Beta** | < 3 минуты |
| **Target Public Launch** | < 2 минуты |
| **Target M6** | < 90 секунд |
| **Зачем** | Критический показатель onboarding. Каждые 30 секунд задержки = -X% activation |

### 2.2 First Scan Completion Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % зарегистрированных пользователей, завершивших хотя бы один scan |
| **Формула** | (users_with_completed_scan / total_users) x 100 |
| **Источник данных** | Prisma: User, Scan |
| **Target Private Beta** | > 50% |
| **Target Public Launch** | > 60% |
| **Target M3** | > 65% |
| **Зачем** | Показывает, сколько пользователей добрались до ценности. Разрыв Registration → First Scan = onboarding friction |

### 2.3 Activation Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % зарегистрированных пользователей, выполнивших 2+ скана с интервалом > 1 дня в течение первой недели |
| **Формула** | (activated_users / total_users_in_cohort) x 100. Cohort = зарегистрированные 7+ дней назад. |
| **Источник данных** | Prisma: User, Scan |
| **Target Private Beta** | > 10% |
| **Target Public Launch** | > 12% |
| **Target M3** | > 15% (PMF Blueprint target) |
| **Target M6** | > 18% |
| **Зачем** | Gold standard activation: пользователь вернулся и сделал второй scan = нашёл ценность |

---

## 3. AARRR Framework - Retention

### 3.1 D1 Retention

| Атрибут | Значение |
|---------|----------|
| **Определение** | % пользователей, вернувшихся на следующий день после первого scan |
| **Формула** | (users_active_day1 / users_first_scan_day0) x 100 |
| **Источник данных** | Prisma: User.last_login_at, Scan |
| **Target Private Beta** | > 30% |
| **Target Public Launch** | > 35% |
| **Зачем** | Быстрый сигнал: вернулся ли пользователь после первого опыта |

### 3.2 D7 Retention

| Атрибут | Значение |
|---------|----------|
| **Определение** | % пользователей, выполнивших любой action (login, scan, view report) через 7 дней после первого scan |
| **Формула** | (users_active_day7 / users_first_scan_day0) x 100 |
| **Источник данных** | Prisma: AuditLog |
| **Target Private Beta** | > 20% |
| **Target M3** | > 25% |
| **Target M6** | > 30% |
| **Зачем** | Ключевой сигнал PMF. D7 > 25% для consumer SaaS считается хорошим. Для developer tools: > 20% - здорово. |

### 3.3 D30 Retention

| Атрибут | Значение |
|---------|----------|
| **Определение** | % пользователей, активных через 30 дней после первого scan |
| **Формула** | (users_active_day30 / users_first_scan_day0) x 100 |
| **Источник данных** | Prisma: AuditLog |
| **Target M3** | > 12% |
| **Target M6** | > 20% |
| **Target M12** | > 30% |
| **Зачем** | Долгосрочная удержание. D30 > 20% - сильный PMF сигнал |

### 3.4 Weekly Active Users (WAU)

| Атрибут | Значение |
|---------|----------|
| **Определение** | Количество уникальных пользователей, совершивших любое действие за последние 7 дней |
| **Формула** | COUNT(DISTINCT user_id) WHERE AuditLog.timestamp >= NOW() - 7d AND action IN ('login', 'scan_start', 'scan_complete', 'view_report') |
| **Источник данных** | Prisma: AuditLog |
| **Target Private Beta** | 15 |
| **Target M3** | 30 |
| **Target M6** | 80 |
| **Target M12** | 250 |
| **Зачем** | Health check для WASP. WASP/WAU ratio показывает depth (проектов на пользователя) |

---

## 4. AARRR Framework - Revenue

### 4.1 Free to Pro Conversion Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % Free-tier пользователей, перешедших на платный тариф в течение 30 дней |
| **Формула** | (users_upgraded_to_paid_in_30d / free_users_30d_ago) x 100 |
| **Источник данных** | Prisma: User, Stripe subscriptions |
| **Target M3** | > 4% |
| **Target M6** | > 6% |
| **Target M12** | > 8% |
| **Зачем** | Benchmark для developer-tools SaaS: 3-5% average, 8-12% good (Recurly 2025) |

### 4.2 Monthly Recurring Revenue (MRR)

| Атрибут | Значение |
|---------|----------|
| **Определение** | Сумма всех активных подписок за текущий месяц |
| **Формула** | SUM(subscription_amount) WHERE status = 'active' |
| **Источник данных** | Stripe API |
| **Target M1** | $0 (beta - free) |
| **Target M3** | $500 (12 paying) |
| **Target M6** | $2,320 (40 paying) |
| **Target M9** | $7,000+ |
| **Target M12** | $12,960 (180 paying) |
| **Зачем** | Главный бизнес-результат. Lagging indicator, но критический для sustainability |

### 4.3 Average Revenue Per User (ARPU)

| Атрибут | Значение |
|---------|----------|
| **Определение** | Средний revenue на одного paying пользователя в месяц |
| **Формула** | MRR / paying_customers_count |
| **Источник данных** | Stripe API + Prisma: User |
| **Target M3** | > $40/мес |
| **Target M6** | > $58/мес |
| **Target M12** | > $72/мес |
| **Зачем** | Показывает, какой тариф выбирают пользователи. ARPU < $29 = все на Pro. ARPU > $79 = часть на Team/Business |

### 4.4 Monthly Churn Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % paying пользователей, отменивших подписку за месяц |
| **Формула** | (churned_customers / paying_customers_start_of_month) x 100 |
| **Источник данных** | Stripe API (subscription cancelled) |
| **Target M3** | < 12% |
| **Target M6** | < 8% |
| **Target M12** | < 5% |
| **Зачем** | Churn > 10% = unsustainable. Каждый % churn при 40 customers = потеря $46/мес (при ARPU $58). Churn компенсируется acquisition + expansion |

### 4.5 Net Revenue Retention (NRR)

| Атрибут | Значение |
|---------|----------|
| **Определение** | % revenue сохранённый от существующих клиентов за месяц (включая upsell, исключая churn) |
| **Формула** | ((MRR_start + expansion - contraction - churn) / MRR_start) x 100 |
| **Источник данных** | Stripe API |
| **Target M3** | > 85% |
| **Target M6** | > 90% |
| **Target M12** | > 100% (expansion > churn) |
| **Зачем** | NRR > 100% = продукт растёт даже без новых пользователей. Главный indicator для investors |

---

## 5. AARRR Framework - Referral

### 5.1 Net Promoter Score (NPS)

| Атрибут | Значение |
|---------|----------|
| **Определение** | % Promoters (9-10) минус % Detractors (0-6) по вопросу «Как вероятность, что вы порекомендуете Sec Scanner коллеге? (0-10)» |
| **Формула** | (% scores 9-10) - (% scores 0-6) |
| **Источник данных** | In-app survey (после 3-го scan) |
| **Target Private Beta** | > 20 |
| **Target M3** | > 30 |
| **Target M6** | > 40 |
| **Target M12** | > 50 |
| **Зачем** | Главный indicator word-of-mouth. NPS > 30 = good, > 50 = excellent (Bain & Company) |

### 5.2 Referral Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % активных пользователей, пригласивших хотя бы одного нового пользователя через referral link или team invitation |
| **Формула** | (users_with_referral / active_users) x 100 |
| **Источник данных** | Prisma: TeamInvite, referral tracking |
| **Target M3** | > 5% |
| **Target M6** | > 8% |
| **Target M12** | > 15% |
| **Зачем** | Organic growth engine. Referral Rate > 10% = вирусный коэффициент близок к 1 |

### 5.3 Invitation Rate (Team)

| Атрибут | Значение |
|---------|----------|
| **Определение** | % пользователей на Team tier и выше, пригласивших хотя бы одного teammate |
| **Формула** | (team_owners_with_invite / team_owners) x 100 |
| **Источник данных** | Prisma: TeamMembership, TeamInvite |
| **Target M3** | > 30% |
| **Target M6** | > 50% |
| **Зачем** | Team invitations = switching cost = retention. Каждый приглашённый teammate - потенциальный advocate |

---

## 6. Product Metrics

### 6.1 Scan Success Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % сканов, завершившихся без ошибки |
| **Формула** | (completed_scans / total_scans) x 100 |
| **Источник данных** | Prisma: Scan |
| **Target Private Beta** | > 80% |
| **Target Public Launch** | > 85% |
| **Target M6** | > 92% |
| **Зачем** | Failed scan = потерянная ценность = frustration. Каждый % improvement = лучше user experience |

### 6.2 Average Findings per Scan

| Атрибут | Значение |
|---------|----------|
| **Определение** | Среднее количество уязвимостей, обнаруженных за один scan |
| **Формула** | AVG(findings_count) WHERE scan.status = 'completed' |
| **Источник данных** | Prisma: Vulnerability, Scan |
| **Target** | 5-15 (зависит от target). < 3 = сканер недостаточно чувствительный. > 30 = noise. |
| **Зачем** | Показывает, достаточно ли сканер находит. Слишком мало = «сканер не работает». Слишком много = «alert fatigue» |

### 6.3 Recommendation Action Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % пользователей, кликнувших хотя бы одну рекомендацию из Explainability Layer |
| **Формула** | (users_with_recommendation_click / users_with_scan) x 100 |
| **Источник данных** | Analytics (event: recommendation_clicked) |
| **Target M3** | > 25% |
| **Зачем** | Валидирует ценность Explainability Layer. Если пользователи не кликают - рекомендации не relevant |

### 6.4 Score Distribution

| Атрибут | Значение |
|---------|----------|
| **Определение** | Распределение Security Score по всем сканам (median, P25, P75) |
| **Формула** | PERCENTILE(security_score, [25, 50, 75]) WHERE scan.status = 'completed' |
| **Источник данных** | Prisma: Scan (security_score field) |
| **Ожидаемое распределение** | Median 40-60, P25 25-40, P75 60-80 |
| **Зачем** | Если median > 80 - сканер не находит реальные проблемы (или пользователи сканируют только безопасные сайты). Если median < 20 - сканер слишком строгий |

---

## 7. Engineering Metrics

### 7.1 Uptime

| Атрибут | Значение |
|---------|----------|
| **Определение** | % времени, когда продукт доступен (HTTP 200 на health check endpoint) |
| **Формула** | (uptime_minutes / total_minutes_in_period) x 100 |
| **Источник данных** | Uptime monitoring (UptimeRobot / BetterUptime) |
| **Target** | > 99.5% (M3), > 99.9% (M6+) |
| **Зачем** | Downtime = потерянные сканы = frustrated users = churn |

### 7.2 P95 Scan Duration

| Атрибут | Значение |
|---------|----------|
| **Определение** | 95-й перцентиль времени выполнения scan от start до completed |
| **Формула** | PERCENTILE(scan_duration, 95) WHERE status = 'completed' |
| **Источник данных** | Prisma: Scan (started_at, completed_at) |
| **Target Private Beta** | < 60 секунд |
| **Target M6** | < 45 секунд |
| **Зачем** | Долгий scan = потерянная ценность. P95 > 120 сек = bottleneck |

### 7.3 Error Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | % API requests, завершившихся с HTTP 5xx |
| **Формула** | (5xx_responses / total_responses) x 100 |
| **Источник данных** | Server logs / Application monitoring |
| **Target** | < 1% |
| **Зачем** | Error rate > 2% = системная проблема. Каждый 5xx = потенциальный lost user |

### 7.4 Test Coverage

| Атрибут | Значение |
|---------|----------|
| **Определение** | % строк кода, покрытых unit тестами |
| **Формула** | (covered_lines / total_lines) x 100 |
| **Источник данных** | vitest --coverage |
| **Target** | > 60% (Domain > 80%), > 70% (M6) |
| **Зачем** | Domain Layer уже > 80%. Infrastructure Layer - приоритет для reliability |

---

## 8. Business Metrics

### 8.1 Paying Customers Count

| Атрибут | Значение |
|---------|----------|
| **Определение** | Количество уникальных пользователей с активной платной подпиской |
| **Формула** | COUNT(DISTINCT user_id) WHERE subscription_status = 'active' AND plan != 'free' |
| **Источник данных** | Stripe API |
| **Target M3** | 12 |
| **Target M6** | 40 |
| **Target M12** | 180 |
| **Зачем** | Прямой показатель монетизации. Количество > MRR - показывает, не завышен ли ARPU |

### 8.2 LTV / CAC Ratio

| Атрибут | Значение |
|---------|----------|
| **Определение** | Отношение Lifetime Value к Customer Acquisition Cost |
| **Формула** | (ARPU x avg_customer_lifetime_months) / CAC |
| **Источник данных** | Stripe + Marketing spend |
| **Target M6** | > 3x |
| **Target M12** | > 5x |
| **Зачем** | LTV/CAC < 1 = неустойчивый бизнес. > 3x = здоровый. > 5x = excellent ( Benchmark для PLG SaaS) |

### 8.3 CAC Payback Period

| Атрибут | Значение |
|---------|----------|
| **Определение** | Количество месяцев, необходимых для возврата стоимости привлечения клиента |
| **Формула** | CAC / (ARPU x gross_margin) |
| **Источник данных** | Stripe + Marketing |
| **Target M6** | < 4 месяца |
| **Target M12** | < 2 месяца |
| **Зачем** | Для bootstrapped startup - критический показатель cash flow |

### 8.4 Free-to-Paid Pipeline

| Атрибут | Значение |
|---------|----------|
| **Определение** | Количество free-пользователей, достигших лимита тарифа (upgrade trigger) за месяц |
| **Формула** | COUNT(user_id) WHERE free_tier_limit_reached = true AND upgrade = false |
| **Источник данных** | Prisma: User, Scan count, Project count |
| **Target M3** | > 20 пользователей/месяц |
| **Зачем** | Leading indicator для conversion. Pipeline / actual conversions = conversion efficiency |

### 8.5 Run Rate

| Атрибут | Значение |
|---------|----------|
| **Определение** | Проекция годового revenue на основе текущего MRR |
| **Формула** | MRR x 12 |
| **Источник данных** | Stripe API |
| **Target M3** | $6,000 ARR |
| **Target M6** | $27,840 ARR |
| **Target M12** | $155,520 ARR |
| **Зачем** | Investor-facing metric. ARR > $100K = сигнал для Seed readiness |

---

## Приложение A. Metric Priority Matrix

| Приоритет | Метрика | Частота отслеживания | Действие при отклонении |
|-----------|---------|---------------------|------------------------|
| P0 (Critical) | WASP | Ежедневно | Emergency analysis: почему падает? |
| P0 | Activation Rate | Еженедельно | Onboarding audit + user interviews |
| P0 | D7 Retention | Еженедельно | Value audit + churn analysis |
| P0 | MRR | Еженедельно | Funnel analysis + pricing review |
| P1 (Important) | TTFV | Еженедельно | Onboarding flow optimization |
| P1 | Scan Success Rate | Еженедельно | Engineering investigation |
| P1 | Monthly Churn | Еженедельно | Exit interviews + feature review |
| P1 | NPS | Ежемесячно | Qualitative follow-up |
| P2 (Monitor) | CAC | Ежемесячно | Channel mix review |
| P2 | ARPU | Ежемесячно | Tier mix analysis |
| P2 | Referral Rate | Ежемесячно | Referral program review |
| P3 (Info) | Test Coverage | Дважды в месяц | Engineering planning |
| P3 | Error Rate | Ежедневно (automated) | Alert threshold review |
