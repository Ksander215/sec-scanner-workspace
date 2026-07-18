import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Shared Marketplace/Scanner state ───────────────────────────────────
// Installed marketplace tools are stored in localStorage so both
// the Marketplace page and the Scanner page can read/write the same state.

const MARKETPLACE_INSTALLED_KEY = "sip_marketplace_installed";

/** IDs of marketplace plugins that are scanner engines (not rules/dashboards/etc.) */
export const SCANNER_PLUGIN_IDS = new Set([
  "mpl-001", // DAST Ultra Engine
  "mpl-009", // SAST CodeQL Engine
]);

/** Mapping from marketplace plugin ID → scanner tool definition */
export const MARKETPLACE_TO_SCANNER: Record<string, {
  id: string;
  name: string;
  description: { ru: string; en: string };
  category: string;
  cliCommand: string;
  sampleOutput: { ru: string[]; en: string[] };
}> = {
  "mpl-001": {
    id: "dast-ultra",
    name: "DAST Ultra",
    description: {
      ru: "Продвинутый DAST-движок с покрытием OWASP и кастомными пейлоадами",
      en: "Advanced DAST engine with OWASP coverage and custom payload generation",
    },
    category: "web",
    cliCommand: "sip scan --engine dast-ultra --target {target} --mode active",
    sampleOutput: {
      ru: ["dast-ultra: Активное DAST-сканирование...", "SQL Injection (UNION) в /api/v1/users [critical]", "XSS (DOM-based) в /dashboard [high]", "IDOR в /api/v1/orders/{id} [high]", "3 уязвимости подтверждено"],
      en: ["dast-ultra: Active DAST scanning...", "SQL Injection (UNION) at /api/v1/users [critical]", "XSS (DOM-based) at /dashboard [high]", "IDOR at /api/v1/orders/{id} [high]", "3 vulnerabilities confirmed"],
    },
  },
  "mpl-009": {
    id: "codeql",
    name: "CodeQL (SAST)",
    description: {
      ru: "Статический анализ кода на основе CodeQL (JS, Python, Java, Go)",
      en: "Static analysis powered by CodeQL (JS, Python, Java, Go)",
    },
    category: "code",
    cliCommand: "sip scan --engine codeql --target {target} --languages auto",
    sampleOutput: {
      ru: ["codeql: Статический анализ кода...", "CWE-89: SQL Injection в src/api/users.py:42 [critical]", "CWE-79: XSS в src/templates/search.html:18 [high]", "CWE-798: Hardcoded credentials в config.py:5 [critical]", "3 проблемы в коде обнаружено"],
      en: ["codeql: Static code analysis...", "CWE-89: SQL Injection in src/api/users.py:42 [critical]", "CWE-79: XSS in src/templates/search.html:18 [high]", "CWE-798: Hardcoded credentials in config.py:5 [critical]", "3 code issues found"],
    },
  },
};

export function getMarketplaceInstalled(): Set<string> {
  if (typeof window === "undefined") return new Set(["mpl-002", "owasp-rules"]); // SSR fallback
  try {
    const raw = localStorage.getItem(MARKETPLACE_INSTALLED_KEY);
    return new Set(raw ? JSON.parse(raw) : ["mpl-002"]);
  } catch {
    return new Set(["mpl-002"]);
  }
}

export function setMarketplaceInstalled(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MARKETPLACE_INSTALLED_KEY, JSON.stringify([...ids]));
}

export function addMarketplaceInstalled(id: string) {
  const set = getMarketplaceInstalled();
  set.add(id);
  setMarketplaceInstalled(set);
  return set;
}

export function removeMarketplaceInstalled(id: string) {
  const set = getMarketplaceInstalled();
  set.delete(id);
  setMarketplaceInstalled(set);
  return set;
}
