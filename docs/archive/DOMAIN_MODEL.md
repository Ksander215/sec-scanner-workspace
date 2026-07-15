> **Superseded by:** [DOMAIN_MODEL_V2.md](../DOMAIN_MODEL_V2.md)
> **Archived reason:** v1 domain model, superseded by v2
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# DOMAIN_MODEL.md — Sec Scanner

> **Дата:** 2026-07-14  
> **Версия:** 0.2.0  
> **Тип:** Анализ доменной модели (без изменения кода)

---

## 1. Что Sec Scanner продаёт

Sec Scanner — это SaaS-продукт для **непрерывного динамического тестирования безопасности веб-приложений** (Continuous DAST). Ценностное предложение: «Найди уязвимости до того, как это сделают атакующие».

Продукт продаёт **результат сканирования**, а не инструмент. Пользователь не настраивает правила, не пишет скрипты — он указывает URL и получает готовый отчёт с CWE-ссылками и рекомендациями по исправлению. Это ключевой продуктовый выбор, который определяет всю доменную модель.

---

## 2. Доменные сущности (настоящие vs текущие)

### 2.1 Карта: что есть vs что должно быть

```
ТЕКУЩАЯ МОДЕЛЬ (БД)              ЦЕЛЕВАЯ МОДЕЛЬ (продукт)
─────────────────────            ─────────────────────────
User                              User (Account)
Scan                              Scan
Vulnerability                     Vulnerability
Team                              Organization (Workspace)
TeamMembership                    Workspace Membership
TeamInvite                        Workspace Invitation
ApiKey                            ApiKey
SiteContent                       — (инфраструктура, не домен)
StoreProduct                      Plan / Subscription
AuditLog                          — (инфраструктура, не домен)
                                  Target (ОТСУТСТВУЕТ)
                                  Project (ОТСУТСТВУЕТ)
                                  Schedule (ОТСУТСТВУЕТ)
                                  Report (ОТСУТСТВУЕТ — есть только PDF)
                                  Notification (ОТСУТСТВУЕТ — есть только email)
                                  Subscription (ОТСУТСТВУЕТ — есть только UI)
                                  Lead (ОТСУТСТВУЕТ — PII в audit log)
```

**Ключевой разрыв:** в текущей модели нет сущностей **Target** и **Project**. Пользователь сканирует URL напрямую, без группировки и истории по целям. Это фундаментальное ограничение для масштабирования продукта.

---

## 3. Полная доменная модель

### 3.1 Сущность: User (Account)

**Определение:** Зарегистрированный пользователь платформы. Может быть физлицом (freelancer, security researcher) или представителем организации.

**Атрибуты:**
| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | string | Уникальный идентификатор |
| email | string | Логин, уникальный, lowercase |
| passwordHash | string? | Null для OAuth-пользователей |
| name | string? | Отображаемое имя |
| role | enum | `user` \| `admin` |
| oauthProvider | enum? | `google` \| `github` \| null |
| totpSecret | string? | Зашифрованный TOTP-secret |
| totpEnabled | boolean | Включён ли 2FA |
| preferences | object | Тема, уведомления, язык |

**Доменное поведение:**
- Регистрируется через credentials или OAuth
- Включает/отключает 2FA
- Управляет профилем и настройками
- Является owner/member workspace'ов
- Владеет API-ключами
- Принимает решения о покупке (когда коммерция будет реализована)

**Что НЕ является доменным поведением:**
- Хеширование пароля (инфраструктура)
- JWT-генерация (инфраструктура)
- Rate limiting (инфраструктура)
- Audit logging (инфраструктура)

---

### 3.2 Сущность: Workspace (текущая: Team)

**Определение:** Организационная единица, объединяющая пользователей для совместной работы над целями сканирования. Workspace — это не «команда разработчиков», а **контекст безопасности** — набор целей, которые сканируются и отслеживаются вместе.

**Переименование:** В коде сущность называется `Team`, но семантически это `Workspace`. Команда — это люди. Workspace — это контекст (цели, сканы, настройки). Рекомендую переименовать.

**Атрибуты:**
| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | string | Уникальный идентификатор |
| name | string | Человекочитаемое название |
| slug | string | URL-friendly идентификатор |
| ownerId | string | Владелец workspace |
| subscription | Plan? | Текущий план (когда будет коммерция) |

**Роли:**
- **Owner** — полный контроль, удаление workspace, платёжные настройки
- **Admin** — управление участниками, создание сканов, управление целями
- **Member** — просмотр сканов, запуск сканов, скачивание отчётов

**Доменное поведение:**
- Создаётся пользователем (owner)
- Принимает новых участников через инвайт
- Объединяет Targets и Projects
- Имеет общие настройки сканирования и уведомлений

---

### 3.3 Сущность: Target (ОТСУТСТВУЕТ — критический пробел)

**Определение:** Конкретный URL или группа URL, которые являются объектом сканирования. Target — это **что сканируем**, Scan — это **результат одного прогона**.

**Почему это критично:**
- Сейчас пользователь вводит URL при каждом скане. Нет истории по целям.
- Невозможно отследить динамику безопасности конкретного приложения
- Невозможно настроить расписание для конкретной цели
- Нет группировки сканов по целям

**Целевые атрибуты:**
| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | string | Уникальный идентификатор |
| workspaceId | string? | Привязка к workspace (null = personal) |
| url | string | Базовый URL цели |
| name | string | Человекочитаемое название |
| lastScanAt | DateTime? | Время последнего скана |
| lastScore | int? | Оценка последнего скана |
| scoreTrend | enum? | `improving` \| `stable` \| `degrading` |
| tags | string[] | Произвольные метки |

**Доменное поведение:**
- Создаётся пользователем внутри workspace или personal
- Накапливает историю сканов
- Показывает тренд безопасности во времени
- Может быть привязан к расписанию (когда появится)

---

### 3.4 Сущность: Project (ОТСУТСТВУЕТ — будущий модуль)

**Определение:** Логическая группировка целей. Например, «Production API» = [api.example.com, admin.example.com], «Staging» = [staging.example.com].

**Зачем нужен:** Когда у пользователя 10+ целей, нужна группировка. Это также открывает возможность **сравнения** (production vs staging) и **дифференциальных отчётов**.

**Статус:** Не нужен на текущем этапе. Целесообразен при масштабировании до 50+ целей у одного workspace.

---

### 3.5 Сущность: Scan

**Определение:** Один прогон DAST-сканера по конкретному target. Это **событие** во времени, а не постоянный объект. У скана есть жизненный цикл.

**Жизненный цикл:**
```
pending → scanning → completed
                    → failed
```

**Атрибуты:**
| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | string | Уникальный идентификатор |
| targetId | string | Ссылка на Target (сейчас: прямой URL) |
| workspaceId | string? | Привязка к workspace |
| userId | string | Кто запустил |
| status | enum | `pending` \| `scanning` \| `completed` \| `failed` |
| score | int? | 0–100, weighted severity score |
| duration | int? | Секунды |
| startedAt | DateTime | Время старта |
| completedAt | DateTime? | Время завершения |
| error | string? | Описание ошибки при failure |

**Доменное поведение:**
- Создаётся по инициативе пользователя (или по расписанию — в будущем)
- Проходит через lifecycle: pending → scanning → completed/failed
- Генерирует Vulnerabilities (агрегат)
- Генерирует Report (PDF)
- Транслирует обновления через SSE в реальном времени
- Отправляет email-уведомление при завершении

**Текущая проблема:** Scan привязан к `target` (string URL), а не к сущности Target. Это означает, что нет связи «одна цель — много сканов» на уровне домена.

---

### 3.6 Сущность: Vulnerability (Value Object / Aggregate Root)

**Определение:** Конкретная находка в рамках одного скана. Не существует независимо от скана — это часть агрегата Scan. При удалении скана удаляются все его уязвимости (CASCADE).

**Атрибуты:**
| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | string | Уникальный идентификатор |
| scanId | string | Принадлежность к скану |
| cweId | string | CWE-идентификатор, например "CWE-79" |
| owaspCategory | string | Категория OWASP Top 10 (2021) |
| title | string | Краткое название |
| description | string | Подробное описание |
| severity | enum | `info` \| `low` \| `medium` \| `high` \| `critical` |
| evidence | string? | Доказательство (HTTP request/response) |
| location | string? | URL + path, где найдена |
| remediation | string? | Рекомендации по исправлению |
| status | enum? | `open` \| `acknowledged` \| `fixed` \| `false_positive` (ОТСУТСТВУЕТ) |

**Критический пробел — `status`:** Сейчас уязвимость не имеет статуса. Она просто существует. Пользователь не может отметить «исправлено», «ложное срабатывание», «принято». Это делает продукт **инструментом разового сканирования**, а не платформой непрерывного отслеживания.

**Целевое поведение (когда появится status):**
- Автоматический статус `open` при обнаружении
- Пользователь может перевести в `acknowledged`, `fixed`, `false_positive`
- При повторном сканировании той же цели — сравнение с предыдущими результатами (regression / new / resolved)
- Фильтрация в отчётах по статусу

---

### 3.7 Сущность: Report

**Определение:** Форматированный документ с результатами скана. Сейчас это только PDF, генерируемый на лету. В целевой модели — отдельная сущность.

**Текущая реализация:** PDF генерируется из `@react-pdf/renderer` при GET-запросе. Нет персистентности, нет версионирования.

**Целевая модель:**
| Атрибут | Тип | Описание |
|---------|-----|----------|
| id | string | Уникальный идентификатор |
| scanId | string | Привязка к скану |
| format | enum | `pdf` \| `html` \| `json` \| `sarif` |
| generatedAt | DateTime | Время генерации |
| storagePath | string | Путь к файлу / BLOB |
| size | int | Размер в байтах |

**Зачем:** Кэширование, версионирование, разные форматы для разных потребителей (PDF для менеджеров, SARIF для DevSecOps, JSON для API-интеграций).

---

### 3.8 Сущность: ApiKey

**Определение:** Программный токен для доступа к API без браузерной сессии. Имеет scope-ограничения.

**Доменное поведение:**
- Генерируется пользователем, показывается **один раз** в plaintext
- Хранится в БД как SHA-256 хеш (timing-safe сравнение)
- Имеет scope'ы: `scans:read`, `scans:write`, `teams:read`, `teams:write`, `billing:read`
- Может быть отозван (soft delete через `revokedAt`)
- Может иметь срок действия (`expiresAt`)

**Это полноценная доменная сущность** — реализована корректно, с правильной моделью безопасности.

---

### 3.9 Сущность: Plan / Subscription (заглушка)

**Определение:** Тарифный план пользователя/workspace. Сейчас — только UI-заглушка (`BillingTab`, кнопки disabled). StoreProduct в БД — это просто CMS-контент для лендинга, не привязанный к реальным подпискам.

**Целевая модель:**
```
Plan (шаблон из БД/Stripe)
  └── Subscription (экземпляр для workspace/user)
       ├── stripeCustomerId
       ├── stripeSubscriptionId
       ├── status: active | past_due | canceled | trialing
       ├── currentPeriodStart / currentPeriodEnd
       ├── limits: { maxScansPerMonth, maxTargets, maxMembers, ... }
       └── usage: { scansThisMonth, currentMembers, ... }
```

**Что отсутствует для коммерции:**
- Привязка Workspace к Plan
- Usage tracking (сколько сканов в этом месяце)
- Limit enforcement (отклонять сканы при превышении)
- Stripe integration (checkout, webhooks, portal)
- Invoice история
- Trial period

---

## 4. Агрегаты и границы

### 4.1 Агрегат: Scan

```
Scan (Aggregate Root)
├── Vulnerability[] (Entity, lifecycle привязан к Scan)
└── Report (Entity, генерируется из Scan)
```

**Инварианты:**
- Scan не может иметь vulnerabilities если status != `completed`
- Score рассчитывается только из severity vulnerabilities
- Vulnerability не существует вне Scan

**Нарушение:** сейчас Vulnerability создаётся через `createMany` в транзакции вместе с обновлением Scan. Это правильный подход (атомарность), но бизнес-правила скоринга размыты по коду (функция `generateScanResult` в `dast.ts` содержит и генерацию, и скоринг — это разные ответственности).

### 4.2 Агрегат: Workspace

```
Workspace (Aggregate Root)
├── Membership[] (Entity)
├── Invite[] (Entity, имеет собственный lifecycle)
└── Scan[] (через workspaceId, но Scan — отдельный агрегат)
```

**Инварианты:**
- Workspace всегда имеет owner
- Owner не может удалить себя (нужен transfer ownership)
- Invite expires через 7 дней
- Invite токен одноразовый

### 4.3 Агрегат: User

```
User (Aggregate Root)
├── ApiKey[] (Entity)
├── Scan[] (через userId, но Scan — отдельный агрегат)
└── ownedWorkspace[] (через ownerId)
```

---

## 5. Смешение ответственностей (Антипаттерны)

### 5.1 dast.ts — God Object сканирования

Файл `src/lib/dast.ts` делает **всё**:

```
1. Определяет OWASP-шаблоны (данные)          ← Domain Data
2. Хеширует строки (FNV-1a)                   ← Infrastructure
3. Генерирует PRNG (Mulberry32)                ← Infrastructure
4. Формирует evidence и location              ← Domain Logic
5. Рассчитывает severity weights и score      ← Domain Logic
6. Выбирает уязвимости из шаблонов           ← Domain Logic
```

**Проблема:** Генерация фейковых данных (mock), реальные алгоритмы сканирования и бизнес-правила скоринга смешаны в одном файле. Когда появится настоящий DAST-движок, этот файл нужно будет полностью переписать.

**Разделение (целевое):**
```
src/domain/
  scan-engine/
    types.ts           — Severity, Vulnerability, ScanResult
    scoring.ts         — score calculation, severity weights
    templates.ts       — OWASP template data (read-only)
  scan-engine/mock/
    generator.ts       — deterministic mock generator (для demo)
  scan-engine/real/
    engine.ts          — будущий реальный DAST движок
```

### 5.2 route.ts handlers — бизнес-логика в HTTP-слое

Каждый route handler содержит:
1. Авторизацию (infrastructure)
2. Rate limiting (infrastructure)
3. Валидацию (application)
4. Бизнес-логику (domain)
5. Аудит (infrastructure)
6. HTTP-ответ (presentation)

**Пример — `/api/scans/route.ts`:**
```
POST handler:
  ├── getServerSession()           ← Infrastructure (Auth)
  ├── ratePresets.scanCreate()     ← Infrastructure (Rate Limit)
  ├── zod validation               ← Application
  ├── db.scan.create()             ← Domain (Create Scan)
  ├── audit()                      ← Infrastructure (Audit)
  ├── runMockScan()                ← Domain (Execute Scan) ← INLINE FUNCTION!
  │   ├── generateScanResult()     ← Domain (Mock Engine)
  │   ├── db.$transaction()        ← Infrastructure (DB)
  │   ├── broadcastScanUpdate()    ← Infrastructure (SSE)
  │   └── notifyScanCompleted()    ← Domain (Notification)
  └── NextResponse.json()          ← Presentation
```

Функция `runMockScan` — это **целый бизнес-процесс**, определённый как inline-функция внутри route handler. Если завтра scan запускается не только через HTTP, но и через API-key, cron, или webhook — вся эта логика будет дублироваться.

**Целевое разделение:**
```
src/domain/scan/
  start-scan.ts    — бизнес-логика запуска скана
  complete-scan.ts — бизнес-логика завершения
  score-scan.ts    — расчёт оценки

src/application/
  scan-service.ts  — оркестрация: auth → validate → start → notify

src/infrastructure/http/
  scans/route.ts   — только HTTP parsing → call scan-service → HTTP response
```

### 5.3 Teams — хороший пример (почти)

`src/lib/teams.ts` выделен правильно: чистые функции для работы с командами, без привязки к HTTP. Но он содержит только **read-операции**. Write-операции (create team, invite, remove member) размазаны по route handlers.

---

## 6. Цепочка ценности (Value Chain)

```
Ценность для пользователя:
  "Я указываю URL → получаю профессиональный отчёт об уязвимостях"

Внутренняя цепочка:
  Target URL
    → Scan Engine (DAST)
      → Raw Findings (Vulnerabilities)
        → Scoring Algorithm (0-100)
          → Report Generation (PDF/JSON/SARIF)
            → Notification (Email + SSE)
              → Dashboard (History + Detail)

Каждый этап — потенциальная точка расширения:
  - Scan Engine: mock → real DAST → third-party integration (Nuclei, ZAP)
  - Report: PDF → HTML → SARIF → Jira integration → Slack notification
  - Notification: Email → Slack → Webhook → PagerDuty
```

---

## 7. Отсутствующие доменные концепции

| Концепция | Описание | Почему важна |
|-----------|----------|-------------|
| **Target** | Объект сканирования с историей | Без него продукт = разовый сканер, не Continuous DAST |
| **Vulnerability.status** | Статус уязвимости (open/fixed/false_positive) | Без этого нет трекинга исправлений |
| **Vulnerability.fingerprint** | Уникальный хеш для сравнения между сканами | Нужен для regression detection |
| **Scan.comparison** | Diff между двумя сканами одной цели | Ключевой feature для Continuous DAST |
| **Schedule** | Расписание сканирования | «Continuous» без расписания — оксюморон |
| **Notification template** | Шаблоны уведомлений | Сейчас хардкожены в email.ts |
| **Usage / Limits** | Лимиты по тарифу | Нужны для монетизации |
| **Subscription** | Привязка workspace к плану | Основа коммерции |
| **Organization** | Уровень выше Workspace | Для enterprise с несколькими workspace'ами |

---

## 8. Резюме: 3 ключевых вывода

1. **Нет Target.** Это самый критический пробел. Без сущности Target продукт не может позиционироваться как «Continuous DAST» — это просто «one-shot scanner». Добавление Target — это не рефакторинг, а продуктовое решение, которое открывает: историю по целям, тренды, расписания, regression detection.

2. **Нет Vulnerability lifecycle.** Уязвимости находятся, но не управляются. Пользователь не может отметить «fixed» и увидеть, что проблема решена. Это разница между «инструментом» и «платформой».

3. **Бизнес-логика размазана по route handlers.** `runMockScan` inline в route.ts, скоринг в dast.ts, notification в email.ts, но нет единого «scan service», который оркестрирует процесс. Это не проблема для текущего размера, но при добавлении real DAST, scheduled scans, и webhooks — станет узким местом.