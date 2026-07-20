# SIP — Architecture

## Обзор системы

SIP построен как модульная платформа с чётким разделением ответственности между слоями. Каждый компонент независим и заменяем, что позволяет развивать систему без нарушения существующего функционала.

## Высокоуровневая архитектура

```
                    ┌──────────────────┐
                    │    Nginx         │
                    │  (Reverse Proxy) │
                    │  :443/:80        │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐          ┌───────▼───────┐
         │  Frontend    │          │   Backend     │
         │  (Static)    │          │  (Express)    │
         │  /var/www/   │          │  :3001        │
         └──────────────┘          └───────┬───────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                     ┌────────▼────────┐       ┌────────▼────────┐
                     │  Plugin Runtime  │       │  File Store     │
                     │  (nmap, nuclei,  │       │  /var/lib/sip/  │
                     │   zap, etc.)     │       │                 │
                     └─────────────────┘       └─────────────────┘
```

## Компоненты

### Frontend (landing/)

Next.js 16 статический экспорт. Все страницы предрендерены в HTML, клиентская навигация через React.

- **Лендинг** — маркетинговые страницы, тарифы, документация
- **Дашборд** — Executive Dashboard с метриками безопасности
- **Сканер** — пошаговый мастер настройки и запуска сканирования
- **Marketplace** — каталог плагинов, дашбордов, шаблонов
- **Отчёты** — генерация отчётов в 6 форматах
- **Knowledge Graph** — визуализация связей между уязвимостями
- **Attack Paths** — цепочки атак по MITRE ATT&CK

### Backend (backend/)

Express.js сервер на TypeScript. Обрабатывает API-запросы, управляет плагинами, хранит данные.

- **API Server** — REST API для всех операций платформы
- **Plugin Runtime** — универсальная среда запуска security-инструментов
- **Scanner Service** — оркестрация конвейера сканирования с SSE-стримингом
- **Knowledge Graph Service** — автоматическое построение графа из результатов
- **Attack Path Service** — генерация цепочек атак с привязкой к MITRE
- **Recommendations Service** — ИИ-рекомендации по устранению уязвимостей
- **Reports Service** — экспорт в PDF, HTML, Markdown, JSON, CSV, SARIF

### Plugin System (plugins/)

Каждый плагин — независимый модуль с манифестом, иконкой и парсером результатов.

- **manifest.json** — метаданные, параметры, версии
- **Парсер** — преобразует выход инструмента в унифицированный формат Findings
- **Runtime** — плагины запускаются через Plugin Runtime с изоляцией

### Shared Packages (packages/)

- **types** — общие TypeScript-типы для frontend и backend
- **sdk** — JavaScript SDK для интеграции с SIP API
- **ui** — общие UI-компоненты
- **shared** — утилиты, константы, хелперы

## Маршрутизация API

```
POST   /api/scans/start          # Запуск сканирования
GET    /api/scans/:id/status     # Статус сканирования (SSE)
GET    /api/scans/:id/results    # Результаты сканирования

GET    /api/plugins              # Список плагинов
POST   /api/plugins/:name/install    # Установка плагина
DELETE /api/plugins/:name/remove     # Удаление плагина
GET    /api/plugins/:name/verify     # Проверка плагина

GET    /api/projects             # Список проектов
POST   /api/projects             # Создание проекта
GET    /api/projects/:id         # Данные проекта

GET    /api/analysis/kg          # Knowledge Graph
GET    /api/analysis/attack-paths # Пути атак
GET    /api/analysis/recommendations # Рекомендации
POST   /api/analysis/reports     # Генерация отчёта

GET    /api/health               # Проверка здоровья
```

## Хранение данных

- **File Store** — `/var/lib/sip/` — данные проектов, результатов, конфигурации
- **Static Export** — `/var/www/sec-scanner.pro/` — собранный frontend
- **Nginx** — раздаёт статику и проксирует API к backend

## Безопасность

- Все API-запросы проходят через Nginx с HTTPS (Let's Encrypt)
- Backend слушает только на localhost (3001)
- Секреты хранятся в `.env`, не коммитятся
- Plugin Runtime изолирует выполнение инструментов
