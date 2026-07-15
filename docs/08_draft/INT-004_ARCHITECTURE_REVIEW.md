# INT-004: Architecture Review — Attack Path Builder

**Модуль:** `src/domain/security-intelligence/attack-path/`
**Дата ревью:** 2026-03-04
**Версия кода:** formulaVersion `1.0.0`
**Ревьюеры:** CTO, Security Architect, Attack Graph Specialist, Principal Backend Engineer

---

## Роль 1: CTO — Стратегическое выравнивание, бизнес-ценность, масштабируемость команды

### CTO-01: updateKGAdapterWithRisks() — пустая реализация (no-op)
- **Severity:** Critical
- **Title:** Метод `updateKGAdapterWithRisks()` не выполняет никаких действий
- **Description:** В `engine/index.ts` строки 392–397 метод `updateKGAdapterWithRisks()` содержит комментарий «This is a known limitation documented in TECHNICAL_DEBT» и не обновляет адаптер. KnowledgeGraphAdapter создаётся один раз в конструкторе с пустыми рисками. Несмотря на то что `DiscoveryInput.riskAssessments` передаётся, данные никогда не попадают в KG-адаптер, из-за чего все узлы получают дефолтный `riskScore: 0.5, level: Medium`.
- **Impact:** Вся ценность интеграции с Risk Assessment Engine теряется. Ранжирование путей и симуляция работают на дефолтных данных. Бизнес-решения на основе attack path analysis будут неточными.
- **Recommendation:** Реализовать метод `updateKGAdapterWithRisks()`, который обновляет `_riskScores`, `_findingMap`, `_assetMap`, `_entryPointIds`, `_objectiveIds` внутри `KnowledgeGraphAdapter`. Либо пересоздавать адаптер при каждом вызове `discover()`, либо сделать адаптер mutable с потокобезопасным обновлением.

### CTO-02: discoverBatch() — последовательное, а не параллельное выполнение
- **Severity:** High
- **Title:** Батчевая обработка выполняется последовательно в один поток
- **Description:** `discoverBatch()` (engine/index.ts:337–350) итерирует по массиву `inputs` и вызывает `this.discover(input)` последовательно. Для 10K batch-запросов это означает 10K последовательных await, каждый из которых включает графовый обход.
- **Impact:** Невозможность масштабирования для enterprise-нагрузок (100, 1K, 10K batch). Время обработки растёт линейно, тогда как параллельная обработка могла бы сократить его в N раз (при N worker'ах).
- **Recommendation:** Использовать `Promise.allSettled()` с контролем параллелизма (p-limit или custom semaphore с `batchSize` конфигурацией). Добавить `concurrencyLimit` в `AttackPathEngineConfig`.

### CTO-03: Отсутствие механизма отмены (cancellation) для долгих операций
- **Severity:** Medium
- **Title:** Нет поддержки AbortController / cancellation token
- **Description:** Методы `discover()`, `discoverAll()`, `discoverBatch()`, `project()` не принимают `AbortSignal` или аналогичный механизм отмены. При `timeoutMs: 30_000` (дефолт) движок может зависнуть на 30 секунд без возможности отмены извне.
- **Impact:** В UI-сценариях пользователь не может отменить долгий поиск путей. В API-сценариях нет graceful shutdown.
- **Recommendation:** Добавить `AbortSignal` в `DiscoveryInput` и проверять его внутри циклов discovery/ranking. Передавать сигнал в `GraphTraversalEngine`.

### CTO-04: Неполное покрытие MITRE ATT&CK тактик
- **Severity:** Medium
- **Title:** AttackObjectiveType покрывает только 9 из 14 тактик MITRE ATT&CK
- **Description:** Enum `AttackObjectiveType` включает InitialAccess, CredentialAccess, Discovery, LateralMovement, PrivilegeEscalation, Persistence, Collection, Exfiltration, Impact. Отсутствуют: Execution, Command and Control, Defense Evasion, Reconnaissance, Resource Development.
- **Impact:** Сокрытие критических атак-цепочек, включающих Defense Evasion и C2. Неполная модель угроз снижает ценность продукта для security-команд.
- **Recommendation:** Расширить `AttackObjectiveType` минимум на Execution, CommandAndControl, DefenseEvasion. Reconnaissance и ResourceDevelopment можно добавить опционально.

### CTO-05: Статистика без ограничения памяти
- **Severity:** Low
- **Title:** AttackPathStatisticsCollector накапливает массивы таймингов без ограничения
- **Description:** `discoveryTimes`, `rankingTimes`, `simulationTimes`, `projectionTimes` — неограниченные `number[]`, растущие бесконечно в долгоживущих процессах.
- **Impact:** Потенциальная утечка памяти в server-side сценариях при миллионах операций.
- **Recommendation:** Использовать ring buffer (circular buffer) фиксированного размера (например, 10K записей) или exponential moving average для расчёта средних.

---

## Роль 2: Security Architect — Корректность графа атак, соответствие MITRE ATT&CK, свойства безопасности

### SA-01: Небезопасная десериализация attackPathFromJSON()
- **Severity:** Critical
- **Title:** `attackPathFromJSON()` не валидирует данные после JSON.parse()
- **Description:** Функция `attackPathFromJSON()` (models/index.ts:544–555) выполняет `JSON.parse(json)` и сразу создаёт объект через spread-оператор без валидации. Branded-типы (`AttackPathId`, `AttackStepId` и др.) теряются — любая строка из JSON автоматически считается валидным branded ID.
- **Impact:** Злоумышленник может внедрить произвольные данные через сериализованный JSON. Отсутствие валидации позволяет создать AttackPath с невалидными risk scores, отрицательными stepIndex, отсутствующими обязательными полями. Это прямая угроза целостности security-данных.
- **Recommendation:** Реализовать полную валидацию в `attackPathFromJSON()`: проверить структуру, типы полей, диапазоны числовых значений, наличие обязательных полей. Пересоздавать вложенные объекты через фабричные функции (`createAttackNode`, `createAttackStep` и т.д.) вместо spread. Добавить схемную валидацию (zod или аналогичную).

### SA-02: ID-генерация с Math.random() — не криптографически стойкая
- **Severity:** High
- **Title:** Все `generate*Id()` функции используют `Math.random()`
- **Description:** Функции генерации ID (models/index.ts:37–69) используют `Math.random().toString(36).slice(2, 9)`. `Math.random()` — не CSPRNG, его выход предсказуем при известных initial conditions.
- **Impact:** Возможность предсказания или перебора ID атак-путей. В контексте security-продукта это особенно критично — attacker может угадать ID существующих путей и получить доступ к результатам анализа.
- **Recommendation:** Заменить `Math.random()` на `crypto.randomUUID()` или `crypto.getRandomValues()`. В Node.js использовать `require('crypto').randomUUID()`. В браузере — `globalThis.crypto.randomUUID()`.

### SA-03: Упрощённая логика определения detection points
- **Severity:** High
- **Title:** isDetectionPoint определяется только по nodeType и requiresAuthentication
- **Description:** В `buildStepsFromNodes()` (discovery/index.ts:504–505) `isDetectionPoint` устанавливается как `node.nodeType === Vulnerability || incomingEdge?.requiresAuthentication`. Это исключает множество реальных точек обнаружения: сетевой мониторинг (lateral movement), SIEM-правила, EDR-алерты, HIDS сигнатуры.
- **Impact:** Занижение количества detection points в симуляции → завышение `successProbability` → ложное чувство безопасности. Security-команды получают неточную картину detectability.
- **Recommendation:** Расширить модель `isDetectionPoint`: учитывать `nodeType === Service` (service exploitation detectable), lateral movement через сетевой сегмент, технику с низким `detectionDifficulty`. Добавить свойство `detectionMethods: string[]` в `AttackStep` для явного указания методов обнаружения.

### SA-04: Произвольный base risk 0.5 для неизвестных узлов
- **Severity:** Medium
- **Title:** KnowledgeGraphAdapter назначает riskScore=0.5 всем узлам без RiskAssessment
- **Description:** В `toAttackNode()` (discovery/index.ts:93) дефолтный риск `{ score: 0.5, level: Medium }` для узлов без RiskAssessment. Уровень «Medium» для неизвестных узлов маскирует реальную неопределённость.
- **Impact:** Узлы без RiskAssessment выглядят «умеренно рискованными» вместо «неизвестных». Это может привести к игнорированию реальных угроз на неизвестных участках инфраструктуры.
- **Recommendation:** Ввести уровень `RiskLevel.Unknown` и `riskScore: 0.0` для узлов без оценки. В ранжировании учитывать неопределённость отдельным фактором.

### SA-05: Отсутствие целостности кэша (cache poisoning)
- **Severity:** Medium
- **Title:** Кэш не верифицирует целостность кэшированных данных
- **Description:** `AttackPathCache` хранит объекты `AttackPath` и `AttackSimulation` в памяти без каких-либо проверок целостности при чтении. Хотя current implementation in-memory, при будущей экстенсии к Redis/external store это станет уязвимостью.
- **Impact:** Потенциальный cache poisoning — подмена кэшированных результатов анализа безопасности.
- **Recommendation:** Добавить HMAC-подпись к кэшируемым значениям (используя `crypto.createHmac`). При чтении из кэша верифицировать подпись. Это подготовит архитектуру к external cache.

### SA-06: Неиспользуемый AttackEvidence в pipeline
- **Severity:** Low
- **Title:** AttackEvidence никогда не заполняется в pipeline discovery→ranking→simulation
- **Description:** Интерфейс `AttackEvidence` определён, но в `createAttackPath()` передаётся пустой массив `evidence: []`. Ни discovery, ни ranking, ни simulation не создают evidence-записей.
- **Impact:** Отсутствие traceability — невозможно объяснить, почему конкретный путь получил данный рейтинг или вероятность. Снижает доверие к результатам анализа.
- **Recommendation:** Добавить генерацию evidence на каждом этапе: discovery — из каких KG-узлов/рёбер собран путь, ranking — какие факторы доминируют, simulation — какие шаги являются bottleneck.

---

## Роль 3: Attack Graph Specialist — Алгоритмы обнаружения путей, формула ранжирования, точность симуляции, корректность проекции графа

### AGS-01: Построение ложных путей из всех посещённых узлов
- **Severity:** Critical
- **Title:** convertTraversalResult() строит «путь» из всех посещённых узлов, нарушая связность
- **Description:** В `convertTraversalResult()` (discovery/index.ts:424–438), когда `result.paths.length === 0`, fallback-логика вызывает `buildStepsFromNodes(attackNodes, attackEdges, objective.type)`, который итерирует по всем узлам последовательно. Для BFS/DFS/Reachability это означает, что узлы, посещённые в разных ветвях обхода, будут соединены в один «путь», хотя между ними может не быть реального ребра.
- **Impact:** Создание несуществующих атак-путей. Узлы, не связанные реальными рёбрами атаки, будут представлены как последовательность шагов. Это фундаментальная ошибка корректности графа атак.
- **Recommendation:** Убрать fallback-ветку, создающую путь из всех посещённых узлов. Если `result.paths` пуст, вернуть пустой массив `DiscoveredPath[]`. Для BFS/DFS всегда требовать `collectPaths: true` в TraversalEngine. Если TraversalEngine не поддерживает сбор путей для данной стратегии — возвращать пустой результат с diagnostic warning.

### AGS-02: findEdgeTo() выбирает только первое ребро, игнорируя параллельные
- **Severity:** High
- **Title:** findEdgeTo() возвращает первое совпадение вместо всех параллельных рёбер
- **Description:** `findEdgeTo()` (discovery/index.ts:532–534) использует `edges.find()` и возвращает `AttackEdge | null`. Если между двумя узлами существует несколько рёбер (например, exploitation + credentialUse), только первое будет учтено как `incomingEdge` шага.
- **Impact:** Параллельные векторы атаки между узлами теряются. Это занижает оценку exploitability и может привести к пропуску критических атак-цепочек.
- **Recommendation:** Изменить `findEdgeTo()` на `findEdgesTo()`, возвращающий `AttackEdge[]`. В `buildStepsFromNodes` собирать все входящие рёбра и использовать их для вычисления `isCritical`, `isDetectionPoint`, и множественных техник.

### AGS-03: Cumulative probability предполагает независимость шагов
- **Severity:** High
- **Title:** computeCumulativeProbability() использует произведение вероятностей без учёта зависимости
- **Description:** `computeCumulativeProbability()` (simulation/index.ts:96–105) вычисляет `P(path) = Π P(step_i)`, предполагая независимость. На практике успешное выполнение T1078 (Valid Accounts) значительно повышает вероятность T1021 (Remote Services) — это зависимые события.
- **Impact:** Для путей с зависимыми шагами cumulative probability систематически занижается. Для 10-шагового пути с `stepBase=0.85` вероятность составит `0.85^10 ≈ 0.20`, что может быть значительно ниже реальной при условных зависимостях.
- **Recommendation:** Добавить conditional probability model: ввести `AttackEdge.conditionalDependencies` (какие предыдущие шаги повышают/понижают вероятность данного). Как минимум — документировать assumption о независимости в JSDoc и добавить warning при `steps.length > 5`.

### AGS-04: Отсутствие валидации суммы весов ранжирования
- **Severity:** High
- **Title:** RankingConfig не валидирует, что сумма весов равна 1.0
- **Description:** Формула ранжирования (ranking/index.ts:156–164) использует взвешенную сумму 8 факторов, но нет проверки что `riskWeight + lengthWeight + ... + confidenceWeight === 1.0`. Дефолтные веса суммируются в 1.00, но пользователь может задать произвольные веса.
- **Impact:** Если веса не суммируются в 1.0, `overallScore` может превышать 1.0 или быть систематически заниженным. Хотя `clamp01` ограничит результат, относительное сравнение путей будет некорректным.
- **Recommendation:** Добавить валидацию в конструктор `PathRankingEngine`: если сумма весов отклоняется от 1.0 более чем на ε=0.01, выбрасывать `RankingConfigValidationError`. Либо нормализовать веса автоматически.

### AGS-05: Projection строит подграф от первого узла, а не от всех узлов пути
- **Severity:** Medium
- **Title:** GraphProjectionEngine.project() вызывает extractSubgraph(nodeIds[0]) вместо использования всех nodeIds
- **Description:** В `project()` (projection/index.ts:94–108) вызывается `this._traversalEngine.extractSubgraph(nodeIds[0], { maxDepth })`. Это означает, что подграф строится только от первого узла пути. Если путь длинный, а `maxDepth` недостаточно, конечные узлы пути могут не попасть в подграф.
- **Impact:** Неполная проекция — критические узлы в конце пути могут отсутствовать в подграфе. Визуализация будет некорректной.
- **Recommendation:** Вызывать `extractSubgraph()` для каждого узла пути и объединять результаты, либо реализовать метод `extractSubgraphForNodes(nodeIds[])` в TraversalEngine.

### AGS-06: Жёстко закодированные коэффициенты в формулах ранжирования
- **Severity:** Medium
- **Title:** Коэффициенты 0.7/0.3, 0.6/0.4, 0.85 и др. не конфигурируемы
- **Description:** В ranking: `computeRiskScore` (0.7/0.3), `computeExploitAvailabilityScore` (0.6/0.4), `computeInternetExposureScore` (порог 30%), `computeBusinessImpactScore` (0.6/0.4), `computeConfidenceScore` (0.7/0.3). В simulation: `stepBase=0.85`, `riskPenaltyFactor=0.3`, `authPenalty=0.15`, `privilegePenalty=0.2`, `detectionPenalty=0.1`, `lateralPenalty=0.1`, `identifyBottlenecks` (порог 1.2), `identifyCriticalSteps` (порог riskScore>=0.7).
- **Impact:** Невозможность калибровки модели под конкретную инфраструктуру. Все «магические числа» не имеют документированного обоснования.
- **Recommendation:** Вынести все коэффициенты в `RankingConfig` и `SimulationConfig`. Документировать каждый коэффициент с обоснованием (литература, эмпирика).

### AGS-07: BuildStepsFromNodes не ассоциирует техники с шагами
- **Severity:** Medium
- **Title:** Шаги создаются без привязки техник из MITRE ATT&CK registry
- **Description:** В `buildStepsFromNodes()` (discovery/index.ts:486–524) `AttackStepInput` не включает `techniques`. Поле `techniques` остаётся пустым для всех шагов. `AttackTechniqueRegistry` создан, но никогда не используется для привязки техник к шагам.
- **Impact:** Функция `computeExploitAvailabilityScore()` работает с пустыми `step.techniques`, получая дефолтное значение 0.1. Ranking и simulation не учитывают конкретные техники — ключевая функциональность MITRE ATT&CK alignment не работает.
- **Recommendation:** После создания AttackStep, выполнить lookup техник через `AttackTechniqueRegistry.getByTactic()` на основе edgeType и nodeType шага. Привязать найденные техники к шагу.

---

## Роль 4: Principal Backend Engineer — Качество кода, производительность, тестируемость, API-дизайн, сопровождаемость

### PBE-01: Динамический import() внутри цикла
- **Severity:** Critical
- **Title:** `await import('../models/index.ts')` выполняется в каждой итерации цикла discover()
- **Description:** В `discover()` (engine/index.ts:167) внутри `for (const discovered of discoveryResult.paths)` вызывается `const { createAttackPathRanking } = await import('../models/index.ts')`. Это динамический import, выполняемый на каждой итерации цикла.
- **Impact:** В лучшем случае — overhead от повторных вызовов import(). В худшем — при определённых bundler/runtime конфигурациях каждый вызов может инициировать новый module load. Для 50 путей (maximumPaths) — до 50 динамических import-вызовов.
- **Recommendation:** Вынести `import { createAttackPathRanking } from '../models/index.ts'` на уровень модуля (статический import). Файл `models/index.ts` уже импортирован статически через `createAttackPath` и другие функции на строке 51.

### PBE-02: Молчаливое проглатывание ошибок (catch {})
- **Severity:** High
- **Title:** Пустые catch-блоки в discover(), project(), projection engine
- **Description:** `discover()` (engine/index.ts:204) содержит `catch { return []; }` — при любой ошибке возвращается пустой массив без логирования. Аналогично в `convertTraversalResult`, `project()`, `projectMultiple()` — ошибки полностью проглатываются.
- **Impact:** Невозможность отладки в production. Ошибки в graph traversal, data conversion, ranking — всё скрывается. Пользователь получает пустой результат и не знает причину.
- **Recommendation:** Добавить `console.error()` или интеграцию с logging framework в каждом catch-блоке. Включить error details в statistics. Рассмотреть `Result<T, E>` pattern вместо silent failure.

### PBE-03: Type-unsafe `as any` приведения в PathDiscoveryEngine
- **Severity:** High
- **Title:** 6+ приведений `as any` при вызовах GraphTraversalEngine
- **Description:** В discovery/index.ts: `options as any` используется в строках 309, 321, 336, 358–359, 387. Тип `options` объявлен как `Record<string, unknown>`, что несовместимо с реальным API TraversalEngine.
- **Impact:** Потеря type-safety — изменения в API GraphTraversalEngine не будут выявлены на этапе компиляции. Риск runtime-ошибок при несовместимых параметрах.
- **Recommendation:** Импортировать реальный тип `TraversalOptions` из knowledge-graph/traversal и использовать его вместо `Record<string, unknown>` / `as any`.

### PBE-04: AttackPathEngine не реализует disposable-паттерн
- **Severity:** Medium
- **Title:** Нет механизма очистки ресурсов при остановке engine
- **Description:** `AttackPathEngine` содержит внутренний кэш (`_cache`), event bus (`eventBus`), statistics collector — все с mutable state. Нет метода `dispose()` или реализации `Symbol.dispose`/`Symbol.asyncDispose`.
- **Impact:** В тестах и при использовании нескольких engine instances — утечки подписок eventBus. В long-running processes — невозможность корректного shutdown.
- **Recommendation:** Реализовать `Symbol.dispose` / `Symbol.asyncDispose`. В методе очистки: очистить кэш, отписать все event handlers, сбросить статистику. Добавить `using` pattern support.

### PBE-05: Отсутствие структурированных типов ошибок
- **Severity:** Medium
- **Title:** Все ошибки — generic `Error` без кодов и контекста
- **Description:** Все `throw new Error(...)` в models/index.ts, techniques/index.ts, discovery/index.ts используют простые строки. Нет иерархии ошибок, нет error codes, нет контекста (например, nodeId, pathId).
- **Impact:** Невозможность программной обработки ошибок. Пользователь не может различить ошибку валидации от ошибки discovery. Неудобная отладка.
- **Recommendation:** Создать иерархию: `AttackPathError` → `DiscoveryError`, `RankingError`, `SimulationError`, `ValidationError`. Каждый с `code`, `context`, `cause`.

### PBE-06: hashAttackPath() хэширует только ID
- **Severity:** Low
- **Title:** Хэш-функция учитывает только path.id, игнорируя содержимое
- **Description:** `hashAttackPath()` (models/index.ts:590–599) хэширует `path.id` — идентификатор, а не содержимое пути. Два структурно идентичных пути с разными ID дадут разные хэши.
- **Impact:** Невозможно использовать хэш для дедупликации путей или быстрого сравнения содержимого.
- **Recommendation:** Хэшировать ключевые поля: `steps.map(s => s.node.id + s.incomingEdge?.id).join('|')` или использовать canonical JSON representation.

### PBE-07: cloneAttackPath() — потери при JSON round-trip
- **Severity:** Low
- **Title:** Deep clone через JSON round-trip теряет branded types и может быть неточным
- **Description:** `cloneAttackPath()` (models/index.ts:585–587) использует `attackPathFromJSON(attackPathToJSON(path))`. Это теряет branded types, не валидирует данные, и некорректно обрабатывает `undefined` vs missing fields.
- **Impact:** Клонированный путь не проходит `validateAttackPath()` — branded types потеряны, `Object.freeze` на вложенных объектах может отсутствовать.
- **Recommendation:** Реализовать structured clone через re-creation через фабричные функции, либо использовать `structuredClone()` (native Web API), который корректно обрабатывает frozen objects.

---

## Summary

### Итого по уровням серьёзности

| Severity   | Количество |
|------------|-----------|
| Critical   | 3         |
| High       | 7         |
| Medium     | 8         |
| Low        | 4         |
| **Всего**  | **22**    |

### Critical findings — детали и план исправления

| ID       | Title                                                        | Fix                                                                                                   |
|----------|--------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| CTO-01   | `updateKGAdapterWithRisks()` — no-op                         | Реализовать обновление `_riskScores`/`_findingMap`/`_assetMap`/`_entryPointIds`/`_objectiveIds` в KGAdapter; пересоздавать адаптер при каждом discover() или сделать его mutable |
| SA-01    | `attackPathFromJSON()` — нет валидации                       | Добавить полную структурную и семантическую валидацию; пересоздавать вложенные объекты через фабричные функции |
| AGS-01   | `convertTraversalResult()` — ложные пути из всех узлов       | Убрать fallback-ветку; требовать `collectPaths: true` для BFS/DFS/Reachability; при отсутствии paths возвращать пустой массив |
| PBE-01   | Динамический `import()` внутри цикла                         | Заменить динамический import на статический; `createAttackPathRanking` уже доступна через существующий static import |

### High findings — детали и план исправления

| ID       | Title                                                        | Fix                                                                                                   |
|----------|--------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| CTO-02   | `discoverBatch()` — последовательное выполнение               | Использовать `Promise.allSettled()` с concurrency limiter; добавить `concurrencyLimit` в конфигурацию |
| SA-02    | ID-генерация через `Math.random()`                           | Заменить на `crypto.randomUUID()` или `crypto.getRandomValues()`                                      |
| SA-03    | Упрощённая логика `isDetectionPoint`                         | Расширить критерии: Service nodes, lateral movement edges, техники с низким detectionDifficulty       |
| AGS-02   | `findEdgeTo()` — только первое ребро                         | Изменить на `findEdgesTo()`, возвращающий все рёбра; обновить `buildStepsFromNodes`                  |
| AGS-03   | Cumulative probability без учёта зависимости                 | Документировать assumption; добавить warning при длинных путях; заложить conditional probability API  |
| AGS-04   | RankingConfig — нет валидации суммы весов                    | Добавить валидацию (сумма = 1.0 ± ε) в конструкторе PathRankingEngine                                |
| PBE-02   | Пустые catch-блоки                                           | Добавить логирование ошибок; рассмотреть Result-паттерн                                              |
| PBE-03   | `as any` приведения в PathDiscoveryEngine                     | Импортировать `TraversalOptions` из knowledge-graph; типизировать options                            |

---

## Подтверждение устранения Critical и High issues

> **Статус:** Все 4 Critical и 7 High findings будут устранены в следующих порядках:
>
> - **Critical fixes** (target: sprint текущий):
>   - [ ] CTO-01: Реализация `updateKGAdapterWithRisks()` — уже запланирована как часть TECHNICAL_DEBT
>   - [ ] SA-01: Валидация в `attackPathFromJSON()` — будет добавлена в models/index.ts
>   - [ ] AGS-01: Устранение fallback-ветки в `convertTraversalResult()` — будет исправлено в discovery/index.ts
>   - [ ] PBE-01: Замена динамического import на статический — будет исправлено в engine/index.ts
>
> - **High fixes** (target: sprint + 1):
>   - [ ] CTO-02: Параллельный `discoverBatch()` с concurrency limiter
>   - [ ] SA-02: Замена `Math.random()` на `crypto.randomUUID()` во всех генераторах ID
>   - [ ] SA-03: Расширение логики `isDetectionPoint`
>   - [ ] AGS-02: `findEdgeTo()` → `findEdgesTo()` для параллельных рёбер
>   - [ ] AGS-03: Документирование assumption о независимости + conditional probability API
>   - [ ] AGS-04: Валидация суммы весов в `RankingConfig`
>   - [ ] PBE-02: Логирование ошибок в catch-блоках
>   - [ ] PBE-03: Устранение `as any` — типизация `TraversalOptions`
>
> Все Critical и High findings подтверждаются к устранению. Ответственные назначены.

---

*Конец документа INT-004 Architecture Review*
