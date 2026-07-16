/** User roles */
export type Role = 'viewer' | 'operator' | 'security-analyst' | 'administrator';

/** Permissions */
export type Permission =
  | 'report.read' | 'report.write'
  | 'finding.read' | 'finding.delete'
  | 'risk.read'
  | 'attack.read'
  | 'recommendation.read' | 'recommendation.write'
  | 'explanation.read'
  | 'snapshot.create' | 'snapshot.restore'
  | 'config.read' | 'config.write'
  | 'admin.users' | 'admin.roles' | 'admin.system';

/** Role-Permission mapping (RBAC) */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [
    'report.read', 'finding.read', 'risk.read', 'attack.read',
    'recommendation.read', 'explanation.read',
  ],
  operator: [
    'report.read', 'report.write', 'finding.read', 'risk.read', 'attack.read',
    'recommendation.read', 'explanation.read', 'snapshot.create', 'snapshot.restore',
  ],
  'security-analyst': [
    'report.read', 'report.write', 'finding.read', 'finding.delete', 'risk.read',
    'attack.read', 'recommendation.read', 'recommendation.write', 'explanation.read',
    'snapshot.create', 'snapshot.restore',
  ],
  administrator: [
    'report.read', 'report.write', 'finding.read', 'finding.delete', 'risk.read',
    'attack.read', 'recommendation.read', 'recommendation.write', 'explanation.read',
    'snapshot.create', 'snapshot.restore', 'config.read', 'config.write',
    'admin.users', 'admin.roles', 'admin.system',
  ],
};

/** Authenticated user */
export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string;
  roles: Role[];
  permissions: Permission[];
  authProvider: string;
  authenticatedAt: Date;
  expiresAt?: Date;
}

/** Auth result */
export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  token?: string;
}

/** JWT payload */
export interface JwtPayload {
  sub: string;
  username: string;
  email?: string;
  roles: Role[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/** API Key record */
export interface ApiKeyRecord {
  id: string;
  keyHash: string;
  name: string;
  roles: Role[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  enabled: boolean;
}

/** Auth provider interface */
export interface AuthProvider {
  authenticate(token: string): Promise<AuthResult>;
}
