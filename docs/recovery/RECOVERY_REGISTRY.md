# RECOVERY_REGISTRY.md

> PX-005 BLOCK 2. Реестр восстановления PX-001..PX-004.
> Каждый модуль имеет статус: Recovered / Missing / Partial.

---

## PX-001: Product Experience Audit + Home Redesign

**Status: ✅ Recovered**

**Evidence:**
- Commit: `55f4163` (PX-001: Product Experience Audit + Home Redesign)
- Files:
  - `docs/PRODUCT_EXPERIENCE_AUDIT.md`
  - `landing/src/app/(app)/app/home/page.tsx` (V2 — First 30s + First Value)
  - `landing/src/lib/i18n.ts` (+30 home.firstValue.* + home.result.* keys)
- Production: https://sec-scanner.pro/app/home → HTTP 200, 58300 bytes
- Screenshot: `32-user-home.png`

**What was recovered:**
- Product Experience Audit (9 вопросов для каждого экрана)
- Home V2 с domain input прямо на главной
- AI First Value flow (input → AI check → result за 2 минуты)
- Executive Summary First (Что произошло / Чем опасно / Что делать / Время)
- Commercial UX (upgrade CTA after value)
- Trust indicators (encrypted, AI powered, fast)

---

## PX-002: (merged into PX-001)

**Status: N/A**

PX-002 не существовала как отдельная задача. Контент был включён в PX-001.

---

## PX-003: (merged into PX-004)

**Status: N/A**

PX-003 не существовала как отдельная задача. Контент был включён в PX-004.

---

## PX-004: Human First Security Center

**Status: ✅ Recovered**

**Evidence:**
- Commit: `5670c6a` (PX-004: Human First Security Center)
- Files:
  - `landing/src/lib/findings-translator.ts` (10 категорий бизнес-перевода)
  - `landing/src/app/(app)/app/security-review/page.tsx` (Human First UI)
  - `landing/src/lib/i18n.ts` (+24 securityReview.* keys)
  - `docs/DEVELOPMENT_RULES.md` (+Rule 29 Human-First Security)
  - `landing/src/data/feature-registry.json` (+PLAT-029)
  - `landing/src/data/feature-evidence.json` (+PLAT-029)
- Production: https://sec-scanner.pro/app/security-review → HTTP 200, 71044 bytes
- Screenshot: `36-security-review.png`

**What was recovered:**
- AI Executive Summary (generateExecutiveSummary — 2-3 предложения)
- Top Actions (getTopActions — сортировка по бизнес-эффекту)
- Business Findings (10 категорий с бизнес-переводом)
- Technical Details (collapsible блок с CVE/CVSS)
- Copy Developer Task (clipboard — готовое описание для Jira/GitHub/Linear)
- Explain Simpler (toggle между business и simple explanation)
- Commercial CTA (Get fix plan → pricing)
- Rule 29 (Human-First Security) + Value-First Development

---

## Hero V2

**Status: ✅ Recovered (V3 improvement в BLOCK 3)**

**Evidence:**
- Commit: `55f4163`
- Production: https://sec-scanner.pro/app/home → HTTP 200, 58300 bytes

---

## Scanner

**Status: ⚠️ Exists, needs Recovery (BLOCK 5)**

**Evidence:**
- Commit: exists in repo since INT-020
- Production: https://sec-scanner.pro/app/scanner → HTTP 200, 58486 bytes
- Issue: сложный flow (Project → Source → Tools → Run), нужно упростить до (URL → AI → Report)

---

## Pricing

**Status: ⚠️ Exists, needs consolidation (BLOCK 7)**

**Evidence:**
- Commit: exists in repo
- Production: https://sec-scanner.pro/app/pricing → HTTP 200
- Issue: цены определены в нескольких местах, нет единого pricing.ts

---

## Security Center (advanced features)

**Status: ❌ Not implemented (BLOCK 6 — optional)**

**Evidence:**
- /app/security-review существует (базовый Human-First)
- Advanced features (Open/Explore/Fullscreen/Export/TOC/Reading Mode/Dev View/Business View) не реализованы

---

## Сводка

| Module | Status | Commit | Production |
|--------|--------|--------|------------|
| PX-001 (Home + Hero V2) | ✅ Recovered | `55f4163` | HTTP 200 |
| PX-002 | N/A (merged) | — | — |
| PX-003 | N/A (merged) | — | — |
| PX-004 (Security Review) | ✅ Recovered | `5670c6a` | HTTP 200 |
| Hero V3 | 🔄 In Progress (BLOCK 3) | — | — |
| Scanner Recovery | 🔄 In Progress (BLOCK 5) | — | — |
| Pricing Recovery | 🔄 In Progress (BLOCK 7) | — | — |
| Security Center Advanced | ❌ Not started (BLOCK 6) | — | — |
