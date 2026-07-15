/**
 * Discovery Engine — Stage Handler Bridge
 *
 * Connects the KatanaAdapter (ScanEnginePlugin) to the Pipeline Executor
 * via the StageHandler interface.
 *
 * This is the ONLY file that knows about both Pipeline and Discovery.
 * Neither the adapter nor the pipeline core are modified.
 *
 * Fork-on-write: The stage handler never mutates the Artifact Bus directly.
 * It creates a new AttackSurface via the adapter, then publishes artifacts
 * as a batch. The Artifact Bus itself handles dedup (last-write-wins).
 */

import type { StageHandler, ArtifactBus, PipelineEventBus } from '../../domain/scan-platform/pipeline/types.ts';
import { ArtifactCategory, PipelineEventType } from '../../domain/scan-platform/pipeline/types.ts';
import { KatanaAdapter } from './katana-adapter.ts';
import type { DiscoveryAdapterConfig } from './katana-adapter.ts';
import type { ScanContext } from '../../domain/scan-platform/scan-context/scan-context.ts';
import { AttackSurface, createEmptyAttackSurface } from './attack-surface.ts';

// ─── Stage Handler Factory ───────────────────────────────────

export interface DiscoveryStageHandlerConfig extends DiscoveryAdapterConfig {
  /** Target URL override (if not reading from artifact bus). */
  readonly targetUrl?: string;
}

/**
 * Create a StageHandler that runs the Discovery Engine.
 * Registers as 'discovery' stage in PipelineExecutor.
 *
 * Usage:
 *   const handler = createDiscoveryStageHandler({ scope: { maxDepth: 5 } });
 *   executor.registerStageHandler('discovery', handler);
 */
export function createDiscoveryStageHandler(config?: DiscoveryStageHandlerConfig): StageHandler {
  const adapter = new KatanaAdapter(config);

  return async ({ artifactBus, eventBus, abortSignal }) => {
    // Read target URL from prior stage artifacts (target_validation stage)
    const validatedTarget = artifactBus.get(ArtifactCategory.Metadata, 'validated_target');
    const targetUrl = config?.targetUrl
      ?? (validatedTarget?.value as any)?.targetUrl
      ?? 'https://example.com';

    // Build minimal ScanContext from pipeline artifacts
    const context: ScanContext = Object.freeze({
      id: `ctx-discovery-${Date.now()}`,
      scanJobId: `job-discovery-${Date.now()}`,
      correlationId: `corr-discovery-${Date.now()}`,
      targetId: 'target-1',
      targetUrl,
      targetName: 'Discovery Target',
      authentication: { method: 'none' as const },
      headers: [],
      cookies: [],
      scope: {
        includePaths: [],
        excludePaths: [],
        maxDepth: config?.scope?.maxDepth ?? 5,
        maxUrls: 0,
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
      profileName: 'discovery',
      requiredCapabilities: adapter.capabilities,
      triggerType: 'manual' as const,
      triggeredBy: 'pipeline',
      createdAt: new Date().toISOString(),
      metadata: {},
      abortSignal,
    });

    // Collect events for bridging to pipeline
    const events: Array<{ type: string; data?: Record<string, unknown> }> = [];

    const onEvent = (event: { type: string; timestamp: string; message?: string; data?: Record<string, unknown> }) => {
      events.push(event);

      // Bridge engine events to pipeline events
      if (event.type === 'progress' && event.data) {
        (eventBus as any).emit?.({
          type: PipelineEventType.StageStarted,
          timestamp: event.timestamp,
          pipelineId: '',
          data: { stageId: 'discovery', ...event.data },
        });
      }
    };

    // Run discovery via the adapter's ScanEnginePlugin.scan() method
    const result = await adapter.scan(context, onEvent);

    // Reconstruct AttackSurface from metadata
    // The adapter puts the surface JSON under metadata.attackSurface
    let surface: AttackSurface;
    const surfaceData = result.metadata?.attackSurface;
    if (surfaceData && typeof surfaceData === 'object' && 'urls' in surfaceData) {
      surface = AttackSurface.fromJSON(surfaceData as Record<string, any>);
    } else {
      surface = createEmptyAttackSurface();
    }

    // Publish all artifacts to the Artifact Bus (fork-on-write: bus handles dedup)
    publishDiscoveryArtifacts(surface, artifactBus as ArtifactBus, adapter.id);

    // Return stage result data
    return {
      success: result.success,
      urlsFound: surface.urls.length,
      formsFound: surface.forms.length,
      endpointsFound: surface.endpoints.length,
      jsFilesFound: surface.jsFiles.length,
      technologiesFound: surface.technologies.length,
      parametersFound: surface.parameters.length,
      durationMs: result.durationMs,
      requestsCount: result.requestsCount,
      findingsCount: result.findings.length,
      stats: surface.getStats(result.requestsCount, result.durationMs),
    };
  };
}

// ─── Artifact Publishing ─────────────────────────────────────

/**
 * Publish AttackSurface data to the pipeline Artifact Bus.
 * This is the ONLY point where Discovery writes to the Artifact Bus.
 *
 * All artifacts are published using ArtifactCategory enum values.
 * The Artifact Bus handles dedup by category+key (last-write-wins).
 * No direct calls to subsequent stages — only artifact publication.
 */
function publishDiscoveryArtifacts(
  surface: AttackSurface,
  artifactBus: ArtifactBus,
  engineId: string,
): void {
  // 1. URLs — each URL as a separate artifact for downstream querying
  for (const url of surface.urls) {
    artifactBus.publish({
      category: ArtifactCategory.Urls,
      stageId: 'discovery',
      key: `url:${url.normalizedUrl}`,
      value: {
        url: url.url,
        method: url.method,
        source: url.source,
        depth: url.depth,
        statusCode: url.statusCode,
        title: url.title,
        contentType: url.contentType,
      },
      sourceEngine: engineId,
    });
  }

  // 2. Forms — dedup key: action|method|pageUrl
  for (const form of surface.forms) {
    artifactBus.publish({
      category: ArtifactCategory.Forms,
      stageId: 'discovery',
      key: `form:${form.action.toLowerCase()}|${form.method.toLowerCase()}|${form.pageUrl.toLowerCase()}`,
      value: form,
      sourceEngine: engineId,
    });
  }

  // 3. Endpoints (REST, GraphQL, WebSocket, SOAP, gRPC)
  for (const ep of surface.endpoints) {
    artifactBus.publish({
      category: ArtifactCategory.Endpoints,
      stageId: 'discovery',
      key: `endpoint:${ep.url.toLowerCase()}|${ep.method.toUpperCase()}`,
      value: ep,
      sourceEngine: engineId,
    });
  }

  // 4. JS Files
  for (const js of surface.jsFiles) {
    artifactBus.publish({
      category: ArtifactCategory.JsFiles,
      stageId: 'discovery',
      key: `js:${js.url.toLowerCase()}`,
      value: js,
      sourceEngine: engineId,
    });
  }

  // 5. Technology Stack
  if (surface.technologies.length > 0) {
    artifactBus.publish({
      category: ArtifactCategory.Technology,
      stageId: 'discovery',
      key: 'tech_stack',
      value: surface.technologies,
      sourceEngine: engineId,
    });
  }

  // 6. API Metadata — summary of discovered API endpoints for downstream stages
  const apiEndpoints = surface.endpoints.filter(e => e.type === 'rest' || e.type === 'graphql' || e.type === 'soap' || e.type === 'grpc');
  if (apiEndpoints.length > 0) {
    artifactBus.publish({
      category: ArtifactCategory.Metadata,
      stageId: 'discovery',
      key: 'api_metadata',
      value: {
        totalEndpoints: apiEndpoints.length,
        restEndpoints: apiEndpoints.filter(e => e.type === 'rest').length,
        graphqlEndpoints: apiEndpoints.filter(e => e.type === 'graphql').length,
        websocketEndpoints: surface.endpoints.filter(e => e.type === 'websocket').length,
        openapiDetected: apiEndpoints.some(e => e.isOpenapi),
        endpoints: apiEndpoints.map(e => ({
          url: e.url,
          method: e.method,
          type: e.type,
          contentType: e.contentType,
        })),
      },
      sourceEngine: engineId,
    });
  }

  // 7. Discovery Statistics
  const stats = surface.getStats(0, 0);
  artifactBus.publish({
    category: ArtifactCategory.Metadata,
    stageId: 'discovery',
    key: 'discovery_stats',
    value: stats,
    sourceEngine: engineId,
  });

  // 8. Shared Context Update — immutable snapshot for downstream stages
  // This enables fork-on-write: downstream stages read the context
  // without mutating the original surface.
  artifactBus.publish({
    category: ArtifactCategory.Metadata,
    stageId: 'discovery',
    key: 'shared_context',
    value: {
      targetUrl: surface.urls.find(u => u.depth === 0)?.url ?? '',
      hostnames: surface.hostnames,
      urlCount: surface.urls.length,
      formCount: surface.forms.length,
      endpointCount: surface.endpoints.length,
      jsFileCount: surface.jsFiles.length,
      parameterCount: surface.parameters.length,
      technologyCount: surface.technologies.length,
      externalDomainCount: surface.externalDomains.length,
      uniqueParameterNames: surface.uniqueParameterNames,
      maxDepth: stats.depthsReached,
      hasFileUploadForms: surface.getFormsWithFileUpload().length > 0,
      hasGraphQl: surface.getEndpointsByType('graphql').length > 0,
      hasWebSocket: surface.getEndpointsByType('websocket').length > 0,
    },
    sourceEngine: engineId,
  });

  // 9. Robots.txt entries
  if (surface.robotsEntries.length > 0) {
    artifactBus.publish({
      category: ArtifactCategory.Metadata,
      stageId: 'discovery',
      key: 'robots_txt_entries',
      value: surface.robotsEntries,
      sourceEngine: engineId,
    });
  }

  // 10. Sitemap entries
  if (surface.sitemapEntries.length > 0) {
    artifactBus.publish({
      category: ArtifactCategory.Metadata,
      stageId: 'discovery',
      key: 'sitemap_entries',
      value: surface.sitemapEntries,
      sourceEngine: engineId,
    });
  }

  // 11. External domains
  if (surface.externalDomains.length > 0) {
    artifactBus.publish({
      category: ArtifactCategory.Metadata,
      stageId: 'discovery',
      key: 'external_domains',
      value: surface.externalDomains,
      sourceEngine: engineId,
    });
  }
}