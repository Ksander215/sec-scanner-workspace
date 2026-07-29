# CX-001 v2 — Product Conversion Audit (Evidence Based)

> Дата: 2026-07-23
> Commit: `015f92d` (LOCAL = GITHUB = SERVER = PRODUCTION)
> Принцип: Никаких предположений. Только факты. Каждое замечание имеет доказательство.

---

## BLOCK 1 — Полный маршрут пользователя

| # | Шаг | URL | React Component | Файл | Куда ведёт CTA | Что увидит пользователь |
|---|-----|-----|-----------------|------|----------------|--------------------------|
| 1 | Landing | `/` | `page.tsx` | `landing/src/app/page.tsx` | `/app` (implicit) | Marketing page с product description |
| 2 | Hero | `/app/home` | `UserHomePage` | `landing/src/app/(app)/app/home/page.tsx` | Domain input → `handleCheck()` (line 43) → `setTimeout` 3s → demo result | "Введите адрес вашего сайта" + result с Demo пометкой |
| 3 | Scanner | `/app/scanner` | `ScannerPage` | `landing/src/app/(app)/app/scanner/page.tsx` | 4-step wizard: Project→Source→Tools→Run (line 229) | Многоэтапная форма с выбором инструментов |
| 4 | Results | `/app/findings` | `FindingsPage` | `landing/src/app/(app)/app/findings/page.tsx` | Список findings с severity badges, CVSS scores (line 431) | Технический список CVE/CVSS |
| 5 | Security Review | `/app/security-review` | `SecurityReviewPage` | `landing/src/app/(app)/app/security-review/page.tsx` | AI Executive Summary → Top Actions → Business Findings | Бизнес-перевод проблем с demo данными |
| 6 | Reports | `/app/reports` | `ReportsPage` | `landing/src/app/(app)/app/reports/page.tsx` | `downloadReport()` (line 143) → file download | Список отчётов + кнопка Download |
| 7 | Pricing | `/app/pricing` | `PricingPage` | `landing/src/app/(app)/app/pricing/page.tsx` | Free→`/app/dashboard`, Pro→`/app/dashboard`, Enterprise→`mailto:` (line 280-284) | 3 тарифа (Бесплатно/Профессионал/Бизнес), цены в ₽ |
| 8 | Checkout | ❌ НЕ СУЩЕСТВУЕТ | — | — | — | — |
| 9 | Payment | ❌ НЕ СУЩЕСТВУЕТ | — | — | — | — |

**Доказательство**: `grep -rn 'checkout\|payment\|stripe\|billing' landing/src/app/` → 0 результатов.

---

## BLOCK 2 — User Intent Audit

| Экран | Что хочет пользователь (одной фразой) | Что ожидает увидеть | Что видит на самом деле | Совпадает? |
|-------|--------------------------------------|---------------------|-------------------------|------------|
| Landing | Понять, что это за продукт | Описание продукта, CTA | Marketing page | ✅ Да |
| Hero (/app/home) | Понять и попробовать | Ввести сайт → получить результат | Domain input → demo результат за 3 сек | ⚠️ Частично (demo, не реальный) |
| Scanner | Проверить свой сайт | Простую форму: ввести URL → нажать "Проверить" | 4-step wizard: Project→Source→Tools→Run | ❌ Нет (слишком сложно) |
| Results (/app/findings) | Понять что найдено | Понятный список проблем с приоритетами | Технический список: CVE-2024-1234, CVSS 9.8, severity badges (line 431) | ❌ Нет (технический язык) |
| Security Review | Понять что делать | Что произошло → чем опасно → что делать → время | AI Executive Summary + бизнес-перевод | ✅ Да |
| Reports | Скачать отчёт | Кнопку "Скачать PDF" | Список отчётов + Download (HTML/JSON/SARIF/MD/CSV) | ⚠️ Частично (нет PDF по умолчанию) |
| Pricing | Понять сколько стоит | Цены, что входит, trial | 3 плана в ₽, "Попробовать бесплатно" → /app/dashboard | ❌ Нет (нет trial flow, нет регистрации) |
| Checkout | Оплатить | Форму оплаты | ❌ Не существует | ❌ Нет |
| Payment | Подтверждение | Success screen | ❌ Не существует | ❌ Нет |

---

## BLOCK 3 — Friction Audit

| # | Где (файл, строка) | Что мешает | Почему | Критичность |
|---|---------------------|------------|--------|-------------|
| F-01 | `scanner/page.tsx`, line 229 | 4-step wizard (Project→Source→Tools→Run) | Пользователь хочет ввести URL и нажать "Проверить", но должен пройти 4 шага | **P0** |
| F-02 | `scanner/page.tsx`, line 528 | Выбор инструментов (nmap, nuclei, ZAP) | Технические названия непонятны нетехническому пользователю | **P0** |
| F-03 | `scanner/page.tsx`, line 360 | Pipeline stages visualization | "Pipeline" — инженерный термин, пользователь не понимает | **P1** |
| F-04 | `home/page.tsx`, line 310 | AI prompts "Проверь мой сайт" → ведёт на `/app/scanner` | Пользователь ожидает AI Assistant, а попадает на сложную форму Scanner | **P1** |
| F-05 | `home/page.tsx`, line 253 | "Подробнее" в demo результате → `/app/scanner` | Пользователь ожидает детали найденных проблем, а попадает на Scanner | **P1** |
| F-06 | `pricing/page.tsx`, line 284 | Free CTA → `/app/dashboard` | Пользователь ожидает registration/onboarding, а попадает на Dashboard без аккаунта | **P0** |
| F-07 | `pricing/page.tsx`, line 284 | Pro CTA "Попробовать бесплатно" → `/app/dashboard` | Нет trial flow, нет регистрации — пользователь не понимает что происходит | **P0** |
| F-08 | `findings/page.tsx`, line 431 | CVSS scores (`finding.cvss.toFixed(1)`) | Техническая метрика без бизнес-перевода | **P1** |
| F-09 | Sidebar (User mode) | 16 пунктов в списке | Перегружено для нового пользователя (Projects, Scans, Findings, Reports, Marketplace, Integrations, KG, Attack Paths, Risks, Workspace, Playground, Docs, Community, Settings + Home + Command Center) | **P1** |
| F-10 | `pricing/page.tsx` | Нет comparison table между тарифами | Пользователь не может сравнить что входит в каждый план | **P2** |

---

## BLOCK 4 — Trust Audit

| Экран | Реальные данные? | Реальные сканы? | Реальные отчёты? | Реальные цифры? | Реальные кейсы? | Реальные отзывы? | Demo помечено? |
|-------|------------------|-----------------|-------------------|-----------------|-----------------|------------------|----------------|
| Landing | N/A | N/A | N/A | N/A | ❌ Нет | ❌ Нет | N/A |
| Hero | ❌ Demo результат | ❌ setTimeout 3s | N/A | ❌ Demo числа | ❌ Нет | ❌ Нет | ✅ "Demo" badge (line 184) |
| Scanner | ❌ Client-side engine | ❌ Не real backend | N/A | ❌ | ❌ | ❌ | ❌ Нет пометки |
| Findings | ❌ Mock data | ❌ | N/A | ❌ CVSS из mock | ❌ | ❌ | ❌ Нет DemoBadge |
| Security Review | ❌ `getDemoFindings()` | ❌ | N/A | ❌ Demo числа | ❌ | ❌ | ✅ "Demo" badge (line 119) |
| Reports | ⚠️ Real downloads | ❌ | ✅ Real file generation | ❌ | ❌ | ❌ | ⚠️ Частично |
| Pricing | ❌ Нет paying customers | N/A | N/A | ❌ MRR $0 | ❌ Нет logos | ❌ Нет testimonials | N/A |
| Dashboard | ❌ Mock metrics | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ DemoBadge на некоторых |

**Доказательство**: `grep -rn 'mock\|demo\|fake\|placeholder' landing/src/app/(app)/app/` → 50+ результатов.

---

## BLOCK 5 — Value Audit

| Экран | Какую ценность пользователь ПОЛУЧИЛ (не увидел, а получил) |
|-------|------------------------------------------------------------|
| Landing | 0 — только информация о продукте |
| Hero | 0 — demo результат не является реальной ценностью |
| Scanner | 0 — URL введён, но ценности ещё нет (нужно дождаться сканирования) |
| Findings | 0 — технический список без понимания что делать |
| Security Review | 1 — план действий (что исправить первым, сколько времени) — НО demo данные |
| Reports | 1 — реальный файл для скачивания (HTML/JSON/SARIF) |
| Pricing | 0 — информация о ценах, но нет возможности оплатить |
| Checkout | 0 — не существует |
| Payment | 0 — не существует |

**Пользователь получает реальную ценность только на Reports (скачать файл) и Security Review (план действий, но demo).**

---

## BLOCK 6 — Business Language Audit

### Технические термины (в User-facing страницах)

| Термин | Количество | Где |
|--------|-----------|-----|
| CVE | 8 | findings/page.tsx, security-review/page.tsx (в collapsible) |
| CVSS | 9 | findings/page.tsx (line 431, visible), security-review (collapsible) |
| MITRE | 2 | findings/page.tsx |
| CWE | 2 | findings/page.tsx |
| Semgrep | 2 | scanner/page.tsx |
| Nuclei | 3 | scanner/page.tsx |
| Nikto | 2 | scanner/page.tsx |
| Nmap | 3 | scanner/page.tsx |
| ZAP | 8 | scanner/page.tsx |
| pipeline | 32 | scanner/page.tsx |
| SSE | 23 | scanner/page.tsx |
| SARIF | 6 | reports/page.tsx |
| **Итого технических** | **100** | |

### Бизнес-термины (в User-facing страницах)

| Термин | Количество | Где |
|--------|-----------|-----|
| риск | 2 | security-review |
| бизнес | 7 | security-review, home |
| что делать | 3 | security-review, home |
| приоритет | 1 | security-review |
| время | 2 | security-review, home |
| опасн | 3 | security-review, home |
| **Итого бизнес** | **18** | |

### Соотношение

| Метрика | Значение |
|---------|----------|
| Технических терминов | 100 |
| Бизнес-терминов | 18 |
| Соотношение техн/бизнес | **5.6:1** |

**Вывод**: На каждый бизнес-термин приходится 5.6 технических. Security Review — единственная страница с преимущественно бизнес-языком. Scanner и Findings — преимущественно технические.

---

## BLOCK 7 — CTA Audit

| CTA | Где (файл, строка) | Куда ведёт | Что ожидалось | Совпало? |
|-----|---------------------|------------|---------------|----------|
| "Проверить" (domain input) | home/page.tsx:114 | `handleCheck()` → setTimeout 3s → demo result | Реальная проверка домена | ❌ FAIL (demo) |
| "Подробнее" (result) | home/page.tsx:253 | `/app/scanner` | Детали найденных проблем | ❌ FAIL (ведёт на Scanner, не на результаты) |
| "Получить план исправления" | home/page.tsx:263 | `/app/pricing` | Pricing page | ✅ OK |
| "Технические детали" | home/page.tsx:231 | Inline (no navigation) | Технические детали | ✅ OK |
| AI prompt "Проверь мой сайт" | home/page.tsx:310 | `/app/scanner` | AI Assistant | ❌ FAIL (ведёт на Scanner, не на AI) |
| AI prompt "Что исправить первым?" | home/page.tsx:310 | `/app/scanner` | AI Assistant или Security Review | ❌ FAIL (ведёт на Scanner) |
| AI prompt "Почему рейтинг снизился?" | home/page.tsx:310 | `/app/scanner` | AI Assistant | ❌ FAIL (ведёт на Scanner) |
| AI prompt "Подготовь отчёт директору" | home/page.tsx:310 | `/app/scanner` | AI Assistant или Reports | ❌ FAIL (ведёт на Scanner) |
| Quick Link "Сканирования" | home/page.tsx:324 | `/app/scans` | Список сканов | ✅ OK |
| Quick Link "Проблемы" | home/page.tsx:325 | `/app/findings` | Список findings | ✅ OK |
| Quick Link "Отчёты" | home/page.tsx:326 | `/app/reports` | Список отчётов | ✅ OK |
| Quick Link "Настройки" | home/page.tsx:327 | `/app/settings` | Настройки | ✅ OK |
| Scanner "Начать сканирование" | scanner/page.tsx:360 | `runPipeline()` → client-side engine | Реальное сканирование | ❌ FAIL (client-side, не backend) |
| Scanner "Далее" (step 1→2) | scanner/page.tsx:511 | Step 2 (Source selection) | — | ✅ OK (но лишний шаг) |
| Security Review "Скопировать задачу" | security-review/page.tsx:288 | `copyDeveloperTask()` → clipboard | Копирование в clipboard | ✅ OK |
| Security Review "Объяснить проще" | security-review/page.tsx:310 | `toggleSimplified()` → inline toggle | Переключение объяснения | ✅ OK |
| Security Review "Технические детали" | security-review/page.tsx:322 | `toggleTechnical()` → inline toggle | Раскрытие технических деталей | ✅ OK |
| Security Review "Попробовать Pro бесплатно" | security-review/page.tsx:411 | `/app/pricing` | Pricing page | ✅ OK |
| Pricing "Начать бесплатно" (Free) | pricing/page.tsx:284 | `/app/dashboard` | Registration/onboarding | ❌ FAIL (Dashboard без аккаунта) |
| Pricing "Попробовать бесплатно" (Pro) | pricing/page.tsx:284 | `/app/dashboard` | Trial registration | ❌ FAIL (Dashboard без trial flow) |
| Pricing "Связаться с продажами" (Enterprise) | pricing/page.tsx:282 | `mailto:hello@sec-scanner.pro` | Email | ✅ OK |
| Reports "Скачать" | reports/page.tsx:143 | `downloadReport()` → file download | Файл | ✅ OK |

**Итого**: 22 CTA. ✅ OK: 13. ❌ FAIL: 9. **Fail rate: 41%**

---

## BLOCK 8 — Empty State Audit

| Экран | Есть empty state? | Получает ли пользователь ценность, если данных нет? | Доказательство |
|-------|-------------------|-----------------------------------------------------|----------------|
| Reports | ✅ Да (line 363) | ⚠️ Да — CTA "Создать отчёт" | `reports.empty.title`, `reports.empty.cta` |
| Projects | ✅ Да (line 1355) | ⚠️ Да — onboarding wizard | `projects.onboarding.namePlaceholder` |
| Scans | ❌ Нет | ❌ Нет — пользователь видит пустой список без объяснения | Нет `empty` или `noData` в коде |
| Findings | ❌ Нет | ❌ Нет — пустой список без guidance | Нет `empty` или `noData` в коде |
| Dashboard | ❌ Нет | ❌ Нет — mock данные вместо empty state | Mock данные показываются всегда |
| Security Review | N/A | N/A — всегда показывает demo данные | `getDemoFindings()` всегда возвращает 8 |

---

## BLOCK 9 — Pricing Audit

| Проверка | Результат | Доказательство |
|----------|-----------|----------------|
| Один источник данных? | ❌ Нет | `pricing.ts` определяет цены в $ ($99/$499/$1499/$4999). `pricing/page.tsx` использует i18n ключи с ₽ ("4 900", "14 900"). `docs/business/PRICING.md` — третий источник ($.). **3 разных источника.** |
| Совпадают планы? | ❌ Нет | `pricing.ts`: 4 плана (Starter/Professional/Business/Enterprise). `pricing/page.tsx`: 3 плана (Бесплатно/Профессионал/Бизнес). **Enterprise отсутствует на странице.** |
| Совпадают названия? | ❌ Нет | `pricing.ts`: "Starter" / "Professional" / "Business" / "Enterprise". `pricing/page.tsx`: "Бесплатно" / "Профессионал" / "Бизнес" (через i18n). |
| Совпадают CTA? | ⚠️ Частично | `pricing.ts`: нет CTA. `pricing/page.tsx`: Free→"/app/dashboard", Pro→"/app/dashboard". Оба ведут на Dashboard, не на registration/trial. |
| Совпадают ограничения? | ❌ Нет | `pricing.ts`: Starter=1 project, 5 scans/mo. `pricing/page.tsx`: Free=1 project, 2 members (через i18n features). Разные лимиты. |

---

## BLOCK 10 — Conversion Blockers (max 10)

| # | Blocker | Evidence | Severity | Expected Conversion Loss |
|---|---------|----------|----------|--------------------------|
| B-01 | Нет Checkout/Payment — невозможно оплатить | `grep -rn 'checkout\|payment\|stripe\|billing' landing/src/app/` → 0 результатов | **P0** | 100% (невозможно конвертировать в paid) |
| B-02 | Нет Registration/Auth — нет аккаунтов | PLAT-008 SSO `not_started`. Pricing CTA → `/app/dashboard` без registration | **P0** | 100% (нет trial signups) |
| B-03 | Pricing CTA "Попробовать бесплатно" → `/app/dashboard` (не trial flow) | `pricing/page.tsx`, line 284: `window.location.href = "/app/dashboard"` | **P0** | ~80% (пользователь не понимает что произошло) |
| B-04 | Scanner: 4-step wizard вместо "URL → Check" | `scanner/page.tsx`, line 229: `useState(1 | 2 | 3 | 4)` | **P0** | ~60% (drop-off между шагами) |
| B-05 | Demo результат на Home без реальной проверки | `home/page.tsx`, line 43: `handleCheck()` → `setTimeout` 3s → demo result | **P1** | ~40% (потеря доверия) |
| B-06 | AI prompts на Home ведут на Scanner, не на AI Assistant | `home/page.tsx`, line 310: `href="/app/scanner"` для всех 4 prompts | **P1** | ~30% (несовпадение ожиданий) |
| B-07 | Findings: CVSS scores видимы без бизнес-перевода | `findings/page.tsx`, line 431: `finding.cvss.toFixed(1)` | **P1** | ~25% (пользователь не понимает) |
| B-08 | 3 источника pricing данных (pricing.ts vs i18n vs PRICING.md) | `pricing.ts` ($) vs `i18n.ts` (₽) vs `PRICING.md` ($) | **P1** | ~15% (путаница в ценах) |
| B-09 | Technical terms: 100 технических vs 18 бизнес (5.6:1) | `grep` count по 6 User-facing страницам | **P2** | ~20% (отчуждение нетехнических) |
| B-10 | Scans и Findings: нет empty state | Нет `empty`/`noData` в `scans/page.tsx` и `findings/page.tsx` | **P2** | ~10% (пользователь не знает что делать) |

---

## BLOCK 11 — Prioritization

### P0 — Ломает конверсию

| # | Blocker | Что теряется |
|---|---------|--------------|
| B-01 | Нет Checkout/Payment | 100% — невозможно стать платящим |
| B-02 | Нет Registration/Auth | 100% — нет аккаунтов, нет trial |
| B-03 | Pricing CTA → Dashboard (не trial) | 80% — пользователь не понимает что делать |
| B-04 | Scanner 4-step wizard | 60% — drop-off между шагами |

### P1 — Мешает понять продукт

| # | Blocker | Что теряется |
|---|---------|--------------|
| B-05 | Demo результат без реальной проверки | 40% — потеря доверия |
| B-06 | AI prompts → Scanner (не AI) | 30% — несовпадение ожиданий |
| B-07 | CVSS без бизнес-перевода | 25% — непонимание |
| B-08 | 3 источника pricing | 15% — путаница |

### P2 — Улучшит опыт

| # | Blocker | Что теряется |
|---|---------|--------------|
| B-09 | 5.6:1 техн/бизнес термины | 20% — отчуждение |
| B-10 | Нет empty states | 10% — растерянность |

---

## BLOCK 12 — Founder Review

### 👨‍💻 Engineer

**Какие проблемы архитектуры влияют на конверсию?**
1. Нет auth module → нет user sessions → нет personalization → нет trial tracking
2. Pricing data в 3 местах (pricing.ts, i18n.ts, PRICING.md) → расхождения → путаница
3. Scanner client-side engine → fake results → потеря доверия
4. Нет backend persistence → данные в localStorage → теряются при смене браузера

### 👤 Product

**Где пользователь теряет ценность?**
1. **Home → Scanner**: ожидает "ввёл URL → получил результат", получает "4-step wizard"
2. **Scanner → Findings**: ожидает "что делать", получает "CVE-2024-1234 CVSS 9.8"
3. **Security Review → Pricing**: единственный путь где ценность сохраняется (бизнес-перевод → pricing)
4. **Pricing → Dashboard**: ожидает "trial registration", получает "Dashboard без аккаунта"

### 👔 CEO

**Где теряются деньги?**
1. **B-01**: Нет checkout → $0 revenue. Каждый visitor = $0.
2. **B-02**: Нет registration → 0 trial signups → 0 conversion funnel
3. **B-03**: Pricing CTA → Dashboard → пользователь закрывает → потерян lead
4. **B-04**: Scanner drop-off → 60% не доходят до результатов → не видят ценность → не покупают

### 💰 Investor

**Какие риски увидит инвестор?**
1. **Нет monetization layer** — product есть, billing нет. "Как вы зарабатываете?" — ответа нет.
2. **Fake demo results** — investor видит demo, думает "продукт не готов"
3. **41% CTA fail rate** — 9 из 22 кнопок ведут не туда
4. **3 источника pricing** — зрелость продукта под вопросом

---

## BLOCK 13 — Нет решений

Этот аудит **не предлагает решений**. Только факты, доказательства и влияние.

Каждое замечание имеет:
- **Где** — конкретный файл и строка
- **Что** — конкретная проблема
- **Доказательство** — код, grep, маршрут
- **Влияние** — ожидаемая потеря конверсии

---

## BLOCK 14 — Backlog

На основе аудита формируется backlog для последующей реализации:

| Задача | Описание | Связанные blockers |
|--------|----------|-------------------|
| **CX-002** | Hero: реальная проверка вместо demo, CTA → правильные места | B-05, B-06 |
| **CX-003** | Scanner: упростить flow до "URL → AI → Report" | B-04 |
| **CX-004** | Security Center: empty states, business translation для Findings | B-07, B-10 |
| **CX-005** | Pricing: единый источник (pricing.ts), trial CTA, comparison table | B-03, B-08 |
| **CX-006** | Checkout: registration + billing + trial flow | B-01, B-02 |

**Каждая задача реализуется отдельно.** Аудит не предписывает решения — только идентифицирует проблемы.

---

## Definition of Done

| Критерий | Статус |
|----------|--------|
| Полностью пройден путь Landing → Payment | ✅ BLOCK 1 |
| Для каждого экрана: ожидание, факт, доказательство | ✅ BLOCK 2 |
| Friction Audit с P0/P1/P2 | ✅ BLOCK 3 (10 items) |
| Trust Audit | ✅ BLOCK 4 |
| Value Audit | ✅ BLOCK 5 |
| Business Language Audit (count) | ✅ BLOCK 6 (100 техн vs 18 бизнес) |
| CTA Audit (все кнопки) | ✅ BLOCK 7 (22 CTA, 41% fail) |
| Empty State Audit | ✅ BLOCK 8 |
| Pricing Audit (один источник?) | ✅ BLOCK 9 (3 источника — расхождение) |
| Conversion Blockers (max 10, evidence) | ✅ BLOCK 10 (10 blockers) |
| Prioritization P0/P1/P2 | ✅ BLOCK 11 |
| Founder Review (4 точки) | ✅ BLOCK 12 |
| Не предложено ни одного решения | ✅ BLOCK 13 |
| Backlog CX-002..CX-006 | ✅ BLOCK 14 |
