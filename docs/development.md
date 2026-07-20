# Настройка окружения разработки SIP

## Обзор

Данный документ описывает процесс настройки локального окружения для разработки платформы SIP. Инструкция предназначена для контрибьюторов, желающих внести изменения в код проекта, запускать тесты и отлаживать функциональность. Окружение разработки включает фронтенд (Next.js), бэкенд (Express.js), базу данных PostgreSQL и кэш Redis. Все компоненты могут быть запущены как через Docker Compose (рекомендуется для быстрого старта), так и локально (для гибкой отладки).

---

## Предварительные требования

Перед началом настройки убедитесь, что на вашем компьютере установлены следующие инструменты:

- **Node.js** версии 20.x LTS — загрузите с [nodejs.org](https://nodejs.org/) или используйте nvm (`nvm install 20 && nvm use 20`). Проверка: `node --version` должна вернуть `v20.x.x`.
- **npm** версии 10.x или **pnpm** версии 8.x — npm поставляется вместе с Node.js; pnpm можно установить через `npm install -g pnpm`.
- **Git** версии 2.40+ — для клонирования репозитория и управления ветками.
- **Docker** и **Docker Compose** — для запуска PostgreSQL и Redis (альтернативно можно установить их локально).
- **Visual Studio Code** (рекомендуется) с расширениями: ESLint, Prettier, Tailwind CSS IntelliSense, Prisma.

---

## Клонирование и установка

```bash
# Клонирование репозитория
git clone https://github.com/sip-platform/sip.git
cd sip

# Установка зависимостей фронтенда
cd landing
npm install

# Установка зависимостей бэкенда
cd ../backend
npm install
```

---

## Настройка базы данных

### Через Docker (рекомендуется)

```bash
# Запуск PostgreSQL и Redis
docker compose up -d postgres redis

# Запуск миграций
cd backend
npx prisma migrate dev

# Заполнение тестовыми данными (опционально)
npx prisma db seed
```

### Локальная установка

Если вы предпочитаете не использовать Docker, установите PostgreSQL 16 и Redis 7 локально:

```bash
# macOS
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# Ubuntu
sudo apt-get install -y postgresql-16 redis-server
sudo systemctl start postgresql redis-server
```

Создайте базу данных и пользователя:

```bash
sudo -u postgres psql
CREATE USER sip_dev WITH PASSWORD 'sip_dev';
CREATE DATABASE sip_dev OWNER sip_dev;
\q
```

---

## Переменные окружения

Создайте файл `.env` в директории `backend/` на основе `.env.example`:

```bash
# Сервер
PORT=3001
NODE_ENV=development

# База данных
DATABASE_URL=postgresql://sip_dev:sip_dev@localhost:5432/sip_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_EXPIRY=8h
JWT_REFRESH_EXPIRY=30d

# Сканер
NMAP_PATH=/usr/bin/nmap
TRIVY_PATH=/usr/bin/trivy
```

Создайте файл `.env.local` в директории `landing/`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_LOCALE=ru
NEXT_PUBLIC_APP_NAME=SIP Dev
```

---

## Запуск в режиме разработки

### Фронтенд

```bash
cd landing
npm run dev
```

Фронтенд запускается на `http://localhost:3000` с поддержкой горячей перезагрузки (HMR). Изменения в файлах компонентов и стилей применяются мгновенно без перезагрузки страницы.

### Бэкенд

```bash
cd backend
npm run dev
```

Бэкенд запускается на `http://localhost:3001` с автоматической перезагрузкой при изменении файлов (nodemon). API-документация доступна на `http://localhost:3001/api-docs` (Swagger UI).

### Одновременный запуск

Для удобства можно запустить оба сервера в одном терминале через concurrently:

```bash
# Из корня проекта
npm run dev
```

Это запустит фронтенд и бэкенд параллельно с объединённым выводом логов.

---

## Структура проекта

```
sip/
├── landing/              # Фронтенд (Next.js)
│   ├── src/
│   │   ├── app/          # Страницы (App Router)
│   │   ├── components/   # React-компоненты
│   │   │   ├── layout/   # Компоненты компоновки (Sidebar, Header, Footer)
│   │   │   ├── sections/ # Секции посадочной страницы
│   │   │   └── ui/       # Базовые UI-компоненты (Button, Card, Badge)
│   │   └── lib/          # Утилиты, API-клиент, движок (engine)
│   │       └── engine/   # Клиентская бизнес-логика (scanner, KG, plugins)
│   └── public/           # Статические файлы
├── backend/              # Бэкенд (Express.js)
│   ├── src/
│   │   ├── routes/       # API-маршруты
│   │   ├── services/     # Бизнес-логика (scanner, KG, reports, plugins)
│   │   ├── parsers/      # Парсеры результатов сканирования
│   │   └── plugins/      # Система плагинов (runtime, manifests)
│   └── prisma/           # Схема базы данных и миграции
├── docs/                 # Документация
└── scripts/              # Вспомогательные скрипты
```

---

## Полезные команды

```bash
# Линтинг
npm run lint                    # Проверка ESLint
npm run lint:fix                # Автоисправление

# Форматирование
npm run format                  # Prettier

# Тестирование
npm run test                    # Модульные тесты (Vitest/Jest)
npm run test:watch              # Тесты в режиме наблюдения
npm run test:coverage           # Отчёт о покрытии
npm run test:e2e                # E2E-тесты (Playwright)

# База данных
npx prisma studio               # Визуальный редактор БД (http://localhost:5555)
npx prisma migrate dev          # Создание и применение миграции
npx prisma generate             # Генерация типов Prisma Client
npx prisma db seed              # Заполнение тестовыми данными

# Сборка
npm run build                   # Production-сборка
npm run start                   # Запуск production-сборки
```

---

## Отладка

### VS Code

Рекомендуемая конфигурация `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/landing/src"
    }
  ]
}
```

### Браузерные расширения

- **React Developer Tools** — инспектирование компонентного дерева и состояния.
- **Redux DevTools** — если используется Redux (в текущей архитектуре — Zustand, поддержка через `zustand/middleware/devtools`).
