import type { FastifyInstance } from 'fastify';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { mapCorrelationToDTO } from '../dto/mappers.js';

export function registerCorrelationRoutes(app: FastifyInstance, persistence: PersistenceEngine): void {
  app.get('/api/v1/correlations', async (request, reply) => {
    const { reportId } = request.query as { reportId?: string };
    if (!reportId) {
      return reply.code(400).send({ error: 'Bad request', message: 'reportId is required', statusCode: 400 });
    }
    const repo = persistence.getCorrelationRepository();
    const { correlations } = await repo.findByReport(reportId);
    reply.send({ data: correlations.map(mapCorrelationToDTO), total: correlations.length });
  });

  app.get('/api/v1/correlations/groups', async (request, reply) => {
    const { reportId } = request.query as { reportId?: string };
    if (!reportId) {
      return reply.code(400).send({ error: 'Bad request', message: 'reportId is required', statusCode: 400 });
    }
    const repo = persistence.getCorrelationRepository();
    const { groups } = await repo.findByReport(reportId);
    reply.send({ data: groups, total: groups.length });
  });
}
