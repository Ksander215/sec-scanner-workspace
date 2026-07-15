/**
 * HTTP Intelligence Engine — Artifacts Publisher
 *
 * Maps HTTP intelligence data to Artifact Bus categories.
 * Uses existing ArtifactCategory enum values and differentiates
 * via the `key` field using HttpArtifactType prefixes.
 *
 * No modifications to existing ArtifactCategory or ArtifactBus.
 *
 * 8 artifact categories:
 * - HTTP Profile
 * - TLS Profile
 * - Header Profile
 * - Cookie Profile
 * - Infrastructure Profile
 * - Redirect Graph
 * - Security Header Analysis
 * - Rate Limit Profile
 */

import type { ArtifactBus, PipelineArtifact } from '../../domain/scan-platform/pipeline/types.ts';
import { ArtifactCategory } from '../../domain/scan-platform/pipeline/types.ts';
import { HttpArtifactType } from './http-types.ts';
import type {
  HttpIntelligenceData,
  TlsProfile,
  HeaderProfile,
  CookieProfile,
  InfrastructureProfile,
  HttpBehaviourProfile,
  RateLimitProfile,
} from './http-types.ts';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

/** Stage ID used for all HTTP intelligence artifacts. */
export const HTTP_STAGE_ID = 'http_intelligence';

/** Source engine identifier. */
export const HTTP_ENGINE_ID = 'http-intelligence';

// ═══════════════════════════════════════════════════════════════
// Category Mapping
// ═══════════════════════════════════════════════════════════════

function mapToArtifactCategory(httpType: HttpArtifactType): ArtifactCategory {
  switch (httpType) {
    case HttpArtifactType.TlsProfile:
      return ArtifactCategory.Tls;
    case HttpArtifactType.HeaderProfile:
    case HttpArtifactType.SecurityHeaderAnalysis:
      return ArtifactCategory.Headers;
    case HttpArtifactType.CookieProfile:
      return ArtifactCategory.Cookies;
    case HttpArtifactType.InfrastructureProfile:
    case HttpArtifactType.HttpProfile:
      return ArtifactCategory.Technology;
    case HttpArtifactType.RedirectGraph:
      return ArtifactCategory.Redirects;
    case HttpArtifactType.RateLimitProfile:
      return ArtifactCategory.Metadata;
    default:
      return ArtifactCategory.Metadata;
  }
}

// ═══════════════════════════════════════════════════════════════
// HTTP Artifact Publisher
// ═══════════════════════════════════════════════════════════════

export class HttpArtifactPublisher {
  private readonly artifactBus: ArtifactBus;
  private readonly stageId: string;
  private readonly sourceEngine: string;
  private idCounter = 0;

  constructor(
    artifactBus: ArtifactBus,
    stageId: string = HTTP_STAGE_ID,
    sourceEngine: string = HTTP_ENGINE_ID,
  ) {
    this.artifactBus = artifactBus;
    this.stageId = stageId;
    this.sourceEngine = sourceEngine;
  }

  get publishedCount(): number { return this.idCounter; }

  // ─── Individual Publishers ─────────────────────────────────

  publishHttpProfile(profile: HttpIntelligenceData): PipelineArtifact {
    return this.publish(HttpArtifactType.HttpProfile, 'main', profile);
  }

  publishTlsProfile(profile: TlsProfile): PipelineArtifact {
    return this.publish(HttpArtifactType.TlsProfile, 'main', profile);
  }

  publishHeaderProfile(profile: HeaderProfile): PipelineArtifact {
    return this.publish(HttpArtifactType.HeaderProfile, `url:${profile.url}`, profile);
  }

  publishCookieProfile(profile: CookieProfile): PipelineArtifact {
    return this.publish(HttpArtifactType.CookieProfile, `url:${profile.url}`, profile);
  }

  publishInfrastructureProfile(profile: InfrastructureProfile): PipelineArtifact {
    return this.publish(HttpArtifactType.InfrastructureProfile, `url:${profile.url}`, profile);
  }

  publishRedirectGraph(behaviour: HttpBehaviourProfile): PipelineArtifact {
    return this.publish(HttpArtifactType.RedirectGraph, 'main', {
      url: behaviour.url,
      redirectChains: behaviour.redirectChains,
      redirectLoopsDetected: behaviour.redirectLoopsDetected,
      openRedirectsDetected: behaviour.openRedirectsDetected,
    });
  }

  publishSecurityHeaderAnalysis(profile: HeaderProfile): PipelineArtifact {
    // Publish individual header analyses
    const findings = profile.analyses.filter(
      a => a.status !== 'secure' && a.severity !== 'info',
    );
    return this.publish(HttpArtifactType.SecurityHeaderAnalysis, 'findings', {
      url: profile.url,
      findings,
      overallScore: profile.overallScore,
      secureCount: profile.secureCount,
      warningCount: profile.warningCount,
      missingCount: profile.missingCount,
      misconfiguredCount: profile.misconfiguredCount,
      vulnerableCount: profile.vulnerableCount,
    });
  }

  publishRateLimitProfile(profile: RateLimitProfile): PipelineArtifact {
    return this.publish(HttpArtifactType.RateLimitProfile, `url:${profile.url}`, profile);
  }

  // ─── Shared Context ────────────────────────────────────────

  publishSharedContext(data: HttpIntelligenceData): PipelineArtifact {
    return this.artifactBus.publish({
      category: ArtifactCategory.Metadata,
      stageId: this.stageId,
      key: 'shared_context',
      value: {
        httpProtocol: data.protocolVersion,
        tlsGrade: data.tlsProfile?.overallGrade ?? null,
        securityHeaderScore: data.headerProfile?.overallScore ?? null,
        cookieScore: data.cookieProfile?.overallScore ?? null,
        infrastructureDetected: data.infrastructureProfile?.fingerprints.map(f => ({
          type: f.type,
          name: f.name,
          confidence: f.confidence,
        })) ?? [],
        redirectLoops: data.behaviourProfile?.redirectLoopsDetected ?? 0,
        openRedirects: data.behaviourProfile?.openRedirectsDetected ?? 0,
        rateLimitDetected: data.rateLimitProfile?.status === 'detected',
        totalRequests: data.totalRequests,
        durationMs: data.durationMs,
      },
      sourceEngine: this.sourceEngine,
    });
  }

  // ─── Bulk Publishing ───────────────────────────────────────

  publishAll(data: HttpIntelligenceData): { published: number; categories: Record<string, number> } {
    const categories: Record<string, number> = {};
    let count = 0;

    const inc = (cat: string) => { categories[cat] = (categories[cat] ?? 0) + 1; count++; };

    // 1. HTTP Profile
    this.publishHttpProfile(data);
    inc('http_profile');

    // 2. TLS Profile
    if (data.tlsProfile) {
      this.publishTlsProfile(data.tlsProfile);
      inc('tls_profile');
    }

    // 3. Header Profile
    if (data.headerProfile) {
      this.publishHeaderProfile(data.headerProfile);
      this.publishSecurityHeaderAnalysis(data.headerProfile);
      inc('header_profile');
      inc('security_header_analysis');
    }

    // 4. Cookie Profile
    if (data.cookieProfile) {
      this.publishCookieProfile(data.cookieProfile);
      inc('cookie_profile');
    }

    // 5. Infrastructure Profile
    if (data.infrastructureProfile) {
      this.publishInfrastructureProfile(data.infrastructureProfile);
      inc('infrastructure_profile');
    }

    // 6. Redirect Graph
    if (data.behaviourProfile && data.behaviourProfile.redirectChains.length > 0) {
      this.publishRedirectGraph(data.behaviourProfile);
      inc('redirect_graph');
    }

    // 7. Rate Limit Profile
    if (data.rateLimitProfile) {
      this.publishRateLimitProfile(data.rateLimitProfile);
      inc('rate_limit_profile');
    }

    // 8. Shared Context
    this.publishSharedContext(data);
    inc('shared_context');

    return { published: count, categories };
  }

  // ─── Internal Publish ──────────────────────────────────────

  private publish(type: HttpArtifactType, key: string, value: unknown): PipelineArtifact {
    this.idCounter++;
    const artifactKey = `${type}:${key}`;
    const category = mapToArtifactCategory(type);

    return this.artifactBus.publish({
      category,
      stageId: this.stageId,
      key: artifactKey,
      value,
      sourceEngine: this.sourceEngine,
    });
  }
}