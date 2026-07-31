import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from '../../../core/compliance/rule-engine.js';
import { ArchitectureValidator } from '../../../core/compliance/architecture-validator.js';
import {
  brandRuleId, brandComplianceSessionId, RuleCategory, RuleSeverity,
  EnforcementLevel, AutoFixCapability, ViolationState, ValidationTargetType,
} from '../../../core/compliance/types.js';

describe('ArchitectureValidator', () => {
  let engine: RuleEngine;
  let validator: ArchitectureValidator;
  const sid = brandComplianceSessionId('test');

  const mkReq = (content: string, path = 'test.ts') => Object.freeze({
    targetType: ValidationTargetType.Architecture, targetPath: path, targetContent: content, sessionId: sid, metadata: {},
  });

  beforeEach(async () => {
    engine = new RuleEngine({ maxConcurrentEvaluations: 5, evaluationTimeoutMs: 5000, failFast: false, autoFixEnabled: false, cacheResults: false, cacheTtlMs: 0 });
    validator = new ArchitectureValidator(engine);
    await validator.registerRules();
  });

  // ═══════════════════════════════════════════════════════════════════
  // Constructor & Identity
  // ═══════════════════════════════════════════════════════════════════
  describe('constructor', () => {
    it('should create an instance', () => {
      expect(validator).toBeInstanceOf(ArchitectureValidator);
    });
    it('should have id as a string', () => {
      expect(typeof validator.id).toBe('string');
    });
    it('should have id containing architecture-validator', () => {
      expect(validator.id).toContain('architecture-validator');
    });
    it('should have name 