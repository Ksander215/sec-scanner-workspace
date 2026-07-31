/**
 * Architecture Compliance & Governance Engine — Compliance Runtime (Orchestrator)
 * TASK-AIS-000Z.000
 *
 * Main orchestrator that wires all 15 subsystems together:
 *   - RuleEngine, PolicyEngine
 *   - ReportGenerator, ComplianceMetricsRuntime
 *   - 10 Validators (Architecture, Runtime, Capability, Documentation,
 *     Trace, Value, Constraint, Privacy, Security, Quality)
 *
 * Conforms to IComplianceRuntime from contracts.ts.
 */

import type { IComplianceRuntime } from './contracts.js';
import type {
  ComplianceRuntimeConfig,
  RuleId,
  PolicyId,
  ComplianceSessionId,
  ComplianceReport,
  ComplianceMetrics,
  ValidationResult,
  ValidationRequest,
  ComplianceRule,
  CompliancePolicy,
} from './types.js';
import {
  RuleCategory,
  ComplianceState,
  ComplianceRuntimeState,
  ValidationTargetType,
  brandComplianceSessionId,
} from './types.js';
import { RuleEngine } from './rule-engine.js';
import { PolicyEngine } from './policy-engine.js';
import { ReportGenerator } from './report-generator.js';
import { ComplianceMetricsRuntime } from './compliance-metrics.js';
import { ArchitectureValidator } from './architecture-validator.js';
import { RuntimeValidator } from './runtime-validator.js';
import { CapabilityValidator } from './capability-validator.js';
import { DocumentationValidator } from './documentation-validator.js';
import { TraceValidator } from './trace-validator.js';
import { ValueValidator } from './value-validator.js';
import { ConstraintValidator } from './constraint-validator.js';
import { PrivacyValidator } from './privacy-validator.js';
import { SecurityValidator } from './security-validator.js';
import { QualityValidator } from './quality-validator.js';
import { ComplianceNotInitializedError } from './errors.js';
import type { InProcessEventBus } from '../events/event-bus.js';

/**
 * Compliance Runtime — the main orchestrator for the compliance engine.
 *
 * Creates and wires all subsystems internally.
 * initialize() must be called explicitly after construction.
 */
export class ComplianceRuntime implements IComplianceRuntime {
  // ─── Subsystems ──────────────────────────────────────────────
  private readonly ruleEngine: RuleEngine;
  private readonly policyEngine: PolicyEngine;
  private readonly reportGenerator: ReportGenerator;
  private readonly metrics: ComplianceMetricsRuntime;

  // ─── Validators ──────────────────────────────────────────────
  private readonly architectureValidator: ArchitectureValidator;
  private readonly runtimeValidator: RuntimeValidator;
  private readonly capabilityValidator: CapabilityValidator;
  private readonly documentationValidator: DocumentationValidator;
  private readonly traceValidator: TraceValidator;
  private readonly valueValidator: ValueValidator;
  private readonly constraintValidator: ConstraintValidator;
  private readonly privacyValidator: PrivacyValidator;
  private readonly securityValidator: SecurityValidator;
  private readonly qualityValidator: QualityValidator;

  // ─── Internal State ──────────────────────────────────────────
  private readonly eventBus: InProcessEventBus | null;
  private sessionId: ComplianceSessionId | null = null;
  private latestResults: ValidationResult[] = [];
  private runtimeState: ComplianceRuntimeState = ComplianceRuntimeState.Uninitialized;

  constructor(
    config: ComplianceRuntimeConfig,
    eventBus?: InProcessEventBus | null,
  ) {
    this.eventBus = eventBus ?? null;

    // Create core engines
    this.ruleEngine = new RuleEngine(config.ruleEngine, this.eventBus);
    this.policyEngine = new PolicyEngine(config.policyEngine, this.ruleEngine, this.eventBus);
    this.reportGenerator = new ReportGenerator(config.reportGenerator, this.eventBus);
    this.metrics = new ComplianceMetricsRuntime(config.metrics);

    // Create all 10 validators
    this.architectureValidator = new ArchitectureValidator(this.ruleEngine);
    this.runtimeValidator = new RuntimeValidator(this.ruleEngine);
    this.capabilityValidator = new CapabilityValidator(this.ruleEngine);
    this.documentationValidator = new DocumentationValidator(this.ruleEngine);
    this.traceValidator = new TraceValidator(this.ruleEngine);
    this.valueValidator = new ValueValidator(this.ruleEngine);
    this.constraintValidator = new ConstraintValidator(this.ruleEngine);
    this.privacyValidator = new PrivacyValidator(this.ruleEngine);
    this.securityValidator = new SecurityValidator(this.ruleEngine);
    this.qualityValidator = new QualityValidator(this.ruleEngine);
  }

  // ─── State Getter ────────────────────────────────────────────

  get state(): ComplianceState {
    return this.mapRuntimeState(this.runtimeState);
  }

  // ─── Lifecycle ───────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.runtimeState = ComplianceRuntimeState.Initializing;

    try {
      // Create session ID
      this.sessionId = brandComplianceSessionId(
        `session-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      );

      // Register rules from all 10 validators
      await this.architectureValidator.registerRules();
      await this.runtimeValidator.registerRules();
      await this.capabilityValidator.registerRules();
      await this.documentationValidator.registerRules();
      await this.traceValidator.registerRules();
      await this.valueValidator.registerRules();
      await this.constraintValidator.registerRules();
      await this.privacyValidator.registerRules();
      await this.securityValidator.registerRules();
      await this.qualityValidator.registerRules();

      this.runtimeState = ComplianceRuntimeState.Ready;
    } catch (error) {
      this.runtimeState = ComplianceRuntimeState.Error;
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.runtimeState = ComplianceRuntimeState.Stopping;
    this.latestResults = [];
    this.runtimeState = ComplianceRuntimeState.Stopped;
  }

  // ─── Validation Methods ──────────────────────────────────────

  async validateArchitecture(
    modulePath: string,
    content?: string,
  ): Promise<ValidationResult> {
    this.ensureInitialized();
    const request = this.createRequest(
      ValidationTargetType.Architecture,
      modulePath,
      content,
      [RuleCategory.Architecture],
    );
    return this.executeValidation(request);
  }

  async validateRuntime(runtimePath: string): Promise<ValidationResult> {
    this.ensureInitialized();
    const request = this.createRequest(
      ValidationTargetType.Runtime,
      runtimePath,
      undefined,
      [RuleCategory.Runtime],
    );
    return this.executeValidation(request);
  }

  async validateCapability(capabilityPath: string): Promise<ValidationResult> {
    this.ensureInitialized();
    const request = this.createRequest(
      ValidationTargetType.CapabilityPack,
      capabilityPath,
      undefined,
      [RuleCategory.CapabilityPack],
    );
    return this.executeValidation(request);
  }

  async validateDocumentation(
    docPath: string,
    content?: string,
  ): Promise<ValidationResult> {
    this.ensureInitialized();
    const request = this.createRequest(
      ValidationTargetType.Documentation,
      docPath,
      content,
      [RuleCategory.Documentation],
    );
    return this.executeValidation(request);
  }

  async validateRepository(rootPath: string): Promise<ValidationResult> {
    this.ensureInitialized();
    const allCategories = Object.values(
      RuleCategory,
    ) as readonly RuleCategory[];
    const request = this.createRequest(
      ValidationTargetType.Repository,
      rootPath,
      undefined,
      allCategories,
    );
    return this.executeValidation(request);
  }

  // ─── Report & Metrics ────────────────────────────────────────

  async generateComplianceReport(): Promise<ComplianceReport> {
    this.ensureInitialized();
    const report = await this.reportGenerator.generateReport(
      this.latestResults,
      this.sessionId!,
    );
    return report;
  }

  async getMetrics(): Promise<ComplianceMetrics> {
    return this.metrics.getMetrics();
  }

  // ─── Rule & Policy Delegation ────────────────────────────────

  async getRule(ruleId: RuleId): Promise<ComplianceRule | null> {
    return this.ruleEngine.getRule(ruleId);
  }

  async listRules(
    category?: RuleCategory,
  ): Promise<readonly ComplianceRule[]> {
    if (category !== undefined) {
      return this.ruleEngine.listRules({ category });
    }
    return this.ruleEngine.listRules();
  }

  async getPolicy(policyId: PolicyId): Promise<CompliancePolicy | null> {
    return this.policyEngine.getPolicy(policyId);
  }

  async listPolicies(): Promise<readonly CompliancePolicy[]> {
    return this.policyEngine.listPolicies();
  }

  // ─── Subsystem Accessors ─────────────────────────────────────

  getRuleEngine(): RuleEngine {
    return this.ruleEngine;
  }

  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private ensureInitialized(): void {
    if (this.runtimeState !== ComplianceRuntimeState.Ready) {
      throw new ComplianceNotInitializedError({
        currentState: this.runtimeState,
      });
    }
  }

  private createRequest(
    targetType: ValidationTargetType,
    targetPath: string,
    content: string | undefined,
    categories: readonly RuleCategory[],
  ): ValidationRequest {
    return Object.freeze({
      targetType,
      targetPath,
      targetContent: content,
      categories,
      sessionId: this.sessionId!,
      metadata: {},
    });
  }

  private async executeValidation(
    request: ValidationRequest,
  ): Promise<ValidationResult> {
    this.runtimeState = ComplianceRuntimeState.Running;

    try {
      const result = await this.ruleEngine.evaluateRules(request);
      this.metrics.recordResult(result);
      this.latestResults.push(result);
      this.runtimeState = ComplianceRuntimeState.Ready;
      return result;
    } catch (error) {
      this.runtimeState = ComplianceRuntimeState.Error;
      throw error;
    }
  }

  private mapRuntimeState(state: ComplianceRuntimeState): ComplianceState {
    switch (state) {
      case ComplianceRuntimeState.Uninitialized:
      case ComplianceRuntimeState.Ready:
        return ComplianceState.Idle;
      case ComplianceRuntimeState.Initializing:
      case ComplianceRuntimeState.Running:
      case ComplianceRuntimeState.Stopping:
        return ComplianceState.Running;
      case ComplianceRuntimeState.Stopped:
        return ComplianceState.Completed;
      case ComplianceRuntimeState.Error:
        return ComplianceState.Failed;
    }
  }
}
