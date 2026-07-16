import { createHash, timingSafeEqual } from 'node:crypto';
import type { AuthProvider, AuthResult, AuthenticatedUser, ApiKeyRecord, Role, Permission } from './types.js';
import { ROLE_PERMISSIONS } from './types.js';

export class ApiKeyAuthProvider implements AuthProvider {
  private keys: Map<string, ApiKeyRecord> = new Map();

  constructor(keys?: ApiKeyRecord[]) {
    if (keys) {
      for (const key of keys) {
        this.keys.set(key.id, key);
      }
    }
  }

  /** Register a new API key */
  registerKey(name: string, roles: Role[], ttlDays?: number): { id: string; key: string } {
    const id = crypto.randomUUID();
    const rawKey = `si_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyHash = this.hashKey(rawKey);

    const record: ApiKeyRecord = {
      id,
      keyHash,
      name,
      roles,
      createdAt: new Date(),
      expiresAt: ttlDays ? new Date(Date.now() + ttlDays * 86400000) : undefined,
      enabled: true,
    };

    this.keys.set(id, record);
    return { id, key: rawKey };
  }

  async authenticate(token: string): Promise<AuthResult> {
    // Find key by hash
    const tokenHash = this.hashKey(token);

    for (const [id, record] of this.keys) {
      if (!record.enabled) continue;
      if (record.expiresAt && record.expiresAt < new Date()) continue;

      if (timingSafeEqual(Buffer.from(record.keyHash), Buffer.from(tokenHash))) {
        record.lastUsedAt = new Date();

        const perms = this.getPermissions(record.roles);
        const user: AuthenticatedUser = {
          id,
          username: record.name,
          roles: record.roles,
          permissions: perms,
          authProvider: 'api-key',
          authenticatedAt: new Date(),
        };
        return { success: true, user };
      }
    }

    return { success: false, error: 'Invalid API key' };
  }

  /** Revoke an API key */
  revokeKey(id: string): boolean {
    const record = this.keys.get(id);
    if (record) {
      record.enabled = false;
      return true;
    }
    return false;
  }

  /** List all keys (without hashes) */
  listKeys(): Array<Omit<ApiKeyRecord, 'keyHash'>> {
    return [...this.keys.values()].map(({ keyHash: _, ...rest }) => rest);
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
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
