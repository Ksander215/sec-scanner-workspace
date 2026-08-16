# Evidence Classification Alignment Note

**Task:** TASK-PRODUCT-VALIDATION-EXECUTION-001
**Purpose:** Resolve classification difference between Task Specification and Execution Specification

---

## The Difference

The Task Specification (EXECUTION-001) and the Execution Specification (VALIDATION-002) define Evidence Levels E0-E4 with **different names and definitions** for the same level.

| Level | Task Spec (EXECUTION-001) | Execution Spec (VALIDATION-002) |
|-------|---------------------------|-------------------------------|
| E0 | **Claim** — Только утверждение пользователя | **Assumption** — Нет реальных пользовательских данных |
| E1 | **Observed** — Наблюдаемое поведение | **Indication** — Косвенные сигналы или единичные наблюдения |
| E2 | **Repeated** — Повторяемый паттерн у нескольких пользователей/задач | **Observed Evidence** — Реальное поведение 3+ пользователей в контролируемых условиях |
| E3 | **Comparative** — AIS продемонстрировал преимущество относительно baseline | **Repeated Evidence** — Воспроизводится на разных пользователях/сценариях (5+) |
| E4 | **Behavioral / Commercial** — Пользователь изменил workflow, вернулся, WTP | **Strong Validation** — Устойчивое evidence, 10+ пользователей, измеримый эффект |

## Resolution

**For Wave 1 execution, use the Execution Specification (VALIDATION-002) definitions.**

Rationale:

1. Execution Specification (VALIDATION-002) is the authoritative protocol document, explicitly designed to define **how** validation is conducted.
2. Task Specification (EXECUTION-001) is the task brief that references Execution Specification as a required input.
3. Execution Specification definitions are more precise and include explicit transition rules (§5) and independence rules (§6) that the Task Specification lacks.
4. Evidence Ledger Template in this package uses Execution Specification definitions.

## Practical Impact

| Situation | Execution Spec Classification | Task Spec Classification |
|-----------|---------------------------|-----------------------|
| User says «this is useful» | E0 (Assumption) | E0 (Claim) |
| User changes decision based on AIS (single session) | E1 (Indication) | E1 (Observed) |
| 3+ users show same pattern | E2 (Observed Evidence) | E2 (Repeated) |
| AIS outperforms baseline for 5+ users | E3 (Repeated Evidence) | E3 (Comparative) |
| User returns after 7 days | E3 (Repeated Evidence) | E4 (Behavioral) |
| 10+ users, 4+ weeks, measurable effect | E4 (Strong Validation) | E4 (Behavioral/Commercial) |

The difference in naming does not change the practical classification for Wave 1, where the maximum achievable evidence level is E1-E2 (single wave, 5-8 users, no longitudinal data).

## When This Matters

The difference becomes significant at:
- **E3 level:** Task Spec classifies "AIS > baseline" as E3, while Execution Spec requires 5+ users and 3+ scenarios for E3. Execution Spec is more conservative — use it.
- **E4 level:** Task Spec includes WTP as E4, while Execution Spec requires 10+ users and 4+ weeks. Again, Execution Spec is more conservative.

**Conclusion:** Execution Specification definitions are authoritative for classification. If a future report must reference both, note the mapping above.