# ARCHITECTURE.md — Архитектура проекта

---

## Общая архитектура

```
┌──────────────────────────────────────────────────┐
│                    Nginx                          │
│              (SSL, Static, Proxy)                 │
├──────────────────────┬───────────────────────────┤
│                      │                            │
│   Frontend (Static)  │    Backend (Express)       │
│   Next.js 16 Export  │    Port :3005              │
│   /var/www/.../      │    (не запущен в prod)     │
│                      │                            │
│   Landing + App      │    API Routes:             │
│   66 страниц         │    /api/scans/*            │
│   RU + EN i18n       │    /api/analysis/*         │
│   Dark/Light theme   │    /api/plugins/*          │
│                      │    /api/projects/*         │
│                      │                            │
│                      │    Services:               │
│                      │    Scanner, KG, Attack     │
│                      │    Paths, Recommendations, │
│                      │    Reports, Store          │
└──────────────────────┴───────────────────────────┘
```

---

## Frontend

### Технологии
| Технология | Версия | Назначение |
|-----------|--------|-----------|
| Next.js | 16.2.10 | React фреймворк, static export |
| React | 19.2.4 | UI библиотека |
| TypeScript | 5.x | Типизация |
| Tailwind CSS | 4.x | Стили |
| Framer Motion | 12.x | Анимации |
| @xyflow/react | 12.x | Knowledge Graph визуализация |
| Recharts | 3.9.x | Графики и диаграммы |
| Lucide React | 1.24.x | Иконки |
| next-themes | 0.4.x | Тёмная/светлая тема |

### Структура директорий

```
landing/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (ThemeProvider, i18n)
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles
│   └── (app)/              # App group
│       ├── layout.tsx      # App layout (Sidebar, TopBar, AIS)
│       └── app/            # 60+ страниц приложения
│           ├── dashboard/
│           ├── scanner/
│           ├── reports/
│           ├── marketplace/
│           ├── settings/
│           └── ...
├── components/
│   ├── ui/                 # 33 UI компонента
│   ├── layout/             # 15 layout компонентов
│   └── sections/           # 16 landing sections
├── lib/
│   ├── ais/                # AIS engine (5 модулей)
│   ├── engine/             # Business engine (11 модулей)
│   ├── i18n.ts             # Internationalization (2676 keys)
│   ├── i18n-context.tsx    # i18n React context
│   ├── api-client.ts       # API client
│   ├── demo-data.ts        # Demo data
│   └── utils.ts            # Utilities
└── hooks/
    └── useAIS.ts           # AIS React hook
```

### Статический экспорт
- `next.config.ts`: `output: "export"`
- Все 66 страниц пререндерены в HTML
- Нет серверного рендеринга в runtime
- Деплой через копирование `out/` в web root

---

## Backend

### Технологии
| Технология | Версия | Назначение |
|-----------|--------|-----------|
| Express | 4.21.x | HTTP сервер |
| TypeScript | 5.x | Типизация |
| cors | 2.8.x | CORS middleware |
| multer | 1.4.x | File upload |
| uuid | 10.x | ID генерация |

### Структура

```
backend/src/
├── index.ts                # Express сервер (:3001)
├── types.ts                # TypeScript типы
├── plugins/
│   ├── runtime.ts          # Plugin execution runtime
│   └── manifests.ts        # Plugin manifest loader
├── parsers/
│   └── index.ts            # Output format parsers
├── routes/
│   ├── analysis.ts         # /api/analysis/*
│   ├── scanner.ts          # /api/scans/*
│   ├── plugins.ts          # /api/plugins/*
│   └── projects.ts         # /api/projects/*
└── services/
    ├── scanner.ts          # Scan orchestration + SSE
    ├── knowledge-graph.ts  # KG auto-construction
    ├── attack-paths.ts     # Attack path generation
    ├── recommendations.ts  # AI recommendations
    ├── reports.ts          # Report generation (6 formats)
    └── store.ts            # File-based data store
```

### API Endpoints

| Метод | Путь | Назначение |
|-------|------|-----------|
| POST | /api/scans | Запуск сканирования |
| GET | /api/scans/:id | Статус сканирования (SSE) |
| GET | /api/scans/:id/results | Результаты сканирования |
| GET | /api/plugins | Список плагинов |
| GET | /api/plugins/:id | Манифест плагина |
| POST | /api/analysis/knowledge-graph | Построение KG |
| GET | /api/analysis/knowledge-graph/:id | Получить KG |
| POST | /api/analysis/attack-paths | Генерация путей атак |
| GET | /api/analysis/attack-paths/:id | Получить пути атак |
| POST | /api/analysis/recommendations | AI рекомендации |
| POST | /api/analysis/reports | Генерация отчёта |
| GET | /api/projects | Список проектов |
| POST | /api/projects | Создать проект |
| GET | /api/projects/:id | Получить проект |

### Хранилище
- File Store: `/var/lib/sip/`
- JSON файлы для данных
- Нет базы данных (пока)

---

## Plugin System

### 6 плагинов

| Плагин | Тип | Назначение |
|--------|-----|-----------|
| nmap | scanner | Сетевое сканирование портов |
| nuclei | scanner | Vulnerability scanner |
| ZAP | scanner | Web app scanner |
| semgrep | scanner | Static code analysis |
| trivy | scanner | Container scanner |
| nikto | scanner | Web server scanner |

### Структура манифеста
```json
{
  "id": "nmap",
  "name": "Nmap",
  "type": "scanner",
  "version": "1.0.0",
  "description": "Network port scanner",
  "capabilities": ["port-scan", "service-detection", "os-fingerprinting"],
  "input": { "target": "string", "ports": "string?" },
  "output": { "format": "json" }
}
```

---

## Shared Packages

```
packages/
├── types/     # Общие TypeScript типы
├── sdk/       # SIP SDK
├── ui/        # Общие UI компоненты
└── shared/    # Общие утилиты
```

---

## Infrastructure

### Production

| Компонент | Конфигурация |
|-----------|-------------|
| Сервер | 85.239.38.163:22222 (SSH) |
| Web Root | /var/www/sec-scanner.pro |
| Build Source | /var/www/sec-scanner-build |
| Nginx | SSL (Let's Encrypt), static files, API proxy |
| API Proxy | /api/* → :3005 (не запущен) |
| Analytics | Umami на analytics.sec-scanner.pro |

### Nginx конфигурация
- HTTP → HTTPS redirect
- Static files: `try_files $uri $uri.html $uri/index.html /index.html`
- API proxy: `/api/*` → `http://127.0.0.1:3005`
- Security headers: CSP, HSTS, X-Frame-Options, etc.

---

## Data Flow

### Сканирование (будущее)
```
User → Scanner UI → API /api/scans
  → Scanner Service → Plugin Runtime
    → nmap / nuclei / ZAP / etc.
  → Results → Parser
  → KG Builder → Attack Path Gen → Recommendations
  → Report Generator
  → SSE stream → UI update
```

### AIS (текущее)
```
User visits page → Context Predictor
  → Prediction based on page + profile
  → AISAssistant shows contextual tip
  → User interacts → Memory Engine updates profile
  → Confidence Engine recalculates
  → SoloNotification triggers (if event)
```
