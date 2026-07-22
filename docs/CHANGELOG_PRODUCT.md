# CHANGELOG_PRODUCT.md — Продуктовый чейнджлог

> Только видимые пользователю изменения. Технические детали — в git log.

---

## INT-050 — 2026-07-21 (Product Packaging & Navigation Redesign)

### Что изменилось для пользователя

1. **Sidebar разделён на 2 режима**: User Workspace (по умолчанию, 15 пунктов) и Founder Console (9 пунктов)
2. **Переключатель User/Founder** в верхней части sidebar с localStorage persistence
3. **Auto-switch**: при переходе на founder-страницу (/app/architecture, /app/evolution, /app/evidence, /app/product-readiness, /app/system-status) sidebar автоматически переключается в Founder mode
4. **USER WORKSPACE label**: подсвечивает текущий режим
5. **User mode скрывает**: 4 AI Centers, Architecture, Evolution, Evidence, Product Readiness, System Status — пользователь видит только продукт, не инженерные инструменты
6. **Founder mode скрывает**: Scanner, Reports, Marketplace, и т.д. — фаундер видит только инженерные метрики

### BLOCK 8: Founder Review (письменные ответы)

**Архитектура — стала ли понятнее?** Да. Разделение User/Founder наконец-то решает ключевую проблему: пользователь не должен видеть инженерные инструменты (Evolution Matrix, Evidence Registry, Product Readiness), а фаундер не должен копаться в пользовательских разделах. Score: 8/10.

**Масштабируемость — можно ли добавить 20 модулей без хаоса?** Да. Каждый новый раздел получает `audience` поле и автоматически попадает в нужный режим. Sidebar не станет длиннее 15 пунктов в User mode. Score: 8/10.

**Брендинг — чувствуется ли единая AI-платформа?** Частично. В Founder mode — да, видно 4 центра и их взаимодействие. В User mode — нет, пользователь видит обычный SaaS без упоминания AI. Это намеренно: пользователь не должен видеть инженерную сложность. Score: 7/10.

**Коммерческая готовность — выглядит ли как SaaS за тысячи долларов?** User mode — да, выглядит чисто и профессионально. Но доверие подрывает Trust Audit (TRUST-002: mock integrations, TRUST-003: fake progress bar). Пока эти trust findings не закрыты, коммерческая готовность ограничена. Score: 6/10.

**Технический долг — что мешает развитию?** (1) Backend на INT-036, не синхронизирован. (2) 7 trust findings открыты. (3) SoloNotification.tsx deprecated но не удалён. (4) Нет реальной аутентификации. (5) AIO автоматизация 37% — деплой ручной.

### BLOCK 9: User Review (как новый пользователь)

**Первое впечатление (30 секунд):** Открываю /app/command-center. Вижу 4 health cards (Security 94%, Platform 55%, AIS 82%, Automation 37%). Числа понятны. Recommendations показывают что делать. Next Actions — быстрые ссылки. Вроде ясно: это платформа безопасности с метриками.

**Навигация:** Sidebar показывает "USER WORKSPACE" с пунктами: Проекты, Сканирование, Отчёты, Центр решений, Интеграции, Карта инфраструктуры, Пути атаки, Риски, Рабочее пространство, Документация, Сообщество, Настройки. Всё логично. 12 пунктов — терпимо. Не вижу перегрузки.

**AIS:** Вижу плавающую кнопку в правом нижнем углу. Нажал — открылась панель "Adaptive Intelligence System" с 3 вкладками (Навигация/Цель/Уверенность). Понятно что это помощник. Но не до конца ясно, чем он отличается от обычного чата. Score: 6/10 — нужно лучше объяснить ценность.

**Терминология:** "Adaptive Intelligence System" — звучит сложно. "Command Center" — OK. "Knowledge Graph" — технический термин, но визуально понятен. "Attack Paths" — OK. В целом терпимо.

**Доверие:** Выглядит профессионально. Тёмная тема работает. Метрики реалистичные. НО: когда нажимаю "Connect" в Integrations, появляется success, но я не уверен что реально что-то подключилось. Это смущает.

**Что хочется убрать:** Может быть Playground — не ясно зачем он обычному пользователю. Также "Документация" и "Сообщество" — может быть в отдельном меню?

**Что хочется показать раньше:** Кнопку "Запустить сканирование" прямо на Command Center — чтобы за 1 клик начать первую полезную задачу.

### BLOCK 10: Product Score

**Founder Score (по 10-балльной):**
- Архитектура: 8/10 (разделение User/Founder решило ключевую проблему)
- Масштабируемость: 8/10 (audience field позволяет добавлять модули)
- Простота развития: 7/10 (Rule 24 + audience работают, но нет автоматизации AIO)
- Брендинг: 7/10 (Founder mode хорош, User mode намеренно скрывает AI)
- Коммерческая упаковка: 6/10 (trust findings подрывают доверие)
- **Founder Average: 7.2/10**

**User Score (по 10-балльной):**
- Понятность: 7/10 (Command Center ясен, но AIS название сложное)
- Простота: 8/10 (15 пунктов sidebar — терпимо)
- Скорость освоения: 7/10 (за 30 секунд понятно что делать)
- Логичность навигации: 8/10 (USER WORKSPACE логично)
- Желание пользоваться: 6/10 (доверие подрывает mock integrations)
- **User Average: 7.2/10**

### BLOCK 11: Honest Critique

**Что получилось отлично:**
- Разделение User/Founder mode — это правильное архитектурное решение. Пользователь больше не видит Engineering-инструменты.
- Auto-switch при переходе на founder-страницы — UX-friendly.
- Переключатель компактный, не занимает много места.
- localStorage persistence — режим сохраняется между сессиями.

**Что получилось средне:**
- Founder mode показывает 9 пунктов, но они не сгруппированы. Можно было бы сделать подкатегории (Architecture / Evolution / Evidence / Readiness).
- AIS в User mode остаётся под именем "Adaptive Intelligence System" — для пользователя это технический термин.
- Command Center в User mode показывает "Automation (AIO) 37%" — пользователь не знает что такое AIO.

**Что всё ещё плохо:**
- 7 trust findings (mock integrations, fake progress bar) — это критично для коммерческой готовности.
- Backend на INT-036 — отставание 13+ этапов.
- Нет реальной аутентификации — любой может войти.
- AIO автоматизация 37% — деплой всё ещё ручной.

**Что лично я бы переделал, если бы был владельцем:**
1. **Срочно закрыть 2 critical trust findings** (TRUST-002 mock integrations, TRUST-003 fake progress). Без этого коммерческая готовность невозможна.
2. **Реальная аутентификация** — SSO или хотя бы email/password. Без этого нет персонализации.
3. **Переименовать AIS в User mode** — "AI Помощник" или "Ассистент", скрыть "Adaptive Intelligence System".
4. **На Command Center добавить большую кнопку "Запустить сканирование"** — чтобы пользователь за 1 клик начал первую задачу.
5. **Backend синхронизация** — обновить /root/sec-scanner-workspace с INT-036 до INT-050.

### BLOCK 12: Финальная демонстрация

**👤 Я — фаундер:**
- Стал ли продукт лучше как бизнес? **Да** — разделение User/Founder наконец-то делает платформу коммерчески пригодной. Можно показывать инвесторам Founder mode (инженерная глубина), а клиентам — User mode (простой SaaS).
- Стал ли легче масштабироваться? **Да** — `audience` field позволяет добавлять модули без хаоса в sidebar.
- Смогу ли показывать инвесторам? **Да, в Founder mode**. В User mode — пока trust findings не закрыты, нет.
- Чувствуется ли единая философия? **Да в Founder mode** (4 центра видны). В User mode философия скрыта намеренно.

**👤 Я — новый пользователь:**
- Понял ли платформу без инструкции? **Да, за 30 секунд**. Command Center даёт обзор, sidebar показывает куда нажимать.
- Захотел ли пользоваться? **Да, но с осторожностью**. Доверие подрывает mock integrations.
- Доверяю ли продукту? **Частично**. Выглядит профессионально, но mock данные смущают.
- Что бы смутило? (1) Integrations показывают success без реального подключения. (2) AIS название сложное. (3) Нет кнопки "Начать сканирование" на главной.

### Итоговые вердикты

**Вердикт фаундера:** Продукт готов к масштабированию архитектурно (User/Founder разделение правильное), но НЕ готов коммерчески из-за 2 critical trust findings. Нужно закрыть TRUST-002 и TRUST-003 перед показом клиентам.

**Вердикт пользователя:** Продукт вызывает желание продолжить использование после первого знакомства, НО доверие подрывается mock integrations. Если закрыть trust findings — продукт будет готов к retention.

### Технические изменения

- Изменённые: AppSidebar.tsx (audience field + toggle UI + auto-switch + localStorage), DEVELOPMENT_RULES.md (+Rule 24 Dual Mode Architecture), feature-registry.json (+PLAT-024), feature-evidence.json (+PLAT-024), i18n.ts (+5 sidebar.audience/userWorkspace/founderConsole keys RU+EN)
- Коммиты: 0d6dfaf INT-050: Product Packaging & Navigation Redesign

### Evolution Impact Report (Rule 23)

```
SIP:    ★★☆☆☆  (2/5) — косвенно, sidebar влияет на навигацию к SIP страницам
AIS:    ★★★☆☆  (3/5) — AIS остаётся точкой входа, но скрыт в User mode
AI CTO: ★★★★★  (5/5) — Founder Console = AI CTO инструменты, Rule 24 добавлен
AIO:    ★☆☆☆☆  (1/5) — не затронут
```

---

## INT-049 — 2026-07-21 (Platform Evolution Framework & Unified Workspace)

### Что изменилось для пользователя

1. **Новая страница `/app/command-center`** — заменяет Dashboard как главная страница. Показывает статус всех 4 центров: Security Health (SIP 94%), Platform Health (55%), AIS Status (82%), Automation (AIO 37%)
2. **Новая страница `/app/evolution`** — Evolution Matrix с 4 табами: Matrix (62 features с owner + stars), Impact Analysis, AI Intent Detection, Pipeline
3. **Dynamic Two-Level Navigation**: Sidebar реструктурирован — первый уровень (4 AI Centers + Command Center + Evolution + Architecture), второй уровень (Platform Tools: Scanner, Reports, Marketplace, и т.д.)
4. **AI Copilot Intent Detection**: вводишь запрос → определяется intent → маршрутизация в центр. Пример: "Просканируй сайт" → SIP, "Разверни новую сборку" → AIO
5. **Evolution Impact Analysis**: каждая функция имеет owner center + 4-center stars + impact score + evolution chain + required updates + tests
6. **Rule 23 Platform Evolution**: любая задача не завершена без Evolution Impact Report (4 звезды для каждого центра)

### BLOCK 12 Product Review (обязательный)

**Что изменилось для пользователя**: Появились Command Center и Evolution Matrix. Sidebar реструктурирован с 4 центрами на первом уровне.

**Как изменилась архитектура**: Каждая функция теперь имеет owner center (SIP/AIS/AI CTO/AIO) и evolution impact map.

**Какие центры были затронуты**: ALL 4 (SIP, AIS, AI CTO, AIO) — Command Center агрегирует данные из всех центров.

**Какие новые связи появились**: Command Center → 4 centers; Evolution Matrix → Feature Registry + Architecture Registry + Evidence Registry.

**Как изменилась навигация**: Sidebar первый уровень = 4 centers + Command Center + Evolution + Architecture. Второй уровень = platform tools.

**Какие сценарии стали проще**: Главная страница теперь Command Center с overview всех центров (вместо分散ённых dashboard/scanner/reports).

**Какие регрессии проверены**: Все 11 ключевых страниц возвращают HTTP 200 с уникальным контентом. Dashboard по-прежнему доступен.

**Что автоматически распространилось**: PLAT-021..023 добавлены в feature-registry + evidence. Architecture Registry unchanged ( centers scores unchanged).

**Скриншоты**: 25-command-center.png, 26-evolution-matrix.png, 27-evolution-intent.png, 28-evolution-intent-sip.png

**E2E проверка 4 центров**: /app/architecture/{sip,ais,cto,aio} все HTTP 200

**AI Copilot routing**: "Просканируй сайт" → scan_request → SIP (подтверждено через agent-browser)

**Evolution Engine**: 62 features имеют owner + affectedCenters + impactScore в evolution-registry.json

**GitHub → Server → Production → Evidence**: commit d4454a5 на всех 4 источниках

### Технические изменения

- Новые файлы: evolution-registry.json (62 features), evolution-registry.ts (TypeScript + analyzeEvolutionImpact + detectIntent), /app/evolution/page.tsx (4-tab UI), /app/command-center/page.tsx (unified control)
- Изменённые: DEVELOPMENT_RULES.md (+Rule 23 Platform Evolution), AppSidebar.tsx (restructured 2-level navigation), AppLayout.tsx (+7 breadcrumb keys), feature-registry.json (+PLAT-021..023), feature-evidence.json (+3 entries), i18n.ts (+50 evolution.* + command.* keys, +7 sidebar center keys)
- Коммиты: 7006bbe → 97a0e62 → 414cfee → 23197dc → 9ebf405 → d4454a5 INT-049

### Evolution Impact Report (Rule 23)

```
SIP:    ★★★★☆  (4/5) — Dashboard обновлён, Command Center агрегирует SIP данные
AIS:    ★★★☆☆  (3/5) — Sidebar перестроен, AIS центр на первом уровне
AI CTO: ★★★★★  (5/5) — Evolution Registry создан, Rule 23 добавлен
AIO:    ★★☆☆☆  (2/5) — AIO центр на первом уровне sidebar, но автоматизация не реализована
```

---

## INT-048 — 2026-07-21 (Unified AI Architecture: SIP + AIS + AI CTO + AIO)

### Что изменилось для пользователя

1. **Новая страница `/app/architecture`** (AI Архитектура) — доступна из sidebar (Network icon)
2. **4 центра ответственности** с готовностью: SIP 94%, AIS 82%, AI CTO 61%, AIO 37%
3. **4 детальные страницы**: /app/architecture/{sip,ais,cto,aio}
4. **Communication Graph**: 9 связей между центрами (AIS←SIP, AI CTO→AIO, AIO→SIP, и т.д.)
5. **AI Routing Engine**: 4 правила маршрутизации запросов по центрам + fallback
6. **Future AI Agents**: 5 запланированных (Security Analyst, Threat Hunter, DevSecOps, Compliance, Executive)
7. **Unified Terminology**: SIP/AIS/AI CTO/AIO/AI Copilot — канонические термины
8. **Rule 22 Architecture Governance**: новая функция не может быть реализована без назначения центра

### Где это увидеть

- `/app/architecture` — большая карта с 4 центрами
- `/app/architecture/sip` — Security Intelligence Platform detail
- `/app/architecture/ais` — Adaptive Intelligence System detail
- `/app/architecture/cto` — AI CTO Product Intelligence Center detail
- `/app/architecture/aio` — AIO Autonomous Operations Center detail
- Скриншоты: `/home/z/my-project/int044/screenshots/23-architecture-map.png`, `24-architecture-sip.png`

### Как проверить

1. Открыть https://sec-scanner.pro/app/architecture
2. Проверить 4 центра: SIP 94%, AIS 82%, AI CTO 61%, AIO 37%
3. Кликнуть на любой центр → детальная страница с модулями, KPIs, коммуникациями
4. Прокрутить вниз до Communication Graph, AI Routing, Future Agents, Unified Terminology

### Технические изменения

- Новые файлы: architecture-registry.json (4 centers + 9 communication links + 20 responsibility matrix entries + 4 routing rules + 5 future agents + 4 explainability examples), architecture-registry.ts (TypeScript module + routeQuestion()), 5 pages (/app/architecture + 4 detail), CenterDetail.tsx shared component
- Изменённые: DEVELOPMENT_RULES.md (+Rule 22 Architecture Governance), AppSidebar.tsx (+Architecture link), AppLayout.tsx (+breadcrumb), feature-registry.json (+PLAT-016..020), feature-evidence.json (+5 entries), i18n.ts (+28 architecture.* keys, удалены 4 устаревших дубликата)
- Коммиты: 968c088 → 5e39d6b → 186024b INT-048: Unified AI Architecture

### Agent Quality Control (Rule 18)

**Проверено автоматически**: npx next build exit 0; curl /app/architecture = 200 (76894 bytes); curl /app/architecture/{sip,ais,cto,aio} = 200 (74129-76251 bytes); git rev-parse HEAD 186024b = LOCAL = GITHUB = SERVER; agent-browser snapshot подтверждает DOM (4 centers с scores, Communication Graph, AI Routing, Future Agents, Unified Terminology); TypeScript type check без ошибок.

**Проверено вручную**: визуальная проверка через скриншоты 23-24; клик на SIP card → переход на /app/architecture/sip с модулями Security Engine, Risk Engine, и т.д.; отображение всех 12 SIP modules с readiness scores.

**Не удалось проверить**: переход на AIS/CTO/AIO detail pages (только SIP проверен визуально); AI Copilot routing в действии.

**Требует проверки владельцем**: реальная интеграция AI Copilot с routing engine; real backend operations для AIO modules.

---

## INT-046 — 2026-07-21 (Product Completeness Audit & Production Readiness)

### Что изменилось для пользователя

1. **Новая страница `/app/product-readiness`** (Готовность продукта) — доступна из sidebar (TrendingUp icon)
2. **7 вкладок**: Обзор / Функции (57) / Trust аудит (7) / UX аудит (6) / User Journey (7) / Доступность (9) / Roadmap (10)
3. **Executive Summary**: "Платформа функционально реализована на 91%, но продуктово готова на 55%"
4. **4 статуса для каждой функции**: Technical / Evidence / Product / Production (Rule 21)
5. **Product Score для каждой функции**: 16 критериев (empty/loading/error states, mobile, dark theme, и т.д.)
6. **Product Debt**: автоматический список пунктов долга для каждой функции
7. **Trust Audit**: 7 находок (2 critical, 2 high, 2 medium, 1 low) — где пользователь может подумать "это ненастоящее"
8. **Roadmap TOP-10**: приоритизированный список задач по влиянию на продукт

### Где это увидеть

- `/app/product-readiness` — главная страница
- `/app/product-readiness` → "Функции" → клик на функцию → 4 статуса + scores + Product Debt
- `/app/product-readiness` → "Roadmap" → TOP-10 приоритетов
- Скриншоты: `/home/z/my-project/int044/screenshots/20-product-readiness-overview.png`, `21-features.png`, `22-roadmap.png`

### Как проверить

1. Открыть https://sec-scanner.pro/app/product-readiness
2. Проверить Executive Summary: "91% functional, 55% product ready"
3. Кликнуть "Функции" → 57 функций с scores
4. Кликнуть любую функцию → 4 статуса + Product Debt
5. Кликнуть "Roadmap" → TOP-10 приоритетов

### Что ещё не реализовано (key gaps из Executive Summary)

1. Завершение UX (empty/loading/error states на всех страницах)
2. Адаптация мобильной версии (mobile-first вместо responsive)
3. Повышение доступности (screen reader, keyboard navigation)
4. Персонализация AIS (ручная настройка роли, server-side persistence)
5. Реальные интеграции (замена mock toggle на реальные подключения)

### Какие риски существуют

- **Product readiness 55%**: разрыв между "функция существует" и "функция готова для ежедневного использования"
- **7 trust findings**: места, где пользователь может подумать что это ненастоящее (mock integrations, fake progress, fake email sending)
- **Backend на INT-036**: не синхронизирован с GitHub INT-046

### Agent Quality Control (Rule 18)

**Проверено автоматически**: npx next build exit 0; curl /app/product-readiness = 200 (62919 bytes); git rev-parse HEAD 1c13b0e = LOCAL = GITHUB = SERVER; agent-browser snapshot подтверждает DOM (57 features, 7 trust, 6 UX, 7 journey, 9 a11y, 10 roadmap); TypeScript type check без ошибок.

**Проверено вручную**: визуальная проверка через скриншоты 20-22; кликабельность табов (Features, Roadmap); отображение Executive Summary с правильными числами (91% / 55%).

**Не удалось проверить**: Safari browser; Mobile viewport; real-time score updates.

**Требует проверки владельцем**: реальная регистрация/аутентификация; backend operations; performance под нагрузкой.

### Технические изменения

- Новые файлы: landing/src/data/product-readiness.json (57 features + audits), landing/src/lib/product-readiness.ts, landing/src/app/(app)/app/product-readiness/page.tsx
- Изменённые: docs/DEVELOPMENT_RULES.md (+Rule 21 Four Statuses), AppSidebar.tsx (+Product Readiness link), AppLayout.tsx (+breadcrumb), feature-registry.json (+PLAT-015), feature-evidence.json (+PLAT-015), i18n.ts (+60 readiness.* keys)
- Коммиты: 7e4d235 → f816729 → 1c13b0e INT-046: Product Completeness Audit & Production Readiness

---

## INT-045 — 2026-07-21 (Evidence-Driven Development & Product Verification System)

### Что изменилось для пользователя

1. **Новая страница `/app/evidence`** (Центр доказательств) — доступна из sidebar
2. **6 вкладок**: Обзор, Все функции (56), Verified (28), Partial (4), Broken (2), AIS модули (10)
3. **Production Consistency панель**: SHA LOCAL/GITHUB/SERVER/PRODUCTION + статус IN SYNC / OUT OF SYNC
4. **AIS Module-Level Verification**: 10 модулей с индивидуальными статусами (9 verified, 1 partial)
5. **Для каждой функции** (раскрывается по клику): commit, production URL, дата проверки, 6 checks (build/production/browser/e2e/regression/visual), скриншоты
6. **Sidebar**: новый пункт "Центр доказательств" (ShieldCheck icon)

### Где это увидеть

- `/app/evidence` — главная страница Evidence Center
- `/app/evidence` → вкладка "AIS модули" — 10 модулей с детальными статусами
- `/app/evidence` → клик на любую функцию — раскрываются детали

### Как проверить

1. Открыть https://sec-scanner.pro/app/evidence
2. Проверить панель "Синхронизация источников" — должен быть IN SYNC
3. Кликнуть "Все функции" — должны отобразиться 56 функций
4. Кликнуть любую функцию (например AIS-001) — раскроются commit, URL, 6 checks
5. Кликнуть "AIS модули" — 10 модулей с индивидуальными статусами
6. Скриншоты: /home/z/my-project/int044/screenshots/17,18,19-evidence-*.png

### Что ещё не реализовано

- Real-time production consistency (сейчас build-time snapshot)
- Video evidence (поле есть, ни одна функция не имеет)
- Changed files (поле пустое — TODO: git diff автозаполнение)
- Backend sync (/root/sec-scanner-workspace всё ещё на INT-036)

### Какие ограничения остались

- Evidence обновляется только при пересборке feature-evidence.json
- Нет автоматического запуска checks после deploy (TODO: CI/CD)
- Sounds module AIS-005 имеет partial из-за browser autoplay policy

### Какие риски существуют

- Backend на INT-036 — frontend не сможет получать данные при поломке
- SoloNotification.tsx deprecated но не удалён
- feature-evidence.json растёт — при 200+ функциях может потребоваться pagination

### Agent Quality Control (Rule 18)

**Проверено автоматически**: npx next build exit 0; curl /app/evidence = 200 (55552 bytes); git rev-parse HEAD c43857f = LOCAL = GITHUB = SERVER; agent-browser snapshot подтверждает DOM (28 verified, 4 partial, 2 broken, 10 AIS); TypeScript type check без ошибок.

**Проверено вручную**: визуальная проверка через скриншоты 17-19; кликабельность табов; раскрытие деталей функции по клику; Production Consistency панель показывает IN SYNC.

**Не удалось проверить**: Safari browser; Mobile viewport; Real-time production consistency.

**Требует проверки владельцем**: Реальная регистрация/аутентификация; Backend operations; Performance под нагрузкой; Real-time evidence updates.

### Технические изменения

- Новые файлы: docs/KNOWN_REGRESSIONS.md, landing/src/app/(app)/app/evidence/page.tsx, landing/src/data/feature-evidence.json, landing/src/lib/evidence-registry.ts
- Изменённые: docs/DEVELOPMENT_RULES.md (+Rules 16-20), AppSidebar.tsx (+Evidence link), AppLayout.tsx (+breadcrumb), feature-registry.json (+PLAT-014), i18n.ts (+60 evidence.* keys)
- Коммиты: 029acf2 → c43857f INT-045: Evidence-Driven Development

---

## INT-044 — 2026-07-21 (Repository Recovery & Production Synchronization)

### Что было (БЫЛО — состояние до INT-044)

- 3 разные версии кода на сервере (build dir INT-038, /root/sec-scanner-workspace INT-036, GitHub INT-040 v2)
- Production содержал "призрачную" страницу /app/system-status, отсутствующую в git
- /app/platform-status на production возвращал 404 fallback на index.html
- /app/debug/features на production возвращал 404 fallback на index.html
- Backend работал через systemd, но документация заявляла "не запущен"
- SoloNotification.tsx оставался как мёртвый код
- Документация (HANDOFF, CURRENT_STATE, CHANGELOG) устарела на 3-6 этапов
- INT-039, INT-041, INT-042 отсутствовали в git-истории

### Восстановлено (после INT-044)

| Что восстановлено | Где | Commit | Production URL |
|-------------------|-----|--------|----------------|
| `/app/system-status` страница | landing/src/app/(app)/app/system-status/page.tsx | a8500f7 | https://sec-scanner.pro/app/system-status (HTTP 200, 116560 bytes) |
| `/app/debug/features` Developer Overlay | landing/src/app/(app)/app/debug/features/page.tsx | 6cad6c1 | https://sec-scanner.pro/app/debug/features (HTTP 200, 69256 bytes) |
| `/app/platform-status` redirect | landing/src/app/(app)/app/platform-status/page.tsx | 6cad6c1 | https://sec-scanner.pro/app/platform-status (HTTP 200, redirect to /app/system-status) |
| 61 i18n ключ registry.* | landing/src/lib/i18n.ts | 06a04e8 | видны в продакшн |
| 7 статусов Feature Registry | landing/src/lib/feature-registry.ts | a8500f7 | работает на /app/system-status |
| Evidence-Based Development rule | docs/DEVELOPMENT_RULES.md (Rule 15) | 06a04e8 | документация |
| Sidebar ссылка → /app/system-status | landing/src/components/layout/AppSidebar.tsx | 06a04e8 | видна в продакшн |
| Backup pre-deploy | /backup/sec-scanner-pro-pre-int044 (12M) | — | сервер |

### Не удалось восстановить

- INT-039, INT-041, INT-042 — нет следов в git-истории всех веток. Вероятно, эти задачи выполнялись, но никогда не коммитились. Содержание задач неизвестно.
- Оригинальный исходник `/app/system-status` (до реконструкции) — не найден нигде на сервере. Реконструирован из production HTML.

### Видимые пользователю изменения

1. **Sidebar**: ссылка "Статус платформы" теперь ведёт на `/app/system-status` (раньше вела на `/app/platform-status`, который возвращал 404 fallback)
2. **Новая страница /app/system-status**: показывает готовность платформы (74%), 12 модулей с VERIFIED/PARTIAL/FAIL статусами, даты последних проверок, E2E-результаты, скриншот-статусы
3. **4 принципа верификации видны**: Never Trust Code, No Completion Without E2E, Production Is The Source Of Truth, Every Feature Must Have Evidence
4. **Pipeline агента виден**: Код → Build → Deploy → Проверка → E2E → Обновление статуса → Готово
5. **Восстановлена /app/debug/features**: Developer Overlay для администраторов (раньше 404)
6. **/app/platform-status**: теперь автоматически редиректит на /app/system-status (раньше показывал index.html)

### Технические изменения

- `feature-registry.json`: 36 features мигрировано с `implemented` на новые статусы (verified/partial/broken/not_started/deprecated)
- `feature-registry.ts`: добавлены типы `partial` и `verified`, функции `normalizeStatus`, `isVerified`, `isWorking`, `isBroken`, новые readiness формулы с штрафом за broken/missing/deprecated
- Добавлен PLAT-013 System Status Center (verified)
- SoloNotification.tsx помечен как deprecated (AIS-007)
- PLAT-001 помечен как broken (заменён на PLAT-013)
- AIS-008 (debug/features) восстановлен — теперь работает на production

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
