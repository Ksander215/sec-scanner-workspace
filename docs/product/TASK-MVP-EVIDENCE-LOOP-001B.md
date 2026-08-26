# ТЗ: TASK-MVP-EVIDENCE-LOOP-001B — Minimal User Interaction

## 1. Назначение

Создать **минимальный пользовательский контур AIS**, соединяющий уже реализованный `Evidence Loop Core` из `TASK-MVP-EVIDENCE-LOOP-001A` с реальным взаимодействием пользователя.

Задача **не является разработкой полноценного продукта**.

Цель — получить минимальный end-to-end путь:

```text
User
  ↓
Intent / Question
  ↓
AIS Session
  ↓
AIS Execution
  ↓
Response
  ↓
Claims
  ↓
Evidence
  ↓
User Feedback
  ↓
Quality Finding
  ↓
Session Trace
```

---

# 2. Главный принцип

> **Сейчас мы строим не интерфейс ради интерфейса, а измерительный контур для получения реального пользовательского evidence.**

Каждое пользовательское взаимодействие должно оставлять структурированный след, который впоследствии можно анализировать.

Нельзя превращать задачу в:

* dashboard;
* SaaS-платформу;
* систему аккаунтов;
* billing;
* CRM;
* полноценный чат;
* marketplace;
* analytics platform;
* новый набор AI capabilities.

---

# 3. Предпосылки

`TASK-MVP-EVIDENCE-LOOP-001A` считается завершённой.

Уже существуют:

* Session;
* Evidence;
* Feedback;
* Quality Finding;
* Claims;
* linkage chain;
* provenance;
* immutable entities;
* secret sanitization;
* `getSessionTrace()`;
* 41 новых тест;
* 43 regression tests.

001B должна **использовать существующий Evidence Loop**, а не создавать параллельную реализацию.

---

# 4. Scope

В рамках задачи разрешается создать только минимальные компоненты, необходимые для пользовательского взаимодействия.

### Must Have

1. Session creation.
2. User question / intent submission.
3. AIS execution.
4. Response retrieval.
5. Claims presentation.
6. Evidence presentation.
7. Feedback submission.
8. Quality Finding creation.
9. Session Trace retrieval.
10. Provenance: `human` / `synthetic`.
11. End-to-end integration test.

### Explicitly Out of Scope

* authentication;
* user accounts;
* payments;
* billing;
* subscriptions;
* teams;
* roles;
* permissions beyond минимальной технической защиты;
* dashboards;
* analytics UI;
* notifications;
* chat history;
* conversation search;
* autonomous agents;
* autonomous architecture evolution;
* model training;
* automatic architecture mutation;
* commercial features.

---

# 5. UX Principle

Интерфейс должен следовать принятому ранее принципу **Understanding-Centered Interaction**.

Пользователь не должен видеть внутреннюю архитектуру AIS.

Не:

```text
Session ID
Intent Runtime
Cognitive Runtime
Evidence Store
Quality Finding
Architecture Graph
Provider Runtime
```

А:

```text
Что вы хотите понять?

[ Ваш вопрос........................ ]

              [ Исследовать ]
```

После ответа:

```text
Ответ AIS

...

Почему AIS так считает

• источник 1
• источник 2
• источник 3

Насколько ответ полезен?

[ ✓ Верно ] [ ~ Частично ] [ ✕ Неверно ]
```

И только при необходимости:

```text
Подробнее
```

открывает Evidence / Claims / Trace.

---

# 6. Interaction Contract

Минимальная сессия должна иметь следующие состояния:

```text
CREATED
   ↓
QUESTION_SUBMITTED
   ↓
PROCESSING
   ↓
ANSWER_AVAILABLE
   ↓
EVIDENCE_AVAILABLE
   ↓
FEEDBACK_PENDING
   ↓
FEEDBACK_RECORDED
   ↓
TRACE_AVAILABLE
```

При ошибке:

```text
PROCESSING
   ↓
FAILED
```

Ошибка не должна создавать ложное Evidence.

---

# 7. Session Creation

При начале взаимодействия создаётся уникальный `SessionId`.

Session должна содержать минимум:

```text
sessionId
provenance
createdAt
status
```

### Provenance

Обязательно поддержать:

```text
human
synthetic
```

По умолчанию для пользовательского MVP:

```text
human
```

Synthetic режим должен использоваться только для тестирования.

---

# 8. Question / Intent

Пользователь вводит **один архитектурный вопрос**.

Пример:

> Какие основные границы между cognitive, discovery и engine подсистемами и как они взаимодействуют?

Система должна сохранить:

```text
Intent
  ├── sessionId
  ├── raw question
  ├── classified intent
  └── timestamp
```

Необходимо обеспечить linkage:

```text
Session → Intent
```

---

# 9. AIS Execution

После отправки вопроса система должна вызвать существующий execution pipeline.

Запрещено создавать второй AIS runtime.

Используется существующий путь:

```text
Intent
 → Discovery / Context
 → Cognitive Runtime
 → Provider
 → Response
 → Evidence Loop
```

---

# 10. Response

Response должен быть связан с конкретной Session.

Минимальный контракт:

```text
Response
├── responseId
├── sessionId
├── content
├── createdAt
└── provenance
```

Response не может существовать как orphan entity.

---

# 11. Claims

Каждый существенный тезис ответа должен по возможности быть представлен как Claim.

Например:

```text
Claim:
"Cognitive Runtime взаимодействует с Provider Runtime."

Evidence:
src/core/cognitive/cognitive-runtime.ts
src/core/cognitive/provider-runtime.ts
```

Минимальный контракт:

```text
Claim
├── claimId
├── sessionId
├── responseId
├── statement
└── evidenceIds[]
```

### Инвариант

Claim без Evidence допускается только если система явно маркирует его как неподтверждённый.

Запрещено создавать видимость подтверждения.

---

# 12. Evidence

Используется Evidence Loop из `001A`.

Evidence должно быть связано:

```text
Session
   ↓
Response
   ↓
Claim
   ↓
Evidence
```

Пользователь должен иметь возможность понять:

> **На основании чего AIS сделал этот вывод?**

Минимально показывается:

* имя файла;
* тип источника;
* краткий фрагмент / ссылка на источник;
* relevance / confidence, если уже поддерживается существующей моделью.

Необходимо избегать раскрытия:

* API keys;
* tokens;
* credentials;
* secrets;
* environment secrets.

Используется существующий sanitizer из 001A.

---

# 13. Feedback

После ответа пользователь получает минимальный выбор:

```text
Насколько ответ полезен?

[ Верно ]
[ Частично ]
[ Неверно ]
```

Опционально:

```text
Что именно было неправильно?

[________________________]
```

Feedback должен быть связан:

```text
Feedback
   ↓
Response
   ↓
Session
```

---

# 14. Feedback ≠ Truth

Критически важно:

> Пользовательский feedback **не должен автоматически становиться архитектурной истиной**.

Feedback означает:

```text
Human signal about quality
```

а не:

```text
Architecture Model mutation
```

001B не должна изменять Architecture Model на основании feedback.

---

# 15. Quality Finding

Если пользователь сообщает:

```text
Неверно
```

или:

```text
Частично
```

создаётся Quality Finding.

Минимально:

```text
QualityFinding
├── findingId
├── sessionId
├── responseId
├── feedbackId
├── category
├── description
└── status
```

Finding должен позволять впоследствии установить:

> какой ответ → какой feedback → какая проблема.

---

# 16. Session Trace

После завершения сессии должен быть доступен:

```text
getSessionTrace(sessionId)
```

Trace должен восстанавливать минимум:

```text
Session
 ├── Intent
 ├── Response
 │    ├── Claims
 │    │    └── Evidence
 │    └── Feedback
 │          └── Quality Finding
 └── Provenance
```

Это является **главным техническим результатом 001B**.

---

# 17. Minimal UI

Если создаётся UI, он должен содержать максимум четыре основных состояния.

### State 1 — Question

```text
Что вы хотите понять?

[____________________________]

[ Исследовать ]
```

### State 2 — Processing

```text
AIS исследует проект...

[ progress / status ]
```

Без технического шума.

### State 3 — Answer

```text
Ответ

...

Основания ответа

[Источник 1]
[Источник 2]
[Источник 3]

[ Подробнее ]

Насколько ответ полезен?

[ Верно ] [ Частично ] [ Неверно ]
```

### State 4 — Completed

```text
Спасибо.

Ответ сохранён для последующего улучшения AIS.
```

Не показывать пользователю внутренние debug-структуры.

---

# 18. API Boundary

Если текущая архитектура требует API boundary, создать **минимальный** интерфейс.

Пример контрактов:

```text
POST /session
POST /session/:id/question
GET  /session/:id
POST /session/:id/feedback
GET  /session/:id/trace
```

Названия могут быть адаптированы к существующей архитектуре.

### Запрещено

Создавать:

```text
/auth
/users
/billing
/subscriptions
/analytics
/admin
```

---

# 19. Error Handling

Обязательные сценарии:

### Provider unavailable

Показывать:

> AIS временно не может обработать запрос.

Не показывать stack trace.

### Empty question

Запрос не отправляется.

### Execution timeout

Сессия получает:

```text
FAILED
```

Но не создаётся ложный успешный Response.

### Evidence failure

Ответ не должен автоматически считаться fully grounded.

---

# 20. Security

Перед сохранением любых пользовательских данных необходимо использовать существующую sanitization infrastructure.

Минимальные требования:

* secrets не сохраняются;
* API keys не попадают в Evidence;
* tokens не попадают в Trace;
* stack traces не выдаются пользователю;
* arbitrary filesystem access не предоставляется через пользовательский input.

---

# 21. Synthetic / Human Separation

Каждая Session обязана иметь provenance.

Пример:

```text
provenance: human
```

для реального пользователя.

Для автоматизированных тестов:

```text
provenance: synthetic
```

Нельзя смешивать эти данные при последующей validation aggregation.

---

# 22. No Commercial Infrastructure

001B **не должна** вводить:

* регистрацию;
* email verification;
* Stripe;
* тарифы;
* paywall;
* subscription;
* usage billing;
* commercial telemetry.

Причина проста:

**Сейчас нам важнее получить evidence, чем монетизировать недостаточно проверенную ценность.**

---

# 23. Acceptance Criteria

### AC-01 — Session

Можно создать Session и получить `sessionId`.

### AC-02 — Question

Вопрос пользователя сохраняется и связан с Session.

### AC-03 — AIS Execution

Вопрос реально проходит через существующий AIS execution pipeline.

### AC-04 — Response

Ответ сохраняется и связан с Session.

### AC-05 — Claims

Response содержит Claims или явно сообщает об отсутствии извлечённых Claims.

### AC-06 — Evidence

Claims связаны с Evidence.

### AC-07 — Feedback

Пользователь может оставить feedback.

### AC-08 — Quality Finding

Negative / partial feedback может породить Quality Finding.

### AC-09 — Trace

`getSessionTrace()` восстанавливает полный chain.

### AC-10 — Provenance

Human и synthetic sessions различаются.

### AC-11 — Security

Secrets не попадают в persistent evidence.

### AC-12 — Model Protection

Feedback не изменяет Architecture Model.

### AC-13 — Error Integrity

Неуспешный inference не создаёт ложный успешный результат.

### AC-14 — End-to-End

Один тест проходит полный путь:

```text
create session
→ question
→ AIS
→ response
→ claims
→ evidence
→ feedback
→ quality finding
→ trace
```

---

# 24. Testing

Обязательны:

### Unit tests

Для:

* Session creation;
* question linkage;
* response linkage;
* Claim linkage;
* Evidence linkage;
* Feedback linkage;
* Quality Finding;
* provenance;
* sanitization.

### Negative tests

Проверить:

* orphan Claim;
* orphan Evidence;
* feedback для чужой Session;
* mutation Architecture Model через Feedback;
* invalid Session;
* empty question;
* provider failure;
* timeout;
* secret leakage.

### Integration test

Один полный E2E сценарий.

---

# 25. Regression

После реализации:

```text
Evidence Loop tests
+
Session tests
+
Evidence tests
+
Feedback tests
+
Wave 1 tests
+
full existing suite
```

Ни один существующий PASS не должен быть потерян.

---

# 26. Reality Check

Перед изменением кода исполнитель обязан проверить:

1. текущий HEAD;
2. working tree;
3. существующий Evidence Loop;
4. существующий Session Runtime;
5. существующий Execution Engine;
6. существующие provider adapters;
7. существующие tests;
8. текущий Wave 1 CLI.

Нельзя предполагать наличие компонентов только по документации.

---

# 27. Design Check

Перед implementation сформировать краткую карту:

```text
Existing component
        ↓
Reuse / Extend
        ↓
New component
        ↓
Reason
```

Основное правило:

> **Reuse existing infrastructure before introducing a new abstraction.**

---

# 28. Implementation Boundary

Ожидаемая архитектура:

```text
                ┌─────────────────┐
                │ Minimal User UI │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Interaction API │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ AIS Execution   │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Evidence Loop   │
                │      001A       │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Session Trace   │
                └─────────────────┘
```

**001A остаётся domain core.**

001B является только interaction boundary.

---

# 29. Запрещённое архитектурное решение

Не создавать:

```text
NewSessionService
NewEvidenceService
NewFeedbackService
NewClaimService
```

если соответствующая ответственность уже существует в `evidence-loop`.

Вместо этого:

```text
Interaction Layer
       ↓
EvidenceLoopService
```

---

# 30. Definition of Done

Задача считается **PASS**, если:

* [ ] Reality Check выполнен;
* [ ] Design Check выполнен;
* [ ] минимальный interaction boundary существует;
* [ ] Session создаётся;
* [ ] вопрос проходит через AIS;
* [ ] Response сохраняется;
* [ ] Claims сохраняются;
* [ ] Evidence сохраняется;
* [ ] Feedback сохраняется;
* [ ] Quality Finding создаётся;
* [ ] полный Trace восстанавливается;
* [ ] provenance корректен;
* [ ] secrets не сохраняются;
* [ ] Architecture Model не мутирует;
* [ ] E2E test PASS;
* [ ] regression suite PASS;
* [ ] нет коммерческой инфраструктуры;
* [ ] нет новых AI capabilities;
* [ ] нет расширения MVP scope.

---

# 31. STOP CONDITIONS

Немедленно остановиться, если для выполнения требуется:

* менять Architecture Model semantics;
* менять фундаментальные архитектурные инварианты;
* вводить новую AI capability;
* увеличивать MVP scope;
* добавлять коммерческую инфраструктуру;
* добавлять authentication;
* менять существующий Evidence Loop без Design Check;
* обходить security constraints;
* скрывать failing tests;
* подменять real inference stub-ответом в E2E validation.

В таком случае зафиксировать:

```text
BLOCKED
```

и причину.

---

# 32. Итоговый критерий

После `TASK-MVP-EVIDENCE-LOOP-001B` мы должны иметь возможность сделать **одну настоящую пользовательскую сессию**:

> Человек задаёт AIS вопрос о реальном проекте → AIS отвечает → человек видит основания ответа → человек говорит «верно / частично / неверно» → система сохраняет полный trace.

Если это работает, **мы останавливаем разработку новых функций**.

Следующий этап — не очередная архитектурная спецификация, а:

```text
MVP
 ↓
FREE USERS
 ↓
REAL USAGE
 ↓
EVIDENCE
 ↓
FEEDBACK
 ↓
QUALITY FINDINGS
 ↓
PLATFORM IMPROVEMENT
```

Именно этот цикл сейчас является главным продуктовым экспериментом.
