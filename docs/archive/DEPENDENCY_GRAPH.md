> **Superseded by:** [PLATFORM_API_ARCHITECTURE.md](../PLATFORM_API_ARCHITECTURE.md)
> **Archived reason:** Module dependency graphs, superseded by Platform API Architecture
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# DEPENDENCY_GRAPH.md — Sec Scanner

> **Дата:** 2026-07-14  
> **Версия:** 0.2.0

---

## 1. Общий граф зависимостей модулей

```
page.tsx (SPA Entry Point)
├── useSession() ────────────────────────────── next-auth
│   ├── Landing
│   │   ├── landing.tsx ──────────── fetch /api/content, /api/products
│   │   ├── faq-section.tsx
│   │   ├── audience-section.tsx
│   │   ├── use-cases-section.tsx
│   │   └── lead-magnet-form.tsx ─── fetch /api/lead-magnet
│   ├── AuthForm (auth-form.tsx)
│   │   ├── fetch /api/auth/[...nextauth]
│   │   ├── fetch /api/auth/register
│   │   └── fetch /api/auth/oauth-providers
│   │   └── [2FA flow] fetch /api/2fa/setup, /verify
│   ├── Dashboard (dashboard.tsx)
│   │   ├── ScanTab ──────────── useStartScan → POST /api/scans
│   │   ├── HistoryTab ──────── useScans (SSE + polling) → GET /api/scans
│   │   ├── ScanDetailModal ─── useScanDetail → GET /api/scans/[id]
│   │   │                     └── GET /api/scans/[id]/pdf
│   │   ├── TeamsTab ────────── GET /api/teams, /api/teams/[slug]/*
│   │   ├── ApiKeysTab ──────── GET/POST /api/keys, DELETE /api/keys/[id]
│   │   └── BillingTab ──────── GET /api/products
│   ├── Settings (settings.tsx)
│   │   ├── ProfileTab ──────── GET/PATCH /api/user
│   │   ├── AppearanceTab ───── next-themes (client-only)
│   │   ├── NotificationsTab ── PATCH /api/user
│   │   └── SecurityTab ─────── POST /api/user/password
│   │                           POST /api/2fa/setup, /verify, /disable, /status
│   └── AdminPanel (admin-panel.tsx) [role=admin]
│       ├── ContentEditor ───── GET/PATCH /api/admin/content
│       ├── ProductsManager ─── GET/POST /api/admin/products
│       │                      GET/PATCH/DELETE /api/admin/products/[id]
│       └── AuditLog ────────── GET /api/admin/audit
└── Navbar ──────────────────── useSession, i18n, theme
```

---

## 2. Зависимости API Route → lib/

```
API Route                      →  lib/ модули
─────────────────────────────────────────────────────────────
/api/auth/[...nextauth]        →  auth.ts, crypto.ts, db.ts, audit.ts
/api/auth/register             →  db.ts, crypto.ts, rate-limit.ts, audit.ts
/api/2fa/*                     →  db.ts, totp.ts, auth-server.ts, audit.ts
/api/scans                     →  db.ts, dast.ts, sse.ts, auth-server.ts, audit.ts
/api/scans/[id]                →  db.ts, auth-server.ts
/api/scans/[id]/pdf            →  db.ts, auth-server.ts, pdf-report.tsx
/api/scans/events              →  db.ts, auth-server.ts, sse.ts
/api/keys                      →  db.ts, api-keys.ts, auth-server.ts, audit.ts
/api/keys/[id]                 →  db.ts, auth-server.ts, audit.ts
/api/teams                     →  db.ts, teams.ts, auth-server.ts, audit.ts
/api/teams/[slug]/*            →  db.ts, teams.ts, auth-server.ts, audit.ts
/api/team-invites/[token]/*    →  db.ts, teams.ts, auth-server.ts, audit.ts
/api/user                      →  db.ts, auth-server.ts
/api/user/password             →  db.ts, crypto.ts, auth-server.ts
/api/admin/content             →  db.ts, admin-guard.ts, admin-content.ts, audit.ts
/api/admin/products            →  db.ts, admin-guard.ts, audit.ts
/api/admin/products/[id]       →  db.ts, admin-guard.ts, audit.ts
/api/admin/audit               →  db.ts, admin-guard.ts
/api/content                   →  db.ts, default-content.ts
/api/products                  →  db.ts
/api/lead-magnet               →  db.ts, rate-limit.ts, audit.ts
/api/test-reset                →  rate-limit.ts
```

---

## 3. Зависимости lib/ → lib/ (внутренние)

```
auth.ts ───────────────────────→ crypto.ts, db.ts, totp.ts, rate-limit.ts
auth-server.ts ────────────────→ auth.ts (getServerSession)
admin-guard.ts ────────────────→ auth-server.ts, rate-limit.ts, audit.ts
api-keys.ts ───────────────────→ crypto.ts (для SHA-256)
teams.ts ──────────────────────→ db.ts
dast.ts ───────────────────────→ (standalone — детерминированный PRNG)
sse.ts ────────────────────────→ db.ts (для getUserId из токена)
rate-limit.ts ─────────────────→ (standalone — in-memory)
audit.ts ──────────────────────→ db.ts
email.ts ──────────────────────→ (standalone — Nodemailer lazy init)
totp.ts ───────────────────────→ (standalone — otplib + qrcode)
crypto.ts ─────────────────────→ (standalone — bcryptjs)
pdf-report.tsx ────────────────→ (standalone — @react-pdf/renderer)
i18n.ts ───────────────────────→ (standalone — flat dictionary)
admin-content.ts ─────────────→ (standalone — field descriptors)
```

---

## 4. Зависимости Database Models (Prisma)

```
User
├── 1:N → Scan (userId FK, CASCADE)
├── 1:N → ApiKey (userId FK, CASCADE)
├── 1:N → Team [as owner] (ownerId FK, CASCADE)
├── 1:N → TeamMembership (userId FK, CASCADE)
├── 1:N → TeamInvite [as inviter] (invitedBy FK, CASCADE)
│
Scan
├── N:1 → User (userId)
├── N:1? → Team (teamId, SET NULL)
└── 1:N → Vulnerability (scanId FK, CASCADE)
│
Team
├── N:1 → User [owner] (ownerId)
├── 1:N → TeamMembership (teamId FK, CASCADE)
├── 1:N → TeamInvite (teamId FK, CASCADE)
└── 1:N → Scan [team scans] (teamId)
│
Vulnerability ────────────────→ N:1 → Scan (scanId)
ApiKey ────────────────────────→ N:1 → User (userId)
TeamMembership ────────────────→ N:1 → User, N:1 → Team
TeamInvite ────────────────────→ N:1 → Team, N:1 → User [inviter]

SiteContent ─────────────────── (standalone key-value)
StoreProduct ────────────────── (standalone)
AuditLog ────────────────────── (standalone, actorId — денормализация)
```

---

## 5. Граф внешних зависимостей (package.json)

### 5.1 Runtime (зависимости времени выполнения)

#### Core Framework
```
next@16.1.1
├── react@19.0.0
├── react-dom@19.0.0
└── next-auth@4.24.11
    ├── (JWT sessions — no DB adapter needed)
    └── (OAuth: Google, GitHub — uses fetch internally)
```

#### Database & ORM
```
@prisma/client@6.11.1
├── prisma@6.11.1 (devDep, but used as CLI)
└── (SQLite3 — bundled with Prisma, no separate install)
```

#### UI & Styling
```
tailwindcss@4 (devDep)
├── @tailwindcss/postcss@4 (devDep)
├── tailwindcss-animate@1.0.7
├── tw-animate-css@1.3.5 (devDep)
├── class-variance-authority@0.7.1
├── clsx@2.1.1
├── tailwind-merge@3.3.1
├── lucide-react@0.525.0
├── framer-motion@12.23.2
├── sonner@2.0.6
└── @radix-ui/* (20+ primitives)
```

#### Data Fetching & State
```
@tanstack/react-query@5.82.0
@tanstack/react-table@8.21.3
next-themes@0.4.6
```

#### Forms & Validation
```
react-hook-form@7.60.0
@hookform/resolvers@5.1.1
zod@4.0.2
input-otp@1.4.2
```

#### PDF
```
@react-pdf/renderer@4.5.1
└── (depends on yoga-layout, @react-pdf/pdfkit)
```

#### Security & Auth utilities
```
bcryptjs@3.0.3
otplib@13.4.1
qrcode@1.5.4
```

#### Email
```
nodemailer@7.0.13
```

#### Rich Text Editor
```
@mdxeditor/editor@3.39.1
├── react-markdown@10.1.0
└── react-syntax-highlighter@15.6.1
```

#### Misc
```
date-fns@4.1.0       — date formatting
sharp@0.34.3          — image processing (UNUSED)
embla-carousel-react@8.6.0 — carousel component
react-day-picker@9.8.0 — date picker
react-resizable-panels@3.0.3 — resizable layout
vaul@1.1.2            — drawer component
cmdk@1.1.1            — command palette
uuid@11.1.0           — UUID generation (UNUSED — Prisma uses CUID)
```

### 5.2 Unused Dependencies (мёртвый код)

```
zustand@5.0.6           — НИГДЕ не импортируется
@dnd-kit/core@6.3.1     — НИГДЕ не импортируется
@dnd-kit/sortable@10.0.0 — НИГДЕ не импортируется
@dnd-kit/utilities@3.2.2 — НИГДЕ не импортируется
next-intl@4.3.4         — НИГДЕ не импортируется (используется кастомный i18n)
sharp@0.34.3            — НИГДЕ не импортируется (image processing)
uuid@11.1.0             — Не используется (Prisma CUID)
z-ai-web-dev-sdk@0.0.18 — SDK для внешней платформы, не используется в прод-коде
```

### 5.3 Legacy / Outdated

```
next-auth@4.24.11       — v4 branch frozen, рекомендуется Auth.js v5
```

---

## 6. Зависимости DevOps / Инфраструктура

```
Dev Runtime
└── Bun (dev server, script runner)
    └── bun.lock (lockfile)
    └── bun-types (devDep)

Production Runtime
└── Node.js (standalone server.js)
    └── next start → .next/standalone/server.js

Reverse Proxy
└── Caddy
    └── Caddyfile (port 81 → localhost:3000)
    └── Dynamic port via ?XTransformPort=

Database
└── SQLite (file-based)
    └── Managed via Prisma
    └── Schema: prisma/schema.prisma
    └── Migration: prisma db push (no migrations dir)

Testing
└── Playwright@1.61.1
    ├── tests/e2e/*.spec.ts
    └── playwright.config.ts
└── Python scripts (scripts/test-*.py)
    └── requests library
```

---

## 7. Круговые и проблемные зависимости

### 7.1 Двойная авторизация (Middleware + Handler)

```
Request
  → middleware.ts (проверяет JWT/API-key)
    → passes through или 401
  → route.ts handler
    → requireAuth() / requireSession() / requireAdmin()
      → ПОВТОРНО проверяет JWT/API-key
```

**Проблема:** Middleware и route handlers обе проверяют авторизацию независимо. Middleware использует свой парсинг JWT, handlers — `getServerSession()`. Это не «круговая зависимость», но избыточность, которая может привести к рассинхрону логики.

### 7.2 Audit Log зависит от всего

```
/auth/* ─────→ audit.ts
/2fa/* ──────→ audit.ts
/scans/* ─────→ audit.ts
/keys/* ──────→ audit.ts
/teams/* ─────→ audit.ts
/admin/* ─────→ audit.ts
/lead-magnet/ → audit.ts
```

audit.ts — наиболее связанный модуль. Изменение его интерфейса затронет все route handlers. Это нормально для cross-cutting concern, но требует осторожности при рефакторинге.

### 7.3 page.tsx — God Component

```
page.tsx
├── импортирует: Landing, AuthForm, Dashboard, Settings, AdminPanel
├── использует: useSession (next-auth)
└── управляет: view state (landing/dashboard/settings/admin)
```

Это точка максимальной связности — изменение любого экрана может потребовать изменения page.tsx.

---

## 8. Визуальная карта модулей (текстовый граф)

```
                          ┌─────────────┐
                          │  middleware   │
                          │  (auth gate) │
                          └──────┬───────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
         ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
         │   Auth    │    │  Dashboard  │    │   Admin     │
         │  Routes   │    │   Routes    │    │   Routes    │
         │  (4 ep)   │    │  (8 ep)     │    │  (4 ep)     │
         └────┬──────┘    └──────┬──────┘    └──────┬──────┘
              │                  │                   │
         ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
         │  crypto   │    │    dast     │    │admin-content│
         │   totp    │    │    sse      │    │ admin-guard │
         │   db      │    │    db       │    │    audit    │
         │   audit   │    │   audit     │    │     db      │
         │rate-limit │    │ auth-server │    │             │
         └───────────┘    └─────────────┘    └─────────────┘

              ┌──────────────────┼──────────────────┐
              │                  │                   │
         ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
         │   Team    │    │   User      │    │  Public     │
         │  Routes   │    │  Routes     │    │  Routes     │
         │  (6 ep)   │    │  (2 ep)     │    │  (4 ep)     │
         └────┬──────┘    └──────┬──────┘    └──────┬──────┘
              │                  │                   │
         ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
         │  teams    │    │   crypto    │    │rate-limit   │
         │  api-keys │    │    db       │    │  email      │
         │    db     │    │auth-server  │    │    db       │
         │  audit    │    │   audit     │    │   audit     │
         └───────────┘    └─────────────┘    └─────────────┘

         ep = endpoint
         db = Prisma Client (SQLite)
```

---

## 9. Размер зависимостей (оценка)

| Категория | Кол-во пакетов | Оценочный размер (node_modules) |
|-----------|----------------|-------------------------------|
| Core (next, react, prisma) | 5 | ~45 MB |
| UI (radix, shadcn deps, framer) | 25+ | ~15 MB |
| PDF (@react-pdf/renderer) | 1 | ~8 MB |
| Dead deps (zustand, dnd-kit, sharp, next-intl) | 7 | ~3 MB |
| Dev deps (playwright, eslint, typescript) | 6 | ~120 MB |
| **Итого runtime** | ~35 | **~70 MB** |
| **Итого + dev** | ~42 | **~190 MB** |