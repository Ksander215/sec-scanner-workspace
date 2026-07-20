# HANDOFF.md — Документ передачи проекта

> Этот файл — первая точка входа для любого нового участника проекта.
> Прочитай его полностью перед началом работы.

---

## О платформе

**SIP — Security Intelligence Platform** — операционная система для безопасности бизнеса.

Это не просто сканер уязвимостей. Это платформа, которая помогает владельцам бизнеса понимать состояние безопасности своей инфраструктуры, принимать обоснованные решения и действовать.

**Домен**: https://sec-scanner.pro  
**Репозиторий**: https://github.com/Ksander215/sec-scanner-workspace  
**Лицензия**: MIT  

---

## Миссия

Сделать безопасность понятной и управляемой для бизнеса. Не «найти уязвимости» — а **дать чувство контроля**.

Мы продаём:
- Чувство контроля над безопасностью
- Понятность — что происходит, почему, и что делать
- Уверенность — что команда на правильном пути

Мы НЕ продаём:
- Ещё один сканер
- Список CVE
- Инструмент для инженеров

---

## Философия продукта

1. **Платформа объясняет сама себя** — пользователь не должен обращаться в поддержку
2. **Business First** — каждый элемент интерфейса говорит на языке бизнеса, а не техники
3. **Zero Anxiety UX** — никаких красных алертов без объяснения, что делать
4. **Event Driven UI** — сообщения появляются только после реальных событий
5. **Zero Fake State** — нет фейковых состояний, demo всегда маркируется
6. **Adaptive Intelligence** — платформа подстраивается под пользователя

---

## Текущее состояние

**Версия**: v0.5.0  
**Последний milestone**: INT-036 — Adaptive Intelligence System (AIS)  
**Production**: https://sec-scanner.pro — работает, HTTP 200

### Что готово

| Модуль | Статус | Описание |
|--------|--------|----------|
| Landing | ✅ Готов | Главная страница с полным продуктовым рассказом |
| Dashboard | ✅ Готов | Executive Dashboard с адаптивными терминами |
| Scanner | ✅ Готов | Интерфейс запуска сканирования |
| Marketplace | ✅ Готов | Центр решений (переработан из обычного каталога) |
| Reports | ✅ Готов | Отчёты + Executive Summary |
| Knowledge Graph | ✅ Готов | Визуализация связей инфраструктуры |
| Attack Paths | ✅ Готов | Пути атак с MITRE ATT&CK маппингом |
| AIS | ✅ Готов | Адаптивная интеллектуальная система |
| Confidence Score | ✅ Готов | Оценка уверенности платформы |
| i18n | ✅ Готов | 2676 ключей RU + EN |
| Dark Theme | ✅ Готов | Полная поддержка тёмной темы |
| Backend API | ⚠️ Частично | Express сервер, 4 модуля маршрутов |
| Plugin Runtime | ⚠️ Частично | 6 плагинов (nmap, nuclei, ZAP, semgrep, trivy, nikto) |

### Последняя завершённая задача

**INT-036 — Adaptive Intelligence System (AIS)**:
- Создана полная система интеллектуального сопровождения пользователя
- 5 модулей: memory, sound, confidence, context-predictor, index
- AISAssistant — плавающая кнопка + боковая панель с 3 вкладками
- SoloNotification — уведомления в стиле Solo Leveling
- PersonalGoalCard — персональные цели с прогрессом
- AIExecutiveSummary — AI-сводка после сканирования
- 150+ i18n ключей
- Задеплоено на production, browser verification пройден

---

## Следующие задачи

| Приоритет | Задача | Описание |
|-----------|--------|----------|
| 🔴 Высокий | INT-033.1 | Intelligent Page Navigator — доработка |
| 🔴 Высокий | Backend Production | Подключение backend к production (сейчас только статика) |
| 🟡 Средний | AIS Sound | Звуковые уведомления в браузере (Web Audio API готов) |
| 🟡 Средний | AIS Settings | Настройки поведения AIS в /app/settings |
| 🟢 Низкий | AIS History | История советов AIS |
| 🟢 Низкий | E2E Tests | Playwright тесты для критических путей |

---

## Открытые улучшения

1. Backend не работает в production — только статический фронтенд
2. Нет реальных данных — всё demo
3. Нет аутентификации пользователей
4. Нет CI/CD pipeline
5. Нет полноценных E2E тестов
6. SoloNotification появляется только программно — нет триггеров из реальных событий
7. AIS не сохраняет данные между сессиями на сервере (только localStorage)
8. Нет мобильного оптимизированного UI (только адаптивный)

---

## Обязательный порядок запуска разработки

### Перед началом ЛЮБОЙ задачи:

1. Прочитай `HANDOFF.md` (этот файл)
2. Прочитай `CURRENT_STATE.md`
3. Прочитай `DEVELOPMENT_RULES.md`
4. Прочитай `DECISIONS.md`
5. Прочитай `RELEASE_CHECKLIST.md`

### После завершения задачи:

1. Обнови `CURRENT_STATE.md`
2. Обнови `CHANGELOG_PRODUCT.md`
3. Обнови `DECISIONS.md` (если принято новое решение)
4. Обнови `ROADMAP.md` (если изменились приоритеты)
5. Пройди `RELEASE_CHECKLIST.md` полностью
6. Выполни E2E проверку по `END_TO_END_CHECKLIST.md`

### Цикл релиза:

```
LOCAL → BUILD → GITHUB → SERVER → PRODUCTION → Browser Verification → Product Review
```

Если отсутствует хотя бы один этап — задача НЕ завершена.

---

## Ссылки на документацию

| Документ | Назначение |
|----------|-----------|
| [HANDOFF.md](./HANDOFF.md) | Точка входа (этот файл) |
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Живая сводка состояния проекта |
| [PRODUCT_VISION.md](./PRODUCT_VISION.md) | Продуктовое видение |
| [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md) | Продуктовые принципы |
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Правила разработки |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | Чек-лист релиза |
| [END_TO_END_CHECKLIST.md](./END_TO_END_CHECKLIST.md) | E2E сценарии проверки |
| [AIS_SPECIFICATION.md](./AIS_SPECIFICATION.md) | Спецификация AIS |
| [UX_GUIDELINES.md](./UX_GUIDELINES.md) | UX руководства |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Архитектура проекта |
| [ROADMAP.md](./ROADMAP.md) | Дорожная карта |
| [DECISIONS.md](./DECISIONS.md) | Журнал решений |
| [GLOSSARY.md](./GLOSSARY.md) | Глоссарий |
| [CHANGELOG_PRODUCT.md](./CHANGELOG_PRODUCT.md) | Продуктовый чейнджлог |

---

## Технический стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend | Next.js | 16.2.10 |
| UI | React | 19.2.4 |
| Стили | Tailwind CSS | 4.x |
| Анимации | Framer Motion | 12.x |
| Графы | @xyflow/react | 12.x |
| Графики | Recharts | 3.9.x |
| Иконки | Lucide React | 1.24.x |
| Язык | TypeScript | 5.x |
| Backend | Express | 4.21.x |
| Сборка | Static Export | output: "export" |
| Сервер | Nginx | — |
| Node.js | — | 20.x |

---

## Развёртывание

### Production сервер
- **IP**: 85.239.38.163
- **Port**: 22222 (SSH)
- **User**: root
- **Web root**: /var/www/sec-scanner.pro
- **Build source**: /var/www/sec-scanner-build
- **Nginx config**: /etc/nginx/sites-enabled/sec-scanner

### Процесс деплоя
```bash
cd /var/www/sec-scanner-build && git pull origin main
cd landing && npm install && npx next build
rm -rf /var/www/sec-scanner.pro/*
cp -r out/* /var/www/sec-scanner.pro/
chown -R www-data:www-data /var/www/sec-scanner.pro
nginx -s reload
```

### Локальная разработка
```bash
cd landing
npm install
npm run dev     # http://localhost:3000
npm run build   # Static export в landing/out/
```
