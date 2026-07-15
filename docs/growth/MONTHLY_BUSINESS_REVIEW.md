# MONTHLY_BUSINESS_REVIEW.md - Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 1.0
> **Тип:** Стратегический документ - Monthly Review Template
> **Владелец:** CEO
> **Статус:** Active
> **Связанные документы:** PRODUCT_INTELLIGENCE_FRAMEWORK.md, KPI_CATALOG.md, GROWTH_DASHBOARD.md, SUCCESS_GATES.md, WEEKLY_REVIEW_TEMPLATE.md, EXPERIMENT_PLAYBOOK.md

---

## Purpose

Monthly Business Review (MBR) - ежемесячный стратегический обзор. Занимает 60-90 минут. Проводится в первый рабочий день каждого месяца. В отличие от Weekly Review (операционный), MBR фокусируется на стратегии: тренды, долги, решения, roadmap.

MBR - это также инструмент для investor-ready отчёта. При запросе от инвестора - MBR за последний месяц + тренд за 3 месяца = готовый update.

Каждый месяц создаётся новый файл: `reviews/monthly-YYYY-MM.md`.

---

## Template

### Month [N] - [Month YYYY]

---

## 1. Executive Summary (3-5 sentences)

[Главный результат месяца. Достигнут ли monthly target? Главная победа. Главная проблема. Ключевое решение.]

---

## 2. Product

### 2.1 Product Health

| Метрика | Start of Month | End of Month | Delta | M-Target | Status |
|---------|---------------|-------------|-------|----------|--------|
| WASP | | | | [M-target] | |
| Activation Rate | | | | | |
| D7 Retention (latest cohort) | | | | | |
| D30 Retention (latest cohort) | | | | | |
| NPS | | | | | |
| Scan Success Rate | | | | | |
| TTFV (median) | | | | | |
| Score Distribution Median | | | | | |

### 2.2 Key Product Events

[Список product changes за месяц: new features, UX changes, bug fixes. Для каждого: что, когда, влияние на метрики (если есть).]

| Дата | Change | Type | Metric Impact |
|------|--------|------|---------------|
| | | Feature / Fix / UX / Experiment | [metric: +X%] |

### 2.3 User Feedback Summary

[Краткое резюме пользовательского feedback за месяц. Источники: support emails, interviews, HN/Reddit mentions, in-app feedback.]

**Top 3 Positive Themes:**
1. [theme + 1-2 representative quotes]
2. [theme]
3. [theme]

**Top 3 Complaints:**
1. [complaint + frequency]
2. [complaint]
3. [complaint]

**Action Items from Feedback:**
| Complaint | Priority | Action | Owner |
|-----------|----------|--------|-------|
| [complaint] | P0/P1/P2 | [what to do] | [role] |

---

## 3. Users

### 3.1 User Metrics

| Метрика | Start | End | Delta | Target |
|---------|-------|-----|-------|--------|
| Total Registered | | | | |
| WAU (end of month) | | | | |
| New Users This Month | | | | |
| D1 Retention (avg cohort) | | | | |
| D7 Retention (avg cohort) | | | | |
| D30 Retention (avg cohort) | | | | |
| Referral Rate | | | | |
| Team Invitations Sent | | | | |

### 3.2 Cohort Analysis

| Cohort | Users | D1 | D7 | D30 | Activated | Paying |
|--------|-------|----|----|-----|-----------|--------|
| Week 1 | | | | | | |
| Week 2 | | | | | | |
| Week 3 | | | | | | |
| Week 4 | | | | | | |

[Анализ: какой cohort лучше? Почему? Есть ли улучшение от cohort к cohort?]

### 3.3 User Segments

| Segment | Users | % of Total | WASP | Retention | Paying |
|---------|-------|------------|------|-----------|--------|
| Individual Dev | | | | | |
| Startup 5-20 | | | | | |
| SMB 20-50 | | | | | |
| Other/Unknown | | | | | |

[Анализ: какой сегмент показывает лучшие метрики? Это подтверждает ICP?]

---

## 4. Engineering

### 4.1 Engineering Health

| Метрика | Value | Target | Status |
|---------|-------|--------|--------|
| Uptime | | > 99.5% | |
| P95 Scan Duration | | < 60 sec | |
| Error Rate (5xx) | | < 1% | |
| Test Coverage (Domain) | | > 80% | |
| Test Coverage (Total) | | > 60% | |
| Deployments This Month | | | |
| Incidents This Month | | 0 | |
| Mean Time to Recovery | | < 1h | |

### 4.2 Technical Debt

| Тип долга | Уровень | Изменение | Детали |
|-----------|---------|-----------|--------|
| Technical Debt | [Low/Medium/High] | [↑/↓/→] | [что сделано, что добавилось] |
| Architecture Debt | [Low/Medium/High] | [↑/↓/→] | |
| Business Debt | [Low/Medium/High] | [↑/↓/→] | |
| Documentation Debt | [Low/Medium/High] | [↑/↓/→] | |

### 4.3 Architecture Decisions

[Список архитектурных решений за месяц с результатами. Ссылки на DECISION_LOG.]

| Decision ID | Title | Status | Metric Impact |
|-------------|-------|--------|---------------|
| | | Proposed/Accepted/Implemented/Validated | |

---

## 5. Marketing

### 5.1 Marketing Metrics

| Метрика | Value | Target | Delta vs Last Month |
|---------|-------|--------|-------------------|
| Total Visitors | | | |
| Organic Visitors | | | |
| Paid Visitors | | | |
| Referral Visitors | | | |
| Landing Conversion | | | |
| CAC (blended) | | | |
| Content Published | | | |

### 5.2 Channel Performance

| Channel | Visitors | Signups | Activation | CAC | ROI |
|---------|----------|---------|------------|-----|-----|
| Organic Search | | | | | |
| HN / Reddit | | | | | |
| Product Hunt | | | | | |
| Twitter / LinkedIn | | | | | |
| Direct / Referral | | | | | |
| Email Outreach | | | | | |

### 5.3 Marketing Experiments

[Список маркетинговых экспериментов за месяц. Ссылки на EXP-XXX.]

| Experiment | Hypothesis | Result | Decision |
|------------|-----------|--------|----------|
| | | Confirmed / Invalidated / Inconclusive | [action] |

---

## 6. Finances

### 6.1 Revenue

| Метрика | Value | Target | Delta vs Last Month |
|---------|-------|--------|-------------------|
| MRR | | | |
| ARR (Run Rate) | | | |
| New MRR (this month) | | | |
| Expansion MRR | | | |
| Contraction MRR | | | |
| Churned MRR | | | |
| NRR | | | |

### 6.2 Unit Economics

| Метрика | Value | Target |
|---------|-------|--------|
| ARPU | | > $40 |
| CAC | | < $80 |
| LTV (estimated) | | > $1,200 |
| LTV/CAC | | > 3x |
| CAC Payback | | < 4 months |
| Gross Margin | | > 80% |

### 6.3 Burn Rate & Runway

| Метрика | Value |
|---------|-------|
| Monthly Expenses | |
| Burn Rate (net) | |
| Runway (months) | |
| Cash Reserve | |

[Примечание: для bootstrapped startup - расходы = hosting + domain + tools. Для funded - добавить salaries.]

---

## 7. Technical Debt Review

### 7.1 Debt Tracker

| Debt Item | Type | Added | Severity | Effort | Impact | Status |
|-----------|------|-------|----------|--------|--------|--------|
| Application Layer not implemented | Architecture | TASK-010 | High | 5-7d | Architecture leaks | Planned |
| SQLite concurrency limit | Architecture | TASK-001 | Medium | 3-5d | > 50 concurrent | Deferred (M6-12) |
| [new items] | | | | | | |

### 7.2 Debt Prioritization

[Какие 2-3 debt items имеют наивысший ROI для следующего месяца? Почему?]

---

## 8. Architecture Debt Review

[Отдельно от Technical Debt - фокус на архитектурных решениях, которые откладывались.]

| Deferred Decision | Trigger for Revisit | Current Impact | Priority |
|-------------------|--------------------|-----------------|----------|
| PostgreSQL migration | > 100 concurrent users | None currently | Low |
| SSE → Redis pub/sub | Events lost on restart | Acceptable for beta | Low |
| Platform Layer implementation | API leak accumulation | Medium (growing) | Medium (M3-4) |

---

## 9. Business Debt Review

[Долги, связанные с бизнесом: legal, compliance, processes.]

| Business Debt | Severity | Action | Deadline |
|--------------|----------|--------|----------|
| No Terms of Service | High (legal risk) | Draft and publish | Gate 1 |
| No Privacy Policy | High (GDPR risk) | Draft and publish | Gate 1 |
| No SOC 2 | Low (not needed yet) | Start at Gate 5 | M9+ |
| No pricing page | Medium (conversion blocker) | Add to landing | Gate 1 |

---

## 10. Experiment Retrospective

[Обзор всех экспериментов за месяц. Каждый эксперимент: гипотеза → результат → решение → влияние на roadmap.]

### Completed Experiments

| ID | Hypothesis | Duration | Result | Decision | Roadmap Impact |
|----|-----------|----------|--------|----------|----------------|
| EXP-XXX | | weeks | Confirmed/Invalidated | [what changed] | [added/removed/reprioritized] |

### Running Experiments

| ID | Hypothesis | Started | Expected End | Preliminary Results |
|----|-----------|---------|-------------|-------------------|
| EXP-XXX | | | | |

### Planned Experiments (Next Month)

| ID | Hypothesis | Priority | Expected Duration |
|----|-----------|----------|-------------------|
| | | | |

---

## 11. Roadmap Update

### 11.1 Completed This Month

| Initiative | Status | Metric Impact |
|-----------|--------|---------------|
| | Done / Partially Done | [metric: +X%] |

### 11.2 In Progress

| Initiative | Progress | Blocker | Expected Completion |
|-----------|----------|---------|-------------------|
| | % | [if any] | |

### 11.3 Prioritized for Next Month

| Initiative | Priority | Expected Impact | Effort |
|-----------|----------|----------------|--------|
| | P0/P1/P2 | [metric: +X%] | [days] |

### 11.4 Roadmap Changes

[Что изменилось в roadmap по сравнению с прошлым месяцом и почему. Ссылки на DECISION_LOG.]

---

## 12. Decisions Log

[Ключевые решения за месяц. Формат: упрощённый template из DECISION_MANAGEMENT_FRAMEWORK.]

| Date | Decision | Type | Rationale | Expected Impact | Success Metric |
|------|----------|------|-----------|----------------|----------------|
| | | ADR/BDR/PDR/SDR | [why] | [on what metric] | [how measured] |

---

## 13. Next Month Priorities (Top 5)

| # | Priority | Action | Expected Metric Impact | Effort |
|---|----------|--------|----------------------|--------|
| 1 | P0 | | | |
| 2 | P0 | | | |
| 3 | P1 | | | |
| 4 | P1 | | | |
| 5 | P2 | | | |

---

## Filing Convention

- Файлы: `reviews/monthly-YYYY-MM.md`
- Retention: все месячные reviews хранятся бессрочно
- Доступ: Founder + advisors + investors (по запросу)
