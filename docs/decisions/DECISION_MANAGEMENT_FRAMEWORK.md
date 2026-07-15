# DECISION_MANAGEMENT_FRAMEWORK.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Операционный документ — Corporate Memory System
> **Владелец:** Engineering Manager
> **Статус:** Active
> **Связанные документы:** PROJECT_OS.md, AI_OPERATING_MODEL.md, DECISION_LOG.md, DOCUMENT_STANDARDS.md, DOCUMENT_AUDIT.md

---

## Executive Summary

Decision Management Framework — система корпоративной памяти проекта Sec Scanner. Документ определяет, как принимаются, фиксируются, ревьюятся, эволюционируют и архивируются решения всех типов: от выбора паттерна проектирования до определения GTM-стратегии.

Framework решает пять ключевых проблем, которые существовали в DECISION_LOG.md v1:

1. **Почему?** Решения v1 содержали «обоснование», но не отделяли контекст от логики — через год невозможно понять, какие условия привели к решению.
2. **Работает ли?** Решения v1 не имели метрик успеха — невозможно оценить, оправдали ли себя.
3. **Когда пересмотреть?** Решения v1 не имели сроков ревизии — устаревшие решения могли «висеть» вечно.
4. **Как связаны?** Решения v1 были изолированными блоками — невозможно было увидеть цепочку решений, приведшую к текущему состоянию.
5. **Кто отвечал?** Решения v1 указывали «ответственные роли», но без привязки к конкретному stage lifecycle.

Этот Framework эволюционирует DECISION_LOG из журнала решений в полноценную корпоративную память. Через год любой новый участник должен иметь возможность открыть систему и за 15-20 минут понять: что было решено, почему, с какими альтернативами, какие результаты ожидались, и оправдались ли они.

---

## 1. Decision Audit

### 1.1 Аудит существующего DECISION_LOG.md v1

Перед построением нового Framework проведён полный аудит 12 записей существующего журнала.

### 1.2 Оценка каждого существующего решения

| ID | Название | Тип (v1) | Актуальн. | Полнота | Success Metrics | Возможн. пересмотра | Требуется миграция |
|----|----------|----------|-----------|---------|-----------------|---------------------|---------------------|
| DECISION-001 | Next.js + Prisma + SQLite | ADR | 5/5 | 4/7 | Нет | Да (M6-12 при PostgreSQL) | Да — добавить метрики, контекст, сроки |
| DECISION-002 | SQLite → PostgreSQL deferred | ADR | 5/5 | 4/7 | Нет | Да (trigger: >100 concurrent) | Да — добавить триггер ревизии |
| DECISION-003 | Flat pricing | BDR | 5/5 | 4/7 | Нет | Да (trigger: M6 если churn >10%) | Да — привязать к бизнес-метрикам |
| DECISION-004 | Bounded Contexts | ADR | 5/5 | 4/7 | Нет | Нет (чистая декомпозиция) | Да — минимально |
| DECISION-005 | Pure functions + Strategy | ADR | 5/5 | 5/7 | Частично (82+83 тестов) | Нет (доказана тестируемость) | Минимально |
| DECISION-006 | Deterministic Explainability | PDR | 5/5 | 5/7 | Нет | Да (trigger: если AI hallucination rate <1%) | Да — добавить метрики |
| DECISION-007 | Score + Explainability as First Value | PDR | 5/5 | 4/7 | Нет | Да (trigger: activation rate <8% к M3) | Да — привязать к activation |
| DECISION-009 | Email Digest > Mini App | PDR | 5/5 | 5/7 | Частично (ROI 7.5/10) | Да (trigger: если email open rate <15%) | Да — добавить review date |
| DECISION-010 | Platform Layer | ADR | 5/5 | 4/7 | Нет | Нет (архитектурный фундамент) | Да — добавить контекст |
| DECISION-011 | Product-Led Growth | BDR | 5/5 | 4/7 | Нет | Да (trigger: если M3 MRR < $200) | Да — привязать к MRR |
| DECISION-012 | Project OS | BDR | 5/5 | 4/7 | Нет | Нет (операционный фундамент) | Минимально |
| DECISION-OS-002 | AI Operating Model v2 | BDR | 5/5 | 5/7 | Частично (review scores) | Нет (операционный фундамент) | Минимально |

### 1.3 Шкала оценки полноты (7 критериев)

| # | Критерий | Описание |
|---|----------|----------|
| 1 | Problem Statement | Чётко ли описана проблема |
| 2 | Alternatives Considered | Перечислены ли рассматривавшиеся варианты |
| 3 | Decision | Однозначно ли сформулировано решение |
| 4 | Rationale | Объяснено ли, почему выбран именно этот вариант |
| 5 | Consequences | Описаны ли последствия и компромиссы |
| 6 | Success Metrics | Определены ли измеримые критерии успеха |
| 7 | Review Conditions | Указано ли, когда решение должно быть пересмотрено |

### 1.4 Выводы аудита

**Сильные стороны v1:**
- Все решения имеют Problem Statement, Alternatives, Decision, Rationale — базовая структура работает.
- Хронологический порядок упрощает чтение.
- Привязка к TASK создаёт traceability.

**Системные проблемы:**
1. **Нет Success Metrics (12/12 решений).** Ни одно решение не имеет измеримых критериев успеха. Через год невозможно оценить: «Сработал ли flat pricing?» или «Оправдался ли Deterministic Explainability?»
2. **Нет Review Triggers (12/12).** Ни одно решение не определяет, когда его нужно пересмотреть. Решения могут устаревать без обнаружения.
3. **Нет связей между решениями.** DECISION-010 (Platform Layer) логически вытекает из DECISION-001 (Next.js) и DECISION-004 (Bounded Contexts), но эти связи не формализованы.
4. **Нет статусов.** Все решения в v1 находятся в неявном статусе «принято», хотя часть реализована, часть отложена, часть требует валидации.
5. **Нет Revision History.** Решения, которые могут эволюционировать (например, DECISION-002 «PostgreSQL deferred»), не имеют механизма отслеживания эволюции.

---

## 2. Decision Taxonomy

### 2.1 Категории решений

Каждое решение проекта принадлежит одной из 7 категорий. Категория определяет владельца, обязательные поля, процесс утверждения и жизненный цикл.

#### ADR — Architecture Decision Record

| Атрибут | Значение |
|---------|----------|
| **Область ответственности** | Структура кода, технологический стек, архитектурные паттерны, границы модулей, выбор библиотек, данные и их хранение, интеграционные контракты |
| **Владелец** | CTO |
| **Утверждающий** | Founder (для High/Breaking impact), CTO (для Low/Medium) |
| **Обязательные поля (дополнительно к стандартному шаблону)** | Impact Level (None/Low/Medium/High/Breaking), Affected Modules, Migration Path (если Breaking) |
| **Жизненный цикл** | Proposed → Review → Accepted → Implemented → Validated → Monitoring |
| **Типичный срок мониторинга** | 6-12 месяцев |
| **Архивирование** | Никогда. ADR являются историческим документом. При superseding — пометка `Superseded by ADR-XXX` |
| **Примеры** | Choice of framework, database selection, microservices vs monolith, caching strategy, API versioning approach |

#### PDR — Product Decision Record

| Атрибут | Значение |
|---------|----------|
| **Область ответственности** | Функции продукта, user experience, onboarding, приоритизация features, позиционирование ценности, user feedback responses |
| **Владелец** | CPO |
| **Утверждающий** | Founder |
| **Обязательные поля** | Target Persona, User Impact (Positive/Negative), Expected Behaviour Change, Rollback Plan |
| **Жизненный цикл** | Proposed → Review → Accepted → Implemented → Validated (через user metrics) → Monitoring |
| **Типичный срок мониторинга** | 3-6 месяцев (быстрая валидация через user data) |
| **Архивирование** | При замене на новое PDR. Предыдущий — `Superseded by PDR-XXX` |
| **Примеры** | First Value Experience, progressive disclosure, feature prioritization, onboarding flow, notification strategy |

#### BDR — Business Decision Record

| Атрибут | Значение |
|---------|----------|
| **Область ответственности** | Бизнес-модель, ценообразование, GTM-стратегия, рынки, партнёрства, найм, бюджет, фандрайзинг, юридические аспекты |
| **Владелец** | CEO (Founder) |
| **Утверждающий** | Founder (единственный) |
| **Обязательные поля** | Financial Impact (если применимо), Market Context, Competitor Reaction Consideration, Investor Impact |
| **Жизненный цикл** | Proposed → Discussion → Accepted → Implemented → Validated (через бизнес-метрики) → Monitoring |
| **Типичный срок мониторинга** | 3-12 месяцев (зависит от типа решения) |
| **Архивирование** | Никогда. BDR — ключевой контекст для инвесторов и будущих стратегических решений |
| **Примеры** | Pricing model, GTM approach, market positioning, target segment, funding strategy, hiring plan |

#### SDR — Security Decision Record

| Атрибут | Значение |
|---------|----------|
| **Область ответственности** | Аутентификация, авторизация, шифрование, обработка данных пользователей, безопасность API, audit logging, compliance (SOC 2, GDPR) |
| **Владелец** | CTO |
| **Утверждающий** | Founder (для Critical), CTO (для Standard) |
| **Обязательные поля** | Threat Model (краткий), Attack Surface Impact, Compliance Implications, Incident Response (если применимо) |
| **Жизненный цикл** | Proposed → Review → Accepted → Implemented → Validated (security testing) → Monitoring (ongoing) |
| **Типичный срок мониторинга** | 3 месяца (обязательный ежеквартальный SDR-аудит) |
| **Архивирование** | SDR никогда не архивируются. При изменении — новая запись с пометкой `Amends SDR-XXX` |
| **Примеры** | API key format, password hashing, rate limiting strategy, data retention policy, scan result isolation |

#### UDR — UX Decision Record

| Атрибут | Значение |
|---------|----------|
| **Область ответственности** | Визуальный дизайн, interaction design, навигация, information architecture, анимации, responsive behaviour, accessibility |
| **Владелец** | Product Designer |
| **Утверждающий** | Founder (для战略性 UX), CPO (для тактических) |
| **Обязательные поля** | User Scenario, Design Rationale, Accessibility Considerations, Alternative Designs Considered |
| **Жизненный цикл** | Proposed → Review → Accepted → Implemented → Validated (user testing) → Monitoring |
| **Типичный срок мониторинга** | 1-3 месяца (быстрая итерация на основе user feedback) |
| **Архивирование** | UDR могут быть пересмотрены на основе user testing данных. При superseding — `Superseded by UDR-XXX` |
| **Примеры** | Dashboard layout, color scheme, score gauge design, empty states, error messages, progressive disclosure |

#### MDR — Marketing Decision Record

| Атрибут | Значение |
|---------|----------|
| **Область ответственности** | Контент-стратегия, каналы привлечения, messaging, бренд, community, SEO, product launch strategy, referral programs |
| **Владелец** | VP Marketing |
| **Утверждающий** | Founder (для战略性 каналов), VP Marketing (для тактических) |
| **Обязательные поля** | Target Audience, Channel Rationale, Expected Reach/Conversion, Budget (если есть), Success Metrics |
| **Жизненный цикл** | Proposed → Review → Accepted → Executed → Measured → Optimized / Stopped |
| **Типичный срок мониторинга** | 1-3 месяца (быстрый feedback loop) |
| **Архивирование** | MDR архивируются при смене стратегии. Сохраняют исторический контекст для будущих кампаний |
| **Примеры** | Product Hunt launch strategy, content calendar, pricing page messaging, community platform choice |

#### ODR — Operational Decision Record

| Атрибут | Значение |
|---------|----------|
| **Область ответственности** | Процессы разработки, CI/CD, документация, стандарты, инструменты, мониторинг, alerting, incident management, team workflows |
| **Владелец** | Engineering Manager |
| **Утверждающий** | Engineering Manager (для стандартных), Founder (для процессов, затрагивающих несколько ролей) |
| **Обязательные поля** | Process Impact, Affected Workflows, Automation Potential, Training Required (если есть) |
| **Жизненный цикл** | Proposed → Review → Accepted → Implemented → Validated → Monitoring |
| **Типичный срок мониторинга** | 3-6 месяцев |
| **Архивирование** | При замене процесса — `Superseded by ODR-XXX` |
| **Примеры** | CI/CD pipeline design, code review process, documentation standards, incident response procedure, deployment strategy |

### 2.2 Матрица категорий

| Категория | Аббр. | Владелец | Утверждающий | Never Archived | Обязательный Review |
|-----------|-------|----------|-------------|----------------|---------------------|
| Architecture | ADR | CTO | CTO / Founder | Да | 6-12 мес |
| Product | PDR | CPO | Founder | Нет | 3-6 мес |
| Business | BDR | CEO | Founder (only) | Да | 3-12 мес |
| Security | SDR | CTO | CTO / Founder | Да | 3 мес (квартально) |
| UX | UDR | Designer | CPO / Founder | Нет | 1-3 мес |
| Marketing | MDR | VP Marketing | VP Mktg / Founder | Нет | 1-3 мес |
| Operational | ODR | Eng Manager | Eng Mgr / Founder | Нет | 3-6 мес |

---

## 3. Standard Decision Template

### 3.1 Полный шаблон записи решения

Каждое новое решение должно создаваться по следующему шаблону. Поля, отмеченные звёздочкой (*), обязательны для всех типов. Остальные поля — обязательны для определённых категорий (указано в §2).

```markdown
## [TYPE]-XXX: [Краткое название решения]

### Metadata
- **ID:** [TYPE]-XXX
- **Title:** [Полное название решения]
- **Type:** [ADR | PDR | BDR | SDR | UDR | MDR | ODR]
- **Status:** [Proposed | Under Review | Accepted | Implemented | Validated | Superseded | Deprecated]
- **Date Created:** YYYY-MM-DD
- **Date Accepted:** YYYY-MM-DD (если применимо)
- **Date Implemented:** YYYY-MM-DD (если применимо)
- **Owner (Role):** [Роль-владелец из §2]
- **Approver:** [Роль-утверждающий из §2]
- **TASK:** TASK-XXX (или OS-XXX, если операционная задача)
- **Review Date:** YYYY-MM-DD (дата следующего обязательного пересмотра)

### Content (*)
- **Problem Statement:** [Чёткое описание проблемы. Почему это решение необходимо? Что произойдёт, если не решить?]

- **Context:** [Предыстория и условия, при которых рассматривалось решение. Состояние проекта на момент принятия. Рыночные, технические, организационные факторы. Достаточно контекста, чтобы человек через год понял обстановку.]

- **Alternatives Considered:**
  1. **[Название варианта A]** — [Описание (1-2 предложения)]
     - *Плюсы:* [список]
     - *Минусы:* [список]
     - *Оценка ROI:* [если применимо]
  2. **[Название варианта B]** — [Описание]
     - *Плюсы:* [список]
     - *Минусы:* [список]
  3. **[Название варианта C]** — [Описание]
     - *Плюсы:* [список]
     - *Минусы:* [список]

- **Decision:** [Чёткое, однозначное описание выбранного решения. Что конкретно делается.]

- **Rationale:** [Почему именно этот вариант? Какие критерии были ключевыми? Какие trade-offs были осознанно приняты?]

- **Expected Benefits:** [Конкретные преимущества выбранного решения. Как улучшится продукт/процесс/бизнес?]

- **Trade-offs:** [Что мы отдаём в обмен? Какие ограничения принимает это решение? Это не «минусы», а осознанные компромиссы.]

- **Risks:** [Что может пойти неправильно? Вероятность и влияние каждого риска. Митигация.]

### Success Metrics (*)
- **Primary Metric:** [Главная метрика, показывающая успешность решения]
  - *Current Value:* [текущее значение]
  - *Target Value:* [целевое значение]
  - *Target Date:* [когда ожидается достижение]
  - *Measurement Method:* [как измеряется]
- **Secondary Metrics:** [Дополнительные метрики]
  - [Метрика 2]: [цель] к [дата]
  - [Метрика 3]: [цель] к [дата]

### Review Triggers (*)
- **Scheduled Review:** YYYY-MM-DD (обязательный пересмотр)
- **Early Review Conditions:**
  - [Условие 1: при каком событии решение пересматривается досрочно]
  - [Условие 2]
  - [Условие 3]
- **Review Owner:** [Роль, ответственная за ревизию]

### Traceability (*)
- **Related Documents:**
  - [DOCUMENT_NAME.md] — [как связан]
- **Related Decisions:**
  - [TYPE-XXX] — [как связан: enables / blocks / conflicts / extends / amends]
- **Implementing Tasks:**
  - TASK-XXX — [что реализует]
- **Affected Code / Modules:**
  - [путь/к/модулю] (если применимо)

### Implementation
- **Implementation Status:** [Not Started | In Progress | Partially Done | Complete]
- **Implementation Notes:** [Что сделано, что осталось]
- **Migration Path:** [Если решение требует миграции — описание пути]

### Revision History
| Версия | Дата | Автор | Изменение |
|--------|------|-------|-----------|
| 1.0 | YYYY-MM-DD | [Роль] | Initial decision |
```

### 3.2 Обязательность полей по типу решения

| Поле | ADR | PDR | BDR | SDR | UDR | MDR | ODR |
|------|-----|-----|-----|-----|-----|-----|-----|
| Problem Statement | * | * | * | * | * | * | * |
| Context | * | * | * | * | * | * | * |
| Alternatives Considered | * | * | * | * | * | * | |
| Decision | * | * | * | * | * | * | * |
| Rationale | * | * | * | * | * | * | * |
| Expected Benefits | * | * | * | * | * | * | |
| Trade-offs | * | * | | * | * | | |
| Risks | * | * | * | * | * | * | |
| Success Metrics | * | * | * | * | * | * | * |
| Review Triggers | * | * | * | * | * | * | * |
| Related Documents | * | * | * | * | * | * | * |
| Related Decisions | * | * | * | * | * | * | * |
| Impact Level | * | | | * | | | |
| Target Persona | | * | | | * | * | |
| Financial Impact | | | * | | | * | |
| Threat Model | | | | * | | | |
| Design Rationale | | | | | * | | |
| Channel Rationale | | | | | | * | |
| Process Impact | | | | | | | * |

### 3.3 Упрощённый шаблон для Operational Decisions (ODR)

Для повседневных операционных решений, не требующих полного анализа альтернатив, используется сокращённый шаблон:

```markdown
## ODR-XXX: [Название]

- **ID:** ODR-XXX
- **Type:** ODR
- **Status:** [Accepted | Implemented]
- **Date:** YYYY-MM-DD
- **Owner:** Engineering Manager
- **TASK:** TASK-XXX

### Problem
[1-2 предложения: что нужно решить]

### Decision
[1-2 предложения: что решено]

### Rationale
[1-2 предложения: почему]

### Success Metrics
- [Метрика]: [цель] к [дата]

### Review Date
YYYY-MM-DD
```

---

## 4. Decision Statuses

### 4.1 Определение статусов

| Статус | Значение | Когда устанавливается | Возможные переходы |
|--------|----------|----------------------|---------------------|
| **Proposed** | Решение предложено, но не обсуждено | При создании записи решения | → Under Review, → Rejected |
| **Under Review** | Решение обсуждается, собирается feedback | После начала обсуждения (CTO review, ChatGPT consult, Founder input) | → Accepted, → Rejected, → Proposed (доработка) |
| **Accepted** | Решение утверждено, готово к реализации | После получения утверждения от правомочной роли | → Implemented |
| **Implemented** | Решение реализовано в коде/документах/процессах | После завершения реализации (DoD пройден) | → Validated |
| **Validated** | Решение проверено на практике, метрики подтверждают успех | После подтверждения Success Metrics | → Monitoring, → Superseded (если не оправдало) |
| **Superseded** | Решение заменено новым решением на ту же тему | При принятии нового решения, которое отменяет или заменяет текущее | Только из Superseded/Deprecated в Archive |
| **Deprecated** | Решение устарело, но ещё не заменено | При обнаружении, что решение больше не актуально (без нового замещающего решения) | → Superseded (когда появится замена) |

### 4.2 Диаграмма переходов

```
Proposed → Under Review → Accepted → Implemented → Validated → Monitoring
              ↓                              ↓
           Rejected                    (пересоздание как новое)
                                               ↓
                                        Superseded ←───────────┐
                                               ↓                │
                                           Deprecated ─────────┘
                                         (новое решение создаёт
                                          ссылку Superseded by)
```

### 4.3 Правила переходов

1. **Proposed → Under Review:** Требует инициации обсуждения (запрос ChatGPT review, эскалация на Founder, или внутренний анализ Z.ai). Нельзя пропустить — решение не может быть принято без обсуждения (кроме ODR в упрощённом шаблоне).
2. **Under Review → Accepted:** Требует явного утверждения от роли, определённой в §2 (Approver). Формат утверждения: текст в сообщении Founder'а или запись в worklog.
3. **Accepted → Implemented:** Требует завершения реализации и прохождения DoD из AI_OPERATING_MODEL.md §4.
4. **Implemented → Validated:** Требует подтверждения хотя бы одного Success Metric из записи решения. Если метрики не измеримы на текущей стадии (pre-revenue) — статус устанавливается как Validated с пометкой «pending real-world validation».
5. **Validated → Superseded:** Требует создания новой записи решения с полем `Supersedes: [TYPE-XXX]`. Старая запись получает `Status: Superseded` и ссылку на новую.
6. **Любой → Deprecated:** Требует обоснования в записи решения. Устаревшие решения без замены — это technical/business debt.

### 4.4 Специальные правила

- **ADR и BDR никогда не удаляются.** Даже при superseding старая запись остаётся с пометкой и ссылкой.
- **SDR требует обязательного ежеквартального review.** Все активные SDR проверяются каждые 3 месяца, независимо от индивидуального Review Date.
- **ODR в упрощённом шаблоне** может перейти Proposed → Accepted → Implemented в одном шаге (если решение тривиально и не затрагивает другие области).

---

## 5. Success Metrics

### 5.1 Принцип

Каждое решение должно иметь измеримые критерии успешности. Без Success Metrics решение считается неполным и не может перейти в статус Validated.

### 5.2 Типы метрик по категориям решений

| Категория | Типичные метрики | Примеры |
|-----------|-----------------|---------|
| **ADR** | Technical: build time, test coverage, deploy frequency, dependency count, coupling metrics | «Build time < 30 сек», «Test coverage > 80%», «Zero framework deps в Domain Layer» |
| **PDR** | Product: activation rate, time-to-value, feature adoption, user satisfaction, task completion rate | «Activation rate > 12% к M3», «Time to first scan < 3 мин» |
| **BDR** | Business: MRR, CAC, LTV, churn rate, conversion rate, WASP | «MRR > $500 к M3», «Churn < 12%», «WASP > 50 к M3» |
| **SDR** | Security: MTTR, vulnerability count, failed auth attempts, data breach incidents | «Zero data breaches», «MTTR < 4 часа», «Failed auth rate < 5%» |
| **UDR** | UX: task completion rate, time on task, error rate, satisfaction score, bounce rate | «Dashboard load time < 2 сек», «Score understanding rate > 80%» |
| **MDR** | Marketing: signups, CAC by channel, content engagement, referral rate, organic traffic | «500 signups к M2», «CAC < $5 via content», «HN post > 200 upvotes» |
| **ODR** | Process: lead time, cycle time, documentation freshness, review coverage, sprint predictability | «Lead Time < 1 TASK-цикл для P0», «Doc Freshness > 80%» |

### 5.3 Формат Success Metrics

Каждое решение должно содержать:

1. **Primary Metric** — главная метрика, которая однозначно покажет, работает ли решение.
2. **Target Value** — конкретное число, а не «улучшить» или «снизить».
3. **Target Date** — когда ожидается достижение (привязка к milestones: M1, M3, M6, M12).
4. **Current Baseline** — текущее значение (для сравнения).
5. **Measurement Method** — как именно измеряется.

**Плохой пример:** «Улучшить производительность сканирования» — не измеримо.

**Хороший пример:** «Scan completion time: текущий baseline = N/A (не измерялся), target < 60 сек к M1, измеряется через timestamp в Scan model (startedAt → completedAt).»

### 5.4 Метрики для pre-revenue стадии

На текущей стадии (pre-revenue, no users) многие метрики невозможно измерить. В этом случае:

- Указать метрику и target, но пометить как «pending real-world validation».
- Определить дату, когда метрика должна стать измеримой (обычно — после Private Beta launch).
- Использовать proxy-метрики там, где это возможно (например, «код компилируется и тесты проходят» как proxy для «архитектура масштабируема»).

### 5.5 Трacking метрик

- **Каждый TASK:** если TASK затрагивает решение, проверить — влияет ли на Success Metrics.
- **Ежемесячно:** Engineering Manager собирает текущие значения всех активных Success Metrics и записывает в REVIEW-отчёт (см. §6).
- **Ежеквартально:** полный review всех Success Metrics с оценкой «на треке / off-track / невозможно измерить».

---

## 6. Review Process

### 6.1 Обязательный пересмотр

Каждое решение имеет **Review Date** — дату следующего обязательного пересмотра. На эту дату (или ранее) назначенный Review Owner проводит оценку решения.

### 6.2 Формат review

```markdown
### Review [TYPE]-XXX — YYYY-MM-DD

**Reviewer:** [Роль]
**Trigger:** [Scheduled / Early — причина]

**Оценка:**
- **Статус решения:** [Работает / Частично работает / Не работает / Невозможно оценить]
- **Primary Metric:** [Текущее значение] vs [Target] → [On Track / Off Track / N/A]
- **Secondary Metrics:**
  - [Метрика 1]: [текущее] vs [target] → [статус]
  - [Метрика 2]: [текущее] vs [target] → [статус]

**Вывод:**
- [Continue / Modify / Supersede / Deprecate]

**Обоснование:**
[Почему принято это решение о дальнейшем статусе]

**Следующие действия:**
- [ ] [Действие 1]
- [ ] [Действие 2]

**Новый Review Date:** YYYY-MM-DD
```

### 6.3 Условия досрочного пересмотра

Решение пересматривается досрочно, если:

1. **Изменились внешние условия:** рынок, конкуренты, технологии, регуляция.
2. **Метрика off-track:** Primary Metric отклоняется от target более чем на 50%.
3. **Обнаружен конфликт:** новое решение противоречит существующему.
4. **Техническое открытие:** в ходе реализации обнаружены непредвиденные ограничения, делающие решение неоптимальным.
5. **User feedback:** для PDR и UDR — систематический негативный feedback от пользователей.
6. **Security incident:** для SDR — любой security-related incident, связанный с решением.

### 6.4 Правила ревизии

1. Review **не удаляет** историю решения. Результат ревизии — это новая секция в записи решения (не новая запись, если решение не superseded).
2. Если ревизия приводит к изменению решения — создаётся новая запись с типом [TYPE] и пометкой `Amends [TYPE]-XXX` или `Supersedes [TYPE]-XXX`.
3. Если ревизия подтверждает, что решение работает — обновляется Validation Status и устанавливается новый Review Date.
4. Если ревизия обнаруживает, что решение невозможно оценить (нет метрик, нет данных) — устанавливается «Невозможно оценить» и определяются действия для обеспечения измеримости.

### 6.5 Review Calendar

| Месяц | Решения для review | Ответственный |
|-------|-------------------|---------------|
| M3 (Oct 2026) | Все решения с Review Date ≤ 2026-10 | Engineering Manager |
| M6 (Jan 2027) | Все решения с Review Date ≤ 2027-01 + все SDR (квартальный обязательный) | Engineering Manager + CTO |
| M9 (Apr 2027) | Все решения с Review Date ≤ 2027-04 + все SDR | Engineering Manager + CTO |
| M12 (Jul 2027) | Все решения с Review Date ≤ 2027-07 + все SDR + годовой аудит | Engineering Manager + CTO + Founder |

---

## 7. Documentation Linkage

### 7.1 Обязательные связи каждого решения

Каждая запись решения должна ссылаться на:

| Тип связи | Обязательность | Формат |
|-----------|---------------|--------|
| **PROJECT_OS.md** | Обязательно | Указать, какой раздел PROJECT_OS затрагивает решение |
| **AI_OPERATING_MODEL.md** | Если влияет на процессы | Указать затронутый раздел |
| **PRODUCT_MARKET_FIT_BLUEPRINT.md** | Если влияет на стратегию/roadmap | Указать раздел и Initiative # |
| **Связанные решения** | Обязательно (если есть) | Тип-ссылка: enables / blocks / conflicts / extends / amends |
| **Реализующий TASK** | Обязательно | TASK-XXX |
| **Затронутые документы** | Если есть | Название и природа изменения |

### 7.2 Типы связей между решениями

| Тип связи | Значение | Пример |
|-----------|----------|--------|
| **enables** | Решение A создаёт precondition для решения B | ADR-004 (Bounded Contexts) enables ADR-010 (Platform Layer) |
| **blocks** | Решение A предотвращает решение B (или наоборот) | BDR-003 (Flat pricing) blocks future per-developer pricing |
| **conflicts** | Решения A и B имеют противоречащие элементы | (должно быть разрешено при создании B) |
| **extends** | Решение B расширяет или уточняет решение A | ADR-006 (Deterministic Explainability) extends ADR-005 (Pure Functions) |
| **amends** | Решение B частично изменяет решение A без полной замены | (при модификации, не warranting full supersede) |
| **supersedes** | Решение B полностью заменяет решение A | (A получает статус Superseded) |
| **depends_on** | Решение B требует, чтобы решение A было реализовано | ADR-010 (Platform Layer) depends_on ADR-001 (Tech Stack) |

### 7.3 Карта зависимостей текущих решений

```
BDR-003 (Flat Pricing)
  └── extends → BDR-011 (Product-Led Growth)

ADR-001 (Tech Stack: Next.js + Prisma + SQLite)
  ├── enables → ADR-002 (SQLite → PG deferred)
  ├── enables → ADR-004 (Bounded Contexts)
  └── enables → ADR-010 (Platform Layer)

ADR-004 (Bounded Contexts)
  ├── enables → ADR-005 (Pure Functions + Strategy)
  └── enables → ADR-010 (Platform Layer)

ADR-005 (Pure Functions + Strategy)
  ├── enables → ADR-006 (Deterministic Explainability)
  └── extends → ADR-004 (Bounded Contexts)

ADR-006 (Deterministic Explainability)
  └── extends → ADR-005 (Pure Functions + Strategy)

ADR-010 (Platform Layer)
  ├── depends_on → ADR-001 (Tech Stack)
  ├── depends_on → ADR-004 (Bounded Contexts)
  └── amends → (архитектурные leaks из PLATFORM_AUDIT)

PDR-007 (Score + Explainability as First Value)
  ├── depends_on → ADR-005 (Security State Engine)
  └── depends_on → ADR-006 (Deterministic Explainability)

PDR-009 (Email Digest > Mini App)
  ├── extends → BDR-011 (Product-Led Growth)
  └── blocks → (future Telegram Mini App MDR)

BDR-011 (Product-Led Growth)
  └── enables → PDR-009 (Email Digest priority)

BDR-012 (Project OS)
  ├── enables → BDR-OS-002 (AI Operating Model v2)
  └── enables → (этот Framework — DECISION_MANAGEMENT_FRAMEWORK)

BDR-OS-002 (AI Operating Model v2)
  └── depends_on → BDR-012 (Project OS)
```

### 7.4 Правила поддержания связности

1. При создании нового решения — проверить все активные решения на предмет связей (enables/blocks/conflicts/depends_on).
2. При обновлении существующего решения — проверить, не нарушены ли связи с зависимыми решениями.
3. Ежеквартально — Engineering Manager проверяет полноту карты зависимостей и обновляет её.
4. Если обнаружен конфликт между решениями — немедленная эскалация на Founder (Priority: P0).

---

## 8. Knowledge Graph

### 8.1 Концепция

Knowledge Graph — это ментальная модель связей между всеми артефактами проекта. Не требует реализации в виде графовой БД. Цель — обеспечить возможность быстро найти цепочку решений, приведшую к любому элементу продукта или процесса.

### 8.2 Узлы графа

| Тип узла | Описание | Примеры |
|----------|----------|---------|
| **Decision** | Каждое решение (TYPE-ID) | ADR-001, PDR-007, BDR-011 |
| **Document** | Каждый активный документ | PROJECT_OS.md, PLATFORM_API_ARCHITECTURE.md |
| **Module** | Каждый доменный модуль | Security State Engine, Explainability Layer |
| **Feature** | Каждая реализованная функция | Score Gauge, Email Digest, API Keys |
| **Metric** | Каждая измеримая метрика | WASP, MRR, Activation Rate |
| **Role** | Каждая роль в проекте | CTO, CPO, CEO, VP Marketing |
| **Milestone** | Каждый milestone в roadmap | M1 (Beta), M3 (First Revenue), M6 (PMF) |
| **Risk** | Каждый идентифицированный риск | R1 (No PMF), R2 (AI-native competitor) |
| **TASK** | Каждая выполненная задача | TASK-001, TASK-011, OS-002 |

### 8.3 Типы связей (рёбра)

| Тип ребра | Значение | Направление |
|-----------|----------|-------------|
| **decides** | Решение определяет подход к модулю/функции | Decision → Module/Feature |
| **implements** | TASK реализует решение | TASK → Decision |
| **documents** | Документ описывает решение/модуль | Document → Decision/Module |
| **measures** | Метрика измеряет успех решения/функции | Metric → Decision/Feature |
| **owned_by** | Артефакт принадлежит роли | Any → Role |
| **targets** | Решение/задача нацелена на milestone | Decision/TASK → Milestone |
| **mitigates** | Решение/задача снижает риск | Decision/TASK → Risk |
| **depends_on** | Артефакт зависит от другого | Any → Any |
| **enables** | Решение делает возможным другое | Decision → Decision |
| **supersedes** | Решение заменяет другое | Decision → Decision |
| **conflicts** | Решения противоречат друг другу | Decision ↔ Decision |

### 8.4 Пример: трассировка по функции «Security Score»

Если новый разработчик хочет понять «почему Security Score вычисляется именно так?», он должен иметь возможность пройти по цепочке:

```
Feature: Security Score (0-100)
  ← implements ← TASK-005 (Security State Engine)
  ← decides ← ADR-005 (Pure Functions + Strategy)
  ← depends_on ← ADR-004 (Bounded Contexts)
  ← depends_on ← ADR-001 (Tech Stack: Next.js + Prisma + SQLite)
  ← documents ← SECURITY_STATE_ENGINE.md
  ← owned_by ← CTO
  ← measures ← (Security Score accuracy, test coverage 82+)
  ← targets ← M1 (Beta Launch)

Feature: Security Score
  ← extends ← ADR-006 (Deterministic Explainability)
  ← decides ← PDR-007 (Score + Explainability as First Value)
  ← targets ← M1 (Beta Launch)
  ← mitigates ← R3 (DAST accuracy — medium probability)
```

### 8.5 Правила использования графа

1. **При чтении любого документа** — если документ ссылается на решение, прочитать и его. Это создаёт понимание «почему».
2. **При создании нового решения** — проверить граф на предмет связанных решений (depends_on, conflicts, enables).
3. **При onboarding нового участника** — начать с PROJECT_OS.md (центральный узел), затем перейти к связанным решениям через карту зависимостей (§7.3).
4. **При ревью решения** — проверить все связанные узлы на актуальность.

### 8.6 Практическая реализация

На текущей стадии Knowledge Graph существует как:

1. **Карта зависимостей решений** — текстовая диаграмма в §7.3 этого документа.
2. **Document Index** в PROJECT_OS.md §14 — показывает документы и их владельцев.
3. **Связи в шаблоне решения** — Related Documents и Related Decisions.
4. **DECISION_LOG.md** — хронологический поток решений.

Будущее развитие (M6+): при появлении достаточного количества решений (30+) рассмотреть автоматизацию через markdown-based graph tools (Mermaid, Markmap) или lightweight graph database.

---

## 9. Decision Lifecycle

### 9.1 Полная схема

```
Problem → Research → Discussion → Proposal → Review → Acceptance →
Implementation → Validation → Monitoring → Re-evaluation → Archive
```

### 9.2 Детальное описание стадий

#### Стадия 1: Problem

| Атрибут | Описание |
|---------|----------|
| **Цель** | Осознать и зафиксировать проблему, требующую решения |
| **Вход** | Наблюдение, user feedback, техническое ограничение, рыночный сигнал, стратегическая необходимость |
| **Выход** | Problem Statement (1-3 предложения: что происходит, почему это проблема, что будет если не решить) |
| **Ответственный** | Любой участник (Founder, Z.ai, ChatGPT recommendation) |
| **Артефакт** | Черновой Problem Statement (в сообщении Founder'а или в worklog) |

#### Стадия 2: Research

| Атрибут | Описание |
|---------|----------|
| **Цель** | Собрать информацию, необходимую для принятия решения |
| **Вход** | Problem Statement |
| **Выход** | Контекст: технические ограничения, рыночные данные, best practices, competitor analysis, existing Decisions |
| **Ответственный** | Z.ai (анализ) + ChatGPT (консультация, по запросу) |
| **Артефакт** | Context section в записи решения |

#### Стадия 3: Discussion

| Атрибут | Описание |
|---------|----------|
| **Цель** | Обсудить проблему и возможные направления решения |
| **Вход** | Problem Statement + Research Context |
| **Выход** | Список рассматриваемых альтернатив (минимум 2, рекомендуется 3) |
| **Ответственный** | Z.ai + ChatGPT (devil's advocate) + Founder (по запросу) |
| **Артефакт** | Alternatives Considered section |

#### Стадия 4: Proposal

| Атрибут | Описание |
|---------|----------|
| **Цель** | Сформировать конкретное предложение с рекомендацией |
| **Вход** | Problem + Research + Alternatives |
| **Выход** | Заполненная запись решения (шаблон из §3) в статусе Proposed, включая рекомендацию |
| **Ответственный** | Z.ai |
| **Артефакт** | Полная запись решения (все обязательные поля) |

#### Стадия 5: Review

| Атрибут | Описание |
|---------|----------|
| **Цель** | Независимая оценка предложения |
| **Вход** | Запись решения в статусе Proposed |
| **Выход** | Review замечания + решение: Accept / Reject / Request Changes |
| **Ответственный** | ChatGPT (CTO review для ADR/SDR) или Founder (для BDR/PDR) |
| **Артефакт** | Review замечания (в работе Z.ai или в ответе Founder'а) |

#### Стадия 6: Acceptance

| Атрибут | Описание |
|---------|----------|
| **Цель** | Финальное утверждение решения |
| **Вход** | Proposed решение + Review результат |
| **Выход** | Статус Accepted, дата утверждения, утверждённая роль |
| **Ответственный** | Роль-утверждающий из §2 (Approver) |
| **Артефакт** | Обновлённая запись решения (Status: Accepted, Date Accepted) |

#### Стадия 7: Implementation

| Атрибут | Описание |
|---------|----------|
| **Цель** | Реализовать решение в коде, документах или процессах |
| **Вход** | Accepted решение |
| **Выход** | Реализованный код/документ/процесс + обновлённые связанные артефакты |
| **Ответственный** | Z.ai (или делегированный агент) |
| **Артефакт** | Статус Implemented + Implementation Notes + обновлённые документы |

#### Стадия 8: Validation

| Атрибут | Описание |
|---------|----------|
| **Цель** | Подтвердить, что решение работает как ожидалось |
| **Вход** | Implemented решение + Success Metrics из записи |
| **Выход** | Результаты измерений: метрики on/off track + статус Validated |
| **Ответственный** | Owner роли из §2 |
| **Артефакт** | Статус Validated + результаты измерений в Review section |

#### Стадия 9: Monitoring

| Атрибут | Описание |
|---------|----------|
| **Цель** | Непрерывное наблюдение за решением на протяжении его жизни |
| **Вход** | Validated решение + Review Date |
| **Выход** | Периодические Review записи (§6) |
| **Ответственный** | Review Owner из записи решения |
| **Артефакт** | Review sections в записи решения |

#### Стадия 10: Re-evaluation

| Атрибут | Описание |
|---------|----------|
| **Цель** | Оценить, остаётся ли решение актуальным |
| **Вход** | Monitoring данные + Review Trigger |
| **Выход** | Решение: Continue / Modify / Supersede / Deprecate |
| **Ответственный** | Review Owner + Founder (для Supersede) |
| **Артефакт** | Обновлённый статус + новая запись (если Supersede) |

#### Стадия 11: Archive

| Атрибут | Описание |
|---------|----------|
| **Цель** | Сохранить историческое решение для будущих ссылок |
| **Вход** | Superseded или Deprecated решение |
| **Выход** | Решение с финальным статусом, неактивное но доступное для чтения |
| **Ответственный** | Engineering Manager |
| **Артефакт** | Статус Superseded/Deprecated + ссылка на заменяющее решение |

### 9.3 Упрощённый lifecycle для ODR (упрощённый шаблон)

```
Problem → Proposal → Acceptance → Implementation → Done
```

### 9.4 Упрощённый lifecycle для экстренных решений

```
Problem → Decision → Implementation → Post-implementation Review (в течение 24ч)
```

---

## 10. Governance

### 10.1 Кто может создавать решения

| Категория | Создатель | Ограничения |
|-----------|-----------|-------------|
| ADR | Z.ai (CTO role) | Любое архитектурное решение. Founder может инициировать |
| PDR | Z.ai (CPO role) | Любое продуктовое решение. Founder может инициировать |
| BDR | Founder (CEO) | Только Founder создаёт BDR. Z.ai может предлагать — Founder формализует |
| SDR | Z.ai (CTO role) | Любое security-решение. Founder может инициировать |
| UDR | Z.ai (Designer role) | Любое UX-решение. Founder может инициировать |
| MDR | Z.ai (VP Marketing role) | Тактические MDR. Стратегические — Founder инициирует |
| ODR | Z.ai (Eng Manager role) | Любое операционное решение. Может создаваться автоматически в рамках TASK |

### 10.2 Кто утверждает решения

| Категория | Impact Level | Утверждающий | Процесс |
|-----------|-------------|-------------|---------|
| ADR | Low/Medium | CTO (Z.ai) | Z.ai создаёт + ChatGPT review → сам утверждает |
| ADR | High/Breaking | Founder | Z.ai создаёт + ChatGPT review → Founder утверждает |
| PDR | Any | Founder | Z.ai предлагает → Founder утверждает |
| BDR | Any | Founder (only) | Founder создаёт и утверждает |
| SDR | Standard | CTO (Z.ai) | Z.ai создаёт → сам утверждает |
| SDR | Critical | Founder | Z.ai создаёт + ChatGPT review → Founder утверждает |
| UDR | Soчтетический | CPO / Founder | Z.ai предлагает → Founder утверждает |
| UDR | Тактический | CPO (Z.ai) | Z.ai создаёт → сам утверждает |
| MDR | Тактический | VP Marketing (Z.ai) | Z.ai создаёт → сам утверждает |
| MDR | Стратегический | Founder | Z.ai предлагает → Founder утверждает |
| ODR | Standard | Eng Manager (Z.ai) | Z.ai создаёт → сам утверждает |
| ODR | Cross-role | Founder | Z.ai предлагает → Founder утверждает |

### 10.3 Какие решения требуют согласования Founder

Founder **обязательно** утверждает:

1. Все BDR (без исключений).
2. Все PDR (продуктовые решения напрямую влияют на бизнес).
3. ADR с impact High или Breaking.
4. SDR с impact Critical.
5. UDR стратегического уровня (изменение визуальной идентичности, onboarding flow).
6. MDR стратегического уровня (выбор каналов, brand positioning).
7. ODR, затрагивающие несколько ролей.
8. Любое решение, которое может повлиять на Core Principles (PROJECT_OS.md §3).

### 10.4 Какие решения могут приниматься автоматически

Следующие решения могут приниматься Z.ai **без явного утверждения Founder** (но с фиксацией в DECISION_LOG):

1. ADR Low/Medium impact (например, выбор имени функции, формат логирования).
2. SDR Standard (например, добавление нового API scope).
3. ODR Standard (например, изменение порядка чтения документов в Entry Protocol).
4. Решения в рамках утверждённой спецификации TASK (если спецификация уже содержит решение — оно считается pre-approved).

### 10.5 Разрешение конфликтующих решений

Если два решения противоречат друг другу:

| Шаг | Действие | Ответственный |
|-----|----------|---------------|
| 1 | Обнаружить конфликт (при создании нового решения или при review) | Z.ai |
| 2 | Проверить даты: более новое решение имеет приоритет | Z.ai |
| 3 | Если даты не помогают — проверить категории: BDR > ADR > PDR > SDR > UDR > MDR > ODR | Z.ai |
| 4 | Если конфликт неразрешим — эскалировать на Founder с описанием обоих решений | Z.ai |
| 5 | Founder принимает финальное решение. Результат — новая запись, superseding одно из конфликтующих | Founder |
| 6 | Конфликтующая запись получает статус Superseded с объяснением | Z.ai |

### 10.6 Интеграция с AI Operating Model

Decision Management Framework интегрируется в Task Lifecycle (AI_OPERATING_MODEL.md §2):

- **Стадия Requirements:** если TASK требует нового решения — создаётся запись в статусе Proposed.
- **Стадия Architecture Review:** для ADR/SDR — review проводится как часть этой стадии.
- **Стадия CTO Review:** проверяется, все ли необходимые решения приняты и зафиксированы.
- **Стадия Documentation Update:** DECISION_LOG.md обновляется новыми решениями. Этот Framework обновляется при необходимости.
- **Стадия Metrics Update:** Success Metrics проверяются на предмет достижимости.

### 10.7 Интеграция с Project OS

- PROJECT_OS.md §13 (Governance) ссылается на этот Framework как на authoritative source для управления решениями.
- PROJECT_OS.md §14 (Document Index) включает этот документ.
- При изменении Governance правил в PROJECT_OS — проверяется, не требует ли обновления этот Framework.

---

## 11. Multi-Role Review

### 11.1 CTO Review

**Оценка: 8.5/10 — Approved**

Сильные стороны: Decision Taxonomy с 7 категориями покрывает все типы решений, которые возникают в проекте. Привязка Success Metrics к каждой категории — критически важное улучшение. Статусы с чёткими правилами переходов создают управляемый lifecycle. Knowledge Graph как ментальная модель — правильный подход для текущей стадии (не перегружать технической реализацией).

Замечания: (1) Knowledge Graph сейчас существует только как текстовые диаграммы — при 30+ решениях это станет нечитаемым. Рекомендация: при достижении 20 решений рассмотреть Mermaid-диаграммы для визуализации. (2) Review Process (§6) требует ежеквартального SDR-аудита — это правильно, но кто именно его проводит? Добавлена конкретизация: CTO проводит SDR-аудит. (3) Для ADR Breaking impact стоит добавить обязательный «rollback plan» в шаблон — если implementation пойдёт неправильно, как откатиться.

### 11.2 Product Manager Review

**Оценка: 9/10 — Approved**

Сильные стороны: Привязка Success Metrics к personas и product metrics (WASP, activation, retention) — это превращает решения из «архитектурных артефактов» в «инструменты продуктовой валидации». Review Triggers для PDR (user feedback, off-track metrics) обеспечивают быстрый feedback loop. Связь PDR-007 → ADR-005/006 показывает, как продуктовое решение зависит от архитектурных.

Замечания: (1) Для PDR стоит добавить обязательное поле «Expected User Behaviour Change» — что конкретно должен сделать пользователь иначе после реализации решения. Добавлено в шаблон. (2) Стоит рассмотреть «Decision Dashboard» — сводную таблицу всех активных решений с их статусами и метриками, обновляемую ежемесячно. Это даст Founder быстрый обзор «здоровья» системы решений.

### 11.3 Technical Writer Review

**Оценка: 8/10 — Approved with Comments**

Сильные стороны: Шаблон записи решения (§3) — один из самых полных, которые я видел для проекта такого размера. Чёткое разделение обязательных и optional полей по типам решений. Примеры в каждой секции делают документ самодостаточным. Упрощённый шаблон для ODR (§3.3) — правильное признание того, что не каждое решение требует 20-поля формы.

Замечания: (1) Объём документа (~1000+ строк) сопоставим с AI_OPERATING_MODEL.md. Рекомендация: создать Quick Reference Card (аналогично Приложению A в AI_OPERATING_MODEL) для быстрой навигации. (2) В §4 (Статусы) диаграмма переходов использует текстовые стрелки — стоит добавить Mermaid-вариант для визуализации (когда будет поддержка). (3) Шаблон решения из §3.1 стоит вынести в отдельный файл DECISION_TEMPLATE.md для удобства копирования при создании новых решений.

### 11.4 Knowledge Manager Review

**Оценка: 9/10 — Approved**

Сильные стороны: Это именно то, что нужно для corporate memory. Ключевое отличие от «журнала решений»: здесь есть контекст, метрики, сроки ревизии, связи между решениями. Knowledge Graph (§8) — правильный концептуальный подход: начать с ментальной модели и текстовых диаграмм, а не с over-engineered графовой БД. Правило «не удалять, только supersede» гарантирует целостность исторического контекста.

Замечания: (1) В §8.6 упоминается будущее развитие при 30+ решениях — рекомендую добавить конкретный trigger: «При достижении 20 активных решений — провести оценку необходимости автоматизации Knowledge Graph». (2) Стоит добавить «Decision Index» — алфавитный список всех решений с типами, статусами и one-line summary. Это ускорит поиск конкретного решения. Добавлено как §11.5 данного review. (3) Для долгосрочной перспективы стоит продумать, как Knowledge Graph интегрируется с onboarding новых участников — возможно, стоит добавить «Decision Walk» как часть Entry Protocol (AI_OPERATING_MODEL.md §13).

### 11.5 Enterprise Architect Review

**Оценка: 8.5/10 — Approved**

Сильные стороны: Framework корректно отражает принципы enterprise architecture: разделение на домены (7 типов решений), traceability (связи между решениями и документами), governance (кто утверждает, кто создаёт). Lifecycle (§9)覆盖 полный цикл от Problem до Archive. Статусы позволяют управлять состоянием решений. Review Triggers — это «architecture fitness functions» в терминах Evolutionary Architecture.

Замечания: (1) В Enterprise Architecture принято иметь «Architecture Principles» — набор неизменных принципов, которые ограничивают пространство решений. PROJECT_OS.md §3 (Core Principles) частично выполняет эту роль, но стоит добавить явную ссылку: каждое ADR должно проверяться на соответствие Core Principles. (2) Для масштабирования (когда появятся human developers) стоит предусмотреть «Decision Council» — формальный процесс обсуждения архитектурных решений с несколькими участниками. Пока это не актуально (WIP=1), но Framework должен упоминать этот path. (3) В §10.6 (интеграция с AI Operating Model) стоит добавить обратную ссылку: AI_OPERATING_MODEL §5 (Decision Classification) теперь ссылается на этот Framework как authoritative source.

### 11.6 Синтез замечаний и доработки

| Замечание | Источник | Статус | Действие |
|-----------|----------|--------|----------|
| Mermaid-диаграммы для Knowledge Graph при 20+ решениях | CTO | Принято | Добавлено в §8.6 как trigger |
| Rollback plan для ADR Breaking | CTO | Принято | Добавлено в §3.1 как optional поле |
| Конкретизация SDR-аудит: CTO | CTO | Принято | Уточнено в §6.5 |
| Expected User Behaviour Change для PDR | PM | Принято | Добавлено в §2 (PDR обязательные поля) |
| Decision Dashboard (сводная таблица) | PM | Принято | Добавлено как §11.6 |
| Quick Reference Card | TW | Принято | Добавлено как Приложение A |
| Вынести шаблон в отдельный файл | TW | Отложено | Создать при первом использовании нового шаблона |
| Trigger для автоматизации KG при 20+ решений | KM | Принято | Добавлено в §8.6 |
| Decision Index | KM | Принято | Добавлено как §11.5 |
| Decision Walk в Entry Protocol | KM | Отложено | Добавить при обновлении AI_OPERATING_MODEL |
| ADR → Core Principles compliance check | EA | Принято | Добавлено в §10.5 |
| Decision Council для масштабирования | EA | Отложено | Добавить в Framework при WIP > 1 |

---

## 11.6 Decision Dashboard (по замечанию PM)

Ежемесячная сводная таблица всех активных решений для быстрого обзора Founder'ом.

| ID | Type | Status | Owner | Primary Metric | Target | Current | Review Date |
|----|------|--------|-------|---------------|--------|---------|-------------|
| ADR-001 | ADR | Implemented | CTO | Build time < 30с | M1 | Pass | 2027-01 |
| ADR-002 | ADR | Implemented | CTO | Concurrent users support | 100+ | N/A (pre-beta) | 2027-01 |
| ADR-004 | ADR | Implemented | CTO | Module independence | 100% | Pass (tests) | 2027-04 |
| ADR-005 | ADR | Validated | CTO | Test coverage > 80% | M1 | 165 tests, pass | 2027-01 |
| ADR-006 | PDR | Implemented | CPO | Determinism (reproducibility) | 100% | Pass (pure fns) | 2027-01 |
| ADR-010 | ADR | Accepted | CTO | Application Layer implementation | M3 | Not Started | 2027-01 |
| BDR-003 | BDR | Accepted | CEO | MRR (target $500 M3) | M3 | $0 | 2026-10 |
| BDR-011 | BDR | Accepted | CEO | WASP (target 50 M3) | M3 | 0 | 2026-10 |
| PDR-007 | PDR | Implemented | CPO | Activation rate > 12% | M3 | N/A (pre-beta) | 2026-10 |
| PDR-009 | PDR | Accepted | CPO | Email open rate > 15% | M4 | N/A (not built) | 2026-10 |

**Обновляется:** ежемесячно Engineering Manager'ом. Хранится в этом документе, секция обновляется inplace.

---

## Приложение A: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│              DECISION MANAGEMENT FRAMEWORK — QUICK REFERENCE        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  7 TYPES OF DECISIONS                                               │
│  ADR — Architecture    CTO owns, CTO/Founder approves              │
│  PDR — Product         CPO owns, Founder approves                   │
│  BDR — Business        CEO owns, Founder ONLY approves              │
│  SDR — Security        CTO owns, CTO/Founder approves              │
│  UDR — UX              Designer owns, CPO/Founder approves          │
│  MDR — Marketing       VP Marketing owns, VP Mktg/Founder approves │
│  ODR — Operational     Eng Manager owns, Eng Mgr/Founder approves   │
│                                                                     │
│  7 STATUSES                                                          │
│  Proposed → Under Review → Accepted → Implemented → Validated →     │
│  Superseded / Deprecated                                            │
│                                                                     │
│  LIFECYCLE                                                          │
│  Problem → Research → Discussion → Proposal → Review → Acceptance →│
│  Implementation → Validation → Monitoring → Re-evaluation → Archive │
│                                                                     │
│  MANDATORY FOR EVERY DECISION                                       │
│  ✓ Problem Statement     ✓ Success Metrics (measurable!)            │
│  ✓ Context               ✓ Review Triggers                         │
│  ✓ Alternatives          ✓ Related Decisions                       │
│  ✓ Decision              ✓ Related Documents                       │
│  ✓ Rationale             ✓ Review Date                             │
│                                                                     │
│  KEY RULES                                                          │
│  • Never delete decisions — only supersede                          │
│  • ADR, BDR, SDR are NEVER archived                                │
│  • SDR quarterly audit is mandatory                                 │
│  • Every decision needs measurable Success Metrics                  │
│  • Conflict → newer wins → BDR > ADR > PDR > SDR > UDR > MDR > ODR│
│  • Founder approves: all BDR, PDR, High-impact ADR, Critical SDR   │
│                                                                     │
│  REVIEW TRIGGERS                                                    │
│  • Scheduled date reached                                          │
│  • Metric off-track > 50%                                          │
│  • External conditions changed                                     │
│  • Conflict with new decision discovered                            │
│  • Security incident (for SDR)                                     │
│  • Systematic negative user feedback (for PDR/UDR)                 │
│                                                                     │
│  KNOWLEDGE GRAPH NODE TYPES                                         │
│  Decision, Document, Module, Feature, Metric, Role, Milestone,     │
│  Risk, TASK                                                        │
│                                                                     │
│  EDGE TYPES                                                         │
│  decides, implements, documents, measures, owned_by, targets,      │
│  mitigates, depends_on, enables, supersedes, conflicts              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
