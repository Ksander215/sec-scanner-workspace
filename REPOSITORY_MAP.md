# REPOSITORY_MAP.md — Sec Scanner Workspace

> **Дата:** 2026-07-15
> **Версия:** 1.0
> **Тип:** Операционный документ — Визуальная карта репозитория
> **Владелец:** Engineering Manager
> **Статус:** Active
> **Связанные документы:** REPOSITORY_STANDARDS.md, INDEX.md, README.md

---

## 1. Иерархия каталогов

```mermaid
graph TD
    ROOT["sec-scanner-workspace/"]

    ROOT --> CFG["Корневые файлы<br/>(Конфигурация Workspace)"]
    ROOT --> GITHUB[".github/"]
    ROOT --> DOCS["docs/"]

    CFG --> C1["README.md — Entry Point"]
    CFG --> C2["CONTRIBUTING.md — Правила работы"]
    CFG --> C3["REPOSITORY_STANDARDS.md — Стандарты"]
    CFG --> C4["GOVERNANCE.md — Управление"]
    CFG --> C5["DEFINITIONS.md — DoR/DoD"]
    CFG --> C6["LABELS.md — GitHub Labels"]
    CFG --> C7["MILESTONES_GUIDE.md — Milestones"]
    CFG --> C8["GITHUB_PROJECTS.md — Kanban"]
    CFG --> C9["DECISION_LOG.md — Решения Workspace"]
    CFG --> C10["CHANGELOG.md — История Workspace"]
    CFG --> C11["INDEX.md — Навигация"]
    CFG --> C12["REPOSITORY_MAP.md — Эта карта"]
    CFG --> C13["DOCUMENT_LIFECYCLE.md — Lifecycle"]
    CFG --> C14["CODEOWNERS — Review права"]

    GITHUB --> GT[".github/ISSUE_TEMPLATE/"]
    GT --> T1["01_feature_request.md"]
    GT --> T2["02_bug_report.md"]
    GT --> T3["03_architecture_decision.md"]
    GT --> T4["04_product_improvement.md"]
    GT --> T5["05_technical_debt.md"]
    GT --> T6["06_research.md"]
    GITHUB --> PT["PULL_REQUEST_TEMPLATE.md"]

    DOCS --> D00["00_project_os/"]
    DOCS --> D01["01_strategy/"]
    DOCS --> D02["02_architecture/"]
    DOCS --> D03["03_product/"]
    DOCS --> D04["04_execution/"]
    DOCS --> D05["05_growth/"]
    DOCS --> D06["06_decisions/"]
    DOCS --> D07["07_reviews/"]
    DOCS --> D08["08_draft/"]
    DOCS --> DARCH["archive/"]

    style ROOT fill:#1a1a2e,color:#fff,stroke:#e94560
    style CFG fill:#16213e,color:#fff
    style GITHUB fill:#16213e,color:#fff
    style DOCS fill:#16213e,color:#fff
    style D00 fill:#0f3460,color:#fff
    style D01 fill:#0f3460,color:#fff
    style D02 fill:#0f3460,color:#fff
    style D03 fill:#0f3460,color:#fff
    style D04 fill:#0f3460,color:#fff
    style D05 fill:#0f3460,color:#fff
    style D06 fill:#0f3460,color:#fff
    style D07 fill:#0f3460,color:#fff
    style D08 fill:#533483,color:#fff
    style DARCH fill:#333,color:#999
```

---

## 2. Директории docs/ — назначение и содержимое

```mermaid
graph LR
    subgraph "Фундамент"
        D00["00_project_os<br/>Конституция<br/>4 документа"]
    end

    subgraph "Направление"
        D01["01_strategy<br/>Стратегия<br/>4 документа"]
    end

    subgraph "Фундамент"
        D02["02_architecture<br/>Архитектура<br/>6 документов"]
    end

    subgraph "Продукт"
        D03["03_product<br/>Продукт<br/>4 документа"]
    end

    subgraph "Исполнение"
        D04["04_execution<br/>План и статус<br/>7+ документов"]
    end

    subgraph "Измерение"
        D05["05_growth<br/>Метрики<br/>8 документов"]
    end

    subgraph "Память"
        D06["06_decisions<br/>Решения<br/>2 документа"]
    end

    subgraph "Результаты"
        D07["07_reviews<br/>Review артефакты<br/>динамический"]
    end

    D00 -->|"почему и как"| D01
    D01 -->|"что строить"| D02
    D02 -->|"как реализовать"| D03
    D03 -->|"когда и в каком порядке"| D04
    D04 -->|"измеряем"| D05
    D05 -->|"записываем решения"| D06
    D04 -->|"создаём артефакты"| D07
    D05 -->|"создаём артефакты"| D07

    style D00 fill:#e94560,color:#fff
    style D01 fill:#f38181,color:#fff
    style D02 fill:#fce38a,color:#333
    style D03 fill:#eaffd0,color:#333
    style D04 fill:#95e1d3,color:#333
    style D05 fill:#aa96da,color:#fff
    style D06 fill:#fcbad3,color:#333
    style D07 fill:#a8d8ea,color:#333
```

---

## 3. Поток информации при работе с задачей

```mermaid
flowchart TD
    START["Founder задаёт TASK"] --> SPEC["TASK Specification"]
    SPEC --> CONTEXT["Контекстный вход:<br/>PROJECT_OS → TASK spec →<br/>связанные документы"]
    CONTEXT --> DOR{"DoR пройден?<br/>(DEFINITIONS.md)"}
    DOR -- Нет --> SPEC
    DOR -- Да --> PLAN["Планирование:<br/>EXECUTION_BACKLOG →<br/>SPRINT_NN.md"]
    PLAN --> IMPL["Реализация"]
    IMPL --> SELF["Self Review"]
    SELF --> CTO_R["CTO Review"]
    CTO_R --> TEST["Тестирование"]
    TEST --> DOD{"DoD пройден?<br/>(DEFINITIONS.md)"}
    DOD -- Нет --> IMPL
    DOD -- Да --> DOC_UPD["Обновить документы"]
    DOC_UPD --> DEC_LOG["DECISION_LOG<br/>(если решение)"]
    DEC_LOG --> DASH["FOUNDER_DASHBOARD"]
    DASH --> DONE["Done"]

    style START fill:#e94560,color:#fff
    style DONE fill:#0f3460,color:#fff
    style DOR fill:#fbc002,color:#333
    style DOD fill:#fbc002,color:#333
```

---

## 4. Документ → Решение → Стратегия (поток обоснований)

```mermaid
flowchart LR
    subgraph "Стратегия"
        PMF["PMF Blueprint"]
        GATES["Success Gates"]
        NS["North Star"]
    end

    subgraph "Решения"
        DLOG["DECISION_LOG"]
        DFRAME["Decision Framework"]
    end

    subgraph "Исполнение"
        MEP["Master Plan"]
        BACK["Backlog"]
        SPRINT["Sprint"]
    end

    subgraph "Измерение"
        KPI["KPI Catalog"]
        REV["Reviews"]
    end

    PMF -->|"определяет направление"| DLOG
    GATES -->|"контрольные точки"| MEP
    NS -->|"приоритизация"| BACK

    DLOG -->|"обосновывает решения"| MEP
    DFRAME -->|"шаблон решений"| DLOG

    MEP -->|"декомпозиция"| BACK
    BACK -->|"текущий спринт"| SPRINT
    SPRINT -->|"результаты"| REV
    REV -->|"данные"| KPI
    KPI -->|"корректировка"| PMF

    style PMF fill:#e94560,color:#fff
    style GATES fill:#e94560,color:#fff
    style NS fill:#e94560,color:#fff
    style DLOG fill:#aa96da,color:#fff
    style MEP fill:#95e1d3,color:#333
    style KPI fill:#f38181,color:#fff
```

---

## 5. Связи между корневыми файлами

```mermaid
graph TD
    README["README.md<br/>Entry Point"]
    INDEX["INDEX.md<br/>Навигация"]
    STD["REPOSITORY_STANDARDS<br/>Организация"]
    GOV["GOVERNANCE<br/>Управление"]
    CONT["CONTRIBUTING<br/>Как работать"]
    DEF["DEFINITIONS<br/>DoR/DoD"]
    LAB["LABELS<br/>Метки"]
    MIL["MILESTONES_GUIDE<br/>Вехи"]
    PRJ["GITHUB_PROJECTS<br/>Kanban"]
    DL["DECISION_LOG<br/>Решения WS"]
    CL["CHANGELOG<br/>История WS"]
    MAP["REPOSITORY_MAP<br/>Карта"]
    LC["DOCUMENT_LIFECYCLE<br/>Lifecycle"]

    README -->|"Подробнее: структура"| STD
    README -->|"Подробнее: правила"| CONT
    README -->|"Подробнее: управление"| GOV
    README -->|"Навигация по docs"| INDEX

    CONT -->|"Стандарты содержания"| STD
    CONT -->|"Критерии готовности"| DEF
    CONT -->|"Шаблон ADR"| DL

    STD -->|"Жизненный цикл"| LC
    STD -->|"Ответственность"| GOV

    GOV -->|"Классификация документов"| STD
    GOV -->|"Breaking changes"| CONT

    DEF -->|"Полный DoR/DoD задач"| CONT

    PRJ -->|"Приоритеты, типы"| LAB
    MIL -->|"Критерии Gates"| GOV

    CL -->|"История изменений"| DL

    style README fill:#e94560,color:#fff
    style INDEX fill:#e94560,color:#fff
```

---

## 6. Кто где работает (RACI визуально)

```mermaid
graph TD
    subgraph "Engineering Manager"
        EM1["REPOSITORY_STANDARDS"]
        EM2["GOVERNANCE"]
        EM3["DOCUMENT_STANDARDS"]
        EM4["DOCUMENT_AUDIT"]
        EM5["DEFINITIONS"]
        EM6["INDEX.md"]
        EM7["DOCUMENT_LIFECYCLE"]
    end

    subgraph "CTO"
        CTO1["AI_OPERATING_MODEL"]
        CTO2["PLATFORM_API_ARCHITECTURE"]
        CTO3["All architecture docs"]
        CTO4["SPRINT_NN.md"]
        CTO5["EXECUTION_BACKLOG"]
    end

    subgraph "CEO / Founder"
        CEO1["PROJECT_OS"]
        CEO2["PMF Blueprint"]
        CEO3["FOUNDER_DASHBOARD"]
        CEO4["MILESTONES"]
        CEO5["SUCCESS_GATES"]
    end

    subgraph "CPO"
        CPO1["NORTH_STAR_METRIC"]
        CPO2["KPI_CATALOG"]
        CPO3["All product docs"]
        CPO4["Growth docs"]
        CPO5["Reviews"]
    end

    style EM1 fill:#16213e,color:#fff
    style EM2 fill:#16213e,color:#fff
    style EM3 fill:#16213e,color:#fff
    style EM4 fill:#16213e,color:#fff
    style EM5 fill:#16213e,color:#fff
    style EM6 fill:#16213e,color:#fff
    style EM7 fill:#16213e,color:#fff
    style CTO1 fill:#0f3460,color:#fff
    style CTO2 fill:#0f3460,color:#fff
    style CTO3 fill:#0f3460,color:#fff
    style CTO4 fill:#0f3460,color:#fff
    style CTO5 fill:#0f3460,color:#fff
    style CEO1 fill:#e94560,color:#fff
    style CEO2 fill:#e94560,color:#fff
    style CEO3 fill:#e94560,color:#fff
    style CEO4 fill:#e94560,color:#fff
    style CEO5 fill:#e94560,color:#fff
    style CPO1 fill:#533483,color:#fff
    style CPO2 fill:#533483,color:#fff
    style CPO3 fill:#533483,color:#fff
    style CPO4 fill:#533483,color:#fff
    style CPO5 fill:#533483,color:#fff
```