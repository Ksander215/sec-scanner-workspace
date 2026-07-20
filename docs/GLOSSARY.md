# GLOSSARY.md — Глоссарий проекта

---

## Продуктовые термины

| Термин | Определение |
|--------|-----------|
| SIP | Security Intelligence Platform — операционная система для безопасности бизнеса |
| AIS | Adaptive Intelligence System — адаптивная интеллектуальная система сопровождения пользователя |
| Risk Score | Числовая оценка риска инфраструктуры (0-100) |
| Confidence Score | Оценка уверенности платформы в своих рекомендациях (0-100) |
| Business Result | Интерпретация технического результата на языке бизнеса |
| Executive Summary | Сводка для руководителей с ключевыми выводами |
| Attack Path | Цепочка уязвимостей, ведущая от точки входа до критического актива |
| Knowledge Graph | Граф связей между активами, уязвимостями и рисками |
| Solutions Center | Центр решений — каталог инструментов и интеграций (бывший Marketplace) |
| Solo Notification | Уведомление AIS в стиле Solo Leveling |
| Personal Goal | Персональная цель пользователя с отслеживанием прогресса |
| Trust Builder | Набор факторов, повышающих доверие пользователя к платформе |
| Demo Badge | Визуальная пометка, указывающая на demo-данные |

---

## Технические термины

| Термин | Определение |
|--------|-----------|
| Static Export | Режим Next.js `output: "export"` — все страницы пререндерены в HTML |
| App Router | Система маршрутизации Next.js через директории `app/` |
| i18n | Internationalization — система многоязычности (RU + EN) |
| localStorage | Browser API для хранения данных на стороне клиента |
| Web Audio API | Browser API для генерации звуков без файлов |
| SSE | Server-Sent Events — потоковые обновления от сервера |
| Plugin Runtime | Среда выполнения сканер-плагинов на backend |
| File Store | Файловое хранилище JSON на backend (вместо БД) |
| Tailwind CSS | Utility-first CSS фреймворк |
| Framer Motion | Библиотека анимаций для React |
| @xyflow/react | Библиотека для визуализации графов (Knowledge Graph) |
| Recharts | Библиотека для графиков и диаграмм |
| Lucide | Библиотека иконок для React |

---

## Роли пользователей

| Роль | Описание | Что видит |
|------|----------|----------|
| CEO / CTO / CISO | Руководитель бизнеса | Бизнес-метрики, Executive Summary, Risk Score |
| DevOps | Инженер инфраструктуры | Технические детали, конфигурации, интеграции |
| Security Engineer | Инженер безопасности | CVE, уязвимости, пути атак, рекомендации |
| Analyst | Аналитик рисков | Тренды, compliance, графики, сравнения |
| Newcomer | Новый пользователь | Объяснения, подсказки, пошаговые инструкции |

---

## Задачи (INT)

| ID | Название | Статус |
|----|----------|--------|
| INT-030 | Repository Integrity Audit | ✅ Завершён |
| INT-031 | Business Trust & Guided Experience | ✅ Завершён |
| INT-032 | Self-Explaining Platform | ✅ Завершён |
| INT-033 | Smart Scroll Navigation | ✅ Завершён |
| INT-033.1 | Intelligent Page Navigator (доработка) | ⚠️ Частично |
| INT-034 | Transform Marketplace into Solutions Center | ✅ Завершён |
| INT-035 | Confidence-Driven UX | ✅ Завершён |
| INT-036 | Adaptive Intelligence System (AIS) | ✅ Завершён |
| INT-037 | Project Knowledge Base & Handoff | 🔄 В процессе |

---

## Файловые пути

| Путь | Назначение |
|------|-----------|
| `/landing/src/lib/ais/` | AIS engine модули |
| `/landing/src/hooks/useAIS.ts` | AIS React hook |
| `/landing/src/components/ui/` | UI компоненты |
| `/landing/src/components/layout/` | Layout компоненты |
| `/landing/src/lib/i18n.ts` | i18n ключи (RU + EN) |
| `/landing/src/lib/engine/` | Business engine |
| `/landing/src/app/` | Страницы Next.js |
| `/backend/src/` | Backend код |
| `/docs/` | Документация проекта |
| `/scripts/` | Скрипты для деплоя и автоматизации |

---

## Серверные пути

| Путь | Назначение |
|------|-----------|
| `/var/www/sec-scanner.pro/` | Web root (static files) |
| `/var/www/sec-scanner-build/` | Git repo + build source |
| `/etc/nginx/sites-enabled/sec-scanner` | Nginx конфигурация |
| `/var/lib/sip/` | Backend data store (не используется) |

---

## Аббревиатуры

| Аббревиатура | Расшифровка |
|--------------|-------------|
| CVE | Common Vulnerabilities and Exposures |
| CVSS | Common Vulnerability Scoring System |
| OWASP | Open Web Application Security Project |
| MITRE ATT&CK | Framework for adversary tactics and techniques |
| CIS | Center for Internet Security |
| PCI DSS | Payment Card Industry Data Security Standard |
| NIST | National Institute of Standards and Technology |
| SOC 2 | Service Organization Control 2 |
| RBAC | Role-Based Access Control |
| SSO | Single Sign-On |
| SSE | Server-Sent Events |
| API | Application Programming Interface |
| SDK | Software Development Kit |
| CLI | Command Line Interface |
| CI/CD | Continuous Integration / Continuous Deployment |
| E2E | End-to-End (тестирование) |
| DoD | Definition of Done |
| ADR | Architecture Decision Record |
