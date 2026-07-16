import type { LogLevel, LogEntry } from './types.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5,
};

export class Logger {
  private minLevel: LogLevel;
  private format: 'json' | 'text';
  private output: 'stdout' | 'file';
  private filePath: string;

  constructor(config: { level: LogLevel; format: 'json' | 'text'; output: 'stdout' | 'file'; filePath: string }) {
    this.minLevel = config.level;
    this.format = config.format;
    this.output = config.output;
    this.filePath = config.filePath;
  }

  trace(message: string, context?: Record<string, unknown>): void { this.log('trace', message, context); }
  debug(message: string, context?: Record<string, unknown>): void { this.log('debug', message, context); }
  info(message: string, context?: Record<string, unknown>): void { this.log('info', message, context); }
  warn(message: string, context?: Record<string, unknown>): void { this.log('warn', message, context); }
  error(message: string, context?: Record<string, unknown>): void { this.log('error', message, context); }
  fatal(message: string, context?: Record<string, unknown>): void { this.log('fatal', message, context); }

  /** Create a child logger with extra context */
  child(extraContext: Record<string, unknown>): Logger {
    const child = new Logger({
      level: this.minLevel,
      format: this.format,
      output: this.output,
      filePath: this.filePath,
    });
    // Override log method to merge context
    const originalLog = child.log.bind(child);
    child.log = (level, message, context) => {
      originalLog(level, message, { ...extraContext, ...context });
    };
    return child;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    const formatted = this.format === 'json' ? this.formatJson(entry) : this.formatText(entry);

    if (this.output === 'file') {
      this.writeToFile(formatted);
    } else {
      const stream = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
      stream.write(formatted + '\n');
    }
  }

  private formatJson(entry: LogEntry): string {
    return JSON.stringify({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      ...entry.context,
    });
  }

  private formatText(entry: LogEntry): string {
    const ts = entry.timestamp.toISOString();
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `${ts} [${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
  }

  private writeToFile(line: string): void {
    const dir = join(this.filePath, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.filePath, line + '\n', { flag: 'a' });
  }
}
