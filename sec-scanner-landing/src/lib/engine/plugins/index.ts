/**
 * SIP Core Engine — Plugin Manifests
 * Every tool has a manifest. Scanner knows nothing about individual tools —
 * it works only through the Runtime via manifests.
 */

import type { PluginManifest } from "../types";

// ─── Nmap ─────────────────────────────────────────────────────────────────

export const nmapManifest: PluginManifest = {
  id: "nmap",
  name: "Nmap",
  version: "7.95.0",
  description: {
    ru: "Сетевой сканер портов и сервисов",
    en: "Network port and service scanner",
  },
  category: "network",
  outputFormat: "xml",
  install: {
    command: "apt-get install -y nmap",
    verify: "nmap --version",
  },
  run: {
    command: "nmap -sV -oX - {target}",
    args: ["-sV", "-oX", "-"],
  },
  parser: "nmap",
  sampleOutput: {
    ru: [
      "nmap: Сканирование портов...",
      "22/tcp  open  ssh     OpenSSH 8.9",
      "80/tcp  open  http    nginx 1.24",
      "443/tcp open  https   nginx 1.24",
      "3306/tcp open mysql  MySQL 8.0.35",
      "Обнаружено 4 открытых порта",
    ],
    en: [
      "nmap: Scanning ports...",
      "22/tcp  open  ssh     OpenSSH 8.9",
      "80/tcp  open  http    nginx 1.24",
      "443/tcp open  https   nginx 1.24",
      "3306/tcp open mysql  MySQL 8.0.35",
      "4 open ports found",
    ],
  },
  sampleRawOutput: `<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap" args="nmap -sV -oX - 192.168.1.100" start="1721179200" startstr="Tue Jul 16 12:00:00 2026">
<host starttime="1721179201" endtime="1721179215">
<address addr="192.168.1.100" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="22"><state state="open" reason="syn-ack"/><service name="ssh" product="OpenSSH" version="8.9p1" extrainfo="Ubuntu 3ubuntu0.6"/></port>
<port protocol="tcp" portid="80"><state state="open" reason="syn-ack"/><service name="http" product="nginx" version="1.24.0"/></port>
<port protocol="tcp" portid="443"><state state="open" reason="syn-ack"/><service name="https" product="nginx" version="1.24.0"/></port>
<port protocol="tcp" portid="3306"><state state="open" reason="syn-ack"/><service name="mysql" product="MySQL" version="8.0.35"/></port>
<port protocol="tcp" portid="6379"><state state="open" reason="syn-ack"/><service name="redis" product="Redis" version="7.2.3"/></port>
</ports>
</host>
</nmaprun>`,
  cliCommand: "sip scan --engine nmap --target {target} --ports top-1000",
};

// ─── Nuclei ───────────────────────────────────────────────────────────────

export const nucleiManifest: PluginManifest = {
  id: "nuclei",
  name: "Nuclei",
  version: "3.3.0",
  description: {
    ru: "Сканер уязвимостей на основе шаблонов",
    en: "Template-based vulnerability scanner",
  },
  category: "web",
  outputFormat: "json",
  install: {
    command: "go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
    verify: "nuclei --version",
  },
  run: {
    command: "nuclei -u {target} -json -t cves/,vulnerabilities/",
    args: ["-json", "-t", "cves/,vulnerabilities/"],
  },
  parser: "nuclei",
  sampleOutput: {
    ru: [
      "nuclei: Загрузка 6841 шаблонов...",
      "[CVE-2024-23956] SQL Injection в /api/v1/users [critical]",
      "[CVE-2024-11234] XSS в /search [high]",
      "[misconfig] Отсутствуют заголовки безопасности [medium]",
      "3 уязвимости обнаружено (1 critical, 1 high, 1 medium)",
    ],
    en: [
      "nuclei: Loading 6841 templates...",
      "[CVE-2024-23956] SQL Injection at /api/v1/users [critical]",
      "[CVE-2024-11234] XSS at /search [high]",
      "[misconfig] Missing security headers [medium]",
      "3 vulnerabilities found (1 critical, 1 high, 1 medium)",
    ],
  },
  sampleRawOutput: JSON.stringify([
    {
      templateID: "CVE-2024-23956",
      type: "http",
      host: "https://app.sec-scanner.pro",
      matchedAt: "https://app.sec-scanner.pro/api/v1/users?id=1'",
      info: {
        name: "SQL Injection in Users API",
        severity: "critical",
        description: "User-supplied input in the 'id' parameter is directly interpolated into SQL queries without parameterization.",
        tags: ["cve", "sqli", "owasp"],
        reference: ["https://nvd.nist.gov/vuln/detail/CVE-2024-23956"],
        classification: { cvss: 9.8, cwe: "CWE-89" },
        remediation: "Use parameterized queries or an ORM. Add input validation and a WAF rule.",
      },
      extractedResults: ["SQL error: unterminated quoted string"],
      timestamp: "2026-07-17T08:23:00.000Z",
    },
    {
      templateID: "CVE-2024-11234",
      type: "http",
      host: "https://app.sec-scanner.pro",
      matchedAt: "https://app.sec-scanner.pro/search?q=<script>alert(1)</script>",
      info: {
        name: "Cross-Site Scripting (Reflected)",
        severity: "high",
        description: "The search endpoint reflects user input without sanitization, allowing cross-site scripting attacks.",
        tags: ["cve", "xss", "owasp"],
        reference: ["https://nvd.nist.gov/vuln/detail/CVE-2024-11234"],
        classification: { cvss: 7.5, cwe: "CWE-79" },
        remediation: "Sanitize all user input before rendering. Implement Content Security Policy headers.",
      },
      timestamp: "2026-07-17T08:23:15.000Z",
    },
    {
      templateID: "misconfig-security-headers",
      type: "http",
      host: "https://app.sec-scanner.pro",
      matchedAt: "https://app.sec-scanner.pro",
      info: {
        name: "Missing Security Headers",
        severity: "medium",
        description: "Security headers (X-Frame-Options, X-Content-Type-Options, CSP) are not set.",
        tags: ["misconfig", "headers"],
        classification: { cvss: 5.3, cwe: "CWE-693" },
        remediation: "Configure security headers on the web server.",
      },
      timestamp: "2026-07-17T08:23:30.000Z",
    },
  ], null, 2),
  cliCommand: "sip scan --engine nuclei --target {target} --templates cves,vulnerabilities",
};

// ─── Trivy ────────────────────────────────────────────────────────────────

export const trivyManifest: PluginManifest = {
  id: "trivy",
  name: "Trivy",
  version: "0.55.0",
  description: {
    ru: "Сканер контейнеров и зависимостей",
    en: "Container and dependency scanner",
  },
  category: "container",
  outputFormat: "json",
  install: {
    command: "docker pull aquasec/trivy:latest",
    verify: "trivy --version",
  },
  run: {
    command: "trivy fs --format json {target}",
    args: ["--format", "json"],
  },
  parser: "trivy",
  sampleOutput: {
    ru: [
      "trivy: Анализ зависимостей и образов...",
      "CVE-2024-21626 (runc) — CRITICAL — CVSS 9.8",
      "CVE-2024-23652 (buildkit) — HIGH — CVSS 7.5",
      "npm/lodash <4.17.21 — Prototype Pollution",
      "3 уязвимости в зависимостях, 2 в контейнере",
    ],
    en: [
      "trivy: Analyzing dependencies and images...",
      "CVE-2024-21626 (runc) — CRITICAL — CVSS 9.8",
      "CVE-2024-23652 (buildkit) — HIGH — CVSS 7.5",
      "npm/lodash <4.17.21 — Prototype Pollution",
      "3 dependency vulnerabilities, 2 container vulnerabilities",
    ],
  },
  sampleRawOutput: JSON.stringify({
    SchemaVersion: 2,
    Results: [
      {
        Target: "package-lock.json",
        Type: "npm",
        Vulnerabilities: [
          {
            VulnerabilityID: "CVE-2024-21626",
            PkgName: "runc",
            InstalledVersion: "1.1.11",
            FixedVersion: "1.1.12",
            Severity: "CRITICAL",
            Title: "runc - container breakout via leaked /sys/fs/cgroup handle",
            Description: "runc through 1.1.11 allows container breakout via a leaked /sys/fs/cgroup handle.",
            PrimaryURL: "https://avd.aquasec.com/nvd/cve-2024-21626",
            CVSS: { nvd: { V3Vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", V3Score: 9.8 } },
            References: ["https://nvd.nist.gov/vuln/detail/CVE-2024-21626"],
            CWEIDs: ["CWE-269"],
          },
          {
            VulnerabilityID: "CVE-2024-23652",
            PkgName: "buildkit",
            InstalledVersion: "0.12.4",
            FixedVersion: "0.12.5",
            Severity: "HIGH",
            Title: "BuildKit - arbitrary delete of host filesystem",
            Description: "BuildKit through 0.12.4 has a garbage-collection defect.",
            PrimaryURL: "https://avd.aquasec.com/nvd/cve-2024-23652",
            CVSS: { nvd: { V3Vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", V3Score: 7.5 } },
            References: ["https://nvd.nist.gov/vuln/detail/CVE-2024-23652"],
            CWEIDs: ["CWE-20"],
          },
        ],
      },
      {
        Target: "npm/lodash",
        Type: "npm",
        Vulnerabilities: [
          {
            VulnerabilityID: "CVE-2020-8203",
            PkgName: "lodash",
            InstalledVersion: "4.17.20",
            FixedVersion: "4.17.21",
            Severity: "HIGH",
            Title: "Prototype Pollution in lodash",
            Description: "Versions of lodash prior to 4.17.21 are vulnerable to Prototype Pollution.",
            PrimaryURL: "https://avd.aquasec.com/nvd/cve-2020-8203",
            CVSS: { nvd: { V3Score: 7.4 } },
            References: ["https://nvd.nist.gov/vuln/detail/CVE-2020-8203"],
            CWEIDs: ["CWE-1321"],
          },
        ],
      },
    ],
  }, null, 2),
  cliCommand: "sip scan --engine trivy --target {target} --severity CRITICAL,HIGH",
};

// ─── Semgrep ──────────────────────────────────────────────────────────────

export const semgrepManifest: PluginManifest = {
  id: "semgrep",
  name: "Semgrep",
  version: "1.82.0",
  description: {
    ru: "Статический анализатор кода (SAST)",
    en: "Static code analyzer (SAST)",
  },
  category: "code",
  outputFormat: "json",
  install: {
    command: "pip install semgrep",
    verify: "semgrep --version",
  },
  run: {
    command: "semgrep --config auto --json {target}",
    args: ["--config", "auto", "--json"],
  },
  parser: "semgrep",
  sampleOutput: {
    ru: [
      "semgrep: Статический анализ кода...",
      "sql-injection: Параметр 'id' в SQL-запросе",
      "xss-reflected: Несанитизированный вывод в /search",
      "hardcoded-secret: API-ключ в config.py",
    ],
    en: [
      "semgrep: Static code analysis...",
      "sql-injection: 'id' param in SQL query",
      "xss-reflected: Unsanitized output in /search",
      "hardcoded-secret: API key in config.py",
    ],
  },
  sampleRawOutput: JSON.stringify({
    results: [
      {
        check_id: "python.lang.security.audit.dangerous-system-call.dangerous-system-call",
        path: "src/api/users.py",
        start: { line: 42, col: 5 },
        end: { line: 42, col: 35 },
        extra: {
          message: "Possible SQL injection via string concatenation",
          severity: "ERROR",
          metadata: {
            category: "security",
            confidence: "HIGH",
            cwe: "CWE-89",
            owasp: "A1: Injection",
            references: ["https://owasp.org/www-community/attacks/SQL_Injection"],
          },
          lines: 'cursor.execute("SELECT * FROM users WHERE id = " + user_id)',
        },
      },
      {
        check_id: "python.lang.security.audit.xss.reflected-xss",
        path: "src/templates/search.html",
        start: { line: 18, col: 8 },
        end: { line: 18, col: 30 },
        extra: {
          message: "Unsanitized user input reflected in HTML output",
          severity: "WARNING",
          metadata: {
            category: "security",
            confidence: "MEDIUM",
            cwe: "CWE-79",
            owasp: "A7: Cross-Site Scripting (XSS)",
          },
          lines: "<p>Search results for: {{ query }}</p>",
        },
      },
      {
        check_id: "python.lang.security.audit.hardcoded-secret.hardcoded-secret",
        path: "config.py",
        start: { line: 5, col: 1 },
        end: { line: 5, col: 45 },
        extra: {
          message: "Hardcoded API key detected",
          severity: "ERROR",
          metadata: {
            category: "security",
            confidence: "HIGH",
            cwe: "CWE-798",
            owasp: "A2: Broken Authentication",
          },
          lines: 'API_KEY = "sk-live-abc123def456"',
        },
      },
    ],
  }, null, 2),
  cliCommand: "sip scan --engine semgrep --target {target} --config auto",
};

// ─── OWASP ZAP ────────────────────────────────────────────────────────────

export const zapManifest: PluginManifest = {
  id: "owasp-zap",
  name: "OWASP ZAP",
  version: "2.15.0",
  description: {
    ru: "Веб-сканер безопасности приложений (DAST)",
    en: "Web application security scanner (DAST)",
  },
  category: "web",
  outputFormat: "json",
  install: {
    command: "docker pull zaproxy/zap-stable",
    verify: "docker run --rm zaproxy/zap-stable zap.sh -version",
  },
  run: {
    command: "zap-cli quick-scan --json {target}",
    args: ["--json"],
  },
  parser: "zap",
  sampleOutput: {
    ru: [
      "zap: Активное сканирование...",
      "SQL Injection подтверждён в /api/v1/users",
      "Cross-Site Scripting в /search",
      "Небезопасные Cookie-флаги",
    ],
    en: [
      "zap: Active scanning...",
      "SQL Injection confirmed at /api/v1/users",
      "Cross-Site Scripting at /search",
      "Insecure cookie flags detected",
    ],
  },
  sampleRawOutput: JSON.stringify({
    site: [
      {
        "@name": "https://app.sec-scanner.pro",
        alerts: [
          {
            pluginid: "40018",
            alert: "SQL Injection",
            name: "SQL Injection",
            riskcode: "3",
            confidence: "3",
            desc: "SQL injection may be possible on /api/v1/users endpoint.",
            solution: "Use parameterized queries. Implement input validation and prepared statements.",
            reference: "https://owasp.org/www-community/attacks/SQL_Injection",
            cweid: "89",
            wascid: "19",
            instances: [{ uri: "https://app.sec-scanner.pro/api/v1/users?id=1%27", method: "GET", param: "id" }],
          },
          {
            pluginid: "40012",
            alert: "Cross Site Scripting (Reflected)",
            name: "Cross Site Scripting (Reflected)",
            riskcode: "2",
            confidence: "2",
            desc: "Reflected XSS found in search endpoint.",
            solution: "Ensure all user input is properly sanitized before rendering.",
            reference: "https://owasp.org/www-community/attacks/xss/",
            cweid: "79",
            wascid: "8",
            instances: [{ uri: "https://app.sec-scanner.pro/search?q=<script>", method: "GET", param: "q" }],
          },
          {
            pluginid: "10010",
            alert: "Cookie No HttpOnly Flag",
            name: "Cookie No HttpOnly Flag",
            riskcode: "1",
            confidence: "2",
            desc: "A cookie has been set without the HttpOnly flag.",
            solution: "Ensure that the HttpOnly flag is set for all cookies.",
            reference: "https://owasp.org/www-community/HttpOnly",
            cweid: "1004",
            wascid: "13",
            instances: [{ uri: "https://app.sec-scanner.pro", method: "GET", param: "session" }],
          },
        ],
      },
    ],
  }, null, 2),
  cliCommand: "sip scan --engine zap --target {target} --mode active",
};

// ─── Nikto ────────────────────────────────────────────────────────────────

export const niktoManifest: PluginManifest = {
  id: "nikto",
  name: "Nikto",
  version: "2.5.0",
  description: {
    ru: "Сканер веб-серверов",
    en: "Web server scanner",
  },
  category: "web",
  outputFormat: "text",
  install: {
    command: "apt-get install -y nikto",
    verify: "nikto -Version",
  },
  run: {
    command: "nikto -h {target} -Format csv",
    args: ["-Format", "csv"],
  },
  parser: "nikto",
  sampleOutput: {
    ru: [
      "nikto: Сканирование веб-сервера...",
      "Server: nginx/1.24.0 — устаревшая версия",
      "/.git/ — обнаружен Git-репозиторий",
      "/admin — панель администратора доступна",
    ],
    en: [
      "nikto: Web server scanning...",
      "Server: nginx/1.24.0 — outdated version",
      "/.git/ — Git repository exposed",
      "/admin — admin panel accessible",
    ],
  },
  sampleRawOutput: `" nikto "," 2.5.0 "
" Target IP "," 192.168.1.100 "
" Target Hostname "," app.sec-scanner.pro "
" Start Time "," 2026-07-17 08:30:00 "
" Server "," nginx/1.24.0 "
" OSVDB-3092 "," /.git/ — Git repository found. This may allow attackers to download the source code. "
" OSVDB-3268 "," /admin — Admin panel found. Consider restricting access. "
" OSVDB-3233 "," /phpmyadmin/ — phpMyAdmin directory found. "
" End Time "," 2026-07-17 08:35:00 "`,
  cliCommand: "sip scan --engine nikto --target {target} --tuning 123",
};

// ─── All manifests registry ───────────────────────────────────────────────

export const ALL_MANIFESTS: PluginManifest[] = [
  nmapManifest,
  nucleiManifest,
  trivyManifest,
  semgrepManifest,
  zapManifest,
  niktoManifest,
];

export const MANIFESTS_BY_ID: Record<string, PluginManifest> = Object.fromEntries(
  ALL_MANIFESTS.map((m) => [m.id, m])
);

/** Built-in tools that are always available (pre-installed) */
export const BUILTIN_TOOL_IDS = new Set(["nmap", "nuclei", "trivy"]);
