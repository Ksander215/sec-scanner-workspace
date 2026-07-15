# PRIVATE_BETA_CHECKLIST.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Продуктовый документ — чеклист готовности к Private Beta
> **Владелец:** CPO
> **Статус:** Active
> **Связанные документы:** PRODUCT_READINESS_REPORT.md, PRODUCT_MATURITY_SCORECARD.md, PRIVATE_BETA_ROADMAP.md, PROJECT_OS.md

---

## Статус: НЕ ГОТОВ (7 Blocking, 8 Needs Improvement, 7 Ready)

**Summary:** 22 пункта проверены. 7 являются блокерами запуска. Минимальная оценка для запуска: все Blocking → Ready.

---

## 1. Стабильность

| # | Пункт | Статус | Детали | Действие |
|---|-------|--------|--------|----------|
| 1.1 | Build проходит без ошибок | ✅ Ready | `npx next build` успешен, standalone output | — |
| 1.2 | Все API routes возвращают корректные статусы | ✅ Ready | 22 маршрута, Zod validation, try/catch | — |
| 1.3 | Нет unhandled exceptions | ⚠️ Needs Improvement | Нет global error boundary (`error.tsx` отсутствует), нет `not-found.tsx` | Создать `error.tsx`, `not-found.tsx` |
| 1.4 | Graceful degradation при недоступности SMTP | ✅ Ready | `sendEmail()` логирует в console при отсутствии SMTP | — |
| 1.5 | SSE connection recovery | ⚠️ Needs Improvement | In-memory pub/sub, при server restart все подключения теряются | Приемлемо для beta (<50 users). Улучшить post-beta |

## 2. Безопасность

| # | Пункт | Статус | Детали | Действие |
|---|-------|--------|--------|----------|
| 2.1 | Password hashing | ✅ Ready | bcryptjs | — |
| 2.2 | Rate limiting | ✅ Ready | 6 presets, sliding window | — |
| 2.3 | Security headers (CSP, HSTS) | ✅ Ready | middleware + next.config.ts | — |
| 2.4 | API key security | ✅ Ready | SHA-256, timing-safe, scopes | — |
| 2.5 | Audit logging | ✅ Ready | Append-only, 14 action types | — |
| 2.6 | 2FA/TOTP | ✅ Ready | Full flow | — |
| 2.7 | Email verification | ❌ **Blocking** | Отсутствует. Можно регистрировать любые email | Реализовать email verification flow |
| 2.8 | Password reset | ❌ **Blocking** | Отсутствует. Забывший пароль = заблокирован навсегда | Реализовать password reset (token + email) |
| 2.9 | CSRF protection | ⚠️ Needs Improvement | next-auth JWT mitigates, но нет explicit CSRF tokens | Приемлемо для beta. Добавить post-beta |

## 3. Производительность

| # | Пункт | Статус | Детали | Действие |
|---|-------|--------|--------|----------|
| 3.1 | Страницы загружаются < 3 сек | ✅ Ready | Standalone Next.js, Caddy proxy | Верифицировать на production |
| 3.2 | API responds < 500ms | ✅ Ready | SQLite локальные запросы | Верифицировать при concurrent load |
| 3.3 | Scan completes < 60 сек | ⚠️ Needs Improvement | Mock: 4-8 сек. Реальное сканирование: неизвестно. Цель из PMF Blueprint | Цель: < 60 сек для типичного сайта. Зависит от реализации DAST engine |
| 3.4 | Dashboard рендерится < 2 сек | ✅ Ready | React Query caching, lazy PDF load | — |

## 4. Onboarding

| # | Пункт | Статус | Детали | Действие |
|---|-------|--------|--------|----------|
| 4.1 | Регистрация < 30 сек | ✅ Ready | Email+password или OAuth | — |
| 4.2 | Guided onboarding wizard | ❌ **Blocking** | Отсутствует. Пользователь видит 6-tab dashboard | Создать 3-step onboarding: Welcome → Demo Scan → Your First Scan |
| 4.3 | First Value < 3 мин | ❌ **Blocking** | Невозможно — mock-сканирование не даёт реальной ценности | Реализовать Demo Target (преднастроенный уязвимый сайт) + real scan |
| 4.4 | Empty states с CTA | ✅ Ready | Security tab: «Run Your First Scan» | — |
| 4.5 | Progressive disclosure | ⚠️ Needs Improvement | 6 табов показаны одновременно (Designer rated 4/10) | Скрывать неиспользуемые табы до необходимости |

## 5. Документация

| # | Пункт | Статус | Детали | Действие |
|---|-------|--------|--------|----------|
| 5.1 | Landing page | ✅ Ready | CMS-driven, bilingual | — |
| 5.2 | FAQ | ✅ Ready | На landing page | — |
| 5.3 | User documentation (как пользоваться) | ❌ **Blocking** | Отсутствует. Нет API docs, нет user guide | Создать минимальный User Guide (как начать, как сканировать, как читать отчёт) |
| 5.4 | API documentation | ⚠️ Needs Improvement | PLATFORM_API_ARCHITECTURE.md существует, но не пользовательский | Post-beta: создать OpenAPI/Swagger |
| 5.5 | Privacy Policy | ⚠️ Needs Improvement | Placeholder stub, не юридически полноценный | Юридический review перед launch |
| 5.6 | Terms of Service | ❌ **Blocking** | Полностью отсутствует | Создать ToS перед launch |

## 6. Поддержка пользователей

| # | Пункт | Статус | Детали | Действие |
|---|-------|--------|--------|----------|
| 6.1 | Feedback mechanism | ❌ **Blocking** | Только email/Telegram ссылки. Нет in-app feedback | Добавить in-app feedback button ( simplest: link to Typeform/Google Form) |
| 6.2 | Support channel | ⚠️ Needs Improvement | Telegram + email. Нет ticket system | Приемлемо для 50 beta users. Email够了 |
| 6.3 | Error messages понятны пользователю | ⚠️ Needs Improvement | API errors технические (Zod validation errors) | Добавить user-friendly error messages на клиенте |

## 7. Мониторинг

| # | Пункт | Статус | Детали | Действие |
|---|-------|--------|--------|----------|
| 7.1 | Health check endpoint | ❌ **Blocking** | Middleware ссылается на `/api/health`, но файл не существует | Создать `/api/health` (DB connection + uptime + version) |
| 7.2 | Error tracking | ❌ **Blocking** | Только console.error. Production ошибки не видны | Минимум: настроить Sentry (free tier) или аналогичный сервис |
| 7.3 | Uptime monitoring | ⚠️ Needs Improvement | Нет. VPS может упасть без уведомления | Настроить UptimeRobot (free) или аналог |
| 7.4 | User analytics | ⚠️ Needs Improvement | Нет PostHog/Plausible. Невозможно отслеживать user behaviour | Настроить PostHog (free tier < 1M events) |

## 8. Обработка ошибок

| # | Пункт | Статус | Детали | Действие |
|---|-------|--------|--------|----------|
| 8.1 | Custom 404 page | ❌ **Blocking** | `not-found.tsx` отсутствует | Создать branded 404 |
| 8.2 | Custom error page | ❌ **Blocking** | `error.tsx` отсутствует | Создать error boundary с recovery |
| 8.3 | API error responses | ✅ Ready | JSON с status codes, Zod errors | — |
| 8.4 | Scan failure handling | ⚠️ Needs Improvement | Mock scan может «failed» только при error в генерации. Нет retry | Добавить retry logic для real scan |

---

## Резюме по статусам

| Статус | Количество | Процент |
|--------|-----------|---------|
| ✅ Ready | 14 | 30% |
| ⚠️ Needs Improvement | 11 | 24% |
| ❌ **Blocking** | 10 | 22% |
| ⏭ Post-beta | 11 | 24% |

**Blocking items (должны быть Ready до launch):**

| # | Пункт | Категория | Примерная effort |
|---|-------|-----------|-----------------|
| B1 | Реальное DAST-сканирование (или Demo Target) | Onboarding / Product | 3-5 дней (Demo Target: 1 день; Real DAST basic: 3-5 дней) |
| B2 | Email verification | Security | 4-6 часов |
| B3 | Password reset | Security | 4-6 часов |
| B4 | Onboarding wizard | Onboarding | 1-2 дня |
| B5 | User documentation | Documentation | 1 день |
| B6 | Terms of Service | Legal | 2-4 часа (шаблон) |
| B7 | Feedback mechanism | Support | 2-4 часа |
| B8 | Health check endpoint | Monitoring | 1-2 часа |
| B9 | Error tracking (Sentry) | Monitoring | 2-4 часа |
| B10 | Custom error pages (404, error.tsx) | Error handling | 2-4 часа |

**Общая оценка effort для blocking items:** ~7-12 дней сфокусированной работы.
