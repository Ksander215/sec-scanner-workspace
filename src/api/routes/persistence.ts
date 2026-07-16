import type { FastifyInstance } from 'fastify';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';

export function registerPersistenceRoutes(app: FastifyInstance, persistence: PersistenceEngine): void {
  app.post('/api/v1/snapshots', async (request, reply) => {
    const { reportId, description } = request.body as { reportId: string; description?: string };
    const snapshotId = await persistence.createSnapshot(reportId, description);
    reply.code(201).send({ snapshotId, reportId });
  });

  app.post('/api/v1/snapshots/:id/restore', async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await persistence.restoreSnapshot(id);
    reply.send(report);
  });

  app.get('/api/v1/snapshots', async (request, reply) => {
    const repo = persistence.getSnapshotRepository();
    const snapshots = await repo.list();
    reply.send({ data: snapshots, total: snapshots.length });
  });

  app.get('/api/v1/storage/statistics', async (request, reply) => {
    const stats = await persistence.getStatistics();
    reply.send(stats);
  });
}
