/** Secrets abstraction — resolves $ENV_VAR references */
export class SecretsResolver {
  private secretsCache = new Map<string, string>();

  /** Resolve a value that may contain secret references ($ENV_VAR or ${ENV_VAR}) */
  resolve(value: unknown): unknown {
    if (typeof value !== 'string') return value;

    // Match $ENV_VAR or ${ENV_VAR} patterns
    const envPattern = /\$\{?([A-Z_][A-Z0-9_]*)\}?/g;
    return value.replace(envPattern, (match, varName) => {
      const envValue = process.env[varName];
      if (envValue !== undefined) {
        this.secretsCache.set(varName, '[REDACTED]');
        return envValue;
      }
      // Try to find in secrets cache
      if (this.secretsCache.has(varName)) {
        return this.secretsCache.get(varName)!;
      }
      return match; // leave as-is if env var not found
    });
  }

  /** Resolve all secrets in a config object */
  resolveAll(config: Record<string, unknown>): Record<string, unknown> {
    return this.resolveObject(config);
  }

  /** Mask secrets for safe display */
  maskForDisplay(config: Record<string, unknown>, secretKeys: Set<string>): Record<string, unknown> {
    return this.maskObject(config, secretKeys, '');
  }

  private resolveObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.resolve(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.resolveObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[key] = value.map(v => typeof v === 'string' ? this.resolve(v) : v);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private maskObject(obj: Record<string, unknown>, secretKeys: Set<string>, prefix: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (secretKeys.has(fullKey) && typeof value === 'string' && value.length > 0) {
        result[key] = '********';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.maskObject(value as Record<string, unknown>, secretKeys, fullKey);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
