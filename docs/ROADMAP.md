# ROADMAP.md — Дорожная карта

> Последнее обновление: BP-001 (Business Foundation), 2026-07-21
> Принцип (BP-001 BLOCK 11): Business → Product → UX → AI → Platform → Infrastructure

---

## Новый принцип планирования

До BP-001 roadmap строился от инфраструктуры к пользователю (INT-030 → ... → INT-050 → EP-001).

Теперь roadmap строится **снаружи внутрь**: от бизнес-цели к технической реализации.

```
Business goal ( ARR / MRR / conversion )
    ↓
Product feature (что нужно пользователю)
    ↓
UX design (как пользователь взаимодействует)
    ↓
AI capability (что делает AI Assistant)
    ↓
Platform module (SIP / AIS / AI CTO / AIO)
    ↓
Infrastructure (backend / database / deploy)
```

---

## Выполненные этапы

### Foundation (INT-030 → INT-050)
- ✅ Repository integrity, business trust, guided experience
- ✅ Smart navigation, self-explaining platform
- ✅ AIS — Adaptive Intelligence System
- ✅ Confidence-Driven UX, Marketplace → Solutions Center
- ✅ Product Recovery, Evidence-Driven Development
- ✅ Product Completeness Audit, Unified AI Architecture
- ✅ Platform Evolution Framework, Dual Mode Navigation

### Product Packaging (EP-001)
- ✅ User Home, CEO Dashboard, AI Copilot 2.0
- ✅ UX_AUDIT, TRUST_AUDIT, PRODUCT_PERSONALITY, STYLE_GUIDE
- ✅ PRODUCT_JOURNEY, BUSINESS_JOURNEY
- ✅ Commercial Readiness 18% (Architecture 94 / Product 71 / Business 42 / Commercial 18)

---

## Текущий этап

### BP-001: Business Foundation ✅ (текущий)
- ✅ ICP (5 профилей клиентов с LTV/CAC)
- ✅ Business Journey (Visitor → Referral, 10 этапов)
- ✅ Pricing Strategy ($99 / $499 / $1499 / $4999)
- ✅ Value Proposition (5 конкурентных преимуществ)
- ✅ Product-Market Fit assessment (63/100, C+)
- ✅ CEO Dashboard расширен: North Star, Pipeline, Forecast, PMF, ICP
- ✅ Rule 25 (Business Impact First), Rule 26 (Founder Review), Rule 27 (5 Impacts)
- ✅ Roadmap перестроен (Business → Product → UX → AI → Platform → Infra)

---

## Следующие этапы (по приоритету)

### EP-002: Auth + Billing + Trial (Q3 2026) — P0 CRITICAL

**Business goal**: открыть path to revenue. Невозможно продавать без auth и billing.

**Product**:
- Email/password регистрация
- Google OAuth
- 14-day trial flow
- Stripe billing integration
- Subscription management

**UX**:
- Registration form (< 60 сек)
- Onboarding wizard (3 шага)
- Trial countdown banner
- Upgrade prompts

**AI**:
- AI Assistant first-visit: "Помогу проверить безопасность за 2 минуты"
- AI рекомендации based on trial usage

**Platform**:
- AIS: onboarding flow
- AIO: backend persistence (user data, subscriptions)

**Infrastructure**:
- PostgreSQL database (users, subscriptions)
- Stripe SDK
- Email service (Resend/SendGrid)
- Session management (JWT)

**KPIs**:
- Registration count (цель: 50 trials в Q4 2026)
- Trial → Paid conversion (цель: 20%)
- MRR (цель: $10k к концу Q4 2026)

**Commercial impact**: поднимает Commercial Readiness с 18% до ~40%

---

### EP-003: Real Integrations (Q3 2026) — P0 CRITICAL

**Business goal**: закрыть TRUST-002 (mock integrations подрывают доверие).

**Product**:
- Real OAuth for Slack, GitHub, Jira
- Real API for webhooks
- Real SSH key management

**UX**:
- "Connect" → реальный OAuth flow → success только после реального подключения
- Явная индикация статуса подключения (Connected / Disconnected / Error)

**AI**:
- AI Assistant: "Slack подключён. Я буду присылать уведомления о новых уязвимостях."

**Platform**:
- SIP: Integrations module (real implementations)
- AIO: webhook delivery, retry logic

**KPIs**:
- Active integrations (цель: 50 к Q4 2026)
- TRUST-002 status: closed

**Commercial impact**: поднимает Commercial Readiness с 40% до ~50%

---

### EP-004: Real-time Scanner (Q4 2026) — P0 CRITICAL

**Business goal**: закрыть TRUST-003 (fake progress bar подрывает доверие).

**Product**:
- Real-time scanner progress (SSE от backend)
- Real scan results (не симуляция)
- Cancel scan functionality

**UX**:
- Progress bar отражает реальный прогресс
- Live findings появляются по мере обнаружения
- Cancel button

**AI**:
- AI Assistant: "Сканирование 70% завершено. Уже найдено 2 критические проблемы."

**Platform**:
- SIP: Scanner Engine (real backend integration)
- AIO: SSE pipeline, job queue

**KPIs**:
- Scan success rate (цель: 95%)
- Average scan time (цель: < 30 сек)
- TRUST-003 status: closed

**Commercial impact**: поднимает Commercial Readiness с 50% до ~55%

---

### EP-005: Onboarding Wizard + First Value (Q4 2026) — P1

**Business goal**: увеличить Trial → Paid conversion с целевых 20% до 25%.

**Product**:
- 3-step onboarding wizard (profile → first scan → first report)
- First Value Moment optimization
- Goal tracking ("1 из 6 шагов к полной безопасности")

**UX**:
- Welcome modal с AI Assistant
- Progressive disclosure
- Empty states с CTAs

**AI**:
- AI Assistant guided onboarding
- Contextual tips based on user role

**KPIs**:
- Time to First Scan (цель: < 5 мин)
- Trial activation rate (цель: 60%)

---

### EP-006: Referral Program (Q1 2027) — P1

**Business goal**: снизить CAC через органический growth.

**Product**:
- "Invite a friend, both get 1 month free"
- Affiliate program для agencies (20% recurring)
- Referral dashboard

**KPIs**:
- Referral rate (цель: 10% клиентов)
- Viral coefficient (цель: > 0.5)

---

### EP-007: Enterprise Features (Q1 2027) — P1

**Business goal**: открыть Enterprise сегмент ($4999/мес clients).

**Product**:
- SSO (SAML, Google Workspace, Azure AD)
- RBAC (roles, permissions)
- Audit trail (advanced, SIEM integration)
- On-premise опция

**KPIs**:
- Enterprise clients (цель: 5 к Q2 2027)
- Enterprise MRR (цель: $25k/мес к Q2 2027)

---

### EP-008: SEO + Content Marketing (Q4 2026) — P1

**Business goal**: увеличить distribution (PMF score 35 → 55).

**Product**:
- SEO-optimized landing pages
- Blog (2 статьи/неделю)
- White papers
- Case studies

**KPIs**:
- Organic traffic (цель: 2000 visitors/мес к Q1 2027)
- SEO rankings for target keywords

---

### EP-009: SOC2 Certification (Q2 2027) — P2

**Business goal**: открыть Enterprise sales, поднять moat (PMF score 55 → 75).

**Product**:
- SOC2 Type II audit
- Compliance documentation
- Security policies

**KPIs**:
- SOC2 certified (цель: Q2 2027)
- Enterprise pipeline (цель: 10 qualified leads)

---

## Долгосрочные цели

### Q4 2026
- $10k MRR, 20 paying customers
- 100 Weekly Active Scans
- 3 P0 trust findings closed
- PMF score 72

### Q2 2027
- $80k MRR, 150 customers
- 1000 Weekly Active Scans
- Enterprise features launched
- Seed round $2-3M
- PMF score 80

### Q4 2027
- $250k MRR, $3M ARR
- 5000 Weekly Active Scans
- 20 Enterprise clients
- Series A preparation
- PMF score 85

---

## Критический путь к первому $1M ARR

1. **EP-002** (Auth+Billing): Q3 2026 — открывает revenue
2. **EP-003** (Real Integrations): Q3 2026 — закрывает TRUST-002
3. **EP-004** (Real-time Scanner): Q4 2026 — закрывает TRUST-003
4. **EP-005** (Onboarding): Q4 2026 — увеличивает conversion
5. **EP-008** (SEO+Content): Q4 2026 — увеличивает distribution

При 2000 visitors/мес × 5% trial × 20% paid × $499/мес = $10k MRR (Q4 2026)
При 5000 visitors/мес × 5% × 25% × $599 (avg) = $37k MRR (Q1 2027)
При 10000 visitors/мес × 5% × 25% × $699 = $87k MRR (Q2 2027)
При 20000 visitors/мес + Enterprise expansion = $200k+ MRR (Q4 2027) = $2.4M ARR

**$1M ARR достигается в Q3-Q4 2027.**
