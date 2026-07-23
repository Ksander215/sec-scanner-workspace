# SOURCE_OF_TRUTH.md

> PX-005 BLOCK 8. Архитектура единого источника истины.
> Обязательный документ для всех будущих задач.

---

## Принцип

```
LOCAL → GITHUB → SERVER → PRODUCTION
```

Каждое изменение должно пройти все 4 слоя. Если хотя бы один отсутствует — задача считается невыполненной.

---

## 4 источника истины

### 1. LOCAL (рабочая копия разработчика)

**Путь**: `/home/z/my-project/workspace/sec-scanner-workspace/`

**Что хранит**: актуальный исходный код, документация, скрипты.

**Правила**:
- Перед началом задачи: `git status` должен быть чистым
- После завершения: `git add -A && git commit -m "PX-XXX: описание"`
- Перед push: `git rev-parse HEAD` — запомнить commit hash

**Проверка**:
```bash
cd /home/z/my-project/workspace/sec-scanner-workspace
git status          # должен быть clean
git rev-parse HEAD  # запомнить hash
```

---

### 2. GITHUB (remote repository)

**URL**: `https://github.com/Ksander215/sec-scanner-workspace.git`

**Что хранит**: canonical версия кода, доступна всей команде.

**Правила**:
- После локального commit: `git push origin main`
- Проверка: `git ls-remote origin main` должен совпадать с LOCAL HEAD

**Проверка**:
```bash
# На сервере (где есть GitHub token в remote):
cd /var/www/sec-scanner-build
GIT_TERMINAL_PROMPT=0 git ls-remote origin main
# Должен вернуть тот же hash, что и LOCAL
```

---

### 3. SERVER (build source на production сервере)

**Путь**: `/var/www/sec-scanner-build/` (на сервере 85.239.38.163:22222)

**Что хранит**: git clone для сборки (`npx next build`).

**Правила**:
- После GitHub push: `cd /var/www/sec-scanner-build && git pull origin main`
- Проверка: `git rev-parse HEAD` должен совпадать с GITHUB

**Проверка** (через SSH):
```bash
ssh root@85.239.38.163 -p 22222
cd /var/www/sec-scanner-build
git rev-parse HEAD  # должен совпадать с GITHUB
```

---

### 4. PRODUCTION (живой сайт)

**URL**: `https://sec-scanner.pro`
**Путь**: `/var/www/sec-scanner.pro/` (на сервере)

**Что хранит**: статический HTML/JS/CSS из `landing/out/`.

**Правила**:
- После SERVER build: `cp -r /var/www/sec-scanner-build/landing/out/* /var/www/sec-scanner.pro/`
- Проверка: `curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/<route>` → 200

**Проверка**:
```bash
curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/app/home
# Должен вернуть 200
```

---

## Деплой процесс (обязательный)

```bash
# 1. LOCAL: commit
cd /home/z/my-project/workspace/sec-scanner-workspace
git add -A && git commit -m "PX-XXX: описание"
LOCAL_HASH=$(git rev-parse HEAD)

# 2. GITHUB: push (через сервер, где есть token)
# Создать bundle, загрузить на сервер, применить
cd /var/www/sec-scanner-build
git fetch /tmp/bundle 'HEAD:px-xxx'
git reset --hard px-xxx
GIT_TERMINAL_PROMPT=0 git push origin main

# 3. SERVER: build
cd /var/www/sec-scanner-build/landing
rm -rf .next out
npx next build

# 4. PRODUCTION: deploy
rm -rf /var/www/sec-scanner.pro/*
cp -r /var/www/sec-scanner-build/landing/out/* /var/www/sec-scanner.pro/
chown -R www-data:www-data /var/www/sec-scanner.pro
nginx -s reload

# 5. VERIFY
curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/<route>
```

---

## Deployment Report (Rule 31)

После каждой задачи формируется отчёт:

```
DEPLOYMENT REPORT
=================

LOCAL
  Commit: abc123
  Status: OK

GITHUB
  Commit: abc123
  Status: OK

SERVER
  Commit: abc123
  Status: OK

PRODUCTION
  Version: abc123
  Status: OK

ALL LAYERS: ✅ COMPLETE
```

Если хотя бы один слой отсутствует: `STATUS: INCOMPLETE`

---

## Запреты

1. **Запрещён tar-деплой** как основной способ. Только git pull + next build + cp.
2. **Запрещено** писать "Done" без Deployment Report.
3. **Запрещено** начинать новую задачу без проверки Rule 33 (Repository First).
4. **Запрещено** иметь расхождения между LOCAL, GITHUB, SERVER, PRODUCTION.

---

## Backup

Перед каждым deploy создаётся backup:
```bash
mkdir -p /backup/sec-scanner-pro-pre-px-xxx
cp -a /var/www/sec-scanner.pro/. /backup/sec-scanner-pro-pre-px-xxx/
```

Backup позволяет откатиться при неудачном deploy.
