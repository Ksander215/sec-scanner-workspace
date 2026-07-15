> **Superseded by:** [PRODUCT_MARKET_FIT_BLUEPRINT.md (Section 7)](../PRODUCT_MARKET_FIT_BLUEPRINT.md (Section 7))
> **Archived reason:** User flow maps, superseded by PMF Blueprint user scenarios
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# USER_FLOW.md — Sec Scanner

> **Дата:** 2026-07-14  
> **Версия:** 0.2.0  
> **Тип:** Карты пользовательских сценариев (без изменения кода)

---

## 1. Пользовательские персоны

### 1.1 Persona: Security Engineer («Алексей»)

**Контекст:** Работает в компании 50-500 сотрудников. Отвечает за безопасность веб-приложений. Нужно регулярно проверять production и staging.

**Мотивации:**
- Быстро проверить новое приложение перед релизом
- Автоматизировать сканирование в CI/CD
- Показать менеджменту отчёт с конкретными рекомендациями
- Отслеживать, что коллеги по разработке исправили найденные уязвимости

**Фрустрации:**
- Сложная настройка сканеров (ZAP, Burp)
- Нет интеграции с текущими инструментами
- Отчёты не подходят для показа руководству
- Нет истории — нельзя отследить, улучшилась ли ситуация

**Метрики успеха:** Время от «хочу проверить» до «получил отчёт». Количество исправленных уязвимостей.

### 1.2 Persona: CTO / Tech Lead («Мария»)

**Контекст:** Руководит командой 5-15 разработчиков. Не security-специалист, но несёт ответственность.

**Мотивации:**
- Понять текущий уровень безопасности своих продуктов
- Иметь аргументы для выделения бюджета на security
- Делегировать проверку безопасности, не погружаясь в детали

**Фрустрации:**
- Не понимает технические отчёты
- Нет простого «health score» для своих приложений
- Боится пропустить критическую уязвимость

**Метрики успеха:** Score 0-100, понятный дашборд, PDF для совета директоров.

### 1.3 Persona: Solo Developer («Дмитрий»)

**Контекст:** Фрилансер или инди-хакер. Делает pet-проекты и SaaS.

**Мотивации:**
- Бесплатно проверить свои проекты
- Быстро получить список того, что исправить
- Получить «галочку security» для клиентов

**Фрустрации:**
- Нет бюджета на дорогие инструменты
- Не хочет настраивать сложный софт
- Нужен результат за 1-2 минуты

---

## 2. Основные пользовательские сценарии

### 2.1 Сценарий A: First Scan (The Aha Moment)

**Цель:** Пользователь получает первую ценность за минимальное время.

```
Пользователь заходит на secscanner.io
    │
    ▼
Видит Landing: "Find vulnerabilities before attackers do"
    │
    ▼
Нажимает "Start free scan"
    │
    ▼
Видит форму регистрации / логина
    │
    ├─ Нет аккаунта → Регистрация (email + password) → Автологин
    │
    ├─ Есть аккаунт → Логин (email + password)
    │                     │
    │                     ├─ Нет 2FA → Успешный вход
    │                     │
    │                     └─ Есть 2FA → Ввод TOTP кода → Успешный вход
    │
    ▼
window.location.reload() ← ТЕКУЩИЙ ХАК
    │
    ▼
Видит Dashboard → вкладка "New scan"
    │
    ▼
Вводит URL: https://my-app.com
    │
    ▼
Нажимает "Start scan"
    │
    ▼
Toast: "Scan queued — results in 4–8s"
    │
    ▼
SSE: scan-update event → История обновляется автоматически
    │
    ▼
Видит: Score 72/100, 5 vulnerabilities found
    │
    ▼
Кликает на скан → ScanDetailModal
    │
    ▼
Видит: список уязвимостей с severity, evidence, remediation
    │
    ▼
Скачивает PDF → Отправляет коллегам / руководству
```

**Таймлайн текущий:**
- Landing → Dashboard: ~2с (reload)
- Регистрация: ~5с
- Первый скан: ~5с (4-8s mock delay)
- PDF скачивание: ~3с
- **Total: ~15 секунд от входа до отчёта**

**Проблемы в текущем flow:**
1. `window.location.reload()` после логина — «мелькание», потеря контекста
2. Нет onboarding — пользователь видит пустой дашборд с табами, без подсказки «введите URL»
3. Нет «Aha moment» анимации — скан завершается, но нет визуального эффекта
4. PDF скачивается без preview — пользователь не знает, что внутри

---

### 2.2 Сценарий B: Team Collaboration

```
Owner создаёт Workspace
    │
    ▼
Вводит название: "Security Team"
    │
    ▼
Workspace создан (owner = текущий пользователь)
    │
    ▼
Owner нажимает "Invite member"
    │
    ▼
Вводит email коллеги, выбирает роль (admin / member)
    │
    ▼
Invite создан → Toast с ссылкой для копирования
    │
    ▼
Owner отправляет ссылку коллеге (вручную — SMTP не настроен)
    │
    ▼
Коллега открывает ссылку: /?invite=<token>
    │
    ▼
GET /api/team-invites/[token] → частичный accept (side effect!)
    │
    ▼
POST /api/team-invites/[token]/accept → полный accept
    │
    ▼
Коллега видит workspace в своём списке Teams
```

**Проблемы:**
1. **Invite accept дублирован** — GET и POST оба могут создать membership
2. **Нет визуального flow для приглашённого** — ссылка ведёт на `/`, но SPA не обрабатывает `?invite=` параметр (проверено: нет кода для этого в `page.tsx`)
3. **SMTP не обязателен** — продукт предполагает email-инвайты, но работает без них. UX разрыв.
4. **Нет member dashboard по workspace** — при выборе workspace показываются участники и инвайты, но **не сканы этого workspace**

---

### 2.3 Сценарий C: API Integration (Programmatic Access)

```
Пользователь создаёт API Key в Settings → API Keys tab
    │
    ▼
Указывает имя: "CI Pipeline", выбирает scopes
    │
    ▼
Нажимает "Create" → Видит raw ключ ОДИН РАЗ
    │
    ▼
Dialog: "Save your key — you won't see it again"
    │
    ▼
Копирует ключ
    │
    ▼
Использует в CI/CD:
    curl -H "Authorization: Bearer ssk_abc12345..." \
         https://secscanner.io/api/scans \
         -d '{"target": "https://staging.myapp.com"}'
    │
    ▼
Получает результат скана через API
```

**Проблемы:**
1. **Нет документации API** — пользователь должен гадать по коду
2. **Нет webhook** — CI не может узнать, когда скан завершён (только polling)
3. **Team scans через API** — `POST /api/scans` не поддерживает `teamId` (создаёт personal scan)
4. ** scopes `teams:read` и `teams:write`** определены, но API endpoints для teams не поддерживают API-key auth (только session)

---

### 2.4 Сценарий D: Repeat Usage (Returning User)

```
Пользователь возвращается через неделю
    │
    ▼
Видит Dashboard → вкладка History (по умолчанию открыта Scan tab)
    │
    ▼
Переключается на History → видит список из 50 последних сканов
    │
    ▼
Хочет найти скан конкретного URL → нет поиска, нет фильтров
    │
    ▼
Хочет посмотреть старые сканы (более 50) → pagination нет
    │
    ▼
Хочет сравнить результаты двух сканов одного URL → невозможно
    │
    ▼
Скачивает PDF одного из прошлых сканов
```

**Проблемы:**
1. **Нет persistence по целям** — сканы привязаны к user, а не к target
2. **Нет поиска/фильтрации** в истории
3. **Нет pagination** — только 50 записей
4. **Нет сравнения** сканов
5. **Нет тренда** — как меняется безопасность приложения во времени

---

### 2.5 Сценарий E: Admin Content Management

```
Admin логинится с ролью "admin"
    │
    ▼
Видит Dashboard + дополнительную вкладку "Admin" в navbar
    │
    ▼
Admin Panel → 3 вкладки: Content Editor, Products, Audit Log
    │
    ▼
Content Editor: редактирует 10 полей лендинга
    │
    ▼
Products: CRUD для тарифных планов (только UI, нет привязки к реальным подпискам)
    │
    ▼
Audit Log: просмотр действий всех пользователей (cursor pagination)
```

**Проблемы:**
1. **Content — только EN** — RU-контент не редактируется через CMS
2. **Products — декоративные** — создаются/редактируются, но никуда не привязываются
3. **Audit log — только read** — нет действий по результатам (блокировка пользователя, etc.)

---

## 3. Жизненный цикл пользователя (User Lifecycle)

```
                        ┌─────────────────────────────────────┐
                        │           AWARENESS                 │
                        │   Landing page, SEO, Lead Magnet    │
                        │   (email collected, no account)     │
                        └──────────────┬──────────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────────────┐
                        │           ACTIVATION                 │
                        │   Registration → First Scan          │
                        │   → First Report → "Aha moment"      │
                        └──────────────┬──────────────────────┘
                                       │
                              ┌────────┴────────┐
                              │  Drop-off risk  │
                              │  (no value yet) │
                              └────────┬────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────────────┐
                        │         RETENTION (Week 1-4)         │
                        │   Repeat scans → Team creation      │
                        │   → API keys → CI integration        │
                        └──────────────┬──────────────────────┘
                                       │
                              ┌────────┴────────┐
                              │  Churn risk:    │
                              │  "Just a demo"  │
                              └────────┬────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────────────┐
                        │         REVENUE (Month 1+)          │
                        │   Billing → Upgrade → Subscription  │
                        │   → Workspace limits → More scans   │
                        └──────────────┬──────────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────────────┐
                        │         EXPANSION (Month 3+)         │
                        │   Multiple workspaces → Schedules    │
                        │   → Integrations → Enterprise       │
                        └─────────────────────────────────────┘
```

### 3.1 Текущее состояние воронки

| Этап | Что есть | Что MISSING |
|------|----------|-------------|
| **Awareness** | Landing, Pricing, FAQ, Lead Magnet, i18n (EN/RU) | Blog, Case Studies, Integration docs, Changelog |
| **Activation** | Регистрация, Первый скан за 15с, PDF отчёт, SSE real-time | Onboarding flow, Guided tour, Sample scan для demo |
| **Retention** | История сканов, Teams, API Keys, 2FA | Targets с историей, Vulnerability status, Scan comparison, Scheduled scans |
| **Revenue** | UI для Pricing (disabled buttons), StoreProduct CRUD | Stripe, Subscription, Usage limits, Invoices |
| **Expansion** | Teams, API keys, CMS | Multi-workspace, SSO/SAML, Custom rules, Webhooks, API docs |

---

## 4. Жизненный цикл сканирования (Scan Lifecycle)

```
┌──────────────────────────────────────────────────────────────────┐
│                        SCAN LIFECYCLE                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. INITIATION                                                    │
│     ├── Trigger: User (Dashboard / API Key)                      │
│     ├── Input: Target URL (string)                               │
│     ├── Validation: Zod schema (http/https URL)                  │
│     ├── Authorization: Session or API Key                         │
│     ├── Rate Limit: 10/min per user                              │
│     └── Output: Scan record (status: "scanning")                 │
│                                                                   │
│  2. EXECUTION (Mock)                                              │
│     ├── Engine: generateScanResult() — deterministic PRNG        │
│     ├── Seed: hash(target + scanId) → reproducible               │
│     ├── Output: 2-7 Vulnerabilities from OWASP templates         │
│     ├── Duration: 4-8 seconds (simulated setTimeout)             │
│     └── Real-time: SSE heartbeat every 15s                       │
│                                                                   │
│  3. COMPLETION                                                    │
│     ├── Transaction: createMany(Vulnerabilities) + update(Scan)  │
│     ├── Score: 100 - weighted_severity + random variance         │
│     ├── Broadcast: SSE → all user's open connections             │
│     ├── Notification: Email (if user.scanCompletedAlerts)        │
│     └── State: status = "completed", score, duration set         │
│                                                                   │
│  4. CONSUMPTION                                                   │
│     ├── Dashboard: History tab → table of scans                  │
│     ├── Detail: Click scan → Modal with vulnerability list       │
│     ├── PDF: Download multi-page A4 report                       │
│     └── API: GET /api/scans/[id] → JSON                          │
│                                                                   │
│  5. FAILURE (alt path)                                           │
│     ├── Trigger: Exception in runMockScan()                      │
│     ├── State: status = "failed", error message set              │
│     ├── Broadcast: SSE → client shows error                      │
│     └── No notification (email only on success)                  │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  ЧТО ОТСУТСТВУЕТ:                                                │
│  ├── Scheduled trigger (cron / interval)                         │
│  ├── Webhook callback on completion                              │
│  ├── Scan queue / concurrency control                            │
│  ├── Scan cancellation                                           │
│  ├── Incremental / differential scanning                         │
│  ├── Re-scan same target (regression detection)                  │
│  └── Real scanner (currently mock only)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Карты экранов и навигация

### 5.1 Текущая навигация (SPA на `/`)

```
/ (page.tsx — client router)
├── [unauthenticated]
│   ├── Landing (hero, features, pricing, FAQ, lead magnet)
│   └── AuthForm (login / register / 2FA)
│
└── [authenticated — useSession()]
    ├── Dashboard (5 tabs)
    │   ├── Scan — ввод URL, запуск
    │   ├── History — таблица сканов + статистика
    │   ├── Teams — карточки workspace'ов + detail panel
    │   ├── API Keys — таблица ключей + create dialog
    │   └── Billing — pricing cards (disabled)
    │
    ├── Settings (4 tabs)
    │   ├── Profile — name, email, avatar
    │   ├── Appearance — theme (light/dark/system)
    │   ├── Notifications — toggle email alerts
    │   └── Security — password change + 2FA setup
    │
    └── Admin [role=admin] (3 tabs)
        ├── Content — 10 CMS полей лендинга
        ├── Products — CRUD тарифных планов
        └── Audit — лог действий

/privacy — Политика конфиденциальности (EN/RU)
```

### 5.2 Проблемы навигации

| Проблема | Влияние на пользователя |
|----------|------------------------|
| Нет URL для экранов | Невозможно поделиться ссылкой на конкретный экран |
| Нет browser history | Кнопка «Назад» не работает для переключения экранов |
| Все экраны в одном бандле | Медленная загрузка лендинга (весь JS приложения) |
| Нет активного tab в navbar | Пользователь не понимает, где он находится |
| Tabs не синхронизированы с URL | Обновление страницы возвращает на landing |

---

## 6. Конверсионные точки (Conversion Points)

### 6.1 Landing → Registration

**Текущий flow:**
```
Hero CTA "Start free scan" → Переключает на AuthForm (login/register tabs)
```

**Метрика для отслеживания:** % посетителей, нажавших CTA / % зарегистрировавшихся из них.

**Проблема:** Нет промежуточного шага. Пользователь видит форму и может уйти. Нет «мягкого» конверсионного шага (например, ввести email для lead magnet → затем предложить регистрацию).

### 6.2 Registration → First Scan

**Текущий flow:**
```
Регистрация → reload → Dashboard → Scan tab → Ввод URL → Start
```

**Проблема:** Между регистрацией и первым сканом — пустой дашборд. Нетguided flow. Пользователь видит 5 табов и может растеряться. Target tab не открывается по умолчанию (открывается Scan tab — это правильно).

### 6.3 First Scan → PDF Download

**Текущий flow:**
```
Scan completes → History tab → Click scan row → Modal → Download PDF
```

**Проблема:** Нужен клик на строку в History, а не на completed scan. Нет auto-open модала при завершении первого скана. Нет inline preview PDF.

### 6.4 Free → Paid

**Текущий flow:**
```
Billing tab → 3 pricing cards → Кнопки DISABLED
```

**Конверсия невозможна.** Это не баг, а отсутствие фичи. Но важно понимать: пока нет даже mechanism для конверсии.

---

## 7. Критические UX-разрывы (приоритизированные)

### 🔴 P0 — Блокируют ценность

| # | Разрыв | Влияние | Решение |
|---|--------|---------|---------|
| 1 | Нет Onboarding | Пользователь видит пустой дашборд, не знает что делать | Guided flow: «Enter your first URL» overlay |
| 2 | `?invite=` не обрабатывается | Invite ссылки не работают | Парсить query param в page.tsx |
| 3 | Team scans не видны | Создал workspace, но сканы не привязаны | Добавить teamId в scan creation |
| 4 | Нет search/filter в истории | При >10 сканов невозможно найти нужный | Фильтры: target, status, date range |

### 🟡 P1 — Снижают ценность

| # | Разрыв | Влияние | Решение |
|---|--------|---------|---------|
| 5 | Нет тренда по целям | Пользователь не видит, улучшается ли безопасность | Target entity + score history chart |
| 6 | PDF не preview'ится | Пользователь должен скачать, чтобы увидеть содержимое | Inline PDF viewer или HTML report |
| 7 | Нет scan comparison | Нельзя сравнить два скана одного URL | Diff view: new / resolved / regressed |
| 8 | Demo credentials видны | Потенциальные клиенты видят «вход без регистрации» | Убрать в production |

### 🟢 P2 — Улучшают опыт

| # | Разрыв | Влияние | Решение |
|---|--------|---------|---------|
| 9 | Нет dark mode preview на landing | Тема переключается, но landing layout не оптимизирован | Полная dark-mode поддержка landing |
| 10 | Нет copy-to-clipboard для evidence | Нужно вручную выделять evidence текст | Кнопка копирования в scan detail |
| 11 | Billing — нет trial indication | Пользователь не знает, что бесплатный период | Показать «Free plan — X scans/month» |

---

## 8. Пользовательские сценарии, которые продукт НЕ поддерживает (но должен)

### 8.1 «Проверяю перед релизом» (Pre-deploy Scan)

```
Разработчик → webhook от CI/CD → автоматический скан staging → 
результат в PR comment → блокировка merge при critical
```
**Текущий статус:** API ключи есть, но нет webhook outbound, нет CI/CD integration docs, нет PR comment format.

### 8.2 «Еженедельный мониторинг» (Scheduled Scan)

```
Security Engineer → настраивает расписание → 
каждый понедельник 9:00 скан production → 
автоматический отчёт руководству → 
алерт при новом critical
```
**Текущий статус:** Нет scheduler, нет cron, нет автоматических отчётов.

### 8.3 «Доказательства для комплаенса» (Compliance Export)

```
CTO → запрашивает отчёт за квартал → 
система собирает все сканы → 
генерирует сводный PDF с трендами → 
отмечает исправленные уязвимости
```
**Текущий статус:** Есть single-scan PDF. Нет сводных отчётов, нет трендов, нет bulk export.

### 8.4 «Трекинг исправлений» (Vulnerability Lifecycle)

```
Security Engineer → видит 5 уязвимостей → 
отмечает 2 как false positive → 
разработчик исправляет 2 → 
Engineer помечает как fixed → 
рескан → 1 новая + 0 старых = прогресс
```
**Текущий статус:** Нет vulnerability status, нет fingerprinting, нет regression detection.

---

## 9. Резюме: 3 ключевых вывода

1. **Aha moment работает.** 15 секунд от входа до PDF отчёта — это сильный activation flow. Но он **хрупкий**: зависит от reload хака, нет onboarding, нет guided tour. При малейшем сбое пользователь теряется.

2. **Нет return value.** Первый скан — отлично. Второй, третий, десятый — тот же опыт. Нет трендов, нет целей, нет сравнений. Продукт не даёт причин возвращаться. Это главная проблема для retention.

3. **Коммерция заблокирована не технически, а продуктово.** Даже если завтра добавить Stripe, что будет продаваться? «Больше сканов» — но зачем, если нет целей и расписаний? Нужно сначала добавить ценность (Targets, Schedules, Trends), а затем монетизировать через лимиты.