/** INT-019: Cloud — Types */

export type CloudProvider = 'aws' | 'azure' | 'gcp';
export type CloudResourceType = 'compute' | 'storage' | 'network' | 'database' | 'identity' | 'serverless' | 'container' | 'kubernetes' | 'serverless-function' | 'queue' | 'cdn' | 'dns' | 'certificate' | 'load-balancer' | 'security-group' | 'iam-role' | 'iam-policy' | 'key-vault' | 'log';

export interface CloudInventory {
  provider: CloudProvider;
  resources: CloudResource[];
  scannedAt: Date;
  account?: string;
  region?: string;
}

export interface CloudResource {
  id: string;
  provider: CloudProvider;
  type: CloudResourceType;
  name: string;
  region: string;
  account: string;
  status: 'active' | 'stopped' | 'terminated' | 'error' | 'unknown';
  tags: Record<string, string>;
  configuration: Record<string, unknown>;
  securityFindings: CloudSecurityFinding[];
  relationships: CloudRelationship[];
  discoveredAt: Date;
  updatedAt: Date;
}

export interface CloudSecurityFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  remediation: string;
  compliance: string[];
  confidence: number;
}

export interface CloudRelationship {
  targetId: string;
  type: 'depends-on' | 'connects-to' | 'contains' | 'uses' | 'manages' | 'exposes';
}

export interface CloudConnector {
  readonly provider: CloudProvider;
  discover(options?: CloudDiscoverOptions): Promise<CloudInventory>;
  getResource(resourceId: string): Promise<CloudResource | null>;
  listResources(type?: CloudResourceType, region?: string): Promise<CloudResource[]>;
  scanSecurity(resourceIds?: string[]): Promise<CloudSecurityFinding[]>;
  health(): Promise<{ available: boolean; regions?: string[] }>;
}

export interface CloudDiscoverOptions {
  regions?: string[];
  types?: CloudResourceType[];
  tags?: Record<string, string>;
  deepScan?: boolean;
}

export interface KubernetesCluster {
  name: string;
  version: string;
  nodes: K8sNode[];
  namespaces: string[];
  pods: K8sPod[];
  services: K8sService[];
  ingress: K8sIngress[];
  networkPolicies: K8sNetworkPolicy[];
}

export interface K8sNode {
  name: string;
  status: 'Ready' | 'NotReady';
  roles: string[];
  version: string;
  labels: Record<string, string>;
}

export interface K8sPod {
  name: string;
  namespace: string;
  containers: Array<{ name: string; image: string; ports: number[] }>;
  labels: Record<string, string>;
  status: string;
}

export interface K8sService {
  name: string;
  namespace: string;
  type: string;
  clusterIp?: string;
  ports: Array<{ port: number; targetPort: number }>;
}

export interface K8sIngress {
  name: string;
  namespace: string;
  hosts: string[];
  tls: boolean;
  backend: string;
}

export interface K8sNetworkPolicy {
  name: string;
  namespace: string;
  podSelector: Record<string, string>;
  ingress: unknown[];
  egress: unknown[];
}

export interface CloudConfig {
  provider: CloudProvider;
  region?: string;
  credentials?: Record<string, string>;
  discoverIntervalMs?: number;
}
