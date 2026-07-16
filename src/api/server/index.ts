import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { SecurityIntelligenceEngine } from '../../domain/security-intelligence/orchestrator/engine.js';
import type { PersistenceEngine } from '../../domain/security-intelligence/persistence/engine.js';
import type { AuthProvider } from '../auth/types.js';
import { NoAuthProvider } from '../auth/types.js';
import { registerMiddleware } from '../middleware/index.js';
import { registerAnalyzeRoutes } from '../routes/analyze.js';
import { registerReportRoutes } from '../routes/reports.js';
import { registerFindingRoutes } from '../routes/findings.js';
import { registerCorrelationRoutes } from '../routes/correlation.js';
import { registerRiskRoutes } from '../routes/risk.js';
import { registerAttackPathRoutes } from '../routes/attack-paths.js';
import { registerRecommendationRoutes } from '../routes/recommendations.js';
import { registerExplainabilityRoutes } from '../routes/explainability.js';
import { registerPersistenceRoutes } from '../routes/persistence.js';
import { registerHealthRoutes } from '../routes/health.js';
import { registerMetricsRoutes } from '../routes/metrics.js';

export interface ServerOptions {
  port?: number;
  host?: string;
  engine: SecurityIntelligenceEngine;
  persistence?: PersistenceEngine;
  auth?: AuthProvider;
  cors?: boolean;
  rateLimit?: boolean;
}

export class SecurityIntelligenceApiBuilder {
  private options: Partial<ServerOptions> = {};

  withEngine(engine: SecurityIntelligenceEngine): this {
    this.options.engine = engine;
    return this;
  }

  withPersistence(persistence: PersistenceEngine): this {
    this.options.persistence = persistence;
    return this;
  }

  withAuth(auth: AuthProvider): this {
    this.options.auth = auth;
    return this;
  }

  withPort(port: number): this {
    this.options.port = port;
    return this;
  }

  withHost(host: string): this {
    this.options.host = host;
    return this;
  }

  withCors(enabled: boolean): this {
    this.options.cors = enabled;
    return this;
  }

  build(): SecurityIntelligenceServer {
    if (!this.options.engine) {
      throw new Error('Engine is required. Call withEngine() first.');
    }
    return new SecurityIntelligenceServer({
      engine: this.options.engine,
      persistence: this.options.persistence,
      auth: this.options.auth ?? new NoAuthProvider(),
      port: this.options.port ?? 8080,
      host: this.options.host ?? '0.0.0.0',
      cors: this.options.cors ?? true,
    });
  }
}

export class SecurityIntelligenceServer {
  private app: FastifyInstance;
  private options: ServerOptions;

  constructor(options: ServerOptions) {
    this.options = options;
    this.app = Fastify({
      logger: true,
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'requestId',
    });

    this.setup();
  }

  private setup(): void {
    // Register middleware
    registerMiddleware(this.app);

    // Register routes
    registerAnalyzeRoutes(this.app, this.options.engine, this.options.persistence);
    
    if (this.options.persistence) {
      registerReportRoutes(this.app, this.options.persistence);
      registerFindingRoutes(this.app, this.options.persistence);
      registerCorrelationRoutes(this.app, this.options.persistence);
      registerRiskRoutes(this.app, this.options.persistence);
      registerAttackPathRoutes(this.app, this.options.persistence);
      registerRecommendationRoutes(this.app, this.options.persistence);
      registerExplainabilityRoutes(this.app, this.options.persistence);
      registerPersistenceRoutes(this.app, this.options.persistence);
    }
    
    registerHealthRoutes(this.app, this.options.engine, this.options.persistence);
    registerMetricsRoutes(this.app, this.options.persistence);
  }

  async start(): Promise<void> {
    try {
      const address = await this.app.listen({
        port: this.options.port ?? 8080,
        host: this.options.host ?? '0.0.0.0',
      });
      this.app.log.info(`Security Intelligence API Server running at ${address}`);
    } catch (err) {
      this.app.log.error(err);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    await this.app.close();
  }

  getApp(): FastifyInstance {
    return this.app;
  }
}
