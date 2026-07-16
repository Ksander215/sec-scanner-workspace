/** INT-011F: Cluster Coordinator — Engine */
import type { ClusterNode, ClusterConfig, DistributedLock, LeaderState, ClusterStatistics, WorkerStatus } from './types.js';

export class ClusterCoordinator {
  private config: ClusterConfig;
  private nodes: Map<string, ClusterNode> = new Map();
  private leaderState: LeaderState = 'follower';
  private currentLeader: string | null = null;
  private currentTerm = 0;
  private locks: Map<string, DistributedLock> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private electionTimeout: NodeJS.Timeout | null = null;
  private taskQueue: ClusterTask[] = [];
  private taskHandlers: Map<string, (task: ClusterTask) => Promise<unknown>> = new Map();

  constructor(config?: Partial<ClusterConfig>) {
    this.config = {
      nodeId: crypto.randomUUID(),
      heartbeatIntervalMs: 2000,
      electionTimeoutMs: 5000,
      lockTtlMs: 30000,
      maxNodes: 100,
      ...config,
    };
  }

  /** Start the cluster coordinator */
  async start(hostname: string, port: number, roles: string[] = []): Promise<void> {
    const selfNode: ClusterNode = {
      nodeId: this.config.nodeId,
      hostname,
      port,
      status: 'ready',
      roles,
      capabilities: roles,
      lastHeartbeat: new Date(),
      metadata: {},
      startedAt: new Date(),
    };
    this.nodes.set(this.config.nodeId, selfNode);

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), this.config.heartbeatIntervalMs);

    // Start election timeout
    this.startElectionTimeout();
  }

  /** Stop the coordinator */
  async stop(): Promise<void> {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.electionTimeout) clearTimeout(this.electionTimeout);
    this.nodes.get(this.config.nodeId)!.status = 'offline';
  }

  /** Register a remote node */
  registerNode(node: Omit<ClusterNode, 'lastHeartbeat' | 'startedAt' | 'status'>): void {
    if (this.nodes.size >= this.config.maxNodes) return;
    this.nodes.set(node.nodeId, {
      ...node,
      status: 'ready',
      lastHeartbeat: new Date(),
      startedAt: new Date(),
    });
  }

  /** Remove a node */
  removeNode(nodeId: string): boolean {
    return this.nodes.delete(nodeId);
  }

  /** Acquire a distributed lock */
  async acquireLock(resource: string, holder?: string, ttlMs?: number): Promise<DistributedLock | null> {
    const existing = this.locks.get(resource);
    if (existing && existing.expiresAt > new Date()) {
      return null; // Lock held by another
    }

    const lock: DistributedLock = {
      lockId: crypto.randomUUID(),
      resource,
      holder: holder ?? this.config.nodeId,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + (ttlMs ?? this.config.lockTtlMs)),
      metadata: {},
    };

    this.locks.set(resource, lock);
    return lock;
  }

  /** Release a distributed lock */
  releaseLock(resource: string, holder?: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock) return false;
    if (holder && lock.holder !== holder) return false;
    return this.locks.delete(resource);
  }

  /** Renew a lock */
  renewLock(resource: string, holder: string, ttlMs?: number): boolean {
    const lock = this.locks.get(resource);
    if (!lock || lock.holder !== holder) return false;
    lock.expiresAt = new Date(Date.now() + (ttlMs ?? this.config.lockTtlMs));
    return true;
  }

  /** Enqueue a task for distributed workers */
  enqueueTask(task: ClusterTask): string {
    task.id = task.id ?? crypto.randomUUID();
    task.status = 'queued';
    task.enqueuedAt = new Date();
    this.taskQueue.push(task);
    return task.id;
  }

  /** Register a task handler */
  registerTaskHandler(type: string, handler: (task: ClusterTask) => Promise<unknown>): void {
    this.taskHandlers.set(type, handler);
  }

  /** Process next available task (called by workers) */
  async processNextTask(workerId: string): Promise<ClusterTask | null> {
    const task = this.taskQueue.find(t => t.status === 'queued');
    if (!task) return null;

    task.status = 'running';
    task.assignedTo = workerId;
    task.startedAt = new Date();

    const handler = this.taskHandlers.get(task.type);
    if (handler) {
      try {
        task.result = await handler(task);
        task.status = 'completed';
      } catch (err) {
        task.status = 'failed';
        task.error = (err as Error).message;
      }
    }

    task.completedAt = new Date();
    return task;
  }

  /** Check if this node is the leader */
  isLeader(): boolean {
    return this.leaderState === 'leader';
  }

  /** Get current leader */
  getLeader(): ClusterNode | null {
    if (!this.currentLeader) return null;
    return this.nodes.get(this.currentLeader) ?? null;
  }

  /** Get all nodes */
  getNodes(): ClusterNode[] {
    return [...this.nodes.values()];
  }

  /** Get available workers for a given capability */
  getWorkersForCapability(capability: string): ClusterNode[] {
    return [...this.nodes.values()].filter(
      n => n.status === 'ready' && n.capabilities.includes(capability),
    );
  }

  /** Get statistics */
  getStatistics(): ClusterStatistics {
    const byStatus: Record<WorkerStatus, number> = { joining: 0, ready: 0, busy: 0, leaving: 0, offline: 0 };
    for (const node of this.nodes.values()) {
      byStatus[node.status]++;
    }
    return {
      nodes: this.nodes.size,
      leader: this.currentLeader,
      term: this.currentTerm,
      locks: this.locks.size,
      pendingTasks: this.taskQueue.filter(t => t.status === 'queued').length,
      activeWorkers: byStatus.ready,
      byStatus,
    };
  }

  // --- Private ---

  private sendHeartbeat(): void {
    const self = this.nodes.get(this.config.nodeId);
    if (self) self.lastHeartbeat = new Date();

    // Check for stale nodes
    const threshold = Date.now() - this.config.heartbeatIntervalMs * 3;
    for (const [id, node] of this.nodes) {
      if (id === this.config.nodeId) continue;
      if (node.lastHeartbeat.getTime() < threshold) {
        node.status = 'offline';
      }
    }

    // Clean expired locks
    for (const [resource, lock] of this.locks) {
      if (lock.expiresAt <= new Date()) {
        this.locks.delete(resource);
      }
    }
  }

  private startElectionTimeout(): void {
    this.electionTimeout = setTimeout(() => {
      if (this.leaderState === 'follower') {
        this.startElection();
      }
    }, this.config.electionTimeoutMs + Math.random() * 2000);
  }

  private startElection(): void {
    this.leaderState = 'candidate';
    this.currentTerm++;

    // Simple election: if no leader, first candidate wins
    // Production: Raft consensus with vote requests
    const nodes = [...this.nodes.values()].filter(n => n.status !== 'offline');
    const smallestId = nodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId))[0];

    if (smallestId.nodeId === this.config.nodeId) {
      this.leaderState = 'leader';
      this.currentLeader = this.config.nodeId;
    } else {
      this.leaderState = 'follower';
      this.currentLeader = smallestId.nodeId;
    }

    // Restart election timeout
    this.startElectionTimeout();
  }
}

export interface ClusterTask {
  id?: string;
  type: string;
  payload: unknown;
  priority: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  assignedTo?: string;
  enqueuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  metadata: Record<string, unknown>;
}
