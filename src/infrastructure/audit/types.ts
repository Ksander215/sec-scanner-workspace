export type AuditAction =
  | 'auth.login' | 'auth.logout' | 'auth.token.refresh'
  | 'report.create' | 'report.read' | 'report.delete' | 'report.export'
  | 'finding.read' | 'finding.delete' | 'finding.search'
  | 'risk.read' | 'attack.read'
  | 'recommendation.read' | 'recommendation.update'
  | 'snapshot.create' | 'snapshot.restore'
  | 'analysis.start' | 'analysis.complete' | 'analysis.fail'
  | 'config.read' | 'config.update'
  | 'user.create' | 'user.update' | 'user.delete' | 'user.role.assign'
  | 'plugin.load' | 'plugin.unload'
  | 'system.start' | 'system.stop' | 'system.health';

export type AuditResult = 'success' | 'failure' | 'error';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  actor: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ip: string;
  requestId: string;
  result: AuditResult;
  duration: number;
  details?: Record<string, unknown>;
}

export interface AuditQuery {
  actor?: string;
  action?: AuditAction;
  resource?: string;
  result?: AuditResult;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditStatistics {
  totalEvents: number;
  byAction: Record<string, number>;
  byResult: Record<string, number>;
  byActor: Record<string, number>;
  errorCount: number;
  avgDurationMs: number;
}
