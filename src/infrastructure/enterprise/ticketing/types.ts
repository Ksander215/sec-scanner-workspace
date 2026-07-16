/** INT-013: Ticketing — Types */
export type TicketingSystem = 'jira' | 'servicenow' | 'github' | 'gitlab' | 'azure-devops';

export interface TicketingConnector {
  readonly system: TicketingSystem;
  createTicket(ticket: TicketCreate): Promise<TicketResult>;
  updateTicket(id: string, updates: TicketUpdate): Promise<TicketResult>;
  getTicket(id: string): Promise<TicketResult | null>;
  addComment(id: string, comment: string): Promise<void>;
  listTickets(filter: TicketFilter): Promise<TicketResult[]>;
  health(): Promise<{ available: boolean }>;
}

export interface TicketCreate {
  title: string;
  description: string;
  type: 'bug' | 'task' | 'incident' | 'security-finding';
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'critical';
  labels?: string[];
  assignee?: string;
  findingId?: string;
  riskLevel?: string;
  metadata?: Record<string, unknown>;
}

export interface TicketUpdate {
  status?: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority?: string;
  assignee?: string;
  labels?: string[];
  comment?: string;
}

export interface TicketFilter {
  status?: string[];
  priority?: string[];
  labels?: string[];
  assignee?: string;
  limit?: number;
}

export interface TicketResult {
  id: string;
  key?: string;
  url?: string;
  status: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketingConfig {
  system: TicketingSystem;
  endpoint: string;
  token?: string;
  project?: string;
  defaultLabels?: string[];
}
