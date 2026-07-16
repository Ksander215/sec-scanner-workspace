/** Configuration source priority (lowest to highest) */
export type ConfigSource = 'defaults' | 'config-file' | 'local-override' | 'environment' | 'cli-flags';

/** Configuration schema definition */
export interface ConfigSchema {
  $id: string;
  $version: number;
  properties: Record<string, ConfigPropertySchema>;
}

export interface ConfigPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  default?: unknown;
  required?: boolean;
  env?: string; // environment variable name
  cliFlag?: string; // CLI flag name
  secret?: boolean; // mark as secret (masked in output)
  min?: number;
  max?: number;
  enum?: string[];
  pattern?: string;
  deprecated?: boolean;
  replacedBy?: string;
}

/** Complete platform configuration */
export interface PlatformConfiguration {
  /** API server configuration */
  server: ServerConfiguration;
  /** Authentication configuration */
  auth: AuthConfiguration;
  /** Persistence configuration */
  persistence: PersistenceConfiguration;
  /** Analysis pipeline configuration */
  analysis: AnalysisConfiguration;
  /** Observability configuration */
  observability: ObservabilityConfiguration;
  /** Security configuration */
  security: SecurityConfiguration;
  /** Plugin configuration */
  plugins: PluginsConfiguration;
  /** Audit configuration */
  audit: AuditConfiguration;
  /** Background jobs configuration */
  jobs: JobsConfiguration;
  /** Metadata */
  $meta: ConfigMetadata;
}

export interface ServerConfiguration {
  host: string;
  port: number;
  cors: boolean;
  corsOrigins: string[];
  compression: boolean;
  requestBodyLimit: string;
  requestTimeout: number;
  gracefulShutdownTimeout: number;
}

export interface AuthConfiguration {
  enabled: boolean;
  provider: 'none' | 'jwt' | 'api-key' | 'oauth2';
  jwt: JwtConfiguration;
  apiKey: ApiKeyConfiguration;
  oauth2: OAuth2Configuration;
  session: SessionConfiguration;
}

export interface JwtConfiguration {
  secret: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  issuer: string;
  audience: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
}

export interface ApiKeyConfiguration {
  header: string;
  queryParam: string;
  keys: ApiKeyEntry[];
}

export interface ApiKeyEntry {
  key: string;
  name: string;
  roles: string[];
}

export interface OAuth2Configuration {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

export interface SessionConfiguration {
  cookieName: string;
  cookieSecure: boolean;
  cookieHttpOnly: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
  ttl: string;
}

export interface PersistenceConfiguration {
  backend: 'json' | 'sqlite' | 'postgres' | 'neo4j' | 'redis';
  dataDir: string;
  connection: ConnectionConfiguration;
  pool: PoolConfiguration;
  snapshot: SnapshotConfiguration;
  migration: MigrationConfiguration;
}

export interface ConnectionConfiguration {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  sslCert: string;
}

export interface PoolConfiguration {
  min: number;
  max: number;
  idleTimeout: number;
}

export interface SnapshotConfiguration {
  enabled: boolean;
  directory: string;
  format: 'json' | 'jsonl' | 'gzip';
  retention: number;
}

export interface MigrationConfiguration {
  autoRun: boolean;
  directory: string;
}

export interface AnalysisConfiguration {
  defaultOptions: AnalysisOptionsConfiguration;
  pipeline: PipelineConfiguration;
  risk: RiskConfigConfiguration;
  attackPath: AttackPathConfigConfiguration;
}

export interface AnalysisOptionsConfiguration {
  explain: boolean;
  includeAttackPaths: boolean;
  includeImpact: boolean;
  persist: boolean;
}

export interface PipelineConfiguration {
  maxConcurrent: number;
  stageTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface RiskConfigConfiguration {
  severityWeight: number;
  confidenceWeight: number;
  exposureWeight: number;
  impactWeight: number;
  exploitabilityWeight: number;
  correlationMultiplier: number;
}

export interface AttackPathConfigConfiguration {
  maxDepth: number;
  maxPaths: number;
  minRiskScore: number;
}

export interface ObservabilityConfiguration {
  enabled: boolean;
  tracing: TracingConfiguration;
  metrics: MetricsConfiguration;
  logging: LoggingConfiguration;
}

export interface TracingConfiguration {
  enabled: boolean;
  provider: 'none' | 'jaeger' | 'otlp';
  endpoint: string;
  sampleRate: number;
}

export interface MetricsConfiguration {
  enabled: boolean;
  provider: 'prometheus' | 'otlp';
  path: string;
  defaultLabels: Record<string, string>;
}

export interface LoggingConfiguration {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'text';
  output: 'stdout' | 'file';
  filePath: string;
}

export interface SecurityConfiguration {
  rateLimit: RateLimitConfiguration;
  headers: SecurityHeadersConfiguration;
  cors: CorsSecurityConfiguration;
  payload: PayloadConfiguration;
}

export interface RateLimitConfiguration {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests: boolean;
}

export interface SecurityHeadersConfiguration {
  enabled: boolean;
  contentSecurityPolicy: string;
  strictTransportSecurity: string;
  xFrameOptions: string;
  xContentTypeOptions: string;
  referrerPolicy: string;
}

export interface CorsSecurityConfiguration {
  enabled: boolean;
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface PayloadConfiguration {
  maxJsonSize: string;
  maxFindingsPerRequest: number;
  sanitizeHtml: boolean;
}

export interface PluginsConfiguration {
  directory: string;
  autoLoad: boolean;
  enabled: string[];
  disabled: string[];
}

export interface AuditConfiguration {
  enabled: boolean;
  backend: 'json' | 'database';
  directory: string;
  retention: number;
  logInternal: boolean;
}

export interface JobsConfiguration {
  enabled: boolean;
  backend: 'memory' | 'redis';
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
  cleanupInterval: number;
}

export interface ConfigMetadata {
  version: number;
  source: Record<string, ConfigSource>;
  loadedAt: string;
  filePath: string;
  checksum: string;
}

/** Config validation result */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: unknown;
  schema?: ConfigPropertySchema;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/** Config change event for hot reload */
export interface ConfigChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: ConfigSource;
  timestamp: Date;
}

export type ConfigChangeHandler = (event: ConfigChangeEvent) => void;

/** Config migration */
export interface ConfigMigration {
  fromVersion: number;
  toVersion: number;
  migrate(config: Record<string, unknown>): Record<string, unknown>;
  description: string;
}
