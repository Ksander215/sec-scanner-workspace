/** INT-011G: Multi-tenancy — Engine */
import type {
  Tenant, TenantPlan, TenantConfig, TenantQuotas, TenantUsage,
  TenantRole, TenantPermission, TenantUser, TenantResourceLimit, TenantStatus,
} from './types.js';

const PLAN_DEFAULTS: Record<TenantPlan, { config: Partial<TenantConfig>; quotas: TenantQuotas }> = {
  free: {
    config: { dataIsolation: 'row', encryptionEnabled: true, auditLogging: false, ssoEnabled: false, customBranding: false, retentionDays: 30, maxUsers: 3, features: ['basic-scan'] },
    quotas: { maxScans: 10, maxFindings: 1000, maxReports: 5, maxStorageMb: 100, maxApiCalls: 1000, maxConcurrentPipelines: 1 },
  },
  starter: {
    config: { dataIsolation: 'schema', encryptionEnabled: true, auditLogging: true, ssoEnabled: false, customBranding: false, retentionDays: 90, maxUsers: 10, features: ['basic-scan', 'risk-assessment', 'recommendations'] },
    quotas: { maxScans: 100, maxFindings: 10000, maxReports: 50, maxStorageMb: 1024, maxApiCalls: 10000, maxConcurrentPipelines: 3 },
  },
  professional: {
    config: { dataIsolation: 'schema', encryptionEnabled: true, auditLogging: true, ssoEnabled: true, customBranding: true, retentionDays: 365, maxUsers: 50, features: ['basic-scan', 'risk-assessment', 'recommendations', 'attack-paths', 'explainability', 'api-access'] },
    quotas: { maxScans: 1000, maxFindings: 100000, maxReports: 500, maxStorageMb: 10240, maxApiCalls: 100000, maxConcurrentPipelines: 10 },
  },
  enterprise: {
    config: { dataIsolation: 'database', encryptionEnabled: true, auditLogging: true, ssoEnabled: true, customBranding: true, retentionDays: -1, maxUsers: -1, features: ['*'] },
    quotas: { maxScans: -1, maxFindings: -1, maxReports: -1, maxStorageMb: -1, maxApiCalls: -1, maxConcurrentPipelines: -1 },
  },
};

export class MultiTenancyEngine {
  private tenants: Map<string, Tenant> = new Map();
  private roles: Map<string, Map<string, TenantRole>> = new Map(); // tenantId -> roleId -> role
  private users: Map<string, Map<string, TenantUser>> = new Map(); // tenantId -> userId -> user
  private usage: Map<string, TenantUsage[]> = new Map(); // tenantId -> usage records

  /** Create a new tenant */
  createTenant(name: string, slug: string, plan: TenantPlan, options?: { config?: Partial<TenantConfig>; quotas?: Partial<TenantQuotas> }): Tenant {
    const defaults = PLAN_DEFAULTS[plan];
    const tenant: Tenant = {
      id: crypto.randomUUID(),
      name,
      slug,
      status: 'provisioning',
      plan,
      config: { ...defaults.config, ...options?.config } as TenantConfig,
      quotas: { ...defaults.quotas, ...options?.quotas },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenant.id, tenant);
    this.roles.set(tenant.id, new Map());
    this.users.set(tenant.id, new Map());
    this.usage.set(tenant.id, []);

    // Create default roles
    this.createDefaultRoles(tenant.id);

    // Mark as active
    tenant.status = 'active';
    return tenant;
  }

  /** Get tenant by ID */
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  /** Get tenant by slug */
  getTenantBySlug(slug: string): Tenant | undefined {
    return [...this.tenants.values()].find(t => t.slug === slug);
  }

  /** Update tenant */
  updateTenant(tenantId: string, updates: Partial<Pick<Tenant, 'name' | 'plan' | 'config' | 'quotas'>>): Tenant | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    if (updates.name) tenant.name = updates.name;
    if (updates.plan) {
      tenant.plan = updates.plan;
      const defaults = PLAN_DEFAULTS[updates.plan];
      tenant.quotas = { ...defaults.quotas, ...updates.quotas };
    }
    if (updates.config) tenant.config = { ...tenant.config, ...updates.config };
    if (updates.quotas) tenant.quotas = { ...tenant.quotas, ...updates.quotas };
    tenant.updatedAt = new Date();

    return tenant;
  }

  /** Suspend tenant */
  suspendTenant(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;
    tenant.status = 'suspended';
    return true;
  }

  /** Delete tenant */
  deleteTenant(tenantId: string): boolean {
    this.roles.delete(tenantId);
    this.users.delete(tenantId);
    this.usage.delete(tenantId);
    return this.tenants.delete(tenantId);
  }

  /** Add user to tenant */
  addUser(tenantId: string, userId: string, roleNames: string[]): TenantUser | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    const tenantUsers = this.users.get(tenantId)!;
    const user: TenantUser = {
      id: crypto.randomUUID(),
      tenantId,
      userId,
      roles: roleNames,
      status: 'active',
      joinedAt: new Date(),
    };

    tenantUsers.set(userId, user);
    return user;
  }

  /** Remove user from tenant */
  removeUser(tenantId: string, userId: string): boolean {
    return this.users.get(tenantId)?.delete(userId) ?? false;
  }

  /** Check if user has permission in tenant */
  hasPermission(tenantId: string, userId: string, permission: TenantPermission): boolean {
    const tenantUsers = this.users.get(tenantId);
    if (!tenantUsers) return false;
    const user = tenantUsers.get(userId);
    if (!user || user.status !== 'active') return false;

    const tenantRoles = this.roles.get(tenantId);
    if (!tenantRoles) return false;

    for (const roleName of user.roles) {
      const role = [...tenantRoles.values()].find(r => r.name === roleName);
      if (role && role.permissions.includes(permission)) return true;
      if (role && role.permissions.includes('*' as TenantPermission)) return true;
    }

    return false;
  }

  /** Check resource limit */
  checkResourceLimit(tenantId: string, resource: keyof TenantQuotas): TenantResourceLimit | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    const limit = tenant.quotas[resource];
    const usageRecords = this.usage.get(tenantId) ?? [];
    const current = usageRecords.length > 0 ? usageRecords[usageRecords.length - 1][resource] : 0;

    return {
      resource,
      current: current as number,
      limit,
      unit: resource.replace('max', '').toLowerCase(),
      percentageUsed: limit === -1 ? 0 : ((current as number) / limit) * 100,
    };
  }

  /** Record usage */
  recordUsage(tenantId: string, usage: Partial<TenantUsage>): void {
    const records = this.usage.get(tenantId);
    if (!records) return;

    const current = records.length > 0 ? records[records.length - 1] : {
      tenantId, period: new Date().toISOString().slice(0, 7),
      scans: 0, findings: 0, reports: 0, storageMb: 0, apiCalls: 0, concurrentPipelines: 0,
    };

    records.push({ ...current, ...usage, period: new Date().toISOString().slice(0, 7) });
  }

  /** List all tenants */
  listTenants(filter?: { status?: TenantStatus; plan?: TenantPlan }): Tenant[] {
    let tenants = [...this.tenants.values()];
    if (filter?.status) tenants = tenants.filter(t => t.status === filter.status);
    if (filter?.plan) tenants = tenants.filter(t => t.plan === filter.plan);
    return tenants;
  }

  /** Get statistics */
  getStatistics(): { totalTenants: number; byPlan: Record<TenantPlan, number>; byStatus: Record<TenantStatus, number>; totalUsers: number } {
    const byPlan: Record<TenantPlan, number> = { free: 0, starter: 0, professional: 0, enterprise: 0 };
    const byStatus: Record<TenantStatus, number> = { active: 0, suspended: 0, provisioning: 0, deleting: 0 };
    let totalUsers = 0;

    for (const tenant of this.tenants.values()) {
      byPlan[tenant.plan]++;
      byStatus[tenant.status]++;
      totalUsers += this.users.get(tenant.id)?.size ?? 0;
    }

    return { totalTenants: this.tenants.size, byPlan, byStatus, totalUsers };
  }

  private createDefaultRoles(tenantId: string): void {
    const roleMap = this.roles.get(tenantId)!;

    const roles: TenantRole[] = [
      {
        id: crypto.randomUUID(), tenantId, name: 'viewer',
        permissions: ['scan.read', 'finding.read', 'report.read', 'risk.read', 'attack.read', 'recommendation.read'],
      },
      {
        id: crypto.randomUUID(), tenantId, name: 'analyst',
        permissions: ['scan.execute', 'scan.read', 'finding.read', 'finding.write', 'report.read', 'report.create', 'risk.read', 'attack.read', 'recommendation.read', 'recommendation.write'],
      },
      {
        id: crypto.randomUUID(), tenantId, name: 'admin',
        permissions: ['*'] as unknown as TenantPermission[],
      },
    ];

    for (const role of roles) {
      roleMap.set(role.id, role);
    }
  }
}
