import type { FastifyInstance } from 'fastify';
import { PaginationSchema } from '../validation/schemas.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { mapReportToDTO } from '../dto/mappers.js';

export function registerReportRoutes(app: FastifyInstance, persistence: PersistenceEngine): void {
  app.get('/api/v1/reports', {
    schema: { querystring: PaginationSchema },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit: number; offset: number };
    const repo = persistence.getReportRepository();
    const reports = await repo.list({ limit, offset });
    reply.send({ data: reports, total: reports.length, limit, offset });
  });

  app.get('/api/v1/reports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await persistence.loadReport(id);
    if (!report) {
      return reply.code(404).send({ error: 'Not found', message: `Report ${id} not found`, statusCode: 404 });
    }
    reply.send(report);
  });

  app.get('/api/v1/reports/:id/summary', async (request, reply) => {
    const { id } = request.params as { id: string };
    const repo = persistence.getReportRepository();
    const summary = await repo.getSummary(id);
    if (!summary) {
      return reply.code(404).send({ error: 'Not found', message: `Report ${id} not found`, statusCode: 404 });
    }
    reply.send(summary);
  });

  app.delete('/api/v1/reports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await persistence.deleteReport(id);
    reply.send({ deleted });
  });
}
