# PRODUCT_MARKET_FIT_BLUEPRINT.md — Sec Scanner

> **Дата:** 2026-07-14
> **Версия:** 2.0 (Executive Strategy Sprint)
> **Тип:** Стратегический документ — внутренняя стратегия, основа для Private Beta и инвесторов
> **Зависит от:** MULTI_CHANNEL_PRODUCT_STRATEGY.md, PLATFORM_API_ARCHITECTURE.md, SECURITY_STATE_ENGINE.md, EXPLAINABILITY_LAYER.md, PLATFORM_AUDIT.md

---

## Executive Summary

### Четыре ключевых вопроса

**1. Почему пользователь выберет именно наш продукт?**

Sec Scanner — единственный DAST-инструмент, который переводит технические результаты сканирования на язык бизнеса. Не «47 уязвимостей найдено», а «Security Score 68/100, тренд ↑5 за неделю, вот 3 исправления с максимальным ROI». Для CTO/Team Lead стартапа это разница между «непонятным отчётом от security-инструмента» и «dashboard, который можно показать инвесторам».

**2. Почему он будет готов платить?**

Потому что альтернативы хуже: ZAP бесплатен, но требует экспертизы и ручной интерпретации; Snyk ($25/dev/мес) покрывает SAST/SCA, но DAST там ограничен; Checkmarx ($8K+/год) недоступен для стартапа. Sec Scanner закрывает промежуток: business-интерпретация DAST-результатов за $29-79/мес — в 3-10 раз дешевле enterprise-решений при уникальной функциональности.

**3. Почему он останется с нами через год?**

Три механизма удержания: (a) **Security Score как привычка** — еженедельный мониторинг становится частью CTO routine, как New Relic APM или Grafana; (b) **Тренды и регрессии** — пользователь видит, как его работа улучшает Score, что создаёт positive reinforcement loop; (c) **Team collaboration** — roles, shared dashboard, API keys — когда команда интегрирует инструмент в workflow, switching cost становится высоким.

**4. Что должно произойти за 90 дней?**

- Landing Page + signup flow (День 1-7)
- 50 beta-users, 20+ активных еженедельно (День 7-30)
- 5+ paying intent signals, 3+ testimonials (День 30-60)
- Public launch: Product Hunt + HN + Reddit (День 45-60)
- $500 MRR, 30 paying customers (День 60-90)
- Два ключевых валидационных вывода: (a) activation > 12%, (b) хоть один пользователь решил повторно сканировать через 7 дней без напоминания

Если эти цели не достигнуты — pivot на позиционирование (не «DAST-инструмент», а «Security Posture Dashboard для данных из любых сканеров»).

---

## 1. Анализ рынка

### 1.1 Объём и структура (данные CTO + Investor)

**CTO Perspective:** Рынок Application Security Testing (AST) составляет $1.83 млрд (2025) с прогнозом до $7.60 млрд к 2031 году при CAGR 26.7% (MarketsandMarkets). DAST как отдельный сегмент: $3.61 млрд (2025) → $8.52 млрд к 2030 (Mordor Intelligence, Research and Markets). Для Sec Scanner наиболее релевантен узкий сегмент **SaaS DAST для веб-приложений и API**, который мы оцениваем в $800M-1.2B (2025). Рынок достаточно велик для создания $10-50M ARR компании.

**Investor Perspective:** AST-рынок растёт быстрее, чем общие IT-расходы (26.7% CAGR vs ~5% IT budget growth). Драйверы — не «хотят купить», а «должны купить»: регуляции (DORA, NIS2, ISO 27001, PCI DSS 4.0), страх reputational damage, страх regulatory fines. Это demand-driven рынок. Хорошая новость: даже при 1% market share через 5 лет — это $40-75M revenue opportunity. Плохая: рынок фрагментирован, много конкурентов, enterprise-сегмент закрыт для bootstrapped startup.

### 1.2 Ключевые тренды (анализ VP Marketing + CPO)

**Тренд 1: Конвергенция в ASPM.** 67% enterprise-компаний ищут unified платформы (Palo Alto, State of ASPM 2026). Gartner выделил ASPM как отдельную категорию в 2024. Для нас это означает: позиционирование «DAST с объяснимостью» нужно расширять до «Security Posture для веб-приложений».

**Тренд 2: AI-driven security.** Semgrep — AI-assisted SAST; Snyk — AI-powered fixes; Checkmarx — «Agentic AI». Однако в DAST AI применяется слабо. Sec Scanner с Strategy Pattern (`ScoreStrategy`, `TrendStrategy`, `RecommendationStrategy`) уже готов к AI-расширению без изменения доменного слоя — это архитектурное преимущество.

**Тренд 3: Platformization (CNAPP).** Wiz ($10B+ valuation), Prisma Cloud, Orca — стремятся стать «всё-в-одном». Для Sec Scanner это не прямая угроза (разные сегменты), но сигнал: если не дифференцироваться, можно быть «поглощённым» общей платформой.

**Тренд 4: Developer-first shift-left.** Разработчики — основные «покупатели» security-инструментов. Snyk и Semgrep построили бизнес на этом сдвиге. 42% эксплуатируемых уязвимостей (Verizon DBIR 2025) — веб-приложения, но разработчики игнорируют DAST из-за high noise ratio. Sec Scanner с Confidence Score и ROI-сортировкой решает эту боль.

**Тренд 5: Workforce gap.** ~3.5 млн незакрытых cybersecurity-позиций (ISC2, 2025). Инструменты, позволяющие НЕ-специалистам принимать security-решения, обретают дополнительную ценность. Security Score (0-100) — именно такой инструмент для CTO без security-бэкграунда.

**VP Marketing Note:** AI — не просто тренд, а narrative, на котором мы можем строить маркетинг. Однако важно не «перегнуть»: наш Explainability Layer — детерминированный, не AI-generated. Это конкурентное преимущество (воспроизводимость, отсутствие галлюцинаций). Маркетинговый фрейм: «Deterministic Explainability — AI can hallucinate, we don't».

### 1.3 Незакрытые потребности (Customer Success Lead Perspective)

1. **«Переводчик» security → business.** Нигде нет детерминированного слоя, связывающего findings с бизнес-метриками. Существующие risk scoring основаны на CVSS и не учитывают контекст приложения. Sec Scanner вычисляет Security Score на основе severity, confidence, трендов и факторов изменения.

2. **Доступный DAST для SMB.** Промежуток между ZAP (бесплатно) и Checkmarx ($20K+/год) практически пуст. Snyk ($25/dev/мес) и Semgrep ($30/contributor/мес) закрывают SAST/SCA, но DAST ограничен. StackHawk существует, но без бизнес-интерпретации.

3. **Continuous posture, не point-in-time.** Большинство DAST — разовое сканирование. Security State Engine отслеживает эволюцию, выявляет регрессии, вычисляет тренды — ближе к CSPM-подходу, но для веб-приложений.

4. **Risk management без security-команды.** Компании 5-50 разработчиков не могут нанять dedicated security-инженера. Им нужен инструмент, позволяющий Team Lead или CTO принимать решения на основе ROI-анализа, а не CVSS-баллов.

5. **Onboarding < 5 минут.** Enterprise-инструменты (Checkmarx, Veracode) требуют 2-8 недель onboarding. Для стартапа это неприемлемо. SaaS DAST должен обеспечить «first scan in 3 minutes».

### 1.4 Самые быстрорастущие сегменты

| Сегмент | CAGR | Стратегическое значение для Sec Scanner |
|---------|------|----------------------------------------|
| SaaS DAST | ~19% | Прямой целевой сегмент |
| API Security Testing | ~22% | Естественное расширение (Phase 2) |
| DevSecOps Tools | ~24% | CI/CD интеграция — ключевая для retention |
| AI-native AppSec | ~35% | Самый быстрый, но ранний — мониторить |
| ASPM (Aggregation) | ~25% | Стратегическое направление (Phase 3) |

---

## 2. Конкурентный анализ

### 2.1 Сравнительная матрица

| Характеристика | **Sec Scanner** | **Snyk** | **Semgrep** | **SonarQube** | **GHAS** | **DefectDojo** | **Checkmarx One** | **Wiz** | **GitLab Ultimate** |
|---|---|---|---|---|---|---|---|---|---|
| **Тип** | DAST SaaS | SAST/SCA/DAST | SAST/SCA | SAST/Quality | SAST/SCA/Sec | Vuln Mgmt | SAST/DAST/SCA | CNAPP | SAST/DAST/SCA |
| **Целевая аудитория** | Startup/SMB | Dev (any size) | Dev (any size) | Eng teams | GitHub users | Sec teams | Enterprise 200+ | Enterprise 500+ | GitLab users |
| **Мин. цена** | **$29/мес (flat)** | $25/dev/мес | $30/contrib/мес | $34/мес | $19/committer/мес | Free | ~$8K/год | ~$58K/год | $29/user/мес |
| **Startup (10 devs)** | **$79/мес** | $250/мес | $300/мес | $34/мес* | $190-300/мес | Free | $8-15K/год | N/A | $290/мес |
| **Security Score 0-100** | **Да** | Нет | Нет | Нет | Нет | Нет | Risk score | Risk score | Нет |
| **Explainability Layer** | **Да** | AI fixes | AI fixes | Rule desc | Нет | Нет | AI summary | AI summary | Нет |
| **Тренды во времени** | **Да** | Limited | Нет | Historical | Нет | Да | Да | Да | Limited |
| **ROI-рекомендации** | **Да** | Priority | Priority | Нет | Нет | Priority | Priority | Priority | Нет |
| **Executive Summary** | **Да** | Нет | Нет | Нет | Нет | Reports | Да | Да | Reports |
| **DAST** | **Ядро** | Базовый | Нет | Нет | Нет | Агрегация | Сильный | Нет | Базовый |
| **Time to First Value** | **~3 мин** | ~15 мин | ~10 мин | ~30 мин | ~5 мин | ~2 часа | ~2 недели | ~1 неделя | ~1 час |
| **Open Source** | Нет | Частично | Да | Да (comm) | Нет | Да | Нет | Нет | Нет |

*\*SonarQube pricing per LoC, not per user*

### 2.2 Детальный анализ конкурентов

#### Snyk

**Позиционирование:** «Developer Security Platform» — безопасность, встроенная в workflow разработчика.

**Преимущества:** Developer-first UX, глубокая IDE/CI/CD интеграция, огромная vulnerability database (Snyk Intel), AI auto-fix, 2000+ enterprise клиентов, сильный brand.

**Слабые стороны:** DAST ограничен по сравнению со специализированными инструментами. Нет Security Score как composite metric. Pricing растёт с масштабом (enterprise $67K-90K/год для 100 devs). Высокий noise ratio для SCA. Нет бизнес-интерпретации для C-level.

**Ценовая модель:** Free (200 SCA + 100 SAST/мес), Team ($25/dev/мес), Enterprise (custom).

**Head of Sales Analysis:** Snyk продаёт developer experience, а не security outcomes. Это их сила, но и ограничение — когда CTO спрашивает «насколько мы безопасны?», Snyk не отвечает на этот вопрос. Sec Scanner на это отвечает. Продажа против Snyk: «Snyk отлично находит проблемы. Мы объясняем, что с ними делать, и показываем, становится ли лучше».

#### Semgrep

**Позиционирование:** «Lightweight static analysis for many languages» — скорость и расширяемость SAST.

**Преимущества:** Open-source core, быстрый сканер, гибкие custom rules (YAML), Gartner Magic Quadrant 2025, AI-assisted SAST.

**Слабые стороны:** Нет DAST. Нет Security Score. Community edition сильно урезана (50 AI credits/dev). Слабая enterprise поддержка (RBAC, SSO).

**Ценовая модель:** Free (community), Team ($30/contrib/мес), Enterprise (custom).

**CPO Analysis:** Semgrep — потенциальный партнёр, не конкурент. Их SAST + наш DAST + Explainability = compelling combo. Integration opportunity: Semgrep findings → Sec Scanner Score aggregation.

#### SonarQube / SonarCloud

**Позиционирование:** «AI Code Verification at Scale» — качество кода + базовый SAST.

**Преимущества:** Золотой стандарт code quality, 40+ языков, сильная CI/CD интеграция, self-hosted опция.

**Слабые стороны:** SAST базовый (focus на quality). Нет DAST. Pricing вырос значительно (~3200 → ~7200 EUR/год за 1M LoC). Нет бизнес-интерпретации.

**Ценовая модель:** Free (community), Team ($34/мес SonarCloud), Enterprise (custom). Server: perpetual от ~$15K/1M LoC.

**Product Designer Analysis:** SonarQube — лучшая аналогия для UX. Их Quality Gate концепция — пример того, как техническая метрика стала понятной (green/yellow/red). Security Score должен работать так же просто. Но SonarQube не отвечает «почему?» — наш Explainability Layer это делает.

#### GitHub Advanced Security (GHAS)

**Позиционирование:** «Built-in protection for every repository» — безопасность внутри GitHub.

**Преимущества:** Zero friction для GitHub-команд, CodeQL, secret scanning, free для public repos, push protection.

**Слабые стороны:** Привязка к GitHub. Нет DAST. Нет Security Score. Pricing по active committers — непредсказуем. CodeQL сложен для custom rules.

**Ценовая модель:** Code Security $30/committer/мес, Secret Protection $19/committer/мес. Free для public.

**CTO Analysis:** GHAS — не конкурент, а контекст. Компании, платящие за GHAS, уже инвестируют в security. Sec Scanner можно позиционировать как «runtime security layer, который GHAS не покрывает». Интеграция через API: GHAS findings → Sec Scanner dashboard.

#### DefectDojo

**Позиционирование:** «Open-Source Vulnerability Management and ASPM» — агрегатор findings из 200+ сканеров.

**Преимущества:** Единственный OSS vuln management с enterprise-фичами. 200+ scanner integrations. Deduplication, triage, remediation tracking. OWASP project.

**Слабые стороны:** Не сканер — требует внешний DAST. Сложная настройка (Django). Устаревший UI/UX. Нет composite Security Score. Pro pricing непрозрачный.

**Ценовая модель:** Free (community), Pro (custom).

**Investor Analysis:** DefectDojo — потенциальный acquirer или стратегический партнёр. Если Sec Scanner станет «лучшим DAST для DefectDojo», это создаёт channel partnership. Риск: DefectDojo может добавить scoring. Но их monolithic Django-архитектура делает это сложным.

#### Checkmarx One

**Позиционирование:** «Agentic AI Cloud-Based AppSec Platform» — всё-в-одном для enterprise.

**Преимущества:** Gartner Leader, full coverage (SAST/DAST/SCA/IaC/API), AI-powered, 70% better fidelity, сильная корреляция/dedup.

**Слабые стороны:** Enterprise pricing ($8K-100K+/год). Долгий onboarding (2-8 недель). Тяжёлый UI. Требует dedicated AppSec engineer. Vendor lock-in.

**Ценовая модель:** Small (<50 devs) $8-15K/год, Medium (50-200) $15-30K/год, Large (200+) $40-100K+/год.

**Head of Sales Analysis:** Checkmarx — не конкурент для наших сегментов. Если CTO стартапа рассматривает Checkmarx — это сигнал, что нам уже не продать (они готовы к enterprise-инструменту). Но 95% стартапов 5-20 человек даже не будут рассматривать Checkmarx из-за цены.

#### Wiz

**Позиционирование:** «Cloud Security Platform» — CNAPP лидер.

**Преимущества:** Agentless, единая панель, $10B+ valuation, >$500M ARR (est.), exceptional enterprise UX.

**Слабые стороны:** Cloud-only (не покрывает on-premise веб-приложения). Enterprise pricing (median ~$111K/год). Нет DAST в классическом понимании.

**Ценовая модель:** Custom, ~$58.5K-354K/год. Минимальный контракт ~$58.5K/год.

**CEO Analysis:** Wiz доказывает, что market готов платить за «простое объяснение сложных security-данных». Их success — валидация нашего подхода. Но Wiz = cloud infra, Sec Scanner = web apps. Разные рынки, одинаковая философия.

#### GitLab Ultimate Security

**Позиционирование:** «Intelligent Orchestration Platform» — DevSecOps внутри GitLab.

**Преимущества:** Встроен в GitLab, SAST/DAST/SCA/IaC/Container, AI agents, auto-remediation MR.

**Слабые стороны:** DAST только на Ultimate ($29-99/user/мес). DAST базовый. Нет Security Score. Привязка к GitLab.

**Ценовая модель:** Ultimate: $29-99/user/мес.

**Customer Success Analysis:** Если клиент уже на GitLab Ultimate — ему встроенный DAST «достаточно» для базовых нужд. Но когда он хочет «что-то большее» — Sec Scanner с Explainability станет естественным апгрейдом. Позиционирование: «Sec Scanner добавляет бизнес-интерпретацию поверх GitLab DAST results».

### 2.3 Матрица угроз и возможностей

| Конкурент | Угроза | Срок | Стратегия | Возможность |
|-----------|--------|------|-----------|-------------|
| Snyk (DAST expansion) | Средняя | 12-18 мес | Дифференциация через Explainability | Integration: Snyk findings → Score |
| New AI-native DAST startup | **Высокая** | 6-12 мес | **Speed-to-market** | — |
| GitLab (DAST improvement) | Средняя | 12-18 мес | «Add-on» позиционирование | Integration: GitLab → Score |
| DefectDojo (scoring) | Низкая | 18-24 мес | Партнёрство | Channel partnership |
| Checkmarx (SMB tier) | Низкая | 24+ мес | Скорость и DX | — |
| Wiz (web app scanning) | Минимальная | 24+ мес | Focus на web-specific | — |

**Наибольшая угроза — не существующие игроки, а новый AI-native DAST startup**, который может появиться за 6-12 месяцев с «Security Score + AI explanation» и $5M seed. Это главный аргумент для немедленного запуска.

---

## 3. Ideal Customer Profile (ICP)

### 3.1 Приоритизация сегментов

| Сегмент | Приоритет | TAM | LTV (est.) | CAC (est.) | LTV/CAC | Обоснование |
|---------|-----------|-----|------------|------------|---------|-------------|
| **Startup 5-20 devs** | **P0** | ~$200M | $700-1,200 | $30-50 | **15-40x** | Наибольший pain, быстрое принятие решений |
| **SMB 20-50 devs** | **P0** | ~$350M | $1,500-2,400 | $80-150 | **10-30x** | Compliance needs, budget доступен |
| Individual Developer | P1 | ~$100M | $150-350 | $5-15 | **10-70x** | Широкая воронка, referral engine |
| Mid-Market 50-200 devs | P2 | ~$300M | $3,000-6,000 | $300-800 | **4-20x** | Длинный sales cycle |
| Enterprise 200+ devs | P3 | ~$1B+ | $10,000-50,000 | $2,000-10,000 | **2-25x** | Не целевой сегмент сейчас |

**Head of Sales Perspective:** LTV/CAC > 3x — здоровый показатель. Startup/SMB сегменты дают 15-40x при правильном execution. Но эти оценки **гипотетические** — нет paying customers. Первая задача: валидировать через beta.

### 3.2 Детальный профиль P0-сегментов

#### Startup, 5-20 разработчиков (P0 — PRIMARY)

**Роли в принятии решения:** CTO/Technical Founder (80%), VP Engineering (15%), CEO (5%).

**Боли (Customer Success Lead):**
- Продукт растёт, user base увеличивается — security становится реальным риском. Один инцидент может уничтожить reputation стартапа.
- ZAP требует ручного запуска и интерпретации — никто не хочет этим заниматься. Результат: сканирование происходит раз в несколько месяцев, если вообще.
- Инвесторы начинают задавать security-вопросы на due diligence. Нет ответа.
- Snyk ($25/dev/мес) для 10-person команды = $250/мес — уже заметно в startup budget. При этом DAST там слабый.
- Checkmarx ($8K+/год) — «мы не можем это себе позволить».
- Нет dedicated security-человека. Ответственность размыта. Каждый думает «кто-нибудь другой позаботится».
- Awaiting SOC 2 audit from enterprise client. Нужно доказать regular security testing.

**Цели:**
- Пройти security due diligence от инвесторов/enterprise клиентов
- Снизить risk критического security-инцидента
- Иметь понятный «security dashboard» для board meetings
- Не нанимать dedicated security engineer (бюджет)
- Встроить security в CI/CD без overhead

**Критерии выбора (VP Marketing — messaging targets):**
- Time-to-value < 1 день
- Цена < $100/мес (flat, не per-developer)
- Не требует security-экспертизы для интерпретации
- Понятный для CTO/Founder отчёт
- CI/CD интеграция (хотя бы webhook)

**Причины отказа:**
- Скептицизм: «мы ещё слишком маленькие»
- Бюджет: «каждый $ имеет значение»
- Инерция: «мы уже используем GitHub security / SonarQube»
- Отсутствие trust: «кто вы? где testimonials?»

**Вероятность покупки:** 8-12% (Free → Paid conversion за 30 дней) при хорошем onboarding. Benchmark для developer-tools SaaS: 3-5% average, 8-12% good (Recurly 2025).

**LTV estimation:** $700-1,200. При $79/мес (Team tier), retention 12-16 месяцев (до следующего funding round или enterprise upgrade). Churn trigger: raised Series A → переход на Snyk Enterprise/Checkmarx. Mitigation: к этому моменту иметь Business tier с SSO и compliance reporting.

#### SMB, 20-50 разработчиков (P0 — SECONDARY)

**Роли в принятии решения:** CTO/VP Engineering (60%), Security Lead (30%), CEO/CFO (10%).

**Боли:**
- Компания выросла до размера, где security-инцидент = customer trust loss + regulatory fines.
- Security questionnaires от клиентов (B2B sales) требуют ответов. Нет системного подхода.
- Несколько продуктов/сервисов — нужно отслеживать security posture каждого.
- Compliance (SOC 2, ISO 27001) требует доказательств regular testing. Аудиторы спрашивают «покажите историю сканирований».
- Существующие инструменты (ZAP + SonarQube + spreadsheet) не коррелируются.
- Security engineer (если есть) перегружен — тратит время на ручную triage вместо real work.

**Цели:**
- Пройти compliance audit без consultant fees ($15-30K)
- Единый dashboard для всех продуктов
- Systematic approach вместо ad-hoc сканирования
- Reports для leadership и auditors

**Критерии выбора:**
- Team collaboration (roles, audit trail)
- Reports (PDF, API export) для compliance
- Security Score как KPI
- API для интеграции
- Responsive support (< 24h)

**Причины отказа:**
- Предпочитают «known brand» (Snyk, SonarQube)
- Требуют POC/trial
- Sales cycle длиннее (need approval)

**Вероятность покупки:** 5-8% (Free → Paid, 30-60 дней). Conversion ниже, но LTV выше.

**LTV estimation:** $1,500-2,400. При $199/мес (Business tier), retention 8-12 месяцев. Churn trigger: hired CISO → wants enterprise solution. Mitigation: Business tier с SSO и custom strategies.

#### Individual Developer (P1 — FUNNEL BUILDER)

**Customer Success Lead Note:** Этот сегмент не приносит revenue напрямую (LTV $150-350), но он критически важен для:
- Word-of-mouth и organic growth
- GitHub stars и credibility
- Early product feedback
- Content creation («I use Sec Scanner for my side project»)

**Стратегия:** Generous free tier. Конвертировать в paying только когда developer → startup (joined a team, launched a product). Это long-game стратегия.

### 3.3 Персоны

**Персона 1: «Alex, Technical CTO»**
- Стартап, 12 разработчиков, Series A
- Технический бэкграунд, но не security-специалист
- Боль: инвесторы спрашивают «how do you handle security?»
- Нужен: один slide для board meeting с Security Score
- Путь к покупке: увидел HN post → попробовал на своём продукте → показал Score cofounder → «нам это нужно»

**Персона 2: «Maria, VP Engineering»**
- SMB, 35 разработчиков, B2B SaaS
- Отвечает за engineering + security (без dedicated team)
- Боль: enterprise client требует SOC 2, нужен proof of regular testing
- Нужен: PDF-отчёты с историей + автоматическое еженедельное сканирование
- Путь к покупке: гуглила «DAST tool for SOC 2» → нашла comparison page → запросила trial → setup 3 projects → показала CTO → approval

**Персона 3: «James, Solo Developer»**
- Side-project, 1 человек,追梦产品
- Технически подкован, интересуется security
- Боль: хочет проверить свой проект, но ZAP слишком сложный
- Нужен: quick scan + понятный результат
- Путь к покупке: Dev.to article → signup → scanned demo target → «cool, bookmark for later» → через 3 месяца joined startup → вернулся и создал team

---

## 4. Ценностное предложение

### 4.1 Core Messaging

**One-liner (CEO):** Sec Scanner: DAST, который объясняет, а не просто находит.

**Elevator Pitch (VP Marketing):** «Большинство DAST-инструментов выдают список из сотен уязвимостей и оставляют вас разбираться, что критично. Sec Scanner — DAST SaaS для стартапов и SMB, который автоматически вычисляет Security Score (0-100), отслеживает тренды, объясняет причины изменений и рекомендует, что исправить в первую очередь для максимального ROI. Первый скан — за 3 минуты, без установки, без кредитной карты.»

**Unique Selling Proposition (CPO):** Security Score (0-100) + Deterministic Explainability + ROI-отсортированные рекомендации — в одном SaaS за $29/мес. Ни один конкурент не предлагает эту комбинацию.

**Mission (CEO):** Демократизировать application security, превратив сложные технические результаты сканирования в понятные, объяснимые и действенные бизнес-метрики.

**Vision (CEO):** Мир, в котором каждая команда понимает своё состояние безопасности так же просто, как здоровье приложения в New Relic или качество кода в SonarQube. Без dedicated security-команды, без CVSS-мануалов, без alert fatigue.

### 4.2 Ключевые сообщения для разных каналов

**Landing Page Hero:**
- Headline: «Your application's security, scored and explained.»
- Subhead: «Scan any web app. Get a Security Score (0-100). Understand what to fix first. No installation, no credit card.»
- CTA: «Scan your first target — free»

**For CTO/Founder (board meeting):**
- «Security Score: one number that tells your board you're on top of security.»
- «Not another vulnerability list. A clear, explainable security posture you can act on.»

**For Developer (HN, Reddit, Dev.to):**
- «DAST with an Explainability Layer — pure functions, Strategy Pattern, zero framework dependencies in the scoring engine.»
- «Built with Clean Architecture + DDD. Your security scores are deterministic, reproducible, and extensible.»

**For Security Engineer (r/netsec):**
- «Deterministic explainability, not AI hallucination. Every score change is traceable to specific findings. Full audit trail.»

**Product Designer Note on messaging discipline:** Все сообщения должны проходить «one-minute test» — если нельзя объяснить за 60 секунд, сообщение слишком сложное. Правило: одно сообщение = одна идея. Не смешивать «we have clean architecture» с «we're $29/month» в одном предложении.

### 4.3 Почему это работает (Product Designer Perspective)

Три уровня ценностного предложения:

1. **Функциональный:** «Мы находим уязвимости в вашем веб-приложении» — это commodity. ZAP делает это бесплатно.
2. **Практический:** «Мы показываем Security Score, тренды и рекомендуем, что исправить» — это differentiation. Никто больше не делает.
3. **Эмоциональный:** «Вы больше не чувствуете себя незащищённым. Вы знаете свой Score, видите, что он улучшается, и можете это доказать» — это retention.

Большинство конкурентов застряли на уровне 1. Sec Scanner — на уровне 2 с потенциалом уровня 3. Маркетинг должен подчёркивать уровни 2 и 3.

---

## 5. Монетизация

### 5.1 Философия ценообразования (CEO + Head of Sales)

**Три принципа:**

1. **Freemium, не free trial.** Пользователь получает ценность до оплаты. Free tier — рабочий инструмент, не «огрызок». Это снижает барьер входа и создаёт organic word-of-mouth.

2. **Flat pricing, не per-developer.** Для стартапов per-developer pricing создаёт friction (team size fluctuates, budgeting непредсказуемо). Flat pricing проще и честнее. Кроме того, flat pricing стимулирует приглашать всю команду — а больше пользователей = выше switching cost = ниже churn.

3. **Естественные upgrade триггеры.** Каждый tier имеет чёткое ограничение, которое становится blocker при росте. Пользователь не «продаётся» — он «вырастает» из текущего плана.

### 5.2 Тарифная сетка

| | **Free** | **Pro** $29/мес | **Team** $79/мес | **Business** $199/мес | **Enterprise** Custom |
|---|---|---|---|---|---|
| **Для кого** | Individual | Solo/micro-startup | Startup 5-20 devs | SMB 20-50 devs | Mid-Market+ |
| **Проектов** | 1 | 5 | 20 | Безлимит | Безлимит |
| **Сканирований/мес** | 10 | 100 | 500 | Безлимит | Безлимит |
| **Security Score** | Да | Да | Да | Да | Да |
| **Explainability** | Summary only | Полная | Полная | Полная + AI-assisted | Полная + AI + Custom |
| **История** | 7 дней | 90 дней | 1 год | Безлимит | Безлимит |
| **Team members** | 1 | 1 | 10 | 50 | Безлимит |
| **Roles & Permissions** | — | — | Owner/Admin/Member | + Custom roles | + Custom + SSO |
| **API ключи** | — | 3 | 10 | 50 | Безлимит |
| **CI/CD** | — | Webhook | Webhook + API | Full API + CLI | Full + Custom |
| **PDF-отчёты** | — | Watermarked | Branded | Custom templates | White-label |
| **Email Digest** | — | Weekly | Daily + Weekly | Custom schedule | Custom + Slack/Teams |
| **Audit Log** | — | — | 30 дней | 1 год | Безлимит |
| **SSO/SAML** | — | — | — | Опция | Включено |
| **Support** | Community | Email (72h) | Email (48h) | Email (24h) + Chat | Dedicated + Slack |
| **SLA** | — | — | 99.5% | 99.9% | 99.99% |
| **On-premise** | — | — | — | Опция | Включено |

### 5.3 Обоснование цен (Head of Sales Perspective)

**Free ($0):** Максимальная воронка. 1 проект + 10 сканов/мес + 7 дней истории — достаточно увидеть Score, понять Explainability, почувствовать ценность. Базовый summary (не полная Explainability) — «appetizer». Upgrade trigger: нужен второй проект или больше сканов.

**Pro ($29/мес):** Для individual developer или технического founder. 5 проектов + 100 сканов + полная Explainability + 90 дней истории. Это «разрыв бесплатного»: developer получает реальную ценность, но упирается в лимит 5 проектов или 1 team member. Upgrade trigger: team grows, need collaboration.

**Team ($79/мес):** **Ключевой tier.** Для startup 10 devs: $79/мес vs Snyk $250/мес vs Checkmarx $8K/год. 20 проектов, 500 сканов, 1 год истории, roles, API, CI/CD. Всё, что нужно для систематической работы с security. Upgrade trigger: > 10 members, need SSO, compliance audit, > 20 projects.

**Business ($199/мес):** Для SMB с compliance. 50 members, unlimited scans, AI-assisted explainability, SSO, 24h support, custom PDF, audit log 1 год. Upgrade trigger: on-premise need, > 50 members, white-label.

**Enterprise (Custom):** White-label, dedicated support, custom strategies, on-premise, SLA 99.99%. От $499/мес.

### 5.4 Unit-экономика и прогноз (Investor Perspective)

**Консервативный сценарий:**

| Метрика | M1 | M3 | M6 | M12 |
|---------|----|----|----|-----|
| Registrations (Free) | 50 | 300 | 800 | 3,000 |
| Paying customers | 0 | 12 | 40 | 180 |
| ARPU | — | $45 | $58 | $72 |
| MRR | $0 | $540 | $2,320 | $12,960 |
| ARR | $0 | $6,480 | $27,840 | $155,520 |
| Monthly churn | — | 15% | 10% | 5% |

**Оптимистичный сценарий (2x M3-M12):**

| Метрика | M3 | M6 | M12 |
|---------|----|----|-----|
| Paying customers | 25 | 80 | 360 |
| MRR | $1,200 | $5,000 | $28,000 |
| ARR | $14,400 | $60,000 | $336,000 |

**Investor Note:** При консервативном сценарии $155K ARR к M12 — это **не достаточно для Series A** (обычно требуется $1-2M ARR). Однако это **достаточно для Pre-Seed → Seed transition** при наличии: (a) > 100 paying customers, (b) < 8% churn, (c) NRR > 100%, (d) clear path to $1M ARR. Задача первых 90 дней — не revenue, а **доказать PMF через activation и retention**.

---

## 6. Go-To-Market Strategy (первые 90 дней)

### 6.1 Обзор стратегий (VP Marketing + Head of Sales)

Всё GTM строится на **нулевой monetary budget**. Инвестиция — время founder'а (150-200 часов за 90 дней). Это осознанное решение: на pre-revenue стадии paid acquisition имеет negative ROI (CAC > LTV для первого месяца).

### 6.2 Фаза 1: Private Beta (Дни 1-30)

**Цель:** 50 beta-users, 20+ активных еженедельно, 5+ paying intent signals, 3+ written testimonials.

**Канал 1: Персональная аутрич (Primary — Head of Sales)**

- **Что:** Напрямую обратиться к 200+ CTO/Technical Founder через LinkedIn и Twitter/X
- **Как:** Не mass message. Персонализированное: «Привет [Имя], увидел, что ты работаешь над [их продукт]. Мы построили DAST, который показывает Security Score 0-100 вместо 50-страничных отчётов. Хочешь попробовать на своём продукте? Бесплатно, 5 минут.»
- **Response rate:** 5-10% (industry benchmark для cold outreach)
- **Конверсия в signup:** 30-50% из ответивших
- **Ожидаемый результат:** 30-80 signups
- **Стоимость:** $0, 30-40 часов
- **ROI:** Высокий — каждый beta-user = качественный feedback + потенциальный testimonial

**Канал 2: Hacker News «Show HN» (CTO + CPO)**

- **Что:** Пост «Show HN: Sec Scanner – DAST that explains, not just finds (Security Score 0-100)»
- **Когда:** Вторник или среда, 8-10 AM ET
- **Контент:** Краткое описание + архитектурный hook («Explainability Layer uses pure functions, Strategy Pattern, zero framework deps — see our domain module») + ссылка на demo
- **Ожидание:** 100-300 upvotes, 50-100 signups
- **Риск:** Негатив за «yet another scanner» — митигация: чёткий USP, техническая глубина, честность («we know ZAP exists, here's why we're different»)
- **Стоимость:** $0, 2-3 часа (написание + мониторинг комментариев)

**Канал 3: Reddit (r/netsec, r/webdev, r/devops)**

- **Что:** Storytelling post, не advertisement. «We spent 10 iterations building a Security State Engine with Clean Architecture. Here's what we learned about computing explainable security scores.»
- **Почему storytelling:** Reddit наказывает прямую рекламу. Но technical deep-dive с honest reflection — приветствуется.
- **Ожидание:** 30-60 signups
- **Стоимость:** $0, 3-4 часа

**Канал 4: Dev.to / Medium техническая статья**

- **Что:** «How we built a deterministic Explainability Layer for security scores (no AI, pure functions, Strategy Pattern)»
- **Зачем:** Создаёт credibility, привлекает developer-аудиторию, генерирует backlinks для SEO
- **Ожидание:** 20-40 signups
- **Стоимость:** $0, 4-6 часов (написание качественной статьи)

**Канал 5: LinkedIn (VP Marketing)**

- **Что:** 3 поста/неделю: (1) технический insight, (2) founder journey, (3) security education
- **Формат:** Short posts (200-300 слов) с визуалом (Security Score screenshot, architecture diagram)
- **Ожидание:** 20-40 signups за 30 дней
- **Стоимость:** $0, 5-7 часов

**Канал 6: Twitter/X Threads (CEO)**

- **Что:** 2 threads/неделю: технический + business
- **Формат:** Thread (8-15 tweets), build in public
- **Ожидание:** 15-30 signups
- **Стоимость:** $0, 3-4 часа

### 6.3 Фаза 2: Public Launch (Дни 31-60)

**Цель:** 500 total signups, 30 paying, $1,000 MRR.

**Канал 7: Product Hunt (VP Marketing + Product Designer)**

- **Что:** Полноценный launch с подготовкой
- **Подготовка (Дни 25-30):**
  - Лендинг с Product Hunt badge
  - Catchy visuals (Score Gauge animation)
  - Video demo (60 секунд)
  - Exclusive offer: «Product Hunt launch: 50% off first 3 months (code PH50)»
  - Подготовить 10-15 supporter'ов для первых комментариев/upvotes
- **День launch:** Ответить на КАЖДЫЙ комментарий в течение 5 минут
- **Ожидание:** 100-300 upvotes, 50-150 signups, 10-20 paying
- **Риск:** PH стали менее эффективны (97.4% SaaS launches «мёртвы» через год — Reddit analysis). Но для initial visibility + backlinks всё ещё ценны.
- **Стоимость:** $0, 15-20 часов (включая подготовку)

**Канал 8: GitHub Repository — Open-Core (CTO)**

- **Что:** Опубликовать `@sec-scanner/core` (Security Score Engine) как npm-пакет + GitHub repo
- **Почему:** Open-source core + commercial SaaS — проверенная модель (Semgrep, SonarQube, GitLab). Привлекает community, создаёт trust, генерирует inbound.
- **Содержимое:** Score computation, Explainability functions, Strategy interfaces. Без DAST engine (это commercial).
- **Ожидание:** 100-500 GitHub stars за 3 месяца, 20-50 signups через README
- **Стоимость:** $0, 20-30 часов (извлечение, документация, publish)

**Канал 9: HN Follow-up (CPO)**

- **Что:** «We launched Sec Scanner — here's what 50 beta users taught us»
- **Контент:** Honest post-mortem: что работало, что нет, какие решения приняли
- **Ожидание:** 50-120 signups
- **Стоимость:** $0, 2-3 часа

**Канал 10: SEO Foundation (VP Marketing)**

- **Что:** 5-10 comparison pages + core landing page optimization
- **Keywords:** «DAST tool for startups», «security score calculator», «OWASP scanner with reporting», «cheap DAST alternative», «vulnerability scanner SaaS»
- **Ожидание:** Медленный старт (3-6 мес до значимого трафика), но самый высокий LTV-трафик
- **Стоимость:** $0, 20-30 часов

### 6.4 Фаза 3: Growth (Дни 61-90)

**Цель:** 1,500 signups, 80 paying, $2,500+ MRR.

**Канал 11: Integration Announcements (CTO)**

- **Что:** Если реализованы: GitHub Action, GitLab CI template
- **Почему:** CI/CD интеграции = organic growth через «stars + installs»
- **Ожидание:** 20-40 signups/месяц (long tail)

**Канал 12: Email Digest как Viral Mechanic (CPO + Customer Success)**

- **Что:** Free-пользователи получают: «Your Security Score dropped to 45 (was 58). 3 new findings. Fix these for +15 points.»
- **Почему:** Email с конкретной, персональной информацией = высокий open rate (30-50% для security alerts) + high click-through
- **Ожидание:** 10-20% click-through, 2-5% conversion из click → signup return
- **Стоимость:** $0 (dev cost уже учтён в roadmap)

**Канал 13: YouTube (Product Designer)**

- **Что:** 2 screencast'а: «First scan in 3 minutes», «How to set up continuous DAST for your startup»
- **Почему:** YouTube = 2nd по объёму поисковик. Технические видео имеют long tail (2-3 года).
- **Ожидание:** 500-2000 views за 3 месяца, 10-20 signups
- **Стоимость:** $0, 10-15 часов

**Канал 14: Referral Program (Head of Sales)**

- **Что:** «Invite a team member, both get 1 month free on Pro»
- **Почему:** Simple, driven by genuine value sharing. Low cost, moderate effect.
- **Ожидание:** 5-10% of paying users refer 1+ person
- **Стоимость:** $0 (1 month free = ~$29 cost per referral)

### 6.5 Сводная оценка каналов

| Канал | Стоимость | Сложность | Signups (90d) | Paying (90d) | CAC (time) | ROI |
|-------|-----------|-----------|---------------|--------------|------------|-----|
| Personal outreach | $0 + 40h | Высокая | 100-200 | 10-20 | 2-4h/user | **Высокий** |
| HN (2 posts) | $0 + 5h | Низкая | 100-220 | 5-15 | 0.3-1h/user | **Высокий** |
| Reddit | $0 + 4h | Средняя | 50-80 | 2-5 | 0.8-2h/user | **Средний** |
| Dev.to/Medium | $0 + 6h | Средняя | 40-80 | 1-4 | 1.5-6h/user | Средний |
| Product Hunt | $0 + 20h | Средняя | 50-150 | 10-20 | 1-4h/user | **Высокий** |
| GitHub (open-core) | $0 + 25h | Высокая | 30-80 | 2-8 | 3-12h/user | Средний |
| LinkedIn | $0 + 20h | Низкая | 40-80 | 2-5 | 4-10h/user | Низкий |
| Twitter/X | $0 + 12h | Низкая | 20-50 | 1-3 | 4-12h/user | Низкий |
| SEO | $0 + 25h | Средняя | 10-30 | 1-3 | 8-25h/user | Низкий (long-term) |
| Email Digest (viral) | $0 (dev) | Низкая | 50-150 | 3-10 | 0/user | **Очень высокий** |
| **ИТОГО** | **$0 + ~157h** | — | **490-1120** | **37-95** | **~2h avg** | — |

### 6.6 Контент-план (VP Marketing)

**3 pillar'а контента:**

| Pillar | Цель | Форматы | Частота |
|--------|------|---------|---------|
| **Technical Excellence** | Credibility + developer trust | Dev.to, HN, Reddit r/programming | 1/нед |
| **Security Education** | Attract CTO/Team Lead | Blog, LinkedIn, Twitter | 2/нед |
| **Founder Journey** | Trust + sympathy | Twitter, LinkedIn, HN | 1/нед |

**Контент-календарь на 90 дней:**

| Неделя | Technical | Education | Founder Journey |
|--------|-----------|-----------|-----------------|
| 1-2 | «Clean Architecture for Security Scoring» | «Top 5 DAST findings and why they matter» | «Why we're building a DAST when Snyk exists» |
| 3-4 | «Strategy Pattern in our Explainability Layer» | «Security Score: what CTOs need to know» | «Beta week 1: what 10 users taught us» |
| 5-6 | «Open-sourcing our Security Score Engine» | «How to pass security due diligence» | «The moment a user said 'this is exactly what I needed'» |
| 7-8 | «Building deterministic explanations (no AI)» | «Continuous security: why point-in-time fails» | «Our Product Hunt launch: numbers and lessons» |
| 9-10 | «How we handle false positives in DAST» | «SOC 2 for startups: what auditors actually check» | «First paying customer: how we got there» |
| 11-12 | «API design for a security platform» | «Why your startup needs a Security Score» | «90 days in: metrics, mistakes, and next steps» |

---

## 7. Product Metrics

### 7.1 North Star Metric (CEO + CPO)

**Weekly Active Scanning Projects (WASP)** — количество уникальных проектов, отсканированных ≥ 1 раз за последние 7 дней.

**Почему WASP:**
- **Прямо отражает core value:** непрерывное сканирование = непрерывная безопасность. Это не «зарегистрировался и забыл».
- **Коррелирует с retention:** проекты, сканируемые еженедельно, редко churn'ят (benchmark: weekly active → 80%+ 30-day retention).
- **Опережающий индикатор revenue:** WASP ↑ → paying conversion ↑ → MRR ↑ (с lag 2-4 недели).
- **Actionable:** если WASP падает — улучшаем email reminders, notifications, scan reliability. Чёткий causal chain.
- **Не подвержен gaming:** каждый scan требует реального target, нельзя «накрутить».
- **Легко объяснить команде:** «наша цель — больше проектов, сканируемых каждую неделю».

**Отклонённые альтернативы:**
- *MRR* — lagging indicator, не отражает product engagement. MRR может расти за счёт new sales при падении retention.
- *Security Score Improvement* — зависит от пользовательских действий, не от product quality.
- *DAU/MAU* — слишком широкий. Просмотр dashboard без сканирования = false signal.
- *Number of scans* — можно gaming (повторные без цели), не отражает привычку.

### 7.2 Полный набор метрик

| Метрика | Определение | Кто владеет | M3 цель | M6 цель | M12 цель | Почему важна |
|---------|-------------|-------------|---------|---------|----------|-------------|
| **WASP** (North Star) | Projects scanned ≥1/week | CPO | 50 | 150 | 500 | Core value delivery |
| **Activation Rate** | Users with 2+ scans in first week / signups | Product Designer | 12% | 15% | 18% | Predictor of retention. Benchmark: 3-5% avg, 8-12% good (Recurly). > 98% churn within 2 weeks if not activated (Amplitude). |
| **Time to First Scan** | Registration → scan completion | CTO | < 3 мин | < 2 мин | < 1 мин | Onboarding friction. World-class: < 5 мин (SaaS benchmarks). |
| **Time to First Value** | First scan → Score viewed + explainability read | CPO | < 5 мин | < 4 мин | < 3 мин | Core value delivery speed. World-class: < 24 часов. Наша цель — < 5 минут. |
| **Day 1 Retention** | Users returning within 24h / signups | CS Lead | 35% | 40% | 45% | Immediate engagement signal. SaaS avg: ~39% (Pendo 2025). |
| **Day 7 Retention** | Users returning within 7d / signups | CS Lead | 18% | 22% | 28% | Short-term stickiness. SaaS avg: ~30% after 1 month. |
| **Day 30 Retention** | Active users at day 30 / signups | CS Lead | 10% | 14% | 20% | Product-market fit signal. |
| **Free → Paid Conversion** | New paying / active free users (monthly) | Head of Sales | 4% | 6% | 8% | Revenue driver. Avg: 3-5%, good: 8-12%. |
| **MRR** | Monthly Recurring Revenue | CEO | $500 | $2,320 | $12,960 | Business health. |
| **Monthly Churn** | Paying customers lost / total paying | CS Lead | < 12% | < 8% | < 5% | PMF signal. B2B SaaS avg: 3.5%/month (Recurly 2025). Top: < 2%. |
| **NRR** | (expansion - contraction - churn) / start MRR | Head of Sales | N/A | > 90% | > 100% | Product value over time. > 100% = customers expand faster than churn. |
| **NPS** | % promoters - % detractors (quarterly) | CS Lead | — | > 20 | > 30 | Customer satisfaction. Good SaaS: 20-50. |
| **Scan Success Rate** | Completed without error / total scans | CTO | > 85% | > 90% | > 95% | Product reliability. |
| **Avg Score Improvement** | Mean Score delta over 30d for active users | CPO | +3 | +5 | +7 | Demonstrable user value. If Score doesn't improve — product has no value. |
| **Weekly Active Teams** | Teams with ≥1 active member/week | CS Lead | 5 | 20 | 80 | Team feature adoption. |

### 7.3 Как измерять (CTO Perspective)

**Инструменты:**
- **Core metrics** (WASP, scans, users, retention): встроенный analytics в приложение (PostHog free tier или self-built с Prisma queries)
- **Business metrics** (MRR, churn, NRR): Stripe Dashboard + custom spreadsheet
- **Qualitative** (NPS, feedback): quarterly in-app survey (1 question: «How likely are you to recommend Sec Scanner? 0-10») + exit survey для churned users
- **Competitive intelligence**: Google Alerts для конкурентов, мониторинг HN/Reddit упоминаний

**Частота обзора:**
- Daily: WASP, scan success rate, errors
- Weekly: activation, retention (D1/D7), conversion, signups
- Monthly: MRR, churn, NRR, NPS, ARPU

---

## 8. Private Beta Plan

### 8.1 Цели беты (CEO + CPO)

**Primary Goal:** Валидировать гипотезу Product-Market Fit.

**Конкретные критерии успеха:**
- [ ] 50 beta-users зарегистрировались
- [ ] 20+ активны еженедельно (WASP > 20)
- [ ] Activation rate > 12% (6+ users с 2+ сканами в первую неделю)
- [ ] 5+ пользователей выразили paying intent («how much does it cost?» или «when can I pay?»)
- [ ] 3+ письменных testimonials (цитаты, которые можно использовать на сайте)
- [ ] Хоть 1 пользователь сканировал повторно через 7+ дней без напоминания
- [ ] Хоть 1 пользователь пригласил team member
- [ ] Среднее время на странице Explainability widgets > 30 секунд

**Secondary Goal:** Собрать достаточно feedback для приоритизации Roadmap.

**Anti-goal:** НЕ оптимизировать для signups. 50 целевых пользователей > 500 случайных.

### 8.2 Критерии отбора участников (Head of Sales + CS Lead)

**Кого ищем (qualify IN):**
1. CTO, Technical Founder, VP Engineering, или Lead Developer
2. Работает в компании 5-50 человек
3. Имеет хотя бы один production веб-сайт/API (не localhost)
4. Ранее использовал какой-либо security-инструмент (ZAP, Snyk, SonarQube, GHAS — даже базово)
5. Говорит по-английски или по-русски (для интервью)
6. Готов потратить 20-30 минут на интервью

**Кого НЕ ищем (qualify OUT):**
1. Enterprise security teams (их потребности другие)
2. Студенты / «just curious» (нет реального pain)
3. Консультанты / интеграторы (ищут инструмент для клиентов — другой use case)
4. Те, кто не имеет production target для сканирования

**Источники рекрутирования:**
- LinkedIn search: «CTO» + «startup» + «5-50 employees» — 200+ профилей
- Twitter/X: технические founders, которые жалуются на security tools
- Hacker News: комментаторы в security-тредах
- Личные контакты founder'а
- Dev.to/Medium: авторы статей о security

### 8.3 Сценарии использования (Customer Success Lead)

Каждому beta-участнику предлагается выбрать 1-2 сценария:

**Сценарий A: «Security Audit»** (самый вероятный)
- Цель: понять текущее состояние безопасности своего продукта
- Шаги: зарегистрироваться → добавить target → запустить scan → посмотреть Score → прочитать Explainability
- Ожидаемый outcome: «Теперь я знаю свой Score и что исправлять»
- Success: пользователь нажал «Fix these 3 for max impact» или экспортировал результаты

**Сценарий B: «Continuous Monitoring»**
- Цель: настроить регулярное сканирование
- Шаги: scan → настроить recurring (если реализован) или запустить вручную через 3-7 дней
- Ожидаемый outcome: «Я вижу тренд и знаю, улучшается ли моя безопасность»
- Success: пользователь вернулся и отсканировал повторно

**Сценарий C: «Team Collaboration»**
- Цель: поделиться результатами с командой
- Шаги: scan → пригласить team member → распределить findings
- Ожидаемый outcome: «Моя команда видит наш Score и знает, кто что чинит»
- Success: приглашённый member зарегистрировался и просмотрел dashboard

### 8.4 Вопросы для интервью (CPO + CS Lead)

**Структура интервью (20-30 минут):**

**Part 1: Context (5 мин)**
1. Расскажите о вашей роли и компании.
2. Как вы сейчас справляетесь с безопасностью ваших веб-приложений?
3. Использовали ли вы когда-нибудь DAST/SAST инструменты? Какие?
4. Какая у вас главная frustration с текущим подходом?

**Part 2: Reaction to Product (10 мин)**
5. [Показать dashboard с результатами сканирования их сайта] Что вы видите? Что привлекает внимание?
6. Что вы думаете о Security Score? Понятна ли эта метрика?
7. Полезна ли Explainability? Что бы вы изменили?
8. Как бы вы использовали это в своей работе? Кто ещё в команде увидел бы это?

**Part 3: Pricing & Purchase (5 мин)**
9. Если бы этот продукт стоил $29/мес — заплатили бы? Если нет — почему?
10. А за $79/мес для команды из 10 человек?
11. Что должно быть добавлено/изменено, чтобы вы точно заплатили?

**Part 4: Open-ended (5 мин)**
12. Что бы вы порекомендовали изменить в первую очередь?
13. Хотели бы вы участвовать в follow-up интервью через 2 недели?

### 8.5 Механизм сбора обратной связи (Product Designer + CS Lead)

**Количественный (автоматический):**
- In-app analytics: какие страницы посещены, сколько времени, какие CTA нажаты
- Scan metrics: success rate, time to complete, errors
- Feature usage: какие explainability widgets открыты, сколько времени на каждом
- Return rate: сколько пользователей вернулись через 1/3/7/14 дней

**Качественный (ручной):**
- Post-scan micro-survey (1 вопрос, in-app): «Was this scan result useful? (1-5)»
- Weekly email (для активных): «What's one thing we should improve?» (reply-to)
- 1:1 интервью (20-30 мин) — минимум 15 интервью за 30 дней
- Exit survey (для тех, кто не вернулся через 7 дней): «Why didn't you come back?» (multiple choice + free text)

**Инструменты:**
- Analytics: PostHog (free tier — 1M events/мес) или self-built
- Survey: in-app modal (React component) + email
- Interview: Zoom/Google Meet, запись (с разрешения), транскрипция

### 8.6 Критерии принятия решений (CEO)

**Go (зелёный свет → Public Launch):**
- Activation > 12%
- 3+ paying intent signals
- 2+ testimonials (можно использовать публично)
- NPS > 0 (больше промоутеров, чем детракторов)
- Avg Score Improvement > 0 для активных пользователей (продукт создаёт ценность)

**Pivot (жёлтый свет → изменить позиционирование):**
- Activation 5-12% И нет paying intent
- Пользователи используют, но не видят ценности в Explainability
- Решение: перепозиционировать — не «DAST», а «Security Posture Dashboard» (агрегатор для данных из ZAP/Nessus/Burp)

**Stop (красный свет → серьезный пересмотр):**
- Activation < 5%
- Ни одного повторного сканирования
- Преобладающий feedback: «ZAP достаточно» / «не понимаю, зачем это нужно»
- Решение: глубинные customer discovery интервью (10+) перед любыми кодовыми изменениями

### 8.7 График беты

| День | Действие | Ответственный |
|------|----------|---------------|
| 1-3 | Финализация landing page + signup flow | CTO + Designer |
| 3-5 | Подготовка demo target + скриптов | CTO |
| 5-7 | Начало аутрич (первые 50 сообщений) | Head of Sales |
| 7-14 | Первые 15-20 beta-users, первые интервью | CS Lead + CPO |
| 14 | Промежуточный анализ: что работает, что нет | Все роли |
| 14-21 | Корректировка onboarding по feedback | Designer + CTO |
| 21-28 | Вторая волна аутрич (50-100 сообщений) | Head of Sales |
| 28-30 | Итоговый анализ: Go / Pivot / Stop | CEO |
| 30 | Решение о Public Launch | CEO |

---

## 9. Roadmap

### 9.1 Методология оценки (CEO + CPO)

Каждая инициатива оценивается по:
- **BV (Business Value)** 1-10 — влияние на revenue, retention, acquisition
- **EC (Engineering Cost)** 1-10 — относительная стоимость (10 = самый дорогой)
- **ROI** = BV / EC
- **PMF Impact** — влияние на вероятность Product-Market Fit: Critical / High / Medium / Low
- **Owner** — какая «роль» отвечает

### 9.2 Roadmap: 90 дней (Foundation + Launch)

| # | Инициатива | P | BV | EC | ROI | PMF | Owner |
|---|-----------|---|----|----|-----|-----|-------|
| 1 | **Landing Page + Signup** | P0 | 10 | 3 | 3.3 | **Critical** | Designer + CTO |
| 2 | **Demo Target (vulnerable app)** | P0 | 9 | 2 | 4.5 | **Critical** | CTO |
| 3 | **GitHub OAuth** | P0 | 8 | 2 | 4.0 | **Critical** | CTO |
| 4 | **First Scan Optimisation (< 60s)** | P0 | 9 | 4 | 2.3 | **High** | CTO |
| 5 | **Post-Scan Onboarding (3 CTAs)** | P0 | 9 | 3 | 3.0 | **High** | Designer + CPO |
| 6 | **Stripe Billing Integration** | P0 | 10 | 5 | 2.0 | **Critical** | CTO |
| 7 | **Email Notifications + Weekly Digest** | P0 | 8 | 4 | 2.0 | **High** | CTO + CS |
| 8 | **Transparent Accuracy Benchmark** | P1 | 7 | 3 | 2.3 | **High** | CTO |
| 9 | **SEO Foundation** | P1 | 5 | 2 | 2.5 | Medium | VP Marketing |
| 10 | **Remediation Advice Enrichment** | P1 | 7 | 4 | 1.8 | **High** | CPO |
| 11 | **Referral Program** | P2 | 5 | 3 | 1.7 | Medium | Head of Sales |
| 12 | **Diff View (scan comparison)** | P2 | 5 | 3 | 1.7 | Medium | CPO |

**Итого:** ~40-50 engineering days. Фокус — **выход на рынок**.

### 9.3 Roadmap: 6 месяцев (Validation + Growth)

| # | Инициатива | P | BV | EC | ROI | PMF | Owner |
|---|-----------|---|----|----|-----|-----|-------|
| 13 | **GitHub Action for CI/CD** | P1 | 7 | 5 | 1.4 | **High** | CTO |
| 14 | **Open-Core: Score Engine npm package** | P1 | 8 | 5 | 1.6 | **High** | CTO |
| 15 | **Public API v1** | P1 | 8 | 6 | 1.3 | **High** | CTO |
| 16 | **Telegram Bot (alerts)** | P2 | 6 | 6 | 1.0 | Medium | CTO |
| 17 | **Webhook Integration (Slack, Jira)** | P2 | 6 | 4 | 1.5 | Medium | CTO |
| 18 | **AI-Assisted Explainability** | P2 | 7 | 6 | 1.2 | **High** | CPO |
| 19 | **Custom Scan Policies** | P2 | 5 | 5 | 1.0 | Medium | CPO |
| 20 | **SSO/SAML** | P2 | 6 | 7 | 0.9 | Medium | CTO |

### 9.4 Roadmap: 12 месяцев (Scale + Enterprise Readiness)

| # | Инициатива | P | BV | EC | ROI | PMF | Owner |
|---|-----------|---|----|----|-----|-----|-------|
| 21 | **PostgreSQL Migration** | P1 | 7 | 8 | 0.9 | **High** | CTO |
| 22 | **API Scanning (REST/GraphQL)** | P1 | 9 | 8 | 1.1 | **High** | CTO |
| 23 | **Scheduled Scans** | P1 | 7 | 4 | 1.8 | Medium | CTO |
| 24 | **SOC 2 Type I Preparation** | P2 | 8 | 8 | 1.0 | **High** | CEO + CTO |
| 25 | **On-Premise Option** | P2 | 6 | 9 | 0.7 | Medium | CTO |
| 26 | **Marketplace Integrations** | P2 | 7 | 6 | 1.2 | Medium | CTO |
| 27 | **Mobile App (read-only)** | P3 | 4 | 9 | 0.4 | Low | Designer |
| 28 | **White-Label Reports** | P2 | 5 | 5 | 1.0 | Low | CPO |
| 29 | **Partner/Reseller Program** | P3 | 5 | 4 | 1.3 | Medium | Head of Sales |
| 30 | **Series A Preparation** | P1 | 9 | 3 | 3.0 | **Critical** | CEO |

### 9.5 Приоритеты по PMF Impact

```
Critical (делаем сейчас — без этого нет продукта):
├── #1 Landing Page + Signup
├── #2 Demo Target
├── #3 GitHub OAuth
├── #6 Stripe Billing
└── #30 Series A Preparation

High (делаем после Critical — это создаёт конкурентное преимущество):
├── #4 First Scan Optimisation
├── #5 Post-Scan Onboarding
├── #7 Email Notifications + Digest
├── #8 Accuracy Benchmark
├── #10 Remediation Advice
├── #13 GitHub Action
├── #14 Open-Core Package
├── #15 Public API v1
├── #18 AI-Assisted Explainability
├── #21 PostgreSQL Migration
├── #22 API Scanning
└── #24 SOC 2 Preparation

Medium (когда есть ресурсы):
├── #9 SEO
├── #11 Referral Program
├── #12 Diff View
├── #16 Telegram Bot
├── #17 Webhook Integration
├── #19 Custom Scan Policies
├── #20 SSO/SAML
├── #23 Scheduled Scans
└── #26 Marketplace Integrations

Low (отложить на 12+ месяцев):
├── #27 Mobile App
└── #28 White-Label Reports
```

---

## 10. Независимое ревью

### 10.1 CTO Review: Технические риски

**Оценка технической готовности: 7.5/10.**

**Сильные стороны:**
- Clean Architecture + DDD + Ports & Adapters — доменный слой изолирован от инфраструктуры. Любой новый клиент (API, Telegram, CLI) подключается через Platform Layer.
- Security State Engine — чистые функции, Strategy Pattern, нулевая связка с фреймворками. Это не cloneable за 2 спринта — это moat.
- Explainability Layer — 8源文件, детерминированный, расширяемый. Конкурентное преимущество, которое сложно воспроизвести.

**Технические риски:**

1. **SQLite concurrency (Medium severity).** SQLite не поддерживает множественные одновременные записи. При > 50 concurrent scans будут блокировки. **Митигация:** WAL mode + connection pooling на ближайшие 3-6 месяцев. PostgreSQL migration запланирована на M6-12 (Roadmap #21).

2. **DAST engine accuracy (High severity).** Текущий DAST engine (src/lib/dast.ts) — насколько он точен по сравнению с ZAP? Какой false positive rate? Это блокер для trust. **Митигация:** Benchmark против OWASP WebGoat/Juice Shop до beta launch. Публиковать результаты прозрачно. Roadmap #8.

3. **Single point of failure (Medium severity).** VPS deployment на `<your-vps-ip>` — нет redundancy. Если сервер упадёт — всё упадёт. **Митигация:** Acceptable для beta. Для public launch — минимум: automated backup, health check, restart policy. Для M6: migrate to managed hosting (Railway/Fly.io/Render).

4. **No automated testing for production (High severity).** Если нет E2E tests — каждый deploy может сломать critical path. **Митигация:** Минимум 5 critical path E2E tests перед public launch (signup → scan → score → explainability).

5. **SSE in-memory state (Low severity for beta).** Текущий SSE для real-time notifications — in-memory. При restart события теряются. **Митигация:** Acceptable для beta. Для M6: Redis pub/sub или database-backed queue.

**Вердикт CTO:** Технически готовы для beta. Не готовы для production-grade public launch без: (a) accuracy benchmark, (b) E2E tests, (c) basic monitoring. Все три — реализуемы за 2 недели.

### 10.2 CEO Review: Стратегические риски

**Оценка стратегии: 6.5/10 (до митигации).**

**Критические вопросы:**

1. **Timing risk.** Мы идём на рынок с DAST-инструментом в момент, когда рынок движётся к ASPM/CNAPP convergence. Если trend продолжится, standalone DAST станет niche. **Митигация:** Позиционировать не как «DAST», а как «Security Posture for web apps». Roadmap → API Scanning, scheduled scans, aggregation — путь к lightweight ASPM.

2. **Funding risk.** Bootstrapped с нулевым бюджетом на маркетинг означает, что весь рост — organic. Это медленно. Если competitor с $5M seed выйдет на рынок через 6 месяцев, мы можем не успеть. **Митигация:** Open-core стратегия создаёт community moat. Private beta → paying customers → angel/seed funding based on traction.

3. **Segment risk.** Startup/SMB — красивый сегмент на бумаге, но: (a) у стартапов мало денег, (b) у них высокий churn (compromise, pivot, shutdown), (c) они быстро вырастают из инструментов. **Митигация:** Flat pricing снижает churn trigger. Team features увеличивают switching cost. Business tier (SSO, compliance) — path к retention при росте клиента.

4. **Founder dependency risk.** Один человек = bottleneck. Marketing + sales + support + development. **Митигация:** Автоматизация (self-service onboarding, FAQ, in-app help). Email digest как automated retention. На M6: рассмотреть первый hire (support/community).

**Вердикт CEO:** Стратегия sound, но execution risk высок. Ключевой фактор — скорость. Каждая неделя задержки — это окно для конкурента. Decision: не пытаться сделать всё идеально. Запустить MVP, получить feedback, итерировать.

### 10.3 VP of Sales Review: Вероятность продажи

**Оценка: 5.5/10 для холодной продажи, 7.5/10 для тёплой.**

**Почему холодная продажа сложна:**
- Нет brand recognition. «Sec Scanner» — никто не знает.
- Нет social proof. Нет logos, testimonials, case studies.
- Security-инструмент — high-involvement purchase. Даже при $29/мес, CTO хочет доверять поставщику.
- Нет sales team. Один founder = нет capacity для enterprise sales cycle.

**Почему тёплая продажа реалистична:**
- Если CTO нашёл нас через HN/Reddit/Dev.to — он уже имеет positive intent.
- Техническая статья создаёт credibility. CTO думает: «эти ребята понимают, что делают».
- Free tier позволяет «попробовать без риска» — снижает objection.
- $29/мес — impulse purchase threshold для startup CTO.

**Рекомендации VP Sales:**

1. **Не продавать. Помогать покупать.** Вся коммуникация — education, не pitch. «Вот как мы вычисляем Score» > «купите наш инструмент».

2. **Создать «Objection Handling Guide».** Топ-5 objections и ответы:
   - «ZAP достаточно» → «ZAP находит. Мы объясняем, что с этим делать и показываем, становится ли лучше.»
   - «Мы маленькие для security tools» → «Именно поэтому вам нужен простой Score, а не enterprise-платформа.»
   - «Кто вы?» → «Open-source Security Score Engine, 10+ итераций архитектуры, 50 beta-пользователей.»
   - «Snyk уже есть» → «Snyk отлично находит в коде. Мы тестируем runtime — то, что Snyk не видит. Plus: бизнес-интерпретация.»
   - «Дорого» → «$79/мес за команду 10 человек = $7.9/чел/мес. Это 2 чашки кофе.»

3. **Pricing page без «Contact Sales».** Всё self-service. Для startup CTO «Contact Sales» = «будет длинный процесс, я не хочу». Кнопка «Start Free» > «Talk to Sales».

**Вердикт VP Sales:** Продажа возможна, но не через традиционный sales process. Через content → trust → free trial → self-service upgrade. Это product-led growth, не sales-led.

### 10.4 Product Designer Review: Пользовательский опыт

**Оценка текущего UX: 6/10 для beta, 4/10 для public launch.**

**Сильные стороны:**
- ScoreGauge — визуально привлекательный, сразу понятный
- Explainability widgets — уникальная функциональность, хорошо визуализирована
- 6-tab dashboard — feature-complete для power users

**Критические проблемы:**

1. **First-time user overload.** 6 вкладок (Security, Scan, History, Teams, API Keys, Billing) — слишком много для первого визита. Новый пользователь не должен видеть «Teams» или «Billing» до момента, когда они ему нужны. **Решение:** Progressive disclosure. Первый визит — один экран: Target URL → Scan → Score → Explainability → «What's next? (3 options)». Всё остальное — в sidebar, доступно при необходимости.

2. **No empty states for value demonstration.** Если пользователь зарегистрировался, но ещё не сканировал — что он видит? Если Score = 100 (perfect) — что показываем? **Решение:** Pre-populated demo scan result на первом визите. Empty states с call-to-action. Perfect state с celebratory message + «set up monitoring».

3. **Explainability may be too technical.** Если Explainability widgets используют термины «CVSS», «CWE-89», «Risk Score» — CTO без security background не поймёт. **Решение:** Two-layer explanation: (1) «Plain English summary» для CTO, (2) «Technical details» для developer. Toggle между слоями.

4. **Mobile experience.** Dashboard с 6 вкладками не работает на мобильном. CTO может хотеть проверить Score с телефона. **Решение:** Для M3: responsive layout (collapsible sidebar). Для M12: read-only mobile view. Полноценное mobile app — P3 (ROI too low).

5. **No guidance after first scan.** Пользователь видит Score + Explainability. И что дальше? Нет clear next step. **Решение:** Post-scan CTA panel: (1) «Fix top 3 vulnerabilities (+X points)», (2) «Set up weekly scan», (3) «Invite your team». Это Roadmap #5.

**Вердикт Product Designer:** Для beta — достаточно. Для public launch — нужно: (a) progressive disclosure (first-time UX), (b) two-layer explainability, (c) clear post-scan CTAs. Все три — реализуемы за 1-2 недели.

### 10.5 Investor Review: Инвестировать ли?

**Ответ: Предварительно да (Pre-Seed). Нет (Seed) без traction.**

**В какой бы инвестировал:**

| Стадия | Условия | Вероятность |
|--------|---------|-------------|
| **Pre-Seed ($100-300K)** | 50+ beta users, 15% activation, 3+ testimonials, clear path to $5K MRR | **Да, при выполнении** |
| **Seed ($1-3M)** | $10K+ MRR, 200+ paying, < 8% churn, NRR > 100% | **Нет, пока нет traction** |
| **Series A ($5-15M)** | $1-2M ARR, 1000+ customers, clear path to $10M ARR | **Нет, слишком рано** |

**5 вопросов, которые я бы задал основателям:**

1. **«Как вы будете конкурировать, если Snyk добавит Security Score за 6 месяцев?»**
   Ответ: «Snyk's DNA — developer workflow, не business interpretation. Их scoring (если появится) будет CVSS-based. Наш — composite metric с Explainability, трендами и ROI-приоритизацией. Это 8+ месяцев разработки. Кроме того, наш Explainability Layer — чистый доменный модуль с Strategy Pattern. Его нельзя скопировать, не переписав архитектуру с нуля.»

2. **«Почему DAST, а не SAST? SAST-рынок больше, и вы уже имеете архитектуру для этого.»**
   Ответ: «Три причины. (a) SAST — red ocean (Snyk, Semgrep, SonarQube, Checkmarx). DAST для startup/SMB — blue ocean. (b) DAST-results (runtime data) идеально подходят для Security Score — это реальный, не гипотетический risk. (c) SAST требует language-specific analysis. DAST работает через HTTP — language-agnostic. Один движок покрывает все веб-технологии.»

3. **«Каков path к $1M ARR и за какой срок?»**
   Ответ: «Консервативный: M12 $155K ARR, M24 $500K-800K ARR, M30-36 $1M ARR. При текущих unit economics (ARPU $72, churn 5%, improving). Драйверы роста: (a) expansion revenue (Free → Pro → Team → Business), (b) geographic expansion, (c) API Scanning как second product line, (d) potential channel partnerships (DefectDojo, GitLab marketplace). Main risk — churn. If churn > 8% at scale, path elongates significantly.»

4. **«Что происходит, если не достигнете PMF за 6 месяцев?»**
   Ответ: «Pivot на позиционирование: не standalone DAST, а «Security Posture Dashboard» — агрегатор для данных из ZAP, Nessus, Burp, Snyk. Архитектура (Platform Layer + Ports & Adapters) поддерживает это — достаточно написать адаптеры для внешних сканеров. Это расширяет TAM и снижает dependency от качества собственного DAST engine.»

5. **«Who is on the team, and what are the gaps?»**
   Ответ: «Текущий team: strong technical founder (архитектура — 8-9/10 по TASK-010 оценке). Gaps: (a) no dedicated go-to-market person — founder does marketing/sales/content, (b) no designer — UI/UX functional but not polished, (c) no customer success — support via email. Priority hire after $5K MRR: customer success / community manager (Part #1).»

**Критические риски (инвестор):**

1. **No PMF validation.** 90% стартапов умирают от отсутствия спроса, не от технических проблем. **Требование:** 5 paying customers до конца M3. Без этого — нет traction для любого раунда.

2. **AI-native competitor.** Если startup с $5M seed и «AI Security Score» выйдет на рынок — трудно конкурировать на marketing. **Митигация:** speed-to-market < 60 дней. Open-core для community moat. Deterministic explainability как differentiation от AI.

3. **DAST accuracy.** Если сканер пропускает критические уязвимости — reputation damage необратим. **Требование:** transparent benchmark до public launch.

**Вердикт Investor:** Проект технологически впечатляющий. Архитектура — на уровне funded Series A startup. Но без paying customers — это engineering project, не business. First priority: валидировать demand. Second priority: speed. Everything else is secondary.

---

## 11. Единые рекомендации

### 11.1 Синтез всех ролей

После независимого анализа из 8 ролей, сформированы следующие согласованные рекомендации:

### 11.2 Топ-10 рекомендаций (приоритизировано)

**1. Запустить Landing Page немедленно (CEO + VP Marketing + Designer).**
Это блокирует ВСЁ остальное. Без signup flow — нет beta, нет feedback, нет PMF validation. Минимум: Hero + How It Works + Pricing + Footer. Технология: Next.js (уже есть), deploy на Vercel. **Срок: 3-5 дней.**

**2. Создать Demo Target (CTO).**
Развернуть OWASP WebGoat на demo.secscanner.io. Каждый новый пользователь может попробовать сканирование — zero commitment, zero risk. **Срок: 1-2 дня.**

**3. Реализовать GitHub OAuth (CTO).**
Однокликная регистрация для developer-аудитории. Без этого каждый signup — friction. **Срок: 1-2 дня.**

**4. Провести Accuracy Benchmark (CTO).**
Запустить Sec Scanner + OWASP ZAP на OWASP WebGoat/Juice Shop. Сравнить findings. Публиковать результаты прозрачно (даже если мы хуже по detection rate). Честность = trust. **Срок: 2-3 дня.**

**5. Запустить Private Beta (CEO + CS Lead + Head of Sales).**
50 target users через личную аутрич. 15+ интервью. Collect testimonials. **Срок: Дни 7-30.**

**6. Упростить First-Time UX (Product Designer).**
Один экран для первого визита: Target → Scan → Score → 3 CTAs. Progressive disclosure для остальных features. **Срок: 3-5 дней.**

**7. Интегрировать Stripe Billing (CTO).**
Без этого нет revenue. Free + 3 paid tiers. «Start Free» → upgrade trigger. **Срок: 3-5 дней.**

**8. Создать Two-Layer Explainability (CPO + Designer).**
«Plain English» слой для CTO + «Technical Details» для developer. Toggle между слоями. **Срок: 2-3 дня.**

**9. Опубликовать Open-Core Package (CTO).**
npm: @sec-scanner/core + GitHub repo. Security Score Engine + Explainability functions. Без DAST engine. **Срок: M2 (Дни 31-60).**

**10. Запустить Email Digest (CTO + CS Lead).**
Критично для retention. «Your Score changed. Here's why.» Weekly для Free, daily+weekly для Team+. **Срок: M2.**

### 11.3 Чего НЕ делать (CEO + Investor)

1. **Не строить SAST/SCA.** Это red ocean. Наше позиционирование — DAST + Explainability. Фокус.
2. **Не делать Mobile App.** ROI 1.8/10 (TASK-009). Отложить на 12+ месяцев.
3. **Не добавлять AI-generated explanations.** Детерминированный Explainability — наше moat. AI можно добавить как optional enhancement, не замену.
4. **Не делать On-Premise сейчас.** Нет demand, нет ресурсов. Enterprise — не целевой сегмент.
5. **Не нанимать до $5K MRR.** Каждый $ — на продукт и GTM. Hire #1: customer success / community.
6. **Не тратить на paid ads до $5K MRR.** Organic content > paid acquisition на текущем этапе.
7. **Не делать multi-language UI.** Английский достаточно. Русский — если будет demand (аналитики покажут).

### 11.4 Decision Framework

Для каждого решения в ближайшие 90 дней, задавать один вопрос:

> **«Помогает ли это получить 50 beta-users с > 12% activation за 30 дней?»**

Если да — делать. Если нет — отложить.

---

## Приложения

### A. Источники данных

- MarketsandMarkets: Application Security Testing Market 2025-2031 ($1.83B → $7.60B, CAGR 26.7%)
- Mordor Intelligence / Research and Markets: DAST Market ($3.61B → $8.52B by 2030)
- Grand View Research: Security Testing Market ($10.96B → $40.99B by 2031, CAGR 24.6%)
- Verizon DBIR 2025: 42% exploited vulnerabilities target web apps
- ISC2 2025: 3.5M cybersecurity workforce gap
- SACR AI-SOC 2025: 960 alerts/day average organization
- Gartner Magic Quadrant: AST 2025; CNAPP Market Guide 2025
- Palo Alto Networks: State of ASPM 2026 (67% seeking unified platforms)
- CloudAware: DevSecOps Statistics 2026 (48% cloud-native driven)
- Amplitude 2025: >98% churn within 2 weeks if not activated
- Pendo 2025: 39% 30-day retention average for SaaS
- Recurly 2025: 3.5% avg monthly B2B SaaS churn, top performers < 2%
- Vendr: Competitor pricing data (Snyk, Semgrep, SonarQube, Wiz, SonarSource)
- Reddit r/devops, r/netsec, r/SaaS: Community sentiment and pricing discussions

### B. Глоссарий

| Термин | Определение |
|--------|------------|
| DAST | Dynamic Application Security Testing — тестирование безопасности работающего приложения |
| SAST | Static Application Security Testing — анализ исходного кода на уязвимости |
| SCA | Software Composition Analysis — анализ зависимостей на наличие известных уязвимостей |
| ASPM | Application Security Posture Management — агрегация и управление результатами AppSec |
| CNAPP | Cloud-Native Application Protection Platform — унифицированная cloud security платформа |
| CVSS | Common Vulnerability Scoring System — стандарт оценки тяжести уязвимостей (0-10) |
| PMF | Product-Market Fit — соответствие продукта потребностям рынка |
| NRR | Net Revenue Retention — показатель удержания выручки с учётом expansion и contraction |
| WASP | Weekly Active Scanning Projects — North Star метрика Sec Scanner |
| ARPU | Average Revenue Per User — средняя выручка на платящего пользователя в месяц |
| LTV | Lifetime Value — ожидаемая суммарная выручка от одного клиента за всё время |
| CAC | Customer Acquisition Cost — стоимость привлечения одного платящего клиента |
| MRR | Monthly Recurring Revenue — ежемесячная регулярная выручка |
| NPS | Net Promoter Score — индекс лояльности клиентов (% promoters - % detractors) |
