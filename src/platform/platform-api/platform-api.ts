/**
 * Platform API — Unified facade for Desktop to interact with AIS
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Single entry point for all platform operations.
 */
import type {
  PlatformAPI as PlatformAPIInterface,
  PlatformState,
  PlatformHealthSnapshot,
  PlatformInfo,
  ConfigValue,
  CommandResult,
  QueryResult,
  PlatformEvent,
} from '../types.js';

class DelegatingPlatformAPI implements PlatformAPIInterface {
  constructor(
    private getState: () => PlatformState,
    private startFn: () => Promise<void>,
    private stopFn: () => Promise<void>,
    private restartFn: () => Promise<void>,
    private getHealthFn: () => Promise<PlatformHealthSnapshot>,
    private getDiagnosticsFn: () => PlatformInfo,
    private getConfigFn: () => Readonly<Record<string, ConfigValue>>,
    private dispatchCommandFn: <TP, TR>(type: string, payload: TP) => Promise<CommandResult<TR>>,
    private executeQueryFn: <TP, TR>(type: string, payload: TP) => Promise<QueryResult<TR>>,
    private publishEventFn: <T>(type: string, payload: T) => Promise<PlatformEvent<T>>,
    private resolveFn: <T>(id: string) => Promise<T>,
  ) {}

  get state(): PlatformState { return this.getState(); }
  async start(): Promise<void> { await this.startFn(); }
  async stop(): Promise<void> { await this.stopFn(); }
  async restart(): Promise<void> { await this.restartFn(); }
  async getHealth(): Promise<PlatformHealthSnapshot> { return this.getHealthFn(); }
  getDiagnostics(): PlatformInfo { return this.getDiagnosticsFn(); }
  getConfiguration(): Readonly<Record<string, ConfigValue>> { return this.getConfigFn(); }
  async dispatchCommand<TP, TR>(type: string, payload: TP): Promise<CommandResult<TR>> { return this.dispatchCommandFn(type, payload); }
  async executeQuery<TP, TR>(type: string, payload: TP): Promise<QueryResult<TR>> { return this.executeQueryFn(type, payload); }
  async publishEvent<T>(type: string, payload: T): Promise<PlatformEvent<T>> { return this.publishEventFn(type, payload); }
  async resolve<T>(id: string): Promise<T> { return this.resolveFn(id); }
}

export function createPlatformAPI(deps: {
  getState: () => PlatformState;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  getHealth: () => Promise<PlatformHealthSnapshot>;
  getDiagnostics: () => PlatformInfo;
  getConfiguration: () => Readonly<Record<string, ConfigValue>>;
  dispatchCommand: <TP, TR>(type: string, payload: TP) => Promise<CommandResult<TR>>;
  executeQuery: <TP, TR>(type: string, payload: TP) => Promise<QueryResult<TR>>;
  publishEvent: <T>(type: string, payload: T) => Promise<PlatformEvent<T>>;
  resolve: <T>(id: string) => Promise<T>;
}): PlatformAPIInterface {
  return new DelegatingPlatformAPI(
    deps.getState,
    deps.start,
    deps.stop,
    deps.restart,
    deps.getHealth,
    deps.getDiagnostics,
    deps.getConfiguration,
    deps.dispatchCommand,
    deps.executeQuery,
    deps.publishEvent,
    deps.resolve,
  );
}
