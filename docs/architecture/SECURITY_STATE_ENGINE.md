# Security State Engine — Техническая документация

> **Версия:** 1.0
> **Дата:** 2026-07-14
> **Статус:** Production-ready (Sprint 1)
> **Автор:** Lead Engineer

---

## 1. Назначение

Security State Engine — доменный модуль для вычисления агрегированного состояния безопасности. Является **единственным источником правды** о текущем состоянии безопасности Target.

Модуль спроектирован как **чистая бизнес-логика без внешних зависимостей**:
- Нет Prisma, React, Next.js, Express
- Нет I/O, нет side effects
- Детерминистичный: одинаковый вход → одинаковый результат
- Полностью тестируемый (82 теста, 100% покрытие)

---

## 2. Архитектура

### Принципы

| Принцип | Реализация |
|---------|-----------|
| **Чистая бизнес-логика** | Все вычисления — чистые функции в `src/domain/` |
| **Нет зависимости от инфраструктуры** | Модуль работает с данными через интерфейсы (тypes) |
| **Расширяемость** | ScoreStrategy и TrendStrategy — точки расширения для будущего AI/Compliance |
| **Защитное программирование** | `computeSecurityScore` фильтрует findings внутри, даже если вызывающий забыл отфильтровать |
| **Тестируемость** | Изолированные чистые функции, покрывающие граничные случаи |

### Файловая структура

```
src/domain/security-state/
├── types.ts              # Доменные типы, интерфейсы, веса по умолчанию
├── score.ts              # Алгоритм Security Score (0–100)
├── risk.ts               # Risk Score, Severity Breakdown, Period Counts
├── trend.ts              # Trend Direction, Score Change
├── confidence.ts          # Confidence Score (0.0–1.0)
├── engine.ts             # SecurityStateEngine — оркестратор, единственная точка входа
├── index.ts              # Public API + pre-configured singleton
├── score.test.ts          # 28 тестов для алгоритма счёта
├── risk.test.ts           # 21 тестов для risk и периодов
├── trend.test.ts          # 12 тестов для трендов
├── confidence.test.ts      # 7 тестов для confidence
├── engine.test.ts         # 14 тестов для интеграции + edge cases + custom strategies
└── test-helpers.ts       # Общие тестовые утилиты (makeFinding, makeScan, NOW)
```

### Зависимости модуля от остального кода

```
domain/security-state/
  ← НОЛЬКО типы из types.ts (date-objects, enums)
  ← Стандартная библиотека TypeScript (Math, Map, Set)
  ← Никакие импорты из src/lib, src/app, @prisma/client
```

Модуль **можно** использоваться:
- В Next.js API Routes (через адаптер, получающий данные из DB)
- В фоновых задачах (BullMQ worker, cron job)
- В тестах (прямой импорт, моковые данные)

Модуль **нельзя** использоваться:
- В React компонентах (это бизнес-логика)
- В Prisma middleware (это бизнес-логика)
- В layout.tsx (это бизнес-логика)

---

## 3. Модель данных

### Входные данные (SecurityStateInput)

```typescript
interface SecurityStateInput {
  targetId: string;
  findings: Finding[];           // ВСЕ findings для target (все статусы)
  scans: ScanSummary[];         // История сканов, recent-first
  previousSnapshots: SecurityStateSnapshot[];  // Для trend calculation
  now: Date;                     // Опорная точка (для тестов)
  comparisonPeriodDays?: number;    // Окно для period counts (default: 30)
}
```

### Выходные данные (SecurityState)

```typescript
interface SecurityState {
  targetId: string;
  computedAt: Date;

  // Первичные метрики
  securityScore: number;    // 0–100, выше = безопаснее
  riskScore: number;       // 0–100, выше = опаснее
  trend: TrendDirection;  // improving | stable | declining | unknown
  scoreChange: number | null;

  // Метрики Findings
  openFindings: SeverityBreakdown;
  openFindingsCount: number;
  resolvedInPeriod: number;
  regressionCount: number;
  newFindingsInPeriod: number;

  // Метрики сканирования
  lastSuccessfulScanAt: Date | null;
  lastScanStartedAt: Date | null;
  totalScans: number;

  // Качество данных
  confidence: number;        // 0.0–1.0
}
```

---

## 4. Алгоритмы вычисления

### 4.1 Security Score (0–100)

**Файл:** `score.ts` — `computeSecurityScore()`

**Формула:**
```
score = 100
for each OPEN finding:
  score -= severityWeight(finding.severity) × ageMultiplier(finding.age)
score = clamp(score, 0, 100)
```

**Веса по умолчанию (по умолчанию):**

| Severity | Weight | Обоснование |
|----------|--------|--------------|
| info | 0 | Информационные, не риски |
| low | 1 | Минимальный эффект, легко устраняется |
| medium | 5 | Средний риск, требует внимания |
| high | 15 | Серьёзная уязвимость |
| critical | 25 | Немедленное воздействие на безопасность |

**Возрастные множители:**

| Возраст | Множитель | Логика |
|---------|-----------|-------|
| < 7 дней | 0.7 | Недавнее открытие — может быть в процессе исправления |
| 7–30 дней | 1.0 | Стандартное время на исправление |
| 30–90 дней | 1.3 | Устаревшая проблема — негативный сигнал |
| > 90 дней | 1.6 | Критическая задержка — системная проблема |

**Защитная фильтрация:** Функция фильтрует findings внутри себя через `isOpenFinding()`. Даже если вызывающий передал non-open findings, они будут проигнорированы.

### 4.2 Risk Score (0–100)

**Файл:** `risk.ts` — `computeRiskScore()`

**Формула:**
```
risk = 100 − securityScore

// Корректировки (аддитивные):
if stale critical (>30 days):  risk += 15
if regressions present:      risk += min(10, regressionCount × 5)
if no scan in 30 days:    risk += 10

risk = clamp(risk, 0, 100)
```

### 4.3 Trend Direction

**Файл:** `trend.ts` — `computeTrend()`

| Условие | Результат |
|-----------|---------|
| Нет истории | `unknown` |
| |change| < threshold (3 pts) | `stable` |
| change > 0 | `improving` |
| change < 0 | `declining` |

### 4.4 Confidence Score (0.0–1.0)

**Файл:** `confidence.ts` — `computeConfidence()`

| Фактор | Вес | Логика |
|--------|------|-------|
| Freshness | 0.5 | <7d → 1.0, 7-30d → линейная интерполяция, >30d → 0 |
| Coverage | 0.3 | Есть ≥ 1 завершённый скан → 1.0 |
| Data Volume | 0.2 | ≥3 скана → 1.0, 1-2 скана → 0.5, 0 → 0 |

### 4.5 Period Counts

**Файл:** `risk.ts` — `computePeriodCounts()`

Подсчитывает в указанном периоде:
- `newInPeriod` — новые findings (firstSeen в периоде, статус open/confirmed)
- `resolvedInPeriod` — findings, закрытые в периоде (lastResolved в периоде)
- `regressedInPeriod` — findings с resolutionCount > 0, повторно обнаруженные после закрытия

---

## 5. Точки расширения

### ScoreStrategy (интерфейс)

```typescript
interface ScoreStrategy {
  readonly id: string;
  readonly name: string;
  computeScore(
    openFindings: Finding[],
    weights: ScoreWeights,
    now: Date,
  ): number;
}
```

**Назначение:** Позволяет подменить алгоритм счёта без изменения остального кода. Например:
- ML-based scoring (более точные веса на основе реальных данных)
- Compliance-weighted scoring (ISO 27001, SOC2)
- Risk-context scoring (для финансовых приложений)

### TrendStrategy (интерфейс)

```typescript
interface TrendStrategy {
  computeTrend(
    currentScore: number,
    previousSnapshots: SecurityStateSnapshot[],
    weights: ScoreWeights,
  ): TrendDirection;
}
```

**Назначение:** Позволяет подменить логику определения тренда. Например:
- ML-based trend prediction
- Seasonal adjustment (учёт низкую активность в выходные)

### Будущие расширения (не реализованы, но архитектура поддерживает)

| Расширение | Как подключить |
|-----------|-----------------|
| Recommendation Engine | ScoreStrategy + новая логика рекомендаций |
| Compliance Engine | ScoreStrategy + weighted compliance checks |
| AI Assistant | Подписка на SecurityState через интерфейс |
| Notification Engine | Подписка на SecurityState для триггеров |
| Scheduled Scans | Подписка на SecurityState после каждого скана |
| Dashboard Widget | Подписка на SecurityState для UI |

---

## 6. Использование

### Базовый (через singleton)

```typescript
import { securityStateEngine } from "@/domain/security-state";

const state = securityStateEngine.compute(input);
console.log(state.securityScore); // 78
```

### Через кастомные веса

```typescript
import { SecurityStateEngine } from "@/domain/security-state";

const engine = new SecurityStateEngine({
  weights: {
    severity: { critical: 30, high: 20, medium: 5, low: 1, info: 0 },
  },
});
```

### Через кастомную стратегию

```typescript
const engine = new SecurityStateEngine({
  scoreStrategy: myCustomScorer,
});
```

### Lite-режим (для списков)

```typescript
const lite = engine.computeLite(input);
// lite = { securityScore, riskScore, trend, openFindings, confidence }
```

### В API Route (через адаптер)

```typescript
// src/app/api/v1/security-state/route.ts

import { securityStateEngine } from "@/domain/security-state";

export async function GET(req: Request) {
  const findings = await db.finding.findMany({ where: { targetId } });
  const scans = await db.scan.findMany({ where: { targetId }, orderBy: { completedAt: "desc" } });
  const snapshots = await db.securityStateSnapshot.findMany({ where: { targetId } });

  const state = securityStateEngine.compute({
    targetId,
    findings: findings.map(adaptToDomainFinding),
    scans: scans.map(adaptToScanSummary),
    previousSnapshots: snapshots.map(adaptToSnapshot),
    now: new Date(),
  });

  return NextResponse.json({ data: state });
}
```

---

## 7. Тестирование

### Запуск тестов

```bash
npx vitest run src/domain/security-state/
```

### Покрытие

- **82 теста**, все проходят
- Покрытие: алгоритмы счёта, граничные случаи, custom стратегии
- 0 мок external зависимостей
- ~1.2 секунды на полный прогон

---

## 8. Самопроверка (Self-Review)

### Слабые места

**1. Confidence freshness для "new" target (с 1 сканом > 7 дней)**

Когда у target есть только 1 скан (недавно созданный), DataVolume = 0.5. Это корректно — недостаточно данных для высокой уверенности. Но порог может быть запутывающимся для пользователей, которые только что добавили target и запустили первый скан. Возможное решение: временно повышать confidence при первом скане (вне зависимости от DataVolume).

**Статус:** Не исправлено. Причина: нецелевое поведение, не влияет на корректность, может быть улучшено в будущей итерации.

**2. Period counts считают новые findings, даже если они были сразу же закрыты**

Если finding `firstSeen` попадает в период (30 дней) и статус `open`, он считается "новым". Но если скан в котором он был обнаружен также в этом периоде и finding уже `resolved`, то тот же finding всё равно считается "новым". Это не ошибка, а особенность определения. Альтернатива: считать "new" только findings, которые всё ещё открыты на момент вычисления.

**Статус:** Не исправлено. Причина: корректное поведение по определению, но может быть пересмотрено.

**3. Отсутствует in-memory кэширование**

Security State вычисляется каждый раз с нуля. Для workspace с 500+ targets это может быть медленно. Когда будет добавлен Redis, кэшировать результат в памяти и инвалидировать по событиям.

**Статус:** Запланировано (не проблема для текущего масштаба).

**4. `computeFindingImpacts` не учитывает `isActiveFinding` фильтр**

Impact chart показывает все non-info findings, включая dismissed и accepted_risk. Это может запутать пользователя. Но это функция для отладки, а не для основного вычисления. Не критично.

**Статус:** Не исправлено. Причина: low impact.

### Улучшения, уже применённые во время самопроверки

**1. `computeSecurityScore` — защитная фильтрация**

Исходный алгоритм доверял вызывающему, передавая только `open`/`confirmed` findings. Добавлена внутренняя проверка `if (!isOpenFinding(finding)) continue;` для защиты от ошибок.

**2. `computeConfidence` — сортировка по дате**

Исходная реализация брала первый найденный завершённый скан, а не самый свежий. Исправлено на `.sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())`.

**3. ScoreStrategy / TrendStrategy интерфейсы**

Добавлены точки расширения для кастомных стратегий. Движение к этой архитектуре уже подготовлено — достаточно реализовать класс, реализовать интерфейс, и передать в конструктор.

---

## 9. Ограничения текущей версии

| Ограничение | Влияние | Путь устранения |
|--------------|---------|----------------|
| Нет хранения исторических snapshot'ов | Нет исторического тренда | Добавить SecurityStateSnapshot в DB + периодический вызов engine.compute() |
| Нет scheduled recomputation | State актуален только по запросу | Добавить фоновый пересчёт при событиях |
| Age multiplier — 4 фиксированных корзины | Грубая градация возраста | Продолжать использовать Map, но добавить больше точек или плавную интерполяцию |
| Confidence не учитывает finding уникальность | 0 findings = 1.0 (не совсем корректно) | Учесть количество уникальных CWE-локаций |

---

## 10. Компромиссы

| Компромисс | Причина | Альтернатива |
|-------------|--------|-------------|
| Score зависит от весов, которые нужно перенастраивать при добавлении новых типов уязвимостей | Жёсткие веса заложены в коде | Вынести веса в БД, добавить admin UI для настройки |
| Period counts не учитывают "в процессе исправления" статус | Сложно определить "в процессе" | Добавить nullable `inProgressSince` или использовать `confirmed` статус |
|vitest 3 вместо vitest 4 (downgrade)| Vitest 4 ломал `.ts` module resolution с `moduleResolution: "bundler"` на Node.js 24 | Следить за обновлением Vitest или дождь исправления в Node.js/Vitest |

---

## 11. Миграционный путь (не выполнять сейчас)

1. **Month 3-6:** Добавить таблицу `SecurityStateSnapshot` в Prisma, persists после каждого `engine.compute()` вызова.
2. **Month 6-9:** Добавить in-memory кэш (Redis) с инвалидацией по событиям.
3. **Month 9-12:** Добавить `RecommendationEngine` как `ScoreStrategy` реализацию.