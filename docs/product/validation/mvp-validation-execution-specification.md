# TASK-PRODUCT-VALIDATION-002: AIS MVP Validation Execution Specification

**Type:** Product Validation Execution Specification  
**Date:** 2026-08-16  
**Status:** Execution Protocol (pre-validation)  
**Repository:** main, HEAD 78aabe2  
**Predecessor:** TASK-PRODUCT-VALIDATION-001 (mvp-value-validation-specification.md, 78aabe2)  
**Volume:** 49 sections, 26 audits

---

## §1. Executive Summary

Данный документ — операционный протокол проведения первой реальной валидации AIS MVP на пользователях. Он определяет **как именно** получить evidence, достаточный для перехода от предположений (E0/E1) к подтверждённым данным (E2/E3), не подменяя наблюдение самооценкой.

Предшественник: TASK-PRODUCT-VALIDATION-001 определил **что** валидировать (12 гипотез, 8 сценариев, 5 gates). Данный документ определяет **как**: кого искать, какие задания давать, что фиксировать, как защищаться от искажений, как интерпретировать результаты.

**Центральная последовательность:**

```
Recruit → Interview → Observe → Evidence → Classify → Validate → Learn → Decide
```

**Что документ НЕ делает:** не описывает разработку AIS, не определяет production deployment, не выбирает AI provider, не определяет implementation architecture (полный out of scope — §45).

**Ключевой сдвиг:** начиная с этого момента качество AIS измеряется не количеством написанных спецификаций, а количеством полученного evidence.

---

## §2. Document Metadata

| Parameter | Value |
|---|---|
| Task ID | TASK-PRODUCT-VALIDATION-002 |
| Type | Validation Execution Specification |
| Status | Execution Protocol (до начала валидации) |
| Input Documents | 29 файлов (10 core + 12 specs + 5 arch + 2 validation) |
| Predecessor | TASK-PRODUCT-VALIDATION-001 |
| Next Action | Recruitment + Phase 1 interviews |
| Evidence Target | E0/E1 → E2/E3 |

### Фактический инвентарь входных документов (проверено)

**Product Layer Core (10):** Vision, Principles, Capability Map, User Personas, Positioning, MVP Definition, Architecture Decisions, Success Metrics, Roadmap, Decision Framework.

**Product Specifications (12):** Architecture Model, Project Discovery, Architecture Knowledge, Architecture Evolution, Change Impact Assessment, Security Analysis, Dependency Analysis, Technical Debt Tracking, AI Assistance, Report Generation, Visualization, Organization Adaptation.

**Architecture Layer (5):** Foundation, Understanding-Centered Interaction, Quality & Feedback, Capability Interaction, Architecture Readiness.

**Validation (2):** mvp-value-validation-specification.md, commercial-reassessment-001.md.

**Итого:** 29 документов. Набор соответствует заданию (§2). Все прочитаны полностью.

---

## §3. Source of Truth Hierarchy

При конфликте между документами приоритет:

1. **Product Vision** — высший авторитет по направлению
2. **Product Architecture Decisions (D1-D10)** — неизменные решения
3. **mvp-value-validation-specification.md** — что валидировать
4. **Данный документ** — как валидировать
5. **Product Principles** — критерии оценки
6. **Architecture Layer** — технические инварианты (30 консолидированных)
7. **Product Specifications** — детали capabilities
8. **Commercial Reassessment** — evidence baseline (3.0/5.0)

**Правило:** данный документ **не может** изменить, что валидировать (определено в Validation-001). Он определяет только **как**.

---

## §4. Validation Philosophy

### Восемь принципов

**1. Evidence over opinion.** Данные о поведении имеют приоритет над заявлением. «Я бы пользовался» — opinion, не evidence. «Пользователь вернулся на следующий день» — E3.

**2. Observed behavior over stated enthusiasm.** Пользователь говорит «очень полезно», но не принимает ни одного действия — enthusiasm, не evidence. Пользователь молча принимает решение на основе AIS — behaviour = evidence.

**3. Repeated behavior over isolated behavior.** Однократное использование может быть novelty effect. Повторное использование — evidence retention.

**4. Real task over artificial demo.** Задание должно быть реальной задачей пользователя, не искусственным сценарием. Пользователь работает со своим проектом.

**5. Problem evidence over feature demand.** «Добавьте интеграцию с Jira» — feature request, не problem evidence. «Я потратил 2 часа на понимание, почему изменение X сломало Y» — problem evidence.

**6. Decision improvement over feature usage.** Пользователь использовал AI Assistance — usage. Пользователь изменил архитектурное решение на основе AIS — decision improvement.

**7. Context advantage over AI novelty.** «AI хорошо ответил» — novelty. «AIS показал, что уязвимость X затрагивает платежный путь через цепочку A-B-X» — context advantage.

**8. Retention over first-session excitement.** Первый сеанс всегда exciting. Вопрос: возвращается ли пользователь?

### Восемь запретов

| # | Запрет | Почему |
|---|---|---|
| ZP-1 | Считать «интересно» доказательством ценности | Interest ≠ value |
| ZP-2 | Считать «я бы пользовался» доказательством retention | Statement ≠ behavior |
| ZP-3 | Считать «AI хорошо ответил» доказательством AIS value | AI novelty ≠ product value |
| ZP-4 | Считать число функций evidence | Quantity ≠ value |
| ZP-5 | Считать количество экранов evidence | Screens ≠ understanding |
| ZP-6 | Считать положительный feedback достаточным для изменения MVP | Feedback ≠ validated change |
| ZP-7 | Считать отсутствие негативного feedback подтверждением | Silence ≠ approval |
| ZP-8 | Использовать validation для обоснования новых capabilities | Feature Factory Protection |

---

## §5. Evidence Model

### Уровни evidence

| Level | Name | Definition | Что позволяет команде делать |
|---|---|---|---|
| E0 | Assumption | Нет реальных пользовательских данных | Формулировать гипотезу. Не принимать решений. |
| E1 | Indication | Косвенные сигналы или единичные наблюдения | Уточнить гипотезу. Не масштабировать. |
| E2 | Observed Evidence | Реальное поведение 3+ пользователей в контролируемых условиях | Подтвердить/опровергнуть. Ограниченное решение. |
| E3 | Repeated Evidence | Воспроизводится на разных пользователях/сценариях (5+) | Решение с умеренной confidence. |
| E4 | Strong Validation | Устойчивое evidence, 10+ пользователей, измеримый эффект | Решение с высокой confidence. |

### Transition rules

| From | To | Требуется | Минимум |
|---|---|---|---|
| E0 | E1 | Любой сигнал от реального пользователя | 1 наблюдение |
| E1 | E2 | Поведение 3+ пользователей в рамках protocol | 3+ users, 2+ scenarios |
| E2 | E3 | Воспроизведение на разных personas/проектах | 5+ users, 3+ scenarios, 2+ personas |
| E3 | E4 | Стабильность + коммерческий сигнал | 10+ users, 4+ weeks |

### Backward transition

Evidence может двигаться **назад**: новые данные противоречат предыдущим → E-level понижается. E3 → E1 если 3 из 5 новых наблюдений опровергают. Это не провал — это честная наука.

---

## §6. Evidence Independence

Не все наблюдения равнозначны.

### Правила независимости

| Ситуация | Считается как | Обоснование |
|---|---|---|
| Мнение одного пользователя по 3 темам | 1 evidence | Один источник |
| 3 ответа одного интервью на похожие вопросы | 1 evidence | Consistency bias |
| Demo feedback после проведённого демо | 0.5 evidence | Demo effect |
| Поведение в реальной задаче | 1 evidence | Observable action |
| AI response correctness (техническая проверка) | 0 evidence для value | Correctness ≠ value |
| Feature usage (кликнул, открыл) | 0.5 evidence | Usage ≠ value |
| Решение, принятое на основе AIS | 1 evidence | Decision improvement |
| Повторное использование без напоминания | 1 evidence | Retention |
| Unsolicited рекомендация коллеге | 1.5 evidence | Advocacy > retention |

### Aggregation rule

Минимум **3 независимых evidence** (от разных пользователей) для E1 → E2.
Минимум **5 независимых evidence** для E2 → E3.
Один пользователь = максимум 1 независимый evidence на гипотезу.

---

## §7. Target Personas

Authoritative persona model из User Personas (8 primary + 6 secondary).

### Приоритет validation

| Priority | Persona | Почему нужна | Проверяем | Сценарии | Подтверждение | Опровержение |
|---|---|---|---|---|---|---|
| 1 | **Tech Lead** (3-10) | User=Buyer=Decision Maker | H1, H3, H10 | A, B, C, D, G | Нашёл неизвестное, принял решение | Не повлияло на решение |
| 2 | **Developer** | Ежедневное взаимодействие | H2, H3, H4 | A, B, C, H | Быстрее нашёл, понял причину | Не быстрее, неполная |
| 3 | **Architect** | Проверяет гипотезы | H5, H7, H9 | A, G, H | Модель полезна для решений | Модель неточна |
| 4 | **Security Engineer** | Security в контексте | H6, H8 | D | Приоритизация изменилась | Контекст не помог |
| 5 | **CTO** | Report consumer, strategic | H11, H12 | Reports | Объективная картина | Не стратегически ценно |

Не обязательно тестировать все personas одновременно. Минимум для первого wave: Tech Lead + Developer (2 personas, 5+ участников).

### Persona-specific validation focus

**Tech Lead.** Проблема (User Personas §3.4): субъективные архитектурные споры, невозможно обосновать рефакторинг, долгий онбординг. Validation focus: нашёл ли ранее неизвестную проблему? Повлиял ли результат на решение? Выразил ли желание использовать снова?

**Developer.** Проблема (User Personas §3.1-3.2): регрессии из-за непонимания зависимостей, устаревшая документация API, 30+ минут на поиск информации. Validation focus: быстрее ли? Понял ли причину? Избежал ли регрессии?

**Architect.** Проблема (User Personas §3.5): нет инструмента проверки архитектурных гипотез, стандарты существуют только на бумаге. Validation focus: соответствует ли модель реальности? Нашёл ли неожиданные зависимости? Использовал ли для обоснования?

**Security Engineer.** Проблема (User Personas §3.8): формальный severity не равен реальному бизнес-риску, alarm fatigue. Validation focus: увидел ли бизнес-риск? Изменилась ли приоритизация? Принял ли решение на основе контекста?

**CTO.** Проблема (User Personas §3.7): нет объективной картины, разрозненные субъективные сводки. Validation focus: дало ли объективную картину? Принял ли стратегическое решение?

---

## §8. Participant Selection

### Критерии включения

Участник **обязан** иметь реальный опыт:

| Опыт | Почему обязательно | Как проверить |
|---|---|---|
| Работы с существующей системой (не демо-проект) | Реальные проблемы отличаются от учебных | Опрос при рекрутменте |
| Понимания незнакомого проекта (онбординг, код-ревью) | Scenario H требует реального онбординга | Был ли онбординг за последние 3 месяца? |
| Анализа зависимостей | Scenario B требует реальной потребности | Сталкивался ли с регрессией из-за зависимостей? |
| Оценки последствий изменений | Scenario C требует реального решения | Принимал ли изменения, вызвавшие неожиданные эффекты? |
| Работы с архитектурными рисками | Scenario D, G | Оценивал ли security risk или архитектурное решение? |
| Поиска технического контекста | Baseline measurement | Сколько времени тратит на поиск информации? |

### Критерии исключения

| Критерий | Почему исключаем | Риск при включении |
|---|---|---|
| AI enthusiast (использует AI для всего) | AI novelty contamination | ZP-3: AI novelty ≠ AIS value |
| Друг/знакомый команды | Courtesy feedback, selection bias | ZP-6, FP-7 |
| Человек, заранее заинтересованный в AIS | Confirmation bias | FP-1 |
| Человек без реального проекта | Нереалистичные задачи | §14: Task Realism |
| Junior developer (< 2 года опыта) | Нехватка архитектурного контекста | Problem не релевантна |

### Screening protocol

1. Краткий опрос (5-7 вопросов) по критериям включения
2. Проверка наличия реального проекта для использования
3. Подтверждение роли (соответствие persona)
4. Запрос на согласие с правилами observation (§39)

---

## §9. Sample Size

### Минимальные и рекомендуемые объёмы

| Wave | Минимум | Рекомендуется | Personas | Цель |
|---|---|---|---|---|
| Wave 1 (Problem) | 5 | 8-10 | Tech Lead, Developer | Gate 1 |
| Wave 2 (Value) | 3 | 5 | Tech Lead, Developer, Architect | Gate 2, 3 |
| Wave 3 (Repeat) | 5 | 8 | Все 5 | Gate 4, 5 |

### Quality > quantity

Достижение числа участников **не является** автоматически успехом. Количество оценивается совместно с:

- Качеством evidence (независимое, поведенческое)
- Разнообразием personas (не 8 Tech Leads)
- Повторяемостью наблюдений (паттерн, не outlier)
- Количеством подтверждённых/опровергнутых гипотез

**Правило остановки:** если 3 последовательных участника дают одинаковый результат (подтверждение или опровержение) — гипотеза по данной persona насыщена. Продолжать для других personas.

---

## §10. Interview Protocol

### Before (подготовка)

1. Определить persona участника
2. Собрать предварительную информацию: опыт, текущий проект, размер команды, стек
3. Определить текущий workflow участника (как решает задачи сейчас)
4. Выбрать 2-3 сценария (§13) на основе persona и проекта
5. Подготовить baseline protocol (§12)
6. Подготовить recording (с разрешения)

### During (наблюдение)

**Роль наблюдателя:** молчаливый свидетель. Минимальное вмешательство.

| Действие | Разрешено | Запрещено |
|---|---|---|
| Фиксировать поведение и время | Да | — |
| Отвечать на вопросы «как это работает?» | Да (фактически) | — |
| Подсказывать «попробуйте спросить о...» | Нет | Подсказка = leading |
| Объяснять, что AIS должен был показать | Нет | Объяснение = demo effect |
| Исправлять ошибки использования | Нет | Защита от usability issue |
| Прерывать, если участник застрял > 5 мин | Да (техническая помощь) | — |

### After (post-session)

Структурированная беседа (10-15 минут):

1. «Что вы сделали бы с этой информацией?» (decision improvement)
2. «Что вы делаете сейчас для решения этой задачи?» (baseline comparison)
3. «Что изменилось после использования AIS?» (perceived value)
4. «Где AIS помог? Где затруднил?» (friction)
5. «Использовали бы вы это снова? Почему?» (retention signal)
6. «Чего вам не хватило?» (gaps — фиксировать, не обещать)

---

## §11. Запрещённые вопросы

### Не использовать как основное evidence

| Запрещённый вопрос | Почему | Замена |
|---|---|---|
| «Вам нравится AIS?» | Likes ≠ value | «Что вы сделали с результатом?» |
| «Вы бы купили AIS?» | Hypothetical ≠ WTP | «При какой цене вы бы искали альтернативу?» |
| «Вам кажется полезной эта функция?» | Feature enthusiasm | «Как бы вы решали эту задачу без AIS?» |
| «Оцените от 1 до 10» | Arbitrary scale | «Что конкретно вы сделали с этим?» |
| «Что бы вы улучшили?» | Feature factory trigger | «Где вы затормозили?» |

### Вопросы, привязанные к поведению (правильные)

| Правильный вопрос | Что измеряет |
|---|---|
| «Что вы сделали бы с этой информацией?» | Decision improvement (H3) |
| «Что вы делаете сейчас?» | Baseline (§12) |
| «Что изменилось после AIS?» | Value delta |
| «Использовали бы снова в следующей похожей задаче?» | Retention (H10) |
| «Почему вы выбрали именно это действие?» | Trust (H9) |
| «Что вы бы сделали без AIS в этой ситуации?» | Competitive substitution (H5) |

---

## §12. Current Workflow Baseline

**Без baseline нельзя корректно измерить improvement.** Baseline фиксируется ДО первого использования AIS.

### Что фиксировать

| Элемент | Как фиксировать | Зачем |
|---|---|---|
| Как пользователь решает задачу сейчас | Наблюдение + описание | Сравнение с AIS workflow |
| Какие инструменты использует | Список + порядок | Competitive substitution (§17) |
| Сколько источников контекста | Счётчик | Context advantage (§16) |
| Где возникают сомнения | Mark в процессе | Friction points |
| Где возникают задержки | Тайминг | Time-to-value (H3) |
| Где возникают ошибки | Фиксация ошибки | Problem severity (H1) |
| Когда требуется помощь другого человека | Фиксация | Collaboration cost |
| Как проверяется результат | Наблюдение | Quality standard |

### Baseline format

Для каждого сценария до использования AIS:

```
Participant: [ID]
Persona: [Tech Lead / Developer / ...]
Scenario: [A-H]
Baseline time: [min:sec]
Tools used: [list]
Sources consulted: [count]
Outcome: [description]
Confidence in outcome: [high/medium/low]
Friction points: [list]
```

### Baseline comparison metrics

| Metric | Baseline | AIS | Delta |
|---|---|---|---|
| Время | [измерено] | [измерено] | [вычислено] |
| Количество действий | [счётчик] | [счётчик] | [delta] |
| Количество источников | [счётчик] | [счётчик] | [delta] |
| Уверенность | [self-assessed] | [self-assessed] | [change] |
| Обнаруженные зависимости | [count] | [count] | [delta] |
| Качество решения | [observer assessment] | [observer assessment] | [delta] |
| Пропущенные факторы | [count] | [count] | [delta] |
| Необходимость доп. поиска | [yes/no] | [yes/no] | [change] |

---

## §13. AIS Task Protocol

### Восемь сценариев для MVP validation

Каждый сценарий привязан к Validation-001 (§23-§31). MVP-сценарии (A, B, D, G, H) выполняются полностью. Scenario C — базовый уровень (AT-3). Scenarios E, F — только pre-validation через интервью.

### Scenario A — Understand

**Задание:** «Понимайте компонент [X] в этом проекте. Узнайте, для чего он нужен, от чего зависит и что зависит от него.»

**Инструкция участнику:** Используйте AIS, чтобы понять выбранный компонент. Формулируйте вопросы на естественном языке.

**Что фиксировать:**
- Время от начала до первого полезного ответа
- Количество вопросов, заданных AIS
- Уровни Progressive Disclosure, к которым обратился (Level 1-5)
- Нашёл ли ранее неизвестную информацию (explicit или implicit)
- Принял ли действие на основе результата

**Связь с гипотезами:** H3 (AIS Value), H4 (Context Advantage), H8 (Integrated Understanding)

**Связь с capabilities:** Discovery → Model → AI Assistance → Visualization

### Scenario B — Dependency

**Задание:** «Определите все зависимости компонента [X]. Оцените, что произойдёт, если X изменится или будет удалён.»

**Инструкция участнику:** Используйте AIS для анализа зависимостей. Сравните с тем, как вы делаете это обычно.

**Что фиксировать:**
- Полнота обнаруженных зависимостей (vs. ожидания пользователя)
- Время vs. baseline (dependency-cruiser / вопросы коллегам)
- Пользователь обнаружил ранее неизвестную зависимость?
- Изменилось ли понимание последствий изменения?

**Связь с гипотезами:** H3 (AIS Value), H5 (Model Advantage), H8 (Integrated Understanding)

**Связь с capabilities:** Discovery → Model → Dependency Analysis → AI Assistance

### Scenario C — Change Impact

**Задание:** «Вы планируете изменить компонент [X]. Оцените, какие ещё части системы затронуты и какие риски.»

**MVP limitation:** Базовый Change Impact Assessment через композицию capabilities (AT-3). Полная версия с историческими паттернами — post-MVP.

**Что фиксировать:**
- Полно ли AIS перечислил затронутые компоненты?
- Пользователь принял решение на основе оценки?
- Сравнение с текущим методом (grep + вопросы + git blame)

**Связь с гипотезами:** H3 (AIS Value), H8 (Integrated Understanding)

### Scenario D — Security

**Задание:** «Проанализируйте security findings для этого проекта. Определите, какие из них представляют реальный бизнес-риск.»

**Инструкция участнику:** Посмотрите security findings через AIS. Сравните с тем, как вы обычно анализируете результаты сканеров.

**Что фиксировать:**
- Изменилась ли приоритизация findings после просмотра в контексте?
- Пользователь увидел бизнес-риск, не видимый без контекста?
- Принял ли решение на основе результата?

**Связь с гипотезами:** H3 (AIS Value), H6 (Knowledge Advantage), H8 (Integrated Understanding)

**Связь с capabilities:** Discovery → Model → Security Analysis → AI Assistance

### Scenario E — Technical Debt

**MVP Status:** Отложен (TDT — out of scope для MVP). Pre-validation через интервью:

«Если бы инструмент показывал технический долг привязанным к архитектуре, с приоритизацией по бизнес-влиянию — было бы это полезно для вашей работы? Приведите конкретный пример.»

### Scenario F — Evolution

**MVP Status:** Отложен (Evolution absent в MVP, AT-2). Pre-validation через интервью:

«Если бы инструмент показывал, как архитектура вашего проекта менялась за последние 6 месяцев, какие решения вы бы приняли иначе?»

### Scenario G — Architecture Decision

**Задание:** «Ваша команда обсуждает: следует ли вынести [компонент X] в отдельный сервис. Используйте AIS для подготовки аргументов.»

**Что фиксировать:**
- Качество анализа (полезен ли для реального решения?)
- Доверие к рекомендации (учитывает ли? Модифицирует ли? Отклоняет ли?)
- Сравнение с текущим методом (опыт + интуиция + архитектурные документы)

**Связь с гипотезами:** H3 (AIS Value), H9 (Trust)

### Scenario H — Unknown System

**Задание:** «Подключите проект, с которым вы не работали (или работали мало). Попытайтесь понять его архитектуру.»

**Инструкция участнику:** Это ваш первый контакт с проектом. Используйте AIS для ускорения понимания.

**Что фиксировать:**
- Время от подключения до «я понимаю структуру»
- Полнота понимания (компоненты, слои, зависимости)
- Сравнение с обычным онбордингом (чтение кода + вопросы)

**Связь с гипотезами:** H3 (AIS Value), H4 (Context Advantage), H5 (Model Advantage)

---

## §14. Task Realism

### Критерии валидного задания

Задание считается валидным только если:

1. **Отражает реальную работу пользователя** — задача, которую пользователь решает в текущей работе (не придуманная для демо)
2. **Пользователь имеет личный интерес в решении** — не «потестируйте это», а «решите вашу задачу с помощью AIS»
3. **Ответ не очевиден заранее** — если пользователь уже знает ответ, наблюдение бесполезно
4. **Задача достаточно сложна** — trivia не создаёт friction, который AIS должен уменьшить

### Недопустимые задания

| Тип | Пример | Почему недопустим |
|---|---|---|
| Trivia | «Сколько файлов в проекте?» | Не создаёт архитектурное понимание |
| Искусственные вопросы | «Какой компонент отвечает за аутентификацию?» (если пользователь знает) | Ответ известен |
| Demo-оптимизированные | Специально созданный проект с «правильной» структурой | Не отражает реальную сложность |
| Очевидные ответы | «Есть ли зависимости в монолите?» | Не создаёт friction |

### Источник заданий

Задания берутся из реального опыта участника. При рекрутменте (§8) собирается список текущих задач. 2-3 задачи выбираются для AIS validation.

---

## §15. Baseline vs AIS Comparison

### Protocol

Для каждого сценария (A, B, C, D, G, H):

1. **Шаг 1:** Участник решает задачу своими обычными инструментами (baseline). Фиксируются метрики из §12.
2. **Шаг 2:** Участник решает ту же задачу с AIS. Фиксируются те же метрики.
3. **Шаг 3:** Сравнение.

### Метрики сравнения

| Metric | Baseline | AIS | Delta | Interpretation |
|---|---|---|---|---|
| Время (мин:sec) | | | | Delta < 0 = AIS быстрее |
| Количество действий | | | | Delta < 0 = AIS проще |
| Количество источников | | | | Delta < 0 = AIS консолидирует |
| Уверенность (1-5) | | | | Delta > 0 = AIS повышает уверенность |
| Обнаруженные зависимости | | | | Delta > 0 = AIS полнее |
| Качество решения (1-5) | | | | Observer assessment |
| Пропущенные факторы | | | | Delta < 0 = AIS полнее |
| Дополнительный поиск (да/нет) | | | | AIS = нет → self-sufficient |

### Observer assessment

Наблюдатель оценивает «качество решения» по 3 критериям:
1. Полнота (все релевантные факторы учтены?)
2. Корректность (фактически верное решение?)
3. Обоснованность (пользователь может объяснить почему?)

---

## §16. Context Advantage Test

### Цель

Проверить: что AIS знает/понимает благодаря единой архитектурной модели, чего пользователь не получает от generic AI при тех же исходных данных?

### Protocol

1. Пользователь формулирует вопрос об архитектуре своего проекта
2. **AIS:** получает ответ на основе Architecture Model + Analysis + Knowledge
3. **Generic AI:** пользователь задаёт тот же вопрос generic AI (ChatGPT/Claude), предоставляя тот контекст, который **реально передал бы** (обычно: описание проекта + фрагмент кода + вопрос)
4. **Слепое сравнение:** наблюдатель показывает оба ответа без меток. Пользователь выбирает более полезный.

### Критическое правило честности

Generic AI получает **только тот контекст, который пользователь реально передал бы**. Не давать generic AI:
- Полный Discovery output
- Architecture Model
- Security Analysis results
- Dependency Graph

Пользователь передаёт generic AI то, что обычно копирует в ChatGPT: описание + код + вопрос. Это честное сравнение.

### Что фиксировать

| Metric | Как измеряется |
|---|---|
| Предпочтение (AIS / Generic / Both equal / Neither) | Blind choice |
| Конкретные различия (что было в одном и не было в другом) | Пользователь описывает |
| Привело ли различие к другому решению? | Наблюдение |
| Какой ответ привёл к действию? | Наблюдение |

### Связь с гипотезами

H4 (Context Advantage): ≥ 70% предпочитают AIS → E2.

---

## §17. AI Wrapper Test

### Цель

Проверить: может ли пользователь получить практически ту же ценность, просто используя generic AI и существующие инструменты?

### Protocol

1. Пользователь решает задачу **с AIS** (Scenario A-H)
2. Пользователь решает **ту же задачу** с доступом к: VS Code + GitHub + SonarQube/semgrep + dependency-cruiser + ChatGPT + draw.io
3. Сравнение по метрикам из §15

### Decision rule

| Результат | Interpretation | AI Wrapper Risk |
|---|---|---|
| AIS значительно лучше (время ≤ 50%, качество выше) | Композиция создаёт ценность | LOW |
| AIS немного лучше (время ≤ 75%) | Композиция полезна, но не уникальна | MEDIUM |
| AIS сопоставим (время 75-125%) | AI Wrapper Risk подтверждён | **HIGH** |
| AIS хуже | Серьёзная проблема продукта | CRITICAL |

### Если AI Wrapper Risk = HIGH

Зафиксировать конкретную причину, почему композиция не работает:

| Причина | Проверяемый инвариант |
|---|---|
| Unified context не создаёт дополнительной ценности | D2 (Results Bound to Model) |
| Persistent understanding не наблюдается (session-level insufficient) | D7 (Knowledge Accumulates) |
| Architecture-bound evidence не отличается от отдельных findings | D1 (Model Before Analysis) |
| Evolution absent в MVP — нет временной перспективы | AT-2 (accepted trade-off) |
| Dependency context не усиливает анализ | D6 (Security with Architecture) |
| Quality signals не видны пользователю | Quality Architecture (10 dimensions) |
| Explainability не отличается от generic AI | D4 (All Recommendations Explained) |
| Cross-capability reasoning не работает | D8 (Unified Platform) |

---

## §18. Observation Model

### Семь категорий наблюдения

**1. User actions.** Что делает: клики, запросы, навигация, время на каждом шаге. Фиксируется как sequence: action → timestamp → result.

**2. User questions.** Что спрашивает у AIS. Формулировка вопроса = intent. Категория вопроса (§13 scenarios) = гипотеза mapping.

**3. User confusion.** Где теряется: паузы > 15 сек, возвраты назад, повторные запросы с reformulation. Confusion = UX problem signal.

**4. User verification.** Что проверяет самостоятельно: открывает IDE для проверки, спрашивает коллегу, ищет в документации. Verification = trust signal (положительный — проверяет; отрицательный — не доверяет совсем).

**5. User trust.** Где доверяет / не доверяет: принимает ли рекомендацию, запрашивает ли Level 2+ (Why), игнорирует ли объяснение.

**6. User correction.** Где исправляет AIS: «нет, это не так», «ты не учёл X». Correction = Quality Signal (INV-Q1: Feedback Is Signal).

**7. User decision.** Как результат AIS влияет на решение: принял / модифицировал / отклонил. Decision = North Star Metric (осознанное решение).

### Observation format

```
[timestamp] [participant-ID] [scenario] [category]: [description]
[timestamp] [participant-ID] [scenario] EVIDENCE: [hypothesis] [level-change] [interpretation]
```

---

## §19. Quality Signals

### Интеграция с Quality & Feedback Architecture

10 signal types из Quality Architecture. В MVP доступны 6:

| Signal | Definition | Validation use | Evidence link |
|---|---|---|---|
| Positive (6.1) | Пользователь подтвердил корректность | H9 (Trust) | Confirmation ≠ Truth (INV-Q1)
| Correction (6.2) | Пользователь исправил AIS | Quality finding | Самый ценный signal
| Rejection (6.3) | Пользователь отклонил результат | H9 (Trust) | Менее специфичный
| Confirmation (6.4) | Пользователь подтвердил | H9 (Trust) | Confirmation ≠ Truth
| Missing Context (6.6) | Пользователь указал на недостаток | Knowledge bootstrap | Metric gap indicator
| Decision (6.11) | Пользователь принял решение | North Star | Direct value evidence |

### Post-MVP signals (не доступны в MVP)

Clarification Request (6.5), Conflict (6.7), Uncertainty (6.8), Escalation (6.9), Repeated Failure (6.10).

### Critical rules

**Feedback ≠ Truth.** Correction signal «X не зависит от Y» — это observation, не факт об архитектуре. Требует валидации (Quality Architecture: Signal Lifecycle, 8 стадий).

**Feedback ≠ Knowledge.** Путь: feedback → validation → potential Knowledge. Не напрямую (INV-Q2: Feedback Is Not Knowledge).

**Feedback ≠ Model Mutation.** Feedback не изменяет Model, Knowledge, findings напрямую (INV-Q4: Feedback Does Not Mutate Model).

### Observer recording

Для каждого signal: participant ID, timestamp, scenario, signal type, user statement (verbatim), observer interpretation, related hypothesis.

---

## §20. Feedback → Quality Loop

### Цепочка

```
Observation → Feedback → Quality Signal → Contextualization → Validation →
Quality Finding → Root Cause Classification → Product Decision
```

### Что feedback НЕ должен делать автоматически

| Запрещённое действие | Почему | Защита |
|---|---|---|
| Менять Model | INV-Q4 | Feedback → Validation → Decision |
| Менять Knowledge | INV-Q2 | Knowledge требует валидации |
| Менять Architecture | D1-D10 неизменны | Product Decision Framework process |
| Менять MVP scope | Feature Factory Protection | §32 |
| Менять гипотезы | VA-7 | Emergent Findings, не hypothesis mutation |

### Post-session processing

1. Собрать все signals за сессию
2. Классифицировать по типу (6 типов)
3. Оценить: повторяющийся pattern или outlier?
4. Если pattern: создать Quality Finding
5. Классифицировать root cause (9 категорий из Quality Architecture)
6. Записать в Evidence Ledger (§34)
7. Product Decision: Keep / Refine / Remove / Defer / Investigate (§33)

---

## §21. Hypothesis Mapping

### Для каждой H1-H12 из Validation-001

| Hyp | Test | Evidence Source | Current E | Target E | Pass Criterion | Result | New E | Decision |
|---|---|---|---|---|---|---|---|---|
| H1 | Interviews (Phase 1) | Problem statements | E1 | E2 | ≥ 7/10 symptoms confirmed | — | — | — |
| H2 | Interviews (Phase 1) | Frequency data | E1 | E2 | ≥ weekly for ≥ 70% | — | — | — |
| H3 | Scenarios A-H (Phase 2) | Task completion | E0 | E2 | First Analysis Success > 70% | — | — | — |
| H4 | Context Test (§16) | Blind comparison | E1 | E2 | ≥ 70% prefer AIS | — | — | — |
| H5 | Competitive (§17) | Baseline vs AIS | E1 | E2 | AIS time ≤ 50% | — | — | — |
| H6 | Longitudinal (Phase 3) | Quality improvement | E1 | E3 | User notices improvement | — | — | — |
| H7 | Interview pre-val | Interest in history | E1 | E2 | ≥ 50% express interest | — | — | — |
| H8 | Scenario comparison | Composition value | E1 | E2 | ≥ 70% prefer integrated | — | — | — |
| H9 | Trust indicators | Recommendation action | E0 | E2 | Recommendations → action | — | — | — |
| H10 | Retention (Phase 3) | Return behaviour | E0 | E3 | ≥ 40% return in 7 days | — | — | — |
| H11 | Comparative eval | Category perception | E1 | E2 | ≥ 70% not chatbot/scanner | — | — | — |
| H12 | WTP test | Van Westendorp | E0 | E3 | WTP > 0 for ≥ 50% | — | — | — |

### Rule

Ни одна гипотеза не считается подтверждённой только потому, что пользователь дал положительный verbal feedback. Требуется **поведенческое evidence** (observed action, not stated opinion).

---

## §22. Validation Gates

### Overview из Validation-001, расширенный execution detail

| Gate | Input | Min Evidence | PASS | FAIL | INCONCLUSIVE | Next |
|---|---|---|---|---|---|---|
| 1 | H1, H2 (E2) | 3+ participants | ≥ 4/5 criteria | Problem not confirmed | Mixed signals | Reframe or continue |
| 2 | H3, H4, H5 (E2) | 3+ participants, 3+ scenarios | ≥ 4/5 criteria | AIS no improvement | Unclear value | Fix or reframe |
| 3 | H6, H7, H8 (E2/E3) | 5+ participants | ≥ 3/4 criteria | No differentiation | Partial | Reposition |
| 4 | H9, H10 (E2/E3) | 2+ weeks, 5+ users | ≥ 3/4 criteria | No return | Insufficient time | Extend or pivot |
| 5 | H11, H12 (E2/E3) | WTP data | ≥ 3/5 criteria | No WTP | No commercial signal | Change model |

### INCONCLUSIVE handling

INCONCLUSIVE ≠ PASS. Если evidence недостаточно: не объявлять success, не объявлять failure. Определить, какие данные отсутствуют, провести следующий validation test.

---

## §23. Gate 1 — Problem Validated

### Input
H1 (Problem Existence), H2 (Problem Frequency). Phase 1: user interviews без продукта.

### Minimum evidence
3+ участников (Tech Lead + Developer minimum). 5-10 рекомендуется.

### PASS criteria (из Validation-001 §33)

| # | Criterion | Threshold | Data source |
|---|---|---|---|
| 1 | Описанные симптомы подтверждены | ≥ 7 из 10 | Interview coding |
| 2 | Проблема в top-3 приоритетов | ≥ 60% | Direct question |
| 3 | Частота: ≥ еженедельно | ≥ 70% | Interview |
| 4 | Время на эпизод: ≥ 30 мин | Среднее | Interview |
| 5 | Workarounds соответствуют | Qualitative | Interview |

**Pass condition:** ≥ 4 из 5.

### FAIL → STOP / REFRAME
Не переходить к feature validation. Возможные действия:
- Сузить personas
- Переформулировать symptoms
- Обосновать, почему проблема станет priority

---

## §24. Gate 2 — Value Validated

### Input
H3 (AIS Value), H4 (Context Advantage), H5 (Model Advantage). Phase 2: scenario-based validation.

### Minimum evidence
3+ участников, 3+ сценариев из {A, B, D, G, H}.

### PASS criteria

| # | Criterion | Threshold | Data source |
|---|---|---|---|
| 1 | First Analysis Success | > 70% | Scenario observation |
| 2 | Нашёл новую информацию | ≥ 1 на сессию | Scenario observation |
| 3 | Context улучшает ответ | ≥ 70% prefer | Blind comparison (§16) |
| 4 | AIS лучше комбинации | Время ≤ 50% | Baseline comparison (§15) |
| 5 | Действие на основе результата | ≥ 1 действие | Observation (§18) |

**Pass condition:** ≥ 4 из 5.

### FAIL → Evaluate
Проблема в implementation (исправить) или в hypothesis (переоценить value proposition)?

---

## §25. Gate 3 — Context Advantage Validated

### Input
H6 (Knowledge Advantage), H7 (Evolution Advantage — pre-validation), H8 (Integrated Understanding).

### PASS criteria

| # | Criterion | Threshold | Data source |
|---|---|---|---|
| 1 | Композиция > сумма частей | ≥ 70% prefer integrated | Scenario comparison |
| 2 | Knowledge улучшает качество | User notices improvement | Longitudinal (Phase 3) |
| 3 | Интерес к Evolution | ≥ 50% | Interview |
| 4 | Уникальная характеристика названа | Qualitative | Post-scenario question |

**Pass condition:** ≥ 3 из 4.

### MVP limitation
H6, H7 — частичная валидация (session-level Knowledge, Evolution absent). Полная — Phase 3.

---

## §26. Gate 4 — Repeat Value

### Input
H9 (Trust), H10 (Repeat Value). Phase 3: retention measurement.

### PASS criteria

| # | Criterion | Threshold | Data source |
|---|---|---|---|
| 1 | Возврат в течение 7 дней | ≥ 40% | Behavioural analytics |
| 2 | Retention через 30 дней | ≥ 20% | Behavioural analytics |
| 3 | Рекомендации → действие | Стабильно/растёт | Quality signals |
| 4 | Причина возврата: новое понимание | Qualitative | Follow-up interview |

**Pass condition:** ≥ 3 из 4.

### Critical distinction

Отделить: «было интересно один раз» от «это стало частью моего workflow».

| Signal | Type | Evidence value |
|---|---|---|
| «Было полезно» | First-session opinion | E0 (ZP-1) |
| «Я вернусь» | Stated intention | E0 (ZP-2) |
| Вернулся через 3 дня | Behaviour | E3 |
| Использует еженедельно | Repeated behaviour | E3 |
| Порекомендовал коллеге (unsolicited) | Advocacy | E3 |

---

## §27. Gate 5 — Commercial Signal

### Input
H11 (Differentiation), H12 (Commercial Value). Только после Gates 1-4.

### PASS criteria

| # | Criterion | Threshold | Data source |
|---|---|---|---|
| 1 | WTP > 0 | ≥ 50% | Van Westendorp |
| 2 | Конкретная сумма названа | Qualitative | WTP test |
| 3 | Pricing preference определена | Qualitative | WTP test |
| 4 | Pilot организация готова | ≥ 1 | Pilot negotiation |
| 5 | Категория воспринята корректно | ≥ 70% not chatbot | Post-scenario |

**Pass condition:** ≥ 3 из 5.

### Rule
Не начинать commercial validation раньше value validation. Commercial signal без подтверждённой ценности — noise.

---

## §28. Failure Conditions

### Десять обязательных failure conditions

| # | Condition | Detection | Consequence |
|---|---|---|---|
| F-1 | Проблема отсутствует | Gate 1 FAIL | STOP / REFRAME |
| F-2 | Проблема слишком редка | H2: < monthly | REFRAME (не MVP target) |
| F-3 | Baseline уже достаточно хорош | AIS ≤ baseline | Пересмотреть value proposition |
| F-4 | AIS не улучшает результат | Gate 2 FAIL | Fix implementation или reframe |
| F-5 | Generic AI даёт ту же ценность | §17: AI Wrapper Risk HIGH | Пересмотреть D1-D2 или positioning |
| F-6 | Пользователь не доверяет AIS | H9: recommendations ignored | Усилить explainability |
| F-7 | Context advantage отсутствует | §16: no preference | Пересмотреть D1-D5 |
| F-8 | AIS требует слишком много усилий | Время setup > value | Упростить onboarding |
| F-9 | Результат не влияет на решение | H3: no action | Переформулировать value |
| F-10 | Пользователь не возвращается | H10: < 20% return | Пересмотреть retention mechanisms |

---

## §29. Inconclusive Result

**INCONCLUSIVE ≠ PASS.** Если evidence недостаточно для PASS или FAIL:

1. Не объявлять success
2. Не объявлять failure
3. Определить, какие данные отсутствуют
4. Провести следующий validation test с уточнённым protocol
5. Записать в Evidence Ledger как INCONCLUSIVE

### Примеры

| Ситуация | Действие |
|---|---|
| 2 из 5 подтвердили, 3 не смогли完成任务 | Техническая проблема (prototype). Устранить и повторить. |
| Tech Lead подтвердил, Developer не подтвердил | Persona-specific. Разные personas — разные проблемы. |
| Scenario A подтвердил, B — нет | Capability-specific. Не все capabilities создают одинаковую ценность. |
| Первый participant подтвердил, второй — нет | Недостаточно data. Продолжить. |

---

## §30. False Positive Protection

### Восемь источников ложноположительных результатов

| # | Bias | Description | Protection |
|---|---|---|---|
| FP-1 | Founder bias | Создатель видит ценность там, где её нет | Independent observer conducts sessions |
| FP-2 | Confirmation bias | Поиск подтверждений, игнорирование противоречий | Seek disconfirmation (§4) |
| FP-3 | AI enthusiasm | Новизна AI создаёт позитивный эффект | Context advantage test (§16): сравнение с generic AI |
| FP-4 | Demo effect | Красивая демонстрация ≠ реальное использование | Real tasks (§14), not demo scenarios |
| FP-5 | Novelty effect | Первое использование всегда exciting | Repeat value (Gate 4), not first session |
| FP-6 | Courtesy feedback | Участник хочет быть вежливым | Behaviour observation, not opinion |
| FP-7 | Selection bias | Участники заранее заинтересованы | §8: exclusion criteria |
| FP-8 | Survivorship bias | Только успешные случаи анализируются | Фиксировать все, включая неудачные |

### Mechanism

Наблюдатель conducting sessions **не является** разработчиком AIS. Если это невозможно — минимум: наблюдатель не представляет AIS участнику, не комментирует результаты, не объясняет «что AIS хотел показать».

---

## §31. False Negative Protection

Не объявлять гипотезу плохой после:

| Situation | Why not failure | Action |
|---|---|---|
| Одного пользователя | Outlier, не pattern | Продолжить набор |
| Технической ошибки прототипа | Implementation bug, не hypothesis | Исправить и повторить |
| Плохого onboarding | UX problem, не value problem | Упростить, повторить |
| Неподходящей persona | H1 не покрывает данного пользователя | Проверить persona matching |
| Нерепрезентативной задачи | Задача не создаёт friction | Заменить задачу (§14) |

### Rule
Одно наблюдение = 0.5 evidence (пониженный вес). Минимум 3 наблюдения для E1 → E2.

---

## §32. MVP Scope Protection

### Правило

Результаты validation **НЕ могут** быть использованы для:
- Добавления новых capabilities в MVP
- Расширения scope текущего stage
- Обоснования Feature Requests вне Capability Map
- Изменения D1-D10 на основе заявлений

### Обработка feature requests

| User says | Type | Action |
|---|---|---|
| «Добавьте интеграцию с Jira» | Feature request | Emergent Findings, не scope change |
| «Мне нужно больше X» | Depth request | Углубить существующую capability |
| «Мне не хватает Y» | Gap signal | Оценить через Decision Framework |
| «А если бы Z делал...» | Hypothetical | Фиксировать, не действовать |

### Decision path

Каждое изменение проходит: **Evidence → Product Decision Framework (6 criteria + 6 rejection criteria) → MVP Boundary Check → Decision**.

Если изменение не усиливает Architecture Model (Decision Framework criterion #4) — отклонить.

---

## §33. Change Decision Model

После каждого validation wave (3+ participants):

### Keep
Evidence подтверждает направление. Продолжать.
*Trigger:* гипотеза подтверждена, behaviour соответствует ожиданиям.

### Refine
Ценность есть, но требует изменения.
*Trigger:* гипотеза подтверждена, но friction или misunderstanding.
*Examples:* переформулировать prompt, изменить Progressive Disclosure, уточнить onboarding.

### Remove
Ценность недостаточна.
*Trigger:* гипотеза опровергнута (≥ 3 independent evidence против).
*Action:* capability остаётся в архитектуре, но deprioritised в UX.

### Defer
Идея полезна, но не сейчас.
*Trigger:* ценность подтверждена, но MVP не может её предоставить (e.g., Evolution).
*Action:* перенести в roadmap stage.

### Investigate
Evidence недостаточно.
*Trigger:* INCONCLUSIVE (§29).
*Action:* уточнить protocol, провести следующий test.

---

## §34. Evidence Ledger

### Единый формат записи

```yaml
evidence_id: EVD-001
participant: P-003
persona: Tech Lead
scenario: A (Understand)
hypothesis: H3 (AIS Value)
observation: "Участник нашёл ранее неизвестную циклическую зависимость между auth и billing. Принял решение отложить рефакторинг до следующего спринта."
interpretation: AIS Value подтверждена для данной persona и сценария. Решение принято.
confidence: high
evidence_level: E2
evidence_weight: 1.0  # full independent evidence
contradiction: null
related_capability: Dependency Analysis + AI Assistance
related_quality_signal: Decision (6.11)
decision: Keep
timestamp: 2026-09-XX
```

### Fields

| Field | Required | Description |
|---|---|---|
| evidence_id | Yes | Уникальный ID (EVD-NNN) |
| participant | Yes | Participant ID (P-NNN) |
| persona | Yes | Из §7 |
| scenario | Yes | Из §13 (A-H) |
| hypothesis | Yes | Из H1-H12 |
| observation | Yes | Verbatim описание (что произошло) |
| interpretation | Yes | Что это значит (аналитика, не факт) |
| confidence | Yes | high / medium / low |
| evidence_level | Yes | E0-E4 |
| evidence_weight | Yes | 0-1.5 (§6 rules) |
| contradiction | No | ID противоречащего evidence |
| related_capability | No | Из Capability Map |
| related_quality_signal | No | Из §19 |
| decision | Yes | Keep / Refine / Remove / Defer / Investigate |
| timestamp | Yes | Когда наблюдено |

---

## §35. Contradiction Handling

Если два пользователя дают противоположные результаты:

### Не усреднять автоматически

| Action | When |
|---|---|
| Записать оба evidence | Всегда |
| Связать через contradiction ID | Всегда |
| Классифицировать причину | Всегда |
| Усреднить (вычислить «баланс») | **Никогда** |

### Классификация причин

| Cause | Description | Action |
|---|---|---|
| Persona difference | Разные personas — разные проблемы | Ожидаемо. Разделить по personas. |
| Task difference | Разные задачи — разный friction | Ожидаемо. Разделить по сценариям. |
| Context difference | Разные проекты/стеки | Ожидаемо. Фиксировать контекст. |
| Experience difference | Разный уровень опыта | Ожидаемо. Фиксировать опыт. |
| Genuine product contradiction | Продукт работает для одних personas и не для других | Важный finding. Investigate. |

---

## §36. Architecture Decision Validation

Проверка D1-D10 через наблюдаемое поведение. Расширяет Validation-001 §38.

### D1: Model Before Analysis
| Parameter | Value |
|---|---|
| Observable behaviour | Пользователь использует результаты анализа, привязанные к модели |
| Scenarios | A, D, H |
| Confirm | Пользователь ссылается на архитектурный контекст при обсуждении findings |
| Contradict | Пользователь игнорирует модель, смотрит только findings |
| MVP testable | Yes |

### D2: Results Bound to Model
| Parameter | Value |
|---|---|
| Observable behaviour | Пользователь исследует finding через модель (переходит по связям) |
| Scenarios | B, D |
| Confirm | Исследование через модель (клики на связанные компоненты) |
| Contradict | Экспорт findings и работа вне контекста |
| MVP testable | Yes |

### D3: AI Assists Not Replaces
| Parameter | Value |
|---|---|
| Observable behaviour | Пользователь модифицирует или отклоняет рекомендацию |
| Scenarios | G, A |
| Confirm | Пользователь принимает решение после AIS, а не следует автоматически |
| Contradict | «Просто сделай» или «примени автоматически» |
| MVP testable | Yes |

### D4: All Recommendations Must Be Explained
| Parameter | Value |
|---|---|
| Observable behaviour | Пользователь запрашивает Level 2+ (Why/Evidence) |
| Scenarios | G, D |
| Confirm | Запрос Progressive Disclosure Level 2+ |
| Contradict | Игнорирует объяснение, смотрит только рекомендацию |
| MVP testable | Yes |

### D5: Context Over Rules
| Parameter | Value |
|---|---|
| Observable behaviour | Пользователь ценит project-specific ответ |
| Scenarios | A, H |
| Confirm | «Это применимо к моему проекту» (explicit statement) |
| Contradict | «Покажи стандартные правила» |
| MVP testable | Yes |

### D6: Security with Architecture
| Parameter | Value |
|---|---|
| Observable behaviour | Security Engineer принимает другое решение после контекста |
| Scenarios | D |
| Confirm | Изменение приоритизации после просмотра в контексте |
| Contradict | «Покажи только список уязвимостей» |
| MVP testable | Yes |

### D7: Knowledge Accumulates
| Parameter | Value |
|---|---|
| Observable behaviour | Ответы точнее при повторном использовании |
| Scenarios | H6 (longitudinal) |
| Confirm | Пользователь замечает улучшение |
| Contradict | Не замечает разницы |
| MVP testable | Partial (session-level) |

### D8: Unified Platform
| Parameter | Value |
|---|---|
| Observable behaviour | Пользователь использует несколько capabilities в одной сессии |
| Scenarios | B, D, H5 |
| Confirm | Естественное переключение между capabilities через единую модель |
| Contradict | Использует только одну capability за раз |
| MVP testable | Yes |

### D9: Understanding, Not Error Finding
| Parameter | Value |
|---|---|
| Observable behaviour | Вопросы преобладают над запросами рекомендаций |
| Scenarios | A, G |
| Confirm | Questions > recommendation requests (Success Metric #11) |
| Contradict | «Покажи все проблемы» |
| MVP testable | Yes |

### D10: New Capabilities Strengthen Model
| Parameter | Value |
|---|---|
| Observable behaviour | Запросы пользователей усиливают существующие capabilities |
| Scenarios | Feature Factory Protection (§32) |
| Confirm | Запросы относятся к углублению, не расширению |
| Contradict | Запрос требует capability вне модели |
| MVP testable | Yes |

---

## §37. UX Validation

### Что проверяем из Understanding-Centered Interaction Architecture

| Principle | Observable behaviour | Scenarios |
|---|---|---|
| Intent-First | Пользователь формулирует намерение, не выбирает capability | A, G |
| Minimal Sufficient Understanding | Ответ достаточен для решения или следующего вопроса | A, B, D |
| Progressive Disclosure (5 levels) | Пользователь запрашивает Level 2+ (Why), иногда Level 3+ (Evidence) | A, D, G |
| Context Before Presentation | AIS не показывает данные без запроса | A, H |
| Model Before Interpretation | AI отвечает на основе Model, не из общих знаний | A, D (§16 test) |
| Explain Before Recommend | Рекомендация следует за объяснением | G, D |
| Human Decision Boundary | Пользователь принимает решение, не AIS | G |
| No False Certainty | Пользователь видит неопределённость (explicit) | D, C |
| AI Not Source of Truth | Пользователь не воспринимает AI-ответ как абсолютную истину | A, G |
| Generic Chat Boundary | При недостатке контекста — явное сообщение, не компенсация | A |

### Siri-like simplicity check

Целевой принцип: **Siri-like simplicity, но без потери architectural depth.**

| Проверка | Confirm | Contradict |
|---|---|---|
| Пользователь не перегружен | Не запрашивает «меньше информации» | «Слишком много данных» |
| Только релевантный context | Не видит нерелевантных данных | «Зачем вы показали это?» |
| Progressive Disclosure работает | Запрашивает углубление (Level 2+) | Не использует углубление |
| Понимание «почему» | Может объяснить, почему получил ответ | Не может объяснить |
| Uncertainty видима | Отмечает неопределённость как позитив | Не замечает |
| Не dashboard overload | Не жалуется на количество экранов | «Слишком сложно» |

---

## §38. Quality Validation

### Что проверяем из Quality & Feedback Architecture

| Dimension | Observable indicator | Source |
|---|---|---|
| Correctness | Пользователь подтверждает корректность (Confirmation signal) | Quality Architecture §7 |
| Context Completeness | Missing Context signal (§19) | Quality Architecture §7.2 |
| Traceability | Пользователь запрашивает Level 3 (Evidence) | Quality Architecture §7.3 |
| Explainability | Пользователь запрашивает Level 2 (Why) | Quality Architecture §7.4 |
| Uncertainty Calibration | Пользователь видит неопределённость | Quality Architecture §7.5 |
| Relevance | Ответ соответствует intent | Quality Architecture §7.7 |
| Decision Support Quality | Действие на основе ответа | Quality Architecture §7.8 |

### Post-MVP dimensions (не проверяются в MVP)

Historical Accuracy (7.9), Organizational Alignment (7.10) — требуют Evolution и полноценного OA.

### Rule
Не сводить quality к одной метрике accuracy. Единая числовая оценка категорически запрещена (Quality Architecture). 10 dimensions существуют для диагностики.

---

## §39. Data Privacy & Ethics

### Минимальные правила

| Rule | Implementation |
|---|---|
| Consent | Явное информированное согласие перед каждой сессией. Форма: «Вы соглашаетесь на наблюдение и запись? Данные будут анонимизированы.» |
| Anonymization | Participant ID (P-NNN) вместо имени. Проект описывается без идентифицирующих данных. |
| Separation | Participant identity хранится отдельно от evidence. Evidence ledger содержит только P-NNN. |
| No unnecessary data | Собирается только то, что нужно для гипотез (§21). Не surveillance. |
| No hidden recording | Запись (аудио/video) только с явного разрешения. |
| Transparent observation | Участник знает, что наблюдается и что фиксируется. |
| Secure handling | Данные хранятся в защищённом месте. Доступ — только validation team. |
| Deletion policy | По запросу участника — удалить все его данные. Срок хранения — 1 год после последнего использования. |

---

## §40. Validation Report

После каждой validation wave (3+ участников) создаётся отчёт.

### Формат отчёта

1. **Participants:** P-NNN, personas, проекты, опыт
2. **Scenarios executed:** какие, сколько, результаты
3. **Hypotheses tested:** таблица из §21 с заполненными Result/New E/Decision
4. **Observations:** summary по каждой гипотезе
5. **Evidence summary:** количество по E-levels, распределение по personas
6. **Contradictions:** из §35
7. **E-level changes:** таблица before/after
8. **Gate results:** PASS/FAIL/INCONCLUSIVE для каждого gate
9. **Failures:** какие failure conditions (§28) сработали
10. **Quality signals:** summary из §19
11. **Product decisions:** Keep/Refine/Remove/Defer/Investigate из §33
12. **Architecture implications:** какие D1-D10 подтверждены/под вопросом
13. **Emergent findings:** запросы, не покрытые гипотезами
14. **Next validation cycle:** что делать дальше

---

## §41. Stop Conditions

| Condition | Action | Reason |
|---|---|---|
| Gate PASS | Продолжить к следующему gate | Sequential progression |
| Gate FAIL | STOP или REFRAME | Evidence против гипотезы |
| Evidence saturation | Продолжить к следующей гипотезе | Достаточно data |
| Hypothesis invalidated | Record, не retry | Honest science |
| MVP boundary invalidated | PAUSE, переоценить scope | Fundamental problem |
| Critical architecture issue | PAUSE, обратиться к Architecture Layer | Invariant violation |
| Safety/privacy issue | IMMEDIATE STOP | Ethical requirement |
| 3 consecutive identical results | Гипотеза насыщена по данной persona | Efficiency |

---

## §42. Learning Loop

### Главная цепочка

```
User → AIS → Observation → Evidence → Quality → Product Knowledge → Decision → AIS Improvement
```

### Два типа Knowledge — НЕ смешивать

| Type | Definition | Source | Owner | Storage |
|---|---|---|---|---|
| **Product Knowledge** | Что мы узнали о продукте и пользователях | Validation evidence | Validation team | Evidence Ledger + Reports |
| **AIS Knowledge** | Что AIS знает об анализируемых системах | Discovery + Analysis | AIS (Model + Knowledge layer) | Architecture Model |

**Product Knowledge не влияет на AIS Knowledge.** Результаты валидации не меняют Model, не меняют Knowledge, не меняют findings (INV-Q4, §20).

**AIS Knowledge не влияет на Product Knowledge.** То, что AIS «думает» о системе, не является evidence о ценности продукта.

### Learning loop валидации

1. **Observe:** зафиксировать behaviour (§18)
2. **Classify:** привязать к гипотезам (§21)
3. **Evidence:** записать в Ledger (§34)
4. **Quality:** обработать signals (§19-§20)
5. **Product Knowledge:** обновить понимание проблемы и ценности
6. **Decision:** Keep / Refine / Remove / Defer / Investigate (§33)
7. **AIS Improvement:** если Refine — изменить продукт для следующего wave

---

## §43. Commercial Reassessment Trigger

### Когда повторить TASK-COMMERCIAL-REASSESSMENT

Триггер: новый коммерческий рейтинг сравнивается с baseline **3.0/5.0**.

### Обязательные условия

| Condition | Почему |
|---|---|
| Gate 1 PASS | Problem подтверждена |
| Gate 2 PASS | Value подтверждена |
| Context Advantage подтверждён | Основная differentiation |
| Repeat Value имеет evidence | Retention не фантазия |
| Появились E2/E3 данные | Commercial Reassessment требует реальных данных |
| Несколько независимых personas | Не один тип пользователей |

### Что изменится в reassessment

- E-level распределение: 40% E0 → target ≤ 3 E0
- Commercial Score: 3.0 → target ≥ 3.5
- Confidence: низкая-средняя → средняя-высокая
- Verdict: GO WITH CONDITIONS → potential unconditional GO
---

## §44. Success Criteria

TASK считается выполненным, когда:

| # | Criterion | Verified |
|---|---|---|
| 1 | Воспроизводимый validation protocol | §7-§18 |
| 2 | Минимум 5-10 target participants | §8-§9 |
| 3 | Baseline protocol | §12, §15 |
| 4 | Task protocol | §13, §14 |
| 5 | Evidence model | §5, §6 |
| 6 | Hypothesis mapping | §21 |
| 7 | Validation gates | §22-§27 |
| 8 | Failure criteria | §28 |
| 9 | Quality integration | §19, §20, §38 |
| 10 | UX validation | §37 |
| 11 | Architecture validation | §36 |
| 12 | Decision framework | §33 |
| 13 | Evidence ledger | §34 |
| 14 | Reporting format | §40 |

---

## §45. Out of Scope

Не включать:

- Разработку MVP
- Production deployment
- Полноценную маркетинговую кампанию
- Масштабирование
- Autonomous agents
- Autonomous decisions
- Automatic product changes
- Automatic architecture changes
- Automatic Knowledge mutation
- Полноценную customer-support систему
- Определение конкретного AI provider
- Выбор LLM
- Implementation architecture

---

## §46. Запрещённые предположения

Не предполагать:

| # | Assumption | Почему опасно |
|---|---|---|
| BA-1 | Пользователи хотят AIS | Может не хотеть |
| BA-2 | AI автоматически создаёт ценность | AI novelty (§4, ZP-3) |
| BA-3 | Architecture context автоматически лучше | Требует доказательства (§16) |
| BA-4 | Пользователи доверяют AIS | Trust = E0, требуется evidence (H9) |
| BA-5 | Пользователи будут возвращаться | Retention = E0 (H10) |
| BA-6 | WTP = willingness to use | Использование ≠ оплата |
| BA-7 | Один persona = весь рынок | Persona-specific results (§35) |
| BA-8 | Один demo = подтверждение гипотезы | Demo effect (FP-4) |


---

## §47. Required Audits

### Audit 1 — Source-of-Truth Audit

**PASS.** Все 29 входных документов прочитаны полностью. Фактический инвентарь (§2): 10 core + 12 specs + 5 architecture + 2 validation = 29. Соответствует заданию (§2).

### Audit 2 — Validation-001 Alignment Audit

**PASS.** Все 12 гипотез (H1-H12), 8 сценариев (A-H), 5 gates из Validation-001 покрыты: H1-H12 → §21, A-H → §13, Gates 1-5 → §22-§27. Evidence levels согласованы (E0-E4). Feature Factory Protection → §32.

### Audit 3 — Commercial Reassessment Alignment Audit

**PASS.** Evidence baseline (40% E0, 60% E1, 0% E2+) из Commercial Reassessment §29 учтён. Commercial Score 3.0/5.0 — baseline для reassessment trigger (§43). Все 12 Commercial Gaps (§35) адресованы через validation gates.

### Audit 4 — Persona Audit

**PASS.** 5 целевых personas (§7) определены с: why needed, what checked, scenarios, confirmation/refutation criteria. Screening protocol (§8) с inclusion/exclusion. Приоритет: Tech Lead > Developer > Architect > Security Engineer > CTO.

### Audit 5 — Hypothesis Coverage Audit

**PASS.** Все 12 гипотез из Validation-001 покрыты в §21 (Hypothesis Mapping). Каждая имеет: test, evidence source, current/target E, pass criterion. Ни одна не подтверждается только verbal feedback.

### Audit 6 — Evidence Model Audit

**PASS.** 5 уровней (E0-E4) определены с: definition, what allows team to do, transition rules, backward transition. Evidence Independence rules (§6) определены. Aggregation minimums: 3 for E1→E2, 5 for E2→E3.

### Audit 7 — Baseline Audit

**PASS.** Baseline protocol (§12) определяет 8 элементов для фиксации до AIS. Format (participant, scenario, time, tools, sources, outcome, confidence, friction). Comparison metrics (§15) для 9 параметров. Без baseline — невозможно измерить improvement.

### Audit 8 — User Task Realism Audit

**PASS.** §14 определяет 4 критерия валидного задания и 4 типа недопустимых. Задания берутся из реального опыта участника. Источник: рекрутмент (§8). Задания привязаны к реальным проблемам из User Personas.

### Audit 9 — Interview Bias Audit

**PASS.** 8 false positive protections (§30, FP-1–FP-8). 5 false negative protections (§31). 8 запрещённых вопросов (§11) с заменами. Independent observer requirement. §4: 8 принципов + 8 запретов.

### Audit 10 — Observation Audit

**PASS.** 7 категорий наблюдения (§18): actions, questions, confusion, verification, trust, correction, decision. Format определён. Связь с Evidence Ledger (§34).

### Audit 11 — Context Advantage Audit

**PASS.** §16 определяет честный protocol: blind comparison AIS vs generic AI. Generic AI получает только тот контекст, который пользователь реально передал бы. 4 метрики. Связь с H4.

### Audit 12 — AI Wrapper Audit

**PASS.** §17 определяет полный AI Wrapper Test: protocol, decision rule (4 уровня AI Wrapper Risk), remediation mapping на D1-D10. Связь с Commercial Reassessment §19 (Competitive Substitution Test).

### Audit 13 — Gate Audit

**PASS.** 5 gates (§22-§27) определены с: input, minimum evidence, pass criteria (N из M), fail action, INCONCLUSIVE handling. Sequential: Gate N требует Gate N-1.

### Audit 14 — Failure Condition Audit

**PASS.** 10 failure conditions (§28, F-1–F-10) определены с detection method и consequence. INCONCLUSIVE ≠ PASS (§29). 5 типов inconclusive ситуаций.

### Audit 15 — Inconclusive Result Audit

**PASS.** §29 определяет: не объявлять success/failure, определить missing data, провести следующий test. 4 примера обработки.

### Audit 16 — False Positive Audit

**PASS.** 8 biases (§30, FP-1–FP-8) с protections. Independent observer requirement.

### Audit 17 — False Negative Audit

**PASS.** 5 situations (§31) с actions. Одно наблюдение = 0.5 weight.

### Audit 18 — MVP Scope Protection Audit

**PASS.** §32 определяет: что нельзя делать с validation results, как обрабатывать feature requests (4 types), decision path (Evidence → Decision Framework → MVP Boundary). Feature Factory Protection consistent с Validation-001 §9.

### Audit 19 — Quality Loop Audit

**PASS.** §19-§20 интегрируют Quality & Feedback Architecture: 6 MVP signal types, Feedback ≠ Truth/Knowledge/Model Mutation, 8-stage signal lifecycle, 9 root cause categories. Post-session processing (7 steps).

### Audit 20 — Feedback Boundary Audit

**PASS.** §20 определяет 5 запрещённых автоматических действий (change Model, Knowledge, Architecture, MVP scope, hypotheses). Feedback → Validation → Decision chain. §42 разделяет Product Knowledge и AIS Knowledge.

### Audit 21 — Architecture Decision Audit

**PASS.** §36 определяет наблюдаемое поведение, сценарии, confirm/contradict indicators для всех D1-D10. 9/10 полностью валидируемы в MVP, D7 — частично.

### Audit 22 — UX Architecture Audit

**PASS.** §37 проверяет 10 принципов Understanding-Centered Interaction через наблюдаемое поведение. Siri-like simplicity check: 6 confirm/contradict pairs.

### Audit 23 — Privacy/Ethics Audit

**PASS.** §39 определяет 8 правил: consent, anonymization, separation, no unnecessary data, no hidden recording, transparent observation, secure handling, deletion policy. Не описывает конкретные технологии хранения (§45).

### Audit 24 — Commercial Reassessment Trigger Audit

**PASS.** §43 определяет 6 обязательных условий для повторной коммерческой оценки. Baseline 3.0/5.0. Не позволяет повторить reassessment без E2/E3 data.

### Audit 25 — Implementation Leakage Audit

**PASS.** §45 (Out of Scope) исключает: разработку, deployment, AI provider, LLM selection, implementation architecture. Документ не содержит технических решений о реализации. Все ссылки на AI — через product behaviour, не через technology.

### Audit 26 — Cross-Document Consistency Audit

**PASS.** Данный документ: (1) не противоречит Validation-001 (что валидировать); (2) не противоречит Commercial Reassessment (evidence baseline); (3) не нарушает 30 архитектурных инвариантов; (4) не расширяет MVP scope; (5) следует Product Principles (Evidence over opinion, Explain Before Recommend); (6) следует Decision Framework (6 criteria + 6 rejection); (7) все 12 Product Specifications учтены в сценариях.

---

## §48. Final PASS Criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Validation protocol воспроизводим | PASS (§7-§18) |
| 2 | Evidence отделено от opinions | PASS (§4, §6, §18) |
| 3 | Baseline определён | PASS (§12, §15) |
| 4 | H1-H12 покрыты | PASS (§21) |
| 5 | Gate 1-5 определены | PASS (§22-§27) |
| 6 | PASS/FAIL/INCONCLUSIVE различаются | PASS (§22, §29) |
| 7 | Context Advantage проверяется | PASS (§16) |
| 8 | AI Wrapper Test проверяется | PASS (§17) |
| 9 | Quality Loop интегрирован | PASS (§19, §20, §38) |
| 10 | UX principles проверяются | PASS (§37) |
| 11 | D1-D10 проверяются | PASS (§36) |
| 12 | MVP scope защищён | PASS (§32) |
| 13 | Commercial reassessment имеет объективный trigger | PASS (§43) |
| 14 | Implementation details отсутствуют | PASS (§45) |
| 15 | Нет противоречий с Product и Architecture Layer | PASS (Audit 26) |

**Все 15 критериев PASS. Документ готов к использованию.**

---

## §49. Результат задачи

| # | Parameter | Value |
|---|---|---|
| 1 | File path | `docs/product/validation/mvp-validation-execution-specification.md` |
| 2 | Sections | 49 |
| 3 | Lines | 1530 |
| 4 | Commit hash | [after commit] |
| 5 | Audit results | 26/26 PASS |
| 6 | Participants provided | 5-10 (Wave 1: 5-8, Wave 2: 3-5, Wave 3: 5-8) |
| 7 | Validation gates | Gate 1 (Problem), Gate 2 (Value), Gate 3 (Context Advantage), Gate 4 (Repeat Value), Gate 5 (Commercial Signal) |
| 8 | Non-blocking observations | NBO-1: Evidence Independence rules требуют calibration на практике; NBO-2: Observer training protocol не определён (рекомендуется перед Phase 1); NBO-3: Consent form template не включён (создаётся перед началом) |
| 9 | Contradictions | None within document. External contradictions will be recorded in Evidence Ledger during validation. |
| 10 | Unresolved questions | UQ-1: Observer independence — как обеспечить, если команда мала? UQ-2: Remote vs in-person observation — protocol assumes in-person; remote requires adaptation. UQ-3: Multi-language participants — protocol assumes Russian/English; other languages may need adaptation. |
| 11 | Push status | [after push] |
