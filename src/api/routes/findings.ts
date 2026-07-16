import type { FastifyInstance } from 'fastify';
import { SearchSchema } from '../validation/schemas.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { mapFindingToDTO } from '../dto/mappers.js';

export function registerFindingRoutes(app: FastifyInstance, persistence: PersistenceEngine): void {
  app.get('/api/v1/findings', async (request, reply) => {
    const { reportId, limit = '100', offset = '0' } = request.query as { reportId?: string; limit?: string; offset?: string };
    const repo = persistence.getFindingRepository();

    if (reportId) {
      const findings = await repo.findByReport(reportId);
      const dtos = findings.map(mapFindingToDTO);
      return reply.send({ data: dtos.slice(Number(offset), Number(offset) + Number(limit)), total: dtos.length, limit: Number(limit), offset: Number(offset) });
    }

    reply.send({ data: [], total: 0, limit: Number(limit), offset: Number(offset) });
  });

  app.get('/api/v1/findings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const repo = persistence.getFindingRepository();
    const finding = await repo.findById(id);
    if (!finding) {
      return reply.code(404).send({ error: 'Not found', message: `Finding ${id} not found`, statusCode: 404 });
    }
    reply.send(mapFindingToDTO(finding));
  });

  app.get('/api/v1/findings/search', {
    schema: { querystring: SearchSchema },
  }, async (request, reply) => {
    const { q, limit, offset } = request.query as { q: string; limit: number; offset: number };
    const repo = persistence.getFindingRepository();
    const findings = await repo.search(q, { limit, offset });
    reply.send({ data: findings.map(mapFindingToDTO), total: findings.length, limit, offset });
  });
}
