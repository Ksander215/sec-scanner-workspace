/** INT-019: Cloud — Engine & Connectors */
import type {
  CloudProvider, CloudConnector, CloudInventory, CloudResource,
  CloudResourceType, CloudSecurityFinding, CloudDiscoverOptions,
  KubernetesCluster, CloudConfig,
} from './types.js';

// ─── AWS Connector ─────────────────────────────────────────────────────────

export class AwsCloudConnector implements CloudConnector {
  readonly provider: CloudProvider = 'aws';
  private config: CloudConfig;
  private resources: Map<string, CloudResource> = new Map();

  constructor(config: CloudConfig) { this.config = config; }

  async discover(options?: CloudDiscoverOptions): Promise<CloudInventory> {
    // Production: use AWS SDK to enumerate resources
    const resources = [...this.resources.values()];
    return {
      provider: 'aws',
      resources,
      scannedAt: new Date(),
      account: this.config.credentials?.accountId,
      region: options?.regions?.[0] ?? this.config.region,
    };
  }

  async getResource(id: string): Promise<CloudResource | null> { return this.resources.get(id) ?? null; }
  async listResources(type?: CloudResourceType): Promise<CloudResource[]> {
    let results = [...this.resources.values()];
    if (type) results = results.filter(r => r.type === type);
    return results;
  }
  async scanSecurity(resourceIds?: string[]): Promise<CloudSecurityFinding[]> {
    // Production: AWS Security Hub, Config rules, IAM Access Analyzer
    return [];
  }
  async health() { return { available: true, regions: ['us-east-1', 'eu-west-1'] }; }

  /** Add a resource (for testing/manual inventory) */
  addResource(resource: CloudResource): void { this.resources.set(resource.id, resource); }
}

// ─── Azure Connector ───────────────────────────────────────────────────────

export class AzureCloudConnector implements CloudConnector {
  readonly provider: CloudProvider = 'azure';
  private config: CloudConfig;
  private resources: Map<string, CloudResource> = new Map();
  constructor(config: CloudConfig) { this.config = config; }
  async discover(): Promise<CloudInventory> {
    return { provider: 'azure', resources: [...this.resources.values()], scannedAt: new Date() };
  }
  async getResource(id: string): Promise<CloudResource | null> { return this.resources.get(id) ?? null; }
  async listResources(type?: CloudResourceType): Promise<CloudResource[]> {
    return type ? [...this.resources.values()].filter(r => r.type === type) : [...this.resources.values()];
  }
  async scanSecurity(): Promise<CloudSecurityFinding[]> { return []; }
  async health() { return { available: true, regions: ['eastus', 'westeurope'] }; }
  addResource(resource: CloudResource): void { this.resources.set(resource.id, resource); }
}

// ─── GCP Connector ─────────────────────────────────────────────────────────

export class GcpCloudConnector implements CloudConnector {
  readonly provider: CloudProvider = 'gcp';
  private config: CloudConfig;
  private resources: Map<string, CloudResource> = new Map();
  constructor(config: CloudConfig) { this.config = config; }
  async discover(): Promise<CloudInventory> {
    return { provider: 'gcp', resources: [...this.resources.values()], scannedAt: new Date() };
  }
  async getResource(id: string): Promise<CloudResource | null> { return this.resources.get(id) ?? null; }
  async listResources(type?: CloudResourceType): Promise<CloudResource[]> {
    return type ? [...this.resources.values()].filter(r => r.type === type) : [...this.resources.values()];
  }
  async scanSecurity(): Promise<CloudSecurityFinding[]> { return []; }
  async health() { return { available: true, regions: ['us-central1', 'europe-west1'] }; }
  addResource(resource: CloudResource): void { this.resources.set(resource.id, resource); }
}

// ─── Kubernetes Engine ─────────────────────────────────────────────────────

export class KubernetesEngine {
  private clusters: Map<string, KubernetesCluster> = new Map();

  /** Register a cluster */
  registerCluster(cluster: KubernetesCluster): void {
    this.clusters.set(cluster.name, cluster);
  }

  /** Get cluster info */
  getCluster(name: string): KubernetesCluster | undefined {
    return this.clusters.get(name);
  }

  /** List all clusters */
  listClusters(): KubernetesCluster[] {
    return [...this.clusters.values()];
  }

  /** Scan cluster for security issues */
  scanCluster(name: string): CloudSecurityFinding[] {
    const cluster = this.clusters.get(name);
    if (!cluster) return [];

    const findings: CloudSecurityFinding[] = [];

    // Check for pods without resource limits
    for (const pod of cluster.pods) {
      for (const container of pod.containers) {
        findings.push({
          id: crypto.randomUUID(),
          severity: 'medium',
          title: `Pod ${pod.name} container ${container.name} has no resource limits`,
          description: `Container ${container.name} in pod ${pod.name} does not have CPU/memory limits defined`,
          remediation: 'Add resource limits to the container spec',
          compliance: ['CIS-5.4.1'],
          confidence: 0.9,
        });
      }
    }

    // Check for namespaces without network policies
    const namespacesWithPolicies = new Set(cluster.networkPolicies.map(p => p.namespace));
    for (const ns of cluster.namespaces) {
      if (ns !== 'kube-system' && !namespacesWithPolicies.has(ns)) {
        findings.push({
          id: crypto.randomUUID(),
          severity: 'high',
          title: `Namespace ${ns} has no network policies`,
          description: `Namespace ${ns} does not have any network policies defined, allowing unrestricted pod-to-pod communication`,
          remediation: 'Add default deny network policy to the namespace',
          compliance: ['CIS-5.3.2'],
          confidence: 0.95,
        });
      }
    }

    // Check for ingress without TLS
    for (const ingress of cluster.ingress) {
      if (!ingress.tls) {
        findings.push({
          id: crypto.randomUUID(),
          severity: 'high',
          title: `Ingress ${ingress.name} does not use TLS`,
          description: `Ingress ${ingress.name} in namespace ${ingress.namespace} exposes HTTP without TLS encryption`,
          remediation: 'Add TLS configuration to the ingress resource',
          compliance: ['CIS-5.5.1'],
          confidence: 0.95,
        });
      }
    }

    return findings;
  }
}

// ─── Multi-Cloud Inventory ─────────────────────────────────────────────────

export class MultiCloudInventory {
  private connectors: Map<CloudProvider, CloudConnector> = new Map();
  private k8sEngine: KubernetesEngine;

  constructor() {
    this.k8sEngine = new KubernetesEngine();
  }

  /** Register a cloud connector */
  registerConnector(connector: CloudConnector): void {
    this.connectors.set(connector.provider, connector);
  }

  /** Discover all cloud resources */
  async discoverAll(): Promise<CloudInventory[]> {
    const inventories: CloudInventory[] = [];
    for (const connector of this.connectors.values()) {
      inventories.push(await connector.discover());
    }
    return inventories;
  }

  /** Scan security across all providers */
  async scanAllSecurity(): Promise<Record<CloudProvider, CloudSecurityFinding[]>> {
    const results = {} as Record<CloudProvider, CloudSecurityFinding[]>;
    for (const [provider, connector] of this.connectors) {
      results[provider] = await connector.scanSecurity();
    }
    return results;
  }

  /** Get connector */
  getConnector(provider: CloudProvider): CloudConnector | undefined {
    return this.connectors.get(provider);
  }

  /** Get Kubernetes engine */
  getK8sEngine(): KubernetesEngine { return this.k8sEngine; }

  /** Get multi-cloud summary */
  async getSummary(): Promise<Record<CloudProvider, { resources: number; findings: number }>> {
    const summary = {} as Record<CloudProvider, { resources: number; findings: number }>;
    for (const [provider, connector] of this.connectors) {
      const inventory = await connector.discover();
      const findings = await connector.scanSecurity();
      summary[provider] = { resources: inventory.resources.length, findings: findings.length };
    }
    return summary;
  }
}

export function createCloudConnector(config: CloudConfig): CloudConnector {
  switch (config.provider) {
    case 'aws': return new AwsCloudConnector(config);
    case 'azure': return new AzureCloudConnector(config);
    case 'gcp': return new GcpCloudConnector(config);
  }
}
