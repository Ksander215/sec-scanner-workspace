# PRICING.md — Pricing Strategy

> BP-001 BLOCK 4. 4 тарифа: Starter / Professional / Business / Enterprise.

---

## Pricing Philosophy

**Принцип**: Цена должна отражать value, не cost. Клиент платит за:
- Экономию времени (часы → минуты)
- Снижение риска (стоимость инцидента $4.45M)
- Compliance готовность (штрафы GDPR 4% revenue)
- Масштаб (1 инструмент вместо 5)

**Anchor pricing**: Enterprise $4999 делает Business $1499 "доступным".

---

## Starter — $99/мес ($948/год с annual -20%)

**Целевая аудитория**: Solo developers, side projects, indie hackers, микростартапы (1-10 сотрудников).

**Limit**:
- 1 проект
- 5 сканов/месяц
- 1 пользователь
- Базовые отчёты (HTML, PDF)
- Community support

**Features**:
- ✅ AI Assistant (basic tips)
- ✅ Scanner (nmap + nuclei)
- ✅ Findings list
- ✅ Basic reports
- ❌ Team features
- ❌ API access
- ❌ Custom integrations

**Почему $99**: Дешевле чем один час security консультанта ($150-300/час). No-brainer для solo dev.

---

## Professional — $499/мес ($4788/год)

**Целевая аудитория**: Startup Founder (ICP-1), small teams 10-50 сотрудников.

**Limit**:
- 3 проекта
- 50 сканов/месяц
- 3 пользователя
- Все форматы отчётов (HTML, PDF, JSON, SARIF, MD, CSV)
- Email support (24ч)

**Features**:
- ✅ AI Assistant (advanced, contextual)
- ✅ Scanner (все инструменты)
- ✅ Executive Summary для руководства
- ✅ Compliance reports (SOC2, ISO 27001 basic)
- ✅ Goal tracking
- ✅ History (90 дней)
- ❌ Team RBAC
- ❌ API access
- ❌ White-label

**Почему $499**: Заменяет $150k/год security engineer. ROI = 300×. Startup Founder может обосновать из seed funding.

---

## Business — $1499/мес ($14,388/год)

**Целевая аудитория**: SMB CTO (ICP-2), Security Agency (ICP-4), 50-200 сотрудников.

**Limit**:
- 10 проектов
- Безлимит сканов
- 10 пользователей
- Все форматы + custom templates
- Priority support (4ч) + dedicated CSM

**Features**:
- ✅ AI Assistant (Pro + custom rules)
- ✅ Team RBAC (roles, permissions)
- ✅ API access (1000 calls/день)
- ✅ Integrations (GitHub, Slack, Jira, custom webhooks)
- ✅ Multi-project dashboards
- ✅ History (1 год)
- ✅ White-label reports (logo, colors)
- ✅ Audit trail (basic)
- ❌ SSO
- ❌ On-premise

**Почему $1499**: Заменяет 2-3 security tools ($50k+/год каждый). Consolidation saves $100k+/год. Agency может resell с 30% margin.

---

## Enterprise — $4999/мес ($47,988/год)

**Целевая аудитория**: Enterprise CISO (ICP-3), MSP (ICP-5), 500+ сотрудников.

**Limit**:
- Безлимит проектов
- Безлимит сканов
- Безлимит пользователей
- Все форматы + custom development
- 24/7 support + dedicated engineer

**Features**:
- ✅ AI Assistant (unlimited + custom training)
- ✅ SSO (SAML, Google Workspace, Azure AD)
- ✅ RBAC (advanced, custom roles)
- ✅ API access (безлимит)
- ✅ All integrations + custom
- ✅ Multi-tenant (для MSP)
- ✅ White-label platform (полный branding)
- ✅ Audit trail (advanced, SIEM integration)
- ✅ On-premise опция
- ✅ SLA 99.9% uptime
- ✅ Custom compliance (SOC2 Type II, HIPAA, PCI-DSS)

**Почему $4999**: Заменяет enterprise security platform ($100k+/год). ROI = 20×. CISO может обосновать из security budget.

---

## Сравнение тарифов

| Feature | Starter $99 | Professional $499 | Business $1499 | Enterprise $4999 |
|---------|-------------|-------------------|----------------|-------------------|
| Projects | 1 | 3 | 10 | Unlimited |
| Scans/mo | 5 | 50 | Unlimited | Unlimited |
| Users | 1 | 3 | 10 | Unlimited |
| AI Assistant | Basic | Advanced | Pro + custom | Unlimited + training |
| Reports | HTML, PDF | All formats | + Templates | + Custom dev |
| Team RBAC | ❌ | ❌ | ✅ | ✅ Advanced |
| API access | ❌ | ❌ | 1000/day | Unlimited |
| Integrations | ❌ | ❌ | ✅ Standard | ✅ + Custom |
| SSO | ❌ | ❌ | ❌ | ✅ |
| Audit trail | ❌ | ❌ | Basic | Advanced + SIEM |
| On-premise | ❌ | ❌ | ❌ | ✅ |
| White-label | ❌ | ❌ | Reports | Full platform |
| SLA | ❌ | ❌ | 99.5% | 99.9% |
| Support | Community | Email 24ч | Priority 4ч + CSM | 24/7 + Engineer |

---

## Annual Discount

- **20% off** при annual payment
- Starter: $99/мес → $79/мес (annual $948)
- Professional: $499/мес → $399/мес (annual $4788)
- Business: $1499/мес → $1199/мес (annual $14,388)
- Enterprise: $4999/мес → $3999/мес (annual $47,988)

---

## Add-ons

| Add-on | Price | Описание |
|--------|-------|----------|
| Extra projects | $49/мес proj | Для Starter/Pro/Business |
| Extra users | $29/мес user | Для Starter/Pro/Business |
| Custom integration | $1999 one-time | Разработка custom integration |
| Professional services | $199/hour | Custom setup, training, audit |
| Priority support upgrade | $499/мес | 24/7 для Business |
| Custom compliance report | $999 one-time | SOC2, HIPAA, PCI-DSS custom |

---

## Revenue Projections

### Conservative (10% conversion Trial→Paid)

| Quarter | Trials | Starter | Pro | Business | Enterprise | MRR |
|---------|--------|---------|-----|----------|------------|-----|
| Q4 2026 | 50 | 3 | 2 | 0 | 0 | $895 |
| Q1 2027 | 150 | 8 | 6 | 1 | 0 | $4,481 |
| Q2 2027 | 400 | 20 | 15 | 3 | 0 | $11,930 |
| Q3 2027 | 800 | 40 | 30 | 6 | 1 | $26,396 |
| Q4 2027 | 1500 | 75 | 55 | 12 | 2 | $51,818 |

### Target (20% conversion)

| Quarter | MRR Target |
|---------|------------|
| Q4 2026 | $10k |
| Q1 2027 | $30k |
| Q2 2027 | $80k |
| Q3 2027 | $200k |
| Q4 2027 | $400k |

---

## Pricing Psychology

1. **Anchor**: Enterprise $4999 делает Business $1499 "доступным"
2. **Most popular**: Professional помечен "Most Popular" — social proof
3. **Decoy**: Starter $99 — слишком ограничен, push к Professional
4. **Annual discount**: 20% — push к annual (лучше cash flow)
5. **Free trial**: 14 дней — снижает friction, даёт попробовать
