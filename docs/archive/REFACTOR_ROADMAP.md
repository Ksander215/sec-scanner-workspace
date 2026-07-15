> **Superseded by:** [PLATFORM_API_ARCHITECTURE.md (Roadmap section)](../PLATFORM_API_ARCHITECTURE.md (Roadmap section))
> **Archived reason:** 6-sprint refactoring plan, superseded by Platform API Architecture
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# REFACTOR_ROADMAP.md — Sec Scanner

> **Дата:** 2026-07-14  
> **Версия проекта:** 0.2.0 → 1.0.0  
> **Общий горизонт:** 6 спринтов × 1 неделя  
> **Общий бюджет:** ~45 человеко-часов техдолга + feature work

---

## Принципы рефакторинга

1. **Ни одного регресса** — каждый спринт заканчивается полным прогоном E2E тестов
2. **Атомарные коммиты** — каждая TD-задача = отдельный PR
3. **Feature flags** — новые реализации оборачиваются в флаги для безопасного включения
4. **Документирование** — каждый изменённый модуль обновляет JSDoc/tsdocs

---

## Спринт 1: Foundation & Critical Security (Неделя 1)

**Цель:** Убрать критические проблемы безопасности и включить инструменты контроля качества

### Задачи

| ID | Задача | Техдолг | Оценка | Приоритет |
|----|--------|---------|--------|-----------|
| 1.1 | Удалить fallback NEXTAUTH_SECRET | TD-02 | 3h | 🔴 P0 |
| 1.2 | Зашифровать TOTP-секрет (AES-GCM) | TD-03 | 2h | 🔴 P0 |
| 1.3 | Включить `typescript.ignoreBuildErrors: false` | TD-05 | 1h | 🔴 P0 |
| 1.4 | Включить `reactStrictMode: true` | TD-06 | 0.5h | 🔴 P0 |
| 1.5 | Восстановить ESLint rules | TD-07 | 1h | 🟡 P1 |
| 1.6 | Удалить мёртвые зависимости | TD-08 | 1h | 🟡 P1 |

### Детали

#### 1.1 — Удалить fallback NEXTAUTH_SECRET (3h)

**Файлы:** `src/lib/auth.ts`

**До:**
```typescript
secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
```

**После:**
```typescript
const secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32"
  );
}
// ...
secret,
```

**Дополнительно:** Добавить аналогичные проверки для `DATABASE_URL`, `SMTP_*` (если email обязателен).

**Тестирование:** Запустить приложение без env vars — должно падать с понятным сообщением. Запустить с env vars — нормально работать.

---

#### 1.2 — Зашифровать TOTP-секрет (2h)

**Файлы:** `src/lib/crypto.ts` (расширить), `src/lib/totp.ts`, `prisma/schema.prisma`

**Новый код в crypto.ts:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encryptField(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Формат: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptField(encryptedBase64: string, key: Buffer): string {
  const buf = Buffer.from(encryptedBase64, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

let _encryptionKey: Buffer | null = null;
export function getEncryptionKey(): Buffer {
  if (_encryptionKey) return _encryptionKey;
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  _encryptionKey = Buffer.from(hex, "hex");
  return _encryptionKey;
}
```

**Миграция (одноразовый скрипт):**
```typescript
// scripts/migrate-totp-encryption.ts
// 1. Читаем всех пользователей с totpSecret
// 2. Шифруем каждый секрет через encryptField()
// 3. Обновляем запись в БД
```

**Обновить totp.ts:**
- `generateSecret()` — возвращать plaintext, но при сохранении в БД — шифровать
- `verifyToken()` — перед верификацией расшифровать `user.totpSecret`

---

#### 1.3 — Включить TypeScript checking (1h)

**Файл:** `next.config.ts`

```diff
- typescript: { ignoreBuildErrors: true },
+ typescript: { ignoreBuildErrors: false },
```

**Процесс:**
1. Запустить `next build` — собрать список всех TS-ошибок
2. Исправить по категориям:
   - Missing return types → добавить
   - Implicit any → добавить типы
   - Null/undefined access → добавить optional chaining или guards
3. Зафиксировать в отдельном коммите

**Ожидается:** 10-50 ошибок, преимущественно в route handlers и lib/ модулях.

---

#### 1.4 — Включить React Strict Mode (0.5h)

**Файл:** `next.config.ts`

```diff
- reactStrictMode: false,
+ reactStrictMode: true,
```

**Потенциальные проблемы и фиксы:**
- SSE singleton в `hooks.ts` — добавить cleanup в `useEffect`
- In-memory state в `globalThis` — не пострадает (глобальный)
- `useApiData` — проверить на множественный mount

---

#### 1.5 — Восстановить ESLint (1h)

**Файл:** `eslint.config.mjs`

Удалить текущий файл и пересоздать:
```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

Запустить `eslint . --fix`, исправить оставшееся вручную.

---

#### 1.6 — Удалить мёртвые зависимости (1h)

**Файл:** `package.json`

```bash
bun remove zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities next-intl sharp uuid
```

Проверить: `next build` — должен пройти. Запустить E2E тесты.

---

### Критерии готовности Спринта 1

- [ ] `NEXTAUTH_SECRET` отсутствует в env → приложение не стартует
- [ ] TOTP-секреты зашифрованы в БД
- [ ] `next build` проходит без TS-ошибок
- [ ] React Strict Mode включён, E2E тесты проходят
- [ ] ESLint находит реальные проблемы (не all-off)
- [ ] `bun install` → размер node_modules уменьшился
- [ ] Все Playwright E2E тесты зелёные

---

## Спринт 2: API Quality & UX Fixes (Неделя 2)

**Цель:** Централизованная обработка ошибок, исправление UX-проблем, безопасность форм

### Задачи

| ID | Задача | Техдолг | Оценка | Приоритет |
|----|--------|---------|--------|-----------|
| 2.1 | Централизованная обработка ошибок API | TD-09 | 3h | 🟡 P1 |
| 2.2 | Убрать window.location.reload() после логина | TD-10 | 2h | 🟡 P1 |
| 2.3 | Password complexity + confirm password | TD-11 | 2h | 🟡 P1 |
| 2.4 | Скрыть demo-credentials в production | TD-12 | 1h | 🟡 P1 |
| 2.5 | Убрать side effects из GET /team-invites/[token] | TD-13 | 2h | 🟡 P1 |

### Детали

#### 2.1 — Централизованная обработка ошибок (3h)

**Новый файл:** `src/lib/api-response.ts`

```typescript
import { NextResponse } from "next/server";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function error(message: string, status = 500, code?: string) {
  return NextResponse.json(
    { error: message, code },
    { status }
  );
}

export type ApiHandler = (
  req: Request,
  ctx: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error("[API Error]", err);
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return error("Database error", 503, "DB_ERROR");
      }
      return error("Internal server error", 500, "INTERNAL");
    }
  };
}
```

**Миграция route handlers (по одному):**
```diff
- export async function GET(req: Request) {
-   try {
-     // ... logic
-     return NextResponse.json(data);
-   } catch (err) {
-     return NextResponse.json({ error: "..." }, { status: 500 });
-   }
- }
+ export const GET = withErrorHandler(async (req) => {
+   // ... logic
+   return success(data);
+ });
```

**React Error Boundary:**
```typescript
// src/components/error-boundary.tsx
// Обёртка для dashboard/settings/admin — показывает fallback UI при ошибке
```

---

#### 2.2 — Убрать reload после логина (2h)

**Файл:** `src/components/auth/auth-form.tsx`

**Текущий код (проблемный):**
```typescript
setTimeout(() => window.location.reload(), 200);
```

**Исправление:**
```typescript
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

// После успешного логина:
const router = useRouter();
const queryClient = useQueryClient();

// Инвалидируем все кэши
queryClient.invalidateQueries();
// Навигируем (при SPA-архитектуре — меняем state, при файловой — push)
router.push("/dashboard");
```

**Примечание:** Полное исправление зависит от TD-01 (переход на файловую маршрутизацию). В текущей SPA-архитектуре — заменить reload на обновление state через callback от родительского компонента.

---

#### 2.3 — Password complexity + confirm (2h)

**Файлы:** `src/app/api/auth/register/route.ts`, `src/components/auth/auth-form.tsx`

**Zod-схема:**
```typescript
const passwordSchema = z
  .string()
  .min(8, "Minimum 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[0-9]/, "At least one digit")
  .regex(/[^A-Za-z0-9]/, "At least one special character");
```

**UI:**
- Добавить поле «Confirm password»
- Показывать требования в реальном времени (green checkmarks)
- Показывать strength indicator (weak/medium/strong)

---

#### 2.4 — Скрыть demo credentials (1h)

**Файл:** `src/components/auth/auth-form.tsx`

```diff
- <div className="text-xs text-muted-foreground">
-   Demo: demo@secscanner.io / demo12345<br/>
-   Admin: admin@secscanner.io / admin12345
- </div>
+ {process.env.NODE_ENV === "development" && (
+   <div className="text-xs text-muted-foreground">
+     Demo: demo@secscanner.io / demo12345<br/>
+     Admin: admin@secscanner.io / admin12345
+   </div>
+ )}
```

---

#### 2.5 — Исправить duplicate invite logic (2h)

**Файлы:** `src/app/api/team-invites/[token]/route.ts`, `src/app/api/team-invites/[token]/accept/route.ts`

**GET `/api/team-invites/[token]`** — убрать side effects:
```diff
  // УБРАТЬ: автоматическое создание membership
- if (existingUser && existingUser.email === invite.email) {
-   await prisma.teamMembership.create({...});
-   return success({...invite, status: "accepted"});
- }
+ // Только вернуть детали инвайта
+ return success(invite);
```

**POST `/api/team-invites/[token]/accept`** — оставить как единственную точку принятия:
```typescript
// Проверить: если membership уже существует — вернуть success без повторного создания
const existingMembership = await prisma.teamMembership.findUnique({
  where: { userId_teamId: { userId: session.user.id, teamId: invite.teamId } }
});
if (existingMembership) {
  return success({ message: "Already a member" });
}
```

---

### Критерии готовности Спринта 2

- [ ] Все API errors возвращают единообразный JSON `{ error, code }`
- [ ] Логин не вызывает `window.location.reload()`
- [ ] Регистрация требует сложный пароль с подтверждением
- [ ] Demo credentials не видны в production build
- [ ] GET `/team-invites/[token]` не создаёт membership
- [ ] Все E2E тесты проходят

---

## Спринт 3: Testing & API Improvements (Неделя 3)

**Цель:** Покрыть бизнес-логику тестами, добавить pagination, закрыть i18n gaps

### Задачи

| ID | Задача | Техдолг | Оценка | Приоритет |
|----|--------|---------|--------|-----------|
| 3.1 | Настроить Vitest + написать unit-тесты | TD-16 | 4h | 🟡 P1 |
| 3.2 | Закрыть i18n gaps в dashboard | TD-14 | 2h | 🟢 P2 |
| 3.3 | Добавить cursor-based pagination для сканов | TD-15 | 2h | 🟡 P1 |

### Детали

#### 3.1 — Unit-тесты (4h)

**Настройка:**
```bash
bun add -d vitest @testing-library/react @testing-library/jest-dom
```

**vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
```

**Файлы для тестирования (приоритет):**

| Модуль | Тесты | Файл |
|--------|-------|------|
| `dast.ts` | Генерация CWE, OWASP категории, severity distribution, determinism | `dast.test.ts` |
| `rate-limit.ts` | Sliding window, limit exceeded, different IPs | `rate-limit.test.ts` |
| `api-keys.ts` | Формат ключа, хеш, верификация, timing-safe | `api-keys.test.ts` |
| `crypto.ts` | Хеширование, верификация, шифрование/расшифрование | `crypto.test.ts` |
| `totp.ts` | Генерация secret, URI, QR, верификация кода | `totp.test.ts` |
| `teams.ts` | Slug generation, membership resolution | `teams.test.ts` |

**Минимальное покрытие:** 80% строк для каждого модуля.

---

#### 3.2 — i18n gaps (2h)

**Файлы:** `src/lib/i18n.ts`, `src/components/dashboard/history-tab.tsx`, `src/components/dashboard/scan-tab.tsx`

**Добавить ключи:**
```typescript
// English
recent_scans: "Recent scans",
total_scans: "Total scans",
avg_score: "Average score",
how_it_works: "How it works",
// ... и т.д.

// Russian
recent_scans: "Последние сканы",
total_scans: "Всего сканов",
avg_score: "Средний балл",
how_it_works: "Как это работает",
```

**Заменить хардкоженные строки:**
```diff
- <h2>Recent scans</h2>
+ <h2>{t("recent_scans")}</h2>
```

---

#### 3.3 — Cursor pagination (2h)

**Файлы:** `src/app/api/scans/route.ts`, `src/components/dashboard/history-tab.tsx`, `src/components/dashboard/hooks.ts`

**API:**
```
GET /api/scans?cursor=<scanId>&limit=20

Response:
{
  "data": [...scans],
  "pagination": {
    "nextCursor": "cm2xyz..." | null,
    "hasMore": true | false,
    "total": 142
  }
}
```

**Реализация:**
```typescript
const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
const cursor = req.nextUrl.searchParams.get("cursor");

const scans = await prisma.scan.findMany({
  take: limit + 1, // +1 чтобы знать есть ли следующая страница
  ...(cursor && {
    cursor: { id: cursor },
    skip: 1, // пропустить cursor сам
  }),
  where: { userId: session.user.id },
  orderBy: { startedAt: "desc" },
  include: { vulnerabilities: true },
});

const hasMore = scans.length > limit;
const data = hasMore ? scans.slice(0, limit) : scans;
const total = await prisma.scan.count({ where: { userId: session.user.id } });

return success({
  data,
  pagination: {
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
    total,
  },
});
```

**Клиент:**
```typescript
// hooks.ts — заменить useScans на useInfiniteQuery
export function useScansInfinite() {
  return useInfiniteQuery({
    queryKey: ["scans"],
    queryFn: ({ pageParam }) =>
      fetch(`/api/scans?cursor=${pageParam || ""}&limit=20`).then(r => r.json()),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}
```

---

### Критерии готовности Спринта 3

- [ ] Vitest настроен, `bun run test` выполняется
- [ ] Все lib/ модули покрыты unit-тестами (≥80% строк)
- [ ] Dashboard полностью интернационализирован (EN + RU)
- [ ] `/api/scans` поддерживает cursor pagination
- [ ] HistoryTab использует infinite scroll
- [ ] Все E2E тесты проходят

---

## Спринт 4: App Router Migration (Неделя 4-5)

**Цель:** Перейти от SPA-антипаттерна к правильной файловой маршрутизации App Router

**Это самый крупный рефакторинг — занимает 2 недели**

### Задачи

| ID | Задача | Техдолг | Оценка | Приоритет |
|----|--------|---------|--------|-----------|
| 4.1 | Создать структуру директорий и layouts | TD-01 | 4h | 🔴 P0 |
| 4.2 | Перенести Landing на `/` (public) | TD-01 | 3h | 🔴 P0 |
| 4.3 | Перенести Dashboard на `/dashboard/*` | TD-01 | 5h | 🔴 P0 |
| 4.4 | Перенести Settings на `/settings/*` | TD-01 | 3h | 🔴 P0 |
| 4.5 | Перенести Admin на `/admin/*` | TD-01 | 2h | 🔴 P0 |
| 4.6 | Обновить middleware для page routes | TD-01 | 2h | 🔴 P0 |
| 4.7 | CSP: убрать unsafe-eval/unsafe-inline в prod | TD-04 | 2h | 🟡 P1 |

### Целевая структура

```
src/app/
├── (public)/
│   ├── layout.tsx              # Public layout (no auth required)
│   ├── page.tsx                # Landing page (SSR/SSG для SEO)
│   └── privacy/
│       └── page.tsx
├── (auth)/
│   ├── layout.tsx              # Auth layout (navbar, requires session)
│   ├── dashboard/
│   │   ├── page.tsx            # ScanTab (default)
│   │   ├── scans/
│   │   │   └── page.tsx        # HistoryTab
│   │   ├── teams/
│   │   │   └── page.tsx        # TeamsTab
│   │   ├── keys/
│   │   │   └── page.tsx        # ApiKeysTab
│   │   └── billing/
│   │       └── page.tsx        # BillingTab
│   ├── settings/
│   │   ├── page.tsx            # ProfileTab (default)
│   │   ├── appearance/
│   │   │   └── page.tsx
│   │   ├── notifications/
│   │   │   └── page.tsx
│   │   └── security/
│   │       └── page.tsx        # Password + 2FA
│   └── admin/
│       ├── page.tsx            # ContentEditor (default)
│       ├── products/
│       │   └── page.tsx
│       └── audit/
│           └── page.tsx
├── api/                         # Без изменений
│   └── ...
└── layout.tsx                   # Root layout (fonts, providers)
```

### Пошаговый план

#### 4.1 — Структура и layouts (4h)

1. Создать `(public)/layout.tsx`:
```typescript
// Server component — no SessionProvider needed
export default function PublicLayout({ children }) {
  return <>{children}</>;
}
```

2. Создать `(auth)/layout.tsx`:
```typescript
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";

export default async function AuthLayout({ children }) {
  const session = await getServerSession();
  if (!session) redirect("/");
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}
```

3. Обновить middleware:
```typescript
// Защищать /dashboard/*, /settings/*, /admin/*
// Пропускать /, /privacy, /api/*
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("next-auth.session-token")?.value;

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/settings") || pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  // ... rest of API auth logic
}
```

#### 4.2-4.5 — Перенос компонентов

Для каждого экрана:
1. Создать `page.tsx` в нужной директории
2. Перенести код из tab-компонента
3. Обновить импорты
4. Проверить SSR-совместимость (все data fetching через React Query, не useEffect на mount)
5. Обновить навигацию в Navbar (использовать `next/link` вместо state)

#### 4.7 — Production CSP (2h)

**Файл:** `next.config.ts` + `src/middleware.ts`

```typescript
// next.config.ts
const csp = process.env.NODE_ENV === "production"
  ? "default-src 'self'; script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'nonce-{NONCE}'; img-src 'self' https: data:; font-src 'self'; connect-src 'self';"
  : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:;";

// middleware.ts — подставить nonce
const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
const cspWithNonce = csp.replace(/{NONCE}/g, nonce);
response.headers.set("Content-Security-Policy", cspWithNonce);
```

---

### Критерии готовности Спринта 4

- [ ] `/` — SSR-рендер лендинга (view source показывает HTML контент)
- [ ] `/dashboard` — требует авторизации, redirect на `/` если нет сессии
- [ ] `/dashboard/teams`, `/settings/security` — глубинные ссылки работают
- [ ] Кнопка «Назад» в браузере переключает экраны
- [ ] Code-splitting: лендинг не содержит dashboard-код в JS бандле
- [ ] CSP в production не содержит unsafe-eval/unsafe-inline
- [ ] SEO: `<title>`, `<meta description>`, OG tags рендерятся серверно
- [ ] Все E2E тесты обновлены и проходят

---

## Спринт 5: DevOps, Performance, Documentation (Неделя 6)

**Цель:** Воспроизводимый деплой, производительность, документация API

### Задачи

| ID | Задача | Техдолг | Оценка | Приоритет |
|----|--------|---------|--------|-----------|
| 5.1 | Создать Dockerfile + docker-compose | TD-17 | 3h | 🟡 P1 |
| 5.2 | Кэширование PDF-отчётов | TD-18 | 2h | 🟢 P2 |
| 5.3 | Добавить /api/health endpoint | TD-17 | 1h | 🟡 P1 |
| 5.4 | OpenAPI/Swagger документация | TD-20 | 2h | 🟢 P2 |
| 5.5 | Документировать in-memory ограничения | TD-19 | 1h | 🟢 P2 |
| 5.6 | Обновить package.json metadata | — | 0.5h | 🟢 P2 |

### Детали

#### 5.1 — Dockerfile (3h)

```dockerfile
# Stage 1: Build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
RUN cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

# Stage 2: Runtime
FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    volumes:
      - app-data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/secscanner.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on: [app]

volumes:
  app-data:
```

#### 5.3 — Health endpoint (1h)

**Файл:** `src/app/api/health/route.ts`

```typescript
import { success } from "@/lib/api-response";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;
    return success({
      status: "healthy",
      version: "1.0.0",
      uptime: process.uptime(),
      db: { status: "ok", latencyMs: dbLatency },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return error("Database unreachable", 503, "DB_UNHEALTHY");
  }
}
```

#### 5.5 — Документировать in-memory (1h)

**Файл:** `docs/ARCHITECTURE_LIMITATIONS.md`

Описать:
- Rate limiter: in-memory, сбрасывается при перезапуске
- SSE hub: привязан к одному процессу
- Не совместимо с multi-instance / serverless
- Путь миграции на Redis

---

### Критерии готовности Спринта 5

- [ ] `docker-compose up` — приложение стартует и работает
- [ ] `/api/health` — возвращает статус БД и uptime
- [ ] PDF отчёт генерируется один раз, повторный запрос — из кэша
- [ ] `/api/docs` — Swagger UI с описанием всех 30 endpoint'ов
- [ ] README обновлён с инструкцией docker-compose
- [ ] package.json name = "sec-scanner"

---

## Спринт 6: Next-Gen Features (Неделя 7+)

**Цель:** Подготовка к production-масштабированию

### Задачи

| ID | Задача | Оценка | Приоритет |
|----|--------|--------|-----------|
| 6.1 | Миграция next-auth v4 → Auth.js v5 | 8h | 🟢 P3 |
| 6.2 | Redis для rate limiter + SSE pub/sub | 4h | 🟢 P3 |
| 6.3 | Stripe интеграция для BillingTab | 8h | 🟡 P2 |
| 6.4 | CI/CD pipeline (GitHub Actions) | 3h | 🟡 P2 |
| 6.5 | Миграция SQLite → PostgreSQL (опционально) | 4h | 🟢 P3 |

### Зависимости

```
Спринт 1 (Foundation)
    ↓
Спринт 2 (API Quality)
    ↓
Спринт 3 (Testing)
    ↓
Спринт 4 (App Router) ← самый длинный, 2 недели
    ↓
Спринт 5 (DevOps)
    ↓
Спринт 6 (Next-Gen) ← может начинаться параллельно с 5
```

### Quick Wins (можно сделать в любой момент)

| Задача | Оценка | Влияние |
|--------|--------|---------|
| Переименовать `package.json` name | 5 min | Профессиональный вид |
| Добавить `.env.example` с всеми переменными | 15 min | Упрощает onboarding |
| Добавить `tsconfig.json` noImplicitAny: true | 1h | Повышает типобезопасность |
| Встроить шрифты в PDF через Font.register() | 30 min | Portable PDF |
| Добавить favicon.ico и OG image | 30 min | Брендинг |
| `npm run lint` в CI | 15 min | Качество кода |

---

## Резюме

| Спринт | Тема | Часы | Ключевой результат |
|--------|------|------|---------------------|
| 1 | Foundation & Security | 8.5h | Безопасная конфигурация, TS/ESLint включены |
| 2 | API Quality & UX | 10h | Единообразные ошибки, правильный логин, безопасные формы |
| 3 | Testing & API | 8h | Unit-тесты, pagination, полная i18n |
| 4 | App Router Migration | 21h | SSR, code-splitting, глубинные ссылки |
| 5 | DevOps & Perf | 9.5h | Docker, health check, PDF cache, Swagger |
| 6 | Next-Gen | 27h | Auth.js v5, Redis, Stripe, CI/CD |
| **Итого** | | **84h** | **Production-ready Sec Scanner** |