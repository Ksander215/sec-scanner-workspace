#!/usr/bin/env python3
"""
Generate KG-001 Knowledge Graph Architecture RFC document.
"""

RFC_CONTENT = r'''# KG-001: Knowledge Graph Architecture

**Статус:** Draft  
**Дата:** 2026-07-15  
**Автор:** Chief Software Architect / Principal Graph Database Engineer / Knowledge Graph Architect  
**Рецензенты:** CTO, Principal Graph Engineer, Distributed Systems Architect, Security Architect, Staff Backend Engineer  
**Связанные документы:** [RFC-001](./RFC-001_SECURITY_INTELLIGENCE_ENGINE.md) | [CTO_DECISIONS.md](../00_governance/CTO_DECISIONS.md) | [AI_CONTEXT.md](../00_governance/AI_CONTEXT.md) | [ENGINEERING_MEMORY.md](../00_governance/ENGINEERING_MEMORY.md) | [VISION.md](../00_governance/VISION.md) | [PROJECT_HANDOFF.md](../00_governance/PROJECT_HANDOFF.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals](#3-goals)
4. [Non Goals](#4-non-goals)
5. [Existing Architecture](#5-existing-architecture)
6. [Proposed Graph Architecture](#6-proposed-graph-architecture)
7. [Graph Domain Model](#7-graph-domain-model)
8. [Node Types](#8-node-types)
9. [Edge Types](#9-edge-types)
10. [Graph Storage Model](#10-graph-storage-model)
11. [Traversal Engine](#11-traversal-engine)
12. [Versioning](#12-versioning)
13. [Graph Query API](#13-graph-query-api)
14. [Synchronization](#14-synchronization)
15. [Performance Strategy](#15-performance-strategy)
16. [Security](#16-security)
17. [Failure Recovery](#17-failure-recovery)
18. [Future Extensions](#18-future-extensions)
19. [Architecture Decision Records](#19-architecture-decision-records)
20. [Open Questions](#20-open-questions)

---

## 1. Executive Summary

Knowledge Graph (KG) — независимая подсистема платформы, выступающая единым источником знаний о безопасности приложения. В отличие от традиционных хранилищ находок, KG хранит не отдельные результаты сканирования, а **отношения между объектами безопасности** — от эндпоинтов и хостов до уязвимостей, цепочек атак и рекомендаций. Это фундаментальное различие превращает KG из простого хранилища данных в активную модель знаний, на которой строятся все аналитические возможности платформы.

RFC-001 (Security Intelligence Engine) утвердил, что SIE будет использовать Knowledge Graph как центральную модель данных. Однако архитектура самого графа до сих пор не определена — существует лишь концептуальное описание 12 Node Types и 9 Edge Types в рамках SIE-спецификации. Данный RFC закрывает этот пробел, определяя полноценную архитектуру Graph Platform: от внутренней модели хранения и обхода до версионирования, синхронизации и API.

Архитектура KG строится на восьми фундаментальных принципах: Immutable Data Model (неизменяемость узлов и рёбер), Event Driven Updates (обновления только через события), Incremental Synchronization (инкрементальное обновление без полного перестроения), Versioned Snapshots (снимки состояния графа), Graph-first Architecture (все данные моделируются как граф), Engine Agnostic (независимость от конкретной графовой СУБД), Explainability Ready (готовность к объяснению любого вывода) и Horizontal Scalability (горизонтальное масштабирование). Эти принципы гарантируют, что KG станет надёжным фундаментом для Security Intelligence Engine, Risk Engine, Attack Path Builder, Recommendation Engine и будущих AI-модулей.

---

## 2. Problem Statement

Текущая платформа успешно собирает данные из множества источников (Discovery Engine, Browser Intelligence, HTTP Intelligence, Nuclei), но данные остаются разрозненными. Каждая находка существует как изолированный артефакт, без связи с другими объектами безопасности. RFC-001 определил, как SIE будет анализировать данные графа, но сам граф ещё не спроектирован. Это создаёт ряд критических проблем.

**Отсутствие модели хранения.** Нет определения, как именно узлы и рёбра хранятся, индексируются и извлекаются. Без чёткой модели хранения невозможно оценить производительность и масштабируемость решения при росте объёма данных. При сканировании среднего приложения генерируется от 500 до 5000 находок, каждая из которых связана с 3-10 объектами — это значит, что граф типичного приложения содержит от 2000 до 50000 узлов и от 5000 до 150000 рёбер.

**Отсутствие механизма обхода.** SIE требует обхода графа для построения Attack Paths, расчёта Reachability и выполнения корреляций. Без специализированного Traversal Engine каждый потребитель будет реализовывать обход самостоятельно, что приведёт к дублированию кода, несогласованным результатам и проблемам с производительностью. Алгоритм BFS для графа с 50000 узлов и 150000 рёбрами может выполняться от нескольких миллисекунд до нескольких секунд в зависимости от реализации — разница в 1000 раз.

**Отсутствие версионирования.** Граф обновляется при каждом сканировании. Без механизма версионирования невозможно отследить, как изменилась поверхность атаки, воспроизвести результаты предыдущего анализа или откатиться к предыдущему состоянию при ошибке. Инкрементальное обновление без версионирования — это односторонний процесс без точки возврата.

**Отсутствие синхронизации.** Несколько потребителей (SIE, Explainability Engine, Dashboard) нуждаются в актуальных данных графа. Без чёткой модели синхронизации каждый потребитель будет опрашивать граф самостоятельно, создавая избыточную нагрузку и рассинхронизацию данных. Событийная модель, уже принятая платформой (Artifact Bus), должна быть расширена на Graph Events.

**Зависимость от конкретной СУБД.** Без Storage Agnostic Architecture выбор конкретной графовой базы данных (Neo4j, ArangoDB, NetworkX) станет архитектурным решением, которое невозможно изменить без переписывания всего аналитического слоя. Это противоречит CTO Decision #4 (Plugin Architecture) и Engine Agnostic принципу.

---

## 3. Goals

1. **Единый источник знаний** — KG становится SSOT (Single Source of Truth) для всех данных о безопасности: Finding, Asset, Evidence, Relationship, Attack Path и Recommendation не существуют вне графа
2. **Immutable Graph Model** — узлы и рёбра неизменяемы после создания; обновление создаёт новую версию, а не модифицирует существующую
3. **Engine Agnostic Storage** — архитектура не зависит от конкретной графовой СУБД; замена бэкенда (NetworkX -> Neo4j -> ArangoDB) не требует изменений в SIE, API или потребителях
4. **Versioned Snapshots** — каждое значимое изменение графа фиксируется как Snapshot; поддерживается Delta, Rollback, Replay и Incremental Update
5. **Deterministic Traversal** — обход графа (BFS, DFS, Shortest Path) всегда даёт детерминированный результат для одного и того же графа и одинаковых параметров
6. **Event Driven Synchronization** — обновления графа публикуются как события через Graph Event Bus; потребители подписываются на нужные типы событий
7. **Explainability Ready** — каждый узел, ребро и путь содержит Provenance; любой вывод может быть трассирован до исходных данных
8. **Zero Coupling** — KG не зависит от существующих модулей (TASK-201, TASK-202, Pipeline Executor, SIE); изменения в KG не требуют модификации других подсистем
9. **Performance by Design** — архитектура закладывает кэширование, индексирование, lazy loading и graph partitioning для обеспечения производительности при масштабировании

---

## 4. Non Goals

1. **Не реализация** — данный RFC определяет архитектуру, а не код; реализация будет выполнена в INT-001
2. **Не визуализация** — рендеринг и визуализация графа (Dashboard) не входят в зону ответственности KG Platform
3. **Не аналитика** — KG хранит данные и обеспечивает обход, но не выполняет корреляцию, оценку рисков или построение Attack Paths (это ответственность SIE)
4. **Не выбор конкретной СУБД** — архитектура остаётся storage-agnostic; конкретный бэкенд будет выбран при реализации INT-001
5. **Не modification существующих модулей** — TASK-201, TASK-202, Pipeline Executor, Scan Platform Foundation, RFC-001, Explainability Engine остаются неизменными
6. **Не real-time streaming** — KG работает в batch/incremental режиме; streaming-обновления поддерживаются через Event Bus, но не как primary pattern
7. **Не распределённая согласованность** — на данном этапе не рассматривается multi-datacenter репликация; горизонтальное масштабирование закладывается через partitioning, а не через distributed consensus

---

## 5. Existing Architecture

```mermaid
graph TD
    subgraph "Scan Platform (TASK-201/202)"
        DE[Discovery Engine]
        BI[Browser Intelligence]
        HI[HTTP Intelligence]
        NE[Nuclei Adapter]
        AB[Artifact Bus]
        PE[Pipeline Executor]
    end

    subgraph "Knowledge Layer (Current)"
        SKG[Security Knowledge Graph<br/>CONCEPTUAL ONLY]
        GQA[Graph Query API<br/>NOT DEFINED]
    end

    subgraph "Intelligence Layer (RFC-001)"
        SIE[Security Intelligence Engine]
        RISK[Risk Engine]
        APB[Attack Path Builder]
        REC[Recommendation Engine]
    end

    DE -->|artifacts| AB
    BI -->|artifacts| AB
    HI -->|artifacts| AB
    NE -->|findings| AB
    AB -->|build| SKG
    SKG --> GQA
    GQA -->|query| SIE
    SIE --> RISK
    SIE --> APB
    SIE --> REC

    style DE fill:#111827,stroke:#34d399,color:#e2e8f0
    style BI fill:#111827,stroke:#34d399,color:#e2e8f0
    style HI fill:#111827,stroke:#34d399,color:#e2e8f0
    style NE fill:#111827,stroke:#34d399,color:#e2e8f0
    style AB fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style PE fill:#111827,stroke:#34d399,color:#e2e8f0
    style SKG fill:#111827,stroke:#f87171,color:#e2e8f0
    style GQA fill:#111827,stroke:#f87171,color:#e2e8f0
    style SIE fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style RISK fill:#111827,stroke:#f87171,color:#e2e8f0
    style APB fill:#111827,stroke:#f87171,color:#e2e8f0
    style REC fill:#111827,stroke:#34d399,color:#e2e8f0
```

Существующая архитектура определяет Security Knowledge Graph как концептуальный слой между Scan Platform и Intelligence Layer, но конкретная реализация отсутствует. RFC-001 определил 12 Node Types и 9 Edge Types в контексте SIE, но не определил: модель хранения, механизм обхода, версионирование, синхронизацию, API и стратегию масштабирования.

**Ключевые ограничения текущего состояния:**

- KG описан только концептуально — нет реализации и нет детальной архитектуры
- Graph Query API упоминается в RFC-001, но его контракт не определён
- Нет модели хранения — неизвестно, как узлы и рёбра сериализуются и индексируются
- Нет механизма версионирования — каждое сканирование перезаписывает данные без истории
- Нет синхронизации — потребители (SIE, EE, Dashboard) не получают уведомлений об изменениях графа
- Нет гарантий производительности — нет стратегии кэширования, индексирования и partitioning

---

## 6. Proposed Graph Architecture

```mermaid
graph TD
    subgraph "Consumers"
        SIE[Security Intelligence Engine]
        EE[Explainability Engine]
        DASH[Dashboard]
        CS[Continuous Security]
        FUTURE[Future AI Modules]
    end

    subgraph "Graph Platform"
        API[Graph Query API]
        TE[Traversal Engine]
        VM[Version Manager]
        SM[Sync Manager]
        GEB[Graph Event Bus]
        EM[Event Mapper]
    end

    subgraph "Storage Layer"
        NS[Node Store]
        ES[Edge Store]
        IDX[Index Manager]
        CACHE[Cache Layer]
        SNAP[Snapshot Store]
        DELTA[Delta Store]
    end

    subgraph "Ingestion"
        AB[Artifact Bus]
        NF[Normalizer Filter]
        BUILDER[Graph Builder]
    end

    AB -->|artifacts| NF
    NF -->|normalized| BUILDER
    BUILDER -->|create/update| NS
    BUILDER -->|create/update| ES
    BUILDER -->|index| IDX
    BUILDER -->|notify| GEB
    BUILDER -->|snapshot| VM
    VM --> SNAP
    VM --> DELTA

    API -->|read| NS
    API -->|read| ES
    API -->|query| IDX
    API -->|traverse| TE
    API -->|version| VM
    API -->|cache| CACHE

    TE -->|read| NS
    TE -->|read| ES
    TE -->|lookup| IDX
    TE -->|cache| CACHE

    GEB -->|events| EM
    EM -->|sync| SM
    SM -->|push| SIE
    SM -->|push| EE
    SM -->|push| DASH
    SM -->|push| CS
    SM -->|push| FUTURE

    SIE -->|query| API
    EE -->|query| API
    DASH -->|query| API
    CS -->|query| API
    FUTURE -->|query| API

    style SIE fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style EE fill:#111827,stroke:#06b6d4,color:#e2e8f0
    style DASH fill:#111827,stroke:#34d399,color:#e2e8f0
    style CS fill:#111827,stroke:#34d399,color:#e2e8f0
    style FUTURE fill:#111827,stroke:#a78bfa,color:#e2e8f0
    style API fill:#1a2332,stroke:#fbbf24,color:#e2e8f0
    style TE fill:#1a2332,stroke:#38bdf8,color:#e2e8f0
    style VM fill:#1a2332,stroke:#f87171,color:#e2e8f0
    style SM fill:#1a2332,stroke:#34d399,color:#e2e8f0
    style GEB fill:#1a2332,stroke:#fbbf24,color:#e2e8f0
    style EM fill:#1a2332,stroke:#34d399,color:#e2e8f0
    style NS fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style ES fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style IDX fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style CACHE fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style SNAP fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style DELTA fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style AB fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style NF fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style BUILDER fill:#111827,stroke:#38bdf8,color:#e2e8f0
```

Архитектура Knowledge Graph Platform состоит из трёх основных слоёв: Ingestion, Graph Platform и Storage. Каждый слой имеет чёткую ответственность и взаимодействует с соседними через определённые контракты.

**Ingestion Layer** отвечает за приём данных из Artifact Bus, нормализацию артефактов и построение узлов/рёбер графа. Normalizer Filter преобразует артефакты разных форматов (Nuclei JSON, Browser Intel, HTTP Intel) в единый внутренний формат GraphBuilder. Graph Builder создаёт и обновляет узлы и рёбра, обновляет индексы и публикует Graph Events.

**Graph Platform Layer** предоставляет все операции над графом: запросы (Graph Query API), обход (Traversal Engine), версионирование (Version Manager), синхронизацию (Sync Manager) и события (Graph Event Bus). Это единственный слой, доступный потребителям.

**Storage Layer** обеспечивает физическое хранение узлов, рёбер, индексов, кэша, снимков и дельт. Storage Layer абстрагирован через интерфейсы, что позволяет заменять конкретную реализацию (NetworkX, Neo4j, ArangoDB) без изменения верхних слоёв.

---

## 7. Graph Domain Model

### 7.1 Обзор сущностей

```mermaid
classDiagram
    class GraphNode {
        +node_id: NodeIdentity
        +node_type: str
        +metadata: NodeMetadata
        +version: int
        +created_at: datetime
        +provenance: Provenance
    }

    class GraphEdge {
        +edge_id: str
        +source_id: NodeIdentity
        +target_id: NodeIdentity
        +relationship: Relationship
        +weight: float
        +version: int
        +created_at: datetime
        +provenance: Provenance
    }

    class NodeIdentity {
        +identity_type: str
        +value: str
        +namespace: str
        +hash: str
        +equals(other): bool
        +merge(other): NodeIdentity
    }

    class NodeMetadata {
        +properties: Dict
        +tags: Set
        +confidence: float
        +source: str
        +updated_at: datetime
        +merge(other): NodeMetadata
    }

    class Relationship {
        +relationship_type: RelationshipType
        +direction: Direction
        +semantics: str
        +constraints: Constraints
    }

    class RelationshipType {
        <<enumeration>>
        USES
        OWNS
        CALLS
        DEPENDS_ON
        HOSTS
        CONNECTED_TO
        LEADS_TO
        DISCOVERED_BY
        EXPOSES
        AUTHENTICATES
        TRUSTS
        CONTAINS
        RELATED_TO
        MITIGATED_BY
    }

    class Traversal {
        +traversal_id: str
        +algorithm: TraversalAlgorithm
        +start_nodes: List
        +parameters: Dict
        +result: Subgraph
        +execution_time_ms: float
    }

    class Subgraph {
        +nodes: List~GraphNode~
        +edges: List~GraphEdge~
        +root_id: NodeIdentity
        +depth: int
        +node_count: int
        +edge_count: int
    }

    class GraphSnapshot {
        +snapshot_id: str
        +version: GraphVersion
        +timestamp: datetime
        +node_count: int
        +edge_count: int
        +checksum: str
        +delta_from: str
    }

    class GraphVersion {
        +version_id: str
        +parent_id: str
        +timestamp: datetime
        +operation: str
        +author: str
        +description: str
    }

    class GraphIndex {
        +index_id: str
        +index_type: IndexType
        +field: str
        +cardinality: int
        +last_updated: datetime
    }

    class Query {
        +query_id: str
        +pattern: QueryPattern
        +filters: List~Filter~
        +limit: int
        +offset: int
        +sort: List~Sort~
    }

    class GraphTransaction {
        +transaction_id: str
        +operations: List~Operation~
        +status: TransactionStatus
        +started_at: datetime
        +committed_at: datetime
    }

    class GraphEvent {
        +event_id: str
        +event_type: GraphEventType
        +payload: Dict
        +timestamp: datetime
        +source: str
        +version: int
    }

    GraphNode --> NodeIdentity
    GraphNode --> NodeMetadata
    GraphEdge --> NodeIdentity : source
    GraphEdge --> NodeIdentity : target
    GraphEdge --> Relationship
    Relationship --> RelationshipType
    Traversal --> Subgraph
    GraphSnapshot --> GraphVersion
    GraphTransaction --> GraphEvent
    Query --> GraphNode : returns
```

### 7.2 Детальное описание сущностей

#### 7.2.1 GraphNode

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Представляет любой объект безопасности в графе: приложение, хост, эндпоинт, уязвимость, доказательство и т.д. |
| **Поля** | `node_id: NodeIdentity` — уникальный идентификатор узла; `node_type: str` — тип узла (Application, Host, Endpoint и др.); `metadata: NodeMetadata` — метаданные узла; `version: int` — номер версии; `created_at: datetime` — время создания; `provenance: Provenance` — происхождение данных |
| **Жизненный цикл** | Created -> Active -> Deprecated -> Archived. Узел создаётся Graph Builder при получении артефакта. Deprecated при обнаружении более актуальной версии. Archived при удалении (soft delete). |
| **Ответственность** | Инкапсуляция данных об объекте безопасности. Предоставление доступа к метаданным и идентичности. Поддержка версионирования. |
| **Связи** | Содержит NodeIdentity и NodeMetadata. Является source/target для GraphEdge. Входит в Subgraph. Версионируется через GraphVersion. |

#### 7.2.2 GraphEdge

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Представляет направленную связь между двумя узлами графа с семантикой, весом и ограничениями |
| **Поля** | `edge_id: str` — уникальный идентификатор ребра; `source_id: NodeIdentity` — исходный узел; `target_id: NodeIdentity` — целевой узел; `relationship: Relationship` — тип и семантика связи; `weight: float` — вес связи [0.0, 1.0]; `version: int` — номер версии; `created_at: datetime` — время создания; `provenance: Provenance` — происхождение |
| **Жизненный цикл** | Created -> Active -> Superseded -> Archived. Ребро создаётся при обнаружении связи. Superseded при обнаружении более точной связи. Archived при soft delete. |
| **Ответственность** | Определение направленной связи между узлами. Предоставление семантики и веса связи. Обеспечение ограничений целостности. |
| **Связи** | Связывает два GraphNode (source, target). Содержит Relationship. Входит в Subgraph. Индексируется через GraphIndex. |

#### 7.2.3 NodeIdentity

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Уникальная идентичность узла, поддерживающая слияние (merge) при разрешении конфликтов. Identity определяет, являются ли два узла одним и тем же объектом. |
| **Поля** | `identity_type: str` — тип идентичности (url, hostname, cve, cwe, ip); `value: str` — значение идентичности; `namespace: str` — пространство имён (application scope); `hash: str` — детерминированный хеш для быстрого сравнения |
| **Жизненный цикл** | Created -> Resolved -> Merged. Created при первом появлении. Resolved при успешной привязке к узлу. Merged при слиянии с другой идентичностью. |
| **Ответственность** | Уникальная идентификация узла. Поддержка слияния идентичностей. Детерминированное сравнение. |
| **Связи** | Принадлежит GraphNode. Используется в GraphEdge для source/target. Используется в Query для фильтрации. |

#### 7.2.4 NodeMetadata

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Метаданные узла: свойства, теги, confidence и источник. Поддерживает инкрементальное обогащение через merge. |
| **Поля** | `properties: Dict` — словарь свойств узла (зависит от node_type); `tags: Set` — множество тегов; `confidence: float` — достоверность данных [0.0, 1.0]; `source: str` — источник данных (nuclei, browser_intel, http_intel, discovery); `updated_at: datetime` — время последнего обновления |
| **Жизненный цикл** | Created -> Enriched -> Frozen. Created при первом заполнении. Enriched при получении дополнительных данных от других источников. Frozen при версионировании (immutable). |
| **Ответственность** | Хранение свойств узла. Поддержка обогащения. Предоставление confidence и provenance. |
| **Связи** | Принадлежит GraphNode. Используется в Traversal для фильтрации. Влияет на Edge weight. |

#### 7.2.5 Relationship

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Определяет семантику связи между узлами: тип, направление, ограничения. Relationship — value object, не сущность. |
| **Поля** | `relationship_type: RelationshipType` — тип связи из перечисления; `direction: Direction` — направление (OUTGOING, INCOMING, BIDIRECTIONAL); `semantics: str` — текстовое описание семантики; `constraints: Constraints` — ограничения на допустимые source/target node types |
| **Жизненный цикл** | Value object — не имеет собственного жизненного цикла. Создаётся вместе с GraphEdge. |
| **Ответственность** | Определение семантики связи. Обеспечение типобезопасности (ограничения на node types). |
| **Связи** | Принадлежит GraphEdge. Ссылается на RelationshipType. |

#### 7.2.6 RelationshipType

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Перечисление всех допустимых типов связей в графе. Открытое перечисление — новые типы добавляются без изменения существующих. |
| **Значения** | USES, OWNS, CALLS, DEPENDS_ON, HOSTS, CONNECTED_TO, LEADS_TO, DISCOVERED_BY, EXPOSES, AUTHENTICATES, TRUSTS, CONTAINS, RELATED_TO, MITIGATED_BY |
| **Ответственность** | Контроль допустимых типов связей. Предотвращение опечаток и некорректных типов. |

#### 7.2.7 Traversal

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Описание операции обхода графа: алгоритм, стартовые узлы, параметры, результат. Traversal — это команда, которая выполняется Traversal Engine. |
| **Поля** | `traversal_id: str` — уникальный идентификатор обхода; `algorithm: TraversalAlgorithm` — выбранный алгоритм; `start_nodes: List[NodeIdentity]` — стартовые узлы; `parameters: Dict` — параметры алгоритма (max_depth, weight_threshold и др.); `result: Subgraph` — результирующий подграф; `execution_time_ms: float` — время выполнения |
| **Жизненный цикл** | Created -> Executing -> Completed / Failed / Cancelled. Created при инициации обхода. Executing во время выполнения. Completed при успешном завершении. |
| **Ответственность** | Инкапсуляция параметров обхода. Хранение результата. Учёт времени выполнения. |
| **Связи** | Выполняется Traversal Engine. Возвращает Subgraph. Использует GraphIndex для оптимизации. |

#### 7.2.8 Subgraph

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Подграф — подмножество узлов и рёбер полного графа. Результат Traversal, Query или Snapshot. |
| **Поля** | `nodes: List[GraphNode]` — узлы подграфа; `edges: List[GraphEdge]` — рёбра подграфа; `root_id: NodeIdentity` — корневой узел; `depth: int` — глубина обхода; `node_count: int` — количество узлов; `edge_count: int` — количество рёбер |
| **Жизненный цикл** | Value object — не имеет собственного жизненного цикла. Создаётся как результат операции. |
| **Ответственность** | Инкапсуляция подмножества графа. Предоставление статистики. |
| **Связи** | Содержит GraphNode и GraphEdge. Возвращается Traversal, Query, Snapshot. |

#### 7.2.9 GraphSnapshot

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Неизменяемый снимок состояния графа на определённый момент времени. Используется для воспроизведения анализа, отката и аудита. |
| **Поля** | `snapshot_id: str` — уникальный идентификатор снимка; `version: GraphVersion` — версия графа; `timestamp: datetime` — время создания снимка; `node_count: int` — количество узлов; `edge_count: int` — количество рёбер; `checksum: str` — контрольная сумма для целостности; `delta_from: str` — ID предыдущего снимка (для delta snapshots) |
| **Жизненный цикл** | Created -> Verified -> Archived. Created при создании снимка. Verified после проверки checksum. Archived при очистке старых снимков. |
| **Ответственность** | Фиксация состояния графа. Обеспечение воспроизводимости. Поддержка delta snapshots. |
| **Связи** | Ссылается на GraphVersion. Связан с Delta Store. |

#### 7.2.10 GraphVersion

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Метаданные версии графа: автор, операция, описание. Поддерживает линейную историю версий. |
| **Поля** | `version_id: str` — уникальный идентификатор версии; `parent_id: str` — ID родительской версии; `timestamp: datetime` — время создания; `operation: str` — тип операции (create_node, update_node, create_edge и др.); `author: str` — инициатор (system, pipeline, manual); `description: str` — описание изменения |
| **Жизненный цикл** | Created -> Active -> Superseded. Created при фиксации версии. Active при использовании. Superseded при появлении новой версии. |
| **Ответственность** | Отслеживание истории изменений. Поддержка rollback. Обеспечение audit trail. |
| **Связи** | Используется в GraphSnapshot. Связан с Delta Store. |

#### 7.2.11 GraphIndex

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Индекс графа для ускорения запросов. Поддерживает несколько типов индексов: adjacency list, reverse index, property index, temporal index. |
| **Поля** | `index_id: str` — уникальный идентификатор индекса; `index_type: IndexType` — тип индекса (ADJACENCY, REVERSE, PROPERTY, TEMPORAL); `field: str` — индексируемое поле; `cardinality: int` — количество уникальных значений; `last_updated: datetime` — время последнего обновления |
| **Жизненный цикл** | Created -> Building -> Active -> Stale -> Rebuilding. Created при создании. Building при первоначальной индексации. Active при использовании. Stale при устаревании. Rebuilding при перестроении. |
| **Ответственность** | Ускорение запросов. Поддержка актуальности. Предоставление статистики. |
| **Связи** | Используется в Traversal Engine. Обновляется Graph Builder. |

#### 7.2.12 Query

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Описание поискового запроса к графу: паттерн, фильтры, сортировка, пагинация. Query — это спецификация, а не результат. |
| **Поля** | `query_id: str` — уникальный идентификатор запроса; `pattern: QueryPattern` — паттерн поиска (node_type, edge_type, property match); `filters: List[Filter]` — список фильтров; `limit: int` — ограничение количества результатов; `offset: int` — смещение для пагинации; `sort: List[Sort]` — правила сортировки |
| **Жизненный цикл** | Created -> Executing -> Completed / Failed. Created при создании запроса. Executing во время выполнения. Completed при получении результатов. |
| **Ответственность** | Инкапсуляция параметров поиска. Поддержка пагинации и сортировки. |
| **Связи** | Выполняется через Graph Query API. Возвращает List[GraphNode] или Subgraph. |

#### 7.2.13 GraphTransaction

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Транзакция над графом: набор операций (create/update/delete узлов и рёбер), выполняемых атомарно. |
| **Поля** | `transaction_id: str` — уникальный идентификатор транзакции; `operations: List[Operation]` — список операций; `status: TransactionStatus` — статус (PENDING, COMMITTED, ROLLED_BACK); `started_at: datetime` — время начала; `committed_at: datetime` — время фиксации |
| **Жизненный цикл** | Pending -> Committed / RolledBack. Pending при создании. Committed при успешной фиксации. RolledBack при ошибке или отмене. |
| **Ответственность** | Атомарность операций. Поддержка отката. Обеспечение целостности графа. |
| **Связи** | Генерирует GraphEvent при фиксации. Влияет на GraphVersion. |

#### 7.2.14 GraphEvent

| Атрибут | Описание |
|---------|----------|
| **Назначение** | Событие изменения графа. Публикуется через Graph Event Bus для уведомления потребителей. |
| **Поля** | `event_id: str` — уникальный идентификатор события; `event_type: GraphEventType` — тип события (NODE_CREATED, NODE_UPDATED, EDGE_CREATED, EDGE_REMOVED, SNAPSHOT_CREATED, GRAPH_VERSION_INCREMENTED); `payload: Dict` — данные события; `timestamp: datetime` — время события; `source: str` — источник (pipeline, manual, system); `version: int` — версия графа на момент события |
| **Жизненный цикл** | Created -> Published -> Delivered. Created при генерации. Published при отправке в Event Bus. Delivered при получении потребителем. |
| **Ответственность** | Уведомление потребителей об изменениях. Поддержка eventual consistency. Обеспечение audit trail. |
| **Связи** | Генерируется GraphTransaction. Публикуется через Graph Event Bus. Потребляется Sync Manager. |

---

## 8. Node Types

### 8.1 Node Relationship Diagram

```mermaid
graph TD
    APP[Application] -->|OWNS| HOST[Host]
    APP -->|OWNS| REPO[Repository]
    HOST -->|HOSTS| SVC[Service]
    HOST -->|HOSTS| CONT[Container]
    HOST -->|CONTAINS| EP[Endpoint]
    SVC -->|EXPOSES| EP
    SVC -->|EXPOSES| API[API]
    SVC -->|USES| TECH[Technology]
    CONT -->|CONTAINS| EP
    REPO -->|CONTAINS| CRED[Credential]
    EP -->|EXPOSES| FIND[Finding]
    API -->|EXPOSES| FIND
    EP -->|USES| TECH
    API -->|USES| TECH
    FIND -->|DISCOVERED_BY| EVID[Evidence]
    FIND -->|LEADS_TO| ASTEP[AttackStep]
    FIND -->|MITIGATED_BY| AREC[Recommendation]
    EP -->|AUTHENTICATES| IDEN[Identity]
    API -->|AUTHENTICATES| IDEN
    EP -->|EXPOSES| SEC[Secret]
    API -->|EXPOSES| SEC
    EP -->|CONNECTED_TO| CLOUD[CloudResource]
    SVC -->|CONNECTED_TO| CLOUD
    HOST -->|CONNECTED_TO| CLOUD
    FIND -->|RELATED_TO| ASTEP
    IDEN -->|TRUSTS| CRED
    CLOUD -->|CONTAINS| SVC
    AST[Asset] -->|OWNS| APP

    style APP fill:#1e3a5f,stroke:#38bdf8,color:#e2e8f0
    style HOST fill:#1e3a5f,stroke:#38bdf8,color:#e2e8f0
    style EP fill:#1e3a5f,stroke:#34d399,color:#e2e8f0
    style API fill:#1e3a5f,stroke:#34d399,color:#e2e8f0
    style FIND fill:#3f1e1e,stroke:#f87171,color:#e2e8f0
    style EVID fill:#1e3a5f,stroke:#fbbf24,color:#e2e8f0
    style TECH fill:#1e3a5f,stroke:#a78bfa,color:#e2e8f0
    style IDEN fill:#1e3a5f,stroke:#fbbf24,color:#e2e8f0
    style SEC fill:#3f1e1e,stroke:#f87171,color:#e2e8f0
    style CRED fill:#3f1e1e,stroke:#f87171,color:#e2e8f0
    style ASTEP fill:#3f1e1e,stroke:#f87171,color:#e2e8f0
    style AREC fill:#1e3a5f,stroke:#34d399,color:#e2e8f0
    style AST fill:#1e3a5f,stroke:#38bdf8,color:#e2e8f0
    style CLOUD fill:#1e3a5f,stroke:#06b6d4,color:#e2e8f0
    style SVC fill:#1e3a5f,stroke:#a78bfa,color:#e2e8f0
    style CONT fill:#1e3a5f,stroke:#a78bfa,color:#e2e8f0
    style REPO fill:#1e3a5f,stroke:#06b6d4,color:#e2e8f0
```

### 8.2 Полный перечень Node Types

| # | Node Type | Свойства | Описание |
|---|-----------|----------|----------|
| 1 | **Application** | name, url, tech_stack, business_criticality, environment, owner | Корневой узел приложения. Все объекты безопасности принадлежат Application. |
| 2 | **Host** | hostname, ip, os, ports, services, cloud_provider, region | Сервер, виртуальная машина или контейнер-хост. Физическая или логическая единица инфраструктуры. |
| 3 | **Endpoint** | path, method, params, auth_required, content_type, rate_limit, response_codes | HTTP-эндпоинт. Включает путь, метод, параметры и требования аутентификации. |
| 4 | **API** | path, method, params, auth, rate_limit, schema, version, deprecation_status | API-эндпоинт. Отличается от Endpoint наличием формальной схемы и версионирования. |
| 5 | **Technology** | name, version, category, cpe, known_cves, end_of_life, license | Используемая технология (framework, library, runtime). Включает CPE для корреляции с CVE. |
| 6 | **Finding** | title, severity, cwe, cve, evidence, source, confidence, cvss_vector | Обнаруженная уязвимость или проблема безопасности. Core-сущность графа. |
| 7 | **Evidence** | type, content, quality, source, timestamp, raw_data_hash | Доказательство, подтверждающее Finding. Может быть HTTP-запросом, скриншотом, логом. |
| 8 | **Identity** | type, value, context, auth_mechanism, scope, expiry | Идентичность: пользователь, токен, cookie, API key. Используется для анализа аутентификации. |
| 9 | **Secret** | type, location, exposure, rotation_policy, entropy_score, pattern_match | Обнаруженный секрет: API key, пароль, сертификат. Включает оценку энтропии. |
| 10 | **Credential** | type, storage, access_pattern, privilege_level, mfa_enabled | Учётные данные: пара логин/пароль, SSH key, OAuth token. Связан с Identity. |
| 11 | **AttackStep** | type, description, severity, prerequisites, exploit_available, complexity | Шаг в цепочке атаки. Связывается с другими AttackStep через LEADS_TO. |
| 12 | **Recommendation** | title, type, priority, effort, impact, references, auto_fix_available | Рекомендация по устранению уязвимости. Связана с Finding через MITIGATED_BY. |
| 13 | **Asset** | name, type, classification, business_impact, data_sensitivity, compliance_requirements | Бизнес-актив, нуждающийся в защите. Определяет Business Criticality для Risk Engine. |
| 14 | **CloudResource** | provider, resource_type, arn, region, vpc, security_group, iam_policies | Облачный ресурс (EC2, S3, RDS и т.д.). Связан с Host и Service. |
| 15 | **Service** | name, port, protocol, version, banner, health_check, dependencies | Сетевой сервис. Может быть веб-сервером, базой данных, очередью сообщений. |
| 16 | **Container** | image, tag, runtime, ports, volumes, env_vars, orchestration | Контейнер (Docker, Podman). Связан с Host через HOSTS. |
| 17 | **Repository** | url, vcs, branch, last_commit, ci_cd_pipeline, dependencies | Исходный код или конфигурационный репозиторий. Связан с Credential и Technology. |
| 18 | **Component** | name, type, version, supplier, sbom_ref, vulnerabilities | Программный компонент из SBOM. Связан с Technology через DEPENDS_ON. |

---

## 9. Edge Types

### 9.1 Полный перечень Edge Types

| # | Edge Type | Source -> Target | Направление | Вес | Семантика | Ограничения |
|---|-----------|-----------------|-------------|-----|-----------|-------------|
| 1 | **USES** | Endpoint/API/Service -> Technology | OUTGOING | 0.8 | Объект использует технологию | Source: {Endpoint, API, Service, Container}; Target: Technology |
| 2 | **OWNS** | Asset -> Application; Application -> Host/Service/Repository | OUTGOING | 1.0 | Владение ресурсом | Source: {Asset, Application}; Target: {Application, Host, Service, Repository} |
| 3 | **CALLS** | Endpoint -> Endpoint; Endpoint -> API; API -> API | OUTGOING | 0.7 | Один объект вызывает другой | Source: {Endpoint, API}; Target: {Endpoint, API} |
| 4 | **DEPENDS_ON** | Service -> Service; Technology -> Technology; Component -> Component | OUTGOING | 0.6 | Зависимость между объектами | Source: {Service, Technology, Component}; Target: {Service, Technology, Component} |
| 5 | **HOSTS** | Host -> Service; Host -> Container | OUTGOING | 0.9 | Хост содержит сервис/контейнер | Source: Host; Target: {Service, Container} |
| 6 | **CONNECTED_TO** | Host -> Host; Host -> CloudResource; Service -> CloudResource | BIDIRECTIONAL | 0.5 | Сетевая связность | Source: {Host, Service}; Target: {Host, CloudResource} |
| 7 | **LEADS_TO** | AttackStep -> AttackStep; Finding -> AttackStep | OUTGOING | 0.8 | Цепочка атаки | Source: {AttackStep, Finding}; Target: AttackStep |
| 8 | **DISCOVERED_BY** | Finding -> Evidence | OUTGOING | 0.9 | Находка обнаружена с помощью доказательства | Source: Finding; Target: Evidence |
| 9 | **EXPOSES** | Endpoint/API -> Finding; Endpoint/API -> Secret | OUTGOING | 0.9 | Объект раскрывает уязвимость/секрет | Source: {Endpoint, API}; Target: {Finding, Secret} |
| 10 | **AUTHENTICATES** | Endpoint/API -> Identity | OUTGOING | 0.7 | Объект использует механизм аутентификации | Source: {Endpoint, API}; Target: Identity |
| 11 | **TRUSTS** | Identity -> Credential | OUTGOING | 0.8 | Идентичность доверяет учётным данным | Source: Identity; Target: Credential |
| 12 | **CONTAINS** | Application -> Host; CloudResource -> Service; Repository -> Credential; Repository -> Technology | OUTGOING | 0.7 | Объект содержит другой объект | Source: {Application, CloudResource, Repository}; Target: {Host, Service, Credential, Technology} |
| 13 | **RELATED_TO** | Finding -> Finding; Finding -> Asset; Finding -> Technology | BIDIRECTIONAL | 0.4 | Общая связь без чёткой направленности | Source: {Finding, Asset, Technology}; Target: {Finding, Asset, Technology} |
| 14 | **MITIGATED_BY** | Finding -> Recommendation | OUTGOING | 0.8 | Рекомендация устраняет находку | Source: Finding; Target: Recommendation |

### 9.2 Правила формирования рёбер

1. **Provenance First:** Каждое ребро содержит Provenance — источник, время обнаружения, confidence обнаружившего движка
2. **Weight = Confidence x SemanticWeight:** Вес ребра = confidence источника x семантический вес по умолчанию (из таблицы выше)
3. **Direction Enforcement:** OUTGOING рёбра обходятся только в одном направлении; BIDIRECTIONAL — в обоих
4. **Constraint Validation:** Перед созданием ребра проверяются ограничения на допустимые source/target node types; некорректные рёбра отбрасываются
5. **Deduplication:** Два узла не могут иметь более одного ребра одного типа в одном направлении; при конфликте побеждает ребро с большим confidence
6. **No Self-Loops:** Ребро не может связывать узел с самим собой (source_id != target_id)

---

## 10. Graph Storage Model

### 10.1 Storage Layout

```mermaid
graph TD
    subgraph "Node Store"
        NS_MAIN[Node Primary<br/>node_id -> GraphNode]
        NS_TYPE[Type Index<br/>node_type -> List of node_ids]
        NS_PROP[Property Index<br/>property:value -> List of node_ids]
    end

    subgraph "Edge Store"
        ES_MAIN[Edge Primary<br/>edge_id -> GraphEdge]
        ES_ADJ[Adjacency List<br/>source_id -> List of edges]
        ES_REV[Reverse Index<br/>target_id -> List of edges]
        ES_TYPE[Edge Type Index<br/>relationship_type -> List of edge_ids]
    end

    subgraph "Specialized Indexes"
        IX_TEMP[Temporal Index<br/>timestamp -> List of node/edge_ids]
        IX_CONF[Confidence Index<br/>confidence_range -> List of node_ids]
        IX_PROV[Provenance Index<br/>source -> List of node/edge_ids]
    end

    subgraph "Version Store"
        VS_SNAP[Snapshot Store<br/>snapshot_id -> GraphSnapshot]
        VS_DELTA[Delta Store<br/>version_id -> DeltaOperations]
        VS_VER[Version Chain<br/>version_id -> GraphVersion]
    end

    NS_MAIN --> NS_TYPE
    NS_MAIN --> NS_PROP
    ES_MAIN --> ES_ADJ
    ES_MAIN --> ES_REV
    ES_MAIN --> ES_TYPE
    NS_MAIN --> IX_TEMP
    ES_MAIN --> IX_TEMP
    NS_MAIN --> IX_CONF
    NS_MAIN --> IX_PROV
    ES_MAIN --> IX_PROV
    VS_SNAP --> VS_DELTA
    VS_SNAP --> VS_VER

    style NS_MAIN fill:#0f172a,stroke:#38bdf8,color:#e2e8f0
    style NS_TYPE fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style NS_PROP fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style ES_MAIN fill:#0f172a,stroke:#38bdf8,color:#e2e8f0
    style ES_ADJ fill:#0f172a,stroke:#34d399,color:#e2e8f0
    style ES_REV fill:#0f172a,stroke:#34d399,color:#e2e8f0
    style ES_TYPE fill:#0f172a,stroke:#64748b,color:#e2e8f0
    style IX_TEMP fill:#0f172a,stroke:#fbbf24,color:#e2e8f0
    style IX_CONF fill:#0f172a,stroke:#fbbf24,color:#e2e8f0
    style IX_PROV fill:#0f172a,stroke:#fbbf24,color:#e2e8f0
    style VS_SNAP fill:#0f172a,stroke:#f87171,color:#e2e8f0
    style VS_DELTA fill:#0f172a,stroke:#f87171,color:#e2e8f0
    style VS_VER fill:#0f172a,stroke:#f87171,color:#e2e8f0
```

### 10.2 Node Storage

Узлы хранятся в виде key-value отображения, где ключ — `NodeIdentity.hash`, значение — сериализованный `GraphNode`. Дополнительные индексы обеспечивают быстрый поиск по типу и свойствам.

**Primary Storage:**
- Формат: `Dict[str, GraphNode]` (in-memory) или column-family store (persistent)
- Ключ: `NodeIdentity.hash` (SHA-256 от identity_type + value + namespace)
- Значение: Полный GraphNode с metadata и provenance
- Сложность чтения: O(1)
- Сложность записи: O(1) + O(k) для обновления индексов (k — количество индексов)

**Type Index:**
- Формат: `Dict[str, Set[str]]` — node_type -> set of node_id hashes
- Назначение: Быстрый поиск всех узлов определённого типа (например, все Finding)
- Сложность: O(1) lookup + O(n) для перечисления всех узлов типа

**Property Index:**
- Формат: `Dict[str, Dict[Any, Set[str]]]` — property_name -> property_value -> set of node_id hashes
- Назначение: Быстрый поиск узлов по значению свойства (например, все Finding с severity=critical)
- Сложность: O(1) lookup
- Ограничение: Индексируются только часто запрашиваемые свойства (severity, cwe, cve, hostname, path)

### 10.3 Edge Storage

Рёбра хранятся в трёх параллельных структурах для обеспечения быстрого доступа из разных контекстов.

**Primary Storage:**
- Формат: `Dict[str, GraphEdge]` — edge_id -> GraphEdge
- Ключ: `edge_id` = SHA-256(source_id + target_id + relationship_type)
- Сложность: O(1)

**Adjacency List:**
- Формат: `Dict[str, List[GraphEdge]]` — source_node_id -> list of outgoing edges
- Назначение: Обход графа от узла к его соседям (ключевая операция для Traversal Engine)
- Сложность: O(1) для получения всех исходящих рёбер узла
- Оптимизация: Рёбра в adjacency list отсортированы по весу (убывание) для приоритизации обхода

**Reverse Index:**
- Формат: `Dict[str, List[GraphEdge]]` — target_node_id -> list of incoming edges
- Назначение: Обратный обход (кто ссылается на данный узел). Необходим для построения Attack Paths в обратном направлении.
- Сложность: O(1) для получения всех входящих рёбер узла

**Edge Type Index:**
- Формат: `Dict[RelationshipType, Set[str]]` — relationship_type -> set of edge_ids
- Назначение: Быстрый поиск всех рёбер определённого типа (например, все LEADS_TO для Attack Path Builder)
- Сложность: O(1) lookup

### 10.4 Specialized Indexes

**Temporal Index:**
- Формат: `SortedDict[datetime, Set[str]]` — timestamp -> set of node/edge_ids
- Назначение: Поиск объектов по временному диапазону (что изменилось за последний час?)
- Сложность: O(log n) для range query

**Confidence Index:**
- Формат: `SortedDict[float, Set[str]]` — confidence -> set of node_ids
- Назначение: Фильтрация по confidence (например, только находки с confidence >= 0.7)
- Сложность: O(log n) для range query

**Provenance Index:**
- Формат: `Dict[str, Set[str]]` — source_name -> set of node/edge_ids
- Назначение: Поиск всех объектов, полученных от конкретного источника (например, все находки от Nuclei)
- Сложность: O(1) lookup

---

## 11. Traversal Engine

### 11.1 Traversal Diagram

```mermaid
graph TD
    INPUT[Traversal Request] --> PARSE[Parse Parameters]
    PARSE --> SELECT{Select Algorithm}
    SELECT -->|BFS| BFS[Breadth-First Search]
    SELECT -->|DFS| DFS[Depth-First Search]
    SELECT -->|BIDI| BIDI[Bidirectional Search]
    SELECT -->|SP| SP[Shortest Path]
    SELECT -->|MP| MP[Multi Path]
    SELECT -->|CD| CD[Cycle Detection]
    SELECT -->|REACH| REACH[Reachability]

    BFS --> EXEC[Execute Traversal]
    DFS --> EXEC
    BIDI --> EXEC
    SP --> EXEC
    MP --> EXEC
    CD --> EXEC
    REACH --> EXEC

    EXEC --> CACHE{Cache Hit?}
    CACHE -->|Yes| RETURN[Return Cached Subgraph]
    CACHE -->|No| TRAVERSE[Traverse Graph]
    TRAVERSE --> BUILD[Build Subgraph]
    BUILD --> CACHE_PUT[Cache Result]
    CACHE_PUT --> RETURN

    style INPUT fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style PARSE fill:#111827,stroke:#64748b,color:#e2e8f0
    style SELECT fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style BFS fill:#111827,stroke:#34d399,color:#e2e8f0
    style DFS fill:#111827,stroke:#34d399,color:#e2e8f0
    style BIDI fill:#111827,stroke:#34d399,color:#e2e8f0
    style SP fill:#111827,stroke:#f87171,color:#e2e8f0
    style MP fill:#111827,stroke:#f87171,color:#e2e8f0
    style CD fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style REACH fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style EXEC fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style CACHE fill:#111827,stroke:#a78bfa,color:#e2e8f0
    style RETURN fill:#111827,stroke:#34d399,color:#e2e8f0
    style TRAVERSE fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style BUILD fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style CACHE_PUT fill:#111827,stroke:#a78bfa,color:#e2e8f0
```

### 11.2 Алгоритмы и их сложность

| # | Алгоритм | Описание | Сложность (время) | Сложность (память) | Оптимальный сценарий |
|---|----------|----------|--------------------|--------------------|---------------------|
| 1 | **BFS** | Обход в ширину — посещает все узлы на расстоянии k перед переходом к k+1 | O(V + E) | O(V) | Поиск кратчайшего пути в невзвешенном графе; обнаружение всех узлов на фиксированной глубине |
| 2 | **DFS** | Обход в глубину — идёт до максимальной глубины перед возвратом | O(V + E) | O(d), d = max depth | Поиск всех путей; построение Attack Paths; обнаружение циклов |
| 3 | **Bidirectional Search** | Двунаправленный поиск — запускает BFS от source и target одновременно | O(V/2 + E/2) | O(V/2) | Поиск кратчайшего пути между двумя известными узлами; ускоряет поиск в больших графах |
| 4 | **Shortest Path** | Поиск кратчайшего пути (Dijkstra для взвешенного, BFS для невзвешенного) | O((V+E) log V) | O(V) | Определение минимального количества шагов атаки от публичного эндпоинта до критического актива |
| 5 | **Multi Path** | Поиск всех путей между двумя узлами с ограничениями | O(V + E) per path | O(V x P), P = number of paths | Обнаружение всех возможных цепочек атаки; ранжирование по Risk Score |
| 6 | **Cycle Detection** | Обнаружение циклов в графе (DFS с colour marking) | O(V + E) | O(V) | Предотвращение бесконечного обхода; обнаружение циркулярных зависимостей в сервисах |
| 7 | **Reachability** | Проверка достижимости одного узла от другого (BFS/DFS с ранним завершением) | O(V + E) worst, O(k) average | O(V) | Определение Reachability для Risk Engine; публичная достижимость уязвимости |

**Обозначения:** V — количество узлов, E — количество рёбер, d — максимальная глубина, P — количество найденных путей, k — среднее расстояние между узлами.

### 11.3 Параметры Traversal

Каждый алгоритм принимает общий набор параметров:

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `start_nodes` | List[NodeIdentity] | required | Стартовые узлы обхода |
| `max_depth` | int | 10 | Максимальная глубина обхода |
| `weight_threshold` | float | 0.0 | Минимальный вес ребра для обхода |
| `edge_types` | List[RelationshipType] | all | Ограничение на типы рёбер |
| `node_types` | List[str] | all | Ограничение на типы узлов |
| `direction` | Direction | OUTGOING | Направление обхода |
| `max_results` | int | 1000 | Максимальное количество результатов |
| `timeout_ms` | int | 30000 | Таймаут выполнения в миллисекундах |

---

## 12. Versioning

### 12.1 Versioning Flow

```mermaid
graph TD
    OP[Graph Operation] --> TXN[Create Transaction]
    TXN --> EXEC[Execute Operations]
    EXEC --> SUCCESS{Success?}
    SUCCESS -->|Yes| COMMIT[Commit Transaction]
    SUCCESS -->|No| ROLLBACK[Rollback Transaction]
    COMMIT --> VER[Create GraphVersion]
    VER --> DELTA[Compute Delta]
    DELTA --> SNAP{Snapshot Triggered?}
    SNAP -->|Yes| SNAP_CREATE[Create Full Snapshot]
    SNAP -->|No| DELTA_STORE[Store Delta Only]
    SNAP_CREATE --> EVENT[Publish GraphEvent]
    DELTA_STORE --> EVENT
    EVENT --> NOTIFY[Notify Consumers]

    ROLLBACK --> CLEANUP[Cleanup Partial State]

    style OP fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style TXN fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style EXEC fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style SUCCESS fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style COMMIT fill:#111827,stroke:#34d399,color:#e2e8f0
    style ROLLBACK fill:#111827,stroke:#f87171,color:#e2e8f0
    style VER fill:#111827,stroke:#a78bfa,color:#e2e8f0
    style DELTA fill:#111827,stroke:#a78bfa,color:#e2e8f0
    style SNAP fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style SNAP_CREATE fill:#111827,stroke:#34d399,color:#e2e8f0
    style DELTA_STORE fill:#111827,stroke:#64748b,color:#e2e8f0
    style EVENT fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style NOTIFY fill:#111827,stroke:#34d399,color:#e2e8f0
    style CLEANUP fill:#111827,stroke:#f87171,color:#e2e8f0
```

### 12.2 Snapshot

Snapshot — полный снимок графа на определённый момент времени. Включает все узлы, рёбра, индексы и метаданные. Snapshot создаётся:
- При завершении каждого сканирования (post-pipeline)
- По расписанию (ежедневно, если были изменения)
- По требованию (manual trigger через API)

Snapshot содержит:
- Полный набор узлов и рёбер (или delta от предыдущего snapshot)
- Контрольную сумму (SHA-256 от сериализованного графа) для верификации целостности
- Метаданные версии (GraphVersion)
- Статистику (node_count, edge_count)

### 12.3 Delta

Delta — разница между двумя последовательными версиями графа. Включает:
- Список добавленных узлов (with full data)
- Список удалённых узлов (by node_id)
- Список обновлённых узлов (with diff: old_value -> new_value)
- Список добавленных/удалённых/обновлённых рёбер

Delta хранится компактно: вместо полного графа — только изменения. При восстановлении: базовый snapshot + последовательность delta = текущее состояние.

### 12.4 Rollback

Rollback возвращает граф к предыдущей версии. Механизм:
1. Определить целевую версию (target_version_id)
2. Найти ближайший snapshot раньше target_version
3. Применить snapshot
4. Применить последовательность delta от snapshot до target_version
5. Создать RollbackVersion (новая версия, указывающая на причину отката)
6. Опубликовать GraphRolledBack event

**Гарантии Rollback:**
- Atomicity: откат выполняется как единая транзакция
- No Data Loss: откат не удаляет данные, а создаёт новую версию
- Audit Trail: каждый откат зафиксирован в истории версий
- Reversible: откат может быть сам откачен (rollback of rollback)

### 12.5 Replay

Replay воспроизводит последовательность операций от одной версии к другой. Используется для:
- Воспроизведения анализа на исторических данных
- Тестирования новых правил корреляции на прошлых версиях графа
- A/B тестирования аналитических алгоритмов

Механизм: аналогичен Rollback, но целевая версия может быть любой, а не только предыдущей.

### 12.6 Incremental Update

Incremental Update добавляет новые данные в граф без полного перестроения. Механизм:
1. Pipeline публикует артефакты через Artifact Bus
2. Normalizer Filter преобразует артефакты в Graph Operations
3. Graph Builder выполняет операции в транзакции
4. Создаётся Delta (разница с предыдущей версией)
5. Публикуется GraphIncrementalUpdate event

**Преимущества инкрементального обновления:**
- Нет простоя: граф доступен во время обновления
- Минимальная нагрузка: обрабатываются только изменения
- Детерминированность: один и тот же набор артефактов всегда даёт один и тот же результат

### 12.7 Merge и Conflict Resolution

Merge объединяет изменения из двух параллельных веток (например, два одновременных сканирования разных модулей). Conflict Resolution определяет, как обрабатывать конфликтующие изменения.

**Стратегии разрешения конфликтов:**

| Конфликт | Стратегия | Обоснование |
|----------|-----------|-------------|
| Одно свойство обновлено двумя источниками | Выбрать значение с большим confidence | Более достоверный источник побеждает |
| Узел создан двумя источниками | Merge: создать один узел с объединёнными свойствами | Один и тот же объект безопасности |
| Ребро создано дважды с разным весом | Выбрать ребро с большим весом | Более сильная связь побеждает |
| Узел создан в одной ветке и удалён в другой | Сохранить узел (create wins over delete) | Безопаснее сохранить данные, чем потерять |
| Свойство изменено в одной ветке и удалено в другой | Сохранить изменение (update wins over delete) | Аналогично: сохранение данных приоритетнее |

---

## 13. Graph Query API

### 13.1 API Methods

| # | Метод | Сигнатура | Описание | Возвращает |
|---|-------|-----------|----------|-----------|
| 1 | **createNode** | `createNode(node_type: str, identity: NodeIdentity, metadata: NodeMetadata) -> GraphNode` | Создаёт новый узел в графе. Если узел с такой identity уже существует, обновляет metadata (merge). | GraphNode |
| 2 | **updateNode** | `updateNode(node_id: NodeIdentity, metadata: NodeMetadata) -> GraphNode` | Обновляет metadata узла. Создаёт новую версию узла (immutable). Старая версия сохраняется. | GraphNode |
| 3 | **removeNode** | `removeNode(node_id: NodeIdentity) -> bool` | Soft delete: помечает узел как Archived. Связанные рёбра также помечаются. | bool |
| 4 | **createEdge** | `createEdge(source: NodeIdentity, target: NodeIdentity, relationship: Relationship, weight: float) -> GraphEdge` | Создаёт направленное ребро между узлами. Проверяет constraints. | GraphEdge |
| 5 | **removeEdge** | `removeEdge(edge_id: str) -> bool` | Удаляет ребро (hard delete, т.к. рёбра версионируются через GraphVersion). | bool |
| 6 | **query** | `query(pattern: QueryPattern, filters: List[Filter], limit: int, offset: int) -> List[GraphNode]` | Поиск узлов по паттерну с фильтрацией и пагинацией. | List[GraphNode] |
| 7 | **traverse** | `traverse(start: NodeIdentity, algorithm: TraversalAlgorithm, params: Dict) -> Subgraph` | Обход графа от стартового узла с заданным алгоритмом и параметрами. | Subgraph |
| 8 | **shortestPath** | `shortestPath(source: NodeIdentity, target: NodeIdentity, weight_attribute: str = "weight") -> List[GraphEdge]` | Поиск кратчайшего пути между двумя узлами. Использует Dijkstra для взвешенного графа. | List[GraphEdge] |
| 9 | **export** | `export(format: ExportFormat, filters: List[Filter] = None) -> bytes` | Экспорт графа (или подграфа) в указанном формате (JSON, GraphML, Mermaid). | bytes |
| 10 | **snapshot** | `snapshot(description: str = "") -> GraphSnapshot` | Создание снимка текущего состояния графа. | GraphSnapshot |
| 11 | **rollback** | `rollback(target_version_id: str) -> GraphVersion` | Откат графа к указанной версии. Создаёт новую версию с типом ROLLBACK. | GraphVersion |

### 13.2 Query Flow

```mermaid
sequenceDiagram
    participant C as Consumer
    participant API as Graph Query API
    participant CACHE as Cache Layer
    participant IDX as Index Manager
    participant NS as Node Store
    participant ES as Edge Store

    C->>API: query(pattern, filters, limit, offset)
    API->>CACHE: check cache(pattern_hash)
    alt Cache Hit
        CACHE-->>API: cached result
        API-->>C: List[GraphNode]
    else Cache Miss
        API->>IDX: lookup indexes(filters)
        IDX-->>API: candidate node_ids
        API->>NS: fetch nodes(candidate_ids)
        NS-->>API: List[GraphNode]
        API->>API: apply remaining filters
        API->>CACHE: store result(pattern_hash, result)
        API-->>C: List[GraphNode]
    end

    C->>API: traverse(start, BFS, {max_depth: 5})
    API->>CACHE: check cache(traversal_hash)
    alt Cache Hit
        CACHE-->>API: cached Subgraph
        API-->>C: Subgraph
    else Cache Miss
        API->>ES: get_adjacent(start)
        ES-->>API: List[GraphEdge]
        loop For each edge
            API->>NS: fetch node(edge.target)
            NS-->>API: GraphNode
            API->>ES: get_adjacent(node)
            ES-->>API: List[GraphEdge]
        end
        API->>API: build Subgraph
        API->>CACHE: store result
        API-->>C: Subgraph
    end
```

### 13.3 Контрактные гарантии API

| Гарантия | Описание |
|----------|----------|
| **Idempotency** | createNode с одинаковой identity — idempotent (merge metadata). createEdge с одинаковым source/target/type — idempotent (update weight). |
| **Atomicity** | Все операции внутри Transaction — атомарны. Либо все выполняются, либо ни одна. |
| **Consistency** | После commit транзакции граф находится в согласованном состоянии (все индексы обновлены). |
| **Isolation** | Параллельные транзакции не видят промежуточных результатов друг друга. |
| **Durability** | После commit транзакции результат сохранён в Snapshot/Delta и переживает перезапуск. |
| **Determinism** | Один и тот же запрос на одном и том же графе всегда даёт один и тот же результат. |

---

## 14. Synchronization

### 14.1 Synchronization Flow

```mermaid
graph TD
    subgraph "Pipeline"
        AB[Artifact Bus]
    end

    subgraph "Graph Platform"
        NF[Normalizer Filter]
        GB[Graph Builder]
        GEB[Graph Event Bus]
    end

    subgraph "Consumers"
        SIE[Security Intelligence Engine]
        EE[Explainability Engine]
        DASH[Dashboard]
        CS[Continuous Security]
    end

    AB -->|ArtifactPublished| NF
    NF -->|GraphOperations| GB
    GB -->|commit| GEB

    GEB -->|NodeCreated| SIE
    GEB -->|NodeUpdated| SIE
    GEB -->|EdgeCreated| SIE
    GEB -->|SnapshotCreated| SIE

    GEB -->|NodeCreated| EE
    GEB -->|EdgeCreated| EE
    GEB -->|SnapshotCreated| EE

    GEB -->|GraphVersionChanged| DASH
    GEB -->|SnapshotCreated| DASH

    GEB -->|GraphVersionChanged| CS
    GEB -->|NodeUpdated| CS

    style AB fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style NF fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style GB fill:#111827,stroke:#38bdf8,color:#e2e8f0
    style GEB fill:#111827,stroke:#fbbf24,color:#e2e8f0
    style SIE fill:#111827,stroke:#f87171,color:#e2e8f0
    style EE fill:#111827,stroke:#06b6d4,color:#e2e8f0
    style DASH fill:#111827,stroke:#34d399,color:#e2e8f0
    style CS fill:#111827,stroke:#34d399,color:#e2e8f0
```

### 14.2 Pipeline -> Graph

Артефакты из Scan Pipeline поступают через Artifact Bus и преобразуются в Graph Operations:

1. **ArtifactPublished** событие из Artifact Bus
2. **Normalizer Filter** определяет тип артефакта и извлекает данные для создания узлов/рёбер
3. **Graph Builder** создаёт GraphTransaction с набором операций
4. **Commit** транзакции: выполняются все операции, обновляются индексы, создаётся GraphVersion
5. **Delta** вычисляется и сохраняется
6. **Graph Events** публикуются в Graph Event Bus

### 14.3 Graph -> Intelligence

SIE подписывается на Graph Events для инкрементального анализа:

| Событие | Действие SIE |
|---------|-------------|
| NodeCreated (type=Finding) | Найти корреляции с существующими находками |
| NodeUpdated (type=Finding) | Пересчитать Risk Score для обновлённой находки |
| EdgeCreated (type=LEADS_TO) | Перестроить Attack Path с новым ребром |
| EdgeCreated (type=EXPOSES) | Пересчитать Exposure для затронутого эндпоинта |
| SnapshotCreated | Запустить полный анализ (batch mode) |

### 14.4 Graph -> Explainability

Explainability Engine подписывается на Graph Events для обновления объяснений:

| Событие | Действие EE |
|---------|------------|
| NodeCreated (type=Finding) | Создать начальное объяснение для находки |
| EdgeCreated (type=LEADS_TO) | Обновить объяснение Attack Path |
| SnapshotCreated | Пересоздать объяснения для всего графа |
| GraphRolledBack | Откатить объяснения к предыдущей версии |

### 14.5 Event Bus Details

**Graph Event Bus** — внутренняя событийная шина Graph Platform. Отличается от Artifact Bus:
- Artifact Bus — шина артефактов сканирования (между Pipeline компонентами)
- Graph Event Bus — ша графовых событий (между Graph Platform и потребителями)

**Типы событий:**

| Тип | Payload | Частота |
|-----|---------|---------|
| NodeCreated | node_id, node_type, version | Высокая |
| NodeUpdated | node_id, changed_properties, old_values, new_values | Средняя |
| NodeRemoved | node_id, node_type | Низкая |
| EdgeCreated | edge_id, source_id, target_id, relationship_type | Высокая |
| EdgeRemoved | edge_id | Низкая |
| SnapshotCreated | snapshot_id, version, node_count, edge_count | Низкая |
| GraphVersionChanged | version_id, operation, description | Средняя |
| GraphRolledBack | version_id, target_version, reason | Редкая |

### 14.6 Incremental Updates

Incremental Updates — ключевой механизм синхронизации. Вместо полного перестроения графа при каждом сканировании, обновляются только изменённые узлы и рёбра.

**Алгоритм Incremental Update:**

1. Получить артефакты из Pipeline
2. Для каждого артефакта определить затронутые NodeIdentities
3. Запросить существующие узлы по identity (Graph Query API)
4. Если узел существует — вычислить diff и создать updateNode операцию
5. Если узел не существует — создать createNode операцию
6. Аналогично для рёбер
7. Выполнить все операции в одной транзакции
8. Опубликовать GraphEvents

**Преимущества:**
- Минимальная нагрузка на Storage (только изменения)
- Потребители получают только релевантные события
- Детерминированность: результат не зависит от порядка операций (благодаря merge semantics)

---

## 15. Performance Strategy

### 15.1 Caching

**Стратегия кэширования:** Multi-level cache с event-driven invalidation.

| Уровень | Содержимое | TTL | Invalidation |
|---------|-----------|-----|-------------|
| L1: Query Cache | Результаты query() по pattern_hash | 5 мин | GraphEvent (NodeCreated, NodeUpdated, EdgeCreated, EdgeRemoved) |
| L2: Traversal Cache | Результаты traverse() по traversal_hash | 10 мин | GraphEvent (любое изменение в затронутом подграфе) |
| L3: Node Cache | Отдельные GraphNode по node_id | 30 мин | GraphEvent (NodeUpdated, NodeRemoved) |
| L4: Snapshot Cache | GraphSnapshot по snapshot_id | Без TTL | Никогда не инвалидируется (snapshots immutable) |

**Политика инвалидации:** Event-driven (приоритет) + TTL (fallback). При получении GraphEvent определяются затронутые cache keys и инвалидируются. TTL — страховка на случай пропущенных событий.

### 15.2 Indexing

Стратегия индексирования определена в разделе Graph Storage Model (раздел 10). Дополнительные принципы:

- **Lazy Index Building:** Индексы строятся при первом обращении, а не при старте
- **Incremental Index Update:** Индексы обновляются инкрементально при каждой транзакции
- **Index Selection:** Query Planner выбирает оптимальный индекс на основе паттерна запроса
- **Index Compression:** Для больших индексов применяется compression (run-length encoding для sorted lists)

### 15.3 Lazy Loading

Узлы и рёбра загружаются по требованию, а не целиком:

- **Traversal:** Загружаются только узлы и рёбра, посещённые алгоритмом обхода
- **Query:** Загружаются только узлы, удовлетворяющие фильтрам (через индекс)
- **Subgraph:** Формируется из уже загруженных данных; при необходимости загружаются недостающие узлы

Lazy Loading реализуется через proxy-объекты: NodeProxy содержит только node_id и загружает полные данные при первом обращении к metadata.

### 15.4 Graph Partitioning

Для горизонтального масштабирования граф разбивается на партиции:

| Стратегия | Ключ партиции | Описание |
|-----------|--------------|----------|
| Application-scoped | Application node_id | Каждое приложение — отдельная партиция |
| Host-scoped | Host node_id | Все объекты одного хоста в одной партиции |
| Time-scoped | Timestamp range | Партиции по временным диапазонам |

**Рекомендуемая стратегия:** Application-scoped (по умолчанию). Большинство запросов работают в контексте одного приложения, поэтому партиционирование по Application минимизирует cross-partition queries.

### 15.5 Memory Limits

| Параметр | Значение | Описание |
|----------|---------|----------|
| Max Graph Size (in-memory) | 500K nodes, 1.5M edges | При превышении — spill to disk |
| Max Node Size | 10 KB | Serialized GraphNode без raw evidence |
| Max Edge Size | 1 KB | Serialized GraphEdge |
| Max Traversal Depth | 20 | Защита от stack overflow |
| Max Query Results | 10,000 | Защита от memory exhaustion |
| Max Snapshot Size | 100 MB | При превышении — delta-only snapshots |

### 15.6 Large Graph Strategy

При превышении лимитов in-memory хранения:

1. **Hot/Cold Split:** Узлы, посещённые за последние N запросов — hot (in-memory); остальные — cold (on-disk)
2. **Subgraph Materialization:** Для часто используемых подграфов (Attack Paths, Asset graphs) создаются материализованные подграфы
3. **Incremental Traversal:** Обход выполняется партициями, а не целиком; результаты объединяются
4. **Approximate Algorithms:** Для графов > 100K узлов — переключение на приближённые алгоритмы (sampling-based BFS/DFS)

---

## 16. Security

### 16.1 Immutable Graph

Все узлы и рёбра неизменяемы после создания (immutable). Обновление создаёт новую версию, а не модифицирует существующую. Это обеспечивает:

- **Audit Trail:** Каждое изменение зафиксировано и может быть отслежено
- **Reproducibility:** Любая версия графа может быть восстановлена для воспроизведения анализа
- **Thread Safety:** Immutable объекты безопасны для параллельного чтения
- **Integrity:** Невозможно подделать историю изменений

### 16.2 Audit Trail

Каждая операция над графом логируется:

| Поле лога | Описание |
|-----------|----------|
| timestamp | Время операции |
| operation_type | create_node, update_node, create_edge и т.д. |
| actor | Кто выполнил операцию (system, pipeline:nuclei, manual:user_id) |
| target_id | ID затронутого объекта |
| before | Состояние до операции (для update) |
| after | Состояние после операции |
| version_id | Версия графа |
| transaction_id | ID транзакции |

Audit Log неизменяем и хранится отдельно от графа (append-only).

### 16.3 Graph Integrity

**Целостность графа обеспечивается следующими инвариантами:**

1. **Referential Integrity:** Каждое ребро ссылается на существующие узлы (source и target)
2. **No Orphan Nodes:** Каждый узел имеет хотя бы одно ребро (кроме корневого Application)
3. **No Duplicate Edges:** Не может быть двух рёбер одного типа между одной парой узлов в одном направлении
4. **No Self-Loops:** Ребро не может связывать узел с самим собой
5. **Type Constraints:** Source и target узлы ребра соответствуют ограничениям RelationshipType
6. **Weight Range:** Вес ребра в диапазоне [0.0, 1.0]
7. **Confidence Range:** Confidence узла и ребра в диапазоне [0.0, 1.0]

При нарушении любого инварианта транзакция отклоняется (rollback).

### 16.4 Node Validation

Перед созданием или обновлением узла выполняется валидация:

- **Type Validation:** node_type входит в разрешённый перечень (18 типов)
- **Identity Validation:** NodeIdentity содержит обязательные поля (identity_type, value, namespace)
- **Metadata Validation:** Metadata содержит обязательные свойства для данного node_type
- **Confidence Validation:** confidence в диапазоне [0.0, 1.0]
- **Provenance Validation:** Provenance содержит источник и timestamp

### 16.5 Edge Validation

Перед созданием ребра выполняется валидация:

- **Existence Validation:** Source и target узлы существуют в графе
- **Type Compatibility:** Source и target node types соответствуют constraints RelationshipType
- **Uniqueness Validation:** Ребро с таким source/target/type не существует (или будет обновлено)
- **Direction Validation:** Направление ребра соответствует semantics RelationshipType
- **Weight Validation:** Вес в диапазоне [0.0, 1.0]
- **No Self-Loop:** source_id != target_id

### 16.6 Serialization Safety

Сериализация графа (для экспорта, снапшотов, передачи по сети) должна быть безопасной:

- **No Raw Secrets:** При сериализации Secret и Credential узлов значения маскируются
- **No Raw Evidence:** Поле raw_data в Evidence исключается из сериализации (используется hash)
- **Deterministic Serialization:** Порядок полей детерминирован (alphabetical key order) для воспроизводимости checksum
- **Size Limits:** Максимальный размер сериализованного узла — 10 KB; при превышении — truncation с предупреждением
- **Format Validation:** При десериализации проверяется соответствие формату (schema validation)

---

## 17. Failure Recovery

### 17.1 Failure Scenarios

| # | Сценарий | Обнаружение | Восстановление |
|---|----------|------------|----------------|
| 1 | **Partial Transaction Failure** | Операция в транзакции выбросила исключение | Rollback всей транзакции; все partial changes отменены |
| 2 | **Index Corruption** | Checksum mismatch при чтении индекса | Rebuild index из primary storage; log warning |
| 3 | **Snapshot Corruption** | Checksum mismatch при загрузке snapshot | Восстановление из предыдущего snapshot + delta chain |
| 4 | **Cache Stale** | TTL expired или event missed | Event-driven invalidation + TTL fallback; при сомнении — cache miss |
| 5 | **Storage Full** | Write operation возвращает StorageFull error | Switch to delta-only mode (не создавать full snapshots); alert ops |
| 6 | **OOM during Traversal** | Memory limit exceeded | Incremental traversal с пагинацией; spill to disk |
| 7 | **Concurrent Write Conflict** | Два Graph Builder одновременно обновляют один узел | Optimistic locking (version check); при конфликте — merge по правилам из 12.7 |
| 8 | **Consumer Lag** | Потребитель не обрабатывает GraphEvents вовремя | Event buffer (in-memory ring buffer, 10K events); при переполнении — snapshot-based resync |

### 17.2 Recovery Guarantees

| Гарантия | Уровень |
|----------|---------|
| **No Data Loss** | Все зафиксированные транзакции сохранены в Snapshot/Delta |
| **No Silent Corruption** | Checksum verification при загрузке snapshot; integrity checks при каждой транзакции |
| **Recoverability** | Любая версия графа может быть восстановлена из snapshot + delta chain |
| **Consistency** | После recovery граф находится в согласованном состоянии (все индексы актуальны) |
| **Availability** | Чтение доступно во время recovery (через кэш или последний snapshot) |

---

## 18. Future Extensions

### 18.1 Planned Extensions

| # | Расширение | Описание | Зависимость |
|---|-----------|----------|-------------|
| 1 | **Graph Visualization API** | API для рендеринга подграфов в формате, подходящем для Dashboard (D3.js, Cytoscape) | Dashboard Design |
| 2 | **Graph Diff API** | API для сравнения двух версий графа (diff) и генерации человекочитаемого отчёта об изменениях | KG Core |
| 3 | **Graph Schema Validation** | Formal schema (GraphQL-style или JSON Schema) для валидации структуры графа | KG Core |
| 4 | **Distributed Graph** | Поддержка multi-instance Graph Platform с partitioning и replication | Performance testing |
| 5 | **Graph ML Features** | Подготовка данных графа для ML-моделей (node embeddings, graph neural networks) | KG Core + Data Pipeline |
| 6 | **Streaming Updates** | Real-time streaming GraphEvents через WebSocket для live Dashboard | Graph Event Bus |
| 7 | **Graph Permissions** | RBAC для Graph Query API: ограничение доступа к определённым типам узлов/рёбер | Auth Module |
| 8 | **Cross-Application Graph** | Связи между узлами разных приложений (например, shared infrastructure) | Multi-tenant support |

### 18.2 Extension Points

Архитектура закладывает следующие extension points:

- **Storage Backend:** Интерфейс GraphStorage позволяет добавить любую графовую СУБД без изменения上层
- **Traversal Algorithm:** Интерфейс TraversalAlgorithm позволяет добавить новые алгоритмы обхода
- **Event Consumer:** Graph Event Bus поддерживает произвольное количество подписчиков
- **Node/Edge Type:** Перечисления Node Type и Edge Type открыты для расширения
- **Export Format:** Интерфейс GraphExporter позволяет добавить новые форматы экспорта
- **Conflict Strategy:** Интерфейс ConflictResolver позволяет изменить стратегию разрешения конфликтов

---

## 19. Architecture Decision Records

### ADR-KG-001: Почему выбран Property Graph

**Контекст:** Необходимо выбрать модель данных для Knowledge Graph. Основные варианты: Property Graph, RDF/SPARQL, Hypergraph.

**Решение:** Использовать Property Graph модель.

**Обоснование:**
- Property Graph — наиболее интуитивная модель для предметной области безопасности: узлы (Application, Host, Finding) с properties (severity, confidence) и направленные рёбра (EXPOSES, LEADS_TO) с весами
- RDF/SPARQL избыточен для наших задач: не нужна семантическая веб-совместимость, а SPARQL сложнее в реализации и оптимизации
- Hypergraph (рёбра связывают более двух узлов) добавляет сложность без очевидной пользы: все наши связи бинарные (один объект воздействует на другой)
- Property Graph поддерживается всеми основными графовыми СУБД (Neo4j, ArangoDB, Amazon Neptune), обеспечивая portability
- Серийная сериализация Property Graph проще и эффективнее, чем RDF triples

**Последствия:** Все узлы и рёбра имеют properties (key-value pairs). Рёбра направленные и взвешенные. Модель не поддерживает n-арные связи напрямую (решается через промежуточные узлы).

---

### ADR-KG-002: Почему Graph Immutable

**Контекст:** Необходимо определить, могут ли узлы и рёбра изменяться после создания.

**Решение:** Все узлы и рёбра immutable. Обновление создаёт новую версию.

**Обоснование:**
- CTO Decision #7 (Immutable Domain Models) прямо требует неизменяемости всех доменных моделей
- Immutable graph обеспечивает полную воспроизводимость анализа: один и тот же граф всегда даёт один и тот же результат
- Audit trail естественным образом формируется из истории версий — не нужен отдельный механизм логирования изменений
- Thread safety: immutable объекты безопасны для параллельного чтения без блокировок
- Immutable graph упрощает кэширование: нет необходимости в cache invalidation при чтении — данные не меняются
- Rollback и Replay тривиальны: достаточно восстановить нужную версию

**Последствия:** Рост объёма данных (каждое обновление создаёт новую версию). Необходима Retention Policy для очистки старых версий. Delta snapshots минимизируют overhead.

---

### ADR-KG-003: Почему Snapshot-based Versioning

**Контекст:** Необходимо выбрать стратегию версионирования графа. Варианты: Event Sourcing (воспроизведение всех событий), Snapshot-based (периодические снимки), Hybrid.

**Решение:** Hybrid: Snapshot + Delta. Периодические полные снимки + инкрементальные дельты между снимками.

**Обоснование:**
- Event Sourcing чист, но медленный при восстановлении: для графа с 10K изменений воспроизведение всех событий занимает неприемлемо долго
- Snapshot-only быстро для восстановления, но создаёт избыточную нагрузку при сохранении полного графа при каждом изменении
- Hybrid (Snapshot + Delta) оптимален: полный snapshot создаётся редко (post-pipeline), а delta — при каждом инкрементальном обновлении
- Восстановление: загрузить ближайший snapshot + применить delta chain = текущее состояние
- Сложность восстановления: O(snapshot_size + sum(delta_sizes)), что значительно меньше O(all_events) при Event Sourcing

**Последствия:** Необходимость управления lifecycle snapshots (retention, cleanup). Delta chain не должен быть слишком длинным (макс. 50 delta перед обязательным snapshot). Контрольная сумма snapshot для верификации целостности.

---

### ADR-KG-004: Почему Traversal Engine отделён от Storage

**Контекст:** Traversal может быть реализован как часть Storage Layer (native graph DB traversal) или как отдельный компонент.

**Решение:** Traversal Engine — отдельный компонент, не зависящий от Storage.

**Обоснование:**
- Storage Agnostic: если Traversal привязан к конкретной СУБД (например, Cypher для Neo4j), замена бэкенда потребует переписывания всего аналитического слоя
- Determinism: собственный Traversal Engine гарантирует детерминированность результатов независимо от оптимизаций конкретной СУБД
- Testability: Traversal Engine можно тестировать изолированно, с mock-графами
- Extensibility: новые алгоритмы обхода добавляются в Traversal Engine без изменения Storage
- Performance Control: собственный кэш на уровне Traversal Engine, независимый от Storage caching

**Последствия:** Traversal Engine использует Graph Query API для доступа к данным, что добавляет один уровень абстракции. Native traversal СУБД может быть быстрее, но мы приоритизируем portability и determinism над raw performance.

---

### ADR-KG-005: Почему Query API не зависит от Storage

**Контекст:** Graph Query API может напрямую обращаться к конкретной СУБД или быть абстрагирован через интерфейс.

**Решение:** Graph Query API определён через интерфейс (AbstractGraphStorage), конкретная реализация предоставляется через dependency injection.

**Обоснование:**
- CTO Decision #4 (Plugin Architecture) требует, чтобы ядро не зависело от конкретных реализаций
- Замена NetworkX на Neo4j должна быть прозрачной для SIE, Explainability Engine и других потребителей
- Testing: можно создать InMemoryGraphStorage для unit-тестов без необходимости поднимать СУБД
- Migration path: при необходимости смены бэкенда — реализация нового Storage adapter, без изменения API
- Different deployment scenarios: in-memory для small graphs, Neo4j для production, ArangoDB для multi-model needs

**Последствия:** Все операции графа проходят через абстрактный интерфейс. Невозможно использовать специфичные возможности конкретной СУБД (например, Cypher-запросы). Performance overhead от абстракции минимален (thin wrapper).

---

### ADR-KG-006: Почему Graph Event Bus

**Контекст:** Потребители графа (SIE, EE, Dashboard) нуждаются в уведомлениях об изменениях. Варианты: polling, shared callback, event bus.

**Решение:** Отдельная Graph Event Bus для графовых событий, интегрированная с Artifact Bus на уровне Platform.

**Обоснование:**
- Polling создаёт избыточную нагрузку и задержку (SIE опрашивает граф каждые N секунд)
- Shared callback нарушает Loose Coupling (Graph знает о каждом потребителе)
- Event Bus — стандартный паттерн для decoupled communication, уже принятый платформой (CTO Decision #5)
- Graph Event Bus изолирована от Artifact Bus: разные типы событий, разные потребители, разные гарантии доставки
- Поддержка Incremental Synchronization: потребитель получает только релевантные события, а не весь граф
- Eventual Consistency: потребители обновляются асинхронно, без блокировки Graph Platform

**Последствия:** Потребители должны обрабатывать события идемпотентно (событие может быть доставлено более одного раза). Необходим buffer для consumer lag. При потере событий — snapshot-based resync.

---

### ADR-KG-007: Почему Delta Synchronization

**Контекст:** При обновлении графа потребители могут получить полный граф (full sync) или только изменения (delta sync).

**Решение:** Delta Synchronization по умолчанию; Full Sync только при SnapshotCreated или по запросу.

**Обоснование:**
- Полный граф типичного приложения содержит 50K+ узлов и 150K+ рёбер. Передача полного графа при каждом обновлении — недопустимый overhead
- Delta sync передаёт только изменения:新增/изменённые/удалённые узлы и рёбра. Типичный delta — 10-100 объектов, а не 50K+
- SIE работает в incremental mode: при появлении новой находки пересчитать Risk Score только для неё, а не для всего графа
- Delta sync естественно ложится на Graph Event Bus: каждое событие — это delta
- Full sync необходим только при: (1) первом подключении потребителя, (2) SnapshotCreated, (3) потере событий

**Последствия:** Потребитель должен поддерживать локальное состояние (cache графа) и применять delta к нему. При расхождении — запросить full sync через snapshot().

---

### ADR-KG-008: Почему Explainability использует Graph Snapshot

**Контекст:** Explainability Engine нуждается в стабильных данных для формирования объяснений. Если граф изменится в процессе формирования объяснения, результат будет неконсистентным.

**Решение:** Explainability Engine работает с Graph Snapshot, а не с live graph.

**Обоснование:**
- Snapshot immutable — данные не изменятся в процессе формирования объяснения
- Explainability требует воспроизводимости: одно и то же объяснение должно быть идентичным при повторном запросе
- Snapshot привязан к конкретной версии — объяснение можно соотнести с версией графа
- Live graph может измениться между началом и концом формирования объяснения, что приведёт к неконсистентному результату
- Snapshot-based объяснения поддерживают Audit: можно пересоздать объяснение для любой исторической версии графа

**Последствия:** Explainability Engine может работать с немного устаревшими данными (snapshot создаётся post-pipeline, а не real-time). Задержка: от нескольких секунд до нескольких минут. Это допустимо, т.к. объяснения не требуют real-time обновления.

---

## 20. Open Questions

1. **Retention Policy:** Сколько версий графа хранить? Предложение: последние 30 snapshots + все delta за последние 7 дней. Требует валидации с реальными данными.

2. **Snapshot Frequency:** Как часто создавать полные snapshot? Предложение: после каждого pipeline run. Альтернатива: по расписанию (ежечасно). Требует load testing.

3. **Max Graph Size:** При каком размере графа необходимо переключаться на distributed storage? Предложение: 500K узлов (in-memory threshold). Требует benchmarking.

4. **Event Delivery Guarantees:** At-least-once или exactly-once? Предложение: at-least-once с idempotent consumers. Exactly-once требует distributed transactions и значительно усложняет архитектуру.

5. **Cross-Application Queries:** Должен ли Graph Query API поддерживать запросы, объединяющие узлы из разных приложений? Пока нет — но архитектура закладывает extension point.

6. **Graph Schema Evolution:** Как добавлять новые Node Types и Edge Types без нарушения существующих данных? Предложение: schema-less (каждый узел содержит свой тип), но с обязательной валидацией при создании.

7. **Storage Backend Selection:** NetworkX (in-memory, Python-native) или Neo4j (persistent, Cypher) для INT-001? Зависит от performance testing и deployment requirements.

8. **Concurrent Write Handling:** Optimistic locking (version check) или Pessimistic locking (write lock)? Предложение: Optimistic — ожидается низкая конкуренция (pipeline writes sequentially).

---

## Graph Lifecycle Diagram

```mermaid
stateDiagram-v2
    [*] --> Empty: Platform Start
    Empty --> Building: First Pipeline Run
    Building --> Active: Graph Built
    Active --> Updating: New Artifacts
    Updating --> Active: Incremental Update
    Updating --> Versioning: Snapshot Trigger
    Versioning --> Active: Snapshot Created
    Active --> RollingBack: Error Detected
    RollingBack --> Active: Rollback Complete
    Active --> Exporting: Export Request
    Exporting --> Active: Export Complete
    Active --> Archived: Application Removed
    Archived --> [*]
```

---

**Связанные RFC:** [RFC-001: Security Intelligence Engine](./RFC-001_SECURITY_INTELLIGENCE_ENGINE.md)  
**Следующая задача:** INT-001 — Knowledge Graph Core Implementation (после утверждения данного RFC)  
**Статус:** Ожидает ревью
'''

# Write the RFC document
import os

output_path = '/home/z/my-project/sec-scanner-workspace/docs/01_architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(RFC_CONTENT)

print(f"KG-001 RFC written to: {output_path}")
print(f"Document size: {len(RFC_CONTENT)} characters")
print(f"Document lines: {RFC_CONTENT.count(chr(10))}")
