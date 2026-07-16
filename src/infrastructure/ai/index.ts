/** INT-012: AI Layer — Unified exports */
export { LlmRouter, createLlmProvider, OpenAiLlmProvider, AzureLlmProvider, AnthropicLlmProvider, OllamaLlmProvider, VllmLlmProvider, LocalGgufLlmProvider } from './llm/index.js';
export type { LlmProvider, LlmChatRequest, LlmChatResponse, LlmCompletionRequest, LlmCompletionResponse, LlmHealth, LlmModel, LlmUsage, LlmConfig, LlmProviderType } from './llm/index.js';

export { AiRiskAssistant } from './risk-assistant/index.js';
export type { RiskExplanationRequest, RiskExplanation, RiskComparisonRequest, RiskComparison } from './risk-assistant/index.js';

export { AiRemediationEngine } from './remediation/index.js';
export type { AiRemediationRequest, AiRemediationPlan, RemediationPhase, RemediationPlaybook, RollbackPlan } from './remediation/index.js';

export { AiThreatHuntingEngine } from './threat-hunting/index.js';
export type { ThreatHuntingQuery, ThreatHuntingResult, GraphPath, LateralMovementResult } from './threat-hunting/index.js';

export { AiSocCopilot } from './copilot/index.js';
export type { CopilotCommand, CopilotRequest, CopilotResponse, CopilotSession, CopilotSuggestion } from './copilot/index.js';
