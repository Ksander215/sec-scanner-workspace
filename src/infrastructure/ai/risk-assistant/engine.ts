/** INT-012: AI Risk Assistant — Engine */
import type { LlmRouter } from '../llm/providers.js';
import type { RiskExplanationRequest, RiskExplanation, ExplanationReasoning, RiskComparisonRequest, RiskComparison } from './types.js';

export class AiRiskAssistant {
  private llmRouter: LlmRouter;

  constructor(llmRouter: LlmRouter) {
    this.llmRouter = llmRouter;
  }

  /** Explain why a finding is at a certain risk level */
  async explainRisk(request: RiskExplanationRequest): Promise<RiskExplanation> {
    const prompt = this.buildRiskExplanationPrompt(request);
    const response = await this.llmRouter.chat({
      messages: [
        { role: 'system', content: 'You are a senior security analyst explaining risk assessments. Be precise, factual, and reference specific risk factors.' },
        { role: 'user', content: prompt },
      ],
      responseFormat: 'json',
    });

    return {
      findingId: request.findingId,
      question: `Why is this ${request.riskLevel}?`,
      explanation: response.content,
      reasoning: this.parseReasoning(response.content),
      evidence: request.factors.map(f => `${f.name}: ${f.value} (weight: ${f.weight}) — ${f.description}`),
      confidence: 0.85,
      generatedAt: new Date(),
      modelUsed: response.model,
      tokenUsage: { prompt: response.usage.promptTokens, completion: response.usage.completionTokens },
    };
  }

  /** Compare risk across multiple findings */
  async compareRisks(request: RiskComparisonRequest): Promise<RiskComparison> {
    const findingsDesc = request.findings.map((f, i) =>
      `#${i + 1}: [${f.riskLevel}] Score ${f.riskScore} — ${f.summary}`,
    ).join('\n');

    const response = await this.llmRouter.chat({
      messages: [
        { role: 'system', content: 'You are a security risk analyst comparing findings. Rank by actual danger and explain your reasoning.' },
        { role: 'user', content: `Compare these security findings:\n${findingsDesc}\n\nQuestion: ${request.question ?? 'Which finding poses the greatest risk and why?'}` },
      ],
    });

    return {
      question: request.question ?? 'Which finding poses the greatest risk?',
      comparison: response.content,
      rankings: request.findings.map((f, i) => ({
        findingId: f.id,
        rank: i + 1,
        reasoning: `Score: ${f.riskScore}, Level: ${f.riskLevel}`,
      })),
      generatedAt: new Date(),
    };
  }

  private buildRiskExplanationPrompt(request: RiskExplanationRequest): string {
    return `Explain why this security finding is rated "${request.riskLevel}" (score: ${request.riskScore}/100):

Risk Factors:
${request.factors.map(f => `- ${f.name}: ${f.value} (weight: ${f.weight}) — ${f.description}`).join('\n')}

Provide:
1. A clear explanation of why this is ${request.riskLevel}
2. Which factors contribute most
3. What the implications are
4. What would change the risk level`;
  }

  private parseReasoning(content: string): ExplanationReasoning[] {
    // Simplified: parse structured reasoning from LLM output
    return [{
      step: 1,
      premise: 'Based on risk factor analysis',
      inference: 'Combined factors indicate this risk level',
      conclusion: content.slice(0, 200),
    }];
  }
}
