import type { FastifyInstance } from 'fastify';
import { AnalyzeRequestSchema } from '../validation/schemas.js';
import type { SecurityIntelligenceEngine } from '../../domain/security-intelligence/orchestrator/engine.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import type { AnalyzeRequestDTO, AnalyzeResponseDTO } from '../dto/types.js';

export function registerAnalyzeRoutes(
  app: FastifyInstance,
  engine: SecurityIntelligenceEngine,
  persistence?: PersistenceEngine,
): void {
  app.post<{
    Body: AnalyzeRequestDTO;
  }>('/api/v1/analyze', {
    schema: {
      body: AnalyzeRequestSchema,
      response: { 202: {} },
    },
  }, async (request, reply) => {
    const { findings, options } = request.body;
    const runId = crypto.randomUUID();

    // Run analysis asynchronously
    const analysisPromise = engine.analyze(
      { findings },
      {
        persist: options?.persist,
        explain: options?.explain,
        includeAttackPaths: options?.includeAttackPaths,
        includeImpact: options?.includeImpact,
      },
    );

    // Don't await — return 202 immediately
    analysisPromise.then(async (report) => {
      if (persistence && options?.persist) {
        await persistence.saveReport(report);
      }
      request.log.info({ runId, reportId: report.id }, 'Analysis completed');
    }).catch((err) => {
      request.log.error({ runId, error: err.message }, 'Analysis failed');
    });

    const response: AnalyzeResponseDTO = {
      runId,
      status: 'accepted',
      message: 'Analysis started',
      statusUrl: `/api/v1/reports?runId=${runId}`,
    };

    reply.code(202).send(response);
  });

  // Synchronous analyze (waits for completion)
  app.post<{
    Body: AnalyzeRequestDTO;
  }>('/api/v1/analyze/sync', {
    schema: { body: AnalyzeRequestSchema },
  }, async (request, reply) => {
    const { findings, options } = request.body;
    const report = await engine.analyze(
      { findings },
      {
        persist: options?.persist,
        explain: options?.explain,
        includeAttackPaths: options?.includeAttackPaths,
        includeImpact: options?.includeImpact,
      },
    );

    if (persistence && options?.persist) {
      await persistence.saveReport(report);
    }

    reply.send(report);
  });
}
