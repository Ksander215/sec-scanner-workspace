import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/** Security headers to apply */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

/** Apply security headers middleware */
export function applySecurityHeaders(request: FastifyRequest, reply: FastifyReply, customHeaders?: Record<string, string>): void {
  const headers = { ...SECURITY_HEADERS, ...customHeaders };
  for (const [key, value] of Object.entries(headers)) {
    reply.header(key, value);
  }
}

/** Payload size validation */
export function validatePayloadSize(maxSizeBytes: number): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const contentLength = parseInt(request.headers['content-length'] ?? '0', 10);
    if (contentLength > maxSizeBytes) {
      reply.code(413).send({ error: 'Payload too large', message: `Request body exceeds ${maxSizeBytes} bytes` });
    }
  };
}

/** Input sanitization */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** Request ID validation */
export function validateRequestId(request: FastifyRequest, _reply: FastifyReply): void {
  const requestId = request.headers['x-request-id'] as string | undefined;
  if (requestId && !/^[a-zA-Z0-9\-]{1,64}$/.test(requestId)) {
    delete request.headers['x-request-id'];
  }
}

/** Register all security hardening middleware */
export function registerSecurityHardening(app: FastifyInstance, options?: { maxPayloadBytes?: number; customHeaders?: Record<string, string> }): void {
  // Security headers
  app.addHook('onRequest', (request, reply) => {
    applySecurityHeaders(request, reply, options?.customHeaders);
    validateRequestId(request, reply);
  });

  // Payload size check
  if (options?.maxPayloadBytes) {
    app.addHook('onRequest', validatePayloadSize(options.maxPayloadBytes));
  }
}
