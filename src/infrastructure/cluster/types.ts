/** INT-011F: Cluster Coordinator — Types */

export type WorkerStatus = 'joining' | 'ready' | 'busy' | 'leaving' | 'offline';
export type LeaderState = 'leader' | 'follower' | 'candidate';

export interface ClusterNode {
  nodeId: string;
  hostname: string;
  port: number;
  status: WorkerStatus;
  roles: string[];
  capabilities: string[];
  lastHeartbeat: Date;
  metadata: Record<string, unknown>;
  startedAt: Date;
}

export interface LeaderElectionConfig {
  electionTimeoutMs: number;
  heartbeatIntervalMs: number;
  term: number;
}

export interface DistributedLock {
  lockId: string;
  resource: string;
  holder: string;
  acquiredAt: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

export interface ClusterConfig {
  nodeId: string;
  heartbeatIntervalMs: number;
  electionTimeoutMs: number;
  lockTtlMs: number;
  maxNodes: number;
}

export interface ClusterStatistics {
  nodes: number;
  leader: string | null;
  term: number;
  locks: number;
  pendingTasks: number;
  activeWorkers: number;
  byStatus: Record<WorkerStatus, number>;
}
