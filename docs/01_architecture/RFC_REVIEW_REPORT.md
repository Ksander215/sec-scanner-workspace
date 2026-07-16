# RFC Review Report — RFC-001: Security Intelligence Engine

**Дата:** 2026-07-15  
**Документ:** RFC-001_SECURITY_INTELLIGENCE_ENGINE.md  
**Статус ревью:** COMPLETED  

---

## Роль 1: CTO Review

### Замечания

1. **Детерминированность соблюдена.** Все 7 ADR подтвержддают, что SIE не использует недетерминированные алгоритмы. Risk Engine, Confidence Engine, Correlation Engine — все основаны на детерминированных вычислениях. Это полностью соответствует CTO Decision #6.

2. **Цепочка ценности Knowledge -> Intelligence -> Explainability -> Action выдержана.** SIE получает данные исключительно из Knowledge Graph (Knowledge), производит анализ (Intelligence), формирует ExplainabilityOutput (Explainability), и генерирует Recommendations (Action). Порядок слоёв строго соблюдён.

3. **Zero Coupling с существующими модулями.** ADR-INT-001 и ADR-INT-006 гарантируют, что SIE не зависит от сканирующих движков. Knowledge Graph Adapter как Anti-Corruption Layer изолирует SIE от инфраструктурных изменений.

### Найденные риски

1. **RISK-CTO-001: Зависимость от KG-001.** SIE полностью зависит от доступности и корректности Security Knowledge Graph. Если KG-001 ещё не завершён (статус: IN PROGRESS), то INT-001 не может начаться. Необходимо завершить KG-001 до начала реализации SIE.

2. **RISK-CTO-002: Версионирование результатов.** ADR-INT-002 устанавливает immutable-результаты, но не определяет стратегию garbage collection для устаревших версий. При регулярном анализе (Continuous Security) объём данных будет расти экспоненциально.

### Рекомендации

1. **REC-CTO-001:** Добавить явную зависимость INT-001 от завершения KG-001 в Roadmap. Начало реализации SIE возможно только после стабилизации Graph Query API.

2. **REC-CTO-002:** Определить политику хранения версий результатов анализа (retention policy). Предложить: хранить последние N версий + все версии за последние M дней.

3. **REC-CTO-003:** Рассмотреть добавление ADR о выборе формата ExplainabilityOutput для совместимости с будущим Explainability Engine v2.

### Предложения по улучшению

- Добавить раздел "Migration Path" — как будет происходить миграция при смене бэкенда KG (NetworkX -> Neo4j)
- Уточнить, какие гарантии даёт SIE при частичном сбое (completeness level)

---

## Роль 2: Principal Engineer Review

### Замечания

1. **Архитектура пайплайна хорошо структурирована.** 5 стадий (Ingestion -> Resolution -> Aggregation -> Analysis -> Output) с чёткими интерфейсами между ними. Каждый компонент имеет определённые входы и выходы.

2. **Domain Model детальна и полна.** 12 сущностей с полями, жизненным циклом и зависимостями. Все ключевые абстракции предметной области отражены.

3. **API Contract хорошо определён.** 7 публичных методов с типизированными параметрами и возвращаемыми значениями.

### Найденные риски

1. **RISK-PE-001: Тесная связность Correlator и Identity Resolution.** Finding Correlator зависит от IdentityMap, создаваемого Identity Resolution. Если Identity Resolution работает некорректно (ложные слияния), корреляции будут ошибочными. Необходимо добавить валидацию IdentityMap.

2. **RISK-PE-002: Отсутствие механизма отката.** При ошибке в середине пайплайна (например, Risk Engine timeout) частичные результаты могут быть несогласованными. Architecture описывает Circuit Breaker, но не описывает, как согласовывать partial results.

3. **RISK-PE-003: Масштабируемость Correlation Engine.** Корреляция — O(n^2) операция в худшем случае. При 10K+ находок производительность может стать критичной. Map-Reduce стратегия описана, но без конкретных числовых оценок.

### Рекомендации

1. **REC-PE-001:** Добавить IdentityMap Validation — отдельный шаг после Identity Resolution, проверяющий корректность слияний (например, что не сливаются сущности с разными CWE).

2. **REC-PE-002:** Определить CompletenessLevel для каждого результата: Full (все этапы завершены), PartialWithRisk (Risk есть, но Attack Paths не построены), Degraded (только Normalized Findings).

3. **REC-PE-003:** Добавить performance benchmarks для Correlation Engine: ожидаемое время при 1K, 5K, 10K находках. Определить порог, при котором необходим переход на distributed processing.

4. **REC-PE-004:** Рассмотреть добавление SamplingStrategy для Correlation Engine при больших объёмах данных — анализировать не все пары, а статистически значимую выборку.

### Предложения по улучшению

- Добавить диаграмму State Machine для жизненного цикла Finding
- Добавить примеры ExplainabilityOutput для конкретных сценариев (SQL Injection, XSS, Auth Bypass)
- Рассмотреть Event Sourcing для внутреннего состояния SIE вместо простых events

---

## Роль 3: Security Architect Review

### Замечания

1. **Security Considerations адекватны.** Read-only доступ к графу, отсутствие логирования секретов, детерминированность результатов, валидация входных данных — все базовые принципы соблюдены.

2. **Attack Path Builder хорошо спроектирован.** Максимальная глубина 10 шагов, обнаружение циклов, ранжирование по приоритету — это разумные ограничения, предотвращающие бесконечный обход и взрывную сложность.

3. **Risk Model комплексна.** 7 параметров с весами — это хороший баланс между полнотой и простотой. Математическая модель прозрачна и воспроизводима.

### Найденные риски

1. **RISK-SA-001: Manipulation through crafted findings.** Злоумышленник, знающий алгоритм Risk Engine, может создать находки, специально снижающие Risk Score. Например, Submission находок с низким severity для稀释 (dilution) агрегированного риска. Необходима защита от adversarial inputs.

2. **RISK-SA-002: Attack Path completeness.** Attack Path Builder использует DFS/BFS, что может пропустить неочевидные пути в сложных графах. Нет гарантии полноты — количество найденных путей зависит от порядка обхода и установленных ограничений.

3. **RISK-SA-003: Correlation false positives.** Ложные корреляции могут привести к завышению Risk Score. Cross-validation помогает, но не устраняет проблему полностью. Необходим явный false positive rate benchmark.

### Рекомендации

1. **REC-SA-001:** Добавить Adversarial Robustness раздел — как SIE защищён от манипуляции входными данными. Предложить: ограничение на количество находок от одного источника, аномалия-детекция для необычных паттернов.

2. **REC-SA-002:** Добавить Attack Path Completeness Metric — доля известных путей, обнаруженных Builder'ом, относительно общего числа путей (оцениваемого экспертами). Это позволит калибровать алгоритм.

3. **REC-SA-003:** Определить целевой False Positive Rate для Correlation Engine и добавить автоматизированный тест с известными true/false correlations.

4. **REC-SA-004:** Рассмотреть добавление Attack Graph (формальная модель) в дополнение к Attack Path (последовательность шагов). Attack Graph позволяет моделировать альтернативные пути и комбинированные атаки более точно.

### Предложения по улучшению

- Добавить Threat Model для самого SIE (STRIDE analysis)
- Уточнить, как обрабатываются Finding от сканеров с разной достоверностью (Nuclei с высоким confidence vs. Browser Intel с предполагаемыми проблемами)
- Добавить Security Unit Tests — тесты, проверяющие, что SIE не генерирует опасные или вводящие в заблуждение рекомендации

---

## Роль 4: Staff Backend Engineer Review

### Замечания

1. **API Contract практичен.** 7 методов покрывают основные сценарии использования. Типизация через Pydantic обеспечивает валидацию и документацию.

2. **Event Model логична.** 11 внутренних событий покрывают весь жизненный цикл анализа. Подписка на Artifact Bus для инкрементального анализа — правильный подход.

3. **Failure Handling продуман.** Circuit Breaker, Retry with Backoff, Partial Results — стандартные и проверенные паттерны.

### Найденные риски

1. **RISK-BE-001: Отсутствие механизма отмены.** При длительном анализе (большой граф) нет способа отменить выполнение. Необходим CancellationToken или аналог.

2. **RISK-BE-002: Кэширование без TTL.** В Performance Considerations упоминается кэширование, но не определена стратегия инвалидации. Stale cache может привести к некорректным результатам.

3. **RISK-BE-003: Отсутствие прогресс-индикации.** Пользователь (Dashboard) не может узнать прогресс анализа. Для больших графов анализ может занимать минуты — без прогресс-индикации это выглядит как зависание.

### Рекомендации

1. **REC-BE-001:** Добавить CancellationToken в IntelligenceAPI.analyze() и все долгие операции. При отмене возвращать partial results с CompletenessLevel.

2. **REC-BE-002:** Определить Cache Strategy: TTL-based (cache на N минут) + Event-driven invalidation (подписка на GraphUpdated). Приоритет: event-driven > TTL.

3. **REC-BE-003:** Добавить Progress Reporting — AnalysisProgress с percentage и current_stage. Реализация через polling или WebSocket.

4. **REC-BE-004:** Добавить конкретные типы Pydantic-моделей для всех API-методов вместо абстрактных описаний. Это упростит реализацию и тестирование.

5. **REC-BE-005:** Определить формат логирования (structured logging) для всех компонентов SIE. Единый формат логов критичен для диагностики в production.

### Предложения по улучшению

- Добавить пример конфигурации SIE (YAML/JSON) для типичного сценария
- Определить метрики для мониторинга SIE (Prometheus-compatible)
- Рассмотреть добавление Rate Limiting для Intelligence API

---

## Сводка ревью

### Архитектурные достоинства

1. **Детерминированность** — полное соответствие CTO Decision #6, все алгоритмы воспроизводимы
2. **Zero Coupling** — SIE не зависит от сканирующих движков и не требует изменений в существующих модулях
3. **Immutable Architecture** — все результаты неизменяемы, обеспечивая аудитоспособность
4. **Explainability First** — каждый вывод содержит полную трассировку
5. **Комплексная Domain Model** — 12 сущностей покрывают все ключевые абстракции
6. **Прозрачная Risk Model** — математическая модель открыта и параметризуема
7. **Anti-Corruption Layer** — Knowledge Graph Adapter изолирует от инфраструктурных изменений

### Потенциальные риски

| # | Риск | Критичность | Ответственный |
|---|------|-------------|---------------|
| RISK-CTO-001 | Зависимость от KG-001 | HIGH | CTO |
| RISK-CTO-002 | Версионирование результатов | MEDIUM | Principal Engineer |
| RISK-PE-001 | Тесная связность Correlator/IR | MEDIUM | Principal Engineer |
| RISK-PE-002 | Отсутствие механизма отката | MEDIUM | Principal Engineer |
| RISK-PE-003 | Масштабируемость Correlation | HIGH | Principal Engineer |
| RISK-SA-001 | Adversarial manipulation | MEDIUM | Security Architect |
| RISK-SA-002 | Attack Path completeness | LOW | Security Architect |
| RISK-SA-003 | Correlation false positives | MEDIUM | Security Architect |
| RISK-BE-001 | Отсутствие отмены | MEDIUM | Staff Backend |
| RISK-BE-002 | Кэширование без TTL | MEDIUM | Staff Backend |
| RISK-BE-003 | Отсутствие прогресса | LOW | Staff Backend |

### Открытые вопросы

1. **Завершение KG-001** — когда Graph Query API будет стабилизирован?
2. **Производительность Correlation** — при каком объёме находок необходим distributed processing?
3. **Adversarial robustness** — нужна ли защита от целенаправленной манипуляции?
4. **Retention policy** — сколько версий результатов анализа хранить?

### Рекомендации перед началом INT-001

1. **Завершить KG-001 и стабилизировать Graph Query API** — без этого реализация SIE невозможна
2. **Добавить CompletenessLevel** — для обработки partial results при сбоях
3. **Добавить CancellationToken** — для отмены длительных операций
4. **Определить Cache Strategy** — TTL + event-driven invalidation
5. **Создать Performance Benchmarks** — для Correlation Engine и Attack Path Builder
6. **Определить Retention Policy** — для версий результатов анализа
7. **Добавить Progress Reporting** — для интеграции с Dashboard
8. **Разработать Security Unit Tests** — для проверки корректности Risk Score и Recommendations

---

## Итоговая оценка

**RFC-001: APPROVED WITH CONDITIONS**

Архитектура Security Intelligence Engine спроектирована качественно и полностью соответствует стратегическим принципам платформы. Детерминированность, неизменяемость, объяснимость и zero coupling — все фундаментальные требования соблюдены. 7 ADR зафиксированы и обоснованы.

Перед началом реализации INT-001 необходимо:
1. Завершить KG-001
2. Внести правки по критическим рекомендациям (RISK-PE-003, RISK-CTO-001)
3. Утвердить Open Questions

После выполнения этих условий RFC-001 может служить основанием для реализации INT-001.
