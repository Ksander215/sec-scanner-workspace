# SUCCESS_GATES.md - Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Стратегический документ - Development Milestones
> **Владелец:** CEO
> **Статус:** Active
> **Связанные документы:** PRODUCT_INTELLIGENCE_FRAMEWORK.md, KPI_CATALOG.md, NORTH_STAR_METRIC.md, PRIVATE_BETA_ROADMAP.md, PRODUCT_MATURITY_SCORECARD.md

---

## Executive Summary

Success Gates - система контрольных точек развития продукта. Каждая Gate определяет, достигнут ли достаточный уровень зрелости для перехода на следующий этап. Проход через Gate - это не просто «достигли числа», а подтверждение, что продукт действительно доставляет ценность.

Система содержит 6 Gates: от Internal Alpha до PMF Signal. Каждый Gate имеет обязательные критерии, минимальные KPI, и причины остановки (stop conditions). Если stop condition срабатывает - продвижение останавливается, проводится анализ и принимается решение: pivot, persevere, или stop.

---

## Gate 0: Internal Alpha

**Определение:** Продукт функционален для внутреннего использования Founder'ом. Реальное сканирование работает, но нет external users.

### Обязательные критерии (ALL required)

| # | Критерий | Target | Статус (2026-07-14) |
|---|----------|--------|---------------------|
| 0.1 | Реальный DAST engine работает | Базовые HTTP-проверки, OWASP Top 10 headers | ❌ Не реализован |
| 0.2 | Demo Target развёрнут | One-click demo scan работает | ❌ Не реализован |
| 0.3 | Security Score вычисляется на реальных данных | Score + Explainability + Recommendations | ❌ Mock данные |
| 0.4 | Onboarding Wizard (3 шага) | Welcome → Demo Scan → Your Scan | ❌ Не реализован |
| 0.5 | Email Verification работает | Пользователь не может использовать продукт без подтверждения | ❌ Не реализован |
| 0.6 | Password Reset работает | Forgot password flow end-to-end | ❌ Не реализован |
| 0.7 | Health Check endpoint | GET /api/health → 200 + version + uptime | ❌ Не реализован |
| 0.8 | Error Pages (404, 500) | Пользователь-friendly страницы | ❌ Не реализован |

### Минимальные KPI

| Метрика | Target |
|---------|--------|
| Scan Success Rate (internal) | > 90% |
| TTFV (internal) | < 2 мин |
| Security Score computed | Да (real data) |

### Причины остановки

- Real DAST engine не работает после 5 дней реализации → пересмотреть подход (интеграция ZAP CLI вместо HTTP-based).
- Onboarding wizard > 5 минут TTFV → упростить до 1 step.

### Связь с Roadmap

PRIVATE_BETA_ROADMAP.md §P0: ROADMAP-001 (Demo Target), ROADMAP-002 (DAST Engine), ROADMAP-003 (Email), ROADMAP-004 (Password Reset), ROADMAP-005 (Onboarding), ROADMAP-006 (Health Check).

---

## Gate 1: Private Beta

**Определение:** Продукт готов для first external users. Landing page работает, onboarding smooth, product delivers real value.

### Обязательные критерии (ALL required)

| # | Критерий | Target | Статус (2026-07-14) |
|---|----------|--------|---------------------|
| 1.1 | Landing Page live | SEO-оптимизированная, CTA работает, responsive | ❌ |
| 1.2 | Registration flow works | Email/Google/GitHub OAuth, verification email | ❌ |
| 1.3 | Onboarding < 3 мин | От регистрации до первого Security Score | ❌ |
| 1.4 | First scan gives real value | Score + Explainability + Recommendations | ❌ |
| 1.5 | Terms of Service published | /terms page | ❌ |
| 1.6 | Privacy Policy published | /privacy page | ❌ |
| 1.7 | Error tracking setup | Sentry или аналог | ❌ |
| 1.8 | CI/CD pipeline | Auto-deploy on merge to main | ❌ |

### Минимальные KPI

| Метрика | Target |
|---------|--------|
| WASP | > 5 (5 проектов сканируются weekly) |
| Activation Rate | > 10% |
| Scan Success Rate | > 80% |
| TTFV (median) | < 3 мин |
| Beta users invited | > 20 |

### Причины остановки

- Activation Rate < 5% после 50 регистраций → onboarding redesign.
- Scan Success Rate < 60% → DAST engine stability issues.
- < 3 пользователя завершили onboarding за первую неделю → product-market fit question.

---

## Gate 2: 50 Active Users

**Определение:** Достаточное количество пользователей для статистически значимых выводов о ценности продукта.

### Обязательные критерии

| # | Критерий | Target |
|---|----------|--------|
| 2.1 | Total registered users | > 200 |
| 2.2 | WAU (Weekly Active Users) | > 50 |
| 2.3 | WASP | > 20 |
| 2.4 | D7 Retention | > 15% |
| 2.5 | 3+ user interviews completed | Документированные выводы |
| 2.6 | Top 3 complaints identified | С приоритизацией |
| 2.7 | Email Digest functional | Weekly email отправляется, open rate > 25% |

### Минимальные KPI

| Метрика | Target |
|---------|--------|
| Activation Rate | > 12% |
| NPS | > 20 |
| Scan Success Rate | > 85% |
| Avg Scans per Project per Week | > 1.2 |

### Причины остановки

- D7 Retention < 10% при > 200 users → фундаментальная проблема с ценностью. Провести 10 user interviews. Рассмотреть pivot.
- NPS < 0 → пользователи недовольны. Stop acquisition, фокус на product improvement.
- 0 repeat scans за 2 недели → продукт не создаёт habit. Пересмотреть value proposition.

---

## Gate 3: 100 Users

**Определение:** Масштабирование подтверждено. Продукт работает при растущей нагрузке.

### Обязательные критерии

| # | Критерий | Target |
|---|----------|--------|
| 3.1 | Total registered users | > 500 |
| 3.2 | WAU | > 100 |
| 3.3 | WASP | > 40 |
| 3.4 | D7 Retention | > 20% |
| 3.5 | D30 Retention | > 12% |
| 3.6 | Stripe Billing live | Users can pay |
| 3.7 | Public Launch completed | Product Hunt, HN, Reddit |
| 3.8 | CI/CD + monitoring | Automated deploy, error tracking, uptime monitoring |

### Минимальные KPI

| Метрика | Target |
|---------|--------|
| MRR | > $0 (billing работает, первые оплаты возможны) |
| Activation Rate | > 12% |
| Churn (user level, not revenue) | < 20% |
| Uptime | > 99% |

### Причины остановки

- Uptime < 98% → infrastructure не справляется. Deferred PostgreSQL migration.
- Activation Rate падает при масштабе (> 500 users) → onboarding не масштабируется.
- D30 Retention < 5% → долгосрочная ценность отсутствует.

---

## Gate 4: First Paid Subscription

**Определение:** Первый пользователь добровольно заплатил. Это не просто «можно платить», а «кто-то посчитал, что ценность > $29/мес».

### Обязательные критерии

| # | Критерий | Target |
|---|----------|--------|
| 4.1 | First paying customer | Real payment via Stripe |
| 4.2 | Paying customer completed 3+ scans | Не «забыл отменить», а реальное использование |
| 4.3 | MRR | > $29 |
| 4.4 | Free → Paid conversion | > 1 user |
| 4.5 | Upgrade trigger validated | Пользователь достиг лимита и решил заплатить |

### Минимальные KPI

| Метрика | Target |
|---------|--------|
| WASP | > 25 |
| D7 Retention | > 22% |
| NPS | > 25 |
| Paying customer LTV projection | > $200 (expected 7+ месяцев) |

### Причины остановки

- 0 paying customers при > 1000 registered + 3 months active → pricing или value problem. Провести price sensitivity interviews.
- First paying customer churned in < 1 month → ценность не удерживает. Deep-dive interview с churned customer.
- Все paying на最低 tier (Pro) → ценность не достаточна для Team upgrade. Рассмотреть feature additions.

---

## Gate 5: Product-Market Fit Signal

**Определение:** Комбинация метрик, которая статистически подтверждает Product-Market Fit. Не один показатель, а система.

### Обязательные критерии (ALL required)

| # | Критерий | Target |
|---|----------|--------|
| 5.1 | MRR | > $2,000 |
| 5.2 | Paying Customers | > 30 |
| 5.3 | Monthly Churn | < 10% |
| 5.4 | NRR | > 85% |
| 5.5 | WASP | > 80 |
| 5.6 | D30 Retention | > 18% |
| 5.7 | NPS | > 40 |
| 5.8 | 3+ unsolicited testimonials | Документированные, с разрешения |
| 5.9 | 2+ users scanned 10+ times | Power users exist |
| 5.10 | Sean Ellis Test | > 40% ответили «very disappointed» без продукта |

### Минимальные KPI

| Метрика | Target |
|---------|--------|
| LTV/CAC | > 3x |
| CAC Payback | < 6 месяцев |
| Referral Rate | > 5% |
| Inbound % of new signups | > 20% |

### Причины остановки

- Churn > 20% при > 30 paying → retention problem > acquisition. Stop growth, fix product.
- NRR < 70% → existing customers are leaving faster than expanding. Deep churn analysis.
- Sean Ellis Test < 20% «very disappointed» → no PMF. Consider pivot.

### При достижении Gate 5

При достижении всех критериев Gate 5:
1. Фиксировать достижение в DECISION_LOG как BDR (Business Decision Record).
2. Обновить Product Success Model (PRODUCT_INTELLIGENCE_FRAMEWORK §1).
3. Рассмотреть: Seed fundraise vs bootstrapped growth.
4. Планировать: Team expansion, PostgreSQL migration, SOC 2.

---

## Приложение A. Gate Transition Rules

1. **Последовательность обязательна.** Нельзя перескочить Gate. Gate 3 не может быть пройден без Gate 2.
2. **Time-boxed evaluation.** Каждая Gate оценивается минимум 2 недели.Gate 5 - минимум 4 недели.
3. **Stop condition = full stop.** При срабатывании stop condition: остановить acquisition, провести анализ, принять решение.
4. **Metrics over feelings.** Gate считается пройденной только при достижении числовых критериев. «Мне кажется, что продукт готов» - недостаточно.
5. **Regression = re-evaluation.** Если пройденная Gate метрика регрессировала ниже threshold на 2 недели подряд → Gate status меняется на «At Risk».

## Приложение B. Quick Reference

```
Gate 0 (Alpha):      Real scan works, onboarding < 3min, internal use only
Gate 1 (Beta):       Landing live, 5+ WASP, 20+ beta users invited
Gate 2 (50 users):   200 registered, 50 WAU, D7 > 15%, 3+ interviews
Gate 3 (100 users):  500 registered, 100 WAU, Stripe live, public launch
Gate 4 (First paid): First real payment, MRR > $29, D7 > 22%
Gate 5 (PMF):        MRR > $2K, churn < 10%, NPS > 40, Sean Ellis > 40%
```
