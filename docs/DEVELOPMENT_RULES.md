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
