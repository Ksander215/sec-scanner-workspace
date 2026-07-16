/** INT-013: Ticketing — Implementations */
import type { TicketingConnector, TicketingSystem, TicketCreate, TicketUpdate, TicketFilter, TicketResult, TicketingConfig } from './types.js';

export class JiraConnector implements TicketingConnector {
  readonly system: TicketingSystem = 'jira';
  private config: TicketingConfig;
  private tickets: Map<string, TicketResult> = new Map();

  constructor(config: TicketingConfig) { this.config = config; }

  async createTicket(ticket: TicketCreate): Promise<TicketResult> {
    const id = crypto.randomUUID();
    const key = `${this.config.project ?? 'SEC'}-${this.tickets.size + 1}`;
    const result: TicketResult = { id, key, url: `${this.config.endpoint}/browse/${key}`, status: 'open', title: ticket.title, createdAt: new Date(), updatedAt: new Date() };
    this.tickets.set(id, result);
    return result;
  }

  async updateTicket(id: string, updates: TicketUpdate): Promise<TicketResult> {
    const ticket = this.tickets.get(id);
    if (!ticket) throw new Error(`Ticket ${id} not found`);
    if (updates.status) ticket.status = updates.status;
    ticket.updatedAt = new Date();
    return ticket;
  }

  async getTicket(id: string): Promise<TicketResult | null> { return this.tickets.get(id) ?? null; }
  async addComment(_id: string, _comment: string): Promise<void> {}
  async listTickets(filter: TicketFilter): Promise<TicketResult[]> {
    let results = [...this.tickets.values()];
    if (filter.status) results = results.filter(t => filter.status!.includes(t.status));
    return results.slice(0, filter.limit ?? 50);
  }

  async health() { return { available: true }; }
}

export class ServiceNowConnector implements TicketingConnector {
  readonly system: TicketingSystem = 'servicenow';
  private config: TicketingConfig;
  private tickets: Map<string, TicketResult> = new Map();

  constructor(config: TicketingConfig) { this.config = config; }
  async createTicket(ticket: TicketCreate): Promise<TicketResult> {
    const id = crypto.randomUUID();
    const result: TicketResult = { id, url: `${this.config.endpoint}/nav_to.do?uri=incident.do?sys_id=${id}`, status: 'open', title: ticket.title, createdAt: new Date(), updatedAt: new Date() };
    this.tickets.set(id, result);
    return result;
  }
  async updateTicket(id: string, updates: TicketUpdate): Promise<TicketResult> {
    const ticket = this.tickets.get(id);
    if (!ticket) throw new Error(`Ticket ${id} not found`);
    if (updates.status) ticket.status = updates.status;
    ticket.updatedAt = new Date();
    return ticket;
  }
  async getTicket(id: string): Promise<TicketResult | null> { return this.tickets.get(id) ?? null; }
  async addComment(): Promise<void> {}
  async listTickets(filter: TicketFilter): Promise<TicketResult[]> { return [...this.tickets.values()].slice(0, filter.limit ?? 50); }
  async health() { return { available: true }; }
}

export class GitHubConnector implements TicketingConnector {
  readonly system: TicketingSystem = 'github';
  private config: TicketingConfig;
  private tickets: Map<string, TicketResult> = new Map();
  constructor(config: TicketingConfig) { this.config = config; }
  async createTicket(ticket: TicketCreate): Promise<TicketResult> {
    const id = crypto.randomUUID();
    const result: TicketResult = { id, url: `${this.config.endpoint}/issues/${this.tickets.size + 1}`, status: 'open', title: ticket.title, createdAt: new Date(), updatedAt: new Date() };
    this.tickets.set(id, result);
    return result;
  }
  async updateTicket(id: string, updates: TicketUpdate): Promise<TicketResult> {
    const t = this.tickets.get(id)!; if (updates.status) t.status = updates.status; t.updatedAt = new Date(); return t;
  }
  async getTicket(id: string): Promise<TicketResult | null> { return this.tickets.get(id) ?? null; }
  async addComment(): Promise<void> {}
  async listTickets(): Promise<TicketResult[]> { return [...this.tickets.values()]; }
  async health() { return { available: true }; }
}

export class GitLabConnector implements TicketingConnector {
  readonly system: TicketingSystem = 'gitlab';
  private config: TicketingConfig;
  private tickets: Map<string, TicketResult> = new Map();
  constructor(config: TicketingConfig) { this.config = config; }
  async createTicket(ticket: TicketCreate): Promise<TicketResult> {
    const id = crypto.randomUUID();
    const result: TicketResult = { id, status: 'open', title: ticket.title, createdAt: new Date(), updatedAt: new Date() };
    this.tickets.set(id, result); return result;
  }
  async updateTicket(id: string, updates: TicketUpdate): Promise<TicketResult> {
    const t = this.tickets.get(id)!; if (updates.status) t.status = updates.status; t.updatedAt = new Date(); return t;
  }
  async getTicket(id: string): Promise<TicketResult | null> { return this.tickets.get(id) ?? null; }
  async addComment(): Promise<void> {}
  async listTickets(): Promise<TicketResult[]> { return [...this.tickets.values()]; }
  async health() { return { available: true }; }
}

export class AzureDevOpsConnector implements TicketingConnector {
  readonly system: TicketingSystem = 'azure-devops';
  private config: TicketingConfig;
  private tickets: Map<string, TicketResult> = new Map();
  constructor(config: TicketingConfig) { this.config = config; }
  async createTicket(ticket: TicketCreate): Promise<TicketResult> {
    const id = crypto.randomUUID();
    const result: TicketResult = { id, status: 'open', title: ticket.title, createdAt: new Date(), updatedAt: new Date() };
    this.tickets.set(id, result); return result;
  }
  async updateTicket(id: string, updates: TicketUpdate): Promise<TicketResult> {
    const t = this.tickets.get(id)!; if (updates.status) t.status = updates.status; t.updatedAt = new Date(); return t;
  }
  async getTicket(id: string): Promise<TicketResult | null> { return this.tickets.get(id) ?? null; }
  async addComment(): Promise<void> {}
  async listTickets(): Promise<TicketResult[]> { return [...this.tickets.values()]; }
  async health() { return { available: true }; }
}

export function createTicketingConnector(config: TicketingConfig): TicketingConnector {
  switch (config.system) {
    case 'jira': return new JiraConnector(config);
    case 'servicenow': return new ServiceNowConnector(config);
    case 'github': return new GitHubConnector(config);
    case 'gitlab': return new GitLabConnector(config);
    case 'azure-devops': return new AzureDevOpsConnector(config);
  }
}
