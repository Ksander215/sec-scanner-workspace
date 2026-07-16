import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthProvider, AuthResult, AuthenticatedUser, JwtPayload, Role, Permission } from './types.js';
import { ROLE_PERMISSIONS } from './types.js';

export interface JwtProviderConfig {
  secret: string;
  algorithm: 'HS256' | 'HS384' | 'HS512';
  issuer: string;
  audience: string;
  accessTokenTtl: string;
}

export class JwtAuthProvider implements AuthProvider {
  private config: JwtProviderConfig;

  constructor(config: JwtProviderConfig) {
    this.config = config;
  }

  async authenticate(token: string): Promise<AuthResult> {
    try {
      const payload = this.verifyToken(token);
      const user: AuthenticatedUser = {
        id: payload.sub,
        username: payload.username,
        email: payload.email,
        roles: payload.roles,
        permissions: this.getPermissions(payload.roles),
        authProvider: 'jwt',
        authenticatedAt: new Date(),
        expiresAt: new Date(payload.exp * 1000),
      };
      return { success: true, user, token };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /** Generate a JWT token */
  generateToken(userId: string, username: string, roles: Role[], email?: string): string {
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = this.parseTtl(this.config.accessTokenTtl);
    const payload: JwtPayload = {
      sub: userId,
      username,
      email,
      roles,
      iat: now,
      exp: now + ttlSeconds,
      iss: this.config.issuer,
      aud: this.config.audience,
    };
    const header = { alg: this.config.algorithm, typ: 'JWT' };
    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(`${headerB64}.${payloadB64}`);
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  private verifyToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = this.sign(`${headerB64}.${payloadB64}`);

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      throw new Error('Invalid JWT signature');
    }

    const payload: JwtPayload = JSON.parse(this.base64UrlDecode(payloadB64));

    if (payload.iss !== this.config.issuer) throw new Error('Invalid issuer');
    if (payload.aud !== this.config.audience) throw new Error('Invalid audience');
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');

    return payload;
  }

  private sign(input: string): string {
    const algo = `sha${this.config.algorithm.slice(2)}`;
    return createHmac(algo, this.config.secret).update(input).digest('base64url');
  }

  private base64UrlEncode(input: string): string {
    return Buffer.from(input).toString('base64url');
  }

  private base64UrlDecode(input: string): string {
    return Buffer.from(input, 'base64url').toString('utf-8');
  }

  private parseTtl(ttl: string): number {
    const match = ttl.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 900; // default 15m
    const val = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 900;
    }
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
