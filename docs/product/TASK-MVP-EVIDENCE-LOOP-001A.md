# TASK-MVP-EVIDENCE-LOOP-001A — Evidence Core Integration Specification

**Статус:** PASS (создание спецификации для архива)
**Тип:** Engineering / Architecture Core Integration
**Приоритет:** P0
**Дата:** 2026-08-26

> Полная спецификация передана пользователем в чате и сохранена здесь для архива.
> Реализация: `src/core/evidence-loop/`

## Что реализовано

Создан новый модуль `src/core/evidence-loop/` с 5 файлами:

| Файл | Назначение |
|---|---|
| `types.ts` | Все типы: Claim, QualityFinding, Intent, Response, EvidenceFeedback, enums, SessionTrace |
| `errors.ts` | 8 кастомных ошибок (SessionNotFound, LinkageError, ImmutableEvidenceError, SourceTypeMismatchError) |
| `secret-sanitizer.ts` | Санитизация секретов (API keys, PAT, Bearer tokens, AWS keys, Slack tokens) |
| `evidence-loop-service.ts` | Главный оркестратор: 8 операций, инварианты I-01..I-13 |
| `index.ts` | Public API |

## Тесты

41 тестов, все проходят:
- §37: Unit tests (Session, Intent, Response, Claim, Evidence, Feedback, Finding)
- §38: Happy-path integration test (полный trace)
- §39: Negative tests (6 сценариев)
- §35: Security tests (5 сценариев — API keys, Bearer, AWS, GitHub PAT, excerpts)
- I-07: Source type separation (3 теста)
- I-08: Immutability (2 теста)

## Регрессия

43 существующих теста (session, evidence, wave1) — все проходят.

## Invariants

I-01..I-13 enforced. No existing code modified. No UI. No commercial infra.