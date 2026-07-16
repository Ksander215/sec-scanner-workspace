import type { FastifyInstance } from 'fastify';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import { mapAttackGraphToDTO } from '../dto/mappers.js';

export function registerAttackPathRoutes(app: FastifyInstance, persistence: PersistenceEngine): void {
  app.get('/api/v1/attack-paths', async (request, reply) => {
    const { reportId } = request.query as { reportId?: string };
    if (!reportId) {
      return reply.code(400).send({ error: 'Bad request', message: 'reportId is required', statusCode: 400 });
    }
    const repo = persistence.getAttackPathRepository();
    const graph = await repo.findByReport(reportId);
    if (!graph) {
      return reply.send({ data: [], total: 0 });
    }
    reply.send({ data: mapAttackGraphToDTO(graph), total: graph.paths.length });
  });

  app.get('/api/v1/attack-paths/graph', async (request, reply) => {
    const { reportId } = request.query as { reportId?: string };
    if (!reportId) {
      return reply.code(400).send({ error: 'Bad request', message: 'reportId is required', statusCode: 400 });
    }
    const repo = persistence.getAttackPathRepository();
    const graph = await repo.findByReport(reportId);
    if (!graph) {
      return reply.send({ nodes: [], edges: [], statistics: {} });
    }
    reply.send(graph);
  });
}
