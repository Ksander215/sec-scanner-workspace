/**
 * Universal AI Provider Runtime — Tool Runtime
 * TASK-AIS-006A.000
 *
 * Registers tools, invokes them, records invocations, publishes events.
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type { IToolRuntime } from './contracts.js';
import type {
  ExecutionId, ToolInvocation, ToolDefinition,
} from './types.js';
import { ToolNotFoundError, ToolInvocationError } from './errors.js';
import type { ToolInvokedEvent } from './events.js';

export class ToolRuntime implements IToolRuntime {
  private readonly eventBus: InProcessEventBus | null;
  private readonly tools = new Map<string, { definition: ToolDefinition; handler: (args: string) => Promise<string> }>();
  private readonly invocations = new Map<string, ToolInvocation[]>();

  constructor(eventBus?: InProcessEventBus | null) {
    this.eventBus = eventBus ?? null;
  }

  private publish(event: DomainEventBase): void {
    if (this.eventBus) { void this.eventBus.publish(event); }
  }

  registerTool(definition: ToolDefinition, handler: (args: string) => Promise<string>): void {
    this.tools.set(definition.name, { definition, handler });
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  listTools(): readonly ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async invoke(
    executionId: ExecutionId,
    toolCallId: string,
    toolName: string,
    args: string,
  ): Promise<string> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }

    const startTime = Date.now();
    let status: ToolInvocation['status'] = 'completed';
    let result = '';

    try {
      result = await tool.handler(args);
    } catch (err) {
      status = 'failed';
      result = err instanceof Error ? err.message : String(err);
      this.recordInvocation(executionId, toolCallId, toolName, args, result, status, Date.now() - startTime);
      throw new ToolInvocationError(toolName, result);
    }

    this.recordInvocation(executionId, toolCallId, toolName, args, result, status, Date.now() - startTime);
    return result;
  }

  private recordInvocation(
    executionId: ExecutionId,
    toolCallId: string,
    toolName: string,
    args: string,
    result: string,
    status: ToolInvocation['status'],
    latencyMs: number,
  ): void {
    const invocation: ToolInvocation = Object.freeze({
      id: crypto.randomUUID(),
      executionId,
      toolCallId,
      toolName,
      arguments: args,
      result,
      status,
      latencyMs,
      timestamp: new Date().toISOString(),
      metadata: {},
    });

    const eid = executionId as string;
    const list = this.invocations.get(eid) ?? [];
    list.push(invocation);
    this.invocations.set(eid, list);

    this.publish(Object.freeze({
      eventType: 'tool.invoked',
      classification: EventClassification.Action,
      executionId,
      toolName,
      toolCallId,
      status,
      latencyMs,
      timestamp: new Date().toISOString(),
      metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: eid, aggregateType: 'ToolInvocation', version: '1.0.0',
    } as ToolInvokedEvent & DomainEventBase));
  }

  async getInvocation(executionId: ExecutionId): Promise<readonly ToolInvocation[]> {
    return this.invocations.get(executionId as string) ?? [];
  }
}
