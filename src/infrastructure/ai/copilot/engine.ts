/** INT-012: AI SOC Copilot — Engine */
import type { LlmRouter } from '../llm/providers.js';
import type {
  CopilotCommand, CopilotRequest, CopilotResponse, CopilotContext,
  CopilotMessage, CopilotSuggestion, CopilotSession,
} from './types.js';

const COMMAND_SYSTEM_PROMPTS: Record<CopilotCommand, string> = {
  '/investigate': 'You are a security investigator. Deep-dive into the specified finding, trace its origin, identify related findings, and map the attack chain.',
  '/explain': 'You are a security educator. Explain the finding, its risk level, and why it matters in clear terms. Reference specific risk factors and impact.',
  '/remediate': 'You are a security engineer. Generate a step-by-step remediation plan with commands, rollback steps, and verification procedures.',
  '/summarize': 'You are a security analyst. Provide a concise executive summary of the current security posture, key findings, and top risks.',
  '/hunt': 'You are a threat hunter. Proactively search for indicators of compromise and lateral movement paths based on current findings.',
  '/status': 'You are a security operations center analyst. Provide the current status of security operations, active investigations, and pending items.',
  '/help': 'You are a helpful SOC assistant. Explain available commands and how to use the copilot effectively.',
};

export class AiSocCopilot {
  private llmRouter: LlmRouter;
  private sessions: Map<string, CopilotSession> = new Map();

  constructor(llmRouter: LlmRouter) {
    this.llmRouter = llmRouter;
  }

  /** Create a new copilot session */
  createSession(userId: string, tenantId?: string): CopilotSession {
    const session: CopilotSession = {
      id: crypto.randomUUID(),
      userId,
      tenantId,
      startedAt: new Date(),
      messages: [],
      context: { userId, tenantId, conversationHistory: [] },
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /** Execute a copilot command */
  async execute(sessionId: string, request: CopilotRequest): Promise<CopilotResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    // Add user message
    const userMessage: CopilotMessage = {
      role: 'user',
      content: `${request.command} ${request.args}`.trim(),
      timestamp: new Date(),
      command: request.command,
    };
    session.messages.push(userMessage);

    // Build LLM context
    const systemPrompt = COMMAND_SYSTEM_PROMPTS[request.command] ?? COMMAND_SYSTEM_PROMPTS['/help'];
    const historyMessages = session.messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const response = await this.llmRouter.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
      ],
      maxTokens: 2000,
    });

    // Add assistant message
    const assistantMessage: CopilotMessage = {
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      command: request.command,
    };
    session.messages.push(assistantMessage);

    return {
      command: request.command,
      content: response.content,
      suggestions: this.generateSuggestions(request.command),
      followUpCommands: this.getFollowUpCommands(request.command),
      generatedAt: new Date(),
      modelUsed: response.model,
      tokenUsage: { prompt: response.usage.promptTokens, completion: response.usage.completionTokens },
    };
  }

  /** Get session history */
  getSessionHistory(sessionId: string): CopilotMessage[] {
    return this.sessions.get(sessionId)?.messages ?? [];
  }

  /** List active sessions */
  listSessions(userId?: string): CopilotSession[] {
    const sessions = [...this.sessions.values()];
    if (userId) return sessions.filter(s => s.userId === userId);
    return sessions;
  }

  /** End a session */
  endSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  private generateSuggestions(command: CopilotCommand): CopilotSuggestion[] {
    const suggestions: Record<CopilotCommand, CopilotSuggestion[]> = {
      '/investigate': [
        { command: '/explain', description: 'Explain the root cause' },
        { command: '/hunt', description: 'Search for related threats', autoFill: 'lateral-movement' },
      ],
      '/explain': [
        { command: '/remediate', description: 'Generate fix plan' },
        { command: '/investigate', description: 'Deep dive into this finding' },
      ],
      '/remediate': [
        { command: '/status', description: 'Check current operations status' },
        { command: '/explain', description: 'Re-explain the vulnerability' },
      ],
      '/summarize': [
        { command: '/investigate', description: 'Investigate top finding', autoFill: 'top-critical' },
        { command: '/hunt', description: 'Proactive threat hunt' },
      ],
      '/hunt': [
        { command: '/investigate', description: 'Investigate discovered path' },
        { command: '/remediate', description: 'Generate containment plan' },
      ],
      '/status': [
        { command: '/summarize', description: 'Get executive summary' },
        { command: '/investigate', description: 'Investigate active findings' },
      ],
      '/help': [
        { command: '/investigate', description: 'Start an investigation' },
        { command: '/summarize', description: 'Get security overview' },
      ],
    };
    return suggestions[command] ?? [];
  }

  private getFollowUpCommands(command: CopilotCommand): CopilotCommand[] {
    const map: Record<CopilotCommand, CopilotCommand[]> = {
      '/investigate': ['/explain', '/hunt', '/remediate'],
      '/explain': ['/remediate', '/investigate'],
      '/remediate': ['/status', '/explain'],
      '/summarize': ['/investigate', '/hunt'],
      '/hunt': ['/investigate', '/remediate'],
      '/status': ['/summarize', '/investigate'],
      '/help': ['/investigate', '/summarize', '/hunt'],
    };
    return map[command] ?? [];
  }
}
