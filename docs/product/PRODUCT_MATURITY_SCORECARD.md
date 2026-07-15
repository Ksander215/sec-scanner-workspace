# PRODUCT_MATURITY_SCORECARD.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Продуктовый документ — оценка зрелости продукта
> **Владелец:** CPO
> **Статус:** Active
> **Связанные документы:** PRODUCT_READINESS_REPORT.md, PRIVATE_BETA_CHECKLIST.md, PRIVATE_BETA_ROADMAP.md

---

## Итоговая оценка: 3.7 / 10

| # | Dimension | Score | Status | Trend |
|---|-----------|-------|--------|-------|
| 1 | Product Vision | **8** | ✅ Strong | Stable |
| 2 | User Value | **2** | ❌ Critical | Blocked (mock scan) |
| 3 | UX | **3** | ❌ Weak | Needs work |
| 4 | Onboarding | **1** | ❌ Critical | Not started |
| 5 | Technical Readiness | **6** | ⚠️ Good infra, no product | Stale |
| 6 | Security | **7** | ✅ Good | Stable |
| 7 | Performance | **5** | ⚠️ Adequate | Unknown (no load test) |
| 8 | Scalability | **3** | ❌ Limited | Known limitation (SQLite) |
| 9 | Commercial Readiness | **1** | ❌ Critical | Not started |
| 10 | Go-To-Market Readiness | **3** | ❌ Weak | Partial |
| 11 | Documentation | **6** | ⚠️ Good internal, no user-facing | Improving |
| 12 | **Overall Product Maturity** | **3.7** | ❌ Not ready for beta | +0.0 (no change from TASK-012) |

---

## Детальная оценка

### 1. Product Vision — 8/10

**Сильные стороны:**
- Чёткое позиционирование: «DAST, который объясняет, а не просто находит».
- Vision и Mission определены в PROJECT_OS.md и проверены через 8-рольный анализ.
- PMF Blueprint содержит 3-уровневую ценность (функциональная/практическая/эмоциональная).
- USP уникален на рынке: Deterministic Explainability + Security Score + ROI-приоритизация за $29/мес.
- 5 сегментов ICP с конкретными personas (Alex CTO, Maria VP Eng, James Solo Dev).

**Слабые стороны:**
- Vision не валидирован реальными пользователями (pre-revenue, no feedback).
- Рынок движется к ASPM — «DAST» может стать узким позиционированием.

**Рекомендации:** Добавить «Security Posture Management» в messaging. Валидировать vision через 5-10 user interviews перед launch.

### 2. User Value — 2/10

**Сильные стороны:**
- Доменные модули (Security State Engine + Explainability Layer) — уникальны и полностью функциональны.
- Виджеты дашборда (Score Gauge, Executive Summary, Recommendations) — отлично спроектированы.
- PDF-отчёт — профессионального качества.

**Критическая проблема:**
- **Реальное сканирование не реализовано.** Все результаты — mock-данные. Пользователь не получает никакой ценности.
- Без реального сканирования доменные модули бесполезны — они не получают реальных входных данных.
- Mock-данные разрушают доверие: пользователь, проверивший `example.com`, обнаружит ложные уязвимости.

**Рекомендации:** P0: Реализовать Demo Target (1 день) + basic real DAST engine (3-5 дней). Без этого — запуск бессмысленен.

### 3. UX — 3/10

**Сильные стороны:**
- shadcn/ui — современный, доступный UI kit.
- i18n (EN/RU) — 200+ ключей.
- Dark/Light/System theme toggle.
- Security tab виджеты — уникальны и информативны.
- PDF-отчёт — отличный output.

**Слабые стороны:**
- 6-tab dashboard для first-time user = cognitive overload (PMF Blueprint §10.4: Designer rated 4/10).
- Нет progressive disclosure — вся информация показана сразу.
- Demo-данные на Security tab создают ложные ожидания.
- Нет responsive optimization для мобильных устройств (не критично для DAST, но важно для «показать инвестору»).
- Billing tab — disabled кнопка, бесполезна в текущем состоянии.

**Рекомендации:** P0: Onboarding wizard с progressive disclosure. P1: Убрать demo-данные из Security tab для новых пользователей (показывать только после real scan).

### 4. Onboarding — 1/10

**Сильные стороны:**
- Быстрая регистрация (< 30 сек).
- OAuth (Google, GitHub) — если env vars настроены.
- Empty state на Security tab с CTA «Run Your First Scan».

**Критические проблемы:**
- Нет onboarding wizard — пользователь не знает, что делать после регистрации.
- Нет welcome email.
- Нет guide/tutorial/tooltip.
- Нет product tour.
- Первый экран (6-tab dashboard) пугает, а не помогает.

**Рекомендации:** P0: 3-step onboarding: (1) Welcome + «Давайте покажем, как это работает», (2) Demo Scan (1 клик, преднастроенный target), (3) «Готово! Теперь сканируйте свой сайт».

### 5. Technical Readiness — 6/10

**Сильные стороны:**
- Clean Architecture: Domain Layer — 9/10 (pure functions, 165 tests, zero framework deps).
- 22 API routes, все функциональны.
- 10 Prisma models, полная схема данных.
- Security infrastructure: API keys, rate limiting, audit log, 2FA.
- Build system: standalone output, Caddy proxy.

**Слабые стороны:**
- Application Layer не реализован (6 architecture leaks).
- Нет реального DAST engine.
- Нет health check endpoint.
- CI/CD: только build scripts, нет pipeline.
- SQLite: ограничение для >50 concurrent users.

**Оценка:** Инфраструктура отличная для pre-revenue. Но «техническая готовность» без «продуктовой готовности» = 6/10, не 8/10.

### 6. Security — 7/10

**Сильные стороны:**
- Password hashing (bcryptjs), generic error messages.
- Rate limiting (6 presets, sliding window).
- Security headers (CSP, HSTS preload, X-Frame-Options, X-Content-Type-Options).
- API keys: SHA-256, timing-safe, scopes, expiry, revocation.
- Audit logging: append-only, 14 action types.
- 2FA/TOTP: full flow.
- Zod validation на всех mutation endpoints.
- Anti-abuse (honeypot, disposable email blocklist, consent).

**Слабые стороны:**
- Нет email verification (можно регистрировать любые email).
- Нет password reset.
- SQLite (не FIPS-compliant, нет encryption at rest).
- In-memory rate limiting (теряется при restart).
- In-memory SSE (теряется при restart).

**Рекомендации:** P0: Email verification + password reset. P1: Persistent rate limiting (SQLite-backed).

### 7. Performance — 5/10

**Сильные стороны:**
- Standalone Next.js output, Caddy reverse proxy.
- Lazy PDF loading.
- React Query caching.

**Слабые стороны:**
- Нет load testing (неизвестна реальная производительность).
- Нет caching стратегии.
- Нет CDN.
- Нет image optimization.
- SQLite: неизвестно поведение при 50+ concurrent writes.

**Рекомендации:** P1: Load test с 50 concurrent users. P2: Caching strategy.

### 8. Scalability — 3/10

**Текущая:** SQLite достаточен для <100 concurrent users.
**Path to scale:** Platform Layer (Ports & Adapters) → PostgreSQL migration (M6-12).
**Блокеры:** In-memory rate limiting, in-memory SSE — всё теряется при restart и не масштабируется горизонтально.

**Рекомендации:** Приемлемо для Private Beta (50 users). PostgreSQL migration — обязательна перед public launch.

### 9. Commercial Readiness — 1/10

**Проблемы:**
- Нет Stripe интеграции — невозможно принимать платежи.
- Нет checkout flow.
- Нет subscription management.
- Нет trial mechanism.
- Pricing на landing ($49) не совпадает с стратегией ($29).

**Рекомендации:** Stripe НЕ нужен для Private Beta (бесплатный доступ). Нужен для Public Launch (M2). Но цена на landing должна быть исправлена немедленно.

### 10. Go-To-Market Readiness — 3/10

**Есть:** Landing page, FAQ, pricing display, i18n, lead magnet (OWASP PDF).
**Нет:** Terms of Service, User documentation, Feedback mechanism, Analytics, Demo, Social proof.

**Рекомендации:** P0: ToS, User Guide, Feedback button, Analytics (PostHog). P1: Demo Target на landing page.

### 11. Documentation — 6/10

**Внутренняя документация:** 12+ активных .md документов, Project OS, AI Operating Model, Decision Framework, PMF Blueprint, Platform API Architecture — отличная база для команды.
**Пользовательская документация:** Отсутствует. Нет API docs, нет user guide, нет getting started.
**Legal:** Privacy Policy — stub. Terms of Service — отсутствует.

**Рекомендации:** P0: User Guide (как начать, как сканировать, как читать отчёт). P0: ToS. P1: API documentation (OpenAPI).

---

## Maturity Trajectory

```
Current (Jul 2026)     Post-Roadmap (Aug 2026)    After Beta (Oct 2026)
     3.7/10                    6.5/10                       7.5/10

     ████░░░░░░                 ████████░░                   █████████░
     Not ready                 Ready for beta               Ready for public
```

**Что нужно для 6.5/10:** Реализовать Demo Target + basic DAST, onboarding wizard, email verification, password reset, ToS, User Guide, health check, error pages, feedback button, analytics.

**Что нужно для 7.5/10:** Private Beta feedback incorporated, Stripe, real DAST accuracy, onboarding optimisation, retention mechanisms.
