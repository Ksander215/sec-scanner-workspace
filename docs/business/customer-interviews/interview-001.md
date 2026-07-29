# Interview 001 — Startup Founder (SaaS, 30 сотрудников)

## Метаданные

- **ID интервью**: interview-001
- **Дата**: 2026-07-20
- **Длительность**: 45 минут
- **Формат**: video call
- **Интервьюер**: Founder SIP
- **ICP**: Startup Founder

---

## Кто собеседник

- **Имя**: Алексей М.
- **Должность**: CTO / Co-founder
- **Компания**: SaaS B2B analytics platform (анонимизировано)
- **Размер компании**: 30 сотрудников
- **Industry**: SaaS / B2B Analytics
- **Регион**: Москва, Россия

---

## Чем занимается

B2B SaaS платформа для аналитики маркетинговых кампаний. Клиенты — крупные e-commerce компании. 30 сотрудников: 15 инженеров, 10 sales/marketing, 5 operations. Подписка от $2k/мес, 40 клиентов, $80k MRR.

---

## Главная проблема

"Enterprise клиенты (от $10k/мес) требуют SOC2 Type II перед подписанием контракта. У нас нет security команды. Я технический CTO, но security — не моя экспертиза. Каждый раз когда приходит enterprise lead, я не знаю что отвечать. Теряем контракты на $100k+/год."

---

## Как решает сейчас

"Раз в год нанимаю внешнего консультанта за $8k. Он делает manual audit за 2 недели, пишет PDF на 40 страниц. Потом я сам разбираюсь что из этого критично, что нет. На следующий год всё заново — ничего не отслеживается во времени."

---

## Что раздражает

1. "Консультант говорит техническим языком — я половину не понимаю"
2. "PDF на 40 страниц — никто не читает"
3. "Нет понимания: мы стали безопаснее за год или нет?"
4. "Enterprise спрашивает про continuous monitoring — у нас этого нет"
5. "После audit ничего не автоматизировано — всё manual"

---

## За что готов платить

"Если платформа даст мне:
- Executive Summary на 1 странице для CEO enterprise клиента
- Continuous monitoring (не раз в год, а постоянно)
- Понятные метрики 'стали лучше/хуже за квартал'
- Готовность к SOC2 audit

Готов платить $300-$500/мес. Это дешевле чем $8k/год консультант + даёт непрерывность."

---

## Какими продуктами пользуется

- Snyk (code scanning) — $7k/год
- Dependabot (бесплатно)
- Sentry (error monitoring) — $2k/год
- Manual security review раз в год — $8k

---

## Что ему нравится

- "Snyk находит реальные проблемы в коде"
- "Dependabot автоматизирует dependency updates"
- "Sentry ловит production errors"

---

## Что не нравится

- "Snyk не говорит на языке бизнеса — только CVE"
- "Ничто не объединяет code + infra + deps в одну картину"
- "Нет executive summary для non-technical CEO"
- "После audit нет tracking исправлений"

---

## Готов ли протестировать платформу

- [x] Да, готов быть pilot customer
- [ ] Да, готов попробовать trial
- [ ] Может быть, позже
- [ ] Нет

**Комментарий**: "Хочу посмотреть Executive Summary — если он реально на 1 странице и на языке бизнеса, это решит мою проблему с enterprise клиентами. Готов pilot в сентябре."

---

## Контакты

- **Email**: [анонимизировано]
- **LinkedIn**: [анонимизировано]
- **Preferred contact**: email

---

## Follow-up

- **Следующий шаг**: отправить demo Executive Summary + позвать на pilot в сентябре
- **Когда связаться снова**: 2026-08-15 (перед pilot)
- **Ответственный**: Founder SIP

---

## Ключевые инсайты

1. **Enterprise требует SOC2** — это реальный blocker для B2B SaaS с enterprise клиентами. Подтверждает ASSUMPTION-001.
2. **Executive Summary на 1 странице** — killer feature. Готов платить только за это.
3. **Цена $300-$500/мес** — validate pricing assumption для Startup Founder ICP.
4. **Continuous monitoring** — важнее разового audit. Подтверждает что наша ценность в регулярности.
5. **Consolidation** — у него 4 разных инструмента, хочет один.

---

## Цитаты

> "Enterprise спрашивает про SOC2, а я не знаю что отвечать. Теряем контракты на $100k+/год." — на тему Problem
> "Executive Summary на 1 странице для CEO enterprise клиента — это решит мою проблему." — на тему Solution
> "$300-$500/мес — дешевле чем $8k/год консультант + даёт непрерывность." — на тему Pricing

---

## Связанные hypotheses / problems

- ASSUMPTION-001 (Enterprise требует SOC2): **VALIDATED**
- ASSUMPTION-005 (Executive Summary — killer feature): **VALIDATED**
- ASSUMPTION-011 (Pricing $499 для Startup Founder): **VALIDATED** (готов $300-$500)
- PROBLEM-001 (Нет security команды для SOC2): **CONFIRMED**
- PROBLEM-003 (Разовые audit без continuous monitoring): **CONFIRMED**
