# ROADMAP.md — Дорожная карта

> Последнее обновление: 2026-07-21 (INT-037)

---

## Выполненные задачи

### INT-030: Repository Integrity Audit ✅
- Полный аудит репозитория
- README переработан
- .gitignore актуализирован
- Workflows удалены из git tracking

### INT-031: Business Trust & Guided Experience ✅
- BusinessResult — результат на языке бизнеса
- ExecutiveSummary — сводка для руководителей
- WhatChanged — что изменилось
- WhyImportant — почему это важно
- CompanyProgress — прогресс компании
- DemoBadge — пометка demo-данных
- 150+ i18n ключей

### INT-032: Self-Explaining Platform ✅
- TermTooltip — объяснение технических терминов
- ContextualHelp — контекстная помощь
- SmartNextStep — подсказка следующего шага
- Кнопки «Что это?» для метрик
- Кнопки «Помощь» на страницах

### INT-033: Smart Scroll Navigation ✅
- SmartScrollNavigator — навигация по секциям
- Прогресс-бар чтения
- Индикаторы секций

### INT-034: Transform Marketplace into Solutions Center ✅
- Marketplace → Центр решений
- 7 категорий (Plugins, Connectors, Templates, Dashboards, Integrations, Rules, AI Prompts)
- Переработанные карточки инструментов
- Фильтрация и поиск

### INT-035: Confidence-Driven UX ✅
- ConfidenceScore — оценка уверенности (0-100)
- 5 уровней уверенности
- Нарратив по ролям
- Факторы влияния

### INT-036: Adaptive Intelligence System (AIS) ✅
- Memory Engine — профиль поведения
- Sound Engine — звуковая идентичность (Web Audio API)
- Confidence Engine — оценка уверенности
- Context Predictor — предсказание намерений (7 правил)
- AISAssistant — плавающая кнопка + панель (3 вкладки)
- SoloNotification — уведомления Solo Leveling
- PersonalGoalCard — цели с прогрессом
- AIExecutiveSummary — AI-сводка
- 150+ i18n ключей
- Задеплоено на production

### INT-037: Project Knowledge Base & Handoff 🔄
- 14 документов в /docs/
- HANDOFF.md — точка входа
- README обновлён

---

## Следующие задачи

### Приоритет 1: Критическое

| Задача | Описание | Оценка |
|--------|----------|--------|
| Backend Production | Подключить Express backend к production | Большая |
| Authentication | Система аутентификации пользователей | Большая |
| Real Data | Замена demo-данных на реальные результаты сканирования | Большая |

### Приоритет 2: Важное

| Задача | Описание | Оценка |
|--------|----------|--------|
| INT-033.1 | Intelligent Page Navigator — доработка | Средняя |
| AIS Settings | Настройки поведения AIS в /app/settings | Средняя |
| AIS Sound UI | Подключение звуковых уведомлений к UI | Средняя |
| AIS History | История советов AIS | Средняя |
| AIS Server Persistence | Сохранение профиля на сервере | Средняя |

### Приоритет 3: Улучшения

| Задача | Описание | Оценка |
|--------|----------|--------|
| E2E Tests | Playwright тесты для критических путей | Средняя |
| CI/CD Pipeline | Автоматический деплой | Средняя |
| sitemap.xml + robots.txt | SEO оптимизация | Малая |
| Error Boundaries | Обработка ошибок рендеринга | Малая |
| Lazy Loading | Ленивая загрузка тяжёлых компонентов | Малая |
| Mobile-First | Оптимизация мобильного UX | Средняя |
| Remove GuideAssistant | Удалить устаревший компонент | Малая |
| a11y Audit | Полный аудит доступности | Средняя |

---

## Долгосрочная дорожная карта

### Q3 2026
- Backend в production
- Аутентификация и аккаунты
- Реальные данные сканирования
- AIS: полная интеграция с backend
- Командная работа (Teams)

### Q4 2026
- CI/CD автоматизация
- Compliance-отчёты (SOC 2, PCI DSS, ISO 27001)
- API Keys management
- Webhook интеграции
- Mobile app (PWA)

### 2027
- Auto-remediation
- AI Security Agent
- Threat Intelligence Exchange
- Quantum-ready криптография
- On-premise deployment
