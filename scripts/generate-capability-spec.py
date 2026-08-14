#!/usr/bin/env python3
"""Generate AIS Capability Interaction Architecture Specification."""

import os

OUTPUT = "/home/z/my-project/docs/architecture/ais-capability-interaction-architecture-specification.md"

sections = []

def s(text):
    sections.append(text)

# ============================================================================
s("""# AIS Capability Interaction Architecture Specification

**Идентификатор задачи:** TASK-ARCH-CAPABILITY-001
**Уровень документа:** Architecture Layer
**Зависимости:** TASK-ARCH-FOUNDATION-001, TASK-ARCH-UX-001, TASK-ARCH-QUALITY-001, Product Layer, все Product Specifications
**Статус:** Draft
**Версия:** 1.0

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
""")

# ============================================================================
s("""## 1. Purpose

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
""")

# ============================================================================
s("""## 2. Source of Truth Hierarchy

Архитектура AIS строится на чёткой иерархии источников правды. Каждый источник отвечает на свой вопрос и занимает своё место в архитектуре. Эта иерархия является фундаментом всех последующих разделов документа.

### 2.1 Architecture Model — Source of Truth структурных фактов

Architecture Model является единственным источником структурной правды о проекте (Architecture Foundation, §4.4). Model отвечает на вопрос «что существует?» — компоненты, связи, зависимости, слои, границы. Все остальные capabilities строятся поверх Model. Если факт не отражён в Model, он недоступен дляCapabilities, которые его не создали.

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
""")

# ============================================================================
s("""## 3. Capability Inventory

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
""")

# ============================================================================
s("""## 4. Capability Definitions

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
""")

print(f"Sections 1-4 written, {len(sections)} sections so far")
# Continue in next file part
with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(''.join(sections))
print(f"Written to {OUTPUT}")
