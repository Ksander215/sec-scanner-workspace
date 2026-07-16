import type { FastifyInstance } from 'fastify';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { mapRecommendationToDTO } from '../dto/mappers.js';

export function registerRecommendationRoutes(app: FastifyInstance, persistence: PersistenceEngine): void {
  app.get('/api/v1/recommendations', async (request, reply) => {
    const { reportId } = request.query as { reportId?: string };
    if (!reportId) {
      return reply.code(400).send({ error: 'Bad request', message: 'reportId is required', statusCode: 400 });
    }
    const repo = persistence.getRecommendationRepository();
    const recs = await repo.findByReport(reportId);
    reply.send({ data: recs.map(mapRecommendationToDTO), total: recs.length });
  });

  app.post('/api/v1/recommendations/plan', async (request, reply) => {
    const { reportId } = request.body as { reportId: string };
    const report = await persistence.loadReport(reportId);
    if (!report) {
      return reply.code(404).send({ error: 'Not found', message: `Report ${reportId} not found`, statusCode: 404 });
    }
    reply.send(report.remediationPlan);
  });
}
