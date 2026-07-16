/** INT-013: Enterprise SSO — Types */

export type SsoProtocol = 'saml' | 'oidc' | 'ldap' | 'ad';

export interface SsoProvider {
  readonly protocol: SsoProtocol;
  readonly name: string;
  authenticate(credentials: SsoCredentials): Promise<SsoResult>;
  validateToken(token: string): Promise<SsoTokenValidation>;
  refreshToken(token: string): Promise<SsoResult>;
  getUserInfo(token: string): Promise<SsoUserInfo>;
  logout(token: string): Promise<void>;
  health(): Promise<{ available: boolean; latencyMs: number }>;
}

export interface SsoCredentials {
  protocol: SsoProtocol;
  /** SAML assertion / OIDC auth code / LDAP bind DN / AD credentials */
  payload: Record<string, unknown>;
  redirectUri?: string;
}

export interface SsoResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: SsoUserInfo;
  error?: string;
}

export interface SsoTokenValidation {
  valid: boolean;
  expired: boolean;
  user?: SsoUserInfo;
  expiresAt?: Date;
  error?: string;
}

export interface SsoUserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
  groups: string[];
  attributes: Record<string, string[]>;
  provider: SsoProtocol;
}

export interface SamlConfig {
  protocol: 'saml';
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  cert: string;
  signatureAlgorithm?: string;
  wantAssertionsSigned?: boolean;
}

export interface OidcConfig {
  protocol: 'oidc';
  issuer: string;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
  scopes: string[];
}

export interface LdapConfig {
  protocol: 'ldap';
  url: string;
  bindDN: string;
  bindPassword: string;
  searchBase: string;
  searchFilter: string;
  groupSearchBase?: string;
  groupSearchFilter?: string;
  tlsOptions?: Record<string, unknown>;
}

export interface AdConfig {
  protocol: 'ad';
  url: string;
  domain: string;
  baseDN: string;
  username: string;
  password: string;
  tlsOptions?: Record<string, unknown>;
}

export type SsoConfig = SamlConfig | OidcConfig | LdapConfig | AdConfig;
