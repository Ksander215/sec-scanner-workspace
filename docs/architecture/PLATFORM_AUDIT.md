# PLATFORM_AUDIT.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Архитектурный аудит (без изменения кода)
> **Зависит от:** Исходный код проекта (TASK-001 → TASK-009)

---

## 1. Executive Summary

Sec Scanner представляет собой DAST SaaS-платформу на стеке Next.js 16 + React 19 + Prisma 6 + SQLite, развиваемую через серию архитектурных спринтов (TASK-001 → TASK-009).

**Главная находка аудита:** Проект имеет **чистый и правильно спроектированный Domain Layer** (Security State Engine, Explainability Layer), но **отсутствует Application Layer** — все вызовы доменных модулей напрямую встроены в API routes и React-компоненты. Это ключевое архитектурное отверстие, которое не позволит подключить новые клиенты (Telegram, API, CLI, AI) без дублирования логики.

**Оценка архитектурной зрелости: 6.5/10**

| Аспект | Оценка | Комментарий |
|--------|--------|-------------|
| Domain Layer | **9/10** | Чистые функции, нулевая связка, extension points, 165 тестов |
| Application Layer | **1/10** | Отсутствует. Бизнес-логика распределена по API routes |
| Infrastructure Layer | **6/10** | Prisma, SSE, email, rate-limit — работает, но не абстрагировано |
| Presentation Layer | **5/10** | Компоненты завязаны на конкретные данные, demo-adapter — workaround |
| Security | **7/10** | next-auth, 2FA, API keys, rate-limit, audit log — крепкий фундамент |
| Observability | **2/10** | console.error + audit log. Нет structured logging, metrics, tracing |

---

## 2. Текущая архитектура — обзор слоёв

### 2.1 Фактическая структура (на момент аудита)

```
src/
├── app/
│   ├── api/                    ← API Routes (Next.js Route Handlers)
│   │   ├── scans/route.ts      ← Бизнес-логика сканирования ВНУТРИ route handler
│   │   ├── scans/[id]/route.ts
│   │   ├── scans/[id]/pdf/route.ts
│   │   ├── scans/events/route.ts
│   │   ├── keys/route.ts
│   │   ├── teams/route.ts
│   │   ├── user/route.ts
│   │   └── auth/...
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── dashboard/              ← React UI компоненты
│   │   ├── dashboard.tsx
│   │   ├── scan-tab.tsx
│   │   ├── history-tab.tsx
│   │   └── ...
│   ├── security-dashboard/
│   │   ├── security-tab.tsx    ← Потребляет domain напрямую
│   │   ├── security-widgets.tsx
│   │   └── demo-adapter.ts     ← Workaround: маппинг domain → UI
│   └── ui/                     ← shadcn/ui (32 компонента)
├── domain/                     ← ★ ЧИСТЫЙ DOMAIN LAYER ★
│   ├── security-state/         ← 6 файлов + 5 тестов (82 теста)
│   │   ├── types.ts
│   │   ├── score.ts
│   │   ├── risk.ts
│   │   ├── trend.ts
│   │   ├── confidence.ts
│   │   ├── engine.ts
│   │   └── index.ts
│   └── explainability/         ← 8 файлов + 5 тестов (83 теста)
│       ├── types.ts
│       ├── change-analysis.ts
│       ├── priorities.ts
│       ├── recommendation-engine.ts
│       ├── templates.ts
│       ├── explanation-builder.ts
│       ├── explanation-engine.ts
│       └── index.ts
├── lib/                        ← ИНФРАСТРУКТУРНЫЕ МОДУЛИ
│   ├── db.ts                   ← Prisma singleton
│   ├── auth.ts                 ← next-auth configuration (312 LOC)
│   ├── auth-server.ts          ← requireSession/requireApiKey/requireAuth
│   ├── rate-limit.ts           ← In-memory sliding window
│   ├── audit.ts                ← Audit log (Prisma-зависимый)
│   ├── api-keys.ts             ← Key generation/verification
│   ├── api-key-scopes.ts       ← Scope definitions
│   ├── dast.ts                 ← Mock DAST engine (300 LOC)
│   ├── sse.ts                  ← Server-Sent Events (in-memory)
│   ├── email.ts                ← Nodemailer wrapper
│   ├── crypto.ts               ← bcrypt helpers
│   ├── totp.ts                 ← 2FA TOTP
│   ├── teams.ts                ← Team business logic
│   ├── admin-guard.ts          ← Admin role check
│   ├── i18n.ts                 ← Internationalization
│   └── utils.ts                ← cn() and other utilities
├── hooks/                      ← React hooks
├── types/                      ← TypeScript type augmentations
└── middleware.ts               ← Next.js middleware (auth + security headers)
```

### 2.2 Отсутствующий Application Layer

В Clean Architecture между Domain и Infrastructure/Presentation должен находиться **Application Layer** (Use Cases / Application Services). Этот слой:

- Принимает запросы от любого клиента (Web, API, Telegram)
- Собирает данные через порты (интерфейсы)
- Вызывает Domain Layer
- Возвращает результат клиенту

**В текущем проекте этот слой отсутствует.** Вместо него:

```
Ожидаемое:
  API Route → Application Service → Domain Module → Result

Фактическое:
  API Route → Prisma (напрямую) → Domain Module (иногда) → Response
  UI Component → demo-adapter.ts → Domain Module (напрямую)
```

---

## 3. Детальный анализ по слоям

### 3.1 Domain Layer — СИЛЬНАЯ СТОРОНА

**Файлы:** `src/domain/security-state/*`, `src/domain/explainability/*`

**Что сделано правильно:**

1. **Нулевая связка с фреймворками.** Domain модули не импортируют Next.js, React, Prisma, или любые внешние зависимости. Все данные передаются через параметры. Это означает, что domain можно использовать в любом окружении: Node.js server, browser, Telegram bot, CLI, test.

2. **Чистые функции.** Все вычисления — синхронные, детерминированные, без side effects. `SecurityStateEngine.compute(input)` всегда возвращает один и тот же результат для одного и того же input. Это делает тестирование тривиальным (165 тестов, 0 failures).

3. **Extension Points.** `ScoreStrategy`, `TrendStrategy`, `RecommendationStrategy`, `SummaryStrategy` — интерфейсы для будущей кастомизации (AI-based scoring, compliance-weighted, i18n). Это не «заглушки», а реальные точки расширения, которые работают сегодня.

4. **Типы как контракт.** `SecurityStateInput`, `SecurityState`, `ExplanationInput`, `ExplanationResult` — стабильные интерфейсы, которые определяют, какие данные нужны и что возвращается. Любой клиент, предоставляющий данные в этом формате, получит корректный результат.

5. **Публичный API через index.ts.** Каждый модуль имеет единственную точку входа (`index.ts`), которая реэкспортирует только то, что нужно. Внутренние модули (score.ts, risk.ts, etc.) не импортируются напрямую извне.

**Риски Domain Layer:**

1. **FindingImpact — дублирование типов.** `FindingImpact` определён и в `security-state/types.ts`, и в `explainability/types.ts`. Это нарушает DRY и создаёт риск рассинхронизации. Нужно вынести в shared location.

2. **Нет Target entity в domain.** Текущая модель работает с `targetId: string` — непрозрачный идентификатор. Domain не знает, что такое «Target» (URL, настройки, расписание). Это ограничивает future development (scheduled scans, target-level configuration).

3. **Отсутствие Notification domain.** Уведомления (email, future Telegram) реализованы как инфраструктурный код в `lib/email.ts`. Нет domain модели, определяющей «что уведомлять, когда, кому, при каких условиях». Это означает, что логика уведомлений рассеяна по коду (email при scan complete в `lib/email.ts`, SSE push в `lib/sse.ts`, future Telegram — где?).

### 3.2 Application Layer — ОТСУТСТВУЕТ

**Это #1 архитектурная проблема.**

**Симптомы отсутствия Application Layer:**

1. **Бизнес-логика в API routes.** `POST /api/scans` в `scans/route.ts` (строки 24-79) делает всё: валидацию, rate limiting, создание записи в DB, запуск scan, аудит, уведомление. Это не controller — это application service, встроенный в route handler.

2. **Нет единой точки для «запустить скан».** Если Telegram Bot захочет запустить скан, ему придётся либо дублировать логику из `scans/route.ts`, либо вызывать этот endpoint по HTTP. Оба варианта нежелательны.

3. **Сбор данных для Domain — в UI.** `demo-adapter.ts` в `security-dashboard/` — это workaround, который показывает, что UI-компоненты вынуждены сами собирать данные для domain модулей. В реальном приложении это должен делать Application Service.

4. **Уведомления привязаны к конкретным точкам кода.** `notifyScanCompleted()` вызывается из `runMockScan()` в `scans/route.ts`. Если скан запускается из другого места (API, Telegram, CI/CD), уведомление не будет отправлено, если вызывающий код не знает про `notifyScanCompleted()`.

**Что нужно создать:**

```
src/application/
├── scan/
│   ├── start-scan.ts          ← Application Service: «запустить скан»
│   ├── get-scan.ts            ← Application Service: «получить данные скана»
│   └── types.ts               ← Request/Response DTOs для scan use cases
├── security-state/
│   ├── get-security-state.ts  ← Application Service: «вычислить Security State»
│   └── types.ts
├── explainability/
│   ├── get-explanation.ts     ← Application Service: «получить объяснение»
│   └── types.ts
└── shared/
    ├── ports.ts               ← Интерфейсы (Ports) для инфраструктуры
    └── errors.ts              ← Общая модель ошибок
```

### 3.3 Infrastructure Layer — РАБОТАЕТ, НО НЕ АБСТРАГИРОВАН

**Файлы:** `src/lib/db.ts`, `src/lib/email.ts`, `src/lib/sse.ts`, `src/lib/audit.ts`, `src/lib/rate-limit.ts`

**Сильные стороны:**

1. **Audit log** — append-only, non-throwing, с structured data. Хорошая практика.
2. **Rate limiting** — in-memory sliding window с cleanup. Достаточно для текущего single-instance деплоя.
3. **SSE** — правильный выбор для real-time updates (не WebSocket). Heartbeat, auto-cleanup dead connections.
4. **Email** — graceful degradation (если SMTP не настроен — логирует, не падает).
5. **API keys** — SHA-256 хранение, timing-safe comparison, scopes.

**Проблемы:**

1. **Прямая привязка к Prisma.** Все инфраструктурные модули импортируют `db` из `@/lib/db` и вызывают Prisma напрямую. Нет интерфейса (Port), через который Application Layer мог бы получать данные. Это означает:

   ```typescript
   // Текущее: API route → Prisma напрямую
   const scans = await db.scan.findMany({ where: { userId } });

   // Целевое: Application Service → Port → Adapter → Prisma
   const scans = await this.scanRepository.findByUserId(userId);
   ```

2. **SSE — in-memory only.** `globalThis` хак для Turbopack dev mode работает, но при multi-instance деплое (или просто при перезапуске) все подписки теряются. Для продакшена нужен Redis pub/sub.

3. **Rate limiting — in-memory only.** При multi-instance деплое каждый instance имеет свой счётчик. Нужен Redis-backed rate limiter.

4. **Email — завязан на конкретные use cases.** `notifyScanCompleted()` и `notifyTeamInvite()` — это не универсальная notification система, а конкретные функции для конкретных сценариев. Нет абстракции «отправить уведомление типа X пользователю Y».

### 3.4 Presentation Layer — ЗАВИСИТ ОТ КОНКРЕТНЫХ ДАННЫХ

**Файлы:** `src/components/dashboard/*`, `src/components/security-dashboard/*`

**Сильные стороны:**

1. **Security Dashboard** — использует реальные domain модули через `demo-adapter.ts`. Виджеты (ScoreGauge, RiskTrendCards, ExecutiveSummary, etc.) получают domain типы, не Prisma-объекты.
2. **shadcn/ui** — единый дизайн-система, 32 компонента, consistent look.
3. **i18n** — next-intl для локализации.

**Проблемы:**

1. **demo-adapter.ts — workaround, не архитектура.** Этот файл существует потому, что нет Application Layer, который бы предоставлял данные UI. Demo-адаптер создаёт моковые данные и передаёт их в domain. В реальном приложении это должен делать Application Service + Repository.

2. **React Query hooks напрямую вызывают API routes.** `useApiData()` и `useQuery()` в компонентах ходят в `/api/scans`, `/api/keys` и т.д. Если Telegram Bot нужен тот же список сканов — ему придётся дублировать эти запросы или вызывать HTTP API. Правильно: оба клиента должны вызывать один и тот же Application Service.

3. **Нет shared response типов.** API routes возвращают `{ data: ... }`, но тип `data` нигде не формализован. Frontend использует `as any` или inline типы. Это означает, что любой новый клиент должен заново вывести типы из кода.

### 3.5 Security Layer — КРЕПКИЙ ФУНДАМЕНТ, НО ЗАВЯЗАН НА WEB

**Файлы:** `src/lib/auth.ts`, `src/lib/auth-server.ts`, `src/middleware.ts`, `src/lib/crypto.ts`, `src/lib/totp.ts`

**Сильные стороны:**

1. **Dual auth** — session cookie (next-auth) + API key (Bearer token). `requireAuth()` поддерживает оба механизма.
2. **2FA** — TOTP с proper verification flow.
3. **API key security** — SHA-256 хранение, timing-safe comparison, scopes, expiry, revocation.
4. **Security headers** — CSP, HSTS, X-Frame-Options, Referrer-Policy в middleware.
5. **Rate limiting** — per IP (login, register, api), per user (scan create, pdf, admin).
6. **Audit log** — все security-sensitive действия логируются.

**Проблемы:**

1. **Auth привязан к Next.js.** `requireSession()` использует `getServerSession(authOptions)` — это next-auth API. Telegram Bot, CLI, Background Worker не могут использовать этот механизм. Им нужен отдельный auth flow.

2. **AuthResult содержит NextResponse.** `AuthResult.ok === false` возвращает `NextResponse` (Next.js тип). Это означает, что `requireAuth()` нельзя использовать вне Next.js API routes. Для Telegram Bot нужен auth, возвращающий domain-тип ошибки, а не HTTP response.

3. **Нет unified error model.** Ошибки возвращаются как `{ error: "string" }` — нет кодов ошибок, нет structured error response. Каждый API route формирует свой формат ошибки.

4. **RBAC — минимальный.** Только `role: "user" | "admin"`. Нет per-resource authorization (может ли пользователь X изменить скан Y?). Для API и multi-tenant это критично.

---

## 4. Узкие места

### 4.1 Отсутствие Repository Pattern

**Проблема:** Все данные доступны через Prisma напрямую. Нет интерфейса (Port), через который Application Layer мог бы получать данные.

**Влияние:**
- Telegram Bot не может получить данные без прямого доступа к Prisma (требует либо shared DB, либо HTTP API)
- Тестирование Application Services невозможно без реальной DB (нет mock-репозиториев)
- Миграция с SQLite на PostgreSQL потребует изменений в N местах вместо 1

### 4.2 Отсутствие Domain Events

**Проблема:** Нет системы событий. Сканирование завершается → нужно обновить Security State, отправить уведомление, записать в audit log, обновить SSE. Сейчас это жёстко закодировано в `runMockScan()`.

**Влияние:**
- Добавление нового обработчика (например, Telegram notification) требует изменения существующего кода
- Нет гарантии, что все side effects выполнены (если один упадёт, остальные продолжат?)
- Невозможно реализовать «replay» событий для восстановления состояния

### 4.3 Отсутствие Application Service Layer

**Проблема:** Бизнес-логика распределена по API routes, UI компонентам, и lib-модулям.

**Влияние:**
- Любой новый клиент (Telegram, CLI, AI) вынужден либо дублировать логику, либо вызывать HTTP API (что добавляет latency и coupling)
- Нет единого места для валидации, авторизации, и бизнес-правил
- Нет unit-тестирования бизнес-процессов (можно тестировать только domain функции, не полные use cases)

### 4.4 In-Memory State (SSE + Rate Limiting)

**Проблема:** SSE subscriptions и rate limit buckets хранятся в памяти процесса.

**Влияние:**
- При перезапуске все SSE-подписки теряются
- При multi-instance деплое каждый instance имеет своё состояние
- Rate limiting не работает корректно при multiple instances

---

## 5. Утечки инфраструктуры в Domain

### 5.1 Критические утечки (требуют исправления)

| # | Место | Утечка | Серьёзность |
|---|-------|--------|-------------|
| D1 | `explainability/types.ts` | `FindingImpact` дублирует тип из `security-state/types.ts` | Средняя |
| D2 | `security-state/types.ts:31` | `Finding.lastSeenAt: Date` — Domain зависит от JS Date (не问题 для текущего use case, но ограничивает перенос в другие среды) | Низкая |
| D3 | — | Domain не имеет Target concept — работает с `targetId: string` | Средняя |

### 5.2 Утечки между Application и Infrastructure

| # | Место | Утечка | Серьёзность |
|---|-------|--------|-------------|
| AI1 | `scans/route.ts:54-59` | API route создаёт Prisma record напрямую (создание scan = DB operation в controller) | Высокая |
| AI2 | `scans/route.ts:99-143` | `runMockScan()` — background функция, встроенная в route handler | Высокая |
| AI3 | `keys/route.ts:82-91` | API route создаёт API key (crypto + DB) напрямую | Средняя |
| AI4 | `auth-server.ts:82-85` | `requireApiKey()` вызывает Prisma напрямую | Средняя |
| AI5 | `email.ts:88-89` | `notifyScanCompleted()` вызывает Prisma для чтения user preferences | Средняя |
| AI6 | `audit.ts:28-42` | `audit()` вызывает Prisma напрямую | Низкая (acceptible для audit) |

### 5.3 Утечки между Presentation и Domain

| # | Место | Утечка | Серьёзность |
|---|-------|--------|-------------|
| PD1 | `security-dashboard/demo-adapter.ts` | UI компонент знает про структуру domain данных и создаёт моковые объекты | Средняя |
| PD2 | `security-dashboard/security-widgets.tsx:20-27` | Виджеты импортируют domain типы напрямую (правильно для чтения, но создает coupled dependency) | Низкая |

---

## 6. Компоненты, трудно переиспользуемые

### 6.1 Невозможно переиспользовать без изменений

| Компонент | Причина |
|-----------|---------|
| `scans/route.ts` | Вся логика (валидация, создание, запуск, аудит, уведомление) в одном файле |
| `auth-server.ts` | Возвращает `NextResponse` — привязан к Next.js |
| `middleware.ts` | Next.js-specific, не может быть использован в Telegram Bot |
| `sse.ts` | Node.js `ServerResponse` — привязан к Node.js HTTP server |
| `rate-limit.ts` | In-memory store — не работает в multi-process |

### 6.2 Переиспользуемые с минимальными изменениями

| Компонент | Что нужно |
|-----------|-----------|
| `api-keys.ts` (generate/verify/hash) | Убрать зависимость от `api-key-scopes.ts` (client-safe), вынести в shared package |
| `crypto.ts` | Уже независим от фреймворка |
| `totp.ts` | Уже независим от фреймворка |
| Domain modules (security-state, explainability) | Уже переиспользуемы (цель аудита — сохранить это свойство) |
| `audit.ts` (интерфейс) | Отделить интерфейс от Prisma-реализации |

---

## 7. Рекомендации

### 7.1 Приоритет P0: Application Layer

**Создать `src/application/` с Application Services для каждого use case.**

Это не рефакторинг существующего кода — это **добавление** нового слоя. Существующие API routes продолжают работать, но делегируют бизнес-логику Application Services.

**Ожидаемый эффект:**
- Telegram Bot, CLI, AI Assistant могут вызывать те же services
- Бизнес-логика тестируется независимо от Next.js
- Существующие API routes становятся тонкими controllers

### 7.2 Приоритет P0: Ports & Adapters

**Определить интерфейсы (Ports) для инфраструктуры.**

Минимальный набор:
- `ScanRepository` — чтение/запись сканов и findings
- `UserRepository` — чтение пользовательских данных
- `NotificationPort` — отправка уведомлений (email, Telegram, future channels)
- `EventPublisher` — публикация доменных событий

**Ожидаемый эффект:**
- Инфраструктура заменяется без изменения business logic
- Тестирование с mock-репозиториями
- Multi-database поддержка (SQLite → PostgreSQL)

### 7.3 Приоритет P1: Domain Events

**Определить интерфейсы событий и publisher.**

Минимальный набор событий:
- `ScanStarted`, `ScanCompleted`, `ScanFailed`
- `CriticalFindingDetected`, `FindingRegressed`
- `SecurityScoreChanged`

**Ожидаемый эффект:**
- Добавление нового обработчика = новый subscriber, не изменение существующего кода
- Гарантия доставки (с будущим message broker)
- Audit trail через события

### 7.4 Приоритет P1: Shared Error Model

**Определить единую модель ошибок для всех клиентов.**

```typescript
interface PlatformError {
  code: string;        // "SCAN_NOT_FOUND", "RATE_LIMITED", ...
  message: string;     // Human-readable
  details?: unknown;   // Structured details
  requestId: string;   // For correlation
}
```

**Ожидаемый эффект:**
- Все клиенты получают одинаковый формат ошибок
- Легко маппить на HTTP status codes, Telegram messages, CLI output

### 7.5 Приоритет P2: Unified Auth Model

**Отделить authentication/authorization от Next.js.**

Создать `AuthService`, который:
- Принимает credentials (session token, API key, Telegram user, etc.)
- Возвращает `AuthenticatedUser` (domain тип, не Next.js тип)
- Не зависит от `NextResponse`

**Ожидаемый эффект:**
- Telegram Bot, CLI, Background Workers используют тот же auth
- Единая модель RBAC для всех клиентов

### 7.6 Приоритет P2: Observability Foundation

**Добавить structured logging и correlation IDs.**

Минимум:
- `requestId` в каждом запросе (генерируется в middleware, пробрасывается через все слои)
- Structured JSON logging (вместо `console.error`)
- Basic health check endpoint (`/api/health`)

**Ожидаемый эффект:**
- Отладка multi-client запросов (какой клиент, какой user, какой request)
- Мониторинг в production

---

## 8. Итоговая оценка

### 8.1 Что сохраняется без изменений

| Компонент | Статус | Обоснование |
|-----------|--------|-------------|
| `src/domain/security-state/*` | ✅ Не трогать | Идеальный domain layer |
| `src/domain/explainability/*` | ✅ Не трогать | Идеальный domain layer |
| `prisma/schema.prisma` | ✅ Не трогать | DB schema стабильна |
| `src/lib/crypto.ts` | ✅ Не трогать | Чистая утилита |
| `src/lib/totp.ts` | ✅ Не трогать | Чистая утилита |

### 8.2 Что создаётся заново

| Компонент | Зачем |
|-----------|-------|
| `src/application/` | Application Services — единая точка входа для всех клиентов |
| `src/ports/` | Интерфейсы для инфраструктуры (Repositories, Notifications, Events) |
| `src/api/contracts/` | DTOs, Request/Response модели, Error модели |
| `src/domain/events/` | Доменные события и publisher interface |

### 8.3 Что эволюционирует (добавление, не замена)

| Компонент | Изменение |
|-----------|-----------|
| `src/lib/auth-server.ts` | Добавить `resolveAuth()` — возвращает domain тип без NextResponse |
| `src/lib/audit.ts` | Добавить `AuditPort` interface, текущая реализация становится adapter |
| `src/lib/email.ts` | Стать одним из adapters за `NotificationPort` |
| `src/lib/sse.ts` | Стать одним из adapters за `EventPublisher` |
| API routes | Делегировать бизнес-логику в Application Services (постепенно) |

### 8.4 Архитектурная зрелость — до и после

```
СЕЙЧАС (6.5/10):

  ┌────────────┐     ┌──────────────┐     ┌─────────────┐
  │ Web UI     │────▶│ API Routes   │────▶│ Domain Layer│
  │ (React)    │     │ (Next.js)    │     │ (clean)     │
  └────────────┘     └──────┬───────┘     └─────────────┘
                           │
                     ┌─────┴──────┐
                     │ Prisma DB  │
                     │ Email      │
                     │ SSE        │
                     │ Audit      │
                     └────────────┘

  Проблема: Telegram Bot, CLI, AI Assistant негде подключиться.


ЦЕЛЕВОЕ (9/10):

  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Web UI   │  │ Telegram │  │   CLI    │  │   AI     │
  │          │  │   Bot    │  │          │  │ Assistant│
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │              │              │
  ┌────┴──────────────┴──────────────┴──────────────┴────┐
  │                  PLATFORM LAYER                       │
  │  ┌──────────────────────────────────────────────┐   │
  │  │           Application Services                 │   │
  │  │  StartScan │ GetSecurityState │ Explain │ ...  │   │
  │  └───────────────────┬──────────────────────────┘   │
  │  ┌───────────────────┴──────────────────────────┐   │
  │  │              Ports (Interfaces)                │   │
  │  │  ScanRepo │ UserRepo │ Notify │ EventPub     │   │
  │  └───────────────────┬──────────────────────────┘   │
  └─────────────────────┼───────────────────────────────┘
                        │
  ┌─────────────────────┼───────────────────────────────┐
  │                ADAPTERS                            │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
  │  │  Prisma  │ │  Email   │ │ Telegram │ │  SSE   ││
  │  │  Adapter │ │  Adapter │ │  Adapter │ │Adapter ││
  │  └────┬─────┘ └──────────┘ └──────────┘ └────────┘│
  └───────┼───────────────────────────────────────────┘
          │
  ┌───────┴──────────────┐
  │    Domain Layer      │
  │  Security State      │
  │  Explainability      │
  └──────────────────────┘
```