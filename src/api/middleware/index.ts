import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/** Request ID middleware */
export async function requestIdMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const id = request.headers['x-request-id'] as string | undefined ?? crypto.randomUUID();
  request.id = id;
  reply.header('x-request-id', id);
}

/** Logging middleware */
export async function loggingMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const start = Date.now();
  request.log.info({ method: request.method, url: request.url, requestId: request.id }, 'Request received');
  
  reply.raw.on('finish', () => {
    const duration = Date.now() - start;
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: duration,
      requestId: request.id,
    }, 'Request completed');
  });
}

/** Timing middleware */
export async function timingMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const start = Date.now();
  reply.raw.on('finish', () => {
    reply.header('x-response-time', `${Date.now() - start}ms`);
  });
}

/** Error mapping middleware */
export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply): void {
  const statusCode = (error as any).statusCode ?? 500;
  request.log.error({ error: error.message, stack: error.stack, requestId: request.id }, 'Request error');
  
  reply.status(statusCode).send({
    error: error.name,
    message: error.message,
    statusCode,
    requestId: request.id,
  });
}

/** Register all middleware */
export function registerMiddleware(app: FastifyInstance): void {
  app.addHook('onRequest', requestIdMiddleware);
  app.addHook('onRequest', loggingMiddleware);
  app.addHook('onRequest', timingMiddleware);
  app.setErrorHandler(errorHandler);
}
