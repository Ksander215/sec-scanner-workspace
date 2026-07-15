/**
 * Technology Mapping Normalizer
 *
 * Normalizes technology names from various scanner outputs
 * into a canonical lowercase format.
 *
 * For example:
 * - nginx / NGINX / Nginx / NgInx → nginx
 * - Apache / apache / APACHE → apache
 * - Node.js / nodejs / node-js → nodejs
 *
 * The normalizer maintains a comprehensive mapping table
 * and supports fuzzy matching for unknown variants.
 */

// ─── Technology Mapping Table ────────────────────────────────

/**
 * Canonical technology name → aliases.
 * The canonical name is always lowercase with hyphens replaced by nothing
 * or following industry convention.
 */
const TECHNOLOGY_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze({
  // ─── Web Servers ────────────────────────────────────
  nginx: ['nginx', 'NGINX', 'Nginx', 'NgInx', 'nginx-server', 'NginxServer', 'NGINXSERVER'],
  apache: ['apache', 'Apache', 'APACHE', 'apache2', 'Apache2', 'APACHE2', 'httpd', 'httpd-server', 'Apache HTTP Server', 'apache-httpd', 'apache-http-server'],
  iis: ['iis', 'IIS', 'Internet Information Services', 'iis-server', 'Microsoft-IIS', 'microsoft-iis'],
  caddy: ['caddy', 'Caddy', 'CADDY', 'caddy-server'],
  litespeed: ['litespeed', 'LiteSpeed', 'LITESPEED', 'openlitespeed', 'OpenLiteSpeed'],
  tomcat: ['tomcat', 'Tomcat', 'TOMCAT', 'apache-tomcat', 'Apache Tomcat'],
  traefik: ['traefik', 'Traefik', 'TRAEFIK', 'traefik-proxy'],

  // ─── Runtimes & Languages ───────────────────────────
  nodejs: ['node.js', 'Node.js', 'nodejs', 'NODEJS', 'NodeJS', 'NODE.JS', 'node-js', 'Node', 'node', 'NODE', 'nodejs-runtime'],
  deno: ['deno', 'Deno', 'DENO'],
  python: ['python', 'Python', 'PYTHON', 'python3', 'Python3', 'PYTHON3', 'cpython'],
  php: ['php', 'PHP', 'Php', 'php8', 'PHP8', 'php7', 'PHP7'],
  ruby: ['ruby', 'Ruby', 'RUBY', 'ruby-on-rails', 'RubyOnRails'],
  java: ['java', 'Java', 'JAVA', 'jdk', 'JDK', 'jre', 'JRE', 'openjdk', 'OpenJDK'],
  go: ['go', 'Go', 'GO', 'golang', 'Golang', 'GOLANG', 'golang-runtime'],
  rust: ['rust', 'Rust', 'RUST', 'rust-lang', 'RustLang'],
  dotnet: ['.net', '.NET', 'dotnet', 'DotNet', 'DOTNET', 'asp.net', 'ASP.NET', 'ASPNET', 'aspnet', 'coreclr', 'dotnet-core'],

  // ─── Frameworks ─────────────────────────────────────
  express: ['express', 'Express', 'EXPRESS', 'expressjs', 'ExpressJS', 'express.js', 'Express.js'],
  react: ['react', 'React', 'REACT', 'reactjs', 'ReactJS', 'react.js', 'React.js'],
  nextjs: ['next.js', 'Next.js', 'nextjs', 'NextJS', 'NEXTJS', 'NEXT.JS', 'next-js', 'NextJs'],
  vue: ['vue', 'Vue', 'VUE', 'vuejs', 'VueJS', 'vue.js', 'Vue.js'],
  angular: ['angular', 'Angular', 'ANGULAR', 'angularjs', 'AngularJS', 'angular.js'],
  svelte: ['svelte', 'Svelte', 'SVELTE', 'sveltekit', 'SvelteKit'],
  spring: ['spring', 'Spring', 'SPRING', 'spring-boot', 'Spring Boot', 'SpringBoot', 'SPRINGBOOT', 'springboot'],
  laravel: ['laravel', 'Laravel', 'LARAVEL'],
  django: ['django', 'Django', 'DJANGO', 'django-framework'],
  flask: ['flask', 'Flask', 'FLASK', 'flask-framework'],
  fastapi: ['fastapi', 'FastAPI', 'FASTAPI', 'fast-api', 'FastApi'],
  rails: ['rails', 'Rails', 'RAILS', 'ruby-on-rails', 'RubyOnRails', 'Ruby on Rails'],
  gin: ['gin', 'Gin', 'GIN', 'gin-gonic', 'GinGonic'],
  nestjs: ['nest.js', 'NestJS', 'nestjs', 'NESTJS', 'Nest', 'nest'],
  nuxt: ['nuxt', 'Nuxt', 'NUXT', 'nuxtjs', 'NuxtJS', 'nuxt.js', 'Nuxt.js'],

  // ─── Databases ──────────────────────────────────────
  mysql: ['mysql', 'MySQL', 'MYSQL', 'mysql-server'],
  postgresql: ['postgresql', 'PostgreSQL', 'POSTGRESQL', 'postgres', 'Postgres', 'POSTGRES', 'psql'],
  mongodb: ['mongodb', 'MongoDB', 'MONGODB', 'mongo', 'Mongo'],
  redis: ['redis', 'Redis', 'REDIS', 'redis-server'],
  sqlite: ['sqlite', 'SQLite', 'SQLITE', 'sqlite3'],
  mssql: ['mssql', 'MSSQL', 'Microsoft SQL Server', 'sql-server', 'SQL Server', 'sqlserver'],
  mariadb: ['mariadb', 'MariaDB', 'MARIADB', 'maria', 'Maria'],

  // ─── CMS & Platforms ────────────────────────────────
  wordpress: ['wordpress', 'WordPress', 'WORDPRESS', 'wp', 'WP'],
  drupal: ['drupal', 'Drupal', 'DRUPAL'],
  joomla: ['joomla', 'Joomla', 'JOOMLA'],
  magento: ['magento', 'Magento', 'MAGENTO'],
  shopify: ['shopify', 'Shopify', 'SHOPIFY'],

  // ─── Cloud & Infrastructure ─────────────────────────
  docker: ['docker', 'Docker', 'DOCKER', 'docker-engine'],
  kubernetes: ['kubernetes', 'Kubernetes', 'KUBERNETES', 'k8s', 'K8s'],
  aws: ['aws', 'AWS', 'Amazon Web Services', 'amazon-web-services'],
  gcp: ['gcp', 'GCP', 'Google Cloud Platform', 'google-cloud'],
  azure: ['azure', 'Azure', 'AZURE', 'Microsoft Azure'],

  // ─── Security Tools ─────────────────────────────────
  openssl: ['openssl', 'OpenSSL', 'OPENSSL', 'ssl', 'SSL'],
  letsencrypt: ['letsencrypt', 'Let\'s Encrypt', 'LetsEncrypt', 'LETSENCRYPT', 'lets-encrypt'],

  // ─── Other ──────────────────────────────────────────
  cloudflare: ['cloudflare', 'Cloudflare', 'CLOUDFLARE', 'CF', 'cf'],
  varnish: ['varnish', 'Varnish', 'VARNISH', 'varnish-cache'],
  haproxy: ['haproxy', 'HAProxy', 'HAPROXY', 'ha-proxy'],
  envoy: ['envoy', 'Envoy', 'ENVOY', 'envoy-proxy'],
});

// ─── Reverse Lookup Map ──────────────────────────────────────

/** Build a reverse map: alias → canonical name */
const REVERSE_MAP: Readonly<Record<string, string>> = buildReverseMap();

function buildReverseMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(TECHNOLOGY_MAP)) {
    map[canonical] = canonical; // Canonical name maps to itself
    for (const alias of aliases) {
      map[alias] = canonical;
      map[alias.toLowerCase()] = canonical;
      map[alias.toUpperCase()] = canonical;
    }
  }
  return Object.freeze(map);
}

// ─── Technology Normalization Result ─────────────────────────

export interface TechnologyNormalizationResult {
  readonly original: string;
  readonly normalized: string;
  readonly wasNormalized: boolean;
  readonly isKnown: boolean;
}

// ─── Technology Normalizer ───────────────────────────────────

/**
 * Normalize a technology name to its canonical form.
 *
 * Resolution order:
 * 1. Exact match in reverse map
 * 2. Case-insensitive match
 * 3. Normalized form (lowercase, no spaces, no dots)
 * 4. Return lowercase of input (best-effort)
 */
export function normalizeTechnology(value: string | undefined | null): TechnologyNormalizationResult {
  if (value === undefined || value === null || value.trim() === '') {
    return { original: value ?? '', normalized: '', wasNormalized: false, isKnown: false };
  }

  const trimmed = value.trim();

  // 1. Exact match
  if (REVERSE_MAP[trimmed]) {
    return {
      original: trimmed,
      normalized: REVERSE_MAP[trimmed],
      wasNormalized: REVERSE_MAP[trimmed] !== trimmed,
      isKnown: true,
    };
  }

  // 2. Case-insensitive match
  const lower = trimmed.toLowerCase();
  if (REVERSE_MAP[lower]) {
    return {
      original: trimmed,
      normalized: REVERSE_MAP[lower],
      wasNormalized: true,
      isKnown: true,
    };
  }

  // 3. Normalize form (remove dots, spaces, hyphens for comparison)
  const stripped = lower.replace(/[\s.\-_]/g, '');
  if (REVERSE_MAP[stripped]) {
    return {
      original: trimmed,
      normalized: REVERSE_MAP[stripped],
      wasNormalized: true,
      isKnown: true,
    };
  }

  // 4. Best-effort: return lowercase
  return {
    original: trimmed,
    normalized: lower,
    wasNormalized: trimmed !== lower,
    isKnown: false,
  };
}

/**
 * Normalize multiple technology names.
 * Deduplicates results.
 */
export function normalizeTechnologyList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeTechnology(value);
    if (normalized.normalized && !seen.has(normalized.normalized)) {
      seen.add(normalized.normalized);
      result.push(normalized.normalized);
    }
  }

  return result;
}

/** Check if a technology name is known */
export function isKnownTechnology(value: string): boolean {
  return normalizeTechnology(value).isKnown;
}

/** Get all known canonical technology names */
export function getKnownTechnologies(): readonly string[] {
  return Object.keys(TECHNOLOGY_MAP);
}

/** Get aliases for a canonical technology name */
export function getTechnologyAliases(canonical: string): readonly string[] {
  return TECHNOLOGY_MAP[canonical] ?? [];
}
