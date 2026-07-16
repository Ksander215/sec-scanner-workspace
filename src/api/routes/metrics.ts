import type { FastifyInstance } from 'fastify';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerMetricsRoutes(app: FastifyInstance, persistence?: PersistenceEngine): void {
  app.get('/metrics', async (_request, reply) => {
    const metrics = persistence?.getMetrics();
    const lines: string[] = [];

    lines.push('# HELP si_pipeline_duration_ms Total pipeline duration in milliseconds');
    lines.push('# TYPE si_pipeline_duration_ms gauge');
    lines.push(`si_pipeline_duration_ms 0`);

    lines.push('# HELP si_requests_total Total API requests');
    lines.push('# TYPE si_requests_total counter');
    lines.push(`si_requests_total 0`);

    lines.push('# HELP si_cache_hits_total Cache hit count');
    lines.push('# TYPE si_cache_hits_total counter');
    lines.push(`si_cache_hits_total ${metrics?.cacheHits ?? 0}`);

    lines.push('# HELP si_saves_total Total report saves');
    lines.push('# TYPE si_saves_total counter');
    lines.push(`si_saves_total ${metrics?.totalSaves ?? 0}`);

    lines.push('# HELP si_loads_total Total report loads');
    lines.push('# TYPE si_loads_total counter');
    lines.push(`si_loads_total ${metrics?.totalLoads ?? 0}`);

    reply.type('text/plain').send(lines.join('\n'));
  });
}
