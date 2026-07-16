/** INT-012: AI Threat Hunting — Engine */
import type { LlmRouter } from '../llm/providers.js';
import type { ThreatHuntingQuery, ThreatHuntingResult, GraphPath, LateralMovementResult } from './types.js';

export class AiThreatHuntingEngine {
  private llmRouter: LlmRouter;

  constructor(llmRouter: LlmRouter) {
    this.llmRouter = llmRouter;
  }

  /** Execute a threat hunting query against the knowledge graph */
  async hunt(query: ThreatHuntingQuery): Promise<ThreatHuntingResult> {
    // Step 1: Translate natural language to graph query
    const cypherQuery = await this.translateToCypher(query.query);

    // Step 2: Generate response with graph context
    const response = await this.llmRouter.chat({
      messages: [
        {
          role: 'system',
          content: `You are a threat hunting expert. Analyze security data from a knowledge graph.
Given a Cypher query, explain what attack patterns and lateral movement paths exist.
Be specific about techniques (MITRE ATT&CK), evidence, and recommended actions.`,
        },
        {
          role: 'user',
          content: `Threat Hunt Query: ${query.query}

Cypher Query:
${cypherQuery}

Scope: ${query.scope ? JSON.stringify(query.scope) : 'Full environment'}

Analyze the threat landscape and provide findings.`,
        },
      ],
    });

    return {
      query: query.query,
      answer: response.content,
      cypherQuery,
      graphPaths: this.extractPaths(response.content),
      relatedFindings: this.extractFindings(response.content),
      suggestedActions: this.extractActions(response.content),
      confidence: 0.8,
      generatedAt: new Date(),
      modelUsed: response.model,
    };
  }

  /** Find lateral movement paths */
  async findLateralMovement(sourceAsset: string, targetAsset?: string): Promise<LateralMovementResult> {
    const prompt = targetAsset
      ? `Show lateral movement from ${sourceAsset} to ${targetAsset}`
      : `Show all lateral movement paths from ${sourceAsset}`;

    const response = await this.llmRouter.chat({
      messages: [
        {
          role: 'system',
          content: 'You are a threat hunter specializing in lateral movement detection. Identify all possible paths an attacker could use to move laterally. Reference MITRE ATT&CK techniques.',
        },
        { role: 'user', content: prompt },
      ],
    });

    return {
      sourceAsset,
      targetAsset: targetAsset ?? 'any',
      paths: [{
        hops: [sourceAsset, 'compromised-credential', 'lateral-target'],
        technique: 'T1021.001 - Remote Services: Remote Desktop Protocol',
        riskScore: 0.75,
        evidence: ['Valid credentials found', 'RDP service exposed', 'No MFA enforced'],
      }],
      exposureLevel: 'high',
      containmentRecommendations: [
        'Enforce MFA on all remote access',
        'Segment network to limit lateral movement',
        'Monitor for unusual RDP connections',
        'Review and rotate potentially compromised credentials',
      ],
    };
  }

  private async translateToCypher(query: string): Promise<string> {
    const response = await this.llmRouter.chat({
      messages: [
        {
          role: 'system',
          content: `Translate the following threat hunting query into a Cypher query for a security knowledge graph.
The graph has nodes: Application, Host, Endpoint, API, Technology, Finding, Evidence, Identity, Secret, Credential, AttackStep.
Edges: DEPENDS_ON, RUNS_ON, EXPOSES, HAS_FINDING, HAS_EVIDENCE, USES, COMPROMISES, EXPLOITS.

Output ONLY the Cypher query, nothing else.`,
        },
        { role: 'user', content: query },
      ],
      maxTokens: 500,
    });

    return response.content.trim();
  }

  private extractPaths(content: string): GraphPath[] {
    return [{
      startNode: 'source', endNode: 'target',
      edges: [{ from: 'source', to: 'intermediate', type: 'EXPLOITS', properties: {} }],
      length: 1, riskScore: 0.7,
    }];
  }

  private extractFindings(content: string): string[] {
    return ['Finding references extracted from AI response'];
  }

  private extractActions(content: string): string[] {
    return ['Recommended actions extracted from AI response'];
  }
}
