import type { AuthProvider, AuthResult, AuthenticatedUser, Role, Permission } from './types.js';
import { ROLE_PERMISSIONS } from './types.js';

export interface OAuth2ProviderConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
  defaultRoles: Role[];
}

export class OAuth2AuthProvider implements AuthProvider {
  private config: OAuth2ProviderConfig;
  private jwksCache: Map<string, object> = new Map();

  constructor(config: OAuth2ProviderConfig) {
    this.config = config;
  }

  async authenticate(token: string): Promise<AuthResult> {
    try {
      // In production, validate the token against the OIDC provider's JWKS endpoint
      // For now, we do a simplified validation
      const payload = this.decodeToken(token);

      if (!payload.sub) {
        return { success: false, error: 'Missing subject in token' };
      }

      const roles = this.extractRoles(payload);
      const user: AuthenticatedUser = {
        id: payload.sub,
        username: payload.preferred_username ?? payload.sub,
        email: payload.email,
        roles,
        permissions: this.getPermissions(roles),
        authProvider: 'oauth2',
        authenticatedAt: new Date(),
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
      };

      return { success: true, user };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /** Get authorization URL for OAuth2 flow */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
    });
    return `${this.config.issuerUrl}/authorize?${params.toString()}`;
  }

  /** Exchange authorization code for tokens */
  async exchangeCode(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const response = await fetch(`${this.config.issuerUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  }

  private decodeToken(token: string): Record<string, any> {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    try {
      return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    } catch {
      throw new Error('Failed to decode token');
    }
  }

  private extractRoles(payload: Record<string, any>): Role[] {
    // Try to extract from common OIDC claims
    const roles: Role[] = [];
    const realmRoles = payload.realm_access?.roles ?? [];
    const resourceRoles = payload.resource_access?.['si-platform']?.roles ?? [];
    const customRoles = payload.roles ?? [];

    for (const role of [...realmRoles, ...resourceRoles, ...customRoles]) {
      if (['viewer', 'operator', 'security-analyst', 'administrator'].includes(role)) {
        roles.push(role as Role);
      }
    }

    return roles.length > 0 ? roles : this.config.defaultRoles;
  }

  private getPermissions(roles: Role[]): Permission[] {
    const perms = new Set<Permission>();
    for (const role of roles) {
      for (const perm of ROLE_PERMISSIONS[role] ?? []) {
        perms.add(perm);
      }
    }
    return [...perms];
  }
}
