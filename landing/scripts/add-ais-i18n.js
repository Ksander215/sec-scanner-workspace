/**
 * Script to add AIS i18n keys to the i18n.ts file
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find the EN section start
const enSectionMatch = content.match(/\n  en: \{/);
if (!enSectionMatch) {
  console.error('Could not find EN section');
  process.exit(1);
}

const enSectionStart = enSectionMatch.index;

// ─── AIS RU keys ──────────────────────────────────────────────────────────

const aisRuKeys = `
    // ─── AIS — Adaptive Intelligence System (INT-036) ─────────────────
    "ais.assistant.label": "ВАШ ПОМОЩНИК",
    "ais.assistant.title": "Интеллектуальный помощник",
    "ais.assistant.description": "Платформа понимает вас и помогает двигаться дальше",

    // Greeting by role
    "ais.greeting.default": "Здравствуйте! Чем могу помочь?",
    "ais.greeting.executive": "Добрый день. Безопасность компании под контролем.",
    "ais.greeting.engineer": "Привет! Готов к работе.",

    // Tabs
    "ais.tab.guide": "Навигация",
    "ais.tab.goal": "Цель",
    "ais.tab.confidence": "Уверенность",

    // Role labels
    "ais.role.unknown": "Определяем ваш профиль...",
    "ais.role.ceo": "Руководитель",
    "ais.role.cto": "Технический директор",
    "ais.role.devops": "DevOps-инженер",
    "ais.role.devsecops": "DevSecOps-инженер",
    "ais.role.developer": "Разработчик",
    "ais.role.analyst": "Аналитик",
    "ais.role.pentester": "Пентестер",

    // Proactive tips
    "ais.tip.later": "Позже",
    "ais.tip.reports.title": "В этом разделе формируются отчеты для руководства и технической команды.",
    "ais.tip.reports.desc": "Вы можете генерировать отчеты в разных форматах и отправлять их коллегам.",
    "ais.tip.reports.action": "Посмотреть пример",
    "ais.tip.scanner.title": "Здесь вы запускаете проверки безопасности инфраструктуры.",
    "ais.tip.scanner.desc": "Начните с проверки веб-сайта — это самый быстрый способ получить первые результаты.",
    "ais.tip.scanner.action": "Начать проверку",
    "ais.tip.findings.title": "Здесь отображаются результаты проверок — направления, которые требуют внимания.",
    "ais.tip.findings.desc": "Каждое направление сопровождается рекомендацией и оценкой времени устранения.",
    "ais.tip.findings.action": "Обзор направлений",
    "ais.tip.integrations.title": "Подключите инструменты, которые вы уже используете — и SIP начнёт работать с ними.",
    "ais.tip.integrations.desc": "GitHub, SSH-серверы, облачные платформы — все в одном месте.",
    "ais.tip.integrations.action": "Подключить",
    "ais.tip.marketplace.title": "Выберите задачу безопасности, и Центр решений подберёт подходящие инструменты.",
    "ais.tip.marketplace.desc": "Вам не нужно разбираться в инструментах — просто укажите, что нужно защитить.",
    "ais.tip.marketplace.action": "Выбрать задачу",
    "ais.tip.dashboard.title": "Добро пожаловать! Давайте начнём с первой проверки безопасности.",
    "ais.tip.dashboard.desc": "Это займёт несколько минут, но вы сразу увидите картину безопасности компании.",
    "ais.tip.dashboard.action": "Начать",
    "ais.tip.repositories.title": "Подключите репозитории кода для автоматической проверки безопасности.",
    "ais.tip.repositories.desc": "SIP найдёт уязвимости в коде и покажет, что нужно исправить в первую очередь.",
    "ais.tip.repositories.action": "Подключить репозиторий",
    "ais.tip.architecture.title": "Здесь отображается архитектура безопасности вашей инфраструктуры.",
    "ais.tip.architecture.desc": "Карта поможет визуально оценить покрытие и найти слабые места.",
    "ais.tip.architecture.action": "Открыть карту",

    // Guide tab
    "ais.guide.currentPage": "Текущий раздел",
    "ais.guide.favorites": "Часто используемые разделы",

    // Trust Builder (BLOCK 13)
    "ais.trust.title": "Что важно знать",
    "ais.trust.whatHappened": "Что произошло",
    "ais.trust.whyImportant": "Почему это важно",
    "ais.trust.whatChanged": "Что изменилось",
    "ais.trust.whatNext": "Что делать дальше",
    "ais.trust.default.whatHappened": "Вы находитесь в разделе управления безопасностью.",
    "ais.trust.default.whyImportant": "Каждое действие здесь повышает прозрачность безопасности компании.",
    "ais.trust.default.whatChanged": "Состояние инфраструктуры стало более прозрачным.",
    "ais.trust.default.whatNext": "Начать проверку безопасности",

    // Goals (BLOCK 6)
    "ais.goal.label": "ЦЕЛЬ",
    "ais.goal.fullControl": "Получить полный контроль над безопасностью компании",
    "ais.goal.transparency": "Сделать безопасность компании прозрачной",
    "ais.goal.secureCode": "Обеспечить безопасность кода",
    "ais.goal.fullAudit": "Провести полный аудит безопасности",
    "ais.goal.complete": "Цель достигнута!",
    "ais.goal.next.scan": "Запустить первую проверку",
    "ais.goal.next.integrations": "Подключить интеграции",
    "ais.goal.next.findings": "Обзор направлений внимания",
    "ais.goal.next.reports": "Создать отчёт",
    "ais.goal.next.recommendations": "Следовать рекомендациям",
    "ais.goal.next.optimize": "Оптимизировать процессы",
    "ais.goal.next.dashboard": "Обзор состояния",
    "ais.goal.next.repositories": "Подключить репозитории",
    "ais.goal.next.scanner": "Запустить сканер",
    "ais.goal.achievements": "Достижения",
    "ais.goal.stat.scans": "Проверок",
    "ais.goal.stat.integrations": "Интеграций",
    "ais.goal.stat.reports": "Отчётов",

    // Confidence Engine (BLOCK 14)
    "ais.confidence.factors": "Факторы уверенности",
    "ais.confidence.factor.scans": "Проверки выполнены",
    "ais.confidence.factor.integrations": "Интеграции подключены",
    "ais.confidence.factor.findings": "Направления проверены",
    "ais.confidence.factor.recommendations": "Рекомендации выполнены",
    "ais.confidence.factor.reports": "Отчёты созданы",

    // Confidence narratives — general
    "ais.confidence.narrative.veryHigh": "Вы полностью контролируете безопасность компании. Все основные процессы настроены и работают.",
    "ais.confidence.narrative.high": "Вы уже автоматизировали большую часть процессов контроля. Осталось подключить ещё пару интеграций для полной картины.",
    "ais.confidence.narrative.good": "Хорошая основа заложена. Продолжайте выполнять рекомендации — и контроль будет расти.",
    "ais.confidence.narrative.needsAttention": "Безопасность компании нуждается во внимании. Начните с проверки и подключения основных интеграций.",
    "ais.confidence.narrative.low": "Рекомендуем начать с первой проверки безопасности — это откроет картину текущего состояния.",

    // Confidence narratives — CEO
    "ais.confidence.narrative.ceo.veryHigh": "Безопасность компании полностью прозрачна. Вы получаете полную картину и контроль.",
    "ais.confidence.narrative.ceo.high": "Безопасность компании стала значительно прозрачнее. Ещё пара шагов — и контроль будет полным.",
    "ais.confidence.narrative.ceo.good": "Основные процессы безопасности настроены. Рекомендуем продолжить подключение интеграций.",
    "ais.confidence.narrative.ceo.needsAttention": "Рекомендуем обратить внимание на безопасность. Начните с проверки ключевых активов.",
    "ais.confidence.narrative.ceo.low": "Безопасность компании пока недостаточно прозрачна. Первая проверка откроет картину.",

    // Confidence next steps
    "ais.confidence.next.scan": "Запустить первую проверку",
    "ais.confidence.next.integrations": "Подключить интеграции",
    "ais.confidence.next.findings": "Проверить направления внимания",
    "ais.confidence.next.reports": "Создать отчёт",
    "ais.confidence.next.marketplace": "Настроить инструменты",
    "ais.confidence.next.optimize": "Оптимизировать процессы",

    // Context Predictions (BLOCK 12)
    "ais.prediction.reports.share": "Похоже, вы хотите поделиться отчётом.",
    "ais.prediction.reports.email": "Отправить по Email",
    "ais.prediction.reports.telegram": "Отправить в Telegram",
    "ais.prediction.dashboard.firstScan": "Начните с первой проверки — это займёт несколько минут.",
    "ais.prediction.dashboard.startScan": "Запустить проверку",
    "ais.prediction.findings.review": "У вас есть непроверенные направления. Рассмотрите их.",
    "ais.prediction.findings.startReview": "Начать проверку",
    "ais.prediction.integrations.first": "Подключите инструменты для полной картины безопасности.",
    "ais.prediction.integrations.connect": "Подключить",
    "ais.prediction.marketplace.first": "Установите первый инструмент для начала работы.",
    "ais.prediction.marketplace.install": "Выбрать инструмент",
    "ais.prediction.scanner.report": "Проверка завершена. Создайте отчёт для команды.",
    "ais.prediction.scanner.generateReport": "Создать отчёт",
    "ais.prediction.repositories.connect": "Подключите репозитории для проверки кода.",
    "ais.prediction.repositories.addGit": "Подключить GitHub",
    "ais.prediction.default": "Продолжить",

    // AI Executive Summary (BLOCK 11)
    "ais.summary.hasIssues": "Проверка завершена. Безопасность стала более прозрачной.",
    "ais.summary.clean": "Проверка завершена. Серьёзных направлений внимания не обнаружено.",
    "ais.summary.executive.hasIssues": "Безопасность компании стала более прозрачной. Обнаружены направления, которые рекомендуется проверить.",
    "ais.summary.executive.clean": "Безопасность компании под контролем. Критических рисков не обнаружено.",
    "ais.summary.stat.findings": "Направлений",
    "ais.summary.stat.attentionPoints": "Точек внимания",
    "ais.summary.stat.highPriority": "Высокий приоритет",
    "ais.summary.stat.businessRisk": "Риск для бизнеса",
    "ais.summary.stat.estimatedTime": "мин. устранения",
    "ais.summary.contextualized": "Из {total} найденных направлений только {priority} требуют первоочередного внимания.",
    "ais.summary.whatChanged": "Что изменилось",
    "ais.summary.transparencyImproved": "Состояние инфраструктуры стало более прозрачным.",
    "ais.summary.fullyTransparent": "Инфраструктура полностью прозрачна — вы видите всю картину.",
    "ais.summary.reviewPriority": "Проверить приоритеты",
    "ais.summary.generateReport": "Создать отчёт",

    // Solo Notifications (BLOCK 4)
    "ais.notification.system": "СИСТЕМА",
    "ais.notification.achievement": "ПРОГРЕСС",
    "ais.notification.ai": "ПОМОЩНИК",
`;

// ─── AIS EN keys ──────────────────────────────────────────────────────────

const aisEnKeys = `
    // ─── AIS — Adaptive Intelligence System (INT-036) ─────────────────
    "ais.assistant.label": "YOUR ASSISTANT",
    "ais.assistant.title": "Intelligent Assistant",
    "ais.assistant.description": "The platform understands you and helps you move forward",

    // Greeting by role
    "ais.greeting.default": "Hello! How can I help?",
    "ais.greeting.executive": "Good day. Company security is under control.",
    "ais.greeting.engineer": "Hey! Ready to work.",

    // Tabs
    "ais.tab.guide": "Guide",
    "ais.tab.goal": "Goal",
    "ais.tab.confidence": "Confidence",

    // Role labels
    "ais.role.unknown": "Detecting your profile...",
    "ais.role.ceo": "Executive",
    "ais.role.cto": "CTO",
    "ais.role.devops": "DevOps Engineer",
    "ais.role.devsecops": "DevSecOps Engineer",
    "ais.role.developer": "Developer",
    "ais.role.analyst": "Analyst",
    "ais.role.pentester": "Pentester",

    // Proactive tips
    "ais.tip.later": "Later",
    "ais.tip.reports.title": "This section generates reports for leadership and technical teams.",
    "ais.tip.reports.desc": "You can generate reports in different formats and share them with colleagues.",
    "ais.tip.reports.action": "See example",
    "ais.tip.scanner.title": "Here you launch security checks on your infrastructure.",
    "ais.tip.scanner.desc": "Start with a website scan — it's the quickest way to get your first results.",
    "ais.tip.scanner.action": "Start scan",
    "ais.tip.findings.title": "Here you see check results — areas that need attention.",
    "ais.tip.findings.desc": "Each finding comes with a recommendation and estimated fix time.",
    "ais.tip.findings.action": "Review findings",
    "ais.tip.integrations.title": "Connect tools you already use — SIP will work with them seamlessly.",
    "ais.tip.integrations.desc": "GitHub, SSH servers, cloud platforms — all in one place.",
    "ais.tip.integrations.action": "Connect",
    "ais.tip.marketplace.title": "Choose a security task and the Solutions Center will find the right tools.",
    "ais.tip.marketplace.desc": "No need to understand tools — just tell us what you want to protect.",
    "ais.tip.marketplace.action": "Choose a task",
    "ais.tip.dashboard.title": "Welcome! Let us start with your first security check.",
    "ais.tip.dashboard.desc": "It takes a few minutes, and you will immediately see the security picture.",
    "ais.tip.dashboard.action": "Get started",
    "ais.tip.repositories.title": "Connect code repositories for automatic security scanning.",
    "ais.tip.repositories.desc": "SIP will find vulnerabilities in code and show what to fix first.",
    "ais.tip.repositories.action": "Connect repository",
    "ais.tip.architecture.title": "Here you see the security architecture of your infrastructure.",
    "ais.tip.architecture.desc": "The map helps visually assess coverage and find weak spots.",
    "ais.tip.architecture.action": "Open map",

    // Guide tab
    "ais.guide.currentPage": "Current section",
    "ais.guide.favorites": "Frequently used sections",

    // Trust Builder (BLOCK 13)
    "ais.trust.title": "What you should know",
    "ais.trust.whatHappened": "What happened",
    "ais.trust.whyImportant": "Why it matters",
    "ais.trust.whatChanged": "What changed",
    "ais.trust.whatNext": "What to do next",
    "ais.trust.default.whatHappened": "You are in the security management section.",
    "ais.trust.default.whyImportant": "Every action here increases the transparency of company security.",
    "ais.trust.default.whatChanged": "Infrastructure visibility has improved.",
    "ais.trust.default.whatNext": "Start a security check",

    // Goals (BLOCK 6)
    "ais.goal.label": "GOAL",
    "ais.goal.fullControl": "Gain full control over company security",
    "ais.goal.transparency": "Make company security transparent",
    "ais.goal.secureCode": "Ensure code security",
    "ais.goal.fullAudit": "Conduct a full security audit",
    "ais.goal.complete": "Goal achieved!",
    "ais.goal.next.scan": "Launch first scan",
    "ais.goal.next.integrations": "Connect integrations",
    "ais.goal.next.findings": "Review attention areas",
    "ais.goal.next.reports": "Create a report",
    "ais.goal.next.recommendations": "Follow recommendations",
    "ais.goal.next.optimize": "Optimize processes",
    "ais.goal.next.dashboard": "Overview status",
    "ais.goal.next.repositories": "Connect repositories",
    "ais.goal.next.scanner": "Launch scanner",
    "ais.goal.achievements": "Achievements",
    "ais.goal.stat.scans": "Scans",
    "ais.goal.stat.integrations": "Integrations",
    "ais.goal.stat.reports": "Reports",

    // Confidence Engine (BLOCK 14)
    "ais.confidence.factors": "Confidence factors",
    "ais.confidence.factor.scans": "Scans completed",
    "ais.confidence.factor.integrations": "Integrations connected",
    "ais.confidence.factor.findings": "Findings reviewed",
    "ais.confidence.factor.recommendations": "Recommendations followed",
    "ais.confidence.factor.reports": "Reports generated",

    // Confidence narratives — general
    "ais.confidence.narrative.veryHigh": "You have full control over company security. All major processes are configured and running.",
    "ais.confidence.narrative.high": "You have automated most control processes. Connect a couple more integrations for the full picture.",
    "ais.confidence.narrative.good": "A solid foundation is in place. Keep following recommendations and control will grow.",
    "ais.confidence.narrative.needsAttention": "Company security needs attention. Start with scanning and connecting core integrations.",
    "ais.confidence.narrative.low": "We recommend starting with your first security check — it will reveal the current state.",

    // Confidence narratives — CEO
    "ais.confidence.narrative.ceo.veryHigh": "Company security is fully transparent. You have the complete picture and control.",
    "ais.confidence.narrative.ceo.high": "Company security has become significantly more transparent. A couple more steps for full control.",
    "ais.confidence.narrative.ceo.good": "Core security processes are set up. We recommend continuing to connect integrations.",
    "ais.confidence.narrative.ceo.needsAttention": "We recommend paying attention to security. Start by checking key assets.",
    "ais.confidence.narrative.ceo.low": "Company security is not yet transparent enough. The first check will open the picture.",

    // Confidence next steps
    "ais.confidence.next.scan": "Launch first scan",
    "ais.confidence.next.integrations": "Connect integrations",
    "ais.confidence.next.findings": "Review attention areas",
    "ais.confidence.next.reports": "Create a report",
    "ais.confidence.next.marketplace": "Set up tools",
    "ais.confidence.next.optimize": "Optimize processes",

    // Context Predictions (BLOCK 12)
    "ais.prediction.reports.share": "Looks like you want to share a report.",
    "ais.prediction.reports.email": "Send via Email",
    "ais.prediction.reports.telegram": "Send via Telegram",
    "ais.prediction.dashboard.firstScan": "Start with your first scan — it takes a few minutes.",
    "ais.prediction.dashboard.startScan": "Launch scan",
    "ais.prediction.findings.review": "You have unreviewed findings. Take a look.",
    "ais.prediction.findings.startReview": "Start review",
    "ais.prediction.integrations.first": "Connect tools for the complete security picture.",
    "ais.prediction.integrations.connect": "Connect",
    "ais.prediction.marketplace.first": "Install your first tool to get started.",
    "ais.prediction.marketplace.install": "Choose a tool",
    "ais.prediction.scanner.report": "Scan complete. Create a report for the team.",
    "ais.prediction.scanner.generateReport": "Create report",
    "ais.prediction.repositories.connect": "Connect repositories for code scanning.",
    "ais.prediction.repositories.addGit": "Connect GitHub",
    "ais.prediction.default": "Continue",

    // AI Executive Summary (BLOCK 11)
    "ais.summary.hasIssues": "Check complete. Security visibility has improved.",
    "ais.summary.clean": "Check complete. No serious attention areas found.",
    "ais.summary.executive.hasIssues": "Company security visibility has improved. Areas were found that should be reviewed.",
    "ais.summary.executive.clean": "Company security is under control. No critical risks detected.",
    "ais.summary.stat.findings": "Findings",
    "ais.summary.stat.attentionPoints": "Attention points",
    "ais.summary.stat.highPriority": "High priority",
    "ais.summary.stat.businessRisk": "Business risk",
    "ais.summary.stat.estimatedTime": "min. to fix",
    "ais.summary.contextualized": "Out of {total} findings, only {priority} require immediate attention.",
    "ais.summary.whatChanged": "What changed",
    "ais.summary.transparencyImproved": "Infrastructure visibility has improved.",
    "ais.summary.fullyTransparent": "Infrastructure is fully transparent — you see the complete picture.",
    "ais.summary.reviewPriority": "Review priorities",
    "ais.summary.generateReport": "Generate report",

    // Solo Notifications (BLOCK 4)
    "ais.notification.system": "SYSTEM",
    "ais.notification.achievement": "PROGRESS",
    "ais.notification.ai": "ASSISTANT",
`;

// Insert RU keys before EN section
// Find the last line before "  en: {"
const beforeEn = content.lastIndexOf('\n', enSectionStart - 1);
const ruInsertPoint = beforeEn + 1;

content = content.slice(0, ruInsertPoint) + aisRuKeys + '\n' + content.slice(ruInsertPoint);

// Recalculate EN position since we inserted content
const updatedEnStart = content.indexOf('  en: {');

// Find the closing of the EN object
let braceCount = 0;
let enEndPos = -1;
for (let i = content.indexOf('{', updatedEnStart); i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      enEndPos = i;
      break;
    }
  }
}

if (enEndPos === -1) {
  console.error('Could not find EN section end');
  process.exit(1);
}

// Find the last key in EN section before the closing brace
const lastNewline = content.lastIndexOf('\n', enEndPos);
const enInsertPoint = lastNewline + 1;

content = content.slice(0, enInsertPoint) + aisEnKeys + '\n' + content.slice(enInsertPoint);

fs.writeFileSync(filePath, content, 'utf8');
console.log('AIS i18n keys added successfully!');
