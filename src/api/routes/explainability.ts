import type { FastifyInstance } from 'fastify';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { mapExplanationToDTO } from '../dto/mappers.js';

export function registerExplainabilityRoutes(app: FastifyInstance, persistence: PersistenceEngine): void {
  app.get('/api/v1/explanations', async (request, reply) => {
    const { reportId } = request.query as { reportId?: string };
    if (!reportId) {
      return reply.code(400).send({ error: 'Bad request', message: 'reportId is required', statusCode: 400 });
    }
    const repo = persistence.getExplainabilityRepository();
    const explanations = await repo.findByReport(reportId);
    reply.send({ data: explanations.map(mapExplanationToDTO), total: explanations.length });
  });

  app.get('/api/v1/explanations/:targetId', async (request, reply) => {
    const { targetId } = request.params as { targetId: string };
    const repo = persistence.getExplainabilityRepository();
    const explanation = await repo.findByTarget(targetId);
    if (!explanation) {
      return reply.code(404).send({ error: 'Not found', message: `Explanation for ${targetId} not found`, statusCode: 404 });
    }
    reply.send(explanation);
  });
}
