/**
 * Custom Distributed Pipeline Example
 *
 * Demonstrates how to build a distributed analysis pipeline with
 * custom PipelineService implementations, circuit breakers, and
 * event bus integration for cross-service communication.
 *
 * Components:
 *   - DistributedPipeline: orchestrates service execution
 *   - PipelineService: individual stage implementations
 *   - EventBus: cross-service event-driven communication
 *
 * Run: npx tsx examples/pipeline/custom-pipeline.ts
 */

import { DistributedPipeline } from '../../src/infrastructure/distributed-pipeline/engine.js';
import type {
  PipelineService,
  PipelineContext,
  ServiceHealth,
  ServiceStatus,
  DistributedPipelineResult,
} from '../../src/infrastructure/distributed-pipeline/types.js';
import { EventBus } from '../../src/infrastructure/event-bus/event-bus.js';
import type { EventEnvelope, EventAck } from '../../src/infrastructure/event-bus/types.js';

// ── Event Bus Setup ───────────────────────────────────────────────────────
const eventBus = new EventBus({
  persistEvents: true,
  defaultRetryPolicy: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    initialDelayMs: 100,
    maxDelayMs: 5000,
    jitterMs: 50,
  },
});

// Subscribe to all pipeline events
eventBus.subscribe(
  'pipeline-monitor',
  ['pipeline.*', 'stage.*', 'finding.*', 'risk.*'],
  async (event: EventEnvelope): Promise<EventAck> => {
    console.log(`  [EVENT] ${event.eventType} (${event.source}) — ${JSON.stringify(event.payload).slice(0, 100)}`);
    return { status: 'ack' };
  },
  { consumerGroup: 'monitor', startFrom: 'latest' },
);

// ── Service 1: Ingestion Service ──────────────────────────────────────────
class IngestionService implements PipelineService {
  readonly name = 'ingestion-service';
  readonly version = '1.0.0';
  readonly stage = 'ingest';
  status: ServiceStatus = 'stopped';
  private processed = 0;

  async process(input: unknown, context: PipelineContext): Promise<unknown> {
    this.processed++;
    const findings = (input as any)?.findings ?? [];

    // Validate and enrich findings
    const enriched = findings.map((f: any) => ({
      ...f,
      _ingestedAt: new Date().toISOString(),
      _pipelineId: context.pipelineId,
      _correlationId: context.correlationId,
    }));

    // Publish ingestion event
    await eventBus.publish('finding.ingested', {
      count: enriched.length,
      pipelineId: context.pipelineId,
    }, { source: 'ingestion-service', correlationId: context.correlationId });

    return { findings: enriched, metadata: (input as any)?.metadata ?? {} };
  }

  async healthCheck(): Promise<ServiceHealth> {
    return {
      status: this.status === 'ready' ? 'healthy' : 'unhealthy',
      uptimeMs: 0,
      processedCount: this.processed,
      errorCount: 0,
      avgProcessingMs: 5,
    };
  }

  async start(): Promise<void> { this.status = 'ready'; }
  async stop(): Promise<void> { this.status = 'stopped'; }
}

// ── Service 2: Normalization Service ──────────────────────────────────────
class NormalizationService implements PipelineService {
  readonly name = 'normalization-service';
  readonly version = '1.0.0';
  readonly stage = 'normalize';
  status: ServiceStatus = 'stopped';
  private processed = 0;

  async process(input: unknown, context: PipelineContext): Promise<unknown> {
    this.processed++;
    const { findings } = input as { findings: any[] };

    // Normalize severity values
    const severityMap: Record<string, string> = {
      'CRITICAL': 'critical', 'HIGH': 'high', 'MEDIUM': 'medium',
      'LOW': 'low', 'INFO': 'info', 'NONE': 'none',
    };

    const normalized = findings.map(f => ({
      ...f,
      severity: severityMap[f.severity?.toUpperCase()] ?? f.severity ?? 'info',
      _normalizedAt: new Date().toISOString(),
    }));

    await eventBus.publish('finding.normalized', {
      count: normalized.length,
      pipelineId: context.pipelineId,
    }, { source: 'normalization-service', correlationId: context.correlationId });

    return { findings: normalized, metadata: (input as any).metadata };
  }

  async healthCheck(): Promise<ServiceHealth> {
    return {
      status: this.status === 'ready' ? 'healthy' : 'unhealthy',
      uptimeMs: 0,
      processedCount: this.processed,
      errorCount: 0,
      avgProcessingMs: 3,
    };
  }

  async start(): Promise<void> { this.status = 'ready'; }
  async stop(): Promise<void> { this.status = 'stopped'; }
}

// ── Service 3: Risk Assessment Service ────────────────────────────────────
class RiskAssessmentService implements PipelineService {
  readonly name = 'risk-assessment-service';
  readonly version = '1.0.0';
  readonly stage = 'risk';
  status: ServiceStatus = 'stopped';
  private processed = 0;

  async process(input: unknown, context: PipelineContext): Promise<unknown> {
    this.processed++;
    const { findings } = input as { findings: any[] };

    const riskScores = findings.map(f => {
      let score = 0;
      switch (f.severity) {
        case 'critical': score = 90; break;
        case 'high': score = 70; break;
        case 'medium': score = 50; break;
        case 'low': score = 25; break;
        default: score = 10;
      }
      // Boost for public-facing hosts
      if (/^prod-(web|api|lb)/i.test(f.host ?? '')) score += 10;
      return { findingId: f.id, score: Math.min(score, 100), level: score >= 80 ? 'critical' : score >= 60 ? 'high' : 'medium' };
    });

    await eventBus.publish('risk.assessed', {
      count: riskScores.length,
      critical: riskScores.filter(r => r.level === 'critical').length,
      pipelineId: context.pipelineId,
    }, { source: 'risk-assessment-service', correlationId: context.correlationId });

    return { findings, riskScores, metadata: (input as any).metadata };
  }

  async healthCheck(): Promise<ServiceHealth> {
    return {
      status: this.status === 'ready' ? 'healthy' : 'unhealthy',
      uptimeMs: 0,
      processedCount: this.processed,
      errorCount: 0,
      avgProcessingMs: 8,
    };
  }

  async start(): Promise<void> { this.status = 'ready'; }
  async stop(): Promise<void> { this.status = 'stopped'; }
}

// ── Service 4: Notification Service ───────────────────────────────────────
class NotificationService implements PipelineService {
  readonly name = 'notification-service';
  readonly version = '1.0.0';
  readonly stage = 'notify';
  status: ServiceStatus = 'stopped';
  private processed = 0;

  async process(input: unknown, context: PipelineContext): Promise<unknown> {
    this.processed++;
    const { riskScores } = input as { riskScores: any[] };

    const criticalFindings = riskScores.filter((r: any) => r.level === 'critical');
    if (criticalFindings.length > 0) {
      await eventBus.publish('notification.critical', {
        count: criticalFindings.length,
        pipelineId: context.pipelineId,
      }, { source: 'notification-service', correlationId: context.correlationId, priority: 'critical' });
    }

    return input;
  }

  async healthCheck(): Promise<ServiceHealth> {
    return {
      status: this.status === 'ready' ? 'healthy' : 'unhealthy',
      uptimeMs: 0,
      processedCount: this.processed,
      errorCount: 0,
      avgProcessingMs: 2,
    };
  }

  async start(): Promise<void> { this.status = 'ready'; }
  async stop(): Promise<void> { this.status = 'stopped'; }
}

// ── Main Execution ────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Custom Distributed Pipeline Example                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Create pipeline with circuit breaker configuration
  const pipeline = new DistributedPipeline({
    retryPolicy: { maxRetries: 3, backoffMs: 500 },
    timeoutMs: 30_000,
    parallelStages: false,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeoutMs: 15_000,
      halfOpenRequests: 1,
    },
  });

  // Register services (order matters for sequential pipeline)
  const ingestion = new IngestionService();
  const normalization = new NormalizationService();
  const riskAssessment = new RiskAssessmentService();
  const notification = new NotificationService();

  pipeline.registerService(ingestion);
  pipeline.registerService(normalization);
  pipeline.registerService(riskAssessment);
  pipeline.registerService(notification);

  // Start all services
  console.log('Starting pipeline services...\n');
  await pipeline.startAll();

  // Show topology
  const topology = pipeline.getTopology();
  console.log(`Pipeline topology: ${topology.stages.join(' → ')}\n`);

  // Health check
  const health = await pipeline.getHealth();
  for (const [stage, h] of Object.entries(health)) {
    console.log(`  ${stage}: ${h.status} (processed: ${h.processedCount})`);
  }
  console.log('');

  // Execute pipeline with sample input
  console.log('Running pipeline...\n');
  const result: DistributedPipelineResult = await pipeline.execute(
    {
      findings: [
        {
          id: 'f-001',
          source: 'trivy',
          sourceId: 'CVE-2024-3094',
          name: 'XZ Utils Backdoor',
          description: 'RCE via compromised xz-utils',
          severity: 'CRITICAL',   // Uppercase — normalization will fix
          category: 'vulnerability',
          host: 'prod-web-01.acme.io',
          port: 22,
          protocol: 'tcp',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'f-002',
          source: 'gitleaks',
          sourceId: 'GL-001',
          name: 'Exposed AWS Secret',
          description: 'AWS secret key in config',
          severity: 'critical',
          category: 'secret',
          host: 'prod-api-01.acme.io',
          path: '/app/config/credentials.yml',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'f-003',
          source: 'checkov',
          sourceId: 'CKV_AWS_79',
          name: 'S3 Public Access',
          description: 'S3 bucket allows public read',
          severity: 'HIGH',
          category: 'misconfiguration',
          host: 's3://acme-assets',
          timestamp: new Date().toISOString(),
        },
      ],
      metadata: { environment: 'production', scanDate: new Date().toISOString() },
    },
    { tenantId: 'acme-corp', correlationId: 'scan-' + Date.now() },
  );

  // Print results
  console.log('\n━━━ Pipeline Result ━━━\n');
  console.log(`  Pipeline ID  : ${result.pipelineId}`);
  console.log(`  Correlation  : ${result.correlationId}`);
  console.log(`  Status       : ${result.status}`);
  console.log(`  Duration     : ${result.totalDurationMs}ms\n`);

  for (const stage of result.stages) {
    const icon = stage.status === 'success' ? '✓' : '✗';
    console.log(`  ${icon} ${stage.stage} (${stage.service}) — ${stage.status} [${stage.durationMs}ms]`);
  }

  // Event bus statistics
  const stats = eventBus.getStatistics();
  console.log('\n━━━ Event Bus Statistics ━━━\n');
  console.log(`  Published : ${stats.totalPublished}`);
  console.log(`  Consumed  : ${stats.totalConsumed}`);
  console.log(`  Failed    : ${stats.totalFailed}`);
  console.log(`  Replayed  : ${stats.totalReplayed}`);

  // Replay events for audit
  console.log('\n━━━ Event Replay (last 60 seconds) ━━━\n');
  const replayCount = await eventBus.replay({
    from: new Date(Date.now() - 60_000),
    to: new Date(),
    limit: 10,
  });
  console.log(`  Replayed ${replayCount} events`);

  // Stop all services
  await pipeline.stopAll();
  console.log('\n━━━ Pipeline stopped ━━━\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
