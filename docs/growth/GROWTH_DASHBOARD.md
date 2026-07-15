# GROWTH_DASHBOARD.md - Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Стратегический документ - Dashboard Design
> **Владелец:** CPO
> **Статус:** Active
> **Связанные документы:** PRODUCT_INTELLIGENCE_FRAMEWORK.md, KPI_CATALOG.md, NORTH_STAR_METRIC.md, SUCCESS_GATES.md

---

## Executive Summary

Growth Dashboard - единый экран управления продуктом для Founder. Дизайн этого документа определяет визуальную структуру дашборда, которая будет реализована (первоначально - в Google Sheets / Notion, затем - в приложении). Founder должен тратить не более 5 минут на еженедельное обновление dashboard и понимать: что происходит с продуктом, где проблемы, какие решения требуют внимания.

Dashboard организован по 5 уровням: Executive, Product, Engineering, Business, Growth. Каждый уровень отвечает на свой вопрос.

---

## 1. Dashboard Structure Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GROWTH DASHBOARD                              │
│                    Sec Scanner - Week N, YYYY                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              LEVEL 1: EXECUTIVE (3 KPI)                    │     │
│  │  WASP: 23/50  │  MRR: $0  │  D7 Retention: 18%            │     │
│  │  ▲ +5 vs prev  │  -       │  ▼ -3% vs prev               │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐                  │
│  │  LEVEL 2: PRODUCT    │  │  LEVEL 3: ENGINEERING │                  │
│  │  Activation: 11%     │  │  Uptime: 99.7%       │                  │
│  │  TTFV: 2m 45s       │  │  P95 Scan: 38s       │                  │
│  │  Scan Success: 87%  │  │  Error Rate: 0.3%    │                  │
│  │  Score Median: 52   │  │  Test Coverage: 65%  │                  │
│  │  Rec Click Rate: 22%│  │  Failed Scans: 3     │                  │
│  └──────────────────────┘  └──────────────────────┘                  │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐                  │
│  │  LEVEL 4: BUSINESS   │  │  LEVEL 5: GROWTH     │                  │
│  │  Signups: 12/wk      │  │  Visitors: 340/wk    │                  │
│  │  Paying: 0           │  │  Landing Conv: 9%    │                  │
│  │  Churn: N/A          │  │  Reg Rate: 5.2%      │                  │
│  │  ARPU: N/A           │  │  CAC: $12            │                  │
│  │  Pipeline: 5 users   │  │  Referral Rate: 3%   │                  │
│  └──────────────────────┘  │  NPS: 28             │                  │
│                            └──────────────────────┘                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  ALERTS & ACTION ITEMS                                     │     │
│  │  ⚠ WASP below target (-54%) → Onboarding investigation     │     │
│  │  ⚠ Activation below 12% → Check TTFV                      │     │
│  │  ✅ Scan Success above 85%                                 │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  SUCCESS GATE PROGRESS                                     │     │
│  │  Gate 0: ✅ PASS │ Gate 1: 🟡 IN PROGRESS (WASP: 23/5)     │     │
│  │  Gate 2: ⬜ NOT STARTED │ Gate 3-5: ⬜ LOCKED              │     │
│  └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Level 1: Executive (Главные KPI)

**Вопрос:** «Растёт ли продукт?»

Три метрики, которые Founder должен видеть первыми. Если что-то не так - хотя бы одна из этих метрик покажет проблему.

| # | Метрика | Отображение | Target | Alert если |
|---|---------|-------------|--------|------------|
| E1 | **WASP** | Число + delta vs prev week + % to target | 50 (M3) | < 50% от target 2 недели подряд |
| E2 | **MRR** | Число + delta vs prev month + ARR projection | $500 (M3) | < 25% от target 2 месяца подряд |
| E3 | **D7 Retention** | % + delta vs prev cohort + trend (3 недели) | > 25% (M3) | < 15% для любого cohort |

**Визуальные правила:**
- Зелёный: >= 80% от target
- Жёлтый: 50-80% от target
- Красный: < 50% от target
- Delta (vs previous period): стрелка вверх/вниз с процентом

---

## 3. Level 2: Product (Поведение пользователей)

**Вопрос:** «Пользователям нравится продукт?»

| # | Метрика | Отображение | Target | Alert если |
|---|---------|-------------|--------|------------|
| P1 | **Activation Rate** | % + delta | > 12% | < 8% |
| P2 | **TTFV (Median)** | Время (mm:ss) + delta | < 3 min | > 5 min |
| P3 | **Scan Success Rate** | % + failed count | > 85% | < 75% |
| P4 | **Score Distribution (Median)** | Число 0-100 + P25/P75 | 40-60 | Median > 80 или < 20 |
| P5 | **Recommendation Click Rate** | % | > 25% | < 10% |

**Sparkline для каждой метрики:** последние 8 недель - визуальный тренд без чисел. Позволяет за 1 секунду увидеть direction.

---

## 4. Level 3: Engineering (Надёжность)

**Вопрос:** «Продукт работает стабильно?»

| # | Метрика | Отображение | Target | Alert если |
|---|---------|-------------|--------|------------|
| EN1 | **Uptime (7d)** | % + incident count | > 99.5% | < 99% или > 1 incident |
| EN2 | **P95 Scan Duration** | Секунды + delta | < 60s |> 120s |
| EN3 | **Error Rate (5xx)** | % + absolute count | < 1% | > 2% |
| EN4 | **Test Coverage** | % (Domain / Total) | > 80% / > 60% | Domain < 70% |

**Дополнительная строка:** Last deployment date + version. Показывает, когда последний раз обновляли production.

---

## 5. Level 4: Business (Монетизация)

**Вопрос:** «Бизнес растёт?»

| # | Метрика | Отображение | Target | Alert если |
|---|---------|-------------|--------|------------|
| B1 | **Weekly Signups** | Число + delta | 20/week (M3) | < 5/week 2 недели подряд |
| B2 | **Paying Customers** | Число + delta | 12 (M3) | 0 при > 200 total users |
| B3 | **Monthly Churn** | % + lost customers | < 12% | > 20% |
| B4 | **ARPU** | $/month | > $40 | < $29 (все на минимальном плане) |
| B5 | **Free → Paid Pipeline** | Число пользователей у лимита | > 20/month | < 5 при > 100 free users |

---

## 6. Level 5: Growth (Рост аудитории)

**Вопрос:** «Воронка работает?»

| # | Метрика | Отображение | Target | Alert если |
|---|---------|-------------|--------|------------|
| G1 | **Weekly Visitors** | Число + delta | 500/week (M2) | < 100/week 3 недели подряд |
| G2 | **Landing Conversion** | % + delta | > 8% | < 4% |
| G3 | **Registration Rate** | % + delta | > 5% | < 2% |
| G4 | **CAC** | $ + trend (4 недели) | < $30 | > $50 |
| G5 | **Referral Rate** | % | > 5% | 0% при > 50 users |
| G6 | **NPS** | Число + distribution | > 30 | < 0 |

---

## 7. Alerts & Action Items Panel

Автоматически генерируемая панель на основе правил:

**Красные алерты (требуют немедленного действия):**
- WASP < 50% от target 2 недели подряд
- D7 retention < 15% для нового cohort
- Uptime < 99% за неделю
- Error Rate > 2%

**Жёлтые предупреждения (требуют внимания):**
- Activation Rate < 8%
- TTFV > 5 минут
- Scan Success Rate < 75%
- NPS < 0
- CAC > $50

**Зелёные подтверждения (positive signals):**
- WASP >= target
- Scan Success Rate > 90%
- NPS > 50
- Referral Rate > 10%

---

## 8. Success Gate Progress Panel

Компактное отображение прогресса по Success Gates (подробно - в SUCCESS_GATES.md):

```
Gate 0 (Alpha):     ✅ PASS - [date]
Gate 1 (Beta):      🟡 IN PROGRESS - WASP: 23/5, Activation: 11%/10%
Gate 2 (50 users):  ⬜ NOT STARTED - requires Gate 1
Gate 3 (100 users): ⬜ LOCKED - requires Gate 2
Gate 4 (First paid): ⬜ LOCKED - requires Gate 3
Gate 5 (PMF Signal): ⬜ LOCKED - requires Gate 4 + M6 metrics
```

---

## 9. Implementation Notes

### 9.1 Phase 1: Manual (Текий этап - Pre-Beta)

Dashboard реализуется в Google Sheets или Notion. Обновляется вручную Founder'ом 1 раз в неделю при заполнении Weekly Review Template. Это приемлемо для < 100 пользователей.

### 9.2 Phase 2: Semi-Automated (M3+)

Данные автоматически подтягиваются из Prisma + Stripe + Analytics. Founder только проверяет и комментирует. Требует: analytics integration (PostHog/Plausible), Stripe webhooks, health check endpoint.

### 9.3 Phase 3: Real-Time (M6+)

Dashboard встроен в admin panel Sec Scanner. Real-time обновление. Automated alerts (email/Slack). Требует: admin dashboard development, alerting system.

### 9.4 Minimum Viable Dashboard (для немедленного использования)

Для немедленного старта достаточно:
1. Google Sheet с 5 уровнями (шаблон в этом документе).
2. Weekly Review Template (WEEKLY_REVIEW_TEMPLATE.md) - заполнять параллельно.
3. Обновлять 5 Executive KPI вручную каждую неделю.

Это займёт 15-20 минут в неделю и даст 80% ценности полноценного dashboard.

---

## Приложение A. Dashboard Template (Copy-Paste для Google Sheets)

```
Row 1: "SEC SCANNER GROWTH DASHBOARD" | Week: [__] | Date: [__]
Row 3: "EXECUTIVE"
Row 4: WASP | [value] | [delta] | [target] | [status emoji]
Row 5: MRR | [value] | [delta] | [target] | [status emoji]
Row 6: D7 Retention | [value] | [delta] | [target] | [status emoji]
Row 8: "PRODUCT"
Row 9-13: [P1-P5 metrics]
Row 15: "ENGINEERING"
Row 16-19: [EN1-EN4 metrics]
Row 21: "BUSINESS"
Row 22-26: [B1-B5 metrics]
Row 28: "GROWTH"
Row 29-34: [G1-G6 metrics]
Row 36: "ALERTS"
Row 37+: [auto-generated alerts]
Row N: "GATE PROGRESS"
Row N+1-6: [Gate 0-5 status]
```
