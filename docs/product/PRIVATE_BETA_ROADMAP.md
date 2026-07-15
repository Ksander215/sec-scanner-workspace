# PRIVATE_BETA_ROADMAP.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Продуктовый документ — Roadmap до Private Beta
> **Владелец:** CPO
> **Статус:** Active
> **Связанные документы:** PRODUCT_READINESS_REPORT.md, PRIVATE_BETA_CHECKLIST.md, PRODUCT_MATURITY_SCORECARD.md, PRODUCT_MARKET_FIT_BLUEPRINT.md

---

## Цель

Перевести продукт из состояния «инфраструктура без ценности» (Maturity 3.7/10) в состояние «готов к Private Beta с 50 пользователями» (Maturity 6.5/10).

**Target date:** 2-3 недели сфокусированной работы.

---

## Обязательно до запуска (P0)

Эти задачи являются блокерами. Без их выполнения запуск невозможен.

### ROADMAP-001: Demo Target (уязвимый сайт для демонстрации)

| Атрибут | Значение |
|---------|----------|
| **Priority** | P0 — Blocking |
| **Business Impact** | 10/10 — без этого невозможно показать ценность продукта |
| **Engineering Effort** | 3/10 — ~1 день |
| **ROI** | 3.3 — высочайший |
| **Риск откладывания** | Критический — невозможно провести ни одно user interview без рабочего demo |

**Что сделать:** Развернуть преднастроенный уязвимый сайт (DVWA или OWASP Juice Shop) на том же VPS или отдельном subdomain. Добавить кнопку «Try Demo Scan» на Security tab — one-click сканирование Demo Target. Результаты должны быть **реальными** (настоящие уязвимости Demo Target'а, обработанные через Security State Engine + Explainability Layer).

**Критерий завершения:** Пользователь нажимает одну кнопку → видит реальный Security Score с реальными объяснениями. TTFV < 60 секунд.

### ROADMAP-002: Basic Real DAST Engine

| Атрибут | Значение |
|---------|----------|
| **Priority** | P0 — Blocking |
| **Business Impact** | 10/10 — ядро продукта |
| **Engineering Effort** | 7/10 — 3-5 дней |
| **ROI** | 1.4 |
| **Риск откладывания** | Критический — продукт не имеет ценности без real scanning |

**Что сделать:** Реализовать минимальный DAST engine, который: (1) отправляет HTTP-запросы к target URL, (2) парсит HTML для базовых OWASP Top 10 проверок (security headers, form fields, cookie attributes, mixed content, open redirects), (3) не требует интеграции с ZAP/Nuclei на этом этапе — простые HTTP-based проверки. Результаты передаются в Security State Engine и Explainability Layer.

**Критерий завершения:** Пользователь вводит свой URL → получает реальный Security Score с реальными (пусть и базовыми) находками. Отличие от Demo Target: пользователь сканирует свой собственный сайт.

**Примечание:** Полноценный DAST (spidering, form submission, XSS/SQLi detection) — это P1, после beta. Для beta достаточно базовых проверок, которые дают реальный (а не mock) результат.

### ROADMAP-003: Email Verification

| Атрибут | Значение |
|---------|----------|
| **Priority** | P0 — Blocking |
| **Business Impact** | 6/10 — security + deliverability |
| **Engineering Effort** | 2/10 — 4-6 часов |
| **ROI** | 3.0 |
| **Риск откладывания** | Высокий — можно регистрировать любые email, спам-боты, reputation risk |

**Что сделать:** При регистрации отправлять verification email с токеном. Пользователь не может использовать продукт до подтверждения email. Токен expires через 24 часа.

**Критерий завершения:** Регистрация с непроверенным email → редирект на «проверьте почту» страницу. После клика — полный доступ.

### ROADMAP-004: Password Reset

| Атрибут | Значение |
|---------|----------|
| **Priority** | P0 — Blocking |
| **Business Impact** | 7/10 — пользователи будут забывать пароль |
| **Engineering Effort** | 2/10 — 4-6 часов |
| **ROI** | 3.5 |
| **Риск откладывания** | Высокий — забывший пароль = потерянный пользователь = negative review |

**Что сделать:** Endpoint `POST /api/auth/forgot-password` (генерирует токен, отправляет email). Endpoint `POST /api/auth/reset-password` (проверяет токен, обновляет пароль). Токен expires через 1 час.

**Критерий завершения:** Пользователь нажимает «Забыли пароль?» → вводит email → получает письмо → сбрасывает пароль → входит.

### ROADMAP-005: Onboarding Wizard (3 шага)

| Атрибут | Значение |
|---------|----------|
| **Priority** | P0 — Blocking |
| **Business Impact** | 8/10 — напрямую влияет на Activation Rate |
| **Engineering Effort** | 5/10 — 1-2 дня |
| **ROI** | 1.6 |
| **Риск откладывания** | Высокий — без onboarding 6-tab dashboard = cognitive overload, high bounce |

**Что сделать:** 3-step wizard после регистрации:
1. **Welcome:** «Sec Scanner показывает Security Score вашего сайта. Давайте покажем, как это работает.» → Кнопка «Попробовать демо».
2. **Demo Scan:** Автоматический сканирование Demo Target (ROADMAP-001). Пользователь видит Security Score + Explainability widgets с реальными данными. «Это ваш первый Security Score. Теперь сканируйте свой сайт.»
3. **Your First Scan:** Поле ввода URL → сканирование → результат. «Отлично! Вы получите email с подробным отчётом. Возвращайтесь, чтобы отслеживать изменения.»

**Критерий завершения:** Новый пользователь проходит 3 шага за < 3 минуты. После wizard видит Security tab с реальными данными.

### ROADMAP-006: Health Check + Error Pages + Error Tracking

| Атрибут | Значение |
|---------|----------|
| **Priority** | P0 — Blocking |
| **Business Impact** | 6/10 — production stability |
| **Engineering Effort** | 3/10 — 4-8 часов |
| **ROI** | 2.0 |
| **Риск откладывания** | Средний — production ошибки будут невидимы |

**Что сделать:**
1. `/api/health` — DB connection check, uptime, version, last scan time.
2. `not-found.tsx` — branded 404 с CTA на dashboard.
3. `error.tsx` — error boundary с recovery button.
4. Sentry (free tier) — или аналог — для production error tracking.

**Критерий завершения:** `/api/health` возвращает 200. 404/error — branded. Production ошибки видны в Sentry dashboard.

### ROADMAP-007: Terms of Service + User Guide + Feedback

| Атрибут | Значение |
|---------|----------|
| **Priority** | P0 — Blocking |
| **Business Impact** | 7/10 — legal compliance + user support |
| **Engineering Effort** | 3/10 — 1 день |
| **ROI** | 2.3 |
| **Риск откладывания** | Средний — legal risk без ToS, no feedback = no learning |

**Что сделать:**
1. **ToS** — минимальный шаблон (базовый для SaaS: права использования, limitation of liability, data processing).
2. **User Guide** — 1-страничный «Getting Started» с 3 шагами: Register → Scan → Read Report.
3. **Feedback button** — в navbar или dashboard. Simplest: link to Google Form или Typeform. Не нужно in-app widget для beta.

**Критерий завершения:** `/terms` page exists. User Guide доступен из dashboard. Feedback button виден и functional.

### ROADMAP-008: Исправить цену на Landing Page

| Атрибут | Значение |
|---------|----------|
| **Priority** | P0 — Blocking |
| **Business Impact** | 7/10 — несогласованность с PMF Blueprint |
| **Engineering Effort** | 1/10 — 15 мин |
| **ROI** | 7.0 |
| **Риск откладывания** | Высокий — показывает неверную цену |

**Что сделать:** Обновить StoreProduct seed данные: Pro $29/мес (не $49), Team $79/мес, Business $199/мес. Убедиться, что landing page показывает правильные цены.

**Критерий завершения:** Landing pricing section показывает $29 / $79 / $199.

---

## Желательно до запуска (P1)

Эти задачи не блокируют запуск, но значительно повысят качество beta.

### ROADMAP-009: Analytics (PostHog)

| BV | EC | ROI | Effort |
|----|----|-----|--------|
| 8 | 2 | 4.0 | 2-4 часа |

PostHog free tier (< 1M events). Отслеживать: registration, first scan, scan completion, dashboard views, feedback clicks. Без аналитики beta — слепой полёт.

### ROADMAP-010: Privacy Policy Review

| BV | EC | ROI | Effort |
|----|----|-----|--------|
| 5 | 2 | 2.5 | 2-4 часа |

Текущий Privacy Policy — placeholder. Юридический review или использование стандартного SaaS шаблона.

### ROADMAP-011: Onboarding UX: Progressive Disclosure

| BV | EC | ROI | Effort |
|----|----|-----|--------|
| 6 | 4 | 1.5 | 0.5-1 день |

Скрывать неиспользуемые табы (History, Teams, API Keys, Billing) до первого сканирования. Показывать только Security + New Scan.

### ROADMAP-012: Welcome Email Sequence

| BV | EC | ROI | Effort |
|----|----|-----|--------|
| 5 | 2 | 2.5 | 2-4 часа |

Email 1 (сразу): «Добро пожаловать + Getting Started link». Email 2 (через 24ч): «Вы не сканировали — вот как начать». Email 3 (через 7 дней): «Как вам Sec Scanner? Feedback link».

### ROADMAP-013: Uptime Monitoring

| BV | EC | ROI | Effort |
|----|----|-----|--------|
| 5 | 1 | 5.0 | 30 мин |

UptimeRobot free tier. Пинг `/api/health` каждую минуту. Алерт на email/Telegram при downtime.

---

## После появления первых пользователей (P2)

Эти задачи выполняются на основе beta feedback.

### ROADMAP-014: Stripe Integration

Монетизация нужна после PMF signal (M2-3). Не раньше.

### ROADMAP-015: Enhanced DAST Engine

Полноценный DAST: spidering, form submission, XSS/SQLi detection. Интеграция с Nuclei или собственный. Определяется по accuracy feedback от beta users.

### ROADMAP-016: Email Digest

Еженедельный Security Posture digest. Реализуется после того, как у пользователей будет 2+ скана (нужны данные для сравнения).

### ROADMAP-017: Regression Alerts

Уведомление «ваш Security Score упал на N пунктов». Требует минимум 2 сканов одного target.

### ROADMAP-018: Scheduled Scans

Автоматическое еженедельное сканирование. Требует stable DAST engine.

### ROADMAP-019: CI/CD Pipeline

GitHub Actions: lint → test → build → deploy. Становится критичным при frequent deploys.

### ROADMAP-020: PostgreSQL Migration

Когда concurrent users > 50 или M6 (что наступит раньше). Platform Layer делает миграцию безопасной.

---

## Timeline

```
Week 1 (Jul 14-20):  P0 Blocking Items
├── Day 1:   ROADMAP-001 (Demo Target) + ROADMAP-008 (Fix Price)
├── Day 2-3: ROADMAP-002 (Basic DAST Engine) — самая большая задача
├── Day 4:   ROADMAP-003 (Email Verification) + ROADMAP-004 (Password Reset)
├── Day 5:   ROADMAP-005 (Onboarding Wizard) — начало
└── Day 6-7: ROADMAP-005 завершение + ROADMAP-006 (Health/Errors) + ROADMAP-007 (ToS/Guide/Feedback)

Week 2 (Jul 21-27):  P1 Desirable + Testing
├── Day 1-2: P1 items (Analytics, Privacy Review, Progressive Disclosure)
├── Day 3:   End-to-end testing (создать тестового пользователя, пройти весь flow)
├── Day 4:   Bug fixes и полировка
└── Day 5:   Final check: все Blocking items = Ready → LAUNCH

Week 3 (Jul 28+):  Private Beta
├── Invite first 10 users (из 50 planned)
├── Monitor: health, errors, feedback
├── Daily: review feedback, fix critical issues
└── Week 4: Invite remaining 40 users
```

---

## Expected Impact

| Metric | Before Roadmap | After Roadmap | Change |
|--------|---------------|---------------|--------|
| Product Maturity | 3.7/10 | 6.5/10 | +2.8 |
| Blocking Items | 10 | 0 | -10 |
| TTFV | Infinity (no value) | < 3 мин | Functional |
| User Value | 2/10 | 7/10 | +5 |
| Onboarding | 1/10 | 6/10 | +5 |
| Commercial Readiness | 1/10 | 3/10 | +2 (no Stripe yet) |
| GTM Readiness | 3/10 | 6/10 | +3 |
