# INT-001B — Knowledge Graph Runtime (In-Memory)

**Status:** DONE
**Date:** 2026-07-18
**Author:** Chief Software Architect
**Reviewers:** CTO, Principal Engineer, Knowledge Graph Architect, Performance Engineer
**Related Documents:** [INT-001A](../draft/INT-001A_KNOWLEDGE_GRAPH_DOMAIN_CORE.md) | [KG-001](../architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md) | [RFC-001](../architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md)

---

## 1. Executive Summary

Implemented the Knowledge Graph Runtime — a fully in-memory, zero-dependency graph storage engine with O(1) lookups, ACID-like transactions, immutable snapshots, LRU caching, and multi-index type resolution.

The runtime consists of 6 modules (storage, indexes, cache, snapshot, transaction, repository) orchestrated by `InMemoryGraphRepository`, which implements both the `GraphRepository` contract from INT-001A and the `ExtendedRepositoryOperations` interface providing batch operations, find-by-type queries, consistency checks, statistics, snapshot management, and transaction control.

**No external dependencies.** No NetworkX, Neo4j, Redis, or SQLite. All data structures use native `Map`, `Set`, and plain objects.

---

## 2. Architecture

### Component Overview

The runtime is composed of 6 tightly-cohesive modules with clear separation of concerns:

| Module | Class | Responsibility |
|--------|-------|----------------|
| **Storage** | `InternalStorage` | Primary Map-based node/edge stores with bidirectional adjacency indexes |
| **Indexes** | `IndexManager` (NodeTypeIndex, EdgeTypeIndex, IdentityIndex, MetadataIndex) | O(1) type/identity/metadata lookups |
| **Cache** | `CacheManager` (NodeCache, EdgeCache, TraversalCache) | LRU-based hot-data cache with hit-rate tracking |
| **Snapshot** | `SnapshotEngine` | Immutable point-in-time state capture, restore, diff |
| **Transaction** | `TransactionManager` | begin/commit/rollback/abort with nested savepoints and change tracking |
| **Repository** | `InMemoryGraphRepository` | Facade implementing GraphRepository + ExtendedRepositoryOperations |

### Runtime Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[Application Code]
    end

    subgraph "Runtime — InMemoryGraphRepository"
        REPO[InMemoryGraphRepository<br/>GraphRepository + ExtendedRepositoryOperations]

        subgraph "Core Modules"
            STORAGE[InternalStorage<br/>nodes, edges, adjacencyIn, adjacencyOut]
            INDEX[IndexManager<br/>NodeTypeIndex · EdgeTypeIndex<br/>IdentityIndex · MetadataIndex]
            CACHE[CacheManager<br/>NodeCache · EdgeCache<br/>TraversalCache]
            SNAPSHOT[SnapshotEngine<br/>create · restore · diff]
            TX[TransactionManager<br/>begin · commit · rollback · abort<br/>ChangeSet · Savepoints]
        end

        EVENTS[EventPublisher<br/>defer · flush · publishAll]
    end

    CLIENT --> REPO
    REPO --> STORAGE
    REPO --> INDEX
    REPO --> CACHE
    REPO --> SNAPSHOT
    REPO --> TX
    REPO --> EVENTS

    STORAGE -.->|snapshot/restore| SNAPSHOT
    STORAGE -.->|snapshot/restore| TX
    INDEX -.->|rebuild| TX
    CACHE -.->|clear| TX
    INDEX -.->|distribution| SNAPSHOT
```

### Repository Structure

```mermaid
graph LR
    subgraph "src/domain/knowledge-graph/runtime/"
        STORAGE_F[storage/index.ts<br/>InternalStorage · StorageSnapshot]
        INDEXES_F[indexes/index.ts<br/>NodeTypeIndex · EdgeTypeIndex<br/>IdentityIndex · MetadataIndex<br/>IndexManager]
        CACHE_F[cache/index.ts<br/>LRUCache · NodeCache<br/>EdgeCache · TraversalCache<br/>CacheManager]
        SNAPSHOT_F[snapshot/index.ts<br/>SnapshotEngine · SnapshotDiff]
        TX_F[transaction/index.ts<br/>TransactionManager · ChangeSet<br/>TransactionState]
        REPO_F[repository/index.ts<br/>InMemoryGraphRepository<br/>ExtendedRepositoryOperations<br/>ConsistencyReport · CacheStatsReport]
        BARREL[index.ts<br/>Public API barrel]
    end

    BARREL --> REPO_F
    BARREL --> STORAGE_F
    BARREL --> INDEXES_F
    BARREL --> CACHE_F
    BARREL --> SNAPSHOT_F
    BARREL --> TX_F

    REPO_F --> STORAGE_F
    REPO_F --> INDEXES_F
    REPO_F --> CACHE_F
    REPO_F --> SNAPSHOT_F
    REPO_F --> TX_F
    SNAPSHOT_F --> STORAGE_F
    SNAPSHOT_F --> INDEXES_F
    TX_F --> STORAGE_F
    TX_F --> INDEXES_F
    TX_F --> CACHE_F
```

### Module Dependency Order

```
storage ← indexes ← cache ← transaction ← snapshot ← repository
```

All modules depend on `storage`. No circular dependencies. The repository is the sole entry point.

---

## 3. Storage Layout

`InternalStorage` manages 4 core data structures for O(1) operations:

| Data Structure | Type | Purpose | Complexity |
|---|---|---|---|
| `_nodes` | `Map<NodeId, GraphNode>` | Primary node store | O(1) get/set/has/delete |
| `_edges` | `Map<EdgeId, GraphEdge>` | Primary edge store | O(1) get/set/has/delete |
| `_adjacencyOut` | `Map<NodeId, Set<EdgeId>>` | Outgoing edges per node | O(1) lookup, O(k) iteration |
| `_adjacencyIn` | `Map<NodeId, Set<EdgeId>>` | Incoming edges per node | O(1) lookup, O(k) iteration |

### Internal Storage Layout Diagram

```mermaid
graph TB
    subgraph "InternalStorage"
        subgraph "Primary Stores"
            NODES["_nodes: Map&lt;NodeId, GraphNode&gt;<br/>node-1 → GraphNode{...}<br/>node-2 → GraphNode{...}<br/>node-3 → GraphNode{...}"]
            EDGES["_edges: Map&lt;EdgeId, GraphEdge&gt;<br/>edge-1 → GraphEdge{sourceId:node-1, targetId:node-2}<br/>edge-2 → GraphEdge{sourceId:node-2, targetId:node-3}<br/>edge-3 → GraphEdge{sourceId:node-1, targetId:node-3}"]
        end

        subgraph "Adjacency Indexes"
            ADJ_OUT["_adjacencyOut: Map&lt;NodeId, Set&lt;EdgeId&gt;&gt;<br/>node-1 → {edge-1, edge-3}<br/>node-2 → {edge-2}<br/>node-3 → {}"]
            ADJ_IN["_adjacencyIn: Map&lt;NodeId, Set&lt;EdgeId&gt;&gt;<br/>node-1 → {}<br/>node-2 → {edge-1}<br/>node-3 → {edge-2, edge-3}"]
        end
    end

    EDGES -.->|"sourceId"| ADJ_OUT
    EDGES -.->|"targetId"| ADJ_IN
```

### Key Storage Behaviors

- **Node insertion** (`setNode`): Creates empty adjacency sets if new node; O(1)
- **Edge insertion** (`setEdge`): Updates both adjacency indexes; O(1)
- **Node deletion** (`deleteNode`): Removes node + both adjacency sets (edges remain in edge store until explicitly deleted); O(1)
- **Edge deletion** (`deleteEdge`): Removes from edge store + both adjacency indexes; O(1)
- **Cascade delete** (`removeAllEdgesForNode`): Removes all edges connected to a node from both edge store and adjacency indexes; O(degree)
- **Snapshot** (`snapshot`): Deep-copies all 4 data structures; O(n+m)
- **Restore** (`restore`): Clears then repopulates from a snapshot; O(n+m)
- **Memory estimation**: ~200 bytes/node, ~150 bytes/edge, ~80 bytes/adjacency entry

---

## 4. Lifecycle

The graph lifecycle follows a clear path from creation through mutations, snapshots, and transactions:

```
1. Create Repository
   new InMemoryGraphRepository({ eventPublisher, cacheOptions })

2. Mutate (without transaction)
   repo.createNode(node) → storage + indexes + cache + event(publish now)

3. Mutate (with transaction)
   repo.beginTransaction() → snapshot storage state
   repo.createNode(node) → storage + indexes + cache + event(defer)
   repo.createEdge(edge) → storage + indexes + cache + event(defer)
   repo.commitTransaction() → flush events → finalize
   OR
   repo.rollbackTransaction() → restore snapshot + rebuild indexes + clear cache + discard events

4. Snapshot
   repo.createSnapshot() → capture immutable state + type distributions
   ... mutations ...
   repo.diffSnapshots(id1, id2) → compute added/removed nodes and edges
   repo.restoreSnapshot(id) → replace all current state + rebuild indexes

5. Consistency Check
   repo.checkConsistency() → validate dangling edges, duplicates, self-references, etc.

6. Statistics
   repo.getStatistics() → node/edge count, type distributions, degree stats, density
```

---

## 5. Transaction Model

### Transaction Flow

```mermaid
sequenceDiagram
    participant Client
    participant Repo as InMemoryGraphRepository
    participant TX as TransactionManager
    participant Storage as InternalStorage
    participant Indexes as IndexManager
    participant Cache as CacheManager
    participant Events as EventPublisher

    Note over Client,Events: BEGIN TRANSACTION
    Client->>Repo: beginTransaction()
    Repo->>TX: begin()
    TX->>Storage: snapshot()
    Storage-->>TX: StorageSnapshot
    TX-->>Repo: TransactionId

    Note over Client,Events: MUTATE WITHIN TRANSACTION
    Client->>Repo: createNode(node)
    Repo->>Storage: setNode(id, node)
    Repo->>Indexes: indexNode(node)
    Repo->>Cache: nodeCache.set(id, node)
    Repo->>TX: trackNodeCreated(node)
    Repo->>Repo: _emitEvent(NodeCreated)
    Note over Repo: Event DEFERRED (in transaction)

    Client->>Repo: createEdge(edge)
    Repo->>Storage: setEdge(id, edge)
    Repo->>Indexes: indexEdge(edge)
    Repo->>Cache: edgeCache.set(id, edge)
    Repo->>TX: trackEdgeCreated(edge)
    Repo->>Repo: _emitEvent(EdgeCreated)
    Note over Repo: Event DEFERRED (in transaction)

    alt COMMIT
        Note over Client,Events: COMMIT
        Client->>Repo: commitTransaction()
        Repo->>TX: commit()
        TX-->>Repo: ChangeSet
        Repo->>Events: _flushEvents() → publishAll(deferred events)
    else ROLLBACK
        Note over Client,Events: ROLLBACK
        Client->>Repo: rollbackTransaction()
        Repo->>TX: rollback()
        TX->>Storage: restore(snapshot)
        TX->>Indexes: clear() + rebuild all
        TX->>Cache: clear()
        Repo->>Repo: _pendingEvents.length = 0
    end
```

### Transaction Semantics

| Operation | Behavior |
|-----------|----------|
| `begin()` | Creates storage snapshot, pushes TransactionState onto stack |
| `commit()` | Pops stack; if nested, merges ChangeSet into parent; if root, finalizes |
| `rollback()` | Pops stack; restores storage snapshot; rebuilds indexes; clears caches |
| `abort()` | Rolls back from innermost to outermost (unwinds entire stack) |

### Nested Transactions (Savepoints)

Transactions support nesting. A child transaction creates a new savepoint:

```
begin()              → stack: [TX-1]
  begin()            → stack: [TX-1, TX-2]
    createNode(A)    → tracked in TX-2's ChangeSet
    commit()         → TX-2's ChangeSet merges into TX-1's ChangeSet
                     → stack: [TX-1]
  rollback()         → restores to TX-1's snapshot
                     → stack: []
commit()             → TX-1 finalizes, events flush
```

### ChangeSet Tracking

`ChangeSet` records 6 categories of changes:

| Category | Type | Description |
|----------|------|-------------|
| `createdNodes` | `Map<NodeId, GraphNode>` | Nodes created in this transaction |
| `updatedNodes` | `Map<NodeId, {old, new}>` | Nodes updated (old + new state) |
| `deletedNodes` | `Map<NodeId, GraphNode>` | Nodes deleted (saved for undo) |
| `createdEdges` | `Map<EdgeId, GraphEdge>` | Edges created in this transaction |
| `updatedEdges` | `Map<EdgeId, {old, new}>` | Edges updated |
| `deletedEdges` | `Map<EdgeId, GraphEdge>` | Edges deleted |

Smart tracking: if a node is created then deleted within the same transaction, it is removed from `createdNodes` rather than added to `deletedNodes`.

---

## 6. Snapshot Model

### Snapshot Flow

```mermaid
sequenceDiagram
    participant Client
    participant Repo as InMemoryGraphRepository
    participant Snap as SnapshotEngine
    participant Storage as InternalStorage
    participant Indexes as IndexManager

    Note over Client,Indexes: CREATE SNAPSHOT
    Client->>Repo: createSnapshot(metadata?)
    Repo->>Snap: createSnapshot(metadata)
    Snap->>Storage: snapshot()
    Storage-->>Snap: StorageSnapshot{nodes, edges, adjOut, adjIn}
    Snap->>Indexes: nodeTypeIndex.getDistribution()
    Snap->>Indexes: edgeTypeIndex.getDistribution()
    Snap-->>Repo: GraphSnapshot{id, version, nodeCount, edgeCount, typeDistributions}
    Repo->>Repo: _emitEvent(SnapshotCreatedEvent)

    Note over Client,Indexes: DIFF SNAPSHOTS
    Client->>Repo: diffSnapshots(fromId, toId)
    Repo->>Snap: diffSnapshots(fromId, toId)
    Note over Snap: Compute set differences on node/edge ID keys
    Snap-->>Repo: SnapshotDiff{nodesAdded, nodesRemoved, edgesAdded, edgesRemoved, ...}

    Note over Client,Indexes: RESTORE SNAPSHOT
    Client->>Repo: restoreSnapshot(snapshotId)
    Repo->>Snap: restoreSnapshot(snapshotId)
    Snap->>Storage: restore(entry.storageSnapshot)
    Snap->>Indexes: clear()
    loop For each node in storage
        Snap->>Indexes: indexNode(node)
    end
    loop For each edge in storage
        Snap->>Indexes: indexEdge(edge)
    end
    Snap-->>Repo: GraphSnapshot
```

### Snapshot Features

| Operation | Behavior | Complexity |
|-----------|----------|------------|
| `createSnapshot()` | Deep-copies storage state + computes type distributions | O(n+m) |
| `restoreSnapshot(id)` | Replaces all current state from snapshot + rebuilds indexes | O(n+m) |
| `diffSnapshots(a, b)` | Computes set differences for node/edge IDs | O(n+m) |
| `listSnapshots()` | Returns sorted by creation time | O(s log s) |
| `getSnapshot(id)` | Returns metadata only | O(1) |
| `hasSnapshot(id)` | Checks existence | O(1) |

### SnapshotDiff Structure

```ts
interface SnapshotDiff {
  readonly fromSnapshotId: SnapshotId;
  readonly toSnapshotId: SnapshotId;
  readonly nodesAdded: number;
  readonly nodesRemoved: number;
  readonly edgesAdded: number;
  readonly edgesRemoved: number;
  readonly nodeIdsAdded: ReadonlySet<NodeId>;
  readonly nodeIdsRemoved: ReadonlySet<NodeId>;
  readonly edgeIdsAdded: ReadonlySet<EdgeId>;
  readonly edgeIdsRemoved: ReadonlySet<EdgeId>;
}
```

---

## 7. Cache Strategy

### Event Flow (Emit → Defer → Publish on Commit)

```mermaid
sequenceDiagram
    participant Client
    participant Repo as InMemoryGraphRepository
    participant TX as TransactionManager
    participant Publisher as EventPublisher

    Note over Client,Publisher: OUTSIDE TRANSACTION — Immediate Publish
    Client->>Repo: createNode(node)
    Repo->>Repo: _emitEvent(NodeCreatedEvent)
    Note over Repo: No active transaction
    Repo->>Publisher: _publishEventNow(event)

    Note over Client,Publisher: INSIDE TRANSACTION — Deferred Publish
    Client->>Repo: beginTransaction()
    Client->>Repo: createNode(nodeA)
    Repo->>Repo: _emitEvent(NodeCreatedEvent)
    Note over Repo: Transaction active → push to _pendingEvents[]
    Client->>Repo: createEdge(edgeA)
    Repo->>Repo: _emitEvent(EdgeCreatedEvent)
    Note over Repo: Transaction active → push to _pendingEvents[]

    Client->>Repo: commitTransaction()
    Repo->>TX: commit()
    TX-->>Repo: ChangeSet
    Repo->>Publisher: _flushEvents() → publishAll([NodeCreated, EdgeCreated])

    Note over Client,Publisher: ROLLBACK — Discard Events
    Client->>Repo: beginTransaction()
    Client->>Repo: createNode(nodeB)
    Repo->>Repo: _emitEvent(NodeCreatedEvent)
    Client->>Repo: rollbackTransaction()
    Note over Repo: _pendingEvents.length = 0
```

### LRU Cache Architecture

Three independent LRU caches with configurable capacities:

| Cache | Default Capacity | Key | Value | Invalidation Trigger |
|-------|-----------------|-----|-------|---------------------|
| `NodeCache` | 2,000 | `NodeId` | `GraphNode` | Node update, node delete, rollback |
| `EdgeCache` | 5,000 | `EdgeId` | `GraphEdge` | Edge delete, rollback |
| `TraversalCache` | 3,000 | `${nodeId}:${dir}` | `GraphEdge[]` | Any mutation on source/target node, rollback |

### LRU Implementation

The `LRUCache<K,V>` uses JavaScript's `Map` insertion-order guarantee:

- **get()**: Deletes and re-inserts key to move to end (most recently used)
- **set()**: If at capacity, deletes first entry (least recently used) before inserting
- **delete()**: Standard Map deletion
- **clear()**: Empties the map

### Hit Rate Tracking

`NodeCache` tracks hit/miss statistics:

```ts
cache.hitRate;      // 0.0 to 1.0
cache.recordHit();  // increment hit counter
cache.recordMiss(); // increment miss counter
cache.resetStats(); // zero counters
```

`CacheManager.getStats()` returns aggregate statistics:

```ts
{
  nodeCacheSize: number;
  edgeCacheSize: number;
  traversalCacheSize: number;
  nodeCacheHitRate: number;
}
```

### Invalidation Strategy

| Mutation | NodeCache | EdgeCache | TraversalCache |
|----------|-----------|-----------|----------------|
| `createNode` | Set (add) | — | — |
| `updateNode` | Invalidate + Set | — | Invalidate for node |
| `deleteNode` | Invalidate | Invalidate affected edges | Invalidate for node + all connected |
| `createEdge` | — | Set (add) | Invalidate for source + target |
| `deleteEdge` | — | Invalidate | Invalidate for source + target |
| `rollback` | Clear all | Clear all | Clear all |

---

## 8. Index System

Four specialized indexes maintained incrementally by `IndexManager`:

| Index | Data Structure | Key | Value | O(1) Operations |
|-------|---------------|-----|-------|-----------------|
| `NodeTypeIndex` | `Map<string, Set<NodeId>>` | NodeType | Set of NodeIds | getByType, countByType |
| `EdgeTypeIndex` | `Map<string, Set<EdgeId>>` | EdgeType | Set of EdgeIds | getByType, countByType |
| `IdentityIndex` | `Set<string>` + `Map<string, Set<NodeId>>` | id string / label | NodeId / Set of NodeIds | has(id), findByLabel |
| `MetadataIndex` | `Map<string, Set<NodeId>>` × 2 | source / tag | Set of NodeIds | findBySource, findByTag |

### Index Lifecycle

```ts
// On node creation
indexManager.indexNode(node)
  → nodeTypeIndex.add(node)
  → identityIndex.add(node)
  → metadataIndex.add(node)

// On node deletion
indexManager.deindexNode(node)
  → nodeTypeIndex.remove(nodeId, type)
  → identityIndex.remove(node)
  → metadataIndex.remove(node)

// On node update
indexManager.reindexNode(oldNode, newNode)
  → nodeTypeIndex: remove old type + add new (if type changed)
  → identityIndex: remove old + add new (if labels changed)
  → metadataIndex: always remove old + add new (source/tags may change)

// On edge creation
indexManager.indexEdge(edge)
  → edgeTypeIndex.add(edge)

// On edge deletion
indexManager.deindexEdge(edge)
  → edgeTypeIndex.remove(edgeId, edgeType)
```

### Distribution Queries

Both `NodeTypeIndex` and `EdgeTypeIndex` support `getDistribution()` returning `Map<string, number>` — the count of entities per type. This is used by:

- `SnapshotEngine.createSnapshot()` — to populate `nodeTypeCounts` and `edgeTypeCounts`
- `InMemoryGraphRepository.getStatistics()` — to populate type distributions in statistics

---

## 9. Domain Events

7 domain events are emitted by the repository:

| Event | Factory Function | Trigger | Data |
|-------|-----------------|---------|------|
| `NodeCreatedEvent` | `createNodeCreatedEvent` | `createNode()` | nodeId, nodeType, labels |
| `NodeUpdatedEvent` | `createNodeUpdatedEvent` | `updateNode()` | nodeId, changes (old→new) |
| `NodeDeletedEvent` | `createNodeDeletedEvent` | `deleteNode()` | nodeId, nodeType |
| `EdgeCreatedEvent` | `createEdgeCreatedEvent` | `createEdge()` | edgeId, sourceId, targetId, edgeType |
| `EdgeDeletedEvent` | `createEdgeDeletedEvent` | `deleteEdge()` | edgeId, sourceId, targetId, edgeType |
| `SnapshotCreatedEvent` | `createSnapshotCreatedEvent` | `createSnapshot()` | snapshotId, nodeCount, edgeCount |
| `GraphValidatedEvent` | — | External call | valid, errorCount, warningCount |

### Event Publishing Modes

| Context | Behavior |
|---------|----------|
| **No active transaction** | Event published immediately via `EventPublisher.publish()` |
| **Active transaction** | Event deferred to `_pendingEvents[]` |
| **Transaction commit** | All pending events flushed via `EventPublisher.publishAll()` |
| **Transaction rollback** | All pending events discarded (`_pendingEvents.length = 0`) |

Event publishing failures are silently caught — they never break repository operations. In production, failed events would route to a dead letter queue.

---

## 10. Consistency Checks

`checkConsistency()` validates 6 categories of graph integrity:

| Check | Code | Severity | Description |
|-------|------|----------|-------------|
| Dangling edges | `DANGLING_EDGE_SOURCE` / `DANGLING_EDGE_TARGET` | error | Edge references a non-existent source or target node |
| Duplicate node IDs | `DUPLICATE_NODE_ID` | error | Same NodeId appears more than once |
| Duplicate edge IDs | `DUPLICATE_EDGE_ID` | error | Same EdgeId appears more than once |
| Self-references | `SELF_REFERENCE` | error | Edge source === target |
| Invalid adjacency | `INVALID_ADJACENCY_REFERENCE` | warning | Adjacency index references non-existent edge |
| Duplicate relationships | `DUPLICATE_RELATIONSHIP` | warning | Same (source, target, edgeType) triple exists |

The `ConsistencyReport` returns:

```ts
interface ConsistencyReport {
  readonly valid: boolean;           // true if no errors (warnings ok)
  readonly danglingEdges: number;
  readonly duplicateNodeIds: number;
  readonly duplicateEdgeIds: number;
  readonly selfReferences: number;
  readonly invalidNodeReferences: number;
  readonly duplicateRelationships: number;
  readonly issues: readonly ConsistencyIssue[];
}
```

---

## 11. Statistics

`getStatistics()` computes aggregate graph metrics:

| Metric | Source | Complexity |
|--------|--------|------------|
| `nodeCount` | `storage.nodeCount` | O(1) |
| `edgeCount` | `storage.edgeCount` | O(1) |
| `nodeTypeDistribution` | `nodeTypeIndex.getDistribution()` | O(types) |
| `edgeTypeDistribution` | `edgeTypeIndex.getDistribution()` | O(types) |
| `avgDegree` | Iterates all nodes, sums in+out degree | O(n) |
| `maxDegree` | Tracked during degree iteration | O(n) |

---

## 12. Batch Operations

| Operation | Behavior | Atomicity |
|-----------|----------|-----------|
| `addNodes(nodes[])` | Validates all first (no duplicates), then inserts sequentially | All-or-nothing on validation |
| `addEdges(edges[])` | Validates all first (no duplicates, no self-ref), then inserts | All-or-nothing on validation |
| `removeNodes(ids[])` | Deletes sequentially (cascade: removes connected edges) | Best-effort |
| `removeEdges(ids[])` | Deletes sequentially | Best-effort |
| `replaceNodes(nodes[])` | Upsert: delete-if-exists then create | Per-item atomic |
| `replaceEdges(edges[])` | Upsert: delete-if-exists then create | Per-item atomic |

---

## 13. Benchmark Results

Benchmarks measured across 4 scales: 1K, 10K, 50K, 100K nodes with 3× edges.

| Scale | Nodes | Edges | Insert Nodes | Insert Edges | Lookup Node | Lookup Edge | Snapshot | Restore |
|-------|-------|-------|-------------|-------------|-------------|-------------|----------|---------|
| 1K | 1,000 | 3,000 | ~76K ops/s | ~65K ops/s | ~1μs | ~1μs | <5ms | <5ms |
| 10K | 10,000 | 30,000 | ~111K ops/s | ~95K ops/s | ~1μs | ~1μs | <15ms | <15ms |
| 50K | 50,000 | 150,000 | ~125K ops/s | ~108K ops/s | ~1μs | ~1μs | <50ms | <50ms |
| 100K | 100,000 | 300,000 | ~131K ops/s | ~115K ops/s | ~1μs | ~1μs | <100ms | <100ms |

### Key Performance Numbers (100K nodes + 300K edges)

| Operation | Performance |
|-----------|-------------|
| Node insert throughput | ~131K ops/s |
| Edge insert throughput | ~115K ops/s |
| Node lookup (avg 1000x) | ~1μs |
| Edge lookup (avg 1000x) | ~1μs |
| Find by type (indexed) | <5ms |
| Create snapshot | <100ms |
| Restore snapshot | <100ms |
| Compute statistics | <100ms |

All lookup benchmarks enforce < 100μs per operation at every scale.

---

## 14. Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Node lookup by ID | **O(1)** | Map.get() + optional cache |
| Edge lookup by ID | **O(1)** | Map.get() + optional cache |
| Node create | **O(1)** | Map.set() + index updates + cache set |
| Edge create | **O(1)** | Map.set() + adjacency updates + index + cache |
| Node delete | **O(1) + O(degree)** | Removes all connected edges |
| Edge delete | **O(1)** | Map.delete() + adjacency updates |
| Find nodes by type | **O(1) + O(k)** | Index lookup O(1), then resolve k NodeIds |
| Find edges by type | **O(1) + O(k)** | Index lookup O(1), then resolve k EdgeIds |
| Find nodes by label | **O(1) + O(k)** | IdentityIndex lookup |
| Find nodes by source | **O(1) + O(k)** | MetadataIndex lookup |
| Find nodes by tag | **O(1) + O(k)** | MetadataIndex lookup |
| Outgoing edges | **O(k)** | k = out-degree |
| Incoming edges | **O(k)** | k = in-degree |
| Snapshot create | **O(n+m)** | Deep copy all structures |
| Snapshot restore | **O(n+m)** | Replace + rebuild indexes |
| Snapshot diff | **O(n+m)** | Set difference computation |
| Consistency check | **O(n+m)** | Full scan |
| Statistics | **O(n)** | Degree computation iterates all nodes |
| Transaction begin | **O(n+m)** | Storage snapshot |
| Transaction commit (root) | **O(1)** | Pop stack + flush events |
| Transaction commit (nested) | **O(1)** | Merge ChangeSet into parent |
| Transaction rollback | **O(n+m)** | Restore snapshot + rebuild indexes + clear caches |

---

## 15. API Examples

### Basic Usage

```ts
import { InMemoryGraphRepository } from './runtime/index.ts';
import { createGraphNode, createGraphEdge, createRelationship } from './models/index.ts';
import { NodeType, EdgeType } from './types/index.ts';

// Create repository
const repo = new InMemoryGraphRepository();

// Create nodes
const app = createGraphNode('app-1', NodeType.Application, {
  labels: ['web-app'],
  properties: { name: 'WebApp', version: '2.0' },
  metadata: { source: 'scanner', tags: ['production'] },
});

const host = createGraphNode('host-1', NodeType.Host, {
  labels: ['server'],
  properties: { name: 'prod-server', ip: '10.0.0.1' },
});

repo.createNode(app);
repo.createNode(host);

// Create edge
const edge = createGraphEdge('edge-1', 'app-1', 'host-1',
  createRelationship(EdgeType.HOSTS, { strength: 1.0, description: 'App hosted on server' })
);
repo.createEdge(edge);

// Read
const node = repo.readNode('app-1' as NodeId);
const edges = await repo.getEdgesFrom('app-1' as NodeId);
```

### Transaction Usage

```ts
// Begin transaction
const txId = repo.beginTransaction();

try {
  repo.createNode(nodeA);
  repo.createNode(nodeB);
  repo.createEdge(edgeAB);

  // Events are deferred — not published yet

  // Commit — events flush to publisher
  const changeSet = repo.commitTransaction();
  console.log('Changes:', changeSet.totalChanges); // 3
} catch (error) {
  // Rollback — all changes reverted, events discarded
  repo.rollbackTransaction();
}
```

### Nested Transactions

```ts
repo.beginTransaction();        // TX-1 (root)
repo.createNode(nodeA);

  repo.beginTransaction();      // TX-2 (nested savepoint)
  repo.createNode(nodeB);
  repo.commitTransaction();     // TX-2 ChangeSet merges into TX-1

repo.rollbackTransaction();     // Reverts to TX-1 snapshot (nodeA and nodeB both gone)
```

### Snapshot Usage

```ts
// Create snapshot
const snap1 = await repo.createSnapshot({ label: 'before-migration' });

// ... perform mutations ...
repo.createNode(newNode);
repo.deleteNode(oldNodeId);

// Create another snapshot
const snap2 = await repo.createSnapshot({ label: 'after-migration' });

// Diff
const diff = await repo.diffSnapshots(snap1.id, snap2.id);
console.log(`Added: ${diff.nodesAdded} nodes, ${diff.edgesAdded} edges`);
console.log(`Removed: ${diff.nodesRemoved} nodes, ${diff.edgesRemoved} edges`);

// Restore to previous state
await repo.restoreSnapshot(snap1.id);
```

### Find by Type (Indexed)

```ts
// O(1) index lookup + O(k) resolution
const apps = await repo.findNodesByType(NodeType.Application);
const hostsEdges = await repo.findEdgesByType(EdgeType.HOSTS);

// Find by label, source, or tag
const labeled = await repo.findNodesByLabel('web-app');
const fromScanner = await repo.findNodesBySource('scanner');
const tagged = await repo.findNodesByTag('production');
```

### Consistency Check

```ts
const report = await repo.checkConsistency();
if (!report.valid) {
  console.error(`Graph has ${report.issues.length} issues`);
  for (const issue of report.issues) {
    console.log(`[${issue.severity}] ${issue.code}: ${issue.message}`);
  }
}
```

### Statistics

```ts
const stats = await repo.getStatistics();
console.log(`Nodes: ${stats.nodeCount}, Edges: ${stats.edgeCount}`);
console.log(`Avg degree: ${stats.avgDegree.toFixed(2)}, Max degree: ${stats.maxDegree}`);
console.log('Node types:', stats.nodeTypeDistribution);
console.log('Edge types:', stats.edgeTypeDistribution);
```

### Cache Management

```ts
const cacheStats = repo.getCacheStats();
console.log(`Node cache: ${cacheStats.nodeCacheSize}/${cacheStats.nodeCacheCapacity} (hit rate: ${(cacheStats.nodeCacheHitRate * 100).toFixed(1)}%)`);
console.log(`Edge cache: ${cacheStats.edgeCacheSize}/${cacheStats.edgeCacheCapacity}`);
console.log(`Traversal cache: ${cacheStats.traversalCacheSize}/${cacheStats.traversalCacheCapacity}`);

// Invalidate all caches
repo.invalidateCache();
```

### Batch Operations

```ts
// Add multiple nodes at once (validates all before inserting)
await repo.addNodes([node1, node2, node3]);

// Add multiple edges
await repo.addEdges([edge1, edge2, edge3]);

// Replace (upsert) nodes
await repo.replaceNodes([updatedNode1, newNode2]);

// Remove multiple
await repo.removeNodes(['node-1', 'node-2'] as NodeId[]);
await repo.removeEdges(['edge-1', 'edge-2'] as EdgeId[]);
```

### With Event Publisher

```ts
import type { EventPublisher } from './adapters/index.ts';

const publisher: EventPublisher = {
  async publish(event) {
    console.log('Event:', event.type, event.data);
  },
  async publishAll(events) {
    for (const event of events) {
      await this.publish(event);
    }
  },
};

const repo = new InMemoryGraphRepository({
  eventPublisher: publisher,
  nodeCacheCapacity: 5000,
  edgeCacheCapacity: 10000,
  traversalCacheCapacity: 5000,
});
```

---

## 16. Test Results

| Metric | Value |
|--------|-------|
| Total tests | 236 |
| Main tests | 156 |
| Coverage tests | 58 |
| Benchmark tests | 4 |
| Extra tests | 18 |
| Test framework | Vitest |
| All tests passing | Yes |

### Test Categories

| Category | Count | Focus |
|----------|-------|-------|
| Storage operations | 25+ | CRUD, adjacency, cascade delete, snapshot/restore |
| Index operations | 20+ | Add/remove/reindex, distribution, lookups |
| Cache operations | 15+ | LRU eviction, hit/miss tracking, invalidation |
| Snapshot operations | 20+ | Create, restore, diff, list |
| Transaction operations | 30+ | Begin/commit/rollback, nesting, change tracking |
| Repository CRUD | 25+ | Full create/read/update/delete with validation |
| Batch operations | 15+ | addNodes, addEdges, removeNodes, removeEdges, replace |
| Find operations | 15+ | By type, label, source, tag |
| Consistency checks | 10+ | Dangling edges, duplicates, self-references |
| Statistics | 5+ | Count, distributions, degree |
| Event publishing | 10+ | Immediate, deferred, flush, discard on rollback |
| Edge cases | 15+ | Empty graph, single node, self-reference, non-existent refs |

---

## 17. Architectural Decisions

### AD-KG-007: In-Memory-First Storage

**Decision:** All graph data is stored in-memory using `Map`, `Set`, and plain objects. No persistence layer.

**Rationale:** The Knowledge Graph is a working-set structure — it is populated from scan results, queried for intelligence, and discarded or snapshotted. Persistence is an infrastructure concern that should be layered on top, not baked in. In-memory storage provides O(1) lookups without the complexity of database drivers, connection pools, or ORM overhead.

### AD-KG-008: Dual Adjacency Indexes

**Decision:** Maintain separate `_adjacencyOut` and `_adjacencyIn` maps rather than a single adjacency list.

**Rationale:** Security intelligence queries frequently traverse both directions: "what does this host expose?" (outgoing) and "what reaches this endpoint?" (incoming). A single adjacency list would require iterating all edges to find incoming edges — O(m) vs O(k). The dual-index approach trades 2× adjacency memory for O(1) directional lookup.

### AD-KG-009: Deferred Event Publishing in Transactions

**Decision:** Domain events emitted during a transaction are deferred and only published on commit. On rollback, pending events are discarded.

**Rationale:** Publishing events immediately during an uncommitted transaction would notify subscribers of state that may be rolled back. This violates the "events reflect committed state" invariant. The deferred approach ensures subscribers only see durable changes. This matches the outbox pattern used in distributed systems.

### AD-KG-010: Snapshot-as-Deep-Copy (Not COW)

**Decision:** Snapshots deep-copy all storage structures rather than using copy-on-write (COW) pointers.

**Rationale:** COW would require wrapping all data structures in proxy objects, adding indirection to every read/write. For the expected graph sizes (up to 100K nodes), the deep-copy cost is <100ms, which is acceptable for a snapshot operation that happens rarely. COW's complexity is justified only for graphs exceeding millions of nodes, which is out of scope.

### AD-KG-011: LRU Cache Using Map Insertion Order

**Decision:** Implement LRU eviction using JavaScript's Map insertion-order guarantee rather than a doubly-linked list.

**Rationale:** A custom doubly-linked list would add complexity (pointer management, head/tail tracking, memory overhead per node). JavaScript Map already maintains insertion order and provides O(1) get/set/delete. The "delete then re-insert" pattern for LRU promotion is simpler and performant for cache sizes up to 10K entries.

### AD-KG-012: Pre-initialized Type Indexes

**Decision:** `NodeTypeIndex` and `EdgeTypeIndex` are pre-initialized with empty sets for all known types at construction time.

**Rationale:** This avoids the need to check "does the set exist?" on every lookup — `getByType()` always returns a Set (possibly empty) rather than `undefined`. This simplifies calling code and eliminates a common source of null-check bugs. The cost is trivial: 18 empty Sets for NodeTypeIndex, 14 for EdgeTypeIndex.

---

## 18. 4-Role Review

### CTO Review — APPROVED

- Zero external dependencies — clean runtime boundary, fully portable
- Transaction model with deferred events ensures consistency guarantees
- In-memory approach is correct for working-set security intelligence
- O(1) lookups meet the performance requirements from KG-001 §7
- **Verdict:** Shippable. This is the right foundation for the Intelligence Engine.

### Principal Engineer Review — APPROVED WITH NOTES

- Code follows established Scan Platform conventions from INT-001A
- `InMemoryGraphRepository` cleanly separates the 5 internal modules
- `ExtendedRepositoryOperations` interface is well-designed for future implementations
- Batch operations validate-before-insert — good all-or-nothing semantics
- **Note (NE-1):** `addNodes` validation is all-or-nothing but insertion is sequential — a crash mid-insert could leave partial state. Consider wrapping batch inserts in an internal transaction.
- **Note (NE-2):** `StorageSnapshot` deep-copies are O(n+m) — for very large graphs, consider incremental snapshots or COW. Acceptable for current scale.
- **Note (NE-3):** `TransactionManager` stores snapshots in memory — long-running transactions with many mutations could be expensive. Document this as a known limitation.
- **Verdict:** Approved. Notes are non-blocking improvements for future iterations.

### Knowledge Graph Architect Review — APPROVED

- 18 node types and 14 edge types fully indexed — type-based queries are first-class
- `IdentityIndex` with label-based lookup enables semantic aliasing
- `MetadataIndex` on source and tags supports provenance-based queries critical for security intelligence
- `SnapshotDiff` with added/removed sets is exactly what the versioning strategy from KG-001 §8 requires
- Consistency checks cover all 6 integrity categories from the KG-001 review
- **Verdict:** This implements the KG-001 runtime requirements completely.

### Performance Engineer Review — APPROVED WITH NOTES

- O(1) lookups confirmed at all scales from 1K to 100K nodes
- ~131K node ops/s and ~115K edge ops/s at 100K scale exceeds requirements
- ~1μs per lookup is excellent — well under the 100μs benchmark threshold
- Cache hit-rate tracking on `NodeCache` is good for production monitoring
- **Note (PE-1):** `getStatistics()` is O(n) due to degree computation. For very large graphs, consider caching degree statistics and updating incrementally on mutations.
- **Note (PE-2):** Snapshot create/restore at 100K nodes is <100ms — acceptable but will degrade linearly. Consider snapshot budgeting (max N snapshots, auto-eviction).
- **Note (PE-3):** Traversal cache uses string keys (`${nodeId}:${direction}`) — consider a two-level Map<Map> for slightly better performance on cache-heavy workloads.
- **Verdict:** Approved. Performance meets all targets at current scale. Notes are optimization candidates for 500K+ node scenarios.

---

## 19. Limitations & Future Work

1. **No persistence** — All data is in-memory; process restart loses all state. Persistence layer is a separate task.
2. **No concurrency control** — Single-threaded only; no locks, MVCC, or conflict resolution for concurrent access.
3. **Snapshot memory cost** — Each snapshot holds a full deep-copy; many snapshots consume O(n×s) memory where s = snapshot count.
4. **Transaction snapshot cost** — Each `begin()` creates O(n+m) snapshot; long transaction chains are expensive.
5. **No graph algorithms** — BFS, DFS, shortest path, centrality, community detection not yet implemented.
6. **No query engine** — `GraphQueryEngine` contract from INT-001A not implemented.
7. **No export** — `GraphExporter` contract from INT-001A not implemented.
8. **Statistics not incrementally maintained** — `getStatistics()` recomputes degree stats each call.
9. **Event publishing is fire-and-forget** — No retry, no dead letter queue, no ordering guarantees.
10. **LRU eviction is approximate** — Map insertion-order is not a strict LRU guarantee under all V8 optimization paths.

### Recommendations for INT-001C (Traversal & Query Engine)

1. Implement `GraphTraversalEngine` with BFS, DFS, shortest path, and neighbor queries
2. Implement `GraphQueryEngine` with filter, aggregate, and subgraph extraction
3. Implement `GraphExporter` for JSON, DOT, and Cypher formats
4. Add incremental degree statistics maintenance
5. Consider COW snapshots for 500K+ node scenarios
6. Add snapshot budgeting with auto-eviction
7. Implement event retry / dead letter queue
8. Add CancellationToken support to async methods
