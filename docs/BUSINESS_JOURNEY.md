# BUSINESS_JOURNEY.md — Путь развития бизнеса

> EP-001 BLOCK 10. Развитие бизнеса видно так же, как развитие платформы.

---

## Видение

**SIP** — операционная система для безопасности бизнеса. К 2027 году — лидер в сегменте SMB security (50-500 сотрудников).

**Цель на 12 месяцев**: $1M ARR, 200 платящих клиентов, 20 Enterprise.

---

## Стратегия

### Фаза 1: Product-Market Fit (Q3-Q4 2026)
- Закрыть P0 trust findings (TRUST-002, 003, 004)
- Реализовать регистрацию + billing
- First 10 платящих клиентов (друзья/нетворк)
- Цель: $5k MRR

### Фаза 2: Growth (Q1-Q2 2027)
- SEO + content marketing
- First 100 клиентов
- Enterprise features (SSO, RBAC)
- Цель: $50k MRR

### Фаза 3: Scale (Q3-Q4 2027)
- Sales team (2 человека)
- First 20 Enterprise клиентов
- Partnership program
- Цель: $200k MRR, $1M ARR

---

## Продукт

### Текущее состояние (INT-050)
- 66 features в реестре
- 37 verified
- Functional readiness: 91%
- Product readiness: 55%
- Commercial readiness: 18% (новая метрика EP-001)

### Roadmap
1. **EP-001** (этап): Product Packaging — User Home, переименования, CEO Dashboard
2. **EP-002**: Auth + Billing — регистрация, Stripe, trial
3. **EP-003**: Real Integrations — закрыть TRUST-002
4. **EP-004**: Real-time Scanner — закрыть TRUST-003
5. **EP-005**: Enterprise Features — SSO, RBAC, Audit

---

## Маркетинг

### Позиционирование
"Security Intelligence Platform для бизнеса без security команды."

### Каналы
- **SEO**: "vulnerability scanner", "security audit tool", "SMB security"
- **Content**: блог о security для CEO, кейсы
- **Product Hunt**: запуск
- **LinkedIn**: thought leadership
- **Referral**: existing клиенты → новые

### Метрики
- CAC (Customer Acquisition Cost): цель $200
- LTV (Lifetime Value): цель $2400 (24 мес retention)
- LTV/CAC ratio: цель > 10
- Conversion rate (visitor → trial): цель 5%
- Conversion rate (trial → paid): цель 20%

---

## Продажи

### Целевые сегменты
1. **SMB (50-200 сотрудников)** — Pro план $499/мес
2. **Mid-market (200-500)** — Pro + Enterprise add-ons
3. **Enterprise (500+)** — Enterprise $2499/мес

### Sales process
- Self-serve для Starter ($99)
- Inside sales для Pro ($499)
- Enterprise sales для Enterprise ($2499)

### Pipeline
- Leads → Trial → Demo → Proposal → Close
- Цикл: 2 недели (SMB), 1 месяц (Mid), 3 месяца (Enterprise)

---

## Финансы

### Revenue model
- SaaS subscription (monthly/annual)
- Annual discount: 20%
- Add-ons: priority support, custom integrations

### Прогноз (18 месяцев)

| Квартал | MRR | ARR | Клиенты |
|---------|-----|-----|---------|
| Q3 2026 | $2k | $24k | 5 |
| Q4 2026 | $10k | $120k | 20 |
| Q1 2027 | $30k | $360k | 60 |
| Q2 2027 | $80k | $960k | 150 |
| Q3 2027 | $150k | $1.8M | 280 |
| Q4 2027 | $250k | $3M | 450 |

### Runway
- Текущий burn: $0 (bootstrap)
- С инвестициями $500k: 18 месяцев runway
- Break-even: Q2 2027 при $80k MRR

---

## Найм

### План найма

| Роль | Когда | Зарплата |
|------|-------|----------|
| Founding Engineer #1 | Q4 2026 | $80k + equity |
| Marketing Lead | Q1 2027 | $60k + equity |
| Sales Lead | Q2 2027 | $70k + commission |
| Customer Success | Q2 2027 | $50k |
| Founding Engineer #2 | Q3 2027 | $90k + equity |

### Культура
- Async-first
- Documentation > meetings
- Customer-obsessed
- Security mindset

---

## Инвесторы

### Стадия
- Pre-seed: $500k (текущая потребность)
- Seed: $2-3M (после $50k MRR, Q2 2027)

### Use of funds (Pre-seed $500k)
- Engineering (40%): 2 разработчика, 12 месяцев
- Marketing (25%): SEO, content, Product Hunt
- Sales (15%): inside sales, CRM
- Operations (10%): legal, accounting, infrastructure
- Buffer (10%)

### Pitch deck outline
1. Problem: SMB не имеют security команды, но нуждаются в защите
2. Solution: AI-powered security platform для не-инженеров
3. Market: $5B SMB security market, 10% YoY growth
4. Product: demo + key metrics
5. Traction: 5 платящих клиентов, $5k MRR
6. Business model: SaaS, $99-$2499/мес
7. Team: founder background
8. Ask: $500k for 12-month runway to $50k MRR

---

## CEO Dashboard (реализуется в EP-001)

Бизнес-метрики, которые будут видны фаундеру:

| Метрика | Текущее | Цель Q4 2026 |
|---------|---------|--------------|
| MRR | $0 | $10k |
| ARR | $0 | $120k |
| Trials | 0 | 50 |
| Trial → Paid conversion | 0% | 20% |
| Active users | 0 | 30 |
| Retention (30-day) | 0% | 70% |
| CAC | $0 | $200 |
| LTV | $0 | $2400 |
| Runway | ∞ (bootstrap) | 18 мес (с инвестициями) |
| Enterprise pipeline | 0 | 5 |

---

## Риски

| Риск | Вероятность | Влияние | Mitigation |
|------|-------------|---------|------------|
| Конкуренты (Tenable, Rapid7) | Высокая | Среднее | Фокус на SMB + AI differentiation |
| Trust issues (mock data) | Высокая | Критическое | EP-001 закрыть P0 trust findings |
| Медленный sales cycle | Средняя | Среднее | Self-serve для Starter |
| Technical debt (backend) | Средняя | Высокое | EP-002 синхронизация backend |
| Найм дорогой | Высокая | Среднее | Remote-first, equity-heavy |
