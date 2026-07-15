# INT-001E — Knowledge Graph Storage Adapter (NetworkX Backend)

## Статус: COMPLETED ✅

## Обзор

Реализован первый полноценный backend хранения Knowledge Graph — NetworkX Storage Adapter. Архитектура позволяет заменить backend на Neo4j, Memgraph, JanusGraph или TigerGraph без изменения бизнес-логики.

## Архитектура

```
Domain (INT-001A)
    ↓
Runtime (INT-001B)
    ↓
Traversal (INT-001C)
    ↓
Query (INT-001D)
    ↓
Storage Adapter (INT-001E) ← NetworkX / Neo4j / Memgraph / JanusGraph / TigerGraph
```

### Диаграмма 1: Общая архитектура Storage Adapter

```mermaid
graph TB
    subgraph "Knowledge Graph Stack"
        Domain["Domain Core<br/>INT-001A"]
        Runtime["Runtime<br/>INT-001B"]
        Traversal["Traversal Engine<br/>INT-001C"]
        Query["Query Engine<br/>INT-001D"]
    end

    subgraph "Storage Adapter Layer — INT-001E"
        Provider["GraphStorageProvider<br/>(Interface)"]
        
        subgraph "NetworkX Adapter"
            NXCore["Core Storage<br/>Nodes + Edges + Adjacency"]
            NXIndex["Index Manager<br/>Identity · NodeType · RelType<br/>Metadata · Labels"]
            NXCache["Cache Manager<br/>Read Cache (LRU+TTL)<br/>Write Buffer"]
            NXSnap["Snapshot Manager<br/>Save · Restore · List"]
            NXTx["Transaction Manager<br/>Begin · Commit · Rollback"]
            NXIO["Import/Export<br/>JSON · DOT · GraphML"]
            NXStats["Statistics Collector<br/>Read/Write · Cache · Memory"]
            NXEvents["Event Bus<br/>Connected · Disconnected<br/>Snapshot · Recovery"]
        end
        
        Migration["Migration Layer<br/>StorageMigration Interface<br/>GenericJSONMigration"]
    end

    Domain --> Runtime
    Runtime --> Traversal
    Traversal --> Query
    Query --> Provider
    Provider --> NXCore
    NXCore --> NXIndex
    NXCore --> NXCache
    NXCore --> NXSnap
    NXCore --> NXTx
    NXCore --> NXIO
    NXCore --> NXStats
    NXCore --> NXEvents
    Provider -.-> Migration

    style Provider fill:#e1f5fe,stroke:#01579b
    style NXCore fill:#fff3e0,stroke:#e65100
    style Migration fill:#f3e5f5,stroke:#4a148c
```

### Диаграмма 2: Жизненный цикл данных

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: connect()
    Connecting --> Connected: success
    Connecting --> Error: failure
    Connected --> Disconnected: disconnect()
    Error --> Connecting: retry
    
    state Connected {
        [*] --> Idle
        Idle --> Writing: create/update/delete
        Writing --> Indexing: enableIndexes=true
        Indexing --> Caching: enableReadCache=true
        Caching --> EventEmitting: eventBus
        EventEmitting --> Idle
        
        Idle --> Reading: get/find
        Reading --> CacheCheck: enableReadCache=true
        CacheCheck --> CacheHit: found
        CacheCheck --> StorageRead: miss
        CacheHit --> Idle
        StorageRead --> CachePopulate: populate cache
        CachePopulate --> Idle
        
        Idle --> InTransaction: beginTransaction()
        InTransaction --> TxOps: CRUD operations
        TxOps --> TxCommit: commit()
        TxOps --> TxRollback: rollback()
        TxCommit --> Idle
        TxRollback --> Idle
    }
```

### Диаграмма 3: DI-схема и Repository Binding

```mermaid
graph LR
    subgraph "Application Layer"
        App["Application"]
    end
    
    subgraph "Dependency Injection"
        DI["DI Container"]
    end
    
    subgraph "Knowledge Graph"
        Repo["GraphRepository<br/>(Contract)"]
        Provider["GraphStorageProvider<br/>(Contract)"]
        NXAdapter["NetworkXStorageAdapter<br/>(Implementation)"]
    end
    
    App --> DI
    DI --> Repo
    DI --> Provider
    DI --> NXAdapter
    Provider -.->|"implements"| NXAdapter
    Repo -.->|"bound via"| NXAdapter
    
    style DI fill:#e8f5e9,stroke:#2e7d32
    style NXAdapter fill:#fff3e0,stroke:#e65100
```

### Диаграмма 4: Cache Flow

```mermaid
sequenceDiagram
    participant Client
    participant Adapter as NetworkXStorageAdapter
    participant Cache as Read Cache (LRU+TTL)
    participant Storage as Core Storage (Maps)
    participant Index as Index Manager

    Note over Client,Index: Read Operation
    Client->>Adapter: getNode(id)
    Adapter->>Cache: get(id)
    
    alt Cache Hit
        Cache-->>Adapter: node (from cache)
        Adapter-->>Client: result { fromCache: true }
    else Cache Miss
        Cache-->>Adapter: undefined
        Adapter->>Storage: nodes.get(id)
        Storage-->>Adapter: node
        Adapter->>Cache: set(id, node) [populate cache]
        Adapter-->>Client: result { fromCache: false }
    end

    Note over Client,Index: Write Operation
    Client->>Adapter: createNode(node)
    Adapter->>Storage: nodes.set(id, node)
    Adapter->>Index: indexNode(node)
    Adapter->>Cache: setNode(id, node) [prime cache]
    Adapter-->>Client: result { success: true }
    
    Note over Client,Index: Update Operation
    Client->>Adapter: updateNode(id, props)
    Adapter->>Storage: nodes.get(id) → update
    Adapter->>Index: reindexNode(old, new)
    Adapter->>Cache: invalidateNode(id) → setNode(id, new)
    Adapter-->>Client: result { success: true }
```

### Диаграмма 5: Snapshot Flow

```mermaid
sequenceDiagram
    participant Client
    participant Adapter as NetworkXStorageAdapter
    participant Snapshot as Snapshot Manager
    participant Storage as Core Storage
    participant Events as Event Bus

    Note over Client,Events: Save Snapshot
    Client->>Adapter: saveSnapshot(metadata)
    Adapter->>Storage: getAllNodes(), getAllEdges()
    Storage-->>Adapter: nodes[], edges[]
    Adapter->>Snapshot: saveSnapshot(nodes, edges, metadata)
    Snapshot-->>Adapter: { meta, data }
    Adapter->>Events: emit(StorageSnapshotCreated)
    Adapter-->>Client: GraphSnapshot

    Note over Client,Events: Restore Snapshot
    Client->>Adapter: restoreSnapshot(snapshotId)
    Adapter->>Snapshot: restoreSnapshot(id)
    Snapshot-->>Adapter: StorageSnapshotData
    Adapter->>Storage: clear() → restore nodes/edges
    Adapter->>Storage: rebuild adjacency
    Adapter->>Events: emit(StorageRecovered)
    Adapter-->>Client: GraphSnapshot
```

### Диаграмма 6: Import/Export Flow

```mermaid
graph TB
    subgraph "Export"
        SourceAdapter["Source Storage Adapter"]
        SourceNodes["Nodes Collection"]
        SourceEdges["Edges Collection"]
        
        ExportJSON["JSON Exporter"]
        ExportDOT["DOT Exporter"]
        ExportGraphML["GraphML Exporter"]
        
        ExportedData["Exported String<br/>(JSON / DOT / GraphML)"]
    end
    
    subgraph "Import"
        ImportData["Input String<br/>(JSON / DOT / GraphML)"]
        
        ImportJSON["JSON Parser"]
        ImportDOT["DOT Parser"]
        ImportGraphML["GraphML Parser"]
        
        ParsedNodes["Parsed GraphNode[]"]
        ParsedEdges["Parsed GraphEdge[]"]
        
        TargetAdapter["Target Storage Adapter"]
    end
    
    SourceAdapter --> SourceNodes
    SourceAdapter --> SourceEdges
    SourceNodes --> ExportJSON
    SourceNodes --> ExportDOT
    SourceNodes --> ExportGraphML
    SourceEdges --> ExportJSON
    SourceEdges --> ExportDOT
    SourceEdges --> ExportGraphML
    
    ExportJSON --> ExportedData
    ExportDOT --> ExportedData
    ExportGraphML --> ExportedData
    
    ExportedData -.->|"transfer"| ImportData
    
    ImportData --> ImportJSON
    ImportData --> ImportDOT
    ImportData --> ImportGraphML
    
    ImportJSON --> ParsedNodes
    ImportJSON --> ParsedEdges
    ImportDOT --> ParsedNodes
    ImportDOT --> ParsedEdges
    ImportGraphML --> ParsedNodes
    ImportGraphML --> ParsedEdges
    
    ParsedNodes --> TargetAdapter
    ParsedEdges --> TargetAdapter
    
    style ExportJSON fill:#e3f2fd,stroke:#1565c0
    style ExportDOT fill:#e3f2fd,stroke:#1565c0
    style ExportGraphML fill:#e3f2fd,stroke:#1565c0
    style ImportJSON fill:#fce4ec,stroke:#c62828
    style ImportDOT fill:#fce4ec,stroke:#c62828
    style ImportGraphML fill:#fce4ec,stroke:#c62828
```

## Реализованные компоненты

### 1. GraphStorageProvider Interface

Полный контракт для storage backend'ов. Реализован в `storage/provider/index.ts`.

**Методы:**
- Node CRUD: `createNode`, `updateNode`, `deleteNode`, `getNode`, `hasNode`, `getAllNodes`, `nodeCount`
- Node Batch: `batchCreateNodes`, `batchDeleteNodes`
- Edge CRUD: `createEdge`, `updateEdge`, `deleteEdge`, `getEdge`, `hasEdge`, `getAllEdges`, `edgeCount`, `getEdgesFrom`, `getEdgesTo`
- Edge Batch: `batchCreateEdges`, `batchDeleteEdges`
- Snapshot: `saveSnapshot`, `restoreSnapshot`, `listSnapshots`
- Transaction: `beginTransaction`, `commitTransaction`, `rollbackTransaction`
- Import/Export: `exportGraph`, `importGraph`
- Statistics & Health: `getStatistics`, `health`, `verify`, `rebuildIndexes`
- Cache: `clearCache`, `flushWriteBuffer`
- Lifecycle: `connect`, `disconnect`

### 2. NetworkXStorageAdapter

Полная реализация GraphStorageProvider на in-memory структурах данных.

**Структуры данных:**
- `_nodes: Map<NodeId, GraphNode>` — O(1) lookup
- `_edges: Map<EdgeId, GraphEdge>` — O(1) lookup
- `_adjacencyOut: Map<NodeId, Set<EdgeId>>` — O(k) outgoing
- `_adjacencyIn: Map<NodeId, Set<EdgeId>>` — O(k) incoming

### 3. Storage Indexes

5 типов индексов для O(1) поиска:
- **Identity**: NodeId → GraphNode
- **NodeType**: NodeType → Set<NodeId>
- **RelationshipType**: EdgeType → Set<EdgeId>
- **Metadata**: Source/Tag/Property → Set<NodeId>
- **Labels**: Label → Set<NodeId>

### 4. Persistence Cache

Двухуровневый кэш:
- **Read Cache**: LRU + TTL (настраиваемая емкость и время жизни)
- **Write Buffer**: пакетная буферизация операций записи (порог flush)

### 5. Snapshot Persistence

- `saveSnapshot()`: полное копирование графа
- `restoreSnapshot()`: восстановление + перестроение индексов
- `listSnapshots()`: перечисление с сортировкой по времени
- Настройка лимита хранения (maxSnapshots)

### 6. Transactions

ACID-подобные транзакции:
- `begin()`: снимок текущего состояния
- `commit()`: финализация изменений
- `rollback()`: восстановление из снимка + перестроение индексов
- Поддержка вложенных транзакций (savepoints)

### 7. Import/Export

Три формата:
- **JSON**: полная сериализация графа (round-trip)
- **DOT**: Graphviz для визуализации
- **GraphML**: XML-based interchange

Стратегии импорта: `replace`, `merge`, `skip_existing`

### 8. Migration Layer

- `StorageMigration` интерфейс для миграций между backend'ами
- `GenericJSONMigration`: универсальная JSON-миграция
- `MigrationRegistry`: реестр доступных миграций
- Путь миграции: NetworkX → Neo4j → Memgraph

### 9. Statistics

Полная статистика хранилища:
- Node/Edge counts
- Read/Write operations
- Cache hit rate
- Memory usage
- Index sizes
- Active transactions
- Snapshot count
- Uptime

### 10. Health Check

- `health()`: проверка соединения + консистентность индексов
- `verify()`: глубокая проверка целостности (edges → nodes, adjacency)
- `rebuildIndexes()`: полное перестроение индексов

### 11. Events

5 типов событий:
- `StorageConnected`
- `StorageDisconnected`
- `StorageSnapshotCreated`
- `StorageRecovered`
- `StorageCompacted`

Event Bus с subscribe/unsubscribe.

## Производительность (Benchmarks)

| Операция | 10K nodes | 100K nodes |
|----------|-----------|------------|
| Insert | ~1.1ms (9.1M ops/s) | ~1185ms (84K ops/s) |
| Update (1K) | ~2ms | ~12ms (80K ops/s) |
| Lookup (1K) | ~1ms | ~3.5ms (283K ops/s) |
| Adjacency (100) | ~0.3ms | ~0.3ms (348K ops/s) |
| Snapshot create | ~1ms | ~11ms |
| Snapshot restore | ~5ms | ~571ms |
| JSON export | ~2ms | ~192ms |
| Memory (nodes+edges) | ~7MB | ~148MB |

## Тестовое покрытие

**104 теста**, все проходят:
- Lifecycle (6): connect, disconnect, events, idempotency, errors
- Node CRUD (11): create, get, update, delete, has, getAll, count
- Edge CRUD (11): create, get, update, delete, has, from, to, count
- Batch (6): batchCreateNodes, batchDeleteNodes, batchCreateEdges, batchDeleteEdges, partial failures
- Transactions (6): begin/commit, rollback, nested, errors
- Snapshots (6): save, restore, list, events, errors
- Import/Export (6): JSON, DOT, GraphML, round-trip, filter, errors
- Statistics (5): counts, operations, memory, uptime, indexes
- Health (5): healthy, unhealthy, verify, rebuild, clear
- Cache (6): read, write, TTL, eviction, hit rate, invalidation
- Indexes (7): type, relationship, label, metadata, deindex, stats, memory
- Snapshot Manager (5): save, restore, list, maxSnapshots, errors
- Transaction Manager (4): begin, commit, rollback, changeSet
- Statistics Collector (2): tracking, reset
- Events (3): emit, unsubscribe, all types
- Migration (3): register, default, execute
- Import/Export Module (3): JSON, DOT, GraphML
- Cache Manager (2): manage, invalidate
- Cache Integration (4): read, update, clear, hitRate
- Edge Cases (5): empty, clear, health, identity, config

## Структура файлов

```
src/domain/knowledge-graph/storage/
├── index.ts                          # Public API (93 exports)
├── types/index.ts                    # All type definitions
├── provider/index.ts                 # GraphStorageProvider interface
├── adapter/index.ts                  # NetworkXStorageAdapter (main impl)
├── indexes/index.ts                  # 5 storage index types + IndexManager
├── cache/index.ts                    # Read Cache (LRU+TTL) + Write Buffer
├── snapshot/index.ts                 # Snapshot persistence
├── transaction/index.ts              # Transaction manager + ChangeSet
├── import-export/index.ts            # JSON, DOT, GraphML
├── migration/index.ts                # StorageMigration + Registry
├── statistics/index.ts               # Statistics collector
├── events/index.ts                   # 5 event types + EventBus
├── __tests__/
│   └── storage-adapter.test.ts       # 104 tests
└── __benchmarks__/
    └── storage-benchmark.test.ts     # 16 benchmarks (10K, 100K)
```

## Ограничения

1. **NetworkX — in-memory only**: Нет персистентности на диск
2. **Single-threaded**: Нет конкурентного доступа
3. **Snapshot = полный копия**: O(n+m) для создания/восстановления
4. **Batch = sequential**: Нет параллельной обработки внутри batch
5. **Транзакции = copy-on-write**: Полный снимок при begin()

## Рекомендации для INT-002 — Security Intelligence Correlation Engine

1. Использовать `NetworkXStorageAdapter` как storage backend через DI
2. Корреляция требует частых path queries — рассмотреть кэширование результатов Traversal
3. Для production нагрузок (>100K nodes) рассмотреть Neo4j backend
4. Использовать Migration Layer для прозрачной миграции на Neo4j
5. Event Bus позволяет интегрировать Correlation Engine как подписчика
6. Health Check + Statistics обеспечивают мониторинг в production
