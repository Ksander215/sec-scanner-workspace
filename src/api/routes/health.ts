import type { FastifyInstance } from 'fastify';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import type { SecurityIntelligenceEngine } from '../../domain/security-intelligence/orchestrator/engine.js';
import type { HealthDTO } from '../dto/types.js';

export function registerHealthRoutes(app: FastifyInstance, engine: SecurityIntelligenceEngine, persistence?: PersistenceEngine): void {
  const startTime = Date.now();

  app.get('/health', async (_request, reply) => {
    const components: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};
    
    components.engine = 'healthy';
    
    if (persistence) {
      components.persistence = (await persistence.isHealthy()) ? 'healthy' : 'unhealthy';
    }

    const allHealthy = Object.values(components).every(s => s === 'healthy');
    
    const health: HealthDTO = {
      status: allHealthy ? 'healthy' : 'degraded',
      version: '1.0.0',
      uptime: Date.now() - startTime,
      components,
    };

    reply.send(health);
  });

  app.get('/ready', async (_request, reply) => {
    const ready = persistence ? await persistence.isHealthy() : true;
    reply.code(ready ? 200 : 503).send({ ready });
  });

  app.get('/live', async (_request, reply) => {
    reply.send({ alive: true });
  });
}
