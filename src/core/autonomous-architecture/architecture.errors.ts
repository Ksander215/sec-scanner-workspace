/**
 * Autonomous Architecture Runtime — Base Error
 * TASK-AIS-012A.001
 */

export class ArchitectureError extends Error {
  readonly code: string;
  readonly timestamp: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ArchitectureError';
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}
