#!/usr/bin/env python3
"""
INT-034: Update i18n.ts with all new translation keys for the Solutions Center redesign.
Adds ~120 new keys for both ru and en locales.
"""
import re

I18N_PATH = "/home/z/my-project/landing/src/lib/i18n.ts"

with open(I18N_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# ─── New Russian keys (inserted before the closing of ru: block) ───
ru_new_keys = '''
    // ─── INT-034: Solutions Center (Центр решений) ────────────────────────
    "solutions.title": "Центр решений",
    "solutions.subtitle": "Выберите, что хотите защитить — мы подберём оптимальный набор проверок",
    "solutions.whatToProtect": "Что вы хотите защитить?",
    "solutions.whatToProtect.desc": "Выберите тип инфраструктуры — и мы покажем подходящие проверки",

    // Category cards
    "solutions.cat.website": "Веб-сайт",
    "solutions.cat.website.desc": "Проверить сайт",
    "solutions.cat.website.result": "Находим уязвимости до того, как ими воспользуются злоумышленники",
    "solutions.cat.server": "Сервер",
    "solutions.cat.server.desc": "Проверить сервер",
    "solutions.cat.server.result": "Обнаруживаем открытые порты, уязвимые сервисы и ошибки конфигурации",
    "solutions.cat.repository": "Репозиторий",
    "solutions.cat.repository.desc": "Проверить код",
    "solutions.cat.repository.result": "Находим уязвимости в коде и зависимостях до попадания в продакшен",
    "solutions.cat.api": "API",
    "solutions.cat.api.desc": "Проверить API",
    "solutions.cat.api.result": "Выявляем небезопасные эндпоинты и ошибки авторизации",
    "solutions.cat.docker": "Контейнеры Docker",
    "solutions.cat.docker.desc": "Проверить контейнеры",
    "solutions.cat.docker.result": "Находим уязвимости в образах и ошибочные конфигурации",
    "solutions.cat.kubernetes": "Kubernetes",
    "solutions.cat.kubernetes.desc": "Проверить кластер",
    "solutions.cat.kubernetes.result": "Обнаруживаем небезопасные настройки подов и сетевых политик",
    "solutions.cat.cloud": "Облачная инфраструктура",
    "solutions.cat.cloud.desc": "Проверить облако",
    "solutions.cat.cloud.result": "Выявляем ошибки конфигурации и избыточные права доступа",
    "solutions.cat.unknown": "Пока не знаю",
    "solutions.cat.unknown.desc": "Помочь выбрать",
    "solutions.cat.unknown.result": "Ответьте на несколько вопросов — мы подберём проверки автоматически",

    // Recommended solutions
    "solutions.recommended.title": "Рекомендуемые проверки",
    "solutions.recommended.subtitle": "На основе выбранного типа инфраструктуры",
    "solutions.technologies.label": "Используются:",
    "solutions.allTools": "Все доступные решения",
    "solutions.changeCategory": "Изменить тип",

    // Wizard (Пока не знаю)
    "solutions.wizard.title": "Не знаете, с чего начать?",
    "solutions.wizard.subtitle": "Ответьте на несколько вопросов — мы подберём проверки автоматически",
    "solutions.wizard.q1": "У вас есть сайт?",
    "solutions.wizard.q2": "Есть сервер?",
    "solutions.wizard.q3": "Используете GitHub или GitLab?",
    "solutions.wizard.q4": "Используете Docker?",
    "solutions.wizard.result.title": "Ваш персональный набор проверок",
    "solutions.wizard.result.subtitle": "На основе ваших ответов мы рекомендуем следующие проверки:",
    "solutions.wizard.restart": "Пройти ещё раз",
    "solutions.wizard.step": "Вопрос {current} из {total}",

    // New generation cards
    "solutions.card.whatChecks": "Что проверяет",
    "solutions.card.whatYouGet": "Что вы получите",
    "solutions.card.technologies": "Используемые технологии",
    "solutions.card.connect": "Подключить",
    "solutions.card.connecting": "Подключение...",
    "solutions.card.connected": "Подключено",
    "solutions.card.result.risks": "список рисков",
    "solutions.card.result.recommendations": "рекомендации",
    "solutions.card.result.report": "понятный отчёт",
    "solutions.card.result.priorities": "приоритет исправлений",
    "solutions.card.back": "Назад к решениям",

    // Post-install business messages (BLOCK 7)
    "solutions.installed.serverReady": "Проверка серверов готова к работе.",
    "solutions.installed.websiteReady": "Проверка веб-сайтов настроена.",
    "solutions.installed.codeReady": "Анализ кода настроен.",
    "solutions.installed.containerReady": "Проверка контейнеров готова к работе.",
    "solutions.installed.nowCanConnect": "Теперь можно подключить цель и выполнить первое сканирование.",
    "solutions.installed.nowCanScan": "Теперь можно запустить первое сканирование и получить результаты.",
    "solutions.installed.connectServer": "Подключить сервер",
    "solutions.installed.runScan": "Запустить сканирование",
    "solutions.installed.connectRepo": "Подключить репозиторий",

    // Next step chain (BLOCK 8)
    "solutions.chain.title": "Следующий этап",
    "solutions.chain.connectRepo": "Подключить репозиторий",
    "solutions.chain.runAnalysis": "Запустить анализ",
    "solutions.chain.viewResults": "Посмотреть результаты",
    "solutions.chain.getReport": "Получить отчёт",
    "solutions.chain.fixIssues": "Исправить проблемы",

    // Visual flow (BLOCK 9)
    "flow.solutions.select": "Выбор проверки",
    "flow.solutions.connect": "Подключение",
    "flow.solutions.scan": "Сканирование",
    "flow.solutions.report": "Отчёт",
    "flow.solutions.fix": "Исправление",
    "flow.solutions.recheck": "Повторная проверка",

    // Business result (BLOCK 10)
    "business.solutionReady.title": "Решение подключено",
    "business.solutionReady.desc": "Безопасность вашей инфраструктуры стала прозрачной и управляемой. Теперь вы знаете, какие риски требуют внимания в первую очередь.",
    "business.checkConfigured.title": "Проверка настроена",
    "business.checkConfigured.desc": "Следующие отчёты будут формироваться автоматически. Вы будете получать уведомления о новых рисках.",

    // Trust block (BLOCK 11)
    "solutions.trust.title": "Почему именно этот набор?",
    "solutions.trust.reason": "Мы подобрали эти проверки на основе выбранной вами инфраструктуры. Именно они позволяют обнаружить большинство критичных угроз для вашего сценария.",
    "solutions.trust.coverage": "Данный набор покрывает более 90% типичных векторов атак для выбранного типа инфраструктуры.",

    // Updated marketplace title/subtitle
    "marketplace.title": "Центр решений",
    "marketplace.subtitle": "Выберите, что хотите защитить — мы подберём оптимальный набор проверок",

    // Updated assistant keys for marketplace → solutions center
    "assistant.greeting.marketplace": "Вы открыли Центр решений. Здесь вы подбираете проверки под задачи своего бизнеса — а не ищете инструменты по названиям.",
    "assistant.what.marketplace": "Центр решений помогает выбрать проверки безопасности на основе типа вашей инфраструктуры. Не нужно разбираться в технологиях — достаточно сказать, что вы хотите защитить.",
    "assistant.why.marketplace": "Большинство компаний не знают, с чего начать в безопасности. Центр решений превращает «я хочу защитить сайт» в конкретный набор проверок с понятными результатами.",
    "assistant.result.marketplace": "Вы получаете именно те проверки, которые закрывают основные риски вашего бизнеса — без лишних инструментов и технических терминов.",
    "assistant.next.marketplace": "Выберите тип инфраструктуры — и мы покажем подходящие проверки. Если не знаете, с чего начать, нажмите «Пока не знаю».",

    // Updated sidebar label
    "sidebar.catalog": "Центр решений",

    // Updated help keys
    "help.marketplace.title": "О Центре решений",
    "help.marketplace.what": "Центр подбора проверок безопасности под задачи вашего бизнеса. Выбираете, что защитить — получаете готовый набор проверок.",
    "help.marketplace.why": "Не нужно разбираться в технологиях. Скажите, что вы хотите защитить, и платформа подберёт оптимальные проверки автоматически.",
    "help.marketplace.result": "Вы получаете набор проверок, которые закрывают основные риски именно вашей инфраструктуры.",
    "help.marketplace.next": "Выбрать, что защитить →",

    // Updated FAQ
    "faq.marketplace.q1": "Как выбрать проверку?",
    "faq.marketplace.a1": "Выберите тип инфраструктуры, которую хотите защитить (сайт, сервер, код и т.д.) — мы покажем подходящие проверки. Если не знаете — нажмите «Пока не знаю», и мы поможем.",
    "faq.marketplace.q2": "Что я получу после проверки?",
    "faq.marketplace.a2": "Список рисков, рекомендации по устранению, понятный отчёт и приоритет исправлений — всё на бизнес-языке, без технических терминов.",
    "faq.marketplace.q3": "Безопасно ли запускать проверки?",
    "faq.marketplace.a3": "Да. Все проверки работают в безопасном режиме и не влияют на работу вашей инфраструктуры. Результаты доступны только вам.",
    "faq.marketplace.q4": "Что делать после подключения проверки?",
    "faq.marketplace.a4": "Платформа автоматически предложит следующий шаг — подключить цель, запустить сканирование и получить отчёт. Вам не нужно искать, что делать дальше.",
    "faq.marketplace.q5": "Могу ли я изменить набор проверок?",
    "faq.marketplace.a5": "Конечно. Вы можете добавить или удалить любую проверку в любой момент. Центр решений лишь рекомендует оптимальный набор — решение за вами.",

    // Updated next steps for marketplace
    "next.marketplace.title": "Что делать дальше",
    "next.marketplace.step1": "Запустить первое сканирование",
    "next.marketplace.step2": "Подключить интеграцию",
    "next.marketplace.step3": "Посмотреть результаты",

    // Category-specific tool descriptions (business language)
    "solutions.tool.nmap.checks": "Обнаруживает открытые порты и работающие сервисы на сервере",
    "solutions.tool.nmap.gets": "Полная карта открытых портов, список активных сервисов и их версии",
    "solutions.tool.nuclei.checks": "Ищет известные уязвимости по базе из 7000+ шаблонов",
    "solutions.tool.nuclei.gets": "Конкретные уязвимости с описанием рисков и ссылками на исправления",
    "solutions.tool.trivy.checks": "Проверяет контейнеры и зависимости на известные уязвимости",
    "solutions.tool.trivy.gets": "Список уязвимых пакетов с приоритетом и версиями для обновления",
    "solutions.tool.semgrep.checks": "Анализирует исходный код на уязвимости и небезопасные паттерны",
    "solutions.tool.semgrep.gets": "Точное указание строк с проблемами и рекомендации по исправлению",
    "solutions.tool.zap.checks": "Тестирует веб-приложения на уязвимости (SQL-инъекции, XSS и другие)",
    "solutions.tool.zap.gets": "Подтверждённые уязвимости с демонстрацией их эксплуатации",
    "solutions.tool.nikto.checks": "Проверяет веб-сервер на ошибки конфигурации и устаревшие версии",
    "solutions.tool.nikto.gets": "Список проблем конфигурации, опасных файлов и устаревших компонентов",

    // Scroll navigation keys update
    "scroll.marketplace.overview": "Центр решений",
    "scroll.marketplace.catalog": "Проверки",
    "scroll.marketplace.community": "Сообщество",
    "scroll.marketplace.faq": "Вопросы",
'''

# ─── New English keys ───
en_new_keys = '''
    // ─── INT-034: Solutions Center ──────────────────────────────────────
    "solutions.title": "Solutions Center",
    "solutions.subtitle": "Choose what to protect — we'll recommend the optimal set of checks",
    "solutions.whatToProtect": "What do you want to protect?",
    "solutions.whatToProtect.desc": "Select your infrastructure type — and we'll show matching checks",

    // Category cards
    "solutions.cat.website": "Website",
    "solutions.cat.website.desc": "Check website",
    "solutions.cat.website.result": "Find vulnerabilities before attackers exploit them",
    "solutions.cat.server": "Server",
    "solutions.cat.server.desc": "Check server",
    "solutions.cat.server.result": "Discover open ports, vulnerable services, and misconfigurations",
    "solutions.cat.repository": "Repository",
    "solutions.cat.repository.desc": "Check code",
    "solutions.cat.repository.result": "Find vulnerabilities in code and dependencies before production",
    "solutions.cat.api": "API",
    "solutions.cat.api.desc": "Check API",
    "solutions.cat.api.result": "Identify insecure endpoints and authorization flaws",
    "solutions.cat.docker": "Docker Containers",
    "solutions.cat.docker.desc": "Check containers",
    "solutions.cat.docker.result": "Find vulnerabilities in images and misconfigurations",
    "solutions.cat.kubernetes": "Kubernetes",
    "solutions.cat.kubernetes.desc": "Check cluster",
    "solutions.cat.kubernetes.result": "Detect insecure pod settings and network policies",
    "solutions.cat.cloud": "Cloud Infrastructure",
    "solutions.cat.cloud.desc": "Check cloud",
    "solutions.cat.cloud.result": "Identify misconfigurations and excessive permissions",
    "solutions.cat.unknown": "Not sure yet",
    "solutions.cat.unknown.desc": "Help me choose",
    "solutions.cat.unknown.result": "Answer a few questions — we'll recommend checks automatically",

    // Recommended solutions
    "solutions.recommended.title": "Recommended Checks",
    "solutions.recommended.subtitle": "Based on your selected infrastructure type",
    "solutions.technologies.label": "Powered by:",
    "solutions.allTools": "All Available Solutions",
    "solutions.changeCategory": "Change type",

    // Wizard
    "solutions.wizard.title": "Not sure where to start?",
    "solutions.wizard.subtitle": "Answer a few questions — we'll recommend checks automatically",
    "solutions.wizard.q1": "Do you have a website?",
    "solutions.wizard.q2": "Do you have a server?",
    "solutions.wizard.q3": "Do you use GitHub or GitLab?",
    "solutions.wizard.q4": "Do you use Docker?",
    "solutions.wizard.result.title": "Your Personalized Check Set",
    "solutions.wizard.result.subtitle": "Based on your answers, we recommend the following checks:",
    "solutions.wizard.restart": "Start over",
    "solutions.wizard.step": "Question {current} of {total}",

    // New generation cards
    "solutions.card.whatChecks": "What it checks",
    "solutions.card.whatYouGet": "What you'll get",
    "solutions.card.technologies": "Technologies used",
    "solutions.card.connect": "Connect",
    "solutions.card.connecting": "Connecting...",
    "solutions.card.connected": "Connected",
    "solutions.card.result.risks": "list of risks",
    "solutions.card.result.recommendations": "recommendations",
    "solutions.card.result.report": "clear report",
    "solutions.card.result.priorities": "fix priorities",
    "solutions.card.back": "Back to solutions",

    // Post-install business messages
    "solutions.installed.serverReady": "Server checks are ready to go.",
    "solutions.installed.websiteReady": "Website checks are configured.",
    "solutions.installed.codeReady": "Code analysis is configured.",
    "solutions.installed.containerReady": "Container checks are ready to go.",
    "solutions.installed.nowCanConnect": "Now you can connect a target and run the first scan.",
    "solutions.installed.nowCanScan": "Now you can run the first scan and get results.",
    "solutions.installed.connectServer": "Connect server",
    "solutions.installed.runScan": "Run scan",
    "solutions.installed.connectRepo": "Connect repository",

    // Next step chain
    "solutions.chain.title": "Next Step",
    "solutions.chain.connectRepo": "Connect repository",
    "solutions.chain.runAnalysis": "Run analysis",
    "solutions.chain.viewResults": "View results",
    "solutions.chain.getReport": "Get report",
    "solutions.chain.fixIssues": "Fix issues",

    // Visual flow
    "flow.solutions.select": "Select check",
    "flow.solutions.connect": "Connect",
    "flow.solutions.scan": "Scan",
    "flow.solutions.report": "Report",
    "flow.solutions.fix": "Fix",
    "flow.solutions.recheck": "Re-check",

    // Business result
    "business.solutionReady.title": "Solution Connected",
    "business.solutionReady.desc": "Your infrastructure security is now transparent and manageable. You know which risks need attention first.",
    "business.checkConfigured.title": "Check Configured",
    "business.checkConfigured.desc": "Future reports will be generated automatically. You'll receive notifications about new risks.",

    // Trust block
    "solutions.trust.title": "Why this particular set?",
    "solutions.trust.reason": "We selected these checks based on your infrastructure type. These are the checks that detect the majority of critical threats for your scenario.",
    "solutions.trust.coverage": "This set covers over 90% of typical attack vectors for your infrastructure type.",

    // Updated marketplace title/subtitle
    "marketplace.title": "Solutions Center",
    "marketplace.subtitle": "Choose what to protect — we'll recommend the optimal set of checks",

    // Updated assistant keys
    "assistant.greeting.marketplace": "You opened the Solutions Center. Here you choose checks based on your business needs — not by tool names.",
    "assistant.what.marketplace": "The Solutions Center helps you choose security checks based on your infrastructure type. No need to understand technologies — just tell us what you want to protect.",
    "assistant.why.marketplace": "Most companies don't know where to start with security. The Solutions Center turns \"I want to protect my website\" into a concrete set of checks with clear results.",
    "assistant.result.marketplace": "You get exactly the checks that cover the main risks for your business — no unnecessary tools or technical jargon.",
    "assistant.next.marketplace": "Select your infrastructure type — we'll show matching checks. Not sure where to start? Click \"Not sure yet\".",

    // Updated sidebar label
    "sidebar.catalog": "Solutions Center",

    // Updated help keys
    "help.marketplace.title": "About Solutions Center",
    "help.marketplace.what": "A center for selecting security checks based on your business needs. Choose what to protect — get a ready-made set of checks.",
    "help.marketplace.why": "No need to understand technologies. Tell us what you want to protect, and the platform will recommend optimal checks automatically.",
    "help.marketplace.result": "You get a set of checks that cover the main risks specific to your infrastructure.",
    "help.marketplace.next": "Choose what to protect →",

    // Updated FAQ
    "faq.marketplace.q1": "How do I choose a check?",
    "faq.marketplace.a1": "Select the type of infrastructure you want to protect (website, server, code, etc.) — we'll show matching checks. Not sure? Click \"Not sure yet\" and we'll help.",
    "faq.marketplace.q2": "What will I get after a check?",
    "faq.marketplace.a2": "A list of risks, remediation recommendations, a clear report, and fix priorities — all in business language, no technical jargon.",
    "faq.marketplace.q3": "Is it safe to run checks?",
    "faq.marketplace.a3": "Yes. All checks run in safe mode and don't affect your infrastructure. Results are available only to you.",
    "faq.marketplace.q4": "What should I do after connecting a check?",
    "faq.marketplace.a4": "The platform will automatically suggest the next step — connect a target, run a scan, and get a report. You don't need to figure out what's next.",
    "faq.marketplace.q5": "Can I change the set of checks?",
    "faq.marketplace.a5": "Of course. You can add or remove any check at any time. The Solutions Center only recommends an optimal set — the decision is yours.",

    // Updated next steps
    "next.marketplace.title": "What to Do Next",
    "next.marketplace.step1": "Run your first scan",
    "next.marketplace.step2": "Connect an integration",
    "next.marketplace.step3": "View results",

    // Category-specific tool descriptions
    "solutions.tool.nmap.checks": "Discovers open ports and running services on the server",
    "solutions.tool.nmap.gets": "Complete map of open ports, list of active services and their versions",
    "solutions.tool.nuclei.checks": "Scans for known vulnerabilities using 7000+ templates",
    "solutions.tool.nuclei.gets": "Specific vulnerabilities with risk descriptions and links to fixes",
    "solutions.tool.trivy.checks": "Checks containers and dependencies for known vulnerabilities",
    "solutions.tool.trivy.gets": "List of vulnerable packages with priority and update versions",
    "solutions.tool.semgrep.checks": "Analyzes source code for vulnerabilities and unsafe patterns",
    "solutions.tool.semgrep.gets": "Exact line numbers with issues and remediation recommendations",
    "solutions.tool.zap.checks": "Tests web applications for vulnerabilities (SQL injection, XSS, and more)",
    "solutions.tool.zap.gets": "Confirmed vulnerabilities with proof of exploitation",
    "solutions.tool.nikto.checks": "Checks web server for misconfigurations and outdated versions",
    "solutions.tool.nikto.gets": "List of configuration issues, dangerous files, and outdated components",

    // Scroll navigation keys update
    "scroll.marketplace.overview": "Solutions Center",
    "scroll.marketplace.catalog": "Checks",
    "scroll.marketplace.community": "Community",
    "scroll.marketplace.faq": "FAQ",
'''

# ─── Insert RU keys before the closing of ru: block ───
# Find the last key in the ru block before the closing brace
ru_insert_marker = '    "scroll.arch.deployment": "Варианты развёртывания",\n'
if ru_insert_marker in content:
    content = content.replace(
        ru_insert_marker,
        ru_insert_marker + ru_new_keys + '\n'
    )
    print("✅ RU keys inserted successfully")
else:
    print("❌ Could not find RU insert marker")
    # Try alternative: find the line before the closing of ru: {}
    # The ru block ends with "  }," before "en: {"
    pass

# ─── Insert EN keys before the closing of en: block ───
# Find a marker in the en block - the architecture section
en_insert_marker = '    "scroll.arch.deployment": "Deployment Options",\n'
if en_insert_marker in content:
    content = content.replace(
        en_insert_marker,
        en_insert_marker + en_new_keys + '\n'
    )
    print("✅ EN keys inserted successfully")
else:
    print("❌ Could not find EN insert marker")

# ─── Also update existing keys that need to change ───
# The new keys above already override the old marketplace.title, marketplace.subtitle, etc.
# because they appear later in the object. But let's also update some existing ones directly:

existing_updates = {
    # Nav
    '"nav.marketplace": "Каталог инструментов"': '"nav.marketplace": "Центр решений"',
    '"nav.marketplace": "Tool Catalog"': '"nav.marketplace": "Solutions Center"',
    # Pricing
    '"pricing2.feature.marketplace": "Каталог инструментов"': '"pricing2.feature.marketplace": "Центр решений"',
    '"pricing2.feature.marketplace": "Tool Catalog"': '"pricing2.feature.marketplace": "Solutions Center"',
    # Docs
    '"docs.mp.browsing.desc": "How to find, evaluate, and install extensions from the marketplace."':
        '"docs.mp.browsing.desc": "How to find, evaluate, and install security checks from the Solutions Center."',
}

for old, new in existing_updates.items():
    if old in content:
        content = content.replace(old, new)
        print(f"  Updated: {old[:50]}...")
    else:
        print(f"  Not found: {old[:50]}...")

with open(I18N_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ i18n.ts updated successfully!")
