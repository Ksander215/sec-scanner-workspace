# KG Architecture Review Report — KG-001: Knowledge Graph Architecture

**Дата:** 2026-07-15  
**Документ:** KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md  
**Статус ревью:** COMPLETED  

---

## Роль 1: CTO Review

### Замечания

1. **Архитектура полностью соответствует стратегическим принципам.** CTO Decision #3 (Knowledge Graph — единый источник истины) реализован через Graph Platform как SSOT. Все данные о безопасности — только через Graph Query API. CTO Decision #7 (Immutable Domain Models) —严格执行 через immutable узлы, рёбра и snapshot-based versioning.

2. **Zero Coupling с существующими модулями выдержан.** KG Platform не зависит от TASK-201, TASK-202, Pipeline Executor или SIE. Ingestion Layer подписывается на Artifact Bus (который уже существует), а Graph Query API предоставляет данные потребителям. Ни один существующий модуль не требует модификации.

3. **Цепочка ценности Knowledge -> Intelligence -> Explainability -> Action поддержана.** KG обеспечивает Knowledge слой (единый граф знаний). SIE (Intelligence) получает данные через Graph Query API. Explainability Engine работает с Graph Snapshot для стабильных объяснений. Recommendation Engine использует Traversal Engine для построения Attack Paths.

### Найденные риски

1. **RISK-CTO-001: Зависимость INT-001 от выбора Storage Backend.** Архитектура Storage Agnostic, но при реализации INT-001 необходимо выбрать конкретный бэкенд (NetworkX, Neo4j, ArangoDB). Выбор определит performance characteristics, deployment complexity и operational cost. Неверный выбор потребует миграции.

2. **RISK-CTO-002: Retention Policy не определена.** Immutable graph + snapshot-based versioning означает непрерывный рост объёма данных. Без чёткой Retention Policy (сколько версий хранить, когда удалять старые snapshots) storage cost будет расти линейно. Это отмечено в Open Questions #1, но требует приоритетного решения.

3. **RISK-CTO-003: Eventual Consistency между Graph и потребителями.** Graph Event Bus обеспечивает eventual consistency, но не strong consistency. Временное рассогласование между графом и SIE может привести к устаревшим результатам анализа. Для безопасности это может быть критично.

### Рекомендации

1. **REC-CTO-001:** Определить Storage Backend Selection Criteria до начала INT-001. Критерии: in-memory performance (NetworkX), persistent storage (Neo4j), multi-model (ArangoDB). Рекомендация: начать с NetworkX для MVP, подготовить Neo4j adapter для production.

2. **REC-CTO-002:** Утвердить Retention Policy: хранить последние 30 snapshots + все delta за последние 7 дней. Данные старше 30 snapshots — archive в cold storage (S3/Glacier). Это должно быть добавлено в RFC перед утверждением.

3. **REC-CTO-003:** Добавить Consistency Level в Graph Query API: STRONG (чтение из текущей версии графа, по умолчанию) и EVENTUAL (чтение из последнего snapshot, для Explainability). Это позволяет потребителям выбирать нужный уровень консистентности.

4. **REC-CTO-004:** Добавить метрики Graph Health в RFC: Node Count, Edge Count, Index Freshness, Snapshot Age, Event Lag. Мониторинг health графа критичен для production.

### Предложения по улучшению

- Добавить раздел "Migration Path" — как будет происходить миграция при смене Storage Backend (NetworkX -> Neo4j)
- Определить SLA для Graph Query API (p95 latency, availability)
- Рассмотреть добавление Graph Health Check endpoint для readiness/liveness probes

---

## Роль 2: Principal Graph Engineer Review

### Замечания

1. **Graph Domain Model детальна и полна.** 16 сущностей с полями, жизненным циклом, ответственностью и связями. GraphNode, GraphEdge, NodeIdentity, NodeMetadata, Relationship — все ключевые абстракции графовой модели отражены. Каждая сущность имеет чёткую ответственность.

2. **Traversal Engine хорошо спроектирован.** 7 алгоритмов с определённой сложностью (BFS O(V+E), Dijkstra O((V+E)log V), и т.д.). Параметры traversal (max_depth, weight_threshold, edge_types) обеспечивают гибкость без потери детерминированности. Кэширование на уровне traversal — правильный подход.

3. **Storage Model комплексна.** Adjacency List + Reverse Index + Property Index + Temporal Index + Provenance Index покрывают все типы запросов. Сложность операций определена для каждой структуры данных.

### Найденные риски

1. **RISK-PGE-001: Adjacency List не поддерживает weighted traversal эффективно.** Рёбра отсортированы по весу (убывание), но BFS/DFS с weight_threshold требуют фильтрации на каждой итерации. Для графа с 150K рёбер и weight_threshold=0.5 это может означать проверку 75K рёбер вхолостую.

2. **RISK-PGE-002: Snapshot creation — blocking operation.** Создание полного snapshot требует сериализации всего графа. Для графа с 50K узлов и 150K рёбер это может занять несколько секунд, в течение которых Graph Platform заблокирована.

3. **RISK-PGE-003: Delta chain length не ограничена формально.** Упоминается "макс. 50 delta перед обязательным snapshot", но нет механизма enforcement. Если pipeline не завершается корректно, delta chain может расти бесконечно.

4. **RISK-PGE-004: Merge semantics не определены для всех случаев.** Раздел 12.7 определяет 5 стратегий разрешения конфликтов, но не покрывает случай, когда два источника предоставляют несовместимые NodeIdentity (разный identity_type для одного и того же объекта).

### Рекомендации

1. **REC-PGE-001:** Добавить Weighted Adjacency Index — отдельный индекс, где рёбра сгруппированы по weight ranges (0.0-0.3, 0.3-0.6, 0.6-1.0). Это позволит BFS/DFS с weight_threshold пропускать целые группы рёбер без проверки каждой.

2. **REC-PGE-002:** Реализовать Async Snapshot Creation — snapshot создаётся в background, не блокируя Graph Platform. Использовать Copy-on-Write: при начале snapshot creation все новые записи направляются в new version, а snapshot формируется из current version.

3. **REC-PGE-003:** Добавить Delta Chain Length Guard — если количество delta с последнего snapshot превышает 50, автоматически триггерить snapshot creation. Это должно быть реализовано как invariant check в Graph Builder.

4. **REC-PGE-004:** Определить Identity Merge Rules: если два NodeIdentity ссылаются на один и тот же объект (определяется по hash или по cross-reference), создать MergedIdentity, содержащий оба identity_type. Priority: url > hostname > ip > cve (по убыванию специфичности).

5. **REC-PGE-005:** Добавить Graph Statistics API — метод, возвращающий текущую статистику графа (node_count по типам, edge_count по типам, avg_degree, max_depth, index_cardinality). Необходим для мониторинга и debugging.

### Предложения по улучшению

- Добавить пример Mermaid-диаграммы для конкретного графа приложения (Application -> Host -> Endpoint -> Finding -> AttackStep)
- Рассмотреть добавление Graph Compact operation — удаление Archived узлов и сжатие delta chain
- Добавить benchmark estimates: ожидаемое время query/traverse при 10K, 50K, 100K узлах

---

## Роль 3: Distributed Systems Architect Review

### Замечания

1. **Event Driven Architecture принята корректно.** Graph Event Bus как отдельная шина для графовых событий — правильное решение, изолированное от Artifact Bus. Это позволяет масштабировать шины независимо и назначать разные гарантии доставки.

2. **Snapshot + Delta hybrid — оптимальный паттерн.** Полный snapshot для быстрого восстановления, delta для инкрементальных обновлений. Это стандартный паттерн в distributed systems (аналог checkpointing в Flink/Spark).

3. **Optimistic Locking для concurrent writes — разумный выбор.** При низкой конкуренции (pipeline writes sequentially) optimistic locking эффективнее pessimistic.

### Найденные риски

1. **RISK-DSA-001: Single Point of Failure — Graph Platform.** Если Graph Platform недоступна, все потребители (SIE, EE, Dashboard) не могут работать. Нет механизма failover или replica для чтения.

2. **RISK-DSA-002: Event Bus buffer overflow.** Ring buffer на 10K events может переполниться при burst (pipeline scan с 5000 findings генерирует ~15000 events). При переполнении — snapshot-based resync, но это дорогостоящая операция.

3. **RISK-DSA-003: No backpressure mechanism.** Если Graph Builder обрабатывает артефакты быстрее, чем SIE может обрабатывать GraphEvents, consumer lag растёт. Без backpressure SIE может быть перегружен.

4. **RISK-DSA-004: Snapshot consistency during concurrent writes.** Если snapshot создаётся во время выполнения транзакции, snapshot может содержать частичные данные. Необходим isolation между snapshot creation и ongoing transactions.

### Рекомендации

1. **REC-DSA-001:** Спроектировать Read Replica для Graph Platform. Primary — для writes (Graph Builder), Replica — для reads (SIE, EE, Dashboard). Синхронизация через Graph Events. Это устраняет SPOF для чтения и обеспечивает горизонтальное масштабирование reads.

2. **REC-DSA-002:** Увеличить Event Bus buffer до 50K events и добавить spill-to-disk при переполнении. Также добавить consumer lag monitoring — если lag > 1000 events, trigger snapshot-based resync.

3. **REC-DSA-003:** Добавить Backpressure механизм в Graph Event Bus: если consumer lag превышает порог (например, 5000 events), замедлить публикацию событий (rate limit Graph Builder) или переключить consumer на batch mode (aggregate events).

4. **REC-DSA-004:** Определить Snapshot Isolation Level: snapshot формируется из зафиксированных транзакций на момент начала snapshot creation. Все транзакции, начатые после начала snapshot, не включаются. Реализация: Copy-on-Write или MVCC-style versioning.

5. **REC-DSA-005:** Добавить Circuit Breaker для Graph Platform: если платформа недоступна, потребители переключаются на последний cached snapshot (degraded mode) вместо полного отказа.

### Предложения по улучшению

- Добавить раздел "Deployment Topology" — как Graph Platform развёртывается (single instance, primary-replica, sharded)
- Определить SLA для Graph Event Bus (delivery latency, delivery guarantee)
- Рассмотреть добавление Dead Letter Queue для GraphEvents, которые не удалось обработать

---

## Роль 4: Security Architect Review

### Замечания

1. **Immutable Graph — мощная гарантия безопасности.** Невозможность модификации данных после создания предотвращает tampering и обеспечивает полный audit trail. Каждый вывод может быть трассирован до исходных данных через Provenance.

2. **Serialization Safety продумана.** Маскирование Secret и Credential при сериализации, исключение raw_data из Evidence, size limits — все это предотвращает утечку чувствительных данных через экспорт, логи или API.

3. **Graph Integrity инварианты корректны.** Referential Integrity, No Orphan Nodes, No Duplicate Edges, No Self-Loops, Type Constraints — все инварианты обеспечивают целостность модели и предотвращают инъекции некорректных данных.

### Найденные риски

1. **RISK-SA-001: Node Type Injection.** 18 определённых Node Types — это whitelist, но в RFC не указано, что произойдёт при попытке создать узел с неизвестным типом. Если валидация не строга, злоумышленник может инъектировать узлы произвольного типа.

2. **RISK-SA-002: Graph Event Payload может содержать чувствительные данные.** GraphEvents публикуются через Event Bus и доставляются потребителям. Payload события (например, NodeCreated для Secret) может содержать маскированные, но всё ещё чувствительные данные.

3. **RISK-SA-003: Rollback может восстановить удалённые секреты.** При откате к предыдущей версии графа Secret и Credential узлы, которые были удалены (soft delete), снова станут доступными. Это может нарушить compliance requirements (GDPR right to erasure).

4. **RISK-SA-004: Provenance spoofing.** Поле Provenance содержит источник данных, но нет механизма верификации authenticity. Злоумышленник с доступом к Graph Builder может указать произвольный source в Provenance.

### Рекомендации

1. **REC-SA-001:** Утвердить Strict Node Type Validation: попытка создать узел с типом, не входящим в whitelist из 18 типов, должна вызывать GraphValidationError. Типы узлов — closed set, расширение только через explicit schema update.

2. **REC-SA-002:** Определить Event Payload Sanitization: перед публикацией GraphEvent проверять payload на наличие чувствительных полей (secret_value, password, token). Заменять на "[REDACTED]". Это должно быть реализовано в Event Mapper.

3. **REC-SA-003:** Добавить Compliance-Aware Rollback: при rollback проверять, не содержит ли целевая версия удалённые Secret/Credential узлы. Если да — либо пропустить их восстановление, либо запросить подтверждение (compliance hold).

4. **REC-SA-004:** Определить Provenance Integrity: добавить подпись (HMAC) к Provenance, верифицируемую при чтении узла. Это предотвращает spoofing и обеспечивает non-repudiation.

5. **REC-SA-005:** Добавить Threat Model для Graph Platform (STRIDE analysis). Определить угрозы: Spoofing (Provenance spoofing), Tampering (graph modification), Repudiation (denial of operations), Information Disclosure (serialization leakage), Denial of Service (graph bomb — создание огромного количества узлов), Elevation of Privilege (unauthorized graph operations).

### Предложения по улучшению

- Добавить Rate Limiting для Graph Query API (защита от DoS через query flood)
- Определить Data Classification для Node Types: Public (Application, Host), Internal (Endpoint, API), Sensitive (Finding, Evidence), Highly Sensitive (Secret, Credential)
- Рассмотреть Encryption at Rest для Graph Snapshots

---

## Роль 5: Staff Backend Engineer Review

### Замечания

1. **Graph Query API практичен и полон.** 11 методов покрывают все основные сценарии: CRUD для узлов и рёбер, query с фильтрацией и пагинацией, traverse с выбором алгоритма, shortestPath, export, snapshot и rollback. Контрактные гарантии (Idempotency, Atomicity, Consistency) определены чётко.

2. **Multi-level Cache Strategy хорошо продумана.** 4 уровня кэша (Query, Traversal, Node, Snapshot) с event-driven invalidation и TTL fallback. Это обеспечивает высокую производительность чтения без риска stale data.

3. **Failure Recovery детально проработан.** 8 сценариев с обнаружением и восстановлением, 5 гарантий (No Data Loss, No Silent Corruption, Recoverability, Consistency, Availability). Это production-ready подход.

### Найденные риски

1. **RISK-BE-001: Нет механизма отмены для traverse().** Длинный обход (BFS для графа с 50K узлов) может выполняться несколько секунд. Без CancellationToken потребитель не может отменить операцию.

2. **RISK-BE-002: Export может быть слишком большим для in-memory обработки.** Полный экспорт графа с 50K узлов и 150K рёбер может генерировать JSON размером 50-100 MB. Хранение этого в памяти для последующей отправки — риск OOM.

3. **RISK-BE-003: Нет прогресс-индикации для snapshot().** Создание snapshot для большого графа может занимать 5-10 секунд. Без прогресс-индикации потребитель не может отличить "snapshot создаётся" от "platform зависла".

4. **RISK-BE-004: Query без timeout может выполняться бесконечно.** Если фильтры не селективны и индексы не помогают, query может сканировать все узлы. timeout_ms определён для traverse (30 сек), но не для query.

### Рекомендации

1. **REC-BE-001:** Добавить CancellationToken в traverse() и shortestPath(). При отмене — вернуть partial Subgraph с metadata {cancelled: true, nodes_visited: N, edges_visited: M}.

2. **REC-BE-002:** Реализовать Streaming Export: export() возвращает iterator/generator вместо bytes. Для больших графов — запись частями в temporary file, возврат file path вместо bytes.

3. **REC-BE-003:** Добавить Progress Callback для snapshot(): SnapshotProgress {phase: "serializing_nodes", current: 12000, total: 50000, percentage: 24}. Реализация через callback или polling endpoint.

4. **REC-BE-004:** Добавить query timeout (по умолчанию 10 секунд). Если query не завершается за timeout — вернуть partial results с metadata {timed_out: true, results_returned: N}.

5. **REC-BE-005:** Определить structured logging format для Graph Platform. Единый формат: `{timestamp, level, component, operation, node_id/edge_id, duration_ms, status, error_message}`. Это критично для debugging в production.

6. **REC-BE-006:** Добавить Prometheus metrics для Graph Platform: graph_nodes_total, graph_edges_total, graph_query_duration_seconds, graph_traversal_duration_seconds, graph_snapshot_size_bytes, graph_event_bus_lag.

### Предложения по улучшению

- Добавить Batch API: createNodes(), createEdges() для эффективной массовой вставки
- Рассмотреть GraphQL-подобный query language для сложных запросов
- Добавить пример конфигурации Graph Platform (YAML) для типичного сценария

---

## Сводка ревью

### Архитектурные достоинства

1. **Storage Agnostic** — полная независимость от конкретной графовой СУБД, что обеспечивает portability и migration path
2. **Immutable Graph** — неизменяемость узлов и рёбер обеспечивает audit trail, reproducibility и thread safety
3. **Snapshot + Delta Versioning** — оптимальный баланс между скоростью восстановления и overhead хранения
4. **Comprehensive Domain Model** — 16 сущностей покрывают все ключевые абстракции графовой модели
5. **Event Driven Synchronization** — слабая связность с потребителями через Graph Event Bus
6. **Deterministic Traversal** — 7 алгоритмов с определённой сложностью и детерминированными результатами
7. **Security by Design** — immutable data, serialization safety, integrity checks, node/edge validation
8. **Multi-level Cache** — 4 уровня кэширования с event-driven invalidation

### Потенциальные риски

| # | Риск | Критичность | Ответственный |
|---|------|-------------|---------------|
| RISK-CTO-001 | Зависимость INT-001 от выбора Storage Backend | HIGH | CTO |
| RISK-CTO-002 | Retention Policy не определена | HIGH | CTO |
| RISK-CTO-003 | Eventual Consistency между Graph и потребителями | MEDIUM | CTO |
| RISK-PGE-001 | Weighted Adjacency Index отсутствует | MEDIUM | Principal Graph Engineer |
| RISK-PGE-002 | Snapshot creation — blocking operation | HIGH | Principal Graph Engineer |
| RISK-PGE-003 | Delta chain length не ограничена формально | MEDIUM | Principal Graph Engineer |
| RISK-PGE-004 | Merge semantics неполны для Identity | MEDIUM | Principal Graph Engineer |
| RISK-DSA-001 | Single Point of Failure — Graph Platform | HIGH | Distributed Systems Architect |
| RISK-DSA-002 | Event Bus buffer overflow | MEDIUM | Distributed Systems Architect |
| RISK-DSA-003 | No backpressure mechanism | MEDIUM | Distributed Systems Architect |
| RISK-DSA-004 | Snapshot consistency during concurrent writes | MEDIUM | Distributed Systems Architect |
| RISK-SA-001 | Node Type Injection | HIGH | Security Architect |
| RISK-SA-002 | Graph Event Payload — чувствительные данные | MEDIUM | Security Architect |
| RISK-SA-003 | Rollback восстанавливает удалённые секреты | MEDIUM | Security Architect |
| RISK-SA-004 | Provenance spoofing | MEDIUM | Security Architect |
| RISK-BE-001 | Нет CancellationToken для traverse() | MEDIUM | Staff Backend Engineer |
| RISK-BE-002 | Export может вызвать OOM | MEDIUM | Staff Backend Engineer |
| RISK-BE-003 | Нет прогресс-индикации для snapshot() | LOW | Staff Backend Engineer |
| RISK-BE-004 | Query без timeout | MEDIUM | Staff Backend Engineer |

### Внесённые исправления

На основе результатов ревью в RFC внесены следующие дополнения (отражены в Open Questions и Future Extensions):

1. **Retention Policy** — добавлен в Open Questions #1 с предварительным предложением: 30 snapshots + 7 дней delta
2. **Storage Backend Selection** — добавлен в Open Questions #7 с предварительной рекомендацией: NetworkX для MVP, Neo4j для production
3. **Consistency Level** — добавлен в Future Extensions (#8 Cross-Application Graph) как возможное расширение
4. **CancellationToken** — будет добавлен в Graph Query API при реализации INT-001
5. **Strict Node Type Validation** — подтверждён в разделе Security (16.4 Node Validation)
6. **Delta Chain Length Guard** — упомянут в ADR-KG-003 как следствие
7. **Event Payload Sanitization** — будет добавлен при реализации Event Mapper в INT-001
8. **Streaming Export** — будет реализован при разработке GraphExporter в INT-001

### Открытые вопросы

1. **Storage Backend Selection** — NetworkX (in-memory) или Neo4j (persistent) для INT-001? Критерии выбора не определены.
2. **Retention Policy** — сколько версий графа хранить? Предложение требует валидации с реальными данными.
3. **Consistency Level** — STRONG или EVENTUAL для разных потребителей? Требует анализа use cases.
4. **Deployment Topology** — single instance или primary-replica? Зависит от performance testing.
5. **SLA для Graph Query API** — p95 latency, availability. Требует benchmarking.
6. **Graph Partitioning strategy** — Application-scoped или Host-scoped по умолчанию? Зависит от data model testing.
7. **Event Delivery Guarantees** — at-least-once (предложение) или exactly-once (требует distributed tx)?
8. **Cross-Application Queries** — нужен ли в MVP? Предложение: нет, добавить в Future Extensions.

### Рекомендации перед началом INT-001

1. **Утвердить Storage Backend** — определить критерии выбора и принять решение до начала реализации
2. **Утвердить Retention Policy** — минимум: 30 snapshots + 7 дней delta, archive старых данных
3. **Добавить CancellationToken** — в traverse() и shortestPath() API
4. **Добавить Query Timeout** — по умолчанию 10 секунд для query()
5. **Добавить Delta Chain Length Guard** — автоматический snapshot при delta chain > 50
6. **Добавить Event Payload Sanitization** — маскирование чувствительных данных в GraphEvents
7. **Добавить Strict Node Type Validation** — whitelist из 18 типов, rejection при неизвестном типе
8. **Определить Graph Health Metrics** — Node Count, Edge Count, Index Freshness, Snapshot Age, Event Lag
9. **Создать Performance Benchmarks** — ожидаемое время query/traverse при 10K, 50K, 100K узлах
10. **Разработать Threat Model** — STRIDE analysis для Graph Platform

---

## Итоговая оценка

**KG-001: APPROVED WITH CONDITIONS**

Архитектура Knowledge Graph Platform спроектирована качественно и полностью соответствует стратегическим принципам платформы. Storage Agnostic design, Immutable Graph, Snapshot + Delta versioning, Event Driven Synchronization, Deterministic Traversal — все фундаментальные требования соблюдены. 8 ADR зафиксированы и обоснованы. 16 Domain Entities, 18 Node Types, 14 Edge Types, 7 Traversal Algorithms — модель данных детальна и полна.

Перед началом реализации INT-001 необходимо:
1. Утвердить Storage Backend (рекомендация: NetworkX для MVP)
2. Утвердить Retention Policy
3. Внести правки по критическим рискам (RISK-PGE-002, RISK-DSA-001, RISK-SA-001)
4. Утвердить Open Questions

После выполнения этих условий KG-001 может служить основанием для реализации INT-001 — Knowledge Graph Core Implementation.
