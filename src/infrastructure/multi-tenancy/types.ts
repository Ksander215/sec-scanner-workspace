/** INT-011G: Multi-tenancy — Types */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  config: TenantConfig;
  quotas: TenantQuotas;
  createdAt: Date;
  updatedAt: Date;
}

export type TenantStatus = 'active' | 'suspended' | 'provisioning' | 'deleting';
export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface TenantConfig {
  dataIsolation: 'schema' | 'database' | 'row';
  encryptionEnabled: boolean;
  auditLogging: boolean;
  ssoEnabled: boolean;
  customBranding: boolean;
  retentionDays: number;
  maxUsers: number;
  features: string[];
}

export interface TenantQuotas {
  maxScans: number;
  maxFindings: number;
  maxReports: number;
  maxStorageMb: number;
  maxApiCalls: number;
  maxConcurrentPipelines: number;
}

export interface TenantUsage {
  tenantId: string;
  period: string;
  scans: number;
  findings: number;
  reports: number;
  storageMb: number;
  apiCalls: number;
  concurrentPipelines: number;
}

export interface TenantRole {
  id: string;
  tenantId: string;
  name: string;
  permissions: TenantPermission[];
  inheritedFrom?: string;
}

export type TenantPermission =
  | 'scan.execute' | 'scan.read'
  | 'finding.read' | 'finding.write' | 'finding.delete'
  | 'report.read' | 'report.create' | 'report.export'
  | 'risk.read'
  | 'attack.read'
  | 'recommendation.read' | 'recommendation.write'
  | 'admin.users' | 'admin.roles' | 'admin.settings' | 'admin.billing';

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  roles: string[];
  status: 'active' | 'suspended' | 'invited';
  joinedAt: Date;
}

export interface TenantResourceLimit {
  resource: string;
  current: number;
  limit: number;
  unit: string;
  percentageUsed: number;
}
