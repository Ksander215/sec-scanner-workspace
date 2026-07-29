# KNOWN_REGRESSIONS.md — Журнал регрессий и инцидентов

> Фиксация всех регрессий: что ломалось, почему, когда, как исправлено, как избежать.
> Создан в INT-045 (BLOCK 10). Обновляется при каждом обнаружении регрессии.

---

## REG-001: "Призрачная" страница /app/system-status на Production

**Дата обнаружения**: 2026-07-21 (INT-043)  
**Дата исправления**: 2026-07-21 (INT-044)  
**Severity**: Critical

### Что ломалось

Страница `/app/system-status` существовала на Production (81653 байт, реальный prerendered контент), но **полностью отсутствовала** в git-репозитории, в `/var/www/sec-scanner-build`, и в `/root/sec-scanner-workspace`. Любой стандартный deploy (`git pull` → `next build` → `cp to web root`) уничтожил бы эту работу без возможности восстановления.

### Почему произошло

Предыдущий агент (предположительно INT-039..INT-042, не зафиксированных в git) создал страницу, задеплоил её на Production, но не сделал `git commit` и `git push`. Контекст между сессиями AI был потерян, и работа осталась "висящей" только на Production.

### Когда произошло

Между INT-038 (commit `3ca4a99`) и INT-040 v2 (commit `95691e0`). Точную дату установить невозможно — git-история этих этапов отсутствует.

### Как исправлено

1. В INT-043 создан backup Production: `/backup/sec-scanner-pro-20260721-int043` (12M)
2. В INT-044 страница реконструирована из Production HTML:
   - Скачан `system-status.html` (81653 байт) + RSC payload + JS chunk
   - Извлечены 61 i18n-ключ `registry.*` из минифицированного JS
   - Воссоздан `page.tsx` с 12 модулями, VERIFIED/PARTIAL/FAIL статусами
   - Добавлены 61 i18n-ключ в RU + EN блоки
3. Закоммичено (`06a04e8`), запушено на GitHub, собрано, задеплоено

### Как избежать повторения

- **Rule 12 (Context Reset Rule)**: перед новым диалогом читать все 5 обязательных документов + аудит Production
- **Rule 13 (No Deploy Without Sync)**: перед deploy сравнивать список страниц на Production с исходниками в git
- **Rule 15 (Evidence-Based Development)**: каждая функция требует commit hash + Production URL
- **ADR-017**: запрет deploy при расхождениях git vs Production

---

## REG-002: /app/platform-status и /app/debug/features — 404 fallback на Production

**Дата обнаружения**: 2026-07-21 (INT-043)  
**Дата исправления**: 2026-07-21 (INT-044)  
**Severity**: High

### Что ломалось

В git-репозитории страницы `/app/platform-status` (PLAT-001) и `/app/debug/features` (AIS-008) существовали как `implemented`, но на Production запросы возвращали HTTP 200 с размером 163356 байт — это размер `index.html`. То есть Nginx fallback отдавал главную страницу вместо 404, и пользователь видел Landing page вместо ожидаемой страницы статуса.

### Почему произошло

В build dir (`/var/www/sec-scanner-build`) git указывал на INT-038 (`3ca4a99`), но Production был задеплоен из другой сборки (вероятно, INT-040 v2 + "призрачная" system-status). Build dir отставал от GitHub на 2 этапа.

### Когда произошло

После INT-040 v2 deploy, когда предыдущий агент собирал Production из другого источника, не из `/var/www/sec-scanner-build`.

### Как исправлено

1. В INT-044:
   - `/app/platform-status` → упрощён до `redirect("/app/system-status")`
   - `/app/debug/features` → обновлён StatusIcon/StatusLabel для поддержки всех 9 статусов FeatureStatus
   - PLAT-001 → `broken`, AIS-008 → `verified` (после восстановления)
2. После `git pull` + `next build` обе страницы появились в build output
3. Deploy на Production — обе страницы теперь возвращают уникальный контент

### Как избежать повторения

- **ADR-019**: всегда деплоить из `/var/www/sec-scanner-build/landing/out`, не из других источников
- **Rule 13**: проверка `comm -3 <(ls prod/app/) <(ls build/out/app/)` перед deploy
- **Evidence Registry**: production URL каждой функции проверяется через `curl` на уникальный размер

---

## REG-003: SoloNotification.tsx — мёртвый код

**Дата обнаружения**: 2026-07-21 (INT-043)  
**Дата исправления**: не исправлено (помечено deprecated)  
**Severity**: Low

### Что ломалось

Файл `landing/src/components/ui/SoloNotification.tsx` был заменён на `AISSystemEvent.tsx` в INT-040 v2, но файл остался в репозитории. Это вызывало путаницу: два компонента уведомлений существовали параллельно.

### Почему произошло

При рефакторинге в INT-040 v2 предыдущий агент не удалил старый файл, только перестал его импортировать.

### Когда произошло

INT-040 v2 (commit `95691e0`)

### Как "исправлено"

В INT-043 файл помечен как `deprecated` в Feature Registry (AIS-007). Физическое удаление отложено на будущую задачу, чтобы не нарушать INT-045 freeze.

### Как избежать повторения

- **Rule 4 (Product Review)**: при рефакторинге проверять "можно ли удалить этот файл?"
- При следующей cleanup-задаче удалить `SoloNotification.tsx` физически

---

## REG-004: Turbopack panic на unicode-комментариях ─

**Дата обнаружения**: 2026-07-21 (INT-044)  
**Дата исправления**: 2026-07-21 (INT-044)  
**Severity**: Medium

### Что ломалось

`npx next build` падал с паникой Rust-вых компонентов Turbopack:
```
thread '<unnamed>' panicked at crates/next-code-frame/src/highlight.rs:1011:45:
end byte index 93 is not a char boundary; it is inside '─' (bytes 92..95) of `/* ─── Main page ───... */`
```

### Почему произошло

В файлах `platform-status/page.tsx`, `debug/features/page.tsx`, `system-status/page.tsx`, `feature-registry.ts` использовались unicode box-drawing символы `─` в комментариях-разделителях. Turbopack при error reporting пытается отобразить фрагмент кода и падает на multi-byte символе.

### Когда произошло

Первый build в INT-044

### Как исправлено

Заменены все `─` на `-` в затронутых файлах. Также запрещено использование unicode box-drawing в комментариях TypeScript/TSX.

### Как избежать повторения

- В новых файлах использовать только ASCII-комментарии (`/* --- Section --- */` вместо `/* ─── Section ─── */`)
- Pre-commit hook (TODO): grep на unicode box-drawing символы

---

## REG-005: 'partial' отсутствовал в FeatureStatus TypeScript type

**Дата обнаружения**: 2026-07-21 (INT-044)  
**Дата исправления**: 2026-07-21 (INT-044)  
**Severity**: Medium

### Что ломалось

В INT-043 (ADR-018) заявлено 7 канонических статусов: not_started/in_progress/implemented/verified/broken/missing/deprecated. Но `partial` был забыт. В INT-044 мигрировали `implemented` → `partial` для 4 функций (Integrations, Repositories, Notifications, Pricing), и TypeScript начал падать:
```
Type error: Object literal may only specify known properties, and 'partial' does not exist
in type 'Record<FeatureStatus, string>'.
```

### Почему произошло

Несогласованность между дизайн-документом ADR-018 и фактической реализацией. ADR-018 упоминал `partial` в описании, но не в списке канонических статусов.

### Когда произошло

INT-044 build после миграции feature-registry.json

### Как исправлено

В `feature-registry.ts` добавлен `partial` в FeatureStatus union type (commit `a8500f7`).

### Как избежать повторения

- При добавлении новых статусов обновлять: TypeScript type → CANONICAL_STATUSES array → getStatusLabel → getStatusColor → migrateToCanonicalStatus
- Тест: `tsc --noEmit` перед каждым commit (TODO: pre-commit hook)

---

## REG-006: Backend отставал на 4 этапа (INT-036 vs GitHub INT-040 v2)

**Дата обнаружения**: 2026-07-21 (INT-043)  
**Дата исправления**: не исправлено (отложено на INT-046+)  
**Severity**: Medium

### Что ломалось

Backend (`sip-server.service`) запущен из `/root/sec-scanner-workspace/backend/dist/index.js`, где git указывал на INT-036 (`b27363f`). GitHub уже на INT-040 v2. То есть backend работал на коде 4-этапной давности.

### Почему произошло

`/root/sec-scanner-workspace` — отдельный клон репозитория, не синхронизированный с `/var/www/sec-scanner-build`. Backend никогда не обновлялся при деплоях фронтенда.

### Когда произошло

Начиная с INT-037 (когда backend был последний раз обновлён)

### Как "исправлено"

Задокументировано в CURRENT_STATE.md. Backend остаётся на INT-036, потому что:
1. Backend работает корректно (`/api/health` отвечает JSON)
2. Обновление требует пересборки TypeScript + перезапуска systemd
3. Это работа для отдельной задачи (INT-046+)

### Как избежать повторения

- ADR-019 (запланировано): объединить `/root/sec-scanner-workspace` и `/var/www/sec-scanner-build` в один clone
- Deploy checklist должен включать `cd /root/sec-scanner-workspace && git pull && npm run build && systemctl restart sip-server`

---

## REG-007: Документация устарела на 3-6 этапов

**Дата обнаружения**: 2026-07-21 (INT-043)  
**Дата исправления**: 2026-07-21 (INT-044)  
**Severity**: High

### Что ломалось

| Документ | Заявленная версия | Реальная версия |
|----------|-------------------|------------------|
| HANDOFF.md | v0.5.0 / INT-036 | актуальная: INT-040 v2 |
| CURRENT_STATE.md | INT-037 | актуальная: INT-040 v2 |
| CHANGELOG_PRODUCT.md | v0.5.0 / INT-036 | актуальная: INT-040 v2 |
| worklog.md | 1 запись (INT-040) | должно быть 5+ записей |

### Почему произошло

Предыдущие агенты не обновляли документацию после завершения задач. Context Reset Rule не соблюдался.

### Когда произошло

Накопительно с INT-037 по INT-042

### Как исправлено

В INT-043 и INT-044:
- CURRENT_STATE.md обновлён до INT-044
- CHANGELOG_PRODUCT.md добавлены записи INT-038, INT-040 v2, INT-043, INT-044
- worklog.md добавлены записи INT-043, INT-044
- DECISIONS.md добавлены ADR-016..023
- DEVELOPMENT_RULES.md добавлены Rules 12..15

### Как избежать повторения

- **Rule 12 (Context Reset Rule)**: новый диалог начинается с чтения всех 5 документов
- **Release Checklist**: обновление CURRENT_STATE, CHANGELOG_PRODUCT, DECISIONS — обязательно перед закрытием задачи
- **Rule 15 (Evidence-Based Development)**: каждое утверждение о завершении требует commit hash

---

## Шаблон для новых регрессий

```markdown
## REG-XXX: Краткое описание

**Дата обнаружения**: YYYY-MM-DD (INT-XXX)  
**Дата исправления**: YYYY-MM-DD (INT-XXX) или "не исправлено"  
**Severity**: Critical | High | Medium | Low

### Что ломалось
[Описание видимого эффекта]

### Почему произошло
[Корневая причина]

### Когда произошло
[Этап/коммит]

### Как исправлено
[Конкретные шаги + commit hash]

### Как избежать повторения
[Ссылки на правила, ADR, checklist]
```
