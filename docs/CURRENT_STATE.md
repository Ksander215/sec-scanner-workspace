# CURRENT_STATE.md — Живая сводка проекта

> Обновляется после каждого завершённого INT-этапа.  
> Последнее обновление: INT-037, 2026-07-21

---

## Общая готовность

| Модуль | Готовность | Статус | Примечание |
|--------|-----------|--------|------------|
| Frontend (Landing) | 95% | ✅ Production | 66 страниц, статический экспорт |
| Frontend (App) | 90% | ✅ Production | Dashboard, Scanner, Reports, Marketplace, KG, Attack Paths |
| AIS | 85% | ✅ Production | 5 модулей, 3 вкладки, уведомления. Нет Settings и History |
| Backend API | 40% | ⚠️ Dev only | Express сервер, не подключён к production |
| Plugin Runtime | 30% | ⚠️ Dev only | 6 плагинов, нет реального выполнения |
| Auth | 0% | ❌ Не начат | Нет системы аутентификации |
| Database | 0% | ❌ Не начат | Backend использует File Store |
| CI/CD | 0% | ❌ Не начат | Деплой вручную через SSH |
| E2E Tests | 5% | ❌ Почти нет | Только ручное тестирование через browser |
| Mobile | 60% | ⚠️ Адаптивный | Responsive, но не mobile-first |

---

## Frontend — Детали

### Страницы (66 штук)

**Основные (production-ready)**:
- `/` — Landing page
- `/app/dashboard` — Executive Dashboard с AIS-профилированием
- `/app/scanner` — Запуск сканирования
- `/app/reports` — Отчёты с Executive Summary
- `/app/marketplace` — Центр решений (7 подкатегорий)
- `/app/settings` — Настройки
- `/app/notifications` — Уведомления

**Демонстрационные (с demo-данными)**:
- `/app/demo/knowledge-graph` — Интерактивный граф инфраструктуры
- `/app/demo/attack-paths` — Визуализация путей атак

**Информационные**:
- `/app/docs/*` — 12 страниц документации
- `/app/community/*` — 4 страницы сообщества
- `/app/legal/*` — 3 юридические страницы
- `/app/pricing` — Тарифы

### Компоненты

- **33 UI компонента** в `landing/src/components/ui/`
- **15 layout компонентов** в `landing/src/components/layout/`
- **16 landing sections** в `landing/src/components/sections/`

### Ключевые UI-компоненты

| Компонент | Назначение |
|-----------|-----------|
| AISAssistant | Плавающая кнопка + боковая панель AIS |
| SoloNotification | Уведомления в стиле Solo Leveling |
| PersonalGoalCard | Персональная цель с прогрессом |
| AIExecutiveSummary | AI-сводка после сканирования |
| ConfidenceScore | Оценка уверенности платформы |
| BusinessResult | Результат анализа на языке бизнеса |
| ExecutiveSummary | Сводка для руководителей |
| WhatChanged | Что изменилось |
| WhyImportant | Почему это важно |
| CompanyProgress | Прогресс компании |
| DemoBadge | Пометка demo-данных |
| TermTooltip | Объяснение технических терминов |
| SmartScrollNavigator | Интеллектуальная навигация по странице |
| SmartNextStep | Умная подсказка следующего шага |
| ContextualHelp | Контекстная помощь |
| GuideAssistant | (Устарел) Заменён на AISAssistant |

---

## AIS — Adaptive Intelligence System

### Модули

| Модуль | Файл | Назначение |
|--------|------|-----------|
| Memory | `ais/memory.ts` | Профиль поведения, localStorage, отслеживание сессий |
| Sound | `ais/sound.ts` | Звуковая идентичность, Web Audio API, 6 типов звуков |
| Confidence | `ais/confidence.ts` | Оценка уверенности 0-100, 5 уровней, факторы |
| Context Predictor | `ais/context-predictor.ts` | 7 правил предсказания намерений |
| Integration Hook | `useAIS.ts` | React hook, объединяющий все подсистемы |

### Интерфейс

- **AISAssistant**: Плавающая кнопка (✨ sparkles) → боковая панель
  - Вкладка «Навигация» — контекстные подсказки по текущей странице
  - Вкладка «Цель» — персональная цель с прогрессом
  - Вкладка «Уверенность» — оценка уверенности + Trust Builder
- **SoloNotification**: Уведомления с анимацией (6 типов, адаптивное время жизни)
- **Dashboard**: Бейдж профиля («Определяем ваш профиль...»)

### Что НЕ готово в AIS

- Настройки AIS в /app/settings (Block 8 из INT-036)
- История советов (Block 9 из INT-036)
- Звуковые уведомления не подключены к UI (движок готов)
- Персистентность профиля на сервере (только localStorage)

---

## Backend

### Структура

```
backend/src/
├── index.ts          # Express сервер
├── routes/           # 4 модуля маршрутов
│   ├── analysis.ts   # /api/analysis/*
│   ├── scanner.ts    # /api/scans/*
│   ├── plugins.ts    # /api/plugins/*
│   └── projects.ts   # /api/projects/*
└── services/         # 6 сервисов
    ├── scanner.ts    # Оркестрация сканирования + SSE
    ├── knowledge-graph.ts  # Автопостроение KG
    ├── attack-paths.ts     # Генерация путей атак
    ├── recommendations.ts  # AI-рекомендации
    ├── reports.ts          # Генерация отчётов
    └── store.ts            # File-based хранилище
```

### Проблемы

- Backend не работает в production (только статический фронтенд)
- Нет базы данных — используется File Store
- Нет аутентификации
- Нет WebSocket для real-time обновлений
- API proxy настроен в nginx на порт 3005, но сервис не запущен

---

## Production

| Параметр | Значение |
|----------|---------|
| URL | https://sec-scanner.pro |
| IP | 85.239.38.163 |
| SSH порт | 22222 |
| Web root | /var/www/sec-scanner.pro |
| Build source | /var/www/sec-scanner-build |
| Nginx | Настроен, SSL (Let's Encrypt) |
| Backend | Не запущен |
| Analytics | Umami на analytics.sec-scanner.pro |
| API Proxy | Настроен → :3005 (не запущен) |

---

## Технический долг

1. **GuideAssistant** — устаревший компонент, заменён на AISAssistant, но код ещё существует
2. **Demo данные** — все данные на фронтенде mock, нет реального API
3. **i18n** — 2676 ключей, но часть может быть не использована
4. **TypeScript strictness** — не все файлы используют strict mode
5. **Tests** — нет автоматических тестов
6. **CSS** — часть стилей дублируется между компонентами
7. **Error boundaries** — нет обработки ошибок рендеринга
8. **SEO** — мета-теги заданы, но нет sitemap.xml и robots.txt
9. **Performance** — нет ленивой загрузки для тяжёлых компонентов (KG, Attack Paths)
10. **Accessibility** — нет полноценного a11y аудита

---

## Риски

| Риск | Вероятность | Влияние | Статус |
|------|------------|---------|--------|
| Backend не готов к production | Высокая | Высокое | Не начат |
| Нет аутентификации | Высокая | Критическое | Не начат |
| Demo данные воспринимаются как реальные | Средняя | Высокое | Частично решено (DemoBadge) |
| Потеря контекста между сессиями AI | Высокая | Среднее | Решается INT-037 |
| Кэш браузера после деплоя | Средняя | Низкое | Требует Ctrl+Shift+R |

---

## Метрики проекта

| Метрика | Значение |
|---------|---------|
| Страниц | 66 |
| UI компонентов | 33 |
| Layout компонентов | 15 |
| Библиотек | 24 |
| i18n ключей | 2676 × 2 (RU + EN) |
| Scanner плагинов | 6 |
| Backend маршрутов | 4 модуля |
| Backend сервисов | 6 |
| Documentation файлов | 28 + 14 новых (INT-037) |
| Скриптов | 43 |
| Строк кода (frontend) | ~35,000+ |
