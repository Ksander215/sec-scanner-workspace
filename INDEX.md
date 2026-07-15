# Index — Security Intelligence Platform

> Полный перечень документов рабочего пространства.

**Навигация:** [README.md](./README.md) | [CHANGELOG.md](./CHANGELOG.md)

## Governance

| # | Документ | Путь | Описание |
|---|----------|------|----------|
| 1 | PROJECT_HANDOFF | `docs/00_governance/PROJECT_HANDOFF.md` | Полный документ передачи контекста проекта |
| 2 | AI_CONTEXT | `docs/00_governance/AI_CONTEXT.md` | Быстрый контекст для AI-агента |
| 3 | ENGINEERING_MEMORY | `docs/00_governance/ENGINEERING_MEMORY.md` | Инженерная память: решения, соглашения |
| 4 | CTO_DECISIONS | `docs/00_governance/CTO_DECISIONS.md` | Реестр ключевых решений CTO |
| 5 | VISION | `docs/00_governance/VISION.md` | Стратегическое видение продукта |

## Architecture

| # | Документ | Путь | Описание |
|---|----------|------|----------|
| 6 | RFC-001 | `docs/01_architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md` | Архитектура Security Intelligence Engine |
| 7 | RFC Review Report | `docs/01_architecture/RFC_REVIEW_REPORT.md` | Отчёт о 4-ролевом архитектурном ревью SIE |
| 8 | KG-001 | `docs/01_architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md` | Архитектура Knowledge Graph Platform |
| 9 | KG Review Report | `docs/01_architecture/KG_ARCHITECTURE_REVIEW_REPORT.md` | Отчёт о 5-ролевом архитектурном ревью KG |

## Assets

| # | Файл | Путь | Формат |
|---|------|------|--------|
| 10 | PROJECT_HANDOFF (PDF) | `docs/assets/pdf/PROJECT_HANDOFF.pdf` | PDF |
| 11 | PROJECT_HANDOFF (HTML) | `docs/assets/html/PROJECT_HANDOFF.html` | HTML |

## Diagrams

| # | Диаграмма | Путь | Описание |
|---|-----------|------|----------|
| 12 | Platform Architecture | `docs/diagrams/handoff_platform_architecture.svg` | Архитектура платформы (4 слоя) |
| 13 | Intelligence Engine | `docs/diagrams/intelligence_engine.svg` | SIE: 6 компонентов + I/O |
| 14 | Roadmap | `docs/diagrams/roadmap.svg` | Дорожная карта проекта |

## Cross-references

- `README.md` → указывает на все governance-документы
- `INDEX.md` → данный файл
- `CHANGELOG.md` → история изменений

## Связи между документами

```
README.md
  ├── docs/00_governance/
  │     ├── PROJECT_HANDOFF.md  ← основной документ
  │     ├── AI_CONTEXT.md       ← краткая выжимка
  │     ├── ENGINEERING_MEMORY  ← техническая память
  │     ├── CTO_DECISIONS.md    ← стратегические решения
  │     └── VISION.md           ← видение продукта
  ├── docs/01_architecture/
  │     ├── RFC-001_SECURITY_INTELLIGENCE_ENGINE.md  ← архитектура SIE
  │     ├── RFC_REVIEW_REPORT.md                     ← отчёт ревью SIE
  │     ├── KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md   ← архитектура KG
  │     └── KG_ARCHITECTURE_REVIEW_REPORT.md         ← отчёт ревью KG
  ├── docs/assets/
  │     ├── pdf/PROJECT_HANDOFF.pdf
  │     └── html/PROJECT_HANDOFF.html
  └── docs/diagrams/
        ├── handoff_platform_architecture.svg
        ├── intelligence_engine.svg
        └── roadmap.svg
```
