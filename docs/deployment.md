# Развёртывание SIP

## Обзор

Платформа SIP поддерживает несколько методов развёртывания в зависимости от размера организации, требований к безопасности и доступной инфраструктуры. Данный документ описывает три основных способа: контейнерное развёртывание через Docker Compose (рекомендуется для быстрого старта и малых команд), ручная установка на выделенный сервер (для средних организаций с кастомной инфраструктурой) и развёртывание за обратным прокси nginx (для production-окружений с требованиями к TLS, Rate Limiting и балансировке нагрузки). Все методы предполагают развёртывание на Linux-сервере (Ubuntu 22.04 LTS или аналогичном).

---

## Системные требования

### Минимальные (до 50 хостов сканирования)

- CPU: 2 ядра
- RAM: 4 ГБ
- Диск: 20 ГБ SSD
- ОС: Ubuntu 22.04 LTS / Debian 12 / RHEL 9
- Docker: ≥ 24.0
- Docker Compose: ≥ 2.20

### Рекомендуемые (50–500 хостов)

- CPU: 4 ядра
- RAM: 8 ГБ
- Диск: 50 ГБ SSD
- ОС: Ubuntu 22.04 LTS

### Enterprise (500+ хостов)

- CPU: 8+ ядер
- RAM: 16+ ГБ
- Диск: 100+ ГБ NVMe SSD
- Отдельный PostgreSQL-сервер (managed или выделенный)
- Redis-кластер для высокой доступности

---

## Вариант 1: Docker Compose (рекомендуемый)

### Подготовка

```bash
# Клонирование репозитория
git clone https://github.com/sip-platform/sip.git
cd sip

# Копирование и настройка переменных окружения
cp .env.example .env
```

### Настройка .env

```bash
# Основные настройки
SIP_ENV=production
SIP_PORT=3000
SIP_API_PORT=3001
SIP_SECRET=<генерируйте-надёжный-секрет-32-символа>

# База данных
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=sip
POSTGRES_USER=sip
POSTGRES_PASSWORD=<надёжный-пароль>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=30d

# Сканер — внешние инструменты
NMAP_PATH=/usr/bin/nmap
ZAP_PATH=/usr/bin/zap
TRIVY_PATH=/usr/bin/trivy
```

### Запуск

```bash
# Сборка и запуск всех сервисов
docker compose up -d

# Проверка статуса
docker compose ps

# Просмотр логов
docker compose logs -f sip-api

# Запуск миграций базы данных
docker compose exec sip-api npx prisma migrate deploy
```

Docker Compose разворачивает следующие сервисы:

| Сервис       | Порт  | Назначение                          |
|--------------|-------|--------------------------------------|
| sip-web      | 3000  | Фронтенд (Next.js)                  |
| sip-api      | 3001  | Бэкенд API (Express.js)             |
| postgres     | 5432  | База данных PostgreSQL              |
| redis        | 6379  | Кэш и очередь задач (Redis)         |
| sip-worker   | —     | Воркер сканирования (BullMQ)        |

### Обновление

```bash
git pull origin main
docker compose build
docker compose up -d
docker compose exec sip-api npx prisma migrate deploy
```

---

## Вариант 2: Ручная установка

### Установка зависимостей

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update && sudo apt-get install -y postgresql-16

# Redis
sudo apt-get install -y redis-server

# Инструменты сканирования
sudo apt-get install -y nmap
sudo snap install trivy
```

### Настройка базы данных

```bash
sudo -u postgres psql
CREATE USER sip WITH PASSWORD '<надёжный-пароль>';
CREATE DATABASE sip OWNER sip;
GRANT ALL PRIVILEGES ON DATABASE sip TO sip;
\q
```

### Установка SIP

```bash
# Бэкенд
cd backend
npm install
npx prisma migrate deploy
npm run build

# Фронтенд
cd ../landing
npm install
npm run build
```

### Запуск через systemd

Создайте файл `/etc/systemd/system/sip-api.service`:

```ini
[Unit]
Description=SIP API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=sip
WorkingDirectory=/opt/sip/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/sip/.env

[Install]
WantedBy=multi-user.target
```

Аналогично создайте сервис для фронтенда и воркера. Запуск:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sip-api sip-web sip-worker
sudo systemctl start sip-api sip-web sip-worker
```

---

## Вариант 3: Обратный прокси nginx

Рекомендуется для production-окружений. nginx обеспечивает TLS-терминацию, Rate Limiting, сжатие и балансировку нагрузки.

### Конфигурация nginx

```nginx
upstream sip_web {
    server 127.0.0.1:3000;
}

upstream sip_api {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name sip.company.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sip.company.com;

    ssl_certificate     /etc/letsencrypt/live/sip.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sip.company.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req zone=api burst=60 nodelay;

    # Фронтенд
    location / {
        proxy_pass http://sip_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://sip_api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://sip_api/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Статика
    location /_next/static/ {
        proxy_pass http://sip_web;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Получение TLS-сертификата

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sip.company.com
sudo certbot renew --dry-run
```

---

## Мониторинг и здоровье системы

### Проверка здоровья

```bash
# API
curl http://localhost:3001/health

# Ответ
{"status":"ok","version":"0.4.0","uptime":86400,"database":"connected","redis":"connected"}
```

### Мониторинг

Для production-рекомендуется настроить Prometheus + Grafana:

- Метрики SIP экспортируются на `/metrics` в формате Prometheus.
- Дашборд Grafana включает: количество активных сканирований, размер очереди, время отклика API, использование памяти, количество находок по критичности.
- Алерты: API недоступен > 1 мин, очередь > 100 задач, использование памяти > 90%.

### Резервное копирование

```bash
# PostgreSQL
pg_dump -U sip sip | gzip > backup_$(date +%Y%m%d).sql.gz

# Восстановление
gunzip -c backup_20250328.sql.gz | psql -U sip sip
```

Рекомендуется автоматизировать резервное копирование через cron (ежедневно) с хранением минимум 30 дней.
