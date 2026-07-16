/** INT-012: AI SOC Copilot — Types */

export type CopilotCommand = '/investigate' | '/explain' | '/remediate' | '/summarize' | '/hunt' | '/status' | '/help';

export interface CopilotRequest {
  command: CopilotCommand;
  args: string;
  context?: CopilotContext;
}

export interface CopilotContext {
  currentFindingId?: string;
  currentReportId?: string;
  tenantId?: string;
  userId: string;
  conversationHistory: CopilotMessage[];
}

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  command?: CopilotCommand;
}

export interface CopilotResponse {
  command: CopilotCommand;
  content: string;
  data?: Record<string, unknown>;
  suggestions: CopilotSuggestion[];
  followUpCommands: CopilotCommand[];
  generatedAt: Date;
  modelUsed: string;
  tokenUsage: { prompt: number; completion: number };
}

export interface CopilotSuggestion {
  command: CopilotCommand;
  description: string;
  autoFill?: string;
}

export interface CopilotSession {
  id: string;
  userId: string;
  tenantId?: string;
  startedAt: Date;
  messages: CopilotMessage[];
  context: CopilotContext;
}
