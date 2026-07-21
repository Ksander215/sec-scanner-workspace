# CHANGELOG_PRODUCT.md — Продуктовый чейнджлог

> Только видимые пользователю изменения. Технические детали — в git log.

---

## INT-043 — 2026-07-21 (аудит, без изменений кода)

### Product Recovery & Single Source of Truth — АУДИТ

**Контекст**: Задача INT-043 инициирована для восстановления целостности продукта после серии изменений INT-033 → INT-042. Запрещено разрабатывать новый функционал до подтверждения существующего.

**Найденные расхождения (видимые пользователю)**:

1. **Страница `/app/platform-status` недоступна на Production**
   - В git-репозитории страница существует и заявлена как PLAT-001 implemented
   - На Production запрос возвращает HTTP 200, но контент — это 404 fallback на index.html
   - Пользователь, переходя по ссылке, видит главную страницу вместо Platform Status

2. **Страница `/app/debug/features` недоступна на Production**
   - В git-репозитории страница существует и заявлена как AIS-008 implemented
   - На Production — такой же 404 fallback, как и platform-status

3. **На Production существует "призрачная" страница `/app/system-status`**
   - Страница работает, возвращает реальный контент (81653 байт)
   - Содержит тексты INT-043: "Never Trust Code", "Production Is The Source Of Truth", "Every Feature Must Have Evidence"
   - В git-репозитории этой страницы НЕТ
   - В исходниках на сервере её тоже НЕТ
   - Работа предыдущего агента не была закоммичена

4. **Backend работает, но документация говорит обратное**
   - HANDOFF.md, CURRENT_STATE.md заявляют: "Backend не работает в production"
   - Фактически: systemd `sip-server.service` активен, порт 3005 слушается
   - `/api/health` возвращает корректный JSON
   - Backend запущен из `/root/sec-scanner-workspace` (версия INT-036 — отстаёт на 4 этапа)

5. **Три разные версии кода на сервере**
   - `/var/www/sec-scanner-build` — INT-038 (используется для git pull)
   - `/root/sec-scanner-workspace` — INT-036 (отсюда запущен backend)
   - GitHub — INT-040 v2 (последний коммит)
   - Production HTML — содержит INT-040 v2 + "призрачную" system-status

**Принятые решения**:
- Не делать git pull + rebuild до реконструкции system-status
- Создан backup Production: `/backup/sec-scanner-pro-20260721-int043`
- Задокументированы все расхождения в CURRENT_STATE.md, DECISIONS.md
- Добавлено новое правило "Context Reset Rule" в DEVELOPMENT_RULES.md

**Без видимых изменений для пользователя**: этот этап — только аудит и документирование.

---

## INT-040 v2 — 2026-07-21 (по данным git)

### AIS Cinematic Notification System — Variant B

**Видимые изменения**:
- Уведомления AIS получили кинематографичную анимацию (Scan-Materialize):
  - Stage 1: световая линия сверху вниз
  - Stage 2: рамка раскрывается через clip-path
  - Stage 3: заголовок "AIS / Adaptive Intelligence System"
  - Stage 4: основной текст (typewriter)
  - Stage 5: кнопка действия
  - Stage 6: исчезновение (схлопывание к центру)
- Реализована очередь уведомлений (по одному, последовательно)
- Priority Engine: critical/high/normal/info, critical прерывает info
- Adaptive Timing: fast dismiss → 40% короче, long read → 180% дольше
- Zero Spam: 10с cooldown для одинаковых titleKey
- Progressive Personality: formal/natural/familiar по sessionCount
- Accessibility: Reduced Motion, keyboard (Escape/Enter), aria-live

**Технические изменения**:
- `AISSystemEvent.tsx` — новый компонент, заменяет `SoloNotification.tsx` для AIS событий
- `SoloNotification.tsx` — остался в репозитории как мёртвый код (требует удаления)
- В Settings добавлена секция AIS Settings (6 параметров: Auto Tips, Typing Effect, Animation Intensity, Dismiss Speed, Sounds, Activity Level)

---

## INT-038 — 2026-07-21

### Platform Audit, Feature Registry & Product Intelligence

**Видимые изменения**:
- Создана страница `/app/platform-status` — Platform Status Center (по данным Feature Registry)
- Создана страница `/app/debug/features` — Developer Overlay (статус фич по страницам)
- Feature Registry: 46 фич в 11 категориях, версия `INT-038-v2`
- Каждая фича имеет статус: `implemented` / `in_progress` / `planned`
- На странице Platform Status — Overall Readiness, per-category percentages, Functional Matrix

**Технические изменения**:
- `feature-registry.json` — данные реестра
- `feature-registry.ts` — функции доступа и расчёта готовности
- `getOverallReadiness()`, `getCategoryReadiness()`, `getFunctionalMatrix()`
- PRODUCT_AUDIT.md создан с AUD-001 по AUD-014

---

## v0.5.0 — 2026-07-21 (INT-036)

### AIS — Adaptive Intelligence System

**Видимые изменения**:
- На каждой странице приложения появилась плавающая кнопка AIS (✨ sparkles, правый нижний угол)
- По клику открывается боковая панель AIS с 3 вкладками:
  - **Навигация** — контекстная подсказка для текущей страницы
  - **Цель** — персональная цель пользователя с прогресс-баром
  - **Уверенность** — оценка уверенности платформы + Trust Builder
- На Dashboard рядом с заголовком появился бейдж профиля: «Определяем ваш профиль...»
- Уведомления AIS появляются с анимацией (свечение, масштаб, плавное исчезновение)
- Уведомления адаптируются к скорости чтения пользователя
- Контекстные подсказки меняются в зависимости от страницы:
  - Dashboard: «Сегодня ваша инфраструктура выглядит стабильнее, чем вчера»
  - Scanner: «Готовы проверить инфраструктуру? Начнём»
  - Marketplace: «Не знаете, что выбрать? Я помогу подобрать инструменты»
  - Reports: «Отчёт уже готов. Хотите отправить руководителю?»
  - Knowledge Graph: «Посмотрите, как связаны найденные проблемы»
  - Attack Paths: «Самое опасное место уже найдено»

**Механика**:
- AIS запоминает действия пользователя (скорость чтения, навигации, предпочтения)
- Профиль хранится в localStorage
- Уведомления не повторяют одно и то же сообщение подряд
- Если пользователь игнорирует — подсказок становится меньше
- Если читает — подсказки показываются дольше

---

## v0.4.0 — 2026-07-19

### Confidence-Driven UX

**Видимые изменения**:
- На Dashboard появился Confidence Score — оценка уверенности платформы (0-100)
- 5 уровней: Very Low → Low → Moderate → High → Very High
- Текст оценки адаптируется под роль (CEO видит бизнес-язык, DevOps — технический)
- Факторы влияния на оценку видны пользователю

### Marketplace → Solutions Center

**Видимые изменения**:
- Marketplace переименован в «Центр решений»
- 7 категорий вместо простого списка: Plugins, Connectors, Templates, Dashboards, Integrations, Rules, AI Prompts
- Карточки инструментов переработаны — показывают решение, а не просто название
- Фильтрация по категориям

---

## v0.3.0 — 2026-07-18

### Business Trust & Guided Experience

**Видимые изменения**:
- Результаты анализа показываются на языке бизнеса (BusinessResult)
- Executive Summary — сводка для руководителей
- «Что изменилось» — описывает изменения с прошлого сканирования
- «Почему это важно» — объясняет бизнес-влияние
- «Прогресс компании» — показывает улучшения со временем
- Demo-данные помечены бейджем «Demo»
- На каждой странице кнопка «Помощь» — открывает контекстную справку

### Self-Explaining Platform

**Видимые изменения**:
- Технические термины подчёркнуты пунктиром — клик показывает простое объяснение
- Кнопки «Что это?» рядом с метриками (Risk Score, Confidence Score)
- SmartNextStep — подсказка следующего действия внизу страницы
- Платформа объясняет себя без обращения к документации

---

## v0.2.0 — 2026-07-17

### Smart Navigation

**Видимые изменения**:
- SmartScrollNavigator — навигация по секциям страницы
- Прогресс-бар чтения вверху страницы
- Индикаторы секций при скролле
- Быстрый переход к нужной секции

---

## v0.1.0 — 2026-07-15

### Foundation

**Видимые изменения**:
- Landing page с полным продуктовым рассказом
- Dashboard с метриками безопасности
- Scanner интерфейс
- Marketplace базовый каталог
- Reports список отчётов
- Knowledge Graph демо
- Attack Paths демо
- Двуязычность (RU / EN)
- Тёмная тема
- Адаптивный дизайн
