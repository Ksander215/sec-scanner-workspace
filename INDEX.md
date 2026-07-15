# Index — Security Intelligence Platform

> Полный перечень документов рабочего пространства.

## Governance

| # | Документ | Путь | Описание |
|---|----------|------|----------|
| 1 | PROJECT_HANDOFF | `docs/00_governance/PROJECT_HANDOFF.md` | Полный документ передачи контекста проекта |
| 2 | AI_CONTEXT | `docs/00_governance/AI_CONTEXT.md` | Быстрый контекст для AI-агента |
| 3 | ENGINEERING_MEMORY | `docs/00_governance/ENGINEERING_MEMORY.md` | Инженерная память: решения, соглашения |
| 4 | CTO_DECISIONS | `docs/00_governance/CTO_DECISIONS.md` | Реестр ключевых решений CTO |
| 5 | VISION | `docs/00_governance/VISION.md` | Стратегическое видение продукта |

## Assets

| # | Файл | Путь | Формат |
|---|------|------|--------|
| 6 | PROJECT_HANDOFF (PDF) | `docs/assets/pdf/PROJECT_HANDOFF.pdf` | PDF |
| 7 | PROJECT_HANDOFF (HTML) | `docs/assets/html/PROJECT_HANDOFF.html` | HTML |

## Diagrams

| # | Диаграмма | Путь | Описание |
|---|-----------|------|----------|
| 8 | Platform Architecture | `docs/diagrams/handoff_platform_architecture.svg` | Архитектура платформы (4 слоя) |
| 9 | Intelligence Engine | `docs/diagrams/intelligence_engine.svg` | SIE: 6 компонентов + I/O |
| 10 | Roadmap | `docs/diagrams/roadmap.svg` | Дорожная карта проекта |

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
  ├── docs/assets/
  │     ├── pdf/PROJECT_HANDOFF.pdf
  │     └── html/PROJECT_HANDOFF.html
  └── docs/diagrams/
        ├── handoff_platform_architecture.svg
        ├── intelligence_engine.svg
        └── roadmap.svg
```
