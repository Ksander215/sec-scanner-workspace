> **Superseded by:** [PLATFORM_AUDIT.md](../PLATFORM_AUDIT.md)
> **Archived reason:** v1 architecture audit, superseded by deeper Platform Audit
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# ARCHITECTURE_AUDIT.md — Sec Scanner

> **Дата аудита:** 2026-07-14  
> **Версия проекта:** 0.2.0  
> **Аудитор:** AI Code Review

---

## 1. Общая оценка архитектуры

Sec Scanner — это SaaS-приложение для непрерывного DAST-сканирования (Dynamic Application Security Testing), построенное на стеке Next.js 16 (App Router) + Prisma + SQLite. Приложение реализует SPA-подход с клиентской маршрутизацией внутри единственной страницы `/`, что нетипично для Next.js и создаёт ряд архитектурных компромиссов.

**Общая оценка: 6.5/10** — функционально работающий MVP с правильными паттернами в отдельных модулях (аутентификация, API-ключи, аудит-лог), но с рядом системных проблем, которые ограничивают масштабируемость и поддерживаемость.

---

## 2. Архитектурные решения и их оценка

### 2.1 SPA внутри Next.js App Router

**Текущее решение:** Весь UI рендерится на маршруте `/` через условный рендеринг в `page.tsx` — клиентский компонент, который переключает `Landing`, `Dashboard`, `Settings`, `AdminPanel` на основе состояния `useSession()`.

**Проблемы:**
- Несоответствие парадигме App Router — Next.js предлагает файловую маршрутизацию, но она полностью игнорируется
- Единый клиентский бандл содержит весь код всех экранов — Landing, Dashboard, Settings, Admin — даже если пользователь видит только один
- Отсутствие реальных маршрутов затрудняет SSR/SSG для лендинга, снижает SEO
- Нет глубинных ссылок — нельзя поделиться ссылкой на конкретную вкладку (например, `/dashboard/scans`)
- Браузерная навигация (кнопка «Назад») не работает для переключения между экранами

**Рекомендация:** Перейти на файловую маршрутизацию App Router: `/` (лендинг), `/dashboard` (приватный layout с сайдбаром), `/dashboard/scans`, `/dashboard/teams`, `/dashboard/keys`, `/dashboard/billing`, `/settings/*`, `/admin/*`. Это даст SSR для публичных страниц, code-splitting, глубинные ссылки и правильное использование Next.js.

### 2.2 База данных: SQLite

**Текущее решение:** SQLite через Prisma ORM, файловая база данных.

**Оценка:** Для одноинстансного VPS-развертывания — разумный выбор. SQLite обеспечивает нулевую задержку на локальные запросы, не требует отдельного процесса и упрощает бэкапы. Однако это создаёт жёсткое ограничение на масштабирование — невозможно горизонтально масштабировать, нет встроенной репликации, есть риск блокировок при конкурентной записи.

**Рекомендация:** Оставить SQLite для текущего этапа, но абстрагировать доступ к данным через Prisma так, чтобы миграция на PostgreSQL (при необходимости) требовала только изменения `datasource` в schema.prisma и запуска миграций. Убедиться, что код не использует SQLite-специфичные функции (JSON-операторы, пользовательские функции).

### 2.3 Аутентификация: next-auth v4 + JWT

**Текущее решение:** next-auth v4 со стратегией JWT (не database sessions). Поддержка credentials, Google OAuth, GitHub OAuth. 2FA через TOTP (otplib). API-ключи с scoping.

**Оценка (8/10):** Один из наиболее качественно реализованных модулей. Правильные паттерны: anti-enumeration при логине, timing-safe сравнение API-ключей, scoped-доступ, race-condition-safe включение 2FA через `updateMany`.

**Проблемы:**
- Fallback `NEXTAUTH_SECRET` — `"dev-secret-change-in-production"` хардкоджен в `auth.ts`. Если переменная окружения не задана, используется небезопасный секрет
- TOTP-секрет хранится в открытом виде (base32 plaintext) — требуется AES-GCM шифрование
- next-auth v4 уже не получает новых фич — рекомендуется миграция на Auth.js v5

### 2.4 Структура API-роутов

**Текущее решение:** 30 API-endpoint'ов в структуре `src/app/api/`. Каждый route.ts файл содержит handler с ручной проверкой авторизации через `requireSession()`, `requireApiKey()`, `requireAuth()`.

**Оценка (7/10):** Структура понятна, RESTful. Есть чёткое разделение публичных и приватных роутов через middleware whitelist.

**Проблемы:**
- Middleware дублирует авторизацию — проверяет JWT/API-key, а затем каждый handler снова вызывает `requireAuth()`. Двойная проверка создаёт избыточность
- Нет централизованной обработки ошибок — каждый route.ts ловит ошибки по-своему
- Нет OpenAPI/Swagger-документации — API описан только неформально
- Роуты не используют Next.js Route Handlers полностью — нет streaming response (кроме SSE), нет revalidation

### 2.5 In-memory State: Rate Limiter + SSE Hub

**Текущее решение:** Sliding-window rate limiter и SSE-хаб хранятся в `globalThis` для выживания при HMR.

**Проблемы:** Не работают при multi-instance развертывании. Не сохраняются между перезапусками сервера. SSE-хаб привязан к одному процессу — если запрос попадает на другой инстанс, события не дойдут.

**Рекомендация:** Для production внедрить Redis как shared store для rate limiter и pub/sub для SSE. Для текущего этапа — документировать ограничение.

### 2.6 Состояние на клиенте

**Текущее решение:** TanStack React Query для серверного состояния, React useState для UI-состояния, next-themes для темы, кастомный I18nProvider для интернационализации.

**Оценка (7/10):** React Query используется корректно — staleTime 30s, retry: 1, инвалидация при SSE-событиях. SSE singleton с fallback на polling — надёжный паттерн.

**Проблемы:**
- Zustand указан в dependencies, но нигде не используется — мёртвая зависимость
- `useApiData` hook дублирует функциональность React Query — вероятно, legacy-код
- Нет optimistic updates в React Query мутациях — UI ждёт ответа сервера

### 2.7 PDF-генерация отчётов

**Текущее решение:** `@react-pdf/renderer` для генерации 6-страничных A4-отчётов (обложка, executive summary, детальные находки, приложение).

**Проблемы:**
- Шрифты хардкоджены на пути `/usr/share/fonts/truetype/dejavu/` — не будет работать в Alpine Docker или других окружениях без этих шрифтов
- PDF-рендерер лениво импортируется внутри route handler — это правильно для уменьшения бандла, но создаёт задержку при первом запросе
- Нет кэширования сгенерированных PDF — повторный запрос генерирует заново

---

## 3. Слои архитектуры

### 3.1 Presentation Layer (Компоненты)

```
page.tsx (SPA Router)
├── Landing (public)
│   ├── Hero, Features, Pricing, FAQ, Audience, UseCases
│   └── LeadMagnetForm
├── Dashboard (auth required)
│   ├── ScanTab, HistoryTab, ScanDetailModal
│   ├── TeamsTab, ApiKeysTab, BillingTab
│   └── hooks.ts (useScans, useScanDetail, useStartScan)
├── Settings (auth required)
│   ├── ProfileTab, AppearanceTab
│   ├── NotificationsTab, SecurityTab
├── AdminPanel (admin required)
│   ├── ContentEditor, ProductsManager, AuditLog
└── UI Layer (50+ shadcn/ui primitives)
```

**Оценка:** Компоненты логически сгруппированы, разделение на tabs понятно. shadcn/ui даёт консистентный визуальный стиль. Однако `Dashboard` — один большой компонент с 5 табами и множеством состояний, что делает его трудным для тестирования и поддержки.

### 3.2 API Layer (Route Handlers)

30 endpoint'ов, организованных по ресурсам (auth, scans, teams, keys, admin, user, 2fa). Каждый handler реализует авторизацию, валидацию, бизнес-логику и ответ — нет разделения на слои.

### 3.3 Data Access Layer (Prisma)

Прямой доступ к Prisma Client из route handlers. Нет repository-паттерна или service-слоя. Для текущего размера проекта это допустимо, но при росте усложнит тестирование.

### 3.4 Infrastructure Layer

- **БД:** SQLite (Prisma)
- **Почта:** Nodemailer (SMTP, lazy init)
- **Кэш:** In-memory (rate limiter), React Query cache
- **Reverse Proxy:** Caddy (порт 81)
- **Runtime:** Bun (dev) / Node.js (prod)

---

## 4. Безопасность

### 4.1 Положительные аспекты

- bcryptjs с 10 раундами для хеширования паролей
- API-ключи хранятся как SHA-256 хеш, timing-safe сравнение
- Anti-enumeration при регистрации (generic 409) и логине (generic error)
- Rate limiting на всех чувствительных endpoint'ах
- Audit log — append-only, never throws
- CSP header (хотя и с `unsafe-inline`/`unsafe-eval`)
- HSTS с preload, 1 год
- Admin-guard с rate limiting и audit-логированием неудачных попыток

### 4.2 Критические проблемы безопасности

| # | Проблема | Серьёзность | Рекомендация |
|---|----------|-------------|--------------|
| 1 | Fallback NEXTAUTH_SECRET хардкоджен | 🔴 Critical | Удалить fallback, приложение должно падать при отсутствии секрета |
| 2 | TOTP-секрет в plaintext | 🔴 Critical | AES-GCM шифрование с ключом из env |
| 3 | CSP содержит `unsafe-eval` и `unsafe-inline` | 🔴 High | Убрать в production (нужны nonce-based styles) |
| 4 | Нет CSRF-защиты кроме SameSite cookies | 🟡 Medium | Добавить CSRF-token для POST-запросов |
| 5 | Demo-credentials видны всем посетителям | 🟡 Medium | Убрать в production или показать только при `NODE_ENV=development` |
| 6 | Нет password complexity enforcement | 🟡 Medium | Минимум 1 uppercase, 1 digit, 1 special |
| 7 | Нет подтверждения пароля при регистрации | 🟡 Medium | Добавить поле "confirm password" |
| 8 | `connect-src 'self'` блокирует внешние изображения | 🟢 Low | Добавить нужные домены в connect-src |
| 9 | Lead magnet хранит PII в audit log | 🟢 Low | Создать отдельную Lead model |

---

## 5. Производительность

### 5.1 Положительные аспекты

- React Query с 30s staleTime снижает количество запросов
- SSE для real-time обновлений вместо polling
- Lazy-load PDF renderer
- `output: "standalone"` для оптимизированного production-билда
- Кэширование публичных endpoints (content, products) на 60s

### 5.2 Проблемы производительности

| # | Проблема | Влияние |
|---|----------|---------|
| 1 | Единый бандл для всех экранов (SPA на `/`) | Увеличенный JS payload для лендинга |
| 2 | Нет code-splitting между Landing/Dashboard/Settings | Медленная начальная загрузка |
| 3 | 50+ shadcn/ui компонентов в бандле | Многие не используются на каждом экране |
| 4 | PDF генерируется синхронно на каждый запрос | Блокирует worker при параллельных запросах |
| 5 | Нет pagination для списка сканов | `prisma.scan.findMany(take: 50)` без курсора |

---

## 6. Тестируемость

### 6.1 E2E тесты (Playwright)

8 spec-файлов покрывают: auth, scan, marketing, admin, 2fa, api-keys+teams, i18n. Сериальный запуск (1 worker) из-за shared DB state. Хелперы для reset rate limits и localStorage.

### 6.2 Проблемы тестирования

- Нет unit-тестов для бизнес-логики (dast.ts, rate-limit.ts, api-keys.ts, totp.ts)
- Нет integration-тестов для API-роутов
- E2E тесты зависят от внешнего dev-сервера (не self-contained)
- `resetRateLimits()` хак для обхода in-memory state между тестами
- Нет тестов для PDF-генерации (есть отдельный Python-скрипт)
- ESLint полностью отключён — нет статического анализа

---

## 7. Зависимости

### 7.1 Мёртвые зависимости (не используются в коде)

| Пакет | Версия | Размер (est.) |
|-------|--------|---------------|
| `zustand` | 5.0.6 | ~3 KB |
| `@dnd-kit/core` | 6.3.1 | ~15 KB |
| `@dnd-kit/sortable` | 10.0.0 | ~8 KB |
| `@dnd-kit/utilities` | 3.2.2 | ~3 KB |
| `next-intl` | 4.3.4 | ~50 KB |
| `sharp` | 0.34.3 | ~2 MB (native) |
| `z-ai-web-dev-sdk` | 0.0.18 | ~? |

**Итого:** ~2+ MB лишнего веса в node_modules и потенциально в production-бандле.

### 7.2 Legacy-зависимости

| Пакет | Проблема | Рекомендация |
|-------|----------|--------------|
| `next-auth` v4 | Больше не развивается, рекомендуется Auth.js v5 | Планировать миграцию |
| `otplib` v13 | Работает, но можно заменить на `"otpauth"` для меньшего размера | Низкий приоритет |
| `uuid` | Не используется в import — Prisma генерирует CUID | Удалить |

---

## 8. Конфигурация и DevOps

### 8.1 Проблемные настройки

| Файл | Настройка | Проблема |
|------|-----------|----------|
| `next.config.ts` | `typescript.ignoreBuildErrors: true` | TS-ошибки не ловятся при сборке |
| `next.config.ts` | `reactStrictMode: false` | Нет двойного рендера в dev |
| `eslint.config.mjs` | Все правила `"off"` | ESLint не работает |
| `tsconfig.json` | `noImplicitAny: false` | Снижена типобезопасность |
| `package.json` | name: `"nextjs_tailwind_shadcn_ts"` | Не отражает название проекта |

### 8.2 Деплоймент

- **Caddy** как reverse proxy (порт 81) с динамическим портом через `?XTransformPort=`
- **Bun** для dev, **Node.js** для production
- **Standalone output** — правильный выбор для VPS
- `.zscripts/` — кастомные скрипты для dev/build/start

**Проблема:** Нет Dockerfile, нет CI/CD pipeline, нет health-check endpoint (есть только `/api` → "Hello, world!").

---

## 9. Резюме и приоритеты

### Что сделано хорошо ✅

1. **Аутентификация** — надёжная реализация с 2FA, API-ключами, OAuth
2. **API-дизайн** — чистые RESTful endpoint'ы с правильными HTTP-методами
3. **Audit log** — append-only, fire-and-forget
4. **SSE для real-time** — правильный паттерн с fallback на polling
5. **Team collaboration** — роли, инвайты, scoped-доступ
6. **i18n** — двуязычная поддержка из коробки

### Критические направления улучшения 🔴

1. Убрать SPA-антипаттерн → файловая маршрутизация App Router
2. Убрать fallback NEXTAUTH_SECRET
3. Зашифровать TOTP-секрет
4. Удалить `unsafe-eval`/`unsafe-inline` из CSP в production
5. Включить TypeScript checking и ESLint

### Средние приоритеты 🟡

6. Удалить мёртвые зависимости
7. Добавить unit/integration тесты
8. Внедрить CSRF-защиту
9. Добавить password complexity enforcement
10. Pagination для списка сканов

### Низкие приоритеты 🟢

11. Миграция на Auth.js v5
12. Redis для rate limiter и SSE
13. Миграция на PostgreSQL
14. Кэширование PDF-отчётов
15. Dockerfile + CI/CD