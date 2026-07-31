/**
 * Architecture Compliance & Governance Engine — Quality Validator
 * TASK-AIS-000Z.000
 *
 * Validates code quality: function complexity, file length, test coverage indicators.
 */

import type { RuleEngine } from './rule-engine.js';
import type { IQualityValidator } from './contracts.js';
import type {
  ValidatorId,
  RuleEvaluationResult,
  ComplianceViolation,
  ValidationRequest,
  ComplianceSessionId,
} from './types.js';
import {
  RuleSeverity,
  RuleCategory,
  EnforcementLevel,
  AutoFixCapability,
  ViolationState,
  ValidationTargetType,
} from './types.js';
import {
  brandRuleId,
  brandViolationId,
  brandValidatorId,
} from './types.js';

const MAX_FUNCTION_COMPLEXITY = 10;
const MAX_FILE_LINES = 500;

export class QualityValidator implements IQualityValidator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly category: RuleCategory;

  private readonly ruleEngine: RuleEngine;

  constructor(ruleEngine: RuleEngine) {
    this.id = brandValidatorId('quality-validator');
    this.name = 'QualityValidator';
    this.category = RuleCategory.Quality;
    this.ruleEngine = ruleEngine;
  }

  async registerRules(): Promise<void> {
    // QUAL-001
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('QUAL-001'),
      name: 'Function complexity acceptable',
      description: `Functions should have cyclomatic complexity at most ${MAX_FUNCTION_COMPLEXITY}`,
      category: RuleCategory.Quality,
      severity: RuleSeverity.Warning,
      enforcementLevel: EnforcementLevel.Advisory,
      autoFix: AutoFixCapability.None,
      source: 'GOV-008.000 §9',
      validatorId: this.id,
      enabled: true,
      tags: ['quality', 'complexity', 'maintainability'],
      metadata: { maxComplexity: MAX_FUNCTION_COMPLEXITY },
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('QUAL-001'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('QUAL-001'),
            ruleName: 'Function complexity acceptable',
            category: RuleCategory.Quality,
            severity: RuleSeverity.Warning,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const lines = content.split('\n');
        const complexityPatterns = [
          /\bif\s*\(/g,
          /\belse\s+if\s*\(/g,
          /\bfor\s*\(/g,
          /\bfor\s*\w+\s+of\s/g,
          /\bwhile\s*\(/g,
          /\bdo\s*\{/g,
          /\bcase\s/g,
          /\bcatch\s*\(/g,
          /\?[^?].*:/g,
          /\&\&/g,
          /\|\|/g,
        ];

        const functionRegex = /(?:async\s+)?(?:function\s+\w+|\w+\s*=\s*(?:async\s+)?(?:function\s*\(|\([^)]*\)\s*=>))/g;
        let funcMatch: RegExpExecArray | null;

        while ((funcMatch = functionRegex.exec(content)) !== null) {
          const funcStart = funcMatch.index;
          let braceCount = 0;
          let funcEnd = funcStart;
          let foundFirstBrace = false;

          for (let i = funcStart; i < content.length; i++) {
            if (content[i] === '{') {
              braceCount++;
              foundFirstBrace = true;
            } else if (content[i] === '}') {
              braceCount--;
            }
            if (foundFirstBrace && braceCount === 0) {
              funcEnd = i + 1;
              break;
            }
          }

          const funcBody = content.substring(funcStart, funcEnd);
          let complexity = 1;

          for (const cp of complexityPatterns) {
            const matches = funcBody.match(cp);
            if (matches) {
              complexity += matches.length;
            }
          }

          if (complexity > MAX_FUNCTION_COMPLEXITY) {
            const funcNameMatch = /(?:function\s+(\w+)|(\w+)\s*=\s*(?:async\s+)?(?:function\s*\(|\())/.exec(funcMatch[0]);
            const funcName = funcNameMatch ? (funcNameMatch[1] ?? funcNameMatch[2]) : 'anonymous';

            violations.push(Object.freeze({
              id: brandViolationId(`QUAL-001-v-${violations.length + 1}`),
              ruleId: brandRuleId('QUAL-001'),
              ruleName: 'Function complexity acceptable',
              category: RuleCategory.Quality,
              severity: RuleSeverity.Warning,
              enforcementLevel: EnforcementLevel.Advisory,
              state: ViolationState.Detected,
              description: `Function '${funcName}' has complexity ${complexity} (max ${MAX_FUNCTION_COMPLEXITY})`,
              evidence: [`Function: ${funcName}`, `Estimated complexity: ${complexity}`, `Threshold: ${MAX_FUNCTION_COMPLEXITY}`],
              recommendation: 'Refactor the function to reduce branching; extract helper methods or use early returns',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: { functionName: funcName, complexity },
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('QUAL-001'),
          ruleName: 'Function complexity acceptable',
          category: RuleCategory.Quality,
          severity: RuleSeverity.Warning,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { functionsChecked: lines.length },
        });
      },
    );

    // QUAL-002
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('QUAL-002'),
      name: 'No excessively long files',
      description: `Files should not exceed ${MAX_FILE_LINES} lines`,
      category: RuleCategory.Quality,
      severity: RuleSeverity.Warning,
      enforcementLevel: EnforcementLevel.Advisory,
      autoFix: AutoFixCapability.None,
      source: 'GOV-008.000 §9',
      validatorId: this.id,
      enabled: true,
      tags: ['quality', 'file-length', 'maintainability'],
      metadata: { maxLines: MAX_FILE_LINES },
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('QUAL-002'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('QUAL-002'),
            ruleName: 'No excessively long files',
            category: RuleCategory.Quality,
            severity: RuleSeverity.Warning,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const lineCount = content.split('\n').length;

        if (lineCount > MAX_FILE_LINES) {
          violations.push(Object.freeze({
            id: brandViolationId('QUAL-002-v-1'),
            ruleId: brandRuleId('QUAL-002'),
            ruleName: 'No excessively long files',
            category: RuleCategory.Quality,
            severity: RuleSeverity.Warning,
            enforcementLevel: EnforcementLevel.Advisory,
            state: ViolationState.Detected,
            description: `File has ${lineCount} lines (max ${MAX_FILE_LINES})`,
            evidence: [`Line count: ${lineCount}`, `Threshold: ${MAX_FILE_LINES}`, `Over by: ${lineCount - MAX_FILE_LINES} lines`],
            recommendation: 'Split the file into smaller, focused modules',
            autoFixAvailable: AutoFixCapability.None,
            target,
            detectedAt: new Date().toISOString(),
            resolvedAt: null,
            metadata: { lineCount },
          }));
        }

        return Object.freeze({
          ruleId: brandRuleId('QUAL-002'),
          ruleName: 'No excessively long files',
          category: RuleCategory.Quality,
          severity: RuleSeverity.Warning,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { lineCount },
        });
      },
    );

    // QUAL-003
    await this.ruleEngine.registerRule(Object.freeze({
      id: brandRuleId('QUAL-003'),
      name: 'Test coverage indicators',
      description: 'Modules should have corresponding test files',
      category: RuleCategory.Quality,
      severity: RuleSeverity.Info,
      enforcementLevel: EnforcementLevel.Advisory,
      autoFix: AutoFixCapability.None,
      source: 'GOV-008.000 §9',
      validatorId: this.id,
      enabled: true,
      tags: ['quality', 'test-coverage', 'testing'],
      metadata: {},
    }));

    await this.ruleEngine.registerValidatorFunction(
      brandRuleId('QUAL-003'),
      async (request: ValidationRequest): Promise<RuleEvaluationResult> => {
        const startTime = Date.now();
        const content = request.targetContent;
        const target = request.targetPath;

        if (!content) {
          return Object.freeze({
            ruleId: brandRuleId('QUAL-003'),
            ruleName: 'Test coverage indicators',
            category: RuleCategory.Quality,
            severity: RuleSeverity.Info,
            passed: true,
            violations: [],
            durationMs: Date.now() - startTime,
            autoFixed: false,
            metadata: { note: 'No content provided; skipping check' },
          });
        }

        const violations: ComplianceViolation[] = [];
        const isSourceFile = /\.ts$/.test(target) && !/\.(test|spec)\.ts$/.test(target);

        if (isSourceFile) {
          const hasInternalTestMarker = /@(?:internal|private|testing)/.test(content);
          const exportsSomething = /export\s+/.test(content);
          const hasDescribeOrTest = /(?:describe|it|test)\s*\(/.test(content);

          if (exportsSomething && !hasInternalTestMarker && !hasDescribeOrTest) {
            violations.push(Object.freeze({
              id: brandViolationId('QUAL-003-v-1'),
              ruleId: brandRuleId('QUAL-003'),
              ruleName: 'Test coverage indicators',
              category: RuleCategory.Quality,
              severity: RuleSeverity.Info,
              enforcementLevel: EnforcementLevel.Advisory,
              state: ViolationState.Detected,
              description: 'Source file exports symbols but no corresponding test coverage indicator found',
              evidence: ['File exports symbols', 'No inline tests or @testing marker detected'],
              recommendation: 'Create a corresponding .test.ts file or add @testing marker for internal-only modules',
              autoFixAvailable: AutoFixCapability.None,
              target,
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
              metadata: {},
            }));
          }
        }

        return Object.freeze({
          ruleId: brandRuleId('QUAL-003'),
          ruleName: 'Test coverage indicators',
          category: RuleCategory.Quality,
          severity: RuleSeverity.Info,
          passed: violations.length === 0,
          violations,
          durationMs: Date.now() - startTime,
          autoFixed: false,
          metadata: { isSourceFile },
        });
      },
    );
  }

  async validate(request: ValidationRequest): Promise<RuleEvaluationResult[]> {
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }

  async validateQuality(
    modulePath: string,
    content: string,
    sessionId: ComplianceSessionId,
  ): Promise<RuleEvaluationResult[]> {
    const request: ValidationRequest = Object.freeze({
      targetType: ValidationTargetType.Architecture,
      targetPath: modulePath,
      targetContent: content,
      categories: [RuleCategory.Quality] as readonly RuleCategory[],
      sessionId,
      metadata: {},
    });
    const result = await this.ruleEngine.evaluateRules(request);
    return [...result.results];
  }
}
