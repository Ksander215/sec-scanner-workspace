# API Stability Report — INT-004 Attack Path Builder

Дата: 2026-07-16
Модуль: `src/domain/security-intelligence/attack-path/`

## Статусы

- **Stable** — API не изменится в обратно-несовместимом manner в ближайших релизах
- **Experimental** — API может измениться; используйте с осторожностью
- **Internal** — Не предназначен для внешнего использования; может измениться без уведомления

---

## Public API

### AttackPathEngine (Stable)

| Метод | Статус | Описание |
|-------|--------|----------|
| `discover(input)` | **Stable** | Обнаружение attack paths от source к objective |
| `discoverAll(input)` | **Stable** | Обнаружение всех возможных путей для всех objective types |
| `rank(paths)` | **Stable** | Ранжирование путей по детерминированной формуле |
| `simulate(path)` | **Stable** | Детерминированная симуляция attack path |
| `project(path)` | **Stable** | Проекция пути на подграф Knowledge Graph |
| `statistics()` | **Stable** | Статистика движка |
| `summarize(paths)` | **Stable** | Сводка по обнаруженным путям |
| `discoverBatch(inputs)` | **Stable** | Batch-обработка discovery запросов |
| `techniqueRegistry` | **Stable** | Реестр MITRE ATT&CK техник |
| `rankingEngine` | **Stable** | Движок ранжирования |
| `simulationEngine` | **Stable** | Движок симуляции |
| `cacheStatistics` | **Stable** | Статистика кэша |
| `eventBus` | **Stable** | Шина событий |
| `reset()` | **Stable** | Сброс состояния движка |

---

### Domain Models (Stable)

| Модель | Статус | Описание |
|--------|--------|----------|
| `AttackPath` | **Stable** | Полный attack path от entry point до objective |
| `AttackStep` | **Stable** | Один шаг в attack path |
| `AttackChain` | **Stable** | Цепочка attack steps |
| `AttackEdge` | **Stable** | Ребро attack graph |
| `AttackNode` | **Stable** | Узел attack graph |
| `AttackObjective` | **Stable** | Цель атаки (MITRE ATT&CK tactic) |
| `AttackEvidence` | **Stable** | Доказательство, подтверждающее путь |
| `AttackPathSummary` | **Stable** | Сводка по всем обнаруженным путям |
| `AttackSimulation` | **Stable** | Результат детерминированной симуляции |
| `AttackPathRanking` | **Stable** | Рейтинг attack path |

---

### Enums (Stable)

| Enum | Статус | Описание |
|------|--------|----------|
| `DiscoveryStrategy` | **Stable** | BFS, DFS, ShortestPath, MultiPath, Reachability |
| `AttackObjectiveType` | **Stable** | 9 MITRE ATT&CK-aligned objectives |
| `AttackNodeType` | **Stable** | 10 типов узлов attack graph |
| `AttackEdgeType` | **Stable** | 10 типов рёбер attack graph |
| `StopConditionType` | **Stable** | Типы условий остановки |

---

### Configuration (Stable)

| Config | Статус | Описание |
|--------|--------|----------|
| `AttackPathEngineConfig` | **Stable** | Конфигурация движка |
| `RankingConfig` | **Stable** | Веса факторов ранжирования |
| `DiscoveryConstraints` | **Stable** | Ограничения discovery |
| `SimulationConfig` | **Experimental** | Конфигурация симуляции (параметры штрафов) |
| `ProjectionConfig` | **Experimental** | Конфигурация проекции |

---

### Factory Functions (Stable)

| Функция | Статус |
|---------|--------|
| `createAttackNode()` | **Stable** |
| `createAttackEdge()` | **Stable** |
| `createAttackStep()` | **Stable** |
| `createAttackChain()` | **Stable** |
| `createAttackObjective()` | **Stable** |
| `createAttackEvidence()` | **Stable** |
| `createAttackPathRanking()` | **Stable** |
| `createAttackPath()` | **Stable** |
| `createAttackPathSummary()` | **Stable** |
| `createAttackSimulation()` | **Stable** |

---

### Events (Stable)

| Event | Статус |
|-------|--------|
| `PathDiscoveredEvent` | **Stable** |
| `PathRankedEvent` | **Stable** |
| `SimulationCompletedEvent` | **Stable** |
| `AttackGraphBuiltEvent` | **Stable** |
| `AttackPathEventBus` | **Stable** |

---

### Objective Factory Functions (Stable)

| Функция | Статус |
|---------|--------|
| `createInitialAccessObjective()` | **Stable** |
| `createCredentialAccessObjective()` | **Stable** |
| `createDiscoveryObjective()` | **Stable** |
| `createLateralMovementObjective()` | **Stable** |
| `createPrivilegeEscalationObjective()` | **Stable** |
| `createPersistenceObjective()` | **Stable** |
| `createCollectionObjective()` | **Stable** |
| `createExfiltrationObjective()` | **Stable** |
| `createImpactObjective()` | **Stable** |
| `createObjectiveByType()` | **Stable** |

---

### Ranking Score Functions (Stable)

| Функция | Статус |
|---------|--------|
| `computeRiskScore()` | **Stable** |
| `computePathLengthScore()` | **Stable** |
| `computeExploitAvailabilityScore()` | **Stable** |
| `computePrivilegeEscalationScore()` | **Stable** |
| `computeLateralMovementScore()` | **Stable** |
| `computeInternetExposureScore()` | **Stable** |
| `computeBusinessImpactScore()` | **Stable** |
| `computeConfidenceScore()` | **Stable** |
| `computeOverallRankingScore()` | **Stable** |

---

### Simulation Functions (Stable)

| Функция | Статус |
|---------|--------|
| `computeStepProbability()` | **Stable** |
| `computeCumulativeProbability()` | **Stable** |
| `identifyCriticalSteps()` | **Stable** |
| `identifyBottlenecks()` | **Stable** |
| `identifyDetectionPoints()` | **Stable** |
| `determineRequiredCapabilities()` | **Stable** |

---

### Internal APIs (Internal)

| Компонент | Статус | Описание |
|-----------|--------|----------|
| `KnowledgeGraphAdapter` | **Internal** | Адаптер KG → Attack Graph; не предназначен для прямого использования |
| `PathDiscoveryEngine` | **Internal** | Внутренний движок discovery; используйте AttackPathEngine.discover() |
| `ConstraintsEngine` | **Internal** | Внутренний движок constraints; управляется через DiscoveryConstraints |
| `AttackPathStatisticsCollector` | **Internal** | Внутренний коллектор статистики |
| `AttackTechniqueRegistry` | **Stable** | Реестр техник; расширяемый через register() |

---

### Cache (Internal)

| Компонент | Статус |
|-----------|--------|
| `AttackPathCache` | **Internal** |

---

### Serialization (Stable)

| Функция | Статус |
|---------|--------|
| `attackPathToJSON()` | **Stable** |
| `attackPathFromJSON()` | **Stable** |
| `attackSimulationToJSON()` | **Stable** |

---

## Версионирование

- **Formula version**: `1.0.0` — включена в cache keys для инвалидации
- **Breaking changes** требуют обновления `formulaVersion` в конфигурации
