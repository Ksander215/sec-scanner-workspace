/**
 * SIP Server — Plugin Manifests
 * Every tool has a manifest. Scanner knows nothing about individual tools.
 * Works only through the Runtime via manifests.
 *
 * Mirrors the frontend manifests but with server-side run commands.
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
    // -sV: version detection, -oX -: output XML to stdout
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
  sampleRawOutput: "",
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
    // -u: target URL, -json: JSON output to stdout
    command: "nuclei -u {target} -json -silent",
    args: ["-json", "-silent"],
  },
  parser: "nuclei",
  sampleOutput: {
    ru: [
      "nuclei: Загрузка шаблонов...",
      "[CVE-2024-23956] SQL Injection [critical]",
      "3 уязвимости обнаружено",
    ],
    en: [
      "nuclei: Loading templates...",
      "[CVE-2024-23956] SQL Injection [critical]",
      "3 vulnerabilities found",
    ],
  },
  sampleRawOutput: "",
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
    command: "apt-get install -y trivy || (curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh)",
    verify: "trivy --version",
  },
  run: {
    // fs: filesystem scan, --format json: JSON output
    command: "trivy fs --format json {target}",
    args: ["--format", "json"],
  },
  parser: "trivy",
  sampleOutput: {
    ru: [
      "trivy: Анализ зависимостей...",
      "CVE-2024-21626 (runc) — CRITICAL",
      "3 уязвимости в зависимостях",
    ],
    en: [
      "trivy: Analyzing dependencies...",
      "CVE-2024-21626 (runc) — CRITICAL",
      "3 dependency vulnerabilities",
    ],
  },
  sampleRawOutput: "",
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
    // --config auto: use recommended rules, --json: JSON output
    command: "semgrep --config auto --json {target}",
    args: ["--config", "auto", "--json"],
  },
  parser: "semgrep",
  sampleOutput: {
    ru: [
      "semgrep: Статический анализ кода...",
      "sql-injection: Параметр 'id' в SQL-запросе",
      "hardcoded-secret: API-ключ в config.py",
    ],
    en: [
      "semgrep: Static code analysis...",
      "sql-injection: 'id' param in SQL query",
      "hardcoded-secret: API key in config.py",
    ],
  },
  sampleRawOutput: "",
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
    // Docker-based ZAP scan with JSON report
    command: "docker run --rm zaproxy/zap-stable zap-baseline.py -t {target} -J zap_report.json -I && docker cp $(docker ps -lq):/zap/zap_report.json /tmp/zap_report.json && cat /tmp/zap_report.json",
    args: ["-J", "zap_report.json", "-I"],
  },
  parser: "zap",
  sampleOutput: {
    ru: [
      "zap: Активное сканирование...",
      "SQL Injection подтверждён в /api/v1/users",
      "Cross-Site Scripting в /search",
    ],
    en: [
      "zap: Active scanning...",
      "SQL Injection confirmed at /api/v1/users",
      "Cross-Site Scripting at /search",
    ],
  },
  sampleRawOutput: "",
  cliCommand: "sip scan --engine zap --target {target} --mode baseline",
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
    // -h: target host, -Format csv: CSV output
    command: "nikto -h {target} -Format csv",
    args: ["-Format", "csv"],
  },
  parser: "nikto",
  sampleOutput: {
    ru: [
      "nikto: Сканирование веб-сервера...",
      "Server: nginx/1.24.0 — устаревшая версия",
      "/.git/ — обнаружен Git-репозиторий",
    ],
    en: [
      "nikto: Web server scanning...",
      "Server: nginx/1.24.0 — outdated version",
      "/.git/ — Git repository exposed",
    ],
  },
  sampleRawOutput: "",
  cliCommand: "sip scan --engine nikto --target {target} --tuning 123",
};

// ─── Registry ─────────────────────────────────────────────────────────────

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

/** Built-in tools that are always available */
export const BUILTIN_TOOL_IDS = new Set(["nmap", "nuclei", "trivy"]);
