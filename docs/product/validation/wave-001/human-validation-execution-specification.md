# TASK-WAVE1-HUMAN-VALIDATION-001 — Human Validation Execution Specification

**Статус:** READY TO EXECUTE
**Цель:** получить первое реальное E2-доказательство ценности AIS v3.1 через наблюдаемую работу независимых человеческих участников.
**Режим:** **STOP CODING**
**Изменение AIS:** запрещено до завершения Wave 1, кроме заранее определённых emergency/security fixes.

---

## 1. Назначение

Предыдущие этапы установили:

* Product Layer — стабилизирован;
* Architecture Layer — готов;
* MVP prototype — работает;
* Real LLM inference — подтверждён;
* Context Quality v3.1 — реализован;
* Synthetic Validation — выполнена;
* Synthetic результат: **AIS v3.1 = CONTROL B по медиане 19/25**;
* Context Advantage пока **не доказан**;
* Commercial Score остаётся **3.0/5.0**.

Следующая задача — получить данные, которые синтетические агенты принципиально не могут предоставить:

> **Может ли реальный человек использовать AIS для получения архитектурного понимания сложной кодовой базы и получить от него проверяемую дополнительную ценность?**

---

# 2. Главный исследовательский вопрос

### Primary Question

> **Does AIS provide measurable Context Advantage over independent human analysis and/or a general-purpose LLM when helping a participant understand an unfamiliar software architecture?**

Дополнительные вопросы:

1. Помогает ли AIS быстрее сформировать архитектурную модель?
2. Повышает ли качество ответа?
3. Уменьшает ли количество пропущенных связей?
4. Делает ли reasoning более проверяемым?
5. Может ли пользователь самостоятельно проверить assertions AIS?
6. Доверяет ли пользователь AIS адекватно, а не слепо?
7. Хочет ли пользователь повторно использовать систему?

---

# 3. Что НЕ является целью

Wave 1 **не должна**:

* доказывать коммерческую готовность всего продукта;
* измерять retention;
* измерять willingness-to-pay как основной сигнал;
* проверять все 11 capabilities;
* тестировать будущие функции;
* расширять MVP;
* улучшать AIS во время эксперимента;
* подгонять scoring под результаты;
* заменять реальные человеческие сессии AI-агентами.

---

# 4. Frozen Configuration

Перед первым участником зафиксировать:

```text
AIS Version: v3.1
Target Scope: src/core/
Question Bank: FROZEN
Scoring Rubric: FROZEN
Session Protocol: FROZEN
Evidence Schema: FROZEN
Validation Gates: FROZEN
```

Зафиксировать:

* git commit;
* repository HEAD;
* scope;
* количество файлов;
* LOC;
* конфигурацию AIS;
* используемую модель;
* provider;
* prompt/context configuration;
* timeout;
* дату и время freeze.

После freeze нельзя менять экспериментальные параметры.

---

# 5. Target Repository

Основной validation scope:

```text
src/core/
```

Зафиксированный rationale:

* ~393 файла;
* ~73K LOC;
* десятки архитектурных подсистем;
* существенная dependency structure;
* multiple architectural boundaries;
* достаточная сложность для независимого baseline;
* возможность последующей проверки assertions по исходному коду.

### Запрещено

Не переключать scope на `backend/` только потому, что он быстрее.

`backend/` уже признан недостаточно репрезентативным для основной Human Wave.

---

# 6. Participants

Target:

**5–8 реальных участников.**

Желательные профили:

| Profile                    | Priority |
| -------------------------- | -------: |
| Software Developer         |     High |
| Senior Developer           |     High |
| Tech Lead                  |     High |
| Software Architect         |     High |
| Security Engineer          |   Medium |
| DevOps / Platform Engineer |   Medium |

Участник должен:

* иметь реальный опыт чтения чужого кода;
* понимать базовые concepts software architecture;
* не быть автором AIS;
* не участвовать в разработке validation protocol;
* не знать заранее ожидаемый результат;
* не иметь предварительного глубокого знания `src/core/`.

---

# 7. Independence Rule

Участник должен самостоятельно выполнять baseline.

Observer **не имеет права**:

* объяснять архитектуру;
* подсказывать расположение файлов;
* наводить на правильный ответ;
* объяснять AIS;
* исправлять ошибки участника;
* подсказывать, какие assertions считать правильными.

Допустимы только:

* инструкции протокола;
* техническая помощь, необходимая для работы среды;
* контроль времени;
* вопросы из утверждённого interview guide.

---

# 8. Experimental Design

Для каждого участника:

```text
CONSENT
   ↓
BRIEFING
   ↓
BASELINE
   ↓
AIS INTERACTION
   ↓
VERIFICATION
   ↓
COMPARISON
   ↓
INTERVIEW
   ↓
EVIDENCE CAPTURE
```

---

# 9. Phase A — Consent

До начала:

* participant receives information sheet;
* confirms voluntary participation;
* confirms recording/evidence rules;
* understands that session evaluates AIS, not participant;
* may terminate session at any time.

Если consent отсутствует:

**SESSION INVALID.**

---

# 10. Phase B — Briefing

Участнику сообщается только необходимая информация.

Нельзя сообщать:

* ожидаемый результат;
* что AIS должен быть лучше;
* Synthetic Validation score;
* Commercial Score;
* known weaknesses;
* expected architecture;
* правильный ответ на question bank.

---

# 11. Phase C — Human Baseline

Участнику предоставляется:

```text
Repository Scope:
src/core/
```

и один frozen architectural question.

### Основной вопрос

Использовать frozen Q1 из Question Bank.

Если Q1 технически недоступен вследствие environment failure — использовать заранее утверждённый Q2/Q3.

**Нельзя выбирать вопрос после просмотра результатов участника.**

---

# 12. Baseline Task

Участник должен самостоятельно определить:

1. основные архитектурные границы;
2. взаимодействие ключевых подсистем;
3. dependency relationships;
4. потенциальные impact areas;
5. основания своих выводов.

Участник имеет ограниченное время согласно frozen protocol.

Фиксировать:

* start time;
* end time;
* explored files;
* search actions;
* final answer;
* confidence;
* unresolved questions;
* observed dead ends.

---

# 13. Baseline Scoring

Baseline оценивается **до раскрытия AIS-ответа**.

Использовать frozen scoring rubric.

Оценивать отдельно:

* architectural correctness;
* coverage;
* traceability;
* evidence grounding;
* uncertainty calibration;
* explainability.

Нельзя менять scoring после получения AIS результата.

---

# 14. Phase D — AIS Interaction

После завершения baseline участнику предоставляется AIS.

Участник получает:

* тот же вопрос;
* тот же scope;
* AIS response;
* AIS evidence/citations, если они доступны;
* возможность задать разрешённые follow-up questions согласно протоколу.

### Важно

Не сообщать участнику:

> \u00abAIS уже знает правильный ответ\u00bb.

AIS должен выступать как инструмент исследования.

---

# 15. AIS Scoring

Оценивать:

### A. Correctness

Содержит ли ответ фактически правильные assertions?

### B. Coverage

Найдены ли важные архитектурные relationships?

### C. Grounding

Можно ли assertion связать с конкретным source evidence?

### D. Explainability

Понимает ли участник, **почему** AIS сделал вывод?

### E. Uncertainty

Различает ли AIS:

```text
fact
inference
uncertainty
```

### F. Verification

Может ли участник самостоятельно проверить assertions?

---

# 16. Phase E — Verification

Это критическая часть эксперимента.

Участнику показываются assertions AIS.

Для каждой ключевой assertion фиксировать:

```text
CLAIM
SOURCE
VERIFIED?
PARTICIPANT CONFIDENCE
CORRECTION
```

Классификация:

* Verified;
* Partially Verified;
* Incorrect;
* Unverifiable.

---

# 17. Hallucination Rule

Любое фактически неверное архитектурное утверждение фиксируется.

Не исправлять его молча.

Например:

```text
AIS claim:
"execution module controls the cognitive pipeline"

Repository reality:
No execution module exists.

Classification:
INCORRECT / HALLUCINATION
```

Ошибки являются evidence.

Их нельзя удалять из отчёта ради улучшения score.

---

# 18. Human Trust Calibration

Нужно проверить не только:

> \u00abПонравился ли AIS?\u00bb

а:

> **Доверяет ли человек AIS настолько, насколько это оправдано качеством его evidence?**

Фиксировать:

* acceptance without verification;
* verification behavior;
* rejection of incorrect claims;
* confidence before verification;
* confidence after verification.

---

# 19. Comparative Assessment

После обеих фаз задаются нейтральные вопросы:

1. Что было легче решить самостоятельно?
2. Что AIS помог увидеть?
3. Что AIS не смог показать?
4. Где AIS оказался полезнее?
5. Где baseline оказался лучше?
6. Были ли assertions AIS, которым вы первоначально доверяли, но которые оказались неверными?
7. Использовали бы вы такой инструмент снова?
8. В какой реальной рабочей ситуации?

---

# 20. Primary Metrics

Для каждого участника рассчитывать:

### M1 — Architecture Correctness

Доля корректных ключевых assertions.

### M2 — Architecture Coverage

Доля заранее определённых важных relationships, найденных участником.

### M3 — Grounding Rate

```text
grounded assertions / total assertions
```

### M4 — Verification Success

Доля assertions, которые participant смог проверить.

### M5 — Time to Understanding

Время до получения достаточного архитектурного ответа.

### M6 — Context Advantage

Сравнение:

```text
Human Baseline
        vs
AIS-assisted
```

---

# 21. Secondary Metrics

Фиксировать:

* confidence;
* number of searches;
* number of files inspected;
* number of wrong hypotheses;
* number of corrections;
* perceived usefulness;
* willingness to reuse;
* trust calibration;
* cognitive load.

---

# 22. Synthetic Comparison

Synthetic result фиксируется как исторический baseline:

```text
CONTROL B: 19/25
AIS v3.1:  19/25
```

Human results **не должны подгоняться**, чтобы подтвердить Synthetic Wave.

Возможны результаты:

```text
Human confirms S1
Human contradicts S1
Human reveals new effect
Human reveals experimental flaw
```

Все три варианта валидны.

---

# 23. Evidence Levels

Каждая сессия должна создавать evidence, пригодный для перехода:

```text
E0 → E1 → E2
```

### E2 должно включать

* реального участника;
* реальную задачу;
* наблюдаемое поведение;
* baseline;
* AIS interaction;
* verification;
* structured evidence;
* participant feedback.

Не считать:

* AI-generated participant;
* simulated participant;
* synthetic run

заменой E2.

---

# 24. Session Invalidity Conditions

Сессию признать invalid, если:

1. participant не соответствует screening;
2. consent отсутствует;
3. scope изменён;
4. question изменён после начала;
5. AIS configuration изменена;
6. observer подсказал решение;
7. participant получил заранее известный ответ;
8. evidence потеряно;
9. baseline пропущен;
10. AIS phase пропущен;
11. verification не выполнена;
12. произошёл существенный технический сбой.

Invalid session **не превращается в FAIL продукта**.

Она исключается из основной выборки с причиной.

---

# 25. Technical Failure Rule

Если AIS не работает:

```text
Technical Failure
```

а не:

```text
AIS Value = 0
```

Зафиксировать:

* error;
* timestamp;
* configuration;
* scope;
* retry;
* recovery;
* impact on session.

Если восстановление невозможно — session invalid.

---

# 26. Observer Protocol

Observer записывает только наблюдаемые факты.

Правильно:

> Participant searched `cognitive-runtime.ts` and then changed their answer.

Неправильно:

> Participant did not understand the architecture.

Первое — observation.

Второе — interpretation.

---

# 27. Evidence Ledger

Для каждой significant finding:

```yaml
id:
participant:
phase:
claim:
source:
evidence_type:
verified:
confidence:
correction:
timestamp:
```

Каждая запись должна быть traceable обратно к:

* session;
* participant;
* claim;
* source evidence.

---

# 28. Gate 1 — Problem Validated

PASS только если реальные участники демонстрируют существование исследуемой проблемы.

Evidence:

* repeated difficulty;
* observable architecture-understanding friction;
* meaningful baseline effort.

---

# 29. Gate 2 — Value Validated

PASS если AIS предоставляет наблюдаемую полезность хотя бы части участников.

Нельзя считать PASS только на основании:

> \u00abМне понравилось\u00bb.

Нужна measurable improvement или clearly demonstrated utility.

---

# 30. Gate 3 — Context Advantage

Это **главный gate текущей Wave**.

PASS требует evidence, что AIS способен предоставить преимущество, связанное именно с AIS contextual understanding.

Примеры:

```text
AIS finds relationship participant missed
AIS identifies dependency chain faster
AIS produces more grounded architectural explanation
AIS reduces exploration effort
```

Если:

```text
AIS ≈ CONTROL B
```

результат:

**Context Advantage NOT DEMONSTRATED.**

---

# 31. Gate 4 — Repeat Value

Проверить:

* хочет ли participant повторить использование;
* видит ли второй use case;
* считает ли инструмент полезным после обнаружения его ошибок;
* готов ли встроить его в реальный workflow.

---

# 32. Gate 5 — Commercial Signal

Wave 1 **не должна самостоятельно назначать цену**.

Она только создаёт evidence для следующей Commercial Reassessment.

Положительный сигнал:

* повторное намерение использования;
* реальный workflow;
* существенная perceived/observed value;
* evidence of problem severity.

---

# 33. Decision Matrix

| Result            | Action                                                       |
| ----------------- | ------------------------------------------------------------ |
| Gates 1–4 PASS    | Commercial reassessment candidate                            |
| Gate 3 FAIL       | Investigate Context Advantage before commercial reassessment |
| Gate 1 FAIL       | Reconsider problem definition                                |
| Gate 2 FAIL       | Reconsider value proposition                                 |
| Gate 4 FAIL       | Investigate repeatability                                    |
| Technical failure | Fix/retry, not product FAIL                                  |
| Invalid session   | Exclude, document                                            |
| Mixed evidence    | Continue Wave                                                |

---

# 34. Stop Conditions

Остановить Wave только если:

### Positive stop

Достигнут target sample и gates позволяют принять решение.

### Negative stop

Получено достаточное evidence, показывающее отсутствие ключевой гипотезы.

### Technical stop

AIS невозможно использовать в frozen environment.

### Safety stop

Обнаружена утечка credentials, private data или другой security issue.

---

# 35. Anti-Bias Rules

Запрещается:

* менять question после первых результатов;
* выбирать только успешные sessions;
* удалять неудобные findings;
* менять scoring rubric;
* давать participant hints;
* выбирать лучший AIS output задним числом;
* исключать ошибки AIS без классификации;
* использовать synthetic participants как human evidence;
* объявлять Commercial Score повышенным без evidence.

---

# 36. Sample Strategy

Минимально:

**5 участников.**

Target:

**5–8 участников.**

Если первые 5 дают однозначный результат, провести проверку consistency на оставшихся.

Не объявлять статистическую значимость при таком размере выборки.

Это **exploratory product validation**, а не controlled clinical/statistical trial.

---

# 37. Deliverables

После завершения Wave должны существовать:

```text
wave-001/
├── participant records
├── baseline records
├── AIS interaction records
├── verification records
├── observer notes
├── evidence ledgers
━
├── wave-001-evidence-summary.md
├── wave-001-findings.md
├── wave-001-gate-results.md
└── mvp-validation-wave-001-final.md
```

Дополнительно:

```text
WAVE1-FINAL-DECISION.md
```

с одним из:

```text
VALIDATED
PARTIALLY VALIDATED
INCONCLUSIVE
NOT VALIDATED
BLOCKED
```

---

# 38. Final Report Structure

Финальный отчёт обязан содержать:

1. Scope;
2. Frozen version;
3. Participants;
4. Sessions completed;
5. Invalid sessions;
6. Baseline results;
7. AIS results;
8. Verification results;
9. Hallucinations;
10. Grounding;
11. Context Advantage;
12. Trust calibration;
13. Participant feedback;
14. H1–H12 status;
15. Gate 1–5;
16. Synthetic comparison;
17. Findings;
18. Limitations;
19. Contradictions;
20. Decision;
21. Next action.

---

# 39. Relationship to Commercial Reassessment

**Не пересчитывать Commercial Score во время Wave.**

Текущий baseline:

> **3.0/5.0 — GO WITH CONDITIONS**

остаётся неизменным.

После Wave:

```text
Human E2 Evidence
        ↓
Validation Report
        ↓
Commercial Reassessment
        ↓
New Commercial Score
```

Это позволит реально сравнить:

```text
3.0/5.0
   ↓
?
```

а не субъективно решить, что платформа стала лучше.

---

# 40. Relationship to MVP Scope

Результаты Wave **не могут автоматически добавлять capabilities**.

Если участники просят:

* новые функции;
* новые visualization;
* новые integrations;
* autonomous behavior;
* дополнительные AI capabilities,

они записываются как findings / future opportunities.

**MVP scope frozen.**

---

# 41. Coding Rule

На протяжении Human Wave:

> **STOP CODING.**

Если обнаружена проблема AIS:

```text
Observation
    ↓
Evidence
    ↓
Classification
    ↓
Post-Wave engineering backlog
```

а не немедленное исправление.

Иначе эксперимент перестанет быть воспроизводимым.

---

# 42. Success Criteria

Задача считается **EXECUTED** только если:

* ≥5 реальных участников;
* каждый прошёл valid session;
* baseline записан;
* AIS interaction записан;
* verification выполнена;
* evidence ledger заполнен;
* findings классифицированы;
* Gate 1–5 рассчитаны;
* Synthetic Wave сравнена с Human Wave;
* финальный verdict сформирован.

---

# 43. Главное правило этой задачи

Мы больше **не пытаемся доказать, что AIS хороший**.

Мы пытаемся выяснить:

> **В каких условиях AIS действительно лучше альтернативы, а в каких — нет?**

Если результат будет:

```text
AIS > Baseline
AIS > General LLM
```

— это сильный сигнал.

Если:

```text
AIS ≈ General LLM
```

— это сигнал для изменения продукта.

Если:

```text
AIS < Baseline
```

— это тоже ценный результат.

**Любой честный результат лучше красивого, но неподтверждённого результата.**

---

## 44. NEXT ACTION

После создания/проверки этого ТЗ **не писать новый код AIS**.

Следующий операционный шаг:

```text
Recruitment
   ↓
Screening
   ↓
Schedule P001
   ↓
Freeze verification
   ↓
Human Session #001
   ↓
Evidence capture
```

После первой валидной сессии **не делать преждевременный вывод** — сначала накопить минимальную выборку.

### Итоговый статус задачи

**TASK-WAVE1-HUMAN-VALIDATION-001 — READY TO EXECUTE**

**STOP CODING: ACTIVE**

**Target: 5–8 real participants**

**Primary Gate: Context Advantage**

**Current Commercial Score: 3.0/5.0 — frozen until new evidence.**
