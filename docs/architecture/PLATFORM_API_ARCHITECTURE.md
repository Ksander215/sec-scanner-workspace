# PLATFORM_API_ARCHITECTURE.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Архитектурный документ Platform Layer (без изменения кода)
> **Зависит от:** PLATFORM_AUDIT.md, SECURITY_STATE_ENGINE.md, EXPLAINABILITY_LAYER.md, MULTI_CHANNEL_PRODUCT_STRATEGY.md

---

## 1. Введение

### 1.1 Цель

Документ определяет архитектуру **Platform Layer** — единой точки входа для всех клиентов Sec Scanner (Web, Telegram Bot, Telegram Mini App, Mobile, CLI, AI Assistant, Public API, Background Workers).

**Ключевое свойство:** Любой новый интерфейс подключается через Platform Layer **без изменения Domain Layer** и **без дублирования бизнес-логики**.

### 1.2 Принципы

| Принцип | Определение |
|---------|------------|
| **Clean Architecture** | Зависимости направлены внутрь: Presentation → Application → Domain ← Infrastructure |
| **Dependency Inversion** | Application Layer зависит от интерфейсов (Ports), а не от реализаций (Adapters) |
| **SOLID** | Single Responsibility (один use case = один service), Open/Closed (расширение через порты), LSP (адаптеры взаимозаменяемы), ISP (узкие интерфейсы портов), DIP (зависимость от абстракций) |
| **DDD** | Domain Layer — ядро. Application Services — use cases. Entities живут в Domain, не в DB |
| **Separation of Concerns** | Каждый слой имеет одну ответственность. Controller не вычисляет score. Domain не отправляет email |

### 1.3 Что НЕ делается в этом спринте

- Не переписываются существующие API routes
- Не изменяется Domain Layer
- Не мигрируется DB
- Не внедряется Message Broker (Redis, RabbitMQ)
- Не реализуются все endpoints (только архитектура)

---

## 2. Архитектурная диаграмма

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ ┌───────────┐ │
│  │  Web UI  │ │Telegram  │ │Telegram  │ │  Public  │ │ CLI │ │  AI       │ │
│  │ (Next.js)│ │  Bot     │ │Mini App  │ │   API    │ │     │ │ Assistant │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬──┘ └─────┬─────┘ │
│       │            │            │             │          │          │       │
└───────┼────────────┼────────────┼─────────────┼──────────┼──────────┼───────┘
        │            │            │             │          │          │
┌───────┼────────────┼────────────┼─────────────┼──────────┼──────────┼───────┐
│       │         TRANSPORT LAYER                                       │
│       │                                                                  │
│  ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴────┐ ┌───┴──┐ ┌────┴────┐ │
│  │  Next.js │ │ Telegram │ │  Next.js │ │  Next.js│ │Node  │ │  Future │ │
│  │  Route   │ │ Webhook  │ │  Route   │ │  Route  │ │Script│ │ Adapter │ │
│  │ Handler  │ │ Handler  │ │ Handler  │ │ Handler │ │      │ │         │ │
│  │ (thin)   │ │ (thin)   │ │ (thin)   │ │ (thin)  │ │      │ │         │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ └───┬──┘ └────┬────┘ │
│       │            │            │             │          │          │       │
├───────┼────────────┼────────────┼─────────────┼──────────┼──────────┼───────┤
│       │       PLATFORM LAYER (Application Services)                     │
│       │                                                                  │
│  ┌────┴────────────────────────────────────────────────────────────┐    │
│  │                     Application Services                          │    │
│  │                                                                  │    │
│  │  ┌────────────┐ ┌─────────────────┐ ┌────────────────────────┐  │    │
│  │  │ ScanService│ │SecurityStateSvc │ │ ExplainabilityService  │  │    │
│  │  │            │ │                 │ │                        │  │    │
│  │  │ startScan  │ │ getState        │ │ explain                │  │    │
│  │  │ getScan    │ │ getStateLite    │ │ explainLite            │  │    │
│  │  │ listScans  │ │ getHistory      │ │                        │  │    │
│  │  │ cancelScan │ │                 │ │                        │  │    │
│  │  └─────┬──────┘ └───────┬─────────┘ └───────────┬────────────┘  │    │
│  │        │                │                       │                │    │
│  │  ┌─────┴──────┐ ┌──────┴─────────┐ ┌───────────┴────────────┐  │    │
│  │  │TargetService│ │UserService     │ │ NotificationService    │  │    │
│  │  │            │ │                │ │                        │  │    │
│  │  │ create     │ │ getProfile     │ │ notify                 │  │    │
│  │  │ list       │ │ updatePrefs    │ │ getPreferences         │  │    │
│  │  │ get        │ │ listApiKeys    │ │                        │  │    │
│  │  └────────────┘ └────────────────┘ └────────────────────────┘  │    │
│  │                                                                  │    │
│  │  ┌──────────────────────────────────────────────────────────┐   │    │
│  │  │                   Shared Services                        │   │    │
│  │  │  AuthService │ AuditService │ EventPublisher │ IdGen    │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                           │
├──────────────────────────────┼───────────────────────────────────────────┤
│                              │         PORTS (Interfaces)                │
│                              │                                           │
│  ┌───────────────────────────┼──────────────────────────────────────┐   │
│  │                           │                                      │   │
│  │  ┌─────────────┐ ┌───────┴────────┐ ┌───────────┐ ┌─────────┐  │   │
│  │  │ScanRepo     │ │UserRepo        │ │NotifyPort │ │EventPub │  │   │
│  │  │(interface)  │ │(interface)     │ │(interface)│ │(interf.)│  │   │
│  │  └──────┬──────┘ └───────┬────────┘ └─────┬─────┘ └────┬────┘  │   │
│  │         │                │               │             │        │   │
│  └─────────┼────────────────┼───────────────┼─────────────┼────────┘   │
│            │                │               │             │            │
├────────────┼────────────────┼───────────────┼─────────────┼────────────┤
│            │         ADAPTERS (Implementations)                     │
│            │                                                          │
│  ┌─────────┴──────────┐ ┌────┴───────────┐ ┌──┴──────────┐ ┌──┴─────┐ │
│  │ PrismaScanAdapter  │ │PrismaUserAdapt.│ │EmailAdapter │ │SSEAdapt│ │
│  │                    │ │                │ │             │ │        │ │
│  │ Prisma queries     │ │ Prisma queries │ │ Nodemailer   │ │SSE push│ │
│  └─────────┬──────────┘ └────┬───────────┘ └─────────────┘ └────────┘ │
│            │                │                                          │
├────────────┼────────────────┼──────────────────────────────────────────┤
│            │         INFRASTRUCTURE                                     │
│            │                                                            │
│  ┌─────────┴──────────┐ ┌────┴───────────┐ ┌──────────────────────────┐│
│  │  SQLite / PgSQL    │ │  SMTP Server   │ │  Telegram Bot API        ││
│  │  (Prisma)          │ │  (Nodemailer)  │ │  (grammy/telegraf)      ││
│  └────────────────────┘ └────────────────┘ └──────────────────────────┘│
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                     DOMAIN LAYER (untouched)                           │
│                                                                      │
│  ┌──────────────────────────────┐ ┌────────────────────────────────┐  │
│  │  Security State Engine       │ │  Explainability Layer          │  │
│  │  Pure, sync, deterministic   │ │  Pure, sync, deterministic     │  │
│  └──────────────────────────────┘ └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Описание слоёв

### 3.1 Transport Layer (тонкие контроллеры)

**Ответственность:** Парсинг HTTP request, вызов Application Service, сериализация response.

**Правила:**
- Не содержит бизнес-логики (валидация доменных правил — в Application Service)
- Не импортирует Prisma напрямую
- Не импортирует Domain модули напрямую (идёт через Application Service)
- Содержит только HTTP-specific код (status codes, headers, content-type)

**Пример (целевой /api/v1/scans):**

```typescript
// Transport Layer — thin controller
export async function POST(req: Request) {
  // 1. Auth
  const auth = await resolveAuth(req);
  if (!auth.ok) return auth.toResponse(); // returns 401/403

  // 2. Parse body
  const body = await req.json().catch(() => null);
  
  // 3. Call Application Service
  const result = await scanService.startScan({
    actorId: auth.user.userId,
    target: body?.target,
  });

  // 4. Map to HTTP response
  if (result.error) return result.error.toResponse();
  return Response.json({ data: result.data }, { status: 201 });
}
```

### 3.2 Platform Layer (Application Services)

**Ответственность:** Бизнес-логика, оркестрация, валидация доменных правил, авторизация.

**Ключевые свойства:**
- Не знает про HTTP, Telegram, CLI — работает с domain типами
- Получает данные через Ports (интерфейсы), не через Prisma напрямую
- Вызывает Domain Layer для вычислений
- Публикует доменные события через EventPublisher
- Возвращает типизированный результат (не HTTP response)

### 3.3 Ports (интерфейсы)

**Ответственность:** Определяют контракты, через которые Application Layer взаимодействует с инфраструктурой.

**Правила:**
- Только интерфейсы (TypeScript `interface` или абстрактные классы)
- Не импортируют Prisma, Next.js, или любые конкретные библиотеки
- Определяют методы с domain-типами на входе/выходе

### 3.4 Adapters (реализации)

**Ответственность:** Реализуют Ports для конкретной инфраструктуры.

**Правила:**
- Импортируют конкретные библиотеки (Prisma, Nodemailer, grammy)
- Маппят DB типы ↔ Domain типы
- Не содержат бизнес-логики

### 3.5 Domain Layer (без изменений)

**Ответственность:** Чистая бизнес-логика и вычисления.

**Правила:**
- Нулевые зависимости от внешнего мира
- Чистые функции, синхронные, детерминированные
- Единственный источник truth для бизнес-правил

---

## 4. Application Services

### 4.1 Структура

```
src/application/
├── scan/
│   ├── scan.service.ts       ← StartScan, GetScan, ListScans, CancelScan
│   └── scan.types.ts         ← Scan DTOs (Request/Response for scan use cases)
├── security-state/
│   ├── security-state.service.ts  ← GetState, GetStateLite, GetHistory
│   └── security-state.types.ts
├── explainability/
│   ├── explainability.service.ts  ← Explain, ExplainLite
│   └── explainability.types.ts
├── target/
│   ├── target.service.ts     ← CreateTarget, GetTarget, ListTargets
│   └── target.types.ts
├── user/
│   ├── user.service.ts       ← GetProfile, UpdatePreferences, ListApiKeys, CreateApiKey
│   └── user.types.ts
├── workspace/
│   ├── workspace.service.ts  ← CreateWorkspace, InviteMember, RemoveMember
│   └── workspace.types.ts
├── notification/
│   ├── notification.service.ts  ← Notify, GetPreferences, UpdatePreferences
│   └── notification.types.ts
├── report/
│   ├── report.service.ts     ← GeneratePdf, GenerateSarif
│   └── report.types.ts
└── shared/
    ├── ports.ts              ← Все Port-интерфейсы
    ├── errors.ts             ← PlatformError, ErrorCodes
    ├── result.ts             ← Result<T, E> type (Success | Failure)
    ├── auth-context.ts       ← AuthContext (domain type, not Next.js)
    └── events.ts             ← Domain event interfaces + publisher
```

### 4.2 Service: ScanService

**Файл:** `src/application/scan/scan.service.ts`

```typescript
/**
 * ScanService — Application Service для всех use cases, связанных со сканированием.
 *
 * INVARIANTS:
 * - Не знает про HTTP, Telegram, CLI
 * - Работает через Ports (ScanRepository, EventPublisher, NotificationPort)
 * - Вызывает Domain Layer для вычислений (Security State после scan)
 * - Публикует события (ScanStarted, ScanCompleted, etc.)
 */

export class ScanService {
  constructor(
    private readonly scanRepo: ScanRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly notification: NotificationPort,
    private readonly auth: AuthService,
  ) {}

  /**
   * Запустить новый скан.
   *
   * Use case: пользователь (Web, Telegram, CLI, API) хочет просканировать target.
   * Не важно, откуда пришёл запрос — логика одинаковая.
   */
  async startScan(input: StartScanInput): Promise<Result<StartScanOutput, PlatformError>> {
    // 1. Валидация
    if (!isValidUrl(input.target)) {
      return fail(ErrorCode.INVALID_INPUT, "Target must be a valid HTTP(S) URL");
    }

    // 2. Авторизация (может ли этот actor запустить скан?)
    const authz = await this.auth.authorize({
      actorId: input.actorId,
      action: "scan:create",
      resource: input.teamId ?? input.actorId,
    });
    if (!authz.allowed) {
      return fail(ErrorCode.FORBIDDEN, authz.reason);
    }

    // 3. Rate limiting
    const rl = await this.auth.checkRateLimit({
      key: `scan:create:${input.actorId}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return fail(ErrorCode.RATE_LIMITED, "Too many scans. Try again later.", { retryAfter: rl.resetMs });
    }

    // 4. Создать scan (через repository)
    const scan = await this.scanRepo.create({
      target: input.target,
      userId: input.actorId,
      teamId: input.teamId,
      status: "scanning",
    });

    // 5. Опубликовать событие
    await this.eventPublisher.publish({
      type: "ScanStarted",
      payload: { scanId: scan.id, target: input.target, actorId: input.actorId },
      timestamp: new Date(),
    });

    // 6. Запустить сканирование (fire-and-forget)
    void this.executeScan(scan.id, input.target, input.actorId);

    // 7. Вернуть результат
    return ok({
      id: scan.id,
      target: scan.target,
      status: "scanning",
      startedAt: scan.startedAt,
    });
  }

  /**
   * Получить Security State для target.
   *
   * Use case: любой клиент хочет узнать текущее Security Score.
   */
  async getSecurityState(input: GetSecurityStateInput): Promise<Result<SecurityStateOutput, PlatformError>> {
    // 1. Собрать данные через repository
    const findings = await this.scanRepo.findOpenFindings(input.targetId);
    const scans = await this.scanRepo.getScanSummaries(input.targetId);
    const snapshots = await this.scanRepo.getPreviousSnapshots(input.targetId);

    // 2. Маппить в domain типы
    const domainInput: SecurityStateInput = {
      targetId: input.targetId,
      findings: findings.map(toDomainFinding),
      scans: scans.map(toDomainScanSummary),
      previousSnapshots: snapshots.map(toDomainSnapshot),
      now: new Date(),
    };

    // 3. Вызвать Domain Layer
    const state = securityStateEngine.compute(domainInput);

    // 4. Опубликовать событие (для аналитики)
    await this.eventPublisher.publish({
      type: "SecurityStateComputed",
      payload: { targetId: input.targetId, score: state.securityScore },
      timestamp: new Date(),
    });

    return ok(toSecurityStateOutput(state));
  }

  // ... executeScan, getScan, listScans, cancelScan
}
```

### 4.3 Service: ExplainabilityService

```typescript
export class ExplainabilityService {
  constructor(
    private readonly scanRepo: ScanRepository,
  ) {}

  /**
   * Получить объяснение текущего Security State.
   *
   * Use case: Dashboard, Telegram Mini App, API, AI Assistant — все
   * запрашивают объяснение через этот единственный service.
   */
  async explain(input: GetExplanationInput): Promise<Result<ExplanationOutput, PlatformError>> {
    // 1. Собрать данные
    const findings = await this.scanRepo.findAllFindings(input.targetId);
    const scans = await this.scanRepo.getScanSummaries(input.targetId);
    const snapshots = await this.scanRepo.getPreviousSnapshots(input.targetId);

    // 2. Вычислить Security State
    const currentState = securityStateEngine.compute({
      targetId: input.targetId,
      findings: findings.map(toDomainFinding),
      scans: scans.map(toDomainScanSummary),
      previousSnapshots: snapshots.map(toDomainSnapshot),
      now: new Date(),
    });

    // 3. Предыдущее состояние (для change analysis)
    let previousState: SecurityState | null = null;
    if (snapshots.length > 0) {
      // Восстановить из предыдущего snapshot...
    }

    // 4. Вычислить finding impacts
    const findingImpacts = computeFindingImpacts(
      findings.filter(f => isOpenFinding(f)).map(toDomainFinding),
      DEFAULT_WEIGHTS,
      new Date(),
    );

    // 5. Вызвать Explainability Layer
    const result = explanationEngine.explain({
      currentState,
      previousState,
      findings: findings.map(toDomainFinding),
      findingImpacts,
      now: new Date(),
    });

    return ok(toExplanationOutput(result));
  }
}
```

### 4.4 Service: NotificationService

```typescript
export class NotificationService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly channels: NotificationPort[],
  ) {}

  /**
   * Отправить уведомление через все подходящие каналы.
   *
   * Use case: после завершения скана, при обнаружении критического finding,
   * при регрессии — вызвать notify() и все каналы получат уведомление.
   */
  async notify(input: NotificationInput): Promise<void> {
    // 1. Получить preferences пользователя
    const prefs = await this.userRepo.getNotificationPreferences(input.userId);
    if (!prefs || !prefs.emailNotifications) return;

    // 2. Проверить тип уведомления
    if (input.type === "scan_completed" && !prefs.scanCompletedAlerts) return;
    if (input.type === "vulnerability_alert" && !prefs.vulnerabilityAlerts) return;

    // 3. Отправить через все каналы параллельно (fire-and-forget)
    for (const channel of this.channels) {
      void channel.send(input).catch(err => {
        console.error(`[notification] ${channel.name} failed:`, err);
      });
    }
  }
}
```

---

## 5. Public Contracts (DTOs)

### 5.1 Общая модель ответа

Все API responses следуют единому формату:

```typescript
// src/api/contracts/response.ts

/** Успешный ответ с данными */
interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
}

/** Мета-информация (пагинация, rate limit) */
interface ResponseMeta {
  page?: number;
  perPage?: number;
  total?: number;
  requestId: string;
}

/** Ошибочный ответ */
interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;  // ISO 8601
  };
}
```

### 5.2 Error Model

```typescript
// src/application/shared/errors.ts

enum ErrorCode {
  // Auth (4xx)
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_API_KEY = "INVALID_API_KEY",
  API_KEY_EXPIRED = "API_KEY_EXPIRED",
  MISSING_SCOPE = "MISSING_SCOPE",
  TWO_FA_REQUIRED = "TWO_FA_REQUIRED",

  // Input (4xx)
  INVALID_INPUT = "INVALID_INPUT",
  INVALID_URL = "INVALID_URL",
  NOT_FOUND = "NOT_FOUND",

  // Rate Limiting (429)
  RATE_LIMITED = "RATE_LIMITED",

  // Business (4xx)
  SCAN_ALREADY_RUNNING = "SCAN_ALREADY_RUNNING",
  TARGET_ALREADY_EXISTS = "TARGET_ALREADY_EXISTS",
  TEAM_SLUG_TAKEN = "TEAM_SLUG_TAKEN",
  INVITE_EXPIRED = "INVITE_EXPIRED",

  // Server (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SCAN_ENGINE_ERROR = "SCAN_ENGINE_ERROR",
  NOTIFICATION_ERROR = "NOTIFICATION_ERROR",
}

interface PlatformError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  statusCode: number;  // HTTP status code (для Transport Layer)
  cause?: Error;       // Внутренняя ошибка (не отправляется клиенту)
}
```

### 5.3 Result Type

```typescript
// src/application/shared/result.ts

/**
 * Result<T, E> — типизированный результат операции.
 * Заменяет throw/catch для бизнес-логики.
 */
type Result<T, E> = Success<T> | Failure<E>;

interface Success<T> {
  ok: true;
  data: T;
}

interface Failure<E> {
  ok: false;
  error: E;
}

/** Конструкторы */
function ok<T>(data: T): Success<T> { return { ok: true, data }; }
function fail<E>(error: E): Failure<E> { return { ok: false, error }; }
```

### 5.4 Scan DTOs

```typescript
// src/application/scan/scan.types.ts

/** Входные данные для запуска скана (от любого клиента) */
interface StartScanInput {
  actorId: string;
  target: string;
  teamId?: string;  // null = personal scan
}

/** Результат запуска скана */
interface StartScanOutput {
  id: string;
  target: string;
  status: "scanning";
  startedAt: string;  // ISO 8601
}

/** Список сканов — query параметры */
interface ListScansInput {
  actorId: string;
  teamId?: string;
  status?: string;
  limit?: number;     // default: 50, max: 200
  cursor?: string;    // pagination cursor
}

/** Элемент списка сканов */
interface ScanListItem {
  id: string;
  target: string;
  status: string;
  score: number | null;
  vulnerabilityCount: number;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}
```

### 5.5 Security State DTOs

```typescript
// src/application/security-state/security-state.types.ts

interface SecurityStateOutput {
  targetId: string;
  computedAt: string;

  // Primary metrics
  securityScore: number;
  riskScore: number;
  trend: string;
  scoreChange: number | null;

  // Finding metrics
  openFindings: SeverityBreakdownOutput;
  openFindingsCount: number;
  resolvedInPeriod: number;
  regressionCount: number;
  newFindingsInPeriod: number;

  // Scan metrics
  lastSuccessfulScanAt: string | null;
  lastScanStartedAt: string | null;
  totalScans: number;

  // Data quality
  confidence: number;
}

interface SeverityBreakdownOutput {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}
```

### 5.6 Explainability DTOs

```typescript
// src/application/explainability/explainability.types.ts

interface ExplanationOutput {
  summary: string;
  reasons: ReasonOutput[];
  topImpacts: TopImpactOutput[];
  recommendations: RecommendationOutput[];
  improvements: ChangeOutput[];
  regressions: ChangeOutput[];
  scoreChangeReasons: ScoreChangeOutput[];
}

interface ReasonOutput {
  id: string;
  label: string;
  description: string;
  scoreImpact: number;
  influence: string;
}

interface RecommendationOutput {
  description: string;
  priority: string;
  complexity: string;
  expectedScoreGain: number;
  expectedRiskReduction: number;
  roi: number;
  reasoning: string;
  findingIds: string[];
}
```

---

## 6. Integration Layer

### 6.1 Как каждый клиент подключается к Platform Layer

#### Web Application (Next.js)

```
Browser → Next.js API Route (Transport) → Application Service → Domain
                                              ↓
                                         Ports → PrismaAdapter
```

**Особенности:**
- Auth: `resolveAuth(req)` → извлекает session cookie или API key
- Transport: Next.js Route Handlers (thin controllers)
- Response: JSON (ApiResponse<T>)

#### Telegram Bot

```
Telegram → Webhook Handler (Transport) → Application Service → Domain
                                              ↓
                                         Ports → HttpApiClient (вызывает /api/v1/)
```

**Особенности:**
- Auth: Telegram user ID → lookup в DB → AuthContext
- Transport: Telegram webhook handler (grammy/telegraf)
- Response: Telegram message text + inline keyboard
- **Ключевое решение:** Bot НЕ подключается к DB напрямую. Он вызывает Application Services через внутренний HTTP API (или через shared in-process call, если Bot запущен как часть Next.js сервера).

#### Telegram Mini App

```
Telegram WebView → Next.js API Route (Transport) → Application Service → Domain
                                                    ↓
                                               Ports → PrismaAdapter
```

**Особенности:**
- Auth: Telegram `initData` → verify signature → lookup user → AuthContext
- Transport: те же Next.js Route Handlers (Mini App делает HTTP запросы)
- Response: JSON (compact DTOs для маленького экрана)

#### Public REST API

```
External Client → Next.js API Route (Transport) → Application Service → Domain
                                                      ↓
                                                 Ports → PrismaAdapter
```

**Особенности:**
- Auth: `Authorization: Bearer ssk_...` → lookup API key → AuthContext
- Transport: версионированные Next.js Route Handlers (/api/v1/*)
- Response: JSON (ApiResponse<T> with OpenAPI schema)
- Rate limiting: per API key (отдельный от session rate limit)

#### CLI

```
CLI → HTTP Client → Next.js API Route (Transport) → Application Service → Domain
```

**Особенности:**
- Auth: API key (env var или config file)
- Transport: тот же Public REST API
- Response: JSON (CLI форматирует в таблицы)

#### AI Assistant

```
AI Agent → HTTP Client → Next.js API Route (Transport) → Application Service → Domain
```

**Особенности:**
- Auth: Service Token (новый тип API key для inter-service communication)
- Transport: Public REST API (или internal API без rate limiting)
- Response: JSON (AI парсит structured response)
- **Ключевое преимущество:** AI получает ExplanationOutput с reasons, recommendations, executive summary — всё, что нужно для ответа пользователю

#### Background Workers

```
Scheduler → In-process call → Application Service → Domain
                                       ↓
                                  Ports → PrismaAdapter
```

**Особенности:**
- Auth: System identity (no user context)
- Transport: in-process function call (worker запущен как часть Node.js процесса)
- Use cases: scheduled scans, weekly digest generation, stale data cleanup

### 6.2 Composition Root

Все Application Services создаются в одном месте — **Composition Root**. Это единственный файл, который знает про конкретные реализации (Prisma, Email, SSE).

```typescript
// src/composition-root.ts

import { PrismaScanRepository } from "./adapters/prisma-scan-repository";
import { PrismaUserRepository } from "./adapters/prisma-user-repository";
import { EmailNotificationAdapter } from "./adapters/email-notification";
import { SseNotificationAdapter } from "./adapters/sse-notification";
import { InMemoryEventPublisher } from "./adapters/in-memory-event-publisher";
import { ConsoleAuditAdapter } from "./adapters/console-audit";
import { ScanService } from "./application/scan/scan.service";
// ...

// Infrastructure
const db = new PrismaClient();
const scanRepo = new PrismaScanRepository(db);
const userRepo = new PrismaUserRepository(db);
const emailChannel = new EmailNotificationAdapter();
const sseChannel = new SseNotificationAdapter();
const eventPublisher = new InMemoryEventPublisher();

// Application Services
export const scanService = new ScanService(
  scanRepo,
  eventPublisher,
  new NotificationService(userRepo, [emailChannel, sseChannel]),
  new AuthService(userRepo),
);

export const explainabilityService = new ExplainabilityService(scanRepo);
export const securityStateService = new SecurityStateService(scanRepo);
// ...
```

**Зачем:** Если завтра нужно заменить Email на Telegram — меняется только Composition Root. Application Services, Domain, Transport — без изменений.

---

## 7. Event Architecture

### 7.1 Domain Events

```typescript
// src/application/shared/events.ts

/**
 * Base domain event. All events are:
 * - Immutable (readonly)
 * - Timestamped
 * - Correlated (requestId for tracing)
 * - Typed (discriminated union via `type`)
 */
interface DomainEvent {
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: Date;
  readonly correlationId?: string;
  readonly actorId?: string;
}

// ── Scan Events ──
interface ScanStartedEvent extends DomainEvent {
  type: "ScanStarted";
  payload: { scanId: string; target: string };
}

interface ScanCompletedEvent extends DomainEvent {
  type: "ScanCompleted";
  payload: { scanId: string; target: string; score: number; vulnerabilityCount: number; durationSec: number };
}

interface ScanFailedEvent extends DomainEvent {
  type: "ScanFailed";
  payload: { scanId: string; target: string; error: string };
}

// ── Finding Events ──
interface CriticalFindingDetectedEvent extends DomainEvent {
  type: "CriticalFindingDetected";
  payload: { scanId: string; findingId: string; cweId: string; title: string; target: string };
}

interface FindingRegressedEvent extends DomainEvent {
  type: "FindingRegressed";
  payload: { findingId: string; cweId: string; title: string; target: string; previousResolvedAt: string };
}

// ── State Events ──
interface SecurityScoreChangedEvent extends DomainEvent {
  type: "SecurityScoreChanged";
  payload: { targetId: string; previousScore: number; newScore: number; reason: string };
}

// ── Workspace Events ──
interface WorkspaceCreatedEvent extends DomainEvent {
  type: "WorkspaceCreated";
  payload: { workspaceId: string; name: string; ownerId: string };
}

interface TargetCreatedEvent extends DomainEvent {
  type: "TargetCreated";
  payload: { targetId: string; url: string; workspaceId: string };
}

// Discriminated union type
type SecScannerEvent =
  | ScanStartedEvent
  | ScanCompletedEvent
  | ScanFailedEvent
  | CriticalFindingDetectedEvent
  | FindingRegressedEvent
  | SecurityScoreChangedEvent
  | WorkspaceCreatedEvent
  | TargetCreatedEvent;
```

### 7.2 Event Publisher (Port)

```typescript
// src/application/shared/ports.ts

/**
 * EventPublisher — Port для публикации доменных событий.
 *
 * Текущая реализация: InMemoryEventPublisher (синхронный, in-process).
 * Будущие реализации: RedisEventPublisher, RabbitMQEventPublisher.
 *
 * Handlers подписываются на события через subscribe().
 */
interface EventPublisher {
  /** Опубликовать событие (fire-and-forget в текущей реализации). */
  publish(event: DomainEvent): Promise<void>;

  /** Подписать обработчик на конкретный тип события. */
  subscribe<T extends DomainEvent["type"]>(
    eventType: T,
    handler: (event: Extract<SecScannerEvent, { type: T }>) => Promise<void> | void,
  ): Unsubscribe;
}

type Unsubscribe = () => void;
```

### 7.3 Event Handlers (примеры)

```typescript
// src/application/scan/handlers/notify-on-scan-complete.ts

/**
 * Когда скан завершается — отправить уведомление пользователю.
 * Подписывается на ScanCompleted через EventPublisher.
 */
export class NotifyOnScanComplete {
  constructor(private readonly notification: NotificationService) {}

  async handle(event: ScanCompletedEvent): Promise<void> {
    await this.notification.notify({
      type: "scan_completed",
      userId: event.actorId!,
      payload: {
        scanId: event.payload.scanId,
        target: event.payload.target,
        score: event.payload.score,
        vulnerabilityCount: event.payload.vulnerabilityCount,
      },
    });
  }
}

// src/application/scan/handlers/notify-on-critical-finding.ts

/**
 * Когда обнаружен критический finding — немедленно уведомить.
 */
export class NotifyOnCriticalFinding {
  constructor(private readonly notification: NotificationService) {}

  async handle(event: CriticalFindingDetectedEvent): Promise<void> {
    await this.notification.notify({
      type: "critical_finding",
      userId: event.actorId!,
      priority: "urgent",
      payload: event.payload,
    });
  }
}

// src/application/scan/handlers/push-sse-on-scan-update.ts

/**
 * Когда скан обновляется — push через SSE (для Web UI).
 */
export class PushSseOnScanUpdate {
  constructor(private readonly sseAdapter: SseAdapter) {}

  async handle(event: ScanCompletedEvent | ScanFailedEvent): Promise<void> {
    await this.sseAdapter.broadcast({
      userId: event.actorId!,
      event: event.type,
      data: event.payload,
    });
  }
}
```

### 7.4 Event Flow Diagram

```
ScanService.startScan()
       │
       ▼
EventPublisher.publish(ScanStarted)
       │
       ├──▶ [Handler: AuditLogger] → writes to AuditLog
       │
       ▼
executeScan() completes
       │
       ▼
EventPublisher.publish(ScanCompleted)
       │
       ├──▶ [Handler: NotifyOnScanComplete] → EmailAdapter.send()
       ├──▶ [Handler: PushSseOnScanUpdate]  → SseAdapter.broadcast()
       ├──▶ [Handler: AuditLogger]           → writes to AuditLog
       └──▶ [Future: TelegramNotifier]       → TelegramAdapter.send()

Если CriticalFindingDetected:
       │
       ├──▶ [Handler: NotifyOnCriticalFinding] → EmailAdapter.send() (urgent)
       └──▶ [Future: TelegramNotifier]         → TelegramAdapter.send() (instant push)
```

---

## 8. Security Layer

### 8.1 Unified Auth Model

```typescript
// src/application/shared/auth-context.ts

/**
 * AuthContext — единая модель аутентификации для ВСЕХ клиентов.
 * Не содержит HTTP-specific типов (NextResponse, Request, etc.).
 * Может быть использован в Web, Telegram, CLI, Background Worker.
 */
interface AuthContext {
  /** Уникальный идентификатор actor'а (user, service, etc.) */
  actorId: string;

  /** Email (для user-actor'ов) */
  email?: string;

  /** Роль в системе */
  role: "user" | "admin" | "service";

  /** Метод аутентификации */
  method: "session" | "api_key" | "telegram" | "service_token";

  /** Scopes (для API key auth) */
  scopes?: string[];

  /** Для трассировки */
  requestId: string;
  clientId?: string;  // "web", "telegram_bot", "api", "cli", "ai_assistant"
}

/**
 * AuthService — Port для аутентификации и авторизации.
 * Каждый транспортный слой вызывает resolveAuth() с предоставленными credentials.
 */
interface AuthService {
  /** Аутентифицировать и вернуть AuthContext или ошибку. */
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;

  /** Проверить авторизацию (может ли actor выполнить action над resource?). */
  authorize(request: AuthzRequest): Promise<AuthzResult>;

  /** Проверить rate limit. */
  checkRateLimit(request: RateLimitRequest): Promise<RateLimitResult>;
}

type AuthCredentials =
  | { type: "session"; sessionToken: string }
  | { type: "api_key"; rawKey: string }
  | { type: "telegram"; telegramUserId: number; telegramChatId: number }
  | { type: "service_token"; token: string };

type AuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; error: PlatformError };

interface AuthzRequest {
  actorId: string;
  action: string;
  resource: string;
}

type AuthzResult =
  | { allowed: true }
  | { allowed: false; reason: string };
```

### 8.2 RBAC Model

```
Role:       user          admin         service
──────────────────────────────────────────────────
scan:read   ✅ own/team   ✅ all        ✅ all
scan:write  ✅ own/team   ✅ all        ✅ all
teams:read  ✅ member-of  ✅ all        ❌
teams:write ✅ owner/admin✅ all        ❌
billing:read ✅ own       ✅ all        ❌
admin:*     ❌            ✅            ❌
```

### 8.3 API Key Scopes (расширенные)

```typescript
// Текущие scopes (сохраняются для backward compatibility):
"scans:read", "scans:write", "teams:read", "teams:write", "billing:read"

// Новые scopes (добавляются для API v1):
"security-state:read",     // Читать Security State
"security-state:read:lite", // Читать lite-версию (score + trend)
"explainability:read",      // Читать объяснения
"findings:read",            // Читать findings
"targets:read",             // Читать targets
"targets:write",            // Создавать/изменять targets
"webhooks:read",            // Читать webhooks
"webhooks:write",           // Создавать/изменять webhooks
"notifications:read",       // Читать настройки уведомлений
"notifications:write",      // Изменять настройки уведомлений
```

### 8.4 Rate Limiting Strategy

| Client Type | Limit | Window | Key |
|-------------|-------|--------|-----|
| Web (session) | 100 req/min | 60s | userId |
| API (key) | 300 req/min | 60s | apiKeyId |
| Telegram Bot | 30 msg/min | 60s | telegramUserId |
| CLI | 60 req/min | 60s | apiKeyId |
| Service token | 1000 req/min | 60s | serviceTokenId |
| Login attempts | 10/min | 60s | IP |
| Registration | 5/hour | 3600s | IP |
| Scan creation | 10/min | 60s | userId |
| PDF generation | 5/min | 60s | userId |

### 8.5 Audit Log (универсальный)

Все security-sensitive действия логируются через AuditPort:

```typescript
interface AuditPort {
  record(entry: AuditEntry): Promise<void>;
}

interface AuditEntry {
  action: string;         // "scan.create", "auth.login.success", "api_key.create"
  actorId?: string;
  actorEmail?: string;
  resourceType?: string;
  resourceId?: string;
  status: "success" | "failure";
  details?: Record<string, unknown>;
  requestId: string;      // Correlation ID
  clientId?: string;      // "web", "telegram_bot", "api"
  ip?: string;
  userAgent?: string;
}
```

---

## 9. API Versioning Strategy

### 9.1 URL-based Versioning

```
/api/v1/scans              ← версионированный
/api/v1/security-state/:id
/api/v1/targets
/api/v1/webhooks

/api/scans                 ← текущие (оставить для backward compatibility)
/api/keys
/api/teams
```

**Обоснование URL-based:** Простой, понятный, поддерживается всеми HTTP-клиентами. Header-based versioning (`Accept: application/vnd.secscanner.v1+json`) сложнее для CLI и Telegram Bot.

### 9.2 Compatibility Rules

| Правило | Описание |
|---------|----------|
| **Additive only** | Новые поля в response добавляются как optional. Старые поля никогда не удаляются. |
| **Never remove** | Поля, endpoints, query parameters — не удаляются, только deprecate. |
| **Deprecation period** | Минимум 6 месяцев. Deprecated поля возвращаются с `{ "deprecated": true }`. |
| **Breaking change → new version** | Если нужно удалить поле или изменить тип — создаём `/api/v2/`. |
| **Changelog** | Каждое изменение API документируется в CHANGELOG.md. |

### 9.3 Version Lifecycle

```
v1 (Current)  ──── Active ──── Supported ──── Deprecated ──── Removed
                  [0-12m]        [12-24m]        [24-30m]       [30m+]

v2 (Future)   ──── Active ──── ...
```

### 9.4 Migration Path для клиентов

1. **Response header:** `X-API-Version: v1` — клиент знает, какую версию использует.
2. **Sunset header:** `Sunset: Sat, 01 Jan 2028 00:00:00 GMT` — когда endpoint будет удалён.
3. **Deprecation header:** `Deprecation: true` — при запросе deprecated endpoint.
4. **Migration guide:** В каждом changelog — instructions для миграции на новую версию.

---

## 10. Observability

### 10.1 Structured Logging

```typescript
// src/application/shared/logger.ts

interface Logger {
  debug(message: string, ctx?: LogContext): void;
  info(message: string, ctx?: LogContext): void;
  warn(message: string, ctx?: LogContext): void;
  error(message: string, ctx?: LogContext, error?: Error): void;
}

interface LogContext {
  requestId: string;
  clientId?: string;
  actorId?: string;
  action?: string;
  durationMs?: number;
  [key: string]: unknown;
}

// Пример structured log entry:
// {
//   "level": "info",
//   "message": "Scan completed",
//   "requestId": "req_abc123",
//   "clientId": "web",
//   "actorId": "user_456",
//   "action": "scan.complete",
//   "durationMs": 5230,
//   "scanId": "scan_789",
//   "target": "https://example.com",
//   "score": 72,
//   "timestamp": "2026-07-14T12:00:00.000Z"
// }
```

### 10.2 Correlation IDs

Каждый запрос получает уникальный `requestId`:

1. **Web:** Генерируется в Next.js middleware, пробрасывается через все слои
2. **API:** Генерируется в middleware, возвращается в response header `X-Request-ID`
3. **Telegram Bot:** Генерируется при получении update, пробрасывается через Application Services
4. **CLI:** Генерируется в CLI клиенте, передаётся в query parameter или header
5. **Background Worker:** Генерируется при старте задачи

### 10.3 Health Checks

```
GET /api/health

Response:
{
  "status": "ok",
  "version": "0.2.0",
  "uptime": 86400,
  "checks": {
    "database": "ok",
    "smtp": "ok" | "degraded" | "down",
    "sse_connections": 5
  },
  "timestamp": "2026-07-14T12:00:00.000Z"
}
```

### 10.4 Metrics (будущее)

При внедрении Redis или внешнего мониторинга:

| Метрика | Тип | Описание |
|---------|-----|----------|
| `scan.duration_seconds` | Histogram | Длительность сканирования |
| `scan.total` | Counter | Общее количество сканов |
| `scan.score` | Gauge | Security Score по target |
| `api.request_duration_seconds` | Histogram | Длительность API запроса |
| `api.request_total` | Counter | Общее количество API запросов (по endpoint, status) |
| `auth.failures_total` | Counter | Количество неудачных попыток аутентификации |
| `notifications.sent_total` | Counter | Количество отправленных уведомлений (по каналу) |
| `events.published_total` | Counter | Количество опубликованных событий (по типу) |

---

## 11. Жизненный цикл запроса

### 11.1 Пример: Web user запускает скан

```
1. BROWSER                    2. MIDDLEWARE                 3. ROUTE HANDLER
   POST /api/v1/scans           Generate requestId           Parse body
   { target: "https://..." }   Add security headers         Call scanService.startScan()
   Cookie: session=xxx         Check auth (session)
                                ↓

4. APPLICATION SERVICE           5. PORTS/ADAPTERS              6. DOMAIN
   Validate URL                   scanRepo.create()             (not called yet)
   Authorize (can create?)        → Prisma scan.create()
   Rate limit check
   ↓
   EventPublisher.publish(ScanStarted)
   ↓ handlers:
     auditLogger → db.auditLog.create()
   ↓
   executeScan() [fire-and-forget]
     ↓
     After 4-8 seconds:
     scanRepo.updateStatus("completed")
     EventPublisher.publish(ScanCompleted)
       ↓ handlers:
       notificationService.notify() → emailAdapter.send()
       sseAdapter.broadcast()
       auditLogger → db.auditLog.create()
   ↓

7. RESPONSE
   { data: { id: "scan_abc", status: "scanning", ... }, meta: { requestId: "req_123" } }
```

### 11.2 Пример: Telegram Bot запрашивает status

```
1. TELEGRAM                    2. BOT HANDLER               3. APPLICATION SERVICE
   User: /status example.com    Authenticate (telegram ID)  securityStateService.getState()
                                  ↓
4. PORTS/ADAPTERS               5. DOMAIN
   scanRepo.findOpenFindings()  securityStateEngine.compute()
   → Prisma queries               → Pure computation
                                  ↓
6. BOT RESPONSE
   "Score: 72/100 | Trend: stable | 3 critical, 2 high
    Last scan: 2 hours ago
    Dashboard: https://secscanner.com/dashboard?target=..."
```

---

## 12. Стратегия масштабирования

### 12.1 Текущее состояние (Single Instance)

```
┌──────────────────────────────────┐
│           VPS (single)           │
│                                   │
│  ┌─────────┐  ┌──────────────┐  │
│  │ Next.js │  │  SQLite DB   │  │
│  │ Server  │──│  (via Prisma)│  │
│  └─────────┘  └──────────────┘  │
│                                   │
│  In-memory:                       │
│  - SSE subscriptions              │
│  - Rate limit buckets             │
│  - Event handlers                 │
└──────────────────────────────────┘
```

**Подходит для:** до 100 concurrent users, 1000 scans/day.

### 12.2 Intermediate (Redis + PostgreSQL)

```
┌──────────────────────────────────┐
│           VPS (or 2+ instances)  │
│                                   │
│  ┌─────────┐  ┌──────────────┐  │
│  │ Next.js │  │  PostgreSQL  │  │
│  │ (2+ inst)──│  (via Prisma)│  │
│  └────┬─────┘  └──────────────┘  │
│       │                           │
│  ┌────┴──────────────────────┐  │
│  │         Redis              │  │
│  │  - SSE pub/sub            │  │
│  │  - Rate limiting          │  │
│  │  - Event broker           │  │
│  │  - Session store          │  │
│  └───────────────────────────┘  │
└──────────────────────────────────┘
```

**Подходит для:** до 1000 concurrent users, 10000 scans/day.

### 12.3 Advanced (Microservices — далёкое будущее)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Web/API    │  │ Telegram Bot │  │   Worker     │
│   Server     │  │   Server     │  │   Server     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
┌──────┴─────────────────┴─────────────────┴──────┐
│                   Message Broker                   │
│                   (Redis / NATS)                   │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────┐
│                  Shared Services                    │
│  ┌────────────────────────────────────────────┐  │
│  │  Application Layer (shared package)         │  │
│  │  Domain Layer (shared package)              │  │
│  └────────────────────────────────────────────┘  │
│                       │                            │
│               ┌───────┴───────┐                    │
│               │  PostgreSQL   │                    │
│               └───────────────┘                    │
└────────────────────────────────────────────────────┘
```

**Ключевое:** Благодаря Platform Layer, переход от single-instance к microservices требует замены только Adapters (in-memory → Redis), а не бизнес-логики.

---

## 13. Roadmap — Приоритизация направлений

### 13.1 Методология

Каждое направление оценивается по 5 параметрам (1-5):

| Параметр | Определение |
|----------|------------|
| **ROI** | Business value per engineering hour |
| **Architecture** | Impact на long-term system health |
| **Users** | Impact на user experience и retention |
| **Commerce** | Impact на revenue или cost reduction |
| **Complexity** | Inverted: 5 = easy, 1 = very hard |

### 13.2 Направления

| # | Направление | Priority | ROI | Arch | Users | Commerce | Complex | Score | Engineering Cost |
|---|-------------|----------|-----|------|-------|----------|---------|-------|-----------------|
| 1 | **Platform Layer (этот спринт)** | P0 | 5 | 5 | 3 | 3 | 4 | **4.0** | 60-100h |
| 2 | **Public API v1** | P0 | 5 | 5 | 4 | 5 | 3 | **4.4** | 40-60h |
| 3 | **Telegram Bot** | P1 | 5 | 3 | 5 | 4 | 4 | **4.2** | 28-40h |
| 4 | **Email Weekly Digest** | P1 | 4 | 2 | 4 | 3 | 5 | **3.6** | 4-8h |
| 5 | **CI/CD Integration docs** | P1 | 3 | 3 | 4 | 5 | 4 | **3.8** | 8-12h |
| 6 | **GitHub Integration** | P2 | 4 | 3 | 3 | 4 | 2 | **3.2** | 40-60h |
| 7 | **GitLab Integration** | P2 | 3 | 3 | 3 | 4 | 2 | **3.0** | 40-60h |
| 8 | **Slack Integration** | P2 | 3 | 2 | 3 | 3 | 4 | **3.0** | 20-30h |
| 9 | **Jira Integration** | P2 | 3 | 2 | 3 | 3 | 3 | **2.8** | 30-40h |
| 10 | **Telegram Mini App** | P3 | 3 | 2 | 2 | 2 | 3 | **2.4** | 80-120h |
| 11 | **AI Assistant** | P3 | 4 | 3 | 3 | 3 | 2 | **3.0** | 60-100h |
| 12 | **Mobile App (Native)** | P3 | 1 | 1 | 1 | 2 | 1 | **1.2** | 400-800h |
| 13 | **Enterprise Features (SSO, SCIM, compliance)** | P2 | 3 | 4 | 3 | 5 | 2 | **3.4** | 80-120h |
| 14 | **Webhooks (generic)** | P1 | 4 | 4 | 3 | 3 | 4 | **3.6** | 16-24h |

### 13.3 Фазирование

```
Phase 1 (Foundation): Platform Layer + API v1
  └── Ожидаемый эффект: любой клиент может подключиться через единый слой
  └── Стоимость: 100-160h

Phase 2 (Notifications): Telegram Bot + Email Digest + Webhooks
  └── Ожидаемый эффект: real-time alerts, weekly reports, integrations
  └── Стоимость: 52-72h

Phase 3 (Integrations): CI/CD docs + GitHub/GitLab
  └── Ожидаемый эффект: автоматическое сканирование при деплое
  └── Стоимость: 48-72h

Phase 4 (Enterprise): SSO, SCIM, compliance reports
  └── Ожидаемый эффект: enterprise sales enablement
  └── Стоимость: 80-120h

Phase 5 (Advanced — conditional): Mini App, AI Assistant, Mobile
  └── Условие: данные пользователей подтверждают спрос
  └── Стоимость: 540-1020h (только если justify)
```

---

## 14. Самопроверка

### 14.1 Principal Architect Review

**Вопрос 1: Сможет ли через год появиться Mobile App без изменения Domain Layer?**

**Ответ: ДА.** Domain Layer (Security State Engine, Explainability Layer) не зависит от фреймворков и транспортных протоколов. Mobile App (React Native) будет:
1. Вызывать Application Services через HTTP API (Public API v1)
2. Или импортировать Application Layer как shared package (если monorepo)

В обоих случаях Domain Layer не изменяется.

**Вопрос 2: Сможет ли Telegram Bot использовать те же сервисы?**

**Ответ: ДА.** Telegram Bot вызывает те же Application Services (ScanService, SecurityStateService, etc.) через:
- Вариант A: Внутренний HTTP API (Bot делает запрос к /api/v1/)
- Вариант B: In-process вызов (если Bot запущен как часть Next.js сервера)

В обоих случаях бизнес-логика не дублируется.

**Вопрос 3: Сможет ли AI Assistant работать поверх существующих контрактов?**

**Ответ: ДА.** AI Assistant:
1. Аутентифицируется через Service Token → AuthService → AuthContext
2. Вызывает Application Services через Public API v1
3. Получает ExplanationOutput (summary, reasons, recommendations) в structured JSON
4. Формулирует ответ на естественном языке

Domain контракты (SecurityState, ExplanationResult) достаточно богаты для AI.

**Вопрос 4: Придётся ли дублировать бизнес-логику?**

**Ответ: НЕТ.** Все бизнес-правила инкапсулированы в:
- Domain Layer (score computation, trend, confidence, explanation, recommendations)
- Application Services (validation, authorization, orchestration, events)

Новый клиент = новый Transport Layer (тонкий controller), который вызывает существующие Application Services.

### 14.2 CTO Review

**Архитектурная зрелость: 8/10**

Сильные стороны:
- Чистое разделение Domain → Application → Transport
- Ports & Adapters позволяют заменить инфраструктуру без изменения бизнес-логики
- Event Architecture создаёт extensibility без modifications
- Unified Auth Model работает для всех клиентов

Слабые стороны:
- План предполагает значительный объём работы (100-160h для Phase 1)
- SQLite ограничивает multi-instance deployment
- In-memory event publisher не гарантирует delivery

**Расширяемость: 9/10**

Архитектура спроектирована так, что добавление нового клиента = добавление нового Transport Adapter (thin controller). Это минимальная работа с максимальным результатом.

**Стоимость поддержки: 7/10**

Платформа добавляет слой абстракции, который требует поддержки. Но этот слой **снижает** стоимость поддержки в долгосрочной перспективе, потому что:
- Изменения в бизнес-логике делаются в одном месте (Application Service)
- Новые клиенты не создают дублирования
- Тестирование бизнес-логики независимо от транспорта

**Коммерческий потенциал: 8/10**

Platform Layer — это фундамент для:
- Public API (enterprise sales argument)
- CI/CD интеграции (daily usage)
- Telegram Bot (retention)
- AI Assistant (differentiation)

**Риски: 6/10**

Основной риск — **over-engineering**. Если продукт не найдёт product-market fit, инвестиции в Platform Layer не окупятся. Митигация: Platform Layer реализуется incrementally (не весь сразу), по мере появления реальных клиентов, которым нужен новый канал.

**Улучшение с высоким ROI (внесено сразу):**

Добавить **Adapter для HTTP API Client** в Composition Root. Это позволит Telegram Bot и CLI вызывать Application Services не через прямые import, а через HTTP — что значит, что Bot может быть отдельным процессом (или даже отдельным сервером), не имея доступа к DB.

```typescript
// src/adapters/http-api-client.adapter.ts
class HttpApiApplicationClient {
  constructor(private baseUrl: string) {}

  async startScan(input: StartScanInput): Promise<Result<StartScanOutput, PlatformError>> {
    const res = await fetch(`${this.baseUrl}/api/v1/scans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: input.target }),
    });
    const json = await res.json();
    if (!res.ok) return fail(json.error);
    return ok(json.data);
  }
}
```

Это значит, что **даже без импорта Application Services**, любой клиент с HTTP доступом может использовать всю платформу.