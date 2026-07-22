# DECISIONS.md — Журнал архитектурных решений

> Каждое решение имеет дату, контекст и обоснование.

---

## ADR-001: AIS — официальное название

**Дата**: 2026-07-20 (INT-036)  
**Решение**: Система интеллектуального сопровождения называется «AIS — Adaptive Intelligence System»  
**Контекст**: Нужен был бренд для системы, которая не является чат-ботом и не является FAQ  
**Обоснование**: Название подчёркивает адаптивность (Adaptive) и интеллектуальность (Intelligence), отличает от простых помощников  

---

## ADR-002: GuideAssistant заменён на AISAssistant

**Дата**: 2026-07-20 (INT-036)  
**Решение**: Компонент GuideAssistant удалён из AppLayout и заменён на AISAssistant  
**Контекст**: GuideAssistant был простым виджетом с подсказками. AIS — полноценная система сопровождения.  
**Обоснование**: AISAssistant обеспечивает контекстность, адаптивность, звуковое сопровождение — всё, чего не было в GuideAssistant  
**Влияние**: GuideAssistant.tsx всё ещё существует в коде, но не используется. Подлежит удалению.  

---

## ADR-003: Уведомления только после реального события

**Дата**: 2026-07-20 (INT-036)  
**Решение**: AIS уведомления появляются только после реального действия пользователя или системы  
**Контекст**: Ранее подсказки могли появляться при загрузке страницы, что создавало фейковые состояния  
**Обоснование**: Event Driven UI — пользователь должен доверять платформе. Сообщения без причины разрушают доверие.  

---

## ADR-004: Demo данные всегда маркируются

**Дата**: 2026-07-18 (INT-031)  
**Решение**: Все demo/mock данные обязаны иметь визуальную пометку DemoBadge  
**Контекст**: Пользователь может принять demo-данные за реальные результаты сканирования  
**Обоснование**: Zero Fake State — честность важнее впечатления. Если данных нет — показать пустое состояние.  

---

## ADR-005: BusinessResult обязателен

**Дата**: 2026-07-18 (INT-031)  
**Решение**: Каждый результат анализа должен иметь бизнес-интерпретацию (BusinessResult)  
**Контекст**: Технические результаты (CVE, порты) непонятны руководителям  
**Обоснование**: Business First — платформа говорит на языке бизнеса. Технические данные — вторичны.  

---

## ADR-006: Платформа объясняет сама себя

**Дата**: 2026-07-17 (INT-032)  
**Решение**: Каждый элемент интерфейса должен объяснять себя без обращения к документации  
**Контекст**: Пользователи не читают документацию, они ожидают, что интерфейс интуитивно понятен  
**Обоснование**: Self-Explaining Platform — TermTooltip, ContextualHelp, SmartNextStep, AIS — все механизмы работают на это  
**Реализация**: TermTooltip для терминов, «Что это?» кнопки для метрик, SmartNextStep для действий  

---

## ADR-007: Новые функции не должны снижать доверие

**Дата**: 2026-07-18 (INT-031)  
**Решение**: Любая новая функция проверяется на предмет влияния на доверие пользователя  
**Контекст**: Красивые demo-графики без реальных данных могут обмануть пользователя  
**Обоснование**: Trust Before Features — если функция может быть воспринята как обман, она не добавляется  

---

## ADR-008: Static Export для фронтенда

**Дата**: До INT-030  
**Решение**: Next.js configured с `output: "export"` — статический HTML, нет серверного runtime  
**Контекст**: Нужна максимальная простота деплоя и минимальная стоимость хостинга  
**Обоснование**: Статический сайт можно хостить на любом сервере с Nginx, не нужен Node.js runtime  
**Ограничения**: Нет серверного рендеринга, нет API routes, нет ISR, нет middleware  

---

## ADR-009: i18n через кастомную систему

**Дата**: До INT-030  
**Решение**: Кастомная i18n система через React Context, а не next-intl или react-i18next  
**Контекст**: Нужна была простая двуязычная система (RU + EN) без лишних зависимостей  
**Обоснование**: Минимальные зависимости, полный контроль, 2676 ключей работают стабильно  
**Ограничения**: Нет поддержки множественного числа, нет поддержки ICU message format  

---

## ADR-010: File Store для Backend

**Дата**: До INT-030  
**Решение**: Backend использует file-based хранилище (JSON файлы), а не базу данных  
**Контекст**: Ранняя стадия проекта, нужна максимальная простота  
**Обоснование**: Нет необходимости в базе данных для demo/MVP. JSON файлы проще в разработке и деплое.  
**Ограничения**: Нет транзакций, нет конкурентности, не масштабируется  
**Планы**: Заменить на PostgreSQL или SQLite при переходе к production backend  

---

## ADR-011: Solo Leveling стиль для уведомлений

**Дата**: 2026-07-20 (INT-036)  
**Решение**: Уведомления AIS стилизованы под Solo Leveling (минимализм, свечение, системность), но без прямого копирования  
**Контекст**: Нужен был уникальный визуальный стиль для уведомлений, который вызывает «вау»  
**Обоснование**: Стиль создаёт ощущение «живой системы», премиальности, отличается от стандартных toast-уведомлений  

---

## ADR-012: Confidence Score — оценка уверенности

**Дата**: 2026-07-19 (INT-035)  
**Решение**: Платформа показывает свою уверенность в рекомендациях (0-100)  
**Контекст**: Пользователь должен понимать, насколько можно доверять рекомендациям  
**Обоснование**: Честность > Уверенность. Лучше показать «мы не уверены», чем дать неверную рекомендацию  
**Реализация**: 5 уровней (Very Low → Very High), нарратив по ролям, факторы влияния  

---

## ADR-013: Marketplace → Solutions Center

**Дата**: 2026-07-19 (INT-034)  
**Решение**: Marketplace переименован в «Центр решений» с 7 категориями  
**Контекст**: Marketplace ассоциировался с магазином, а не с решением проблем  
**Обоснование**: Business Language — пользователь ищет решение проблемы, а не инструмент  

---

## ADR-014: Zero Duplicate Text

**Дата**: 2026-07-20 (INT-036)  
**Решение**: Запрещается дублировать смысл в заголовках и подзаголовках  
**Контекст**: «ТАРИФЫ» + «Прозрачные тарифы» — подзаголовок не добавляет информации  
**Обоснование**: Каждый символ на экране должен нести ценность. Удаление дублей повышает плотность смысла.  

---

## ADR-015: Документация как часть релиза

**Дата**: 2026-07-21 (INT-037)  
**Решение**: Документация обновляется после каждого INT-этапа и является обязательной частью релиза  
**Контекст**: Между сессиями AI терялся контекст, решения не фиксировались  
**Обоснование**: Самодокументируемый проект — любой новый участник может продолжить работу без истории чата  

---

## ADR-016: Production — единственный источник истины

**Дата**: 2026-07-21 (INT-043)  
**Решение**: Если функция заявлена как реализованная, но отсутствует или не работает на Production — она считается нереализованной. Отчёт агента не является доказательством.  
**Контекст**: При аудите INT-043 обнаружено, что `/app/platform-status` и `/app/debug/features` заявлены как implemented в Feature Registry, но на Production возвращают 404 fallback на index.html. При этом "призрачная" страница `/app/system-status` существует на Production, но отсутствует в git.  
**Обоснование**: Пользователь видит только Production. Любые промежуточные состояния (git, build dir, agent report) не имеют значения, если Production не подтверждает.  
**Влияние**: Каждый статус "implemented" в Feature Registry должен сопровождаться Production verification (HTTP 200 + визуальная проверка).  
**Реализация**: Feature Registry расширена статусами `broken` и `missing` (см. ADR-018).  

---

## ADR-017: Запрет на deploy без синхронизации git и production

**Дата**: 2026-07-21 (INT-043)  
**Решение**: Запрещается выполнять `git pull + next build + cp to web root`, если на Production присутствуют страницы/функции, которых нет в git.  
**Контекст**: Обнаружено, что предыдущий агент задеплоил страницу `/app/system-status` (с принципами INT-043), но не закоммитил её в git. Любой стандартный deploy уничтожит эту работу.  
**Обоснование**: Zero Divergence Rule: LOCAL = GITHUB = SERVER = PRODUCTION. Если расхождение существует, сначала его нужно устранить (реконструировать исходники или удалить с production), потом деплоить.  
**Влияние**: Перед каждым deploy — обязательная проверка `diff` между production файлами и git-репозиторием.  

---

## ADR-018: Расширение статусов Feature Registry

**Дата**: 2026-07-21 (INT-043)  
**Решение**: Feature Registry должна использовать 7 статусов: `not_started`, `in_progress`, `implemented`, `verified`, `broken`, `missing`, `deprecated`. Никаких других статусов.  
**Контекст**: Ранее использовались только 3 статуса: `implemented`, `in_progress`, `planned`. Это позволяло помечать функции как "implemented" без проверки Production.  
**Обоснование**: Каждое состояние функции должно быть явным. `implemented` ≠ `verified` — нужна отдельная проверка на Production. `broken` — функция была implemented/verified, но перестала работать. `missing` — заявлена, но не существует.  
**Влияние**: Feature Registry JSON и TypeScript типы должны быть обновлены. Страница Platform Status должна показывать все 7 статусов с разными цветами.  
**Реализация**: TODO в INT-043 — обновить `feature-registry.ts` и `feature-registry.json`.  

---

## ADR-019: Backend уже работает в production

**Дата**: 2026-07-21 (INT-043)  
**Решение**: Документация должна отражать фактическое состояние: backend работает через systemd `sip-server.service` на порту 3005.  
**Контекст**: HANDOFF.md, CURRENT_STATE.md, CHANGELOG_PRODUCT.md заявляли "Backend не работает в production". Фактически: systemd сервис активен, /api/health возвращает JSON. Backend запущен из `/root/sec-scanner-workspace` (INT-036).  
**Обоснование**: Несоответствие документации и реальности вводит в заблуждение новых агентов и разработчиков.  
**Влияние**: Все упоминания "backend не запущен" в документации должны быть исправлены.  
**Реализация**: Обновлено в CURRENT_STATE.md (INT-043). TODO: обновить HANDOFF.md.  

---

## ADR-020: Context Reset Rule

**Дата**: 2026-07-21 (INT-043)  
**Решение**: После каждых 10–15 INT-задач (или при заметном росте контекста) работа продолжается в новом диалоге. Перед началом нового диалога агент обязан прочитать 5 обязательных документов и выполнить аудит Production.  
**Контекст**: В текущем проекте между сессиями AI терялся контекст: документация устарела на 3-6 этапов, worklog содержал только 1 запись из 6, предыдущий агент не закоммитил свою работу. Это привело к расхождениям между git и Production.  
**Обоснование**: Принудительный "reset контекста" с обязательной сверкой с Production предотвращает накопление расхождений.  
**Влияние**: Добавлено как обязательное правило в DEVELOPMENT_RULES.md (Rule 12).  
**Реализация**: Новый диалог начинается с чтения HANDOFF.md, CURRENT_STATE.md, DECISIONS.md, DEVELOPMENT_RULES.md, RELEASE_CHECKLIST.md, затем аудита Production.  

---

## ADR-021: /app/platform-status → /app/system-status (INT-044)

**Дата**: 2026-07-21 (INT-044)  
**Решение**: Страница `/app/platform-status` удалена (заменена на redirect), её функции переданы новой `/app/system-status`.  
**Контекст**: PLAT-001 (Platform Status Center) был реализован в INT-038, но на Production никогда не появился (404 fallback). Параллельно предыдущий агент (неизвестный этап) создал `/app/system-status` на Production, но не закоммитил её в git. В INT-044 страница `/app/system-status` была реконструирована из Production HTML и добавлена в git как PLAT-013.  
**Обоснование**: Production — единственный источник истины (ADR-016). Раз страница `/app/system-status` существует на Production, она должна быть в git. Раз `/app/platform-status` не существует на Production, она не должна оставаться как рабочая страница — иначе расхождение.  
**Влияние**: PLAT-001 → broken (deprecated alias), PLAT-013 → verified. Все ссылки в sidebar обновлены на `/app/system-status`. `/app/platform-status` сохранён как redirect для обратной совместимости внешних ссылок.

---

## ADR-022: Evidence-Based Development (INT-044)

**Дата**: 2026-07-21 (INT-044)  
**Решение**: Любое заявление о выполнении задачи должно сопровождаться проверяемыми доказательствами: Production URL + HTTP-статус + скриншот + E2E + commit hash. Без доказательств задача автоматически считается незавершённой.  
**Контекст**: В INT-043 обнаружено, что предыдущие агенты заявляли функции как "implemented" без проверки Production. Это привело к расхождениям между Feature Registry и реальным состоянием.  
**Обоснование**: Production видит пользователь — значит Production должен быть доказательством.  
**Влияние**: Добавлено как Rule 15 в DEVELOPMENT_RULES.md. Статус `implemented` больше не используется — заменён на `verified` (только после production-проверки).  
**Реализация**: В INT-044 сделано 16 скриншотов ключевых страниц, сохранённых в `/home/z/my-project/int044/screenshots/`. Production URL проверены через curl + agent-browser snapshot.

---

## ADR-023: 8 канонических статусов Feature Registry (INT-044)

**Дата**: 2026-07-21 (INT-044)  
**Решение**: Feature Registry использует 8 канонических статусов: `not_started`, `in_progress`, `verified`, `partial`, `broken`, `missing`, `deprecated`, `planned` (legacy alias для `not_started`). Статус `implemented` сохранён как legacy alias, но не должен использоваться в новом коде.  
**Контекст**: В INT-043 (ADR-018) заявлено 7 статусов, но `partial` был пропущен в TypeScript типе, что вызвало ошибку сборки. В INT-044 тип расширен до 8 + 2 legacy aliases.  
**Обоснование**: `partial` нужен для функций, которые частично работают на Production (UI есть, но backend не отвечает). Без этого статуса такие функции приходилось бы помечать как `broken` или `in_progress`, что не точно.  
**Влияние**: `feature-registry.ts` обновлён. `feature-registry.json` мигрирован: 4 features теперь `partial` (Integrations, Repositories, Notifications, Pricing).

---

## ADR-024: Evidence-Driven Development (INT-045)

**Дата**: 2026-07-21 (INT-045)  
**Решение**: Каждая функция платформы должна иметь evidence-запись в `feature-evidence.json` с 6 обязательными проверками: build, production, browser, e2e, regression, visual. Без evidence функция не может считаться реализованной.  
**Контекст**: В INT-043/044 обнаружено, что предыдущие агенты заявляли функции как "implemented" без production-проверки. Это привело к 2 BROKEN страницам (platform-status, debug/features) и 1 "призрачной" странице (system-status).  
**Обоснование**: Production — единственный источник истины (ADR-016). Evidence — формализация этого принципа: каждое утверждение должно сопровождаться проверяемыми доказательствами.  
**Влияние**:  
- Создан `feature-evidence.json` (56 features + 10 AIS modules)  
- Создан `evidence-registry.ts` с TypeScript типами и хелпер-функциями  
- Создана страница `/app/evidence` (PLAT-014, verified)  
- Добавлены Rules 16-20 в DEVELOPMENT_RULES.md  
- Статус `implemented` запрещён; использовать `verified` или `implemented_not_verified`  

---

## ADR-025: 7 канонических статусов evidence (INT-045)

**Дата**: 2026-07-21 (INT-045)  
**Решение**: 7 канонических статусов: `planned`, `in_progress`, `implemented_not_verified`, `verified`, `broken`, `deprecated`, `removed`. Статус `implemented` без evidence запрещён.  
**Контекст**: В INT-044 использовались 8 статусов, но `partial` и `missing` создавали путаницу с `verified`/`broken`. В INT-045 стандартизировано: `partial` → `in_progress` (UI есть, но не полностью), `missing` → `broken` (заявлено, но отсутствует).  
**Обоснование**: Меньше статусов = меньше двусмысленности. Каждое состояние функции явное и однозначное.  
**Влияние**: `evidence-registry.ts` экспортирует `migrateToCanonicalStatus()` для обратной совместимости с legacy статусами.  

---

## ADR-026: AIS Module-Level Verification (INT-045)

**Дата**: 2026-07-21 (INT-045)  
**Решение**: AIS (Adaptive Intelligence System) верифицируется не как одна функция, а как 10 отдельных модулей с индивидуальными статусами.  
**Контекст**: AIS — сложная система из 10 подсистем (Notification, Memory, Adaptive Timing, Context Engine, Sounds, Animation, Assistant, Settings, Event Bus, Preferences). Глобальный статус "AIS implemented" скрывает детали — может быть, 9 модулей работают, а 1 сломан.  
**Обоснование**: Модульная верификация позволяет точно определить, что работает, а что нет. Пользователь и разработчик видят детальный статус.  
**Влияние**:  
- `feature-evidence.json` содержит секцию `aisModules` с 10 модулями  
- `/app/evidence` имеет отдельную вкладку "AIS модули"  
- 9 модулей verified, 1 (Sounds) partial — из-за browser autoplay policy  

---

## ADR-027: Production Consistency Check (INT-045)

**Дата**: 2026-07-21 (INT-045)  
**Решение**: На странице `/app/evidence` отображается Production Consistency панель с SHA commit'ов из 4 источников: LOCAL, GITHUB, SERVER BUILD, PRODUCTION. Если SHA различаются — статус `OUT OF SYNC`.  
**Контекст**: В INT-043 обнаружено, что 3 разные версии кода существовали одновременно на сервере. Нужно явное визуальное представление синхронизации.  
**Обоснование**: Zero Divergence Rule (Rule 2) требует LOCAL = GITHUB = SERVER = PRODUCTION. Визуальная панель делает нарушение очевидным.  
**Влияние**:  
- `evidence-registry.ts` экспортирует `getProductionConsistency()`  
- На `/app/evidence` отображается панель с 4 SHA и общим sync статусом  
- TODO: real-time check через backend API (сейчас build-time snapshot)  

---

## ADR-028: KNOWN_REGRESSIONS.md (INT-045)

**Дата**: 2026-07-21 (INT-045)  
**Решение**: Создан журнал `docs/KNOWN_REGRESSIONS.md` для фиксации всех регрессий: что ломалось, почему, когда, как исправлено, как избежать.  
**Контекст**: В INT-043 обнаружено 7 регрессий, накопленных за INT-037..INT-042. Без журнала они были бы потеряны и могли повториться.  
**Обоснование**: Regression Memory — ключевой механизм предотвращения повторения ошибок. Каждая регрессия должна быть документирована с шаблоном REG-XXX.  
**Влияние**:  
- 7 регрессий задокументировано (REG-001..007)  
- Шаблон для новых регрессий включён в конец файла  
- Rule 9 (Regression First) усилена: перед задачей проверять KNOWN_REGRESSIONS.md  

---

## ADR-029: Product Readiness vs Functional Readiness (INT-046)

**Дата**: 2026-07-21 (INT-046)  
**Решение**: Разделить понятия "functional readiness" (функция технически реализована) и "product readiness" (функция готова для ежедневного использования пользователями).  
**Контекст**: В INT-045 Evidence Registry показывал что 28 функций verified (83% evidence completeness). Но product audit выявил что только 55% готовы для реального использования — нет empty/error states, mock integrations, нет mobile-first, и т.д.  
**Обоснование**: "Функция существует" ≠ "Функция закончена как продукт". Пользователь видит product readiness, а не functional readiness.  
**Влияние**:  
- Создан `product-readiness.json` с 16 критериями для каждой функции  
- Создана страница `/app/product-readiness` (PLAT-015)  
- Executive Summary: "91% functional, 55% product ready"  
- Roadmap TOP-10 задач по влиянию на продукт  

---

## ADR-030: Four Statuses Rule (INT-046)

**Дата**: 2026-07-21 (INT-046)  
**Решение**: После INT-046 агенту запрещено писать "Функция реализована" без одновременного указания 4 статусов: Technical / Evidence / Product / Production.  
**Контекст**: Заявление "реализовано" двусмысленно — может означать что код написан, или что функция работает на production, или что готова для пользователей.  
**Обоснование**: 4 статуса разделяют эти значения:  
- Technical: код существует  
- Evidence: подтверждено доказательствами  
- Product: готово для пользователей  
- Production: работает на production  

**Влияние**: Rule 21 в DEVELOPMENT_RULES.md. Каждая функция в `product-readiness.json` имеет `fourStatuses` объект.

---

## ADR-031: Trust Audit — Critical Product Debt (INT-046)

**Дата**: 2026-07-21 (INT-046)  
**Решение**: Любое место, где пользователь может подумать "это выглядит ненастоящим", автоматически получает статус Critical Product Debt.  
**Контекст**: Обнаружено 7 trust findings: fake integrations (toggles показывают success без подключения), fake progress bar, fake email sending, fake notifications. Это разрушает доверие пользователей.  
**Обоснование**: Доверие — основа B2B sales. Если пользователь думает что функция fake, он не будет платить.  
**Влияние**: 7 находок задокументировано в `product-readiness.json` → `trustFindings`. 2 critical (TRUST-002 integrations, TRUST-003 progress bar), 2 high (TRUST-001 demo data, TRUST-004 email), 2 medium (TRUST-005 notifications, TRUST-006 API keys), 1 low (TRUST-007 marketplace install).

---

## ADR-032: Roadmap Generator (INT-046)

**Дата**: 2026-07-21 (INT-046)  
**Решение**: На основе Product Debt автоматически строить TOP-10 задач по влиянию на продукт, с учётом: trust / sales / retention / onboarding / technical_risk.  
**Контекст**: Без приоритизации Product Debt — это просто список. Нужен механизм определения что делать первым.  
**Обоснование**: Влияние на продукт ≠ сложность реализации. Real auth (high effort, 95 impact) важнее mobile polish (high effort, 72 impact).  
**Влияние**: `product-readiness.ts` → `getRoadmap()` возвращает 10 приоритизированных задач. Каждая задача имеет: rank, title, impact, impactScore (0-100), effort (low/medium/high), description, affectedFeatures.

---

## ADR-033: 16 Product Completeness Criteria (INT-046)

**Дата**: 2026-07-21 (INT-046)  
**Решение**: Каждая функция оценивается по 16 критериям: works_on_production, tested_on_production, clear_ux, no_duplication, no_fake_state, has_empty_state, has_loading_state, has_error_state, has_success_state, has_explanation, has_next_step, adaptive_to_user, has_settings, works_on_mobile, works_in_dark_theme, manually_verified.  
**Контекст**: Product readiness не может быть бинарным (готово/не готово). Нужны критерии которые показывают что именно отсутствует.  
**Обоснование**: 16 критериев покрывают все аспекты product completeness: технический, UX, accessibility, адаптивность, безопасность.  
**Влияние**: Score = (true * 1.0 + partial * 0.5) / 16 * 100. Каждый критерий генерирует Product Debt item если false или partial. Средний score = 55%.

---

## ADR-034: Unified AI Architecture (INT-048)

**Дата**: 2026-07-21 (INT-048)  
**Решение**: Платформа реорганизована в 4 взаимосвязанных интеллектуальных центра: SIP (Security Intelligence Platform), AIS (Adaptive Intelligence System), AI CTO (Product Intelligence Center), AIO (Autonomous Operations Center).  
**Контекст**: До INT-048 функции платформы были независимыми модулями без чёткой зоны ответственности. AI Copilot работал локально без понимания общей архитектуры.  
**Обоснование**: 4 центра с чёткими зонами ответственности (данные/пользователь/стратегия/исполнение) упрощают развитие и поддержку. AI Copilot может маршрутизировать запросы в нужный центр.  
**Влияние**:  
- Создан `architecture-registry.json` с 4 центрами, 43 модулями, 9 communication links  
- Созданы 5 страниц: /app/architecture + 4 detail pages  
- AI Routing Engine: routeQuestion() определяет центр по тексту запроса  
- Rule 22 Architecture Governance в DEVELOPMENT_RULES.md  

---

## ADR-035: AI Routing Engine (INT-048)

**Дата**: 2026-07-21 (INT-048)  
**Решение**: AI Copilot маршрутизирует запросы пользователей в один из 4 центров на основе pattern matching.  
**Контекст**: Без routing engine AI Copilot не знал к какому центру обращаться. Пользовательские вопросы типа "Почему Scanner пустой?" (SIP) vs "Когда будет деплой?" (AIO) требовали разной логики.  
**Обоснование**: Pattern-based routing простой и предсказуемый. Каждый центр имеет ключевые слова (scanner/risk/finding → SIP; deploy/build/sync → AIO; readiness/roadmap/trust → AI CTO; tip/goal/notification → AIS).  
**Влияние**: `architecture-registry.ts` → `routeQuestion(question)` возвращает `{center, matchedRule, isFallback, explanation}`. Fallback центр — AI CTO (как наиболее общий).

---

## ADR-036: Architecture Governance Rule (INT-048)

**Дата**: 2026-07-21 (INT-048)  
**Решение**: Новая функция не может быть реализована, пока не определено: центр, владелец, inputs, outputs, dependencies.  
**Контекст**: До INT-048 функции добавлялись без чёткого понимания кто за них отвечает. Это приводило к дублированию и orphan-функциям.  
**Обоснование**: Явная привязка к центру предотвращает дублирование и orphan-функции. Каждая функция знает свои dependencies и inputs/outputs.  
**Влияние**: Rule 22 в DEVELOPMENT_RULES.md. `architecture-registry.json` → `responsibilityMatrix` содержит 20 функций с назначенными центрами.

---

## ADR-037: Unified Terminology (INT-048)

**Дата**: 2026-07-21 (INT-048)  
**Решение**: Во всей платформе используются только 5 канонических терминов: SIP, AIS, AI CTO, AIO, AI Copilot. Запрещены синонимы ("помощник", "интеллектуальный помощник", "умный ассистент").  
**Контекст**: Разные части платформы использовали разные термины для одной сущности, что путало пользователей и разработчиков.  
**Обоснование**: Единая терминология упрощает коммуникацию и документацию. Пользователь сразу понимает к какому центру относится функция.  
**Влияние**: `architecture-registry.json` → `unifiedTerminology` с определениями. Rule 22 в DEVELOPMENT_RULES.md явно запрещает синонимы.

---

## ADR-038: Platform Evolution Framework (INT-049)

**Дата**: 2026-07-21 (INT-049)  
**Решение**: Платформа переведена с модели независимых функций на модель единой самоэволюционирующей AI-платформы. Каждое изменение автоматически анализируется с точки зрения влияния на все 4 центра.  
**Контекст**: До INT-049 функции добавлялись без понимания влияния на другие центры. Это приводило к несогласованным изменениям и регрессиям.  
**Обоснование**: Evolution Engine принудительно анализирует влияние каждого изменения на SIP/AIS/AI CTO/AIO перед реализацией.  
**Влияние**:  
- Создан `evolution-registry.json` с 62 features (owner + affectedCenters + impactScore)  
- Создана `/app/evolution` (4-tab UI: Matrix, Impact, Intent, Pipeline)  
- `analyzeEvolutionImpact()` и `detectIntent()` в `evolution-registry.ts`  
- Rule 23 Platform Evolution в DEVELOPMENT_RULES.md  

---

## ADR-039: Command Center replaces Dashboard (INT-049)

**Дата**: 2026-07-21 (INT-049)  
**Решение**: Главная страница платформы — Command Center (`/app/command-center`), заменяющая Dashboard. Показывает агрегированный статус всех 4 центров.  
**Контекст**: Dashboard фокусировался только на SIP (security metrics). Не было единой точки управления платформой.  
**Обоснование**: Command Center — единая точка входа для overview платформы. 4 health cards (Security/Platform/AIS/Automation) дают полную картину за 5 секунд.  
**Влияние**:  
- `/app/command-center` (PLAT-021, verified) — новая главная страница  
- Dashboard (`/app/dashboard`) сохранён как legacy, но больше не главная  
- Sidebar: Command Center на первом месте  

---

## ADR-040: Dynamic Two-Level Navigation (INT-049)

**Дата**: 2026-07-21 (INT-049)  
**Решение**: Sidebar реструктурирован с двухуровневой навигацией: первый уровень = 4 AI Centers + Command Center + Evolution + Architecture; второй уровень = Platform Tools (Scanner, Reports, Marketplace, и т.д.).  
**Контекст**: Старый sidebar имел плоский список из 21 пунктов без группировки. Пользователю было сложно найти нужную функцию.  
**Обоснование**: Группировка по центрам ответственности (SIP/AIS/AI CTO/AIO) отражает архитектуру платформы и упрощает навигацию.  
**Влияние**:  
- AppSidebar.tsx реструктурирован  
- 7 новых пунктов первого уровня: Command Center, SIP, AIS, AI CTO, AIO, Evolution, Architecture  
- Существующие 21 пунктов сохранены как второй уровень  

---

## ADR-041: AI Copilot Intent Detection (INT-049)

**Дата**: 2026-07-21 (INT-049)  
**Решение**: AI Copilot маршрутизирует запросы пользователей в один из 4 центров на основе intent detection. 12 intent patterns + fallback.  
**Контекст**: До INT-049 AI Copilot работал локально без понимания какой центр должен обработать запрос.  
**Обоснование**: Pattern-based intent detection простой и предсказуемый. Каждый центр имеет ключевые слова.  
**Влияние**:  
- `detectIntent(query)` в `evolution-registry.ts`  
- Демо на `/app/evolution` → AI Intent tab  
- 12 intent patterns: scan_request, risk_inquiry, report_request, explain_request, tip_request, goal_inquiry, readiness_inquiry, roadmap_inquiry, trust_inquiry, deploy_request, recovery_request, verify_request  
- Fallback: AI CTO (confidence 30%)  

---

## ADR-042: Dual Mode Architecture (INT-050)

**Дата**: 2026-07-21 (INT-050)  
**Решение**: Платформа имеет два режима интерфейса: User Workspace (по умолчанию, простой SaaS) и Founder Console (инженерный контроль). Переключатель в sidebar с localStorage persistence.  
**Контекст**: До INT-050 sidebar содержал 25 пунктов перемешанных — пользовательские (Scanner, Reports) и инженерные (Architecture, Evolution, Evidence). Это перегружало новых пользователей.  
**Обоснование**: Пользователь должен видеть только продукт. Архитектура принадлежит фаундеру. Разделение через `audience` field позволяет добавлять модули без хаоса.  
**Влияние**:  
- AppSidebar.tsx: каждый section имеет `audience: "user" | "founder"`  
- Toggle UI в верхней части sidebar  
- Auto-switch при переходе на founder-страницы  
- Rule 24 (Dual Mode Architecture) в DEVELOPMENT_RULES.md  
- PLAT-024 добавлен в feature-registry  

---

## ADR-043: AIS как единая точка входа (INT-050 BLOCK 4)

**Дата**: 2026-07-21 (INT-050)  
**Решение**: В User mode пользователь не видит 4 AI Centers. Он общается только с AIS (AI Copilot), который маршрутизирует запросы через `detectIntent()` в нужный центр.  
**Контекст**: Пользователь не должен думать "Мне идти в SIP или AI CTO?". Это инженерный вопрос, не пользовательский.  
**Обоснование**: Скрытие инженерной архитектуры упрощает UX. AIS остаётся видимой точкой входа (плавающая кнопка), но внутренний routing скрыт.  
**Влияние**: В User mode sidebar не показывает Architecture/Evolution/Evidence. AIS Copilot остаётся доступным и маршрутизирует запросы автоматически.
