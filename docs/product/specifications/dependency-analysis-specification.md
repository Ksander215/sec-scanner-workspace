# Architecture Dependency Analysis Specification

**Document ID:** TASK-PRODUCT-SPEC-007
**Status:** Draft
**Тип документа:** Product Specification
**Уровень:** Product / Domain
**Зависит от:** Product Vision, Product Principles, Capability Map, User Personas, Product Positioning, MVP Definition, Product Architecture Decisions, Product Success Metrics, Product Roadmap, Product Decision Framework, Architecture Model Specification, Project Discovery Specification, Architecture Knowledge Specification, Architecture Evolution Specification, Change Impact Assessment Specification, Security Analysis Specification

---

# 1. Purpose

Dependency Analysis существует для того, чтобы AIS понимал, **как части программной системы связаны между собой и какие последствия возникают из этих связей**.

Обычный анализ зависимостей отвечает на вопрос:

> «От чего зависит этот компонент?»

AIS должен отвечать на более важный вопрос:

> **«Как это связано со всей системой, почему эта связь существует и что произойдёт, если она изменится или исчезнет?»**

Dependency Analysis является одним из основных механизмов превращения Architecture Model из набора объектов в **понимаемую систему взаимосвязей**.

---

# 2. Problem

Современная программная система состоит из множества взаимосвязанных элементов:

* сервисов;
* компонентов;
* библиотек;
* API;
* баз данных;
* внешних систем;
* инфраструктурных элементов;
* конфигураций;
* security boundaries;
* бизнес-функций.

При этом зависимость редко ограничивается прямой связью.

Изменение одного элемента может пройти через несколько уровней:

```text
Component A
    ↓
API B
    ↓
Service C
    ↓
Database D
    ↓
Business Capability E
```

Поэтому наличие прямой зависимости недостаточно для понимания реального воздействия.

Проблема заключается не в отсутствии списков зависимостей.

Проблема в отсутствии **контекста зависимостей**.

---

# 3. Definition

## 3.1 What is Dependency Analysis

Dependency Analysis — это способность AIS:

1. обнаруживать зависимости;
2. классифицировать их;
3. связывать их с Architecture Model;
4. определять направление зависимости;
5. определять характер зависимости;
6. выявлять транзитивные зависимости;
7. определять критические связи;
8. объяснять значение зависимости;
9. использовать зависимости для других видов анализа;
10. сохранять понимание зависимостей во времени.

---

## 3.2 Dependency

Dependency — это отношение, при котором изменение, недоступность, нарушение или изменение поведения одного элемента может повлиять на другой элемент.

Зависимость может быть:

* прямой;
* косвенной;
* транзитивной;
* обязательной;
* необязательной;
* runtime;
* build-time;
* data;
* security;
* operational;
* architectural;
* organizational.

Тип зависимости определяется её смыслом, а не только техническим способом обнаружения.

---

# 4. Dependency Is Not Just a Graph

AIS не должен трактовать Dependency Analysis как построение графа.

Граф является **представлением связи**, но не самой ценностью.

Например:

```text
A → B
```

не объясняет:

* почему A зависит от B;
* насколько зависимость критична;
* что произойдёт при недоступности B;
* какие компоненты пострадают;
* какие security implications существуют;
* можно ли заменить B;
* является ли зависимость архитектурно оправданной.

AIS должен превращать:

> **A → B**

в:

> **A зависит от B для выполнения X.
> Изменение B может повлиять на X и связанные компоненты C и D.
> Зависимость является критической/некритической по таким-то причинам.**

---

# 5. Relationship with Architecture Model

Dependency Analysis полностью опирается на Architecture Model.

Architecture Model отвечает:

> **Что существует в системе?**

Dependency Analysis отвечает:

> **Как эти элементы связаны?**

Поэтому:

```text
Architecture Model
        ↓
Dependency Analysis
        ↓
Dependency Understanding
```

Dependency Analysis не создаёт отдельную альтернативную модель системы.

Все зависимости должны быть связаны с существующими элементами Architecture Model.

---

# 6. Dependency Dimensions

AIS должен рассматривать зависимость как многомерное отношение.

## 6.1 Direction

Каждая зависимость должна иметь понятное направление:

```text
A → B
```

где A зависит от B.

Направление должно быть объяснимым.

---

## 6.2 Type

Зависимость может иметь различные типы.

Минимальный концептуальный набор:

### Structural

Связь между архитектурными компонентами.

### Runtime

Зависимость существует во время выполнения.

### Data

Один элемент зависит от данных другого.

### API

Компонент зависит от интерфейса другого компонента.

### Build

Один элемент зависит от другого для создания или поставки системы.

### Security

Безопасность одного элемента зависит от другого.

### Operational

Работоспособность одного элемента зависит от другого.

### External

Зависимость от внешней системы или организации.

### Organizational

Зависимость от человеческого или организационного процесса.

Один dependency relationship может одновременно иметь несколько измерений.

---

# 7. Direct and Transitive Dependencies

## 7.1 Direct Dependency

Прямая зависимость:

```text
A → B
```

A непосредственно зависит от B.

---

## 7.2 Transitive Dependency

Транзитивная зависимость:

```text
A → B → C
```

A может быть затронут изменением C, даже если прямой связи:

```text
A → C
```

нет.

AIS должен уметь отличать:

* direct dependency;
* indirect dependency;
* transitive dependency.

---

# 8. Dependency Context

Каждая значимая зависимость должна иметь контекст.

Минимально AIS должен стремиться объяснить:

1. кто зависит;
2. от кого зависит;
3. зачем существует зависимость;
4. какой тип зависимости;
5. насколько она критична;
6. какие последствия возможны;
7. какие элементы зависят от неё дальше;
8. какие риски связаны с ней;
9. какие изменения могут её нарушить;
10. какие рекомендации относятся к ней.

---

# 9. Dependency Criticality

Не все зависимости одинаково важны.

AIS должен различать как минимум:

* низкую;
* среднюю;
* высокую;
* критическую.

Но уровень критичности не должен определяться исключительно количеством связей.

Критичность должна учитывать контекст.

Например:

```text
A → B
```

может быть значительно важнее:

```text
C → D
```

если B является:

* единственной точкой доступа;
* security boundary;
* критическим сервисом;
* источником важных данных;
* частью business-critical flow.

---

# 10. Critical Dependencies

AIS должен выявлять зависимости, которые создают особенно высокий системный риск.

Примеры:

### Single Point Dependency

Множество критических компонентов зависят от одного элемента.

```text
A ─┐
B ─┼→ X
C ─┘
```

Проблема:

> отказ X способен одновременно повлиять на A, B и C.

---

### Critical Chain

```text
A → B → C → D
```

Если D недоступен, последствия могут распространиться на всю цепочку.

---

### Hidden Dependency

Зависимость существует фактически, но не очевидна из архитектурного представления.

---

### Excessive Coupling

Компонент имеет слишком большое количество значимых связей.

---

### Circular Dependency

```text
A → B → C → A
```

Циклическая зависимость должна быть не просто обнаружена, но объяснена.

---

# 11. Dependency Patterns

AIS должен уметь распознавать архитектурно значимые паттерны зависимостей.

Минимальный набор:

* single point dependency;
* dependency chain;
* dependency hub;
* circular dependency;
* excessive coupling;
* hidden dependency;
* critical external dependency;
* shared dependency;
* cascading dependency;
* security-sensitive dependency.

Это не означает, что каждый паттерн автоматически является проблемой.

AIS должен объяснять **почему конкретный паттерн является или не является проблемой в данном контексте**.

---

# 12. Dependency and Security

Dependency Analysis должен быть тесно связан с Security Analysis.

Security Analysis отвечает:

> Где существует security risk?

Dependency Analysis помогает ответить:

> **Как этот риск может распространиться по системе?**

Например:

```text
External API
     ↓
Service A
     ↓
Service B
     ↓
Database
```

Если Service A имеет security vulnerability, Dependency Analysis позволяет определить потенциальную область распространения воздействия.

Поэтому Security Analysis не должен рассматривать vulnerability изолированно от dependency context.

---

# 13. Dependency and Change Impact

Dependency Analysis является фундаментом Change Impact Assessment.

Если пользователь спрашивает:

> «Что произойдёт, если я изменю Service A?»

AIS должен использовать dependency information для определения:

```text
Service A
   ↓
API B
   ↓
Service C
   ↓
Database D
```

и затем сформировать:

> потенциальную область воздействия.

Таким образом:

```text
Dependency Analysis
        ↓
Change Impact Assessment
```

Dependency Analysis не заменяет Change Impact Assessment.

Он предоставляет ему структурный контекст.

---

# 14. Dependency and Architecture Evolution

Dependency Analysis должен учитывать изменение системы во времени.

Сегодня:

```text
A → B
```

Завтра:

```text
A → C
C → B
```

Важно не только текущее состояние.

AIS должен понимать:

* когда зависимость появилась;
* когда исчезла;
* как она изменилась;
* почему изменение произошло;
* какие последствия оно имело.

Dependency Analysis поэтому связан с Architecture Evolution.

---

# 15. Dependency and Knowledge

Dependency Analysis создаёт Knowledge о системе.

Например:

> Service A использует Service B для получения данных X.

Со временем AIS может установить:

> Service B является критическим dependency для пяти компонентов и был источником нескольких архитектурных изменений.

Это уже не просто dependency record.

Это **накопленное архитектурное знание**.

---

# 16. Dependency and AI Assistance

AI Assistance должен использовать Dependency Analysis как контекст.

Пользователь может спросить:

> «Что наиболее связано с этим сервисом?»

AIS должен отвечать не только списком.

Он должен объяснять:

* основные зависимости;
* характер связи;
* критичность;
* потенциальные последствия;
* связанные риски;
* историю изменения;
* рекомендации.

AI не должен придумывать dependency relationships.

Ответ должен опираться на Architecture Model и подтверждённые данные.

---

# 17. Dependency Recommendations

AIS может формировать рекомендации на основе зависимостей.

Например:

> Service A имеет 17 значимых зависимостей, из которых 4 являются критическими. Большинство проходит через Service B, создавая концентрацию риска.

Рекомендация:

> Рассмотреть снижение зависимости от Service B.

Но рекомендация должна содержать:

1. причину;
2. доказательства;
3. affected components;
4. потенциальную пользу;
5. возможные trade-offs;
6. уровень уверенности.

---

# 18. Explainability

Каждый существенный вывод Dependency Analysis должен быть объясним.

Нельзя:

> **Critical dependency detected.**

Нужно:

> **Service B является критической зависимостью для Services A, C и D, поскольку все три используют его для выполнения обязательного workflow. При недоступности B эти workflows становятся недоступны.**

Объяснение должно позволять пользователю самостоятельно проверить вывод.

---

# 19. User Value

## 19.1 Developer

### Problem

Разработчик не знает полный набор последствий изменения компонента.

### AIS помогает

Показывает:

* кто зависит от компонента;
* от чего зависит компонент;
* потенциальную область воздействия.

### Result

Меньше неожиданных регрессий.

---

## 19.2 Tech Lead

### Problem

Сложно объективно оценивать coupling и архитектурные риски.

### AIS помогает

Показывает:

* critical dependencies;
* coupling;
* dependency chains;
* architectural hotspots.

### Result

Более обоснованные архитектурные решения.

---

## 19.3 Architect

### Problem

Архитектурные решения часто принимаются без полной картины зависимостей.

### AIS помогает

Проверять:

* насколько новая архитектура связана с существующей;
* где возникают новые coupling points;
* какие зависимости становятся критическими.

### Result

Возможность проверять архитектурные гипотезы до реализации.

---

## 19.4 Security Engineer

### Problem

Security risk невозможно правильно оценить без понимания распространения воздействия.

### AIS помогает

Связывает:

```text
Vulnerability
     ↓
Component
     ↓
Dependencies
     ↓
Attack / Impact Path
```

### Result

Приоритизация реальных рисков вместо изолированного списка findings.

---

## 19.5 CTO

### Problem

Руководителю сложно увидеть системные зависимости и концентрацию риска.

### AIS помогает

Показывает:

* критические системные зависимости;
* single points;
* external dependencies;
* концентрацию риска;
* архитектурные hotspots.

### Result

Более предсказуемые технические и бизнес-решения.

---

# 20. Relationship with All Product Capabilities

Dependency Analysis должен быть связан со всеми 11 capabilities.

| Capability               | Relationship                                              |
| ------------------------ | --------------------------------------------------------- |
| Project Discovery        | предоставляет исходные элементы и связи                   |
| Architecture Modeling    | является основой представления dependencies               |
| Security Analysis        | использует dependencies для оценки распространения риска  |
| Dependency Analysis      | центральная capability данного документа                  |
| Change Impact Assessment | использует dependency context                             |
| Knowledge Persistence    | сохраняет dependency knowledge                            |
| Technical Debt Tracking  | использует problematic dependencies для определения debt  |
| AI Assistance            | объясняет dependency relationships                        |
| Report Generation        | формирует dependency reports                              |
| Visualization            | отображает relationships                                  |
| Organization Adaptation  | позволяет учитывать организационный контекст dependencies |

Ни одна capability не должна создавать параллельную независимую dependency model.

---

# 21. Dependency Lifecycle

Dependency Analysis должен проходить через жизненный цикл:

```text
Unknown
   ↓
Discovered
   ↓
Identified
   ↓
Connected
   ↓
Understood
   ↓
Evaluated
   ↓
Validated
   ↓
Evolved
   ↓
Historical
```

### Unknown

AIS ещё не знает о зависимости.

### Discovered

Связь обнаружена.

### Identified

Определены участвующие элементы.

### Connected

Связь привязана к Architecture Model.

### Understood

Определены смысл и контекст.

### Evaluated

Оценены критичность и последствия.

### Validated

Вывод подтверждён или скорректирован.

### Evolved

Dependency изменилась.

### Historical

Сохранено понимание её прошлого состояния.

---

# 22. Confidence

Не каждая dependency relationship может быть определена с одинаковой уверенностью.

AIS должен различать:

* confirmed;
* high confidence;
* probable;
* uncertain;
* disputed.

Низкая уверенность не должна превращаться в утверждение факта.

AIS должен явно показывать:

> «Это предположение, а не подтверждённая зависимость».

---

# 23. Contradictory Dependencies

Источники информации могут противоречить друг другу.

Например:

Источник A:

> A → B

Источник B:

> A больше не использует B.

AIS не должен молча выбирать один вариант.

Он должен:

1. обнаружить конфликт;
2. сохранить обе позиции;
3. оценить достоверность;
4. запросить подтверждение при необходимости;
5. сохранить результат разрешения конфликта.

Это соответствует принципу:

> **Knowledge Never Lost.**

---

# 24. Dependency Visualization

Visualization должна позволять исследовать зависимости на нескольких уровнях.

### Level 1 — Overview

Основные компоненты и наиболее важные связи.

### Level 2 — Component

Все значимые dependencies выбранного компонента.

### Level 3 — Path

Конкретная dependency chain.

### Level 4 — Impact

Зависимости, относящиеся к конкретному риску или изменению.

### Level 5 — Historical

Изменение dependency structure во времени.

Визуализация не должна заменять объяснение.

---

# 25. Dependency Queries

AIS должен поддерживать вопросы естественного языка.

Примеры:

> От чего зависит этот сервис?

> Кто зависит от этого компонента?

> Какие критические зависимости есть в системе?

> Где у нас single points of dependency?

> Какие внешние системы являются критическими?

> Что произойдёт, если Service B станет недоступен?

> Какие зависимости изменились недавно?

> Какие сервисы наиболее связаны между собой?

> Какие зависимости создают security risk?

Ответ должен строиться на существующей Architecture Model и Knowledge.

---

# 26. Success Criteria

Dependency Analysis считается успешно реализованным на продуктово-функциональном уровне, если:

1. Значимые зависимости обнаруживаются и связываются с Architecture Model.
2. Направление зависимости понятно.
3. Тип зависимости определяется или явно обозначается как неизвестный.
4. Прямые и транзитивные зависимости различаются.
5. Критические dependencies выделяются.
6. Dependency chains доступны для исследования.
7. Dependency information используется Change Impact Assessment.
8. Dependency information используется Security Analysis.
9. Существенные выводы объяснимы.
10. Неопределённость явно отображается.
11. История изменения dependencies не уничтожается.
12. AI не создаёт неподтверждённые relationships.
13. Пользователь может исследовать dependencies как через визуальное представление, так и через вопросы.
14. Dependency Analysis не создаёт отдельную альтернативную модель системы.

---

# 27. Product Quality Criteria

Dependency Analysis должен соответствовать следующим требованиям качества.

### Context over volume

Лучше показать 10 действительно важных dependencies, чем 1 000 необъяснимых связей.

### Explainability over complexity

Каждый важный вывод должен быть понятен пользователю.

### Model over files

Dependency Analysis работает с архитектурными сущностями, а не только с файлами.

### Understanding over detection

Обнаружение dependency является промежуточным результатом.

Конечный результат:

> **понимание зависимости и её значения.**

### History is preserved

Изменение dependency не должно уничтожать предыдущую информацию.

---

# 28. What Dependency Analysis Is NOT

Dependency Analysis AIS не является:

1. package manager;
2. dependency installer;
3. dependency updater;
4. обычным dependency scanner;
5. только графом;
6. только списком библиотек;
7. только static analysis;
8. только runtime monitoring;
9. vulnerability scanner;
10. replacement for Architecture Model;
11. replacement for Change Impact Assessment;
12. replacement for Security Analysis;
13. automatic refactoring system;
14. automatic architecture correction system.

---

# 29. Non-Goals

В рамках данной specification AIS не обязан:

* автоматически изменять зависимости;
* автоматически удалять dependencies;
* автоматически рефакторить архитектуру;
* автоматически исправлять circular dependencies;
* автоматически заменять библиотеки;
* принимать архитектурные решения вместо человека.

AIS:

> **обнаруживает → связывает → объясняет → оценивает → рекомендует.**

Человек:

> **принимает решение.**

---

# 30. Architectural Principle

Dependency Analysis должен усиливать центральную идею AIS:

> **AIS не просто показывает, из чего состоит система. AIS объясняет, как части системы зависят друг от друга и почему эти зависимости имеют значение.**

Dependency Analysis не является самостоятельным островом.

Он является связующим слоем между:

```text
Architecture Model
       ↓
Dependencies
       ↓
Security
       ↓
Change Impact
       ↓
Knowledge
       ↓
Recommendations
       ↓
Decision
```

---

# 31. Final Product Definition

**Dependency Analysis — это способность AIS строить, объяснять и развивать во времени понимание взаимозависимостей программной системы, связывая структурные отношения с архитектурным контекстом, рисками, изменениями и последствиями.**

Главная ценность capability заключается не в том, что AIS знает:

> «A зависит от B».

А в том, что AIS способен объяснить:

> **почему A зависит от B, насколько эта зависимость важна, что произойдёт при её изменении, какие части системы будут затронуты и какое решение имеет смысл рассмотреть.**

---

# 32. Specification Boundary

Данный документ определяет **что Dependency Analysis должен означать для продукта**.

Документ намеренно не определяет:

* конкретные технологии;
* алгоритмы обнаружения;
* форматы данных;
* способы хранения;
* внутренние компоненты;
* программные интерфейсы;
* конкретные анализаторы;
* способы интеграции с SIP;
* реализацию графовой модели.

SIP может в будущем выступать одним из источников технических наблюдений для Dependency Analysis, но **Dependency Analysis не должен зависеть от SIP как от единственного источника данных**.

Это сохраняет архитектурную независимость AIS и соответствует принципу:

> **Источник данных ≠ продуктовая capability.**

---

# 33. Verification Checklist

Перед принятием TASK-PRODUCT-SPEC-007 необходимо проверить:

* [ ] Dependency Analysis определён через пользовательскую ценность.
* [ ] Dependency Analysis не сводится к dependency graph.
* [ ] Все dependencies связаны с Architecture Model.
* [ ] Direct и transitive dependencies различаются.
* [ ] Dependency criticality имеет контекст.
* [ ] Security Analysis использует dependency context.
* [ ] Change Impact использует dependency context.
* [ ] Evolution сохраняет историю dependencies.
* [ ] Knowledge накапливает dependency understanding.
* [ ] AI не создаёт неподтверждённые зависимости.
* [ ] Неопределённость явно отображается.
* [ ] Dependency Analysis не создаёт альтернативную модель.
* [ ] Все 11 capabilities имеют определённую связь с Dependency Analysis.
* [ ] Нет implementation-specific требований.
* [ ] SIP не становится обязательной частью capability.
* [ ] Документ не расширяет MVP без отдельного продуктового решения.

---

# 34. Acceptance Statement

TASK-PRODUCT-SPEC-007 считается завершённой только после прохождения:

1. Dependency Review
2. Dependency Lifecycle Audit
3. Architecture Model Alignment Audit
4. Security Integration Audit
5. Change Impact Integration Audit
6. Knowledge Integration Audit
7. Capability Alignment Audit
8. User Value Audit
9. Scope Audit
10. Long-term Stability Audit
11. Cross-Document Consistency Audit
12. Product Decision Framework Audit

После прохождения аудитов документ может быть принят как официальная Product Specification для **Dependency Analysis**.
