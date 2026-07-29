/**
 * Findings Business Translator (PX-004)
 *
 * Переводит технические security findings на язык бизнеса.
 * Каждая проблема получает:
 *   - businessTitle (что произошло, на языке бизнеса)
 *   - businessImpact (чем грозит бизнесу)
 *   - fixTime (сколько займёт исправление)
 *   - nextStep (рекордуемый следующий шаг)
 *   - developerTask (готовое описание для Jira/GitHub/Linear)
 *   - simpleExplanation (объяснение ещё проще)
 */

export interface BusinessFinding {
  id: string;
  // Технические поля (скрыты по умолчанию)
  technicalTitle: string;
  cve?: string;
  cvss?: number;
  severity: "critical" | "high" | "medium" | "low";
  port?: number;
  service?: string;
  rawOutput?: string;

  // Бизнес-перевод (показывается первым)
  businessTitle: string;
  businessImpact: string;
  businessRiskLevel: "Критический" | "Высокий" | "Средний" | "Низкий";
  fixTime: string;
  fixEffort: "15 минут" | "1 час" | "4 часа" | "1 день" | "1 неделя";
  nextStep: string;
  expectedBenefit: string;

  // Для разработчика
  developerTask: {
    title: string;
    description: string;
    priority: "P0" | "P1" | "P2" | "P3";
    labels: string[];
    estimate: string;
  };

  // Простое объяснение (ещё понятнее)
  simpleExplanation: string;
}

/* --- Категории проблем с бизнес-переводом --- */

export const FINDING_CATEGORIES: Record<string, {
  businessTitle: (ctx: { domain?: string; port?: number }) => string;
  businessImpact: string;
  fixTime: string;
  fixEffort: BusinessFinding["fixEffort"];
  nextStep: string;
  expectedBenefit: string;
  simpleExplanation: string;
  developerTitle: string;
  developerDescription: string;
  priority: BusinessFinding["developerTask"]["priority"];
  labels: string[];
}> = {
  ssl_expired: {
    businessTitle: ({ domain }) => `SSL сертификат истёк для ${domain || "вашего сайта"}`,
    businessImpact: "Браузеры показывают предупреждение 'Небезопасный сайт'. Пользователи видят красный экран и уходят. Данные между сайтом и пользователем могут быть перехвачены злоумышленниками.",
    fixTime: "15 минут",
    fixEffort: "15 минут",
    nextStep: "Обновите SSL сертификат у вашего хостинг-провайдера или через Let's Encrypt (бесплатно).",
    expectedBenefit: "Уберёт предупреждение в браузере, восстановит доверие пользователей, защитит данные от перехвата.",
    simpleExplanation: "Ваш сайт работает без защиты. Это как отправлять письма в открытом виде — любой может прочитать. Нужно обновить сертификат, это быстро и бесплатно.",
    developerTitle: "[Security] Обновить SSL сертификат",
    developerDescription: "SSL сертификат истёк. Нужно:\n1. Проверить срок действия текущего сертификата\n2. Выпустить новый через Let's Encrypt или хостинг-провайдера\n3. Установить на сервер\n4. Настроить автообновление\n\nКритичность: P0 — пользователи видят предупреждение в браузере.",
    priority: "P0",
    labels: ["security", "ssl", "infrastructure"],
  },

  ssl_weak: {
    businessTitle: ({ domain }) => `Слабое шифрование на ${domain || "вашем сайте"}`,
    businessImpact: "Сайт использует устаревшие методы шифрования. Современные браузеры могут пометить сайт как небезопасный. Данные пользователей уязвимы для расшифровки.",
    fixTime: "1 час",
    fixEffort: "1 час",
    nextStep: "Обновите конфигурацию сервера: отключите TLS 1.0/1.1, включите TLS 1.2+.",
    expectedBenefit: "Соответствие современным стандартам безопасности, отсутствие предупреждений в браузерах.",
    simpleExplanation: "Ваш сайт использует старую защиту, которую современные хакеры умеют обходить. Нужно обновить настройки — это как заменить старый замок на новый.",
    developerTitle: "[Security] Обновить TLS конфигурацию",
    developerDescription: "Сервер использует устаревшие протоколы шифрования (TLS 1.0/1.1).\nНужно:\n1. Отключить TLS 1.0 и 1.1 в конфигурации сервера\n2. Включить TLS 1.2 и 1.3\n3. Обновить cipher suites на современные\n4. Проверить через SSL Labs\n\nКритичность: P1",
    priority: "P1",
    labels: ["security", "ssl", "tls", "infrastructure"],
  },

  open_port: {
    businessTitle: ({ port }) => `Открыт порт ${port || "неизвестно"} — потенциальная точка входа для атаки`,
    businessImpact: "На вашем сервере открыт порт, который не нужен для работы сайта. Злоумышленники могут использовать его для проникновения в вашу инфраструктуру.",
    fixTime: "30 минут",
    fixEffort: "1 час",
    nextStep: "Закройте неиспользуемые порты в настройках файрвола. Оставьте только 80 (HTTP) и 443 (HTTPS).",
    expectedBenefit: "Уменьшение поверхности атаки на 80%+. Хакеры не смогут подключиться через неиспользуемые сервисы.",
    simpleExplanation: "На вашем сервере открыта 'дверь', через которую никто не пользуется, но хакеры могут в неё войти. Нужно её закрыть.",
    developerTitle: "[Security] Закрыть неиспользуемые порты",
    developerDescription: `Обнаружен открытый порт ${"{{port}}"}. Нужно:\n1. Проверить, какой сервис использует этот порт\n2. Если сервис не нужен — остановить и отключить\n3. Добавить правило в файрвол для блокировки порта\n4. Проверить через nmap\n\nКритичность: P2`,
    priority: "P2",
    labels: ["security", "network", "firewall"],
  },

  outdated_software: {
    businessTitle: () => `Устаревшее программное обеспечение на сервере`,
    businessImpact: "Сервер использует версию ПО с известными уязвимостями. Хакеры могут использовать публично доступные эксплойты для атаки на ваш сайт.",
    fixTime: "1-2 часа",
    fixEffort: "4 часа",
    nextStep: "Обновите программное обеспечение сервера до последней стабильной версии.",
    expectedBenefit: "Закроет известные уязвимости, предотвратит автоматические атаки ботов.",
    simpleExplanation: "На вашем сервере работает старая версия программы, в которой есть известные дыры. Хакеры знают об этих дырах и автоматически их атакуют. Нужно обновить программу.",
    developerTitle: "[Security] Обновить серверное ПО",
    developerDescription: "Обнаружено устаревшее ПО с известными уязвимостями.\nНужно:\n1. Идентифицировать установленную версию\n2. Проверить changelog последней версии\n3. Обновить в maintenance окно\n4. Проверить совместимость\n5. Перезапустить сервисы\n\nКритичность: P1",
    priority: "P1",
    labels: ["security", "updates", "infrastructure"],
  },

  missing_headers: {
    businessTitle: () => `Отсутствуют заголовки безопасности`,
    businessImpact: "Сайт не отправляет браузерам инструкции по безопасности. Это делает пользователей уязвимыми к атакам типа XSS и clickjacking.",
    fixTime: "30 минут",
    fixEffort: "1 час",
    nextStep: "Добавьте security headers в конфигурацию веб-сервера (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options).",
    expectedBenefit: "Соответствие OWASP рекомендациям, защита пользователей от атак через браузер.",
    simpleExplanation: "Ваш сайт не говорит браузерам посетителей, как себя защитить. Нужно добавить 'инструкции по безопасности' — это несколько строк в настройках сервера.",
    developerTitle: "[Security] Добавить HTTP security headers",
    developerDescription: "Отсутствуют security headers.\nНужно добавить:\n- Content-Security-Policy\n- X-Frame-Options: DENY\n- X-Content-Type-Options: nosniff\n- Strict-Transport-Security\n- Referrer-Policy\n\nКритичность: P2",
    priority: "P2",
    labels: ["security", "headers", "owasp"],
  },

  default_credentials: {
    businessTitle: () => `Используются стандартные пароли`,
    businessImpact: "На сервере найдены сервисы со стандартными (заводскими) паролями. Хакеры могут войти в систему за секунды, используя публичные списки паролей.",
    fixTime: "15 минут",
    fixEffort: "15 минут",
    nextStep: "Немедленно измените все стандартные пароли на сложные, уникальные.",
    expectedBenefit: "Предотвратит 99% автоматических атак на административные панели.",
    simpleExplanation: "Кто-то на вашем сервере использует пароль 'admin/admin' или подобный. Хакеры проверяют такие пароли первыми. Нужно срочно поменять.",
    developerTitle: "[Security] Сменить стандартные пароли",
    developerDescription: "Обнаружены сервисы со стандартными учётными данными.\nНужно:\n1. Найти все сервисы с default credentials\n2. Сгенерировать сильные пароли\n3. Обновить credentials во всех сервисах\n4. Сохранить в password manager\n5. Проверить логи на несанкционированный доступ\n\nКритичность: P0",
    priority: "P0",
    labels: ["security", "credentials", "critical"],
  },

  directory_listing: {
    businessTitle: () => `Видно содержимое папок на сайте`,
    businessImpact: "Посетители могут видеть список всех файлов в папках вашего сайта. Злоумышленники могут найти конфиденциальные файлы, резервные копии или конфигурации.",
    fixTime: "15 минут",
    fixEffort: "15 минут",
    nextStep: "Отключите directory listing в конфигурации веб-сервера.",
    expectedBenefit: "Скрытие структуры сайта, защита конфиденциальных файлов.",
    simpleExplanation: "Если кто-то зайдёт в папку вашего сайта, он увидит все файлы. Это как оставить ящик стола открытым — нужно просто его закрыть.",
    developerTitle: "[Security] Отключить directory listing",
    developerDescription: "Включён directory listing.\nНужно:\n1. Добавить 'Options -Indexes' в .htaccess (Apache) или эквивалент в nginx\n2. Проверить все директории\n3. Убедиться, что index.html существует в каждой публичной папке\n\nКритичность: P2",
    priority: "P2",
    labels: ["security", "configuration", "information-disclosure"],
  },

  xss_vulnerability: {
    businessTitle: () => `Уязвимость к атаке через веб-форму`,
    businessImpact: "Злоумышленник может внедрить вредоносный код через формы на вашем сайте. Этот код выполнится в браузере других пользователей, что может привести к краже данных сессии и фишингу.",
    fixTime: "2-4 часа",
    fixEffort: "4 часа",
    nextStep: "Внедрите sanitization ввода во всех формах. Используйте Content-Security-Policy как дополнительную защиту.",
    expectedBenefit: "Защита пользователей от кражи данных, соответствие OWASP Top 10.",
    simpleExplanation: "На вашем сайте есть форма, через которую хакер может загрузить вредоносный код. Когда другие пользователи откроют страницу, этот код выполнится. Нужно проверять всё, что вводят пользователи.",
    developerTitle: "[Security] Устранить XSS уязвимость",
    developerDescription: "Обнаружена XSS уязвимость в форме ввода.\nНужно:\n1. Найти все точки ввода (forms, URL params, headers)\n2. Добавить input sanitization (escape HTML entities)\n3. Использовать CSP headers как defence-in-depth\n4. Добавить unit tests для sanitization\n5. Проверить через OWASP ZAP\n\nКритичность: P1",
    priority: "P1",
    labels: ["security", "xss", "owasp", "web"],
  },

  sql_injection: {
    businessTitle: () => `Уязвимость базы данных к атаке через ввод`,
    businessImpact: "Злоумышленник может выполнить произвольные SQL запросы к вашей базе данных. Это может привести к полной утечке всех данных пользователей, удалению таблиц или получению административного доступа.",
    fixTime: "4-8 часов",
    fixEffort: "1 день",
    nextStep: "Замените все SQL запросы с конкатенацией строк на parameterized queries.",
    expectedBenefit: "Полная защита от SQL injection, защита данных всех пользователей.",
    simpleExplanation: "Хакер может через обычную форму ввода получить доступ ко всей вашей базе данных — всем пользователям, паролям, заказам. Это один из самых опасных типов уязвимостей.",
    developerTitle: "[Security] Устранить SQL injection",
    developerDescription: "Обнаружена SQL injection уязвимость.\nНужно:\n1. Найти все SQL запросы с string concatenation\n2. Заменить на parameterized queries / prepared statements\n3. Добавить input validation\n4. Использовать ORM где возможно\n5. Провести regression testing\n6. Проверить через sqlmap\n\nКритичность: P0",
    priority: "P0",
    labels: ["security", "sql-injection", "owasp", "critical", "database"],
  },

  generic: {
    businessTitle: () => `Обнаружена проблема безопасности`,
    businessImpact: "Найдена потенциальная уязвимость, которая может быть использована злоумышленниками для атаки на вашу инфраструктуру.",
    fixTime: "1-2 часа",
    fixEffort: "1 час",
    nextStep: "Изучите технические детали и обратитесь к документации конкретной уязвимости.",
    expectedBenefit: "Повышение общего уровня безопасности.",
    simpleExplanation: "Мы нашли проблему, которая может быть использована хакерами. Посмотрите технические детали, чтобы понять как её исправить.",
    developerTitle: "[Security] Исправить обнаруженную уязвимость",
    developerDescription: "Обнаружена security проблема.\nСм. технические детали для информации об исправлении.\n\nКритичность: P2",
    priority: "P2",
    labels: ["security"],
  },
};

/* --- Helper: создать BusinessFinding из технического finding --- */

export function createBusinessFinding(params: {
  id: string;
  category: keyof typeof FINDING_CATEGORIES | string;
  technicalTitle: string;
  cve?: string;
  cvss?: number;
  severity: BusinessFinding["severity"];
  port?: number;
  service?: string;
  domain?: string;
  rawOutput?: string;
}): BusinessFinding {
  const cat = FINDING_CATEGORIES[params.category] || FINDING_CATEGORIES.generic;
  const ctx = { domain: params.domain, port: params.port };

  const riskLevel: BusinessFinding["businessRiskLevel"] =
    params.severity === "critical" ? "Критический" :
    params.severity === "high" ? "Высокий" :
    params.severity === "medium" ? "Средний" : "Низкий";

  return {
    id: params.id,
    technicalTitle: params.technicalTitle,
    cve: params.cve,
    cvss: params.cvss,
    severity: params.severity,
    port: params.port,
    service: params.service,
    rawOutput: params.rawOutput,

    businessTitle: cat.businessTitle(ctx),
    businessImpact: cat.businessImpact,
    businessRiskLevel: riskLevel,
    fixTime: cat.fixTime,
    fixEffort: cat.fixEffort,
    nextStep: cat.nextStep,
    expectedBenefit: cat.expectedBenefit,
    simpleExplanation: cat.simpleExplanation,

    developerTask: {
      title: cat.developerTitle,
      description: cat.developerDescription.replace("{{port}}", String(params.port || "")),
      priority: cat.priority,
      labels: cat.labels,
      estimate: cat.fixEffort,
    },
  };
}

/* --- Helper: получить цвет по risk level --- */

export function getRiskLevelColor(risk: BusinessFinding["businessRiskLevel"]): string {
  switch (risk) {
    case "Критический": return "text-red-500 bg-red-500/10 border-red-500/20";
    case "Высокий": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    case "Средний": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "Низкий": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
  }
}

export function getRiskLevelEmoji(risk: BusinessFinding["businessRiskLevel"]): string {
  switch (risk) {
    case "Критический": return "🔴";
    case "Высокий": return "🟠";
    case "Средний": return "🟡";
    case "Низкий": return "🔵";
  }
}

/* --- Helper: сортировка по expected business effect (не по CVSS) --- */

export function sortByBusinessImpact(findings: BusinessFinding[]): BusinessFinding[] {
  const priority = { "Критический": 0, "Высокий": 1, "Средний": 2, "Низкий": 3 };
  return [...findings].sort((a, b) => priority[a.businessRiskLevel] - priority[b.businessRiskLevel]);
}

/* --- Helper: сгенерировать AI Executive Summary --- */

export function generateExecutiveSummary(findings: BusinessFinding[], domain?: string): string {
  const total = findings.length;
  if (total === 0) {
    return `Проверка ${domain || "вашего сайта"} завершена. Проблем не обнаружено — ваша инфраструктура выглядит надежно. Рекомендую регулярные проверки для поддержания уровня безопасности.`;
  }

  const critical = findings.filter((f) => f.businessRiskLevel === "Критический").length;
  const high = findings.filter((f) => f.businessRiskLevel === "Высокий").length;
  const totalFixTime = findings.reduce((sum, f) => {
    const match = f.fixTime.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  const parts: string[] = [];

  if (critical > 0) {
    parts.push(`Проверка ${domain || "вашего сайта"} выявила ${critical} критическую проблему, требующую немедленного внимания.`);
  } else if (high > 0) {
    parts.push(`Проверка ${domain || "вашего сайта"} выявила ${high} серьёзных проблем безопасности.`);
  } else {
    parts.push(`Проверка ${domain || "вашего сайта"} выявила ${total} проблем, требующих внимания.`);
  }

  parts.push(`Всего найдено ${total} проблем, рекомендуемое время исправления — около ${totalFixTime} часов.`);

  const topFinding = sortByBusinessImpact(findings)[0];
  if (topFinding) {
    parts.push(`Рекомендую начать с: ${topFinding.businessTitle.toLowerCase()}.`);
  }

  return parts.join(" ");
}

/* --- Helper: сгенерировать top 3-5 actions по бизнес-эффекту --- */

export function getTopActions(findings: BusinessFinding[], max = 5): BusinessFinding[] {
  return sortByBusinessImpact(findings).slice(0, max);
}

/* --- Demo data для /app/findings --- */

export function getDemoFindings(domain = "example.com"): BusinessFinding[] {
  return [
    createBusinessFinding({
      id: "F-001",
      category: "ssl_expired",
      technicalTitle: "SSL Certificate Expired",
      severity: "critical",
      domain,
    }),
    createBusinessFinding({
      id: "F-002",
      category: "default_credentials",
      technicalTitle: "Default credentials on SSH service",
      severity: "critical",
      port: 22,
      service: "SSH",
      domain,
    }),
    createBusinessFinding({
      id: "F-003",
      category: "sql_injection",
      technicalTitle: "SQL Injection in login form",
      severity: "critical",
      cve: "CVE-2024-1234",
      cvss: 9.8,
      domain,
    }),
    createBusinessFinding({
      id: "F-004",
      category: "missing_headers",
      technicalTitle: "Missing security headers",
      severity: "medium",
      domain,
    }),
    createBusinessFinding({
      id: "F-005",
      category: "open_port",
      technicalTitle: "Port 3306 (MySQL) open to internet",
      severity: "high",
      port: 3306,
      service: "MySQL",
      domain,
    }),
    createBusinessFinding({
      id: "F-006",
      category: "directory_listing",
      technicalTitle: "Directory listing enabled on /backup/",
      severity: "low",
      domain,
    }),
    createBusinessFinding({
      id: "F-007",
      category: "outdated_software",
      technicalTitle: "nginx 1.18.0 (outdated)",
      severity: "medium",
      domain,
    }),
    createBusinessFinding({
      id: "F-008",
      category: "xss_vulnerability",
      technicalTitle: "Reflected XSS in search parameter",
      severity: "high",
      cve: "CVE-2024-5678",
      cvss: 7.4,
      domain,
    }),
  ];
}
