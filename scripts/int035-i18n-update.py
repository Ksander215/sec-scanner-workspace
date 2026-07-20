#!/usr/bin/env python3
"""INT-035: Add confidence-driven UX keys to i18n.ts"""
import re

I18N_PATH = "/home/z/my-project/landing/src/lib/i18n.ts"

with open(I18N_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# New RU keys
ru_new = '''
    // ─── INT-035: Confidence-Driven UX ──────────────────────────────────
    // Confidence Score (BLOCK 7)
    "confidence.outOf": "из 100",
    "confidence.level.veryHigh": "Очень высокий",
    "confidence.level.veryHigh.desc": "Ваша инфраструктура под надёжным контролем. Критических рисков не обнаружено.",
    "confidence.level.high": "Высокий",
    "confidence.level.high.desc": "Уровень защиты высокий. Рекомендуется обратить внимание на несколько направлений.",
    "confidence.level.good": "Хороший",
    "confidence.level.good.desc": "Базовая защита настроена. Есть возможности для усиления контроля.",
    "confidence.level.needsAttention": "Требует внимания",
    "confidence.level.needsAttention.desc": "Обнаружены направления, которым рекомендуется уделить внимание в ближайшее время.",
    "confidence.level.low": "Низкий",
    "confidence.level.low.desc": "Рекомендуется начать с подключения проверок и запуска первого анализа.",
    "confidence.fixed": "устранено",
    "confidence.coverage": "покрытие",
    "confidence.integrations": "интеграций",
    "confidence.automated": "автоматизировано",

    // What Changed (BLOCK 2)
    "confidence.whatChanged.nowCan": "Теперь платформа может:",
    "confidence.whatChanged.nowAvailable": "Теперь доступны:",
    "confidence.whatChanged.nowKnown": "Теперь известно:",
    "confidence.whatChanged.afterGithub": "анализировать изменения кода",
    "confidence.whatChanged.afterGithub.2": "находить уязвимые зависимости",
    "confidence.whatChanged.afterGithub.3": "проверять секреты в коде",
    "confidence.whatChanged.afterGithub.4": "отслеживать изменения безопасности",
    "confidence.whatChanged.afterSsh": "аудит сервера",
    "confidence.whatChanged.afterSsh.2": "проверку конфигурации",
    "confidence.whatChanged.afterSsh.3": "анализ открытых сервисов",
    "confidence.whatChanged.afterScan": "какие риски существуют",
    "confidence.whatChanged.afterScan.2": "какие системы требуют внимания",
    "confidence.whatChanged.afterScan.3": "какие действия рекомендуются",
    "confidence.whatChanged.afterRepo": "отслеживать изменения в коде автоматически",
    "confidence.whatChanged.afterRepo.2": "проверять новые коммиты на наличие проблем",
    "confidence.whatChanged.afterRepo.3": "анализировать зависимости на уязвимости",

    // Executive Summary (BLOCK 5)
    "confidence.summary.checked": "Сегодня проверено",
    "confidence.summary.conclusion": "Основные выводы",
    "confidence.summary.noCritical": "Критических угроз не обнаружено. Инфраструктура под контролем.",
    "confidence.summary.someAttention": "Обнаружено несколько направлений, которым рекомендуется уделить внимание.",
    "confidence.summary.allGood": "Все проверенные системы работают корректно. Уровень контроля высокий.",
    "confidence.summary.infrastructure": "инфраструктура",
    "confidence.summary.servers": "серверы",
    "confidence.summary.repositories": "репозитории",
    "confidence.summary.dependencies": "зависимости",
    "confidence.summary.containers": "контейнеры",
    "confidence.summary.code": "код",

    // Priority Language (BLOCK 3)
    "confidence.priority.high": "Высокий приоритет",
    "confidence.priority.medium": "Средний приоритет",
    "confidence.priority.low": "Низкий приоритет",
    "confidence.priority.recommended": "Рекомендуется выполнить",
    "confidence.priority.worthAttention": "Стоит обратить внимание",
    "confidence.priority.desirable": "Желательно устранить",

    // Cost of Solution (BLOCK 6)
    "confidence.cost.ofTotal": "Из {total} найденных проблем только {critical} требуют первоочередного внимания.",
    "confidence.cost.mostMinor": "Большинство найденных замечаний имеют низкий приоритет и могут устраняться постепенно.",
    "confidence.cost.fewImportant": "Требуется внимание к нескольким важным направлениям. Остальное можно устранять в плановом порядке.",
    "confidence.cost.allManaged": "Все обнаруженные проблемы контролируются. Рекомендации по улучшению доступны в отчёте.",

    // Why Important (BLOCK 9)
    "confidence.whyImportant": "Почему это важно",
    "confidence.why.scanner": "Регулярная проверка помогает обнаружить изменения раньше, чем они перерастут в серьёзную проблему.",
    "confidence.why.repositories": "Контроль репозиториев снижает риск попадания ошибок и секретов в рабочую среду.",
    "confidence.why.ssh": "Безопасный доступ позволяет централизованно управлять серверами без компрометации учётных данных.",
    "confidence.why.reports": "Отчёты помогают руководству принимать решения на основе актуальной информации.",
    "confidence.why.findings": "Понимание обнаруженных проблем позволяет расставить приоритеты и действовать целенаправленно.",
    "confidence.why.integrations": "Интеграции автоматизируют процессы и снижают вероятность человеческой ошибки.",
    "confidence.why.apiKeys": "API-ключи позволяют безопасно подключать внешние системы без передачи паролей.",
    "confidence.why.notifications": "Уведомления помогают реагировать на изменения вовремя, не проверяя платформу вручную.",
    "confidence.why.marketplace": "Центр решений помогает подобрать именно те проверки, которые закрывают риски вашего бизнеса.",

    // Company Progress (BLOCK 8)
    "confidence.progress.title": "За последний месяц",
    "confidence.progress.fixedIssues": "замечаний устранено",
    "confidence.progress.closedPaths": "потенциальных путей атаки закрыто",
    "confidence.progress.connectedIntegrations": "интеграций подключено",
    "confidence.progress.automatedChecks": "проверок автоматизировано",
    "confidence.progress.controlGrown": "уровень контроля вырос",
    "confidence.progress.trendUp": "Уровень контроля над безопасностью продолжает расти.",

    // Terminology replacements (BLOCK 10)
    "confidence.term.needsAttention": "Что требует внимания",
    "confidence.term.improvementAreas": "Области для улучшения",
    "confidence.term.controlLevel": "Текущий уровень контроля",
    "confidence.term.entryPoints": "Доступные точки входа",
    "confidence.term.findingsOverview": "Обзор обнаруженного",
    "confidence.term.recommendations": "Рекомендации",

    // New business result types
    "business.repoConnected.title": "Репозиторий подключён",
    "business.repoConnected.desc": "Теперь платформа может автоматически отслеживать изменения в коде и проверять новые коммиты.",
    "business.serverConnected.title": "Сервер подключён",
    "business.serverConnected.desc": "Теперь доступен удалённый аудит сервера, проверка конфигурации и анализ открытых сервисов.",
    "business.integrationReady.title": "Интеграция настроена",
    "business.integrationReady.desc": "Теперь данные будут поступать автоматически, а уведомления — вовремя.",
    "business.analysisComplete.title": "Анализ завершён",
    "business.analysisComplete.desc": "Теперь состояние инфраструктуры стало более прозрачным. Рекомендации доступны в отчёте.",

    // Updated toast messages (BLOCK 11 — never just "Done"/"Success")
    "toast.scanComplete": "Проверка завершена. Состояние инфраструктуры стало более прозрачным.",
    "toast.installed": "Решение подключено и готово к работе.",
    "toast.exportComplete": "Экспорт готов. Данные доступны для использования.",
    "toast.reportGenerated": "Отчёт сформирован. Теперь у вас есть полная картина для принятия решений.",
    "toast.saved": "Изменения сохранены. Настройки применены.",
    "toast.connected": "Подключение выполнено. Платформа получила новые возможности.",

    // Findings with solutions (BLOCK 4)
    "confidence.finding.whatHappened": "Что произошло",
    "confidence.finding.whyImportant": "Почему это важно",
    "confidence.finding.ifIgnored": "Что будет, если ничего не делать",
    "confidence.finding.recommendation": "Что рекомендуется сделать",
    "confidence.finding.timeEstimate": "Сколько времени это займёт",
    "confidence.finding.afterFix": "Какой эффект будет после исправления",

    // Calm principle (BLOCK 11)
    "confidence.calm.scanComplete": "Проверка завершена. Теперь вы лучше понимаете состояние инфраструктуры.",
    "confidence.calm.toolInstalled": "Проверка подключена. Теперь можно запустить анализ и получить результаты.",
    "confidence.calm.projectCreated": "Проект создан. Теперь можно добавить цели и запустить первые проверки.",
    "confidence.calm.repoConnected": "Репозиторий подключён. Теперь изменения в коде отслеживаются автоматически.",
    "confidence.calm.reportGenerated": "Отчёт готов. Теперь у вас есть понятная картина для принятия решений.",
    "confidence.calm.settingsSaved": "Настройки применены. Платформа адаптирована под ваши предпочтения.",
'''

# New EN keys
en_new = '''
    // ─── INT-035: Confidence-Driven UX ──────────────────────────────────
    // Confidence Score (BLOCK 7)
    "confidence.outOf": "out of 100",
    "confidence.level.veryHigh": "Very High",
    "confidence.level.veryHigh.desc": "Your infrastructure is under reliable control. No critical risks detected.",
    "confidence.level.high": "High",
    "confidence.level.high.desc": "Protection level is high. A few areas could use attention.",
    "confidence.level.good": "Good",
    "confidence.level.good.desc": "Basic protection is in place. There are opportunities to strengthen control.",
    "confidence.level.needsAttention": "Needs Attention",
    "confidence.level.needsAttention.desc": "Several areas have been found that warrant attention in the near future.",
    "confidence.level.low": "Low",
    "confidence.level.low.desc": "We recommend starting by connecting checks and running your first analysis.",
    "confidence.fixed": "fixed",
    "confidence.coverage": "coverage",
    "confidence.integrations": "integrations",
    "confidence.automated": "automated",

    // What Changed (BLOCK 2)
    "confidence.whatChanged.nowCan": "Now the platform can:",
    "confidence.whatChanged.nowAvailable": "Now available:",
    "confidence.whatChanged.nowKnown": "Now you know:",
    "confidence.whatChanged.afterGithub": "analyze code changes",
    "confidence.whatChanged.afterGithub.2": "find vulnerable dependencies",
    "confidence.whatChanged.afterGithub.3": "check for secrets in code",
    "confidence.whatChanged.afterGithub.4": "track security changes",
    "confidence.whatChanged.afterSsh": "server audit",
    "confidence.whatChanged.afterSsh.2": "configuration check",
    "confidence.whatChanged.afterSsh.3": "open service analysis",
    "confidence.whatChanged.afterScan": "what risks exist",
    "confidence.whatChanged.afterScan.2": "which systems need attention",
    "confidence.whatChanged.afterScan.3": "what actions are recommended",
    "confidence.whatChanged.afterRepo": "track code changes automatically",
    "confidence.whatChanged.afterRepo.2": "check new commits for issues",
    "confidence.whatChanged.afterRepo.3": "analyze dependencies for vulnerabilities",

    // Executive Summary (BLOCK 5)
    "confidence.summary.checked": "Checked today",
    "confidence.summary.conclusion": "Key takeaways",
    "confidence.summary.noCritical": "No critical threats detected. Infrastructure is under control.",
    "confidence.summary.someAttention": "Several areas have been found that warrant attention.",
    "confidence.summary.allGood": "All checked systems are operating correctly. Control level is high.",
    "confidence.summary.infrastructure": "infrastructure",
    "confidence.summary.servers": "servers",
    "confidence.summary.repositories": "repositories",
    "confidence.summary.dependencies": "dependencies",
    "confidence.summary.containers": "containers",
    "confidence.summary.code": "code",

    // Priority Language (BLOCK 3)
    "confidence.priority.high": "High Priority",
    "confidence.priority.medium": "Medium Priority",
    "confidence.priority.low": "Low Priority",
    "confidence.priority.recommended": "Recommended",
    "confidence.priority.worthAttention": "Worth Attention",
    "confidence.priority.desirable": "Desirable to Fix",

    // Cost of Solution (BLOCK 6)
    "confidence.cost.ofTotal": "Out of {total} issues found, only {critical} require immediate attention.",
    "confidence.cost.mostMinor": "Most of the findings are low priority and can be addressed gradually.",
    "confidence.cost.fewImportant": "A few important areas need attention. The rest can be handled as part of routine maintenance.",
    "confidence.cost.allManaged": "All detected issues are under control. Improvement recommendations are available in the report.",

    // Why Important (BLOCK 9)
    "confidence.whyImportant": "Why this matters",
    "confidence.why.scanner": "Regular checks help detect changes before they become serious problems.",
    "confidence.why.repositories": "Repository control reduces the risk of errors and secrets reaching production.",
    "confidence.why.ssh": "Secure access enables centralized server management without compromising credentials.",
    "confidence.why.reports": "Reports help leadership make decisions based on up-to-date information.",
    "confidence.why.findings": "Understanding detected issues allows you to prioritize and act purposefully.",
    "confidence.why.integrations": "Integrations automate processes and reduce the chance of human error.",
    "confidence.why.apiKeys": "API keys let you connect external systems securely without sharing passwords.",
    "confidence.why.notifications": "Notifications help you respond to changes on time without checking the platform manually.",
    "confidence.why.marketplace": "The Solutions Center helps you select exactly the checks that address your business risks.",

    // Company Progress (BLOCK 8)
    "confidence.progress.title": "This month",
    "confidence.progress.fixedIssues": "issues resolved",
    "confidence.progress.closedPaths": "attack paths closed",
    "confidence.progress.connectedIntegrations": "integrations connected",
    "confidence.progress.automatedChecks": "checks automated",
    "confidence.progress.controlGrown": "control level increased",
    "confidence.progress.trendUp": "Security control level continues to grow.",

    // Terminology replacements (BLOCK 10)
    "confidence.term.needsAttention": "Needs Attention",
    "confidence.term.improvementAreas": "Areas for Improvement",
    "confidence.term.controlLevel": "Current Control Level",
    "confidence.term.entryPoints": "Available Entry Points",
    "confidence.term.findingsOverview": "Findings Overview",
    "confidence.term.recommendations": "Recommendations",

    // New business result types
    "business.repoConnected.title": "Repository Connected",
    "business.repoConnected.desc": "The platform can now automatically track code changes and check new commits.",
    "business.serverConnected.title": "Server Connected",
    "business.serverConnected.desc": "Remote server audit, configuration checks, and open service analysis are now available.",
    "business.integrationReady.title": "Integration Configured",
    "business.integrationReady.desc": "Data will now flow automatically and notifications will arrive on time.",
    "business.analysisComplete.title": "Analysis Complete",
    "business.analysisComplete.desc": "Your infrastructure visibility has improved. Recommendations are available in the report.",

    // Updated toast messages (BLOCK 11)
    "toast.scanComplete": "Check complete. Infrastructure visibility has improved.",
    "toast.installed": "Solution connected and ready to go.",
    "toast.exportComplete": "Export ready. Data is available for use.",
    "toast.reportGenerated": "Report generated. You now have the full picture for decision-making.",
    "toast.saved": "Changes saved. Settings applied.",
    "toast.connected": "Connection established. The platform has gained new capabilities.",

    // Findings with solutions (BLOCK 4)
    "confidence.finding.whatHappened": "What happened",
    "confidence.finding.whyImportant": "Why this matters",
    "confidence.finding.ifIgnored": "What happens if ignored",
    "confidence.finding.recommendation": "Recommended action",
    "confidence.finding.timeEstimate": "Estimated time",
    "confidence.finding.afterFix": "Expected outcome",

    // Calm principle (BLOCK 11)
    "confidence.calm.scanComplete": "Check complete. You now have a better understanding of your infrastructure.",
    "confidence.calm.toolInstalled": "Check connected. You can now run an analysis and get results.",
    "confidence.calm.projectCreated": "Project created. You can now add targets and run your first checks.",
    "confidence.calm.repoConnected": "Repository connected. Code changes are now tracked automatically.",
    "confidence.calm.reportGenerated": "Report ready. You now have a clear picture for decision-making.",
    "confidence.calm.settingsSaved": "Settings applied. The platform is adapted to your preferences.",
'''

# Insert RU keys
ru_marker = '    "scroll.arch.deployment": "Варианты развёртывания",\n'
if ru_marker in content:
    content = content.replace(ru_marker, ru_marker + ru_new + '\n')
    print("✅ RU keys inserted")

# Insert EN keys
en_marker = '    "scroll.arch.deployment": "Deployment Options",\n'
if en_marker in content:
    content = content.replace(en_marker, en_marker + en_new + '\n')
    print("✅ EN keys inserted")

# Update existing keys (BLOCK 10 terminology)
existing_updates = {
    # BLOCK 10: Replace "Risk Score" → "Текущий уровень контроля"
    '"dashboard.riskScore": "Риск"': '"dashboard.riskScore": "Уровень контроля"',
    '"dashboard.riskScore": "Risk Score"': '"dashboard.riskScore": "Control Level"',
    # BLOCK 10: Replace "Уязвимости" → "Что требует внимания" in key pages
    '"findings.subtitle": "Обнаруженные **уязвимости** и проблемы безопасности"': '"findings.subtitle": "Обзор обнаруженного — что требует внимания"',
    '"findings.subtitle": "Detected **vulnerabilities** and security issues"': '"findings.subtitle": "Findings overview — what needs attention"',
    # BLOCK 10: Attack Surface → Доступные точки входа
    '"dashboard.term.attackSurface": "Attack Surface"': '"dashboard.term.attackSurface": "Available Entry Points"',
    # BLOCK 3: Critical → Высокий приоритет in business score
    '"business.score.critical": "Критично — необходимо немедленное действие"': '"business.score.critical": "Требует внимания — несколько направлений нужно рассмотреть в ближайшее время"',
    '"business.score.critical": "Critical — immediate action required"': '"business.score.critical": "Needs Attention — several areas should be reviewed soon"',
}

for old, new in existing_updates.items():
    if old in content:
        content = content.replace(old, new)
        print(f"  Updated: {old[:60]}...")
    else:
        print(f"  NOT found: {old[:60]}...")

with open(I18N_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ i18n.ts updated for INT-035!")
