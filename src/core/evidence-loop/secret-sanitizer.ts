/**
 * Evidence Loop — Secret Sanitizer
 * TASK-MVP-EVIDENCE-LOOP-001A §35
 *
 * Prevents API keys, PATs, credentials, and other secrets
 * from being persisted in evidence, feedback, or any stored entity.
 */

/** Patterns that indicate secrets/credentials in text. */
const SECRET_PATTERNS: readonly RegExp[] = Object.freeze([
  /(?:sk|pk|rk|api[_-]?key|secret[_-]?key|access[_-]?key|pat|token)[_-][a-zA-Z0-9]{20,}/i,
  /Bearer\s+[a-zA-Z0-9._\-]{20,}/i,
  /password\s*[=:]\s*\S+/i,
  /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/,
  /AKIA[A-Z0-9]{16}/, // AWS access key
  /ghp_[a-zA-Z0-9]{36}/, // GitHub PAT
  /sk-or-v1-[a-zA-Z0-9]{48,}/i, // OpenRouter key
  /xox[bpras]-[a-zA-Z0-9\-]{10,}/, // Slack tokens
  /glpat-[a-zA-Z0-9\-]{20,}/, // GitLab PAT
]);

/** Replacement for matched secret patterns. */
const SECRET_REDACTION = '[REDACTED:secret]';

/**
 * Sanitize a string by redacting any detected secrets.
 * This is a best-effort defense — not a substitute for proper secret management.
 */
export function sanitizeSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, SECRET_REDACTION);
  }
  return result;
}

/**
 * Sanitize an object's string values recursively.
 * Only processes string values; leaves numbers, booleans, etc. untouched.
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeSecrets(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }
  return obj;
}