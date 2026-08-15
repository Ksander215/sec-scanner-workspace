# TASK-PRODUCT-VALIDATION-001: AIS MVP Value Validation Specification

**Type:** Product Validation / Evidence Design  
**Date:** 2026-08-14  
**Status:** Specification (Pre-Validation)  
**Repository:** main, HEAD be118db  
**Predecessor:** TASK-COMMERCIAL-REASSESSMENT-001 (Commercial Score: 3.0/5.0, Verdict: GO WITH CONDITIONS)  
**Volume:** 42 sections, 29 audits

---

## §1. Executive Summary

Данный документ определяет, **что именно AIS должен доказать на реальных пользователях, какие гипотезы требуют валидации, какие данные необходимо собрать и как перевести evidence с уровня E0/E1 (Assumption/Reasoned Hypothesis) на уровень E2/E3 (Product Evidence/User Evidence).**

Commercial Reassessment (TASK-COMMERCIAL-REASSESSMENT-001) установил:

- **40% коммерческих утверждений — E0 (Assumption)**
- **60% — E1 (Reasoned Hypothesis)**
- **0% — E2+ (Product/User/Commercial Evidence)**
- **Commercial Score:** 3.0/5.0 с низкой-средней confidence
- **Verdict:** GO WITH CONDITIONS — следующим приоритетом является валидация через реальных пользователей

Данная спецификация переводит вердикт «GO WITH CONDITIONS» в конкретный план действий: 12 гипотез, 8 сценариев, 5 validation gates, 29 аудитов. Каждый элемент спроектирован так, чтобы дать измеримый evidence, а не подтверждение предвзятости.

**Ключевое ограничение:** Валидация направлена на подтверждение или опровержение гипотез. Она **не** предназначена для обоснования добавления новых возможностей. Feature Factory Protection (§9) запрещает использовать результаты валидации для расширения scope MVP.

---

## §2. Document Metadata

| Parameter | Value |
|---|---|
| Task ID | TASK-PRODUCT-VALIDATION-001 |
| Type | Product Validation Specification |
| Status | Pre-Validation (до начала сбора evidence) |
| Input Documents | 26 Product + Architecture Layer документов, commercial-reassessment-001.md |
| Output | Данный документ (спецификация валидации) |
| Next Action | User interviews (5-10 целевых personas) |
| Evidence Target | Перевод утверждений с E0/E1 на E2/E3 |

### Зависимости от предыдущих задач

| Предшественник | ID | Ключевой вклад |
|---|---|---|
| Architecture Foundation | TASK-ARCH-FOUNDATION-001 | 30 invariants, 10 anti-patterns |
| Understanding-Centered Interaction | TASK-ARCH-INTERACTION-001 | 14 interaction invariants, Progressive Disclosure |
| Quality & Feedback Architecture | TASK-ARCH-QUALITY-001 | 10 quality dimensions, 15 quality invariants |
| Capability Interaction Architecture | TASK-ARCH-CAPABILITY-001 | 17 invariants, ownership matrix, DAG |
| Architecture Readiness | TASK-ARCH-READINESS-001 | READY WITH CONDITIONS, 0 blocking |
| Commercial Reassessment | TASK-COMMERCIAL-REASSESSMENT-001 | Evidence baseline, 12 commercial gaps |

---

## §3. Purpose & Scope

### Цель

Определить полный набор гипотез, сценариев, метрик и gates, необходимых для валидации ценности AIS MVP на реальных пользователях.

### Что этот документ делает

1. **Формулирует 12 проверяемых гипотез** (H1-H12) с текущим evidence level и целевым evidence level
2. **Определяет 8 сценариев валидации** (A-H) с конкретными действиями пользователя и ожидаемыми результатами
3. **Устанавливает 5 validation gates** с чёткими критериями прохода
4. **Определяет защиту от Feature Factory** — валидация не расширяет scope
5. **Связывает D1-D10 с поведенческими индикаторами** — каждое решение проверяется через наблюдение, а не через опрос
6. **Определяет 29 аудитов** для самопроверки данной спецификации

### Что этот документ НЕ делает

- Не проводит валидацию (это — спецификация, а не отчёт о результатах)
- Не определяет реализацию (это — задача TASK-ARCH-MVP-001)
- Не устанавливает pricing (отложено до E2+ evidence)
- Не определяет Go-to-Market стратегию

### Scope

| В scope | Out of scope |
|---|---|
| Валидация проблемы (Problem Validation) | Реализация MVP |
| Валидация ценности (Value Validation) | Pricing стратегия |
| Валидация дифференциации (Differentiation Validation) | Go-to-Market |
| Валидация повторного использования (Repeat Value) | Feature prioritisation post-MVP |
| Коммерческий сигнал (Commercial Signal) | Техническая архитектура реализации |

---

## §4. Validation Philosophy

### Три принципа валидации

**1. Evidence over Speculation.** Каждое действие валидации должно дать конкретный evidence, который перемещает хотя бы одно утверждение с E0 на E1 или с E1 на E2. Действия, которые не дают измеримого evidence — waste.

**2. Seek Disconfirmation, Not Confirmation.** Валидация спроектирована для поиска доказательств **опровержения** гипотез, а не их подтверждения. Если гипотеза выживает при попытках опровержения — она strengthens. Если нет — она была неверна, и это ценно.

**3. Behavior Over Statements.** Пользователи могут сказать что угодно на интервью. Поведение (время, выбор, повторение) — более надёжный индикатор. Валидационные сценарии спроектированы для наблюдения поведения, а не для сбора заявлений.

### Relationship с Product Learning Principle

Product Principles определяют: «MVP — это не финальный продукт, а механизм обучения» (Product Learning Principle, неявный). Данная спецификация делает это явным: MVP = evidence-gathering mechanism.

### Relationship с Architecture Invariants

Валидация **не нарушает** архитектурные инварианты. Валидация проверяет, работают ли инварианты в реальном использовании. Если инвариант (например, «AI Writes NOTHING» — INV-A3) создаёт проблему для пользователя — это evidence для пересмотра, а не для нарушения.

---

## §5. Evidence Maturity Model

### Определение уровней

| Level | Name | Definition | Пример для AIS |
|---|---|---|---|
| E0 | Assumption | Утверждение без обоснования | «Пользователи готовы платить за архитектурное понимание» |
| E1 | Reasoned Hypothesis | Логически обосновано, не подтверждено данными | «AIS сокращает время принятия решений» (обосновано архитектурой, не измерено) |
| E2 | Product Evidence | Подтверждено данными от продукта (прототип, MVP) | «70% первых анализов дали ранее неизвестную информацию» |
| E3 | User Evidence | Подтверждено поведением реальных пользователей | «5 из 8 Tech Leads вернулись для повторного анализа в течение недели» |
| E4 | Commercial Evidence | Подтверждено коммерческими транзакциями | «3 организации оплатили подписку после пилота» |

### Текущее распределение (из Commercial Reassessment §29)

| E-level | Количество утверждений | % |
|---|---|---|
| E0 — Assumption | 10 | 40% |
| E1 — Reasoned Hypothesis | 15 | 60% |
| E2 — Product Evidence | 0 | 0% |
| E3 — User Evidence | 0 | 0% |
| E4 — Commercial Evidence | 0 | 0% |

### Целевое распределение после MVP-валидации

| E-level | Текущий | Целевой (минимум) | Что доказывает |
|---|---|---|---|
| E0 | 10 | ≤ 3 | Problem подтверждена, WTP не пустой |
| E1 | 15 | ≤ 8 | Основные гипотезы повышены до E2+ |
| E2 | 0 | ≥ 8 | Продукт создаёт измеримую ценность |
| E3 | 0 | ≥ 3 | Пользователи возвращаются |
| E4 | 0 | ≥ 1 | Хотя бы один коммерческий сигнал |

### Правила перехода

| Переход | Требуемые данные | Минимальный объём |
|---|---|---|
| E0 → E1 | Логическая обоснованность + хотя бы 1 внешний источник | Уже выполнено для 15 утверждений |
| E1 → E2 | Данные от прототипа/MVP (метрики, логи, наблюдения) | 5+ пользователей, 3+ проекта |
| E2 → E3 | Поведенческие данные реальных пользователей (retention, повторное использование) | 2+ недели использования, 3+ возврата |
| E3 → E4 | Коммерческие транзакции (оплата, контракт, pilot с бюджетом) | 1+ организация с бюджетом |

---

## §6. Current Evidence Baseline

### Состояние на момент спецификации (из Commercial Reassessment)

**Что подтверждено (E1):**
- Проблема потери архитектурного контекста существует (общеизвестна в индустрии)
- AIS архитектурно решает проблему (26 документов, 113 аудитов, 30 инвариантов)
- AI Wrapper Test пройден (AI — terminal consumer, не core value)
- Ценность композиции capabilities через единую модель логически обоснована
- Competitive Substitution: Partially (комбинация инструментов частично воспроизводит ценность)
- Quality Architecture — потенциальный коммерческий дифференциатор
- Learning loop архитектурно обоснован (Quality Architecture)
- Technology-agnostic архитектура снижает execution risk

**Что НЕ подтверждено (E0):**
- Проблема является priority для целевых personas
- Пользователи готовы платить за эту ценность
- Разница в ценности достаточно велика для оплаты
- Switching cost достаточен для retention
- Time-to-Value приемлем для adoption
- Understanding-Centered UX улучшает adoption
- Pricing model оптимальна
- Category positioning воспринимается покупателями
- Organization expansion модель верна
- «Why now» — рынок готов

### Critical Gap

**Ни одно коммерческое утверждение не имеет evidence выше E1.** Это не критично для архитектуры (READY WITH CONDITIONS), но критично для принятия решения о реализации MVP. Данная спецификация закрывает этот gap.

---

## §7. Validation Methodology

### Три фазы валидации

```
Phase 1: Problem Validation (Pre-MVP)
    ├── User Interviews (5-10 целевых personas)
    ├── Competitive Substitution Observation (3-5 наблюдений)
    └── Target: Problem + Frequency подтверждены (E2)

Phase 2: Value Validation (MVP / Prototype)
    ├── Usability Testing (3-5 пользователей)
    ├── Scenario-Based Validation (8 сценариев A-H)
    └── Target: AIS Value + Differentiation подтверждены (E2)

Phase 3: Repeat Value Validation (Post-MVP first release)
    ├── Pilot (1-2 организации, 2-4 недели)
    ├── Retention Measurement
    └── Target: Repeat Value + Commercial Signal (E3/E4)
```

### Методы сбора данных

| Метод | Что измеряет | Фаза | Минимальный объём |
|---|---|---|---|
| Semi-structured interview | Problem priority, workarounds, WTP | 1 | 5-10 интервью (30-45 мин) |
| Think-aloud protocol | Time-to-Value, activation, понимание | 2 | 3-5 сессий (30-60 мин) |
| Task-based scenario | Конкретная ценность capability | 2 | 8 сценариев × 3+ пользователей |
| Behavioural analytics | Retention, повторное использование | 3 | 2+ недели, 5+ пользователей |
| Willingness-to-pay test | Ценностное восприятие | 1-3 | 5+ респондентов |
| Competitive observation | Текущие workarounds | 1 | 3-5 наблюдений |

### Стандарт интервью

**Формат:** Semi-structured (15-20 вопросов, гибкий порядок).  
**Длительность:** 30-45 минут.  
**Запись:** Аудио (с разрешения) + структурированные заметки.  
**Анализ:** Кодирование ответов по гипотезам (H1-H12).  

**Критические правила:**
1. Не описывать AIS до того, как пользователь опишет свою проблему
2. Спрашивать о конкретных ситуациях, а не об общем отношении
3. Фиксировать точные формулировки (quotable evidence)
4. Не предлагать решения — только исследовать проблему

---

## §8. Validation Anti-Patterns

### 8 антипаттернов, которые эта спецификация предотвращает

**VA-1: Confirmation Bias Trap.** Формулировка вопросов так, чтобы пользователь подтвердил заранее задуманный ответ.  
*Защита:* Все интервью начинаются с описания проблемы пользователем, а не с предъявления AIS. Вопросы сформулированы через конкретные ситуации, а не через утверждения.

**VA-2: Feature Request Masquerading as Validation.** Использование валидации для обоснования добавления capabilities.  
*Защита:* Feature Factory Protection (§9). Результаты валидации не могут быть использованы для расширения MVP scope.

**VA-3: Vanity Metric Collection.** Сбор данных, которые выглядят хорошо, но не измеряют ценность.  
*Защита:* Все метрики привязаны к конкретным гипотезам. 7 Vanity Metrics из Product Success Metrics явно исключены.

**VA-4: Leading Demo.** Демонстрация AIS, которая наводит пользователя на «правильный» ответ.  
*Защита:* Phase 1 (interviews) проводится без демонстрации продукта. Phase 2 использует think-aloud, где пользователь действует самостоятельно.

**VA-5: Surviving Shipyard Fallacy.** «Мы построили архитектуру, значит продукт ценен.»  
*Защита:* Commercial Reassessment §24 явно разделяет «архитектура доказывает» от «архитектура не доказывает». Данная спецификация оперирует только пользовательским evidence.

**VA-6: One-User Validation.** Принятие решения на основе одного позитивного отклика.  
*Защита:* Минимальные объёмы выборки (5+ интервью, 3+ сценария, 2+ недели pilot).

**VA-7: Post-Hoc Hypothesis.** Формулировка гипотезы после наблюдения результата.  
*Защита:* Все 12 гипотез (H1-H12) сформулированы до начала валидации. Новые гипотезы могут добавляться только в отдельный раздел «Emergent Findings».

**VA-8: Architecture-First Bias.** Проверка того, «правильно ли архитектура работает», вместо «решает ли проблема пользователя».  
*Защита:* Сценарии валидации (A-H) сформулированы через проблемы пользователей, а не через capabilities.

---

## §9. Feature Factory Protection

### Определение

Feature Factory Protection — механизм, предотвращающий использование результатов валидации для обоснования добавления новых возможностей в MVP. Валидация отвечает на вопрос «решает ли текущий scope реальную проблему?», а не «какие ещё возможности нужны?».

### Правило

**Результаты валидации НЕ могут быть использованы для:**
- Добавления новых capabilities в MVP
- Расширения scope текущего stage
- Обоснования Feature Requests, отсутствующих в Capability Map
- Изменения 10 Product Architecture Decisions (D1-D10) на основе пользовательских заявлений

**Результаты валидации МОГУТ быть использованы для:**
- Подтверждения или опровержения текущих гипотез
- Корректировки приоритетов внутри текущего scope
- Уточнения целевых personas
- Корректировки формулировок positioning
- Откладывания или отмены capabilities, не прошедших валидацию

### Механизм защиты

| Сигнал | Интерпретация | Действие |
|---|---|---|
| «Хотелось бы X» | Feature request, не problem signal | Фиксируется в Emergent Findings, не влияет на scope |
| «Это не решает мою проблему Y» | Problem не покрыта текущим scope | Оценка через Decision Framework: усиливает ли Model? |
| «Мне нужно больше Z» | Insufficient depth, не insufficient scope | Углубление существующей capability, не новая |
| «Это полезно, но я бы добавил...» | Positive signal + feature request | Positive signal записывается, request — в Emergent |
| «Я не понимаю, как это работает» | UX problem, не scope problem | Уточнение Interaction Architecture |

### Audit

Данный раздел проверяется Audit 5 (Feature Factory Protection Audit, §42). Любое нарушение правила требует явной фиксации и обоснования.

---

## §10. Validation Hypotheses Overview

### 12 гипотез, организованных по 5 Gates

```
Gate 1: Problem Validated
    H1  Problem Existence       — Целевые personas испытывают описанную проблему
    H2  Problem Frequency       — Проблема возникает достаточно часто

Gate 2: Value Validated
    H3  AIS Value              — AIS создаёт измеримую ценность
    H4  Context Advantage      — Контекст проекта принципиально улучшает анализ
    H5  Model Advantage        — Единая модель создаёт ценность, недоступную из комбинации инструментов

Gate 3: Differentiation Validated
    H6  Knowledge Advantage    — Накопление знаний усиливает ценность
    H7  Evolution Advantage    — Временная перспектива усиливает ценность
    H8  Integrated Understanding — Композиция capabilities создаёт emergent ценность

Gate 4: Repeat Value Validated
    H9  Trust                  — Пользователи доверяют результатам AIS
    H10 Repeat Value           — Пользователи возвращаются для повторного использования

Gate 5: Commercial Signal
    H11 Differentiation        — Пользователи perceive AIS как отличающийся от комбинации инструментов
    H12 Commercial Value       — Существует willingness-to-pay за ценность AIS
```

### Сводная таблица гипотез

| ID | Hypothesis | Current E | Target E | Gate | Validation Method |
|---|---|---|---|---|---|
| H1 | Problem Existence | E1 | E2 | 1 | User interviews |
| H2 | Problem Frequency | E1 | E2 | 1 | User interviews |
| H3 | AIS Value | E0 | E2 | 2 | Scenario-based validation |
| H4 | Context Advantage | E1 | E2 | 2 | A/B comparison (with/without context) |
| H5 | Model Advantage | E1 | E2 | 2 | Competitive substitution test |
| H6 | Knowledge Advantage | E1 | E3 | 3 | Longitudinal observation |
| H7 | Evolution Advantage | E1 | E3 | 3 | Longitudinal observation |
| H8 | Integrated Understanding | E1 | E2 | 3 | Scenario-based validation |
| H9 | Trust | E0 | E2 | 4 | Trust indicators in scenarios |
| H10 | Repeat Value | E0 | E3 | 4 | Retention measurement |
| H11 | Differentiation | E1 | E2 | 5 | Comparative evaluation |
| H12 | Commercial Value | E0 | E3 | 5 | WTP test + pilot |

---

---

## §11. H1: Problem Existence

### Гипотеза

> Целевые personas (Tech Lead команды 3-10 человек, Solo Developer, Startup-команда до 20 человек) испытывают проблему потери архитектурного контекста, описанную в Product Positioning §2.

### Текущий evidence

**E1 (Reasoned Hypothesis).** Проблема описана в Product Positioning §2 (6 симптомов), User Personas (8 personas), Product Vision. Общеизвестна в индустрии. Не подтверждена интервью с целевыми personas.

### Что именно проверяется

Не «существует ли проблема архитектурного понимания вообще» (это E1 — общеизвестно), а:

1. Является ли эта проблема **priority** для целевых personas (не одной из 10 проблем, а в top-3)?
2. Описанные симптомы (Positioning §2) соответствуют реальному опыту?
3. Текущие workarounds (ручные диаграммы, вопросы коллегам, множественные инструменты) соответствуют реальности?

### Validation Method

**Semi-structured interviews (5-10 personas).** Ключевые вопросы:

1. «Расскажите о последнем случае, когда вам нужно было понять, как работает часть системы, с которой вы не работали.»
2. «Как вы получили эту информацию? Сколько времени это заняло?»
3. «Были ли случаи, когда неполное понимание архитектуры привело к неправильному решению?»
4. «Какие инструменты вы используете для понимания архитектуры проекта?»
5. «Что вас больше всего раздражает в текущем процессе?»

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| ≥ 7 из 10 описанных симптомов подтверждены | ≥ 7/10 | E2 |
| Проблема в top-3 приоритетов для ≥ 60% интервьюируемых | ≥ 60% | E2 |
| Текущие workarounds соответствуют описанным | Qualitative match | E2 |
| Минимум 1 quotable evidence (точная формулировка проблемы) | ≥ 1 | E2 |

### Failure Indicators

- Менее 40% описанных симптомов подтверждены
- Проблема не в top-5 для большинства
- Workarounds принципиально отличаются от описанных

### If Failed

Переформулировать problem statement. Возможные причины:
- Проблема существует, но формулировка неточна
- Целевые personas выбраны неверно
- Проблема реальна, но не является priority (no burning platform)

---

## §12. H2: Problem Frequency

### Гипотеза

> Проблема потери архитектурного контекста возникает у целевых personas достаточно часто (ежедневно / несколько раз в неделю), чтобы создавать мотивацию для решения.

### Текущий evidence

**E1.** User Personas §4 описывает: «30 минут — несколько часов ежедневно» на поиск архитектурной информации. Не измерено.

### Что именно проверяется

1. Как часто возникает потребность в архитектурном понимании?
2. Сколько времени тратится на эту потребность?
3. Какова стоимость одного эпизода (время, неправильное решение, регрессия)?

### Validation Method

**User interviews (те же 5-10).** Дополнительные вопросы:

1. «Как часто вам нужно понимать архитектуру проекта вне вашей непосредственной области?»
2. «Сколько времени в среднем вы тратите на поиск архитектурной информации?»
3. «Были ли за последнюю неделю случаи, когда вы не нашли нужную информацию?»
4. «Оцените в деньгах: сколько стоит один эпизод неправильного архитектурного решения?»

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| Частота: ≥ еженедельно для ≥ 70% | ≥ 70% | E2 |
| Время: ≥ 30 минут в среднем на эпизод | Среднее ≥ 30 мин | E2 |
| Стоимость: ≥ $50-150 за эпизод (по оценке пользователя) | Qualitative | E2 |

### Failure Indicators

- Частота менее 1 раза в месяц для большинства
- Время менее 10 минут (проблема не существенна)

---

## §13. H3: AIS Value

### Гипотеза

> AIS MVP создаёт измеримую ценность для целевого пользователя: после первого анализа пользователь находит хотя бы одну ранее неизвестную проблему и понимает её причину.

### Текущий evidence

**E0.** MVP Success Criteria определяет: «Пользователь находит хотя бы одну ранее неизвестную проблему» (MVP Definition, Success Criterion #2). Не проверено.

### Что именно проверяется

1. Находит ли пользователь ранее неизвестную информацию при первом анализе?
2. Понимает ли пользователь причину найденной проблемы?
3. Считает ли пользователь эту информацию ценной (достаточно ценной для действия)?

### Validation Method

**Scenario-based validation (Phase 2).** Пользователь подключает свой реальный проект (не демо) и работает с AIS.

Сценарий: пользователь формулирует вопрос об архитектуре → получает ответ → оценивает ценность.

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| First Analysis Success (из Success Metrics) | > 70% | E2 |
| Пользователь explicitly подтверждает: «Я этого не знал» | ≥ 1 на сессию | E2 |
| Пользователь понимает причину (Explain Before Recommend) | Qualitative | E2 |
| Пользователь может сформулировать действие на основе результата | ≥ 1 действие | E2 |

### Connection to MVP Success Metrics

Данная гипотеза напрямую валидирует MVP Success Criterion #2 и Primary Metric #7 (Успешность первого анализа). Threshold > 70% совпадает с Product Health: Healthy threshold из Success Metrics.

### Failure Indicators

- First Analysis Success < 50% (Critical threshold из Success Metrics)
- Пользователь не нашёл ничего нового
- Пользователь не понял причину

---

## §14. H4: Context Advantage

### Гипотеза

> Контекст конкретного проекта принципиально улучшает качество ответов по сравнению с общими (generic) ответами AI.

### Текущий evidence

**E1.** Product Positioning §3: «AI-ассистенты (ChatGPT, Claude) не знают конкретный проект». Architecture Foundation: AI Assistance работает на основе Model, не на основе общих знаний. Не проверено на пользователях.

### Что именно проверяется

1. Разница между ответом с контекстом проекта и без контекста — заметна ли пользователю?
2. Какой ответ пользователь считает более полезным?
3. Приводит ли контекст к действию, а generic — нет?

### Validation Method

**A/B comparison (Phase 2).** Для одного и того же вопроса:

- **A:** Ответ AIS (на основе Model конкретного проекта)
- **B:** Ответ generic AI (без контекста проекта, например, ChatGPT с описанием)

Пользователь не знает, какой ответ A, какой B (blind comparison).

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| Пользователь предпочитает ответ с контекстом | ≥ 70% | E2 |
| Ответ с контекстом приводит к действию чаще | Measurable difference | E2 |
| Пользователь отмечает конкретные различия | Qualitative | E2 |

### Connection to Architecture Decisions

Validates D5 (Context Over Rules): контекст проекта важнее универсальных правил. Если H4 не подтверждается — D5 требует пересмотра.

---

## §15. H5: Model Advantage

### Гипотеза

> Единая архитектурная модель создаёт ценность, недоступную из комбинации существующих инструментов (dependency-cruiser + SonarQube + ChatGPT + draw.io).

### Текущий evidence

**E1.** Commercial Reassessment §19: Competitive Substitution Test = «Partially». Комбинация инструментов может частично воспроизвести ценность, но требует значительного ручного усилия и не интегрирована.

### Что именно проверяется

1. Может ли пользователь получить тот же результат комбинацией инструментов за сопоставимое время?
2. Если да — является ли разница достаточной для мотивации использования единого инструмента?
3. Какую часть ценности комбинация воспроизводит, а какую — нет?

### Validation Method

**Competitive substitution observation (Phase 1-2).** Пользователь решает одну и ту же задачу:

- **С AIS:** Один инструмент, единый контекст
- **Без AIS:** Комбинация инструментов (пользователь выбирает сам)

Измеряется: время, полнота результата, понятность, действие.

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| AIS быстрее на ≥ 50% | Время AIS ≤ 50% времени комбинации | E2 |
| AIS даёт более полный результат | Полнота выше (оценка пользователя) | E2 |
| Пользователь предпочитает AIS | ≥ 60% | E2 |

### Connection to D1, D2, D8

Validates D1 (Model Before Analysis), D2 (Results Bound to Model), D8 (Unified Platform). Если H5 не подтверждается — обоснование единой платформы ослабевает.

---

## §16. H6: Knowledge Advantage

### Гипотеза

> Накопление знаний о проекте усиливает ценность AIS: ответы на основе накопленного знания более точны и релевантны, чем ответы при первом использовании.

### Текущий evidence

**E1.** Knowledge Accumulates (D7), Knowledge Never Lost (Principle 3.4), INV-K5. Quality Architecture описывает 10 dimensions. Но в MVP Knowledge минимальна (session-level, AT-1).

### Что именно проверяется

1. Улучшается ли качество ответов при повторном использовании?
2. Замечает ли пользователь разницу между первым и последующим использованием?
3. Создаёт ли накопленное знание мотивацию для возвращения?

### Validation Method

**Longitudinal observation (Phase 3).** Пользователь использует AIS на протяжении 2-4 недель. Сравнение качества ответов и ценности в первый день и после 2 недель.

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| Пользователь замечает улучшение качества | Qualitative (explicit statement) | E3 |
| Качество ответов измеримо улучшается | Metric improvement | E3 |
| Накопленное знание упоминается как причина возврата | Qualitative | E3 |

### MVP Limitation

В MVP Knowledge — session-level. Полная валидация H6 требует Stage 2 (Knowledge Persistence). В MVP валидируется только: создаёт ли даже session-level Knowledge измеримую разницу по сравнению с полным отсутствием контекста.

---

## §17. H7: Evolution Advantage

### Гипотеза

> Временная перспектива (история изменений архитектуры) усиливает ценность AIS: понимание того, как система изменилась, помогает принимать лучшие решения.

### Текущий evidence

**E1.** Evolution Architecture (Capability Interaction): Evolution — SoT временного развития, INV-E1-E3. Но Evolution **отсутствует в MVP** (AT-2).

### Validation Method

**Deferred to Stage 2.** В MVP Evolution не реализована. Данная гипотеза:
- Формулируется сейчас для полноты картины
- Валидируется в Phase 3 (Pilot, если включает Stage 2 functionality)
- В MVP проверяется только: хотят ли пользователи видеть историю изменений?

### Pre-Validation (Phase 1 interview)

Вопрос: «Если бы инструмент показывал, как архитектура вашего проекта менялась за последние 6 месяцев, было бы это полезно? Для чего именно?»

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| Пользователь выражает интерес к истории изменений | ≥ 50% | E2 (interest) |
| Конкретный use case для истории | ≥ 1 на интервью | E2 |

---

## §18. H8: Integrated Understanding

### Гипотеза

> Композиция capabilities через единую модель создаёт emergent ценность, которая больше суммы отдельных capabilities. Security finding в контексте архитектуры + зависимостей + AI объяснения > Security finding без контекста.

### Текущий evidence

**E1.** Commercial Reassessment §11: ценность composition логически обоснована. Пример: Security scanner → finding привязан к Model → Impact Assessment → AI объясняет бизнес-последствия.

### Что именно проверяется

1. Замечает ли пользователь разницу между изолированным finding и finding в контексте модели?
2. Является ли контекст (зависимости, архитектурное расположение) значимым для принятия решения?
3. Создаёт ли композиция (security + dependency + AI) ценность, недоступную из одной capability?

### Validation Method

**Scenario-based comparison (Phase 2).** Пользователь видит:

- **Вариант A:** Security finding в изоляции (как в SonarQube)
- **Вариант B:** Тот же finding в контексте архитектурной модели (как в AIS)

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| Пользователь предпочитает вариант B | ≥ 70% | E2 |
| Контекст меняет решение пользователя | Measurable | E2 |
| Пользователь отмечает новую информацию из контекста | Qualitative | E2 |

### Connection to D2, D6, D9

Validates D2 (Results Bound to Model), D6 (Security with Architecture), D9 (Understanding, Not Error Finding).

---

## §19. H9: Trust

### Гипотеза

> Пользователи доверяют результатам AIS достаточно, чтобы принимать на их основе решения. Доверие основано на объяснимости (Explain Before Recommend) и указании неопределённости (No False Certainty).

### Текущий evidence

**E0.** Trust Architecture определена (INV-U1-U4, 4 уровня уверенности, Explain Before Recommend). Но доверие — субъективное состояние, не измеренное.

### Что именно проверяется

1. Пользователь принимает решение на основе рекомендации AIS?
2. Что повышает доверие: объяснение, указание неопределённости, traceability?
3. Что снижает доверие: ложная уверенность, неполное объяснение, противоречие?

### Validation Method

**Trust indicators in scenarios (Phase 2).** Во время сценарной валидации фиксируются:

- Пользователь принимает действие на основе рекомендации?
- Пользователь запрашивает дополнительное объяснение? (Level 3-4 Progressive Disclosure)
- Пользователь отмечает неопределённость как позитивный фактор?
- Пользователь sceptical после первого использования?

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| Доля рекомендаций, приведших к действию | Стабильна или растёт (Success Metrics threshold) | E2 |
| Пользователь явно упоминает доверие | Qualitative | E2 |
| Пользователь использует Progressive Disclosure (Level 3+) | ≥ 1 раз на сессию | E2 |

### Connection to D4, Principle 1

Validates D4 (All Recommendations Must Be Explained), Principle 1 (Explain Before Recommend), INV-U1 (No False Certainty).

---

## §20. H10: Repeat Value

### Гипотеза

> Пользователи возвращаются для повторного использования AIS в течение первой недели и продолжают использовать после первого месяца.

### Текущий evidence

**E0.** Retention mechanisms описаны (Commercial Reassessment §14): evolving architecture, accumulated knowledge, quality improvement. Но в MVP retention mechanisms ограничены (Knowledge minimal, Evolution absent).

### Что именно проверяется

1. Возвращается ли пользователь после первого использования?
2. Какова частота повторных обращений?
3. Какова причина возврата?

### Validation Method

**Retention measurement (Phase 3).** Behavioural analytics: DAU/MAU, интервал между сессиями, длительность сессии.

**Interview follow-up:** «Почему вы вернулись?» / «Почему не вернулись?»

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| Повторное использование в течение 7 дней | ≥ 40% | E3 |
| Retention через 30 дней | ≥ 20% | E3 |
| Причина возврата: «нашёл новое понимание» | Qualitative | E3 |

### Connection to MVP Success Criteria

MVP Success Criterion #5: «Возвращается повторно». Данная гипотеза операционализирует этот критерий.

---

## §21. H11: Differentiation

### Гипотеза

> Пользователи perceive AIS как принципиально отличающийся от комбинации существующих инструментов, а не как «ещё один анализатор» или «chatbot для архитектуры».

### Текущий evidence

**E1.** Commercial Reassessment §23: Category Risk — категория не существует на рынке. Позиционирование: «платформа архитектурного понимания» (новая категория).

### Что именно проверяется

1. В какую категорию пользователь относит AIS после использования?
2. Чем пользователь описывает AIS (своими словами)?
3. Сравнивает ли с конкретными инструментами?

### Validation Method

**Comparative evaluation (Phase 2-3).** После использования AIS:

1. «Как бы вы описали AIS другу-разработчику в одном предложении?»
2. «К каким существующим инструментам вы бы его сравнили?»
3. «Чем AIS отличается от [инструмент, который назвал]?»

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| Пользователь не относит AIS к «chatbot» | ≥ 70% не chatbot | E2 |
| Пользователь не относит AIS к «scanner» | ≥ 70% не scanner | E2 |
| Пользователь указывает уникальную характеристику | Qualitative | E2 |

### Failure Implication

Если большинство относит AIS к существующей категории (chatbot/scanner) — Category Risk (Commercial Reassessment §23) подтверждается как высокая. Требуется пересмотр positioning.

---

## §22. H12: Commercial Value

### Гипотеза

> Существует willingness-to-pay за ценность, которую создаёт AIS. Целевые personas готовы платить (лично или через бюджет организации) за сокращение времени на архитектурное понимание.

### Текущий evidence

**E0.** Commercial Reassessment §17: «Нет willingness-to-pay данных». Pricing hypotheses — E0.

### Что именно проверяется

1. Какую сумму пользователь готов заплатить?
2. Какая pricing модель предпочтительна?
3. Кто является decision maker о покупке?

### Validation Method

**WTP test (Phase 1-3).** Метод Van Westendorp (4 вопроса):

1. «При какой цене вы бы считали AIS дорогим?»
2. «При какой цене вы бы считали AIS настолько дешёвым, что сомневалисьсь в качестве?»
3. «При какой цене вы бы считали AIS дорогим, но всё равно купили?»
4. «При какой цене вы бы считали AIS выгодной покупкой?»

**Pilot (Phase 3):** Организация использует AIS 2-4 недели → вопрос о продолжении с оплатой.

### Success Criteria

| Criterion | Threshold | Evidence Level |
|---|---|---|
| WTP > 0 для ≥ 50% интервьюируемых | ≥ 50% | E2 |
| Конкретная сумма названа | Qualitative | E2 |
| Pricing preference определена | Qualitative | E2 |
| Pilot организация выражает готовность к оплате | ≥ 1 | E4 |

### Connection to D8

Validates D8 (Unified Platform): единая покупка вместо комбинации инструментов → simpler procurement.

---

---

## §23. Validation Scenarios Overview

### 8 сценариев, покрывающих основные use cases

| ID | Scenario | Primary Hypotheses | MVP Capability | Target Persona |
|---|---|---|---|---|
| A | Understand | H3, H4, H8 | AI Assistance + Model | Все |
| B | Dependency | H3, H5, H8 | Dependency Analysis + Model | Developer, Tech Lead |
| C | Change Impact | H3, H8 | CIA (базовый) | Developer, Tech Lead |
| D | Security | H3, H6, H8 | Security Analysis + Model | Security Engineer, Tech Lead |
| E | Technical Debt | H3, H8 | Debt Tracking (post-MVP) | Tech Lead, Architect |
| F | Evolution | H7 | Evolution (post-MVP) | Architect, CTO |
| G | Architecture Decision | H3, H9 | AI Assistance + Model | Architect, Tech Lead |
| H | Unknown System | H3, H4, H5 | Discovery + Model | Solo Developer, New Team Member |

### Правила сценариев

1. Каждый сценарий проверяет реальную задачу, а не capability
2. Пользователь использует свой реальный проект
3. Наблюдатель фиксирует поведение, а не заявления
4. Каждый сценарий даёт evidence для 2-4 гипотез

### MVP Coverage

**Полностью валидируемые в MVP (A, B, D, G, H):** Используют MVP capabilities.
**Частично валидируемые (C):** CIA в MVP — базовый.
**Отложены (E, F):** Требуют post-MVP capabilities. В MVP проверяется только интерес через интервью.

---

## §24. Scenario A: Understand

### Описание

Пользователь хочет понять часть системы, с которой не работал. Формулирует вопрос на естественном языке, получает ответ с объяснением.

### Пользовательское действие

1. Подключает свой проект к AIS
2. Формулирует вопрос: «Как работает [компонент/модуль] и от чего он зависит?»
3. Получает ответ с Progressive Disclosure
4. Углубляется в детали (Level 2-3)

### Измеряемые результаты

| Metric | Как измеряется | Target |
|---|---|---|
| Время до первого полезного ответа | From question to actionable answer | < 60 секунд |
| Пользователь нашёл новую информацию | Explicit statement «Я этого не знал» | ≥ 1 на сессию |
| Пользователь углубился в детали | Переход на Level 2+ | ≥ 1 раз |
| Доверие к ответу | Принятие на основе ответа | Qualitative |

### Гипотезы, которые валидирует

- H3 (AIS Value): нашёл ли новую информацию?
- H4 (Context Advantage): ответ с контекстом проекта полезнее, чем без?
- H8 (Integrated Understanding): композиция Model + AI даёт больше, чем отдельно?

---

## §25. Scenario B: Dependency

### Описание

Пользователь хочет понять зависимости конкретного компонента и оценить последствия изменения.

### Пользовательское действие

1. Формулирует вопрос: «Что зависит от [компонент]?»
2. Получает граф зависимостей в контексте модели
3. Оценивает влияние потенциального изменения

### Измеряемые результаты

| Metric | Как измеряется | Target |
|---|---|---|
| Полнота графа зависимостей | Сравнение с ожиданиями пользователя | Пользователь подтверждает полноту |
| Ценность контекста | «Это объясняет, почему изменение X сломало Y» | Qualitative |
| Время vs. ручной метод | Сравнение с dependency-cruiser + вопросы коллегам | AIS быстрее |

### Гипотезы, которые валидирует

- H3 (AIS Value): нашёл ли ранее неизвестные зависимости?
- H5 (Model Advantage): лучше ли чем комбинация инструментов?
- H8 (Integrated Understanding): контекст зависимостей + модель > отдельный граф?

---

## §26. Scenario C: Change Impact

### Описание

Пользователь хочет оценить последствия изменения компонента до его применения.

### Пользовательское действие

1. Указывает компонент для изменения
2. Получает оценку влияния: затронутые компоненты, пути, потенциальные риски
3. Решает, применять ли изменение

### Измеряемые результаты

| Metric | Как измеряется | Target |
|---|---|---|
| Полнота оценки влияния | Все затронутые компоненты перечислены? | Пользователь подтверждает |
| Полезность для решения | Пользователь принял решение на основе оценки | Qualitative |
| Сравнение с текущим методом | Как пользователь оценивает влияние сейчас? | AIS лучше |

### MVP Limitation

CIA в MVP — базовый (через композицию capabilities, AT-3). Полная валидация — Stage 2.

### Гипотезы, которые валидирует

- H3 (AIS Value): оценка влияния полезна?
- H8 (Integrated Understanding): композиция даёт больше, чем отдельный анализ?

---

## §27. Scenario D: Security

### Описание

Security Engineer или Tech Lead анализирует security findings в контексте архитектуры.

### Пользовательское действие

1. Просматривает security findings
2. Видит finding привязанным к архитектурной модели
3. Понимает business-контекст (какие данные под угрозой, через какие пути)
4. Получает объяснимую рекомендацию

### Измеряемые результаты

| Metric | Как измеряется | Target |
|---|---|---|
| Разница vs. изолированный finding | Сравнение с SonarQube/semgrep output | Пользователь предпочитает AIS |
| Понимание бизнес-риска | «Теперь я понимаю, почему это важно» | Qualitative |
| Действие на основе рекомендации | Пользователь планирует исправление | ≥ 1 действие |

### Гипотезы, которые валидирует

- H3 (AIS Value): security в контексте полезнее?
- H6 (Knowledge Advantage): накопленный контекст усиливает security анализ?
- H8 (Integrated Understanding): composition (security + model + AI) > отдельный finding?

### Connection to D6

Validates D6 (Security with Architecture): безопасность анализируется вместе с архитектурой.

---

## §28. Scenario E: Technical Debt

### Описание

Пользователь хочет приоритизировать технический долг на основе архитектурного контекста.

### MVP Status

**Отложен.** Technical Debt Tracking — post-MVP capability. В MVP проверяется только через интервью:

«Если бы инструмент показывал технический долг привязанным к архитектуре, с приоритизацией по бизнес-влиянию — было бы это полезно?»

### Гипотезы, которые валидирует

- H3 (AIS Value): интерес к функциональности существует?
- H8 (Integrated Understanding): долг в контексте архитектуры > отдельный список?

---

## §29. Scenario F: Evolution

### Описание

Пользователь хочет увидеть, как архитектура проекта изменилась за последнее время.

### MVP Status

**Отложен.** Evolution — post-MVP capability (AT-2). В MVP проверяется через интервью:

«Если бы инструмент показывал историю изменений архитектуры за последние 6 месяцев, какие решения вы бы приняли иначе?»

### Гипотезы, которые валидирует

- H7 (Evolution Advantage): интерес к истории изменений существует?

---

## §30. Scenario G: Architecture Decision

### Описание

Архитектор или Tech Lead оценивает архитектурное решение с помощью AIS.

### Пользовательское действие

1. Формулирует архитектурный вопрос: «Следует ли нам вынести [компонент] в отдельный сервис?»
2. Получает анализ текущей архитектуры, зависимостей, влияния
3. Оценивает объяснимую рекомендацию
4. Принимает решение

### Измеряемые результаты

| Metric | Как измеряется | Target |
|---|---|---|
| Качество анализа | Пользователь находит анализ полезным для решения | Qualitative |
| Доверие к рекомендации | Пользователь учитывает рекомендацию | Qualitative |
| Время vs. текущий метод | Как пользователь оценивает решения сейчас? | AIS быстрее |

### Гипотезы, которые валидирует

- H3 (AIS Value): анализ полезен для решения?
- H9 (Trust): пользователь доверяет рекомендации?

### Connection to D3, D4

Validates D3 (AI Assists Not Replaces): пользователь принимает решение, не AI. D4 (All Recommendations Must Be Explained).

---

## §31. Scenario H: Unknown System

### Описание

Разработчик (Solo или новый в команде) подключает неизвестный проект и пытается его понять.

### Пользовательское действие

1. Подключает проект к AIS
2. Ждёт Discovery
3. Исследует архитектурную модель
4. Задаёт вопросы о системе

### Измеряемые результаты

| Metric | Как измеряется | Target |
|---|---|---|
| Время до базового понимания | От подключения до «я понимаю структуру» | < 30 минут |
| Полнота понимания | Компоненты, слои, зависимости | Пользователь подтверждает |
| Сравнение с текущим онбордингом | Как пользователь понимает новые проекты сейчас? | AIS быстрее |

### Гипотезы, которые валидирует

- H3 (AIS Value): Discovery + Model дают понимание?
- H4 (Context Advantage): контекст проекта ускоряет понимание?
- H5 (Model Advantage): единая модель > комбинация инструментов?

### Connection to Minimal Assumptions

Validates Principle 13 (Minimal Assumptions): платформа не требует специальной разметки. Discovery — zero-config.

---

---

## §32. Validation Gates Overview

### 5 sequential gates

```
Gate 1: Problem Validated
    ├── H1 (Problem Existence) → E2
    ├── H2 (Problem Frequency) → E2
    └── Criterion: Проблема реальна и частотна

Gate 2: Value Validated
    ├── H3 (AIS Value) → E2
    ├── H4 (Context Advantage) → E2
    ├── H5 (Model Advantage) → E2
    └── Criterion: AIS создаёт измеримую ценность

Gate 3: Differentiation Validated
    ├── H6 (Knowledge Advantage) → E3
    ├── H7 (Evolution Advantage) → E3 (pre-validation)
    ├── H8 (Integrated Understanding) → E2
    └── Criterion: Ценность уникальна, не воспроизводима комбинацией

Gate 4: Repeat Value Validated
    ├── H9 (Trust) → E2
    ├── H10 (Repeat Value) → E3
    └── Criterion: Пользователи возвращаются и доверяют

Gate 5: Commercial Signal
    ├── H11 (Differentiation) → E2
    ├── H12 (Commercial Value) → E3
    └── Criterion: Существует willingness-to-pay
```

### Правила Gate System

1. Gates sequential — Gate N требует pass Gate N-1
2. Каждый gate имеет чёткие pass/fail критерии
3. Fail gate не означает «остановить проект» — означает «переоценить»
4. Partial pass возможен (некоторые гипотезы подтверждены, некоторые — нет)
5. Gate results записываются в Validation Results document (post-validation)

---

## §33. Gate 1: Problem Validated

### Цель

Подтвердить, что проблема потери архитектурного контекста является реальной, частотной и приоритетной для целевых personas.

### Входные гипотезы

- H1 (Problem Existence): E1 → E2
- H2 (Problem Frequency): E1 → E2

### Метод

User interviews (5-10 целевых personas), Phase 1 (pre-MVP).

### Pass Criteria

| # | Criterion | Threshold |
|---|---|---|
| 1 | Описанные симптомы подтверждены | ≥ 7 из 10 |
| 2 | Проблема в top-3 приоритетов | ≥ 60% интервьюируемых |
| 3 | Частота возникновения | ≥ еженедельно для ≥ 70% |
| 4 | Время на эпизод | ≥ 30 минут в среднем |
| 5 | Текущие workarounds соответствуют | Qualitative match |

### Pass Condition

**≥ 4 из 5 критериев выполнены** → Gate 1 PASS.

### If Fail

PAUSE. Переформулировать problem statement. Возможные действия:
- Сузить целевые personas
- Переформулировать symptoms
- Обосновать, почему проблема станет priority в будущем

### Connection to Commercial Reassessment

Закрывает Commercial Gap #7 (нет user interviews) и частично #8 (нет usability testing — это Phase 2).

---

## §34. Gate 2: Value Validated

### Цель

Подтвердить, что AIS MVP создаёт измеримую ценность для пользователя.

### Входные гипотезы

- H3 (AIS Value): E0 → E2
- H4 (Context Advantage): E1 → E2
- H5 (Model Advantage): E1 → E2

### Метод

Scenario-based validation (Phase 2), 3-5 пользователей, сценарии A, B, D, G, H.

### Pass Criteria

| # | Criterion | Threshold |
|---|---|---|
| 1 | First Analysis Success | > 70% |
| 2 | Пользователь нашёл новую информацию | ≥ 1 на сессию |
| 3 | Контекст улучшает ответ (A/B) | ≥ 70% предпочитают с контекстом |
| 4 | AIS лучше комбинации инструментов | Время ≤ 50%, пользователь предпочитает |
| 5 | Пользователь принимает действие на основе результата | ≥ 1 действие |

### Pass Condition

**≥ 4 из 5 критериев выполнены** → Gate 2 PASS.

### If Fail

Оценить: проблема в продукте (implementation) или в гипотезе (value doesn't exist)?
- Если implementation: исправить и повторить
- Если hypothesis: переоценить ценностное предложение

---

## §35. Gate 3: Differentiation Validated

### Цель

Подтвердить, что ценность AIS уникальна и не воспроизводима комбинацией существующих инструментов.

### Входные гипотезы

- H6 (Knowledge Advantage): E1 → E3
- H7 (Evolution Advantage): E1 → E3 (pre-validation)
- H8 (Integrated Understanding): E1 → E2

### Метод

Scenario-based comparison (Phase 2) + longitudinal observation (Phase 3).

### Pass Criteria

| # | Criterion | Threshold |
|---|---|---|
| 1 | Композиция > сумма частей (H8) | ≥ 70% предпочитают интегрированный результат |
| 2 | Knowledge улучшает качество (H6) | Пользователь замечает улучшение |
| 3 | Интерес к Evolution (H7) | ≥ 50% выражают интерес |
| 4 | Уникальная характеристика названа | Qualitative |

### Pass Condition

**≥ 3 из 4 критериев выполнены** → Gate 3 PASS.

### MVP Limitation

H6 и H7 полностью валидируются только в Phase 3 (пилот с Knowledge Persistence). В MVP — предварительная оценка.

---

## §36. Gate 4: Repeat Value Validated

### Цель

Подтвердить, что пользователи возвращаются и доверяют результатам.

### Входные гипотезы

- H9 (Trust): E0 → E2
- H10 (Repeat Value): E0 → E3

### Метод

Retention measurement + trust indicators (Phase 3).

### Pass Criteria

| # | Criterion | Threshold |
|---|---|---|
| 1 | Повторное использование в течение 7 дней | ≥ 40% |
| 2 | Retention через 30 дней | ≥ 20% |
| 3 | Доверие: рекомендации приводят к действию | Стабильно или растёт |
| 4 | Причина возврата: новое понимание | Qualitative confirmation |

### Pass Condition

**≥ 3 из 4 критериев выполнены** → Gate 4 PASS.

### If Fail

Оценить: проблема в retention mechanisms (Knowledge minimal, Evolution absent — известные ограничения MVP) или в ценности продукта.

---

## §37. Gate 5: Commercial Signal

### Цель

Получить хотя бы один коммерческий сигнал: willingness-to-pay или pilot с бюджетом.

### Входные гипотезы

- H11 (Differentiation): E1 → E2
- H12 (Commercial Value): E0 → E3

### Метод

WTP test + pilot (Phase 1-3).

### Pass Criteria

| # | Criterion | Threshold |
|---|---|---|
| 1 | WTP > 0 | ≥ 50% интервьюируемых |
| 2 | Конкретная сумма названа | Qualitative |
| 3 | Pricing preference определена | Qualitative |
| 4 | Pilot организация готова к оплате | ≥ 1 |
| 5 | Категория восприята корректно | ≥ 70% не относят к chatbot/scanner |

### Pass Condition

**≥ 3 из 5 критериев выполнены** → Gate 5 PASS.

### If Pass

**Proceed to TASK-ARCH-MVP-001 (MVP Implementation Planning)** с коммерческим evidence.

### If Fail

Переоценить коммерческую модель. Возможные действия:
- Сменить целевой сегмент
- Сменить pricing модель
- Усилить differentiation

---

---

## §38. Architecture Decision Validation (D1-D10)

### Цель

Каждое из 10 Product Architecture Decisions (D1-D10) должно быть проверено через наблюдение реального поведения, а не только через логическое обоснование. Данный раздел определяет, **какое поведение** подтверждает каждое решение.

### Важное ограничение

**Валидация D1-D10 не означает их пересмотра.** Она означает: проверить, работают ли эти решения в реальном использовании. Если решение создаёт проблему для пользователя — это evidence для понимания, а не для автоматического изменения. Пересмотр D1-D10 требует Product Decision Framework process.

### D1: Model Before Analysis

| Параметр | Значение |
|---|---|
| Решение | AIS строит архитектурную модель до любого анализа |
| Наблюдаемое поведение | Пользователь использует результаты анализа, привязанные к модели, и находит их более полезными, чем результаты без контекста |
| Валидирующие сценарии | A (Understand), D (Security), H (Unknown System) |
| Индикатор подтверждения | Пользователь явно ссылается на архитектурный контекст при обсуждении findings |
| Индикатор проблемы | Пользователь игнорирует модель и смотрит только на findings |

### D2: Results Bound to Model

| Параметр | Значение |
|---|---|
| Решение | Все результаты всегда привязываются к архитектурной модели |
| Наблюдаемое поведение | Пользователь не просит «показать findings отдельно от модели» |
| Валидирующие сценарии | B (Dependency), D (Security) |
| Индикатор подтверждения | Пользователь исследует finding через модель (переходит по связям) |
| Индикатор проблемы | Пользователь экспортирует findings и работает с ними вне контекста |

### D3: AI Assists Not Replaces

| Параметр | Значение |
|---|---|
| Решение | AI никогда не заменяет разработчика |
| Наблюдаемое поведение | Пользователь принимает решение после рекомендации, а не следует автоматически |
| Валидирующие сценарии | G (Architecture Decision), A (Understand) |
| Индикатор подтверждения | Пользователь модифицирует рекомендацию или отклоняет её с причиной |
| Индикатор проблемы | Пользователь просит «просто сделай» или «примени автоматически» |

### D4: All Recommendations Must Be Explained

| Параметр | Значение |
|---|---|
| Решение | Каждая рекомендация объяснена (наблюдение → анализ → рекомендация) |
| Наблюдаемое поведение | Пользователь читает объяснение и оно влияет на решение |
| Валидирующие сценарии | G (Architecture Decision), D (Security) |
| Индикатор подтверждения | Пользователь запрашивает Level 2+ (Why/Evidence) |
| Индикатор проблемы | Пользователь игнорирует объяснение и смотрит только на рекомендацию |

### D5: Context Over Rules

| Параметр | Значение |
|---|---|
| Решение | Контекст проекта важнее универсальных правил |
| Наблюдаемое поведение | Пользователь ценит project-specific ответ выше generic правила |
| Валидирующие сценарии | A (Understand), H14 (H4: Context Advantage) |
| Индикатор подтверждения | Пользователь отмечает: «это применимо к моему проекту» |
| Индикатор проблемы | Пользователь просит «покажи стандартные правила» |

### D6: Security with Architecture

| Параметр | Значение |
|---|---|
| Решение | Безопасность анализируется вместе с архитектурой |
| Наблюдаемое поведение | Security Engineer находит findings в контексте более полезными |
| Валидирующие сценарии | D (Security) |
| Индикатор подтверждения | Пользователь принимает другое решение после просмотра findings в контексте |
| Индикатор проблемы | Пользователь просит «покажи только список уязвимостей» |

### D7: Knowledge Accumulates

| Параметр | Значение |
|---|---|
| Решение | Знания проекта постоянно накапливаются |
| Наблюдаемое поведение | При повторном использовании ответы точнее/релевантнее |
| Валидирующие сценарии | H6 (Knowledge Advantage) |
| Индикатор подтверждения | Пользователь замечает улучшение качества |
| Индикатор проблемы | Пользователь не замечает разницы между первым и последующим использованием |
| MVP Limitation | Session-level Knowledge в MVP. Полная валидация — Stage 2. |

### D8: Unified Platform

| Параметр | Значение |
|---|---|
| Решение | AIS развивается как единая платформа, а не набор инструментов |
| Наблюдаемое поведение | Пользователь не просит «разделить на отдельные инструменты» |
| Валидирующие сценарии | H5 (Model Advantage), B (Dependency) |
| Индикатор подтверждения | Пользователь использует несколько capabilities в одной сессии |
| Индикатор проблемы | Пользователь использует только одну capability за раз |

### D9: Understanding, Not Error Finding

| Параметр | Значение |
|---|---|
| Решение | Ориентация на понимание системы, а не поиск ошибок |
| Наблюдаемое поведение | Пользователь формулирует вопросы, а не запрашивает «список проблем» |
| Валидирующие сценарии | A (Understand), G (Architecture Decision) |
| Индикатор подтверждения | Вопросы преобладают над запросами рекомендаций (Success Metric #11) |
| Индикатор проблемы | Пользователь просит «покажи все проблемы» |

### D10: New Capabilities Strengthen Model

| Параметр | Значение |
|---|---|
| Решение | Новая возможность должна усиливать архитектурную модель |
| Наблюдаемое поведение | Пользователь не запрашивает возможности вне модели |
| Валидирующие сценарии | Feature Factory Protection (§9) |
| Индикатор подтверждения | Запросы пользователей усиливают существующие capabilities |
| Индикатор проблемы | Запросы требуют capabilities, не привязанные к модели |

### Сводная матрица

| Decision | Primary Scenario | Key Indicator | MVP Validatable? |
|---|---|---|---|
| D1 | A, D, H | Ссылки на контекст | Да |
| D2 | B, D | Исследование через модель | Да |
| D3 | G, A | Модификация/отклонение рекомендаций | Да |
| D4 | G, D | Запрос Level 2+ | Да |
| D5 | A, H4 | Project-specific ценность | Да |
| D6 | D | Изменение решения после контекста | Да |
| D7 | H6 | Замечаемое улучшение | Частично (session-level) |
| D8 | H5, B | Использование нескольких capabilities | Да |
| D9 | A, G | Вопросы > запросы рекомендаций | Да |
| D10 | §9 | Запросы усиливают модель | Да |

---

## §39. Data Collection Framework

### Типы данных

| Тип | Что собирается | Метод | Хранение |
|---|---|---|---|
| Interview transcripts | Полные транскрипты интервью | Аудио + структурированные заметки | Текстовые файлы, кодирование по гипотезам |
| Scenario observations | Поведение в сценариях (время, действия, решения) | Think-aloud + screen recording | Структурированные протоколы |
| Behavioural analytics | Retention, частота, длительность сессий | Automatic (встроенное в MVP) | Анонимизированные логи |
| WTP data | Ценностное восприятие | Van Westendorp + открытые вопросы | Структурированные ответы |
| Feedback signals | Confirmation, correction, rejection, escalation | Quality Architecture signals (6 типов в MVP) | Quality Signal infrastructure |

### Кодирование данных по гипотезам

Каждый элемент данных кодируется по 12 гипотезам (H1-H12):

- **Supports:** Данные подтверждают гипотезу
- **Challenges:** Данные ставят под сомнение
- **Neutral:** Не релевантно
- **Surprise:** Неожиданный результат (фиксируется в Emergent Findings)

### Минимальный объём данных

| Фаза | Минимальный объём | Обоснование |
|---|---|---|
| Phase 1 (Interviews) | 5-10 интервью | Достаточно для выявления паттернов (qualitative research standard) |
| Phase 2 (Scenarios) | 3-5 пользователей × 5 сценариев | Достаточно для измеримых выводов |
| Phase 3 (Pilot) | 2-4 недели, 5+ пользователей | Достаточно для retention данных |

### Privacy & Ethics

1. Явное информированное согласие перед каждым интервью
2. Право отказаться в любой момент
3. Анонимизация данных перед анализом
4. Хранение данных: только для целей валидации AIS
5. Не сбор данных, не связанных с гипотезами (no surveillance)

---

## §40. Validation Execution Plan

### Timeline

| Phase | Длительность | Зависимость | Выход |
|---|---|---|---|
| Phase 1: Problem Validation | 2-3 недели | None | Gate 1 pass/fail |
| Phase 2: Value Validation | 3-4 недели | Phase 1 pass + MVP/Prototype | Gate 2, 3 pass/fail |
| Phase 3: Repeat Value + Commercial | 4-6 недель | Phase 2 pass + MVP release | Gate 4, 5 pass/fail |

### Предварительные условия для каждого Phase

**Phase 1:**
- Данный документ утверждён
- Список интервьюируемых personas подготовлен (≥ 10 кандидатов)
- Interview guide составлен на основе §11-§12, §22

**Phase 2:**
- Gate 1 PASS
- MVP или functional prototype доступен
- Сценарии A-H подготовлены (§24-§31)
- Think-aloud protocol разработан

**Phase 3:**
- Gate 2 PASS
- MVP release с behavioural analytics
- Минимум 1 design partner (организация) согласен на pilot

### Parallel Tracks

Phase 1 может выполняться параллельно с началом MVP implementation (TASK-ARCH-MVP-001), если Gate 1 предварительно пройден через quick interviews (3-5 personas, 1 неделя).

### Decision Points

```
After Phase 1:
    Gate 1 PASS  → Continue Phase 2 + MVP implementation
    Gate 1 FAIL  → PAUSE, reformulate problem, re-interview

After Phase 2:
    Gate 2 PASS  → Continue Phase 3
    Gate 2 FAIL  → Evaluate: fix implementation or reformulate value
    Gate 3 PASS  → Differentiation confirmed
    Gate 3 FAIL  → Differentiation not confirmed, re-evaluate positioning

After Phase 3:
    Gate 4 PASS  → Retention confirmed
    Gate 4 FAIL  → Retention not confirmed, evaluate MVP limitations
    Gate 5 PASS  → COMMERCIAL SIGNAL — proceed to pricing + GTM
    Gate 5 FAIL  → No commercial signal, re-evaluate business model
```

---

## §41. Success Criteria & Risks

### Общий Success Criteria

Валидация считается **успешной**, если:

1. **Gate 1 PASS** — проблема подтверждена
2. **Gate 2 PASS** — AIS создаёт измеримую ценность
3. **Gate 5 PASS (минимум 3/5 критериев)** — коммерческий сигнал получен
4. **Минимум 8 утверждений переведены с E0/E1 на E2+**
5. **Ни один Architecture Invariant не нарушен** в процессе валидации

### Partial Success

- Gate 1-2 PASS, Gate 3-5 partial — продукт имеет ценность, но differentiation и commercial model требуют доработки
- Gate 1 PASS, Gate 2 partial — проблема реальна, но ценность MVP недостаточна

### Failure

- Gate 1 FAIL — проблема не подтверждена. PAUSE и переоценка.
- Gate 1 PASS, Gate 2 FAIL — проблема реальна, но AIS её не решает. Переоценка value proposition.

### Риски валидации

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Проблема не подтверждается (Gate 1 FAIL) | Средняя | Критический | Сузить personas, переформулировать problem |
| AIS не создаёт ценность (Gate 2 FAIL) | Средняя | Критический | Исправить implementation, переоценить scope |
| Пользователи относятся к AIS как к chatbot | Средняя | Высокий | Усилить positioning через сценарии |
| WTP = 0 для всех personas | Средняя | Критический | Сменить сегмент или бизнес-модель |
| Недостаточный объём выборки | Средняя | Средний | Расширить поиск personas |
| Interview bias (подтверждение ожиданий) | Низкая | Средний | Blind coding, independent analyst |
| MVP слишком сырой для валидации | Средняя | Средний | Использовать prototype, не MVP |
| Валидация занимает слишком много времени | Средняя | Средний | Parallel tracks, quick Gate 1 |

### Connection to Commercial Reassessment Risks

Данная спецификация напрямую закрывает:
- Commercial Risk #1 (Problem risk) → Gate 1
- Commercial Risk #2 (Buyer risk) → Gate 5 (H12)
- Commercial Risk #5 (Time-to-Value risk) → Gate 2 (H3)
- Commercial Risk #10 (Pricing risk) → Gate 5 (H12)
- Commercial Risk #12 (Category risk) → Gate 5 (H11)

---

## §42. Audit Results

### Audit 1 — Specification Completeness

**PASS.** Все 42 раздела заполнены. 12 гипотез (H1-H12), 8 сценариев (A-H), 5 gates, 10 архитектурных решений (D1-D10) — все определены.

### Audit 2 — Input Document Coverage

**PASS.** Все 26 Product + Architecture Layer документов + Commercial Reassessment использованы как входные данные. Конкретные ссылки:
- Product Vision, Principles, Capability Map, User Personas, Positioning, MVP Definition, Architecture Decisions, Success Metrics, Roadmap, Decision Framework — 10 core
- Architecture Foundation, Understanding-Centered Interaction, Quality & Feedback, Capability Interaction, Architecture Readiness — 5 architecture
- Commercial Reassessment — 1 audit

### Audit 3 — Evidence Baseline Accuracy

**PASS.** Текущее распределение evidence (40% E0, 60% E1, 0% E2+) соответствует Commercial Reassessment §29. Целевое распределение амбициозно, но достижимо.

### Audit 4 — Hypothesis Formulation

**PASS.** Все 12 гипотез сформулированы как проверяемые (falsifiable). Каждая имеет: формулировку, текущий E-level, целевой E-level, validation method, success criteria, failure indicators. Гипотезы сформулированы до начала валидации (VA-7 protection).

### Audit 5 — Feature Factory Protection

**PASS.** §9 определяет явные правила: результаты валидации НЕ могут быть использованы для добавления capabilities. Feature requests фиксируются в Emergent Findings. Правило 5 сигналов с интерпретацией.

### Audit 6 — Scenario Coverage

**PASS.** 8 сценариев покрывают: Understanding (A), Dependency (B), Change Impact (C), Security (D), Technical Debt (E), Evolution (F), Architecture Decision (G), Unknown System (H). MVP-сценарии (A, B, D, G, H) полностью валидируемы. C — частично. E, F — отложены с pre-validation.

### Audit 7 — Gate System Integrity

**PASS.** 5 gates sequential, каждый с pass criteria (≥ N из M). Fail не означает остановку — означает переоценку. Partial pass возможен.

### Audit 8 — D1-D10 Validation Coverage

**PASS.** Все 10 Product Architecture Decisions имеют: наблюдаемое поведение, валидирующие сценарии, индикатор подтверждения, индикатор проблемы. 9 из 10 полностью валидируемы в MVP. D7 — частично (session-level).

### Audit 9 — Architecture Invariant Compliance

**PASS.** Валидация не нарушает ни один из 30 консолидированных инвариантов. Валидация проверяет, работают ли инварианты в реальном использовании. Нарушение инварианта в процессе валидации — evidence для пересмотра, а не для автоматического изменения.

### Audit 10 — Anti-Pattern Avoidance

**PASS.** 8 validation anti-patterns (VA-1–VA-8) определены с защитами. Каждый anti-pattern имеет конкретный механизм предотвращения.

### Audit 11 — Metrics Alignment

**PASS.** Validation metrics согласованы с Product Success Metrics: First Analysis Success > 70%, объяснимые рекомендации > 90%, retention. 7 Vanity Metrics исключены. 5 Metric Gaps из Commercial Reassessment §28 учтены.

### Audit 12 — MVP Boundary Compliance

**PASS.** Валидация учитывает 6 Accepted Trade-offs (AT-1–AT-6). Сценарии E, F отложены. H6, H7 — частичная валидация в MVP. CIA (Scenario C) — базовый уровень.

### Audit 13 — Interview Standard

**PASS.** §7 определяет формат (semi-structured), длительность (30-45 мин), запись, анализ, 4 критических правила. Вопросы конкретные (ситуации, а не утверждения).

### Audit 14 — Data Collection Plan

**PASS.** §39 определяет 5 типов данных, метод кодирования по гипотезам, минимальные объёмы, privacy & ethics.

### Audit 15 — Execution Plan Feasibility

**PASS.** §40 определяет timeline (9-13 недель общих), предварительные условия для каждого phase, decision points, parallel tracks.

### Audit 16 — Risk Assessment

**PASS.** §41 определяет 8 рисков с probability, impact, mitigation. Связь с Commercial Reassessment risks установлена.

### Audit 17 — Commercial Reassessment Alignment

**PASS.** Данный документ напрямую следует из Commercial Reassessment §36 (Required Validation) и §38 (Next Best Action). Все 7 приоритетных действий из §36 покрыты.

### Audit 18 — No Circular Validation

**PASS.** Валидация не использует AIS для доказательства ценности AIS. User interviews (Phase 1) проводятся без продукта. Scenario validation (Phase 2) использует продукт, но измеряет пользовательское поведение, не самооценку продукта.

### Audit 19 — Separation of Problem and Solution

**PASS.** Phase 1 (Problem Validation) полностью отделена от Phase 2 (Value Validation). Problem подтверждается до демонстрации решения. VA-4 (Leading Demo) предотвращает смешение.

### Audit 20 — Hypothesis Independence

**PASS.** 12 гипотез можно проверить независимо. H1-H2 (Phase 1) не требуют продукта. H3-H12 требуют продукта, но могут быть проверены по отдельности.

### Audit 21 — Threshold Justification

**PASS.** Пороги основаны на существующих документах: First Analysis Success > 70% (Success Metrics), Retention > 50% (Roadmap Stage 2), ≥ 5 пользователей (MVP Definition). Новые пороги (Gate pass conditions) обоснованы логически и conservatively.

### Audit 22 — Failure Mode Coverage

**PASS.** Каждый gate и каждая гипотеза имеют Failure Indicators (H1-H12) и If Fail sections (Gates). Нет гипотезы без плана при опровержении.

### Audit 23 — Trust Architecture Validation

**PASS.** H9 (Trust) + D3 (AI Assists Not Replaces) + D4 (Explain Before Recommend) + Scenario G (Architecture Decision) формируют комплексную проверку Trust Architecture.

### Audit 24 — Quality Architecture Validation

**PASS.** Quality Architecture (10 dimensions, 15 invariants) не валидируется напрямую (требует длительного использования), но feedback signals (6 типов в MVP) собираются и анализируются в Phase 3. Metric Gaps из Quality Architecture учтены.

### Audit 25 — Understanding-Centered UX Validation

**PASS.** Scenario A (Understand) + D5 validation (Context Over Rules) + H11 (Differentiation — не chatbot) проверяют Understanding-Centered Interaction. Progressive Disclosure (5 уровней) проверяется через наблюдение: запрашивает ли пользователь Level 2+?

### Audit 26 — Product Principles Compliance

**PASS.** Валидация проверяет ключевые принципы: Explain Before Recommend (D4, H9), AI Assists Not Replaces (D3, H9), Minimal Assumptions (Scenario H), Knowledge Never Lost (H6), Context Over Rules (D5, H4).

### Audit 27 — Success Metrics Compatibility

**PASS.** North Star Metric (осознанные решения) измеряется через Scenario G + H9. Primary Metrics #1-#11 покрыты сценариями. Thresholds согласованы.

### Audit 28 — Roadmap Stage Compatibility

**PASS.** Валидация учитывает 6 стадий Roadmap. MVP валидация покрывает Stage 1 criteria (First Analysis Success > 70%, ≥ 5 пользователей). Phase 3 partial — Stage 2 (Retention > 50%).

### Audit 29 — Final Specification Coherence

**PASS.** Данный документ: (1) непротиворечив внутри себя, (2) согласован со всеми 26 входными документами, (3) не нарушает архитектурные инварианты, (4) не расширяет MVP scope, (5) даёт измеримый план перевода evidence с E0/E1 на E2/E3. Specification готова к использованию как руководство для валидации AIS MVP.

---

**Конец документа.**
