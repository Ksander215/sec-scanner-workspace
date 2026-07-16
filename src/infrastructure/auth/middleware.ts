import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthProvider, AuthenticatedUser, Permission } from './types.js';
import { RbacEngine } from './rbac.js';

export class AuthMiddleware {
  private rbac = new RbacEngine();

  constructor(private provider: AuthProvider) {}

  /** Fastify onRequest hook for authentication */
  authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const token = this.extractToken(request);
    if (!token) {
      reply.code(401).send({ error: 'Unauthorized', message: 'No authentication token provided' });
      return;
    }

    const result = await this.provider.authenticate(token);
    if (!result.success || !result.user) {
      reply.code(401).send({ error: 'Unauthorized', message: result.error ?? 'Authentication failed' });
      return;
    }

    // Attach user to request
    (request as any).user = result.user;
  };

  /** Create a permission check preHandler */
  requirePermission(...permissions: Permission[]) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const user = (request as any).user as AuthenticatedUser | undefined;
      if (!user) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      if (!this.rbac.hasAnyPermission(user, permissions)) {
        reply.code(403).send({ error: 'Forbidden', message: `Required permissions: ${permissions.join(', ')}` });
        return;
      }
    };
  }

  /** Create a role check preHandler */
  requireRole(...roles: string[]) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const user = (request as any).user as AuthenticatedUser | undefined;
      if (!user) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
        return;
      }

      if (!roles.some(r => user.roles.includes(r as any))) {
        reply.code(403).send({ error: 'Forbidden', message: `Required roles: ${roles.join(', ')}` });
        return;
      }
    };
  }

  private extractToken(request: FastifyRequest): string | null {
    // Bearer token from Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // API key from header
    const apiKey = request.headers['x-api-key'] as string | undefined;
    if (apiKey) return apiKey;

    // API key from query param
    const queryKey = (request.query as Record<string, string>).api_key;
    if (queryKey) return queryKey;

    return null;
  }
}
