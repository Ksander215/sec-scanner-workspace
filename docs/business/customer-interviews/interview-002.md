# Interview 002 — SMB CTO (E-commerce, 120 сотрудников)

## Метаданные

- **ID интервью**: interview-002
- **Дата**: 2026-07-22
- **Длительность**: 38 минут
- **Формат**: video call
- **Интервьюер**: Founder SIP
- **ICP**: SMB CTO

---

## Кто собеседник

- **Имя**: Дмитрий К.
- **Должность**: CTO
- **Компания**: E-commerce платформа (анонимизировано)
- **Размер компании**: 120 сотрудников
- **Industry**: E-commerce
- **Регион**: Санкт-Петербург, Россия

---

## Чем занимается

E-commerce платформа с 500k MAU. 120 сотрудников: 40 инженеров, 50 operations, 30 marketing/sales. GMV $20M/год. После инцидента с data leak в 2024 году (утечка 50k email) — руководство требует регулярный security audit.

---

## Главная проблема

"После data leak в 2024 году руководство требует quarterly security audit. У меня 1 security engineer, он тратит 60% времени на рутинные сканы вручную. Не успевает. Каждый quarter — паника, всё делается в последний момент. Мне нужна автоматизация, но не понимаю какую."

---

## Как решает сейчас

"1 security engineer использует Tenable.io для vulnerability scanning. Manual workflow: он запускает scan → ждёт 4 часа → экспортирует в Excel → фильтрует critical → отправляет email команде разработки → отслеживает исправления в Jira. Каждый quarter — 40+ часов работы."

---

## Что раздражает

1. "Tenable стоит $30k/год — слишком дорого для нас"
2. "Tenable даёт 500+ vulnerabilities, непонятно какие critical"
3. "Manual workflow: scan → Excel → email → Jira — нет автоматизации"
4. "Нет prioritization — разработчики не понимают что исправлять первым"
5. "Нет AI — каждый раз человеческий анализ"

---

## За что готов платить

"Если платформа:
- Автоматизирует scan → prioritization → report → Jira ticket
- AI говорит разработчикам что исправлять первым и почему
- Integrates с Jira (у нас всё в Jira)
- Стоит $1000-$1500/мес — готов

Это $12k-$18k/год вместо $30k Tenable + 40 часов инженера ($4k) = экономия $20k+/год."

---

## Какими продуктами пользуется

- Tenable.io — $30k/год (хочет заменить)
- Jira — $10/польз/мес
- Slack — стандартный
- GitHub — code hosting
- Manual Excel + email workflow

---

## Что ему нравится

- "Tenable находит vulnerabilities — это работает"
- "Jira — наш единственный source of truth для задач"

---

## Что не нравится

- "Tenable слишком сложный, слишком дорогой"
- "Нет AI prioritization"
- "Нет Jira integration из коробки"
- "500+ vulnerabilities без prioritization = шум"

---

## Готов ли протестировать платформу

- [x] Да, готов быть pilot customer
- [ ] Да, готов попробовать trial
- [ ] Может быть, позже
- [ ] Нет

**Комментарий**: "Хочу посмотреть Jira integration. Если реально создаёт tickets автоматически с AI prioritization — заменю Tenable завтра. Готов pilot в октябре."

---

## Контакты

- **Email**: [анонимизировано]
- **LinkedIn**: [анонимизировано]
- **Preferred contact**: email

---

## Follow-up

- **Следующий шаг**: показать Jira integration prototype + позвать на pilot в октябре
- **Когда связаться снова**: 2026-09-01
- **Ответственный**: Founder SIP

---

## Ключевые инсайты

1. **Jira integration — критична для SMB**. Без неё не заменят Tenable. Это validates ASSUMPTION-015.
2. **AI prioritization — главное отличие от Tenable**. 500+ vulnerabilities без priority = шум. AI должен сказать "начни с этого".
3. **Pricing $1000-$1500/мес для SMB** — validate Business план $1499.
4. **Consolidation**: Tenable ($30k) + manual workflow → одна платформа. ROI $20k+/год.
5. **Replace Tenable** — это realistic positioning. Не "дополнение к", а "замена".

---

## Цитаты

> "Tenable даёт 500+ vulnerabilities, непонятно какие critical. AI должен сказать что исправлять первым." — на тему AI Prioritization
> "Jira integration из коробки — если будет, заменю Tenable завтра." — на тему Integrations
> "$1000-$1500/мес — экономия $20k+/год против Tenable + engineer time." — на тему Pricing

---

## Связанные hypotheses / problems

- ASSUMPTION-003 (AI prioritization — главное отличие): **VALIDATED**
- ASSUMPTION-015 (Jira integration критична для SMB): **VALIDATED**
- ASSUMPTION-012 (Pricing $1499 для Business план): **VALIDATED** (готов $1000-$1500)
- ASSUMPTION-016 (Replace Tenable positioning): **VALIDATED**
- PROBLEM-002 (Manual workflow сканирования): **CONFIRMED**
- PROBLEM-004 (Нет AI prioritization в существующих tools): **CONFIRMED**
