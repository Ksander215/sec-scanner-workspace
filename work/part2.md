
---

## 5. Ownership Model

Этот раздел определяет, какая capability владеет каким архитектурным концептом. Правило: один концепт — один владелец. Если два capabilities работают с одним концептом, один владеет, другой потребляет.

### 5.1 Ownership Matrix

| Концепт | Владелец | Потребители |
|---|---|---|
| Структурные факты (компоненты, связи, слои) | Architecture Modeling | Все capabilities |
| Первичное обнаружение | Project Discovery | Architecture Modeling |
| Security Findings | Security Analysis | AI Assistance, Knowledge, Visualization, Reports |
| Dependency graph и classifications | Dependency Analysis | Security Analysis, CIA, AI Assistance, TDT, Visualization |
| Impact assessments | Change Impact Assessment | AI Assistance, Knowledge, TDT |
| Архитектурное понимание | Knowledge Persistence | AI Assistance, CIA, TDT |
| Временное развитие (история) | Architecture Evolution | AI Assistance, CIA, Knowledge |
| Debt observations | Technical Debt Tracking | AI Assistance, Visualization, Reports |
| Организационный контекст | Organization Adaptation | Все analysis capabilities, AI Assistance, Viz, Reports |
| Интерпретация для пользователя | AI Assistance | Пользователь (ephemeral) |
| Визуальное представление | Visualization | Пользователь (ephemeral) |
| Delivery artifacts (отчёты) | Report Generation | Внешний потребитель |
| Quality signals и findings | Quality Architecture | Все capabilities (improvement input) |

### 5.2 Ключевые правила

**One Owner per Concept.** Каждый концепт в матрице имеет ровно одного владельца. Security Findings принадлежат Security Analysis — AI Assistance потребляет их для интерпретации, но не владеет. Dependency graph принадлежит Dependency Analysis — Security Analysis потребляет его для оценки поверхности атаки, но не владеет.

**Consumption ≠ Ownership.** То, что capability потребляет данные другой capability, не передаёт ownership (детально — §25). AI Assistance потребляет Security Findings, Dependency Analysis results, Knowledge, Evolution и Organization Context — но не владеет ни одним из этих концептов.

**Model — единственный владелец структурных фактов.** Ни одна capability не создаёт параллельный источник структурных фактов. Все enrichment capabilities (Security, Dependency, CIA, TDT) создают результаты, привязанные к Model, а не параллельные модели. Это Architecture Invariant I2 (Architecture Foundation, §16).

**Knowledge — единственный владелец понимания.** Knowledge Persistence владеет накопленным пониманием. AI создаёт ephemeral интерпретации, которые могут стать Knowledge только через валидацию. Это Architecture Invariant I7 (Architecture Foundation, §16).

---

## 6. Capability ≠ Module

Явное архитектурное разделение:

> **Capability — продуктово-архитектурная ответственность, а не технический module/package/service.**

Capability определяет, **что** должно быть обеспечено в системе и **почему**. Она не определяет, **как** это реализовано. Один capability не является одним классом, одним сервисом, одним API endpoint или одним модулем. Capability может быть реализована множеством технических компонентов. Несколько capabilities могут быть реализованы в одном техническом компоненте.

Этот документ не описывает: classes, interfaces, services, APIs, databases, queues, microservices, frameworks, deployment topology, programming languages или любые другие implementation details. Все подобные вопросы принадлежат Implementation Layer.
