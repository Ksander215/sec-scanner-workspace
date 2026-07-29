/**
 * Service lifecycle interface — all services implement this.
 * Conforms to: ARC-001.001 §5 (Module Architecture)
 */
export interface Service {
  readonly name: string;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  shutdown(): Promise<void>;
}
