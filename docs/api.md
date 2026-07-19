# Документация API SIP

## Общая информация

API платформы SIP построено на архитектурном стиле REST и следует принципам OpenAPI 3.0. Все эндпоинты доступны по базовому URL `https://api.sip-platform.dev/v1`. Ответы возвращаются в формате JSON с UTF-8 кодировкой. API поддерживает версионирование через префикс URL — текущая стабильная версия `v1`. Все запросы, требующие аутентификации, должны содержать заголовок `Authorization: Bearer <token>`. Лимит запросов — 100 запросов в минуту для стандартного тарифа и 1000 запросов в минуту для Enterprise. При превышении лимита возвращается статус `429 Too Many Requests` с заголовком `Retry-After`.

### Общие форматы ответов

Успешные ответы возвращаются с HTTP-статусом `2xx` и обёрнуты в структуру:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 142
  }
}
```

Ошибки возвращаются с соответствующим HTTP-статусом и структурой:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректный формат целевого хоста",
    "details": [
      { "field": "target", "issue": "must be valid hostname or IP" }
    ]
  }
}
```

---

## Аутентификация

### POST /auth/login

Аутентификация пользователя по email и паролю. Возвращает пару JWT-токенов (access + refresh).

**Запрос:**

```json
{
  "email": "analyst@company.com",
  "password": "S3cur3P@ss!"
}
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresIn": 3600,
    "user": {
      "id": "usr_01HXYZ",
      "email": "analyst@company.com",
      "role": "analyst",
      "locale": "ru"
    }
  }
}
```

### POST /auth/refresh

Обновление access-токена с использованием refresh-токена.

**Запрос:**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

---

## Проекты

### GET /projects

Возвращает список проектов пользователя с пагинацией и фильтрацией.

**Параметры запроса:**

| Параметр   | Тип     | Описание                              |
|------------|---------|----------------------------------------|
| `page`     | number  | Номер страницы (по умолчанию 1)       |
| `perPage`  | number  | Элементов на странице (по умолчанию 20)|
| `status`   | string  | Фильтр по статусу: `active`, `archived`|
| `search`   | string  | Полнотекстовый поиск по названию       |

**Пример ответа:**

```json
{
  "success": true,
  "data": [
    {
      "id": "prj_01ABCD",
      "name": "Production Infrastructure",
      "description": "Основная продакшн-инфраструктура",
      "status": "active",
      "assetsCount": 47,
      "lastScanAt": "2025-03-28T14:30:00Z",
      "criticalFindings": 3,
      "createdAt": "2025-01-10T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 5 }
}
```

### POST /projects

Создание нового проекта.

**Запрос:**

```json
{
  "name": "Staging Environment",
  "description": "Стеайдж-окружение для тестирования",
  "tags": ["staging", "internal"]
}
```

### GET /projects/:id

Получение детальной информации о проекте, включая агрегированную статистику по уязвимостям и последние результаты сканирования.

---

## Сканер

### POST /scans

Запуск нового сканирования. Поддерживаемые типы: `network` (Nmap), `web` (ZAP), `dependency` (Trivy), `container` (Trivy), `custom` (через плагин).

**Запрос:**

```json
{
  "projectId": "prj_01ABCD",
  "type": "network",
  "targets": ["192.168.1.0/24", "10.0.0.5"],
  "options": {
    "ports": "1-10000",
    "timing": "normal",
    "serviceDetection": true,
    "osDetection": true
  },
  "schedule": "immediate"
}
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "scanId": "scn_01XYZ",
    "status": "queued",
    "estimatedDuration": "PT15M",
    "position": 2
  }
}
```

### GET /scans/:id

Получение статуса сканирования и промежуточных результатов. Возвращает прогресс в процентах, количество обнаруженных находок на текущий момент и лог выполнения.

**Пример ответа:**

```json
{
  "success": true,
  "data": {
    "scanId": "scn_01XYZ",
    "status": "running",
    "progress": 67,
    "findingsSoFar": 23,
    "startedAt": "2025-03-28T14:30:00Z",
    "estimatedCompletion": "2025-03-28T14:45:00Z",
    "logs": [
      { "time": "14:30:05", "level": "info", "message": "Nmap scan initiated for 254 hosts" },
      { "time": "14:35:12", "level": "warn", "message": "Host 192.168.1.42: unexpected response on port 8080" }
    ]
  }
}
```

### GET /scans/:id/findings

Получение результатов завершённого сканирования с фильтрацией по критичности, типу и статусу исправления.

**Параметры запроса:**

| Параметр     | Тип    | Описание                                           |
|--------------|--------|-----------------------------------------------------|
| `severity`   | string | Фильтр: `critical`, `high`, `medium`, `low`, `info` |
| `status`     | string | Фильтр: `open`, `confirmed`, `false_positive`, `fixed` |
| `mitreTactic`| string | Фильтр по тактике MITRE ATT&CK                     |
| `sortBy`     | string | Сортировка: `cvss`, `discoveredAt`, `host`          |

---

## Граф знаний (Knowledge Graph)

### GET /projects/:id/knowledge-graph

Возвращает полный граф знаний проекта — узлы (активы, уязвимости, техники) и рёбра (связи между ними). Поддерживает параметр `depth` для ограничения глубины графа и `filter` для фильтрации по типу узла.

### GET /projects/:id/attack-paths

Возвращает смоделированные пути атак с оценкой совокупного риска. Каждый путь содержит последовательность шагов (техники MITRE ATT&CK), вероятность эксплуатации и потенциальный ущерб.

**Пример ответа:**

```json
{
  "success": true,
  "data": {
    "paths": [
      {
        "id": "ap_001",
        "name": "External → Web Server → Database",
        "riskScore": 9.2,
        "steps": [
          { "technique": "T1190", "name": "Exploit Public-Facing App", "asset": "web-prod-01", "cvss": 8.5 },
          { "technique": "T1078", "name": "Valid Accounts", "asset": "db-master-01", "cvss": 7.1 }
        ],
        "mitigationPriority": "critical"
      }
    ]
  }
}
```

---

## Отчёты

### POST /reports

Генерация отчёта по проекту. Поддерживаемые форматы: `pdf`, `docx`, `xlsx`, `json`, `csv`, `html`.

**Запрос:**

```json
{
  "projectId": "prj_01ABCD",
  "format": "pdf",
  "template": "executive-summary",
  "options": {
    "includeCharts": true,
    "includeRemediation": true,
    "dateRange": { "from": "2025-01-01", "to": "2025-03-31" },
    "language": "ru"
  }
}
```

### GET /reports/:id/download

Скачивание сгенерированного отчёта. Возвращает бинарный файл с соответствующим Content-Type.

---

## Плагины

### GET /plugins

Каталог доступных плагинов с фильтрацией по категории и статусу установки.

### POST /plugins/:id/install

Установка плагина из Marketplace. Система проверяет совместимость версий, права доступа и наличие конфликтов с уже установленными плагинами.

### DELETE /plugins/:id

Удаление плагина. Плагин корректно деактивируется, его хуки снимаются, данные плагина архивируются.

---

## Рекомендации

### GET /projects/:id/recommendations

Возвращает AI-рекомендации по устранению уязвимостей с приоритизацией.

**Пример ответа:**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "rec_001",
        "findingId": "fnd_01ABC",
        "priority": "critical",
        "title": "Немедленно обновить OpenSSL на web-prod-01",
        "description": "Обнаружена уязвимость CVE-2025-1234 с публичным эксплойтом. Данная уязвимость используется в цепочке атаки ap_001.",
        "effort": "low",
        "impact": "high",
        "relatedPaths": ["ap_001"]
      }
    ]
  }
}
```
