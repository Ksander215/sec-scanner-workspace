# API_STABILITY_REPORT_INT-004.5 — Attack Impact Analysis Engine

## Статус API по категориям

### ✅ Stable — Публичный API, обратная совместимость гарантируется

| API | Модуль | Описание |
|-----|--------|----------|
| `ImpactAnalysisEngine.analyze()` | engine | Основной метод анализа воздействия |
| `ImpactAnalysisEngine.simulate()` | engine | Симуляция сценария митигации |
| `ImpactAnalysisEngine.compare()` | engine | Сравнение двух анализов |
| `ImpactAnalysisEngine.rank()` | engine | Ранжирование кандидатов на ремедиацию |
| `ImpactAnalysisEngine.statistics()` | engine | Статистика работы движка |
| `ImpactAnalysisEngine.reset()` | engine | Сброс состояния |
| `ImpactAnalysisEngine.analyzeBatch()` | engine | Пакетный анализ |
| `createImpactScenario()` | models | Создание сценария |
| `createMitigationEffect()` | models | Создание эффекта митигации |
| `createAttackPathDelta()` | models | Создание дельты путей |
| `createRiskDelta()` | models | Создание дельты риска |
| `createSecurityScoreDelta()` | models | Создание дельты security score |
| `createDependencyImpact()` | models | Создание зависимости |
| `createRemediationCandidate()` | models | Создание кандидата ремедиации |
| `createImpactAnalysis()` | models | Создание полного анализа |
| `computeSecurityScore()` | models | Вычисление security score из риска |
| `computeSecurityGrade()` | models | Вычисление security grade из score |
| `impactAnalysisToJSON()` | models | Сериализация |
| `impactAnalysisFromJSON()` | models | Десериализация с валидацией |
| `MitigationScenarioType` | types | Enum — 8 типов сценариев |
| `AttackPathChangeType` | types | Enum — 4 типа изменений |
| `RemediationRankingStrategy` | types | Enum — 4 стратегии ранжирования |
| `SecurityGrade` | types | Enum — A/B/C/D/F |
| `DEFAULT_IMPACT_ENGINE_CONFIG` | types | Конфигурация по умолчанию |
| `ImpactEventBus` | events | Шина событий |
| `ImpactCache` | cache | LRU + TTL кэш |

### 🧪 Experimental — API может измениться в следующих версиях

| API | Модуль | Описание | Риск |
|-----|--------|----------|------|
| `evaluateScenario()` | scenarios | Прямой вызов сценарного обработчика | Факторы митигации могут стать конфигурируемыми |
| `computeGraphDelta()` | graph-delta | Вычисление graph delta | Может потребоваться интеграция с KG API |
| `computeConnectivityScore()` | graph-delta | Вычисление score связности | Формула может измениться |
| `computeRemediationScore()` | models | Композитный score ремедиации | Веса могут быть калиброваны |
| `computeRecommendationImpact()` | recommendation | Вычисление метрик рекомендаций | Зависит от TD-01 |
| `computeAttackSurfaceReduction()` | delta | Вычисление сокращения поверхности | Формула может стать нелинейной |
| `ImpactAnalysisEngine.cacheStatistics` | engine | Статистика кэша | Может быть заменён на метод |
| `ImpactAnalysisEngine.eventBus` | engine | Доступ к EventBus | Может быть заменён на subscription API |

### 🔒 Internal — Не предназначен для внешнего использования

| API | Модуль | Описание |
|-----|--------|----------|
| `ScenarioEvaluationResult` | scenarios | Внутренний тип результата оценки сценария |
| `GraphDelta` | graph-delta | Внутренний тип graph delta |
| `GraphNodeChange` | graph-delta | Внутренний тип изменения узла |
| `GraphEdgeChange` | graph-delta | Внутренний тип изменения ребра |
| `GraphComponentChange` | graph-delta | Внутренний тип изменения компонента |
| `ImpactStatisticsCollector` | statistics | Внутренний коллектор статистики |
| `brandImpactAnalysisId()` | types | Брендирование ID (внутреннее) |
| Все `*Input` интерфейсы | models | Входные типы для фабрик |

## Правила совместимости

1. **Stable API**: Изменения только через additive evolution. Breaking changes требуют major version bump.
2. **Experimental API**: Может измениться между minor versions. Клиенты должны ожидать изменений.
3. **Internal API**: Не использовать вне модуля. Может быть удалён или реорганизован без предупреждения.
