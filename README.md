# SIP — Security Intelligence Platform

> Операционная система для безопасности бизнеса

SIP — платформа для непрерывного мониторинга безопасности, выявления уязвимостей и управления рисками.

## Структура репозитория

```
sec-scanner-landing/     # Next.js фронтенд (TypeScript, React, Tailwind CSS)
├── src/
│   ├── app/             # Страницы (App Router)
│   ├── components/      # React-компоненты
│   └── lib/             # Движок, i18n, утилиты
├── sip-server/          # Node.js бэкенд (API, сканер, плагины)
└── brand/               # Брендбук
```

## Быстрый старт

```bash
cd sec-scanner-landing
npm install
npm run dev
```

## Деплой

```bash
npm run build        # Статический экспорт в out/
# Файлы из out/ разворачиваются в /var/www/sec-scanner.pro/
```

## Стек

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express
- **Инфраструктура**: Nginx, Ubuntu, Let's Encrypt

## Лицензия

MIT
