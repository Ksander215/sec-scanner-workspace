# Engineering Memory — Security Intelligence Platform

> Инженерная память проекта: накопленные решения, известные проблемы, соглашения и уроки.

## Стек технологий

| Слой | Технология | Примечание |
|------|-----------|------------|
| Язык | Python 3.12+ | Основной язык платформы |
| Доменные модели | Pydantic v2 | Валидация и сериализация |
| События | Artifact Bus (asyncio) | Внутренняя событийная шина |
| Plugin API | Абстрактные классы + Registry | Каждый движок — plugin |
| Граф знаний | NetworkX (текущий) → Neo4j (planned) | KG-001 в процессе |
| Тестирование | pytest + coverage | Покрытие >= 90% |
| CI/CD | GitHub Actions | Автоматические проверки |

## Выполненные EPIC и TASK

### EPIC-01: Discovery & Scanning Foundation (DONE)
- Реализован Discovery Engine с Plugin API
- Подключены Nuclei, Browser Intelligence, HTTP Intelligence
- Настроен Artifact Bus для событийного обмена
- Attack Surface Model формирует структуру приложения

### TASK-201: Attack Surface Model (DONE)
- Модель представления поверхности атаки
- Endpoint, Parameter, Header, Cookie модели
- Связи между элементами через граф

### TASK-202A-F: Intelligence Modules (DONE)
- 202A: Nuclei Plugin — интеграция сканера
- 202B: Browser Intelligence Plugin — анализ через браузер
- 202C: HTTP Intelligence Plugin — HTTP-level анализ
- 202D: Result Normalizer — нормализация результатов
- 202E: Artifact Bus — событийная шина
- 202F: Pipeline Orchestrator — оркестрация конвейера

## Известные проблемы и решения

### Проблема: Нормализация данных из разных источников
**Решение:** Result Normalizer приводит все находки к единому формату через абстрактный интерфейс `FindingPort`. Каждый plugin реализует свой адаптер.

### Проблема: Слабая связность между компонентами
**Решение:** Event Driven архитектура через Artifact Bus. Компоненты публикуют события, подписчики обрабатывают асинхронно.

### Проблема: Тестируемость доменной логики
**Решение:** Clean Architecture с инверсией зависимостей. Бизнес-логика в `core/domain/`, инфраструктура подключается через порты.

## Соглашения по коду

- Все доменные модели — Pydantic BaseModel с `frozen=True` (неизменяемость)
- Все интерфейсы — абстрактные классы с `abc.ABC`
- Именование: `snake_case` для файлов и функций, `PascalCase` для классов
- События именуются `<Сущность><Действие>Event` (например, `ScanCompletedEvent`)
- Тесты рядом с кодом: `tests/` дублирует структуру `src/`
- Docstrings на английском, комментарии могут быть на русском

## ADR (Architecture Decision Records)

При каждом значимом архитектурном решении создаётся ADR по шаблону:

- **ADR-SIE-001**: Rule Engine — декларативные правила над графом
- **ADR-SIE-002**: Correlation Engine — графовый обход для связей
- **ADR-SIE-003**: Attack Path Builder — DFS/BFS с ограничением глубины
- **ADR-SIE-004**: Risk Aggregator — взвешенная сумма с confidence
- **ADR-SIE-005**: Confidence Calculator — Multi-factor credibility scoring
- **ADR-SIE-006**: Recommendation Engine — шаблонный генератор рекомендаций
