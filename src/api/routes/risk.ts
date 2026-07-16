import type { FastifyInstance } from 'fastify';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { mapRiskToDTO } from '../dto/mappers.js';

export function registerRiskRoutes(app: FastifyInstance, persistence: PersistenceEngine): void {
  app.get('/api/v1/risks', async (request, reply) => {
    const { reportId } = request.query as { reportId?: string };
    if (!reportId) {
      return reply.code(400).send({ error: 'Bad request', message: 'reportId is required', statusCode: 400 });
    }
    const repo = persistence.getRiskRepository();
    const risks = await repo.findByReport(reportId);
    reply.send({ data: risks.map(mapRiskToDTO), total: risks.length });
  });

  app.get('/api/v1/risks/summary', async (request, reply) => {
    const { reportId } = request.query as { reportId?: string };
    if (!reportId) {
      return reply.code(400).send({ error: 'Bad request', message: 'reportId is required', statusCode: 400 });
    }
    const report = await persistence.loadReport(reportId);
    if (!report) {
      return reply.code(404).send({ error: 'Not found', message: `Report ${reportId} not found`, statusCode: 404 });
    }
    reply.send(report.riskSummary);
  });

  app.get('/api/v1/risks/top', async (request, reply) => {
    const { limit = '10' } = request.query as { limit?: string };
    const repo = persistence.getRiskRepository();
    const risks = await repo.findTop(Number(limit));
    reply.send({ data: risks.map(mapRiskToDTO) });
  });
}
