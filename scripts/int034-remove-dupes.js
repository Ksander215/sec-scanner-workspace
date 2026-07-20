#!/usr/bin/env node
/**
 * Remove old duplicate keys from i18n.ts
 * Keep the LATER (new) occurrence of each duplicate key, remove the EARLIER (old) one.
 */
const fs = require("fs");
const path = "/home/z/my-project/landing/src/lib/i18n.ts";
let content = fs.readFileSync(path, "utf8");

// Old RU keys to remove (these are the ORIGINAL keys that are now duplicated by the new INT-034 keys)
const oldRuKeys = [
  // marketplace.title/subtitle
  `"marketplace.title": "Каталог инструментов"`,
  `"marketplace.subtitle": "Расширяйте возможности SIP с помощью инструментов и интеграций"`,
  // assistant
  `"assistant.greeting.marketplace": "Вы открыли каталог. Здесь расширяются возможности платформы с помощью плагинов и инструментов."`,
  `"assistant.what.marketplace": "Каталог расширений для платформы: сканеры, дашборды, шаблоны отчётов и AI-промпты. Адаптируйте платформу под свои задачи."`,
  `"assistant.why.marketplace": "У каждой компании уникальные потребности. Каталог позволяет добавить именно те инструменты, которые нужны вам."`,
  `"assistant.result.marketplace": "Платформа, которая адаптируется под ваши потребности — а не наоборот."`,
  `"assistant.next.marketplace": "Установите нужные плагины и запустите сканирование с новыми инструментами."`,
  // sidebar
  `"sidebar.catalog": "Каталог инструментов"`,
  // help
  `"help.marketplace.title": "О каталоге"`,
  `"help.marketplace.what": "Каталог плагинов безопасности, дашбордов, шаблонов и интеграций, расширяющих возможности SIP."`,
  `"help.marketplace.why": "У каждой компании уникальные потребности в безопасности. Каталог позволяет добавить именно те инструменты и представления, которые нужны вам."`,
  `"help.marketplace.result": "Платформа, которая адаптируется под ваши потребности — а не наоборот."`,
  `"help.marketplace.next": "Подключить интеграции →"`,
  // faq
  `"faq.marketplace.q1": "Что такое маркетплейс?"`,
  `"faq.marketplace.a1": "Это каталог расширений для SIP: сканеры, дашборды, шаблоны отчётов и AI-промпты. Расширяйте возможности платформы под свои задачи."`,
  `"faq.marketplace.q2": "Безопасно ли устанавливать плагины?"`,
  `"faq.marketplace.a2": "Все плагины проходят проверку перед публикацией. Но всегда проверяйте, какие разрешения требует плагин перед установкой."`,
  `"faq.marketplace.q3": "Могу ли я создать свой плагин?"`,
  `"faq.marketplace.a3": "Да, SIP поддерживает кастомные плагины. Документация по разработке доступна в разделе Documentation."`,
  `"faq.marketplace.q4": "Плагины бесплатные?"`,
  `"faq.marketplace.a4": "Базовые плагины — да. Расширенные могут требовать подписку. Информация о стоимости указана на странице каждого плагина."`,
  `"faq.marketplace.q5": "Как удалить плагин?"`,
  `"faq.marketplace.a5": "Откройте страницу плагина в маркетплейсе и нажмите «Удалить». Все данные плагина будут очищены."`,
  // next
  `"next.marketplace.title": "Что делать дальше"`,
  `"next.marketplace.step1": "Запустить сканирование с новым плагином"`,
  `"next.marketplace.step2": "Подключить интеграцию"`,
  `"next.marketplace.step3": "Создать API-ключ"`,
  // scroll
  `"scroll.marketplace.overview": "Каталог инструментов"`,
  `"scroll.marketplace.catalog": "Инструменты"`,
];

// Old EN keys to remove
const oldEnKeys = [
  `"marketplace.title": "Tool Catalog"`,
  `"marketplace.subtitle": "Extend SIP with tools and integrations"`,
  `"assistant.greeting.marketplace": "You opened the catalog. Platform capabilities are expanded here with plugins and tools."`,
  `"assistant.what.marketplace": "A catalog of platform extensions: scanners, dashboards, report templates, and AI prompts. Adapt the platform to your needs."`,
  `"assistant.why.marketplace": "Every company has unique needs. The catalog lets you add exactly the tools you need."`,
  `"assistant.result.marketplace": "A platform that adapts to your needs — not the other way around."`,
  `"assistant.next.marketplace": "Install the plugins you need and run a scan with the new tools."`,
  `"sidebar.catalog": "Tool Catalog"`,
  `"help.marketplace.title": "About Marketplace"`,
  `"help.marketplace.what": "Catalog of security plugins, dashboards, templates, and integrations that extend SIP capabilities."`,
  `"help.marketplace.why": "Every company has unique security needs. Marketplace lets you add exactly the tools and views you need."`,
  `"help.marketplace.result": "A platform that adapts to your needs — not the other way around."`,
  `"help.marketplace.next": "Connect integrations →"`,
  `"faq.marketplace.q1": "What is the marketplace?"`,
  `"faq.marketplace.a1": "A catalog of extensions for SIP: scanners, dashboards, report templates, and AI prompts. Expand the platform's capabilities for your needs."`,
  `"faq.marketplace.q2": "Is it safe to install plugins?"`,
  `"faq.marketplace.a2": "All plugins are reviewed before publication. But always check what permissions a plugin requires before installing."`,
  `"faq.marketplace.q3": "Can I create my own plugin?"`,
  `"faq.marketplace.a3": "Yes, SIP supports custom plugins. Development documentation is available in the Documentation section."`,
  `"faq.marketplace.q4": "Are plugins free?"`,
  `"faq.marketplace.a4": "Basic plugins are free. Advanced ones may require a subscription. Pricing info is on each plugin's page."`,
  `"faq.marketplace.q5": "How do I remove a plugin?"`,
  `"faq.marketplace.a5": "Open the plugin page in the marketplace and click Uninstall. All plugin data will be cleaned up."`,
  `"next.marketplace.title": "What to Do Next"`,
  `"next.marketplace.step1": "Run a scan with the new plugin"`,
  `"next.marketplace.step2": "Connect an integration"`,
  `"next.marketplace.step3": "Create an API key"`,
  `"scroll.marketplace.overview": "Tool catalog"`,
  `"scroll.marketplace.catalog": "Tools"`,
];

let removedCount = 0;

for (const oldKey of [...oldRuKeys, ...oldEnKeys]) {
  // Each key is on its own line like:    "key": "value",
  // Need to remove the full line including possible newline
  const escaped = oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineRegex = new RegExp(`^\\s*${escaped},?\\n`, 'm');
  if (lineRegex.test(content)) {
    content = content.replace(lineRegex, '');
    removedCount++;
  } else {
    console.log(`NOT FOUND: ${oldKey.substring(0, 60)}...`);
  }
}

fs.writeFileSync(path, content, "utf8");
console.log(`✅ Removed ${removedCount} duplicate keys`);
