> **Superseded by:** [PLATFORM_AUDIT.md (Bottlenecks section)](../PLATFORM_AUDIT.md (Bottlenecks section))
> **Archived reason:** 20 tech debt items, superseded by Platform Audit
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# TECH_DEBT.md — Sec Scanner

> **Дата:** 2026-07-14  
> **Версия:** 0.2.0  
> **Общий оценочный техдолг:** ~45 человеко-часов

---

## Сводная таблица

| ID | Категория | Серьёзность | Оценка (ч) | Спринт |
|----|-----------|-------------|------------|--------|
| TD-01 | Архитектура | 🔴 Critical | 16 | 1-2 |
| TD-02 | Безопасность | 🔴 Critical | 3 | 1 |
| TD-03 | Безопасность | 🔴 Critical | 2 | 1 |
| TD-04 | Безопасность | 🟡 High | 2 | 2 |
| TD-05 | Конфигурация | 🔴 Critical | 1 | 1 |
| TD-06 | Конфигурация | 🔴 Critical | 0.5 | 1 |
| TD-07 | Конфигурация | 🟡 High | 1 | 1 |
| TD-08 | Зависимости | 🟡 Medium | 1 | 1 |
| TD-09 | Архитектура | 🟡 Medium | 3 | 2 |
| TD-10 | Код | 🟡 Medium | 2 | 2 |
| TD-11 | UX/Безопасность | 🟡 Medium | 2 | 2 |
| TD-12 | UX | 🟡 Medium | 1 | 2 |
| TD-13 | Код | 🟡 Medium | 2 | 3 |
| TD-14 | i18n | 🟢 Low | 2 | 3 |
| TD-15 | API | 🟡 Medium | 2 | 3 |
| TD-16 | Тесты | 🟡 Medium | 4 | 3-4 |
| TD-17 | DevOps | 🟡 Medium | 3 | 4 |
| TD-18 | Производительность | 🟢 Low | 2 | 4 |
| TD-19 | БД | 🟢 Low | 1 | 5 |
| TD-20 | API | 🟢 Low | 2 | 5 |

---

## TD-01: SPA-антипаттерн на единственном маршруте

**Категория:** Архитектура  
**Серьёзность:** 🔴 Critical  
**Оценка:** 16 часов  
**Затронутые файлы:** `src/app/page.tsx`, `src/components/providers.tsx`, `src/middleware.ts`, все `*-tab.tsx`, `settings.tsx`, `admin-panel.tsx`, `landing.tsx`

**Описание:**
Приложение использует Next.js App Router, но полностью игнорирует файловую маршрутизацию. Весь UI рендерится на `/` через клиентский условный рендеринг (`useSession()` → выбор компонента). Это нарушает основную парадигму Next.js и создаёт каскад проблем.

**Последствия:**
- **Нет code-splitting** — весь JS (Landing + Dashboard + Settings + Admin) загружается одним бандлом. Лендинг для анонимного пользователя тянет за собой весь код дашборда и админки
- **Нет SSR для лендинга** — поисковые боты видят пустой `<div>` вместо контента. SEO полностью отсутствует
- **Нет глубинных ссылок** — невозможно поделиться ссылкой на `/dashboard/teams` или `/settings/security`
- **Браузерная навигация сломана** — кнопка «Назад» не переключает экраны
- **Бесполезный middleware** — middleware работает для `/api/*`, но для page routes Next.js не маршрутизирует, поэтому middleware на `/dashboard/*` и `/settings/*` не будет работать при переходе на файловую маршрутизацию

**План исправления:**
1. Создать структуру директорий: `app/(public)/`, `app/(auth)/dashboard/`, `app/(auth)/settings/`, `app/(auth)/admin/`
2. Реализовать layout'ы с общим navbar
3. Перенести компоненты в соответствующие page.tsx
4. Настроить middleware для защиты `(auth)/*` групп
5. Добавить redirect с `/` на `/dashboard` для аутентифицированных пользователей

---

## TD-02: Fallback NEXTAUTH_SECRET хардкоджен

**Категория:** Безопасность  
**Серьёзность:** 🔴 Critical  
**Оценка:** 3 часа  
**Затронутые файлы:** `src/lib/auth.ts`

**Описание:**
В `auth.ts` при отсутствии переменной окружения `NEXTAUTH_SECRET` используется fallback-значение `"dev-secret-change-in-production"`. Если в production.env файл не содержит эту переменную (опечатка, забыли при деплое), JWT-токены будут подписаны известным секретом — любой человек сможет подделать сессию с любой ролью, включая admin.

**Текущий код:**
```typescript
secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
```

**План исправления:**
1. Убрать fallback — если `NEXTAUTH_SECRET` не задан, приложение должно падать при старте
2. Добавить проверку в `server.js` или в модуле `auth.ts`
3. Добавить в CI/CD pipeline проверку наличия секретов

---

## TD-03: TOTP-секрет хранится в открытом виде

**Категория:** Безопасность  
**Серьёзность:** 🔴 Critical  
**Оценка:** 2 часа  
**Затронутые файлы:** `src/lib/totp.ts`, `prisma/schema.prisma`

**Описание:**
`totpSecret` в модели User хранится как plaintext base32 строка. При компрометации базы данных (SQL-инъекция, бэкап утечка, физический доступ к серверу) атакующий получит все TOTP-секреты и сможет генерировать валидные 2FA-коды для любых аккаунтов.

В коде есть TODO-комментарий об этом: требуется AES-GCM шифрование.

**План исправления:**
1. Создать утилиту `crypto.ts` → `encryptField(plaintext, key)` / `decryptField(ciphertext, key)`
2. Использовать `ENCRYPTION_KEY` из переменных окружения (32 байта, hex-encoded)
3. Миграция: прочитать все plaintext секреты, зашифровать, записать обратно
4. Обновить `totp.ts` для расшифровки перед генерацией/верификацией

---

## TD-04: CSP содержит unsafe-eval и unsafe-inline

**Категория:** Безопасность  
**Серьёзность:** 🟡 High  
**Оценка:** 2 часа  
**Затронутые файлы:** `next.config.ts`

**Описание:**
Content Security Policy в `next.config.ts` включает `script-src 'unsafe-eval' 'unsafe-inline'`. Это необходимо для Next.js dev HMR, но в production полностью нейтрализует CSP — атакующий может внедрить произвольный JavaScript через XSS.

**План исправления:**
1. Разделить CSP для dev и production
2. В production: использовать nonce-based scripts через middleware (Next.js поддерживает `headers()` с nonce)
3. Убрать `unsafe-eval` (Next.js 16 не требует его в production)
4. Убрать `unsafe-inline` → заменить на nonce для style-src

---

## TD-05: typescript.ignoreBuildErrors: true

**Категория:** Конфигурация  
**Серьёзность:** 🔴 Critical  
**Оценка:** 1 час  
**Затронутые файлы:** `next.config.ts`

**Описание:**
TypeScript ошибки полностью игнорируются при сборке. Это означает, что типовые баги (null reference, неверные пропсы, отсутствие полей в ответах API) могут пройти в production без обнаружения. Сборка «успешна» даже если код не компилируется.

**План исправления:**
1. Установить `typescript.ignoreBuildErrors: false`
2. Запустить `next build` и исправить все ошибки (ожидается 10-50 ошибок)
3. Настроить CI для отказа сборки при TS-ошибках

---

## TD-06: reactStrictMode: false

**Категория:** Конфигурация  
**Серьёзность:** 🔴 Critical  
**Оценка:** 0.5 часа  
**Затронутые файлы:** `next.config.ts`

**Описание:**
React Strict Mode отключён. Это означает, что в dev-режиме компоненты не рендерятся дважды, что скрывает баги с side effects в render, некорректную очистку эффектов, и проблемы с concurrency.

**План исправления:**
1. Установить `reactStrictMode: true`
2. Исправить все предупреждения, которые появятся (ожидается проблемы с SSE singleton, in-memory state)
3. Обернуть side effects в `useEffect` cleanup

---

## TD-07: ESLint полностью отключён

**Категория:** Конфигурация  
**Серьёзность:** 🟡 High  
**Оценка:** 1 час  
**Затронутые файлы:** `eslint.config.mjs`

**Описание:**
В `eslint.config.mjs` все правила ESLint установлены в `"off"`. Инструмент фактически не работает — нет проверки код-стиля, нет обнаружения неиспользуемых переменных, нет предупреждений о потенциальных багах. Команда `npm run lint` выполняется безрезультатно.

**План исправления:**
1. Удалить кастомный `eslint.config.mjs`
2. Пересоздать через `npx @eslint/init` или использовать преднастроенный `next/core-web-vitals` без переопределений
3. Запустить `eslint --fix` для автоисправлений
4. Оставшиеся ошибки исправить вручную

---

## TD-08: Мёртвые зависимости в package.json

**Категория:** Зависимости  
**Серьёзность:** 🟡 Medium  
**Оценка:** 1 час  
**Затронутые файлы:** `package.json`

**Описание:**
7 пакетов указаны в dependencies, но нигде не импортируются в production-коде:
- `zustand@5.0.6` — state manager, не используется
- `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2` — drag-and-drop, не используется
- `next-intl@4.3.4` — i18n библиотека, не используется (кастомная реализация в `src/lib/i18n.ts`)
- `sharp@0.34.3` — image processing, не используется
- `uuid@11.1.0` — UUID генерация, не используется (Prisma CUID)

Это увеличивает размер `node_modules`, время установки и потенциально размер production-бандла (tree-shaking может не убрать всё, особенно sharp — native модуль).

**План исправления:**
1. `bun remove zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities next-intl sharp uuid`
2. Убедиться, что `next build` проходит без ошибок
3. Запустить все тесты

---

## TD-09: Отсутствие error boundary и централизованной обработки ошибок API

**Категория:** Архитектура  
**Серьёзность:** 🟡 Medium  
**Оценка:** 3 часа  
**Затронутые файлы:** все `src/app/api/*/route.ts` (30 файлов)

**Описание:**
Каждый API route handler обрабатывает ошибки по-своему. Нет единого формата ответа об ошибке, нет глобального error handler. При непредвиденной ошибке (баг в Prisma, network timeout) клиент может получить неструктурированный ответ.

**План исправления:**
1. Создать `src/lib/api-response.ts` — утилиты `success(data)`, `error(message, status)`, `handleError(err)`
2. Создать wrapper `withErrorHandler(handler)` для route handlers
3. Унифицировать формат ошибок: `{ error: string, code?: string, details?: unknown }`
4. Добавить React Error Boundary для клиентских компонентов

---

## TD-10: window.location.reload() после логина

**Категория:** Код  
**Серьёзность:** 🟡 Medium  
**Оценка:** 2 часа  
**Затронутые файлы:** `src/components/auth/auth-form.tsx`

**Описание:**
После успешной аутентификации используется `setTimeout(() => window.location.reload(), 200)` для обновления состояния сессии. Это грубый хак, который:
- Сбрасывает всё состояние приложения (React Query cache, формы, i18n)
- Зависит от тайминга (200ms — magic number)
- Плохой UX — видна «мелькание» страницы

**План исправления:**
1. Использовать `router.push('/dashboard')` после login
2. Или `session.update()` из next-auth для обновления сессии без reload
3. Инвалидировать React Query cache: `queryClient.invalidateQueries()`

---

## TD-11: Нет password complexity enforcement

**Категория:** UX / Безопасность  
**Серьёзность:** 🟡 Medium  
**Оценка:** 2 часа  
**Затронутые файлы:** `src/app/api/auth/register/route.ts`, `src/components/auth/auth-form.tsx`

**Описание:**
Регистрация требует только `min(8)` символов для пароля. Нет требований к заглавным буквам, цифрам, специальным символам. Нет проверки на commonly used passwords. Нет подтверждения пароля.

**План исправления:**
1. Добавить Zod-схему: min 8, 1 uppercase, 1 digit, 1 special
2. Добавить поле «Confirm password» в форму регистрации
3. Добавить визуальный индикатор сложности пароля
4. Проверять against top-10000 common passwords (необязательно)

---

## TD-12: Demo-credentials видны в production

**Категория:** UX  
**Серьёзность:** 🟡 Medium  
**Оценка:** 1 час  
**Затронутые файлы:** `src/components/auth/auth-form.tsx`

**Описание:**
На форме входа отображаются демо-credentials (`demo@secscanner.io / demo12345` и `admin@secscanner.io / admin12345`) для всех посетителей. В production это раскрывает существующие аккаунты и облегчает brute-force атаки.

**План исправления:**
1. Обернуть в `process.env.NODE_ENV === "development"`
2. Или показывать только при включённом feature flag
3. Или убрать полностью — продвинутые пользователи могут создать тестовый аккаунт сами

---

## TD-13: Дублирование логики invite (GET partial accept + POST full accept)

**Категория:** Код  
**Серьёзность:** 🟡 Medium  
**Оценка:** 2 часа  
**Затронутые файлы:** `src/app/api/team-invites/[token]/route.ts`, `src/app/api/team-invites/[token]/accept/route.ts`

**Описание:**
GET `/api/team-invites/[token]` содержит логику частичного принятия инвайта (если пользователь уже авторизован с matching email — создаёт membership). POST `/api/team-invites/[token]/accept` — полный accept с транзакцией. Это дублирование может привести к race condition и double-processing.

**План исправления:**
1. Убрать side effects из GET-эндпоинта (GET должен быть idempotent)
2. GET — только возвращает детали инвайта
3. POST `/accept` — единственная точка принятия инвайта
4. Если пользователь уже member — вернуть redirect/success без повторного создания

---

## TD-14: Неполная интернационализация (i18n gaps)

**Категория:** i18n  
**Серьёзность:** 🟢 Low  
**Оценка:** 2 часа  
**Затронутые файлы:** `src/components/dashboard/history-tab.tsx`, `src/components/dashboard/scan-tab.tsx`, `src/content/default-content.ts`

**Описание:**
Некоторые компоненты дашборда содержат хардкоженные английские строки, не прошедшие через `t()` функцию. Примеры: "Recent scans", "Total scans", "How it works". Russian-локализованный CMS-контент не поддерживается — `defaultContentRu` всегда используется как fallback.

**План исправления:**
1. Добавить недостающие ключи в `src/lib/i18n.ts`
2. Заменить хардкоженные строки на `t('key')` в dashboard-компонентах
3. Рассмотреть поддержку RU-контента в CMS (разделить SiteContent на `key_en` + `key_ru` или добавить `locale` column)

---

## TD-15: Нет pagination для списка сканов

**Категория:** API  
**Серьёзность:** 🟡 Medium  
**Оценка:** 2 часа  
**Затронутые файлы:** `src/app/api/scans/route.ts`, `src/components/dashboard/history-tab.tsx`

**Описание:**
`GET /api/scans` возвращает только 50 последних записей (`take: 50`). Нет курсора, offset, или total count. При накоплении данных пользователь не сможет посмотреть старые сканы.

**План исправления:**
1. Добавить cursor-based pagination: `?cursor=<scanId>&limit=20`
2. Вернуть `{ data: Scan[], nextCursor: string | null, total: number }`
3. Реализовать infinite scroll в HistoryTab через React Query `useInfiniteQuery`

---

## TD-16: Отсутствие unit и integration тестов

**Категория:** Тесты  
**Серьёзность:** 🟡 Medium  
**Оценка:** 4 часа  
**Затронутые файлы:** нет (нужно создать `src/__tests__/`)

**Описание:**
Все тесты — E2E через Playwright. Нет unit-тестов для критической бизнес-логики:
- `dast.ts` — детерминированный генератор уязвимостей (нет тестов на формат CWE, OWASP)
- `rate-limit.ts` — sliding window (нет тестов на граничные условия)
- `api-keys.ts` — генерация и верификация ключей
- `totp.ts` — генерация и верификация TOTP
- `crypto.ts` — хеширование паролей
- `teams.ts` — генерация slug, resolution membership
- API route handlers — нет integration тестов

E2E тесты зависят от запущенного dev-сервера и используют `resetRateLimits()` хак.

**План исправления:**
1. Настроить Vitest
2. Написать unit-тесты для всех lib/ модулей (приоритет: dast, rate-limit, api-keys, crypto)
3. Написать integration тесты для критичных API routes (auth, 2fa, scans)
4. Настроить CI для автозапуска тестов

---

## TD-17: Нет Dockerfile и CI/CD pipeline

**Категория:** DevOps  
**Серьёзность:** 🟡 Medium  
**Оценка:** 3 часа  
**Затронутые файлы:** нет (нужно создать `Dockerfile`, `.github/workflows/`)

**Описание:**
Деплоймент реализован через кастомные shell-скрипты в `.zscripts/`. Нет Dockerfile для воспроизводимого билда. Нет CI/CD pipeline для автоматического тестирования и деплоя. Нет health-check endpoint для мониторинга.

**План исправления:**
1. Создать multi-stage Dockerfile (Bun for build, Node.js slim for runtime)
2. Добавить `docker-compose.yml` (app + SQLite volume + Caddy)
3. Создать GitHub Actions workflow: lint → type-check → test → build → push image
4. Добавить `/api/health` endpoint (check DB, env vars, uptime)

---

## TD-18: PDF генерируется заново на каждый запрос

**Категория:** Производительность  
**Серьёзность:** 🟢 Low  
**Оценка:** 2 часа  
**Затронутые файлы:** `src/app/api/scans/[id]/pdf/route.ts`, `src/lib/pdf-report.tsx`

**Описание:**
При GET-запросе PDF-отчёта, `@react-pdf/renderer` генерирует PDF с нуля. Для скана с 7 уязвимостями это может занять 2-5 секунд. Повторные запросы не кэшируются. Шрифты хардкоджены на `/usr/share/fonts/truetype/dejavu/`.

**План исправления:**
1. Сохранять сгенерированный PDF в файловую систему или SQLite BLOB
2. При повторном запросе отдавать из кэша
3. Инвалидировать кэш при изменении скана
4. Встроить шрифты через `@react-pdf/renderer` Font.register() вместо системных путей

---

## TD-19: В-memory state не совместим с multi-instance

**Категория:** БД / Инфраструктура  
**Серьёзность:** 🟢 Low  
**Оценка:** 1 час (документирование)  
**Затронутые файлы:** `src/lib/rate-limit.ts`, `src/lib/sse.ts`

**Описание:**
Rate limiter (sliding window) и SSE hub хранятся в `globalThis`. Это работает для single-instance VPS, но полностью ломается при:
- Horizontal scaling (multiple containers/processes)
- Serverless deployment
- Rolling updates (state теряется при перезапуске)

**План исправления (краткосрочный):**
1. Документировать ограничение в README
2. Добавить warning в лог при старте

**План исправления (долгосрочный):**
1. Redis для rate limiter
2. Redis Pub/Sub для SSE (или Socket.IO с Redis adapter)

---

## TD-20: Нет OpenAPI/Swagger документации для API

**Категория:** API  
**Серьёзность:** 🟢 Low  
**Оценка:** 2 часа  
**Затронутые файлы:** нет (нужно создать)

**Описание:**
30 API-endpoint'ов описаны только в комментариях и ARCHITECTURE_AUDIT.md. Нет машиночитаемого описания API. Это затрудняет интеграцию для внешних разработчиков, использующих API-ключи, и не даёт автоматической генерации клиентских SDK.

**План исправления:**
1. Создать `src/app/api/docs/route.ts` с OpenAPI JSON
2. Добавить Swagger UI (можно через `swagger-ui-react`)
3. Документировать все endpoints с request/response schemas