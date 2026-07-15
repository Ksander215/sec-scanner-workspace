# Changelog — Security Intelligence Platform

Все значимые изменения в документации рабочего пространства.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

## [0.3.0] - 2026-07-15

### Added

- **KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md** — полный архитектурный RFC Knowledge Graph Platform
  - Executive Summary, Problem Statement, Goals (9), Non Goals (7)
  - Existing Architecture (5 ключевых ограничений)
  - Proposed Graph Architecture (3 слоя: Ingestion, Graph Platform, Storage)
  - Graph Domain Model (16 сущностей: GraphNode, GraphEdge, NodeIdentity, NodeMetadata, Relationship, RelationshipType, Traversal, Subgraph, GraphSnapshot, GraphVersion, GraphIndex, Query, GraphTransaction, GraphEvent)
  - Node Types (18 типов: Application, Host, Endpoint, API, Technology, Finding, Evidence, Identity, Secret, Credential, AttackStep, Recommendation, Asset, CloudResource, Service, Container, Repository, Component)
  - Edge Types (14 типов: USES, OWNS, CALLS, DEPENDS_ON, HOSTS, CONNECTED_TO, LEADS_TO, DISCOVERED_BY, EXPOSES, AUTHENTICATES, TRUSTS, CONTAINS, RELATED_TO, MITIGATED_BY)
  - Graph Storage Model (Node Store, Edge Store, Adjacency List, Reverse Index, Property Index, Temporal Index, Confidence Index, Provenance Index)
  - Traversal Engine (7 алгоритмов: BFS, DFS, Bidirectional Search, Shortest Path, Multi Path, Cycle Detection, Reachability с определением сложности)
  - Versioning (Snapshot, Delta, Rollback, Replay, Incremental Update, Merge/Conflict Resolution)
  - Graph Query API (11 методов: createNode, updateNode, removeNode, createEdge, removeEdge, query, traverse, shortestPath, export, snapshot, rollback)
  - Synchronization (Pipeline->Graph, Graph->Intelligence, Graph->Explainability, Incremental Updates, Event Bus, Snapshot Events)
  - Performance Strategy (4-уровневый Cache, Indexing, Lazy Loading, Graph Partitioning, Memory Limits, Large Graph Strategy)
  - Security (Immutable Graph, Audit Trail, Graph Integrity, Node/Edge Validation, Serialization Safety)
  - Failure Recovery (8 сценариев, 5 гарантий)
  - Future Extensions (8 расширений, 6 extension points)
  - 10 Mermaid-диаграмм (Overall Architecture, Component Diagram, Node Relationship, Traversal, Versioning Flow, Synchronization Flow, Query Flow Sequence, Storage Layout, Event Flow, Graph Lifecycle)
  - 8 ADR (ADR-KG-001..008)
  - 8 Open Questions

- **KG_ARCHITECTURE_REVIEW_REPORT.md** — отчёт о 5-ролевом архитектурном ревью
  - CTO Review: 3 замечания, 3 риска, 4 рекомендации
  - Principal Graph Engineer Review: 3 замечания, 4 риска, 5 рекомендаций
  - Distributed Systems Architect Review: 3 замечания, 4 риска, 5 рекомендаций
  - Security Architect Review: 3 замечания, 4 риска, 5 рекомендаций
  - Staff Backend Engineer Review: 3 замечания, 4 риска, 6 рекомендаций
  - Итог: APPROVED WITH CONDITIONS

### Updated

- INDEX.md — добавлены KG-001 и KG Review Report в секцию Architecture
- CHANGELOG.md — данный файл

## [0.2.0] - 2026-07-15

### Added

- **RFC-001_SECURITY_INTELLIGENCE_ENGINE.md** — полный архитектурный RFC Security Intelligence Engine
  - Executive Summary, Problem Statement, Goals, Non Goals
  - Proposed Architecture (11 компонентов)
  - Component Overview (Finding Normalizer, Correlator, Identity Resolution, Evidence Aggregator, Risk Engine, Confidence Engine, Attack Path Builder, Recommendation Engine, KG Adapter, Explainability Adapter, Intelligence API)
  - Domain Model (12 сущностей: Finding, Asset, Evidence, Relationship, Risk, AttackPath, Recommendation, KnowledgeNode, KnowledgeEdge, Correlation, Confidence, SecurityStory)
  - Knowledge Graph Model (12 Node Types, 9 Edge Types, правила формирования)
  - Correlation Engine (10 правил корреляции, алгоритм, устранение ложных совпадений)
  - Risk Engine (7 параметров, математическая модель расчёта Risk Score)
  - Attack Path Builder (DFS/BFS алгоритм, приоритизация, альтернативные сценарии)
  - Recommendation Engine (4 типа, генерация, дедупликация, группировка, категоризация)
  - Explainability Contract (принцип, формат ExplainabilityOutput, контракт с EE)
  - Event Model (11 внутренних событий, подписка на Artifact Bus)
  - API Contract (7 публичных методов)
  - Failure Handling (8 сценариев, гарантии)
  - Scalability (горизонтальное масштабирование, инкрементальный анализ)
  - 8 Mermaid-диаграмм
  - 7 ADR (ADR-INT-001..007)

- **RFC_REVIEW_REPORT.md** — отчёт о 4-ролевом архитектурном ревью
  - CTO Review: 3 замечания, 2 риска, 3 рекомендации
  - Principal Engineer Review: 3 замечания, 3 риска, 4 рекомендации
  - Security Architect Review: 3 замечания, 3 риска, 4 рекомендации
  - Staff Backend Engineer Review: 3 замечания, 3 риска, 5 рекомендации
  - Итог: APPROVED WITH CONDITIONS

- **docs/01_architecture/** — новая директория для архитектурных документов

### Updated

- INDEX.md — добавлена секция Architecture с RFC-001 и RFC Review Report
- CHANGELOG.md — данный файл

## [0.1.0] - 2026-07-15

### Added

- **PROJECT_HANDOFF.md** — полный документ передачи контекста проекта (14 разделов)
  - Главная цель проекта
  - Архитектурные принципы (7 принципов)
  - Реализованные компоненты (EPIC-01, TASK-201, TASK-202A-F)
  - Архитектура платформы (схема в Mermaid)
  - Security Knowledge Graph (KG-001)
  - Security Intelligence Engine (EPIC-04 / INT-001)
  - SIE — компонентная архитектура (6 компонентов)
  - Интеллектуальный поток
  - Правила корреляции и Attack Path
  - Ограничения и неизменяемые модули
  - Roadmap
  - Definition of Done
  - Глоссарий
  - ADR шаблоны

- **AI_CONTEXT.md** — быстрый контекст для AI-агента
  - Текущий статус проекта
  - Ключевые архитектурные принципы
  - CTO-указания
  - Неизменяемые модули
  - Текущая задача (EPIC-04)
  - Навигация по документам

- **ENGINEERING_MEMORY.md** — инженерная память проекта
  - Стек технологий
  - Выполненные EPIC и TASK
  - Известные проблемы и решения
  - Соглашения по коду
  - ADR реестр

- **CTO_DECISIONS.md** — реестр ключевых решений CTO
  - #1: AI-Native, но не LLM-зависимый
  - #2: Цепочка ценности Knowledge → Intelligence → Explainability → Action
  - #3: Knowledge Graph — единый источник истины
  - #4: Plugin Architecture для движков
  - #5: Event Driven через Artifact Bus
  - #6: SIE — детерминированный анализ
  - #7: Immutable Domain Models

- **VISION.md** — стратегическое видение продукта
  - Миссия и проблема
  - Семь слоёв ценности
  - Дифференциация от DAST-сканеров
  - Целевая аудитория
  - Метрики успеха

- **PROJECT_HANDOFF.pdf** — PDF-версия документа (22 страницы, Tech Dark тема)
- **PROJECT_HANDOFF.html** — HTML-версия документа (Tech Dark тема)
- **handoff_platform_architecture.svg** — схема архитектуры платформы
- **intelligence_engine.svg** — компонентная архитектура SIE
- **roadmap.svg** — дорожная карта проекта
- **README.md** — описание проекта и навигация
- **INDEX.md** — индекс документов рабочего пространства
- **CHANGELOG.md** — данный файл
