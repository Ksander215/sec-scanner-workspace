# EXPERIMENT_PLAYBOOK.md - Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Операционный документ - Experiment Process
> **Владелец:** CPO
> **Статус:** Active
> **Связанные документы:** PRODUCT_INTELLIGENCE_FRAMEWORK.md, KPI_CATALOG.md, WEEKLY_REVIEW_TEMPLATE.md, MONTHLY_BUSINESS_REVIEW.md

---

## Executive Summary

Experiment Playbook - единый процесс запуска продуктовых экспериментов. Каждый гипотеза, требующая валидации данными, проходит через этот процесс. Playbook гарантирует, что эксперименты: (a) имеют чёткую гипотезу, (b) измеримы, (c) ограничены по времени, (d) приводят к решению.

Без процесса эксперименты превращаются в «давайте попробуем и посмотрим» - безbaseline, без success criteria, без выводов. Это пустая трата ресурса на стадии Pre-revenue.

---

## 1. When to Run an Experiment

Эксперимент запускается когда:

1. **Feature prioritization debate.** Два feature кандидата, и нет данных, какой даст больший эффект.
2. **Onboarding hypothesis.** «Если изменить X в onboarding, Activation вырастет на Y%».
3. **Pricing hypothesis.** «Если добавить/изменить Z в pricing, conversion изменится на W%».
4. **Marketing channel hypothesis.** «Если инвестировать в канал A, CAC будет ниже, чем в канале B».
5. **Retention hypothesis.** «Если добавить feature X, D7 retention улучшится».
6. **Value proposition hypothesis.** «Если изменить messaging на Y, Landing Conversion изменится».

**Когда НЕ нужен эксперимент:**
- Bug fix (просто исправить)
- Emergency (действовать немедленно)
- Очевидное улучшение (например, 404 page missing - добавить без эксперимента)
- Архитектурные решения (expert decision, см. PRODUCT_INTELLIGENCE_FRAMEWORK §2.3)

---

## 2. Experiment Template

Каждый эксперимент создаётся по следующему шаблону. Минимальный эксперимент - 6 полей. Расширенный - 10 полей.

### 2.1 Минимальный шаблон (для небольших изменений)

```markdown
## EXP-[NNN]: [Short Title]

- **Дата создания:** YYYY-MM-DD
- **Owner:** [Role]
- **Статус:** Draft / Running / Completed / Cancelled

### Гипотеза
Если [изменение], то [метрика] [изменится на X%], потому что [причина].

### Expected Effect
- **Primary Metric:** [metric name], current baseline: [value], expected: [value + X%]
- **Minimum Detectable Effect:** [X%] (минимальный эффект, который мы считаем значимым)

### KPI Success
- **Success:** [metric] >= [target] за [N] недель
- **Failure:** [metric] < [baseline] или < [baseline + 1%]

### Duration
- **Start:** YYYY-MM-DD
- **End:** YYYY-MM-DD (максимум [N] недель)
- **Evaluation:** YYYY-MM-DD + 1 день

### Result
[Заполняется после завершения]
- **Actual:** [metric] = [value]
- **Delta:** [+/-%]
- **Conclusion:** Confirmed / Invalidated / Inconclusive
- **Decision:** [что делаем дальше: ship / rollback / iterate / abandon]
```

### 2.2 Расширенный шаблон (для стратегических изменений)

Включает все поля минимального шаблона плюс:

```markdown
### Context
[Почему эта гипотеза возникла. Предшествующие данные, user feedback, observations.]

### Alternatives Considered
1. [Alternative A] - rejected because [reason]
2. [Alternative B] - rejected because [reason]

### Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| [risk] | Low/Med/High | Low/Med/High | [action] |

### Segmentation
[Анализируется ли эффект по сегментам? Individual / Startup / SMB]

### Guardrail Metrics
[Метрики, которые НЕ должны ухудшиться:]
- [guardrail metric 1]: threshold [value]
- [guardrail metric 2]: threshold [value]

### Learnings
[Что мы узнали, независимо от результата эксперимента.]
```

---

## 3. Experiment Lifecycle

### Phase 1: Design (1-2 часа)

1. Сформулировать гипотезу по шаблону.
2. Определить primary metric и baseline.
3. Определить success / failure criteria.
4. Оценить duration (минимум 1 неделя, максимум 4 недели).
5. Проверить guardrail metrics.
6. Создать EXP-[NNN] record.

### Phase 2: Review (15 минут)

1. Owner представляет эксперимент Founder'у.
2. Founder утверждает или просит доработать.
3. Проверить: не конфликтует ли с другими running experiments (max 2 parallel).

### Phase 3: Execute (1-4 недели)

1. Реализовать изменение.
2. Собирать данные daily.
3. Не прерывать эксперимент до planned end date (кроме emergency stop conditions).

### Phase 4: Evaluate (1-2 часа)

1. Собрать финальные данные.
2. Сравнить с baseline и success/failure criteria.
3. Определить conclusion: Confirmed / Invalidated / Inconclusive.
4. Принять decision: Ship / Rollback / Iterate / Abandon.
5. Зафиксировать result в EXP-[NNN].

### Phase 5: Document (30 минут)

1. Обновить KPI_CATALOG.md если изменились метрики.
2. Обновить GROWTH_DASHBOARD.md если изменились target values.
3. Зафиксировать learnings в Monthly Business Review.
4. Если решение затрагивает архитектуру/стратегию - записать в DECISION_LOG.

---

## 4. Experiment Rules

### 4.1 Maximum Concurrent Experiments

**Правило:** Не более 2 экспериментов одновременно. Причина: изоляция переменных. Если 5 экспериментов running - невозможно определить, какой повлиял на метрику.

### 4.2 Minimum Duration

**Правило:** Минимум 1 неделя данных. Для метрик с weekly паттерном (WASP) - минимум 2 недели. Причина: дневная вариация может быть случайной.

### 4.3 Maximum Duration

**Правило:** Максимум 4 недели. Если за 4 недели нет чёткого результата - эксперимент Inconclusive, прекратить. Причина: opportunity cost. Время = ресурс.

### 4.4 Emergency Stop

**Правило:** Если guardrail metric ухудшается > 20% от baseline - немедленно остановить эксперимент. Причина: защита продукта от damage.

### 4.5 No Cherry-Picking

**Правило:** Решение принимается по primary metric, а не по «самому красивому» результату. Если primary metric не улучшилась, но secondary - да → Inconclusive. Причина: предотвращение confirmation bias.

### 4.6 Pre-Registration

**Правило:** Гипотеза, success criteria, и primary metric фиксируются ДО начала эксперимента. Post-hoc изменение success criteria запрещено. Причина: предотвращение p-hacking.

---

## 5. Experiment Examples

### Example 1: Onboarding Simplification

```markdown
## EXP-001: Remove step 4 from onboarding wizard

- **Дата:** 2026-08-01
- **Owner:** CPO
- **Статус:** Completed

### Гипотеза
Если убрать step 4 («Invite team members») из onboarding wizard,
то Activation Rate вырастет на 5% (с 10% до 15%), потому что
дополнительный шаг создаёт friction без немедленной ценности
для solo-пользователя.

### Expected Effect
- **Primary Metric:** Activation Rate, baseline: 10%, expected: 15%
- **Minimum Detectable Effect:** +3% (статистически значимо для 100+ registrants)

### KPI Success
- **Success:** Activation Rate >= 13% за 2 недели
- **Failure:** Activation Rate < 10% или TTFV > 5 минут

### Duration
- **Start:** 2026-08-01
- **End:** 2026-08-14

### Guardrail Metrics
- TTFV: не должен ухудшиться > 30 секунд
- D7 Retention: не должен ухудшиться > 3%

### Result
- **Actual:** Activation Rate = 14.2%
- **Delta:** +4.2%
- **Conclusion:** Confirmed (превысил MDE)
- **Decision:** Ship. Убрать step 4 из wizard. Team invitation перенести в post-onboarding email.
```

### Example 2: Email Digest Timing

```markdown
## EXP-002: Send Email Digest on Tuesday vs Friday

- **Дата:** 2026-08-15
- **Owner:** Growth Lead
- **Статус:** Running

### Гипотеза
Если отправлять Weekly Digest во вторник (а не в пятницу),
то CTR будет выше на 15%, потому что во вторник CTO планируют неделю
и более склонны к action, чем в пятницу (beginning of weekend).

### Expected Effect
- **Primary Metric:** Email Digest CTR, baseline: 12%, expected: 14%
- **Minimum Detectable Effect:** +2%

### KPI Success
- **Success:** CTR >= 14% за 3 недели
- **Failure:** CTR < 11%

### Duration
- **Start:** 2026-08-15
- **End:** 2026-09-05 (3 недели - 3 email sends)

### Segmentation
- Анализ по сегментам: Individual vs Startup vs SMB

### Guardrail Metrics
- Unsubscribe rate: < 1% per send
```

---

## 6. Experiment Tracking

### 6.1 Registry

Все эксперименты регистрируются в таблице (внутри MONTHLY_BUSINESS_REVIEW или отдельный файл):

| ID | Title | Owner | Status | Start | End | Primary Metric | Result |
|----|-------|-------|--------|-------|-----|----------------|--------|
| EXP-001 | Onboarding simplification | CPO | Completed | 2026-08-01 | 2026-08-14 | Activation Rate | Confirmed (+4.2%) |
| EXP-002 | Digest timing | Growth | Running | 2026-08-15 | 2026-09-05 | CTR | - |

### 6.2 Experiment Backlog

Гипотезы, которые ещё не запущены (не хватает ресурса, неправильный timing, и т.д.):

| Priority | Hypothesis | Estimated Effort | Blocking Reason |
|----------|-----------|-----------------|-----------------|
| P1 | Добавить social proof на landing (testimonials) | 2h | Нет testimonials |
| P2 | Pricing page redesign | 1d | После Stripe integration |

---

## 7. Common Pitfalls

### Pitfall 1: Experimenting Without Baseline

**Проблема:** «Мы изменили onboarding, Activation 15% - хорошо!» Но baseline был неизвестен - возможно, было 20%.

**Решение:** Всегда фиксировать baseline перед запуском. Если baseline неизвестен - сначала собрать 1 неделю данных без изменений.

### Pitfall 2: Too Many Variables

**Проблема:** Одновременно изменили onboarding, добавили email, и обновили landing. Activation выросла на 8%. Что сработало?

**Решение:** Max 2 parallel experiments. One change per experiment (или связанный set, но тогда это один experiment).

### Pitfall 3: Stopping Too Early

**Проблема:** «Через 3 дня Activation упала на 2% - откатываем!» Но 3 дня - недостаточно для статистически значимого вывода. День может быть аномальным (выходные, holiday).

**Решение:** Минимум 1 неделя. Для weekly метрик - 2 недели.

### Pitfall 4: Ignoring Segment Differences

**Проблема:** Activation выросла на 5% в среднем. Но для Individual Dev - выросла на 15%, а для SMB - упала на 3%. Средний показатель скрывает сегментную проблему.

**Решение:** Всегда проверять результаты по сегментам (Individual / Startup / SMB).

### Pitfall 5: No Decision After Experiment

**Проблема:** Эксперимент завершён, результат записан, но... ничего не произошло. Гипотеза подтверждена, а change не shipped (или не откачена).

**Решение:** Обязательное поле «Decision» в результате эксперимента. Experiment без Decision = незавершённый.

---

## Приложение A. Quick Reference Card

```
EXPERIMENT PLAYBOOK - 5 STEPS
1. Design    → Гипотеза + metric + baseline + success criteria
2. Review    → Founder approval, max 2 parallel
3. Execute   → Min 1 week, max 4 weeks
4. Evaluate  → Compare vs baseline, determine conclusion
5. Document  → Update KPI, Dashboard, Decision Log

RULES:
- Max 2 parallel experiments
- Min 1 week, max 4 weeks
- Pre-register hypothesis before starting
- Emergency stop if guardrail > 20% worse
- Decision is mandatory (ship/rollback/iterate/abandon)
```
