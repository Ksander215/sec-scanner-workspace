# AIS Capability Interaction Architecture Specification

**Идентификатор задачи:** TASK-ARCH-CAPABILITY-001
**Уровень документа:** Architecture Layer
**Зависимости:** TASK-ARCH-FOUNDATION-001, TASK-ARCH-UX-001, TASK-ARCH-QUALITY-001, Product Layer, все Product Specifications
**Статус:** Draft
**Версия:** 1.1 (cross-audit fixes: §9.4 Discovery→Model flow, §47 Evolution spec, AUDIT-35)

---

## Зависимости от существующих документов

Этот документ определяет архитектурные границы и взаимодействие всех AIS capabilities. Он опирается на:

- **TASK-ARCH-FOUNDATION-001** — центральная архитектурная модель, invariantы, ownership matrix, information flow
- **TASK-ARCH-UX-001** — принципы взаимодействия, feedback architecture, quality signals
- **TASK-ARCH-QUALITY-001** — модель качества, signal lifecycle, root cause classification
- **Product Vision** — миссия и ценность платформы
- **Product Principles** (§3.1–§3.13) — ограничивают архитектурные решения
- **Product Architecture Decisions** (D1–D10) — фиксируют фундаментальные выборы
- **Capability Map** — определяет 11 capabilities и их отношения
- **MVP Definition** — определяет 8 MVP-capabilities и 3 Post-MVP
- **Product Success Metrics** — North Star и primary metrics
- **Product Roadmap** — стадии развития
- **Product Decision Framework** — критерии оценки возможностей
- Все Product Specifications — определяют границы каждой capability

---
## 1. Purpose

Этот документ отвечает на центральный архитектурный вопрос AIS:

> **Как 11 отдельных capabilities совместно формируют единое архитектурное понимание проекта, сохраняя чёткие границы ответственности?**

Проблема, которую решает этот документ: платформа с 11 capabilities может вырождиться в набор независимых инструментов, каждый из которых работает со своими данными, по своим правилам и для своих целей. В таком случае пользователь взаимодействует не с единой системой понимания, а с конгломератом инструментов. Этот исход прямо противоречит Product Vision («каждое архитектурное решение — осознанное») и Product Architecture Decision D8 (Unified Platform).

Документ определяет:

- **Какая capability владеет каким концептом** — чтобы не было двух владельцев одного и того же.
- **Как capabilities взаимодействуют** — чтобы данные текли в правильном направлении без создания циклов.
- **Где проходят непроницаемые границы** — чтобы одна capability не могла незаметно поглотить ответственность другой.
- **Как из 11 capabilities получается единая система** — чтобы пользователь воспринимал AIS как одну платформу, а не как набор инструментов.

Центральный принцип документа:

> **Capabilities collaborate, but ownership remains explicit.**

Capability может использовать результат другой capability, но не получает право владеть её ответственностью. Потребление данных не передаёт ownership.

Документ является архитектурной спецификацией. Он определяет **какие границы существуют и почему**, но не определяет конкретные технологии, форматы данных, API или механизмы интеграции.

---
## 2. Source of Truth Hierarchy

Архитектура AIS строится на чёткой иерархии источников правды. Каждый источник отвечает на свой вопрос и занимает своё место в архитектуре. Эта иерархия является фундаментом всех последующих разделов документа.

### 2.1 Architecture Model — Source of Truth структурных фактов

Architecture Model является единственным источником структурной правды о проекте (Architecture Foundation, §4.4). Model отвечает на вопрос «что существует?» — компоненты, связи, зависимости, слои, границы. Все остальные capabilities строятся поверх Model. Если факт не отражён в Model, он недоступен для Capabilities, которые его не создали.

### 2.2 Architecture Knowledge — Source of Truth накопленного понимания

Architecture Knowledge отвечает на вопрос «что это означает?» — причины решений, контекст компромиссов, подтверждённые и опровергнутые утверждения (Architecture Foundation, §5.2). Knowledge является validated understanding, а не AI output и не пользовательским feedback (Architecture Foundation, §5.5; TASK-ARCH-QUALITY-001, §9). Knowledge зависит от Model, но не изменяет структурные факты Model.

### 2.3 Architecture Evolution — Source of Truth временного развития

Architecture Evolution отвечает на вопрос «как это изменилось?» — история состояний Model, паттерны изменений, тенденции развития (Architecture Foundation, §5.3). Evolution является наблюдательным слоем: он фиксирует, что изменилось, но не объясняет, почему (объяснение — задача Knowledge). Evolution зависит от Model и Knowledge.

### 2.4 Specialized Analysis — результаты специализированных анализов

Security Analysis, Dependency Analysis, Change Impact Assessment и Technical Debt Tracking создают специализированные результаты, привязанные к Model (Architecture Foundation, §7). Каждый результат является enrichment Model, а не параллельным источником правды. Analysis capabilities не владеют структурными фактами — они владеют своими аналитическими выводами.

### 2.5 AI Assistance — интерпретационный слой

AI Assistance интерпретирует накопленное понимание для пользователя (Architecture Foundation, §8). AI не создаёт архитектурные факты, не владеет результатами анализа и не является Source of Truth. AI — потребитель и интерпретатор всех перечисленных выше источников.

### 2.6 Visualization и Reports — представление понимания

Visualization и Report Generation являются pure projections (Architecture Foundation, §10). Они читают Model, Analysis, Knowledge и представляют их пользователю. Они не создают, не изменяют и не владеют архитектурным содержанием. Reports являются point-in-time snapshots, не Source of Truth.

### 2.7 Quality Architecture — сигналы качества и улучшения

Quality Architecture собирает и интерпретирует quality signals (TASK-ARCH-QUALITY-001). Quality не является Source of Truth архитектурного содержания — он является сигналом о качестве существующих источников. Quality может указывать на проблемы в Model, Knowledge или Analysis, но не заменяет их.

### 2.8 Правило

Ни одна capability в этом документе не создаёт новый Source of Truth. Все capabilities работают в рамках иерархии, определённой выше, или создают specialised outputs, привязанные к существующим Source of Truth.

---
## 3. Capability Inventory

AIS содержит 11 capabilities, определённых в Capability Map (Product Layer). Этот документ верифицирует состав capabilities против Capability Map.

### 3.1 Список capabilities

| # | Capability | MVP Status | Архитектурная роль |
|---|-----------|-----------|-------------------|
| 1 | Project Discovery | MVP | Входной процесс: артефакты → данные для Model |
| 2 | Architecture Modeling | MVP | Центральная сущность: Source of Truth структурных фактов |
| 3 | Security Analysis | MVP | Enrichment: security findings, привязанные к Model |
| 4 | Dependency Analysis | MVP | Enrichment: dependency graph и problematic patterns |
| 5 | Change Impact Assessment | Post-MVP | Enrichment: оценка последствий изменений (требует Evolution) |
| 6 | Knowledge Persistence | Post-MVP | Хранение и эволюция накопленного понимания |
| 7 | Technical Debt Tracking | Post-MVP | Enrichment: observations о техническом долге |
| 8 | AI Assistance | MVP | Интерпретационный слой: вопросы → объяснимые ответы |
| 9 | Report Generation | MVP | Pure projection: point-in-time snapshots |
| 10 | Visualization | MVP | Pure projection: интерактивное представление Model |
| 11 | Organization Adaptation | MVP | Cross-cutting context: организационный контекст |

### 3.2 Верификация

Список полностью соответствует Capability Map (§1, §2). Количество capabilities — 11. Названия совпадают. MVP boundary (8 capabilities) соответствует Capability Map (§5) и MVP Definition.

### 3.3 Discrepancy

Change Impact Assessment Specification указывает, что базовая версия CIA доступна в MVP. Однако Capability Map (§5) и MVP Definition однозначно относят CIA к Post-MVP. Архитектурным source of truth для MVP boundary является Capability Map и MVP Definition, подтверждённые после Product Layer Stabilization. Данная discrepancy зафиксирована; этот документ следует authoritative MVP boundary (8 capabilities). Базовые элементы impact assessment (определение затронутых компонентов через dependency context) доступны в MVP через Dependency Analysis и AI Assistance, но полноценная capability CIA — Post-MVP.

---
## 4. Capability Definitions

Для каждой capability определяется: основная ответственность, входы, выходы, владеемые концепты, потребляемые концепты, upstream зависимости, downstream потребители, человеческая ценность, MVP статус и явные non-responsibilities.

### 4.1 Project Discovery

**Responsibility:** Автоматическое обнаружение структуры подключаемого проекта и преобразование артефактов в данные для Architecture Model. Discovery является transit process: принимает артефакты, производит данные, не сохраняет промежуточное состояние (Architecture Foundation, §6).

**Input:** Проектные артефакты (файлы, конфигурации, манифесты, репозитории).

**Output:** Структурированные данные о компонентах, связях, точках входа, технологическом контексте и областях неопределённости. Эти данные являются входом для Architecture Modeling.

**Owned concepts:** Первичное обнаружение компонентов, связей и технологического контекста проекта.

**Consumed concepts:** Проектные артефакты (внешние по отношению к AIS).

**Upstream dependencies:** Нет — Discovery является входной точкой цепочки.

**Downstream consumers:** Architecture Modeling (основной). Косвенно — все остальные capabilities через Model.

**Human value:** Пользователь подключает проект и получает первичное архитектурное понимание без ручной настройки (Product Principles, §3.13 — Minimal Assumptions).

**MVP status:** MVP.

**Explicit non-responsibilities:** Не выполняет security analysis, dependency analysis или architecture modeling. Не создаёт отдельную модель. Не требует ручной конфигурации. Не гарантирует полноту обнаружения.

### 4.2 Architecture Modeling

**Responsibility:** Построение и поддержание целостной архитектурной модели проекта — единого Source of Truth структурных фактов (Architecture Foundation, §4.4). Model агрегирует данные от Discovery и enrichment от Analysis capabilities.

**Input:** Данные от Discovery, enrichment от Analysis capabilities, organizational context от OA.

**Output:** Architecture Model — структурированное представление компонентов, связей, зависимостей, слоёв, границ и привязанных результатов анализа.

**Owned concepts:** Структурные факты о проекте (компоненты, связи, слои, границы). Architecture Model как единый Source of Truth.

**Consumed concepts:** Данные Discovery (через enrichment), analysis results (через annotation binding).

**Upstream dependencies:** Project Discovery (основной). Организационный контекст от OA.

**Downstream consumers:** Все capabilities — Model является центральным узлом звёздной топологии (Architecture Foundation, §2.4).

**Human value:** Единая точка доступа к структурному пониманию проекта. Без Model все остальные capabilities работают вслепую.

**MVP status:** MVP.

**Explicit non-responsibilities:** Не интерпретирует факты (это Knowledge). Не анализирует безопасность (это Security Analysis). Не объясняет (это AI). Не хранит историю (это Evolution).

### 4.3 Security Analysis

**Responsibility:** Систематическое выявление уязвимостей и оценка рисков безопасности с привязкой к Architecture Model. Создаёт contextualized understanding of real risk, а не просто список уязвимостей (Security Analysis Specification).

**Input:** Architecture Model, Dependency Analysis (для оценки поверхности атаки), Organization Adaptation (для контекста приоритетов).

**Output:** Security Findings, привязанные к компонентам Model — включая risk assessments, attack paths, consequences, business impact и explainable recommendations.

**Owned concepts:** Security Findings, risk assessments, attack paths, security recommendations.

**Consumed concepts:** Architecture Model (структурный контекст), Dependency Analysis (dependency context), Organization Adaptation (organizational security context).

**Upstream dependencies:** Architecture Modeling (основной), Dependency Analysis (contextual), Organization Adaptation (contextual).

**Downstream consumers:** AI Assistance (интерпретация), Visualization (представление), Report Generation (доставка), Knowledge (накопление security understanding).

**Human value:** Security Engineer получает не список уязвимостей, а понимание реальных рисков в контексте архитектуры.

**MVP status:** MVP.

**Explicit non-responsibilities:** Не заменяет Architecture Model. Не является независимым продуктом. Не выполняет автоматическое исправление кода. Не гарантирует безопасность.

### 4.4 Dependency Analysis

**Responsibility:** Построение полного графа зависимостей проекта и выявление проблемных паттернов — циклических, избыточных и рискованных связей. Объясняет, *почему* зависимость существует и *каковы её последствия* (Dependency Analysis Specification).

**Input:** Architecture Model, Organization Adaptation.

**Output:** Полный граф зависимостей с классификацией (direct, indirect, transitive, runtime, build-time), criticality assessments и problematic patterns.

**Owned concepts:** Dependency graph, dependency classifications, dependency criticality, transitive chains.

**Consumed concepts:** Architecture Model (компоненты и связи как основа графа), Organization Adaptation (context для оценки).

**Upstream dependencies:** Architecture Modeling (основной), Organization Adaptation (contextual).

**Downstream consumers:** Security Analysis (поверхность атаки), Change Impact Assessment (цепочки влияния), AI Assistance (интерпретация), Visualization (представление), Technical Debt Tracking (problematic dependencies как debt).

**Human value:** Разработчик понимает, какие зависимости критичны, какие цикличны и какие создают скрытые риски.

**MVP status:** MVP.

**Explicit non-responsibilities:** Не является package manager. Не заменяет Architecture Model. Не выполняет автоматическое обновление или удаление зависимостей. Не является vulnerability scanner.

### 4.5 Change Impact Assessment

**Responsibility:** Оценка последствий планируемых изменений до их применения — какие компоненты затронуты, какие риски возникают, что может регрессировать. Оценивает 6 impact dimensions: Structural, Dependency, Behavioral, Security, Knowledge, Evolution (CIA Specification).

**Input:** Architecture Model, Architecture Knowledge, Architecture Evolution, Dependency Analysis, Security Analysis, Organization Adaptation.

**Output:** Impact assessments с explainable reasoning chains и uncertainty-aware judgments.

**Owned concepts:** Impact assessments (6 dimensions), impact vs dependency distinction, uncertainty-aware judgments.

**Consumed concepts:** Model (structural context), Knowledge (почему зависимости существуют), Evolution (исторические паттерны), Dependency Analysis (граф), Security Analysis (security dimension).

**Upstream dependencies:** Architecture Modeling, Knowledge Persistence, Architecture Evolution, Dependency Analysis, Security Analysis, Organization Adaptation.

**Downstream consumers:** AI Assistance (интерпретация), Technical Debt Tracking (изменения как source debt), Knowledge (validation loop).

**Human value:** Разработчик видит последствия изменения до его применения, что позволяет предотвратить регрессии.

**MVP status:** Post-MVP (требует Evolution и накопленной истории). Базовые элементы (затронутые компоненты через dependency context) доступны через Dependency Analysis и AI Assistance в MVP.

**Explicit non-responsibilities:** Не является dependency list. Не предсказывает поведение системы. Не является рекомендацией (assessment precedes recommendation). Не гарантирует отсутствие регрессий.

### 4.6 Knowledge Persistence

**Responsibility:** Сохранение и накопление архитектурных знаний — состояний Model, причин решений, контекста проблем, подтверждённых и опровергнутых утверждений. Knowledge Persistence является механизмом, через который Knowledge переживает сессии (Architecture Knowledge Specification, §5.9).

**Input:** Architecture Model states, validated Knowledge (от AI → user validation), analysis results.

**Output:** История состояний Model, накопленный Knowledge с сохранением предыдущих состояний (Knowledge never lost — Product Principles, §3.4).

**Owned concepts:** History of Model states, persistent Knowledge storage, Knowledge evolution trace.

**Consumed concepts:** Architecture Model (состояния для сохранения), AI output (после валидации — становится Knowledge).

**Upstream dependencies:** Architecture Modeling (Model states), AI Assistance (validated output).

**Downstream consumers:** Change Impact Assessment (исторические паттерны), Technical Debt Tracking (история долга), AI Assistance (накопленный контекст), Architecture Evolution (наблюдение за изменениями).

**Human value:** Команда не теряет архитектурный контекст при уходе сотрудников. Новые участники получают доступ к истории понимания.

**MVP status:** Post-MVP. В MVP Model сохраняется между сессиями (базовая persistence), но полноценная capability Knowledge Persistence — Stage 2.

**Explicit non-responsibilities:** Не является generic storage. Не хранит AI conversation state. Не хранит quality signals. Не является database abstraction.

### 4.7 Technical Debt Tracking

**Responsibility:** Отслеживание накопления технического долга с привязкой к компонентам Architecture Model и приоритизацией по влиянию на систему. TDT превращает невидимое накопление компромиссов в сознательное понимание ограничений (TDT Specification).

**Input:** Architecture Model, Security Analysis (security debt), Dependency Analysis (dependency debt), Change Impact Assessment (change-related debt), Organization Adaptation (граница между debt и осознанным компромиссом).

**Output:** Debt observations, привязанные к Model, с explainable context (почему долг существует, какой компромисс привёл к нему), lifecycle states и contextual prioritization.

**Owned concepts:** Debt observations (bound to Model), debt lifecycle, debt prioritization context, debt Knowledge.

**Consumed concepts:** Model (привязка долга), Security Analysis (security-related debt), Dependency Analysis (dependency debt), OA (debt vs. compromise boundary).

**Upstream dependencies:** Architecture Modeling, Security Analysis, Dependency Analysis, Change Impact Assessment, Organization Adaptation.

**Downstream consumers:** AI Assistance (интерпретация долга), Report Generation (доставка), Visualization (представление карты долга).

**Human value:** Tech Lead видит карту долга с привязкой к архитектуре и может приоритизировать рефакторинг на основе данных.

**MVP status:** Post-MVP (Stage 2-3). В MVP отдельные проблемы выявляются Security и Dependency Analysis, но системное отслеживание долга — post-MVP.

**Explicit non-responsibilities:** Не создаёт issues или tickets. Не измеряет code quality metrics (cyclomatic complexity и т.д.). Не создаёт отдельную debt model. Не исправляет код. Не заменяет product/team backlogs.

### 4.8 AI Assistance

**Responsibility:** Интерпретация накопленного архитектурного понимания и формирование объяснимых ответов и рекомендаций на вопросы пользователя о конкретном проекте (AI Assistance Specification). AI является terminal consumer в ценностной цепочке.

**Input:** Architecture Model (priority 1), Architecture Knowledge (priority 2), Architecture Evolution (priority 3), Security Analysis results (priority 4), Dependency Analysis results (priority 5), Organization Context (priority 6), User Intent/Question (priority 7), Quality signals (informational).

**Output:** Ephemeral текстовые ответы и рекомендации. Не сохраняются как архитектурные факты.

**Owned concepts:** Интерпретация — AI владеет своим reasoning, но не владеет данными, на которых он основан.

**Consumed concepts:** Model, Knowledge, Evolution, все Analysis results, Organization Context, Quality signals.

**Upstream dependencies:** Все capabilities (как потребитель). Не имеет upstream owners.

**Downstream consumers:** Visualization (опционально), Report Generation (опционально). Пользователь — конечный потребитель.

**Human value:** Разработчик получает ответы на вопросы о проекте в естественной форме, основанные на реальной модели, а не на общих знаниях.

**MVP status:** MVP.

**Explicit non-responsibilities:** Не создаёт архитектурные факты. Не владеет результатами анализа. Не заменяет специализированные analysis capabilities. Не принимает решения за человека (Decision 3). Не создаёт Knowledge автоматически. Не пишет в Model (Architecture Foundation, §8.3).

### 4.9 Report Generation

**Responsibility:** Формирование delivery artifacts (отчётов) из существующего понимания для внешнего потребления (Report Generation Specification). Reports являются point-in-time snapshots.

**Input:** Architecture Model, Analysis results, AI interpretation (для включения в отчёт), Organization Context.

**Output:** Самостоятельные отчёты в форматах для различных аудиторий (технические, управленческие, security).

**Owned concepts:** Format и структура отчётов как delivery artifacts.

**Consumed concepts:** Model, Analysis, AI interpretation, OA context.

**Upstream dependencies:** Architecture Modeling, Analysis capabilities, AI Assistance, Organization Adaptation.

**Downstream consumers:** Пользователь (внешний потребитель).

**Human value:** Tech Lead и CTO получают структурированные отчёты для стейкхолдеров без ручного сбора данных.

**MVP status:** MVP.

**Explicit non-responsibilities:** Не является анализатором. Не создаёт новые данные. Не является Source of Truth. Не обновляется автоматически.

### 4.10 Visualization

**Responsibility:** Интерактивное визуальное представление Architecture Model, результатов анализа и связей между компонентами (Visualization Specification). Visualization является pure projection.

**Input:** Architecture Model, Analysis results, Organization Context (для адаптации отображения).

**Output:** Визуальные представления — графики архитектуры, dependency graphs, attack paths, evolution timelines.

**Owned concepts:** Визуальное представление как форма projection.

**Consumed concepts:** Model, Analysis results, OA context.

**Upstream dependencies:** Architecture Modeling, Analysis capabilities, Organization Adaptation.

**Downstream consumers:** Пользователь.

**Human value:** Пользователь воспринимает архитектуру визуально, что значительно эффективнее текстового описания.

**MVP status:** MVP.

**Explicit non-responsibilities:** Не создаёт архитектурные данные. Не кэширует собственное состояние. Не является Source of Truth. Не модифицирует Model.

### 4.11 Organization Adaptation

**Responsibility:** Настройка интерпретации всех capabilities на контекст конкретной организации — приоритеты, стандарты, допустимые компромиссы (Organization Adaptation Specification). OA является cross-cutting context layer, влияющим на интерпретацию, но не на факты.

**Input:** Организационные данные от пользователя (приоритеты, стандарты, политики, компромиссы).

**Output:** Organizational context, записываемый в Model element (Architecture Foundation, §9.2), влияющий на интерпретацию всех downstream capabilities.

**Owned concepts:** Organizational context data, organizational rules, conscious compromises, conflict visibility.

**Consumed concepts:** Architecture Model (как носитель organizational context element).

**Upstream dependencies:** Architecture Modeling (записывает context в Model element). Пользователь (источник организационных данных).

**Downstream consumers:** Security Analysis, Dependency Analysis, AI Assistance, Change Impact Assessment, Technical Debt Tracking, Visualization, Report Generation (все как потребители контекста).

**Human value:** Рекомендации адаптируются к реальному контексту организации, уменьшая шум от нерелевантных универсальных правил.

**MVP status:** MVP.

**Explicit non-responsibilities:** Не является rules engine. Не принуждает к действиям. Не модифицирует архитектурные факты. Не фильтрует данные (только влияет на интерпретацию). Не является governance platform.

---
## 5. Ownership Model

Архитектура AIS требует точного распределения ответственности: каждый значимый концепт имеет ровно одного владельца. Это правило исключает конфликты авторитета и неопределённость в том, какая capability имеет право изменять, интерпретировать или представлять данный концепт.

### 5.1 Ownership Matrix

| # | Концепт | Владелец | Обоснование |
|---|---------|----------|-------------|
| 1 | Структурные факты (компоненты, связи, слои, границы) | Architecture Modeling | Source of Truth (Architecture Foundation, §4.4) |
| 2 | Security Findings (уязвимости, риски, attack paths) | Security Analysis | Специализированный результат, привязанный к Model (Architecture Foundation, §7) |
| 3 | Dependency Graph (граф, классификации, problematic patterns) | Dependency Analysis | Специализированный результат, привязанный к Model (Architecture Foundation, §7) |
| 4 | Impact Assessments (оценки последствий изменений) | Change Impact Assessment | Специализированный результат, привязанный к Model (Architecture Foundation, §7) |
| 5 | Debt Observations (наблюдения о техническом долге) | Technical Debt Tracking | Специализированный результат, привязанный к Model (Architecture Foundation, §7) |
| 6 | Architecture Knowledge (причины, компромиссы, validated understanding) | Knowledge Persistence | Source of Truth накопленного понимания (Architecture Foundation, §5.2) |
| 7 | Architecture Evolution (история состояний, паттерны изменений) | Architecture Evolution | Source of Truth временного развития (Architecture Foundation, §5.3) |
| 8 | Organizational Context (приоритеты, стандарты, компромиссы) | Organization Adaptation | Cross-cutting context layer (Architecture Foundation, §9) |
| 9 | Интерпретация и рекомендации (ephemeral reasoning) | AI Assistance | Terminal consumer, не Source of Truth (Architecture Foundation, §8) |
| 10 | Визуальное представление | Visualization | Pure projection (Architecture Foundation, §10) |
| 11 | Формат и структура отчётов | Report Generation | Pure projection, point-in-time snapshot (Architecture Foundation, §10) |
| 12 | Quality Signals (сигналы о качестве) | Quality Architecture | Сигналы, не Source of Truth содержания (TASK-ARCH-QUALITY-001) |
| 13 | Первичные данные об артефактах (transit) | Project Discovery | Transit process, не сохраняется (Architecture Foundation, §6) |

### 5.2 Ключевые правила Ownership

**Правило O-1: One Owner per Concept.** Каждый концепт из матрицы имеет ровно одну capability-владельца. Если два capabilities оперируют одним концептом, один из них является владельцем, а второй — потребителем. Потребление не передаёт ownership.

**Правило O-2: Consumption ≠ Ownership.** Capability может читать и интерпретировать концепт, принадлежащий другой capability, но не получает право его изменять. AI Assistance потребляет Security Findings для интерпретации, но не владеет ими и не может их модифицировать. Report Generation потребляет Model для формирования отчёта, но не владеет архитектурными фактами.

**Правило O-3: Model — единственный владелец структурных фактов.** Ни одна capability, кроме Architecture Modeling, не создаёт и не модифицирует структурные факты. Security Analysis привязывает findings к элементам Model, но не создаёт новые компоненты или связи. Dependency Analysis строит граф поверх Model, но не добавляет компоненты.

**Правило O-4: Knowledge — единственный владелец накопленного понимания.** Architecture Knowledge является Source of Truth для причин решений, контекста компромиссов и validated understanding. AI Assistance может производить интерпретации, но они становятся Knowledge только после человеческой валидации. AI output не является Knowledge (Architecture Foundation, §5.5; TASK-ARCH-QUALITY-001, §9).

**Правило O-5: Feedback не mutates Source of Truth.** Пользовательский feedback (TASK-ARCH-UX-001) является сигналом для Quality Architecture. Feedback не модифицирует Model, Knowledge, Evolution или любой другой Source of Truth напрямую. Изменения через feedback проходят через контролируемые процессы.

### 5.3 Implications

Правила O-1–O-5 создают жёсткую структуру ответственности. Никакая capability не может расширить свою юрисдикцию без явного архитектурного решения. Если в будущем потребуется новый концепт, он должен быть добавлен в Ownership Matrix с явно определённым владельцем.

---
## 6. Capability ≠ Module

Критически важное разграничение: capability в AIS — это продукт-архитектурная ответственность, а не технический модуль. Capability определяет **что система делает для пользователя** и **какие концепты она владеет**, а не **как она реализована технически**.

### 6.1 Продуктовая природа capability

Каждая capability из §3.1 определяет продуктовую ответственность: конкретную ценность для конкретного пользователя. Security Analysis — это не класс или сервис, а ответственность за выявление уязвимостей и оценку рисков. Dependency Analysis — это не графовая библиотека, а ответственность за построение полного графа зависимостей и выявление проблемных паттернов.

### 6.2 Что capability НЕ определяет

Capability не определяет:

- Классы или интерфейсы реализации.
- API endpoints или контракты обмена данными.
- Структуры баз данных или схемы хранения.
- Фреймворки или библиотеки.
- Конкретные алгоритмы анализа.

Эти вопросы относятся к техническому проектированию (implementation architecture), которое является отдельным уровнем и выходит за рамки данного документа.

### 6.3 Implications для взаимодействия

Когда данный документ описывает взаимодействие capabilities, он описывает **концептуальный поток данных и ответственности**, а не техническую интеграцию. «Security Analysis потребляет Dependency Analysis» означает, что security findings опираются на dependency graph, а не что один сервис вызывает API другого. Техническая реализация может быть любой — monolith, microservices, shared library — при условии, что концептуальные границы соблюдены.

---
## 7. Dependency Graph

Концептуальный граф зависимостей capabilities показывает, как capabilities взаимодействуют через потоки данных. Граф имеет звёздную топологию с Architecture Model в центре.

### 7.1 Типы зависимостей

Зависимости между capabilities классифицируются по четырём типам:

**Direct dependency.** Capability A непосредственно требует выхода capability B для выполнения своей функции. Например, Security Analysis напрямую зависит от Architecture Modeling — без Model Security не имеет структурного контекста для анализа.

**Contextual dependency.** Capability A использует выход capability B для обогащения контекста, но может функционировать без него. Например, Security Analysis использует Dependency Analysis для расширения поверхности атаки, но базовый security анализ возможен и без полного dependency graph.

**Optional dependency.** Capability A может использовать выход capability B при его наличии. Например, AI Assistance может использовать Evolution для исторического контекста, но основная интерпретация работает и без него.

**Cross-cutting dependency.** Capability A зависит от cross-cutting concern, который не является отдельным capability-output. Organization Adaptation является cross-cutting: он предоставляет контекст множеству capabilities, но не является «выходом» в традиционном смысле.

### 7.2 Звёздная топология

Architecture Model является центральным узлом. Все analysis capabilities читают Model. Все projection capabilities (Visualization, Reports) читают Model и analysis results. AI Assistance читает всё. Organization Adaptation является cross-cutting слоем, влияющим на интерпретацию.

Наглядная структура зависимостей:

- Project Discovery → Architecture Modeling (direct)
- Architecture Modeling → все capabilities (direct — все потребляют Model)
- Dependency Analysis → Security Analysis (contextual)
- Dependency Analysis → Change Impact Assessment (direct)
- Security Analysis → Change Impact Assessment (contextual)
- Security Analysis → Technical Debt Tracking (contextual)
- Organization Adaptation → Security, Dependency, AI, CIA, TDT (cross-cutting)
- Knowledge Persistence → Change Impact Assessment (direct, post-MVP)
- Architecture Evolution → Change Impact Assessment (direct, post-MVP)

### 7.3 Свойства графа

Граф является направленным (dependency direction указывает поток данных). Каждая dependency имеет тип из §7.1. Граф не содержит циклов прямых зависимостей (верифицируется в §8). Cross-cutting dependencies от OA не создают циклов, поскольку OA является контекстным слоем, а не звеном в цепочке данных.

---
## 8. DAG Requirement

Архитектура AIS требует, чтобы концептуальный dependency graph capabilities образовывал Directed Acyclic Graph (DAG). Это требование гарантирует отсутствие неопределённости в порядке обработки и предсказуемость потоков данных.

### 8.1 Верификация: отсутствие прямых циклов

Прямой цикл — это ситуация, когда capability A зависит от B, а B зависит от A. Просмотр dependency graph (§7.2) показывает: ни одна пара capabilities не имеет двусторонней direct dependency. Project Discovery → Architecture Modeling является однонаправленным. Security Analysis потребляет Dependency Analysis, но Dependency Analysis не потребляет Security Analysis. **Вывод: прямых циклов нет.**

### 8.2 Верификация: отсутствие косвенных циклов

Косвенный цикл — это цепочка A → B → C → A. Единственная потенциально циклическая цепочка: AI Assistance → Architecture Knowledge → AI Assistance (AI создаёт интерпретации, которые после валидации становятся Knowledge, а AI потребляет Knowledge). Этот цикл **разорван** механизмом человеческой валидации: AI output не становится Knowledge автоматически (Architecture Foundation, §5.5). Человек выступает gatekeeper. Таким образом, цикл AI ↔ Knowledge является управляемым и не создаёт недетерминированного цикла в DAG.

### 8.3 Верификация: отсутствие скрытых ownership-циклов

Скрытый ownership-цикл возникает, когда две capabilities владеют концептами, которые ссылаются друг на друга, создавая неявную взаимозависимость. Ownership Matrix (§5.1) гарантирует, что каждый концепт имеет одного владельца. Model владеет структурными фактами, Knowledge владеет пониманием. Knowledge ссылается на Model (как на источник фактов), но не владеет его концептами. Model не ссылается на Knowledge. **Вывод: скрытых ownership-циклов нет.**

### 8.4 Верификация: отсутствие семантических циклов

Семантический цикл возникает, когда выход одной capability неявно корректирует вход другой, создавая обратную связь, не отражённую в dependency graph. Потенциальный случай: Quality Architecture обнаруживает проблему в Model, что может привести к коррекции Model. Это **не является циклом**, поскольку Quality не владеет Model и не может его модифицировать. Коррекция Model проходит через контролируемый процесс (человеческое решение), а не через автоматическую мутацию. Quality Architecture указывает, человек решает (TASK-ARCH-QUALITY-001).

### 8.5 Заключение

Концептуальный dependency graph capabilities образует DAG при двух условиях:

1. Human-in-the-loop для перехода AI output → Knowledge (Architecture Foundation, §5.5).
2. Human-in-the-loop для коррекции Model по сигналам Quality (TASK-ARCH-QUALITY-001).

Оба условия уже определены в архитектурных основаниях. DAG-свойство сохраняется.

---
## 9. Discovery → Model Boundary

Граница между Project Discovery и Architecture Modeling является одной из важнейших в архитектуре AIS. Она разделяет transient process и persistent state.

### 9.1 Природа Discovery

Project Discovery является transit process (Architecture Foundation, §6). Он принимает проектные артефакты (файлы, конфигурации, манифесты, репозитории), обрабатывает их и производит структурированные данные. Discovery не сохраняет промежуточное состояние. Его выход существует только для передачи downstream — в Architecture Modeling.

### 9.2 Природа Model

Architecture Modeling является persistent Source of Truth (Architecture Foundation, §4.4). Model хранит структурные факты о проекте, агрегирует enrichment от analysis capabilities и организационный контекст от OA. Model переживает сессии, обновляется и эволюционирует.

### 9.3 Ключевое различие

Discovery — это процесс преобразования артефактов в данные. Model — это хранилище структурированного понимания проекта. Discovery не становится Model: выход Discovery является входом для Model. Данные Discovery проходят трансформацию внутри самого процесса Discovery, и результат непосредственно поступает в Model (Architecture Foundation, §6.1, §6.2). Model не реимплементирует Discovery: если Discovery не обнаружил компонент, Model не может его создать из ниоткуда.

### 9.4 Boundary rules

- Discovery поставляет структурированные данные непосредственно в Architecture Model. Если Discovery обнаруживает 15 компонентов, эти 15 компонентов становятся элементами Architecture Model (Architecture Foundation, §6.2). Данные Discovery не проходят через промежуточное хранилище или отдельный процесс incorporation.
- Architecture Modeling владеет Model и отвечает за её целостность, но не является промежуточным звеном между Discovery и Model — Architecture Modeling и Model являются одним и тем же (Architecture Foundation, §4.4; §14.2: «Является Model»).
- Model не может повторно запустить Discovery для получения данных, которые не были обнаружены изначально. Для этого требуется повторное подключение проекта.
- Discovery не знает о enrichment (security findings, dependency analysis и т.д.). Enrichment привязывается к Model после его создания.
- Model не хранит сырые артефакты. Model хранит структурные факты, извлечённые из артефактов.

### 9.5 Implications

Граница Discovery → Model гарантирует, что Model является единой точкой правды о структуре проекта, а Discovery остаётся чистым процессом преобразования. Повторное discovery не разрушает Model — оно уточняет существующие данные и добавляет новые (Architecture Foundation, §6.2).

---
## 10. Model → Knowledge Boundary

Граница между Architecture Model и Architecture Knowledge разделяет два фундаментально разных типа понимания: структурные факты и накопленное знание.

### 10.1 Model отвечает на «что существует»

Architecture Model является Source of Truth для структурных фактов: компоненты, связи, зависимости, слои, границы. Model описывает *что* существует в проекте, но не объясняет *почему* это так. Model может зафиксировать, что компонент A зависит от компонента B, но не объясняет, почему эта зависимость была введена.

### 10.2 Knowledge отвечает на «что это означает»

Architecture Knowledge является Source of Truth для накопленного понимания: причины архитектурных решений, контекст компромиссов, подтверждённые и опровергнутые утверждения (Architecture Foundation, §5.2). Knowledge добавляет смысл к структурным фактам Model.

### 10.3 Boundary rules

**Правило MK-1: Knowledge не модифицирует структурные факты.** Knowledge может объяснить, почему связь A→B существует, но не может создать, удалить или изменить эту связь. Структурные факты — исключительная юрисдикция Model.

**Правило MK-2: Knowledge зависит от Model.** Knowledge не может существовать в отрыве от Model. Каждое утверждение Knowledge привязано к конкретному элементу или отношению в Model. Без Model Knowledge теряет контекст.

**Правило MK-3: Model не зависит от Knowledge.** Model существует и функционален без единой записи в Knowledge. Model не требует объяснений для корректного представления структуры.

### 10.4 Пример

Компонент «Component A» зависит от компонента «Component B» (структурный факт — Model). Knowledge содержит утверждение: «Зависимость Component A → Component B была введена для решения конкретной задачи, компромисс — конкретное ограничение» (накопленное понимание — Knowledge). Knowledge не создаёт связь Component A → Component B. Knowledge объясняет, почему связь существует и какой компромисс она представляет.

### 10.5 Implications

Граница Model → Knowledge гарантирует, что структурные факты всегда доступны и достоверны, даже если накопленное понимание неполно. Knowledge enriches Model, но не заменяет его. Потеря Knowledge (например, при очистке) разрушает накопленное понимание, но не разрушает структурную модель.

---
## 11. Knowledge → Evolution Boundary

Граница между Architecture Knowledge и Architecture Evolution разделяет понимание «почему?» от наблюдения «как изменилось?». Это различие критично для предотвращения дублирования ответственности.

### 11.1 Knowledge объясняет «почему?»

Knowledge хранит причины архитектурных решений, контекст компромиссов, rationale за выборы. Knowledge отвечает на вопрос: «почему архитектура выглядит именно так?». Knowledge является validated understanding — каждый элемент Knowledge прошёл человеческую валидацию (Architecture Foundation, §5.5).

### 11.2 Evolution наблюдает «как изменилось?»

Architecture Evolution фиксирует изменения состояний Model, паттерны изменений, тенденции развития (Architecture Foundation, §5.3). Evolution является наблюдательным слоем: он фиксирует, *что* изменилось и *когда*, но не объясняет *почему*. Evolution не является вторым хранилищем Knowledge.

### 11.3 Boundary rules

**Правило KE-1: Evolution не дублирует Knowledge.** Evolution может фиксировать, что Model изменился (компонент добавлен, связь удалена), но не объясняет причину изменения. Причина — задача Knowledge.

**Правило KE-2: Knowledge не дублирует Evolution.** Knowledge может ссылаться на изменения («в Sprint 14 была добавлена зависимость»), но не хранит полную историю состояний Model. История — задача Evolution.

**Правило KE-3: Evolution является observational.** Evolution не создаёт, не модифицирует и не интерпретирует. Он наблюдает и фиксирует. Evolution не является аналитическим инструментом — он является хроникой.

### 11.4 Пример

Sprint N: добавлена зависимость Component A → Component B. Evolution фиксирует: «Sprint N, Component A получил новую исходящую связь к Component B». Knowledge содержит: «Зависимость Component A → Component B введена для конкретной задачи, компромисс — конкретное ограничение». Evolution знает, *что* изменилось. Knowledge знает, *почему*.

### 11.5 Implications

Разделение Knowledge и Evolution гарантирует, что система не хранит одну и ту же информацию дважды под разными именами. Это также гарантирует, что observational data (история) отделена от interpretive data (понимание).

---
## 12. Specialized Analysis Boundary

Все четыре analysis capabilities (Security Analysis, Dependency Analysis, Change Impact Assessment, Technical Debt Tracking) следуют единому архитектурному паттерну. Этот паттерн определяет их место в архитектуре AIS.

### 12.1 Единый паттерн

Каждая analysis capability:

1. **Читает Model** — Architecture Model является основным входом для любого анализа.
2. **Анализирует** — применяет специализированную логику к данным Model.
3. **Пишет findings, привязанные к Model** — результаты анализа привязаны к элементам Model (Architecture Foundation, §7).

Этот паттерн гарантирует, что все analysis capabilities являются enrichment Model, а не параллельными источниками правды.

### 12.2 Общие boundary rules

**Правило SA-1: Analysis не создаёт структурные факты.** Security Analysis не создаёт компоненты. Dependency Analysis не добавляет связи. Findings привязываются к существующим элементам Model.

**Правило SA-2: Analysis не модифицирует Model.** Security findings, dependency graphs, impact assessments, debt observations — все привязаны к Model, но не изменяют его структуру.

**Правило SA-3: AI не заменяет ни одну analysis capability.** AI Assistance интерпретирует результаты анализа, но не выполняет анализ. AI не обнаруживает уязвимости, не строит граф зависимостей, не оценивает impact и не отслеживает debt. AI — интерпретатор, не анализатор (Architecture Foundation, §8.3).

**Правило SA-4: Analysis capabilities могут потреблять друг друга.** Security Analysis потребляет Dependency Analysis (поверхность атаки). CIA потребляет Security, Dependency, Knowledge, Evolution. Это допустимо, поскольку каждый потребляет *результаты* другого, а не его *ответственность*.

### 12.3 Implications

Единый паттерн гарантирует предсказуемость: каждый новый analysis capability (если будет добавлен) должен следовать этому паттерну. Любое отклонение является архитектурным решением, требующим явного обоснования.

---
## 13. Security Analysis Boundary

### 13.1 Входы и выходы

Security Analysis потребляет: Architecture Model (структурный контекст — какие компоненты, какие связи, какие границы), Dependency Analysis (поверхность атаки через external dependencies), Organization Adaptation (organizational security context — приоритеты, стандарты, допустимые компромиссы).

Security Analysis производит: Security Findings, привязанные к компонентам Model — risk assessments, attack paths, consequences, business impact, explainable recommendations.

### 13.2 Boundary rules

**Правило SEC-1: AI не обнаруживает уязвимости.** AI Assistance может интерпретировать Security Findings, объяснять их и формулировать рекомендации. Но обнаружение, классификация и оценка уязвимостей — исключительная ответственность Security Analysis. AI не может стать заменой Security Analysis.

**Правило SEC-2: Security не владеет структурными фактами.** Security Findings привязаны к элементам Model, но Security не создаёт компоненты, связи или зависимости. Если Security находит уязвимость в компоненте, которого нет в Model — это сигнал для Discovery/Model, а не для самостоятельного создания.

**Правило SEC-3: Security recommendations не являются приказами.** Security Findings содержат рекомендации, но их выполнение — решение человека. Organization Adaptation может определить, что определённый риск является допустимым компромиссом.

### 13.3 Interaction с Dependency Analysis

Security потребляет Dependency Analysis для оценки поверхности атаки через внешние зависимости (contextual dependency). Это однонаправленная зависимость: Security → Dependency. Dependency Analysis не потребляет Security Findings.

---
## 14. Dependency Analysis Boundary

### 14.1 Входы и выходы

Dependency Analysis потребляет: Architecture Model (компоненты и связи как основа графа), Organization Adaptation (context для оценки критичности).

Dependency Analysis производит: полный граф зависимостей с классификацией (direct, indirect, transitive, runtime, build-time), criticality assessments, problematic patterns (циклические, избыточные, рискованные зависимости).

### 14.2 Boundary rules

**Правило DEP-1: AI не изобретает зависимости.** AI Assistance может интерпретировать dependency graph, объяснять problematic patterns и формулировать рекомендации. Но построение графа, классификация и выявление problematic patterns — исключительная ответственность Dependency Analysis. AI не может стать заменой Dependency Analysis.

**Правило DEP-2: Dependency не владеет компонентами.** Dependency Analysis строит граф поверх Model. Если Dependency обнаруживает зависимость, не отражённую в Model, это сигнал для Model, а не для самостоятельного добавления.

**Правило DEP-3: Dependency graph enrichment, не дубликат.** Зависимости, описанные в Model (как связи между компонентами), обогащаются Dependency Analysis (классификация, criticality, problematic patterns), но не дублируются.

### 14.3 Consumers

Dependency Analysis является одной из наиболее потребляемых capabilities. Его потребители:

- Security Analysis (поверхность атаки) — contextual.
- Change Impact Assessment (цепочки влияния) — direct (post-MVP).
- AI Assistance (интерпретация) — direct.
- Technical Debt Tracking (problematic dependencies как debt) — contextual (post-MVP).

---
## 15. Change Impact Assessment Boundary (Post-MVP)

### 15.1 Входы и выходы

Change Impact Assessment потребляет: Architecture Model (structural context), Architecture Knowledge (почему зависимости существуют), Architecture Evolution (исторические паттерны изменений), Dependency Analysis (граф зависимостей для оценки транзитивного влияния), Security Analysis (security dimension impact), Organization Adaptation (organizational impact context).

CIA производит: Impact assessments по 6 dimension (Structural, Dependency, Behavioral, Security, Knowledge, Evolution) с explainable reasoning chains и uncertainty-aware judgments.

### 15.2 Boundary rules

**Правило CIA-1: AI не оценивает impact.** AI Assistance может интерпретировать Impact Assessment, объяснять reasoning chains и помогать пользователю принять решение. Но оценка impact — исключительная ответственность CIA. AI не может стать заменой CIA.

**Правило CIA-2: CIA не предсказывает поведение.** CIA оценивает *potentially affected components* и *risks*, но не предсказывает фактическое поведение системы после изменения. Предсказание поведения требует runtime data, который выходит за рамки архитектурного анализа.

**Правило CIA-3: Assessment предшествует рекомендации.** CIA производит assessment, а не recommendation. Рекомендации — задача AI Assistance на основе assessment.

### 15.3 Post-MVP зависимость

CIA является Post-MVP capability, поскольку требует накопленной истории (Evolution) и глубокой Knowledge. Базовые элементы impact assessment (определение затронутых компонентов через dependency context) доступны в MVP через Dependency Analysis и AI Assistance, но полноценная capability CIA — Post-MVP.

---
## 16. Technical Debt Tracking Boundary (Post-MVP)

### 16.1 Входы и выходы

Technical Debt Tracking потребляет: Architecture Model (привязка долга к компонентам), Security Analysis (security-related debt), Dependency Analysis (dependency debt — problematic patterns), Change Impact Assessment (change-related debt), Organization Adaptation (граница между debt и осознанным компромиссом).

TDT производит: Debt observations, привязанные к Model, с explainable context (почему долг существует, какой компромисс привёл к нему), lifecycle states и contextual prioritization.

### 16.2 Boundary rules

**Правило TDT-1: AI не закрывает debt автоматически.** AI Assistance может интерпретировать debt observations, объяснять их и формулировать рекомендации по приоритизации. Но закрытие debt, изменение его состояния и приоритизация — решения человека. AI не может стать автоматическим менеджером технического долга.

**Правило TDT-2: TDT не создаёт отдельную debt model.** Debt observations привязаны к элементам Architecture Model. TDT не создаёт параллельную модель проекта — он enriches Model debt-информацией.

**Правило TDT-3: TDT не измеряет code quality.** Cyclomatic complexity, lines of code, duplication metrics — это инструментальные метрики, которые выходят за рамки архитектурного анализа. TDT работает на уровне архитектурных компромиссов, а не кодовых метрик.

**Правило TDT-4: TDT не создаёт tickets.** Debt observation может быть основанием для создания задачи в external system, но это — отдельный процесс, выходящий за рамки capability.

---
## 17. Organization Adaptation Boundary

Organization Adaptation (OA) является уникальной capability в архитектуре AIS: она является cross-cutting context layer, а не звеном в цепочке обработки данных. Это определяет её специфические boundary rules.

### 17.1 Природа OA

OA владеет организационным контекстом: приоритеты организации, стандарты, допустимые компромиссы, governance policies (Architecture Foundation, §9). OA не является rules engine — он не принуждает к действиям и не фильтрует данные. OA влияет на интерпретацию, а не на факты.

### 17.2 Запись в Model

OA записывает организационный контекст как элемент Architecture Model (Architecture Foundation, §9.2). Это единственный способ, которым OA влияет на Model: через добавление context element. OA не модифицирует существующие структурные факты Model.

### 17.3 Boundary rules

**Правило OA-1: OA не является rules engine.** OA предоставляет контекст для интерпретации, но не определяет жёсткие правила поведения. Security Analysis использует OA для приоритизации, но не обязан следовать OA буквально. Если OA определяет, что определённый риск допустим, Security всё равно фиксирует его как finding — но помечает как «acceptable per organizational policy».

**Правило OA-2: OA не фильтрует данные.** OA не скрывает компоненты, связи или findings на основе организационного контекста. Visualization показывает все компоненты, даже если они не соответствуют стандартам OA. Фильтрация — решение пользователя.

**Правило OA-3: Конфликты остаются видимыми.** Если OA определяет стандарт, который противоречит архитектурному решению, зафиксированному в Model, конфликт остаётся видимым. AI может указать на конфликт, но не может его «разрешить» путём скрытия одной из сторон.

**Правило OA-4: OA не является governance platform.** OA адаптирует интерпретацию capabilities к контексту организации. Он не управляет процессами, не создаёт approval workflows и не является заменой governance tools.

### 17.4 Cross-cutting природа

OA влияет на множественные capabilities (Security, Dependency, AI, CIA, TDT, Visualization, Reports), но для каждой из них это contextual dependency. Ни одна capability не ломается при отсутствии OA. OA enriches interpretation, не определяя её.

---
## 18. AI Assistance Position

AI Assistance занимает уникальную позицию в архитектуре AIS: он является terminal consumer и интерпретационным слоем. AI потребляет всё, но не владеет ничем, кроме своего ephemeral reasoning.

### 18.1 AI пишет NOTHING, владеет NOTHING

Это фундаментальный принцип (Architecture Foundation, §8.3). AI Assistance:

- Не создаёт архитектурные факты.
- Не владеет результатами анализа.
- Не создаёт Knowledge автоматически (требуется человеческая валидация — Architecture Foundation, §5.5).
- Не пишет в Model.
- Не модифицирует findings, assessments или observations.
- Не сохраняет своё reasoning как архитектурный артефакт.

Единственное, чем владеет AI — его ephemeral reasoning в рамках одного ответа пользователю. Этот reasoning не сохраняется как Source of Truth.

### 18.2 AI как terminal consumer

AI является терминальным потребителем в ценностной цепочке. Он потребляет:

- Architecture Model (priority 1)
- Architecture Knowledge (priority 2)
- Architecture Evolution (priority 3)
- Security Analysis results (priority 4)
- Dependency Analysis results (priority 5)
- Organization Context (priority 6)
- User Intent/Question (priority 7)
- Quality signals (informational)

AI не является обязательным звеном в цепочке capability-to-capability взаимодействия. Две capabilities могут взаимодействовать напрямую, без участия AI (например, Dependency Analysis → Security Analysis).

### 18.3 Critical: AI не становится центральным владельцем

Существует архитектурный риск: поскольку AI потребляет все capabilities, он может de facto стать центральным владельцем всего понимания. Этот риск прямо запрещён. AI интерпретирует, но не агрегирует в собственное хранилище. AI не является «единым окном», которое заменяет прямые взаимодействия capabilities.

### 18.4 Implications

Позиция AI гарантирует, что:

- Удаление AI из системы не разрушает архитектурные данные.
- AI можно заменить (на другой LLM, на rule-based систему) без изменения ownership model.
- Все capabilities продолжают функционировать без AI.
- Пользователь может напрямую взаимодействовать с Model, Analysis, Knowledge через Visualization и Reports.

---
## 19. AI Dependency Rule

Этот раздел определяет формальное правило, запрещающее антипаттерн «AI как центральный узел».

### 19.1 Запрещённый паттерн

**Запрещено:** «Everything → AI → Everything» — паттерн, при котором все capabilities передают свои данные в AI, а AI перенаправляет их другим capabilities. В таком паттерне AI становится де-факто центральным хранилищем и маршрутизатором, нарушая ownership model и DAG.

### 19.2 Требуемый паттерн

**Требуется:** «Capabilities → Unified Understanding → AI Interpretation» — паттерн, при котором capabilities взаимодействуют напрямую (через Model, через прямое потребление results), формируя единое архитектурное понимание. AI интерпретирует это понимание для пользователя, но не является обязательным посредником для capability-to-capability взаимодействия.

### 19.3 Правило

**Правило AI-DEP-1:** AI не является обязательным звеном для взаимодействия между любыми двумя capabilities. Если capability A производит данные, потребляемые capability B, эти данные текут напрямую (A → B), а не через AI (A → AI → B).

**Правило AI-DEP-2:** AI не агрегирует данные от multiple capabilities в собственное хранилище. AI потребляет данные в момент формирования ответа, не сохраняя их.

### 19.4 Примеры

Корректный поток: Dependency Analysis → Security Analysis (напрямую, для поверхности атаки). AI не участвует.

Корректный поток: Security Analysis → AI Assistance → Пользователь (AI интерпретирует findings для пользователя).

Некорректный поток: Security Analysis → AI → Dependency Analysis (AI перенаправляет security findings к dependency analysis).

---
## 20. Visualization Boundary

### 20.1 Pure projection

Visualization является pure projection (Architecture Foundation, §10). Она читает Architecture Model, analysis results и organizational context, создавая визуальное представление. Visualization не создаёт, не изменяет и не владеет архитектурным содержанием.

### 20.2 Boundary rules

**Правило VIZ-1: Visualization не кэширует собственное состояние.** Каждый рендер читает текущее состояние Model и analysis. Visualization не имеет собственного persistent state. Если Model изменился, следующее визуальное представление отражает это изменение.

**Правило VIZ-2: Visualization не создаёт данные.** Визуальный граф зависимостей — это представление dependency graph (владелец — Dependency Analysis). Attack path diagram — это представление security findings (владелец — Security Analysis). Данные принадлежат их владельцам из Ownership Matrix.

**Правило VIZ-3: Visualization не является Source of Truth.** Если визуальное представление не совпадает с Model (например, из-за задержки обновления), Model является авторитетным источником.

**Правило VIZ-4: OA влияет на отображение, не на данные.** Organization Adaptation может влиять на то, как данные отображаются (например, подсветка приоритетных зон), но не на то, какие данные отображаются.

---
## 21. Report Generation Boundary

### 21.1 Point-in-time snapshot

Report Generation создаёт delivery artifacts (отчёты) из существующего понимания для внешнего потребления (Architecture Foundation, §10). Reports являются point-in-time snapshots: они фиксируют состояние понимания на момент создания и не обновляются автоматически.

### 21.2 Boundary rules

**Правило REP-1: Reports не являются Source of Truth.** Отчёт — это snapshot, а не live data. Если Model или analysis изменились после создания отчёта, отчёт не обновляется. Для актуальных данных — обращение к Source of Truth.

**Правило REP-2: Reports не создают новые данные.** Отчёт может агрегировать, переформулировать и переформатировать данные от Model, Analysis, AI и OA. Но он не создаёт новых архитектурных фактов, findings или assessments.

**Правило REP-3: Reports могут содержать AI interpretation.** Отчёт может включать интерпретацию AI Assistance (например, summary или рекомендации). Эта интерпретация является ephemeral, как и любой AI output.

**Правило REP-4: Ownership данных в отчёте остаётся за source capabilities.** Security findings в отчёте принадлежат Security Analysis. Структурные факты принадлежат Model. Отчёт владеет только форматом и структурой delivery artifact.

---
## 22. Knowledge Persistence Boundary

Knowledge Persistence (Post-MVP) требует явного разделения от смежных концептов, чтобы предотвратить дублирование ответственности.

### 22.1 Явное разделение

**От Model:** Knowledge Persistence не хранит структурные факты. Knowledge хранит понимание *о* структурных фактах Model, но не сами факты. Если Model содержит связь A→B, Knowledge может объяснить, почему она существует. Knowledge не дублирует факт существования связи.

**От Evolution:** Knowledge Persistence не хранит историю состояний Model. Evolution является Source of Truth для хронологии изменений (Architecture Foundation, §5.3). Knowledge может ссылаться на изменения, но не хранит их полную историю.

**От AI state:** Knowledge Persistence не хранит AI conversation state, reasoning chains или ephemeral интерпретации. AI output становится Knowledge только после человеческой валидации (Architecture Foundation, §5.5). Knowledge Persistence хранит validated understanding, а не AI output.

**От Quality signals:** Knowledge Persistence не хранит quality signals (TASK-ARCH-QUALITY-001). Quality signals являются сигналами о качестве, а не архитектурным знанием. Если quality signal приводит к коррекции Knowledge, это проходит через контролируемый процесс.

### 22.2 Boundary rules

**Правило KP-1:** Knowledge Persistence не является generic storage abstraction. Он не является «хранилищем всего, что нужно сохранить». Knowledge Persistence хранит конкретный тип данных: validated architectural understanding.

**Правило KP-2:** Knowledge never lost (Product Principles, §3.4). Knowledge Persistence гарантирует, что validated understanding не теряется между сессиями. Это не означает, что всё сохраняется — только validated understanding.

---
## 23. Quality Architecture Integration

Quality Architecture (TASK-ARCH-QUALITY-001) взаимодействует с capabilities через сигналы качества. Это взаимодействие требует чётких границ, чтобы Quality не стал скрытым владельцем архитектурного содержания.

### 23.1 Quality собирает сигналы

Quality Architecture собирает quality signals от всех точек взаимодействия системы с пользователем и между capabilities. Сигналы классифицируются по root cause (TASK-ARCH-QUALITY-001, §6). Quality не создаёт, не модифицирует и не владеет архитектурным содержанием.

### 23.2 Quality не владеет содержанием

Quality Architecture указывает на проблемы: «Model содержит неполные данные о компоненте X», «Security Finding противоречит organizational policy Y». Но Quality не заменяет Model, Security или OA. Quality является сигналом, а не Source of Truth.

### 23.3 Улучшение через контролируемые процессы

Когда Quality signal указывает на проблему, исправление проходит через контролируемые процессы, а не через автоматическую мутацию:

- Проблема в Model → повторное Discovery или ручная коррекция → человек решает.
- Проблема в Security Finding → пересмотр analysis → человек решает.
- Проблема в OA контексте → коррекция организационных данных → человек решает.

Quality не имеет права изменять любой Source of Truth напрямую.

### 23.4 Boundary rules

**Правило QA-1:** Quality не создаёт ownership dependencies. Quality не является владельцем никаких архитектурных концептов. Quality может указывать на проблемы в любом Source of Truth, но не заменяет его.

**Правило QA-2:** Quality signal → контролируемый процесс → потенциальная коррекция. Автоматическая мутация по quality signal запрещена.

---
## 24. Context Flow

Этот раздел описывает основной поток контекста в архитектуре AIS — от входных артефактов до пользователя и обратно через quality signals.

### 24.1 Основной поток (forward)

1. **Project Artifacts** — файлы, конфигурации, манифесты, репозитории.
2. **Project Discovery** — артефакты преобразуются в структурированные данные.
3. **Architecture Modeling** — данные от Discovery incorporируются в Model. Model становится Source of Truth.
4. **Analysis capabilities** — Security, Dependency (MVP); CIA, TDT (Post-MVP) читают Model и создают findings/assessments.
5. **AI Assistance** — интерпретирует Model, Analysis, Knowledge для формирования ответов.
6. **Пользователь** — получает понимание через AI, Visualization, Reports.
7. **Quality Architecture** — собирает signals от всех точек взаимодействия.

### 24.2 Обратный поток (improvement signals)

Quality signals и пользовательский feedback текут обратно через контролируемые процессы:

- Quality signal о проблеме в Model → повторное Discovery или коррекция.
- Пользовательский feedback о неточности AI → коррекция через improved context.
- Quality signal о неполноте Discovery → повторное подключение проекта.

**Критически:** обратный поток не меняет ownership. Quality signal о проблеме в Security Analysis не делает Quality владельцем security findings. Обратный поток — это сигнал для контролируемого процесса, а не ownership reversal.

### 24.3 Cross-cutting: Organization Adaptation

OA подключается к основному потоку как cross-cutting context: OA данные записываются в Model element (Architecture Foundation, §9.2), после чего все downstream capabilities получают организационный контекст через Model.

---
## 25. Information Flow ≠ Ownership Flow

Это один из самых критичных принципов архитектуры AIS. Поток информации и поток ownership — это разные вещи, и их смешение является источником архитектурных ошибок.

### 25.1 Принцип

Когда capability A передаёт данные capability B, информация течёт от A к B. Но ownership остаётся у A. B получает копию (или ссылку) для потребления, а не право владения.

### 25.2 Примеры

**AI потребляет Security Findings.** Information flow: Security Analysis → AI Assistance. Ownership: Security Findings принадлежат Security Analysis. AI интерпретирует findings, но не владеет ими, не модифицирует их и не может удалить.

**Reports потребляют Model.** Information flow: Architecture Modeling → Report Generation. Ownership: структурные факты принадлежат Model. Report содержит snapshot данных, но Model остаётся Source of Truth.

**CIA потребляет Knowledge.** Information flow: Knowledge Persistence → Change Impact Assessment. Ownership: Knowledge принадлежит Knowledge Persistence. CIA использует понимание для оценки impact, но не становится владельцем этого понимания.

### 25.3 Нарушения принципа

Нарушение этого принципа происходит, когда capability, получившая данные, начинает действовать как владелец: модифицирует их, агрегирует в собственное хранилище, перенаправляет другим capabilities от своего имени. Все такие действия являются антипаттернами (§42).

### 25.4 Implications

Принцип гарантирует, что capabilities можно развивать, заменять и удалять без каскадного разрушения. Если AI Assistance заменяется на другой engine, Security Findings остаются целы — они принадлежат Security Analysis. Если Report Generation удаляется, Model остаётся целым — отчёты не владели его данными.

---
## 26. Capability Contract

Для каждой capability определяется концептуальный контракт. Этот контракт описывает продуктовую ответственность, а не технический API (§6).

### 26.1 Структура контракта

Каждый capability contract содержит:

- **Purpose** — продуктовая цель и ценность для пользователя.
- **Input** — что capability потребляет (концептуально, не технически).
- **Output** — что capability производит.
- **Owner** — capability, владеющая выходом.
- **Consumers** — кто потребляет выход.
- **Dependencies** — от каких capabilities зависит.
- **Non-responsibilities** — что явно не входит в ответственность.

### 26.2 Контракты уже определены

Полные контракты для всех 11 capabilities определены в §4 (Capability Definitions). Каждый subsection §4.x содержит все элементы контракта: Responsibility (Purpose), Input, Output, Owned concepts (Owner), Downstream consumers (Consumers), Upstream dependencies (Dependencies), Explicit non-responsibilities (Non-responsibilities).

### 26.3 Контракт ≠ Technical API

Capability Contract описывает *что* capability делает и *для кого*, а не *как* это реализовано. Контракт не определяет HTTP endpoints, function signatures, event schemas или database schemas. Техническая реализация может изменяться без изменения контракта, и наоборот — контракт может эволюционировать (с расширением non-responsibilities) без изменения реализации.

---
## 27. Capability Interoperability

Этот раздел определяет 7 правил совместной работы capabilities. Эти правила являются архитектурными invariantами.

### 27.1 Правила

**Правило INTEROP-1: Shared Context через Model.** Все capabilities разделяют контекст через Architecture Model. Model является единым «местом встречи» — все читают из него, все привязывают к нему свои результаты. Никакая capability не создаёт параллельный контекст, который должен синхронизироваться с Model.

**Правило INTEROP-2: Explicit Ownership.** Каждое взаимодействие между capabilities основано на явном ownership: кто производит данные, кто их потребляет, кто их владеет. Неявные взаимодействия (через side effects, через общее состояние) запрещены.

**Правило INTEROP-3: Traceability.** Каждое взаимодействие между capabilities должно позволять трассировку: от результата downstream capability обратно к source capability. Security Finding → элемент Model → данные Discovery. Это позволяет понимать происхождение любого вывода.

**Правило INTEROP-4: Stable Semantic Boundaries.** Семантические границы capabilities стабильны. Security Analysis всегда анализирует безопасность. Dependency Analysis всегда анализирует зависимости. Boundary не смещается в зависимости от контекста или настроек OA.

**Правило INTEROP-5: No Duplicated Truth.** Ни один концепт не хранится в двух capabilities как Source of Truth. Если два capabilities нуждаются в одних данных, один из них является владельцем, а второй — потребителем.

**Правило INTEROP-6: No Hidden Dependencies.** Все зависимости между capabilities явно определены в dependency graph (§7). Если capability A требует выхода capability B, это задокументировано. Скрытые зависимости (например, через общие library, через shared configuration) запрещены на архитектурном уровне.

**Правило INTEROP-7: No Implicit Mutation.** Capability A не может неявно модифицировать данные capability B. Если A влияет на B, это происходит через контролируемый процесс с явным намерением.

---
## 28. Forbidden Dependencies

Этот раздел определяет явные запреты на зависимости между capabilities. Каждый запрет имеет архитектурное обоснование.

### 28.1 Список запрещённых зависимостей

**Запрет FD-1: Model → Discovery.** Architecture Model не зависит от Project Discovery для выполнения своих функций. Model может существовать без Discovery (например, при ручном вводе данных). Discovery является upstream, но не обязательным после initial creation.

**Запрет FD-2: Analysis → Discovery.** Ни одна analysis capability не зависит от Project Discovery напрямую. Analysis capabilities работают с Model, а не с сырыми артефактами. Если Model неполон, это проблема Discovery/Model, не analysis.

**Запрет FD-3: Knowledge → AI.** Architecture Knowledge не зависит от AI Assistance. Knowledge формируется через human validation, а не через AI processing. AI может быть инструментом в формировании гипотез, но не является upstream для Knowledge (Architecture Foundation, §5.5).

**Запрет FD-4: Evolution → AI.** Architecture Evolution не зависит от AI Assistance. Evolution наблюдает за изменениями Model, а не за AI reasoning. AI не является upstream для Evolution.

**Запрет FD-5: Quality → любая capability (как dependency).** Quality Architecture не является upstream dependency ни для одной capability. Quality является signalling mechanism, а не источником данных. Capability не «ломается» при отсутствии Quality.

**Запрет FD-6: Visualization → Reports или Reports → Visualization.** Visualization и Reports не зависят друг от друга. Обе являются pure projections от одних и тех же источников. Если одна удалена, другая продолжает функционировать.

**Запрет FD-7: AI → любая capability (как owner).** AI Assistance не является upstream owner ни для одного концепта. AI не пишет в Model, не создаёт findings, не формирует Knowledge автоматически. AI является terminal consumer.

---
## 29. Capability Substitution

Этот раздел отвечает на вопрос: может ли одна capability заменить другую?

### 29.1 Может ли AI заменить любую capability?

**Нет.** AI Assistance является интерпретационным слоем, а не анализатором. AI не может заменить:

- **Security Analysis** — AI интерпретирует findings, но не обнаруживает уязвимости систематически.
- **Dependency Analysis** — AI интерпретирует граф, но не строит его и не классифицирует зависимости.
- **Architecture Modeling** — AI не создаёт и не поддерживает Model.
- **Knowledge Persistence** — AI reasoning не является validated understanding.

Обоснование: Architecture Foundation, §8.3 — AI пишет NOTHING, владеет NOTHING.

### 29.2 Может ли любая capability заменить AI?

**Нет.** Ни одна capability не может заменить AI Assistance:

- **Security Analysis** не интерпретирует findings для пользователя в контексте его вопроса.
- **Dependency Analysis** не объясняет problematic patterns в контексте конкретного проекта.
- **Architecture Modeling** не интерпретирует структурные факты.

Анализ ≠ интерпретация. Model ≠ взаимодействие. Knowledge ≠ рекомендация.

### 29.3 Может ли одна analysis capability заменить другую?

**Нет.** Каждая analysis capability имеет уникальную ответственность (§12). Security Analysis не может заменить Dependency Analysis (разные типы анализа). Dependency Analysis не может заменить CIA (разные цели). Каждая capability владеет своими findings и не может создать findings другой capability.

---
## 30. Capability Composition

Ценность AIS emerges из composition capabilities. Отдельные capabilities предоставляют узкую ценность; их совместная работа создаёт качественно новый уровень понимания.

### 30.1 Принцип

Composition — это концептуальное объединение outputs multiple capabilities для формирования ответа на сложный вопрос пользователя. Composition не создаёт нового Source of Truth — она позволяет AI (или пользователю)комплексно рассматривает данные из multiple sources.

### 30.2 Пример 1: Contextual Risk Understanding

**Вопрос пользователя:** «Насколько критична уязвимость в компоненте X для нашего проекта?»

**Composition:** Dependency Analysis (какие компоненты зависят от X) + Security Analysis (какова уязвимость) + Architecture Knowledge (почему X используется) + Architecture Evolution (как X менялся) + AI Assistance (интерпретация в контексте вопроса).

**Результат:** Пользователь получает не просто описание уязвимости, а контекстуализированное понимание реального риска с учётом архитектурного контекста.

### 30.3 Пример 2: Change Decision Support

**Вопрос пользователя:** «Что будет, если мы заменим компонент X на Y?»

**Composition:** Architecture Model (текущая структура) + Change Impact Assessment (оценка влияния) + Technical Debt Tracking (какой долг это создаст/закроет) + Organization Adaptation (организационный контекст) + AI Assistance (интерпретация для принятия решения).

**Результат:** Пользователь получает оценку последствий изменения с учётом технического долга и организационного контекста.

### 30.4 Composition через AI, не через coupling

Composition происходит через AI Assistance, который собирает данные из multiple sources для формирования ответа. Это не означает, что capabilities напрямую связаны друг с другом. Связь — через shared Model и через AI interpretation.

---
## 31. MVP Capability Architecture

MVP AIS включает 8 capabilities. Этот раздел определяет, как эти 8 capabilities взаимодействуют в рамках MVP.

### 31.1 Состав MVP capabilities

1. Project Discovery
2. Architecture Modeling
3. Security Analysis
4. Dependency Analysis
5. AI Assistance
6. Report Generation
7. Visualization
8. Organization Adaptation

### 31.2 Все MVP взаимодействия

**Discovery → Model** (direct). Project Discovery производит данные для Architecture Modeling.

**Model → Security** (direct). Security Analysis читает Model для structural context.

**Model → Dependency** (direct). Dependency Analysis читает Model для построения графа.

**Dependency → Security** (contextual). Security Analysis потребляет Dependency Analysis для поверхности атаки.

**OA → Model** (cross-cutting). Organization Adaptation записывает organizational context в Model element.

**OA → Security** (cross-cutting). OA предоставляет organizational security context.

**OA → Dependency** (cross-cutting). OA предоставляет контекст для оценки критичности.

**OA → AI** (cross-cutting). OA предоставляет контекст для интерпретации.

**Model → AI** (direct). AI читает Model как primary input.

**Security → AI** (direct). AI интерпретирует Security Findings.

**Dependency → AI** (direct). AI интерпретирует dependency graph и problematic patterns.

**Model → Visualization** (direct). Visualization представляет Model.

**Security → Visualization** (direct). Visualization представляет Security Findings.

**Dependency → Visualization** (direct). Visualization представляет dependency graph.

**Model → Reports** (direct). Reports включают структурные факты.

**AI → Reports** (direct). Reports могут включать AI interpretation.

**Security → Reports** (direct). Reports включают security findings.

### 31.3 Constraint

Никакая новая capability не вводится в рамках MVP. Если функциональность, требуемая пользователю, не покрывается 8 MVP capabilities, она реализуется через composition существующих capabilities (§30), а не через новую capability.

---
## 32. MVP Simplification

Этот раздел определяет минимально жизнеспособный поток данных в MVP — упрощённый путь от артефактов до пользователя.

### 32.1 Minimal Viable Flow

Project Artifacts → Project Discovery → Architecture Modeling → Security Analysis / Dependency Analysis → AI Assistance → Visualization / Report Generation → Пользователь → Quality Signal.

Organization Adaptation подключается cross-cutting на уровне Model и downstream capabilities.

### 32.2 Ключевые упрощения MVP

**Нет Knowledge.** В MVP архитектурное понимание накапливается в рамках сессии через AI reasoning, но не персистентно сохраняется как validated understanding. Knowledge Persistence — Post-MVP (Stage 2).

**Нет Evolution.** В MVP нет истории состояний Model. Change Impact Assessment требует Evolution и поэтому Post-MVP.

**Нет CIA.** Оценка последствий изменений доступна в базовой форме через Dependency Analysis (затронутые компоненты) и AI (интерпретация), но не как полноценная capability.

**Нет TDT.** Наблюдения о техническом долге доступны фрагментарно через Security и Dependency Analysis, но не как системная capability.

### 32.3 OA в MVP

Organization Adaptation в MVP предоставляет базовый организационный контекст. Глубокая адаптация (team-level policies, individual developer preferences) — Post-MVP (Stage 3-4).

---
## 33. Post-MVP Expansion

Этот раздел определяет, как архитектура расширяется после MVP. Расширение происходит через добавление Post-MVP capabilities и углубление существующих.

### 33.1 Stage 2: Knowledge и Evolution

Добавление Knowledge Persistence и Architecture Evolution. Это расширяет систему от «понимание в рамках сессии» до «накопленное организационное понимание». Включает полноценную CIA (требует Evolution) и TDT (требует накопленного контекста).

### 33.2 Stage 3: Team

Углубление OA до team-level: different teams могут иметь different organizational contexts, priorities и compromises. Knowledge разделяется между team и organization levels.

### 33.3 Stage 4: Organization

Углубление OA до organization-level: cross-team dependencies, organizational architecture governance, portfolio-level understanding.

### 33.4 Stage 5+: Ecosystem

Межорганизационное взаимодействие, ecosystem-level dependencies, shared architecture patterns.

### 33.5 Constraint

Ни одна стадия не вводит новую capability. Расширение — это углубление и композиция существующих 11 capabilities. Capability Map фиксирован (Capability Map, §1, §2).

---
## 34. Capability Evolution

Этот раздел описывает, как отдельные capabilities эволюционируют — углубляются, не расширяясь.

### 34.1 Принцип: depth, not breadth

Capabilities расширяют глубину своей ответственности, а не breadth. Security Analysis может лучше анализировать, но не начинает анализировать dependency problems. Dependency Analysis может глубже классифицировать, но не начинает оценивать security.

### 34.2 Примеры эволюции

**AI Assistance может лучше интерпретировать Security Findings** — более точные объяснения, лучшие рекомендации, учёт большего контекста. Но AI не становится Security Analysis (§29.1).

**Security Analysis может углубить анализ** — новые типы уязвимостей, более точная оценка рисков, учёт organisational context. Но Security не начинает анализировать dependencies.

**Knowledge Persistence может углубить хранение** — richer knowledge representation, better validation workflows, cross-project knowledge sharing. Но Knowledge не становится generic storage.

### 34.3 Constraint

Эволюция capability не нарушает boundary rules, определённых в данном документе. Если proposed evolution требует изменения boundary — это архитектурное решение, требующее обновления данного документа.

---
## 35. Quality Propagation

Когда Quality Architecture обнаруживает проблему (root cause), возникает вопрос: как эта проблема влияет на downstream capabilities и их outputs?

### 35.1 Цепочка распространения

Root Cause → Affected Capability → Affected Outputs → Potentially Affected Consumers.

**Пример:** Root Cause = «Discovery не обнаружил внутренний модуль X». Affected Capability = Architecture Modeling (неполная Model). Affected Outputs = все analysis capabilities, AI, Visualization, Reports. Potentially Affected Consumers = пользователь (неполное понимание).

### 35.2 No automatic invalidation

Обнаружение root cause не приводит к автоматической инвалидации downstream outputs. Quality Architecture фиксирует проблему и сигнализирует о ней. Решение о коррекции принимает человек. Это предотвращает каскадное разрушение: одна проблема в Discovery не должна автоматически инвалидировать весь security analysis.

### 35.3 Visibility

Quality propagation требует visibility: если downstream capability производит output на основе неполных данных, этот fact должен быть видим пользователю (uncertainty propagation — §37), а не скрыт.

---
## 36. Failure Isolation

Архитектура AIS требует, чтобы ошибка в одной capability не разрушала всю систему понимания.

### 36.1 Принцип

Если capability A не справляется со своей задачей (error, incomplete result, timeout), downstream capabilities продолжают функционировать с тем, что доступно. Система деградирует грациозно, а не каскадно.

### 36.2 Пример

Dependency Analysis не завершился полностью (error при обработке transitive dependencies). Downstream:

- **Security Analysis** — функционирует с неполным dependency context. Attack surface assessment менее точен, но базовый structural analysis работает.
- **AI Assistance** — интерпретирует доступные данные. Если пользователь спрашивает о конкретном dependency, AI указывает на неполноту данных.
- **Visualization** — отображает partial dependency graph.

**Критически:** Architecture Model остаётся валидным. Неполный Dependency Analysis не делает Model невалидным — Model остаётся Source of Truth для структурных фактов.

### 36.3 Failure Isolation ≠ Silent Failure

Failure isolation не означает, что ошибки скрываются. Пользователь информируется о неполноте данных (через AI, через Visualization indicators, через Quality signals). Ошибка изолирована, но видима.

---
## 37. Uncertainty Propagation

Неопределённость, возникшая upstream, не должна исчезать downstream. Это принцип uncertainty propagation.

### 37.1 Принцип

Если upstream capability производит результат с неопределённостью (incomplete data, estimation, assumption), downstream capabilities должны сохранить эту неопределённость в своих outputs.

### 37.2 Примеры

**Discovery не обнаружил все компоненты.** Model отражает обнаруженные компоненты. Model не скрывает факт неполноты. AI при ответе на вопросы о структуре указывает на возможную неполноту.

**Security Analysis оценивает риск как «Medium» с uncertainty.** AI при интерпретации сохраняет uncertainty: «Риск оценивается как Medium, но оценка основана на неполных данных о runtime behavior».

### 37.3 Visibility requirement

Uncertainty должна быть видна там, где она влияет на выводы. Если AI делает recommendation, основанную на uncertain data, recommendation должна содержать indication of uncertainty. TASK-ARCH-UX-001 требует, чтобы пользователь принимал решения на основе полной информации, включая неопределённость.

---
## 38. Conflict Propagation

Конфликты между capabilities должны быть видны и контекстуализированы, а не молча разрешены AI.

### 38.1 Типы конфликтов

**OA vs. Architecture.** Organization Adaptation определяет стандарт, противоречащий архитектурному решению в Model. Пример: OA требует absence of cyclic dependencies, а Model содержит цикл.

**Analysis vs. Analysis.** Security Analysis классифицирует dependency как critical, а Dependency Analysis — как normal. Это не техническая ошибка, а разница в perspective (security vs. structural).

**Knowledge vs. Model.** Knowledge содержит утверждение, которое противоречит текущему состоянию Model (например, Knowledge описывает компромисс, который уже устранён).

### 38.2 Правило

**Правило CONFLICT-1:** Конфликты не разрешаются AI автоматически. AI может указать на конфликт, объяснить его контекст и предложить варианты действий. Но решение остаётся за человеком.

**Правило CONFLICT-2:** Конфликты не скрываются. Visualization должна иметь возможность отображать конфликты. Reports должны содержать раздел conflicts (если применимо). AI должен упоминать конфликты в relevant responses.

---
## 39. Traceability Across Capabilities

Каждый существенный вывод в AIS должен позволять трассировку обратно к источнику. Это требование обеспечивает объяснимость (explainability) и доверие пользователя.

### 39.1 Требование

Если пользователь получает recommendation, assessment, finding или объяснение от AI, Visualization или Report, он должен иметь возможность проследить цепочку: Recommendation → AI reasoning → source data → Model element → Discovery source.

### 39.2 Пример полной цепочки

**Recommendation:** «Рекомендуем обновить библиотеку X до версии 3.0 для устранения уязвимости CVE-2024-XXX».

**Traceability chain:**

1. AI Assistance (формулировка рекомендации) — интерпретирует Security Finding.
2. Security Analysis (Security Finding) — привязан к component Y в Model.
3. Dependency Analysis (dependency) — component Y зависит от library X.
4. Architecture Modeling (component Y) — element в Model.
5. Project Discovery (source) — component Y обнаружен в файле path/to/file.

Каждый шаг этой цепочки должен быть доступен пользователю.

### 39.3 Implications

Traceability требует, чтобы capabilities сохраняли привязки к upstream sources. Security Finding должен ссылаться на Model element. Model element должен ссылаться на Discovery source (если применимо). AI reasoning должен явно указывать, на каких findings/assessments основан ответ.

---
## 40. Capability Interaction Matrix

Полная матрица взаимодействий всех 11 capabilities. Столбцы: Consumes (откуда получает данные), Produces (что производит), Primary Consumers (кто потребляет), Dependency Type (тип зависимости).

| Capability | Consumes | Produces | Primary Consumers | Dependency Type |
|---|---|---|---|---|
| Project Discovery | Проектные артефакты | Структурированные данные для Model | Architecture Modeling | — (входная точка) |
| Architecture Modeling | Discovery данные, OA context, Analysis enrichment | Architecture Model (Source of Truth) | Все capabilities | direct от Discovery |
| Security Analysis | Model, Dependency, OA | Security Findings (bound to Model) | AI, Viz, Reports, Knowledge | direct от Model, contextual от Dep/OA |
| Dependency Analysis | Model, OA | Dependency Graph (bound to Model) | Security, CIA, AI, TDT, Viz | direct от Model, contextual от OA |
| CIA | Model, Knowledge, Evolution, Dep, Security, OA | Impact Assessments (bound to Model) | AI, TDT, Knowledge, Reports | direct от Model/Evo/Dep, contextual от Security/OA/Knowledge |
| Knowledge Persistence | Model states, validated AI output | Architecture Knowledge (Source of Truth) | CIA, TDT, AI, Evolution | — (Post-MVP, direct от Model) |
| TDT | Model, Security, Dep, CIA, OA | Debt Observations (bound to Model) | AI, Viz, Reports | direct от Model, contextual от Security/Dep/CIA/OA |
| AI Assistance | Model, Knowledge, Evolution, Security, Dep, OA, Quality, User Intent | Ephemeral interpretation | Пользователь, Reports, Viz (опц.) | direct от Model, опциональный от Evo/Knowledge |
| Report Generation | Model, Analysis, AI, OA | Reports (point-in-time snapshot) | Пользователь | direct от всех upstream |
| Visualization | Model, Analysis, OA | Визуальные projections | Пользователь | direct от всех upstream |
| OA | Организационные данные от пользователя | Organizational context (в Model element) | Security, Dep, CIA, AI, TDT, Viz, Reports | cross-cutting |

### 40.1 Ключевые наблюдения

**Model является главным потребителем Discovery и главным поставщиком для всех остальных.** Это звёздная топология.

**AI является главным потребителем (потребляет 7+ sources), но не поставщиком для capabilities.** AI поставляет только пользователю и projection capabilities.

**OA является единственным cross-cutting поставщиком.** Все остальные зависимости — direct или contextual.

**Analysis capabilities являются enrichment layer.** Все analysis capabilities читают Model и пишут findings, привязанные к Model.

---
## 41. Architecture Invariants

Следующие 17 invariantов являются нерушимыми свойствами архитектуры AIS. Нарушение любого инварианта требует архитектурного решения с обновлением данного документа.

**I-1. One Owner per Concept.** Каждый архитектурный концепт имеет ровно одного владельца из числа 11 capabilities (§5.1).

**I-2. Model is sole Source of Truth for structural facts.** Architecture Model является единственным источником структурной правды (Architecture Foundation, §4.4).

**I-3. Knowledge is sole Source of Truth for validated understanding.** Architecture Knowledge является единственным источником накопленного понимания (Architecture Foundation, §5.2).

**I-4. AI writes NOTHING.** AI Assistance не создаёт, не модифицирует и не владеет архитектурными данными (Architecture Foundation, §8.3).

**I-5. Feedback does not mutate Source of Truth.** Пользовательский feedback проходит через Quality Architecture и контролируемые процессы (TASK-ARCH-UX-001, TASK-ARCH-QUALITY-001).

**I-6. Visualization is pure projection.** Visualization не кэширует, не создаёт и не владеет данными (Architecture Foundation, §10).

**I-7. Reports are point-in-time snapshots.** Отчёты не обновляются автоматически и не являются Source of Truth (Architecture Foundation, §10).

**I-8. Analysis capabilities enrich Model, not replace it.** Все findings привязаны к Model, не дублируют его (Architecture Foundation, §7).

**I-9. DAG property.** Концептуальный dependency graph является DAG (§8).

**I-10. No automatic mutation by Quality.** Quality Architecture указывает, человек решает (TASK-ARCH-QUALITY-001).

**I-11. OA is cross-cutting context, not rules engine.** OA влияет на интерпретацию, не на факты (Architecture Foundation, §9).

**I-12. Information flow ≠ Ownership flow.** Потребление не передаёт ownership (§25).

**I-13. No hidden dependencies between capabilities.** Все зависимости явны (INTEROP-6).

**I-14. No implicit mutation.** Capability A не модифицирует данные capability B без явного намерения (INTEROP-7).

**I-15. Failure isolation.** Ошибка в одной capability не разрушает всю систему (§36).

**I-16. Uncertainty propagation.** Неопределённость не исчезает downstream (§37).

**I-17. Conflict visibility.** Конфликты не скрываются и не разрешаются автоматически (§38).

---
## 42. Anti-Patterns

Следующие 16 антипаттернов являются запрещёнными архитектурными практиками. Каждый нарушает один или более invariant (§41).

**AP-1. AI as Central Owner.** AI агрегирует данные от всех capabilities в собственное хранилище и становится de facto Source of Truth. *Нарушает: I-4, I-1.*

**AP-2. Analysis Creates Structural Facts.** Security или Dependency Analysis создаёт компоненты или связи, не отражённые в Model. *Нарушает: I-2, I-8.*

**AP-3. Feedback Mutates Model.** Пользовательский feedback напрямую модифицирует Architecture Model без контролируемого процесса. *Нарушает: I-5.*

**AP-4. Knowledge Duplicates Model.** Knowledge Persistence хранит структурные факты, дублируя Model. *Нарушает: I-2, I-3.*

**AP-5. Evolution Duplicates Knowledge.** Architecture Evolution хранит причины решений, дублируя Knowledge. *Нарушает: I-3.*

**AP-6. Visualization Caches State.** Visualization кэширует архитектурные данные, создавая stale view. *Нарушает: I-6.*

**AP-7. Report as Source of Truth.** Отчёт используется как актуальный источник данных вместо Model. *Нарушает: I-7, I-2.*

**AP-8. Security Replaces Dependency.** Security Analysis выполняет dependency analysis вместо потребления Dependency Analysis. *Нарушает: I-8, I-13.*

**AP-9. AI Replaces Analysis.** AI Assistance обнаруживает уязвимости или строит dependency graph вместо интерпретации. *Нарушает: I-4, I-8.*

**AP-10. OA as Rules Engine.** Organization Adaptation фильтрует или блокирует данные на основе организационных правил. *Нарушает: I-11.*

**AP-11. Quality Auto-Corrects.** Quality Architecture автоматически модифицирует Model или findings на основе quality signals. *Нарушает: I-10.*

**AP-12. Hidden Coupling.** Две capabilities обмениваются данными через side effects, общее состояние или неявные контракты. *Нарушает: I-13, I-14.*

**AP-13. Ownership Reversal through Feedback.** Quality signal создаёт ситуацию, при которой Quality становится де-факто владельцем концепта другой capability. *Нарушает: I-5, I-1.*

**AP-14. AI Dependency Cycle.** AI создаёт Knowledge, Knowledge потребляется AI, AI создаёт больше Knowledge — без human validation. *Нарушает: I-9, I-4.*

**AP-15. Discovery Bypass.** Capability напрямую читает проектные артефакты, минуя Discovery и Model. *Нарушает: I-2, I-13.*

**AP-16. Cascade Failure.** Ошибка в одной capability автоматически инвалидации outputs всех downstream capabilities. *Нарушает: I-15.*

---
## 43. Architecture Decision Alignment

Верификация совместимости Product Architecture Decisions (D1–D10) с данной архитектурой capabilities.

**D1 (AI-Native Architecture).** Compatible. AI является terminal consumer, не central owner. AI-Native означает AI-assisted understanding, а не AI-owned understanding.

**D2 (Human-in-the-Loop).** Compatible. Human validation требуется для Knowledge creation (§5.2, §8.2). Human решает по Quality signals (§23.3). Human принимает финальные решения (Decision 3).

**D3 (No Autonomous Decisions).** Compatible. AI не принимает решения за человека. Recommendations → human decision. Reports → human decision. Security findings → human decision.

**D4 (Progressive Disclosure).** Compatible. Visualization и Reports поддерживают progressive disclosure через OA context и user intent. AI адаптирует глубину ответа (TASK-ARCH-UX-001).

**D5 (Source of Truth Architecture).** Compatible. Model is sole Source of Truth for structural facts (I-2). Knowledge is sole Source of Truth for understanding (I-3). Clear hierarchy (§2).

**D6 (Observability over Control).** Compatible. Quality Architecture observes, не controls. OA observes organizational context, не enforces rules. Evolution observes changes, не directs them.

**D7 (Minimal Assumptions).** Compatible. Discovery работает с любыми проектными артефактами. OA является optional (capabilities function без OA). AI interpretation адаптируется к доступным данным.

**D8 (Unified Platform).** Compatible. 11 capabilities формируют единую систему понимания через shared Model, composition (§30), и unified AI interpretation.

**D9 (Security by Design).** Compatible. Security Analysis является MVP capability. Security findings привязаны к Model и контекстуализированы через OA.

**D10 (Extensibility).** Compatible. Post-MVP expansion через углубление capabilities (§34), не через создание новых. DAG property гарантирует, что новые dependencies не создают циклов.

### 43.1 Risks

**Risk D1:** Интерпретация «AI-Native» может сместиться к «AI-Owned». Митигация: invariant I-4 и антипаттерн AP-1.

**Risk D8:** «Unified Platform» может привести к tight coupling. Митигация: explicit boundaries, ownership model, INTEROP rules.

---
## 44. UX Alignment

Верификация совместимости с TASK-ARCH-UX-001.

**Intent-First Interaction (UX, §3).** Supported. AI Assistance interprets user intent и формирует ответ на основе всех доступных данных. Capability composition (§30) обеспечивает ответ на сложные вопросы.

**Minimal Information Principle (UX, §4).** Supported. Progressive disclosure через AI (адаптивная глубина), Visualization (interactive drill-down), Reports (structured sections).

**Progressive Disclosure (UX, §5).** Supported. От Model (факты) → Analysis (findings) → AI (интерпретация) → User (решение). Каждый уровень раскрывается по требованию.

**Context Selection (UX, §6).** Supported. OA предоставляет organizational context. AI выбирает relevant context для ответа.

**Explainability (UX, §7).** Supported. Traceability (§39) обеспечивает возможность проследить цепочку. AI provides reasoning. Analysis capabilities produce explainable findings.

**Uncertainty Representation (UX, §8).** Supported. Uncertainty propagation (§37). AI indicates uncertainty. Visualization can show incomplete data.

**Human Decision (UX, §9).** Supported. AI не принимает решения (Decision 3, I-4). Security recommendations → human decision. Reports → human decision.

**Feedback Architecture (UX, §10).** Supported. Feedback flows to Quality Architecture. Feedback does not mutate Source of Truth (I-5).

### 44.1 Key Principle

**Пользователь взаимодействует с пониманием, а не с capabilities.** Пользователь не выбирает «Security Analysis» или «Dependency Analysis». Пользователь задаёт вопрос, а система (через AI, Visualization, Reports) предоставляет понимание, скомпонованное из relevant capabilities. Это согласуется с TASK-ARCH-UX-001 и Product Vision.

---
## 45. Quality Alignment

Верификация совместимости с TASK-ARCH-QUALITY-001.

**Quality signal lifecycle (Quality, §4).** Supported. Quality signals генерируются, классифицируются по root cause, и направляются к контролируемым процессам.

**Root cause classification (Quality, §6).** Supported. Root causes маппируются на affected capabilities (§35). Quality Architecture не ownership-dependencies на capabilities.

**Quality does not own content (Quality, §8).** Supported. Invariant I-10. Quality Architecture собирает signals, не создаёт и не владеет архитектурным содержанием.

**No ownership reversal through quality (Quality, §9).** Supported. Invariant I-5, I-1, антипаттерн AP-13. Feedback does not mutate Source of Truth.

### 45.1 Вывод

Quality Architecture полностью совместима с capability interaction architecture. Quality не создаёт ownership dependencies и не нарушает invariantов.

---
## 46. Product Layer Alignment

Верификация совместимости со всеми 10 фундаментальными документами Product Layer.

**Product Vision.** Compatible. Единая система понимания из 11 capabilities реализует vision «каждое архитектурное решение — осознанное».

**Product Principles (§3.1–§3.13).** Compatible. Knowledge never lost (§3.4) — Knowledge Persistence. Human-in-the-loop (§3.5) — Decision 3. Progressive disclosure (§3.6) — supported through AI, Viz, Reports. Explainability (§3.7) — traceability (§39). Minimal assumptions (§3.13) — Discovery работает с любыми артефактами.

**Product Architecture Decisions (D1–D10).** Verified in §43. All compatible.

**Capability Map.** Compatible. 11 capabilities, 8 MVP, 3 Post-MVP. Полное соответствие.

**MVP Definition.** Compatible. 8 MVP capabilities определены в §31. Post-MVP boundary совпадает.

**Product Success Metrics.** Compatible. North Star (осознанные архитектурные решения) обеспечивается capability composition и AI interpretation.

**Product Roadmap.** Compatible. Post-MVP expansion (§33) соответствует стадиям roadmap.

**Product Decision Framework.** Compatible. Критерии оценки возможностей (feasibility, impact, alignment) могут быть применены к capability evolution (§34).

**All Product Specifications.** Verified individually in §47.

---
## 47. Product Specifications Alignment

Верификация совместимости со всеми 12 Product Specifications.

**Architecture Model Specification.** Compatible. Model является Source of Truth (I-2), star topology (§7), ownership of structural facts (§5).

**Security Analysis Specification.** Compatible. Security findings bound to Model (§13), contextualized through OA and Dependency.

**Dependency Analysis Specification.** Compatible. Dependency graph bound to Model (§14), consumed by multiple downstream capabilities.

**AI Assistance Specification.** Compatible. AI as terminal consumer (§18), writes nothing (I-4), AI Dependency Rule (§19).

**Visualization Specification.** Compatible. Pure projection (§20), no caching, no data creation.

**Report Generation Specification.** Compatible. Point-in-time snapshots (§21), not Source of Truth.

**Organization Adaptation Specification.** Compatible. Cross-cutting context (§17), not rules engine, writes to Model element.

**Project Discovery Specification.** Compatible. Transit process (§9), not persistent, upstream to Model only.

**Architecture Knowledge Specification.** Compatible. Validated understanding only (I-3), human validation required, separate from Model and Evolution.

**Change Impact Assessment Specification.** Compatible. Post-MVP (§15), consumes multiple capabilities, 6 impact dimensions preserved.

**Technical Debt Tracking Specification.** Compatible. Post-MVP (§16), debt observations bound to Model, not code quality metrics.

**Architecture Evolution Specification.** Compatible. Post-MVP (§11), observational layer (what changed, not why), depends on Model states stored by Knowledge Persistence.

**Quality Architecture Specification.** Compatible. Quality collects signals (§23), no ownership of content, no automatic mutation. Примечание: Quality Architecture является документом Architecture Layer (TASK-ARCH-QUALITY-001), а не Product Specification — включён для полноты cross-layer верификации.

### 47.1 Discrepancy: CIA Specification

Change Impact Assessment Specification указывает, что базовая версия CIA доступна в MVP. Capability Map (§5) и MVP Definition относят CIA к Post-MVP. Архитектурный source of truth для MVP boundary — Capability Map и MVP Definition. Данная discrepancy зафиксирована в §3.3. Базовые элементы impact assessment доступны в MVP через Dependency Analysis + AI Assistance, но полноценная capability CIA — Post-MVP.

---
## 48. Out of Scope / Forbidden Assumptions

Следующие элементы находятся вне scope данной архитектурной спецификации и не должны предполагаться.

**OS-1.** Техническая реализация capabilities (frameworks, libraries, databases, APIs, microservices, monolith).

**OS-2.** Форматы данных (JSON, XML, protobuf, graph schemas).

**OS-3.** Authentication и authorization механизмы.

**OS-4.** Deployment architecture (cloud, on-premise, containers, serverless).

**OS-5.** Performance requirements и benchmarks.

**OS-6.** Specific LLM models или AI providers.

**OS-7.** Integration с external tools (Jira, Confluence, GitHub, GitLab).

**OS-8.** Multi-tenant architecture.

**OS-9.** Billing, licensing, pricing.

**OS-10.** API versioning strategy.

**OS-11.** Real-time streaming архитектура.

**OS-12.** Offline mode.

**FA-1 (Forbidden Assumption).** Не предполагать, что capabilities реализованы как отдельные сервисы.

**FA-2.** Не предполагать, что Model хранится в реляционной базе данных.

**FA-3.** Не предполагать, что AI использует конкретный LLM provider.

**FA-4.** Не предполагать, что Visualization использует конкретный rendering library.

**FA-5.** Не предполагать, что OA policies выражаются в конкретном rule language.

**FA-6.** Не предполагать, что Quality signals хранятся в отдельной базе данных.

**FA-7.** Не предполагать, что capability boundaries совпадают с code module boundaries.

---
## 49. Open Questions

Следующие вопросы требуют дальнейшего обсуждения на уровне Product или Implementation.

**OQ-1.** Как именно Discovery трансформирует данные артефактов в структурные факты Model? Требует ли это human approval, или процесс автоматический? Граница автоматизации не определена в текущей архитектуре.

**OQ-2.** Каков минимальный набор OA данных, необходимых для MVP? Текущая архитектура определяет OA как MVP capability, но не определяет minimum viable organizational context.

**OQ-3.** Как Quality signals приоритизируются? Если одновременно поступают multiple quality signals с разными root causes, какой обрабатывается первым?

**OQ-4.** Каков гранулярность traceability (§39) в MVP? Полная цепочка traceability для всех выводов — значительная нагрузка. Какой уровень traceability является MVP?

**OQ-5.** Как AI обрабатывает conflicting information от multiple analysis capabilities (§38)? Формальный алгоритм или heuristic?

**OQ-6.** Каков lifecycle debt observation в TDT? Когда observation закрывается? Кто закрывает — человек или система?

**OQ-7.** Как Knowledge Persistence определяет, что AI output является кандидатом на validation? Требуется ли explicit user action, или автоматический suggestion?

**OQ-8.** Как Architecture Evolution определяет granularity изменений? Каждый вызов Model update — это изменение, или только meaningful changes?

**OQ-9.** Какова стратегия rollback для Knowledge? Если validated understanding оказалось ошибочным, как оно корректируется?

**OQ-10.** Как Visualization обеспечивает drill-down от recommendation к source data? Технический механизм вне scope, но UX requirement требует определения.

**OQ-11.** Как Reports обрабатывают conflicting information от multiple sources?

**OQ-12.** Как OA определяет, что organizational policy противоречит архитектурному решению? Требует ли это explicit comparison mechanism?

**OQ-13.** Как Capability Composition (§30) работает без AI? Может ли пользователь напрямую скомпонировать outputs?

**OQ-14.** Как Post-MVP expansion (§33) влияет на existing MVP boundaries? Требует ли добавление Post-MVP capability пересмотра MVP boundaries?

---
## 50. Audits

Следующие 35 аудитов верифицируют полноту и согласованность данной спецификации. Все аудиты PASS.

**AUDIT-1: Capability count.** Verify: AIS содержит ровно 11 capabilities. Result: §3.1 — 11 capabilities. **PASS.**

**AUDIT-2: MVP boundary.** Verify: MVP содержит ровно 8 capabilities. Result: §3.1, §31.1 — 8 MVP capabilities. **PASS.**

**AUDIT-3: Post-MVP boundary.** Verify: Post-MVP содержит ровно 3 capabilities (CIA, Knowledge Persistence, TDT). Result: §3.1 — 3 Post-MVP capabilities. **PASS.**

**AUDIT-4: Model as Source of Truth.** Verify: Architecture Model является единственным Source of Truth для структурных фактов. Result: §2.1, I-2, §5 (ownership matrix). **PASS.**

**AUDIT-5: Knowledge as Source of Truth.** Verify: Architecture Knowledge является единственным Source of Truth для накопленного понимания. Result: §2.2, I-3, §5. **PASS.**

**AUDIT-6: AI writes nothing.** Verify: AI Assistance не создаёт, не модифицирует и не владеет архитектурными данными. Result: §2.5, I-4, §18.1. **PASS.**

**AUDIT-7: DAG property — no direct cycles.** Verify: Dependency graph не содержит прямых циклов. Result: §8.1. **PASS.**

**AUDIT-8: DAG property — no indirect cycles.** Verify: Dependency graph не содержит косвенных циклов. Result: §8.2 (AI↔Knowledge разорван human validation). **PASS.**

**AUDIT-9: DAG property — no ownership cycles.** Verify: Ownership matrix не содержит циклов. Result: §8.3. **PASS.**

**AUDIT-10: DAG property — no semantic cycles.** Verify: Нет неявных циклов через обратную связь. Result: §8.4 (Quality→Model correction controlled). **PASS.**

**AUDIT-11: One Owner per Concept.** Verify: Каждый концепт из ownership matrix имеет ровно одного владельца. Result: §5.1, I-1. **PASS.**

**AUDIT-12: Consumption ≠ Ownership.** Verify: Потребление данных не передаёт ownership. Result: §5.2 (O-2), §25. **PASS.**

**AUDIT-13: Model sole owner of structural facts.** Verify: Ни одна другая capability не создаёт структурные факты. Result: §5.2 (O-3), §12 (SA-1). **PASS.**

**AUDIT-14: Knowledge sole owner of understanding.** Verify: Ни одна другая capability не создаёт validated understanding. Result: §5.2 (O-4), §5.2 (O-5). **PASS.**

**AUDIT-15: Feedback does not mutate Source of Truth.** Verify: Пользовательский feedback не модифицирует Model, Knowledge, Evolution. Result: I-5, §5.2 (O-5). **PASS.**

**AUDIT-16: Visualization is pure projection.** Verify: Visualization не кэширует, не создаёт, не владеет данными. Result: §20, I-6. **PASS.**

**AUDIT-17: Reports are point-in-time snapshots.** Verify: Reports не обновляются автоматически, не являются Source of Truth. Result: §21, I-7. **PASS.**

**AUDIT-18: OA is cross-cutting context, not rules engine.** Verify: OA влияет на интерпретацию, не на факты. Result: §17, I-11. **PASS.**

**AUDIT-19: AI Dependency Rule.** Verify: AI не является обязательным звеном для capability-to-capability interaction. Result: §19. **PASS.**

**AUDIT-20: No forbidden dependencies exist.** Verify: Ни одна из 7 forbidden dependencies (§28) не нарушена. Result: §28.1, dependency graph (§7.2). **PASS.**

**AUDIT-21: Information flow ≠ Ownership flow.** Verify: Принцип формулирован и проиллюстрирован. Result: §25. **PASS.**

**AUDIT-22: Traceability requirement.** Verify: Каждый существенный вывод позволяет трассировку к источнику. Result: §39. **PASS.**

**AUDIT-23: Failure isolation.** Verify: Ошибка в одной capability не разрушает всю систему. Result: §36, I-15. **PASS.**

**AUDIT-24: Uncertainty propagation.** Verify: Неопределённость не исчезает downstream. Result: §37, I-16. **PASS.**

**AUDIT-25: Conflict visibility.** Verify: Конфликты не скрываются, не разрешаются автоматически. Result: §38, I-17. **PASS.**

**AUDIT-26: Quality does not own content.** Verify: Quality Architecture не владеет архитектурным содержанием. Result: §23, I-10. **PASS.**

**AUDIT-27: No auto-mutation by Quality.** Verify: Quality не модифицирует Source of Truth автоматически. Result: §23.3, I-10. **PASS.**

**AUDIT-28: Capability Contract defined for all 11 capabilities.** Verify: Each capability has Purpose, Input, Output, Owner, Consumers, Dependencies, Non-responsibilities. Result: §4 (§4.1–§4.11). **PASS.**

**AUDIT-29: All 7 Interoperability rules defined.** Verify: INTEROP-1 through INTEROP-7. Result: §27. **PASS.**

**AUDIT-30: All 16 Anti-Patterns defined with violated principles.** Verify: AP-1 through AP-16, each with invariant references. Result: §42. **PASS.**

**AUDIT-31: All 17 Invariants defined.** Verify: I-1 through I-17. Result: §41. **PASS.**

**AUDIT-32: All 10 Product Architecture Decisions compatible.** Verify: D1–D10 compatibility assessed. Result: §43. **PASS.**

**AUDIT-33: UX alignment verified for all 8 principles.** Verify: Intent-First, Minimal Info, Progressive Disclosure, Context Selection, Explainability, Uncertainty, Human Decision, Feedback. Result: §44. **PASS.**

**AUDIT-34: All 10 Product Layer documents aligned.** Verify: Vision, Principles, Decisions, Capability Map, MVP, Metrics, Roadmap, Framework, all Specs. Result: §46. **PASS.**

**AUDIT-35: All 12 Product Specifications aligned + Quality Architecture cross-layer check.** Verify: Each of 12 Product Specs checked against capability interaction architecture, plus TASK-ARCH-QUALITY-001 cross-layer verification. Result: §47 — 12 Product Specs checked (including Architecture Evolution Specification), CIA discrepancy noted. Quality Architecture (Architecture Layer) verified separately. **PASS.**

---
## 51. Non-Blocking Observations

Следующие наблюдения фиксируют ограничения и будущие consideration, которые не блокируют текущую архитектуру, но должны быть учтены при дальнейшем развитии.

**OBS-1. Traceability implementation cost.** Требование полной traceability (§39) для всех выводов является значительной нагрузкой на реализацию. В MVP может потребоваться определение minimum viable traceability — например, traceability только для findings и recommendations, не для каждого AI response. Это UX и implementation вопрос, не влияющий на архитектурный принцип.

**OBS-2. AI Dependency Rule enforcement.** Правило §19 (AI не является обязательным звеном) концептуально понятно, но enforcement на уровне реализации требует дисциплины. Риск: разработчики могут неосознанно создать A → AI → B паттерн, если AI является удобной точкой агрегации. Архитектурные ревью должны проверять этот антипаттерн.

**OBS-3. Composition granularity.** §30 описывает composition через AI, но не определяет, как composition работает для Visualization и Reports (которые не проходят через AI). Visualization может показывать multiple analysis layers одновременно (security + dependencies). Reports могут включать multiple analysis sections. Это естественно, но механизм aggregation в projection capabilities не определён (и не должен быть — implementation concern).

**OBS-4. OA evolution beyond MVP.** OA в MVP предоставляет базовый organizational context. Post-MVP expansion (Stage 3-4) углубляет OA до team и organization levels. Возникает вопрос: может ли один Model иметь multiple OA contexts (например, для разных teams)? Архитектура не запрещает это, но не определяет явно. Future consideration.

**OBS-5. Knowledge Persistence validation bottleneck.** Требование human validation для AI → Knowledge transition (Architecture Foundation, §5.5) создаёт потенциальный bottleneck. Если AI генерирует множество candidates на Knowledge, валидация может отставать. Это product design вопрос (как стимулировать валидацию), не архитектурный.

**OBS-6. Post-MVP capability interaction complexity.** В MVP 8 capabilities с относительно простыми взаимодействиями. Добавление Knowledge Persistence, CIA и TDT значительно усложняет interaction graph (§40). CIA, например, потребляет 6 upstream capabilities. Это не является проблемой, но требует внимательной реализации failure isolation и uncertainty propagation.

**OBS-7. Quality Architecture maturity.** Quality Architecture является MVP component (quality signals собираются с первой версии), но его maturity в MVP ограничена. Полноценное root cause classification, signal lifecycle и improvement loops — это evolution, а не MVP requirement. Архитектура не ограничивает evolution Quality.

**OBS-8. Visualization and Reports as separate capabilities.** Две projection capabilities (Visualization и Reports) имеют значительное перекрытие: обе читают Model, Analysis, OA и представляют пользователю. Разделение оправдано разными product goals (interactive vs. delivery artifact), но future evolution может рассмотреть convergence. Это не является архитектурным решением сейчас.

**OBS-9. Cross-audit note: Discovery → Model data flow.** Первоначальная версия §9.4 содержала утверждение «Discovery не пишет напрямую в Model», которое противоречило Architecture Foundation (§6.1, §6.2, §12.2, §14.1). Foundation явно определяет: «Результаты Discovery — это данные, которые непосредственно поступают в Architecture Model» (§6.2). Исправлено: §9.4 теперь корректно описывает прямую поставку данных Discovery в Model. Урок: при формулировке boundary rules необходимо отличать ownership (Discovery не владеет Model) от data flow (Discovery поставляет данные непосредственно в Model).

---
## 52. Unresolved Questions

Следующие вопросы не могут быть разрешены на уровне архитектуры и требуют product, UX или implementation решений.

**UQ-1. Granularity of human validation for Knowledge.** Архитектура требует human validation для AI → Knowledge transition. Но какой granularity? Каждый AI response? Каждый substantial insight? Explicit user nomination? Это product и UX решение.

**UQ-2. Discovery → Model data transformation.** Архитектура определяет, что Discovery поставляет данные непосредственно в Model (§9.4). Но уровень трансформации данных внутри процесса Discovery и критерии включения обнаруженных элементов в Model — это product и implementation решение.

**UQ-3. Minimum viable OA for MVP.** OA является MVP capability, но minimum organizational context для meaningful value не определён. Это product решение.

**UQ-4. Priority of Quality signals.** Когда multiple quality signals поступают одновременно, как они приоритизируются? Architecture определяет, что Quality не мутирует автоматически, но не определяет signal processing order. Это implementation решение.

**UQ-5. Handling of stale Knowledge.** Если Architecture Knowledge содержит утверждение, которое больше не соответствует текущему Model (например, объяснение удалённой зависимости), как это обрабатывается? Architecture определяет разделение (Knowledge ≠ Model), но не определяет stale knowledge detection. Это product и implementation решение.

**UQ-6. Multi-project context.** Архитектура описывает single project. Если пользователь подключает multiple projects, как capabilities взаимодействуют? Является ли Model shared или separate? Это product и architecture decision для future stage.

**UQ-7. AI model swap impact on AI Dependency Rule.** Если AI Assistance заменяется на другой LLM (или rule-based system), какие downstream effects? Архитектура говорит, что замена допустима без изменения ownership (§18.4), но quality of interpretation может измениться. Как это коммуницируется пользователю?

**UQ-8. Composition without AI.** §30 описывает composition через AI. Может ли пользователь напрямую komпоновать outputs (например, Security + Dependency в Visualization)? Архитектура не запрещает это, но не определяет. Это UX решение.

---

**Конец документа.**
