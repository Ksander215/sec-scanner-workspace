/** INT-013: CMDB — Types */
export type CmdbSystem = 'servicenow' | 'netbox' | 'backstage';

export interface CmdbConnector {
  readonly system: CmdbSystem;
  getAsset(id: string): Promise<CmdbAsset | null>;
  searchAssets(query: CmdbQuery): Promise<CmdbAsset[]>;
  createAsset(asset: Omit<CmdbAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<CmdbAsset>;
  updateAsset(id: string, updates: Partial<CmdbAsset>): Promise<CmdbAsset>;
  deleteAsset(id: string): Promise<boolean>;
  getRelatedAssets(id: string): Promise<CmdbAsset[]>;
  sync(): Promise<CmdbSyncResult>;
  health(): Promise<{ available: boolean }>;
}

export interface CmdbAsset {
  id: string;
  type: 'server' | 'application' | 'database' | 'network' | 'container' | 'service' | 'cloud-resource';
  name: string;
  displayName: string;
  environment: 'production' | 'staging' | 'development' | 'test';
  owner?: string;
  tags: string[];
  attributes: Record<string, unknown>;
  relationships: CmdbRelationship[];
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export interface CmdbRelationship {
  targetId: string;
  type: 'depends-on' | 'runs-on' | 'connects-to' | 'contains' | 'manages';
}

export interface CmdbQuery {
  type?: string;
  environment?: string;
  owner?: string;
  tags?: string[];
  status?: string;
  search?: string;
  limit?: number;
}

export interface CmdbSyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: number;
  syncedAt: Date;
}

export interface CmdbConfig {
  system: CmdbSystem;
  endpoint: string;
  token?: string;
  syncIntervalMs?: number;
}
