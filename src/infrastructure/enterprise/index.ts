/** INT-013: Enterprise Platform — Unified exports */
export { SamlSsoProvider, OidcSsoProvider, LdapSsoProvider, AdSsoProvider, SsoRouter, createSsoProvider } from './sso/index.js';
export type { SsoProvider, SsoProtocol, SsoCredentials, SsoResult, SsoTokenValidation, SsoUserInfo, SsoConfig, SamlConfig, OidcConfig, LdapConfig, AdConfig } from './sso/index.js';

export { SplunkConnector, QradarConnector, SentinelConnector, ElasticSiemConnector, ChronicleConnector, createSiemConnector } from './siem/index.js';
export type { SiemConnector, SiemType, SiemEvent, SiemSendResult, SiemQuery, SiemQueryResult, SiemConfig } from './siem/index.js';

export { JiraConnector, ServiceNowConnector, GitHubConnector, GitLabConnector, AzureDevOpsConnector, createTicketingConnector } from './ticketing/index.js';
export type { TicketingConnector, TicketingSystem, TicketCreate, TicketUpdate, TicketResult, TicketingConfig } from './ticketing/index.js';

export { SlackNotificationProvider, TeamsNotificationProvider, DiscordNotificationProvider, TelegramNotificationProvider, EmailNotificationProvider, PagerDutyNotificationProvider, OpsGenieNotificationProvider, WebhookNotificationProvider, createNotificationProvider } from './notification/index.js';
export type { NotificationProvider, NotificationChannel, Notification, NotificationResult, NotificationRule, NotificationConfig } from './notification/index.js';

export { ServiceNowCmdbConnector, NetBoxCmdbConnector, BackstageCmdbConnector, createCmdbConnector } from './cmdb/index.js';
export type { CmdbConnector, CmdbSystem, CmdbAsset, CmdbQuery, CmdbSyncResult, CmdbConfig } from './cmdb/index.js';

export { VaultSecretsProvider, AwsSecretsProvider, AzureKvSecretsProvider, GcpSecretManagerProvider, createSecretsProvider } from './secrets/index.js';
export type { SecretsProvider, SecretsBackend, SecretEntry, SecretsConfig } from './secrets/index.js';
