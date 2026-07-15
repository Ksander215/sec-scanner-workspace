> **Superseded by:** [PLATFORM_API_ARCHITECTURE.md and PLATFORM_AUDIT.md](../PLATFORM_API_ARCHITECTURE.md and PLATFORM_AUDIT.md)
> **Archived reason:** v1 product architecture, superseded by Platform Layer docs
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# PRODUCT_ARCHITECTURE.md — Sec Scanner

> **Дата:** 2026-07-14  
> **Версия:** 0.2.0  
> **Тип: Стратегический анализ архитектуры продукта (без изменения кода)**

---

## 1. Ядро продукта

**Sec Scanner — это не сканер. Это платформа управления уязвимостями (Vulnerability Management Platform) с встроенным DAST-движком.**

Разница фундаментальная:
- **Сканер** — инструмент, который находит баги. Используется episodically.
- **Платформа** — система, которая отслеживает безопасность непрерывно. Используется ежедневно.

Текущая реализация — сканер. Целевое состояние — платформа. Вся архитектура должна строиться вокруг этого перехода.

### 1.1 Value Proposition (текущий vs целевой)

```
ТЕКУЩИЙ:                         ЦЕЛЕВОЙ:
"Сканируй URL → получи PDF"      "Отслеживай безопасность своих 
                                 приложений непрерывно"

One-shot tool                    Continuous platform
Разовый вход                     Ежедневный вход
Нет причин возвращаться          Тренды, алерты, регрессии
```

---

## 2. Bounded Contexts (Ограниченные контексты)

### 2.1 Карта контекстов

```
┌─────────────────────────────────────────────────────────────────┐
│                     SEC SCANNER — BOUNDED CONTEXTS              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   SCANNING   │  │   IDENTITY   │  │    COLLABORATION      │  │
│  │              │  │              │  │                       │  │
│  │ Target       │  │ User         │  │ Workspace             │  │
│  │ Scan         │  │ Session      │  │ Membership            │  │
│  │ Vulnerability│  │ API Key      │  │ Invite                │  │
│  │ Report       │  │ 2FA          │  │ Role                  │  │
│  │ Score        │  │ OAuth        │  │                       │  │
│  │              │  │              │  │                       │  │
│  │ КЛЮЧЕВОЙ     │  │ ИНФРА-       │  │ БУДУЩИЙ МОДУЛЬ       │  │
│  │ КОНТЕКСТ     │  │ СТРУКТУРА    │  │ (реализован частично)  │  │
│  └──────┬───────┘  └──────────────┘  └───────────────────────┘  │
│         │                                                         │
│  ┌──────┴───────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  REPORTING   │  │  MARKETPLACE  │  │    NOTIFICATION       │  │
│  │              │  │              │  │                       │  │
│  │ PDF Report   │  │ Plan         │  │ Email                 │  │
│  │ HTML Report  │  │ Subscription │  │ In-app (SSE/toast)    │  │
│  │ SARIF        │  │ Usage/Limits │  │ Webhook (future)      │  │
│  │ Trend Chart  │  │ Payment      │  │ Slack (future)        │  │
│  │              │  │ Invoice      │  │                       │  │
│  │ ЗАВИСИТ ОТ   │  │              │  │ КРОСС-СЕЧЕНИЕ         │  │
│  │ SCANNING     │  │ НЕ РЕАЛИЗОВAN│  │ (cutting concern)     │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                               │
│  │   CONTENT    │  │    AUDIT     │                               │
│  │   (CMS)      │  │   LOGGING    │                               │
│  │              │  │              │                               │
│  │ Landing text │  │ Security     │                               │
│  │ Features     │  │ events       │                               │
│  │ Pricing      │  │ Compliance   │                               │
│  │              │  │ evidence     │                               │
│  │ ИНФРА-       │  │              │                               │
│  │ СТРУКТУРА    │  │ ИНФРА-       │                               │
│  └──────────────┘  │ СТРУКТУРА    │                               │
│                     └──────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Описание контекстов

#### Scanning Context — ядро продукта

**Ответственность:** Всё, что связано с обнаружением уязвимостей.

| Подконтекст | Сущности | Текущий статус |
|-------------|----------|----------------|
| Target Management | Target (ОТСУТСТВУЕТ) | ❌ Нет |
| Scan Execution | Scan, ScanResult | ✅ Mock реализация |
| Vulnerability Tracking | Vulnerability | ⚠️ Без lifecycle (нет status) |
| Scoring | Score, SeverityWeights | ✅ Реализован |
| Scheduling | Schedule (ОТСУТСТВУЕТ) | ❌ Нет |
| Regression Detection | ScanComparison (ОТСУТСТВУЕТ) | ❌ Нет |

**Граница:** Внутри этого контекста живут правила скоринга, OWASP-шаблоны, логика выполнения скана. Вне — авторизация, уведомления, биллинг.

**Текущая проблема:** Контекст реализован как набор утилит (`dast.ts`, `rate-limit.ts`) и inline-функций в route handlers. Нет единого «scan service».

#### Identity Context — инфраструктура

**Ответственность:** Кто пользователь и имеет ли он право на действие.

| Компонент | Текущий статус |
|-----------|----------------|
| Credentials Auth | ✅ bcryptjs, anti-enumeration |
| OAuth (Google, GitHub) | ✅ next-auth providers |
| 2FA TOTP | ✅ otplib + qrcode |
| API Keys | ✅ SHA-256 hash, scoped, timing-safe |
| Sessions (JWT) | ✅ 30-day maxAge |
| RBAC (user/admin) | ⚠️ Только 2 роли, нет workspace-level |
| Rate Limiting | ⚠️ In-memory, single-instance |

**Граница:** Этот контекст не знает про сканы, уязвимости, отчёты. Он только отвечает на вопрос «кто этот человек и что ему можно делать».

**Текущая проблема:** Контекст реализован корректно, но имеет технический долг (plaintext TOTP, fallback secret). RBAC ограничен: только `user`/`admin`, нет гранулярных прав на уровне workspace.

#### Collaboration Context — будущий модуль

**Ответственность:** Совместная работа пользователей.

| Компонент | Текущий статус |
|-----------|----------------|
| Workspace (Team) | ⚠️ Создание/удаление, роли |
| Membership | ⚠️ Owner/Admin/Member |
| Invites | ⚠️ Email token, 7-day expiry |
| Team Scans | ❌ API не поддерживает teamId в POST /api/scans |

**Граница:** Workspace — это контекст для групповой работы. Вне —個人ные сканы пользователя.

**Текущая проблема:** Workspace создан, но **не используется**. Сканы не привязаны к workspace через UI. `GET /api/scans` не возвращает сканы workspace. Это мёртвый код с точки зрения пользователя.

#### Reporting Context — зависит от Scanning

**Ответственность:** Форматирование и доставка результатов.

| Формат | Текущий статус |
|--------|----------------|
| PDF (multi-page A4) | ✅ @react-pdf/renderer, 6 pages |
| JSON (API) | ✅ GET /api/scans/[id] |
| HTML | ❌ Нет |
| SARIF | ❌ Нет |
| Summary / Trend | ❌ Нет |

**Граница:** Reporting потребляет данные из Scanning, но не модифицирует их. Форматирование — отдельная ответственность от обнаружения.

#### Notification Context — cross-cutting concern

**Ответственность:** Доставка информации пользователю о событиях.

| Канал | Текущий статус |
|-------|----------------|
| In-app (SSE) | ✅ scan-update events |
| In-app (Toast) | ✅ Sonner |
| Email (scan completed) | ✅ Nodemailer, respects preferences |
| Email (team invite) | ✅ Nodemailer |
| Webhook | ❌ Нет |
| Slack | ❌ Нет |

**Граница:** Notification получает события от всех контекстов и доставляет через configured channels. Не содержит бизнес-логики.

#### Marketplace Context — не реализован

**Ответственность:** Монетизация и управление подписками.

| Компонент | Текущий статус |
|-----------|----------------|
| Plan Templates | ⚠️ StoreProduct (CRUD, но не привязан к users) |
| Subscription | ❌ Нет |
| Usage Tracking | ❌ Нет |
| Payment (Stripe) | ❌ Нет |
| Limits Enforcement | ❌ Нет |
| Invoice | ❌ Нет |
| Trial | ❌ Нет |

**Решение:** Не трогать до тех пор, пока не появится реальная ценность для платного upgrade (Targets, Trends, Schedules).

---

## 3. Карта данных (Data Map)

### 3.1 Классификация данных

| Данные | Тип | Чувствительность | Текущее хранение |
|--------|-----|-------------------|-------------------|
| User email | PII | 🔴 High | SQLite, plaintext |
| User password hash | Credentials | 🔴 Critical | SQLite, bcryptjs |
| User name | PII | 🟡 Medium | SQLite, plaintext |
| TOTP secret | Credentials | 🔴 Critical | SQLite, **plaintext** |
| API key (raw) | Credentials | 🔴 Critical | **Не хранится** (correct) |
| API key (hash) | Credentials | 🔴 High | SQLite, SHA-256 |
| Scan target URL | Business | 🟢 Low | SQLite, plaintext |
| Vulnerability details | Business | 🟢 Low | SQLite, plaintext |
| Scan score | Business | 🟢 Low | SQLite |
| Team name | Business | 🟢 Low | SQLite |
| Invite token | Auth | 🟡 Medium | SQLite, plaintext |
| Audit log entries | Security | 🔴 High | SQLite, plaintext JSON |
| Lead email | PII | 🔴 High | Audit log (неправильно) |
| CMS content | Business | 🟢 Low | SQLite, key-value |

### 3.2 Поток данных (Data Flow) при сканировании

```
User Input: URL
    │
    ▼
[HTTP Layer] POST /api/scans
    │ Auth check (JWT / API Key)
    │ Rate limit check
    │ Zod validation
    │
    ▼
[Domain Layer] Scan Creation
    │ db.scan.create({ status: "scanning" })
    │ audit({ action: "scan.create" })
    │
    ▼
[Domain Layer] Scan Execution (async)
    │ generateScanResult(target, scanId)
    │   ├── FNV-1a hash → seed
    │   ├── Mulberry32 PRNG → random selection
    │   ├── OWASP templates → vulnerability objects
    │   └── Score calculation: 100 - weighted_impact
    │
    ▼
[Infrastructure] Persistence
    │ db.$transaction([
    │   vulnerability.createMany(...),
    │   scan.update({ status: "completed", score, duration })
    │ ])
    │
    ▼
[Infrastructure] Real-time
    │ broadcastScanUpdate(userId, scan)
    │   └── SSE → all user's EventSource connections
    │
    ▼
[Infrastructure] Notification
    │ notifyScanCompleted({ userId, scanId, score, vulnCount })
    │   └── Nodemailer → user email (if preferences allow)
    │
    ▼
[Client] Data Display
    │ React Query cache invalidation
    │   ├── ["scans"] → History tab re-renders
    │   └── ["scan", scanId] → Detail modal (if open) re-renders
    │
    ▼
[Client] Report Generation
    │ User clicks "Download PDF"
    │ GET /api/scans/[id]/pdf
    │   └── @react-pdf/renderer → A4 multi-page PDF → blob → download
```

---

## 4. Где смешение бизнес-логики

### 4.1 Карта нарушений границ

```
Файл                    | Контексты, которые он нарушает
─────────────────────────┼──────────────────────────────────────────
src/app/api/scans/route.ts | Scanning + Identity + Notification + Infrastructure
src/lib/dast.ts           | Scanning (data) + Scanning (engine) + Scoring (logic)
src/lib/auth.ts           | Identity + Audit + Rate Limiting
src/lib/email.ts          | Notification + User Preferences (читает из БД)
src/lib/teams.ts          | Collaboration (ok) + DB queries (ok)
src/components/dashboard/scan-tab.tsx | Presentation + URL validation
src/components/dashboard/helpers.ts  | Domain logic (score functions) в UI-слое
```

### 4.2 Конкретные примеры

**Пример 1: `scan-tab.tsx` содержит URL validation**
```typescript
// Это бизнес-правило в UI-компоненте
const urlValid = /^https?:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?$/.test(target);
```
Должно быть: shared validation schema (уже есть в route.ts через Zod), а UI должен импортировать из domain layer.

**Пример 2: `helpers.ts` содержит domain logic**
```typescript
// Это расчёт бизнес-метрики, а не UI-helper
export function severityBreakdown(vulns: Vulnerability[]) { ... }
export function summarizeScans(scans: ScanListItem[]) { ... }
```
Должно быть: domain layer, а UI импортирует готовые расчёты.

**Пример 3: `email.ts` читает user preferences**
```typescript
const user = await db.user.findUnique({
  where: { id: opts.userId },
  select: { email, scanCompletedAlerts, emailNotifications }
});
```
Notification layer должен получать уже отфильтрованные данные от domain/application layer, а не лезть в БД за preferences.

---

## 5. Архитектурные модули (цель на 12 месяцев)

### 5.1 Текущая архитектура (Flat)

```
src/
├── app/api/30 routes/     — HTTP handlers + бизнес-логика
├── lib/15 utilities/      — всё вперемешку
├── components/            — UI
├── hooks/                 — React hooks
└── content/               — CMS defaults
```

Все модули на одном уровне. Нет разделения по ответственности.

### 5.2 Целевая модульная архитектура

```
src/
├── domain/                          ← Бизнес-правила, без фреймворков
│   ├── scanning/
│   │   ├── scan.entity.ts           — типы, интерфейсы
│   │   ├── scan.rules.ts            — инварианты, business rules
│   │   ├── scoring.ts               — алгоритм расчёта score
│   │   ├── vulnerability.entity.ts
│   │   └── target.entity.ts         — НОВАЯ сущность
│   ├── collaboration/
│   │   ├── workspace.entity.ts
│   │   ├── workspace.rules.ts       — owner/role invariants
│   │   └── invite.entity.ts
│   └── marketplace/
│       ├── plan.entity.ts
│       ├── subscription.entity.ts
│       └── limits.rules.ts
│
├── application/                     ← Use cases, оркестрация
│   ├── scan/
│   │   ├── start-scan.usecase.ts    — "Запустить скан цели X"
│   │   ├── complete-scan.usecase.ts — "Обработать завершение"
│   │   └── get-scan-history.usecase.ts
│   ├── workspace/
│   │   ├── create-workspace.usecase.ts
│   │   └── invite-member.usecase.ts
│   └── auth/
│       ├── register.usecase.ts
│       └── login.usecase.ts
│
├── infrastructure/                  ← Реализации (БД, email, HTTP)
│   ├── db/
│   │   ├── prisma-client.ts         — singleton
│   │   ├── scan.repository.ts       — Prisma queries для Scan
│   │   ├── user.repository.ts
│   │   └── workspace.repository.ts
│   ├── auth/
│   │   ├── nextauth.adapter.ts      — next-auth v4/v5 config
│   │   ├── jwt.strategy.ts
│   │   └── api-key.middleware.ts
│   ├── scanning/
│   │   ├── mock-engine.ts           — текущий mock (для demo)
│   │   ├── real-engine.ts           — будущий DAST (Nuclei/ZAP)
│   │   └── scan-queue.ts            — future: BullMQ/Redis
│   ├── notification/
│   │   ├── email.channel.ts
│   │   ├── sse.channel.ts
│   │   └── webhook.channel.ts       — future
│   └── reporting/
│       ├── pdf.generator.ts
│       └── sarif.generator.ts       — future
│
├── presentation/                    ← HTTP + React
│   ├── http/
│   │   ├── api/
│   │   │   ├── scans/route.ts       — тонкий: parse → usecase → respond
│   │   │   └── ...
│   │   ├── middleware.ts
│   │   └── dto/                     — request/response schemas
│   └── web/
│       ├── pages/
│       │   ├── (public)/
│       │   ├── (auth)/dashboard/
│       │   ├── (auth)/settings/
│       │   └── (auth)/admin/
│       └── components/
│           ├── dashboard/
│           ├── landing/
│           └── ui/
│
└── shared/                          ← Cross-cutting
    ├── types.ts
    ├── errors.ts                    — domain exceptions
    └── utils.ts
```

### 5.3 Когда делать эту рефакторинг?

**НЕ сейчас.** Это масштабная реорганизация, которая не приносит пользовательской ценности. Делать её нужно **после** добавления Target entity и до подключения real DAST engine.

Правильная последовательность:
1. Добавить ценность (Target, Trends, Vulnerability status)
2. Выделить domain layer (когда станет понятно, какие domain services нужны)
3. Подключить real DAST (когда domain layer чистый)

---

## 6. Развитие продукта: Roadmap от продукта

### 6.1 Фазы (продуктовые, не технические)

```
Фаза 0: Foundation (сейчас)
  ├── Mock DAST работает
  ├── Auth, Teams, API Keys — есть
  ├── Landing + Dashboard + Settings + Admin
  └── Проблема: нет причин возвращаться

Фаза 1: Continuous (ближайшие 3-6 месяцев)
  ├── Target entity с историей сканов
  ├── Vulnerability status (open/fixed/false_positive)
  ├── Score trend chart по target
  ├── Scheduled scans (cron-based)
  └── Ценность: "Вижу динамику безопасности"

Фаза 2: Collaboration (6-12 месяцев)
  ├── Workspace-level scan view
  ├── Team scan assignment
  ├── Vulnerability assignment (who fixes what)
  ├── Comments on vulnerabilities
  ├── Integration: Jira, Slack, GitHub
  └── Ценность: "Команда работает вместе"

Фаза 3: Enterprise (12+ месяцев)
  ├── SSO/SAML
  ├── Custom scan policies
  ├── API docs + SDK
  ├── White-label reports
  ├── Multi-tenant (organization > workspace)
  ├── Compliance reports (SOC2, ISO 27001)
  └── Ценность: "Подходит для крупных компаний"
```

### 6.2 Критический путь к монетизации

```
Сейчас                        Цель
  │                             │
  ▼                             ▼
"Сканируй URL"         "Отслеживай безопасность"
  │                             │
  │   Добавить:                 │   Монетизировать через:
  │   ├── Target entity         │   ├── Scan limits per plan
  │   ├── Vulnerability status  │   ├── Target limits per plan
  │   ├── Trend charts          │   ├── Schedule (paid feature)
  │   ├── Scan comparison       │   ├── SARIF export (paid)
  │   └── Scheduled scans       │   ├── Webhooks (paid)
  │                             │   └── Team limits per plan
  ▼                             ▼
Повод возвращаться      Повод платить
каждый день            каждый месяц
```

**Ключевой инсайт:** Монетизация невозможна без Target entity. Пока пользователь сканирует случайные URL без группировки — нет обоснования для лимитов. Target entity создаёт естественную единицу для биллинга.

---

## 7. Архитектурные решения (решения, а не проблемы)

### 7.1 Решение: Как добавлять Target

**Минимальное изменение:**

```
Новая модель Prisma:
  model Target {
    id           String   @id @default(cuid())
    userId       String
    workspaceId  String?
    url          String
    name         String?
    slug         String   @unique
    lastScanAt   DateTime?
    lastScore    Int?
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    scans  Scan[]
    user   User   @relation(fields: [userId], references: [id])
    workspace Team?  @relation("TeamTargets", fields: [workspaceId], references: [id])
  }

Миграция Scan:
  scan.targetId  → NEW (nullable, для обратной совместимости)
  scan.target     → DEPRECATED (оставить для старых записей)
```

**UI изменения:**
- Новый таб «Targets» в Dashboard (перед Scan)
- Target card: URL, last score, scan count, trend arrow
- Scan tab: dropdown для выбора target вместо свободного ввода URL
- History: группировка по target

**API изменения:**
- `POST /api/targets` — создать target
- `GET /api/targets` — список с lastScore
- `GET /api/targets/[id]/trend` — score history для chart
- `POST /api/scans` — принять `targetId` вместо `target` (URL)

**Оценка:** ~2 недели работы. Это **самый ROI-положительный** следующий шаг.

### 7.2 Решение: Как добавлять Vulnerability Status

**Минимальное изменение:**

```
Миграция Vulnerability:
  + status  String  @default("open")  // open | acknowledged | fixed | false_positive
  + statusUpdatedAt DateTime?
  + statusUpdatedBy String?

Новые API endpoints:
  PATCH /api/vulnerabilities/[id]/status
  Body: { status: "fixed" | "false_positive" | "acknowledged" }
```

**Оценка:** ~3 дня работы. Даёт основу для regression detection.

### 7.3 Решение: Как делать scheduled scans

```
Новая модель:
  model ScanSchedule {
    id        String   @id @default(cuid())
    targetId  String
    cronExpr  String   // "0 9 * * 1" — каждый понедельник 9:00
    enabled   Boolean  @default(true)
    lastRunAt DateTime?
    nextRunAt DateTime
    createdAt DateTime @default(now())

    target Target @relation(fields: [targetId], references: [id])
  }

Реализация:
  - node-cron внутри Next.js (server.js wrapper)
  - Или: external cron (systemd timer / GitHub Actions)
  - Или: BullMQ + Redis worker (при масштабировании)
```

---

## 8. Конкурентные преимущества и «Wow Moment»

### 8.1 Текущие преимущества

| Преимущество | Описание | Сильное ли? |
|-------------|----------|-------------|
| Скорость | 15 секунд от входа до PDF | ⚠️ Только для mock. Real DAST будет медленнее. |
| Простота | Нет настройки, просто URL | ✅ Сильное для MVP |
| PDF отчёт | Готовый для руководства | ⚠️ Базовый, без трендов |
| Real-time SSE | Мгновенное обновление в UI | ✅ Хорошая реализация |
| i18n EN/RU | Двуязычный интерфейс | ⚠️ Нишевое преимущество |
| API ключи | Программный доступ | ✅ Хорошо для CI/CD |

### 8.2 Отсутствующие «Wow Moments»

| Wow Moment | Конкуренты | У Sec Scanner |
|------------|-----------|---------------|
| «Твой сайт на 23 месте из 100 в индустрии» | Некоторые DAST | ❌ Нет бенчмарка |
| «Эта уязвимость была исправлена после последнего скана» | Все зрелые VMP | ❌ Нет regression detection |
| «Твоя безопасность улучшается: 45 → 67 → 82 за 3 месяца» | Нет ни у кого (opportunity) | ❌ Нет трендов |
| «Вот 3 новых уязвимости, которых не было на прошлой неделе» | Все зрелые DAST | ❌ Нет comparison |
| «Автоматический отчёт в Slack каждый понедельник» | Tenable, Qualys | ❌ Нет scheduled + Slack |

**Главный missed opportunity:** **Тренды безопасности**. Никто из мелких DAST-инструментов не показывает понятный график «мы становимся безопаснее». Это может быть killer feature.

---

## 9. Резюме: 5 архитектурных рекомендаций

### Рекомендация 1: Добавить Target как первую продуктовую сущность

Не рефакторить код. Не чинить техдолг. Добавить **Target** — сущность, которая создаст фундамент для всех будущих фич: тренды, расписания, лимиты, сравнения.

**ROI:** Максимальный. Открывает путь к retention и monetization.

### Рекомендация 2: Выделить domain layer только когда появится real DAST

Сейчас бизнес-логики мало (mock engine — 300 строк). Выделение domain layer сейчас — это преждевременная абстракция. Делать когда появится real engine, scheduled scans, webhooks — тогда границы контекстов станут очевидны из реальных требований.

**ROI:** Отрицательный сейчас, положительный через 3-6 месяцев.

### Рекомендация 3: Продуктовые приоритеты важнее технических

Порядок:
1. **Target entity** → ценность для пользователя
2. **Vulnerability status** → основа для трекинга
3. **Trend charts** → «wow moment» для retention
4. **Scheduled scans** → «continuous» не просто в названии
5. **Stripe integration** → монетизация
6. **Только потом:** реальная модульная архитектура, Redis, PostgreSQL

### Рекомендация 4: Collaboration context — заморозить

Workspace/Teams реализован на 60%, но не используется. Не вкладывать время в доработку. Когда появится Target и пользователи начнут возвращаться — тогда дозавершить team scans и team-level views.

### Рекомендация 5: Marketplace context — отложить до появления ценности

Пока бесплатный продукт не даёт причин возвращаться, нет смысла создавать платный. Сначала сделать продукт «залипательным» на free tier, затем монетизировать расширенные возможности.