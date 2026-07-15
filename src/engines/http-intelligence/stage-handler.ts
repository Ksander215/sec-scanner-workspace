/**
 * HTTP Intelligence Engine — Stage Handler Bridge
 *
 * Connects the HttpIntelligenceAdapter (ScanEnginePlugin) to the Pipeline Executor
 * via the StageHandler interface.
 *
 * This is the ONLY file that knows about both Pipeline and HTTP Intelligence.
 * Neither the adapter nor the pipeline core are modified.
 *
 * Fork-on-write: The stage handler never mutates the Artifact Bus directly.
 * It creates data via the adapter, then publishes artifacts as a batch.
 * The Artifact Bus itself handles dedup (last-write-wins).
 */

import type { StageHandler, ArtifactBus, PipelineEventBus } from '../../domain/scan-platform/pipeline/types.ts';
import { PipelineEventType } from '../../domain/scan-platform/pipeline/types.ts';
import { HttpIntelligenceAdapter } from './http-intelligence-adapter.ts';
import type { HttpIntelligenceAdapterConfig } from './http-intelligence-adapter.ts';
import { HttpArtifactPublisher, HTTP_STAGE_ID } from './http-artifacts.ts';
import type { ScanContext } from '../../domain/scan-platform/scan-context/scan-context.ts';
import type { ArtifactCategory } from '../../domain/scan-platform/pipeline/types.ts';

// ─── Stage Handler Factory ───────────────────────────────────

export interface HttpStageHandlerConfig extends HttpIntelligenceAdapterConfig {
  /** Target URL override (if not reading from artifact bus). */
  readonly targetUrl?: string;
}

/**
 * Create a StageHandler that runs the HTTP Intelligence Engine.
 * Registers as 'http_intelligence' stage in PipelineExecutor.
 *
 * Usage:
 *   const handler = createHttpIntelligenceStageHandler({ timeoutMs: 30000 });
 *   executor.registerStageHandler('http_intelligence', handler);
 */
export function createHttpIntelligenceStageHandler(
  config?: HttpStageHandlerConfig,
): StageHandler {
  const adapter = new HttpIntelligenceAdapter(config);
  let initialized = false;

  return async ({ artifactBus, eventBus, abortSignal }) => {
    // Initialize adapter on first run
    if (!initialized) {
      await adapter.initialize();
      initialized = true;
    }

    // Read target URL from prior stage artifacts (target_validation stage)
    const validatedTarget = artifactBus.get(
      'metadata' as ArtifactCategory,
      'validated_target',
    );
    const targetUrl = config?.targetUrl
      ?? (validatedTarget?.value as any)?.targetUrl
      ?? 'https://example.com';

    // Build minimal ScanContext from pipeline artifacts
    const context: ScanContext = Object.freeze({
      id: `ctx-http-${Date.now()}`,
      scanJobId: `job-http-${Date.now()}`,
      correlationId: `corr-http-${Date.now()}`,
      targetId: 'target-1',
      targetUrl,
      targetName: 'HTTP Intelligence Target',
      authentication: { method: 'none' as const },
      headers: [],
      cookies: [],
      scope: {
        includePaths: [],
        excludePaths: [],
        maxDepth: 1,
        maxUrls: 1,
        followRedirects: true,
        maxRedirects: 10,
      },
      rateLimit: { requestsPerSecond: 10, delayMs: 100, concurrency: 5 },
      constraints: {
        maxDurationSeconds: 300,
        maxFindings: 0,
        maxRequests: 0,
        stopOnCritical: false,
        maxDepth: 0,
        maxUrls: 0,
      },
      profileName: 'http_intelligence',
      requiredCapabilities: adapter.capabilities,
      triggerType: 'manual' as const,
      triggeredBy: 'pipeline',
      createdAt: new Date().toISOString(),
      metadata: {},
      abortSignal,
    });

    // Collect events for bridging to pipeline
    const onEvent = (event: { type: string; timestamp: string; message?: string; data?: Record<string, unknown> }) => {
      // Bridge engine events to pipeline events
      (eventBus as any).emit?.({
        type: PipelineEventType.StageStarted,
        timestamp: event.timestamp,
        pipelineId: '',
        data: { stageId: HTTP_STAGE_ID, ...event.data },
      });
    };

    // Run HTTP Intelligence via the adapter's ScanEnginePlugin.scan() method
    const result = await adapter.scan(context, onEvent);

    // Publish all artifacts to the Artifact Bus
    const publisher = new HttpArtifactPublisher(
      artifactBus as ArtifactBus,
      HTTP_STAGE_ID,
      adapter.id,
    );

    // Reconstruct intelligence data from result metadata
    // The adapter puts the data under metadata.httpIntelligenceData or we reconstruct it
    const httpProfile = result.metadata?.httpProfile;

    // If we have the full data from metadata, publish it
    // Otherwise publish what we can from the scan result
    const publishResult = publisher.publishAll({
      targetUrl,
      protocolVersion: result.metadata?.protocolVersion ?? 'HTTP/1.1',
      tlsProfile: result.metadata?.tlsProfile ?? null,
      headerProfile: result.metadata?.headerProfile ?? null,
      behaviourProfile: result.metadata?.behaviourProfile ?? null,
      infrastructureProfile: result.metadata?.infrastructureProfile ?? null,
      cookieProfile: result.metadata?.cookieProfile ?? null,
      rateLimitProfile: result.metadata?.rateLimitProfile ?? null,
      totalRequests: result.requestsCount,
      durationMs: result.durationMs,
      scannedUrls: [],
    });

    // Return stage result data
    return {
      success: result.success,
      findingsCount: result.findings.length,
      durationMs: result.durationMs,
      requestsCount: result.requestsCount,
      artifactsPublished: publishResult.published,
      artifactCategories: publishResult.categories,
      tlsGrade: result.metadata?.tlsGrade,
      headerScore: result.metadata?.headerScore,
      cookieScore: result.metadata?.cookieScore,
      infrastructureFingerprints: result.metadata?.infrastructureFingerprints,
      rateLimitStatus: result.metadata?.rateLimitStatus,
    };
  };
}