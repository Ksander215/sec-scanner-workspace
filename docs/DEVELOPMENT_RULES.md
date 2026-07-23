# DEVELOPMENT_RULES.md — Правила разработки

> Эти правила обязательны. Нарушение любого — баг, который нужно исправить.

---

## 1. Production First

После деплоя обязательно открыть Production. Не localhost. Не build. А именно https://sec-scanner.pro.

**Проверка**:
- Открыть Production в браузере
- Пройти по всем изменённым страницам
- Визуально подтвердить изменения

---

## 2. Zero Divergence Rule

LOCAL = GITHUB = SERVER = PRODUCTION = BROWSER

Если отсутствует хотя бы одно звено — задача НЕ завершена.

**Цепочка**:
```
Код написан → Build прошёл → Git push → Server обновлён → Production HTTP 200 → Browser Verification → Product Review
```

---

## 3. Visual Verification

После каждого задания ответить: **Что изменилось визуально?**

- ❌ «Добавлен компонент»
- ✅ «На странице Scanner появилась новая карточка. При окончании проверки появляется уведомление AIS. Через 5 секунд оно исчезает.»

Если пользователь не видит изменений — работа не выполнена.

---

## 4. Product Review

Перед коммитом проверить:
1. Можно ли убрать эту строку? Если можно — убрать.
2. Можно ли сказать проще? Если можно — переписать.
3. Есть ли повторение? Если есть — убрать.
4. Понятен ли текст бизнесу? Если нет — перевести.

---

## 5. Event Driven UI

Любое сообщение появляется только после события.

- ❌ «Настройка завершена» при загрузке страницы
- ✅ Пользователь нажал «Сохранить» → сервер ответил OK → сообщение

---

## 6. Demo Transparency

Любые demo-данные обязаны иметь пометку Demo (компонент DemoBadge).

Любые реальные данные не должны иметь пометки Demo.

---

## 7. Zero Fake State

Запрещается:
- Показывать успешную настройку, если настройки не производились
- Показывать найденные проблемы, если анализ не запускался
- Показывать прогресс, если действий не было
- Показывать завершённый процесс, если пользователь его не запускал

---

## 8. Adaptive UX

AIS адаптируется к пользователю:
- Быстрый пользователь → короткие уведомления (3-4 сек)
- Медленный → длинные (8-12 сек)
- Всегда читает → режим «Закрыть вручную»
- Игнорирует → меньше уведомлений
- Инженер → техническая информация
- Руководитель → бизнес-информация

---

## 9. Regression First

Перед добавлением новой функции — проверить, что существующие не сломались.

**Обязательные проверки**:
- Dashboard открывается
- Scanner открывается
- Reports открываются
- Marketplace открывается
- Навигация работает
- AIS-кнопка видна
- Тёмная тема работает
- RU/EN переключается

---

## 10. Repository Integrity

- Git статус чистый перед завершением задачи
- Все файлы закоммичены и запушены
- GitHub содержит актуальный код
- .gitignore актуален
- Нет случайно закоммиченных ключей, токенов, паролей

---

## 11. Business Review

Перед закрытием задачи ответить на вопросы:

1. Есть ли фейковые состояния?
2. Есть ли лишние тексты?
3. Есть ли дубли?
4. Есть ли визуальные баги?
5. Есть ли недоступные функции?
6. Есть ли кнопки, которые ничего не делают?
7. Есть ли сообщения, которые появляются без причины?
8. Есть ли несоответствие между Production и GitHub?
9. Есть ли несоответствие между Production и локальной версией?
10. Есть ли несоответствие между дизайном и психологией пользователя?

Если хотя бы один ответ «Да» — работа продолжается.

---

## Code Style

### TypeScript
- Strict mode
- No `any` types (использовать `unknown` если тип неизвестен)
- Explicit return types для экспортируемых функций
- Interface > Type alias для объектов

### React
- Functional components only
- Hooks: `use` prefix
- Props interface: `ComponentNameProps`
- Default export для страниц, named export для компонентов

### CSS / Tailwind
- Утилиты Tailwind (не кастомный CSS без необходимости)
- CSS variables для темы (через next-themes)
- Responsive: mobile-first
- Dark mode: все компоненты поддерживают

### i18n
- Все пользовательские тексты через `t("key")`
- Ключи в формате `section.subsection.item`
- RU и EN всегда парные
- Новые ключи добавляются в оба языка одновременно

### Коммиты
- Формат: `INT-XXX: Описание` или `feat(INT-XXX): Описание`
- Одна задача — один коммит (или несколько логических)
- Осмысленные сообщения на русском или английском

---

## Деплой

### Обязательный процесс
```bash
# Локально
cd landing && npm run build    # Проверить сборку

# Git
git add -A && git commit -m "INT-XXX: Описание"
git push origin main

# Сервер (через SSH)
cd /var/www/sec-scanner-build && git pull origin main
cd landing && npm install && npx next build
rm -rf /var/www/sec-scanner.pro/*
cp -r out/* /var/www/sec-scanner.pro/
chown -R www-data:www-data /var/www/sec-scanner.pro
nginx -s reload
```

### Верификация
1. `curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/` → 200
2. Открыть в браузере → визуальная проверка
3. agent-browser для автоматической проверки

---

## 12. Context Reset Rule (INT-043)

После любого крупного этапа (≈10–15 INT-задач или при заметном росте контекста) работа продолжается в **новом диалоге**.

### Перед началом нового диалога агент обязан:

1. **Прочитать `docs/HANDOFF.md`** — точка входа в проект
2. **Прочитать `docs/CURRENT_STATE.md`** — живая сводка состояния
3. **Прочитать `docs/DECISIONS.md`** — журнал архитектурных решений
4. **Прочитать `docs/DEVELOPMENT_RULES.md`** — этот файл
5. **Прочитать `docs/RELEASE_CHECKLIST.md`** — чек-лист релиза
6. **Выполнить аудит текущего состояния Production**:
   - Проверить HTTP-коды всех ключевых страниц
   - Сравнить git-лог с фактически задеплоенной версией
   - Проверить, что `worklog.md` содержит записи последних этапов
   - Сверить Feature Registry с реальным состоянием Production

### Только после этого приступать к разработке.

### Почему это важно

В текущем проекте (INT-043 аудит) обнаружено:
- Документация (HANDOFF, CURRENT_STATE, CHANGELOG) устарела на 3-6 этапов
- `worklog.md` содержал только 1 запись из 6 выполненных этапов
- INT-039, INT-041, INT-042 отсутствуют в git-истории
- Предыдущий агент задеплоил работу на Production, но не закоммитил в git
- Production и git разошлись — образовалась "призрачная" страница `/app/system-status`

Принудительный reset контекста с обязательной сверкой с Production предотвращает накопление таких расхождений.

---

## 13. No Deploy Without Sync (INT-043)

Запрещается выполнять `git pull + next build + cp to web root`, если на Production присутствуют страницы/функции, которых нет в git.

### Обязательная проверка перед deploy:

1. Сравнить список prerendered HTML-страниц в `/var/www/sec-scanner.pro/app/` с исходниками в `landing/src/app/(app)/app/`
2. Если на Production есть страница, которой нет в git — сначала реконструировать её исходник и закоммитить
3. Если в git есть страница, которой нет на Production — сначала разобраться, почему она не попала в build (возможно, удалена ранее другим агентом)
4. Только после синхронизации — выполнять deploy

### Нарушение этого правила в истории проекта

В INT-043 обнаружено: страница `/app/system-status` существует на Production, но отсутствует во всех исходниках. Любой `next build` с последующим `cp` перезапишет Production и удалит эту страницу без возможности восстановления (кроме как из backup).

---

## 14. Zero Fake Completion (INT-043)

Запрещается писать "Реализовано" или "Implemented" до одновременного выполнения всех условий:

| Проверка | Что означает |
|----------|---------------|
| Build | `npm run build` завершается без ошибок |
| Deploy | Изменения физически на Production (не на localhost, не на staging) |
| Visual Review | Визуальная проверка в браузере на https://sec-scanner.pro |
| Browser Review | Проверка в Chrome/Firefox/Safari |
| E2E | Прохождение сценария по END_TO_END_CHECKLIST.md |
| Regression | Существующие функции не сломаны |

Если хотя бы одно условие не выполнено — статус функции `in_progress` или `broken`, но не `implemented`.

---

## 15. Evidence-Based Development (INT-044)

Любое заявление о выполнении задачи должно сопровождаться **проверяемыми доказательствами**.

### Обязательные доказательства

| Тип доказательства | Что включает |
|--------------------|--------------|
| Production URL | Прямая ссылка на страницу/функцию на https://sec-scanner.pro |
| HTTP-статус | `curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/<route>` — должен быть 200 |
| Скриншот | Визуальное подтверждение для UI-функций (через agent-browser или ручной снимок) |
| E2E-сценарий | Прохождение сценария по `END_TO_END_CHECKLIST.md` |
| Feature Registry | Соответствующая запись в `feature-registry.json` со статусом `verified` |
| Commit hash | Git commit, в котором функция добавлена/изменена |

### Запрещено без доказательств

- Писать "Реализовано", "Готово", "Implemented", "Done"
- Закрывать задачу с пометкой "completed"
- Утверждать, что функция работает, без production-проверки
- Доверять отчёту агента без сверки с Production

### Статусы Feature Registry (INT-044)

Статус `implemented` больше **не используется**. Допустимые статусы:

| Статус | Значение |
|--------|----------|
| `not_started` | Запланирована, но работа не начиналась |
| `in_progress` | В разработке, не готова для production |
| `verified` | Реализована, задеплоена, проверена на Production (HTTP 200 + визуально + E2E) |
| `partial` | Частично работает на Production (например, UI есть, но backend не отвечает) |
| `broken` | Была реализована, но на Production не работает или возвращает 404 fallback |
| `missing` | Заявлена, но отсутствует на Production (нет страницы, нет компонента) |
| `deprecated` | Устарела, заменена другой функцией, подлежит удалению |
| `planned` | Запланирована к будущей реализации (legacy alias для `not_started`) |

### Принцип Production First

**Production важнее Git.** Если функция существует только на Production, но отсутствует в Git — она должна быть восстановлена в Repository (Ghost Recovery). Если Git отличается от Production — сначала восстанавливается Git, потом разрешается deploy.

---

## 16. Zero False Reports (INT-045)

Запрещается писать следующие утверждения без доказательств:

| Запрещено без доказательств | Требуемые доказательства |
|------------------------------|--------------------------|
| "Реализовано" | Production URL + HTTP 200 + commit hash + скриншот |
| "Готово" | Production URL + HTTP 200 + commit hash + скриншот |
| "Работает" | Production URL + E2E scenario + скриншот |
| "Исправлено" | Production URL + diff + commit + regression test |
| "Deploy completed" | SHA = LOCAL = GITHUB = SERVER = PRODUCTION |
| "Verified" | Evidence Registry entry с 6 checks = pass |

### Если доказательств нет — задача автоматически считается незавершённой.

---

## 17. Mandatory Product Review (INT-045)

Перед завершением каждого INT-этапа агент обязан ответить на 6 вопросов:

1. **Что изменилось для пользователя?** — конкретные видимые изменения
2. **Где это увидеть?** — Production URL с прямыми ссылками
3. **Как проверить?** — пошаговый сценарий проверки (кликнуть туда, ввести это, ожидать это)
4. **Что ещё не реализовано?** — явный список того, что НЕ сделано
5. **Какие ограничения остались?** — известные лимиты, edge cases, частичные реализации
6. **Какие риски существуют?** — что может сломаться, что требует мониторинга

Ответы на эти 6 вопросов обязательны в финальном отчёте каждого INT.

---

## 18. Agent Quality Control (INT-045)

После каждого INT-этапа агент обязан указать 4 категории проверок:

### Что проверено автоматически
- `npx next build` exit code 0
- `curl -s -o /dev/null -w '%{http_code}'` для каждой Production URL
- `git rev-parse HEAD` на LOCAL = GITHUB = SERVER
- `agent-browser snapshot` для подтверждения DOM
- TypeScript type check без ошибок

### Что проверено вручную
- Визуальная проверка UI через скриншоты
- Кликабельность кнопок (через agent-browser click)
- Контекстные уведомления AIS появляются при переходах
- Переключение языка/темы работает

### Что не удалось проверить
- Safari browser (нет в окружении)
- Mobile viewport (не сделано в этой сессии)
- Real backend operations (backend на INT-036, не синхронизирован)

### Что требует проверки владельцем проекта
- Реальная регистрация/аутентификация пользователя
- Реальные операции сканирования (nmap/nuclei)
- Интеграции с внешними сервисами (GitHub, Slack, Jira)
- Performance под нагрузкой

Эти 4 категории обязательны в финальном отчёте каждого INT.

---

## 19. Definition of Done — INT-045 (расширенный)

Задача считается завершённой **только если** выполнены ВСЕ 13 пунктов:

| # | Критерий | Доказательство |
|---|----------|----------------|
| 1 | Код написан | commit hash в git log |
| 2 | Build успешен | `npx next build` exit 0, без TS ошибок |
| 3 | GitHub синхронизирован | `git ls-remote origin main` SHA = local HEAD |
| 4 | Сервер синхронизирован | SSH: `cd /var/www/sec-scanner-build && git rev-parse HEAD` = GitHub |
| 5 | Production обновлён | `curl -s https://sec-scanner.pro/<route>` возвращает новый контент |
| 6 | Browser Review пройден | agent-browser snapshot подтверждает DOM |
| 7 | Visual Review пройден | скриншоты сохранены в evidence |
| 8 | E2E пройден | END_TO_END_CHECKLIST.md сценарии выполнены |
| 9 | Regression пройдена | KNOWN_REGRESSIONS.md проверен, новых регрессий нет |
| 10 | Evidence создан | `feature-evidence.json` обновлён с проверками |
| 11 | Feature Registry обновлён | `feature-registry.json` статусы актуальны |
| 12 | Product Status обновлён | `/app/system-status` показывает актуальные данные |
| 13 | Documentation обновлена | CURRENT_STATE, CHANGELOG, DECISIONS, worklog обновлены |

**Если хотя бы один пункт не выполнен — задача остаётся `in_progress`.**

---

## 20. Evidence-Based Development (INT-045 — расширение Rule 15)

### Каждая функция должна иметь evidence-запись

В `feature-evidence.json` для каждой функции должно быть:

```json
{
  "AIS-014": {
    "status": "verified",
    "commit": "1643a9c...",
    "production": "https://sec-scanner.pro/app/dashboard",
    "screenshots": ["dashboard.png", "ais-panel-open.png"],
    "video": null,
    "browser": "pass",
    "e2e": "pass",
    "regression": "pass",
    "build": "pass",
    "visual": "pass",
    "verifiedAt": "2026-07-21T22:00:00+03:00",
    "verifiedBy": "GLM-5.2"
  }
}
```

### 6 обязательных checks

| Check | Что проверяет |
|-------|---------------|
| build | `npx next build` exit 0 |
| production | HTTP 200 + уникальный контент (не index.html fallback) |
| browser | agent-browser snapshot подтверждает DOM |
| e2e | END_TO_END_CHECKLIST.md сценарии |
| regression | KNOWN_REGRESSIONS.md проверен |
| visual | скриншот сохранён |

### Статус функции = min(всех checks)

- Все 6 = pass → `verified`
- Хотя бы один = fail → `broken`
- Хотя бы один = partial → `partial`
- Хотя бы один = skip → `in_progress` или `not_started`

### Без evidence функция считается неподтверждённой

Статус `implemented` (без evidence) **запрещён**. Использовать `implemented_not_verified` для legacy или `verified` для подтверждённых.

---

## 21. Four Statuses Rule (INT-046)

После INT-046 агенту запрещается писать "Функция реализована" без одновременного указания **четырёх статусов**:

| Статус | Что означает | Возможные значения |
|--------|--------------|---------------------|
| **Technical Status** | Реализована ли технически | `implemented` / `not_implemented` / `broken` / `deprecated` / `in_progress` |
| **Evidence Status** | Подтверждена ли доказательствами | `verified` / `partial` / `missing` |
| **Product Status** | Готова ли как продукт (для ежедневного использования) | `ready` / `almost_ready` / `partial` / `not_ready` |
| **Production Status** | Подтверждена ли на production | `deployed` / `broken` / `not_deployed` |

### Пример корректного заявления

✅ "PLAT-015 Product Readiness Dashboard:
- Technical: implemented
- Evidence: verified
- Product: ready (score 95%)
- Production: deployed (HTTP 200, 68000 bytes)"

### Пример запрещённого заявления

❌ "Функция реализована" — без указания всех 4 статусов.

### Разница между статусами

- **Technical = implemented, но Product = not_ready**: код написан, но нет empty/error states, не адаптировано под мобильные, нет настроек. Пользователь не может использовать это ежедневно.
- **Technical = implemented, Evidence = missing**: код есть, но нет production verification (HTTP 200, скриншот, E2E).
- **Technical = implemented, Production = broken**: код есть в git, но на production не работает (404 fallback, runtime error).

### Все 4 статуса должны быть отражены в `product-readiness.json`

Файл `landing/src/data/product-readiness.json` содержит `fourStatuses` для каждой функции. Страница `/app/product-readiness` отображает их в развёрнутом виде.

---

## 22. Architecture Governance (INT-048)

Новая функция не может быть реализована, пока не определено:

1. **Какому центру она принадлежит** — SIP / AIS / AI CTO / AIO
2. **Кто является владельцем** — конкретная команда или autonomous agent
3. **Какие данные использует** — inputs (откуда получает данные)
4. **Какие данные публикует** — outputs (что отдаёт другим центрам)
5. **Какие зависимости создаёт** — от каких других центров зависит

### Четыре центра ответственности

| Центр | Зона ответственности | Примеры функций |
|-------|----------------------|------------------|
| **SIP** | Данные и безопасность | Scanner, Risk Engine, Reports, Knowledge Graph, Attack Paths |
| **AIS** | Взаимодействие с пользователем | AI Copilot, Notifications, Sound, Animation, Memory, Context |
| **AI CTO** | Стратегия и решения | Product Readiness, Roadmap, Trust Audit, Executive Summary |
| **AIO** | Исполнение и автоматизация | Build, Deploy, Regression, Evidence, Sync, Recovery, Rollback |

### Запрет на "плавающие" функции

Каждая функция платформы должна быть явно отнесена к одному из 4 центров в `architecture-registry.json` → `responsibilityMatrix`. Функция без owner'а считается orphan и не может быть реализована.

### При добавлении новой функции

1. Определить центр (SIP/AIS/AI CTO/AIO)
2. Добавить запись в `responsibilityMatrix`
3. Указать dependencies (от каких центров зависит)
4. Указать inputs/outputs
5. Только после этого — реализация кода

### Unified Terminology (BLOCK 13)

Во всей платформе используются только эти термины:

| Термин | Расшифровка |
|--------|-------------|
| **SIP** | Security Intelligence Platform |
| **AIS** | Adaptive Intelligence System |
| **AI CTO** | Product Intelligence Center |
| **AIO** | Autonomous Operations Center |
| **AI Copilot** | Пользовательский интерфейс взаимодействия с интеллектуальными центрами |

Запрещено использовать: "помощник", "интеллектуальный помощник", "умный ассистент" — только "AI Copilot" или "AIS".

---

## 23. Platform Evolution (INT-049)

Любая задача **не считается завершённой**, если не выполнен анализ влияния на все 4 центра:

- **SIP** (Security Intelligence Platform) — данные и безопасность
- **AIS** (Adaptive Intelligence System) — взаимодействие с пользователем
- **AI CTO** (Product Intelligence Center) — стратегия и решения
- **AIO** (Autonomous Operations Center) — исполнение и автоматизация

### Evolution Impact Report — обязательная часть каждого отчёта

Каждый отчёт о завершении задачи обязан содержать Evolution Impact:

```
SIP:    ★★★★★  (5/5)
AIS:    ★★★★☆  (4/5)
AI CTO: ★★★☆☆  (3/5)
AIO:    ★★☆☆☆  (2/5)
```

Звёзды означают уровень влияния изменения на центр:
- ★★★★★ — критическое влияние, центр напрямую изменён
- ★★★★☆ — высокое влияние, затронуты ключевые модули
- ★★★☆☆ — среднее влияние, обновлены KPIs или evidence
- ★★☆☆☆ — низкое влияние, обновлена только документация
- ★☆☆☆☆ — минимальное влияние, центр не затронут

### Evolution Registry

Файл `landing/src/data/evolution-registry.json` содержит для каждой функции:
- `owner` — центр-владелец (SIP / AIS / AI CTO / AIO)
- `dependencies` — список других функций, от которых зависит
- `affectedCenters` — звёзды влияния на каждый центр
- `impactScore` — общий балл влияния (0-100)
- `requiredUpdates` — обязательные обновления реестров
- `tests` — обязательные тесты

### Страница /app/evolution

- **Matrix tab**: все функции с owner + affected centers звёздами
- **Impact Analysis tab**: детальный отчёт по выбранной функции
- **AI Intent tab**: демо AI Copilot Intent Detection
- **Pipeline tab**: Platform Evolution Pipeline (10 шагов)

### Platform Evolution Pipeline

Каждое изменение проходит 10 шагов:
1. Feature — изменение функции
2. Owner — определение центра-владельца
3. Evolution Analysis — анализ влияния на 4 центра
4. Affected Centers — обновление затронутых центров
5. Evidence — сбор доказательств
6. Product Readiness — обновление score
7. Architecture — обновление architecture-registry
8. Deploy — развертывание
9. Verification — проверка на production
10. Platform Updated — все реестры синхронизированы

### Product Synchronization (BLOCK 10)

После любого изменения автоматически обновляются:
- `feature-registry.json`
- `evidence-registry.json`
- `product-readiness.json`
- `architecture-registry.json`
- `evolution-registry.json`
- System Status (live page `/app/system-status`)
- Documentation (HANDOFF, CURRENT_STATE, CHANGELOG, DECISIONS)
- AI Knowledge Base (future)

### AI Copilot Intent Detection (BLOCK 7)

AI Copilot — единственная входная точка для запросов пользователя. Любой запрос проходит:

```
AI Copilot → Intent Detection → Routing → Execution Center
```

Примеры:
- "Просканируй сайт" → intent=`scan_request` → **SIP**
- "Почему готовность продукта 55%?" → intent=`readiness_inquiry` → **AI CTO**
- "Разверни новую сборку" → intent=`deploy_request` → **AIO**
- "Объясни результаты" → intent=`explain_request` → **AIS**

Функция `detectIntent(query)` в `evolution-registry.ts` реализует pattern-based intent detection с confidence score.

---

## 24. Dual Mode Architecture: User Workspace + Founder Console (INT-050)

Платформа имеет два режима интерфейса, переключаемых в Sidebar:

### User Workspace (по умолчанию)

**Целевая аудитория**: конечные пользователи SaaS-продукта.

**Принцип**: Пользователь должен понимать меню менее чем за 30 секунд. Если есть сомнения — раздел не здесь.

**Доступные разделы**:
- Command Center (главная — обзор безопасности)
- Projects, Scans, Findings, Reports
- Marketplace (Центр решений)
- Integrations (+ Repositories, SSH, API Keys, Notifications)
- Knowledge Graph, Attack Paths, Risks
- Workspace (Assets, Pipelines, History, Jobs, Monitoring)
- Playground, Documentation, Community, Settings

**Скрыто от пользователя** (только в Founder mode):
- 4 AI Centers (SIP/AIS/AI CTO/AIO)
- Architecture Map
- Evolution Matrix
- Evidence Center
- Product Readiness
- System Status

### Founder Console

**Целевая аудитория**: фаундер продукта, техническая команда.

**Принцип**: Полный инженерный контроль. Все реестры, метрики, архитектура.

**Доступные разделы**:
- AI Architecture (карта 4 центров)
- SIP / AIS / AI CTO / AIO (детальные страницы центров)
- Platform Evolution (матрица влияния)
- System Status (production readiness)
- Evidence Center (доказательства по каждой функции)
- Product Readiness (16-criteria audit)

**Принцип AIS как единая точка входа** (BLOCK 4):
Пользователь в User mode не думает "Мне идти в SIP или AI CTO?". Он общается с AIS (плавающая кнопка Copilot), который маршрутизирует запросы через `detectIntent()` в нужный центр. Внутренняя архитектура полностью скрыта.

### Auto-switch

При переходе на founder-страницу (e.g. `/app/architecture`) Sidebar автоматически переключается в Founder mode. Сохраняется в localStorage (`sip-audience`).

### При добавлении новой функции

1. Определить audience: `user` или `founder`
2. Указать `audience` поле в `SidebarSection`
3. Если `user` — функция должна быть понятна без обучения
4. Если `founder` — функция может требовать технических знаний

---

## 25. Business Impact First (BP-001)

Перед любой новой задачей агент обязан определить:

1. **Какую ценность получит пользователь?** — конкретная user value
2. **Как изменится бизнес?** — влияние на MRR/ARR/conversion/retention
3. **Какие KPI улучшатся?** — конкретные метрики (WAS, conversion rate, etc.)
4. **Какой центр платформы затронут?** — SIP / AIS / AI CTO / AIO
5. **Как это влияет на ARR?** — прямой или косвенный revenue impact

Если ответа нет — задача **не должна становиться приоритетной**.

### Примеры

✅ **Хороший task**:
- "Реализовать регистрацию (EP-002)"
- Ценность: пользователи могут создавать аккаунты
- Бизнес: открывает путь к trial → conversion
- KPI: Registration count, Trial → Paid conversion
- Центр: AIS (user flow) + AIO (backend)
- ARR: прямой — без регистрации нет paid users

❌ **Плохой task** (без business impact):
- "Добавить ещё одну вкладку в Settings"
- Ценность: неясна
- Бизнес: не влияет
- KPI: нет
- Центр: неясно
- ARR: нет

### Шаблон для новой задачи

```markdown
## Task: [название]

### Business Impact
- User value: [что получит пользователь]
- Business impact: [влияние на MRR/ARR/conversion]
- KPIs: [какие метрики улучшатся]
- Center: [SIP/AIS/AI CTO/AIO]
- ARR impact: [прямой/косвенный revenue]

### Если нет ответа хотя бы на один пункт — задача откладывается
```

### Исключения

- **Tech debt**: задачи по рефакторингу без прямой business value, но необходимые для stability
- **Compliance**: SOC2/audit задачи без прямой revenue, но необходимые для enterprise
- **Documentation**: обновление docs без прямой revenue, но необходимые для onboarding

Эти исключения должны быть явно помечены как "tech debt" / "compliance" / "docs".

---

## 26. Founder Review (4 точки зрения) — BP-001 BLOCK 9

После каждой задачи обязательна оценка с 4 точек зрения:

### 1. Engineer
- Архитектура стала лучше/хуже?
- Технический долг увеличился/уменьшился?
- Сложность поддержки?

### 2. Product (User)
- Пользователь понял что произошло?
- UX стал проще/сложнее?
- Time-to-value изменился?

### 3. CEO (Business)
- Как это влияет на revenue?
- Как это влияет на sales cycle?
- Как это влияет на competitive position?

### 4. Investor
- Как это влияет на valuation?
- Как это влияет на runway?
- Как это влияет на exit strategy?

---

## 27. Platform Evolution Report (5 Impacts) — BP-001 BLOCK 10

Каждая задача завершается отчётом с 5 impacts:

1. **Technical Impact** — что изменилось в коде/архитектуре
2. **Product Impact** — что изменилось для пользователя
3. **Business Impact** — что изменилось для бизнеса
4. **Commercial Impact** — что изменилось для коммерции
5. **Investment Impact** — что изменилось для инвесторов

Пример:
```
Technical: добавлен auth module, +500 строк кода
Product: пользователь может регистрироваться
Business: открывает path to revenue
Commercial: поднимает Commercial Readiness с 18% до 25%
Investment: показывает investors что product готов к monetization
```

---

## 28. Evidence Before Roadmap (BP-002)

Перед реализацией любой крупной функции агент обязан ответить:

1. **Какая подтверждённая проблема пользователей решается?** — ссылка на problem-registry.json
2. **Сколько интервью это подтвердили?** — минимум 3 интервью для P0, 1 для P1
3. **Есть ли хотя бы один потенциальный клиент, который сказал, что это важно?** — ссылка на interview-NNN.md
4. **Это подтверждённый запрос или гипотеза?** — статус из assumptions.json

### Если это гипотеза — функция должна быть помечена как `experiment`

Эксперименты:
- Получают метку `experiment` в feature-registry.json
- Имеют explicit success criteria (например: "10 пользователей используют за 30 дней")
- Имеют kill criteria (например: "если <3 пользователей за 60 дней — удалить")
- Не входят в Pro/Business/Enterprise планы пока не validated

### Шаблон для новой функции

```markdown
## Feature: [название]

### Evidence
- Problem: PROBLEM-XXX (validated в N интервью)
- Interviews: interview-001, interview-002, interview-003
- Assumption: ASSUMPTION-XXX (Validated)
- Customer quote: "..." (interview-002)

### Если это experiment
- Status: experiment
- Success criteria: [измеримый критерий]
- Kill criteria: [когда удалить]
- Duration: 60 дней
```

### Исключения

- **Compliance** (SOC2, GDPR): не требует customer interviews, требует regulatory
- **Security fixes**: не требует customer interviews, требует threat model
- **Tech debt**: не требует customer interviews, требует engineering justification

Эти исключения должны быть явно помечены как "compliance" / "security" / "tech-debt".

---

## 29. Human-First Security (PX-004)

Любая техническая информация сначала переводится на язык бизнеса. Только потом — при необходимости — показываются инженерные детали.

### Принцип

Платформа = **AI Security Advisor**, а не "инженерный инструмент".

Пользователь (руководитель) задаёт вопросы:
- Что произошло?
- Насколько это опасно для моего бизнеса?
- Что делать первым?
- Сколько это займёт?
- Что отправить разработчику?

### Структура каждого отчёта

1. **AI Executive Summary** (2-3 предложения) — первым
2. **3-5 ключевых действий** — отсортированы по бизнес-эффекту, не по CVSS
3. **Каждая проблема**:
   - Что произошло (на языке бизнеса)
   - Чем грозит бизнесу (деньги, репутация, compliance)
   - Сколько времени займёт исправление
   - Рекомендуемый следующий шаг
4. **Технические детали** (CVE, CVSS, порты, JSON) — в раскрывающемся блоке

### Кнопки для каждой проблемы

- **"Скопировать задачу разработчику"** — готовое описание для Jira/GitHub Issues/Linear
- **"Объяснить проще"** — AI переформулирование ещё понятнее

### Запрет

Запрещено показывать пользователю (в User mode):
- CVE ID в основном заголовке
- CVSS score в основном заголовке
- Технические названия (TLS 1.0, OWASP, cipher suites) без перевода
- Raw JSON/SARIF output без объяснения

Всё это — только в раскрывающемся блоке "Технические детали".

### Библиотека переводов

`landing/src/lib/findings-translator.ts` содержит:
- 10 категорий проблем с бизнес-переводом (ssl_expired, default_credentials, sql_injection, etc.)
- Для каждой: businessTitle, businessImpact, fixTime, nextStep, simpleExplanation, developerTask
- `generateExecutiveSummary()` — AI-резюме в 2-3 предложения
- `sortByBusinessImpact()` — сортировка по бизнес-эффекту, не по CVSS
- `getTopActions()` — топ 3-5 действий

### Value-First Development (постоянное правило)

Любая новая функция должна отвечать на вопрос:

> "Повысит ли она вероятность того, что пользователь получит ценность быстрее, доверится продукту сильнее или станет платящим клиентом?"

Если ответ отрицательный — функция не должна иметь приоритет, даже если она технически интересна.

---

## 30. Recovery First (PX-005)

Любая задача считается выполненной только если существует:

1. ✅ **Локально** — `git rev-parse HEAD` показывает commit с изменениями
2. ✅ **GitHub** — `git ls-remote origin main` показывает тот же commit
3. ✅ **Сервер** — `/var/www/sec-scanner-build` на том же commit
4. ✅ **Production** — `curl https://sec-scanner.pro/<route>` возвращает 200 с новым контентом

Если хотя бы один слой отсутствует — задача считается **INCOMPLETE**.

### Запрет tar-деплоя

Tar-деплой (загрузка файлов напрямую на сервер без git) запрещён как основной способ. Только:
1. `git commit` (LOCAL)
2. `git push` (GITHUB)
3. `git pull` на сервере (SERVER)
4. `next build` + `cp out/* /var/www/sec-scanner.pro/` (PRODUCTION)

---

## 31. Deployment Report (PX-005)

После каждой задачи автоматически формируется Deployment Report:

```
DEPLOYMENT REPORT
=================

LOCAL
  Commit: <hash>
  Status: OK / FAIL

GITHUB
  Commit: <hash>
  Status: OK / FAIL

SERVER
  Commit: <hash>
  Status: OK / FAIL

PRODUCTION
  Version: <hash>
  HTTP: 200 / FAIL
  Status: OK / FAIL

ALL LAYERS: ✅ COMPLETE / ❌ INCOMPLETE
```

Если хотя бы один слой отсутствует: `STATUS: INCOMPLETE` — без исключений.

---

## 32. Evidence Before Conclusion (PX-005)

Запрещается писать:
- "Done"
- "Ready"
- "Completed"
- "Successfully deployed"

без доказательств.

### Принцип: Сначала Evidence, потом Conclusion

Каждое заявление о завершении должно сопровождаться:
- `git rev-parse HEAD` — commit hash
- `curl -s -o /dev/null -w '%{http_code}'` — HTTP статус
- Скриншот (для UI изменений)
- `git ls-remote origin main` — подтверждение push

Без evidence — заявление не действительно.

---

## 33. Repository First (PX-005)

Перед началом любой новой задачи модель обязана:

1. **Проверить состояние LOCAL**: `git status` — должен быть clean
2. **Проверить текущий commit**: `git rev-parse HEAD`
3. **Сверить с GITHUB**: `git ls-remote origin main` — должен совпадать
4. **Сверить с SERVER**: SSH `cd /var/www/sec-scanner-build && git rev-parse HEAD`

Только после подтверждения синхронизации всех слоёв — приступать к реализации.

Если слои рассинхронизированы — сначала восстановить синхронизацию (Rule 30), потом начинать новую задачу.

---

## 34. Value First Evolution (CX Master)

Запрещается делать новую функцию. Разрешается делать только то, что увеличивает минимум один показатель:

1. **Time To First Value** (TTFV) — время от открытия до первого результата
2. **Trust** — доверие к продукту
3. **Understanding** — понимание что это и зачем
4. **WOW Effect** — эмоция "вау"
5. **Conversion** — вероятность стать платящим
6. **Retention** — вероятность остаться

Если изменение не влияет ни на один показатель — оно не имеет приоритета, даже если технически интересно.

---

## 35. Hypothesis-Based Development (CX Master)

Каждая задача должна начинаться с гипотезы и заканчиваться проверкой:

```
Гипотеза: [что улучшится и на сколько]
Изменения: [что реализовано]
Ожидаемый эффект: [какие метрики должны улучшиться]
Проверка: [что нужно измерить после деплоя]
```

Запрещается формат "Сделан новый Hero". Только:

```
Гипотеза: новый Hero повысит понимание продукта с 70% до 85%.
Изменения: убраны 3 секции, добавлен domain input.
Ожидаемый эффект: TTFV 180s→60s, Understanding 70%→85%.
Проверка: user test 5 сек, agent-browser timeline.
```

### Главная KPI система

| KPI | Сейчас | Цель |
|-----|--------|------|
| Понимание за 5 сек | 70% | 95% |
| Желание проверить сайт | 40% | 90% |
| Доверие | ~60% | 95% |
| Time To First Value | ~180 сек | ≤60 сек |
| WOW Score | ~45% | ≥90% |
| Конверсия Hero → Scan | Не измеряется | +50% |
| Конверсия Report → Pricing | Не измеряется | +40% |
| Конверсия Pricing → Checkout | 0% | ≥60% |
