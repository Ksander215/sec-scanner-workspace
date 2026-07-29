# BUSINESS_JOURNEY.md — Карта пути клиента

> BP-001 BLOCK 3. Visitor → Landing → Registration → Trial → First Scan → First Value → Conversion → Retention → Expansion → Referral

---

## Этап 1: Visitor

**Цель пользователя**: Найти решение проблемы безопасности.
**Цель бизнеса**: Привлечь целевого посетителя на Landing.
**KPI**: Traffic (UV/мес), Source quality (bounce rate, time on site).
**Препятствия**: Высокая конкуренция в SEO, дорогая реклама.
**Критерий успеха**: Visitor проводит > 30 сек на Landing, изучает > 2 страниц.

**Каналы**:
- SEO: "vulnerability scanner", "security audit tool", "SMB security"
- Content: блог, white papers, case studies
- Product Hunt launch
- LinkedIn: thought leadership, outreach
- Referral: existing клиенты → друзья
- Paid: Google Ads, LinkedIn Ads (после PMF)

---

## Этап 2: Landing

**Цель пользователя**: Понять что это за продукт и подходит ли ему.
**Цель бизнеса**: Конвертировать visitor → trial registration.
**KPI**: Visitor → Trial conversion rate (цель 5%).
**Препятствия**: Непонятное value proposition, технический язык.
**Критерий успеха**: Visitor нажимает "Try free" или "Book a demo".

**Элементы Landing**:
- Hero: "Security Intelligence Platform для бизнеса без security команды"
- Demo preview: реальный скриншот продукта
- Social proof: логотипы клиентов, testimonials
- Pricing: понятные планы ($99 / $499 / $1499 / $4999)
- CTA: "Start free 14-day trial" (primary), "Book a demo" (secondary)

---

## Этап 3: Registration

**Цель пользователя**: Создать аккаунт быстро.
**Цель бизнеса**: Минимизировать friction, собрать email.
**KPI**: Landing → Registration conversion (цель 25% от clicked).
**Препятствия**: Долгая форма, email verification friction.
**Критерий успеха**: User зарегистрирован за < 60 секунд.

**Flow**:
1. Email + password (или Google OAuth)
2. Email verification (отправить сразу)
3. Welcome email с onboarding
4. Прямой redirect в /app/home

**Текущее состояние**: ❌ Нет регистрации (PLAT-008 SSO not_started). EP-002 приоритет.

---

## Этап 4: Trial

**Цель пользователя**: Понять ценность продукта за 14 дней.
**Цель бизнеса**: Довести пользователя до First Value Moment.
**KPI**: Trial activation rate (цель 60% — пользователь запустил 1 scan).
**Препятствия**: Сложный onboarding, технические термины.
**Критерий успеха**: User запустил первый scan в течение 24 часов после регистрации.

**Onboarding**:
- Welcome modal: "Привет! Я AI Assistant. Помогу проверить безопасность за 2 минуты."
- Onboarding wizard: 3 шага (profile → first scan → first report)
- AI Assistant first-visit notification
- Email sequence: Day 1 (welcome), Day 3 (tip), Day 7 (case study), Day 13 (trial ending)

---

## Этап 5: First Scan

**Цель пользователя**: Запустить первую проверку безопасности.
**Цель бизнеса**: Доставить First Value Moment (FVM).
**KPI**: Time to First Scan (цель < 5 минут после регистрации).
**Препятствия**: Сложный scanner UI, fake progress bar (TRUST-003).
**Критерий успеха**: Scan завершён, пользователь видит результаты.

**Flow**:
1. User нажимает "Проверить безопасность" на /app/home
2. Scanner wizard: ввести URL/IP → выбрать тип сканирования → Start
3. Real-time progress (НЕ симуляция — SSE от backend)
4. Results: Executive Summary + findings list + AI рекомендации

---

## Этап 6: First Value

**Цель пользователя**: Понять что делать с результатами.
**Цель бизнеса**: Доставить Aha! Moment.
**KPI**: User кликает на AI рекомендацию или скачивает отчёт.
**Препятствия**: Непонятные термины в findings, нет tracking исправлений.
**Критерий успеха**: User совершил 2+ действия после first scan (AI recommendation, download report, mark finding as fixed).

**Элементы First Value**:
- Executive Summary: "Найдено 3 критические проблемы. Начните с этой →"
- AI Assistant: "Рекомендую обновить SSL сертификат — это займёт 15 минут"
- Action buttons: "Скачать отчёт PDF", "Показать что исправить"
- Goal tracking: "1 из 6 шагов к полной безопасности"

---

## Этап 7: Conversion (Trial → Paid)

**Цель пользователя**: Понять что продукт стоит своих денег.
**Цель бизнеса**: Конвертировать trial в paid subscription.
**KPI**: Trial → Paid conversion rate (цель 20%).
**Препятствия**: Цена, отсутствие billing, сомнения в value.
**Критерий успеха**: User оплатил Pro/Business/Enterprise план.

**Triggers для conversion**:
- Day 7: "Вы уже нашли 5 уязвимостей. Продолжите в Pro плане →"
- Day 13: "Trial заканчивается завтра. Сохраните ваши результаты →"
- Usage limit: "Вы достигли лимита сканов в trial. Upgrade →"
- AI: "Я нашёл 3 критические проблемы. Хотите исправить? Upgrade →"

**Текущее состояние**: ❌ Нет billing. EP-002 приоритет.

---

## Этап 8: Retention

**Цель пользователя**: Продолжать использовать продукт регулярно.
**Цель бизнеса**: Удержать платящего пользователя.
**KPI**: Monthly retention rate (цель 90%+), Weekly Active Scans.
**Препятствия**: Забыл про продукт, не видит новую ценность.
**Критерий успеха**: User запускает ≥ 1 scan в неделю.

**Retention tactics**:
- Email: weekly security digest
- AI: proactive tips based on usage
- In-app: notifications о новых уязвимостях в их stack
- Goals: progress tracking к "100% безопасность"

---

## Этап 9: Expansion

**Цель пользователя**: Расширить использование (больше проектов, больше пользователей).
**Цель бизнеса**: Увеличить MRR через existing клиентов.
**KPI**: Net Revenue Retention (цель 120%+).
**Препятствия**: Лимиты плана, отсутствие team features.
**Критерий успеха**: User upgrade на higher plan или добавляет seats.

**Expansion tactics**:
- Usage-based: "Вы достигли лимита 10 проектов. Upgrade → Business plan"
- Team: "Пригласите коллег — первые 3 бесплатно"
- Features: "Unlock AI Assistant Pro с Business plan"

---

## Этап 10: Referral

**Цель пользователя**: Поделиться продуктом с другими.
**Цель бизнеса**: Снизить CAC через органический growth.
**KPI**: Referral rate (цель 10% клиентовRefer ≥ 1), Viral coefficient.
**Препятствия**: Нет incentive для referral, продукт не "wow" достаточно.
**Критерий успеха**: User приглашает ≥ 1 друга или коллегу.

**Referral program**:
- "Invite a friend, both get 1 month free"
- Affiliate program для consultants/agencies (20% recurring)
- Public case studies с согласия клиентов

---

## Сводка воронки

| Этап | Цель конверсии | Текущее | Препятствие |
|------|----------------|---------|-------------|
| Visitor → Landing | — | — | SEO, content |
| Landing → Registration | 5% | 0% | Нет landing CTA оптимизации |
| Registration → Trial | 25% | 0% | ❌ Нет регистрации |
| Trial → First Scan | 60% | 0% | ❌ Нет trial flow |
| First Scan → First Value | 80% | 0% | ❌ Нет FVM optimization |
| First Value → Conversion | 20% | 0% | ❌ Нет billing |
| Conversion → Retention (M1) | 90% | 0% | ❌ Нет retention tactics |
| Retention → Expansion | 30% | 0% | ❌ Нет expansion features |
| Retention → Referral | 10% | 0% | ❌ Нет referral program |

## Критический путь к первому $10k MRR

1. **EP-002**: Auth + Billing + Trial flow (Q3 2026)
2. **EP-003**: Real Integrations — закрыть TRUST-002 (Q3 2026)
3. **EP-004**: Real-time Scanner — закрыть TRUST-003 (Q4 2026)
4. **EP-005**: Onboarding wizard + First Value optimization (Q4 2026)
5. **EP-006**: Referral program (Q1 2027)

При конверсии 5% (Landing→Trial) × 20% (Trial→Paid) × $499/мес = $5k MRR на 1000 visitors/мес.
При 2000 visitors/мес = $10k MRR. Цель Q4 2026.
