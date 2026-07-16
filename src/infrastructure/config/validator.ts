import type { ConfigSchema, ConfigPropertySchema, ConfigValidationResult, ConfigValidationError, ConfigValidationWarning } from './types.js';

export class ConfigValidator {
  constructor(private schema: ConfigSchema) {}

  validate(config: Record<string, unknown>): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationWarning[] = [];

    for (const [path, propSchema] of Object.entries(this.schema.properties)) {
      const value = this.getNestedValue(config, path);

      // Check required
      if (value === undefined || value === null) {
        if (propSchema.required) {
          errors.push({ path, message: `Required configuration property "${path}" is missing`, schema: propSchema });
        }
        continue;
      }

      // Check type
      if (!this.checkType(value, propSchema.type)) {
        errors.push({ path, message: `Expected type "${propSchema.type}" but got "${typeof value}"`, value, schema: propSchema });
        continue;
      }

      // Check enum
      if (propSchema.enum && !propSchema.enum.includes(String(value))) {
        errors.push({ path, message: `Value must be one of: ${propSchema.enum.join(', ')}`, value, schema: propSchema });
      }

      // Check min/max for numbers
      if (typeof value === 'number') {
        if (propSchema.min !== undefined && value < propSchema.min) {
          errors.push({ path, message: `Value must be >= ${propSchema.min}`, value, schema: propSchema });
        }
        if (propSchema.max !== undefined && value > propSchema.max) {
          errors.push({ path, message: `Value must be <= ${propSchema.max}`, value, schema: propSchema });
        }
      }

      // Check pattern for strings
      if (propSchema.pattern && typeof value === 'string') {
        const regex = new RegExp(propSchema.pattern);
        if (!regex.test(value)) {
          errors.push({ path, message: `Value does not match pattern: ${propSchema.pattern}`, value, schema: propSchema });
        }
      }

      // Warn about deprecated
      if (propSchema.deprecated) {
        warnings.push({ path, message: `Configuration property "${path}" is deprecated`, suggestion: propSchema.replacedBy ? `Use "${propSchema.replacedBy}" instead` : undefined });
      }

      // Warn about secrets in plain text
      if (propSchema.secret && typeof value === 'string' && value.length > 0 && !value.startsWith('$')) {
        warnings.push({ path, message: `Secret value is set as plain text. Consider using environment variable reference.` });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private checkType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array': return Array.isArray(value);
      default: return true;
    }
  }
}
